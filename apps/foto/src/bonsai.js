/**
 * Bonsai in DaProdFoto: da due parole a una descrizione che il modello capisce.
 *
 * I modelli di immagini non sono bravi a indovinare: «un gatto» dà un gatto
 * qualunque su uno sfondo qualunque. Quello che cambia il risultato è dire
 * **cosa** c'è nell'inquadratura, **che luce** ha, da **che distanza** lo
 * guardi e di **che materiale** sono le cose. È un mestiere, e scriverlo a mano
 * ogni volta è la ragione per cui si finisce a generare sempre la stessa foto.
 *
 * Due gesti, come in DaPMusica:
 * - **Allarga** prende quello che hai scritto e lo apre, restando dentro la tua
 *   idea: se hai scritto «un faro nella tempesta», resta un faro nella tempesta.
 * - **Proponi** parte da zero, per quando non si sa da dove cominciare.
 *
 * **Sempre in inglese.** Anima capisce solo quello (per questo esiste
 * l'interruttore della traduzione), e FLUX.2 l'inglese lo capisce comunque:
 * facendolo scrivere già in inglese, la traduzione non ha più niente da fare e
 * si toglie di mezzo un passaggio che poteva sbagliare.
 *
 * Il modello lo tiene acceso **LM Studio**, e la suite ci parla dal ponte comune
 * (`daprodSuite.llm`): lo stesso di DaPMusica, senza una riga in più nel main.
 */

import { el, mostraErrore } from "./dom.js";
// Il selettore del modello e' di tutte le app, non di questa: sta in
// `packages/ui` e la suite lo serve sotto `/comune/`, dalla stessa origine
// della pagina. Fino al 19 agosto 2026 ce n'erano due copie identiche, una
// qui e una nell'altra app.
import { collegaSelettoreLlm, modelloScelto } from "/comune/selettore-llm.js";

const suite = window.daprodSuite;

/**
 * Le istruzioni, scritte come si scrivono a un modello locale piccolo:
 * **dettagliate**, con dentro anche quello che non deve fare.
 *
 * Il divieto sulle scritte non è pedanteria: chiedere «un cartello con su
 * scritto BAR» a un modello di immagini produce lettere finte, ed è la cosa che
 * rovina un'immagine altrimenti buona.
 */
const SISTEMA = `Sei un direttore della fotografia che scrive prompt per un modello di immagini.

LA LINGUA:
- Scrivi SEMPRE in inglese, anche se ti parlano in italiano.

COM'È FATTA UNA BUONA DESCRIZIONE:
- Un paragrafo solo, da 30 a 60 parole, senza elenchi e senza titoli.
- Si comincia dal soggetto e da cosa sta facendo, poi il posto.
- Poi la luce (da dove viene, di che colore, che ora del giorno).
- Poi l'inquadratura (close-up, wide shot, from above) e l'obiettivo.
- Poi i materiali e le superfici: bagnato, arrugginito, di velluto, di vetro.

VIETATO:
- Scritte, lettere, numeri, marchi o loghi dentro l'immagine.
- Nomi di persone vere o di marche.
- Parole vuote come "beautiful", "amazing", "masterpiece", "4k", "8k".
- Cambiare il soggetto che ti viene dato: lo allarghi, non lo sostituisci.`;

/**
 * La forma della risposta, imposta a LM Studio.
 *
 * Non è una preghiera dentro il prompt: è uno schema che il server fa
 * rispettare, quindi la descrizione arriva sempre e arriva intera.
 */
const SCHEMA = {
  type: "object",
  properties: {
    descrizione: {
      type: "string",
      description: "in inglese: un paragrafo di 30-60 parole, senza scritte nell'immagine",
    },
  },
  required: ["descrizione"],
};

/** Vero se c'è qualcuno che risponde: senza, i bottoni restano spenti. */
async function disponibile() {
  const stato = await suite.llm.stato();
  return stato.acceso && stato.modelli.length > 0 ? null : stato.motivo;
}

