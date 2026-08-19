/** Gli elementi della pagina, presi una volta sola. Come in Musica e in Foto. */

const $ = (id) => document.getElementById(id);

export const el = {};
for (const chiave of [
  "spia", "statoTxt", "avviso", "selettoreLlm",
  "conversazione", "formScrivi", "testo", "manda",
  "grafo", "storico", "statoSogni", "sognaOra", "apriCartella",
]) {
  el[chiave] = $(chiave);
}

/** Mostra una delle tre schede e accende il suo bottone. */
export function mostraScheda(nome) {
  for (const sezione of document.querySelectorAll(".tab")) {
    sezione.classList.toggle("on", sezione.id === `scheda-${nome}`);
  }
  for (const bottone of document.querySelectorAll("nav button")) {
    bottone.classList.toggle("on", bottone.dataset.scheda === nome);
  }
  perApertura.get(nome)?.();
}

const perApertura = new Map();

/**
 * Cosa fare quando si apre una scheda.
 *
 * Memoria e Sogni si rileggono all'apertura e non in continuazione: sono
 * domande al motore, e farle ogni secondo per una schermata che nessuno sta
 * guardando è lavoro buttato su una macchina che ne ha già abbastanza.
 */
export function suApertura(nome, azione) {
  perApertura.set(nome, azione);
}

/** Il testo, ripulito: quello che arriva dal modello non diventa mai marcatura. */
export function testo(valore) {
  const nodo = document.createElement("span");
  nodo.textContent = valore ?? "";
  return nodo.innerHTML;
}
