/**
 * I grafi che si mandano al motore.
 *
 * Sono l'unica cosa di ComfyUI che l'app deve conoscere davvero, e usano solo
 * nodi **core**: nessun custom node, nessun pacchetto da installare, nessun
 * grafo salvato su file da tenere allineato all'interfaccia.
 */

import { COVER_NEG, ESTETICHE, MOTIVI } from "./dati/estetiche.js";
import { QWEN21, grafoQwenImmagine } from "/comune/qwen-image.js";

/**
 * Con che cosa si fa il brano: **ACE-Step 1.5**, in due taglie.
 *
 * ⚠ **MiniMax Music 3 è stato tolto l'11 settembre 2026.** Parole sue: «togliamo
 * i modelli minimax h3 e minimax musica, che sono modelli che al momento non mi
 * piacciono, e alleggeriamo molto».
 *
 * Era la voce «migliore» del menu: trenta passi contro gli otto di ACE, otto GB
 * fra DiT, text encoder e VAE, e l'unico pezzo della suite rimasto a **4 bit** —
 * il suo text encoder da 7B lavora da solo in VRAM e la versione a 8 bit pesa
 * 8,6 GB, che su una scheda da 8 non ci sta. Era anche l'unico senza casella
 * della lingua: gliela si diceva in fondo alla descrizione, in inglese, e
 * «aiutava, ma non era un interruttore».
 *
 * Il giorno che torna, tornano insieme il modello, il suo grafo e quella riga
 * sulla lingua. Sta scritto nel changelog della 1.3.2.
 *
 * **ACE-Step 1.5.** Otto passi. I nodi sono nativi di ComfyUI —
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
const ACE = {
  famiglia: "ace",
  txt1: "qwen_0.6b_ace15.safetensors",
  txt2: "qwen_4b_ace15.safetensors",
  vae: "ace_1.5_vae.safetensors",
  grafo: grafoAce,
  /** Quali comandi degli avanzati vogliono dire qualcosa per questa famiglia. */
  campi: ["steps", "cfg", "cfg_scale", "bpm", "tonalita", "tempo", "tiled"],
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
 * ACE-Step Turbo era passato davanti a MiniMax nella 0.4.1, e la scelta si era
 * fatta ascoltando: otto passi contro trenta, e sulle parole si capisce meglio.
 * L'11 settembre 2026 MiniMax è uscito del tutto, e chi l'aveva scelto a mano si
 * ritrova sul Turbo senza fare niente — `modello()` qui sotto risponde con quello
 * che parte quando l'id salvato non esiste più, ed è proprio per giorni come
 * questo che quella riga è scritta così.
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
};

/**
 * **YuE2 3B**, dalla 1.4.0: «per la musica mettiamo anche YuE2-3B».
 *
 * Un'altra idea di canzone. ACE-Step disegna il suono tutto insieme; YuE2 fa
 * come un musicista: **prima scrive la partitura** — melodia e accordi in
 * notazione ABC, allineati al testo — e poi la suona. Gli autori lo misurano
 * sopra Suno v5 su SongBench, ed è il primo open che ci arriva.
 *
 * Due voci nel menu invece di un interruttore, perché sono due attese diverse:
 * **diretto** va dal testo al suono, **con la partitura** passa prima dalla
 * melodia scritta, che costa un altro giro del modello di lingua e in cambio dà
 * canzoni più tenute insieme. È lo stesso file, e lo stesso grafo.
 *
 * Tutto sta in **un checkpoint solo** — modello, lettore e VAE — ripacchettato
 * da Comfy-Org, e i nodi sono di serie in ComfyUI dalla 0.37: niente da
 * installare nel motore. ⚠ Gli autori misurano 24 GB di VRAM senza
 * compressione; qui c'è l'int8, e su 8 GB ComfyUI sposta i pesi fra scheda e
 * RAM. Si sente nel tempo, non nella canzone.
 */
const YUE2 = {
  famiglia: "yue2",
  ckpt: "yue2_3b_int8_convrot.safetensors",
  grafo: grafoYue2,
  campi: ["steps"],
  // I passi del campionatore del suono, dal grafo ufficiale: 32, dpm_2.
  passi: { min: 16, max: 48, valore: 32 },
  comuni: [],
};

