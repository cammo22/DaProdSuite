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
 * **La strada veloce e' a 8 passi** (dalla 1.5.2): «rimettiamo anche qwen
 * 8step, ma usiamo viggle la versione nuova … comunque 8 e 40 step». E' la
 * Viggle Turbo v0.2.1, distillata sul programma a 6 passi (1 / 0,9375 /
 * 0,875 / 0,75 / 0,5 / 0,25), attaccata da `LoraLoaderModelOnly` a forza 1.
 * La storia: la 1.4.4 aveva la v0.1 a 4 passi, la 1.4.5 la v0.2 a 5, la 1.4.9
 * l'aveva tolta dal telefono, e la 1.5.2 la rimette con la versione nuova.
 *
 * **Il turbo si campiona coi sigma suoi**, non con il programma «simple»: con
 * altri punti sporca. Quindi nel turbo niente KSampler: `ManualSigmas` e
 * `SamplerCustomAdvanced` (euler, senza CFG). A 8 passi la stessa curva a 6
 * punti si ricampiona piu' fitta (`sigmiTurbo`): i punti della distillazione
 * restano gli estremi, e i due in piu' cadono fra quelli. Le barre di
 * avanzamento leggono anche lui: manda gli stessi «progress» del KSampler.
 *
 * ⚠ **Niente backtick in questo file**: e' servito com'e' alle pagine, e le
 * pagine della console lo leggono anche come testo.
 */

/** I nomi dei file, come in `manifest/models.json`. */
export const QWEN21 = {
  dit: "qwen-image-2.1-Q4_K_M.gguf",
  txt: "qwen3vl_8b_w4a8.safetensors",
  vae: "qwen_image_2.1_vae_bf16.safetensors",
  turbo: "Qwen-Image-2.1-viggle-turbo-v0.2.1-6step-lora-r256.safetensors",
  /**
   * Il riscrittore delle modifiche (1.6.1): il Prompt Enhancer ufficiale di
   * Qwen per le modifiche, un Qwen3.5-VL 9B istruito apposta. Vedi
   * `grafoQwenModifica`, «Il passaggio dell'LLM».
   */
  riscrittore: "qwen3.5_9b_qwen_image_2.1_pe_i2i.int8_convrot.safetensors",
  idRiscrittore: "qwen21-pe-i2i",
  /** Gli id del catalogo, per chiedere alla suite se ci sono gia'. */
  catalogo: ["qwen21-q4km", "qwen21-text-encoder", "qwen21-vae"],
  catalogoTurbo: ["qwen21-q4km", "qwen21-text-encoder", "qwen21-vae", "qwen21-turbo-v021"],
  /** L'id del catalogo della turbo, per farla scaricare quando manca. */
  idTurbo: "qwen21-turbo-v021",
  /**
   * Le turbo che vanno bene lo stesso se la v0.2.1 non c'e' ancora, coi sigma
   * su cui sono state distillate. Vedi `lora-presenti.js`.
   *
   * Prima la v0.2 a 5 passi (la 1.4.5-1.4.8 la scaricava), poi le 4 passi della
   * v0.1 che scaricava la 1.4.4: chi aveva gia' la suite ne ha una sul disco,
   * e la foto parte mentre la nuova arriva.
   */
  riserveTurbo: [
    { file: "Qwen-Image-2.1-viggle-turbo-v0.2-5step-lora-r256_comfy.safetensors", sigmi: "1, 0.875, 0.75, 0.5, 0.25, 0" },
    { file: "Qwen-Image-2.1-viggle-turbo-4step-r64-comfyui-T8.safetensors", sigmi: "1, 0.75, 0.5, 0.25, 0" },
    { file: "Qwen-Image-2.1-viggle-turbo-4step-lora-r64.safetensors", sigmi: "1, 0.75, 0.5, 0.25, 0" },
  ],
};

/** Quanti passi, per strada: il minimo, il massimo, e quello che parte. */
export const PASSI = {
  standard: { min: 20, max: 50, valore: 40 },
  turbo: { min: 6, max: 12, valore: 8 },
};

