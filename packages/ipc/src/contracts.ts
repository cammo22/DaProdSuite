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
  /**
   * Cosa si può fare, quando la suite lo sa. Diventa un secondo bottone sulla
   * scheda, accanto a "Riprova".
   */
  rimedio?: Rimedio;
}

/**
 * Un guasto che la suite ha riconosciuto, con la sua via d'uscita.
 *
 * Nasce il 19 agosto 2026 dalla lezione di quella notte: l'errore vero c'era
 * già — in un file, a due passi — e all'utente restava una scheda che non si
 * apriva. Portare l'errore sulla scheda è stato il primo passo; questo è il
 * secondo, e dice **cosa fare** invece di descrivere cosa è successo.
 */
export interface Rimedio {
  /**
   * Che tasto mostrare. Per ora ce n'è uno solo, ed è quello che serve nel
   * novanta per cento dei casi: l'ambiente Python condiviso rimasto a metà.
   */
  tipo: "ripara-ambiente";
  /** Il testo del bottone, corto: ci sta accanto a "Riprova". */
  testo: string;
  /** Perché lo sto proponendo, in una riga. È il titolo del bottone. */
  perche: string;
}

/* -------------------------------------------------------------- impostazioni */

/**
 * Quanto spingere i motori.
 *
 * `normale` è quello che abbiamo provato: la suite avvia ComfyUI con i flag
 * misurati, memoria video governata a mano, nessuna ottimizzazione sperimentale.
 *
 * `spinta` accende le tre cose che il motore sa fare e noi non usiamo — memoria
 * video dinamica (che riporta i CUDA graph sulla parte lenta della musica),
 * `--fast`, e FlashAttention se è installata. Vanno provate, non date per buone:
 * il motore stesso le chiama "untested and potentially quality deteriorating",
 * e su 8 GB una cosa che va più veloce può anche non entrarci più.
 */
export type Velocita = "normale" | "spinta";

/**
 * Quanta memoria video lasciar prendere ai motori.
 *
 * **Non è la stessa cosa di `Velocita`**, ed è la ragione per cui sono due
 * scelte e non una: la velocità accende ottimizzazioni di calcolo, questa
 * decide *quanto spazio* il motore si tiene. Su una scheda da 8 GB è la scelta
 * che decide se una cosa entra o non entra, e cambiarla è l'unica manovra che
 * salva una generazione che va in errore di memoria.
 *
 * L'idea viene dal Lower VRAM / Lower RAM di WanGP — il metodo, non il codice:
 * la loro licenza non è libera, e quello che si prende è pubblico
 * (vedi VELOCITA-MUSICA.md § 2).
 */
export type ProfiloMemoria =
  /**
   * Il motore tiene in memoria video il meno possibile e sposta il resto nella
   * RAM. Va più piano, ma **entra**: è la scelta di chi ha una scheda piccola,
   * o di chi vuole tenere aperto dell'altro mentre genera — LM Studio, un
   * gioco, un browser con quaranta schede.
   */
  | "leggero"
  /** Come abbiamo generato finora, ed è il metro di paragone. */
  | "bilanciato"
  /**
   * Tutto quello che ci sta resta in memoria video fra una generazione e
   * l'altra: la seconda immagine non ricarica niente. Il più veloce, e il primo
   * a finire lo spazio se apri qualcos'altro.
   */
  | "qualita";

export interface Impostazioni {
  velocita: Velocita;
  /** Quanta memoria video lasciar prendere ai motori. Vale dal prossimo avvio. */
  profilo: ProfiloMemoria;
  /**
   * La procedura guidata del primo avvio è già stata fatta.
   *
   * Si segna quando l'utente la chiude, in qualunque modo: chi la salta ha
   * deciso, e riproporgliela a ogni avvio vorrebbe dire non avergli creduto.
   */
  guidaFatta: boolean;
}

/* ----------------------------------------------------------------------- llm */

