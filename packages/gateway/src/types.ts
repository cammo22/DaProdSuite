/**
 * Contratti dell'accesso remoto alla suite.
 *
 * Questo file è il patto fra tre parti che non si conoscono:
 * - il gateway (server HTTP dentro lo shell),
 * - l'app Android (il client),
 * - il pannello "Telefono" dell'hub.
 *
 * Regole che non si negoziano (da docs/ACCESSO-REMOTO.md):
 * - nessuna rotta raggiungibile senza credenziale (token per dispositivo),
 * - un dispositivo, una credenziale; revocarne uno non tocca gli altri,
 * - l'accoppiamento usa un codice monouso che scade in cinque minuti,
 * - i motori restano su 127.0.0.1: il gateway inoltra, non apre.
 */

/** Chi è il dispositivo accanto al PC. */
export type Ruolo = "admin" | "ospite";

/** Uno strumento accoppiato, come lo vede il server (e il pannello PC). */
export interface Dispositivo {
  id: string;
  nome: string;
  ruolo: Ruolo;
  /** Segreto di sessione: gira SOLO fra gateway e dispositivo. */ 
  token: string;
  /** Quando si è accoppiato. */
  accoppiato: number;
  /** Ultima volta che ha parlato col gateway. */
  ultimoAccesso: number;
  /**
   * La foto del profilo: il nome del file, dentro la cartella degli invii.
   *
   * Dalla 0.7.6, con DaProd. Un nome senza faccia, in una bacheca, è una riga
   * di testo che si scorre via.
   */
  foto?: string;
  /** La riga sotto al nome, scritta da chi sta dietro a quel nome. */
  motto?: string;
}

/** Il dispositivo senza il token: è quel che si può mostrare in giro. */
/**
 * Un dispositivo come lo vede chi non e' il computer.
 *
 * Senza il token, ovviamente. E con `foto` che vuol dire una cosa diversa da
 * quella di dentro: qui e' **l'indirizzo** dove sta la faccia, gia' con la
 * versione dentro (vedi `indirizzoDellaFoto`), non il nome del file sul disco.
 * Fuori da qui quel nome non serve a niente, e lasciare che ogni pagina si
 * costruisse l'indirizzo da se' e' esattamente il modo in cui la foto nuova
 * continuava a comparire vecchia.
 */
export type DispositivoPubblico = Omit<Dispositivo, "token">;

/** Stato di una richiesta di generazione arrivata da un telefono. */
export type StatoRichiesta =
  /** Appena arrivata: sta nel pannello "Telefono" in attesa del sì o del no. */
  | "in-attesa"
  /** Chi la guarda ha messo in coda la generazione (accettata, ma non ancora partita). */
  | "accettata"
  /** In generazione adesso, sul PC. */
  | "in-lavoro"
  /** Il file c'è e il telefono può scaricarlo. */
  | "pronta"
  | "scartata"
  /** L'invito è scaduto o la richiesta è stata ritirata. */
  | "scaduta"
  /**
   * Finita e messa via.
   *
   * Non è «cancellata»: il lavoro c'è stato e il file resta. È il modo di
   * togliere dalla lista quello che si è già guardato, senza buttarlo — chiesto
   * il 22 agosto 2026 («possibilità di cancellare lavori dalle app anche vecchi,
   * archiviarli»). Le richieste archiviate si vedono solo aprendo «i vecchi».
   */
  | "archiviata";

