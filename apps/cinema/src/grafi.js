/**
 * I grafi di DaProdCinema: una clip, e il montaggio finale.
 *
 * Come in DaProdMusica e DaProdFoto: solo nodi **core** di ComfyUI, nessun
 * custom node, nessun grafo salvato su file da tenere allineato a mano.
 *
 * **I due modelli sono LTX 2.5 e MiniMax H3**, che è quello che la roadmap
 * aveva scelto fin dall'inizio (§ 0.7.0) e che nella 0.4.0 era stato sostituito
 * da Wan 2.2 TI2V 5B senza chiederlo. La sostituzione aveva una ragione vera —
 * il 5B costa 18 GB e gli altri due molti di più — ma la ragione non era nostra
 * da decidere, e nella 0.4.1 Wan è uscito dalla suite.
 *
 * Da **WanGP** (`deepbeepmeep/Wan2GP`) si prende quello che c'era da prendere
 * fin dall'inizio, e non è un modello: è il modo di far entrare modelli enormi
 * in poca memoria. Pesi quantizzati per davvero (W4A8 e int8 ConvRot, non i
 * GGUF), il decoder a blocchi, una cosa per volta in VRAM. È per questo che qui
 * sotto i pesi scelti sono i più compressi che il motore sa caricare da sé.
 *
 * **Quanto costano, detto prima.** Sono modelli grossi e i conti non si
 * addolciscono:
 *
 * | | Da scaricare | Sulla 4060 da 8 GB |
 * |---|---|---|
 * | LTX 2.5 22B (W4A8) | 11,7 + 9,9 + 1,7 = **23,2 GB** | tutto in offload, minuti a clip |
 * | MiniMax H3 (W4A8 + turbo) | 11,7 + 25,3 + 3,5 + 1,8 = **42,3 GB** | il text encoder da solo è un 32B |
 *
 * I 25 GB di H3 sono il suo text encoder, Qwen3-VL 32B, e non esiste più
 * piccolo che questo motore sappia caricare: la versione NVFP4 da 14,6 GB vuole
 * una scheda Blackwell (serie 50), i GGUF vogliono un nodo custom che non
 * supporta questa famiglia. Per questo **LTX 2.5 è quello che parte**: fa il
 * video con il suono dentro, pesa la metà, ed è distillato — otto passi.
 *
 * Nessuno dei due è stato provato su una clip vera: sono grafi verificati sui
 * nodi del motore (`comfy_extras/nodes_lt.py`, `nodes_lt_audio.py`,
 * `nodes_minimax_h3.py` di ComfyUI 0.33.1), non su un video uscito dal disco.
 * Quando la prima clip esce davvero, questa riga si cancella.
 */

/**
 * Cosa si può chiedere alla scheda video.
 *
 * Sono i tre punti di lavoro fra cui scegliere prima di far partire un video
 * intero, ed è la manopola che conta di più: il tempo di una clip cresce con il
 * numero di pixel per fotogramma, e diciassette clip moltiplicano tutto per
 * diciassette. Il primo è quello che parte, ed è basso di proposito — meglio un
 * video finito da guardare che una clip bellissima e sedici da fare.
 *
 * I lati sono multipli di 32: tutti e due i modelli comprimono lo spazio a
 * blocchi (16 per H3, 32 per LTX) e una misura che non torna la arrotondano
 * loro, in silenzio, spostando l'inquadratura.
 */
export const MISURE = {
  provino: { id: "provino", nome: "Provino — 640×352", larghezza: 640, altezza: 352 },
  normale: { id: "normale", nome: "Normale — 832×480", larghezza: 832, altezza: 480 },
  grande: { id: "grande", nome: "Grande — 1280×704", larghezza: 1280, altezza: 704 },
};

/**
 * Il negativo, in inglese.
 *
 * Tutti e due i modelli qui sotto lavorano a CFG 1 — sono distillati, o hanno
 * un LoRA turbo sopra — e a CFG 1 il negativo il modello non lo guarda proprio.
 * Resta collegato perché costa niente e perché il giorno che si alza il CFG per
 * provare, c'è già.
 */
const NEGATIVO =
  "worst quality, blurry, jittery, distorted faces, extra limbs, watermark, subtitles, " +
  "static image, low resolution, oversaturated colours";