/** Un modello di LM Studio, e se in questo momento occupa memoria. */
export interface ModelloLlm {
  id: string;
  /** **Caricato**, cioè in RAM o VRAM adesso. Installato non basta. */
  caricato: boolean;
  /** Il contesto massimo che regge, in token. */
  contestoMax: number;
}

/** Se c'è qualcuno che sa scrivere, chi, e chi sta occupando la memoria. */
export interface StatoLlm {
  /** LM Studio risponde sul suo server locale. */
  acceso: boolean;
  /** I modelli utilizzabili. Vuoto significa "acceso ma senza modelli". */
  modelli: string[];
  /** Tutti, con il loro stato: è quello che l'hub mostra. */
  disponibili: ModelloLlm[];
  /** Quelli che in questo momento tengono occupata la memoria. */
  caricati?: string[];
  /** Perché non si può usare, detto all'utente così com'è. */
  motivo?: string;
}

export interface EsitoLlm {
  ok: boolean;
  testo: string;
  modello?: string;
  motivo?: string;
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

/**
 * Il rapporto del controllo dell'ambiente: una voce per ogni cosa guardata.
 *
 * Nasce il 19 agosto 2026, accanto a «Ripara»: riparare senza sapere se serviva
 * sono minuti spesi al buio, e soprattutto non risponde alla domanda vera —
 * quando un'app non si apre, e' l'ambiente o e' quell'app? Il rapporto risponde.
 */
export type EsitoControllo = "ok" | "attenzione" | "guasto";

export interface VoceControllo {
  id: string;
  /** Cosa si e' guardato, detto all'utente. */
  titolo: string;
  esito: EsitoControllo;
  /** Com'e' andata, in una riga che si legge senza sapere cos'e' un pacchetto. */
  dettaglio: string;
}

export interface RapportoAmbiente {
  /** Il peggiore fra gli esiti: e' quello che decide il colore della barra. */
  esito: EsitoControllo;
  voci: VoceControllo[];
  /** Quando e' stato fatto, per poter dire "controllato alle 21:14". */
  quando: number;
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

/**
 * Una voce del catalogo dei modelli, vista dal pannello dell'hub.
 *
 * Non e' `manifest/models.json` cosi' com'e': la domanda a cui questa risponde
 * non e' "com'e' fatto" ma "ce l'ho, quanto pesa, a quali schede serve".
 */
export interface VoceModello {
  /** Id nel manifesto: e' quello che si passa per scaricarlo. */
  id: string;
  label: string;
  /** Sul disco, intero e della dimensione giusta. */
  presente: boolean;
  bytes: number;
  /** Le schede che lo dichiarano fra i propri modelli. */
  usatoDa: AppId[];
  /**
   * true se nessuna scheda lo pretende per partire: e' qualita' in piu' in
   * cambio di GB (i due FLUX, il SoulX Pro).
   */
  extra: boolean;
  /** Gestito da qualcun altro — LM Studio — e quindi non scaricabile da qui. */
  esterno: boolean;
}

/** Un file di log, per l'elenco. Le righe si chiedono a parte: pesano. */
export interface VoceLog {
  /** Nome del file senza `.log`: e' anche quello che si passa per leggerlo. */
  nome: string;
  bytes: number;
  /** Ultima scrittura, in millisecondi. */
  quando: number;
}

export type CosaResettare = "impostazioni" | "modelli" | "tutto";

/**
 * Cosa può fare questo computer, detto alle app.
 *
 * **Perché serve dentro le finestre e non solo nell'hub.** Su un PC senza
 * scheda NVIDIA la suite parte lo stesso — provato il 18 agosto 2026 — ma non
 * tutto quello che c'è dentro ha senso: un brano di DaProdMusica in CPU dura
 * ore, e FLUX.2 Klein non è nemmeno immaginabile. Finora l'unico che lo sapeva
 * era il motore, che se lo scriveva in un file: chi apriva l'app vedeva solo
 * una barra che non finiva mai.
 *
 * Con questo, ogni app può spegnere quello che non regge **prima** di farlo
 * partire, e dirlo invece di lasciarlo indovinare.
 */
export interface StatoMacchina {
  /** C'è una scheda video utilizzabile: torch la vede e ci può lavorare. */
  gpu: boolean;
  /** Come si chiama, per poterla nominare all'utente. */
  nomeGpu?: string;
  /** Quanta memoria ha, in MB: è il numero che decide cosa ci sta dentro. */
  vramMb?: number;
}

/**
 * Un modello che in questo momento occupa memoria video.
 *
 * Non è un modello del catalogo — quelli sono file sul disco — ma un pezzo di
 * modello **caricato**: `MiniMaxMusic3TEModel`, `Anima`, il VAE. Sono i nomi
 * che usa il motore, e si mostrano tradotti dove si può.
 */
export interface ModelloInVram {
  /** Il nome interno del motore: è anche la chiave per scaricarlo. */
  nome: string;
  /** Quanti MB si prende adesso. */
  vramMb: number;
  /** Quanti ne prenderebbe tutto intero, se non fosse in parte nella RAM. */
  totaleMb?: number;
  /** `cuda:0`, `cpu`: dove sta davvero. */
  dispositivo?: string;
  /**
   * `carico` mentre lo sta ancora tirando su, `pronto` quando lavora.
   *
   * Lo dice solo il traduttore, che è nostro e che ci mette qualche secondo a
   * leggere i suoi 330 MB: gli altri li carica il motore dentro una
   * generazione, e quando compaiono nell'elenco ci sono già.
   */
  stato?: "carico" | "pronto";
}

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
    /**
     * Risolve quando il primo giro di controlli è finito: ambiente Python
     * sondato, modelli presenti verificati sul disco per ogni scheda.
     *
     * L'hub la aspetta **prima** di leggere qualunque stato. Senza, la
     * finestra è già in ascolto mentre quei controlli girano ancora — la
     * sonda di Python non è istantanea — e la prima occhiata prendeva sempre
     * i valori di partenza, corretti un istante dopo sotto gli occhi.
     */
    avvioPronto(): Promise<void>;
  };

