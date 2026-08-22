/**
 * Il ponte che ogni finestra di app riceve, oltre al proprio.
 *
 * Contiene la parte di suite comune a tutte: la libreria dei risultati e il modo
 * di passarsi gli elementi. Un'app che vuole solo leggere quello che hanno
 * prodotto le altre non deve aggiungere niente al proprio preload.
 *
 * Viene richiamato dal preload specifico di ogni app, che passa il proprio id.
 */

import { contextBridge, ipcRenderer } from "electron";
import {
  CHANNELS,
  type ApiApp,
  type AppId,
  type AvanzamentoModelli,
  type Consegna,
  type ElementoLibreria,
  type FiltroLibreria,
  type Intenzione,
  type PezzoLlm,
  type Unsubscribe,
} from "@daprod/ipc";

function subscribe<T>(canale: string, listener: (payload: T) => void): Unsubscribe {
  const handler = (_e: unknown, payload: T) => listener(payload);
  ipcRenderer.on(canale, handler);
  return () => ipcRenderer.off(canale, handler);
}

export function esponiApiApp(io: AppId): void {
  const api: ApiApp = {
    io,

    libreria: {
      elenco: (filtro?: FiltroLibreria) => ipcRenderer.invoke(CHANNELS.libreriaElenco, filtro),
      mostraNellaCartella: (id: string) => ipcRenderer.invoke(CHANNELS.libreriaMostra, id),
      salva: (id: string) => ipcRenderer.invoke(CHANNELS.libreriaSalva, id),
      rinomina: (id: string, nome: string) =>
        ipcRenderer.invoke(CHANNELS.libreriaRinomina, id, nome),
      copertina: (id: string, dataUrl: string | null) =>
        ipcRenderer.invoke(CHANNELS.libreriaCopertina, id, dataUrl),
      meta: (id: string, meta: Record<string, unknown>) =>
        ipcRenderer.invoke(CHANNELS.libreriaMeta, id, meta),
      elimina: (id: string) => ipcRenderer.invoke(CHANNELS.libreriaElimina, id),
      onCambiata: (listener) =>
        subscribe<ElementoLibreria[]>(CHANNELS.libreriaCambiata, listener),
    },

    // L'id dell'app lo mette il preload, non la pagina: il main deve sapere per
    // chi sta scaricando (è il suo motore che poi riavvia) e non può fidarsi di
    // un id che arriva dal renderer.
    modelli: {
      stato: (ids: string[]) => ipcRenderer.invoke(CHANNELS.modelliStato, ids),
      scarica: (ids: string[]) => ipcRenderer.invoke(CHANNELS.modelliScarica, io, ids),
      annulla: () => ipcRenderer.invoke(CHANNELS.modelliAnnulla, io),
      onAvanzamento: (listener) =>
        subscribe<AvanzamentoModelli>(CHANNELS.modelliAvanzamento, listener),
    },

    llm: {
      stato: () => ipcRenderer.invoke(CHANNELS.llmStato),
      chiedi: (domanda) => ipcRenderer.invoke(CHANNELS.llmChiedi, domanda),

      /**
       * La domanda con i token che si vedono arrivare.
       *
       * Il canale se lo inventa qui, a ogni chiamata: due pagine che chiedono
       * insieme non si mescolano i pezzi, e l'ascolto si stacca appena la
       * risposta e' finita — anche se e' finita male.
       */
      chiediInDiretta: (domanda, onPezzo) => {
        const canale = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const ascolta = (_e: unknown, carico: { canale: string; pezzo: PezzoLlm }) => {
          if (carico?.canale === canale) onPezzo(carico.pezzo);
        };
        ipcRenderer.on(CHANNELS.llmPezzo, ascolta);
        return ipcRenderer
          .invoke(CHANNELS.llmChiediDiretta, canale, domanda)
          .finally(() => ipcRenderer.off(CHANNELS.llmPezzo, ascolta));
      },

      carica: (id: string, contesto: number) => ipcRenderer.invoke(CHANNELS.llmCarica, id, contesto),
      scarica: (id: string) => ipcRenderer.invoke(CHANNELS.llmScarica, id),
      liberaMemoria: () => ipcRenderer.invoke(CHANNELS.llmLibera),
    },

    invia: (destinazione: AppId, elementoId: string, intenzione: Intenzione) =>
      ipcRenderer.invoke(CHANNELS.appInvia, destinazione, elementoId, intenzione),

    onConsegna: (listener) => subscribe<Consegna>(CHANNELS.appConsegna, listener),

    // L'id dell'app lo mette il preload, come per i modelli: la pagina dice
    // solo *quale* motore vuole, e il catalogo decide se può averlo.
    motoreInPiu: (nome: string) => ipcRenderer.invoke(CHANNELS.appMotoreInPiu, io, nome),

    // Che macchina è questa. Serve a chi offre modelli che senza scheda video
    // non hanno senso: meglio un pulsante spento con scritto perché, che una
    // generazione avviata che finisce fra sei ore.
    macchina: () => ipcRenderer.invoke(CHANNELS.appMacchina),

    log: {
      elenco: () => ipcRenderer.invoke(CHANNELS.logElenco),
      leggi: (nome: string, righe?: number) => ipcRenderer.invoke(CHANNELS.logLeggi, nome, righe),
    },

    apriApp: (destinazione: AppId) => ipcRenderer.invoke(CHANNELS.appApri, destinazione),

    chiudi: () => ipcRenderer.invoke(CHANNELS.appChiudi, io),
  };

  contextBridge.exposeInMainWorld("daprodSuite", api);
}
