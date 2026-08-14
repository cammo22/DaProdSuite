/**
 * Punto di ingresso della suite.
 *
 * Apre l'hub, registra l'IPC, e alla chiusura si assicura che nessun motore
 * Python resti in giro a occupare la VRAM.
 */

import { BrowserWindow, Menu, app, shell } from "electron";
import { join } from "node:path";
import { appManager } from "./app-manager";
import { gpu } from "./gpu";
import { registerIpc } from "./ipc";
import { ensureDataDirs } from "./paths";
import { updater } from "./updater";

let hub: BrowserWindow | null = null;

// Una sola istanza: due suite in parallelo si contenderebbero le stesse porte
// dei servizi e la stessa GPU.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (hub) {
      if (hub.isMinimized()) hub.restore();
      hub.focus();
    }
  });

  void app.whenReady().then(start);
}

async function start(): Promise<void> {
  // Via il menu di serie di Electron (File/Edit/View/Window): non c'è una sola
  // voce che serva qui, e fa sembrare la suite un'app non finita.
  Menu.setApplicationMenu(null);

  ensureDataDirs();
  registerIpc(() => hub);
  createHub();

  gpu.startPolling();
  await appManager.refreshAll();

  // Controllo silenzioso all'avvio: se c'è una versione nuova l'hub la mostra,
  // ma non scarica niente senza che l'utente lo chieda.
  void updater.check();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createHub();
  });
}

function createHub(): void {
  hub = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: "#0d0f14",
    title: "DaProd Suite",
    webPreferences: {
      preload: join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  hub.once("ready-to-show", () => hub?.show());
  hub.on("closed", () => {
    hub = null;
  });

  // I link esterni (documentazione, repo) vanno nel browser, non dentro l'hub.
  hub.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void hub.loadFile(join(__dirname, "..", "renderer", "index.html"));
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", async (event) => {
  // I servizi Python sono processi figli: senza spegnerli restano orfani e
  // continuano a tenersi la VRAM anche dopo che la finestra è sparita.
  if (!shuttingDown) {
    event.preventDefault();
    shuttingDown = true;
    gpu.stopPolling();
    await appManager.closeAll();
    app.quit();
  }
});

let shuttingDown = false;
