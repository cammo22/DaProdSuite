/**
 * Contratti fra shell (main) e interfacce (renderer).
 *
 * Il preload espone esattamente questa superficie e niente altro: il renderer
 * non vede mai `ipcRenderer` né Node. Se un dato non è qui, il renderer non può
 * ottenerlo.
 */

import type { AppDescriptor, AppId } from "./apps";
import type { Consegna, ElementoLibreria, FiltroLibreria, Intenzione } from "./libreria";

/* ------------------------------------------------------------------ stato app */

export type AppStatus =
  /**
   * Dichiarata nel catalogo ma non ancora portata dentro la suite. Meglio
   * mostrarla spenta che far credere che si apra.
   */
  | "non-inclusa"
  /** Manca qualcosa (runtime o modelli): va installata. */
  | "da-installare"
  /** Download o preparazione in corso. */
  | "in-preparazione"
  /** Pronta all'uso, servizio spento. */
  | "pronta"
  /** Servizio in avvio, /health non risponde ancora. */
  | "in-avvio"
  /** In esecuzione. */
  | "attiva"
  /** Il servizio è morto o non è ripartito. */
  | "in-errore";

export interface AppState {
  id: AppId;
  status: AppStatus;
  /** GB ancora da scaricare perché l'app sia utilizzabile. */
  missingGb: number;
  /**
   * Presente solo quando status è "in-preparazione". `done` e `total` sono
   * **byte**; `total` a zero vuol dire che non si sa quanto manca (l'ambiente
   * Python e le librerie del motore non dicono quanto peseranno), e l'hub in quel
   * caso mostra una barra che scorre invece di una ferma allo zero.
   */
  progress?: { done: number; total: number; label: string };
  /** Presente solo quando status è "in-errore". */
  error?: string;
}

/* ------------------------------------------------------------------- modelli */

/**
 * Cosa manca di un elenco di modelli, chiesto da dentro un'app aperta.
 *
 * Serve a chi lascia scegliere il modello nella propria interfaccia: prima di
 * offrirlo bisogna sapere se c'è, e se non c'è quanto costa averlo.
 */
export interface StatoModelli {
  /** Vero se non manca niente: né pesi né nodi del motore. */
  pronto: boolean;
  /** Byte ancora da scaricare. */
  bytesMancanti: number;
  /** Cosa manca, con l'etichetta del catalogo: è quella che si mostra. */
  mancanti: { id: string; label: string; bytes: number }[];
  /**
   * Nodi custom che il motore non ha ancora. Non pesano quasi niente ma vanno
   * detti: installarli fa ripartire il motore, e chi sta lavorando merita di
   * saperlo prima.
   */
  nodiMancanti: string[];
}

/** L'avanzamento di uno scaricamento chiesto da dentro un'app. */
export interface AvanzamentoModelli {
  attivo: boolean;
  /** Byte fatti e totali. `total` a zero vuol dire "non so quanto manca". */
  done: number;
  total: number;
  /** Cosa sta arrivando adesso, in italiano. */
  label: string;
  finito?: boolean;
  annullato?: boolean;
  errore?: string;
}

/* ------------------------------------------------------------------- runtime */

export interface RuntimeState {
  /** L'ambiente Python condiviso è installato e funzionante. */
  ready: boolean;
  pythonVersion?: string;
  torchVersion?: string;
  /** false se torch non vede la GPU: tutto girerebbe su CPU, cioè lentissimo. */
  cudaAvailable?: boolean;
  gpuName?: string;
  gpuTotalMb?: number;
  /** Presente solo durante l'installazione. Scaricare torch dura minuti. */
  installing?: { step: number; total: number; label: string };
  /** Ultime righe dell'installazione, per capire dove si è fermata. */
  log?: string[];
  error?: string;
}

/* -------------------------------------------------------------------- spazio */

export type CategoriaSpazio = "modelli" | "risultati" | "ambiente" | "motori" | "cache" | "log";

export interface VoceSpazio {
  /** `categoria` oppure `categoria/nome`. */
  id: string;
  categoria: CategoriaSpazio;
  etichetta: string;
  bytes: number;
  /** Cosa succede se la cancelli, detto prima di cancellarla. */
  conseguenza: string;
  cancellabile: boolean;
}

