/**
 * Le prove del cartello: il pezzo che fa rientrare da solo chi e' fuori casa.
 *
 *     node apps/shell/scripts/prova-cartello.mjs
 *
 * Il cartello e' dove il computer scrive i suoi indirizzi da fuori, su una
 * bacheca pubblica, per ogni telefono collegato (vedi
 * `packages/gateway/src/cartello.ts`). Nato l'11 settembre 2026, la sera in cui
 * il tunnel aveva cambiato nome e l'app diceva «non riesco a parlare col
 * computer» con il computer acceso.
 *
 * ⚠ **Due lingue, una ricetta.** Il telefono fa gli stessi conti in Kotlin
 * (`Cartello.kt`). Questa prova e `CartelloTest.kt` usano lo stesso esempio e
 * aspettano gli stessi numeri: se una ricetta cambia, cade la sua prova. E' la
 * sola cosa che tiene allineate due cose scritte in due lingue.
 *
 * Non va su Internet: la bacheca e' finta. Vuole `packages/gateway/dist` gia'
 * compilato.
 */

import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const G = require(join(import.meta.dirname, "..", "..", "..", "packages", "gateway", "dist", "index.js"));

let passate = 0;
const cadute = [];

async function prova(cosa, fn) {
  try {
    await fn();
    passate++;
    console.log("  ok   " + cosa);
  } catch (errore) {
    cadute.push(cosa + " — " + errore.message);
    console.log("  NO   " + cosa + " — " + errore.message);
  }
}

function uguale(avuto, atteso, dettaglio) {
  const a = JSON.stringify(avuto);
  const b = JSON.stringify(atteso);
  if (a !== b) throw new Error((dettaglio ? dettaglio + ": " : "") + "avuto " + a + ", atteso " + b);
}

function vero(condizione, dettaglio) {
  if (!condizione) throw new Error(dettaglio ?? "doveva essere vero");
}

/** L'esempio comune: gli stessi numeri stanno in `CartelloTest.kt`. */
const CHIAVE = "0123456789abcdef".repeat(4);
const PC = "pc_prova";
const QUANDO = 1789000000000;
const BASI = ["https://esempio-di-prova.trycloudflare.com"];
const ARGOMENTO = "daprod_26bdd02c63ce1387f3f0159598b97e12";
const FIRMA = "fb9e6bfcf81c6ba024c3dc356c002da2abac100e4d20466f87762579e2715f9b";

console.log("\n— il cartello —");

await prova("il nome del cartello e' quello che calcola anche il telefono", () => {
  uguale(G.argomentoDi(CHIAVE), ARGOMENTO);
});

await prova("la firma e' quella che calcola anche il telefono", () => {
  uguale(G.firmaDi(CHIAVE, PC, QUANDO, BASI), FIRMA);
});

await prova("un cartello scritto si rilegge con la stessa chiave", () => {
  const letto = G.leggiCartello(JSON.stringify(G.scriviCartello(CHIAVE, PC, BASI, QUANDO)), CHIAVE);
  vero(letto, "doveva rileggersi");
  uguale(letto.basi, BASI);
  uguale(letto.firma, FIRMA);
});

await prova("con un'altra chiave non si legge", () => {
  const scritto = JSON.stringify(G.scriviCartello(CHIAVE, PC, BASI, QUANDO));
  uguale(G.leggiCartello(scritto, "f".repeat(64)), null);
});

/**
 * ⚠ **Chi indovinasse il nome non potrebbe scriverci un indirizzo suo.** E' la
 * ragione per cui una bacheca pubblica va bene: il telefono butta via tutto
 * quello che non e' firmato con la sua chiave.
 */
await prova("un indirizzo cambiato rompe la firma", () => {
  const c = G.scriviCartello(CHIAVE, PC, BASI, QUANDO);
  c.basi = ["https://ladro.example"];
  uguale(G.leggiCartello(JSON.stringify(c), CHIAVE), null);
});

await prova("ogni telefono ha il suo cartello, una volta sola, e la chiave non esce", async () => {
  const mandati = [];
  const manda = async (url, opzioni) => {
    mandati.push({ url, corpo: String(opzioni.body) });
    return { ok: true, status: 200 };
  };
  const altra = "b".repeat(64);
  const esito = await G.pubblicaCartelli([CHIAVE, altra, CHIAVE, ""], PC, BASI, {
    manda,
    bacheca: "https://bacheca.finta/",
    quando: QUANDO,
  });
  uguale(esito.scritti, 2, "due telefoni, due cartelli");
  uguale(mandati.map((m) => m.url), [
    "https://bacheca.finta/" + G.argomentoDi(CHIAVE),
    "https://bacheca.finta/" + G.argomentoDi(altra),
  ]);
  vero(!mandati.some((m) => m.corpo.includes(CHIAVE) || m.corpo.includes(altra)),
    "la chiave di un telefono non deve mai finire sulla bacheca");
  uguale(JSON.parse(mandati[0].corpo).firma, FIRMA, "sulla bacheca va lo stesso cartello dell'esempio");
});

await prova("una bacheca giu' non ferma niente, e si segna", async () => {
  const giu = await G.pubblicaCartelli([CHIAVE], PC, BASI, {
    manda: async () => {
      throw new Error("la linea e' giu'");
    },
  });
  uguale(giu.scritti, 0);
  uguale(giu.falliti.length, 1);
  const no = await G.pubblicaCartelli([CHIAVE], PC, BASI, {
    manda: async () => ({ ok: false, status: 429 }),
  });
  vero(no.falliti[0].includes("429"), "il no della bacheca si legge nel registro");
});

console.log("\n  prove passate: " + passate);
if (cadute.length) {
  console.log("  prove cadute:  " + cadute.length + "\n");
  for (const c of cadute) console.log("  x " + c);
  process.exit(1);
}
console.log("  tutte verdi.\n");
