/**
 * La moneta DaProd 🪙: il gettone grande, che si guadagna solo giocando.
 *
 * Fase 1 del Big Update (`docs/ROADMAP-2.0.md`, 1.7.8).
 *
 * ⚠ **Niente soldi veri, mai.** Come le lire e gli euro della sala, la moneta
 * DaProd e' finta: non si compra, non si cambia in denaro, non esce dall'app.
 * Vale dentro la sala — e dalla 1.7.9 nella Zecca e nel mercato — e basta.
 *
 * ## Come si guadagna
 *
 * **Con le cose che fanno fatica, non con quelle che si ripetono.** Le lire
 * sono quelle che si mettono e si perdono; le monete sono il trofeo:
 *
 * - una **partita finita** (la Claw che chiude la collezione, il Vesuvio di
 *   Neon che erutta): una moneta;
 * - un **incasso grosso** (il jackpot del Dozer, o qualunque gioco che renda
 *   molto piu' di quanto hai messo): una moneta sopra la soglia, e una in piu'
 *   ogni tanti euro di guadagno;
 * - un **livello importante** (uno ogni cinque);
 * - il primo della **settimana** della Banca DaProd, e chi vince il
 *   **jackpot del mese**;
 * - un **Ethernal** in slot, che esce una volta ogni duecento giri circa.
 *
 * ⚠ **C'e' un tetto a settimana per persona.** Non e' un freno all'ansia: e'
 * la rete contro chi trova il modo di ripetere una cosa cento volte. Niente
 * conti alla rovescia, niente «ultima occasione»: chi gioca poco e' tranquillo,
 * chi gioca molto si ferma al tetto e non perde niente di quello che ha.
 *
 * ## Quanto vale
 *
 * Una moneta ha una **quotazione in lire**, che si muove: sale quando ce ne sono
 * poche in giro e quando la sala e' piena di gente, scende quando ce ne sono
 * tante. Non si cambia in lire (nessun «incassa»): la quotazione dice **quante
 * lire di riferimento vale una moneta**, e serve a dare il prezzo in monete ai
 * pezzi della Zecca e del mercato (`monetePerLire`).
 *
 * Funzioni pure, senza disco e senza rete, come la Borsa: il tempo si passa da
 * fuori, e si provano.
 */

import { chiaveSettimana } from "./banca";

/** Le regole della moneta: tutte in un posto, e le cambia chi comanda. */
export interface RegoleMoneta {
  /** Monete per una partita finita (Claw, Neon). */
  moneteFine: number;
  /** Il guadagno netto, in euro, sopra il quale un incasso conta come «grosso». */
  sogliaEuro: number;
  /** Dopo la soglia, una moneta in piu' ogni tanti euro di guadagno. */
  euroPerMoneta: number;
  /** Il massimo che un solo incasso puo' dare. */
  moneteIncassoMax: number;
  /** Monete per un grado Ethernal in slot. */
  moneteEthernal: number;
  /** Ogni quanti livelli si prende un premio in monete. */
  livelloOgni: number;
  /** Monete per ogni traguardo di livello. */
  moneteLivello: number;
  /** Monete al primo della settimana della Banca. */
  moneteSettimana: number;
  /** Monete a chi vince il jackpot del mese. */
  moneteMese: number;
  /** Il massimo di monete che una persona guadagna giocando in una settimana. */
  tettoSettimana: number;
  /** Lire di riferimento per moneta, quando ce ne sono «abbastanza» e la sala e' vuota. */
  prezzoBase: number;
  /** Quante monete in giro dimezzano il rialzo di scarsita'. */
  rifCircolanti: number;
  /** Quanti giocatori in un giorno fanno il rialzo pieno di attivita'. */
  rifGiocatori: number;
}

export const REGOLE_MONETA: RegoleMoneta = {
  moneteFine: 1,
  sogliaEuro: 20,
  euroPerMoneta: 25,
  moneteIncassoMax: 10,
  moneteEthernal: 1,
  livelloOgni: 5,
  moneteLivello: 1,
  moneteSettimana: 1,
  moneteMese: 5,
  tettoSettimana: 25,
  prezzoBase: 1000,
  rifCircolanti: 500,
  rifGiocatori: 10,
};

