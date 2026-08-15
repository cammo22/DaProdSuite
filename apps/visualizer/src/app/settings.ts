import type { AnalyzerSensitivity } from '@/audio/types'

export type QualitySetting = 'low' | 'medium' | 'high' | 'ultra' | 'auto'
export type FpsCap = 30 | 60 | 120 | 0
export type ThemeName = 'blue' | 'violet' | 'aqua' | 'magma'
export type TransitionName = 'dissolve' | 'zoom' | 'ripple' | 'slice' | 'random'
export type RepeatMode = 'off' | 'one' | 'all'

export interface Settings {
  /** Livello qualita' del renderer; "auto" attiva la risoluzione adattiva. */
  quality: QualitySetting
  /** Limite FPS: 0 = illimitato. */
  fpsCap: FpsCap
  sensitivity: AnalyzerSensitivity
  /** Intensita' effetti 0..2. */
  intensity: number
  /** Durata media di un preset in secondi. */
  presetDuration: number
  /** Cambio preset automatico a tempo. */
  autoSwitch: boolean
  /** Il cambio automatico aspetta un beat forte per scattare. */
  switchOnEvent: boolean
  transition: TransitionName
  /** Avvia la musica appena si trascinano file. */
  autoplayOnDrop: boolean
  /** Scarta i file gia' presenti in coda. */
  preventDuplicates: boolean
  /** Ricorda la coda fra un avvio e l'altro (richiede il guscio desktop). */
  rememberQueue: boolean
  theme: ThemeName
  /** Scala interfaccia 1..2 (100%-200%). */
  uiScale: number
  reducedMotion: boolean
  /** Mostra il pannello diagnostico FPS. */
  showStats: boolean
  language: 'it'
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  fpsCap: 60,
  sensitivity: { global: 1, bass: 1, mid: 1, treble: 1 },
  intensity: 1,
  presetDuration: 45,
  autoSwitch: false,
  switchOnEvent: true,
  transition: 'random',
  autoplayOnDrop: true,
  preventDuplicates: true,
  rememberQueue: false,
  theme: 'blue',
  uiScale: 1,
  reducedMotion: false,
  showStats: false,
  language: 'it',
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

const QUALITIES: QualitySetting[] = ['low', 'medium', 'high', 'ultra', 'auto']
const CAPS: FpsCap[] = [30, 60, 120, 0]
const THEMES: ThemeName[] = ['blue', 'violet', 'aqua', 'magma']
const TRANSITIONS: TransitionName[] = ['dissolve', 'zoom', 'ripple', 'slice', 'random']

/**
 * Ricostruisce impostazioni valide da dati potenzialmente vecchi o manomessi:
 * un file di configurazione rotto non deve impedire l'avvio.
 */
export function normalizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (typeof raw !== 'object' || raw === null) return { ...d }
  const s = raw as Partial<Settings>
  const sens = (s.sensitivity ?? {}) as Partial<AnalyzerSensitivity>

  const pick = <T>(value: unknown, allowed: T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback
  const num = (value: unknown, lo: number, hi: number, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? clamp(value, lo, hi) : fallback
  const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback

  return {
    quality: pick(s.quality, QUALITIES, d.quality),
    fpsCap: pick(s.fpsCap, CAPS, d.fpsCap),
    sensitivity: {
      global: num(sens.global, 0.2, 3, d.sensitivity.global),
      bass: num(sens.bass, 0.2, 3, d.sensitivity.bass),
      mid: num(sens.mid, 0.2, 3, d.sensitivity.mid),
      treble: num(sens.treble, 0.2, 3, d.sensitivity.treble),
    },
    intensity: num(s.intensity, 0, 2, d.intensity),
    presetDuration: num(s.presetDuration, 10, 600, d.presetDuration),
    autoSwitch: bool(s.autoSwitch, d.autoSwitch),
    switchOnEvent: bool(s.switchOnEvent, d.switchOnEvent),
    transition: pick(s.transition, TRANSITIONS, d.transition),
    autoplayOnDrop: bool(s.autoplayOnDrop, d.autoplayOnDrop),
    preventDuplicates: bool(s.preventDuplicates, d.preventDuplicates),
    rememberQueue: bool(s.rememberQueue, d.rememberQueue),
    theme: pick(s.theme, THEMES, d.theme),
    uiScale: num(s.uiScale, 1, 2, d.uiScale),
    reducedMotion: bool(s.reducedMotion, d.reducedMotion),
    showStats: bool(s.showStats, d.showStats),
    language: 'it',
  }
}
