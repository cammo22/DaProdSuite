/**
 * Lire ed euro, e la cassa di ogni gioco d'arcade.
 *
 * ⚠ Nuovo nella 1.4.8. Chiesto da Cammo il 25 settembre 2026: «aggiustiamo la
 * valuta delle lire, in ogni gioco sono diverse; i tagli di ricarica te li
 * dico in euro: 20 centesimi, 1, 5, 20, 50, 200 e 500 euro, questi devono
 * essere i tagli di tutti… io non sono un finanziere ma voglio questo sistema
 * di lire ed euro».
 *
 * Fino alla 1.4.7 ogni gioco cambiava a modo suo: una lira della suite faceva
 * L.20 di monete nel Dozer, L.30 di prese nella Claw, e a Neon «un minuto di
 * produzione». Chi ricaricava non sapeva cosa stava comprando.
 *
 * Adesso le regole sono tre, e valgono dappertutto:
 *
 * 1. **Una lira e' una lira.** Quella della suite e quella di un gioco sono la
 *    stessa moneta: ricarichi L. 1.936 e nel gioco hai L. 1.936.
 * 2. **L'euro e' il metro.** Si ragiona in euro, al cambio vero del 2002:
 *    1 € = L. 1.936,27. I tagli di ricarica sono in euro, e accanto c'e'
 *    sempre quante lire sono.
 * 3. **Quello che vinci in un gioco torna in lire vere**, meno la fetta di
 *    DaProd (il 10%), che va nella Banca e torna alla gente coi premi. Dalla
 *    1.5.1 senza tetto: vedi «la resa dinamica» qui sotto.
 *
 * Qui solo i conti, puri: chi li applica al deposito e' `sala.ts`.
 */

/** Il cambio fisso della lira nell'euro, quello del 1° gennaio 2002. */
export const LIRE_PER_EURO = 1936.27;

/** I tagli di ricarica, in euro: gli stessi per tutti i giochi. */
export const TAGLI_EURO = [0.2, 1, 5, 20, 50, 200, 500] as const;

/** Da euro a lire, arrotondato alla lira. */
export function lireDaEuro(euro: number): number {
  return Math.round(Math.max(0, Number(euro) || 0) * LIRE_PER_EURO);
}

/** Da lire a euro, coi centesimi. */
export function euroDaLire(lire: number): number {
  return Math.round(((Number(lire) || 0) / LIRE_PER_EURO) * 100) / 100;
}

/** I tagli in lire: L. 387, 1.936, 9.681, 38.725, 96.814, 387.254, 968.135. */
export const TAGLI_LIRE: readonly number[] = TAGLI_EURO.map(lireDaEuro);

/** La ricarica piu' piccola: 20 centesimi. */
export const RICARICA_MIN = TAGLI_LIRE[0]!;

/** La fetta di DaProd su quello che si incassa da un gioco. */
export const FETTA_DAPROD = 0.1;

/**
 * Il premio per aver finito presto (Claw e Neon): «finire il gioco il piu'
 * velocemente possibile». Finito entro mezz'ora vale un quarto di quello che
 * hai messo in piu' (era la meta' fino alla 1.5.0, quando il resto del premio
 * era fisso); poi cala dritto fino a zero alle tre ore.
 */
export const BONUS_FINE_MAX = 0.25;
export const FINE_PIENA_MIN = 30;
export const FINE_ZERO_MIN = 180;

export function bonusFine(messo: number, minuti: number): number {
  const m = Math.max(0, Number(minuti) || 0);
  const k = m <= FINE_PIENA_MIN ? 1 : Math.max(0, 1 - (m - FINE_PIENA_MIN) / (FINE_ZERO_MIN - FINE_PIENA_MIN));
  return Math.floor(Math.max(0, messo) * BONUS_FINE_MAX * k);
}

/* ---------------------------------------------- la resa dinamica (1.5.1) */