/** Quanto occupa una scheda, e se si puo' togliere. */
export interface SpazioApp {
  id: AppId;
  nome: string;
  accent: string;
  /** Byte dei suoi modelli presenti sul disco. */
  bytes: number;
  /** Di quei byte, quanti servono anche a un'altra scheda installata. */
  condivisi: number;
  installata: boolean;
}

export interface StatoSpazio {
  /** Una riga per scheda: e' cosi' che si ragiona, non per cartella. */
  app: SpazioApp[];
  /** Solo i modelli sopra 1 GB: sotto, l'elenco sarebbe rumore. */
  grandi: VoceSpazio[];
  /** Ambiente, motori, cache, log, risultati: totali, non dettagliati. */
  sistema: VoceSpazio[];
  occupato: number;
  libero: number;
}

export type CosaResettare = "impostazioni" | "modelli" | "tutto";

/** Chi sta occupando la GPU adesso. L'arbitro ne ammette uno solo. */
export interface GpuState {
  holder: AppId | null;
  usedMb?: number;
  totalMb?: number;
}

/* ----------------------------------------------------------------- aggiornam. */

export type UpdateStatus =
  | "inattivo"
  | "in-controllo"
  | "disponibile"
  | "in-scaricamento"
  | "pronto-da-installare"
  | "aggiornato"
  | "in-errore";

export interface UpdateState {
  status: UpdateStatus;
  /** Versione attualmente installata. */
  currentVersion: string;
  /** Versione trovata su GitHub, se più recente di quella installata. */
  availableVersion?: string;
  /** Percentuale 0-100 durante lo scaricamento. */
  percent?: number;
  notes?: string;
  error?: string;
}

/* ------------------------------------------------------------- superficie API */

/** Ciò che il preload espone come `window.daprod`. */
export interface SuiteApi {
  /**
   * Catalogo statico (nomi, descrizioni, colori). Passato dal preload invece che
   * importato: il renderer non carica pacchetti a runtime, riceve tutto da qui.
   */
  catalog: AppDescriptor[];

  suite: {
    version(): Promise<string>;
    /** Apre un percorso in Esplora risorse (cartella output, log). */
    revealPath(kind: "output" | "logs" | "models"): Promise<void>;
  };

  apps: {
    /** Stato corrente di tutte e sei. */
    list(): Promise<AppState[]>;
    /** Avvia il servizio se serve e apre la finestra dell'app. */
    open(id: AppId): Promise<void>;
    /** Chiude la finestra e spegne il servizio. */
    close(id: AppId): Promise<void>;
    /** Scarica ambiente, motore e modelli mancanti. Dura, e riprende dove era. */
    install(id: AppId): Promise<void>;
    /** Ferma l'installazione. Quello che è già arrivato resta sul disco. */
    annullaInstallazione(id: AppId): Promise<void>;
    onChanged(listener: (states: AppState[]) => void): Unsubscribe;
  };

  runtime: {
    state(): Promise<RuntimeState>;
    /** Crea l'ambiente Python condiviso. Lungo: emette avanzamento. */
    install(): Promise<void>;
    onChanged(listener: (state: RuntimeState) => void): Unsubscribe;
  };

  gpu: {
    state(): Promise<GpuState>;
    onChanged(listener: (state: GpuState) => void): Unsubscribe;
  };

  spazio: {
    stato(): Promise<StatoSpazio>;
    /** Toglie una scheda e i suoi modelli. Ritorna i byte liberati. */
    disinstalla(id: AppId): Promise<number>;
    /** Cancella una voce. Ritorna i byte liberati. */
    elimina(id: string): Promise<number>;
    reset(cosa: CosaResettare): Promise<number>;
  };

  update: {
    state(): Promise<UpdateState>;
    check(): Promise<void>;
    download(): Promise<void>;
    /** Riavvia la suite applicando l'aggiornamento scaricato. */
    installAndRestart(): Promise<void>;
    onChanged(listener: (state: UpdateState) => void): Unsubscribe;
  };
}

/**
 * Ciò che ogni finestra di app riceve, oltre al proprio ponte specifico.
 *
 * È la parte di suite che tutte le app condividono: la libreria dei risultati e
 * il modo di passarsi le cose. Esposta come `window.daprodSuite`.
 */
export interface ApiApp {
  /** Quale app è questa finestra. */
  io: AppId;

