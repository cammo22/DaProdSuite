/**
 * Compila `tailponte/` in un `.aar` che Gradle sa mettere dentro l'app.
 *
 * ⚠ **Perche' non basta `gomobile bind` a mano.** Perche' questo pezzo lo deve
 * ricompilare anche la CI, su una macchina che parte vuota, e perche' un `.aar`
 * da 30 MB **non si mette dentro git**: e' roba compilata, cambia a ogni
 * versione di Tailscale, e in un anno di release peserebbe piu' di tutto il
 * resto del repository messo insieme. Quindi si rifa' quando serve, e per
 * rifarlo serve uno script che sappia dove sono le cose.
 *
 * Cosa serve avere in macchina:
 *
 *   - **Go 1.24 o piu'** (`go version`);
 *   - **l'NDK di Android**, che l'SDK di solito ha gia' — qui lo si cerca da
 *     solo dentro `ANDROID_HOME`, cosi' non c'e' una variabile in piu' da
 *     ricordarsi;
 *   - **gomobile e gobind**, che questo script installa da se' se mancano.
 *
 * Non ricompila se il `.aar` c'e' gia' ed e' piu' nuovo dei sorgenti: la
 * compilazione dura circa un minuto, e farla a ogni `assembleDebug` renderebbe
 * insopportabile provare qualsiasi cosa.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const qui = dirname(fileURLToPath(import.meta.url));
const modulo = join(qui, "..", "tailponte");
/*
 * Dove finisce. `app/libs/` e' il posto che Gradle guarda da solo (vedi
 * `fileTree("libs")` in `app/build.gradle.kts`): mettendolo li' non serve
 * insegnare niente a nessuno.
 */
const uscita = join(qui, "..", "app", "libs", "tailponte.aar");

/**
 * ⚠ **Quali processori.**
 *
 * `arm64-v8a` e' l'unico che serve davvero: qualunque telefono Android uscito
 * dal 2016 in poi e' arm64, e il Play Store non accetta piu' niente altro da
 * anni. `x86_64` serve **solo all'emulatore**, cioe' solo a noi per provare.
 *
 * Tenerli tutti e due vorrebbe dire 15 MB in piu' addosso a ogni telefono vero
 * per far comodo a una macchina che non e' un telefono. Quindi: la release
 * porta solo arm64, e chi vuole provare sull'emulatore chiede l'altro con
 * `--con-emulatore`. Vedi `abiFilters` in `app/build.gradle.kts`.
 */
const SOLO_TELEFONI = "android/arm64";
const ANCHE_EMULATORE = "android/arm64,android/amd64";

const conEmulatore = process.argv.includes("--con-emulatore");
const forzato = process.argv.includes("--rifai");

/** L'NDK dentro l'SDK, il piu' recente che si trova. */
function trovaNdk() {
  if (process.env.ANDROID_NDK_HOME && existsSync(process.env.ANDROID_NDK_HOME)) {
    return process.env.ANDROID_NDK_HOME;
  }
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(process.env.LOCALAPPDATA || process.env.HOME || "", "Android", "Sdk");
  const cartella = join(sdk, "ndk");
  if (!existsSync(cartella)) return null;
  const versioni = readdirSync(cartella).sort();
  return versioni.length ? join(cartella, versioni[versioni.length - 1]) : null;
}

/** Il sorgente piu' recente, per sapere se il .aar e' vecchio. */
function quandoIlSorgente() {
  let ultimo = 0;
  for (const f of readdirSync(modulo)) {
    if (!f.endsWith(".go") && f !== "go.mod" && f !== "go.sum") continue;
    ultimo = Math.max(ultimo, statSync(join(modulo, f)).mtimeMs);
  }
  return ultimo;
}

function corri(cmd, args, opzioni = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opzioni });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} e' finito male (${r.status})`);
  }
}

function ce(cmd) {
  return spawnSync(cmd, ["version"], { shell: true }).status === 0;
}

const ndk = trovaNdk();
if (!ndk) {
  console.error(
    "Non trovo l'NDK di Android.\n" +
      "Aprilo da Android Studio: Tools > SDK Manager > SDK Tools > NDK (Side by side).",
  );
  process.exit(1);
}
if (!ce("go")) {
  console.error("Non trovo Go. Serve la 1.24 o piu' nuova: https://go.dev/dl/");
  process.exit(1);
}

if (!forzato && existsSync(uscita) && statSync(uscita).mtimeMs > quandoIlSorgente()) {
  console.log("tailponte: gia' fatto e piu' nuovo dei sorgenti, non lo rifaccio.");
  process.exit(0);
}

const casa = process.env.HOME || process.env.USERPROFILE || "";
const binGo = join(casa, "go", "bin");
const ambiente = {
  ...process.env,
  ANDROID_NDK_HOME: ndk,
  PATH: `${process.env.PATH}${process.platform === "win32" ? ";" : ":"}${binGo}`,
};

const gomobile = join(binGo, process.platform === "win32" ? "gomobile.exe" : "gomobile");
if (!existsSync(gomobile)) {
  console.log("tailponte: installo gomobile e gobind (una volta sola)…");
  corri("go", ["install", "golang.org/x/mobile/cmd/gomobile@latest"], { env: ambiente });
  corri("go", ["install", "golang.org/x/mobile/cmd/gobind@latest"], { env: ambiente });
}

mkdirSync(dirname(uscita), { recursive: true });
const quali = conEmulatore ? ANCHE_EMULATORE : SOLO_TELEFONI;
console.log(`tailponte: compilo per ${quali} — ci vuole circa un minuto.`);
/*
 * ⚠ **`-s -w`: via i simboli di debug.**
 *
 * Senza, la libreria pesa 39,7 MB e l'APK finisce a 47: piu' di otto volte
 * quello di prima, per una funzione che non tutti accenderanno. Con, ne pesa
 * un terzo in meno — e quello che si perde sono i nomi delle funzioni dentro
 * il codice Go, cioe' esattamente la roba che serve a chi fa il debug del
 * runtime di Go e a nessun altro. Un crash resta un crash, e lo stack di
 * Kotlin non lo tocca.
 */
corri(
  gomobile,
  ["bind", "-ldflags", '"-s -w"', "-target=" + quali, "-androidapi", "26", "-o", uscita, "."],
  { cwd: modulo, env: ambiente },
);

const mb = (statSync(uscita).size / 1_048_576).toFixed(1);
console.log(`tailponte: fatto — ${mb} MB in ${uscita}`);