/**
 * ⚠ **Niente piu' tetto: quello che porti a casa cresce con quello che metti e
 * con quanto vai avanti.** Dalla 1.5.1.
 *
 * Chiesto il 26 settembre 2026: «togliamo il max dei 20 euro di vincita, la
 * vincita e' sempre dinamica». E il perche' l'ha visto lui: «il gioco
 * Partenope, ho messo un 30k euro e ho perso tutto quando ho finito, e i
 * soldi sono spariti». Fino alla 1.5.0 Claw e Neon pagavano a fine partita un
 * premio fisso da 20 a 30 euro, **qualunque cosa ci avessi messo dentro**:
 * chi ricaricava trentamila euro li perdeva tutti.
 *
 * Adesso l'incasso di Claw e Neon e' fatto di due pezzi:
 *
 * 1. **la resa su quello che hai messo**: `messo × resa`, e la resa va da
 *    `resaMin` (smetti subito: ti riprendi la meta') a `resaMax` (sei andato
 *    fino in fondo: tre volte), dritta coi progressi del punteggio;
 * 2. **la paga di chi gioca e basta**: fino a `baseEuro` euro coi progressi,
 *    anche senza aver ricaricato niente.
 *
 * Chi finisce il gioco (tutta la collezione, il Vesuvio) moltiplica tutto per
 * `moltFine`, piu' il premio della velocita' e un pezzo del montepremi.
 *
 * Il Dozer resta uno a uno: le monete che hai sono lire, e quelle che ha
 * mangiato il tavolo sono andate. Niente tetto nemmeno li'.
 *
 * I numeri li puo' cambiare chi comanda, dalla Banca DaProd (`RegoleSoldi`):
 * qui ci sono quelli di partenza e i recinti.
 */
export interface RegoleSoldi {
  /** La resa di chi smette subito: 0,5 vuol dire che si riprende la meta'. */
  resaMin: number;
  /** La resa di chi e' andato fino in fondo col punteggio. */
  resaMax: number;
  /** La paga di chi gioca senza ricaricare, a punteggio pieno, in euro. */
  baseEuro: number;
  /** Quanto moltiplica finire il gioco. */
  moltFine: number;
  /**
   * ⚠ **Il campanello, non il tetto.** Un incasso piu' grosso di tante volte
   * quello messo (e sopra `controllaMinEuro`) non viene negato: aspetta che un
   * admin lo guardi nella Banca DaProd. Serve per i difetti — un gioco che si
   * rompe e fa miliardi — non per chi vince. A zero non suona mai.
   */
  controllaVolte: number;
  controllaMinEuro: number;
  /** Il premio di ogni livello, in euro per numero di livello: il 5 da' 5 × questo. */
  premioLivelloEuro: number;
}

export const REGOLE_SOLDI: RegoleSoldi = {
  resaMin: 0.5,
  resaMax: 3,
  baseEuro: 30,
  moltFine: 1.25,
  controllaVolte: 25,
  controllaMinEuro: 500,
  premioLivelloEuro: 1,
};

/** I recinti delle regole: chi comanda le cambia, ma dentro questi. */
const RECINTI: Record<keyof RegoleSoldi, [number, number]> = {
  resaMin: [0, 5],
  resaMax: [0, 20],
  baseEuro: [0, 10_000],
  moltFine: [1, 10],
  controllaVolte: [0, 10_000],
  controllaMinEuro: [0, 10_000_000],
  premioLivelloEuro: [0, 1_000],
};

/** Le regole scritte, portate a posto: i numeri mancanti o storti tornano quelli di partenza. */
export function regoleSoldi(scritte?: Partial<RegoleSoldi> | null): RegoleSoldi {
  const fuori = { ...REGOLE_SOLDI };
  for (const k of Object.keys(RECINTI) as (keyof RegoleSoldi)[]) {
    const v = Number(scritte?.[k]);
    if (scritte && scritte[k] !== undefined && Number.isFinite(v)) {
      fuori[k] = Math.min(RECINTI[k][1], Math.max(RECINTI[k][0], v));
    }
  }
  if (fuori.resaMax < fuori.resaMin) fuori.resaMax = fuori.resaMin;
  return fuori;
}

/** La resa a quel punto del gioco (da 0 a 1). */
export function resa(prog: number, r: RegoleSoldi = REGOLE_SOLDI): number {
  const p = Math.max(0, Math.min(1, Number(prog) || 0));
  return r.resaMin + (r.resaMax - r.resaMin) * p;
}

