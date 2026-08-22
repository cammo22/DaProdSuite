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
  /**
   * Gli indirizzi su cui il gateway può farsi trovare, dal più probabile.
   *
   * Un computer ne ha spesso più d'uno — la rete di casa, una scheda virtuale,
   * Tailscale — e **solo uno è raggiungibile dal telefono**. La suite sceglie,
   * ma li mostra tutti: su una macchina con quattro indirizzi nessuna regola è
   * giusta sempre, e chi guarda lo schermo sa cose che noi non sappiamo.
   */
  reti: ReteDisponibile[];
  /** L'indirizzo che si sta usando adesso, fra quelli di `reti`. */
  rete: string;
  /** Il nome del computer, mostrato al telefono. */
  computer: string;
  /**
   * L'accesso da Internet: com'è messo il tunnel in uscita.
   *
   * È la cosa che la 0.5.0 aveva lasciato indietro — «non esce dalla rete
   * locale» — e che dalla 0.6.0 si accende con un interruttore. Il pannello
   * mostra la fase così com'è, perché scaricare quaranta MB di `cloudflared` e
   * aspettare che Cloudflare risponda sono due attese diverse, e una che non
   * dice quale delle due è sembra un programma piantato.
   */
  internet: StatoInternet;
  /**
   * Il firewall di Windows davanti alla porta del gateway.
   *
   * È il guasto più silenzioso che questo pannello possa avere: la suite dice
   * «in ascolto», il QR si inquadra, e dal telefono non arriva niente perché
   * Windows blocca in entrata senza dirlo a nessuno. Qui si racconta, e si dà
   * il tasto per rimediare.
   */
  firewall: { aperta: boolean; incerto: boolean };
  /** L'invito attivo, se c'è. */
  invito?: InvitoRemoto;
  dispositivi: DispositivoRemoto[];
  richieste: RichiestaRemota[];
  /** Quante richieste nuove (in attesa) ci sono: per il pallino sul pannello. */
  attesa: number;
}

/** Come sta il tunnel che porta la suite fuori di casa. */
export interface StatoInternet {
  /**
   * - `spento`: si lavora solo sulla wifi di casa, come prima;
   * - `scarico`: sta arrivando `cloudflared` (una volta sola, ~40 MB);
   * - `accendo`: il tunnel si sta alzando e Cloudflare non ha ancora dato un nome;
   * - `acceso`: c'è un indirizzo pubblico e funziona da fuori;
   * - `guasto`: non è riuscito, e `motivo` dice perché.
   */
  fase: "spento" | "scarico" | "accendo" | "acceso" | "guasto";
  /** L'indirizzo pubblico completo, con `https://`. Vuoto se non c'è. */
  indirizzo: string;
  /** Cosa è andato storto, in italiano. */
  motivo?: string;
  /** Quanto è arrivato dello scaricamento, da 0 a 1. Solo durante `scarico`. */
  quota?: number;
}

/** Un indirizzo su cui il gateway può farsi trovare. */
export interface ReteDisponibile {
  ip: string;
  /** Il nome della scheda, come lo chiama Windows. */
  scheda: string;
  /** Una riga che dice cos'è: «rete di casa», «scheda virtuale»… */
  che: string;
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