/**
 * Le prove della partita, della Borsa della Lira e della sala d'arcade.
 *
 * ⚠ Nuove nella 1.4.0 (CONCETTI.md § 18). Il tempo e il caso si passano da
 * fuori: una Borsa che dipende dall'ora si prova fissando l'ora, e una carta
 * che esce una volta su quattro si prova col dado in mano.
 *
 *     pnpm --filter @daprod/giochi build
 *     node packages/giochi/scripts/prova-borsa.mjs
 */

import {
  conMovimento,
  contoDelloStacco,
  Deposito,
  entra,
  evento,
  fetta,
  giocaCarta,
  GIOCHI_SALA,
  listino,
  MANO_MAX,
  NienteDaFare,
  onda,
  QUOTA_MAX,
  QUOTA_MIN,
  quotazione,
  segnaPunti,
  stacca,
  statoSala,
  TETTO_STACCO_GIORNO,
  tira,
} from "../dist/index.js";
import { conCartella, dado, prova, tirandoLeSomme, uguale, vero } from "./attrezzi.mjs";

const ORA = 3_600_000;
// Un martedi' di settembre, a mezzogiorno di Roma: un'ora fissa e basta.
const ADESSO = Date.UTC(2026, 8, 22, 10, 0, 0);

/* ------------------------------------------------------------ la borsa -- */

prova("l'onda e' la stessa per la stessa ora, e resta piccola", () => {
  uguale(onda(ADESSO), onda(ADESSO + 60_000), "due istanti della stessa ora");
  for (let h = 0; h < 48; h++) {
    const o = onda(ADESSO + h * ORA);
    vero(o > 0.9 && o < 1.1, "l'onda all'ora " + h + " esce dal ±10%: " + o);
  }
});

prova("senza movimenti la quotazione e' la base per l'onda (e la folla vuota)", () => {
  const q = quotazione([], ADESSO);
  uguale(q, Math.round(onda(ADESSO) * 1000) / 1000);
});

prova("chi brucia fa salire la Lira, chi conia la fa scendere", () => {
  let ore = [];
  ore = conMovimento(ore, "pino", -5000, ADESSO);
  const su = quotazione(ore, ADESSO);
  let altre = [];
  altre = conMovimento(altre, "pino", 5000, ADESSO);
  const giu = quotazione(altre, ADESSO);
  vero(su > giu, "bruciare " + su + " contro coniare " + giu);
  vero(su > quotazione([], ADESSO), "bruciare deve alzare sopra il niente");
  vero(giu < quotazione([], ADESSO), "coniare deve abbassare sotto il niente");
});

prova("la folla tira su, ma poco", () => {
  let ore = [];
  for (let i = 0; i < 10; i++) ore = conMovimento(ore, "persona" + i, 0, ADESSO);
  const piena = quotazione(ore, ADESSO);
  const vuota = quotazione([], ADESSO);
  vero(piena > vuota, "dieci persone devono alzare");
  vero(piena / vuota < 1.2, "ma meno del 20%: " + piena / vuota);
});

prova("la quotazione sta nel recinto anche coi numeri pazzi", () => {
  let ore = conMovimento([], "pino", -1e12, ADESSO);
  vero(quotazione(ore, ADESSO) <= QUOTA_MAX);
  ore = conMovimento([], "pino", 1e12, ADESSO);
  vero(quotazione(ore, ADESSO) >= QUOTA_MIN);
});

prova("i movimenti di piu' di un giorno fa non contano, e dopo una settimana escono", () => {
  let ore = conMovimento([], "pino", -5000, ADESSO - 30 * ORA);
  uguale(quotazione(ore, ADESSO), quotazione([], ADESSO), "trenta ore fa non conta");
  ore = conMovimento(ore, "pino", 0, ADESSO + 200 * ORA);
  uguale(ore.length, 1, "le ore vecchie di piu' di 168 se ne vanno");
});