/* ------------------------------------------------------------------ LTX 2.5 */

/**
 * LTX 2.5, distillato, in W4A8 ConvRot.
 *
 * **Perché la W4A8 e non la int8 ufficiale.** La int8 di Lightricks è 20 GB
 * di solo DiT più 14,3 di text encoder: 36 GB in tutto, e su una scheda da 8
 * cambia poco rispetto alla W4A8 se non il tempo di scaricamento. La W4A8
 * ConvRot è lo stesso formato che la suite usa già per MiniMax Music 3, la
 * carica `comfy-kitchen` (`AsymW4A8Int8Layout`) che sta già nell'ambiente, e
 * dimezza il download. Se un giorno la scheda diventa grande, in
 * `manifest/models.json` c'è scritto dove stanno i file interi.
 *
 * **Un solo file per il text encoder.** Il Gemma 4 da 12B che LTX usa si porta
 * dentro le proiezioni (`text_embedding_projection`), quindi `CLIPLoader` con
 * tipo `ltxv` basta da solo: `LTXAVTextEncoderLoader` vorrebbe anche il
 * checkpoint intero, che noi non scarichiamo.
 *
 * **Il VAE audio sta in `checkpoints` e non in `vae`**, e non è un capriccio
 * del catalogo: `LTXVAudioVAELoader` legge da lì, perché quel file contiene
 * l'autoencoder *e* il vocoder e non è un VAE come gli altri.
 */
const LTX = {
  famiglia: "ltx",
  dit: "ltx-2.5-22b-distilled-transformer-w4a8_convrot.safetensors",
  txt: "gemma4-12b-with-proj-ltx-2.5-w4a8_convrot.safetensors",
  vae: "ltx-2.5-video-vae-conv-bf16.safetensors",
  vaeAudio: "ltx-2.5-audio-vae-bf16.safetensors",
  grafo: grafoLtx,
  /** Venticinque al secondo, e la lunghezza deve essere `8n+1`. */
  fps: 25,
  griglia: 8,
  base: 1,
  /** Otto passi: è distillato, alzarli non lo migliora, li lascio provare. */
  passi: { min: 4, max: 20, valore: 8 },
  cfg: 1,
  catalogo: ["ltx25-dit", "ltx25-text-encoder", "ltx25-vae", "ltx25-audio-vae"],
};

/* --------------------------------------------------------------- MiniMax H3 */

/**
 * MiniMax H3, la versione **FL2VA**: primo e ultimo fotogramma, video e audio.
 *
 * È quella che serve qui — l'ultimo fotogramma di un'inquadratura diventa il
 * primo della successiva, ed è tutta la continuità del video — mentre la Ref2VA
 * è quella dei riferimenti (una faccia, un posto) e verrà quando servirà.
 *
 * **Il LoRA turbo non è un extra.** Senza, H3 vuole decine di passi; con, ne
 * bastano quattro. Su questa scheda è la differenza fra una clip in minuti e
 * una clip in mezz'ora, quindi sta nel catalogo di base e si scarica insieme al
 * modello.
 *
 * **Il text encoder resta il pezzo grosso**: Qwen3-VL 32B in int8, 25,3 GB, e
 * su 8 GB di VRAM lavora a pezzi passando per la RAM. È il motivo per cui H3
 * non è il modello che parte.
 */
const H3 = {
  famiglia: "h3",
  dit: "minimax_h3_fl2va_pruned_w4a8_mixed.safetensors",
  txt: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae: "minimax_h3_video_vae_int8_convrot.safetensors",
  vaeAudio: "minimax_h3_audio_vae_fp32.safetensors",
  lora: "minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
  grafo: grafoH3,
  /** Ventiquattro al secondo, e la lunghezza deve essere `17k+5`. */
  fps: 24,
  griglia: 17,
  base: 5,
  passi: { min: 4, max: 20, valore: 4 },
  cfg: 1,
  /** I due scarti di rumore di `MiniMaxH3SigmaShift`, dai suoi valori di serie. */
  shiftVideo: 12,
  shiftAudio: 3,
  catalogo: ["h3-dit", "h3-text-encoder", "h3-vae", "h3-audio-vae", "h3-lora-turbo"],
};

