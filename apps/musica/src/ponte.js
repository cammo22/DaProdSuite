/**
 * Tutto quello che sta fuori da questa pagina.
 *
 * Due interlocutori e basta: **il motore**, cioè ComfyUI, con cui si parla in
 * HTTP e WebSocket, e **la suite**, che tiene la libreria dei risultati. Nessun
 * altro modulo fa una fetch: se domani il motore cambia porta o la libreria
 * cambia forma, si cambia questo file e nient'altro.
 *
 * Quello che qui non c'è più, rispetto a MinimaxMusica, è `library_api.py`:
 * elenco, rinomina, copertine e cancellazione erano un custom node di ComfyUI e
 * ora sono la libreria condivisa della suite. Il vantaggio non è averne di meno,
 * è che i brani li vedono anche le altre app.
 */

const suite = window.daprodSuite;

/** Indirizzo del motore. Riempito da `collega()` prima di ogni altra cosa. */
let motore = "http://127.0.0.1:8188";

/**
 * Lo stesso identificativo anche dopo un ricaricamento della pagina: ComfyUI
 * manda l'avanzamento solo a chi ha inviato il lavoro, e cambiando nome si
 * perderebbero di vista le generazioni già in corso.
 */
const CLIENTE =
  localStorage.getItem("daprod.cliente") ||
  ((v) => (localStorage.setItem("daprod.cliente", v), v))(crypto.randomUUID());

/* ------------------------------------------------------------------ motore */

export async function collega(alCambioStato, allArrivo) {
  motore = (await window.daprodMusica.motore()) || motore;
  apriSocket(alCambioStato, allArrivo);
}

function apriSocket(alCambioStato, allArrivo) {
  const ws = new WebSocket(`${motore.replace(/^http/, "ws")}/ws?clientId=${CLIENTE}`);
  ws.onopen = () => alCambioStato(true);
  ws.onclose = () => {
    alCambioStato(false);
    // Il motore può morire e venire riavviato dal supervisore della suite:
    // l'interfaccia non deve chiedere niente all'utente, deve solo ricollegarsi.
    setTimeout(() => apriSocket(alCambioStato, allArrivo), 2000);
  };
  ws.onmessage = (ev) => {
    if (typeof ev.data === "string") allArrivo(JSON.parse(ev.data));
  };
}

/** Manda un grafo in coda al motore. Torna l'id con cui seguirlo. */
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

export function interrompi() {
  return fetch(`${motore}/interrupt`, { method: "POST" });
}

export function togliDallaCoda(id) {
  return fetch(`${motore}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delete: [id] }),
  });
}

export async function svuotaCoda() {
  await fetch(`${motore}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clear: true }),
  });
  await interrompi();
}

/** Gli id dei lavori che il motore ha ancora in mano, in corso o in attesa. */
export async function lavoriVivi() {
  const q = await (await fetch(`${motore}/queue`, { cache: "no-store" })).json();
  return new Set([...(q.queue_running || []), ...(q.queue_pending || [])].map((x) => x[1]));
}

/** Cosa ha prodotto un lavoro finito. */
export async function risultati(id) {
  try {
    const storia = await (await fetch(`${motore}/history/${id}`)).json();
    return storia[id]?.outputs || {};
  } catch {
    return {};
  }
}

/** L'indirizzo di un file prodotto dal motore, per mostrarlo o rileggerlo. */
export function vista(file) {
  const parametri = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || "",
    type: file.type || "output",
  });
  return `${motore}/view?${parametri}`;
}

export async function modelliInVram() {
  try {
    return await (await fetch(`${motore}/daprod/modelli`, { cache: "no-store" })).json();
  } catch {
    return [];
  }
}

