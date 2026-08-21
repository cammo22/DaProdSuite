/**
 * I lavori in corso, e i video che ne escono.
 *
 * È il gemello di `apps/foto/src/coda.js` con due aggiunte che qui servono e lì
 * no, e tutte e due per la stessa ragione: **una clip sono minuti, non secondi.**
 *
 * 1. **La barra sa a che punto è.** Con `FASI` si traduce «sta lavorando il nodo
 *    6» in «genero il movimento», e si sa che quel nodo occupa dal 14% all'85%
 *    del lavoro. Senza, la barra starebbe ferma per minuti e poi salterebbe alla
 *    fine, che è il modo più veloce di far credere che sia tutto piantato.
 * 2. **Il risultato resta qui sotto.** Un video finito si guarda dove lo si è
 *    chiesto, non in un'altra scheda: sotto ai lavori in corso c'è la fila di
 *    quelli usciti, con i comandi del lettore.
 *
 * Il riallineamento è quello di DaProdFoto, parola per parola nel senso che
 * conta: un lavoro che non è più nella coda del motore può essere *finito*, non
 * solo sparito, e il messaggio che lo racconta viaggia su un WebSocket che ogni
 * tanto si riapre. Prima di buttarlo si guarda la cronologia; se ha prodotto un
 * file, lo si conclude come se il messaggio fosse arrivato.
 */

import { durata, el, escapeHtml } from "./dom.js";
// La lista che si aggiorna senza rifarsi da capo: vale per tutte le app, quindi
// sta in `packages/ui` e la suite la serve sotto `/comune/`.
import { disegnaLista } from "/comune/lista-viva.js";
import { FASI } from "./grafi.js";
import * as ponte from "./ponte.js";

const lavori = new Map();
let ordine = [];
/** I video usciti in questa sessione, il più recente per primo. */
let fatti = [];

const lavoro = (id) => lavori.get(id);
const inCorso = () => ordine.map(lavoro).find((l) => l && l.stato === "in-corso");

