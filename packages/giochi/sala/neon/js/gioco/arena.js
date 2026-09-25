/**
 * NEON PARTENOPE — l'arena: orde, boss, colpi, sovraccarico, automi e protocollo
 * Qui vive il combattimento. La discesa è fatta di stanze: tre ondate per stanza,
 * un boss ogni dieci. Il boss ha un tempo limite e ti colpisce: se cadi ti ripari o ti ritiri.
 */
"use strict";

// Stato dell'ondata in corso (non si salva: al caricamento si rigenera)
const W = {
  nemici: [], focus: 0, boss: false,
  intro: 0,        // fine dell'intro del boss (ms)
  bossFine: 0,     // scadenza del tempo contro il boss
  bossColpo: 0,    // prossimo colpo del boss
  attesa: 0,       // pausa fra un'ondata e l'altra
  accAut: 0, accRaffica: 0, ultimoClic: 0, numAut: 0, numAutT: 0,
  pos: [], palco: null
};

// ============================================================ ONDATE
function listaNemici(s) {
  const a = attoDi(s).n;
  return NEMICI[a <= 5 ? a : casoInt(1, 5)];
}

function nuovaOnda() {
  W.nemici = []; W.focus = 0; W.boss = false; W.intro = 0;
  const s = S.stanza;
  if (eBoss(s)) { preparaBoss(); return; }
  Suono.boss(false);
  const w = dimOrda(s), lista = listaNemici(s);
  for (let i = 0; i < w; i++) {
    const def = scegli(lista);
    const elite = S.onda === BIL.ondePerStanza - 1 && i === 0;
    const hp = hpNemico(s, def.m, elite);
    W.nemici.push({ n: def.n, i: def.i, m: def.m, hp, max: hp, elite, boss: false, eco: s > 100 });
  }
  costruisciOrda();
}

function preparaBoss() {
  const s = S.stanza, b = bossDi(s);
  const hp = hpBoss(s);
  W.boss = true;
  W.nemici = [{ n: (eEco(s) ? "Eco · " : "") + b.n, i: b.i, bossId: b.id, hp, max: hp, boss: true, elite: false, m: 1 }];
  W.intro = Date.now() + 2600;
  W.bossFine = 0;
  costruisciOrda();
  mostraIntroBoss(b, s);
  Suono.boss(true);
  Suono.suona("bossArriva");
  if (!S.visto["boss_" + b.id] && !eEco(s)) {
    S.visto["boss_" + b.id] = true;
    radio(b.entra, { chi: b.n, col: b.col });
    if (!S.visto.primoBoss) { S.visto.primoBoss = true; radio(STORIA.eventi.primoBoss); }
  }
}

function iniziaCombattimentoBoss() {
  W.intro = 0;
  W.bossFine = Date.now() + tempoBoss() * 1000;
  W.bossColpo = Date.now() + BIL.bossColpoOgni * 1000;
  const p = $("introBoss"); if (p) p.classList.remove("on");
}

// ============================================================ COLPI
function vivi() { return W.nemici.filter(n => n.hp > 0); }
function bersaglio(idx) {
  if (idx !== null && idx !== undefined && W.nemici[idx] && W.nemici[idx].hp > 0) { W.focus = idx; return W.nemici[idx]; }
  if (W.nemici[W.focus] && W.nemici[W.focus].hp > 0) return W.nemici[W.focus];
  const v = vivi();
  if (!v.length) return null;
  const n = v[0]; W.focus = W.nemici.indexOf(n); return n;
}
function arenaFerma() {
  const t = Date.now();
  return S.giu || t < W.intro || t < W.attesa || !W.nemici.length;
}

// Colpo del giocatore (clic o tocco)
function colpoManuale(idx) {
  if (arenaFerma()) return;
  const t = Date.now();
  if (t - W.ultimoClic < 35) return;           // tetto di ~28 colpi al secondo
  W.ultimoClic = t;
  S.stats.click++;
  if (!inSovra()) {
    S.calore = Math.min(100, S.calore + 2.5);
    if (S.calore >= 100) attivaSovra();
  }
  colpisci(idx, true, 1);
  pugnoRobot();
}

