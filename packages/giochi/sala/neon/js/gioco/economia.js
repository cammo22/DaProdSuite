/**
 * NEON PARTENOPE — economia: acquisti, quartiere, officina, laboratorio, gocce di lava,
 * guadagni da assenza, commissioni, trofei ed Eruzione.
 */
"use strict";

let QUANTITA = 1; // quantità d'acquisto per quartiere e braccio: 1 | 10 | 100 | "max"

function paga(valuta, costo) {
  const k = { lire: "lire", rottami: "rottami", biglietti: "biglietti", braci: "braci" }[valuta] || "lire";
  if (!(S[k] >= costo) || !isFinite(costo)) { Suono.suona("errore"); return false; }
  S[k] -= costo;
  return true;
}
function dopoAcquisto() {
  sporca();
  Suono.suona("compra");
  richiediRender();
}

// ============================================================ BRACCIO
function quantiBraccio() {
  if (QUANTITA === "max") return Math.max(1, maxBraccio(S.braccio, S.lire));
  return QUANTITA;
}
function compraBraccio() {
  const n = quantiBraccio(), c = costoBraccioN(S.braccio, n);
  if (!paga("lire", c)) return;
  const prima = S.braccio;
  S.braccio += n;
  S.stats.upg += n;
  if (Math.floor(S.braccio / BRACCIO.raddoppioOgni) > Math.floor(prima / BRACCIO.raddoppioOgni)) {
    toast("💪", `Braccio livello ${S.braccio}!`, "Traguardo: danno del braccio ×2", { tipo: "oro" });
  }
  dopoAcquisto();
}

// ============================================================ QUARTIERE
function quantiGen(g) {
  if (QUANTITA === "max") return Math.max(1, maxGen(g, S.lire));
  return QUANTITA;
}
function compraGen(id) {
  const g = QUARTIERE.find(x => x.id === id); if (!g) return;
  const n = quantiGen(g), c = costoGen(g, n);
  if (!paga("lire", c)) return;
  const prima = S.gen[id] || 0;
  S.gen[id] = prima + n;
  S.stats.genComprati += n;
  for (const t of TRAGUARDI_QUARTIERE) if (prima < t && S.gen[id] >= t) {
    toast(g.i, `${g.n} ×${t}!`, `Traguardo: produzione di ${g.n} raddoppiata`, { tipo: "oro" });
  }
  if (!S.visto.primoGen) { S.visto.primoGen = true; radio(STORIA.eventi.primoGen); }
  Scena.quartiere();
  dopoAcquisto();
}

// ============================================================ POTENZIAMENTI A ACQUISTO UNICO
function tuttiUp() {
  return [].concat(COLPI_F1, COLPI_F2, PRODUZIONE, CRITICO, CORAZZA, RIGENERA, OFFLINE, UP_GEN);
}
function upDisponibile(u) {
  if (haUp(u.id)) return false;
  if (u.gen) return (S.gen[u.gen] || 0) >= u.req;
  if (u.req && S.maxStanza < u.req) return false;
  if (COLPI_F2.includes(u)) return catenaCompleta(COLPI_F1);
  return true;
}
function compraUp(id) {
  const u = tuttiUp().find(x => x.id === id);
  if (!u || !upDisponibile(u)) return;
  if (!paga("lire", u.costo)) return;
  S.up.push(id);
  S.stats.upg++;
  if (CORAZZA.includes(u)) S.energia = energiaMax();
  toast(u.i || "🔧", u.n, u.d, { dur: 1800 });
  dopoAcquisto();
}

function compraAutoma(id) {
  const a = AUTOMI.find(x => x.id === id); if (!a) return;
  if (!paga("lire", costoAutoma(a))) return;
  const prima = totAutomi();
  S.automi[id] = (S.automi[id] || 0) + 1;
  S.stats.upg++;
  if (prima === 0) radio(STORIA.eventi.automi);
  if (Math.floor(totAutomi() / 25) > Math.floor(prima / 25)) {
    toast("🏅", `${totAutomi()} livelli automa!`, "Bonus permanente: +4% danno e produzione", { tipo: "oro" });
  }
  dopoAcquisto();
}
function compraStat(k) {
  const st = STAT.find(x => x.k === k); if (!st) return;
  if (!paga("lire", costoStat(st))) return;
  S.stat[k]++;
  S.stats.upg++;
  dopoAcquisto();
}
function compraInf(k) {
  if (!infSbloccato(k)) return;
  if (!paga("lire", costoInf(k))) return;
  S.inf[k]++;
  S.stats.upg++;
  dopoAcquisto();
}

// ============================================================ LABORATORIO BIGLIETTI
function compraLab() {
  if (!paga("lire", costoLab())) return;
  S.lab.lv++;
  toast("🏭", `Laboratorio livello ${S.lab.lv}`, `Stampa un Biglietto ogni ${fmtTempo(1 / velocitaLab())}`);
  dopoAcquisto();
}
function tickLab(dt) {
  if (!S.lab.lv) return;
  S.lab.prog += velocitaLab() * dt;
  if (S.lab.prog >= 1) {
    const n = Math.floor(S.lab.prog);
    S.lab.prog -= n; S.biglietti += n;
    Suono.suona("biglietto");
    toast("🎟️", "Biglietto stampato!", `+${n} dal Laboratorio`, { dur: 1600, chiave: "lab" });
  }
}

