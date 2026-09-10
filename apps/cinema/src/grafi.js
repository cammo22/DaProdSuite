/**
 * I grafi che DaProdCinema manda al motore.
 *
 * Solo nodi **core** di ComfyUI: nessun custom node, nessun grafo salvato su
 * file da tenere allineato all'interfaccia. Come in DaProdFoto e DaProdMusica.
 *
 * **Il modello è LTX 2.5**, ed è uno dei due che la roadmap aveva scelto
 * (§ 0.7.0). Parte dal testo, e se vuoi dal **primo** e dall'**ultimo**
 * fotogramma; esce un video col suono già dentro.
 *
 * ⚠ **MiniMax H3 è stato tolto l'11 settembre 2026**, e con lui i riferimenti
 * veri (immagini, video e audio dati in pasto al modello). Parole sue: «togliamo
 * i modelli minimax h3 e minimax musica, che sono modelli che al momento non mi
 * piacciono, e alleggeriamo molto».
 *
 * Non era un modello rotto: erano **41,6 GB**, di cui 25 di solo text encoder
 * (Qwen3-VL 32B), che su una scheda da 8 GB lavorano a pezzi passando dalla RAM.
 * Quello che dava in cambio — i riferimenti — è la cosa che rende H3 diverso, e
 * il giorno che torna torna tutto insieme: il modello, il grafo `ref2va` e i
 * riquadri dei riferimenti. Sta scritto nel changelog della 1.3.2.
 *
 * ⚠ **Con un modello solo, il menu dei modelli resta.** Non è una svista: il
 * posto dove si scelgono i passi e la durata è quello, e sono numeri di questo
 * modello. Il giorno che ne arriva un altro si aggiunge una riga a `MODELLI` e
 * il resto della scheda non se ne accorge — che è esattamente il motivo per cui
 * la tabella dei modelli esiste invece di essere sparsa nel codice.
 *
 * Il grafo qui sotto è verificato sui nodi del motore installato
 * (`comfy_extras/nodes_lt.py`, `nodes_lt_audio.py` di ComfyUI 0.33.1) e
 * ricalcato sul flusso ufficiale di Lightricks (`ComfyUI-LTXVideo`,
 * `example_workflows/2.5/...Single_Stage_Distilled`).
 */

/** Ventiquattro al secondo per tutti e due, ed è il ritmo con cui sono nati. */
export const FPS = 24;

/* -------------------------------------------------------------- le misure */

/**
 * Che forma ha il video, e quanto è grande.
 *
 * Sono le stesse due file di pulsanti di DaProdFoto — la forma e la risoluzione
 * — perché è la stessa scelta, e non c'è motivo di farla in due modi diversi in
 * due schede della stessa suite.
 *
 * **Perché tutte multiple di 32.** Il modello comprime lo spazio a blocchi di 32
 * px, e una misura che non torna la arrotonda lui, in silenzio, spostando
 * l'inquadratura. 1280x720 non è multiplo di 32 — 720 diviso 32 fa 22,5 — e
 * infatti il 720 qui sotto è 1280x704. Per questo il pulsante dice «720» e la
 * riga accanto dice la verità.
 *
 * **Il tempo cresce con i pixel**, e su una scheda da 8 GB cresce in fretta: il
 * 480 è quello che parte, e non per modestia.
 */
export const FORME = ["16:9", "9:16", "4:3", "1:1"];

export const RISOLUZIONI = [
  { id: "480", etichetta: "480" },
  { id: "720", etichetta: "720" },
  { id: "1080", etichetta: "1080p" },
];

export const MISURE = {
  "16:9": { 480: [832, 480], 720: [1280, 704], 1080: [1920, 1088] },
  "9:16": { 480: [480, 832], 720: [704, 1280], 1080: [1088, 1920] },
  "4:3": { 480: [640, 480], 720: [960, 704], 1080: [1440, 1088] },
  "1:1": { 480: [480, 480], 720: [704, 704], 1080: [1088, 1088] },
};

/**
 * Il negativo, in inglese.
 *
 * LTX lavora a CFG 1 perché è distillato, e a CFG 1 il negativo il modello non
 * lo guarda proprio. Resta collegato perché costa niente e perché il giorno che
 * si alza il CFG per provare, c'è già.
 */
export const NEGATIVO =
  "worst quality, blurry, jittery, distorted faces, extra limbs, watermark, subtitles, " +
  "static image, low resolution, oversaturated colours";

const PREFISSO = "video/daprodcinema/clip";

/**
 * La cartella in cui finiscono i pezzi di un video lungo.
 *
 * ⚠ **La libreria la salta apposta** (vedi `CARTELLA_PEZZI` in `libreria.ts`), e
 * non è per pulizia: chi chiede un video da un minuto da fuori riceve **il primo
 * file nuovo** che compare, e senza questa cartella riceverebbe il primo pezzo
 * da otto secondi mentre il film vero arriva dieci minuti dopo, a nessuno.
 */
