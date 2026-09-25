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
 *    DaProd (il 10%), che va nella Banca e torna alla gente coi premi. Col
 *    tetto: al massimo si porta a casa tante volte quello che si e' messo
 *    (`moltMax` di ogni gioco in `borsa.ts`), perche' un gioco che si rompe o
 *    un clicker coi numeri a trenta cifre non devono svuotare la zecca.
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
 * velocemente possibile». Finito entro mezz'ora vale meta' di quello che hai
 * messo in piu'; poi cala dritto fino a zero alle tre ore.
 */
export const BONUS_FINE_MAX = 0.5;
export const FINE_PIENA_MIN = 30;
export const FINE_ZERO_MIN = 180;

export function bonusFine(messo: number, minuti: number): number {
  const m = Math.max(0, Number(minuti) || 0);
  const k = m <= FINE_PIENA_MIN ? 1 : Math.max(0, 1 - (m - FINE_PIENA_MIN) / (FINE_ZERO_MIN - FINE_PIENA_MIN));
  return Math.floor(Math.max(0, messo) * BONUS_FINE_MAX * k);
}

/**
 * L'incasso di un gioco, fatto di conto.
 *
 * `valore` e' quanto vale in lire quello che il gioco dice di avere (gia'
 * passato per la regola del gioco), `messo` quanto si e' ricaricato in questa
 * partita, `giaPreso` quanto si e' gia' incassato in questa partita, `moltMax`
 * il tetto del gioco. Torna quanto si prende dal gioco, il bonus, la fetta di
 * DaProd e quanto arriva nel portafoglio.
 */
export function incasso(opzioni: {
  valore: number;
  messo: number;
  giaPreso: number;
  moltMax: number;
  bonus?: number;
}): { preso: number; bonus: number; fetta: number; netto: number; tetto: number; oltre: number } {
  const valore = Math.max(0, Math.floor(opzioni.valore));
  const tetto = Math.max(0, Math.floor(opzioni.messo * opzioni.moltMax) - Math.floor(opzioni.giaPreso));
  const preso = Math.min(valore, tetto);
  const bonus = Math.max(0, Math.floor(opzioni.bonus ?? 0));
  const lordo = preso + bonus;
  const fetta = Math.floor(lordo * FETTA_DAPROD);
  return { preso, bonus, fetta, netto: lordo - fetta, tetto, oltre: valore - preso };
}

/* ------------------------------------------ il premio di fine partita (1.4.9) */

/**
 * ⚠ **Claw e Neon pagano davvero, a fine partita.** Dalla 1.4.9.
 *
 * Chiesto il 25 settembre 2026: «in Claw Machine e Neon Partenope puoi
 * guadagnare molto … devono inserire molte lire prima di arrivare alla fine, ma
 * poi voglio che vincano, e la ricompensa sono un 20-30 euro, poi bonus dei
 * montepremi». E il Dozer al contrario: «dev'essere un mangiatore di soldi».
 *
 * Quindi a fine partita il premio **non** passa dal tetto (quello vale per chi
 * incassa a meta'): sono da 20 a 30 euro, di piu' quanto piu' alto e' il
 * punteggio, piu' il premio della velocita' e un pezzo del montepremi della
 * Banca. I punteggi di questi giochi arrivano a miliardi (Claw) e a trenta
 * cifre (Neon): si contano gli **ordini di grandezza**, fra `da` e `a`.
 */
export const PREMIO_FINE_EURO = { base: 20, piu: 10 } as const;
/** Chi smette prima della fine: al massimo tanti euro, sempre sotto il tetto. */
export const PRIMA_DELLA_FINE_EURO = 15;
/** Il pezzo del montepremi della Banca: il 2% della riserva, al massimo 10 euro. */
export const MONTEPREMI_QUOTA = 0.02;
export const MONTEPREMI_MAX_EURO = 10;

/** Da 0 a 1: quanti ordini di grandezza, fra `da` e `a`, ha fatto il punteggio. */
export function progresso(grezzo: number, scala: readonly [number, number]): number {
  const o = Math.log10(1 + Math.max(0, Number(grezzo) || 0));
  return Math.max(0, Math.min(1, (o - scala[0]) / Math.max(1e-9, scala[1] - scala[0])));
}

/** Il premio di chi finisce: 20 euro, fino a 30 col punteggio alto. */
export function premioFine(grezzo: number, scala: readonly [number, number]): number {
  return lireDaEuro(PREMIO_FINE_EURO.base + PREMIO_FINE_EURO.piu * progresso(grezzo, scala));
}

/** Quanto vale chi smette prima: fino a 15 euro col punteggio, poi decide il tetto. */
export function valorePrimaDellaFine(grezzo: number, scala: readonly [number, number]): number {
  return lireDaEuro(PRIMA_DELLA_FINE_EURO * progresso(grezzo, scala));
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
