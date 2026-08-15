import { useEffect, useRef, type JSX } from 'react'
import { NoticeStack } from '@/components/NoticeStack'
import { EmptyScreen } from '@/features/player/EmptyScreen'
import { PlayerOverlay } from '@/features/player/PlayerOverlay'
import { LibreriaPanel } from '@/features/libreria/LibreriaPanel'
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel'
import { PresetBar } from '@/features/presets/PresetBar'
import { PresetPanel } from '@/features/presets/PresetPanel'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { VisualizerCanvas } from '@/features/visualizer/VisualizerCanvas'
import { allaConsegna, comeFileInIngresso } from '@/suite/bridge'
import { selectPanel, useAppState, useController } from './hooks'
import type { AppState } from './types'
import { useFileDrop } from './useFileDrop'
import { useShortcuts } from './useShortcuts'
import { useViewport } from './useViewport'

const selectHasTracks = (s: AppState) => s.tracks.length > 0
const selectCinema = (s: AppState) => s.cinema
const selectControlsVisible = (s: AppState) => s.controlsVisible
const selectImporting = (s: AppState) => s.importing
const selectUiScale = (s: AppState) => s.settings.uiScale

export function App(): JSX.Element {
  const controller = useController()
  const dragging = useFileDrop(controller)
  useShortcuts(controller)

  const hasTracks = useAppState(selectHasTracks)
  const panel = useAppState(selectPanel)
  const cinema = useAppState(selectCinema)
  const controlsVisible = useAppState(selectControlsVisible)
  const importing = useAppState(selectImporting)
  const uiScale = useAppState(selectUiScale)

  const rootRef = useRef<HTMLDivElement>(null)
  useViewport(rootRef, uiScale)

  useEffect(() => {
    const onChange = () => controller.noteFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [controller])

  useEffect(() => {
    // Un'altra app della suite ci manda un brano: entra in coda e parte.
    // `riproduci` e' l'unica intenzione che il Visualizer sa onorare; le altre
    // riguardano immagini e non lo toccano.
    return allaConsegna((consegna) => {
      if (consegna.intenzione !== 'riproduci' || consegna.elemento.tipo !== 'audio') return
      void controller.addFiles([comeFileInIngresso(consegna.elemento)], { autoplay: true })
    })
  }, [controller])

  useEffect(() => {
    // Il contesto audio va sbloccato dalla prima interazione dell'utente.
    const unlock = () => {
      controller.audio.ensureContext()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [controller])

  return (
    <div
      ref={rootRef}
      className="dpv-app"
      data-cinema={cinema}
      data-controls={controlsVisible}
      onPointerMove={() => controller.noteActivity()}
      onDoubleClick={(event) => {
        // Doppio clic sul visualizzatore, non sui controlli.
        if (
          (event.target as HTMLElement).closest(
            '.dpv-player, .dpv-panel, .dpv-empty, .dpv-presetbar',
          )
        )
          return
        void controller.toggleFullscreen()
      }}
    >
      <VisualizerCanvas />

      <PresetBar />

      {hasTracks ? <PlayerOverlay /> : <EmptyScreen dragging={dragging} />}

      {panel === 'playlist' && <PlaylistPanel />}
      {panel === 'presets' && <PresetPanel />}
      {panel === 'settings' && <SettingsPanel />}
      {panel === 'libreria' && <LibreriaPanel />}

      {dragging && hasTracks && (
        <div className="dpv-dropveil" aria-hidden="true">
          <div className="dpv-dropveil__box">Rilascia per aggiungere alla coda</div>
        </div>
      )}

      {importing && (
        <div className="dpv-importing" role="status">
          <span className="dpv-spinner" />
          Importazione in corso…
        </div>
      )}

      <NoticeStack />
    </div>
  )
}
