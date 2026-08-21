"""Percorsi, porta e logging di DaProdVoce.

Come per gli altri motori della suite, **i percorsi arrivano da fuori**: i pesi
stanno nella cartella comune dei modelli, i risultati nella libreria condivisa —
che è il motivo per cui una voce fatta qui si può usare come riferimento in
DaProdCinema senza salvarla, cercarla e ricaricarla.

Se le variabili non ci sono — perché qualcuno ha avviato il motore a mano per
provarlo — si ripiega sulla cartella del servizio: meglio partire in un posto
strano che non partire.
"""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

# .../services/voce/app/config.py -> .../services/voce
ROOT = Path(__file__).resolve().parents[1]


def _dalla_suite(nome: str, ripiego: Path) -> Path:
    valore = os.environ.get(nome)
    return Path(valore) if valore else ripiego


MODELLI_DIR = _dalla_suite("DAPROD_MODELLI", ROOT / "models")

# I risultati stanno in libreria, sotto output/voce: sono roba dell'utente, e da
# lì le altre app della suite li vedono.
RISULTATI_DIR = _dalla_suite("DAPROD_RISULTATI", ROOT / "risultati")

# Le voci salvate: un audio di riferimento più la sua trascrizione, che sta nel
# `.json` accanto secondo la convenzione della libreria della suite.
#
# **Stanno nei risultati e non fra i temporanei**, e non è un dettaglio: i
# temporanei sono cancellabili sempre (lo dice `paths.ts`, e il reset della
# suite li porta via), mentre una voce registrata da chi usa il programma non si
# rigenera da nessuna parte.
VOCI_DIR = RISULTATI_DIR / "voci"

TEMPORANEI_DIR = _dalla_suite("DAPROD_TEMPORANEI", ROOT / "temporanei")
LOGS_DIR = TEMPORANEI_DIR

HOST = "127.0.0.1"
PORT = int(os.environ.get("DAPROD_PORTA", "8780"))

for _d in (RISULTATI_DIR, VOCI_DIR, TEMPORANEI_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Log leggibile su console + file rotante, come gli altri motori."""
    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-7s  %(name)-18s  %(message)s", "%H:%M:%S"
    )

    # La console di Windows è cp1252: senza questo, accenti e trattini lunghi
    # escono come punti interrogativi. Lo shell passa già PYTHONIOENCODING, ma
    # chi avvia il motore a mano no.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)

    logfile = RotatingFileHandler(
        LOGS_DIR / "daprodvoce.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8"
    )
    logfile.setFormatter(fmt)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.addHandler(console)
    root.addHandler(logfile)

    for noisy in ("urllib3", "httpx", "filelock", "uvicorn.access", "huggingface_hub.utils._http"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    logging.getLogger("transformers").setLevel(logging.ERROR)

    return logging.getLogger("daprodvoce")
