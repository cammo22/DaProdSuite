import common from './common.glsl?raw'

/**
 * Antepone il prologo condiviso al corpo di un preset.
 * Vite non passa i .glsl al preprocessore, quindi #include non esiste: la
 * concatenazione qui e' l'equivalente esplicito.
 */
export function composeFragment(body: string): string {
  return `${common}\n${body}`
}
