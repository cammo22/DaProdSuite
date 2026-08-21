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
import { spegniAccessoRemoto } from "./remoto";
import { ICONA_SUITE, ensureDataDirs } from "./paths";
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

/** La forma dell'hub: quattro di larghezza per tre di altezza. */
const RAPPORTO_HUB = 4 / 3;

/**
 * Quanto deve essere grande l'hub, in proporzione allo schermo.
 *
 * **L'hub si apre in 4:3, sempre.** Prima prendeva una fetta della larghezza e
 * una dell'altezza indipendenti fra loro, quindi su un 16:9 usciva una finestra
 * 16:9 (1498×846 misurati su questo monitor): le schede si stiravano in una
 * striscia bassa e larga. La griglia delle sette schede è fatta per una finestra
 * alta, ed è quella la forma che deve avere.
 *
 * Si parte dall'altezza — il 92% dell'area utile, che è il vincolo vero su un
 * monitor da scrivania — e la larghezza viene da lì. Se così l'hub uscirebbe
 * dallo schermo (monitor stretti, o due finestre affiancate) si fa il contrario
 * e comanda la larghezza: in nessuno dei due casi la proporzione cambia.
 *
 * **Vale solo per l'hub.** Le finestre delle app tengono la loro misura, che è
 * quella giusta per quello che ci sta dentro e che l'utente si è ridimensionato
 * a mano: il 4:3 è la forma della griglia delle schede, non una regola della
 * suite.
 */
function misuraHub(): { width: number; height: number } {
  const area = screen.getPrimaryDisplay().workAreaSize;

  // 0,92 e non 0,82: alla prima prova in 4:3 la finestra veniva 1128×846, e
  // l'ultima riga di schede restava tagliata sotto il bordo.
  let height = Math.min(area.height * 0.92, 1440);
  let width = height * RAPPORTO_HUB;

  const massimo = Math.min(area.width * 0.94, 1920);
  if (width > massimo) {
    width = massimo;
    height = width / RAPPORTO_HUB;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

function createHub(): void {
  const misura = misuraHub();
  hub = new BrowserWindow({
    width: misura.width,
    height: misura.height,
    // Il minimo è anche lui 4:3, così la forma resta quella anche stringendo
    // la finestra fino in fondo. Ridimensionarla a mano resta libero: bloccare
    // la proporzione impedirebbe di affiancarla a un'altra finestra.
    minWidth: 880,
    minHeight: 660,
    show: false,
    backgroundColor: "#0d0f14",
    title: "DaProd Suite",
    // L'icona della suite, generata con Anima come tutto il resto delle
    // illustrazioni (`scripts/genera-icone.cjs`).
    icon: ICONA_SUITE,
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
    // Il gateway resterebbe in ascolto sulla porta 8790 anche a suite chiusa:
    // chi si è accoppiato continuerebbe a vedere un PC che non c'è più.
    await spegniAccessoRemoto().catch(() => {});
    await appManager.closeAll();
    app.quit();
  }
});

let shuttingDown = false;
