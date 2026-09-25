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
  VERDETTI,
  azzeraPartita,
  ricarica,
  domandaPer,
  segnaGiudizio,
  bancaNuova,
  versaInBanca,
  segnaAttivita,
  apriIScaduti,
  dividi,
  estrai,
  chiaveGiorno,
  chiaveSettimana,
  chiaveMese,
  quandoSiApre,
  vetrinaBanca,
  FONDO_DI_PARTENZA,
  MINIMI_BANCA,
  rispondi,
  COSTI_STUDIO,
  promptStudio,
  LIRE_PER_EURO,
  TAGLI_LIRE,
  RICARICA_MIN,
  lireDaEuro,
  euroDaLire,
  incasso,
  bonusFine,
  incassaGioco,
  portafoglio,
  gradoBanca,
  alzaCassetto,
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

prova("1.4.8: entrare e' gratis, si paga ricaricando", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", -d.conto("pino").saldo, false);
    entra(d, "pino", "claw", ADESSO);
    uguale(d.conto("pino").saldo, 0);
    let caduta = false;
    try {
      ricarica(d, "pino", "claw", RICARICA_MIN, ADESSO);
    } catch (e) {
      caduta = e instanceof NienteDaFare;
    }
    vero(caduta, "senza lire la ricarica deve dire di no, in italiano");
  }),
);

/* ---------------------------------------------- lire ed euro (1.4.8) -- */

prova("1 € = L. 1.936,27, e i tagli sono quelli chiesti in euro", () => {
  uguale(LIRE_PER_EURO, 1936.27);
  uguale(TAGLI_LIRE.join(","), "387,1936,9681,38725,96814,387254,968135");
  uguale(lireDaEuro(1), 1936);
  uguale(euroDaLire(1936.27), 1);
  uguale(RICARICA_MIN, 387);
});

prova("l'incasso: la fetta di DaProd e' il 10%, e oltre il tetto resta nel gioco", () => {
  const a = incasso({ valore: 1000, messo: 1000, giaPreso: 0, moltMax: 4 });
  uguale(a.preso, 1000);
  uguale(a.fetta, 100);
  uguale(a.netto, 900);
  const b = incasso({ valore: 10_000, messo: 1000, giaPreso: 0, moltMax: 3 });
  uguale(b.preso, 3000, "al massimo tre volte il messo");
  uguale(b.oltre, 7000);
  const c = incasso({ valore: 10_000, messo: 1000, giaPreso: 2500, moltMax: 3 });
  uguale(c.preso, 500, "il tetto conta quello gia' preso");
});

prova("il premio della velocita': pieno entro mezz'ora, zero dopo tre ore", () => {
  uguale(bonusFine(1000, 10), 500);
  uguale(bonusFine(1000, 30), 500);
  uguale(bonusFine(1000, 105), 250);
  uguale(bonusFine(1000, 200), 0);
});

prova("la cassa di un gioco: ricarica, incasso, fine partita e ricomincia", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 10_000;
    const xp0 = d.conto("pino").esperienza;
    ricarica(d, "pino", "claw", 1936, ADESSO);
    uguale(d.conto("pino").saldo, 10_000 - 1936);
    vero(d.conto("pino").esperienza > xp0, "ricaricare da' esperienza");
    const r = incassaGioco(d, "pino", "claw", 3000, { fine: true }, ADESSO + 20 * 60_000);
    uguale(r.preso, 3000);
    uguale(r.bonus, 968, "finita in 20 minuti: meta' del messo");
    uguale(r.fetta, Math.floor((3000 + 968) * 0.1));
    uguale(d.conto("pino").saldo, 10_000 - 1936 + r.netto);
    const cassa = d.conto("pino").giochi.claw;
    uguale(cassa.messo, 0, "la partita si chiude");
    uguale(cassa.finite, 1);
    uguale(cassa.record, 20);
    vero(d.statoBanca().fette === r.fetta, "la fetta va nella Banca");
    uguale(d.conto("pino").movimenti[0].perche, "partita finita a Claw Machine");
  }),
);

prova("senza aver messo niente non si incassa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    let caduta = false;
    try {
      incassaGioco(d, "pino", "dozer", 5000, {}, ADESSO);
    } catch (e) {
      caduta = e instanceof NienteDaFare;
    }
    vero(caduta);
  }),
);

