/**
 * Punto di ingresso della suite.
 *
 * Apre l'hub, registra l'IPC, e alla chiusura si assicura che nessun motore
 * Python resti in giro a occupare la VRAM.
 */

import { BrowserWindow, Menu, app, shell } from "electron";
import { join } from "node:path";
import { APP_IDS, type AppId } from "@daprod/ipc";
import { appManager } from "./app-manager";
import { gpu } from "./gpu";
import { registerIpc } from "./ipc";
import { ensureDataDirs } from "./paths";
import { updater } from "./updater";
import { registraSchema } from "./file-scheme";
import { creaTray, distruggiTray } from "./tray";

// Gli schemi privilegiati vanno dichiarati prima che l'app sia pronta: dopo,
// Electron ha già deciso i privilegi e la registrazione non ha effetto. Per
// questo sta qui fuori e non dentro `start()`.
registraSchema();

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

  creaTray({
    mostraHub: () => {
      if (hub && !hub.isDestroyed()) {
        if (hub.isMinimized()) hub.restore();
        hub.focus();
      } else {
        createHub();
      }
    },
    apriApp: (id) => void appManager.open(id),
    appDisponibili: () =>
      appManager
        .list()
        .filter((s) => s.status === "pronta" || s.status === "attiva")
        .map((s) => s.id),
    esci: () => app.quit(),
  });

  // `electron . --apri visualizer` apre subito quell'app. Serve a provarne una
  // senza passare ogni volta dall'hub, ed è il modo in cui si controlla una
  // migrazione appena fatta.
  const indice = process.argv.indexOf("--apri");
  const richiesta = indice >= 0 ? process.argv[indice + 1] : undefined;
  if (richiesta && (APP_IDS as readonly string[]).includes(richiesta)) {
    await appManager.open(richiesta as AppId);
  }

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
  // Chiudere l'hub non deve chiudere le app: si lavora nel Visualizer mentre
  // DaProdMusica genera, e l'hub è solo il punto di partenza. La suite esce
  // quando non resta aperta nessuna finestra davvero.
  app.quit();
});

app.on("before-quit", async (event) => {
  // I servizi Python sono processi figli: senza spegnerli restano orfani e
  // continuano a tenersi la VRAM anche dopo che la finestra è sparita.
  if (!shuttingDown) {
    event.preventDefault();
    shuttingDown = true;
    gpu.stopPolling();
    distruggiTray();
    await appManager.closeAll();
    app.quit();
  }
});

let shuttingDown = false;