/** Una richiesta di lavoro, come la vede il server. */
export interface Richiesta {
  id: string;
  /**
   * Il numero del lavoro. Progressivo, e non riparte mai.
   *
   * **Serve a parlarne.** Un id come `r-8f3a2c` non si legge al telefono, non
   * si dice a voce e non si ritrova in un elenco: «il 47» sì. Chiesto il 26
   * agosto 2026 — «usiamo un sistema di coda a numeri che si aggiorna» — ed è
   * la cosa che rende una fila una fila invece di un mucchio.
   *
   * Le richieste scritte prima della 0.7.7 non ce l'hanno: si legge come 0, e
   * non si mostra.
   */
  numero?: number;
  /** Il tipo di lavoro: "testo" (prompt), "immagine", "video", "audio", … */
  tipo: string;
  /** L'app che deve eseguirlo: foto, cinema, voce, musica… */
  app: string;
  /** Cosa si vuole, scritto da chi chiede. */
  testo: string;
  /** Opzioni della richiesta: modello, durata, dimensione… dettagli liberi. */
  opzioni?: Record<string, string>;
  /** L'id del dispositivo che l'ha scritta. */
  daDispositivo: string;
  /** Il nome del dispositivo, copiato per comodità. */
  daNome: string;
  stato: StatoRichiesta;
  quando: number;
  /** Compilato quando `stato` è "pronta": il risultato da scaricare. */
  risultato?: Risultato;
  /** Nota di chi l'ha scartata, per dire perché. */
  motivoScarto?: string;
  /**
   * Com'era scritta quando è arrivata, se poi qualcuno l'ha cambiata.
   *
   * Chi sta al PC può riscrivere a mano una richiesta prima di farla partire, o
   * farla riscrivere al modello. In tutti e due i casi quello che aveva scritto
   * la persona non si perde: senza, chi ha chiesto una cosa e ne riceve
   * un'altra non ha modo di sapere che è successo.
   */
  testoOriginale?: string;
  /** Chi l'ha riscritta: `mano` o `ai`. Vuoto se è ancora come è arrivata. */
  riscrittaDa?: "mano" | "ai";
  /**
   * Perché non è partita da sola, se poteva.
   *
   * Vuoto vuol dire «aspetta un sì, come tutte le richieste degli ospiti».
   * Compilato vuol dire che il computer *avrebbe* potuto farla partire e ha
   * scelto di no — la fila è piena, ne hai già due, chi ci sta davanti sta
   * lavorando — e chi ha chiesto merita di leggere quale delle tre.
   */
  trattenuta?: string;
}

/**
 * Come si comporta la fila su questa macchina, chiesto al computer.
 *
 * Il gateway non tiene queste scelte e non le può cambiare: le legge quando gli
 * servono. Sono le impostazioni della suite, e si toccano solo dal PC.
 */
export type RegolaFila = () => {
  /** `mai`, `admin` o `tutti`: chi genera senza aspettare un sì. */
  chiPassaSubito: "mai" | "admin" | "tutti";
  /** Quanti lavori possono stare in fila in tutto. `0` = senza tetto. */
  limiteFila: number;
  /** Quanti ne può avere in fila una persona sola. `0` = senza tetto. */
  limitePersona: number;
  /** Chi sta al computer lo sta usando: niente parte da solo. */
  inPausa: boolean;
};

/** Un file finito, pronto da scaricare. */
export interface Risultato {
  /** Percorso relativo dentro la cartella dei risultati remoti. */
  percorso: string;
  nome: string;
  bytes: number;
  /** mime: immagine/png, video/mp4, audio/wav… */
  tipo: string;
  quando: number;
}

/** Notifica da spedire a un dispositivo: un evento che merita attenzione. */
export interface Notifica {
  id: string;
  dispositivoId: string;
  richiestaId?: string;
  titolo: string;
  corpo: string;
  quando: number;
  /** True quando un client ha detto "l'ho vista". */
  letta: boolean;
  /** True quando il dispositivo è stato informato (push/stream). */
  consegnata: boolean;
}

/* ------------------------------------------------------------------ stato */

/** L'istantanea che il telefono vede per primo, e poi via streaming. */
export interface StatoSuite {
  versione: string;
  /** Il nome del computer, per riconoscerlo quando si accoppia. */
  computer: string;
  attiva: boolean;
  /** Le app che stanno facendo qualcosa adesso (nome, stato, dettaglio). */
  attivita: Attivita[];
  /** La fila: quante richieste aspettano, quante in lavorazione. */
  coda: { attesa: number; lavoro: number; pronte: number };
  /** Modello LLM con cui si può scrivere, se acceso. */
  llm?: string;
}

/** Una riga di "sta succedendo qualcosa": la generazione che giri, il file che si fa. */
export interface Attivita {
  app: string;
  nome: string;
  /** "in-attesa", "in-generazione", "pronta"… lo stato dell'app/coda. */
  stato: string;
  dettaglio?: string;
}

/* ------------------------------------------------------------- accoppiamento */

/** Il file con invito dentro il QR e il codice da battere. */
export interface Invito {
  codice: string;
  ruolo: Ruolo;
  /** Data di scadenza, in millisecondi. */
  scade: number;
  /**
   * Quante persone può ancora far entrare.
   *
   * Nasce da «più di venti persone collegate, di picco»: con un codice a testa
   * servirebbero venti giri al pannello, e ogni codice vive cinque minuti. Un
   * invito che vale per dieci si mostra una volta e lo inquadrano tutti.
   *
   * Resta **a tempo**, che è la protezione vera: un codice che vale per sempre
   * è una password scritta su un muro. Gli inviti vecchi, senza questo campo,
   * valgono per uno — è quello che facevano.
   */
  restano?: number;
}

