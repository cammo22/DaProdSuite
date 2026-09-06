/**
 * Le prove del telefono, senza Android e senza rete.
 *
 * `pnpm run prova-telefono`
 *
 * ## Perché stanno a parte da `pnpm run prova`
 *
 * Perché vogliono Gradle e la JVM, e chi lancia le prove del gateway le vuole
 * in dieci secondi. Questo giro ne prende una trentina la prima volta.
 *
 * ## Cosa provano
 *
 * La parte del telefono che **decide** invece di parlare: quale indirizzo del
 * computer usare fra quelli che rispondono. È la regola che è costata tre giri
 * di correzioni sbagliate al difetto «ad ogni aggiornamento devo eliminare e
 * rifare l'account» — vedi `IndirizziTest`.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const MOBILE = join(QUI, "..");

console.log("\n— le prove del telefono —");

const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const giro = spawnSync(join(MOBILE, gradle), ["testDebugUnitTest", "-q"], {
  cwd: MOBILE,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (giro.status !== 0) {
  console.log("\n  Gradle ha detto di no. Sopra c'è il perché.\n");
  process.exit(1);
}

// I risultati veri stanno negli XML: Gradle in modalità silenziosa non li conta.
const cartella = join(MOBILE, "app", "build", "test-results", "testDebugUnitTest");
let prove = 0;
let male = 0;
for (const f of readdirSync(cartella).filter((x) => x.endsWith(".xml"))) {
  const testo = readFileSync(join(cartella, f), "utf8");
  const conto = /tests="(\d+)"[^>]*failures="(\d+)"[^>]*errors="(\d+)"/.exec(testo);
  if (!conto) continue;
  prove += Number(conto[1]);
  male += Number(conto[2]) + Number(conto[3]);
  for (const [, nome] of testo.matchAll(/<testcase name="([^"]+)"/g)) {
    console.log(`  ok   ${nome}`);
  }
}

console.log(male === 0 ? `\n${prove} prove, tutto a posto.\n` : `\n${male} prove fallite.\n`);
process.exit(male === 0 ? 0 : 1);
