/**
 * I grafi che DaProdCinema manda al motore.
 *
 * Solo nodi **core** di ComfyUI: nessun custom node, nessun grafo salvato su
 * file da tenere allineato all'interfaccia. Come in DaProdFoto e DaProdMusica.
 *
 * **I due modelli sono LTX 2.5 e MiniMax H3**, ed è la roadmap (§ 0.7.0) che li
 * aveva scelti. Fanno due cose diverse, e la scheda è costruita intorno a questa
 * differenza invece che sopra un menu che finge che siano intercambiabili:
 *
 * | | Da cosa parte | Cosa esce |
 * |---|---|---|
 * | **LTX 2.5** | testo, e se vuoi il **primo** e l'**ultimo** fotogramma | video col suono dentro |
 * | **MiniMax H3** | testo, e se vuoi **immagini, video e audio di riferimento** | video col suono dentro |
 *
 * I riferimenti di H3 sono **facoltativi**, come i due fotogrammi di LTX: senza
 * niente, `MiniMaxH3ReferenceToVideo` genera dal solo testo. Fino alla 0.4.2
 * l'app lo impediva per far risparmiare tempo a chi non ne aveva bisogno, ed
 * era una scelta fatta al posto di chi la suite la usa.
 *
 * LTX è quello che parte: è distillato — otto passi — e pesa la metà.
 *
 * **La versione di H3 è la ref2va e non la fl2va.** Sono due rifiniture diverse
 * dello stesso modello e non due quantizzazioni: la fl2va prende primo e ultimo
 * fotogramma, la ref2va prende i riferimenti. Primo e ultimo fotogramma li fa
 * già LTX, con metà del peso; i riferimenti — una faccia, un posto, un video da
 * cui copiare il movimento, una voce — li sa fare solo H3, e sono la ragione per
 * cui H3 sta in questa scheda. Costa quanto l'altra (11,8 GB invece di 12,5), e
 * chi aveva scaricato la fl2va può cancellarla.
 *
 * I grafi qui sotto sono verificati sui nodi del motore installato
 * (`comfy_extras/nodes_lt.py`, `nodes_lt_audio.py`, `nodes_minimax_h3.py` di
 * ComfyUI 0.33.1) e ricalcati sul flusso ufficiale di Lightricks
 * (`ComfyUI-LTXVideo`, `example_workflows/2.5/...Single_Stage_Distilled`).
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
 * **Perché tutte multiple di 32.** I due modelli comprimono lo spazio a blocchi
 * (16 px per H3, 32 per LTX) e una misura che non torna la arrotondano loro, in
 * silenzio, spostando l'inquadratura. 1280x720 non è multiplo di 32 — 720 diviso
 * 32 fa 22,5 — e infatti il 720 qui sotto è 1280x704. Per questo il pulsante
 * dice «720» e la riga accanto dice la verità.
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
 * Tutti e due i modelli lavorano a CFG 1 — LTX è distillato, H3 ha il LoRA turbo
 * sopra — e a CFG 1 il negativo il modello non lo guarda proprio. Resta
 * collegato perché costa niente e perché il giorno che si alza il CFG per
 * provare, c'è già.
 */
export const NEGATIVO =
  "worst quality, blurry, jittery, distorted faces, extra limbs, watermark, subtitles, " +
  "static image, low resolution, oversaturated colours";

const PREFISSO = "video/daprodcinema/clip";

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
  passi: { min: 8, max: 8, valore: 8 },
  cfg: 1,
  /** Da 2 a 10 secondi: sopra, una clip su questa scheda diventa una serata. */
  durata: { min: 2, max: 10, valore: 5 },
  /** Cosa gli si può dare in pasto, oltre al testo. Decide mezza interfaccia. */
  ingressi: "fotogrammi",
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

/* ------------------------------------------------------------- MiniMax H3 */

