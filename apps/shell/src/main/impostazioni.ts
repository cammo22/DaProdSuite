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
import { CONTESTI_LLM } from "@daprod/ipc";
import type { ChiPassaSubito, Impostazioni, ProfiloMemoria, Velocita } from "@daprod/ipc";
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
  /**
   * Di suo, chi ha i permessi da admin genera subito.
   *
   * È quello che è stato chiesto — «un account admin può generare subito senza
   * aspettare l'ok del pc» — e ha senso: dare a qualcuno i permessi da admin
   * vuol già dire fidarsi. Gli ospiti no: la loro richiesta resta in attesa
   * finché qualcuno non la guarda.
   */
  accettaDaSola: "admin",
  /**
   * Sei in fila, e non è un numero tirato a caso.
   *
   * Una generazione lunga sta su questa macchina venti minuti buoni: sei
   * vogliono dire che l'ultimo della fila aspetta due ore. Oltre, la richiesta
   * non si perde — resta «in attesa» — ma non parte da sola.
   */
  limiteFila: 6,
  /** Due a testa: uno che genera e uno che aspetta. Il terzo si accetta a mano. */
  limitePersona: 2,
  inPausa: false,
  /**
   * 64K: quello con cui la suite ha lavorato fino alla 0.7.6.
   *
   * Chi aggiorna non deve accorgersi di niente; chi vuole di più (o di meno) lo
   * sceglie da DaProdConnessione.
   */
  contestoLlm: 65_536,
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
        accettaDaSola:
          lette.accettaDaSola === "mai" || lette.accettaDaSola === "tutti"
            ? lette.accettaDaSola
            : "admin",
        limiteFila: numeroSano(lette.limiteFila, PREDEFINITE.limiteFila),
        limitePersona: numeroSano(lette.limitePersona, PREDEFINITE.limitePersona),
        inPausa: lette.inPausa === true,
        contestoLlm: contestoSano(lette.contestoLlm),
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

/**
 * Chi può generare senza aspettare il sì. **Si cambia solo dal computer.**
 *
 * Non c'è una rotta del gateway che arrivi qui, e non è una dimenticanza: se un
 * telefono con i permessi da admin potesse alzarsi da solo i limiti, i limiti
 * non sarebbero limiti. Il PC è il vero admin.
 */
export function impostaAccettaDaSola(chi: ChiPassaSubito): Impostazioni {
  return salva({ accettaDaSola: chi });
}

/** I due tetti della fila: quanti lavori in tutto, e quanti a testa. */
export function impostaLimiti(fila: number, persona: number): Impostazioni {
  return salva({
    limiteFila: numeroSano(fila, PREDEFINITE.limiteFila),
    limitePersona: numeroSano(persona, PREDEFINITE.limitePersona),
  });
}

/** «Sto usando il computer»: si ricorda, come tutto il resto qui dentro. */
export function impostaPausa(inPausa: boolean): Impostazioni {
  return salva({ inPausa });
}

/**
 * Con quanto contesto caricare il modello che scrive.
 *
 * Ha effetto al **prossimo caricamento**: un modello già in memoria non se lo
 * rilegge, e dirgli il contrario sarebbe far credere a chi preme che sia
 * cambiato qualcosa adesso.
 */
export function impostaContestoLlm(token: number): Impostazioni {
  return salva({ contestoLlm: contestoSano(token) });
}

/**
 * Un contesto che esista davvero fra quelli offerti.
 *
 * Non si accetta un numero qualunque: un contesto scritto a mano e sbagliato di
 * uno zero è un modello che non si carica più, e la frase che LM Studio
 * risponde in quel caso non aiuta nessuno.
 */
function contestoSano(valore: unknown): number {
  const n = Number(valore);
  return (CONTESTI_LLM as readonly number[]).includes(n) ? n : PREDEFINITE.contestoLlm;
}

/**
 * Un numero che abbia senso come tetto: intero, non negativo, non assurdo.
 *
 * Zero è legittimo e vuol dire «senza tetto»; cento è più di quanto questa
 * macchina possa generare in un giorno, e serve solo a impedire che un errore
 * di battitura diventi una fila infinita.
 */
function numeroSano(valore: unknown, difetto: number): number {
  const n = Number(valore);
  if (!Number.isFinite(n) || n < 0) return difetto;
  return Math.min(100, Math.floor(n));
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
