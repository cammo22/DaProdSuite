/**
 * Quello che vale per la finestra di **ogni** app, e che nessuna deve rifarsi.
 *
 * Per ora una cosa sola, ed è quella che è costata più tempo di tutte: **far
 * uscire allo scoperto gli errori dell'interfaccia**. Una pagina che si rompe
 * lo scrive nella console del suo renderer, che senza DevTools aperti non
 * guarda nessuno: da fuori si vede solo un bottone che non fa niente, e si
 * finisce a indovinare. Da qui in poi finiscono in `logs/<app>-pagina.log`
 * insieme al file e alla riga.
 *
 * È anche il primo pezzo del "terminale dentro ogni app" della roadmap: le
 * righe adesso esistono e sono raccolte, resta da mostrarle.
 */

import type { BrowserWindow } from "electron";
import { createLogger, type ServiceLogger } from "./logging";

const LIVELLI = ["debug", "info", "avviso", "ERRORE"] as const;

const aperti = new Map<string, ServiceLogger>();

/**
 * Manda nel log quello che la pagina scrive in console, errori compresi.
 *
 * Si aggancia una volta per finestra; il file resta aperto per tutta la
 * sessione della suite, perché un'app aperta e chiusa tre volte è comunque la
 * stessa storia da leggere.
 */
export function registraConsole(finestra: BrowserWindow, app: string): void {
  const logger = aperti.get(app) ?? createLogger(`${app}-pagina`);
  aperti.set(app, logger);

  finestra.webContents.on("console-message", (_evento, livello, messaggio, riga, sorgente) => {
    // Il rumore di ogni giorno non serve: interessano avvisi ed errori, cioè
    // le due cose che vogliono dire "qualcosa non sta funzionando".
    if (livello < 2) return;
    const dove = sorgente ? ` (${sorgente.split("/").pop()}:${riga})` : "";
    logger.write(`[${LIVELLI[livello] ?? livello}] ${messaggio}${dove}\n`, livello >= 3);
  });

  // Una pagina che non carica proprio non arriva nemmeno a scrivere in console.
  finestra.webContents.on("did-fail-load", (_e, codice, descrizione, url) => {
    logger.write(`[ERRORE] pagina non caricata (${codice} ${descrizione}): ${url}\n`, true);
  });

  finestra.webContents.on("render-process-gone", (_e, dettagli) => {
    logger.write(`[ERRORE] la pagina è morta: ${dettagli.reason}\n`, true);
  });
}
