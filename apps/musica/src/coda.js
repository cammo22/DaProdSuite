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
// La lista che si aggiorna senza rifarsi da capo: vale per tutte le app, quindi
// sta in `packages/ui` e la suite la serve sotto `/comune/`.
import { disegnaLista } from "/comune/lista-viva.js";
import { annuncia } from "./bus.js";
import { stato } from "./stato.js";
import { aggiornaRiga, collegaRighe, rigaBrano } from "./righe.js";
import { FASI, SEPARAZIONE } from "./grafi.js";
import * as ponte from "./ponte.js";

const lavori = new Map();
let ordine = [];

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
    // I due orologi: `chiesto` parte quando hai premuto Crea e non si azzera più
    // — è il tempo che hai aspettato davvero, coda compresa — mentre `inizio` è
    // quando il motore ha preso in mano questo lavoro, e serve solo alla stima.
    chiesto: Date.now(),
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

  // Ogni riga con la sua chiave: il lavoro in corso si aggiorna in casa —
  // scorrono i tempi e le barre, il resto resta dov'è — e le righe dei brani
  // già fatti non si toccano. Rifare tutto il pannello a ogni secondo, com'era
  // prima, voleva dire ricaricare copertine e lettori una volta al secondo.
  const voci = attivi.map((l) => ({
    chiave: `lavoro:${l.id}`,
    html: riquadroLavoro(l),
    aggiorna: (nodo) => aggiornaRiquadro(nodo, l),
  }));

  for (const b of recenti) {
    voci.push({ chiave: `brano:${b.id}`, html: rigaBrano(b), aggiorna: (nodo) => aggiornaRiga(nodo, b) });
  }

  if (!voci.length) {
    voci.push({
      chiave: "vuoto",
      html: `<div class="empty">Ancora niente. Scrivi uno stile e premi <b>Crea</b>.</div>`,
    });
  }

  if (!disegnaLista(el.feed, voci)) return;

  collegaRighe(el.feed);
  el.feed.querySelectorAll("[data-annulla]").forEach((b) => {
    b.onclick = () => annulla(b.dataset.annulla);
  });
}

/** Le poche cose che cambiano mentre il lavoro corre: testo, barre, fasi. */
function avanzamento(l) {
  const corre = l.stato === "in-corso";
  // Da quando l'hai chiesto, sempre: in coda scorre già, e quando il motore parte
  // non riparte da zero.
  const aspettato = Math.floor((Date.now() - l.chiesto) / 1000);
  // La stima invece guarda il solo tempo di lavoro: l'avanzamento è la frazione
  // di **questo** brano, e dividerlo per un tempo che comprende la coda direbbe
  // che manca molto più di quanto manca.
  const lavorati = l.inizio ? Math.floor((Date.now() - l.inizio) / 1000) : 0;
  const restano = corre && l.avanzamento > 0.02 ? Math.round(lavorati / l.avanzamento - lavorati) : null;

  return {
    larghezza1: (Math.min(l.avanzamento, SEPARAZIONE) / SEPARAZIONE) * (SEPARAZIONE * 100),
    larghezza2: (Math.max(0, l.avanzamento - SEPARAZIONE) / (1 - SEPARAZIONE)) * ((1 - SEPARAZIONE) * 100),
    sotto: corre
      ? `${l.passo} &middot; ${fmtTime(aspettato)}${restano !== null ? ` &middot; ~${fmtTime(restano)} alla fine` : ""}`
      : `in coda &middot; ${fmtTime(aspettato)}`,
  };
}

/**
 * Cambia quello che cambia lasciando in piedi il riquadro.
 *
 * Così la copertina già arrivata non si ricarica, e la miniatura che aspetta non
 * ricomincia la sua animazione a ogni secondo.
 */
function aggiornaRiquadro(nodo, l) {
  const { larghezza1, larghezza2, sotto } = avanzamento(l);

  const sub = nodo.querySelector(".tsub");
  if (sub) sub.innerHTML = sotto;
  const p1 = nodo.querySelector(".p1");
  if (p1) p1.style.width = `${larghezza1.toFixed(1)}%`;
  const p2 = nodo.querySelector(".p2");
  if (p2) p2.style.width = `${larghezza2.toFixed(1)}%`;

  const fase1 = nodo.querySelector(".phases .a");
  if (fase1) {
    fase1.classList.toggle("off", l.fase !== 1);
    // «(cache)» si scopre a lavoro partito: la struttura del brano c'era già.
    fase1.innerHTML = `1 &middot; struttura${l.daCache ? " (cache)" : ""}`;
  }
  nodo.querySelector(".phases .b")?.classList.toggle("off", l.fase !== 2);

  // La copertina arriva a brano quasi finito: appena c'è, prende il posto della
  // miniatura che luccica.
  const thumb = nodo.querySelector(".thumb");
  if (thumb && l.copertinaUrl && !thumb.querySelector("img")) {
    thumb.classList.remove("shimmer");
    thumb.innerHTML = `<img src="${escapeHtml(l.copertinaUrl)}" alt="">`;
  }
}

function riquadroLavoro(l) {
  const { larghezza1, larghezza2, sotto } = avanzamento(l);

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
        // `|| Date.now()` e non `=`: il motore manda `execution_start` anche
        // quando riprende un lavoro, e riscriverlo azzerava il cronometro.
        l.inizio = l.inizio || Date.now();
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
  // Ci si arriva da due strade — il messaggio del motore e il riallineamento
  // qui sotto — e possono capitare insieme.
  if (l.concluso) return;
  l.concluso = true;

  // Da quando l'hai chiesto a adesso, che è quando il file è sul disco: è questo
  // il numero che finisce nei metadati come «generato in».
  const secondi = Math.round((Date.now() - l.chiesto) / 1000);
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
 * Rimette in fila la sessione con quello che il motore ha davvero.
 *
 * Serve dopo un ricaricamento della pagina o un riavvio del motore: senza,
 * resterebbero barre di avanzamento ferme per sempre su lavori inesistenti.
 *
 * **Ma prima buttava via troppo**, ed è lo stesso difetto che DaProdFoto si è
 * tolto: un lavoro che non è più nella coda del motore veniva cancellato e
 * basta — solo che «non è più in coda» vuol dire anche *finito*, e il messaggio
 * che lo racconta viaggia su un WebSocket che ogni tanto si riapre. Quando quel
 * messaggio si perdeva, il brano era stato generato davvero: sparito dalla
 * sessione, mai comparso in libreria (che si aggiorna proprio lì), e da fuori si
 * vedeva come «ho premuto Crea e non è successo niente».
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
      const prodotti = Object.values(uscite).flatMap((o) => o.audio || o.images || []);
      if (prodotti.length) await concludi(l);
      else togliLavoro(id);
    }
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
