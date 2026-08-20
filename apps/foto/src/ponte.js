/**
 * Tutto quello che sta fuori da questa pagina: il motore e la suite.
 *
 * È il gemello di `apps/musica/src/ponte.js` — stesso motore, stessa libreria —
 * meno le cose che riguardano i brani e più quelle che riguardano le immagini:
 * qui si caricano file *dentro* al motore, cosa che a Musica non serviva mai.
 */

const suite = window.daprodSuite;

let motore = "http://127.0.0.1:8188";

const CLIENTE =
  localStorage.getItem("daprod.cliente") ||
  ((v) => (localStorage.setItem("daprod.cliente", v), v))(crypto.randomUUID());

/* ------------------------------------------------------------------ motore */

export async function collega(alCambioStato, allArrivo) {
  motore = (await window.daprodFoto.motore()) || motore;
  apriSocket(alCambioStato, allArrivo);
}

function apriSocket(alCambioStato, allArrivo) {
  const ws = new WebSocket(`${motore.replace(/^http/, "ws")}/ws?clientId=${CLIENTE}`);
  ws.onopen = () => alCambioStato(true);
  ws.onclose = () => {
    alCambioStato(false);
    setTimeout(() => apriSocket(alCambioStato, allArrivo), 2000);
  };
  ws.onmessage = (ev) => {
    if (typeof ev.data === "string") allArrivo(JSON.parse(ev.data));
  };
}

export async function invia(grafo) {
  const risposta = await fetch(`${motore}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: grafo, client_id: CLIENTE }),
  });
  const esito = await risposta.json();
  if (!risposta.ok) throw new Error(JSON.stringify(esito.node_errors ?? esito.error ?? esito, null, 1));
  return esito.prompt_id;
}

export const interrompi = () => fetch(`${motore}/interrupt`, { method: "POST" });

export const togliDallaCoda = (id) =>
  fetch(`${motore}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delete: [id] }),
  });

