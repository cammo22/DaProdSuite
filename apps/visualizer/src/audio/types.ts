/** Numero di bande logaritmiche prodotte dall'analizzatore (04_AUDIO_ENGINE.md). */
export const BAND_COUNT = 64

/** Campioni di forma d'onda inviati ai preset. */
export const WAVE_COUNT = 256

/**
 * Feature audio aggregate, ricalcolate a ogni frame di rendering.
 * Sono gli stessi campi elencati in 03_TECH_ARCHITECTURE.md, piu' qualche
 * derivata utile ai preset (bpm, energia, conteggio beat).
 */
export interface AudioFeatures {
  /** Posizione nel brano, in secondi. */
  time: number
  /** Volume efficace 0..1, gia' normalizzato e smussato. */
  rms: number
  /** Picco recente 0..1. */
  peak: number
  /** Energia bassi 0..1. */
  bass: number
  /** Energia medi 0..1. */
  mid: number
  /** Energia alti 0..1. */
  treble: number
  /** Impulso di beat: 1 sul colpo, decade fino a 0. */
  beat: number
  /** Beat contati dall'inizio della traccia. */
  beatCount: number
  /** Transiente 0..1 (spectral flux normalizzato). */
  onset: number
  /** Centroide spettrale 0..1 (0 = cupo, 1 = brillante). */
  centroid: number
  /** Flusso spettrale grezzo normalizzato 0..1. */
  flux: number
  /** BPM stimato, 0 se non ancora affidabile. */
  bpm: number
  /** Energia complessiva 0..1, media pesata delle tre fasce. */
  energy: number
  /** Bande logaritmiche 0..1, lunghezza BAND_COUNT. */
  bands: Float32Array
  /** Forma d'onda -1..1, lunghezza WAVE_COUNT. */
  waveform: Float32Array
  /** true quando non c'e' audio in riproduzione (i preset restano vivi). */
  silent: boolean
}

/** Frame completo consegnato ai preset a ogni update (05_VISUAL_ENGINE.md). */
export interface AudioVisualFrame {
  /** Tempo assoluto dall'avvio del motore, in secondi. */
  elapsed: number
  /** Delta time in secondi, limitato per evitare salti dopo un freeze. */
  delta: number
  /** Numero di frame renderizzati. */
  frameIndex: number
  /** Feature audio del frame. */
  audio: AudioFeatures
  /** Intensita' effetti scelta dall'utente, 0..2. */
  intensity: number
  /** Larghezza del buffer di rendering in pixel. */
  width: number
  /** Altezza del buffer di rendering in pixel. */
  height: number
  /** Pixel ratio effettivo dopo la scala qualita'. */
  pixelRatio: number
  /** Livello di qualita' risolto (mai "auto"). */
  quality: ResolvedQuality
}

export type ResolvedQuality = 'low' | 'medium' | 'high' | 'ultra'

/** Sensibilita' impostate dall'utente, applicate dentro l'analizzatore. */
export interface AnalyzerSensitivity {
  global: number
  bass: number
  mid: number
  treble: number
}

export function createEmptyFeatures(): AudioFeatures {
  return {
    time: 0,
    rms: 0,
    peak: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: 0,
    beatCount: 0,
    onset: 0,
    centroid: 0.35,
    flux: 0,
    bpm: 0,
    energy: 0,
    bands: new Float32Array(BAND_COUNT),
    waveform: new Float32Array(WAVE_COUNT),
    silent: true,
  }
}
