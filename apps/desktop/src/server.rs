use crate::{db, economy};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use include_dir::{Dir, include_dir};
use rusqlite::{Connection, OptionalExtension, params};
use serde_json::{Value, json};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

static WEB: Dir = include_dir!("$CARGO_MANIFEST_DIR/../../web");
static GAMES: Dir = include_dir!("$CARGO_MANIFEST_DIR/../../games");
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub base: String,
    pub tailscale: bool,
    pub data: PathBuf,
}
type ApiResult = Result<Json<Value>, ApiError>;
pub struct ApiError(StatusCode, String);
impl From<String> for ApiError {
    fn from(s: String) -> Self {
        Self(StatusCode::BAD_REQUEST, s)
    }
}
impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        eprintln!("Database: {e}");
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Operazione non completata. Riprova.".into(),
        )
    }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"error":self.1}))).into_response()
    }
}
fn bad(s: &str) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, s.into())
}
fn text<'a>(v: &'a Value, k: &str) -> Result<&'a str, ApiError> {
    v[k].as_str()
        .filter(|s| !s.is_empty() && s.len() <= 512)
        .ok_or_else(|| bad("Campo mancante o non valido"))
}
fn amount(v: &Value, k: &str) -> Result<i64, ApiError> {
    v[k].as_i64()
        .filter(|n| (1..=1_000_000_000).contains(n))
        .ok_or_else(|| bad("Importo non valido"))
}
pub fn validate_base(base: &str) -> Result<(), String> {
    let uri: axum::http::Uri = base
        .parse()
        .map_err(|_| "Indirizzo della sala non valido")?;
    if !matches!(uri.scheme_str(), Some("http" | "https"))
        || uri.host().is_none()
        || uri.authority().unwrap().as_str().contains('@')
        || uri.path_and_query().is_some_and(|p| p.as_str() != "/")
    {
        return Err("Usa un indirizzo http(s) senza percorso".into());
    }
    Ok(())
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/pair", post(pair))
        .route("/api/state", get(snapshot))
        .route("/api/action", post(action))
        .route(
            "/api/save",
            post(save_game).layer(DefaultBodyLimit::max(768 * 1024)),
        )
        .route("/api/backup", post(backup))
        .route("/api/import", post(import_suite))
        .route("/api/archive", get(archive))
        .route("/", get(index))
        .route("/{*path}", get(asset))
        .layer(DefaultBodyLimit::max(16 * 1024))
        .with_state(state)
        .layer(axum::middleware::map_response(
            |mut r: Response| async move {
                let h = r.headers_mut();
                h.insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
                h.insert("x-content-type-options", "nosniff".parse().unwrap());
                h.insert("referrer-policy", "no-referrer".parse().unwrap());
                h.insert("x-frame-options", "SAMEORIGIN".parse().unwrap());
                r
            },
        ))
}
async fn health() -> Json<Value> {
    Json(json!({"app":"DaProdGiochi","version":env!("CARGO_PKG_VERSION"),"protocol":2}))
}
fn identity(c: &Connection, h: &HeaderMap) -> Result<(String, bool), ApiError> {
    let token = h
        .get(header::AUTHORIZATION)
        .and_then(|s| s.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| {
            ApiError(
                StatusCode::UNAUTHORIZED,
                "Collegati alla sala con il QR.".into(),
            )
        })?;
    let found=c.query_row("SELECT p.id,p.admin FROM devices d JOIN players p ON p.id=d.player WHERE d.token=?1 AND d.revoked=0",[db::hash(token)],|r|Ok((r.get::<_,String>(0)?,r.get::<_,bool>(1)?))).optional()?;
    let who = found.ok_or_else(|| {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "Accesso non valido o revocato. I dati del conto restano sul PC.".into(),
        )
    })?;
    c.execute(
        "UPDATE devices SET seen=?2 WHERE token=?1",
        params![db::hash(token), db::now()],
    )?;
    Ok(who)
}

