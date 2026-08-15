import type { JSX } from 'react'

/**
 * Set di icone in linea: nessuna richiesta di rete, nessun font esterno.
 * Tutte disegnate su una griglia 24x24 con tratto uniforme.
 */
const PATHS = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M9 5.5v13M15 5.5v13',
  previous: 'M18 6v12L9 12zM6 5.5v13',
  next: 'M6 6v12l9-6zM18 5.5v13',
  stop: 'M6.5 6.5h11v11h-11z',
  shuffle: 'M4 6h3.5l9 12H20M4 18h3.5l3-4M16 15l4 3-4 3M14.5 8.5l2-2.5M16 3l4 3-4 3',
  repeat: 'M6 8h11a3 3 0 0 1 3 3v1M18 16H7a3 3 0 0 1-3-3v-1M8 5 5 8l3 3M16 19l3-3-3-3',
  volume: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10',
  volumeLow: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9.5a4 4 0 0 1 0 5',
  volumeMute: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5',
  playlist: 'M4 7h11M4 12h11M4 17h7M19 8v8.2M19 16.2a1.6 1.6 0 1 1-1.6-1.6',
  presets: 'M12 3.5 13.9 9l5.6 1.5-4 4 .6 5.7-4.1-2.6-4.1 2.6.6-5.7-4-4L10.1 9z',
  fullscreen: 'M4 9V4.5h5M20 9V4.5h-5M4 15v4.5h5M20 15v4.5h-5',
  fullscreenExit: 'M9 4.5V9H4.5M15 4.5V9h4.5M9 19.5V15H4.5M15 19.5V15h4.5',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.5 12a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2-1.2l-.3-2.5h-4l-.3 2.5c-.7.3-1.4.7-2 1.2l-2.3-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.3 2.5h4l.3-2.5c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 10.5v5.5M13.5 10.5v5.5',
  search: 'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.8 15.8 20 20',
  folder: 'M4 6.5h5l2 2.5h9v9.5H4z',
  grip: 'M9 7h.01M9 12h.01M9 17h.01M15 7h.01M15 12h.01M15 17h.01',
  star: 'M12 4l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.8 9.6 9z',
  cinema: 'M3.5 6.5h17v11h-17zM3.5 10.5h17M7.5 6.5v4M12 6.5v4M16.5 6.5v4',
  music: 'M9 18V6.5l10-2v11M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  alert: 'M12 4.5 3 19.5h18zM12 10v4M12 16.8h.01',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5.5M12 7.6h.01',
  check: 'M5 12.5 10 17.5 19 7',
  dice: 'M4.5 4.5h15v15h-15zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 5v4h4',
  chevronLeft: 'M14.5 6 8.5 12l6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
} as const

export type IconName = keyof typeof PATHS

interface IconProps {
  name: IconName
  size?: number
  /** Riempie la forma invece di disegnarne il contorno (play, star). */
  filled?: boolean
  className?: string
}

export function Icon({ name, size = 20, filled = false, className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
