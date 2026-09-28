/**
 * DaProdProduzioni dentro la suite.
 *
 * Dalla 1.7.5 prende il posto di Foto, Cinema e Voce: immagini, video, voce e
 * musica li fa WanGP, acceso da Wan2GP Desktop Launcher (vedi `wangp.ts`).
 *
 * La finestra mostra Deepy, l'agente di WanGP, cioè la sua app web su
 * `/deepy/`. Mentre WanGP si accende, una pagina d'attesa dice cosa succede;
 * se il launcher non c'è, dice dove prenderlo. Come per DaProdConnessione:
 * niente preload e nessun ponte, perché la pagina viene da un altro programma.
 */

import { BrowserWindow, shell } from "electron";
import { readBounds, writeState } from "../../app-state";
import { appari, mostraDavvero, registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { PAGINA_LAUNCHER, accendiWanGP } from "./wangp";

const PREDEFINITI = { width: 1280, height: 900, maximized: false };

let finestra: BrowserWindow | null = null;

function paginaDiTesto(titolo: string, riga: string): string {
  const html = `<!doctype html><meta charset="utf-8"><title>DaProdProduzioni</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#08090d;color:#e8e8ee;font:16px system-ui,sans-serif">
<div style="max-width:560px;padding:24px;text-align:center">
<h1 style="font-size:22px;color:#f59e0b">${titolo}</h1><p style="line-height:1.5">${riga}</p>
<p style="opacity:.6;font-size:13px">DaProdProduzioni usa WanGP di DeepBeepMeep, avviato da Wan2GP Desktop Launcher.</p>
</div></body>`;
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}

export function apri(onClose: () => void): void {
  if (finestra && !finestra.isDestroyed()) {
    mostraDavvero(finestra);
    return;
  }

  const bounds = readBounds("produzioni", PREDEFINITI);
  finestra = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 360,
    minHeight: 480,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdProduzioni",
    icon: iconaApp("produzioni"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  const win = finestra;
  registraConsole(win, "produzioni");
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => appari(win));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const salvaBounds = () => {
    if (win.isDestroyed()) return;
    writeState("produzioni", "window", { ...win.getNormalBounds(), maximized: win.isMaximized() });
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

  void win.loadURL(
    paginaDiTesto("Accendo WanGP…", "Il launcher sta avviando WanGP. La prima volta può metterci un paio di minuti."),
  );

  accendiWanGP()
    .then((base) => {
      if (!win.isDestroyed()) void win.loadURL(`${base}/deepy/`);
    })
    .catch((errore: Error) => {
      if (win.isDestroyed()) return;
      const riga = errore.message.includes(PAGINA_LAUNCHER)
        ? `Non trovo Wan2GP Desktop Launcher. Scaricalo da <a href="${PAGINA_LAUNCHER}" target="_blank" style="color:#f59e0b">GitHub</a>, installalo, poi riapri questa scheda.`
        : errore.message;
      void win.loadURL(paginaDiTesto("WanGP non è pronto", riga));
    });
}

export function chiudi(): void {
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
}

export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}
