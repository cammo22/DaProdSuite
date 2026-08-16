"""Interfaccia comune a tutti i motori di inferenza.

Chi vuole aggiungere TensorRT, StreamDiffusion o ComfyUI implementa questa classe
e basta: il resto dell'app non cambia.
"""

from __future__ import annotations

import numpy as np

from ..params import DreamParams


class ModelLoadError(RuntimeError):
    """Errore di caricamento con messaggio già leggibile dall'utente."""


class InferenceBackend:
    name = "base"

    def load(self, params: DreamParams, progress=None) -> None:
        """Carica il modello. `progress(testo)` per aggiornare la UI."""
        raise NotImplementedError

    def unload(self) -> None:
        """Libera modello e memoria GPU."""

    def process(
        self, frame_rgb: np.ndarray, params: DreamParams, profondita: bool = True
    ) -> np.ndarray:
        """Trasforma un frame RGB uint8 e ne restituisce uno delle stesse dimensioni.

        `profondita=False` la disattiva per questo frame anche se è accesa nei
        parametri: serve al sogno libero, dove non c'è una scena da rispettare.
        """
        raise NotImplementedError

    def on_params_changed(self, params: DreamParams) -> None:
        """Notifica di parametri cambiati a caldo (prompt, seed, LoRA...)."""

    def reset_temporal(self) -> None:
        """Dimentica lo stato tra frame (cambio sorgente o risoluzione)."""

    @property
    def ready(self) -> bool:
        return False

    def info(self) -> dict:
        return {"backend": self.name, "ready": self.ready}