/** Le regole di adesso: quelle di partenza, con sopra quelle che chi comanda ha cambiato. */
export function regoleMoneta(scritte?: Partial<RegoleMoneta> | null): RegoleMoneta {
  const fuori: RegoleMoneta = { ...REGOLE_MONETA };
  if (!scritte || typeof scritte !== "object") return fuori;
  for (const k of Object.keys(REGOLE_MONETA) as (keyof RegoleMoneta)[]) {
    const v = Number((scritte as Record<string, unknown>)[k]);
    // Un numero sano e non negativo: un file scritto a mano non deve rompere il gioco.
    if (Number.isFinite(v) && v >= 0) fuori[k] = v;
  }
  // Il prezzo e il tetto non possono essere zero: si dividerebbe per niente.
  fuori.prezzoBase = Math.max(1, fuori.prezzoBase);
  fuori.euroPerMoneta = Math.max(1, fuori.euroPerMoneta);
  fuori.livelloOgni = Math.max(1, Math.round(fuori.livelloOgni));
  fuori.rifCircolanti = Math.max(1, fuori.rifCircolanti);
  fuori.rifGiocatori = Math.max(1, fuori.rifGiocatori);
  return fuori;
}

/* ------------------------------------------------------- quanto si guadagna */

/**
 * Le monete per un incasso.
 *
 * `guadagnoEuro` e' quello che resta **dopo** aver tolto quello che si era messo:
 * un incasso che pareggia non e' una vincita. `finita` vale sempre, anche in
 * perdita — finire Claw o Neon e' un traguardo a prescindere dal conto.
 */
export function monetePerIncasso(guadagnoEuro: number, finita: boolean, r: RegoleMoneta = REGOLE_MONETA): number {
  let m = finita ? r.moneteFine : 0;
  if (guadagnoEuro >= r.sogliaEuro) {
    m += 1 + Math.floor((guadagnoEuro - r.sogliaEuro) / r.euroPerMoneta);
  }
  return Math.max(0, Math.min(r.moneteIncassoMax, Math.floor(m)));
}

/**
 * Le monete dei livelli presi: uno ogni `livelloOgni`, da `da` (escluso) a `a`
 * (incluso). Il livello 5, il 10, il 15…
 */
export function moneteDeiLivelli(da: number, a: number, r: RegoleMoneta = REGOLE_MONETA): number {
  let m = 0;
  for (let n = Math.floor(da) + 1; n <= Math.floor(a); n++) {
    if (n % r.livelloOgni === 0) m += r.moneteLivello;
  }
  return m;
}

/* -------------------------------------------------------------- quanto vale */

/**
 * La quotazione di una moneta, in lire.
 *
 * `base × (1 + scarsita) × (1 + meta' dell'attivita')`:
 *
 * - la **scarsita'** va da 1 (quasi nessuna moneta in giro) a 0 (un mare);
 * - l'**attivita'** va da 0 (sala vuota) a 1 (almeno `rifGiocatori` persone in
 *   un giorno).
 *
 * Quindi sta fra `prezzoBase` e tre volte tanto, e si muove davvero: chi guarda
 * il grafico vede salire e scendere cose che dipendono da **quanto si gioca** e
 * da **quante monete ci sono**, non da un numero a caso.
 */
export function quotaMoneta(circolanti: number, giocatori24h: number, r: RegoleMoneta = REGOLE_MONETA): number {
  const scarsita = r.rifCircolanti / (r.rifCircolanti + Math.max(0, circolanti));
  const attivita = Math.min(1, Math.max(0, giocatori24h) / r.rifGiocatori);
  return Math.max(1, Math.round(r.prezzoBase * (1 + scarsita) * (1 + 0.5 * attivita)));
}

/** Quante monete vale un prezzo in lire, alla quotazione di adesso. Almeno una. */
export function monetePerLire(lire: number, quota: number): number {
  if (!(lire > 0)) return 0;
  return Math.max(1, Math.ceil(lire / Math.max(1, quota)));
}

/* ------------------------------------------------------- lo stato e le ore */

/** Un'ora di quotazione: come stava la moneta e quante ne giravano. */
export interface OraMoneta {
  /** L'inizio dell'ora, in millisecondi. */
  t: number;
  prezzo: number;
  circolanti: number;
}

