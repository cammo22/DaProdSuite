/**
 * Transcodifica di ripiego per i formati che Chromium non decodifica
 * (WMA, AIFF, APE, ALAC...).
 *
 * FFmpeg non viene imbarcato nell'installer: si usa quello che l'utente ha nel
 * PATH, e se non c'è la funzione si dichiara assente invece di fallire a metà
 * brano. Il Visualizer nasconde da solo le opzioni che richiedono FFmpeg quando
 * `capabilities.ffmpeg` è falso.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync, statSync, type Stats } from "node:fs";
import { join } from "node:path";
import { DATA_ROOT } from "../../paths";
import { registra } from "../../processi";
import { findFfmpeg } from "../../ffmpeg";

/**
 * La ricerca del binario **non sta più qui**, e sta bene così.
 *
 * Dalla 0.7.6 FFmpeg lo usano in tre — questa transcodifica, il fotogramma di
 * anteprima di un video e la copertina cucita dentro un brano — e cercarlo era
 * l'unica cosa che avevano in comune. Sta in `main/ffmpeg.ts`; qui si
 * ri-esporta perché il resto del Visualizer lo chiedeva a questo modulo, e non
 * c'è motivo di far cambiare riga a chi non è cambiato.
 */
export { findFfmpeg };

function cacheDir(): string {
  const dir = join(DATA_ROOT, "cache", "visualizer", "transcoded");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Converte in WAV dentro la cache e restituisce il percorso.
 *
 * La chiave è percorso + dimensione + data di modifica: se il file cambia si
 * ri-converte, se è lo stesso si riusa quello di prima.
 */
export async function transcodeToWav(source: string): Promise<string | null> {
  const binario = findFfmpeg();
  if (!binario) return null;

  let stat: Stats;
  try {
    stat = statSync(source);
  } catch {
    return null;
  }

  const chiave = createHash("sha1")
    .update(`${source}|${stat.size}|${stat.mtimeMs}`)
    .digest("hex")
    .slice(0, 16);
  const target = join(cacheDir(), `${chiave}.wav`);
  if (existsSync(target)) return target;

  // Si scrive su un file .part e si rinomina solo a conversione riuscita: così
  // un'interruzione non lascia in cache un WAV troncato che sembra valido.
  const temp = `${target}.part`;
  const ok = await new Promise<boolean>((resolve) => {
    const child = spawn(
      binario,
      ["-hide_banner", "-loglevel", "error", "-i", source, "-vn", "-c:a", "pcm_s16le", "-y", temp],
      { windowsHide: true },
    );
    registra(child, "ffmpeg (conversione audio)");
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });

  if (!ok) {
    rmSync(temp, { force: true });
    return null;
  }
  renameSync(temp, target);
  return target;
}
