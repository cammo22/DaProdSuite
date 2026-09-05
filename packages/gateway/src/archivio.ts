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

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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

  constructor(private file: string) {
    this.dati = this.carica();
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
      const letto = JSON.parse(readFileSync(this.file, "utf8")) as Partial<DatiRemoto>;
      return {
        versione: 1,
        dispositivi: Array.isArray(letto.dispositivi) ? letto.dispositivi : [],
        richieste: Array.isArray(letto.richieste) ? letto.richieste : [],
        notifiche: Array.isArray(letto.notifiche) ? letto.notifiche : [],
        inviti: Array.isArray(letto.inviti) ? letto.inviti : [],
        // Un archivio scritto da una versione precedente non ce l'ha: si parte
        // da vuoto invece di rifiutarlo.
        invii: Array.isArray(letto.invii) ? letto.invii : [],
        bussate: Array.isArray(letto.bussate) ? letto.bussate : [],
        ioId: typeof letto.ioId === "string" ? letto.ioId : undefined,
        ultimoNumero: Number(letto.ultimoNumero) || 0,
      };
    } catch {
      return { ...VUOTI };
    }
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
    try {
      mkdirSync(dirname(this.file), { recursive: true });
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