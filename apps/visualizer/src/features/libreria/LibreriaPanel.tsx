import { useCallback, useEffect, useState, type JSX } from 'react'
import { Panel } from '@/components/Panel'
import { useController } from '@/app/hooks'
import {
  alCambioLibreria,
  comeFileInIngresso,
  dentroLaSuite,
  elencoLibreria,
  mostraNellaCartella,
  type ElementoLibreria,
} from '@/suite/bridge'

/**
 * I brani prodotti dalle altre app della suite.
 *
 * Non è una seconda playlist: è una sorgente. Scegli un brano e finisce nella
 * coda normale, insieme alla musica che hai trascinato tu. Da lì in poi il
 * Visualizer non distingue più fra un file tuo e uno generato da DaProdMusica.
 */
export function LibreriaPanel(): JSX.Element {
  const controller = useController()
  const [elementi, setElementi] = useState<ElementoLibreria[]>([])
  const [caricando, setCaricando] = useState(true)

  const ricarica = useCallback(async () => {
    setElementi(await elencoLibreria('audio'))
    setCaricando(false)
  }, [])

  useEffect(() => {
    void ricarica()
    // Se DaProdMusica finisce un brano mentre questo pannello è aperto, compare
    // da solo: non serve chiudere e riaprire.
    return alCambioLibreria(() => void ricarica())
  }, [ricarica])

  const aggiungi = async (elemento: ElementoLibreria, riproduci: boolean) => {
    await controller.addFiles([comeFileInIngresso(elemento)], { autoplay: riproduci })
  }

  const aggiungiTutti = async () => {
    await controller.addFiles(elementi.map(comeFileInIngresso), { autoplay: false })
  }

  return (
    <Panel
      title="Brani generati"
      subtitle={
        dentroLaSuite()
          ? 'Quello che hanno prodotto le altre app della suite'
          : 'Disponibile solo dentro DaProd Suite'
      }
      onClose={() => controller.togglePanel('none')}
      footer={
        elementi.length > 1 && (
          <button className="dpv-button" onClick={() => void aggiungiTutti()}>
            Aggiungi tutti alla coda
          </button>
        )
      }
    >
      {!dentroLaSuite() ? (
        <p className="dpv-libreria__vuoto">
          Questa finestra sta girando da sola. Apri il Visualizer dalla DaProd Suite per
          vedere i brani generati dalle altre app.
        </p>
      ) : caricando ? (
        <p className="dpv-libreria__vuoto">Leggo la libreria…</p>
      ) : elementi.length === 0 ? (
        <p className="dpv-libreria__vuoto">
          Ancora nessun brano generato. Quando DaProdMusica ne produce uno, compare qui.
        </p>
      ) : (
        <ul className="dpv-libreria">
          {elementi.map((elemento) => (
            <li key={elemento.id} className="dpv-libreria__voce">
              <div className="dpv-libreria__copertina">
                {elemento.copertina ? (
                  <img src={elemento.copertina} alt="" />
                ) : (
                  <span aria-hidden="true">♪</span>
                )}
              </div>

              <div className="dpv-libreria__testo">
                <span className="dpv-libreria__nome" title={elemento.nome}>
                  {elemento.nome}
                </span>
                <span className="dpv-libreria__dati">
                  {elemento.app} · {formattaMb(elemento.bytes)} · {formattaData(elemento.creato)}
                </span>
              </div>

              <div className="dpv-libreria__azioni">
                <button
                  className="dpv-button dpv-button--accent"
                  onClick={() => void aggiungi(elemento, true)}
                >
                  Ascolta
                </button>
                <button className="dpv-button" onClick={() => void aggiungi(elemento, false)}>
                  In coda
                </button>
                <button
                  className="dpv-button"
                  onClick={() => void mostraNellaCartella(elemento.id)}
                  title="Mostra in Esplora risorse"
                >
                  Cartella
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function formattaMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formattaData(ms: number): string {
  return new Date(ms).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
