/**
 * L'immagine a schermo intero.
 *
 * Una miniatura da 190 pixel non basta per decidere se un'immagine è venuta
 * bene: serve vederla grande, e senza uscire dall'app per aprirla con altro.
 *
 * Da qui si va anche al ritocco. Non è un di più: la lente si chiude a qualunque
 * clic, quindi chi guardava un'immagine e poi cliccava "ritocca" nella scheda
 * sotto chiudeva soltanto la lente, e sembrava che il ritocco non funzionasse.
 */

import { $, escapeHtml } from "./dom.js";
import { annuncia } from "./bus.js";

const lente = $("lente");
const immagine = $("lenteImg");
const didascalia = $("lenteInfo");
const bottoneRitocca = $("lenteRitocca");

let corrente = null;

export function mostraLente(url, descrizione = "") {
  corrente = url;
  immagine.src = url;
  didascalia.innerHTML = escapeHtml(descrizione);
  lente.hidden = false;
}

function chiudi() {
  lente.hidden = true;
  corrente = null;
  // Senza questo l'immagine di prima resta in memoria e riappare per un istante
  // alla prossima apertura.
  immagine.src = "";
}

export function collegaLente() {
  lente.onclick = chiudi;

  bottoneRitocca.onclick = (ev) => {
    // Senza fermarlo, il clic arriva anche alla lente e la chiude: si vedrebbe
    // il ritocco aprirsi e la lente sparire nello stesso istante, che è giusto,
    // ma l'ordine conta perché `chiudi` azzera l'immagine corrente.
    ev.stopPropagation();
    const url = corrente;
    chiudi();
    if (url) annuncia("ritocca", url);
  };

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !lente.hidden) chiudi();
  });
}
