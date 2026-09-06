/**
 * I moduli del main si caricano davvero, senza morire?
 *
 *     node apps/shell/scripts/prova-avvio.mjs
 *
 * **Perché esiste.** La 0.7.0 stava per uscire con un guasto che nessuna delle
 * altre prove poteva vedere: un cerchio fra i moduli faceva sì che, caricando
 * `remoto.js` da dentro l'inizializzazione di `app-manager.js`, `appManager`
 * fosse ancora `undefined` — e la riga che gli si iscrive agli eventi
 * ammazzava la suite **prima** di mostrare qualunque cosa. Compilava,
 * superava i tipi, superava le prove del gateway.
 *
 * `prova-cicli.mjs` accanto guarda la forma del grafo. Questa fa la cosa più
 * semplice e più convincente: **carica tutto per davvero**, con un Electron
 * finto al posto di quello vero, e guarda se qualcuno muore. Non prova che la
 * suite funzioni — prova che si accende, che è la condizione di tutto il resto.
 *
 * Vuole `pnpm run build` già fatto.
 */

import { readdirSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import Module from "node:module";

const radice = resolve(import.meta.dirname, "..", "out", "main");
const finti = mkdtempSync(join(tmpdir(), "daprod-avvio-"));

/**
 * Un Electron finto: quel poco che i moduli toccano **mentre si caricano**.
 *
 * Non deve fare niente di vero. Deve solo esistere: quello che si sta cercando
 * è un modulo che al caricamento usa qualcosa che non c'è ancora.
 */
const nulla = () => undefined;
const eventi = () => ({ on: nulla, once: nulla, off: nulla, emit: nulla, removeListener: nulla });
const electron = {
  app: {
    ...eventi(),
    getPath: () => finti,
    getAppPath: () => finti,
    getVersion: () => "0.0.0-prova",
    getName: () => "DaProd Suite",
    whenReady: () => new Promise(() => {}),
    isPackaged: false,
    requestSingleInstanceLock: () => true,
    quit: nulla,
    setAppUserModelId: nulla,
    disableHardwareAcceleration: nulla,
  },
  BrowserWindow: Object.assign(function () {}, { getAllWindows: () => [], fromWebContents: () => null }),
  ipcMain: { handle: nulla, on: nulla, removeHandler: nulla },
  Menu: { setApplicationMenu: nulla, buildFromTemplate: () => ({}) },
  Tray: function () {},
  dialog: {},
  shell: {},
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) },
  net: { fetch: nulla },
  protocol: { handle: nulla, registerSchemesAsPrivileged: nulla },
  nativeImage: { createFromPath: () => ({ isEmpty: () => true }) },
};

// `require("electron")` deve tornare il finto, ovunque venga chiesto.
const caricaOriginale = Module._load;
Module._load = function (richiesto, genitore, isMain) {
  if (richiesto === "electron") return electron;
  return caricaOriginale.apply(this, [richiesto, genitore, isMain]);
};

function tuttiIFile(dove) {
  const dentro = [];
  for (const nome of readdirSync(dove)) {
    const p = join(dove, nome);
    if (statSync(p).isDirectory()) dentro.push(...tuttiIFile(p));
    else if (nome.endsWith(".js")) dentro.push(p);
  }
  return dentro;
}

const require = createRequire(import.meta.url);
let falliti = 0;

/**
 * Si comincia da `index.js`, e non a caso: è **l'ordine** in cui i moduli si
 * caricano a fare la differenza, e quell'ordine lo decide chi accende.
 */
const file = tuttiIFile(radice);
const primi = [join(radice, "index.js")].filter((f) => file.includes(f));
for (const percorso of [...primi, ...file.filter((f) => !primi.includes(f))]) {
  const nome = relative(radice, percorso);
  try {
    require(percorso);
    console.log(`  ok   ${nome}`);
  } catch (errore) {
    falliti += 1;
    console.log(`  NO   ${nome} → ${errore?.message ?? errore}`);
  }
}

