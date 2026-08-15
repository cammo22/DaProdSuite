/**
 * Gli elementi della pagina e i quattro aiuti che servono a tutti.
 *
 * Gli id sono raccolti una volta sola in `el`: cercarli a ogni uso vorrebbe dire
 * scoprire un nome sbagliato solo quando l'utente clicca quel bottone.
 */

export const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  "titolo", "caption", "lyrics", "duration", "steps", "cfg", "cfg_scale", "top_k",
  "seed_text", "seed_audio", "format", "batch", "tiled", "tile", "instrumental",
  "randomSeed", "autoCover", "coverStyleNew", "go", "goAudio", "stopBtn", "clearQueue",
  "dot", "statusTxt", "feed", "error", "libList", "detail", "libCount", "navLib",
  "refreshLib", "presets", "tags", "dice1", "dice2", "builderFields", "b_preview",
  "b_name", "b_use", "b_copy", "b_save", "b_load", "b_clear", "coverPicker",
  "imgPresets", "imgPrompt", "imgStyle", "imgSize", "imgCount", "imgGo", "imgError",
  "imgCards", "imgCountLbl", "imgRefresh", "mods", "toggleAdv", "avanzati",
  "player", "pCover", "pTitle", "pSub", "pPrev", "pPlay", "pNext", "pSeek",
  "pCur", "pDur", "pVol",
]) {
  el[chiave] = $(chiave);
}

export const rnd = () => Math.floor(Math.random() * 2 ** 31);

export const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const fmtTime = (s) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

/** Mostra una scheda e avvisa chi deve aggiornarsi quando la si apre. */
const allApertura = new Map();

export function suApertura(scheda, azione) {
  allApertura.set(scheda, azione);
}

export function mostraScheda(nome) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.id === "scheda-" + nome));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.scheda === nome));
  allApertura.get(nome)?.();
  window.scrollTo({ top: 0 });
}

/** Collega un cursore alla sua etichetta numerica. */
export function legaValore(id, uscita, formato = (v) => v) {
  const aggiorna = () => ($(uscita).textContent = formato(el[id].value));
  el[id].addEventListener("input", aggiorna);
  aggiorna();
}

/**
 * Dice cosa è andato storto, dove l'utente sta guardando.
 *
 * Porta anche alla scheda Crea: il riquadro rosso sta lì, e un errore mostrato
 * in una scheda che non è aperta è un errore che non esiste.
 */
export function mostraErrore(testo) {
  el.error.style.display = "block";
  el.error.textContent = testo;
  mostraScheda("crea");
}

export function inserisciAlCursore(area, testo) {
  const inizio = area.selectionStart ?? area.value.length;
  area.value = area.value.slice(0, inizio) + testo + area.value.slice(area.selectionEnd ?? inizio);
  area.focus();
  area.selectionStart = area.selectionEnd = inizio + testo.length;
}
