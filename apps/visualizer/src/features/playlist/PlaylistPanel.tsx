import { useMemo, useState, type JSX } from 'react'
import { selectCurrentId, selectTracks, useAppState, useController } from '@/app/hooks'
import { formatTime, formatTotal } from '@/app/format'
import type { Track } from '@/app/types'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { Panel } from '@/components/Panel'

interface ContextMenuState {
  trackId: string
  x: number
  y: number
}

/** Coda locale: ricerca, riordino con trascinamento, rimozione. */
export function PlaylistPanel(): JSX.Element {
  const controller = useController()
  const tracks = useAppState(selectTracks)
  const currentId = useAppState(selectCurrentId)

  const [query, setQuery] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tracks
    return tracks.filter(
      (t) =>
        t.meta.title.toLowerCase().includes(q) ||
        t.meta.artist.toLowerCase().includes(q) ||
        t.meta.album.toLowerCase().includes(q) ||
        t.fileName.toLowerCase().includes(q),
    )
  }, [tracks, query])

  const totalSeconds = useMemo(
    () => tracks.reduce((sum, t) => sum + (t.duration || t.meta.duration || 0), 0),
    [tracks],
  )

  // Il riordino agisce sugli indici reali: con la ricerca attiva resta disattivato.
  const reorderable = query.trim().length === 0

  return (
    <Panel
      title="Playlist"
      subtitle={
        tracks.length === 0
          ? 'La coda e\' vuota'
          : `${tracks.length} ${tracks.length === 1 ? 'brano' : 'brani'} · ${formatTotal(totalSeconds)}`
      }
      onClose={() => controller.closePanel()}
      footer={
        <>
          <button
            type="button"
            className="dpv-button"
            onClick={() => void controller.openFilePicker()}
          >
            <Icon name="plus" size={16} />
            Aggiungi
          </button>
          <button
            type="button"
            className="dpv-button dpv-button--danger"
            disabled={tracks.length === 0}
            onClick={() => controller.clearQueue()}
          >
            <Icon name="trash" size={16} />
            Svuota
          </button>
        </>
      }
    >
      <div className="dpv-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          value={query}
          placeholder="Cerca nella coda"
          aria-label="Cerca nella coda"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="dpv-panel__empty">
          {tracks.length === 0 ? 'Trascina dei file per iniziare.' : 'Nessun risultato.'}
        </p>
      ) : (
        <ol className="dpv-queue" onDragLeave={() => setOverIndex(null)}>
          {filtered.map((track) => {
            const index = tracks.indexOf(track)
            return (
              <QueueRow
                key={track.id}
                track={track}
                index={index}
                current={track.id === currentId}
                draggable={reorderable}
                dropTarget={overIndex === index && dragIndex !== index}
                onPlay={() => void controller.playTrack(track.id)}
                onRemove={() => controller.removeTrack(track.id)}
                onContextMenu={(x, y) => setMenu({ trackId: track.id, x, y })}
                onDragStart={() => setDragIndex(index)}
                onDragOver={() => setOverIndex(index)}
                onDrop={() => {
                  if (dragIndex !== null) controller.moveTrack(dragIndex, index)
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
              />
            )
          })}
        </ol>
      )}

      {menu && (
        <>
          <div className="dpv-menu__backdrop" onClick={() => setMenu(null)} />
          <div className="dpv-menu" style={{ left: menu.x, top: menu.y }} role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void controller.revealTrack(menu.trackId)
                setMenu(null)
              }}
            >
              <Icon name="folder" size={16} />
              Mostra in Esplora risorse
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                controller.removeTrack(menu.trackId)
                setMenu(null)
              }}
            >
              <Icon name="trash" size={16} />
              Rimuovi dalla coda
            </button>
          </div>
        </>
      )}
    </Panel>
  )
}

interface QueueRowProps {
  track: Track
  index: number
  current: boolean
  draggable: boolean
  dropTarget: boolean
  onPlay: () => void
  onRemove: () => void
  onContextMenu: (x: number, y: number) => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
  onDragEnd: () => void
}

function QueueRow({
  track,
  index,
  current,
  draggable,
  dropTarget,
  onPlay,
  onRemove,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: QueueRowProps): JSX.Element {
  const duration = track.duration || track.meta.duration

  return (
    <li
      className="dpv-queue__row"
      data-current={current}
      data-error={track.status === 'error'}
      data-drop={dropTarget}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (!draggable) return
        event.preventDefault()
        onDragOver()
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      onDoubleClick={onPlay}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu(event.clientX, event.clientY)
      }}
    >
      {draggable && (
        <span className="dpv-queue__grip" aria-hidden="true">
          <Icon name="grip" size={16} />
        </span>
      )}

      <button type="button" className="dpv-queue__main" onClick={onPlay}>
        <span className="dpv-queue__index">{current ? <Icon name="play" size={12} filled /> : index + 1}</span>
        <span className="dpv-queue__cover" data-empty={!track.meta.coverUrl}>
          {track.meta.coverUrl ? <img src={track.meta.coverUrl} alt="" /> : <Icon name="music" size={14} />}
        </span>
        <span className="dpv-queue__text">
          <span className="dpv-queue__title">{track.meta.title}</span>
          <span className="dpv-queue__artist">
            {track.meta.artist}
            {track.status === 'error' ? ` · ${track.error ?? 'non riproducibile'}` : ''}
          </span>
        </span>
        <span className="dpv-queue__time">{duration > 0 ? formatTime(duration) : '—'}</span>
      </button>

      <IconButton icon="close" label="Rimuovi dalla coda" size={16} onClick={onRemove} />
    </li>
  )
}
