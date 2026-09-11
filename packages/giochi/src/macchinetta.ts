/**
 * **La macchinetta**: la seconda slot della sala giochi, quella delle figurine.
 *
 * Chiesta il 12 settembre 2026, e le parole sono queste:
 *
 * > «Aggiungiamo la slot dove ci saranno 6 rulli, 3 per fila, che funziona come
 * > una slot classica. Girandola puoi scegliere se giocare a 50 lire, 100 lire o
 * > 200 lire, e se si riescono a mettere in fila gli item si vince. Questa slot
 * > per funzionare deve esserci almeno 1 pacchetto disponibile, e a ogni
 * > pacchetto si aggiorna automaticamente. Le possibilita' di vincere sono
 * > basse e deve usare solo le immagini dei pacchetti: quando quelle immagini
 * > formano una fila da 3 si vince un premio in lire leggero, mentre se l'utente
 * > riesce a far uscire 6 immagini totali tutte uguali allora vince un
 * > superbonus in lire sempre contenuto, e in piu' l'immagine viene sbloccata e
 * > aggiunta nell'inventario.»
 *
 * ⚠ **Tre file da tre, dall'11 settembre 2026.** Il giorno dopo averla vista:
 *
 * > «La slot Fortuna aggiungiamo un'altra riga, sempre stesso funzionamento: si
 * > vince quando o una riga e' completa o quando tutto lo schermo ha la stessa
 * > immagine, in quel caso si sblocca pure l'immagine.»
 *
 * Quindi nove caselle. Una fila completa paga come prima, piu' file si sommano,
 * e il colpo grosso adesso e' **tutto lo schermo** uguale, non sei caselle.
 * Quanto spesso succede non e' cambiato: e' scritto in `QUANTO_ESCE`, non viene
 * dal numero di caselle.
 *
 * ⚠ **Non e' l'altra slot con meno rulli.** Sono due macchine con due mestieri
 * (CONCETTI.md § 11): davanti a `DaProdSlot` si **monta** una cosa — dodici
 * rulli, si blocca, si manda a controllare, e paga esperienza. Qui non si monta
 * niente: si tira, e ogni tanto cade una figurina. La fortuna costa tempo, e
 * inventare resta l'unica strada che paga invece di far pagare.
 *
 * ⚠ **Il mazzo non e' scritto da nessuna parte: si conta a ogni giro.** Sono le
 * figurine dei pacchetti chiusi che hanno una faccia da mostrare. Cosi' «a ogni
 * pacchetto si aggiorna automaticamente» non e' una cosa da ricordarsi di fare:
 * e' come e' fatta. Un elenco tenuto a parte sarebbe il solito secondo posto da
 * riallineare — quello che il CLAUDE.md di questo progetto mette in cima.
 */

import type { Deposito } from "./deposito";
import { gradoDiFigurina, NienteDaFare } from "./banco";
import { altezza, fra, pescaPesata, scalino, type Caso } from "./regole";
import type { Collezionabile, DallaLibreria, Grado } from "./tipi";

/**
 * ⚠ **Quanto si punta: cinquanta, cento, duecento lire.** Parole sue.
 *
 * Sono lire piccole e non euro contati in lire, e la differenza conta: un giro
 * deve costare **poco**, perche' il punto e' tirare tante volte. Il premio si
 * conta in volte la puntata, quindi chi punta duecento vince quattro volte chi
 * punta cinquanta — e rischia quattro volte tanto.
 */
export const PUNTATE = [50, 100, 200] as const;

/**
 * La forma della macchina: tre file da tre. La pagina la legge da qui — il PC
 * le manda insieme al mazzo — cosi' il giorno che si aggiunge una fila non ci
 * sono due nove da cambiare.
 */
export const FILE = 3;
export const PER_FILA = 3;
export const CASELLE = FILE * PER_FILA;

/**
 * ⚠ **Quanto spesso si vince, su diecimila giri.** E' una scelta, non un conto.
 *
 * Sarebbe venuto da se' pescando sei simboli a caso e guardando cosa esce — ed
 * e' esattamente quello che non si deve fare: con cento figurine nel mazzo, tre
 * uguali in fila capitano una volta su diecimila, e con dieci una volta su
 * cento. Cioe' la macchina cambierebbe mestiere da sola ogni volta che chi
 * comanda chiude un pacchetto, senza che nessuno l'abbia deciso. E' la stessa
 * regola dei gradi sui rulli (`quantoEsce` in `regole.ts`): **prima si decide
 * cosa deve succedere, poi si riempiono le caselle**.
 *
 * «Le possibilita' di vincere sono basse»: tredici giri su cento pagano
 * qualcosa, e quasi sempre poco.
 *
 * ⚠ **Con la terza fila le fette sono rimaste quelle**, piu' una sottile per le
 * tre file insieme. Nove caselle pescate a caso avrebbero fatto vincere piu'
 * spesso — tre possibilita' di fila invece di due — e la macchina avrebbe
 * cambiato mestiere senza che nessuno l'avesse deciso.
 */