function colpisci(idx, manuale, molt) {
  const n = bersaglio(idx);
  if (!n) return;
  let d = dannoColpo() * (molt || 1);
  const crit = Math.random() < probCrit();
  if (crit) d *= BIL.critMolt;
  let k = 1;
  if (Math.random() < probMulti()) { k = Math.random() < 0.25 ? 3 : 2; S.stats.multi++; }
  d *= k;
  applica(n, d, { crit, multi: k, manuale });
  if (manuale) Suono.suona(crit ? "critico" : (k > 1 ? "multi" : "colpo"));
  // fendente: una parte del colpo si propaga al resto dell'orda
  const q = quotaFendente();
  if (q > 0 && !n.boss) {
    for (const o of W.nemici) if (o !== n && o.hp > 0) applica(o, d * q, { fend: true });
  }
}

function applica(n, d, info) {
  if (n.hp <= 0) return;
  n.hp -= d;
  const i = W.nemici.indexOf(n);
  const p = W.pos[i];
  if (p && !info.fend) {
    const auto = !info.manuale;
    // i colpi degli automi si sommano e compaiono come un solo numero ogni tanto
    if (auto && !info.crit) { n._acc = (n._acc || 0) + d; }
    else Fx.numero(p.x + caso(-p.w * 0.25, p.w * 0.25), p.y - p.h * 0.1, fmt(d), info.crit ? "crit" : (info.multi > 1 ? "multi" : (auto ? "auto" : "")));
    if (info.manuale || info.crit) Fx.scintille(p.x, p.y, info.crit ? "#ffd54a" : attoDi(S.stanza).neon, info.crit ? 14 : 6);
    const el = W.el && W.el[i];
    if (el) { el.classList.remove("colpito"); void el.offsetWidth; el.classList.add("colpito"); }
    if (info.crit && info.manuale) scuoti(1);
  }
  if (n.hp <= 0) morte(n);
}

// ============================================================ MORTI E BOTTINO
function guadagna(l) {
  S.lire += l; S.totLire += l; S.lireCiclo += l;
  // Dalla 2.1.4 niente punti DaProd: nella suite si incassa all'eruzione (economia.js).
}

function morte(n) {
  n.hp = 0;
  if (n.boss) { bossSconfitto(n); return; }
  const s = S.stanza, i = W.nemici.indexOf(n), p = W.pos[i];
  S.kills++;
  const l = lireNemico(s, n.m, n.elite);
  guadagna(l);
  let testo = "+" + fmt(l);
  if (Math.random() < 0.3) {
    const r = casoInt(1, 3) + attoDi(s).n; S.rottami += r; testo += " · ⚙️" + r;
  }
  let pb = n.elite ? 0.25 : 0.015;
  if (n.elite && setAttivi().robomafia >= 3) pb = 1;
  if (Math.random() < pb) { S.biglietti++; testo += " · 🎟️"; Suono.suona("biglietto"); }
  if (n.elite) S.stats.elite++;
  if (p) {
    Fx.monete(p.x, p.y, n.elite ? 10 : 4);
    // il bottino scritto solo per le élite e per chi colpisce a mano: con tanti automi sarebbe un muro di numeri
    if (n.elite || Date.now() - W.ultimoClic < 600) Fx.testo(p.x, p.y - p.h * 0.45, testo, "lire");
  }
  const el = W.el && W.el[i];
  if (el) el.classList.add("morto");
  Suono.suona("kill");
  if (!vivi().length) {
    W.attesa = Date.now() + 380;
    setTimeout(ondaFinita, 380);
  }
}

function ondaFinita() {
  if (W.boss) return;
  S.onda++;
  if (S.onda >= BIL.ondePerStanza) { stanzaFinita(); return; }
  Suono.suona("onda");
  nuovaOnda();
}

