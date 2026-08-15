import { useEffect, useState } from 'react'
import type { HostBridge, IncomingFile } from '@/bridge/types'
import { createLogger } from '@/lib/log'
import type { AppController } from './AppController'

const log = createLogger('drop')

/** Limite di sicurezza sulla ricorsione nelle cartelle trascinate. */
const MAX_DEPTH = 6
const MAX_FILES = 2000

/**
 * Drag & drop sull'intera finestra.
 * Restituisce true mentre un trascinamento e' in corso, per animare i bordi.
 */
export function useFileDrop(controller: AppController): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // I dragenter/dragleave dei figli si annidano: serve un contatore.
    let depth = 0

    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files')

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth++
      setDragging(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }

    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }

    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer) return
      event.preventDefault()
      depth = 0
      setDragging(false)

      void collectFiles(event.dataTransfer, controller.bridge)
        .then((files) => controller.addFiles(files))
        .catch((error) => {
          log.error('lettura del trascinamento fallita', error)
          controller.notify('error', 'Non sono riuscito a leggere i file trascinati.')
        })
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [controller])

  return dragging
}

/** Estrae i file, scendendo nelle cartelle quando il browser lo consente. */
async function collectFiles(transfer: DataTransfer, bridge: HostBridge): Promise<IncomingFile[]> {
  // Gli entry vanno letti prima di qualsiasi await: dopo, DataTransfer e' svuotato.
  const entries: FileSystemEntry[] = []
  const plain: File[] = []

  if (transfer.items.length > 0) {
    for (const item of Array.from(transfer.items)) {
      if (item.kind !== 'file') continue
      const entry = item.webkitGetAsEntry?.()
      if (entry) entries.push(entry)
      else {
        const file = item.getAsFile()
        if (file) plain.push(file)
      }
    }
  } else {
    plain.push(...Array.from(transfer.files))
  }

  const result: IncomingFile[] = plain.map((file) => describe(file, bridge))
  for (const entry of entries) {
    if (result.length >= MAX_FILES) break
    await walk(entry, 0, result, bridge)
  }
  return result
}

async function walk(
  entry: FileSystemEntry,
  depth: number,
  out: IncomingFile[],
  bridge: HostBridge,
): Promise<void> {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return

  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      ;(entry as FileSystemFileEntry).file(
        (f) => resolve(f),
        () => resolve(null),
      )
    })
    if (file) out.push(describe(file, bridge))
    return
  }

  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()

  // readEntries restituisce risultati a blocchi: va richiamato fino al vuoto.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(
        (items) => resolve(items),
        () => resolve([]),
      )
    })
    if (batch.length === 0) break
    for (const child of batch) {
      await walk(child, depth + 1, out, bridge)
      if (out.length >= MAX_FILES) return
    }
  }
}

/**
 * Scheda del file trascinato.
 *
 * Il percorso reale lo sa solo il guscio: da Electron 32 `File.path` non esiste
 * piu' e va chiesto a `webUtils` dal preload, che e' quello che fa
 * `getPathForFile`. Nel browser resta null e la coda non si puo' salvare.
 */
function describe(file: File, bridge: HostBridge): IncomingFile {
  return {
    file,
    name: file.name,
    size: file.size,
    path: bridge.getPathForFile?.(file) ?? null,
  }
}
