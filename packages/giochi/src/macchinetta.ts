/**
 * **La macchinetta**: la seconda slot della sala giochi, quella delle figurine.
 *
 * Chiesta il 12 settembre 2026 con sei rulli in due file («funziona come una
 * slot classica, si gioca a 50, 100 o 200 lire, se si riescono a mettere in fila
 * gli item si vince»), cresciuta a tre file l'11, e lo stesso giorno ripensata
 * nel giro:
 *
 * > «Deve mostrare tutte le immagini dei pacchetti. Se ne escono 9 tutte uguali
 * > sblocchi l'item; tutti uguali su una sola riga bonus, 2 righe ancora piu'
 * > bonus, 3 righe superbonus e sblocco. L'utente paga, gira 2 volte: la prima
 * > si riempie lo schermo e puo' decidere di bloccare alcuni item, quindi
 * > rigira. Se l'utente non seleziona nulla viene comunque aggiornata la
 * > tabella: un giro in realta' sono due click.»
 *
 * ⚠ **Un giro sono due tiri, e si paga una volta.** Il primo riempie lo schermo
 * e non paga niente: serve a vedere cosa c'e'. Si tengono le caselle che
 * servono, e il secondo cambia le altre — ed e' li' che si decide. Fra i due il
 * giro sta scritto nel conto (`Conto.giroAperto`), cosi' chiudere la pagina a
 * meta' non lo perde e non lo fa pagare due volte.
 *
 * ⚠ **Tenere aiuta, ma non regala.** Il vecchio principio resta: prima si
 * decide cosa deve succedere, poi si riempiono le caselle. Il primo tiro mette
 * una coppia in una fila con una frequenza scritta (`PRIMO_TIRO`); il secondo
 * completa una fila con una frequenza scritta, che dipende da quante ne
 * mancano (`SECONDO_TIRO`). Quanto spesso si vince non viene da quante
 * figurine ci sono sui rulli: se venisse da li', la macchina cambierebbe
 * mestiere ogni volta che chi comanda chiude un pacchetto.
 *
 * ⚠ **Sui rulli ci vanno tutte le figurine dei pacchetti**, anche quelle senza
 * una foto — la pagina gliene disegna una — e le cinquanta della casa. Fino
 * all'11 settembre giravano solo quelle con un'immagine attaccata, e nel file
 * vero erano undici su quarantacinque, tutte inventate dagli stessi due
 * dispositivi: «vedo solo immagini di cammo o tabletcammo».
 */

import type { Deposito } from "./deposito";
import { gradoDiFigurina, NienteDaFare } from "./banco";
import { CASA, gradoPer, unaCopiaInPiu, type CopiaDellaCasa } from "./casa";
import { altezza, fra, pescaPesata, scalino, type Caso } from "./regole";
import type { Collezionabile, DallaLibreria, Grado, TipoCollezionabile } from "./tipi";

/**
 * ⚠ **Quanto si punta: cinquanta, cento, duecento lire.** Parole sue.
 *
 * Il premio si conta in volte la puntata, quindi chi punta duecento vince
 * quattro volte chi punta cinquanta — e rischia quattro volte tanto.
 */
export const PUNTATE = [50, 100, 200] as const;

/** La forma della macchina: tre file da tre. La pagina la legge da qui. */
export const FILE = 3;
export const PER_FILA = 3;
export const CASELLE = FILE * PER_FILA;

/**
 * ⚠ **Il primo tiro: una coppia da tenere, in una fila su tre e poco piu'.**
 * Su cento, per fila. Una fila senza coppia si puo' giocare lo stesso — si
 * tiene una casella sola, o niente — ma rende molto meno.
 *
 * Il primo tiro non fa mai una fila intera: non paga niente, e una fila fatta
 * a meta' giro sarebbe un premio regalato prima di giocare.
 */
export const PRIMO_TIRO = { coppia: 30 } as const;

/**
 * ⚠ **Il secondo tiro: quanto spesso una fila si completa**, su cento, secondo
 * quante caselle mancano a farla. Vale solo se quelle tenute nella fila sono
 * tutte uguali: due diverse non fanno mai una fila.
 *
 * Tenendo le coppie quando ci sono, un giro paga qualcosa poco meno di una
 * volta su cinque, e la macchinetta porta via piu' di quanto da' — la prova
 * tira mille volte giocando bene e guarda il conto scendere.
 */
