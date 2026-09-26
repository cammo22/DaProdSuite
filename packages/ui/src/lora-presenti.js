/**
 * Le LoRA che il grafo chiede, confrontate con quelle che il motore ha davvero.
 *
 * ⚠ Nuovo nella 1.4.7. Cammo, dopo la 1.4.5: «mi da problemi con qwen… vai a
 * vedere come fa WanGP». L'errore era questo:
 *
 *     LoraLoaderModelOnly: lora_name
 *     'Qwen-Image-2.1-viggle-turbo-v0.2-5step-lora-r256_comfy.safetensors'
 *     not in ['Qwen-Image-2.1-viggle-turbo-4step-r64-comfyui-T8.safetensors']
 *
 * La 1.4.5 ha cambiato la turbo da 4 a 5 passi, ma il file nuovo non era
 * ancora sul disco: il grafo lo chiedeva lo stesso, e il motore diceva di no.
 *
 * **Come fa WanGP**: prima di generare guarda i file del modello scelto, e
 * quello che manca lo scarica lì, invece di fidarsi di un controllo fatto
 * prima. Qui uguale, un attimo prima di mandare il grafo:
 *
 * 1. si chiede al motore quali LoRA vede (`/object_info`, la stessa lista che
 *    usa lui per dire di no);
 * 2. se una LoRA chiesta non c'è ma c'è una sua **riserva** (la turbo a 4
 *    passi della 1.4.4), si usa quella, coi sigma suoi: l'immagine parte;
 * 3. in ogni caso la LoRA mancante si fa **scaricare** dalla suite, e dalla
 *    volta dopo si usa lei;
 * 4. se non c'è neanche una riserva, si dice cosa manca in italiano, invece
 *    del JSON del motore.
 *
 * Sta qui, e non in Foto o in Musica, perché i grafi Qwen li mandano tutte e
 * due: una cosa sola, uguale ovunque.
 */

import { QWEN21 } from "./qwen-image.js";

/**
 * ⚠ **Non solo le LoRA, dalla 1.5.2: tutti i file che il grafo chiede.**
 * «Usiamo bene le cose di ComfyUI, che non mi sembra stiano funzionando
 * proprio bene.» Il motore dice di no a un file che non vede con un JSON
 * («value_not_in_list»), e quel JSON arrivava tale e quale fino al telefono.
 * Adesso, un attimo prima di mandare il grafo, si guardano anche modello,
 * lettore del testo, VAE e checkpoint: quello che manca si fa scaricare dalla
 * suite, e si dice cosa manca in italiano.
 *
 * Per ogni tipo di nodo, il campo col nome del file. La lista dei file che il
 * motore vede e' quella di `/object_info/<nodo>`, la stessa con cui dice di no.
 */
const CARICATORI = {
  UnetLoaderGGUF: "unet_name",
  UNETLoader: "unet_name",
  CLIPLoader: "clip_name",
  VAELoader: "vae_name",
  CheckpointLoaderSimple: "ckpt_name",
};

/** I file che conosciamo, con l'id del catalogo per farli scaricare e un nome da dire. */
const FILE_NOTI = {
  [QWEN21.dit]: { id: "qwen21-q4km", nome: "Qwen-Image 2.1" },
  [QWEN21.txt]: { id: "qwen21-text-encoder", nome: "il lettore del testo di Qwen-Image 2.1" },
  [QWEN21.vae]: { id: "qwen21-vae", nome: "il VAE di Qwen-Image 2.1" },
  "yue2_3b_int8_convrot.safetensors": { id: "yue2-3b-int8", nome: "YuE2" },
};

/** Le riserve di ogni LoRA, e l'id del catalogo da scaricare quando manca. */
const RISERVE = {
  [QWEN21.turbo]: { id: QWEN21.idTurbo, riserve: QWEN21.riserveTurbo },
};

const TIPI_LORA = ["LoraLoaderModelOnly", "LoraLoader"];

let elenco = null;
let quando = 0;
/** Le liste dei file degli altri caricatori, una per tipo di nodo, per 10 secondi. */
const liste = new Map();

/** Le LoRA che il motore vede. Si ricorda per 10 secondi. */
async function loraDelMotore(motore) {
  if (elenco && Date.now() - quando < 10000) return elenco;
  const r = await fetch(`${motore}/object_info/LoraLoaderModelOnly`, { cache: "no-store" });
  if (!r.ok) return null;
  const info = await r.json();
  const lista = info?.LoraLoaderModelOnly?.input?.required?.lora_name?.[0];
  if (!Array.isArray(lista)) return null;
  elenco = new Set(lista);
  quando = Date.now();
  return elenco;
}

/** Da chiamare dopo uno scaricamento: la lista del motore va riletta. */
export function dimenticaLeLora() {
  elenco = null;
  liste.clear();
}

/** I file che il motore vede per un tipo di nodo, o null se non risponde. */
async function fileDelMotore(motore, tipo, campo) {
  const gia = liste.get(tipo);
  if (gia && Date.now() - gia.quando < 10000) return gia.file;
  const r = await fetch(`${motore}/object_info/${tipo}`, { cache: "no-store" });
  if (!r.ok) return null;
  const info = await r.json();
  const req = info?.[tipo]?.input?.required?.[campo];
  // Due forme: la vecchia [lista, {…}] e la nuova ["COMBO", {options: lista}].
  const lista = Array.isArray(req?.[0]) ? req[0] : Array.isArray(req?.[1]?.options) ? req[1].options : null;
  if (!lista) return null;
  const file = new Set(lista);
  liste.set(tipo, { file, quando: Date.now() });
  return file;
}

