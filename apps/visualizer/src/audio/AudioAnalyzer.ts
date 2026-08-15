import {
  BAND_COUNT,
  WAVE_COUNT,
  createEmptyFeatures,
  type AnalyzerSensitivity,
  type AudioFeatures,
} from './types'

const FFT_SIZE = 2048

/** Finestra dinamica in dB usata per portare lo spettro in 0..1. */
const DB_FLOOR = -96
const DB_CEIL = -12

/** Estremi delle bande logaritmiche. */
const BAND_MIN_HZ = 28
const BAND_MAX_HZ = 16000

/** Confini delle tre fasce (04_AUDIO_ENGINE.md). */
const BASS_RANGE: [number, number] = [20, 250]
const MID_RANGE: [number, number] = [250, 2000]
const TREBLE_RANGE: [number, number] = [2000, 16000]

/**
 * Banda su cui si cerca il colpo. Volutamente piu' stretta dei "bassi": sopra i
 * 160 Hz entrano charleston e rullanti, che facevano scattare il doppio dei beat.
 */
const BEAT_BAND_HZ: [number, number] = [30, 160]

/** Intervallo minimo fra due beat: 280 ms -> massimo ~214 BPM. */
const BEAT_REFRACTORY = 0.28

/** Livello medio di banda a cui punta il guadagno automatico. */
const AUTO_GAIN_TARGET = 0.5
const AUTO_GAIN_MIN = 0.65
const AUTO_GAIN_MAX = 4.5

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Coefficiente di smoothing esponenziale indipendente dal frame rate. */
function coeff(dt: number, tau: number): number {
  if (tau <= 0) return 1
  return 1 - Math.exp(-dt / tau)
}

interface BandSlice {
  lo: number
  hi: number
  /** Peso 0..1 della fascia bassi/medi/alti per questa banda. */
  wBass: number
  wMid: number
  wTreble: number
}

/**
 * Trasforma lo spettro dell'AnalyserNode in feature stabili e normalizzate.
 *
 * Tutto il lavoro sta in `analyze()`, chiamata una volta per frame dal loop di
 * rendering: cosi' le feature sono sempre allineate all'immagine mostrata e non
 * c'e' alcuna coda di messaggi fra audio e grafica.
 */
export class AudioAnalyzer {
  private readonly analyser: AnalyserNode
  private readonly binCount: number
  private readonly binHz: number

  // Il tipo esplicito su ArrayBuffer serve alle firme di AnalyserNode.
  private readonly freqDb: Float32Array<ArrayBuffer>
  private readonly timeDomain: Float32Array<ArrayBuffer>
  private readonly binNorm: Float32Array
  private readonly prevBinNorm: Float32Array
  private readonly slices: BandSlice[] = []

  private readonly features: AudioFeatures = createEmptyFeatures()
  private readonly bandsSmooth = new Float32Array(BAND_COUNT)

  private sensitivity: AnalyzerSensitivity = { global: 1, bass: 1, mid: 1, treble: 1 }

  // Stato del normalizzatore adattivo.
  private levelRef = 0.35
  private rmsRef = 0.12
  private peakHold = 0

  // Stato di flusso, onset e beat.
  private fluxAvg = 0.02
  private beatFluxAvg = 0.02
  private lastBeatTime = -10
  private beatEnvelope = 0
  private readonly beatIntervals: number[] = []
  private bpmEstimate = 0

  private lastTrackTime = 0

  constructor(context: AudioContext) {
    this.analyser = context.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    // Il grosso dello smoothing lo facciamo noi, con attack/release separati.
    this.analyser.smoothingTimeConstant = 0.55
    this.analyser.minDecibels = DB_FLOOR
    this.analyser.maxDecibels = DB_CEIL

    this.binCount = this.analyser.frequencyBinCount
    this.binHz = context.sampleRate / FFT_SIZE

    this.freqDb = new Float32Array(this.binCount)
    this.timeDomain = new Float32Array(FFT_SIZE)
    this.binNorm = new Float32Array(this.binCount)
    this.prevBinNorm = new Float32Array(this.binCount)

    this.buildBands()
  }

  /** Nodo da inserire nella catena audio. */
  get node(): AnalyserNode {
    return this.analyser
  }

  setSensitivity(next: AnalyzerSensitivity): void {
    this.sensitivity = next
  }

