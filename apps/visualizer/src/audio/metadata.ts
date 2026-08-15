import { parseBlob } from 'music-metadata'
import { createLogger } from '@/lib/log'
import { formatLabel } from './formats'

const log = createLogger('metadata')

export interface TrackMetadata {
  title: string
  artist: string
  album: string
  year: number | null
  /** Durata in secondi letta dai tag; 0 se ignota (la conferma il player). */
  duration: number
  /** Object URL della copertina incorporata, oppure null. */
  coverUrl: string | null
  /** Etichetta del formato, es. "FLAC 24 bit 96 kHz". */
  formatInfo: string
  /** true quando i tag non erano leggibili e abbiamo ripiegato sul nome file. */
  fromFilename: boolean
}

/** Ricava titolo e artista dal nome file quando i tag mancano. */
export function metadataFromFilename(name: string): TrackMetadata {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
  const parts = base.split(/\s+-\s+/)
  const hasArtist = parts.length >= 2

  return {
    title: (hasArtist ? parts.slice(1).join(' - ') : base) || name,
    artist: hasArtist ? parts[0] : 'Artista sconosciuto',
    album: '',
    year: null,
    duration: 0,
    coverUrl: null,
    formatInfo: formatLabel(name),
    fromFilename: true,
  }
}

/**
 * Legge i tag in modo asincrono. Non lancia mai: su file corrotto o tag esotici
 * ripiega sul nome del file, come richiesto da 04_AUDIO_ENGINE.md.
 *
 * Prende un Blob e non un File perche' la sorgente cambia: dal drag & drop e' il
 * file intero, dal dialogo nativo sono i primi byte che ha letto il guscio.
 */
export async function readMetadata(blob: Blob, fileName: string): Promise<TrackMetadata> {
  const fallback = metadataFromFilename(fileName)
  try {
    const parsed = await parseBlob(blob, { duration: false, skipPostHeaders: true })
    const common = parsed.common
    const format = parsed.format

    const picture = common.picture?.[0]
    let coverUrl: string | null = null
    if (picture && picture.data.byteLength > 0) {
      const bytes = picture.data
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const blob = new Blob([copy], { type: picture.format || 'image/jpeg' })
      coverUrl = URL.createObjectURL(blob)
    }

    const bits = [
      formatLabel(fileName),
      format.bitsPerSample ? `${format.bitsPerSample} bit` : null,
      format.sampleRate ? `${Math.round(format.sampleRate / 100) / 10} kHz` : null,
      format.bitrate ? `${Math.round(format.bitrate / 1000)} kbps` : null,
      format.numberOfChannels === 1 ? 'mono' : null,
    ].filter(Boolean)

    return {
      title: cleanTag(common.title) ?? fallback.title,
      artist: cleanTag(common.artist) ?? cleanTag(common.albumartist) ?? fallback.artist,
      album: cleanTag(common.album) ?? '',
      year: common.year ?? null,
      duration: format.duration ?? 0,
      coverUrl,
      formatInfo: bits.join(' · '),
      fromFilename: common.title == null,
    }
  } catch (error) {
    log.warn(`tag non leggibili per "${fileName}", uso il nome file`, error)
    return fallback
  }
}

/** Byte nullo: alcuni tag ID3 lo lasciano in coda alle stringhe. */
const NUL = String.fromCharCode(0)

function cleanTag(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.split(NUL).join('').trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Libera l'object URL di una copertina. */
export function releaseCover(url: string | null): void {
  if (url) URL.revokeObjectURL(url)
}