/**
 * Controlla che i file dei caricatori ci siano. Quelli noti che mancano si
 * fanno scaricare; se ne manca anche solo uno, si ferma qui con una frase in
 * italiano invece di lasciar dire di no al motore.
 */
async function controllaIFile(motore, grafo, scarica, fatto) {
  const mancano = [];
  for (const nodo of Object.values(grafo)) {
    const campo = CARICATORI[nodo?.class_type];
    if (!campo) continue;
    const nome = nodo.inputs?.[campo];
    if (typeof nome !== "string") continue;
    let presenti;
    try {
      presenti = await fileDelMotore(motore, nodo.class_type, campo);
    } catch {
      presenti = null;
    }
    // Il motore non risponde a questa domanda: dira' lui.
    if (!presenti || presenti.has(nome)) continue;
    const noto = FILE_NOTI[nome];
    if (noto && scarica && !fatto.scaricate.includes(noto.id)) {
      fatto.scaricate.push(noto.id);
      Promise.resolve()
        .then(() => scarica([noto.id]))
        .then(dimenticaLeLora, () => {});
    }
    mancano.push(noto ? noto.nome : "«" + nome + "»");
  }
  if (mancano.length) {
    throw new Error(
      "Sul computer manca " + mancano.join(", ") + ". " +
        (scarica ? "Lo sto scaricando: riprova quando la barra dei modelli ha finito." : "Scaricalo dalla scheda dei modelli."),
    );
  }
}

/**
 * Il no del motore, detto in italiano (1.5.2). ComfyUI risponde con
 * `node_errors`: per ogni nodo, cosa non va. Qui si tiene la prima cosa che
 * una persona puo' capire — un file che manca, un nodo che non c'e' (ComfyUI
 * vecchio), la memoria — e il resto resta nella console.
 */
export function spiegaIlNo(esito) {
  const errori = esito?.node_errors ? Object.values(esito.node_errors) : [];
  for (const e of errori) {
    for (const x of e?.errors || []) {
      if (x.type === "value_not_in_list") {
        const detto = String(x.details || x.message || "");
        return new Error("Sul computer manca un file del modello (" + detto.split(":")[0] + "). Aprilo dalla scheda dei modelli e scaricalo.");
      }
    }
  }
  const tipo = esito?.error?.type || "";
  const msg = String(esito?.error?.message || "");
  if (tipo === "invalid_prompt" && /does not exist|not found/i.test(msg)) {
    return new Error("Il motore non conosce uno dei nodi del grafo: va aggiornato ComfyUI dalla suite.");
  }
  if (/out of memory|OOM/i.test(msg)) {
    return new Error("La scheda video ha finito la memoria: chiudi le altre cose aperte o scegli la strada veloce.");
  }
  console.warn("[motore] no:", esito);
  return new Error(msg || "Il motore ha detto di no a questo lavoro. Il dettaglio e' nella console.");
}

/**
 * Sistema il grafo prima di mandarlo. Torna il grafo (lo stesso oggetto,
 * cambiato) e cosa e' stato fatto.
 *
 * `scarica(ids)` e' quello della suite (`suite.modelli.scarica`): si chiama e
 * non si aspetta, perche' la turbo pesa 1,3 GB e l'immagine intanto parte con
 * la riserva.
 */
export async function metteLeLoraCheCi(motore, grafo, { scarica } = {}) {
  const fatto = { sostituite: [], scaricate: [] };
  await controllaIFile(motore, grafo, scarica, fatto);
  const nodi = Object.entries(grafo).filter(([, n]) => TIPI_LORA.includes(n?.class_type));
  if (!nodi.length) return { grafo, ...fatto };

  let presenti;
  try {
    presenti = await loraDelMotore(motore);
  } catch {
    presenti = null;
  }
  // Il motore non risponde a questa domanda: si manda com'e', dira' lui.
  if (!presenti) return { grafo, ...fatto };

  for (const [, nodo] of nodi) {
    const chiesta = nodo.inputs.lora_name;
    if (presenti.has(chiesta)) continue;
    const r = RISERVE[chiesta];
    if (r && scarica && !fatto.scaricate.includes(r.id)) {
      fatto.scaricate.push(r.id);
      Promise.resolve()
        .then(() => scarica([r.id]))
        .then(dimenticaLeLora, () => {});
    }
    const riserva = r?.riserve.find((x) => presenti.has(x.file));
    if (!riserva) {
      throw new Error(
        `Manca la LoRA «${chiesta}». ` +
          (r ? "La sto scaricando: riprova quando la barra dei modelli ha finito." : "Scaricala dalla scheda dei modelli."),
      );
    }
    nodo.inputs.lora_name = riserva.file;
    // I sigma della riserva: la turbo a 4 passi e' stata distillata sui suoi.
    for (const altro of Object.values(grafo)) {
      if (altro?.class_type === "ManualSigmas") altro.inputs.sigmas = riserva.sigmi;
    }
    fatto.sostituite.push({ da: chiesta, a: riserva.file });
  }
  return { grafo, ...fatto };
}