  /** Azzera lo stato adattivo: da chiamare al cambio traccia. */
  reset(): void {
    this.levelRef = 0.35
    this.rmsRef = 0.12
    this.peakHold = 0
    this.fluxAvg = 0.02
    this.beatFluxAvg = 0.02
    this.lastBeatTime = -10
    this.beatEnvelope = 0
    this.beatIntervals.length = 0
    this.bpmEstimate = 0
    this.bandsSmooth.fill(0)
    this.prevBinNorm.fill(0)
    this.features.beatCount = 0
    this.features.bands.fill(0)
    this.features.waveform.fill(0)
  }

  /**
   * Calcola le feature del frame corrente.
   *
   * @param dt      delta time in secondi (gia' limitato dal chiamante)
   * @param time    posizione nel brano in secondi
   * @param active  false quando l'audio e' fermo: le feature decadono a zero
   */
  analyze(dt: number, time: number, active: boolean): AudioFeatures {
    const f = this.features
    f.time = time

    if (!active) {
      this.decay(dt)
      return f
    }

    this.analyser.getFloatFrequencyData(this.freqDb)
    this.analyser.getFloatTimeDomainData(this.timeDomain)

    // --- Spettro in 0..1 e flusso spettrale ---------------------------------
    const invRange = 1 / (DB_CEIL - DB_FLOOR)
    let flux = 0
    let beatFlux = 0
    let magSum = 0
    let weightedHz = 0
    const beatLo = Math.max(1, Math.floor(BEAT_BAND_HZ[0] / this.binHz))
    const beatHi = Math.min(this.binCount - 1, Math.ceil(BEAT_BAND_HZ[1] / this.binHz))

    for (let i = 0; i < this.binCount; i++) {
      const db = this.freqDb[i]
      const norm = clamp01(((Number.isFinite(db) ? db : DB_FLOOR) - DB_FLOOR) * invRange)
      this.binNorm[i] = norm

      const rise = norm - this.prevBinNorm[i]
      if (rise > 0) {
        flux += rise
        if (i >= beatLo && i <= beatHi) beatFlux += rise
      }

      magSum += norm
      weightedHz += norm * (i * this.binHz)
    }
    this.prevBinNorm.set(this.binNorm)

    flux /= this.binCount
    beatFlux /= Math.max(1, beatHi - beatLo + 1)

    // --- Bande logaritmiche -------------------------------------------------
    const attack = coeff(dt, 0.02)
    const release = coeff(dt, 0.16)

    let bandMean = 0
    for (let b = 0; b < BAND_COUNT; b++) {
      const slice = this.slices[b]
      let acc = 0
      let peak = 0
      let n = 0
      for (let i = slice.lo; i <= slice.hi; i++) {
        const v = this.binNorm[i]
        acc += v
        if (v > peak) peak = v
        n++
      }
      // Le bande acute raccolgono decine di bin: con la sola media un picco
      // stretto (piatto, charleston) sparirebbe. Meta' media, meta' picco.
      const raw = n > 0 ? acc / n * 0.5 + peak * 0.5 : 0
      bandMean += raw

      const prev = this.bandsSmooth[b]
      const k = raw > prev ? attack : release
      this.bandsSmooth[b] = prev + (raw - prev) * k
    }
    bandMean /= BAND_COUNT

    // --- Guadagno automatico (04_AUDIO_ENGINE.md: envelope + gain limitato) --
    const levelK = bandMean > this.levelRef ? coeff(dt, 0.4) : coeff(dt, 6.0)
    this.levelRef += (bandMean - this.levelRef) * levelK
    const autoGain = clamp(
      AUTO_GAIN_TARGET / Math.max(this.levelRef, 0.04),
      AUTO_GAIN_MIN,
      AUTO_GAIN_MAX,
    )

    // --- Uscita bande + fasce ------------------------------------------------
    const s = this.sensitivity
    let bassAcc = 0
    let bassW = 0
    let midAcc = 0
    let midW = 0
    let trebleAcc = 0
    let trebleW = 0

    for (let b = 0; b < BAND_COUNT; b++) {
      const slice = this.slices[b]
      const bandSens = slice.wBass * s.bass + slice.wMid * s.mid + slice.wTreble * s.treble
      const out = clamp01(this.bandsSmooth[b] * autoGain * s.global * bandSens)
      f.bands[b] = out

      bassAcc += out * slice.wBass
      bassW += slice.wBass
      midAcc += out * slice.wMid
      midW += slice.wMid
      trebleAcc += out * slice.wTreble
      trebleW += slice.wTreble
    }

    f.bass = clamp01(bassW > 0 ? bassAcc / bassW : 0)
    f.mid = clamp01(midW > 0 ? midAcc / midW : 0)
    f.treble = clamp01(trebleW > 0 ? trebleAcc / trebleW : 0)
    f.energy = clamp01(f.bass * 0.5 + f.mid * 0.32 + f.treble * 0.18)

    // --- RMS e picco dal dominio del tempo ----------------------------------
    let sumSq = 0
    let peakAbs = 0
    for (let i = 0; i < FFT_SIZE; i++) {
      const x = this.timeDomain[i]
      sumSq += x * x
      const a = x < 0 ? -x : x
      if (a > peakAbs) peakAbs = a
    }
    const rmsRaw = Math.sqrt(sumSq / FFT_SIZE)

    const rmsK = rmsRaw > this.rmsRef ? coeff(dt, 0.5) : coeff(dt, 6.0)
    this.rmsRef += (rmsRaw - this.rmsRef) * rmsK
    const rmsGain = clamp(0.42 / Math.max(this.rmsRef, 0.01), 0.7, 6)

    const targetRms = clamp01(rmsRaw * rmsGain * s.global)
    f.rms += (targetRms - f.rms) * (targetRms > f.rms ? coeff(dt, 0.03) : coeff(dt, 0.2))

    const targetPeak = clamp01(peakAbs * rmsGain * s.global)
    this.peakHold = targetPeak > this.peakHold
      ? targetPeak
      : this.peakHold + (targetPeak - this.peakHold) * coeff(dt, 0.45)
    f.peak = this.peakHold

    // --- Centroide spettrale -------------------------------------------------
    const centroidHz = magSum > 1e-4 ? weightedHz / magSum : BAND_MIN_HZ
    const logSpan = Math.log(BAND_MAX_HZ / BAND_MIN_HZ)
    const centroidNorm = clamp01(Math.log(Math.max(centroidHz, BAND_MIN_HZ) / BAND_MIN_HZ) / logSpan)
    f.centroid += (centroidNorm - f.centroid) * coeff(dt, 0.12)

    // --- Onset ---------------------------------------------------------------
    this.fluxAvg += (flux - this.fluxAvg) * coeff(dt, 0.6)
    const onsetRaw = clamp01((flux - this.fluxAvg) / Math.max(this.fluxAvg * 1.6, 0.004))
    f.flux = clamp01(flux * 22)
    f.onset = onsetRaw > f.onset ? onsetRaw : f.onset + (onsetRaw - f.onset) * coeff(dt, 0.09)

    // --- Beat ----------------------------------------------------------------
    this.beatFluxAvg += (beatFlux - this.beatFluxAvg) * coeff(dt, 0.9)
    const threshold = this.beatFluxAvg * 1.7 + 0.008
    const sinceBeat = time - this.lastBeatTime
    // Un seek all'indietro non deve bloccare il rilevamento.
    if (sinceBeat < 0) this.lastBeatTime = time - BEAT_REFRACTORY

    if (beatFlux > threshold && sinceBeat > BEAT_REFRACTORY && f.energy > 0.06) {
      if (sinceBeat < 2.5) this.pushInterval(sinceBeat)
      this.lastBeatTime = time
      this.beatEnvelope = 1
      f.beatCount++
    } else {
      this.beatEnvelope = Math.max(0, this.beatEnvelope - dt * 6)
    }
    f.beat = this.beatEnvelope
    f.bpm = this.bpmEstimate

    f.silent = f.rms < 0.004
    this.lastTrackTime = time
    return f
  }

