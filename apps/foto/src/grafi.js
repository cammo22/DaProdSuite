/**
 * I modelli fra cui si sceglie, e i grafi che si mandano al motore.
 *
 * Tre famiglie, con caratteri diversi. **Anima** è un turbo: CFG 1,0, 5,6 GB, ed
 * è già sul disco perché Musica la usa per le copertine — si genera subito,
 * senza scaricare niente. **Anima v2** è la stessa cresciuta: 2,9 miliardi di
 * parametri invece di 2, addestrata su un milione e settecentomila immagini in
 * più, e **divide con lei text encoder e VAE** — quindi costa 3,1 GB e basta.
 * **FLUX.2 Klein** è il modello grosso: 11,2 GB fra pesi e text encoder, capisce
 * descrizioni lunghe e articolate. Costa l'attesa dello scaricamento e qualche
 * decina di secondi in più a immagine.
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
        seed: p.seed, steps: p.step, cfg: p.cfg,
        sampler_name: "euler", scheduler: m.scheduler ?? "simple", denoise: 1,
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
        seed: p.seed, steps: p.step, cfg: p.cfg,
        sampler_name: "euler", scheduler: m.scheduler ?? "simple", denoise: p.denoise,
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
      inputs: { steps: p.step, width: p.larghezza, height: p.altezza },
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

/* ------------------------------------------------------------- LLaDA-Image */

/**
 * ⚠ **LLaDA non e' fatto come gli altri due**, e conviene saperlo prima di
 * leggere i due grafi qui sotto.
 *
 * Anima e FLUX.2 sono montati a pezzi: un caricatore per il modello, uno per il
 * text encoder, uno per il VAE, un campionatore, un decodificatore. Si vede
 * tutto e si puo' mettere le mani in mezzo — e' cosi' che funziona il ritocco
 * col pennello, infilando una maschera nel latente.
 *
 * LLaDA e' **una scatola**: un nodo carica tutto insieme e torna una
 * `LLADA_PIPELINE`, e un secondo nodo prende quella e sputa fuori un'immagine
 * gia' fatta. Niente latenti, niente VAEDecode, niente in mezzo.
 *
 * Da qui discendono due cose che si vedono nell'interfaccia:
 *
 * 1. **Il pennello non c'e'.** Il nodo di modifica non ha un ingresso per la
 *    maschera, e non e' una dimenticanza: LLaDA modifica **seguendo
 *    l'istruzione**, guardando tutta la foto, non ridipingendo una zona. «fai
 *    diventare bianca la volpe» e' il suo modo; «rifai questo angolo» e' quello
 *    degli altri due. Vedi `senzaPennello` nel catalogo.
 * 2. **Le misure devono essere divisibili per 32** quando modifica (16 quando
 *    genera). Sopra ci pensa `misuraBuona`.
 */

/** Il caricatore, uguale per generare e per modificare. */
function caricaLlada(m) {
  return {
    "1": {
      class_type: "LLaDAImageLoader",
      inputs: {
        diffusion_model: m.dit,
        text_encoder: m.txt,
        vae: m.vae,
        dtype: "bfloat16",
        /**
         * ⚠ **`cuda`, ed e' il contrario di quello che sembra.**
         *
         * I pesi sono 6,6 GB di trasformatore piu' 9,2 di text encoder: su una
         * scheda da 8 GB non ci stanno insieme nemmeno da lontano. `cuda`,
         * qui, **non** vuol dire «carica tutto sulla scheda»: il pacco di nodi
         * evita apposta il `pipe.to("cuda")` di diffusers e mette in scheda
         * solo i parametri non quantizzati del trasformatore, lasciando le
         * matrici INT8 in RAM e portandone su **una per volta** mentre lavora.
         * E' scritto nel loro codice, ed e' quello che usano i due workflow di
         * esempio del pacco.
         *
         * ⚠ **Le altre due strade sono state provate, e non vanno.**
         *
         * - `cpu` (com'era dalla 1.0.2 alla 1.0.3) vuol dire `pipe.to("cpu")`:
         *   la scheda video non la tocca proprio, e i quattro passi li fa il
         *   processore.
         * - `sequential_cpu_offload` (la 1.0.4, per mezza giornata) e' quello
         *   che il nome promette e con questo modello **non parte**: lo scarico
         *   di accelerate manda i pesi sul dispositivo «meta» ricreandoli, e i
         *   tensori GGUF del text encoder non si lasciano ricreare —
         *   `TypeError: GGMLTensor.__new__() missing 2 required keyword-only
         *   arguments`. Non e' aggiustabile da qui: e' fra accelerate e i nodi
         *   GGUF di City96.
         *
         * Resta il piu' lento della scheda pur facendo solo 4 passi, e va detto
         * invece che scoperto: le matrici che vanno e vengono dalla RAM si
         * pagano a ogni passo.
         */
        offload: "cuda",
        /**
         * ⚠ **Obbligatorio, e senza non parte.** Trovato il 6 settembre 2026,
         * provando a generare: «required input is missing: vae_tiling»,
         * `LLaDAImageLoader`.
         *
         * Il nodo lo dichiara fra i `required` — un elenco di tre voci con
         * scritto «di serie: On» accanto — e un valore di serie, in ComfyUI,
         * vale per chi monta il grafo a mano nella pagina, non per chi lo manda
         * scritto: li' quello che non arriva non esiste, e la richiesta si
         * ferma prima di caricare qualunque cosa.
         *
         * `On` non e' solo il suo di serie: e' anche quello che serve qui.
         * Decodificare a piastrelle vuol dire non tenere in memoria l'immagine
         * intera in un colpo solo, ed e' l'ultimo passo — quello che su una
         * scheda gia' piena e' il piu' facile da far scoppiare.
         */
        vae_tiling: "On",
      },
    },
  };
}

