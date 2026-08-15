import { AudioEngine } from '@/audio/AudioEngine'
import { detectSupport, extensionOf, verifySignature } from '@/audio/formats'
import { metadataFromFilename, readMetadata, releaseCover } from '@/audio/metadata'
import { resolveBridge } from '@/bridge/WebBridge'
import type { HostBridge, IncomingFile } from '@/bridge/types'
import { createLogger } from '@/lib/log'
import type { VisualEngine } from '@/visual-engine/core/VisualEngine'
import { DEFAULT_PRESET_ID, presetIds } from '@/visual-engine/presets'
import { DEFAULT_SETTINGS, normalizeSettings, type RepeatMode, type Settings } from './settings'
import { createStore, type Store } from './store'
import type { AppState, Notice, NoticeKind, PanelName, Track } from './types'

const log = createLogger('app')

const SETTINGS_KEY = 'settings'
const SESSION_KEY = 'session'

/** Ritardo prima che i controlli spariscano in modalita' cinema (02_UX_UI.md). */
const CONTROLS_HIDE_DELAY = 3000

/** Stato "veloce": cambia a ogni frame e non deve far ridisegnare tutta la UI. */
export interface ClockState {
  position: number
  duration: number
  buffered: number
}

interface PersistedSession {
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  presetId: string
  favorites: string[]
  /** Percorsi della coda, solo quando il guscio li conosce. */
  queue: string[]
}

function initialState(): AppState {
  return {
    tracks: [],
    currentId: null,
    playback: 'idle',
    duration: 0,
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: 'off',
    panel: 'none',
    cinema: false,
    fullscreen: false,
    controlsVisible: true,
    notices: [],
    settings: { ...DEFAULT_SETTINGS },
    presetId: DEFAULT_PRESET_ID,
    favorites: [],
    importing: false,
    rendererFailed: false,
  }
}

/**
 * Cervello dell'applicazione: coda, riproduzione, impostazioni e collegamento
 * col motore visuale. React ne osserva solo lo store.
 */
export class AppController {
  readonly store: Store<AppState> = createStore(initialState())
  readonly clock: Store<ClockState> = createStore<ClockState>({
    position: 0,
    duration: 0,
    buffered: 0,
  })

  readonly audio = new AudioEngine()
  readonly bridge: HostBridge = resolveBridge()

  private visual: VisualEngine | null = null
  private clockRaf = 0
  private hideTimer = 0
  private noticeSeq = 0
  private trackSeq = 0
  /** Id gia' riprodotti in modalita' casuale, per non ripetere prima del giro completo. */
  private shuffleHistory: string[] = []
  private saveTimer = 0

  constructor() {
    this.audio.events.on('statechange', (playback) => {
      this.patch({ playback })
      if (playback === 'playing') this.startClock()
      else this.stopClock()
    })

    this.audio.events.on('loaded', ({ duration }) => {
      this.patch({ duration })
      this.clock.set((c) => ({ ...c, duration }))
      const id = this.store.get().currentId
      if (id) this.updateTrack(id, (t) => ({ ...t, duration, status: 'ready' }))
    })

    this.audio.events.on('ended', () => {
      this.handleTrackEnd()
    })

    this.audio.events.on('error', ({ message }) => {
      const id = this.store.get().currentId
      if (id) {
        const track = this.findTrack(id)
        this.updateTrack(id, (t) => ({ ...t, status: 'error', error: message }))
        this.notify('error', `${track?.meta.title ?? 'Brano'}: ${message}`)
      }
      // Un file rotto non ferma la coda: si passa avanti.
      this.next(true)
    })

    this.audio.events.on('volumechange', ({ volume, muted }) => {
      this.patch({ volume, muted })
      this.scheduleSessionSave()
    })
  }

  // --- Avvio ----------------------------------------------------------------