  /**
   * I risultati di **tutte** le app insieme.
   *
   * E' la stessa libreria condivisa che vedono le app, senza filtro per app:
   * l'hub e' l'unico posto da cui ha senso guardarla intera.
   */
  risultati: {
    elenco(filtro?: FiltroLibreria): Promise<ElementoLibreria[]>;
    mostraNellaCartella(id: string): Promise<boolean>;
    /** Ne salva una copia dove dice l'utente. Torna il percorso, o `null` se ha annullato. */
    salva(id: string): Promise<string | null>;
    elimina(id: string): Promise<boolean>;
    onCambiata(listener: (elementi: ElementoLibreria[]) => void): Unsubscribe;
  };

  /** Cosa c'e' sul disco, quanto pesa, a chi serve, e cosa manca ancora. */
  modelli: {
    catalogo(): Promise<VoceModello[]>;
    /**
     * Scarica dei modelli, a nome della scheda che li usa.
     *
     * La scheda serve davvero: e' il suo motore che va riavviato se il modello
     * si porta dietro un nodo custom nuovo. L'avanzamento arriva a tutte le
     * finestre, hub compreso.
     */
    scarica(id: AppId, ids: string[]): Promise<void>;
    onAvanzamento(listener: (avanzamento: AvanzamentoModelli) => void): Unsubscribe;
  };

  /** Le ultime righe dei motori, lette senza uscire dalla suite. */
  log: {
    elenco(): Promise<VoceLog[]>;
    /** Le ultime `righe` righe di quel file. */
    leggi(nome: string, righe?: number): Promise<string>;
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
    /**
     * Le installa **una dopo l'altra**, nell'ordine dato.
     *
     * In parallelo si contenderebbero l'ambiente Python e la linea: quattro
     * scaricamenti insieme non vanno più veloci di uno, e a interruzione di rete
     * lasciano quattro file a metà.
     */
    installaTutte(ids: AppId[]): Promise<void>;
    /** Ferma l'installazione. Quello che è già arrivato resta sul disco. */
    annullaInstallazione(id: AppId): Promise<void>;
    onChanged(listener: (states: AppState[]) => void): Unsubscribe;
  };

