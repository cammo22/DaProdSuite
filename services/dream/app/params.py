"""Parametri del sogno: tutto ciò che l'utente può cambiare a caldo."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

# Risoluzioni AI leggere, multipli di 8 come richiede la VAE.
RESOLUTIONS: dict[str, tuple[int, int]] = {
    "512x512": (512, 512),
    "960x544": (960, 544),
    "1280x720": (1280, 720),
    "640x384": (640, 384),
    "512x288": (512, 288),
    "384x384": (384, 384),
    "768x448": (768, 448),
    "768x768": (768, 768),
}

# Modalità pronte: numeri misurati su RTX 4060 8 GB con SD-Turbo, VAE veloce e
# UNet in CUDA graph. Con la webcam accesa si perde qualcosa.
MODES = {
    # 512x288 rompe i volti: per le persone in primo piano serve più risoluzione,
    # e con i CUDA graph ce lo possiamo permettere.
    "prestazioni": {"steps": 1, "resolution": "512x288", "fast_vae": True, "fps": "~19 fps"},
    "bilanciata": {"steps": 1, "resolution": "640x384", "fast_vae": True, "fps": "~13 fps"},
    "qualita": {"steps": 2, "resolution": "960x544", "fast_vae": True, "fps": "~6 fps"},
}


@dataclass
class SourceParams:
    kind: str = "webcam"  # webcam | video | immagine | schermo | sogno
    device_index: int = 0  # webcam
    path: str = ""  # video / immagine
    monitor: int = 1  # schermo (1 = principale)
    loop_video: bool = True
    mirror: bool = True  # specchia la webcam
    target_fps: int = 30  # limite di acquisizione
    movimento: float = 0.55  # sogno libero: quanto in fretta scorre
    raggio: float = 0.4  # sogno libero: quanto si allontana dall'immagine base
    seme_sogno: int = 0  # 0 = ogni volta diverso


@dataclass
class DreamParams:
    prompt: str = "sogno lucido, luci al neon, pittura ad olio, colori intensi"
    negative_prompt: str = "sfocato, deforme, brutto, testo, filigrana"
    model: str = "stabilityai/sd-turbo"
    # Guardando i risultati, non le metriche: sopra 0.35 la scena smette di
    # essere leggibile (le persone diventano macchie). Lo stile si spinge con la
    # guidance, non con la strength: quella si tiene bassa.
    strength: float = 0.36
    # SD-Turbo è distillato per girare *senza* guidance: spinta troppo in alto
    # brucia l'immagine anche con il rescale. Da 3 a 4 è la zona buona.
    guidance: float = 2.5
    steps: int = 1
    seed: int = 1234  # -1 = casuale a ogni frame (più vivo ma sfarfalla)
    resolution: str = "640x384"
    mode: str = "bilanciata"
    # Spenta di serie, e per un motivo misurato: alle strength che lasciano la
    # scena leggibile la struttura si conserva già da sé, e la profondità non si
    # vede quasi. Serve solo se si spinge la trasformazione, e costa un terzo
    # degli fps. Meglio dirlo che accenderla e far pagare senza motivo.
    depth: bool = False
    depth_scale: float = 1.0
    # Riconoscimento del soggetto: quanto tenere le persone com'è nella realtà
    # mentre lo sfondo viene ridipinto. 0 = tutto uguale, come prima.
    # Spenta di serie: quasi sempre si vuole trasformare anche la persona
    # ("diventa un anime"), e proteggerla vuol dire vedersi la propria faccia
    # incollata dentro il disegno. Si alza quando serve il contrario.
    soggetto: bool = True
    protezione: float = 0.0
    # Zero di serie: mescolare il frame precedente calma lo sfarfallio ma lascia
    # scie e cancella i dettagli che si muovono. Oltre 0.3 fa più danni che bene.
    temporal_blend: float = 0.0
    fast_vae: bool = True  # TAESD: molto più veloce, dettaglio appena inferiore
    loras: list[dict] = field(default_factory=list)  # [{"name":..., "weight":...}]
    # Riempito dal traduttore quando scrivi in italiano; non si salva nei preset.
    prompt_effettivo: str = ""
    negativo_effettivo: str = ""

    def size(self) -> tuple[int, int]:
        return RESOLUTIONS.get(self.resolution, (512, 512))

    def to_dict(self) -> dict:
        return asdict(self)

    def update(self, data: dict) -> "DreamParams":
        for key, value in data.items():
            if key in self.__dataclass_fields__ and value is not None:
                setattr(self, key, value)
        # Lo slider arriva a 0.60 e il motore deve accettarlo: un limite più
        # basso qui dentro farebbe muovere il cursore senza che cambi niente,
        # che è esattamente il tipo di bug che si fa fatica a trovare.
        self.strength = min(max(float(self.strength), 0.05), 0.60)
        self.guidance = min(max(float(self.guidance), 0.0), 6.0)
        self.steps = min(max(int(self.steps), 1), 12)
        self.temporal_blend = min(max(float(self.temporal_blend), 0.0), 0.3)
        self.depth_scale = min(max(float(self.depth_scale), 0.0), 2.0)
        self.depth = bool(self.depth)
        self.soggetto = bool(self.soggetto)
        self.protezione = min(max(float(self.protezione), 0.0), 1.0)
        self.fast_vae = bool(self.fast_vae)
        if self.resolution not in RESOLUTIONS:
            self.resolution = "512x512"
        return self

    def apply_mode(self, mode: str) -> "DreamParams":
        preset = MODES.get(mode)
        if preset:
            self.mode = mode
            self.steps = preset["steps"]
            self.resolution = preset["resolution"]
            self.fast_vae = preset["fast_vae"]
        return self
