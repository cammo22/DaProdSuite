/**
 * I grafi che si mandano al motore.
 *
 * Sono l'unica cosa di ComfyUI che l'app deve conoscere davvero, e usano solo
 * nodi **core**: nessun custom node, nessun pacchetto da installare, nessun
 * grafo salvato su file da tenere allineato all'interfaccia.
 */

import { COVER_NEG, ESTETICHE, MOTIVI } from "./dati/estetiche.js";
import { LINGUE } from "./dati/ace.js";

/**
 * Con che cosa si fa il brano: due famiglie di modelli, tre voci nel menu.
 *
 * Fino alla 0.3.4 questo menu si chiamava «qualità» e sceglieva soltanto fra i
 * due formati del DiT di MiniMax. Adesso sceglie il **modello**, perché accanto
 * a MiniMax Music 3 c'è ACE-Step 1.5, che è un altro modo di fare la stessa
 * cosa e non una versione più fine dello stesso.
 *
 * **Il MiniMax a 4 bit non c'è più.** Era la voce «leggera», il DiT W4A8 da 1,8
 * GB, ed è stata tolta nella 0.4.1: 700 MB risparmiati su uno scaricamento da
 * sette GB e mezzo, in cambio della parte che si sente — il DiT è quello che
 * trasforma i token in suono. Chi l'aveva scelta si ritrova sull'int8 senza
 * fare niente, e il file vecchio si può cancellare dalla cartella dei modelli.
 *
 * **MiniMax Music 3.** Il text encoder non è scegliibile e non è una
 * dimenticanza: è il modello da 7B che genera i token audio uno per uno, lavora
 * da solo in VRAM, e la versione a 8 bit consigliata da WanGP pesa 8,6 GB — su
 * una scheda da 8 non ci sta. Resta a 4 bit finché non cambia la scheda, ed è
 * l'unico pezzo a 4 bit rimasto. Il DiT invece sta in 2,5 GB anche a 8 bit.
 *
 * **ACE-Step 1.5.** Otto passi invece di trenta. I nodi sono nativi di ComfyUI —
 * `TextEncodeAceStepAudio1.5`, `EmptyAceStep1.5LatentAudio` — quindi non c'è
 * niente da installare nel motore, solo pesi da scaricare. Vuole **due** text
 * encoder insieme (`DualCLIPLoader`, tipo `ace`): il piccolo per i tag, il
 * grande per il testo cantato. E vuole `ModelSamplingAuraFlow` fra il modello e
 * il campionatore: senza, il campionatore lavora sulla scala di rumore
 * sbagliata e viene fuori un ronzio.
 *
 * Il **Turbo** sta negli 8 GB e va veloce. L'**XL Turbo** pesa 10 GB da solo:
 * ComfyUI lo fa girare lo stesso spostando i pesi fra scheda e RAM, ma il tempo
 * per brano è un'altra cosa. Per questo il Turbo normale è quello che parte, e
 * l'XL è una scelta che si fa sapendo cosa costa.
 */
const MINIMAX = {
  famiglia: "minimax",
  txt: "minimax_music3_qwen2-7B_pruned_w4a8.safetensors",
  vae: "minimax_music3_dav.safetensors",
  grafo: grafoMiniMax,
  /** Quali comandi degli avanzati vogliono dire qualcosa per questa famiglia. */
  campi: ["steps", "cfg", "cfg_scale", "top_k", "tiled"],
  passi: { min: 10, max: 60, valore: 30 },
  /**
   * La lingua qui non è un'impostazione: è una frase dentro la descrizione.
   *
   * `MiniMaxMusic3TextEncode` ha due caselle di testo, la descrizione e il
   * testo cantato, e nient'altro. Quindi la lingua si dice dove il modello
   * legge: in fondo alla descrizione, in inglese come tutto il resto.
   */
  lingua: "descrizione",
  comuni: ["minimax-music3-text-encoder", "minimax-music3-vae"],
};

