type Listener<T> = (payload: T) => void

/**
 * Piccolo emitter tipizzato: nessuna dipendenza esterna, unsubscribe esplicito.
 * `Events` e' una mappa evento -> payload; niente vincolo su Record perche' le
 * interfacce non hanno index signature.
 */
export class Emitter<Events> {
  private readonly map = new Map<keyof Events, Set<Listener<never>>>()

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let set = this.map.get(event)
    if (!set) {
      set = new Set()
      this.map.set(event, set)
    }
    set.add(listener as Listener<never>)
    return () => {
      set?.delete(listener as Listener<never>)
    }
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.map.get(event)
    if (!set) return
    for (const listener of [...set]) {
      try {
        ;(listener as Listener<Events[K]>)(payload)
      } catch (error) {
        console.error(`[emitter] listener "${String(event)}" ha lanciato`, error)
      }
    }
  }

  clear(): void {
    this.map.clear()
  }
}
