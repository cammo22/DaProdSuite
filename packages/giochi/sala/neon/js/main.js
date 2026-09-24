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
  // Le Lire DaProd: solo dentro la sala giochi della DaProd Suite la partita
  // si stacca in lire. Qui sul sito e nelle app daprod-lira.js non fa niente.
  if (window.DaProdLira) DaProdLira.init({
    gioco: "neon",
    ricarica: {
      // L.100 della suite = un minuto di produzione del quartiere (almeno 1.000 lire).
      detto: "L.100 della suite = un minuto di produzione del quartiere",
      dai: (quante) => {
        const l = Math.max(1000, produzione() * 60) * ((quante || 100) / 100);
        S.lire += l; sporca();
        toast("₤", "Ricarica DaProd", "+" + fmtLire(l), { tipo: "oro" });
      },
    },
  });
  apriScheda("quartiere");
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
      <div class="mg-premi"><div><b>₤ ${fmt(assenza.lire)}</b><small>lire</small></div>${assenza.big ? `<div><b>🎟️ ${assenza.big}</b><small>biglietti</small></div>` : ""}</div>
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
  compraGen, compraBraccio, compraUp, compraAutoma, compraStat, compraLab, compraOggetto, equipaggia, apriPacco,
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
