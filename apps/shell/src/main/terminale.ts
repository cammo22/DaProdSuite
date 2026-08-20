/**
 * Il terminale dentro ogni app: le righe del motore dove sono capitate.
 *
 * Finora, quando un'app faceva una cosa strana, le righe che lo spiegavano
 * stavano in `logs/` — cioè fuori dalla finestra che stavi guardando, in un
 * file che si apre con un altro programma. L'hub adesso le sa leggere, ma
 * andarsele a cercare nell'hub mentre stai generando è lo stesso viaggio.
 *
 * **Perché lo inietta la shell invece di stare in ogni app.** Le app non si
 * somigliano: Musica e Foto sono pagine su `daprod://` con i moduli ES, Dream è
 * servita dal proprio motore su `http://127.0.0.1:8770`, il Visualizer è un
 * bundle Vite. Un file condiviso da tutte e quattro non esiste — origini
 * diverse, radici diverse, CSP diverse. Iniettarlo dalla finestra invece
 * funziona per tutte allo stesso modo, ed è **una implementazione sola**:
 * `executeJavaScript` e `insertCSS` girano nel mondo della pagina ma non
 * passano dalla sua CSP, che è esattamente quello che serve qui.
 *
 * Quello che viene iniettato è **solo l'interfaccia**: le righe se le prende da
 * `window.daprodSuite.log`, cioè dal ponte normale, con i controlli che ha già.
 */

import { APPS, type AppId } from "@daprod/ipc";
import type { BrowserWindow } from "electron";

const STILE = `
/* La barra in basso a destra. Ci stava anche un tasto "♪ Visualizer" per aprire
   il Visualizer da dentro le altre app: tolto il 19 agosto 2026 su richiesta di
   Cammo — le app si aprono tutte insieme dall'hub, e un tasto che ne apre
   un'altra dentro la finestra in cui stai lavorando e' solo ingombro. */
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
.daprod-term-tasto.acceso { color: #fff; border-color: #5cff9d; }

.daprod-term {
  position: fixed; right: 16px; bottom: 62px; z-index: 2147483000;
  width: min(760px, calc(100vw - 32px)); height: min(380px, 60vh);
  display: none; flex-direction: column;
  border-radius: 13px; overflow: hidden;
  background: rgba(8,9,13,.97); border: 1px solid #2e3340;
  box-shadow: 0 20px 60px rgba(0,0,0,.6); backdrop-filter: blur(10px);
}
.daprod-term.aperto { display: flex; }

.daprod-term-testa {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  padding: 9px 11px; border-bottom: 1px solid #22262f;
  font: 12.5px/1.2 "Segoe UI", system-ui, sans-serif; color: #868c9e;
}
.daprod-term-testa select {
  flex: 0 0 auto; max-width: 220px;
  background: #11131a; color: #eceef4; border: 1px solid #2e3340;
  border-radius: 8px; padding: 4px 7px; font: inherit;
}
.daprod-term-testa label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
.daprod-term-testa .daprod-term-chiudi {
  margin-left: auto; background: none; border: 0; color: #868c9e;
  cursor: pointer; font-size: 15px; padding: 2px 6px; border-radius: 7px;
}
.daprod-term-testa .daprod-term-chiudi:hover { color: #fff; background: #1b2030; }

.daprod-term-righe {
  flex: 1; margin: 0; padding: 10px 12px; overflow: auto;
  font: 11.5px/1.5 ui-monospace, Consolas, monospace; color: #c7d0e0;
  white-space: pre-wrap; word-break: break-word;
}
`;

/**
 * Il codice che gira nella pagina.
 *
 * Sta come stringa e non come file a parte perché deve arrivare intero a
 * `executeJavaScript`: un `import` qui dentro non avrebbe niente da cui
 * importare. `%MIO%` viene sostituito col nome del log del motore di quest'app.
 */
