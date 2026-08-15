import { useEffect, useRef, type JSX, type ReactNode } from 'react'
import { IconButton } from './IconButton'

interface PanelProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Pannello largo per la griglia dei preset. */
  wide?: boolean
}

/** Pannello laterale richiudibile, con trappola di focus leggera. */
export function Panel({ title, subtitle, onClose, children, footer, wide }: PanelProps): JSX.Element {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    // Il primo elemento interattivo riceve il focus: navigazione da tastiera senza mouse.
    const first = ref.current?.querySelector<HTMLElement>(
      'input, button, select, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus({ preventScroll: true })
  }, [])

  return (
    <aside
      ref={ref}
      className="dpv-panel"
      data-wide={wide}
      role="dialog"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <header className="dpv-panel__head">
        <div>
          <h2 className="dpv-panel__title">{title}</h2>
          {subtitle && <p className="dpv-panel__subtitle">{subtitle}</p>}
        </div>
        <IconButton icon="close" label="Chiudi pannello" onClick={onClose} />
      </header>

      <div className="dpv-panel__body">{children}</div>

      {footer && <footer className="dpv-panel__foot">{footer}</footer>}
    </aside>
  )
}
