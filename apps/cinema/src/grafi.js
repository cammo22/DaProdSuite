/**
 * I grafi di DaProdCinema: una clip, e il montaggio finale.
 *
 * Come in DaProdMusica e DaProdFoto: solo nodi **core** di ComfyUI, nessun
 * custom node, nessun grafo salvato su file da tenere allineato a mano.
 *
 * **Perché Wan 2.2 e non LTX 2.3 o MiniMax H3.** La roadmap aveva scelto quei
 * due, e la scelta era giusta sulla carta: sono i due che il video lo fanno col
 * suono dentro. Poi si sono guardati i pesi, e sulla carta è finita:
 *
 * | | Da scaricare | Sulla 4060 da 8 GB |
 * |---|---|---|
 * | LTX 2.3 | 22B in fp8 (~23 GB) + Gemma 3 12B (9,4 GB) | quasi tutto fuori dalla scheda |
 * | Wan 2.2 14B | due modelli da 14 GB, alto e basso rumore | idem |
 * | **Wan 2.2 TI2V 5B** | **10 + 6,7 + 1,4 = 18,1 GB** | **un modello solo, e si muove** |
 *
 * Il 5B è anche l'unico che fa testo→video **e** immagine→video con lo stesso
 * file, e quella è la proprietà su cui sta in piedi tutto il resto: l'ultimo
 * fotogramma di un'inquadratura diventa il primo della successiva, ed è così che
 * diciassette clip diventano un video invece di diciassette video.
 *
 * E poi è la famiglia di WanGP, che è il metro con cui misuriamo la memoria.
 *
 * LTX 2.3 e H3 restano in roadmap, non nel menu: nel menu ci va quello che è
 * stato provato, e provarli vuol dire prima scaricare trenta GB per ognuno.
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
 * I lati sono multipli di 32: il VAE della 2.2 comprime sedici volte nello
 * spazio, e una misura che non torna la arrotonda lui, in silenzio, spostando
 * l'inquadratura.
 */
export const MISURE = {
  provino: { id: "provino", nome: "Provino — 640×352", larghezza: 640, altezza: 352 },
  normale: { id: "normale", nome: "Normale — 832×480", larghezza: 832, altezza: 480 },
  grande: { id: "grande", nome: "Grande — 1280×704", larghezza: 1280, altezza: 704 },
};

const WAN = {
  txt: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
  dit: "wan2.2_ti2v_5B_fp16.safetensors",
  vae: "wan2.2_vae.safetensors",
};

/**
 * Il negativo, in cinese, ed è di proposito.
 *
 * È quello del flusso ufficiale di ComfyUI per Wan 2.2, parola per parola. Wan è
 * addestrato in cinese e in inglese, e il negativo cinese è quello con cui è
 * stato messo a punto: tradurlo in inglese lo indebolisce. Dice più o meno
 * «colori slavati, sovraesposto, statico, dettagli confusi, sottotitoli, stile,
 * opera, dipinto, immagine ferma, grigiastro, pessima qualità, artefatti JPEG,
 * brutto, mutilato, dita in più, mani fatte male, volti fatti male, deformato,
 * sfigurato, arti malformati, dita fuse, immagine immobile, sfondo confuso, tre
 * gambe, troppa gente sullo sfondo, che cammina all'indietro».
 */
const NEGATIVO =
  "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走";

/** Ventiquattro fotogrammi al secondo: quelli con cui il 5B è stato addestrato. */
export const FPS = 24;

export const MODELLI = {
  "wan22-5b": {
    id: "wan22-5b",
    nome: "Wan 2.2 TI2V 5B",
    riga: "18,1 GB. L'unico dei tre che su 8 GB fa una clip in un tempo che si aspetta.",
    ...WAN,
    catalogo: ["wan22-ti2v-5b", "wan22-text-encoder", "wan22-vae"],
    /** Dal flusso ufficiale di ComfyUI per il 5B: trenta passi, CFG 5, shift 8. */
    passi: { min: 6, max: 40, valore: 30 },
    cfg: 5,
    shift: 8,
    fps: FPS,
  },
};

