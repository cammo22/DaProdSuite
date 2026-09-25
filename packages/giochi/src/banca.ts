/**
 * La Banca DaProd: dove finiscono le lire spese, e come tornano a chi gioca.
 *
 * ⚠ Nuova nella 1.4.5. Chiesto da Cammo il 24 settembre 2026:
 *
 * > «Inseriamo un conto tipo del banco, i soldi che ha DaProd, che poi vengono
 * > partizionati agli utenti in base alle attivita' nel tempo: una settimana e
 * > da' i premi, e giornalmente, e un mese un super jackpot DaProd.»
 *
 * **Da dove vengono i soldi.** Fino alla 1.4.4 una lira spesa (un gettone, una
 * ricarica, un pacchetto) si «bruciava»: usciva dal conto, spostava la Borsa, e
 * spariva. Adesso entra qui. Non si crea niente dal nulla: la Banca ridà quello
 * che la gente ha speso, e basta — piu' un fondo di partenza, perche' il primo
 * giorno la cassa non sia vuota.
 *
 * **Come si divide.** Ogni lira che entra va in quattro cassetti:
 *
 * | Cassetto | Quota | Si apre |
 * |---|---|---|
 * | il premio del giorno | 40% | a mezzanotte, fra tutti quelli che hanno giocato quel giorno |
 * | il premio della settimana | 30% | la domenica notte, fra i dieci piu' attivi della settimana |
 * | il super jackpot del mese | 20% | l'ultima notte del mese, **a uno solo**, estratto |
 * | la riserva DaProd | 10% | mai: serve a garantire un minimo ai cassetti vuoti |
 *
 * **Quanto tocca a ognuno lo decide l'attivita'**, non il saldo: chi ha giocato
 * di piu' prende di piu', chi e' ricco e non gioca non prende niente. I punti
 * attivita' li segna chi ospita (il deposito), in un posto solo: punti della
 * partita, giri di slot, lire spese.
 *
 * Il super jackpot si **estrae**, con biglietti quanti i punti attivita' del
 * mese: chi gioca tanto ha piu' biglietti, ma anche chi gioca poco puo'
 * vincerlo. E' il suo bello.
 *
 * Qui dentro solo funzioni pure, come in `borsa.ts`: niente disco, niente rete;
 * il tempo e il caso arrivano da fuori, cosi' le prove li fissano.
 */

import type { Caso } from "./regole";

/* ----------------------------------------------------------- le regole -- */

export type Cassetto = "giorno" | "settimana" | "mese";

/** Le quote dei cassetti. Il resto (10%) va alla riserva. */
export const QUOTE: Record<Cassetto, number> = { giorno: 0.4, settimana: 0.3, mese: 0.2 };

/**
 * Il minimo garantito di ogni cassetto: se all'apertura c'e' meno di cosi', la
 * riserva ci mette la differenza (finche' ne ha). Un premio del giorno da tre
 * lire e' peggio di nessun premio.
 */
export const MINIMI: Record<Cassetto, number> = { giorno: 500, settimana: 3_000, mese: 20_000 };

/** Con quanto parte la Banca il primo giorno: la riserva di DaProd. */
export const FONDO_DI_PARTENZA = 100_000;

/** Fra quanti si divide il premio della settimana. */
export const PRIMI_SETTIMANA = 10;

/** Quante aperture si tengono in memoria, per la pagina. */
const STORIA_TENUTA = 30;

export const NOMI: Record<Cassetto, string> = {
  giorno: "Premio del giorno",
  settimana: "Premio della settimana",
  mese: "Super jackpot DaProd",
};

/* ------------------------------------------------------------ i periodi -- */

const FUSO = "Europe/Rome";

function parti(t: number): { a: number; m: number; g: number; dow: number } {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday ?? "Mon");
  return { a: Number(p.year), m: Number(p.month), g: Number(p.day), dow };
}

/** Il giorno di un istante, all'ora di casa: «2026-09-24». */
export function chiaveGiorno(t: number): string {
  const p = parti(t);
  return `${p.a}-${String(p.m).padStart(2, "0")}-${String(p.g).padStart(2, "0")}`;
}

/** La settimana: il lunedi' con cui comincia, «2026-09-21». */
export function chiaveSettimana(t: number): string {
  const p = parti(t);
  const lunedi = Date.UTC(p.a, p.m - 1, p.g) - p.dow * 86_400_000;
  return new Date(lunedi).toISOString().slice(0, 10);
}

/** Il mese: «2026-09». */
export function chiaveMese(t: number): string {
  const p = parti(t);
  return `${p.a}-${String(p.m).padStart(2, "0")}`;
}

