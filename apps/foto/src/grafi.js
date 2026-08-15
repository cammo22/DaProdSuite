/**
 * I grafi che si mandano al motore.
 *
 * **Anima**, non FLUX. Il progetto da cui viene quest'app usava FLUX.2 Klein con
 * `UnetLoaderGGUF` e `CLIPLoaderGGUF`, cioè il custom node ComfyUI-GGUF, che nel
 * nostro motore non c'è — e i 12,4 GB di pesi non si possono nemmeno scaricare
 * finché la suite non sa scaricare i modelli. Anima invece gira su nodi core, sta
 * in 5,6 GB, ed è già su disco perché Musica la usa per le copertine: da lì
 * arriva il "Anima di base, FLUX.2 Klein come extra" del catalogo.
 *
 * Anima è un modello turbo: dieci passi e CFG 1,0 sono il suo punto di lavoro,
 * non un risparmio.
 */

import { ESTETICHE, NEGATIVO } from "./dati/estetiche.js";

/**
 * Il modello con cui si genera.
 *
 * Uno solo per ora. Quando ce ne sarà più d'uno questo diventa un elenco e il
 * nome finisce in un menu: intanto il `nome` viaggia già nei metadati di ogni
 * immagine, così una foto fatta oggi resta riconoscibile quando ce ne saranno
 * tre da cui scegliere.
 */
export const MODELLO = {
  nome: "Anima",
  dit: "anima-turbo-v1.0.safetensors",
  txt: "qwen_3_06b_base.safetensors",
  vae: "qwen_image_vae.safetensors",
};

const MODELLI = MODELLO;

/** I nodi che non cambiano fra il generare da zero e il rifare una zona. */
function comuni(p) {
  return {
    "1": { class_type: "UNETLoader", inputs: { unet_name: MODELLI.dit, weight_dtype: "default" } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: MODELLI.txt, type: "stable_diffusion" } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: p.prompt } },
    "4": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: p.negativo || NEGATIVO } },
    "7": { class_type: "VAELoader", inputs: { vae_name: MODELLI.vae } },
  };
}

export function grafoImmagine(p) {
  return {
    ...comuni(p),
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
export function grafoRitocco(p) {
  return {
    ...comuni(p),
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

/** La descrizione completa: quello che hai scritto più l'estetica scelta. */
export function componiPrompt(testo, estetica) {
  return [testo.trim(), ESTETICHE[estetica] || "", "high detail"].filter(Boolean).join(", ");
}
