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

console.log(`copy-assets: ${copiati} file in out/renderer`);
