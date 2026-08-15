import { ShaderPreset } from '../../core/PresetBase'
import { composeFragment } from '../../shaders/lib'
import type { PresetEntry, PresetManifest } from '../../core/types'
import manifestJson from './preset.json'
import fragment from './shaders/grid.frag?raw'

const manifest = manifestJson as PresetManifest

export const retroGrid: PresetEntry = {
  manifest,
  create: () => new ShaderPreset(manifest, composeFragment(fragment), 0x03010a),
}
