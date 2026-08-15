/**
 * Stato e ciclo di vita delle sei app.
 *
 * Un'app è utilizzabile quando ci sono l'ambiente Python condiviso e i suoi
 * modelli. Aprirla significa: chiedere la GPU se è un motore pesante, avviare il
 * servizio se non gira già, mostrare la finestra. Chiuderla fa il contrario.
 */

import { EventEmitter } from "node:events";
import { APP_LIST, APPS, type AppId, type AppState } from "@daprod/ipc";
import { gpu } from "./gpu";
import { runtime } from "./runtime";
import { missingModelsGb } from "./models";
import * as visualizer from "./apps/visualizer";

/**
 * Le app già portate dentro la suite.
 *
 * Un'app non elencata qui compare nell'hub disattivata, con scritto che non è
 * ancora inclusa — meglio di una scheda che sembra pronta e poi non apre niente.
 */
const MIGRATED = new Set<AppId>(["visualizer"]);

/** Come si apre e si chiude ogni app migrata. */
const FINESTRE: Partial<Record<AppId, { apri: (onClose: () => void) => void; chiudi: () => void }>> =
  {
    visualizer: { apri: visualizer.apri, chiudi: visualizer.chiudi },
  };

class AppManager extends EventEmitter {
  private states = new Map<AppId, AppState>();

  constructor() {
    super();
    for (const app of APP_LIST) {
      this.states.set(app.id, { id: app.id, status: "non-inclusa", missingGb: 0 });
    }
  }

  list(): AppState[] {
    return APP_LIST.map((app) => this.states.get(app.id)!);
  }

  /** Ricalcola lo stato di tutte le app da runtime e modelli presenti su disco. */
  async refreshAll(): Promise<void> {
    const rt = await runtime.refresh();

    for (const app of APP_LIST) {
      const current = this.states.get(app.id)!;

      // Un'app in mezzo a un'operazione non si tocca: sovrascriverle lo stato
      // farebbe sparire la barra di avanzamento sotto gli occhi dell'utente.
      if (
        current.status === "in-preparazione" ||
        current.status === "in-avvio" ||
        current.status === "attiva"
      ) {
        continue;
      }

      if (!MIGRATED.has(app.id)) {
        this.patch(app.id, { status: "non-inclusa", missingGb: 0, error: undefined });
        continue;
      }

      const missingGb = await missingModelsGb(app.models);
      this.patch(app.id, {
        status: rt.ready && missingGb === 0 ? "pronta" : "da-installare",
        missingGb,
        error: undefined,
      });
    }
  }

  async open(id: AppId): Promise<void> {
    if (!MIGRATED.has(id)) {
      this.patch(id, {
        status: "in-errore",
        error: `${APPS[id].name} non è ancora inclusa in questa versione della suite.`,
      });
      return;
    }

    const descriptor = APPS[id];

    if (descriptor.gpuHeavy) {
      // Un solo motore pesante alla volta: chi teneva la GPU viene spento.
      await gpu.acquire(id, async (previous) => {
        await this.close(previous);
      });
    }

    this.patch(id, { status: "in-avvio", error: undefined });

    const finestra = FINESTRE[id];
    if (!finestra) {
      this.patch(id, {
        status: "in-errore",
        error: `Manca la finestra di ${descriptor.name}.`,
      });
      return;
    }

    try {
      // L'avvio del servizio Python, per le app che ne hanno uno, si innesta qui
      // prima di aprire la finestra.
      finestra.apri(() => {
        // Chiusa dall'utente con la X: lo stato deve tornare indietro da solo,
        // altrimenti l'hub resta a dire "attiva" per una finestra che non c'è.
        gpu.release(id);
        this.patch(id, { status: "pronta" });
      });
      this.patch(id, { status: "attiva" });
    } catch (err) {
      this.patch(id, {
        status: "in-errore",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async close(id: AppId): Promise<void> {
    FINESTRE[id]?.chiudi();
    gpu.release(id);
    if (MIGRATED.has(id)) this.patch(id, { status: "pronta", error: undefined });
  }

  /** Spegne tutto. Chiamata alla chiusura della suite e prima di un aggiornamento. */
  async closeAll(): Promise<void> {
    await Promise.all(APP_LIST.map((app) => this.close(app.id)));
  }

  patch(id: AppId, partial: Partial<AppState>): void {
    const current = this.states.get(id)!;
    this.states.set(id, { ...current, ...partial });
    this.emit("changed", this.list());
  }
}

export const appManager = new AppManager();
