/**
 * Qwen-Image 2.1: i grafi, scritti una volta sola per tutta la suite.
 *
 * ⚠ **Dalla 1.4.0 e' il modello delle immagini**, al posto dei due FLUX.2 Klein.
 * Detto il 24 settembre 2026: «per le foto eliminiamo totalmente flux e usiamo
 * Qwen-Image-2.1, le versioni gguf q4, sia standard sia con le lora per il 4 o 8
 * step, e lo usiamo sia per la creazione delle immagini che per la modifica».
 *
 * Lo usano tre pagine — DaProdFoto per le immagini e i ritocchi, DaProdMusica
 * per le copertine, DaProdDream per sognare — e per questo i grafi stanno qui,
 * nella cartella comune, e non tre volte in tre `grafi.js`. Il giorno che cambia
 * un nodo si cambia una riga.
 *
 * **Come e' fatto, preso dai grafi ufficiali** (il pacchetto
 * `comfyui-workflow-templates` 0.11.69, quello che ComfyUI 0.37.2 si porta
 * dietro) e provato contro un motore vero acceso sul processore, che i grafi li
 * valida nodo per nodo prima di eseguirli:
 *
 * - il modello e' un GGUF, quindi `UnetLoaderGGUF` (il nodo ComfyUI-GGUF, che la
 *   suite installa gia' da FLUX.2);
 * - legge il prompt con **Qwen3-VL 8B**, un modello che *vede*: `CLIPLoader` col
 *   tipo `qwen_image`. E' il motivo per cui sa modificare a parole — la foto da
 *   cambiare la guarda lui;
 * - `TextEncodeQwenImage21` fa tutto il resto: legge il testo, guarda fino a
 *   sedici immagini di riferimento (`images.image_1` …), e restituisce anche un
 *   latente vuoto della misura giusta per la prima;
 * - **CFG 1, sempre.** Il modello e' distillato: alzarlo brucia l'immagine, e a
 *   CFG 1 il negativo non fa niente. Per questo qui il negativo non c'e'.
 *
 * **Le due strade.** Di serie **40 passi**, euler/simple: e' il numero su cui
 * il modello e' stato provato dai suoi autori, e quello che Cammo si aspetta
 * («lo standard e' a 40 step»). Fino alla 1.4.4 erano 25.
 *
 * Con la LoRA turbo bastano **5 passi** (dalla 1.4.5): la Viggle Turbo v0.2,
 * distillata sul programma a 5 passi e convertita per ComfyUI, attaccata da
 * `LoraLoaderModelOnly` a forza 1. Prima c'era la v0.1 a 4 passi, e Cammo ha
 * chiesto questa: la v0.2 e' molto piu' pulita, al costo di un passo. Si puo'
 * salire fino a 10 per un po' di dettaglio in piu'.
 *
 * **Il turbo si campiona coi sigma suoi**, non con il programma «simple»: la
 * LoRA e' stata distillata su 1 / 0,875 / 0,75 / 0,5 / 0,25, e con altri punti
 * sporca. Quindi nel turbo niente KSampler: `ManualSigmas` coi punti esatti e
 * `SamplerCustomAdvanced` (euler, senza CFG). Con piu' di 5 passi la stessa
 * curva si ricampiona piu' fitta (`sigmiTurbo`). Le barre di avanzamento
 * leggono anche lui: manda gli stessi «progress» del KSampler.
 *
 * ⚠ **Niente backtick in questo file**: e' servito com'e' alle pagine, e le
 * pagine della console lo leggono anche come testo.
 */

/** I nomi dei file, come in `manifest/models.json`. */
export const QWEN21 = {
  dit: "qwen-image-2.1-Q4_K_M.gguf",
  txt: "qwen3vl_8b_w4a8.safetensors",
  vae: "qwen_image_2.1_vae_bf16.safetensors",
  turbo: "Qwen-Image-2.1-viggle-turbo-v0.2-5step-lora-r256_comfy.safetensors",
  /** Gli id del catalogo, per chiedere alla suite se ci sono gia'. */
  catalogo: ["qwen21-q4km", "qwen21-text-encoder", "qwen21-vae"],
  catalogoTurbo: ["qwen21-q4km", "qwen21-text-encoder", "qwen21-vae", "qwen21-turbo-5step"],
};

/** Quanti passi, per strada: il minimo, il massimo, e quello che parte. */
export const PASSI = {
  standard: { min: 20, max: 50, valore: 40 },
  turbo: { min: 5, max: 10, valore: 5 },
};

/** Qwen-Image 2.1 vuole misure multiple di 32: 16 di compressione, 2x2 per casella. */
export function multiplo32(v) {
  return Math.max(32, Math.round(v / 32) * 32);
}

/**
 * I nodi che non cambiano mai: modello (con o senza turbo), lettore, VAE.
 *
 * Numerati come gli altri grafi della suite — 1 il modello, 2 il testo, 7 il
 * VAE — perche' le barre di avanzamento leggono il tipo del nodo, e tenere lo
 * stesso ordine vuol dire che funzionano senza sapere che modello e'.
 */
