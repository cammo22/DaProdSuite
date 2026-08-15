import {
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'
import { FullscreenPass } from './FullscreenPass'
import brightShader from '../shaders/bright.frag?raw'
import blurShader from '../shaders/blur.frag?raw'
import compositeShader from '../shaders/composite.frag?raw'
import transitionShader from '../shaders/transition.frag?raw'
import type { TransitionMode } from './types'

const MODE_INDEX: Record<TransitionMode, number> = { dissolve: 0, zoom: 1, ripple: 2, slice: 3 }

function makeTarget(width: number, height: number, depth: boolean): WebGLRenderTarget {
  const target = new WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
    type: UnsignedByteType,
    depthBuffer: depth,
    stencilBuffer: false,
    generateMipmaps: false,
  })
  // Pipeline interamente lineare: nessuna conversione fra una passata e l'altra.
  target.texture.colorSpace = NoColorSpace
  return target
}

/**
 * Catena di post-processing: transizione fra preset, bloom, tone map e grana.
 *
 * I target della transizione vengono allocati solo mentre serve, cosi' a regime
 * la memoria video occupata e' quella di un solo frame piu' il bloom a meta'
 * risoluzione.
 */
export class PostProcessor {
  private width = 1
  private height = 1

  /** Target del preset corrente. */
  private rtCurrent: WebGLRenderTarget
  /** Target del preset in ingresso, solo durante una transizione. */
  private rtIncoming: WebGLRenderTarget | null = null
  /** Risultato della fusione. */
  private rtBlend: WebGLRenderTarget | null = null

  private rtPing: WebGLRenderTarget
  private rtPong: WebGLRenderTarget

  private readonly brightPass: FullscreenPass
  private readonly blurPass: FullscreenPass
  private readonly compositePass: FullscreenPass
  private readonly transitionPass: FullscreenPass

  constructor(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)

    this.rtCurrent = makeTarget(this.width, this.height, true)
    this.rtPing = makeTarget(this.width >> 1, this.height >> 1, false)
    this.rtPong = makeTarget(this.width >> 1, this.height >> 1, false)

    this.brightPass = new FullscreenPass(brightShader, {
      tSource: { value: null },
      uThreshold: { value: 0.6 },
      uKnee: { value: 0.25 },
    })

    this.blurPass = new FullscreenPass(blurShader, {
      tSource: { value: null },
      uDirection: { value: new Vector2() },
    })

    this.compositePass = new FullscreenPass(compositeShader, {
      tScene: { value: null },
      tBloom: { value: null },
      uBloomStrength: { value: 0.85 },
      uVignette: { value: 0.55 },
      uGrain: { value: 0.012 },
      uTime: { value: 0 },
      uResolution: { value: new Vector2(this.width, this.height) },
    })

    this.transitionPass = new FullscreenPass(transitionShader, {
      tFrom: { value: null },
      tTo: { value: null },
      uMix: { value: 0 },
      uMode: { value: 0 },
      uTime: { value: 0 },
      uResolution: { value: new Vector2(this.width, this.height) },
    })
  }

  /** Target su cui il preset corrente deve essere disegnato. */
  get currentTarget(): WebGLRenderTarget {
    return this.rtCurrent
  }

  /** Target del preset in ingresso; lo alloca alla prima richiesta. */
  get incomingTarget(): WebGLRenderTarget {
    this.rtIncoming ??= makeTarget(this.width, this.height, true)
    this.rtBlend ??= makeTarget(this.width, this.height, false)
    return this.rtIncoming
  }

  /** Libera i target usati solo durante la transizione. */
  releaseTransitionTargets(): void {
    this.rtIncoming?.dispose()
    this.rtIncoming = null
    this.rtBlend?.dispose()
    this.rtBlend = null
  }

  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h

    this.rtCurrent.setSize(w, h)
    this.rtIncoming?.setSize(w, h)
    this.rtBlend?.setSize(w, h)
    this.rtPing.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1))
    this.rtPong.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1))

    const res = this.compositePass.uniforms.uResolution.value as Vector2
    res.set(w, h)
    const tres = this.transitionPass.uniforms.uResolution.value as Vector2
    tres.set(w, h)
  }

  /**
   * Fonde i due target del preset e restituisce quello da usare come scena.
   * Con `mix <= 0` non fa nulla e restituisce il target corrente.
   */
  blend(renderer: WebGLRenderer, mix: number, mode: TransitionMode, time: number): WebGLRenderTarget {
    if (mix <= 0 || !this.rtIncoming || !this.rtBlend) return this.rtCurrent

    const u = this.transitionPass.uniforms
    u.tFrom.value = this.rtCurrent.texture
    u.tTo.value = this.rtIncoming.texture
    u.uMix.value = mix
    u.uMode.value = MODE_INDEX[mode]
    u.uTime.value = time
    this.transitionPass.render(renderer, this.rtBlend)
    return this.rtBlend
  }

  /**
   * Bloom + tone map + grana, direttamente sul canvas.
   *
   * @param iterations 0 disattiva il bloom (qualita' bassa).
   */
  present(
    renderer: WebGLRenderer,
    scene: WebGLRenderTarget,
    iterations: number,
    strength: number,
    time: number,
  ): void {
    let bloomTexture = null as WebGLRenderTarget | null

    if (iterations > 0 && strength > 0) {
      this.brightPass.uniforms.tSource.value = scene.texture
      this.brightPass.render(renderer, this.rtPing)

      const texelX = 1 / Math.max(1, this.width >> 1)
      const texelY = 1 / Math.max(1, this.height >> 1)
      const dir = this.blurPass.uniforms.uDirection.value as Vector2

      for (let i = 0; i < iterations; i++) {
        // Il raggio raddoppia a ogni giro: si copre un'area ampia con pochi pass.
        const radius = 1 << i
        this.blurPass.uniforms.tSource.value = this.rtPing.texture
        dir.set(texelX * radius, 0)
        this.blurPass.render(renderer, this.rtPong)

        this.blurPass.uniforms.tSource.value = this.rtPong.texture
        dir.set(0, texelY * radius)
        this.blurPass.render(renderer, this.rtPing)
      }
      bloomTexture = this.rtPing
    }

    const u = this.compositePass.uniforms
    u.tScene.value = scene.texture
    u.tBloom.value = bloomTexture ? bloomTexture.texture : scene.texture
    u.uBloomStrength.value = bloomTexture ? strength : 0
    u.uTime.value = time
    this.compositePass.render(renderer, null)
  }

  dispose(): void {
    this.rtCurrent.dispose()
    this.releaseTransitionTargets()
    this.rtPing.dispose()
    this.rtPong.dispose()
    this.brightPass.dispose()
    this.blurPass.dispose()
    this.compositePass.dispose()
    this.transitionPass.dispose()
  }
}