export const SECONDO_TIRO = { manca1: 15, manca2: 3, manca3: 1 } as const;

/** Due file: il doppio. «2 righe ancora piu' bonus.» */
export const DUE_FILE_VALGONO = 2;

/** Tutto lo schermo uguale: il superbonus, due volte. */
export const TUTTO_UGUALE_VALE = 2;

/**
 * ⚠ **Quanto paga una fila: da due a tredici volte la puntata**, secondo il
 * grado della figurina che l'ha fatta. «Un premio in lire leggero», parole sue.
 */
export function quantoPagaUnaFila(grado: Grado): number {
  return 2 + altezza(grado);
}

/**
 * ⚠ **Il superbonus: da quaranta a centocinquanta volte la puntata.** Si
 * prende con tre file, e **non e' quello il premio**: il premio sono le
 * figurine delle file, che si sbloccano.
 */
export function quantoPagaIlPieno(grado: Grado): number {
  return 40 + altezza(grado) * 10;
}

/** Una figurina come sta sul rullo. */
export interface SimboloMacchinetta {
  id: string;
  titolo: string;
  /** Per quelle della casa e' il grado di chi gioca: crescono con le copie. */
  grado: Grado;
  prezzo: number;
  /** Chi l'ha inventata. Per quelle della casa, nessuno. */
  daChi: string;
  /** L'immagine, se ce l'ha. Senza, la pagina ne disegna una. */
  faccia: DallaLibreria | null;
  /** Il brano o il video attaccato: la sua copertina la sa la libreria. */
  suono: DallaLibreria | null;
  tipo: TipoCollezionabile | "casa";
  tavolo: string;
  /** Solo per le figurine della casa: il segno e la tinta del disegno. */
  casa?: { numero: number; segno: string; tinta: number };
}

/**
 * ⚠ **La faccia di una figurina: un'immagine, se ce n'e' una.**
 *
 * 1. il primo allegato che e' un'immagine — e' quello che si vede nello shop;
 * 2. se no la **copertina**, che e' la faccia che la suite fa ai brani;
 * 3. se no il file stesso, quando la figurina **e'** un'immagine della galleria.
 *
 * Niente di tutto questo, e la pagina disegna una faccia sua col titolo e il
 * colore del grado: dall'11 settembre 2026 non c'e' piu' una figurina senza.
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
 * Il brano o il video di una figurina, se ne ha uno: la sua copertina la
 * libreria della suite ce l'ha gia' — le fa lei — e basta chiedergliela.
 * Nel file vero un brano su due era senza copertina attaccata.
 */
export function suonoDi(c: Collezionabile): DallaLibreria | null {
  const siSente = (l?: DallaLibreria) => /^(audio|video)\//.test(String(l?.mime ?? ""));
  const allegato = (c.allegati ?? []).find(siSente);
  if (allegato) return allegato;
  return siSente(c.libreria) ? (c.libreria ?? null) : null;
}

/**
 * Il mazzo di chi gioca: le figurine dei pacchetti chiusi, tutte, e le
 * cinquanta della casa.
 *
 * ⚠ **Solo quelle dei pacchetti**, non tutto il magazzino: una cosa presa
 * stamattina e non ancora impacchettata non gira — regalerebbe roba che non si
 * puo' ancora comprare da nessuna parte.
 *
 * ⚠ **Senza pacchetti non gira nemmeno la casa.** La macchinetta si accende col
 * primo pacchetto: e' la regola del 12 settembre, e le figurine della casa
 * stanno *dentro* ai pacchetti.
 */
