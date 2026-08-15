import { LinearSRGBColorSpace, WebGLRenderer } from 'three'
import type { AudioFeatures, AudioVisualFrame, ResolvedQuality } from '@/audio/types'
import { createEmptyFeatures } from '@/audio/types'
import type { Settings } from '@/app/settings'
import { createLogger } from '@/lib/log'
import { PostProcessor } from './PostProcessor'
import { PresetHost } from './PresetHost'
import { QualityManager } from './QualityManager'
import { FALLBACK_PRESET_ID } from '../presets'

const log = createLogger('engine')

/** Delta massimo accettato: dopo un blocco lungo i preset non devono saltare. */
const MAX_DELTA = 0.1

export interface EngineStats {
  fps: number
  quality: ResolvedQuality
  width: number
  height: number
  pixelRatio: number
  presetId: string
  transitioning: boolean
  /** BPM stimato dall'analizzatore, 0 finche' non e' affidabile. */
  bpm: number
}

export interface VisualEngineOptions {
  canvas: HTMLCanvasElement
  /** Fornisce le feature del frame; null quando il motore audio non e' pronto. */
  sampleAudio(dt: number): AudioFeatures | null
  onPresetChanged(id: string): void
  onStats(stats: EngineStats): void
  onFailure(message: string): void
}

/**
 * Orchestratore del rendering: possiede renderer, post-processing, preset e
 * loop a frame. Vive fuori da React: nessun re-render per frame.
 */
export class VisualEngine {
  private readonly renderer: WebGLRenderer
  private readonly post: PostProcessor
  private readonly quality = new QualityManager()
  private readonly host: PresetHost
  private readonly options: VisualEngineOptions

  private raf = 0
  private running = false
  private lastTime = 0
  private frameIndex = 0
  private statsTimer = 0

  private cssWidth = 1
  private cssHeight = 1
  private bufferWidth = 0
  private bufferHeight = 0
  private currentPixelRatio = 1

  private intensity = 1
  private pool: string[] = []
  private disposed = false

  private readonly emptyFeatures = createEmptyFeatures()
  private readonly frame: AudioVisualFrame

