/**
 * NEON PARTENOPE — formule e bilanciamento
 * Funzioni pure sullo stato S: vita dei nemici, danno, produzione, costi.
 * Usate dal gioco e dal simulatore (strumenti/simula.mjs), che controlla la curva di progressione.
 */
"use strict";

// Costanti di bilanciamento (tarate con strumenti/simula.mjs)
const BIL = {
  hpBase: 10,          // vita di un nemico in stanza 1
  hpCresc: 1.285,         // crescita per stanza fino alla 100
  hpCrescOltre: 1.24,  // crescita oltre la 100
  lireBase: 3,         // lire lasciate da un nemico in stanza 1
  lireCresc: 1.13,     // le lire crescono più piano della vita: è il quartiere a fare la differenza
  ondePerStanza: 3,
  bossMolt: 12,        // vita del boss rispetto a un nemico della sua stanza
  bossTempo: 30,       // secondi per battere un boss
  bossColpoOgni: 2.0,  // secondi fra un colpo e l'altro del boss
  critMolt: 3,
  energiaBase: 100,
  rigenBase: 2,        // energia al secondo
  offlineBase: 0.25,   // quota della produzione guadagnata da assenti
  offlineOre: 12,
  braciPerc: 0.05      // bonus danno/produzione per ogni Brace non spesa
};

// ============================================================ utilità di stato
function haUp(id) { return S.up.includes(id); }
function catenaCompleta(lista) { return lista.every(u => haUp(u.id)); }
function livInf(k) { return (S.inf && S.inf[k]) || 0; }
function livCirc(k) { return (S.circuiti && S.circuiti[k]) || 0; }
function totAutomi() { let t = 0; for (const a of AUTOMI) t += S.automi[a.id] || 0; return t; }

// Cache dei valori derivati: si svuota ad ogni acquisto / cambio di stato rilevante.
let _cache = {};
function sporca() { _cache = {}; }
function cached(k, f) { if (_cache[k] === undefined) _cache[k] = f(); return _cache[k]; }

// ============================================================ ATTI E STANZE
function attoDi(s) { return ATTI.find(a => s >= a.da && s <= a.a) || ATTI[ATTI.length - 1]; }
function eBoss(s) { return s % 10 === 0; }
function bossDi(s) { return BOSS[(Math.floor(s / 10) - 1) % BOSS.length]; }
function eEco(s) { return s > 100; }
function dimOrda(s) {
  if (s < 6) return 1; if (s < 16) return 2; if (s < 31) return 3; if (s < 51) return 4;
  if (s < 71) return 5; if (s < 91) return 6; if (s < 150) return 7; return 8;
}
function hpStanza(s) {
  const a = Math.min(s, 100) - 1, b = Math.max(0, s - 100);
  return BIL.hpBase * Math.pow(BIL.hpCresc, a) * Math.pow(BIL.hpCrescOltre, b);
}
// Nelle orde ogni nemico ha meno vita: l'orda intera non punisce troppo.
function hpNemico(s, m, elite) {
  const w = dimOrda(s);
  return hpStanza(s) * (m || 1) / (1 + 0.25 * (w - 1)) * (elite ? 3 : 1);
}
function hpBoss(s) {
  const eco = eEco(s) ? 1 + Math.floor((s - 101) / 100) * 0.5 : 1;
  return hpStanza(s) * BIL.bossMolt * eco;
}
function tempoBoss() { return BIL.bossTempo + 5 * livCirc("pazienza"); }
function colpoBoss(s) {
  let d = 4 * Math.pow(1.035, Math.max(0, s - 10));
  const set = setAttivi();
  if (set.enforcer >= 2) d *= 0.8;
  return Math.max(1, d);
}

// ============================================================ DANNO
function danBraccio(L) { return L * Math.pow(2, Math.floor(L / BRACCIO.raddoppioOgni)); }
function costoBraccio(L) { return Math.ceil(BRACCIO.base * Math.pow(BRACCIO.crescita, L - 1)); }
// Costo per salire di n livelli dal livello L (serie geometrica)
function costoBraccioN(L, n) {
  const r = BRACCIO.crescita;
  return BRACCIO.base * Math.pow(r, L - 1) * (Math.pow(r, n) - 1) / (r - 1);
}
function maxBraccio(L, lire) {
  const r = BRACCIO.crescita, primo = BRACCIO.base * Math.pow(r, L - 1);
  if (lire < primo) return 0;
  return Math.max(0, Math.floor(Math.log(lire * (r - 1) / primo + 1) / Math.log(r)));
}

function moltBraci() { return 1 + BIL.braciPerc * (S.braci || 0); }
function moltAutomiTraguardo() { return 1 + Math.floor(totAutomi() / 25) * 0.04; }