function stanzaFinita() {
  S.onda = 0;
  Fx.lampo("rgba(255,255,255,.12)");
  // con "avanza" attivo si scende, altrimenti si resta a farmare nella stessa stanza
  if (S.autoAvanza) cambiaStanza(S.stanza + 1);
  Suono.suona("stanza");
  nuovaOnda();
}

function cambiaStanza(s) {
  const primaAtto = attoDi(S.stanza).n;
  S.stanza = Math.max(1, s);
  if (S.stanza > S.maxStanza) {
    S.maxStanza = S.stanza;
    sporca();
  }
  const atto = attoDi(S.stanza);
  if (atto.n !== primaAtto) cambioAtto(atto);
  aggiornaTestaArena();
}

function cambioAtto(atto) {
  Scena.atto(atto);
  Suono.atto(atto.n);
  document.documentElement.style.setProperty("--neon", atto.neon);
  document.documentElement.style.setProperty("--neon2", atto.neon2);
  if (!S.visto["atto" + atto.n]) {
    S.visto["atto" + atto.n] = true;
    radio(STORIA.atti[atto.n]);
    annuncioAtto(atto);
  }
}

// ============================================================ BOSS
function bossSconfitto(n) {
  const s = S.stanza, b = bossDi(s);
  W.boss = false; W.bossFine = 0;
  const l = lireBoss(s);
  guadagna(l);
  const r = 10 + attoDi(s).n * 8 + casoInt(0, 10), big = casoInt(1, 3);
  S.rottami += r; S.biglietti += big;
  S.bossVinti++;
  if (window.DaProdLira) DaProdLira.evento("neon", "boss");
  if (S.bossRitirata === s) { S.stats.rivincite++; }
  S.bossRitirata = 0;
  S.energia = Math.min(energiaMax(), S.energia + energiaMax() * 0.5);
  Suono.boss(false);
  Suono.suona("bossVinto");
  const p = W.pos[0];
  if (p) { Fx.monete(p.x, p.y, 30); Fx.scintille(p.x, p.y, b.col, 60); }
  Fx.lampo("rgba(255,213,74,.35)");
  Scena.eruzione(0.6);
  scuoti(3);
  toast("🏆", (eEco(s) ? "Eco sconfitta: " : "Boss sconfitto: ") + b.n, `+${fmtLire(l)} · +${r} ⚙️ · +${big} 🎟️`, { tipo: "oro", dur: 4200 });
  if (!eEco(s) && !S.visto["cade_" + b.id]) { S.visto["cade_" + b.id] = true; radio(b.cade, { chi: b.n, col: b.col }); }
  const liberata = s === 100;
  cambiaStanza(s + 1);
  S.onda = 0;
  if (liberata) finaleLiberazione();
  setTimeout(() => nuovaOnda(), 700);
  W.nemici.forEach(x => x.hp = 0);
  W.attesa = Date.now() + 700;
  salva();
}

function bossFallito(motivo) {
  const s = S.stanza, b = bossDi(s);
  toast("⏱️", motivo || "Tempo scaduto!", `${b.n} ti ha respinto. Potenziati e riprova quando vuoi.`, { tipo: "rosso", dur: 4000 });
  ritirata(true);
}

// Torna alla stanza prima e resta lì a farmare finché non si preme "Riprova il boss"
function ritirata(daBoss) {
  const s = S.stanza;
  if (!eBoss(s) && !daBoss) return;
  S.bossRitirata = eBoss(s) ? s : S.bossRitirata;
  S.autoAvanza = false;
  S.giu = false;
  $("abbattuto").classList.remove("on");
  W.boss = false; W.bossFine = 0; W.intro = 0;
  $("introBoss").classList.remove("on");
  Suono.boss(false);
  cambiaStanza(s - 1);
  S.onda = 0;
  nuovaOnda();
  aggiornaTestaArena();
}

function riprovaBoss() {
  if (!S.bossRitirata) return;
  S.autoAvanza = true;
  cambiaStanza(S.bossRitirata);
  S.onda = 0;
  nuovaOnda();
  aggiornaTestaArena();
}

