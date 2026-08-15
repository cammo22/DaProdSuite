import { Emitter } from '@/lib/emitter'
import { createLogger } from '@/lib/log'
import { AudioAnalyzer } from './AudioAnalyzer'
import type { AnalyzerSensitivity, AudioFeatures } from './types'

const log = createLogger('audio')

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export interface AudioEngineEvents {
  /** La traccia e' finita da sola (non per uno stop manuale). */
  ended: void
  /** Errore di decodifica o sorgente non riproducibile. */
  error: { message: string; code: string }
  /** Metadati pronti: durata affidabile. */
  loaded: { duration: number }
  statechange: PlaybackState
  volumechange: { volume: number; muted: boolean }
}

/**
 * Riproduzione e analisi in un unico punto.
 *
 * Catena: <audio> -> MediaElementSource -> gain -> analyser -> destination.
 * L'elemento <audio> gestisce decodifica in streaming, seek e durata; l'AnalyserNode
 * espone lo spettro dello stesso segnale che esce dagli altoparlanti, quindi
 * immagine e suono restano allineati senza bisogno di sincronizzazione.
 */
export class AudioEngine {
  readonly events = new Emitter<AudioEngineEvents>()

  private readonly element: HTMLAudioElement
  private context: AudioContext | null = null
  private source: MediaElementAudioSourceNode | null = null
  private gain: GainNode | null = null
  private analyzerInstance: AudioAnalyzer | null = null

  private state: PlaybackState = 'idle'
  private currentUrl: string | null = null
  private volumeValue = 0.8
  private mutedValue = false
  private pendingSensitivity: AnalyzerSensitivity = { global: 1, bass: 1, mid: 1, treble: 1 }
  /** Alza la guardia mentre cambiamo sorgente, per non scambiare un abort per un errore. */
  private swapping = false

  constructor() {
    const el = new Audio()
    el.preload = 'auto'
    el.crossOrigin = 'anonymous'
    el.volume = 1 // il volume reale passa dal GainNode
    this.element = el

    el.addEventListener('loadedmetadata', () => {
      this.events.emit('loaded', { duration: Number.isFinite(el.duration) ? el.duration : 0 })
    })
    el.addEventListener('playing', () => this.setState('playing'))
    el.addEventListener('pause', () => {
      if (!el.ended && this.state !== 'idle' && this.state !== 'error') this.setState('paused')
    })
    el.addEventListener('waiting', () => {
      if (this.state === 'playing') this.setState('loading')
    })
    el.addEventListener('ended', () => {
      this.setState('ended')
      this.events.emit('ended', undefined)
    })
    el.addEventListener('error', () => {
      if (this.swapping) return
      const err = el.error
      const code = err ? mediaErrorCode(err.code) : 'UNKNOWN'
      log.error('riproduzione fallita', { code, src: this.currentUrl })
      this.setState('error')
      this.events.emit('error', { message: describeMediaError(code), code })
    })
  }

  // --- Ciclo di vita del contesto ------------------------------------------

