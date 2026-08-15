import { contextBridge, ipcRenderer } from "electron";
import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProdFoto.
 *
 * Uguale a quello di Musica, e per la stessa ragione: la libreria, lo scambio
 * con le altre app e la chiusura stanno già su `window.daprodSuite`. Qui resta
 * solo l'indirizzo del motore.
 */
esponiApiApp("foto");

contextBridge.exposeInMainWorld("daprodFoto", {
  motore: (): Promise<string | null> => ipcRenderer.invoke("dpf:motore"),
});
