import { contextBridge, ipcRenderer } from "electron";
import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProdCompanion.
 *
 * Come quelli di Musica e Foto: la libreria, il modello che scrive e lo scambio
 * con le altre app stanno già su `window.daprodSuite`. Qui restano le due cose
 * che questa scheda sola ha — dov'è il suo motore, e dove finiscono scritti i
 * ricordi.
 */
esponiApiApp("companion");

contextBridge.exposeInMainWorld("daprodCompanion", {
  motore: (): Promise<string | null> => ipcRenderer.invoke("dpc:motore"),
  apriRicordi: (): Promise<void> => ipcRenderer.invoke("dpc:apri-ricordi"),
});