MODELLI["yue2"] = {
  ...YUE2,
  id: "yue2",
  nome: "YuE2 3B",
  riga: "Canzoni intere col testo cantato, come le scrive un musicista. 4,3 GB.",
  partitura: false,
  catalogo: ["yue2-3b-int8"],
};
MODELLI["yue2-partitura"] = {
  ...YUE2,
  id: "yue2-partitura",
  nome: "YuE2 3B, con la partitura",
  riga: "Prima scrive melodia e accordi, poi li suona: più lento, più tenuto insieme.",
  partitura: true,
  catalogo: ["yue2-3b-int8"],
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
 * ⚠ **Dalla 1.4.0 al posto di FLUX.2 Klein 4B c'è Qwen-Image 2.1 Turbo.** FLUX
 * è uscito dalla suite il 24 settembre 2026. Il turbo e non quello di serie per
 * la stessa ragione per cui era il 4B e non il 9B: una copertina è un quadrato
 * che si guarda in una lista, e arriva subito dopo un brano — cinque passi
 * invece di quaranta. Qwen le scritte le sa fare meglio di Klein, e una
 * copertina con il titolo sopra è esattamente quello (vedi `conScritta`).
 *
 * Gli id sono gli stessi di DaProdFoto, e non è un caso: chi chiede da fuori
 * dice «qwen21-turbo» e vale in tutte e due le schede. Il grafo non sta qui:
 * è quello comune di `packages/ui/src/qwen-image.js`.
 */
export const MODELLI_COPERTINA = {
  anima: {
    id: "anima",
    nome: "Anima",
    grafo: (prompt, seed, opzioni) => grafoAnima(prompt, seed, opzioni),
    catalogo: [],
  },
  /**
   * ⚠ **Dalla 1.4.9 la copertina di serie è Qwen senza LoRA.** Chiesto il 25
   * settembre 2026: «usiamo il modello standard, togliamo i lora». Ci mette di
   * più del turbo, ma parte sempre: la LoRA era quella che mancava sul disco.
   */
  qwen21: {
    id: "qwen21",
    nome: "Qwen-Image 2.1",
    grafo: (prompt, seed, { larghezza = 1024, altezza = 1024, salva = false } = {}) =>
      grafoQwenImmagine({ prompt, seed, larghezza, altezza, turbo: false, salva, prefisso: "immagini/daprod" }),
    catalogo: QWEN21.catalogo,
  },
  "qwen21-turbo": {
    id: "qwen21-turbo",
    nome: "Qwen-Image 2.1 Turbo",
    grafo: (prompt, seed, { larghezza = 1024, altezza = 1024, salva = false } = {}) =>
      grafoQwenImmagine({ prompt, seed, larghezza, altezza, turbo: true, salva, prefisso: "immagini/daprod" }),
    catalogo: QWEN21.catalogoTurbo,
  },
};

const PREFISSO = "audio/daprodmusica";
const SALVATAGGI = {
  mp3: { class_type: "SaveAudioMP3", inputs: { audio: ["8", 0], filename_prefix: PREFISSO, quality: "V0" } },
  opus: { class_type: "SaveAudioOpus", inputs: { audio: ["8", 0], filename_prefix: PREFISSO, quality: "192k" } },
  flac: { class_type: "SaveAudio", inputs: { audio: ["8", 0], filename_prefix: PREFISSO } },
};

/**
 * Il brano, col modello scelto nel menu.
 *
 * ⚠ **La numerazione dei nodi è una convenzione**, e non pigrizia: `FASI` qui
 * sotto traduce «sta lavorando il nodo 2» in «compongo la struttura», e la barra
 * di DaProdMusica legge quella tabella. Numerare uguale vuol dire che la barra
 * funziona con un modello nuovo senza sapere che esiste — è così che ha
 * funzionato con MiniMax Music 3 finché c'era. Chi ne aggiunge un altro domani
 * tenga lo stesso ordine: 1 il caricamento del testo, 2 la parte lunga, 4 il
 * modello musicale, 6 il campionatore, 7-8 il suono, 9 il file.
 */
export const grafoBrano = (m, p) => m.grafo(m, p);

/**
 * ACE-Step 1.5.
 *
 * Tre cose vanno sapute, e sono quelle che si sbagliano:
 *
 * 1. **Due encoder e non uno.** `DualCLIPLoader` di tipo `ace` carica il piccolo
 *    e il grande insieme: il modello è stato addestrato con tutti e due, e
 *    passargliene uno solo non dà un errore — dà una canzone che non c'entra.
 * 2. **`generate_audio_codes` acceso.** È la parte lunga, e per questo sta sul
 *    nodo 2: la barra la conta come «compongo la struttura».
 * 3. **`ModelSamplingAuraFlow` fra modello e campionatore.** Sposta la scala del
 *    rumore dove questo modello se l'aspetta. Non è una raffinatezza: senza,
 *    quello che esce è un ronzio.
 *
 * La durata la decide il modulo, e qui va detta due volte — al testo e al
 * latente — perché sono due nodi che non si parlano.
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
 * YuE2: la canzone, con o senza la partitura scritta prima.
 *
 * Il grafo è quello ufficiale (`audio_yue2_text2music` dei template di ComfyUI
 * 0.37), e i numeri dei nodi seguono la convenzione di questo file perché la
 * barra funzioni senza sapere che modello è: 1 il caricamento, 2 la parte lunga
 * (il modello di lingua che compone), 6 il suono, 8 l'audio, 9 il salvataggio.
 *
 * `YuE2GenerateMusic` dice anche **quanto dura davvero** (la sua seconda
 * uscita): la durata chiesta è un tetto, e il modello la accorcia se il testo
 * finisce prima. Il latente si fa di quella misura, non di quella chiesta —
 * altrimenti la canzone finirebbe con un minuto di silenzio.
 *
 * A CFG 1 il negativo non conta, ed è un conditioning azzerato come negli altri.
 */
function grafoYue2(m, p) {
  const grafo = {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: m.ckpt } },
    "2": {
      class_type: "YuE2GenerateMusic",
      inputs: {
        clip: ["1", 1],
        style: p.caption,
        lyrics: p.lyrics,
        abc: m.partitura ? ["11", 0] : "",
        seed: p.seed_text,
        mode: "full",
        max_duration: p.duration,
        temperature: 1,
        top_p: 0.95,
        top_k: 100,
        repetition_penalty: 1.2,
      },
    },
    "3": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["2", 0] } },
    "5": { class_type: "EmptyYuE2LatentAudio", inputs: { seconds: ["2", 1], batch_size: 1 } },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["5", 0],
        seed: p.seed_audio, steps: p.steps, cfg: 1,
        sampler_name: "dpm_2", scheduler: "sgm_uniform", denoise: 1,
      },
    },
    "8": { class_type: "VAEDecodeAudio", inputs: { samples: ["6", 0], vae: ["1", 2] } },
    "9": SALVATAGGI[p.format],
  };
  if (m.partitura) {
    grafo["11"] = {
      class_type: "YuE2GenerateABC",
      inputs: {
        clip: ["1", 1],
        style: p.caption,
        lyrics: p.lyrics,
        seed: p.seed_text,
        mode: "full",
        max_abc_tokens: 8192,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 30,
        repetition_penalty: 1.005,
        penalty_window: 100,
      },
    };
  }
  return grafo;
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
 * Di suo **Qwen-Image 2.1 Turbo**, dalla 1.4.0 (prima FLUX.2 Klein 4B): capisce
 * le descrizioni lunghe e le scritte. Un id che non conosciamo — compreso il
 * `flux2-4b` di chi aveva scelto quello prima dell'aggiornamento — torna al
 * turbo invece di far fallire il lavoro.
 */
