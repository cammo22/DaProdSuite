/**
 * La scheda: da un brano al suo video, inquadratura per inquadratura.
 *
 * Il giro è questo, e ogni passo sta in una funzione che si legge da sola:
 *
 * 1. si sceglie un brano dalla libreria — di solito uno fatto in DaProdMusica
 * 2. il regista legge i suoi `[Verse]` e `[Chorus]` e scrive la scaletta
 * 3. si gira una clip per riga, **una per volta**, in fila
 * 4. si monta tutto sopra la canzone
 *
 * Il passo 2 è la ragione per cui questa scheda può esistere: la struttura della
 * canzone non va indovinata analizzando l'audio, è già scritta nel testo. Vedi
 * `regista.js`, che è dove sta il ragionamento vero.
 */

import { el, escapeHtml, legaValore, minuti, mostraErrore, nascondiErrore, rnd } from "./dom.js";
import { LOOK, MASSIMO_CLIP, MINIMO_CLIP } from "./dati/look.js";
import { MISURE, MODELLI, grafoClip, grafoMontaggio, modello } from "./grafi.js";
import { attacchi, inquadrature } from "./regista.js";
import { attendi, guarda, lasciaPerdere } from "./coda.js";
import * as ponte from "./ponte.js";

const RICORDO_LOOK = "daprod.cinema.look";
const RICORDO_MISURA = "daprod.cinema.misura";

/** Il brano scelto e quello che se ne sa. */
let brano = null;
/** La scaletta di adesso: una riga per clip. */
let scaletta = [];
/** Le clip già girate, per indice: `{ filename, subfolder, type }` del motore. */
const girate = new Map();
/** Vero mentre si gira, così «Gira» non si può premere due volte. */
let inCorso = false;

/* --------------------------------------------------------------- il brano */

