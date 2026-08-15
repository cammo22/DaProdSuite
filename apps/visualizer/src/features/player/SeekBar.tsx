import { useCallback, useRef, useState, type JSX, type PointerEvent as ReactPointerEvent } from 'react'
import { useClock, useController } from '@/app/hooks'
import type { ClockState } from '@/app/AppController'
import { formatTime } from '@/app/format'

const selectClock = (c: ClockState) => c

/** Barra temporale con seek a trascinamento e anteprima del tempo. */
export function SeekBar(): JSX.Element {
  const controller = useController()
  const clock = useClock(selectClock)
  const trackRef = useRef<HTMLDivElement>(null)
  const [scrub, setScrub] = useState<number | null>(null)

  const duration = clock.duration
  const shown = scrub ?? clock.position
  const progress = duration > 0 ? Math.min(1, shown / duration) : 0
  const buffered = clock.buffered

  const positionFromEvent = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || duration <= 0) return 0
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration],
  )

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrub(positionFromEvent(event.clientX))
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrub === null) return
    setScrub(positionFromEvent(event.clientX))
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrub === null) return
    controller.seek(positionFromEvent(event.clientX))
    setScrub(null)
  }

  return (
    <div className="dpv-seek">
      <span className="dpv-seek__time">{formatTime(shown)}</span>

      <div
        ref={trackRef}
        className="dpv-seek__track"
        role="slider"
        tabIndex={0}
        aria-label="Posizione nel brano"
        aria-valuemin={0}
        aria-valuemax={Math.max(1, Math.round(duration))}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={formatTime(shown)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setScrub(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') controller.seekBy(-5)
          else if (event.key === 'ArrowRight') controller.seekBy(5)
          else return
          event.preventDefault()
        }}
      >
        <div className="dpv-seek__buffered" style={{ transform: `scaleX(${buffered})` }} />
        <div className="dpv-seek__fill" style={{ transform: `scaleX(${progress})` }} />
        <div className="dpv-seek__thumb" style={{ left: `${progress * 100}%` }} />
      </div>

      <span className="dpv-seek__time">{formatTime(duration)}</span>
    </div>
  )
}
