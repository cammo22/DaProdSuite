/**
 * La suite vista da fuori — e, dalla 0.7.0, anche da dentro.
 *
 * **Una pagina sola per tre posti.** La aprono:
 *
 * - **DaProdConnessione**, la scheda della suite sul PC, in una finestra;
 * - il **browser di un portatile**, che la suite non la farebbe girare ma non
 *   gli serve: gli serve comandare il PC fisso;
 * - l'**app del telefono**, in una WebView, con il token preso col QR.
 *
 * Non è pigrizia: è la cura di un difetto vero. Prima la stessa roba stava in
 * due posti — il pannello «Da fuori» in fondo all'hub e questa pagina — e i due
 * non dicevano mai la stessa cosa: uno sapeva del firewall e l'altro no, uno si
 * aggiornava da solo e l'altro andava riaperto. Una verità sola non si ottiene
 * scrivendone una terza: si ottiene togliendone una.
 *
 * ## Come è fatta, e perché così
 *
 * **A quadrati.** Chiesto così: «voglio grafiche a quadrati facili da usare e
 * schermate varie intuitive per telefono». Cinque schermate, una barra in
 * fondo, e in cima alla prima un quadrone che dice **se tutto funziona** —
 * verde o rosso, con scritto cosa manca e il tasto per rimediare.
 *
 * **Le parole sono quelle di chi la usa.** Niente «padrone» e niente «ospite»:
 * si dice cosa uno **può fare**, non cosa **è**. Niente «Da fuori», che non
 * voleva dire niente. Niente «Come siamo messi»: si chiama «Stato della
 * connessione», perché è quello.
 *
 * **Dal vivo.** Il gateway spinge lo stato su una connessione aperta (SSE) a
 * ogni cambiamento, e a ogni spinta la pagina rilegge quel poco che le serve.
 * Niente tasto «aggiorna» da nessuna parte.
 *
 * ## Regole di questo file
 *
 * - **si serve da sé**: niente CDN, niente font esterni, niente immagini. Una
 *   pagina che chiama fuori è una pagina che non funziona quando la linea è
 *   giù, cioè quando serve di più.
 * - **le azioni non sono scritte qui**: si chiedono a `/azioni` e i moduli si
 *   disegnano da soli. Aggiungere un'azione al catalogo la fa comparire qui.
 * - **niente template literal, e niente backtick, nel JavaScript qui dentro.**
 *   Sembra un capriccio e non lo è: questo file *è* un template literal, e ogni
 *   backtick dentro lo chiuderebbe. Le stringhe si concatenano con `+`, e in
 *   cambio il file non si rompe per un accento.
 */

export function paginaConsole(): string {
  return PAGINA;
}