  async initialize(): Promise<void> {
    // Il guscio dichiara le capacita' in modo asincrono (ffmpeg dipende da cosa
    // c'e' sul PC): si aspetta, cosi' la UI al primo disegno le sa gia'.
    await this.bridge.ready?.()

    const rawSettings = await this.bridge.loadState<unknown>(SETTINGS_KEY, null)
    const settings = normalizeSettings(rawSettings)

    const session = await this.bridge.loadState<PersistedSession | null>(SESSION_KEY, null)
    const volume = typeof session?.volume === 'number' ? session.volume : 0.8
    const muted = session?.muted === true
    const validPresets = presetIds()
    const presetId =
      session?.presetId && validPresets.includes(session.presetId)
        ? session.presetId
        : DEFAULT_PRESET_ID

    this.patch({
      settings,
      volume,
      muted,
      shuffle: session?.shuffle === true,
      repeat: session?.repeat === 'one' || session?.repeat === 'all' ? session.repeat : 'off',
      presetId,
      favorites: Array.isArray(session?.favorites)
        ? session.favorites.filter((id) => validPresets.includes(id))
        : [],
    })

    this.audio.setVolume(volume)
    this.audio.setMuted(muted)
    this.audio.setSensitivity(settings.sensitivity)
    this.applyDocumentSettings(settings)
    log.info('impostazioni caricate', { bridge: this.bridge.kind })

    if (settings.rememberQueue && this.bridge.capabilities.persistentQueue) {
      await this.restoreQueue(session?.queue ?? [])
    }
  }

  /**
   * Ricostruisce la coda dell'avvio precedente dai percorsi salvati.
   * I file spariti nel frattempo vengono saltati senza dire niente: non e' un
   * errore, e un avviso all'avvio per un brano spostato sarebbe solo fastidio.
   */
  private async restoreQueue(paths: string[]): Promise<void> {
    const describe = this.bridge.describeFile
    if (!describe || paths.length === 0) return

    const found: IncomingFile[] = []
    for (const filePath of paths.slice(0, 500)) {
      const info = await describe.call(this.bridge, filePath)
      if (info) found.push({ file: null, ...info })
    }
    if (found.length === 0) return

    await this.addFiles(found, { autoplay: false })
    log.info(`coda ripristinata: ${found.length} brani su ${paths.length}`)
  }

  /** Collega il motore visuale appena il canvas e' montato. */
  attachVisual(engine: VisualEngine): void {
    this.visual = engine
    const state = this.store.get()
    engine.applySettings(state.settings)
    engine.setPool(state.favorites.length > 1 ? state.favorites : presetIds())
    engine.activatePreset(state.presetId, true)
    this.patch({ rendererFailed: false })
  }

  detachVisual(): void {
    this.visual = null
  }

  // --- Import ---------------------------------------------------------------

  /** Aggiunge file alla coda; non blocca mai l'interfaccia. */
  async addFiles(incoming: IncomingFile[], options: { autoplay?: boolean } = {}): Promise<void> {
    if (incoming.length === 0) return
    this.patch({ importing: true })

    const state = this.store.get()
    const settings = state.settings
    const existing = new Set(
      state.tracks.map((t) => `${t.fileName}:${t.size}`),
    )

    const accepted: Track[] = []
    const rejected: string[] = []
    const needsFfmpeg: string[] = []

    for (const item of incoming) {
      const support = detectSupport(item.name)

      if (support === 'unknown') {
        rejected.push(item.name)
        continue
      }

      const key = `${item.name}:${item.size}`
      if (settings.preventDuplicates && existing.has(key)) continue
      existing.add(key)

      if (!(await verifySignature(item.name, await this.headBytes(item)))) {
        rejected.push(item.name)
        log.warn(`firma incoerente con l'estensione: ${item.name}`)
        continue
      }

      if (support === 'ffmpeg' && !this.bridge.capabilities.ffmpeg) {
        needsFfmpeg.push(item.name)
        continue
      }

      const id = `t${++this.trackSeq}`
      accepted.push({
        id,
        fileName: item.name,
        size: item.size,
        path: item.path,
        support,
        meta: metadataFromFilename(item.name),
        status: 'pending',
        error: null,
        duration: 0,
      })
      this.sources.set(id, item)
    }

    if (accepted.length > 0) {
      const wasEmpty = this.store.get().tracks.length === 0
      this.patch({ tracks: [...this.store.get().tracks, ...accepted] })

      // I tag si leggono dopo: la coda compare subito col nome del file.
      void this.hydrateMetadata(accepted)

      // Si parte da soli solo se non c'e' gia' un brano caricato: aggiungere
      // file durante l'ascolto non deve interrompere quello in corso.
      const shouldPlay = options.autoplay ?? settings.autoplayOnDrop
      if (shouldPlay && (wasEmpty || !this.store.get().currentId)) {
        await this.playTrack(accepted[0].id)
      }
    }

    if (rejected.length > 0) {
      this.notify(
        'warn',
        rejected.length === 1
          ? `"${rejected[0]}" non e' un file audio compatibile.`
          : `${rejected.length} file non compatibili sono stati ignorati.`,
        rejected.join('\n'),
      )
    }
    if (needsFfmpeg.length > 0) {
      const list = [...new Set(needsFfmpeg.map((n) => extensionOf(n).toUpperCase()))].join(', ')
      this.notify(
        'warn',
        `${list}: serve il guscio desktop con FFmpeg per riprodurli.`,
        needsFfmpeg.join('\n'),
      )
    }

    this.patch({ importing: false })
  }

