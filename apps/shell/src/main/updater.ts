/**
 * Aggiornamenti della suite tramite GitHub Releases.
 *
 * Il canale è configurato in electron-builder.yml (provider github, repo
 * cammo22/DaProdSuite): la CI pubblica l'installer insieme a `latest.yml`, e
 * electron-updater confronta la versione lì dentro con quella installata.
 *
 * Lo scaricamento non parte da solo: la suite dice che c'è un aggiornamento e
 * aspetta. Un download di centinaia di MB avviato a sorpresa mentre stai
 * generando un brano è esattamente quello che non vogliamo.
 *
 * Nota: questo riguarda solo programma e interfacce. Motori e modelli hanno un
 * versionamento loro (manifest/models.json), così si può aggiornare un modello
 * senza rifare l'installer.
 */

import { EventEmitter } from "node:events";
import { app } from "electron";
// Import nominale, non default: electron-updater è CommonJS e non espone un
// `default`, quindi `import electronUpdater from ...` darebbe undefined.
import { autoUpdater } from "electron-updater";
import type { UpdateState } from "@daprod/ipc";

class Updater extends EventEmitter {
  private state: UpdateState = {
    status: "inattivo",
    currentVersion: app.getVersion(),
  };

  constructor() {
    super();

    // Lo scaricamento lo decide l'utente.
    autoUpdater.autoDownload = false;
    // L'installazione alla chiusura invece sì: se l'ha già scaricato, tanto vale.
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => this.patch({ status: "in-controllo" }));

    autoUpdater.on("update-available", (info) =>
      this.patch({
        status: "disponibile",
        availableVersion: info.version,
        notes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined,
      }),
    );

    autoUpdater.on("update-not-available", () =>
      this.patch({ status: "aggiornato", availableVersion: undefined }),
    );

    autoUpdater.on("download-progress", (p) =>
      this.patch({ status: "in-scaricamento", percent: Math.round(p.percent) }),
    );

    autoUpdater.on("update-downloaded", (info) =>
      this.patch({
        status: "pronto-da-installare",
        availableVersion: info.version,
        percent: 100,
      }),
    );

    autoUpdater.on("error", (err) =>
      this.patch({ status: "in-errore", error: err?.message ?? String(err) }),
    );
  }

  getState(): UpdateState {
    return this.state;
  }

  async check(): Promise<void> {
    // In sviluppo non c'è nessun app-update.yml: inutile provarci, e il messaggio
    // d'errore di electron-updater confonderebbe soltanto.
    if (!app.isPackaged) {
      this.patch({
        status: "inattivo",
        notes: "Gli aggiornamenti funzionano solo sulla versione installata.",
      });
      return;
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      this.patch({ status: "in-errore", error: (err as Error).message });
    }
  }

  async download(): Promise<void> {
    if (this.state.status !== "disponibile") return;
    try {
      this.patch({ status: "in-scaricamento", percent: 0 });
      await autoUpdater.downloadUpdate();
    } catch (err) {
      this.patch({ status: "in-errore", error: (err as Error).message });
    }
  }

  /** Riavvia applicando l'aggiornamento. Da chiamare solo a servizi già spenti. */
  installAndRestart(): void {
    if (this.state.status !== "pronto-da-installare") return;
    autoUpdater.quitAndInstall();
  }

  private patch(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial };
    this.emit("changed", this.state);
  }
}

export const updater = new Updater();
