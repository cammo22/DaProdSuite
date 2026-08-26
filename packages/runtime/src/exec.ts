/**
 * Esecuzione di comandi esterni con l'output riga per riga.
 *
 * Installare torch scarica ~3 GB e dura minuti: senza vedere cosa sta facendo,
 * l'utente pensa che si sia bloccato. Per questo ogni riga di output risale
 * fino all'interfaccia invece di finire in un buffer.
 */

import { execFileSync, spawn, type ChildProcess } from "node:child_process";

/**
 * Chi tiene il conto dei processi che apriamo, se qualcuno lo tiene.
 *
 * Questo pacchetto non sa niente di Electron né di dove stiano i dati
 * dell'utente: non può scriverselo da solo. Lo shell, che lo sa, si registra
 * qui una volta all'avvio — e da quel momento anche `pip`, `uv` e `powershell`
 * finiscono nel libro dei processi insieme ai motori. Serve perché un
 * `uv pip install` di torch dura minuti: se la suite si chiude in mezzo, quel
 * processo resta a scrivere dentro l'ambiente Python di nessuno.
 *
 * Torna la funzione da chiamare quando il comando è finito.
 */
export type Sorveglianza = (figlio: ChildProcess, comando: string) => () => void;

let sorveglia: Sorveglianza | null = null;

/** Lo shell dice chi tiene il libro. `null` lo stacca. */
export function sorvegliaProcessi(chi: Sorveglianza | null): void {
  sorveglia = chi;
}

/**
 * Ammazza un processo **e i suoi figli**.
 *
 * `child.kill()` su Windows uccide solo chi abbiamo lanciato noi. Un
 * `uv pip install` lancia a sua volta il compilatore, e quello sopravviveva al
 * padre: è uno dei processi che restavano in giro. `taskkill /T` scende per
 * tutto l'albero.
 */
function ammazzaAlbero(figlio: ChildProcess): void {
  const pid = figlio.pid;
  if (!pid) return;
  if (process.platform !== "win32") {
    figlio.kill("SIGKILL");
    return;
  }
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      timeout: 5000,
      windowsHide: true,
    });
  } catch {
    figlio.kill();
  }
}

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Chiamata per ogni riga completa di stdout o stderr. */
  onLine?: (line: string, isError: boolean) => void;
  /** Oltre questo tempo il comando viene ucciso. */
  timeoutMs?: number;
  /**
   * Per annullare: il processo viene ucciso e la promessa rifiutata. Serve a chi
   * lancia comandi lunghi — `hf download` di un repo da 8 GB può durare mezz'ora,
   * e l'utente deve poter cambiare idea senza chiudere la suite.
   */
  segnale?: AbortSignal;
}

export class CommandError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    /** Ultime righe di output: quasi sempre contengono il motivo vero. */
    readonly tail: string[],
  ) {
    super(message);
    this.name = "CommandError";
  }
}

export async function run(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<void> {
  const { cwd, env, onLine, timeoutMs, segnale } = options;

  if (segnale?.aborted) throw new CommandError(`${command} annullato.`, null, []);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true });
    const dimentica = sorveglia?.(child, command) ?? (() => {});

    // Le ultime righe servono al messaggio d'errore: tenerle tutte per un
    // comando che stampa migliaia di righe sarebbe solo memoria sprecata.
    const tail: string[] = [];
    const pushTail = (line: string) => {
      tail.push(line);
      if (tail.length > 40) tail.shift();
    };

    const timer = timeoutMs
      ? setTimeout(() => {
          ammazzaAlbero(child);
          reject(
            new CommandError(
              `${command} non è finito entro ${Math.round(timeoutMs / 1000)}s.`,
              null,
              tail,
            ),
          );
        }, timeoutMs)
      : null;

    let annullato = false;
    const interrompi = () => {
      annullato = true;
      ammazzaAlbero(child);
    };
    segnale?.addEventListener("abort", interrompi, { once: true });

    for (const [stream, isError] of [
      [child.stdout, false],
      [child.stderr, true],
    ] as const) {
      let resto = "";
      stream?.on("data", (chunk: Buffer) => {
        // I chunk non arrivano allineati alle righe: si tiene da parte la coda
        // incompleta e la si unisce al chunk successivo.
        const testo = resto + chunk.toString();
        const righe = testo.split(/\r?\n/);
        resto = righe.pop() ?? "";
        for (const riga of righe) {
          if (!riga.trim()) continue;
          pushTail(riga);
          onLine?.(riga, isError);
        }
      });
      stream?.on("end", () => {
        if (resto.trim()) {
          pushTail(resto);
          onLine?.(resto, isError);
        }
      });
    }

    const finito = () => {
      if (timer) clearTimeout(timer);
      segnale?.removeEventListener("abort", interrompi);
      dimentica();
    };

    child.on("error", (err) => {
      finito();
      reject(new CommandError(`Impossibile eseguire ${command}: ${err.message}`, null, tail));
    });

    child.on("close", (code) => {
      finito();
      // Ucciso da noi: il codice d'uscita è quello di un processo terminato a
      // forza, e non significa che il comando sia fallito.
      if (annullato) reject(new CommandError(`${command} annullato.`, code, tail));
      else if (code === 0) resolve();
      else reject(new CommandError(`${command} è uscito con codice ${code}.`, code, tail));
    });
  });
}

/** Come `run`, ma restituisce stdout invece di trasmetterlo. */
export async function capture(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<string> {
  let out = "";
  await run(command, args, {
    ...options,
    onLine: (line, isError) => {
      if (!isError) out += line + "\n";
      options.onLine?.(line, isError);
    },
  });
  return out.trim();
}