export function scaricaDallaVram(nome) {
  return fetch(`${motore}/daprod/scarica`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
}

/**
 * Toglie tutto dalla VRAM prima di un lavoro che la vuole quasi tutta.
 *
 * MiniMax Music 3 carica 5,5 GB di text encoder su una scheda da 8: se dentro
 * c'è ancora Anima da 4 GB, il caricamento riesce solo *in parte* e il motore
 * muore più avanti con un errore che non nomina la VRAM
 * (`'RVQDepthDecoder' object has no attribute '_v_block'`) — a volte dopo pochi
 * secondi, a volte dopo quattro minuti di lavoro buttato.
 */
export function svuotaVram() {
  return fetch(`${motore}/daprod/scarica`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tutti: true }),
  }).catch(() => {
    // Motore vecchio senza questa rotta: si prova a generare lo stesso.
  });
}

/* ---------------------------------------------------------------- libreria */

export const brani = () => suite.libreria.elenco({ tipo: "audio", app: "musica" });
export const immaginiSalvate = () => suite.libreria.elenco({ tipo: "immagine", app: "musica" });

export const rinomina = (id, nome) => suite.libreria.rinomina(id, nome);
export const scriviMeta = (id, meta) => suite.libreria.meta(id, meta);
export const impostaCopertina = (id, dataUrl) => suite.libreria.copertina(id, dataUrl);
export const eliminaElemento = (id) => suite.libreria.elimina(id);
export const mostraNellaCartella = (id) => suite.libreria.mostraNellaCartella(id);
export const suLibreriaCambiata = (azione) => suite.libreria.onCambiata(azione);

/* ---------------------------------------------------------------- modelli */

/* Cosa c'è sul disco lo sa la suite, non questa pagina: si passano gli id del
   catalogo e lei risponde. Stessa superficie che usa DaProdFoto. */
export const statoModelli = (ids) => suite.modelli.stato(ids);
export const scaricaModelli = (ids) => suite.modelli.scarica(ids);
export const annullaScaricamento = () => suite.modelli.annulla();
/** Chi siamo, per la suite: serve a sapere se uno scaricamento in corso è il nostro. */
export const io = suite.io;
export const suAvanzamentoModelli = (azione) => suite.modelli.onAvanzamento(azione);

/* Toglie dalla memoria il modello che scrive: si chiama un attimo prima di far
   partire una generazione, che e' quando quei GB servono a qualcun altro. */
export const liberaMemoriaLlm = () => suite.llm.liberaMemoria();

/** Manda un brano a un'altra app della suite: è il senso di stare tutti insieme. */
/** Che macchina è questa: c'è una scheda video o no. Chiesta una volta all'avvio. */
export const macchina = () => suite.macchina();

export const mandaA = (app, id, intenzione) => suite.invia(app, id, intenzione);
export const suConsegna = (azione) => suite.onConsegna(azione);

/**
 * L'id con cui la libreria conosce un file appena prodotto dal motore.
 *
 * ComfyUI dice `{filename, subfolder}` rispetto alla propria cartella di uscita,
 * che per quest'app è `output/musica`; la libreria della suite conta invece da
 * `output`. Sono lo stesso file detto in due modi, e questa è la traduzione.
 */
export function idLibreria(file) {
  return ["musica", file.subfolder || "", file.filename].filter(Boolean).join("/");
}

/**
 * Prende un'immagine dal motore e la restituisce ritagliata quadrata, pronta da
 * salvare come copertina.
 *
 * Il ritaglio lo fa la pagina con un canvas invece che il motore con PIL: è la
 * stessa operazione che serve quando la copertina la scegli da un file tuo, e
 * averne una sola versione vuol dire che le due strade danno lo stesso risultato.
 */
export async function ritagliaQuadrata(sorgente, lato = 640) {
  const risposta = await fetch(sorgente);
  const immagine = await createImageBitmap(await risposta.blob());
  const corto = Math.min(immagine.width, immagine.height);

  const tela = document.createElement("canvas");
  tela.width = tela.height = lato;
  tela
    .getContext("2d")
    .drawImage(
      immagine,
      (immagine.width - corto) / 2,
      (immagine.height - corto) / 2,
      corto,
      corto,
      0,
      0,
      lato,
      lato,
    );
  immagine.close();
  return tela.toDataURL("image/jpeg", 0.85);
}
