/**
 * Persistenza dell'accesso remoto.
 *
 * Tutto passa da un file solo, `remoto.json`, nella cartella dati della suite
 * (accanto a settings.json): dispositivi, richieste, notifiche e inviti.
 * Si scrive in modo atomico (file temporaneo + rinomina) perché il gateway
 * può ricevere richieste mentre il pannello dell'hub sta salvando.
 *
 * Le scritture sono **differite di mezzo secondo**: ogni chiamata autorizzata
 * aggiorna l'ultimo accesso del dispositivo, e con un telefono che chiede
 * novità ogni venti secondi e una console web aperta sul portatile sarebbe un
 * file riscritto per ogni battito. Chi salva dice "salva"; il quando lo decide
 * questo file. Alla chiusura della suite si scrive comunque, subito.
 *
 * Niente database: sono poche centinaia di righe e le decisioni di coerenza
 * stanno in un unico posto, il server.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Bussata, Dispositivo, Invio, Invito, Notifica, Richiesta } from "./types";

export interface DatiRemoto {
  versione: 1;
  dispositivi: Dispositivo[];
  richieste: Richiesta[];
  notifiche: Notifica[];
  inviti: Invito[];
  /** I file mandati a mano a qualcuno. Vuoto negli archivi scritti prima della 0.7.2. */
  invii: Invio[];
  /**
   * Chi ha bussato: chiesto di entrare scegliendo questo computer da un elenco.
   *
   * Vuoto negli archivi scritti prima della 0.9.0. Si tengono anche quelle
   * chiuse per qualche minuto: chi ha bussato deve poter ritirare la risposta
   * anche se nel frattempo ha messo il telefono in tasca.
   */
  bussate: Bussata[];
  /**
   * Il nome con cui questo computer si presenta agli altri sulla rete.
   *
   * Sta nell'archivio e non si ricalcola: se cambiasse a ogni avvio, ogni
   * riavvio farebbe comparire un computer nuovo nell'elenco di tutti gli altri
   * e quello di prima resterebbe lì a spegnersi da solo per quarantacinque
   * secondi.
   */
  ioId?: string;
  /**
   * L'ultimo numero dato a un lavoro. Non riparte mai da capo.
   *
   * Vive nell'archivio e non in memoria: un numero che ricomincia da uno a ogni
   * riavvio della suite non è un numero, è un'etichetta riusata — e due lavori
   * «numero 3» nella stessa giornata sono peggio di nessun numero.
   */
  ultimoNumero?: number;
}

const VUOTI: DatiRemoto = {
  versione: 1,
  dispositivi: [],
  richieste: [],
  notifiche: [],
  inviti: [],
  invii: [],
  bussate: [],
  ultimoNumero: 0,
};

/** Quanto si aspetta prima di scrivere davvero: mezzo secondo. */
const ATTESA_SCRITTURA_MS = 500;

export class Archivio {
  private dati: DatiRemoto;
  private differita: ReturnType<typeof setTimeout> | null = null;

  /**
   * Vero quando il file c'era e non si è capito.
   *
   * Finché è vero **non si scrive**: quello che c'è in memoria è una lista
   * vuota, e scriverla vorrebbe dire cancellare per sempre chi poteva entrare.
   * Vedi `carica()`.
   */
  private rotto = false;

  /** Vero se l'archivio su disco non si è capito e non lo si tocca più. */
  get eRotto(): boolean {
    return this.rotto;
  }

  constructor(private file: string) {
    this.dati = this.carica();
  }

  /**
   * ⚠ **La copia di sicurezza, e perche' c'e'.**
   *
   * Chiesto il 6 settembre 2026, dopo la quarta volta: «voglio essere sicuro
   * per il login, a prova di aggiornamenti».
   *
   * Questo file e' **l'unico posto** dove vive chi ha il permesso di entrare.
   * Un file solo vuol dire un punto solo che, rompendosi, porta via tutti i
   * telefoni di casa — e non c'e' modo di rimetterli a posto se non
   * riaccoppiandoli uno per uno.
   *
   * La copia si scrive **prima** di ogni scrittura vera, e solo quando quella
   * di adesso si e' letta bene: cosi' contiene sempre l'ultimo stato **buono**,
   * mai quello a meta'. Non e' una cronologia — non serve — e' una rete.
   */
  private get copia(): string {
    return `${this.file}.bak`;
  }