export const CARTELLA_PEZZI = "pezzi";
export const PREFISSO_PEZZI = `video/daprodcinema/${CARTELLA_PEZZI}`;

/**
 * Dove salva questo grafo.
 *
 * Di suo, accanto alle altre clip. `p.dove` lo cambia, e serve a una cosa sola:
 * i pezzi di un video lungo, che vanno dove la libreria non guarda.
 */
const doveSalvare = (p) => (p && p.dove ? String(p.dove) : PREFISSO);

/* ---------------------------------------------------------------- LTX 2.5 */

/**
 * LTX 2.5, distillato, in W4A8 ConvRot.
 *
 * **Un solo file per il text encoder.** Il Gemma 4 da 12B che LTX usa si porta
 * dentro le proiezioni (`text_embedding_projection`), quindi `CLIPLoader` con
 * tipo `ltxv` basta da solo: `LTXAVTextEncoderLoader` vorrebbe anche il
 * checkpoint intero, che noi non scarichiamo.
 *
 * **Il VAE audio sta in `checkpoints` e non in `vae`**, e non è un capriccio del
 * catalogo: quel file contiene l'autoencoder *e* il vocoder, con le chiavi
 * `audio_vae.` e `vocoder.`, ed è `LTXVAudioVAELoader` a saperle rimettere a
 * posto — leggendo da `checkpoints`, che è dove quel nodo guarda.
 */
const LTX = {
  famiglia: "ltx",
  dit: "ltx-2.5-22b-distilled-transformer-w4a8_convrot.safetensors",
  txt: "gemma4-12b-with-proj-ltx-2.5-w4a8_convrot.safetensors",
  vae: "ltx-2.5-video-vae-conv-bf16.safetensors",
  vaeAudio: "ltx-2.5-audio-vae-bf16.safetensors",
  grafo: grafoLtx,
  /** La lunghezza deve essere `8n+1`: il suo VAE comprime otto volte nel tempo. */
  griglia: 8,
  base: 1,
  /**
   * Otto passi, e il cursore non c'è.
   *
   * Non è una manopola tolta per fare pulizia: il modello è distillato su una
   * **scala di rumore scritta a mano** — gli otto numeri di `SIGMAS` qui sotto,
   * che sono quelli del flusso ufficiale — e non su un numero di passi. Cambiare
   * il numero senza cambiare la scala non dà un video più bello, dà un video
   * fatto male. Il giorno che serve si aggiunge una seconda scala e si sceglie
   * fra le due; non si muove un cursore.
   */
  /**
   * Un modo solo: il distillato è già il modo veloce.
   *
   * ⚠ **Il pulsante c'è comunque, ed è uno.** `modi` è una lista perché un
   * modello può avere due strade — con il LoRA turbo e senza, come le aveva
   * MiniMax H3 finché c'era. Qui la strada è una, e tenere la lista vuol dire
   * che il giorno che ne arriva un'altra non si cambia l'interfaccia: si
   * aggiunge una riga qui.
   */
  modi: [
    {
      id: "distillato",
      nome: "8 passi",
      riga: "il distillato lavora a otto passi e basta: è già il modo veloce.",
      passi: { min: 8, max: 8, valore: 8 },
      lora: null,
    },
  ],
  cfg: 1,
  /**
   * Da 2 a 20 secondi.
   *
   * Venti è il limite del modello, non un numero scelto da noi: la testa che
   * indovina la durata (`LTXVDurationPredictor`) si ferma lì di serie, e venti
   * è quello che Lightricks dichiara per la 2.5. Fino alla 0.4.4 il cursore si
   * fermava a dieci per prudenza — «sopra, una clip diventa una serata» — ma
   * il distillato a otto passi va molto più veloce di così, e dieci secondi
   * tagliati a metà di una scena sono un problema peggiore dell'attesa.
   *
   * ⚠ Il tempo di generazione **non** cresce lineare: raddoppiando i secondi
   * raddoppiano i fotogrammi, e con loro la memoria che serve al campionatore.
   * Sopra i dieci secondi conviene stare a 720p.
   */
  durata: { min: 2, max: 20, valore: 5 },
  catalogo: ["ltx25-dit", "ltx25-text-encoder", "ltx25-vae", "ltx25-audio-vae"],
};

/**
 * La scala di rumore del distillato, otto passi.
 *
 * Copiata dal `ManualSigmas` del flusso ufficiale di Lightricks per la 2.5
 * distillata. Non è una curva che si possa ricavare da uno scheduler: i primi
 * quattro passi si muovono di pochissimo e gli ultimi tre di moltissimo, ed è
 * così che il modello è stato addestrato a finire.
 */