export function mazzoMacchinetta(deposito: Deposito, chi: string): SimboloMacchinetta[] {
  const dentro = new Set<string>();
  for (const p of deposito.pacchetti()) for (const id of p.dentro) dentro.add(id);
  const fuori: SimboloMacchinetta[] = [];
  for (const c of deposito.magazzino()) {
    if (!dentro.has(c.id)) continue;
    fuori.push({
      id: c.id,
      titolo: c.titolo,
      grado: gradoDiFigurina(c),
      prezzo: c.prezzo ?? 0,
      daChi: c.daChi,
      faccia: facciaDi(c),
      suono: suonoDi(c),
      tipo: c.tipo,
      tavolo: c.tavolo ?? "",
    });
  }
  if (fuori.length === 0) return fuori;
  for (const f of CASA) {
    fuori.push({
      id: f.id,
      titolo: f.nome,
      grado: gradoPer(deposito, chi, f.id),
      prezzo: 0,
      daChi: "",
      faccia: null,
      suono: null,
      tipo: "casa",
      tavolo: "",
      casa: { numero: f.numero, segno: f.segno, tinta: f.tinta },
    });
  }
  return fuori;
}

/** Quante figurine servono perche' la macchinetta si accenda. */
export const MINIMO_PER_ACCENDERSI = 2;

/**
 * Perche' la macchinetta e' spenta, se lo e'. Vuoto vuol dire che e' accesa.
 * Si dice **prima**: un tasto che risponde «non si puo'» non doveva essere
 * premibile.
 */
export function perche(deposito: Deposito, quanti: number): string {
  if (deposito.pacchetti().length === 0) {
    return "La macchinetta si accende col primo pacchetto: chiudine uno e comincia a girare.";
  }
  if (quanti < MINIMO_PER_ACCENDERSI) {
    return "Nei pacchetti non ci sono ancora abbastanza figurine da mettere sui rulli.";
  }
  return "";
}

/**
 * Quanto pesa una figurina sul rullo. ⚠ Quelle della casa pesano come un
 * Basic anche quando sono cresciute: se pesassero col loro grado, farle
 * crescere le farebbe sparire dai rulli, cioe' il contrario di un premio.
 */
function peso(s: SimboloMacchinetta): number {
  return scalino(s.casa ? "basic" : s.grado).quantoEsce;
}

/** Pesca una figurina dal mazzo, diversa da quella data se si puo'. */
function unaACaso(
  quali: SimboloMacchinetta[],
  caso: Caso,
  diversaDa?: SimboloMacchinetta,
): SimboloMacchinetta {
  const senzaQuella = diversaDa ? quali.filter((s) => s.id !== diversaDa.id) : quali;
  const dove = senzaQuella.length ? senzaQuella : quali;
  return pescaPesata(dove, dove.map(peso), caso) ?? quali[0]!;
}

/**
 * Tre caselle che **non** fanno una fila. Le caselle si riempiono dopo aver
 * deciso l'esito: se un giro «senza niente» mettesse per caso tre uguali, lo
 * schermo direbbe che hai vinto e il conto no.
 */
function trePerdenti(quali: SimboloMacchinetta[], caso: Caso): SimboloMacchinetta[] {
  const tre = [unaACaso(quali, caso), unaACaso(quali, caso), unaACaso(quali, caso)];
  if (tre[0]!.id === tre[1]!.id && tre[1]!.id === tre[2]!.id) tre[2] = unaACaso(quali, caso, tre[0]);
  return tre;
}

/** Una fila con una coppia dentro, e la terza diversa in un posto a caso. */
function unaCoppia(quali: SimboloMacchinetta[], caso: Caso): SimboloMacchinetta[] {
  const coppia = unaACaso(quali, caso);
  const altra = unaACaso(quali, caso, coppia);
  const tre = [coppia, coppia, coppia];
  tre[fra(0, PER_FILA - 1, caso)] = altra;
  return tre;
}

/* ------------------------------------------------------------ primo tiro */

export interface PrimoTiro {
  puntata: number;
  caselle: SimboloMacchinetta[];
  saldo: number;
}

/**
 * Il primo tiro: si paga la puntata e si riempie lo schermo.
 *
 * ⚠ **Tutto quello che conta succede qui, cioe' sul PC** (CONCETTI.md § 3). La
 * pagina riceve le caselle e fa la scena. Il giro resta aperto nel conto finche'
 * non arriva il secondo tiro.
 */
