/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta poco — ogni modulo si collega ai propri bottoni e non tocca
 * quelli degli altri — tranne per due cose: la libreria va letta prima di
 * disegnare la sessione (che mostra i brani recenti) e il motore va contattato
 * per ultimo, perché è l'unica cosa che può non esserci.
 */

import { el, mostraScheda, suApertura } from "./dom.js";
import { collegaLettore } from "./lettore.js";
import { collegaComandiCoda, messaggioDalMotore, riallinea } from "./coda.js";
import { collegaCrea, scegliLingua } from "./crea.js";
import { collegaCostruttore } from "./costruttore.js";
import { aggiornaLibreria, collegaLibreria } from "./libreria.js";
import { aggiornaImmagini, collegaImmagini } from "./immagini.js";
// I quadratini di cosa occupa la memoria: uguali in tutte le app, quindi
// stanno in `packages/ui` e la suite li serve sotto `/comune/`.
import {
  aspettaPremibile,
  collegaLavoriDaFuori,
  numero,
  premi,
  scegliInMenu,
  scrivi,
  spunta,
} from "/comune/da-fuori.js";
import { collegaModelliInMemoria } from "/comune/modelli-in-memoria.js";
import { collegaBonsai } from "./bonsai.js";
import { collega, macchina, modelliInVram, scaricaDallaVram } from "./ponte.js";

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("libreria", () => void aggiornaLibreria());
suApertura("immagini", () => void aggiornaImmagini());

collegaLettore();
collegaCrea();
collegaCostruttore();
collegaLibreria();
collegaImmagini();
collegaComandiCoda();
collegaModelliInMemoria(el.mods, {
  elenco: modelliInVram,
  scarica: scaricaDallaVram,
});
collegaBonsai();

/**
 * Su un computer senza scheda video si dice subito, prima che qualcuno prema
 * Genera e aspetti.
 *
 * **Perché non basta lasciar fare.** MiniMax Music 3 sulla CPU non dà errore:
 * parte, e finisce dopo ore. Da fuori si vede una barra che non si muove, e la
 * conclusione naturale è che l'app sia rotta. Non lo è: è la macchina che non
 * ha l'attrezzo giusto, e questo è l'unico posto in cui dirlo prima e non dopo.
 */
try {
  if (!(await macchina()).gpu) {
    el.avvisoCpu.innerHTML =
      "<b>Questo computer non ha una scheda video utilizzabile.</b> DaProdMusica " +
      "funziona lo stesso, ma un brano che con una scheda NVIDIA richiede " +
      "qualche minuto qui può richiedere <b>ore</b>. Puoi provare: lascialo " +
      "lavorare e non chiudere la suite.";
    el.avvisoCpu.hidden = false;
  }
} catch {
  // La suite non ha risposto: si tira dritto. Meglio non dire niente che dire
  // una cosa sbagliata su che computer sia questo.
}

await aggiornaLibreria();

await collega(
  (connesso) => {
    el.dot.classList.toggle("on", connesso);
    el.statusTxt.textContent = connesso ? "pronto" : "motore offline";
    // Riconnessi dopo un riavvio del motore: i lavori che seguivamo potrebbero
    // non esistere più.
    if (connesso) void riallinea();
  },
  messaggioDalMotore,
);

/**
 * I lavori chiesti da fuori: dal telefono, dalla console, da un agente.
 *
 * Poche righe, e sono tutte «metti questo lì»: la generazione è quella di
 * sempre, perché si preme lo stesso tasto che premeresti tu. Il perché sta in
 * `packages/ui/src/da-fuori.js`.
 */
collegaLavoriDaFuori(async (richiesta) => {
  scrivi(el.caption, richiesta.testo);
  /**
   * La lingua del canto, se chi ha chiesto l'ha detta.
   *
   * Dalla 0.7.7 arriva da fuori come le altre cose. Qui non e' un campo del
   * modulo ma una preferenza con delle pastiglie, quindi va messa a mano:
   * ACE-Step la riceve come impostazione vera, MiniMax se la trova aggiunta
   * alla descrizione — e chi ha chiesto non deve sapere quale dei due sta
   * usando.
   */
  if (richiesta.opzioni.lingua) scegliLingua(richiesta.opzioni.lingua);
  /**
   * Come si chiama il brano, se chi ha chiesto gliel'ha dato un nome.
   *
   * Nuovo nella 0.8.0, e mancava da sempre: la casella del titolo è la prima
   * cosa che si vede aprendo questa scheda, e da fuori non c'era modo di
   * riempirla. Il brano finiva in galleria chiamato come la prima riga del
   * ritornello — o, senza testo, come i generi.
   *
   * Vuoto si lascia vuoto **apposta**: `nuovaResa` ci mette il titolo ricavato
   * dal testo, che è quello che faceva prima e che per uno strumentale resta
   * l'unica cosa sensata.
   */
  if (richiesta.opzioni.titolo) scrivi(el.titolo, richiesta.opzioni.titolo);
  // Il testo da cantare è facoltativo: vuoto vuol dire strumentale, ed è
  // quello che dice anche il catalogo delle azioni.
  scrivi(el.lyrics, richiesta.opzioni.testo || "");
  if (richiesta.opzioni.secondi) {
    scrivi(el.duration, String(numero(richiesta.opzioni.secondi, 15, 300, 60)));
  }

  /**
   * I comandi che fino alla 0.8.2 si potevano toccare **solo dal computer**.
   *
   * Chiesto il 5 settembre 2026: «in produzione musica aggiungiamo tutti i
   * settaggi mancanti tipo bpm». Stanno sotto «Avanzati» e ci sono da sempre;
   * da fuori non arrivavano, quindi da un telefono si poteva chiedere una
   * canzone ma non *quella* canzone.
   *
   * ⚠ **Valgono per MiniMax Music 3.** ACE-Step non ha queste caselle
   * (`usaCampo` in grafi.js lo dice riga per riga): scriverle non rompe niente
   * e non cambia niente, e il catalogo delle azioni lo dichiara invece di far
   * credere il contrario. «Strumentale» invece vale per tutti e due.
   */
  if (richiesta.opzioni.bpm) {
    scrivi(el.bpm, String(numero(richiesta.opzioni.bpm, 40, 220, 120)));
  }
  if (richiesta.opzioni.tonalita) scegliInMenu(el.tonalita, richiesta.opzioni.tonalita);
  if (richiesta.opzioni.tempo) scegliInMenu(el.tempo, richiesta.opzioni.tempo);
  if (richiesta.opzioni.strumentale) spunta(el.instrumental, richiesta.opzioni.strumentale);
  // Qui il menu dei modelli si chiama «qualità», che è il nome che ha nella
  // pagina: gli id però sono gli stessi del catalogo delle azioni.
  if (scegliInMenu(el.qualita, richiesta.opzioni.modello)) await aspettaPremibile(el.go);
  premi(el.go, "DaProdMusica non è pronta a generare: apri la scheda e guarda cosa manca.");
});