const ACE = {
  famiglia: "ace",
  txt1: "qwen_0.6b_ace15.safetensors",
  txt2: "qwen_4b_ace15.safetensors",
  vae: "ace_1.5_vae.safetensors",
  grafo: grafoAce,
  campi: ["steps", "cfg", "cfg_scale", "bpm", "tonalita", "tempo", "tiled"],
  /** Qui invece la lingua è una casella vera del nodo, con l'elenco chiuso. */
  lingua: "impostazione",
  /**
   * **Otto passi**, e non è un risparmio: è come è fatto.
   *
   * È il numero del flusso ufficiale di ComfyUI per questo modello. Alzarlo non
   * dà una canzone migliore — i modelli turbo sono distillati per finire lì — ma
   * il cursore resta aperto fino a trenta perché provare costa poco e la prova
   * la fa chi ascolta, non chi scrive il programma.
   */
  passi: { min: 4, max: 30, valore: 8 },
  /** Lo scarto di rumore di `ModelSamplingAuraFlow`, dal flusso ufficiale. */
  shift: 3,
  comuni: ["acestep15-qwen-06b", "acestep15-qwen-4b", "acestep15-vae"],
};

/**
 * L'ordine è quello del menu, e il primo è quello che parte.
 *
 * ACE-Step Turbo davanti a MiniMax dalla 0.4.1, ed è una cosa che si è decisa
 * ascoltando: otto passi contro trenta, e sulle parole si capisce meglio. Chi
 * ha già scelto a mano tiene la sua scelta — questo cambia solo il primo brano
 * di chi non ha ancora scelto niente.
 */
export const MODELLI = {
  "ace-turbo": {
    ...ACE,
    id: "ace-turbo",
    nome: "ACE-Step 1.5 Turbo",
    riga: "Otto passi. 4,8 GB di modello, e negli 8 GB della scheda ci sta tutto.",
    dit: "acestep_v1.5_turbo.safetensors",
    catalogo: ["acestep15-turbo", ...ACE.comuni],
  },
  "ace-xl-turbo": {
    ...ACE,
    id: "ace-xl-turbo",
    nome: "ACE-Step 1.5 XL Turbo",
    riga: "Il grande: 10 GB. Sulla tua scheda gira in offload, quindi più lento.",
    dit: "acestep_v1.5_xl_turbo_bf16.safetensors",
    catalogo: ["acestep15-xl-turbo", ...ACE.comuni],
  },
  migliore: {
    ...MINIMAX,
    id: "migliore",
    nome: "MiniMax Music 3 (int8)",
    riga: "8 GB in tutto e trenta passi: è il più lento dei tre, e l'unico senza casella della lingua.",
    dit: "minimax_music3_dit_int8_convrot.safetensors",
    catalogo: ["minimax-music3-dit-int8", ...MINIMAX.comuni],
  },
};

/** Il modello scelto, o quello che parte se l'id salvato non esiste più. */
export const modello = (id) => MODELLI[id] ?? MODELLI["ace-turbo"];

/** Vero se questo comando degli avanzati vuol dire qualcosa per questo modello. */
export const usaCampo = (m, campo) => m.campi.includes(campo);
const MODELLI_IMMAGINE = {
  dit: "anima-turbo-v1.0.safetensors",
  txt: "qwen_3_06b_base.safetensors",
  vae: "qwen_image_vae.safetensors",
};

/**
 * Con che modello si fa **la copertina**. Due, dalla 0.9.1.
 *
 * Chiesto il 5 settembre 2026: «anche la possibilità di scegliere anima o flux
 * per la copertina», e «rendiamo flux klein 4b default per le immagini, lo
 * stesso per le copertine».
 *
 * **Perché due e non quattro.** Una copertina è un quadrato che si guarda in
 * una lista: i due FLUX grossi ci starebbero, ma vorrebbero dire caricare
 * undici giga in scheda subito dopo aver fatto un brano — e su 8 GB è la strada
 * per l'out-of-memory. Anima resta perché è la più veloce e non serve la
 * scheda; Klein 4B perché capisce le descrizioni lunghe, che è quello che si
 * scrive quando si dice come deve essere una copertina.
 *
 * Gli id sono gli stessi di DaProdFoto, e non è un caso: chi chiede da fuori
 * dice «flux2-4b» e vale in tutte e due le schede.
 */
