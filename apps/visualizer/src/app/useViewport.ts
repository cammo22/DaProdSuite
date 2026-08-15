import { useEffect, type RefObject } from 'react'

/**
 * Classi di dimensione della finestra.
 *
 * Sono soglie in **rem**, non in pixel, e questa e' la ragione per cui non
 * bastano le media query: la scala interfaccia va dal 100% al 200%, quindi la
 * stessa finestra da 900 px ha lo spazio di 900 px al 100% e di 450 al 200%.
 * Misurando in rem la UI si compatta quando lo spazio *utile* finisce, non
 * quando finiscono i pixel.
 */
const WIDTH_STEPS: { size: string; maxRem: number }[] = [
  { size: 'xs', maxRem: 30 },
  { size: 'sm', maxRem: 46 },
  { size: 'md', maxRem: 68 },
  { size: 'lg', maxRem: 104 },
]

/** Oltre l'ultima soglia. */
const WIDEST = 'xl'

/** Sotto questa altezza in rem i controlli si stringono. */
const SHORT_REM = 32

/**
 * Soglie del caso estremo, in cui resta solo quello che serve a suonare.
 *
 * Volutamente basse: una finestra da 420x320 e' una "versione mini" legittima e
 * ci sta comodamente la striscia compatta con barra dei preset e comandi. Qui
 * si arriva solo quando lo spazio non basta piu' nemmeno per quella.
 */
const TINY_HEIGHT_REM = 15
const TINY_WIDTH_REM = 17

function remSize(): number {
  const raw = getComputedStyle(document.documentElement).fontSize
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16
}

function classify(widthRem: number): string {
  for (const step of WIDTH_STEPS) {
    if (widthRem < step.maxRem) return step.size
  }
  return WIDEST
}

/**
 * Marca l'elemento con `data-size`, `data-short` e `data-tiny` in base allo
 * spazio disponibile. Il CSS legge solo questi attributi.
 */
export function useViewport(ref: RefObject<HTMLElement | null>, uiScale: number): void {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const apply = (width: number, height: number) => {
      const rem = remSize()
      const widthRem = width / rem
      const heightRem = height / rem

      const size = classify(widthRem)
      if (element.dataset.size !== size) element.dataset.size = size

      const short = String(heightRem < SHORT_REM)
      if (element.dataset.short !== short) element.dataset.short = short

      const tiny = String(heightRem < TINY_HEIGHT_REM || widthRem < TINY_WIDTH_REM)
      if (element.dataset.tiny !== tiny) element.dataset.tiny = tiny
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) apply(rect.width, rect.height)
    })
    observer.observe(element)
    apply(element.clientWidth, element.clientHeight)

    return () => observer.disconnect()
    // uiScale nelle dipendenze: cambiando la scala cambia il rem, e quindi la
    // classe, anche se la finestra non si e' mossa di un pixel.
  }, [ref, uiScale])
}
