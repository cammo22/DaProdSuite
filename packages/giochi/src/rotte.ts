/**
 * Le rotte della sala giochi: cosa si puo' chiedere al PC, e chi lo puo'
 * chiedere.
 *
 * ⚠ **E' una funzione, non un server.** Non apre porte, non conosce HTTP,
 * non sa cos'e' un token. Prende «chi sei», «cosa chiedi» e «cosa mi porti», e
 * torna un numero e un oggetto. Cosi' la stessa identica funzione la chiama il
 * gateway della suite **e** il serverino delle prove: c'e' una sola idea di
 * cosa si puo' fare, e nessuna delle due puo' divergere dall'altra.
 *
 * Chi sei lo decide chi chiama, non questo file: nella suite lo dice il token
 * del dispositivo, e il ruolo `admin` e' quello della suite. Qui dentro
 * `chi.admin` si legge e basta — se un giorno si potesse mentire su quello, il
 * problema non sarebbe qui.
 */

import {
  apriPacchetto,
  azzeraPortafoglio,
  butta,
  creaPacchetto,
  regala,
  TAGLI,
  TAGLI_BONUS,
  classifica,
  compra,
  fuoriDaiPacchetti,
  gradoDiFigurina,
  prezzoNelloShop,
  MAX_ALLEGATI,
  MAX_PROVE,
  mettiInVetrina,
  prezzoConsigliato,
  valoreDiBase,
  togliDallaVetrina,
  vetrina,
  manda,
  mandaDallaLibreria,
  NienteDaFare,
  prendi,
  serie,
  serieChiuse,
  statoMagazzino,
  tira,
} from "./banco";
import type { Deposito } from "./deposito";
import { inventario } from "./inventario";
import type { CopiaDellaCasa } from "./casa";
import {
  DUE_FILE_VALGONO,
  facciaDi,
  FILE,
  mazzoMacchinetta,
  PER_FILA,
  perche as percheSpenta,
  PUNTATE,
  quantoPagaIlPieno,
  quantoPagaUnaFila,
  rigira as rigiraLaMacchinetta,
  SEI_UGUALI,
  suonoDi,
  tira as tiraLaMacchinetta,
  TUTTO_UGUALE_VALE,
  type Sbloccata,
  type SimboloMacchinetta,
} from "./macchinetta";
import {
  EPOCHE,
  GRADI,
  TETTO_EURO,
  TETTO_FIGURINE,
  lire,
  tettoDelValore,
  versoIlProssimo,
} from "./regole";
import { rulliDi } from "./rulli";
import type { Collezionabile, Era, Grado, Tavolo, TipoCollezionabile } from "./tipi";

/** Chi sta chiedendo. Nella suite e' il dispositivo accoppiato. */
export interface Chi {
  id: string;
  nome: string;
  admin: boolean;
}

/**
 * Quello che il gioco non sa e deve chiedere a chi lo ospita.
 *
 * I **nomi** delle persone non stanno nel gioco: stanno nella suite, insieme
 * alle facce e ai permessi. Tenerne una copia qui vorrebbe dire che il giorno
 * che uno cambia nome, in classifica resta quello vecchio.
 */
export interface Contorno {
  nomeDi(id: string): string;
  /** La faccia, se chi ci ospita ne ha una. Serve solo alla classifica. */
  facciaDi?(id: string): string | undefined;
  /**
   * Dove si vede una cosa della libreria della suite: l'indirizzo del file.
   *
   * Il gioco non tiene file — tiene il numero di targa — e per mostrare una
   * foto vinta deve chiedere a chi ospita dove sta. Senza, le figurine che non
   * sono prompt si vedono solo come titolo.
   */
  indirizzoLibreria?(id: string): string | undefined;
  /**
   * **La copertina di un brano o di un video della libreria.** La suite le fa
   * da se' (le copertine dei brani, il fotogramma dei video), e una figurina
   * con attaccato solo un brano la usa come faccia. Nel file vero, l'11
   * settembre 2026, un brano su due non aveva la copertina attaccata: c'era
   * gia', bastava chiederla. Se poi non c'e', la pagina disegna la sua.
   */
  anteprimaLibreria?(id: string): string | undefined;
  /**
   * Le ultime cose prodotte dalla suite, per attaccarne una a una figurina.
   *
   * ⚠ Chiesto il 10 settembre 2026: «lincare facilmente, non come ora,
   * l'immagine dalla suite». Prima chi comanda doveva **scrivere a mano**
   * l'indirizzo del file in una casella di testo: vuol dire aprire la galleria,
   * trovare la foto, copiarne l'indirizzo e incollarlo — quattro gesti in due
   * finestre, ogni volta. Con questo la pagina fa vedere le ultime sessanta e
   * se ne sceglie una col dito.
   *
   * Torna niente se chi ospita non ha una libreria.
   */
  elencoLibreria?(chi: string, quante: number): VoceLibreria[];
  /**
   * Chi c'e' in casa: tutte le persone della suite, non solo chi ha gia'
   * giocato.
   *
   * ⚠ Senza questo, «manda lire» mostrava solo chi aveva **gia' aperto la
   * sala giochi almeno una volta** — i conti nascono all'apertura. Cioe':
   * proprio la persona a cui vuoi mandare due lire per farla entrare non
   * comparirebbe nell'elenco. Il conto si apre da solo quando le lire arrivano.
   */
  gente?(): { id: string; nome: string; admin?: boolean }[];
  /**
   * Fa partire una generazione con questo prompt, per la stessa strada da cui
   * passano le richieste del telefono.
   *
   * ⚠ **Il gioco non sa niente di modelli.** Dice solo «questo e' un prompt
   * di musica» oppure «di immagini», e chi ospita sa cosa vuol dire: sessanta
   * secondi strumentali con ACE-Step Turbo, o un 4:3 con FLUX.2 9B. Se un
   * giorno cambia il modello buono, cambia li' — non in dodici posti.
   *
   * Torna niente se chi ospita non sa generare (il banco di prova, per esempio).
   */
  genera?(
    chi: string,
    tavolo: "immagini" | "musica",
    cosa: { prompt: string; titolo: string },
  ): { id: string; dove?: string } | null;
  /**
   * **Cosa e' uscito da una generazione**, quando e' pronta.
   *
   * ⚠ Chiesto il 10 settembre 2026: «quando un admin manda a generare un
   * contenuto, quando pronto lo deve vedere gia' allegato alla card in modo da
   * controllarlo». Prima `genera` faceva partire il lavoro e finiva li': la
   * pagina diceva «la trovi in galleria», e chi comanda doveva aprire la
   * galleria, cercarla, tornare qui e riattaccarla a mano. Due finestre per
   * guardare una cosa nata da questo tasto.
   *
   * ⚠ **Non serve un registro nuovo.** Quando una generazione finisce, la
   * libreria della suite scrive nei metadati del file da quale richiesta e'
   * nato: «cosa e' uscito da questa prova» e' una domanda a cui sa gia'
   * rispondere. Il gioco tiene il numero di targa della richiesta e chiede.
   *
   * Torna vuoto finche' non e' pronta, e vuoto per sempre se chi ospita non ha
   * una libreria (il banco di prova).
   */
  fruttiDi?(richiesta: string): VoceLibreria[];
}

