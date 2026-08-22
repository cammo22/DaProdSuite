/**
 * DaProdConnessione dentro la suite.
 *
 * **La scheda che non ha pagine.** Tutte le altre hanno un `index.html`, un
 * foglio di stile e una cartella di moduli; questa apre una finestra su
 * `http://127.0.0.1:8790/`, cioè sulla console che il gateway già serve — la
 * stessa identica pagina che vedono il browser di un portatile e l'app del
 * telefono.
 *
 * Non è pigrizia, è la ragione per cui esiste. Chiesto così: «se è un problema
 * creiamo proprio una nuova app della suite DaProdConnessione che quando aperta
 * siamo sicuri che tutto sta funzionando correttamente, stile dashboard». Il
 * guaio da curare era che la stessa roba stava in **due** posti — il pannello
 * «Da fuori» in fondo all'hub e la pagina del telefono — e i due non dicevano
 * mai la stessa cosa: uno sapeva del firewall e l'altro no, uno si aggiornava
 * da solo e l'altro andava riaperto. Una verità sola non si ottiene
 * scrivendone una terza: si ottiene togliendone una.
 *
 * Quindi qui dentro ci sono soltanto: una finestra, e il token con cui questo
 * computer parla a sé stesso.
 *
 * **Perché serve un token anche in casa.** Il gateway non risponde a nessuno
 * senza credenziale, nemmeno a chi gira sulla stessa macchina. Fare
 * un'eccezione per `127.0.0.1` sarebbe stata la strada corta e sbagliata:
 * qualunque programma sul PC avrebbe potuto chiedere una generazione o leggere
 * la libreria. Il computer si accoppia con sé stesso — vedi `tokenDiCasa()` —
 * e da lì è un dispositivo come gli altri.
 */

import { BrowserWindow, app, shell } from "electron";
import { readBounds, writeState } from "../../app-state";
import { registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { indirizzoConsole, tokenDiCasa } from "../../remoto";

const PREDEFINITI = { width: 1100, height: 860, maximized: false };

let finestra: BrowserWindow | null = null;

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    // Riaperta a finestra già viva: si ricarica, perché la ragione per cui uno
    // ci torna è sapere **com'è messa adesso**.
    finestra.webContents.reload();
    return;
  }

  const bounds = readBounds("connessione", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // La pagina è la stessa del telefono: sa stare stretta, e va bene che ci stia.
    minWidth: 360,
    minHeight: 480,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdConnessione",
    icon: iconaApp("connessione"),
    webPreferences: {
      // **Niente preload, e nessun ponte.** Questa finestra carica una pagina
      // servita su HTTP: darle un ponte verso lo shell vorrebbe dire dare a
      // quella pagina — che è la stessa che apre il telefono — l'accesso al
      // computer. Tutto quello che le serve lo chiede al gateway, con il token,
      // come farebbe da fuori.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const win = finestra;
  registraConsole(win, "connessione");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("connessione", "window", {
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

  /**
   * Il token viaggia nel **frammento**, dopo il `#`.
   *
   * Non viene mandato al server, non finisce nei log e non finisce in un
   * Referer; la pagina lo legge, lo mette da parte e lo cancella
   * dall'indirizzo. È lo stesso meccanismo con cui l'app del telefono apre
   * questa pagina — un modo solo, non due.
   */
  const dove = `${indirizzoConsole()}#t=${encodeURIComponent(tokenDiCasa())}&u=${encodeURIComponent(
    process.env.COMPUTERNAME ?? "questo computer",
  )}&r=admin`;
  void win.loadURL(dove);
}

export function chiudi(): void {
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
}

export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}

/** Non serve a niente qui, ma il registro delle finestre lo chiede a tutte. */
export const nome = app.getName();
