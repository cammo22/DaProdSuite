/**
 * Porta i giochi d'arcade DaProd dentro la sala della suite.
 *
 *     node packages/giochi/scripts/porta-la-sala.mjs [cartella-delle-repo]
 *
 * ⚠ Nuovo nella 1.4.0 (CONCETTI.md § 18.4). Coin Dozer, Claw Machine e Neon
 * Partenope vivono nelle loro repo, e li' restano la copia buona: questo script
 * ne fa una **copia per la suite** in `packages/giochi/sala/`, con tre ritocchi
 * e basta:
 *
 * 1. three.js da unpkg diventa quello in casa (`sala/three/`): la suite non
 *    chiama Internet, e un gioco che aspetta una CDN col tunnel lento non parte;
 * 2. i font di Google se ne vanno, per la stessa ragione: restano quelli di
 *    riserva del gioco;
 * 3. `daprod-lira.js` punta a quello della sala (`../daprod-lira.js`), che e'
 *    la copia buona del portafoglio — i giochi ne tengono una uguale.
 *
 * Le repo si cercano accanto a questa (`../daprod-coin-dozer`, ...), o nella
 * cartella che si dice. three.js viene da `node_modules/three`, e se manca si
 * installa a parte: `npm i --no-save three@0.160.0` nella cartella del
 * pacchetto.
 *
 * Il risultato si mette nel repo: la sala va servita anche da chi le altre
 * repo non le ha.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const QUI = join(import.meta.dirname, "..");
const SALA = join(QUI, "sala");
const REPO = process.argv[2] || join(QUI, "..", "..", "..");
const CDN = "https://unpkg.com/three@0.160.0/";

function pulisci(html, verso) {
  if (!html.includes(CDN)) throw new Error("URL della CDN non trovato");
  return html
    .split(CDN).join(verso + "three/")
    .replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, "")
    .replace('<script src="daprod-lira.js"></script>', '<script src="' + verso + 'daprod-lira.js"></script>');
}

function gioco(nome, sorgente, verso = "../") {
  const html = readFileSync(sorgente, "utf8");
  const dest = join(SALA, nome);
  mkdirSync(dest, { recursive: true });
  writeFileSync(join(dest, "index.html"), pulisci(html, verso));
  console.log("  " + nome + " ← " + sorgente);
}

/* three.js, in casa */
const require = createRequire(join(QUI, "package.json"));
// Oppure `THREE=/percorso/di/three` (il pacchetto npm scompattato): in un
// workspace pnpm `npm i` non si puo' fare, e `npm pack three@0.160.0` si.
let three = process.env.THREE;
try {
  three ??= dirname(require.resolve("three/package.json"));
} catch {
  console.error("three.js non trovato: npm i --no-save three@0.160.0 in packages/giochi");
  process.exit(1);
}
rmSync(join(SALA, "three"), { recursive: true, force: true });
for (const d of ["build/three.module.js", "examples/jsm/postprocessing", "examples/jsm/shaders", "examples/jsm/environments", "LICENSE"]) {
  cpSync(join(three, d), join(SALA, "three", d), { recursive: true });
}
console.log("  three ← " + three);

gioco("dozer", join(REPO, "daprod-coin-dozer", "index.html"));
gioco("claw", join(REPO, "DaProd-ClawMachine", "gioca", "index.html"));

/* Neon non ha three.js: e' HTML, CSS e JS suoi, e si copia com'e'. */
const neon = join(REPO, "daprod-neon-partenope");
if (existsSync(neon)) {
  const dest = join(SALA, "neon");
  rmSync(dest, { recursive: true, force: true });
  for (const d of ["css", "js", "img/icona-192.png", "manifest.webmanifest"]) {
    if (existsSync(join(neon, d))) cpSync(join(neon, d), join(dest, d), { recursive: true });
  }
  const html = readFileSync(join(neon, "index.html"), "utf8")
    .replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, "")
    .replace('<script src="daprod-lira.js"></script>', '<script src="../daprod-lira.js"></script>');
  writeFileSync(join(dest, "index.html"), html);
  console.log("  neon ← " + neon);
}
console.log("sala pronta in " + SALA);
