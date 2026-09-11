/**
 * Da dove parte il video, oltre al testo: il **primo** e l'**ultimo**
 * fotogramma.
 *
 * Sono due immagini con un posto preciso. Dagli tutte e due e il video è il
 * viaggio da una all'altra; dagli solo il primo e parte da lì; non dargli niente
 * e se lo inventa dal testo. Tutte e due facoltative.
 *
 * ⚠ **Qui dentro c'erano anche i riferimenti di MiniMax H3**, e sono usciti
 * l'11 settembre 2026 insieme al modello: nove immagini, tre video e tre audio da
 * dare in pasto, ognuno con la sua etichetta da chiamare nel prompt
 * (`<Picture 1>`, `<Video 1>`, `<Audio 1>`). Era la metà lunga di questo file.
 *
 * Non è stato tolto perché funzionasse male: erano 41,6 GB di modello, e Cammo
 * ha detto «togliamo i modelli minimax h3 e minimax musica… e alleggeriamo
 * molto». Il giorno che H3 torna, tornano insieme il modello, il grafo `ref2va` e
 * questi riquadri — e allora questo file torna a distinguere fra due modi di
 * dare qualcosa in pasto, invece di conoscerne uno solo.
 *
 * ⚠ **Sta ancora in un modulo suo**, e non è pigrizia: caricare i file nel
 * motore è un mestiere a parte da «monta il grafo e chiedi», ed è la cosa che
 * `crea.js` e `lungo.js` chiamano tutti e due (`caricaIngressi`).
 *
 * Qui dentro i file restano `File` del browser, non ancora caricati: nel motore
 * ci vanno solo al momento di generare, perché caricare un'immagine per poi
 * cambiare idea è tempo buttato.
 */

import { el, escapeHtml } from "./dom.js";
import * as ponte from "./ponte.js";

/** Quello che c'è adesso nei due riquadri. */
const roba = {
  primo: null,
  ultimo: null,
};

/** Chiamata quando il contenuto cambia: serve a `crea.js` per riscrivere gli aiuti. */
let alCambio = () => {};

/* ----------------------------------------------------------- leggere i file */

/**
 * Sceglie un file dal disco.
 *
 * Un `<input type=file>` creato al volo e non uno fisso nella pagina: così i
 * riquadri non si portano dietro degli id da tenere allineati nell'HTML per
 * niente.
 */
function scegliFile(accetta) {
  return new Promise((risolvi) => {
    const casella = document.createElement("input");
    casella.type = "file";
    casella.accept = accetta;
    casella.onchange = () => risolvi([...(casella.files ?? [])]);
    casella.click();
  });
}

const anteprima = (file) => URL.createObjectURL(file);

/* -------------------------------------------------------------- i riquadri */

/** Un riquadro con dentro un'immagine, o vuoto e da riempire. */
function riquadro({ chiave, titolo, file }) {
  if (!file) {
    return `<button type="button" class="slot vuoto" data-metti="${chiave}">
      <span class="piu">+</span><span class="che">${escapeHtml(titolo)}</span>
    </button>`;
  }

  return `<div class="slot pieno">
    <div class="vista"><img src="${anteprima(file)}" alt=""></div>
    <div class="dettagli">
      <div class="tag fisso">${escapeHtml(titolo)}</div>
      <div class="nome" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
    </div>
    <button type="button" class="via" data-togli="${chiave}" title="togli">&#10005;</button>
  </div>`;
}

/* --------------------------------------------------------------- il disegno */

