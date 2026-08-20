/**
 * DaProdMusica dentro la suite.
 *
 * Prima era una pagina servita da `python -m http.server` e un `start.ps1` che
 * accendeva ComfyUI: due processi, due porte, e un `config.json` scritto a ogni
 * avvio per dire alla pagina dove fosse finito il motore. Qui il motore lo
 * accende il supervisore e la pagina la carica lo shell, quindi di tutto quel
 * giro resta solo una cosa da dire all'interfaccia: l'indirizzo del motore.
 *
 * La pagina non è caricata da `file://` ma da `daprod://musica/`, perché è fatta
 * di moduli ES e da `file://` non si importano fra loro (vedi `file-scheme.ts`).
 */

import { BrowserWindow, app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { gestisciSchema, serviInterfaccia, urlInterfaccia } from "../../file-scheme";
import { registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { montaTerminale } from "../../terminale";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 1420, height: 900, maximized: false };

let finestra: BrowserWindow | null = null;
let canaliRegistrati = false;

/** Cartella della pagina: nel repo in sviluppo, in resources una volta impacchettata. */
function cartellaUi(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", "musica")
    : join(app.getAppPath(), "..", "musica");
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  registraCanali();
  gestisciSchema();
  serviInterfaccia("musica", cartellaUi());

  const bounds = readBounds("musica", PREDEFINITI);

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
    title: "DaProdMusica",
    // L'icona della finestra e della barra delle applicazioni: quella dell'app,
    // non quella della suite. Con cinque finestre aperte è l'unico modo per
    // riconoscerle senza leggerne il titolo.
    icon: iconaApp("musica"),
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "musica.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  registraConsole(win, "musica");
  // Le righe del motore dentro la finestra dove sono capitate, con Ctrl+L.
  // Iniettato dalla shell: e' una implementazione sola per tutte le app.
  montaTerminale(win, "musica");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("musica", "window", {
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

  void win.loadURL(urlInterfaccia("musica"));
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
  ipcMain.handle("dpm:motore", () => indirizzo("musica"));
}
