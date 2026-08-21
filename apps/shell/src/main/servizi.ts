/**
 * I motori Python, accesi e spenti insieme alle app che li usano.
 *
 * Il [supervisore](process-supervisor.ts) sapeva già avviare un processo,
 * aspettare `/health` e spegnerlo; quello che mancava era qualcuno che lo
 * chiamasse. Questo è quel qualcuno: traduce una voce del catalogo in una
 * `ServiceConfig` e tiene il conto di chi sta usando cosa.
 *
 * **Un motore può servire più app.** Musica, Foto e Cinema girano tutte sullo
 * stesso ComfyUI: il conto degli utenti serve a non spegnerlo sotto i piedi di
 * un'altra scheda ancora aperta. Oggi l'arbitro della GPU ne ammette una sola
 * alla volta, ma quel giorno arriverà (le app leggere non passano dall'arbitro)
 * e un motore spento a metà lavoro è un bug che si vede solo allora.
 */

import { APPS, type AppId, type AppService } from "@daprod/ipc";
import { ProcessSupervisor } from "./process-supervisor";
import { impostazioni } from "./impostazioni";
import { cartellaLibreriePrivate } from "./librerie-servizio";
import { createLogger } from "./logging";
import { libreria } from "./libreria";
import { CACHE_DIR, ENGINES_DIR, MODELS_DIR, PYTHON_EXE, SERVICES_DIR, cartellaApp } from "./paths";
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

interface Acceso {
  supervisore: ProcessSupervisor;
  /** Le app che in questo momento hanno bisogno di questo motore. */
  utenti: Set<AppId>;
  /** Condivisa fra chi apre due app insieme: un solo avvio, non due. */
  avvio: Promise<void>;
  /** Tenuto da parte per poterlo ridare a un supervisore nuovo dopo un riavvio. */
  onFatal: (motivo: string) => void;
}

const accesi = new Map<string, Acceso>();

/** L'indirizzo del motore di un'app, per la finestra che ci deve parlare. */
export function indirizzo(id: AppId): string | null {
  const servizio = APPS[id].service;
  return servizio ? `http://127.0.0.1:${servizio.port}` : null;
}

/** Tutti i motori che quest'app può usare: il suo e quelli che chiede a richiesta. */
function tuttiIServizi(id: AppId): AppService[] {
  const app = APPS[id];
  return [...(app.service ? [app.service] : []), ...(app.motoriInPiu ?? [])];
}

/**
 * Accende un motore *in più* di quest'app e torna il suo indirizzo.
 *
 * A differenza di `avvia`, non lo chiama l'hub aprendo la scheda: lo chiede la
 * finestra quando l'utente sceglie qualcosa che lo richiede — DaProdDream lo fa
 * passando ad Anima. Se sta già girando (perché lo tiene acceso un'altra app)
 * si aggiunge soltanto agli utenti: un motore solo, non due sulla stessa porta.
 */
export async function avviaInPiu(id: AppId, servizioId: string): Promise<string> {
  const servizio = APPS[id].motoriInPiu?.find((s) => s.id === servizioId);
  if (!servizio) throw new Error(`${APPS[id].name} non conosce il motore "${servizioId}".`);

  const gia = accesi.get(servizio.id);
  if (gia) {
    gia.utenti.add(id);
    await gia.avvio;
    return `http://127.0.0.1:${servizio.port}`;
  }

  if (!existsSync(PYTHON_EXE)) {
    throw new Error("Manca l'ambiente Python della suite: installalo dall'hub.");
  }

  const cartella = join(SERVICES_DIR, servizio.id);
  if (!existsSync(cartella)) {
    throw new Error(`Il motore "${servizio.id}" non è installato in ${cartella}.`);
  }

  if (await occupata(servizio.port)) {
    throw new Error(
      `La porta ${servizio.port} è già occupata da un altro programma — di solito un ComfyUI ` +
        "rimasto acceso da prima. Chiudilo e riprova.",
    );
  }

  // Se muore, l'app **non** va segnata come rotta: il suo motore vero sta
  // girando e la finestra funziona ancora — a mancare è solo la strada che
  // passava di qui, e chi la stava usando se ne accorge da solo perché il
  // motore smette di rispondere. Qui resta scritto nel log, che è il posto in
  // cui si va a cercare il perché.
  const log = createLogger(servizio.id);
  await accendi(id, servizio, cartella, new Set([id]), (motivo) => {
    log.write(`motore in più di ${id} caduto: ${motivo}\n`, true);
  });
  return `http://127.0.0.1:${servizio.port}`;
}