/**
 * Payload da mettere nel QR: l'app lo legge per sapere dove e con cosa parlare.
 *
 * **Tre versioni, e ogni volta il campo nuovo risolve un guasto vero.**
 *
 * - `v1` aveva solo `host`, «192.168.1.20:8790», e l'app ci costruiva davanti
 *   `http://`. Funzionava finché si restava in casa.
 * - `v2` ha aggiunto `base`, l'indirizzo **completo con lo schema**: con il
 *   tunnel il gateway sta su `https://…`, che non ha una porta e non è HTTP.
 * - `v3` ha aggiunto `basi`, cioè **tutti** gli indirizzi insieme. È la
 *   risposta al difetto che si vedeva usandola: un indirizzo solo è una
 *   fotografia, e appena il PC cambia rete — o riavvia il tunnel, che ogni
 *   volta prende un nome nuovo — quella fotografia non vale più e il telefono
 *   dice «non raggiungibile» per sempre. Con l'elenco, l'app li prova tutti e
 *   si ricorda quale ha risposto.
 *
 * `host` e `base` restano compilati: un'app vecchia continua a funzionare.
 */
export interface InvitoQr {
  /** Versione della struttura. */
  v: 1 | 2 | 3;
  /** Indirizzo del gateway sulla rete locale, es. "192.168.1.20:8790". */
  host: string;
  /** L'indirizzo completo più promettente, con lo schema. Dalla v2. */
  base?: string;
  /**
   * Tutti gli indirizzi, dal più promettente. Dalla v3.
   *
   * L'ordine conta: Tailscale per primo se c'è (funziona anche fuori casa),
   * poi la rete di casa, poi il tunnel. Chi legge li prova in quest'ordine.
   */
  basi?: string[];
  /** Codice a otto cifre, monouso. */
  codice: string;
  /** Ruolo che questo invito concede. */
  ruolo: Ruolo;
}

/* ------------------------------------------------------------- la libreria */

/**
 * Una cosa prodotta dalla suite, vista da fuori.
 *
 * **Perché il gateway la conosce solo così.** La libreria vera vive nello
 * shell, che sa dove stanno i file sul disco. Il gateway non deve saperlo: gli
 * basta un elenco di voci con un id, e la possibilità di farsi dare il percorso
 * di quell'id quando qualcuno lo chiede. Così l'unica cosa che attraversa il
 * confine è un id, e non un percorso che arriva da Internet.
 */
export interface VoceLibreria {
  id: string;
  nome: string;
  /** "audio", "immagine", "video". */
  tipo: string;
  /** L'app che l'ha prodotta. */
  app: string;
  /** Quando, in millisecondi. */
  creato: number;
  bytes: number;
  /** Il tipo MIME, per sapere con che tag mostrarla. */
  mime: string;
  /**
   * Chi l'ha chiesta: l'id del dispositivo, o `questo-computer` se è stata
   * fatta stando davanti al PC.
   *
   * È il campo che regge tutta la separazione fra le persone: la galleria
   * mostra le tue, e le altrui solo se qualcuno le ha messe in bacheca.
   */
  chi?: string;
  /** Il nome di chi l'ha chiesta, copiato per poterlo scrivere sotto. */
  chiNome?: string;
  /** Vero se è stata messa in bacheca, cioè se la possono vedere tutti. */
  pubblicato?: boolean;
  /** Vero se è tua: lo decide il gateway guardando chi sta chiedendo. */
  mia?: boolean;
  /**
   * Dove sta la faccia di chi l'ha fatta, se ce l'ha.
   *
   * Viaggia **gia' fatta** e non si costruisce dalla pagina: dentro c'e' la
   * versione della foto, ed e' quella che fa comparire una foto nuova invece di
   * quella di prima. Vedi `indirizzoDellaFoto` nel gateway.
   */
  chiFoto?: string;
  /**
   * Quanti hanno messo mi piace, e se ce l'hai messo tu.
   *
   * Nasce con DaProd, la bacheca: senza un segno che dica «l'ho vista e mi è
   * piaciuta», una bacheca è una cartella condivisa con lo sfondo scuro.
   */
  quantiMiPiace?: number;
  mioMiPiace?: boolean;
  /**
   * Quanti commenti ha.
   *
   * Viaggia con l'elenco e non si chiede a parte: la bacheca deve poter
   * scrivere «3 commenti» sotto a ogni cosa senza un giro di rete per riquadro.
   * I commenti veri si chiedono aprendoli.
   */
  quantiCommenti?: number;
  /** Tenuta da parte da chi guarda: compare fra le sue cose anche se non è sua. */
  tenuta?: boolean;
  /**
   * C'è un'anteprima pronta per questa voce.
   *
   * Vale per i video (un fotogramma) e per i brani (la copertina): senza, la
   * galleria del telefono mostra un rettangolo nero finché non premi play — che
   * è esattamente quello che è stato chiesto di togliere.
   */
  anteprima?: boolean;
  /** Un file caricato a mano da una persona, non generato dalla suite. */
  caricata?: boolean;
  /** Le due righe scritte sotto da chi l'ha messa in bacheca. */
  didascalia?: string;
}

