/**
 * Fare spazio prima di generare.
 *
 * Su una scheda da 8 GB non ci stanno insieme il modello che **scrive** e il
 * modello che **disegna**, e fra lo scrivere e il generare passano pochi
 * secondi: allarghi la descrizione con Bonsai, premi Genera, e quei quattro GB
 * e mezzo sono ancora in memoria quando il motore ne chiede altri sei. Va a
 * finire in due modi, tutti e due brutti: il motore rimescola la memoria per
 * mezzo minuto prima di cominciare, oppure muore con un errore che la VRAM non
 * la nomina nemmeno.
 *
 * Quindi, un attimo prima di mandare il lavoro al motore:
 *
 * 1. **via il modello che scrive**, quello di LM Studio — sta fuori dalla
 *    contabilità del motore, che quindi non può liberarlo da sé;
 * 2. **via quello che il motore tiene dentro e qui non serve**: il modello
 *    musicale lasciato lì da DaProdMusica, o il modello di immagini di prima se
 *    nel frattempo ne hai scelto un altro.
 *
 * Quello che serve **resta dov'è**: se generi dieci immagini di fila con lo
 * stesso modello, non lo si scarica e ricarica dieci volte. Fare spazio non
 * vuol dire svuotare tutto per abitudine — quello costerebbe mezzo minuto a
 * ogni immagine.
 *
 * Lo stesso lo fa DaProdMusica prima di un brano: è la stessa scheda video, e
 * chi preme Genera non deve sapere niente di tutto questo.
 */

import * as ponte from "./ponte.js";

/** Chi occupa la VRAM per conto di un'altra app della suite. */
const DI_ALTRE_APP = /^MiniMax/;

const RICORDO = "daprod.foto.ultimoInVram";

/** Con che modello si è generato l'ultima volta: se cambia, quello vecchio va via. */
let ultimo = localStorage.getItem(RICORDO) || null;

/**
 * Libera quello che non serve, e racconta cosa sta facendo.
 *
 * `racconta` scrive sul tasto Genera: liberare la memoria può prendere qualche
 * secondo, ed è esattamente il genere di attesa muta che faceva ripremere il
 * tasto.
 */
export async function faiSpazio(modello, racconta = () => {}) {
  try {
    // Non mentre il motore sta lavorando: scaricare un modello dalla scheda lo
    // toglie **anche** all'immagine che si sta generando in quel momento, e
    // quella muore nel VAE («Input type torch.cuda.HalfTensor and weight type
    // torch.HalfTensor»). Con la fila piena si genera con la scheda com'è: il
    // lavoro nuovo userà comunque i pesi già caricati per quello in corso.
    if (await ponte.motoreOccupato()) {
      ultimo = modello.id;
      localStorage.setItem(RICORDO, ultimo);
      return;
    }

    racconta("libero la memoria…");
    // Anche se non l'abbiamo caricato noi: chi preme Genera vuole la scheda
    // libera, e non gli interessa — giustamente — chi ce l'aveva messo.
    await ponte.liberaMemoriaLlm();

    const dentro = await ponte.modelliInVram();
    const altrui = dentro.filter((m) => DI_ALTRE_APP.test(m.nome || ""));
    const cambiato = Boolean(ultimo) && ultimo !== modello.id;

    if (dentro.length && (cambiato || altrui.length)) {
      racconta(cambiato ? "scarico il modello di prima…" : "libero la scheda…");
      // Cambiando modello di immagini si svuota tutto: insieme al modello se ne
      // va il suo text encoder e il suo VAE, che con quello nuovo non c'entrano
      // niente e occuperebbero memoria per nessuno.
      if (cambiato) await ponte.svuotaVram();
      else for (const m of altrui) await ponte.scaricaDallaVram(m.nome);
    }
  } catch {
    // Il motore non ha risposto, o è una versione senza queste rotte: si genera
    // lo stesso. Al massimo si genera più piano, che è meglio di non generare.
  }

  ultimo = modello.id;
  localStorage.setItem(RICORDO, ultimo);
}
