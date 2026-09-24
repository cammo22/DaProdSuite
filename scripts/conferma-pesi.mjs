/**
 * Scrive nel catalogo il peso vero dei modelli che ne hanno solo una stima.
 *
 *     node scripts/conferma-pesi.mjs
 *
 * I modelli con `"pesoDaConfermare": true` in `manifest/models.json` sono
 * entrati da una macchina che HuggingFace non lo raggiungeva (vedi
 * `packages/runtime/src/peso.ts`). La suite li scarica lo stesso — il peso lo
 * chiede al server al momento — ma finche' la bandierina c'e', il «quanti GB
 * mancano» e' una stima.
 *
 * Questo script chiede a ogni indirizzo quanto pesa, riscrive `bytes` col
 * numero vero e toglie la bandierina. Tocca solo quelle due righe per modello:
 * il resto del file, commenti e righe vuote comprese, resta com'e'.
 *
 * Se un indirizzo non risponde lo dice e va avanti con gli altri: un nome
 * sbagliato si vede qui, in un minuto, invece che a meta' di un'installazione.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const percorso = join(import.meta.dirname, "..", "manifest", "models.json");
let testo = readFileSync(percorso, "utf8");
const catalogo = JSON.parse(testo);

let confermati = 0;
let rotti = 0;
for (const [id, voce] of Object.entries(catalogo.models)) {
  if (!voce.pesoDaConfermare) continue;
  try {
    const risposta = await fetch(voce.url, {
      headers: { "user-agent": "DaProdSuite", range: "bytes=0-0" },
      redirect: "follow",
    });
    await risposta.arrayBuffer().catch(() => undefined);
    if (!risposta.ok) throw new Error(`risponde ${risposta.status}`);
    const totale = Number((risposta.headers.get("content-range") ?? "").split("/")[1]);
    if (!Number.isFinite(totale) || totale <= 0) throw new Error("non dice quanto pesa");

    const inizio = testo.indexOf(`"${id}": {`);
    const fine = testo.indexOf("\n    }", inizio);
    let blocco = testo.slice(inizio, fine);
    blocco = blocco.replace(/"bytes": \d+/, `"bytes": ${totale}`);
    blocco = blocco.replace(/\n\s*"pesoDaConfermare": true,?/, "");
    // Se la bandierina era l'ultima voce, la virgola di prima resta appesa.
    blocco = blocco.replace(/,(\s*)$/, "$1");
    testo = testo.slice(0, inizio) + blocco + testo.slice(fine);
    confermati++;
    console.log(`✓ ${id}: ${totale} byte (${(totale / 1024 ** 3).toFixed(2)} GB, stimati ${(voce.bytes / 1024 ** 3).toFixed(2)})`);
  } catch (errore) {
    rotti++;
    console.log(`✗ ${id}: ${errore.message} — ${voce.url}`);
  }
}

JSON.parse(testo);
writeFileSync(percorso, testo);
console.log(`\n${confermati} confermati, ${rotti} da guardare.`);
process.exit(rotti > 0 ? 1 : 0);
