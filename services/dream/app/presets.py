"""I "Sogni": preset salvati in JSON dentro presets/."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from .config import PRESETS_DIR
from .params import DreamParams

log = logging.getLogger("daproddream.presets")

# Un sogno è un modo di vedere, non un assetto della macchina: salva soltanto
# il prompt. Così sceglierne uno non ti sposta i cursori che stavi provando.
SAVED_FIELDS = ("prompt", "negative_prompt")

# I prompt sono in inglese perché il modello lo capisce molto meglio
# dell'italiano; il nome del sogno resta in italiano, è quello che si legge.
NEGATIVO = "blurry, ugly, deformed, text, watermark, low quality"

DEFAULTS = [
    {
        "name": "Neon notturno",
        "prompt": "neon city at night, sodium lights, wet asphalt reflections, cinematic",
        "negative_prompt": NEGATIVO,
        "strength": 0.28,
        "guidance": 4.0,
        "steps": 1,
        "temporal_blend": 0.25,
    },
    {
        "name": "Pittura ad olio",
        "prompt": "thick oil painting on canvas, visible brush strokes, warm light, impressionist",
        "negative_prompt": "photograph, " + NEGATIVO,
        "strength": 0.28,
        "guidance": 4.0,
        "steps": 1,
        "temporal_blend": 0.3,
    },
    {
        "name": "Anime",
        "prompt": "anime illustration, clean lines, flat vivid colours, cel shading",
        "negative_prompt": "realistic, photograph, " + NEGATIVO,
        "strength": 0.28,
        "guidance": 4.0,
        "steps": 1,
        "temporal_blend": 0.3,
    },
    {
        "name": "Fantascienza",
        "prompt": "futuristic armour, chrome metal, blue holographic lights, concept art",
        "negative_prompt": NEGATIVO,
        "strength": 0.28,
        "guidance": 4.0,
        "steps": 1,
        "temporal_blend": 0.35,
    },
    {
        "name": "Acquerello",
        "prompt": "delicate watercolor painting, rough paper, soft muted colours",
        "negative_prompt": "dark, " + NEGATIVO,
        "strength": 0.28,
        "guidance": 4.0,
        "steps": 1,
        "temporal_blend": 0.25,
    },
    {
        "name": "Carboncino",
        "prompt": "charcoal drawing, black and white, rough smudged strokes",
        "negative_prompt": "colour, " + NEGATIVO,
        "strength": 0.28,
        "guidance": 4.0,
        "steps": 1,
        "temporal_blend": 0.3,
    },
]


def _safe_name(name: str) -> str:
    clean = re.sub(r"[^\w\s\-àèéìòùÀÈÉÌÒÙ]", "", name, flags=re.UNICODE).strip()
    return (clean or "sogno")[:60]


def _path(name: str) -> Path:
    return PRESETS_DIR / f"{_safe_name(name)}.json"


def ensure_defaults() -> None:
    """Al primo avvio crea qualche sogno pronto, così si parte subito."""
    if any(PRESETS_DIR.glob("*.json")):
        return
    base = DreamParams()
    for preset in DEFAULTS:
        data = {f: getattr(base, f) for f in SAVED_FIELDS}
        data.update({k: v for k, v in preset.items() if k != "name"})
        data["name"] = preset["name"]
        _path(preset["name"]).write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    log.info("Creati %d sogni predefiniti", len(DEFAULTS))


def list_presets() -> list[dict]:
    out = []
    for f in sorted(PRESETS_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            data.setdefault("name", f.stem)
            out.append(data)
        except Exception as exc:
            log.warning("Preset illeggibile %s: %s", f.name, exc)
    return out


def save_preset(name: str, params: DreamParams) -> dict:
    data = {f: getattr(params, f) for f in SAVED_FIELDS}
    data["name"] = _safe_name(name)
    _path(name).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("Sogno salvato: %s", data["name"])
    return data


def delete_preset(name: str) -> bool:
    p = _path(name)
    if p.exists():
        p.unlink()
        log.info("Sogno eliminato: %s", name)
        return True
    return False


def load_preset(name: str) -> dict | None:
    p = _path(name)
    if not p.exists():
        return None
    data = json.loads(p.read_text(encoding="utf-8"))
    return {k: v for k, v in data.items() if k in SAVED_FIELDS}
