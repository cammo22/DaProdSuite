/**
 * **L'inventario**: quello che c'e' da avere, con i buchi in mezzo.
 *
 * Chiesto il 10 settembre 2026 («gli utenti devono avere un inventario da
 * riempire con obbiettivi») e deciso l'11, con la risposta alla domanda che era
 * rimasta aperta in CONCETTI.md § 13-bis:
 *
 * > «Manca un inventario dove vedere tutti i collezionabili nascosti, e quando
 * > si sbloccano compaiono. Molto importante l'inventario per ogni utente e i
 * > progressi, voglio una bella page dedicata.»
 *
 * ⚠ **Si contano le figurine dei pacchetti chiusi, non «tutte le combinazioni
 * possibili».** Quelle sono piu' dei granelli di sabbia e non si mostrano; le
 * figurine dei pacchetti invece sono finite — sono quelle che esistono — e
 * crescono ogni volta che chi comanda ne chiude uno. Quelle ancora fuori da un
 * pacchetto non ci sono: non si possono ancora avere da nessuna parte, e un
 * buco che non si puo' riempire e' un buco che fa smettere di giocare.
 *
 * ⚠ **Il buco non dice cosa c'e' dentro.** Si vede il numero e il grado — che
 * ti manca un Mythic lo devi sapere, e' il motivo per cui continui — ma non il
 * titolo, non la faccia, non il prompt. Se no non ci sarebbe niente da
 * sbloccare.
 *
 * ⚠ **Gli obiettivi non li scrive nessuno: vengono dai pacchetti.** Completare
 * un pacchetto, il primo di ogni grado, dieci figurine, cinquanta. Una lista
 * scritta a mano sarebbe un secondo elenco da tenere allineato a quello dei
 * pacchetti, e il giorno che se ne chiude uno nuovo l'obiettivo non ci sarebbe.
 */

import type { Deposito } from "./deposito";
import { gradoDiFigurina } from "./banco";
import { altezza, GRADI } from "./regole";
import type { Collezionabile, Grado } from "./tipi";

/** Una casella: piena se ce l'hai, un buco col numero e il grado se no. */
export interface CasellaInventario {
  numero: number;
  grado: Grado;
  /** La figurina, solo se e' tua. Un buco non si porta dietro niente. */
  cosa: Collezionabile | null;
}

export interface PacchettoInventario {
  numero: number;
  nome: string;
  hai: number;
  di: number;
  caselle: CasellaInventario[];
}

export interface Obiettivo {
  id: string;
  detto: string;
  quanto: number;
  di: number;
  fatto: boolean;
}

export interface Inventario {
  /** Quante figurine dei pacchetti hai, su quante ce ne sono. */
  hai: number;
  di: number;
  pacchetti: PacchettoInventario[];
  /** I gradi che esistono nei pacchetti, dal piu' basso, con quanti ne hai. */
  gradi: { id: Grado; hai: number; di: number }[];
  /** Tue, ma in nessun pacchetto: le hai trovate prima che ci entrassero. */
  fuori: Collezionabile[];
  obiettivi: Obiettivo[];
}

/**
 * Le soglie degli obiettivi «tante figurine». Si mostrano solo quelle che si
 * possono raggiungere con i pacchetti che ci sono: un obiettivo da cento con
 * quaranta figurine in giro e' un obiettivo finto.
 */
const SOGLIE = [10, 25, 50, 100, 250, 500, 1000];

export function inventario(deposito: Deposito, chi: string): Inventario {
  const mie = new Set(deposito.conto(chi).collezione);
  const perId = new Map(deposito.magazzino().map((c) => [c.id, c] as const));

  // ⚠ Una figurina che sta in due pacchetti — non capita, ma il giorno che
  // capita — si conta una volta sola nei totali. Nel suo pacchetto si vede
  // tutte e due le volte, perche' li' dentro c'e' davvero.
  const contate = new Map<string, Collezionabile>();

  const pacchetti: PacchettoInventario[] = deposito.pacchetti().map((p) => {
    const dentro = p.dentro
      .map((id) => perId.get(id))
      .filter((c): c is Collezionabile => Boolean(c));
    for (const c of dentro) contate.set(c.id, c);
    return {
      numero: p.numero,
      nome: p.nome ?? "",
      hai: dentro.filter((c) => mie.has(c.id)).length,
      di: dentro.length,
      caselle: dentro.map((c) => ({
        numero: c.numero ?? 0,
        grado: gradoDiFigurina(c),
        cosa: mie.has(c.id) ? c : null,
      })),
    };
  });

  const tutte = [...contate.values()];
  const hai = tutte.filter((c) => mie.has(c.id)).length;

  const gradi = GRADI.map((g) => {
    const diQuesto = tutte.filter((c) => gradoDiFigurina(c) === g.id);
    return { id: g.id, hai: diQuesto.filter((c) => mie.has(c.id)).length, di: diQuesto.length };
  }).filter((g) => g.di > 0);

  const fuori = deposito
    .magazzino()
    .filter((c) => mie.has(c.id) && !contate.has(c.id));

  const obiettivi: Obiettivo[] = [];
  const obiettivo = (id: string, detto: string, quanto: number, di: number) =>
    obiettivi.push({ id, detto, quanto: Math.min(quanto, di), di, fatto: quanto >= di });

  if (tutte.length > 0) obiettivo("prima", "La prima figurina", hai, 1);
  for (const s of SOGLIE) if (s <= tutte.length) obiettivo("tante-" + s, s + " figurine", hai, s);
  for (const g of gradi) {
    const nome = GRADI[altezza(g.id)]?.nome ?? g.id;
    obiettivo("grado-" + g.id, "Il primo " + nome, g.hai, 1);
  }
  for (const p of pacchetti) {
    if (p.di === 0) continue;
    obiettivo("pacchetto-" + p.numero, "Completa «" + (p.nome || "Pacchetto " + p.numero) + "»", p.hai, p.di);
  }
  if (pacchetti.length > 1) obiettivo("tutto", "Tutto l'inventario", hai, tutte.length);

  return { hai, di: tutte.length, pacchetti, gradi, fuori, obiettivi };
}
