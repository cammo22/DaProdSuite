/**
 * Gli elementi della pagina e i pochi aiuti che servono a tutti.
 *
 * Come in DaProdFoto e DaProdMusica: gli id si raccolgono una volta sola in
 * `el`, perché un nome sbagliato si scopra all'avvio e non quando l'utente
 * clicca quel bottone.
 */

export const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  "brano", "ricaricaBrani", "durataBrano", "testoBrano",
  "look", "estetica", "misura", "passi", "passiVal", "modello", "rigaModello", "mancaModello",
  "continuita", "scaletta", "quante", "totale",
  "gira", "ferma", "monta", "avanzamento", "passoOra", "finale", "error",
  "dot", "statusTxt", "mods",
]) {
  el[chiave] = $(chiave);
}

export const escapeHtml = (s) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const rnd = () => Math.floor(Math.random() * 2 ** 31);

/** `92.4` → `1:32`. Per i tempi dentro la canzone. */
export const minuti = (s) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

export function mostraErrore(testo) {
  el.error.hidden = false;
  el.error.textContent = testo;
}

export function nascondiErrore() {
  el.error.hidden = true;
}

/** Lega un cursore alla sua etichetta, come nelle altre app. */
export function legaValore(id, uscita, formato = (v) => v) {
  const cursore = $(id);
  const etichetta = $(uscita);
  const aggiorna = () => (etichetta.textContent = formato(cursore.value));
  cursore.addEventListener("input", aggiorna);
  aggiorna();
}
