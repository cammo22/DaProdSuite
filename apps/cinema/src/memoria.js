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
 *
 * ⚠ **Ma non mentre il motore sta lavorando.** `unload_all_models` non chiede
 * permesso a nessuno: toglie i pesi dalla scheda anche al video che si sta
 * generando in quel momento. Quel video non muore subito — va avanti finché
 * qualcuno non prova a usare un pezzo che non c'è più — e finisce nel VAE con
 * «Input type (torch.cuda.HalfTensor) and weight type (torch.HalfTensor) should
 * be the same», che vuol dire: i dati sono sulla scheda, i pesi no.
 *
 * Succede in un caso solo, ed è quello normale: chiedi il secondo video mentre
 * il primo sta ancora andando. Se il motore ha qualcosa in mano, quindi, non si
 * tocca niente — e non serve nemmeno, perché il lavoro nuovo userà **gli stessi
 * pesi** di quello in corso.
 */

import * as ponte from "./ponte.js";

export async function faiSpazio(racconta = () => {}) {
  try {
    // Prima di tutto: c'è qualcosa in ballo? Se sì si esce, e il lavoro nuovo si
    // mette in fila dietro all'altro senza che nessuno tocchi la scheda.
    if (await ponte.motoreOccupato()) return;

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
