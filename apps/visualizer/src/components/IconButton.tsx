import type { JSX } from 'react'
import { Icon, type IconName } from './Icon'

interface IconButtonProps {
  icon: IconName
  /** Testo del tooltip e della label accessibile: obbligatorio (02_UX_UI.md). */
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  size?: number
  variant?: 'ghost' | 'solid' | 'primary'
  filled?: boolean
  badge?: string
  /** Si nasconde nelle finestre basse, dove ogni riga in piu' costa. */
  optional?: boolean
}

/** Pulsante icona con tooltip nativo e stato attivo evidenziato. */
export function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  size = 20,
  variant = 'ghost',
  filled = false,
  badge,
  optional = false,
}: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="dpv-iconbtn"
      data-variant={variant}
      data-active={active}
      data-optional={optional}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={size} filled={filled} />
      {badge && <span className="dpv-iconbtn__badge">{badge}</span>}
    </button>
  )
}
