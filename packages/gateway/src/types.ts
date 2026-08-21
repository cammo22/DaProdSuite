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

/** Payload da mettere nel QR: l'app lo legge per sapere dove e con cosa parlare. */
export interface InvitoQr {
  /** Versione della struttura: 1 al primo giro. */
  v: 1;
  /** Indirizzo del gateway, es. "192.168.1.20:8790". */
  host: string;
  /** Codice a otto cifre, monouso. */
  codice: string;
  /** Ruolo che questo invito concede. */
  ruolo: Ruolo;
}