function immagineLlada(m, p) {
  return {
    ...caricaLlada(m),
    "2": {
      class_type: "LLaDAImageTextToImage",
      inputs: {
        pipeline: ["1", 0],
        prompt: p.prompt,
        width: misuraBuona(p.larghezza, 16),
        height: misuraBuona(p.altezza, 16),
        steps: p.step,
        guidance_scale: p.cfg,
        seed: p.seed,
        negative_prompt: p.negativo || "",
      },
    },
    "3": {
      class_type: "SaveImage",
      inputs: { images: ["2", 0], filename_prefix: "immagini/daprod" },
    },
  };
}

/**
 * La modifica: si da' una foto e si dice **cosa cambiare**.
 *
 * Nessuna maschera, nessun `denoise`: quei due parametri qui non esistono
 * proprio. Se il grafo li ricevesse li butterebbe, ed e' meglio che
 * l'interfaccia non li faccia nemmeno vedere — vedi `senzaPennello`.
 */
function modificaLlada(m, p) {
  return {
    ...caricaLlada(m),
    "4": { class_type: "LoadImage", inputs: { image: p.immagine } },
    "2": {
      class_type: "LLaDAImageEdit",
      inputs: {
        pipeline: ["1", 0],
        image: ["4", 0],
        prompt: p.prompt,
        // Modificando, il modello vuole misure divisibili per 32 e non per 16.
        width: misuraBuona(p.larghezza, 32),
        height: misuraBuona(p.altezza, 32),
        steps: p.step,
        guidance_scale: p.cfg,
        seed: p.seed,
        negative_prompt: p.negativo || "",
      },
    },
    "3": {
      class_type: "SaveImage",
      inputs: { images: ["2", 0], filename_prefix: "immagini/modifica" },
    },
  };
}

/**
 * La misura buona piu' vicina, verso il basso.
 *
 * ⚠ **Verso il basso e non verso l'alto**, ed e' una scelta: arrotondando in su
 * si chiede al modello qualche pixel in piu' di quelli che gli si e' promesso,
 * e su una scheda gia' al limite quei pixel sono la differenza fra un'immagine
 * e un errore di memoria. Meglio otto pixel in meno.
 */
function misuraBuona(quanti, passo) {
  const n = Math.floor(Number(quanti) || 1024);
  const giusta = Math.floor(n / passo) * passo;
  return Math.max(passo, giusta);
}

/* ------------------------------------------------------------- il catalogo */

/**
 * Quello che i due FLUX.2 hanno in comune.
 *
 * **Non il text encoder**, che è la cosa che sembrava ovvia e non lo era: il 4B
 * vuole Qwen3-4B e il 9B Qwen3-8B. Dandogli quello sbagliato il motore muore con
 * `mat1 and mat2 shapes cannot be multiplied (512x12288 and 7680x3072)` — 7680 è
 * 2560×3 (Qwen3-4B), 12288 è 4096×3 (Qwen3-8B). In comune restano il VAE e tutto
 * il resto del grafo.
 */
