/**
 * DaProdVoce dentro la suite.
 *
 * La più semplice delle otto, come finestra: una pagina caricata da
 * `daprod://voce/` — moduli ES, che da `file://` non si importerebbero fra loro
 * — e un motore Python su 127.0.0.1:8780 che la pagina raggiunge da sé.
 *
 * **Il suo motore è solo suo**, a differenza di Musica, Foto e Cinema che
 * dividono ComfyUI: qui gira un modello di sintesi vocale con le sue librerie,
 * fra cui una — transformers 4.57 — che nell'ambiente condiviso non c'è e non ci
 * deve entrare. Il perché sta in `services/voce/requisiti-privati.txt`.
 */

import { BrowserWindow, app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { gestisciSchema, serviInterfaccia, urlInterfaccia } from "../../file-scheme";
import { registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { montaTerminale } from "../../terminale";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 1280, height: 880, maximized: false };

let finestra: BrowserWindow | null = null;
let canaliRegistrati = false;

/** Cartella della pagina: nel repo in sviluppo, in resources una volta impacchettata. */
function cartellaUi(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", "voce")
    : join(app.getAppPath(), "..", "voce");
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  registraCanali();
  gestisciSchema();
  serviInterfaccia("voce", cartellaUi());

  const bounds = readBounds("voce", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // Come DaProdFoto: sotto i 1150px il foglio di stile impila le due colonne
    // da sé, quindi la finestra si può accostare a metà schermo accanto a
    // un'altra e resta usabile.
    minWidth: 480,
    minHeight: 560,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdVoce",
    // L'icona della finestra e della barra delle applicazioni: quella dell'app,
    // non quella della suite. Con cinque finestre aperte è l'unico modo per
    // riconoscerle senza leggerne il titolo.
    icon: iconaApp("voce"),
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "voce.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  // Gli errori della pagina finiscono in logs/foto-pagina.log: senza, un modulo
  // che si rompe si vede solo come un bottone che non fa niente.
  registraConsole(win, "voce");
  // Le righe del motore dentro la finestra dove sono capitate, con Ctrl+L.
  // Iniettato dalla shell: e' una implementazione sola per tutte le app.
  montaTerminale(win, "voce");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("voce", "window", {
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

  void win.loadURL(urlInterfaccia("voce"));
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

  // L'unica cosa che l'interfaccia non può sapere da sola. La porta è nel
  // catalogo, ma il catalogo sta nel main: la pagina lo riceve, non lo importa.
  ipcMain.handle("dpv:motore", () => indirizzo("voce"));
}
