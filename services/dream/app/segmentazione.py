"""Riconosce chi c'è nell'inquadratura e lo separa dallo sfondo.

Il motivo è semplice: trasformare un volto e trasformare un muro non sono la
stessa cosa. Applicando la stessa quantità di rumore a tutto, lo sfondo diventa
un bel dipinto e la faccia si sfalda — ed è il difetto che si vede di più, perché
l'occhio guarda le persone.

Con la maschera si può tenere la persona vicina a com'è davvero e lasciare che il
modello si sfoghi sul resto. Il modello usato è LRASPP MobileNetV3 (3,2 M
parametri, 7 MB di VRAM), che arriva con torchvision: nessuna dipendenza nuova.
Come gli altri, è limitato dal lancio dei kernel, quindi gira in un CUDA graph.
"""

from __future__ import annotations

import logging

log = logging.getLogger("daproddream.segmentazione")

# Nel set VOC la classe 15 è "person". Le altre non ci servono.
CLASSE_PERSONA = 15

# Basta poco per trovare una figura, e più piccolo è più è veloce.
LARGHEZZA = 320
ALTEZZA = 192

MEDIA = (0.485, 0.456, 0.406)
DEVIAZIONE = (0.229, 0.224, 0.225)


class Segmentatore:
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
        from torchvision.models.segmentation import (
            LRASPP_MobileNet_V3_Large_Weights,
            lraspp_mobilenet_v3_large,
        )

        log.info("Carico il riconoscitore di soggetti")
        rete = lraspp_mobilenet_v3_large(weights=LRASPP_MobileNet_V3_Large_Weights.DEFAULT)
        self.modello = rete.eval().to(device=device, dtype=dtype)
        self.device, self.dtype = device, dtype
        self._media = torch.tensor(MEDIA, device=device, dtype=dtype).view(1, 3, 1, 1)
        self._deviazione = torch.tensor(DEVIAZIONE, device=device, dtype=dtype).view(1, 3, 1, 1)
        if device == "cuda":
            self._cattura()

    def _cattura(self) -> None:
        import torch

        try:
            self._ingresso = torch.zeros(
                1, 3, ALTEZZA, LARGHEZZA, device=self.device, dtype=self.dtype
            )
            stream = torch.cuda.Stream()
            stream.wait_stream(torch.cuda.current_stream())
            with torch.cuda.stream(stream), torch.no_grad():
                for _ in range(3):
                    self.modello(self._ingresso)
            torch.cuda.current_stream().wait_stream(stream)
            torch.cuda.synchronize()

            self._grafo = torch.cuda.CUDAGraph()
            with torch.no_grad(), torch.cuda.graph(self._grafo):
                self._uscita = self.modello(self._ingresso)["out"]
            log.info("Riconoscitore catturato in un CUDA graph")
        except Exception as exc:
            log.warning("CUDA graph per il riconoscitore non disponibile: %s", exc)
            self._grafo = None

    def scarica(self) -> None:
        self.modello = None
        self._grafo = None
        self._ingresso = None
        self._uscita = None

    def maschera(self, immagine01, larghezza: int, altezza: int, morbidezza: float = 1.0):
        """Da immagine RGB [1,3,H,W] in [0,1] a maschera [1,1,altezza,larghezza].

        1 dove c'è una persona, 0 sullo sfondo, con i bordi sfumati: un contorno
        netto si vedrebbe come un ritaglio incollato sopra.
        """
        import torch
        import torch.nn.functional as F

        with torch.no_grad():
            piccola = F.interpolate(
                immagine01, size=(ALTEZZA, LARGHEZZA), mode="bilinear", align_corners=False
            )
            piccola = (piccola - self._media) / self._deviazione

            if self._grafo is not None:
                self._ingresso.copy_(piccola)
                self._grafo.replay()
                logit = self._uscita
            else:
                logit = self.modello(piccola)["out"]

            # Quanto ogni pixel "sa di persona" rispetto a tutto il resto.
            probabilita = logit.float().softmax(dim=1)[:, CLASSE_PERSONA : CLASSE_PERSONA + 1]

            # Sfumatura dei bordi: una media mobile fa il lavoro di un blur
            # gaussiano a un decimo del costo.
            lato = max(3, int(3 + 6 * morbidezza) | 1)
            probabilita = F.avg_pool2d(probabilita, lato, stride=1, padding=lato // 2)

            maschera = F.interpolate(
                probabilita, size=(altezza, larghezza), mode="bilinear", align_corners=False
            )
            return maschera.clamp(0, 1).to(self.dtype)
