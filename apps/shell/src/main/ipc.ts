/**
 * Registrazione dei canali IPC.
 *
 * Tutto ciò che il renderer può chiedere passa da qui. I nomi dei canali stanno
 * in @daprod/ipc e sono gli stessi usati dal preload, così non possono divergere.
 */

import { BrowserWindow, ipcMain, shell } from "electron";
import { app } from "electron";
import { CHANNELS, type AppId } from "@daprod/ipc";
import { appManager } from "./app-manager";
import { gpu } from "./gpu";
import { runtime } from "./runtime";
import { updater } from "./updater";
import { LOGS_DIR, MODELS_DIR, OUTPUT_DIR } from "./paths";

export function registerIpc(getHub: () => BrowserWindow | null): void {
  /* ---------------------------------------------------------------- suite */

  ipcMain.handle(CHANNELS.suiteVersion, () => app.getVersion());

  ipcMain.handle(CHANNELS.suiteRevealPath, async (_e, kind: "output" | "logs" | "models") => {
    const target = { output: OUTPUT_DIR, logs: LOGS_DIR, models: MODELS_DIR }[kind];
    await shell.openPath(target);
  });

  /* ------------------------------------------------------------------ app */

  ipcMain.handle(CHANNELS.appsList, () => appManager.list());
  ipcMain.handle(CHANNELS.appsOpen, (_e, id: AppId) => appManager.open(id));
  ipcMain.handle(CHANNELS.appsClose, (_e, id: AppId) => appManager.close(id));
  ipcMain.handle(CHANNELS.appsInstall, (_e, id: AppId) => {
    // Lo scaricamento di runtime e modelli è la fase 2. Finché non c'è, meglio
    // dirlo che far girare una barra di avanzamento che non avanza.
    appManager.patch(id, {
      status: "in-errore",
      error: "L'installazione automatica dei modelli arriva nella prossima versione.",
    });
  });

  /* -------------------------------------------------------------- runtime */

  ipcMain.handle(CHANNELS.runtimeState, () => runtime.getState());
  ipcMain.handle(CHANNELS.runtimeInstall, async () => {
    await runtime.install();
    // Le schede dicono "da installare" finché manca l'ambiente: ora va rivisto.
    await appManager.refreshAll();
  });

  /* ------------------------------------------------------------------ gpu */

  ipcMain.handle(CHANNELS.gpuState, () => gpu.getState());

  /* --------------------------------------------------------- aggiornamenti */

  ipcMain.handle(CHANNELS.updateState, () => updater.getState());
  ipcMain.handle(CHANNELS.updateCheck, () => updater.check());
  ipcMain.handle(CHANNELS.updateDownload, () => updater.download());
  ipcMain.handle(CHANNELS.updateInstall, async () => {
    // I motori Python tengono file aperti e VRAM occupata: vanno spenti prima
    // che l'installer provi a sovrascrivere la cartella del programma.
    await appManager.closeAll();
    updater.installAndRestart();
  });

  /* ------------------------------------------------- notifiche al renderer */

  const send = (channel: string, payload: unknown) => {
    const hub = getHub();
    if (hub && !hub.isDestroyed()) hub.webContents.send(channel, payload);
  };

  appManager.on("changed", (states) => send(CHANNELS.appsChanged, states));
  runtime.on("changed", (state) => send(CHANNELS.runtimeChanged, state));
  gpu.on("changed", (state) => send(CHANNELS.gpuChanged, state));
  updater.on("changed", (state) => send(CHANNELS.updateChanged, state));
}
