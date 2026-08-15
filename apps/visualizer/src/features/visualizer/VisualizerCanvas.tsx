import { useEffect, useRef, useState, type JSX } from 'react'
import { useAppState, useController } from '@/app/hooks'
import type { AppState } from '@/app/types'
import { VisualEngine, type EngineStats } from '@/visual-engine/core/VisualEngine'
import { presetName } from '@/visual-engine/presets'

const selectShowStats = (s: AppState) => s.settings.showStats
const selectFailed = (s: AppState) => s.rendererFailed

/**
 * Canvas WebGL e ciclo di vita del motore visuale.
 * Il motore vive fuori da React: qui si montano soltanto canvas e osservatori.
 */
export function VisualizerCanvas(): JSX.Element {
  const controller = useController()
  const showStats = useAppState(selectShowStats)
  const failed = useAppState(selectFailed)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const showStatsRef = useRef(showStats)
  const [stats, setStats] = useState<EngineStats | null>(null)
  const [attempt, setAttempt] = useState(0)

  showStatsRef.current = showStats

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let engine: VisualEngine
    try {
      engine = new VisualEngine({
        canvas,
        sampleAudio: (dt) => controller.audio.sample(dt),
        onPresetChanged: (id) => controller.notePresetChanged(id),
        onStats: (next) => {
          // Senza il pannello diagnostico non serve far ridisegnare nulla.
          if (showStatsRef.current) setStats(next)
        },
        onFailure: (message) => controller.noteRendererFailure(message),
      })
    } catch (error) {
      controller.noteRendererFailure(
        'Impossibile inizializzare WebGL su questo sistema. Il visualizzatore resta spento.',
      )
      console.error(error)
      return
    }

    controller.attachVisual(engine)

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) engine.setViewportSize(rect.width, rect.height)
    })
    observer.observe(container)
    engine.setViewportSize(container.clientWidth, container.clientHeight)
    engine.start()

    const onVisibility = () => {
      // In background si smette di disegnare: niente GPU sprecata.
      if (document.hidden) engine.stop()
      else engine.start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
      controller.detachVisual()
      engine.dispose()
    }
  }, [controller, attempt])

  return (
    <div className="dpv-visualizer" ref={containerRef}>
      {/* Un canvas con contesto perso non e' recuperabile: si rimonta l'elemento. */}
      <canvas key={attempt} ref={canvasRef} className="dpv-visualizer__canvas" />

      {failed && (
        <div className="dpv-visualizer__failure" role="alert">
          <p>Il visualizzatore si e' fermato.</p>
          <button
            type="button"
            className="dpv-button dpv-button--accent"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Riavvia il motore grafico
          </button>
        </div>
      )}

      {showStats && stats && (
        <div className="dpv-stats" aria-live="off">
          <span>{stats.fps.toFixed(0)} FPS</span>
          <span>{stats.quality}</span>
          <span>
            {stats.width}x{stats.height}
          </span>
          {stats.bpm > 0 && <span>{Math.round(stats.bpm)} BPM</span>}
          <span>{presetName(stats.presetId)}</span>
          {stats.transitioning && <span className="dpv-stats__flag">transizione</span>}
        </div>
      )}
    </div>
  )
}
