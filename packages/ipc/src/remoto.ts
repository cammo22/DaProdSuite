/**
 * L'accesso remoto, visto dall'hub.
 *
 * Questi sono i tipi che il pannello "Telefono" usa per parlare col main: lo
 * stato del gateway, l'invito da mostrare (QR e codice), i dispositivi
 * accoppiati, le richieste arrivate e le azioni che il pannello permette.
 *
 * Non si tocca la rete da qui: il gateway vive nel main, e questo file è
 * soltanto la forma dei dati che attraversano l'IPC.
 */

/** Lo stato di una richiesta di generazione arrivata da un telefono. */
export type StatoRemoto =
  | "in-attesa"
  | "accettata"
  | "in-lavoro"
  | "pronta"
  | "scartata"
  | "scaduta";

/** Lo stato dell'accesso remoto, come lo vuole il pannello. */
export interface StatoAccesso {
  /** Il gateway è acceso e in ascolto. */
  acceso: boolean;
  /** L'indirizzo che un telefono deve usare per raggiungerlo. */
  indirizzo: string;
  /**
   * L'indirizzo completo della console web, da aprire nel browser di un altro
   * computer. Vuoto quando il gateway è spento.
   */
  console: string;
  /** Il nome del computer, mostrato al telefono. */
  computer: string;
  /** L'invito attivo, se c'è. */
  invito?: InvitoRemoto;
  dispositivi: DispositivoRemoto[];
  richieste: RichiestaRemota[];
  /** Quante richieste nuove (in attesa) ci sono: per il pallino sul pannello. */
  attesa: number;
}

/** Un invito: quello che va nel QR e nel codice a otto cifre. */
export interface InvitoRemoto {
  codice: string;
  ruolo: "admin" | "ospite";
  scade: number;
  /** Sotto forma di URL: quello che l'app Android legge dal QR. */
  url: string;
  /** Il QR già disegnato (data URL PNG): il pannello lo mostra così com'è. */
  qr: string;
}

/** Un dispositivo accoppiato, senza segreti. */
export interface DispositivoRemoto {
  id: string;
  nome: string;
  ruolo: "admin" | "ospite";
  accoppiato: number;
  ultimoAccesso: number;
}

/** Una richiesta arrivata dal telefono, come la mostra il pannello. */
export interface RichiestaRemota {
  id: string;
  tipo: string;
  app: string;
  testo: string;
  opzioni?: Record<string, string>;
  daNome: string;
  stato: StatoRemoto;
  quando: number;
  motivoScarto?: string;
  risultato?: { nome: string; bytes: number; tipo: string };
}

/** Il risultato di una decisione del pannello. */
export interface EsitoDecisione {
  ok: boolean;
  errore?: string;
}