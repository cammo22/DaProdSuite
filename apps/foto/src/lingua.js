/**
 * Scrivere in italiano a un modello che capisce solo l'inglese.
 *
 * **Non a tutti serve.** Anima è addestrata su didascalie inglesi: una
 * descrizione in italiano non dà errore, dà un'immagine che non c'entra niente —
 * il difetto che si vedeva come "genera quello che vuole". FLUX.2 invece legge
 * il prompt con un Qwen3, che l'italiano lo capisce, e tradurre prima è solo un
 * passaggio in più che può andare storto. Lo dice il modello, con `traduce`.
 *
 * La traduzione la fa il motore (`POST /daprod/traduci`), che ha già Python e
 * transformers accesi. Se non risponde, si manda l'originale e lo si scrive:
 * generare peggio è meglio che non generare.
 *
 * L'interruttore è **uno**, in cima accanto al modello, e vale per Crea e per
 * Ritocco: erano due caselle da tenere allineate a mano, ed è esattamente il
 * genere di cosa che prima o poi si disallinea.
 */

import { el } from "./dom.js";
import { traduci } from "./ponte.js";

const CHIAVE = "daprod.foto.traduci";

/** Acceso finché non lo spegni: chi scrive in inglese lo spegne una volta sola. */
export const traduzioneAttiva = () => localStorage.getItem(CHIAVE) !== "no";

export function collegaTraduzione() {
  el.traduci.checked = traduzioneAttiva();
  el.traduci.addEventListener("change", () => {
    localStorage.setItem(CHIAVE, el.traduci.checked ? "si" : "no");
    el.tradotto.hidden = true;
  });
}

/**
 * Mostra o nasconde l'interruttore a seconda del modello scelto.
 *
 * Nascosto e non spento: la scelta dell'utente resta quella che era, e torna
 * com'era se rimette un modello che l'inglese lo pretende.
 */
export function traduzionePerModello(modello) {
  el.rigaTraduci.hidden = !modello.traduce;
  if (!modello.traduce) el.tradotto.hidden = true;
}

/**
 * Il testo da mandare al modello, tradotto se serve.
 *
 * Racconta sempre cosa è stato mandato davvero: se la traduzione sbaglia una
 * parola, lo si vede subito invece di dare la colpa al modello.
 */
export async function inInglese(testo, modello) {
  if (!modello.traduce || !traduzioneAttiva()) {
    el.tradotto.hidden = true;
    return testo;
  }

  el.tradotto.hidden = false;
  el.tradotto.textContent = "Traduco…";

  const esito = await traduci(testo);

  if (esito.tradotta && esito.tradotto !== testo) {
    el.tradotto.textContent = `Mandato al modello: ${esito.tradotto}`;
    el.tradotto.classList.remove("guasto");
  } else if (esito.tradotta) {
    el.tradotto.hidden = true;
  } else {
    el.tradotto.textContent = `Mandato così com'era — ${esito.motivo ?? "traduttore non disponibile"}`;
    el.tradotto.classList.add("guasto");
  }

  return esito.tradotto || testo;
}