/** Chi sa rispondere sulla libreria: lo passa lo shell al gateway. */
/**
 * Una cosa che qualcuno ha scritto sotto a un risultato.
 *
 * `chiNome` viaggia **dentro** il commento e non si va a cercare dopo: chi si
 * scollega sparisce dall'elenco dei dispositivi, e senza il nome scritto qui il
 * suo commento diventerebbe di «qualcuno» il giorno dopo.
 */
export interface VoceCommento {
  id: string;
  chi: string;
  chiNome: string;
  /** Dove sta la sua faccia, con dentro la versione. Come per le voci. */
  chiFoto?: string;
  testo: string;
  quando: number;
  /** Vero se chi sta guardando puo' toglierlo: l'ha scritto lui, o e' roba sua. */
  mioDaTogliere?: boolean;
}

export interface FornitoreLibreria {
  /**
   * Le ultime cose prodotte, filtrate come chiede chi guarda.
   *
   * `chi` è il dispositivo che sta guardando, e non è un filtro fra gli altri:
   * è quello che decide **cosa ha il diritto di vedere**. `dove` sceglie fra le
   * proprie cose e la bacheca; senza, valgono le proprie.
   */
  elenco(filtro: {
    tipo?: string;
    app?: string;
    quanti?: number;
    chi: string;
    dove?: "mie" | "bacheca";
  }): VoceLibreria[];
  /**
   * Il file di una voce: percorso sul disco e come si chiama. Null se non c'è
   * **o se non è roba che questo dispositivo può vedere.**
   */
  file(id: string, chi: string): { percorso: string; nome: string; mime: string; bytes: number } | null;
  /** Mette o toglie dalla bacheca. Solo il padrone della voce può farlo. */
  pubblica(id: string, chi: string, pubblicato: boolean): boolean;
  /** Butta via una voce. Solo il padrone della voce può farlo. */
  elimina(id: string, chi: string): boolean;
  /**
   * L'anteprima di una voce: il fotogramma di un video, la copertina di un brano.
   *
   * Torna il percorso di un'immagine già pronta, o null se per quella voce non
   * ce n'è. **Si fa una volta e si tiene**: estrarre un fotogramma costa un
   * `ffmpeg`, e una galleria che ne lancia venti scorrendo è una galleria che
   * non scorre.
   */
  anteprima?(id: string, chi: string): Promise<string | null>;
  /** Mette o toglie il mi piace di questa persona. Torna quanti sono adesso. */
  miPiace?(id: string, chi: string, mi: boolean): number | null;
  /**
   * I commenti di una voce, se questa persona ha il diritto di vederla.
   *
   * Nuovi nella 0.8.1: «facciamo un modo di poter anche commentare i
   * contenuti». Un cuore dice *che* qualcuno e' passato; un commento dice
   * **cosa ha pensato**, ed e' l'ultimo pezzo che mancava a una bacheca per
   * essere un posto dove si sta invece di una vetrina.
   */
  commenti?(id: string, chi: string): VoceCommento[] | null;
  /** Scrive un commento. Torna l'elenco aggiornato, o null se non si puo'. */
  commenta?(id: string, chi: string, testo: string): VoceCommento[] | null;
  /** Toglie un commento: lo puo' fare chi l'ha scritto e chi ha fatto la cosa. */
  togliCommento?(id: string, idCommento: string, chi: string): VoceCommento[] | null;
  /** Tiene da parte una cosa di qualcun altro, o smette di tenerla. */
  tieni?(id: string, chi: string, tenere: boolean): boolean;
  /**
   * Un file caricato a mano da una persona, da mettere in bacheca.
   *
   * È l'altra metà di DaProd: una bacheca dove si può solo mostrare quello che
   * il computer ha generato è una vetrina, non un posto dove si sta. Il file
   * arriva già scritto sul disco; qui gli si dà un posto in libreria.
   */
  aggiungi?(opzioni: {
    percorso: string;
    nome: string;
    mime: string;
    bytes: number;
    chi: string;
    chiNome: string;
    didascalia?: string;
  }): VoceLibreria | null;
}

/* ------------------------------------------------------------- i regali */

