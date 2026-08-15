import type { WebGLRenderer } from 'three'
import type { AudioVisualFrame } from '@/audio/types'
import { createLogger } from '@/lib/log'
import { FALLBACK_PRESET_ID, getPresetEntry, presetIds } from '../presets'
import type { PresetContext, TransitionMode, VisualPreset } from './types'

const log = createLogger('preset')

/** Durata della transizione fra due preset, in secondi. */
const TRANSITION_TIME = 1.4

/** Dopo quanto rinunciare ad aspettare un beat per il cambio automatico. */
const BEAT_WAIT_LIMIT = 8

export interface PresetHostConfig {
  autoSwitch: boolean
  switchOnEvent: boolean
  presetDuration: number
  transition: TransitionMode | 'random'
}

export interface PresetHostCallbacks {
  onPresetChanged(id: string): void
  onShaderFailure(id: string, message: string): void
}

/**
 * Cicli di vita dei preset, transizioni e cambio automatico.
 *
 * Un preset che non compila non blocca l'app: viene scartato e si ripiega su
 * Minimal Rings, come richiesto da 09_ACCEPTANCE_CRITERIA.md.
 */
export class PresetHost {
  private current: VisualPreset | null = null
  private currentId = FALLBACK_PRESET_ID
  private incoming: VisualPreset | null = null
  private incomingId: string | null = null

  private mix = 0
  private mode: TransitionMode = 'dissolve'
  private sinceSwitch = 0
  private waitingForBeat = false
  private waitedForBeat = 0

  private config: PresetHostConfig = {
    autoSwitch: false,
    switchOnEvent: true,
    presetDuration: 45,
    transition: 'random',
  }

  private width = 1
  private height = 1
  private pixelRatio = 1

  /** Impostato dal renderer quando uno shader non compila. */
  shaderError: string | null = null

  private readonly renderer: WebGLRenderer
  private readonly callbacks: PresetHostCallbacks

  constructor(renderer: WebGLRenderer, callbacks: PresetHostCallbacks) {
    this.renderer = renderer
    this.callbacks = callbacks
  }

  get activeId(): string {
    return this.incomingId ?? this.currentId
  }

  get transitionMix(): number {
    return this.mix
  }

  get transitionMode(): TransitionMode {
    return this.mode
  }

  get isTransitioning(): boolean {
    return this.incoming !== null
  }

  get currentPreset(): VisualPreset | null {
    return this.current
  }

  get incomingPreset(): VisualPreset | null {
    return this.incoming
  }

  setConfig(config: PresetHostConfig): void {
    this.config = config
  }

  setViewport(width: number, height: number, pixelRatio: number): void {
    this.width = width
    this.height = height
    this.pixelRatio = pixelRatio
    this.current?.resize(width, height, pixelRatio)
    this.incoming?.resize(width, height, pixelRatio)
  }

  /**
   * Passa al preset indicato.
   * @param immediate salta la transizione (avvio iniziale o cambio forzato).
   */
  activate(id: string, budget: number, quality: PresetContext['quality'], immediate = false): void {
    if (id === this.activeId && this.current) return

    const preset = this.instantiate(id, budget, quality)
    if (!preset) return

    this.sinceSwitch = 0
    this.waitingForBeat = false
    this.waitedForBeat = 0

    if (immediate || !this.current) {
      this.finishTransitionInto(preset, id)
      return
    }

    // Se una transizione era gia' in corso, il preset a meta' strada viene scartato.
    if (this.incoming) {
      this.incoming.dispose()
      this.incoming = null
      this.incomingId = null
    }

    this.incoming = preset
    this.incomingId = id
    this.mix = 0
    this.mode = this.pickMode()
    this.callbacks.onPresetChanged(id)
  }

  /** Preset successivo/precedente nell'ordine del catalogo. */
  step(delta: number, budget: number, quality: PresetContext['quality']): void {
    const ids = presetIds()
    const index = ids.indexOf(this.activeId)
    const next = ids[(index + delta + ids.length) % ids.length]
    this.activate(next, budget, quality)
  }

