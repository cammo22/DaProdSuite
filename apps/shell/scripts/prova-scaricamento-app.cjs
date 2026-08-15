/**
 * Prova "Installa" premuto su una scheda, senza aprire Electron.
 *
 *   pnpm run build
 *   node apps/shell/scripts/prova-scaricamento-app.cjs
 *
 * Il modulo `electron` viene sostituito con un finto (stessa idea di
 * `packages/runtime/scripts/prova-installazione.cjs`), e la cosa importante è
 * che il finto decide anche **dove sono i dati**: `paths.ts` costruisce tutto da
 * `app.getPath("appData")`, quindi basta farlo mentire perché l'intera suite
 * scriva in una cartella di prova invece che nella tua.
 *
 * Dentro quella cartella entrano come giunzioni l'ambiente Python, i motori e i
 * modelli grossi che hai già: così non si riscaricano 8 GB per provare. Le sole
 * cartelle davvero vuote sono `vae` e quella del traduttore, e quindi l'unica
 * cosa che deve arrivare dalla rete sono i 216 MB del VAE di MiniMax e i 332 del
 * traduttore.
 *
 * Serve un ambiente della suite già installato e i modelli di DaProdMusica al
 * loro posto: è una prova da fare sulla macchina di sviluppo, non su una pulita.
 */

const Module = require("node:module");
const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync, rmdirSync, rmSync, statSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const RADICE = join(tmpdir(), "daprod-prova-scaricamento");
const VERA = join(process.env.LOCALAPPDATA, "DaProdSuite");
const OUT = resolve(__dirname, "..", "out", "main");

/** Il VAE di MiniMax: il più piccolo dei modelli di Musica. */
const VAE = "minimax_music3_dav.safetensors";
const BYTE_VAE = 216696128;

/**
 * Quanto deve dire la scheda che le manca, preso dal catalogo e non scritto a
 * mano: sono i due modelli che nella radice di prova non arrivano da una
 * giunzione. Contarli qui vuol dire che aggiungere un modello comune alla suite
 * non fa fallire questa prova per un numero rimasto indietro.
 */
const CATALOGO = require("../../../manifest/models.json").models;
const GB_ATTESI = Number(
  ((CATALOGO["minimax-music3-vae"].bytes + CATALOGO["traduttore-it-en"].bytes) / 1024 ** 3).toFixed(
    1,
  ),
);

/* --- radice finta ---------------------------------------------------------- */

// paths.ts fa join(appData, "..", "Local", "DaProdSuite").
const appData = join(RADICE, "Roaming");
const locale = join(RADICE, "Local", "DaProdSuite");

const GIUNZIONI = [
  ["runtime", join(VERA, "runtime")],
  ["engines", join(VERA, "engines")],
  ["tools", join(VERA, "tools")],
  ["models/diffusion_models", join(VERA, "models", "diffusion_models")],
  ["models/text_encoders", join(VERA, "models", "text_encoders")],
  // Niente giunzione per models/vae: è la cartella che deve riempirsi da sola.
];

function preparaRadice() {
  pulisci();
  mkdirSync(appData, { recursive: true });
  mkdirSync(join(locale, "models"), { recursive: true });
  for (const [dentro, fuori] of GIUNZIONI) {
    if (!existsSync(fuori)) {
      throw new Error(`Manca ${fuori}: questa prova vuole una suite già installata.`);
    }
    execFileSync("cmd", ["/c", "mklink", "/J", join(locale, dentro), fuori], { stdio: "ignore" });
  }
}

function pulisci() {
  // Le giunzioni si tolgono per prime e una per una: `rmdir` su una giunzione
  // stacca il collegamento, e non c'è modo che una cancellazione ricorsiva
  // finisca dentro ai modelli veri.
  for (const [dentro] of GIUNZIONI) {
    try {
      rmdirSync(join(locale, dentro));
    } catch {
      /* non c'era */
    }
  }
  rmSync(RADICE, { recursive: true, force: true });
}

/* --- finto electron -------------------------------------------------------- */

const finto = {
  app: {
    isPackaged: false,
    getPath: (chi) => (chi === "appData" ? appData : join(RADICE, chi)),
    getAppPath: () => resolve(__dirname, ".."),
    getVersion: () => "0.0.1",
    whenReady: () => Promise.resolve(),
    on() {},
  },
  BrowserWindow: class {
    static getAllWindows() {
      return [];
    }
  },
  ipcMain: { handle() {}, on() {} },
  shell: { openPath() {}, showItemInFolder() {} },
  dialog: {},
  Menu: { setApplicationMenu() {} },
  net: {},
  protocol: { handle() {}, registerSchemesAsPrivileged() {} },
  nativeImage: {},
  Tray: class {},
};