  private carica(): DatiRemoto {
    if (!existsSync(this.file)) {
      return {
        ...VUOTI,
        dispositivi: [],
        richieste: [],
        notifiche: [],
        inviti: [],
        invii: [],
        bussate: [],
      };
    }
    try {
      // Un archivio scritto da una versione precedente non ha tutti i campi:
      // `leggiDa` mette una lista vuota dove manca, invece di rifiutarlo.
      return this.leggiDa(this.file);
    } catch (male) {
      /**
       * ⚠ **Un archivio illeggibile non è un archivio vuoto.**
       *
       * Qui c'era `return { ...VUOTI }`, e sembrava prudente: se il file non si
       * legge, si riparte da zero invece di morire. È il ragionamento giusto
       * per una cache. Questo file **non è una cache**: è l'unico posto dove
       * vive chi ha il permesso di entrare.
       *
       * Cosa succedeva davvero. Il file non si legge — un disco che fa i
       * capricci, un antivirus che lo tiene aperto un istante di troppo, una
       * scrittura interrotta da uno spegnimento — e la suite si accende con
       * **zero dispositivi**. Poi, alla prima cosa che cambia, `salva()`
       * scrive quella lista vuota **sopra al file buono**: da lì in poi tutti i
       * telefoni di casa prendono 401, e l'unica cosa che l'app sa dire è «sei
       * stato tolto dal computer, rifai il collegamento».
       *
       * Una perdita di dati silenziosa, e per giunta permanente al secondo
       * avvio. Non è mai stato dimostrato che sia successo a Cammo — ma è
       * esattamente la faccia che ha il difetto che ha riportato tre volte, e
       * un caso così non si lascia in piedi «finché non si prova».
       *
       * Adesso: si tiene una copia di quello che non si è capito, si dice a
       * voce alta, e **non si scrive più niente** su quel file per il resto
       * della sessione. La suite parte lo stesso — chi sta al computer la usa —
       * ma non porta via a nessuno la sua chiave.
       */
      const perche = male instanceof Error ? male.message : String(male);
      console.error(`[remoto] non riesco a leggere ${this.file}: ${perche}`);

      // Prima di tutto: si tiene da parte quello che non si e' capito, perche'
      // guardarlo dopo e' l'unico modo di sapere cos'era successo.
      try {
        const salvataggio = `${this.file}.rotto-${new Date().toISOString().replace(/[:.]/g, "-")}`;
        copyFileSync(this.file, salvataggio);
        console.error(`[remoto] com'era, messo da parte in ${salvataggio}`);
      } catch {
        console.error("[remoto] e non riesco nemmeno a farne una copia.");
      }

      /**
       * **E poi si prova la copia.** E' la differenza fra «hai perso tutti i
       * telefoni» e «ci siamo persi l'ultimo mezzo minuto».
       *
       * Se la copia si legge, si riparte da li' e si continua a lavorare
       * normalmente: quello che manca e' al massimo quello che era cambiato fra
       * l'ultima scrittura buona e il guasto, cioe' un `ultimoAccesso` o una
       * notifica. Le chiavi ci sono tutte.
       */
      if (existsSync(this.copia)) {
        try {
          const dallaCopia = this.leggiDa(this.copia);
          console.error(`[remoto] riparto dalla copia: ${dallaCopia.dispositivi.length} dispositivi salvati.`);
          return dallaCopia;
        } catch {
          console.error("[remoto] anche la copia non si legge.");
        }
      }

      /**
       * Ne' l'uno ne' l'altra. Si parte vuoti — la suite dev'essere usabile da
       * chi ci sta davanti — ma **non si scrive piu' niente** su quel file: una
       * lista vuota scritta sopra a un file che forse si sarebbe recuperato e'
       * un danno definitivo fatto per comodita'.
       */
      this.rotto = true;
      console.error("[remoto] parto senza dispositivi e non scrivo su quel file: nessuno perde la sua chiave.");
      return { ...VUOTI };
    }
  }

  /** Legge un archivio da un percorso, e lo normalizza. Solleva se non si capisce. */
  private leggiDa(percorso: string): DatiRemoto {
    const letto = JSON.parse(readFileSync(percorso, "utf8")) as Partial<DatiRemoto>;
    return {
      versione: 1,
      dispositivi: Array.isArray(letto.dispositivi) ? letto.dispositivi : [],
      richieste: Array.isArray(letto.richieste) ? letto.richieste : [],
      notifiche: Array.isArray(letto.notifiche) ? letto.notifiche : [],
      inviti: Array.isArray(letto.inviti) ? letto.inviti : [],
      invii: Array.isArray(letto.invii) ? letto.invii : [],
      bussate: Array.isArray(letto.bussate) ? letto.bussate : [],
      ioId: typeof letto.ioId === "string" ? letto.ioId : undefined,
      ultimoNumero: Number(letto.ultimoNumero) || 0,
    };
  }