// ============================================================ BUFF
function aggiungiBuff(k, val, sec, nome) {
  S.buff[k] = { val, fino: Date.now() + sec * 1000, nome };
  sporca();
}

// ============================================================ GOCCE DI LAVA
// Cadono dal cratere ogni tanto: si toccano al volo per un premio a sorpresa.
let prossimaGoccia = Date.now() + 40000;
function tickGocce() {
  const t = Date.now();
  if (t < prossimaGoccia || document.hidden) return;
  const f = 1 - 0.05 * livCirc("fortuna");
  prossimaGoccia = t + caso(55000, 120000) * f;
  if (!$("intro").classList.contains("via")) return;
  creaGoccia();
}
function creaGoccia() {
  const g = document.createElement("button");
  g.className = "goccia";
  g.setAttribute("aria-label", "Goccia di lava");
  g.style.left = caso(8, 88) + "vw";
  g.style.setProperty("--deriva", caso(-12, 12) + "vw");
  g.innerHTML = "<i></i>";
  g.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); raccogliGoccia(g); };
  $("gocce").appendChild(g);
  setTimeout(() => g.remove(), 9500);
}
function raccogliGoccia(g) {
  if (g.dataset.presa) return;
  g.dataset.presa = "1";
  const r = g.getBoundingClientRect();
  g.classList.add("presa");
  setTimeout(() => g.remove(), 400);
  S.stats.gocce++;
  Suono.suona("goccia");
  if (!S.visto.goccia) { S.visto.goccia = true; radio(STORIA.eventi.goccia); }
  const f = 1 + 0.2 * livCirc("fortuna");
  const tiro = Math.random();
  let titolo, testo;
  if (tiro < 0.4) {
    const l = Math.max(produzione() * 90, lireStanza(S.stanza) * 40, 50) * f;
    guadagna(l); titolo = "Lava d'oro!"; testo = "+" + fmtLire(l);
  } else if (tiro < 0.62) {
    aggiungiBuff("dan", 3, 30, "Lava nelle mani"); titolo = "Furia di lava!"; testo = "Danno ×3 per 30 secondi";
  } else if (tiro < 0.82) {
    aggiungiBuff("prod", 3, 45, "Quartiere in festa"); titolo = "Quartiere in festa!"; testo = "Produzione ×3 per 45 secondi";
  } else if (tiro < 0.94) {
    const r = Math.round(casoInt(20, 50) * attoDi(S.stanza).n * f); S.rottami += r; titolo = "Rottami fusi!"; testo = `+${r} ⚙️`;
  } else {
    S.biglietti += 2; titolo = "Biglietti nella lava!"; testo = "+2 🎟️";
  }
  toast("💧", titolo, testo, { tipo: "lava" });
  Fx.testoSchermo(r.left + r.width / 2, r.top, testo);
  richiediRender();
}

// ============================================================ ASSENZA
function guadagniAssenza() {
  const trascorsi = (Date.now() - (S.ultimo || Date.now())) / 1000;
  if (trascorsi < 60) return null;
  const sec = Math.min(trascorsi, oreOffline() * 3600);
  const l = produzione() * sec * BIL.offlineBase * moltOffline();
  let big = 0;
  if (S.lab.lv) { S.lab.prog += velocitaLab() * sec; big = Math.floor(S.lab.prog); S.lab.prog -= big; S.biglietti += big; }
  if (l > 0) guadagna(l);
  return { sec: trascorsi, lire: l, big };
}

// ============================================================ COMMISSIONI
function contatore(k) {
  return { kills: S.kills, click: S.stats.click, gen: S.stats.genComprati, sovra: S.stats.sovra, boss: S.bossVinti,
    gocce: S.stats.gocce, mini: S.stats.mini, elite: S.stats.elite, upg: S.stats.upg }[k] || 0;
}
function nuovaCommissione(escludi) {
  const pool = COMMISSIONI.filter(c => !escludi.includes(c.k) && !(c.min && S.maxStanza < c.min));
  const c = scegli(pool);
  const q = c.q(S);
  const a = attoDi(S.maxStanza).n;
  return { k: c.k, q, base: contatore(c.k), premio: [20 + a * 15 + casoInt(0, 10), Math.random() < 0.5 ? 1 : 0] };
}
function controllaCommissioni() {
  while (S.commissioni.length < 3) S.commissioni.push(nuovaCommissione(S.commissioni.map(c => c.k)));
}
function progressoComm(c) { return Math.min(c.q, contatore(c.k) - c.base); }
function riscuotiComm(i) {
  const c = S.commissioni[i];
  if (!c || progressoComm(c) < c.q) return;
  S.rottami += c.premio[0]; S.biglietti += c.premio[1];
  S.stats.comm++;
  toast("📋", "Commissione completata!", `+${c.premio[0]} ⚙️${c.premio[1] ? " · +1 🎟️" : ""}`, { tipo: "menta" });
  Suono.suona("vittoria");
  S.commissioni.splice(i, 1);
  controllaCommissioni();
  richiediRender();
}
function cambiaComm(i) {
  if (!paga("biglietti", 1)) { toast("🎟️", "Serve 1 Biglietto", "per cambiare una commissione"); return; }
  S.commissioni.splice(i, 1, nuovaCommissione(S.commissioni.map(c => c.k)));
  Suono.suona("clic");
  richiediRender();
}

