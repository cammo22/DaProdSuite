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

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { run } from "./exec";
import { ensureUv } from "./uv";

const execFileAsync = promisify(execFile);

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
  const conNvidia = await schedaNvidiaPresente();
  passo(
    3,
    conNvidia
      ? "Installo PyTorch con CUDA (circa 3 GB, ci vuole qualche minuto)"
      : "Nessuna scheda NVIDIA: installo PyTorch per CPU (circa 400 MB)",
  );
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
      // `auto` legge il driver e su una NVIDIA porta alla build CUDA giusta —
      // sulla 4060 torch 2.13 + cu130. Vedi `schedaNvidiaPresente` per il
      // perché non lo usiamo sempre.
      conNvidia ? "--torch-backend=auto" : "--torch-backend=cpu",
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

/**
 * C'è una scheda NVIDIA su questa macchina?
 *
 * **Perché non basta `--torch-backend=auto`.** Su un PC senza NVIDIA ma con la
 * grafica integrata Intel, uv sceglie da solo la build **XPU**: misurato il 18
 * agosto 2026 su una macchina sola-CPU, dove ha installato `torch 2.13.0+xpu`
 * insieme a un giro e mezzo di GB di runtime Intel (`mkl` 172 MB, `triton-xpu`
 * 366 MB, `intel-opencl-rt` 109 MB...). E non serviva a niente: il motore poi
 * scriveva *«XPU device count is zero!»*, cioè quella build non aveva nessun
 * dispositivo da usare — era un torch per CPU con un chilo e mezzo di zavorra.
 *
 * Quindi si decide qui: NVIDIA sì → `auto`, che è quello che vogliamo; NVIDIA
 * no → `cpu`, esplicito. Chi un giorno avrà una Arc discreta vera la
 * riconosceremo allora, con una prova in mano invece che a indovinare.
 *
 * `nvidia-smi` è il metro giusto perché è quello che installa il driver: c'è se
 * e solo se una NVIDIA è utilizzabile. Se manca, il comando non esiste e questa
 * funzione torna `false` senza fare rumore.
 */
async function schedaNvidiaPresente(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      ["--query-gpu=name", "--format=csv,noheader"],
      { timeout: 15_000 },
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
