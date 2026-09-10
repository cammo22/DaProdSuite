/**
 * La prova che l'installer contiene tutto quello che serve ad accendersi.
 *
 * ⚠ **Questa prova esiste per un guaio vero, della 1.2.5.** `@daprod/giochi`
 * non era nell'elenco di `electron-builder.yml`, e nell'installer non c'era. Il
 * risultato non e' stato «la sala giochi non si apre»: e' stato **il gateway
 * che non si carica**, perche' un `require` che fallisce porta giu' tutto il
 * modulo che lo fa. Da fuori si vedeva DaProdConnessione che diceva «aperto» e
 * non si apriva, e non c'era nessun modo di risalire da li' alla riga mancante.
 *
 * Novanta prove verdi non se ne sono accorte, e non potevano: girano sul
 * sorgente, dove `node_modules` c'e' tutto. L'unico posto dove quel guaio si
 * vede e' **dentro il pacchetto finito**.
 *
 * ## Cosa controlla
 *
 * Parte da `apps/shell/package.json`, segue le dipendenze `@daprod/*` **di
 * quelle che trova** — cioe' la stessa strada che fa `require` a runtime — e
 * per ognuna guarda dentro l'asar se c'e' il file che il suo `package.json`
 * dichiara come porta d'ingresso. Non guarda le righe del `.yml`: guarda il
 * risultato. Le righe si possono scrivere giuste e il file mancare lo stesso.
 *
 *     node apps/shell/scripts/prova-installer.mjs
 *     node apps/shell/scripts/prova-installer.mjs --provami
 *
 * Con `--provami` finge che un pacchetto non ci sia e controlla che la prova se
 * ne accorga: e' l'unico modo di sapere se una prova prova qualcosa.
 *
 * ⚠ **Va fatta girare dopo `pnpm --filter @daprod/shell dist`**, e sta nel
 * lavoro che pubblica: senza un pacchetto costruito non c'e' niente da
 * guardare, e in quel caso lo dice e si ferma con un errore — una prova che si
 * salta da sola non e' una guardia.
 */

import { existsSync, openSync, readSync, closeSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = join(QUI, "..", "..", "..");
const ASAR = join(RADICE, "installer", "win-unpacked", "resources", "app.asar");

/**
 * L'indice di un asar: i primi byte dicono quanto e' lungo, poi c'e' il JSON.
 *
 * Il formato e' quello di `pickle`: quattro numeri da quattro byte e poi la
 * stringa. Si legge a mano invece di tirarsi dietro una libreria — sono otto
 * righe, e questa prova deve poter girare anche su una macchina che ha appena
 * scaricato il repo.
 */
function indiceAsar(file) {
  const f = openSync(file, "r");
  try {
    const testa = Buffer.alloc(16);
    readSync(f, testa, 0, 16, 0);
    const quanto = testa.readUInt32LE(12);
    const corpo = Buffer.alloc(quanto);
    readSync(f, corpo, 0, quanto, 16);
    return JSON.parse(corpo.toString("utf8"));
  } finally {
    closeSync(f);
  }
}

/** Vero se dentro l'asar esiste quel percorso. */
function dentro(indice, percorso) {
  let dove = indice;
  for (const pezzo of percorso.split("/")) {
    if (!dove || !dove.files || !dove.files[pezzo]) return false;
    dove = dove.files[pezzo];
  }
  return true;
}

/**
 * Tutti i pacchetti `@daprod/*` che servono ad accendersi, e come si chiama la
 * loro porta d'ingresso.
 *
 * Si segue la stessa strada di `require`: le dipendenze dello shell, poi quelle
 * delle sue dipendenze, e cosi' via. E' proprio il passaggio che era saltato —
 * `@daprod/giochi` non lo chiedeva lo shell, lo chiedeva il gateway.
 */
function quelliCheServono() {
  const trovati = new Map();
  const daVedere = ["@daprod/shell"];
  const cartellaDi = (nome) =>
    nome === "@daprod/shell"
      ? join(RADICE, "apps", "shell")
      : join(RADICE, "packages", nome.slice("@daprod/".length));

  while (daVedere.length) {
    const nome = daVedere.shift();
    const suo = join(cartellaDi(nome), "package.json");
    if (!existsSync(suo)) continue;
    const j = JSON.parse(readFileSync(suo, "utf8"));
    if (nome !== "@daprod/shell") {
      // «main» senza il «./» davanti: dentro l'asar i percorsi sono spogli.
      trovati.set(nome, String(j.main ?? "index.js").replace(/^\.\//, ""));
    }
    for (const dip of Object.keys(j.dependencies ?? {})) {
      if (dip.startsWith("@daprod/") && !trovati.has(dip) && !daVedere.includes(dip)) {
        daVedere.push(dip);
      }
    }
  }
  return trovati;
}

const fingiCheManchi = process.argv.includes("--provami");

console.log("");
if (!existsSync(ASAR)) {
  console.log("  Non c'e' nessun pacchetto da controllare.");
  console.log("  Prima si costruisce:  pnpm --filter @daprod/shell dist");
  process.exit(1);
}

const indice = indiceAsar(ASAR);
const servono = quelliCheServono();
const guai = [];

for (const [nome, porta] of servono) {
  const corto = nome.slice("@daprod/".length);
  const dove = "node_modules/@daprod/" + corto + "/" + porta;
  const cE = fingiCheManchi && corto === "giochi" ? false : dentro(indice, dove);
  console.log("  " + (cE ? "ok  " : " x  ") + nome + "  (" + porta + ")");
  if (!cE) guai.push(nome);
}

console.log("");
if (guai.length) {
  console.log("  " + guai.length + (guai.length === 1 ? " pacchetto manca" : " pacchetti mancano") +
    " nell'installer: " + guai.join(", "));
  console.log("  Si aggiungono in apps/shell/electron-builder.yml, sotto «files», tre righe");
  console.log("  per ognuno — vedi quelle che ci sono gia'.");
  console.log("");
  console.log("  Se resta cosi', la suite installata si accende monca: un require che");
  console.log("  fallisce porta giu' tutto il modulo che lo fa, non solo il pezzo che manca.");
  process.exit(fingiCheManchi ? 0 : 1);
}

if (fingiCheManchi) {
  console.log("  La guardia non si e' accorta del pacchetto tolto: non prova niente.");
  process.exit(1);
}
console.log("  Nell'installer c'e' tutto quello che serve ad accendersi.");
