/**
 * Il travaso dei vecchi preset dentro agli stili.
 *
 *     node apps/shell/scripts/prova-travaso.mjs
 *
 * **Perche' una prova sua.** Il travaso gira **una volta sola**, all'avvio,
 * sul computer di chi aggiorna dalla 1.2.2: se sbaglia, i prompt che uno aveva
 * salvato spariscono e non c'e' un secondo giro in cui accorgersene. E' il
 * genere di codice che si prova prima, non dopo.
 *
 * ⚠ **Come si fa girare un pezzo di Electron senza Electron.** `paths.ts` chiede
 * ad Electron dove stanno i dati appena viene importato, quindi il modulo non
 * si carica da Node cosi' com'e'. Qui `require("electron")` viene intercettato
 * e risponde una cartella temporanea: e' finto solo il posto, il codice e'
 * quello vero compilato in `out/main`.
 *
 * Vuole `apps/shell/out` compilato — `pnpm run build`. Se manca, lo dice invece
 * di fallire con un errore di percorso.
 */

import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const Module = require("node:module");

const radice = mkdtempSync(join(tmpdir(), "daprod-travaso-"));
/** Dove `paths.ts` andra' a finire: `<radice>/Local/DaProdSuite`. */
const DATI = join(radice, "Local", "DaProdSuite");
mkdirSync(DATI, { recursive: true });

// Electron finto: serve solo `app.getPath`, ed e' l'unica cosa che paths.ts usa.
const caricaVero = Module._load;
Module._load = function (chiesto, ...resto) {
  if (chiesto === "electron") {
    return {
      app: {
        getPath: () => join(radice, "Roaming"),
        // Serve a due righe di paths.ts che qui non c'entrano (dove sta il
        // programma, non dove stanno i dati): basta che risponda qualcosa.
        getAppPath: () => join(radice, "programma"),
        isPackaged: false,
      },
    };
  }
  return caricaVero.call(this, chiesto, ...resto);
};

const OUT = join(import.meta.dirname, "..", "out", "main");
if (!existsSync(join(OUT, "travaso-preset.js"))) {
  console.log("\n  Manca apps/shell/out: lancia prima «pnpm run build».\n");
  process.exit(1);
}

let falliti = 0;
function dice(nome, condizione, extra = "") {
  if (condizione) console.log(`  ok   ${nome}`);
  else {
    falliti++;
    console.log(`  NO   ${nome} ${extra}`);
  }
}

console.log("\n— i vecchi preset diventano prompt —");

/**
 * Un `preset.json` come quello che si trova aggiornando dalla 1.2.2.
 *
 * Tre casi, e sono i tre che esistono davvero: uno di una persona, uno **senza
 * padrone** (quelli che «c'erano gia'», nati prima che si tenesse conto di chi
 * salvava), e uno di una scheda che non ha un tipo suo.
 */
writeFileSync(
  join(DATI, "preset.json"),
  JSON.stringify({
    versione: 1,
    preset: [
      { id: "p1", app: "foto", nome: "Il robot", testo: "un robot con la chitarra", campi: { quante: "2" }, chi: "tel_uno", quando: 111 },
      { id: "p2", app: "musica", nome: "Il mio solito", testo: "nu disco", chi: "", quando: 222 },
      { id: "p3", app: "voce", nome: "La voce", testo: "leggi questo piano", quando: 333 },
    ],
  }),
  "utf8",
);

const travaso = require(join(OUT, "travaso-preset.js"));
const stili = require(join(OUT, "stili.js"));

const quanti = travaso.travasaIPresetNegliStili();
dice("li sposta tutti e tre", quanti === 3, `→ ${quanti}`);

{
  const suoi = stili.stiliDi("tel_uno", undefined, "prompt");
  const robot = suoi.find((s) => s.nome === "Il robot");
  dice("quello del telefono resta suo", Boolean(robot), `→ ${suoi.map((s) => s.nome).join(", ")}`);
  dice("ed e' un prompt, non uno stile", robot?.genere === "prompt", `→ ${robot?.genere}`);
  dice("la scheda foto diventa immagini", robot?.tipo === "immagine", `→ ${robot?.tipo}`);
  dice("si porta dietro i campi del modulo", robot?.campi?.quante === "2", `→ ${JSON.stringify(robot?.campi)}`);
  dice("e tiene la sua data, non quella di oggi", robot?.quando === 111, `→ ${robot?.quando}`);
}

{
  // Senza padrone vuol dire «di tutti»: va a chi ospita la macchina.
  const dicasa = stili.stiliDi("questo-computer", undefined, "prompt");
  dice("quello senza padrone va al computer", dicasa.some((s) => s.nome === "Il mio solito"), `→ ${dicasa.map((s) => s.nome).join(", ")}`);
  dice("una scheda senza tipo suo finisce in musica", dicasa.find((s) => s.nome === "La voce")?.tipo === "musica");
}

{
  // Il file vecchio si mette da parte, non si cancella: e' roba di chi la usa.
  dice("il magazzino vecchio sparisce", !existsSync(join(DATI, "preset.json")));
  dice("ma il file resta da parte", existsSync(join(DATI, "preset.json.travasato")));
  const dentro = JSON.parse(readFileSync(join(DATI, "preset.json.travasato"), "utf8"));
  dice("con dentro quello che c'era", dentro.preset.length === 3);
}

{
  // Al secondo avvio non c'e' piu' niente da fare, e nessuno si ritrova i
  // prompt in doppio.
  const ancora = travaso.travasaIPresetNegliStili();
  dice("al riavvio dopo non fa niente", ancora === 0, `→ ${ancora}`);
  const suoi = stili.stiliDi("tel_uno", undefined, "prompt");
  dice("e i prompt non sono in doppio", suoi.filter((s) => s.nome === "Il robot").length === 1);
}

console.log(falliti ? `\n  ${falliti} da guardare.\n` : "\n  Tutto a posto.\n");
process.exit(falliti ? 1 : 0);
