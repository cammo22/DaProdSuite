import { contextBridge, ipcRenderer } from "electron";
import { esponiApiApp } from "./comune";

/**
 * Il ponte di DaProdMusica.
 *
 * È corto perché quasi tutto quello che le serve è già comune: la libreria dei
 * brani, lo scambio con le altre app e la chiusura stanno su `window.daprodSuite`
 * grazie a `esponiApiApp`. Qui resta solo l'indirizzo del motore, che è l'unica
 * cosa specifica di quest'app.
 */
esponiApiApp("musica");

contextBridge.exposeInMainWorld("daprodMusica", {
  motore: (): Promise<string | null> => ipcRenderer.invoke("dpm:motore"),
});
