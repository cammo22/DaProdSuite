/**
 * Un banco per guardare l'hub senza Electron: la pagina vera, lo shell finto.
 *
 *     node apps/shell/scripts/banco-hub.mjs [cartella-foto]
 *
 * Apre `out/renderer/index.html` in Chromium (quello di Playwright) con un
 * `window.daprod` finto al posto del preload, e fa le foto dell'hub largo e
 * stretto in `test/.out/hub` (o nella cartella che gli si dice).
 *
 * **Perché esiste, dalla 1.4.0.** Il remake grafico dell'hub andava guardato,
 * e l'hub senza Electron non parte: tutto quello che mostra glielo dice il
 * main. Qui le risposte sono finte ma della forma giusta — le stesse schede,
 * un'app pronta, una da installare, una in preparazione — ed e' abbastanza per
 * vedere ogni pezzo. Come `banco-console.mjs`, **non e' una prova**: non torna
 * 0 o 1, fa delle foto che si guardano con gli occhi.
 *
 * Vuole `pnpm run build` fatto (legge `out/renderer`) e Playwright installato
 * (in questo repo non c'e': si prende quello globale, o `PLAYWRIGHT`).
 */

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const radice = join(import.meta.dirname, "..", "..", "..");
const { APP_LIST } = require(join(radice, "packages", "ipc", "dist", "index.js"));

const dove = process.env.PLAYWRIGHT || "playwright";
let chromium;
try {
  ({ chromium } = await import(dove));
} catch {
  ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs"));
}

const uscita = process.argv[2] || join(radice, "test", ".out", "hub");
mkdirSync(uscita, { recursive: true });

/**
 * Lo shell finto. Ogni funzione torna quello che tornerebbe il main, nella
 * forma di `packages/ipc/src/contracts.ts`; quello che non serve a disegnare
 * torna niente.
 */
function finto(catalogo) {
  const stati = {
    connessione: { status: "pronta", missingGb: 0 },
    visualizer: { status: "pronta", missingGb: 0 },
    musica: { status: "pronta", missingGb: 0 },
    foto: { status: "in-preparazione", missingGb: 4.6, progress: { done: 2.1e9, total: 4.6e9, label: "Qwen-Image 2.1 — Q4_K_M" } },
    cinema: { status: "da-installare", missingGb: 23.2 },
    voce: { status: "pronta", missingGb: 0 },
    dream: { status: "attiva", missingGb: 0 },
    companion: { status: "non-inclusa", missingGb: 0 },
    iodigitale: { status: "da-installare", missingGb: 9.8 },
  };
  const niente = () => Promise.resolve(undefined);
  const mai = () => () => {};
  window.daprod = {
    catalog: catalogo,
    suite: { version: () => Promise.resolve("1.4.0"), revealPath: niente, avvioPronto: niente },
    risultati: { elenco: () => Promise.resolve([]), mostraNellaCartella: niente, salva: niente, elimina: niente, onCambiata: mai },
    modelli: { catalogo: () => Promise.resolve([]), scarica: niente, annulla: niente, onAvanzamento: mai },
    log: { elenco: () => Promise.resolve([]), leggi: () => Promise.resolve("") },
    apps: {
      list: () => Promise.resolve(catalogo.map((a) => ({ id: a.id, ...(stati[a.id] || { status: "pronta", missingGb: 0 }) }))),
      open: niente, close: niente, install: niente, installaTutte: niente, annullaInstallazione: niente, onChanged: mai,
    },
    runtime: {
      state: () => Promise.resolve({ ready: true, pythonVersion: "3.12.13", torchVersion: "2.13.0+cu130", cudaAvailable: true, gpuName: "NVIDIA GeForce RTX 4060", gpuTotalMb: 8188 }),
      install: niente, ripara: niente, controlla: () => Promise.resolve({ voci: [] }), onChanged: mai,
    },
    impostazioni: {
      leggi: () => Promise.resolve({ velocita: "normale", profilo: "equilibrato", guidaFatta: true }),
      velocita: niente, profilo: niente, guidaFatta: niente, connessione: niente,
    },
    gpu: { state: () => Promise.resolve({ holder: "dream", usedMb: 3100, totalMb: 8188 }), onChanged: mai },
    vram: { elenco: () => Promise.resolve([]), scarica: niente, svuota: niente },
    spazio: { stato: () => Promise.resolve({ app: [], grandi: [], sistema: [], occupato: 0, libero: 0 }), disinstalla: niente, elimina: niente, reset: niente },
    llm: { stato: () => Promise.resolve({ acceso: true, modelli: ["spark-x2.5-4b"], disponibili: [{ id: "spark-x2.5-4b", caricato: true }], caricati: [] }), carica: niente, scarica: niente },
    update: {
      state: () => Promise.resolve({ status: "aggiornato", currentVersion: "1.4.0" }),
      check: niente, download: niente, installAndRestart: niente, onChanged: mai,
    },
  };
}

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const pagina = join(radice, "apps", "shell", "out", "renderer", "index.html");
for (const [nome, w, h] of [["largo", 1280, 860], ["stretto", 820, 900]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on("pageerror", (e) => console.log("errore nella pagina:", e.message));
  await p.addInitScript(finto, APP_LIST);
  await p.goto(pathToFileURL(pagina).href);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: join(uscita, `hub-${nome}.png`) });
  await p.screenshot({ path: join(uscita, `hub-${nome}-tutto.png`), fullPage: true });
  await p.close();
}
await browser.close();
console.log("foto in", uscita);
