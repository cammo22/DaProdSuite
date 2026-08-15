import type { FormatSupport } from '@/audio/formats'
import type { TrackMetadata } from '@/audio/metadata'
import type { PlaybackState } from '@/audio/AudioEngine'
import type { Settings, RepeatMode } from './settings'

export type TrackStatus = 'pending' | 'ready' | 'error'

export interface Track {
  id: string
  /** Nome del file, sempre disponibile. */
  fileName: string
  /** Dimensione in byte. */
  size: number
  /** Percorso su disco, solo con il guscio desktop. */
  path: string | null
  support: FormatSupport
  meta: TrackMetadata
  status: TrackStatus
  /** Messaggio leggibile quando status = "error". */
  error: string | null
  /** Durata confermata dal decoder; 0 finche' non e' stata riprodotta. */
  duration: number
}

export type NoticeKind = 'info' | 'warn' | 'error'

export interface Notice {
  id: string
  kind: NoticeKind
  text: string
  /** Dettaglio opzionale, es. elenco dei file scartati. */
  detail?: string
}

export type PanelName = 'none' | 'playlist' | 'presets' | 'settings' | 'libreria'

export interface AppState {
  tracks: Track[]
  currentId: string | null
  playback: PlaybackState
  /** Durata della traccia corrente in secondi. */
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  panel: PanelName
  /** Modalita' cinema: i controlli spariscono dopo 3 secondi di inattivita'. */
  cinema: boolean
  fullscreen: boolean
  /** Controlli attualmente visibili (false solo in cinema dopo l'inattivita'). */
  controlsVisible: boolean
  notices: Notice[]
  settings: Settings
  presetId: string
  favorites: string[]
  /** Import in corso: la schermata mostra l'indicatore. */
  importing: boolean
  /** Il motore visuale ha smesso di funzionare (contesto WebGL perso). */
  rendererFailed: boolean
}
