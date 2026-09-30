/**
 * DaProdProduzioni dentro la suite: l'app principale per creare contenuti.
 *
 * Immagini, video, voce e musica si fanno con **WanGP**, che dalla 1.7.7 la
 * suite accende da sé e mostra **intero** in una sua finestra: tutti i modelli,
 * tutte le impostazioni, la galleria, la coda. Vedi `../../wangp.ts`.
 *
 * Fino alla 1.7.6 qui si apriva «Wan2GP Desktop Launcher»; chiesto da Cammo il
 * 30 settembre 2026: «dobbiamo rendere WanGP motore della nostra app… fondere i
 * due software». Non c'è più un programma a parte da tenere aperto.
 *
 * La finestra mostra subito una schermata di attesa (il primo avvio di WanGP
 * può durare un paio di minuti) e poi passa alla sua pagina. **Chiudere la
 * scheda non spegne WanGP**: i lavori chiesti dal telefono continuano — si
 * spegne da solo quando nessuno lo usa da un po' (vedi `wangp.ts`).
 */

import { BrowserWindow, shell } from "electron";
import { readBounds, writeState } from "../../app-state";
import { appari, mostraDavvero, registraConsole } from "../../finestre";
import { iconaApp } from "../../paths";
import { PAGINA_WANGP, accendi, impostaFinestra, trovaInstallazione } from "../../wangp";

const PREDEFINITI = { width: 1360, height: 900, maximized: false };

let finestra: BrowserWindow | null = null;

function paginaDiTesto(titolo: string, riga: string, colore = "#f59e0b"): string {
  const html = `<!doctype html><meta charset="utf-8"><title>DaProdProduzioni</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#08090d;color:#e8e8ee;font:16px system-ui,sans-serif">
<div style="max-width:560px;padding:24px;text-align:center">
<h1 style="font-size:22px;color:${colore}">${titolo}</h1><p style="line-height:1.5">${riga}</p>
<p style="opacity:.6;font-size:13px">DaProdProduzioni usa WanGP di DeepBeepMeep come motore.</p>
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
    minWidth: 480,
    minHeight: 520,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    title: "DaProdProduzioni",
    icon: iconaApp("produzioni"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Suo, e ricordato: WanGP tiene nel browser le sue scelte (modello, scheda).
      partition: "persist:wangp",
    },
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
    impostaFinestra(false);
    onClose();
  });
  impostaFinestra(true);

  if (!trovaInstallazione()) {
    void win.loadURL(
      paginaDiTesto(
        "WanGP non è installato",
        `Installalo da <a href="${PAGINA_WANGP}" target="_blank" style="color:#f59e0b">GitHub</a> (o col Wan2GP Desktop Launcher), poi riapri questa scheda.`,
      ),
    );
    return;
  }

  void win.loadURL(
    paginaDiTesto("Accendo WanGP…", "La prima volta ci mette un paio di minuti: carica il motore e prepara tutto. Poi si apre da solo."),
  );
  accendi()
    .then((base) => {
      if (!win.isDestroyed()) void win.loadURL(base);
    })
    .catch((errore: unknown) => {
      if (win.isDestroyed()) return;
      const motivo = (errore instanceof Error ? errore.message : String(errore)).replace(/[<>&]/g, "");
      void win.loadURL(paginaDiTesto("WanGP non parte", motivo, "#f87171"));
    });
}

export function chiudi(): void {
  if (finestra && !finestra.isDestroyed()) finestra.close();
  finestra = null;
  impostaFinestra(false);
}

export function laFinestra(): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null;
}
