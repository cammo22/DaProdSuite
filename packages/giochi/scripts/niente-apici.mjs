/**
 * La guardia degli apici inversi.
 *
 * ⚠ **Questa prova esiste perche' l'errore l'ho fatto io**, il 9 settembre
 * 2026, un'ora dopo aver scritto la regola che lo vieta. In un commento dentro
 * il foglio di stile della pagina avevo scritto una parola fra apici inversi:
 * quel primo apice ha chiuso la stringa, e TypeScript ha risposto
 * «',' expected» puntando a una riga che con il problema non c'entrava niente.
 *
 * I file sotto `src/pagina/` sono **stringhe**: una sola, aperta dopo l'uguale
 * e chiusa in fondo. Dentro non ci puo' stare un apice inverso, nemmeno in un
 * commento. Fuori — nell'intestazione del file, prima dell'uguale — ce ne
 * possono stare quanti se ne vuole, ed e' giusto cosi'.
 *
 * ⚠ **E la prima versione di questa guardia non funzionava.** Cercava la riga
 * che *finisce* con l'uguale e l'apice, ma `export const MARKUP = APICE<header>`
 * comincia a scrivere sulla stessa riga: non entrava mai dentro la stringa e
 * diceva sempre che andava tutto bene. Se n'e' accorto solo il fatto di averle
 * messo un apice apposta per vedere se lo trovava — che e' l'unico modo di
 * sapere se una prova prova qualcosa.
 *
 *     node packages/giochi/scripts/niente-apici.mjs
 *     node packages/giochi/scripts/niente-apici.mjs --provami
 *
 * Con `--provami` si sporca una copia in memoria e si controlla che la guardia
 * se ne accorga: e' la prova della prova.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const FILE = ["stile.ts", "markup.ts", "copione.ts"];
const APICE = String.fromCharCode(96);

/**
 * Gli apici inversi che stanno **dentro** la stringa, con la riga dove stanno.
 *
 * La stringa comincia al primo `= APICE` del file e finisce all'ultimo
 * `APICE;`. Tutto quello che c'e' in mezzo e' testo della pagina.
 */
function apiciDentro(testo) {
  const apre = testo.indexOf("= " + APICE);
  const chiude = testo.lastIndexOf(APICE + ";");
  if (apre < 0 || chiude < 0 || chiude <= apre) {
    return { rotto: true, trovati: [] };
  }
  const da = apre + 3;
  const trovati = [];
  for (let i = da; i < chiude; i++) {
    if (testo[i] === APICE) {
      const riga = testo.slice(0, i).split("\n").length;
      const testoRiga = testo.split("\n")[riga - 1] ?? "";
      trovati.push({ riga, testoRiga: testoRiga.trim() });
    }
  }
  return { rotto: false, trovati };
}

function guarda(nome, testo, parla) {
  const esito = apiciDentro(testo);
  if (esito.rotto) {
    if (parla) console.log("  x " + nome + ": non si capisce dove comincia o finisce la stringa.");
    return 1;
  }
  if (parla) {
    for (const t of esito.trovati) {
      console.log("  x " + nome + ", riga " + t.riga + ": apice inverso dentro la stringa");
      console.log("      " + t.testoRiga);
    }
  }
  return esito.trovati.length;
}

/* ------------------------------------------------------------ la prova vera */

let guai = 0;
const testi = new Map();
for (const nome of FILE) {
  const testo = readFileSync(join(QUI, "..", "src", "pagina", nome), "utf8");
  testi.set(nome, testo);
  guai += guarda(nome, testo, true);
}

/* --------------------------------------------------- la prova della prova */

if (process.argv.includes("--provami")) {
  const nome = FILE[1];
  const sporcato = testi.get(nome).replace("<header>", "<header> " + APICE + " ");
  const trovati = guarda(nome, sporcato, false);
  console.log("");
  if (trovati === 1) {
    console.log("  La guardia vede l'apice che le metto apposta: prova buona.");
  } else {
    console.log("  x La guardia NON vede l'apice messo apposta: e' cieca, va aggiustata.");
    guai++;
  }
}

console.log("");
if (guai > 0) {
  console.log("  " + guai + (guai === 1 ? " guaio." : " guai."));
  console.log("  Dentro le stringhe della pagina si scrive senza apici inversi:");
  console.log("  le parole si attaccano col piu'.");
  console.log("");
  process.exit(1);
}
console.log("  Nessun apice inverso dentro le stringhe della pagina.");
console.log("");
