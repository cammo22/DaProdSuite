/**
 * Le parole del gioco, dette una volta sola.
 *
 * Questo file non fa niente: dichiara di che cosa parliamo. Le regole stanno in
 * `regole.ts`, i pezzi in `rulli.ts`, il file su disco in `deposito.ts`.
 *
 * Il documento che comanda su tutti e' `CONCETTI.md`, accanto a questo.
 */

/* ------------------------------------------------------------------ rarita' */

/**
 * Quanto e' raro un pezzo. Cinque gradi, e non e' un'etichetta: si **ricava dal
 * prezzo** (vedi `raritaDiPrezzo`).
 *
 * Il perche' e' che due verita' sulla stessa cosa divergono sempre: se la
 * rarita' fosse un campo scritto accanto al prezzo, il giorno che l'admin
 * abbassa il prezzo di un pezzo resterebbe «Leggendario» a 2 lire.
 */
export type Rarita = "comune" | "poco" | "raro" | "epico" | "leggendario";

export interface GradoRarita {
  id: Rarita;
  /** Come si legge sullo schermo. */
  nome: string;
  /** Da questo prezzo in su si e' di questo grado. */
  da: number;
  /** Il colore, uguale ovunque compaia: rullo, collezione, classifica. */
  colore: string;
}

/* -------------------------------------------------------------------- pezzi */

/**
 * Il tavolo a cui si gioca: decide **quali rulli** ci sono e che prompt esce.
 *
 * Sono due perche' la suite sa fare due cose diverse con due grammatiche
 * diverse: a un modello di immagini si dice cosa si vede, a uno di musica si
 * dice come suona. Un tavolo solo con dentro tutti e due i mazzi produrrebbe
 * prompt che non vogliono dire niente ne' di qua ne' di la'.
 */
export type Tavolo = "immagini" | "musica";

/**
 * Un rullo: uno dei pezzi di cui e' fatto un prompt.
 *
 * L'ordine con cui sono elencati in `rulli.ts` e' anche l'ordine con cui i
 * pezzi si incollano nel prompt finale — quindi non e' un dettaglio grafico.
 */
export type IdRullo = string;

export interface Rullo {
  id: IdRullo;
  /** Il nome sopra al rullo. Corto: ci sta in una colonna. */
  nome: string;
  tavolo: Tavolo;
  /** A che serve, in una riga, per chi non l'ha mai visto. */
  spiega: string;
}

/**
 * Un pezzo: una faccia di un rullo.
 *
 * Due facce anche lui: `nome` e' quello che leggi (italiano), `testo` e' quello
 * che finisce nel prompt vero (di solito inglese, perche' i modelli sono
 * addestrati cosi'). E' la stessa forma degli stili della suite, e non e' un
 * caso: il rullo degli stili **e'** quella lista, non una sua copia.
 */
export interface Pezzo {
  /** `rullo/nome-in-minuscolo`, oppure `custom/…` per quelli scritti a mano. */
  id: string;
  rullo: IdRullo;
  nome: string;
  testo: string;
  /**
   * Quanto e' comune davvero, da 0 (nessuno lo conosce) a 1 (lo conoscono
   * tutti). Da qui nasce il prezzo di partenza, e per i generi musicali il
   * numero e' **vero**: viene dal rank di popolarita' di Every Noise.
   *
   * Senza, si legge 0,5: ne' raro ne' comune.
   */
  quantoComune?: number;
  /**
   * Scritto da chi comanda, e non esce dalla slot: si vince solo grattando.
   * Vedi CONCETTI.md § 8.
   */
  custom?: boolean;
}

/** Un pezzo con addosso il prezzo di adesso e il grado che ne viene. */
export interface PezzoInGioco extends Pezzo {
  prezzo: number;
  rarita: Rarita;
}

/* ------------------------------------------------------------------ il giro */

