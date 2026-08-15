import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Raccoglitore di provini, per il lavoro visivo sui preset.
 *
 * Riceve un fotogramma in base64 e lo scrive in `__shots__/`, cosi' i preset si
 * possono guardare renderizzati senza dipendere dallo screenshot del browser.
 *
 * Spento salvo richiesta esplicita: `DPV_SHOTS=1 npm run dev`. Un endpoint che
 * scrive file sul disco non deve essere attivo per abitudine, nemmeno in un dev
 * server che ascolta solo su localhost.
 */
function shotSink(): Plugin | false {
  if (process.env.DPV_SHOTS !== '1') return false

  return {
    name: 'dpv-shot-sink',
    apply: 'serve',
    configureServer(server) {
      const dir = path.resolve(process.cwd(), '__shots__')
      server.config.logger.warn(`[dpv] provini attivi, scrivo in ${dir}`)

      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          try {
            const { name, data } = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            // Solo un nome di file, mai un percorso: niente scritture fuori da __shots__.
            const safe = String(name).replace(/[^a-z0-9._-]/gi, '_')
            fs.mkdirSync(dir, { recursive: true })
            const file = path.join(dir, safe)
            fs.writeFileSync(file, Buffer.from(String(data).split(',')[1], 'base64'))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (error) {
            res.statusCode = 500
            res.end(String(error))
          }
        })
      })
    },
  }
}

// Build relativo: l'output finira' dentro il guscio desktop (WebView2 / Electron),
// che carica i file da disco e non dalla root di un server.
export default defineConfig({
  base: './',
  plugins: [react(), shotSink()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5183,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
})
