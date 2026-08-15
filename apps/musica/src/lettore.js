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

export function riproduci(indice) {
  if (indice < 0 || indice >= coda.length) return;
  if (corrente === indice && !audio.paused) {
    audio.pause();
    return;
  }
  if (corrente !== indice) {
    corrente = indice;
    audio.src = coda[indice].url;
  }
  audio.play().catch(() => {});
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
