/**
 * Il banco: tirare la leva, mandare una cosa a controllare, aprire un
 * pacchetto, tenere il conto.
 *
 * Sta in mezzo fra le regole (che non sanno chi gioca) e il deposito (che non
 * sa giocare). Qui dentro succedono le cose che contano: si controlla che uno
 * abbia i soldi, si pesca, si paga, si mette in fila.
 *
 * ⚠ **Questo file gira solo sul PC.** Non e' un dettaglio di dove sta il
 * codice: e' la regola numero uno del gioco (CONCETTI.md § 3). La pagina chiede
 * «giro», il PC pesca e risponde cosa e' uscito. Il giorno che una di queste
 * funzioni finisse dentro la pagina, il primo che apre gli strumenti da
 * sviluppatore si regala il Mythic — e, peggio, si approva le cose da solo.
 */

import { Deposito } from "./deposito";
import {
  fra,
  gradoDiPrezzo,
  livelloDi,
  valoreDaPrendere,
  impronta as improntaDi,
  inGioco,
  meglioDi,
  montaPrompt,
  pescaPesata,
  pescaPezzo,
  scalino,
  valore,
  valuta,
  type Caso,
} from "./regole";
import { PEZZI_IMMAGINI, PEZZI_MUSICA_CORTI, rulliDi } from "./rulli";
import { GENERI, type Genere } from "./dati/generi";
import type {
  Collezionabile,
  Conto,
  DallaLibreria,
  Era,
  Grado,
  Giro,
  Pezzo,
  PezzoInGioco,
  Tavolo,
  TipoCollezionabile,
} from "./tipi";

/** Quando qualcosa non si puo' fare, si dice **perche'**, in italiano. */
export class NienteDaFare extends Error {}

/* ------------------------------------------------------------------ i mazzi */

/**
 * I generi, un'altra volta, sotto il rullo «incrocio».
 *
 * ⚠ **I dati non sono scritti due volte**: e' la stessa lista di `GENERI`,
 * rimessa sotto un altro rullo. Incrociare due generi e' il gesto che fa uscire
 * le cose buone — «indonesian indie pop» e' un genere, «indonesian indie pop
 * incrociato con dark jazz» e' un'idea — e per farlo serve che il mazzo dei
 * generi risponda a due caselle.
 *
 * Si prepara una volta sola, alla prima richiesta: sono 6.291 oggetti, e farlo
 * a ogni giro vorrebbe dire rifarli dodici volte al secondo per niente.
 */
let incroci: Genere[] | null = null;
function generiPerIncrocio(): Genere[] {
  if (!incroci) {
    incroci = GENERI.map((g) => ({ ...g, id: "incrocio/" + g.id.slice("genere/".length), rullo: "incrocio" }));
  }
  return incroci;
}

/**
 * Tutti i pezzi di un tavolo, prima dei prezzi.
 *
 * I `custom` di chi comanda ci sono dentro: sono mazzo in piu' e girano come
 * gli altri. La roba da collezionare sono i **collezionabili**, non i pezzi,
 * quindi un pezzo aggiunto a mano non ha bisogno di un canale suo per uscire.
 */
function pezziDi(deposito: Deposito, tavolo: Tavolo, rullo: string): Pezzo[] {
  const rulli = new Set(rulliDi(tavolo).map((r) => r.id));
  const suoi =
    tavolo === "musica"
      ? rullo === "genere"
        ? GENERI
        : rullo === "incrocio"
          ? generiPerIncrocio()
          : PEZZI_MUSICA_CORTI
      : PEZZI_IMMAGINI;
  const custom = deposito.custom().filter((p) => rulli.has(p.rullo));
  return [...suoi, ...custom];
}

/** Il mazzo di un rullo, coi prezzi di adesso. */
export function mazzo(deposito: Deposito, rullo: string, tavolo: Tavolo): PezzoInGioco[] {
  const prezzi = deposito.prezzi();
  return pezziDi(deposito, tavolo, rullo)
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
    (id.startsWith("incrocio/")
      ? generiPerIncrocio().find((p) => p.id === id)
      : GENERI.find((p) => p.id === id));
  return trovato ? inGioco(trovato, prezzi) : null;
}

/* -------------------------------------------------------------------- giro */

