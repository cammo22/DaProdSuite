/**
 * Con che cosa si gira la Storia: modello, forma, risoluzione, qualità.
 *
 * **Perché non sono quelli della scheda Crea.** Fino alla 0.5.2 la Storia
 * prendeva in prestito le scelte di Crea, con scritto nell'interfaccia che era
 * un pregio: «così quello che hai provato lì è quello che esce qui». Usandola
 * si è visto che è un difetto. In Crea si prova, e provare vuol dire 480p e
 * cinque secondi; la Storia è una notte di lavoro e la si vuole nella misura
 * buona. Con una scelta sola, chi provava una clip veloce si ritrovava il film
 * intero in 480 — o, peggio, provava una clip in 1080p e si accorgeva a
 * mezzanotte che le novanta inquadrature stavano andando lì.
 *
 * Adesso le due schede hanno la loro resa, ricordata separatamente. Il codice
 * sotto è lo stesso — `MODELLI`, `MISURE`, i modi di `grafi.js` — perché la
 * verità su cosa sa fare un modello resta in un posto solo.
 */

import { el, escapeHtml } from "./dom.js";
import { FORME, MISURE, MODELLI, RISOLUZIONI, modello } from "./grafi.js";
import { collegaScaricamento } from "/comune/scaricamento.js";
import * as ponte from "./ponte.js";

const RICORDO = "daprod.cinema.storia.resa";

let scelta = {
  modello: "ltx25",
  forma: "16:9",
  risoluzione: "480",
  /** Il modo (i pulsanti «Qualità»), uno per modello. */
  modi: {},
};

/** Vero quando i pesi del modello scelto sono tutti sul disco. */
let pronto = false;
/** Vero se questo computer non ha una scheda video utilizzabile. */
let senzaScheda = false;

let barra = null;
let alCambio = () => {};

/* ------------------------------------------------------------ chi siamo */

export const modelloStoria = () => modello(scelta.modello);

export function misuraStoria() {
  const m = MISURE[scelta.forma] ?? MISURE["16:9"];
  const [larghezza, altezza] = m[scelta.risoluzione] ?? m["480"];
  return {
    larghezza,
    altezza,
    forma: scelta.forma,
    risoluzione: scelta.risoluzione,
    etichetta: `${larghezza}x${altezza}`,
  };
}

export function modoStoria() {
  const m = modelloStoria();
  return m.modi.find((x) => x.id === scelta.modi[m.id]) ?? m.modi[0];
}

/** Vero se con questa resa si può generare: scheda video e pesi sul disco. */
export const resaProntaStoria = () => !senzaScheda && pronto;

/* -------------------------------------------------------------- il disegno */

function salva() {
  try {
    localStorage.setItem(RICORDO, JSON.stringify(scelta));
  } catch {
    // Preferenze non salvate: la sessione va avanti lo stesso.
  }
}

/**
 * Quanto pesa questa misura rispetto al 480, in pixel per fotogramma.
 *
 * Qui conta il doppio che in Crea: una clip in 1080p è una pausa pranzo, e
 * novanta clip in 1080p sono tre notti invece di una.
 */
function quantoCosta() {
  const m = MISURE[scelta.forma] ?? MISURE["16:9"];
  const [l, a] = m[scelta.risoluzione] ?? m["480"];
  const [l0, a0] = m["480"];
  const volte = (l * a) / (l0 * a0);
  return volte < 1.15 ? "" : ` — circa ${volte.toFixed(1).replace(".", ",")}x il lavoro del 480`;
}

