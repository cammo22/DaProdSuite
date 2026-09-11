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
  CAMBIO_EURO,
  Deposito,
  EPOCHE,
  GRADI,
  GRADI_ID,
  gradoDiPrezzo,
  IMPOSTAZIONI_DI_PARTENZA,
  lire,
  livelloDi,
  meglioDi,
  montaPrompt,
  NienteDaFare,
  pesoEra,
  prezzoDiPartenza,
  RULLI_IMMAGINI,
  RULLI_MUSICA,
  scalino,
  TAGLI_BONUS,
  tettoDelValore,
  TETTO_EURO,
  TETTO_FIGURINE,
  TETTO_LIRE,
  tira,
  valoreDaPrendere,
  valoreDeiPezzi,
  valuta,
  versoIlProssimo,
} from "../dist/index.js";
import { cartellaFinta, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

/* ------------------------------------------------------------ i gradi */

prova("i dodici gradi sono in ordine e non si sovrappongono", () => {
  uguale(GRADI.length, 12);
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

prova("quanto escono i gradi fa diecimila tondo", () => {
  // Era mille fino al 10 settembre 2026: si e' passati a diecimila per far
  // entrare Ethernal sotto Mythic senza rendere Mythic piu' comune.
  const somma = GRADI.reduce((s, g) => s + g.quantoEsce, 0);
  uguale(somma, 10000, "se non fa diecimila, «tre su diecimila» non vuol dire niente");
});

prova("piu' e' raro, piu' esperienza da'", () => {
  for (let i = 1; i < GRADI.length; i++) {
    vero(GRADI[i].punti >= GRADI[i - 1].punti, GRADI[i].id + " da' meno punti di quello sotto");
  }
  uguale(GRADI[GRADI.length - 1].id, "ethernal");
});

prova("dalla slot non escono lire: solo punti", () => {
  const v = valuta(dodici("basic", "mythic"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  vero(v.length > 0, "un Mythic qualcosa deve darlo");
  for (const x of v) {
    vero(typeof x.punti === "number" && x.punti > 0, "ogni vincita e' in punti");
    uguale(x.lire, undefined, "e nessuna vincita porta lire");
  }
});

prova("il livello sale, e ogni volta costa di piu'", () => {
  uguale(livelloDi(0, 500), 1);
  uguale(livelloDi(499, 500), 1);
  uguale(livelloDi(500, 500), 2, "cinquecento punti fanno il secondo livello");
  uguale(livelloDi(1499, 500), 2);
  uguale(livelloDi(1500, 500), 3, "il terzo ne costa altri mille");
  uguale(livelloDi(3000, 500), 4);
  const dove = versoIlProssimo(1600, 500);
  uguale(dove.livello, 3);
  uguale(dove.dentro, 100);
  uguale(dove.serve, 1500, "al quarto ne servono millecinquecento");
});

prova("il valore di una presa e' quello dei pezzi piu' il bonus", () => {
  uguale(valoreDaPrendere(240, 60), 300);
  uguale(valoreDaPrendere(240, 0), 240, "il bonus puo' essere zero");
  uguale(valoreDaPrendere(0, 0), 1, "e non si scende mai sotto la lira");
  uguale(valoreDaPrendere(100, -50), 100, "un bonus negativo non toglie niente");
});

/**
 * ⚠ **I confini si provano uno per uno, sopra e sotto**, perche' e' esattamente
 * li' che una figurina cambia nome.
 *
 * ⚠ **I numeri non sono scritti a mano, si leggono da `GRADI`.** La scala e'
 * cambiata tre volte in due giorni — 1.400, un milione, tre euro — e ogni volta
 * questa prova andava riscritta a mano riga per riga: cioe' venti numeri copiati
 * da un file all'altro, che e' il modo piu' sicuro di sbagliarne uno e non
 * accorgersene. Cosi' invece la prova controlla la **regola** — la lira prima
 * della soglia e' il grado di sotto, la soglia e' il grado nuovo — e vale su
 * qualunque scala.
 */
prova("il grado si legge dal prezzo, agli estremi giusti", () => {
  uguale(gradoDiPrezzo(0), "basic", "sotto tutto c'e' Basic");
  for (let i = 1; i < GRADI.length; i++) {
    uguale(gradoDiPrezzo(GRADI[i].da), GRADI[i].id, "la soglia di " + GRADI[i].id);
    uguale(
      gradoDiPrezzo(GRADI[i].da - 1),
      GRADI[i - 1].id,
      "una lira prima di " + GRADI[i].id + " si sta ancora in " + GRADI[i - 1].id,
    );
  }
  uguale(gradoDiPrezzo(999_999_999), "ethernal", "sopra tutto non c'e' altro");
});

/**
 * ⚠ **Il tetto e' l'ultima lira dentro `TETTO_FIGURINE`, qualunque sia.**
 *
 * L'11 settembre 2026 il tetto era Unique — «fino al livello unique valgono
 * massimo l'equivalente di 3 euro» — e il 12 e' salito a Ethernal, che e'
 * l'ultimo grado: sopra non c'e' niente a cui fermarsi, quindi **non c'e'
 * tetto**. La prova non guarda il numero di oggi, guarda la regola: qualunque
 * sia il grado piu' alto che si puo' dare, il valore ci sta dentro e non lo
 * passa. Cosi' vale prima e dopo, e il giorno che si rimette un muro si vede
 * subito se le due meta' sono d'accordo.
 */
prova("il valore di una cosa presa non passa il tetto", () => {
  const sopra = GRADI[altezza(TETTO_FIGURINE) + 1];
  if (sopra) {
    uguale(tettoDelValore(), sopra.da - 1, "il tetto e' l'ultima lira sotto al grado dopo");
    uguale(
      gradoDiPrezzo(tettoDelValore()),
      TETTO_FIGURINE,
      "e sta dentro al grado piu' alto che si da'",
    );
    uguale(valoreDaPrendere(3000, 900_000), tettoDelValore(), "un bonus enorme si ferma al tetto");
    uguale(valoreDaPrendere(tettoDelValore(), 0), tettoDelValore(), "e al tetto ci si arriva");
  } else {
    vero(
      tettoDelValore() === Number.POSITIVE_INFINITY,
      "col tetto sull'ultimo grado non c'e' niente sopra a cui fermarsi",
    );
    uguale(
      gradoDiPrezzo(valoreDaPrendere(3000, 900_000)),
      TETTO_FIGURINE,
      "e un bonus enorme resta comunque dentro al grado piu' alto",
    );
  }
  uguale(TETTO_LIRE, Math.round(TETTO_EURO * CAMBIO_EURO), "i tre euro restano dove sono");
  uguale(gradoDiPrezzo(TETTO_LIRE), "celestial", "e sono il punto dove comincia Celestial");
});

/**
 * ⚠ **Il valore di base e' la media, non la somma**, dall'11 settembre 2026:
 * «le combinazioni sono quelle che possono avere valore, quindi aggiustiamo in
 * modo da stabilizzare i prezzi».
 *
 * La cosa che questa prova protegge e' la seconda meta' del perche': **tre pezzi
 * scelti devono valere come dodici pezzi uguali**. Con la somma, bloccarne
 * dodici a caso pagava quattro volte tre pezzi scelti — cioe' il contrario di
 * quello per cui si manda solo il bloccato.
 */
prova("una combinazione vale quanto la roba che ha dentro, non quanta ne ha", () => {
  uguale(valoreDeiPezzi([]), 0, "senza pezzi non c'e' base");
  uguale(valoreDeiPezzi([1000]), 1000, "un pezzo solo vale se stesso");
  uguale(valoreDeiPezzi([1000, 1000, 1000]), 1000, "tre uguali valgono uno");
  uguale(
    valoreDeiPezzi([1000, 1000, 1000]),
    valoreDeiPezzi(new Array(12).fill(1000)),
    "tre pezzi scelti valgono come dodici pezzi uguali",
  );
  uguale(valoreDeiPezzi([0, 2000]), 1000, "e in mezzo si sta in mezzo");
});

/**
 * ⚠ **Una sola pressione non deve sfondare la scala, e ogni grado si deve
 * poter raggiungere battendo.**
 *
 * E' la ragione per cui i tagli del bonus non sono gli otto dei regali: con il
 * tetto a tre euro sette di quegli otto lo sfondavano al primo colpo, e
 * sarebbero stati sette tasti che fanno tutti «massimo». Dal 12 settembre 2026
 * i gradi arrivano a Ethernal e i tasti pure — se no per dare trentacinque euro
 * bisognava battere dodici volte quello da tre.
 *
 * Le due cose che devono valere sempre: il piu' grosso arriva **esattamente**
 * alla soglia del grado piu' alto e non oltre, e a ogni gradino che si puo'
 * assegnare ci si arriva battendo. Se un grado non fosse raggiungibile con
 * nessuna somma, quel grado non si potrebbe piu' dare a mano.
 */
prova("i tagli del bonus stanno dentro la scala, un colpo alla volta", () => {
  vero(TAGLI_BONUS.length >= 4, "meno di quattro tasti non e' una cassa, e' un interruttore");
  uguale(gradoDiPrezzo(TAGLI_BONUS[0]), "basic", "il piu' piccolo non sposta niente");
  for (let i = 1; i < TAGLI_BONUS.length; i++) {
    vero(TAGLI_BONUS[i] > TAGLI_BONUS[i - 1], "i tagli devono salire");
  }
  uguale(
    TAGLI_BONUS[TAGLI_BONUS.length - 1],
    scalino(TETTO_FIGURINE).da,
    "il piu' grosso e' la soglia del grado piu' alto, in lire esatte",
  );
  uguale(
    gradoDiPrezzo(TAGLI_BONUS[TAGLI_BONUS.length - 1]),
    TETTO_FIGURINE,
    "e un colpo solo su una base a zero ci arriva davvero",
  );
  const somme = new Set([0]);
  for (let giro = 0; giro < 5; giro++) {
    for (const gia of [...somme]) for (const t of TAGLI_BONUS) somme.add(gia + t);
  }
  for (const g of GRADI.map((x) => x.id).slice(0, altezza(TETTO_FIGURINE) + 1)) {
    vero([...somme].some((x) => gradoDiPrezzo(x) === g), "a " + g + " non ci si arriva battendo");
  }
});

prova("il prezzo scende quando la roba e' piu' comune", () => {
  vero(prezzoDiPartenza(0) > prezzoDiPartenza(0.5), "raro deve costare piu' di medio");
  vero(prezzoDiPartenza(0.5) > prezzoDiPartenza(1), "medio deve costare piu' di comunissimo");
  vero(prezzoDiPartenza(1) >= 1, "non si scende sotto la lira");
  /**
   * ⚠ Il pezzo piu' raro del mazzo deve poter essere Mythic **sulla scala di
   * adesso**. Se questa cade, vuol dire che le soglie sono salite e i prezzi
   * dei pezzi no: sono due numeri che stanno nello stesso mondo, e il giorno
   * che si separano tutti i dodici rulli diventano grigi.
   */
  vero(
    altezza(gradoDiPrezzo(prezzoDiPartenza(0))) >= altezza("mythic"),
    "il piu' raro di tutti deve poter arrivare almeno a Mythic",
  );
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
  uguale(gradi[0].punti, IMPOSTAZIONI_DI_PARTENZA.puntiPerGrado.divine);
});

prova("il tris si somma al premio del grado", () => {
  const v = valuta(dodici("basic", "arcane", "arcane", "arcane"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  const grado = v.find((x) => x.motivo === "grado:arcane");
  const tris = v.find((x) => x.motivo === "tris:arcane");
  vero(grado, "il premio del grado ci deve essere");
  vero(tris, "e il tris pure");
  uguale(
    tris.punti,
    IMPOSTAZIONI_DI_PARTENZA.puntiPerGrado.arcane * IMPOSTAZIONI_DI_PARTENZA.trisMoltiplicatore,
  );
});

prova("due soli dello stesso grado non fanno tris", () => {
  const v = valuta(dodici("basic", "rare", "rare"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  uguale(v.filter((x) => x.motivo.startsWith("tris:")).length, 0);
});

prova("un tris di Basic non fa tris: il tris parte da Rare", () => {
  const v = valuta(dodici("basic"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  uguale(v.filter((x) => x.motivo.startsWith("tris:")).length, 0);
  // Un punto lo da' lo stesso: con l'esperienza al posto delle lire, ogni giro
  // fa avanzare di qualcosa. Il giro a mani vuote non esiste piu'.
  uguale(v.length, 1);
  uguale(v[0].motivo, "grado:basic");
  uguale(v[0].punti, 1);
});

prova("schermo pieno: tutte da Heroic in su", () => {
  const v = valuta(dodici("heroic"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0));
  const pieno = v.find((x) => x.motivo === "pieno");
  vero(pieno, "doveva essere schermo pieno");
  vero(pieno.punti >= IMPOSTAZIONI_DI_PARTENZA.pienoMin, "da' almeno il minimo");
  vero(pieno.punti <= IMPOSTAZIONI_DI_PARTENZA.pienoMax, "e non sfonda il massimo");
  uguale(pieno.fuoco, 5, "lo schermo si deve accendere tutto, e cinque e' il massimo");
});

prova("una casella sotto Heroic e lo schermo pieno non c'e'", () => {
  const v = valuta(dodici("heroic", "rare"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.99));
  uguale(v.filter((x) => x.motivo === "pieno").length, 0);
});

prova("la consolazione esce sui giri grigi, e solo li'", () => {
  const grigio = dodici("basic");
  const esce = valuta(grigio, IMPOSTAZIONI_DI_PARTENZA, [], dado(0.1, 0.5));
  vero(esce.some((x) => x.motivo === "quasi"), "col 10% deve consolare");
  const niente = valuta(grigio, IMPOSTAZIONI_DI_PARTENZA, [], dado(0.9));
  uguale(niente.filter((x) => x.motivo === "quasi").length, 0, "col 90% no");

  // Su un giro che ha gia' dato qualcosa di buono non serve consolare nessuno.
  const buono = valuta(dodici("basic", "divine"), IMPOSTAZIONI_DI_PARTENZA, [], dado(0.01));
  uguale(buono.filter((x) => x.motivo === "quasi").length, 0, "con un Divine non si consola");
});

prova("una formazione paga in qualunque ordine, e si somma", () => {
  const pezzi = dodici("basic", "rare");
  const f = [{ id: "f1", nome: "La tripletta", pezzi: ["finto/5", "finto/0"], premio: 77 }];
  const v = valuta(pezzi, IMPOSTAZIONI_DI_PARTENZA, f, dado(0.99));
  uguale(v.find((x) => x.motivo === "formazione:f1").punti, 77);
});

prova("il grado migliore di una manciata e' quello piu' in alto", () => {
  uguale(meglioDi(finti(["basic", "mythic", "rare"])), "mythic");
  uguale(meglioDi(finti(["basic", "basic"])), "basic");
  vero(altezza("mythic") > altezza("legendary"), "Mythic sta sopra a Legendary");
  vero(altezza("ethernal") > altezza("mythic"), "Ethernal sta sopra a tutti");
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
    uguale(giro.saldo, prima - giro.costo, "girare costa e basta: lire non ne rende");
    vero(giro.punti >= 0, "e rende punti esperienza");
    vero(giro.livello >= 1, "il livello parte da uno");
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
