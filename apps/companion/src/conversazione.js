/**
 * La conversazione: si scrive, si manda, si aspetta.
 *
 * **Aspettare è la parte difficile.** Una risposta può arrivare in cinque
 * secondi o in due minuti, e non dipende dal Companion: dipende da cos'altro
 * sta usando la macchina. Con un motore di immagini acceso, la stessa domanda a
 * LM Studio passa da cinque secondi a duecentocinquanta — misurato, sta in
 * `docs/RIPRENDERE-DA-QUI.md`. Quindi non si mostra una rotellina che gira
 * (dopo un minuto sembra un programma piantato): si mostra una battuta in
 * attesa, al posto suo nella conversazione, che dice che sta pensando.
 */

import { el, testo } from "./dom.js";
import { parla } from "./ponte.js";
import { modelloScelto } from "/comune/selettore-llm.js";

/** Vero mentre una risposta è per strada: una domanda per volta. */
let inAttesa = false;

const VUOTO = `
  <div class="vuoto">
    Non vi siete ancora detti niente.<br><br>
    Scrivigli qualcosa: si ricorderà di questa conversazione anche domani, perché
    stanotte la rileggerà e ne terrà quello che conta.
  </div>`;

export function collegaConversazione() {
  el.conversazione.innerHTML = VUOTO;

  el.formScrivi.onsubmit = (ev) => {
    ev.preventDefault();
    void manda();
  };

  // Invio manda, Maiusc+Invio va a capo. È quello che fanno tutte le chat, e
  // chi scrive non ci pensa nemmeno.
  el.testo.onkeydown = (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void manda();
    }
  };

  // La casella cresce con quello che ci scrivi, fino al tetto del foglio di
  // stile: due righe per un saluto, otto per un pensiero lungo.
  el.testo.oninput = () => {
    el.testo.style.height = "auto";
    el.testo.style.height = `${el.testo.scrollHeight}px`;
  };
}

/** Rimette in pagina gli scambi già avvenuti, all'apertura dell'app. */
export function riprendi(turni) {
  if (!turni.length) return;
  el.conversazione.innerHTML = "";
  for (const turno of turni) {
    aggiungi(turno.event_type === "user_message" ? "mia" : "sua", turno.content);
  }
  inFondo();
}

async function manda() {
  const messaggio = el.testo.value.trim();
  if (!messaggio || inAttesa) return;

  inAttesa = true;
  el.manda.disabled = true;
  el.testo.value = "";
  el.testo.style.height = "auto";

  if (el.conversazione.querySelector(".vuoto")) el.conversazione.innerHTML = "";
  aggiungi("mia", messaggio);
  const attesa = aggiungi("sua attesa", "sta pensando…");
  inFondo();

  try {
    const esito = await parla(messaggio, modelloScelto());
    attesa.remove();
    const battuta = aggiungi("sua", esito.reply);
    // Quando ha pescato da un ricordo vecchio invece che dalle ultime righe, si
    // dice: è la cosa che distingue questa scheda da una chat qualunque, e
    // senza dirla non si vede.
    if (esito.used_memory) {
      const nota = document.createElement("span");
      nota.className = "ricordo";
      nota.textContent = "↩ ha usato qualcosa che si ricordava di te";
      battuta.append(nota);
    }
  } catch (errore) {
    attesa.remove();
    aggiungi("sua", `Non sono riuscito a rispondere: ${errore.message}`);
  } finally {
    inAttesa = false;
    el.manda.disabled = false;
    inFondo();
    el.testo.focus();
  }
}

function aggiungi(classe, contenuto) {
  const battuta = document.createElement("div");
  battuta.className = `battuta ${classe}`;
  battuta.innerHTML = testo(contenuto);
  el.conversazione.append(battuta);
  return battuta;
}

function inFondo() {
  el.conversazione.scrollTop = el.conversazione.scrollHeight;
}
