/**
 * Il libro dei processi: chi abbiamo acceso, e come si spegne davvero.
 *
 * **Il difetto che questo file esiste per curare, detto da chi lo subiva:**
 * «a volte quando si apre e chiude rimangono circa 4 processi in background,
 * ogni volta per farlo ripartire devo andare nel terminale e terminare quei
 * processi». Ed era vero, per due ragioni che si sommavano.
 *
 * **1. `child.kill()` su Windows uccide un processo, non una famiglia.** Il
 * supervisore ammazzava `python.exe`, e `python.exe` moriva davvero — ma
 * ComfyUI apre i suoi lavoratori, `uv` apre il suo compilatore, e quei figli
 * restavano orfani con la VRAM in mano. Su Windows la strada giusta è una
 * sola: `taskkill /T`, che scende per tutto l'albero.
 *
 * **2. Se la suite muore male, nessuno spegne niente.** Un crash, un «termina
 * attività» dal Gestione attività, un aggiornamento che va storto: il codice di
 * chiusura non gira, e quei processi restano lì fino al riavvio del computer.
 * Ecco perché serviva il terminale.
 *
 * Da qui le due metà di questo file:
 *
 * - **si scrive chi apriamo**, subito, in un file di testo (`processi.json`);
 * - **al prossimo avvio si legge quel file** e si ammazza quello che è rimasto,
 *   *prima* di aprire qualunque cosa. È la ragione per cui non serve più il
 *   terminale: la pulizia la fa la suite, non tu.
 *
 * ## Il PID riciclato, e perché non ammazziamo il browser di nessuno
 *
 * Un numero di processo si riusa. Se scriviamo «4312 era il nostro python» e
 * poi il computer si riavvia, il 4312 di domani può essere qualunque cosa —
 * Word, Chrome, l'antivirus. Per questo accanto al numero si scrive **il nome
 * dell'eseguibile**, e prima di ammazzare si chiede a Windows chi è il 4312
 * adesso: se non è quel nome, si lascia stare e si toglie dal libro.
 *
 * Non è paranoia teorica: è l'unico modo di rendere sicura una pulizia
 * automatica all'avvio, e senza quella pulizia questo file non risolverebbe
 * niente.
 */

import { execFileSync, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DATA_ROOT } from "./paths";
import { createLogger } from "./logging";

const log = createLogger("processi");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Il libro: sta accanto alle impostazioni e sopravvive alla suite. */
const LIBRO = join(DATA_ROOT, "processi.json");

/** Una riga del libro: il numero, e chi dovrebbe essere. */
interface Segnato {
  pid: number;
  /** Il nome dell'eseguibile, es. "python.exe". Serve a non uccidere un omonimo. */
  immagine: string;
  /** A cosa serviva: finisce nel log quando lo ammazziamo. */
  che: string;
  quando: number;
}

/** Quello che è vivo adesso, in questa sessione. */
const vivi = new Map<number, Segnato>();

/* --------------------------------------------------------------- il libro */

function leggiLibro(): Segnato[] {
  if (!existsSync(LIBRO)) return [];
  try {
    const dentro = JSON.parse(readFileSync(LIBRO, "utf8")) as unknown;
    if (!Array.isArray(dentro)) return [];
    return dentro.filter(
      (r): r is Segnato =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as Segnato).pid === "number" &&
        typeof (r as Segnato).immagine === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Riscrive il libro con quello che è vivo adesso.
 *
 * Scritto **a ogni cambiamento** e in modo sincrono: se la suite muore
 * nell'istante dopo aver aperto un motore, quel motore deve essere già scritto.
 * Sono poche righe di JSON, non costa niente, ed è tutta la differenza fra una
 * pulizia che funziona e una che arriva tardi.
 */
function scriviLibro(): void {
  try {
    writeFileSync(LIBRO, `${JSON.stringify([...vivi.values()], null, 2)}\n`, "utf8");
  } catch {
    // Non poter scrivere il libro non deve impedire di aprire un motore: si
    // perde la pulizia al prossimo avvio, non la sessione di adesso.
  }
}

/* ------------------------------------------------------------ registrare */

/**
 * Prende in carico un processo figlio.
 *
 * Torna la funzione da chiamare quando è morto per conto suo — chi registra la
 * aggancia a `close`, e da lì in poi il numero non sta più nel libro.
 */
export function registra(figlio: ChildProcess, che: string): () => void {
  const pid = figlio.pid;
  if (!pid) return () => {};

  const riga: Segnato = {
    pid,
    immagine: immagineDi(figlio),
    che,
    quando: Date.now(),
  };
  vivi.set(pid, riga);
  scriviLibro();
  annota(`aperto ${riga.immagine} pid ${pid} — ${che}`);

  const dimentica = (): void => {
    if (vivi.delete(pid)) scriviLibro();
  };
  figlio.once("close", dimentica);
  return dimentica;
}

/**
 * Il nome dell'eseguibile di un figlio.
 *
 * `spawnfile` è quello che Node ha davvero lanciato: può essere un percorso
 * intero (`…\runtime\Scripts\python.exe`) o un nome nudo (`powershell.exe`). Si
 * tiene solo l'ultimo pezzo, che è quello che poi Windows ci risponderà quando
 * gli chiederemo chi è quel numero.
 */
function immagineDi(figlio: ChildProcess): string {
  const lanciato = (figlio as ChildProcess & { spawnfile?: string }).spawnfile ?? "";
  const nudo = basename(lanciato);
  if (!nudo) return "";
  return process.platform === "win32" && !nudo.toLowerCase().endsWith(".exe")
    ? `${nudo}.exe`
    : nudo;
}

/* -------------------------------------------------------------- uccidere */

/**
 * Ammazza un processo **e tutti i suoi figli**.
 *
 * Su Windows lo sa fare solo `taskkill /T`: mandare un segnale al padre lascia
 * i figli in vita, ed è esattamente il difetto che si vedeva. Altrove si
 * ammazza il gruppo, che è la stessa idea scritta in un altro alfabeto.
 *
 * Sincrono di proposito: gira mentre la suite sta chiudendo, cioè nel momento
 * in cui una promessa che non si risolve vuol dire un processo che resta.
 */
export function uccidiAlbero(pid: number): void {
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        timeout: 5000,
        windowsHide: true,
      });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    // Già morto, o non nostro: in tutti e due i casi non c'è niente da fare.
  }
}

