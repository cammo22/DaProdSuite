/**
 * DaProdFoto dentro la suite.
 *
 * Viene da Flux Klein Studio, che era un programma intero: si installava il suo
 * Python, si clonava il suo ComfyUI, si scaricavano i suoi 12 GB di modelli e poi
 * si generava. Di tutto quello qui non resta niente — l'ambiente, il motore e i
 * pesi sono della suite, e questa finestra si limita a dire all'interfaccia dove
 * trovare il motore che il supervisore ha già acceso.
 *
 * Il motore è lo **stesso** di DaProdMusica: aprire Foto mentre Musica è aperta
 * non ne avvia un secondo, e chiuderne una non spegne l'altra.
 *
 * Come Musica, la pagina è caricata da `daprod://foto/` e non da `file://`: è
 * fatta di moduli ES, che da `file://` non si importano fra loro.
 */

import { BrowserWindow, app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { gestisciSchema, serviInterfaccia, urlInterfaccia } from "../../file-scheme";
import { registraConsole } from "../../finestre";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 1420, height: 900, maximized: false };

let finestra: BrowserWindow | null = null;
let canaliRegistrati = false;

/** Cartella della pagina: nel repo in sviluppo, in resources una volta impacchettata. */
function cartellaUi(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", "foto")
    : join(app.getAppPath(), "..", "foto");
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  registraCanali();
  gestisciSchema();
  serviInterfaccia("foto", cartellaUi());

  const bounds = readBounds("foto", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // Era 900, perché sotto quella misura le due colonne si accavallavano.
    // Adesso il foglio di stile le impila da sé (`.two` a 1150px) e sotto gli
    // 860 rientra anche l'intestazione, quindi il limite può scendere: la
    // finestra si accosta a metà schermo accanto a un'altra e resta usabile.
    minWidth: 480,
    minHeight: 560,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdFoto",
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "foto.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  // Gli errori della pagina finiscono in logs/foto-pagina.log: senza, un modulo
  // che si rompe si vede solo come un bottone che non fa niente.
  registraConsole(win, "foto");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("foto", "window", {
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

  void win.loadURL(urlInterfaccia("foto"));
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
  ipcMain.handle("dpf:motore", () => indirizzo("foto"));
}
