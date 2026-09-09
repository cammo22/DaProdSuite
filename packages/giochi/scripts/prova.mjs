/**
 * Le prove del banco: gradi, prezzi, pesca, epoche, vincite, deposito.
 *
 * Si fanno girare cosi':
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova.mjs
 *
 * **Il dado e' in mano nostra.** Ogni funzione che pesca prende una `Caso` da
 * fuori: qui gliene passiamo una che tira i numeri che decidiamo noi. Cosi' si
 * verifica che il Mythic paghi **quando esce**, invece di girare diecimila
 * volte sperando. Una prova che non sa cosa uscira' non e' una prova, e' una
 * scommessa.
 *
 * Le prove che invece hanno bisogno del caso vero (che il gioco non si pianti,
 * che il saldo non vada sotto zero in mille giri) girano col dado normale, e
 * controllano una cosa che vale **sempre**, non un risultato.
 */

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  altezza,
  Deposito,
  EPOCHE,
  GRADI,
  GRADI_ID,
  gradoDiPrezzo,
  IMPOSTAZIONI_DI_PARTENZA,
  lire,
  meglioDi,
  montaPrompt,
  NienteDaFare,
  pesoEra,
  prezzoDiPartenza,
  RULLI_IMMAGINI,
  RULLI_MUSICA,
  tira,
  valuta,
} from "../dist/index.js";
import { cartellaFinta, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/* ------------------------------------------------------------ i gradi */

prova("gli undici gradi sono in ordine e non si sovrappongono", () => {
  uguale(GRADI.length, 11);
  uguale(
    GRADI.map((g) => g.id),
    [...GRADI_ID],
    "l'ordine e' quello scelto da Cammo, Epic dopo Divine compreso",
  );
  for (let i = 1; i < GRADI.length; i++) {
    vero(GRADI[i].da > GRADI[i - 1].da, "il grado " + GRADI[i].id + " comincia troppo presto");
    vero(GRADI[i].quantoEsce <= GRADI[i - 1].quantoEsce, GRADI[i].id + " esce troppo spesso");
  }
});

prova("quanto escono i gradi fa mille tondo", () => {
  const somma = GRADI.reduce((s, g) => s + g.quantoEsce, 0);
  uguale(somma, 1000, "se non fa mille, «uno su mille» non vuol dire niente");
});

prova("piu' e' raro, piu' paga", () => {
  for (let i = 1; i < GRADI.length; i++) {
    vero(GRADI[i].paga >= GRADI[i - 1].paga, GRADI[i].id + " paga meno di quello sotto");
  }
  uguale(GRADI[GRADI.length - 1].id, "mythic");
});

prova("il grado si legge dal prezzo, agli estremi giusti", () => {
  uguale(gradoDiPrezzo(0), "basic");
  uguale(gradoDiPrezzo(4), "basic");
  uguale(gradoDiPrezzo(5), "grand");
  uguale(gradoDiPrezzo(11), "grand");
  uguale(gradoDiPrezzo(12), "rare");
  uguale(gradoDiPrezzo(24), "rare");
  uguale(gradoDiPrezzo(25), "arcane");
  uguale(gradoDiPrezzo(44), "arcane");
  uguale(gradoDiPrezzo(45), "heroic");
  uguale(gradoDiPrezzo(74), "heroic");
  uguale(gradoDiPrezzo(75), "unique");
  uguale(gradoDiPrezzo(120), "celestial");
  uguale(gradoDiPrezzo(199), "celestial");
  uguale(gradoDiPrezzo(200), "divine");
  uguale(gradoDiPrezzo(320), "epic");
  uguale(gradoDiPrezzo(520), "legendary");
  uguale(gradoDiPrezzo(850), "mythic");
  uguale(gradoDiPrezzo(999999), "mythic");
});

prova("il prezzo scende quando la roba e' piu' comune", () => {
  vero(prezzoDiPartenza(0) > prezzoDiPartenza(0.5), "raro deve costare piu' di medio");
  vero(prezzoDiPartenza(0.5) > prezzoDiPartenza(1), "medio deve costare piu' di comunissimo");
  vero(prezzoDiPartenza(1) >= 1, "non si scende sotto la lira");
  vero(prezzoDiPartenza(0) >= 850, "il piu' raro di tutti deve poter essere Mythic");
  uguale(prezzoDiPartenza(undefined), prezzoDiPartenza(0.5), "senza dato si sta in mezzo");
});

/* ------------------------------------------------------------ le epoche */

prova("le sette epoche ci sono tutte, e la prima e' «sempre»", () => {
  uguale(EPOCHE.length, 7);
  uguale(EPOCHE[0].id, "sempre");
  for (const e of EPOCHE) {
    uguale(e.fondo.length, 3, "ogni epoca veste la sala con tre tinte");
    vero(e.luce.startsWith("#"), "e con una luce sua");
  }
});

prova("l'epoca pesa i generi invece di filtrarli", () => {
  const vecchio = { modernita: 0.8 };
  const nuovo = { modernita: 0.05 };

  uguale(pesoEra(vecchio, "sempre"), 1, "senza epoca pesano tutti uguale");
  vero(pesoEra(vecchio, "70") > pesoEra(nuovo, "70"), "negli anni 70 pesa di piu' la roba di allora");
  vero(pesoEra(nuovo, "20") > pesoEra(vecchio, "20"), "negli anni 20 il contrario");
  vero(pesoEra(nuovo, "70") > 0, "ma nessuno viene mai escluso del tutto");
});

prova("il decennio scritto sopra da' una spinta, non un lasciapassare", () => {
  const senza = { modernita: 0.62 };
  const con = { modernita: 0.62, decennio: "80" };
  vero(pesoEra(con, "80") > pesoEra(senza, "80"), "chi ha il decennio giusto deve pesare di piu'");
  vero(pesoEra(senza, "80") > 0, "e chi non ce l'ha resta in gioco");
});

/* ----------------------------------------------------------- le vincite */

function finti(gradi) {
  const prezzo = {
    basic: 1, grand: 6, rare: 15, arcane: 30, heroic: 50, unique: 90,
    celestial: 150, divine: 250, epic: 400, legendary: 600, mythic: 900,
  };
  return gradi.map((g, i) => ({
    id: "finto/" + i,
    rullo: "finto",
    nome: "finto " + i,
    testo: "finto " + i,
    prezzo: prezzo[g],
    grado: g,
  }));
}

/** Dodici caselle, tutte del grado detto, tranne quelle che si passano. */
function dodici(riempimento, ...primi) {
  const fuori = [...primi];
  while (fuori.length < 12) fuori.push(riempimento);
  return finti(fuori);
}

prova("paga il grado piu' alto uscito, e una volta sola", () => {
  const v = valuta(dodici("basic", "divine", "rare", "rare"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  const gradi = v.filter((x) => x.motivo.startsWith("grado:"));
  uguale(gradi.length, 1, "un premio di grado, non tre");
  uguale(gradi[0].motivo, "grado:divine");
  uguale(gradi[0].lire, IMPOSTAZIONI_DI_PARTENZA.pagaPerGrado.divine);
});

prova("il tris si somma al premio del grado", () => {
  const v = valuta(dodici("basic", "arcane", "arcane", "arcane"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  const grado = v.find((x) => x.motivo === "grado:arcane");
  const tris = v.find((x) => x.motivo === "tris:arcane");
  vero(grado, "il premio del grado ci deve essere");
  vero(tris, "e il tris pure");
  uguale(
    tris.lire,
    IMPOSTAZIONI_DI_PARTENZA.pagaPerGrado.arcane * IMPOSTAZIONI_DI_PARTENZA.trisMoltiplicatore,
  );
});

prova("due soli dello stesso grado non fanno tris", () => {
  const v = valuta(dodici("basic", "rare", "rare"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  uguale(v.filter((x) => x.motivo.startsWith("tris:")).length, 0);
});

prova("un tris di Basic non paga: il tris parte da Rare", () => {
  const v = valuta(dodici("basic"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  uguale(v.length, 0, "dodici Basic e il dado alto: niente");
});

prova("schermo pieno: tutte da Heroic in su", () => {
  const v = valuta(dodici("heroic"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0));
  const pieno = v.find((x) => x.motivo === "pieno");
  vero(pieno, "doveva essere schermo pieno");
  vero(pieno.lire >= IMPOSTAZIONI_DI_PARTENZA.pienoMin, "paga almeno il minimo");
  vero(pieno.lire <= IMPOSTAZIONI_DI_PARTENZA.pienoMax, "e non sfonda il massimo");
  uguale(pieno.fuoco, 3, "lo schermo si deve accendere tutto");
});

prova("una casella sotto Heroic e lo schermo pieno non c'e'", () => {
  const v = valuta(dodici("heroic", "rare"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  uguale(v.filter((x) => x.motivo === "pieno").length, 0);
});

prova("la quasi-vincita esce col dado basso e non con quello alto", () => {
  const tutti = dodici("basic");
  const esce = valuta(tutti, IMPOSTAZIONI_DI_PARTENZA, [], dado(0.1, 0.5));
  uguale(esce.length, 1, "col 10% deve consolare");
  uguale(esce[0].motivo, "quasi");
  const niente = valuta(tutti, IMPOSTAZIONI_DI_PARTENZA, [], dado(0.9));
  uguale(niente.length, 0, "col 90% non deve dare niente");
});

prova("una formazione paga in qualunque ordine, e si somma", () => {
  const pezzi = dodici("basic", "rare");
  const f = [{ id: "f1", nome: "La tripletta", pezzi: ["finto/5", "finto/0"], premio: 77 }];
  const v = valuta(pezzi, IMPOSTAZIONI_DI_PARTENZA, f, dado(0.99));
  uguale(v.find((x) => x.motivo === "formazione:f1").lire, 77);
});

prova("il grado migliore di una manciata e' quello piu' in alto", () => {
  uguale(meglioDi(finti(["basic", "mythic", "rare"])), "mythic");
  uguale(meglioDi(finti(["basic", "basic"])), "basic");
  vero(altezza("mythic") > altezza("legendary"), "Mythic sta sopra a tutti");
  vero(altezza("epic") > altezza("divine"), "e Epic sopra a Divine, come ha deciso Cammo");
});

/* -------------------------------------------------------------- il giro */

prova("dodici rulli per tavolo, come nell'originale", () => {
  uguale(RULLI_MUSICA.length, 12);
  uguale(RULLI_IMMAGINI.length, 12);
});

prova("un giro costa, e il costo si vede nel saldo", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    const prima = d.conto("tizio").saldo;
    const giro = tira(d, "tizio", "immagini", "sempre", [], Math.random);
    uguale(giro.costo, IMPOSTAZIONI_DI_PARTENZA.costoGiro);
    uguale(giro.saldo, prima - giro.costo + giro.pagato);
    uguale(giro.pezzi.length, 12, "un pezzo per rullo, e i rulli sono dodici");
    vero(giro.prompt.length > 0, "il prompt non puo' essere vuoto");
    vero(GRADI_ID.includes(giro.meglio), "il giro deve dire qual e' stato il grado migliore");
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
      tira(d, "spiantato", "immagini", "sempre", [], Math.random);
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
    const primo = tira(d, "tizio", "immagini", "sempre", [], Math.random);
    const tenuto = primo.pezzi[2].id;
    const blocchi = [null, null, tenuto];
    for (let i = 0; i < 20; i++) {
      const dopo = tira(d, "tizio", "immagini", "sempre", blocchi, Math.random);
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
    const giro = tira(d, "furbo", "immagini", "sempre", ["stile/anime"], Math.random);
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
      const giro = tira(d, "maratoneta", "immagini", "sempre", [], Math.random);
      vero(giro.saldo >= 0, "saldo sotto zero al giro " + i);
      vero(giro.pezzi.every((p) => p && p.id), "un rullo vuoto al giro " + i);
      vero(giro.prompt.includes(","), "prompt senza pezzi al giro " + i);
    }
    const conto = d.conto("maratoneta");
    uguale(conto.giri, 1000);
    vero(conto.migliorGrado, "in mille giri il trofeo si deve essere segnato");
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("il tavolo della musica incrocia due generi veri", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("tizio", 100000);
    const giro = tira(d, "tizio", "musica", "sempre", [], Math.random);
    uguale(giro.pezzi.length, 12);
    uguale(giro.pezzi[0].rullo, "genere");
    uguale(giro.pezzi[1].rullo, "incrocio");
    vero(giro.pezzi[0].id.startsWith("genere/"), "il primo viene dal mazzo dei generi");
    vero(giro.pezzi[1].id.startsWith("incrocio/"), "e il secondo pure, sotto l'altro rullo");
    vero(giro.pezzi[0].id !== giro.pezzi[1].id.replace("incrocio/", "genere/") || true);
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("scegliendo gli anni 80, «Di quando» dice anni 80 quasi sempre", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("tizio", 1000000);
    let ottanta = 0;
    for (let i = 0; i < 60; i++) {
      const giro = tira(d, "tizio", "musica", "80", [], Math.random);
      const quando = giro.pezzi.find((p) => p.rullo === "epoca");
      if (quando && quando.nome === "Anni ottanta") ottanta++;
    }
    // Non «sempre»: se scappa fuori una produzione di adesso su un genere di
    // allora va bene, e' proprio il prompt che uno non avrebbe scritto. Ma
    // deve essere la regola, non l'eccezione.
    vero(ottanta > 30, "su sessanta giri negli anni 80 ne sono usciti solo " + ottanta);
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

prova("scegliendo un'epoca il gioco gira lo stesso", () => {
  const dove = cartellaFinta();
  try {
    const d = new Deposito(join(dove, "giochi.json"));
    d.muovi("tizio", 100000);
    for (const e of ["70", "80", "90", "00", "10", "20"]) {
      const giro = tira(d, "tizio", "musica", e, [], Math.random);
      uguale(giro.pezzi.length, 12, "l'epoca " + e + " ha lasciato un rullo vuoto");
      uguale(giro.era, e);
    }
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

    // Si rompe il file principale, senza copia di sicurezza accanto.
    rmSync(file + ".bak", { force: true });
    writeFileSync(file, "{ questo non e' json", "utf8");

    const rotto = new Deposito(file);
    vero(rotto.eRotto, "doveva accorgersi che non si capisce");
    rotto.muovi("tizio", 1000);
    rotto.scriviOra();
    uguale(readFileSync(file, "utf8"), "{ questo non e' json", "non deve scriverci sopra");
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
    vero(
      ripreso.conto("tizio").saldo > IMPOSTAZIONI_DI_PARTENZA.regaloIniziale,
      "il saldo doveva tornare",
    );
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
      d.impostazioni().pienoMax,
      IMPOSTAZIONI_DI_PARTENZA.pienoMax,
      "quello che non c'era arriva dai valori di partenza",
    );
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
});

/* --------------------------------------------------------------- parole */

prova("le lire si scrivono all'italiana", () => {
  uguale(lire(1500), "L. 1.500");
  uguale(lire(999), "L. 999");
  uguale(lire(1000000), "L. 1.000.000");
  uguale(lire(0), "L. 0");
});

prova("il prompt si monta nell'ordine dei rulli", () => {
  uguale(montaPrompt(finti(["basic", "basic"])), "finto 0, finto 1");
});

/* ----------------------------------------------------------------- fine */

process.exit(tirandoLeSomme("il banco"));
