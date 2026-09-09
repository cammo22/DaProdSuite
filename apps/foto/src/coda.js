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

/**
 * ⚠ **Cosa sta facendo il motore, letto dal nodo che ha in mano.**
 * Nuovo nella 1.2.1.
 *
 * ComfyUI manda `progress` **solo dai nodi che contano i passi** — un
 * campionatore lo fa cinquanta volte, e la barra si riempie. Ci sono nodi che
 * non contano niente e durano minuti: caricare un modello da sei GB, o l'intero
 * LLaDA-Image, che è un nodo solo che fa tutto dentro. Con quelli non arrivava
 * nessun numero, e da fuori si vedeva una riga ferma.
 *
 * Quello che invece arriva **sempre** è `executing`, con l'id del nodo in
 * lavorazione. L'id da solo non dice niente («2»), ma il grafo ce l'abbiamo —
 * l'abbiamo scritto noi — quindi si guarda il suo `class_type` e si traduce.
 *
 * Le voci non sono una per nodo: sono i **mestieri**, cioè le poche cose che
 * hanno senso da leggere in una riga di stato. Un nodo che non è in elenco dice
 * la frase generica invece di dire il suo nome tecnico, che a chi guarda da un
 * telefono non serve.
 */
const FASI = {
  UNETLoader: "carico il modello",
  UnetLoaderGGUF: "carico il modello",
  CheckpointLoaderSimple: "carico il modello",
  CLIPLoader: "carico il modello",
  CLIPLoaderGGUF: "carico il modello",
  DualCLIPLoader: "carico il modello",
  VAELoader: "carico il modello",
  LoraLoaderModelOnly: "carico il modello",
  CLIPTextEncode: "leggo la descrizione",
  LoadImage: "preparo la foto",
  LoadImageMask: "preparo la zona",
  ImageScale: "preparo la foto",
  VAEEncode: "preparo la foto",
  VAEEncodeForInpaint: "preparo la zona",
  SetLatentNoiseMask: "preparo la zona",
  EmptyLatentImage: "preparo la tela",
  KSampler: "disegno",
  KSamplerAdvanced: "disegno",
  SamplerCustomAdvanced: "disegno",
  VAEDecode: "sviluppo l'immagine",
  VAEDecodeTiled: "sviluppo l'immagine",
  SaveImage: "salvo",
};

function fasePerNodo(grafo, nodo) {
  const tipo = grafo && grafo[nodo] && grafo[nodo].class_type;
  return FASI[tipo] || "ci sta lavorando";
}

/**
 * Racconta alla suite a che punto è il motore.
 *
 * Serve a chi guarda da un'altra stanza: il pannello del PC e la fila
 * sull'app del telefono. Qui dentro la barra ce l'abbiamo già sotto gli occhi.
 * Se la suite non c'è — la scheda aperta in un browser, nelle prove — non
 * succede niente.
 */
function raccontaAllaSuite(quanto, fase) {
  const suite = window.daprodSuite;
  if (!suite?.avanzamento) return;
  void suite.avanzamento(quanto, fase).catch(() => {});
}

