import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
} from 'three'
import type { AudioVisualFrame } from '@/audio/types'
import { UniformKit } from '../../core/PresetBase'
import type { PresetContext, PresetEntry, PresetManifest, VisualPreset } from '../../core/types'
import manifestJson from './preset.json'
import vertexShader from './shaders/dust.vert?raw'
import fragmentShader from './shaders/dust.frag?raw'

const manifest = manifestJson as PresetManifest

/** Particelle a qualita' piena; il budget del renderer scala questo numero. */
const BASE_COUNT = 30000

class CosmicDust implements VisualPreset {
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(58, 1, 0.1, 220)
  readonly clearColor = 0x01020a

  private readonly kit = new UniformKit(manifest, { uHeightScale: { value: 1 } })
  private geometry: BufferGeometry | null = null
  private material: ShaderMaterial | null = null
  private points: Points | null = null
  private orbit = 0

  init(context: PresetContext): void {
    const count = Math.max(4000, Math.min(120000, Math.round(BASE_COUNT * context.budget)))
    const seeds = new Float32Array(count * 3)
    const rand = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // sqrt sul raggio: distribuzione uniforme sul disco, non addensata al centro.
      const radius = Math.sqrt(context.random())
      const angle = context.random() * Math.PI * 2
      // Quota con code sottili: un disco spesso al centro e rarefatto ai bordi.
      const height = (context.random() + context.random() + context.random() - 1.5) * 0.8

      seeds[i * 3] = radius
      seeds[i * 3 + 1] = angle
      seeds[i * 3 + 2] = height * (1.1 - radius * 0.7)
      rand[i] = context.random()
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 3))
    geometry.setAttribute('aRand', new BufferAttribute(rand, 1))
    // La posizione reale la calcola il vertex shader: niente bounding sphere utile.
    geometry.boundingSphere = null

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.kit.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    })

    const points = new Points(geometry, material)
    points.frustumCulled = false
    this.scene.add(points)

    this.geometry = geometry
    this.material = material
    this.points = points

    this.camera.position.set(0, 0.9, 11)
    this.camera.lookAt(0, 0, 0)
    this.resize(context.width, context.height, context.pixelRatio)
  }

  update(frame: AudioVisualFrame): void {
    this.kit.update(frame)

    // Il movimento sta qui, non nelle particelle: orbita lenta ma percepibile,
    // piu' un respiro sulla distanza e una deriva del punto guardato. Bastano
    // pochi gradi al secondo perche' la scena sembri viva senza girare.
    this.orbit += frame.delta * (0.045 + frame.audio.energy * 0.05)
    const breath = Math.sin(this.orbit * 1.7) * 0.7
    const dist = 11 + breath - frame.audio.rms * 0.7 - this.kit.mapped('burst') * 0.5

    // Camera bassa e vicina: il disco si vede quasi di taglio e riempie tutto
    // lo schermo, invece di restare un ovale piccolo al centro.
    this.camera.position.set(
      Math.sin(this.orbit) * dist,
      0.9 + Math.sin(this.orbit * 0.6) * 0.55,
      Math.cos(this.orbit) * dist,
    )
    // Il centro dell'inquadratura scivola appena: la parallasse fa il resto.
    this.camera.lookAt(
      Math.sin(this.orbit * 0.43) * 0.7,
      0.3 + Math.cos(this.orbit * 0.31) * 0.3,
      Math.cos(this.orbit * 0.37) * 0.7,
    )
    // Rollio impercettibile, giusto per togliere la sensazione di camera fissa.
    this.camera.rotateZ(Math.sin(this.orbit * 0.8) * 0.05)
  }

  resize(width: number, height: number, _pixelRatio: number): void {
    this.kit.resize(width, height)
    this.kit.uniforms.uHeightScale.value = height / 1080
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  setParameter(name: string, value: unknown): void {
    this.kit.setParameter(name, value)
  }

  dispose(): void {
    if (this.points) this.scene.remove(this.points)
    this.geometry?.dispose()
    this.material?.dispose()
    this.kit.dispose()
    this.geometry = null
    this.material = null
    this.points = null
  }
}

export const cosmicDust: PresetEntry = {
  manifest,
  create: () => new CosmicDust(),
}
