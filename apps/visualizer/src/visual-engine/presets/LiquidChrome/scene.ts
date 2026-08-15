import { ShaderPreset } from '../../core/PresetBase'
import { composeFragment } from '../../shaders/lib'
import type { PresetEntry, PresetManifest } from '../../core/types'
import manifestJson from './preset.json'
import fragment from './shaders/chrome.frag?raw'

const manifest = manifestJson as PresetManifest

export const liquidChrome: PresetEntry = {
  manifest,
  create: () => new ShaderPreset(manifest, composeFragment(fragment), 0x04050a),
}