const PAGINA = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08090d">
<title>DaProd Suite</title>
<style>
  /* I colori sono quelli della suite sul PC: chi apre questa pagina dal
     telefono deve riconoscere lo stesso programma, non un cugino povero. */
  :root {
    --bg: #08090d;
    --panel: #111319;
    --panel2: #161922;
    --line: #22262f;
    --line2: #2e3340;
    --txt: #eceef4;
    --dim: #868c9e;
    --fioco: #5d6779;
    --accent: #8b5cf6;
    --accent2: #22d3ee;
    --ok: #34d399;
    --attesa: #fbbf24;
    --err: #f87171;
    --raggio: 18px;
    --fondo-alto: 64px;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--txt);
    background:
      radial-gradient(1100px 560px at 85% -12%, #1d1348 0%, transparent 62%),
      radial-gradient(900px 520px at -5% 105%, #052b3d 0%, transparent 58%),
      var(--bg);
    background-attachment: fixed;
    font: 15px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif;
    padding-bottom: calc(var(--fondo-alto) + env(safe-area-inset-bottom));
  }

  /* ------------------------------------------------------------ testata */
  header {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top));
    background: #0a0c11ee; backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
  }
  .marchio { font-weight: 700; font-size: 16px; letter-spacing: .2px; }
  .marchio span { color: var(--accent); }
  .cresci { flex: 1; }
  .chi {
    font-size: 12.5px; color: var(--txt); background: var(--panel2);
    border: 1px solid var(--line2); border-radius: 99px; padding: 5px 12px; cursor: pointer;
  }

  /* -------------------------------------------------------------- pagine */
  main { max-width: 920px; margin: 0 auto; padding: 14px 14px 22px; }
  .pagina { display: none; }
  .pagina.on { display: block; }
  h2 { margin: 0 0 3px; font-size: 15px; }
  h3 {
    margin: 24px 0 10px; font-size: 12px; text-transform: uppercase;
    letter-spacing: .1em; color: var(--dim); font-weight: 650;
  }
  p.sotto { margin: 0 0 12px; color: var(--dim); font-size: 13px; }

  .scheda {
    background: linear-gradient(180deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: var(--raggio);
    padding: 16px; margin-bottom: 12px;
  }

  /* ------------------------------------------------------- il semaforo */
  /* Il quadrone in cima: la risposta alla sola domanda che conta, che è
     «funziona?». Verde o rosso, e se è rosso c'è scritto cosa fare. */
  .semaforo {
    border-radius: var(--raggio); padding: 18px 18px 16px; margin-bottom: 12px;
    border: 1px solid var(--line2); background: var(--panel);
    display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap;
  }
  .semaforo .faccia { font-size: 30px; line-height: 1; }
  .semaforo .dentro { flex: 1 1 200px; min-width: 0; }
  .semaforo b { display: block; font-size: 17px; margin-bottom: 3px; }
  .semaforo .perche { color: var(--dim); font-size: 13px; }
  .semaforo.bene { border-color: #34d39955; background: linear-gradient(180deg, #0f2019, var(--panel)); }
  .semaforo.male { border-color: #f8717166; background: linear-gradient(180deg, #231214, var(--panel)); }
  .semaforo.aspetta { border-color: #fbbf2455; background: linear-gradient(180deg, #221c0e, var(--panel)); }

  /* --------------------------------------------------------- i quadrati */
  .quadrati { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }
  .quadrato {
    text-align: left; padding: 14px; border-radius: 15px; min-height: 92px;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt);
    display: flex; flex-direction: column; gap: 4px; font: inherit; cursor: pointer;
  }
  .quadrato:hover { border-color: var(--accent); }
  .quadrato .segno { font-size: 21px; line-height: 1; }
  .quadrato .grande { font-size: 25px; font-weight: 700; line-height: 1.1; }
  .quadrato .nome { font-weight: 600; font-size: 14px; }
  .quadrato small { color: var(--fioco); font-size: 11.5px; line-height: 1.35; }
  .quadrato.spento { cursor: default; }
  .quadrato.spento:hover { border-color: var(--line2); }
  .quadrato.verde .grande, .quadrato.verde .segno { color: var(--ok); }
  .quadrato.giallo .grande, .quadrato.giallo .segno { color: var(--attesa); }
  .quadrato.rosso .grande, .quadrato.rosso .segno { color: var(--err); }

  /* ------------------------------------------------------------- moduli */
  label { display: block; margin: 13px 0 5px; font-size: 12.5px; color: var(--dim); }
  input, textarea, select {
    font: inherit; color: var(--txt); background: #0b0d13;
    border: 1px solid var(--line2); border-radius: 12px; padding: 12px; width: 100%;
  }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--accent); }
  textarea { min-height: 96px; resize: vertical; }

  button {
    font: inherit; font-weight: 600; cursor: pointer; border: 0; color: #fff;
    background: linear-gradient(180deg, #9b6cff, #7c3aed);
    border-radius: 12px; padding: 12px 18px;
  }
  button:active { transform: translateY(1px); }
  button:disabled { opacity: .45; cursor: default; }
  button.piano { background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); font-weight: 500; }
  button.mini {
    padding: 7px 12px; font-size: 12.5px; font-weight: 500;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); border-radius: 10px;
  }
  button.mini:hover { border-color: var(--accent); }
  button.mini.male:hover { border-color: var(--err); color: var(--err); }
  .fila { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 14px; }

  /* ------------------------------------------------------------- elenchi */
  ul.voci { list-style: none; margin: 0; padding: 0; }
  ul.voci li {
    border-top: 1px solid var(--line); padding: 13px 0;
    display: flex; gap: 11px; align-items: flex-start; flex-wrap: wrap;
  }
  ul.voci li:first-child { border-top: 0; }
  .cresce { flex: 1 1 200px; min-width: 0; }
  .titolo { font-weight: 600; overflow-wrap: anywhere; }
  .dettaglio { color: var(--dim); font-size: 12.5px; overflow-wrap: anywhere; margin-top: 2px; }
  .pillola {
    font-size: 11.5px; padding: 3px 10px; border-radius: 99px;
    border: 1px solid var(--line2); color: var(--dim); white-space: nowrap;
  }
  .pillola.pronta { color: var(--ok); border-color: #34d39955; }
  .pillola.attesa { color: var(--attesa); border-color: #fbbf2455; }
  .pillola.lavoro { color: var(--accent2); border-color: #22d3ee55; }
  .pillola.brutto { color: var(--err); border-color: #f8717155; }
  .vuoto { color: var(--fioco); font-size: 13px; padding: 14px 0; }
  .avviso { margin-top: 12px; font-size: 13px; min-height: 20px; }
  .avviso.male { color: var(--err); }
  .avviso.bene { color: var(--ok); }
  .nota { color: var(--fioco); font-size: 12px; margin-top: 12px; line-height: 1.5; }
  code {
    font: 12.5px ui-monospace, Consolas, monospace; background: #0b0d13;
    border: 1px solid var(--line); border-radius: 8px; padding: 2px 7px;
    overflow-wrap: anywhere; user-select: all;
  }

  /* ------------------------------------------------ il menu di una richiesta */
  /* Chiesto il 22 agosto 2026: sotto a una richiesta ferma non bastano «sì» e
     «no». Ci sono quattro cose che si vogliono fare, e stanno in colonna
     perché su un telefono quattro tasti in fila diventano quattro tasti
     sbagliati. */
  .menu {
    width: 100%; margin-top: 10px; padding: 10px;
    border: 1px solid var(--line2); border-radius: 14px; background: #0b0d13;
    display: flex; flex-direction: column; gap: 7px;
  }
  .menu button { text-align: left; }
  .menu textarea { min-height: 84px; }
  .menu .come-era {
    font-size: 12px; color: var(--fioco); border-left: 2px solid var(--line2);
    padding-left: 9px; overflow-wrap: anywhere;
  }

  /* ------------------------------------------------------------ galleria */
  .spilla {
    display: inline-block; font-size: 10.5px; padding: 2px 8px; border-radius: 99px;
    border: 1px solid var(--line2); color: var(--dim); margin-top: 6px;
  }
  .spilla.in-bacheca { color: var(--accent2); border-color: #22d3ee55; }
  .quadro .attrezzi { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }

  /* ----------------------------------------------------------- i regali */
  /* Un file che arriva da una persona non è una riga in un elenco: è un
     pacco. Chiesto così — «poi appare con una bella animazione tipo regalo» —
     e il pacco si apre una volta sola, quando arriva. */
  .pacco {
    position: fixed; inset: 0; z-index: 60; display: grid; place-items: center;
    background: #05060af2; backdrop-filter: blur(6px); padding: 22px;
    animation: entra .25s ease-out;
  }
  .pacco .dentro {
    max-width: 420px; width: 100%; text-align: center;
    background: linear-gradient(180deg, var(--panel), var(--panel2));
    border: 1px solid var(--line2); border-radius: 22px; padding: 26px 22px 20px;
  }
  .pacco .fiocco { font-size: 74px; line-height: 1; animation: scuoti 1.1s ease-in-out infinite; }
  .pacco.aperto .fiocco { animation: apri .5s ease-out forwards; }
  .pacco h2 { font-size: 19px; margin: 12px 0 4px; }
  .pacco .da { color: var(--dim); font-size: 13px; margin-bottom: 4px; }
  .pacco .messaggio { color: var(--txt); font-size: 13.5px; margin: 10px 0 0; }
  .pacco .anteprima { margin-top: 14px; }
  .pacco .anteprima img, .pacco .anteprima video { width: 100%; border-radius: 14px; display: block; }
  .pacco .fila { justify-content: center; }
  @keyframes entra { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scuoti {
    0%, 100% { transform: rotate(-6deg) scale(1); }
    50% { transform: rotate(6deg) scale(1.06); }
  }
  @keyframes apri {
    0% { transform: scale(1); }
    45% { transform: scale(1.35) rotate(8deg); }
    100% { transform: scale(1) rotate(0); }
  }

  /* Dove si lascia cadere un file: la riga di una persona collegata. */
  ul.voci li.cade { border-radius: 12px; outline: 2px dashed var(--accent); outline-offset: 3px; }
  .barra-invio { width: 100%; height: 5px; border-radius: 99px; background: var(--line2); margin-top: 9px; }
  .barra-invio i { display: block; height: 100%; border-radius: 99px; background: var(--accent); width: 0; }
  .filtri { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 12px; }
  .filtri button.on { border-color: var(--accent); color: var(--txt); background: #1b1533; }
  .quadri { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 11px; }
  .quadro { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: #0b0d13; }
  .quadro img, .quadro video { width: 100%; display: block; aspect-ratio: 16/10; object-fit: cover; background: #000; }
  .quadro audio { width: 100%; display: block; margin-top: 8px; }
  .quadro .sotto { padding: 9px 11px 11px; }
  .quadro .nome { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .quadro .riga { font-size: 11px; color: var(--fioco); margin-top: 3px; }

  /* --------------------------------------------------------- il QR */
  .qr { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
  .qr img { width: 190px; height: 190px; border-radius: 14px; background: #fff; padding: 8px; }
  .qr .codice { font-size: 32px; font-weight: 700; letter-spacing: .12em; user-select: all; }

  /* --------------------------------------------------------- barra in fondo */
  nav.fondo {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
    display: grid; grid-template-columns: repeat(5, 1fr);
    background: #0a0c11f2; backdrop-filter: blur(10px);
    border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom);
  }
  nav.fondo button {
    background: none; border: 0; border-radius: 0; color: var(--dim);
    font-size: 10.5px; font-weight: 500; padding: 9px 2px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
  }
  nav.fondo button .segno { font-size: 17px; line-height: 1; }
  nav.fondo button.on { color: var(--txt); }
  nav.fondo button.on .segno { color: var(--accent); }
  nav.fondo .bollo {
    position: absolute; transform: translate(16px, -5px);
    background: var(--accent); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 99px; padding: 0 5px; min-width: 16px; text-align: center;
  }
  @media (min-width: 760px) {
    nav.fondo { grid-template-columns: repeat(5, auto); justify-content: center; gap: 10px; }
    nav.fondo button { flex-direction: row; padding: 13px 18px; font-size: 13px; }
  }

  [hidden] { display: none !important; }
</style>
</head>
<body>

<header>
  <div class="marchio">DaProd<span>Suite</span></div>
  <div class="cresci"></div>
  <button class="chi" id="chi" hidden></button>
</header>

<main>

  <!-- ============================== ENTRARE ============================== -->
  <section class="pagina on" id="pag-entra">
    <div class="scheda">
      <h2>Collega questo dispositivo</h2>
      <p class="sotto">
        Sul computer apri <b>DaProdConnessione</b> e premi <b>Invita</b>: compare
        un codice di otto cifre. Scrivilo qui. Vale pochi minuti.
      </p>
      <label for="nome">Come ti chiami</label>
      <input id="nome" maxlength="40" autocomplete="off" placeholder="Cammo">
      <p class="nota" style="margin-top:6px">
        Questo nome compare accanto a tutto quello che chiedi. Serve a sapere chi
        ha chiesto cosa quando in fila ci sono tre lavori di tre persone.
      </p>
      <label for="codice">Codice di otto cifre</label>
      <input id="codice" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="12345678">
      <div class="fila"><button id="collega">Collega</button></div>
      <div class="avviso" id="avviso-entra"></div>
    </div>
  </section>

  <!-- =============================== CASA ================================ -->
  <section class="pagina" id="pag-casa">
    <div class="semaforo" id="semaforo">
      <span class="faccia" id="semaforo-faccia">&#9679;</span>
      <div class="dentro">
        <b id="semaforo-titolo">Guardo com'è messa…</b>
        <div class="perche" id="semaforo-perche"></div>
      </div>
      <button class="mini" id="semaforo-tasto" hidden></button>
    </div>

    <div class="quadrati" id="numeri"></div>

    <h3>Cosa vuoi fare</h3>
    <div class="quadrati" id="tessere"></div>

    <p class="nota" id="nota-versione"></p>
  </section>

  <!-- ============================== CHIEDI =============================== -->
  <section class="pagina" id="pag-chiedi">
    <div class="scheda">
      <h2>Chiedi qualcosa</h2>
      <p class="sotto">Lo fa il computer. Tu scrivi cosa vuoi e lui lo mette in lavorazione.</p>
      <div class="quadrati" id="elenco-azioni"></div>
      <form id="modulo" hidden onsubmit="return false"></form>
      <div class="fila" id="fila-manda" hidden>
        <button id="manda">Mandalo al computer</button>
        <button class="piano" id="annulla" type="button">Lascia stare</button>
      </div>
      <div class="avviso" id="avviso-azione"></div>
    </div>
  </section>

  <!-- ============================== LAVORI =============================== -->
  <section class="pagina" id="pag-lavori">
    <div class="scheda">
      <h2>I lavori</h2>
      <p class="sotto" id="sotto-lavori">Quello che è stato chiesto, dal più recente.</p>
      <div class="filtri" id="filtri-lavori"></div>
      <ul class="voci" id="coda"></ul>
    </div>
  </section>

  <!-- ============================= GALLERIA ============================== -->
  <section class="pagina" id="pag-galleria">
    <div class="scheda">
      <h2>Quello che hai fatto fare</h2>
      <p class="sotto" id="sotto-galleria">
        Le tue cose. Quelle degli altri si vedono solo se le mettono in bacheca.
      </p>
      <div class="filtri" id="filtri-dove"></div>
      <div class="filtri" id="filtri"></div>
      <div class="quadri" id="quadri"></div>
      <div class="vuoto" id="galleria-vuota" hidden>Ancora niente qui dentro.</div>
    </div>
  </section>

  <!-- ============================== PERSONE ============================== -->
  <!--
    La pagina delle persone, dalla 0.7.3. Prima si chiamava «Collegamento» e
    cominciava dai quadrati della rete: chi cercava «dove gestisco chi è
    collegato» non la apriva nemmeno. Adesso comincia da chi c'è — con cosa può
    fare, il tasto per disconnetterlo e il posto dove lasciargli cadere un file
    — e la roba della rete sta sotto, che è quanto conta una volta che funziona.
  -->
  <section class="pagina" id="pag-persone">
    <div class="scheda">
      <h2>Le persone collegate</h2>
      <p class="sotto" id="sotto-collegati">
        Trascina un file sul nome di una persona per mandarglielo — o usa il tasto.
      </p>
      <ul class="voci" id="dispositivi"></ul>
      <div class="avviso" id="avviso-invio"></div>
    </div>

    <div class="scheda" id="scheda-invita" hidden>
      <h2>Invita qualcuno</h2>
      <p class="sotto">Il codice dura pochi minuti. Chi lo usa entra con il suo nome.</p>
      <div class="fila">
        <button class="mini" id="invita-uno">Per una persona</button>
        <button class="mini" id="invita-tanti">Per dieci persone</button>
        <button class="mini" id="invita-decide">Per chi deve anche decidere</button>
      </div>
      <div class="qr" id="riquadro-qr" hidden>
        <img id="qr" alt="Codice da inquadrare">
        <div>
          <div class="codice" id="codice-invito">—</div>
          <div class="dettaglio" id="scade-invito"></div>
          <div class="dettaglio" style="margin-top:10px">
            Se il QR non va, sul telefono si scrivono <b>questi due</b>:
          </div>
          <div class="dettaglio" style="margin-top:4px">
            <code id="indirizzo-invito">—</code>
          </div>
        </div>
      </div>
      <div class="avviso" id="avviso-invito"></div>
    </div>

    <div class="scheda">
      <h2>Come sta la connessione</h2>
      <p class="sotto" id="sotto-collegamento">—</p>
      <div class="quadrati" id="quadrati-rete"></div>
    </div>

    <div class="scheda">
      <h2>Da dove si arriva</h2>
      <ul class="voci" id="indirizzi"></ul>
      <p class="nota">
        Sulla rete di casa il collegamento è in chiaro: va bene dentro casa. Con
        Tailscale o con la strada da Internet è cifrato.
      </p>
    </div>
  </section>

</main>

<nav class="fondo" id="fondo" hidden>
  <button data-pagina="casa" class="on"><span class="segno">&#9673;</span>Casa</button>
  <button data-pagina="chiedi"><span class="segno">&#10010;</span>Chiedi</button>
  <button data-pagina="lavori"><span class="segno">&#9776;</span>Lavori<span class="bollo" id="bollo" hidden></span></button>
  <button data-pagina="galleria"><span class="segno">&#9635;</span>Galleria</button>
  <button data-pagina="persone"><span class="segno">&#9787;</span>Persone</button>
</nav>

<script>
(() => {
  "use strict";

  var CHIAVE = "daprod.token";
  var CHIAVE_NOME = "daprod.nome";
  var $ = function (id) { return document.getElementById(id); };

  var token = localStorage.getItem(CHIAVE) || "";
  var ioNome = localStorage.getItem(CHIAVE_NOME) || "";
  /** L'id di questo dispositivo: serve a non offrire di cambiare permesso a sé stessi. */
  var ioId = "";
  var puoiDecidere = false;
  var azioni = [];
  var scelta = null;
  var flusso = null;
  var pagina = "casa";
  var filtro = "";
  var pannello = null;
  var suite = null;
  var richieste = [];
  var orologioInvito = null;
  /** Galleria: le proprie cose, oppure quelle che qualcuno ha messo in mostra. */
  var dove = "mie";
  /** Lavori: quelli che stanno lavorando, quelli finiti, o quelli messi via. */
  var filtroLavori = "vivi";
  /** I modi di generare messi da parte, come li tiene il computer. */
  var preset = [];
  /** Se c'è qualcuno a cui chiedere di scrivere. Null vuol dire: non lo so ancora. */
  var aiMotivo = "non lo so ancora";
  /** I regali arrivati, e quale pacco è aperto adesso. */
  var regali = [];
  var paccoAperto = null;

  /**
   * Il token e il nome possono arrivare dall'indirizzo.
   *
   * È così che aprono questa pagina l'app del telefono e DaProdConnessione:
   * si sono accoppiati loro, e passano quello che hanno ottenuto. Sta nel
   * **frammento** (dopo il #) di proposito: il frammento non viene mandato al
   * server, non finisce nei log e non finisce in un Referer. Letto una volta,
   * si cancella dall'indirizzo.
   */
  (function dallIndirizzo() {
    if (!location.hash) return;
    var pezzi = new URLSearchParams(location.hash.slice(1));
    var t = pezzi.get("t");
    var u = pezzi.get("u");
    if (t) { token = t; localStorage.setItem(CHIAVE, t); }
    if (u) { ioNome = u; localStorage.setItem(CHIAVE_NOME, u); }
    history.replaceState(null, "", location.pathname);
  })();

  /* ------------------------------------------------------------- chiamate */

  async function chiama(percorso, opzioni) {
    opzioni = opzioni || {};
    var testate = { "Content-Type": "application/json" };
    if (token) testate.Authorization = "Bearer " + token;

    var risposta = await fetch(percorso, {
      method: opzioni.method || "GET",
      body: opzioni.body,
      headers: testate,
    });
    var testo = await risposta.text();
    var corpo = null;
    try { corpo = testo ? JSON.parse(testo) : null; } catch (e) { corpo = null; }
    if (!risposta.ok) {
      // 401 vuol dire che il computer non ci riconosce più: il collegamento è
      // stato tolto, o la suite è stata reinstallata. Si riparte dall'invito.
      if (risposta.status === 401) scollega(true);
      throw new Error((corpo && corpo.errore) || ("Errore " + risposta.status));
    }
    return corpo;
  }

  /**
   * Pianta il biscotto di sessione.
   *
   * Serve a una cosa sola e non se ne può fare a meno: un tag img o video non
   * sa mettere l'header con la credenziale. Senza, la galleria dovrebbe
   * scaricare ogni file in memoria per mostrarlo — niente anteprime pigre,
   * niente barra di scorrimento su un video da cento MB.
   *
   * Il gateway lo accetta **solo in lettura** e lo marca SameSite=Strict.
   */
  async function piantaSessione() {
    try { await chiama("/sessione", { method: "POST", body: "{}" }); } catch (e) { /* si vedrà */ }
  }

  /* -------------------------------------------------------- accoppiamento */

  async function collega() {
    var codice = $("codice").value.trim();
    var nome = $("nome").value.trim();
    var avviso = $("avviso-entra");
    avviso.className = "avviso";
    if (!nome) {
      avviso.textContent = "Scrivi come ti chiami: è il nome che si vedrà accanto a quello che chiedi.";
      avviso.className = "avviso male";
      return;
    }
    if (!/^\\d{8}$/.test(codice)) {
      avviso.textContent = "Il codice è di otto cifre, senza spazi.";
      avviso.className = "avviso male";
      return;
    }
    $("collega").disabled = true;
    try {
      var esito = await chiama("/accoppiamento", {
        method: "POST",
        body: JSON.stringify({ codice: codice, nome: nome }),
      });
      token = esito.token;
      ioNome = nome;
      localStorage.setItem(CHIAVE, token);
      localStorage.setItem(CHIAVE_NOME, nome);
      await entra();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("collega").disabled = false;
    }
  }

  function scollega(automatico) {
    token = "";
    localStorage.removeItem(CHIAVE);
    if (flusso) { flusso.close(); flusso = null; }
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("pag-entra").classList.add("on");
    $("fondo").hidden = true;
    $("chi").hidden = true;
    $("nome").value = ioNome;
    if (automatico) {
      var avviso = $("avviso-entra");
      avviso.textContent = "Il computer non ci riconosce più: fatti dare un codice nuovo.";
      avviso.className = "avviso male";
    }
  }

  /* ---------------------------------------------------------- navigazione */

  function vaiA(quale) {
    pagina = quale;
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("pag-" + quale).classList.add("on");
    for (var b of document.querySelectorAll("nav.fondo button")) {
      b.classList.toggle("on", b.dataset.pagina === quale);
    }
    window.scrollTo({ top: 0 });
    if (quale === "galleria") leggiGalleria();
    // Chi apre LM Studio a suite gia' accesa deve ritrovare i tasti accesi
    // senza riaprire niente: si richiede quando si va dove servono.
    if (quale === "chiedi" || quale === "lavori") void guardaAi();
  }

  /** C'e' qualcuno a cui chiedere di scrivere? Vuoto vuol dire di si'. */
  async function guardaAi() {
    try {
      var ai = await chiama("/ai");
      aiMotivo = ai && ai.ok ? "" : (ai && ai.motivo) || "";
    } catch (e) { /* si riprova la prossima volta */ }
  }

  /* ------------------------------------------------------- il semaforo */

  /**
   * La risposta alla sola domanda che conta: **funziona?**
   *
   * Non un elenco di spie da interpretare: una frase, e se qualcosa non va il
   * tasto per rimediare accanto. L'ordine dei controlli è quello di quanto
   * fanno male: senza gateway non funziona niente, col firewall chiuso non
   * arriva nessuno, senza Tailscale né tunnel funziona solo in casa.
   */
  function disegnaSemaforo() {
    if (!pannello) return;
    var box = $("semaforo");
    var tasto = $("semaforo-tasto");
    tasto.hidden = true;
    box.className = "semaforo bene";
    $("semaforo-faccia").textContent = "\\u2713";

    var fuoriCasa = pannello.indirizzi.some(function (i) { return i.dove === "ovunque"; });
    /**
     * Il firewall conta **anche con Tailscale**, e per un pelo non me ne
     * accorgevo: una regola di Windows vale per la porta, non per la scheda di
     * rete da cui si arriva, quindi blocca allo stesso modo chi entra dalla
     * wifi e chi entra dalla rete virtuale. L'unico che lo scavalca è il
     * tunnel, perché quella connessione **esce** dal computer invece di
     * entrarci: quando è acceso, la porta chiusa non fa alcun danno.
     */
    var passaDalTunnel = pannello.tunnel.fase === "acceso";

    if (pannello.tunnel.fase === "scarico" || pannello.tunnel.fase === "accendo") {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "\\u22EF";
      $("semaforo-titolo").textContent = "Sto aprendo la strada da fuori";
      $("semaforo-perche").textContent =
        pannello.tunnel.fase === "scarico"
          ? "Scarico quello che serve, una volta sola" +
            (pannello.tunnel.quota ? " — " + Math.round(pannello.tunnel.quota * 100) + "%" : "") + "…"
          : "Ci vuole qualche secondo.";
      return;
    }

    if (pannello.firewall && !pannello.firewall.aperta && !pannello.firewall.incerto && !passaDalTunnel) {
      box.className = "semaforo male";
      $("semaforo-faccia").textContent = "\\u2715";
      $("semaforo-titolo").textContent = "Windows sta bloccando";
      $("semaforo-perche").textContent =
        "Il computer risponde, ma il firewall non lascia entrare nessuno dalla rete. " +
        "È il motivo per cui dal telefono sembra spento.";
      if (pannello.puoiDecidere) {
        tasto.hidden = false;
        tasto.textContent = "Sblocca";
        tasto.onclick = sbloccaLaPorta;
      }
      return;
    }

    if (pannello.tunnel.fase === "guasto") {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "!";
      $("semaforo-titolo").textContent = "In casa funziona, fuori no";
      $("semaforo-perche").textContent = pannello.tunnel.motivo || "La strada da fuori non si è aperta.";
      return;
    }

    /**
     * **Quello che conta è arrivarci da fuori.**
     *
     * Chiesto il 23 agosto 2026: «l'app connessione deve funzionare solo su
     * internet, non ci interessa su lan». Quindi la rete di casa non è più una
     * risposta: se da fuori non ci si arriva il semaforo non è verde, anche se
     * in salotto funziona tutto. Chi guarda questa pagina la guarda per sapere
     * se il telefono lo raggiunge **quando è in giro**.
     */
    if (!fuoriCasa) {
      box.className = "semaforo aspetta";
      $("semaforo-faccia").textContent = "!";
      $("semaforo-titolo").textContent = "Da fuori casa non ci si arriva";
      $("semaforo-perche").textContent =
        "Adesso questo computer risponde solo dalla rete di casa. Apri la strada da " +
        "Internet, oppure accendi Tailscale su tutti e due i dispositivi.";
      if (pannello.puoiDecidere) {
        tasto.hidden = false;
        tasto.textContent = "Apri la strada";
        tasto.onclick = cambiaTunnel;
      }
      return;
    }

    $("semaforo-titolo").textContent = "Tutto a posto, anche fuori casa";
    $("semaforo-perche").textContent = "Questo computer si raggiunge da qualunque rete.";
  }

  /** I quadrati con i numeri: quanti collegati, quanti lavori, com'è la strada. */
  function disegnaNumeri() {
    var dove = $("numeri");
    dove.innerHTML = "";
    if (!pannello || !suite) return;

    var inAttesa = richieste.filter(function (r) { return r.stato === "in-attesa"; }).length;
    var inLavoro = richieste.filter(function (r) {
      return r.stato === "accettata" || r.stato === "in-lavoro";
    }).length;
    var pronte = richieste.filter(function (r) { return r.stato === "pronta"; }).length;

    quadratoNumero(dove, pannello.dispositivi.length, "collegati", inAttesa ? "" : "verde", "persone");
    quadratoNumero(dove, inLavoro, inLavoro === 1 ? "in lavorazione" : "in lavorazione", inLavoro ? "giallo" : "", "lavori");
    quadratoNumero(dove, pronte, "pronti", pronte ? "verde" : "", "lavori");
    quadratoNumero(dove, inAttesa, "aspettano il sì", inAttesa ? "rosso" : "", "lavori");
  }

  function quadratoNumero(dove, numero, testo, colore, vai) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "quadrato " + (colore || "");
    var n = document.createElement("span");
    n.className = "grande";
    n.textContent = String(numero);
    var t = document.createElement("span");
    t.className = "nome";
    t.textContent = testo;
    b.append(n, t);
    b.addEventListener("click", function () { vaiA(vai); });
    dove.append(b);
  }

  /* ------------------------------------------------------------- le azioni */

  /**
   * Come si chiama una scheda della suite, e il suo segno.
   *
   * Sono caratteri del piano base e non emoji: un emoji fuori dal piano base
   * scritto con quattro cifre diventa un carattere sbagliato più una cifra —
   * ed è esattamente quello che compariva accanto a «Leggi un testo».
   */
  var SCHEDE = {
    foto: { nome: "DaProdFoto", segno: "\\u25C9", che: "un'immagine da una descrizione" },
    cinema: { nome: "DaProdCinema", segno: "\\u25B6", che: "una clip video, col suono" },
    musica: { nome: "DaProdMusica", segno: "\\u266B", che: "una canzone, anche cantata" },
    voce: { nome: "DaProdVoce", segno: "\\u275E", che: "un testo letto ad alta voce" },
    suite: { nome: "La suite", segno: "\\u25A6", che: "leggere e decidere" },
  };

  function disegnaTessere() {
    var dove = $("tessere");
    dove.innerHTML = "";
    for (var a of azioni.filter(function (x) { return x.coda; })) {
      var scheda = SCHEDE[a.app] || SCHEDE.suite;
      dove.append(quadratoAzione(a, scheda.segno, scheda.che));
    }
  }

  function disegnaAzioni() {
    var elenco = $("elenco-azioni");
    elenco.innerHTML = "";
    for (var a of azioni) {
      var scheda = SCHEDE[a.app] || SCHEDE.suite;
      elenco.append(
        quadratoAzione(a, scheda.segno, a.coda ? "lo fa la scheda video" : "risponde subito"),
      );
    }
  }

  function quadratoAzione(a, segno, sotto) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "quadrato";
    var s = document.createElement("span");
    s.className = "segno";
    s.textContent = segno;
    var n = document.createElement("span");
    n.className = "nome";
    n.textContent = a.titolo;
    var p = document.createElement("small");
    p.textContent = sotto;
    b.append(s, n, p);
    b.addEventListener("click", function () { vaiA("chiedi"); scegli(a); });
    return b;
  }

  /** Costruisce il modulo dai campi dichiarati: qui non si sa cosa siano. */
  function scegli(a) {
    scelta = a;
    var modulo = $("modulo");
    modulo.innerHTML = "";

    var spiega = document.createElement("p");
    spiega.className = "sotto";
    spiega.style.marginTop = "16px";
    spiega.textContent = a.descrizione;
    modulo.append(spiega);

    // I modi di generare messi da parte per questa scheda: si toccano e il
    // modulo si riempie. Stanno sul computer, quindi ci sono anche qui.
    modulo.append(rigaPreset(a));

    for (var campo of a.campi) {
      var etichetta = document.createElement("label");
      etichetta.htmlFor = "campo-" + campo.nome;
      etichetta.textContent = campo.etichetta + (campo.obbligatorio ? " *" : "");
      modulo.append(etichetta);

      var controllo;
      if (campo.tipo === "scelta") {
        controllo = document.createElement("select");
        if (!campo.obbligatorio) {
          var vuoto = document.createElement("option");
          vuoto.value = "";
          // Cosa vuol dire lasciarlo vuoto lo dice il campo: su un filtro
          // «tutte», sul modello «quello scelto sul computer».
          vuoto.textContent = campo.vuoto || "— tutte —";
          controllo.append(vuoto);
        }
        for (var opt of (campo.scelte || [])) {
          var o = document.createElement("option");
          o.value = opt;
          // Il nome per una persona se il catalogo ce l'ha: «anima2» non vuol
          // dire niente a chi lo legge una volta sola, «Anima v2» sì.
          o.textContent = (campo.etichette && campo.etichette[opt]) || opt;
          controllo.append(o);
        }
      } else if (campo.tipo === "numero") {
        controllo = document.createElement("input");
        controllo.type = "number";
        controllo.inputMode = "numeric";
        if (campo.min !== undefined) controllo.min = campo.min;
        if (campo.max !== undefined) controllo.max = campo.max;
        if (campo.predefinito !== undefined) controllo.value = campo.predefinito;
      } else if ((campo.maxLunghezza || 0) > 200) {
        controllo = document.createElement("textarea");
        if (campo.esempio) controllo.placeholder = campo.esempio;
      } else {
        controllo = document.createElement("input");
        controllo.type = "text";
        if (campo.esempio) controllo.placeholder = campo.esempio;
      }
      controllo.id = "campo-" + campo.nome;
      controllo.dataset.campo = campo.nome;
      if (campo.principale) controllo.dataset.principale = "1";
      modulo.append(controllo);

      // Il tasto dell'AI sta **sotto la casella che è la richiesta**, non in
      // cima alla pagina: è quello che riscrive, e si deve vedere cosa
      // riscrive. Solo per chi decide, perché accende il modello sulla stessa
      // scheda video che sta generando.
      if (campo.principale && puoiDecidere) modulo.append(rigaAi(a, controllo));

      if (campo.descrizione) {
        var nota = document.createElement("div");
        nota.className = "nota";
        nota.style.marginTop = "5px";
        nota.textContent = campo.descrizione;
        modulo.append(nota);
      }
    }

    // Salvare quello che si è appena scritto, per ritrovarlo domani.
    if (a.coda) modulo.append(rigaSalvaPreset(a));

    modulo.hidden = false;
    $("fila-manda").hidden = false;
    $("manda").textContent = a.coda ? "Mandalo al computer" : a.titolo;
    $("avviso-azione").textContent = "";
    $("avviso-azione").className = "avviso";
    modulo.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * La riga dei preset di una scheda.
   *
   * Vuota se non ce ne sono: un titolo «I tuoi soliti» sopra a niente è una
   * promessa non mantenuta.
   */
  function rigaPreset(a) {
    var box = document.createElement("div");
    var miei = preset.filter(function (x) { return x.app === a.app; });
    if (!a.app || !miei.length) return box;

    var titolo = document.createElement("label");
    titolo.textContent = "I tuoi soliti";
    box.append(titolo);

    var fila = document.createElement("div");
    fila.className = "filtri";
    for (var x of miei) {
      fila.append(bottonePreset(x));
    }
    box.append(fila);
    return box;
  }

  function bottonePreset(x) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = x.nome;
    b.title = x.testo;
    b.addEventListener("click", function (ev) {
      // Col tasto destro, o tenendo premuto, lo si toglie: un preset sbagliato
      // salvato per sempre è peggio di nessun preset.
      if (ev.shiftKey) { void togliPreset(x); return; }
      riempiCon(x);
    });
    b.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
      void togliPreset(x);
    });
    return b;
  }

  function riempiCon(x) {
    for (var c of $("modulo").querySelectorAll("[data-campo]")) {
      if (c.dataset.principale) { c.value = x.testo; continue; }
      var da = (x.campi || {})[c.dataset.campo];
      if (da !== undefined) c.value = da;
    }
  }

  async function togliPreset(x) {
    if (!confirm("Togliere «" + x.nome + "» dai tuoi soliti?")) return;
    try {
      await chiama("/preset/" + encodeURIComponent(x.id), { method: "DELETE" });
      await leggiPreset();
      if (scelta) scegli(scelta);
    } catch (e) { alert(e.message); }
  }

  /** Il tasto che fa riscrivere al modello quello che c'è nella casella. */
  function rigaAi(a, casella) {
    var fila = document.createElement("div");
    fila.className = "fila";
    fila.style.marginTop = "8px";

    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = "\u2728 Usa l'AI";
    var nota = document.createElement("small");
    nota.style.color = "var(--fioco)";
    // Se non c'e' nessuno a cui chiedere si dice **perche'**, invece di
    // lasciare un tasto che risponde male solo dopo che l'hai premuto.
    if (aiMotivo) {
      b.disabled = true;
      nota.textContent = aiMotivo;
    }

    b.addEventListener("click", async function () {
      var testo = casella.value.trim();
      if (!testo) { nota.textContent = "Scrivi prima qualcosa, anche due parole."; return; }
      b.disabled = true;
      var prima = b.textContent;
      b.textContent = "sto scrivendo…";
      nota.textContent = "";
      try {
        var esito = await chiama("/ai/migliora", {
          method: "POST",
          body: JSON.stringify({ testo: testo, app: a.app || "foto" }),
        });
        casella.value = esito.testo;
        nota.textContent = "riscritto: se non ti piace, rimettici mano";

        /**
         * Per un brano l'AI scrive **anche le parole**.
         *
         * Chiesto il 23 agosto 2026: «da telefono, quando fai un brano, l'AI
         * dovrebbe scrivere anche il testo». Finiscono nella loro casella, e
         * solo se è vuota: se ci avevi già scritto qualcosa resta la tua.
         */
        if (esito.parole) {
          var canta = document.querySelector('#modulo [data-campo="testo"]');
          if (canta && !canta.value.trim()) {
            canta.value = esito.parole;
            nota.textContent = "riscritto, e ti ha scritto anche il testo da cantare";
          }
        }
      } catch (e) {
        nota.textContent = e.message;
      } finally {
        b.disabled = false;
        b.textContent = prima;
      }
    });

    fila.append(b, nota);
    return fila;
  }

  /** «Salvalo fra i tuoi soliti»: un nome e via. */
  function rigaSalvaPreset(a) {
    var fila = document.createElement("div");
    fila.className = "fila";

    var nome = document.createElement("input");
    nome.type = "text";
    nome.maxLength = 40;
    nome.placeholder = "salvalo coi tuoi soliti, con che nome?";
    nome.style.flex = "1 1 200px";

    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = "salva";
    b.addEventListener("click", async function () {
      var comeSiChiama = nome.value.trim();
      if (!comeSiChiama) { nome.focus(); return; }
      var campi = {};
      var testo = "";
      for (var c of $("modulo").querySelectorAll("[data-campo]")) {
        if (c.dataset.principale) { testo = c.value.trim(); continue; }
        if (c.value.trim()) campi[c.dataset.campo] = c.value.trim();
      }
      if (!testo) { alert("Scrivi prima cosa vuoi: è quello che si salva."); return; }
      try {
        await chiama("/preset", {
          method: "POST",
          body: JSON.stringify({ app: a.app, nome: comeSiChiama, testo: testo, campi: campi }),
        });
        nome.value = "";
        await leggiPreset();
        if (scelta) scegli(scelta);
      } catch (e) { alert(e.message); }
    });

    fila.append(nome, b);
    return fila;
  }

  async function leggiPreset() {
    try {
      var risposta = await chiama("/preset");
      preset = (risposta && risposta.preset) || [];
    } catch (e) { preset = []; }
  }

  function chiudiModulo() {
    scelta = null;
    $("modulo").hidden = true;
    $("modulo").innerHTML = "";
    $("fila-manda").hidden = true;
  }

  async function manda() {
    if (!scelta) return;
    var valori = {};
    for (var c of $("modulo").querySelectorAll("[data-campo]")) {
      var v = c.value.trim();
      if (v) valori[c.dataset.campo] = v;
    }
    var avviso = $("avviso-azione");
    avviso.className = "avviso";
    $("manda").disabled = true;
    try {
      var esito = await chiama("/azioni/" + encodeURIComponent(scelta.id), {
        method: "POST",
        body: JSON.stringify(valori),
      });
      if (esito.esito === "in-coda") {
        chiudiModulo();
        await leggiCoda();
        vaiA("lavori");
      } else {
        mostraRisposta(esito.risultato);
      }
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("manda").disabled = false;
    }
  }

  function mostraRisposta(risultato) {
    var box = document.createElement("pre");
    box.style.cssText =
      "margin-top:16px;padding:12px;border:1px solid var(--line);border-radius:12px;" +
      "background:#0b0d13;font-size:12px;overflow:auto;max-height:340px;white-space:pre-wrap";
    box.textContent = typeof risultato === "string" ? risultato : JSON.stringify(risultato, null, 2);
    $("modulo").append(box);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------------------------------------------------------------- lavori */

  var NOMI_STATO = {
    "in-attesa": ["attesa", "aspetta il sì"],
    accettata: ["lavoro", "in partenza"],
    "in-lavoro": ["lavoro", "ci sta lavorando"],
    pronta: ["pronta", "pronto"],
    scartata: ["brutto", "non fatto"],
    scaduta: ["brutto", "scaduto"],
    archiviata: ["", "messo via"],
  };

  /**
   * Le tre pile in cui si guardano i lavori.
   *
   * Non è un filtro per pignoli: dopo una settimana di lavori la lista è lunga
   * cinquanta righe, e quello che serve sapere è sempre e solo «cosa sta
   * succedendo adesso». Il resto si va a cercare.
   */
  var PILE = [
    { id: "vivi", nome: "adesso", stati: ["in-attesa", "accettata", "in-lavoro"] },
    { id: "fatti", nome: "finiti", stati: ["pronta", "scartata", "scaduta"] },
    { id: "vecchi", nome: "messi via", stati: ["archiviata"] },
  ];

  function pila(id) {
    for (var p of PILE) if (p.id === id) return p;
    return PILE[0];
  }

  async function leggiCoda() {
    richieste = await chiama("/richieste");
    var elenco = $("coda");
    elenco.innerHTML = "";

    var attesa = 0;
    var quali = pila(filtroLavori).stati;
    var mostrate = 0;
    for (var r of richieste) {
      if (r.stato === "in-attesa") attesa += 1;
      if (quali.indexOf(r.stato) < 0) continue;
      mostrate += 1;
      elenco.append(rigaRichiesta(r));
    }
    if (!mostrate) {
      var vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent =
        filtroLavori === "vivi"
          ? "Niente in lavorazione. Quello che chiedi compare qui."
          : filtroLavori === "fatti"
            ? "Ancora niente di finito."
            : "Niente messo via.";
      elenco.append(vuoto);
    }
    disegnaFiltriLavori();

    $("bollo").hidden = attesa === 0;
    $("bollo").textContent = attesa;
    $("sotto-lavori").textContent = puoiDecidere
      ? "Quello che è stato chiesto. Quando dici di sì, il computer lo fa da solo."
      : "Quello che hai chiesto, dal più recente.";
    disegnaNumeri();
  }

  function disegnaFiltriLavori() {
    var dove2 = $("filtri-lavori");
    dove2.innerHTML = "";
    for (var p of PILE) {
      var quante = richieste.filter(function (r) { return p.stati.indexOf(r.stato) >= 0; }).length;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (p.id === filtroLavori ? " on" : "");
      b.textContent = p.nome + (quante ? " (" + quante + ")" : "");
      b.addEventListener("click", (function (quale) {
        return function () { filtroLavori = quale; leggiCoda().catch(function () {}); };
      })(p.id));
      dove2.append(b);
    }
  }

  function rigaRichiesta(r) {
    var li = document.createElement("li");

    var corpo = document.createElement("div");
    corpo.className = "cresce";
    var t = document.createElement("div");
    t.className = "titolo";
    t.textContent = r.testo;
    var d = document.createElement("div");
    d.className = "dettaglio";
    d.textContent = [nomeScheda(r.app), r.daNome, quando(r.quando), r.motivoScarto]
      .filter(Boolean).join(" · ");
    corpo.append(t, d);

    // Se qualcuno l'ha riscritta, com'era arrivata resta scritto: chi ha
    // chiesto una cosa e ne riceve un'altra deve poter vedere cos'è successo.
    if (r.testoOriginale) {
      var era = document.createElement("div");
      era.className = "come-era";
      era.style.marginTop = "6px";
      era.textContent =
        (r.riscrittaDa === "ai" ? "riscritta dal modello · " : "riscritta a mano · ") +
        "era: " + r.testoOriginale;
      corpo.append(era);
    }
    li.append(corpo);

    var stato = NOMI_STATO[r.stato] || ["", r.stato];
    var pillola = document.createElement("span");
    pillola.className = "pillola " + stato[0];
    pillola.textContent = stato[1];
    li.append(pillola);

    if (r.stato === "pronta" && r.risultato) {
      var giu = document.createElement("button");
      giu.className = "mini";
      giu.textContent = "tieni";
      giu.addEventListener("click", function () { scarica(r.risultato.nome); });
      li.append(giu);
    }

    // **Il menu**, chiesto il 22 agosto 2026. Un tasto solo che si apre in
    // quattro: falla, falla riscrivere, riscrivila tu, dille di no. Su un
    // telefono quattro tasti in fila sono quattro tasti sbagliati.
    if (puoiDecidere && r.stato === "in-attesa") {
      var menu = costruisciMenu(r);
      var apri = document.createElement("button");
      apri.className = "mini";
      apri.textContent = "che ne faccio?";
      apri.addEventListener("click", function () {
        menu.hidden = !menu.hidden;
        apri.textContent = menu.hidden ? "che ne faccio?" : "chiudi";
      });
      li.append(apri, menu);
    }

    // Finito vuol dire che si può mettere via. Chi decide può farlo con tutte,
    // ognuno con le sue: la lista lunga è di chi guarda.
    if (["pronta", "scartata", "scaduta"].indexOf(r.stato) >= 0) {
      var via = document.createElement("button");
      via.className = "mini";
      via.textContent = "metti via";
      via.addEventListener("click", function () { void togliRichiesta(r, "archivia"); });
      li.append(via);
    }
    // Buttare si puo' sempre, anche una che dice di star lavorando: se la suite
    // e' stata chiusa mentre generava, quella riga resta li' per sempre.
    {
      var butta = document.createElement("button");
      butta.className = "mini male";
      butta.textContent = "butta";
      butta.addEventListener("click", function () { void togliRichiesta(r, "cancella"); });
      li.append(butta);
    }
    return li;
  }

  /**
   * Il menu di una richiesta ferma.
   *
   * Le quattro voci, nell'ordine in cui si usano davvero: la prima è quella
   * che si preme nove volte su dieci.
   */
  function costruisciMenu(r) {
    var menu = document.createElement("div");
    menu.className = "menu";
    menu.hidden = true;

    var avviso = document.createElement("div");
    avviso.className = "nota";

    var subito = document.createElement("button");
    subito.className = "mini";
    subito.textContent = "\u25B6 fallo così com'è";
    subito.addEventListener("click", function () { void decidi(r.id, "accettata"); });

    var conAi = document.createElement("button");
    conAi.className = "mini";
    conAi.textContent = "\u2728 usa l'AI, poi fallo";
    if (aiMotivo) {
      conAi.disabled = true;
      conAi.title = aiMotivo;
    }
    conAi.addEventListener("click", async function () {
      conAi.disabled = true;
      var prima = conAi.textContent;
      conAi.textContent = "sto scrivendo…";
      avviso.textContent = "";
      try {
        await chiama("/richieste/" + encodeURIComponent(r.id) + "/migliora", {
          method: "POST",
          body: "{}",
        });
        await decidi(r.id, "accettata");
      } catch (e) {
        avviso.textContent = e.message;
        conAi.disabled = false;
        conAi.textContent = prima;
      }
    });

    // Scrivila tu: la casella compare qui sotto, già piena di quello che aveva
    // scritto chi ha chiesto.
    var aMano = document.createElement("button");
    aMano.className = "mini";
    aMano.textContent = "\u270E scrivila io";

    var casella = document.createElement("textarea");
    casella.hidden = true;
    casella.value = r.testo;

    var filaMano = document.createElement("div");
    filaMano.className = "fila";
    filaMano.hidden = true;
    filaMano.style.marginTop = "0";

    var mandaCosi = document.createElement("button");
    mandaCosi.className = "mini";
    mandaCosi.textContent = "manda così";
    mandaCosi.addEventListener("click", function () { void mandaRiscritta(r, casella, false, avviso); });

    var mandaConAi = document.createElement("button");
    mandaConAi.className = "mini";
    mandaConAi.textContent = "\u2728 usa l'AI e manda";
    mandaConAi.addEventListener("click", function () { void mandaRiscritta(r, casella, true, avviso); });

    filaMano.append(mandaCosi, mandaConAi);
    aMano.addEventListener("click", function () {
      casella.hidden = !casella.hidden;
      filaMano.hidden = casella.hidden;
      if (!casella.hidden) casella.focus();
    });

    // Il no, con la ragione: quella riga arriva sul telefono di chi aveva
    // chiesto, ed è l'unica cosa che gli dice perché.
    var perche = document.createElement("input");
    perche.type = "text";
    perche.maxLength = 200;
    perche.placeholder = "perché no (glielo scrivo)";

    var no = document.createElement("button");
    no.className = "mini male";
    no.textContent = "\u2715 no";
    no.addEventListener("click", function () {
      void decidi(r.id, "scartata", perche.value.trim());
    });

    menu.append(subito, conAi, aMano, casella, filaMano, perche, no, avviso);
    return menu;
  }

  /** Salva quello che è stato riscritto a mano, poi manda (con o senza AI). */
  async function mandaRiscritta(r, casella, conAi, avviso) {
    var testo = casella.value.trim();
    if (!testo) { avviso.textContent = "Il testo non può restare vuoto."; return; }
    avviso.textContent = "un attimo…";
    try {
      await chiama("/richieste/" + encodeURIComponent(r.id) + "/testo", {
        method: "POST",
        body: JSON.stringify({ testo: testo }),
      });
      if (conAi) {
        await chiama("/richieste/" + encodeURIComponent(r.id) + "/migliora", {
          method: "POST",
          body: "{}",
        });
      }
      await decidi(r.id, "accettata");
    } catch (e) {
      avviso.textContent = e.message;
    }
  }

  async function togliRichiesta(r, come) {
    if (come === "cancella" && !confirm("Buttare via questo lavoro dall'elenco?")) return;
    try {
      await chiama("/richieste/" + encodeURIComponent(r.id), {
        method: come === "cancella" ? "DELETE" : "PATCH",
      });
      await leggiCoda();
    } catch (e) { alert(e.message); }
  }

  function nomeScheda(app) {
    return (SCHEDE[app] || {}).nome || app;
  }

  async function decidi(id, stato, motivo) {
    try {
      await chiama("/richieste/" + encodeURIComponent(id) + "/stato", {
        method: "POST",
        body: JSON.stringify({ stato: stato, motivo: motivo || undefined }),
      });
      await leggiCoda();
    } catch (e) {
      alert(e.message);
    }
  }

  /**
   * Porta un file nel dispositivo.
   *
   * Dentro l'app Android lo tira giù **lei**: ha già la credenziale, e sa
   * mettere un video in galleria e un brano fra la musica invece che in una
   * cartella dell'app.
   */
  async function scarica(nome) {
    if (window.DaProdApp && window.DaProdApp.scaricaRisultato) {
      window.DaProdApp.scaricaRisultato(nome);
      return;
    }
    var risposta = await fetch("/risultati/" + encodeURIComponent(nome), {
      headers: { Authorization: "Bearer " + token },
    });
    if (!risposta.ok) { alert("Non riesco a scaricarlo."); return; }
    var blob = await risposta.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
  }

  /* ------------------------------------------------------------- galleria */

  var TIPI = [
    { id: "", nome: "tutto" },
    { id: "immagine", nome: "immagini" },
    { id: "video", nome: "video" },
    { id: "audio", nome: "brani" },
  ];

  /**
   * Le tue cose, o quelle che gli altri hanno messo in mostra.
   *
   * È la parte «social» chiesta il 22 agosto 2026, e sta tutta in questi due
   * tasti: ognuno vede le sue, e degli altri vede quello che gli altri hanno
   * **deciso** di far vedere. Vale anche per chi può decidere sulla fila: il
   * permesso è sui lavori, non sulle cose degli altri.
   */
  function disegnaFiltriDove() {
    var box = $("filtri-dove");
    box.innerHTML = "";
    var pezzi = [
      { id: "mie", nome: "le mie cose" },
      { id: "bacheca", nome: "in bacheca" },
      { id: "arrivati", nome: "arrivati per me" + (regali.length ? " (" + regali.length + ")" : "") },
    ];
    for (var x of pezzi) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (x.id === dove ? " on" : "");
      b.textContent = x.nome;
      b.addEventListener("click", (function (quale) {
        return function () { dove = quale; disegnaFiltriDove(); leggiGalleria(); };
      })(x.id));
      box.append(b);
    }
    $("sotto-galleria").textContent =
      dove === "mie"
        ? "Le tue cose. Mettine una in bacheca per farla vedere agli altri."
        : dove === "bacheca"
          ? "Quello che gli altri hanno messo in mostra, con scritto chi l'ha fatto."
          : "I file che ti ha mandato chi sta al computer.";
  }

  function disegnaFiltri() {
    var dove = $("filtri");
    dove.innerHTML = "";
    for (var t of TIPI) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (t.id === filtro ? " on" : "");
      b.textContent = t.nome;
      b.addEventListener("click", (function (quale) {
        return function () { filtro = quale; disegnaFiltri(); leggiGalleria(); };
      })(t.id));
      dove.append(b);
    }
  }

  async function leggiGalleria() {
    var casella = $("quadri");

    // Quello che ti hanno mandato sta **in galleria**, non in un angolo suo:
    // chiesto il 23 agosto 2026, ed è il posto dove uno lo va a cercare.
    if (dove === "arrivati") {
      await leggiRegali();
      casella.innerHTML = "";
      $("galleria-vuota").hidden = regali.length > 0;
      $("galleria-vuota").textContent = "Non ti ha ancora mandato niente nessuno.";
      for (var r of regali) casella.append(quadroRegalo(r));
      return;
    }

    try {
      var risposta = await chiama(
        "/libreria?quanti=48&dove=" + dove + (filtro ? "&tipo=" + filtro : ""),
      );
      var voci = (risposta && risposta.voci) || [];
      casella.innerHTML = "";
      $("galleria-vuota").hidden = voci.length > 0;
      $("galleria-vuota").textContent =
        dove === "bacheca"
          ? "In bacheca non c'è ancora niente."
          : "Ancora niente di tuo. Quello che chiedi finisce qui.";
      for (var v of voci) casella.append(quadro(v));
    } catch (e) {
      casella.innerHTML = "";
      $("galleria-vuota").hidden = false;
      $("galleria-vuota").textContent = e.message;
    }
  }

  function quadro(v) {
    var box = document.createElement("div");
    box.className = "quadro";
    var indirizzo = "/libreria/file/" + encodeURIComponent(v.id);

    if (v.tipo === "immagine") {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = indirizzo;
      img.alt = v.nome;
      box.append(img);
    } else if (v.tipo === "video") {
      var vid = document.createElement("video");
      vid.controls = true;
      vid.preload = "metadata";
      vid.playsInline = true;
      vid.src = indirizzo;
      box.append(vid);
    }

    var sotto = document.createElement("div");
    sotto.className = "sotto";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = v.nome;
    nome.title = v.nome;
    var riga = document.createElement("div");
    riga.className = "riga";
    riga.textContent = [nomeScheda(v.app), quando(v.creato), pesa(v.bytes)].filter(Boolean).join(" · ");
    sotto.append(nome, riga);

    if (v.tipo === "audio") {
      var au = document.createElement("audio");
      au.controls = true;
      au.preload = "none";
      au.src = indirizzo;
      sotto.append(au);
    }

    // Di chi è, e se è in mostra. Nella bacheca è la cosa che si guarda per
    // prima: «chi ha fatto quale immagine» era la domanda da cui è nato tutto.
    if (!v.mia && v.chiNome) {
      var chi = document.createElement("span");
      chi.className = "spilla";
      chi.textContent = "di " + v.chiNome;
      sotto.append(chi);
    } else if (v.mia && v.pubblicato) {
      var mostra = document.createElement("span");
      mostra.className = "spilla in-bacheca";
      mostra.textContent = "in bacheca";
      sotto.append(mostra);
    }

    var attrezzi = document.createElement("div");
    attrezzi.className = "attrezzi";

    if (window.DaProdApp && window.DaProdApp.scaricaLibreria) {
      var tieni = document.createElement("button");
      tieni.className = "mini";
      tieni.textContent = "tieni nel telefono";
      tieni.addEventListener("click", function () {
        window.DaProdApp.scaricaLibreria(v.id, v.nome);
      });
      attrezzi.append(tieni);
    }

    if (v.mia) {
      var pubblica = document.createElement("button");
      pubblica.className = "mini";
      pubblica.textContent = v.pubblicato ? "togli dalla bacheca" : "mettila in bacheca";
      pubblica.addEventListener("click", async function () {
        pubblica.disabled = true;
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id) + "/pubblica", {
            method: "POST",
            body: JSON.stringify({ pubblicato: !v.pubblicato }),
          });
          await leggiGalleria();
        } catch (e) { alert(e.message); pubblica.disabled = false; }
      });

      var butta = document.createElement("button");
      butta.className = "mini male";
      butta.textContent = "butta";
      butta.addEventListener("click", async function () {
        if (!confirm("Cancellare «" + v.nome + "» dal computer? Non si torna indietro.")) return;
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id), { method: "DELETE" });
          await leggiGalleria();
        } catch (e) { alert(e.message); }
      });

      attrezzi.append(pubblica, butta);
    }

    if (attrezzi.children.length) sotto.append(attrezzi);

    box.append(sotto);
    return box;
  }

  /* ---------------------------------------------------------- i regali */

  /**
   * La roba che ti ha mandato una persona.
   *
   * Chiesto il 22 agosto 2026: «dall'app connessione devo poter interagire e
   * mandare file agli utenti quando voglio trascinando il file all'interno, e
   * l'utente riceverà la notifica che ha ricevuto qualcosa, tipo poi appare con
   * una bella animazione tipo regalo».
   *
   * Quindi non è una riga in un elenco: la prima volta che arriva **si apre in
   * mezzo allo schermo**, e da lì in poi resta in un riquadro nella prima
   * pagina, che è dove uno lo va a cercare.
   */
  async function leggiRegali() {
    try {
      var risposta = await chiama("/invii");
      regali = (risposta && risposta.invii) || [];
    } catch (e) { return; }

    // Dove si guardano: **in galleria**, sotto «arrivati per me». Qui si
    // tiene solo il conto, e si apre il pacco di quello appena arrivato.
    if (pagina === "galleria" && dove === "arrivati") disegnaFiltriDove();

    // Il pacco si apre da solo una volta sola: quello arrivato e mai aperto.
    var nuovo = regali.filter(function (x) { return !x.aperto; })[0];
    if (nuovo && (!paccoAperto || paccoAperto !== nuovo.id)) mostraPacco(nuovo);
  }

  /** Il pacco in mezzo allo schermo, che si scuote finché non lo apri. */
  function mostraPacco(i) {
    if (document.querySelector(".pacco")) return;
    paccoAperto = i.id;

    var fuori = document.createElement("div");
    fuori.className = "pacco";
    var dentro = document.createElement("div");
    dentro.className = "dentro";

    var fiocco = document.createElement("div");
    fiocco.className = "fiocco";
    fiocco.textContent = "\uD83C\uDF81";

    var titolo = document.createElement("h2");
    titolo.textContent = i.aperto ? i.nome : "Hai ricevuto qualcosa";
    var da = document.createElement("div");
    da.className = "da";
    da.textContent = "da " + i.daNome + " · " + pesa(i.bytes);

    dentro.append(fiocco, titolo, da);

    if (i.messaggio) {
      var m = document.createElement("p");
      m.className = "messaggio";
      m.textContent = i.messaggio;
      dentro.append(m);
    }

    var anteprima = document.createElement("div");
    anteprima.className = "anteprima";
    dentro.append(anteprima);

    var fila = document.createElement("div");
    fila.className = "fila";

    var apri = document.createElement("button");
    apri.textContent = i.aperto ? "guardalo" : "apri";
    apri.addEventListener("click", async function () {
      fuori.classList.add("aperto");
      titolo.textContent = i.nome;
      apri.hidden = true;
      tieni.hidden = false;
      mostraDentro(anteprima, i);
      if (!i.aperto) {
        try {
          await chiama("/invii/" + encodeURIComponent(i.id) + "/aperto", { method: "POST", body: "{}" });
          i.aperto = true;
          await leggiRegali();
        } catch (e) { /* si riproverà: il pacco è già aperto sullo schermo */ }
      }
    });

    var tieni = document.createElement("button");
    tieni.className = "piano";
    tieni.textContent = "tienilo";
    tieni.hidden = !i.aperto;
    tieni.addEventListener("click", function () { scaricaRegalo(i); });

    var dopo = document.createElement("button");
    dopo.className = "piano";
    dopo.textContent = "chiudi";
    dopo.addEventListener("click", function () { fuori.remove(); });

    fila.append(apri, tieni, dopo);
    dentro.append(fila);
    fuori.append(dentro);
    document.body.append(fuori);

    if (i.aperto) {
      fuori.classList.add("aperto");
      apri.hidden = true;
      mostraDentro(anteprima, i);
    }
  }

  /** Quello che si può guardare qui dentro si guarda qui dentro. */
  function mostraDentro(box, i) {
    box.innerHTML = "";
    var indirizzo = "/invii/" + encodeURIComponent(i.id) + "/file";
    if (i.mime.indexOf("image/") === 0) {
      var img = document.createElement("img");
      img.src = indirizzo;
      img.alt = i.nome;
      box.append(img);
    } else if (i.mime.indexOf("video/") === 0) {
      var vid = document.createElement("video");
      vid.controls = true;
      vid.playsInline = true;
      vid.src = indirizzo;
      box.append(vid);
    } else if (i.mime.indexOf("audio/") === 0) {
      var au = document.createElement("audio");
      au.controls = true;
      au.style.width = "100%";
      au.src = indirizzo;
      box.append(au);
    }
  }

  async function scaricaRegalo(i) {
    if (window.DaProdApp && window.DaProdApp.scaricaRegalo) {
      window.DaProdApp.scaricaRegalo(i.id, i.nome);
      return;
    }
    var risposta = await fetch("/invii/" + encodeURIComponent(i.id) + "/file", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!risposta.ok) { alert("Non riesco a scaricarlo."); return; }
    var blob = await risposta.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = i.nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
  }

  /** Un regalo, disegnato come un quadro della galleria. */
  function quadroRegalo(i) {
    var box = document.createElement("div");
    box.className = "quadro";
    var indirizzo = "/invii/" + encodeURIComponent(i.id) + "/file";

    if (i.mime.indexOf("image/") === 0) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = indirizzo;
      img.alt = i.nome;
      box.append(img);
    } else if (i.mime.indexOf("video/") === 0) {
      var vid = document.createElement("video");
      vid.controls = true;
      vid.preload = "metadata";
      vid.playsInline = true;
      vid.src = indirizzo;
      box.append(vid);
    }

    var sotto = document.createElement("div");
    sotto.className = "sotto";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = i.nome;
    nome.title = i.nome;
    var riga = document.createElement("div");
    riga.className = "riga";
    riga.textContent = ["da " + i.daNome, quando(i.quando), pesa(i.bytes)].filter(Boolean).join(" · ");
    sotto.append(nome, riga);

    if (i.messaggio) {
      var m = document.createElement("div");
      m.className = "riga";
      m.textContent = "«" + i.messaggio + "»";
      sotto.append(m);
    }

    if (i.mime.indexOf("audio/") === 0) {
      var au = document.createElement("audio");
      au.controls = true;
      au.preload = "none";
      au.src = indirizzo;
      sotto.append(au);
    }

    var attrezzi = document.createElement("div");
    attrezzi.className = "attrezzi";

    var tieni = document.createElement("button");
    tieni.className = "mini";
    tieni.textContent = window.DaProdApp ? "tieni nel telefono" : "tienilo";
    tieni.addEventListener("click", function () { scaricaRegalo(i); });

    var butta = document.createElement("button");
    butta.className = "mini male";
    butta.textContent = "butta";
    butta.addEventListener("click", async function () {
      if (!confirm("Buttare via " + i.nome + "?")) return;
      try {
        await chiama("/invii/" + encodeURIComponent(i.id), { method: "DELETE" });
        await leggiGalleria();
      } catch (e) { alert(e.message); }
    });

    attrezzi.append(tieni, butta);
    sotto.append(attrezzi);
    box.append(sotto);
    return box;
  }

  /* --------------------------------------------------------- collegamento */

  async function leggiPannello() {
    pannello = await chiama("/pannello");
    puoiDecidere = pannello.puoiDecidere === true;
    disegnaSemaforo();
    disegnaNumeri();
    disegnaCollegamento();
  }

  function disegnaCollegamento() {
    if (!pannello) return;

    $("sotto-collegamento").textContent =
      pannello.computer + " · " + pannello.dispositivi.length + " collegati";
    $("scheda-invita").hidden = !puoiDecidere;

    // I quadrati della rete: uno per cosa, col suo colore.
    var q = $("quadrati-rete");
    q.innerHTML = "";

    // Due strade diverse per la stessa cosa, e vanno distinte: con Tailscale ci
    // si arriva già da fuori, e il tunnel non serve. Scrivere solo «sì» accanto
    // a un tasto «apri» faceva sembrare che mancasse qualcosa.
    var conTailscale = pannello.indirizzi.some(function (i) {
      return i.dove === "ovunque" && i.base.indexOf("trycloudflare") < 0;
    });
    var conTunnel = pannello.tunnel.fase === "acceso";
    quadratoStato(q, "\\u2302", "Rete di casa", "sempre", "verde", null);
    quadratoStato(
      q,
      "\\u2708",
      "Da fuori casa",
      conTailscale ? "sì, con Tailscale" : conTunnel ? "sì, dal tunnel" : "no",
      conTailscale || conTunnel ? "verde" : "",
      puoiDecidere
        ? {
            testo: conTunnel
              ? "chiudi il tunnel"
              : conTailscale
                ? "apri anche il tunnel"
                : "apri il tunnel",
            fai: cambiaTunnel,
          }
        : null,
    );
    var muro = pannello.firewall || { incerto: true };
    quadratoStato(
      q,
      "\\u26E8",
      "Firewall",
      muro.incerto ? "non lo so" : muro.aperta ? "lascia entrare" : "blocca",
      muro.incerto ? "" : muro.aperta ? "verde" : "rosso",
      puoiDecidere && !muro.aperta && !muro.incerto ? { testo: "sblocca", fai: sbloccaLaPorta } : null,
    );
    quadratoStato(
      q,
      "\\u25B8",
      "I lavori partono da soli",
      pannello.codaAutomatica ? "sì" : "no",
      pannello.codaAutomatica ? "verde" : "giallo",
      null,
    );

    // Chi è collegato.
    var elenco = $("dispositivi");
    elenco.innerHTML = "";
    for (var d of pannello.dispositivi) elenco.append(rigaDispositivo(d));
    if (!pannello.dispositivi.length) {
      var vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Nessuno, per adesso. Premi «Invita qualcuno».";
      elenco.append(vuoto);
    }

    // Da dove si arriva.
    var dove = $("indirizzi");
    dove.innerHTML = "";
    for (var i of pannello.indirizzi) {
      var li = document.createElement("li");
      var corpo = document.createElement("div");
      corpo.className = "cresce";
      var c = document.createElement("code");
      c.textContent = i.base;
      var d2 = document.createElement("div");
      d2.className = "dettaglio";
      d2.textContent = i.che;
      corpo.append(c, d2);
      var p = document.createElement("span");
      p.className = "pillola" + (i.dove === "ovunque" ? " pronta" : "");
      p.textContent = i.dove === "ovunque" ? "ovunque" : "in casa";
      li.append(corpo, p);
      dove.append(li);
    }
  }

  function quadratoStato(dove, segno, nome, valore, colore, azione) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "quadrato " + (colore || "") + (azione ? "" : " spento");
    var s = document.createElement("span");
    s.className = "segno";
    s.textContent = segno;
    var n = document.createElement("span");
    n.className = "nome";
    n.textContent = nome;
    var v = document.createElement("small");
    v.textContent = valore;
    b.append(s, n, v);
    if (azione) {
      var t = document.createElement("small");
      t.style.color = "var(--accent)";
      t.textContent = azione.testo;
      b.append(t);
      b.addEventListener("click", azione.fai);
    }
    dove.append(b);
  }

  function rigaDispositivo(d) {
    var li = document.createElement("li");
    var corpo = document.createElement("div");
    corpo.className = "cresce";
    var t = document.createElement("div");
    t.className = "titolo";
    t.textContent = d.nome;
    var s = document.createElement("div");
    s.className = "dettaglio";
    /**
     * **Admin e utente**, e sono queste le due parole.
     *
     * Chiesto il 23 agosto 2026: «cambia il pulsante "fagli solo chiedere" con
     * un "admin" e "utente", questa è la distinzione». Le frasi che spiegavano
     * cosa uno può fare restano — ma sotto, come spiegazione, non al posto del
     * nome della cosa.
     */
    s.textContent =
      (d.ruolo === "admin" ? "Admin — fa partire quello che chiede" : "Utente — manda richieste") +
      " · visto " + quando(d.ultimoAccesso);
    corpo.append(t, s);
    li.append(corpo);

    if (puoiDecidere) {
      /**
       * Cambiare cosa può fare una persona.
       *
       * Fino alla 0.7.1 lo si sceglieva una volta sola, inquadrando il QR: per
       * promuovere qualcuno bisognava scollegarlo e rifargli l'accoppiamento.
       * È il gesto che serve più spesso, e adesso è un tasto.
       */
      if (d.id !== ioId) {
        var permesso = document.createElement("button");
        permesso.className = "mini";
        permesso.textContent = d.ruolo === "admin" ? "rendilo utente" : "rendilo admin";
        permesso.addEventListener("click", function () {
          var nuovo = d.ruolo === "admin" ? "ospite" : "admin";
          var domanda = nuovo === "admin"
            ? d.nome + " diventa admin: quello che chiede parte da solo, e può decidere sulle richieste degli altri. Sicuro?"
            : d.nome + " torna utente: manderà richieste e aspetterà il tuo sì. Va bene?";
          if (!confirm(domanda)) return;
          chiama("/dispositivi/" + encodeURIComponent(d.id), {
            method: "POST",
            body: JSON.stringify({ ruolo: nuovo }),
          })
            .then(leggiPannello)
            .catch(function (e) { alert(e.message); });
        });
        li.append(permesso);
      }

      var via = document.createElement("button");
      via.className = "mini male";
      via.textContent = "disconnetti";
      via.addEventListener("click", function () {
        if (!confirm("Disconnettere " + d.nome + "? Per rientrare gli servirà un codice nuovo.")) return;
        chiama("/dispositivi/" + encodeURIComponent(d.id), { method: "DELETE" })
          .then(leggiPannello)
          .catch(function (e) { alert(e.message); });
      });
      li.append(via);

      // **Trascinaci sopra un file e glielo mandi.** Chiesto così, ed è il
      // gesto più corto che ci sia: niente moduli, niente «scegli file».
      var barra = document.createElement("div");
      barra.className = "barra-invio";
      barra.hidden = true;
      var dentro = document.createElement("i");
      barra.append(dentro);
      li.append(barra);

      /**
       * **Il tasto, oltre al trascinamento.**
       *
       * Su un telefono non si trascina niente: chi apre questa pagina dall'app
       * non avrebbe nessun modo di mandare un file. Con l'input nascosto il
       * gesto c'è su tutti e due, e sul computer restano tutti e due.
       */
      var scegli = document.createElement("input");
      scegli.type = "file";
      scegli.hidden = true;
      scegli.addEventListener("change", function () {
        var file = scegli.files && scegli.files[0];
        if (file) mandaFile(d, file, barra, dentro);
        scegli.value = "";
      });
      var mandaUno = document.createElement("button");
      mandaUno.className = "mini";
      mandaUno.textContent = "mandagli un file";
      mandaUno.addEventListener("click", function () { scegli.click(); });
      li.append(mandaUno, scegli);

      li.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        li.classList.add("cade");
      });
      li.addEventListener("dragleave", function () { li.classList.remove("cade"); });
      li.addEventListener("drop", function (ev) {
        ev.preventDefault();
        li.classList.remove("cade");
        var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
        if (file) mandaFile(d, file, barra, dentro);
      });
    }
    return li;
  }

  /**
   * Manda un file a una persona collegata.
   *
   * Con XMLHttpRequest e non con fetch, per una ragione sola: fetch non sa
   * dire a che punto è. Su un video da cento MB, una pagina ferma e nessuna
   * barra dicono la stessa cosa — cioè che si è rotto qualcosa.
   */
  function mandaFile(d, file, barra, dentro) {
    var avviso = $("avviso-invio");
    avviso.className = "avviso";
    avviso.textContent = "Mando " + file.name + " a " + d.nome + "…";
    barra.hidden = false;
    dentro.style.width = "0";

    var xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      "/invii?a=" + encodeURIComponent(d.id) + "&nome=" + encodeURIComponent(file.name),
    );
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = function (ev) {
      if (!ev.lengthComputable) return;
      dentro.style.width = Math.round((ev.loaded / ev.total) * 100) + "%";
    };
    xhr.onload = function () {
      barra.hidden = true;
      if (xhr.status >= 200 && xhr.status < 300) {
        avviso.className = "avviso bene";
        avviso.textContent = file.name + " è arrivato a " + d.nome + ".";
        return;
      }
      var motivo = "";
      try { motivo = (JSON.parse(xhr.responseText) || {}).errore || ""; } catch (e) { motivo = ""; }
      avviso.className = "avviso male";
      avviso.textContent = motivo || "Non sono riuscito a mandarlo.";
    };
    xhr.onerror = function () {
      barra.hidden = true;
      avviso.className = "avviso male";
      avviso.textContent = "Il collegamento si è interrotto mentre lo mandavo.";
    };
    xhr.send(file);
  }

  async function cambiaTunnel() {
    var acceso = pannello && pannello.tunnel.fase === "acceso";
    try {
      await chiama("/pannello/tunnel", {
        method: "POST",
        body: JSON.stringify({ acceso: !acceso }),
      });
      await leggiPannello();
    } catch (e) {
      alert(e.message);
    }
  }

  async function sbloccaLaPorta() {
    try {
      var esito = await chiama("/pannello/porta", { method: "POST", body: "{}" });
      if (esito && esito.errore) alert(esito.errore);
      await leggiPannello();
    } catch (e) {
      alert(e.message);
    }
  }

  async function invita(ruolo, quante) {
    var avviso = $("avviso-invito");
    avviso.className = "avviso";
    avviso.textContent = "";
    try {
      var invito = await chiama("/pannello/invito", {
        method: "POST",
        body: JSON.stringify({ ruolo: ruolo, quante: quante }),
      });
      $("riquadro-qr").hidden = false;
      $("qr").src = invito.qr;
      $("codice-invito").textContent = invito.codice;
      // L'indirizzo da battere a mano: il primo dell'elenco, che è quello che
      // funziona anche fuori casa. È l'altra metà del codice — da solo, il
      // codice dice chi sei ma non a chi bussare.
      var primo = (pannello && pannello.indirizzi && pannello.indirizzi[0]) || null;
      $("indirizzo-invito").textContent = primo ? primo.base : "—";
      contaAllaRovescia(invito.scade, invito.restano);
      await leggiPannello();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    }
  }

  /**
   * Il conto alla rovescia dell'invito.
   *
   * Senza, chi torna qui mezz'ora dopo vede un codice che sembra buono e non
   * funziona più: meglio vederlo scadere sotto gli occhi.
   */
  function contaAllaRovescia(scade, restano) {
    if (orologioInvito) clearInterval(orologioInvito);
    var battito = function () {
      var secondi = Math.round((scade - Date.now()) / 1000);
      if (secondi <= 0) {
        clearInterval(orologioInvito);
        orologioInvito = null;
        $("riquadro-qr").hidden = true;
        return;
      }
      $("scade-invito").textContent =
        "Vale ancora " + Math.floor(secondi / 60) + ":" + String(secondi % 60).padStart(2, "0") +
        (restano > 1 ? " · per " + restano + " persone" : "");
    };
    battito();
    orologioInvito = setInterval(battito, 1000);
  }

  /* -------------------------------------------------------------- lo stato */

  function disegnaStato(s) {
    if (!s) return;
    suite = s;
    $("nota-versione").textContent =
      "DaProd Suite " + (s.versione || "") + " su " + (s.computer || "questo computer") +
      " · questa pagina la serve il computer, e i modelli girano lì.";
    disegnaNumeri();
  }

  /* ---------------------------------------------------------------- entra */

  async function entra() {
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("fondo").hidden = false;
    vaiA("casa");

    await piantaSessione();

    try {
      var io = await chiama("/io");
      ioNome = io.nome || ioNome;
      ioId = io.id || "";
      localStorage.setItem(CHIAVE_NOME, ioNome);
    } catch (e) { /* si riprova al giro dopo */ }

    $("chi").hidden = false;
    $("chi").textContent = ioNome;

    try {
      azioni = await chiama("/azioni");
      disegnaTessere();
      disegnaAzioni();
    } catch (e) { /* senza azioni restano i lavori e la galleria */ }

    disegnaFiltriDove();
    disegnaFiltri();
    await leggiPreset();
    await guardaAi();
    try { await leggiCoda(); } catch (e) { /* offline */ }
    try { await leggiRegali(); } catch (e) { /* offline */ }
    try { disegnaStato(await chiama("/stato")); } catch (e) { /* offline */ }
    try { await leggiPannello(); } catch (e) { /* offline */ }
    apriFlusso();
  }

  /**
   * Lo stato dal vivo.
   *
   * Il gateway spinge su una connessione aperta a ogni cambiamento: una
   * richiesta nuova, un lavoro che parte, il tunnel che si alza, il firewall che
   * si apre. A ogni spinta si rilegge quel poco che serve — due chiamate corte
   * — invece di avere un tasto «aggiorna» da nessuna parte.
   */
  function apriFlusso() {
    if (flusso) flusso.close();
    flusso = new EventSource("/stato/stream?token=" + encodeURIComponent(token));
    flusso.onmessage = function (ev) {
      try { disegnaStato(JSON.parse(ev.data)); } catch (e) { return; }
      leggiCoda().catch(function () {});
      leggiPannello().catch(function () {});
      leggiRegali().catch(function () {});
    };
    flusso.onerror = function () {
      var box = $("semaforo");
      box.className = "semaforo male";
      $("semaforo-faccia").textContent = "\\u2715";
      $("semaforo-titolo").textContent = "Non riesco a parlare col computer";
      $("semaforo-perche").textContent = "Provo a riprendere da solo…";
    };
  }

  /* ------------------------------------------------------------- aiutini */

  function quando(ms) {
    if (!ms) return "";
    var passati = (Date.now() - ms) / 1000;
    if (passati < 60) return "adesso";
    if (passati < 3600) return Math.round(passati / 60) + " min fa";
    if (passati < 86400) return Math.round(passati / 3600) + " h fa";
    return new Date(ms).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  }

  function pesa(b) {
    if (!b) return "";
    if (b >= 1048576) return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
    // Sotto il chilo si scrivono i byte: un file da settanta byte che dice
    // «0 KB» sembra un file rotto, e visto sul pacco di prova lo sembrava.
    if (b < 1024) return b + " byte";
    return Math.round(b / 1024) + " KB";
  }

  /* ------------------------------------------------------------- aggancio */

  $("collega").addEventListener("click", collega);
  $("codice").addEventListener("keydown", function (ev) { if (ev.key === "Enter") collega(); });
  $("manda").addEventListener("click", manda);
  $("annulla").addEventListener("click", chiudiModulo);
  $("invita-uno").addEventListener("click", function () { invita("ospite", 1); });
  $("invita-tanti").addEventListener("click", function () { invita("ospite", 10); });
  $("invita-decide").addEventListener("click", function () { invita("admin", 1); });
  $("chi").addEventListener("click", function () { vaiA("persone"); });
  for (var b of document.querySelectorAll("nav.fondo button")) {
    b.addEventListener("click", (function (quale) {
      return function () { vaiA(quale); };
    })(b.dataset.pagina));
  }

  // Tornare sulla pagina è il momento in cui si vuole sapere com'è andata.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !token) return;
    leggiCoda().catch(function () {});
    leggiPannello().catch(function () {});
    leggiRegali().catch(function () {});
    // Il flusso, dopo un po' in secondo piano, il telefono lo chiude: si riapre.
    if (!flusso || flusso.readyState === 2) apriFlusso();
  });

  /**
   * Un file lasciato cadere **fuori** da una riga non deve aprirsi.
   *
   * Senza queste due righe, il browser (e la finestra di DaProdConnessione, che
   * è un browser) al posto della pagina mostra il file: il pannello sparisce e
   * bisogna riaprirlo. Con venti file da mandare, capita una volta su tre.
   */
  document.addEventListener("dragover", function (ev) { ev.preventDefault(); });
  document.addEventListener("drop", function (ev) { ev.preventDefault(); });

  $("nome").value = ioNome;
  if (token) entra();
})();
</script>
</body>
</html>`;
