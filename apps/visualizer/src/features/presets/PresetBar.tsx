import { useEffect, useMemo, useRef, type JSX } from 'react'
import { selectPresetId, useAppState, useController } from '@/app/hooks'
import { presetManifests } from '@/visual-engine/presets'

/**
 * Barra dei preset sempre in alto: un nome per preset, si clicca e si cambia.
 * E' la via rapida; il pannello preset resta per preferiti, categorie e dettagli.
 */
export function PresetBar(): JSX.Element {
  const controller = useController()
  const activeId = useAppState(selectPresetId)
  const manifests = useMemo(() => presetManifests(), [])
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Con la barra in scorrimento orizzontale, il preset attivo deve restare in vista
    // anche quando lo cambiano i tasti P/R o il cambio automatico.
    const active = barRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeId])

  return (
    <nav className="dpv-presetbar" ref={barRef} aria-label="Scelta del preset">
      {manifests.map((manifest) => (
        <button
          key={manifest.id}
          type="button"
          className="dpv-presetbar__item"
          data-active={manifest.id === activeId}
          aria-current={manifest.id === activeId}
          title={manifest.description}
          onClick={() => controller.selectPreset(manifest.id)}
        >
          {manifest.name}
        </button>
      ))}
    </nav>
  )
}