export function tira(deposito: Deposito, chi: string, puntata: number, caso: Caso): PrimoTiro {
  const conto = deposito.conto(chi);
  if (conto.giroAperto) {
    throw new NienteDaFare("C'e' ancora il secondo tiro da fare: tieni quelle che vuoi e rigira.");
  }
  const quali = mazzoMacchinetta(deposito, chi);
  const spenta = perche(deposito, quali.length);
  if (spenta) throw new NienteDaFare(spenta);
  if (!PUNTATE.includes(puntata as (typeof PUNTATE)[number])) {
    throw new NienteDaFare("Si gioca a " + PUNTATE.join(", ") + " lire.");
  }
  if (conto.saldo < puntata) throw new NienteDaFare("Non ti bastano le lire per questo giro.");
  deposito.muovi(chi, -puntata);

  let caselle: SimboloMacchinetta[] = [];
  for (let riga = 0; riga < FILE; riga++) {
    caselle = caselle.concat(
      fra(1, 100, caso) <= PRIMO_TIRO.coppia ? unaCoppia(quali, caso) : trePerdenti(quali, caso),
    );
  }
  conto.giroAperto = { puntata, caselle: caselle.map((s) => s.id), quando: Date.now() };
  deposito.salva();
  return { puntata, caselle, saldo: conto.saldo };
}

/* ---------------------------------------------------------- secondo tiro */

/** Una fila vinta: quale delle tre, con che figurina, e quanto paga da sola. */
export interface FilaVinta {
  /** 0 e' quella in alto, 2 quella in basso. */
  riga: number;
  simbolo: SimboloMacchinetta;
  lire: number;
}

/** Una figurina sbloccata dalle tre file. */
export interface Sbloccata {
  simbolo: SimboloMacchinetta;
  /** Vero se non ce l'avevi: e' entrata in collezione. */
  nuova: boolean;
  /** Il doppione di una figurina vera paga il suo prezzo, come nei pacchetti. */
  lire: number;
  /** Per quelle della casa: la copia in piu', e se e' cresciuta. */
  copia: CopiaDellaCasa | null;
}

export interface EsitoMacchinetta {
  puntata: number;
  /** Le nove caselle, in ordine: tre per fila, dall'alto. */
  caselle: SimboloMacchinetta[];
  /** I posti tenuti fermi fra i due tiri. */
  tenute: number[];
  file: FilaVinta[];
  /** Tre file: il superbonus, e le figurine si sbloccano. */
  pieno: boolean;
  /** Tre file con la stessa figurina: tutto lo schermo uguale. */
  tuttoUguale: boolean;
  sbloccate: Sbloccata[];
  /** Quante lire sono entrate in tutto, doppioni compresi. */
  vinto: number;
  saldo: number;
}

/**
 * Il secondo tiro di una fila: le tenute restano, le libere cambiano.
 *
 * Si completa solo se le tenute sono tutte uguali, con la frequenza di
 * `SECONDO_TIRO` secondo quante ne mancano. Se non si completa, le libere si
 * riempiono senza fare una fila per caso.
 */
function secondoTiroDellaFila(
  tenute: (SimboloMacchinetta | null)[],
  quali: SimboloMacchinetta[],
  caso: Caso,
): SimboloMacchinetta[] {
  const ferme = tenute.filter((s): s is SimboloMacchinetta => s !== null);
  if (ferme.length === tenute.length) return ferme;
  const tutteUguali = ferme.every((s) => s.id === ferme[0]!.id);
  if (tutteUguali) {
    const manca = PER_FILA - ferme.length;
    const soglia =
      manca === 1 ? SECONDO_TIRO.manca1 : manca === 2 ? SECONDO_TIRO.manca2 : SECONDO_TIRO.manca3;
    if (fra(1, 100, caso) <= soglia) {
      const s = ferme[0] ?? unaACaso(quali, caso);
      return tenute.map((t) => t ?? s);
    }
  }
  const fuori = tenute.map((t) => t ?? unaACaso(quali, caso));
  if (fuori.every((s) => s.id === fuori[0]!.id)) {
    const ultimaLibera = tenute.lastIndexOf(null);
    fuori[ultimaLibera] = unaACaso(quali, caso, fuori[0]);
  }
  return fuori;
}