export const MODELLI = {
  "ltx25": {
    ...LTX,
    id: "ltx25",
    nome: "LTX 2.5 22B distillato",
    riga: "23,2 GB. Otto passi, video e suono insieme: è quello da cui partire.",
  },
  "h3": {
    ...H3,
    id: "h3",
    nome: "MiniMax H3 (FL2VA + turbo)",
    riga: "42,3 GB, di cui 25 di solo text encoder. Su 8 GB è da provare a una clip per volta.",
  },
};

export const modello = (id) => MODELLI[id] ?? MODELLI["ltx25"];

/** Quanti fotogrammi al secondo gira il modello scelto. */
export const FPS = 24;

/**
 * Quanti fotogrammi per tot secondi, nella misura che il modello accetta.
 *
 * Nessuno dei due prende un numero qualunque. LTX vuole `8n+1` (il suo VAE
 * comprime otto volte nel tempo), H3 vuole `17k+5`. Sbagliarlo non dà errore —
 * arrotonda il motore, e la clip esce più lunga o più corta di quello che il
 * regista aveva calcolato, che su diciassette inquadrature diventa un video
 * fuori sincrono con la canzone.
 */
export function fotogrammi(secondi, m = MODELLI["ltx25"]) {
  const grezzi = Math.max(1, Math.round(secondi * m.fps));
  const passi = Math.max(1, Math.round((grezzi - m.base) / m.griglia));
  return passi * m.griglia + m.base;
}

/** La clip, col modello scelto nel menu. */
export const grafoClip = (m, p) => m.grafo(m, p);

/**
 * Una clip con LTX 2.5.
 *
 * Il giro è quello del flusso ufficiale di ComfyUI per questa famiglia, tolto
 * il secondo stadio di ingrandimento: si genera **un latente unico** che
 * contiene video e audio (`LTXVConcatAVLatent`), lo si campiona con il
 * campionatore avanzato e i sigma di `LTXVScheduler`, e poi lo si apre in due —
 * i fotogrammi dal VAE video, il suono dal VAE audio.
 *
 * **Perché `SamplerCustomAdvanced` e non `KSampler`.** LTX vuole i propri
 * sigma, che non sono nessuno degli scheduler del KSampler: dandogli `simple`
 * si ottiene un video, ma non quello che il modello sa fare.
 *
 * **La prima immagine, quando c'è**, entra con `LTXVImgToVideoInplace`: scrive
 * l'ultimo fotogramma della clip precedente dentro il latente vuoto invece di
 * passare da un conditioning a parte, e così la continuità non costa un nodo di
 * guida da ritagliare dopo.
 */
function grafoLtx(m, p) {
  const misura = MISURE[p.misura] ?? MISURE.provino;
  const lunghezza = fotogrammi(p.secondi, m);
  const video = p.primoFotogramma ? ["23", 0] : ["5", 0];

  const grafo = {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "ltxv", device: "default" } },
    "2": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: p.prompt } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: NEGATIVO } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "5": {
      class_type: "EmptyLTXVLatentVideo",
      inputs: { width: misura.larghezza, height: misura.altezza, length: lunghezza, batch_size: 1 },
    },
    "6": {
      class_type: "SamplerCustomAdvanced",
      inputs: { noise: ["19", 0], guider: ["20", 0], sampler: ["17", 0], sigmas: ["18", 0], latent_image: ["16", 0] },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "8": {
      class_type: "VAEDecodeTiled",
      inputs: {
        samples: ["6", 0], vae: ["7", 0],
        tile_size: 512, overlap: 64,
        // Nel tempo, non nello spazio: è il punto in cui la memoria finisce,
        // **dopo** che il lavoro sembrava già fatto.
        temporal_size: 24, temporal_overlap: 8,
      },
    },
    "9": { class_type: "CreateVideo", inputs: { images: ["8", 0], fps: m.fps, audio: ["21", 0] } },
    "12": {
      class_type: "SaveVideo",
      inputs: {
        video: ["9", 0],
        filename_prefix: `video/daprodcinema/${p.cartella}/clip`,
        format: "mp4",
        codec: "h264",
      },
    },
    "13": {
      class_type: "LTXVConditioning",
      inputs: { positive: ["2", 0], negative: ["3", 0], frame_rate: m.fps },
    },
    "14": { class_type: "LTXVAudioVAELoader", inputs: { ckpt_name: m.vaeAudio } },
    "15": {
      class_type: "LTXVEmptyLatentAudio",
      inputs: { frames_number: lunghezza, frame_rate: m.fps, batch_size: 1, audio_vae: ["14", 0] },
    },
    "16": { class_type: "LTXVConcatAVLatent", inputs: { video_latent: video, audio_latent: ["15", 0] } },
    "17": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "18": {
      class_type: "LTXVScheduler",
      inputs: {
        steps: p.passi, max_shift: 2.05, base_shift: 0.95, stretch: true, terminal: 0.1,
        // Il latente **video** e non quello unito: lo scheduler conta i token
        // per decidere lo scarto, e il latente unito è una coppia annidata.
        latent: ["5", 0],
      },
    },
    "19": { class_type: "RandomNoise", inputs: { noise_seed: p.seed } },
    "20": {
      class_type: "CFGGuider",
      inputs: { model: ["4", 0], positive: ["13", 0], negative: ["13", 1], cfg: m.cfg },
    },
    "21": { class_type: "LTXVAudioVAEDecode", inputs: { samples: ["6", 0], audio_vae: ["14", 0] } },
  };

  if (p.primoFotogramma) {
    grafo["11"] = { class_type: "LoadImage", inputs: { image: p.primoFotogramma } };
    grafo["23"] = {
      class_type: "LTXVImgToVideoInplace",
      inputs: { vae: ["7", 0], image: ["11", 0], latent: ["5", 0], strength: 1, bypass: false },
    };
  }
  return grafo;
}

