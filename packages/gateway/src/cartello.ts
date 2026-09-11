/**
 * **Il cartello**: dove il computer scrive come trovarlo, quando il suo
 * indirizzo da fuori cambia nome.
 *
 * Chiesto l'11 settembre 2026, dopo una sera passata fuori casa: «la
 * connessione e' la cosa piu' importante, deve sempre essere affidabile e
 * riconnettere bene gli utenti... aspetto il tuo fix DEFINITIVO».
 *
 * ## Il buco che chiude
 *
 * Da fuori si passa dal tunnel gratuito di Cloudflare, e il suo nome cambia
 * quando il tunnel riparte. Il telefono prova gli indirizzi che ha in tasca, e
 * se sono tutti morti non ha modo di sapere quello nuovo: per saperlo dovrebbe
 * parlare col computer, e per parlarci gli serve l'indirizzo. La 1.3.1 ha curato
 * il rientro a mano — un messaggio da mandare su WhatsApp — e questo lo fa da
 * solo, senza che nessuno debba accorgersene.
 *
 * ## Come funziona
 *
 * Il computer scrive i suoi indirizzi da fuori su una bacheca pubblica —
 * ntfy.sh, gratuita e senza account — sotto un nome diverso per ogni telefono,
 * ricavato dalla chiave di quel telefono. Il telefono, quando non trova il
 * computer, legge il suo cartello, controlla la firma, e bussa all'indirizzo
 * nuovo con la solita porta `/io`.
 *
 * ## Perche' ci si puo' fidare di una bacheca pubblica
 *
 * - **Il nome del cartello si ricava dalla chiave del telefono**: chi non ha la
 *   chiave non sa dove guardare. Sono 128 bit, non si indovinano.
 * - **Quello che c'e' scritto e' firmato** con la stessa chiave: chi indovinasse
 *   il nome non potrebbe scriverci un indirizzo suo, perche' il telefono lo
 *   butterebbe via.
 * - **E comunque il telefono bussa con `/io`**: se dall'altra parte non c'e' il
 *   suo computer, non entra niente.
 *
 * Sulla bacheca finisce l'indirizzo del tunnel e basta — lo stesso che e' gia'
 * pubblico su Internet, e che senza chiave risponde 401 a tutto. Non ci finisce
 * la chiave, non ci finisce la rete di casa.
 *
 * ⚠ **La stessa ricetta sta nell'app**, in `Cartello.kt`. Due lingue e una
 * ricetta sola: `prova-cartello.mjs` e `CartelloTest.kt` calcolano lo stesso
 * esempio e aspettano gli stessi numeri. Se una delle due cambia, cade la sua
 * prova — che e' l'unico modo di tenere allineate due cose scritte in due
 * lingue.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** La bacheca. Gratuita, senza account, e tiene i messaggi dodici ore. */
export const BACHECA = "https://ntfy.sh";

/** La forma del cartello. Sale se un giorno cambia cosa c'e' scritto. */
const VERSIONE = 1;

/** Il nome del cartello di un telefono: si ricava dalla sua chiave, e non la rivela. */
export function argomentoDi(token: string): string {
  const impronta = createHash("sha256").update("daprod-cartello-nome:" + token).digest("hex");
  return "daprod_" + impronta.slice(0, 32);
}

/** La chiave della firma: anche questa dalla chiave del telefono, e diversa dal nome. */
function chiaveDi(token: string): Buffer {
  return createHash("sha256").update("daprod-cartello-chiave:" + token).digest();
}

/** Quello che si firma: una riga per pezzo, sempre nello stesso ordine. */
function testoDaFirmare(pc: string, quando: number, basi: string[]): string {
  return ["daprod-cartello/" + VERSIONE, pc, String(quando), ...basi].join("\n");
}

export function firmaDi(token: string, pc: string, quando: number, basi: string[]): string {
  return createHmac("sha256", chiaveDi(token)).update(testoDaFirmare(pc, quando, basi)).digest("hex");
}

/** Quello che sta scritto sul cartello. */
export interface Cartello {
  v: number;
  /** Il computer che l'ha scritto: l'id con cui si annuncia sulla rete. */
  pc: string;
  quando: number;
  /** Gli indirizzi da fuori, dal piu' vicino. */
  basi: string[];
  firma: string;
}

export function scriviCartello(
  token: string,
  pc: string,
  basi: string[],
  quando: number = Date.now(),
): Cartello {
  return { v: VERSIONE, pc, quando, basi, firma: firmaDi(token, pc, quando, basi) };
}

/**
 * Legge un cartello e lo tiene **solo se la firma torna**. Serve alle prove e a
 * chi un giorno volesse leggerlo dal computer: il telefono fa lo stesso conto
 * in `Cartello.kt`.
 */
export function leggiCartello(testo: string, token: string): Cartello | null {
  try {
    const c = JSON.parse(testo) as Partial<Cartello>;
    if (c.v !== VERSIONE || typeof c.pc !== "string" || typeof c.quando !== "number") return null;
    if (!Array.isArray(c.basi) || typeof c.firma !== "string") return null;
    const basi = c.basi.filter((b): b is string => typeof b === "string");
    const attesa = Buffer.from(firmaDi(token, c.pc, c.quando, basi), "hex");
    const arrivata = Buffer.from(c.firma, "hex");
    if (arrivata.length !== attesa.length || !timingSafeEqual(arrivata, attesa)) return null;
    return { v: VERSIONE, pc: c.pc, quando: c.quando, basi, firma: c.firma };
  } catch {
    return null;
  }
}

export interface EsitoCartelli {
  /** Quanti cartelli sono stati scritti. */
  scritti: number;
  /** Cosa e' andato storto, uno per cartello non scritto. */
  falliti: string[];
}

/**
 * Scrive il cartello di ogni telefono. Non solleva mai: una bacheca che non
 * risponde e' un cartello in meno, non una suite che si ferma.
 *
 * `manda` e `bacheca` si passano da fuori per le prove, che non vanno su
 * Internet.
 */
export async function pubblicaCartelli(
  tokens: string[],
  pc: string,
  basi: string[],
  opzioni: { bacheca?: string; manda?: typeof fetch; quando?: number } = {},
): Promise<EsitoCartelli> {
  const bacheca = (opzioni.bacheca ?? BACHECA).replace(/\/+$/, "");
  const manda = opzioni.manda ?? fetch;
  const quando = opzioni.quando ?? Date.now();
  const esito: EsitoCartelli = { scritti: 0, falliti: [] };
  for (const token of [...new Set(tokens.filter((t) => t))]) {
    const argomento = argomentoDi(token);
    try {
      const risposta = await manda(`${bacheca}/${argomento}`, {
        method: "POST",
        body: JSON.stringify(scriviCartello(token, pc, basi, quando)),
        signal: AbortSignal.timeout(10_000),
      });
      if (risposta.ok) esito.scritti += 1;
      else esito.falliti.push(`${argomento.slice(0, 14)}…: risponde ${risposta.status}`);
    } catch (err) {
      esito.falliti.push(`${argomento.slice(0, 14)}…: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return esito;
}