/**
 * Chi è, adesso, il processo numero `pid`? Vuoto se non c'è più.
 *
 * `tasklist` con un filtro sul PID: se il numero non esiste stampa una frase di
 * cortesia invece di una tabella, e la si riconosce dal fatto che il nome che
 * cerchiamo non c'è dentro.
 */
function immagineViva(pid: number): string {
  if (process.platform !== "win32") return "";
  try {
    const uscita = spawnSync(
      "tasklist",
      ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
      { encoding: "utf8", timeout: 5000, windowsHide: true },
    );
    const riga = (uscita.stdout ?? "").trim();
    // "python.exe","4312","Console","1","512.000 K"
    const nome = /^"([^"]+)"/.exec(riga)?.[1];
    return nome ?? "";
  } catch {
    return "";
  }
}

/* ------------------------------------------------------- la pulizia vera */

/**
 * Spegne tutto quello che abbiamo aperto in questa sessione.
 *
 * La chiama la chiusura della suite **dopo** aver provato la via educata
 * (`/shutdown` sui motori, che salvano quello che stanno facendo). Questa è la
 * rete sotto: quello che a quel punto è ancora vivo, non lo sarà più.
 */
export function uccidiTutti(): void {
  const quali = [...vivi.values()];
  if (!quali.length) {
    scriviLibro();
    return;
  }
  annota(`chiusura: restano ${quali.length} processi, li spengo`);
  for (const riga of quali) {
    annota(`ammazzo ${riga.immagine} pid ${riga.pid} — ${riga.che}`);
    uccidiAlbero(riga.pid);
    vivi.delete(riga.pid);
  }
  scriviLibro();
}

/**
 * All'avvio: ammazza quello che è avanzato dalla volta scorsa.
 *
 * **È il pezzo che toglie di mezzo il terminale.** Se la sessione precedente è
 * finita bene, il libro è vuoto e questa funzione non fa niente. Se è finita
 * male, qui dentro ci sono i numeri dei motori rimasti, e si spengono prima che
 * la suite provi ad aprire le stesse porte.
 *
 * Il controllo sul nome dell'eseguibile non è un dettaglio: un numero di
 * processo si ricicla, e senza quel controllo un riavvio del computer basterebbe
 * a farci ammazzare un programma di qualcun altro.
 */
export function ripulisciAvanzi(): number {
  const avanzi = leggiLibro();
  if (!avanzi.length) return 0;

  let spenti = 0;
  for (const riga of avanzi) {
    const adesso = immagineViva(riga.pid);
    if (!adesso) continue;
    if (riga.immagine && adesso.toLowerCase() !== riga.immagine.toLowerCase()) {
      annota(
        `pid ${riga.pid} adesso è ${adesso}, non ${riga.immagine}: non è nostro, lo lascio stare`,
      );
      continue;
    }
    annota(`avanzo dalla volta scorsa: ${adesso} pid ${riga.pid} (${riga.che}) — lo spengo`);
    uccidiAlbero(riga.pid);
    spenti += 1;
  }

  vivi.clear();
  scriviLibro();
  return spenti;
}

/** Quanti processi stiamo tenendo aperti adesso: lo mostra il pannello. */
export const quantiAperti = (): number => vivi.size;

/** Cosa teniamo aperto, per raccontarlo a chi guarda il pannello. */
export const apertiAdesso = (): { immagine: string; che: string; pid: number }[] =>
  [...vivi.values()].map((r) => ({ immagine: r.immagine, che: r.che, pid: r.pid }));
