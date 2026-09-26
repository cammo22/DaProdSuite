/**
 * I modelli fra cui si sceglie, e i grafi che si mandano al motore.
 *
 * Due famiglie, con caratteri diversi. **Anima** è un turbo: CFG 1,0, 5,6 GB, ed
 * è già sul disco perché Musica la usa per le copertine — si genera subito,
 * senza scaricare niente. **Anima v2** è la stessa cresciuta, e divide con lei
 * text encoder e VAE. **Qwen-Image 2.1** è il modello grosso, dalla 1.4.0 al
 * posto dei due FLUX.2 Klein: capisce descrizioni lunghe, scrive le parole
 * dentro l'immagine, e soprattutto **modifica a parole** — la foto da cambiare la
 * guarda, perché legge con un modello che vede.
 *
 * Non si somigliano nei nodi, e per questo ogni modello si porta i propri grafi
 * invece di riempire di "se" un grafo solo. Quelli di Qwen-Image non stanno
 * nemmeno qui: li usano anche Musica e Dream, e stanno in
 * `packages/ui/src/qwen-image.js`, serviti a tutte sotto `/comune/`.
 *
 * I nomi dei file dei pesi non sono scelti qui: vengono da `manifest/models.json`,
 * che è l'unico posto dove sta scritto cosa scarica la suite e come si chiama.
 * `catalogo` sono gli id di quel file, e servono a chiedere alla suite se il
 * modello c'è già.
 */

import { ESTETICHE, NEGATIVO } from "./dati/estetiche.js";
import { PASSI, QWEN21, grafoQwenImmagine, grafoQwenModifica } from "/comune/qwen-image.js";

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

/* ---------------------------------------------------------- Qwen-Image 2.1 */

/*
 * ⚠ **Qui c'erano i grafi di FLUX.2 Klein, 4B e 9B. Tolti il 24 settembre 2026.**
 *
 * > «Per le foto eliminiamo totalmente flux e usiamo Qwen-Image-2.1.»
 *
 * Il perché tecnico che vale la pena tenere: FLUX.2 in GGUF voleva un
 * campionatore montato a pezzi (`CFGGuider` + `SamplerCustomAdvanced` +
 * `Flux2Scheduler`), due text encoder diversi per le due taglie — scambiarli
 * dava `mat1 and mat2 shapes cannot be multiplied` — e il ritocco solo col
 * pennello. Qwen-Image 2.1 torna al `KSampler` unico, ha un lettore solo, e sa
 * anche la modifica a parole. I grafi di FLUX stanno nella storia di git.
 */

/** Dal formato di questa scheda a quello del modulo comune. */
function immagineQwen(m, p) {
  return grafoQwenImmagine({
    prompt: p.prompt,
    seed: p.seed,
    larghezza: p.larghezza,
    altezza: p.altezza,
    passi: p.step,
    turbo: m.turbo,
  });
}

function ritoccoQwen(m, p) {
  return grafoQwenModifica({
    prompt: p.prompt,
    seed: p.seed,
    immagine: p.immagine,
    maschera: p.maschera,
    zona: p.zona,
    larghezza: p.larghezza,
    altezza: p.altezza,
    passi: p.step,
    turbo: m.turbo,
    riferimenti: p.riferimenti,
  });
}

/**
 * Quello che le due strade di Qwen-Image hanno in comune: tutto tranne i
 * passi e la LoRA.
 */
const QWEN_COMUNE = {
  dit: QWEN21.dit,
  txt: QWEN21.txt,
  vae: QWEN21.vae,
  // Legge con Qwen3-VL, che l'italiano lo capisce: tradurre prima non serve, e
  // toglie di mezzo un passaggio che può solo andare storto.
  traduce: false,
  // Distillato: il CFG resta a 1, e a CFG 1 il negativo non si guarda.
  cfg: { min: 1, max: 1, valore: 1 },
  usaNegativo: false,
  // Modifica guardando la foto, non ripartendo dal suo rumore: «quanto
  // cambiare» per lui non vuol dire niente, e il cursore si spegne.
  usaDenoise: false,
  // Sa cambiare una foto intera a parole, senza pennello.
  aParole: true,
  immagine: immagineQwen,
  ritocco: ritoccoQwen,
  serveScheda: true,
};

/* ------------------------------------------------------------- LLaDA-Image */