// Danno di un colpo "freddo" (senza critico/multicolpo), con tutti i moltiplicatori permanenti.
function dannoBase() {
  return cached("dan", () => {
    let d = danBraccio(S.braccio);
    for (const u of COLPI_F1) if (haUp(u.id)) d *= u.val;
    for (const u of COLPI_F2) if (haUp(u.id)) d *= u.val;
    d *= Math.pow(INFINITI.click.per, livInf("click"));
    d *= 1 + 0.03 * (S.maxStanza - 1);
    d *= moltAutomiTraguardo();
    d *= Math.pow(1.25, livCirc("lava"));
    d *= moltBraci();
    const set = setAttivi();
    if (set.sistema >= 2) d *= 1.35;
    if (set.partenope >= 2) d *= 1.5;
    return d * moltOggetti();
  });
}
// Moltiplicatori temporanei (sovraccarico, protocollo, buff): non in cache.
function moltTemporaneo() {
  let m = 1;
  if (inSovra()) {
    m *= 2.5 * (1 + 0.25 * (S.stat.sovra || 0));
    if (setAttivi().vesuvio >= 2) m *= 2;
  }
  if (protoAttivo()) m *= PROTOCOLLO.danno;
  const b = buffAttivo("dan"); if (b) m *= b;
  return m;
}
function dannoColpo() { return dannoBase() * moltTemporaneo(); }

function probCrit() {
  return cached("crit", () => {
    let c = 0.05;
    for (const u of CRITICO) if (haUp(u.id)) c += u.val;
    c += livInf("crit") * INFINITI.crit.per;
    c += 0.02 * livCirc("occhio");
    return Math.min(0.9, c);
  }) + (buffAttivo("crit") || 0);
}
function probMulti() {
  const r = S.stat.multi || 0;
  return r <= 16 ? r * 0.05 : Math.min(0.95, 0.8 + (r - 16) * 0.01);
}
function quotaFendente() {
  const r = S.stat.fend || 0;
  return r <= 10 ? r * 0.08 : 0.8 + (r - 10) * 0.015;
}
// Valore atteso di un colpo (critico e multicolpo compresi)
function mediaColpo() {
  const pc = Math.min(0.95, probCrit()), pm = probMulti();
  return (1 + pc * (BIL.critMolt - 1)) * (1 + pm * 1.25);
}

function colpiAutomi() {
  return cached("aut", () => {
    let t = 0;
    for (const a of AUTOMI) t += (S.automi[a.id] || 0) * a.val;
    if (setAttivi().sistema >= 2) t *= 2;
    t *= 1 + 0.25 * livCirc("automi");
    return t;
  });
}
function dpsAutomi() { return S.automiOn ? dannoColpo() * mediaColpo() * colpiAutomi() : 0; }

// ============================================================ PRODUZIONE
function moltGen(id) {
  return cached("g_" + id, () => {
    let m = 1;
    for (const x of UP_GEN) if (x.gen === id && haUp(x.id)) m *= x.val;
    const n = S.gen[id] || 0;
    for (const t of TRAGUARDI_QUARTIERE) if (n >= t) m *= 2;
    return m;
  });
}
function moltProdGlobale() {
  return cached("pg", () => {
    let m = 1;
    for (const u of PRODUZIONE) if (haUp(u.id)) m *= u.val;
    m *= Math.pow(INFINITI.prod.per, livInf("prod"));
    m *= moltAutomiTraguardo();
    m *= Math.pow(1.25, livCirc("quart"));
    m *= moltBraci();
    const set = setAttivi();
    if (set.frutiger >= 2) m *= 3;
    if (set.partenope >= 2) m *= 1.5;
    return m;
  }) * (buffAttivo("prod") || 1);
}
function prodGen(g) { return g.prod * moltGen(g.id) * moltProdGlobale(); }
function produzione() {
  let t = 0;
  for (const g of QUARTIERE) { const n = S.gen[g.id] || 0; if (n) t += n * prodGen(g); }
  return t;
}
function costoGen(g, n) {
  const r = 1.15, o = S.gen[g.id] || 0;
  n = n || 1;
  return g.base * Math.pow(r, o) * (Math.pow(r, n) - 1) / (r - 1);
}
function maxGen(g, lire) {
  const r = 1.15, primo = g.base * Math.pow(r, S.gen[g.id] || 0);
  if (lire < primo) return 0;
  return Math.max(0, Math.floor(Math.log(lire * (r - 1) / primo + 1) / Math.log(r)));
}
// Potenziamenti per singolo personaggio: ×2, ×2, ×3 (servono 10/25/50 personaggi)
const UP_GEN = (() => {
  const a = [];
  for (const g of QUARTIERE) {
    a.push({ id: g.id + "_x2",  gen: g.id, val: 2, req: 10, costo: g.base * 60,   i: "🔥", n: "Fiamma · " + g.n,    d: "Produzione di " + g.n + " ×2" });
    a.push({ id: g.id + "_x4",  gen: g.id, val: 2, req: 25, costo: g.base * 2500, i: "⚗️", n: "Leghe · " + g.n,     d: "Produzione di " + g.n + " ×2" });
    a.push({ id: g.id + "_x10", gen: g.id, val: 3, req: 50, costo: g.base * 2e5,  i: "💎", n: "Cromatura · " + g.n, d: "Produzione di " + g.n + " ×3" });
  }
  return a;
})();

