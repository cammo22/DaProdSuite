/**
 * Guardare dentro la pagina che gira nel telefono, da qui.
 *
 *     node apps/mobile/scripts/dentro-la-pagina.mjs "document.title"
 *     node apps/mobile/scripts/dentro-la-pagina.mjs --errori
 *
 * ## Perché esiste
 *
 * Questa app è **un vetro su una pagina web**, e fino alla 0.8.2 quando quella
 * pagina si comportava male dentro la WebView non c'era nessun modo di
 * guardarci dentro: si tirava a indovinare confrontando screenshot. È il
 * motivo per cui certi difetti — «i video non si vedono bene», «spesso crasha»
 * — sono rimasti aperti a lungo: non erano difficili, erano **invisibili**.
 *
 * Con `WebView.setWebContentsDebuggingEnabled(true)` nelle build di debug (vedi
 * `preparaWeb` in MainActivity) la WebView apre un socket con dentro il
 * protocollo di Chrome. Questo copione ci si attacca e valuta un'espressione,
 * come farebbe la console del browser.
 *
 * ## Come si usa
 *
 * Serve un telefono (o un emulatore) collegato, con l'app **di debug** aperta.
 * Il resto lo fa da sé: trova il socket, apre il ponte con `adb forward`, si
 * collega, chiede, e stampa la risposta.
 *
 * ⚠ Non funziona sull'APK della Release, ed è voluto: un'app pubblicata che
 * lascia ispezionare la propria pagina regala il token a chiunque abbia il
 * telefono in mano per due minuti.
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ADB = process.env.ADB ||
  join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");

const PORTA = Number(process.env.PORTA_DEVTOOLS) || 9222;

function adb(...argomenti) {
  return execFileSync(ADB, argomenti, { encoding: "utf8" });
}

/** Il socket che la WebView apre. Il numero in fondo è il pid dell'app. */
function trovaIlSocket() {
  const righe = adb("shell", "cat", "/proc/net/unix").split("\n");
  const riga = righe.find((r) => r.includes("webview_devtools_remote"));
  if (!riga) {
    throw new Error(
      "Nessuna WebView da ispezionare. Controlla che il telefono sia collegato, " +
        "che l'app aperta sia quella di debug (non quella della Release) e che " +
        "sia dentro la suite, non sulla schermata del nome.",
    );
  }
  return riga.split("@").pop().trim();
}

/** L'indirizzo WebSocket della pagina, passando dal ponte. */
async function laPagina() {
  const socket = trovaIlSocket();
  adb("forward", `tcp:${PORTA}`, `localabstract:${socket}`);
  const risposta = await fetch(`http://127.0.0.1:${PORTA}/json`);
  const pagine = await risposta.json();
  const pagina = pagine.find((p) => p.type === "page");
  if (!pagina) throw new Error("La WebView c'è ma non ha nessuna pagina aperta.");
  return pagina;
}

/**
 * Chiede alla pagina di valutare un'espressione e torna il risultato.
 *
 * `awaitPromise` sta a vero perché quasi tutto quello che si vuole chiedere a
 * questa pagina è asincrono: senza, si riceverebbe la parola «Promise».
 */
async function chiedi(ws, espressione) {
  const { WebSocket } = globalThis;
  return new Promise((risolvi, rifiuta) => {
    const presa = new WebSocket(ws);
    const scaduta = setTimeout(() => {
      presa.close();
      rifiuta(new Error("La pagina non ha risposto entro dieci secondi."));
    }, 10_000);

    presa.addEventListener("open", () => {
      presa.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: {
            expression: espressione,
            returnByValue: true,
            awaitPromise: true,
            allowUnsafeEvalBlockedByCSP: true,
          },
        }),
      );
    });

    presa.addEventListener("message", (ev) => {
      let messaggio;
      try {
        messaggio = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (messaggio.id !== 1) return;
      clearTimeout(scaduta);
      presa.close();
      if (messaggio.error) return rifiuta(new Error(messaggio.error.message));
      const esito = messaggio.result;
      if (esito?.exceptionDetails) {
        return rifiuta(new Error(esito.exceptionDetails.text + " " + (esito.exceptionDetails.exception?.description ?? "")));
      }
      risolvi(esito?.result?.value);
    });

    presa.addEventListener("error", () => {
      clearTimeout(scaduta);
      rifiuta(new Error("Non riesco a parlare con la pagina."));
    });
  });
}

const argomento = process.argv.slice(2).join(" ").trim();

/**
 * Senza argomenti si racconta com'è messa la pagina.
 *
 * Sono le cinque cose che si vogliono sapere per prime quando qualcosa non
 * torna: chi sei, dove sei, cosa sta suonando, cosa c'è aperto sopra, e se
 * qualcosa è esploso.
 */
const RIASSUNTO = `(() => {
  const q = (id) => document.getElementById(id);
  return {
    indirizzo: location.href,
    scheda: document.querySelector(".pagina.on")?.id || null,
    haToken: !!localStorage.getItem("daprod.token"),
    chi: localStorage.getItem("daprod.nome") || null,
    barraLettore: q("barra-lettore") ? !q("barra-lettore").hidden : null,
    palco: q("palco") ? !q("palco").hidden : null,
    lente: !!document.querySelector(".lente"),
    foglio: !!document.getElementById("foglio"),
    visual: q("visual") ? !q("visual").hidden : null,
    larghezza: innerWidth,
    altezza: innerHeight,
    pixel: devicePixelRatio,
  };
})()`;

try {
  const pagina = await laPagina();
  const risposta = await chiedi(pagina.webSocketDebuggerUrl, argomento || RIASSUNTO);
  console.log(typeof risposta === "string" ? risposta : JSON.stringify(risposta, null, 2));
} catch (errore) {
  console.error(errore.message);
  process.exit(1);
}
