/**
 * I file dei giochi d'arcade, per chi li serve (il gateway, sotto
 * `/giochi/sala/`).
 *
 * ⚠ Nuovo nella 1.4.0 (CONCETTI.md § 18.4). I giochi stanno nella cartella
 * `sala/` di questo pacchetto — ce li mette `scripts/porta-la-sala.mjs` dalle
 * loro repo — e dentro l'installer ci arrivano insieme al pacchetto
 * (`electron-builder.yml`).
 */

import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const RADICE = join(__dirname, "..", "sala");

const TIPI: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
};

/**
 * Il file di un gioco, o `null`. Un percorso che esce dalla cartella della
 * sala non e' un file della sala: la sala non e' una finestra sul disco.
 */
export function fileDellaSala(percorso: string): { file: string; tipo: string } | null {
  let dentro = decodeURIComponent(percorso).replace(/^\/+/, "");
  if (dentro === "" || dentro.endsWith("/")) dentro += "index.html";
  const file = normalize(join(RADICE, dentro));
  if (!file.startsWith(RADICE + sep)) return null;
  if (!existsSync(file)) {
    const indice = join(file, "index.html");
    if (existsSync(indice)) return { file: indice, tipo: TIPI[".html"]! };
    return null;
  }
  if (!statSync(file).isFile()) return null;
  return { file, tipo: TIPI[extname(file).toLowerCase()] ?? "application/octet-stream" };
}