function lavora(bottone, testo) {
  bottone.disabled = true;
  bottone.dataset.prima = bottone.dataset.prima || bottone.textContent;
  bottone.textContent = testo;
}

function finito(bottone) {
  bottone.disabled = false;
  bottone.textContent = bottone.dataset.prima;
}

/**
 * Il JSON del modello, o null.
 *
 * Un modello che ragiona a volte infila la risposta dentro altro testo: si
 * cerca la prima graffa e l'ultima invece di arrendersi al primo `JSON.parse`.
 */
function leggiJson(testo) {
  try {
    return JSON.parse(testo);
  } catch {
    const inizio = testo.indexOf("{");
    const fine = testo.lastIndexOf("}");
    if (inizio < 0 || fine <= inizio) return null;
    try {
      return JSON.parse(testo.slice(inizio, fine + 1));
    } catch {
      return null;
    }
  }
}

async function chiedi(bottone, utente, attesa) {
  const motivo = await disponibile();
  if (motivo) return mostraErrore(motivo);

  lavora(bottone, attesa);
  try {
    const esito = await suite.llm.chiedi({
      // Quello scelto nel selettore qui sopra: se ne hai messo uno piccolo per
      // avere una risposta subito, deve rispondere quello.
      modello: modelloScelto(),
      // Niente ragionamento: allargare una descrizione e' un lavoro corto, e
      // col pensiero acceso lo stesso modello ci mette decine di secondi
      // invece di uno. Per le canzoni, in DaPMusica, resta acceso.
      pensa: false,
      sistema: SISTEMA,
      utente,
      schema: SCHEMA,
      nomeSchema: "descrizione",
    });
    if (!esito.ok) return mostraErrore(esito.motivo || "Il modello non ha risposto.");

    const dati = leggiJson(esito.testo);
    const descrizione = String(dati?.descrizione || "").trim();
    if (!descrizione) {
      return mostraErrore("Il modello ha risposto in un modo che non riesco a leggere.");
    }
    el.prompt.value = descrizione;
    // La traduzione non ha più niente da fare: quello che c'è nella casella è
    // già inglese, e lasciare in giro la riga di prima confonderebbe.
    if (el.tradotto) el.tradotto.hidden = true;
  } catch (e) {
    mostraErrore(String(e.message || e));
  } finally {
    finito(bottone);
  }
}

export function collegaBonsaiFoto() {
  collegaSelettoreLlm(el.selettoreLlm);

  el.bonsaiAllarga.onclick = () => {
    const idea = el.prompt.value.trim();
    if (!idea) return mostraErrore("Scrivi prima cosa vuoi vedere, anche in due parole.");
    void chiedi(
      el.bonsaiAllarga,
      `Allarga questa idea in una descrizione per un modello di immagini. ` +
        `Resta dentro l'idea, non cambiarla:\n\n"${idea}"`,
      "sto scrivendo…",
    );
  };

  el.bonsaiIdea.onclick = () => {
    // L'estetica scelta entra nella richiesta: proporre una scena qualunque
    // quando l'utente ha già detto "anime" sarebbe proporre la scena sbagliata.
    const estetica = el.estetica?.value || "";
    void chiedi(
      el.bonsaiIdea,
      `Proponi una scena da fotografare o dipingere, una sola, concreta e ` +
        `inaspettata.${estetica ? ` Deve stare bene con questa estetica: ${estetica}.` : ""}`,
      "ci penso…",
    );
  };

  // Se LM Studio non c'è i bottoni restano, ma la riga dice perché: toglierli
  // vorrebbe dire lasciare l'utente a chiedersi dove sia finita quella cosa.
  void disponibile().then((motivo) => {
    el.bonsaiStato.textContent = motivo || "Pronto: qualunque modello di LM Studio va bene.";
    el.bonsaiStato.classList.toggle("guasto", Boolean(motivo));
  });
}