prova("Neon conta gli ordini di grandezza, non le trenta cifre", () => {
  const v = GIOCHI_SALA.neon.valore(1e15, 1000);
  vero(v > 0 && v < 3000, String(v));
  uguale(GIOCHI_SALA.neon.valore(1e5, 1000), 0);
});

prova("il portafoglio: andamento, entrate e uscite per cosa, resa dei giochi", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 10_000;
    ricarica(d, "pino", "dozer", 1936, ADESSO);
    incassaGioco(d, "pino", "dozer", 3872, {}, ADESSO);
    const p = portafoglio(d.conto("pino"), d.impostazioni().perIlLivello);
    uguale(p.saldo, d.conto("pino").saldo);
    const dozer = p.giochi.find((g) => g.id === "dozer");
    uguale(dozer.messo, 1936);
    uguale(dozer.tornato, 3485);
    uguale(dozer.resa, 80);
    vero(p.uscite.some((x) => x.perche === "ricariche nei giochi"), JSON.stringify(p.uscite));
    vero(p.entrate.some((x) => x.perche === "incassi dai giochi"), JSON.stringify(p.entrate));
    vero(p.andamento.length === 1, "un giorno di andamento");
  }),
);

prova("la Banca ha un grado, e chi comanda alza un cassetto dalla riserva", () => {
  uguale(gradoBanca(0).nome, "Salvadanaio");
  uguale(gradoBanca(300_000).nome, "Cassa di quartiere");
  const b = bancaNuova(ADESSO);
  const r = b.riserva;
  uguale(alzaCassetto(b, "giorno", 5000), 5000);
  uguale(b.riserva, r - 5000);
  uguale(b.cassetti.giorno.lire, 5000);
  uguale(alzaCassetto(b, "mese", 10 ** 12), r - 5000, "non piu' della riserva");
});

prova("chi comanda si vede fra i giocatori, in cima", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 1000;
    d.conto("anna").saldo = 1000;
    const c = { nomeDi: (id) => id, gente: () => [{ id: "anna" }, { id: "pino" }] };
    const r = rispondi(d, { id: "pino", nome: "pino", admin: true }, c, "GET", "/gente", {});
    uguale(r.codice, 200);
    uguale(r.dati.gente[0].chi, "pino");
    uguale(r.dati.gente[0].io, true);
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
    vero(p > 0, "venti giri danno qualche punto: " + p);
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

prova("il giudice fa sempre la stessa domanda, con le quattro risposte", () => {
  const d = domandaPer({ id: "x", titolo: "Tre pezzi", tavolo: "immagini", era: "80", prompt: "a neon harbour at dawn" });
  uguale(d.opzioni.length, 4);
  vero(d.stato.includes("a neon harbour at dawn"), "il prompt e' nello stato");
  vero(d.stato.includes("80s"), "l'epoca e' nello stato");
  uguale(d.libreria, undefined);
});

prova("il parere si scrive sulla figurina, normalizzato, e non decide niente", () =>
  conCartella((file) => {
    const dep = new Deposito(file);
    const c = dep.aggiungi({ id: "g1", tipo: "prompt", titolo: "Prova", impronta: "p1", prompt: "x", daChi: "pino", quando: ADESSO, stato: "in-attesa" });
    const risposta = {};
    risposta[VERDETTI[0].detto] = 2;
    risposta[VERDETTI[3].detto] = 6;
    risposta["una risposta che non esiste"] = 50;
    const g = segnaGiudizio(dep, c.id, risposta, ADESSO);
    uguale(g.meglio, "vetrina");
    uguale(g.probabilita.slop, 0.25);
    uguale(g.probabilita.vetrina, 0.75);
    dep.scriviOra();
    const di = new Deposito(file);
    uguale(di.perId(c.id).giudizio.meglio, "vetrina");
    uguale(di.perId(c.id).stato, "in-attesa");
  }),
);

prova("la ricarica spende quante lire si sceglie, almeno il gettone, e brucia in Borsa", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.muovi("pino", 5000);
    const r = ricarica(d, "pino", "dozer", 1200);
    uguale(r.lire, 1200);
    uguale(r.saldo, d.conto("pino").saldo);
    let poco = false;
    try { ricarica(d, "pino", "dozer", 20); } catch (e) { poco = e instanceof NienteDaFare; }
    vero(poco, "sotto il gettone dice di no");
    let troppo = false;
    try { ricarica(d, "pino", "dozer", 10_000_000); } catch (e) { troppo = e instanceof NienteDaFare; }
    vero(troppo, "piu' del saldo dice di no");
  }),
);