/**
 * Un file mandato da chi sta al PC a una persona collegata.
 *
 * Chiesto il 22 agosto 2026: «dall'app connessione devo poter interagire e
 * mandare file agli utenti quando voglio trascinando il file all'interno, e
 * l'utente riceverà la notifica che ha ricevuto qualcosa».
 *
 * Non è un pezzo di libreria: la libreria è quello che la suite **produce**, e
 * questo è quello che una persona **manda a un'altra**. Tenerli separati vuol
 * dire che un regalo non compare nella galleria di chi lo manda né in quella di
 * chi lo riceve, e che cancellarlo non cancella niente di generato.
 */
export interface Invio {
  id: string;
  /** A chi è destinato: l'id del dispositivo. */
  aDispositivo: string;
  /** Chi l'ha mandato, per poterlo scrivere sul pacco. */
  daNome: string;
  /** Come si chiama il file. */
  nome: string;
  /** Il tipo MIME, per sapere se si può mostrare o solo scaricare. */
  mime: string;
  bytes: number;
  /** Il nome del file dentro la cartella dei regali. Non esce mai da qui. */
  percorso: string;
  /** Due righe da leggere aprendo il pacco. Facoltative. */
  messaggio?: string;
  quando: number;
  /** Vero quando chi l'ha ricevuto l'ha aperto: il pacco non si apre due volte. */
  aperto: boolean;
}

/* -------------------------------------------------------------- il pannello */

/**
 * Tutto quello che serve a sapere **se la connessione funziona**, in un colpo.
 *
 * È quello che DaProdConnessione disegna a quadrati: un quadrato per cosa, con
 * il suo colore e la sua frase. Sta qui e non nell'hub perché la stessa pagina
 * la aprono il PC, il portatile e il telefono — e le tre cose devono dire la
 * stessa identica verità.
 */
export interface StatoPannello {
  computer: string;
  versione: string;
  /** Gli indirizzi su cui questo PC si fa trovare, dal più promettente. */
  indirizzi: IndirizzoPubblico[];
  /** Com'è messa la strada da Internet. */
  tunnel: { fase: string; indirizzo: string; motivo?: string; quota?: number };
  /** Windows lascia entrare sulla porta? `incerto` quando non si è riusciti a guardare. */
  firewall: { aperta: boolean; incerto: boolean };
  /** Chi è collegato adesso. */
  dispositivi: DispositivoPubblico[];
  /** L'invito vivo, se ce n'è uno. */
  invito?: InvitoVivo;
  /** Chi guarda può decidere sulla fila, o solo chiedere. */
  puoiDecidere: boolean;
  /** Vero se la coda fa partire davvero le generazioni su questo computer. */
  codaAutomatica: boolean;
}

export interface IndirizzoPubblico {
  /** L'indirizzo completo, con lo schema. */
  base: string;
  /** Una riga che dice cos'è: «la rete di casa», «Tailscale», «da Internet». */
  che: string;
  /** Fin dove arriva. */
  dove: "ovunque" | "casa" | "internet";
}

export interface InvitoVivo {
  codice: string;
  ruolo: Ruolo;
  scade: number;
  /** Il QR già disegnato, come data URL PNG. */
  qr: string;
  /** Quante persone possono ancora usarlo. */
  restano: number;
}

/**
 * Chi sa rispondere sul pannello: lo passa lo shell al gateway.
 *
 * Come per la libreria, il gateway non sa **come** si accende un tunnel o si
 * apre una porta: sa solo che c'è qualcuno che lo sa fare. Così le stesse
 * quattro azioni valgono per il PC, per il portatile e per il telefono senza
 * scriverle tre volte.
 */
export interface FornitorePannello {
  stato(dispositivo: Dispositivo): StatoPannello;
  invita(opzioni: { ruolo: Ruolo; quante: number }): Promise<InvitoVivo>;
  tunnel(acceso: boolean): Promise<void>;
  /** Chiede a Windows di lasciar entrare. Torna il motivo se non è andata. */
  apriLaPorta(): Promise<string | null>;
  revoca(id: string): void;
  /** Cambia il nome di un dispositivo collegato. */
  rinomina(id: string, nome: string): void;
}

/* ------------------------------------------------------------ il modello */

/**
 * Chi sa far scrivere il modello: lo passa lo shell al gateway.
 *
 * Serve a due gesti che sono lo stesso gesto visto da due parti:
 *
 * - il tasto **Miglioralo** accanto a una casella, per chi sta scrivendo una
 *   richiesta dal telefono o dalla console;
 * - la voce **Miglioralo e fallo** nel menu di una richiesta in attesa, per chi
 *   sta al PC e decide.
 *
 * **L'AI non parte mai da sola.** Il modello si accende quando qualcuno preme
 * un tasto, e LM Studio lo lascia andare appena ha finito di rispondere: quattro
 * GB di scheda video non restano occupati per un forse.
 */