/** Qwen-Image 2.1 vuole misure multiple di 32: 16 di compressione, 2x2 per casella. */
export function multiplo32(v) {
  return Math.max(32, Math.round(v / 32) * 32);
}

/**
 * I nodi che non cambiano mai: modello (con o senza turbo), lettore, VAE, e
 * la cache.
 *
 * Numerati come gli altri grafi della suite — 1 il modello, 2 il testo, 7 il
 * VAE — perche' le barre di avanzamento leggono il tipo del nodo, e tenere lo
 * stesso ordine vuol dire che funzionano senza sapere che modello e'.
 *
 * ⚠ **La cache KV (1.7.0), il «KV Cache Acceleration» di WanGP.** Qwen-Image
 * 2.1 legge il testo e le foto di riferimento **una volta sola** e le tiene da
 * parte per tutti i passi (e' il «prefix KV cache» del loro README: la parte
 * che fa volare le modifiche con tante foto). ComfyUI la accende da se', ma in
 * automatico la mette in scheda solo se avanza quattro volte lo spazio, e su 8
 * GB quasi mai avanza: finiva in RAM. Il nodo ufficiale `QwenImage21Cache` la
 * tiene **in int8**, meta' spazio «alla precisione del bf16» (parole loro), e
 * cosi' in scheda ci sta. Se il motore e' vecchio e il nodo non lo conosce,
 * `lora-presenti.js` lo toglie (`senzaCache`) e si va come prima.
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
  nodi["21"] = {
    class_type: "QwenImage21Cache",
    inputs: { model: turbo ? ["20", 0] : ["1", 0], device: "auto", dtype: "int8" },
  };
  return nodi;
}

/** Il modello da dare al campionatore: passa sempre dalla cache. */
const modello = () => ["21", 0];

/** Toglie la cache e ricollega il campionatore al modello (motore vecchio). */
export function senzaCache(grafo) {
  const c = grafo["21"];
  if (!c || c.class_type !== "QwenImage21Cache") return false;
  const da = c.inputs.model;
  delete grafo["21"];
  for (const nodo of Object.values(grafo)) {
    for (const [k, v] of Object.entries(nodo.inputs || {})) {
      if (Array.isArray(v) && v[0] === "21") nodo.inputs[k] = da;
    }
  }
  return true;
}

/** I punti della v0.2.1, quelli su cui Viggle l'ha distillata (6 passi). */
const SIGMI_TURBO = [1, 0.9375, 0.875, 0.75, 0.5, 0.25];

/**
 * I sigma per `passi` passi, sulla curva del turbo: a 6 sono esattamente i
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
 * ⚠ **Il passaggio dell'LLM**, cioe' il riscrittore. Nato nella 1.6.1 («non mi
 * sembra ci sia il passaggio dell'LLM che decide»), rifatto nella 1.7.0.
 *
 * E' il passaggio del grafo ufficiale di ComfyUI per la modifica
 * (`image_qwen_image_2_1_image_edit`, workflow_templates 0.1.96): prima di
 * disegnare, **Qwen-Image-2.1-PE-I2I** (un Qwen3.5 9B istruito da Qwen
 * apposta) guarda le foto e riscrive «mettigli un cappello» in un'istruzione
 * precisa — cosa cambia, dove, e cosa resta uguale. Stessi numeri del loro
 * grafo: `TextGenerate` nativo, `CLIPLoader` tipo `qwen_image`, tutte le foto
 * in un lotto (`BatchImagesNode`), niente template di sistema,
 * campionamento 1 / 20 / 0,95 / 0,05 / 1,05.
 *
 * **Cosa e' cambiato nella 1.7.0, e perche'.** Cammo: «il modello qwen e'
 * lentissimo». Il colpevole era qui: il riscrittore pesa 9,5 GB e la scheda
 * ne ha 8, e col **ragionamento acceso** scrive centinaia di parole di
 * pensiero prima della risposta — una alla volta, coi pesi che fanno avanti e
 * indietro. Minuti. Adesso:
 *
 * - il ragionamento e' **spento di serie** (`ragiona: true` lo riaccende, e
 *   nella scheda c'e' la spunta): la risposta resta quella del modello
 *   istruito, senza il pensiero davanti;
 * - la risposta si ferma a 1024 token se non ragiona (una modifica ne usa
 *   150-300), e il ragionamento resta coi 16256 del loro grafo;
 * - se il modello risponde nel formato del suo repo — un JSON con
 *   `rewritten_prompt`, `wh_ratio`, `ratio_follow` (README di Qwen-Image-2.1,
 *   «Prompt Rewriting») — `RegexReplace` tiene solo la frase: al lettore deve
 *   arrivare l'istruzione, non le parentesi.
 *
 * Se il file non c'e' ancora o il motore e' vecchio, `lora-presenti.js` toglie
 * questi nodi con `senzaRiscrittore` e la modifica parte con la frase com'era.
 */
