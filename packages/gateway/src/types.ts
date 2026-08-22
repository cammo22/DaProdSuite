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
}

/** Il dispositivo senza il token: è quel che si può mostrare in giro. */
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
  | "scaduta";

/** Una richiesta di lavoro, come la vede il server. */
export interface Richiesta {
  id: string;
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
}

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
}

/** Chi sa rispondere sulla libreria: lo passa lo shell al gateway. */
export interface FornitoreLibreria {
  /** Le ultime cose prodotte, filtrate come chiede chi guarda. */
  elenco(filtro: { tipo?: string; app?: string; quanti?: number }): VoceLibreria[];
  /** Il file di una voce: percorso sul disco e come si chiama. Null se non c'è. */
  file(id: string): { percorso: string; nome: string; mime: string; bytes: number } | null;
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
