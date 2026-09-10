/**
 * Le parole del gioco, dette una volta sola.
 *
 * Questo file non fa niente: dichiara di che cosa parliamo. Le regole stanno in
 * `regole.ts`, i pezzi in `rulli.ts`, il file su disco in `deposito.ts`.
 *
 * Il documento che comanda su tutti e' `CONCETTI.md`, accanto a questo.
 */

/* -------------------------------------------------------------------- gradi */

/**
 * Gli undici gradi, dal piu' comune al piu' raro.
 *
 * ⚠ **L'ordine e' quello, e non e' quello che ti aspetti.** «Epic» sta dopo
 * «Divine», e non e' una svista: e' la scala che ha scelto Cammo il 9 settembre
 * 2026, e in un gioco la scala e' una decisione, non una deduzione. Chi la
 * legge da fuori la impara giocando, come si impara ogni scala di ogni gioco.
 *
 * Non e' un'etichetta scritta a mano da nessuna parte: **si ricava dal prezzo**
 * (vedi `gradoDiPrezzo`). Se fosse un campo accanto al prezzo, il giorno che
 * l'admin abbassa il prezzo di un pezzo resterebbe «Mythic» a due lire.
 */
export const GRADI_ID = [
  "basic",
  "grand",
  "rare",
  "arcane",
  "heroic",
  "unique",
  "celestial",
  "divine",
  "epic",
  "legendary",
  "mythic",
  /**
   * ⚠ **Ethernal**, aggiunto il 10 settembre 2026: «oltre a mythic mettiamo
   * il grado ethernal».
   *
   * Si scrive cosi' — con la «h» — perche' cosi' l'ha scritto Cammo, e i nomi
   * dei gradi sono suoi. Esce **tre volte su diecimila** caselle: con dodici
   * rulli, una volta ogni duecentosettanta giri circa. Deve essere una cosa che
   * si racconta, non una che capita.
   */
  "ethernal",
] as const;

export type Grado = (typeof GRADI_ID)[number];

export interface Scalino {
  id: Grado;
  /** Come si legge sullo schermo. In inglese: sono i nomi che ha scelto Cammo. */
  nome: string;
  /** Da questo prezzo in su si e' di questo grado. */
  da: number;
  /** Il colore, uguale ovunque compaia: rullo, collezione, classifica, album. */
  colore: string;
  /**
   * Quanto e' acceso: da 0 (spento, nessun effetto) a 5.
   *
   * ⚠ **Da tre si e' passati a cinque il 10 settembre 2026**, chiesto cosi':
   * «facciamo i gradi da celestial in su molto piu' potenti, come gradi e come
   * anteprime, molto piu' articolate».
   *
   * Il difetto era che i cinque gradi piu' alti — da Epic a Mythic — facevano
   * **la stessa identica scena**: erano tutti «fuoco 3». Uno che tirava un
   * Mythic vedeva quello che aveva gia' visto con un Epic, e in un gioco di
   * rarita' la scena **e'** il premio. Adesso:
   *
   * | fuoco | chi | cosa si vede |
   * |---|---|---|
   * | 0 | Basic, Grand | niente |
   * | 1 | Rare, Arcane, Heroic | il bordo colorato |
   * | 2 | Unique | alone |
   * | 3 | Celestial, Divine | alone che respira e luccichio |
   * | 4 | Epic, Legendary | raggi dietro, la carta si alza, coriandoli |
   * | 5 | Mythic, Ethernal | tutto lo schermo, a lungo |
   */
  fuoco: 0 | 1 | 2 | 3 | 4 | 5;
  /** Quante volte su mille esce questo grado, quando si pesca. */
  quantoEsce: number;
  /**
   * Quanti **punti esperienza** da' se ne esce almeno uno.
   *
   * ⚠ Punti, non lire. Deciso il 10 settembre 2026: girare la slot **costa**
   * lire e rende **esperienza**. Le lire si guadagnano in un modo solo —
   * inventando combinazioni che a chi comanda piacciono. Chi gioca e basta
   * sale di livello; chi crea, si arricchisce.
   */
  punti: number;
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
 * L'epoca scelta: il filtro che cambia **cosa esce** e come e' vestita la sala.
 *
 * `sempre` vuol dire tutto, senza pesi d'epoca. Gli altri sono i decenni. Non
 * e' un'etichetta appiccicata sopra ai generi — quelli con un decennio scritto
 * sono pochi — e' un **peso** su tutti, che tiene conto di quanto quel genere
 * suona di allora (vedi `pesoEra` in `regole.ts`).
 */
export type Era = "sempre" | "70" | "80" | "90" | "00" | "10" | "20";

export interface Epoca {
  id: Era;
  /** Quello che si legge sul tasto: due caratteri, o il segno dell'infinito. */
  segno: string;
  nome: string;
  /** I tre colori del fondo, che cambiano tutta la sala quando la si sceglie. */
  fondo: [string, string, string];
  /** Il colore acceso di quell'epoca: bordi, scritte, luci. */
  luce: string;
}

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
   * Quanto suona di adesso, da 0 (modernissimo) a 1 (roba di allora).
   *
   * Ce l'hanno i generi — arriva dal rank di modernita' di Every Noise — e i
   * pezzi che parlano di tempo, come il rullo «Di quando». E' quello che il
   * filtro delle epoche pesa: vedi `pesoEra` in `regole.ts`.
   */
  modernita?: number;
  /**
   * Il decennio, quando quel pezzo ne ha uno preciso.
   *
   * ⚠ Serve a una cosa che si vede: scegliendo gli anni 80, nel rullo «Di
   * quando» deve uscire spesso «Anni ottanta». Senza, la sala si vestiva da
   * anni 80 e poi la casella diceva «Adesso» — due cose che si contraddicono
   * nella stessa schermata.
   */
  decennio?: string;
  /** Scritto da chi comanda e aggiunto al mazzo. Gira come tutti gli altri. */
  custom?: boolean;
}