function riscrittore(grafo, testo, immagini, seed, ragiona) {
  grafo["50"] = { class_type: "CLIPLoader", inputs: { clip_name: QWEN21.riscrittore, type: "qwen_image", device: "default" } };
  const lotto = {};
  Object.values(immagini).forEach((da, i) => { lotto["images.image" + i] = da; });
  grafo["52"] = { class_type: "BatchImagesNode", inputs: lotto };
  grafo["51"] = {
    class_type: "TextGenerate",
    inputs: {
      clip: ["50", 0],
      prompt: testo,
      image: ["52", 0],
      max_length: ragiona ? 16256 : 1024,
      sampling_mode: "on",
      "sampling_mode.temperature": 1,
      "sampling_mode.top_k": 20,
      "sampling_mode.top_p": 0.95,
      "sampling_mode.min_p": 0.05,
      "sampling_mode.repetition_penalty": 1.05,
      "sampling_mode.seed": seed,
      "sampling_mode.presence_penalty": 0,
      thinking: Boolean(ragiona),
      use_default_template: false,
      mtp: "auto",
    },
  };
  grafo["53"] = {
    class_type: "RegexReplace",
    inputs: {
      string: ["51", 0],
      regex_pattern: '^[\\s\\S]*?"rewrit+en_prompt"\\s*:\\s*"|"\\s*,\\s*"(wh_ratio|ratio_follow)"[\\s\\S]*$|"\\s*\\}\\s*$',
      replace: "",
      case_insensitive: true,
      multiline: false,
      dotall: false,
      count: 0,
    },
  };
  grafo["3"].inputs.prompt = ["53", 0];
}

/** Toglie il passaggio dell'LLM e rimette la frase com'era (vedi `riscrittore`). */
export function senzaRiscrittore(grafo) {
  const r = grafo["51"];
  if (!r || r.class_type !== "TextGenerate") return false;
  if (grafo["3"]) grafo["3"].inputs.prompt = r.inputs.prompt;
  delete grafo["50"];
  delete grafo["51"];
  delete grafo["52"];
  delete grafo["53"];
  return true;
}

/** Quante immagini guarda Qwen-Image 2.1 insieme: dieci (README ufficiale). */
export const MAX_IMMAGINI = 10;

/**
 * «immagine 2» scritto in italiano diventa `<image2>`, il nome con cui il
 * modello chiama le foto nell'ordine in cui le riceve (README: «refer to
 * ordered references as <image1>, <image2>»). Cosi' si scrive come si parla.
 */
export function nomiImmagini(testo) {
  return String(testo || "").replace(/\b(?:immagine|foto|img|image)\s*n?[.°]?\s*(\d{1,2})\b/gi, "<image$1>");
}

/** Le frasi che dicono al modello cosa sono le immagini in piu', per modo. */
const GUIDE = {
  posa: "Keep the subject of <image1>, but give it exactly the pose and body position shown in <image2>. <image2> is only a pose reference: do not copy its person, clothes or background.",
  profondita: "Keep the subject and style of <image1>, but rebuild the scene with the same depth, layout and camera position as <image2>. <image2> is only a depth and layout reference.",
  contorni: "Redraw <image1> so that it follows exactly the outlines of the line drawing <image2>: same shapes, same positions. <image2> is only an edge map.",
};

