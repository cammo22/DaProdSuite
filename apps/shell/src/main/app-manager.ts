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
  modelliRichiesti,
  type Consegna,
  type Intenzione,
} from "@daprod/ipc";
import { motoreAggiornato } from "@daprod/runtime";
import { sembraProblemaDiAmbiente } from "./process-supervisor";
import { requisitiDiQuestaMacchina } from "./requisiti-macchina";
import { libreria } from "./libreria";
import { gpu } from "./gpu";
import { runtime } from "./runtime";
import { missingModelsGb } from "./models";
import { ENGINES_DIR } from "./paths";
import * as servizi from "./servizi";
import * as visualizer from "./apps/visualizer";
import * as musica from "./apps/musica";
import * as foto from "./apps/foto";
import * as dream from "./apps/dream";
import * as iodigitale from "./apps/iodigitale";
import * as companion from "./apps/companion";

/**
 * Le app già portate dentro la suite.
 *
 * Un'app non elencata qui compare nell'hub disattivata, con scritto che non è
 * ancora inclusa — meglio di una scheda che sembra pronta e poi non apre niente.
 */
const MIGRATED = new Set<AppId>([
  "visualizer",
  "musica",
  "foto",
  "dream",
  "iodigitale",
  "companion",
]);

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
  dream: {
    apri: dream.apri,
    chiudi: dream.chiudi,
    laFinestra: dream.laFinestra,
  },
  iodigitale: {
    apri: iodigitale.apri,
    chiudi: iodigitale.chiudi,
    laFinestra: iodigitale.laFinestra,
  },
  companion: {
    apri: companion.apri,
    chiudi: companion.chiudi,
    laFinestra: companion.laFinestra,
  },
};

class AppManager extends EventEmitter {
  private states = new Map<AppId, AppState>();

  /**
   * Il primo `refreshAll()`, quello che sostituisce i "non-inclusa" di
   * partenza con lo stato vero.
   *
   * **Il bug che risolve.** L'hub si apre prima che questo giro finisca —
   * sonda Python e torch con un sottoprocesso, non è istantaneo — e senza
   * questa promessa la prima `apps.list()` dal renderer prendeva sempre i
   * valori di default: "Ambiente: da installare" e tutte le schede spente,
   * corrette un attimo dopo quando `refreshAll` finiva e mandava l'evento
   * `changed`. Si vedeva, ed era il lampo che Cammo non voleva più.
   *
   * L'hub aspetta questa prima di leggere qualunque cosa
   * (`CHANNELS.suiteAvvioPronto`): la prima occhiata è già quella giusta.
   */
  prontoAlPrimoAvvio: Promise<void> = Promise.resolve();

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

