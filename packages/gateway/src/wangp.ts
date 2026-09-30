/**
 * L'interfaccia intera di WanGP, portata a chi ha il permesso di decidere.
 *
 * **Cosa fa.** Il gateway fa da ponte fra il browser (il telefono, il portatile)
 * e WanGP, che sta sul computer su 127.0.0.1. Chi apre `/wangp/` vede la stessa
 * pagina che vede chi sta davanti al PC — tutti i modelli, tutte le
 * impostazioni, la galleria, la coda — e ci può lavorare da remoto.
 *
 * **Perché è quasi trasparente.** WanGP è fatto per stare alla radice di un
 * indirizzo dietro a un proxy: se il proxy gli lascia l'`Host` che ha usato il
 * browser, WanGP ricostruisce da solo gli indirizzi giusti (vedi la sua
 * `docs/AUTHENTICATION.md`, «Hosting Behind a Reverse Proxy»). Quindi qui non si
 * riscrive niente della pagina: si passano le richieste, con l'`Host` e
 * l'`Origin` di chi le ha fatte, e si tolgono solo le credenziali nostre.
 *
 * Nessun prefisso di percorso — WanGP non li sa gestire. Per questo, oltre a
 * `/wangp/` (la pagina), il gateway riconosce anche i percorsi che quella pagina
 * chiede alla radice (`/gradio_api/…`, `/deepy/…`): **solo** a chi porta il
 * biscotto di WanGP, che si pianta solo dopo aver dimostrato di essere admin.
 *
 * ⚠ **Chi non decide non vede niente**: né il pulsante nella console, né
 * queste rotte. Senza il biscotto valido rispondono 404, come se non ci
 * fossero.
 */