export function grafoImmagine(prompt, seed, opzioni = {}) {
  const quale = MODELLI_COPERTINA[opzioni.modello] ?? MODELLI_COPERTINA.qwen21;
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
    "square composition",
    scrittaDelTitolo(titolo),
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * **Il nome della canzone, scritto sopra.** Nuovo nella 0.9.3.
 *
 * Chiesto il 6 settembre 2026: «quando facciamo una produzione musicale, al
 * punto di inserire la copertina, fai che in automatico — quando viene mandata
 * la richiesta a Flux — di aggiungere sempre una bella scritta a tema con il
 * nome della canzone. Solitamente gli devi scrivere tra virgolette il nome
 * della canzone, es: "aggiungi un testo a tema Nome Canzone". Rendiamo questa
 * cosa di default, cosi' tutte le immagini di copertina hanno il nome della
 * canzone».
 *
 * ## Le virgolette non sono decorazione
 *
 * FLUX sapeva scrivere, e Qwen-Image 2.1 ancora meglio — **quello che gli metti
 * fra virgolette**: e' il modo in cui il modello capisce dove finisce la descrizione e comincia il
 * testo da disegnare. Senza, il titolo si scioglie nella scena e il modello
 * disegna qualcosa *a proposito* di quelle parole invece delle parole.
 *
 * ## E soprattutto: prima c'era scritto il contrario
 *
 * Fino alla 0.9.2 tutti i prompt di copertina finivano con **`no text`**. Non
 * era una svista: era la scelta giusta per Anima e per SD, che a scrivere fanno
 * scarabocchi, e quella riga li teneva puliti. FLUX.2 Klein — che dalla 0.9.1 e'
 * il modello di serie per le copertine — le lettere le sa fare, quindi quella
 * riga adesso e' solo un divieto ereditato.
 *
 * Il titolo si ripulisce prima: le virgolette dentro al nome chiuderebbero
 * quelle del prompt, e un titolo di quaranta parole diventerebbe un muro.
 */
export function scrittaDelTitolo(titolo) {
  const pulito = String(titolo || "")
    .replace(/["\u00ab\u00bb\u201c\u201d]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!pulito) return "";
  return `with the title text "${pulito}" written across the artwork in a lettering style that matches the mood`;
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
  // Solo YuE2 con la partitura: la melodia scritta prima di tutto il resto.
  "11": { label: "scrivo la partitura", da: 0.03, a: 0.3, fase: 1 },
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
