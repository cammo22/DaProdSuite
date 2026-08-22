/**
 * Le immagini e gli audio che si danno alla Storia.
 *
 * **A cosa servono, che sono due cose diverse e vanno dette separate.**
 *
 * 1. **Il modello che scrive le scene li guarda.** Se in LM Studio hai caricato
 *    un modello che sa vedere, le immagini gli arrivano insieme al soggetto: la
 *    faccia del protagonista, il posto, la luce che vuoi. Da lì scrive prompt
 *    che parlano di quello che hai mostrato invece di inventarselo. Con un
 *    modello di solo testo non succede niente di magico — LM Studio risponde
 *    che non sa guardare, e la suite lo scrive in italiano invece di far finta.
 * 2. **MiniMax H3 li usa come riferimento vero**, dentro ogni clip: `ref_image_N`
 *    e `ref_audio_N` del grafo. LTX 2.5 no, non ha quegli ingressi — con LTX i
 *    riferimenti restano al modello che scrive, e la riga sotto lo dice invece
 *    di lasciar credere che finiscano nel video.
 *
 * **Dove vivono.** Nella cartella `input` del motore, caricati una volta sola
 * (`/upload/image` accetta qualunque file, vedi `ponte.carica`). Il nome che
 * torna da lì è l'unica cosa che si salva sul disco del browser: i byte no, o
 * tre foto riempirebbero il `localStorage` e la storia intera andrebbe persa.
 * Quando servono i byte — per farli vedere al modello che scrive — si
 * ripescano dal motore, che è dove stanno.
 */

import { escapeHtml } from "./dom.js";
import * as ponte from "./ponte.js";

const RICORDO = "daprod.cinema.storia.riferimenti";

/** Quanti se ne accettano. Tre immagini sono già il massimo che H3 usa bene. */
const MASSIMO = 6;

/**
 * Quello che è stato dato, in ordine di arrivo.
 *
 * `dati` (base64) c'è solo per quelli aggiunti in questa sessione: agli altri
 * si arriva dal motore quando servono davvero.
 */
let riferimenti = leggi();

let dove = null;
let alCambio = () => {};
/** Dove finiscono i guai: la stessa riga di stato della scheda, non un popup. */
let avvisa = () => {};

function leggi() {
  try {
    const forse = JSON.parse(localStorage.getItem(RICORDO) || "[]");
    return Array.isArray(forse) ? forse.filter((r) => r && r.nelMotore) : [];
  } catch {
    return [];
  }
}

function salva() {
  try {
    // Senza i byte: quelli stanno nel motore, e qui ci sta il nome per ritrovarli.
    const magri = riferimenti.map(({ dati: _dati, ...resto }) => resto);
    localStorage.setItem(RICORDO, JSON.stringify(magri));
  } catch {
    // Spazio finito: restano per questa sessione. Meglio che perdere la storia.
  }
}

/* ------------------------------------------------------------------ i tipi */

/** Immagine o audio, dal tipo MIME del file scelto. */
function generePer(file) {
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "immagine";
  // Un video di riferimento H3 lo saprebbe usare, ma qui non lo offriamo: nella
  // Storia è la faccia o il posto che servono, e un video per scena vorrebbe
  // dire caricare decine di MB per ognuna delle cento inquadrature.
  return null;
}

/** Il percorso spezzato come lo vuole `/view`: la cartella `input` del motore. */
function pezzi(nelMotore) {
  const taglio = nelMotore.lastIndexOf("/");
  return {
    subfolder: taglio < 0 ? "" : nelMotore.slice(0, taglio),
    filename: nelMotore.slice(taglio + 1),
    type: "input",
  };
}

/* ------------------------------------------------------------- l'interfaccia */

function disegna() {
  if (!dove) return;

  if (!riferimenti.length) {
    dove.innerHTML = `<div class="hint">Niente per ora. Aggiungi una faccia, un posto, una voce:
      chi scrive le scene li guarda (se il modello sa vedere), e MiniMax H3 li usa
      dentro ogni inquadratura.</div>`;
    return;
  }

  dove.innerHTML = `<div class="rif-griglia">${riferimenti
    .map(
      (r, i) => `<div class="rif">
        ${
          r.genere === "immagine"
            ? `<img src="${escapeHtml(ponte.vista(pezzi(r.nelMotore)))}" alt="">`
            : `<div class="rif-audio">&#9835;</div>`
        }
        <div class="rif-nome" title="${escapeHtml(r.nome)}">${escapeHtml(r.nome)}</div>
        <button type="button" class="rif-via" data-via="${i}" title="togli">&#10005;</button>
      </div>`,
    )
    .join("")}</div>`;

  for (const b of dove.querySelectorAll("[data-via]")) {
    b.onclick = () => {
      riferimenti.splice(Number(b.dataset.via), 1);
      salva();
      disegna();
      alCambio();
    };
  }
}