/** Un pezzo con addosso il prezzo di adesso e il grado che ne viene. */
export interface PezzoInGioco extends Pezzo {
  prezzo: number;
  grado: Grado;
}

/* ------------------------------------------------------------------ il giro */

/** Perche' un giro ha pagato: serve a scriverlo sullo schermo e nel registro. */
export interface Vincita {
  /** `grado:<id>`, `tris:<id>`, `pieno`, `quasi`, `formazione:<id>`. */
  motivo: string;
  /** Come si legge: «un Mythic», «tre Divine insieme». */
  detto: string;
  /** I punti esperienza guadagnati. Dalla slot non escono lire. */
  punti: number;
  /** Quanto deve accendersi lo schermo: 0 niente, 5 tutto. */
  fuoco: 0 | 1 | 2 | 3 | 4 | 5;
}

/** Cosa e' successo tirando la leva. */
export interface Giro {
  tavolo: Tavolo;
  era: Era;
  /** Un pezzo per rullo, nell'ordine dei rulli. */
  pezzi: PezzoInGioco[];
  /** Quanto e' costato il giro. */
  costo: number;
  /** Le vincite, gia' sommate in `punti`. Vuoto vuol dire buca. */
  vincite: Vincita[];
  /** I punti esperienza presi con questo giro. */
  punti: number;
  /** L'esperienza totale dopo, e a che livello si e' arrivati. */
  esperienza: number;
  livello: number;
  /** Vero se con questo giro si e' salito di livello. */
  salito: boolean;
  /** Il grado piu' alto uscito: e' quello che decide la scena. */
  meglio: Grado;
  /** La somma dei prezzi dei pezzi usciti: quanto «vale» quello che vedi. */
  valore: number;
  /** Il prompt gia' montato, pronto da copiare o da mandare a controllare. */
  prompt: string;
  /**
   * La figurina caduta girando, se ne e' caduta una.
   *
   * E' l'altra strada per sbloccare i pezzi del magazzino: quella di chi gioca
   * e basta, senza comprare pacchetti.
   */
  regalo?: Collezionabile;
  /** Il saldo dopo. */
  saldo: number;
  quando: number;
}

/* ------------------------------------------------------------ i collezionabili */

/**
 * Di che cosa e' fatta una figurina.
 *
 * ⚠ **Non solo prompt, e questo e' il punto.** Chiesto il 9 settembre 2026:
 * «predisponiamolo a ricevere tutti gli item dalla suite che possono essere
 * potenzialmente nuovi item collezionabili — magari una immagine, una canzone
 * e' un collezionabile».
 *
 * Quindi il magazzino non e' «l'elenco dei prompt approvati»: e' **l'elenco
 * delle cose che valgono qualcosa**, e un prompt e' solo la prima specie. Una
 * foto venuta bene, un brano che gira, un video: se sta nella libreria della
 * suite e a chi comanda piace, puo' diventare una figurina con un grado addosso
 * e finire nei pacchetti.
 *
 * Il pezzo che cambia da specie a specie e' solo **come si guarda**: un prompt
 * si legge, un'immagine si vede, un brano si ascolta. Tutto il resto — il
 * prezzo, il grado, chi l'ha fatta, i doppioni che pagano — e' uguale.
 */
