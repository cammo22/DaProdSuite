import { createLogger } from '@/lib/log'
import { FILE_ACCEPT } from '@/audio/formats'
import type { HostBridge, HostCapabilities, IncomingFile } from './types'

const log = createLogger('bridge')
const PREFIX = 'daprodvisualizer:'

/**
 * Implementazione da browser puro.
 *
 * Persistenza su localStorage, selettore file con <input type="file">,
 * nessuna transcodifica: i formati che Chromium non decodifica vengono
 * segnalati come "serve il guscio desktop".
 */
export class WebBridge implements HostBridge {
  readonly kind = 'web' as const

  readonly capabilities: HostCapabilities = {
    ffmpeg: false,
    filePaths: false,
    persistentQueue: false,
    nativeFullscreen: false,
  }

  async loadState<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw == null) return fallback
      return JSON.parse(raw) as T
    } catch (error) {
      log.warn(`stato "${key}" illeggibile, uso i valori predefiniti`, error)
      return fallback
    }
  }

  async saveState<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (error) {
      log.warn(`salvataggio di "${key}" fallito`, error)
    }
  }

  pickFiles(): Promise<IncomingFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = FILE_ACCEPT
      input.style.display = 'none'

      const done = (files: IncomingFile[]) => {
        input.remove()
        resolve(files)
      }

      input.addEventListener('change', () => {
        const list = input.files ? [...input.files] : []
        done(list.map((file) => ({ file, name: file.name, size: file.size, path: null })))
      })
      // "cancel" e' supportato da Chromium: senza, la promise resterebbe appesa.
      input.addEventListener('cancel', () => done([]))

      document.body.append(input)
      input.click()
    })
  }

  async prepareSource(): Promise<string | null> {
    return null
  }

  async reveal(): Promise<boolean> {
    return false
  }
}

/**
 * Restituisce il bridge del guscio se presente, altrimenti quello web.
 * Il guscio desktop espone `window.daprodHost` dal preload.
 */
export function resolveBridge(): HostBridge {
  const injected = (globalThis as { daprodHost?: HostBridge }).daprodHost
  if (injected && typeof injected.loadState === 'function') {
    log.info('guscio desktop rilevato', injected.capabilities)
    return injected
  }
  return new WebBridge()
}