export const QUANTO_ESCE = {
  /** Tutto lo schermo uguale: una volta ogni duemila giri. E' il colpo della vita. */
  pieno: 5,
  /** Tutte e tre le file, con figurine non tutte uguali: uno ogni mille. */
  treFile: 10,
  /** Due file su tre: poco piu' di una su cento. */
  dueFile: 120,
  /** Una fila sola: dodici su cento. E' quello che tiene in piedi la serata. */
  unaFila: 1200,
} as const;

/** Su quante. Diecimila, come i gradi: cosi' si puo' scrivere «tre su diecimila». */
const SU = 10_000;

/**
 * ⚠ **Quanto paga una fila: da due a tredici volte la puntata**, secondo il
 * grado della figurina che l'ha fatta.
 *
 * «Un premio in lire leggero», parole sue. Con cento lire di puntata una fila
 * di Basic ne rende duecento e una di Ethernal milletrecento: si sente la
 * differenza, e non si riempie il portafoglio. Il grado ce l'ha gia' ogni
 * figurina addosso (`gradoDiFigurina`), quindi non c'e' una seconda tabella da
 * tenere allineata: e' l'altezza nella scala, piu' due.
 */
export function quantoPagaUnaFila(grado: Grado): number {
  return 2 + altezza(grado);
}

/**
 * ⚠ **Il superbonus: da quaranta a centocinquanta volte la puntata.**
 *
 * «Sempre contenuto», parole sue: duecento lire puntate su una figurina Rare
 * fanno ottomilaquattrocento lire, cioe' quattro euro. Tanto per una serata,
 * niente per l'economia del gioco — e comunque **non e' quello il premio**: il
 * premio e' la figurina, che da qui in poi e' tua.
 */
export function quantoPagaIlPieno(grado: Grado): number {
  return 40 + altezza(grado) * 10;
}

/** Una figurina come sta sul rullo: la sua faccia, e quanto pesa. */
export interface SimboloMacchinetta {
  id: string;
  titolo: string;
  grado: Grado;
  prezzo: number;
  /** Chi l'ha inventata. Si scrive sotto la casella: e' il suo nome. */
  daChi: string;
  /** L'immagine, com'e' scritta nella libreria della suite. */
  faccia: DallaLibreria;
}

/**
 * ⚠ **La faccia di una figurina: solo un'immagine, niente altro.**
 *
 * «Deve usare solo le immagini dei pacchetti». Un prompt e' una riga di testo e
 * su un rullo non si riconosce; un brano e' un rettangolo con un tasto play, e
 * sei rettangoli uguali non sono una slot. Quindi:
 *
 * 1. il primo allegato che e' un'immagine — e' quello che si vede nello shop;
 * 2. se no la **copertina**, che e' proprio la faccia che la suite fa ai brani
 *    e ai video quando non ce l'hanno;
 * 3. se no il file stesso, quando la figurina **e'** un'immagine della galleria.
 *
 * Niente di tutto questo, niente rullo: quella figurina si prende dai pacchetti
 * o dal negozio, non da qui.
 */
export function facciaDi(c: Collezionabile): DallaLibreria | null {
  const eUnImmagine = (l?: DallaLibreria) =>
    Boolean(l && String(l.mime ?? "").indexOf("image/") === 0);
  const primaImmagine = (c.allegati ?? []).find(eUnImmagine);
  if (primaImmagine) return primaImmagine;
  if (eUnImmagine(c.copertina)) return c.copertina ?? null;
  if (eUnImmagine(c.libreria)) return c.libreria ?? null;
  return null;
}

/**
 * Il mazzo: le figurine dei pacchetti chiusi che hanno una faccia.
 *
 * ⚠ **Solo quelle dei pacchetti**, non tutto il magazzino. Una cosa presa
 * stamattina e non ancora impacchettata non gira: se girasse, la macchinetta
 * regalerebbe roba che non si puo' ancora comprare da nessuna parte, e il
 * pacchetto non varrebbe piu' niente.
 *
 * Una figurina che sta in due pacchetti — non capita, ma il giorno che capita —
 * ci sta una volta sola: sul rullo e' la stessa immagine.
 */