const SCRIPT = `
(() => {
  if (window.__daprodTerminale) return "gia' montato";
  const suite = window.daprodSuite;
  if (!suite || !suite.log) return "niente ponte";

  // La barra in basso a destra: adesso ci sta solo il log, ma resta una barra
  // e non un tasto attaccato al corpo della pagina — il giorno che la shell
  // inietta qualcos'altro, quello ci si aggiunge senza rifare niente.
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
  tasto.className = "daprod-tasto daprod-term-tasto";
  tasto.textContent = "▤ log";
  tasto.title = "Le ultime righe del motore (Ctrl+L)";

  const pannello = document.createElement("div");
  pannello.className = "daprod-term";
  pannello.innerHTML =
    '<div class="daprod-term-testa">' +
      '<select class="daprod-term-quale"></select>' +
      '<label><input type="checkbox" class="daprod-term-segui" checked> segui</label>' +
      '<span class="daprod-term-nota"></span>' +
      '<button type="button" class="daprod-term-chiudi" title="Chiudi">✕</button>' +
    '</div>' +
    '<pre class="daprod-term-righe"></pre>';

  barraDaProd().append(tasto);
  document.body.append(pannello);

  const quale = pannello.querySelector(".daprod-term-quale");
  const segui = pannello.querySelector(".daprod-term-segui");
  const righe = pannello.querySelector(".daprod-term-righe");
  const nota = pannello.querySelector(".daprod-term-nota");

  let orologio = null;

  async function riempi() {
    let voci;
    try { voci = await suite.log.elenco(); } catch { return; }
    if (!voci.length) { righe.textContent = "Nessun log ancora."; return; }

    // L'elenco si ridisegna solo se cambia: rifarlo ogni due secondi
    // chiuderebbe il menu in faccia a chi lo sta aprendo.
    const nomi = voci.map((v) => v.nome).join("|");
    if (quale.dataset.nomi !== nomi) {
      const scelto = quale.value;
      quale.dataset.nomi = nomi;
      quale.innerHTML = voci.map((v) => '<option>' + v.nome + '</option>').join("");
      // Di suo si apre sul motore di quest'app: nel novanta per cento dei casi
      // e' quello che si stava cercando.
      const mio = "%MIO%";
      quale.value = voci.some((v) => v.nome === scelto) ? scelto
        : (voci.some((v) => v.nome === mio) ? mio : voci[0].nome);
    }

    const voce = voci.find((v) => v.nome === quale.value);
    if (voce) {
      nota.textContent = "ultima riga " + new Date(voce.quando).toLocaleTimeString("it-IT");
    }

    const testo = await suite.log.leggi(quale.value, 300);
    const inFondo = righe.scrollTop + righe.clientHeight >= righe.scrollHeight - 40;
    righe.textContent = testo || "(vuoto)";
    if (segui.checked || inFondo) righe.scrollTop = righe.scrollHeight;
  }

  function apri(aperto) {
    pannello.classList.toggle("aperto", aperto);
    tasto.classList.toggle("acceso", aperto);
    if (aperto) {
      void riempi();
      // Si rilegge da solo finche' e' aperto: un motore che sta partendo scrive
      // proprio mentre lo guardi, ed e' quello il momento in cui serve.
      if (!orologio) orologio = setInterval(riempi, 2000);
    } else if (orologio) {
      clearInterval(orologio);
      orologio = null;
    }
  }

  tasto.onclick = () => apri(!pannello.classList.contains("aperto"));
  pannello.querySelector(".daprod-term-chiudi").onclick = () => apri(false);
  quale.onchange = () => void riempi();

  // Ctrl+L, che e' dove la mano va gia'. Esc chiude, come ogni pannello.
  window.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.key.toLowerCase() === "l") {
      ev.preventDefault();
      apri(!pannello.classList.contains("aperto"));
    } else if (ev.key === "Escape" && pannello.classList.contains("aperto")) {
      apri(false);
    }
  });

  window.__daprodTerminale = { apri };
  return "montato";
})();
`;

/**
 * Mette il terminale nella finestra di un'app.
 *
 * Si rimonta a ogni caricamento della pagina — un `location.reload()` porta via
 * tutto quello che c'era nel DOM — e non fa niente se la pagina non ha il ponte
 * della suite.
 *
 * Il log su cui si apre e' quello del **motore** dell'app, non della sua
 * pagina: quando qualcosa non va, nove volte su dieci l'ha scritto il motore.
 * Un'app senza motore (il Visualizer) parte dal log della propria pagina, che
 * e' l'unico che ha.
 */
export function montaTerminale(finestra: BrowserWindow, id: AppId): void {
  const suo = APPS[id].service?.id ?? `${id}-pagina`;
  const codice = SCRIPT.replace(/%MIO%/g, suo);

  finestra.webContents.on("did-finish-load", () => {
    void finestra.webContents.insertCSS(STILE).catch(() => {});
    void finestra.webContents.executeJavaScript(codice).catch(() => {});
  });
}
