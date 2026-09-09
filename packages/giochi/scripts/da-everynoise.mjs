/**
 * Da `genres-data.js` a `src/dati/generi.ts`.
 *
 * Il dataset dei generi non l'abbiamo inventato noi: e' quello raccolto per la
 * prima versione di DaProdSlot, e le fonti sono vere —
 *
 * - Every Noise at Once (everynoise.com), la mappa dei generi di Spotify;
 * - il **rank di popolarita'** dal Wayback Machine, everynoise1d del 25 aprile
 *   2023 (`vector=popularity`);
 * - le quote per decennio del Million Song Dataset / Tagtraum.
 *
 * Questo script sta qui **per poterlo rifare**. Un file di dati generato una
 * volta da una cartella che sta sul desktop di qualcuno, senza il pezzo che
 * spiega come ci e' arrivato, fra sei mesi e' un file che nessuno osa toccare.
 *
 * Come si rifa':
 *
 *     node scripts/da-everynoise.mjs "<percorso di genres-data.js>"
 *
 * Senza argomento cerca dove sta oggi, cioe' nella wiki.
 *
 * ⚠ **Il numero che conta e' `prank`, non `pop`.** Nel dataset `pop` e' gia'
 * schiacciato da una scala logaritmica: usandolo, il 79% dei generi finiva in
 * cima alla scala e la parola smetteva di voler dire qualcosa. Il rank invece
 * distribuisce la rarita' su tutta la lista — contati: 2.641 Basic, 453 Grand,
 * 380 Rare, 322 Arcane, 297 Heroic, 289 Unique, 336 Celestial, 332 Divine,
 * 365 Epic, 397 Legendary, 479 Mythic.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const PREDEFINITO =
  "C:/Users/dapca/Desktop/HermesGPT/dapwikiGPT/DaProd-Musica/DaProdSlot/genres-data.js";

const sorgente = process.argv[2] ?? PREDEFINITO;
const testo = readFileSync(sorgente, "utf8");

const inizio = testo.indexOf("const GENRES_DATA = ");
if (inizio < 0) throw new Error("In quel file non c'e' GENRES_DATA.");
const fine = testo.indexOf("\n", inizio);
const generi = JSON.parse(
  testo.slice(inizio + "const GENRES_DATA = ".length, fine).trim().replace(/;$/, ""),
);

const quanti = generi.length;
const righe = generi.map((g) => {
  // Chi non era nella lista del 2023 sta in fondo: non e' una punizione, e'
  // che non lo ascoltava nessuno abbastanza da finirci dentro.
  const rank = typeof g.prank === "number" ? g.prank : quanti;
  // Il rank di **modernita'**: quanto quel genere suona di adesso invece che
  // di allora. Serve al filtro delle epoche — vedi `pesoEra` in `regole.ts` —
  // e senza di lui «anni 70» sarebbe solo un'etichetta su un pugno di generi
  // invece che un peso su tutti.
  const moderno = typeof g.mrank === "number" ? g.mrank : "";
  const esempio = String(g.ex ?? "").replace(/^e\.g\.\s*/, "");
  return [g.g, g.fam ?? "altro", rank, g.decade ?? "", moderno, esempio]
    .map((c) => alSicuro(String(c)))
    .join("|");
});

/**
 * ⚠ **I nomi arrivano da fuori e finiscono dentro una stringa a apici
 * inversi.** Nel dataset ci sono due esempi con un apice inverso nel titolo:
 * senza questa riga chiudono la stringa a meta' file, e quello che si vede non
 * e' «due generi sbagliati» — e' il modulo intero che non compila, con un
 * errore che punta a una riga a caso duemila righe piu' in la'.
 *
 * Si toglie anche il segno del dollaro davanti a una graffa, che dentro una
 * stringa cosi' vorrebbe dire «qui va calcolato qualcosa», e la barra rovescia,
 * che si mangerebbe il carattere dopo. E la barra dritta, che e' il separatore.
 */
function alSicuro(cosa) {
  return cosa
    .replace(/\\/g, "/")
    .replace(/`/g, "'")
    .replace(/\$\{/g, "{")
    .replace(/\|/g, "/")
    .replace(/\r?\n/g, " ");
}

const fuori = join(QUI, "..", "src", "dati");
mkdirSync(fuori, { recursive: true });
writeFileSync(
  join(fuori, "generi.ts"),
  intestazione(quanti) + "const CRUDI = `\n" + righe.join("\n") + "\n`;\n" + coda(),
  "utf8",
);
console.log("scritti " + quanti + " generi in src/dati/generi.ts");

function intestazione(n) {
  return `/**
 * I ${n} generi musicali veri, e da dove vengono.
 *
 * ⚠ **Questo file e' generato**: non si corregge a mano, si rifa'. Lo scrive
 * \`scripts/da-everynoise.mjs\`, che dice anche quali sono le fonti e perche' la
 * rarita' si calcola dal rank e non dalla popolarita'.
 *
 * Una riga per genere: \`nome|famiglia|rank|decennio|esempio\`. E' una stringa e
 * non un elenco di oggetti per una ragione sola: sono ${n} voci, e scritte
 * come oggetti sarebbero un file da tre megabyte che nessun editor apre
 * volentieri e nessun controllo di versione legge.
 *
 * L'**esempio** non e' decorazione: «shoegaze» a chi non lo sa non dice niente,
 * «shoegaze, tipo My Bloody Valentine» si'.
 */

import type { Pezzo } from "../tipi";
import { chiocciola } from "../rulli";

`;
}

function coda() {
  return `
/** Quanti sono: serve a trasformare il rank in «quanto e' comune». */
const QUANTI = CRUDI.trim().split("\\n").length;

/**
 * Un genere in piu' rispetto a un pezzo qualunque: la famiglia, il decennio e
 * l'esempio. Servono ai filtri e a far capire di cosa si sta parlando.
 */
export interface Genere extends Pezzo {
  famiglia: string;
  /** \`70\`, \`80\`… vuoto se quel genere non e' di un decennio in particolare. */
  decennio: string;
  /**
   * Quanto suona di adesso, da 0 (modernissimo) a 1 (roba di allora).
   *
   * E' il rank di modernita' di Every Noise, riportato fra zero e uno. Il
   * filtro delle epoche pesa **tutti** i generi con questo, non solo quelli
   * che hanno un decennio scritto sopra — che sono pochi.
   */
  modernita: number;
  /** Un artista che lo fa. Vuoto se non ce n'era uno nel dataset. */
  esempio: string;
}

export const GENERI: Genere[] = CRUDI.trim()
  .split("\\n")
  .map((riga) => {
    const [nome = "", famiglia = "altro", rank = "0", decennio = "", moderno = "", esempio = ""] =
      riga.split("|");
    return {
      id: "genere/" + chiocciola(nome),
      rullo: "genere",
      nome,
      // Al modello si dice il genere e basta: l'esempio serve a chi legge, non
      // a chi genera — un nome d'artista dentro il prompt tira tutto da quella
      // parte, che non e' quello che si sta chiedendo.
      testo: nome,
      quantoComune: 1 - Number(rank) / QUANTI,
      famiglia,
      decennio,
      modernita: moderno ? Number(moderno) / QUANTI : 0.5,
      esempio,
    };
  });
`;
}
