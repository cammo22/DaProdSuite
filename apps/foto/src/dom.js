/** Gli elementi della pagina e gli aiuti che servono a tutti. */

export const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  "prompt", "proposte", "estetica", "formato", "quante", "passi", "cfg", "seed",
  "seedCasuale", "negativo", "dado", "toggleAdv", "avanzati", "genera", "errore",
  "sessione", "stop", "svuota", "mods", "dot", "statusTxt", "navGal",
  "areaTela", "nessunaImmagine", "comandiPennello", "pennello", "pennelloVal",
  "scegliFile", "pulisciMaschera", "sceltaFile", "promptRitocco", "denoise",
  "denoiseVal", "rigenera", "erroreRitocco", "galleria", "conteggio", "aggiorna", "lente", "lenteImg", "lenteInfo",
  "tradottoCrea", "tradottoRitocco",
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

export function mostraErrore(testo, dove = "errore") {
  el[dove].style.display = "block";
  el[dove].textContent = testo;
}

export const nascondiErrore = (dove = "errore") => (el[dove].style.display = "none");