export interface FornitoreAi {
  /** Null se si può chiedere, il motivo scritto per una persona se no. */
  disponibile(): Promise<string | null>;
  /**
   * Riscrive un testo perché il modello che genera lo capisca meglio.
   *
   * `app` decide il mestiere: a DaProdFoto serve una descrizione fotografica in
   * inglese, a DaProdMusica un genere con gli strumenti, a DaProdVoce un testo
   * che si legga bene ad alta voce.
   */
  migliora(opzioni: { testo: string; app: string }): Promise<{ testo: string; parole?: string }>;
}

/* ------------------------------------------------------------- i preset */

/**
 * Un modo di generare messo da parte, con un nome.
 *
 * Chiesto il 22 agosto 2026 insieme ai modelli: «l'app android deve poter
 * scegliere i vari modelli della suite con anche la possibilità dei preset».
 *
 * Stanno **sul PC** e non nel browser di chi guarda: un preset salvato al
 * computer deve comparire sul telefono, e `localStorage` è una cosa del
 * telefono. Vale la regola di sempre — quello che la suite sa fare vale per
 * tutte le schede, non per una.
 */
export interface Preset {
  id: string;
  /** Per quale scheda: `foto`, `cinema`, `musica`, `voce`. */
  app: string;
  nome: string;
  /** Il testo principale: il prompt, la descrizione, le parole da leggere. */
  testo: string;
  /** Gli altri campi dell'azione, già riempiti. */
  campi?: Record<string, string>;
  /** Chi l'ha salvato. Vuoto vuol dire: c'era già, è di tutti. */
  chi?: string;
  quando: number;
}

/** Chi sa rispondere sui preset: lo passa lo shell al gateway. */
export interface FornitorePreset {
  elenco(app?: string): Preset[];
  salva(preset: Omit<Preset, "id" | "quando">): Preset;
  elimina(id: string, chi: string): boolean;
}

/* ------------------------------------------------------------ la macchina */

/**
 * Com'è messo il computer adesso: chi lavora, chi aspetta, cosa è permesso.
 *
 * **Perché è una cosa sola e non tre.** Chi guarda vuole rispondere a una
 * domanda — *la mia roba quando parte?* — e per rispondere servono insieme il
 * turno, la fila e le regole. Tre rotte separate vorrebbero dire tre risposte
 * che arrivano in tre momenti diversi e non tornano mai del tutto.
 */
export interface StatoMacchina {
  /** Cosa sta lavorando adesso. Null vuol dire: il computer è libero. */
  adesso: {
    che: string;
    chi: string;
    mestiere: string;
    numero?: number;
    /** L'id della richiesta, se questo lavoro ne ha una: serve ad annullarlo. */
    richiesta?: string;
    /** Da quando sta girando, in millisecondi. Per il cronometro. */
    da?: number;
  } | null;
  /**
   * Chi aspetta, in ordine di partenza.
   *
   * `numero` è quello del lavoro e `posto` è dove sta adesso: il primo non
   * cambia mai, il secondo scende a ogni lavoro che finisce. Servono tutti e
   * due — uno per riconoscere il proprio, l'altro per sapere quanto manca.
   */
  fila: {
    id: string;
    che: string;
    chi: string;
    mestiere: string;
    tuo: boolean;
    numero?: number;
    posto: number;
    /** Vero se chi guarda può toglierlo dalla fila: la sua roba, o è la casa. */
    tuoDaTogliere: boolean;
  }[];
  /** Chi sta al computer lo sta usando: non parte niente di nuovo. */
  inPausa: boolean;
  /** Perché è in pausa, se è stato detto. */
  motivoPausa?: string;
  /** Le richieste ferme per via di un tetto, con il loro perché. */
  trattenute: { id: string; testo: string; perche: string; tuo: boolean }[];
  /**
   * Le regole di questa macchina.
   *
   * Ci sono sempre — chi aspetta ha diritto di sapere *perché* aspetta — ma si
   * **cambiano solo dal computer**: vedi `sonoLaCasa`.
   */
  regole: {
    chiPassaSubito: "mai" | "admin" | "tutti";
    limiteFila: number;
    limitePersona: number;
  };
  /**
   * Chi sta guardando è il computer stesso.
   *
   * Solo lui vede — e può premere — gli interruttori delle regole. È la riga
   * che rende vero «il pc è il vero admin»: un telefono con i permessi da admin
   * decide sulle richieste, ma non sui limiti a cui è sottoposto.
   */
  sonoLaCasa: boolean;
}

