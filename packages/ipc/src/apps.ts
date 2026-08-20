/**
 * Catalogo delle app della suite.
 *
 * È l'unico posto in cui si dichiara cosa contiene DaProdSuite: lo shell lo usa
 * per sapere cosa avviare, l'hub per disegnare le schede, il wizard per calcolare
 * quanti GB scaricare. Aggiungere un'app significa aggiungere una voce qui.
 */

/** Come vive l'app dentro lo shell. */
export type AppKind =
  /** Solo interfaccia: nessun processo Python dietro (es. Visualizer). */
  | "renderer"
  /** Interfaccia + un servizio Python sorvegliato dallo shell. */
  | "service";

export interface AppService {
  /** Cartella sotto services/ e nome usato nei log. */
  id: string;
  /**
   * Porta di ascolto del servizio. Fissa e non configurabile dall'utente: lo
   * shell è l'unico a parlarci e resta tutto su 127.0.0.1.
   */
  port: number;
  /** Modulo Python da avviare, relativo alla cartella del servizio. */
  entry: string;
  /**
   * Cartella del motore di terze parti sotto `engines/`, per chi ne guida uno.
   * ComfyUI non sta nel repo (è GPL-3.0, la suite è MIT): viene scaricato lì, e
   * il codice nostro in `services/` si limita ad avviarlo.
   */
  engine?: string;
  /**
   * Quanto può metterci il primo avvio prima che /health risponda. I motori che
   * caricano pesi da disco sono lenti la prima volta.
   */
  healthTimeoutMs: number;
}

export interface AppDescriptor {
  id: AppId;
  /** Nome mostrato all'utente. */
  name: string;
  /** Una riga che spiega a cosa serve. */
  tagline: string;
  kind: AppKind;
  /** Colore d'accento della scheda nell'hub. */
  accent: string;
  service?: AppService;
  /**
   * Altri motori che quest'app sa usare, ma **solo quando servono davvero**.
   *
   * Non partono all'apertura come `service`: la finestra li chiede quando
   * l'utente sceglie qualcosa che li richiede. DaProdDream ne è il primo caso —
   * il suo motore fa il tempo reale con SD-Turbo, e per sognare con Anima
   * chiede ComfyUI, che è già quello di Musica e Foto. Accenderlo sempre
   * costerebbe un minuto d'attesa e qualche GB di VRAM a chi non lo usa.
   */
  motoriInPiu?: AppService[];
  /** Id dei modelli richiesti, come in manifest/models.json. */
  models: string[];
  /**
   * Modelli scaricabili a richiesta: qualità migliore in cambio di GB. Non
   * entrano nel conto del primo avvio, così installare un'app non costa mai più
   * del necessario per usarla.
   */
  extraModels?: string[];
  /**
   * true se occupa seriamente la VRAM. Con 8 GB ne può girare uno solo alla
   * volta: l'arbitro dello shell spegne il precedente prima di avviare il nuovo.
   */
  gpuHeavy: boolean;
  /**
   * Quanto le serve una scheda video **vera**, cioè una NVIDIA che torch veda.
   *
   * Non è la stessa cosa di `gpuHeavy`, che dice quanta VRAM occupa quando c'è:
   * questo dice cosa succede quando **non** c'è. Nasce dalla prova del 18
   * agosto 2026 su un computer solo-CPU, dove la suite partiva ma le schede non
   * dicevano niente — e lasciavano scaricare otto GB di pesi per un'app che su
   * quella macchina non sarebbe partita comunque.
   */
  schedaVideo: RichiestaSchedaVideo;
}

