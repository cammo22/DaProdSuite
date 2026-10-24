use crate::db;
use rusqlite::{Connection, OptionalExtension, params};
use serde_json::Value;
use std::path::Path;

pub fn import(c: &mut Connection, folder: &Path) -> Result<usize, Box<dyn std::error::Error>> {
    let game_file = if folder.join("giochi.json").exists() {
        folder.join("giochi.json")
    } else {
        folder.join("giochi/giochi.json")
    };
    let remote_file = if folder.join("remoto.json").exists() {
        folder.join("remoto.json")
    } else {
        folder.join("remoto/remoto.json")
    };
    let games = std::fs::read_to_string(game_file)?;
    let remote = std::fs::read_to_string(remote_file)?;
    let g: Value = serde_json::from_str(&games)?;
    let r: Value = serde_json::from_str(&remote)?;
    let accounts = g["conti"].as_array().ok_or("giochi.json: conti mancanti")?;
    let devices = r["dispositivi"]
        .as_array()
        .ok_or("remoto.json: dispositivi mancanti")?;
    if g["versione"].as_i64() != Some(4) {
        return Err(
            "Importazione supportata per il formato 4 della suite 1.7.10. Nessun dato modificato."
                .into(),
        );
    }
    let tx = c.transaction()?;
    if tx
        .query_row("SELECT value FROM meta WHERE key='suite-import'", [], |r| {
            r.get::<_, String>(0)
        })
        .optional()?
        .is_some()
    {
        return Err("Archivio già importato: i conti non vengono sovrascritti".into());
    }
    let mut count = 0;
    for d in devices {
        let id = d["id"]
            .as_str()
            .filter(|s| !s.is_empty() && *s != "owner")
            .ok_or("Identità non valida")?;
        let token = d["token"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Token mancante")?;
        let account = accounts.iter().find(|a| a["chi"].as_str() == Some(id));
        let balance = match account {
            Some(a) => integer(&a["saldo"])?,
            None => 0,
        };
        let coins = match account {
            Some(a) if !a["monete"].is_null() => integer(&a["monete"])?,
            _ => 0,
        };
        let name = d["nome"].as_str().unwrap_or("Giocatore");
        tx.execute(
            "INSERT INTO players(id,name,balance,coins) VALUES(?1,?2,?3,?4)",
            params![id, name, balance, coins],
        )?;
        tx.execute(
            "INSERT INTO devices(id,player,token) VALUES(?1,?1,?2)",
            params![id, db::hash(token)],
        )?;
        tx.execute("INSERT INTO ledger(player,delta,coins,reason,time) VALUES(?1,?2,?3,'Importazione DaProdSuite',?4)",params![id,balance,coins,db::now()])?;
        count += 1;
    }
    // Non saltare silenziosamente i conti senza un dispositivo corrispondente.
    for a in accounts {
        let id = a["chi"].as_str().ok_or("Conto senza identità")?;
        if !devices.iter().any(|d| d["id"].as_str() == Some(id)) {
            if id == "owner" {
                return Err("Conto riservato: importazione fermata".into());
            }
            let coins = if a["monete"].is_null() {
                0
            } else {
                integer(&a["monete"])?
            };
            tx.execute(
                "INSERT INTO players(id,name,balance,coins) VALUES(?1,?1,?2,?3)",
                params![id, integer(&a["saldo"])?, coins],
            )?;
            count += 1;
        }
    }
    // Conserva l'intero archivio giochi: collezioni, statistiche, casse aperte e
    // incassi sospesi non vengono convertiti arbitrariamente in nuovo denaro.
    tx.execute(
        "INSERT INTO meta(key,value) VALUES('suite-archive',?1)",
        [&games],
    )?;
    tx.execute(
        "INSERT INTO meta(key,value) VALUES('suite-import',?1)",
        [db::now().to_string()],
    )?;
    tx.commit()?;
    Ok(count)
}
fn integer(v: &Value) -> Result<i64, Box<dyn std::error::Error>> {
    let n = v
        .as_f64()
        .filter(|x| x.is_finite() && *x >= 0.0 && *x <= db::MAX as f64 && x.fract() == 0.0)
        .ok_or("Saldo non valido o troppo grande: importazione fermata senza modifiche")?;
    Ok(n as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn import_is_atomic_and_never_overwrites() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("giochi.json"),
            r#"{"versione":4,"conti":[{"chi":"p","saldo":123,"monete":4}]}"#,
        )
        .unwrap();
        std::fs::write(
            dir.path().join("remoto.json"),
            r#"{"dispositivi":[{"id":"p","nome":"Anna","token":"old-token"}]}"#,
        )
        .unwrap();
        let mut c = db::open(&dir.path().join("test.db")).unwrap();
        assert_eq!(import(&mut c, dir.path()).unwrap(), 1);
        assert!(import(&mut c, dir.path()).is_err());
        assert_eq!(db::player(&c, "p").unwrap()["balance"], 123);
        let token: String = c
            .query_row("SELECT token FROM devices", [], |r| r.get(0))
            .unwrap();
        assert_eq!(token, db::hash("old-token"));
    }
    #[test]
    fn broken_account_rolls_back_everything() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("giochi.json"),
            r#"{"versione":4,"conti":[{"chi":"a","saldo":123},{"chi":"b","saldo":-1}]}"#,
        )
        .unwrap();
        std::fs::write(dir.path().join("remoto.json"), r#"{"dispositivi":[]}"#).unwrap();
        let mut c = db::open(&dir.path().join("test.db")).unwrap();
        assert!(import(&mut c, dir.path()).is_err());
        assert!(db::player(&c, "a").is_err());
    }
}
