/**
 * DaProdDream dentro la suite.
 *
 * Viene da `Desktop\DaProdDream`, che era un programma intero: si installava il
 * suo Python, si apriva da sé una finestra di Chrome in modalità `--app` e si
 * spegneva con un watchdog quando non vedeva più nessuno collegato. Di tutto
 * quello qui non resta niente — l'ambiente è della suite, la finestra è questa,
 * l'accensione e lo spegnimento sono del supervisore.
 *
 * **La pagina la serve il motore, non lo schema `daprod://`.** È l'unica delle
 * tre app migrate a fare così, e per una ragione precisa: l'interfaccia di Dream
 * chiama il proprio server con indirizzi relativi e apre un WebSocket su
 * `location.host`, perché i fotogrammi trasformati arrivano da lì trenta volte
 * al secondo. Caricarla da un'altra origine vorrebbe dire riscriverla; caricarla
 * da `http://127.0.0.1:8770` non costa niente ed è quello che già faceva.
 */

import { BrowserWindow, app, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { registraConsole } from "../../finestre";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 1560, height: 980, maximized: false };

let finestra: BrowserWindow | null = null;

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  const bounds = readBounds("dream", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // Sotto questa larghezza i comandi finiscono sopra l'immagine trasformata.
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdDream",
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "dream.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  registraConsole(win, "dream");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("dream", "window", { ...win.getNormalBounds(), maximized: win.isMaximized() });
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

  // Il motore risponde già a /health quando arriviamo qui: lo garantisce
  // `app-manager.open`, che apre la finestra solo dopo.
  void win.loadURL(`${indirizzo("dream") ?? "http://127.0.0.1:8770"}/`);
}

export function chiudi(): void {
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
}

export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}

/** Non serve a niente qui, ma tiene la stessa forma delle altre app. */
export const pronta = (): boolean => app.isReady();
