/**
 * Esecuzione di comandi esterni con l'output riga per riga.
 *
 * Installare torch scarica ~3 GB e dura minuti: senza vedere cosa sta facendo,
 * l'utente pensa che si sia bloccato. Per questo ogni riga di output risale
 * fino all'interfaccia invece di finire in un buffer.
 */

import { spawn } from "node:child_process";

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Chiamata per ogni riga completa di stdout o stderr. */
  onLine?: (line: string, isError: boolean) => void;
  /** Oltre questo tempo il comando viene ucciso. */
  timeoutMs?: number;
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
  const { cwd, env, onLine, timeoutMs } = options;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true });

    // Le ultime righe servono al messaggio d'errore: tenerle tutte per un
    // comando che stampa migliaia di righe sarebbe solo memoria sprecata.
    const tail: string[] = [];
    const pushTail = (line: string) => {
      tail.push(line);
      if (tail.length > 40) tail.shift();
    };

    const timer = timeoutMs
      ? setTimeout(() => {
          child.kill();
          reject(
            new CommandError(
              `${command} non è finito entro ${Math.round(timeoutMs / 1000)}s.`,
              null,
              tail,
            ),
          );
        }, timeoutMs)
      : null;

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

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(new CommandError(`Impossibile eseguire ${command}: ${err.message}`, null, tail));
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve();
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
