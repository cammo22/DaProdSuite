import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  OrthographicCamera,
  RingGeometry,
  Scene,
  ShaderMaterial,
} from 'three'
import type { AudioVisualFrame } from '@/audio/types'
import { UniformKit } from '../../core/PresetBase'
import type { PresetContext, PresetEntry, PresetManifest, VisualPreset } from '../../core/types'
import manifestJson from './preset.json'
import vertexShader from './shaders/bloom.vert?raw'
import fragmentShader from './shaders/bloom.frag?raw'

const manifest = manifestJson as PresetManifest

/** Corolle sovrapposte: ognuna gira di suo e legge lo spettro con uno sfasamento. */
const LAYERS = 3

class AudioBloom implements VisualPreset {
  readonly scene = new Scene()
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 10)
  readonly clearColor = 0x03030b

  private readonly kit = new UniformKit(manifest)
  private geometry: RingGeometry | null = null
  private readonly materials: ShaderMaterial[] = []
  private readonly meshes: Mesh[] = []

  init(context: PresetContext): void {
    const segments = Math.max(96, Math.min(768, Math.round(384 * context.budget)))
    const rings = Math.max(4, Math.min(24, Math.round(14 * context.budget)))
    const geometry = new RingGeometry(0.04, 1, segments, rings)
    this.geometry = geometry

    for (let i = 0; i < LAYERS; i++) {
      // Lo spread mantiene vivi i riferimenti agli uniform condivisi del kit
      // e aggiunge solo uLayer, che e' specifico del livello.
      const material = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { ...this.kit.uniforms, uLayer: { value: i } },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      })
      const mesh = new Mesh(geometry, material)
      mesh.frustumCulled = false
      mesh.scale.setScalar(1 - i * 0.14)
      this.scene.add(mesh)
      this.materials.push(material)
      this.meshes.push(mesh)
    }

    this.camera.position.z = 5
    this.resize(context.width, context.height, context.pixelRatio)
  }

  update(frame: AudioVisualFrame): void {
    this.kit.update(frame)
    // Respiro d'insieme sul beat, oltre alla deformazione dei singoli petali.
    const pulse = 1 + frame.audio.beat * 0.05 + frame.audio.rms * 0.06
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i].scale.setScalar((1 - i * 0.14) * pulse)
    }
  }

  resize(width: number, height: number, _pixelRatio: number): void {
    this.kit.resize(width, height)
    // Inquadratura sempre alta 2 unita': la corolla non viene tagliata in verticale.
    const aspect = width / Math.max(1, height)
    this.camera.left = -aspect
    this.camera.right = aspect
    this.camera.top = 1
    this.camera.bottom = -1
    this.camera.updateProjectionMatrix()
  }

  setParameter(name: string, value: unknown): void {
    this.kit.setParameter(name, value)
  }

  dispose(): void {
    for (const mesh of this.meshes) this.scene.remove(mesh)
    for (const material of this.materials) material.dispose()
    this.geometry?.dispose()
    this.meshes.length = 0
    this.materials.length = 0
    this.geometry = null
    this.kit.dispose()
  }
}

export const audioBloom: PresetEntry = {
  manifest,
  create: () => new AudioBloom(),
}
