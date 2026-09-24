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

// Il vestito DaProd comune (1.4.0): foglio, fondo e font da `packages/ui`,
// in una cartella sua accanto all'HTML. L'hub si apre da file e non vede
// `/comune/` come le schede: gli si mette accanto una copia a ogni build.
const ui = join(shellDir, "..", "..", "packages", "ui", "src");
await mkdir(join(dest, "daprod", "fonts"), { recursive: true });
for (const nome of ["daprod.css", "daprod-sfondo.js"]) {
  await cp(join(ui, nome), join(dest, "daprod", nome));
  copiati += 1;
}
for (const nome of await readdir(join(ui, "fonts"))) {
  if (extname(nome) !== ".woff2") continue;
  await cp(join(ui, "fonts", nome), join(dest, "daprod", "fonts", nome));
  copiati += 1;
}

console.log(`copy-assets: ${copiati} file in out/renderer`);
