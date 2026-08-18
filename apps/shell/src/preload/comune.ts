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

    log: {
      elenco: () => ipcRenderer.invoke(CHANNELS.logElenco),
      leggi: (nome: string, righe?: number) => ipcRenderer.invoke(CHANNELS.logLeggi, nome, righe),
    },

    apriApp: (destinazione: AppId) => ipcRenderer.invoke(CHANNELS.appApri, destinazione),

    chiudi: () => ipcRenderer.invoke(CHANNELS.appChiudi, io),
  };

  contextBridge.exposeInMainWorld("daprodSuite", api);
}
