/**
 * Schema con cui il Visualizer riproduce i file audio del disco.
 *
 * Non si usa `file://` perché la pagina è caricata da `file://` a sua volta e
 * Chromium tratta ogni file come origine opaca diversa: l'elemento <audio> non
 * lo leggerebbe. Con uno schema nostro dichiarato "standard" il fetch è
 * regolare, e passando gli header della richiesta a `net.fetch` arrivano anche
 * le Range: senza quelle il seek su un brano lungo non funziona.
 */

import { net, protocol } from "electron";
import { pathToFileURL } from "node:url";

export const TRACK_SCHEME = "dpv";

/**
 * Va chiamata **prima** che l'app sia pronta: dopo, Electron ha già deciso i
 * privilegi degli schemi e la registrazione non ha effetto.
 */
export function registerTrackScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: TRACK_SCHEME,
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

export function handleTrackScheme(): void {
  protocol.handle(TRACK_SCHEME, (request) => {
    let filePath: string;
    try {
      filePath = decodeTrackUrl(request.url);
    } catch {
      return new Response("percorso non valido", { status: 400 });
    }
    return net.fetch(pathToFileURL(filePath).toString(), {
      headers: request.headers,
      bypassCustomProtocolHandlers: true,
    });
  });
}

/** `dpv://track/C%3A%5Cmusica%5Cbrano.mp3` -> `C:\musica\brano.mp3` */
export function decodeTrackUrl(url: string): string {
  const parsed = new URL(url);
  const encoded = parsed.pathname.replace(/^\/+/, "");
  const decoded = decodeURIComponent(encoded);
  if (!decoded) throw new Error("percorso vuoto");
  return decoded;
}

export function encodeTrackUrl(filePath: string): string {
  return `${TRACK_SCHEME}://track/${encodeURIComponent(filePath)}`;
}
