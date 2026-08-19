/**
 * Rimettere in sesto l'ambiente Python condiviso, senza cancellarlo.
 *
 * **Perché serve una cosa a metà fra "niente" e "Reset tutto".** L'ambiente è
 * uno solo per sei motori, ed è la sua forza — 4 GB invece di 14,7 — ma anche il
 * punto dove installare un'app può rompere le altre. Quando succede, finora
 * c'erano due sole strade: chiedere aiuto a qualcuno che sapesse usare `uv`, o
 * premere «Reset · Tutto», che porta via anche i **35 GB di modelli** e mezza
 * giornata di scaricamenti. Nessuna delle due è una risposta.
 *
 * Qui si reinstallano i pacchetti e basta: stessi requisiti, stesse versioni,
 * file riscritti da zero. Modelli, motori, risultati e impostazioni non si
 * toccano. Dura minuti, non ore, perché uv le wheel ce le ha già in cache.
 *
 * **Le `__pycache__` si sgombrano prima, non dopo.** Su questa macchina
 * l'antivirus fa fallire la rimozione di una `__pycache__` appena scritta con
 * "reparse point" (errore 4395), ed è così che l'ambiente si era rotto: una
 * disinstallazione a metà, con i file di due versioni diverse mescolati. Farlo
 * prima toglie di mezzo la causa invece di rincorrerla al secondo tentativo.
 */

import { rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { run } from "./exec";

export interface RiparaOptions {
  /** Percorso dell'eseguibile uv. */
  uv: string;
  /** Cartella del venv: %LOCALAPPDATA%\DaProdSuite\runtime */
  runtimeDir: string;
  /**
   * I file di requisiti da reinstallare: `base.txt` più quelli dei servizi
   * delle app installate. Chi non ha IoDigitale non deve rimettersi in casa i
   * suoi pacchetti solo perché sta riparando.
   */
  requisiti: string[];
  /**
   * `requirements/versioni.txt`. Riparare senza vincoli vorrebbe dire
   * reinstallare *l'ultima* versione di tutto: si uscirebbe dalla riparazione
   * con un ambiente diverso da quello provato, che è come rimettere in piedi un
   * muro con mattoni di un'altra misura.
   */
  vincoli?: string;
  onLine?: (riga: string) => void;
  segnale?: AbortSignal;
}

/**
 * Reinstalla i pacchetti dell'ambiente condiviso.
 *
 * `--reinstall` è la parola che conta: senza, uv guarda le versioni dichiarate,
 * le trova già giuste e non fa niente — che è precisamente il caso in cui
 * l'ambiente è rotto, perché **i numeri erano a posto e i file no**.
 */
export async function riparaAmbiente(options: RiparaOptions): Promise<void> {
  const { uv, runtimeDir, requisiti, vincoli, onLine, segnale } = options;
  const python = join(runtimeDir, "Scripts", "python.exe");

  onLine?.("==> Sgombro le cache di Python");
  const tolte = await svuotaPycache(join(runtimeDir, "Lib", "site-packages"));
  onLine?.(`Tolte ${tolte} cartelle __pycache__.`);

  onLine?.("==> Reinstallo i pacchetti dell'ambiente condiviso");
  const argomenti = ["pip", "install", "--python", python, "--reinstall"];
  for (const file of requisiti) argomenti.push("-r", file);
  if (vincoli) argomenti.push("--constraint", vincoli);

  await run(uv, argomenti, {
    segnale,
    onLine: (riga) => onLine?.(riga),
    timeoutMs: 60 * 60_000,
  });

  onLine?.("Ambiente riparato.");
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
