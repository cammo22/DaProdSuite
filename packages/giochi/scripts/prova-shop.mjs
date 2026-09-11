/**
 * Le prove dello shop.
 *
 * ⚠ **Lo shop e' l'unica strada sicura, e costa.** Le altre due — il pacchetto
 * e la figurina che cade girando — costano meno e non promettono niente. Qui si
 * paga per **non aspettare la fortuna**, e quel prezzo lo decide chi comanda
 * scegliendo un grado (CONCETTI.md § 12).
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-shop.mjs
 */

import {
  compra,
  creaPacchetto,
  Deposito,
  GRADI,
  gradoDiFigurina,
  mettiInVetrina,
  NienteDaFare,
  PACCHETTI_DI_PAVIMENTO,
  prezzoConsigliato,
  prezzoDaPacchetto,
  prezzoNelloShop,
  TETTO_FIGURINE,
  togliDallaVetrina,
  vetrina,
  VOLTE_LA_VETRINA,
} from "../dist/index.js";
import { conCartella, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/** Una figurina gia' presa, pronta per la vetrina. */
function figurinaPresa(d, id, prezzo) {
  const c = {
    id,
    tipo: "prompt",
    titolo: "Finta " + id,
    impronta: "impronta-" + id,
    pezzi: [],
    prompt: "prompt finto",
    daChi: "pino",
    quando: Date.now(),
    stato: "presa",
    numero: d.collezionabili().length + 1,
    prezzo: typeof prezzo === "number" ? prezzo : 100,
  };
  d.collezionabili().push(c);
  return c;
}

/* ------------------------------------------------------------- il listino */

prova("il prezzo consigliato sale col grado, e non scende mai", () => {
  for (let i = 1; i < GRADI.length; i++) {
    vero(
      prezzoConsigliato(GRADI[i].id) >= prezzoConsigliato(GRADI[i - 1].id),
      GRADI[i].id + " costa meno di quello sotto",
    );
  }
  vero(prezzoConsigliato("basic") >= 50, "anche il piu' scarso ha un prezzo minimo");
  vero(
    prezzoConsigliato("mythic") > prezzoConsigliato("rare") * 10,
    "in cima deve costare tanto: si paga di non aspettare la fortuna",
  );
});

/* -------------------------------------------------------------- la vetrina */

prova("in vetrina ci va solo roba gia' presa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.collezionabili().push({
      id: "attesa",
      tipo: "prompt",
      titolo: "In attesa",
      impronta: "x",
      daChi: "pino",
      quando: Date.now(),
      stato: "in-attesa",
    });
    let fermato = true;
    try {
      mettiInVetrina(d, "attesa", "rare");
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "prima si decide se vale, poi si vende");
  }),
);

prova("il grado della vetrina lo sceglie chi comanda, e vale anche nei pacchetti", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // Sulla scala di adesso 600 lire sono un Rare: da 600 a 1.199.
    const c = figurinaPresa(d, "uno", 600);
    uguale(gradoDiFigurina(c), "rare", "senza vetrina il grado viene dal prezzo");

    mettiInVetrina(d, "uno", "heroic");
    uguale(gradoDiFigurina(c), "heroic", "in vetrina comanda il grado scelto");
    uguale(c.prezzoVetrina, prezzoConsigliato("heroic"), "e il prezzo lo suggerisce il grado");
  }),
);

/**
 * ⚠ **Le figurine si fermano al tetto, dovunque sia, e da nessuna strada lo
 * sfondano.**
 *
 * Le strade sono due — un prezzo alto e un grado di vetrina scelto a mano — e
 * si provano tutte e due: bastava che ne restasse aperta una perche' il tetto
 * non ci fosse.
 *
 * Fino all'11 settembre 2026 il tetto era Unique e questa prova diceva
 * «Unique» scritto a mano. Dal 12 e' Ethernal, cioe' l'ultimo grado: non c'e'
 * piu' niente da tagliare. La prova non guarda il nome di oggi — guarda la
 * regola: qualunque sia `TETTO_FIGURINE`, ne' il prezzo ne' il grado scelto da
 * chi comanda vanno oltre. Il giorno che si rimette un muro piu' basso, questa
 * riga se ne accorge senza doverla riscrivere.
 */
prova("le figurine non passano il tetto, ne' col prezzo ne' col grado scelto", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // Un prezzo scritto a mano sopra alla scala: serve a provare la seconda
    // rete, quella che **legge** — `valoreDaPrendere` taglia gia' in entrata.
    const cara = figurinaPresa(d, "cara", 900_000);
    uguale(gradoDiFigurina(cara), TETTO_FIGURINE, "un prezzo fuori scala si ferma al tetto");

    const c = mettiInVetrina(d, "cara", "ethernal");
    uguale(c.gradoVetrina, TETTO_FIGURINE, "e il grado scelto si ferma li' gia' sul disco");
    uguale(gradoDiFigurina(c), TETTO_FIGURINE, "quindi si legge lo stesso dappertutto");
    uguale(
      c.prezzoVetrina,
      prezzoConsigliato(TETTO_FIGURINE),
      "e il prezzo consigliato e' quello del grado vero, non di quello chiesto",
    );
  }),
);

prova("sotto al tetto non cambia niente: il grado scelto resta quello", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 160_000);
    const c = mettiInVetrina(d, "uno", "grand");
    uguale(c.gradoVetrina, "grand", "un grado basso non lo tocca nessuno");
  }),
);

