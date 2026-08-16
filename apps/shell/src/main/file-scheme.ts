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
import { join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const SCHEMA = "daprod";

/**
 * L'host distingue i due usi dello schema:
 *
 *     daprod://file/C%3A%5Cmusica%5Cbrano.mp3     un file qualsiasi del disco
 *     daprod://musica/src/avvio.js                la pagina di un'app
 *
 * Il secondo serve alle app scritte senza impacchettatore: caricate da `file://`
 * ognuna è un'origine opaca diversa, e Chromium rifiuta gli `import` fra moduli.
 * Da qui invece l'origine è `daprod://musica`, una sola per tutta l'app: i
 * moduli si caricano, e `localStorage` resta suo e separato da quello delle altre.
 */
const interfacce = new Map<string, string>();

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

  protocol.handle(SCHEMA, async (request) => {
    let percorso: string;
    try {
      percorso = risolvi(request.url);
    } catch (err) {
      // Detto, non ingoiato: un percorso rifiutato qui diventa un "Failed to
      // fetch" nella pagina, che da solo non dice niente a nessuno.
      return new Response(`percorso non valido: ${err instanceof Error ? err.message : err}`, {
        status: 400,
      });
    }

    // **Solo le Range, non tutte le intestazioni della richiesta.** Passandole
    // tutte partiva anche `Origin`, e una `file://` con un Origin diverso è per
    // Chromium una richiesta incrociata verso una risposta che non può
    // autorizzarla: `net.fetch` falliva prima ancora che potessimo aggiungere
    // noi il permesso. Si vedeva così — e in due posti diversi, senza che
    // sembrassero la stessa cosa:
    //
    // - DaProdFoto: aprire un'immagine nel ritocco dava "Failed to fetch";
    // - Visualizer: un brano di DaProdMusica dava "formato non supportato",
    //   perché l'`<audio>` è `crossOrigin="anonymous"` e la richiesta moriva
    //   allo stesso modo.
    //
    // Le Range servono e restano: senza, il seek su un brano lungo non va.
    const inoltrate = new Headers();
    for (const nome of ["range", "if-range"]) {
      const valore = request.headers.get(nome);
      if (valore) inoltrate.set(nome, valore);
    }

    const risposta = await net.fetch(pathToFileURL(percorso).toString(), {
      headers: inoltrate,
      bypassCustomProtocolHandlers: true,
    });

    // La pagina di un'app vive su `daprod://musica`, i suoi file su
    // `daprod://file`: origini diverse, quindi leggerli con `fetch` è una
    // richiesta incrociata e senza questa intestazione il browser la rifiuta.
    // Serve a chi deve *elaborare* un file, non solo mostrarlo: ritagliare una
    // copertina, aprire una foto nel ritocco. Aprire il varco non allarga
    // niente — allo schema `daprod:` arrivano solo le nostre pagine.
    const intestazioni = new Headers(risposta.headers);
    intestazioni.set("Access-Control-Allow-Origin", "*");
    // Il seek di un file lungo chiede pezzi: senza dirlo, il lettore non prova
    // nemmeno a chiederli e scarica tutto dall'inizio ogni volta.
    if (!intestazioni.has("Accept-Ranges")) intestazioni.set("Accept-Ranges", "bytes");

    return new Response(risposta.body, {
      status: risposta.status,
      statusText: risposta.statusText,
      headers: intestazioni,
    });
  });
}

/**
 * Dichiara dove sta la pagina di un'app, così `daprod://<id>/...` la serve.
 *
 * Da chiamare quando si crea la finestra: prima non serve, e tenere l'elenco
 * vuoto finché non si apre niente vuol dire che una pagina non può leggere la
 * cartella di un'app che l'utente non ha aperto.
 */
export function serviInterfaccia(id: string, cartella: string): void {
  interfacce.set(id, resolve(cartella));
}

/** L'indirizzo con cui si carica la pagina di un'app. */
export function urlInterfaccia(id: string, file = "index.html"): string {
  return `${SCHEMA}://${id}/${file}`;
}

function risolvi(url: string): string {
  const parsed = new URL(url);
  if (parsed.host === "file") return decodificaUrl(url);

  const radice = interfacce.get(parsed.host);
  if (!radice) throw new Error(`interfaccia "${parsed.host}" non registrata`);

  const relativo = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  const percorso = normalize(join(radice, relativo));
  // Un `..` nel percorso trasformerebbe la cartella dell'app in una finestra su
  // tutto il disco: qui dentro si serve solo quello che sta sotto la radice.
  if (percorso !== radice && !percorso.startsWith(radice + sep)) {
    throw new Error("percorso fuori dalla cartella dell'app");
  }
  return percorso;
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