  /** File originali, tenuti fuori dallo store perche' non sono serializzabili. */
  private readonly sources = new Map<string, IncomingFile>()
  /** Object URL creati per la riproduzione, da revocare alla rimozione. */
  private readonly objectUrls = new Map<string, string>()

  /** Primi byte del file, dal Blob se c'e' o dal guscio se abbiamo solo il percorso. */
  private async headBytes(item: IncomingFile): Promise<Uint8Array | null> {
    if (item.file) {
      try {
        return new Uint8Array(await item.file.slice(0, 16).arrayBuffer())
      } catch {
        return null
      }
    }
    if (item.path && this.bridge.readTagBytes) {
      const bytes = await this.bridge.readTagBytes(item.path)
      return bytes ? bytes.subarray(0, 16) : null
    }
    return null
  }

  /** Blob da cui leggere i tag: il file intero, oppure la testa letta dal guscio. */
  private async tagBlob(item: IncomingFile): Promise<Blob | null> {
    if (item.file) return item.file
    if (item.path && this.bridge.readTagBytes) {
      const bytes = await this.bridge.readTagBytes(item.path)
      // Copia in un buffer nostro: quello che arriva dal ponte non e' un
      // ArrayBuffer di questo contesto e Blob non lo accetterebbe.
      if (bytes) return new Blob([new Uint8Array(bytes)])
    }
    return null
  }

  private async hydrateMetadata(tracks: Track[]): Promise<void> {
    for (const track of tracks) {
      const source = this.sources.get(track.id)
      if (!source) continue
      const blob = await this.tagBlob(source)
      if (!blob) continue
      const meta = await readMetadata(blob, source.name)
      // Il brano potrebbe essere stato rimosso nel frattempo.
      if (!this.findTrack(track.id)) {
        releaseCover(meta.coverUrl)
        continue
      }
      this.updateTrack(track.id, (t) => {
        releaseCover(t.meta.coverUrl)
        return { ...t, meta, duration: t.duration || meta.duration }
      })
    }
  }

  async openFilePicker(): Promise<void> {
    const files = await this.bridge.pickFiles()
    await this.addFiles(files)
  }

  /**
   * Trova un URL riproducibile per un brano.
   *
   * Tre strade, in ordine: transcodifica del guscio per i formati che Chromium
   * non decodifica, object URL quando abbiamo il Blob, e URL del guscio quando
   * abbiamo solo il percorso — quest'ultimo trasmette in streaming, quindi un
   * brano lungo non finisce tutto in memoria e il seek continua a funzionare.
   */
  private async resolveSource(id: string, track: Track): Promise<string | null> {
    const source = this.sources.get(id)

    if (track.support === 'ffmpeg') {
      const input: IncomingFile =
        source ?? { file: null, name: track.fileName, size: track.size, path: track.path }
      return this.bridge.prepareSource(input)
    }

    if (source?.file) return URL.createObjectURL(source.file)

    const path = source?.path ?? track.path
    if (path && this.bridge.trackUrl) return this.bridge.trackUrl(path)

    return null
  }

  // --- Riproduzione ----------------------------------------------------------

  async playTrack(id: string): Promise<void> {
    const track = this.findTrack(id)
    if (!track) return

    let url = this.objectUrls.get(id)
    if (!url) {
      url = (await this.resolveSource(id, track)) ?? undefined
      if (!url) {
        this.notify('error', `Sorgente non disponibile per "${track.meta.title}".`)
        return
      }
      this.objectUrls.set(id, url)
    }

    this.patch({ currentId: id, duration: track.duration })
    this.clock.set((c) => ({ ...c, position: 0, duration: track.duration }))
    this.rememberShuffle(id)
    await this.audio.load(url, true)
  }