function abbatti() {
  S.giu = true; S.giuDa = Date.now(); S.energia = 0;
  S.stats.cadute++;
  Suono.suona("caduta");
  scuoti(4);
  $("abbattuto").classList.add("on");
  if (typeof Borsa !== "undefined") Borsa.panico();
  if (!S.visto.primaCaduta) { S.visto.primaCaduta = true; radio(STORIA.eventi.primaCaduta); }
}
function costoRiparazione() { return 10 + Math.floor(S.stanza / 2); }
function ripara() {
  if (!S.giu) return;
  const c = costoRiparazione();
  if (S.rottami < c) { Suono.suona("errore"); toast("⚙️", "Rottami insufficienti", `Servono ${c} ⚙️ per ripararti subito.`); return; }
  S.rottami -= c;
  rialza(0.75);
}
function rialza(q) {
  S.giu = false;
  S.energia = energiaMax() * q;
  $("abbattuto").classList.remove("on");
  Suono.suona("compra");
}

// ============================================================ SOVRACCARICO E PROTOCOLLO
function attivaSovra() {
  const dur = setAttivi().vesuvio >= 3 ? 15 : 10;
  S.sovraFino = Date.now() + dur * 1000;
  S.calore = 100;
  S.stats.sovra++;
  Suono.suona("sovra");
  Fx.lampo("rgba(255,90,31,.25)");
  $("palco").classList.add("sovra");
  toast("🔥", "SOVRACCARICO TERMICO!", `Danno ${fmtMolt(2.5 * (1 + 0.25 * S.stat.sovra))} per ${dur} secondi`, { tipo: "lava", chiave: "sovra" });
  if (!S.visto.primoSovra) { S.visto.primoSovra = true; radio(STORIA.eventi.primoSovra); }
}

function protoSbloccato() { return totAutomi() >= PROTOCOLLO.sblocco || S.visto.protoSbloccato; }
function attivaProtocollo() {
  if (!protoSbloccato()) return;
  const t = Date.now();
  if (protoAttivo()) return;
  if (t < S.protoPronto) { Suono.suona("errore"); return; }
  const ric = PROTOCOLLO.ricarica * (setAttivi().sistema >= 3 ? 0.5 : 1);
  S.protoFino = t + PROTOCOLLO.durata * 1000;
  S.protoPronto = t + ric * 1000;
  S.stats.proto++;
  Suono.suona("proto");
  Fx.lampo("rgba(53,232,255,.3)");
  scuoti(2);
  toast("☄️", "PROTOCOLLO VESUVIO!", `Danno ×${PROTOCOLLO.danno} per ${PROTOCOLLO.durata} s: gli automi sparano a raffica`, { tipo: "ciano" });
}