prova("chi comanda chiude una partita: i punti vanno via senza diventare lire", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    segnaPunti(d, "pino", "dozer", 5000, ADESSO);
    const prima = d.conto("pino").saldo;
    const e = azzeraPartita(d, "pino", ADESSO);
    vero(e.via > 0, "c'erano punti");
    uguale(d.conto("pino").partita.punti, 0);
    uguale(d.conto("pino").saldo, prima);
  }),
);


/* ---------------------------------------------------- la Banca DaProd -- */

const GIORNO = 24 * ORA;

prova("la Banca: i periodi all'ora di Roma", () => {
  uguale(chiaveGiorno(ADESSO), "2026-09-22");
  uguale(chiaveSettimana(ADESSO), "2026-09-21", "la settimana comincia il lunedi'");
  uguale(chiaveMese(ADESSO), "2026-09");
  // Le 23:30 di Roma del 22 sono ancora il 22 (UTC+2 d'estate).
  uguale(chiaveGiorno(Date.UTC(2026, 8, 22, 21, 30)), "2026-09-22");
  uguale(chiaveGiorno(Date.UTC(2026, 8, 22, 22, 30)), "2026-09-23");
  const apre = quandoSiApre("giorno", ADESSO);
  uguale(chiaveGiorno(apre), "2026-09-23", "si apre col giorno dopo");
  uguale(chiaveGiorno(apre - 1), "2026-09-22");
});

prova("la Banca: le lire spese si dividono nei cassetti, senza perderne una", () => {
  const b = bancaNuova(ADESSO);
  uguale(b.riserva, FONDO_DI_PARTENZA);
  versaInBanca(b, 1001);
  uguale(b.cassetti.giorno.lire, 400);
  uguale(b.cassetti.settimana.lire, 300);
  uguale(b.cassetti.mese.lire, 200);
  uguale(b.riserva, FONDO_DI_PARTENZA + 101, "il resto e gli spiccioli alla riserva");
  uguale(b.entrate, 1001);
});

prova("la Banca: dividere in proporzione, e gli spiccioli avanzano", () => {
  const { vincite, avanzo } = dividi(1000, { a: 2, b: 1, c: 0 });
  uguale(vincite.length, 2, "chi non ha fatto niente non prende");
  uguale(vincite[0].chi, "a");
  uguale(vincite[0].lire, 666);
  uguale(vincite[1].lire, 333);
  uguale(avanzo, 1);
});

prova("la Banca: il jackpot si estrae coi biglietti dell'attivita'", () => {
  uguale(estrai({ a: 1, b: 3 }, () => 0.1), "a");
  uguale(estrai({ a: 1, b: 3 }, () => 0.9), "b");
  uguale(estrai({}, () => 0.5), null);
});

prova("la Banca: a mezzanotte il premio del giorno va a chi ha giocato", () => {
  const b = bancaNuova(ADESSO);
  versaInBanca(b, 10_000);
  segnaAttivita(b, "pino", 30);
  segnaAttivita(b, "rosa", 10);
  uguale(apriIScaduti(b, ADESSO + ORA, dado(0.5)).length, 0, "prima della mezzanotte non si apre niente");
  const fatte = apriIScaduti(b, ADESSO + GIORNO, dado(0.5));
  uguale(fatte.length, 1, "solo il giorno: settimana e mese sono ancora aperti");
  uguale(fatte[0].cassetto, "giorno");
  const pino = fatte[0].vincite.find((v) => v.chi === "pino");
  const rosa = fatte[0].vincite.find((v) => v.chi === "rosa");
  uguale(pino.lire, 3000);
  uguale(rosa.lire, 1000);
  uguale(b.cassetti.giorno.lire, 0, "il cassetto nuovo parte vuoto");
  uguale(b.cassetti.giorno.chiave, chiaveGiorno(ADESSO + GIORNO));
  vero(b.cassetti.settimana.attivita.pino > 0, "l'attivita' della settimana resta");
});

