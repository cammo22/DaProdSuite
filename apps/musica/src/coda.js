/**
 * I lavori in corso e il pannello Sessione.
 *
 * Un lavoro è un grafo mandato al motore, seguito finché non produce un file.
 * Ce ne sono di tre specie — un brano, la sua copertina, un'immagine libera — e
 * la differenza sta tutta in cosa si fa quando finiscono.
 *
 * **La copertina va per seconda**, dopo il brano: carica Anima, che occuperebbe
 * la VRAM che serve al modello musicale. Vuol dire che quando è pronta il brano
 * di solito è già finito e il suo lavoro non esiste più — per questo `finiti`
 * tiene da parte l'id con cui è entrato in libreria, e la copertina lo ritrova.
 */

import { el, escapeHtml, fmtTime, mostraErrore } from "./dom.js";
import { annuncia } from "./bus.js";
import { stato } from "./stato.js";
import { collegaRighe, rigaBrano } from "./righe.js";
import { FASI, SEPARAZIONE } from "./grafi.js";
import * as ponte from "./ponte.js";

const lavori = new Map();
let ordine = [];
let ultimoDisegno = "";

/**
 * Brani già finiti: id del lavoro → id con cui stanno in libreria.
 *
 * Serve solo alla copertina, che arriva dopo. Senza, un brano finito è un lavoro
 * cancellato, e la copertina non ha più nessuno a cui attaccarsi: veniva
 * generata davvero e poi buttata via, che è come non generarla.
 */
const finiti = new Map();

const lavoro = (id) => lavori.get(id);
const inCorso = () => ordine.map(lavoro).find((l) => l && l.stato === "in-corso");

