/**
 * Le prove della macchinetta: la seconda slot, quella delle figurine.
 *
 * ⚠ **Le probabilita' si provano col dado in mano, non girando diecimila
 * volte.** Tutte le funzioni che pescano prendono il caso da fuori (vedi `Caso`
 * in `regole.ts`) proprio per questo: con un dado truccato si verifica che il
 * superbonus paghi **quando esce**, invece di sperare che esca.
 *
 * ⚠ **Dall'11 settembre 2026 un giro sono due tiri.** «L'utente paga, gira 2
 * volte: la prima si riempie lo schermo e puo' decidere di bloccare alcuni
 * item, quindi rigira.» Le prove seguono il giro com'e': `tira`, poi `rigira`
 * con i posti tenuti.
 *
 * Come si legge un dado di queste prove: nel mazzo ci sono prima le figurine
 * del pacchetto (tre Rare da 1.400 di peso, in queste prove) e poi le cinquanta
 * della casa (Basic, 3.997 l'una). Un numero sotto a 0,0068 pesca la prima vera,
 * fra 0,0069 e 0,0137 la seconda, fra 0,0138 e 0,0205 la terza; fra 0,0206 e
 * 0,0401 la prima della casa.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-macchinetta.mjs
 */

import {
  CASA,
  CASELLE,
  creaPacchetto,
  Deposito,
  DUE_FILE_VALGONO,
  facciaDi,
  FILE,
  mazzoMacchinetta,
  NienteDaFare,
  PER_FILA,
  percheSpenta,
  PRIMO_TIRO,
  PUNTATE,
  quantoPagaIlPieno,
  quantoPagaUnaFila,
  rigiraLaMacchinetta,
  SECONDO_TIRO,
  suonoDi,
  tiraLaMacchinetta,
  TUTTO_UGUALE_VALE,
} from "../dist/index.js";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/** Una figurina presa, con un allegato: un'immagine se non si dice altro. */
function conFaccia(d, id, prezzo, mime = "image/png") {
  const c = {
    id,
    tipo: "prompt",
    titolo: "Finta " + id,
    impronta: "imp-" + id,
    daChi: "pino",
    quando: 1,
    stato: "presa",
    numero: d.collezionabili().length + 1,
    prezzo,
    allegati: [{ id: "f-" + id, mime, url: "/libreria/file/" + id }],
  };
  d.collezionabili().push(c);
  return c;
}

/** Un deposito con un pacchetto chiuso dentro, e le lire per giocare. */
function conUnPacchetto(d, quante, prezzo = 600) {
  for (let i = 0; i < quante; i++) conFaccia(d, "c" + i, prezzo);
  creaPacchetto(d, "capo");
  d.muovi("pino", 1_000_000);
  return d;
}

const righe = (caselle) =>
  Array.from({ length: FILE }, (_, r) => caselle.slice(r * PER_FILA, (r + 1) * PER_FILA));
const piena = (f) => f.every((c) => c.id === f[0].id);

/** I posti di una coppia dentro una fila, se c'e': quelli che si tengono. */
function laCoppia(caselle, riga) {
  const f = caselle.slice(riga * PER_FILA, (riga + 1) * PER_FILA);
  for (let a = 0; a < PER_FILA; a++) {
    for (let b = a + 1; b < PER_FILA; b++) {
      if (f[a].id === f[b].id) return [riga * PER_FILA + a, riga * PER_FILA + b];
    }
  }
  return [];
}

/* ---------------------------------------------------------------- il mazzo */

/**
 * ⚠ **Sui rulli tutte le figurine dei pacchetti, anche senza foto.** Fino all'11
 * settembre 2026 giravano solo quelle con un'immagine, e nel file vero erano
 * undici su quarantacinque: «vedo solo immagini di cammo o tabletcammo». Adesso
 * girano tutte, con la faccia disegnata dalla pagina quando non c'e' una foto,
 * e con loro le cinquanta della casa.
 */