const SIGMAS = "1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0";

/**
 * Quanto si ricomprime l'immagine di partenza prima di darla al modello.
 *
 * `LTXVPreprocess` la ricomprime in JPEG: sembra un dispetto, ed è il contrario.
 * Il modello è stato addestrato su video veri, cioè su fotogrammi compressi; una
 * immagine pulitissima come primo fotogramma è fuori distribuzione, e nelle
 * prime frazioni di secondo il video «scatta» per allontanarsene. Diciotto è il
 * valore del flusso ufficiale.
 */
const COMPRESSIONE = 18;

export const MODELLI = {
  ltx25: {
    ...LTX,
    id: "ltx25",
    nome: "LTX 2.5 22B distillato",
    riga: "23,2 GB. Otto passi, video e suono insieme. Da testo, o da un primo e un ultimo fotogramma.",
  },
};

export const modello = (id) => MODELLI[id] ?? MODELLI.ltx25;

/**
 * Quanti fotogrammi per tot secondi, nella griglia che il modello accetta.
 *
 * Nessuno dei due prende un numero qualunque. Sbagliarlo non dà errore — la
 * misura la arrotonda il motore — e la clip esce più lunga o più corta di quello
 * che c'era scritto sul cursore.
 */
export function fotogrammi(secondi, m) {
  const grezzi = Math.max(m.base, Math.round(secondi * FPS));
  const passi = Math.max(0, Math.ceil((grezzi - m.base) / m.griglia));
  return passi * m.griglia + m.base;
}

/** Quanto dura davvero con quei fotogrammi. Va scritto accanto al cursore. */
export const secondiVeri = (secondi, m) => fotogrammi(secondi, m) / FPS;

/** La clip, col modello scelto nel menu. */
export const grafoClip = (m, p) => m.grafo(m, p);

/* ---------------------------------------------------------------------------
 * LTX 2.5: da testo, o da un primo e un ultimo fotogramma.
 * ------------------------------------------------------------------------- */

/**
 * Una clip con LTX 2.5.
 *
 * Il giro è quello del flusso ufficiale a stadio unico: si prepara **un latente
 * solo** che contiene video e audio (`LTXVConcatAVLatent`), lo si campiona con
 * il campionatore avanzato e la scala di rumore del distillato, e poi lo si apre
 * in due (`LTXVSeparateAVLatent`) — i fotogrammi dal VAE video, il suono dal VAE
 * audio.
 *
 * **Separare il latente non è facoltativo**, ed era il difetto della versione
 * precedente di questo file: il latente unito è una coppia annidata, e darlo
 * così com'è a `VAEDecodeTiled` non produce un video sbagliato, produce un
 * errore.
 *
 * **Il primo e l'ultimo fotogramma entrano con `LTXVAddGuide`**, e non con
 * `LTXVImgToVideoInplace`: quello sa scrivere solo l'inizio, mentre `AddGuide`
 * prende un `frame_idx` — `0` per il primo, `-1` per l'ultimo — e li accetta
 * tutti e due, uno incatenato all'altro. In cambio scrive dei fotogrammi di
 * guida dentro al latente, che vanno tolti dopo il campionamento con
 * `LTXVCropGuides`: se non si tolgono restano nel video, in testa, come due
 * fotogrammi che non c'entrano niente.
 */
