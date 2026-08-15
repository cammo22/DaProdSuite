import { useEffect } from 'react'
import type { AppController } from './AppController'

/** Elementi in cui la digitazione deve avere la precedenza sulle scorciatoie. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/** Scorciatoie da tastiera globali (02_UX_UI.md). */
export function useShortcuts(controller: AppController): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return
      if (isTyping(event.target)) return

      const state = controller.store.get()

      switch (event.key) {
        case ' ':
          void controller.togglePlay()
          break
        case 'ArrowLeft':
          controller.seekBy(-5)
          break
        case 'ArrowRight':
          controller.seekBy(5)
          break
        case 'ArrowUp':
          controller.adjustVolume(0.05)
          break
        case 'ArrowDown':
          controller.adjustVolume(-0.05)
          break
        case 'Escape':
          // Prima si chiude il pannello aperto, poi si esce dallo schermo intero.
          if (state.panel !== 'none') controller.closePanel()
          else if (state.fullscreen) void controller.toggleFullscreen()
          else if (state.cinema) controller.toggleCinema()
          else return
          break
        default:
          switch (event.key.toLowerCase()) {
            case 'n':
              void controller.next()
              break
            case 'b':
              void controller.previous()
              break
            case 'p':
              controller.nextPreset()
              break
            case 'r':
              controller.randomPreset()
              break
            case 'f':
              void controller.toggleFullscreen()
              break
            case 'c':
              controller.toggleCinema()
              break
            case 'm':
              controller.toggleMute()
              break
            case 'l':
              controller.togglePanel('playlist')
              break
            default:
              return
          }
      }

      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [controller])
}