/**
 * Una clip con MiniMax H3.
 *
 * Molto più corto del precedente, e non perché sia un modello più semplice: è
 * che H3 si porta dentro quasi tutto. `MiniMaxH3ImageToVideo` prende il testo e
 * i fotogrammi di riferimento e restituisce **il conditioning e il latente
 * insieme**, già nella forma giusta (video e audio annidati); la lunghezza la
 * arrotonda lui alla sua griglia; il campionatore può essere quello di serie,
 * perché la scala del rumore la sistema `MiniMaxH3SigmaShift`.
 *
 * Il negativo è il conditioning positivo azzerato, come nel grafo di MiniMax
 * Music 3 in DaProdMusica: a CFG 1 non viene guardato, e questo evita di far
 * girare il text encoder da 32B una seconda volta per una frase che il modello
 * ignorerà.
 */
function grafoH3(m, p) {
  const misura = MISURE[p.misura] ?? MISURE.provino;
  const lunghezza = fotogrammi(p.secondi, m);

  const grafo = {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "minimax", device: "default" } },
    "2": {
      class_type: "MiniMaxH3ImageToVideo",
      inputs: {
        clip: ["1", 0], vae: ["7", 0], prompt: p.prompt,
        width: misura.larghezza, height: misura.altezza, length: lunghezza,
        ...(p.primoFotogramma ? { first_frame: ["11", 0] } : {}),
      },
    },
    "3": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["2", 0] } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["10", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["2", 1],
        seed: p.seed, steps: p.passi, cfg: m.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    // `VAEDecode` e non `VAEDecodeTiled`: questo VAE i blocchi se li fa da solo
    // (256 px nello spazio, diciassette fotogrammi per volta nel tempo), e
    // tagliarlo una seconda volta da fuori vorrebbe dire solo cuciture in più.
    "8": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": { class_type: "CreateVideo", inputs: { images: ["8", 0], fps: m.fps, audio: ["21", 0] } },
    "10": {
      class_type: "MiniMaxH3SigmaShift",
      inputs: { model: ["22", 0], shift_video: m.shiftVideo, shift_audio: m.shiftAudio },
    },
    "12": {
      class_type: "SaveVideo",
      inputs: {
        video: ["9", 0],
        filename_prefix: `video/daprodcinema/${p.cartella}/clip`,
        format: "mp4",
        codec: "h264",
      },
    },
    "14": { class_type: "VAELoader", inputs: { vae_name: m.vaeAudio } },
    "21": { class_type: "VAEDecodeAudio", inputs: { samples: ["6", 0], vae: ["14", 0] } },
    "22": {
      class_type: "LoraLoaderModelOnly",
      inputs: { model: ["4", 0], lora_name: m.lora, strength_model: 1 },
    },
  };

  if (p.primoFotogramma) {
    grafo["11"] = { class_type: "LoadImage", inputs: { image: p.primoFotogramma } };
  }
  return grafo;
}

