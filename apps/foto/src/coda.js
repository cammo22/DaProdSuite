/**
 * I lavori in corso e il pannello Sessione.
 *
 * Più semplice di quello di Musica: qui i lavori sono tutti della stessa specie
 * — un'immagine — e durano secondi invece che minuti, quindi non serve dividere
 * l'avanzamento in fasi. Quello che serve è vedere quante ne mancano e poterne
 * togliere una dalla coda senza fermare le altre.
 */

import { el, escapeHtml, fmtTime } from "./dom.js";
import { annuncia } from "./bus.js";
import * as ponte from "./ponte.js";

const lavori = new Map();
let ordine = [];
let ultimoDisegno = "";

const lavoro = (id) => lavori.get(id);
const inCorso = () => ordine.map(lavoro).find((l) => l && l.stato === "in-corso");

export function aggiungiLavoro(id, descrizione, meta) {
  lavori.set(id, { id, descrizione, meta, stato: "in-attesa", avanzamento: 0, inizio: null });
  ordine.push(id);
  disegnaSessione();
}

function togliLavoro(id) {
  lavori.delete(id);
  ordine = ordine.filter((x) => x !== id);
  disegnaSessione();
}

export function disegnaSessione() {
  const attivi = ordine.map(lavoro).filter(Boolean);

  const html = attivi.length
    ? attivi.map(riquadro).join("")
    : `<div class="empty">Niente in lavorazione. Scrivi cosa vuoi vedere e premi <b>Genera</b>.</div>`;

  if (html === ultimoDisegno) return;
  ultimoDisegno = html;
  el.sessione.innerHTML = html;

  el.sessione.querySelectorAll("[data-annulla]").forEach((b) => {
    b.onclick = () => annulla(b.dataset.annulla);
  });
}

function riquadro(l) {
  const corre = l.stato === "in-corso";
  const secondi = l.inizio ? Math.floor((Date.now() - l.inizio) / 1000) : 0;

  return `<div class="track">
    <div class="thumb shimmer"></div>
    <div class="tmeta">
      <div class="tt">${escapeHtml(l.descrizione)}</div>
      <div class="tsub">${corre ? `in lavorazione &middot; ${fmtTime(secondi)}` : "in attesa"}</div>
      <div class="bar"><i class="p1" style="width:${(l.avanzamento * 100).toFixed(1)}%"></i></div>
    </div>
    <div class="tact"><button class="del" data-annulla="${escapeHtml(l.id)}" title="annulla">&#10005;</button></div>
  </div>`;
}

async function annulla(id) {
  const l = lavoro(id);
  if (!l) return;
  if (l.stato === "in-corso") await ponte.interrompi();
  else await ponte.togliDallaCoda(id);
  togliLavoro(id);
}

export function messaggioDalMotore(msg) {
  const d = msg.data || {};
  const l = d.prompt_id ? lavoro(d.prompt_id) : null;

  switch (msg.type) {
    case "execution_start":
      if (l) {
        l.stato = "in-corso";
        l.inizio = Date.now();
        disegnaSessione();
      }
      break;

    case "progress": {
      const suo = d.prompt_id ? l : inCorso();
      if (!suo || !d.max) break;
      suo.stato = "in-corso";
      suo.inizio = suo.inizio || Date.now();
      suo.avanzamento = d.value / d.max;
      disegnaSessione();
      break;
    }

    case "execution_success":
      if (l) void concludi(l);
      break;

    case "execution_interrupted":
      if (l) togliLavoro(l.id);
      break;

    case "execution_error":
      annuncia("errore", `${d.exception_type || ""}: ${d.exception_message || "errore sconosciuto"}`);
      if (l) togliLavoro(l.id);
      break;

    case "status":
      if (d.status && !inCorso()) {
        el.statusTxt.textContent = d.status.exec_info?.queue_remaining ? "in coda" : "pronto";
      }
      break;
  }
}

async function concludi(l) {
  const uscite = await ponte.risultati(l.id);
  const prodotte = Object.values(uscite).flatMap((o) => o.images || []);

  // I parametri restano accanto all'immagine: senza, "com'e' che l'avevo fatta?"
  // e' una domanda senza risposta il giorno dopo.
  for (const immagine of prodotte) {
    try {
      await ponte.scriviMeta(ponte.idLibreria(immagine), { ...l.meta, ts: Date.now() });
    } catch {
      // L'immagine c'e' comunque: i metadati sono un di piu'.
    }
  }

  togliLavoro(l.id);
  annuncia("galleria-cambiata");
}

/** Ributta via i lavori che il motore non ha più: dopo un suo riavvio, o un ricarico. */
export async function riallinea() {
  try {
    const vivi = await ponte.lavoriVivi();
    ordine.slice().forEach((id) => {
      if (!vivi.has(id)) togliLavoro(id);
    });
  } catch {
    // Motore spento: se ne riparla al prossimo giro.
  }
}

export function collegaComandiCoda() {
  el.stop.onclick = () => ponte.interrompi();
  el.svuota.onclick = async () => {
    await ponte.svuotaCoda();
    ordine.slice().forEach(togliLavoro);
  };

  setInterval(() => {
    disegnaSessione();
    if (ordine.length) void riallinea();
  }, 1000);
}
