/**
 * DaProd IoDigitale dentro la suite.
 *
 * Viene da `Desktop\AvatarParlante\LeapTalk`, che era un programma intero: un
 * `.bat` con un menu, un ambiente Python suo, quindici GB di modelli in una
 * cartella sua e un `.env` da modificare a mano per cambiare voce o modello.
 * Qui tutte e quattro quelle cose le fa la suite, e resta solo il motore.
 *
 * **La pagina la serve il motore**, come per DaProdDream e per la stessa
 * ragione: l'interfaccia apre un WebSocket su `location.host` e riceve da lì il
 * video dell'avatar mentre parla. Caricarla da un'altra origine vorrebbe dire
 * riscriverla.
 *
 * **Questa scheda pretende LM Studio acceso**, ed è l'unica: senza il modello
 * che risponde, l'avatar può muovere la bocca ma non ha niente da dire.
 */

import { BrowserWindow, app, shell } from "electron";
import { join } from "node:path";
import { readBounds, writeState } from "../../app-state";
import { registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { montaTerminale } from "../../terminale";
import { indirizzo } from "../../servizi";

const PREDEFINITI = { width: 1400, height: 940, maximized: false };

let finestra: BrowserWindow | null = null;

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    if (finestra.isMinimized()) finestra.restore();
    finestra.focus();
    return;
  }

  const bounds = readBounds("iodigitale", PREDEFINITI);

  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // Il video dell'avatar sta a sinistra e la conversazione a destra: sotto
    // questa larghezza si accavallano.
    minWidth: 1000,
    minHeight: 680,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProd IoDigitale",
    // L'icona della finestra e della barra delle applicazioni: quella dell'app,
    // non quella della suite. Con cinque finestre aperte è l'unico modo per
    // riconoscerle senza leggerne il titolo.
    icon: iconaApp("iodigitale"),
    webPreferences: {
      preload: join(__dirname, "..", "..", "..", "preload", "iodigitale.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const win = finestra;
  // La pagina si chiama ancora "LeapTalk Web" nel suo `<title>`, e Electron
  // lascia che il titolo della pagina vinca su quello della finestra: senza
  // questa riga, nella barra delle applicazioni comparirebbe il nome del
  // progetto da cui viene invece del nome della scheda.
  win.on("page-title-updated", (evento) => evento.preventDefault());
  registraConsole(win, "iodigitale");
  montaTerminale(win, "iodigitale");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  // **Il microfono si concede qui.** Tenere premuto per parlare è il gesto
  // principale di quest'app: farlo chiedere da una finestrella a ogni avvio,
  // per un programma che gira tutto sul PC di casa, sarebbe attrito senza
  // guadagno. Si concede il microfono e basta — tutto il resto si nega.
  win.webContents.session.setPermissionRequestHandler((_contents, permesso, concedi) => {
    concedi(permesso === "media");
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("iodigitale", "window", { ...win.getNormalBounds(), maximized: win.isMaximized() });
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
  void win.loadURL(`${indirizzo("iodigitale") ?? "http://127.0.0.1:7860"}/`);
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