async fn pair(State(s): State<AppState>, Json(v): Json<Value>) -> ApiResult {
    // Limite globale anche per inviti casuali: non dipende da header IP controllabili dal client.
    static ATTEMPTS: Mutex<Vec<i64>> = Mutex::new(Vec::new());
    {
        let mut a = ATTEMPTS.lock().unwrap();
        a.retain(|t| *t > db::now() - 60);
        if a.len() >= 30 {
            return Err(ApiError(
                StatusCode::TOO_MANY_REQUESTS,
                "Troppi tentativi: riprova fra un minuto".into(),
            ));
        }
        a.push(db::now());
    }
    let code = text(&v, "code")?;
    let name = text(&v, "name")?.trim();
    if name.is_empty() || name.chars().count() > 40 {
        return Err(bad("Scegli un nome da 1 a 40 caratteri"));
    }
    let mut c = s.db.lock().unwrap();
    let tx = c.transaction()?;
    let invitation = tx
        .query_row(
            "SELECT player FROM invites WHERE code=?1 AND used=0 AND expires>?2",
            params![db::hash(code), db::now()],
            |r| r.get::<_, Option<String>>(0),
        )
        .optional()?;
    let target = invitation.ok_or_else(|| bad("Invito scaduto o già utilizzato"))?;
    let id = target.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let exists = tx.query_row("SELECT COUNT(*) FROM players WHERE id=?1", [&id], |r| {
        r.get::<_, i64>(0)
    })? != 0;
    if !exists {
        tx.execute(
            "INSERT INTO players(id,name,balance) VALUES(?1,?2,0)",
            params![id, name],
        )?;
        db::move_money(&tx, &id, db::WELCOME, 0, "Benvenuto nella sala")?;
    }
    let token = db::secret();
    let device = uuid::Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO devices(id,player,token) VALUES(?1,?2,?3)",
        params![device, id, db::hash(&token)],
    )?;
    tx.execute("UPDATE invites SET used=1 WHERE code=?1", [db::hash(code)])?;
    tx.commit()?;
    Ok(Json(
        json!({"token":token,"player":db::player(&c,&id)?,"base":s.base}),
    ))
}