/* ------------------------------------------------------------- aggiungere */

/**
 * Prende un file dal disco e lo mette nel motore.
 *
 * Si carica **subito**, non al momento di generare: così se il motore è spento
 * lo si scopre adesso, mentre stai preparando la storia, e non fra due ore
 * quando premi Genera.
 */
async function aggiungi(file) {
  const genere = generePer(file);
  if (!genere) throw new Error(`«${file.name}» non è né un'immagine né un audio.`);
  if (riferimenti.length >= MASSIMO) throw new Error(`Più di ${MASSIMO} riferimenti non servono.`);

  const nelMotore = await ponte.carica(file, file.name, "daprodcinema/storia");
  riferimenti.push({
    nome: file.name,
    genere,
    mime: file.type,
    nelMotore,
    dati: await inBase64(file),
  });
  salva();
  disegna();
  alCambio();
}

/**
 * Più file in fila, e al primo intoppo ci si ferma.
 *
 * Il motivo è lo stesso della coda offline dell'app Android: se il motore è
 * spento, insistere sugli altri cinque vuol dire cinque errori uguali di fila.
 * Il guaio si dice **nella riga di stato della scheda**, non in un popup: un
 * `alert` blocca la pagina e va chiuso, e non è quello che merita «questo file
 * non è né un'immagine né un audio».
 */
async function aggiungiTutti(file) {
  for (const uno of file) {
    try {
      await aggiungi(uno);
    } catch (e) {
      avvisa(String(e.message || e));
      return;
    }
  }
}

/** I byte di un file, in base64 e senza il prefisso `data:`. */
function inBase64(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onerror = () => rifiuta(new Error("Non riesco a leggere il file."));
    lettore.onload = () => risolvi(String(lettore.result).split(",")[1] ?? "");
    lettore.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------ chi li usa */

/** Quanti e di che tipo: serve a scrivere la riga sotto al pannello. */
export const contaRiferimenti = () => ({
  immagini: riferimenti.filter((r) => r.genere === "immagine").length,
  audio: riferimenti.filter((r) => r.genere === "audio").length,
});

/**
 * Quello che si dà al modello che scrive: i byte, in base64.
 *
 * Chi è stato aggiunto in questa sessione ce li ha già; agli altri si arriva
 * riscaricandoli dal motore. Se il motore è spento si va avanti senza: meglio
 * uno storyboard scritto dal solo soggetto che nessuno storyboard.
 */
export async function riferimentiPerIlModello() {
  const pronti = [];
  for (const r of riferimenti) {
    let dati = r.dati;
    if (!dati) {
      try {
        const risposta = await fetch(ponte.vista(pezzi(r.nelMotore)));
        dati = await inBase64(await risposta.blob());
        r.dati = dati;
      } catch {
        continue;
      }
    }
    pronti.push({ genere: r.genere, base64: dati, mime: r.mime, nome: r.nome });
  }
  return pronti;
}

/**
 * Quello che si dà al grafo di MiniMax H3: i nomi nella cartella del motore.
 *
 * LTX non ha ingressi per i riferimenti, quindi chi chiama passa il modello e
 * qui si risponde vuoto invece di infilargli dentro nodi che non collegherebbe.
 */
export function riferimentiPerIlGrafo(modello) {
  if (modello?.ingressi !== "riferimenti") return { immagini: [], audio: [] };
  return {
    immagini: riferimenti.filter((r) => r.genere === "immagine").map((r) => r.nelMotore),
    audio: riferimenti.filter((r) => r.genere === "audio").map((r) => r.nelMotore),
  };
}

/* ---------------------------------------------------------------- l'aggancio */

export function collegaRiferimentiStoria(contenitore, bottone, campoFile, quandoCambia, dillo) {
  dove = contenitore;
  alCambio = quandoCambia ?? (() => {});
  avvisa = dillo ?? (() => {});

  bottone.onclick = () => campoFile.click();

  campoFile.onchange = async () => {
    const scelti = Array.from(campoFile.files ?? []);
    campoFile.value = "";
    await aggiungiTutti(scelti);
  };

  // Trascinare una foto dentro il pannello è il gesto naturale, e costa quattro
  // righe: chi ha la cartella aperta accanto non deve passare dal selettore.
  contenitore.ondragover = (ev) => {
    ev.preventDefault();
    contenitore.classList.add("sopra");
  };
  contenitore.ondragleave = () => contenitore.classList.remove("sopra");
  contenitore.ondrop = async (ev) => {
    ev.preventDefault();
    contenitore.classList.remove("sopra");
    await aggiungiTutti(Array.from(ev.dataTransfer?.files ?? []));
  };

  disegna();
}