/**
 * ⚠ **E già che i moduli sono caricati, una cosa la si prova davvero.**
 *
 * Questo file nasce per rispondere a «si accende?», e per sei versioni è
 * rimasto solo quello. Ma con l'Electron finto in piedi i moduli del main sono
 * **caricati e usabili**, e buttare via quel banco appena finito di guardare se
 * si accendono è uno spreco.
 *
 * La prima cosa che ci gira sopra è quella che si è appena rotta per sei
 * versioni: **come si legge quello che c'è scritto accanto a un file**.
 *
 * Il `.json` di un brano tiene due dizionari mescolati — i campi con cui la
 * scheda ha generato (`lyrics`, `caption`, `duration`) e quelli con cui la
 * richiesta era arrivata (`testo`, `secondi`, `prompt`) — e hanno nomi diversi
 * per la stessa cosa. Il pannello «Com'è stata fatta» leggeva i secondi:
 * mostrava il **titolo** dove doveva esserci il testo cantato, e lo stile non
 * lo mostrava mai. Nessun controllo di tipi poteva vederlo: sono stringhe che
 * escono da un oggetto libero.
 *
 * I dati qui sotto sono **presi da un file vero** — «Che sbandata», 6 settembre
 * 2026 — perché una prova scritta a memoria proverebbe quello che mi ricordo,
 * non quello che c'è sul disco.
 */
console.log("\n— quello che c'è scritto accanto a un file —");
{
  const { libreria } = require(join(radice, "libreria.js"));
  const finto = {
    percorso: join(finti, "Che sbandata.mp3"),
    meta: {
      titolo: "Che sbandata",
      caption: "Anthemic, Epic, Metalcore, Dark Electro, emotional, melodic, napolitan, trap",
      lyrics: "[Intro]\nE fu come un colpo di fulmine,\nio ti dissi: «Sentimi, che fai stasera?»",
      duration: 120,
      qualita: "ace-turbo",
      bpm: 120,
      tonalita: "caso",
      lingua: "it",
      // I due che venivano dalla richiesta, e che confondevano la tabella.
      testo: "Che sbandata",
      secondi: "120",
      prompt: "Anthemic, Epic, Metalcore, Dark Electro, emotional, melodic, napolitan, trap",
      // Roba da chi rigenera: non deve comparire.
      seed_audio: 485263270,
      steps: 30,
    },
  };
  const fuori = libreria.comeEStataFatta(finto) ?? {};

  const dice = (nome, ok, extra = "") => {
    if (ok) console.log(`  ok   ${nome}`);
    else { falliti += 1; console.log(`  NO   ${nome} ${extra}`); }
  };

  dice(
    "«Il testo» è il testo cantato, non il titolo",
    (fuori["Il testo"] ?? "").startsWith("[Intro]"),
    `→ ${JSON.stringify(fuori["Il testo"] ?? null)}`,
  );
  dice("«Il titolo» è il titolo", fuori["Il titolo"] === "Che sbandata", `→ ${fuori["Il titolo"]}`);
  dice("«Quanto dura» sono i secondi", fuori["Quanto dura"] === "120", `→ ${fuori["Quanto dura"]}`);
  dice("«I battiti» sono i battiti", fuori["I battiti"] === "120", `→ ${fuori["I battiti"]}`);
  dice(
    "«La tonalità» non dice «caso»",
    fuori["La tonalità"] === "scelta dal modello",
    `→ ${fuori["La tonalità"]}`,
  );
  dice("il seed resta fuori", fuori["seed_audio"] === undefined && !("Il seed" in fuori));
  dice("i passi restano fuori", !Object.values(fuori).includes("30"));

  // Un'immagine: campi diversi, stessa tabella.
  const foto = libreria.comeEStataFatta({
    percorso: join(finti, "un faro.png"),
    meta: { titolo: "un faro", prompt: "un faro al tramonto", estetica: "Ora dorata", formato: "960x720", modello: "flux2-4b" },
  }) ?? {};
  dice("di un'immagine si legge lo stile", foto["Lo stile"] === "Ora dorata", `→ ${foto["Lo stile"]}`);
  dice("e la misura", foto["Che misura"] === "960x720", `→ ${foto["Che misura"]}`);
  dice("e non si inventa una durata", foto["Quanto dura"] === undefined);
}

Module._load = caricaOriginale;
console.log(
  falliti === 0
    ? `\n  ok   tutti e ${file.length} i moduli del main si caricano, e i campi si leggono\n`
    : `\n  NO   ${falliti} prove non passate\n`,
);
process.exit(falliti === 0 ? 0 : 1);
