import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type IUniform,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'
import vertexShader from '../shaders/fullscreen.vert?raw'

/** Geometria condivisa da tutti i pass: un solo quad per l'intera app. */
const QUAD = new PlaneGeometry(2, 2)
const CAMERA = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

/** Passata a schermo intero: un quad con uno shader e nient'altro. */
export class FullscreenPass {
  readonly uniforms: Record<string, IUniform>
  private readonly material: ShaderMaterial
  private readonly scene = new Scene()
  private readonly mesh: Mesh

  constructor(fragmentShader: string, uniforms: Record<string, IUniform>) {
    this.uniforms = uniforms
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
    this.mesh = new Mesh(QUAD, this.material)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
  }

  /** Disegna sul target indicato; `null` significa direttamente a schermo. */
  render(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void {
    renderer.setRenderTarget(target)
    renderer.render(this.scene, CAMERA)
  }

  dispose(): void {
    this.scene.remove(this.mesh)
    this.material.dispose()
  }
}