  runtime: {
    state(): Promise<RuntimeState>;
    /** Crea l'ambiente Python condiviso. Lungo: emette avanzamento. */
    install(): Promise<void>;
    /**
     * Reinstalla i pacchetti dell'ambiente senza cancellarlo.
     *
     * Serve quando un motore muore con un `ImportError`: vuol dire che
     * l'ambiente è rimasto a metà fra due versioni, di solito dopo
     * un'installazione interrotta. Modelli, motori e risultati non si toccano —
     * è la via di mezzo che mancava fra "non si può fare niente" e "Reset ·
     * Tutto", che porta via anche i 35 GB di pesi.
     */
    ripara(): Promise<void>;
    /**
     * Guarda l'ambiente e torna il rapporto, senza toccare niente.
     *
     * Dura qualche decina di secondi: apre davvero torch e le librerie
     * condivise, che e' l'unico modo di accorgersi dei file rimasti a meta' fra
     * due versioni — il guasto in cui i numeri sono tutti giusti.
     */
    controlla(): Promise<RapportoAmbiente>;
    onChanged(listener: (state: RuntimeState) => void): Unsubscribe;
  };

  impostazioni: {
    leggi(): Promise<Impostazioni>;
    /** Cambia la velocità dei motori. Vale dal prossimo avvio del motore. */
    velocita(scelta: Velocita): Promise<Impostazioni>;
    /**
     * Cambia quanta memoria video lasciar prendere ai motori.
     *
     * Come la velocità, vale **dal prossimo avvio del motore**: i flag si
     * passano alla riga di comando, e un motore acceso non se li rilegge.
     */
    profilo(scelta: ProfiloMemoria): Promise<Impostazioni>;
    /** Segna che la procedura guidata è stata vista: non si ripresenta più. */
    guidaFatta(): Promise<Impostazioni>;
  };

  gpu: {
    state(): Promise<GpuState>;
    onChanged(listener: (state: GpuState) => void): Unsubscribe;
  };

  /**
   * Chi occupa la memoria video adesso, e come liberarla.
   *
   * **Perché sta nell'hub e non in un'app.** La GPU è una sola: un modello
   * lasciato in memoria da DaProdFoto è memoria che manca a DaProdMusica.
   * Nasce come una fila di quadratini nella barra di Musica; qui è di tutti,
   * come deve essere una cosa che riguarda tutti.
   */
  vram: {
    /** Vuota se non c'è nessun motore acceso: allora la memoria è libera davvero. */
    elenco(): Promise<ModelloInVram[]>;
    /** Toglie dalla memoria quel modello. Il motore resta acceso. */
    scarica(nome: string): Promise<void>;
    /** Toglie tutto: è la manovra da fare prima di un lavoro che vuole spazio. */
    svuota(): Promise<void>;
  };

  spazio: {
    stato(): Promise<StatoSpazio>;
    /** Toglie una scheda e i suoi modelli. Ritorna i byte liberati. */
    disinstalla(id: AppId): Promise<number>;
    /** Cancella una voce. Ritorna i byte liberati. */
    elimina(id: string): Promise<number>;
    reset(cosa: CosaResettare): Promise<number>;
  };