  /**
   * **Scrive adesso, e non fra mezzo secondo.**
   *
   * ⚠ Questo è il difetto più grave chiuso nella 0.7.7, e lo si è visto solo
   * usandola: «quando chiudo e apro l'app spesso devo cancellare l'account e
   * riscannerizzare il codice».
   *
   * Le scritture qui sono differite di mezzo secondo, e per l'ultimo accesso di
   * un dispositivo è giusto: un telefono che bussa ogni venti secondi
   * riscriverebbe il file per ogni battito. Ma **l'accoppiamento passava dalla
   * stessa strada**, e mezzo secondo è un'eternità: bastava che la suite
   * morisse male in quella finestra — e moriva male spesso, per via dei
   * processi che restavano — perché il dispositivo appena accoppiato non fosse
   * mai stato scritto. Il telefono aveva un token che il computer non aveva mai
   * visto: 401 a ogni chiamata, e l'unica cura sembrava rifare il codice.
   *
   * Da qui in poi: **quello che decide chi sei si scrive subito.**
   * Accoppiamento, revoca, cambio di ruolo, cambio di nome. Tutto il resto
   * resta differito, che è quello per cui la differita era nata.
   */
  salvaSubito(): void {
    this.scriviAdesso();
  }

  /**
   * Segna che c'è da salvare. La scrittura vera avviene poco dopo, e più
   * chiamate ravvicinate diventano una scrittura sola.
   */
  salva(): void {
    if (this.differita) return;
    this.differita = setTimeout(() => {
      this.differita = null;
      this.scriviAdesso();
    }, ATTESA_SCRITTURA_MS);
    // Un timer in attesa non deve tenere in piedi il processo alla chiusura.
    this.differita.unref?.();
  }

  /** Scrive subito, senza aspettare. Alla chiusura della suite si usa questa. */
  scriviAdesso(): void {
    if (this.differita) {
      clearTimeout(this.differita);
      this.differita = null;
    }
    // ⚠ L'archivio non si è capito all'avvio: quello che abbiamo in memoria è
    // vuoto, e scriverlo cancellerebbe le chiavi di tutti. Vedi `carica()`.
    if (this.rotto) return;
    try {
      mkdirSync(dirname(this.file), { recursive: true });

      /**
       * ⚠ **La copia si fa prima, e solo del file buono.**
       *
       * L'ordine conta: si copia quello che c'e' **adesso** — che si e' letto
       * bene all'avvio, quindi e' buono — e solo dopo si scrive il nuovo. Se il
       * computer si spegne nel mezzo, la copia e' l'ultimo stato completo.
       *
       * Copiare **dopo** avrebbe voluto dire, prima o poi, una copia fatta di
       * un file scritto a meta': cioe' una rete con un buco proprio dove uno ci
       * cade.
       */
      if (existsSync(this.file)) {
        try {
          copyFileSync(this.file, this.copia);
        } catch {
          // La copia non e' riuscita: si scrive lo stesso. Meglio un archivio
          // aggiornato senza rete che uno fermo a ieri.
        }
      }

      const temporaneo = `${this.file}.tmp`;
      writeFileSync(temporaneo, `${JSON.stringify(this.dati, null, 2)}\n`, "utf8");
      renameSync(temporaneo, this.file);
    } catch {
      // La copia in memoria continua a valere per questa sessione.
    }
  }

  get datiCorrenti(): DatiRemoto {
    return this.dati;
  }

  /** Costruisce un archivio dal file: comodo per i moduli che ne hanno uno solo. */
  static apri(file: string): Archivio {
    return new Archivio(file);
  }
}

/** Cartella dei file di risultato pronti da scaricare. */
export function cartellaRisultati(root: string): string {
  return join(root, "risultati");
}

/**
 * Cartella dei file mandati a mano a qualcuno.
 *
 * Separata dai risultati di proposito: quella è roba che la suite ha prodotto e
 * che il gateway lascia scaricare a chi l'aveva chiesta, questa è roba che
 * arriva da un disco e va a una persona sola.
 */
export function cartellaInvii(root: string): string {
  return join(root, "invii");
}