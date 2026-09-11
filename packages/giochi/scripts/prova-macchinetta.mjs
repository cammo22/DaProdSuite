/**
 * Le prove della macchinetta: la seconda slot, quella delle figurine.
 *
 * ⚠ **Le probabilita' si provano col dado in mano, non girando diecimila
 * volte.** Tutte le funzioni che pescano prendono il caso da fuori (vedi
 * `Caso` in `regole.ts`) proprio per questo: con un dado truccato si verifica
 * che il colpo grosso paghi **quando esce**, invece di sperare che esca.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-macchinetta.mjs
 */

import {
  CASELLE,
  creaPacchetto,
  Deposito,
  facciaDi,
  FILE,
  giraLaMacchinetta,
  mazzoMacchinetta,
  NienteDaFare,
  PER_FILA,
  percheSpenta,
  PUNTATE,
  quantoPagaIlPieno,
  quantoPagaUnaFila,
  QUANTO_ESCE,
} from "../dist/index.js";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/**
 * Una figurina presa, con addosso un'immagine: solo cosi' finisce sui rulli.
 *
 * `prezzo` decide il grado, che decide quanto paga: e' la stessa catena del
 * resto del gioco, e qui non c'e' niente di diverso.
 */
function conFaccia(d, id, prezzo, mime = "image/png") {
  const c = {
    id,
    tipo: "immagine",
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

/** Un deposito con un pacchetto chiuso dentro, pronto da girare. */
function conUnPacchetto(d, quante, prezzo = 600) {
  for (let i = 0; i < quante; i++) conFaccia(d, "c" + i, prezzo);
  creaPacchetto(d, "capo");
  d.muovi("pino", 100_000);
  return d;
}

/* ------------------------------------------------------------ il mazzo */

/**
 * ⚠ **Sui rulli ci vanno solo le immagini dei pacchetti.** Parole sue, il 12
 * settembre 2026: «deve usare solo le immagini dei pacchetti».
 *
 * Le due meta' contano tutte e due, e ognuna ha il suo perche':
 *
 * - **immagini**: un prompt e' una riga di testo e su un rullo non si
 *   riconosce; un brano senza copertina e' un rettangolo grigio;
 * - **dei pacchetti**: una cosa presa stamattina e non ancora impacchettata
 *   non gira. Se girasse, la macchinetta regalerebbe roba che non si puo'
 *   ancora comprare da nessuna parte, e il pacchetto non varrebbe piu' niente.
 */
prova("sui rulli ci vanno solo le immagini, e solo quelle dei pacchetti", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conFaccia(d, "foto", 600);
    // Un prompt senza niente attaccato: non ha una faccia, non gira.
    d.collezionabili().push({
      id: "solotesto", tipo: "prompt", titolo: "Solo parole", impronta: "i2",
      daChi: "pino", quando: 1, stato: "presa", numero: 2, prezzo: 600,
    });
    // Un brano: gira solo se la libreria gli ha gia' fatto una copertina.
    const brano = conFaccia(d, "brano", 600, "audio/mpeg");
    uguale(facciaDi(brano), null, "un mp3 da solo non e' una faccia");
    brano.copertina = { id: "cop", mime: "image/jpeg", url: "/libreria/file/cop" };

    uguale(mazzoMacchinetta(d).length, 0, "finche' non c'e' un pacchetto, niente rulli");
    creaPacchetto(d, "capo");
    const quali = mazzoMacchinetta(d).map((s) => s.id).sort();
    uguale(quali, ["brano", "foto"], "il prompt senza faccia resta fuori");

    // Quello che arriva dopo aspetta il prossimo pacchetto: e' la stessa
    // regola dell'album, e qui si vede che vale anche per i rulli.
    conFaccia(d, "nuova", 600);
    uguale(mazzoMacchinetta(d).length, 2, "una presa dopo non entra da sola");
    creaPacchetto(d, "capo");
    uguale(mazzoMacchinetta(d).length, 3, "col pacchetto nuovo si aggiorna da sola");
  }),
);