function disegna() {
  const misura = misuraStoria();
  el.storiaMisura.textContent = `${misura.larghezza} x ${misura.altezza} px${quantoCosta()}`;

  for (const b of el.storiaFormati.children) b.classList.toggle("on", b.dataset.forma === scelta.forma);
  for (const b of el.storiaRisoluzioni.children) {
    b.classList.toggle("on", b.dataset.ris === scelta.risoluzione);
  }

  const m = modelloStoria();
  el.storiaRigaModello.textContent = m.riga;

  const modo = modoStoria();
  el.storiaModi.innerHTML = m.modi
    .map((x) => `<button type="button" class="mini" data-modo="${escapeHtml(x.id)}">${escapeHtml(x.nome)}</button>`)
    .join("");
  for (const b of el.storiaModi.children) {
    b.classList.toggle("on", b.dataset.modo === modo.id);
    b.onclick = () => {
      scelta.modi[m.id] = b.dataset.modo;
      salva();
      disegna();
      alCambio();
    };
  }
  el.storiaRigaModi.textContent = modo.riga;
  el.storiaVoceModi.hidden = m.modi.length < 2;
}

/**
 * Cosa manca del modello scelto qui.
 *
 * È lo stesso riquadro della scheda Crea (`packages/ui/scaricamento.js`), con
 * un contenitore suo: se scegli H3 per il film e non ce l'hai, il conto dei GB
 * lo devi vedere **qui**, non tornando in un'altra scheda a indovinare.
 */
async function controlla() {
  const m = modelloStoria();

  if (senzaScheda) {
    pronto = false;
    alCambio();
    await barra.controlla({ ids: [], nome: m.nome });
    el.storiaAvvisoModello.hidden = false;
    el.storiaAvvisoModello.innerHTML = `<div><b>Per fare un film serve una scheda video NVIDIA.</b></div>
      <div class="hint">Su questo computer non ce n'è una utilizzabile.</div>`;
    return;
  }

  pronto = await barra.controlla({ ids: m.catalogo, nome: m.nome });
  alCambio();
}

/* ---------------------------------------------------------------- l'aggancio */

export async function collegaResaStoria(quandoCambia = () => {}) {
  alCambio = quandoCambia;

  try {
    const forse = JSON.parse(localStorage.getItem(RICORDO) || "null");
    if (forse && MODELLI[forse.modello]) scelta = { ...scelta, ...forse, modi: forse.modi ?? {} };
  } catch {
    // Preferenze illeggibili: si riparte da LTX in 16:9 a 480.
  }
  if (!MISURE[scelta.forma]) scelta.forma = "16:9";
  if (!MISURE[scelta.forma][scelta.risoluzione]) scelta.risoluzione = "480";

  try {
    senzaScheda = !(await ponte.macchina()).gpu;
  } catch {
    senzaScheda = false;
  }

  el.storiaModello.innerHTML = Object.values(MODELLI)
    .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`)
    .join("");
  el.storiaModello.value = scelta.modello;
  el.storiaModello.onchange = () => {
    scelta.modello = el.storiaModello.value;
    salva();
    disegna();
    alCambio();
    void controlla();
  };

  el.storiaFormati.innerHTML = FORME.map(
    (f) => `<button type="button" class="mini" data-forma="${f}">${f}</button>`,
  ).join("");
  el.storiaRisoluzioni.innerHTML = RISOLUZIONI.map(
    (r) => `<button type="button" class="mini" data-ris="${r.id}">${escapeHtml(r.etichetta)}</button>`,
  ).join("");

  for (const b of el.storiaFormati.children) {
    b.onclick = () => {
      scelta.forma = b.dataset.forma;
      if (!MISURE[scelta.forma][scelta.risoluzione]) scelta.risoluzione = "480";
      salva();
      disegna();
      alCambio();
    };
  }
  for (const b of el.storiaRisoluzioni.children) {
    b.onclick = () => {
      scelta.risoluzione = b.dataset.ris;
      salva();
      disegna();
      alCambio();
    };
  }

  barra = collegaScaricamento(el.storiaAvvisoModello, {
    stato: ponte.statoModelli,
    scarica: ponte.scaricaModelli,
    annulla: ponte.annullaScaricamento,
    onAvanzamento: ponte.suAvanzamentoModelli,
    io: ponte.io,
    onCambio: (ok) => {
      pronto = ok;
      alCambio();
    },
  });

  disegna();
  await controlla();
}