/** Tutto quello che il banco sa della moneta, sul disco. */
export interface StatoMoneta {
  /** Monete nate, da sempre (giocando, o coniate da chi comanda). */
  coniate: number;
  /** Monete bruciate, da sempre (spese, o tolte da chi comanda). */
  bruciate: number;
  /** Da dove sono arrivate le monete, per cosa: `fine`, `incasso`, `livello`… */
  origini: Record<string, number>;
  /** Una quotazione all'ora, gli ultimi trenta giorni. */
  ore: OraMoneta[];
  /** Le regole cambiate da chi comanda (solo quelle). */
  regole?: Partial<RegoleMoneta>;
}

/** Quante ore di quotazione si tengono: trenta giorni. */
export const ORE_TENUTE = 24 * 30;

export function monetaNuova(): StatoMoneta {
  return { coniate: 0, bruciate: 0, origini: {}, ore: [] };
}

/** Riporta alla forma di adesso uno stato letto da un file (anche vuoto o storto). */
export function monetaInRiga(letto: unknown): StatoMoneta {
  const s = monetaNuova();
  if (!letto || typeof letto !== "object") return s;
  const l = letto as Partial<StatoMoneta>;
  if (Number.isFinite(l.coniate)) s.coniate = Math.max(0, Math.floor(l.coniate as number));
  if (Number.isFinite(l.bruciate)) s.bruciate = Math.max(0, Math.floor(l.bruciate as number));
  if (l.origini && typeof l.origini === "object") {
    for (const [k, v] of Object.entries(l.origini)) if (Number.isFinite(v)) s.origini[k] = Math.max(0, Math.floor(v));
  }
  if (Array.isArray(l.ore)) {
    s.ore = l.ore
      .filter((o) => o && Number.isFinite(o.t) && Number.isFinite(o.prezzo) && Number.isFinite(o.circolanti))
      .slice(-ORE_TENUTE);
  }
  if (l.regole && typeof l.regole === "object") s.regole = { ...l.regole };
  return s;
}

/** Scrive la quotazione dell'ora: l'ultima dell'ora vince. */
export function segnaOra(s: StatoMoneta, adesso: number, prezzo: number, circolanti: number): void {
  const t = Math.floor(adesso / 3_600_000) * 3_600_000;
  const ultima = s.ore[s.ore.length - 1];
  if (ultima && ultima.t === t) {
    ultima.prezzo = prezzo;
    ultima.circolanti = circolanti;
  } else {
    s.ore.push({ t, prezzo, circolanti });
  }
  if (s.ore.length > ORE_TENUTE) s.ore.splice(0, s.ore.length - ORE_TENUTE);
}

export type PeriodoMoneta = "24h" | "7g" | "1m" | "tutto";

const DURATE: Record<PeriodoMoneta, number> = {
  "24h": 24 * 3_600_000,
  "7g": 7 * 24 * 3_600_000,
  "1m": 30 * 24 * 3_600_000,
  tutto: 0,
};

/** I punti della quotazione in un periodo, dal piu' vecchio: `{ t, v }` per il grafico. */
export function serieMoneta(s: StatoMoneta, periodo: PeriodoMoneta, adesso: number): { t: number; v: number }[] {
  const da = DURATE[periodo] ? adesso - DURATE[periodo] : 0;
  return s.ore.filter((o) => o.t >= da - 3_600_000).map((o) => ({ t: o.t, v: o.prezzo }));
}

/* ------------------------------------------------------- il tetto della settimana */

/** La chiave della settimana di un momento: sta su `Conto.moneteSettimana`. */
export function chiaveSettimanaMoneta(adesso: number): string {
  return chiaveSettimana(adesso);
}

/**
 * Quante monete ancora si possono guadagnare giocando questa settimana.
 * `gia` e' il conto della persona: se e' di un'altra settimana, riparte da zero.
 */
export function restaInSettimana(
  gia: { chiave: string; n: number } | undefined,
  adesso: number,
  r: RegoleMoneta = REGOLE_MONETA,
): number {
  const chiave = chiaveSettimanaMoneta(adesso);
  const fatte = gia && gia.chiave === chiave ? gia.n : 0;
  return Math.max(0, Math.floor(r.tettoSettimana - fatte));
}
