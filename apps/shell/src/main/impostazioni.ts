/**
 * Le poche scelte che la suite ricorda fra un avvio e l'altro.
 *
 * Un file solo, `settings.json`, letto una volta e riscritto quando cambia
 * qualcosa. Non è un sistema di configurazione: è il posto dove finiscono le
 * decisioni che l'utente prende una volta e non vuole ridare ogni volta.
 *
 * Le impostazioni dei singoli motori **non** stanno qui: quelle sono del motore,
 * e cambiano quando cambia lui. Qui ci sono solo cose che valgono per tutta la
 * suite — oggi una: quanto spingere i motori.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Impostazioni, ProfiloMemoria, Velocita } from "@daprod/ipc";
import { SETTINGS_FILE } from "./paths";

const PREDEFINITE: Impostazioni = {
  velocita: "normale",
  // Quello con cui abbiamo generato finora: il metro di paragone.
  profilo: "bilanciato",
  guidaFatta: false,
  // Accesa di suo: vedi il commento sul campo in @daprod/ipc.
  connessione: true,
  /**
   * Anche il tunnel, dalla 0.7.5.
   *
   * Prima era spento di suo, «lo si accende sapendo cosa si sta facendo». Il
   * risultato, visto sul PC vero: nessuno lo accendeva mai, il QR conteneva
   * soltanto `192.168.1.8:8790`, e dal telefono fuori casa non si arrivava —
   * la connessione «funzionava, ma solo in casa». Che e' esattamente la cosa
   * che il tunnel esisteva per risolvere.
   *
   * Acceso di suo costa quaranta MB la prima volta e mette su Internet un
   * indirizzo che senza token risponde 401 a tutto. Si spegne dal pannello di
   * DaProdConnessione, e la scelta resta.
   */
  internet: true,
  precarica: true,
};

let cache: Impostazioni | null = null;

export function impostazioni(): Impostazioni {
  if (cache) return cache;

  if (existsSync(SETTINGS_FILE)) {
    try {
      const lette = JSON.parse(readFileSync(SETTINGS_FILE, "utf8")) as Partial<Impostazioni>;
      // Solo i valori che riconosciamo: un file scritto a mano o rimasto da una
      // versione vecchia non deve poter mettere il motore in uno stato che non
      // sappiamo raccontare.
      cache = {
        velocita: lette.velocita === "spinta" ? "spinta" : "normale",
        profilo:
          lette.profilo === "leggero" || lette.profilo === "qualita"
            ? lette.profilo
            : "bilanciato",
        guidaFatta: lette.guidaFatta === true,
        // `!== false` e non `=== true`: un file scritto da una versione
        // precedente non ha questo campo, e per chi aggiorna la connessione
        // deve risultare accesa come per chi installa adesso.
        connessione: lette.connessione !== false,
        // Come `connessione`, e per la stessa ragione: chi aggiorna da una
        // versione in cui il campo non c'era deve trovare la strada da fuori
        // aperta come chi installa adesso.
        internet: lette.internet !== false,
        precarica: lette.precarica !== false,
      };
      return cache;
    } catch {
      // Impostazioni illeggibili: si riparte dai valori predefiniti invece di
      // impedire l'avvio della suite per un file di due righe.
    }
  }

  cache = { ...PREDEFINITE };
  return cache;
}

/**
 * Cambia quanto spingere i motori. Torna le impostazioni aggiornate.
 *
 * Ha effetto al **prossimo avvio del motore**: i flag si passano alla riga di
 * comando, e un motore acceso non se li rilegge. Chi chiama lo dice all'utente
 * invece di far finta che sia già cambiato qualcosa.
 */
export function impostaVelocita(velocita: Velocita): Impostazioni {
  return salva({ velocita });
}

/**
 * Cambia quanta memoria video lasciar prendere ai motori.
 *
 * Come la velocità, ha effetto al **prossimo avvio del motore**: i flag si
 * passano alla riga di comando e un motore acceso non se li rilegge.
 */
export function impostaProfilo(profilo: ProfiloMemoria): Impostazioni {
  return salva({ profilo });
}

/**
 * Accende o spegne la connessione da fuori.
 *
 * Si ricorda, ed è tutto il punto: «se si è avviato una volta si avvia sempre
 * in rete e si connette». Chi la spegne la ritrova spenta, chi la lascia accesa
 * non deve premere niente mai più.
 */
export function impostaConnessione(accesa: boolean): Impostazioni {
  return salva({ connessione: accesa });
}

/** Il tunnel verso Internet, ricordato allo stesso modo. */
export function impostaInternet(acceso: boolean): Impostazioni {
  return salva({ internet: acceso });
}

/** La procedura guidata è stata vista: non si ripresenta al prossimo avvio. */
export function segnaGuidaFatta(): Impostazioni {
  return salva({ guidaFatta: true });
}

function salva(cambi: Partial<Impostazioni>): Impostazioni {
  const nuove: Impostazioni = { ...impostazioni(), ...cambi };
  cache = nuove;
  try {
    writeFileSync(SETTINGS_FILE, `${JSON.stringify(nuove, null, 2)}\n`, "utf8");
  } catch {
    // Se non si riesce a scrivere resta valido per questa sessione: meglio di
    // un errore in faccia per una preferenza.
  }
  return nuove;
}
