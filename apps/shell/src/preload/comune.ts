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
      onCambiata: (listener) =>
        subscribe<ElementoLibreria[]>(CHANNELS.libreriaCambiata, listener),
    },

    invia: (destinazione: AppId, elementoId: string, intenzione: Intenzione) =>
      ipcRenderer.invoke(CHANNELS.appInvia, destinazione, elementoId, intenzione),

    onConsegna: (listener) => subscribe<Consegna>(CHANNELS.appConsegna, listener),

    chiudi: () => ipcRenderer.invoke(CHANNELS.appChiudi, io),
  };

  contextBridge.exposeInMainWorld("daprodSuite", api);
}
