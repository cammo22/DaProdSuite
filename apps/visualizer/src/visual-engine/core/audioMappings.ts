import type { AudioFeatures } from '@/audio/types'
import type { AudioMapping } from './types'

/**
 * Esegue gli `audioMappings` dichiarati in preset.json.
 *
 * Ogni mapping prende una feature, la moltiplica per `amount` e la smussa con
 * la costante `smoothing` (in secondi). Il risultato finisce in un uniform
 * chiamato `u` + Target, se il preset ne dichiara uno con quel nome: cosi' il
 * file JSON non e' decorativo, controlla davvero il rendering.
 */
export class AudioMappingRunner {
  private readonly values = new Map<string, number>()
  private readonly mappings: AudioMapping[]

  constructor(mappings: AudioMapping[]) {
    this.mappings = mappings
    for (const m of mappings) this.values.set(m.target, 0)
  }

  update(audio: AudioFeatures, dt: number): void {
    for (const m of this.mappings) {
      const raw = readSource(audio, m.source) * m.amount
      const prev = this.values.get(m.target) ?? 0
      const k = m.smoothing > 0 ? 1 - Math.exp(-dt / m.smoothing) : 1
      this.values.set(m.target, prev + (raw - prev) * k)
    }
  }

  get(target: string): number {
    return this.values.get(target) ?? 0
  }

  /** Nome dell'uniform associato a un target: "tunnelScale" -> "uTunnelScale". */
  static uniformName(target: string): string {
    return `u${target.charAt(0).toUpperCase()}${target.slice(1)}`
  }

  get targets(): string[] {
    return [...this.values.keys()]
  }
}

function readSource(audio: AudioFeatures, source: AudioMapping['source']): number {
  switch (source) {
    case 'bass':
      return audio.bass
    case 'mid':
      return audio.mid
    case 'treble':
      return audio.treble
    case 'rms':
      return audio.rms
    case 'peak':
      return audio.peak
    case 'beat':
      return audio.beat
    case 'onset':
      return audio.onset
    case 'centroid':
      return audio.centroid
    case 'energy':
      return audio.energy
    default:
      return 0
  }
}
