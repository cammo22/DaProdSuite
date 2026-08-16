/**
 * Il lettore in fondo alla finestra.
 *
 * La coda d'ascolto è la libreria: a fine brano parte il successivo, senza che
 * l'utente debba costruirsi una playlist. I file arrivano dallo schema
 * `daprod://` della suite, quindi il seek funziona anche su un brano lungo — è
 * lo schema che passa le Range al disco.
 */

import { el, fmtTime } from "./dom.js";
import { annuncia } from "./bus.js";

const audio = new Audio();
audio.volume = 0.9;

let coda = [];
let corrente = -1;

/** L'elemento in ascolto, se c'è: serve a evidenziarlo negli elenchi. */
export const inAscolto = () => coda[corrente] ?? null;
export const inPausa = () => audio.paused;

export function impostaCoda(elementi) {
  coda = elementi;
  // Il brano in ascolto può essere stato rinominato o cancellato da sotto: si
  // ritrova per id, e se non c'è più il lettore resta dov'è senza saltare altrove.
  if (corrente >= 0) {
    const suo = coda.findIndex((e) => e.id === (inAscolto()?.id ?? ""));
    corrente = suo;
  }
}

/**
 * Fa partire il brano in quella posizione.
 *
 * Il confronto è sul **file**, non sulla posizione nell'elenco: la libreria si
 * riordina da sé ogni volta che ne nasce uno, e con il confronto sull'indice
 * capitava di cliccare un brano e sentirne un altro — quello che stava lì prima
 * — finché non se ne cliccava un terzo. Il difetto si vedeva proprio quando si
 * usa di più, cioè subito dopo aver generato.
 */
export function riproduci(indice) {
  const elemento = coda[indice];
  if (!elemento) return;

  const suo = new URL(elemento.url, document.baseURI).href;
  if (audio.src !== suo) {
    corrente = indice;
    audio.src = suo;
    audio.play().catch(() => {});
    return;
  }

  // È già caricato: il clic vale come pausa/ripresa.
  corrente = indice;
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

export function riproduciId(id) {
  const indice = coda.findIndex((e) => e.id === id);
  if (indice >= 0) riproduci(indice);
}

function disegna() {
  const elemento = coda[corrente];
  el.player.classList.toggle("hidden", !elemento);
  if (!elemento) return;

  el.pCover.src = elemento.copertina || "";
  el.pTitle.textContent = elemento.nome;
  el.pSub.textContent = String(elemento.meta?.caption || "").split("\n")[0].slice(0, 60);
  el.pPlay.innerHTML = audio.paused ? "&#9654;" : "&#10074;&#10074;";
  // Gli elenchi mostrano quale riga sta suonando: si ridisegnano da soli.
  annuncia("ascolto-cambiato");
}

export function collegaLettore() {
  el.pPlay.onclick = () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };
  el.pPrev.onclick = () => riproduci(corrente > 0 ? corrente - 1 : 0);
  el.pNext.onclick = () => riproduci(corrente + 1 < coda.length ? corrente + 1 : corrente);
  el.pVol.oninput = () => (audio.volume = el.pVol.value / 100);
  el.pSeek.oninput = () => {
    if (audio.duration) audio.currentTime = (audio.duration * el.pSeek.value) / 1000;
  };

  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    el.pSeek.value = Math.round((audio.currentTime / audio.duration) * 1000);
    el.pCur.textContent = fmtTime(audio.currentTime);
    el.pDur.textContent = fmtTime(audio.duration);
  };
  audio.onplay = disegna;
  audio.onpause = disegna;
  // A fine brano si sta fermi. Il passaggio automatico al successivo qui non
  // serve: si ascolta per giudicare quello che si è appena generato, non per
  // farsi una serata di musica, e ritrovarsi partito un altro brano mentre stai
  // scrivendo il testo dà solo fastidio. Avanti e indietro restano a mano.
  audio.onended = disegna;
}