/**
 * ⚠ **Senza pacchetti la macchinetta e' spenta, e lo dice.** Chiesto il 12
 * settembre 2026: «questa slot per funzionare deve esserci almeno 1 pacchetto
 * disponibile».
 *
 * Un tasto che si preme e risponde «non si puo'» e' un tasto che non doveva
 * essere premibile: il perche' si dice **prima**, in italiano, e la pagina lo
 * scrive al posto dei rulli.
 */
prova("senza pacchetti non si tira, e c'e' scritto perche'", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 100_000);
    vero(percheSpenta(d, 0).length > 0, "spenta, e con un perche' scritto");

    let fermato = true;
    try {
      giraLaMacchinetta(d, "pino", 100, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "e il giro non parte");

    conUnPacchetto(d, 4);
    uguale(percheSpenta(d, mazzoMacchinetta(d).length), "", "col pacchetto si accende");
  }),
);

/* ------------------------------------------------------------ la puntata */

prova("si gioca a cinquanta, cento o duecento, e non a quello che si vuole", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 4);
    uguale([...PUNTATE], [50, 100, 200], "sono quelle che ha detto lui");

    let fermato = true;
    try {
      giraLaMacchinetta(d, "pino", 1, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "una lira non e' una puntata");

    // La puntata si paga **prima**, e si paga sempre: anche il giro perso.
    const prima = d.conto("pino").saldo;
    // Un dado alto: sopra a tutte le soglie, quindi non vince niente.
    const esito = giraLaMacchinetta(d, "pino", 50, dado(0.99));
    uguale(esito.vinto, 0, "col dado alto non esce niente");
    uguale(esito.saldo, prima - 50, "e la puntata se n'e' andata");
    uguale(esito.caselle.length, CASELLE, "nove caselle, sempre");
  }),
);

prova("senza lire non si tira", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 4);
    d.muovi("pino", -999_999);
    let fermato = true;
    try {
      giraLaMacchinetta(d, "pino", 200, Math.random);
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "doveva rifiutare");
  }),
);

/* ------------------------------------------------------------- le vincite */

/**
 * ⚠ **Quello che si vede e quello che si prende vengono dallo stesso posto.**
 *
 * E' la cosa che questa macchina puo' sbagliare in modo peggiore: le caselle si
 * riempiono **dopo** aver deciso l'esito, e se un giro «senza niente» mettesse
 * per caso tre figurine uguali, lo schermo direbbe che hai vinto e il conto
 * direbbe di no. Qui si controlla che le due meta' si raccontino la stessa
 * cosa, giro per giro.
 */
prova("le caselle dicono quello che dice il conto, sempre", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 6);
    d.muovi("pino", 10_000_000);

    for (let i = 0; i < 400; i++) {
      const e = giraLaMacchinetta(d, "pino", 50, Math.random);
      const righe = Array.from({ length: FILE }, (_, r) =>
        e.caselle.slice(r * PER_FILA, (r + 1) * PER_FILA));
      const piene = righe.map((f) => f.every((c) => c.id === f[0].id));
      const tutte = e.caselle.every((c) => c.id === e.caselle[0].id);

      uguale(e.pieno, tutte, "«pieno» deve voler dire tutto lo schermo uguale");
      // ⚠ Col pieno le file non si pagano a parte: sarebbe pagare due volte la
      // stessa cosa. Paga il superbonus, che vale gia' molto di piu'.
      const attese = tutte ? [] : piene.map((p, r) => (p ? r : -1)).filter((r) => r >= 0);
      uguale(e.file.map((f) => f.riga), attese, "le file pagate sono proprio quelle che si vedono");
      if (!e.pieno && !e.file.length) uguale(e.vinto, 0, "senza file non si paga niente");
    }
  }),
);

/**
 * ⚠ **Tre in fila: un premio leggero.** «Se si riescono a mettere in fila gli
 * item si vince... un premio in lire leggero».
 *
 * Quanto paga lo dice il grado della figurina che ha fatto la fila, ed e'
 * l'altezza nella scala piu' due: non c'e' una seconda tabella da tenere
 * allineata, e una fila di roba rara vale piu' di una di roba comune.
 */