// ============================================================ TICK (ogni fotogramma)
function tickArena(dt) {
  const t = Date.now();
  // intro del boss finita?
  if (W.boss && W.intro && t >= W.intro) iniziaCombattimentoBoss();

  // sovraccarico finito / calore che si raffredda
  if (S.sovraFino && t >= S.sovraFino) {
    S.sovraFino = 0; S.calore = 0; $("palco").classList.remove("sovra");
  } else if (!inSovra() && t - W.ultimoClic > 900 && S.calore > 0) {
    S.calore = Math.max(0, S.calore - 12 * dt);
  }

  // energia: abbattuto → riavvio automatico dopo 5 s, altrimenti rigenerazione
  if (S.giu) {
    const resta = 5 - (t - S.giuDa) / 1000;
    const el = $("riavvioTxt"); if (el) el.textContent = Math.max(0, Math.ceil(resta)) + "s";
    if (resta <= 0) rialza(0.5);
  } else {
    const max = energiaMax();
    if (S.energia < max) S.energia = Math.min(max, S.energia + rigenerazione() * (W.boss ? 0.5 : 3) * dt);
  }

  // boss: tempo e colpi
  if (W.boss && W.bossFine) {
    if (t >= W.bossFine) { bossFallito(); return; }
    if (!S.giu && t >= W.bossColpo) {
      W.bossColpo = t + BIL.bossColpoOgni * 1000;
      const d = colpoBoss(S.stanza);
      S.energia -= d;
      if (setAttivi().enforcer >= 3 && !inSovra()) { S.calore = Math.min(100, S.calore + 20); if (S.calore >= 100) attivaSovra(); }
      Suono.suona("bossColpo");
      scuoti(2);
      Fx.colpoSubito(fmt(d));
      if (S.energia <= 0) abbatti();
    }
  }

  // automi
  if (S.automiOn && !arenaFerma()) {
    const r = colpiAutomi() * (protoAttivo() ? 1.5 : 1);
    if (r > 0) {
      if (r <= 12) {
        W.accAut += r * dt;
        while (W.accAut >= 1 && vivi().length) { W.accAut -= 1; colpoAutoma(1); }
      } else {
        W.accRaffica += 12 * dt;
        while (W.accRaffica >= 1 && vivi().length) { W.accRaffica -= 1; colpoAutoma(r / 12); }
      }
    }
  }
  // numeri accumulati degli automi (4 volte al secondo)
  if (t - (W.numAutT || 0) > 250) {
    W.numAutT = t;
    W.nemici.forEach((n, i) => {
      if (n._acc && W.pos[i]) { const p = W.pos[i]; Fx.numero(p.x + caso(-p.w * 0.3, p.w * 0.3), p.y - p.h * 0.2, fmt(n._acc), "auto"); }
      n._acc = 0;
    });
  }
  aggiornaVite();
}

function colpoAutoma(molt) {
  const v = vivi(); if (!v.length) return;
  const n = W.nemici[W.focus] && W.nemici[W.focus].hp > 0 && Math.random() < 0.5 ? W.nemici[W.focus] : scegli(v);
  const i = W.nemici.indexOf(n);
  const p = W.pos[i];
  if (p) Fx.laser(p.x, p.y);
  colpisci(i, false, molt);
}

// ============================================================ DOM DELL'ARENA
function costruisciOrda() {
  const orda = $("orda");
  if (!orda) return;
  const n = W.nemici.length;
  orda.className = "n" + n + (W.boss ? " conBoss" : "");
  orda.innerHTML = W.nemici.map((x, i) => `
    <div class="nemico${x.elite ? " elite" : ""}${x.boss ? " boss" : ""}${x.eco ? " eco" : ""}" data-i="${i}" style="--r:${(i * 0.37) % 1}">
      <div class="n-alone"></div>
      <div class="n-ico">${x.boss ? arteBoss(x.bossId) : x.i}</div>
      ${x.boss ? "" : `<div class="n-nome">${x.elite ? "⭐ " : ""}${esc(x.n)}</div><div class="n-vita"><i></i></div>`}
    </div>`).join("");
  W.el = Array.from(orda.children);
  W.el.forEach(e => e.classList.add("entra"));
  requestAnimationFrame(misuraPosizioni);
  aggiornaTestaArena();
  $("bossBarra").classList.toggle("on", W.boss);
  if (W.boss) {
    const b = bossDi(S.stanza);
    $("bbNome").textContent = W.nemici[0].n;
    $("bbNome").style.color = b.col;
  }
}

function misuraPosizioni() {
  const palco = $("palco"); if (!palco || !W.el) return;
  const r = palco.getBoundingClientRect();
  W.pos = W.el.map(e => {
    const q = (e.querySelector(".n-ico") || e).getBoundingClientRect();
    return { x: q.left - r.left + q.width / 2, y: q.top - r.top + q.height / 2, w: q.width, h: q.height };
  });
}