export const modello = (id) => MODELLI[id] ?? MODELLI["wan22-5b"];

/**
 * Quanti fotogrammi per tot secondi, nella misura che Wan accetta.
 *
 * Il VAE comprime quattro volte nel tempo, quindi la lunghezza deve essere
 * `4n + 1`: 49, 97, 121. Un numero qualunque non dà errore — lo arrotonda il
 * motore, e la clip esce più corta o più lunga di quello che il regista aveva
 * calcolato. Meglio arrotondare qui, dove si può anche dire di quanto.
 */
export function fotogrammi(secondi, fps = FPS) {
  const grezzi = Math.round(secondi * fps);
  return Math.max(5, Math.round((grezzi - 1) / 4) * 4 + 1);
}

/**
 * Una clip.
 *
 * `primoFotogramma`, se c'è, è il nome di un file già dentro la cartella
 * `input` del motore — ce lo mette `ponte.carica`. È l'ultimo fotogramma della
 * clip precedente, ed è tutto quello che serve perché due inquadrature sembrino
 * lo stesso video: senza, ogni clip si inventa un mondo suo e il montaggio
 * finale è una carrellata di cartoline scollegate.
 *
 * **`VAEDecodeTiled` e non `VAEDecode`.** Decodificare centoventi fotogrammi in
 * un colpo è il punto in cui la memoria finisce — non durante la diffusione,
 * dopo, quando il lavoro sembrava già fatto. A blocchi ci mette qualche secondo
 * in più e non fallisce, e su una scheda da 8 GB questo è tutto lo scambio.
 */
export function grafoClip(m, p) {
  const misura = MISURE[p.misura] ?? MISURE.provino;
  const lunghezza = fotogrammi(p.secondi, m.fps);

  const grafo = {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "wan", device: "default" } },
    "2": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: p.prompt } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: NEGATIVO } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "5": {
      class_type: "Wan22ImageToVideoLatent",
      inputs: {
        vae: ["7", 0],
        width: misura.larghezza,
        height: misura.altezza,
        length: lunghezza,
        batch_size: 1,
        ...(p.primoFotogramma ? { start_image: ["11", 0] } : {}),
      },
    },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["10", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["5", 0],
        seed: p.seed, steps: p.passi, cfg: m.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "8": {
      class_type: "VAEDecodeTiled",
      inputs: {
        samples: ["6", 0], vae: ["7", 0],
        tile_size: 256, overlap: 64,
        // Nel tempo, non nello spazio: sedici fotogrammi per volta con quattro
        // di sovrapposizione. È la manopola che decide se la decodifica entra.
        temporal_size: 16, temporal_overlap: 4,
      },
    },
    "9": { class_type: "CreateVideo", inputs: { images: ["8", 0], fps: m.fps } },
    "10": { class_type: "ModelSamplingSD3", inputs: { model: ["4", 0], shift: m.shift } },
    "12": {
      class_type: "SaveVideo",
      inputs: {
        video: ["9", 0],
        filename_prefix: `video/daprodcinema/${p.cartella}/clip`,
        format: "mp4",
        codec: "h264",
      },
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
 * ferma per minuti e poi salta alla fine. Qui la parte lunga è il nodo 6, la
 * diffusione, e la seconda che si sente è la decodifica a blocchi.
 */
export const FASI = {
  "1": { label: "carico il modello di testo", da: 0, a: 0.04 },
  "2": { label: "leggo l'inquadratura", da: 0.04, a: 0.06 },
  "4": { label: "carico il modello video", da: 0.06, a: 0.1 },
  "5": { label: "preparo i fotogrammi", da: 0.1, a: 0.12 },
  "6": { label: "genero il movimento", da: 0.12, a: 0.85 },
  "8": { label: "rendo i fotogrammi", da: 0.85, a: 0.96 },
  "9": { label: "compongo la clip", da: 0.96, a: 0.98 },
  "12": { label: "salvo la clip", da: 0.98, a: 1 },
};
