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

// La barra dello scaricamento sta in `packages/ui`, servita sotto `/comune/`.
import { collegaScaricamento } from "/comune/scaricamento.js";
import * as ponte from "./ponte.js";

/** Gli id di `manifest/models.json`. Gli stessi che chiede DaPFoto. */
export const MODELLI_ANIMA = ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"];

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
 * Un riquadro per posto: la scheda Crea e la scheda Immagini ne hanno uno
 * ognuna, e ognuno si tiene il suo pezzo di interfaccia con dentro la barra.
 */
const riquadri = new WeakMap();

/**
 * Riempie un riquadro con "manca Anima" e il tasto per prenderla, e spegne i
 * bottoni che senza di lei non possono funzionare.
 *
 * Torna `true` se si può generare.
 *
 * Il riquadro non se lo disegna più questo file: lo disegna il pezzo comune di
 * `packages/ui`, che sa anche mostrare la barra mentre i 5,6 GB arrivano. Prima
 * qui c'era scritto «Scarico… l'avanzamento è nell'hub», che è un modo cortese
 * di dire "vai a guardare da un'altra parte".
 */
export async function controllaAnima(riquadro, ...bottoni) {
  let barra = riquadri.get(riquadro);
  if (!barra) {
    barra = collegaScaricamento(riquadro, {
      stato: ponte.statoModelli,
      scarica: ponte.scaricaModelli,
      annulla: ponte.annullaScaricamento,
      onAvanzamento: ponte.suAvanzamentoModelli,
      io: ponte.io,
      onCambio: (pronto) => {
        for (const bottone of bottoni) if (bottone) bottone.disabled = !pronto;
      },
    });
    riquadri.set(riquadro, barra);
  }

  const pronto = await barra.controlla({
    ids: MODELLI_ANIMA,
    nome: "Anima",
    spiega: "Senza di lei le immagini non si fanno.",
  });

  for (const bottone of bottoni) {
    if (bottone) bottone.disabled = !pronto;
  }
  return pronto;
}