/** Perche' un giro ha pagato: serve a scriverlo sullo schermo e nel registro. */
export interface Vincita {
  /** `l1`, `l3`, `l5`, `e4`, `jackpot`, `quasi`, `formazione:<id>`. */
  motivo: string;
  /** Come si legge: «tre Leggendari». */
  detto: string;
  lire: number;
}

/** Cosa e' successo tirando la leva. */
export interface Giro {
  tavolo: Tavolo;
  /** Un pezzo per rullo, nell'ordine dei rulli. */
  pezzi: PezzoInGioco[];
  /** Quanto e' costato il giro. */
  costo: number;
  /** Le vincite, gia' sommate in `pagato`. Vuoto vuol dire buca. */
  vincite: Vincita[];
  pagato: number;
  /** La somma dei prezzi dei pezzi usciti: quanto «vale» quello che vedi. */
  valore: number;
  /** Il prompt gia' montato, pronto da copiare o da mandare a controllare. */
  prompt: string;
  /**
   * La figurina caduta girando, se ne e' caduta una.
   *
   * E' l'altra strada per sbloccare le combinazioni del magazzino: quella di
   * chi gioca e basta, senza comprare pacchetti.
   */
  regalo?: Combinazione;
  /** Il saldo dopo. */
  saldo: number;
  quando: number;
}

/* ---------------------------------------------------------------- le persone */

/**
 * Il conto di una persona.
 *
 * `chi` e' l'id del **dispositivo accoppiato**: il gioco non ha un registro
 * utenti suo, sono le persone della suite (CONCETTI.md § 2).
 */
export interface Conto {
  chi: string;
  /** Lire. Intero, mai negativo. */
  saldo: number;
  giri: number;
  /** Quanto ha vinto in tutto: serve alla classifica, non al saldo. */
  vinteTot: number;
  /** La vincita singola piu' grossa. E' quella di cui si vanta. */
  colpoGrosso: number;
  /** Quante combinazioni ha mandato a controllare. */
  mandate: number;
  /**
   * Quante gliene hanno **prese**. E' il numero che conta in classifica.
   *
   * Non «quante ne ha mandate»: mandare e' gratis apposta, e una classifica di
   * chi manda di piu' premierebbe chi tira la leva a caso.
   */
  prese: number;
  /** Gli id delle combinazioni che ha sbloccato. */
  collezione: string[];
  /** Prima volta e ultima volta, per sapere chi e' passato. */
  nato: number;
  ultimoGiro: number;
}

/* ---------------------------------------------------------- i numeri del banco */

/**
 * Tutti i numeri che decidono quanto costa e quanto paga, in un posto solo e
 * cambiabili da chi comanda.
 *
 * Sono i valori decisi da Cammo nella prima versione di DaProdSlot: si
 * cambiano, ma partono da li'.
 */
export interface Impostazioni {
  /** Quanto costa tirare la leva. */
  costoGiro: number;
  /** Quanto costa un pacchetto della serie chiusa. */
  costoPacchetto: number;
  /** Quante combinazioni ci sono dentro un pacchetto. */
  perPacchetto: number;
  /** Quante combinazioni prese chiudono una serie. */
  perSerie: number;
  /**
   * Ogni quanti giri, in media, ne cade una gratis.
   *
   * E' l'altra strada per sbloccarle, quella di chi gioca e basta: uno su
   * questo numero regala una combinazione del magazzino. A zero non ne cade
   * mai, e i pacchetti restano l'unica via.
   */
  unaOgniGiri: number;
  vincitaL1: number;
  vincitaL3: number;
  vincitaL5: number;
  vincitaE4: number;
  jackpotMin: number;
  jackpotMax: number;
  /** Se non e' uscito niente, ogni tanto consola. */
  quasiPercentuale: number;
  quasiMin: number;
  quasiMax: number;
  /** Quanto trova in tasca chi gioca la prima volta. */
  regaloIniziale: number;
  /** Quanto costa far produrre davvero, per tipo di lavoro. */
  costoProduzione: Record<string, number>;
}

