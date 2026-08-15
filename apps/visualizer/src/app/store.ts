import { useCallback, useDebugValue, useRef, useSyncExternalStore } from 'react'

export interface Store<T> {
  get(): T
  set(updater: (prev: T) => T): void
  subscribe(listener: () => void): () => void
}

/** Store immutabile minimale: nessuna dipendenza, aggiornamenti sincroni. */
export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    get: () => state,
    set(updater) {
      const next = updater(state)
      if (Object.is(next, state)) return
      state = next
      for (const listener of [...listeners]) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Legge una porzione dello store.
 *
 * Il selettore deve essere stabile (definito a livello di modulo oppure in
 * useCallback): l'ultimo risultato viene messo in cache per evitare re-render
 * inutili quando cambia una parte di stato che al componente non interessa.
 */
export function useStore<T, S>(
  store: Store<T>,
  selector: (state: T) => S,
  isEqual: (a: S, b: S) => boolean = Object.is,
): S {
  const cache = useRef<{ value: S } | null>(null)

  const getSnapshot = useCallback(() => {
    const next = selector(store.get())
    if (cache.current !== null && isEqual(cache.current.value, next)) {
      return cache.current.value
    }
    cache.current = { value: next }
    return next
  }, [store, selector, isEqual])

  const value = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
  useDebugValue(value)
  return value
}

/** Confronto superficiale, comodo per i selettori che restituiscono oggetti. */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const key of ka) {
    if (!Object.is(a[key], b[key])) return false
  }
  return true
}