  /** Ultime feature calcolate, senza ricalcolo. */
  get current(): AudioFeatures {
    return this.features
  }

  private decay(dt: number): void {
    const f = this.features
    const k = coeff(dt, 0.35)
    f.rms += (0 - f.rms) * k
    f.peak += (0 - f.peak) * k
    f.bass += (0 - f.bass) * k
    f.mid += (0 - f.mid) * k
    f.treble += (0 - f.treble) * k
    f.energy += (0 - f.energy) * k
    f.onset += (0 - f.onset) * k
    f.flux += (0 - f.flux) * k
    this.beatEnvelope = Math.max(0, this.beatEnvelope - dt * 6)
    f.beat = this.beatEnvelope
    for (let b = 0; b < BAND_COUNT; b++) {
      this.bandsSmooth[b] += (0 - this.bandsSmooth[b]) * k
      f.bands[b] = this.bandsSmooth[b]
    }
    for (let i = 0; i < WAVE_COUNT; i++) f.waveform[i] *= 1 - k
    f.silent = f.rms < 0.004
    // Evita che al ritorno del suono il beat detector veda un salto enorme.
    this.lastBeatTime = Math.min(this.lastBeatTime, this.lastTrackTime)
  }

  /** Copia la forma d'onda ridotta a WAVE_COUNT campioni. */
  fillWaveform(active: boolean): void {
    const f = this.features
    if (!active) return
    const step = FFT_SIZE / WAVE_COUNT
    for (let i = 0; i < WAVE_COUNT; i++) {
      const start = (i * step) | 0
      let acc = 0
      for (let j = 0; j < step; j++) acc += this.timeDomain[start + j]
      f.waveform[i] = acc / step
    }
  }