  async togglePlay(): Promise<void> {
    const state = this.store.get()
    if (!state.currentId) {
      const first = state.tracks[0]
      if (first) await this.playTrack(first.id)
      return
    }
    await this.audio.toggle()
  }

  async next(auto = false): Promise<void> {
    const state = this.store.get()
    const { tracks, currentId } = state
    if (tracks.length === 0) return

    if (state.shuffle) {
      const candidate = this.pickShuffled(tracks, currentId)
      if (candidate) await this.playTrack(candidate)
      return
    }

    const index = tracks.findIndex((t) => t.id === currentId)
    const nextIndex = index + 1

    if (nextIndex >= tracks.length) {
      if (state.repeat === 'all' || !auto) {
        await this.playTrack(tracks[0].id)
      } else {
        this.audio.pause()
      }
      return
    }
    await this.playTrack(tracks[nextIndex].id)
  }

  async previous(): Promise<void> {
    const state = this.store.get()
    const { tracks, currentId } = state
    if (tracks.length === 0) return

    // Convenzione da lettore: entro i primi 3 secondi si torna indietro davvero.
    if (this.audio.position > 3) {
      this.audio.seek(0)
      return
    }

    const index = tracks.findIndex((t) => t.id === currentId)
    const prevIndex = index <= 0 ? tracks.length - 1 : index - 1
    await this.playTrack(tracks[prevIndex].id)
  }

  seek(seconds: number): void {
    this.audio.seek(seconds)
    this.clock.set((c) => ({ ...c, position: this.audio.position }))
  }

  seekBy(delta: number): void {
    this.seek(this.audio.position + delta)
  }

  setVolume(volume: number): void {
    this.audio.setVolume(volume)
  }

  adjustVolume(delta: number): void {
    this.audio.setVolume(this.audio.volume + delta)
  }

  toggleMute(): void {
    this.audio.setMuted(!this.audio.muted)
  }

  toggleShuffle(): void {
    const shuffle = !this.store.get().shuffle
    this.shuffleHistory = []
    this.patch({ shuffle })
    this.scheduleSessionSave()
  }

  cycleRepeat(): void {
    const order: RepeatMode[] = ['off', 'all', 'one']
    const current = this.store.get().repeat
    const repeat = order[(order.indexOf(current) + 1) % order.length]
    this.patch({ repeat })
    this.scheduleSessionSave()
  }

  private handleTrackEnd(): void {
    const state = this.store.get()
    if (state.repeat === 'one') {
      this.audio.seek(0)
      void this.audio.play()
      return
    }
    void this.next(true)
  }

  private pickShuffled(tracks: Track[], currentId: string | null): string | null {
    const pool = tracks.filter((t) => t.id !== currentId && !this.shuffleHistory.includes(t.id))
    if (pool.length === 0) {
      // Giro completato: si riparte, escludendo solo il brano corrente.
      this.shuffleHistory = currentId ? [currentId] : []
      const restart = tracks.filter((t) => t.id !== currentId)
      if (restart.length === 0) return currentId
      return restart[Math.floor(Math.random() * restart.length)].id
    }
    return pool[Math.floor(Math.random() * pool.length)].id
  }

  private rememberShuffle(id: string): void {
    if (!this.shuffleHistory.includes(id)) this.shuffleHistory.push(id)
    const limit = Math.max(1, this.store.get().tracks.length)
    while (this.shuffleHistory.length > limit) this.shuffleHistory.shift()
  }

  // --- Coda ------------------------------------------------------------------

  removeTrack(id: string): void {
    const state = this.store.get()
    const track = this.findTrack(id)
    if (!track) return

    const wasCurrent = state.currentId === id
    const index = state.tracks.findIndex((t) => t.id === id)
    const tracks = state.tracks.filter((t) => t.id !== id)
    this.patch({ tracks })
    this.releaseTrack(id, track)

    if (!wasCurrent) return
    if (tracks.length === 0) {
      this.audio.stop()
      this.patch({ currentId: null, duration: 0 })
      return
    }
    void this.playTrack(tracks[Math.min(index, tracks.length - 1)].id)
  }

