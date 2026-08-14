/**
 * Log su file, uno per componente, in %LOCALAPPDATA%\DaProdSuite\logs.
 *
 * Serve soprattutto ai servizi Python: quando un motore non parte, la ragione è
 * nel suo stdout, e senza questo finirebbe nel nulla perché il processo figlio
 * è avviato con windowsHide.
 */

import { createWriteStream, type WriteStream } from "node:fs";
import { join } from "node:path";
import { LOGS_DIR } from "./paths";

export interface ServiceLogger {
  write(chunk: Buffer | string, isError: boolean): void;
  close(): void;
}

export function createLogger(name: string): ServiceLogger {
  let stream: WriteStream | null = createWriteStream(join(LOGS_DIR, `${name}.log`), {
    flags: "a",
  });

  return {
    write(chunk, isError) {
      const text = chunk.toString();
      if (isError) process.stderr.write(`[${name}] ${text}`);
      else process.stdout.write(`[${name}] ${text}`);
      stream?.write(text);
    },
    close() {
      stream?.end();
      stream = null;
    },
  };
}