prova("la candela dell'ora: apre, chiude, massimo e minimo", () => {
  let ore = conMovimento([], "pino", -3000, ADESSO);
  ore = conMovimento(ore, "pino", 6000, ADESSO + 60_000);
  const o = ore[0];
  vero(o.max >= o.chiude && o.min <= o.chiude && o.max >= o.min, JSON.stringify(o));
  uguale(o.coniate, 6000);
  uguale(o.bruciate, 3000);
  const l = listino(ore, ADESSO + 60_000);
  uguale(l.candele.length, 1);
  uguale(l.giocatori24, 1);
});

/* ------------------------------------------------------------- lo stacco -- */

prova("la fetta: 10% a livello 1, un punto ogni due livelli, fino a 25%", () => {
  uguale(fetta(1), 0.1);
  uguale(fetta(2), 0.1);
  uguale(fetta(3), 0.11);
  uguale(fetta(99), 0.25);
});

prova("lo stacco fa il conto, e si ferma al tetto del giorno", () => {
  uguale(contoDelloStacco(1000, 1, 0.1, 0), { lire: 100, puntiUsati: 1000, avanzati: 0 });
  const pieno = contoDelloStacco(100_000, 2, 0.25, TETTO_STACCO_GIORNO - 500);
  uguale(pieno.lire, 500, "restano 500 lire di spazio oggi");
  vero(pieno.avanzati > 0, "i punti in piu' restano nella partita");
  uguale(pieno.puntiUsati + pieno.avanzati, 100_000);
});

/* ------------------------------------------------------ sul conto vero -- */

prova("entrare costa il gettone, e la Borsa lo vede bruciare", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 1000);
    const saldo = d.conto("pino").saldo;
    const prima = d.borsa().reduce((s, o) => s + o.bruciate, 0);
    entra(d, "pino", "dozer", ADESSO);
    uguale(d.conto("pino").saldo, saldo - GIOCHI_SALA.dozer.ingresso);
    const dopo = d.borsa().reduce((s, o) => s + o.bruciate, 0);
    vero(dopo - prima === GIOCHI_SALA.dozer.ingresso, "bruciate " + prima + " → " + dopo);
  }),
);

prova("senza lire non si entra", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    // Il regalo di benvenuto se ne va: resta un conto vuoto.
    d.muovi("pino", -d.conto("pino").saldo, false);
    let caduta = false;
    try {
      entra(d, "pino", "claw", ADESSO);
    } catch (e) {
      caduta = e instanceof NienteDaFare;
    }
    vero(caduta, "doveva dire di no, in italiano");
  }),
);

prova("azzerare un portafoglio non muove la Borsa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 1000);
    const prima = JSON.stringify(d.borsa());
    d.muovi("pino", -1000, false);
    uguale(JSON.stringify(d.borsa()), prima);
  }),
);

prova("i punti d'arcade passano dal cambio e dai tetti", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const uno = segnaPunti(d, "pino", "dozer", 500, ADESSO);
    uguale(uno.entrati, 100, "500 gettoni della Dozer sono 100 punti");
    const troppi = segnaPunti(d, "pino", "dozer", 1e9, ADESSO);
    uguale(troppi.entrati, GIOCHI_SALA.dozer.tettoMinuto - 100, "nel minuto non si passa il tetto");
    const dopo = segnaPunti(d, "pino", "dozer", 500, ADESSO + 61_000);
    uguale(dopo.entrati, 100, "il minuto dopo si riparte");
    uguale(d.conto("pino").partita.punti, GIOCHI_SALA.dozer.tettoMinuto + 100);
  }),
);

prova("Neon conta gli ordini di grandezza", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    uguale(segnaPunti(d, "pino", "neon", 999, ADESSO).entrati, 180, "mille lire, tre ordini: 180");
  }),
);

