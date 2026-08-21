/**
 * I lavori in corso e il pannello Sessione.
 *
 * Più semplice di quello di Musica: qui i lavori sono tutti della stessa specie
 * — un'immagine — e durano secondi invece che minuti, quindi non serve dividere
 * l'avanzamento in fasi. Quello che serve è vedere quante ne mancano e poterne
 * togliere una dalla coda senza fermare le altre.
 */

import { el, escapeHtml, fmtTime } from "./dom.js";
// La lista che si aggiorna senza rifarsi da capo: vale per tutte le app, quindi
// sta in `packages/ui` e la suite la serve sotto `/comune/`.
import { disegnaLista } from "/comune/lista-viva.js";
import { annuncia } from "./bus.js";
import { stato } from "./stato.js";
import { mostraLente } from "./lente.js";
import * as ponte from "./ponte.js";

const lavori = new Map();
let ordine = [];

const lavoro = (id) => lavori.get(id);
const inCorso = () => ordine.map(lavoro).find((l) => l && l.stato === "in-corso");

export function aggiungiLavoro(id, descrizione, meta) {
  // I due orologi: `chiesto` parte quando hai premuto Genera e non si azzera mai
  // — coda compresa — mentre `inizio` è quando il motore ha preso in mano questo
  // lavoro.
  lavori.set(id, {
    id,
    descrizione,
    meta,
    stato: "in-attesa",
    avanzamento: 0,
    chiesto: Date.now(),
    inizio: null,
  });
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
  // Le ultime fatte, qui sotto: quello che si è appena generato si vede dove lo
  // si è chiesto, senza cambiare scheda per andarlo a cercare.
  const ultime = stato.immagini.slice(0, 8);

  // Ogni pezzo con la sua chiave: il lavoro in corso si aggiorna in casa —
  // scorrono il tempo e la barra — e la striscia delle ultime immagini resta
  // dov'è. Rifare tutto a ogni secondo, com'era prima, voleva dire ricaricare
  // quelle immagini una volta al secondo.
  const voci = attivi.map((l) => ({
    chiave: `lavoro:${l.id}`,
    html: riquadro(l),
    aggiorna: (nodo) => aggiornaRiquadro(nodo, l),
  }));

  if (!voci.length) {
    voci.push({
      chiave: "vuoto",
      html: `<div class="empty">Niente in lavorazione. Scrivi cosa vuoi vedere e premi <b>Genera</b>.</div>`,
    });
  }

  if (ultime.length) {
    voci.push({
      chiave: "ultime",
      html: `<div class="ultime">${ultime
        .map(
          (i) =>
            `<img src="${escapeHtml(i.url)}" alt="" loading="lazy" data-lente="${escapeHtml(i.id)}"
             title="${escapeHtml(i.meta?.testo ?? i.nome)}">`,
        )
        .join("")}</div>`,
    });
  }

  if (!disegnaLista(el.sessione, voci)) return;

  el.sessione.querySelectorAll("[data-annulla]").forEach((b) => {
    b.onclick = () => annulla(b.dataset.annulla);
  });
  el.sessione.querySelectorAll("[data-lente]").forEach((img) => {
    img.onclick = () => {
      const immagine = stato.immagini.find((i) => i.id === img.dataset.lente);
      if (immagine) mostraLente(immagine.url, immagine.meta?.testo ?? immagine.nome);
    };
  });
}

function sottotitolo(l) {
  const aspettato = fmtTime(Math.floor((Date.now() - l.chiesto) / 1000));
  return l.stato === "in-corso" ? `in lavorazione &middot; ${aspettato}` : `in coda &middot; ${aspettato}`;
}

/**
 * Cambia il tempo e la barra lasciando in piedi il riquadro: così la miniatura
 * non ricomincia la sua animazione a ogni secondo.
 */
function aggiornaRiquadro(nodo, l) {
  const sub = nodo.querySelector(".tsub");
  const barra = nodo.querySelector(".p1");
  if (sub) sub.innerHTML = sottotitolo(l);
  if (barra) barra.style.width = `${(l.avanzamento * 100).toFixed(1)}%`;
}

function riquadro(l) {
  return `<div class="track">
    <div class="thumb shimmer"></div>
    <div class="tmeta">
      <div class="tt">${escapeHtml(l.descrizione)}</div>
      <div class="tsub">${sottotitolo(l)}</div>
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
        // `|| Date.now()`: `execution_start` arriva anche quando il motore riprende
        // un lavoro, e riscriverlo azzerava il cronometro.
        l.inizio = l.inizio || Date.now();
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
  // Ci si arriva da due strade — il messaggio del motore e il riallineamento
  // qui sotto — e possono capitare insieme.
  if (l.concluso) return;
  l.concluso = true;

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

  // Il ritocco finito torna sulla sua tela, non solo in galleria: si guarda
  // com'e' venuto e volendo ci si dipinge sopra un'altra volta, che e' il modo
  // in cui il ritocco si usa davvero. Prima finiva nella scheda Crea, dove chi
  // stava ritoccando non lo cercava.
  const uscita = prodotte[0];
  if (l.meta?.ritocco && uscita) annuncia("ritocco-fatto", ponte.vista(uscita));

  togliLavoro(l.id);
  annuncia("galleria-cambiata");
}

/**
 * Rimette in fila la sessione con quello che il motore ha davvero.
 *
 * **Prima buttava via troppo.** Un lavoro che non è più nella coda del motore
 * veniva tolto e basta — ma "non è più in coda" vuol dire anche *finito*, e il
 * messaggio che lo racconta viaggia su un WebSocket che ogni tanto si riapre.
 * Quando quel messaggio si perdeva, l'immagine era stata fatta davvero: sparita
 * dalla sessione, mai comparsa in galleria (che si aggiorna proprio lì), e da
 * fuori si vedeva come «ho premuto Genera e non è successo niente».
 *
 * Adesso, prima di buttarlo, si chiede la cronologia al motore: se quel lavoro
 * ha prodotto qualcosa lo si conclude come se il messaggio fosse arrivato.
 */
export async function riallinea() {
  try {
    const vivi = await ponte.lavoriVivi();

    for (const id of ordine.slice()) {
      if (vivi.has(id)) continue;
      const l = lavoro(id);
      if (!l || l.concluso) continue;

      const uscite = await ponte.risultati(id);
      const prodotte = Object.values(uscite).flatMap((o) => o.images || []);
      if (prodotte.length) await concludi(l);
      else togliLavoro(id);
    }
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