const caricaOriginale = Module._load;
Module._load = function (richiesta, ...resto) {
  return richiesta === "electron" ? finto : caricaOriginale.call(this, richiesta, ...resto);
};

/* --- la prova -------------------------------------------------------------- */

preparaRadice();

// Quello che nell'app vero fa index.ts appena parte.
require(join(OUT, "paths.js")).ensureDataDirs();

const { appManager } = require(join(OUT, "app-manager.js"));
const { installaApp, annulla } = require(join(OUT, "scaricamenti.js"));

const fileVae = join(locale, "models", "vae", VAE);
let falliti = 0;

function esito(ok, cosa, dettaglio = "") {
  console.log(`${ok ? "  OK  " : " ROTTO"} ${cosa}${dettaglio ? " — " + dettaglio : ""}`);
  if (!ok) falliti++;
}

function stato() {
  return appManager.list().find((s) => s.id === "musica");
}

function attendi(condizione, entroMs = 120_000) {
  return new Promise((risolvi, rifiuta) => {
    const scaduto = setTimeout(() => rifiuta(new Error("condizione mai avverata")), entroMs);
    const spia = setInterval(() => {
      if (!condizione()) return;
      clearInterval(spia);
      clearTimeout(scaduto);
      risolvi();
    }, 100);
  });
}

async function provaAnnullamento() {
  console.log("\n1. Annullare a metà, e riprendere dopo");

  const finita = installaApp("musica");
  await attendi(() => (stato().progress?.done ?? 0) > 4 * 1024 ** 2);
  const aChePunto = stato().progress.done;
  annulla("musica");
  await finita;

  esito(!existsSync(fileVae), "niente modello a metà spacciato per buono");
  const avanzo = existsSync(`${fileVae}.parte`) ? statSync(`${fileVae}.parte`).size : 0;
  esito(avanzo > 0, "il pezzo scaricato resta", `${(avanzo / 1024 ** 2).toFixed(1)} MB`);
  esito(
    stato().status === "da-installare",
    "la scheda torna 'da installare'",
    stato().status,
  );
  esito(stato().progress === undefined, "la barra sparisce");
  esito(
    stato().missingGb === GB_ATTESI,
    "e ridice quanto manca",
    `${stato().missingGb} GB, attesi ${GB_ATTESI}`,
  );

  return { aChePunto, avanzo };
}

async function provaFinoInFondo(avanzo) {
  console.log("\n2. Ripremuto Installa, riprende e finisce");

  const scatti = [];
  const spia = (stati) => {
    const p = stati.find((s) => s.id === "musica").progress;
    if (p) scatti.push(p.done);
  };
  appManager.on("changed", spia);
  await installaApp("musica");
  appManager.off("changed", spia);

  esito(
    scatti.length > 0 && scatti[0] >= avanzo,
    "riparte da dove era, non da zero",
    `primo scatto a ${(scatti[0] / 1024 ** 2).toFixed(1)} MB`,
  );
  esito(scatti.length >= 3, "l'avanzamento si muove", `${scatti.length} scatti`);
  esito(existsSync(fileVae), "il modello è arrivato");
  esito(
    existsSync(fileVae) && statSync(fileVae).size === BYTE_VAE,
    "della dimensione del catalogo",
    existsSync(fileVae) ? String(statSync(fileVae).size) : "assente",
  );
  esito(!existsSync(`${fileVae}.parte`), "il .parte sparisce");
  esito(stato().status === "pronta", "la scheda finisce 'pronta'", stato().status);
  esito(stato().missingGb === 0, "non manca più niente");
}

(async () => {
  console.log(`Radice di prova: ${RADICE}`);
  try {
    await appManager.refreshAll();
    console.log(`stato di partenza: ${stato().status}, mancano ${stato().missingGb} GB`);
    esito(stato().status === "da-installare", "parte da 'da installare'");

    const { avanzo } = await provaAnnullamento();
    await provaFinoInFondo(avanzo);
  } catch (err) {
    esito(false, "prova interrotta", err.message);
  } finally {
    pulisci();
  }

  console.log(falliti === 0 ? "\nTutto a posto." : `\n${falliti} controlli falliti.`);
  process.exit(falliti === 0 ? 0 : 1);
})();