  clearQueue(): void {
    const state = this.store.get()
    this.audio.stop()
    for (const track of state.tracks) this.releaseTrack(track.id, track)
    this.shuffleHistory = []
    this.patch({ tracks: [], currentId: null, duration: 0 })
    this.clock.set(() => ({ position: 0, duration: 0, buffered: 0 }))
  }

  /** Sposta un brano nella coda (riordino con trascinamento). */
  moveTrack(from: number, to: number): void {
    const tracks = [...this.store.get().tracks]
    if (from < 0 || from >= tracks.length || to < 0 || to >= tracks.length || from === to) return
    const [moved] = tracks.splice(from, 1)
    tracks.splice(to, 0, moved)
    this.patch({ tracks })
  }

  async revealTrack(id: string): Promise<void> {
    const track = this.findTrack(id)
    if (!track?.path) {
      this.notify('info', 'Il percorso del file e\' disponibile solo nel guscio desktop.')
      return
    }
    const ok = await this.bridge.reveal(track.path)
    if (!ok) this.notify('warn', 'Non sono riuscito ad aprire Esplora risorse.')
  }

  private releaseTrack(id: string, track: Track): void {
    const url = this.objectUrls.get(id)
    if (url) URL.revokeObjectURL(url)
    this.objectUrls.delete(id)
    this.sources.delete(id)
    releaseCover(track.meta.coverUrl)
    this.shuffleHistory = this.shuffleHistory.filter((x) => x !== id)
  }

  // --- Preset ----------------------------------------------------------------

  selectPreset(id: string): void {
    this.patch({ presetId: id })
    this.visual?.activatePreset(id)
    this.scheduleSessionSave()
  }

  nextPreset(): void {
    this.visual?.nextPreset()
  }

  previousPreset(): void {
    this.visual?.previousPreset()
  }

  randomPreset(): void {
    this.visual?.randomPreset()
  }

  /** Il motore comunica il preset realmente attivo (anche dopo un fallback). */
  notePresetChanged(id: string): void {
    if (this.store.get().presetId === id) return
    this.patch({ presetId: id })
    this.scheduleSessionSave()
  }