/** Sblocca una figurina vinta con le tre file. */
function sblocca(deposito: Deposito, chi: string, s: SimboloMacchinetta): Sbloccata {
  if (s.casa) {
    const copia = unaCopiaInPiu(deposito, chi, s.id);
    return { simbolo: s, nuova: copia.prima === null, lire: 0, copia };
  }
  if (deposito.colleziona(chi, s.id)) return { simbolo: s, nuova: true, lire: 0, copia: null };
  // ⚠ Il doppione paga, come nei pacchetti: una cosa che avevi gia' e che non
  // ti da' niente e' la cosa che fa smettere di giocare.
  return { simbolo: s, nuova: false, lire: Math.max(1, s.prezzo), copia: null };
}

/**
 * Il secondo tiro, e il giro che si chiude.
 *
 * `tenute` sono i posti da tenere, da 0 a 8. Anche nessuno: allora cambiano
 * tutte — «se l'utente non seleziona nulla viene comunque aggiornata la
 * tabella».
 */
export function rigira(
  deposito: Deposito,
  chi: string,
  tenute: number[],
  caso: Caso,
): EsitoMacchinetta {
  const conto = deposito.conto(chi);
  const aperto = conto.giroAperto;
  if (!aperto) throw new NienteDaFare("Prima si paga e si tira: il secondo tiro viene dopo.");
  const quali = mazzoMacchinetta(deposito, chi);
  if (quali.length < MINIMO_PER_ACCENDERSI) {
    throw new NienteDaFare(perche(deposito, quali.length));
  }
  const perId = new Map(quali.map((s) => [s.id, s] as const));
  // Una figurina sparita fra i due tiri non si tiene: al suo posto ne gira un'altra.
  const prima = aperto.caselle.map((id) => perId.get(id) ?? null);
  const ferme = new Set(
    tenute.filter((i) => Number.isInteger(i) && i >= 0 && i < CASELLE && prima[i]),
  );

  let caselle: SimboloMacchinetta[] = [];
  for (let riga = 0; riga < FILE; riga++) {
    const posti = Array.from({ length: PER_FILA }, (_, k) => riga * PER_FILA + k);
    caselle = caselle.concat(
      secondoTiroDellaFila(posti.map((i) => (ferme.has(i) ? prima[i]! : null)), quali, caso),
    );
  }
  delete conto.giroAperto;

  const puntata = aperto.puntata;
  const file: FilaVinta[] = [];
  for (let riga = 0; riga < FILE; riga++) {
    const f = caselle.slice(riga * PER_FILA, (riga + 1) * PER_FILA);
    if (f.every((s) => s.id === f[0]!.id)) {
      file.push({ riga, simbolo: f[0]!, lire: puntata * quantoPagaUnaFila(f[0]!.grado) });
    }
  }
  const pieno = file.length === FILE;
  const tuttoUguale = pieno && file.every((f) => f.simbolo.id === file[0]!.simbolo.id);

  let vinto = 0;
  const sbloccate: Sbloccata[] = [];
  if (pieno) {
    let meglio = file[0]!.simbolo;
    for (const f of file) if (altezza(f.simbolo.grado) > altezza(meglio.grado)) meglio = f.simbolo;
    vinto = puntata * quantoPagaIlPieno(meglio.grado) * (tuttoUguale ? TUTTO_UGUALE_VALE : 1);
    const giaViste = new Set<string>();
    for (const f of file) {
      if (giaViste.has(f.simbolo.id)) continue;
      giaViste.add(f.simbolo.id);
      const s = sblocca(deposito, chi, f.simbolo);
      sbloccate.push(s);
      vinto += s.lire;
    }
  } else {
    vinto = file.reduce((somma, f) => somma + f.lire, 0) * (file.length === 2 ? DUE_FILE_VALGONO : 1);
  }

  if (vinto > 0) deposito.muovi(chi, vinto);
  deposito.salva();
  return {
    puntata,
    caselle,
    tenute: [...ferme].sort((a, b) => a - b),
    file,
    pieno,
    tuttoUguale,
    sbloccate,
    vinto,
    saldo: deposito.conto(chi).saldo,
  };
}