export const CHIAVE: Record<Cassetto, (t: number) => string> = {
  giorno: chiaveGiorno,
  settimana: chiaveSettimana,
  mese: chiaveMese,
};

/**
 * Quando si apre il cassetto, cioe' quando comincia il periodo dopo. Si cerca
 * avanzando di ora in ora: col cambio dell'ora legale una formula sbaglierebbe
 * di sessanta minuti, e cosi' no. Al massimo 32 giorni di passi.
 */
export function quandoSiApre(cassetto: Cassetto, adesso: number): number {
  const chiave = CHIAVE[cassetto];
  const ora = chiave(adesso);
  let t = Math.floor(adesso / 3_600_000) * 3_600_000;
  for (let i = 0; i < 32 * 24 + 2; i++) {
    t += 3_600_000;
    if (chiave(t) !== ora) return t;
  }
  return t;
}

/* ------------------------------------------------------------- lo stato -- */

export interface CassettoAperto {
  /** Il periodo: «2026-09-24», «2026-09-21», «2026-09». */
  chiave: string;
  lire: number;
  /** Punti attivita' di ognuno, in questo periodo. */
  attivita: Record<string, number>;
}

export interface Vincita {
  chi: string;
  lire: number;
}

export interface Apertura {
  cassetto: Cassetto;
  chiave: string;
  quando: number;
  montepremi: number;
  vincite: Vincita[];
}

export interface StatoBanca {
  /** La riserva di DaProd: non si divide, garantisce i minimi. */
  riserva: number;
  /** Tutto quello che e' entrato, da sempre. */
  entrate: number;
  /** Tutto quello che e' tornato a chi gioca, da sempre. */
  pagate: number;
  cassetti: Record<Cassetto, CassettoAperto>;
  storia: Apertura[];
  /** Le fette di DaProd sugli incassi dei giochi (1.4.8), da sempre. */
  fette?: number;
}

export function bancaNuova(adesso: number): StatoBanca {
  const cassetto = (c: Cassetto): CassettoAperto => ({ chiave: CHIAVE[c](adesso), lire: 0, attivita: {} });
  return {
    riserva: FONDO_DI_PARTENZA,
    entrate: 0,
    pagate: 0,
    cassetti: { giorno: cassetto("giorno"), settimana: cassetto("settimana"), mese: cassetto("mese") },
    storia: [],
  };
}

/** Riporta alla forma giusta uno stato letto dal disco: i campi mancanti si riempiono. */
export function bancaInRiga(letta: unknown, adesso: number): StatoBanca {
  const nuova = bancaNuova(adesso);
  if (typeof letta !== "object" || letta === null) return nuova;
  const b = letta as Partial<StatoBanca>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d);
  const cassetti = { ...nuova.cassetti };
  for (const c of ["giorno", "settimana", "mese"] as Cassetto[]) {
    const x = b.cassetti?.[c];
    if (x && typeof x.chiave === "string") {
      cassetti[c] = {
        chiave: x.chiave,
        lire: num(x.lire, 0),
        attivita: typeof x.attivita === "object" && x.attivita ? { ...x.attivita } : {},
      };
    }
  }
  return {
    riserva: num(b.riserva, FONDO_DI_PARTENZA),
    entrate: num(b.entrate, 0),
    pagate: num(b.pagate, 0),
    cassetti,
    storia: Array.isArray(b.storia) ? b.storia.slice(-STORIA_TENUTA) : [],
    fette: num(b.fette, 0),
  };
}

/* ------------------------------------------------------ cosa ci succede -- */

/**
 * Entrano lire spese. Si dividono nei cassetti; gli spiccioli degli
 * arrotondamenti vanno alla riserva, cosi' non si perde una lira.
 */
export function versa(b: StatoBanca, lire: number): void {
  const l = Math.floor(Math.max(0, lire));
  if (l <= 0) return;
  let messe = 0;
  for (const c of ["giorno", "settimana", "mese"] as Cassetto[]) {
    const quota = Math.floor(l * QUOTE[c]);
    b.cassetti[c].lire += quota;
    messe += quota;
  }
  b.riserva += l - messe;
  b.entrate += l;
}

/**
 * La fetta di DaProd su un incasso di un gioco (1.4.8, `euro.ts`): va nella
 * riserva, che garantisce i minimi dei premi. Conta come entrata.
 */
export function versaFetta(b: StatoBanca, lire: number): void {
  const l = Math.floor(Math.max(0, lire));
  if (l <= 0) return;
  b.riserva += l;
  b.entrate += l;
  b.fette = (b.fette ?? 0) + l;
}

/**
 * Chi comanda sposta lire dalla riserva a un cassetto (1.4.8): «gli admin
 * possono gestire le casse della DaProd in maniera molto gamificata». E' il
 * gesto del «stasera il premio lo alzo io».
 */