prova("una fila paga in volte la puntata, secondo il grado", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // 600 lire sono un Rare: altezza 2, quindi la fila paga quattro volte.
    conUnPacchetto(d, 6, 600);
    uguale(quantoPagaUnaFila("rare"), 4);
    uguale(quantoPagaUnaFila("basic"), 2, "in fondo alla scala si paga poco");
    vero(quantoPagaIlPieno("ethernal") > quantoPagaUnaFila("ethernal") * 10,
      "il pieno deve valere un altro campionato");

    /**
     * Il dado, numero per numero: il primo sceglie **cosa succede** (e' quello
     * che `fra(1, 10.000)` legge), gli altri riempiono le caselle. Un numero
     * dentro la fetta di «una fila» e sopra a quelle del pieno e delle due
     * file: si vince una fila sola.
     */
    const dentroUnaFila =
      (QUANTO_ESCE.pieno + QUANTO_ESCE.treFile + QUANTO_ESCE.dueFile + QUANTO_ESCE.unaFila / 2) /
      10_000;
    const prima = d.conto("pino").saldo;
    const e = giraLaMacchinetta(d, "pino", 100, dado(dentroUnaFila, 0.1, 0.5, 0.9, 0.3));
    uguale(e.file.length, 1, "una fila, non due");
    uguale(e.pieno, false);
    uguale(e.vinto, 100 * quantoPagaUnaFila(e.file[0].simbolo.grado));
    uguale(e.saldo, prima - 100 + e.vinto, "pagata la puntata, incassato il premio");
  }),
);

/**
 * ⚠ **Sei uguali: il superbonus, e la figurina diventa tua.**
 *
 * Parole sue: «se l'utente riesce a far uscire 6 immagini totali tutte uguali
 * allora vince un superbonus in lire sempre contenuto, e in piu' l'immagine
 * viene sbloccata e aggiunta nell'inventario». Le lire sono il contorno; il
 * premio e' la figurina, ed e' la terza strada per averne una (CONCETTI.md
 * § 11).
 */
prova("tutto lo schermo uguale paga il colpo grosso e sblocca la figurina", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 5, 600);
    // Sotto alla soglia del pieno: il primo numero del dado decide tutto.
    const pieno = dado(0.0001, 0.5);

    const prima = d.conto("pino").saldo;
    const e = giraLaMacchinetta(d, "pino", 200, pieno);
    uguale(e.pieno, true, "il dado basso e' il colpo grosso");
    uguale(e.caselle.length, CASELLE, "tutte e nove");
    for (let i = 1; i < CASELLE; i++) uguale(e.caselle[i].id, e.caselle[0].id, "tutte uguali");
    vero(e.sbloccata !== null, "la figurina deve diventare tua");
    uguale(e.sbloccata.id, e.caselle[0].id);
    uguale(d.conto("pino").collezione.indexOf(e.sbloccata.id) >= 0, true, "ed e' in collezione");
    uguale(e.doppione, false);
    uguale(e.vinto, 200 * quantoPagaIlPieno(e.caselle[0].grado));
    uguale(e.saldo, prima - 200 + e.vinto);

    /**
     * ⚠ **Il doppione paga, come nei pacchetti.** Una cosa che avevi gia' e che
     * non ti da' niente perche' «ce l'avevi» e' la cosa che fa smettere di
     * giocare. Qui vale il suo prezzo in lire, esattamente come quando cade da
     * un pacchetto.
     */
    const ancora = giraLaMacchinetta(d, "pino", 200, pieno);
    uguale(ancora.pieno, true);
    uguale(ancora.sbloccata, null, "ce l'aveva gia'");
    uguale(ancora.doppione, true);
    uguale(
      ancora.vinto,
      200 * quantoPagaIlPieno(ancora.caselle[0].grado) + ancora.caselle[0].prezzo,
      "e il doppione paga il suo prezzo in piu'",
    );
  }),
);

