import { contextBridge, ipcRenderer } from "electron";
import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProdVoce.
 *
 * Uguale a quello di Foto e Cinema: la libreria, lo scambio con le altre app e
 * la chiusura stanno gia' su `window.daprodSuite`. Qui resta solo l'indirizzo
 * del motore, che la pagina non puo' sapere da se' — la porta e' nel catalogo, e
 * il catalogo sta nel main.
 */
esponiApiApp("voce");

contextBridge.exposeInMainWorld("daprodVoce", {
  motore: (): Promise<string | null> => ipcRenderer.invoke("dpv:motore"),
});
