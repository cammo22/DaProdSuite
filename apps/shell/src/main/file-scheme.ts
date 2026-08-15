/**
 * Schema `daprod://` — come le finestre leggono i file del disco.
 *
 * Non si usa `file://` perché le pagine sono caricate da `file://` a loro volta
 * e Chromium tratta ogni file come origine opaca diversa: un <audio> o una <img>
 * non lo leggerebbero. Con uno schema nostro dichiarato "standard" il fetch è
 * regolare, e passando gli header della richiesta a `net.fetch` arrivano anche
 * le Range: senza quelle il seek su un brano lungo non funziona.
 *
 * Nasce nel Visualizer come `dpv://`, che sapeva servire solo a lui. Qui è di
 * tutti: serve al Visualizer per la musica dell'utente, alla libreria condivisa
 * per i risultati generati, e a qualunque app debba mostrare un file locale.
 */

import { net, protocol } from "electron";
import { pathToFileURL } from "node:url";

export const SCHEMA = "daprod";

/**
 * Va chiamata **prima** che l'app sia pronta: dopo, Electron ha già deciso i
 * privilegi degli schemi e la registrazione non ha effetto.
 */
export function registraSchema(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEMA,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false,
      },
    },
  ]);
}

let gestito = false;

export function gestisciSchema(): void {
  if (gestito) return;
  gestito = true;

  protocol.handle(SCHEMA, (request) => {
    let percorso: string;
    try {
      percorso = decodificaUrl(request.url);
    } catch {
      return new Response("percorso non valido", { status: 400 });
    }
    return net.fetch(pathToFileURL(percorso).toString(), {
      headers: request.headers,
      bypassCustomProtocolHandlers: true,
    });
  });
}

/** `daprod://file/C%3A%5Cmusica%5Cbrano.mp3` -> `C:\musica\brano.mp3` */
export function decodificaUrl(url: string): string {
  const parsed = new URL(url);
  const codificato = parsed.pathname.replace(/^\/+/, "");
  const decodificato = decodeURIComponent(codificato);
  if (!decodificato) throw new Error("percorso vuoto");
  return decodificato;
}

export function codificaUrl(percorso: string): string {
  return `${SCHEMA}://file/${encodeURIComponent(percorso)}`;
}