function disegna() {
  el.titoloIngressi.textContent = "Da dove parte";
  el.ingressi.innerHTML = `
    <div class="hint">Facoltativi tutti e due. Con il solo <b>primo</b> il video parte da lì;
      con tutti e due diventa il passaggio da una immagine all'altra; senza niente
      se lo inventa dal testo. Le immagini vengono adattate alla misura scelta qui sotto.</div>
    <div class="slots due">
      ${riquadro({ chiave: "primo", titolo: "Primo fotogramma", file: roba.primo })}
      ${riquadro({ chiave: "ultimo", titolo: "Ultimo fotogramma", file: roba.ultimo })}
    </div>`;

  for (const b of el.ingressi.querySelectorAll("[data-metti]")) {
    b.onclick = () => void metti(b.dataset.metti);
  }
  for (const b of el.ingressi.querySelectorAll("[data-togli]")) {
    b.onclick = () => togli(b.dataset.togli);
  }

  alCambio();
}

async function metti(chiave) {
  const [file] = await scegliFile("image/*");
  if (file) roba[chiave] = file;
  disegna();
}

function togli(chiave) {
  roba[chiave] = null;
  disegna();
}

/* ------------------------------------------------------------- verso fuori */

/** Quante immagini ci sono nei riquadri: zero, una o due. */
export const quantiFotogrammi = () => [roba.primo, roba.ultimo].filter(Boolean).length;

/**
 * Mette nel motore quello che c'è nei riquadri, e torna i nomi per il grafo.
 *
 * Si fa adesso e non prima perché un file caricato e poi scartato è tempo di
 * disco per niente. `ponte.carica` scrive nella cartella `input` del motore, che
 * è l'unico posto da cui `LoadImage` sa leggere.
 */
export async function caricaIngressi(racconta = () => {}) {
  const quanti = quantiFotogrammi();
  if (quanti) racconta(quanti === 1 ? "carico il fotogramma..." : "carico i due fotogrammi...");

  // Un nome che non collida con quello di ieri: lo stesso file scelto due volte
  // con `overwrite` acceso andrebbe bene, due file diversi con lo stesso nome no.
  const marca = Date.now().toString(36);
  const dentro = (file, i) => ponte.carica(file, `${marca}_${i}_${file.name}`);

  return {
    primoFotogramma: roba.primo ? await dentro(roba.primo, "a") : undefined,
    ultimoFotogramma: roba.ultimo ? await dentro(roba.ultimo, "z") : undefined,
  };
}

/**
 * Un'immagine che arriva da fuori dai riquadri: la galleria, un'altra app.
 *
 * Torna `null` se è entrata, o una frase da mostrare se non poteva entrare.
 * Passa dallo stesso smistamento del trascinamento, perché è la stessa cosa: un
 * file che entra e va messo dove può stare.
 *
 * ⚠ **Prima accettava anche video e audio**, che finivano fra i riferimenti di
 * MiniMax H3. Senza H3 non c'è più un posto dove metterli, e lo si dice: un file
 * scartato in silenzio è peggio di un no.
 */
export function aggiungiFotogramma(file) {
  if (!file.type.startsWith("image/")) {
    return `"${file.name}" non è un'immagine. Qui entrano il primo e l'ultimo fotogramma, e sono due immagini.`;
  }
  if (roba.primo && roba.ultimo) return "Primo e ultimo fotogramma ci sono già: togline uno.";
  if (!roba.primo) roba.primo = file;
  else roba.ultimo = file;
  disegna();
  return null;
}

export function collegaIngressi(quandoCambia = () => {}) {
  alCambio = quandoCambia;

  // Trascinare un file sopra al pannello vale come cliccare il riquadro giusto:
  // il primo posto libero è il primo fotogramma e poi l'ultimo, che è l'ordine
  // in cui uno li pensa.
  el.ingressi.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    el.ingressi.classList.add("sopra");
  });
  el.ingressi.addEventListener("dragleave", () => el.ingressi.classList.remove("sopra"));
  el.ingressi.addEventListener("drop", (ev) => {
    ev.preventDefault();
    el.ingressi.classList.remove("sopra");
    for (const file of [...(ev.dataTransfer?.files ?? [])]) {
      if (!file.type.startsWith("image/")) continue;
      if (!roba.primo) roba.primo = file;
      else if (!roba.ultimo) roba.ultimo = file;
    }
    disegna();
  });

  disegna();
}