  /**
   * Stima il tempo dagli intervalli fra i colpi.
   *
   * Gli intervalli misurati oscillano di decine di millisecondi, perche' il
   * rilevamento e' agganciato al frame di rendering: un istogramma a bucket
   * fini li disperderebbe e non convergerebbe mai. La mediana e' robusta ai
   * colpi mancati (intervallo doppio) e a quelli spuri (intervallo dimezzato).
   */
  private pushInterval(interval: number): void {
    this.beatIntervals.push(interval)
    if (this.beatIntervals.length > 24) this.beatIntervals.shift()
    if (this.beatIntervals.length < 6) return

    // Riporta ogni intervallo nell'ottava 0.3-1.2 s, cioe' 50-200 BPM.
    const folded = this.beatIntervals
      .map((iv) => {
        let v = iv
        while (v < 0.3) v *= 2
        while (v > 1.2) v /= 2
        return v
      })
      .sort((a, b) => a - b)

    const median = folded[folded.length >> 1]
    if (median <= 0) return

    // Senza una maggioranza vicina alla mediana il ritmo non e' riconoscibile.
    let inliers = 0
    for (const v of folded) {
      if (Math.abs(v - median) < median * 0.18) inliers++
    }
    if (inliers < Math.ceil(folded.length * 0.5)) return

    const bpm = 60 / median
    this.bpmEstimate = this.bpmEstimate === 0 ? bpm : this.bpmEstimate * 0.7 + bpm * 0.3
  }

  /** Precalcola la mappatura banda -> bin e i pesi delle tre fasce. */
  private buildBands(): void {
    const nyquist = (this.binCount * this.binHz)
    const maxHz = Math.min(BAND_MAX_HZ, nyquist * 0.96)
    const ratio = Math.log(maxHz / BAND_MIN_HZ)

    for (let b = 0; b < BAND_COUNT; b++) {
      const f0 = BAND_MIN_HZ * Math.exp((ratio * b) / BAND_COUNT)
      const f1 = BAND_MIN_HZ * Math.exp((ratio * (b + 1)) / BAND_COUNT)
      const lo = clamp(Math.floor(f0 / this.binHz), 0, this.binCount - 1)
      const hi = clamp(Math.max(lo, Math.ceil(f1 / this.binHz) - 1), 0, this.binCount - 1)
      const center = (f0 + f1) * 0.5

      this.slices.push({
        lo,
        hi,
        wBass: overlap(f0, f1, BASS_RANGE) * bandTaper(center, BASS_RANGE),
        wMid: overlap(f0, f1, MID_RANGE),
        wTreble: overlap(f0, f1, TREBLE_RANGE),
      })
    }
  }
}

/** Frazione della banda [f0,f1) che cade dentro l'intervallo dato. */
function overlap(f0: number, f1: number, range: [number, number]): number {
  const lo = Math.max(f0, range[0])
  const hi = Math.min(f1, range[1])
  if (hi <= lo) return 0
  return (hi - lo) / (f1 - f0)
}

/**
 * I bassi sotto i 60 Hz sono spesso sovra-rappresentati e schiacciano la fascia:
 * riduce leggermente il peso delle bande piu' gravi.
 */
function bandTaper(centerHz: number, range: [number, number]): number {
  if (centerHz >= range[0] * 2.2) return 1
  return clamp(0.45 + (centerHz - range[0]) / (range[0] * 2.2), 0.45, 1)
}
