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
 * GPL e la suite è MIT. Si usa quello che c'è già sul computer.
 *
 * **Dalla 0.8.0 però ce n'è quasi sempre uno**, e non è una contraddizione:
 * l'ambiente Python della suite installa `imageio-ffmpeg`, che se lo scarica da
 * sé sul computer di chi installa — esattamente come ComfyUI. Non lo
 * distribuiamo noi, quindi la licenza non cambia; ma smette di essere vero che
 * «chi non ha FFmpeg non ha le anteprime», che è stato il vero motivo dei
 * rettangoli neri per tre versioni di fila. Si guarda prima il PATH: se sul
 * computer c'è quello installato a mano, vince quello.
 */

import { existsSync, readdirSync } from "node:fs";
import { delimiter, join, sep } from "node:path";
import { RUNTIME_DIR } from "./paths";

let risolto: string | null | undefined;

/**
 * Dove `imageio-ffmpeg` tiene il suo FFmpeg, dentro l'ambiente della suite.
 *
 * ⚠ **Questa è la riga che fa comparire le anteprime dei video su un computer
 * che FFmpeg non ce l'ha.** Fino alla 0.7.8 si guardava solo il PATH e il
 * collegamento di WinGet: chi non lo aveva installato a mano non aveva
 * anteprime, e non c'era scritto da nessuna parte perché.
 *
 * Ma un FFmpeg ce l'ha già: dalla 0.8.0 `imageio-ffmpeg` sta in
 * `requirements/base.txt` — cioè nell'ambiente che installa **chiunque** apra
 * la suite — e si porta dentro un binario suo. È lo stesso che il nodo
 * `daprod_ponte` usa già per cucire le clip. Cercarlo qui non aggiunge niente
 * da scaricare: usa quello che è già sul disco.
 *
 * **E non cambia niente sulla licenza.** Quel binario non lo distribuiamo noi:
 * lo scarica `pip` sul computer di chi installa, come ComfyUI. La suite resta
 * MIT e non imbarca GPL.
 */
function dentroLAmbiente(): string[] {
  const binari = join(RUNTIME_DIR, "Lib", "site-packages", "imageio_ffmpeg", "binaries");
  try {
    // Il nome ha la versione dentro (`ffmpeg-win-x86_64-v7.1.exe`) e cambia a
    // ogni aggiornamento del pacchetto: si guarda la cartella invece di
    // scrivere un nome che fra sei mesi non c'è più.
    return readdirSync(binari)
      .filter((n) => n.toLowerCase().startsWith("ffmpeg") && n.toLowerCase().endsWith(".exe"))
      .map((n) => join(binari, n));
  } catch {
    return [];
  }
}

/** Il percorso di `ffmpeg.exe`, o null se su questo computer non c'è. */
export function findFfmpeg(): string | null {
  if (risolto !== undefined) return risolto;

  const candidati = [
    join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
  ];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir) candidati.push(join(dir, "ffmpeg.exe"));
  }
  // In fondo, non in cima: se sul computer ce n'è uno installato è quello che
  // l'utente si aspetta di veder girare, e di solito è anche più nuovo.
  candidati.push(...dentroLAmbiente());

  risolto = null;
  for (const candidato of candidati) {
    if (candidato.includes(sep) && existsSync(candidato)) {
      risolto = candidato;
      break;
    }
  }
  return risolto;
}

/**
 * Dimentica quello che aveva trovato, e ricomincia da capo.
 *
 * Serve dopo l'installazione dell'ambiente Python: la prima volta che la suite
 * parte, `site-packages` non c'è ancora e la risposta «FFmpeg non c'è» resta
 * incollata per tutta la sessione. Chi finisce di installare chiama questa, e
 * le anteprime cominciano a esistere senza riavviare niente.
 */
export function dimenticaFfmpeg(): void {
  risolto = undefined;
}

/** Vero se su questo computer si può contare su FFmpeg. */
export const cEffmpeg = (): boolean => findFfmpeg() !== null;