/** Una cosa della libreria della suite, come la vede la sala giochi. */
export interface VoceLibreria {
  id: string;
  /** Come si chiama, per chi legge. */
  titolo: string;
  mime: string;
  /** Dove si guarda per intero. */
  url: string;
  /** Il francobollo, se ce l'ha: per i video e i brani non e' l'url. */
  anteprima?: string;
  quando?: number;
}

export interface Risposta {
  codice: number;
  dati: unknown;
}

const OK = (dati: unknown): Risposta => ({ codice: 200, dati });
const NO = (codice: number, perche: string): Risposta => ({ codice, dati: { errore: perche } });

/** Il tavolo chiesto, o quello di partenza. Musica: e' la prima slot. */
function tavoloDi(corpo: Record<string, unknown>): Tavolo {
  return corpo["tavolo"] === "immagini" ? "immagini" : "musica";
}

/** L'epoca chiesta, o tutte. Una scritta a caso vale come «sempre». */
function eraDi(corpo: Record<string, unknown>): Era {
  const detta = String(corpo["era"] ?? "sempre");
  return (EPOCHE.find((e) => e.id === detta)?.id ?? "sempre") as Era;
}

function numero(cosa: unknown, seManca: number): number {
  const n = typeof cosa === "number" ? cosa : Number(cosa);
  return Number.isFinite(n) ? n : seManca;
}

/** Dove si guarda una cosa della libreria: l'indirizzo scritto, o quello che dice chi ospita. */
function indirizzoDi(l: { id: string; url?: string } | undefined, contorno: Contorno): string {
  if (!l) return "";
  return l.url ?? (contorno.indirizzoLibreria ? (contorno.indirizzoLibreria(l.id) ?? "") : "");
}

/**
 * ⚠ **Il nome vero di una cosa della libreria.** Certe figurine si ricordano
 * come id l'indirizzo intero del file («/libreria/file/musica%2Faudio%2F…»)
 * invece del nome in libreria. Per ascoltarlo andava bene, perche' l'indirizzo
 * e' quello; per chiedere la copertina no: la libreria cercava un file che si
 * chiamasse «/libreria/file/…», non lo trovava, e il brano restava senza
 * faccia con la copertina li' accanto sul disco. Visto l'11 settembre 2026 sul
 * telefono di Cammo, dopo la 1.3.7.
 */
function idInLibreria(l: { id: string }): string {
  const PREFISSO = "/libreria/file/";
  if (!l.id.startsWith(PREFISSO)) return l.id;
  try {
    return decodeURIComponent(l.id.slice(PREFISSO.length));
  } catch {
    return l.id;
  }
}

/** Un file della libreria, come lo tiene una figurina. */
type Pezzo = { id: string; url?: string };

/**
 * ⚠ **Una foto della libreria si mostra dalla sua anteprima, non dal file.**
 * Per un'immagine sono gli stessi pixel; cambia **chi li puo' chiedere**. La
 * faccia di una figurina la vede chiunque la guardi in un pacchetto o nel
 * negozio, il file intero solo chi l'ha sbloccata (vedi `sguardiDelGioco`).
 * Chiesto l'11 settembre 2026 sera: «deve poter vedere l'anteprima e quando la
 * sblocca puo' vederla bene o ascoltarla».
 *
 * Vuoto se non e' roba della libreria — un indirizzo scritto a mano resta com'e'.
 */
function anteprimaDelPezzo(l: Pezzo, contorno: Contorno): string {
  if (!contorno.anteprimaLibreria) return "";
  if (l.url && !l.url.startsWith("/libreria/file/")) return "";
  return contorno.anteprimaLibreria(idInLibreria(l)) ?? "";
}

/**
 * ⚠ **La faccia di una figurina, per questa persona: una regola sola.** La
 * usano l'inventario, la bustina, il negozio e i rulli della macchinetta, perche'
 * una figurina che cambia faccia da una schermata all'altra non si riconosce.
 *
 * 1. l'immagine attaccata (`facciaDi`);
 * 2. se no, la copertina del brano attaccato (`suonoDi`): la libreria la fa da se';
 * 3. se no, **cosa e' uscito dalle prove**: la prima immagine dell'ultima prova
 *    che ha dato qualcosa, o la copertina del suo brano;
 * 4. se no niente, e la pagina ne disegna una.
 *
 * Il punto 3 c'e' dall'11 settembre 2026 sera: «si continuano a non vedere certe
 * immagini, c'e' un motivo o e' un bug?». Nel file vero 35 combinazioni su 58
 * erano state generate e nessuno aveva attaccato il risultato: la scheda in
 * «Mie» le faceva vedere, l'inventario no. Era la stessa figurina con due facce.
 *
 * Quando la foto o il brano **sono** la figurina, si mostrano solo a chi ce l'ha:
 * guardarla vorrebbe dire averla. Quello che esce da una prova non e' la
 * figurina — la figurina e' il prompt — e si mostra come gli allegati.
 */
function facciaPerLaPagina(
  cosa: { faccia: Pezzo | null; suono: Pezzo | null; libreria?: Pezzo; prove: string[] },
  scoperta: boolean,
  contorno: Contorno,
): string {
  const { faccia, suono, libreria } = cosa;
  if (faccia) {
    if (!scoperta && faccia === libreria) return "";
    return anteprimaDelPezzo(faccia, contorno) || indirizzoDi(faccia, contorno);
  }
  if (suono && contorno.anteprimaLibreria && (scoperta || suono !== libreria)) {
    return contorno.anteprimaLibreria(idInLibreria(suono)) ?? "";
  }
  if (!contorno.fruttiDi) return "";
  for (const richiesta of [...cosa.prove].reverse()) {
    const usciti = contorno.fruttiDi(richiesta);
    const foto = usciti.find((v) => String(v.mime ?? "").startsWith("image/"));
    if (foto) return foto.anteprima || foto.url;
    const copertina = usciti.find((v) => v.anteprima);
    if (copertina?.anteprima) return copertina.anteprima;
  }
  return "";
}

function indirizzoDellaFaccia(c: Collezionabile, scoperta: boolean, contorno: Contorno): string {
  return facciaPerLaPagina(
    {
      faccia: facciaDi(c),
      suono: suonoDi(c),
      libreria: c.libreria,
      prove: (c.prove ?? []).map((p) => p.richiesta),
    },
    scoperta,
    contorno,
  );
}

/** Quanto si puo' guardare un file per via del gioco: la faccia, o tutto. */
export type Sguardo = "anteprima" | "tutto";