export function mazzoMacchinetta(deposito: Deposito): SimboloMacchinetta[] {
  const dentro = new Set<string>();
  for (const p of deposito.pacchetti()) for (const id of p.dentro) dentro.add(id);
  const fuori: SimboloMacchinetta[] = [];
  for (const c of deposito.magazzino()) {
    if (!dentro.has(c.id)) continue;
    const faccia = facciaDi(c);
    if (!faccia) continue;
    fuori.push({
      id: c.id,
      titolo: c.titolo,
      grado: gradoDiFigurina(c),
      prezzo: c.prezzo ?? 0,
      daChi: c.daChi,
      faccia,
    });
  }
  return fuori;
}

/** Quante figurine servono perche' la macchinetta si accenda. */
export const MINIMO_PER_ACCENDERSI = 2;

/**
 * Perche' la macchinetta e' spenta, se lo e'. Vuoto vuol dire che e' accesa.
 *
 * Si dice in italiano e si dice **prima**: un tasto che si preme e risponde
 * «non si puo'» e' un tasto che non doveva essere premibile.
 */
export function perche(deposito: Deposito, quanti: number): string {
  if (deposito.pacchetti().length === 0) {
    return "La macchinetta si accende col primo pacchetto: chiudine uno e comincia a girare.";
  }
  if (quanti < MINIMO_PER_ACCENDERSI) {
    return "Nei pacchetti non ci sono ancora abbastanza immagini da mettere sui rulli.";
  }
  return "";
}

/** Una fila vinta: quale delle tre, con che figurina, e quanto paga. */
export interface FilaVinta {
  /** 0 e' quella in alto, 2 quella in basso. */
  riga: number;
  simbolo: SimboloMacchinetta;
  lire: number;
}

export interface EsitoMacchinetta {
  puntata: number;
  /** Le nove caselle, in ordine: tre per fila, dall'alto. */
  caselle: SimboloMacchinetta[];
  file: FilaVinta[];
  /** Vero quando tutto lo schermo e' la stessa figurina: il colpo grosso. */
  pieno: boolean;
  /** Quante lire sono entrate in tutto, premi e doppione compresi. */
  vinto: number;
  /** La figurina sbloccata dal pieno, se non ce l'avevi gia'. */
  sbloccata: SimboloMacchinetta | null;
  /** Vero se col pieno e' uscita una che avevi gia': paga il suo prezzo. */
  doppione: boolean;
  saldo: number;
}

/** Pesca una figurina dal mazzo con le frequenze dei gradi. */
function unaACaso(
  quali: SimboloMacchinetta[],
  caso: Caso,
  diversaDa?: SimboloMacchinetta,
): SimboloMacchinetta {
  const senzaQuella = diversaDa ? quali.filter((s) => s.id !== diversaDa.id) : quali;
  // Se togliendola non resta niente si ripesca fra tutte: con un mazzo di due
  // figurine capita, e un giro che non esce e' peggio di un giro strano.
  const dove = senzaQuella.length ? senzaQuella : quali;
  const scelta = pescaPesata(dove, dove.map((s) => scalino(s.grado).quantoEsce), caso);
  return scelta ?? quali[0]!;
}

/**
 * Tre caselle che **non** fanno una fila.
 *
 * ⚠ Serve, e non e' pignoleria: le caselle si riempiono dopo aver deciso
 * l'esito, e se un giro «senza niente» mettesse per caso tre figurine uguali,
 * lo schermo direbbe che hai vinto e il conto direbbe di no. La riga che si
 * vede e il premio che si prende devono venire dallo stesso posto.
 */
function trePerdenti(quali: SimboloMacchinetta[], caso: Caso): SimboloMacchinetta[] {
  const tre = [unaACaso(quali, caso), unaACaso(quali, caso), unaACaso(quali, caso)];
  if (tre[0]!.id === tre[1]!.id && tre[1]!.id === tre[2]!.id) {
    tre[2] = unaACaso(quali, caso, tre[0]);
  }
  return tre;
}

/** Quante file vincono, secondo il dado: le fette di `QUANTO_ESCE`, dalla piu' rara. */
function fileDelDado(dado: number): number {
  let soglia = QUANTO_ESCE.pieno;
  if (dado <= (soglia += QUANTO_ESCE.treFile)) return 3;
  if (dado <= (soglia += QUANTO_ESCE.dueFile)) return 2;
  if (dado <= (soglia += QUANTO_ESCE.unaFila)) return 1;
  return 0;
}

