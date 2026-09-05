/**
 * Un video da trenta secondi, o da un minuto. **Incatenando i pezzi.**
 *
 * ## Il problema, in due righe
 *
 * Chiesto il 5 settembre 2026: «facciamo video di 30 secondi e 1 minuto
 * coerenti, mostrando sempre le stesse identiche cose».
 *
 * Nessun modello che sta in 8 GB fa un minuto in un colpo. **Venti secondi è il
 * tetto di LTX 2.5**, e non è un numero scelto da noi: è quello che Lightricks
 * dichiara per la 2.5, ed è dove si ferma la testa che indovina la durata. Sopra
 * quel tetto non c'è niente da spingere: c'è da cambiare strada.
 *
 * ## La strada: l'ultimo fotogramma diventa il primo
 *
 * LTX 2.5 sa partire da **un primo e un ultimo fotogramma** (`LTXVAddGuide` in
 * `grafi.js`). Quindi:
 *
 * 1. si genera il primo pezzo dal testo;
 * 2. gli si prende l'**ultimo fotogramma** (`/daprod/ultimo-fotogramma` nel
 *    motore, che è dove sta FFmpeg);
 * 3. quel fotogramma diventa il **primo** del pezzo dopo;
 * 4. alla fine si cuce tutto con `/daprod/cuci`.
 *
 * **Il taglio non si vede perché non c'è un taglio**: il fotogramma con cui
 * finisce un pezzo è lo stesso con cui comincia il prossimo. È la differenza
 * fra questa cosa e la scheda Storia, che monta scene diverse con gli stacchi
 * in mezzo — là il taglio è voluto, qui è quello che si sta evitando.
 *
 * ## Le tre decisioni che contano
 *
 * **Pezzi da otto secondi, non da venti.** Il tetto è venti, ma un pezzo lungo
 * deriva di più: più fotogrammi il modello genera di seguito, più il soggetto
 * si allontana da com'era. Otto secondi sono il compromesso — abbastanza da non
 * fare otto giunture in un minuto, abbastanza pochi da restare aderenti al
 * fotogramma di partenza.
 *
 * **Il prompt resta lo stesso, per tutti i pezzi.** La tentazione sarebbe far
 * scrivere a un modello un prompt diverso per ogni pezzo — «e poi la barca
 * gira», «e poi si allontana». È esattamente il modo di ottenere una cosa
 * diversa a ogni pezzo, che è il contrario di quello che è stato chiesto:
 * «mostrando sempre le stesse identiche cose». La coerenza la porta il
 * fotogramma, non le parole.
 *
 * **I pezzi non finiscono in galleria.** Vanno in una sottocartella `pezzi/`,
 * che la libreria salta apposta (vedi `CARTELLA_PEZZI` in `libreria.ts`). Non è
 * per pulizia: chi chiede un video da un minuto da fuori riceve **il primo file
 * nuovo** che compare, e senza quella cartella riceverebbe il primo pezzo da
 * otto secondi mentre il film vero arriva dieci minuti dopo, a nessuno.
 *
 * ## ⚠ Cosa non è stato provato
 *
 * Questo file è scritto e compilato, e il giro l'ha fatto **nessuno**: qui non
 * c'è una scheda video. Il pezzo che ha più probabilità di essere sbagliato è
 * il nome con cui il motore ritorna il file cucito.
 */

import { PREFISSO_PEZZI, grafoClip } from "./grafi.js";
import * as ponte from "./ponte.js";

/**
 * Quanto dura un pezzo, al massimo.
 *
 * Otto e non venti: vedi l'intestazione. Se il modello scelto non arriva a
 * otto (non capita oggi, ma capiterà) si usa il suo tetto.
 */
const PEZZO_SECONDI = 8;

/** Oltre questo, un video si fa a pezzi. È il tetto di una generazione sola. */
export const TUTTO_INTERO = 20;

/** Vero se questa durata vuole la catena invece di una generazione sola. */
export const vuoleLaCatena = (secondi) => Number(secondi) > TUTTO_INTERO;

/**
 * Genera un video lungo e torna il nome del file cucito.
 *
 * `racconta(testo, fatti, quanti)` serve a far vedere a che punto è: un minuto
 * di video sono sette pezzi e parecchi minuti, e una barra ferma è
 * indistinguibile da un programma piantato.
 *
 * Solleva con il motivo scritto per una persona: quel testo arriva fino al
 * telefono di chi aveva chiesto.
 */