export function aggiungiLavoro(id, descrizione, meta) {
  lavori.set(id, {
    id,
    descrizione,
    meta,
    stato: "in-attesa",
    avanzamento: 0,
    passo: "in coda",
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

/* ------------------------------------------------------------- il pannello */

export function disegnaSessione() {
  const attivi = ordine.map(lavoro).filter(Boolean);

  // Ogni riquadro con la sua chiave: i lavori in corso si aggiornano in casa
  // (scorrono i tempi e la barra, il resto resta), i video finiti non si
  // toccano proprio. Rifare tutto a ogni secondo, com'era prima, voleva dire
  // ricaricare i video: chi provava a dare play mentre generava se lo vedeva
  // fermare dopo un attimo.
  const voci = attivi.map((l) => ({
    chiave: `lavoro:${l.id}`,
    html: riquadro(l),
    aggiorna: (nodo) => aggiornaRiquadro(nodo, l),
  }));

  for (const v of fatti) voci.push({ chiave: `fatto:${v.id || v.url}`, html: riquadroFatto(v) });

  if (!voci.length) {
    voci.push({
      chiave: "vuoto",
      html: `<div class="empty">Niente in lavorazione. Scrivi cosa vuoi vedere e premi <b>Genera</b>.</div>`,
    });
  }

  if (!disegnaLista(el.sessione, voci)) return;

  el.sessione.querySelectorAll("[data-annulla]").forEach((b) => {
    b.onclick = () => void annulla(b.dataset.annulla);
  });
  el.sessione.querySelectorAll("[data-cartella]").forEach((b) => {
    b.onclick = () => ponte.mostraNellaCartella(b.dataset.cartella);
  });
}

/**
 * La riga sotto il titolo di un lavoro in corso.
 *
 * Dice **quanto è passato** e, quando c'è abbastanza avanzamento per non
 * mentire, quanto manca. Sotto il 5% la stima è un numero inventato e non si
 * scrive: su un lavoro da dieci minuti sbagliare all'inizio vuol dire scrivere
 * «due minuti» a chi ne aspetterà dodici.
 */
function sottotitolo(l) {
  const corre = l.stato === "in-corso";
  const secondi = l.inizio ? Math.floor((Date.now() - l.inizio) / 1000) : 0;
  const restano = corre && l.avanzamento > 0.05 ? Math.round(secondi / l.avanzamento - secondi) : null;

  return corre
    ? `${escapeHtml(l.passo)} &middot; ${durata(secondi)}${restano !== null ? ` &middot; ~${durata(restano)} alla fine` : ""}`
    : "in attesa";
}

/**
 * Quello che cambia mentre il lavoro corre, cambiato dov'è.
 *
 * Il riquadro resta lo stesso nodo: così la miniatura non ricomincia la sua
 * animazione a ogni secondo, e soprattutto non si porta dietro il resto del
 * pannello.
 */
function aggiornaRiquadro(nodo, l) {
  const sub = nodo.querySelector(".tsub");
  const barra = nodo.querySelector(".p1");
  if (sub) sub.innerHTML = sottotitolo(l);
  if (barra) barra.style.width = `${(l.avanzamento * 100).toFixed(1)}%`;
}

/** Un lavoro in corso. */
function riquadro(l) {
  const sotto = sottotitolo(l);

  return `<div class="track">
    <div class="thumb shimmer"></div>
    <div class="tmeta">
      <div class="tt">${escapeHtml(l.descrizione)}</div>
      <div class="tsub">${sotto}</div>
      <div class="bar"><i class="p1" style="width:${(l.avanzamento * 100).toFixed(1)}%"></i></div>
    </div>
    <div class="tact"><button class="del" data-annulla="${escapeHtml(l.id)}" title="annulla">&#10005;</button></div>
  </div>`;
}

/** Un video uscito: si guarda, si sente, e si trova sul disco. */
function riquadroFatto(v) {
  return `<div class="uscito">
    <video src="${escapeHtml(v.url)}" controls preload="metadata" playsinline></video>
    <div class="sotto">
      <div class="tt" title="${escapeHtml(v.descrizione)}">${escapeHtml(v.descrizione)}</div>
      <div class="tsub">${escapeHtml(v.riga)}</div>
      ${v.id ? `<button class="mini" data-cartella="${escapeHtml(v.id)}">mostra nella cartella</button>` : ""}
    </div>
  </div>`;
}

async function annulla(id) {
  const l = lavoro(id);
  if (!l) return;
  if (l.stato === "in-corso") await ponte.interrompi();
  else await ponte.togliDallaCoda(id);
  togliLavoro(id);
}

/* ------------------------------------------------ quello che dice il motore */

export function messaggioDalMotore(msg) {
  const d = msg.data || {};
  const l = d.prompt_id ? lavoro(d.prompt_id) : null;

  switch (msg.type) {
    case "execution_start":
      if (l) {
        l.stato = "in-corso";
        l.inizio = Date.now();
        l.passo = "avvio";
        disegnaSessione();
      }
      break;

    case "executing":
      if (l && d.node) {
        l.stato = "in-corso";
        l.inizio = l.inizio || Date.now();
        const fase = FASI[String(d.node)];
        if (fase) {
          l.passo = fase.label;
          // Mai indietro: i nodi non finiscono nell'ordine in cui li abbiamo
          // numerati, e una barra che torna indietro sembra un errore.
          l.avanzamento = Math.max(l.avanzamento, fase.da);
        }
        disegnaSessione();
      }
      break;

    case "progress": {
      // Un avanzamento con un prompt_id sconosciuto arriva da un lavoro già
      // chiuso: applicarlo lo farebbe finire sulla barra sbagliata.
      const suo = d.prompt_id ? l : inCorso();
      if (!suo || !d.max) break;
      suo.stato = "in-corso";
      suo.inizio = suo.inizio || Date.now();
      const fase = FASI[String(d.node)] ?? FASI["6"];
      suo.passo = fase.label;
      suo.avanzamento = Math.max(suo.avanzamento, fase.da + (fase.a - fase.da) * (d.value / d.max));
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
      mostraGuasto(d);
      if (l) togliLavoro(l.id);
      break;

    case "status":
      if (d.status && !inCorso()) {
        el.statusTxt.textContent = d.status.exec_info?.queue_remaining ? "in coda" : "pronto";
      }
      break;
  }
}

/**
 * L'errore del motore, scritto dove si guarda.
 *
 * Il tipo del nodo per primo: su un grafo di venti nodi «quale» conta quanto
 * «cosa», e senza si finisce a leggere il log del motore per saperlo.
 */
function mostraGuasto(d) {
  const pezzi = [
    d.node_type ? `Nel nodo ${d.node_type}:` : null,
    d.exception_message || "il motore si è fermato senza dire perché",
  ].filter(Boolean);
  el.errore.style.display = "block";
  el.errore.textContent = pezzi.join("\n");
}

/* ------------------------------------------------------------- la chiusura */

async function concludi(l) {
  // Ci si arriva da due strade — il messaggio del motore e il riallineamento —
  // e possono capitare insieme.
  if (l.concluso) return;
  l.concluso = true;

  const secondi = l.inizio ? Math.round((Date.now() - l.inizio) / 1000) : 0;
  const uscite = await ponte.risultati(l.id);
  const prodotti = Object.values(uscite).flatMap((o) => o.images ?? o.video ?? []);

  for (const file of prodotti) {
    const id = ponte.idLibreria(file);
    try {
      // I parametri restano accanto al video: senza, «com'è che l'avevo fatto?»
      // è una domanda senza risposta il giorno dopo.
      await ponte.scriviMeta(id, { ...l.meta, secs: secondi, ts: Date.now() });
    } catch {
      // Il video c'è comunque: i metadati sono un di più, non il risultato.
    }
    fatti.unshift({
      id,
      url: ponte.vista(file),
      descrizione: l.descrizione,
      riga: [l.meta?.modello, l.meta?.misura, `${Number(l.meta?.secondi ?? 0).toFixed(1)} s`, `fatto in ${durata(secondi)}`]
        .filter(Boolean)
        .join(" · "),
    });
  }
  fatti = fatti.slice(0, 12);

  togliLavoro(l.id);
}

/**
 * Rimette in fila la sessione con quello che il motore ha davvero.
 *
 * Vedi il commento in cima al file: «non è più in coda» vuol dire anche
 * *finito*, e buttare via un lavoro finito qui vorrebbe dire un video generato
 * per davvero — dieci minuti di scheda — che non compare da nessuna parte.
 */
export async function riallinea() {
  try {
    const vivi = await ponte.lavoriVivi();

    for (const id of ordine.slice()) {
      if (vivi.has(id)) continue;
      const l = lavoro(id);
      if (!l || l.concluso) continue;

      const uscite = await ponte.risultati(id);
      const prodotti = Object.values(uscite).flatMap((o) => o.images ?? o.video ?? []);
      if (prodotti.length) await concludi(l);
      else togliLavoro(id);
    }
  } catch {
    // Motore spento: se ne riparla al prossimo giro.
  }
}

/**
 * Rimette sotto i video già fatti, riaprendo l'app.
 *
 * Li legge dalla libreria della suite e non da una lista nostra: la libreria è
 * la sola che sappia cosa c'è davvero sul disco, e un video cancellato a mano
 * dalla cartella qui non deve ricomparire con un lettore rotto.
 */
export async function caricaUltimi() {
  try {
    const elenco = await ponte.video();
    fatti = elenco.slice(0, 6).map((v) => ({
      id: v.id,
      url: v.url,
      descrizione: String(v.meta?.prompt || v.nome),
      // Testo semplice: a metterlo nella pagina ci pensa `riquadroFatto`, che lo
      // passa da `escapeHtml`. Scriverci dentro delle entità HTML vorrebbe dire
      // vederle scritte per esteso.
      riga: [v.meta?.modello, v.meta?.misura, v.meta?.secs ? `fatto in ${durata(Number(v.meta.secs))}` : null]
        .filter(Boolean)
        .join(" · "),
    }));
    disegnaSessione();
  } catch {
    // La suite non risponde: la sessione parte vuota e si riempie generando.
  }
}

export function collegaComandiCoda() {
  el.stop.onclick = () => ponte.interrompi();
  el.svuota.onclick = async () => {
    await ponte.svuotaCoda();
    ordine.slice().forEach(togliLavoro);
  };

  // Un secondo: basta per far scorrere i tempi trascorsi e le stime.
  setInterval(() => {
    disegnaSessione();
    if (ordine.length) void riallinea();
  }, 1000);
}