prova("una cosa grossa da' una carta, e una sola al minuto", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    const primo = evento(d, "pino", "claw", "shiny", dado(0.01), ADESSO);
    vero(primo.carta, "lo shiny da' sempre una carta");
    vero(["arcane", "heroic", "unique", "celestial", "divine", "epic", "legendary", "mythic", "ethernal"].includes(primo.carta.grado), "almeno Arcane: " + primo.carta.grado);
    uguale(d.conto("pino").mano.length, 1);
    const subito = evento(d, "pino", "claw", "shiny", dado(0.01), ADESSO + 10_000);
    uguale(subito.perche, "presto");
    const niente = evento(d, "pino", "claw", "presa", dado(0.99), ADESSO + 61_000);
    uguale(niente.perche, "niente", "una presa col dado alto non da' niente");
  }),
);

prova("con la mano piena la carta diventa punti", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    for (let i = 0; i < MANO_MAX; i++) evento(d, "pino", "neon", "eruzione", dado(0.01), ADESSO + i * 61_000);
    uguale(d.conto("pino").mano.length, MANO_MAX);
    const prima = d.conto("pino").partita?.punti ?? 0;
    const in13 = evento(d, "pino", "neon", "eruzione", dado(0.01), ADESSO + 20 * 61_000);
    uguale(in13.perche, "mano-piena");
    vero(d.conto("pino").partita.punti > prima, "i punti al posto della carta");
  }),
);

prova("una carta giocata esce dalla mano, e la slot la accetta bloccata", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 500);
    const { carta } = evento(d, "pino", "dozer", "jackpot", dado(0.01), ADESSO);
    const pezzo = giocaCarta(d, "pino", carta.id);
    uguale(d.conto("pino").mano.length, 0);
    // Si gira col pezzo bloccato sul suo rullo: deve restare quello.
    const tavoli = ["musica", "immagini"];
    let girato = null;
    for (const t of tavoli) {
      try {
        const giro = tira(d, "pino", t, "sempre", [], dado(0.5));
        const i = giro.pezzi.findIndex((p) => p.rullo === pezzo.rullo);
        if (i < 0) continue;
        const bloccati = giro.pezzi.map((_, k) => (k === i ? pezzo.id : null));
        girato = tira(d, "pino", t, "sempre", bloccati, dado(0.5));
        uguale(girato.pezzi[i].id, pezzo.id, "la carta resta sul suo rullo");
        break;
      } catch (e) {
        if (!(e instanceof NienteDaFare)) throw e;
      }
    }
    vero(girato, "la carta doveva stare su un rullo di un tavolo");
    let caduta = false;
    try {
      giocaCarta(d, "pino", carta.id);
    } catch {
      caduta = true;
    }
    vero(caduta, "una carta giocata non si gioca due volte");
  }),
);

prova("la slot mette i suoi punti nella partita, e lo stacco li fa lire", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 1000);
    for (let i = 0; i < 20; i++) tira(d, "pino", "musica", "sempre", [], Math.random);
    const p = d.conto("pino").partita.punti;
    vero(p >= 20, "venti giri danno almeno venti punti: " + p);
    const saldo = d.conto("pino").saldo;
    const s = stacca(d, "pino", ADESSO);
    uguale(s.saldo, saldo + s.lire);
    uguale(d.conto("pino").partita.punti, s.avanzati);
    vero(s.fetta === 0.1 || s.fetta > 0.1, "la fetta c'e'");
    const st = statoSala(d, "pino", ADESSO);
    uguale(st.ultimoStacco.lire, s.lire);
    uguale(st.tettoRimasto, TETTO_STACCO_GIORNO - s.lire);
  }),
);

prova("staccare senza punti dice di no", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    let caduta = false;
    try {
      stacca(d, "pino", ADESSO);
    } catch (e) {
      caduta = e instanceof NienteDaFare;
    }
    vero(caduta);
  }),
);

prova("la Borsa si salva e si rilegge", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 1000);
    d.scriviOra();
    const di = new Deposito(file);
    vero(di.borsa().length >= 1, "la Borsa e' tornata dal disco");
  }),
);

process.exit(tirandoLeSomme("La partita, la Borsa e la sala d'arcade"));