export function aggiungiLavoro(id, parametri, extra = {}) {
  lavori.set(id, {
    id,
    parametri,
    stato: "in-attesa",
    avanzamento: 0,
    passo: "in coda",
    fase: 1,
    inizio: null,
    daCache: false,
    specie: "brano",
    ...extra,
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
  // Solo i brani hanno un riquadro. La copertina è un lavoro a sé per il motore,
  // ma per chi guarda è parte del brano: mostrarla come seconda riga faceva
  // sembrare che ogni "Crea" ne avesse messi in coda due, salvo poi vederne
  // sparire uno. La si vede comparire dove deve, cioè nella miniatura.
  const attivi = ordine.map(lavoro).filter((l) => l && l.specie === "brano");
  const recenti = stato.brani.slice(0, 8);

  let html = attivi.map(riquadroLavoro).join("");
  html += recenti.map(rigaBrano).join("");
  if (!attivi.length && !recenti.length) {
    html = `<div class="empty">Ancora niente. Scrivi uno stile e premi <b>Crea</b>.</div>`;
  }

  // Ridisegnare un HTML identico farebbe sfarfallare le immagini e perderebbe
  // il fuoco: qui dentro si passa una volta al secondo.
  if (html === ultimoDisegno) return;
  ultimoDisegno = html;
  el.feed.innerHTML = html;

  collegaRighe(el.feed);
  el.feed.querySelectorAll("[data-annulla]").forEach((b) => {
    b.onclick = () => annulla(b.dataset.annulla);
  });
}

/** Forza il prossimo disegno anche se l'HTML non è cambiato. */
export function scordaDisegno() {
  ultimoDisegno = "";
}

function riquadroLavoro(l) {
  const corre = l.stato === "in-corso";
  const secondi = l.inizio ? Math.floor((Date.now() - l.inizio) / 1000) : 0;
  const restano = corre && l.avanzamento > 0.02 ? Math.round(secondi / l.avanzamento - secondi) : null;

  const larghezza1 = (Math.min(l.avanzamento, SEPARAZIONE) / SEPARAZIONE) * (SEPARAZIONE * 100);
  const larghezza2 = (Math.max(0, l.avanzamento - SEPARAZIONE) / (1 - SEPARAZIONE)) * ((1 - SEPARAZIONE) * 100);

  const sotto = corre
    ? `${l.passo} &middot; ${fmtTime(secondi)}${restano !== null ? ` &middot; ~${fmtTime(restano)} alla fine` : ""}`
    : "in attesa";

  return `<div class="track">
    <div class="thumb ${l.copertinaUrl ? "" : "shimmer"}">${l.copertinaUrl ? `<img src="${escapeHtml(l.copertinaUrl)}" alt="">` : ""}</div>
    <div class="tmeta">
      <div class="tt">${escapeHtml(l.parametri.titolo || "Nuovo brano")}</div>
      <div class="tsub">${sotto}</div>
      <div class="bar">
        <i class="p1" style="width:${larghezza1.toFixed(1)}%"></i>
        <i class="p2" style="left:${SEPARAZIONE * 100}%;width:${larghezza2.toFixed(1)}%"></i>
        <b style="left:${SEPARAZIONE * 100}%"></b>
      </div>
      <div class="phases">
        <span class="a ${l.fase === 1 ? "" : "off"}">1 &middot; struttura${l.daCache ? " (cache)" : ""}</span>
        <span class="b ${l.fase === 2 ? "" : "off"}">2 &middot; suono</span>
      </div>
    </div>
    <div class="tact"><button class="del" data-annulla="${escapeHtml(l.id)}" title="annulla">&#10005;</button></div>
  </div>`;
}

async function annulla(id) {
  const l = lavoro(id);
  if (!l) return;

  // La copertina non ha più un riquadro da cui annullarla: se ne va con il brano
  // per cui era stata chiesta, altrimenti resterebbe a occupare il motore per
  // disegnare l'artwork di una canzone che non esisterà.
  const suaCopertina = ordine.map(lavoro).find((c) => c && c.branoDi === id);

  for (const daFermare of [l, suaCopertina].filter(Boolean)) {
    if (daFermare.stato === "in-corso") await ponte.interrompi();
    else await ponte.togliDallaCoda(daFermare.id);
    togliLavoro(daFermare.id);
  }
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
        l.passo = l.specie === "copertina" ? "disegno la copertina" : "avvio";
        disegnaSessione();
      }
      break;

    case "execution_cached":
      // Il nodo 2 è la parte autoregressiva: se il motore l'ha ripresa dalla
      // cache, la prima fase è già finita e va detto subito.
      if (l && (d.nodes || []).includes("2")) {
        l.daCache = true;
        l.avanzamento = SEPARAZIONE;
        l.fase = 2;
        l.passo = "struttura riusata dalla cache";
        disegnaSessione();
      }
      break;

    case "executing":
      if (l && d.node && l.specie === "brano") {
        l.stato = "in-corso";
        l.inizio = l.inizio || Date.now();
        const fase = FASI[d.node];
        if (fase) {
          l.passo = fase.label;
          l.fase = fase.fase;
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
      if (suo.specie !== "brano") {
        suo.passo = "disegno la copertina";
        suo.avanzamento = d.value / d.max;
      } else {
        const fase = FASI[String(d.node)] || FASI["2"];
        suo.passo = fase.label;
        suo.fase = fase.fase;
        suo.avanzamento = fase.da + (fase.a - fase.da) * (d.value / d.max);
      }
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
      mostraErrore(
        `${d.node_type || ""}\n${d.exception_type || ""}: ${d.exception_message || "errore sconosciuto"}`,
      );
      if (l) togliLavoro(l.id);
      break;

    case "status":
      if (d.status && !inCorso()) {
        el.statusTxt.textContent = d.status.exec_info?.queue_remaining ? "in coda" : "pronto";
      }
      break;
  }
}

/* ------------------------------------------------------------- la chiusura */

async function concludi(l) {
  const secondi = l.inizio ? Math.round((Date.now() - l.inizio) / 1000) : 0;
  const uscite = await ponte.risultati(l.id);

  if (l.specie === "immagine") {
    togliLavoro(l.id);
    annuncia("immagini-cambiate");
    return;
  }

  if (l.specie === "copertina") {
    const immagini = Object.values(uscite).flatMap((o) => o.images || []);
    const immagine = immagini[immagini.length - 1];
    if (immagine) {
      const brano = l.branoDi && lavoro(l.branoDi);
      if (brano) {
        // Il brano sta ancora lavorando: la copertina si vede subito nella
        // sessione e verrà scritta accanto al file quando ci sarà un file.
        brano.copertinaUrl = ponte.vista(immagine);
        brano.copertinaFile = immagine;
      } else {
        // Il caso normale da quando la copertina va per seconda: il brano è già
        // in libreria. `bersaglio` è invece la copertina rifatta dalla scheda
        // Libreria, che il brano ce l'ha da prima.
        const bersaglio = l.bersaglio ?? (l.branoDi && finiti.get(l.branoDi));
        if (bersaglio) {
          await vestiBrano(bersaglio, immagine);
          if (l.branoDi) finiti.delete(l.branoDi);
        }
      }
    }
    togliLavoro(l.id);
    annuncia("libreria-cambiata");
    return;
  }

  // Un brano finito: si rinomina col titolo, si scrivono i metadati e gli si
  // attacca la copertina che intanto è pronta.
  const file = Object.values(uscite).flatMap((o) => o.audio || []);
  if (file.length) {
    let id = ponte.idLibreria(file[file.length - 1]);
    try {
      if (l.parametri.titolo) {
        const rinominato = await ponte.rinomina(id, l.parametri.titolo);
        if (rinominato) id = rinominato.id;
      }
      // Il nome definitivo ce l'ha adesso, e da adesso la copertina che sta
      // ancora lavorando sa dove andare. Prima dei metadati di proposito: se
      // qualcosa va storto lì, la copertina arriva lo stesso.
      if (l.conCopertina && !l.copertinaFile) finiti.set(l.id, id);
      await ponte.scriviMeta(id, { ...l.parametri, secs: secondi, cached: l.daCache, ts: Date.now() });
      if (l.copertinaFile) await vestiBrano(id, l.copertinaFile);
    } catch {
      // Il brano c'è comunque: i metadati sono un di più, non il risultato.
    }
  }

  togliLavoro(l.id);
  annuncia("libreria-cambiata");
}

/** Ritaglia un'immagine del motore e la mette come copertina di un brano. */
async function vestiBrano(idBrano, immagine) {
  const quadrata = await ponte.ritagliaQuadrata(ponte.vista(immagine));
  await ponte.impostaCopertina(idBrano, quadrata);
}

/* ----------------------------------------------------------- manutenzione */

/**
 * Ributta via i lavori che il motore non ha più.
 *
 * Serve dopo un ricaricamento della pagina o un riavvio del motore: senza,
 * resterebbero barre di avanzamento ferme per sempre su lavori inesistenti.
 */
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
  el.stopBtn.onclick = () => ponte.interrompi();
  el.clearQueue.onclick = async () => {
    await ponte.svuotaCoda();
    ordine.slice().forEach(togliLavoro);
  };

  // Un secondo: basta per far scorrere i tempi trascorsi e le stime.
  setInterval(() => {
    disegnaSessione();
    if (ordine.length) void riallinea();
  }, 1000);
}