prova("sui rulli tutte le figurine dei pacchetti, anche senza foto, e la casa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conFaccia(d, "foto", 600);
    d.collezionabili().push({
      id: "solotesto", tipo: "prompt", titolo: "Solo parole", impronta: "i2",
      daChi: "pino", quando: 1, stato: "presa", numero: 2, prezzo: 600,
    });
    const brano = conFaccia(d, "brano", 600, "audio/mpeg");
    uguale(facciaDi(brano), null, "un mp3 da solo non e' una foto");
    vero(suonoDi(brano) !== null, "ma e' un brano: la sua copertina la sa la libreria");

    uguale(mazzoMacchinetta(d, "pino").length, 0, "finche' non c'e' un pacchetto, niente rulli");
    creaPacchetto(d, "capo");
    const vere = mazzoMacchinetta(d, "pino").filter((s) => !s.casa).map((s) => s.id).sort();
    uguale(vere, ["brano", "foto", "solotesto"], "girano tutte e tre, anche senza foto");
    uguale(mazzoMacchinetta(d, "pino").filter((s) => s.casa).length, CASA.length,
      "e le cinquanta della casa");

    // Quello che arriva dopo aspetta il prossimo pacchetto.
    conFaccia(d, "nuova", 600);
    uguale(mazzoMacchinetta(d, "pino").filter((s) => !s.casa).length, 3,
      "una presa dopo non entra da sola");
  }),
);

prova("senza pacchetti non si tira, e c'e' scritto perche'", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 100_000);
    vero(percheSpenta(d, 0).length > 0, "spenta, e con un perche' scritto");
    let fermato = true;
    try {
      tiraLaMacchinetta(d, "pino", 100, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "e il giro non parte");
  }),
);

prova("la macchina ha tre file da tre", () => {
  uguale([FILE, PER_FILA, CASELLE], [3, 3, 9]);
});

/* ----------------------------------------------------------- i due tiri */

/**
 * ⚠ **Si paga una volta, al primo tiro.** Il secondo e' gia' pagato, e finche'
 * non si fa il giro resta aperto: un altro primo tiro non parte.
 */
prova("un giro sono due tiri, e si paga una volta", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 4);
    uguale([...PUNTATE], [50, 100, 200], "sono quelle che ha detto lui");

    let fermato = true;
    try {
      tiraLaMacchinetta(d, "pino", 1, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "una lira non e' una puntata");

    let senzaGiro = true;
    try {
      rigiraLaMacchinetta(d, "pino", [], Math.random);
      senzaGiro = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(senzaGiro, "il secondo tiro senza il primo non esiste");

    const prima = d.conto("pino").saldo;
    const primo = tiraLaMacchinetta(d, "pino", 50, Math.random);
    uguale(primo.caselle.length, CASELLE, "nove caselle");
    uguale(primo.saldo, prima - 50, "la puntata si paga al primo tiro");

    let doppio = true;
    try {
      tiraLaMacchinetta(d, "pino", 50, Math.random);
      doppio = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(doppio, "col giro aperto non se ne apre un altro");

    // Un dado alto: nessuna fila si completa.
    const esito = rigiraLaMacchinetta(d, "pino", [], dado(0.99));
    uguale(esito.vinto, 0);
    uguale(esito.saldo, prima - 50, "il secondo tiro non si paga");
    uguale(d.conto("pino").giroAperto, undefined, "e il giro si chiude");
  }),
);

/**
 * ⚠ **Il primo tiro non paga, e non fa mai una fila intera.** Una fila fatta a
 * meta' giro sarebbe un premio regalato prima di giocare.
 */
prova("il primo tiro non fa mai una fila", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3);
    for (let i = 0; i < 300; i++) {
      const primo = tiraLaMacchinetta(d, "pino", 50, Math.random);
      vero(!righe(primo.caselle).some(piena), "al primo tiro una fila intera non c'e'");
      rigiraLaMacchinetta(d, "pino", [], Math.random);
    }
  }),
);

/**
 * ⚠ **Le tenute restano, le altre cambiano.** Anche se non se ne tiene
 * nessuna: «se l'utente non seleziona nulla viene comunque aggiornata la
 * tabella».
 */
prova("il secondo tiro tiene quelle tenute", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3);
    for (let i = 0; i < 50; i++) {
      const primo = tiraLaMacchinetta(d, "pino", 50, Math.random);
      const tenute = [0, 4, 8];
      const esito = rigiraLaMacchinetta(d, "pino", tenute, Math.random);
      for (const t of tenute) uguale(esito.caselle[t].id, primo.caselle[t].id, "la casella " + t);
      uguale(esito.tenute, tenute);
    }
  }),
);

/**
 * ⚠ **Un giro a meta' sopravvive a una riapertura.** Fra i due tiri la pagina
 * si puo' chiudere, e la suite spegnere: il giro sta nel file, gia' pagato.
 */