/** Quanto vale adesso quello che hai nel gioco, prima della fetta di DaProd. */
export interface Stima {
  /** Il valore lordo, in lire. */
  valore: number;
  /** Da 0 a 1: quanto sei andato avanti (0 per il Dozer, che non finisce). */
  progresso: number;
  /** La resa su quello messo (1 per il Dozer). */
  resa: number;
  /** La parte che viene dalla resa, e quella che viene dal giocare. */
  daMesso: number;
  daGioco: number;
  fetta: number;
  netto: number;
  /** Rispetto a quello che hai messo: +40 vuol dire il 40% in piu'. */
  guadagno: number;
}

/**
 * La stima di un incasso, fatta di conto. `scala` c'e' per i giochi che si
 * finiscono (Claw, Neon): senza, il gioco conta uno a uno (il Dozer).
 */
export function stimaIncasso(opzioni: {
  grezzo: number;
  messo: number;
  scala?: readonly [number, number];
  fine?: boolean;
  regole?: RegoleSoldi;
}): Stima {
  const r = opzioni.regole ?? REGOLE_SOLDI;
  const grezzo = Math.max(0, Number(opzioni.grezzo) || 0);
  const messo = Math.max(0, Math.floor(Number(opzioni.messo) || 0));
  let prog = 0;
  let laResa = 1;
  let daMesso: number;
  let daGioco: number;
  if (opzioni.scala) {
    prog = progresso(grezzo, opzioni.scala);
    laResa = resa(prog, r);
    const k = opzioni.fine ? r.moltFine : 1;
    daMesso = Math.floor(messo * laResa * k);
    daGioco = Math.floor(lireDaEuro(r.baseEuro * prog) * k);
  } else {
    daMesso = 0;
    daGioco = Math.floor(grezzo);
  }
  const valore = daMesso + daGioco;
  const fetta = Math.floor(valore * FETTA_DAPROD);
  const netto = valore - fetta;
  const guadagno = messo > 0 ? Math.round(((netto - messo) / messo) * 1000) / 10 : 0;
  return { valore, progresso: Math.round(prog * 1000) / 1000, resa: Math.round(laResa * 100) / 100, daMesso, daGioco, fetta, netto, guadagno };
}

/** Il campanello: vero se un incasso cosi' deve aspettare un admin. */
export function daControllare(netto: number, messo: number, r: RegoleSoldi = REGOLE_SOLDI): boolean {
  if (!(r.controllaVolte > 0)) return false;
  const soglia = Math.max(Math.max(0, messo) * r.controllaVolte, lireDaEuro(r.controllaMinEuro));
  return netto > soglia;
}

/** Il premio del livello n (1.5.1): «i livelli, se ci clicco, devo poter guadagnare qualcosa». */
export function premioDelLivello(n: number, r: RegoleSoldi = REGOLE_SOLDI): number {
  return n >= 2 ? lireDaEuro(r.premioLivelloEuro * n) : 0;
}

/* ------------------------------------------------ fine partita e montepremi */

/** Il pezzo del montepremi della Banca: il 2% della riserva, al massimo 10 euro. */
export const MONTEPREMI_QUOTA = 0.02;
export const MONTEPREMI_MAX_EURO = 10;

/** Da 0 a 1: quanti ordini di grandezza, fra `da` e `a`, ha fatto il punteggio. */
export function progresso(grezzo: number, scala: readonly [number, number]): number {
  const o = Math.log10(1 + Math.max(0, Number(grezzo) || 0));
  return Math.max(0, Math.min(1, (o - scala[0]) / Math.max(1e-9, scala[1] - scala[0])));
}

/** Il pezzo di montepremi per chi finisce, dalla riserva di adesso. */
export function pezzoDiMontepremi(riserva: number): number {
  return Math.floor(Math.min(Math.max(0, riserva) * MONTEPREMI_QUOTA, lireDaEuro(MONTEPREMI_MAX_EURO)));
}

/**
 * Numeri corti (1.4.9): «le lire, il numero diventa troppo grande: usiamo 1k,
 * 1M». Sotto i centomila si scrive tutto; sopra, k, M e mld.
 */
export function corto(n: number): string {
  const v = Math.round(Number(n) || 0);
  const a = Math.abs(v);
  const it = (x: number, d: number) => x.toFixed(d).replace(".", ",").replace(/,0+$/, "");
  if (a < 100_000) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (a < 1_000_000) return it(v / 1000, 0) + "k";
  if (a < 1_000_000_000) return it(v / 1_000_000, a < 10_000_000 ? 2 : 1) + "M";
  return it(v / 1_000_000_000, 1) + " mld";
}