/** Chi sa rispondere sulla macchina: lo passa lo shell. */
export interface FornitoreMacchina {
  stato(dispositivo: Dispositivo): StatoMacchina;
  /** «Sto usando il computer». Solo dal computer. */
  pausa(inPausa: boolean): void;
  /** Chi genera senza aspettare un sì, e i due tetti. Solo dal computer. */
  regole(opzioni: {
    chiPassaSubito: "mai" | "admin" | "tutti";
    limiteFila: number;
    limitePersona: number;
  }): void;
  /** Toglie dalla fila un lavoro non ancora partito. Torna il motivo se non va. */
  togli(id: string): string | null;
  /**
   * Ferma quello che sta girando **adesso**.
   *
   * Chiesto il 26 agosto 2026: «mettiamo la possibilità da pc di annullare una
   * generazione». Non è la stessa cosa di togliere dalla fila — quello non è
   * ancora partito, questo sì — e costa: il tempo di scheda video già speso è
   * perso. Per questo lo può fare solo la casa.
   */
  fermaAdesso(): string | null;
  /**
   * Accetta tutto quello che aspetta un sì, e lo mette in fila.
   *
   * «Sul pc deve essere un tasto che se premuto accetta tutte le richieste
   * mettendole correttamente in coda.» Torna quante ne sono partite.
   */
  accettaTutte(): number;
}

/* -------------------------------------------------------- la chiacchierata */

/**
 * Dieci minuti col modello, e il modello può usare la suite.
 *
 * **Cosa è stato chiesto, testualmente:** «puoi fare richiesta al pc di parlare
 * per 10 minuti con un modello, quel modello mentre parli ha la possibilità di
 * usare la suite: se io gli scrivo *vorrei fare una foto di una macchina*, il
 * modello potrà creare tutto un piano e lo invia all'utente; se l'utente lo
 * accetta il modello fa partire la richiesta e nel frattempo viene scaricato
 * dalla memoria».
 *
 * Le tre cose che rendono questa cosa possibile su una scheda da 8 GB:
 *
 * **1. È a tempo.** Il modello resta caricato per la durata della sessione e
 * poi se ne va. Non è avarizia: quei quattro GB sono gli stessi che servono a
 * generare, e un modello che resta caricato «per ogni evenienza» è una
 * generazione che non parte.
 *
 * **2. Tiene il turno.** Per tutta la sessione la macchina è sua — vedi
 * `turno.ts` nello shell — quindi non c'è modo che una generazione parta a metà
 * frase e porti via i pesi da sotto.
 *
 * **3. Accettare il piano la chiude.** È il punto: nell'istante in cui i lavori
 * partono, il modello serve a niente e i suoi GB servono a tutto. «Nel frattempo
 * viene scaricato dalla memoria» è esattamente questo.
 */
export interface Chiacchierata {
  id: string;
  /** Il dispositivo che sta parlando. */
  dispositivoId: string;
  /** Come si chiama chi sta parlando: serve a dirlo a chi aspetta. */
  chiNome?: string;
  /** Il modello scelto, come lo chiama LM Studio. */
  modello: string;
  /** Quando scade, in millisecondi. */
  scade: number;
  /** Le battute, dalla prima. */
  battute: BattutaChiacchierata[];
  /** Il piano proposto dal modello e non ancora deciso, se ce n'è uno. */
  piano?: PianoLavori;
}

export interface BattutaChiacchierata {
  /** Chi ha parlato: `io` è la persona, `modello` è il modello. */
  chi: "io" | "modello";
  testo: string;
  quando: number;
}

/**
 * Quello che il modello propone di far fare al computer.
 *
 * Non parte niente finché la persona non dice di sì: un modello che accende la
 * scheda video da solo, mentre chiacchiera, è esattamente il genere di sorpresa
 * che questo programma non deve fare.
 */
export interface PianoLavori {
  id: string;
  /** Una riga che dice cosa si è capito, con le parole di chi legge. */
  riassunto: string;
  lavori: LavoroDelPiano[];
}

export interface LavoroDelPiano {
  /** L'azione del catalogo: `genera.immagine`, `genera.video`… */
  azione: string;
  /** L'app che la esegue: foto, cinema, musica, voce. */
  app: string;
  /** Cosa mostrare a chi deve dire di sì: «una foto di una macchina rossa». */
  che: string;
  /** I campi già riempiti, pronti da mandare in fila. */
  campi: Record<string, string>;
}

/**
 * Il posto in fila di chi ha chiesto di parlare e sta aspettando.
 *
 * ⚠ **Questa è la cura a «quando dice chiedo al computer in realtà non
 * chiede»**, visto usando la 0.7.6. Prima l'attesa era dentro la chiamata: chi
 * premeva restava con una rotella per un minuto e poi si sentiva dire di
 * riprovare. Adesso la chiamata torna subito con un numero, quel numero scende,
 * e chi non ha voglia di aspettare esce dalla coda.
 */