prova("il giro a meta' si ritrova riaprendo", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3);
    const primo = tiraLaMacchinetta(d, "pino", 100, Math.random);
    d.scriviOra();
    const riaperto = new Deposito(file);
    uguale(riaperto.conto("pino").giroAperto.caselle, primo.caselle.map((s) => s.id));
    const esito = rigiraLaMacchinetta(riaperto, "pino", [0], Math.random);
    uguale(esito.puntata, 100, "e si chiude con la puntata di prima");
  }),
);

/* ------------------------------------------------------------- le vincite */

/**
 * ⚠ **Quello che si vede e quello che si prende vengono dallo stesso posto.**
 * Si gioca bene — si tengono le coppie — e giro per giro le file pagate sono
 * esattamente quelle piene sullo schermo, e il conto torna.
 */
prova("le caselle dicono quello che dice il conto, sempre", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 6);
    d.muovi("pino", 10_000_000);
    for (let i = 0; i < 600; i++) {
      const primo = tiraLaMacchinetta(d, "pino", 50, Math.random);
      const tenute = [0, 1, 2].flatMap((r) => laCoppia(primo.caselle, r));
      const e = rigiraLaMacchinetta(d, "pino", tenute, Math.random);
      const piene = righe(e.caselle).map(piena);
      uguale(e.file.map((f) => f.riga), piene.map((p, r) => (p ? r : -1)).filter((r) => r >= 0),
        "le file pagate sono proprio quelle che si vedono");
      uguale(e.pieno, piene.every(Boolean), "«tre file» vuol dire tutte e tre piene");
      if (!e.pieno) {
        const somma = e.file.reduce((s, f) => s + f.lire, 0);
        uguale(e.vinto, somma * (e.file.length === 2 ? DUE_FILE_VALGONO : 1),
          "una fila il suo premio, due il doppio");
      }
    }
  }),
);

/**
 * ⚠ **Una coppia tenuta si completa con la frequenza scritta**, e non la
 * regala: col dado basso si completa, col dado alto no.
 *
 * Il primo tiro col dado a un decimo mette in ogni fila una coppia della prima
 * figurina, con la terza casella diversa al primo posto.
 */
prova("una coppia tenuta: col dado basso fa fila, col dado alto no", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3);

    const primo = tiraLaMacchinetta(d, "pino", 100, dado(0.1, 0.001, 0.001, 0.1));
    const coppia = laCoppia(primo.caselle, 0);
    uguale(coppia.length, 2, "nella prima fila c'e' una coppia");
    const e = rigiraLaMacchinetta(d, "pino", coppia, dado(0.1));
    uguale(e.file.map((f) => f.riga), [0], "si completa la fila tenuta, e solo quella");
    uguale(e.vinto, 100 * quantoPagaUnaFila(e.file[0].simbolo.grado));

    const ancora = tiraLaMacchinetta(d, "pino", 100, dado(0.1, 0.001, 0.001, 0.1));
    const niente = rigiraLaMacchinetta(d, "pino", laCoppia(ancora.caselle, 0), dado(0.99));
    uguale(niente.file.length, 0, "col dado alto la coppia resta coppia");
    vero(SECONDO_TIRO.manca1 < 50, "tenere una coppia aiuta, ma non regala");
  }),
);

prova("due file pagano il doppio", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3);
    const primo = tiraLaMacchinetta(d, "pino", 100, dado(0.1, 0.001, 0.001, 0.1));
    const tenute = [...laCoppia(primo.caselle, 0), ...laCoppia(primo.caselle, 1)];
    const e = rigiraLaMacchinetta(d, "pino", tenute, dado(0.1));
    uguale(e.file.map((f) => f.riga), [0, 1]);
    uguale(e.pieno, false);
    const somma = e.file.reduce((s, f) => s + f.lire, 0);
    uguale(e.vinto, somma * DUE_FILE_VALGONO, "«2 righe ancora piu' bonus»");
  }),
);

/**
 * ⚠ **Tre file: il superbonus, e le figurine delle file si sbloccano.** Tre
 * figurine diverse, una per fila: tutte e tre entrano in collezione.
 */