/**
 * ⚠ **Cosa della libreria puo' guardare una persona per via del gioco.**
 *
 * Chiesto l'11 settembre 2026 sera: «deve poter vedere l'anteprima e quando la
 * sblocca puo' vederla bene o ascoltarla». Le foto e i brani delle combinazioni
 * li genera chi comanda, e la libreria li fa vedere solo a lui, a chi li ha
 * fatti e a quello che e' in bacheca: gli altri giocatori vedevano il disegno al
 * posto della foto, anche nel negozio, dove si guarda per decidere se comprare.
 *
 * - una figurina che sta **in un pacchetto o nel negozio**: la sua faccia la
 *   vede chiunque;
 * - una figurina **sbloccata**: anche il file intero, da guardare grande o da
 *   ascoltare.
 *
 * Si risponde solo per i file che una figurina porta con se' — gli allegati, la
 * copertina, cosa e' uscito dalle prove, e il file che e' la figurina stessa (e
 * quello solo a chi ce l'ha). Il resto della galleria resta chiuso: chi ospita
 * chiede qui solo dopo che la libreria ha gia' detto di no.
 */
export function sguardiDelGioco(
  deposito: Deposito,
  chi: string,
  contorno: Pick<Contorno, "fruttiDi">,
): Map<string, Sguardo> {
  const mie = new Set(deposito.conto(chi).collezione);
  const inGioco = new Set<string>();
  for (const p of deposito.pacchetti()) for (const id of p.dentro) inGioco.add(id);
  const livelli = new Map<string, Sguardo>();
  const segna = (id: string, quanto: Sguardo) => {
    if (livelli.get(id) !== "tutto") livelli.set(id, quanto);
  };
  for (const c of deposito.collezionabili()) {
    const sua = mie.has(c.id);
    if (!sua && !inGioco.has(c.id) && !c.inVetrina) continue;
    const quanto: Sguardo = sua ? "tutto" : "anteprima";
    for (const a of c.allegati ?? []) segna(idInLibreria(a), quanto);
    if (c.copertina) segna(idInLibreria(c.copertina), quanto);
    if (c.libreria && sua) segna(idInLibreria(c.libreria), "tutto");
    for (const p of c.prove ?? []) {
      for (const v of contorno.fruttiDi?.(p.richiesta) ?? []) segna(v.id, quanto);
    }
  }
  return livelli;
}

/**
 * Una figurina della casa, vestita per la pagina: la stessa forma di una vera,
 * con in piu' il segno, la tinta e le copie. La faccia la disegna la pagina.
 */
function vestitaCasa(copia: CopiaDellaCasa) {
  return {
    id: copia.figurina.id,
    tipo: "casa",
    titolo: copia.figurina.nome,
    grado: copia.grado,
    numero: copia.figurina.numero,
    scoperta: true,
    prompt: "",
    faccia: "",
    allegati: [],
    daChi: "",
    daNome: "la casa",
    casa: {
      numero: copia.figurina.numero,
      segno: copia.figurina.segno,
      tinta: copia.figurina.tinta,
      copie: copia.copie,
      prima: copia.prima,
      cresciuta: copia.cresciuta,
      prossimo: copia.prossimo,
    },
  };
}

/**
 * Una figurina come la puo' vedere **questa** persona.
 *
 * Chi non ce l'ha in collezione vede il titolo, il prezzo e chi l'ha fatta, ma
 * **non il prompt** e **non il file**: se no non ci sarebbe niente da
 * sbloccare, e l'album sarebbe un elenco invece di una raccolta. Chi comanda
 * vede tutto, perche' deve poterle controllare.
 */
function vestita(c: Collezionabile, contorno: Contorno, scoperta: boolean) {
  const grado = gradoDiFigurina(c);
  const dove = (l?: { id: string; url?: string }) =>
    !l ? "" : (l.url ?? (contorno.indirizzoLibreria ? (contorno.indirizzoLibreria(l.id) ?? "") : ""));
  return {
    /**
     * ⚠ **La faccia: l'immagine con cui una figurina si riconosce.** La regola
     * e' quella della macchinetta (`facciaDi`): il primo allegato che e' una
     * foto, se no la copertina, se no il file stesso. Da quando le figurine si
     * guardano anche nell'Inventario e nella busta che si strappa (11
     * settembre 2026), la dice il PC una volta sola invece di rifarla la pagina
     * in tre posti.
     *
     * Il file stesso si mostra solo a chi ce l'ha: e' la stessa regola di
     * `dove`, qui sotto. Una foto che **e'** la figurina non si regala guardandola.
     */
    faccia: indirizzoDellaFaccia(c, scoperta, contorno),
    id: c.id,
    tipo: c.tipo,
    titolo: c.titolo,
    prompt: scoperta ? (c.prompt ?? "") : "",
    /** Dove si guarda o si ascolta, per le figurine che non sono prompt. */
    dove: scoperta ? dove(c.libreria) : "",
    mime: c.libreria?.mime ?? "",
    /**
     * Le cose venute fuori da quel prompt, quelle che chi comanda ha tenuto.
     *
     * Si vedono **anche da coperta**, ed e' voluto: nello shop uno deve poter
     * guardare cosa sta comprando. Il prompt no — quello resta nascosto finche'
     * non e' tuo.
     *
     * La prima e' la copertina della scheda; le altre stanno dietro.
     */
    allegati: (c.allegati ?? []).map((a) => ({
      url: dove(a),
      mime: a.mime,
      // Da guardare senza averla: vedi «anteprimaDelPezzo».
      anteprima: anteprimaDelPezzo(a, contorno),
    })),
    /** La copertina di un allegato che non si guarda: un brano, un video. */
    copertina: dove(c.copertina),
    /**
     * Quante volte e' gia' stata mandata a generare, e cosa ne e' uscito.
     *
     * Il conto serve alla pagina per sapere se il tasto «rigenera» e' ancora
     * vivo (`MAX_PROVE`); i frutti sono i file gia' pronti, che si guardano
     * sulla card senza aprire la galleria.
     */
    prove: (c.prove ?? []).map((p) => ({
      richiesta: p.richiesta,
      quando: p.quando,
      usciti: (contorno.fruttiDi ? contorno.fruttiDi(p.richiesta) : []).map((v) => ({
        id: v.id,
        titolo: v.titolo,
        mime: v.mime,
        url: v.url,
        anteprima: v.anteprima ?? "",
      })),
    })),
    inVetrina: c.inVetrina === true,
    prezzoVetrina: c.prezzoVetrina ?? 0,
    scoperta,
    numero: c.numero ?? 0,
    prezzo: c.prezzo ?? 0,
    grado,
    stato: c.stato,
    motivo: c.motivo ?? "",
    daChi: c.daChi,
    daNome: contorno.nomeDi(c.daChi),
    quando: c.quando,
    tavolo: c.tavolo ?? "",
    era: c.era ?? "",
  };
}

