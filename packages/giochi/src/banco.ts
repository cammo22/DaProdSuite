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
  CAMBIO_EURO,
  fra,
  gradoDiPrezzo,
  livelloDi,
  valoreDaPrendere,
  valoreDeiPezzi,
  impronta as improntaDi,
  inGioco,
  meglioDi,
  montaPrompt,
  pescaPesata,
  pescaPezzo,
  scalino,
  sottoIlTetto,
  TETTO_EURO,
  valore,
  valuta,
  type Caso,
} from "./regole";
import { PEZZI_IMMAGINI, PEZZI_MUSICA_CORTI, rulliDi } from "./rulli";
import { GENERI, type Genere } from "./dati/generi";
import type {
  Collezionabile,
  Conto,
  Regalo,
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
  /**
   * ⚠ **Sotto al tetto**, e qui e' l'unico posto dove serve dirlo.
   *
   * Da questa riga passano tutti: la figurina che si guarda, quella che cade
   * da un pacchetto, quella che si regala girando, quella in vetrina. Tenere
   * il tetto qui vuol dire che il giorno che si apre Celestial si cambia
   * `TETTO_FIGURINE` e si e' aperto dappertutto.
   */
  return sottoIlTetto(c.inVetrina && c.gradoVetrina ? c.gradoVetrina : gradoDiPrezzo(c.prezzo ?? 0));
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

  /**
   * ⚠ **Si manda quello che si e' bloccato, e basta quello.** Cambiato il 10
   * settembre 2026:
   *
   * > «Le combinazioni, cioe' i prompt inviati quando si preme manda a
   * > controllare, deve inviare solo quelli bloccati e basta, anche se sono solo
   * > 3, solo quelli bloccati.»
   *
   * Prima ne voleva **dodici**, tutti e dodici, e il resto era quello che era
   * uscito a caso all'ultimo giro. Cioe': in ogni combinazione mandata c'era
   * dentro roba che non aveva scelto nessuno, e chi comanda si ritrovava a
   * giudicare mezza idea di qualcuno e mezza pescata dal mazzo.
   *
   * Bloccare un rullo e' **il gesto con cui si dice «questo si'»**. Mandare
   * solo quelli vuol dire mandare la propria idea, anche se e' fatta di tre
   * pezzi — e tre pezzi scelti valgono piu' di dodici mezzi scelti.
   *
   * Restano due regole, e sono le stesse di prima: ogni pezzo deve venire da
   * una casella **di questo tavolo**, e due pezzi non possono venire dalla
   * stessa. Il resto lo decide chi comanda quando la guarda: non tocca al banco
   * dire che tre pezzi sono pochi.
   */
  if (idPezzi.length === 0) {
    throw new NienteDaFare("Blocca almeno un rullo: si manda quello che hai tenuto.");
  }

  const pezzi: PezzoInGioco[] = [];
  const visti = new Set<string>();
  for (const id of idPezzi) {
    const pezzo = pezzoPerId(deposito, id ?? "");
    if (!pezzo) throw new NienteDaFare("Un pezzo di questa combinazione non esiste.");
    const suo = rulli.find((r) => r.id === pezzo.rullo);
    if (!suo) {
      throw new NienteDaFare("Il pezzo «" + pezzo.nome + "» non e' di questo tavolo.");
    }
    if (visti.has(pezzo.rullo)) {
      throw new NienteDaFare("Due pezzi dalla stessa casella: «" + pezzo.nome + "».");
    }
    visti.add(pezzo.rullo);
    pezzi.push(pezzo);
  }

  /**
   * ⚠ **L'ordine e' quello dei rulli, non quello in cui sono arrivati.**
   *
   * L'impronta di una combinazione si fa dagli id in fila (vedi `improntaDi`):
   * se l'ordine dipendesse da come li manda la pagina, la stessa identica
   * combinazione mandata da due persone diverse risulterebbe due combinazioni
   * diverse — e la riscoperta, che e' meta' del gioco, non scatterebbe mai.
   */
  pezzi.sort((a, b) => rulli.findIndex((r) => r.id === a.rullo) - rulli.findIndex((r) => r.id === b.rullo));

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
 * ⚠ **Quante volte si puo' far generare la stessa combinazione: quattro.**
 *
 * Chiesto il 10 settembre 2026: «puo' rigenerare e viene generato un secondo
 * file, max 4 file». Il tetto c'e' perche' ogni giro e' una generazione vera
 * che occupa il computer e sta in coda davanti a chi aspetta: senza un limite,
 * un dito rimasto premuto riempie la fila di dieci prove della stessa riga.
 *
 * Quattro e' anche quello che ci sta sulla card senza doverla scorrere, e
 * quattro immagini una accanto all'altra sono abbastanza per capire se un
 * prompt tiene o e' stato un colpo di fortuna.
 */
export const MAX_PROVE = 4;

/**
 * ⚠ **Quante cose si possono attaccare a una figurina: otto.**
 *
 * Quattro nate dal prompt (`MAX_PROVE`) piu' quattro scelte a mano dalla
 * galleria della suite, chieste cosi' il 10 settembre 2026: «lascia comunque
 * la possibilita' di allegare oltre a quelle 4 generate ulteriori max 4 file
 * dalla suite, magari da quei prompt nascono cose particolari».
 *
 * Sono due strade diverse e fa il totale una sola: al banco non interessa da
 * dove viene un file, interessa quanti ne regge una carta prima di diventare
 * un elenco.
 */
export const MAX_ALLEGATI = 8;

/**
 * Il valore **di base** di una figurina: quanto valgono i pezzi di cui e' fatta.
 *
 * Non lo decide nessuno — viene dalla rarita' di ognuno, che viene dai dati
 * veri. Per le cose che non sono prompt — una foto, un brano — di pezzi non ce
 * ne sono, e la base e' zero: li' decide tutto il bonus di chi comanda.
 *
 * ⚠ **Era la somma e dall'11 settembre 2026 e' la media** (vedi
 * `valoreDeiPezzi`): tre pezzi scelti valgono come dodici pezzi scelti, e il
 * numero sta dentro al tetto dei tre euro.
 */
export function valoreDiBase(deposito: Deposito, c: Collezionabile): number {
  if (!c.pezzi || c.pezzi.length === 0) return 0;
  const prezzi: number[] = [];
  for (const id of c.pezzi) {
    const pezzo = pezzoPerId(deposito, id);
    if (pezzo) prezzi.push(pezzo.prezzo);
  }
  return valoreDeiPezzi(prezzi);
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
  allegati?: DallaLibreria[],
  copertina?: DallaLibreria,
): Collezionabile {
  const c = deposito.perId(id);
  if (!c) throw new NienteDaFare("Questa non c'e'.");
  if (c.stato !== "in-attesa") throw new NienteDaFare("Su questa e' gia' stato deciso.");

  const lire = valoreDaPrendere(valoreDiBase(deposito, c), bonus);
  /**
   * ⚠ **Quello che chi comanda ha scelto di tenere**, e non e' per forza uno.
   *
   * Chiesto il 10 settembre 2026: «alla fine puo' selezionare uno o piu'
   * elementi generati da includere nel pacchetto». Il primo e' quello che si
   * vede nello shop — la copertina della scheda — e gli altri stanno dietro.
   *
   * Il tetto e' `MAX_ALLEGATI`: quattro nate dal prompt piu' quattro scelte a
   * mano dalla galleria. Non e' un numero tondo per caso, sono le due strade
   * per cui una cosa puo' finire attaccata qui.
   */
  const tenuti = (allegati ?? []).filter((a) => a && a.id).slice(0, MAX_ALLEGATI);
  if (tenuti.length > 0) c.allegati = tenuti;
  // La copertina si tiene solo se c'e' qualcosa da coprire: una copertina
  // attaccata al niente e' una figurina che promette una canzone che non c'e'.
  if (copertina && copertina.id && c.allegati && c.allegati.length > 0) c.copertina = copertina;

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

/* ------------------------------------------------------------- i regali */

/**
 * I tagli dei tasti con cui chi comanda manda lire.
 *
 * ⚠ **Sono euro, contati in lire.** Chiesto il 10 settembre 2026: «pulsanti
 * da 2 euro a 500 euro», e alla domanda se erano tagli o euro veri la risposta
 * e' stata: «dovevano essere l'equivalente in lire della cifra che ti ho
 * detto».
 *
 * Quindi il tasto «2 euro» vale 3.873 lire, al cambio fisso di
 * `CAMBIO_EURO` — lo stesso con cui l'interruttore del saldo legge tutto in
 * euro. Premendo l'interruttore, sui tasti si leggono 2, 5, 10... tondi.
 *
 * ⚠ **Sono grossi rispetto al resto del gioco**, e va saputo: un giro costa
 * 10 lire, e la cosa piu' preziosa che si possa avere ne vale 5.808. Il tasto
 * piu' piccolo — due euro — sono trecentottantasette giri, cioe' due terzi di
 * un Unique. E' una decisione di chi comanda, non un difetto: chi regala sta
 * facendo entrare qualcuno, non pareggiando un conto.
 *
 * Otto numeri conosciuti si scelgono in un secondo; davanti a una casella vuota
 * ci si mette a pensare quanto vale un'idea, e finisce che non si decide. E si
 * **sommano**: premere due volte «10» fa venti (chiesto il 10 settembre: «piu'
 * li premi piu' sale il valore»).
 */
export const TAGLI = [2, 5, 10, 20, 50, 100, 200, 500].map((e) => Math.round(e * CAMBIO_EURO));

/**
 * I tagli del **bonus**, quando chi comanda prende una combinazione.
 *
 * ⚠ **Sono euro come i regali, ma tagliati piccoli**: dieci centesimi, venticinque,
 * cinquanta, un euro, due, tre. Dall'11 settembre 2026.
 *
 * La storia di questi otto tasti e' la storia della scala, e vale raccontarla
 * perche' e' l'unica cosa che spiega il numero:
 *
 * - fino al 10 settembre erano **lire piccole** (2, 5, 10… 500), un'altra moneta
 *   con lo stesso nome. Il numero accanto a una figurina non si poteva
 *   confrontare con quello di un regalo, e nel gioco il portafoglio e' uno;
 * - il 10 settembre sono diventati **gli stessi dei regali** — «metti gli stessi
 *   tagli che hai messo per le ricariche» — e per farli stare nella scala la
 *   scala e' salita al milione;
 * - l'11 settembre il tetto e' scivolato a **tre euro**, e con quel tetto sette
 *   degli otto tasti dei regali lo sfondano al primo colpo: sarebbero sette
 *   tasti che fanno tutti la stessa cosa, cioe' «massimo».
 *
 * Quindi la moneta resta quella — **euro contati in lire**, l'unica che questo
 * gioco conosce — e cambia solo il taglio: sei tasti che stanno dentro ai tre
 * euro, e l'ultimo e' esattamente il tetto. Si battono e si sommano come prima
 * (`TAGLI` per i regali, § 4), e la somma non passa mai il tetto perche' e'
 * `valoreDaPrendere` a tenerlo — non i tasti.
 */
export const TAGLI_BONUS = [0.1, 0.25, 0.5, 1, 2, TETTO_EURO].map((e) =>
  Math.round(e * CAMBIO_EURO),
);

/**
 * Chi comanda manda lire a qualcuno.
 *
 * ⚠ **Le lire non si creano dal nulla in nessun altro punto del gioco.**
 * Girando si prendono punti, non lire (CONCETTI.md § 4); le lire arrivano solo
 * quando a chi comanda piace una cosa che hai mandato. Questo e' il secondo
 * rubinetto, e sta in mano a una persona sola: un regalo e' una decisione, non
 * una regola del banco.
 *
 * Non si toglie niente a nessuno: non e' un bonifico fra due conti, e' il
 * banco che paga. Togliere lire e' un'altra cosa, ed e' `azzeraPortafoglio` —
 * che non toglie un tanto, azzera.
 */
export function regala(
  deposito: Deposito,
  admin: string,
  chi: string,
  quanto: number,
  perche: string,
): { conto: Conto; regalo: Regalo } {
  if (!chi) throw new NienteDaFare("A chi?");
  /**
   * ⚠ **A se stessi si puo'.** Il divieto c'era, e l'ha tolto Cammo il 10
   * settembre 2026: «da android non posso mandare lire a me stesso».
   *
   * Sembrava una furbizia da chiudere, e non lo e': chi comanda il banco puo'
   * gia' cambiare tutti i numeri del gioco da una schermata: il divieto non
   * impediva niente, faceva solo la figura di impedirlo. E chi comanda gioca
   * anche lui — e' il primo che monta le combinazioni per far vedere come si
   * fa. Resta scritto chi ha mandato cosa a chi, che e' l'unica cosa che serve.
   */
  const lire = Math.round(quanto);
  if (!Number.isFinite(lire) || lire < 1) throw new NienteDaFare("Quanto? Da una lira in su.");
  // Cinque milioni: piu' o meno duemilacinquecento euro, cinque volte il tasto
  // piu' grosso. Non e' un permesso, e' una rete contro il tasto premuto venti
  // volte per sbaglio.
  if (lire > 5000000) throw new NienteDaFare("Troppe in una volta sola.");

  const regalo: Regalo = {
    quanto: lire,
    quando: Date.now(),
    perche: perche.trim() || "Cosi', perche' si.",
    daAdmin: admin,
  };
  const conto = deposito.muovi(chi, lire);
  conto.regali = (conto.regali ?? 0) + lire;
  conto.ultimoRegalo = regalo;
  deposito.salva();
  return { conto, regalo };
}

/**
 * Chi comanda **azzera il portafoglio** di qualcuno.
 *
 * ⚠ Chiesto l'11 settembre 2026: «un admin puo' anche azzerare il portafoglio
 * degli altri, caso mai problemi: fai un bel tastino per resettare il
 * portafoglio».
 *
 * Fino a oggi in questo file c'era scritto il contrario — «togliere lire e'
 * un'altra cosa e non c'e'; se serve, si scrive quando serve, con il suo
 * perche'» — e adesso serve, ed e' questo: **la scala e' cambiata tre volte in
 * due giorni**. Chi ha giocato con quella sbagliata ha in tasca centinaia di
 * euro che non avrebbe dovuto avere, e non esiste un modo di ricalcolarli — quei
 * soldi sono stati spesi, sommati, mescolati con i regali. L'unica cosa onesta,
 * quando i numeri di un portafoglio non vogliono piu' dire niente, e' ripartire
 * da zero.
 *
 * Tre cose, e sono le stesse del regalo, al contrario:
 *
 * 1. **il saldo va a zero**, non «giu' di tanto». Un azzeramento a meta' e' una
 *    multa, ed e' un'altra faccenda;
 * 2. **si scrive perche'**, e chi lo riceve lo legge appena apre la sala. Un
 *    portafoglio che si svuota senza spiegazioni e' un guasto, non una
 *    decisione;
 * 3. **resta scritto chi l'ha fatto.** E' il potere piu' grosso che ci sia in
 *    questo gioco: non passa in silenzio.
 *
 * ⚠ **La collezione non si tocca.** Le figurine sono quello che uno ha
 * inventato, e non sono soldi: azzerare il portafoglio non e' cancellare la
 * persona. Anche `prese`, `esperienza` e il livello restano — quelli dicono cosa
 * ha fatto, e non era sbagliato.
 */
export function azzeraPortafoglio(
  deposito: Deposito,
  admin: string,
  chi: string,
  perche: string,
): { conto: Conto; togliere: number } {
  if (!chi) throw new NienteDaFare("A chi?");
  const prima = deposito.conto(chi);
  if (prima.saldo <= 0) throw new NienteDaFare("Il portafoglio e' gia' vuoto.");

  const togliere = prima.saldo;
  const conto = deposito.muovi(chi, -togliere);
  conto.ultimoRegalo = {
    quanto: -togliere,
    quando: Date.now(),
    perche: perche.trim() || "Si ricomincia da zero.",
    daAdmin: admin,
  };
  /**
   * ⚠ **Anche il totale dei regali torna a zero**, e non e' un dettaglio: quel
   * numero vuol dire «quanto ti e' stato dato», e dopo un azzeramento la
   * risposta e' niente. Lasciarlo su vorrebbe dire un conto che dice di avere
   * ricevuto mille lire e un portafoglio vuoto, cioe' due numeri che si
   * smentiscono nella stessa schermata.
   */
  conto.regali = 0;
  deposito.salva();
  return { conto, togliere };
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
 * Venti volte la soglia del grado: un Rare in vetrina sta sulle dodicimila, un
 * Unique — il massimo che si possa mettere in vendita oggi — sulle
 * settantaduemila, cioe' trentasette euro. Con la slot che rende solo
 * esperienza, quelle lire arrivano da una parte sola: inventando roba che a chi
 * comanda piace, o ricevendone in regalo.
 *
 * ⚠ **Si', costa piu' del tetto di tre euro.** Una figurina Unique ti paga tre
 * euro quando la inventi e ne costa trentasette quando la vuoi comprare, ed e'
 * lo stesso rapporto — venti volte la soglia — che c'era su tutte le scale che
 * questo gioco ha avuto. Comprare non e' la strada comoda: quella stessa
 * figurina cade da un pacchetto, se sei fortunato. Chi compra paga **di non
 * aspettare la fortuna**.
 */
export function prezzoConsigliato(grado: Grado): number {
  // ⚠ Il pavimento scende e sale con la scala: cinquanta lire erano qualcosa
  // quando un Mythic ne valeva 850, non erano niente quando ne valeva undici
  // milioni, e adesso che il tetto e' 5.808 il pavimento e' 250. Venti volte la
  // soglia resta la regola.
  return Math.max(250, scalino(grado).da * 20);
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
  /**
   * ⚠ Il grado si tiene **sotto al tetto** gia' qui, non solo quando si legge:
   * un `gradoVetrina: "mythic"` scritto sul disco sarebbe un numero che dice
   * una cosa mentre lo schermo ne dice un'altra, e il giorno che il tetto si
   * alza tornerebbe fuori da solo senza che nessuno l'abbia deciso.
   */
  const suo = sottoIlTetto(grado);
  c.inVetrina = true;
  c.gradoVetrina = suo;
  c.prezzoVetrina = Math.max(1, Math.round(prezzo && prezzo > 0 ? prezzo : prezzoConsigliato(suo)));
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
