import { useMemo, useState, type JSX } from 'react'
import { selectFavorites, selectPresetId, useAppState, useController } from '@/app/hooks'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { Panel } from '@/components/Panel'
import { presetManifests } from '@/visual-engine/presets'
import type { PerformanceCost, PresetCategory } from '@/visual-engine/core/types'

const COST_LABEL: Record<PerformanceCost, string> = {
  low: 'Costo grafico basso',
  medium: 'Costo grafico medio',
  high: 'Costo grafico alto',
}

const COST_BARS: Record<PerformanceCost, number> = { low: 1, medium: 2, high: 3 }

/**
 * Anteprime senza immagini: ogni preset ha un gradiente animato costruito dai
 * suoi stessi colori. Nessun file binario da distribuire.
 */
const PREVIEW: Record<string, string> = {
  'daprod.neon-tunnel':
    'radial-gradient(circle at 50% 50%, #9ad8ff 0%, #2b6cff 18%, #10133a 55%, #05060f 100%)',
  'daprod.liquid-chrome':
    'linear-gradient(135deg, #dfe8f5 0%, #7f8ea8 22%, #1b2233 48%, #9aa8c4 70%, #2b3247 100%)',
  'daprod.cosmic-dust':
    'radial-gradient(ellipse at 30% 40%, #b48cff 0%, #3b3fa0 30%, #0a0c22 70%, #04050f 100%)',
  'daprod.retro-grid':
    'linear-gradient(180deg, #2a0740 0%, #7a1552 42%, #ff5f8a 52%, #17093a 56%, #05021a 100%)',
  'daprod.audio-bloom':
    'conic-gradient(from 210deg, #ff6ec7, #8b5cf6, #38bdf8, #34e5c4, #ff6ec7)',
  'daprod.fractal-pulse':
    'conic-gradient(from 0deg, #0b1030, #6d28d9, #f59e0b, #10b981, #0b1030)',
  'daprod.minimal-rings':
    'repeating-radial-gradient(circle at 50% 50%, #4cc4ff 0 2px, transparent 2px 12px), #070a16',
  'daprod.napoli-lava':
    'linear-gradient(180deg, #ff9d3c 0%, #d1370f 34%, #35100c 62%, #071426 100%)',
  'daprod.electric-storm':
    'linear-gradient(180deg, #3a3f7a 0%, #6f7ac0 22%, #131634 58%, #05060f 100%)',
  'daprod.inchiostro':
    'radial-gradient(ellipse at 40% 55%, #ff5fd0 0%, #6b3ecf 26%, #10214a 62%, #04070f 100%)',
  'daprod.glitch-tape':
    'repeating-linear-gradient(180deg, #23e8d0 0 6px, #ff3d7a 6px 12px, #101226 12px 22px)',
}

const ALL = 'Tutte' as const
type Filter = typeof ALL | PresetCategory | 'Preferiti'

export function PresetPanel(): JSX.Element {
  const controller = useController()
  const activeId = useAppState(selectPresetId)
  const favorites = useAppState(selectFavorites)
  const [filter, setFilter] = useState<Filter>(ALL)

  const manifests = useMemo(() => presetManifests(), [])
  const categories = useMemo(
    () => [...new Set(manifests.map((m) => m.category))].sort(),
    [manifests],
  )

  const visible = manifests.filter((m) => {
    if (filter === ALL) return true
    if (filter === 'Preferiti') return favorites.includes(m.id)
    return m.category === filter
  })

  return (
    <Panel
      title="Preset"
      subtitle={`${manifests.length} visualizzazioni disponibili`}
      wide
      onClose={() => controller.closePanel()}
      footer={
        <button
          type="button"
          className="dpv-button dpv-button--accent"
          onClick={() => controller.randomPreset()}
        >
          <Icon name="dice" size={16} />
          Preset casuale
        </button>
      }
    >
      <div className="dpv-chips" role="tablist" aria-label="Categorie">
        {[ALL, 'Preferiti', ...categories].map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className="dpv-chip"
            data-active={filter === item}
            onClick={() => setFilter(item as Filter)}
          >
            {item}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="dpv-panel__empty">Nessun preset in questa categoria.</p>
      ) : (
        <div className="dpv-presets">
          {visible.map((manifest) => {
            const active = manifest.id === activeId
            const favorite = favorites.includes(manifest.id)
            return (
              <article key={manifest.id} className="dpv-preset" data-active={active}>
                <button
                  type="button"
                  className="dpv-preset__hit"
                  onClick={() => controller.selectPreset(manifest.id)}
                  aria-label={`Attiva il preset ${manifest.name}`}
                >
                  <span
                    className="dpv-preset__preview"
                    style={{ background: PREVIEW[manifest.id] ?? 'var(--dpv-surface-raised)' }}
                    aria-hidden="true"
                  />
                  <span className="dpv-preset__info">
                    <span className="dpv-preset__name">{manifest.name}</span>
                    <span className="dpv-preset__author">{manifest.author}</span>
                    <span className="dpv-preset__desc">{manifest.description}</span>
                  </span>
                </button>

                <div className="dpv-preset__meta">
                  <span className="dpv-tag">{manifest.category}</span>
                  <span
                    className="dpv-cost"
                    title={COST_LABEL[manifest.performance]}
                    aria-label={COST_LABEL[manifest.performance]}
                  >
                    {[0, 1, 2].map((i) => (
                      <i key={i} data-on={i < COST_BARS[manifest.performance]} />
                    ))}
                  </span>
                  <IconButton
                    icon="star"
                    label={favorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
                    size={16}
                    active={favorite}
                    filled={favorite}
                    onClick={() => controller.toggleFavorite(manifest.id)}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