function aggiornaVite() {
  if (!W.el) return;
  for (let i = 0; i < W.nemici.length; i++) {
    const n = W.nemici[i];
    const p = Math.max(0, n.hp / n.max);
    if (n._p === p) continue;
    n._p = p;
    if (n.boss) {
      $("bbVita").style.width = (p * 100).toFixed(2) + "%";
      $("bbVitaTxt").textContent = fmt(Math.max(0, n.hp)) + " / " + fmt(n.max);
    } else {
      const b = W.el[i] && W.el[i].querySelector(".n-vita i");
      if (b) b.style.width = (p * 100).toFixed(1) + "%";
    }
  }
  if (W.boss) {
    const t = Date.now();
    const tot = tempoBoss() * 1000;
    const resta = W.bossFine ? Math.max(0, W.bossFine - t) : tot;
    $("bbTempo").style.width = (resta / tot * 100).toFixed(1) + "%";
    $("bbTempoTxt").textContent = (resta / 1000).toFixed(1) + "s";
    $("bossBarra").classList.toggle("urgente", resta < 8000 && !!W.bossFine);
  }
}

function aggiornaTestaArena() {
  const s = S.stanza, atto = attoDi(s);
  const rom = ["", "I", "II", "III", "IV", "V", "∞"][atto.n];
  $("attoNum").textContent = "ATTO " + rom;
  $("attoNome").textContent = atto.nome;
  $("stanzaNum").textContent = s;
  const onde = $("onde");
  if (onde) {
    onde.innerHTML = W.boss ? '<i class="boss">💀</i>' :
      Array.from({ length: BIL.ondePerStanza }, (_, i) => `<i class="${i < S.onda ? "fatta" : (i === S.onda ? "ora" : "")}"></i>`).join("");
  }
  const tra = 10 - (s % 10);
  $("prossimoBoss").textContent = W.boss ? "BOSS!" : (tra === 10 ? "" : (tra === 1 ? "boss nella prossima stanza" : `boss tra ${tra} stanze`));
  const bA = $("bAuto");
  bA.classList.toggle("off", !S.autoAvanza);
  bA.innerHTML = S.autoAvanza ? "⏩ <span>AVANZA</span>" : "⏸️ <span>FERMO</span>";
  bA.title = S.autoAvanza ? "Avanza da solo alla stanza successiva (clicca per restare qui a farmare)" : "Resti in questa stanza a farmare (clicca per avanzare)";
  const r = $("bRiprova");
  r.hidden = !(S.bossRitirata && !W.boss);
  if (S.bossRitirata) r.innerHTML = `⚔️ <span>RIPROVA</span> ${esc(bossDi(S.bossRitirata).n)}`;
}

function mostraIntroBoss(b, s) {
  const p = $("introBoss");
  p.innerHTML = `
    <div class="ib-arte">${arteBoss(b.id)}</div>
    <div class="ib-testo">
      <div class="ib-sopra">${eEco(s) ? "ECO DEL LUOGOTENENTE" : "LUOGOTENENTE " + (Math.floor(s / 10))} · STANZA ${s}</div>
      <div class="ib-nome" style="color:${b.col}">${esc((eEco(s) ? "Eco · " : "") + b.n)}</div>
      <div class="ib-desc">${esc(b.d)}</div>
      <div class="ib-tempo">⏱️ ${tempoBoss()} secondi · 💥 ${fmt(colpoBoss(s))} a colpo</div>
    </div>`;
  p.classList.add("on");
}

function annuncioAtto(atto) {
  const el = $("annuncio");
  const rom = ["", "I", "II", "III", "IV", "V", "∞"][atto.n];
  el.innerHTML = `<div class="an-sopra">ATTO ${rom}</div><div class="an-nome" style="color:${atto.neon}">${esc(atto.nome)}</div><div class="an-sotto">${esc(atto.sotto)}</div>`;
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
}

function pugnoRobot() {
  const r = $("robotPalco");
  if (!r) return;
  r.classList.remove("pugno"); void r.offsetWidth; r.classList.add("pugno");
}

function scuoti(forza) {
  if (S.opz.qualita === "bassa") return;
  const p = $("palco");
  p.style.setProperty("--scossa", (forza * 2) + "px");
  p.classList.remove("scossa"); void p.offsetWidth; p.classList.add("scossa");
}