export type TipoCollezionabile = "prompt" | "immagine" | "brano" | "video" | "voce";

/** Che fine ha fatto una cosa mandata a controllare. */
export type StatoCollezionabile =
  /** Arrivata, nessuno l'ha ancora guardata. */
  | "in-attesa"
  /** Chi comanda le ha dato un prezzo: da adesso sta nel magazzino. */
  | "presa"
  /** Non andava bene. Chi l'ha mandata lo sa, col motivo. */
  | "buttata";

/**
 * Dove sta una cosa che non e' testo: nella libreria della suite.
 *
 * Il gioco **non tiene file**. Tiene il numero di targa di una cosa che sta
 * gia' nella galleria, e quando serve mostrarla la chiede a chi ospita. Cosi'
 * una foto non esiste in due copie, e cancellarla dalla galleria non lascia
 * qui una figurina che punta al vuoto.
 */
export interface DallaLibreria {
  /** L'id nella libreria della suite. */
  id: string;
  /** `image/png`, `audio/mpeg`… serve alla pagina per sapere come mostrarla. */
  mime: string;
  /**
   * L'indirizzo diretto, quando non c'e' una libreria a cui chiederlo.
   *
   * Nella suite si usa l'id e l'indirizzo lo da' chi ospita. Fuori dalla suite
   * — mentre si prova — un indirizzo scritto a mano e' l'unico modo di
   * attaccare davvero una copertina a una figurina.
   */
  url?: string;
  /** Il prompt con cui e' stata fatta, se si sa. Si legge, non si usa. */
  comeEraFatta?: string;
}

/**
 * Una cosa che vale qualcosa: mandata da qualcuno, guardata da chi comanda.
 *
 * ⚠ **L'identita' e' l'impronta, non le parole.** Per un prompt e' la fila dei
 * pezzi: due combinazioni con gli stessi dodici pezzi sono la stessa cosa anche
 * se le hanno mandate due persone. Per una foto e' il suo posto in libreria.
 * Confrontare i testi non basterebbe — uno spazio in piu' e ne entrano due
 * uguali.
 */
export interface Collezionabile {
  id: string;
  tipo: TipoCollezionabile;
  /** Come si chiama la figurina: per un prompt, i nomi dei pezzi. */
  titolo: string;
  /** Chi e', a prescindere da come e' scritta. */
  impronta: string;

  /* --- solo per i prompt --- */
  tavolo?: Tavolo;
  era?: Era;
  /** Gli id dei pezzi, nell'ordine dei rulli. */
  pezzi?: string[];
  /** Il prompt vero, quello che va al modello. */
  prompt?: string;

  /* --- solo per le cose che si guardano o si ascoltano --- */
  libreria?: DallaLibreria;

  /**
   * **I contenuti allegati**: le cose venute fuori da quel prompt.
   *
   * ⚠ Chiesto il 10 settembre 2026: «quando gli admin accettano una
   * combinazione e ci creano un contenuto allegato». Un prompt e' una riga di
   * testo; con l'immagine o il brano che ne e' uscito attaccati sopra diventa
   * una figurina che si guarda. Il primo e' anche la copertina della sua
   * scheda nello shop — senza, uno comprerebbe una parola.
   *
   * ⚠ **Sono piu' d'uno dal 10 settembre 2026**, chiesto cosi': «puo'
   * rigenerare, max 4 file, e alla fine puo' selezionare uno o piu' elementi
   * generati da includere nel pacchetto; lascia comunque la possibilita' di
   * allegare oltre a quelle 4 generate ulteriori max 4 file dalla suite».
   *
   * Prima era uno solo, e voleva dire che rigenerare buttava via il tentativo
   * di prima: la seconda immagine sostituiva la prima, e chi comanda doveva
   * scegliere **al volo** senza poterle vedere una accanto all'altra. Il senso
   * di generare quattro volte e' proprio poter confrontare.
   *
   * Sta separato da `libreria` di proposito: quello e' «questa figurina **e'**
   * una foto», questo e' «questa figurina e' un prompt, **e ha prodotto**
   * queste foto».
   */
  allegati?: DallaLibreria[];

