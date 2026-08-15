/**
 * Logger minimale con livelli, sostituto frontend di Serilog (03_TECH_ARCHITECTURE.md).
 * Mantiene un anello in memoria che la finestra Impostazioni puo' mostrare e che
 * il guscio desktop potra' riversare su file rotanti.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  at: number
  level: LogLevel
  scope: string
  message: string
  detail?: unknown
}

const RING_SIZE = 400
const ring: LogEntry[] = []

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

// Debug spento nelle build normali, come da specifica.
let minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info'

export function setLogLevel(level: LogLevel): void {
  minLevel = level
}

export function logEntries(): readonly LogEntry[] {
  return ring
}

function write(level: LogLevel, scope: string, message: string, detail?: unknown): void {
  const entry: LogEntry = { at: Date.now(), level, scope, message, detail }
  ring.push(entry)
  if (ring.length > RING_SIZE) ring.shift()

  if (ORDER[level] < ORDER[minLevel]) return
  const tag = `[${scope}]`
  if (level === 'error') console.error(tag, message, detail ?? '')
  else if (level === 'warn') console.warn(tag, message, detail ?? '')
  else if (level === 'info') console.info(tag, message, detail ?? '')
  else console.debug(tag, message, detail ?? '')
}

export interface Logger {
  debug(message: string, detail?: unknown): void
  info(message: string, detail?: unknown): void
  warn(message: string, detail?: unknown): void
  error(message: string, detail?: unknown): void
}

export function createLogger(scope: string): Logger {
  return {
    debug: (m, d) => write('debug', scope, m, d),
    info: (m, d) => write('info', scope, m, d),
    warn: (m, d) => write('warn', scope, m, d),
    error: (m, d) => write('error', scope, m, d),
  }
}
