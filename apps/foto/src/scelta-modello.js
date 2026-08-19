/**
 * Con che cosa si genera: il menu dei modelli, e cosa fare se non ce l'hai.
 *
 * Prima qui c'era una costante: Anima, e basta. Il motivo non era una scelta di
 * gusto ma il fatto che FLUX.2 Klein non si poteva nemmeno installare — 11,2 GB
 * di pesi e un nodo custom del motore, e la suite non sapeva scaricare niente
 * delle due cose. Adesso lo sa, quindi il modello diventa una scelta, e la
 * scelta si porta dietro il suo scaricamento: se prendi un modello che non hai,
 * te lo scarichi da qui, senza tornare nell'hub a reinstallare la scheda.
 *
 * Quello che manca lo dice la suite, non questa pagina: `catalogo` sono gli id
 * di `manifest/models.json`, e `daprodSuite.modelli` risponde cosa c'è sul disco
 * e cosa vuole ancora il motore. Una pagina che indovinasse da sé quali file
 * esistono sarebbe la seconda verità sui modelli, e prima o poi quella sbagliata.
 */

import { $, el, escapeHtml } from "./dom.js";
import { MODELLI, modello } from "./grafi.js";
import { traduzionePerModello } from "./lingua.js";
import * as ponte from "./ponte.js";

const RICORDO = "daprod.foto.modello";

let corrente = MODELLI.anima;
let manca = null;
/**
 * Vero se questo computer non ha una scheda video utilizzabile.
 *
 * Lo dice la suite una volta sola all'avvio. Cambia cosa si può offrire nel
 * menu: FLUX.2 Klein sulla CPU non è "più lento", è un'immagine che non arriva
 * — e undici GB scaricati per scoprirlo.
 */
let senzaScheda = false;
/** Vero se lo scaricamento in corso l'abbiamo chiesto noi da questa finestra. */
let nostro = false;

/** Il modello scelto adesso. Lo chiedono Crea e Ritocco al momento di generare. */
export const modelloCorrente = () => corrente;

/** Vero se col modello scelto si può generare: pesi sul disco e nodi nel motore. */
export const modelloUsabile = () =>
  !(senzaScheda && corrente.serveScheda) && (manca === null || manca.pronto);

export async function collegaScelta() {
  // Prima di disegnare il menu: da questo dipende quali voci sono scegliibili.
  // Se la suite non risponde si tira dritto — meglio offrire tutto che spegnere
  // FLUX per un dubbio nostro.
  try {
    senzaScheda = !(await ponte.macchina()).gpu;
  } catch {
    senzaScheda = false;
  }

  el.modello.innerHTML = Object.values(MODELLI)
    .map(
      (m) =>
        `<option value="${m.id}"${senzaScheda && m.serveScheda ? " disabled" : ""}>${escapeHtml(
          m.nome,
        )}${senzaScheda && m.serveScheda ? " — serve una scheda video" : ""}</option>`,
    )
    .join("");

  const ricordato = localStorage.getItem(RICORDO);
  const valido = MODELLI[ricordato] && !(senzaScheda && MODELLI[ricordato].serveScheda);
  el.modello.value = valido ? ricordato : MODELLI.anima.id;
  el.modello.onchange = () => scegli(el.modello.value);

  ponte.suAvanzamentoModelli(avanzamento);
  scegli(el.modello.value);
}

function scegli(id) {
  corrente = modello(id);
  localStorage.setItem(RICORDO, corrente.id);
  el.rigaModello.textContent = corrente.riga;
  applicaPreferenze(corrente);
  // La traduzione è una proprietà del modello, non una preferenza dell'utente:
  // a FLUX.2 l'italiano lo si può scrivere direttamente.
  traduzionePerModello(corrente);
  void controlla();
}

/**
 * I cursori si spostano sul punto di lavoro del modello.
 *
 * Dieci passi su Anima e venti su FLUX non sono lo stesso numero regolato
 * diversamente: sono due modelli che lavorano in modo diverso, e lasciare il
 * cursore dov'era significa generare male col modello appena scelto.
 */
function applicaPreferenze(m) {
  for (const [chiave, campo] of [["passi", el.passi], ["cfg", el.cfg]]) {
    const regola = m[chiave];
    campo.min = regola.min;
    campo.max = regola.max;
    campo.value = regola.valore;
    // Un cursore che può stare solo dov'è non è un cursore: FLUX.2 Klein è
    // distillato e il CFG resta a 1.
    campo.disabled = regola.min === regola.max;
    campo.dispatchEvent(new Event("input"));
  }

  el.negativo.disabled = !m.usaNegativo;
  el.notaNegativo.textContent = m.usaNegativo
    ? "Anima lavora a CFG 1,0, e a quel valore il negativo viene ignorato dal modello. Conta solo se alzi il CFG qui sopra."
    : `${m.nome} è distillato: lavora sempre a CFG 1,0 e non guarda mai il negativo.`;
}