/**
 * Una casella della macchinetta, come la vede la pagina.
 *
 * ⚠ **Col nome di chi l'ha inventata attaccato.** Chiesto il 12 settembre
 * 2026: «evidenziamo meglio il nome di chi ha creato quella combinazione, anche
 * quando poi saranno sbloccabili nei pacchetti o acquistabili nel negozio ci
 * deve essere scritto chi lo ha creato inizialmente». Una figurina che gira su
 * un rullo e' una figurina come le altre: chi l'ha fatta si legge anche li'.
 */
function vestiIlSimbolo(s: SimboloMacchinetta, contorno: Contorno) {
  return {
    id: s.id,
    titolo: s.titolo,
    grado: s.grado,
    prezzo: s.prezzo,
    tipo: s.tipo,
    tavolo: s.tavolo,
    casa: s.casa ?? null,
    daChi: s.daChi,
    daNome: s.casa ? "la casa" : contorno.nomeDi(s.daChi),
    // La stessa faccia dell'inventario e della bustina: vedi «facciaPerLaPagina».
    faccia: facciaPerLaPagina(
      { faccia: s.faccia, suono: s.suono, prove: s.prove ?? [] },
      true,
      contorno,
    ),
  };
}

/** Una figurina sbloccata dalle tre file, come la vede la pagina. */
function vestitaSbloccata(s: Sbloccata, contorno: Contorno) {
  return {
    simbolo: vestiIlSimbolo(s.simbolo, contorno),
    nuova: s.nuova,
    lire: s.lire,
    copia: s.copia ? { ...vestitaCasa(s.copia).casa, grado: s.copia.grado } : null,
  };
}

/**
 * Risponde a una richiesta della sala giochi.
 *
 * `percorso` e' senza il pezzo davanti: chi ospita ha gia' tolto `/giochi`.
 */