export async function svuotaCoda() {
  await fetch(`${motore}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clear: true }),
  });
  await interrompi();
}

export async function lavoriVivi() {
  const q = await (await fetch(`${motore}/queue`, { cache: "no-store" })).json();
  return new Set([...(q.queue_running || []), ...(q.queue_pending || [])].map((x) => x[1]));
}

export async function risultati(id) {
  try {
    const storia = await (await fetch(`${motore}/history/${id}`)).json();
    return storia[id]?.outputs || {};
  } catch {
    return {};
  }
}

export function vista(file) {
  const parametri = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || "",
    type: file.type || "output",
  });
  return `${motore}/view?${parametri}`;
}

/**
 * Mette un file dentro al motore, e torna il nome con cui il grafo lo ritrova.
 *
 * Il ritocco ha bisogno di due immagini che non vengono da lui — la foto di
 * partenza e la maschera dipinta — e i nodi `LoadImage` e `LoadImageMask` sanno
 * leggere solo dalla cartella `input` di ComfyUI. Questa è quella cartella.
 */
export async function carica(blob, nome) {
  const modulo = new FormData();
  modulo.append("image", blob, nome);
  modulo.append("overwrite", "true");
  modulo.append("subfolder", "daprodfoto");

  const risposta = await fetch(`${motore}/upload/image`, { method: "POST", body: modulo });
  if (!risposta.ok) throw new Error("Il motore non ha accettato l'immagine.");

  const esito = await risposta.json();
  return esito.subfolder ? `${esito.subfolder}/${esito.name}` : esito.name;
}

/**
 * Traduce in inglese quello che hai scritto in italiano.
 *
 * Torna sempre un testo usabile: se il traduttore non c'è o si rompe, torna
 * l'originale con `tradotta: false`, e l'interfaccia lo dice. Un traduttore
 * mancante non deve mai impedire di generare — al massimo si genera peggio.
 */
export async function traduci(testo, attesaMassimaMs = 120_000) {
  try {
    const risposta = await fetch(`${motore}/daprod/traduci`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testo }),
      // **Un tempo massimo, sempre.** Senza, una richiesta che non torna
      // lasciava l'app su «Traduco…» per sempre, e l'unico modo di uscirne era
      // chiudere la finestra. Due minuti sono molto più del necessario — una
      // traduzione dura un secondo, il primo caricamento qualcuno in più — ma
      // sono un tempo che finisce.
      signal: AbortSignal.timeout(attesaMassimaMs),
    });
    if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
    return await risposta.json();
  } catch (e) {
    const scaduto = e.name === "TimeoutError" || e.name === "AbortError";
    return {
      tradotto: testo,
      originale: testo,
      tradotta: false,
      motivo: scaduto
        ? "il traduttore non ha risposto in due minuti"
        : String(e.message || e),
    };
  }
}

/**
 * A che punto è la traduzione: la si chiede mentre si aspetta.
 *
 * Costa niente al motore — legge un dizionario — ed è quello che fa muovere la
 * barra invece di lasciare tre puntini fermi.
 */
export async function statoTraduttore() {
  try {
    const risposta = await fetch(`${motore}/daprod/traduttore`, { cache: "no-store" });
    return risposta.ok ? await risposta.json() : null;
  } catch {
    return null;
  }
}

export async function modelliInVram() {
  try {
    return await (await fetch(`${motore}/daprod/modelli`, { cache: "no-store" })).json();
  } catch {
    return [];
  }
}

export const scaricaDallaVram = (nome) =>
  fetch(`${motore}/daprod/scarica`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });

/**
 * Toglie tutto dalla VRAM, com'era prima di cominciare.
 *
 * Serve quando si cambia modello di immagini: quello di prima resterebbe dentro
 * con il suo text encoder e il suo VAE — e su una scheda da 8 GB sono i GB che
 * mancano a quello nuovo. Gemella di quella di DaProdMusica, vedi `memoria.js`.
 */
export const svuotaVram = () =>
  fetch(`${motore}/daprod/scarica`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tutti: true }),
  }).catch(() => {
    // Motore vecchio senza questa rotta: si prova a generare lo stesso.
  });

/**
 * Spegne il modello che scrive, quello di LM Studio.
 *
 * Non lo può fare il motore: LM Studio è un altro programma, e i suoi GB il
 * motore non li vede nemmeno. Lo fa la suite, che parla con tutti e due.
 */
export const liberaMemoriaLlm = () => suite.llm.liberaMemoria();

/* ---------------------------------------------------------------- libreria */

export const immagini = () => suite.libreria.elenco({ tipo: "immagine", app: "foto" });
export const eliminaElemento = (id) => suite.libreria.elimina(id);
export const scriviMeta = (id, meta) => suite.libreria.meta(id, meta);
export const mostraNellaCartella = (id) => suite.libreria.mostraNellaCartella(id);
/** Una copia dove dice l'utente. Torna il percorso scelto, o null se ha annullato. */
export const salvaCopia = (id) => suite.libreria.salva(id);
export const suLibreriaCambiata = (azione) => suite.libreria.onCambiata(azione);

/* ---------------------------------------------------------------- modelli */

/* Cosa c'è sul disco e cosa manca lo sa la suite, non questa pagina: qui si
   passano solo gli id del catalogo del modello scelto. */
export const statoModelli = (ids) => suite.modelli.stato(ids);
export const scaricaModelli = (ids) => suite.modelli.scarica(ids);
export const annullaScaricamento = () => suite.modelli.annulla();
export const suAvanzamentoModelli = (azione) => suite.modelli.onAvanzamento(azione);

/**
 * Che macchina è questa: c'è una scheda video o no.
 *
 * Si chiede una volta all'avvio. Non cambia mentre l'app è aperta, e serve al
 * menu dei modelli per spegnere quelli che senza NVIDIA non hanno senso.
 */
export const macchina = () => suite.macchina();

export const mandaA = (app, id, intenzione) => suite.invia(app, id, intenzione);
export const suConsegna = (azione) => suite.onConsegna(azione);

/** L'id con cui la libreria della suite conosce un file appena uscito dal motore. */
export const idLibreria = (file) =>
  ["foto", file.subfolder || "", file.filename].filter(Boolean).join("/");
