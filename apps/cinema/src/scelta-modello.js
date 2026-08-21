/**
 * Con che cosa si genera: il menu dei modelli, e cosa fare se non ce l'hai.
 *
 * **Sta in cima, fuori da tutto il resto**, come in DaProdFoto e in
 * DaProdMusica. Non è una preferenza fra le altre: è la scelta che decide cosa
 * si può dare in pasto al modello (due fotogrammi o dei riferimenti), quanto può
 * durare la clip e quanti passi ci vogliono. Metterla in mezzo ai parametri
 * vorrebbe dire far scoprire a metà pagina che i riquadri di sopra sono
 * cambiati.
 *
 * Quello che manca lo dice la suite, non questa pagina: `catalogo` sono gli id
 * di `manifest/models.json`, e `daprodSuite.modelli` risponde cosa c'è sul disco
 * e cosa vuole ancora il motore. Una pagina che indovinasse da sé quali file
 * esistono sarebbe la seconda verità sui modelli, e prima o poi quella sbagliata.
 */

import { el, escapeHtml } from "./dom.js";
import { MODELLI, modello } from "./grafi.js";
import { ingressiPer } from "./riferimenti.js";
// Il riquadro «manca, ecco i GB» con dentro la barra: nato in DaProdFoto, e
// dalla 0.4.1 è un pezzo di `packages/ui` che vale per tutte le app.
import { collegaScaricamento } from "/comune/scaricamento.js";
import * as ponte from "./ponte.js";

const RICORDO = "daprod.cinema.modello";
const RICORDO_MODO = "daprod.cinema.modo";

let corrente = MODELLI.ltx25;
/** Il modo di generare scelto per questo modello: i pulsanti «20 passi» / «4 passi». */
let modo = corrente.modi[0];
/** Vero quando i pesi del modello scelto sono tutti sul disco. */
let pronto = false;
/**
 * Vero se questo computer non ha una scheda video utilizzabile.
 *
 * Qui non è una sfumatura come in DaProdFoto, dove Anima sulla CPU è lenta ma
 * arriva: **un video su CPU non arriva**. Ventidue miliardi di parametri per
 * centoventuno fotogrammi non sono «più lenti», sono una cosa che non finisce.
 * Meglio dirlo prima di ventitré GB di scaricamento.
 */
let senzaScheda = false;

/** Il riquadro condiviso, creato una volta sola sotto il menu dei modelli. */
let barra = null;
/** La chiama `crea.js` per riaccendere o spegnere «Genera». */
let alCambio = () => {};

/** Il modello scelto adesso. */
export const modelloCorrente = () => corrente;

/** Vero se con questo modello si può generare: scheda, pesi sul disco, nodi nel motore. */
export const modelloUsabile = () => !senzaScheda && pronto;

