/**
 * NEON PARTENOPE — stato della partita e salvataggi
 * Un solo oggetto S, salvato in localStorage. Legge anche i vecchi salvataggi di VESUVIO.EXE
 * e li trasforma in un'"eredità" (rottami, biglietti, Braci e il look del robot).
 */
"use strict";

const CHIAVE_SALVA = "neonPartenope_v2";
const CHIAVE_BORSA = "neonPartenope_borsa";
const CHIAVI_VECCHIE = ["vesuvioEXE_saveV3", "vesuvioEXE_saveV2", "vesuvioEXE_save"];

function statoNuovo() {
  return {
    formato: 2,
    creato: Date.now(),
    ultimo: Date.now(),
    versione: "",
    // valute
    lire: 0, totLire: 0, lireCiclo: 0, rottami: 0, biglietti: 0, braci: 0, braciTot: 0,
    // discesa
    stanza: 1, maxStanza: 1, onda: 0, autoAvanza: true, bossRitirata: 0, ciclo: 1,
    // Ferro Vecchio
    braccio: 1, energia: 100, calore: 0, sovraFino: 0, giu: false, giuDa: 0,
    automiOn: true, protoFino: 0, protoPronto: 0,
    // officina
    gen: {}, up: [], automi: {}, stat: { multi: 0, sovra: 0, fend: 0 }, inf: { click: 0, prod: 0, crit: 0 },
    circuiti: {},
    // merceria
    inv: [], vetrina: [], sconto: 0, lab: { lv: 0, prog: 0 },
    buff: {},
    // aspetto
    rob: { telaio: "ferro", col1: "#3fa8d8", col2: "#ffd54a", colOcchi: "#5dffb4", occhi: "visore",
      antenna: "none", cappello: "none", acc: "none", arma: "none", ali: "none", fx: "none" },
    look: ["ferro", "visore", "none"],
    // progressi
    kills: 0, bossVinti: 0, trofei: [],
    stats: { click: 0, multi: 0, sovra: 0, proto: 0, gocce: 0, mini: 0, ruota: 0, setAttivo: 0, look: 0,
      comm: 0, rivincite: 0, elite: 0, cadute: 0, upg: 0, genComprati: 0, tempo: 0 },
    commissioni: [], commGiorno: "",
    mini: {},          // ricariche dei minigiochi: { sfera: timestamp, ... }
    diario: [], visto: {},
    opz: { suoni: true, musica: true, volume: 0.6, notifiche: true, qualita: "auto", borsaHud: true, notazione: "suffissi", voce: true, popupEffetti: true }
  };
}

let S = statoNuovo();

// Unisce un salvataggio con lo stato nuovo, così i campi aggiunti in versioni future hanno sempre un valore.
function unisci(base, dati) {
  for (const k in dati) {
    const v = dati[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
      unisci(base[k], v);
    } else if (v !== undefined && v !== null) {
      base[k] = v;
    }
  }
  return base;
}

function numeroValido(n, def) { return (typeof n === "number" && isFinite(n) && n >= 0) ? n : def; }

