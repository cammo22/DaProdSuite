/**
 * Con che modello si parla, e cosa fare se non ce l'hai.
 *
 * **Sta in cima, fuori dalle schede**, come in tutte le altre app della suite:
 * decide quanto bene viene letto l'italiano, e vale sia per quello che scrivi in
 * «Parla» sia per le voci che provi in «Voci».
 *
 * Quello che manca lo dice la suite, non questa pagina: `catalogo` sono gli id
 * di `manifest/models.json`, e `daprodSuite.modelli` risponde cosa c'è sul
 * disco. Una pagina che indovinasse da sé quali file esistono sarebbe la seconda
 * verità sui modelli, e prima o poi quella sbagliata.
 */

import { el, escapeHtml } from "./dom.js";
import { MODELLI, PREDEFINITO, modello } from "./dati/modelli.js";
// Il riquadro «manca, ecco i GB» con dentro la barra: è un pezzo di
// `packages/ui`, lo stesso di Foto, Musica e Cinema.
import { collegaScaricamento } from "/comune/scaricamento.js";
import * as ponte from "./ponte.js";

const RICORDO = "daprod.voce.modello";

let corrente = MODELLI[PREDEFINITO];
/** Vero quando i pesi del modello scelto sono tutti sul disco. */
let pronto = false;
let barra = null;
let alCambio = () => {};

export const modelloCorrente = () => corrente;
export const modelloUsabile = () => pronto;

export async function collegaScelta(quandoCambia = () => {}) {
  alCambio = quandoCambia;

  el.modello.innerHTML = Object.values(MODELLI)
    .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`)
    .join("");

  const ricordato = localStorage.getItem(RICORDO);
  el.modello.value = MODELLI[ricordato] ? ricordato : PREDEFINITO;
  el.modello.onchange = () => scegli(el.modello.value);

  barra = collegaScaricamento(el.avvisoModello, {
    stato: ponte.statoModelli,
    scarica: ponte.scaricaModelli,
    annulla: ponte.annullaScaricamento,
    onAvanzamento: ponte.suAvanzamentoModelli,
    io: ponte.io,
    // Finito di scaricare, il tasto si riaccende da solo: chi ha appena visto
    // arrivare due GB non deve anche cambiare modello e tornare indietro.
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
  el.notaResa.textContent = corrente.nota;
  void controlla();
}

async function controlla() {
  pronto = await barra.controlla({ ids: corrente.catalogo, nome: corrente.nome });
  alCambio();
}