/*
 * ⚠ **Qui c'erano i due grafi di LLaDA-Image. Tolti il 9 settembre 2026.**
 *
 * > «Si toglie LLaDA, addios. Casomai quando un giorno ComfyUI aggiorna bene ci
 * > pensiamo.»
 *
 * Vale la pena tenere il perche' tecnico, perche' e' la ragione per cui potrebbe
 * tornare: LLaDA non era montato come gli altri due. Anima e FLUX.2 sono fatti a
 * pezzi — un caricatore per il modello, uno per il testo, un campionatore — e la
 * suite li sa guardare mentre lavorano. LLaDA era **una scatola**: un nodo
 * caricava tutto e tornava un'immagine, senza dire niente in mezzo. Da li'
 * venivano meta' dei suoi difetti, la barra di avanzamento compresa.
 *
 * E i suoi 16 GB non stavano nella scheda: andavano avanti e indietro dalla
 * memoria a ogni passo, venti secondi a passo misurati. La 1.2.2 l'aveva portato
 * da 50 passi a 12 — 4,2 minuti — e restava il piu' lento di un ordine di
 * grandezza.
 *
 * I grafi stanno nella storia di git, sotto questo commit.
 */
/* ------------------------------------------------------------- il catalogo */

/**
 * `serveScheda: true` vuol dire **niente scheda video, niente modello**.
 *
 * Non è la stessa cosa di "va più piano": Qwen-Image 2.1 sono quasi undici GB
 * fra pesi e lettore, che sulla CPU non finiscono un'immagine in un tempo che
 * abbia senso, e offrirlo lo stesso significa lasciar scaricare undici GB per
 * poi far aspettare qualcuno davanti a una barra che non si muove. Su una macchina
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
  /**
   * Qwen-Image 2.1, di serie: 40 passi (dalla 1.4.5; prima 25).
   *
   * ⚠ È il predefinito dalla 1.4.0, al posto di FLUX.2 Klein 9B, e per la
   * stessa ragione per cui lo era lui: è quello che capisce meglio le
   * descrizioni lunghe. In più scrive le parole giuste dentro l'immagine e
   * sa modificare a parole.
   */
  qwen21: {
    ...QWEN_COMUNE,
    id: "qwen21",
    nome: "Qwen-Image 2.1",
    riga: "Il più bravo: descrizioni lunghe, scritte, e modifiche a parole. 40 passi.",
    catalogo: QWEN21.catalogo,
    step: PASSI.standard,
    turbo: false,
  },
  /**
   * Lo stesso modello con la LoRA veloce: 8 passi invece di 40.
   *
   * Dalla 1.5.2 è la Viggle Turbo v0.2.1 (distillata a 6 passi, campionata a
   * 8): «rimettiamo anche qwen 8step, ma usiamo viggle la versione nuova».
   * Prima la v0.2 a 5 passi, e prima ancora la v0.1 a 4 (vedi
   * `manifest/models.json`). Si va da 6 a 12 passi.
   */
  "qwen21-turbo": {
    ...QWEN_COMUNE,
    id: "qwen21-turbo",
    nome: "Qwen-Image 2.1 Veloce",
    riga: "Lo stesso, in 8 passi: cinque volte più veloce, 1,3 GB in più.",
    catalogo: QWEN21.catalogoTurbo,
    step: PASSI.turbo,
    turbo: true,
  },
  /*
   * ⚠ **Qui c'era LLaDA-Image, ed e' stato tolto il 9 settembre 2026.**
   *
   * > «Si toglie LLaDA, addios. Casomai quando un giorno ComfyUI aggiorna bene
   * > ci pensiamo.»
   *
   * Era l'unico che sapeva **modificare a parole** invece di ridipingere una
   * zona col pennello, e per questo era rimasto anche dopo che i suoi tempi
   * erano diventati il difetto piu' vecchio della suite: 16 GB di pesi che non
   * stanno in una scheda da 8, quindi avanti e indietro dalla memoria a ogni
   * passo — venti secondi a passo, misurati. La 1.2.2 l'aveva portato da 50
   * passi a 12 (4,2 minuti) e restava il piu' lento di un ordine di grandezza.
   *
   * Con lui se n'e' andato `senzaPennello`, che esisteva solo per dire che lui
   * la maschera non la sapeva leggere.
   *
   * Se un giorno ComfyUI gestisce meglio quel nodo, si rimette: i grafi stanno
   * nella storia di git, e il perche' e' tutto qui sopra.
   */
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
 * Dalla 1.4.0 tutti e due dicono Qwen-Image 2.1.
 */
export const PREDEFINITO = "qwen21";

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
