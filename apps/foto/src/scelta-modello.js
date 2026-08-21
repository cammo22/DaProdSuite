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

import { el, escapeHtml } from "./dom.js";
import { MODELLI, modello } from "./grafi.js";
import { traduzionePerModello } from "./lingua.js";
// Il riquadro «manca, ecco i GB» con dentro la barra: nato qui, e dalla 0.4.1
// è un pezzo di `packages/ui` che vale per tutte le app. Servito sotto `/comune/`.
import { collegaScaricamento } from "/comune/scaricamento.js";
import * as ponte from "./ponte.js";

const RICORDO = "daprod.foto.modello";

let corrente = MODELLI.anima;
/** Vero quando i pesi del modello scelto sono tutti sul disco. */
let pronto = true;
/**
 * Vero se questo computer non ha una scheda video utilizzabile.
 *
 * Lo dice la suite una volta sola all'avvio. Cambia cosa si può offrire nel
 * menu: FLUX.2 Klein sulla CPU non è "più lento", è un'immagine che non arriva
 * — e undici GB scaricati per scoprirlo.
 */
let senzaScheda = false;

/** Il riquadro condiviso, creato una volta sola sopra il menu dei modelli. */
let barra = null;

/** Il modello scelto adesso. Lo chiedono Crea e Ritocco al momento di generare. */
export const modelloCorrente = () => corrente;

/** Vero se col modello scelto si può generare: pesi sul disco e nodi nel motore. */
export const modelloUsabile = () => !(senzaScheda && corrente.serveScheda) && pronto;

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

  barra = collegaScaricamento(el.avvisoModello, {
    stato: ponte.statoModelli,
    scarica: ponte.scaricaModelli,
    annulla: ponte.annullaScaricamento,
    onAvanzamento: ponte.suAvanzamentoModelli,
    io: ponte.io,
    // Finito di scaricare, i tasti si riaccendono da soli: chi ha appena visto
    // arrivare dodici GB non deve anche cambiare modello e tornare indietro.
    onCambio: (ok) => {
      pronto = ok;
      accendiBottoni();
    },
  });

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
 * Trenta step su Anima e venti su FLUX non sono lo stesso numero regolato
 * diversamente: sono due modelli che lavorano in modo diverso, e lasciare il
 * cursore dov'era significa generare male col modello appena scelto.
 */
function applicaPreferenze(m) {
  for (const [chiave, campo] of [["step", el.step], ["cfg", el.cfg]]) {
    const regola = m[chiave];
    campo.min = regola.min;
    campo.max = regola.max;
    campo.value = regola.valore;
    // Un cursore che può stare solo dov'è non è un cursore: FLUX.2 Klein è
    // distillato e il CFG resta a 1.
    campo.disabled = regola.min === regola.max;
    campo.dispatchEvent(new Event("input"));
  }

  // La riga sotto al negativo la scrive il modello, non questa pagina: con tre
  // modelli in menu una frase fissa su Anima era vera per uno solo dei tre.
  el.negativo.disabled = !m.usaNegativo;
  el.notaNegativo.textContent = m.usaNegativo
    ? (m.notaNegativo ?? `${m.nome} guarda il negativo: quello che scrivi qui sotto conta.`)
    : `${m.nome} è distillato: lavora sempre a CFG 1,0 e non guarda mai il negativo.`;
}

/**
 * Cosa manca del modello scelto, e cosa può fare l'utente.
 *
 * Tre casi soli: niente scheda video (e allora non c'è niente da scaricare, si
 * dice com'è), pesi mancanti (li disegna il riquadro comune, barra compresa),
 * tutto a posto (il riquadro sparisce).
 */
async function controlla() {
  if (senzaScheda && corrente.serveScheda) {
    pronto = false;
    accendiBottoni();
    // Il riquadro comune si mette a riposo — niente da scaricare, niente da
    // mostrare — così non ci riscrive sopra la barra di uno scaricamento che
    // un'altra finestra ha chiesto per conto suo.
    await barra.controlla({ ids: [], nome: corrente.nome });
    el.avvisoModello.hidden = false;
    el.avvisoModello.innerHTML = `
      <div><b>${escapeHtml(corrente.nome)} ha bisogno di una scheda video NVIDIA.</b></div>
      <div class="hint">Questo computer non ne ha una utilizzabile, e sulla CPU
        un'immagine con questo modello non arriva in fondo in un tempo che abbia
        senso. <b>Anima</b> invece funziona: è più lenta del solito, ma ci arriva.</div>`;
    return;
  }

  pronto = await barra.controlla({ ids: corrente.catalogo, nome: corrente.nome });
  accendiBottoni();
}

function accendiBottoni() {
  const usabile = modelloUsabile();
  el.genera.disabled = !usabile;
  el.rigenera.disabled = !usabile;
}
