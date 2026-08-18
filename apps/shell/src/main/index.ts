/**
 * Punto di ingresso della suite.
 *
 * Apre l'hub, registra l'IPC, e alla chiusura si assicura che nessun motore
 * Python resti in giro a occupare la VRAM.
 */

import { BrowserWindow, Menu, app, screen, shell } from "electron";
import { join } from "node:path";
import { APP_IDS, type AppId } from "@daprod/ipc";
import { appManager } from "./app-manager";
import { gpu } from "./gpu";
import { spegniSeNostro } from "./llm";
import { registerIpc } from "./ipc";
import { ensureDataDirs } from "./paths";
import { updater } from "./updater";
import { gestisciSchema, registraSchema } from "./file-scheme";
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
  // Lo schema serve anche all'hub, non solo alle app: il pannello Risultati
  // mostra le anteprime dei file, e quelle stanno su `daprod://file/...`.
  // Prima lo accendeva la prima app che si apriva, quindi l'hub appena avviato
  // avrebbe avuto un pannello di riquadri vuoti.
  gestisciSchema();
  registerIpc(() => hub);
  createHub();

  gpu.startPolling();
  // Assegnata *prima* dell'await: la finestra è già in ascolto (l'ha appena
  // creata `createHub()`) e la sua prima richiesta deve trovare la promessa
  // già lì, non ancora `undefined`.
  appManager.prontoAlPrimoAvvio = appManager.refreshAll();
  await appManager.prontoAlPrimoAvvio;

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

/**
 * Quanto deve essere grande l'hub, in proporzione allo schermo.
 *
 * 1180×820 era tarato per un 1080p e su un 2K o un 4K restava piccolo in mezzo
 * allo schermo, con la suite che sembrava un programmino invece del prodotto.
 * Qui la finestra prende una fetta fissa dell'area utile — il 78% in
 * larghezza, il 82% in altezza — quindi cresce con lo schermo invece di
 * restare alla stessa misura per tutti. `minWidth`/`minHeight` restano bassi:
 * su un monitor piccolo o in una finestra ridotta a mano l'hub deve continuare
 * a funzionare.
 */
function misuraHub(): { width: number; height: number } {
  const area = screen.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.round(Math.min(area.width * 0.78, 1900)),
    height: Math.round(Math.min(area.height * 0.82, 1300)),
  };
}

function createHub(): void {
  const misura = misuraHub();
  hub = new BrowserWindow({
    width: misura.width,
    height: misura.height,
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
    // Anche il modello che scrive: se l'abbiamo caricato noi in LM Studio, sono
    // quattro GB che senza questo restavano in memoria dopo che l'utente ha
    // chiuso la suite, occupati da un programma che credeva chiuso.
    await spegniSeNostro().catch(() => {});
    await appManager.closeAll();
    app.quit();
  }
});

let shuttingDown = false;
