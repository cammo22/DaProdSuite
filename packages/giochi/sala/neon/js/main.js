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
   * ⚠ «Finisci e riscatta» (2.1.5). Chiesto il 25 settembre 2026: «mettere un
   * pulsante per dire: quando vuoi finire il gioco premi qua e riscatta il
   * punteggio, come sulla Claw Machine». Chi smette prima porta a casa fino a
   * 15 euro, contando gli ordini di grandezza del ciclo e sotto il tetto di
   * quello che ha ricaricato; chi fa eruttare il Vesuvio prende da 20 a 30 euro
   * piu' i bonus. I numeri veri li fa la sala: qui c'e' la stima.
   */
  function stimaRiscatto() {
    const o = Math.log10(1 + Math.max(0, S.lireCiclo || 0));
    const prog = Math.max(0, Math.min(1, (o - 6) / 24));
    const st = window.DaProdLira && DaProdLira.stato && DaProdLira.stato();
    const messo = st && st.cassa ? st.cassa.messo || 0 : 0;
    const tetto = messo * 10 / 1936.27;
    return { prima: Math.min(15 * prog, tetto), tetto, fine: 20 + 10 * prog };
  }
  const euro = (e) => "€ " + e.toFixed(2).replace(".", ",");
  function chiediRiscatto() {
    const st = stimaRiscatto();
    apriModale("🏁 Finisci e riscatta",
      `<p>Le lire di questo ciclo: <b class="oro">${fmtLire(S.lireCiclo || 0)}</b>.</p>
       <p>Se smetti adesso, nel portafoglio DaProd arrivano circa <b class="oro">${euro(st.prima)}</b>
       <small>(fino a 15 € col punteggio, e al massimo 10 volte quello che hai ricaricato: ${euro(st.tetto)})</small>.</p>
       <p>Se fai eruttare il Vesuvio vinci da <b>€ 20</b> a <b>€ 30</b> — col tuo punteggio <b class="oro">${euro(st.fine)}</b> — più il premio della velocità e un pezzo del montepremi.</p>
       <p>Poi la partita ricomincia da capo, da zero: nella sala DaProd ogni partita e' una partita.</p>
       <div class="azioni-mod"><button class="btn oro" id="riscattaSi">🏁 Riscatta e ricomincia</button><button class="btn" id="riscattaNo">Continuo a giocare</button></div>`);
    $("riscattaNo").onclick = () => chiudiModale();
    $("riscattaSi").onclick = () => {
      $("riscattaSi").disabled = true;
      DaProdLira.incassa({ fine: false, grezzo: S.lireCiclo || 0, chiudi: true })
        .then(() => chiudiModale())
        .catch((e) => { $("riscattaSi").disabled = false; toast("⚠️", "Non riscattato", (e && e.message) || "riprova", { tipo: "rosso" }); });
    };
  }
  if (window.DaProdLira && DaProdLira.modo === "suite") {
    $("bRiscatta").hidden = false;
    $("bRiscatta").onclick = chiediRiscatto;
  }
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
        toast("💰", r.finita ? "Partita finita!" : "Incassato", "+" + r.netto + " lire nel portafoglio DaProd · si ricomincia da capo", { tipo: "oro", dur: 5000 });
        setTimeout(() => { azzeraTutto(); location.reload(); }, 2500);
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