// ============================================================ LIRE DAI NEMICI
function lireStanza(s) { return BIL.lireBase * Math.pow(BIL.lireCresc, s - 1); }
function lireNemico(s, m, elite) {
  const w = dimOrda(s);
  let l = lireStanza(s) * (m || 1) / (1 + 0.25 * (w - 1)) * (elite ? 2.5 : 1);
  if (setAttivi().robomafia >= 2) l *= 2.5;
  l *= moltBraci();
  return Math.max(1, l);
}
function lireBoss(s) { return lireStanza(s) * BIL.bossMolt * 1.5 * moltBraci(); }

// ============================================================ ENERGIA
function energiaMax() {
  return cached("hp", () => {
    let m = 1;
    for (const u of CORAZZA) if (haUp(u.id)) m += u.val;
    if (setAttivi().enforcer >= 2) m += 0.5;
    return Math.round((BIL.energiaBase + 20 * Math.min(S.bossVinti, 50)) * m);
  });
}
function rigenerazione() {
  return cached("rig", () => {
    let r = BIL.rigenBase;
    for (const u of RIGENERA) if (haUp(u.id)) r *= u.val;
    return r * energiaMax() / 100;
  });
}

// ============================================================ ASSENZA
function moltOffline() {
  let m = 1;
  for (const u of OFFLINE) if (haUp(u.id)) m += u.val;
  m *= 1 + 0.25 * livCirc("canto");
  if (setAttivi().frutiger >= 3) m *= 2;
  return m;
}
function oreOffline() { return BIL.offlineOre + 2 * livCirc("canto"); }

// ============================================================ AUTOMI, STATISTICHE, INFINITI
function costoAutoma(a) { return Math.round(a.base * Math.pow(a.crescita, S.automi[a.id] || 0)); }
function costoStat(st) { return Math.round(st.base * Math.pow(st.crescita, S.stat[st.k] || 0)); }
function costoInf(k) { const c = INFINITI[k]; return Math.round(c.base * Math.pow(c.crescita, livInf(k))); }
function infSbloccato(k) {
  if (k === "click") return catenaCompleta(COLPI_F2);
  if (k === "prod") return catenaCompleta(PRODUZIONE);
  if (k === "crit") return catenaCompleta(CRITICO);
  return false;
}

// ============================================================ MERCERIA E SET
function oggetto(id) { return OGGETTI.find(o => o.id === id); }
// Conta i pezzi equipaggiati per set: { vesuvio: 2, ... }
function setAttivi() {
  return cached("set", () => {
    const c = {};
    for (const k in SET) c[k] = 0;
    for (const it of S.inv) if (it.eq) { const o = oggetto(it.id); if (o) c[o.set]++; }
    return c;
  });
}
function costoOggetto(o) {
  let sc = S.sconto || 0;
  if (setAttivi().robomafia >= 2) sc = Math.min(0.8, sc + 0.2);
  return Math.round(o.costo * (1 - sc));
}
function costoLivOggetto(o, lv) { return Math.round(15 * RARITA[o.rar].lv * Math.pow(1.55, (lv || 1) - 1)); }
// Ogni livello oggetto oltre il primo: +10% al danno se equipaggiato
function moltOggetti() {
  return cached("ogg", () => {
    let m = 1;
    for (const it of S.inv) if (it.eq) m *= 1 + 0.1 * (it.lv - 1);
    return m;
  });
}

// ============================================================ LABORATORIO BIGLIETTI
function costoLab() { return Math.round(5e4 * Math.pow(3, S.lab.lv)); }
function velocitaLab() { return S.lab.lv / 300; } // biglietti al secondo

// ============================================================ ERUZIONE
// Braci guadagnate facendo eruttare il Vesuvio: crescono con la stanza massima e le lire del ciclo.
function braciEruzione() {
  if (S.maxStanza < 100) return 0;
  let b = Math.floor(5 + Math.pow(S.maxStanza - 95, 1.1) + Math.pow(S.lireCiclo / 1e12, 0.25) * 3);
  if (setAttivi().partenope >= 3) b = Math.floor(b * 1.5);
  return Math.max(0, b);
}

// ============================================================ BUFF TEMPORANEI
function buffAttivo(k) { const b = S.buff && S.buff[k]; return b && b.fino > Date.now() ? b.val : 0; }
function inSovra() { return S.sovraFino > Date.now(); }
function protoAttivo() { return S.protoFino > Date.now(); }

// Danno totale al secondo stimato (per HUD, Borsa e minigiochi): clic tipici + automi
function dpsStimato(clicAlSec) {
  const c = clicAlSec === undefined ? 3 : clicAlSec;
  return dannoColpo() * mediaColpo() * (c + (S.automiOn ? colpiAutomi() : 0));
}
