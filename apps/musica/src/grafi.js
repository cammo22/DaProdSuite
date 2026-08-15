/**
 * I grafi che si mandano al motore.
 *
 * Sono l'unica cosa di ComfyUI che l'app deve conoscere davvero, e usano solo
 * nodi **core**: nessun custom node, nessun pacchetto da installare, nessun
 * grafo salvato su file da tenere allineato all'interfaccia.
 */

import { COVER_NEG, ESTETICHE, MOTIVI } from "./dati/estetiche.js";

const MODELLI = {
  dit: "minimax_music3_dit_w4a8.safetensors",
  txt: "minimax_music3_qwen2-7B_pruned_w4a8.safetensors",
  vae: "minimax_music3_dav.safetensors",
};
const MODELLI_IMMAGINE = {
  dit: "anima-turbo-v1.0.safetensors",
  txt: "qwen_3_06b_base.safetensors",
  vae: "qwen_image_vae.safetensors",
};

const PREFISSO = "audio/daprodmusica";
const SALVATAGGI = {
  mp3: { class_type: "SaveAudioMP3", inputs: { audio: ["8", 0], filename_prefix: PREFISSO, quality: "V0" } },
  opus: { class_type: "SaveAudioOpus", inputs: { audio: ["8", 0], filename_prefix: PREFISSO, quality: "192k" } },
  flac: { class_type: "SaveAudio", inputs: { audio: ["8", 0], filename_prefix: PREFISSO } },
};

/**
 * Il brano.
 *
 * I nodi 1-2-5 dipendono solo dai parametri di struttura: se non cambiano,
 * ComfyUI li riprende dalla cache e salta la generazione autoregressiva, che è
 * la parte lenta. È il motivo per cui "solo nuova resa" costa 17 secondi invece
 * di 107 — basta cambiare il seed dell'audio e lasciare fermo quello del testo.
 */
export function grafoBrano(p) {
  return {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: MODELLI.txt, type: "minimax" } },
    "2": {
      class_type: "MiniMaxMusic3TextEncode",
      inputs: {
        clip: ["1", 0], caption: p.caption, lyrics: p.lyrics,
        seed: p.seed_text, max_duration: p.duration, cfg_scale: p.cfg_scale, top_k: p.top_k,
      },
    },
    "3": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["2", 0] } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: MODELLI.dit, weight_dtype: "default" } },
    "5": { class_type: "EmptyMiniMaxMusic3LatentAudio", inputs: { seconds: ["2", 1], batch_size: 1 } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["4", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["5", 0],
        seed: p.seed_audio, steps: p.steps, cfg: p.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: MODELLI.vae } },
    "8": p.tiled
      ? { class_type: "VAEDecodeAudioTiled", inputs: { samples: ["6", 0], vae: ["7", 0], tile_size: p.tile, overlap: 64 } }
      : { class_type: "VAEDecodeAudio", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": SALVATAGGI[p.format],
  };
}

/**
 * Un'immagine.
 *
 * `salva` distingue i due usi. Un'immagine della scheda Immagini si tiene, e
 * finisce in libreria come risultato a sé. Una copertina no: viene ritagliata e
 * scritta accanto al brano, quindi va nei file temporanei del motore — se
 * finisse in output, la libreria si riempirebbe di copertine sciolte che nessuno
 * ha chiesto.
 */
export function grafoImmagine(prompt, seed, { larghezza = 1024, altezza = 1024, salva = false } = {}) {
  return {
    "1": { class_type: "UNETLoader", inputs: { unet_name: MODELLI_IMMAGINE.dit, weight_dtype: "default" } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: MODELLI_IMMAGINE.txt, type: "stable_diffusion" } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: prompt } },
    "4": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: COVER_NEG } },
    "5": { class_type: "EmptySD3LatentImage", inputs: { width: larghezza, height: altezza, batch_size: 1 } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], positive: ["3", 0], negative: ["4", 0], latent_image: ["5", 0],
        seed, steps: 10, cfg: 1.0, sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: MODELLI_IMMAGINE.vae } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": salva
      ? { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "immagini/daprod" } }
      : { class_type: "PreviewImage", inputs: { images: ["8", 0] } },
  };
}

/** Dalla canzone alla scena: titolo e testo scelgono i motivi, il menu lo stile. */
export function promptCopertina(titolo, testo, estetica) {
  const fonte = `${titolo} ${testo || ""}`;
  const scena = MOTIVI.filter(([re]) => re.test(fonte)).slice(0, 3).map(([, t]) => t);
  if (!scena.length) scena.push("an evocative symbolic object at the centre of an empty scene");
  const stile = ESTETICHE[estetica] || ESTETICHE["Illustrazione"];
  return `album cover artwork, ${scena.join(", ")}, ${stile}, square composition, high detail, no text`;
}

/** Dalla descrizione libera della scheda Immagini, con i motivi come rinforzo. */
export function promptLibero(testo, estetica) {
  const scena = MOTIVI.filter(([re]) => re.test(testo)).slice(0, 2).map(([, t]) => t);
  return [testo.trim(), ...scena, ESTETICHE[estetica] || "", "high detail, no text"]
    .filter(Boolean)
    .join(", ");
}

/**
 * Dove sta il lavoro, nodo per nodo.
 *
 * La barra è una sola ma divisa in due fasi: la struttura (il decoder
 * autoregressivo, ~80% del tempo) e il suono (diffusione e decodifica). Senza
 * questa divisione l'avanzamento sembrerebbe fermo per minuti e poi schizzare.
 */
export const SEPARAZIONE = 0.8;

export const FASI = {
  "1": { label: "carico il modello di testo", da: 0, a: 0.03, fase: 1 },
  "2": { label: "compongo la struttura", da: 0.03, a: SEPARAZIONE, fase: 1 },
  "4": { label: "carico il modello musicale", da: SEPARAZIONE, a: 0.82, fase: 2 },
  "6": { label: "genero il suono", da: 0.82, a: 0.95, fase: 2 },
  "7": { label: "carico il VAE", da: 0.95, a: 0.96, fase: 2 },
  "8": { label: "rendo l'audio", da: 0.96, a: 0.99, fase: 2 },
  "9": { label: "salvo il file", da: 0.99, a: 1, fase: 2 },
};

/** Il titolo ricavato dal testo: la prima riga cantata del ritornello. */
export function titoloAuto(testo, stile) {
  const righe = (testo || "").split("\n").map((r) => r.trim());
  const iCoro = righe.findIndex((r) => /^\[chorus\]/i.test(r));
  const candidata = (iCoro >= 0 ? righe.slice(iCoro + 1) : righe).find((r) => r && !r.startsWith("["));
  const base = candidata || (stile || "").split(",")[0] || "Senza titolo";
  return base.replace(/[^\p{L}\p{N} ',.!?-]/gu, "").trim().slice(0, 44) || "Senza titolo";
}