export async function aggiornaBrani() {
  const elenco = await ponte.brani().catch(() => []);
  el.brano.innerHTML = elenco.length
    ? elenco.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.nome)}</option>`).join("")
    : `<option value="">Nessun brano in libreria — fanne uno con DaProdMusica</option>`;
  el.gira.disabled = !elenco.length;
  if (elenco.length) await scegliBrano(elenco[0].id, elenco);
}

/**
 * La durata vera del brano, misurata dal file.
 *
 * Nei metadati di DaProdMusica c'è `duration`, ma è la durata **massima**
 * chiesta al modello, non quella che è venuta fuori: un brano da «60 secondi»
 * ne dura 54 o 63. Il video deve stare sulla canzone che c'è, non su quella che
 * era stata ordinata, quindi si misura.
 */
function durataVera(url) {
  return new Promise((risolvi) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => risolvi(audio.duration || 0);
    audio.onerror = () => risolvi(0);
    audio.src = url;
  });
}

async function scegliBrano(id, elenco) {
  const tutti = elenco ?? (await ponte.brani().catch(() => []));
  brano = tutti.find((b) => b.id === id) ?? null;
  if (!brano) return;

  const secondi = (await durataVera(brano.url)) || Number(brano.meta?.duration) || 60;
  brano.secondi = secondi;
  brano.testo = String(brano.meta?.lyrics || "");

  el.durataBrano.textContent = minuti(secondi);
  el.testoBrano.value = brano.testo;
  riscriviScaletta();
}

/* ------------------------------------------------------------- la scaletta */

/** Rifà la scaletta con quello che c'è nel modulo adesso. */
export function riscriviScaletta() {
  if (!brano) return;
  girate.clear();

  scaletta = inquadrature({
    testo: el.testoBrano.value,
    look: el.look.value.trim(),
    secondi: brano.secondi,
    minimoClip: MINIMO_CLIP,
    massimoClip: MASSIMO_CLIP,
  });

  disegnaScaletta();
}

function disegnaScaletta() {
  const da = attacchi(scaletta);
  el.quante.textContent = String(scaletta.length);
  el.totale.textContent = minuti(scaletta.reduce((s, q) => s + q.secondi, 0));
  el.monta.disabled = true;

  el.scaletta.innerHTML = scaletta
    .map(
      (q, i) => `
    <div class="scatto" id="scatto-${i}" title="${escapeHtml(q.prompt)}">
      <div class="quando">${minuti(da[i])}</div>
      <div>
        <div class="passo">${escapeHtml(q.passo)}</div>
        <div class="camera">${escapeHtml(q.camera)}</div>
      </div>
      <div class="durata">${q.secondi.toFixed(1)} s</div>
    </div>`,
    )
    .join("");
}

function segna(i, classe) {
  const riga = document.getElementById(`scatto-${i}`);
  if (!riga) return;
  riga.classList.remove("incorso", "fatto", "guasto");
  if (classe) riga.classList.add(classe);
}

/** Attacca l'anteprima della clip alla sua riga, quando è pronta. */
function mostraClip(i, file) {
  const riga = document.getElementById(`scatto-${i}`);
  if (!riga) return;
  const video = document.createElement("video");
  video.src = ponte.vista(file);
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  riga.appendChild(video);
}

/* ---------------------------------------------------------------- girare */

/**
 * L'ultimo fotogramma di una clip, come immagine da dare alla successiva.
 *
 * È il pezzo che tiene insieme il video. Si legge il file appena prodotto con
 * un `<video>`, ci si porta sull'ultimo istante e lo si disegna su una tela: da
 * lì esce un PNG che torna dentro al motore come `start_image`.
 *
 * `currentTime` sull'ultimo fotogramma esatto non è affidabile — dipende dal
 * codec — quindi ci si mette un decimo di secondo prima della fine, che è la
 * stessa immagine e si trova sempre.
 */
function ultimoFotogramma(file) {
  return new Promise((risolvi, rifiuta) => {
    const video = document.createElement("video");
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.onerror = () => rifiuta(new Error("non riesco a rileggere la clip appena fatta"));
    video.onloadeddata = () => {
      video.currentTime = Math.max(0, video.duration - 0.1);
    };
    video.onseeked = () => {
      const tela = document.createElement("canvas");
      tela.width = video.videoWidth;
      tela.height = video.videoHeight;
      tela.getContext("2d").drawImage(video, 0, 0);
      tela.toBlob((b) => (b ? risolvi(b) : rifiuta(new Error("tela vuota"))), "image/png");
    };
    video.src = ponte.vista(file);
  });
}

/**
 * Gira tutte le inquadrature, una dopo l'altra.
 *
 * Riprende da dove si era rimasti: le clip già in `girate` si saltano. È il
 * motivo per cui «Ferma» non butta via il lavoro fatto — un video sono decine di
 * minuti, e ricominciare da capo perché si è chiuso un menu sarebbe crudele.
 */
export async function gira() {
  if (inCorso || !brano || !scaletta.length) return;
  const m = modello(el.modello.value);
  const cartella = String(brano.nome || "video").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);

  inCorso = true;
  nascondiErrore();
  el.gira.disabled = true;
  el.ferma.disabled = false;

  // Prima di tutto, la scheda sgombra: diciassette lavori di fila non
  // sopravvivono a un modello di un'altra app rimasto in memoria.
  await ponte.liberaMemoriaLlm().catch(() => {});
  await ponte.svuotaVram();

  try {
    for (const [i, q] of scaletta.entries()) {
      if (girate.has(i)) continue;
      segna(i, "incorso");
      el.passoOra.textContent = `${q.passo} — ${i + 1} di ${scaletta.length}`;

      let primoFotogramma;
      if (el.continuita.checked && i > 0 && girate.has(i - 1)) {
        const png = await ultimoFotogramma(girate.get(i - 1));
        primoFotogramma = await ponte.carica(png, `attacco_${i}.png`);
      }

      const id = await ponte.invia(
        grafoClip(m, {
          prompt: q.prompt,
          secondi: q.secondi,
          misura: el.misura.value,
          passi: parseInt(el.passi.value),
          seed: rnd(),
          cartella,
          primoFotogramma,
        }),
      );

      const uscite = await attendi(id);
      const file = Object.values(uscite).flatMap((u) => u.images ?? u.video ?? [])[0];
      if (!file) throw new Error(`L'inquadratura ${i + 1} non ha prodotto nessun file.`);

      girate.set(i, file);
      segna(i, "fatto");
      mostraClip(i, file);
      avanzamentoTotale();
    }

    el.passoOra.textContent = "Tutte le inquadrature sono girate.";
    el.monta.disabled = false;
  } catch (errore) {
    if (String(errore.message) !== "fermato") {
      mostraErrore(String(errore.message || errore));
      const rimasta = scaletta.findIndex((_, i) => !girate.has(i));
      if (rimasta >= 0) segna(rimasta, "guasto");
    }
    el.monta.disabled = girate.size !== scaletta.length;
  } finally {
    inCorso = false;
    el.gira.disabled = false;
    el.ferma.disabled = true;
  }
}

/** La barra grande: quanto manca al video intero, non alla clip di adesso. */
function avanzamentoTotale(dentroLaClip = 0) {
  const quota = (girate.size + dentroLaClip) / Math.max(1, scaletta.length);
  el.avanzamento.style.width = `${(quota * 100).toFixed(1)}%`;
}

export function ferma() {
  lasciaPerdere();
  void ponte.svuotaCoda();
  el.passoOra.textContent = "Fermato. «Gira» riprende da dove eravamo.";
}

/* -------------------------------------------------------------- montaggio */

/**
 * Le clip una dietro l'altra, sopra la canzone.
 *
 * Le clip il motore le ha prodotte nella sua cartella `output`, e `LoadVideo`
 * legge da `input`: vanno rilette e rimesse dentro. Sembra un giro inutile ed è
 * il prezzo di far fare il montaggio al motore invece che alla pagina — che un
 * mp4 non lo sa scrivere.
 */
