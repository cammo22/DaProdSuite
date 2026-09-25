/**
 * La Borsa della Lira e le regole della partita — funzioni pure.
 *
 * ⚠ Nuovo nella 1.4.0: vedi CONCETTI.md § 18. Qui dentro niente disco e niente
 * rete (§ 16): chi tiene il conto e' `sala.ts`, che usa queste regole sul
 * deposito. Il tempo e il caso si passano da fuori, cosi' le prove li fissano.
 */

import type { Caso } from "./regole";
import type { Grado, OraDiBorsa } from "./tipi";

/* ------------------------------------------------------------- la borsa -- */

/** Quante lire vale un punto, quando nessuno ha ancora mosso niente. */
export const QUOTA_BASE = 1;
/** Il recinto della quotazione: largo da vedersi muovere, stretto da non rompere. */
export const QUOTA_MIN = 0.25;
export const QUOTA_MAX = 4;
/** Quante ore tiene la Borsa: una settimana, un'ora per riga. */
export const ORE_TENUTE = 168;
const ORA_MS = 3_600_000;
const GIORNO_MS = 24 * ORA_MS;

/**
 * Quanto conta chi spende contro chi incassa. A 0,6 la Lira puo' salire fino a
 * una volta e sei o scendere fino a quattro decimi solo per questo.
 */
const PESO_PRESSIONE = 0.6;
/**
 * Il cuscino sotto al rapporto: con poche lire mosse, due giri da dieci lire
 * non devono far fare alla Lira un salto del sessanta per cento.
 */
const CUSCINO = 2_000;
/** Quanto tira su la folla: dieci persone diverse, piu' quindici per cento. */
const PESO_FOLLA = 0.15;

/** L'inizio dell'ora di un istante. */
export function oraDi(t: number): number {
  return Math.floor(t / ORA_MS) * ORA_MS;
}