function caricatori(turbo) {
  const nodi = {
    "1": { class_type: "UnetLoaderGGUF", inputs: { unet_name: QWEN21.dit } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: QWEN21.txt, type: "qwen_image", device: "default" } },
    "7": { class_type: "VAELoader", inputs: { vae_name: QWEN21.vae } },
  };
  if (turbo) {
    nodi["20"] = {
      class_type: "LoraLoaderModelOnly",
      inputs: { model: ["1", 0], lora_name: QWEN21.turbo, strength_model: 1 },
    };
  }
  return nodi;
}

/** Il modello da dare al campionatore: quello nudo, o quello con la turbo. */
const modello = (turbo) => (turbo ? ["20", 0] : ["1", 0]);

/** I punti del turbo, quelli su cui e' stata distillata la LoRA di Viggle. */
const SIGMI_TURBO = [1, 0.875, 0.75, 0.5, 0.25];

/**
 * I sigma per `passi` passi, sulla curva del turbo: a 5 sono esattamente i
 * suoi, con piu' passi si prendono piu' punti sulla stessa spezzata. Lo zero in
 * fondo e' la fine del campionamento, e non conta come passo.
 */
export function sigmiTurbo(passi) {
  const n = Math.max(1, Math.round(passi || SIGMI_TURBO.length));
  const punti = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i * (SIGMI_TURBO.length - 1)) / (n - 1);
    const a = Math.floor(t);
    const b = Math.min(SIGMI_TURBO.length - 1, a + 1);
    const v = SIGMI_TURBO[a] + (SIGMI_TURBO[b] - SIGMI_TURBO[a]) * (t - a);
    punti.push(Math.round(v * 10000) / 10000);
  }
  return punti.concat([0]).join(", ");
}

/**
 * Il turbo: rumore, guida senza CFG, euler, i suoi sigma. Il nodo che esce e'
 * sempre il «6», come il KSampler, cosi' il resto del grafo non cambia.
 */
function campionatoreTurbo(grafo, latente, seed, passi) {
  grafo["40"] = { class_type: "RandomNoise", inputs: { noise_seed: seed } };
  grafo["41"] = { class_type: "BasicGuider", inputs: { model: modello(true), conditioning: ["3", 0] } };
  grafo["42"] = { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } };
  grafo["43"] = { class_type: "ManualSigmas", inputs: { sigmas: sigmiTurbo(passi) } };
  grafo["6"] = {
    class_type: "SamplerCustomAdvanced",
    inputs: { noise: ["40", 0], guider: ["41", 0], sampler: ["42", 0], sigmas: ["43", 0], latent_image: latente },
  };
}

function campionatore(turbo, latente, seed, passi) {
  return {
    class_type: "KSampler",
    inputs: {
      model: modello(turbo),
      positive: ["3", 0],
      negative: ["3", 1],
      latent_image: latente,
      seed,
      steps: passi,
      cfg: 1,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
    },
  };
}

function salvataggio(immagine, salva, prefisso) {
  return salva === false
    ? { class_type: "PreviewImage", inputs: { images: immagine } }
    : { class_type: "SaveImage", inputs: { images: immagine, filename_prefix: prefisso } };
}

/**
 * Un'immagine da una descrizione.
 *
 * `opzioni`: prompt, seed, larghezza, altezza, passi, turbo, salva, prefisso.
 * Le misure si arrotondano a 32 qui, cosi' chi chiama non deve saperlo.
 */
export function grafoQwenImmagine(opzioni) {
  const turbo = Boolean(opzioni.turbo);
  const strada = turbo ? PASSI.turbo : PASSI.standard;
  const passi = opzioni.passi || strada.valore;
  const grafo = {
    ...caricatori(turbo),
    "3": {
      class_type: "TextEncodeQwenImage21",
      inputs: { clip: ["2", 0], prompt: opzioni.prompt, negative_prompt: "", resolution: 1024, vae: ["7", 0] },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: multiplo32(opzioni.larghezza || 1024), height: multiplo32(opzioni.altezza || 1024), batch_size: 1 },
    },
    "6": campionatore(turbo, ["5", 0], opzioni.seed, passi),
    "8": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    "9": salvataggio(["8", 0], opzioni.salva, opzioni.prefisso || "immagini/daprod"),
  };
  if (turbo) campionatoreTurbo(grafo, ["5", 0], opzioni.seed, passi);
  return grafo;
}