import { request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { connect, type Socket } from "node:net";
import { gzip, createGzip } from "node:zlib";

/** La pagina di WanGP dentro la console. */
export const PREFISSO_WANGP = "/wangp";

/** Il biscotto che dice «questo browser è di un admin che ha aperto WanGP». */
export const BISCOTTO_WANGP = "daprod_wangp";

/**
 * I percorsi che la pagina di WanGP chiede alla radice dell'indirizzo.
 *
 * Sono di Gradio (`/gradio_api`, `/assets`, `/theme.css`…) e di Deepy
 * (`/deepy`, che WanGP monta sotto la stessa porta). Se ne serve uno nuovo lo
 * si vede subito: la pagina resta a metà e la console del browser dice quale.
 */
const RADICI_DI_WANGP = [
  "/gradio_api",
  "/deepy",
  "/deepy_api",
  "/assets",
  "/theme.css",
  "/static",
  "/svelte",
  "/manifest.json",
  "/config",
  "/info",
  "/file=",
  "/stream",
  "/upload",
  "/login",
  "/logout",
  "/heartbeat",
  "/queue",
  "/run",
  "/call",
];

/** Vero se questo percorso, se ci fosse un admin, andrebbe a WanGP. */
export function eDiWanGP(percorso: string): boolean {
  if (percorso === PREFISSO_WANGP || percorso.startsWith(PREFISSO_WANGP + "/")) return true;
  return RADICI_DI_WANGP.some((radice) => percorso === radice || percorso.startsWith(radice + "/") || (radice.endsWith("=") && percorso.startsWith(radice)));
}

/** Quello che serve a passare una richiesta: dove sta WanGP. */
export interface Destinazione {
  host: string;
  porta: number;
}

/** «http://127.0.0.1:7861» → { host, porta }. */
export function destinazioneDa(base: string): Destinazione | null {
  try {
    const u = new URL(base);
    return { host: u.hostname, porta: Number(u.port || 80) };
  } catch {
    return null;
  }
}

/** Il percorso come lo vuole WanGP: senza il prefisso della console. */
function percorsoPerWanGP(url: string): string {
  if (url === PREFISSO_WANGP) return "/";
  if (url.startsWith(PREFISSO_WANGP + "/") || url.startsWith(PREFISSO_WANGP + "?")) {
    const resto = url.slice(PREFISSO_WANGP.length);
    return resto.startsWith("/") ? resto : "/" + resto;
  }
  return url;
}

/**
 * Le intestazioni da passare a WanGP.
 *
 * Restano `Host`, `Origin` e `Referer`, come li ha mandati il browser: sono
 * quelli con cui WanGP ricostruisce i suoi indirizzi e controlla che una
 * richiesta che scrive arrivi dalla pagina giusta. Si tolgono i biscotti e
 * l'`Authorization`: sono **nostri** (il token del dispositivo) e a WanGP non
 * devono arrivare.
 */
function intestazioniPerWanGP(req: IncomingMessage, conCodifica: boolean): Record<string, string | string[]> {
  const fuori: Record<string, string | string[]> = {};
  for (const [nome, valore] of Object.entries(req.headers)) {
    if (valore === undefined) continue;
    const n = nome.toLowerCase();
    if (n === "cookie" || n === "authorization" || n === "proxy-authorization") continue;
    if (n === "accept-encoding" && !conCodifica) continue;
    fuori[n] = valore;
  }
  if (!conCodifica) fuori["accept-encoding"] = "identity";
  const da = req.socket.remoteAddress ?? "";
  fuori["x-forwarded-for"] = String(req.headers["x-forwarded-for"] ?? "") ? `${req.headers["x-forwarded-for"]}, ${da}` : da;
  if (!fuori["x-forwarded-host"] && req.headers.host) fuori["x-forwarded-host"] = req.headers.host;
  return fuori;
}

/** Il tipo si può comprimere? (Le pagine di WanGP sono grosse: la home pesa 9 MB.) */
function siComprime(tipo: string): boolean {
  return /^(text\/|application\/(json|javascript|x-javascript|xml)|image\/svg)/i.test(tipo);
}

const CHIP_TORNA =
  '<a id="daprod-torna" href="/" style="position:fixed;left:8px;bottom:8px;z-index:2147483647;' +
  "background:#f59e0b;color:#111;font:600 13px system-ui,sans-serif;padding:8px 12px;border-radius:999px;" +
  'text-decoration:none;opacity:.92;box-shadow:0 2px 8px rgba(0,0,0,.4)">◀ DaProd</a>';

/** Mette in fondo alla pagina di WanGP il tasto per tornare alla suite. */
export function conIlTastoDiRitorno(html: string): string {
  const fine = html.lastIndexOf("</body>");
  return fine < 0 ? html + CHIP_TORNA : html.slice(0, fine) + CHIP_TORNA + html.slice(fine);
}

/** La pagina che si vede quando WanGP è spento: con il tasto per accenderlo. */
export function paginaWanGPSpento(installato: boolean, errore?: string): string {
  const corpo = installato
    ? `<p>WanGP non è acceso su questo computer.</p>
       <button id="accendi" style="font:600 16px system-ui;padding:12px 20px;border:0;border-radius:10px;background:#f59e0b;color:#111">Accendi WanGP</button>
       <p id="dice" style="opacity:.7;min-height:1.4em"></p>
       ${errore ? `<p style="color:#f87171">${errore.replace(/[<>&]/g, "")}</p>` : ""}
       <script>
         var b = document.getElementById("accendi"), d = document.getElementById("dice");
         b.onclick = function () {
           b.disabled = true; d.textContent = "Lo accendo… ci mette un paio di minuti la prima volta.";
           fetch("/wangp/accendi", { method: "POST" }).then(function (r) { return r.json(); }).then(function (j) {
             if (j && j.errore) { d.textContent = j.errore; b.disabled = false; return; }
             location.reload();
           }).catch(function () { d.textContent = "Non riesco a parlare col computer."; b.disabled = false; });
         };
       </script>`
    : `<p>WanGP non è installato su questo computer.</p>
       <p style="opacity:.7">Installalo dal computer (DaProdProduzioni ti dice come) e riprova.</p>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WanGP</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#08090d;color:#e8e8ee;font:16px system-ui,sans-serif">
<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:22px;color:#f59e0b">WanGP</h1>${corpo}
<p><a href="/" style="color:#f59e0b">◀ Torna a DaProd</a></p></div></body>`;
}

/**
 * Passa una richiesta a WanGP e riporta la risposta.
 *
 * `spento` viene chiamato se WanGP non risponde: la rotta decide cosa mostrare
 * (una pagina per chi naviga, un errore JSON per chi chiama).
 */
export function inoltra(
  req: IncomingMessage,
  res: ServerResponse,
  dove: Destinazione,
  spento: (errore: Error) => void,
): void {
  const percorso = percorsoPerWanGP(req.url ?? "/");
  const chiedeGzip = /\bgzip\b/i.test(String(req.headers["accept-encoding"] ?? ""));
  const daInfilare = (req.method === "GET" || req.method === "HEAD") && percorso.split("?")[0] === "/";

  const su = httpRequest(
    {
      host: dove.host,
      port: dove.porta,
      method: req.method,
      path: percorso,
      headers: intestazioniPerWanGP(req, false),
    },
    (giu) => {
      const tipo = String(giu.headers["content-type"] ?? "");
      const intestazioni = { ...giu.headers } as Record<string, string | string[] | undefined>;
      delete intestazioni["connection"];
      delete intestazioni["keep-alive"];
      delete intestazioni["transfer-encoding"];

      const html = daInfilare && giu.statusCode === 200 && /^text\/html/i.test(tipo);
      if (html) {
        // La pagina intera in memoria (pesa qualche mega), il tasto di ritorno
        // in fondo, e poi compressa: sul telefono nove mega non si scaricano.
        const pezzi: Buffer[] = [];
        giu.on("data", (p: Buffer) => pezzi.push(p));
        giu.on("end", () => {
          const testo = conIlTastoDiRitorno(Buffer.concat(pezzi).toString("utf8"));
          const corpo = Buffer.from(testo, "utf8");
          delete intestazioni["content-length"];
          intestazioni["cache-control"] = "no-store";
          if (chiedeGzip) {
            gzip(corpo, { level: 5 }, (errore, compresso) => {
              if (errore || res.writableEnded) {
                res.destroy();
                return;
              }
              res.writeHead(200, { ...intestazioni, "content-encoding": "gzip", "content-length": compresso.length } as never);
              res.end(compresso);
            });
          } else {
            res.writeHead(200, { ...intestazioni, "content-length": corpo.length } as never);
            res.end(corpo);
          }
        });
        giu.on("error", () => res.destroy());
        return;
      }

      const comprimi =
        chiedeGzip &&
        giu.statusCode === 200 &&
        !giu.headers["content-encoding"] &&
        !giu.headers["content-range"] &&
        siComprime(tipo) &&
        !/^text\/event-stream/i.test(tipo);
      if (comprimi) {
        delete intestazioni["content-length"];
        intestazioni["content-encoding"] = "gzip";
        intestazioni["vary"] = "Accept-Encoding";
        res.writeHead(giu.statusCode ?? 200, intestazioni as never);
        giu.pipe(createGzip({ level: 5 })).pipe(res);
      } else {
        res.writeHead(giu.statusCode ?? 200, intestazioni as never);
        giu.pipe(res);
      }
      giu.on("error", () => res.destroy());
    },
  );

  su.on("error", (errore) => {
    if (res.headersSent) return res.destroy();
    spento(errore);
  });
  // Chi chiude (il telefono che va in tasca) non deve lasciare WanGP a parlare al vuoto.
  res.on("close", () => su.destroy());
  req.pipe(su);
}

/**
 * Passa un WebSocket a WanGP (Deepy ci parla; se non riesce ricade sulle GET).
 *
 * Non si guarda cosa passa: si apre una strada e si lascia andare. Le
 * credenziali sono già state controllate da chi chiama.
 */
export function inoltraUpgrade(req: IncomingMessage, socket: Socket, testa: Buffer, dove: Destinazione): void {
  const upstream = connect(dove.porta, dove.host, () => {
    const righe = [`${req.method} ${percorsoPerWanGP(req.url ?? "/")} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const nome = req.rawHeaders[i]!;
      const n = nome.toLowerCase();
      if (n === "cookie" || n === "authorization" || n === "proxy-authorization") continue;
      righe.push(`${nome}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(righe.join("\r\n") + "\r\n\r\n");
    if (testa.length) upstream.write(testa);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  const chiudi = (): void => {
    upstream.destroy();
    socket.destroy();
  };
  upstream.on("error", chiudi);
  socket.on("error", chiudi);
  upstream.on("close", () => socket.destroy());
  socket.on("close", () => upstream.destroy());
}