  /**
   * Il modello che scrive, visto dall'hub.
   *
   * Qui si carica e si scarica **a mano e in fretta**, perché un 27B in memoria
   * sono quattro GB che non stanno al modello di immagini. La suite scarica da
   * sé quello che ha caricato lei, quando ha finito e quando si chiude: questo
   * pannello serve a vederlo e a forzarlo.
   */
  llm: {
    stato(): Promise<StatoLlm>;
    /** Lo carica con il contesto scelto (64K, 128K, 256K), GPU al massimo. */
    carica(id: string, contesto: number): Promise<string | null>;
    /** Lo toglie dalla memoria adesso. */
    scarica(id: string): Promise<string | null>;
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
     * Ne salva una copia dove dice l'utente, con la finestra di Windows.
     *
     * "Nella cartella" apre il posto dove la suite tiene i risultati, che sta
     * dentro `%LOCALAPPDATA%`: serve a capire dove sono finiti i file, non a
     * portarli via. Questo e' il gesto normale — scegli tu cartella e nome, e
     * l'originale resta dov'e'.
     *
     * Torna il percorso scelto, o `null` se hai annullato.
     */
    salva(id: string): Promise<string | null>;

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

  /**
   * Il modello che scrive, per tutte le app.
   *
   * A DaProdMusica finisce un testo abbozzato, a DaProdFoto trasforma due parole
   * in una descrizione che il modello di immagini capisce, a DaProdCinema
   * spezzerà un'idea in scene. È **uno solo** per la suite: lo tiene acceso LM
   * Studio, e ogni app gli chiede la cosa che sa chiedere.
   */
  llm: {
    /** Se c'è qualcuno che risponde, e chi. Non solleva mai. */
    stato(): Promise<StatoLlm>;
    /**
     * Una domanda, una risposta.
     *
     * `schema` è un JSON Schema, e serve quando la risposta deve riempire dei
     * campi invece di essere letta da una persona: con quello il modello non
     * *può* rispondere di fantasia, e non c'è niente da interpretare.
     */
    chiedi(domanda: {
      sistema: string;
      utente: string;
      schema?: Record<string, unknown>;
      nomeSchema?: string;
      /**
       * Quale modello, se l'app ne ha uno scelto.
       *
       * E' quello del selettore che le app mostrano in cima: senza, la suite
       * prendeva sempre il consigliato — cioe' Bonsai 27B, che su questa
       * macchina ragiona per minuti — e il menu che l'utente aveva appena usato
       * non contava niente. Un id sconosciuto viene ignorato.
       */
      modello?: string;
      /**
       * Se lasciarlo ragionare prima di rispondere. Acceso di suo.
       *
       * Per una canzone il ragionamento vale il minuto che costa; per allargare
       * la descrizione di un'immagine e' un minuto buttato.
       */
      pensa?: boolean;
    }): Promise<EsitoLlm>;

    /** Lo carica con il contesto scelto (64K, 128K, 256K), GPU al massimo. */
    carica(id: string, contesto: number): Promise<string | null>;
    /** Lo toglie dalla memoria adesso. */
    scarica(id: string): Promise<string | null>;

    /**
     * Toglie subito dalla memoria quello che LM Studio ha caricato.
     *
     * **Da chiamare prima di ogni generazione pesante.** Scrivere il testo con
     * Bonsai e premere Genera capita nel giro di pochi secondi: senza questo, il
     * modello musicale trova quattro GB e mezzo già occupati.
     */
    liberaMemoria(): Promise<void>;
  };

  /**
   * Che macchina è questa: c'è una scheda video, come si chiama, quanta memoria.
   *
   * Da chiedere **una volta all'avvio della pagina**, e da usare per spegnere
   * quello che su questo computer non ha senso offrire. Non cambia mentre l'app
   * è aperta: una scheda video non compare a metà sessione.
   */
  macchina(): Promise<StatoMacchina>;

  /** Manda un elemento a un'altra app, aprendola se serve. */
  invia(destinazione: AppId, elementoId: string, intenzione: Intenzione): Promise<void>;

  /** Riceve gli elementi che le altre app mandano a questa. */
  onConsegna(listener: (consegna: Consegna) => void): Unsubscribe;

  /**
   * Accende un motore che quest'app usa **solo a volte**, e ne torna
   * l'indirizzo.
   *
   * Serve a chi ha una strada alternativa che gira su un motore diverso dal
   * proprio: DaProdDream fa il tempo reale col suo, e per sognare con Anima
   * chiede ComfyUI. Quale motore un'app possa chiedere sta nel catalogo
   * (`motoriInPiu`), non nella pagina: da qui arriva solo il nome.
   *
   * Può metterci un minuto la prima volta, e si spegne da sé quando l'app
   * si chiude.
   */
  motoreInPiu(nome: string): Promise<string>;

  /**
   * Le righe dei motori, per il terminale che la shell monta in ogni finestra.
   *
   * Le stesse del pannello Log dell'hub: un motore solo scrive un log solo, e
   * guardarlo da dentro l'app o da fuori non cambia cosa c'e' scritto.
   */
  log: {
    elenco(): Promise<VoceLog[]>;
    leggi(nome: string, righe?: number): Promise<string>;
  };

  /**
   * Apre un'altra app della suite, senza passare dall'hub.
   *
   * **Perché serve.** L'hub è una finestra come le altre: mentre lavori in
   * DaPMusica sta dietro, e se l'hai chiusa resta solo l'area di notifica. Da
   * qui invece un'app ne apre un'altra dov'è già la mano di chi la usa.
   *
   * Il caso vero è il Visualizer, che non è un motore pesante e può stare
   * acceso insieme a chiunque: si ascolta un brano guardandolo mentre l'app che
   * l'ha fatto continua a generare. Fra due app pesanti invece l'arbitro della
   * GPU fa il suo mestiere e la prima si chiude — che è giusto, su otto GB.
   *
   * Se l'app è già aperta la porta davanti invece di aprirne una seconda.
   */
  apriApp(destinazione: AppId): Promise<void>;

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
  suiteAvvioPronto: "suite:avvio-pronto",

  appsList: "apps:list",
  appsOpen: "apps:open",
  appsClose: "apps:close",
  appsInstall: "apps:install",
  appsInstallaTutte: "apps:installa-tutte",
  appsAnnullaInstallazione: "apps:annulla-installazione",
  appsChanged: "apps:changed",

  impostazioniLeggi: "impostazioni:leggi",
  impostazioniVelocita: "impostazioni:velocita",
  impostazioniProfilo: "impostazioni:profilo",
  impostazioniGuida: "impostazioni:guida-fatta",

  runtimeState: "runtime:state",
  runtimeInstall: "runtime:install",
  runtimeRipara: "runtime:ripara",
  runtimeControlla: "runtime:controlla",
  runtimeChanged: "runtime:changed",

  gpuState: "gpu:state",
  vramElenco: "vram:elenco",
  vramScarica: "vram:scarica",
  vramSvuota: "vram:svuota",
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

  modelliCatalogo: "modelli:catalogo",
  modelliStato: "modelli:stato",
  modelliScarica: "modelli:scarica",
  modelliAnnulla: "modelli:annulla",
  modelliAvanzamento: "modelli:avanzamento",

  llmStato: "llm:stato",
  llmChiedi: "llm:chiedi",
  llmCarica: "llm:carica",
  llmScarica: "llm:scarica",
  llmLibera: "llm:libera",

  logElenco: "log:elenco",
  logLeggi: "log:leggi",

  libreriaElenco: "libreria:elenco",
  libreriaMostra: "libreria:mostra",
  libreriaRinomina: "libreria:rinomina",
  libreriaCopertina: "libreria:copertina",
  libreriaMeta: "libreria:meta",
  libreriaElimina: "libreria:elimina",
  libreriaSalva: "libreria:salva",
  libreriaCambiata: "libreria:cambiata",
  appInvia: "app:invia",
  appConsegna: "app:consegna",
  appMotoreInPiu: "app:motore-in-piu",
  appMacchina: "app:macchina",
  appApri: "app:apri",
  appChiudi: "app:chiudi",
} as const;
