/**
 * tsc compila solo i .ts. HTML e CSS del renderer vanno copiati accanto al
 * JavaScript prodotto, altrimenti out/renderer/index.html non esiste e la
 * finestra si apre vuota.
 */

import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const shellDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(shellDir, "src", "renderer");
const dest = join(shellDir, "out", "renderer");

const ESTENSIONI = new Set([".html", ".css", ".png", ".svg", ".woff2"]);

await mkdir(dest, { recursive: true });

let copiati = 0;
for (const nome of await readdir(src)) {
  if (!ESTENSIONI.has(extname(nome))) continue;
  await cp(join(src, nome), join(dest, nome));
  copiati += 1;
}

// Le copertine delle schede, generate con Anima (`scripts/genera-copertine.cjs`).
// Vanno copiate come cartella: sono file dell'interfaccia come l'HTML, e senza
// questo passaggio le schede si aprirebbero senza illustrazione.
try {
  await cp(join(src, "media"), join(dest, "media"), { recursive: true });
  copiati += (await readdir(join(src, "media"))).length;
} catch {
  // Non ci sono ancora: si generano quando serve, non a ogni compilazione.
}

console.log(`copy-assets: ${copiati} file in out/renderer`);
