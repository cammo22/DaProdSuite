/**
 * DaProdCompanion dentro la suite.
 *
 * Viene da `Desktop\DaProdCompanion`, che era un programma intero — Electron
 * suo, tre servizi Python, Ollama a parte. Qui resta la finestra e basta: il
 * motore lo accende il supervisore, il modello lo tiene LM Studio, e questa
 * pagina si limita a dire all'interfaccia dove trovarli.
 *
 * Come Musica e Foto, la pagina è caricata da `daprod://companion/` e non da
 * `file://`: è fatta di moduli ES, che da `file://` non si importano fra loro.
 * Ed è anche la strada che le fa arrivare `/comune/`, i pezzi condivisi.
 *
 * **La finestra è stretta e alta**, al contrario di quelle che generano: qui non
 * c'è una galleria da guardare, c'è una conversazione da leggere. Sta comoda in
 * mezzo schermo accanto a un'altra app.
 */

import { BrowserWindow, app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { gestisciSchema, serviInterfaccia, urlInterfaccia } from "../../file-scheme";
import { registraConsole } from "../../finestre";
import { CACHE_DIR, iconaApp } from "../../paths";
import { montaTerminale } from "../../terminale";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 900, height: 940, maximized: false };

let finestra: BrowserWindow | null = null;
let canaliRegistrati = false;

/** Cartella della pagina: nel repo in sviluppo, in resources una volta impacchettata. */
function cartellaUi(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", "companion")
    : join(app.getAppPath(), "..", "companion");
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  registraCanali();
  gestisciSchema();
  serviInterfaccia("companion", cartellaUi());

  const bounds = readBounds("companion", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 420,
    minHeight: 480,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdCompanion",
    icon: iconaApp("companion"),
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "companion.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  registraConsole(win, "companion");
  montaTerminale(win, "companion");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("companion", "window", {
      ...win.getNormalBounds(),
      maximized: win.isMaximized(),
    });
  };
  win.on("resized", salvaBounds);
  win.on("moved", salvaBounds);
  win.on("maximize", salvaBounds);
  win.on("unmaximize", salvaBounds);
  win.on("close", salvaBounds);

  win.on("closed", () => {
    finestra = null;
    onClose();
  });

  void win.loadURL(urlInterfaccia("companion"));
}

export function chiudi(): void {
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
}

export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}

function registraCanali(): void {
  if (canaliRegistrati) return;
  canaliRegistrati = true;

  ipcMain.handle("dpc:motore", () => indirizzo("companion"));

  /**
   * La cartella dove i sogni e le entità finiscono scritti.
   *
   * Sta dentro i temporanei del motore — `DAPROD_TEMPORANEI/memoria` — e non
   * nella libreria dei risultati: un appunto in markdown non è un brano né
   * un'immagine, e la libreria è fatta per le cose che si ascoltano e si
   * guardano. Chi vuole leggerli li apre da qui.
   */
  ipcMain.handle("dpc:apri-ricordi", async () => {
    await shell.openPath(join(CACHE_DIR, "companion", "memoria"));
  });
}