/**
 * La modifica: a parole su tutta la foto, o solo dove si e' dipinto.
 *
 * `opzioni`: prompt, seed, immagine (il nome caricato nel motore), larghezza e
 * altezza della tela, passi, turbo, e — se si e' dipinto — `maschera` (fondo
 * nero, zona rossa, come la fa il ritocco) con `zona: true`. Piu' `riferimenti`,
 * altri nomi di immagini caricate, che il modello guarda insieme: «mettigli la
 * giacca della seconda foto».
 *
 * **Come si tiene ferma la parte non dipinta.** Qwen-Image 2.1 modifica
 * guardando: la foto entra come riferimento e il modello la ridisegna cambiata.
 * Di suo e' bravo a lasciare stare il resto, ma «bravo» non e' «identico», e il
 * ritocco della suite promette identico da sempre. Quindi, quando c'e' una
 * zona:
 *
 * 1. il modello vede la foto e, come seconda immagine, la stessa foto con la
 *    zona velata di rosso — e il prompt gli dice di cambiare solo quella;
 * 2. a lavoro finito, il risultato si incolla sopra l'originale **solo dentro
 *    la zona** (allargata di qualche pixel, per non lasciare una cucitura).
 *
 * Senza zona niente velo e niente incollatura: e' la modifica a parole su tutta
 * la foto, quella che se n'era andata con LLaDA nella 1.2.4 e che torna qui.
 *
 * Le misure della tela sono gia' multiple di 32 (`ritocco.js`), e
 * `resolution: 0` dice al nodo di non ridimensionare: cosi' il latente e'
 * grande esattamente quanto la foto, e l'incollatura cade al pixel.
 */
export function grafoQwenModifica(opzioni) {
  const turbo = Boolean(opzioni.turbo);
  const strada = turbo ? PASSI.turbo : PASSI.standard;
  const passi = opzioni.passi || strada.valore;
  const larghezza = multiplo32(opzioni.larghezza || 1024);
  const altezza = multiplo32(opzioni.altezza || 1024);
  const zona = Boolean(opzioni.zona && opzioni.maschera);
  const riferimenti = (opzioni.riferimenti || []).slice(0, zona ? 8 : 9);

  const grafo = {
    ...caricatori(turbo),
    "10": { class_type: "LoadImage", inputs: { image: opzioni.immagine } },
    // Una scala che quasi sempre non fa niente: la tela e' gia' della misura
    // giusta. Sta qui perche' se un giorno non lo fosse, l'incollatura finale
    // cadrebbe storta senza dirlo.
    "11": {
      class_type: "ImageScale",
      inputs: { image: ["10", 0], upscale_method: "lanczos", width: larghezza, height: altezza, crop: "disabled" },
    },
  };

  const immagini = { "images.image_1": ["11", 0] };
  let testo = opzioni.prompt;

  if (zona) {
    grafo["12"] = { class_type: "LoadImageMask", inputs: { image: opzioni.maschera, channel: "red" } };
    grafo["13"] = { class_type: "GrowMask", inputs: { mask: ["12", 0], expand: 6, tapered_corners: true } };
    // Il velo rosso: la foto con la zona colorata, mescolata a meta' con quella
    // vera, cosi' il modello vede dove e anche cosa c'era sotto.
    grafo["14"] = { class_type: "EmptyImage", inputs: { width: larghezza, height: altezza, batch_size: 1, color: 16711680 } };
    grafo["15"] = {
      class_type: "ImageCompositeMasked",
      inputs: { destination: ["11", 0], source: ["14", 0], x: 0, y: 0, resize_source: false, mask: ["12", 0] },
    };
    grafo["16"] = {
      class_type: "ImageBlend",
      inputs: { image1: ["11", 0], image2: ["15", 0], blend_factor: 0.55, blend_mode: "normal" },
    };
    immagini["images.image_2"] = ["16", 0];
    testo =
      "<image1> is the photo to edit. <image2> is the same photo with the area to change tinted red. " +
      "Change only that area: " + opzioni.prompt + ". " +
      "Everything outside the red area stays exactly as in <image1>, and the result has no red tint.";
  }

  // Le immagini di riferimento in piu' vengono dopo: la prima resta sempre la
  // foto da modificare, perche' e' lei che decide la misura del latente.
  riferimenti.forEach((nome, i) => {
    const id = String(30 + i);
    grafo[id] = { class_type: "LoadImage", inputs: { image: nome } };
    immagini["images.image_" + (Object.keys(immagini).length + 1)] = [id, 0];
  });

  grafo["3"] = {
    class_type: "TextEncodeQwenImage21",
    inputs: { clip: ["2", 0], prompt: testo, negative_prompt: "", resolution: 0, vae: ["7", 0], ...immagini },
  };
  if (turbo) campionatoreTurbo(grafo, ["3", 2], opzioni.seed, passi);
  else grafo["6"] = campionatore(turbo, ["3", 2], opzioni.seed, passi);
  grafo["8"] = { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } };

  let finale = ["8", 0];
  if (zona) {
    grafo["17"] = {
      class_type: "ImageCompositeMasked",
      inputs: { destination: ["11", 0], source: ["8", 0], x: 0, y: 0, resize_source: true, mask: ["13", 0] },
    };
    finale = ["17", 0];
  }
  grafo["9"] = salvataggio(finale, opzioni.salva, opzioni.prefisso || "immagini/ritocco");
  return grafo;
}
