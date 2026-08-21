/**
 * Da cosa parte il video, oltre al testo.
 *
 * È il pezzo che cambia di più fra i due modelli, ed è il motivo per cui sta in
 * un modulo suo invece che dentro a `crea.js`:
 *
 * - **LTX 2.5** vuole al massimo due immagini con un posto preciso: il **primo**
 *   fotogramma e l'**ultimo**. Dagli tutti e due e il video è il viaggio da una
 *   all'altra; dagli solo il primo e parte da lì; non dargli niente e se lo
 *   inventa dal testo.
 * - **MiniMax H3** vuole dei **riferimenti**, che è un'altra cosa: non «comincia
 *   così», ma «questa è la faccia, questo è il posto, questo è il movimento,
 *   questa è la voce». Fino a nove immagini, tre video e tre audio — e sono
 *   **tutti facoltativi**: senza niente, H3 genera dal solo testo come fa LTX.
 *
 * **Fino alla 0.4.2 senza riferimenti H3 non partiva**, e non perché non
 * potesse: era questa app a fermarlo, per non far spendere quaranta GB di
 * modello a fare quello che LTX fa con ventitré. Era una decisione presa al
 * posto di chi la suite la usa, ed era anche sbagliata nei fatti: il testo H3 lo
 * legge con un Qwen3-VL da 32B, e c'è chi lo vuole proprio per quello. Adesso il
 * consiglio resta scritto sotto ai riquadri, e il tasto Genera funziona.
 *
 * **Le etichette sono la parte che conta.** H3 non indovina a cosa serve ogni
 * riferimento: bisogna dirglielo nel prompt, chiamandoli per nome — `<Picture 1>`,
 * `<Video 1>`, `<Audio 1>`. Il nodo li numera per tipo e a partire da uno, con
 * una regola che a mente non si tiene: la colonna sonora di un video prende un
 * numero d'audio **prima** degli audio sciolti. Quindi l'etichetta la scrive
 * l'app accanto a ogni riquadro, e cliccandola finisce nel prompt dove hai il
 * cursore.
 *
 * Qui dentro i file restano `File` del browser, non ancora caricati: nel motore
 * ci vanno solo al momento di generare (`caricaIngressi`), perché caricare un
 * video da 30 MB per poi cambiare idea è tempo buttato.
 */

import { el, escapeHtml, inserisciAlCursore, mostraErrore } from "./dom.js";
import * as ponte from "./ponte.js";

/** Quanti ne accetta il nodo `MiniMaxH3ReferenceToVideo`, gruppo per gruppo. */
const MASSIMI = { immagini: 9, video: 3, audio: 3 };

/**
 * Quello che c'è adesso nei riquadri.
 *
 * `fotogrammi` è di LTX e `immagini`/`video`/`audio` sono di H3: si tengono
 * separati e non si svuotano cambiando modello, così andare a vedere com'è
 * l'altro e tornare indietro non fa perdere quello che avevi messo.
 */
const roba = {
  primo: null,
  ultimo: null,
  immagini: [],
  video: [],
  audio: [],
};

let modelloOra = null;
/** Chiamata quando il contenuto cambia: serve a `crea.js` per riscrivere gli aiuti. */
let alCambio = () => {};

/* ------------------------------------------------------------- le etichette */

/**
 * Come si chiamano, nel prompt, i riferimenti che ci sono adesso.
 *
 * Segue l'ordine con cui `MiniMaxH3ReferenceToVideo` li presenta al modello:
 * prima le immagini, poi i video — e la colonna sonora di un video prende il suo
 * numero d'audio **subito prima** del video a cui appartiene — poi gli audio
 * sciolti. Sbagliare questo conto vuol dire scrivere `<Audio 1>` nel prompt
 * pensando alla voce e ottenere il rumore di un altro video.
 */
