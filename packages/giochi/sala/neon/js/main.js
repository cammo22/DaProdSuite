/**
 * NEON PARTENOPE — avvio e ciclo principale
 */
"use strict";

let ultimoFrame = 0, accLento = 0, accMedio = 0, accPannello = 0, nascostoDa = 0, inGioco = false;
let esitoCaricamento = "nuovo", assenza = null;

function avvio() {
  document.body.insertAdjacentHTML("afterbegin", SVG_DEFS);
  esitoCaricamento = carica();
  sporca();
  S.energia = Math.min(S.energia || energiaMax(), energiaMax());
  if (S.energia <= 0) S.energia = energiaMax() * 0.5;

  legaInterfaccia();
  legaArena();
  Scena.init($("scena"));
  Fx.init();
  Borsa.carica();
  Borsa.initHud();
  applicaOpzioni();
  const atto = attoDi(S.stanza);
  Scena.atto(atto); Suono.atto(atto.n);
  document.documentElement.style.setProperty("--neon", atto.neon);
  document.documentElement.style.setProperty("--neon2", atto.neon2);
  aggiornaRobot();
  controllaCommissioni();
  riempiVetrina(false);
  if (esitoCaricamento === "carica") assenza = guadagniAssenza();

  document.querySelectorAll(".versione").forEach(e => e.textContent = VERSIONE);
  preparaIntro();
  nuovaOnda();
  // Le Lire DaProd: solo dentro la sala giochi della DaProd Suite. Dalla 2.1.4
  // una lira e' una lira (la ricarica arriva uguale) e la partita finisce
  // all'eruzione: si incassa e si ricomincia (vedi erutta in economia.js).
  // Qui sul sito e nelle app daprod-lira.js non fa niente.
  /*
   * ⚠ «Incassa e ricomincia» (2.1.6, era «Finisci e riscatta» nella 2.1.5).
   *
   * Chiesto il 26 settembre 2026, dopo i trentamila euro spariti a fine
   * partita: «facciamo che il pulsante incassa resetta bene il gioco; quando
   * premuto avvisa di tutto». Il premio non e' piu' fisso: la sala fa il conto
   * (quello che hai messo per la resa, che cresce coi progressi, piu' la paga
   * di chi gioca) e lo dice tutto prima di incassare, in un foglio suo. Qui il
   * tasto porta la cifra dal vivo (`suStima`), e dopo il si' il gioco riparte
   * da capo.
   */
  let stimaViva = null;
  const soldiDP = (l) => window.DaProdLira && DaProdLira.soldi ? DaProdLira.soldi(l) : fmtLire(l);
  function chiediRiscatto() {
    $("bRiscatta").disabled = true;
    DaProdLira.incassa({ fine: false, grezzo: S.lireCiclo || 0, chiudi: true })
      .catch((e) => { if (e && e.message !== "Annullato") toast("⚠️", "Non incassato", (e && e.message) || "riprova", { tipo: "rosso" }); })
      .then(() => { $("bRiscatta").disabled = false; });
  }
  function disegnaRiscatto() {
    const b = $("bRiscatta"); if (!b || b.hidden) return;
    const s = stimaViva;
    b.textContent = s && s.netto > 0 ? "🏁 " + soldiDP(s.netto) : "🏁";
    b.classList.toggle("con-cifra", !!(s && s.netto > 0));
    b.title = s ? "Incassa e ricomincia: " + soldiDP(s.netto) + (s.finendo != null ? " · a far eruttare il Vesuvio " + soldiDP(s.finendo) : "") : "Incassa e ricomincia";
  }

  /*
   * ⚠ I potenziamenti DaProd coi soldi veri (2.1.6). «I giocatori devono
   * spendere soldi reali per i potenziamenti dei giochi; ogni volta che usa
   * soldi reali si deve avvisare, e poi puo' fare piu' punti possibili.»
   * Cinque buff forti a tempo, pagati dal portafoglio della suite: la sala
   * avvisa ogni volta, e solo col si' si accendono. Contano come messi nella
   * partita. Si vedono ai lati col conto alla rovescia, e lampeggiano negli
   * ultimi dieci secondi.
   */
  const LIRE_EURO = 1936.27;
  const DP = [
    { id: "pugno",  ico: "💥", nome: "PUGNO DaProd",   desc: "danno ×10",                     min: 5,  euro: 1,  buff: { dpDan: 10 } },
    { id: "occhio", ico: "🎯", nome: "OCCHIO DaProd",  desc: "+50% di critico",               min: 5,  euro: 1,  buff: { dpCrit: 0.5 } },
    { id: "quart",  ico: "🏙️", nome: "QUARTIERE ×10", desc: "produzione ×10",                min: 10, euro: 2,  buff: { dpProd: 10 } },
    { id: "lire",   ico: "💰", nome: "LIRE ×10",       desc: "ogni lira guadagnata vale dieci", min: 10, euro: 5,  buff: { dpLire: 10 } },
    { id: "super",  ico: "🌋", nome: "SUPER DaProd",   desc: "danno, produzione e lire ×25",  min: 10, euro: 20, buff: { dpDan: 25, dpProd: 25, dpLire: 25 } },
  ];
  function accendiDP(id) {
    const x = DP.find((d) => d.id === id); if (!x) return false;
    const ora = Date.now();
    for (const k in x.buff) {
      const prima = S.buff[k], resta = prima && prima.fino > ora ? prima.fino - ora : 0;
      const val = Math.max(x.buff[k], prima && prima.fino > ora ? prima.val : 0);
      S.buff[k] = { val, fino: ora + resta + x.min * 60000, nome: x.nome, d: resta / 1000 + x.min * 60, ico: x.ico };
    }
    sporca(); salva();
    Suono.suona("trofeo");
    Fx.lampo("rgba(255,210,80,.55)");
    toast(x.ico, x.nome, x.desc + " per " + x.min + " minuti", { tipo: "oro", dur: 4000, effetto: true });
    disegnaDP(); richiediRender();
    return true;
  }
  function compraDP(id) {
    const x = DP.find((d) => d.id === id);
    if (!x || !(window.DaProdLira && DaProdLira.modo === "suite")) return false;
    DaProdLira.paga(Math.round(x.euro * LIRE_EURO), x.nome + " (" + x.min + " min)").then(() => accendiDP(id))
      .catch((e) => { if (e && e.message !== "Annullato") toast("💶", "Non pagato", e.message, { tipo: "rosso" }); });
    return true;
  }
  const mmss = (sec) => { const t = Math.max(0, Math.ceil(sec)); return t >= 60 ? Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0") : t + " s"; };
  function htmlDP(inScheda) {
    const ora = Date.now(), s = stimaViva;
    return `<p class="dp-spiega">Si pagano coi <b>soldi veri</b> del tuo portafoglio DaProd: ogni volta la sala ti chiede conferma.
      Contano come messi nella partita, e più vai avanti più rendono quando incassi.</p>` +
      (s ? `<div class="dp-conti"><div><small>SE INCASSI ADESSO</small><b class="${s.messo > 0 ? (s.netto >= s.messo ? "su" : "giu") : ""}">${soldiDP(s.netto)}</b></div>` +
        `<div><small>A FAR ERUTTARE IL VESUVIO</small><b>${s.finendo != null ? soldiDP(s.finendo) : "—"}</b></div></div>` : "") +
      DP.map((x) => {
        const k = Object.keys(x.buff)[0], b = S.buff[k], acceso = b && b.fino > ora && b.nome === x.nome;
        return `<div class="dp-riga${acceso ? " acceso" : ""}"><span class="i">${x.ico}</span><span><b>${x.nome} · ${x.min} MIN</b>` +
          `<small>${x.desc}${acceso ? " · ancora " + mmss((b.fino - ora) / 1000) : ""}</small></span>` +
          `<button class="btn oro" ${inScheda ? `data-azione="dp" data-id="${x.id}"` : `data-dp="${x.id}"`}>💶 ${soldiDP(Math.round(x.euro * LIRE_EURO))}</button></div>`;
      }).join("");
  }
  let dpAperto = false;
  function apriDP() {
    dpAperto = true;
    apriModale("⚡ Potenziamenti DaProd", `<div id="dpLista">${htmlDP()}</div>`, () => { dpAperto = false; });
    $("dpLista").addEventListener("click", (e) => { const b = e.target.closest("[data-dp]"); if (b) compraDP(b.dataset.dp); });
  }
  /*
   * ⚠ 2.2.0: le pastiglie nascono una volta e poi cambiano solo numero e
   * barretta. Prima si riscrivevano da capo quattro volte al secondo, e ogni
   * volta si ridisegnava tutto il pannello (sporca): lampeggi che rallentano.
   */
  const pastiglieDP = {};
  function disegnaDP() {
    const ora = Date.now();
    let n = 0, finisce = false;
    for (const k of ["dpDan", "dpCrit", "dpProd", "dpLire"]) {
      const b = S.buff[k];
      let d = pastiglieDP[k];
      if (!b || b.fino <= ora) { if (d && d.parentNode) d.remove(); continue; }
      const resta = (b.fino - ora) / 1000, fin = resta <= 10;
      n++; finisce = finisce || fin;
      if (!d) { d = pastiglieDP[k] = document.createElement("div"); d.innerHTML = "<i></i><b></b><small></small><u></u>"; }
      if (d.parentNode !== $("dpEffetti")) $("dpEffetti").appendChild(d);
      const classe = "dp-eff" + (fin ? " finisce" : "");
      if (d.className !== classe) d.className = classe;
      const nome = { dpDan: "DANNO ×" + b.val, dpCrit: "CRITICO +" + Math.round(b.val * 100) + "%", dpProd: "PRODUZIONE ×" + b.val, dpLire: "LIRE ×" + b.val }[k];
      const v = [b.ico || "⚡", mmss(resta), nome];
      for (let i = 0; i < 3; i++) if (d.children[i].textContent !== v[i]) d.children[i].textContent = v[i];
      const p = Math.round(Math.max(0, Math.min(1, resta / Math.max(1, b.d || 60))) * 50) * 2 + "%";
      if (d.style.getPropertyValue("--p") !== p) d.style.setProperty("--p", p);
    }
    const bordo = $("dpBordo");
    if (bordo.classList.contains("su") !== n > 0) bordo.classList.toggle("su", n > 0);
    if (bordo.classList.contains("finisce") !== (n > 0 && finisce)) bordo.classList.toggle("finisce", n > 0 && finisce);
    if (dpAperto && $("dpLista")) { const l = $("dpLista"); const nuovo = htmlDP(); if (l._h !== nuovo) { l._h = nuovo; l.innerHTML = nuovo; } }
  }
  setInterval(disegnaDP, 250);
  const htmlScheda = () => titolo("⚡", "Potenziamenti DaProd", "Forti e a tempo, coi soldi veri del portafoglio. All'incasso si azzerano: la partita dopo si ricomprano.") +
    `<div class="dp-scheda">${htmlDP(true)}</div>`;
  window.NP_DP = { DP, accendiDP, compraDP, disegnaDP, htmlScheda };

  if (window.DaProdLira && DaProdLira.modo === "suite") {
    $("bRiscatta").hidden = false;
    $("bRiscatta").onclick = chiediRiscatto;
    $("bDaProd").hidden = false;
    $("bDaProd").onclick = apriDP;
  }
  if (window.DaProdLira && DaProdLira.suStima) DaProdLira.suStima((st) => { stimaViva = st; disegnaRiscatto(); });
  if (window.DaProdLira) DaProdLira.init({
    gioco: "neon",
    ricarica: {
      detto: "una lira della suite e' una lira",
      cambio: 1,
      dai: (quante) => {
        const l = Math.max(0, Math.round(quante || 0));
        S.lire += l; sporca();
        toast("₤", "Ricarica DaProd", "+" + fmtLire(l), { tipo: "oro" });
      },
    },
    cassa: {
      // Le lire fatte in questo ciclo: la suite le conta a ordini di grandezza.
      quanto: () => S.lireCiclo,
      finita: () => false,
      chiudi: true,
      togli: (r) => {
        toast("💰", r.inControllo ? "Incasso in controllo" : r.finita ? "Partita finita!" : "Incassato",
          r.inControllo ? "È grosso: lo guarda un admin, poi arriva nel portafoglio · si ricomincia da capo"
            : "+" + soldiDP(r.netto) + " nel portafoglio DaProd · si ricomincia da capo", { tipo: "oro", dur: 5000 });
        // 2.2.0: «i record rimangono». Si riparte da capo, ma trofei, statistiche e opzioni restano.
        setTimeout(() => {
          const tieni = { trofei: S.trofei, stats: S.stats, opz: S.opz, kills: S.kills, bossVinti: S.bossVinti };
          azzeraTutto();
          Object.assign(S, tieni);
          salva();
          location.reload();
        }, 2500);
      },
    },
  });
  // 2.2.0: la valuta la sceglie la sala; quando cambia, il gioco ridisegna i suoi numeri.
  if (window.DaProdLira && DaProdLira.suValuta) DaProdLira.suValuta(() => { sporca(); aggiornaTesta(); richiediRender(); });
  apriScheda(window.DaProdLira && DaProdLira.modo === "suite" ? "daprod" : "quartiere");
  aggiornaTesta();
  aggiornaPiedeArena(true);

  setInterval(() => { if (inGioco) salva(); }, 10000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { nascostoDa = Date.now(); if (inGioco) { salva(); Borsa.salva(); } }
    else if (nascostoDa) {
      const sec = (Date.now() - nascostoDa) / 1000; nascostoDa = 0;
      if (sec > 2) {
        const q = sec <= 600 ? 1 : BIL.offlineBase * moltOffline();
        const l = produzione() * Math.min(sec, oreOffline() * 3600) * q;
        if (l > 0) { guadagna(l); if (sec > 30) toast("🌙", "Il quartiere ha lavorato per te", `+${fmtLire(l)} in ${fmtTempo(sec)}`); }
        tickLab(Math.min(sec, oreOffline() * 3600));
      }
      ultimoFrame = performance.now();
    }
  });
  window.addEventListener("pagehide", () => { if (inGioco) { salva(); Borsa.salva(); } });
  Aggiornamenti.avvia();
  ultimoFrame = performance.now();
  requestAnimationFrame(ciclo);
  window.NP.pronto = true;
}

