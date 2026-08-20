/**
 * Che forma ha l'immagine, e quanto è grande.
 *
 * Erano un menu con cinque voci scritte a parole («Verticale 2:3», «Veloce
 * 768»): per cambiare formato servivano due clic, e per sapere quanto ci
 * avrebbe messo bisognava conoscere a memoria cosa voleva dire ogni voce.
 * Adesso sono due file di pulsanti — **la forma** e **la risoluzione** — e i
 * pixel veri stanno scritti accanto, perché è quello il numero che decide il
 * tempo di attesa.
 *
 * **Perché 1080 diventa 1088.** I modelli di immagini non lavorano sui pixel:
 * lavorano su un latente più piccolo di otto volte, e ci passano sopra a
 * quadretti di due — quindi le misure devono essere multiple di 16. 1080 non lo
 * è (1080 ÷ 16 = 67,5), e chiedere 1080 vuol dire farsi tagliare o allargare la
 * misura dal motore senza saperlo. 1088 sì, ed è la stessa immagine con otto
 * pixel in più. Per questo il pulsante dice «1080p» e la riga accanto dice la
 * verità.
 */

import { el } from "./dom.js";

/** Le forme, nell'ordine in cui si usano. */
const FORME = ["16:9", "9:16", "4:3", "1:1"];

/** Le risoluzioni: l'id con cui si ricordano, e l'etichetta che si legge. */
const RISOLUZIONI = [
  { id: "480", etichetta: "480" },
  { id: "720", etichetta: "720" },
  { id: "1080", etichetta: "1080p" },
];

/**
 * Le misure vere, scritte una per una invece che calcolate.
 *
 * Un conto con l'arrotondamento a 16 darebbe numeri giusti ma strani —
 * 1936×1088 per un 16:9 — e questi sono i formati che chiunque riconosce:
 * 1280×720 è 1280×720. Tutti multipli di 16.
 */
const MISURE = {
  "16:9": { 480: [848, 480], 720: [1280, 720], 1080: [1920, 1088] },
  "9:16": { 480: [480, 848], 720: [720, 1280], 1080: [1088, 1920] },
  "4:3": { 480: [640, 480], 720: [960, 720], 1080: [1440, 1088] },
  "1:1": { 480: [480, 480], 720: [720, 720], 1080: [1088, 1088] },
};

const RICORDO_FORMA = "daprod.foto.forma";
const RICORDO_RIS = "daprod.foto.risoluzione";

let forma = "1:1";
let risoluzione = "1080";

/** Le misure scelte adesso: quello che chiede il grafo al motore. */
export function misuraScelta() {
  const [larghezza, altezza] = MISURE[forma][risoluzione];
  return { larghezza, altezza, etichetta: `${larghezza}x${altezza}` };
}

function disegna() {
  const misura = misuraScelta();
  el.misura.textContent = `${misura.larghezza} × ${misura.altezza} px`;

  for (const b of el.formati.children) b.classList.toggle("on", b.dataset.forma === forma);
  for (const b of el.risoluzioni.children) b.classList.toggle("on", b.dataset.ris === risoluzione);
}

export function collegaFormato() {
  // Quello che avevi scelto l'ultima volta: chi lavora in verticale ci lavora
  // tutto il pomeriggio, e rimetterlo a ogni riapertura è una seccatura.
  const forse = localStorage.getItem(RICORDO_FORMA);
  if (MISURE[forse]) forma = forse;
  const forseRis = localStorage.getItem(RICORDO_RIS);
  if (MISURE[forma][forseRis]) risoluzione = forseRis;

  el.formati.innerHTML = FORME.map(
    (f) => `<button type="button" class="mini" data-forma="${f}">${f}</button>`,
  ).join("");

  el.risoluzioni.innerHTML = RISOLUZIONI.map(
    (r) => `<button type="button" class="mini" data-ris="${r.id}">${r.etichetta}</button>`,
  ).join("");

  for (const b of el.formati.children) {
    b.onclick = () => {
      forma = b.dataset.forma;
      localStorage.setItem(RICORDO_FORMA, forma);
      disegna();
    };
  }
  for (const b of el.risoluzioni.children) {
    b.onclick = () => {
      risoluzione = b.dataset.ris;
      localStorage.setItem(RICORDO_RIS, risoluzione);
      disegna();
    };
  }

  disegna();
}
