/**
 * Accesso alla suite dal Visualizer.
 *
 * `window.daprodSuite` esiste solo quando l'app gira dentro DaProd Suite. Aperta
 * da sola nel browser non c'è, quindi qui si degrada in silenzio: la libreria
 * risulta vuota e il pannello lo dice, invece di far esplodere l'interfaccia.
 *
 * Stessa filosofia di `HostBridge`: l'app non deve sapere dove sta girando.
 */

import type { IncomingFile } from '@/bridge/types'

export type TipoElemento = 'audio' | 'immagine' | 'video'

export interface ElementoLibreria {
  id: string
  tipo: TipoElemento
  app: string
  nome: string
  url: string
  percorso: string
  bytes: number
  creato: number
  copertina?: string
  meta?: Record<string, unknown>
}

export type Intenzione = 'riproduci' | 'usaComeCopertina' | 'usaComeRiferimento' | 'apri'

export interface Consegna {
  elemento: ElementoLibreria
  intenzione: Intenzione
  mittente?: string
}

interface ApiSuite {
  io: string
  libreria: {
    elenco(filtro?: { tipo?: TipoElemento; app?: string }): Promise<ElementoLibreria[]>
    mostraNellaCartella(id: string): Promise<boolean>
    onCambiata(listener: (elementi: ElementoLibreria[]) => void): () => void
  }
  invia(destinazione: string, elementoId: string, intenzione: Intenzione): Promise<void>
  onConsegna(listener: (consegna: Consegna) => void): () => void
  chiudi(): Promise<void>
}

declare global {
  interface Window {
    daprodSuite?: ApiSuite
  }
}

/** true quando il Visualizer gira dentro la suite. */
export function dentroLaSuite(): boolean {
  return typeof window !== 'undefined' && window.daprodSuite !== undefined
}

export async function elencoLibreria(tipo?: TipoElemento): Promise<ElementoLibreria[]> {
  if (!window.daprodSuite) return []
  try {
    return await window.daprodSuite.libreria.elenco(tipo ? { tipo } : undefined)
  } catch {
    return []
  }
}

export async function mostraNellaCartella(id: string): Promise<void> {
  await window.daprodSuite?.libreria.mostraNellaCartella(id)
}

/** Si iscrive ai cambi della libreria. Restituisce come disiscriversi. */
export function alCambioLibreria(listener: (elementi: ElementoLibreria[]) => void): () => void {
  return window.daprodSuite?.libreria.onCambiata(listener) ?? (() => {})
}

/** Si iscrive agli elementi che le altre app mandano qui. */
export function allaConsegna(listener: (consegna: Consegna) => void): () => void {
  return window.daprodSuite?.onConsegna(listener) ?? (() => {})
}

/**
 * Un elemento della libreria nella forma che `addFiles` si aspetta.
 *
 * `file` è null perché non arriva dal drag & drop: c'è il percorso, e con quello
 * il controller sa già ricavare URL riproducibile, tag e metadati.
 */
export function comeFileInIngresso(elemento: ElementoLibreria): IncomingFile {
  return {
    file: null,
    // Il nome deve conservare l'estensione: il riconoscimento del formato la legge.
    name: nomeConEstensione(elemento),
    size: elemento.bytes,
    path: elemento.percorso,
  }
}

function nomeConEstensione(elemento: ElementoLibreria): string {
  const estensione = elemento.percorso.slice(elemento.percorso.lastIndexOf('.'))
  return elemento.nome.toLowerCase().endsWith(estensione.toLowerCase())
    ? elemento.nome
    : `${elemento.nome}${estensione}`
}