export async function videoLungo(m, parametri, racconta = () => {}) {
  if (m.ingressi !== "fotogrammi") {
    throw new Error(
      `${m.nome} non sa partire da un fotogramma: per i video lunghi serve LTX 2.5.`,
    );
  }

  const totale = Math.max(TUTTO_INTERO + 1, Number(parametri.secondi) || 30);
  const perPezzo = Math.min(PEZZO_SECONDI, m.durata?.max ?? PEZZO_SECONDI);
  const quanti = Math.ceil(totale / perPezzo);

  /**
   * Un nome per questa catena, e serve.
   *
   * Due video lunghi chiesti nella stessa serata scrivono i loro pezzi nella
   * stessa cartella: senza un nome diverso, la cucitura del secondo si
   * porterebbe dentro i pezzi del primo.
   */
  const catena = `c${Date.now().toString(36)}`;
  const fatti = [];
  let primoFotogramma = parametri.primoFotogramma;

  for (let i = 0; i < quanti; i++) {
    racconta(`pezzo ${i + 1} di ${quanti}…`, i, quanti);

    const suo = {
      ...parametri,
      secondi: perPezzo,
      // Il primo pezzo parte da quello che c'era (di solito niente); tutti gli
      // altri partono da dove è finito quello prima.
      primoFotogramma,
      // **L'ultimo fotogramma si lascia libero.** Dirgli anche dove finire
      // vorrebbe dire chiedergli di tornare in un punto deciso, e il risultato
      // è un movimento che si riavvolge. Qui serve che vada avanti.
      ultimoFotogramma: undefined,
      // Ogni pezzo il suo seme: con lo stesso, otto pezzi identici.
      seed: (Number(parametri.seed) || 0) + i * 7919,
      // Nella cartella che la libreria non guarda.
      dove: `${PREFISSO_PEZZI}/${catena}/p`,
    };

    const id = await ponte.invia(grafoClip(m, suo));
    const file = await aspetta(id, i, quanti, racconta);
    fatti.push(file);

    // L'ultimo pezzo non ha un dopo: risparmiarsi il fotogramma è un giro di
    // FFmpeg in meno, e soprattutto è una cosa in meno che può fallire proprio
    // alla fine.
    if (i < quanti - 1) {
      racconta(`prendo l'ultimo fotogramma del pezzo ${i + 1}…`, i + 1, quanti);
      primoFotogramma = await ultimoFotogramma(file);
    }
  }

  racconta("cucio i pezzi…", quanti, quanti);
  const nome = `video/daprodcinema/lungo_${catena}.mp4`;
  const esito = await ponte.cuci(fatti, nome);
  if (!esito?.ok) {
    throw new Error(esito?.motivo || "Non sono riuscito a cucire i pezzi.");
  }
  return esito.file || nome;
}

/**
 * Aspetta che un pezzo esca, e torna il suo percorso.
 *
 * Lo stesso giro della Storia: si chiede al motore ogni due secondi, e se il
 * lavoro sparisce dalla coda senza aver prodotto niente si smette invece di
 * aspettare per sempre.
 */
async function aspetta(id, indice, quanti, racconta) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 2000));

    const uscite = await ponte.risultati(id);
    const prodotti = Object.values(uscite).flatMap((o) => o.images ?? o.video ?? []);
    if (prodotti.length) {
      const f = prodotti[0];
      return f.subfolder ? `${f.subfolder}/${f.filename}` : f.filename;
    }

    const vivi = await ponte.lavoriVivi();
    if (!vivi.has(id)) {
      throw new Error(`Il pezzo ${indice + 1} di ${quanti} non ha prodotto niente.`);
    }
    racconta(`pezzo ${indice + 1} di ${quanti}…`, indice, quanti);
  }
}

/** Chiede al motore l'ultimo fotogramma di una clip, e torna dove l'ha messo. */
async function ultimoFotogramma(clip) {
  const esito = await ponte.ultimoFotogramma(clip);
  if (!esito?.ok || !esito.file) {
    throw new Error(
      esito?.motivo || "Non sono riuscito a prendere l'ultimo fotogramma del pezzo.",
    );
  }
  return esito.file;
}