/**
 * Tira la leva.
 *
 * `bloccati` e' lungo quanto i rulli: dove c'e' un id, quel rullo non gira e
 * resta com'era. Un giro costa uguale che si blocchi o no — e' il costo di
 * guardare lo schermo cambiare, non di quanti rulli si muovono. E' cosi' che si
 * monta una riga: si gira, si tiene quello che piace, si rigira il resto,
 * finche' tutti e dodici non stanno bene insieme.
 *
 * ⚠ **Si paga prima e si incassa dopo.** In mezzo si pesca. Se qualcosa
 * andasse storto fra le due, il conto resterebbe scalato: e' l'unico ordine in
 * cui un errore costa un giro invece di regalarne infiniti.
 */
export function tira(
  deposito: Deposito,
  chi: string,
  tavolo: Tavolo,
  era: Era,
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
    const pescato = pescaPezzo(mazzo(deposito, rulli[i]!.id, tavolo), era, caso);
    if (!pescato) throw new NienteDaFare("Il rullo «" + rulli[i]!.nome + "» e' vuoto.");
    pezzi.push(pescato);
  }

  const vincite = valuta(pezzi, imp, deposito.formazioni(), caso);
  const punti = vincite.reduce((s, v) => s + v.punti, 0);
  const meglio = meglioDi(pezzi);
  const prima = livelloDi(conto.esperienza, imp.perIlLivello);
  const aggiornato = deposito.segnaGiro(chi, punti, meglio);
  const livello = livelloDi(aggiornato.esperienza, imp.perIlLivello);

  return {
    tavolo,
    era,
    pezzi,
    costo: imp.costoGiro,
    vincite,
    punti,
    esperienza: aggiornato.esperienza,
    livello,
    salito: livello > prima,
    meglio,
    valore: valore(pezzi),
    prompt: montaPrompt(pezzi),
    regalo: regalaOgniTanto(deposito, chi, caso) ?? undefined,
    saldo: aggiornato.saldo,
    quando: Date.now(),
  };
}

/**
 * Ogni tanto, girando, cade una figurina del magazzino.
 *
 * Solo fra quelle che uno **non ha gia'**: un regalo che e' un doppione non e'
 * un regalo, e' un messaggio che dice «hai gia' tutto» quando non e' vero.
 */
function regalaOgniTanto(deposito: Deposito, chi: string, caso: Caso): Collezionabile | null {
  const imp = deposito.impostazioni();
  if (imp.unaOgniGiri <= 0) return null;
  if (caso() * imp.unaOgniGiri >= 1) return null;

  const conto = deposito.conto(chi);
  const nuove = deposito.magazzino().filter((c) => !conto.collezione.includes(c.id));
  if (nuove.length === 0) return null;

  const presa = pescaPesata(
    nuove,
    nuove.map((c) => scalino(gradoDiFigurina(c)).quantoEsce),
    caso,
  );
  if (!presa) return null;
  deposito.colleziona(chi, presa.id);
  return presa;
}

/* --------------------------------------------------- mandare a controllare */

/**
 * Il grado di una figurina.
 *
 * ⚠ **Se sta in vetrina vale quello scelto da chi comanda**, non quello che
 * verrebbe dal prezzo. Chiesto il 10 settembre 2026: «in base alla rarita' che
 * sceglie sempre l'admin, e il grado di rarita' puo' essere trovato anche nei
 * pacchetti se sei fortunato». Quindi e' lo stesso numero a dire due cose:
 * quanto costa in vetrina e quanto raramente cade da un pacchetto.
 */
export function gradoDiFigurina(c: Collezionabile): Grado {
  return c.inVetrina && c.gradoVetrina ? c.gradoVetrina : gradoDiPrezzo(c.prezzo ?? 0);
}

/** Il titolo di una figurina: i nomi italiani dei pezzi, uno dietro l'altro. */
function titoloDi(pezzi: PezzoInGioco[]): string {
  return pezzi.map((p) => p.nome).join(" · ");
}

function nuovoId(): string {
  return "c_" + Date.now().toString(36) + Math.floor(Math.random() * 1e8).toString(36);
}

/**
 * Cosa e' successo mandando qualcosa.
 *
 * Non e' sempre «l'ho mandata». Le combinazioni buone le trova piu' di una
 * persona, e quello che succede quando ne esce una gia' vista e' la regola che
 * Cammo ha scritto il 9 settembre 2026 — ed e' la piu' bella del gioco.
 */