/**
 * MiniMax H3, la versione **Ref2VA**: riferimenti verso video e audio.
 *
 * È quella che serve qui. `MiniMaxH3ReferenceToVideo` prende fino a nove
 * immagini, tre video (ognuno con la sua colonna sonora) e tre audio — **tutti
 * facoltativi**, e senza nessuno genera dal solo testo — e li
 * presenta al modello con delle etichette — `<Picture 1>`, `<Video 1>`,
 * `<Audio 1>` — che si possono **nominare nel prompt**. È così che si dice «la
 * donna di `<Picture 1>` cammina nella stanza di `<Picture 2>`»: senza le
 * etichette il modello riceve tre immagini e nessuna istruzione su cosa prendere
 * da quale.
 *
 * **Il LoRA turbo non è un extra.** Senza, H3 vuole venti passi; con, ne bastano
 * quattro. Su questa scheda è la differenza fra una clip in minuti e una clip in
 * mezz'ora, quindi sta nel catalogo di base e si scarica insieme al modello. È
 * quello della variante ref2v, non quello della fl2v: sono due LoRA diversi per
 * due rifiniture diverse.
 *
 * **Il text encoder resta il pezzo grosso**: Qwen3-VL 32B in int8, 25,3 GB, e su
 * 8 GB di VRAM lavora a pezzi passando per la RAM. È il motivo per cui H3 non è
 * il modello che parte.
 */
const H3 = {
  famiglia: "h3",
  dit: "minimax_h3_ref2va_pruned_w4a8_mixed.safetensors",
  txt: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae: "minimax_h3_video_vae_int8_convrot.safetensors",
  vaeAudio: "minimax_h3_audio_vae_fp32.safetensors",
  lora: "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
  grafo: grafoH3,
  /** La lunghezza deve essere `17k+5`, e il modello è stato visto fra 124 e 362. */
  griglia: 17,
  base: 5,
  passi: { min: 4, max: 20, valore: 4 },
  cfg: 1,
  /** Cinque secondi sono 125 fotogrammi: sotto, H3 non è stato addestrato. */
  durata: { min: 5, max: 15, valore: 5 },
  ingressi: "riferimenti",
  /** I due scarti di rumore di `MiniMaxH3SigmaShift`, dai suoi valori di serie. */
  shiftVideo: 12,
  shiftAudio: 3,
  catalogo: ["h3-ref-dit", "h3-text-encoder", "h3-vae", "h3-audio-vae", "h3-lora-ref-turbo"],
};

export const MODELLI = {
  ltx25: {
    ...LTX,
    id: "ltx25",
    nome: "LTX 2.5 22B distillato",
    riga: "23,2 GB. Otto passi, video e suono insieme. Da testo, o da un primo e un ultimo fotogramma.",
  },
  h3: {
    ...H3,
    id: "h3",
    nome: "MiniMax H3 (riferimenti)",
    riga: "41,6 GB, di cui 25 di solo text encoder. Prende immagini, video e audio come riferimento — o solo il testo. Nativo a 1344x768.",
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
      inputs: { video: ["9", 0], filename_prefix: PREFISSO, format: "mp4", codec: "h264" },
    },
  });

  return grafo;
}

/* ---------------------------------------------------------------------------
 * MiniMax H3: da immagini, video e audio di riferimento.
 * ------------------------------------------------------------------------- */

/**
 * Una clip con MiniMax H3, con i suoi riferimenti.
 *
 * Molto più corto del precedente, e non perché sia un modello più semplice: è
 * che H3 si porta dentro quasi tutto. `MiniMaxH3ReferenceToVideo` prende il
 * testo e i riferimenti e restituisce **il conditioning e il latente insieme**,
 * già nella forma giusta (video e audio annidati); la lunghezza la arrotonda
 * lui; la scala del rumore la sistema `MiniMaxH3SigmaShift`, e allora basta il
 * campionatore di serie.
 *
 * **Gli ingressi dei riferimenti si chiamano `ref_image_0`, `ref_video_0`...** e
 * si contano da zero: il nodo li dichiara come una famiglia che cresce
 * (`Autogrow`, con prefisso), e nel grafo che si manda al motore ognuno è un
 * ingresso vero con il suo nome. Le etichette che si scrivono nel prompt invece
 * partono da uno — `<Picture 1>` è `ref_image_0` — ed è il motivo per cui
 * l'etichetta la scrive l'app accanto a ogni riquadro, invece di lasciarla
 * contare a mano.
 *
 * **La colonna sonora di un video di riferimento** va in `ref_video_audio_N` con
 * lo **stesso numero** del video: è così che il nodo sa che quel suono
 * appartiene a quel video e non è un audio a sé.
 *
 * Il negativo è il conditioning positivo azzerato, come nel grafo di MiniMax
 * Music 3 in DaProdMusica: a CFG 1 non viene guardato, e questo evita di far
 * girare il text encoder da 32B una seconda volta per una frase che il modello
 * ignorerà.
 */
