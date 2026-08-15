import type { JSX } from 'react'
import { selectNotices, useAppState, useController } from '@/app/hooks'
import { Icon, type IconName } from './Icon'
import { IconButton } from './IconButton'

const ICONS: Record<string, IconName> = { info: 'info', warn: 'alert', error: 'alert' }

/** Avvisi non invasivi, in basso a destra. Gli errori restano finche' non si chiudono. */
export function NoticeStack(): JSX.Element | null {
  const controller = useController()
  const notices = useAppState(selectNotices)
  if (notices.length === 0) return null

  return (
    <div className="dpv-notices" role="status" aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.id} className="dpv-notice" data-kind={notice.kind}>
          <Icon name={ICONS[notice.kind] ?? 'info'} size={18} />
          <div className="dpv-notice__text">
            <span>{notice.text}</span>
            {notice.detail && (
              <details>
                <summary>Dettagli</summary>
                <pre>{notice.detail}</pre>
              </details>
            )}
          </div>
          <IconButton
            icon="close"
            label="Chiudi avviso"
            size={16}
            onClick={() => controller.dismissNotice(notice.id)}
          />
        </div>
      ))}
    </div>
  )
}
