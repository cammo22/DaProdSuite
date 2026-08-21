/**
 * Che forma ha il video, e quanto è grande.
 *
 * È il gemello di `apps/foto/src/formato.js`, e di proposito: **la stessa scelta
 * si fa nello stesso modo** in tutte le schede della suite. Due file di pulsanti
 * — la forma e la risoluzione — con i pixel veri scritti accanto, perché è
 * quello il numero che decide il tempo di attesa.
 *
 * L'unica differenza con Foto sono le misure, che qui sono multiple di 32 invece
 * che di 16 (vedi `MISURE` in `grafi.js`) e che qui costano molto di più: una
 * foto in 1080p sono secondi, un video in 1080p su una scheda da 8 GB è una
 * pausa pranzo. Per questo la riga sotto dice anche quanto costa.
 */

import { el } from "./dom.js";
import { FORME, MISURE, RISOLUZIONI } from "./grafi.js";

const RICORDO_FORMA = "daprod.cinema.forma";
const RICORDO_RIS = "daprod.cinema.risoluzione";

let forma = "16:9";
let risoluzione = "480";

/** Le misure scelte adesso: quello che il grafo chiede al motore. */
export function misuraScelta() {
  const [larghezza, altezza] = MISURE[forma][risoluzione];
  return { larghezza, altezza, forma, risoluzione, etichetta: `${larghezza}x${altezza}` };
}

/**
 * Quanto pesa questa misura rispetto al 480, in pixel per fotogramma.
 *
 * Non è una stima del tempo — quella dipende dalla scheda, dal modello e da cosa
 * c'è già in memoria — ma è la sola cosa onesta che si possa dire prima di
 * premere: il lavoro cresce con i pixel, e in 1080p sono quattro volte tanti.
 */
function quantoCosta() {
  const [l, a] = MISURE[forma][risoluzione];
  const [l0, a0] = MISURE[forma]["480"];
  const volte = (l * a) / (l0 * a0);
  return volte < 1.15 ? "" : ` — circa ${volte.toFixed(1).replace(".", ",")}x il lavoro del 480`;
}

function disegna() {
  const misura = misuraScelta();
  el.misura.textContent = `${misura.larghezza} x ${misura.altezza} px${quantoCosta()}`;

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
