/**
 * Le prove del banco.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova.mjs
 *
 * **Il dado e' in mano nostra.** Ogni funzione che pesca prende una `Caso` da
 * fuori: qui gliene passiamo una che tira i numeri che decidiamo noi. Cosi' si
 * verifica che il jackpot paghi **quando esce**, invece di girare diecimila
 * volte sperando che esca. Una prova che non sa cosa uscira' non e' una prova,
 * e' una scommessa.
 *
 * Le prove che invece hanno bisogno del caso vero (che il gioco non si pianti,
 * che il saldo non vada sotto zero in mille giri) girano col dado normale, e
 * controllano una cosa che vale **sempre**, non un risultato.
 */

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  apriPacchetto,
  butta,
  classifica,
  Deposito,
  GRADI,
  IMPOSTAZIONI_DI_PARTENZA,
  lire,
  manda,
  montaPrompt,
  NienteDaFare,
  prendi,
  prezzoDiPartenza,
  raritaDiPrezzo,
  RULLI_IMMAGINI,
  serieChiuse,
  statoMagazzino,
  tira,
  valuta,
} from "../dist/index.js";

import { cartellaFinta, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/* ------------------------------------------------------------ i prezzi */

prova("il prezzo scende quando la roba e' piu' comune", () => {
  vero(prezzoDiPartenza(0) > prezzoDiPartenza(0.5), "raro deve costare piu' di medio");
  vero(prezzoDiPartenza(0.5) > prezzoDiPartenza(1), "medio deve costare piu' di comunissimo");
  vero(prezzoDiPartenza(1) >= 1, "non si scende sotto la lira");
  uguale(prezzoDiPartenza(undefined), prezzoDiPartenza(0.5), "senza dato si sta in mezzo");
});

prova("la rarita' si legge dal prezzo, agli estremi giusti", () => {
  uguale(raritaDiPrezzo(0), "comune");
  uguale(raritaDiPrezzo(4), "comune");
  uguale(raritaDiPrezzo(5), "poco");
  uguale(raritaDiPrezzo(11), "poco");
  uguale(raritaDiPrezzo(12), "raro");
  uguale(raritaDiPrezzo(24), "raro");
  uguale(raritaDiPrezzo(25), "epico");
  uguale(raritaDiPrezzo(39), "epico");
  uguale(raritaDiPrezzo(40), "leggendario");
  uguale(raritaDiPrezzo(9999), "leggendario");
});

prova("i cinque gradi sono in ordine e non si sovrappongono", () => {
  for (let i = 1; i < GRADI.length; i++) {
    vero(GRADI[i].da > GRADI[i - 1].da, "il grado " + GRADI[i].id + " comincia troppo presto");
  }
});

/* ----------------------------------------------------------- le vincite */

function finti(rarita) {
  const prezzo = { comune: 1, poco: 6, raro: 15, epico: 30, leggendario: 50 };
  return rarita.map((r, i) => ({
    id: "finto/" + i,
    rullo: "finto",
    nome: "finto " + i,
    testo: "finto " + i,
    prezzo: prezzo[r],
    rarita: r,
  }));
}

prova("tutti Epico o meglio: e' jackpot", () => {
  const v = valuta(
    finti(["epico", "epico", "leggendario", "epico", "epico", "epico"]),
    IMPOSTAZIONI_DI_PARTENZA,
    [],
    dado(0),
  );
  uguale(v.length, 1);
  uguale(v[0].motivo, "jackpot");
  vero(v[0].lire >= IMPOSTAZIONI_DI_PARTENZA.jackpotMin, "il jackpot paga il minimo");
  vero(v[0].lire <= IMPOSTAZIONI_DI_PARTENZA.jackpotMax, "il jackpot non sfonda il massimo");
});

prova("paga solo la combinazione migliore, non tutte", () => {
  const v = valuta(
    finti(["leggendario", "leggendario", "leggendario", "comune", "comune", "comune"]),
    IMPOSTAZIONI_DI_PARTENZA,
    [],
    dado(0.99),
  );
  uguale(v.length, 1, "tre Leggendari devono pagare una volta sola");
  uguale(v[0].motivo, "l3");
  uguale(v[0].lire, IMPOSTAZIONI_DI_PARTENZA.vincitaL3);
});

prova("quattro Epici pagano solo se non c'e' nessun Leggendario", () => {
  const con = valuta(
    finti(["epico", "epico", "epico", "epico", "leggendario", "comune"]),
    IMPOSTAZIONI_DI_PARTENZA,
    [],
    dado(0.99),
  );
  uguale(con[0].motivo, "l1", "col Leggendario vince il Leggendario");
  const senza = valuta(
    finti(["epico", "epico", "epico", "epico", "comune", "comune"]),
    IMPOSTAZIONI_DI_PARTENZA,
    [],
    dado(0.99),
  );
  uguale(senza[0].motivo, "e4");
});

prova("la quasi-vincita esce col dado basso e non con quello alto", () => {
  const tutti = finti(["comune", "comune", "comune", "comune", "comune", "comune"]);
  const esce = valuta(tutti, IMPOSTAZIONI_DI_PARTENZA, [], dado(0.1, 0.5));
  uguale(esce.length, 1, "col 10% deve consolare");
  uguale(esce[0].motivo, "quasi");
  const niente = valuta(tutti, IMPOSTAZIONI_DI_PARTENZA, [], dado(0.9));
  uguale(niente.length, 0, "col 90% non deve dare niente");
});

prova("una formazione paga in qualunque ordine, e si somma", () => {
  const pezzi = finti(["comune", "comune", "leggendario", "comune", "comune", "comune"]);
  const f = [{ id: "f1", nome: "La tripletta", pezzi: ["finto/3", "finto/0"], premio: 77 }];
  const v = valuta(pezzi, IMPOSTAZIONI_DI_PARTENZA, f, dado(0.99));
  uguale(v.length, 2, "la combinazione e la formazione, tutte e due");
  uguale(v.find((x) => x.motivo === "formazione:f1").lire, 77);
});

/* -------------------------------------------------------------- il giro */

prova("un giro costa, e il costo si vede nel saldo", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    const prima = d.conto("tizio").saldo;
    const giro = tira(d, "tizio", "immagini", [], Math.random);
    uguale(giro.costo, IMPOSTAZIONI_DI_PARTENZA.costoGiro);
    uguale(giro.saldo, prima - giro.costo + giro.pagato);
    uguale(giro.pezzi.length, RULLI_IMMAGINI.length, "un pezzo per rullo");
    vero(giro.prompt.length > 0, "il prompt non puo' essere vuoto");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("senza lire non si gira, e lo dice", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("spiantato", -99999);
    uguale(d.conto("spiantato").saldo, 0);
    let detto = "";
    try {
      tira(d, "spiantato", "immagini", [], Math.random);
    } catch (errore) {
      detto = errore.message;
      vero(errore instanceof NienteDaFare, "deve essere un no spiegato, non un errore qualunque");
    }
    vero(detto.includes("lire"), "il no deve parlare di lire, non di codici");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("un rullo bloccato non gira", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("tizio", 100000);
    const primo = tira(d, "tizio", "immagini", [], Math.random);
    const tenuto = primo.pezzi[2].id;
    const blocchi = [null, null, tenuto, null, null, null];
    for (let i = 0; i < 20; i++) {
      const dopo = tira(d, "tizio", "immagini", blocchi, Math.random);
      uguale(dopo.pezzi[2].id, tenuto, "il rullo bloccato e' cambiato al giro " + i);
    }
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("un pezzo bloccato nella casella sbagliata viene ignorato", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("furbo", 100000);
    // Uno stile messo nella casella del soggetto: il banco non deve accettarlo,
    // se no ci si monta a mano un prompt che il gioco non avrebbe mai dato.
    const giro = tira(d, "furbo", "immagini", ["stile/anime", null, null, null, null, null], Math.random);
    uguale(giro.pezzi[0].rullo, "soggetto", "il primo rullo deve restare un soggetto");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("mille giri: il saldo non va mai sotto zero e il prompt c'e' sempre", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("maratoneta", 1000000);
    for (let i = 0; i < 1000; i++) {
      const giro = tira(d, "maratoneta", "immagini", [], Math.random);
      vero(giro.saldo >= 0, "saldo sotto zero al giro " + i);
      vero(giro.pezzi.every((p) => p && p.id), "un rullo vuoto al giro " + i);
      vero(giro.prompt.includes(","), "prompt senza pezzi al giro " + i);
    }
    const conto = d.conto("maratoneta");
    uguale(conto.giri, 1000);
    vero(conto.colpoGrosso >= 0, "il colpo grosso non puo' essere negativo");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("anche il tavolo della musica gira, e usa i generi veri", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("tizio", 100000);
    const giro = tira(d, "tizio", "musica", [], Math.random);
    uguale(giro.pezzi.length, 6);
    uguale(giro.pezzi[0].rullo, "genere");
    vero(giro.pezzi[0].id.startsWith("genere/"), "il primo pezzo deve venire dal mazzo dei generi");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------ il deposito */

prova("quello che si scrive si rilegge", () => {
  const dove = cartellaFinta();
  const file = join(dove, "giochi.json");
  try {
    const d = new Deposito(file);
    d.muovi("tizio", 123);
    d.cambiaPrezzo("soggetto/un-gatto", 42);
    d.scriviOra();

    const riletto = new Deposito(file);
    uguale(riletto.conto("tizio").saldo, IMPOSTAZIONI_DI_PARTENZA.regaloIniziale + 123);
    uguale(riletto.prezzi()["soggetto/un-gatto"], 42);
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("un file rotto non cancella i conti", () => {
  const dove = cartellaFinta();
  const file = join(dove, "giochi.json");
  try {
    const d = new Deposito(file);
    d.muovi("tizio", 500);
    d.scriviOra();
    const buono = readFileSync(file, "utf8");

    // Si rompe il file principale, senza copia di sicurezza accanto.
    rmSync(file + ".bak", { force: true });
    writeFileSync(file, "{ questo non e' json", "utf8");

    const rotto = new Deposito(file);
    vero(rotto.eRotto, "doveva accorgersi che non si capisce");
    rotto.muovi("tizio", 1000);
    rotto.scriviOra();
    uguale(readFileSync(file, "utf8"), "{ questo non e' json", "non deve scriverci sopra");
    vero(buono.length > 0);
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("se il file principale si rompe, si riprende dalla copia", () => {
  const dove = cartellaFinta();
  const file = join(dove, "giochi.json");
  try {
    const primo = new Deposito(file);
    primo.muovi("tizio", 700);
    primo.scriviOra();
    // La seconda scrittura crea la copia con dentro lo stato di prima.
    primo.muovi("tizio", 1);
    primo.scriviOra();

    writeFileSync(file, "rotto di brutto", "utf8");
    const ripreso = new Deposito(file);
    vero(!ripreso.eRotto, "con la copia buona non deve dichiararsi rotto");
    vero(ripreso.conto("tizio").saldo > IMPOSTAZIONI_DI_PARTENZA.regaloIniziale, "il saldo doveva tornare");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("le impostazioni nuove arrivano anche a chi giocava da prima", () => {
  const dove = cartellaFinta();
  const file = join(dove, "giochi.json");
  try {
    writeFileSync(
      file,
      JSON.stringify({ versione: 1, conti: [], impostazioni: { costoGiro: 3 } }),
      "utf8",
    );
    const d = new Deposito(file);
    uguale(d.impostazioni().costoGiro, 3, "quello scritto resta");
    uguale(
      d.impostazioni().jackpotMax,
      IMPOSTAZIONI_DI_PARTENZA.jackpotMax,
      "quello che non c'era arriva dai valori di partenza",
    );
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

/* ----------------------------------------------------------- classifica */

/* --------------------------------------------------------------- parole */

prova("le lire si scrivono all'italiana", () => {
  uguale(lire(1500), "L. 1.500");
  uguale(lire(999), "L. 999");
  uguale(lire(1000000), "L. 1.000.000");
  uguale(lire(0), "L. 0");
});

prova("il prompt si monta nell'ordine dei rulli", () => {
  const pezzi = finti(["comune", "comune"]);
  uguale(montaPrompt(pezzi), "finto 0, finto 1");
});

/* ----------------------------------------------------------------- fine */

process.exit(tirandoLeSomme("il banco"));
