"""Avvio di ComfyUI come motore della suite.

ComfyUI non sta nel repo — è GPL-3.0 e la suite è MIT, quindi viene scaricato in
`%LOCALAPPDATA%\\DaProdSuite\\engines\\ComfyUI`. Qui c'è solo il codice nostro che
lo mette nelle condizioni giuste: dove sono i pesi, dove finiscono i risultati,
quali flag servono, e il ponte con cui lo shell gli chiede se è pronto.

Lo shell non passa argomenti: passa variabili d'ambiente, perché la ServiceConfig
del supervisore è uguale per tutti i motori e non deve conoscere i flag di questo.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_MOTORE` | cartella di ComfyUI |
| `DAPROD_MODELLI` | cartella unica dei pesi, condivisa fra le app |
| `DAPROD_RISULTATI` | dove salvare (una sottocartella di output/ per app) |
| `DAPROD_TEMPORANEI` | file rigenerabili: anteprime, copertine prima del ritaglio |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |

I flag sono quelli misurati in MinimaxMusica e non sono opzionali:
`--disable-dynamic-vram` perché i 5,5 GB dell'encoder devono stare *tutti* in
VRAM (con il caricamento dinamico i pesi arrivano dalla CPU durante la cattura
dei CUDA graph, che aborta con `cudaErrorStreamCaptureInvalidated` e porta giù il
motore) e `--enable-cors-header` perché la pagina dell'app non è servita da
ComfyUI ma dallo schema `daprod://`.
"""

import os
import runpy
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent

# Chiavi dei pesi che la suite condivide. Sono i nomi che ComfyUI usa per le sue
# cartelle: elencarli qui significa che tutte le app cercano nello stesso posto.
CARTELLE_MODELLI = [
    "checkpoints",
    "diffusion_models",
    "text_encoders",
    "clip_vision",
    "vae",
    "loras",
    "controlnet",
    "upscale_models",
    "embeddings",
    "audio_encoders",
]


def _richiesta(nome: str) -> Path:
    valore = os.environ.get(nome)
    if not valore:
        raise SystemExit(
            f"Manca la variabile {nome}: questo motore va avviato dalla suite, non a mano."
        )
    return Path(valore)


def scrivi_percorsi(motore: Path, modelli: Path) -> Path:
    """Genera il file che dice a ComfyUI dove sono i pesi e i nodi nostri.

    Riscritto a ogni avvio invece che una volta all'installazione: se la suite
    viene spostata o i modelli cambiano posto, il file è già giusto al riavvio
    successivo e non resta a puntare a una cartella che non esiste più.
    """
    righe = ["# Generato da services/comfy/avvio.py a ogni avvio: le modifiche a mano si perdono.", "daprod:"]
    righe.append(f"    base_path: {modelli.as_posix()}")
    for cartella in CARTELLE_MODELLI:
        righe.append(f"    {cartella}: {cartella}")
    # I nodi nostri restano nel repo e vengono solo indicati: copiarli dentro
    # ComfyUI vorrebbe dire ricopiarli a ogni aggiornamento della suite, e
    # lasciarne indietro di vecchi quando ne cambia il nome.
    righe.append("")
    righe.append("nodi_daprod:")
    righe.append(f"    custom_nodes: {(QUI / 'nodi').as_posix()}")

    percorso = motore.parent / "percorsi-daprod.yaml"
    percorso.write_text("\n".join(righe) + "\n", encoding="utf-8")
    return percorso


def main() -> None:
    motore = _richiesta("DAPROD_MOTORE")
    modelli = _richiesta("DAPROD_MODELLI")
    risultati = _richiesta("DAPROD_RISULTATI")
    temporanei = _richiesta("DAPROD_TEMPORANEI")
    porta = os.environ.get("DAPROD_PORTA", "8188")

    principale = motore / "main.py"
    if not principale.exists():
        raise SystemExit(
            f"ComfyUI non è in {motore}. Va scaricato prima di aprire l'app: "
            "è il motore di Musica, Foto e Cinema."
        )

    for cartella in (modelli, risultati, temporanei):
        cartella.mkdir(parents=True, exist_ok=True)

    percorsi = scrivi_percorsi(motore, modelli)

    sys.argv = [
        str(principale),
        "--port", str(porta),
        "--listen", "127.0.0.1",
        "--disable-auto-launch",
        "--disable-dynamic-vram",
        "--enable-cors-header", "*",
        "--extra-model-paths-config", str(percorsi),
        "--output-directory", str(risultati),
        "--temp-directory", str(temporanei),
    ]

    # ComfyUI si aspetta di girare dalla propria cartella: legge percorsi
    # relativi e importa i suoi moduli senza pacchetto.
    os.chdir(motore)
    sys.path.insert(0, str(motore))
    runpy.run_path(str(principale), run_name="__main__")


if __name__ == "__main__":
    main()
