/**
 * Le prove della fila: mandare una combinazione, prenderla, buttarla, e i
 * pacchetti.
 *
 * E' il pezzo per cui esiste tutto il resto — uno gioca, monta una riga, la
 * manda; l'admin la prova, le da' un prezzo e la tiene, o la butta. Vedi
 * `CONCETTI.md` §§ 8, 9 e 10.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-fila.mjs
 */

import {
  apriPacchetto,
  butta,
  classifica,
  Deposito,
  manda,
  NienteDaFare,
  prendi,
  serieChiuse,
  statoMagazzino,
  tira,
} from "../dist/index.js";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/** Un deposito con dentro uno che gioca ricco, e un giro gia' fatto. */
function tavolino(file) {
  const d = new Deposito(file);
  d.muovi("pino", 1000000);
  const giro = tira(d, "pino", "musica", "sempre", [], Math.random);
  return { d, giro, pezzi: giro.pezzi.map((p) => p.id) };
}

/**
 * Riempie il magazzino di combinazioni finte, gia' prese.
 *
 * Si scrivono dentro il deposito a mano invece di passare da `manda` e
 * `prendi`: qui si sta provando **i pacchetti**, e far girare la slot cento
 * volte per averne cento renderebbe la prova lenta e la farebbe cadere per
 * ragioni che coi pacchetti non c'entrano niente.
 */
function riempi(d, quante, prezzo) {
  const gia = d.collezionabili().length;
  for (let i = 0; i < quante; i++) {
    d.collezionabili().push({
      id: "finta_" + (gia + i),
      tavolo: "musica",
      pezzi: ["genere/finto-" + (gia + i)],
      impronta: "finta-" + (gia + i),
      prompt: "prompt finto " + (gia + i),
      titolo: "Finta " + (gia + i),
      daChi: "pino",
      quando: Date.now(),
      stato: "presa",
      numero: gia + i + 1,
      prezzo: typeof prezzo === "number" ? prezzo : 10,
    });
  }
}

/* --------------------------------------------------------------- mandare */

prova("una combinazione mandata sta in attesa, e non costa niente", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const prima = t.d.conto("pino").saldo;
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    uguale(c.stato, "in-attesa");
    uguale(c.daChi, "pino");
    uguale(t.d.conto("pino").saldo, prima, "mandare non deve costare");
    uguale(t.d.conto("pino").mandate, 1);
    vero(c.titolo.length > 0, "la figurina ha un titolo: i nomi dei pezzi");
    vero(c.prompt.length > 0, "e un prompt vero da dare al modello");
  }),
);

prova("la stessa combinazione non entra due volte, e lo dice subito", () =>
  conCartella((file) => {
    const t = tavolino(file);
    manda(t.d, "pino", "musica", "sempre", t.pezzi);
    let detto = "";
    try {
      // Anche da un'altra persona: l'identita' sono i pezzi, non chi la manda.
      manda(t.d, "gino", "musica", "sempre", t.pezzi);
    } catch (errore) {
      detto = errore.message;
      vero(errore instanceof NienteDaFare);
    }
    vero(detto.length > 0, "doveva rifiutare");
    vero(detto.indexOf("gia") >= 0, "e doveva dire che c'e' gia', non un codice");
    uguale(t.d.collezionabili().length, 1);
  }),
);

prova("i pezzi fuori posto non passano", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const storti = t.pezzi.slice();
    const primo = storti[0];
    storti[0] = storti[1];
    storti[1] = primo;
    let fermato = true;
    try {
      manda(t.d, "pino", "musica", "sempre", storti);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "un genere nella casella della voce non e' una combinazione");
  }),
);

prova("mezza combinazione non e' una combinazione", () =>
  conCartella((file) => {
    const t = tavolino(file);
    let fermato = true;
    try {
      manda(t.d, "pino", "musica", "sempre", t.pezzi.slice(0, 3));
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "doveva rifiutare");
  }),
);

/* ------------------------------------------------------ prendere e buttare */

prova("prendere: paga chi l'ha mandata, e gliela mette in collezione", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    const prima = t.d.conto("pino").saldo;
    const presa = prendi(t.d, "cammo", c.id, 300);
    uguale(presa.stato, "presa");
    uguale(presa.prezzo, 300);
    uguale(presa.numero, 1, "il primo posto in magazzino e' l'uno");
    uguale(presa.daAdmin, "cammo");
    uguale(t.d.conto("pino").saldo, prima + 300, "chi l'ha mandata viene pagato");
    uguale(t.d.conto("pino").prese, 1);
    vero(t.d.conto("pino").collezione.indexOf(c.id) >= 0, "chi l'ha inventata ce l'ha");
    uguale(t.d.magazzino().length, 1);
  }),
);