  libreria: {
    elenco(filtro?: FiltroLibreria): Promise<ElementoLibreria[]>;
    /** Apre il file in Esplora risorse. */
    mostraNellaCartella(id: string): Promise<boolean>;

    /**
     * Rinomina il file sul disco. Torna l'elemento aggiornato: l'id è il
     * percorso, quindi cambiando nome cambia anche quello.
     */
    rinomina(id: string, nome: string): Promise<ElementoLibreria | null>;

    /**
     * Mette la copertina accanto al file, o la toglie passando `null`.
     * L'immagine va passata come data URL già ritagliata quadrata.
     */
    copertina(id: string, dataUrl: string | null): Promise<boolean>;

    /** Scrive il `.json` di fianco: descrizione, testo, parametri, seed. */
    meta(id: string, meta: Record<string, unknown>): Promise<boolean>;

    /** Cancella il file, i suoi metadati e la sua copertina. Non si torna indietro. */
    elimina(id: string): Promise<boolean>;

    /** Notifica quando qualcuno produce o cancella un risultato. */
    onCambiata(listener: (elementi: ElementoLibreria[]) => void): Unsubscribe;
  };

  /**
   * I modelli, per le app che ne lasciano scegliere più d'uno.
   *
   * Sta qui e non nel ponte di una singola app perché il problema non è di
   * nessuna in particolare: DaProdFoto sceglie fra Anima e FLUX.2 Klein oggi,
   * Cinema e Dream sceglieranno domani, e il modo di chiedere "ce l'ho? me lo
   * scarichi?" deve essere lo stesso.
   */
  modelli: {
    /** Cosa manca, di questi id del catalogo, perché il modello sia usabile. */
    stato(ids: string[]): Promise<StatoModelli>;
    /**
     * Li scarica, e installa i nodi del motore che pretendono. Non aspetta: sono
     * GB, e l'avanzamento arriva da `onAvanzamento`.
     */
    scarica(ids: string[]): Promise<void>;
    /** Ferma lo scaricamento. Quello che è arrivato resta e riprende dopo. */
    annulla(): Promise<void>;
    onAvanzamento(listener: (stato: AvanzamentoModelli) => void): Unsubscribe;
  };

  /** Manda un elemento a un'altra app, aprendola se serve. */
  invia(destinazione: AppId, elementoId: string, intenzione: Intenzione): Promise<void>;

  /** Riceve gli elementi che le altre app mandano a questa. */
  onConsegna(listener: (consegna: Consegna) => void): Unsubscribe;

  /** Chiude questa finestra e torna all'hub. */
  chiudi(): Promise<void>;
}

export type Unsubscribe = () => void;

/**
 * Nomi dei canali IPC. Stringhe centralizzate così main e preload non possono
 * divergere per un errore di battitura.
 */
export const CHANNELS = {
  suiteVersion: "suite:version",
  suiteRevealPath: "suite:reveal-path",

  appsList: "apps:list",
  appsOpen: "apps:open",
  appsClose: "apps:close",
  appsInstall: "apps:install",
  appsAnnullaInstallazione: "apps:annulla-installazione",
  appsChanged: "apps:changed",

  runtimeState: "runtime:state",
  runtimeInstall: "runtime:install",
  runtimeChanged: "runtime:changed",

  gpuState: "gpu:state",
  gpuChanged: "gpu:changed",

  updateState: "update:state",
  updateCheck: "update:check",
  updateDownload: "update:download",
  updateInstall: "update:install",
  updateChanged: "update:changed",

  spazioStato: "spazio:stato",
  spazioDisinstalla: "spazio:disinstalla",
  spazioElimina: "spazio:elimina",
  spazioReset: "spazio:reset",

  modelliStato: "modelli:stato",
  modelliScarica: "modelli:scarica",
  modelliAnnulla: "modelli:annulla",
  modelliAvanzamento: "modelli:avanzamento",

  libreriaElenco: "libreria:elenco",
  libreriaMostra: "libreria:mostra",
  libreriaRinomina: "libreria:rinomina",
  libreriaCopertina: "libreria:copertina",
  libreriaMeta: "libreria:meta",
  libreriaElimina: "libreria:elimina",
  libreriaCambiata: "libreria:cambiata",
  appInvia: "app:invia",
  appConsegna: "app:consegna",
  appChiudi: "app:chiudi",
} as const;