export function alzaCassetto(b: StatoBanca, cassetto: Cassetto, lire: number): number {
  const l = Math.floor(Math.max(0, Math.min(lire, b.riserva)));
  if (l <= 0) return 0;
  b.riserva -= l;
  b.cassetti[cassetto].lire += l;
  return l;
}

/**
 * Il grado della Banca, da quanto e' passato di li' (1.4.8): un gioco per chi
 * comanda, che vede la sua cassa crescere di nome.
 */
export const GRADI_BANCA = [
  { da: 0, nome: "Salvadanaio" },
  { da: 50_000, nome: "Cassetta del bar" },
  { da: 250_000, nome: "Cassa di quartiere" },
  { da: 1_000_000, nome: "Banco dei Quartieri" },
  { da: 5_000_000, nome: "Banco di Napoli" },
  { da: 25_000_000, nome: "Zecca DaProd" },
] as const;

export function gradoBanca(entrate: number): { livello: number; nome: string; da: number; prossimo: number | null; verso: number } {
  let i = 0;
  while (i + 1 < GRADI_BANCA.length && entrate >= GRADI_BANCA[i + 1]!.da) i++;
  const g = GRADI_BANCA[i]!;
  const dopo = GRADI_BANCA[i + 1];
  const verso = dopo ? Math.max(0, Math.min(1, (entrate - g.da) / (dopo.da - g.da))) : 1;
  return { livello: i + 1, nome: g.nome, da: g.da, prossimo: dopo ? dopo.da : null, verso };
}

/** Chi comanda mette lire nella riserva, di tasca di DaProd. */
export function versaInRiserva(b: StatoBanca, lire: number): void {
  const l = Math.floor(Math.max(0, lire));
  b.riserva += l;
}

/** Qualcuno ha fatto qualcosa: i suoi punti attivita' salgono in tutti e tre i periodi. */
export function segnaAttivita(b: StatoBanca, chi: string, punti: number): void {
  const p = Math.max(0, punti);
  if (!chi || p <= 0) return;
  for (const c of ["giorno", "settimana", "mese"] as Cassetto[]) {
    const a = b.cassetti[c].attivita;
    a[chi] = Math.round(((a[chi] ?? 0) + p) * 100) / 100;
  }
}

/**
 * Divide `lire` in proporzione ai punti, arrotondando per difetto. Torna le
 * vincite (solo quelle sopra zero) e quanto e' avanzato dagli arrotondamenti.
 */
export function dividi(lire: number, punti: Record<string, number>): { vincite: Vincita[]; avanzo: number } {
  const chi = Object.entries(punti).filter(([, p]) => p > 0);
  const totale = chi.reduce((s, [, p]) => s + p, 0);
  if (totale <= 0 || lire <= 0) return { vincite: [], avanzo: Math.max(0, lire) };
  const vincite = chi
    .map(([c, p]) => ({ chi: c, lire: Math.floor((lire * p) / totale) }))
    .filter((v) => v.lire > 0)
    .sort((a, b) => b.lire - a.lire);
  const date = vincite.reduce((s, v) => s + v.lire, 0);
  return { vincite, avanzo: lire - date };
}

/** Estrae uno, con tanti biglietti quanti i suoi punti. */
export function estrai(punti: Record<string, number>, caso: Caso): string | null {
  const chi = Object.entries(punti).filter(([, p]) => p > 0);
  const totale = chi.reduce((s, [, p]) => s + p, 0);
  if (totale <= 0) return null;
  let r = caso() * totale;
  for (const [c, p] of chi) {
    r -= p;
    if (r < 0) return c;
  }
  return chi[chi.length - 1]![0];
}

/**
 * Apre i cassetti il cui periodo e' finito. Torna le aperture fatte (anche
 * nessuna): chi ospita paga le vincite sui conti.
 *
 * ⚠ **Si apre quando qualcuno guarda, non a mezzanotte in punto.** Il PC puo'
 * essere spento a mezzanotte. Il conto pero' e' esatto lo stesso: l'attivita'
 * e' scritta sotto la chiave del suo periodo, e un cassetto di ieri aperto
 * stamattina da' esattamente quello che avrebbe dato ieri notte.
 *
 * Se nessuno ha giocato, il montepremi resta nel cassetto e passa al periodo
 * dopo: un premio non vinto si somma, come al lotto.
 */
