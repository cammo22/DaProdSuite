/**
 * Aspettare il motore, un lavoro per volta.
 *
 * **Perché uno per volta e non tutti in coda.** DaProdMusica e DaProdFoto
 * mandano al motore tutto quello che chiedi e lasciano che se la sbrighi lui:
 * lì i lavori sono indipendenti, e otto immagini in coda sono otto immagini.
 * Qui no. Le inquadrature sono una catena — l'ultimo fotogramma di una è il
 * primo della successiva — e la seconda non si può nemmeno costruire prima che
 * la prima sia finita.
 *
 * E anche se si potesse: diciassette lavori video insieme su una scheda da 8 GB
 * non sono più veloci, sono la stessa cosa più il rischio che a metà finisca la
 * memoria. Una per volta vuol dire anche che «Ferma» ferma davvero, e che
 * riprendere da dove si era rimasti è possibile.
 *
 * Questo modulo è il pezzo che traduce i messaggi del motore in una promessa:
 * `attendi(id)` finisce quando quel lavoro è finito, o si rompe se si rompe.
 */

import { FASI } from "./grafi.js";

/** I messaggi che dicono com'è andata, e che quindi non si possono perdere. */
const ATTESI = new Set(["executed", "execution_error", "execution_interrupted", "executing"]);

/** I lavori che stiamo aspettando, per prompt_id. */
const attese = new Map();

/**
 * I messaggi arrivati **prima** che ci mettessimo in ascolto.
 *
 * C'è una corsa, ed è reale anche se stretta: `invia` manda il grafo con una
 * POST, e `attendi` può registrarsi solo dopo che quella POST ha risposto con
 * l'id. Il motore però comincia a lavorare — e a parlare sul WebSocket — appena
 * riceve il grafo, non appena il client legge la risposta. Un lavoro corto può
 * finire in quella finestra, e allora la promessa non si scioglie più e l'app
 * resta ferma per sempre su un lavoro che è già andato a buon fine.
 *
 * Qui i messaggi di un id sconosciuto si tengono da parte invece di buttarli, e
 * `attendi` se li rigioca appena si registra.
 */
const anticipati = new Map();

/** Chi vuole sapere a che punto è: lo chiama la pagina per disegnare la barra. */
let osservatore = () => {};

export function guarda(azione) {
  osservatore = azione;
}

/**
 * Una promessa che si scioglie quando quel lavoro è finito.
 *
 * Torna i file prodotti, nella forma in cui li dà ComfyUI. Se il motore manda
 * un errore per quel lavoro, la promessa si rompe con il testo dell'errore: è
 * quello che l'utente deve leggere, non un "non ha funzionato".
 */
export function attendi(promptId) {
  return new Promise((risolvi, rifiuta) => {
    attese.set(promptId, { risolvi, rifiuta, uscite: {} });
    // Quello che era arrivato mentre non guardavamo, nell'ordine in cui è
    // arrivato: fra questi può esserci già la fine del lavoro.
    const arretrati = anticipati.get(promptId);
    if (!arretrati) return;
    anticipati.delete(promptId);
    for (const messaggio of arretrati) messaggioDalMotore(messaggio);
  });
}

/** Smette di aspettare tutto: lo chiama «Ferma». */
export function lasciaPerdere() {
  for (const { rifiuta } of attese.values()) rifiuta(new Error("fermato"));
  attese.clear();
  anticipati.clear();
}

/**
 * Un messaggio dal motore.
 *
 * ComfyUI parla per eventi, e i tre che contano sono `executing` (sto lavorando
 * su questo nodo), `progress` (a che punto è il nodo lungo) ed `executed` (ecco
 * cosa è uscito). La fine di un lavoro si riconosce da `executing` con `node`
 * nullo: è il modo in cui ComfyUI dice «ho finito», e non c'è un evento più
 * esplicito di così.
 */
export function messaggioDalMotore(messaggio) {
  const { type, data } = messaggio;
  const attesa = data?.prompt_id ? attese.get(data.prompt_id) : null;

  // Un messaggio con un id che non stiamo (ancora) aspettando: se è uno di
  // quelli che raccontano la sorte del lavoro, si mette da parte. `progress` e
  // gli altri no — servono solo a muovere la barra, e una barra vecchia di
  // mezzo secondo non serve a nessuno.
  if (!attesa && data?.prompt_id && ATTESI.has(type)) {
    if (!anticipati.has(data.prompt_id)) anticipati.set(data.prompt_id, []);
    anticipati.get(data.prompt_id).push(messaggio);
    return;
  }

  if (type === "executed" && attesa) {
    // Le uscite arrivano nodo per nodo: si tengono tutte, e chi aspetta
    // sceglierà quella che gli serve.
    Object.assign(attesa.uscite, { [data.node]: data.output });
    return;
  }

  if (type === "execution_error" && attesa) {
    attese.delete(data.prompt_id);
    attesa.rifiuta(new Error(data.exception_message || "il motore si è fermato"));
    return;
  }

  if (type === "execution_interrupted" && attesa) {
    attese.delete(data.prompt_id);
    attesa.rifiuta(new Error("fermato"));
    return;
  }

  if (type === "executing") {
    if (data.node === null && attesa) {
      attese.delete(data.prompt_id);
      attesa.risolvi(attesa.uscite);
      return;
    }
    const fase = FASI[data.node];
    if (fase) osservatore({ passo: fase.label, quota: fase.da });
    return;
  }

  if (type === "progress" && data.max) {
    const fase = FASI[String(data.node)] ?? FASI["6"];
    osservatore({
      passo: fase.label,
      quota: fase.da + (fase.a - fase.da) * (data.value / data.max),
    });
  }
}