export function rispondi(
  deposito: Deposito,
  chi: Chi,
  contorno: Contorno,
  metodo: string,
  percorso: string,
  corpo: Record<string, unknown>,
): Risposta {
  try {
    /* ------------------------------------------------------------- chi sono */

    if (metodo === "GET" && (percorso === "/io" || percorso === "/")) {
      const conto = deposito.conto(chi.id);
      const imp = deposito.impostazioni();
      return OK({
        chi: chi.id,
        nome: chi.nome,
        admin: chi.admin,
        saldo: conto.saldo,
        saldoScritto: lire(conto.saldo),
        conto: {
          giri: conto.giri,
          mandate: conto.mandate,
          prese: conto.prese,
          collezione: conto.collezione.length,
          colpoGrosso: conto.colpoGrosso,
          migliorGrado: conto.migliorGrado ?? "",
          esperienza: conto.esperienza,
          ...versoIlProssimo(conto.esperienza, imp.perIlLivello),
        },
        // I numeri che si vedono: quanto costa una cosa, non come si pesca.
        costi: {
          giro: imp.costoGiro,
          pacchetto: imp.costoPacchetto,
          perPacchetto: imp.perPacchetto,
          perSerie: imp.perSerie,
          perIlLivello: imp.perIlLivello,
        },
        gradi: GRADI.map((g) => ({ ...g, inVetrina: prezzoConsigliato(g.id) })),
        /**
         * ⚠ **Fin dove si puo' scegliere, oggi.** Vedi `TETTO_FIGURINE`.
         *
         * I gradi restano tutti e dodici — servono ai rulli, e la pagina li
         * legge da `gradi` per sapere di che colore e' un pezzo. Questo dice
         * un'altra cosa: fin dove arrivano i **tasti** con cui una persona
         * assegna un grado a una cosa presa. Due elenchi diversi sarebbero due
         * verita' da tenere allineate a mano.
         */
        tettoFigurine: TETTO_FIGURINE,
        /**
         * ⚠ **Il tetto in lire, e in euro.** Dall'11 settembre 2026: «fino al
         * livello unique valgono massimo l'equivalente di 3 euro».
         *
         * Lo dice il PC e non la pagina, come tutti i numeri dei soldi: la
         * pagina lo scrive accanto al bonus per far vedere dov'e' il muro prima
         * di batterci contro, ma chi lo fa rispettare e' `valoreDaPrendere`.
         */
        tettoLire: tettoDelValore(),
        tettoEuro: TETTO_EURO,
        epoche: EPOCHE,
        tavoli: [
          { id: "musica", nome: "Musica", rulli: rulliDi("musica") },
          { id: "immagini", nome: "Immagini", rulli: rulliDi("immagini") },
        ],
        magazzino: statoMagazzino(deposito),
        /**
         * L'ultimo regalo, se ce n'e' uno.
         *
         * Lo manda sempre; e' la pagina che si ricorda se l'ha gia' fatto
         * vedere. Tenere qui un «visto/non visto» vorrebbe dire una scrittura
         * su disco a ogni apertura, per una cosa che riguarda uno schermo.
         */
        regalo: deposito.conto(chi.id).ultimoRegalo ?? null,
        tagli: TAGLI,
        tagliBonus: TAGLI_BONUS,
        /**
         * I due tetti della card: quante volte si puo' far generare, e quante
         * cose si possono attaccare in tutto. Li dice il PC perche' e' il PC
         * che li fa rispettare — la pagina li usa solo per spegnere un tasto
         * al momento giusto invece di far premere e poi dire di no.
         */
        maxProve: MAX_PROVE,
        maxAllegati: MAX_ALLEGATI,
      });
    }

    /* ---------------------------------------------------------------- girare */

    if (metodo === "POST" && percorso === "/gira") {
      const bloccati = Array.isArray(corpo["bloccati"])
        ? (corpo["bloccati"] as unknown[]).map((x) => (typeof x === "string" && x ? x : null))
        : [];
      const giro = tira(deposito, chi.id, tavoloDi(corpo), eraDi(corpo), bloccati, Math.random);
      return OK({
        ...giro,
        saldoScritto: lire(giro.saldo),
        regalo: giro.regalo ? vestita(giro.regalo, contorno, true) : null,
      });
    }

    /* --------------------------------------------------------------- mandare */

    if (metodo === "POST" && percorso === "/manda") {
      const pezzi = Array.isArray(corpo["pezzi"]) ? (corpo["pezzi"] as string[]) : [];
      const esito = manda(deposito, chi.id, tavoloDi(corpo), eraDi(corpo), pezzi);
      return OK({
        esito: esito.esito,
        detto: esito.detto,
        lire: esito.lire,
        saldo: esito.saldo,
        saldoScritto: lire(esito.saldo),
        cosa: vestita(esito.cosa, contorno, true),
      });
    }

    /**
     * Una cosa della suite mandata a controllare: una foto, un brano, un video.
     *
     * La porta lasciata aperta di proposito. Chi la usa e' chi ospita — la
     * galleria della suite, con un tasto «mandala in sala giochi» — non la
     * pagina della slot.
     */
    if (metodo === "POST" && percorso === "/manda-dalla-libreria") {
      const c: Collezionabile = mandaDallaLibreria(
        deposito,
        chi.id,
        String(corpo["tipo"] ?? "immagine") as TipoCollezionabile,
        String(corpo["titolo"] ?? ""),
        {
          id: String(corpo["idLibreria"] ?? ""),
          mime: String(corpo["mime"] ?? ""),
          comeEraFatta: corpo["comeEraFatta"] ? String(corpo["comeEraFatta"]) : undefined,
        },
      );
      return OK(vestita(c, contorno, true));
    }

    if (metodo === "GET" && percorso === "/mie") {
      const mie = deposito
        .collezionabili()
        .filter((c) => c.daChi === chi.id)
        .sort((a, b) => b.quando - a.quando);
      /**
       * ⚠ **Le buttate stanno in un mazzo loro.**
       *
       * Chiesto il 10 settembre 2026: «i prompt buttati devono essere messi in
       * una categoria a parte e scomparire, e l'utente lo vede come perdente».
       *
       * Prima stavano in fila con le altre, e una riga grigia in mezzo a quelle
       * prese e' la cosa che si guarda per prima: la pagina delle proprie cose
       * diventava l'elenco dei propri no. Adesso il mazzo che si apre e' quello
       * che sta andando bene; i biglietti perdenti stanno sotto, chiusi, e chi
       * vuole leggere il perche' li apre.
       */
      const mandate = mie.filter((c) => c.stato !== "buttata").map((c) => vestita(c, contorno, true));
      const perdenti = mie.filter((c) => c.stato === "buttata").map((c) => vestita(c, contorno, true));
      // ⚠ La collezione non passa piu' di qui: sta in `/inventario`, con i
      // buchi di quello che manca (11 settembre 2026). Due posti che mostrano
      // la stessa collezione sono due posti che un giorno ne mostrano due.
      /**
       * ⚠ **I tre numeri di chi gioca.** Chiesti il 10 settembre 2026: «un
       * counter con il totale dell'utente: il guadagno, e quanti prompt sono
       * stati accettati e quanti sono stati perdenti».
       *
       * Il conto lo fa il PC e non la pagina, ed e' la solita regola: dove ci
       * sono soldi di mezzo somma chi tiene i soldi. Una pagina che si somma
       * da sola quanto ha guadagnato e' una pagina a cui si puo' far dire un
       * altro numero.
       *
       * ⚠ Il **guadagno** e' quello che hanno pagato per le cose prese, ed e'
       * un'altra cosa da `esperienza` (che si prende girando) e da `saldo`
       * (che e' quello che resta dopo aver speso). Sono tre numeri diversi e
       * non se ne puo' usare uno al posto di un altro.
       */
      const prese = mie.filter((c) => c.stato === "presa");
      const conta = {
        guadagno: prese.reduce((somma, c) => somma + (c.prezzo ?? 0), 0),
        accettate: prese.length,
        perdenti: perdenti.length,
        inAttesa: mie.filter((c) => c.stato === "in-attesa").length,
      };
      return OK({ mandate, perdenti, conta });
    }

    /* ------------------------------------------------------------- l'album */

    /**
     * L'album, e **quale pacchetto si sta guardando sta nell'indirizzo**.
     *
     * ⚠ `GET /album/3`, non un corpo JSON: una richiesta GET con un corpo il
     * browser non la manda nemmeno — `fetch` la rifiuta prima di partire — e
     * infatti finche' il numero stava nel corpo non e' mai arrivato. Se ne e'
     * accorto il 12 settembre 2026 il tasto che sceglie il pacchetto: prima non
     * c'era nessun tasto, e la serie era sempre l'ultima.
     */
    if (metodo === "GET" && (percorso === "/album" || percorso.startsWith("/album/"))) {
      const conto = deposito.conto(chi.id);
      const imp = deposito.impostazioni();
      const tua = (c: Collezionabile) => conto.collezione.includes(c.id);
      const fuori = fuoriDaiPacchetti(deposito);
      const elenco = {
        chiuse: serieChiuse(deposito),
        costo: imp.costoPacchetto,
        perPacchetto: imp.perPacchetto,
        /**
         * ⚠ **I pacchetti hanno un nome e un numero di figurine**, dal 12
         * settembre 2026: da quando li chiude una persona quando vuole, «serie
         * 3» non vuol dire piu' «dalla 201 alla 300» e quanto e' grossa non si
         * ricava dal numero. E dall'11 dicono anche **quante ne hai**: e' la
         * barra sulla bustina.
         */
        pacchetti: deposito.pacchetti().map((p) => {
          const dentro = serie(deposito, p.numero);
          return {
            numero: p.numero,
            nome: p.nome ?? "",
            quante: dentro.length,
            tue: dentro.filter(tua).length,
            quando: p.quando,
          };
        }),
        /**
         * ⚠ **La tendina: le cose prese che non stanno ancora in un pacchetto.**
         * Chiesto l'11 settembre 2026: «nel menu mostriamo solo gli elementi che
         * non fanno parte di un pack». Sono quelle che finiscono nel prossimo, e
         * vale la stessa regola del pacchetto aperto: chi comanda le vede tutte,
         * chi gioca vede le sue e sa quante altre ne arrivano.
         */
        fuori: fuori.filter((c) => chi.admin || tua(c)).map((c) => vestita(c, contorno, true)),
        fuoriAltre: chi.admin ? 0 : fuori.filter((c) => !tua(c)).length,
        magazzino: statoMagazzino(deposito),
      };
      if (percorso === "/album") return OK(elenco);

      /**
       * ⚠ **Un pacchetto aperto: chi comanda lo vede intero, chi gioca vede le
       * sue.** Chiesto l'11 settembre 2026: «se clicco su un pack mi mostra il
       * pacchetto: se sono admin lo mostra completo, se sono utente mostra solo
       * gli item sbloccati».
       *
       * Quelle che non hai non arrivano proprio, nemmeno coperte: stanno
       * nell'Inventario come buchi, che e' il posto fatto per guardare quello
       * che manca. Qui arriva solo quante sono.
       *
       * ⚠ Il numero sta nell'indirizzo, `GET /album/3`: una GET col corpo il
       * browser non la manda nemmeno, e finche' ci stava non arrivava mai.
       */
      const quale = Number(percorso.slice("/album/".length));
      if (!deposito.pacchetti().some((p) => p.numero === quale)) {
        return NO(404, "Questo pacchetto non c'e'.");
      }
      const dentro = serie(deposito, quale);
      const figurine = dentro.filter((c) => chi.admin || tua(c)).map((c) => vestita(c, contorno, true));
      return OK({ ...elenco, serie: quale, figurine, nascoste: dentro.length - figurine.length });
    }

    /**
     * ⚠ **L'inventario di chi chiede: tutto quello che c'e' da avere, con i
     * buchi.** Deciso l'11 settembre 2026, vedi `inventario.ts`.
     *
     * Una casella piena porta la figurina vestita; un buco porta il numero e il
     * grado, e basta. Il titolo di una che non hai non esce da qui.
     */
    if (metodo === "GET" && percorso === "/inventario") {
      const inv = inventario(deposito, chi.id);
      return OK({
        ...inv,
        pacchetti: inv.pacchetti.map((p) => ({
          ...p,
          caselle: p.caselle.map((k) => ({
            numero: k.numero,
            grado: k.grado,
            cosa: k.cosa ? vestita(k.cosa, contorno, true) : null,
          })),
        })),
        fuori: inv.fuori.map((c) => vestita(c, contorno, true)),
      });
    }

    /**
     * ⚠ **Chi comanda chiude un pacchetto, quando vuole.**
     *
     * Chiesto il 12 settembre 2026: «facciamo che un admin puo' creare un
     * pacchetto quando vuole anche con meno di 100 creazioni».
     *
     * Prima non c'era nessuna rotta perche' non c'era niente da chiudere: le
     * serie erano il magazzino diviso per cento, e chiuderle voleva dire
     * aspettare. Il documento dei concetti (§ 11) diceva gia' che «il pacchetto
     * lo chiude una persona, non il contatore», e il codice diceva il
     * contrario: adesso dicono la stessa cosa, e a decidere e' la persona.
     */
    if (metodo === "POST" && percorso === "/pacchetto/crea") {
      if (!chi.admin) return NO(403, "I pacchetti li chiude chi comanda.");
      const p = creaPacchetto(deposito, chi.id, String(corpo["nome"] ?? ""));
      return OK({
        pacchetto: { numero: p.numero, nome: p.nome ?? "", quante: p.dentro.length },
        magazzino: statoMagazzino(deposito),
      });
    }

    if (metodo === "POST" && percorso === "/pacchetto") {
      const apertura = apriPacchetto(deposito, chi.id, numero(corpo["serie"], 1), Math.random);
      return OK({
        ...apertura,
        saldoScritto: lire(apertura.saldo),
        figurine: apertura.figurine.map((f) =>
          f.casa
            ? { ...vestitaCasa(f.casa), doppione: false, lire: 0 }
            : { ...vestita(f.cosa!, contorno, true), doppione: f.doppione, lire: f.lire },
        ),
      });
    }

    /* ------------------------------------------------------- la macchinetta */

    /**
     * ⚠ **La seconda slot: quella fatta con le immagini dei pacchetti.**
     *
     * Chiesta il 12 settembre 2026, sei rulli in due file da tre. Vedi
     * `macchinetta.ts`, che e' dove sta il mestiere: qui si veste e basta.
     *
     * ⚠ **Il mazzo si manda alla pagina, e qui l'eccezione e' voluta.** La
     * regola di questo file e' che i pezzi non escono — la pagina chiede un
     * giro e riceve cosa e' uscito, non da cosa si sarebbe potuto pescare
     * (CONCETTI.md § 3). Qui pero' i rulli **devono girare davanti agli occhi**
     * prima di fermarsi, e per far scorrere delle figure bisogna avere delle
     * figure. Non e' un buco: quello che si manda e' l'album dei pacchetti
     * chiusi, che chiunque puo' gia' guardare in «Album» — e **cosa esce lo
     * decide il PC**, non l'elenco. Averlo non aiuta a vincere.
     */
    if (metodo === "GET" && percorso === "/macchinetta") {
      const quali = mazzoMacchinetta(deposito, chi.id);
      const spenta = percheSpenta(deposito, quali.length);
      const aperto = deposito.conto(chi.id).giroAperto;
      const perId = new Map(quali.map((s) => [s.id, s] as const));
      return OK({
        /**
         * ⚠ **Il giro a meta', se c'e'.** Un giro sono due tiri, e fra l'uno e
         * l'altro la pagina si puo' chiudere: al ritorno lo schermo si ritrova
         * com'era, pronto per il secondo tiro, gia' pagato.
         */
        aperto: aperto
          ? {
              puntata: aperto.puntata,
              caselle: aperto.caselle.map((id) => {
                const s = perId.get(id);
                return s ? vestiIlSimbolo(s, contorno) : null;
              }),
            }
          : null,
        accesa: !spenta,
        perche: spenta,
        pacchetti: serieChiuse(deposito),
        puntate: PUNTATE,
        /**
         * La forma della macchina: tre file da tre, dall'11 settembre 2026.
         * La dice il PC perche' e' il PC che riempie le caselle: una pagina che
         * disegna sei caselle mentre ne arrivano nove mostra una slot che non
         * e' quella su cui si sta giocando.
         */
        file: FILE,
        perFila: PER_FILA,
        /**
         * Quanto paga ogni grado, in volte la puntata. Lo dice il PC perche' e'
         * il PC che paga: la pagina lo scrive sulla tabellina dei premi, e due
         * tabelline che divergono sono una macchinetta che mente.
         */
        premi: GRADI.map((g) => ({
          id: g.id,
          nome: g.nome,
          colore: g.colore,
          fila: quantoPagaUnaFila(g.id),
          pieno: quantoPagaIlPieno(g.id),
        })),
        dueFile: DUE_FILE_VALGONO,
        tuttoUguale: TUTTO_UGUALE_VALE,
        seiUguali: SEI_UGUALI,
        simboli: quali.map((x) => vestiIlSimbolo(x, contorno)),
      });
    }

    /**
     * ⚠ **Il primo tiro**: si paga, e lo schermo si riempie. Non paga niente.
     * Dall'11 settembre 2026 un giro sono due tiri (vedi `macchinetta.ts`).
     */
    if (metodo === "POST" && percorso === "/macchinetta") {
      const primo = tiraLaMacchinetta(deposito, chi.id, numero(corpo["puntata"], 0), Math.random);
      return OK({
        puntata: primo.puntata,
        caselle: primo.caselle.map((x) => vestiIlSimbolo(x, contorno)),
        saldo: primo.saldo,
        saldoScritto: lire(primo.saldo),
      });
    }

    /** ⚠ **Il secondo tiro**: le tenute restano, le altre cambiano, e si decide. */
    if (metodo === "POST" && percorso === "/macchinetta/rigira") {
      const tenute = Array.isArray(corpo["tenute"])
        ? (corpo["tenute"] as unknown[]).map((x) => numero(x, -1))
        : [];
      const esito = rigiraLaMacchinetta(deposito, chi.id, tenute, Math.random);
      return OK({
        ...esito,
        caselle: esito.caselle.map((x) => vestiIlSimbolo(x, contorno)),
        file: esito.file.map((f) => ({
          riga: f.riga,
          lire: f.lire,
          simbolo: vestiIlSimbolo(f.simbolo, contorno),
        })),
        sbloccate: esito.sbloccate.map((s) => vestitaSbloccata(s, contorno)),
        seiUguali: esito.seiUguali ? vestiIlSimbolo(esito.seiUguali, contorno) : null,
        vintoScritto: lire(esito.vinto),
        saldoScritto: lire(esito.saldo),
      });
    }

    /* ---------------------------------------------------------------- lo shop */

    if (metodo === "GET" && percorso === "/vetrina") {
      const conto = deposito.conto(chi.id);
      const tua = (c: Collezionabile) => conto.collezione.includes(c.id);
      // Il cartellino lo scrive la stessa funzione che poi fa pagare: un prezzo
      // letto in un posto e incassato da un altro e' un prezzo che un giorno
      // non torna.
      const inVendita = (c: Collezionabile) => ({
        ...vestita(c, contorno, tua(c) || chi.admin),
        mia: tua(c),
        costo: prezzoNelloShop(deposito, c) ?? 0,
      });
      return OK({
        roba: vetrina(deposito).map(inVendita),
        /**
         * ⚠ **E i pacchetti chiusi, figurina per figurina.** Deciso l'11
         * settembre 2026 (#109): «nello shop i prezzi sono molto piu' alti; i
         * pacchetti costano poco ma la possibilita' di trovare quell'item e'
         * molto bassa». Si sceglie quella che si vuole, e si paga caro —
         * `prezzoDaPacchetto` nel banco.
         */
        pacchetti: deposito
          .pacchetti()
          .map((p) => ({
            numero: p.numero,
            nome: p.nome ?? "",
            roba: serie(deposito, p.numero).map(inVendita),
          }))
          .filter((p) => p.roba.length > 0),
      });
    }

    if (metodo === "POST" && percorso === "/compra") {
      const acquisto = compra(deposito, chi.id, String(corpo["id"] ?? ""));
      return OK({
        cosa: vestita(acquisto.cosa, contorno, true),
        costo: acquisto.costo,
        saldo: acquisto.saldo,
        saldoScritto: lire(acquisto.saldo),
      });
    }

    if (percorso === "/vetrina/metti" || percorso === "/vetrina/togli") {
      if (!chi.admin) return NO(403, "La vetrina la decide chi comanda.");
    }

    if (metodo === "POST" && percorso === "/vetrina/metti") {
      const c = mettiInVetrina(
        deposito,
        String(corpo["id"] ?? ""),
        String(corpo["grado"] ?? "rare") as Grado,
        numero(corpo["prezzo"], 0),
      );
      return OK(vestita(c, contorno, true));
    }

    if (metodo === "POST" && percorso === "/vetrina/togli") {
      const c = togliDallaVetrina(deposito, String(corpo["id"] ?? ""));
      return OK(vestita(c, contorno, true));
    }

    /* ---------------------------------------------------------- la classifica */

    if (metodo === "GET" && percorso === "/classifica") {
      return OK({
        righe: classifica(deposito).map((r) => ({
          ...r,
          nome: contorno.nomeDi(r.chi),
          faccia: contorno.facciaDi ? contorno.facciaDi(r.chi) : undefined,
          io: r.chi === chi.id,
        })),
      });
    }

    /* ------------------------------------------------------ la fila di chi comanda */

    if (
      percorso.startsWith("/fila") ||
      percorso === "/prendi" ||
      percorso === "/butta" ||
      percorso === "/gente" ||
      percorso === "/regala" ||
      percorso === "/azzera" ||
      percorso === "/prova" ||
      percorso === "/libreria"
    ) {
      if (!chi.admin) return NO(403, "Questa parte e' di chi decide.");
    }

    /**
     * Chi c'e', per mandargli le lire.
     *
     * Non e' la classifica: quella e' ordinata per merito e serve a chi gioca.
     * Questa e' un elenco di persone in ordine alfabetico, con quanto hanno in
     * tasca — che e' l'unica cosa che serve sapere prima di regalare.
     */
    if (metodo === "GET" && percorso === "/gente") {
      // Tutti quelli di casa, piu' quelli che hanno un conto e non risultano
      // piu' in casa: uno che si scollega il telefono non sparisce dai libri.
      const id = new Set<string>();
      for (const p of contorno.gente ? contorno.gente() : []) id.add(p.id);
      for (const c of deposito.conti()) id.add(c.chi);
      const gente = [...id]
        .filter((x) => x && x !== chi.id)
        .map((x) => {
          const c = deposito.conti().find((y) => y.chi === x);
          return {
            chi: x,
            nome: contorno.nomeDi(x),
            faccia: contorno.facciaDi ? contorno.facciaDi(x) : undefined,
            saldo: c?.saldo ?? 0,
            saldoScritto: lire(c?.saldo ?? 0),
            regali: c?.regali ?? 0,
            prese: c?.prese ?? 0,
            /** Non ha mai aperto la sala giochi: il conto si apre da solo. */
            mai: !c,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
      return OK({ gente, tagli: TAGLI });
    }

    if (metodo === "POST" && percorso === "/regala") {
      const fatto = regala(
        deposito,
        chi.id,
        String(corpo["chi"] ?? ""),
        numero(corpo["quanto"], 0),
        String(corpo["perche"] ?? ""),
      );
      return OK({
        chi: fatto.conto.chi,
        nome: contorno.nomeDi(fatto.conto.chi),
        saldo: fatto.conto.saldo,
        saldoScritto: lire(fatto.conto.saldo),
        regalo: fatto.regalo,
      });
    }

    /**
     * ⚠ **Azzerare il portafoglio di qualcuno.** Chiesto l'11 settembre 2026:
     * «un admin puo' anche azzerare il portafoglio degli altri, caso mai
     * problemi».
     *
     * Sta accanto a «manda lire» e non in una schermata sua perche' e' la stessa
     * decisione girata al contrario, e si prende guardando la stessa riga: **il
     * saldo di quella persona**. Un pannello a parte vorrebbe dire cercare due
     * volte lo stesso nome.
     */
    if (metodo === "POST" && percorso === "/azzera") {
      const fatto = azzeraPortafoglio(
        deposito,
        chi.id,
        String(corpo["chi"] ?? ""),
        String(corpo["perche"] ?? ""),
      );
      return OK({
        chi: fatto.conto.chi,
        nome: contorno.nomeDi(fatto.conto.chi),
        togliere: fatto.togliere,
        toltoScritto: lire(fatto.togliere),
        saldo: fatto.conto.saldo,
        saldoScritto: lire(fatto.conto.saldo),
      });
    }

    /**
     * Cosa c'e' nella libreria della suite, per attaccarlo a una figurina.
     *
     * ⚠ **Il gioco non sa dove stanno i file**, e non deve saperlo: chiede
     * a chi lo ospita (vedi `Contorno`). Fuori dalla suite — nel banco di prova
     * — chi ospita non ha una libreria, e questa rotta risponde che non c'e'
     * niente. Non e' un guasto: e' una sala giochi senza galleria attaccata.
     */
    if (metodo === "GET" && percorso === "/libreria") {
      if (!contorno.elencoLibreria) return OK({ voci: [] });
      return OK({ voci: contorno.elencoLibreria(chi.id, 60) });
    }

    if (metodo === "GET" && percorso === "/fila") {
      const inAttesa = deposito
        .collezionabili()
        .filter((c) => c.stato === "in-attesa")
        .sort((a, b) => a.quando - b.quando)
        .map((c) => ({
          ...vestita(c, contorno, true),
          /**
           * Il valore di base: quanto valgono i pezzi, in media. Chi comanda ci
           * aggiunge solo il bonus, cosi' non deve inventarsi un numero da zero.
           *
           * ⚠ Era la **somma** fino all'11 settembre 2026, ed e' diventata la
           * media: vedi `valoreDeiPezzi`. Sommando, tre pezzi scelti valevano
           * un quarto di dodici pezzi qualunque.
           */
          base: valoreDiBase(deposito, c),
        }));
      /**
       * ⚠ **Prese e buttate sono due mazzi, non uno.**
       *
       * Chiesto il 10 settembre 2026: «i prompt buttati devono essere messi in
       * una categoria a parte e scomparire». Stavano insieme, ordinate per
       * data, e sulle prese si decide la vetrina: cercare quella da mettere in
       * vendita in mezzo a dieci scartate e' lavoro inutile fatto ogni volta.
       *
       * Le buttate restano — servono a non far tornare domani la stessa riga —
       * ma stanno in fondo, in un cassetto chiuso.
       */
      const decise = deposito
        .collezionabili()
        .filter((c) => c.stato === "presa")
        .sort((a, b) => (b.decisa ?? 0) - (a.decisa ?? 0))
        .slice(0, 30)
        .map((c) => vestita(c, contorno, true));
      const buttate = deposito
        .collezionabili()
        .filter((c) => c.stato === "buttata")
        .sort((a, b) => (b.decisa ?? 0) - (a.decisa ?? 0))
        .slice(0, 40)
        .map((c) => vestita(c, contorno, true));
      return OK({ inAttesa, decise, buttate, magazzino: statoMagazzino(deposito) });
    }

    if (metodo === "POST" && percorso === "/prendi") {
      const daLi = (quale: string, seManca: string) =>
        corpo[quale]
          ? {
              id: String(corpo[quale]),
              mime: String(corpo[quale + "Mime"] ?? seManca),
              url: String(corpo[quale]),
            }
          : undefined;
      /**
       * ⚠ **Gli allegati arrivano come elenco**: uno o piu' d'uno, chiesto il
       * 10 settembre 2026. Ognuno porta il suo indirizzo e il suo tipo, perche'
       * fra i quattro generati e i quattro scelti a mano ci puo' stare un brano
       * accanto a un'immagine, e la pagina deve sapere quale si guarda e quale
       * si ascolta.
       */
      const elenco = Array.isArray(corpo["allegati"]) ? (corpo["allegati"] as unknown[]) : [];
      const allegati = elenco
        .map((x) => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => x !== null && Boolean(x["url"]))
        .map((x) => ({
          id: String(x["id"] ?? x["url"]),
          mime: String(x["mime"] ?? "image/*"),
          url: String(x["url"]),
        }));
      const c = prendi(
        deposito,
        chi.id,
        String(corpo["id"] ?? ""),
        numero(corpo["bonus"], 0),
        allegati,
        daLi("copertina", "image/*"),
      );
      return OK(vestita(c, contorno, true));
    }

    /**
     * ⚠ **Provala davvero**: parte una generazione con quel prompt.
     *
     * Chiesto il 10 settembre 2026: «quando arriva un prompt da controllare
     * agli admin ci vogliono dei pulsanti per mandare quel prompt a generare;
     * nel caso di un prompt musicale genera una clip di 60 secondi con ace step
     * turbo strumentale, nel caso dell'immagine genera l'immagine 4:3 con flux
     * 9b».
     *
     * Era gia' scritto in CONCETTI.md § 10 come la cosa che l'admin puo' fare, e
     * non c'era: si giudicava una riga di testo inglese a occhio. Adesso parte
     * **per la stessa strada delle richieste del telefono** — chi ospita la
     * mette in coda — e quando e' pronta si trova in galleria, da attaccare.
     *
     * ⚠ **Il costo lo paga il banco, non chi ha mandato.** E' l'admin che ha
     * scelto di provarla: se la togliesse dal saldo di chi la manda, mandare
     * costerebbe, e mandare deve essere gratis (CONCETTI.md § 9).
     *
     * ⚠ **Si puo' rifare, fino a quattro volte** (`MAX_PROVE`). Chiesto il 10
     * settembre 2026: «puo' rigenerare e viene generato un secondo file, max 4
     * file». Prima partiva una volta sola e poi il tasto restava spento per
     * sempre: un modello sbaglia, e giudicare un prompt dal suo primo scatto
     * e' un altro modo di tirare a indovinare.
     */
    if (metodo === "POST" && percorso === "/prova") {
      if (!contorno.genera) return NO(501, "Qui non c'e' niente che sappia generare.");
      const c = deposito.perId(String(corpo["id"] ?? ""));
      if (!c) return NO(404, "Questa non c'e'.");
      if (!c.prompt) return NO(409, "Questa non e' un prompt: non c'e' niente da generare.");
      const fatte = c.prove ?? [];
      if (fatte.length >= MAX_PROVE) {
        return NO(409, "L'hai gia' fatta generare " + MAX_PROVE + " volte: scegli fra quelle.");
      }
      const dove = contorno.genera(chi.id, c.tavolo === "immagini" ? "immagini" : "musica", {
        prompt: c.prompt,
        titolo: c.titolo,
      });
      if (!dove) return NO(501, "Non e' partita: qui non si genera.");
      c.prove = fatte.concat([{ richiesta: dove.id, quando: Date.now() }]);
      deposito.salva();
      return OK({ id: c.id, richiesta: dove.id, dove: dove.dove ?? "", quante: c.prove.length });
    }

    if (metodo === "POST" && percorso === "/butta") {
      const c = butta(deposito, chi.id, String(corpo["id"] ?? ""), String(corpo["motivo"] ?? ""));
      return OK(vestita(c, contorno, true));
    }

    return NO(404, "Qui non c'e' niente.");
  } catch (errore) {
    // Un «non si puo'» detto in italiano e' una risposta, non un guasto: si
    // manda come tale, con dentro la frase, che la pagina mostra cosi' com'e'.
    if (errore instanceof NienteDaFare) return NO(409, errore.message);
    console.error("[giochi] rotta " + percorso + " caduta", errore);
    return NO(500, "Qualcosa e' andato storto qui dentro.");
  }
}