prova("tre file pagano il superbonus e sbloccano le figurine", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3, 600);
    // Una coppia per fila, di tre figurine diverse: la prima, la seconda, la terza.
    const primo = tiraLaMacchinetta(d, "pino", 100, dado(
      0.1, 0.001, 0.001, 0.1,
      0.1, 0.008, 0.001, 0.1,
      0.1, 0.015, 0.001, 0.1,
    ));
    const tenute = [0, 1, 2].flatMap((r) => laCoppia(primo.caselle, r));
    uguale(tenute.length, 6, "tre coppie da tenere");
    const e = rigiraLaMacchinetta(d, "pino", tenute, dado(0.1));
    uguale(e.pieno, true, "tre file");
    uguale(e.tuttoUguale, false, "ma non tutte uguali");
    uguale(e.sbloccate.map((s) => s.simbolo.id).sort(), ["c0", "c1", "c2"]);
    vero(e.sbloccate.every((s) => s.nuova), "nuove, per chi non le aveva");
    for (const id of ["c0", "c1", "c2"]) vero(d.conto("pino").collezione.includes(id), id);
    uguale(e.vinto, 100 * quantoPagaIlPieno("rare"), "il superbonus del grado piu' alto");

    // La seconda volta sono doppioni: pagano il loro prezzo, come nei pacchetti.
    const ancora = tiraLaMacchinetta(d, "pino", 100, dado(
      0.1, 0.001, 0.001, 0.1,
      0.1, 0.008, 0.001, 0.1,
      0.1, 0.015, 0.001, 0.1,
    ));
    const di = rigiraLaMacchinetta(d, "pino", [0, 1, 2].flatMap((r) => laCoppia(ancora.caselle, r)),
      dado(0.1));
    uguale(di.vinto, 100 * quantoPagaIlPieno("rare") + 3 * 600, "e i doppioni pagano");
  }),
);

/**
 * ⚠ **Tutto lo schermo uguale: il superbonus doppio, e lo sblocco.** Qui con
 * una figurina della casa: lo sblocco e' una copia in piu', che la fa nascere.
 */
prova("tutto uguale paga il superbonus doppio, e una della casa nasce", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 3);
    const primo = tiraLaMacchinetta(d, "pino", 100, dado(0.1, 0.03, 0.001, 0.1));
    const tenute = [0, 1, 2].flatMap((r) => laCoppia(primo.caselle, r));
    const e = rigiraLaMacchinetta(d, "pino", tenute, dado(0.1));
    uguale(e.tuttoUguale, true);
    uguale(e.caselle[0].id, "casa-01", "nove volte la prima della casa");
    uguale(e.vinto, 100 * quantoPagaIlPieno("basic") * TUTTO_UGUALE_VALE);
    uguale(e.sbloccate.length, 1);
    uguale(e.sbloccate[0].copia.copie, 1, "la prima copia");
    uguale(d.conto("pino").copie["casa-01"], 1);
  }),
);

/* ----------------------------------------------------------- le frequenze */

prova("le frequenze sono scelte, e scritte", () => {
  vero(PRIMO_TIRO.coppia > 10 && PRIMO_TIRO.coppia < 50, "una coppia ogni tanto, non sempre");
  vero(SECONDO_TIRO.manca1 > SECONDO_TIRO.manca2, "piu' ne tieni, piu' si completa");
  vero(SECONDO_TIRO.manca2 > SECONDO_TIRO.manca3);
  vero(SECONDO_TIRO.manca3 > 0, "anche senza tenere niente si puo' vincere");
});

/**
 * ⚠ **Si vince di rado, e la macchinetta porta via piu' di quanto da'.**
 * Giocando bene — tenendo le coppie — un giro paga qualcosa poco meno di una
 * volta su cinque, e mille giri lasciano il conto piu' magro. Se rendesse, in
 * una serata sparirebbe il motivo di inventare combinazioni.
 */
prova("giocando bene si vince di rado, e tirando tanto si perde", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 8, 600);
    d.muovi("pino", 10_000_000);
    const prima = d.conto("pino").saldo;
    let vinti = 0;
    const giri = 2000;
    for (let i = 0; i < giri; i++) {
      const primo = tiraLaMacchinetta(d, "pino", 100, Math.random);
      const tenute = [0, 1, 2].flatMap((r) => laCoppia(primo.caselle, r));
      if (rigiraLaMacchinetta(d, "pino", tenute, Math.random).vinto > 0) vinti++;
    }
    const quota = vinti / giri;
    vero(quota > 0.08 && quota < 0.3, "pagano " + Math.round(quota * 100) + " giri su cento");
    vero(d.conto("pino").saldo < prima, "duemila giri devono lasciare il conto piu' magro");
  }),
);

process.exit(tirandoLeSomme("la macchinetta"));
