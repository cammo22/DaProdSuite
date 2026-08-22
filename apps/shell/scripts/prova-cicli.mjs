/**
 * I moduli del main si caricano senza girare in tondo?
 *
 * Non è una domanda teorica: un cerchio fra `app-manager`, la finestra di
 * DaProdConnessione e `remoto` avrebbe fatto morire la suite **all'avvio**, con
 * `appManager` ancora `undefined` nel momento in cui `remoto.ts` gli si
 * iscriveva agli eventi. Trovato leggendo, e questo lo tiene fermo.
 *
 * Si guardano i `require` del JavaScript compilato — non i sorgenti — perché è
 * quello che Node esegue davvero.
 *
 *     node apps/shell/scripts/prova-cicli.mjs
 *
 * Vuole `pnpm run build` già fatto, e torna 0 solo se non c'è nessun cerchio.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const radice = resolve(import.meta.dirname, "..", "out", "main");

function tuttiIFile(dove) {
  const dentro = [];
  for (const nome of readdirSync(dove)) {
    const p = join(dove, nome);
    if (statSync(p).isDirectory()) dentro.push(...tuttiIFile(p));
    else if (nome.endsWith(".js")) dentro.push(p);
  }
  return dentro;
}

const archi = new Map();
for (const file of tuttiIFile(radice)) {
  const testo = readFileSync(file, "utf8");
  const vicini = new Set();
  for (const m of testo.matchAll(/require\("(\.[^"]+)"\)/g)) {
    let dove = resolve(dirname(file), m[1]);
    if (!dove.endsWith(".js")) dove += ".js";
    try {
      statSync(dove);
    } catch {
      const indice = dove.replace(/\.js$/, "/index.js");
      try { statSync(indice); dove = indice; } catch { continue; }
    }
    vicini.add(dove);
  }
  archi.set(file, [...vicini]);
}

// Ricerca in profondità: il primo arco che torna su sé stesso è un cerchio.
const stato = new Map();
const cerchi = [];
function visita(nodo, strada) {
  stato.set(nodo, "dentro");
  for (const vicino of archi.get(nodo) ?? []) {
    if (stato.get(vicino) === "dentro") {
      const da = strada.indexOf(vicino);
      cerchi.push([...strada.slice(da), vicino].map((f) => relative(radice, f)));
    } else if (!stato.has(vicino)) {
      visita(vicino, [...strada, vicino]);
    }
  }
  stato.set(nodo, "fuori");
}
for (const nodo of archi.keys()) if (!stato.has(nodo)) visita(nodo, [nodo]);

if (cerchi.length === 0) {
  console.log(`  ok   nessun cerchio fra i ${archi.size} moduli del main`);
  process.exit(0);
}
console.log(`  NO   ${cerchi.length} cerchi fra i moduli:`);
for (const c of cerchi) console.log("       " + c.join(" → "));
process.exit(1);