prova("su una gia' decisa non si decide due volte", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    prendi(t.d, "cammo", c.id, 100);
    let fermato = true;
    try {
      prendi(t.d, "cammo", c.id, 5000);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "non si puo' ripagare la stessa combinazione");
    uguale(t.d.conto("pino").prese, 1, "e non si conta due volte");
  }),
);

prova("buttarla: il motivo c'e' sempre, anche se non lo scrivi", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    const b = butta(t.d, "cammo", c.id, "   ");
    uguale(b.stato, "buttata");
    vero(b.motivo.length > 0, "un no senza perche' non insegna niente");
    uguale(t.d.magazzino().length, 0);
    uguale(t.d.conto("pino").prese, 0, "una buttata non si conta");
  }),
);

prova("una buttata non si puo' rimandare uguale", () =>
  conCartella((file) => {
    const t = tavolino(file);
    const c = manda(t.d, "pino", "musica", "sempre", t.pezzi);
    butta(t.d, "cammo", c.id, "non mi piace");
    let fermato = true;
    try {
      manda(t.d, "pino", "musica", "sempre", t.pezzi);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "se no la stessa riga rifiutata torna ogni giorno");
  }),
);

/* ------------------------------------------------------------ i pacchetti */

prova("una serie si compra solo quando e' chiusa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 10, perPacchetto: 3, costoPacchetto: 100 });
    d.muovi("pino", 100000);
    riempi(d, 9);
    uguale(serieChiuse(d), 0, "nove su dieci non chiudono niente");
    let fermato = true;
    try {
      apriPacchetto(d, "pino", 1, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "non si compra una serie aperta");

    riempi(d, 1);
    uguale(serieChiuse(d), 1, "col decimo la serie si chiude");
  }),
);

prova("il pacchetto costa, da' le figurine, e i doppioni pagano", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 2, perPacchetto: 3, costoPacchetto: 100 });
    d.muovi("pino", 100000);
    riempi(d, 2, 40);
    uguale(serieChiuse(d), 1);

    const prima = d.conto("pino").saldo;
    // Con due sole figurine e tre pescate, almeno un doppione ci deve essere.
    const pacco = apriPacchetto(d, "pino", 1, Math.random);
    uguale(pacco.figurine.length, 3);
    uguale(pacco.costo, 100);
    vero(pacco.figurine.some((f) => f.doppione), "tre pescate su due figurine: un doppione ci vuole");
    vero(pacco.vinto > 0, "il doppione deve pagare invece di deludere");
    uguale(pacco.saldo, prima - 100 + pacco.vinto);
    uguale(d.conto("pino").collezione.length, 2, "le figurine diverse sono due");
  }),
);

prova("senza lire non si comprano pacchetti", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 1, costoPacchetto: 500 });
    riempi(d, 1);
    d.muovi("spiantato", -99999);
    let fermato = true;
    try {
      apriPacchetto(d, "spiantato", 1, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "doveva rifiutare");
  }),
);

prova("girando ogni tanto cade una figurina, e mai un doppione", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // «una ogni 1» col dado a zero: cade sempre, finche' ce n'e' una nuova.
    d.cambiaImpostazioni({ unaOgniGiri: 1 });
    d.muovi("pino", 100000);
    riempi(d, 2, 10);

    const visti = new Set();
    for (let i = 0; i < 6; i++) {
      const giro = tira(d, "pino", "musica", "sempre", [], dado(0));
      if (giro.regalo) visti.add(giro.regalo.id);
    }
    uguale(visti.size, 2, "le due del magazzino, una volta ciascuna");
    uguale(d.conto("pino").collezione.length, 2, "e nessun doppione regalato");
  }),
);

prova("il magazzino sa dire a che punto sta", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.cambiaImpostazioni({ perSerie: 10 });
    riempi(d, 12);
    const stato = statoMagazzino(d);
    uguale(stato.prese, 12);
    uguale(stato.serieChiuse, 1);
    uguale(stato.allaProssimaSerie, 8, "ne mancano otto alla seconda serie");
  }),
);

/* ------------------------------------------------------------ classifica */

prova("davanti sta chi si e' fatto prendere le combinazioni", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("riccone", 500000);
    d.segnaGiro("riccone", 9000);
    d.conto("artista").prese = 2;
    const c = classifica(d);
    uguale(c[0].chi, "artista", "due prese battono un colpo grosso e un conto pieno");
  }),
);

process.exit(tirandoLeSomme("la fila e i pacchetti"));
