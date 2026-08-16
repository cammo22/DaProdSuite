"""La galleria: video registrati e foto salvate, con le loro anteprime.

I file stanno già in recordings/ e screenshots/; qui si limitano a essere elencati,
misurati e corredati di una miniatura, così la scheda Galleria si apre subito
anche con cento registrazioni dentro.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from .config import RECORDINGS_DIR, SCREENSHOTS_DIR

log = logging.getLogger("daproddream.galleria")

POSTER_DIR = RECORDINGS_DIR / "anteprime"
POSTER_DIR.mkdir(parents=True, exist_ok=True)

VIDEO_EXT = {".mp4", ".mkv", ".mov"}
FOTO_EXT = {".png", ".jpg", ".jpeg", ".webp"}

CARTELLE = {"video": RECORDINGS_DIR, "foto": SCREENSHOTS_DIR}


def _scrivi_jpeg(path: Path, frame_bgr: np.ndarray, larghezza: int = 480) -> bool:
    h, w = frame_bgr.shape[:2]
    if w > larghezza:
        frame_bgr = cv2.resize(
            frame_bgr, (larghezza, int(h * larghezza / w)), interpolation=cv2.INTER_AREA
        )
    ok, buf = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    if ok:
        buf.tofile(str(path))
    return bool(ok)


def salva_poster(video: Path, frame_bgr: np.ndarray | None) -> None:
    """Miniatura del video, scritta alla fine della registrazione."""
    if frame_bgr is None:
        return
    try:
        _scrivi_jpeg(POSTER_DIR / f"{video.stem}.jpg", frame_bgr)
    except Exception as exc:
        log.warning("Anteprima di %s non salvata: %s", video.name, exc)


def _poster_da_video(video: Path) -> Path | None:
    """Se la miniatura manca (registrazione vecchia), la estrae dal file."""
    destinazione = POSTER_DIR / f"{video.stem}.jpg"
    if destinazione.exists():
        return destinazione
    try:
        cap = cv2.VideoCapture(str(video))
        cap.set(cv2.CAP_PROP_POS_FRAMES, 5)
        ok, frame = cap.read()
        cap.release()
        if ok and _scrivi_jpeg(destinazione, frame):
            return destinazione
    except Exception as exc:
        log.debug("Niente anteprima per %s: %s", video.name, exc)
    return None


def _durata(video: Path) -> float:
    try:
        cap = cv2.VideoCapture(str(video))
        n = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
        cap.release()
        return round(n / fps, 1) if fps else 0.0
    except Exception:
        return 0.0


def elenco() -> list[dict]:
    """Tutti i pezzi della galleria, dal più recente."""
    elementi = []
    for tipo, cartella in CARTELLE.items():
        estensioni = VIDEO_EXT if tipo == "video" else FOTO_EXT
        for f in cartella.iterdir():
            if not f.is_file() or f.suffix.lower() not in estensioni:
                continue
            info = f.stat()
            voce = {
                "tipo": tipo,
                "nome": f.name,
                "url": f"/media/{tipo}/{f.name}",
                "quando": datetime.fromtimestamp(info.st_mtime).isoformat(timespec="seconds"),
                "mb": round(info.st_size / 1e6, 2),
            }
            if tipo == "video":
                poster = _poster_da_video(f)
                voce["poster"] = f"/media/poster/{poster.name}" if poster else ""
                voce["secondi"] = _durata(f)
            else:
                voce["poster"] = voce["url"]
            elementi.append(voce)
    elementi.sort(key=lambda v: v["quando"], reverse=True)
    return elementi


def percorso(tipo: str, nome: str) -> Path | None:
    """Percorso sicuro: nessun modo di uscire dalle due cartelle previste."""
    cartella = POSTER_DIR if tipo == "poster" else CARTELLE.get(tipo)
    if cartella is None or not nome:
        return None
    candidato = (cartella / nome).resolve()
    if candidato.parent != cartella.resolve() or not candidato.is_file():
        return None
    return candidato


def elimina(tipo: str, nome: str) -> bool:
    f = percorso(tipo, nome)
    if f is None:
        return False
    try:
        f.unlink()
        if tipo == "video":
            (POSTER_DIR / f"{f.stem}.jpg").unlink(missing_ok=True)
        log.info("Eliminato dalla galleria: %s", nome)
        return True
    except Exception as exc:
        log.warning("Non riesco a eliminare %s: %s", nome, exc)
        return False
