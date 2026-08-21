/**
 * Ponte fra shell e interfaccia.
 *
 * Il renderer non ha Node né `ipcRenderer`: vede solo `window.daprod`, cioè
 * esattamente i metodi dichiarati in SuiteApi. Aggiungere una capacità richiede
 * di dichiararla nel contratto, registrarla nel main e esporla qui: tre punti,
 * nessuno dei quali si può saltare per sbaglio.
 */

import { contextBridge, ipcRenderer } from "electron";
import {
  APP_LIST,
  CHANNELS,
  type AppId,
  type AppState,
  type AvanzamentoModelli,
  type ElementoLibreria,
  type FiltroLibreria,
  type GpuState,
  type RuntimeState,
  type StatoAccesso,
  type SuiteApi,
  type Unsubscribe,
  type UpdateState,
} from "@daprod/ipc";

/** Iscrive un listener a un canale e restituisce come disiscriversi. */
function subscribe<T>(channel: string, listener: (payload: T) => void): Unsubscribe {
  const handler = (_event: unknown, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

const api: SuiteApi = {
  catalog: APP_LIST,

  suite: {
    version: () => ipcRenderer.invoke(CHANNELS.suiteVersion),
    revealPath: (kind) => ipcRenderer.invoke(CHANNELS.suiteRevealPath, kind),
    avvioPronto: () => ipcRenderer.invoke(CHANNELS.suiteAvvioPronto),
  },

  // Gli stessi canali che usano le app: la libreria e' una sola, e l'hub la
  // guarda intera invece che filtrata per app.
  risultati: {
    elenco: (filtro?: FiltroLibreria) => ipcRenderer.invoke(CHANNELS.libreriaElenco, filtro),
    mostraNellaCartella: (id: string) => ipcRenderer.invoke(CHANNELS.libreriaMostra, id),
    salva: (id: string) => ipcRenderer.invoke(CHANNELS.libreriaSalva, id),
    elimina: (id: string) => ipcRenderer.invoke(CHANNELS.libreriaElimina, id),
    onCambiata: (listener) => subscribe<ElementoLibreria[]>(CHANNELS.libreriaCambiata, listener),
  },

  modelli: {
    catalogo: () => ipcRenderer.invoke(CHANNELS.modelliCatalogo),
    scarica: (id: AppId, ids: string[]) => ipcRenderer.invoke(CHANNELS.modelliScarica, id, ids),
    annulla: (id: AppId) => ipcRenderer.invoke(CHANNELS.modelliAnnulla, id),
    onAvanzamento: (listener) =>
      subscribe<AvanzamentoModelli>(CHANNELS.modelliAvanzamento, listener),
  },

  log: {
    elenco: () => ipcRenderer.invoke(CHANNELS.logElenco),
    leggi: (nome: string, righe?: number) => ipcRenderer.invoke(CHANNELS.logLeggi, nome, righe),
  },

  apps: {
    list: () => ipcRenderer.invoke(CHANNELS.appsList),
    open: (id: AppId) => ipcRenderer.invoke(CHANNELS.appsOpen, id),
    close: (id: AppId) => ipcRenderer.invoke(CHANNELS.appsClose, id),
    install: (id: AppId) => ipcRenderer.invoke(CHANNELS.appsInstall, id),
    installaTutte: (ids: AppId[]) => ipcRenderer.invoke(CHANNELS.appsInstallaTutte, ids),
    annullaInstallazione: (id: AppId) =>
      ipcRenderer.invoke(CHANNELS.appsAnnullaInstallazione, id),
    onChanged: (listener) => subscribe<AppState[]>(CHANNELS.appsChanged, listener),
  },

  runtime: {
    state: () => ipcRenderer.invoke(CHANNELS.runtimeState),
    install: () => ipcRenderer.invoke(CHANNELS.runtimeInstall),
    ripara: () => ipcRenderer.invoke(CHANNELS.runtimeRipara),
    controlla: () => ipcRenderer.invoke(CHANNELS.runtimeControlla),
    onChanged: (listener) => subscribe<RuntimeState>(CHANNELS.runtimeChanged, listener),
  },

  impostazioni: {
    leggi: () => ipcRenderer.invoke(CHANNELS.impostazioniLeggi),
    velocita: (scelta) => ipcRenderer.invoke(CHANNELS.impostazioniVelocita, scelta),
    profilo: (scelta) => ipcRenderer.invoke(CHANNELS.impostazioniProfilo, scelta),
    guidaFatta: () => ipcRenderer.invoke(CHANNELS.impostazioniGuida),
  },

  gpu: {
    state: () => ipcRenderer.invoke(CHANNELS.gpuState),
    onChanged: (listener) => subscribe<GpuState>(CHANNELS.gpuChanged, listener),
  },

  vram: {
    elenco: () => ipcRenderer.invoke(CHANNELS.vramElenco),
    scarica: (nome: string) => ipcRenderer.invoke(CHANNELS.vramScarica, nome),
    svuota: () => ipcRenderer.invoke(CHANNELS.vramSvuota),
  },

  spazio: {
    stato: () => ipcRenderer.invoke(CHANNELS.spazioStato),
    disinstalla: (id: AppId) => ipcRenderer.invoke(CHANNELS.spazioDisinstalla, id),
    elimina: (id: string) => ipcRenderer.invoke(CHANNELS.spazioElimina, id),
    reset: (cosa) => ipcRenderer.invoke(CHANNELS.spazioReset, cosa),
  },

  llm: {
    stato: () => ipcRenderer.invoke(CHANNELS.llmStato),
    carica: (id: string, contesto: number) =>
      ipcRenderer.invoke(CHANNELS.llmCarica, id, contesto),
    scarica: (id: string) => ipcRenderer.invoke(CHANNELS.llmScarica, id),
  },

  update: {
    state: () => ipcRenderer.invoke(CHANNELS.updateState),
    check: () => ipcRenderer.invoke(CHANNELS.updateCheck),
    download: () => ipcRenderer.invoke(CHANNELS.updateDownload),
    installAndRestart: () => ipcRenderer.invoke(CHANNELS.updateInstall),
    onChanged: (listener) => subscribe<UpdateState>(CHANNELS.updateChanged, listener),
  },

  remoto: {
    accendi: () => ipcRenderer.invoke(CHANNELS.remotoAccendi),
    spegni: () => ipcRenderer.invoke(CHANNELS.remotoSpegni),
    stato: () => ipcRenderer.invoke(CHANNELS.remotoStato),
    nuovoInvito: (ruolo) => ipcRenderer.invoke(CHANNELS.remotoNuovoInvito, ruolo),
    revoca: (id) => ipcRenderer.invoke(CHANNELS.remotoRevoca, id),
    scegliRete: (ip) => ipcRenderer.invoke(CHANNELS.remotoScegliRete, ip),
    decidi: (id, stato, motivo) => ipcRenderer.invoke(CHANNELS.remotoDecidi, id, stato, motivo),
    consegna: (id, esito) => ipcRenderer.invoke(CHANNELS.remotoConsegna, id, esito),
    onChanged: (listener) => subscribe<StatoAccesso>(CHANNELS.remotoChanged, listener),
  },
};

contextBridge.exposeInMainWorld("daprod", api);
