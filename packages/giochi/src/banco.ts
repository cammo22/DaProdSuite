/**
 * Il banco: tirare la leva, mandare una combinazione, aprire un pacchetto,
 * tenere il conto.
 *
 * Sta in mezzo fra le regole (che non sanno chi gioca) e il deposito (che non
 * sa giocare). Qui dentro succedono le cose che contano: si controlla che uno
 * abbia i soldi, si pesca, si paga, si mette in fila.
 *
 * ⚠ **Questo file gira solo sul PC.** Non e' un dettaglio di dove sta il
 * codice: e' la regola numero uno del gioco (CONCETTI.md § 3). La pagina chiede
 * «giro», il PC pesca e risponde cosa e' uscito. Il giorno che una di queste
 * funzioni finisse dentro la pagina, il primo che apre gli strumenti da
 * sviluppatore si regala il jackpot — e, peggio, si approva le combinazioni da
 * solo.
 */

import { Deposito } from "./deposito";
import {
  fra,
  impronta as improntaDi,
  inGioco,
  montaPrompt,
  pescaPesata,
  pescaPezzo,
  QUANTO_ESCE,
  raritaDiPrezzo,
  valore,
  valuta,
  type Caso,
} from "./regole";
import { PEZZI_IMMAGINI, PEZZI_MUSICA_CORTI, rulliDi } from "./rulli";
import { GENERI } from "./dati/generi";
import type { Combinazione, Conto, Giro, Pezzo, PezzoInGioco, Tavolo } from "./tipi";

/** Quando qualcosa non si puo' fare, si dice **perche'**, in italiano. */
export class NienteDaFare extends Error {}

/* ------------------------------------------------------------------ i mazzi */

/**
 * Tutti i pezzi di un tavolo, prima dei prezzi.
 *
 * I `custom` dell'admin ci sono dentro: sono mazzo in piu' e girano come gli
 * altri. La roba da collezionare sono le **combinazioni**, non i pezzi, quindi
 * un pezzo aggiunto a mano non ha bisogno di un canale suo per uscire.
 */
function pezziDi(deposito: Deposito, tavolo: Tavolo): Pezzo[] {
  const suoi = tavolo === "musica" ? [...GENERI, ...PEZZI_MUSICA_CORTI] : PEZZI_IMMAGINI;
  const rulli = new Set(rulliDi(tavolo).map((r) => r.id));
  return [...suoi, ...deposito.custom().filter((p) => rulli.has(p.rullo))];
}

/** Il mazzo di un rullo, coi prezzi di adesso. */
export function mazzo(deposito: Deposito, rullo: string, tavolo: Tavolo): PezzoInGioco[] {
  const prezzi = deposito.prezzi();
  return pezziDi(deposito, tavolo)
    .filter((p) => p.rullo === rullo)
    .map((p) => inGioco(p, prezzi));
}

/** Un pezzo per id, custom compresi: serve a rileggere quelli bloccati. */
export function pezzoPerId(deposito: Deposito, id: string): PezzoInGioco | null {
  const prezzi = deposito.prezzi();
  const trovato =
    deposito.custom().find((p) => p.id === id) ??
    PEZZI_IMMAGINI.find((p) => p.id === id) ??
    PEZZI_MUSICA_CORTI.find((p) => p.id === id) ??
    GENERI.find((p) => p.id === id);
  return trovato ? inGioco(trovato, prezzi) : null;
}

/* -------------------------------------------------------------------- giro */

/**
 * Tira la leva.
 *
 * `bloccati` e' lungo quanto i rulli: dove c'e' un id, quel rullo non gira e
 * resta com'era. Un giro costa uguale che si blocchi o no — e' il costo di
 * guardare lo schermo cambiare, non di quanti rulli si muovono. E' cosi' che si
 * monta una riga: si gira, si tiene quello che piace, si rigira il resto.
 *
 * ⚠ **Si paga prima e si incassa dopo.** In mezzo si pesca. Se qualcosa
 * andasse storto fra le due, il conto resterebbe scalato: e' l'unico ordine in
 * cui un errore costa un giro invece di regalarne infiniti.
 */
