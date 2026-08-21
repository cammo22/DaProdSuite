/**
 * Fare spazio nella scheda video, prima di chiedere un video.
 *
 * È il cugino di `apps/foto/src/memoria.js`, con una differenza di misura che
 * diventa una differenza di regola. Là si sceglie cosa togliere: il modello di
 * immagini che c'era prima può restare, se è lo stesso. Qui no — **si toglie
 * tutto, sempre.**
 *
 * Il motivo è aritmetico. Su una scheda da 8 GB, LTX 2.5 fa entrare 23 GB di
 * pesi passando dalla RAM un pezzo per volta; H3 ne fa entrare 41. In quelle
 * condizioni un modello di un'altra app rimasto in memoria non rallenta la
 * generazione: la fa fallire a metà, dopo minuti, con un errore di memoria
 * esaurita che sembra colpa del video.
 *
 * `racconta` scrive sul tasto Genera: svuotare la scheda può prendere qualche
 * secondo, ed è esattamente il genere di attesa muta che fa ripremere il tasto.
 */

import * as ponte from "./ponte.js";

export async function faiSpazio(racconta = () => {}) {
  try {
    racconta("libero la memoria…");
    // Anche quello che non abbiamo caricato noi, e anche il modello che scrive
    // in LM Studio: chi preme Genera vuole la scheda libera, e non gli interessa
    // — giustamente — chi ce l'aveva messo.
    await ponte.liberaMemoriaLlm();
    await ponte.svuotaVram();
  } catch {
    // Il motore non ha risposto, o è una versione senza queste rotte: si genera
    // lo stesso. Al massimo si genera più piano, che è meglio di non generare.
  }
}
