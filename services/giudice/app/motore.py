"""Il modello, caricato alla prima domanda e tenuto finche' il motore vive.

Una domanda sola alla volta: e' un modello da dodici miliardi di parametri su
una scheda da otto, e due domande insieme sono un out-of-memory.
"""

from __future__ import annotations

import importlib
import inspect
import logging
import sys
import threading
from typing import Any

from .config import JEV_DIR

log = logging.getLogger("giudice.motore")

MODALITA = {"immagine": "image", "brano": "audio", "audio": "audio", "video": "video"}


class Motore:
    def __init__(self) -> None:
        self._modello: Any = None
        self._lucchetto = threading.Lock()
        self.errore: str | None = None

    @property
    def carico(self) -> bool:
        return self._modello is not None

    def _carica(self) -> Any:
        if self._modello is not None:
            return self._modello
        if not (JEV_DIR / "jev_omni.py").exists():
            raise RuntimeError(
                f"Jev-Omni non e' sul disco ({JEV_DIR}): scaricalo dal pannello Modelli dell'hub."
            )
        sys.path.insert(0, str(JEV_DIR))
        jev = importlib.import_module("jev_omni")
        carica = getattr(jev, "load_jev_omni")
        # In 4 bit se si puo': in FP32 sono 50 GB, e la scheda ne ha 8. Si
        # passano solo gli argomenti che il caricatore dichiara di accettare.
        firma = inspect.signature(carica)
        argomenti: dict[str, Any] = {}
        for nome in ("model_path", "path", "pretrained_model_name_or_path", "repo_id"):
            if nome in firma.parameters:
                argomenti[nome] = str(JEV_DIR)
                break
        try:
            import bitsandbytes  # noqa: F401

            for nome in ("load_in_4bit", "quantize_4bit", "four_bit"):
                if nome in firma.parameters:
                    argomenti[nome] = True
                    break
        except ImportError:
            log.warning("bitsandbytes non c'e': il modello si carica com'e', e su 8 GB non ci sta.")
        log.info("Carico Jev-Omni da %s con %s", JEV_DIR, argomenti or "gli argomenti di serie")
        self._modello = carica(**argomenti)
        return self._modello

    def giudica(self, stato: str, domanda: str, opzioni: list[str], file: str | None, tipo: str | None) -> dict[str, float]:
        with self._lucchetto:
            modello = self._carica()
            argomenti: dict[str, Any] = {"state": stato, "question": domanda, "options": opzioni}
            if file:
                argomenti["media"] = file
                argomenti["modality"] = MODALITA.get(tipo or "", "image")
            uscita = modello.predict(**argomenti)
            return _probabilita(uscita, opzioni)

    def spegni(self) -> None:
        self._modello = None


def _probabilita(uscita: Any, opzioni: list[str]) -> dict[str, float]:
    """Le tre forme che una risposta puo' avere, riportate a {opzione: probabilita'}."""
    if hasattr(uscita, "probabilities"):
        uscita = uscita.probabilities
    if isinstance(uscita, dict):
        if "probabilities" in uscita:
            uscita = uscita["probabilities"]
        if isinstance(uscita, dict):
            return {str(k): float(v) for k, v in uscita.items()}
    if hasattr(uscita, "tolist"):
        uscita = uscita.tolist()
    if isinstance(uscita, (list, tuple)):
        if uscita and isinstance(uscita[0], (list, tuple)) and len(uscita[0]) == 2 and isinstance(uscita[0][0], str):
            return {str(k): float(v) for k, v in uscita}
        return {o: float(p) for o, p in zip(opzioni, uscita)}
    raise RuntimeError(f"Risposta di Jev-Omni che non so leggere: {type(uscita).__name__}")


motore = Motore()
