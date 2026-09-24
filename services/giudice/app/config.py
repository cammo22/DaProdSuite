"""Percorsi, porta e logging del giudice. Come gli altri motori: arriva tutto da fuori."""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _dalla_suite(nome: str, ripiego: Path) -> Path:
    valore = os.environ.get(nome)
    return Path(valore) if valore else ripiego


MODELLI_DIR = _dalla_suite("DAPROD_MODELLI", ROOT / "models")
#: Dove sta la repo del modello, con dentro `jev_omni.py` (vedi manifest/models.json).
JEV_DIR = MODELLI_DIR / "jev-omni"
TEMPORANEI_DIR = _dalla_suite("DAPROD_TEMPORANEI", ROOT / "temporanei")
TEMPORANEI_DIR.mkdir(parents=True, exist_ok=True)

HOST = "127.0.0.1"
PORT = int(os.environ.get("DAPROD_PORTA", "8790"))


def setup_logging(verbose: bool = False) -> logging.Logger:
    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(name)-18s  %(message)s", "%H:%M:%S")
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    logfile = RotatingFileHandler(TEMPORANEI_DIR / "giudice.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    logfile.setFormatter(fmt)
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.addHandler(console)
    root.addHandler(logfile)
    return logging.getLogger("giudice")
