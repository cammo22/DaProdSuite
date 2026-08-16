/**
 * I modelli fra cui si sceglie, e i grafi che si mandano al motore.
 *
 * Due, con caratteri diversi. **Anima** è un turbo: dieci passi, CFG 1,0, 5,6 GB,
 * ed è già sul disco perché Musica la usa per le copertine — si genera subito,
 * senza scaricare niente. **FLUX.2 Klein** è il modello grosso: 11,2 GB fra pesi
 * e text encoder, venti passi, capisce descrizioni lunghe e articolate. Costa
 * l'attesa dello scaricamento e qualche decina di secondi in più a immagine.
 *
 * I due non si somigliano nemmeno nei nodi. Anima gira sui nodi di serie del
 * motore; FLUX.2 in GGUF vuole `UnetLoaderGGUF` e `CLIPLoaderGGUF`, cioè il nodo
 * custom ComfyUI-GGUF, e un campionatore montato a pezzi (`CFGGuider` +
 * `SamplerCustomAdvanced` + `Flux2Scheduler`) invece del `KSampler` unico. Per
 * questo ogni modello si porta i propri grafi invece di riempire di "se" un
 * grafo solo: quando ne entrerà un terzo si aggiunge una voce qui sotto e
 * l'interfaccia non cambia di una riga.
 *
 * I nomi dei file dei pesi non sono scelti qui: vengono da `manifest/models.json`,
 * che è l'unico posto dove sta scritto cosa scarica la suite e come si chiama.
 * `catalogo` sono gli id di quel file, e servono a chiedere alla suite se il
 * modello c'è già.
 */

import { ESTETICHE, NEGATIVO } from "./dati/estetiche.js";

/* ------------------------------------------------------------------- Anima */

/** I nodi che non cambiano fra il generare da zero e il rifare una zona. */
function comuniAnima(m, p) {
  return {
    "1": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "stable_diffusion" } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: p.prompt } },
    "4": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: p.negativo || NEGATIVO } },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
  };
}

function immagineAnima(m, p) {
  return {
    ...comuniAnima(m, p),
    "5": {
      class_type: "EmptySD3LatentImage",
      inputs: { width: p.larghezza, height: p.altezza, batch_size: 1 },
    },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], positive: ["3", 0], negative: ["4", 0], latent_image: ["5", 0],
        seed: p.seed, steps: p.passi, cfg: p.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "immagini/daprod" } },
  };
}

/**
 * Il ritocco: la zona dipinta viene rifatta, il resto resta identico.
 *
 * `SetLatentNoiseMask` dice al campionatore dove può mettere le mani, e
 * `denoise` sotto 1 fa partire dal latente dell'immagine invece che dal rumore —
 * è quello che tiene la forma di ciò che c'era. Con `denoise` a 1 la zona si
 * rifà da capo senza guardare cosa c'era prima.
 */
function ritoccoAnima(m, p) {
  return {
    ...comuniAnima(m, p),
    "10": { class_type: "LoadImage", inputs: { image: p.immagine } },
    // canale rosso: il pennello dipinge in rosso, e quello che è rosso si rifà.
    "11": { class_type: "LoadImageMask", inputs: { image: p.maschera, channel: "red" } },
    "12": { class_type: "VAEEncode", inputs: { pixels: ["10", 0], vae: ["7", 0] } },
    "13": { class_type: "SetLatentNoiseMask", inputs: { samples: ["12", 0], mask: ["11", 0] } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], positive: ["3", 0], negative: ["4", 0], latent_image: ["13", 0],
        seed: p.seed, steps: p.passi, cfg: p.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: p.denoise,
      },
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "immagini/ritocco" } },
  };
}

/* ------------------------------------------------------------ FLUX.2 Klein */

/**
 * I nodi comuni della strada FLUX.2, come nel grafo ufficiale del modello.
 *
 * Klein è distillato: lavora a CFG 1, e a CFG 1 il negativo non viene guardato.
 * Invece di mandargli un testo che verrebbe ignorato si passa un conditioning
 * azzerato (`ConditioningZeroOut`), che è quello che il grafo ufficiale fa e
 * costa un encoding in meno.
 */
function comuniFlux(m, p) {
  return {
    "1": { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.dit } },
    "2": { class_type: "CLIPLoaderGGUF", inputs: { clip_name: m.txt, type: "flux2" } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: p.prompt } },
    "4": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["3", 0] } },
    "5": {
      class_type: "CFGGuider",
      inputs: { model: ["1", 0], positive: ["3", 0], negative: ["4", 0], cfg: p.cfg },
    },
    "6": { class_type: "RandomNoise", inputs: { noise_seed: p.seed } },
    "7": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    // Lo scheduler di FLUX.2 vuole anche le misure: il numero di passi utili
    // dipende da quanti pixel ci sono da fare.
    "8": {
      class_type: "Flux2Scheduler",
      inputs: { steps: p.passi, width: p.larghezza, height: p.altezza },
    },
    "9": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "10": { class_type: "VAEDecode", inputs: { samples: ["12", 0], vae: ["9", 0] } },
  };
}

