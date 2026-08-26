/**
 * La suite vista da fuori — e, dalla 0.7.0, anche da dentro.
 *
 * **Una pagina sola per tre posti.** La aprono:
 *
 * - **DaProdConnessione**, la scheda della suite sul PC, in una finestra;
 * - il **browser di un portatile**, che la suite non la farebbe girare ma non
 *   gli serve: gli serve comandare il PC fisso;
 * - l'**app del telefono**, in una WebView, con il token preso col codice.
 *
 * Non è pigrizia: è la cura di un difetto vero. Prima la stessa roba stava in
 * due posti — il pannello «Da fuori» in fondo all'hub e questa pagina — e i due
 * non dicevano mai la stessa cosa. Una verità sola non si ottiene scrivendone
 * una terza: si ottiene togliendone una.
 *
 * ## Una pagina, due facce: e questa è la novità della 0.7.6
 *
 * Fino alla 0.7.5 le tre aperture vedevano **esattamente** la stessa cosa, ed è
 * il difetto che è stato detto per primo: «ho visto che è identica all'app che
 * si apre su pc, ma io vorrei una versione android e una pc».
 *
 * Aveva ragione, e per un motivo che non è estetico. Chi apre questa pagina
 * **dal computer** la apre per governare: chi è collegato, chi passa davanti,
 * quanti lavori accettare, il firewall. Chi la apre **dal telefono** la apre
 * per fare una cosa: una foto, un video, guardare quello che è venuto fuori.
 * Mostrare gli stessi diciotto comandi a tutti e due vuol dire dare a uno metà
 * dei suoi e all'altro il doppio di quello che gli serve.
 *
 * Quindi: **un `modo`**, deciso all'apertura, che vale per tutta la pagina.
 * `telefono` è la faccia di chi fa; `computer` è la faccia di chi governa. Non
 * sono due pagine — sarebbe di nuovo il difetto di prima, due verità che
 * divergono — è la stessa pagina che mostra due sottoinsiemi.
 *
 * E una cosa in più che nemmeno il `modo` decide: **`sonoLaCasa`**. Gli
 * interruttori che governano la macchina (chi genera senza chiedere, i tetti
 * della fila, la pausa) si vedono e si premono **solo da DaProdConnessione**,
 * cioè solo dal computer stesso. Un telefono con i permessi da admin decide
 * sulle richieste degli altri, ma non può alzarsi i limiti a cui è sottoposto:
 * se potesse, non sarebbero limiti. Vedi `StatoMacchina` in `types.ts`.
 *
 * ## Regole di questa cartella
 *
 * - **si serve da sé**: niente CDN, niente font esterni, niente immagini. Una
 *   pagina che chiama fuori è una pagina che non funziona quando la linea è
 *   giù, cioè quando serve di più.
 * - **le azioni non sono scritte qui**: si chiedono a `/azioni` e i moduli si
 *   disegnano da soli. Aggiungere un'azione al catalogo la fa comparire qui.
 * - **niente template literal, e niente backtick, nel JavaScript.** Sembra un
 *   capriccio e non lo è: questi file *sono* template literal, e ogni backtick
 *   dentro li chiuderebbe. Le stringhe si concatenano con `+`, e in cambio il
 *   file non si rompe per un accento.
 *
 * ## Perché una cartella e non un file solo
 *
 * Perché erano 2300 righe e stavano per diventarne 4000. Un file in cui il CSS
 * di un riquadro sta a milleduecento righe dal codice che lo disegna non lo
 * legge più nessuno — e questa pagina è la cosa che l'utente **usa**, quindi è
 * quella che cambia più spesso. Quattro pezzi con un mestiere ciascuno: lo
 * stile, le pagine, il copione, e questo, che li mette insieme.
 */

import { STILE } from "./stile";
import { PAGINE } from "./pagine";
import { COPIONE } from "./copione";

export function paginaConsole(): string {
  return (
    `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08090d">
<title>DaProd Suite</title>
<style>
` +
    STILE +
    `
</style>
</head>
<body>
` +
    PAGINE +
    `
<script>
(() => {
  "use strict";
` +
    COPIONE +
    `
})();
</script>
</body>
</html>`
  );
}
