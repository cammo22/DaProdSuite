/**
 * Tutto quello che sta fuori da questa pagina: il motore e la suite.
 *
 * È il gemello di `apps/foto/src/ponte.js` — stesso motore, stessa libreria —
 * meno il ritocco e più due cose che servono solo qui: caricare **video e
 * audio** dentro al motore, e leggere l'ultimo fotogramma di una clip.
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
  if (!risposta.ok) throw new Error(JSON.stringify(esito.node_errors ?? esito.error ?? esito, null, 1));
  return esito.prompt_id;
}

export const interrompi = () => fetch(`${motore}/interrupt`, { method: "POST" });

export async function svuotaCoda() {
  await fetch(`${motore}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clear: true }),
  });
  await interrompi();
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
 * `/upload/image` si chiama così per ragioni storiche ma accetta qualunque
 * file e lo scrive nella cartella `input`: è da lì che `LoadVideo` e `LoadAudio`
 * pescano, e il montaggio finale ha bisogno di tutte e due — le clip appena
 * girate e il brano su cui vanno.
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

/** Scarica dal motore un file che ha appena prodotto, per rimandarglielo dentro. */
export async function leggi(file) {
  const risposta = await fetch(vista(file));
  if (!risposta.ok) throw new Error(`Non riesco a rileggere ${file.filename}.`);
  return risposta.blob();
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
 * Toglie tutto dalla VRAM prima di cominciare a girare.
 *
 * Qui conta più che altrove: un video sono diciassette lavori di fila, e se il
 * primo parte con la scheda mezza occupata da un modello di un'altra app non
 * fallisce il primo — falliscono tutti e diciassette, uno dopo l'altro.
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

/** I brani da cui si parte: quelli di DaProdMusica, e qualunque altro audio. */
export const brani = () => suite.libreria.elenco({ tipo: "audio" });
export const video = () => suite.libreria.elenco({ tipo: "video", app: "cinema" });
export const scriviMeta = (id, meta) => suite.libreria.meta(id, meta);
export const mostraNellaCartella = (id) => suite.libreria.mostraNellaCartella(id);
export const suLibreriaCambiata = (azione) => suite.libreria.onCambiata(azione);
export const suConsegna = (azione) => suite.onConsegna(azione);

/* ---------------------------------------------------------------- modelli */

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
