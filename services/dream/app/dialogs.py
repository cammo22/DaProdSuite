"""Finestre di sistema per scegliere file e aprire cartelle.

Il browser non può dare il percorso reale di un file, ma il motore gira in locale:
apriamo noi la finestra di Windows e restituiamo il percorso alla UI.
"""

from __future__ import annotations

import logging
import os
import queue
import subprocess
import threading
from pathlib import Path

log = logging.getLogger("daproddream.dialogs")

FILTERS = {
    "video": [("Video", "*.mp4 *.mov *.avi *.mkv *.webm *.m4v"), ("Tutti i file", "*.*")],
    "immagine": [("Immagini", "*.png *.jpg *.jpeg *.bmp *.webp *.tif"), ("Tutti i file", "*.*")],
    "modello": [("Checkpoint", "*.safetensors *.ckpt"), ("Tutti i file", "*.*")],
    "lora": [("LoRA", "*.safetensors"), ("Tutti i file", "*.*")],
}


def pick_file(kind: str = "video", title: str = "Scegli un file") -> str:
    """Apre la finestra di Windows in un thread suo e restituisce il percorso ("" se annullato)."""
    result: queue.Queue = queue.Queue()

    def work():
        try:
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            root.update()
            path = filedialog.askopenfilename(
                parent=root, title=title, filetypes=FILTERS.get(kind, FILTERS["video"])
            )
            root.destroy()
            result.put(path or "")
        except Exception as exc:
            log.warning("Finestra file non disponibile: %s", exc)
            result.put("")

    t = threading.Thread(target=work, daemon=True, name="file-dialog")
    t.start()
    try:
        return result.get(timeout=180)
    except queue.Empty:
        return ""


def open_folder(path: str | Path) -> bool:
    p = Path(path)
    if not p.exists():
        return False
    try:
        if os.name == "nt":
            os.startfile(str(p))  # noqa: S606
        else:
            subprocess.Popen(["xdg-open", str(p)])
        return True
    except Exception as exc:
        log.warning("Apertura cartella fallita: %s", exc)
        return False