fn list(c: &Connection, sql: &str, id: &str) -> Result<Vec<Value>, ApiError> {
    let mut q = c.prepare(sql)?;
    let values = q
        .query_map([id], |r| r.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    values
        .into_iter()
        .map(|v| serde_json::from_str(&v).map_err(|_| bad("Dati non leggibili")))
        .collect()
}
async fn snapshot(State(s): State<AppState>, h: HeaderMap) -> ApiResult {
    let c = s.db.lock().unwrap();
    let (id, admin) = identity(&c, &h)?;
    let moves = list(
        &c,
        "SELECT json_object('id',id,'delta',delta,'coins',coins,'reason',reason,'time',time) FROM ledger WHERE player=?1 ORDER BY id DESC LIMIT 60",
        &id,
    )?;
    let holdings = list(
        &c,
        "SELECT json_object('asset',asset,'units',units) FROM holdings WHERE player=?1",
        &id,
    )?;
    let claims = list(
        &c,
        "SELECT json_object('id',id,'amount',amount,'status',status,'time',time) FROM claims WHERE player=?1 ORDER BY time DESC LIMIT 30",
        &id,
    )?;
    let ranking = list(
        &c,
        "SELECT json_object('id',id,'name',name,'balance',balance,'coins',coins) FROM players WHERE id<>?1 ORDER BY balance DESC LIMIT 100",
        "",
    )?;
    let devices = if admin {
        list(
            &c,
            "SELECT json_object('id',d.id,'player',d.player,'name',p.name,'revoked',d.revoked,'seen',d.seen) FROM devices d JOIN players p ON p.id=d.player WHERE d.id<>?1 ORDER BY seen DESC",
            "owner",
        )?
    } else {
        vec![]
    };
    let pending = if admin {
        list(
            &c,
            "SELECT json_object('id',c.id,'player',c.player,'name',p.name,'game',s.game,'amount',c.amount,'time',c.time) FROM claims c JOIN players p ON p.id=c.player JOIN sessions s ON s.id=c.session WHERE c.status='pending' AND c.id<>?1 ORDER BY c.time",
            "",
        )?
    } else {
        vec![]
    };
    let saved: i64 = c
        .query_row(
            "SELECT COALESCE((SELECT value FROM meta WHERE key=?1),'0')",
            [format!("bank:{id}")],
            |r| r.get::<_, String>(0),
        )?
        .parse()
        .unwrap_or(0);
    Ok(Json(
        json!({"me":db::player(&c,&id)?,"moves":moves,"holdings":holdings,"claims":claims,"ranking":ranking,"devices":devices,"pending":pending,"market":economy::market(),"bank":saved,"base":s.base,"tailscale":s.tailscale,"version":env!("CARGO_PKG_VERSION")}),
    ))
}

async fn action(State(s): State<AppState>, h: HeaderMap, Json(v): Json<Value>) -> ApiResult {
    let mut c = s.db.lock().unwrap();
    let (id, admin) = identity(&c, &h)?;
    let key = text(&v, "request")?;
    if uuid::Uuid::parse_str(key).is_err() {
        return Err(bad("Richiesta senza identificativo valido"));
    }
    let body = db::hash(&v.to_string());
    let tx = c.transaction()?;
    if let Some((old, result)) = tx
        .query_row(
            "SELECT body,response FROM requests WHERE player=?1 AND key=?2",
            params![id, key],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )
        .optional()?
    {
        if old != body {
            return Err(bad("Identificativo già usato per un'altra operazione"));
        }
        return Ok(Json(
            serde_json::from_str(&result).map_err(|_| bad("Risposta non leggibile"))?,
        ));
    }
    let operation = text(&v, "action")?;
    if operation.starts_with("admin:") && !admin {
        return Err(ApiError(
            StatusCode::FORBIDDEN,
            "Solo il proprietario può farlo".into(),
        ));
    }
    let result = match operation {
        "admin:invite" => {
            if !s.base.starts_with("https://") {
                return Err(bad(
                    "Configura prima Tailscale Serve in HTTPS: tailscale serve --bg --https=443 http://127.0.0.1:8790. Poi riavvia l'hub.",
                ));
            }
            let target = v["player"].as_str().filter(|s| !s.is_empty());
            if let Some(p) = target {
                if p == "owner" {
                    return Err(bad("Il proprietario accede dal PC"));
                }
                db::player(&tx, p)?;
            }
            let code = db::secret();
            let expires = db::now() + 300;
            tx.execute(
                "INSERT INTO invites(code,player,expires) VALUES(?1,?2,?3)",
                params![db::hash(&code), target, expires],
            )?;
            let url = format!("{}/#invite={code}", s.base.trim_end_matches('/'));
            let qr = qrcode::QrCode::new(url.as_bytes())
                .map_err(|_| bad("QR non generato"))?
                .render::<qrcode::render::svg::Color>()
                .min_dimensions(256, 256)
                .build();
            json!({"url":url,"qr":qr,"expires":expires})
        }
        "admin:revoke" => {
            let device = text(&v, "device")?;
            if device == "owner" {
                return Err(bad("Non puoi revocare il PC proprietario"));
            }
            tx.execute("UPDATE devices SET revoked=1 WHERE id=?1", [device])?;
            json!({"ok":true})
        }
        "admin:adjust" => {
            let target = text(&v, "player")?;
            let delta = v["delta"]
                .as_i64()
                .filter(|x| (-1_000_000_000..=1_000_000_000).contains(x))
                .ok_or_else(|| bad("Importo non valido"))?;
            let reason = text(&v, "reason")?;
            db::move_money(
                &tx,
                target,
                delta,
                0,
                &format!("Correzione del proprietario: {reason}"),
            )?;
            json!({"ok":true})
        }
        "admin:claim" => {
            let claim = text(&v, "claim")?;
            let approve = v["approve"]
                .as_bool()
                .ok_or_else(|| bad("Decisione mancante"))?;
            let (p, n, coins): (String, i64, i64) = tx
                .query_row(
                    "SELECT player,amount,coins FROM claims WHERE id=?1 AND status='pending'",
                    [claim],
                    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                )
                .optional()?
                .ok_or_else(|| bad("Incasso già deciso"))?;
            if approve {
                db::move_money(&tx, &p, n, coins, "Incasso approvato dal proprietario")?;
            }
            tx.execute(
                "UPDATE claims SET status=?2 WHERE id=?1",
                params![claim, if approve { "approved" } else { "rejected" }],
            )?;
            json!({"ok":true})
        }
        "daily" => {
            let day = db::now() / 86400;
            if tx.execute(
                "UPDATE players SET daily=?2 WHERE id=?1 AND daily<?2",
                params![id, day],
            )? != 1
            {
                return Err(bad("Bonus già ritirato oggi. Torna domani!"));
            }
            db::move_money(&tx, &id, 9681, 0, "Bonus giornaliero")?;
            json!({"ok":true})
        }
        "bank" => {
            let n = amount(&v, "amount")?;
            let key = format!("bank:{id}");
            let saved = tx
                .query_row("SELECT value FROM meta WHERE key=?1", [&key], |r| {
                    r.get::<_, String>(0)
                })
                .optional()?
                .unwrap_or_else(|| "0".into())
                .parse::<i64>()
                .map_err(|_| bad("Deposito non valido"))?;
            let deposit = v["deposit"]
                .as_bool()
                .ok_or_else(|| bad("Operazione mancante"))?;
            let next = if deposit {
                saved
                    .checked_add(n)
                    .filter(|x| *x <= db::MAX)
                    .ok_or_else(|| bad("Deposito al limite"))?
            } else {
                saved
                    .checked_sub(n)
                    .filter(|x| *x >= 0)
                    .ok_or_else(|| bad("Deposito insufficiente"))?
            };
            db::move_money(
                &tx,
                &id,
                if deposit { -n } else { n },
                0,
                if deposit {
                    "Versamento in banca"
                } else {
                    "Prelievo dalla banca"
                },
            )?;
            tx.execute("INSERT INTO meta(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![key,next.to_string()])?;
            json!({"ok":true})
        }
        "trade" => {
            let asset = text(&v, "asset")?;
            let side = text(&v, "side")?;
            let units = amount(&v, "units")?;
            let (total, fee) = economy::trade_value(asset, units, side)?;
            // La quotazione mostrata deve essere ancora valida quando si conferma.
            if v["price"].as_i64() != economy::price(asset, db::now() / 3600) {
                return Err(bad("Quotazione cambiata: aggiorna il mercato"));
            }
            tx.execute(
                "INSERT OR IGNORE INTO holdings(player,asset,units) VALUES(?1,?2,0)",
                params![id, asset],
            )?;
            if side == "buy" {
                db::move_money(
                    &tx,
                    &id,
                    -total - fee,
                    0,
                    &format!("Acquisto {asset} · commissione {fee} L."),
                )?;
                let held: i64 = tx.query_row(
                    "SELECT units FROM holdings WHERE player=?1 AND asset=?2",
                    params![id, asset],
                    |r| r.get(0),
                )?;
                if held + units > 1_000_000_000 {
                    return Err(bad("Limite di token raggiunto"));
                }
                tx.execute(
                    "UPDATE holdings SET units=units+?3 WHERE player=?1 AND asset=?2",
                    params![id, asset, units],
                )?;
            } else {
                if tx.execute(
                    "UPDATE holdings SET units=units-?3 WHERE player=?1 AND asset=?2 AND units>=?3",
                    params![id, asset, units],
                )? != 1
                {
                    return Err(bad("Non hai abbastanza token"));
                }
                db::move_money(
                    &tx,
                    &id,
                    total - fee,
                    0,
                    &format!("Vendita {asset} · commissione {fee} L."),
                )?;
            }
            json!({"total":total,"fee":fee})
        }
        "transfer" => {
            let to = text(&v, "player")?;
            if to == id {
                return Err(bad("Scegli un'altra persona"));
            }
            let n = amount(&v, "amount")?;
            db::move_money(&tx, &id, -n, 0, "Lire inviate a un giocatore")?;
            db::move_money(&tx, to, n, 0, "Lire ricevute da un giocatore")?;
            json!({"ok":true})
        }
        "slot" => {
            let bet = amount(&v, "amount")?;
            if ![387, 1936, 9681].contains(&bet) {
                return Err(bad("Puntata non ammessa"));
            }
            db::move_money(&tx, &id, -bet, 0, "Puntata alla macchinetta")?;
            let bytes = *uuid::Uuid::new_v4().as_bytes();
            let roll = u16::from_le_bytes([bytes[0], bytes[1]]) as i64;
            // Campionamento senza modulo: intervalli su tutti i 65536 valori.
            let multiplier = if roll < 655 {
                20
            } else if roll < 3932 {
                5
            } else if roll < 10485 {
                2
            } else if roll < 20316 {
                1
            } else {
                0
            };
            if multiplier > 0 {
                db::move_money(&tx, &id, bet * multiplier, 0, "Vincita alla macchinetta")?;
            }
            json!({"multiplier":multiplier,"netto":bet*multiplier,"symbols":if multiplier>0{vec![multiplier;3]}else{vec![0,1,2]}})
        }
        "open" => {
            let game = text(&v, "game")?;
            economy::estimate(game, 0.0, 0, false)?;
            let existing = tx
                .query_row(
                    "SELECT id FROM sessions WHERE player=?1 AND game=?2 AND closed=0",
                    params![id, game],
                    |r| r.get::<_, String>(0),
                )
                .optional()?;
            let session = existing.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            tx.execute(
                "INSERT OR IGNORE INTO sessions(id,player,game,opened) VALUES(?1,?2,?3,?4)",
                params![session, id, game, db::now()],
            )?;
            let saved = tx
                .query_row(
                    "SELECT revision,payload FROM game_saves WHERE player=?1 AND game=?2",
                    params![id, game],
                    |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?)),
                )
                .optional()?;
            let (revision, payload) = saved.unwrap_or((0, "{}".into()));
            let payload: Value = serde_json::from_str(&payload)
                .map_err(|_| bad("Salvataggio non leggibile: non viene sostituito"))?;
            json!({"session":session,"revision":revision,"saved":payload})
        }
        "estimate" | "topup" | "pay" | "cashout" => {
            let session = text(&v, "session")?;
            let game = text(&v, "game")?;
            let(invested,opened):(i64,i64)=tx.query_row("SELECT invested,opened FROM sessions WHERE id=?1 AND player=?2 AND game=?3 AND closed=0",params![session,id,game],|r|Ok((r.get(0)?,r.get(1)?))).optional()?.ok_or_else(||bad("Partita conclusa: riapri il gioco"))?;
            if operation == "topup" || operation == "pay" {
                let n = amount(&v, "amount")?;
                if invested + n > db::MAX {
                    return Err(bad("Limite della partita raggiunto"));
                }
                db::move_money(
                    &tx,
                    &id,
                    -n,
                    0,
                    if operation == "topup" {
                        "Ricarica del gioco"
                    } else {
                        "Potenziamento del gioco"
                    },
                )?;
                if operation == "topup" {
                    tx.execute(
                        "UPDATE sessions SET invested=invested+?2 WHERE id=?1",
                        params![session, n],
                    )?;
                }
                json!({"ok":true,"lire":n})
            } else {
                let raw = v["raw"].as_f64().ok_or_else(|| bad("Punteggio mancante"))?;
                let finished = v["finished"].as_bool().unwrap_or(false);
                let mut estimate = economy::estimate(game, raw, invested, finished)?;
                if operation == "cashout" {
                    if db::now() - opened < 15 {
                        return Err(bad(
                            "La partita è appena iniziata: gioca prima di incassare",
                        ));
                    }
                    let amount = estimate["netto"].as_i64().unwrap();
                    let claim = uuid::Uuid::new_v4().to_string();
                    tx.execute("UPDATE sessions SET closed=1 WHERE id=?1", [session])?;
                    // I giochi esistenti simulano sul telefono. Ogni risultato passa dal
                    // proprietario, finché la simulazione non sarà verificabile sul server.
                    tx.execute("INSERT INTO claims(id,session,player,amount,coins,time) VALUES(?1,?2,?3,?4,?5,?6)",params![claim,session,id,amount,if finished{1}else{0},db::now()])?;
                    estimate["inControllo"] = json!(true);
                    estimate["claim"] = json!(claim);
                    estimate["minuti"] = json!((db::now() - opened) / 60);
                }
                estimate
            }
        }
        _ => return Err(bad("Operazione sconosciuta")),
    };
    // Una stima frequente non è un movimento economico da conservare per sempre.
    if operation != "estimate" {
        tx.execute(
            "INSERT INTO requests(player,key,body,response) VALUES(?1,?2,?3,?4)",
            params![id, key, body, result.to_string()],
        )?;
    }
    tx.commit()?;
    Ok(Json(result))
}

