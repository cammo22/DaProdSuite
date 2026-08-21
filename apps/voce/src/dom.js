/**
 * Gli elementi della pagina e i pochi aiuti che servono a tutti.
 *
 * Come in DaProdFoto, DaProdMusica e DaProdCinema: gli id si raccolgono una
 * volta sola in `el`, perché un nome sbagliato si scopra all'avvio e non quando
 * qualcuno clicca proprio quel bottone.
 */

export const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  // in alto
  "dot", "statusTxt", "libera",
  "modello", "rigaModello", "avvisoModello",
  "navVoci", "navGal",
  // parla
  "testo", "conto", "voce", "notaVoce", "parla", "errore",
  "toggleAdv", "avanzati", "temperatura", "temperaturaVal",
  "secondiMassimi", "secondiVal", "seme", "dado", "semeCasuale", "notaResa",
  "sessione",
  // voci
  "nomeVoce", "scegliAudio", "dallaLibreria", "fileScelto", "ascoltaScelto",
  "testoVoce", "salvaVoce", "erroreVoci", "elencoVoci", "contoVoci", "sceltaFile",
  // galleria
  "galleria", "conteggio", "aggiorna",
]) {
  el[chiave] = $(chiave);
}

export const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const rnd = () => Math.floor(Math.random() * 2 ** 31);

/** `95` diventa `1:35`, ma sotto il minuto resta in secondi: è più leggibile. */
export const durata = (s) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ------------------------------------------------------------- le schede */

const allApertura = new Map();
export const suApertura = (scheda, azione) => allApertura.set(scheda, azione);

export function mostraScheda(nome) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.id === `scheda-${nome}`));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.scheda === nome));
  allApertura.get(nome)?.();
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------- i tasti */

/**
 * Il tasto si spegne e racconta cosa sta facendo.
 *
 * Qui serve più che altrove: fra il clic su «Parla» e la prima parola passano
 * dei secondi — il modello si carica, il testo si taglia a pezzi — e un tasto
 * muto in quei secondi sembra un tasto rotto.
 */
export function occupa(bottone, testo) {
  bottone.disabled = true;
  bottone.dataset.prima = bottone.dataset.prima || bottone.textContent;
  bottone.textContent = testo;
}

export function libera(bottone, spento = false) {
  bottone.disabled = spento;
  if (bottone.dataset.prima) bottone.textContent = bottone.dataset.prima;
}

export function mostraErrore(testo, dove = "errore") {
  el[dove].style.display = "block";
  el[dove].textContent = testo;
}

export const nascondiErrore = (dove = "errore") => (el[dove].style.display = "none");