const FLUX_COMUNE = {
  vae: "flux2-vae.safetensors",
  // FLUX.2 legge il prompt con un Qwen3, che l'italiano lo capisce: tradurre
  // prima non serve, e toglie di mezzo un passaggio che può solo andare storto.
  traduce: false,
  step: { min: 8, max: 50, valore: 20 },
  // Klein è distillato: il CFG resta a 1 e non c'è niente da guadagnare ad
  // alzarlo, quindi il cursore non si muove e il negativo non serve.
  cfg: { min: 1, max: 1, valore: 1 },
  usaNegativo: false,
  immagine: immagineFlux,
  ritocco: ritoccoFlux,
};

/**
 * `serveScheda: true` vuol dire **niente scheda video, niente modello**.
 *
 * Non è la stessa cosa di "va più piano": FLUX.2 Klein è un modello da 5,9 o
 * 11,2 GB che sulla CPU non finisce un'immagine in un tempo che abbia senso, e
 * offrirlo lo stesso significa lasciar scaricare undici GB per poi far
 * aspettare qualcuno davanti a una barra che non si muove. Su una macchina
 * senza NVIDIA il menu lo mostra spento, con scritto perché.
 */
export const MODELLI = {
  anima: {
    id: "anima",
    nome: "Anima",
    riga: "Già sul disco. Da 30 a 50 step, come dice chi l'ha fatta.",
    dit: "anima-turbo-v1.0.safetensors",
    txt: "qwen_3_06b_base.safetensors",
    vae: "qwen_image_vae.safetensors",
    catalogo: ["anima-turbo", "qwen3-06b-base", "qwen-image-vae"],
    /**
     * **Da 30 a 50 step**, come dice chi l'ha addestrata.
     *
     * Fino alla 0.3.2 qui c'era `{ min: 4, max: 30, valore: 10 }`: dieci step
     * perché Anima è un modello turbo, e il turbo era anche il motivo per cui
     * le immagini venivano molli. La scheda del modello su HuggingFace consiglia
     * **30-50** step, e la differenza si vede. Trenta è il punto di partenza,
     * cinquanta il massimo che ha senso chiedere: oltre, cambia il tempo e non
     * l'immagine. Il minimo resta basso per chi vuole una prova veloce.
     */
    step: { min: 4, max: 50, valore: 30 },
    cfg: { min: 1, max: 4, valore: 1 },
    /** A CFG 1,0 il negativo è ignorato, ma alzando il CFG torna a contare. */
    usaNegativo: true,
    notaNegativo:
      "Anima lavora a CFG 1,0, e a quel valore il negativo viene ignorato dal modello. Conta solo se alzi il CFG qui sopra.",
    // Anima capisce solo l'inglese: una descrizione in italiano non dà errore,
    // dà un'immagine che non c'entra niente.
    traduce: true,
    immagine: immagineAnima,
    ritocco: ritoccoAnima,
    // Senza scheda video Anima ci mette molto, ma arriva in fondo: resta
    // l'unica strada su un computer senza NVIDIA, e quindi non si spegne.
    serveScheda: false,
  },
  /**
   * Anima v2 — il 2.9B di Gazingstars123, che è Anima con dodici blocchi in più.
   *
   * **Stessa famiglia, stessi nodi, stessi due file di contorno.** È una
   * espansione in profondità della Anima di CircleStone Labs — da 28 a 40 blocchi
   * di transformer, con i nuovi inizializzati a copia dei vicini e proiezione
   * azzerata, cioè identici al modello di partenza il giorno zero — quindi legge
   * il prompt con lo stesso Qwen3 0.6B e decodifica con lo stesso VAE. Chi ha
   * DaProdFoto o DaProdMusica installate scarica **solo** i 3,1 GB del modello.
   *
   * **Non è un turbo, e questa è la differenza che si sente.** Anima Turbo fa
   * un'immagine a CFG 1,0; questa vuole da 28 a 50 passi e un CFG fra 3,5 e 5,
   * come dice chi l'ha addestrata. Costa di più a immagine e in cambio disegna
   * meglio, e siccome il CFG è vero **il negativo conta davvero** — su Anima
   * Turbo era lì per il giorno che si alzasse il CFG, qui lavora da subito.
   *
   * `sgm_uniform` e non `simple`: è lo scheduler consigliato dal modello, e con
   * `euler` è la coppia che chi l'ha fatta usa tutti i giorni.
   *
   * **Prompt in stile Danbooru.** È un modello di anime e illustrazione: vuole
   * tag di qualità, `1girl`/`1boy`, il nome della serie accanto al personaggio, e
   * più dettagli ci metti meglio viene. Una frase di tre parole gli fa disegnare
   * uno sfondo vuoto.
   */
  anima2: {
    id: "anima2",
    nome: "Anima v2 (2.9B)",
    riga: "Anima cresciuta: 3,1 GB da aggiungere, il resto ce l'hai già. Anime e illustrazione, 28-50 step a CFG 4.",
    dit: "Anima-2.9B-preview-v1_int8_convrot.safetensors",
    txt: "qwen_3_06b_base.safetensors",
    vae: "qwen_image_vae.safetensors",
    catalogo: ["anima2-int8", "qwen3-06b-base", "qwen-image-vae"],
    step: { min: 8, max: 50, valore: 30 },
    cfg: { min: 1, max: 7, valore: 4 },
    usaNegativo: true,
    notaNegativo:
      "Anima v2 lavora a CFG 4, cioè il negativo lo guarda davvero: quello che scrivi qui sotto cambia l'immagine.",
    scheduler: "sgm_uniform",
    traduce: true,
    immagine: immagineAnima,
    ritocco: ritoccoAnima,
    // Come Anima: sulla CPU ci mette molto, ma arriva in fondo.
    serveScheda: false,
  },
  "flux2-4b": {
    ...FLUX_COMUNE,
    id: "flux2-4b",
    nome: "FLUX.2 Klein 4B",
    riga: "Il FLUX leggero: 5,9 GB in tutto, e su 8 GB di VRAM sta comodo.",
    dit: "flux-2-klein-4b-Q5_K_M.gguf",
    txt: "Qwen3-4B-Q5_K_M.gguf",
    catalogo: ["flux2-klein-4b-q5km", "flux2-4b-text-encoder", "flux2-vae"],
    serveScheda: true,
  },
  /**
   * ⚠ **LLaDA-Image, quello pieno.** Nato Turbo nella 1.0.2, cambiato nella 1.2.1.
   *
   * Il 6 settembre 2026 era stato chiesto «e' uscito questo bel modellino,
   * vorrei usare il 4step fp8», e c'era il Turbo: il distillato a 4 passi.
   * Provato, il 7 settembre: «ho testato llada e non mi piace, togliamo llada 8
   * step e usiamo quella originale 50 step». Quindi qui adesso c'e'
   * `inclusionAI/LLaDA-Image` — lo stesso trasformatore **non distillato** —
   * impacchettato per ComfyUI da RealRebelAI, come lo era il Turbo. (L'fp8 no,
   * ne' prima ne' adesso: l'unico impacchettamento che ComfyUI sa aprire e' un
   * INT8, e l'fp8 ufficiale e' in formato diffusers.)
   *
   * ⚠ **Cambiano i passi e cambia la guida**, e la seconda e' la parte che non
   * si vede. Distillare non toglie soltanto dei passi: il Turbo lavorava a
   * guidance 1, cioe' **senza guida** — ed e' il motivo per cui il negativo era
   * spento, non lo leggeva nessuno. Il modello pieno lavora a 5, quindi la
   * guida c'e' e il negativo torna a contare. I due numeri sono quelli del
   * README di inclusionAI.
   *
   * ⚠ **E non entra negli 8 GB.** Gliel'ho detto prima di metterlo: 6,6 GB di
   * trasformatore, 9,2 di text encoder, quasi 16 da scaricare. La risposta e'
   * stata «mettilo lo stesso», quindi c'e' — con lo scarico in RAM, e con
   * scritto qui e nel menu che e' il piu' lento di tutti. Adesso lo e' molto di
   * piu': **dodici volte i passi**, su una scheda in cui i pesi vanno e vengono
   * dalla RAM a ognuno.
   *
   * Perche' vale la pena averlo lo stesso: e' **l'unico della scheda che
   * modifica una foto seguendo un'istruzione**. Gli altri tre sanno ridipingere
   * una zona che gli indichi col pennello, che e' una cosa diversa e a volte
   * non e' quella che si vuole.
   */
  llada: {
    id: "llada",
    nome: "LLaDA-Image",
    riga: "Sa modificare una foto a parole. \u26a0 I pesi passano dalla RAM: circa 4 minuti a foto, il piu' lento della scheda.",
    dit: "LLaDA-Image-Base-INT8.safetensors",
    txt: "LLaDA-Image-Base-text_encoder-Q4_K_M.gguf",
    vae: "LLaDa_VAE.safetensors",
    catalogo: ["llada-base-int8", "llada-text-encoder", "llada-vae"],
    /**
     * \u26a0 **Dodici passi, non cinquanta \u2014 e il numero e' misurato.** Dalla 1.2.2.
     *
     * Il README di inclusionAI dice 50, e la 1.2.1 ci aveva creduto sulla
     * parola. Provato: \u00abe' nella fase disegno da 15 minuti per una foto\u00bb. Il
     * conto tornava. Misurato il 7 settembre 2026 su questa macchina
     * (RTX 4060, 8 GB), 1024x1024, CFG 5, motore gia' caldo:
     *
     *     8 passi ->  ~2,8 min
     *    12 passi ->   4,2 min   <- questo
     *    16 passi ->   5,3 min
     *    50 passi ->  ~17 min
     *
     * Piu' una cinquantina di secondi di caricamento, la prima volta. E'
     * lineare, e si capisce perche': il costo sta tutto nei pesi che fanno
     * avanti e indietro fra RAM e scheda. **Venti secondi per passo**, contro
     * l'uno o due che ci metterebbe se ci stessero dentro. Il 4060 ha 8 GB, il
     * trasformatore INT8 ne pesa 6,6, e a CFG 5 la pipeline lavora su **due**
     * latenti per volta (vedi `do_classifier_free_guidance` nel loro
     * `pipeline_llada_image.py`): non ci sta, e ogni passo si paga il viaggio.
     *
     * Il tetto era \u00abcinque minuti a foto, altrimenti si toglie\u00bb. Dodici passi
     * ci stanno \u2014 **e l'immagine e' buona**: messe una accanto all'altra,
     * quella a 12 e quella a 16 non si distinguono. Quindi resta, con il
     * numero che regge la promessa invece di quello del foglietto.
     *
     * Il massimo e' 24 (otto minuti) e non 50: un cursore che arriva dove si
     * aspetta un quarto d'ora e' un modo di far perdere un quarto d'ora.
     */
    step: { min: 8, max: 24, valore: 12 },
    cfg: { min: 1, max: 8, valore: 5 },
    // A guidance 5 la guida c'e' davvero: quello che si scrive nel negativo
    // cambia l'immagine. Tenerlo nascosto vorrebbe dire togliere un comando
    // che adesso funziona.
    usaNegativo: true,
    notaNegativo:
      "Fino alla 1.2.0 qui c'era il LLaDA ridotto, che il negativo non lo guardava. Questo si': lavora a CFG 5.",
    immagine: immagineLlada,
    // La sua modifica non e' un ritocco col pennello: vedi `senzaPennello`.
    ritocco: modificaLlada,
    /**
     * ⚠ **Niente pennello, e l'interfaccia lo deve sapere.**
     *
     * Il nodo `LLaDAImageEdit` non ha un ingresso per la maschera. Mostrare il
     * pennello e poi ignorare quello che uno ha dipinto sarebbe la cosa
     * peggiore: chi lo usa penserebbe di aver detto una cosa, e il modello
     * cambierebbe tutta la foto senza che si capisca perche'.
     */
    senzaPennello: true,
    serveScheda: true,
  },
  "flux2-9b": {
    ...FLUX_COMUNE,
    id: "flux2-9b",
    nome: "FLUX.2 Klein 9B",
    riga: "Il più bravo con le descrizioni lunghe. 11,2 GB, e più lento.",
    dit: "flux-2-klein-9b-Q4_K_S.gguf",
    txt: "Qwen3-8B-Q5_K_M.gguf",
    catalogo: ["flux2-klein-q4ks", "flux2-text-encoder", "flux2-vae"],
    serveScheda: true,
  },
};

/**
 * **Quello che parte se non hai mai scelto niente.**
 *
 * ⚠ **È una copia, e la copia è voluta.** Il posto dove sta scritto per
 * davvero è `PREDEFINITO_IMMAGINI` in `packages/azioni/src/catalogo.ts`, che
 * è quello che leggono il telefono, la console e l'agente. Questa pagina non
 * può importare un pacchetto Node, quindi il valore si ripete — e
 * `apps/shell/scripts/prova-azioni.mjs` controlla che i due siano lo stesso.
 *
 * Fino alla 1.2.2 non erano lo stesso: di là partiva Klein 4B, di qua Anima.
 */
export const PREDEFINITO = "flux2-9b";

/** Il modello con quell'id, o quello di serie se l'id non esiste più. */
export function modello(id) {
  return MODELLI[id] ?? MODELLI[PREDEFINITO];
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