prova("la Banca: un premio con pochi soldi lo completa la riserva, fino al minimo", () => {
  const b = bancaNuova(ADESSO);
  versaInBanca(b, 100);
  segnaAttivita(b, "pino", 1);
  const riserva = b.riserva;
  const [a] = apriIScaduti(b, ADESSO + GIORNO, dado(0.5));
  uguale(a.vincite[0].lire, MINIMI_BANCA.giorno);
  uguale(b.riserva, riserva - (MINIMI_BANCA.giorno - 40));
});

prova("la Banca: se nessuno ha giocato il montepremi passa al giorno dopo", () => {
  const b = bancaNuova(ADESSO);
  versaInBanca(b, 1000);
  uguale(apriIScaduti(b, ADESSO + GIORNO, dado(0.5)).length, 0);
  uguale(b.cassetti.giorno.lire, 400, "resta nel cassetto");
});

prova("la Banca: la settimana va ai dieci piu' attivi, il mese a uno solo", () => {
  const b = bancaNuova(ADESSO);
  versaInBanca(b, 100_000);
  for (let i = 0; i < 12; i++) segnaAttivita(b, "g" + i, i + 1);
  // Lunedi' 28 settembre: si chiude la settimana (e il giorno).
  const lunedi = Date.UTC(2026, 8, 28, 8, 0);
  const sett = apriIScaduti(b, lunedi, dado(0.5)).find((a) => a.cassetto === "settimana");
  uguale(sett.vincite.length, 10);
  vero(!sett.vincite.some((v) => v.chi === "g0" || v.chi === "g1"), "i due meno attivi restano fuori");
  // Primo ottobre: il super jackpot.
  segnaAttivita(b, "pino", 5);
  const mese = apriIScaduti(b, Date.UTC(2026, 9, 1, 8, 0), dado(0.99)).find((a) => a.cassetto === "mese");
  uguale(mese.vincite.length, 1, "uno solo");
  vero(mese.vincite[0].lire >= MINIMI_BANCA.mese, "almeno il minimo");
});

prova("la Banca nel deposito: spendere versa, e il premio arriva sul conto", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 5000;
    d.muovi("pino", -1000);
    const b = d.statoBanca();
    uguale(b.cassetti.giorno.lire, 400, "la ricarica e' entrata nella Banca");
    vero(b.cassetti.giorno.attivita.pino > 0, "e conta come attivita'");
    const saldo = d.conto("pino").saldo;
    // Il cassetto si apre quando qualcuno guarda, il giorno dopo.
    b.cassetti.giorno.chiave = "2000-01-01";
    const fatte = d.apriLaBanca(Date.now(), () => 0.5);
    vero(fatte.length >= 1);
    vero(d.conto("pino").saldo > saldo, "il premio e' sul conto");
    uguale(d.conto("pino").ultimoPremio.cassetto, "giorno");
    const v = vetrinaBanca(d.statoBanca(), "pino", Date.now());
    uguale(v.cassetti.length, 3);
    vero(v.ultime.length >= 1, "l'apertura resta nella storia");
  }),
);

prova("la Banca nel deposito: un file di prima si apre col fondo di DaProd", () =>
  conCartella((file) => {
    const primo = new Deposito(file);
    primo.conto("pino");
    primo.scriviOra();
    const d = new Deposito(file);
    uguale(d.statoBanca().riserva, FONDO_DI_PARTENZA);
  }),
);

/* ----------------------------------------------------- lo Studio (1.4.5) -- */

const PINO = { id: "pino", nome: "pino", admin: false };
function contornoStudio() {
  const chieste = [];
  const stati = {};
  const frutti = {};
  return {
    chieste, stati, frutti,
    nomeDi: (id) => id,
    genera: (_chi, tavolo, cosa) => { const id = "r" + (chieste.length + 1); chieste.push({ id, tavolo, ...cosa }); return { id }; },
    ritocca: (_chi, lib, istruzione, veloce) => (lib === "mia" ? (chieste.push({ id: "t1", lib, istruzione, veloce }), { id: "t1" }) : null),
    statoDi: (id) => stati[id] ?? "in-attesa",
    fruttiDi: (id) => frutti[id] ?? [],
  };
}