/**
 * Accende il motore dell'app, se ne ha uno, e torna quando risponde a `/health`.
 *
 * Può volerci più di un minuto: MiniMax Music 3 carica 5,5 GB di pesi prima di
 * dire che è pronto. Chi chiama deve aver già messo la scheda in "in-avvio".
 */
export async function avvia(id: AppId, onFatal: (motivo: string) => void): Promise<void> {
  const servizio = APPS[id].service;
  if (!servizio) return;

  const gia = accesi.get(servizio.id);
  if (gia) {
    gia.utenti.add(id);
    // Se un'altra app lo sta ancora avviando si aspetta quello, invece di
    // lanciarne un secondo sulla stessa porta.
    return gia.avvio;
  }

  if (!existsSync(PYTHON_EXE)) {
    throw new Error("Manca l'ambiente Python della suite: installalo dall'hub prima di aprire l'app.");
  }

  const cartella = join(SERVICES_DIR, servizio.id);
  if (!existsSync(cartella)) {
    throw new Error(`Il motore "${servizio.id}" non è installato in ${cartella}.`);
  }

  if (await occupata(servizio.port)) {
    throw new Error(
      `La porta ${servizio.port} è già occupata da un altro programma — di solito un ComfyUI ` +
        "rimasto acceso da prima. Chiudilo e riprova.",
    );
  }

  await accendi(id, servizio, cartella, new Set([id]), onFatal);
}

/**
 * Riavvia il motore di quest'app, se sta girando.
 *
 * Serve dopo aver installato un nodo custom: ComfyUI carica i nodi una volta
 * sola, all'avvio, quindi un nodo arrivato mentre lavorava per lui non esiste.
 * Le app che stanno usando questo motore restano segnate come sue: chi ha la
 * finestra aperta vede il pallino tornare verde da solo dopo qualche secondo.
 *
 * A motore spento non fa niente, ed è giusto così: il prossimo avvio troverà il
 * nodo al suo posto.
 */
export async function riavvia(id: AppId): Promise<void> {
  const servizio = APPS[id].service;
  if (!servizio) return;

  const voce = accesi.get(servizio.id);
  if (!voce) return;

  const utenti = new Set(voce.utenti);
  const onFatal = voce.onFatal;

  accesi.delete(servizio.id);
  await voce.supervisore.stop();

  await accendi(id, servizio, join(SERVICES_DIR, servizio.id), utenti, onFatal);
}

/** Crea il supervisore, lo mette in elenco e aspetta che il motore risponda. */
async function accendi(
  id: AppId,
  servizio: AppService,
  cartella: string,
  utenti: Set<AppId>,
  onFatal: (motivo: string) => void,
): Promise<void> {
  const supervisore = new ProcessSupervisor({
    name: servizio.id,
    pythonExecutable: PYTHON_EXE,
    // L'entry può essere un file o un modulo (`-m qualcosa`): quello che c'è
    // scritto nel catalogo finisce nella riga di comando così com'è.
    args: servizio.entry.split(/\s+/).filter(Boolean),
    cwd: cartella,
    healthUrl: `http://127.0.0.1:${servizio.port}/health`,
    shutdownUrl: `http://127.0.0.1:${servizio.port}/shutdown`,
    env: ambiente(id, servizio),
    logger: createLogger(servizio.id),
    healthTimeoutMs: servizio.healthTimeoutMs,
    onFatal,
  });

  const voce: Acceso = {
    supervisore,
    utenti,
    avvio: supervisore.start(),
    onFatal,
  };
  accesi.set(servizio.id, voce);

  try {
    await voce.avvio;
  } catch (err) {
    // Un motore che non è partito non deve restare in elenco come acceso:
    // il tentativo dopo troverebbe una voce viva e non riproverebbe mai.
    accesi.delete(servizio.id);
    await supervisore.stop().catch(() => {});
    throw err;
  }
}

/**
 * Spegne i motori dell'app — il suo e quelli chiesti in più — se non servono
 * più a nessun'altra.
 *
 * Anche quelli in più: chiudere DaProdDream dopo aver sognato con Anima deve
 * lasciare la GPU libera, non un ComfyUI acceso che nessuno ha più aperto.
 */
export async function ferma(id: AppId): Promise<void> {
  for (const servizio of tuttiIServizi(id)) {
    const voce = accesi.get(servizio.id);
    if (!voce) continue;

    voce.utenti.delete(id);
    if (voce.utenti.size > 0) continue;

    accesi.delete(servizio.id);
    await voce.supervisore.stop();
  }
}

/** Vero se il motore di quest'app sta girando. */
export function acceso(id: AppId): boolean {
  const servizio = APPS[id].service;
  return servizio ? (accesi.get(servizio.id)?.supervisore.running ?? false) : false;
}