export interface EsitoInvio {
  esito:
    /** Nuova: e' in fila, chi comanda la guardera'. */
    | "mandata"
    /**
     * **Riscoperta.** Qualcun altro l'aveva gia' trovata e chi comanda l'aveva
     * gia' presa — ma tu non ce l'avevi, e ci sei arrivato per conto tuo.
     * Prendi lo stesso premio del primo, e la figurina.
     */
    | "riscoperta"
    /** Ce l'hai gia' tu: e' un buco nell'acqua, e costa due lire. */
    | "gia-tua";
  cosa: Collezionabile;
  /** Le lire guadagnate (riscoperta) o perse (gia' tua). Con il segno. */
  lire: number;
  /** Il saldo dopo. */
  saldo: number;
  /** La frase da leggere, gia' scritta in italiano. */
  detto: string;
}

/**
 * Cosa fare quando la combinazione mandata c'e' gia'.
 *
 * ⚠ **Le combinazioni buone le trova piu' di una persona, e non e' un
 * problema: e' il gioco.** Con dodici rulli e migliaia di pezzi, ritrovare per
 * caso la stessa identica riga che ha trovato tuo fratello e' difficilissimo —
 * quindi quando succede si festeggia, non si dice «gia' vista».
 *
 * Le tre strade, decise da Cammo il 9 settembre 2026:
 *
 * - **ce l'hai gia' tu** — l'hai scoperta tu, o l'hai sbloccata da un
 *   pacchetto. Rimandarla e' un buco nell'acqua e costa due lire: e' l'unico
 *   freno contro il mandare a raffica sempre la stessa;
 * - **e' presa, e tu non ce l'hai** — complimenti: prendi **lo stesso premio in
 *   lire** che ha preso chi l'ha scoperta, piu' la figurina in collezione;
 * - **e' ancora in attesa, o e' stata buttata** — non c'e' niente da premiare
 *   e niente da punire: nessuno ha ancora detto se vale. Si dice com'e' e
 *   basta.
 */
function giaVista(
  deposito: Deposito,
  chi: string,
  gia: Collezionabile,
): EsitoInvio {
  const conto = deposito.conto(chi);
  const imp = deposito.impostazioni();

  if (gia.stato === "in-attesa") {
    throw new NienteDaFare(
      gia.daChi === chi
        ? "Questa l'hai gia' mandata: sta in fila, aspetta."
        : "Qualcun altro l'ha appena mandata, e nessuno l'ha ancora guardata.",
    );
  }
  if (gia.stato === "buttata") {
    throw new NienteDaFare("Questa era gia' stata guardata, e buttata: " + (gia.motivo ?? ""));
  }

  // Da qui in giu' e' «presa», cioe' verificata da chi comanda.
  if (conto.collezione.includes(gia.id)) {
    const dopo = deposito.muovi(chi, -imp.penalitaDoppione);
    return {
      esito: "gia-tua",
      cosa: gia,
      lire: -imp.penalitaDoppione,
      saldo: dopo.saldo,
      detto: "Questa combinazione ce l'hai gia'. " + imp.penalitaDoppione + " lire di multa.",
    };
  }

  const premio = gia.prezzo ?? 0;
  deposito.muovi(chi, premio);
  deposito.colleziona(chi, gia.id);
  const dopo = deposito.conto(chi);
  return {
    esito: "riscoperta",
    cosa: gia,
    lire: premio,
    saldo: dopo.saldo,
    detto:
      "Complimenti: ci sei arrivato anche tu. Questa l'aveva trovata " +
      "qualcun altro ed e' gia' stata presa — prendi lo stesso premio, e la figurina.",
  };
}

/**
 * Manda una combinazione a controllare.
 *
 * **Non costa niente**, ed e' una scelta: se costasse, arriverebbero solo le
 * righe di cui uno e' sicuro, e le cose strane — che sono quelle che servono —
 * non arriverebbero mai (CONCETTI.md § 8).
 *
 * Chi manda non aspetta: torna a giocare, e sapra' come e' finita quando chi
 * comanda avra' guardato.
 */
export function manda(
  deposito: Deposito,
  chi: string,
  tavolo: Tavolo,
  era: Era,
  idPezzi: string[],
): EsitoInvio {
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
  if (gia) return giaVista(deposito, chi, gia);

  const nuova = deposito.aggiungi({
    id: nuovoId(),
    tipo: "prompt",
    titolo: titoloDi(pezzi),
    impronta,
    tavolo,
    era,
    pezzi: pezzi.map((p) => p.id),
    prompt: montaPrompt(pezzi),
    daChi: chi,
    quando: Date.now(),
    stato: "in-attesa",
  });
  return {
    esito: "mandata",
    cosa: nuova,
    lire: 0,
    saldo: deposito.conto(chi).saldo,
    detto: "Mandata. Continua pure a giocare: ti diranno com'e' andata.",
  };
}