export async function monta() {
  if (!brano || girate.size !== scaletta.length) return;
  nascondiErrore();
  el.monta.disabled = true;
  el.passoOra.textContent = "Preparo il montaggio…";

  try {
    const cartella = String(brano.nome || "video").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);

    const dentro = [];
    for (const [i, file] of [...girate.entries()].sort((a, b) => a[0] - b[0])) {
      dentro.push(await ponte.carica(await ponte.leggi(file), `clip_${String(i).padStart(3, "0")}.mp4`));
    }

    const audio = await fetch(brano.url).then((r) => r.blob());
    const dentroBrano = await ponte.carica(audio, "brano.mp3");

    el.passoOra.textContent = "Monto il video…";
    const id = await ponte.invia(grafoMontaggio({ clip: dentro, brano: dentroBrano, cartella }));
    const uscite = await attendi(id);

    const file = Object.values(uscite).flatMap((u) => u.images ?? u.video ?? [])[0];
    if (!file) throw new Error("Il montaggio non ha prodotto nessun file.");

    el.finale.hidden = false;
    el.finale.innerHTML = `<video src="${ponte.vista(file)}" controls autoplay></video>`;
    el.passoOra.textContent = "Fatto. Il video è anche in libreria.";

    await ponte
      .scriviMeta(ponte.idLibreria(file), {
        brano: brano.nome,
        look: el.look.value.trim(),
        inquadrature: scaletta.length,
        misura: el.misura.value,
        modello: modello(el.modello.value).nome,
      })
      .catch(() => {});
  } catch (errore) {
    mostraErrore(String(errore.message || errore));
    el.monta.disabled = false;
  }
}

/* ------------------------------------------------------------ collegamenti */

export async function collegaCrea() {
  el.look.innerHTML = "";
  el.estetica.innerHTML = Object.keys(LOOK)
    .map((nome) => `<option value="${escapeHtml(nome)}">${nome || "— nessuno —"}</option>`)
    .join("");
  el.look.value = localStorage.getItem(RICORDO_LOOK) ?? LOOK["Super-8 anni ottanta"];

  el.misura.innerHTML = Object.values(MISURE)
    .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`)
    .join("");
  el.misura.value = localStorage.getItem(RICORDO_MISURA) ?? "provino";

  el.modello.innerHTML = Object.values(MODELLI)
    .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`)
    .join("");

  legaValore("passi", "passiVal");
  const m = modello(el.modello.value);
  el.passi.min = m.passi.min;
  el.passi.max = m.passi.max;
  el.passi.value = m.passi.valore;
  el.passi.dispatchEvent(new Event("input"));
  el.rigaModello.textContent = m.riga;

  // L'estetica non si incolla in fondo: **riscrive la casella**, come in
  // DaProdFoto. Così la vedi, la cambi e la togli, invece che subirla.
  el.estetica.onchange = () => {
    el.look.value = LOOK[el.estetica.value] ?? "";
    salvaERifai();
  };
  el.look.oninput = salvaERifai;
  el.testoBrano.oninput = riscriviScaletta;
  el.misura.onchange = () => localStorage.setItem(RICORDO_MISURA, el.misura.value);
  el.brano.onchange = () => void scegliBrano(el.brano.value);
  el.ricaricaBrani.onclick = () => void aggiornaBrani();
  el.gira.onclick = () => void gira();
  el.ferma.onclick = ferma;
  el.monta.onclick = () => void monta();

  guarda(({ passo, quota }) => {
    el.passoOra.textContent = passo;
    avanzamentoTotale(quota);
  });

  void controllaModello();
  ponte.suAvanzamentoModelli((a) => {
    if (!a.attivo) void controllaModello();
  });

  await aggiornaBrani();
}

function salvaERifai() {
  localStorage.setItem(RICORDO_LOOK, el.look.value);
  riscriviScaletta();
}

/** Se i pesi non ci sono, si scaricano da qui: stessa strada di Musica e Foto. */
async function controllaModello() {
  const m = modello(el.modello.value);
  const stato = await ponte.statoModelli(m.catalogo).catch(() => null);
  if (!stato || stato.pronto) {
    el.mancaModello.hidden = true;
    return;
  }
  el.mancaModello.hidden = false;
  el.mancaModello.innerHTML =
    `<b>${escapeHtml(m.nome)} non è ancora sul disco.</b>` +
    ` <button class="mini" id="prendiModello">Scarica ${(stato.bytesMancanti / 1024 ** 3)
      .toFixed(1)
      .replace(".", ",")} GB</button>`;
  document.getElementById("prendiModello").onclick = () => {
    el.mancaModello.textContent = "Scarico… l'avanzamento è nell'hub.";
    void ponte.scaricaModelli(m.catalogo);
  };
}
