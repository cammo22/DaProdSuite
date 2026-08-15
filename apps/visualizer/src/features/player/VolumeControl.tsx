import type { CSSProperties, JSX } from 'react'
import { useAppState, useController } from '@/app/hooks'
import type { AppState } from '@/app/types'
import { IconButton } from '@/components/IconButton'

const selectVolume = (s: AppState) => s.volume
const selectMuted = (s: AppState) => s.muted

export function VolumeControl(): JSX.Element {
  const controller = useController()
  const volume = useAppState(selectVolume)
  const muted = useAppState(selectMuted)

  const icon = muted || volume === 0 ? 'volumeMute' : volume < 0.45 ? 'volumeLow' : 'volume'
  const percent = Math.round(volume * 100)

  return (
    <div className="dpv-volume">
      <IconButton
        icon={icon}
        label={muted ? 'Riattiva audio' : 'Silenzia'}
        active={muted}
        onClick={() => controller.toggleMute()}
      />
      <input
        className="dpv-range dpv-volume__slider"
        type="range"
        min={0}
        max={100}
        step={1}
        value={muted ? 0 : percent}
        aria-label={`Volume ${percent}%`}
        onChange={(event) => controller.setVolume(Number(event.target.value) / 100)}
        style={{ '--dpv-range-fill': `${muted ? 0 : percent}%` } as CSSProperties}
      />
    </div>
  )
}
