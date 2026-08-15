/**
 * L'immagine a schermo intero.
 *
 * Una miniatura da 190 pixel non basta per decidere se un'immagine è venuta
 * bene: serve vederla grande, e senza uscire dall'app per aprirla con altro.
 */

import { $, escapeHtml } from "./dom.js";

const lente = $("lente");
const immagine = $("lenteImg");
const didascalia = $("lenteInfo");

export function mostraLente(url, descrizione = "") {
  immagine.src = url;
  didascalia.innerHTML = escapeHtml(descrizione);
  lente.hidden = false;
}

function chiudi() {
  lente.hidden = true;
  // Senza questo l'immagine di prima resta in memoria e riappare per un istante
  // alla prossima apertura.
  immagine.src = "";
}

export function collegaLente() {
  lente.onclick = chiudi;
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !lente.hidden) chiudi();
  });
}
