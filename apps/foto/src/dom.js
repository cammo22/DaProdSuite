/** Gli elementi della pagina e gli aiuti che servono a tutti. */

export const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  "prompt", "proposte", "estetica", "formato", "quante", "passi", "cfg", "seed",
  "selettoreLlm", "bonsaiAllarga", "bonsaiIdea", "bonsaiStato",
  "seedCasuale", "negativo", "notaNegativo", "dado", "toggleAdv", "avanzati", "genera", "errore",
  "modello", "rigaModello", "avvisoModello", "traduci", "rigaTraduci", "tradotto",
  "sessione", "stop", "svuota", "mods", "dot", "statusTxt", "navGal",
  "areaTela", "nessunaImmagine", "comandiPennello", "pennello", "pennelloVal",
  "scegliFile", "pulisciMaschera", "sceltaFile", "promptRitocco", "denoise", "recentiRitocco",
  "denoiseVal", "rigenera", "erroreRitocco", "galleria", "conteggio", "aggiorna", "lente", "lenteImg", "lenteInfo",
]) {
  el[chiave] = $(chiave);
}

export const rnd = () => Math.floor(Math.random() * 2 ** 31);

export const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const fmtTime = (s) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

const allApertura = new Map();
export const suApertura = (scheda, azione) => allApertura.set(scheda, azione);

export function mostraScheda(nome) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.id === "scheda-" + nome));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.scheda === nome));
  allApertura.get(nome)?.();
  window.scrollTo({ top: 0 });
}

export function legaValore(id, uscita, formato = (v) => v) {
  const aggiorna = () => ($(uscita).textContent = formato(el[id].value));
  el[id].addEventListener("input", aggiorna);
  aggiorna();
}

/**
 * Un tasto che sta lavorando lo dice, e non si lascia premere due volte.
 *
 * Serve per i gesti che possono metterci qualche secondo senza che si veda
 * niente: la prima traduzione carica il suo modello, e in quei secondi «Genera»
 * sembrava non aver ricevuto il clic. Chi lo premeva un'altra volta si ritrovava
 * due immagini in coda.
 */
export function occupa(bottone, testo) {
  bottone.disabled = true;
  bottone.dataset.prima = bottone.dataset.prima || bottone.textContent;
  bottone.textContent = testo;
}

/** Lo rimette com'era. `spento` per i casi in cui non deve tornare premibile. */
export function libera(bottone, spento = false) {
  bottone.disabled = spento;
  if (bottone.dataset.prima) bottone.textContent = bottone.dataset.prima;
}

export function mostraErrore(testo, dove = "errore") {
  el[dove].style.display = "block";
  el[dove].textContent = testo;
}

export const nascondiErrore = (dove = "errore") => (el[dove].style.display = "none");