// Ripara un salvataggio rovinato: numeri impossibili, liste sbagliate, stanze fuori scala.
function riparaSalvataggio(s) {
  const n = statoNuovo();
  for (const k of ["lire", "totLire", "lireCiclo", "rottami", "biglietti", "braci", "braciTot", "kills", "bossVinti"]) {
    s[k] = numeroValido(s[k], n[k]);
  }
  s.stanza = Math.max(1, Math.floor(numeroValido(s.stanza, 1)));
  s.maxStanza = Math.max(s.stanza, Math.floor(numeroValido(s.maxStanza, 1)));
  s.braccio = Math.max(1, Math.floor(numeroValido(s.braccio, 1)));
  s.ciclo = Math.max(1, Math.floor(numeroValido(s.ciclo, 1)));
  s.onda = Math.min(BIL.ondePerStanza - 1, Math.max(0, Math.floor(numeroValido(s.onda, 0))));
  if (!Array.isArray(s.up)) s.up = [];
  if (!Array.isArray(s.inv)) s.inv = [];
  s.inv = s.inv.filter(it => it && oggetto(it.id)).map(it => ({ id: it.id, lv: Math.max(1, it.lv | 0), eq: !!it.eq }));
  if (!Array.isArray(s.trofei)) s.trofei = [];
  if (!Array.isArray(s.vetrina)) s.vetrina = [];
  if (!Array.isArray(s.diario)) s.diario = [];
  if (!Array.isArray(s.commissioni)) s.commissioni = [];
  if (!Array.isArray(s.look)) s.look = ["ferro", "visore", "none"];
  for (const k of ["gen", "automi", "circuiti", "mini", "visto", "buff"]) if (!s[k] || typeof s[k] !== "object") s[k] = {};
  s.energia = numeroValido(s.energia, 100);
  s.giu = false;
  return s;
}

function carica() {
  let grezzo = null;
  try { grezzo = localStorage.getItem(CHIAVE_SALVA); } catch (e) { /* storage bloccato */ }
  if (grezzo) {
    try {
      S = riparaSalvataggio(unisci(statoNuovo(), JSON.parse(grezzo)));
      sporca();
      return "carica";
    } catch (e) {
      console.warn("Salvataggio illeggibile, si riparte:", e);
      S = statoNuovo();
      return "rovinato";
    }
  }
  S = statoNuovo();
  return eredita() ? "eredita" : "nuovo";
}

function salva() {
  try {
    S.ultimo = Date.now();
    localStorage.setItem(CHIAVE_SALVA, JSON.stringify(S));
    return true;
  } catch (e) {
    return false;
  }
}

// Vecchio VESUVIO.EXE → Neon Partenope: la vecchia partita diventa un'eredità.
// Il bilanciamento è cambiato, quindi non si portano lire e livelli: si portano rottami, biglietti,
// il look del robot e una scorta di Braci proporzionata a quanto si era giocato.
function eredita() {
  let vecchio = null;
  for (const k of CHIAVI_VECCHIE) {
    try { const r = localStorage.getItem(k); if (r) { vecchio = JSON.parse(r); break; } } catch (e) { /* niente */ }
  }
  if (!vecchio || typeof vecchio !== "object") return false;
  const tot = numeroValido(vecchio.totalLire || vecchio.totalLava, 0);
  S.rottami = Math.min(5000, Math.floor(numeroValido(vecchio.rottami, 0)));
  S.biglietti = Math.min(50, Math.floor(numeroValido(vecchio.biglietti, 0)));
  S.braci = S.braciTot = Math.min(60, Math.floor(Math.max(0, Math.log10(Math.max(1, tot)) - 5) * 4));
  const r = vecchio.rob || {};
  if (r.col1) S.rob.col1 = r.col1;
  if (r.col2) S.rob.col2 = r.col2;
  if (r.eyesCol) S.rob.colOcchi = r.eyesCol;
  S.visto.eredita = { rottami: S.rottami, biglietti: S.biglietti, braci: S.braci, lire: tot };
  return true;
}

// Codice di salvataggio da copiare/incollare (esporta / importa)
function esportaCodice() {
  const json = JSON.stringify(S);
  return "NP2:" + btoa(unescape(encodeURIComponent(json)));
}
function importaCodice(codice) {
  const c = String(codice || "").trim();
  if (!c.startsWith("NP2:")) throw new Error("Codice non valido");
  const dati = JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));
  S = riparaSalvataggio(unisci(statoNuovo(), dati));
  sporca();
  salva();
}

function azzeraTutto() {
  try {
    localStorage.removeItem(CHIAVE_SALVA);
    localStorage.removeItem(CHIAVE_BORSA);
  } catch (e) { /* niente */ }
  S = statoNuovo();
  sporca();
}
