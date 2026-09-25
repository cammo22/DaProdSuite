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
