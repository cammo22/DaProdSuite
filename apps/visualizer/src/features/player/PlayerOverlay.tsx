import type { JSX } from 'react'
import {
  useAppState,
  useController,
  useCurrentTrack,
  selectPanel,
  selectPlayback,
} from '@/app/hooks'
import type { AppState } from '@/app/types'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { presetName } from '@/visual-engine/presets'
import { SeekBar } from './SeekBar'
import { VolumeControl } from './VolumeControl'

const selectShuffle = (s: AppState) => s.shuffle
const selectRepeat = (s: AppState) => s.repeat
const selectFullscreen = (s: AppState) => s.fullscreen
const selectCinema = (s: AppState) => s.cinema
const selectPresetId = (s: AppState) => s.presetId
const selectQueueLength = (s: AppState) => s.tracks.length

/** Overlay del player: informazioni sul brano, barra temporale e comandi. */
export function PlayerOverlay(): JSX.Element {
  const controller = useController()
  const track = useCurrentTrack()
  const playback = useAppState(selectPlayback)
  const shuffle = useAppState(selectShuffle)
  const repeat = useAppState(selectRepeat)
  const panel = useAppState(selectPanel)
  const fullscreen = useAppState(selectFullscreen)
  const cinema = useAppState(selectCinema)
  const presetId = useAppState(selectPresetId)
  const queueLength = useAppState(selectQueueLength)

  const playing = playback === 'playing'
  const loading = playback === 'loading'

  return (
    <div className="dpv-player">
      <div className="dpv-player__scrim" aria-hidden="true" />

      <div className="dpv-player__content">
        <div className="dpv-nowplaying">
          <div className="dpv-cover" data-empty={!track?.meta.coverUrl}>
            {track?.meta.coverUrl ? (
              <img src={track.meta.coverUrl} alt="" />
            ) : (
              <Icon name="music" size={22} />
            )}
          </div>
          <div className="dpv-nowplaying__text">
            <div className="dpv-nowplaying__title" title={track?.meta.title}>
              {track?.meta.title ?? 'Nessun brano'}
            </div>
            <div className="dpv-nowplaying__artist">
              {track?.meta.artist ?? '—'}
              {track?.meta.album ? ` · ${track.meta.album}` : ''}
            </div>
          </div>
          {track?.status === 'error' && (
            <span className="dpv-badge dpv-badge--error" title={track.error ?? undefined}>
              <Icon name="alert" size={14} />
              errore
            </span>
          )}
        </div>

        <SeekBar />

        <div className="dpv-controls">
          <div className="dpv-controls__group">
            <IconButton
              icon="shuffle"
              label="Riproduzione casuale"
              active={shuffle}
              onClick={() => controller.toggleShuffle()}
            />
            <IconButton
              icon="repeat"
              label={
                repeat === 'one'
                  ? 'Ripeti brano'
                  : repeat === 'all'
                    ? 'Ripeti coda'
                    : 'Ripetizione disattivata'
              }
              active={repeat !== 'off'}
              badge={repeat === 'one' ? '1' : undefined}
              onClick={() => controller.cycleRepeat()}
            />
          </div>

          <div className="dpv-controls__group dpv-controls__group--main">
            <IconButton
              icon="previous"
              label="Traccia precedente"
              filled
              disabled={queueLength === 0}
              onClick={() => void controller.previous()}
            />
            <IconButton
              icon={playing ? 'pause' : 'play'}
              label={playing ? 'Pausa' : 'Riproduci'}
              variant="primary"
              size={26}
              filled={!playing}
              disabled={queueLength === 0}
              onClick={() => void controller.togglePlay()}
            />
            <IconButton
              icon="next"
              label="Traccia successiva"
              filled
              disabled={queueLength === 0}
              onClick={() => void controller.next()}
            />
            {loading && <span className="dpv-spinner" aria-label="Caricamento" />}
          </div>

          <div className="dpv-controls__group dpv-controls__group--right">
            <VolumeControl />
            <IconButton
              icon="playlist"
              label="Playlist"
              active={panel === 'playlist'}
              badge={queueLength > 0 ? String(queueLength) : undefined}
              onClick={() => controller.togglePanel('playlist')}
            />
            <IconButton
              icon="presets"
              label={`Preset: ${presetName(presetId)}`}
              active={panel === 'presets'}
              onClick={() => controller.togglePanel('presets')}
            />
            <IconButton
              icon="cinema"
              label="Modalita' cinema"
              active={cinema}
              optional
              onClick={() => controller.toggleCinema()}
            />
            <IconButton
              icon={fullscreen ? 'fullscreenExit' : 'fullscreen'}
              label={fullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
              onClick={() => void controller.toggleFullscreen()}
            />
            <IconButton
              icon="settings"
              label="Impostazioni"
              active={panel === 'settings'}
              onClick={() => controller.togglePanel('settings')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