/**
 * ⚠ **Le possibilita' di vincere sono basse, e non per caso: per scelta.**
 *
 * Parole sue. Il numero non viene da quante figurine ci sono nel mazzo — se
 * venisse da li', la macchina cambierebbe mestiere da sola ogni volta che chi
 * comanda chiude un pacchetto. Viene da `QUANTO_ESCE`, che e' una tabella
 * scritta: tredici giri su cento pagano qualcosa, e il pieno uno su duemila.
 */
prova("si vince di rado, e il pieno quasi mai", () => {
  const suDiecimila =
    QUANTO_ESCE.pieno + QUANTO_ESCE.treFile + QUANTO_ESCE.dueFile + QUANTO_ESCE.unaFila;
  vero(suDiecimila < 2000, "piu' di un giro su cinque che paga non e' una slot");
  vero(suDiecimila > 500, "e un giro che non paga mai si smette di tirare");
  vero(QUANTO_ESCE.pieno <= 10, "il pieno deve essere una cosa che si racconta");
  vero(QUANTO_ESCE.pieno < QUANTO_ESCE.treFile, "e piu' raro delle tre file");
  vero(QUANTO_ESCE.treFile < QUANTO_ESCE.dueFile, "che sono piu' rare di due");
  vero(QUANTO_ESCE.dueFile < QUANTO_ESCE.unaFila, "che sono piu' rare di una fila sola");
});

/**
 * ⚠ **Tre file da tre**, dall'11 settembre 2026: «la slot Fortuna aggiungiamo
 * un'altra riga, sempre stesso funzionamento».
 */
prova("la macchina ha tre file da tre", () => {
  uguale([FILE, PER_FILA, CASELLE], [3, 3, 9]);
});

/**
 * ⚠ **Tre file vinte non sono lo schermo pieno**, nemmeno con due figurine
 * sole nel mazzo.
 *
 * E' il caso in cui un arrotondamento regalerebbe il colpo grosso: se la terza
 * fila pescasse la stessa figurina delle altre due, le nove caselle sarebbero
 * uguali, e una fetta da uno su mille pagherebbe come quella da uno su duemila
 * — con la figurina in regalo.
 */
prova("tre file pagano la somma, e non diventano mai il pieno", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 2, 600);
    // Dentro alla fetta delle tre file; il resto del dado a un decimo, che con
    // due figurine dello stesso grado pesca sempre la prima.
    const dentroTreFile = (QUANTO_ESCE.pieno + QUANTO_ESCE.treFile / 2) / 10_000;
    for (let i = 0; i < 20; i++) {
      const e = giraLaMacchinetta(d, "pino", 100, dado(dentroTreFile, 0.1));
      uguale(e.file.length, 3, "tre file");
      uguale(e.pieno, false, "ma non il pieno");
      vero(e.caselle.some((c) => c.id !== e.caselle[0].id), "sullo schermo ce n'e' una diversa");
      uguale(e.vinto, e.file.reduce((s, f) => s + f.lire, 0), "e paga la somma delle file");
    }
  }),
);

/**
 * ⚠ **La macchinetta e' un rubinetto che porta via, non che da'.**
 *
 * Se rendesse piu' di quanto costa, in una serata sparirebbe il motivo di
 * inventare combinazioni — che e' l'unica cosa che questo gioco paga davvero
 * (CONCETTI.md § 11). Qui si tira mille volte e si guarda il conto: deve
 * scendere.
 */
prova("tirando tanto si perde: la fortuna costa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    conUnPacchetto(d, 8, 600);
    d.muovi("pino", 1_000_000);
    const prima = d.conto("pino").saldo;
    for (let i = 0; i < 1000; i++) giraLaMacchinetta(d, "pino", 100, Math.random);
    vero(d.conto("pino").saldo < prima, "mille giri devono lasciare il conto piu' magro");
  }),
);

// ⚠ Col numero di uscita, come le altre prove. Fino all'11 settembre 2026 qui
// mancava: una prova della macchinetta che cadeva lo scriveva a schermo, e
// «pnpm run prova» restava verde lo stesso.
process.exit(tirandoLeSomme("la macchinetta"));