function grafoH3(m, p) {
  const lunghezza = fotogrammi(p.secondi, m);

  const grafo = {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "minimax", device: "default" } },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "14": { class_type: "VAELoader", inputs: { vae_name: m.vaeAudio } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "22": {
      class_type: "LoraLoaderModelOnly",
      inputs: { model: ["4", 0], lora_name: m.lora, strength_model: 1 },
    },
    "10": {
      class_type: "MiniMaxH3SigmaShift",
      inputs: { model: ["22", 0], shift_video: m.shiftVideo, shift_audio: m.shiftAudio },
    },
  };

  const riferimenti = {};
  let nodo = 50;

  // Le immagini: `<Picture 1>` è la prima.
  (p.immagini ?? []).forEach((file, i) => {
    const id = String(nodo++);
    grafo[id] = { class_type: "LoadImage", inputs: { image: file } };
    riferimenti[`ref_image_${i}`] = [id, 0];
  });

  // I video: `LoadVideo` legge il file, `GetVideoComponents` ne tira fuori i
  // fotogrammi (uscita 0) e la colonna sonora (uscita 1). Il suono si manda solo
  // se è stato chiesto: da un video muto uscirebbe un ingresso audio vuoto.
  (p.video ?? []).forEach((clip, i) => {
    const carica = String(nodo++);
    const pezzi = String(nodo++);
    grafo[carica] = { class_type: "LoadVideo", inputs: { file: clip.file } };
    grafo[pezzi] = { class_type: "GetVideoComponents", inputs: { video: [carica, 0] } };
    riferimenti[`ref_video_${i}`] = [pezzi, 0];
    if (clip.conAudio) riferimenti[`ref_video_audio_${i}`] = [pezzi, 1];
  });

  // Gli audio da soli: una voce, un ambiente, un pezzo di musica.
  (p.audio ?? []).forEach((file, i) => {
    const id = String(nodo++);
    grafo[id] = { class_type: "LoadAudio", inputs: { audio: file } };
    riferimenti[`ref_audio_${i}`] = [id, 0];
  });

  grafo["2"] = {
    class_type: "MiniMaxH3ReferenceToVideo",
    inputs: {
      clip: ["1", 0],
      vae: ["7", 0],
      audio_vae: ["14", 0],
      prompt: p.prompt,
      width: p.larghezza,
      height: p.altezza,
      length: lunghezza,
      ref_image_size: p.fedelta ? "max" : "match",
      ...riferimenti,
    },
  };

  Object.assign(grafo, {
    "3": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["2", 0] } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["10", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["2", 1],
        seed: p.seed, steps: p.passi, cfg: m.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    // Lo stesso nodo di LTX, e la sua descrizione lo dice: separa il latente
    // unito di **qualunque** modello audio-video, H3 compreso.
    "25": { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["6", 0] } },
    // `VAEDecode` e non la versione a blocchi: questo VAE i blocchi se li fa da
    // solo (256 px nello spazio, diciassette fotogrammi per volta nel tempo), e
    // tagliarlo una seconda volta da fuori vorrebbe dire solo cuciture in più.
    "8": { class_type: "VAEDecode", inputs: { samples: ["25", 0], vae: ["7", 0] } },
    "21": { class_type: "VAEDecodeAudio", inputs: { samples: ["25", 1], vae: ["14", 0] } },
    "9": { class_type: "CreateVideo", inputs: { images: ["8", 0], fps: FPS, audio: ["21", 0] } },
    "12": {
      class_type: "SaveVideo",
      inputs: { video: ["9", 0], filename_prefix: PREFISSO, format: "mp4", codec: "h264" },
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
 * **La numerazione è la stessa per tutti e due i grafi**, e non per pigrizia: 1
 * il modello di testo, 2 la lettura del prompt, 4 il modello video, 6 la parte
 * lunga, 8 i fotogrammi, 12 il file. Chi aggiungerà un terzo modello domani
 * tenga lo stesso ordine, e questa tabella funzionerà senza sapere che esiste.
 */
export const FASI = {
  "1": { label: "carico il modello di testo", da: 0, a: 0.04 },
  "2": { label: "leggo quello che hai scritto", da: 0.04, a: 0.07 },
  "4": { label: "carico il modello video", da: 0.07, a: 0.1 },
  "22": { label: "aggiungo il turbo", da: 0.1, a: 0.11 },
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
