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

Module._load = caricaOriginale;
console.log(
  falliti === 0
    ? `\n  ok   tutti e ${file.length} i moduli del main si caricano\n`
    : `\n  NO   ${falliti} moduli non si caricano\n`,
);
process.exit(falliti === 0 ? 0 : 1);