/**
 * Manda una **cosa della suite** a controllare: una foto, un brano, un video.
 *
 * ⚠ E' la porta lasciata aperta di proposito, chiesta il 9 settembre 2026:
 * «predisponiamolo a ricevere tutti gli item dalla suite che possono essere
 * potenzialmente nuovi item collezionabili». Il gioco non tiene file: tiene il
 * numero di targa di una cosa che sta gia' nella libreria della suite, e quando
 * serve mostrarla la chiede a chi ospita.
 *
 * Da qui in poi e' un collezionabile come gli altri: sta in fila, chi comanda
 * le da' un prezzo o la butta, finisce nei pacchetti, i doppioni pagano.
 */
export function mandaDallaLibreria(
  deposito: Deposito,
  chi: string,
  tipo: TipoCollezionabile,
  titolo: string,
  libreria: DallaLibreria,
): Collezionabile {
  if (tipo === "prompt") throw new NienteDaFare("Un prompt si manda dalla slot, non dalla libreria.");
  if (!libreria.id) throw new NienteDaFare("Manca il numero di targa nella libreria.");

  // L'impronta di una cosa della libreria e' il suo posto: la stessa foto non
  // puo' entrare due volte, nemmeno se la manda un'altra persona.
  const impronta = "libreria:" + libreria.id;
  // Qui la regola della riscoperta non vale: due foto non si «riscoprono»,
  // sono la stessa foto. Chi la rimanda si sente dire com'e' messa e basta.
  const gia = deposito.perImpronta(impronta);
  if (gia) {
    if (gia.stato === "presa") throw new NienteDaFare("Questa c'e' gia' nel magazzino.");
    if (gia.stato === "in-attesa") throw new NienteDaFare("Questa e' gia' in attesa.");
    throw new NienteDaFare("Questa era gia' stata guardata, e buttata.");
  }

  return deposito.aggiungi({
    id: nuovoId(),
    tipo,
    titolo: titolo.trim() || "Senza nome",
    impronta,
    libreria,
    daChi: chi,
    quando: Date.now(),
    stato: "in-attesa",
  });
}

/**
 * Quanto valgono, sommati, i pezzi di cui e' fatta una combinazione.
 *
 * E' il valore **di base** di una figurina: non lo decide nessuno, viene dalla
 * rarita' dei dodici pezzi, che viene dai dati veri. Per le cose che non sono
 * prompt — una foto, un brano — di pezzi non ce ne sono, e la somma e' zero:
 * li' decide tutto il bonus di chi comanda.
 */
export function sommaDeiPezzi(deposito: Deposito, c: Collezionabile): number {
  if (!c.pezzi || c.pezzi.length === 0) return 0;
  let somma = 0;
  for (const id of c.pezzi) {
    const pezzo = pezzoPerId(deposito, id);
    if (pezzo) somma += pezzo.prezzo;
  }
  return somma;
}