function grafoLtx(m, p) {
  const lunghezza = fotogrammi(p.secondi, m);

  const grafo = {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "ltxv", device: "default" } },
    "2": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: p.prompt } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: p.negativo } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "5": {
      class_type: "EmptyLTXVLatentVideo",
      inputs: { width: p.larghezza, height: p.altezza, length: lunghezza, batch_size: 1 },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "13": {
      class_type: "LTXVConditioning",
      inputs: { positive: ["2", 0], negative: ["3", 0], frame_rate: FPS },
    },
    "14": { class_type: "LTXVAudioVAELoader", inputs: { ckpt_name: m.vaeAudio } },
    "15": {
      class_type: "LTXVEmptyLatentAudio",
      inputs: { frames_number: lunghezza, frame_rate: FPS, batch_size: 1, audio_vae: ["14", 0] },
    },
  };

  // Dove stanno adesso il conditioning e il latente video: si spostano a ogni
  // guida aggiunta, e i nodi dopo devono seguirli senza sapere quante ce ne sono.
  let positivo = ["13", 0];
  let negativo = ["13", 1];
  let video = ["5", 0];
  let conGuide = false;

  /** Una guida: l'immagine caricata, ricompressa, e messa a quel fotogramma. */
  const guida = (base, immagine, dove) => {
    const carica = String(base);
    const prepara = String(base + 1);
    const aggiungi = String(base + 2);
    grafo[carica] = { class_type: "LoadImage", inputs: { image: immagine } };
    grafo[prepara] = {
      class_type: "LTXVPreprocess",
      inputs: { image: [carica, 0], img_compression: COMPRESSIONE },
    };
    grafo[aggiungi] = {
      class_type: "LTXVAddGuide",
      inputs: {
        positive: positivo,
        negative: negativo,
        vae: ["7", 0],
        latent: video,
        image: [prepara, 0],
        frame_idx: dove,
        strength: 1,
      },
    };
    positivo = [aggiungi, 0];
    negativo = [aggiungi, 1];
    video = [aggiungi, 2];
    conGuide = true;
  };

  if (p.primoFotogramma) guida(30, p.primoFotogramma, 0);
  if (p.ultimoFotogramma) guida(40, p.ultimoFotogramma, -1);

  Object.assign(grafo, {
    "16": { class_type: "LTXVConcatAVLatent", inputs: { video_latent: video, audio_latent: ["15", 0] } },
    // Ancestrale, come il flusso ufficiale: il distillato è stato messo a punto
    // con questo campionatore e questa scala, non con euler liscio.
    "17": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler_ancestral" } },
    "18": { class_type: "ManualSigmas", inputs: { sigmas: SIGMAS } },
    "19": { class_type: "RandomNoise", inputs: { noise_seed: p.seed } },
    "20": {
      class_type: "CFGGuider",
      inputs: { model: ["4", 0], positive: positivo, negative: negativo, cfg: m.cfg },
    },
    "6": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        noise: ["19", 0], guider: ["20", 0], sampler: ["17", 0],
        sigmas: ["18", 0], latent_image: ["16", 0],
      },
    },
    "25": { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["6", 0] } },
  });

  // Con le guide, i fotogrammi che abbiamo scritto dentro al latente vanno
  // ritagliati via prima di decodificare. Senza guide non c'è niente da togliere.
  let daDecodificare = ["25", 0];
  if (conGuide) {
    grafo["26"] = {
      class_type: "LTXVCropGuides",
      inputs: { positive: positivo, negative: negativo, latent: ["25", 0] },
    };
    daDecodificare = ["26", 2];
  }

  Object.assign(grafo, {
    "8": {
      class_type: "VAEDecodeTiled",
      inputs: {
        samples: daDecodificare,
        vae: ["7", 0],
        tile_size: 512,
        overlap: 64,
        // Nel tempo, non nello spazio: è il punto in cui la memoria finisce,
        // **dopo** che il lavoro sembrava già fatto.
        temporal_size: 128,
        temporal_overlap: 32,
      },
    },
    "21": { class_type: "LTXVAudioVAEDecode", inputs: { samples: ["25", 1], audio_vae: ["14", 0] } },
    "9": { class_type: "CreateVideo", inputs: { images: ["8", 0], fps: FPS, audio: ["21", 0] } },
    "12": {
      class_type: "SaveVideo",
      inputs: { video: ["9", 0], filename_prefix: doveSalvare(p), format: "mp4", codec: "h264" },
    },
  });

  return grafo;
}

/**
 * Dove sta il lavoro di una clip, nodo per nodo.
 *
 * Come `FASI` in DaProdMusica, e per la stessa ragione: senza, la barra sta
 * ferma per minuti e poi salta alla fine.
 *
 * ⚠ **La numerazione è una convenzione, non un caso**: 1 il modello di testo, 2
 * la lettura del prompt, 4 il modello video, 6 la parte lunga, 8 i fotogrammi,
 * 12 il file. Chi aggiungerà un secondo modello domani tenga lo stesso ordine, e
 * questa tabella funzionerà senza sapere che esiste — è così che ha funzionato
 * per MiniMax H3 finché c'era.
 */
export const FASI = {
  "1": { label: "carico il modello di testo", da: 0, a: 0.04 },
  "2": { label: "leggo quello che hai scritto", da: 0.04, a: 0.07 },
  "4": { label: "carico il modello video", da: 0.07, a: 0.1 },
  "5": { label: "preparo i fotogrammi", da: 0.1, a: 0.11 },
  "15": { label: "preparo la traccia audio", da: 0.11, a: 0.12 },
  "32": { label: "leggo il primo fotogramma", da: 0.11, a: 0.12 },
  "42": { label: "leggo l'ultimo fotogramma", da: 0.12, a: 0.13 },
  "16": { label: "unisco video e audio", da: 0.13, a: 0.14 },
  "6": { label: "genero il movimento", da: 0.14, a: 0.85 },
  "8": { label: "rendo i fotogrammi", da: 0.85, a: 0.94 },
  "21": { label: "rendo il suono", da: 0.94, a: 0.96 },
  "9": { label: "compongo il video", da: 0.96, a: 0.98 },
  "12": { label: "salvo il video", da: 0.98, a: 1 },
};
