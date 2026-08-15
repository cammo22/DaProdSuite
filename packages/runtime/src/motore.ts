/**
 * Installazione di ComfyUI, il motore di Musica, Foto e Cinema.
 *
 * ComfyUI non sta nel repo — è GPL-3.0 e la suite è MIT — quindi finché non c'era
 * questo file bisognava mettercelo a mano, ed era l'ultima cosa che impediva a
 * `git clone` di bastare (`docs/COME-SI-LAVORA.md` § 1).
 *
 * Si scarica lo zip di una versione **fissata**, non l'ultimo commit: ComfyUI
 * cambia ogni giorno, e la suite deve installare la stessa cosa che abbiamo
 * provato, non quella di stamattina. L'aggiornamento è una decisione nostra, che
 * si prende cambiando la costante qui sotto e riprovando i motori.
 *
 * Niente `git clone`: chi installa la suite dall'installer non ha per forza git.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "./exec";
import { ensureUv } from "./uv";

/** Versione provata: 0.33.0 è quella su cui girano MiniMax Music 3 e Anima. */
export const COMFY_VERSION = "0.33.0";

const COMFY_URL = `https://github.com/Comfy-Org/ComfyUI/archive/refs/tags/v${COMFY_VERSION}.zip`;

/**
 * Pacchetti che il `requirements.txt` di ComfyUI chiede e noi togliamo.
 *
 * I due `comfyui-*` sono i modelli di flusso di esempio e la documentazione
 * dell'editor: centinaia di MB per una finestra che l'utente della suite non
 * apre mai, perché l'interfaccia è la nostra. Torch invece c'è già, installato
 * con la build CUDA giusta da `install.ts`: lasciarlo qui vorrebbe dire dare a
 * uv la possibilità di sostituirlo con una wheel qualsiasi.
 */
const DA_TOGLIERE = new Set([
  "comfyui-workflow-templates",
  "comfyui-embedded-docs",
  "torch",
  "torchvision",
  "torchaudio",
]);

export interface InstallaMotoreOptions {
  /** `%LOCALAPPDATA%\DaProdSuite\engines` */
  enginesDir: string;
  /** Cartella del venv condiviso. */
  runtimeDir: string;
  toolsDir: string;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
  /** Cosa sta succedendo, in italiano, mostrabile così com'è. */
  onPasso?: (etichetta: string) => void;
}

/** Vero se ComfyUI è già installato e utilizzabile. */
export function motorePresente(enginesDir: string): boolean {
  return existsSync(join(enginesDir, "ComfyUI", "main.py"));
}

export async function installaMotore(options: InstallaMotoreOptions): Promise<void> {
  const { enginesDir, runtimeDir, toolsDir, segnale, onLine, onPasso } = options;
  const destinazione = join(enginesDir, "ComfyUI");

  if (motorePresente(enginesDir)) {
    onLine?.("ComfyUI è già installato: non lo tocco.");
    return;
  }

  await mkdir(enginesDir, { recursive: true });

  /* 1 — lo zip ------------------------------------------------------------- */
  onPasso?.(`Scarico ComfyUI ${COMFY_VERSION}`);
  const zip = join(enginesDir, `ComfyUI-${COMFY_VERSION}.zip`);
  const risposta = await fetch(COMFY_URL, {
    signal: segnale,
    headers: { "user-agent": "DaProdSuite" },
  });
  if (!risposta.ok) {
    throw new Error(`Scaricamento di ComfyUI fallito: HTTP ${risposta.status} da ${COMFY_URL}`);
  }
  await writeFile(zip, Buffer.from(await risposta.arrayBuffer()));

  /* 2 — estrazione --------------------------------------------------------- */
  onPasso?.("Estraggo il motore");
  // In una cartella a parte: se l'estrazione si interrompe a metà non resta un
  // ComfyUI mutilato che al riavvio sembrerebbe installato.
  const provvisoria = join(enginesDir, ".estrazione");
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

  const estratta = join(provvisoria, `ComfyUI-${COMFY_VERSION}`);
  if (!existsSync(join(estratta, "main.py"))) {
    throw new Error(`Lo zip di ComfyUI non conteneva ${estratta}\\main.py.`);
  }
  await rename(estratta, destinazione);
  await rm(provvisoria, { recursive: true, force: true });
  await rm(zip, { force: true });

  /* 3 — dipendenze --------------------------------------------------------- */
  onPasso?.("Installo le librerie di ComfyUI");
  const requisiti = await scriviRequisiti(destinazione, enginesDir);
  const uv = await ensureUv({ toolsDir, onLine });
  await run(
    uv,
    ["pip", "install", "--python", join(runtimeDir, "Scripts", "python.exe"), "-r", requisiti],
    { segnale, onLine: (riga) => onLine?.(riga), timeoutMs: 60 * 60_000 },
  );

  onLine?.(`ComfyUI ${COMFY_VERSION} pronto.`);
}

/**
 * Il `requirements.txt` di ComfyUI meno quello che non ci serve, riscritto in
 * `engines/`. Sta lì e non dentro ComfyUI perché quella cartella è roba loro:
 * ci si scrive dentro solo quando la si sostituisce tutta.
 */
async function scriviRequisiti(comfyDir: string, enginesDir: string): Promise<string> {
  const originale = await readFile(join(comfyDir, "requirements.txt"), "utf8");

  const tenute = originale.split(/\r?\n/).filter((riga) => {
    const pulita = riga.trim();
    if (!pulita || pulita.startsWith("#")) return false;
    const pacchetto = pulita.split(/[=<>!~[;\s]/)[0]!.trim().toLowerCase();
    return !DA_TOGLIERE.has(pacchetto);
  });

  const percorso = join(enginesDir, "comfy-requisiti.txt");
  await writeFile(
    percorso,
    [
      `# Generato da @daprod/runtime installando ComfyUI ${COMFY_VERSION}.`,
      `# È il loro requirements.txt senza: ${[...DA_TOGLIERE].join(", ")}.`,
      "# Le modifiche a mano si perdono alla prossima installazione del motore.",
      "",
      ...tenute,
      "",
    ].join("\n"),
    "utf8",
  );
  return percorso;
}
