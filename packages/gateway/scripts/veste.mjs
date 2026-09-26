/**
 * Porta il vestito DaProd dentro il gateway.
 *
 *     node packages/gateway/scripts/veste.mjs
 *
 * Il vestito sta in `packages/ui/src` — `daprod.css`, `daprod-sfondo.js`, i
 * font — e lo leggono cinque posti (vedi il commento in cima a `daprod.css`).
 * Il gateway pero' gira dentro l'installer, dove `packages/ui` non c'e' come
 * cartella: quindi i file gli si mettono **dentro**, in un modulo generato
 * (`src/veste-generata.ts`), e lui li serve sotto `/daprod/`.
 *
 * Gira a ogni `build` del gateway: il modulo non si tocca a mano. Sta comunque
 * nel repo, cosi' `tsc --noEmit` funziona anche su una copia appena clonata.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const ui = join(import.meta.dirname, "..", "..", "ui", "src");
const TIPI = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".woff2": "font/woff2" };

const file = {};
// 1.5.2: anche il dado delle idee, per Crea della console (vedi copione-crea.ts).
for (const nome of ["daprod.css", "daprod-sfondo.js", "idee.js"]) file[nome] = readFileSync(join(ui, nome));
for (const nome of readdirSync(join(ui, "fonts"))) {
  if (extname(nome) === ".woff2") file["fonts/" + nome] = readFileSync(join(ui, "fonts", nome));
}

const impronta = createHash("sha256");
for (const nome of Object.keys(file).sort()) impronta.update(nome).update(file[nome]);
const versione = impronta.digest("hex").slice(0, 12);

let testo =
  "/**\n" +
  " * GENERATO da scripts/veste.mjs: non si tocca a mano.\n" +
  " *\n" +
  " * Il vestito DaProd (packages/ui/src), dentro il gateway: la console e la\n" +
  " * sala giochi lo prendono da /daprod/. Vedi scripts/veste.mjs.\n" +
  " */\n\n" +
  "/** Cambia quando cambia uno qualunque dei file: va in coda agli indirizzi. */\n" +
  "export const VESTE_VERSIONE = " + JSON.stringify(versione) + ";\n\n" +
  "export const VESTE: Record<string, { tipo: string; base64: string }> = {\n";
for (const nome of Object.keys(file).sort()) {
  testo +=
    "  " + JSON.stringify(nome) + ": { tipo: " + JSON.stringify(TIPI[extname(nome)]) +
    ", base64: " + JSON.stringify(file[nome].toString("base64")) + " },\n";
}
testo += "};\n";

writeFileSync(join(import.meta.dirname, "..", "src", "veste-generata.ts"), testo);
console.log("veste: " + Object.keys(file).length + " file, versione " + versione);
