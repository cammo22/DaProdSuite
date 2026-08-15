import type { ResolvedQuality } from '@/audio/types'
import type { FpsCap, QualitySetting } from '@/app/settings'
import { createLogger } from '@/lib/log'

const log = createLogger('quality')

interface QualityProfile {
  /** Tetto del pixel ratio interno. */
  maxPixelRatio: number
  /** Altezza massima del buffer interno; 0 = nessun limite. */
  maxHeight: number
  /** Moltiplicatore del budget geometrico dei preset. */
  budget: number
  bloom: boolean
  bloomIterations: number
}

const PROFILES: Record<ResolvedQuality, QualityProfile> = {
  low: { maxPixelRatio: 1, maxHeight: 720, budget: 0.35, bloom: false, bloomIterations: 0 },
  medium: { maxPixelRatio: 1.25, maxHeight: 1440, budget: 0.7, bloom: true, bloomIterations: 2 },
  high: { maxPixelRatio: 1.75, maxHeight: 2160, budget: 1, bloom: true, bloomIterations: 3 },
  ultra: { maxPixelRatio: 2.5, maxHeight: 0, budget: 1.5, bloom: true, bloomIterations: 4 },
}

/** Frame consecutivi sotto soglia prima di scendere di risoluzione. */
const DROP_AFTER = 40
/** Frame consecutivi sopra soglia prima di risalire: la risalita e' pigra apposta. */
const RAISE_AFTER = 260

/**
 * Qualita' adattiva (05_VISUAL_ENGINE.md).
 *
 * In modalita' "auto" parte da "high" e riduce la scala interna quando gli FPS
 * scendono; risale solo dopo una stabilita' prolungata, per non oscillare.
 */
export class QualityManager {
  private setting: QualitySetting = 'auto'
  private cap: FpsCap = 60
  private scale = 1
  private fpsSmooth = 60
  private lowFrames = 0
  private goodFrames = 0
  private resolvedAuto: ResolvedQuality = 'high'

  setQuality(setting: QualitySetting): void {
    if (this.setting === setting) return
    this.setting = setting
    this.scale = 1
    this.lowFrames = 0
    this.goodFrames = 0
    this.resolvedAuto = 'high'
  }

  setFpsCap(cap: FpsCap): void {
    this.cap = cap
  }

  get fpsCap(): FpsCap {
    return this.cap
  }

  get fps(): number {
    return this.fpsSmooth
  }

  get resolved(): ResolvedQuality {
    return this.setting === 'auto' ? this.resolvedAuto : this.setting
  }

  get profile(): QualityProfile {
    return PROFILES[this.resolved]
  }

  get budget(): number {
    return this.profile.budget
  }

  /** Scala adattiva applicata sopra il profilo, 0.45..1. */
  get adaptiveScale(): number {
    return this.scale
  }

  /** Obiettivo FPS su cui misurare il calo. */
  private get targetFps(): number {
    if (this.cap === 0) return 60
    return this.cap
  }

  /** Pixel ratio finale da usare per il buffer interno. */
  pixelRatio(devicePixelRatio: number, cssHeight: number): number {
    const profile = this.profile
    let ratio = Math.min(devicePixelRatio, profile.maxPixelRatio) * this.scale
    if (profile.maxHeight > 0 && cssHeight > 0) {
      ratio = Math.min(ratio, profile.maxHeight / cssHeight)
    }
    return Math.max(0.4, ratio)
  }

  /** Aggiorna la stima FPS e, in "auto", la scala interna. */
  sample(dt: number): void {
    if (dt > 0) {
      const instant = 1 / dt
      // Media mobile lenta: un singolo frame lungo non deve far crollare la qualita'.
      this.fpsSmooth += (instant - this.fpsSmooth) * 0.06
    }
    if (this.setting !== 'auto') return

    const target = this.targetFps
    if (this.fpsSmooth < target * 0.82) {
      this.lowFrames++
      this.goodFrames = 0
    } else if (this.fpsSmooth > target * 0.96) {
      this.goodFrames++
      this.lowFrames = 0
    } else {
      this.lowFrames = 0
      this.goodFrames = 0
    }

    if (this.lowFrames >= DROP_AFTER) {
      this.lowFrames = 0
      this.stepDown()
    } else if (this.goodFrames >= RAISE_AFTER) {
      this.goodFrames = 0
      this.stepUp()
    }
  }

  private stepDown(): void {
    if (this.scale > 0.5) {
      this.scale = Math.max(0.45, this.scale * 0.85)
      log.info(`qualita' ridotta: scala ${this.scale.toFixed(2)} a ${this.fpsSmooth.toFixed(0)} FPS`)
      return
    }
    // Scala gia' al minimo: si scende di profilo.
    if (this.resolvedAuto === 'ultra') this.resolvedAuto = 'high'
    else if (this.resolvedAuto === 'high') this.resolvedAuto = 'medium'
    else if (this.resolvedAuto === 'medium') this.resolvedAuto = 'low'
    else return
    this.scale = 1
    log.info(`qualita' ridotta a "${this.resolvedAuto}"`)
  }

  private stepUp(): void {
    if (this.scale < 1) {
      this.scale = Math.min(1, this.scale * 1.08)
      return
    }
    if (this.resolvedAuto === 'low') this.resolvedAuto = 'medium'
    else if (this.resolvedAuto === 'medium') this.resolvedAuto = 'high'
    else return
    this.scale = 0.9
    log.info(`qualita' aumentata a "${this.resolvedAuto}"`)
  }
}