  /**
   * **La copertina dell'allegato**, quando l'allegato non si guarda.
   *
   * ⚠ Chiesto il 10 settembre 2026: «quando un prompt e' preso, facciamo che
   * se si carica una canzone viene caricata anche l'immagine della canzone».
   *
   * Un brano attaccato a una figurina e' un rettangolo con un tasto play: in un
   * album di cento figurine non lo riconosce nessuno, e nello shop uno
   * comprerebbe un triangolino. La copertina e' quello che si vede; il brano e'
   * quello che si sente.
   *
   * Sta separata da `allegati` e non dentro, perche' non tutti gli allegati ne
   * hanno bisogno: un'immagine e' gia' la sua copertina. Vale per il **primo**
   * allegato, che e' quello che si vede nello shop.
   */
  copertina?: DallaLibreria;

  /**
   * Le generazioni fatte partire da chi comanda per provare questa
   * combinazione. **Al massimo quattro.**
   *
   * ⚠ Chiesto il 10 settembre 2026: «quando un admin manda a generare un
   * contenuto, quando pronto lo deve vedere gia' allegato alla card in modo da
   * controllarlo; puo' rigenerare e viene generato un secondo file, max 4
   * file».
   *
   * Prima era una sola — `provata` — e il tasto si spegneva dopo il primo giro.
   * Il motivo era buono e resta valido dentro il singolo giro: una generazione
   * ci mette minuti, e nel frattempo non si vede niente, quindi ripremere
   * significherebbe metterne in coda tre uguali senza accorgersene. Ma «una
   * volta sola per sempre» era un'altra cosa: un modello sbaglia, e giudicare
   * un prompt dal suo primo tentativo e' come giudicare una foto dal primo
   * scatto.
   *
   * ⚠ **Qui non ci sono file**, ci sono numeri di targa di richieste. Cosa e'
   * uscito da ognuna lo sa la libreria della suite, che nei metadati di ogni
   * file scrive da quale richiesta e' nato (vedi `extra.richiesta` in
   * `esecuzione.ts`). Tenerne qui una copia vorrebbe dire un secondo elenco da
   * riallineare ogni volta che qualcuno cancella una foto.
   */
  prove?: { richiesta: string; quando: number }[];

  /* --- lo shop --- */

  /**
   * In vetrina: si puo' comprare in lire, senza aspettare la fortuna.
   *
   * Ce la mette chi comanda, e decide due cose: **che grado ha nello shop** e
   * **quanto costa**. Non e' lo stesso grado che ha nella slot — nello shop
   * chi comanda sceglie, ed e' quel grado a dire quanto raramente la stessa
   * figurina cade da un pacchetto.
   */
  inVetrina?: boolean;
  prezzoVetrina?: number;
  gradoVetrina?: Grado;

  daChi: string;
  quando: number;
  stato: StatoCollezionabile;
  /**
   * Il posto nel magazzino, dato quando viene presa. Non riparte mai da capo:
   * la serie di appartenenza si conta da qui.
   */
  numero?: number;
  /** Quanto vale, in lire. Lo scrive chi comanda quando la prende. */
  prezzo?: number;
  /** Chi ha deciso, e quando. */
  daAdmin?: string;
  decisa?: number;
  /** Perche' e' stata buttata. Si dice sempre. */
  motivo?: string;
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
  /**
   * I punti esperienza, che non si spendono mai: si accumulano e basta.
   *
   * Sono la misura di **quanto hai giocato**; il saldo e' la misura di quanto
   * hai **creato**. Due numeri per due cose diverse, e nessuno dei due si puo'
   * convertire nell'altro.
   */
  esperienza: number;
  giri: number;
  /** Quanto ha vinto in tutto: serve alla classifica, non al saldo. */
  vinteTot: number;
  /** La vincita singola piu' grossa. E' quella di cui si vanta. */
  colpoGrosso: number;
  /** Quante cose ha mandato a controllare. */
  mandate: number;
  /**
   * Quante gliene hanno **prese**. E' il numero che conta in classifica.
   *
   * Non «quante ne ha mandate»: mandare e' gratis apposta, e una classifica di
   * chi manda di piu' premierebbe chi tira la leva a caso.
   */
  prese: number;
  /** Gli id delle figurine che ha sbloccato. */
  collezione: string[];
  /** Il grado piu' alto che gli sia mai uscito: e' il suo trofeo. */
  migliorGrado?: Grado;
  /** Prima volta e ultima volta, per sapere chi e' passato. */
  nato: number;
  ultimoGiro: number;