export function apriIScaduti(b: StatoBanca, adesso: number, caso: Caso): Apertura[] {
  const fatte: Apertura[] = [];
  for (const c of ["giorno", "settimana", "mese"] as Cassetto[]) {
    const cassetto = b.cassetti[c];
    const oraE = CHIAVE[c](adesso);
    if (cassetto.chiave === oraE) continue;

    const gente = Object.keys(cassetto.attivita).filter((k) => (cassetto.attivita[k] ?? 0) > 0);
    let montepremi = cassetto.lire;
    if (gente.length > 0 && montepremi < MINIMI[c]) {
      const aggiunta = Math.min(b.riserva, MINIMI[c] - montepremi);
      b.riserva -= aggiunta;
      montepremi += aggiunta;
    }

    let vincite: Vincita[] = [];
    let avanzo = montepremi;
    if (gente.length > 0) {
      if (c === "mese") {
        const chi = estrai(cassetto.attivita, caso);
        if (chi) {
          vincite = [{ chi, lire: montepremi }];
          avanzo = 0;
        }
      } else {
        const punti =
          c === "settimana"
            ? Object.fromEntries(
                Object.entries(cassetto.attivita)
                  .sort((x, y) => y[1] - x[1])
                  .slice(0, PRIMI_SETTIMANA),
              )
            : cassetto.attivita;
        ({ vincite, avanzo } = dividi(montepremi, punti));
      }
    }

    const pagato = vincite.reduce((s, v) => s + v.lire, 0);
    b.pagate += pagato;
    if (vincite.length > 0) {
      fatte.push({ cassetto: c, chiave: cassetto.chiave, quando: adesso, montepremi: pagato, vincite });
      // Gli spiccioli degli arrotondamenti vanno alla riserva; il cassetto nuovo parte da zero.
      b.riserva += avanzo;
      b.cassetti[c] = { chiave: oraE, lire: 0, attivita: {} };
    } else {
      // Nessuno ha giocato: il montepremi passa al periodo dopo, cosi' com'e'.
      b.cassetti[c] = { chiave: oraE, lire: montepremi, attivita: {} };
    }
  }
  if (fatte.length) b.storia = [...b.storia, ...fatte].slice(-STORIA_TENUTA);
  return fatte;
}

/* ---------------------------------------------------- cosa si guarda -- */

export interface VetrinaCassetto {
  cassetto: Cassetto;
  nome: string;
  lire: number;
  /** Fra quanto si apre, in millisecondi. */
  fraMs: number;
  siApre: number;
  /** I miei punti attivita', e quanti ne hanno tutti insieme. */
  mieiPunti: number;
  puntiTutti: number;
  /** Quanto prenderei se si aprisse adesso (per il jackpot: le probabilita', 0-1). */
  miaParte: number;
  quanti: number;
}

export interface VetrinaBanca {
  riserva: number;
  entrate: number;
  pagate: number;
  /** Le fette di DaProd sugli incassi dei giochi, da sempre (1.4.8). */
  fette: number;
  /** Il grado della Banca (1.4.8). */
  grado: ReturnType<typeof gradoBanca>;
  cassetti: VetrinaCassetto[];
  /** Le ultime aperture, dalla piu' nuova. */
  ultime: Apertura[];
}

export function vetrina(b: StatoBanca, chi: string, adesso: number): VetrinaBanca {
  const cassetti = (["giorno", "settimana", "mese"] as Cassetto[]).map((c) => {
    const x = b.cassetti[c];
    const mieiPunti = x.attivita[chi] ?? 0;
    const tutti = Object.values(x.attivita).reduce((s, p) => s + p, 0);
    const lire = Math.max(x.lire, Object.keys(x.attivita).length ? Math.min(MINIMI[c], x.lire + b.riserva) : x.lire);
    let miaParte = 0;
    if (mieiPunti > 0 && tutti > 0) {
      if (c === "mese") miaParte = mieiPunti / tutti;
      else if (c === "giorno") miaParte = Math.floor((lire * mieiPunti) / tutti);
      else {
        const primi = Object.entries(x.attivita).sort((p, q) => q[1] - p[1]).slice(0, PRIMI_SETTIMANA);
        const dentro = primi.some(([k]) => k === chi);
        const somma = primi.reduce((s, [, p]) => s + p, 0);
        miaParte = dentro && somma > 0 ? Math.floor((lire * mieiPunti) / somma) : 0;
      }
    }
    const siApre = quandoSiApre(c, adesso);
    return {
      cassetto: c,
      nome: NOMI[c],
      lire,
      fraMs: Math.max(0, siApre - adesso),
      siApre,
      mieiPunti,
      puntiTutti: tutti,
      miaParte,
      quanti: Object.keys(x.attivita).length,
    };
  });
  return {
    riserva: b.riserva,
    entrate: b.entrate,
    pagate: b.pagate,
    fette: b.fette ?? 0,
    grado: gradoBanca(b.entrate),
    cassetti,
    ultime: [...b.storia].reverse().slice(0, 10),
  };
}
