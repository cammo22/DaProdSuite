import { createContext } from 'react'
import type { AppController } from './AppController'

/** Contesto separato dal provider: cosi' gli hook non vivono in un file con JSX. */
export const ControllerContext = createContext<AppController | null>(null)
