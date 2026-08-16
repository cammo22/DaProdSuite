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
}

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
    gpuHeavy: true,
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
    // Verificato: ComfyUI ha i nodi MiniMax H3 nativi (MiniMaxH3ImageToVideo,
    // MiniMaxH3ReferenceToVideo, MiniMaxH3AddGuide...), quindi il video gira nel
    // nostro motore senza WanGP. Restano da scrivere le sliding window.
    // Vedi docs/VERIFICA-AMBIENTE-UNIFICATO.md.
    models: [],
    gpuHeavy: true,
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
      entry: "main.py",
      healthTimeoutMs: 120_000,
    },
    models: ["sd-turbo"],
    gpuHeavy: true,
  },
  companion: {
    id: "companion",
    name: "DaProdCompanion",
    tagline: "Un compagno sul desktop che ti ascolta e si ricorda di te.",
    kind: "service",
    accent: "#5cff9d",
    service: {
      id: "brain",
      port: 8760,
      entry: "-m brain_service",
      healthTimeoutMs: 60_000,
    },
    // Conversazione e memoria passano da LM Studio, che espone un'API
    // compatibile OpenAI su 127.0.0.1:1234. I modelli li gestisce lui.
    models: ["lmstudio-cervello", "lmstudio-memoria"],
    gpuHeavy: false,
  },
  iodigitale: {
    id: "iodigitale",
    name: "DaProd IoDigitale",
    tagline: "Il tuo avatar parlante: gli scrivi, ti risponde in video.",
    kind: "service",
    accent: "#ff7c5c",
    service: {
      id: "talk",
      port: 7860,
      entry: "web_server.py",
      // SoulX-FlashHead carica ~7 GB di pesi: il primo avvio è lento.
      healthTimeoutMs: 240_000,
    },
    // Di serie solo il modello Lite: il repo SoulX ne contiene due completi
    // (Lite e Pro) e scaricarli entrambi vuol dire 5,6 GB buttati.
    models: ["soulx-flashhead", "leaptalk-weights", "wav2vec2-base-960h"],
    extraModels: ["soulx-flashhead-pro"],
    gpuHeavy: true,
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