/* --------------------------------------------------- le combinazioni mandate */

/**
 * Che fine ha fatto una combinazione mandata a controllare.
 *
 * Sono gli stessi tre stati della fila delle richieste del telefono, e non e'
 * una coincidenza: e' la stessa cosa — qualcuno chiede, chi comanda guarda e
 * decide. Chi ha mandato non aspetta: continua a giocare.
 */
export type StatoCombinazione =
  /** Arrivata, nessuno l'ha ancora guardata. */
  | "in-attesa"
  /** L'admin le ha dato un prezzo: da adesso sta nel magazzino. */
  | "presa"
  /** Non andava bene. Chi l'ha mandata lo sa, col motivo. */
  | "buttata";

/**
 * Un prompt montato da qualcuno e mandato a controllare.
 *
 * ⚠ **L'identita' sono i pezzi, non le parole.** Due combinazioni con gli
 * stessi sei pezzi sono la stessa combinazione anche se le hanno mandate due
 * persone diverse: la seconda si ferma subito. Confrontare i prompt scritti
 * non basterebbe — basterebbe uno spazio in piu' per farne entrare due uguali.
 */
export interface Combinazione {
  id: string;
  tavolo: Tavolo;
  /** Gli id dei pezzi, nell'ordine dei rulli. */
  pezzi: string[];
  /** I pezzi in ordine e attaccati: e' l'identita' della combinazione. */
  impronta: string;
  /** Il prompt vero, quello che va al modello. */
  prompt: string;
  /** Come si legge in italiano: i nomi dei pezzi. E' il titolo della figurina. */
  titolo: string;
  daChi: string;
  quando: number;
  stato: StatoCombinazione;
  /**
   * Il posto nel magazzino, dato quando viene presa. Non riparte mai da capo:
   * la serie di appartenenza si conta da qui.
   */
  numero?: number;
  /** Quanto vale, in lire. Lo scrive l'admin quando la prende. */
  prezzo?: number;
  /** Chi ha deciso, e quando. */
  daAdmin?: string;
  decisa?: number;
  /** Perche' e' stata buttata. Si dice sempre. */
  motivo?: string;
}

/** Una combinazione dichiarata dall'admin, che paga a parte. */
export interface Formazione {
  id: string;
  nome: string;
  /** Gli id dei pezzi che devono esserci. In qualunque ordine. */
  pezzi: string[];
  premio: number;
}

/* -------------------------------------------------------------- il file vero */

/**
 * Tutto quello che sta sul disco del PC, in un file solo.
 *
 * `versione` serve al giorno che la forma cambia: si legge, si converte, si
 * riscrive. Un file che non dice di che versione e' non si puo' aggiornare
 * senza indovinare.
 */
export interface DatiGiochi {
  versione: 1;
  conti: Conto[];
  /**
   * Le combinazioni mandate: quelle in attesa, quelle prese e quelle buttate.
   *
   * Stanno tutte qui insieme, anche le buttate: senza, chi ha mandato una cosa
   * non saprebbe mai che fine ha fatto, e la stessa combinazione rifiutata
   * potrebbe tornare domani.
   */
  combinazioni: Combinazione[];
  /** L'ultimo posto dato nel magazzino. Non riparte mai da capo. */
  ultimoNumero: number;
  /**
   * Pezzi aggiunti ai rulli da chi comanda.
   *
   * Girano nella slot come tutti gli altri: non hanno niente di speciale, sono
   * solo mazzo in piu'. La roba da collezionare sono le **combinazioni**, non i
   * pezzi — vedi CONCETTI.md § 10.
   */
  custom: Pezzo[];
  /** I prezzi cambiati a mano: solo quelli, non tutto il listino. */
  prezzi: Record<string, number>;
  formazioni: Formazione[];
  impostazioni: Impostazioni;
}