/**
 * La modifica, come dicono le guide di Qwen, di ComfyUI e di WanGP (1.7.0).
 *
 * Detto il 27 settembre 2026: «qwen image lascia stare il nostro metodo, usa
 * come dicono le guide huggingface e comfy, dovrebbe supportare anche piu'
 * immagini contemporaneamente». Il nostro metodo era il velo rosso sulla zona
 * piu' l'incollatura: via. Quello che c'e' adesso, modo per modo:
 *
 * - **modifica** — la foto piu' fino a nove immagini in piu', in ordine
 *   (`images.image_1` … `image_10`), e la frase. E' esattamente il grafo
 *   ufficiale: `TextEncodeQwenImage21` con `resolution: 0` (le misure della
 *   foto, come nel loro template), KSampler euler/simple a CFG 1.
 * - **zona** — la foto, e la **maschera come immagine a parte** (README: «local
 *   edits via circles, painted annotations, or separate masks»), piu' il
 *   **Masked Denoising** di WanGP: il latente della foto con
 *   `SetLatentNoiseMask`, cosi' fuori dalla zona il campionatore non tocca
 *   niente. Alla fine la zona si posa sulla foto vera, al pixel.
 * - **allarga** (outpainting) — come in WanGP: la tela piu' grande coi
 *   **margini rossi** («outpainting replaces red margins with a continuation
 *   of the scene») e la frase che chiede di allargare; il rumore solo nei
 *   margini, e il centro resta quello di prima.
 * - **guida** (Pose/Depth/Edge Transfer) — la prima immagine in piu' fa da
 *   guida: **contorni** passa da `Canny` (nativo) e il modello riceve la mappa
 *   delle linee, come la «Control Image» di WanGP; **posa** e **profondita'**
 *   la danno a Qwen cosi' com'e', perche' Qwen3-VL la posa e la profondita' le
 *   legge da solo, e i preprocessori di WanGP in ComfyUI sono nodi a parte.
 *
 * `opzioni`: prompt, seed, immagine (il nome caricato nel motore), larghezza e
 * altezza della tela (gia' multiple di 32), passi, turbo, `riferimenti` (altri
 * nomi caricati, in ordine), `modo`, `maschera` + `zona` per la zona,
 * `margini` {sinistra, sopra, destra, sotto} per allargare, `guida` (posa,
 * profondita, contorni), `riscrivi` (di serie si'), `ragiona` (di serie no).
 */