export interface AttesaChiacchierata {
  /** Quanti ce ne sono davanti, più uno. Zero vuol dire: tocca a te adesso. */
  posto: number;
  /** Quanti aspettano in tutto, per capire quanto è lunga la fila. */
  quanti: number;
  /** Il turno è arrivato e si sta caricando il modello: ci vogliono secondi. */
  sicarica: boolean;
  /** Se l'attesa è finita male, il perché. */
  errore?: string;
}

/** Chi sa reggere una chiacchierata: lo passa lo shell. */
export interface FornitoreChiacchierata {
  /** I modelli installati su questo computer, fra cui scegliere. */
  modelli(): Promise<{ id: string; caricato: boolean }[]>;
  /**
   * Chiede di parlare. **Torna subito**: o la sessione, o il posto in fila.
   *
   * Il motivo torna solo per le cose che non si aggiustano aspettando: LM
   * Studio spento, nessun modello installato, un altro che sta già parlando.
   */
  comincia(opzioni: {
    dispositivoId: string;
    chiNome: string;
    modello: string;
  }): Promise<{ sessione: Chiacchierata } | { attesa: AttesaChiacchierata } | { errore: string }>;
  /** Una battuta. Torna la sessione aggiornata, col piano se ne ha fatto uno. */
  dico(opzioni: {
    id: string;
    dispositivoId: string;
    testo: string;
  }): Promise<{ sessione: Chiacchierata } | { errore: string }>;
  /** La sessione di questo dispositivo, se ce n'è una viva. */
  mia(dispositivoId: string): Chiacchierata | null;
  /** Il posto in fila di questo dispositivo, se sta aspettando. */
  attesa(dispositivoId: string): AttesaChiacchierata | null;
  /** Esce dalla coda. È un diritto: chi esce libera la macchina. */
  esci(dispositivoId: string): boolean;
  /** Chiude la sessione e libera la memoria. */
  chiudi(id: string, dispositivoId: string): void;
  /**
   * Accetta il piano: i lavori vanno in fila e il modello se ne va.
   *
   * `quali` sono gli indici dei lavori da fare: chi ne vuole due su tre non
   * deve accettare tutto o niente. `modelli` dice con quale modello generare
   * ognuna delle azioni scelte — si decide guardando il piano, non prima.
   */
  accetta(opzioni: {
    id: string;
    dispositivoId: string;
    quali: number[];
    modelli?: Record<string, string>;
  }): Promise<{ quanti: number } | { errore: string }>;
}

/* --------------------------------------------------------------- gli stili */

/**
 * Uno stile musicale di una persona.
 *
 * Vive sul computer, nella cartella di chi l'ha fatto — non nel telefono e non
 * nel `localStorage` di un browser. È la differenza fra uno stile che è **tuo**
 * e uno che è di quel dispositivo: il secondo sparisce cambiando telefono, e
 * uno stile buono si costruisce una volta e si usa per mesi.
 */
export interface StileRemoto {
  id: string;
  nome: string;
  /** Le parole che finiscono nella descrizione del brano. */
  testo: string;
  /**
   * Di che cosa è: `immagine`, `video`, `musica`. Dalla 0.7.8.
   *
   * È quello che tiene separati i tre elenchi, e che fa arrivare gli stili
   * immagine dentro la Produzione immagini e non dentro quella dei brani.
   */
  tipo?: string;
  /** `partenza`, `mio`, `preso`: da dove viene. */
  da: string;
  /** Chi l'ha fatto, se è arrivato da un altro. */
  daNome?: string;
  quando: number;
  /** In vetrina: gli altri lo vedono e possono provarlo. */
  condiviso?: boolean;
  /** Solo per quelli in vetrina: di chi sono. */
  chi?: string;
  chiNome?: string;
}

/** Chi sa rispondere sugli stili: lo passa lo shell. */
export interface FornitoreStili {
  /** I miei. Alla prima volta, quelli di partenza. */
  miei(chi: string): StileRemoto[];
  /** Quelli che gli altri hanno messo in vetrina. */
  vetrina(chi: string): StileRemoto[];
  /** Salva uno stile: nuovo, o al posto di uno che c'era. */
  salva(
    chi: string,
    dati: {
      id?: string;
      nome: string;
      testo: string;
      tipo?: string;
      da?: string;
      daNome?: string;
    },
  ): StileRemoto | null;
  togli(chi: string, id: string): boolean;
  condividi(chi: string, id: string, condiviso: boolean): boolean;
}