function immagineFlux(m, p) {
  return {
    ...comuniFlux(m, p),
    "11": {
      class_type: "EmptyFlux2LatentImage",
      inputs: { width: p.larghezza, height: p.altezza, batch_size: 1 },
    },
    "12": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        noise: ["6", 0], guider: ["5", 0], sampler: ["7", 0],
        sigmas: ["8", 0], latent_image: ["11", 0],
      },
    },
    "13": { class_type: "SaveImage", inputs: { images: ["10", 0], filename_prefix: "immagini/daprod" } },
  };
}

/**
 * Il ritocco con FLUX.2.
 *
 * Stessa idea di quello di Anima — maschera sul latente e denoise parziale — ma
 * qui il denoise non è un numero da passare al campionatore: si taglia lo
 * schedule con `SplitSigmasDenoise` e si prende la seconda metà (`low_sigmas`),
 * che è il modo in cui i campionatori a pezzi fanno la stessa cosa.
 */
function ritoccoFlux(m, p) {
  return {
    ...comuniFlux(m, p),
    "14": { class_type: "LoadImage", inputs: { image: p.immagine } },
    "15": { class_type: "LoadImageMask", inputs: { image: p.maschera, channel: "red" } },
    "16": { class_type: "VAEEncode", inputs: { pixels: ["14", 0], vae: ["9", 0] } },
    "17": { class_type: "SetLatentNoiseMask", inputs: { samples: ["16", 0], mask: ["15", 0] } },
    "18": { class_type: "SplitSigmasDenoise", inputs: { sigmas: ["8", 0], denoise: p.denoise } },
    "12": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        noise: ["6", 0], guider: ["5", 0], sampler: ["7", 0],
        sigmas: ["18", 1], latent_image: ["17", 0],
      },
    },
    "13": { class_type: "SaveImage", inputs: { images: ["10", 0], filename_prefix: "immagini/ritocco" } },
  };
}

/* ------------------------------------------------------------- il catalogo */

/** Quello che i due FLUX.2 hanno in comune: cambia solo il modello che disegna. */
const FLUX_COMUNE = {
  txt: "Qwen3-8B-Q5_K_M.gguf",
  vae: "flux2-vae.safetensors",
  passi: { min: 8, max: 40, valore: 20 },
  // Klein è distillato: il CFG resta a 1 e non c'è niente da guadagnare ad
  // alzarlo, quindi il cursore non si muove e il negativo non serve.
  cfg: { min: 1, max: 1, valore: 1 },
  usaNegativo: false,
  immagine: immagineFlux,
  ritocco: ritoccoFlux,
};

export const MODELLI = {
  anima: {
    id: "anima",
    nome: "Anima",
    riga: "Veloce, già sul disco. Dieci passi bastano.",
    dit: "anima-turbo-v1.0.safetensors",
    txt: "qwen_3_06b_base.safetensors",
    vae: "qwen_image_vae.safetensors",
    catalogo: ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"],
    // Anima è un modello turbo: dieci passi e CFG 1,0 sono il suo punto di
    // lavoro, non un risparmio.
    passi: { min: 4, max: 30, valore: 10 },
    cfg: { min: 1, max: 4, valore: 1 },
    /** A CFG 1,0 il negativo è ignorato, ma alzando il CFG torna a contare. */
    usaNegativo: true,
    immagine: immagineAnima,
    ritocco: ritoccoAnima,
  },
  "flux2-4b": {
    ...FLUX_COMUNE,
    id: "flux2-4b",
    nome: "FLUX.2 Klein 4B",
    riga: "Il FLUX leggero: 8,4 GB in tutto, e su 8 GB di VRAM sta comodo.",
    dit: "flux-2-klein-4b-Q5_K_M.gguf",
    catalogo: ["flux2-klein-4b-q5km", "flux2-text-encoder", "flux2-vae"],
  },
  "flux2-9b": {
    ...FLUX_COMUNE,
    id: "flux2-9b",
    nome: "FLUX.2 Klein 9B",
    riga: "Il più bravo con le descrizioni lunghe. 11,2 GB, e più lento.",
    dit: "flux-2-klein-9b-Q4_K_S.gguf",
    catalogo: ["flux2-klein-q4ks", "flux2-text-encoder", "flux2-vae"],
  },
};

/** Il modello con quell'id, o Anima se l'id non esiste più (menu vecchio). */
export function modello(id) {
  return MODELLI[id] ?? MODELLI.anima;
}

export const grafoImmagine = (m, p) => m.immagine(m, p);
export const grafoRitocco = (m, p) => m.ritocco(m, p);

/**
 * La descrizione che va al modello: quello che hai scritto, e basta.
 *
 * Prima ci si attaccava dietro l'estetica scelta nel menu e un "high detail"
 * fisso. Vuol dire che ogni immagine partiva con le stesse dieci parole
 * incollate in fondo, e i modelli le seguono: le foto si somigliavano tutte
 * senza che si capisse perché, perché quelle parole non erano scritte da
 * nessuna parte. Adesso l'estetica, se la vuoi, te la scrive **nella casella**
 * il menu — la vedi, la cambi, la togli.
 */
export function componiPrompt(testo) {
  return testo.trim();
}

/** Le parole di un'estetica, da scrivere nella casella. Vuoto se non ne hai scelta una. */
export function paroleEstetica(estetica) {
  return ESTETICHE[estetica] || "";
}