prova("lo Studio: la scritta va tra virgolette e senza virgolette sue", () => {
  const p = promptStudio("un bar di Napoli", 'BAR "DAPROD"');
  vero(p.includes('"BAR DAPROD"'), p);
  uguale(promptStudio("solo testo", ""), "solo testo");
});

prova("lo Studio: crea paga il veloce, porta forma e velocita' a chi genera, e la spesa va in Banca", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 5000;
    const c = contornoStudio();
    const r = rispondi(d, PINO, c, "POST", "/studio/crea", { testo: "una vespa rossa", scritta: "CIAO", forma: "16:9", veloce: true });
    uguale(r.codice, 200, JSON.stringify(r.dati));
    uguale(d.conto("pino").saldo, 5000 - COSTI_STUDIO.veloce);
    uguale(c.chieste[0].forma, "16:9");
    uguale(c.chieste[0].veloce, true);
    vero(c.chieste[0].prompt.includes('"CIAO"'), "la scritta arriva al modello");
    uguale(d.statoBanca().entrate, COSTI_STUDIO.veloce, "la spesa e' entrata nella Banca");
    const fine = rispondi(d, PINO, c, "POST", "/studio/crea", { testo: "un faro", veloce: false });
    uguale(fine.codice, 200);
    uguale(d.conto("pino").saldo, 5000 - COSTI_STUDIO.veloce - COSTI_STUDIO.fine);
  }),
);

prova("lo Studio: senza lire non parte, e non si paga niente", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 10;
    const c = contornoStudio();
    const r = rispondi(d, PINO, c, "POST", "/studio/crea", { testo: "una vespa rossa" });
    uguale(r.codice, 409);
    uguale(c.chieste.length, 0, "la scheda video non si disturba");
    uguale(d.conto("pino").saldo, 10);
  }),
);

prova("lo Studio: si ritocca solo una cosa propria, e se chi ospita dice di no non si paga", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 5000;
    const c = contornoStudio();
    const no = rispondi(d, PINO, c, "POST", "/studio/ritocca", { libreria: "di-un-altro", istruzione: "fallo di notte" });
    uguale(no.codice, 404);
    uguale(d.conto("pino").saldo, 5000);
    const si = rispondi(d, PINO, c, "POST", "/studio/ritocca", { libreria: "mia", istruzione: "fallo di notte" });
    uguale(si.codice, 200);
    uguale(d.conto("pino").saldo, 5000 - COSTI_STUDIO.ritocco);
  }),
);

prova("lo Studio: una richiesta scartata da chi comanda si rimborsa, una volta sola", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 5000;
    const c = contornoStudio();
    rispondi(d, PINO, c, "POST", "/studio/crea", { testo: "una vespa rossa" });
    c.stati.r1 = "scartata";
    const g = rispondi(d, PINO, c, "GET", "/studio", {});
    uguale(g.dati.rimborsate, COSTI_STUDIO.veloce);
    uguale(d.conto("pino").saldo, 5000);
    const di_nuovo = rispondi(d, PINO, c, "GET", "/studio", {});
    uguale(di_nuovo.dati.rimborsate, 0, "non due volte");
    uguale(d.conto("pino").saldo, 5000);
  }),
);

prova("lo Studio: quando e' pronta, il quaderno porta l'immagine", () =>
  conCartella((file) => {
    const d = new Deposito(file);
    d.conto("pino").saldo = 5000;
    const c = contornoStudio();
    rispondi(d, PINO, c, "POST", "/studio/crea", { testo: "una vespa rossa" });
    c.frutti.r1 = [{ id: "f1", titolo: "vespa", mime: "image/png", url: "/libreria/file/f1" }];
    const g = rispondi(d, PINO, c, "GET", "/studio", {});
    uguale(g.dati.lavori[0].stato, "pronta");
    uguale(g.dati.lavori[0].frutti[0].id, "f1");
    const dado = rispondi(d, PINO, c, "GET", "/studio/dado", {});
    vero(dado.dati.testo.length > 10 && dado.dati.nomi.length === 6, JSON.stringify(dado.dati));
  }),
);

process.exit(tirandoLeSomme("La partita, la Borsa e la sala d'arcade"));