/**
 * Il montaggio: le clip una dietro l'altra, sopra la canzone.
 *
 * Si fa nel motore e non nella pagina per una ragione sola: una pagina non sa
 * scrivere un mp4. ComfyUI sì, e ha già tutto — `LoadVideo` legge le clip,
 * `GetVideoComponents` ne tira fuori i fotogrammi, `ImageBatch` li mette in fila,
 * `CreateVideo` ci appoggia l'audio e `SaveVideo` scrive il file.
 *
 * **Del suono generato dentro le clip non resta niente**, ed è voluto: questi
 * due modelli il video lo fanno con l'audio, ma qui sopra ci va la canzone, e
 * due tracce sovrapposte non sono un video musicale. Il suono delle clip si
 * sente nelle anteprime della scaletta, dove serve a capire se l'inquadratura è
 * venuta.
 *
 * `ImageBatch` prende **due** ingressi, non una lista: la catena si costruisce a
 * due a due, ed è il motivo per cui questa funzione genera nodi in un ciclo
 * invece di scriverli a mano come le altre.
 *
 * Le clip e il brano devono già stare nella cartella `input` del motore: ce li
 * mette `ponte.carica` prima di mandare questo grafo.
 */
export function grafoMontaggio({ clip, brano, cartella, fps = FPS }) {
  const grafo = {};
  let ultimo = null;

  clip.forEach((file, i) => {
    const caricato = `v${i}`;
    const pezzi = `p${i}`;
    grafo[caricato] = { class_type: "LoadVideo", inputs: { file } };
    grafo[pezzi] = { class_type: "GetVideoComponents", inputs: { video: [caricato, 0] } };

    if (ultimo === null) {
      ultimo = [pezzi, 0];
      return;
    }
    const unione = `u${i}`;
    grafo[unione] = { class_type: "ImageBatch", inputs: { image1: ultimo, image2: [pezzi, 0] } };
    ultimo = [unione, 0];
  });

  grafo["audio"] = { class_type: "LoadAudio", inputs: { audio: brano } };
  grafo["video"] = {
    class_type: "CreateVideo",
    inputs: { images: ultimo, fps, audio: ["audio", 0] },
  };
  grafo["salva"] = {
    class_type: "SaveVideo",
    inputs: {
      video: ["video", 0],
      filename_prefix: `video/daprodcinema/${cartella}/video`,
      format: "mp4",
      codec: "h264",
    },
  };
  return grafo;
}

/**
 * Dove sta il lavoro di una clip, nodo per nodo.
 *
 * Come `FASI` in DaProdMusica, e per la stessa ragione: senza, la barra sta
 * ferma per minuti e poi salta alla fine.
 *
 * **La numerazione è la stessa per tutti e due i grafi**, e non per pigrizia: 1
 * il modello di testo, 2 la lettura dell'inquadratura, 4 il modello video, 6 la
 * parte lunga, 8 i fotogrammi, 12 il file. Chi aggiungerà un terzo modello
 * tenga lo stesso ordine, e questa tabella funzionerà senza sapere che esiste.
 */
export const FASI = {
  "1": { label: "carico il modello di testo", da: 0, a: 0.04 },
  "2": { label: "leggo l'inquadratura", da: 0.04, a: 0.06 },
  "4": { label: "carico il modello video", da: 0.06, a: 0.1 },
  "5": { label: "preparo i fotogrammi", da: 0.1, a: 0.11 },
  "22": { label: "aggiungo il turbo", da: 0.11, a: 0.12 },
  "15": { label: "preparo la traccia audio", da: 0.11, a: 0.12 },
  "16": { label: "unisco video e audio", da: 0.12, a: 0.13 },
  "23": { label: "aggancio la clip precedente", da: 0.12, a: 0.13 },
  "6": { label: "genero il movimento", da: 0.13, a: 0.85 },
  "8": { label: "rendo i fotogrammi", da: 0.85, a: 0.94 },
  "21": { label: "rendo il suono", da: 0.94, a: 0.96 },
  "9": { label: "compongo la clip", da: 0.96, a: 0.98 },
  "12": { label: "salvo la clip", da: 0.98, a: 1 },
};