export function tira(
  deposito: Deposito,
  chi: string,
  tavolo: Tavolo,
  bloccati: (string | null)[],
  caso: Caso,
): Giro {
  const rulli = rulliDi(tavolo);
  if (rulli.length === 0) throw new NienteDaFare("Questo tavolo non esiste.");

  const imp = deposito.impostazioni();
  const conto = deposito.conto(chi);
  if (conto.saldo < imp.costoGiro) {
    throw new NienteDaFare("Non ti bastano le lire per un giro.");
  }
  deposito.muovi(chi, -imp.costoGiro);

  const pezzi: PezzoInGioco[] = [];
  for (let i = 0; i < rulli.length; i++) {
    const bloccato = bloccati[i] ? pezzoPerId(deposito, bloccati[i]!) : null;
    // Un pezzo bloccato vale solo se e' di **questo** rullo: senza il controllo,
    // chi chiama potrebbe bloccare uno stile nella casella del soggetto e
    // montarsi un prompt che il gioco non avrebbe mai potuto dare.
    if (bloccato && bloccato.rullo === rulli[i]!.id) {
      pezzi.push(bloccato);
      continue;
    }
    const pescato = pescaPezzo(mazzo(deposito, rulli[i]!.id, tavolo), caso);
    if (!pescato) throw new NienteDaFare("Il rullo «" + rulli[i]!.nome + "» e' vuoto.");
    pezzi.push(pescato);
  }

  const vincite = valuta(pezzi, imp, deposito.formazioni(), caso);
  const pagato = vincite.reduce((s, v) => s + v.lire, 0);
  if (pagato > 0) deposito.muovi(chi, pagato);
  const aggiornato = deposito.segnaGiro(chi, pagato);

  return {
    tavolo,
    pezzi,
    costo: imp.costoGiro,
    vincite,
    pagato,
    valore: valore(pezzi),
    prompt: montaPrompt(pezzi),
    // La figurina che ogni tanto cade girando: e' l'altra strada per
    // sbloccarle, quella di chi gioca e basta invece di comprare pacchetti.
    regalo: regalaOgniTanto(deposito, chi, caso) ?? undefined,
    saldo: aggiornato.saldo,
    quando: Date.now(),
  };
}

/**
 * Ogni tanto, girando, cade una combinazione del magazzino.
 *
 * Solo fra quelle che uno **non ha gia'**: un regalo che e' un doppione non e'
 * un regalo, e' un messaggio che dice «hai gia' tutto» quando non e' vero.
 */
function regalaOgniTanto(deposito: Deposito, chi: string, caso: Caso): Combinazione | null {
  const imp = deposito.impostazioni();
  if (imp.unaOgniGiri <= 0) return null;
  if (caso() * imp.unaOgniGiri >= 1) return null;

  const conto = deposito.conto(chi);
  const nuove = deposito.magazzino().filter((c) => !conto.collezione.includes(c.id));
  if (nuove.length === 0) return null;

  const presa = pescaPesata(nuove, nuove.map((c) => QUANTO_ESCE[raritaDiPrezzo(c.prezzo ?? 0)]), caso);
  if (!presa) return null;
  deposito.colleziona(chi, presa.id);
  return presa;
}

/* ------------------------------------------------- mandare una combinazione */

/** Il titolo di una figurina: i nomi italiani dei pezzi, uno dietro l'altro. */
function titoloDi(pezzi: PezzoInGioco[]): string {
  return pezzi.map((p) => p.nome).join(" · ");
}

/**
 * Manda una combinazione a controllare.
 *
 * **Non costa niente**, ed e' una scelta: se costasse, arriverebbero solo le
 * righe di cui uno e' sicuro, e le cose strane — che sono quelle che servono —
 * non arriverebbero mai (CONCETTI.md § 8).
 *
 * Chi manda non aspetta: torna a giocare, e sapra' come e' finita quando
 * l'admin avra' guardato.
 */
