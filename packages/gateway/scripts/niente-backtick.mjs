/**
 * I backtick dentro i copioni della console, tolti come si deve.
 *
 * `node packages/gateway/scripts/niente-backtick.mjs [--scrivi]`
 *
 * ## Perché esiste
 *
 * I file di `src/console/` **sono** template literal: il loro contenuto è una
 * stringa lunga migliaia di righe. Un backtick lì dentro — anche in un commento,
 * anche scritto per fare `codice` in un JSDoc — **chiude il template a metà**, e
 * `tsc` si lamenta settanta righe più in basso dove il file non c'entra niente.
 *
 * È l'errore che ho rifatto **sette volte in due giorni**. E le prime volte l'ho
 * anche "corretto" a mano con una sostituzione grezza che mangiava il backtick
 * di **apertura** del template — cioè rompeva il file in un modo nuovo mentre
 * ne riparava un altro. Quattro file da rimettere a posto, due volte.
 *
 * Quindi: lo strumento invece della mano. Sa dov'è il corpo del template e non
 * tocca niente fuori — nei JSDoc **sopra** l'export, i backtick sono legittimi e
 * restano.
 *
 * ## Come trova il corpo
 *
 * Il corpo comincia al primo backtick che segue un `export const NOME =` (con
 * quello che c'è in mezzo: `A + \n  \`` va benissimo) e finisce all'ultimo
 * backtick del file. Dentro, ogni coppia diventa « » e i dispari diventano un
 * apostrofo.
 *
 * Senza `--scrivi` dice solo cosa cambierebbe: è la forma con cui lo chiama
 * `pnpm run prova`, che deve fallire e non correggere di nascosto.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BT = String.fromCharCode(96);
const CARTELLA = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "console");
const scrivi = process.argv.includes("--scrivi");

/**
 * Dove comincia e dove finisce il corpo del template, o null se il file non ne
 * ha uno (`copione.ts` e `index.ts` sono moduli normali).
 */
function corpo(testo) {
  const export_ = /export const [A-Z_0-9]+\s*(?:: [^=]+)?=/.exec(testo);
  if (!export_) return null;
  const apre = testo.indexOf(BT, export_.index);
  const chiude = testo.lastIndexOf(BT);
  if (apre < 0 || chiude <= apre) return null;
  return { apre, chiude };
}

let sporchi = 0;
for (const nome of readdirSync(CARTELLA).filter((f) => f.endsWith(".ts"))) {
  const percorso = join(CARTELLA, nome);
  const testo = readFileSync(percorso, "utf8");
  const dove = corpo(testo);
  if (!dove) continue;

  /**
   * ⚠ **I backtick scappati sono legittimi**, e vanno lasciati stare.
   *
   * Dentro un template literal `\`` è un backtick che **non** lo chiude: è il
   * modo giusto di scrivere `codice` in un JSDoc là dentro, ed è già usato in
   * tre file. Contarli come errori vorrebbe dire uno strumento che accusa il
   * codice giusto — e uno strumento così lo si spegne alla seconda volta.
   *
   * Si tolgono di mezzo prima di guardare, sostituendoli con qualcosa della
   * stessa lunghezza: così i numeri di riga restano quelli veri.
   */
  const dentro = testo.slice(dove.apre + 1, dove.chiude);
  /**
   * ⚠ **Quattro barre, non due**, e la differenza è che con due questo
   * controllo diceva sempre «ok».
   *
   * Dentro un template `\\` è **una** barra, quindi `` `\\${BT}` `` produce la
   * stringa «barra-backtick»… che come *regex* vuol dire «un backtick
   * scappato», e in una regex scappare un backtick non serve a niente: il
   * pattern finiva per essere un backtick qualunque. Risultato: qui si
   * toglievano **tutti** i backtick invece dei soli scappati, `nudo` restava
   * sempre pulito, e lo strumento non trovava mai niente.
   *
   * Il modo peggiore di sbagliare: un controllo che dice sempre di sì è peggio
   * di nessun controllo, perché ci si smette di guardare.
   */
  const nudo = dentro.replace(new RegExp(`\\\\${BT}`, "g"), "  ");
  if (!nudo.includes(BT)) continue;

  // Dove sta il primo, per dirlo con il numero di riga.
  const riga = testo.slice(0, dove.apre + 1 + dentro.indexOf(BT)).split("\n").length;
  const quanti = nudo.split(BT).length - 1;
  console.log(`  ${nome}:${riga} — ${quanti} backtick dentro al template`);
  sporchi++;

  if (!scrivi) continue;

  // Le coppie diventano virgolette basse, che è la convenzione della cartella;
  // un backtick spaiato diventa un apostrofo.
  const pulito = dentro
    .replace(new RegExp(`${BT}([^${BT}\n]*)${BT}`, "g"), "«$1»")
    .split(BT)
    .join("'");
  writeFileSync(
    percorso,
    testo.slice(0, dove.apre + 1) + pulito + testo.slice(dove.chiude),
    "utf8",
  );
}

/**
 * ⚠ **E gli «apri commento» dentro le stringhe.** Aggiunto nella 1.0.2.
 *
 * `scegliFile.accept = "image/*"` compila benissimo: per JavaScript quella e'
 * una stringa e i due caratteri in mezzo non vogliono dire niente. Ma
 * **qualunque cosa legga il copione senza eseguirlo** — le prove della console,
 * per esempio, che tolgono commenti e stringhe per cercare le variabili nate
 * per sbaglio — li legge come l'inizio di un commento, e da li' in poi legge
 * tutto sfasato.
 *
 * Quanto e' costato scoprirlo: la prova ha accusato tre variabili a
 * quarantamila caratteri di distanza, dentro uno shader GLSL che non c'entrava
 * niente. Un'ora, per due caratteri.
 *
 * Si scrive spezzato — `"image/" + "*"` — e non serve altro. Vale la pena avere
 * una guardia perche' e' un errore che **non si vede**: il file compila, l'app
 * funziona, e a rompersi e' solo chi il codice lo legge.
 */
const APRI_COMMENTO = new RegExp('"[^"\n]*/\\*[^"\n]*"', "g");
let trappole = 0;
for (const nome of readdirSync(CARTELLA).filter((f) => f.endsWith(".ts"))) {
  const percorso = join(CARTELLA, nome);
  const testo = readFileSync(percorso, "utf8");
  for (const m of testo.matchAll(APRI_COMMENTO)) {
    const riga = testo.slice(0, m.index).split("\n").length;
    console.log(`  ${nome}:${riga} — ${m[0]} apre un commento dentro una stringa`);
    trappole++;
  }
}
if (trappole) {
  console.log(
    `\n  ${trappole} da spezzare in due, cosi': "image/" + "*".` +
      "\n  Compila lo stesso, ma chi legge il copione da fuori si perde.\n",
  );
  process.exit(1);
}

if (sporchi === 0) {
  console.log("  ok   nessun backtick dentro ai template della console");
  process.exit(0);
}
if (scrivi) {
  console.log(`\n  ${sporchi} file ripuliti.`);
  process.exit(0);
}
console.log(
  `\n  ${sporchi} file da ripulire. Rilancia con --scrivi, oppure sostituiscili a mano` +
    "\n  con « » — ma non toccare il backtick di apertura del template.\n",
);
process.exit(1);
