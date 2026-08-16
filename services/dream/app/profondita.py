"""Stima della profondità, per far capire al modello com'è fatta la scena.

Senza questa, l'img2img vede solo colori: appiattisce i piani, incolla lo sfondo
addosso alle persone e perde il volume dei volti. La mappa di profondità entra in
un ControlNet e dà al modello la struttura tridimensionale del frame.

Il modello è piccolo (25 M parametri) ma pieno di operazioni minute: come per la
UNet, il tempo se ne va nel lanciare i kernel, non nel calcolarli. Anche qui la
cura è un CUDA graph: da 16 ms a pochi.
"""

from __future__ import annotations

import logging

log = logging.getLogger("daproddream.profondita")

MODELLO = "depth-anything/Depth-Anything-V2-Small-hf"

# DINOv2 lavora a patch di 14 px: il lato deve essere un multiplo.
LATO = 252

# Normalizzazione ImageNet, la stessa del processore di transformers.
MEDIA = (0.485, 0.456, 0.406)
DEVIAZIONE = (0.229, 0.224, 0.225)


class StimatoreProfondita:
    def __init__(self):
        self.modello = None
        self.device = "cpu"
        self.dtype = None
        self._media = None
        self._deviazione = None
        self._grafo = None
        self._ingresso = None
        self._uscita = None

    @property
    def pronto(self) -> bool:
        return self.modello is not None

    def carica(self, device: str, dtype) -> None:
        if self.modello is not None:
            return
        import torch
        from transformers import AutoModelForDepthEstimation

        log.info("Carico il modello di profondità %s", MODELLO)
        try:
            grezzo = AutoModelForDepthEstimation.from_pretrained(
                MODELLO, dtype=dtype, local_files_only=True
            )
        except Exception:
            grezzo = AutoModelForDepthEstimation.from_pretrained(MODELLO, dtype=dtype)
        self.modello = grezzo.to(device).eval()
        self.device, self.dtype = device, dtype
        self._media = torch.tensor(MEDIA, device=device, dtype=dtype).view(1, 3, 1, 1)
        self._deviazione = torch.tensor(DEVIAZIONE, device=device, dtype=dtype).view(1, 3, 1, 1)
        if device == "cuda":
            self._cattura()

    def _cattura(self) -> None:
        """Stessa cura della UNet: una replay al posto di mille lanci."""
        import torch

        try:
            self._ingresso = torch.zeros(1, 3, LATO, LATO, device=self.device, dtype=self.dtype)
            stream = torch.cuda.Stream()
            stream.wait_stream(torch.cuda.current_stream())
            with torch.cuda.stream(stream), torch.no_grad():
                for _ in range(3):
                    self.modello(pixel_values=self._ingresso)
            torch.cuda.current_stream().wait_stream(stream)
            torch.cuda.synchronize()

            self._grafo = torch.cuda.CUDAGraph()
            with torch.no_grad(), torch.cuda.graph(self._grafo):
                self._uscita = self.modello(pixel_values=self._ingresso).predicted_depth
            log.info("Profondità catturata in un CUDA graph")
        except Exception as exc:
            log.warning("CUDA graph per la profondità non disponibile: %s", exc)
            self._grafo = None

    def scarica(self) -> None:
        self.modello = None
        self._grafo = None
        self._ingresso = None
        self._uscita = None

    def mappa(self, immagine01, larghezza: int, altezza: int):
        """Da immagine RGB [1,3,H,W] in [0,1] a mappa profondità [1,3,altezza,larghezza].

        Il ControlNet vuole tre canali e valori in [0,1], con il vicino chiaro.
        """
        import torch
        import torch.nn.functional as F

        with torch.no_grad():
            piccola = F.interpolate(
                immagine01, size=(LATO, LATO), mode="bilinear", align_corners=False
            )
            piccola = (piccola - self._media) / self._deviazione

            if self._grafo is not None:
                self._ingresso.copy_(piccola)
                self._grafo.replay()
                grezza = self._uscita
            else:
                grezza = self.modello(pixel_values=piccola).predicted_depth

            mappa = grezza.unsqueeze(1).float()
            minimo = mappa.amin(dim=(2, 3), keepdim=True)
            massimo = mappa.amax(dim=(2, 3), keepdim=True)
            mappa = (mappa - minimo) / (massimo - minimo + 1e-6)
            mappa = F.interpolate(
                mappa, size=(altezza, larghezza), mode="bilinear", align_corners=False
            )
            return mappa.repeat(1, 3, 1, 1).to(self.dtype)
