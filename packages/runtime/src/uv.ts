/**
 * Reperimento di `uv`.
 *
 * uv è lo strumento con cui la suite crea l'ambiente Python e installa i
 * pacchetti. Lo usano già i tuoi `setup.ps1`, e fa una cosa che qui vale molto:
 * sa scaricare da solo l'interprete Python 3.12, quindi l'utente non deve
 * installare nulla a mano (il Python di sistema è il 3.14, che non ha ancora le
 * wheel di torch).
 *
 * Se è già nel PATH si usa quello. Altrimenti se ne scarica una copia privata
 * dentro la cartella dati della suite, senza toccare il sistema.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { capture, run } from "./exec";

/**
 * Versione fissata: un aggiornamento di uv che cambia comportamento non deve
 * poter rompere l'installazione di chi installa la suite domani.
 */
const UV_VERSION = "0.9.5";
const UV_URL = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-x86_64-pc-windows-msvc.zip`;

export interface UvOptions {
  /** Dove mettere la copia privata se serve scaricarla. */
  toolsDir: string;
  onLine?: (line: string) => void;
}

export interface InstallaRequisitiOptions {
  /** Percorso di uv, da `ensureUv`. */
  uv: string;
  /** Cartella del venv condiviso. */
  runtimeDir: string;
  /** File dei requisiti già scritto da noi. */
  requisiti: string;
  timeoutMs?: number;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
}

/**
 * `uv pip install -r`, con un secondo tentativo a `__pycache__` sgombre.
 *
 * Aggiornare un pacchetto vuol dire prima togliere quello vecchio, e su Windows
 * togliere le sue `__pycache__` a volte fallisce con "reparse point" (errore
 * 4395): sono file appena scritti da Python che il filtro dell'antivirus sta
 * ancora guardando. Le stesse cartelle si cancellano benissimo un attimo dopo,
 * e infatti sgombrarle noi e riprovare fa passare l'installazione.
 *
 * Sembra un dettaglio e non lo è: senza, l'installazione del motore si ferma in
 * fondo — dopo aver scaricato tutto — per un motivo che con i pacchetti non
 * c'entra niente, e all'utente resta un "uv è uscito con codice 2".
 *
 * I `.pyc` non sono un danno da riparare: Python li riscrive da solo la prima
 * volta che quel modulo serve.
 */
export async function installaRequisiti(options: InstallaRequisitiOptions): Promise<void> {
  const { uv, runtimeDir, requisiti, timeoutMs, segnale, onLine } = options;
  const argomenti = [
    "pip",
    "install",
    "--python",
    join(runtimeDir, "Scripts", "python.exe"),
    "-r",
    requisiti,
  ];

  try {
    await run(uv, argomenti, { segnale, onLine: (riga) => onLine?.(riga), timeoutMs });
  } catch (err) {
    if (segnale?.aborted) throw err;
    onLine?.(
      `Installazione non riuscita al primo colpo (${
        err instanceof Error ? err.message : String(err)
      }): sgombro le cache di Python e riprovo.`,
    );
    const tolte = await svuotaPycache(join(runtimeDir, "Lib", "site-packages"));
    onLine?.(`Tolte ${tolte} cartelle __pycache__.`);
    await run(uv, argomenti, { segnale, onLine: (riga) => onLine?.(riga), timeoutMs });
  }
}

/** Cancella tutte le `__pycache__` sotto una cartella. Torna quante ne ha tolte. */
async function svuotaPycache(radice: string): Promise<number> {
  let tolte = 0;
  let voci;
  try {
    voci = await readdir(radice, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const voce of voci) {
    if (!voce.isDirectory()) continue;
    const percorso = join(radice, voce.name);
    if (voce.name === "__pycache__") {
      // Se anche a noi resiste, pazienza: l'importante è averci provato prima
      // di rilanciare uv, non fare pulizia perfetta.
      await rm(percorso, { recursive: true, force: true }).then(
        () => tolte++,
        () => {},
      );
    } else {
      tolte += await svuotaPycache(percorso);
    }
  }
  return tolte;
}

/** Restituisce il percorso di un `uv` utilizzabile, scaricandolo se manca. */
export async function ensureUv({ toolsDir, onLine }: UvOptions): Promise<string> {
  const locale = join(toolsDir, "uv.exe");
  if (existsSync(locale)) return locale;

  // Se l'utente ha già uv (come su questa macchina), non se ne scarica un'altra copia.
  try {
    const versione = await capture("uv", ["--version"]);
    onLine?.(`uv già presente nel sistema: ${versione}`);
    return "uv";
  } catch {
    onLine?.("uv non trovato nel sistema, lo scarico.");
  }

  await mkdir(toolsDir, { recursive: true });
  const zip = join(toolsDir, "uv.zip");

  onLine?.(`Scarico uv ${UV_VERSION}…`);
  const risposta = await fetch(UV_URL);
  if (!risposta.ok) {
    throw new Error(`Scaricamento di uv fallito: HTTP ${risposta.status} da ${UV_URL}`);
  }
  await writeFile(zip, Buffer.from(await risposta.arrayBuffer()));

  onLine?.("Estraggo uv…");
  // Expand-Archive è in Windows di serie: evita di aggiungere una libreria di
  // decompressione solo per questo passaggio.
  await run("powershell", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${toolsDir}' -Force`,
  ]);
  await rm(zip, { force: true });

  if (!existsSync(locale)) {
    throw new Error(`uv.exe non è comparso in ${toolsDir} dopo l'estrazione.`);
  }
  onLine?.(`uv ${UV_VERSION} pronto.`);
  return locale;
}
