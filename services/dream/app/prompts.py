"""I prompt: quelli salvati dall'utente e il generatore casuale.

Nota importante che si vede solo provando: SD-Turbo capisce **l'inglese** molto
meglio dell'italiano. I prompt generati qui sono quindi in inglese, con
un'etichetta italiana per l'interfaccia. Quelli scritti a mano restano com'è
stato scritto: è roba dell'utente e non si tocca.
"""

from __future__ import annotations

import json
import logging
import random
import time
from pathlib import Path

from .config import APPDATA_DIR

log = logging.getLogger("daproddream.prompts")

ARCHIVIO = APPDATA_DIR / "prompt.json"

# Mattoni del generatore: stile + soggetto/ambiente + luce + resa.
STILI = [
    ("acquerello", "delicate watercolor painting, rough paper texture, soft washes"),
    ("olio", "thick oil painting, visible brush strokes, impasto"),
    ("carboncino", "charcoal drawing, black and white, smudged rough strokes"),
    ("anime", "anime illustration, clean lines, flat vivid colors, cel shading"),
    ("fumetto", "comic book art, bold ink outlines, halftone dots"),
    ("acquaforte", "detailed engraving, fine cross-hatching, antique print"),
    ("pittura digitale", "digital painting, concept art, highly detailed"),
    ("pastello", "soft pastel drawing, chalky texture, gentle gradients"),
    ("vetrata", "stained glass window, black leading, luminous colours"),
    ("mosaico", "byzantine mosaic, small stone tiles, golden background"),
    ("bassorilievo", "carved stone bas-relief, shallow depth, marble"),
    ("low poly", "low poly 3d render, flat shaded triangles"),
    ("pixel art", "pixel art, limited palette, chunky pixels"),
    ("fotografia", "cinematic photograph, 35mm film grain, shallow depth of field"),
]

MONDI = [
    ("cyberpunk", "cyberpunk megacity at night, neon signs, wet asphalt reflections"),
    ("sottomarino", "underwater world, floating particles, caustic light rays"),
    ("deserto", "endless desert dunes, heat haze, ochre sand"),
    ("foresta", "misty ancient forest, moss, shafts of light through the canopy"),
    ("spazio", "deep space, nebula clouds, distant stars"),
    ("ghiaccio", "frozen arctic landscape, ice crystals, pale blue light"),
    ("vulcano", "volcanic landscape, glowing lava cracks, black rock"),
    ("barocco", "baroque palace interior, gilded ornaments, heavy drapery"),
    ("steampunk", "steampunk workshop, brass gears, copper pipes, steam"),
    ("giapponese", "traditional japanese scene, paper screens, cherry blossoms"),
    ("noir", "film noir alley, venetian blind shadows, cigarette smoke"),
    ("sogno", "dreamlike surreal landscape, floating shapes, impossible geometry"),
    ("apocalisse", "post-apocalyptic ruins, overgrown concrete, dust in the air"),
    ("fiaba", "fairytale village, crooked houses, warm windows"),
]

LUCI = [
    ("tramonto", "golden hour sunlight, long warm shadows"),
    ("neon", "neon lighting, magenta and cyan glow"),
    ("candela", "candlelight, warm flickering glow, deep shadows"),
    ("temporale", "stormy light, dramatic clouds, cold rim light"),
    ("controluce", "strong backlight, silhouettes, lens flare"),
    ("nebbia", "foggy diffuse light, low contrast, pale palette"),
    ("luna", "moonlight, blue shadows, silver highlights"),
    ("studio", "clean studio lighting, soft box, even light"),
]

DETTAGLI = [
    ("dettagliato", "highly detailed, intricate"),
    ("morbido", "soft focus, gentle edges"),
    ("contrastato", "high contrast, bold shapes"),
    ("colori tenui", "muted desaturated palette"),
    ("colori accesi", "vivid saturated colours"),
    ("texture", "rich surface texture, grain"),
]

NEGATIVI = "blurry, ugly, deformed, extra limbs, text, watermark, low quality"


def casuale(seme: int | None = None) -> dict:
    """Un prompt nuovo, pescando fra stile, mondo, luce e dettaglio."""
    rnd = random.Random(seme)
    stile = rnd.choice(STILI)
    mondo = rnd.choice(MONDI)
    luce = rnd.choice(LUCI)
    dettaglio = rnd.choice(DETTAGLI)

    # Non sempre tutti e quattro: le combinazioni troppo lunghe si annullano.
    pezzi = [stile, mondo]
    if rnd.random() < 0.75:
        pezzi.append(luce)
    if rnd.random() < 0.6:
        pezzi.append(dettaglio)
    rnd.shuffle(pezzi)

    return {
        "prompt": ", ".join(p[1] for p in pezzi),
        "negative_prompt": NEGATIVI,
        "etichetta": " · ".join(p[0] for p in pezzi),
    }


def _leggi() -> list[dict]:
    try:
        return json.loads(ARCHIVIO.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return []
    except Exception as exc:
        log.warning("Archivio prompt illeggibile: %s", exc)
        return []


def _scrivi(voci: list[dict]) -> None:
    ARCHIVIO.write_text(json.dumps(voci, indent=2, ensure_ascii=False), encoding="utf-8")


def elenco() -> list[dict]:
    return _leggi()


def salva(prompt: str, negative: str = "", etichetta: str = "") -> dict:
    prompt = (prompt or "").strip()
    if not prompt:
        raise ValueError("Il prompt è vuoto.")
    voci = _leggi()
    for v in voci:
        if v["prompt"] == prompt:  # già archiviato: lo riporto in cima
            voci.remove(v)
            voci.insert(0, v)
            _scrivi(voci)
            return v
    voce = {
        "id": f"p{int(time.time()*1000)}",
        "prompt": prompt,
        "negative_prompt": negative or "",
        "etichetta": (etichetta or prompt)[:60],
    }
    voci.insert(0, voce)
    _scrivi(voci[:100])
    log.info("Prompt salvato: %s", voce["etichetta"])
    return voce


def elimina(identificativo: str) -> bool:
    voci = _leggi()
    rimaste = [v for v in voci if v.get("id") != identificativo]
    if len(rimaste) == len(voci):
        return False
    _scrivi(rimaste)
    return True