  /** Preset casuale diverso da quello attivo. */
  random(budget: number, quality: PresetContext['quality'], pool?: string[]): void {
    const ids = (pool && pool.length > 1 ? pool : presetIds()).filter((id) => id !== this.activeId)
    if (ids.length === 0) return
    this.activate(ids[Math.floor(Math.random() * ids.length)], budget, quality)
  }

  /** Avanza transizione, timer di cambio automatico e stato dei preset. */
  update(frame: AudioVisualFrame, budget: number, quality: PresetContext['quality'], pool?: string[]): void {
    this.current?.update(frame)
    this.incoming?.update(frame)

    if (this.incoming) {
      this.mix += frame.delta / TRANSITION_TIME
      if (this.mix >= 1) {
        this.finishTransitionInto(this.incoming, this.incomingId ?? this.currentId)
      }
      return
    }

    if (!this.config.autoSwitch) return
    this.sinceSwitch += frame.delta

    if (!this.waitingForBeat && this.sinceSwitch >= this.config.presetDuration) {
      if (!this.config.switchOnEvent) {
        this.random(budget, quality, pool)
        return
      }
      this.waitingForBeat = true
      this.waitedForBeat = 0
    }

    if (this.waitingForBeat) {
      this.waitedForBeat += frame.delta
      const strongBeat = frame.audio.beat > 0.85 && frame.audio.energy > 0.25
      if (strongBeat || this.waitedForBeat > BEAT_WAIT_LIMIT) {
        this.random(budget, quality, pool)
      }
    }
  }

  dispose(): void {
    this.current?.dispose()
    this.current = null
    this.incoming?.dispose()
    this.incoming = null
    this.incomingId = null
  }

  private finishTransitionInto(preset: VisualPreset, id: string): void {
    if (this.current && this.current !== preset) this.current.dispose()
    this.current = preset
    this.currentId = id
    this.incoming = null
    this.incomingId = null
    this.mix = 0
    this.sinceSwitch = 0
    this.callbacks.onPresetChanged(id)
  }

  private pickMode(): TransitionMode {
    if (this.config.transition !== 'random') return this.config.transition
    const modes: TransitionMode[] = ['dissolve', 'zoom', 'ripple', 'slice']
    // Mai due volte di fila la stessa: il cambio deve sorprendere.
    const pool = modes.filter((m) => m !== this.mode)
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /** Crea e inizializza un preset; su errore ripiega sul preset di sicurezza. */
  private instantiate(
    id: string,
    budget: number,
    quality: PresetContext['quality'],
    allowFallback = true,
  ): VisualPreset | null {
    const entry = getPresetEntry(id)
    if (!entry) {
      log.warn(`preset "${id}" inesistente`)
      return allowFallback ? this.instantiate(FALLBACK_PRESET_ID, budget, quality, false) : null
    }

    this.shaderError = null
    let preset: VisualPreset | null = null

    try {
      preset = entry.create()
      const context: PresetContext = {
        renderer: this.renderer,
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio,
        quality,
        budget,
        random: makeRandom(id),
      }
      const result = preset.init(context)
      if (result instanceof Promise) {
        // Nessuno dei preset di serie e' asincrono: se lo diventasse, va gestito qui.
        throw new Error('init asincrono non supportato')
      }
      preset.resize(this.width, this.height, this.pixelRatio)

      // Compila subito gli shader: cosi' un errore emerge prima del primo frame.
      this.renderer.compile(preset.scene, preset.camera)
      if (this.shaderError) throw new Error(this.shaderError)

      log.info(`preset "${id}" pronto`)
      return preset
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`preset "${id}" non inizializzato`, message)
      try {
        preset?.dispose()
      } catch {
        /* il preset era gia' rotto: ignoriamo */
      }
      this.callbacks.onShaderFailure(id, message)
      if (!allowFallback || id === FALLBACK_PRESET_ID) return null
      return this.instantiate(FALLBACK_PRESET_ID, budget, quality, false)
    }
  }
}

/** PRNG deterministico per preset: due sessioni mostrano lo stesso layout iniziale. */
function makeRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
