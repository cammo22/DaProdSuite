/**
 * Tutto quello che sta fuori da questa pagina: il motore e la suite.
 *
 * È il gemello di `apps/foto/src/ponte.js` — stesso motore, stessa libreria —
 * meno il ritocco e più una cosa che serve solo qui: caricare dentro al motore
 * anche **video e audio**, e non solo immagini.
 */

const suite = window.daprodSuite;

let motore = "http://127.0.0.1:8188";

const CLIENTE =
  localStorage.getItem("daprod.cliente") ||
  ((v) => (localStorage.setItem("daprod.cliente", v), v))(crypto.randomUUID());

/* ------------------------------------------------------------------ motore */

export async function collega(alCambioStato, allArrivo) {
  motore = (await window.daprodCinema.motore()) || motore;
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
  if (!risposta.ok) {
    throw new Error(JSON.stringify(esito.node_errors ?? esito.error ?? esito, null, 1));
  }
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

/**
 * Il motore ha qualcosa in mano?
 *
 * Serve a chi sta per liberare la memoria video: `unload_all_models` toglie i
 * pesi anche al lavoro in corso, e quello poi muore nel VAE dicendo che i dati
 * sono sulla scheda e i pesi no. Se qui torna `true`, la scheda non si tocca.
 *
 * Se il motore non risponde si dice **occupato**: fra il rischio di non liberare
 * la memoria e quello di ammazzare un video a metà, il secondo è peggio.
 */
export async function motoreOccupato() {
  try {
    return (await lavoriVivi()).size > 0;
  } catch {
    return true;
  }
}

/**
 * Cuce tante clip in un film solo.
 *
 * Lo fa il motore e non la suite: è lì che c'è un Python acceso che sa dov'è la
 * cartella dei risultati, e ffmpeg — quello del sistema o quello che
 * `imageio_ffmpeg` si porta dentro l'ambiente. Vedi `/daprod/cuci` in
 * `services/comfy/nodi/daprod_ponte`.
 */
export async function cuci(clip, nome) {
  const risposta = await fetch(`${motore}/daprod/cuci`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clip, nome }),
  });
  // Anche gli errori arrivano in JSON, col motivo scritto per essere letto: si
  // legge il corpo comunque, invece di dire "richiesta fallita".
  return risposta.json().catch(() => ({ ok: false, motivo: "Il motore non ha risposto." }));
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
 * `/upload/image` si chiama così per ragioni storiche ma accetta qualunque file
 * e lo scrive nella cartella `input`: è da lì che `LoadImage`, `LoadVideo` e
 * `LoadAudio` pescano, e i riferimenti di MiniMax H3 sono tutte e tre le cose.
 *
 * Il nome torna con la sottocartella davanti (`daprodcinema/xyz.png`), e va
 * bene: quei tre nodi hanno un `validate_inputs` loro che controlla se il file
 * **esiste**, invece del controllo di serie che pretende un nome preso da un
 * elenco. Senza quello, un file appena caricato in una sottocartella verrebbe
 * rifiutato con «Value not in list».
 */
export async function carica(blob, nome, sottocartella = "daprodcinema") {
  const modulo = new FormData();
  modulo.append("image", blob, nome);
  modulo.append("overwrite", "true");
  modulo.append("subfolder", sottocartella);

  const risposta = await fetch(`${motore}/upload/image`, { method: "POST", body: modulo });
  if (!risposta.ok) throw new Error(`Il motore non ha accettato ${nome}.`);

  const esito = await risposta.json();
  return esito.subfolder ? `${esito.subfolder}/${esito.name}` : esito.name;
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
 * Toglie tutto dalla VRAM prima di chiedere un video.
 *
 * Qui conta più che altrove: vedi `memoria.js`. Un modello di un'altra app
 * rimasto in memoria non rallenta la generazione, la fa fallire a metà.
 */
export const svuotaVram = () =>
  fetch(`${motore}/daprod/scarica`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tutti: true }),
  }).catch(() => {});

/** Spegne il modello che scrive, quello di LM Studio. Lo può fare solo la suite. */
export const liberaMemoriaLlm = () => suite.llm.liberaMemoria();

/* ---------------------------------------------------------------- libreria */

export const video = () => suite.libreria.elenco({ tipo: "video", app: "cinema" });
export const scriviMeta = (id, meta) => suite.libreria.meta(id, meta);
export const mostraNellaCartella = (id) => suite.libreria.mostraNellaCartella(id);
export const eliminaElemento = (id) => suite.libreria.elimina(id);
/** Ne porta fuori una copia, scegliendo dove con la finestra di Windows. */
export const salvaCopia = (id) => suite.libreria.salva(id);
export const suLibreriaCambiata = (azione) => suite.libreria.onCambiata(azione);
/** Quando un'altra app manda qui qualcosa: un'immagine, un video, un audio. */
export const suConsegna = (azione) => suite.onConsegna(azione);

/* ----------------------------------------------------------------- modelli */

export const statoModelli = (ids) => suite.modelli.stato(ids);
export const scaricaModelli = (ids) => suite.modelli.scarica(ids);
export const annullaScaricamento = () => suite.modelli.annulla();
/** Chi siamo, per la suite: serve a sapere se uno scaricamento in corso è il nostro. */
export const io = suite.io;
export const suAvanzamentoModelli = (azione) => suite.modelli.onAvanzamento(azione);
export const macchina = () => suite.macchina();

/** L'id con cui la libreria della suite conosce un file appena uscito dal motore. */
export const idLibreria = (file) =>
  ["cinema", file.subfolder || "", file.filename].filter(Boolean).join("/");