/**
 * Un giro di macchinetta.
 *
 * ⚠ **Tutto quello che conta succede qui, cioe' sul PC** (CONCETTI.md § 3): si
 * paga la puntata, si decide cosa esce, si paga il premio e si sblocca la
 * figurina. La pagina riceve le sei caselle gia' decise e fa la scena. Se
 * decidesse lei, il gioco durerebbe fino al primo che apre gli strumenti dello
 * sviluppatore.
 */
export function gira(
  deposito: Deposito,
  chi: string,
  puntata: number,
  caso: Caso,
): EsitoMacchinetta {
  const quali = mazzoMacchinetta(deposito);
  const spenta = perche(deposito, quali.length);
  if (spenta) throw new NienteDaFare(spenta);

  if (!PUNTATE.includes(puntata as (typeof PUNTATE)[number])) {
    throw new NienteDaFare("Si gioca a " + PUNTATE.join(", ") + " lire.");
  }
  const conto = deposito.conto(chi);
  if (conto.saldo < puntata) throw new NienteDaFare("Non ti bastano le lire per questo giro.");
  deposito.muovi(chi, -puntata);

  /* ---------------------------------------------- cosa deve succedere, e poi */

  const dado = fra(1, SU, caso);
  const pieno = dado <= QUANTO_ESCE.pieno;
  const quanteFile = pieno ? 0 : fileDelDado(dado);

  let caselle: SimboloMacchinetta[] = [];
  const file: FilaVinta[] = [];

  if (pieno) {
    const uno = unaACaso(quali, caso);
    caselle = Array.from({ length: CASELLE }, () => uno);
  } else {
    // Quali file vincono: si mescolano le tre e si prendono le prime.
    const ordine = [0, 1, 2];
    for (let i = ordine.length - 1; i > 0; i--) {
      const j = fra(0, i, caso);
      [ordine[i], ordine[j]] = [ordine[j]!, ordine[i]!];
    }
    const vincono = new Set(ordine.slice(0, quanteFile));
    const vinti: SimboloMacchinetta[] = [];
    for (let riga = 0; riga < FILE; riga++) {
      if (!vincono.has(riga)) {
        caselle = caselle.concat(trePerdenti(quali, caso));
        continue;
      }
      // ⚠ Con tre file vinte, l'ultima non puo' essere uguale alle altre due:
      // sarebbe lo schermo pieno, cioe' il colpo grosso regalato da un
      // arrotondamento. Con una fila perdente in mezzo il rischio non c'e'.
      const tutteUguali =
        vinti.length === FILE - 1 && vinti.every((s) => s.id === vinti[0]!.id);
      const s = unaACaso(quali, caso, tutteUguali ? vinti[0] : undefined);
      vinti.push(s);
      caselle = caselle.concat([s, s, s]);
      file.push({ riga, simbolo: s, lire: puntata * quantoPagaUnaFila(s.grado) });
    }
  }

  /* ------------------------------------------------------- quanto si porta a casa */

  let vinto = file.reduce((somma, f) => somma + f.lire, 0);
  let sbloccata: SimboloMacchinetta | null = null;
  let doppione = false;

  if (pieno) {
    const uno = caselle[0]!;
    vinto += puntata * quantoPagaIlPieno(uno.grado);
    /**
     * ⚠ **La figurina entra in collezione, ed e' quello il premio.**
     *
     * «L'immagine viene sbloccata e aggiunta nell'inventario». E' la terza
     * strada per averne una (CONCETTI.md § 11): non l'hai inventata e non l'hai
     * comprata, ti e' capitata. Deve capitare di rado, e infatti capita una
     * volta su duemila giri.
     *
     * ⚠ **Il doppione paga, come nei pacchetti.** Una cosa che avevi gia' e che
     * non ti da' niente perche' «ce l'avevi» e' la cosa che fa smettere di
     * giocare: qui vale il suo prezzo in lire, esattamente come quando cade da
     * un pacchetto.
     */
    if (deposito.colleziona(chi, uno.id)) sbloccata = uno;
    else {
      doppione = true;
      vinto += Math.max(1, uno.prezzo);
    }
  }

  if (vinto > 0) deposito.muovi(chi, vinto);

  return {
    puntata,
    caselle,
    file,
    pieno,
    vinto,
    sbloccata,
    doppione,
    saldo: deposito.conto(chi).saldo,
  };
}
