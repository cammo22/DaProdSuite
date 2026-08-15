import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  type Camera,
  type IUniform,
} from 'three'
import { BAND_COUNT, WAVE_COUNT, type AudioVisualFrame } from '@/audio/types'
import vertexShader from '../shaders/fullscreen.vert?raw'
import { AudioMappingRunner } from './audioMappings'
import type { PresetContext, PresetManifest, VisualPreset } from './types'

/**
 * Texture 1D con le bande FFT.
 * RGBA a 8 bit invece di float: e' filtrabile su qualsiasi GPU e per una barra
 * spettrale la precisione basta e avanza.
 *  r = banda corrente, g = picco che scende lentamente, b = banda smussata.
 */
export class SpectrumTexture {
  readonly texture: DataTexture
  private readonly data: Uint8Array
  private readonly peaks = new Float32Array(BAND_COUNT)
  private readonly smooth = new Float32Array(BAND_COUNT)

  constructor() {
    this.data = new Uint8Array(BAND_COUNT * 4)
    this.texture = new DataTexture(this.data, BAND_COUNT, 1, RGBAFormat, UnsignedByteType)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.wrapS = ClampToEdgeWrapping
    this.texture.wrapT = ClampToEdgeWrapping
    this.texture.needsUpdate = true
  }

  update(bands: Float32Array, dt: number): void {
    const fall = Math.min(1, dt * 1.6)
    const smoothK = 1 - Math.exp(-dt / 0.12)
    for (let i = 0; i < BAND_COUNT; i++) {
      const v = bands[i] ?? 0
      this.peaks[i] = v > this.peaks[i] ? v : this.peaks[i] - fall * 0.6
      if (this.peaks[i] < 0) this.peaks[i] = 0
      this.smooth[i] += (v - this.smooth[i]) * smoothK

      const o = i * 4
      this.data[o] = (v * 255) | 0
      this.data[o + 1] = (this.peaks[i] * 255) | 0
      this.data[o + 2] = (this.smooth[i] * 255) | 0
      this.data[o + 3] = 255
    }
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
  }
}

/** Texture 1D con la forma d'onda, centrata su 0.5. */
export class WaveTexture {
  readonly texture: DataTexture
  private readonly data: Uint8Array

  constructor() {
    this.data = new Uint8Array(WAVE_COUNT * 4)
    this.texture = new DataTexture(this.data, WAVE_COUNT, 1, RGBAFormat, UnsignedByteType)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.wrapS = ClampToEdgeWrapping
    this.texture.needsUpdate = true
  }

  update(wave: Float32Array): void {
    for (let i = 0; i < WAVE_COUNT; i++) {
      const v = Math.max(0, Math.min(1, (wave[i] ?? 0) * 0.5 + 0.5))
      const o = i * 4
      this.data[o] = (v * 255) | 0
      this.data[o + 3] = 255
    }
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
  }
}

/** Uniform audio condivisi da tutti i preset (05_VISUAL_ENGINE.md). */
export function createCommonUniforms(): Record<string, IUniform> {
  return {
    uTime: { value: 0 },
    uDelta: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uAspect: { value: 1 },
    uIntensity: { value: 1 },
    uPosition: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uRms: { value: 0 },
    uPeak: { value: 0 },
    uBeat: { value: 0 },
    uOnset: { value: 0 },
    uCentroid: { value: 0 },
    uEnergy: { value: 0 },
    uBeatCount: { value: 0 },
    uSpectrum: { value: null },
    uWave: { value: null },
  }
}

/** Riversa le feature del frame negli uniform comuni. */
export function writeCommonUniforms(uniforms: Record<string, IUniform>, frame: AudioVisualFrame): void {
  const a = frame.audio
  uniforms.uTime.value = frame.elapsed
  uniforms.uDelta.value = frame.delta
  uniforms.uIntensity.value = frame.intensity
  uniforms.uPosition.value = a.time
  uniforms.uBass.value = a.bass
  uniforms.uMid.value = a.mid
  uniforms.uTreble.value = a.treble
  uniforms.uRms.value = a.rms
  uniforms.uPeak.value = a.peak
  uniforms.uBeat.value = a.beat
  uniforms.uOnset.value = a.onset
  uniforms.uCentroid.value = a.centroid
  uniforms.uEnergy.value = a.energy
  uniforms.uBeatCount.value = a.beatCount
}

