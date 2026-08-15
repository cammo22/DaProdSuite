import type { JSX } from 'react'
import { useController } from '@/app/hooks'
import { COMMON_FORMATS } from '@/audio/formats'
import { Icon } from '@/components/Icon'
import { dentroLaSuite } from '@/suite/bridge'

/**
 * Schermata iniziale (02_UX_UI.md): logo, invito al trascinamento e formati.
 * Il visualizzatore continua a girare dietro, gia' animato.
 */
export function EmptyScreen({ dragging }: { dragging: boolean }): JSX.Element {
  const controller = useController()

  return (
    <div className="dpv-empty" data-dragging={dragging}>
      <div className="dpv-empty__inner">
        <div className="dpv-logo" aria-hidden="true">
          <span className="dpv-logo__mark">
            <Icon name="music" size={26} />
          </span>
          <span className="dpv-logo__text">
            DaProd<b>Visualizer</b>
          </span>
        </div>

        <h1 className="dpv-empty__title">Trascina qui la tua musica</h1>
        <p className="dpv-empty__subtitle">
          Trascina qui uno o piu' file musicali: la riproduzione parte subito e la grafica segue il
          suono.
        </p>

        <div className="dpv-dropzone" data-dragging={dragging}>
          <div className="dpv-dropzone__ring" aria-hidden="true" />
          <Icon name="plus" size={34} />
          <span>Rilascia i file in qualsiasi punto della finestra</span>
        </div>

        <button
          type="button"
          className="dpv-button dpv-button--accent dpv-button--large"
          onClick={() => void controller.openFilePicker()}
        >
          <Icon name="folder" size={18} />
          Aggiungi musica
        </button>

        {/* Compare solo dentro la suite: da sola, la libreria non esiste. */}
        {dentroLaSuite() && (
          <button
            type="button"
            className="dpv-button"
            onClick={() => controller.togglePanel('libreria')}
          >
            <Icon name="music" size={18} />
            Brani generati dalla suite
          </button>
        )}

        <ul className="dpv-formats" aria-label="Formati supportati">
          {COMMON_FORMATS.map((format) => (
            <li key={format}>{format}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