      await this.rileggi(app.id, rt.ready);
    }
  }

  /**
   * Rilegge una sola app, anche se è in mezzo a qualcosa.
   *
   * La chiama chi ha appena finito di installarla: sa che lo stato di prima non
   * vale più, e passare da `refreshAll` vorrebbe dire uscire da "in
   * preparazione" *prima*, cioè far comparire "Installa" per il secondo buono
   * che ci vuole a interrogare l'ambiente Python.
   */
  async refreshApp(id: AppId): Promise<void> {
    const rt = await runtime.refresh();
    await this.rileggi(id, rt.ready);
  }

  private async rileggi(id: AppId, runtimePronto: boolean): Promise<void> {
    if (!MIGRATED.has(id)) {
      this.patch(id, { status: "non-inclusa", missingGb: 0, error: undefined });
      return;
    }

    const missingGb = await missingModelsGb(modelliRichiesti(id));
    // Un'app che guida un motore di terzi non è pronta finché quel motore non
    // c'è **nella versione che abbiamo provato**. Prima bastavano i modelli: la
    // scheda diceva "pronta", si premeva Apri e si aspettavano tre minuti perché
    // un motore mancante o vecchio se ne accorgesse da solo.
    const motoreOk =
      APPS[id].service?.engine !== "ComfyUI" || motoreAggiornato(ENGINES_DIR);

    this.patch(id, {
      status: runtimePronto && missingGb === 0 && motoreOk ? "pronta" : "da-installare",
      missingGb,
      error: undefined,
      progress: undefined,
      rimedio: undefined,
    });
  }

  /**
   * Perché quest'app non può funzionare su questo computer, se non può.
   *
   * Una sola ragione, per ora: non c'è nessuna scheda video e l'app ne pretende
   * una. Sta nello shell e non solo nell'hub perché l'hub è una vista — spegne
   * un bottone — mentre qui si decide davvero, e ci passano anche la procedura
   * guidata e chi installa tutto in fila.
   *
   * Torna `null` finché l'ambiente non è installato: senza torch non si sa cosa
   * c'è su questa macchina, e tirare a indovinare sarebbe peggio che tacere.
   */
  motivoImpossibile(id: AppId): string | null {
    if (APPS[id].schedaVideo !== "obbligatoria") return null;

    const rt = runtime.getState();
    if (!rt.ready || rt.cudaAvailable !== false) return null;

    return (
      `${APPS[id].name} ha bisogno di una scheda video NVIDIA: fa video, ` +
      "un fotogramma per volta, e sulla CPU un fotogramma costa decine di " +
      "secondi. Su questo computer non partirebbe in modo utilizzabile."
    );
  }

  async open(id: AppId): Promise<void> {
    if (!MIGRATED.has(id)) {
      this.patch(id, {
        status: "in-errore",
        error: `${APPS[id].name} non è ancora inclusa in questa versione della suite.`,
      });
      return;
    }

    const impossibile = this.motivoImpossibile(id);
    if (impossibile) {
      this.patch(id, { status: "in-errore", error: impossibile, rimedio: undefined });
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
        this.morto(id, motivo);
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
      this.morto(id, err instanceof Error ? err.message : String(err));
    }
  }

  async close(id: AppId): Promise<void> {
    FINESTRE[id]?.chiudi();
    // Il motore si spegne dopo la finestra e solo se non serve a un'altra app:
    // sono i secondi in cui si liberano gli 8 GB di VRAM.
    await servizi.ferma(id);
    gpu.release(id);
    if (MIGRATED.has(id)) {
      this.patch(id, { status: "pronta", error: undefined, rimedio: undefined });
    }
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

  /** Un controllo per volta: due insieme aprirebbero torch due volte per niente. */
  private controlloInCorso = false;

  /**
   * Un motore è morto: si scrive sulla scheda, e se parla di librerie la suite
   * va a **guardare l'ambiente da sola**.
   *
   * **Perché non basta aspettare che l'utente prema «Controlla».** Chi vede una
   * scheda che non si apre non pensa "sarà l'ambiente Python condiviso": pensa
   * che sia rotta quell'app, e le altre quattro che non si aprono gli sembrano
   * quattro guasti diversi. Il 19 agosto 2026 era un guasto solo, e per trovarlo
   * è servito aprire le librerie a mano da un terminale.
   *
   * Il controllo dura qualche decina di secondi e non tocca niente. Intanto la
   * scheda ha già il suo tasto: la proposta di riparare non aspetta il verdetto,
   * perché l'`ImportError` da solo basta a giustificarla. Quello che il
   * controllo aggiunge è il **rapporto** — quale libreria non si apre davvero —
   * che compare nella barra dell'ambiente in cima all'hub.
   */
  private morto(id: AppId, motivo: string): void {
    const ambiente = sembraProblemaDiAmbiente(motivo);

    this.patch(id, {
      status: "in-errore",
      error: motivo,
      rimedio: ambiente
        ? {
            tipo: "ripara-ambiente",
            testo: "Ripara l'ambiente",
            perche:
              "Il motore è morto parlando di librerie: l'ambiente Python condiviso " +
              "è rimasto a metà fra due versioni. Si reinstallano i pacchetti; " +
              "modelli, motori e risultati non si toccano.",
          }
        : undefined,
    });

    if (!ambiente || this.controlloInCorso) return;

    this.controlloInCorso = true;
    void runtime
      .controlla(requisitiDiQuestaMacchina(this.list()))
      .catch(() => {})
      .finally(() => {
        this.controlloInCorso = false;
      });
  }

  patch(id: AppId, partial: Partial<AppState>): void {
    const current = this.states.get(id)!;
    this.states.set(id, { ...current, ...partial });
    this.emit("changed", this.list());
  }
}

export const appManager = new AppManager();