  /**
   * Crea il grafo audio. Va chiamato dopo una interazione utente, altrimenti il
   * browser tiene l'AudioContext sospeso.
   */
  ensureContext(): AudioContext {
    if (this.context) {
      void this.resume()
      return this.context
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    const source = ctx.createMediaElementSource(this.element)
    const gain = ctx.createGain()
    const analyzer = new AudioAnalyzer(ctx)
    analyzer.setSensitivity(this.pendingSensitivity)

    source.connect(gain)
    gain.connect(analyzer.node)
    analyzer.node.connect(ctx.destination)

    this.context = ctx
    this.source = source
    this.gain = gain
    this.analyzerInstance = analyzer
    this.applyGain()

    log.info('contesto audio creato', { sampleRate: ctx.sampleRate })
    return ctx
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume()
      } catch (error) {
        log.warn('resume del contesto fallito', error)
      }
    }
  }

  get analyzer(): AudioAnalyzer | null {
    return this.analyzerInstance
  }

  get playbackState(): PlaybackState {
    return this.state
  }

  get duration(): number {
    return Number.isFinite(this.element.duration) ? this.element.duration : 0
  }

  get position(): number {
    return this.element.currentTime
  }

  get isPlaying(): boolean {
    return !this.element.paused && !this.element.ended && this.state !== 'error'
  }

  get volume(): number {
    return this.volumeValue
  }

  get muted(): boolean {
    return this.mutedValue
  }

  /** Buffer gia' scaricato, 0..1: serve alla barra di avanzamento. */
  get buffered(): number {
    const ranges = this.element.buffered
    const total = this.duration
    if (ranges.length === 0 || total <= 0) return 0
    return Math.min(1, ranges.end(ranges.length - 1) / total)
  }

  // --- Comandi --------------------------------------------------------------

  /** Carica una sorgente. `autoplay` avvia appena i dati sono sufficienti. */
  async load(url: string, autoplay: boolean): Promise<void> {
    this.ensureContext()
    this.swapping = true
    this.currentUrl = url
    this.setState('loading')
    this.analyzerInstance?.reset()

    this.element.pause()
    this.element.src = url
    this.element.load()
    // L'evento "error" dello swap precedente arriva sul task successivo.
    queueMicrotask(() => {
      this.swapping = false
    })

    if (autoplay) await this.play()
  }

  async play(): Promise<void> {
    if (!this.currentUrl) return
    this.ensureContext()
    await this.resume()
    try {
      await this.element.play()
    } catch (error) {
      // AbortError capita quando si cambia traccia rapidamente: non e' un guasto.
      if (error instanceof DOMException && error.name === 'AbortError') return
      log.warn('play rifiutato', error)
      this.setState('paused')
    }
  }

  pause(): void {
    this.element.pause()
  }

  async toggle(): Promise<void> {
    if (this.isPlaying) this.pause()
    else await this.play()
  }

  /** Ferma e libera la sorgente corrente. */
  stop(): void {
    this.swapping = true
    this.element.pause()
    this.element.removeAttribute('src')
    this.element.load()
    this.currentUrl = null
    this.analyzerInstance?.reset()
    this.setState('idle')
    queueMicrotask(() => {
      this.swapping = false
    })
  }

  seek(seconds: number): void {
    const total = this.duration
    if (total <= 0) return
    const target = Math.max(0, Math.min(total - 0.05, seconds))
    try {
      this.element.currentTime = target
    } catch (error) {
      log.warn('seek non riuscito', error)
    }
  }

  seekBy(delta: number): void {
    this.seek(this.position + delta)
  }

  setVolume(value: number): void {
    this.volumeValue = Math.max(0, Math.min(1, value))
    if (this.volumeValue > 0) this.mutedValue = false
    this.applyGain()
    this.events.emit('volumechange', { volume: this.volumeValue, muted: this.mutedValue })
  }

  setMuted(value: boolean): void {
    this.mutedValue = value
    this.applyGain()
    this.events.emit('volumechange', { volume: this.volumeValue, muted: this.mutedValue })
  }

  setSensitivity(sensitivity: AnalyzerSensitivity): void {
    this.pendingSensitivity = sensitivity
    this.analyzerInstance?.setSensitivity(sensitivity)
  }

  /**
   * Calcola le feature del frame corrente. Chiamata dal loop di rendering.
   * Se il contesto non esiste ancora restituisce feature nulle: i preset girano
   * comunque, semplicemente immobili.
   */
  sample(dt: number): AudioFeatures | null {
    const analyzer = this.analyzerInstance
    if (!analyzer) return null
    const active = this.isPlaying && this.context?.state === 'running'
    const features = analyzer.analyze(dt, this.position, active)
    analyzer.fillWaveform(active)
    return features
  }

  dispose(): void {
    this.stop()
    this.events.clear()
    try {
      this.source?.disconnect()
      this.gain?.disconnect()
      this.analyzerInstance?.node.disconnect()
      void this.context?.close()
    } catch (error) {
      log.warn('chiusura contesto non pulita', error)
    }
    this.context = null
    this.source = null
    this.gain = null
    this.analyzerInstance = null
  }

  private applyGain(): void {
    if (!this.gain || !this.context) return
    const target = this.mutedValue ? 0 : gammaVolume(this.volumeValue)
    // Rampa breve: evita i click sul cambio volume.
    const now = this.context.currentTime
    this.gain.gain.cancelScheduledValues(now)
    this.gain.gain.setTargetAtTime(target, now, 0.015)
  }

  private setState(next: PlaybackState): void {
    if (this.state === next) return
    this.state = next
    this.events.emit('statechange', next)
  }
}

/** Il volume percepito non e' lineare: curva di potenza ~2. */
function gammaVolume(v: number): number {
  return v * v
}

function mediaErrorCode(code: number): string {
  switch (code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'ABORTED'
    case MediaError.MEDIA_ERR_NETWORK:
      return 'NETWORK'
    case MediaError.MEDIA_ERR_DECODE:
      return 'DECODE'
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'UNSUPPORTED'
    default:
      return 'UNKNOWN'
  }
}

function describeMediaError(code: string): string {
  switch (code) {
    case 'DECODE':
      return 'File audio danneggiato o non decodificabile.'
    case 'UNSUPPORTED':
      return 'Formato non supportato dal decoder.'
    case 'NETWORK':
      return 'Lettura del file interrotta.'
    case 'ABORTED':
      return 'Caricamento annullato.'
    default:
      return 'Errore sconosciuto durante la riproduzione.'
  }
}
