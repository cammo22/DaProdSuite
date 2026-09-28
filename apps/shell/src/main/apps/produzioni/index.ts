/**
 * DaProdProduzioni dentro la suite.
 *
 * Dalla 1.7.5 prende il posto di Foto, Cinema e Voce: immagini, video, voce e
 * musica li fa WanGP, acceso da Wan2GP Desktop Launcher (vedi `wangp.ts`).
 *
 * **Apre il launcher completo**, non una pagina: chiesto da Cammo dopo la
 * prima prova della 1.7.5, dove la scheda mostrava solo Deepy — «si deve
 * aprire proprio l'installazione del launcher completo … in modo da poter
 * usare tutto». Se il launcher è già acceso lo si porta davanti, altrimenti lo
 * si accende. La scheda resta «attiva» finché il launcher è vivo.
 *
 * Una finestra nostra si apre solo se il launcher non è installato, per dire
 * dove prenderlo. Chiudere la scheda non spegne WanGP: potrebbe star generando.
 */

import { BrowserWindow, shell } from "electron";
import { readBounds, writeState } from "../../app-state";
import { appari, mostraDavvero, registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { PAGINA_LAUNCHER, apriLauncher, pidLauncher, trovaLauncher } from "./wangp";

const PREDEFINITI = { width: 1280, height: 900, maximized: false };

let finestra: BrowserWindow | null = null;
let sorveglianza: NodeJS.Timeout | null = null;

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
  const exe = trovaLauncher();
  if (exe) {
    void apriLauncher(exe);
    // La scheda torna «pronta» quando il launcher si chiude.
    if (sorveglianza) clearInterval(sorveglianza);
    let visto = false;
    const inizio = Date.now();
    sorveglianza = setInterval(() => {
      void pidLauncher(exe).then((pid) => {
        if (pid !== null) visto = true;
        // Prima di averlo visto acceso si aspetta: parte in qualche secondo.
        if (pid === null && (visto || Date.now() - inizio > 60_000)) {
          if (sorveglianza) clearInterval(sorveglianza);
          sorveglianza = null;
          onClose();
        }
      });
    }, 5000);
    return;
  }
  apriAvviso(onClose);
}

/** La finestra che dice dove prendere il launcher. */
function apriAvviso(onClose: () => void): void {
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
  win.once("ready-to-show", () => appari(win));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.on("close", () => {
    if (!win.isDestroyed()) writeState("produzioni", "window", { ...win.getNormalBounds(), maximized: win.isMaximized() });
  });
  win.on("closed", () => {
    finestra = null;
    onClose();
  });

  void win.loadURL(
    paginaDiTesto(
      "Manca Wan2GP Desktop Launcher",
      `Scaricalo da <a href="${PAGINA_LAUNCHER}" target="_blank" style="color:#f59e0b">GitHub</a>, installalo, poi riapri questa scheda.`,
    ),
  );
}

export function chiudi(): void {
  // Il launcher non si spegne: può star generando. Si smette solo di guardarlo.
  if (sorveglianza) clearInterval(sorveglianza);
  sorveglianza = null;
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
}

export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}
