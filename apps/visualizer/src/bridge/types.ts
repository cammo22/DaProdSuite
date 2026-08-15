/**
 * Contratto fra frontend e guscio desktop.
 *
 * Il frontend non sa se sotto ci sia Electron o un browser: parla solo con
 * questa interfaccia. `WebBridge` e' l'implementazione da browser e dichiara
 * quali capacita' mancano, cosi' la UI puo' spiegarlo all'utente invece di
 * fallire in silenzio.
 *
 * I nomi dei messaggi seguono 03_TECH_ARCHITECTURE.md.
 */

export const BRIDGE_SCHEMA_VERSION = 2

export interface HostCapabilities {
  /** Transcodifica FFmpeg per i formati che Chromium non decodifica. */
  ffmpeg: boolean
  /** Percorsi reali dei file: serve per "Mostra in Esplora risorse" e per la coda persistente. */
  filePaths: boolean
  /** Salvataggio della coda fra un avvio e l'altro. */
  persistentQueue: boolean
  /** Finestra a schermo intero gestita dall'host. */
  nativeFullscreen: boolean
}

/**
 * File in ingresso, dal drag & drop o dal selettore.
 *
 * `file` c'e' quando il file arriva dal drag & drop del browser; manca quando
 * viene dal dialogo nativo o dalla coda ripristinata, dove si ha solo il
 * percorso. Almeno uno dei due e' sempre presente.
 */
export interface IncomingFile {
  file: File | null
  name: string
  size: number
  /** Percorso su disco, se il guscio lo espone. */
  path: string | null
}

export interface HostBridge {
  readonly kind: 'web' | 'desktop'
  readonly capabilities: HostCapabilities

  /** Attende che l'host abbia finito di dichiarare le proprie capacita'. */
  ready?(): Promise<void>

  /** Impostazioni persistenti (in %LOCALAPPDATA%/DaProdVisualizer/ sul desktop). */
  loadState<T>(key: string, fallback: T): Promise<T>
  saveState<T>(key: string, value: T): Promise<void>

  /** Apre il selettore file nativo. */
  pickFiles(): Promise<IncomingFile[]>

  /** Percorso reale di un file trascinato, quando l'host lo sa. */
  getPathForFile?(file: File): string | null

  /** URL riproducibile per un percorso su disco. */
  trackUrl?(path: string): Promise<string | null>

  /**
   * Prepara una sorgente riproducibile per un formato non nativo.
   * Restituisce un URL utilizzabile, oppure null se non e' possibile.
   */
  prepareSource(input: IncomingFile): Promise<string | null>

  /** Primi byte del file, per leggere i tag senza caricarlo tutto. */
  readTagBytes?(path: string): Promise<Uint8Array | null>

  /** Nome e dimensione di un percorso, per ricostruire la coda salvata. */
  describeFile?(path: string): Promise<{ name: string; size: number; path: string } | null>

  /** Mostra il file in Esplora risorse. */
  reveal(path: string): Promise<boolean>

  /** Schermo intero della finestra nativa. */
  setFullscreen?(value: boolean): Promise<boolean>
  isFullscreen?(): Promise<boolean>
}