export function manda(
  deposito: Deposito,
  chi: string,
  tavolo: Tavolo,
  idPezzi: string[],
): Combinazione {
  const rulli = rulliDi(tavolo);
  if (rulli.length === 0) throw new NienteDaFare("Questo tavolo non esiste.");
  if (idPezzi.length !== rulli.length) {
    throw new NienteDaFare("La combinazione non e' completa: mancano dei pezzi.");
  }

  const pezzi: PezzoInGioco[] = [];
  for (let i = 0; i < rulli.length; i++) {
    const pezzo = pezzoPerId(deposito, idPezzi[i] ?? "");
    if (!pezzo) throw new NienteDaFare("Un pezzo di questa combinazione non esiste.");
    if (pezzo.rullo !== rulli[i]!.id) {
      throw new NienteDaFare("Il pezzo «" + pezzo.nome + "» non e' di quella casella.");
    }
    pezzi.push(pezzo);
  }

  const impronta = improntaDi(pezzi.map((p) => p.id));
  const gia = deposito.perImpronta(impronta);
  if (gia) {
    // Si dice subito e si dice cosa: aspettare tre giorni per sentirsi
    // rispondere «era gia' di un altro» e' peggio di un no immediato.
    if (gia.stato === "presa") throw new NienteDaFare("Questa combinazione c'e' gia' nel magazzino.");
    if (gia.stato === "in-attesa") throw new NienteDaFare("Questa combinazione e' gia' in attesa.");
    throw new NienteDaFare("Questa combinazione era gia' stata guardata, e buttata.");
  }

  return deposito.aggiungiCombinazione({
    id: "c_" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    tavolo,
    pezzi: pezzi.map((p) => p.id),
    impronta,
    prompt: montaPrompt(pezzi),
    titolo: titoloDi(pezzi),
    daChi: chi,
    quando: Date.now(),
    stato: "in-attesa",
  });
}

/**
 * L'admin la prende: le da' un prezzo e la mette in magazzino.
 *
 * Tre cose insieme, e vanno insieme:
 *
 * 1. prende il **posto** nel magazzino, che non riparte mai da capo;
 * 2. **paga chi l'ha mandata**, una volta sola — e' il motivo per cui uno si
 *    prende la briga di montare una riga buona;
 * 3. **gliela mette in collezione**: chi l'ha inventata ce l'ha, e non deve
 *    ricomprarsi in un pacchetto la roba sua.
 */
export function prendi(
  deposito: Deposito,
  admin: string,
  id: string,
  prezzo: number,
): Combinazione {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa combinazione non c'e'.");
  if (c.stato !== "in-attesa") throw new NienteDaFare("Su questa e' gia' stato deciso.");
  const lire = Math.max(1, Math.round(prezzo));

  c.stato = "presa";
  c.prezzo = lire;
  c.numero = deposito.prossimoNumero();
  c.daAdmin = admin;
  c.decisa = Date.now();

  deposito.muovi(c.daChi, lire);
  const conto = deposito.conto(c.daChi);
  conto.prese += 1;
  deposito.colleziona(c.daChi, c.id);
  deposito.salva();
  return c;
}

/** L'admin la butta. Il motivo si scrive sempre: un no senza perche' non insegna niente. */
export function butta(deposito: Deposito, admin: string, id: string, motivo: string): Combinazione {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa combinazione non c'e'.");
  if (c.stato !== "in-attesa") throw new NienteDaFare("Su questa e' gia' stato deciso.");
  c.stato = "buttata";
  c.motivo = motivo.trim() || "Non andava bene.";
  c.daAdmin = admin;
  c.decisa = Date.now();
  deposito.salva();
  return c;
}

/* ------------------------------------------------------------- i pacchetti */

/** Quante serie sono chiuse: solo quelle si possono comprare. */
export function serieChiuse(deposito: Deposito): number {
  const perSerie = Math.max(1, deposito.impostazioni().perSerie);
  return Math.floor(deposito.magazzino().length / perSerie);
}

/** Le combinazioni di una serie. La serie 1 sono i primi `perSerie` numeri. */
export function serie(deposito: Deposito, numeroSerie: number): Combinazione[] {
  const perSerie = Math.max(1, deposito.impostazioni().perSerie);
  const da = (numeroSerie - 1) * perSerie;
  return deposito.magazzino().slice(da, da + perSerie);
}

export interface Figurina {
  combinazione: Combinazione;
  /** Vero se ce l'aveva gia': allora invece della figurina si prendono le lire. */
  doppione: boolean;
  lire: number;
}