export async function collegaScelta(quandoCambia = () => {}) {
  alCambio = quandoCambia;

  // Prima di disegnare il menu: se la suite non risponde si tira dritto, perché
  // meglio offrire tutto che spegnere una scheda per un dubbio nostro.
  try {
    senzaScheda = !(await ponte.macchina()).gpu;
  } catch {
    senzaScheda = false;
  }

  el.modello.innerHTML = Object.values(MODELLI)
    .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`)
    .join("");

  const ricordato = localStorage.getItem(RICORDO);
  el.modello.value = MODELLI[ricordato] ? ricordato : MODELLI.ltx25.id;
  el.modello.onchange = () => scegli(el.modello.value);

  barra = collegaScaricamento(el.avvisoModello, {
    stato: ponte.statoModelli,
    scarica: ponte.scaricaModelli,
    annulla: ponte.annullaScaricamento,
    onAvanzamento: ponte.suAvanzamentoModelli,
    io: ponte.io,
    // Finito di scaricare, i tasti si riaccendono da soli: chi ha appena visto
    // arrivare ventitré GB non deve anche cambiare modello e tornare indietro.
    onCambio: (ok) => {
      pronto = ok;
      alCambio();
    },
  });

  scegli(el.modello.value);
}

function scegli(id) {
  corrente = modello(id);
  localStorage.setItem(RICORDO, corrente.id);
  el.rigaModello.textContent = corrente.riga;
  applicaPreferenze(corrente);
  // I riquadri di sopra cambiano del tutto: due fotogrammi con LTX, tre file di
  // riferimenti con H3. Non è lo stesso pannello con un campo in più.
  ingressiPer(corrente);
  void controlla();
}

/**
 * I cursori si spostano sul punto di lavoro del modello.
 *
 * Otto passi su LTX e quattro su H3 non sono lo stesso numero regolato
 * diversamente: sono due modelli fatti in modo diverso, e lasciare il cursore
 * dov'era vuol dire generare male con il modello appena scelto.
 *
 * **Un cursore che può stare solo dov'è non è un cursore.** LTX è distillato su
 * una scala di rumore scritta a mano (vedi `SIGMAS` in `grafi.js`) e i passi
 * sono otto e basta: il cursore si spegne e la riga sotto dice perché, invece di
 * lasciare una manopola che gira senza cambiare niente.
 */
/**
 * I pulsanti dei modi, e cosa cambia scegliendone uno.
 *
 * Sono due su H3 — venti passi come è stato addestrato, o quattro col LoRA
 * turbo — e uno solo su LTX, che è già distillato. Sono pulsanti e non un menu
 * per la stessa ragione di formato e risoluzione: sono due scelte in tutto, e
 * in un menu costavano due clic per vederne una.
 *
 * Quello che cambia non è solo un numero: **con il turbo il grafo monta un LoRA
 * in più**, e senza no. Per questo il modo viaggia fino al grafo (`p.lora`) e
 * non resta una preferenza dell'interfaccia.
 */
function disegnaModi() {
  el.modiPassi.innerHTML = corrente.modi
    .map((x) => `<button type="button" class="mini" data-modo="${escapeHtml(x.id)}">${escapeHtml(x.nome)}</button>`)
    .join("");

  for (const b of el.modiPassi.children) {
    b.classList.toggle("on", b.dataset.modo === modo.id);
    b.onclick = () => {
      modo = corrente.modi.find((x) => x.id === b.dataset.modo) ?? corrente.modi[0];
      localStorage.setItem(`${RICORDO_MODO}.${corrente.id}`, modo.id);
      disegnaModi();
      applicaPassi();
    };
  }

  el.rigaModi.textContent = modo.riga;
  el.voceModi.hidden = corrente.modi.length < 2;
}

/** Il modo scelto adesso: lo legge `crea.js` per sapere che LoRA montare. */
export const modoCorrente = () => modo;

/** Il cursore dei passi si sposta sul punto di lavoro del **modo**, non del modello. */
function applicaPassi() {
  el.passi.min = modo.passi.min;
  el.passi.max = modo.passi.max;
  el.passi.value = modo.passi.valore;
  el.passi.disabled = modo.passi.min === modo.passi.max;
  el.passi.dispatchEvent(new Event("input"));

  el.notaPassi.textContent = notaPassi();
}

function notaPassi() {
  if (modo.passi.min === modo.passi.max) {
    return "LTX 2.5 è distillato su una scala di rumore fissa a otto passi: cambiarne il numero non lo migliora, lo peggiora.";
  }
  if (modo.lora) {
    return (
      "Quattro è il minimo con il LoRA turbo, non il numero consigliato: da sei in su il movimento " +
      "tiene molto meglio, e costa in proporzione. Il LoRA è addestrato a 768p, quindi in 1080p i quattro passi si vedono di più."
    );
  }
  return "Venti sono quelli con cui il modello è stato addestrato. Alzarli oltre i trenta non si vede quasi più; abbassarli sotto i dodici sì.";
}

function applicaPreferenze(m) {
  el.durata.min = m.durata.min;
  el.durata.max = m.durata.max;
  if (el.durata.value < m.durata.min || el.durata.value > m.durata.max) {
    el.durata.value = m.durata.valore;
  }
  el.durata.dispatchEvent(new Event("input"));

  // Il modo di questo modello: quello scelto l'ultima volta, se esiste ancora.
  const forse = localStorage.getItem(`${RICORDO_MODO}.${m.id}`);
  modo = m.modi.find((x) => x.id === forse) ?? m.modi[0];
  disegnaModi();
  applicaPassi();

  el.notaNegativo.textContent = `${m.nome} lavora a CFG 1,0, e a quel valore il negativo il modello non lo guarda proprio. Resta qui perché il giorno che si alza il CFG c'è già.`;
}

/**
 * Cosa manca del modello scelto, e cosa può farci l'utente.
 *
 * Tre casi soli: niente scheda video (e allora non c'è niente da scaricare, si
 * dice com'è), pesi mancanti (li disegna il riquadro comune, barra compresa),
 * tutto a posto (il riquadro sparisce).
 */
async function controlla() {
  if (senzaScheda) {
    pronto = false;
    alCambio();
    // Il riquadro comune si mette a riposo — niente da scaricare, niente da
    // mostrare — così non ci riscrive sopra la barra di uno scaricamento che
    // un'altra finestra ha chiesto per conto suo.
    await barra.controlla({ ids: [], nome: corrente.nome });
    el.avvisoModello.hidden = false;
    el.avvisoModello.innerHTML = `
      <div><b>Per fare un video serve una scheda video NVIDIA.</b></div>
      <div class="hint">Questo computer non ne ha una utilizzabile. Qui non è una
        questione di pazienza: sulla CPU un modello da ventidue miliardi di parametri
        per centoventuno fotogrammi non arriva in fondo in nessun tempo che abbia senso.
        <b>DaProdFoto</b> invece funziona lo stesso, più piano.</div>`;
    return;
  }

  pronto = await barra.controlla({ ids: corrente.catalogo, nome: corrente.nome });
  alCambio();
}