  toggleFavorite(id: string): void {
    const favorites = this.store.get().favorites
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]
    this.patch({ favorites: next })
    this.visual?.setPool(next.length > 1 ? next : presetIds())
    this.scheduleSessionSave()
  }

  // --- Impostazioni -----------------------------------------------------------

  updateSettings(patch: Partial<Settings>): void {
    const settings = normalizeSettings({ ...this.store.get().settings, ...patch })
    this.patch({ settings })
    this.audio.setSensitivity(settings.sensitivity)
    this.visual?.applySettings(settings)
    this.applyDocumentSettings(settings)
    void this.bridge.saveState(SETTINGS_KEY, settings)
  }

  resetSettings(): void {
    this.updateSettings({ ...DEFAULT_SETTINGS })
  }

  private applyDocumentSettings(settings: Settings): void {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    root.dataset.reducedMotion = String(settings.reducedMotion)
    root.style.setProperty('--dpv-ui-scale', String(settings.uiScale))
    root.lang = settings.language
  }

  // --- Pannelli, cinema, schermo intero ---------------------------------------

  togglePanel(panel: PanelName): void {
    const current = this.store.get().panel
    this.patch({ panel: current === panel ? 'none' : panel })
  }

  closePanel(): void {
    this.patch({ panel: 'none' })
  }

  toggleCinema(): void {
    const cinema = !this.store.get().cinema
    this.patch({ cinema, controlsVisible: true })
    if (cinema) this.armControlsHide()
    else this.clearControlsHide()
  }

  async toggleFullscreen(): Promise<void> {
    // Sul guscio desktop lo fa la finestra vera: l'API del documento dentro
    // Electron lascia fuori la barra del titolo e non e' quello che serve.
    if (this.bridge.capabilities.nativeFullscreen && this.bridge.setFullscreen) {
      const next = !this.store.get().fullscreen
      const applied = await this.bridge.setFullscreen(next)
      this.patch({ fullscreen: applied })
      return
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch (error) {
      log.warn('schermo intero non disponibile', error)
      this.notify('warn', 'Lo schermo intero non e\' disponibile in questo contesto.')
    }
  }

  noteFullscreen(fullscreen: boolean): void {
    this.patch({ fullscreen })
  }

  /** Il mouse si e' mosso: i controlli tornano visibili e riparte il timer. */
  noteActivity(): void {
    const state = this.store.get()
    if (!state.controlsVisible) this.patch({ controlsVisible: true })
    if (state.cinema) this.armControlsHide()
  }

  private armControlsHide(): void {
    this.clearControlsHide()
    this.hideTimer = window.setTimeout(() => {
      const state = this.store.get()
      if (state.cinema && state.panel === 'none') this.patch({ controlsVisible: false })
    }, CONTROLS_HIDE_DELAY)
  }

  private clearControlsHide(): void {
    if (this.hideTimer) window.clearTimeout(this.hideTimer)
    this.hideTimer = 0
  }

  // --- Avvisi -----------------------------------------------------------------

  notify(kind: NoticeKind, text: string, detail?: string): void {
    const notice: Notice = { id: `n${++this.noticeSeq}`, kind, text, detail }
    this.patch({ notices: [...this.store.get().notices, notice] })
    // Gli errori restano finche' l'utente non li chiude.
    if (kind !== 'error') {
      window.setTimeout(() => this.dismissNotice(notice.id), 6000)
    }
  }

  dismissNotice(id: string): void {
    const notices = this.store.get().notices.filter((n) => n.id !== id)
    if (notices.length !== this.store.get().notices.length) this.patch({ notices })
  }

  noteRendererFailure(message: string): void {
    this.patch({ rendererFailed: true })
    this.notify('error', message)
  }

  // --- Clock ------------------------------------------------------------------

  private startClock(): void {
    if (this.clockRaf) return
    let last = 0
    const tick = (now: number) => {
      this.clockRaf = requestAnimationFrame(tick)
      // ~30 Hz: piu' che sufficiente per una barra di avanzamento.
      if (now - last < 33) return
      last = now
      this.clock.set((c) => {
        const position = this.audio.position
        const duration = this.audio.duration || c.duration
        const buffered = this.audio.buffered
        if (c.position === position && c.duration === duration && c.buffered === buffered) return c
        return { position, duration, buffered }
      })
    }
    this.clockRaf = requestAnimationFrame(tick)
  }

  private stopClock(): void {
    if (!this.clockRaf) return
    cancelAnimationFrame(this.clockRaf)
    this.clockRaf = 0
    this.clock.set((c) => ({ ...c, position: this.audio.position }))
  }

  // --- Utilita' ---------------------------------------------------------------

  get currentTrack(): Track | null {
    const { tracks, currentId } = this.store.get()
    return tracks.find((t) => t.id === currentId) ?? null
  }

  private findTrack(id: string): Track | undefined {
    return this.store.get().tracks.find((t) => t.id === id)
  }

  private updateTrack(id: string, updater: (track: Track) => Track): void {
    const tracks = this.store.get().tracks
    const index = tracks.findIndex((t) => t.id === id)
    if (index < 0) return
    const next = [...tracks]
    next[index] = updater(tracks[index])
    this.patch({ tracks: next })
  }

  private patch(partial: Partial<AppState>): void {
    this.store.set((prev) => ({ ...prev, ...partial }))
  }

  private scheduleSessionSave(): void {
    if (this.saveTimer) window.clearTimeout(this.saveTimer)
    this.saveTimer = window.setTimeout(() => {
      const s = this.store.get()
      const keepQueue = s.settings.rememberQueue && this.bridge.capabilities.persistentQueue
      const session: PersistedSession = {
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
        presetId: s.presetId,
        favorites: s.favorites,
        queue: keepQueue
          ? s.tracks.map((t) => t.path).filter((p): p is string => typeof p === 'string')
          : [],
      }
      void this.bridge.saveState(SESSION_KEY, session)
    }, 400)
  }

  dispose(): void {
    this.stopClock()
    this.clearControlsHide()
    if (this.saveTimer) window.clearTimeout(this.saveTimer)
    for (const track of this.store.get().tracks) this.releaseTrack(track.id, track)
    this.audio.dispose()
  }
}
