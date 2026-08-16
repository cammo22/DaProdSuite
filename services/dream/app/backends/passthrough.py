"""Backend senza AI: serve per provare tutta l'app (sorgente, anteprime, registrazione,
metriche) anche senza GPU o senza modello scaricato."""

from __future__ import annotations

import cv2
import numpy as np

from ..params import DreamParams
from .base import InferenceBackend


class PassthroughBackend(InferenceBackend):
    name = "passthrough"

    def __init__(self):
        self._loaded = False

    def load(self, params: DreamParams, progress=None) -> None:
        if progress:
            progress("Modalità senza AI: passo i frame così come sono.")
        self._loaded = True

    def unload(self) -> None:
        self._loaded = False

    @property
    def ready(self) -> bool:
        return self._loaded

    def process(
        self, frame_rgb: np.ndarray, params: DreamParams, profondita: bool = True
    ) -> np.ndarray:
        # Effetto finto ma quasi gratuito (pochi ms): serve solo a far vedere che
        # sorgente, anteprime, registrazione e metriche girano.
        strength = params.strength
        if strength <= 0.05:
            return frame_rgb

        posterized = np.bitwise_and(frame_rgb, 0b11100000)
        gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 90, 180)
        posterized[edges > 0] = 0
        return cv2.addWeighted(frame_rgb, 1 - strength, posterized, strength, 0)