// Liberazione di Partenope dopo sinteticoMC
function finaleLiberazione() {
  if (!S.visto.liberata) {
    S.visto.liberata = true;
    Scena.eruzione(1.2);
    radio(STORIA.eventi.finale, { chi: "PARTENOPE", col: "#ff3df2" });
    radio(STORIA.eventi.finale2, { chi: "PARTENOPE", col: "#ff3df2" });
  }
  toast("🧜", "PARTENOPE È LIBERA!", "L'Eruzione è pronta nel Diario: ricomincia più forte quando vuoi.", { tipo: "oro", dur: 6000 });
}

function legaArena() {
  const palco = $("palco");
  palco.addEventListener("pointerdown", e => {
    if (e.button !== undefined && e.button > 0) return;
    const el = e.target.closest(".nemico");
    if (e.target.closest("button")) return;
    e.preventDefault();
    Suono.avvia();
    colpoManuale(el ? Number(el.dataset.i) : null);
  });
  $("bAuto").onclick = () => { S.autoAvanza = !S.autoAvanza; Suono.suona("clic"); aggiornaTestaArena(); };
  $("bRiprova").onclick = () => { Suono.suona("clic"); riprovaBoss(); };
  $("bRipara").onclick = () => ripara();
  $("bRitirata").onclick = () => ritirata(true);
  $("bbRitirata").onclick = () => { if (W.boss) ritirata(true); };
  $("bAutomi").onclick = () => { S.automiOn = !S.automiOn; sporca(); Suono.suona("clic"); aggiornaPiedeArena(true); };
  $("bProto").onclick = () => attivaProtocollo();
  window.addEventListener("resize", () => requestAnimationFrame(misuraPosizioni));
  new ResizeObserver(() => { misuraPosizioni(); Fx.ridimensiona(); }).observe(palco);
}

// Barre e bottoni sotto l'arena (aggiornati ~10 volte al secondo)
function aggiornaPiedeArena(forza) {
  const max = energiaMax();
  $("energiaFill").style.width = (limita(S.energia / max, 0, 1) * 100).toFixed(1) + "%";
  $("energiaTxt").textContent = fmt(Math.max(0, S.energia)) + " / " + fmt(max);
  const sovra = inSovra();
  const cal = sovra ? (S.sovraFino - Date.now()) / ((setAttivi().vesuvio >= 3 ? 15 : 10) * 1000) * 100 : S.calore;
  $("caloreFill").style.width = limita(cal, 0, 100).toFixed(1) + "%";
  $("caloreFill").parentNode.parentNode.classList.toggle("attivo", sovra);
  $("caloreTxt").textContent = sovra ? "SOVRA!" : Math.round(S.calore) + "%";
  $("sDanno").textContent = fmt(dannoColpo());
  $("sDps").textContent = fmt(dpsStimato(0));
  $("sCrit").textContent = perc(Math.min(0.95, probCrit()));
  const bA = $("bAutomi");
  const ca = colpiAutomi();
  bA.hidden = ca <= 0;
  bA.classList.toggle("off", !S.automiOn);
  bA.innerHTML = `🤖 <span>${S.automiOn ? fmt(ca) + "/s" : "SPENTI"}</span>`;
  const bP = $("bProto");
  const sb = protoSbloccato();
  bP.hidden = !sb;
  if (sb) {
    if (!S.visto.protoSbloccato) { S.visto.protoSbloccato = true; radio(STORIA.eventi.protocollo); }
    const t = Date.now();
    if (protoAttivo()) { bP.className = "attivo"; bP.innerHTML = `☄️ <span>${Math.ceil((S.protoFino - t) / 1000)}s</span>`; }
    else if (t < S.protoPronto) { bP.className = "ricarica"; bP.innerHTML = `☄️ <span>${Math.ceil((S.protoPronto - t) / 1000)}s</span>`; }
    else { bP.className = "pronto"; bP.innerHTML = `☄️ <span>PROTOCOLLO</span>`; }
  }
  $("bRipara").textContent = `🔧 Ripara subito (${costoRiparazione()} ⚙️)`;
}
