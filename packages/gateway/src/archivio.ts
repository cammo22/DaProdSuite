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
import type { Dispositivo, Invito, Notifica, Richiesta } from "./types";

export interface DatiRemoto {
  versione: 1;
  dispositivi: Dispositivo[];
  richieste: Richiesta[];
  notifiche: Notifica[];
  inviti: Invito[];
}

const VUOTI: DatiRemoto = { versione: 1, dispositivi: [], richieste: [], notifiche: [], inviti: [] };

/** Quanto si aspetta prima di scrivere davvero: mezzo secondo. */
const ATTESA_SCRITTURA_MS = 500;

export class Archivio {
  private dati: DatiRemoto;
  private differita: ReturnType<typeof setTimeout> | null = null;

  constructor(private file: string) {
    this.dati = this.carica();
  }

  private carica(): DatiRemoto {
    if (!existsSync(this.file)) return { ...VUOTI, dispositivi: [], richieste: [], notifiche: [], inviti: [] };
    try {
      const letto = JSON.parse(readFileSync(this.file, "utf8")) as Partial<DatiRemoto>;
      return {
        versione: 1,
        dispositivi: Array.isArray(letto.dispositivi) ? letto.dispositivi : [],
        richieste: Array.isArray(letto.richieste) ? letto.richieste : [],
        notifiche: Array.isArray(letto.notifiche) ? letto.notifiche : [],
        inviti: Array.isArray(letto.inviti) ? letto.inviti : [],
      };
    } catch {
      return { ...VUOTI };
    }
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