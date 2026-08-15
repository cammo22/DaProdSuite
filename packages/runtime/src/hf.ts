/**
 * Scaricamento di un repo HuggingFace intero.
 *
 * Alcuni modelli non sono un file solo: SD-Turbo è una pipeline diffusers fatta
 * di dieci file fra pesi, configurazioni e tokenizer, e SoulX ne ha ancora di
 * più. Per quelli si chiama `snapshot_download` di `huggingface_hub`, che è già
 * nell'ambiente condiviso e sa fare due cose che rifare a mano non conviene:
 * prendere solo i file che corrispondono a `include`/`exclude`, e riprendere un
 * repo lasciato a metà senza riscaricare quello che c'è già.
 *
 * **Si usa la libreria e non il comando `hf`**, e non è un dettaglio: `hf` esiste
 * solo da `huggingface-hub` 1.0 in poi, ma `transformers` — che ComfyUI si porta
 * dietro — pretende `huggingface-hub<1.0`. Nell'ambiente unico della suite non
 * possono starci tutti e due, mentre `snapshot_download` c'è in tutte e due le
 * versioni e si chiama allo stesso modo.
 *
 * L'avanzamento non si legge dall'output: `huggingface_hub` disegna barre `tqdm`
 * con i ritorni a capo, e interpretarle sarebbe un parser da mantenere a ogni
 * loro aggiornamento. Si guarda invece quanto pesa la cartella, ogni due
 * secondi: è lo stesso numero, misurato dove non può mentire.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { run } from "./exec";

export interface ScaricaRepoOptions {
  /** `python.exe` dell'ambiente condiviso. */
  pythonExe: string;
  /** Es. `stabilityai/sd-turbo`. */
  repo: string;
  /** Cartella di destinazione, già assoluta. */
  destinazione: string;
  /** Byte attesi una volta applicati include/exclude. */
  bytes: number;
  include?: string[];
  exclude?: string[];
  segnale?: AbortSignal;
  onAvanzamento?: (avanzamento: { fatti: number; totale: number }) => void;
  onLine?: (riga: string) => void;
}

/**
 * Le opzioni arrivano come JSON in un argomento solo: percorsi con spazi e
 * pattern con asterischi non devono passare per nessuna riga di comando che
 * qualcuno possa reinterpretare.
 */
const PROGRAMMA = `
import json, sys
from huggingface_hub import snapshot_download

c = json.loads(sys.argv[1])
snapshot_download(
    repo_id=c["repo"],
    local_dir=c["destinazione"],
    allow_patterns=c.get("include") or None,
    ignore_patterns=c.get("exclude") or None,
    max_workers=4,
)
print("[daprod] " + c["repo"] + " scaricato.")
`;

const INTERVALLO_MISURA_MS = 2000;

/** Mezz'ora per i repo piccoli non basta: SoulX sono 8 GB. */
const TIMEOUT_MS = 4 * 60 * 60_000;

export async function scaricaRepo(options: ScaricaRepoOptions): Promise<void> {
  const { pythonExe, repo, destinazione, bytes, include, exclude, segnale } = options;
  const { onAvanzamento, onLine } = options;

  const misura = setInterval(() => {
    void pesoCartella(destinazione).then((fatti) => onAvanzamento?.({ fatti, totale: bytes }));
  }, INTERVALLO_MISURA_MS);

  try {
    await run(
      pythonExe,
      ["-c", PROGRAMMA, JSON.stringify({ repo, destinazione, include, exclude })],
      {
        segnale,
        timeoutMs: TIMEOUT_MS,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          // Le barre di avanzamento finirebbero nel log della suite riga per riga.
          HF_HUB_DISABLE_PROGRESS_BARS: "1",
          HF_HUB_DISABLE_TELEMETRY: "1",
        },
        onLine: (riga) => onLine?.(riga),
      },
    );
  } finally {
    clearInterval(misura);
  }

  const finale = await pesoCartella(destinazione);
  onAvanzamento?.({ fatti: finale, totale: bytes });

  // La stessa soglia di `isModelPresent`: sotto il 95% dell'atteso il repo non
  // è completo, e vale la pena dirlo adesso invece che al primo caricamento.
  if (finale < bytes * 0.95) {
    throw new Error(
      `${repo} è arrivato a ${(finale / 1024 ** 3).toFixed(2)} GB invece di ` +
        `${(bytes / 1024 ** 3).toFixed(2)}: manca qualcosa.`,
    );
  }
}

export async function pesoCartella(cartella: string): Promise<number> {
  let totale = 0;
  let voci;
  try {
    voci = await readdir(cartella, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const voce of voci) {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) totale += await pesoCartella(percorso);
    else if (voce.isFile()) {
      try {
        totale += (await stat(percorso)).size;
      } catch {
        // Un file che sparisce mentre lo misuriamo è normale: si sta scrivendo.
      }
    }
  }
  return totale;
}
