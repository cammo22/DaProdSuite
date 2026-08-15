/**
 * Scaricare uno zip e aprirlo, che è il modo in cui entrano nella suite il
 * motore e i suoi nodi custom.
 *
 * Niente `git clone`: chi installa la suite dall'installer non ha per forza git,
 * e uno zip di una versione fissata è anche l'unico modo di installare
 * esattamente quello che abbiamo provato invece dell'ultimo commit.
 *
 * `Expand-Archive` è in Windows di serie: apre lo zip senza aggiungere una
 * libreria di decompressione al programma.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "./exec";

export interface ScompattaOptions {
  url: string;
  /** Cartella dove appoggiare lo zip e la cartella provvisoria. */
  lavoro: string;
  /** Nome dello zip, per ritrovarlo nel log se qualcosa va storto. */
  nome: string;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
}

/**
 * Scarica uno zip e lo apre in una cartella provvisoria, tornando dov'è finito.
 *
 * In una cartella a parte e non nella destinazione finale: se l'estrazione si
 * interrompe a metà non deve restare mezzo pacchetto che al riavvio sembrerebbe
 * installato. Chi chiama sposta al posto giusto solo a estrazione riuscita.
 */
export async function scaricaEScompatta(options: ScompattaOptions): Promise<string> {
  const { url, lavoro, nome, segnale, onLine } = options;

  await mkdir(lavoro, { recursive: true });
  const zip = join(lavoro, `${nome}.zip`);

  const risposta = await fetch(url, { signal: segnale, headers: { "user-agent": "DaProdSuite" } });
  if (!risposta.ok) {
    throw new Error(`Scaricamento fallito: HTTP ${risposta.status} da ${url}`);
  }
  await writeFile(zip, Buffer.from(await risposta.arrayBuffer()));

  const provvisoria = join(lavoro, `.estrazione-${nome}`);
  await rm(provvisoria, { recursive: true, force: true });
  await run(
    "powershell",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${provvisoria}' -Force`,
    ],
    { segnale, onLine: (riga) => onLine?.(riga), timeoutMs: 10 * 60_000 },
  );
  await rm(zip, { force: true });

  return provvisoria;
}