function etichette() {
  const fuori = { immagini: [], video: [], audio: [] };
  let n = 1;
  roba.immagini.forEach(() => fuori.immagini.push(`<Picture ${n++}>`));

  let v = 1;
  let a = 1;
  roba.video.forEach((clip) => {
    fuori.video.push({
      video: `<Video ${v++}>`,
      audio: clip.conAudio ? `<Audio ${a++}>` : null,
    });
  });
  roba.audio.forEach(() => fuori.audio.push(`<Audio ${a++}>`));
  return fuori;
}

/* ----------------------------------------------------------- leggere i file */

/**
 * Sceglie un file dal disco.
 *
 * Un `<input type=file>` creato al volo e non uno fisso nella pagina: i riquadri
 * sono fino a quindici e ognuno vuole i suoi tipi accettati, e quindici caselle
 * nascoste nell'HTML sarebbero quindici id da tenere allineati per niente.
 */
function scegliFile(accetta, multiplo = false) {
  return new Promise((risolvi) => {
    const casella = document.createElement("input");
    casella.type = "file";
    casella.accept = accetta;
    casella.multiple = multiplo;
    casella.onchange = () => risolvi([...(casella.files ?? [])]);
    casella.click();
  });
}

const anteprima = (file) => URL.createObjectURL(file);

/** In quale dei tre gruppi di H3 può stare questo file, se in nessuno `null`. */
const gruppoDi = (file) =>
  file.type.startsWith("image/")
    ? "immagini"
    : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : null;

/* -------------------------------------------------------------- i riquadri */

/** Un riquadro con dentro qualcosa, o vuoto e da riempire. */
function riquadro({ chiave, titolo, file, etichetta, tipo, extra = "" }) {
  if (!file) {
    return `<button type="button" class="slot vuoto" data-metti="${chiave}">
      <span class="piu">+</span><span class="che">${escapeHtml(titolo)}</span>
    </button>`;
  }

  const media =
    tipo === "video"
      ? `<video src="${anteprima(file)}" muted loop autoplay playsinline></video>`
      : tipo === "audio"
        ? `<span class="nota">&#9835;</span>`
        : `<img src="${anteprima(file)}" alt="">`;

  return `<div class="slot pieno">
    <div class="vista">${media}</div>
    <div class="dettagli">
      ${etichetta ? `<button type="button" class="tag" data-tag="${escapeHtml(etichetta)}" title="mettilo nel prompt">${escapeHtml(etichetta)}</button>` : `<div class="tag fisso">${escapeHtml(titolo)}</div>`}
      <div class="nome" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
      ${extra}
    </div>
    <button type="button" class="via" data-togli="${chiave}" title="togli">&#10005;</button>
  </div>`;
}

/** I due fotogrammi di LTX. */
function disegnaFotogrammi() {
  return `
    <div class="hint">Facoltativi tutti e due. Con il solo <b>primo</b> il video parte da lì;
      con tutti e due diventa il passaggio da una immagine all'altra; senza niente
      se lo inventa dal testo. Le immagini vengono adattate alla misura scelta qui sotto.</div>
    <div class="slots due">
      ${riquadro({ chiave: "primo", titolo: "Primo fotogramma", file: roba.primo, tipo: "immagine" })}
      ${riquadro({ chiave: "ultimo", titolo: "Ultimo fotogramma", file: roba.ultimo, tipo: "immagine" })}
    </div>`;
}