  constructor(options: VisualEngineOptions) {
    this.options = options

    const renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: false, // l'antialias lo compensa il post-processing
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false,
    })
    // Pipeline lineare dall'inizio alla fine: i preset scrivono colori gia' finali.
    renderer.outputColorSpace = LinearSRGBColorSpace
    renderer.autoClear = true
    renderer.debug.checkShaderErrors = true
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      const vsLog = gl.getShaderInfoLog(vertexShader) ?? ''
      const fsLog = gl.getShaderInfoLog(fragmentShader) ?? ''
      const linkLog = gl.getProgramInfoLog(program) ?? ''
      this.host.shaderError = [vsLog, fsLog, linkLog].filter(Boolean).join(' | ').slice(0, 400)
    }
    this.renderer = renderer

    this.post = new PostProcessor(1, 1)
    this.host = new PresetHost(renderer, {
      onPresetChanged: (id) => options.onPresetChanged(id),
      onShaderFailure: (id, message) => {
        log.error(`shader del preset "${id}" non compilato`, message)
        options.onFailure(`Il preset "${id}" non e' compilabile su questa GPU. Uso un preset di riserva.`)
      },
    })

    this.frame = {
      elapsed: 0,
      delta: 0,
      frameIndex: 0,
      audio: this.emptyFeatures,
      intensity: 1,
      width: 1,
      height: 1,
      pixelRatio: 1,
      quality: 'high',
    }

    options.canvas.addEventListener('webglcontextlost', this.onContextLost)
  }

  // --- Configurazione --------------------------------------------------------

  applySettings(settings: Settings): void {
    this.quality.setQuality(settings.quality)
    this.quality.setFpsCap(settings.fpsCap)
    this.intensity = settings.intensity
    this.host.setConfig({
      autoSwitch: settings.autoSwitch,
      switchOnEvent: settings.switchOnEvent,
      presetDuration: settings.presetDuration,
      transition: settings.transition,
    })
  }

  /** Limita il cambio automatico ai preset indicati (es. solo i preferiti). */
  setPool(ids: string[]): void {
    this.pool = ids
  }

  setViewportSize(cssWidth: number, cssHeight: number): void {
    this.cssWidth = Math.max(1, cssWidth)
    this.cssHeight = Math.max(1, cssHeight)
  }

  // --- Preset ----------------------------------------------------------------

  activatePreset(id: string, immediate = false): void {
    this.host.activate(id, this.quality.budget, this.quality.resolved, immediate)
  }

  nextPreset(): void {
    this.host.step(1, this.quality.budget, this.quality.resolved)
  }

  previousPreset(): void {
    this.host.step(-1, this.quality.budget, this.quality.resolved)
  }

  randomPreset(): void {
    this.host.random(this.quality.budget, this.quality.resolved, this.pool)
  }

  get activePresetId(): string {
    return this.host.activeId
  }

  // --- Loop ------------------------------------------------------------------

  start(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.lastTime = performance.now()
    if (!this.host.currentPreset) {
      this.syncSize()
      this.activatePreset(FALLBACK_PRESET_ID, true)
    }
    this.raf = requestAnimationFrame(this.tick)
    log.info('loop avviato')
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.raf)
    log.info('loop fermato')
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)

    const cap = this.quality.fpsCap
    const elapsedMs = now - this.lastTime
    if (cap > 0 && elapsedMs < 1000 / cap - 1) return

    const dt = Math.min(elapsedMs / 1000, MAX_DELTA)
    this.lastTime = now

    this.quality.sample(dt)
    this.syncSize()

    const features = this.options.sampleAudio(dt) ?? this.emptyFeatures
    const frame = this.frame
    frame.elapsed += dt
    frame.delta = dt
    frame.frameIndex = ++this.frameIndex
    frame.audio = features
    frame.intensity = this.intensity
    frame.width = this.bufferWidth
    frame.height = this.bufferHeight
    frame.pixelRatio = this.currentPixelRatio
    frame.quality = this.quality.resolved

    this.host.update(frame, this.quality.budget, this.quality.resolved, this.pool)
    this.render(frame)

    this.statsTimer += dt
    if (this.statsTimer >= 0.5) {
      this.statsTimer = 0
      this.options.onStats({
        fps: this.quality.fps,
        quality: this.quality.resolved,
        width: this.bufferWidth,
        height: this.bufferHeight,
        pixelRatio: this.currentPixelRatio,
        presetId: this.host.activeId,
        transitioning: this.host.isTransitioning,
        bpm: features.bpm,
      })
    }
  }

  private render(frame: AudioVisualFrame): void {
    const renderer = this.renderer
    const current = this.host.currentPreset
    if (!current) return

    renderer.setRenderTarget(this.post.currentTarget)
    renderer.setClearColor(current.clearColor, 1)
    renderer.clear(true, true, false)
    renderer.render(current.scene, current.camera)

    let sceneTarget = this.post.currentTarget
    const incoming = this.host.incomingPreset

    if (incoming) {
      const target = this.post.incomingTarget
      renderer.setRenderTarget(target)
      renderer.setClearColor(incoming.clearColor, 1)
      renderer.clear(true, true, false)
      renderer.render(incoming.scene, incoming.camera)
      sceneTarget = this.post.blend(
        renderer,
        this.host.transitionMix,
        this.host.transitionMode,
        frame.elapsed,
      )
    } else if (!this.host.isTransitioning) {
      this.post.releaseTransitionTargets()
    }

    const profile = this.quality.profile
    const iterations = profile.bloom ? profile.bloomIterations : 0
    const strength = 0.55 + this.intensity * 0.5
    this.post.present(renderer, sceneTarget, iterations, strength, frame.elapsed)
    renderer.setRenderTarget(null)
  }

  /** Allinea buffer, post-processing e preset alla dimensione corrente. */
  private syncSize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const ratio = this.quality.pixelRatio(dpr, this.cssHeight)
    const width = Math.max(1, Math.floor(this.cssWidth * ratio))
    const height = Math.max(1, Math.floor(this.cssHeight * ratio))
    if (width === this.bufferWidth && height === this.bufferHeight) return

    this.bufferWidth = width
    this.bufferHeight = height
    this.currentPixelRatio = ratio

    this.renderer.setPixelRatio(1) // il ratio lo applichiamo noi nella dimensione
    this.renderer.setSize(width, height, false)
    // Il canvas resta al 100% del contenitore: lo stile lo impone il CSS.
    this.post.setSize(width, height)
    this.host.setViewport(width, height, ratio)
    log.debug(`buffer ${width}x${height} (ratio ${ratio.toFixed(2)})`)
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
    log.error('contesto WebGL perso')
    this.stop()
    this.options.onFailure('Contesto grafico perso. Ricarica il visualizzatore per riprenderlo.')
  }

  get stats(): EngineStats {
    return {
      fps: this.quality.fps,
      quality: this.quality.resolved,
      width: this.bufferWidth,
      height: this.bufferHeight,
      pixelRatio: this.currentPixelRatio,
      presetId: this.host.activeId,
      transitioning: this.host.isTransitioning,
      bpm: this.frame.audio.bpm,
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.options.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.host.dispose()
    this.post.dispose()
    this.renderer.dispose()
    log.info('motore visuale liberato')
  }
}