// ============================================================ TROFEI
function controllaTrofei() {
  let nuovi = 0;
  for (const t of TROFEI) {
    if (S.trofei.includes(t.id)) continue;
    let ok = false;
    try { ok = t.c(S); } catch (e) { ok = false; }
    if (!ok) continue;
    S.trofei.push(t.id);
    S.rottami += t.r[0]; S.biglietti += t.r[1];
    toast(t.i, "Trofeo: " + t.n, `${t.d} · +${t.r[0]} ⚙️${t.r[1] ? " · +" + t.r[1] + " 🎟️" : ""}`, { tipo: "oro", dur: 3600 });
    Suono.suona("trofeo");
    nuovi++;
  }
  if (nuovi) richiediRender();
}

// ============================================================ ERUZIONE (prestigio)
function puoEruttare() { return S.visto.liberata && S.maxStanza >= 100 && braciEruzione() > 0; }

/**
 * ⚠ Nella sala giochi della DaProd Suite l'eruzione e' la fine della partita
 * (2.1.4). Chiesto da Cammo: «puoi finire il gioco il piu' velocemente
 * possibile e convertire le lire guadagnate in lire vere DaProd, ma il gioco
 * si resetta e la prossima volta ricomincia da capo».
 *
 * Quindi dentro la suite far eruttare il Vesuvio incassa le lire di questo
 * ciclo (la suite le conta a ordini di grandezza, col premio della velocita'),
 * e poi si ricomincia da zero: niente braci da portarsi dietro. Se la sala non
 * risponde si erutta come sempre. Fuori dalla suite non cambia niente.
 */
let incassando = false;
function erutta() {
  if (!puoEruttare()) return;
  if (window.DaProdLira && DaProdLira.modo === "suite" && !incassando) {
    incassando = true;
    Suono.suona("eruzione");
    Scena.eruzione(2);
    Fx.lampo("rgba(255,200,80,.8)");
    toast("🌋", "IL VESUVIO ERUTTA!", "Partita finita: incasso le lire in lire vere DaProd", { tipo: "lava", dur: 6000 });
    DaProdLira.incassa({ fine: true, grezzo: S.lireCiclo }).catch(() => { incassando = false; eruttaDavvero(); });
    return;
  }
  eruttaDavvero();
}
function eruttaDavvero() {
  if (!puoEruttare()) return;
  const b = braciEruzione();
  const tieni = {
    braci: S.braci + b, braciTot: S.braciTot + b, circuiti: S.circuiti, ciclo: S.ciclo + 1,
    totLire: S.totLire, rottami: S.rottami, biglietti: S.biglietti, kills: S.kills, bossVinti: S.bossVinti,
    trofei: S.trofei, stats: S.stats, inv: S.inv, rob: S.rob, look: S.look, opz: S.opz, diario: S.diario,
    visto: S.visto, commissioni: [], mini: S.mini, creato: S.creato, versione: S.versione, record: Math.max(S.record || 0, S.maxStanza)
  };
  S = Object.assign(statoNuovo(), tieni);
  S.braccio = 1 + 25 * livCirc("memoria");
  for (const k of Object.keys(S.visto)) if (/^atto\d$/.test(k)) delete S.visto[k];
  S.visto.atto1 = true;
  sporca();
  controllaCommissioni();
  S.energia = energiaMax();
  Suono.suona("eruzione");
  if (window.DaProdLira) DaProdLira.evento("neon", "eruzione");
  Scena.atto(attoDi(1));
  Scena.eruzione(2);
  Fx.lampo("rgba(255,200,80,.8)");
  cambioAtto(attoDi(1));
  radio(STORIA.eventi.eruzione, { chi: "PARTENOPE", col: "#ff3df2" });
  toast("🔥", `ERUZIONE! Ciclo ${S.ciclo}`, `+${b} Braci: spendile nei Circuiti di Partenope`, { tipo: "lava", dur: 6000 });
  nuovaOnda();
  salva();
  apriScheda("diario");
  richiediRender();
}
function compraCircuito(id) {
  const c = CIRCUITI.find(x => x.id === id); if (!c) return;
  const lv = livCirc(id);
  if (lv >= c.max) return;
  if (!paga("braci", c.costo(lv))) return;
  S.circuiti[id] = lv + 1;
  if (id === "memoria" && S.braccio < 1 + 25 * (lv + 1)) S.braccio = 1 + 25 * (lv + 1);
  dopoAcquisto();
}