async function controlla() {
  try {
    manca = await ponte.statoModelli(corrente.catalogo);
  } catch {
    // La suite non ha risposto: meglio lasciar provare che bloccare tutto per
    // un dubbio nostro. Se il modello davvero non c'è, lo dirà il motore.
    manca = null;
  }
  disegna();
}

/* ------------------------------------------------------------- il riquadro */

const gb = (byte) => `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;

function disegna(avanza) {
  const usabile = modelloUsabile();
  el.genera.disabled = !usabile;
  el.rigenera.disabled = !usabile;

  if (usabile && !avanza) {
    el.avvisoModello.hidden = true;
    el.avvisoModello.innerHTML = "";
    return;
  }

  el.avvisoModello.hidden = false;

  // Niente scheda video e modello che ne pretende una: non c'è niente da
  // scaricare né da aspettare, quindi non si mostra nessun bottone. Si dice
  // com'è e si indica la strada che su questa macchina funziona.
  if (senzaScheda && corrente.serveScheda) {
    el.avvisoModello.innerHTML = `
      <div><b>${escapeHtml(corrente.nome)} ha bisogno di una scheda video NVIDIA.</b></div>
      <div class="hint">Questo computer non ne ha una utilizzabile, e sulla CPU
        un'immagine con questo modello non arriva in fondo in un tempo che abbia
        senso. <b>Anima</b> invece funziona: è più lenta del solito, ma ci arriva.</div>`;
    return;
  }

  if (avanza) {
    const quota = avanza.total > 0 ? avanza.done / avanza.total : null;
    const quanto =
      quota === null
        ? escapeHtml(avanza.label)
        : `${escapeHtml(avanza.label)} — ${gb(avanza.done)} di ${gb(avanza.total)}`;

    el.avvisoModello.innerHTML = `
      <div class="bar"><i class="p1" style="width:${quota === null ? 100 : (quota * 100).toFixed(1)}%${
        quota === null ? ";opacity:.45" : ""
      }"></i></div>
      <div class="hint">${quanto}</div>
      <button class="mini" id="fermaModello">Annulla</button>`;
    $("fermaModello").onclick = () => void ponte.annullaScaricamento();
    return;
  }

  const pesi = manca.mancanti.map((m) => m.label);
  const nodi = manca.nodiMancanti;

  el.avvisoModello.innerHTML = `
    <div><b>${escapeHtml(corrente.nome)} non è ancora sul disco.</b></div>
    ${
      pesi.length
        ? `<div class="hint">${gb(manca.bytesMancanti)} da scaricare: ${escapeHtml(pesi.join(", "))}.</div>`
        : ""
    }
    ${
      nodi.length
        ? `<div class="hint">Il motore deve anche prendere ${escapeHtml(nodi.join(", "))}:
             quando arriva riparte da solo, e ci vogliono pochi secondi.</div>`
        : ""
    }
    <button class="btn" id="prendiModello" style="margin-top:12px">Scarica ${gb(
      manca.bytesMancanti,
    )}</button>`;

  $("prendiModello").onclick = () => {
    nostro = true;
    disegna({ done: 0, total: 0, label: "Comincio" });
    void ponte.scaricaModelli(corrente.catalogo);
  };
}

function avanzamento(stato) {
  if (!nostro) return;

  if (stato.attivo) {
    disegna(stato);
    return;
  }

  nostro = false;

  if (stato.errore) {
    el.avvisoModello.hidden = false;
    el.avvisoModello.innerHTML = `<div class="err">${escapeHtml(stato.errore)}</div>
      <button class="btn" id="prendiModello" style="margin-top:12px">Riprova</button>`;
    $("prendiModello").onclick = () => {
      nostro = true;
      disegna({ done: 0, total: 0, label: "Riprovo" });
      void ponte.scaricaModelli(corrente.catalogo);
    };
    return;
  }

  // Finito o annullato: si rilegge cosa c'è davvero sul disco invece di credere
  // al messaggio. Dopo un annullamento il modello resta mancante, ed è giusto
  // che il riquadro torni a dirlo.
  void controlla();
}
