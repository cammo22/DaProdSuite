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

/** Le riserve di ogni LoRA, e l'id del catalogo da scaricare quando manca. */
const RISERVE = {
  [QWEN21.turbo]: { id: QWEN21.idTurbo, riserve: QWEN21.riserveTurbo },
};

const TIPI_LORA = ["LoraLoaderModelOnly", "LoraLoader"];

let elenco = null;
let quando = 0;

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