/**
 * Chi comanda la prende: le da' un prezzo e la mette in magazzino.
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
  bonus: number,
  allegato?: DallaLibreria,
): Collezionabile {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
  if (c.stato !== "in-attesa") throw new NienteDaFare("Su questa e' gia' stato deciso.");

  const lire = valoreDaPrendere(sommaDeiPezzi(deposito, c), bonus);
  if (allegato && allegato.id) c.allegato = allegato;

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

/** Chi comanda la butta. Il motivo si scrive sempre: un no senza perche' non insegna niente. */
export function butta(
  deposito: Deposito,
  admin: string,
  id: string,
  motivo: string,
): Collezionabile {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
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

/** Le figurine di una serie. La serie 1 sono i primi `perSerie` numeri. */
export function serie(deposito: Deposito, numeroSerie: number): Collezionabile[] {
  const perSerie = Math.max(1, deposito.impostazioni().perSerie);
  const da = (numeroSerie - 1) * perSerie;
  return deposito.magazzino().slice(da, da + perSerie);
}

export interface Figurina {
  cosa: Collezionabile;
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
      dentro.map((c) => scalino(gradoDiFigurina(c)).quantoEsce),
      caso,
    );
    if (!presa) break;
    const nuova = deposito.colleziona(chi, presa.id);
    if (nuova) {
      figurine.push({ cosa: presa, doppione: false, lire: 0 });
    } else {
      const lire = presa.prezzo ?? 1;
      vinto += lire;
      figurine.push({ cosa: presa, doppione: true, lire });
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

/* ---------------------------------------------------------------- lo shop */

/**
 * Quanto costa in vetrina una figurina di quel grado, se chi comanda non
 * scrive un prezzo suo.
 *
 * ⚠ **Nello shop si paga caro, ed e' voluto.** Chiesto il 10 settembre 2026:
 * «l'item nello shop costa molto, ma in base alla rarita' che sceglie sempre
 * l'admin». Il senso e' che comprare non deve mai essere la strada comoda:
 * quella stessa figurina cade anche da un pacchetto, se sei fortunato. Chi
 * compra sta pagando **di non aspettare la fortuna**, e quello si paga.
 *
 * Venti volte la soglia del grado: un Rare in vetrina sta sulle 240 lire, un
 * Mythic sulle diciassettemila. Con la slot che rende solo esperienza, quelle
 * lire arrivano da una parte sola — inventando roba che a chi comanda piace.
 */
export function prezzoConsigliato(grado: Grado): number {
  return Math.max(50, scalino(grado).da * 20);
}

/**
 * Chi comanda mette una figurina in vetrina.
 *
 * Due cose insieme, e sono tutte e due sue: **che grado ha nello shop** e
 * **quanto costa**. Il grado di vetrina non e' quello che ha nella slot — li'
 * lo decidono i dati, qui lo decide una persona — ed e' quel grado a dire
 * quanto raramente la stessa figurina cade da un pacchetto.
 */
export function mettiInVetrina(
  deposito: Deposito,
  id: string,
  grado: Grado,
  prezzo?: number,
): Collezionabile {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
  if (c.stato !== "presa") {
    throw new NienteDaFare("In vetrina ci va solo roba gia' presa: prima decidi se vale.");
  }
  c.inVetrina = true;
  c.gradoVetrina = grado;
  c.prezzoVetrina = Math.max(1, Math.round(prezzo && prezzo > 0 ? prezzo : prezzoConsigliato(grado)));
  deposito.salva();
  return c;
}

export function togliDallaVetrina(deposito: Deposito, id: string): Collezionabile {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
  c.inVetrina = false;
  deposito.salva();
  return c;
}

/** Quello che si puo' comprare adesso, dal piu' caro al piu' abbordabile. */
export function vetrina(deposito: Deposito): Collezionabile[] {
  return deposito
    .collezionabili()
    .filter((c) => c.inVetrina && c.stato === "presa")
    .sort((a, b) => (b.prezzoVetrina ?? 0) - (a.prezzoVetrina ?? 0));
}

export interface Acquisto {
  cosa: Collezionabile;
  costo: number;
  saldo: number;
}

/**
 * Comprare una figurina dalla vetrina.
 *
 * Non c'e' fortuna di mezzo: paghi e ce l'hai. E' l'unica strada **sicura** per
 * avere una cosa precisa, ed e' cara apposta — le altre due (il pacchetto e il
 * regalo girando) costano meno e non promettono niente.
 */
export function compra(deposito: Deposito, chi: string, id: string): Acquisto {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
  if (!c.inVetrina || c.stato !== "presa") throw new NienteDaFare("Questa non e' in vendita.");

  const conto = deposito.conto(chi);
  if (conto.collezione.includes(c.id)) throw new NienteDaFare("Ce l'hai gia'.");

  const costo = c.prezzoVetrina ?? prezzoConsigliato(c.gradoVetrina ?? "basic");
  if (conto.saldo < costo) {
    throw new NienteDaFare("Ti mancano " + (costo - conto.saldo) + " lire.");
  }
  deposito.muovi(chi, -costo);
  deposito.colleziona(chi, c.id);
  return { cosa: c, costo, saldo: deposito.conto(chi).saldo };
}

/* -------------------------------------------------------------- classifica */

export interface RigaClassifica {
  chi: string;
  prese: number;
  mandate: number;
  collezione: number;
  colpoGrosso: number;
  migliorGrado?: string;
  saldo: number;
  giri: number;
}

/**
 * La classifica di casa.
 *
 * Ordinata per **quante cose gli hanno preso**, e poi per quante ne ha in
 * collezione. Non per il saldo: il saldo lo alza chi gioca di piu', e «chi ha
 * giocato di piu'» non e' una classifica, e' un contatore.
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
      migliorGrado: c.migliorGrado,
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
    inAttesa: deposito.collezionabili().filter((c) => c.stato === "in-attesa").length,
    serieChiuse: Math.floor(prese / perSerie),
    allaProssimaSerie: perSerie - (prese % perSerie),
  };
}

/** Un numero a caso fra due, esposto per chi monta le prove. */
export { fra };