async fn save_game(State(s): State<AppState>, h: HeaderMap, Json(v): Json<Value>) -> ApiResult {
    let mut c = s.db.lock().unwrap();
    let (id, _) = identity(&c, &h)?;
    let game = text(&v, "game")?;
    let session = text(&v, "session")?;
    let revision = v["revision"]
        .as_i64()
        .filter(|v| *v >= 0)
        .ok_or_else(|| bad("Versione del salvataggio non valida"))?;
    let saved = v["saved"]
        .as_object()
        .filter(|o| o.len() <= 32)
        .ok_or_else(|| bad("Salvataggio non valido"))?;
    for (key, value) in saved {
        let valid = match game {
            "dozer" => key.starts_with("daprod_dozer_"),
            "claw" => key.starts_with("daprod_claw_"),
            "neon" => {
                key.starts_with("neonPartenope_")
                    || key.starts_with("vesuvioEXE_")
                    || key.starts_with("np.")
            }
            _ => false,
        };
        if !valid || key.len() > 100 || value.as_str().is_none() {
            return Err(bad("Chiave del salvataggio non valida"));
        }
    }
    let payload = v["saved"].to_string();
    if payload.len() > 512 * 1024 {
        return Err(bad("Salvataggio troppo grande"));
    }
    let tx = c.transaction()?;
    if tx.query_row(
        "SELECT COUNT(*) FROM sessions WHERE id=?1 AND player=?2 AND game=?3 AND closed=0",
        params![session, id, game],
        |r| r.get::<_, i64>(0),
    )? != 1
    {
        return Err(bad("Partita chiusa: salvataggio non sostituito"));
    }
    tx.execute(
        "INSERT OR IGNORE INTO game_saves(player,game,revision,payload) VALUES(?1,?2,0,'{}')",
        params![id, game],
    )?;
    let (current_revision, current_payload): (i64, String) = tx.query_row(
        "SELECT revision,payload FROM game_saves WHERE player=?1 AND game=?2",
        params![id, game],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    // Una risposta persa può essere ritentata senza inventare un conflitto.
    if current_revision == revision + 1 && current_payload == payload {
        return Ok(Json(json!({"revision":current_revision})));
    }
    if tx.execute("UPDATE game_saves SET revision=revision+1,payload=?4 WHERE player=?1 AND game=?2 AND revision=?3",params![id,game,revision,payload])?!=1{return Err(ApiError(StatusCode::CONFLICT,"Il gioco è stato salvato su un altro dispositivo. Torna in sala e riaprilo per caricare la copia del PC.".into()))}
    tx.commit()?;
    Ok(Json(json!({"revision":revision+1})))
}

async fn backup(State(s): State<AppState>, h: HeaderMap) -> ApiResult {
    let c = s.db.lock().unwrap();
    if !identity(&c, &h)?.1 {
        return Err(ApiError(
            StatusCode::FORBIDDEN,
            "Solo il proprietario".into(),
        ));
    }
    let folder = s.data.join("backup");
    std::fs::create_dir_all(&folder).map_err(|_| bad("Cartella backup non creata"))?;
    let dest = folder.join(format!(
        "sala-{}-{}.sqlite3",
        db::now(),
        &uuid::Uuid::new_v4().to_string()[..8]
    ));
    c.backup("main", &dest, None)?;
    Ok(Json(json!({"saved":dest.display().to_string()})))
}
async fn import_suite(State(s): State<AppState>, h: HeaderMap, Json(v): Json<Value>) -> ApiResult {
    let mut c = s.db.lock().unwrap();
    if !identity(&c, &h)?.1 {
        return Err(ApiError(
            StatusCode::FORBIDDEN,
            "Solo il proprietario".into(),
        ));
    }
    let folder = std::path::PathBuf::from(text(&v, "folder")?);
    let count = crate::migration::import(&mut c, &folder).map_err(|e| bad(&e.to_string()))?;
    Ok(Json(json!({"imported":count})))
}
async fn archive(State(s): State<AppState>, h: HeaderMap) -> ApiResult {
    let c = s.db.lock().unwrap();
    if !identity(&c, &h)?.1 {
        return Err(ApiError(
            StatusCode::FORBIDDEN,
            "Solo il proprietario".into(),
        ));
    }
    let value = c
        .query_row(
            "SELECT value FROM meta WHERE key='suite-archive'",
            [],
            |r| r.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| bad("Nessun archivio Suite importato"))?;
    Ok(Json(
        serde_json::from_str(&value).map_err(|_| bad("Archivio non leggibile"))?,
    ))
}
async fn index() -> Response {
    file(&WEB, "index.html")
}
async fn asset(Path(path): Path<String>) -> Response {
    if let Some(p) = path.strip_prefix("games/") {
        file(&GAMES, p)
    } else {
        file(&WEB, &path)
    }
}
fn file(dir: &Dir, path: &str) -> Response {
    if path.split('/').any(|s| s == "..") {
        return StatusCode::NOT_FOUND.into_response();
    }
    let path = if path.ends_with('/') {
        format!("{path}index.html")
    } else {
        path.into()
    };
    match dir.get_file(&path) {
        Some(f) => (
            [(
                header::CONTENT_TYPE,
                mime_guess::from_path(&path)
                    .first_or_octet_stream()
                    .as_ref()
                    .to_string(),
            )],
            f.contents().to_vec(),
        )
            .into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http_body_util::BodyExt;
    use tower::ServiceExt;
    struct Room {
        app: Router,
        db: Arc<Mutex<Connection>>,
        _dir: tempfile::TempDir,
    }
    fn room() -> Room {
        let dir = tempfile::tempdir().unwrap();
        let mut c = db::open(&dir.path().join("test.sqlite3")).unwrap();
        db::owner(&mut c, "owner-secret").unwrap();
        let db = Arc::new(Mutex::new(c));
        let app = router(AppState {
            db: db.clone(),
            base: "https://test.example.ts.net".into(),
            tailscale: true,
            data: dir.path().into(),
        });
        Room { app, db, _dir: dir }
    }
    async fn call(
        app: &Router,
        path: &str,
        token: &str,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut b = axum::http::Request::builder()
            .uri(path)
            .header("Authorization", format!("Bearer {token}"));
        if body.is_some() {
            b = b.method("POST").header("Content-Type", "application/json")
        }
        let r = app
            .clone()
            .oneshot(
                b.body(
                    body.map(|v| Body::from(v.to_string()))
                        .unwrap_or_else(Body::empty),
                )
                .unwrap(),
            )
            .await
            .unwrap();
        let status = r.status();
        let bytes = r.into_body().collect().await.unwrap().to_bytes();
        (
            status,
            serde_json::from_slice(&bytes).unwrap_or(Value::Null),
        )
    }
    fn op(action: &str) -> Value {
        json!({"action":action,"request":uuid::Uuid::new_v4().to_string()})
    }
    async fn guest(r: &Room) -> (String, String) {
        let (status, v) = call(
            &r.app,
            "/api/action",
            "owner-secret",
            Some(op("admin:invite")),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{v}");
        let code = v["url"].as_str().unwrap().split("#invite=").nth(1).unwrap();
        let (status, v) = call(
            &r.app,
            "/api/pair",
            "",
            Some(json!({"code":code,"name":"Anna"})),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{v}");
        (
            v["token"].as_str().unwrap().into(),
            v["player"]["id"].as_str().unwrap().into(),
        )
    }
    #[tokio::test]
    async fn auth_invites_and_revocation() {
        let r = room();
        assert_eq!(
            call(&r.app, "/api/state", "", None).await.0,
            StatusCode::UNAUTHORIZED
        );
        let (token, id) = guest(&r).await;
        let (status, state) = call(&r.app, "/api/state", &token, None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(state["me"]["balance"], db::WELCOME);
        assert_eq!(state["me"]["admin"], false);
        assert_eq!(
            call(&r.app, "/api/action", &token, Some(op("admin:invite")))
                .await
                .0,
            StatusCode::FORBIDDEN
        );
        let device: String =
            r.db.lock()
                .unwrap()
                .query_row("SELECT id FROM devices WHERE player=?1", [id], |row| {
                    row.get(0)
                })
                .unwrap();
        let mut v = op("admin:revoke");
        v["device"] = json!(device);
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(v)).await.0,
            StatusCode::OK
        );
        assert_eq!(
            call(&r.app, "/api/state", &token, None).await.0,
            StatusCode::UNAUTHORIZED
        );
    }
    #[tokio::test]
    async fn single_use_and_expired_invites() {
        let r = room();
        let (_, v) = call(
            &r.app,
            "/api/action",
            "owner-secret",
            Some(op("admin:invite")),
        )
        .await;
        let code = v["url"].as_str().unwrap().split("#invite=").nth(1).unwrap();
        let body = json!({"code":code,"name":"Anna"});
        assert_eq!(
            call(&r.app, "/api/pair", "", Some(body.clone())).await.0,
            StatusCode::OK
        );
        assert_eq!(
            call(&r.app, "/api/pair", "", Some(body)).await.0,
            StatusCode::BAD_REQUEST
        );
        r.db.lock()
            .unwrap()
            .execute(
                "INSERT INTO invites(code,expires) VALUES(?1,0)",
                [db::hash("expired")],
            )
            .unwrap();
        assert_eq!(
            call(
                &r.app,
                "/api/pair",
                "",
                Some(json!({"code":"expired","name":"Anna"}))
            )
            .await
            .0,
            StatusCode::BAD_REQUEST
        );
    }
    #[tokio::test]
    async fn money_retry_and_atomic_rollback() {
        let r = room();
        let (token, id) = guest(&r).await;
        let mut v = op("transfer");
        v["player"] = json!(id);
        v["amount"] = json!(100);
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(v.clone()))
                .await
                .0,
            StatusCode::OK
        );
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(v.clone()))
                .await
                .0,
            StatusCode::OK
        );
        assert_eq!(
            db::player(&r.db.lock().unwrap(), &id).unwrap()["balance"],
            db::WELCOME + 100
        );
        v["amount"] = json!(200);
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(v)).await.0,
            StatusCode::BAD_REQUEST
        );
        let mut bad = op("transfer");
        bad["player"] = json!("missing");
        bad["amount"] = json!(50);
        assert_ne!(
            call(&r.app, "/api/action", &token, Some(bad)).await.0,
            StatusCode::OK
        );
        assert_eq!(
            db::player(&r.db.lock().unwrap(), &id).unwrap()["balance"],
            db::WELCOME + 100
        );
    }
    #[tokio::test]
    async fn trades_are_integer_and_cannot_overspend() {
        let r = room();
        let (token, id) = guest(&r).await;
        let mut buy = op("trade");
        buy["asset"] = json!("DPC");
        buy["side"] = json!("buy");
        buy["units"] = json!(1000);
        buy["price"] = json!(economy::price("DPC", db::now() / 3600));
        let (status, receipt) = call(&r.app, "/api/action", &token, Some(buy.clone())).await;
        assert_eq!(status, StatusCode::OK, "{receipt}");
        let balance = db::player(&r.db.lock().unwrap(), &id).unwrap()["balance"]
            .as_i64()
            .unwrap();
        assert_eq!(
            balance,
            db::WELCOME - receipt["total"].as_i64().unwrap() - receipt["fee"].as_i64().unwrap()
        );
        buy["request"] = json!(uuid::Uuid::new_v4().to_string());
        buy["units"] = json!(1_000_000_000);
        assert_eq!(
            call(&r.app, "/api/action", &token, Some(buy)).await.0,
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            db::player(&r.db.lock().unwrap(), &id).unwrap()["balance"],
            balance
        );
    }
    #[tokio::test]
    async fn session_ownership_claim_approval_and_replay() {
        let r = room();
        let (token, id) = guest(&r).await;
        let mut open = op("open");
        open["game"] = json!("dozer");
        let (_, v) = call(&r.app, "/api/action", &token, Some(open)).await;
        let sid = v["session"].as_str().unwrap();
        r.db.lock()
            .unwrap()
            .execute("UPDATE sessions SET opened=opened-60 WHERE id=?1", [sid])
            .unwrap();
        let mut cash = op("cashout");
        cash["session"] = json!(sid);
        cash["game"] = json!("dozer");
        cash["raw"] = json!(1000);
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(cash.clone()))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
        let (status, result) = call(&r.app, "/api/action", &token, Some(cash.clone())).await;
        assert_eq!(status, StatusCode::OK, "{result}");
        assert_eq!(result["inControllo"], true);
        assert_eq!(
            db::player(&r.db.lock().unwrap(), &id).unwrap()["balance"],
            db::WELCOME
        );
        assert_eq!(
            call(&r.app, "/api/action", &token, Some(cash.clone()))
                .await
                .0,
            StatusCode::OK
        );
        cash["request"] = json!(uuid::Uuid::new_v4().to_string());
        assert_eq!(
            call(&r.app, "/api/action", &token, Some(cash)).await.0,
            StatusCode::BAD_REQUEST
        );
        let mut approve = op("admin:claim");
        approve["claim"] = result["claim"].clone();
        approve["approve"] = json!(true);
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(approve.clone()))
                .await
                .0,
            StatusCode::OK
        );
        approve["request"] = json!(uuid::Uuid::new_v4().to_string());
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(approve))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            db::player(&r.db.lock().unwrap(), &id).unwrap()["balance"],
            db::WELCOME + 900
        );
    }
    #[tokio::test]
    async fn bank_and_daily_cannot_duplicate_money() {
        let r = room();
        let mut bank = op("bank");
        bank["deposit"] = json!(true);
        bank["amount"] = json!(1000);
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(bank.clone()))
                .await
                .0,
            StatusCode::OK
        );
        bank["deposit"] = json!(false);
        bank["request"] = json!(uuid::Uuid::new_v4().to_string());
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(bank.clone()))
                .await
                .0,
            StatusCode::OK
        );
        bank["request"] = json!(uuid::Uuid::new_v4().to_string());
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(bank))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(op("daily")))
                .await
                .0,
            StatusCode::OK
        );
        assert_eq!(
            call(&r.app, "/api/action", "owner-secret", Some(op("daily")))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
    }
    #[tokio::test]
    async fn games_and_assets_are_embedded() {
        let r = room();
        for path in [
            "/",
            "/app.js",
            "/style.css",
            "/games/dozer/index.html",
            "/games/claw/index.html",
            "/games/neon/index.html",
            "/games/three/build/three.module.js",
        ] {
            assert_eq!(
                call(&r.app, path, "", None).await.0,
                StatusCode::OK,
                "{path}"
            );
        }
    }
    #[tokio::test]
    async fn saves_are_private_versioned_and_can_exceed_small_api_bodies() {
        let r = room();
        let (token, id) = guest(&r).await;
        let mut start = op("open");
        start["game"] = json!("dozer");
        let (_, opened) = call(&r.app, "/api/action", &token, Some(start)).await;
        let body = json!({"game":"dozer","session":opened["session"],"revision":0,"saved":{"daprod_dozer_v4":"x".repeat(30000)}});
        assert_eq!(
            call(&r.app, "/api/save", "owner-secret", Some(body.clone()))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
        let (status, saved) = call(&r.app, "/api/save", &token, Some(body.clone())).await;
        assert_eq!(status, StatusCode::OK, "{saved}");
        assert_eq!(saved["revision"], 1);
        assert_eq!(
            call(&r.app, "/api/save", &token, Some(body.clone()))
                .await
                .0,
            StatusCode::OK
        );
        let mut stale = body;
        stale["saved"]["daprod_dozer_v4"] = json!("different");
        assert_eq!(
            call(&r.app, "/api/save", &token, Some(stale)).await.0,
            StatusCode::CONFLICT
        );
        let payload: String =
            r.db.lock()
                .unwrap()
                .query_row(
                    "SELECT payload FROM game_saves WHERE player=?1",
                    [id],
                    |r| r.get(0),
                )
                .unwrap();
        assert!(payload.len() > 30000);
    }
}
