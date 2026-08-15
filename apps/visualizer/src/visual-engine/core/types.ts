import type { Camera, Scene, WebGLRenderer } from 'three'
import type { AudioVisualFrame, ResolvedQuality } from '@/audio/types'

export type PresetCategory =
  | 'Astratto'
  | 'Spazio'
  | 'Liquido'
  | 'Geometrico'
  | 'Retro'
  | 'Minimal'
  | 'Psichedelico'

export type PerformanceCost = 'low' | 'medium' | 'high'

export interface PresetParameterSpec {
  type: 'number' | 'boolean' | 'color'
  default: number | boolean | string
  min?: number
  max?: number
  step?: number
  label?: string
}

export interface AudioMapping {
  source: 'bass' | 'mid' | 'treble' | 'rms' | 'peak' | 'beat' | 'onset' | 'centroid' | 'energy'
  target: string
  amount: number
  smoothing: number
}

/** Contenuto di preset.json (06_PRESET_FORMAT.md). */
export interface PresetManifest {
  schemaVersion: number
  id: string
  name: string
  author: string
  version: string
  category: PresetCategory
  description: string
  preview?: string
  entry: string
  performance: PerformanceCost
  minimumRenderer: 'webgl' | 'webgl2'
  parameters: Record<string, PresetParameterSpec>
  audioMappings: AudioMapping[]
}

/** Risorse messe a disposizione del preset alla creazione. */
export interface PresetContext {
  renderer: WebGLRenderer
  width: number
  height: number
  pixelRatio: number
  quality: ResolvedQuality
  /** Moltiplicatore del budget geometrico: 0.35 su qualita' bassa, 1.5 su ultra. */
  budget: number
  /** Generatore pseudocasuale deterministico del preset. */
  random(): number
}

/**
 * Interfaccia dei preset (06_PRESET_FORMAT.md).
 * Il preset non renderizza da solo: espone scena e camera, e' l'engine a
 * disegnarle sul render target giusto, cosi' le transizioni restano centralizzate.
 */
export interface VisualPreset {
  readonly scene: Scene
  readonly camera: Camera
  /** Colore di fondo usato quando il preset non copre tutto il frame. */
  readonly clearColor: number
  init(context: PresetContext): void | Promise<void>
  update(frame: AudioVisualFrame): void
  resize(width: number, height: number, pixelRatio: number): void
  setParameter(name: string, value: unknown): void
  dispose(): void
}

/** Un preset registrato: manifest + fabbrica. */
export interface PresetEntry {
  manifest: PresetManifest
  create(): VisualPreset
}

export type TransitionMode = 'dissolve' | 'zoom' | 'ripple' | 'slice'
