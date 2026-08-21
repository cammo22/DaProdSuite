/**
 * Tutto quello che sta fuori da questa pagina: il motore e la suite.
 *
 * Il motore qui non è ComfyUI ma quello di DaProdVoce, su 8780, e parla una
 * lingua sua — REST e basta, niente WebSocket: le cose che succedono sono poche
 * e lente, e chiedere «a che punto sei» una volta al secondo costa meno di un
 * canale aperto da tenere in piedi.
 *
 * La parte di suite è quella di tutte le app: la libreria dei risultati, e il
 * modo di passarsi le cose fra una scheda e l'altra.
 */

const suite = window.daprodSuite;

let motore = "http://127.0.0.1:8780";

/* ------------------------------------------------------------------ motore */

/** Chiede alla suite dove sta il motore e prova a raggiungerlo. */
export async function collega(alCambioStato) {
  motore = (await window.daprodVoce.motore()) || motore;

  const battito = async () => {
    try {
      const risposta = await fetch(`${motore}/health`, { cache: "no-store" });
      alCambioStato(risposta.ok);
    } catch {
      alCambioStato(false);
    }
  };

  await battito();
  // Ogni cinque secondi: il motore può morire, e la pagina deve accorgersene
  // senza che si debba premere qualcosa per scoprirlo.
  setInterval(() => void battito(), 5000);
}

async function chiedi(percorso, opzioni = {}) {
  const risposta = await fetch(`${motore}${percorso}`, opzioni);
  const testo = await risposta.text();
  let esito = {};
  try {
    esito = testo ? JSON.parse(testo) : {};
  } catch {
    esito = { detail: testo };
  }
  if (!risposta.ok) throw new Error(esito.detail || `il motore ha risposto ${risposta.status}`);
  return esito;
}

export const stato = () => chiedi("/api/stato", { cache: "no-store" });
export const liberaMemoria = () => chiedi("/api/libera", { method: "POST" });

export const parla = (corpo) =>
  chiedi("/api/parla", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

export const lavoro = (id) => chiedi(`/api/lavoro/${id}`, { cache: "no-store" });

export const voci = () => chiedi("/api/voci", { cache: "no-store" });

export function salvaVoce(nome, testo, file) {
  const modulo = new FormData();
  modulo.append("nome", nome);
  modulo.append("testo", testo);
  modulo.append("audio", file, file.name || "voce.wav");
  return chiedi("/api/voci", { method: "POST", body: modulo });
}

export const eliminaVoce = (id) => chiedi(`/api/voci/${encodeURIComponent(id)}`, { method: "DELETE" });

/* ---------------------------------------------------------------- libreria */

/**
 * Quello che ha fatto DaProdVoce, meno le voci di riferimento.
 *
 * Stanno tutte e due sotto `output/voce`, e la libreria della suite le vede
 * tutte e due come audio di quest'app. La differenza è la cartella: `voci/` sono
 * i riferimenti — roba che entra — e il resto è quello che è uscito. Mescolarli
 * in galleria vorrebbe dire non ritrovare più niente.
 */
export async function detti() {
  const tutti = await suite.libreria.elenco({ tipo: "audio", app: "voce" });
  return tutti.filter((v) => !v.id.startsWith("voce/voci/"));
}

/** Gli audio di tutte le app: servono per prendere un riferimento dalla libreria. */
export const audioDellaSuite = () => suite.libreria.elenco({ tipo: "audio" });

export const mostraNellaCartella = (id) => suite.libreria.mostraNellaCartella(id);
export const salvaCopia = (id) => suite.libreria.salva(id);
export const eliminaElemento = (id) => suite.libreria.elimina(id);
export const suLibreriaCambiata = (azione) => suite.libreria.onCambiata(azione);
export const suConsegna = (azione) => suite.onConsegna(azione);
export const mandaA = (app, id, intenzione) => suite.invia(app, id, intenzione);

/* ----------------------------------------------------------------- modelli */

export const statoModelli = (ids) => suite.modelli.stato(ids);
export const scaricaModelli = (ids) => suite.modelli.scarica(ids);
export const annullaScaricamento = () => suite.modelli.annulla();
export const io = suite.io;
export const suAvanzamentoModelli = (azione) => suite.modelli.onAvanzamento(azione);
export const macchina = () => suite.macchina();
