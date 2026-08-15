import type { JSX, ReactNode } from 'react'
import type { AppController } from './AppController'
import { ControllerContext } from './context'

export function AppProvider({
  controller,
  children,
}: {
  controller: AppController
  children: ReactNode
}): JSX.Element {
  return <ControllerContext.Provider value={controller}>{children}</ControllerContext.Provider>
}
