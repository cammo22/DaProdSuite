/**
 * Classificazione dei formati (01_PRODUCT_SPEC.md).
 *
 * "native"  = decodificato direttamente dal motore multimediale di Chromium.
 * "ffmpeg"  = richiede la transcodifica del guscio desktop.
 * "unknown" = estensione non audio: il file viene segnalato e ignorato.
 */
export type FormatSupport = 'native' | 'ffmpeg' | 'unknown'

interface FormatInfo {
  ext: string
  label: string
  mime: string
  /** Supporto atteso senza guscio desktop. */
  expected: Exclude<FormatSupport, 'unknown'>
}

const FORMATS: FormatInfo[] = [
  { ext: 'mp3', label: 'MP3', mime: 'audio/mpeg', expected: 'native' },
  { ext: 'wav', label: 'WAV', mime: 'audio/wav', expected: 'native' },
  { ext: 'wave', label: 'WAV', mime: 'audio/wav', expected: 'native' },
  { ext: 'flac', label: 'FLAC', mime: 'audio/flac', expected: 'native' },
  { ext: 'ogg', label: 'OGG', mime: 'audio/ogg; codecs="vorbis"', expected: 'native' },
  { ext: 'oga', label: 'OGG', mime: 'audio/ogg; codecs="vorbis"', expected: 'native' },
  { ext: 'opus', label: 'OPUS', mime: 'audio/ogg; codecs="opus"', expected: 'native' },
  { ext: 'm4a', label: 'M4A', mime: 'audio/mp4; codecs="mp4a.40.2"', expected: 'native' },
  { ext: 'm4b', label: 'M4B', mime: 'audio/mp4; codecs="mp4a.40.2"', expected: 'native' },
  { ext: 'mp4', label: 'MP4', mime: 'audio/mp4; codecs="mp4a.40.2"', expected: 'native' },
  { ext: 'aac', label: 'AAC', mime: 'audio/aac', expected: 'native' },
  { ext: 'weba', label: 'WEBM', mime: 'audio/webm', expected: 'native' },
  { ext: 'webm', label: 'WEBM', mime: 'audio/webm', expected: 'native' },
  { ext: 'mka', label: 'MKA', mime: 'audio/x-matroska', expected: 'ffmpeg' },
  { ext: 'wma', label: 'WMA', mime: 'audio/x-ms-wma', expected: 'ffmpeg' },
  { ext: 'aiff', label: 'AIFF', mime: 'audio/aiff', expected: 'ffmpeg' },
  { ext: 'aif', label: 'AIFF', mime: 'audio/aiff', expected: 'ffmpeg' },
  { ext: 'alac', label: 'ALAC', mime: 'audio/x-alac', expected: 'ffmpeg' },
  { ext: 'ape', label: 'APE', mime: 'audio/x-ape', expected: 'ffmpeg' },
  { ext: 'wv', label: 'WavPack', mime: 'audio/x-wavpack', expected: 'ffmpeg' },
  { ext: 'mpc', label: 'Musepack', mime: 'audio/x-musepack', expected: 'ffmpeg' },
  { ext: 'tta', label: 'TTA', mime: 'audio/x-tta', expected: 'ffmpeg' },
  { ext: 'ac3', label: 'AC3', mime: 'audio/ac3', expected: 'ffmpeg' },
  { ext: 'amr', label: 'AMR', mime: 'audio/amr', expected: 'ffmpeg' },
  { ext: 'dsf', label: 'DSF', mime: 'audio/x-dsf', expected: 'ffmpeg' },
]

const BY_EXT = new Map(FORMATS.map((f) => [f.ext, f]))

/** Cache delle risposte di canPlayType: l'elemento di prova si crea una volta sola. */
let probeElement: HTMLAudioElement | null = null
const probeCache = new Map<string, boolean>()

function canPlay(mime: string): boolean {
  const cached = probeCache.get(mime)
  if (cached !== undefined) return cached
  probeElement ??= document.createElement('audio')
  const answer = probeElement.canPlayType(mime)
  const result = answer === 'probably' || answer === 'maybe'
  probeCache.set(mime, result)
  return result
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

export function formatLabel(name: string): string {
  const info = BY_EXT.get(extensionOf(name))
  return info?.label ?? extensionOf(name).toUpperCase()
}

/** Livello di supporto reale per il file indicato. */
export function detectSupport(name: string): FormatSupport {
  const info = BY_EXT.get(extensionOf(name))
  if (!info) return 'unknown'
  if (info.expected === 'native' && canPlay(info.mime)) return 'native'
  return 'ffmpeg'
}

/** Elenco compatto mostrato nella schermata iniziale. */
export const COMMON_FORMATS = ['MP3', 'WAV', 'FLAC', 'AAC', 'M4A', 'OGG', 'OPUS', 'WMA']

/** Filtro per il selettore di file. */
export const FILE_ACCEPT = FORMATS.map((f) => `.${f.ext}`).join(',')

/** Le firme piu' comuni: una estensione giusta su un file sbagliato non deve passare. */
const SIGNATURES: { bytes: number[]; offset: number; ext: string[] }[] = [
  { bytes: [0x49, 0x44, 0x33], offset: 0, ext: ['mp3'] }, // ID3
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, ext: ['wav', 'wave'] }, // RIFF
  { bytes: [0x66, 0x4c, 0x61, 0x43], offset: 0, ext: ['flac'] }, // fLaC
  { bytes: [0x4f, 0x67, 0x67, 0x53], offset: 0, ext: ['ogg', 'oga', 'opus'] }, // OggS
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, ext: ['m4a', 'm4b', 'mp4', 'alac'] }, // ftyp
  { bytes: [0x46, 0x4f, 0x52, 0x4d], offset: 0, ext: ['aiff', 'aif'] }, // FORM
  { bytes: [0x4d, 0x41, 0x43, 0x20], offset: 0, ext: ['ape'] }, // MAC␠
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0, ext: ['webm', 'weba', 'mka'] }, // EBML
  { bytes: [0x30, 0x26, 0xb2, 0x75], offset: 0, ext: ['wma'] }, // ASF
]

/**
 * Verifica che i primi byte siano coerenti con l'estensione.
 * Un MP3 senza tag ID3 inizia con un frame sync (0xFF 0xEx/0xFx): lo accettiamo.
 *
 * I byte arrivano da fuori perche' la sorgente cambia: dal drag & drop c'e' un
 * Blob, dal dialogo nativo solo un percorso che legge il guscio.
 */
export async function verifySignature(name: string, head16: Uint8Array | null): Promise<boolean> {
  const ext = extensionOf(name)
  const expected = SIGNATURES.filter((s) => s.ext.includes(ext))
  if (expected.length === 0) return true // formato senza firma nota: si prova comunque
  // Senza i byte non si puo' giudicare: si lascia decidere al decoder.
  if (!head16) return true

  try {
    const head = head16
    if (head.length < 8) return false

    for (const sig of expected) {
      let match = true
      for (let i = 0; i < sig.bytes.length; i++) {
        if (head[sig.offset + i] !== sig.bytes[i]) {
          match = false
          break
        }
      }
      if (match) return true
    }
    if (ext === 'mp3' && head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return true
    return false
  } catch {
    return true // se non riusciamo a leggere l'intestazione lasciamo decidere al decoder
  }
}
