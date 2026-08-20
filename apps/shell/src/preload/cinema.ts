import { contextBridge, ipcRenderer } from "electron";
import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProdCinema.
 *
 * Uguale a quello di Foto e di Musica: la libreria — da cui Cinema pesca i
 * brani — lo scambio fra app e la chiusura stanno già su `window.daprodSuite`.
 * Qui resta solo l'indirizzo del motore.
 */
esponiApiApp("cinema");

contextBridge.exposeInMainWorld("daprodCinema", {
  motore: (): Promise<string | null> => ipcRenderer.invoke("dpc:motore"),
});
