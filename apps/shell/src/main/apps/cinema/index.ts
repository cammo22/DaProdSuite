/**
 * DaProdCinema dentro la suite.
 *
 * La settima scheda, e la prima che non viene da un programma già esistente: le
 * altre sei sono porti — Flux Klein Studio, MinimaxMusica, LeapTalk — questa
 * nasce qui.
 *
 * **Gira sullo stesso ComfyUI di Musica e Foto.** Tre app, un motore: aprire
 * Cinema mentre Musica è aperta non ne avvia un secondo, e chiuderne una non
 * spegne le altre. È anche il motivo per cui la scheda può esistere senza
 * scrivere un motore nuovo — i nodi video di Wan 2.2 ComfyUI ce li ha già.
 *
 * Come le altre due, la pagina è caricata da `daprod://cinema/` e non da
 * `file://`: è fatta di moduli ES, che da `file://` non si importano fra loro.
 */

import { BrowserWindow, app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { gestisciSchema, serviInterfaccia, urlInterfaccia } from "../../file-scheme";
import { registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { montaTerminale } from "../../terminale";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 1420, height: 920, maximized: false };

let finestra: BrowserWindow | null = null;
let canaliRegistrati = false;

/** Cartella della pagina: nel repo in sviluppo, in resources una volta impacchettata. */
function cartellaUi(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", "cinema")
    : join(app.getAppPath(), "..", "cinema");
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  registraCanali();
  gestisciSchema();
  serviInterfaccia("cinema", cartellaUi());

  const bounds = readBounds("cinema", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // La lista delle inquadrature vuole una colonna sua accanto all'anteprima:
    // sotto questa larghezza si impilano, e va bene lo stesso.
    minWidth: 520,
    minHeight: 600,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdCinema",
    icon: iconaApp("cinema"),
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "cinema.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  registraConsole(win, "cinema");
  montaTerminale(win, "cinema");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("cinema", "window", { ...win.getNormalBounds(), maximized: win.isMaximized() });
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

  void win.loadURL(urlInterfaccia("cinema"));
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

  ipcMain.handle("dpc:motore", () => indirizzo("cinema"));
}
