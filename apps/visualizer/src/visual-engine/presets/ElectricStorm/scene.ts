import { ShaderPreset } from '../../core/PresetBase'
import { composeFragment } from '../../shaders/lib'
import type { PresetEntry, PresetManifest } from '../../core/types'
import manifestJson from './preset.json'
import fragment from './shaders/storm.frag?raw'

const manifest = manifestJson as PresetManifest

export const electricStorm: PresetEntry = {
  manifest,
  create: () => new ShaderPreset(manifest, composeFragment(fragment), 0x010209),
}
