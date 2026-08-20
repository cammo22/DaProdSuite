/**
 * Aprire Esplora risorse su un file, e vederlo davvero.
 *
 * `shell.showItemInFolder` di Electron è la strada ovvia, ed è quella che c'era.
 * Su Windows 11 però capita che non apra niente: la chiamata torna senza
 * errore, la finestra di Esplora non arriva, e dall'app si vede solo un tasto
 * che non fa niente — che è esattamente il difetto segnalato su «nella cartella»
 * della galleria di DaProdFoto.
 *
 * Sotto, Electron usa `SHOpenFolderAndSelectItems`, che dipende dallo stato del
 * processo di Esplora e dalle regole di Windows su chi può portare una finestra
 * davanti. `explorer.exe /select,"…"` invece è il modo con cui **Windows stesso**
 * apre una cartella su un file: è un processo nuovo, e la finestra viene avanti.
 *
 * Resta un ripiego su `showItemInFolder` se lanciare il processo fallisce, e
 * fuori da Windows si usa solo quello — lì il difetto non c'è.
 *
 * Una implementazione sola per tutta la suite: la usano la libreria condivisa
 * (il tasto "cartella" delle app e dell'hub) e il Visualizer.
 */

import { shell } from "electron";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Apre la cartella che contiene `percorso` con il file già selezionato.
 *
 * Torna `false` solo se il file non c'è più: in quel caso chi chiama può dirlo
 * invece di lasciar credere che sia stato aperto qualcosa.
 */
export function rivela(percorso: string): boolean {
  if (!percorso || !existsSync(percorso)) return false;

  if (process.platform !== "win32") {
    shell.showItemInFolder(percorso);
    return true;
  }

  try {
    // `windowsVerbatimArguments`: la riga di comando deve arrivare a Esplora
    // esattamente come `/select,"C:\...\file.png"`. Con le virgolette messe da
    // Node attorno a tutto l'argomento — `"/select,C:\..."` — Esplora apre la
    // cartella dei documenti e ignora il file.
    const figlio = spawn("explorer.exe", [`/select,"${percorso.replace(/\//g, "\\")}"`], {
      windowsVerbatimArguments: true,
      detached: true,
      stdio: "ignore",
    });
    // Esplora esce con 1 anche quando ha funzionato: il codice di uscita non si
    // guarda. Si guarda solo se il processo non è proprio partito.
    figlio.on("error", () => shell.showItemInFolder(percorso));
    figlio.unref();
  } catch {
    shell.showItemInFolder(percorso);
  }
  return true;
}
