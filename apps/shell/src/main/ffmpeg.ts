/**
 * Dov'è FFmpeg, se c'è.
 *
 * **Perché sta qui e non dentro il Visualizer, dove è nato.** Fino alla 0.7.5
 * lo cercava solo la transcodifica del Visualizer, e stava lì. Dalla 0.7.6 lo
 * usano in tre — la transcodifica, il fotogramma di anteprima di un video, la
 * copertina cucita dentro un brano — e la ricerca del binario è la stessa: se
 * restasse dentro una scheda, le altre due la importerebbero da lì, cioè
 * dipenderebbero da una scheda per una cosa che non è di nessuna scheda.
 *
 * **Non viene imbarcato nell'installer**, e non è una dimenticanza: FFmpeg è
 * GPL e la suite è MIT. Si usa quello che l'utente ha, e se non ce l'ha le
 * funzioni che lo richiedono si dichiarano assenti invece di fallire a metà.
 */

import { existsSync } from "node:fs";
import { delimiter, join, sep } from "node:path";

let risolto: string | null | undefined;

/** Il percorso di `ffmpeg.exe`, o null se su questo computer non c'è. */
export function findFfmpeg(): string | null {
  if (risolto !== undefined) return risolto;

  const candidati = [
    join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
  ];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir) candidati.push(join(dir, "ffmpeg.exe"));
  }

  risolto = null;
  for (const candidato of candidati) {
    if (candidato.includes(sep) && existsSync(candidato)) {
      risolto = candidato;
      break;
    }
  }
  return risolto;
}

/** Vero se su questo computer si può contare su FFmpeg. */
export const cEffmpeg = (): boolean => findFfmpeg() !== null;
