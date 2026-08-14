/**
 * Creazione dell'ambiente Python condiviso.
 *
 * Prima di questa suite le sei app avevano quattro ambienti separati con quattro
 * versioni diverse di torch, per 14,7 GB di roba quasi identica. Qui se ne crea
 * uno solo e lo usano tutti i motori.
 *
 * Il procedimento ricalca `MinimaxMusica/setup.ps1`, che è già collaudato: uv
 * crea il venv scaricandosi Python 3.12 (quello di sistema è il 3.14 e non ha
 * ancora le wheel di torch), poi installa torch lasciando che uv scelga la build
 * CUDA giusta per il driver presente.
 *
 * È ripetibile: se lo interrompi e lo rilanci, uv salta ciò che è già a posto.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { run } from "./exec";
import { ensureUv } from "./uv";

/** Versione di Python dell'ambiente. Fissata: non si eredita quella di sistema. */
export const PYTHON_VERSION = "3.12";

export interface InstallProgress {
  /** Passo corrente, da 1 a `total`. */
  step: number;
  total: number;
  /** Cosa sta succedendo, in italiano, mostrabile così com'è. */
  label: string;
}

export interface InstallOptions {
  /** Cartella del venv: %LOCALAPPDATA%\DaProdSuite\runtime */
  runtimeDir: string;
  /** Dove tenere uv se va scaricato. */
  toolsDir: string;
  /** Percorso di `requirements/base.txt`. */
  baseRequirements: string;
  onProgress?: (progress: InstallProgress) => void;
  onLine?: (line: string) => void;
}

const TOTAL_STEPS = 4;

export async function installRuntime(options: InstallOptions): Promise<void> {
  const { runtimeDir, toolsDir, baseRequirements, onProgress, onLine } = options;
  const python = join(runtimeDir, "Scripts", "python.exe");

  const passo = (step: number, label: string) => {
    onProgress?.({ step, total: TOTAL_STEPS, label });
    onLine?.(`==> ${label}`);
  };

  /* 1 — uv ------------------------------------------------------------------ */
  passo(1, "Preparo gli strumenti di installazione");
  const uv = await ensureUv({ toolsDir, onLine });

  /* 2 — ambiente ------------------------------------------------------------ */
  passo(2, `Creo l'ambiente Python ${PYTHON_VERSION}`);
  if (existsSync(python)) {
    onLine?.("Ambiente già presente, lo riuso.");
  } else {
    await run(uv, ["venv", runtimeDir, "--python", PYTHON_VERSION], {
      onLine: (line) => onLine?.(line),
      timeoutMs: 10 * 60_000,
    });
  }

  /* 3 — torch --------------------------------------------------------------- */
  passo(3, "Installo PyTorch con CUDA (circa 3 GB, ci vuole qualche minuto)");
  // --torch-backend=auto fa scegliere a uv la wheel giusta leggendo il driver
  // installato: è lo stesso comando del setup di DaProdMusica, che sulla 4060
  // porta a torch 2.13 + cu130.
  await run(
    uv,
    [
      "pip",
      "install",
      "--python",
      python,
      "torch",
      "torchvision",
      "torchaudio",
      "--torch-backend=auto",
    ],
    { onLine: (line) => onLine?.(line), timeoutMs: 60 * 60_000 },
  );

  /* 4 — base ---------------------------------------------------------------- */
  passo(4, "Installo le librerie comuni ai motori");
  await run(uv, ["pip", "install", "--python", python, "-r", baseRequirements], {
    onLine: (line) => onLine?.(line),
    timeoutMs: 30 * 60_000,
  });

  onLine?.("Ambiente pronto.");
}
