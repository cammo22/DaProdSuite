/**
 * TRELLIS.2: dalla foto al modellino 3D, col suo colore cotto sopra.
 *
 * ⚠ **Nuovo nella 1.4.0.** Chiesto il 24 settembre 2026: «vorrei qualcosa di
 * modelli 3D aggiornato, consigliami tu qualcosa da HuggingFace che gli dai
 * un'immagine e il modello più efficiente possibile fa il modello con una bella
 * texture, che poi possiamo usare da aggiungere ai contenuti e ai giochi».
 *
 * **Perché TRELLIS.2 e non gli altri.** Fra quelli che ComfyUI 0.37 sa far
 * girare da sé:
 *
 * - **Hunyuan3D 2.1** fa solo la forma: la texture vorrebbe il secondo modello
 *   di Tencent, che da solo chiede 21 GB;
 * - **Pixal3D** usa la stessa pipeline di TRELLIS.2 ma vuole in più MoGe per
 *   stimare la prospettiva — un modello in più da scaricare per una foto sola;
 * - **TRELLIS.2** (Microsoft, 4 miliardi) fa forma e colori nello stesso giro,
 *   e con i colori cotti su una texture UV esce un GLB che three.js apre così
 *   com'è. È lo stesso formato dei modellini della Claw Machine.
 *
 * Il grafo è quello ufficiale (`3d_pixal3d_trellis2_image_to_model` dei template
 * di ComfyUI 0.37.2) con la strada TRELLIS.2 accesa, e **alleggerito** dove si
 * poteva senza cambiare il risultato: niente rimesh a 768 e niente occlusione
 * cotta a 64 raggi per texel — due passaggi da minuti che su un modellino da
 * mettere in un gioco non si vedono. Resta quello che si vede: forma,
 * suddivisione fine, colore, metallo e ruvidezza.
 *
 * I tre campionamenti in fila sono i tre stadi del modello — struttura grossa,
 * forma, forma fine — e poi il quarto fa i colori. Le scale del CFG
 * (`CFGOverride` + `RescaleCFG`) sono quelle del grafo ufficiale, che le mette
 * per imitare la pipeline originale di Microsoft.
 *
 * ⚠ Niente backtick in questo file: è servito com'è alle pagine.
 */

export const TRELLIS2 = {
  dit: "trellis_2_int8_convrot.safetensors",
  forma: "trellis_2_shape_vae_bf16.safetensors",
  colori: "trellis_2_texture_vae_bf16.safetensors",
  occhio: "dino_v3_L_naf_fp32.safetensors",
  sfondo: "birefnet.safetensors",
  catalogo: ["trellis2-int8", "trellis2-shape-vae", "trellis2-texture-vae", "dinov3-l", "birefnet"],
};

/**
 * Quanto fine, in tre misure: quante facce tiene il modellino e quanto è
 * grande la sua texture. «Gioco» è il predefinito: è quello che si mette in una
 * vasca con altri venti.
 */
export const QUALITA = {
  gioco: { nome: "Da gioco", facce: 60000, texture: 1024, dettaglio: 1024 },
  bella: { nome: "Bella", facce: 200000, texture: 2048, dettaglio: 1536 },
  vetrina: { nome: "Da vetrina", facce: 500000, texture: 4096, dettaglio: 1536 },
};

/**
 * Il grafo, dalla foto al GLB.
 *
 * `opzioni`: immagine (il nome caricato nel motore), seed, qualita (una chiave
 * di `QUALITA`), sfondo (vero se va staccato dallo sfondo: di serie sì),
 * prefisso.
 */
