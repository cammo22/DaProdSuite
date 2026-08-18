/**
 * DaProdVisualizer dentro la suite.
 *
 * Prima era un'app Electron a sé: il suo `main.ts` creava la finestra e apriva
 * un ponte verso il renderer. Qui la finestra la fa lo shell e il ponte è questo
 * modulo — l'interfaccia React non è cambiata di una riga, perché parlava già a
 * un `HostBridge` astratto (`window.daprodHost`) senza sapere cosa ci fosse
 * sotto.
 *
 * È il modello con cui verranno migrate le altre: un file per app, che sa creare
 * la sua finestra e registrare i suoi canali, e nient'altro.
 */

import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { closeSync, existsSync, fstatSync, openSync, readSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { readBounds, writeState, readState } from "../../app-state";
import { findFfmpeg, transcodeToWav } from "./ffmpeg";
import { codificaUrl, gestisciSchema } from "../../file-scheme";
import { registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { montaTerminale } from "../../terminale";
import { montaTastoVisualizer } from "../../tasto-visualizer";

/** Estensioni offerte dal dialogo file nativo. */
const ESTENSIONI_AUDIO = [
  "mp3", "wav", "wave", "flac", "ogg", "oga", "opus", "m4a", "m4b", "mp4",
  "aac", "weba", "webm", "mka", "wma", "aiff", "aif", "alac", "ape", "wv",
  "mpc", "tta", "ac3", "amr", "dsf",
];

/** Byte letti dalla testa del file per i tag: ID3v2, FLAC e Vorbis stanno all'inizio. */
const BYTE_TAG = 512 * 1024;

const PREDEFINITI = { width: 1280, height: 760, maximized: false };

let finestra: BrowserWindow | null = null;
let canaliRegistrati = false;

/** Percorso della UI compilata: nel repo in sviluppo, in resources una volta impacchettata. */
function paginaUi(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", "visualizer", "index.html")
    : join(app.getAppPath(), "..", "visualizer", "dist", "index.html");
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  registraCanali();
  gestisciSchema();

  const bounds = readBounds("visualizer", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // Deve restare usabile anche piccolissima: l'interfaccia si compatta da sola.
    minWidth: 380,
    minHeight: 280,
    show: false,
    backgroundColor: "#06070c",
    autoHideMenuBar: true,
    title: "DaProdVisualizer",
    // L'icona della finestra e della barra delle applicazioni: quella dell'app,
    // non quella della suite. Con cinque finestre aperte è l'unico modo per
    // riconoscerle senza leggerne il titolo.
    icon: iconaApp("visualizer"),
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "visualizer.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Senza questo, minimizzando la finestra la visualizzazione rallenta a
      // scatti: Chromium mette in pausa i timer delle pagine in secondo piano.
      backgroundThrottling: false,
    },
  });

  const win = finestra;
  registraConsole(win, "visualizer");
  // Le righe del motore dentro la finestra dove sono capitate, con Ctrl+L.
  // Iniettato dalla shell: e' una implementazione sola per tutte le app.
  montaTerminale(win, "visualizer");
  // E il modo di aprire DaPVisualizer senza tornare all'hub.
  montaTastoVisualizer(win, "visualizer");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  // Un player locale non ha motivo di navigare sul web: i link esterni vanno nel
  // browser di sistema, tutto il resto è negato.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("visualizer", "window", {
      ...win.getNormalBounds(),
      maximized: win.isMaximized(),
    });
  };
  // Elencati uno per uno e non in un ciclo: `on` ha un overload per ogni nome di
  // evento, e un ciclo su un'unione di nomi non combacia con nessuno.
  win.on("resized", salvaBounds);
  win.on("moved", salvaBounds);
  win.on("maximize", salvaBounds);
  win.on("unmaximize", salvaBounds);
  win.on("close", salvaBounds);

  win.on("closed", () => {
    finestra = null;
    onClose();
  });

  void win.loadFile(paginaUi());
}

export function chiudi(): void {
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
}

/** La finestra viva, se c'è: serve allo shell per consegnarle elementi. */
export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}

/* ------------------------------------------------------- ponte col renderer */

function registraCanali(): void {
  if (canaliRegistrati) return;
  canaliRegistrati = true;

  ipcMain.handle("dpv:capabilities", () => ({
    // Dipende da cosa c'è sul PC: il renderer nasconde le opzioni che
    // richiedono FFmpeg quando non c'è, invece di offrirle e poi fallire.
    ffmpeg: findFfmpeg() !== null,
    filePaths: true,
    persistentQueue: true,
    nativeFullscreen: true,
  }));

  ipcMain.handle("dpv:loadState", (_e, key: string) => readState("visualizer", String(key)));

  ipcMain.handle("dpv:saveState", (_e, key: string, value: unknown) => {
    writeState("visualizer", String(key), value);
  });

  ipcMain.handle("dpv:pickFiles", async () => {
    const opzioni: Electron.OpenDialogOptions = {
      title: "Aggiungi musica",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Audio", extensions: ESTENSIONI_AUDIO },
        { name: "Tutti i file", extensions: ["*"] },
      ],
    };
    const esito =
      finestra && !finestra.isDestroyed()
        ? await dialog.showOpenDialog(finestra, opzioni)
        : await dialog.showOpenDialog(opzioni);

    if (esito.canceled) return [];
    return esito.filePaths.map(descrivi).filter((v) => v !== null);
  });

  ipcMain.handle("dpv:trackUrl", (_e, filePath: string) =>
    typeof filePath === "string" && filePath ? codificaUrl(filePath) : null,
  );

  ipcMain.handle("dpv:prepareSource", async (_e, filePath: string) => {
    if (typeof filePath !== "string" || !filePath) return null;
    const convertito = await transcodeToWav(filePath);
    return convertito ? codificaUrl(convertito) : null;
  });

  ipcMain.handle("dpv:readTagBytes", (_e, filePath: string) => {
    if (typeof filePath !== "string" || !filePath) return null;
    try {
      const handle = openSync(filePath, "r");
      try {
        const lunghezza = Math.min(fstatSync(handle).size, BYTE_TAG);
        const buffer = Buffer.alloc(lunghezza);
        readSync(handle, buffer, 0, lunghezza, 0);
        // Uint8Array e non Buffer: il ponte serializza, e dall'altra parte serve
        // qualcosa che si possa infilare in un Blob.
        return new Uint8Array(buffer);
      } finally {
        closeSync(handle);
      }
    } catch {
      return null;
    }
  });

  ipcMain.handle("dpv:describe", (_e, filePath: string) =>
    typeof filePath === "string" ? descrivi(filePath) : null,
  );

  ipcMain.handle("dpv:reveal", (_e, filePath: string) => {
    if (typeof filePath !== "string" || !existsSync(filePath)) return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle("dpv:setFullscreen", (_e, value: boolean) => {
    if (!finestra || finestra.isDestroyed()) return false;
    finestra.setFullScreen(value === true);
    return finestra.isFullScreen();
  });

  ipcMain.handle("dpv:isFullscreen", () =>
    finestra && !finestra.isDestroyed() ? finestra.isFullScreen() : false,
  );
}

interface FileDescritto {
  name: string;
  size: number;
  path: string;
}

function descrivi(filePath: string): FileDescritto | null {
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return null;
    return { name: basename(filePath), size: stat.size, path: filePath };
  } catch {
    return null;
  }
}