export const MODELLI_COPERTINA = {
  anima: {
    id: "anima",
    nome: "Anima",
    grafo: (prompt, seed, opzioni) => grafoAnima(prompt, seed, opzioni),
    catalogo: [],
  },
  "flux2-4b": {
    id: "flux2-4b",
    nome: "FLUX.2 Klein 4B",
    dit: "flux-2-klein-4b-Q5_K_M.gguf",
    txt: "Qwen3-4B-Q5_K_M.gguf",
    vae: "flux2-vae.safetensors",
    grafo: (prompt, seed, opzioni) => grafoFluxCopertina(prompt, seed, opzioni),
    catalogo: ["flux2-klein-4b-q5km", "flux2-4b-text-encoder", "flux2-vae"],
  },
};

/**
 * La copertina con FLUX.2 Klein 4B.
 *
 * È il grafo di DaProdFoto ridotto all'osso: niente ritocco, niente misure
 * libere, niente negativo. Klein è distillato e lavora a CFG 1, e a CFG 1 il
 * negativo non viene guardato — si passa un conditioning azzerato, che è quello
 * che fa il flusso ufficiale e costa un encoding in meno.
 *
 * ⚠ Il testo del prompt qui **non si traduce**: FLUX.2 legge con un Qwen3, che
 * l'italiano lo capisce. È la differenza con Anima, che l'inglese lo vuole.
 */
function grafoFluxCopertina(prompt, seed, { larghezza = 1024, altezza = 1024, salva = false } = {}) {
  const m = MODELLI_COPERTINA["flux2-4b"];
  return {
    "1": { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.dit } },
    "2": { class_type: "CLIPLoaderGGUF", inputs: { clip_name: m.txt, type: "flux2" } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: prompt } },
    "4": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["3", 0] } },
    "5": {
      class_type: "CFGGuider",
      inputs: { model: ["1", 0], positive: ["3", 0], negative: ["4", 0], cfg: 1 },
    },
    "6": { class_type: "RandomNoise", inputs: { noise_seed: seed } },
    "7": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "8": {
      class_type: "Flux2Scheduler",
      inputs: { steps: 20, width: larghezza, height: altezza },
    },
    "9": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "11": {
      class_type: "EmptyFlux2LatentImage",
      inputs: { width: larghezza, height: altezza, batch_size: 1 },
    },
    "12": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        noise: ["6", 0], guider: ["5", 0], sampler: ["7", 0],
        sigmas: ["8", 0], latent_image: ["11", 0],
      },
    },
    "10": { class_type: "VAEDecode", inputs: { samples: ["12", 0], vae: ["9", 0] } },
    "13": salva
      ? { class_type: "SaveImage", inputs: { images: ["10", 0], filename_prefix: "immagini/daprod" } }
      : { class_type: "PreviewImage", inputs: { images: ["10", 0] } },
  };
}

const PREFISSO = "audio/daprodmusica";
const SALVATAGGI = {
  mp3: { class_type: "SaveAudioMP3", inputs: { audio: ["8", 0], filename_prefix: PREFISSO, quality: "V0" } },
  opus: { class_type: "SaveAudioOpus", inputs: { audio: ["8", 0], filename_prefix: PREFISSO, quality: "192k" } },
  flac: { class_type: "SaveAudio", inputs: { audio: ["8", 0], filename_prefix: PREFISSO } },
};

/**
 * Il brano, col modello scelto nel menu.
 *
 * **La numerazione dei nodi è la stessa per tutti e due i grafi**, e non per
 * pigrizia: `FASI` qui sotto traduce «sta lavorando il nodo 2» in «compongo la
 * struttura», e la barra di DaProdMusica legge quella tabella. Numerare uguale
 * vuol dire che la barra funziona con ACE-Step senza sapere che ACE-Step esiste.
 * Chi aggiunge un terzo modello domani tenga lo stesso ordine: 1 il caricamento
 * del testo, 2 la parte lunga, 4 il modello musicale, 6 il campionatore, 7-8 il
 * suono, 9 il file.
 */
