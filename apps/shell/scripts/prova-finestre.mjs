/**
 * Le finestre rimaste su uno schermo che non c'e' piu'.
 *
 *     node apps/shell/scripts/prova-finestre.mjs
 *
 * **Perche' una prova sua.** Il 9 settembre 2026 DaProdConnessione e' diventata
 * irraggiungibile: la posizione salvata stava su un monitor che nel frattempo
 * era stato staccato, la suite diceva «aperta», Windows la mostrava nella barra
 * e non c'era nessun pixel dove disegnarla. E' un difetto che non si riproduce
 * a mano senza staccare un monitor, quindi si riproduce qui: gli schermi sono
 * finti, e sono l'unica cosa finta.
 *
 * ⚠ **Come si fa girare un pezzo di Electron senza Electron.** Come in
 * `prova-travaso.mjs`: `require("electron")` viene intercettato. Qui pero'
 * serve anche `screen`, ed e' il pezzo interessante — gli schermi si cambiano
 * fra una prova e l'altra, che e' come si stacca un monitor senza staccarlo.
 *
 * Vuole `apps/shell/out` compilato — `pnpm run build`.
 */

import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const Module = require("node:module");

const radice = mkdtempSync(join(tmpdir(), "daprod-finestre-"));
const DATI = join(radice, "Local", "DaProdSuite");
mkdirSync(DATI, { recursive: true });

/**
 * Gli schermi accesi adesso. Si cambiano durante la prova.
 *
 * Di partenza: due monitor affiancati, come li aveva Cammo — il principale a
 * 1920x1080 e un secondo alla sua destra.
 */
