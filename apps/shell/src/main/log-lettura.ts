/**
 * Le ultime righe dei log, lette per il pannello dell'hub.
 *
 * I motori scrivono in `logs/<nome>.log` ([logging.ts](logging.ts)) e finora
 * quelle righe si potevano guardare solo aprendo la cartella in Esplora
 * risorse — cioè uscendo dalla suite proprio nel momento in cui qualcosa non
 * funziona. Qui si leggono da dentro.
 *
 * **Si legge solo la coda.** Un log di un motore che ha lavorato tutta la notte
 * arriva a diversi MB, e mandarlo intero al renderer vorrebbe dire copiarlo
 * due volte in memoria per mostrarne trecento righe. Si legge l'ultimo pezzo
 * del file e si tagliano le righe da lì.
 */

import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { VoceLog } from "@daprod/ipc";
import { LOGS_DIR } from "./paths";

/** Quanto si legge dalla fine: abbondante per trecento righe di qualunque motore. */
const CODA_BYTE = 512 * 1024;

/**
 * I codici colore del terminale.
 *
 * ComfyUI colora il proprio output con le sequenze ANSI: su una console si
 * vedono verdi e rossi, dentro una pagina si vedono come spazzatura in mezzo
 * al testo. Qui si tolgono, che e' l'unico posto in cui farlo una volta per
 * l'hub e per il terminale dentro le app.
 */
const COLORI = /\u001B\[[0-9;]*m/g;

/** Il nome arriva dal renderer: deve restare un nome di file, non un percorso. */
function pulito(nome: string): string | null {
  return /^[A-Za-z0-9._-]+$/.test(nome) && !nome.includes("..") ? nome : null;
}

export function elencoLog(): VoceLog[] {
  let file: string[];
  try {
    file = readdirSync(LOGS_DIR).filter((f) => f.endsWith(".log"));
  } catch {
    return []; // la cartella nasce al primo avvio di un motore: prima non c'è
  }

  const voci: VoceLog[] = [];
  for (const f of file) {
    try {
      const st = statSync(join(LOGS_DIR, f));
      voci.push({ nome: f.replace(/\.log$/, ""), bytes: st.size, quando: st.mtimeMs });
    } catch {
      // sparito fra il readdir e lo stat: non è un errore da raccontare
    }
  }

  // Il più fresco per primo: quando si va a cercare un guasto, è quello.
  voci.sort((a, b) => b.quando - a.quando);
  return voci;
}

export function leggiLog(nome: string, righe: number): string {
  const sicuro = pulito(nome);
  if (!sicuro) return "";

  const percorso = join(LOGS_DIR, `${sicuro}.log`);
  let fd: number | null = null;
  try {
    const dimensione = statSync(percorso).size;
    const quanto = Math.min(dimensione, CODA_BYTE);
    const inizio = dimensione - quanto;

    fd = openSync(percorso, "r");
    const buffer = Buffer.alloc(quanto);
    readSync(fd, buffer, 0, quanto, inizio);

    const testo = buffer.toString("utf8");
    // La prima riga è quasi sempre tagliata a metà: si butta, tranne quando si
    // è letto il file intero e quindi è una riga vera.
    const tutte = testo.split(/\r?\n/);
    if (inizio > 0) tutte.shift();

    return tutte.slice(-righe).join("\n").replace(COLORI, "").trimEnd();
  } catch {
    return "";
  } finally {
    if (fd !== null) closeSync(fd);
  }
}
