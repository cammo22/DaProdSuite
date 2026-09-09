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

/**
 * La versione dell'APK **non si scrive a mano**.
 *
 * ⚠ Il difetto del 9 settembre 2026: «l'app mobile mostra sempre
 * aggiornamenti e fa reinstallare sempre la stessa versione». Il numero era
 * fermo alla 1.2.0 da tre release, quindi l'app si aggiornava, si riguardava
 * dentro, leggeva ancora 1.2.0 e ricominciava.
 *
 * Questa prova non compila niente: guarda il file. E' il tipo di difetto che
 * torna da solo, il giorno che qualcuno "mette a posto" quella riga scrivendoci
 * un numero — e che non si vede finche' non hai un telefono in mano.
 */
{
  const build = readFileSync(join(MOBILE, "app", "build.gradle.kts"), "utf8");
  const aMano = /versionName\s*=\s*"/.test(build);
  if (aMano) {
    console.log(
      "  NO   la versione dell'APK e' scritta a mano in build.gradle.kts:" +
        " deve venire da package.json, se no l'app si aggiorna all'infinito",
    );
    process.exit(1);
  }
  const radice = JSON.parse(readFileSync(join(MOBILE, "..", "..", "package.json"), "utf8"));
  console.log(`  ok   la versione dell'APK viene dalla suite (${radice.version})`);
}


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
