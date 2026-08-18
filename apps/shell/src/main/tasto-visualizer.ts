/**
 * Il tasto che apre DaPVisualizer da dentro qualunque altra app.
 *
 * **Il problema che risolve.** Aprire il Visualizer mentre gira un'altra app la
 * suite lo sa fare da sempre — non è un motore pesante, non passa dall'arbitro
 * della GPU, e provato dal vivo si apre accanto a DaPMusica e a DaPFoto senza
 * che nessuna delle due si chiuda. Quello che mancava era **arrivarci**: il
 * bottone "Apri" sta nell'hub, e l'hub mentre lavori è una finestra dietro le
 * altre, o l'hai chiusa e resta solo l'area di notifica. Da qui invece il
 * Visualizer si apre dove sei già.
 *
 * È lo stesso mestiere del [terminale](terminale.ts) e si fa nello stesso modo,
 * per le stesse ragioni: iniettato dalla shell in ogni finestra, perché le
 * quattro app non condividono né origine né CSP e un file comune fra loro non
 * esiste. `executeJavaScript` gira nel mondo della pagina senza passare dalla
 * sua CSP, ed è **una implementazione sola per tutte**.
 *
 * Non fa niente nella finestra del Visualizer stesso: un tasto che apre l'app
 * che stai già guardando è solo rumore.
 */

import type { AppId } from "@daprod/ipc";
import type { BrowserWindow } from "electron";

const STILE = `
/* La stessa barra del terminale: la crea chi arriva per primo fra i due. */
.daprod-barra {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
  display: flex; align-items: center; gap: 8px;
}
.daprod-tasto {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 13px; border-radius: 11px; cursor: pointer;
  font: 600 12.5px/1.2 "Segoe UI", system-ui, sans-serif;
  color: #c7d0e0; background: rgba(14,17,26,.92); border: 1px solid #2e3340;
  box-shadow: 0 8px 24px rgba(0,0,0,.45); backdrop-filter: blur(8px);
  transition: .15s;
}
.daprod-tasto:hover { color: #fff; border-color: #4a5468; }
/* Il viola del Visualizer, lo stesso della sua scheda nell'hub. */
.daprod-vis-tasto:hover { border-color: #7c5cff; }
.daprod-vis-tasto[disabled] { opacity: .55; cursor: default; }
`;

/**
 * Il codice che gira nella pagina.
 *
 * Come per il terminale sta in una stringa: deve arrivare intero a
 * `executeJavaScript`, dove non c'è niente da cui importare.
 */
const SCRIPT = `
(() => {
  if (window.__daprodTastoVisualizer) return "gia' montato";
  const suite = window.daprodSuite;
  if (!suite || !suite.apriApp) return "niente ponte";

  function barraDaProd() {
    let barra = document.querySelector(".daprod-barra");
    if (!barra) {
      barra = document.createElement("div");
      barra.className = "daprod-barra";
      document.body.append(barra);
    }
    return barra;
  }

  const tasto = document.createElement("button");
  tasto.type = "button";
  tasto.className = "daprod-tasto daprod-vis-tasto";
  tasto.textContent = "♪ Visualizer";
  tasto.title = "Apri DaPVisualizer, senza chiudere quello che stai facendo";

  const scritta = tasto.textContent;

  tasto.onclick = async () => {
    tasto.disabled = true;
    tasto.textContent = "apro…";
    try {
      await suite.apriApp("visualizer");
      tasto.textContent = scritta;
    } catch (errore) {
      // Il motivo vero sta nel messaggio del main: mostrarlo sul tasto e'
      // meglio di un tasto che non fa niente, che e' proprio il difetto da
      // cui e' nato tutto questo.
      tasto.textContent = "non si apre";
      tasto.title = String((errore && errore.message) || errore);
      setTimeout(() => { tasto.textContent = scritta; }, 4000);
    } finally {
      tasto.disabled = false;
    }
  };

  barraDaProd().append(tasto);

  window.__daprodTastoVisualizer = true;
  return "montato";
})();
`;

/**
 * Mette il tasto del Visualizer nella finestra di un'app.
 *
 * Si rimonta a ogni caricamento della pagina, come il terminale: un
 * `location.reload()` porta via tutto quello che c'era nel DOM.
 */
export function montaTastoVisualizer(finestra: BrowserWindow, id: AppId): void {
  if (id === "visualizer") return;

  finestra.webContents.on("did-finish-load", () => {
    void finestra.webContents.insertCSS(STILE).catch(() => {});
    void finestra.webContents.executeJavaScript(SCRIPT).catch(() => {});
  });
}