export function aggiungiLavoro(id, descrizione, meta, grafo, originale) {
  // I due orologi: `chiesto` parte quando hai premuto Genera e non si azzera mai
  // — coda compresa — mentre `inizio` è quando il motore ha preso in mano questo
  // lavoro.
  lavori.set(id, {
    id,
    descrizione,
    meta,
    // Il grafo serve a tradurre «sta eseguendo il nodo 2» in «sta disegnando»:
    // vedi `fasePerNodo`.
    grafo,
    // La foto com'era prima, per i ritocchi. Vedi `tieniIlPrima`.
    originale,
    stato: "in-attesa",
    avanzamento: 0,
    fase: "",
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
  if (l.stato !== "in-corso") return `in coda &middot; ${aspettato}`;
  // La fase al posto di «in lavorazione», quando c'è: con un modello che passa
  // minuti a caricarsi, «carico il modello» è l'unica cosa che distingue una
  // macchina che lavora da una piantata.
  return `${escapeHtml(l.fase || "in lavorazione")} &middot; ${aspettato}`;
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
        l.fase = "ci sta lavorando";
        raccontaAllaSuite(null, l.fase);
        disegnaSessione();
      }
      break;

    /**
     * ⚠ **Il nodo che il motore ha in mano adesso.** Nuovo nella 1.2.1.
     *
     * Arriva sempre, anche dai nodi che non contano i passi — ed è per questo
     * che c'è: senza, LLaDA-Image non mandava niente dal principio alla fine e
     * chi guardava da fuori vedeva una riga ferma. Vedi `FASI`.
     *
     * `node` a null vuol dire che il grafo è finito: la fase si azzera invece
     * di restare a raccontare l'ultimo nodo per sempre.
     */
    case "executing": {
      const suo = d.prompt_id ? l : inCorso();
      if (!suo) break;
      if (!d.node) { suo.fase = ""; raccontaAllaSuite(null, ""); break; }
      suo.stato = "in-corso";
      suo.inizio = suo.inizio || Date.now();
      suo.fase = fasePerNodo(suo.grafo, d.node);
      /**
       * ⚠ **Il conteggio dei passi vale per il nodo che li conta, non per il
       * grafo.** Cambiando nodo si riparte da capo: lasciare il 100% del
       * campionatore mentre il VAE sviluppa direbbe che è finito quando non lo
       * è. `null` significa «adesso non lo so», ed è la verità.
       */
      suo.avanzamento = 0;
      raccontaAllaSuite(null, suo.fase);
      disegnaSessione();
      break;
    }

    case "progress": {
      const suo = d.prompt_id ? l : inCorso();
      if (!suo || !d.max) break;
      suo.stato = "in-corso";
      suo.inizio = suo.inizio || Date.now();
      suo.avanzamento = d.value / d.max;
      raccontaAllaSuite(suo.avanzamento, suo.fase || "disegno");
      disegnaSessione();
      break;
    }

    case "execution_success":
      if (l) void concludi(l);
      break;

    case "execution_interrupted":
      if (l) togliLavoro(l.id);
      raccontaAllaSuite(null, "");
      break;

    case "execution_error":
      annuncia("errore", `${d.exception_type || ""}: ${d.exception_message || "errore sconosciuto"}`);
      if (l) togliLavoro(l.id);
      raccontaAllaSuite(null, "");
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

  // La foto com'era prima, accanto a quella nuova. Vedi `tieniIlPrima`.
  if (l.originale && prodotte.length) {
    await tieniIlPrima(l, ponte.idLibreria(prodotte[0]));
  }

  // Il ritocco finito torna sulla sua tela, non solo in galleria: si guarda
  // com'e' venuto e volendo ci si dipinge sopra un'altra volta, che e' il modo
  // in cui il ritocco si usa davvero. Prima finiva nella scheda Crea, dove chi
  // stava ritoccando non lo cercava.
  const uscita = prodotte[0];
  if (l.meta?.ritocco && uscita) annuncia("ritocco-fatto", ponte.vista(uscita));

  togliLavoro(l.id);
  raccontaAllaSuite(null, "");
  annuncia("galleria-cambiata");
}

/**
 * ⚠ **Mette in galleria la foto com'era prima della modifica.**
 * Nuova nella 1.2.1.
 *
 * Chiesto il 7 settembre 2026: «facciamo anche che quando si modifica una foto
 * viene salvata anche l'originale, in modo da vedere il prima e il dopo — se
 * poi la vogliamo pubblicare su DaProd si può decidere se caricare tutte e due
 * le foto o solo quella modificata».
 *
 * **Dopo il risultato, non prima**, e non è un dettaglio d'ordine. Quando la
 * modifica arriva da fuori — dal telefono — la suite sta guardando la cartella
 * della scheda e prende il **primo** file nuovo che ci compare come risultato
 * da consegnare (vedi `aspettaIFile` in esecuzione.ts). Salvare il «prima»
 * mentre il motore lavora vorrebbe dire consegnare a chi aveva chiesto una
 * modifica la foto che aveva mandato lui.
 *
 * I due file si sanno l'uno dell'altro: sul risultato resta scritto qual è il
 * suo originale, sull'originale qual è la modifica. È quel legame che poi, in
 * bacheca, lascia scegliere se pubblicarle tutte e due o solo la nuova.
 *
 * Se non si riesce a salvarlo non succede niente di grave e **non si dice**:
 * la modifica è riuscita, il file c'è, e un errore su una copia in più
 * sembrerebbe un errore sul lavoro.
 */
async function tieniIlPrima(l, risultatoId) {
  const suite = window.daprodSuite;
  if (!suite?.libreria?.originale) return;
  try {
    const titolo = `prima di: ${l.meta?.testo || l.descrizione}`;
    const originaleId = await suite.libreria.originale(l.originale, {
      titolo,
      risultatoId,
      meta: { eOriginaleDi: risultatoId, testo: titolo, modello: l.meta?.modello },
    });
    /**
     * ⚠ **Tutti i parametri, non solo il campo nuovo.** `scriviMeta` **riscrive**
     * il `.json`, non ci aggiunge dentro: mandare il solo `originale`
     * cancellerebbe modello, seed e passi che questa stessa funzione ha appena
     * scritto due righe sopra, e «com'è stata fatta» resterebbe vuoto.
     */
    if (originaleId) {
      await ponte.scriviMeta(risultatoId, { ...l.meta, ts: Date.now(), originale: originaleId });
    }
  } catch {
    // La modifica c'e' ed e' quella che conta: la copia del prima e' un di piu'.
  }
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