  /**
   * Quante lire gli ha regalato chi comanda, in tutto.
   *
   * ⚠ Sta fuori dal saldo apposta. Il saldo dice quanto hai **adesso**;
   * questo dice quanto ti e' stato **dato**, e i due numeri raccontano cose
   * diverse: uno con mille lire regalate e zero prese non e' uno che crea, e
   * la classifica non deve confonderli.
   */
  regali?: number;
  /**
   * L'ultimo regalo arrivato: serve alla pagina per dirlo a chi lo riceve.
   *
   * Un bonifico che non avvisa nessuno e' un numero che cambia da solo nel
   * saldo — e chi lo vede pensa a un errore, non a un regalo.
   */
  ultimoRegalo?: Regalo;
}

/** Un regalo di chi comanda: quanto, quando, e perche'. */
export interface Regalo {
  quanto: number;
  quando: number;
  /** Due parole di chi lo manda. Si scrive sempre: un regalo muto e' un guasto. */
  perche: string;
  /** Chi l'ha mandato. */
  daAdmin: string;
}

/* ---------------------------------------------------------- i numeri del banco */

/** Tutti i numeri che decidono quanto costa e quanto paga, in un posto solo. */
export interface Impostazioni {
  /** Quanto costa tirare la leva. */
  costoGiro: number;
  /** Quanto costa un pacchetto della serie chiusa. */
  costoPacchetto: number;
  /** Quante figurine ci sono dentro un pacchetto. */
  perPacchetto: number;
  /** Quante cose prese chiudono una serie. */
  perSerie: number;
  /**
   * Ogni quanti giri, in media, ne cade una gratis.
   *
   * E' l'altra strada per sbloccarle, quella di chi gioca e basta: uno su
   * questo numero regala una figurina del magazzino. A zero non ne cade mai.
   */
  unaOgniGiri: number;
  /**
   * Quanti punti esperienza da' ogni grado quando ne esce almeno uno.
   *
   * ⚠ **Conta solo il grado piu' alto**, non tutti quelli usciti: se contassero
   * tutti, un Mythic prenderebbe anche i punti del Basic accanto, e i numeri
   * smetterebbero di voler dire quello che dicono.
   */
  puntiPerGrado: Partial<Record<Grado, number>>;
  /** Il premio in piu' quando tre caselle hanno lo stesso grado, da Rare in su. */
  trisMoltiplicatore: number;
  /** Schermo pieno: tutte le caselle da questo grado in su. Paga in punti. */
  pienoDa: Grado;
  pienoMin: number;
  pienoMax: number;
  /** Quanta esperienza serve per salire di livello, la prima volta. */
  perIlLivello: number;
  /** Se non e' uscito niente, ogni tanto consola. */
  quasiPercentuale: number;
  quasiMin: number;
  quasiMax: number;
  /** Quanto trova in tasca chi gioca la prima volta. */
  regaloIniziale: number;
  /**
   * Quanto costa rimandare una cosa che **hai gia' tu**.
   *
   * Poche lire, ma non zero: e' l'unico freno contro il mandare a raffica la
   * stessa riga sperando che qualcosa succeda. Chi la manda per la prima volta
   * non paga niente (CONCETTI.md § 9); chi la rimanda sapendo di averla gia'
   * paga questo.
   */
  penalitaDoppione: number;
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
  /**
   * La forma del file.
   *
   * - `1`: fino al 10 settembre 2026;
   * - `2`: da quando la scala dei soldi e' salita — i gradi partono da un
   *   milione per l'Unique, e i prezzi scritti col metro di prima vengono
   *   portati su leggendo (vedi `rimettiIPrezzi` nel deposito).
   *
   * ⚠ **Il numero serve a non convertire due volte.** Senza, ogni apertura
   * moltiplicherebbe di nuovo i prezzi e in una settimana una figurina Basic
   * varrebbe come il Colosseo.
   */
  versione: 1 | 2;
  conti: Conto[];
  /**
   * Il magazzino e la fila insieme: le cose in attesa, quelle prese e quelle
   * buttate.
   *
   * Stanno tutte qui, anche le buttate: senza, chi ha mandato una cosa non
   * saprebbe mai che fine ha fatto, e la stessa cosa rifiutata potrebbe tornare
   * domani.
   */
  collezionabili: Collezionabile[];
  /** L'ultimo posto dato nel magazzino. Non riparte mai da capo. */
  ultimoNumero: number;
  /**
   * Pezzi aggiunti ai rulli da chi comanda.
   *
   * Girano nella slot come tutti gli altri: non hanno niente di speciale, sono
   * solo mazzo in piu'. La roba da collezionare sono i **collezionabili**.
   */
  custom: Pezzo[];
  /** I prezzi cambiati a mano: solo quelli, non tutto il listino. */
  prezzi: Record<string, number>;
  formazioni: Formazione[];
  impostazioni: Impostazioni;
}
