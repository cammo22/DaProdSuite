/**
 * Stato e ciclo di vita delle sei app.
 *
 * Un'app è utilizzabile quando ci sono l'ambiente Python condiviso e i suoi
 * modelli. Aprirla significa: chiedere la GPU se è un motore pesante, avviare il
 * servizio se non gira già, mostrare la finestra. Chiuderla fa il contrario.
 */

import { EventEmitter } from "node:events";
import type { BrowserWindow } from "electron";
import {
  APP_LIST,
  APPS,
  CHANNELS,
  type AppId,
  type AppState,
  type Consegna,
  type Intenzione,
} from "@daprod/ipc";
import { libreria } from "./libreria";
import { gpu } from "./gpu";
import { runtime } from "./runtime";
import { missingModelsGb } from "./models";
import * as servizi from "./servizi";
import * as visualizer from "./apps/visualizer";
import * as musica from "./apps/musica";
import * as foto from "./apps/foto";

/**
 * Le app già portate dentro la suite.
 *
 * Un'app non elencata qui compare nell'hub disattivata, con scritto che non è
 * ancora inclusa — meglio di una scheda che sembra pronta e poi non apre niente.
 */
const MIGRATED = new Set<AppId>(["visualizer", "musica", "foto"]);

interface Finestra {
  apri: (onClose: () => void) => void;
  chiudi: () => void;
  /** La finestra viva, se c'è: serve per consegnarle elementi dalla libreria. */
  laFinestra: () => BrowserWindow | null;
}

/** Come si apre, si chiude e si raggiunge ogni app migrata. */
const FINESTRE: Partial<Record<AppId, Finestra>> = {
  visualizer: {
    apri: visualizer.apri,
    chiudi: visualizer.chiudi,
    laFinestra: visualizer.laFinestra,
  },
  musica: {
    apri: musica.apri,
    chiudi: musica.chiudi,
    laFinestra: musica.laFinestra,
  },
  foto: {
    apri: foto.apri,
    chiudi: foto.chiudi,
    laFinestra: foto.laFinestra,
  },
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
      // Il motore prima della finestra: aprirla mentre i pesi si caricano
      // vorrebbe dire mostrare un'interfaccia che a ogni clic risponde "motore
      // offline". `avvia` torna solo quando /health dice di sì, e per MiniMax
      // Music 3 può essere più di un minuto.
      await servizi.avvia(id, (motivo) => {
        this.patch(id, { status: "in-errore", error: motivo });
        FINESTRE[id]?.chiudi();
        gpu.release(id);
      });

      finestra.apri(() => {
        // Chiusa dall'utente con la X: lo stato deve tornare indietro da solo,
        // altrimenti l'hub resta a dire "attiva" per una finestra che non c'è.
        void this.close(id);
      });
      this.patch(id, { status: "attiva" });
    } catch (err) {
      // Se il motore non è partito la GPU resta prenotata a nome di un'app che
      // non c'è, e la prossima non riuscirebbe più ad aprirsi.
      await servizi.ferma(id).catch(() => {});
      gpu.release(id);
      this.patch(id, {
        status: "in-errore",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async close(id: AppId): Promise<void> {
    FINESTRE[id]?.chiudi();
    // Il motore si spegne dopo la finestra e solo se non serve a un'altra app:
    // sono i secondi in cui si liberano gli 8 GB di VRAM.
    await servizi.ferma(id);
    gpu.release(id);
    if (MIGRATED.has(id)) this.patch(id, { status: "pronta", error: undefined });
  }

  /** Spegne tutto. Chiamata alla chiusura della suite e prima di un aggiornamento. */
  async closeAll(): Promise<void> {
    await Promise.all(APP_LIST.map((app) => this.close(app.id)));
  }

  /** Almeno un'app aperta: la suite non deve chiudersi mentre si sta lavorando. */
  qualcunaAperta(): boolean {
    return APP_LIST.some((app) => FINESTRE[app.id]?.laFinestra() !== null);
  }

  /**
   * Manda un elemento della libreria a un'altra app.
   *
   * Se la destinazione è chiusa la apre e aspetta che la sua pagina sia pronta,
   * altrimenti la consegna partirebbe verso un renderer che non ha ancora
   * registrato l'ascoltatore e si perderebbe.
   */
  async consegna(
    destinazione: AppId,
    elementoId: string,
    intenzione: Intenzione,
    mittente?: AppId,
  ): Promise<void> {
    const elemento = libreria.trova(elementoId);
    if (!elemento) throw new Error(`Elemento "${elementoId}" non più in libreria.`);

    const finestra = FINESTRE[destinazione];
    if (!finestra) {
      throw new Error(`${APPS[destinazione].name} non è ancora nella suite.`);
    }

    const eraChiusa = finestra.laFinestra() === null;
    if (eraChiusa) await this.open(destinazione);

    const win = finestra.laFinestra();
    if (!win) throw new Error(`Non sono riuscito ad aprire ${APPS[destinazione].name}.`);

    const pacchetto: Consegna = { elemento, intenzione, mittente };
    const invia = () => win.webContents.send(CHANNELS.appConsegna, pacchetto);

    if (eraChiusa && win.webContents.isLoading()) {
      win.webContents.once("did-finish-load", invia);
    } else {
      invia();
    }

    win.focus();
  }

  patch(id: AppId, partial: Partial<AppState>): void {
    const current = this.states.get(id)!;
    this.states.set(id, { ...current, ...partial });
    this.emit("changed", this.list());
  }
}

export const appManager = new AppManager();