function preparaIntro() {
  const nuovo = esitoCaricamento !== "carica";
  $("introGioca").innerHTML = nuovo ? "▶ INIZIA LA DISCESA" : `▶ CONTINUA · stanza ${S.stanza}`;
  const er = S.visto.eredita;
  if (er && !S.visto.ereditaVista) {
    $("introEredita").hidden = false;
    $("introEredita").innerHTML = `🌋 <b>Trovato un salvataggio di VESUVIO.EXE!</b><br>La tua vecchia partita (${fmtLire(er.lire)} guadagnate) diventa un'eredità: <b>${er.rottami} ⚙️</b>, <b>${er.biglietti} 🎟️</b>${er.braci ? ` e <b>${er.braci} 🔥 Braci</b> (+${perc(er.braci * BIL.braciPerc)} a tutto)` : ""}, più i colori del tuo robot.`;
  }
  if (esitoCaricamento === "rovinato") {
    $("introEredita").hidden = false;
    $("introEredita").textContent = "⚠️ Il salvataggio era rovinato: si riparte da zero.";
  }
  $("introGioca").onclick = entra;
  $("introNovita").onclick = () => { Suono.avvia(); mostraNovita(true); };
}

function entra() {
  Suono.avvia();
  Suono.suona("stanza");
  $("intro").classList.add("via");
  inGioco = true;
  const primaVolta = !S.visto.intro;
  if (primaVolta) {
    S.visto.intro = true; S.visto.atto1 = true;
    STORIA.intro.forEach(x => radio(x));
    radio(STORIA.atti[1]);
    setTimeout(() => annuncioAtto(attoDi(S.stanza)), 300);
  }
  if (S.visto.eredita) S.visto.ereditaVista = true;
  if (assenza && assenza.lire > 0) {
    apriModale("🌙 Bentornato, Ferro Vecchio", `
      <div class="bentornato"><p>Sei stato via <b>${fmtTempo(assenza.sec)}</b>. Il quartiere non si è fermato:</p>
      <div class="mg-premi"><div><b>${fmtLire(assenza.lire)}</b><small>${inEuro() ? "euro" : "lire"}</small></div>${assenza.big ? `<div><b>🎟️ ${assenza.big}</b><small>biglietti</small></div>` : ""}</div>
      <p class="nota">Si guadagna il ${perc(BIL.offlineBase * moltOffline())} della produzione, per un massimo di ${oreOffline()} ore. L'Officina (Assenza) alza entrambi.</p>
      <button class="btn oro grande" data-azione="chiudiModale">Jamme!</button></div>`);
  } else if (!primaVolta && S.versione && S.versione !== VERSIONE && NOVITA[VERSIONE]) {
    mostraNovita();
  }
  S.versione = VERSIONE;
  salva();
  setTimeout(() => { misuraPosizioni(); Fx.ridimensiona(); }, 50);
}