/** Le tre famiglie di riferimenti di H3. */
function disegnaRiferimenti() {
  const tag = etichette();

  const immagini = roba.immagini.map((file, i) =>
    riquadro({ chiave: `immagini:${i}`, titolo: "Immagine", file, etichetta: tag.immagini[i], tipo: "immagine" }),
  );
  if (roba.immagini.length < MASSIMI.immagini) {
    immagini.push(riquadro({ chiave: "immagini:+", titolo: "Immagine", file: null }));
  }

  const video = roba.video.map((clip, i) =>
    riquadro({
      chiave: `video:${i}`,
      titolo: "Video",
      file: clip.file,
      etichetta: tag.video[i].video,
      tipo: "video",
      extra: `<label class="switch mini-switch">
        <input type="checkbox" data-audio-di="${i}"${clip.conAudio ? " checked" : ""}>
        anche il suo audio${tag.video[i].audio ? ` <b>${escapeHtml(tag.video[i].audio)}</b>` : ""}
      </label>`,
    }),
  );
  if (roba.video.length < MASSIMI.video) {
    video.push(riquadro({ chiave: "video:+", titolo: "Video", file: null }));
  }

  const audio = roba.audio.map((file, i) =>
    riquadro({ chiave: `audio:${i}`, titolo: "Audio", file, etichetta: tag.audio[i], tipo: "audio" }),
  );
  if (roba.audio.length < MASSIMI.audio) {
    audio.push(riquadro({ chiave: "audio:+", titolo: "Audio", file: null }));
  }

  return `
    <div class="hint">Tutti facoltativi, <b>anche tutti insieme</b>: senza niente qui dentro
      H3 genera dal solo testo. <b>Quelli che metti vanno chiamati per nome nel prompt</b> —
      clicca l'etichetta e te la scrivo dove hai il cursore: &laquo;the woman in
      <b>&lt;Picture 1&gt;</b> walks through <b>&lt;Picture 2&gt;</b>, camera moves like
      <b>&lt;Video 1&gt;</b>&raquo;. Senza nominarli, il modello riceve dei file e nessuna
      istruzione su cosa prendere da quale.</div>

    <div class="gruppo-rif"><h3>Immagini <span>fino a 9 &middot; una faccia, un posto, un oggetto</span></h3>
      <div class="slots">${immagini.join("")}</div></div>

    <div class="gruppo-rif"><h3>Video <span>fino a 3 &middot; da 2 a 15 secondi, a 24 fotogrammi al secondo</span></h3>
      <div class="slots">${video.join("")}</div></div>

    <div class="gruppo-rif"><h3>Audio <span>fino a 3 &middot; una voce da imitare, un ambiente, della musica</span></h3>
      <div class="slots">${audio.join("")}</div></div>

    <label class="switch"><input type="checkbox" id="fedelta"> Massima fedeltà alle immagini di riferimento</label>
    <div class="hint">Le manda al modello a piena risoluzione invece che ridotte alla misura del
      video. Somiglia di più, e ci mette parecchio di più: quei pixel ripassano
      dentro al modello a ogni passo.</div>

    ${quantiRiferimenti() === 0 ? consiglioSenzaRiferimenti() : ""}`;
}

/**
 * Il consiglio quando i riquadri sono vuoti. **Un consiglio, non un divieto.**
 *
 * H3 dal solo testo funziona: quello che non funziona è il conto delle ore. Sono
 * quarantun GB di modello per fare quello che LTX fa con ventitré, ed è giusto
 * dirlo — una volta, dove si guarda, senza spegnere niente.
 */
function consiglioSenzaRiferimenti() {
  return `<div class="hint consiglio">Nessun riferimento: H3 genererà <b>dal solo testo</b>, e va bene.
    Sappi solo che così stai usando quarantun GB di modello per una cosa che
    <b>LTX 2.5</b> fa con ventitré, in molto meno tempo. I riferimenti sono il motivo
    per cui H3 sta qui.</div>`;
}

/* --------------------------------------------------------------- il disegno */

