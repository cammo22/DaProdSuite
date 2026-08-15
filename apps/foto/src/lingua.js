/**
 * Scrivere in italiano a un modello che capisce l'inglese.
 *
 * Anima, come tutti i modelli di immagini seri, è stato addestrato su didascalie
 * in inglese. Una descrizione in italiano non dà un errore: dà un'immagine che
 * non c'entra niente, e sembra che il modello ignori quello che hai scritto. È
 * il difetto che si vedeva come "genera quello che vuole".
 *
 * Qui si traduce prima di generare, e **si mostra sempre cosa è stato mandato
 * davvero**: se la traduzione sbaglia una parola, lo si vede subito invece di
 * dare la colpa al modello.
 *
 * La traduzione la fa il motore (`POST /daprod/traduci`), che ha già Python e
 * transformers accesi. Se non risponde o il traduttore non è installato, si
 * manda l'originale e si dice che non è stato tradotto: generare peggio è meglio
 * che non generare.
 */

import { traduci } from "./ponte.js";

const CHIAVE = "daprod.foto.traduci";

/** Acceso finché non lo spegni: chi scrive in inglese lo spegne una volta sola. */
export function traduzioneAttiva() {
  return localStorage.getItem(CHIAVE) !== "no";
}

export function collegaTraduzione() {
  const interruttori = [...document.querySelectorAll("[data-traduci]")];
  for (const casella of interruttori) {
    casella.checked = traduzioneAttiva();
    casella.addEventListener("change", () => {
      localStorage.setItem(CHIAVE, casella.checked ? "si" : "no");
      // Le due schede sono la stessa impostazione: cambiarla in una e trovarla
      // diversa nell'altra sarebbe un modo per non fidarsi più di nessuna delle due.
      for (const altra of interruttori) altra.checked = casella.checked;
      for (const riga of document.querySelectorAll(".tradotto")) riga.hidden = true;
    });
  }
}

/**
 * Il testo da mandare al modello, e la riga da mostrare sotto la casella.
 *
 * @param {string} testo    quello che ha scritto l'utente
 * @param {HTMLElement} riga  dove raccontare cosa è stato mandato
 * @returns {Promise<string>} il testo in inglese, o l'originale se non si è potuto tradurre
 */
export async function inInglese(testo, riga) {
  if (!traduzioneAttiva()) {
    if (riga) riga.hidden = true;
    return testo;
  }

  if (riga) {
    riga.hidden = false;
    riga.textContent = "Traduco…";
  }

  const esito = await traduci(testo);

  if (riga) {
    if (esito.tradotta && esito.tradotto !== testo) {
      riga.textContent = `Mandato al modello: ${esito.tradotto}`;
      riga.classList.remove("guasto");
    } else if (esito.tradotta) {
      riga.hidden = true;
    } else {
      riga.textContent = `Mandato così com'era — ${esito.motivo ?? "traduttore non disponibile"}`;
      riga.classList.add("guasto");
    }
  }

  return esito.tradotto || testo;
}
