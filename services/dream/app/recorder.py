"""Registrazione MP4 dell'uscita.

I frame arrivano a ritmo irregolare (dipende dalla GPU), il video invece vuole un
ritmo fisso: un thread campiona l'ultimo frame a fps costanti e lo spinge dentro
ffmpeg. Così la durata del file corrisponde al tempo reale di registrazione.
"""

from __future__ import annotations

import logging
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path

import numpy as np

from .config import RECORDINGS_DIR

log = logging.getLogger("daproddream.recorder")


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


class Recorder:
    """Scrive un MP4 H.264 finché non viene fermato."""

    def __init__(self, get_frame, fps: int = 20, quality: int = 20):
        self.get_frame = get_frame
        self.fps = max(5, min(int(fps), 60))
        self.quality = quality
        self.path: Path | None = None
        self.proc: subprocess.Popen | None = None
        self.frames = 0
        self.started_at = 0.0
        self.error = ""
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._size: tuple[int, int] | None = None

    @property
    def active(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    @property
    def seconds(self) -> float:
        return time.time() - self.started_at if self.active else 0.0

    def start(self, size: tuple[int, int]) -> Path:
        if self.active:
            raise RuntimeError("Registrazione già in corso.")
        w, h = size
        w -= w % 2
        h -= h % 2  # H.264 vuole dimensioni pari
        self._size = (w, h)
        name = f"DaProdDream_{datetime.now():%Y%m%d_%H%M%S}.mp4"
        self.path = RECORDINGS_DIR / name

        cmd = [
            ffmpeg_exe(), "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{w}x{h}", "-r", str(self.fps),
            "-i", "pipe:0",
            "-an",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(self.quality),
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(self.path),
        ]
        log.info("Registro in %s (%dx%d @ %d fps)", self.path.name, w, h, self.fps)
        creation = 0x08000000 if hasattr(subprocess, "CREATE_NO_WINDOW") else 0  # CREATE_NO_WINDOW
        self.proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creation,
        )
        self.frames = 0
        self.error = ""
        self.started_at = time.time()
        self._stop.clear()
        self._thread = threading.Thread(target=self._pump, daemon=True, name="recorder")
        self._thread.start()
        return self.path

    def _pump(self) -> None:
        import cv2

        interval = 1.0 / self.fps
        next_at = time.perf_counter()
        w, h = self._size
        last = np.zeros((h, w, 3), dtype=np.uint8)

        while not self._stop.is_set():
            frame = self.get_frame()
            if frame is not None:
                if frame.shape[1] != w or frame.shape[0] != h:
                    frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_LINEAR)
                last = frame
            try:
                self.proc.stdin.write(np.ascontiguousarray(last).tobytes())
                self.frames += 1
            except Exception as exc:
                self.error = str(exc)
                log.error("Scrittura video interrotta: %s", exc)
                break

            next_at += interval
            delay = next_at - time.perf_counter()
            if delay > 0:
                time.sleep(delay)
            else:
                next_at = time.perf_counter()  # siamo in ritardo: riallineo

    def stop(self) -> Path | None:
        if self._thread is None:
            return None
        self._stop.set()
        self._thread.join(timeout=3.0)
        self._thread = None
        if self.proc:
            try:
                self.proc.stdin.close()
            except Exception:
                pass
            try:
                self.proc.wait(timeout=15)
            except Exception:
                self.proc.kill()
            self.proc = None
        log.info("Registrazione chiusa: %s (%d frame)", self.path, self.frames)
        return self.path

    def status(self) -> dict:
        return {
            "active": self.active,
            "file": self.path.name if self.path else "",
            "seconds": round(self.seconds, 1),
            "frames": self.frames,
            "error": self.error,
        }