export type RichiestaSchedaVideo =
  /**
   * Senza, non si apre proprio: l'hub spegne il tasto e scrive il perché
   * **prima** di far scaricare i GB. Sono le app che fanno tempo reale o video
   * — Dream, IoDigitale, Cinema — dove la CPU non è "più lenta", è un'altra
   * cosa: trenta secondi per fotogramma non sono una webcam.
   */
  | "obbligatoria"
  /**
   * Si apre e funziona, ma i tempi cambiano di ordine di grandezza: un brano o
   * un'immagine passano da secondi a ore. La scheda lo dice, e l'app lo ripete
   * dove si preme Genera. Chi vuole provare lo stesso, può.
   */
  | "molto-meglio"
  /** Gira benissimo su qualunque computer: il Visualizer e il Companion. */
  | "non-serve";

export const APP_IDS = [
  "visualizer",
  "musica",
  "foto",
  "cinema",
  "dream",
  "companion",
  "iodigitale",
] as const;

export type AppId = (typeof APP_IDS)[number];

export const APPS: Record<AppId, AppDescriptor> = {
  visualizer: {
    id: "visualizer",
    name: "DaProdVisualizer",
    tagline: "La tua musica diventa visualizzazioni reattive.",
    kind: "renderer",
    accent: "#7c5cff",
    models: [],
    gpuHeavy: false,
    // WebGL, non torch: gira sulla grafica integrata di qualunque portatile.
    schedaVideo: "non-serve",
  },
  musica: {
    id: "musica",
    name: "DaProdMusica",
    tagline: "Canzoni complete, cantate, da una descrizione e un testo.",
    kind: "service",
    accent: "#ff5c8a",
    service: {
      id: "comfy",
      port: 8188,
      entry: "avvio.py",
      engine: "ComfyUI",
      // Il primo avvio carica MiniMax Music 3 in VRAM: può volerci un minuto abbondante.
      healthTimeoutMs: 180_000,
    },
    models: ["minimax-music3-dit", "minimax-music3-text-encoder", "minimax-music3-vae"],
    /**
     * Quello che la scheda sa usare ma non pretende per partire.
     *
     * Le copertine e la scheda Immagini girano su Anima, gli stessi tre file di
     * DaProdFoto: una canzone si fa lo stesso senza, e chiedere 5,6 GB in più a
     * chi vuole solo la musica sarebbe di troppo. La pagina controlla e li offre
     * nel momento in cui servono davvero.
     *
     * Poi ci sono gli altri modelli musicali del menu — il DiT a 8 bit di
     * MiniMax e i due ACE-Step 1.5 con i loro encoder. Si scaricano dal menu
     * stesso, dentro l'app, e stanno elencati qui perché l'hub sappia a chi
     * servono: senza, nel pannello dei modelli comparirebbero come pesi di
     * nessuno, e sono venticinque GB di "pesi di nessuno".
     */
    extraModels: [
      "anima-turbo",
      "qwen3-06b-base",
      "qwen-image-vae",
      "minimax-music3-dit-int8",
      "acestep15-turbo",
      "acestep15-xl-turbo",
      "acestep15-qwen-06b",
      "acestep15-qwen-4b",
      "acestep15-vae",
    ],
    gpuHeavy: true,
    // In CPU un brano si fa, ma si misura in ore invece che in minuti: è una
    // cosa da sapere prima di premere Genera, non dopo.
    schedaVideo: "molto-meglio",
  },
  foto: {
    id: "foto",
    name: "DaProdFoto",
    tagline: "Immagini da prompt e ritocco con maschera, in locale.",
    kind: "service",
    // Gira sullo stesso ComfyUI di Musica: un solo motore, due app.
    service: {
      id: "comfy",
      port: 8188,
      entry: "avvio.py",
      engine: "ComfyUI",
      healthTimeoutMs: 180_000,
    },
    accent: "#ffa63d",
    // Anima come base: 5,6 GB, veloce, e in Musica fa già le copertine. FLUX.2
    // Klein dà di più ma pesa 12,4 GB ed è al limite degli 8 GB di VRAM, quindi
    // è una scelta, non un obbligo.
    models: ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"],
    // I due FLUX.2 Klein: il 4B e il 9B. Dividono solo il VAE — ognuno vuole il
    // **suo** text encoder, Qwen3-4B contro Qwen3-8B, e scambiarli non dà
    // un'immagine brutta: dà un errore di moltiplicazione fra matrici.
    extraModels: [
      "flux2-klein-4b-q5km",
      "flux2-4b-text-encoder",
      "flux2-klein-q4ks",
      "flux2-text-encoder",
      "flux2-vae",
    ],
    gpuHeavy: true,
    // Anima in CPU è lentissima ma arriva in fondo. FLUX.2 Klein no, ed è
    // l'app stessa a spegnerlo nel menu dei modelli quando la scheda non c'è.
    schedaVideo: "molto-meglio",
  },
  cinema: {
    id: "cinema",
    name: "DaProdCinema",
    tagline: "Da una canzone al suo video musicale, scena per scena.",
    kind: "service",
    accent: "#c05cff",
    service: {
      id: "comfy",
      port: 8188,
      entry: "avvio.py",
      engine: "ComfyUI",
      healthTimeoutMs: 180_000,
    },
    /**
     * Wan 2.2 TI2V 5B: 18,1 GB fra modello, text encoder e VAE.
     *
     * La roadmap aveva scelto MiniMax H3 e LTX 2.5, e i loro nodi ComfyUI ce li
     * ha davvero, nativi. Poi si sono guardati i pesi: LTX 2.3 è un 22B che in
     * fp8 fa 23 GB, più un Gemma 3 da 12B per leggere il prompt. Su una scheda
     * da 8 GB non è «lento», è un'altra categoria di macchina.
     *
     * Il 5B è l'unico della famiglia che qui gira, e fa testo→video **e**
     * immagine→video con lo stesso file — che è la proprietà su cui sta in piedi
     * la continuità fra un'inquadratura e la successiva. Gli altri due restano
     * in roadmap: nel menu ci va quello che è stato provato.
     */
    models: ["wan22-ti2v-5b", "wan22-text-encoder", "wan22-vae"],
    gpuHeavy: true,
    // Video: un fotogramma per volta, e i fotogrammi sono centinaia.
    schedaVideo: "obbligatoria",
  },
  dream: {
    id: "dream",
    name: "DaProdDream",
    tagline: "Webcam, video o schermo trasformati in tempo reale.",
    kind: "service",
    accent: "#3ddbff",
    service: {
      id: "dream",
      port: 8770,
      entry: "avvio.py",
      // Carica SD-Turbo prima di dire che è pronto: sul primo avvio, con il
      // modello ancora fuori dalla cache del sistema, ci vuole più di un minuto.
      healthTimeoutMs: 180_000,
    },
    // Il secondo modo di sognare: Anima, che gira su ComfyUI come in Foto e
    // Musica. Non è il tempo reale — è un'immagine per volta, che si rifà
    // mentre scrivi — e per questo il motore si accende solo se lo scegli.
    motoriInPiu: [
      {
        id: "comfy",
        port: 8188,
        entry: "avvio.py",
        engine: "ComfyUI",
        healthTimeoutMs: 180_000,
      },
    ],
    // Tempo reale: senza scheda video non è "più lento", è un'altra cosa.
    // Trenta secondi per fotogramma non sono una webcam trasformata.
    schedaVideo: "obbligatoria",
    models: ["sd-turbo", "taesd"],
    // Gli stessi tre file che usano Foto e Musica: chi ha già una di quelle due
    // installate non scarica niente.
    extraModels: ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"],
    gpuHeavy: true,
  },
  companion: {
    id: "companion",
    name: "DaProdCompanion",
    tagline: "Un compagno sul desktop che ti ascolta e si ricorda di te.",
    kind: "service",
    accent: "#5cff9d",
    service: {
      // La cartella si chiama come l'app, come per tutti gli altri motori:
      // `servizi.ts` cerca in `services/<id>`, e chiamarla `brain` — il nome
      // che aveva nel progetto d'origine — voleva dire una regola diversa per
      // una scheda sola.
      id: "companion",
      port: 8760,
      entry: "avvio.py",
      // Non carica nessun modello: apre un database e si collega a LM Studio.
      // Un minuto è già larghissimo.
      healthTimeoutMs: 60_000,
    },
    // Conversazione e memoria passano da LM Studio, che espone un'API
    // compatibile OpenAI su 127.0.0.1:1234.
    //
    // **`models` è vuoto di proposito.** I pesi che servono al Companion li
    // scarica e li tiene LM Studio, che è un programma a parte: metterli qui
    // vorrebbe dire che la suite li conta nei GB da scaricare, li cerca nella
    // propria cartella e non li trova mai — cioè una scheda che resta «da
    // installare» per sempre. Quello che manca lo dice il Companion stesso,
    // aprendosi.
    models: [],
    gpuHeavy: false,
    // A pensare ci mette LM Studio, che è un programma a parte e si arrangia
    // con quello che trova: il Companion in sé non tocca la scheda video.
    schedaVideo: "non-serve",
  },
  iodigitale: {
    id: "iodigitale",
    name: "DaProdIoDigitale",
    tagline: "Il tuo avatar parlante: gli scrivi, ti risponde in video.",
    kind: "service",
    accent: "#ff7c5c",
    service: {
      id: "iodigitale",
      port: 7860,
      // `avvio.py` e non `web_server.py`: il server di LeapTalk non aveva
      // /health né /shutdown, e i percorsi li leggeva da un `.env`. Quel file
      // traduce le variabili della suite e aggiunge le due rotte.
      entry: "avvio.py",
      // SoulX-FlashHead carica ~7 GB di pesi: il primo avvio è lento.
      healthTimeoutMs: 240_000,
    },
    // Di serie solo il modello Lite: il repo SoulX ne contiene due completi
    // (Lite e Pro) e scaricarli entrambi vuol dire 5,6 GB buttati.
    //
    // La catena è lunga perché l'avatar fa quattro mestieri: capisce quello che
    // dici (Whisper), pensa la risposta (LM Studio), la dice (la voce Piper) e
    // muove la faccia (SoulX + LeapTalk + wav2vec2).
    models: [
      "soulx-flashhead",
      "leaptalk-weights",
      "wav2vec2-base-960h",
      "piper-paola",
      "piper-paola-config",
      "faster-whisper-small",
    ],
    extraModels: ["soulx-flashhead-pro"],
    gpuHeavy: true,
    // Genera video di una faccia che parla, in tempo reale sul turno di
    // conversazione: senza scheda video non c'è nessuna conversazione.
    schedaVideo: "obbligatoria",
  },
};

export const APP_LIST: AppDescriptor[] = APP_IDS.map((id) => APPS[id]);

/**
 * Modelli che non sono di nessuna app in particolare e servono a tutte.
 *
 * Nella suite **niente è di una scheda sola**: i modelli stanno in un'unica
 * cartella e qualunque app può usare quello che c'è. Questo elenco è il caso
 * limite di quella regola — roba che non ha senso legare a un'app, e che si
 * installa insieme alla prima scheda che si installa.
 *
 * Il traduttore sta qui perché il problema che risolve non è di DaProdFoto: è di
 * chiunque scriva una descrizione a un modello addestrato in inglese, e quindi
 * anche di Musica, Cinema e Dream quando toccherà a loro.
 *
 * Le app senza modelli (il Visualizer) non lo prendono: non hanno niente da
 * descrivere a nessuno.
 */
export const MODELLI_COMUNI: string[] = ["traduttore-it-en"];

/** I modelli che servono davvero a quest'app: i suoi più quelli di tutti. */
export function modelliRichiesti(id: AppId): string[] {
  const app = APPS[id];
  if (app.models.length === 0) return [];
  return [...app.models, ...MODELLI_COMUNI];
}