function disegna() {
  const perFotogrammi = modelloOra?.ingressi === "fotogrammi";
  el.titoloIngressi.textContent = perFotogrammi ? "Da dove parte" : "I riferimenti";
  el.ingressi.innerHTML = perFotogrammi ? disegnaFotogrammi() : disegnaRiferimenti();

  const fedelta = document.getElementById("fedelta");
  if (fedelta) {
    fedelta.checked = roba.fedelta === true;
    fedelta.onchange = () => (roba.fedelta = fedelta.checked);
  }

  for (const b of el.ingressi.querySelectorAll("[data-metti]")) {
    b.onclick = () => void metti(b.dataset.metti);
  }
  for (const b of el.ingressi.querySelectorAll("[data-togli]")) {
    b.onclick = () => togli(b.dataset.togli);
  }
  for (const b of el.ingressi.querySelectorAll("[data-tag]")) {
    b.onclick = () => inserisciAlCursore(el.prompt, ` ${b.dataset.tag} `);
  }
  for (const c of el.ingressi.querySelectorAll("[data-audio-di]")) {
    c.onchange = () => {
      roba.video[Number(c.dataset.audioDi)].conAudio = c.checked;
      disegna();
    };
  }

  alCambio();
}

const ACCETTA = {
  immagine: "image/*",
  video: "video/*",
  audio: "audio/*",
};

async function metti(chiave) {
  if (chiave === "primo" || chiave === "ultimo") {
    const [file] = await scegliFile(ACCETTA.immagine);
    if (file) roba[chiave] = file;
    return disegna();
  }

  const [gruppo] = chiave.split(":");
  const quanti = MASSIMI[gruppo] - roba[gruppo].length;
  if (quanti <= 0) return;

  const tipo = gruppo === "immagini" ? "immagine" : gruppo === "video" ? "video" : "audio";
  // Multiplo: nove riquadri riempiti uno per volta sono nove finestre di
  // sistema, e chi ha una cartella di riferimenti li prende tutti insieme.
  const scelti = (await scegliFile(ACCETTA[tipo], true)).slice(0, quanti);
  if (!scelti.length) return;

  if (gruppo === "video") roba.video.push(...scelti.map((file) => ({ file, conAudio: false })));
  else roba[gruppo].push(...scelti);
  disegna();
}

function togli(chiave) {
  if (chiave === "primo" || chiave === "ultimo") roba[chiave] = null;
  else {
    const [gruppo, dove] = chiave.split(":");
    roba[gruppo].splice(Number(dove), 1);
  }
  disegna();
}

/* ------------------------------------------------------------- verso fuori */

/** Vero se c'è almeno un riferimento: serve a scrivere gli aiuti giusti. */
export const quantiRiferimenti = () =>
  roba.immagini.length + roba.video.length + roba.audio.length;

/**
 * Mette nel motore quello che c'è nei riquadri, e torna i nomi per il grafo.
 *
 * Si fa adesso e non prima perché un file caricato e poi scartato è tempo di
 * disco per niente. `ponte.carica` scrive nella cartella `input` del motore, che
 * è l'unico posto da cui `LoadImage`, `LoadVideo` e `LoadAudio` sanno leggere.
 */
export async function caricaIngressi(m, racconta = () => {}) {
  const quanti =
    m.ingressi === "fotogrammi"
      ? [roba.primo, roba.ultimo].filter(Boolean).length
      : quantiRiferimenti();
  if (quanti) racconta(quanti === 1 ? "carico il riferimento..." : `carico i ${quanti} riferimenti...`);

  // Un nome che non collida con quello di ieri: lo stesso file scelto due volte
  // con `overwrite` acceso andrebbe bene, due file diversi con lo stesso nome no.
  const marca = Date.now().toString(36);
  const dentro = (file, i) => ponte.carica(file, `${marca}_${i}_${file.name}`);

  if (m.ingressi === "fotogrammi") {
    return {
      primoFotogramma: roba.primo ? await dentro(roba.primo, "a") : undefined,
      ultimoFotogramma: roba.ultimo ? await dentro(roba.ultimo, "z") : undefined,
    };
  }

  const immagini = [];
  for (const [i, file] of roba.immagini.entries()) immagini.push(await dentro(file, `i${i}`));

  const video = [];
  for (const [i, clip] of roba.video.entries()) {
    video.push({ file: await dentro(clip.file, `v${i}`), conAudio: clip.conAudio });
  }

  const audio = [];
  for (const [i, file] of roba.audio.entries()) audio.push(await dentro(file, `s${i}`));

  return { immagini, video, audio, fedelta: roba.fedelta === true };
}