export function grafoModellino(opzioni) {
  const q = QUALITA[opzioni.qualita] || QUALITA.gioco;
  const seme = opzioni.seed || 0;
  const togliSfondo = opzioni.sfondo !== false;
  const grafo = {
    // I pesi: il modello, i due VAE, l'occhio che guarda la foto.
    "1": { class_type: "UNETLoader", inputs: { unet_name: TRELLIS2.dit, weight_dtype: "default" } },
    "2": { class_type: "CLIPVisionLoader", inputs: { clip_name: TRELLIS2.occhio } },
    "7": { class_type: "VAELoader", inputs: { vae_name: TRELLIS2.forma } },
    "70": { class_type: "VAELoader", inputs: { vae_name: TRELLIS2.colori } },

    // La foto, con il soggetto staccato dallo sfondo e messo al centro.
    "10": { class_type: "LoadImage", inputs: { image: opzioni.immagine } },
    "13": {
      class_type: "ImageCropToMask",
      inputs: {
        images: ["10", 0],
        masks: togliSfondo ? ["12", 0] : ["10", 1],
        width: 1024, height: 1024, pad_factor: 1.1, grow_mask: 0, background: "#000000",
      },
    },

    // Come la guarda: le due condizioni di TRELLIS.2.
    "3": { class_type: "Trellis2Conditioning", inputs: { clip_vision_model: ["2", 0], image: ["13", 0] } },

    // Le scale del CFG del grafo ufficiale, una per stadio.
    "20": { class_type: "CFGOverride", inputs: { model: ["1", 0], cfg: 1, start_percent: 0.667, end_percent: 1 } },
    "21": { class_type: "RescaleCFG", inputs: { model: ["20", 0], multiplier: 0.7 } },
    "22": { class_type: "ModelSamplingSD3", inputs: { model: ["21", 0], shift: 5 } },
    "23": { class_type: "CFGOverride", inputs: { model: ["1", 0], cfg: 1, start_percent: 0.769, end_percent: 1 } },
    "24": { class_type: "RescaleCFG", inputs: { model: ["23", 0], multiplier: 0.5 } },

    // Stadio 1: la struttura, a grani grossi.
    "4": { class_type: "EmptyTrellis2LatentStructure", inputs: { batch_size: 1 } },
    "5": {
      class_type: "KSampler",
      inputs: {
        model: ["22", 0], positive: ["3", 0], negative: ["3", 1], latent_image: ["4", 0],
        seed: seme, steps: 12, cfg: 7.5, sampler_name: "euler", scheduler: "normal", denoise: 1,
      },
    },
    "8": { class_type: "VaeDecodeStructureTrellis2", inputs: { samples: ["5", 0], vae: ["7", 0], resolution: "32" } },

    // Stadio 2: la forma.
    "30": { class_type: "Trellis2ShapeStage", inputs: { positive: ["3", 0], negative: ["3", 1], voxel: ["8", 0] } },
    "31": {
      class_type: "KSampler",
      inputs: {
        model: ["24", 0], positive: ["30", 0], negative: ["30", 1], latent_image: ["30", 2],
        seed: seme, steps: 20, cfg: 7.5, sampler_name: "euler", scheduler: "normal", denoise: 1,
      },
    },

    // Stadio 3: la forma fine.
    "32": {
      class_type: "Trellis2UpsampleStage",
      inputs: { positive: ["30", 0], negative: ["30", 1], shape_latent: ["31", 0], vae: ["7", 0], target_resolution: q.dettaglio },
    },
    "33": {
      class_type: "KSampler",
      inputs: {
        model: ["24", 0], positive: ["32", 0], negative: ["32", 1], latent_image: ["32", 2],
        seed: seme, steps: 12, cfg: 7.5, sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    "34": { class_type: "VaeDecodeShapeTrellis", inputs: { samples: ["33", 0], vae: ["7", 0] } },

    // Stadio 4: i colori, sulla forma appena fatta.
    "40": { class_type: "Trellis2TextureStage", inputs: { positive: ["32", 0], negative: ["32", 1], shape_latent: ["33", 0] } },
    "41": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], positive: ["40", 0], negative: ["40", 1], latent_image: ["40", 2],
        seed: seme, steps: 12, cfg: 1, sampler_name: "euler", scheduler: "normal", denoise: 1,
      },
    },
    "42": { class_type: "VaeDecodeTextureTrellis", inputs: { samples: ["41", 0], vae: ["70", 0], shape_subdivides: ["34", 1] } },

    // La mesh da gioco: meno facce, normali morbide, stesa su una UV.
    "50": { class_type: "DecimateMesh", inputs: { mesh: ["34", 0], target_face_count: q.facce, placement_mode: "midpoint" } },
    "51": { class_type: "MeshSmoothNormals", inputs: { mesh: ["50", 0], crease_angle: 180 } },
    "52": { class_type: "UnwrapMesh", inputs: { mesh: ["51", 0], segmenter: "pec", resolution: q.texture, padding: 1, weld_distance: 0.0002 } },

    // Il colore cotto sulla UV, guardando la forma fine.
    "53": {
      class_type: "BakeTextureFromVoxel",
      inputs: { mesh: ["52", 0], voxel_colors: ["42", 0], texture_size: q.texture, reference_mesh: ["34", 0] },
    },
    "54": {
      class_type: "ApplyTextureToMesh",
      inputs: { mesh: ["52", 0], base_color: ["53", 0], metallic: ["53", 1], roughness: ["53", 2] },
    },
    "55": { class_type: "MeshSmoothNormals", inputs: { mesh: ["54", 0], crease_angle: 180 } },
    "56": { class_type: "MeshToFile3D", inputs: { mesh: ["55", 0] } },
    "9": { class_type: "SaveGLB", inputs: { mesh: ["56", 0], filename_prefix: opzioni.prefisso || "modellini/daprod" } },
    // La texture si salva anche come immagine: e' la faccia del modellino in
    // galleria, e la cosa che si attacca a una figurina.
    "90": { class_type: "SaveImage", inputs: { images: ["53", 0], filename_prefix: (opzioni.prefisso || "modellini/daprod") + "_colore" } },
  };
  if (togliSfondo) {
    grafo["11"] = { class_type: "LoadBackgroundRemovalModel", inputs: { bg_removal_name: TRELLIS2.sfondo } };
    grafo["12"] = { class_type: "RemoveBackground", inputs: { bg_removal_model: ["11", 0], image: ["10", 0] } };
  }
  return grafo;
}