prova("un prezzo scritto a mano batte quello consigliato", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 160_000);
    const c = mettiInVetrina(d, "uno", "rare", 7777);
    uguale(c.prezzoVetrina, 7777);
  }),
);

prova("la vetrina si riempie e si svuota", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    figurinaPresa(d, "due", 900);
    uguale(vetrina(d).length, 0, "di suo non c'e' niente in vendita");

    mettiInVetrina(d, "uno", "rare");
    mettiInVetrina(d, "due", "mythic");
    uguale(vetrina(d).length, 2);
    uguale(vetrina(d)[0].id, "due", "prima la piu' cara");

    togliDallaVetrina(d, "due");
    uguale(vetrina(d).length, 1);
  }),
);

/* -------------------------------------------------------------- comprare */

prova("comprare paga, e la figurina diventa tua", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    mettiInVetrina(d, "uno", "rare", 500);
    d.muovi("gino", 10000);

    const prima = d.conto("gino").saldo;
    const acquisto = compra(d, "gino", "uno");
    uguale(acquisto.costo, 500);
    uguale(acquisto.saldo, prima - 500);
    vero(d.conto("gino").collezione.indexOf("uno") >= 0, "adesso e' sua");
  }),
);

prova("senza abbastanza lire non si compra, e si dice quante ne mancano", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    mettiInVetrina(d, "uno", "mythic", 20000);
    d.muovi("spiantato", -99999);

    let detto = "";
    try {
      compra(d, "spiantato", "uno");
    } catch (errore) {
      detto = errore.message;
      vero(errore instanceof NienteDaFare);
    }
    vero(detto.indexOf("mancano") >= 0, "il no deve dire quanto manca, non «non puoi»");
  }),
);

prova("una che hai gia' non si ricompra", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    mettiInVetrina(d, "uno", "rare", 100);
    d.muovi("gino", 10000);
    compra(d, "gino", "uno");

    const dopoLaPrima = d.conto("gino").saldo;
    let fermato = true;
    try {
      compra(d, "gino", "uno");
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "doveva rifiutare");
    uguale(d.conto("gino").saldo, dopoLaPrima, "e non doveva scalare niente");
  }),
);

prova("quello che non e' in vetrina non si compra", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    d.muovi("gino", 10000);
    let fermato = true;
    try {
      compra(d, "gino", "uno");
      fermato = false;
    } catch (errore) {
      vero(errore instanceof NienteDaFare);
    }
    vero(fermato, "sta in magazzino, ma non e' in vendita");
  }),
);

/* ------------------------------------------------- dai pacchetti, a scelta */

/**
 * ⚠ **Dentro a un pacchetto chiuso si compra quella che si vuole, e si paga
 * caro.** Deciso l'11 settembre 2026 (#109): «tipo quelle macchinette col
 * braccio robotico, dove non si vince quasi mai». Il pacchetto e' la fortuna
 * che costa poco; qui e' la certezza.
 */
prova("dentro a un pacchetto chiuso si compra quella che vuoi", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100); // Basic
    figurinaPresa(d, "due", 3600); // Unique
    creaPacchetto(d, "capo");
    d.muovi("gino", 1_000_000);
    const pacchetto = d.impostazioni().costoPacchetto;

    uguale(prezzoNelloShop(d, d.perId("uno")), PACCHETTI_DI_PAVIMENTO * pacchetto,
      "un Basic costa dieci pacchetti");
    uguale(prezzoNelloShop(d, d.perId("due")), VOLTE_LA_VETRINA * prezzoConsigliato("unique"),
      "un Unique il doppio della vetrina");

    const prima = d.conto("gino").saldo;
    const a = compra(d, "gino", "due");
    uguale(a.costo, prezzoNelloShop(d, d.perId("due")), "si paga il cartellino, non un altro numero");
    uguale(a.saldo, prima - a.costo);
    vero(d.conto("gino").collezione.indexOf("due") >= 0, "e adesso e' sua");
  }),
);

prova("scegliere costa sempre piu' che pescare", () => {
  for (const g of GRADI) {
    const scelta = prezzoDaPacchetto(g.id, 5000);
    vero(scelta >= PACCHETTI_DI_PAVIMENTO * 5000, g.id + " costa meno di dieci pacchetti");
    vero(scelta >= prezzoConsigliato(g.id), g.id + " costa meno della vetrina");
  }
  // ⚠ La cima si guarda: e' li' che la scala ha sbagliato tre volte.
  uguale(prezzoDaPacchetto("ethernal", 5000), 2_720_000, "un Ethernal scelto: 1.405 euro");
});

prova("la vetrina vince sul pacchetto: il prezzo scritto da chi comanda resta quello", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    creaPacchetto(d, "capo");
    mettiInVetrina(d, "uno", "rare", 7777);
    uguale(prezzoNelloShop(d, d.perId("uno")), 7777);
  }),
);

prova("fuori dai pacchetti e fuori dalla vetrina non ha prezzo", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    figurinaPresa(d, "uno", 100);
    uguale(prezzoNelloShop(d, d.perId("uno")), null, "sta in magazzino, e aspetta il prossimo pacchetto");
  }),
);

process.exit(tirandoLeSomme("lo shop"));
