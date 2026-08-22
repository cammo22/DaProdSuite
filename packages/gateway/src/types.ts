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
}

/**
 * Payload da mettere nel QR: l'app lo legge per sapere dove e con cosa parlare.
 *
 * **La versione 2 aggiunge `base`, e serviva.** Fino alla 1 nel QR c'era solo
 * `host` — «192.168.1.20:8790» — e l'app ci costruiva davanti `http://`. Con il
 * tunnel su Internet l'indirizzo è `https://qualcosa.trycloudflare.com`: non ha
 * una porta, non è HTTP, e non entra in un campo che si chiama host. `base` è
 * l'indirizzo completo, con lo schema, ed è quello che l'app deve usare.
 *
 * `host` resta, e resta giusto: è l'indirizzo **sulla rete di casa**, che
 * funziona anche quando il tunnel è spento. Un'app vecchia legge quello e
 * continua a funzionare in casa; una nuova preferisce `base`.
 */
export interface InvitoQr {
  /** Versione della struttura: 1 al primo giro, 2 da quando c'è `base`. */
  v: 1 | 2;
  /** Indirizzo del gateway sulla rete locale, es. "192.168.1.20:8790". */
  host: string;
  /** L'indirizzo completo da usare, con lo schema. Presente dalla v2. */
  base?: string;
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