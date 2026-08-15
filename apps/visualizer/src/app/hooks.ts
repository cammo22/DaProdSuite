import { useContext, useMemo } from 'react'
import type { AppController, ClockState } from './AppController'
import { ControllerContext } from './context'
import { useStore } from './store'
import type { AppState, Track } from './types'

export function useController(): AppController {
  const controller = useContext(ControllerContext)
  if (!controller) throw new Error("AppProvider mancante nell'albero dei componenti")
  return controller
}

/**
 * Legge una porzione dello stato applicativo.
 * Il selettore va memorizzato dal chiamante (costante di modulo o useCallback).
 */
export function useAppState<S>(
  selector: (state: AppState) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const controller = useController()
  return useStore(controller.store, selector, isEqual)
}

/** Posizione e durata correnti, aggiornate a ~30 Hz fuori dallo stato principale. */
export function useClock<S>(selector: (state: ClockState) => S): S {
  const controller = useController()
  return useStore(controller.clock, selector)
}

/** Il brano in riproduzione, o null. */
export function useCurrentTrack(): Track | null {
  const tracks = useAppState(selectTracks)
  const currentId = useAppState(selectCurrentId)
  return useMemo(() => tracks.find((t) => t.id === currentId) ?? null, [tracks, currentId])
}

export const selectTracks = (s: AppState) => s.tracks
export const selectCurrentId = (s: AppState) => s.currentId
export const selectSettings = (s: AppState) => s.settings
export const selectPanel = (s: AppState) => s.panel
export const selectPlayback = (s: AppState) => s.playback
export const selectNotices = (s: AppState) => s.notices
export const selectPresetId = (s: AppState) => s.presetId
export const selectFavorites = (s: AppState) => s.favorites
