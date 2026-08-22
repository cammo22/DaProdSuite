/**
 * La suite vista da fuori: dal browser di un portatile, e dal telefono.
 *
 * Nasce da una cosa detta chiaramente — «magari ho un portatile, voglio che
 * gira bene». Un portatile la suite non la può far girare: i modelli vogliono
 * la scheda video del PC fisso. Ma non gli serve. Gli serve **comandare** quel
 * PC, e per farlo basta un browser.
 *
 * **Dalla 0.6.0 questa pagina è anche l'app Android.** Non una copia: la stessa
 * pagina. L'app apre una WebView su di qui e ci mette dentro il token che ha
 * ottenuto col QR — vedi `apps/mobile`. Il motivo è quello che Cammo ha detto
 * in due frasi: «deve mostrare le pagine in stile della suite» e «niente
 * funziona sul device a livello di risorse ma fa tutto il pc». Se il telefono è
 * un vetro sul PC, allora l'interfaccia deve stare **sul PC**: una sola da
 * scrivere, una sola da tenere allineata alle azioni, e quando sul PC compare
 * una scheda nuova compare anche sul telefono senza pubblicare un APK.
 *
 * Regole di questa pagina, che sono anche il motivo per cui è un file di
 * testo dentro un .ts e non una cartella di sorgenti:
 *
 * - **si serve da sé**: niente CDN, niente font esterni, niente immagini. Una
 *   pagina che chiama fuori è una pagina che non funziona sulla wifi di casa
 *   quando la linea è giù, ed è il momento in cui serve di più.
 * - **il token sta nel browser** (`localStorage`), come sta nel portachiavi del
 *   telefono. Chi apre la pagina senza essersi accoppiato non vede niente.
 * - **le azioni non sono scritte qui**: si chiedono a `/azioni` e i moduli si
 *   disegnano da soli. Aggiungere un'azione al catalogo la fa comparire qui
 *   senza toccare questo file.
 * - **niente template literal nel JavaScript qui dentro.** Sembra un capriccio
 *   di stile e non lo è: questo file *è* un template literal, e ogni backtick
 *   dentro andrebbe protetto. Le stringhe si concatenano con `+`, come nel 2010,
 *   e in cambio il file non si rompe per un accento sbagliato.
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
    --radius: 16px;
    --fondo-alto: 62px;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--txt);
    /* Le due luci negli angoli: sono la faccia della suite da quando esiste
       DaProdMusica, e sono la cosa che si riconosce prima di leggere. */
    background:
      radial-gradient(1100px 560px at 85% -12%, #1d1348 0%, transparent 62%),
      radial-gradient(900px 520px at -5% 105%, #052b3d 0%, transparent 58%),
      var(--bg);
    background-attachment: fixed;
    font: 15px/1.55 "Segoe UI", system-ui, -apple-system, sans-serif;
    padding-bottom: calc(var(--fondo-alto) + env(safe-area-inset-bottom));
  }

  /* ------------------------------------------------------------ testata */
  header {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; gap: 12px;
    padding: 13px 16px calc(13px) 16px;
    padding-top: calc(13px + env(safe-area-inset-top));
    background: #0a0c11ee;
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
  }
  .marchio { font-weight: 700; letter-spacing: .2px; font-size: 16px; }
  .marchio span { color: var(--accent); }
  .cresci { flex: 1; }
  .vivo { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--dim); }
  .pallino { width: 8px; height: 8px; border-radius: 50%; background: var(--line2); flex: none; }
  .pallino.on { background: var(--ok); box-shadow: 0 0 0 3px #34d3992a; }
  .chi {
    font-size: 12px; color: var(--txt); background: var(--panel2);
    border: 1px solid var(--line2); border-radius: 99px; padding: 4px 11px; cursor: pointer;
  }

  /* -------------------------------------------------------------- pagine */
  main { max-width: 900px; margin: 0 auto; padding: 16px; }
  .pagina { display: none; }
  .pagina.on { display: block; }
  h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: .02em; }
  h3 { margin: 22px 0 10px; font-size: 13px; text-transform: uppercase;
       letter-spacing: .09em; color: var(--dim); font-weight: 650; }
  p.sotto { margin: 0 0 14px; color: var(--dim); font-size: 13px; }

  .scheda {
    background: linear-gradient(180deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: var(--radius);
    padding: 16px; margin-bottom: 14px;
  }

  label { display: block; margin: 13px 0 5px; font-size: 12.5px; color: var(--dim); }
  input, textarea, select {
    font: inherit; color: var(--txt); background: #0b0d13;
    border: 1px solid var(--line2); border-radius: 11px; padding: 11px 12px; width: 100%;
  }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--accent); }
  textarea { min-height: 92px; resize: vertical; }

  button {
    font: inherit; font-weight: 600; cursor: pointer;
    background: linear-gradient(180deg, #9b6cff, #7c3aed);
    border: 0; color: #fff; border-radius: 11px; padding: 11px 18px;
  }
  button:active { transform: translateY(1px); }
  button:disabled { opacity: .45; cursor: default; }
  button.piano {
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); font-weight: 500;
  }
  button.mini { padding: 6px 11px; font-size: 12.5px; font-weight: 500;
                background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); }
  button.mini:hover { border-color: var(--accent); }
  button.mini.male:hover { border-color: var(--err); color: var(--err); }
  .fila { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 16px; }

  /* --------------------------------------------------------- le schede app */
  .tessere { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 11px; }
  .tessera {
    text-align: left; padding: 15px 14px; border-radius: 14px;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt);
    font-weight: 600; display: flex; flex-direction: column; gap: 5px; min-height: 96px;
  }
  .tessera:hover { border-color: var(--accent); }
  .tessera .segno { font-size: 21px; line-height: 1; }
  .tessera small { color: var(--fioco); font-weight: 400; font-size: 11.5px; line-height: 1.4; }

  /* ------------------------------------------------------------- elenchi */
  ul.voci { list-style: none; margin: 0; padding: 0; }
  ul.voci li {
    border-top: 1px solid var(--line); padding: 13px 0;
    display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap;
  }
  ul.voci li:first-child { border-top: 0; }
  .cresce { flex: 1 1 220px; min-width: 0; }
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
  .nota { color: var(--fioco); font-size: 12px; margin-top: 14px; line-height: 1.5; }

  /* ------------------------------------------------------------ galleria */
  .filtri { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 14px; }
  .filtri button.on { border-color: var(--accent); color: var(--txt); background: #1b1533; }
  .quadri { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .quadro {
    border: 1px solid var(--line); border-radius: 13px; overflow: hidden; background: #0b0d13;
  }
  .quadro img, .quadro video { width: 100%; display: block; aspect-ratio: 16/10;
                               object-fit: cover; background: #000; }
  .quadro audio { width: 100%; display: block; margin-top: 8px; }
  .quadro .sotto { padding: 9px 11px 11px; }
  .quadro .nome { font-size: 12.5px; font-weight: 600; overflow: hidden;
                  text-overflow: ellipsis; white-space: nowrap; }
  .quadro .riga { font-size: 11px; color: var(--fioco); margin-top: 3px; }

  /* --------------------------------------------------------- barra in fondo */
  nav.fondo {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: #0a0c11f2; backdrop-filter: blur(10px);
    border-top: 1px solid var(--line);
    padding-bottom: env(safe-area-inset-bottom);
  }
  nav.fondo button {
    background: none; border: 0; border-radius: 0; color: var(--dim);
    font-size: 11.5px; font-weight: 500; padding: 9px 4px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
  }
  nav.fondo button .segno { font-size: 17px; line-height: 1; }
  nav.fondo button.on { color: var(--txt); }
  nav.fondo button.on .segno { filter: drop-shadow(0 0 8px #8b5cf6aa); }
  nav.fondo .bollo {
    position: absolute; transform: translate(14px, -4px);
    background: var(--accent); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 99px; padding: 0 5px; min-width: 16px; text-align: center;
  }

  @media (min-width: 760px) {
    nav.fondo { grid-template-columns: repeat(4, auto); justify-content: center; gap: 18px; }
    nav.fondo button { flex-direction: row; padding: 12px 16px; font-size: 13px; }
  }

  [hidden] { display: none !important; }
</style>
</head>
<body>

<header>
  <div class="marchio">DaProd<span>Suite</span></div>
  <div class="cresci"></div>
  <button class="chi" id="chi" hidden></button>
  <div class="vivo"><span class="pallino" id="pallino"></span><span id="statoTesto">—</span></div>
</header>

<main>

  <!-- Prima di tutto: dire chi sei. Senza token non si vede niente. -->
  <section class="pagina on" id="pag-entra">
    <div class="scheda">
      <h2>Collega questo dispositivo</h2>
      <p class="sotto">
        Sul PC dove gira la suite: <b>Da fuori</b>, in fondo all'hub, poi
        <b>Accendi</b> e <b>Invita</b>. Compare un codice di otto cifre: scrivilo
        qui. Vale una volta sola e dura cinque minuti.
      </p>
      <label for="nome">Chi sei</label>
      <input id="nome" maxlength="40" autocomplete="off" placeholder="Cammo, portatile, telefono di Anna…">
      <p class="nota" style="margin-top:6px">
        Questo nome compare accanto a tutto quello che chiedi, sul PC e negli altri
        dispositivi. Serve a sapere chi ha chiesto cosa quando in fila ci sono tre
        lavori di tre persone.
      </p>
      <label for="codice">Codice di otto cifre</label>
      <input id="codice" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="12345678">
      <div class="fila"><button id="collega">Collega</button></div>
      <div class="avviso" id="avviso-entra"></div>
    </div>
  </section>

  <!-- ------------------------------------------------------------ la suite -->
  <section class="pagina" id="pag-suite">
    <div class="scheda">
      <h2 id="titolo-suite">Il computer</h2>
      <p class="sotto" id="sotto-suite">—</p>
      <ul class="voci" id="attivita"></ul>
    </div>

    <h3>Cosa vuoi fare</h3>
    <div class="tessere" id="tessere"></div>

    <p class="nota" id="nota-versione"></p>
  </section>

  <!-- ------------------------------------------------------------- chiedi -->
  <section class="pagina" id="pag-chiedi">
    <div class="scheda">
      <h2>Chiedi qualcosa alla suite</h2>
      <p class="sotto">Le azioni sono quelle che la suite dichiara. Chi decide resta chi sta al PC.</p>
      <div class="tessere" id="elenco-azioni"></div>
      <form id="modulo" hidden onsubmit="return false"></form>
      <div class="fila" id="fila-manda" hidden>
        <button id="manda">Manda al PC</button>
        <button class="piano" id="annulla" type="button">Lascia stare</button>
      </div>
      <div class="avviso" id="avviso-azione"></div>
    </div>
  </section>

  <!-- ---------------------------------------------------------------- fila -->
  <section class="pagina" id="pag-fila">
    <div class="scheda">
      <h2>La fila</h2>
      <p class="sotto">Le richieste mandate da qui e dagli altri dispositivi, dalla più recente.</p>
      <ul class="voci" id="coda"></ul>
    </div>
  </section>

  <!-- ------------------------------------------------------------ galleria -->
  <section class="pagina" id="pag-galleria">
    <div class="scheda">
      <h2>Quello che il PC ha fatto</h2>
      <p class="sotto">La libreria della suite: immagini, video e brani di tutte le schede insieme.</p>
      <div class="filtri" id="filtri"></div>
      <div class="quadri" id="quadri"></div>
      <div class="vuoto" id="galleria-vuota" hidden>Ancora niente qui dentro.</div>
    </div>
  </section>

</main>

<nav class="fondo" id="fondo" hidden>
  <button data-pagina="suite" class="on"><span class="segno">&#9673;</span>Suite</button>
  <button data-pagina="chiedi"><span class="segno">&#10010;</span>Chiedi</button>
  <button data-pagina="fila"><span class="segno">&#9776;</span>Fila<span class="bollo" id="bollo" hidden></span></button>
  <button data-pagina="galleria"><span class="segno">&#9635;</span>Galleria</button>
</nav>

<script>
(() => {
  "use strict";

  var CHIAVE = "daprod.token";
  var CHIAVE_RUOLO = "daprod.ruolo";
  var CHIAVE_NOME = "daprod.nome";
  var $ = function (id) { return document.getElementById(id); };

  var token = localStorage.getItem(CHIAVE) || "";
  var ruolo = localStorage.getItem(CHIAVE_RUOLO) || "ospite";
  var ioNome = localStorage.getItem(CHIAVE_NOME) || "";
  var azioni = [];
  var scelta = null;
  var flusso = null;
  var pagina = "suite";
  var filtro = "";
  var ultimaGalleria = 0;

  /**
   * Il token e il nome possono arrivare dall'indirizzo.
   *
   * È così che l'app Android apre questa pagina: si è accoppiata lei col QR, e
   * passa quello che ha ottenuto. Sta nel **frammento** (dopo il #) e non nella
   * query di proposito: il frammento non viene mandato al server, non finisce
   * nei log e non finisce in un Referer. Letto una volta, si cancella
   * dall'indirizzo, così non resta nella cronologia.
   */
  (function dallIndirizzo() {
    if (!location.hash) return;
    var pezzi = new URLSearchParams(location.hash.slice(1));
    var t = pezzi.get("t");
    var u = pezzi.get("u");
    var r = pezzi.get("r");
    if (t) { token = t; localStorage.setItem(CHIAVE, t); }
    if (u) { ioNome = u; localStorage.setItem(CHIAVE_NOME, u); }
    if (r) { ruolo = r; localStorage.setItem(CHIAVE_RUOLO, r); }
    history.replaceState(null, "", location.pathname);
  })();

  /* ------------------------------------------------------------- chiamate */

  async function chiama(percorso, opzioni) {
    opzioni = opzioni || {};
    var testate = { "Content-Type": "application/json" };
    if (token) testate.Authorization = "Bearer " + token;
    for (var k in (opzioni.headers || {})) testate[k] = opzioni.headers[k];

    var risposta = await fetch(percorso, {
      method: opzioni.method || "GET",
      body: opzioni.body,
      headers: testate,
    });
    var testo = await risposta.text();
    var corpo = null;
    try { corpo = testo ? JSON.parse(testo) : null; } catch (e) { corpo = null; }
    if (!risposta.ok) {
      // 401 vuol dire che il PC non ci riconosce più: il dispositivo è stato
      // revocato, o la suite è stata reinstallata. Si riparte dall'invito.
      if (risposta.status === 401) scollega(true);
      throw new Error((corpo && corpo.errore) || ("Errore " + risposta.status));
    }
    return corpo;
  }

  /**
   * Pianta il biscotto di sessione.
   *
   * Serve a una cosa sola e non se ne può fare a meno: un tag «<img>» o
   * «<video>» non sa mettere l'header «Authorization». Senza biscotto la
   * galleria dovrebbe scaricare ogni file in memoria per mostrarlo — niente
   * anteprime pigre, niente barra di scorrimento su un video da cento MB.
   *
   * Il gateway lo accetta **solo sulle GET** e lo marca «SameSite=Strict»:
   * nessun altro sito può farlo partire, e niente che cambi qualcosa passa da
   * lì. Vedi «chiE» in «server.ts».
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
      avviso.textContent = "Scrivi chi sei: è il nome che comparirà accanto a quello che chiedi.";
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
      ruolo = (esito.dispositivo && esito.dispositivo.ruolo) || "ospite";
      ioNome = nome;
      localStorage.setItem(CHIAVE, token);
      localStorage.setItem(CHIAVE_RUOLO, ruolo);
      localStorage.setItem(CHIAVE_NOME, nome);
      avviso.textContent = "Collegato a " + (esito.computer || "il PC") + ".";
      avviso.className = "avviso bene";
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
    localStorage.removeItem(CHIAVE_RUOLO);
    if (flusso) { flusso.close(); flusso = null; }
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("pag-entra").classList.add("on");
    $("fondo").hidden = true;
    $("chi").hidden = true;
    $("nome").value = ioNome;
    $("statoTesto").textContent = automatico ? "il PC non ci riconosce più" : "scollegato";
    $("pallino").classList.remove("on");
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
    // La galleria si rilegge quando la si apre, e non più di una volta ogni
    // dieci secondi: è l'unica pagina che chiede una lista di file.
    if (quale === "galleria" && Date.now() - ultimaGalleria > 10000) leggiGalleria();
  }

  /* ------------------------------------------------------------- le azioni */

  /** Come si chiama una scheda della suite, e il suo segno. */
  //
  // Sono caratteri del piano base e non emoji, e non è una scelta di stile: un
  // emoji fuori dal piano base si scrive con due unità, e scritto con la
  // vecchia forma a quattro cifre diventa un carattere sbagliato più un «3» —
  // che è esattamente quello che compariva accanto a «Leggi un testo». Questi
  // si vedono uguali su ogni telefono e non hanno quel problema.
  var SCHEDE = {
    foto: { nome: "DaProdFoto", segno: "\\u25C9", che: "immagini da una descrizione" },
    cinema: { nome: "DaProdCinema", segno: "\\u25B6", che: "clip video, col suono dentro" },
    musica: { nome: "DaProdMusica", segno: "\\u266B", che: "canzoni, anche cantate" },
    voce: { nome: "DaProdVoce", segno: "\\u275E", che: "un testo letto ad alta voce" },
    suite: { nome: "La suite", segno: "\\u25A6", che: "leggere e decidere" },
  };

  function disegnaTessere() {
    var dove = $("tessere");
    dove.innerHTML = "";
    // Le tessere sono le azioni che occupano la scheda video: quelle che una
    // persona vuole chiedere da qui. Le altre — leggere la libreria, decidere —
    // sono roba da console e da agenti, e stanno nella pagina «Chiedi».
    for (var a of azioni.filter(function (x) { return x.coda; })) {
      var scheda = SCHEDE[a.app] || SCHEDE.suite;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tessera";
      var segno = document.createElement("span");
      segno.className = "segno";
      segno.textContent = scheda.segno;
      var titolo = document.createElement("span");
      titolo.textContent = a.titolo;
      var sotto = document.createElement("small");
      sotto.textContent = scheda.nome + " — " + scheda.che;
      b.append(segno, titolo, sotto);
      b.addEventListener("click", (function (azione) {
        return function () { vaiA("chiedi"); scegli(azione); };
      })(a));
      dove.append(b);
    }
  }

  function disegnaAzioni() {
    var elenco = $("elenco-azioni");
    elenco.innerHTML = "";
    for (var a of azioni) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tessera";
      var titolo = document.createElement("span");
      titolo.textContent = a.titolo;
      var s = document.createElement("small");
      s.textContent = a.coda ? "occupa la scheda video · va in fila" : "risponde subito";
      b.append(titolo, s);
      b.addEventListener("click", (function (azione) {
        return function () { scegli(azione); };
      })(a));
      elenco.append(b);
    }
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
          vuoto.textContent = "— tutte —";
          controllo.append(vuoto);
        }
        for (var opt of (campo.scelte || [])) {
          var o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
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
      modulo.append(controllo);

      if (campo.descrizione) {
        var nota = document.createElement("div");
        nota.className = "nota";
        nota.style.marginTop = "5px";
        nota.textContent = campo.descrizione;
        modulo.append(nota);
      }
    }

    modulo.hidden = false;
    $("fila-manda").hidden = false;
    $("manda").textContent = a.coda ? "Manda al PC" : a.titolo;
    $("avviso-azione").textContent = "";
    $("avviso-azione").className = "avviso";
    modulo.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        avviso.textContent = "In fila sul PC. Adesso tocca a chi ci sta davanti.";
        avviso.className = "avviso bene";
        chiudiModulo();
        await leggiCoda();
        vaiA("fila");
      } else {
        avviso.className = "avviso";
        avviso.textContent = "";
        mostraRisposta(esito.risultato);
      }
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("manda").disabled = false;
    }
  }

  /** La risposta di un'azione che risponde subito: un elenco, di solito. */
  function mostraRisposta(risultato) {
    var modulo = $("modulo");
    var box = document.createElement("pre");
    box.style.cssText =
      "margin-top:16px;padding:12px;border:1px solid var(--line);border-radius:11px;" +
      "background:#0b0d13;font-size:12px;overflow:auto;max-height:340px;white-space:pre-wrap";
    box.textContent = typeof risultato === "string" ? risultato : JSON.stringify(risultato, null, 2);
    modulo.append(box);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------------------------------------------------------------- coda */

  var NOMI_STATO = {
    "in-attesa": ["attesa", "aspetta il sì"],
    accettata: ["lavoro", "accettata"],
    "in-lavoro": ["lavoro", "in lavorazione"],
    pronta: ["pronta", "pronta"],
    scartata: ["brutto", "scartata"],
    scaduta: ["brutto", "scaduta"],
  };

  async function leggiCoda() {
    var richieste = await chiama("/richieste");
    var elenco = $("coda");
    elenco.innerHTML = "";

    var attesa = 0;
    for (var r of richieste) {
      if (r.stato === "in-attesa") attesa += 1;
      elenco.append(rigaRichiesta(r));
    }
    if (!richieste.length) {
      var vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Ancora niente. Quello che chiedi compare qui.";
      elenco.append(vuoto);
    }

    $("bollo").hidden = attesa === 0;
    $("bollo").textContent = attesa;
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
    d.textContent = [r.app, r.daNome, quando(r.quando), r.motivoScarto].filter(Boolean).join(" · ");
    corpo.append(t, d);

    var stato = NOMI_STATO[r.stato] || ["", r.stato];
    var pillola = document.createElement("span");
    pillola.className = "pillola " + stato[0];
    pillola.textContent = stato[1];

    li.append(corpo, pillola);

    if (r.stato === "pronta" && r.risultato) {
      var giu = document.createElement("button");
      giu.className = "mini";
      giu.textContent = "scarica";
      giu.addEventListener("click", function () { scarica(r.risultato.nome); });
      li.append(giu);
    }

    // Solo il padrone decide. A un ospite due bottoni che rispondono «non puoi»
    // sono peggio di nessun bottone.
    if (ruolo === "admin" && r.stato === "in-attesa") {
      var si = document.createElement("button");
      si.className = "mini";
      si.textContent = "accetta";
      si.addEventListener("click", function () { decidi(r.id, "accettata"); });
      var no = document.createElement("button");
      no.className = "mini male";
      no.textContent = "scarta";
      no.addEventListener("click", function () { decidi(r.id, "scartata"); });
      li.append(si, no);
    }
    return li;
  }

  async function decidi(id, stato) {
    try {
      await chiama("/richieste/" + encodeURIComponent(id) + "/stato", {
        method: "POST",
        body: JSON.stringify({ stato: stato }),
      });
      await leggiCoda();
    } catch (e) {
      alert(e.message);
    }
  }

  /**
   * Scarica un risultato pronto.
   *
   * Passa da «fetch» e non da un link diretto perché il file vuole il token, e
   * un «<a href>» l'header non lo mette. Il biscotto di sessione lo farebbe,
   * ma un download va anche **nominato**: così il file arriva col suo nome
   * invece che con l'id.
   */
  async function scarica(nome) {
    // Dentro l'app Android il file lo tira giù **lei**, non questa pagina: ha
    // già il token, e sa mettere un video in galleria e un brano fra la musica
    // invece che in una cartella dell'app. Passare cento MB di base64 da qui a
    // lì sarebbe la strada lunga e fragile per un risultato peggiore.
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
    ultimaGalleria = Date.now();
    var dove = $("quadri");
    try {
      var risposta = await chiama("/libreria?quanti=48" + (filtro ? "&tipo=" + filtro : ""));
      var voci = (risposta && risposta.voci) || [];
      dove.innerHTML = "";
      $("galleria-vuota").hidden = voci.length > 0;
      for (var v of voci) dove.append(quadro(v));
    } catch (e) {
      dove.innerHTML = "";
      $("galleria-vuota").hidden = false;
      $("galleria-vuota").textContent = e.message;
    }
  }

  function quadro(v) {
    var box = document.createElement("div");
    box.className = "quadro";
    var dove = "/libreria/file/" + encodeURIComponent(v.id);

    if (v.tipo === "immagine") {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = dove;
      img.alt = v.nome;
      box.append(img);
    } else if (v.tipo === "video") {
      var vid = document.createElement("video");
      vid.controls = true;
      vid.preload = "metadata";
      vid.playsInline = true;
      vid.src = dove;
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
    riga.textContent = [v.app, quando(v.creato), pesa(v.bytes)].filter(Boolean).join(" · ");
    sotto.append(nome, riga);

    if (v.tipo === "audio") {
      var au = document.createElement("audio");
      au.controls = true;
      au.preload = "none";
      au.src = dove;
      sotto.append(au);
    }

    // Solo dentro l'app Android: da un browser il file si salva col tasto
    // destro, dal telefono no — e «guardalo qui» non è la stessa cosa di
    // «tienilo con le tue foto».
    if (window.DaProdApp && window.DaProdApp.scaricaLibreria) {
      var tieni = document.createElement("button");
      tieni.className = "mini";
      tieni.style.marginTop = "9px";
      tieni.textContent = "tieni nel telefono";
      tieni.addEventListener("click", function () {
        window.DaProdApp.scaricaLibreria(v.id, v.nome);
      });
      sotto.append(tieni);
    }

    box.append(sotto);
    return box;
  }

  /* -------------------------------------------------------------- lo stato */

  function disegnaStato(s) {
    if (!s) return;
    $("pallino").classList.toggle("on", !!s.attiva);
    $("statoTesto").textContent = s.computer || "il PC";
    $("titolo-suite").textContent = s.computer || "Il computer";

    var pezzi = [];
    if (s.coda) {
      if (s.coda.attesa) pezzi.push(s.coda.attesa + " in attesa");
      if (s.coda.lavoro) pezzi.push(s.coda.lavoro + " in lavorazione");
      if (s.coda.pronte) pezzi.push(s.coda.pronte + " pronte");
    }
    $("sotto-suite").textContent = pezzi.length ? pezzi.join(" · ") : "Niente in fila.";

    var elenco = $("attivita");
    elenco.innerHTML = "";
    for (var a of (s.attivita || [])) {
      var li = document.createElement("li");
      var corpo = document.createElement("div");
      corpo.className = "cresce";
      var t = document.createElement("div");
      t.className = "titolo";
      t.textContent = a.nome;
      var d = document.createElement("div");
      d.className = "dettaglio";
      d.textContent = a.dettaglio || "";
      corpo.append(t, d);
      var p = document.createElement("span");
      p.className = "pillola lavoro";
      p.textContent = a.stato;
      li.append(corpo, p);
      elenco.append(li);
    }
    if (!(s.attivita || []).length) {
      var vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Nessuna scheda accesa in questo momento.";
      elenco.append(vuoto);
    }

    $("nota-versione").textContent =
      "DaProd Suite " + (s.versione || "") + " · questa pagina la serve il PC, e i modelli girano lì.";
  }

  /* ---------------------------------------------------------------- entra */

  async function entra() {
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("fondo").hidden = false;
    vaiA("suite");

    await piantaSessione();

    // Chi sono, chiesto al PC e non ricordato dal browser: se il nome è stato
    // cambiato di là, qui si vede quello vero.
    try {
      var io = await chiama("/io");
      ioNome = io.nome || ioNome;
      ruolo = io.ruolo || ruolo;
      localStorage.setItem(CHIAVE_NOME, ioNome);
      localStorage.setItem(CHIAVE_RUOLO, ruolo);
    } catch (e) { /* si riprova al giro dopo */ }

    $("chi").hidden = false;
    $("chi").textContent = ioNome + (ruolo === "admin" ? " · padrone" : "");

    try {
      azioni = await chiama("/azioni");
      disegnaTessere();
      disegnaAzioni();
    } catch (e) { /* senza azioni restano la fila e la galleria */ }

    disegnaFiltri();
    try { await leggiCoda(); } catch (e) { /* offline */ }
    try { disegnaStato(await chiama("/stato")); } catch (e) { /* offline */ }
    apriFlusso();
  }

  /**
   * Lo stato vivo, in streaming.
   *
   * «EventSource» non sa mettere header: fino alla 0.5.2 il token andava in
   * query. Adesso c'è il biscotto di sessione, che vale per le GET, e il token
   * in query resta solo come ripiego per un browser che i biscotti non li
   * tiene.
   */
  function apriFlusso() {
    if (flusso) flusso.close();
    flusso = new EventSource("/stato/stream?token=" + encodeURIComponent(token));
    flusso.onmessage = function (ev) {
      try { disegnaStato(JSON.parse(ev.data)); } catch (e) { /* battito */ }
    };
    flusso.onerror = function () {
      $("pallino").classList.remove("on");
      $("statoTesto").textContent = "non raggiungibile";
    };
  }

  /* ------------------------------------------------------------- aiutini */

  function quando(ms) {
    if (!ms) return "";
    var d = new Date(ms);
    var passati = (Date.now() - ms) / 1000;
    if (passati < 60) return "adesso";
    if (passati < 3600) return Math.round(passati / 60) + " min fa";
    if (passati < 86400) return Math.round(passati / 3600) + " h fa";
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  }

  function pesa(b) {
    if (!b) return "";
    if (b >= 1048576) return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
    return Math.round(b / 1024) + " KB";
  }

  /* ------------------------------------------------------------- aggancio */

  $("collega").addEventListener("click", collega);
  $("codice").addEventListener("keydown", function (ev) { if (ev.key === "Enter") collega(); });
  $("manda").addEventListener("click", manda);
  $("annulla").addEventListener("click", chiudiModulo);
  $("chi").addEventListener("click", function () {
    if (confirm("Scollegare questo dispositivo? Il PC lo tiene nell'elenco finché non lo togli da lì.")) {
      scollega(false);
    }
  });
  for (var b of document.querySelectorAll("nav.fondo button")) {
    b.addEventListener("click", (function (quale) {
      return function () { vaiA(quale); };
    })(b.dataset.pagina));
  }

  // Tornare sulla pagina è il momento in cui si vuole sapere com'è andata.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && token) {
      leggiCoda().catch(function () {});
    }
  });

  $("nome").value = ioNome;
  if (token) entra();
})();
</script>
</body>
</html>`;