/**
 * Uniform, texture audio, parametri del manifest e audioMappings in un solo
 * oggetto riutilizzabile.
 *
 * I preset a schermo intero lo usano tramite ShaderPreset; quelli geometrici
 * (particelle, mesh) lo compongono direttamente.
 */
export class UniformKit {
  readonly uniforms: Record<string, IUniform>
  readonly mappings: AudioMappingRunner

  private readonly spectrum = new SpectrumTexture()
  private readonly wave = new WaveTexture()

  constructor(manifest: PresetManifest, extra: Record<string, IUniform> = {}) {
    this.uniforms = { ...createCommonUniforms(), ...extra }
    this.mappings = new AudioMappingRunner(manifest.audioMappings)
    this.uniforms.uSpectrum.value = this.spectrum.texture
    this.uniforms.uWave.value = this.wave.texture

    // Un uniform per ogni parametro dichiarato e per ogni target dei mapping.
    for (const [name, spec] of Object.entries(manifest.parameters)) {
      this.uniforms[uniformNameFor(name)] = {
        value: typeof spec.default === 'boolean' ? (spec.default ? 1 : 0) : spec.default,
      }
    }
    for (const target of this.mappings.targets) {
      this.uniforms[AudioMappingRunner.uniformName(target)] ??= { value: 0 }
    }
  }

  update(frame: AudioVisualFrame): void {
    writeCommonUniforms(this.uniforms, frame)
    this.mappings.update(frame.audio, frame.delta)
    for (const target of this.mappings.targets) {
      const uniform = this.uniforms[AudioMappingRunner.uniformName(target)]
      if (uniform) uniform.value = this.mappings.get(target)
    }
    this.spectrum.update(frame.audio.bands, frame.delta)
    this.wave.update(frame.audio.waveform)
  }

  resize(width: number, height: number): void {
    const res = this.uniforms.uResolution.value as Vector2
    res.set(width, height)
    this.uniforms.uAspect.value = width / Math.max(1, height)
  }

  setParameter(name: string, value: unknown): void {
    const uniform = this.uniforms[uniformNameFor(name)]
    if (!uniform) return
    if (typeof value === 'number') uniform.value = value
    else if (typeof value === 'boolean') uniform.value = value ? 1 : 0
  }

  /** Valore corrente di un mapping, per i preset che lo usano lato CPU. */
  mapped(target: string): number {
    return this.mappings.get(target)
  }

  dispose(): void {
    this.spectrum.dispose()
    this.wave.dispose()
  }
}

function uniformNameFor(name: string): string {
  return `u${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

/**
 * Base per i preset che sono un solo shader a schermo intero.
 * Il preset concreto fornisce il fragment shader e, se serve, un `onUpdate`.
 */
export class ShaderPreset implements VisualPreset {
  readonly scene = new Scene()
  readonly camera: Camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  readonly clearColor: number

  protected readonly kit: UniformKit
  protected readonly manifest: PresetManifest

  private readonly fragmentShader: string
  private geometry: PlaneGeometry | null = null
  private material: ShaderMaterial | null = null
  private mesh: Mesh | null = null

  constructor(manifest: PresetManifest, fragmentShader: string, clearColor = 0x000000) {
    this.manifest = manifest
    this.fragmentShader = fragmentShader
    this.clearColor = clearColor
    this.kit = new UniformKit(manifest)
  }

  init(context: PresetContext): void {
    this.geometry = new PlaneGeometry(2, 2)
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: this.kit.uniforms,
      depthTest: false,
      depthWrite: false,
    })
    this.mesh = new Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
    this.resize(context.width, context.height, context.pixelRatio)
  }

  update(frame: AudioVisualFrame): void {
    this.kit.update(frame)
    this.onUpdate(frame)
  }

  /** Punto di estensione per i preset che hanno bisogno di logica extra. */
  protected onUpdate(_frame: AudioVisualFrame): void {}

  resize(width: number, height: number, _pixelRatio: number): void {
    this.kit.resize(width, height)
  }

  setParameter(name: string, value: unknown): void {
    this.kit.setParameter(name, value)
  }

  dispose(): void {
    if (this.mesh) this.scene.remove(this.mesh)
    this.geometry?.dispose()
    this.material?.dispose()
    this.kit.dispose()
    this.geometry = null
    this.material = null
    this.mesh = null
  }
}