/** Il giorno di un istante, all'ora di casa: e' quello del tetto degli stacchi. */
export function giornoDi(t: number): string {
  return new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

/**
 * Un numero fra 0 e 1 che dipende solo da un intero: sempre lo stesso per la
 * stessa ora. Serve all'onda, che deve essere uguale su tutti i telefoni.
 */
function rumoreDi(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/**
 * L'onda (§ 18.3): qualche punto percentuale su e giu', decisa dall'ora. La
 * sera un po' piu' su, la mattina un po' piu' giu', e un tremolio che cambia
 * ogni ora. Uguale per tutti, perche' non c'e' niente di casuale.
 */
export function onda(t: number): number {
  const ore = Math.floor(t / ORA_MS);
  const nelGiorno = ((ore % 24) + 24) % 24;
  const lenta = 0.05 * Math.sin((2 * Math.PI * (nelGiorno - 9)) / 24);
  const tremolio = 0.03 * (rumoreDi(ore) * 2 - 1);
  return 1 + lenta + tremolio;
}

/**
 * La quotazione adesso: quante lire vale un punto.
 *
 * Si guardano le ultime ventiquattro ore: chi ha bruciato e chi ha coniato, e
 * quante persone diverse c'erano. Poi l'onda. E si tiene nel recinto.
 */
export function quotazione(ore: readonly OraDiBorsa[], adesso: number): number {
  const da = adesso - GIORNO_MS;
  let bruciate = 0;
  let coniate = 0;
  const gente = new Set<string>();
  for (const o of ore) {
    if (o.ora + ORA_MS <= da || o.ora > adesso) continue;
    bruciate += o.bruciate;
    coniate += o.coniate;
    for (const g of o.giocatori) gente.add(g);
  }
  const pressione = 1 + (PESO_PRESSIONE * (bruciate - coniate)) / (bruciate + coniate + CUSCINO);
  const folla = 1 + PESO_FOLLA * Math.log10(1 + gente.size);
  const q = QUOTA_BASE * pressione * folla * onda(adesso);
  return Math.round(Math.min(QUOTA_MAX, Math.max(QUOTA_MIN, q)) * 1000) / 1000;
}

/**
 * Le ore dopo un movimento: si somma all'ora giusta (creandola se serve), si
 * rifà la quotazione e si segnano chiusura, massimo e minimo. Le ore piu'
 * vecchie di una settimana escono.
 *
 * Torna un elenco nuovo: la funzione non tocca quello che riceve.
 */
export function conMovimento(
  ore: readonly OraDiBorsa[],
  chi: string,
  lire: number,
  adesso: number,
): OraDiBorsa[] {
  const inizio = oraDi(adesso);
  const tenute = ore.filter((o) => o.ora > inizio - ORE_TENUTE * ORA_MS).map((o) => ({ ...o, giocatori: [...o.giocatori] }));
  let questa = tenute.find((o) => o.ora === inizio);
  if (!questa) {
    // Si apre dove aveva chiuso l'ultima ora, o dove sta la Borsa adesso.
    const prima = tenute.length ? tenute[tenute.length - 1]!.chiude : quotazione(tenute, adesso);
    questa = { ora: inizio, coniate: 0, bruciate: 0, giocatori: [], apre: prima, chiude: prima, max: prima, min: prima };
    tenute.push(questa);
    tenute.sort((a, b) => a.ora - b.ora);
  }
  if (lire > 0) questa.coniate += Math.round(lire);
  if (lire < 0) questa.bruciate += Math.round(-lire);
  if (chi && !questa.giocatori.includes(chi)) questa.giocatori.push(chi);
  const q = quotazione(tenute, adesso);
  questa.chiude = q;
  questa.max = Math.max(questa.max, q);
  questa.min = Math.min(questa.min, q);
  return tenute;
}

/** Com'e' messa la Borsa, detto per la pagina. */
export interface Listino {
  quota: number;
  /** Di quanto e' cambiata rispetto a ventiquattro ore fa, in percentuale. */
  variazione: number;
  coniate24: number;
  bruciate24: number;
  giocatori24: number;
  /** Le ultime 48 ore, una candela per ora. */
  candele: { ora: number; apre: number; chiude: number; max: number; min: number }[];
}

export function listino(ore: readonly OraDiBorsa[], adesso: number): Listino {
  const quota = quotazione(ore, adesso);
  const ieri = ore.filter((o) => o.ora <= adesso - GIORNO_MS).at(-1);
  const riferimento = ieri ? ieri.chiude : QUOTA_BASE;
  let coniate24 = 0;
  let bruciate24 = 0;
  const gente = new Set<string>();
  for (const o of ore) {
    if (o.ora + ORA_MS <= adesso - GIORNO_MS) continue;
    coniate24 += o.coniate;
    bruciate24 += o.bruciate;
    for (const g of o.giocatori) gente.add(g);
  }
  return {
    quota,
    variazione: Math.round(((quota - riferimento) / riferimento) * 1000) / 10,
    coniate24,
    bruciate24,
    giocatori24: gente.size,
    candele: ore
      .filter((o) => o.ora > adesso - 48 * ORA_MS)
      .map((o) => ({ ora: o.ora, apre: o.apre, chiude: o.chiude, max: o.max, min: o.min })),
  };
}

/* ------------------------------------------------------------- lo stacco -- */

/** Quante lire si possono portare a casa staccando, al giorno, a testa. */
export const TETTO_STACCO_GIORNO = 3_000;

/** La fetta (§ 18.2): 10% a livello 1, un punto ogni due livelli, fino a 25%. */
export function fetta(livello: number): number {
  const l = Math.max(1, Math.floor(livello));
  return Math.min(0.25, 0.1 + Math.floor((l - 1) / 2) * 0.01);
}

/**
 * Lo stacco, fatto di conto: quante lire, e quanti punti restano perche' non
 * ci stavano nel tetto di oggi.
 */
export function stacco(
  punti: number,
  quota: number,
  fettaMia: number,
  giaStaccateOggi: number,
): { lire: number; puntiUsati: number; avanzati: number } {
  const perPunto = quota * fettaMia;
  const pieno = Math.floor(Math.max(0, punti) * perPunto);
  const spazio = Math.max(0, TETTO_STACCO_GIORNO - giaStaccateOggi);
  if (pieno <= spazio) return { lire: pieno, puntiUsati: Math.max(0, punti), avanzati: 0 };
  const puntiUsati = perPunto > 0 ? Math.floor(spazio / perPunto) : 0;
  return { lire: Math.floor(puntiUsati * perPunto), puntiUsati, avanzati: Math.max(0, punti - puntiUsati) };
}

/* ------------------------------------------------------- la sala d'arcade -- */

export type IdGiocoSala = "dozer" | "claw" | "neon";

export interface GiocoSala {
  id: IdGiocoSala;
  nome: string;
  riga: string;
  /**
   * Il gettone d'ingresso, in lire. Dalla 1.4.8 e' zero per tutti: si entra
   * gratis e si paga ricaricando (`euro.ts`), come a una sala vera.
   */
  ingresso: number;
  /**
   * Quanto vale in lire quello che il gioco dice di avere, all'incasso (1.4.8).
   * Dozer e Claw contano in lire vere, uno a uno; Neon e' un clicker coi numeri
   * che esplodono, e si contano gli ordini di grandezza.
   */
  valore: (grezzo: number, messo: number) => number;
  /** Il tetto dell'incasso: al massimo tante volte quello che si e' messo. */
  moltMax: number;
  /**
   * Il gioco si finisce (Claw: tutta la collezione; Neon: il Vesuvio che
   * erutta). Finito, si incassa col premio della velocita' e si ricomincia da
   * capo. Il Dozer non finisce: si incassa quando si vuole e il tavolo resta.
   */
  siFinisce: boolean;
  /** Cosa vuol dire finire, detto a chi gioca. */
  fine?: string;
  /** Da quello che il gioco racconta (i suoi gettoni vinti) ai punti della partita. */
  punti: (grezzo: number) => number;
  /** I tetti (§ 18.4): al minuto e al giorno. */
  tettoMinuto: number;
  tettoGiorno: number;
  /** Le cose grosse che danno una carta, con quanto spesso e da che grado. */
  eventi: Record<string, { prob: number; min: Grado; detto: string }>;
}

export const GIOCHI_SALA: Record<IdGiocoSala, GiocoSala> = {
  dozer: {
    id: "dozer",
    nome: "Coin Dozer",
    riga: "Tre piani, tre spintori, e le pile che si fondono fino al miliardo.",
    ingresso: 0,
    valore: (g) => Math.floor(Math.max(0, g)),
    moltMax: 4,
    siFinisce: false,
    punti: (g) => Math.floor(Math.max(0, g) / 5),
    tettoMinuto: 2_000,
    tettoGiorno: 30_000,
    eventi: {
      jackpot: { prob: 1, min: "rare", detto: "il jackpot dello schermo" },
      tris: { prob: 0.5, min: "grand", detto: "un tris al gettone DaProd" },
      evento: { prob: 0.3, min: "basic", detto: "un evento DaProd" },
    },
  },
  claw: {
    id: "claw",
    nome: "Claw Machine",
    riga: "La Grande Vasca: pesca, grabba e acchiappa i modellini.",
    ingresso: 0,
    valore: (g) => Math.floor(Math.max(0, g)),
    moltMax: 3,
    siFinisce: true,
    fine: "tutti e 20 i modellini in collezione",
    punti: (g) => Math.floor(Math.max(0, g) / 4),
    tettoMinuto: 2_000,
    tettoGiorno: 30_000,
    eventi: {
      presa: { prob: 0.25, min: "basic", detto: "un modellino preso" },
      shiny: { prob: 1, min: "arcane", detto: "un modellino shiny" },
      zona: { prob: 1, min: "rare", detto: "una zona nuova aperta" },
    },
  },
  neon: {
    id: "neon",
    nome: "Neon Partenope",
    riga: "Napoli 2099: colpisci le orde, libera la sirena, fai eruttare il Vesuvio.",
    ingresso: 0,
    // Le lire di Neon arrivano a trenta cifre: ogni ordine di grandezza sopra il
    // milione vale un decimo di quello che si e' messo.
    valore: (g, messo) => Math.floor(Math.max(0, Math.log10(1 + Math.max(0, g)) - 6) * 0.1 * Math.max(0, messo)),
    moltMax: 3,
    siFinisce: true,
    fine: "il Vesuvio che erutta",
    // Un clicker: i numeri esplodono. Si contano gli ordini di grandezza.
    punti: (g) => Math.round(60 * Math.log10(1 + Math.max(0, g))),
    tettoMinuto: 1_500,
    tettoGiorno: 30_000,
    eventi: {
      boss: { prob: 0.6, min: "grand", detto: "un boss battuto" },
      eruzione: { prob: 1, min: "heroic", detto: "il Vesuvio che erutta" },
      stanza: { prob: 0.1, min: "basic", detto: "una stanza liberata" },
    },
  },
};

/** Una carta ogni quanto, per gioco. */
export const CARTA_OGNI_MS = 60_000;
/** Quante carte in mano, al massimo: quante le caselle della slot. */
export const MANO_MAX = 12;

/**
 * Quanti punti possono entrare adesso da quel gioco, rispetto ai tetti.
 * `giaNelMinuto` e `giaOggi` sono quelli gia' entrati.
 */
export function puntiAmmessi(gioco: GiocoSala, chiesti: number, giaNelMinuto: number, giaOggi: number): number {
  return Math.max(0, Math.min(chiesti, gioco.tettoMinuto - giaNelMinuto, gioco.tettoGiorno - giaOggi));
}

/** Se un evento da' una carta: la decide il PC, col suo dado. */
export function daUnaCarta(gioco: GiocoSala, evento: string, caso: Caso): Grado | null {
  const e = gioco.eventi[evento];
  if (!e) return null;
  return caso() < e.prob ? e.min : null;
}