function ciclo(ora) {
  const dt = Math.min(1, Math.max(0, (ora - ultimoFrame) / 1000));
  ultimoFrame = ora;
  try {
    // il quartiere produce sempre
    const p = produzione();
    if (p > 0) guadagna(p * dt);
    tickLab(dt);
    if (inGioco) tickArena(dt);
    Scena.frame(ora);
    Fx.disegna(dt);

    accMedio += dt;
    if (accMedio >= 0.1) {
      accMedio = 0;
      aggiornaTesta();
      aggiornaPiedeArena();
      Borsa.aggiornaHud();
    }
    accPannello += dt;
    if (accPannello >= 0.5) { accPannello = 0; if (_renderPronto) renderScheda(); }
    accLento += dt;
    if (accLento >= 1) {
      accLento = 0;
      if (inGioco) { S.stats.tempo++; controllaTrofei(); tickGocce(); }
      Borsa.campiona();
    }
  } catch (e) {
    console.error(e);
  }
  requestAnimationFrame(ciclo);
}

// Aggancio per le prove automatiche (test/prove.mjs) e per chi vuole curiosare
window.NP = {
  get S() { return S; }, W, BIL, ATTI, BOSS, QUARTIERE, AUTOMI, STAT, OGGETTI, TROFEI, CIRCUITI,
  entra, nuovaOnda, colpoManuale, colpisci, tickArena, cambiaStanza, riprovaBoss, ritirata, attivaSovra, attivaProtocollo,
  compraGen, compraBraccio, compraUp, compraAutoma, compraStat, compraLab, compraOggetto, equipaggia, apriPacco, indossaSet, rottamaOggetto, livelloSet, numLire,
  erutta, puoEruttare, braciEruzione, produzione, dannoColpo, dannoBase, hpBoss, hpNemico, costoGen, energiaMax,
  salva, carica, esportaCodice, importaCodice, apriScheda, avviaMini, fermaMini, chiudiModale, controllaTrofei,
  creaGoccia, raccogliGoccia, guadagniAssenza, sporca, VERSIONE, pronto: false
};

function avvioSicuro() {
  try { avvio(); }
  catch (e) {
    console.error(e);
    const d = document.createElement("div");
    d.id = "erroreGioco";
    d.textContent = "Ops, qualcosa si è rotto all'avvio: " + e.message;
    document.body.appendChild(d);
  }
}
// gli script arrivano dal caricatore di index.html: il DOM potrebbe essere già pronto
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvioSicuro);
else avvioSicuro();
