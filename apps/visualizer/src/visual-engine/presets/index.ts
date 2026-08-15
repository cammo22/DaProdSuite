import type { PresetEntry, PresetManifest } from '../core/types'
import { neonTunnel } from './NeonTunnel/scene'
import { electricStorm } from './ElectricStorm/scene'
import { liquidChrome } from './LiquidChrome/scene'
import { inchiostro } from './Inchiostro/scene'
import { cosmicDust } from './CosmicDust/scene'
import { retroGrid } from './RetroGrid/scene'
import { glitchTape } from './GlitchTape/scene'
import { audioBloom } from './AudioBloom/scene'
import { fractalPulse } from './FractalPulse/scene'
import { minimalRings } from './MinimalRings/scene'
import { napoliLava } from './NapoliLava/scene'

/** Catalogo nell'ordine in cui compare nella barra e che segue il tasto P. */
export const PRESETS: readonly PresetEntry[] = [
  neonTunnel,
  electricStorm,
  liquidChrome,
  inchiostro,
  cosmicDust,
  retroGrid,
  glitchTape,
  audioBloom,
  fractalPulse,
  minimalRings,
  napoliLava,
]

const BY_ID = new Map(PRESETS.map((entry) => [entry.manifest.id, entry]))

/** Preset mostrato all'avvio. */
export const DEFAULT_PRESET_ID = 'daprod.neon-tunnel'

/** Preset di riserva: nessun ciclo nello shader, gira ovunque. */
export const FALLBACK_PRESET_ID = 'daprod.minimal-rings'

export function getPresetEntry(id: string): PresetEntry | undefined {
  return BY_ID.get(id)
}

export function presetIds(): string[] {
  return PRESETS.map((entry) => entry.manifest.id)
}

export function presetManifests(): PresetManifest[] {
  return PRESETS.map((entry) => entry.manifest)
}

export function presetName(id: string): string {
  return BY_ID.get(id)?.manifest.name ?? id
}
