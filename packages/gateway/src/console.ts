/**
 * La console web: la suite vista da un altro computer.
 *
 * Nasce da una cosa detta chiaramente — «magari ho un portatile, voglio che
 * gira bene». Un portatile la suite non la può far girare: i modelli vogliono
 * la scheda video del PC fisso. Ma non gli serve. Gli serve **comandare** quel
 * PC, e per farlo basta un browser.
 *
 * Quindi: una pagina sola, servita dal gateway stesso, che si accoppia col
 * codice di otto cifre come fa il telefono e poi usa le stesse rotte e le
 * stesse azioni. Niente di nuovo da mantenere sul PC, niente da installare sul
 * portatile.
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
 */

export function paginaConsole(): string {
  return PAGINA;
}

const PAGINA = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>DaProd Suite — da qui</title>
<style>
  :root {
    --fondo: #0d0f14;
    --fondo-alto: #151922;
    --scheda: #171c26;
    --bordo: #232a37;
    --bordo-vivo: #313b4d;
    --testo: #e8ecf4;
    --tenue: #8d97a9;
    --fioco: #5d6779;
    --accento: #7c5cff;
    --ok: #5cff9d;
    --attesa: #ffc65c;
    --errore: #ff6b6b;
    --raggio: 14px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--fondo);
    color: var(--testo);
    font: 15px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif;
  }
  header {
    display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
    padding: 18px 20px; border-bottom: 1px solid var(--bordo); background: var(--fondo-alto);
    position: sticky; top: 0; z-index: 5;
  }
  header h1 { margin: 0; font-size: 19px; letter-spacing: .2px; }
  header .stato { color: var(--tenue); font-size: 13px; }
  header .stato.acceso { color: var(--ok); }
  main { max-width: 980px; margin: 0 auto; padding: 20px; }
  section {
    background: var(--scheda); border: 1px solid var(--bordo);
    border-radius: var(--raggio); padding: 18px; margin-bottom: 16px;
  }
  h2 { margin: 0 0 4px; font-size: 16px; }
  p.sotto { margin: 0 0 14px; color: var(--tenue); font-size: 13px; }
  label { display: block; margin: 12px 0 4px; font-size: 13px; color: var(--tenue); }
  input, textarea, select, button {
    font: inherit; color: var(--testo); background: var(--fondo-alto);
    border: 1px solid var(--bordo-vivo); border-radius: 10px; padding: 9px 11px; width: 100%;
  }
  textarea { min-height: 84px; resize: vertical; }
  button {
    background: var(--accento); border-color: transparent; color: #fff;
    cursor: pointer; font-weight: 600; width: auto; padding: 10px 18px;
  }
  button:hover { filter: brightness(1.12); }
  button.secondario { background: transparent; border-color: var(--bordo-vivo); color: var(--testo); font-weight: 500; }
  button:disabled { opacity: .5; cursor: default; }
  .fila { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
  .griglia { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
  .scelta-azione {
    text-align: left; background: var(--fondo-alto); border: 1px solid var(--bordo-vivo);
    color: var(--testo); font-weight: 500; width: 100%; padding: 12px 14px;
  }
  .scelta-azione.viva { border-color: var(--accento); background: #1c1836; }
  .scelta-azione small { display: block; color: var(--fioco); font-weight: 400; margin-top: 3px; }
  ul.voci { list-style: none; margin: 0; padding: 0; }
  ul.voci li {
    border-top: 1px solid var(--bordo); padding: 12px 0;
    display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap;
  }
  ul.voci li:first-child { border-top: 0; }
  .cresce { flex: 1 1 240px; min-width: 0; }
  .titolo { font-weight: 600; }
  .dettaglio { color: var(--tenue); font-size: 13px; overflow-wrap: anywhere; }
  .pallino { font-size: 12px; padding: 3px 9px; border-radius: 99px; border: 1px solid var(--bordo-vivo); color: var(--tenue); white-space: nowrap; }
  .pallino.pronta { color: var(--ok); border-color: var(--ok); }
  .pallino.attesa { color: var(--attesa); border-color: var(--attesa); }
  .pallino.brutto { color: var(--errore); border-color: var(--errore); }
  .vuoto { color: var(--fioco); font-size: 13px; padding: 10px 0; }
  .avviso { margin-top: 12px; font-size: 13px; min-height: 20px; }
  .avviso.male { color: var(--errore); }
  .avviso.bene { color: var(--ok); }
  .nota { color: var(--fioco); font-size: 12px; margin-top: 14px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<header>
  <h1>DaProd Suite</h1>
  <span class="stato" id="stato">—</span>
  <span style="flex:1"></span>
  <button class="secondario" id="scollega" hidden>Scollega</button>
</header>

<main>
  <!-- Prima di tutto: accoppiarsi. Senza token non si vede niente. -->
  <section id="accoppiamento">
    <h2>Collega questo computer</h2>
    <p class="sotto">
      Sul PC dove gira la suite: <b>Da fuori</b>, in fondo all'hub, poi
      <b>Accendi</b> e <b>Invita un padrone</b>. Compare un codice di otto
      cifre: scrivilo qui. Vale una volta sola e dura cinque minuti.
    </p>
    <label for="codice">Codice di otto cifre</label>
    <input id="codice" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="12345678">
    <label for="nome">Come si chiama questo computer</label>
    <input id="nome" maxlength="40" autocomplete="off" placeholder="portatile">
    <div class="fila"><button id="collega">Collega</button></div>
    <div class="avviso" id="avviso-accoppiamento"></div>
  </section>

  <!-- Da qui in giù: solo per chi è accoppiato. -->
  <section id="sezione-azioni" hidden>
    <h2>Chiedi qualcosa alla suite</h2>
    <p class="sotto">Le azioni sono quelle che la suite dichiara. Chi decide resta chi sta al PC.</p>
    <div class="griglia" id="elenco-azioni"></div>
    <form id="modulo" hidden></form>
    <div class="fila" id="fila-manda" hidden>
      <button id="manda">Manda al PC</button>
      <button class="secondario" id="annulla" type="button">Lascia stare</button>
    </div>
    <div class="avviso" id="avviso-azione"></div>
  </section>

  <section id="sezione-coda" hidden>
    <h2>La fila</h2>
    <p class="sotto">Le richieste mandate da qui e dagli altri dispositivi, dalla più recente.</p>
    <ul class="voci" id="coda"></ul>
  </section>

  <section id="sezione-suite" hidden>
    <h2>Cosa sta facendo il PC</h2>
    <ul class="voci" id="attivita"></ul>
    <p class="nota" id="nota-rete"></p>
  </section>
</main>

<script>
(() => {
  "use strict";

  const CHIAVE = "daprod.token";
  const CHIAVE_RUOLO = "daprod.ruolo";
  const $ = (id) => document.getElementById(id);

  let token = localStorage.getItem(CHIAVE) || "";
  let ruolo = localStorage.getItem(CHIAVE_RUOLO) || "ospite";
  let azioni = [];
  let scelta = null;
  let flusso = null;

  /* ------------------------------------------------------------- chiamate */

  async function chiama(percorso, opzioni = {}) {
    const risposta = await fetch(percorso, {
      ...opzioni,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(opzioni.headers || {}),
      },
    });
    const testo = await risposta.text();
    let corpo = null;
    try { corpo = testo ? JSON.parse(testo) : null; } catch { corpo = null; }
    if (!risposta.ok) {
      // 401 vuol dire che il PC non ci riconosce più: il dispositivo è stato
      // revocato, o la suite è stata reinstallata. Si riparte dall'invito.
      if (risposta.status === 401) scollega(true);
      throw new Error((corpo && corpo.errore) || ("Errore " + risposta.status));
    }
    return corpo;
  }

  /* -------------------------------------------------------- accoppiamento */

  async function collega() {
    const codice = $("codice").value.trim();
    const nome = $("nome").value.trim() || "computer";
    const avviso = $("avviso-accoppiamento");
    avviso.className = "avviso";
    if (!/^\\d{8}$/.test(codice)) {
      avviso.textContent = "Il codice è di otto cifre, senza spazi.";
      avviso.className = "avviso male";
      return;
    }
    $("collega").disabled = true;
    try {
      const esito = await chiama("/accoppiamento", {
        method: "POST",
        body: JSON.stringify({ codice, nome }),
      });
      token = esito.token;
      ruolo = (esito.dispositivo && esito.dispositivo.ruolo) || "ospite";
      localStorage.setItem(CHIAVE, token);
      localStorage.setItem(CHIAVE_RUOLO, ruolo);
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
    $("accoppiamento").hidden = false;
    $("sezione-azioni").hidden = true;
    $("sezione-coda").hidden = true;
    $("sezione-suite").hidden = true;
    $("scollega").hidden = true;
    $("stato").textContent = automatico ? "Il PC non ci riconosce più: rifai l'invito." : "Scollegato.";
    $("stato").className = "stato";
  }

  /* ------------------------------------------------------------- le azioni */

  function disegnaAzioni() {
    const elenco = $("elenco-azioni");
    elenco.innerHTML = "";
    for (const a of azioni) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "scelta-azione";
      b.textContent = a.titolo;
      const s = document.createElement("small");
      s.textContent = a.coda ? "occupa la scheda video · va in fila" : "risponde subito";
      b.append(s);
      b.addEventListener("click", () => scegli(a));
      elenco.append(b);
    }
  }

  /** Costruisce il modulo dai campi dichiarati: qui non si sa cosa siano. */
  function scegli(a) {
    scelta = a;
    for (const b of document.querySelectorAll(".scelta-azione")) {
      b.classList.toggle("viva", b.firstChild.textContent === a.titolo);
    }
    const modulo = $("modulo");
    modulo.innerHTML = "";
    const spiega = document.createElement("p");
    spiega.className = "sotto";
    spiega.style.marginTop = "14px";
    spiega.textContent = a.descrizione;
    modulo.append(spiega);

    for (const campo of a.campi) {
      const etichetta = document.createElement("label");
      etichetta.htmlFor = "campo-" + campo.nome;
      etichetta.textContent = campo.etichetta + (campo.obbligatorio ? " *" : "");
      modulo.append(etichetta);

      let controllo;
      if (campo.tipo === "scelta") {
        controllo = document.createElement("select");
        if (!campo.obbligatorio) {
          const vuoto = document.createElement("option");
          vuoto.value = "";
          vuoto.textContent = "— tutte —";
          controllo.append(vuoto);
        }
        for (const s of campo.scelte || []) {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = s;
          controllo.append(o);
        }
      } else if (campo.tipo === "numero") {
        controllo = document.createElement("input");
        controllo.type = "number";
        if (campo.min !== undefined) controllo.min = campo.min;
        if (campo.max !== undefined) controllo.max = campo.max;
      } else if (campo.maxLunghezza && campo.maxLunghezza > 200) {
        controllo = document.createElement("textarea");
        if (campo.esempio) controllo.placeholder = campo.esempio;
      } else {
        controllo = document.createElement("input");
        controllo.type = "text";
        if (campo.esempio) controllo.placeholder = campo.esempio;
      }
      controllo.id = "campo-" + campo.nome;
      controllo.dataset.nome = campo.nome;
      if (campo.predefinito !== undefined) controllo.value = campo.predefinito;
      modulo.append(controllo);

      if (campo.descrizione) {
        const nota = document.createElement("div");
        nota.className = "nota";
        nota.style.marginTop = "4px";
        nota.textContent = campo.descrizione;
        modulo.append(nota);
      }
    }
    modulo.hidden = false;
    $("fila-manda").hidden = false;
    $("avviso-azione").textContent = "";
  }

  async function manda() {
    if (!scelta) return;
    const avviso = $("avviso-azione");
    avviso.className = "avviso";
    const dati = {};
    for (const c of $("modulo").querySelectorAll("[data-nome]")) {
      if (c.value !== "") dati[c.dataset.nome] = c.value;
    }
    $("manda").disabled = true;
    try {
      const esito = await chiama("/azioni/" + encodeURIComponent(scelta.id), {
        method: "POST",
        body: JSON.stringify(dati),
      });
      if (esito.esito === "in-coda") {
        avviso.textContent = "In fila sul PC. Adesso tocca a chi ci sta davanti.";
        avviso.className = "avviso bene";
        chiudiModulo();
      } else {
        avviso.textContent = "";
        avviso.className = "avviso";
        mostraRisultato(esito.risultato);
      }
      await rinfrescaCoda();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("manda").disabled = false;
    }
  }

  function chiudiModulo() {
    scelta = null;
    $("modulo").hidden = true;
    $("modulo").innerHTML = "";
    $("fila-manda").hidden = true;
    for (const b of document.querySelectorAll(".scelta-azione")) b.classList.remove("viva");
  }

  /** Le azioni che leggono rispondono subito: si mostra quel che tornano. */
  function mostraRisultato(risultato) {
    const modulo = $("modulo");
    modulo.innerHTML = "";
    const lista = document.createElement("ul");
    lista.className = "voci";
    const righe = Array.isArray(risultato) ? risultato : [risultato];
    if (righe.length === 0) {
      const vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Niente da mostrare.";
      lista.append(vuoto);
    }
    for (const riga of righe) {
      const li = document.createElement("li");
      const box = document.createElement("div");
      box.className = "cresce";
      const t = document.createElement("div");
      t.className = "titolo";
      t.textContent = riga && riga.nome ? riga.nome : (typeof riga === "string" ? riga : "—");
      const d = document.createElement("div");
      d.className = "dettaglio";
      d.textContent = riga && typeof riga === "object"
        ? Object.entries(riga).filter(([k]) => k !== "nome").map(([k, v]) => k + ": " + v).join(" · ")
        : "";
      box.append(t, d);
      li.append(box);
      lista.append(li);
    }
    modulo.append(lista);
    modulo.hidden = false;
  }

  /* ---------------------------------------------------------------- la fila */

  async function rinfrescaCoda() {
    let richieste;
    try { richieste = await chiama("/richieste"); } catch { return; }
    const coda = $("coda");
    coda.innerHTML = "";
    if (!richieste || richieste.length === 0) {
      const vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Ancora niente in fila.";
      coda.append(vuoto);
      return;
    }
    for (const r of richieste.slice(0, 40)) {
      const li = document.createElement("li");
      const box = document.createElement("div");
      box.className = "cresce";
      const t = document.createElement("div");
      t.className = "titolo";
      t.textContent = r.tipo + " · " + r.app;
      const d = document.createElement("div");
      d.className = "dettaglio";
      d.textContent = r.testo;
      const q = document.createElement("div");
      q.className = "nota";
      q.textContent = "da " + r.daNome + " · " + new Date(r.quando).toLocaleString("it-IT")
        + (r.motivoScarto ? " · " + r.motivoScarto : "");
      box.append(t, d, q);

      const stato = document.createElement("span");
      stato.className = "pallino " + (
        r.stato === "pronta" ? "pronta" :
        r.stato === "in-attesa" || r.stato === "in-lavoro" ? "attesa" :
        r.stato === "scartata" || r.stato === "scaduta" ? "brutto" : ""
      );
      stato.textContent = r.stato.replace("-", " ");

      li.append(box, stato);

      if (r.stato === "pronta" && r.risultato) {
        const scarica = document.createElement("button");
        scarica.className = "secondario";
        scarica.textContent = "Scarica";
        scarica.addEventListener("click", () => scaricaFile(r.risultato));
        li.append(scarica);
      }
      if (ruolo === "admin" && r.stato === "in-attesa") {
        for (const [testo, nuovo] of [["Accetta", "accettata"], ["Scarta", "scartata"]]) {
          const b = document.createElement("button");
          b.className = "secondario";
          b.textContent = testo;
          b.addEventListener("click", async () => {
            await chiama("/richieste/" + r.id + "/stato", {
              method: "POST",
              body: JSON.stringify({ stato: nuovo }),
            }).catch(() => {});
            rinfrescaCoda();
          });
          li.append(b);
        }
      }
      coda.append(li);
    }
  }

  /**
   * Scaricare col token nell'header: un link normale non lo porterebbe, quindi
   * si prende il file a mano e lo si passa al browser come file locale.
   */
  async function scaricaFile(risultato) {
    const risposta = await fetch("/risultati/" + encodeURIComponent(risultato.nome), {
      headers: { Authorization: "Bearer " + token },
    });
    if (!risposta.ok) return;
    const blob = await risposta.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = risultato.nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  /* ---------------------------------------------------------- lo stato vivo */

  function disegnaStato(s) {
    $("stato").textContent = s.computer + " · v" + s.versione;
    $("stato").className = "stato acceso";
    const lista = $("attivita");
    lista.innerHTML = "";
    if (!s.attivita || s.attivita.length === 0) {
      const vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Nessuna app accesa in questo momento.";
      lista.append(vuoto);
    }
    for (const a of s.attivita || []) {
      const li = document.createElement("li");
      const box = document.createElement("div");
      box.className = "cresce";
      const t = document.createElement("div");
      t.className = "titolo";
      t.textContent = a.nome || a.app;
      const d = document.createElement("div");
      d.className = "dettaglio";
      d.textContent = a.dettaglio || "";
      box.append(t, d);
      const p = document.createElement("span");
      p.className = "pallino";
      p.textContent = a.stato;
      li.append(box, p);
      lista.append(li);
    }
    if (s.coda) {
      $("nota-rete").textContent =
        "In fila: " + s.coda.attesa + " in attesa, " + s.coda.lavoro + " in lavorazione, "
        + s.coda.pronte + (s.coda.pronte === 1 ? " pronta" : " pronte")
        + ". Collegamento in rete locale, non cifrato.";
    }
  }

  /** Lo stato arriva in streaming; se il flusso cade, si riprova. */
  function apriFlusso() {
    if (flusso) flusso.close();
    // EventSource non sa mettere header: il token va in query, e solo qui
    // (stessa origine, stessa rete locale della pagina che l'ha già in mano).
    flusso = new EventSource("/stato/stream?token=" + encodeURIComponent(token));
    flusso.onmessage = (ev) => {
      try { disegnaStato(JSON.parse(ev.data)); } catch {}
    };
    flusso.onerror = () => {
      $("stato").textContent = "PC non raggiungibile";
      $("stato").className = "stato";
    };
  }

  /* ------------------------------------------------------------- l'ingresso */

  async function entra() {
    $("accoppiamento").hidden = true;
    $("sezione-azioni").hidden = false;
    $("sezione-coda").hidden = false;
    $("sezione-suite").hidden = false;
    $("scollega").hidden = false;
    azioni = await chiama("/azioni");
    disegnaAzioni();
    await rinfrescaCoda();
    apriFlusso();
    // La fila cambia per decisioni prese sul PC: si rilegge ogni tanto.
    setInterval(rinfrescaCoda, 15000);
  }

  $("collega").addEventListener("click", collega);
  $("codice").addEventListener("keydown", (e) => { if (e.key === "Enter") collega(); });
  $("manda").addEventListener("click", manda);
  $("annulla").addEventListener("click", chiudiModulo);
  $("scollega").addEventListener("click", () => scollega(false));

  if (token) {
    entra().catch(() => scollega(true));
  } else {
    $("stato").textContent = "Non collegato";
  }
})();
</script>
</body>
</html>
`;