/**
 * Un file che arriva da fuori dai riquadri: la galleria, un'altra app.
 *
 * Torna `null` se è entrato, o una frase da mostrare se non poteva entrare.
 * Passa dallo stesso smistamento del trascinamento, perché è la stessa cosa: un
 * file che entra e va messo dove può stare.
 */
export function aggiungiRiferimento(file) {
  if (!modelloOra) return "La scheda non è ancora pronta: riprova fra un istante.";

  const gruppo = gruppoDi(file);
  if (!gruppo) return `"${file.name}" non è un'immagine, un video o un audio.`;

  if (modelloOra.ingressi === "fotogrammi") {
    if (gruppo !== "immagini") {
      return "LTX 2.5 prende solo due immagini, il primo e l'ultimo fotogramma. Per usare un video o un audio come riferimento scegli MiniMax H3 nel menu dei modelli.";
    }
    if (roba.primo && roba.ultimo) return "Primo e ultimo fotogramma ci sono già: togline uno.";
    if (!roba.primo) roba.primo = file;
    else roba.ultimo = file;
    disegna();
    return null;
  }

  if (roba[gruppo].length >= MASSIMI[gruppo]) {
    return `Di ${gruppo} il modello ne prende ${MASSIMI[gruppo]}, e ci sono già tutti.`;
  }
  if (gruppo === "video") roba.video.push({ file, conAudio: false });
  else roba[gruppo].push(file);
  disegna();
  return null;
}

export function collegaIngressi(m, quandoCambia = () => {}) {
  alCambio = quandoCambia;
  modelloOra = m;

  // Trascinare un file sopra al pannello vale come cliccare il riquadro giusto.
  // I tipi li smista il browser: quello che arriva finisce dove può stare.
  el.ingressi.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    el.ingressi.classList.add("sopra");
  });
  el.ingressi.addEventListener("dragleave", () => el.ingressi.classList.remove("sopra"));
  el.ingressi.addEventListener("drop", (ev) => {
    ev.preventDefault();
    el.ingressi.classList.remove("sopra");
    accogli([...(ev.dataTransfer?.files ?? [])]);
  });

  disegna();
}

/** Rifà i riquadri per il modello appena scelto. */
export function ingressiPer(m) {
  modelloOra = m;
  disegna();
}

/**
 * I file trascinati dentro, messi dove possono stare.
 *
 * Con LTX il primo posto libero è il primo fotogramma e poi l'ultimo: è l'ordine
 * in cui uno li pensa. Con H3 vanno nel gruppo del loro tipo, e se quel gruppo è
 * pieno si dice invece di buttarli via in silenzio.
 */
function accogli(files) {
  if (!files.length || !modelloOra) return;

  if (modelloOra.ingressi === "fotogrammi") {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (!roba.primo) roba.primo = file;
      else if (!roba.ultimo) roba.ultimo = file;
    }
    return disegna();
  }

  const pieni = [];
  for (const file of files) {
    const gruppo = gruppoDi(file);
    if (!gruppo) continue;
    if (roba[gruppo].length >= MASSIMI[gruppo]) {
      if (!pieni.includes(gruppo)) pieni.push(gruppo);
      continue;
    }
    if (gruppo === "video") roba.video.push({ file, conAudio: false });
    else roba[gruppo].push(file);
  }
  if (pieni.length) {
    mostraErrore(
      pieni.map((g) => `Di ${g} il modello ne prende ${MASSIMI[g]}, e ci sono già tutti.`).join(" "),
    );
  }
  disegna();
}