export interface AperturaPacchetto {
  serie: number;
  costo: number;
  figurine: Figurina[];
  /** Quante lire hanno reso i doppioni. */
  vinto: number;
  saldo: number;
}

/**
 * Compra e apre un pacchetto di una serie chiusa.
 *
 * Le figurine si pescano con le stesse rarita' dei pezzi: quella che vale tanto
 * esce di rado. Il **doppione paga** invece di deludere — una figurina rara che
 * non da' niente perche' «ce l'avevi» e' la cosa che fa smettere di aprire.
 */
export function apriPacchetto(
  deposito: Deposito,
  chi: string,
  numeroSerie: number,
  caso: Caso,
): AperturaPacchetto {
  const imp = deposito.impostazioni();
  if (numeroSerie < 1 || numeroSerie > serieChiuse(deposito)) {
    throw new NienteDaFare("Quella serie non e' ancora chiusa: non si puo' comprare.");
  }
  const dentro = serie(deposito, numeroSerie);
  if (dentro.length === 0) throw new NienteDaFare("Quella serie e' vuota.");

  const conto = deposito.conto(chi);
  if (conto.saldo < imp.costoPacchetto) {
    throw new NienteDaFare("Non ti bastano le lire per un pacchetto.");
  }
  deposito.muovi(chi, -imp.costoPacchetto);

  const figurine: Figurina[] = [];
  let vinto = 0;
  for (let i = 0; i < Math.max(1, imp.perPacchetto); i++) {
    const presa = pescaPesata(
      dentro,
      dentro.map((c) => QUANTO_ESCE[raritaDiPrezzo(c.prezzo ?? 0)]),
      caso,
    );
    if (!presa) break;
    const nuova = deposito.colleziona(chi, presa.id);
    if (nuova) {
      figurine.push({ combinazione: presa, doppione: false, lire: 0 });
    } else {
      const lire = presa.prezzo ?? 1;
      vinto += lire;
      figurine.push({ combinazione: presa, doppione: true, lire });
    }
  }

  if (vinto > 0) deposito.muovi(chi, vinto);
  return {
    serie: numeroSerie,
    costo: imp.costoPacchetto,
    figurine,
    vinto,
    saldo: deposito.conto(chi).saldo,
  };
}

/* -------------------------------------------------------------- classifica */

export interface RigaClassifica {
  chi: string;
  prese: number;
  mandate: number;
  collezione: number;
  colpoGrosso: number;
  saldo: number;
  giri: number;
}

/**
 * La classifica di casa.
 *
 * Ordinata per **quante combinazioni gli hanno preso**, e poi per quante ne ha
 * in collezione. Non per il saldo: il saldo lo alza chi gioca di piu', e «chi
 * ha giocato di piu'» non e' una classifica, e' un contatore.
 */
export function classifica(deposito: Deposito): RigaClassifica[] {
  return deposito
    .conti()
    .map((c: Conto) => ({
      chi: c.chi,
      prese: c.prese,
      mandate: c.mandate,
      collezione: c.collezione.length,
      colpoGrosso: c.colpoGrosso,
      saldo: c.saldo,
      giri: c.giri,
    }))
    .sort(
      (a, b) =>
        b.prese - a.prese ||
        b.collezione - a.collezione ||
        b.colpoGrosso - a.colpoGrosso ||
        b.saldo - a.saldo,
    );
}

/** Quanto e' pieno il magazzino, e a che punto sta la serie che si sta riempiendo. */
export function statoMagazzino(deposito: Deposito): {
  prese: number;
  inAttesa: number;
  serieChiuse: number;
  allaProssimaSerie: number;
} {
  const imp = deposito.impostazioni();
  const prese = deposito.magazzino().length;
  const perSerie = Math.max(1, imp.perSerie);
  return {
    prese,
    inAttesa: deposito.combinazioni().filter((c) => c.stato === "in-attesa").length,
    serieChiuse: Math.floor(prese / perSerie),
    allaProssimaSerie: perSerie - (prese % perSerie),
  };
}

/** Un numero a caso fra due, esposto per chi monta le prove. */
export { fra };