/**
 * **Le tappe di un modellino**, per la barra della scheda 3D. Nuove nella 1.4.5.
 *
 * > «Quando fa il modello 3D non c'e' una barra con il progresso
 * > nell'interfaccia, ma appare correttamente nel menu iniziale.»
 *
 * Il motore racconta due cose: quale nodo ha in mano, e — solo dai
 * campionatori — a che passo e'. Per un'immagine basta, c'e' un campionatore
 * solo. Qui ce ne sono **quattro** (struttura, forma, dettagli, colori) piu' una
 * coda lunga di nodi che non contano niente (la cottura della texture puo'
 * durare un minuto): una barra per nodo ripartirebbe da zero sei volte.
 *
 * Quindi il grafo si divide in tappe, ognuna col suo peso (piu' o meno quanto
 * dura), e la barra e' **una sola**, dall'inizio alla fine. Dentro una tappa
 * che campiona, i passi la fanno avanzare; le altre avanzano quando finiscono.
 * I nodi che non sono in elenco (le regolazioni della CFG, velocissime) non
 * spostano niente: la tappa resta quella di prima.
 */
export const TAPPE_MODELLINO = [
  { nome: "preparo la foto e il motore", peso: 1, nodi: ["1", "2", "7", "70", "10", "11", "12", "13"] },
  { nome: "guardo la foto", peso: 0.5, nodi: ["3"] },
  { nome: "la struttura (1 di 4)", peso: 2, nodi: ["4", "5", "8"] },
  { nome: "la forma (2 di 4)", peso: 2, nodi: ["30", "31"] },
  { nome: "i dettagli (3 di 4)", peso: 2, nodi: ["32", "33", "34"] },
  { nome: "i colori (4 di 4)", peso: 2, nodi: ["40", "41", "42"] },
  { nome: "cuocio la texture e salvo", peso: 1.5, nodi: ["50", "51", "52", "53", "54", "55", "56", "9", "90"] },
];

/**
 * A che punto e' il modellino, da 0 a 1, e come si chiama la tappa.
 *
 * `tappaPrima`: l'indice della tappa di prima, cosi' un nodo fuori elenco non
 * fa tornare indietro la barra. `frazione`: i passi del campionatore, da 0 a 1,
 * se ci sono.
 */
export function avanzamentoModellino(nodo, frazione, tappaPrima) {
  let tappa = TAPPE_MODELLINO.findIndex((t) => t.nodi.indexOf(String(nodo)) >= 0);
  if (tappa < 0) tappa = Math.max(0, tappaPrima || 0);
  const totale = TAPPE_MODELLINO.reduce((s, t) => s + t.peso, 0);
  const fatto = TAPPE_MODELLINO.slice(0, tappa).reduce((s, t) => s + t.peso, 0);
  const dentro = Math.min(1, Math.max(0, frazione || 0)) * TAPPE_MODELLINO[tappa].peso;
  return { tappa, nome: TAPPE_MODELLINO[tappa].nome, quanto: Math.min(0.99, (fatto + dentro) / totale) };
}