export function grafoQwenModifica(opzioni) {
  const turbo = Boolean(opzioni.turbo);
  const strada = turbo ? PASSI.turbo : PASSI.standard;
  const passi = opzioni.passi || strada.valore;
  const larghezza = multiplo32(opzioni.larghezza || 1024);
  const altezza = multiplo32(opzioni.altezza || 1024);
  let modo = opzioni.modo || (opzioni.zona && opzioni.maschera ? "zona" : "modifica");
  if (modo === "zona" && !opzioni.maschera) modo = "modifica";
  const riferimenti = (opzioni.riferimenti || []).filter(Boolean);
  if (modo === "guida" && !riferimenti.length) modo = "modifica";

  const grafo = {
    ...caricatori(turbo),
    "10": { class_type: "LoadImage", inputs: { image: opzioni.immagine } },
    // Una scala che quasi sempre non fa niente: la tela e' gia' della misura
    // giusta. Sta qui perche' se un giorno non lo fosse, la zona posata alla
    // fine cadrebbe storta senza dirlo.
    "11": {
      class_type: "ImageScale",
      inputs: { image: ["10", 0], upscale_method: "lanczos", width: larghezza, height: altezza, crop: "disabled" },
    },
  };

  const immagini = { "images.image_1": ["11", 0] };
  const aggiungi = (da) => {
    const n = Object.keys(immagini).length + 1;
    if (n <= MAX_IMMAGINI) immagini["images.image_" + n] = da;
  };
  let davanti = "";
  let latente = null;
  let finale = null;

  if (modo === "zona") {
    grafo["12"] = { class_type: "LoadImageMask", inputs: { image: opzioni.maschera, channel: "red" } };
    grafo["13"] = { class_type: "GrowMask", inputs: { mask: ["12", 0], expand: 6, tapered_corners: true } };
    grafo["18"] = { class_type: "MaskToImage", inputs: { mask: ["12", 0] } };
    aggiungi(["18", 0]);
    grafo["19"] = { class_type: "VAEEncode", inputs: { pixels: ["11", 0], vae: ["7", 0] } };
    grafo["22"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["19", 0], mask: ["13", 0] } };
    latente = ["22", 0];
    davanti = "<image1> is the photo to edit and <image2> is its mask. Change only the white area of the mask; everything else stays exactly as in <image1>. ";
  }

  if (modo === "allarga") {
    const m = opzioni.margini || {};
    const mis = (v) => Math.max(0, Math.round((Number(v) || 0) / 32) * 32);
    const sx = mis(m.sinistra), su = mis(m.sopra), dx = mis(m.destra), giu = mis(m.sotto);
    const lw = larghezza + sx + dx;
    const lh = altezza + su + giu;
    grafo["60"] = {
      class_type: "ImagePadForOutpaint",
      inputs: { image: ["11", 0], left: sx, top: su, right: dx, bottom: giu, feathering: 24 },
    };
    grafo["61"] = { class_type: "EmptyImage", inputs: { width: lw, height: lh, batch_size: 1, color: 16711680 } };
    grafo["62"] = {
      class_type: "ImageCompositeMasked",
      inputs: { destination: ["61", 0], source: ["11", 0], x: sx, y: su, resize_source: false },
    };
    immagini["images.image_1"] = ["62", 0];
    grafo["63"] = { class_type: "VAEEncode", inputs: { pixels: ["62", 0], vae: ["7", 0] } };
    grafo["64"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["63", 0], mask: ["60", 1] } };
    latente = ["64", 0];
    davanti = "Extend the canvas of <image1>: replace the red margins with a natural continuation of the scene beyond its border, with the same perspective, light and style. ";
  }

  // Le immagini in piu', nell'ordine in cui le ha messe chi scrive. Nella
  // guida la prima e' la guida, e per i contorni passa prima da Canny.
  riferimenti.forEach((nome, i) => {
    const id = String(30 + i);
    grafo[id] = { class_type: "LoadImage", inputs: { image: nome } };
    if (modo === "guida" && i === 0 && opzioni.guida === "contorni") {
      grafo["70"] = { class_type: "Canny", inputs: { image: [id, 0], low_threshold: 0.4, high_threshold: 0.8 } };
      aggiungi(["70", 0]);
    } else {
      aggiungi([id, 0]);
    }
  });
  if (modo === "guida") davanti = (GUIDE[opzioni.guida] || GUIDE.posa) + " ";

  const testo = davanti + nomiImmagini(opzioni.prompt);
  grafo["3"] = {
    class_type: "TextEncodeQwenImage21",
    inputs: { clip: ["2", 0], prompt: testo, negative_prompt: "", resolution: 0, vae: ["7", 0], ...immagini },
  };
  if (!latente) latente = ["3", 2];
  if (opzioni.riscrivi !== false) riscrittore(grafo, testo, immagini, opzioni.seed, opzioni.ragiona);
  if (turbo) campionatoreTurbo(grafo, latente, opzioni.seed, passi);
  else grafo["6"] = campionatore(turbo, latente, opzioni.seed, passi);
  grafo["8"] = { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } };

  if (modo === "zona") {
    grafo["17"] = {
      class_type: "ImageCompositeMasked",
      inputs: { destination: ["11", 0], source: ["8", 0], x: 0, y: 0, resize_source: true, mask: ["13", 0] },
    };
    finale = ["17", 0];
  } else if (modo === "allarga") {
    // I margini dal modello, il centro dalla foto: la maschera sfumata del
    // pad fa da cucitura.
    grafo["65"] = {
      class_type: "ImageCompositeMasked",
      inputs: { destination: ["60", 0], source: ["8", 0], x: 0, y: 0, resize_source: true, mask: ["60", 1] },
    };
    finale = ["65", 0];
  } else {
    finale = ["8", 0];
  }
  grafo["9"] = salvataggio(finale, opzioni.salva, opzioni.prefisso || "immagini/ritocco");
  return grafo;
}