export const grafoBrano = (m, p) => m.grafo(m, p);

/**
 * La descrizione dello stile, con la lingua dentro quando serve.
 *
 * ACE-Step la lingua ce l'ha come casella sua e questa funzione non tocca
 * niente. MiniMax Music 3 no: i suoi ingressi di testo sono due, la descrizione
 * e il testo cantato, e quindi la lingua si dice nella descrizione — in inglese,
 * come tutto quello che ci sta dentro.
 *
 * `clearly enunciated lyrics` sta lì apposta: è il difetto per cui questa riga
 * esiste, cioè parole cantate che si capiscono a metà. Non è una garanzia — è
 * un modello che indovina, non un interruttore — ma è l'unico posto in cui
 * questa richiesta gli arriva.
 *
 * Se la descrizione **dice già** la lingua (uno che scrive «neapolitan
 * neomelodic» sa cosa sta chiedendo) non si aggiunge niente: due volte la stessa
 * cosa in un prompt corto la fa pesare il doppio.
 */
export function descrizione(m, p) {
  const testo = (p.caption || "").trim();
  if (m.lingua !== "descrizione" || !p.lyrics) return testo;

  const lingua = LINGUE.find((l) => l.id === p.lingua);
  if (!lingua?.inglese) return testo;
  if (new RegExp(lingua.inglese, "i").test(testo)) return testo;

  return `${testo}, sung in ${lingua.inglese}, clearly enunciated lyrics`;
}

/**
 * MiniMax Music 3.
 *
 * I nodi 1-2-5 dipendono solo dai parametri di struttura: se non cambiano,
 * ComfyUI li riprende dalla cache e salta la generazione autoregressiva, che è
 * la parte lenta. È il motivo per cui "solo nuova resa" costa 17 secondi invece
 * di 107 — basta cambiare il seed dell'audio e lasciare fermo quello del testo.
 */