/**
 * Se la porta è già di qualcun altro.
 *
 * Senza questo controllo il motore parte, trova la porta occupata, muore in due
 * secondi e il supervisore lo riavvia tre volte prima di arrendersi: l'utente
 * aspetta e legge "non ha risposto entro 180 secondi", che è vero ma non aiuta.
 * Il caso capita davvero, perché un ComfyUI avviato a mano resta acceso.
 */
function occupata(porta: number): Promise<boolean> {
  return new Promise((resolve) => {
    const prova = createServer();
    prova.once("error", () => resolve(true));
    prova.once("listening", () => prova.close(() => resolve(false)));
    prova.listen(porta, "127.0.0.1");
  });
}

/**
 * Quello che il motore deve sapere del mondo, passato come ambiente.
 *
 * Non come argomenti: i flag di ComfyUI non somigliano a quelli di SoulX, e la
 * `ServiceConfig` deve restare uguale per tutti. Ogni motore legge da qui quello
 * che gli serve e ignora il resto.
 */
function ambiente(id: AppId, servizio: AppService): NodeJS.ProcessEnv {
  const temporanei = join(CACHE_DIR, servizio.id);
  mkdirSync(temporanei, { recursive: true });

  return {
    ...process.env,
    // Senza questo lo stdout di Python arriva a blocchi da 8 KB: quando un
    // motore muore in avvio, il log si ferma prima della riga che spiega perché.
    PYTHONUNBUFFERED: "1",
    /**
     * **Il log parla italiano, quindi parla UTF-8.**
     *
     * Senza questa riga lo stdout di un servizio Python su Windows è `cp1252`, e
     * `cp1252` non sa scrivere né `→` né mezzo alfabeto: scriverci una riga di
     * log alza un `UnicodeEncodeError` *dentro* `logging`, che è l'ultimo posto
     * dove uno se lo aspetta.
     *
     * Non è un difetto teorico. È il motivo per cui la prima traduzione di ogni
     * sessione non rispondeva mai: il traduttore si caricava, riusciva, e poi
     * moriva sulla riga «traduttore italiano→inglese pronto» — e chi aspettava
     * la risposta aspettava per sempre. Vedi `services/comfy/nodi/daprod_ponte`.
     *
     * Sta qui e non in un motore solo perché il difetto non era di quel motore:
     * era di qualunque servizio scriva una parola accentata nel proprio log.
     * `PYTHONUTF8` fa la stessa cosa per i file che i servizi aprono senza dire
     * l'encoding — l'altra metà dello stesso guaio.
     *
     * Dall'altra parte del tubo `logging.ts` fa già `chunk.toString()`, che in
     * Node vuol dire UTF-8: fino a oggi ogni accento nei log arrivava storto.
     */
    PYTHONIOENCODING: "utf-8",
    PYTHONUTF8: "1",
    // Quanto spingere: il motore la legge e ne ricava i propri flag. Passata
    // come ambiente e non come argomento perché la ServiceConfig è uguale per
    // tutti i motori e non deve sapere cosa significhi per ognuno.
    DAPROD_VELOCITA: impostazioni().velocita,
    // Quanta memoria video lasciargli prendere. Come la velocità: il motore la
    // legge e ne ricava i propri flag, perché cosa voglia dire "leggero" per
    // ComfyUI e per il motore di Dream non è la stessa cosa.
    DAPROD_PROFILO: impostazioni().profilo,
    DAPROD_MODELLI: MODELS_DIR,
    DAPROD_RISULTATI: libreria.cartella(id),
    DAPROD_TEMPORANEI: temporanei,
    DAPROD_PORTA: String(servizio.port),
    // Serve a chi la propria pagina se la serve da solo (DaProdDream): gli
    // altri motori la ignorano.
    DAPROD_INTERFACCIA: cartellaApp(id),
    /**
     * Le librerie che questo motore vuole in una versione diversa da quella
     * comune, se ne ha dichiarate (`services/<id>/requisiti-privati.txt`).
     *
     * Si passa il percorso e basta: **e' il motore** a metterselo davanti a
     * `sys.path`, e nessun altro processo lo fa. Cosi' DaProdVoce puo' girare su
     * transformers 4.57 mentre gli altri cinque restano sulla 5.15, senza che
     * l'ambiente condiviso cambi di una riga.
     */
    ...(existsSync(cartellaLibreriePrivate(servizio.id))
      ? { DAPROD_LIBRERIE_PRIVATE: cartellaLibreriePrivate(servizio.id) }
      : {}),
    ...(servizio.engine ? { DAPROD_MOTORE: join(ENGINES_DIR, servizio.engine) } : {}),
  };
}
