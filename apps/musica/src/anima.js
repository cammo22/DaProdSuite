/**
 * Anima, il modello che qui fa le immagini.
 *
 * DaPMusica non genera solo canzoni: fa le copertine e ha una scheda Immagini,
 * e tutte e due girano su Anima — lo stesso modello di DaPFoto, gli stessi tre
 * file nella cartella condivisa.
 *
 * **Perché questo file esiste.** Il catalogo dichiarava Anima come roba di
 * DaProdFoto e basta, quindi chi installava *solo* DaProdMusica si trovava una
 * copertina che moriva con un errore del motore in inglese: i pesi non c'erano
 * e nessuno glielo aveva detto. Adesso sono dichiarati anche qui (come extra,
 * perché una canzone si fa lo stesso senza) e la pagina fa quello che fa già la
 * scelta della qualità: chiede alla suite se ci sono e, se mancano, offre di
 * scaricarli invece di lasciarti premere un bottone che non può funzionare.
 */

import * as ponte from "./ponte.js";

/** Gli id di `manifest/models.json`. Gli stessi che chiede DaPFoto. */
export const MODELLI_ANIMA = ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"];

const gb = (byte) => `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;

/**
 * Se Anima è sul disco.
 *
 * Se la suite non risponde si dice di sì: la seconda verità sui modelli è
 * peggio di nessuna verità, e a quel punto è il motore a dover parlare.
 */
export async function animaPronta() {
  try {
    return await ponte.statoModelli(MODELLI_ANIMA);
  } catch {
    return { pronto: true, mancanti: [], bytesMancanti: 0 };
  }
}

/**
 * Riempie un riquadro con "manca Anima" e il tasto per prenderla, e spegne i
 * bottoni che senza di lei non possono funzionare.
 *
 * Torna `true` se si può generare.
 */
export async function controllaAnima(riquadro, ...bottoni) {
  const stato = await animaPronta();

  for (const bottone of bottoni) {
    if (bottone) bottone.disabled = !stato.pronto;
  }

  if (stato.pronto) {
    riquadro.hidden = true;
    return true;
  }

  riquadro.hidden = false;
  riquadro.innerHTML =
    `<b>Anima non è ancora sul disco</b>, e senza di lei le immagini non si fanno. ` +
    `<button class="mini" id="prendiAnima">Scarica ${gb(stato.bytesMancanti)}</button>`;
  riquadro.querySelector("#prendiAnima").onclick = (ev) => {
    ev.target.disabled = true;
    riquadro.append(" Scarico… l'avanzamento è nell'hub.");
    void ponte.scaricaModelli(MODELLI_ANIMA);
  };
  return false;
}