function grafoMiniMax(m, p) {
  return {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: m.txt, type: "minimax" } },
    "2": {
      class_type: "MiniMaxMusic3TextEncode",
      inputs: {
        clip: ["1", 0], caption: descrizione(m, p), lyrics: p.lyrics,
        seed: p.seed_text, max_duration: p.duration, cfg_scale: p.cfg_scale, top_k: p.top_k,
      },
    },
    "3": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["2", 0] } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "5": { class_type: "EmptyMiniMaxMusic3LatentAudio", inputs: { seconds: ["2", 1], batch_size: 1 } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["4", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["5", 0],
        seed: p.seed_audio, steps: p.steps, cfg: p.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "8": p.tiled
      ? { class_type: "VAEDecodeAudioTiled", inputs: { samples: ["6", 0], vae: ["7", 0], tile_size: p.tile, overlap: 64 } }
      : { class_type: "VAEDecodeAudio", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": SALVATAGGI[p.format],
  };
}

/**
 * ACE-Step 1.5.
 *
 * Stesso disegno del grafo di MiniMax, con tre differenze che contano:
 *
 * 1. **Due encoder e non uno.** `DualCLIPLoader` di tipo `ace` carica il piccolo
 *    e il grande insieme: il modello è stato addestrato con tutti e due, e
 *    passargliene uno solo non dà un errore — dà una canzone che non c'entra.
 * 2. **`generate_audio_codes` acceso.** È la parte lunga, l'equivalente della
 *    fase autoregressiva di MiniMax, ed è per questo che sta sul nodo 2: la
 *    barra la conta come «compongo la struttura» esattamente come l'altra.
 * 3. **`ModelSamplingAuraFlow` fra modello e campionatore.** Sposta la scala del
 *    rumore dove questo modello se l'aspetta. Non è una raffinatezza: senza,
 *    quello che esce è un ronzio.
 *
 * La durata la decide il modulo, come per MiniMax, ma qui va detta due volte —
 * al testo e al latente — perché sono due nodi che non si parlano.
 */
function grafoAce(m, p) {
  return {
    "1": {
      class_type: "DualCLIPLoader",
      inputs: { clip_name1: m.txt1, clip_name2: m.txt2, type: "ace", device: "default" },
    },
    "2": {
      class_type: "TextEncodeAceStepAudio1.5",
      inputs: {
        clip: ["1", 0],
        tags: p.caption,
        lyrics: p.lyrics,
        seed: p.seed_text,
        bpm: p.bpm,
        duration: p.duration,
        timesignature: p.tempo,
        language: p.lingua,
        keyscale: p.tonalita,
        generate_audio_codes: true,
        cfg_scale: p.cfg_scale,
        // I quattro del campionamento dei token: sono quelli del flusso
        // ufficiale, e non stanno negli avanzati perché muoverli senza sapere
        // cosa fanno rovina la canzone in modi difficili da ricondurre a loro.
        temperature: 0.85,
        top_p: 0.9,
        top_k: 0,
        min_p: 0,
      },
    },
    "3": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["2", 0] } },
    "4": { class_type: "UNETLoader", inputs: { unet_name: m.dit, weight_dtype: "default" } },
    "5": { class_type: "EmptyAceStep1.5LatentAudio", inputs: { seconds: p.duration, batch_size: 1 } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["10", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["5", 0],
        seed: p.seed_audio, steps: p.steps, cfg: p.cfg,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "7": { class_type: "VAELoader", inputs: { vae_name: m.vae } },
    "8": p.tiled
      ? { class_type: "VAEDecodeAudioTiled", inputs: { samples: ["6", 0], vae: ["7", 0], tile_size: p.tile, overlap: 64 } }
      : { class_type: "VAEDecodeAudio", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": SALVATAGGI[p.format],
    "10": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["4", 0], shift: m.shift } },
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
/**
 * La copertina, con il modello che si è scelto.
 *
 * Di suo **FLUX.2 Klein 4B**, dalla 0.9.1: capisce le descrizioni lunghe, che è
 * quello che si scrive quando si dice come dev'essere una copertina. Un id che
 * non conosciamo torna ad Anima invece di far fallire il lavoro.
 */
export function grafoImmagine(prompt, seed, opzioni = {}) {
  const quale = MODELLI_COPERTINA[opzioni.modello] ?? MODELLI_COPERTINA["flux2-4b"];
  return quale.grafo(prompt, seed, opzioni);
}

function grafoAnima(prompt, seed, { larghezza = 1024, altezza = 1024, salva = false } = {}) {
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

/**
 * Dalla canzone alla scena: titolo e testo scelgono i motivi, il menu lo stile.
 *
 * Lo stile può essere **nessuno**, ed è la scelta predefinita: come in
 * DaProdFoto, dieci parole di estetica incollate in fondo a ogni copertina le
 * facevano somigliare tutte fra loro. Senza stile il modello ha più margine, e
 * chi ne vuole uno lo sceglie — o se lo scrive, perché il testo del prompt
 * resta modificabile nella scheda Libreria.
 *
 * Anche i motivi scendono da tre a due: tre scene diverse nella stessa immagine
 * — un cuore, il mare e la luna — non fanno una copertina, fanno un pasticcio.
 */
export function promptCopertina(titolo, testo, estetica) {
  const fonte = `${titolo} ${testo || ""}`;
  const scena = MOTIVI.filter(([re]) => re.test(fonte)).slice(0, 2).map(([, t]) => t);
  if (!scena.length) scena.push("an evocative symbolic object at the centre of an empty scene");
  const stile = ESTETICHE[estetica] || "";
  return [
    "album cover artwork",
    ...scena,
    stile,
    "square composition, no text",
  ]
    .filter(Boolean)
    .join(", ");
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
  "10": { label: "preparo il campionamento", da: 0.82, a: 0.82, fase: 2 },
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