let schermi = [
  { workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  { workArea: { x: 1920, y: 0, width: 1920, height: 1040 } },
];
/** Dov'e' il puntatore. Serve a sapere quale schermo si sta guardando. */
let puntatore = { x: 400, y: 300 };

const caricaVero = Module._load;
Module._load = function (chiesto, ...resto) {
  if (chiesto === "electron") {
    return {
      app: {
        getPath: () => join(radice, "Roaming"),
        getAppPath: () => join(radice, "programma"),
        isPackaged: false,
      },
      screen: {
        getAllDisplays: () => schermi,
        getCursorScreenPoint: () => puntatore,
        getDisplayNearestPoint: (p) =>
          schermi.find(
            (s) =>
              p.x >= s.workArea.x &&
              p.x < s.workArea.x + s.workArea.width &&
              p.y >= s.workArea.y &&
              p.y < s.workArea.y + s.workArea.height,
          ) ?? schermi[0],
      },
      BrowserWindow: { getAllWindows: () => finestreFinte },
    };
  }
  return caricaVero.call(this, chiesto, ...resto);
};

/**
 * Una finestra finta che si comporta come quella vera per quello che conta:
 * si sposta, si ingrandisce, si minimizza, e si ricorda cosa le e' stato fatto.
 */
function finestraFinta(dove) {
  return {
    _bounds: { ...dove },
    _ingrandita: false,
    _minimizzata: false,
    _visibile: true,
    _fuoco: 0,
    isDestroyed: () => false,
    isFullScreen: () => false,
    isMaximized() { return this._ingrandita; },
    isMinimized() { return this._minimizzata; },
    isVisible() { return this._visibile; },
    getBounds() { return { ...this._bounds }; },
    setBounds(b) {
      // Come Windows: da ingrandita non si sposta. E' la ragione per cui
      // «mettiAlCentro» rimpicciolisce prima di spostare.
      if (this._ingrandita) return;
      this._bounds = { ...this._bounds, ...b };
    },
    maximize() { this._ingrandita = true; },
    unmaximize() { this._ingrandita = false; },
    restore() { this._minimizzata = false; },
    show() { this._visibile = true; },
    focus() { this._fuoco++; },
  };
}

let finestreFinte = [];

const OUT = join(import.meta.dirname, "..", "out", "main");
if (!existsSync(join(OUT, "finestre.js"))) {
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

const finestre = require(join(OUT, "finestre.js"));
const stato = require(join(OUT, "app-state.js"));

console.log("\n— una finestra si vede, o non si vede —");
{
  dice(
    "sul principale si vede",
    finestre.siVedeDaQualcheParte({ x: 100, y: 100, width: 800, height: 600 }),
  );
  dice(
    "sul secondo schermo si vede",
    finestre.siVedeDaQualcheParte({ x: 2200, y: 100, width: 800, height: 600 }),
  );
  dice(
    "a cavallo fra i due si vede",
    finestre.siVedeDaQualcheParte({ x: 1700, y: 100, width: 800, height: 600 }),
  );
  dice(
    "venti pixel che spuntano non bastano",
    !finestre.siVedeDaQualcheParte({ x: -780, y: 100, width: 800, height: 600 }),
    "→ una finestra che si vede per venti pixel non si prende col mouse",
  );

  // Ecco il monitor staccato: resta solo il principale.
  schermi = [{ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }];
  dice(
    "staccato il secondo monitor, quello che stava li' non si vede piu'",
    !finestre.siVedeDaQualcheParte({ x: 2200, y: 100, width: 800, height: 600 }),
  );
  dice("e quello sul principale si vede ancora", finestre.siVedeDaQualcheParte({ x: 100, y: 100, width: 800, height: 600 }));
}

console.log("\n— al riavvio, la posizione persa si butta e il resto resta —");
{
  const cartella = join(DATI, "state", "connessione");
  mkdirSync(cartella, { recursive: true });

  // Com'era messa DaProdConnessione: sul secondo schermo, che adesso e' spento.
  writeFileSync(
    join(cartella, "window.json"),
    JSON.stringify({ x: 2200, y: 140, width: 1100, height: 860, maximized: false }),
    "utf8",
  );
  const persa = stato.readBounds("connessione", { width: 1100, height: 860, maximized: false });
  dice("x e y spariscono", persa.x === undefined && persa.y === undefined, `→ ${JSON.stringify(persa)}`);
  dice("la dimensione che si era scelto resta", persa.width === 1100 && persa.height === 860);

  // E una che stava dov'e' ancora raggiungibile non si tocca.
  writeFileSync(
    join(cartella, "window.json"),
    JSON.stringify({ x: 300, y: 120, width: 1000, height: 800, maximized: false }),
    "utf8",
  );
  const buona = stato.readBounds("connessione", { width: 1100, height: 860, maximized: false });
  dice("quella che si vede resta dov'era", buona.x === 300 && buona.y === 120, `→ ${JSON.stringify(buona)}`);
}

console.log("\n— a suite accesa: la finestra torna sotto gli occhi —");
{
  // Quella di Cammo: aperta, viva, e su un monitor che non c'e' piu'.
  const persa = finestraFinta({ x: 2200, y: 140, width: 1100, height: 860 });
  const spostata = finestre.riportaSottoGliOcchi(persa);
  dice("la sposta", spostata);
  dice(
    "e adesso si vede",
    finestre.siVedeDaQualcheParte(persa.getBounds()),
    `→ ${JSON.stringify(persa.getBounds())}`,
  );
  dice(
    "in mezzo allo schermo che si sta guardando",
    persa.getBounds().x === Math.round((1920 - 1100) / 2),
    `→ x ${persa.getBounds().x}`,
  );

  // Una che sta bene non si tocca: chi ha messo la finestra dove voleva non
  // se la ritrova spostata.
  const suaCasa = finestraFinta({ x: 40, y: 60, width: 900, height: 700 });
  dice("quella che si vede non si sposta", !finestre.riportaSottoGliOcchi(suaCasa));
  dice("ed e' rimasta dov'era", suaCasa.getBounds().x === 40 && suaCasa.getBounds().y === 60);
}

console.log("\n— «mostraDavvero»: quello che fanno tutte e nove le schede —");
{
  const persa = finestraFinta({ x: 2200, y: 140, width: 1100, height: 860 });
  persa._minimizzata = true;
  persa._visibile = false;
  finestre.mostraDavvero(persa);
  dice("la tira su da minimizzata", !persa.isMinimized());
  dice("la mostra", persa.isVisible());
  dice("le da' il fuoco", persa._fuoco === 1);
  dice("e prima l'ha riportata dove si vede", finestre.siVedeDaQualcheParte(persa.getBounds()));
}

console.log("\n— una finestra ingrandita su uno schermo staccato —");
{
  /**
   * Il caso che si sbaglia sempre: da ingrandita Windows non la sposta, e
   * «setBounds» non fa niente. Va rimpicciolita, spostata e ingrandita di
   * nuovo — e allora si ingrandisce sullo schermo dov'e' finita.
   */
  const persa = finestraFinta({ x: 2200, y: 0, width: 1900, height: 1040 });
  persa._ingrandita = true;
  finestre.riportaSottoGliOcchi(persa);
  dice("torna ingrandita com'era", persa.isMaximized());
  dice(
    "ma sullo schermo che c'e'",
    finestre.siVedeDaQualcheParte(persa.getBounds()),
    `→ ${JSON.stringify(persa.getBounds())}`,
  );
}

console.log("\n— «rimettile al centro», dal menu vicino all'orologio —");
{
  const a = finestraFinta({ x: 2200, y: 140, width: 800, height: 600 });
  const b = finestraFinta({ x: 10, y: 10, width: 700, height: 500 });
  finestreFinte = [a, b];
  const quante = finestre.riportaTutteACasa();
  dice("le sposta tutte, anche quella che si vedeva", quante === 2, `→ ${quante}`);
  dice("la persa adesso si vede", finestre.siVedeDaQualcheParte(a.getBounds()));
  dice("e anche quella che stava in un angolo e' al centro", b.getBounds().x === Math.round((1920 - 700) / 2), `→ x ${b.getBounds().x}`);
}

console.log(falliti ? `\n  ${falliti} da guardare.\n` : "\n  Tutto a posto.\n");
process.exit(falliti ? 1 : 0);
