"""Percorsi, impostazioni utente e logging.

**Dentro la suite i percorsi arrivano da fuori.** DaProdDream nasceva come
programma a sé, con modelli e risultati nella propria cartella; qui i modelli
sono condivisi con le altre app e i risultati vanno nella libreria comune, che è
il motivo per cui una schermata fatta qui si può mandare a DaProdFoto senza
salvarla, ritrovarla e ricaricarla.

Le variabili sono quelle di tutti i motori della suite (`services/comfy/avvio.py`
usa le stesse). Se non ci sono — perché qualcuno ha avviato il motore a mano per
provarlo — si ripiega sulla cartella del servizio: meglio partire in un posto
strano che non partire.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from dataclasses import dataclass, field
from logging.handlers import RotatingFileHandler
from pathlib import Path

# .../services/dream/app/config.py -> .../services/dream
ROOT = Path(__file__).resolve().parents[1]


def _dalla_suite(nome: str, ripiego: Path) -> Path:
    valore = os.environ.get(nome)
    return Path(valore) if valore else ripiego


UI_DIR = _dalla_suite("DAPROD_INTERFACCIA", ROOT.parent.parent / "apps" / "dream")
PRESETS_DIR = ROOT / "presets"

# I risultati stanno in libreria, sotto output/dream: sono roba dell'utente, e
# da lì le altre app della suite le vedono.
RISULTATI_DIR = _dalla_suite("DAPROD_RISULTATI", ROOT / "risultati")
RECORDINGS_DIR = RISULTATI_DIR / "registrazioni"
SCREENSHOTS_DIR = RISULTATI_DIR / "schermate"

LOGS_DIR = _dalla_suite("DAPROD_TEMPORANEI", ROOT / "logs")
MODELS_DIR = _dalla_suite("DAPROD_MODELLI", ROOT / "models")
# Le stesse cartelle degli altri motori: un checkpoint scaricato per Dream lo
# vede anche chi verrà dopo.
CHECKPOINTS_DIR = MODELS_DIR / "checkpoints"
LORAS_DIR = MODELS_DIR / "loras"
# Dove la suite mette SD-Turbo: uno snapshot diffusers, non un singolo file.
DIFFUSERS_DIR = MODELS_DIR / "diffusers"

APPDATA_DIR = _dalla_suite("DAPROD_TEMPORANEI", Path(os.environ.get("APPDATA", ROOT)) / "DaProdDream")
SETTINGS_FILE = APPDATA_DIR / "dream-impostazioni.json"

HOST = "127.0.0.1"
PORT = int(os.environ.get("DAPROD_PORTA", os.environ.get("DAPRODDREAM_PORT", "8770")))

for _d in (
    PRESETS_DIR,
    RECORDINGS_DIR,
    SCREENSHOTS_DIR,
    LOGS_DIR,
    CHECKPOINTS_DIR,
    LORAS_DIR,
    DIFFUSERS_DIR,
    APPDATA_DIR,
):
    _d.mkdir(parents=True, exist_ok=True)


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Log leggibile su console + file rotante in logs/."""
    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-7s  %(name)-22s  %(message)s", "%H:%M:%S"
    )

    # La console di Windows è cp1252: senza questo, accenti e trattini lunghi
    # escono come punti interrogativi.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)

    logfile = RotatingFileHandler(
        LOGS_DIR / "daproddream.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8"
    )
    logfile.setFormatter(fmt)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.addHandler(console)
    root.addHandler(logfile)

    # Meno rumore dalle librerie di terze parti.
    for noisy in (
        "urllib3",
        "httpx",
        "PIL",
        "matplotlib",
        "filelock",
        "uvicorn.access",
        "huggingface_hub.utils._http",  # "set a HF_TOKEN": a noi non serve
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    logging.getLogger("diffusers").setLevel(logging.ERROR)
    logging.getLogger("transformers").setLevel(logging.ERROR)

    return logging.getLogger("daproddream")


@dataclass
class UserSettings:
    """Impostazioni persistenti (non i parametri del sogno: quelli stanno nei preset)."""

    last_preset: str = ""
    ui_mode: str = "semplice"  # semplice | avanzata
    auto_open_browser: bool = True
    extra: dict = field(default_factory=dict)

    @classmethod
    def load(cls) -> "UserSettings":
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            known = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
            return cls(**known)
        except FileNotFoundError:
            return cls()
        except Exception:
            logging.getLogger("daproddream").warning(
                "settings.json illeggibile, riparto dai valori di fabbrica"
            )
            return cls()

    def save(self) -> None:
        SETTINGS_FILE.write_text(
            json.dumps(self.__dict__, indent=2, ensure_ascii=False), encoding="utf-8"
        )
