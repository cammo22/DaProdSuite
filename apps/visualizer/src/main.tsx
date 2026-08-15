import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AppProvider } from './app/AppContext'
import { AppController } from './app/AppController'
import { createLogger } from './lib/log'
import './styles/app.css'
// Dopo app.css di proposito: le regole di adattamento devono poter vincere
// senza dover alzare la specificita' di ogni selettore.
import './styles/responsive.css'

const log = createLogger('bootstrap')

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root assente in index.html')

const controller = new AppController()

if (import.meta.env.DEV) {
  // Aggancio per l'ispezione manuale dalla console durante lo sviluppo.
  ;(globalThis as { daprod?: AppController }).daprod = controller
}

// Le impostazioni si caricano prima del primo disegno: niente sfarfallio del tema.
void controller.initialize().finally(() => {
  createRoot(container).render(
    <StrictMode>
      <AppProvider controller={controller}>
        <App />
      </AppProvider>
    </StrictMode>,
  )
  log.info('DaProdVisualizer avviato')
})

window.addEventListener('beforeunload', () => controller.dispose())
