import { contextBridge, ipcRenderer, webUtils } from 'electron'

/**
 * Implementazione di `HostBridge` esposta su `window.daprodHost`.
 *
 * Il frontend non sa che sotto c'e' Electron: vede la stessa interfaccia che
 * `WebBridge` implementa nel browser, solo con le capacita' accese.
 */

interface DescribedFile {
  name: string
  size: number
  path: string
}

const capabilities = {
  ffmpeg: false,
  filePaths: true,
  persistentQueue: true,
  nativeFullscreen: true,
}

// Le capacita' si leggono una volta all'avvio: `ffmpeg` dipende da cosa c'e' sul
// PC, e il renderer le legge in modo sincrono quando decide cosa mostrare.
void ipcRenderer.invoke('dpv:capabilities').then((value: typeof capabilities) => {
  Object.assign(capabilities, value)
})

const host = {
  kind: 'desktop' as const,
  capabilities,

  async loadState<T>(key: string, fallback: T): Promise<T> {
    const value = await ipcRenderer.invoke('dpv:loadState', key)
    return value === null || value === undefined ? fallback : (value as T)
  },

  async saveState(key: string, value: unknown): Promise<void> {
    await ipcRenderer.invoke('dpv:saveState', key, value)
  },

  async pickFiles(): Promise<{ file: File | null; name: string; size: number; path: string }[]> {
    const picked = (await ipcRenderer.invoke('dpv:pickFiles')) as DescribedFile[]
    return picked.map((entry) => ({ file: null, ...entry }))
  },

  /**
   * Percorso reale di un file trascinato.
   *
   * Da Electron 32 `File.path` non esiste piu' e questo e' l'unico modo: la
   * funzione deve stare nel preload, perche' `webUtils` ha bisogno
   * dell'oggetto File vero, non di una sua copia.
   */
  getPathForFile(file: File): string | null {
    try {
      const value = webUtils.getPathForFile(file)
      return value || null
    } catch {
      return null
    }
  },

  trackUrl(filePath: string): Promise<string | null> {
    return ipcRenderer.invoke('dpv:trackUrl', filePath)
  },

  prepareSource(input: { path: string | null }): Promise<string | null> {
    if (!input?.path) return Promise.resolve(null)
    return ipcRenderer.invoke('dpv:prepareSource', input.path)
  },

  readTagBytes(filePath: string): Promise<Uint8Array | null> {
    return ipcRenderer.invoke('dpv:readTagBytes', filePath)
  },

  describeFile(filePath: string): Promise<DescribedFile | null> {
    return ipcRenderer.invoke('dpv:describe', filePath)
  },

  reveal(filePath: string): Promise<boolean> {
    return ipcRenderer.invoke('dpv:reveal', filePath)
  },

  setFullscreen(value: boolean): Promise<boolean> {
    return ipcRenderer.invoke('dpv:setFullscreen', value)
  },

  isFullscreen(): Promise<boolean> {
    return ipcRenderer.invoke('dpv:isFullscreen')
  },
}

contextBridge.exposeInMainWorld('daprodHost', host)
