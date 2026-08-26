/**
 * Cosa occupa la memoria video adesso, per tutta la suite.
 *
 * **Da dove viene.** Era una fila di quadratini colorati nella barra di
 * DaProdMusica: passavi sopra e vedevi quanti MB si prendeva un modello, ci
 * cliccavi e lo scaricavi. Era scritto lì da subito che alla 0.3.1 sarebbe
 * diventato un pannello della suite, ed è questo — perché la GPU è una sola e
 * il problema non è di una scheda: se DaProdFoto lascia Anima in memoria, è
 * DaProdMusica a non riuscire più a caricare il suo text encoder da 5,5 GB.
 *
 * **Chi risponde è il motore, non noi.** L'elenco lo tiene ComfyUI, che è
 * l'unico a sapere cosa ha caricato: la suite lo chiede alle rotte del nodo
 * `daprod_ponte` e non prova a indovinarlo da `nvidia-smi`, che direbbe quanti
 * MB sono occupati ma non **da cosa**. E i motori nostri — Dream, IoDigitale,
 * il Companion — non hanno niente di simile da raccontare: caricano i loro pesi
 * e li tengono finché vivono.
 *
 * A motore spento non c'è niente da dire, e lo si dice con una lista vuota
 * invece che con un errore: la memoria video **è** libera, che è la risposta
 * giusta alla domanda.
 */

import type { ModelloInVram } from "@daprod/ipc";
import { acceso } from "./servizi";

/**
 * La porta del motore delle immagini e della musica.
 *
 * Fissa, come nel catalogo: è l'unico motore che sa rispondere a queste
 * domande, e cablarla qui è meglio che far finta che un giorno saranno tanti.
 */
const MOTORE = "http://127.0.0.1:8188";

/** Chi tiene occupata la memoria video, e per quanto. Vuota se il motore è spento. */
export async function elencoVram(): Promise<ModelloInVram[]> {
  if (!qualcunoAcceso()) return [];
  try {
    // `Cache-Control` come intestazione e non come opzione `cache`: qui siamo
    // nel processo principale, dove il `fetch` di Node non conosce quel campo.
    const risposta = await fetch(`${MOTORE}/daprod/modelli`, {
      headers: { "Cache-Control": "no-store" },
    });
    if (!risposta.ok) return [];
    return (await risposta.json()) as ModelloInVram[];
  } catch {
    // Il motore può essersi spento fra il controllo e la domanda: la risposta
    // resta la stessa, non c'è niente in memoria.
    return [];
  }
}

/**
 * Toglie dalla memoria video un modello, o tutti.
 *
 * Non spegne il motore: quello che resta acceso è il processo, e la prossima
 * generazione ricaricherà quello che le serve. È la manovra da fare quando una
 * cosa non entra — e con 8 GB capita.
 */
export async function scaricaDallaVram(nome?: string): Promise<void> {
  if (!qualcunoAcceso()) return;
  try {
    await fetch(`${MOTORE}/daprod/scarica`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nome ? { nome } : { tutti: true }),
    });
  } catch {
    // Idem: se non c'è più nessuno da cui scaricare, è già fatto.
  }
}

/** Vero se una delle app che girano su quel motore lo tiene acceso. */
function qualcunoAcceso(): boolean {
  return acceso("musica") || acceso("foto") || acceso("cinema");
}

/**
 * Il motore ha qualcosa in mano adesso?
 *
 * **La stessa domanda che si fa la finestra prima di liberare la memoria**
 * (`motoreOccupato` in `ponte.js`), fatta però dal processo principale — perché
 * qui serve a un'altra cosa: a non far partire il modello che scrive mentre chi
 * sta al computer ha una generazione in corso. Vedi la «guardia» in
 * `turno.ts`.
 *
 * Se il motore non risponde si dice **occupato**: fra aspettare qualche secondo
 * di troppo e caricare quattro GB sopra a un video a metà, il secondo è peggio.
 * A motore spento invece è libero davvero, e dirlo occupato bloccherebbe la
 * fila su una macchina dove non sta girando niente.
 */
export async function motoreOccupato(): Promise<boolean> {
  if (!qualcunoAcceso()) return false;
  try {
    const risposta = await fetch(`${MOTORE}/queue`, {
      headers: { "Cache-Control": "no-store" },
      signal: AbortSignal.timeout(3000),
    });
    if (!risposta.ok) return true;
    const coda = (await risposta.json()) as {
      queue_running?: unknown[];
      queue_pending?: unknown[];
    };
    return (coda.queue_running?.length ?? 0) + (coda.queue_pending?.length ?? 0) > 0;
  } catch {
    return true;
  }
}
