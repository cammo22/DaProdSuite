"""Metriche: FPS, latenza, VRAM, stato GPU."""

from __future__ import annotations

import collections
import logging
import threading
import time

log = logging.getLogger("daproddream.monitoring")

_nvml_ready = False
_nvml_handle = None


def _nvml():
    global _nvml_ready, _nvml_handle
    if _nvml_ready:
        return _nvml_handle
    _nvml_ready = True
    try:
        import pynvml

        pynvml.nvmlInit()
        _nvml_handle = (pynvml, pynvml.nvmlDeviceGetHandleByIndex(0))
    except Exception as exc:
        log.info("NVML non disponibile (%s): niente lettura VRAM reale", exc)
        _nvml_handle = None
    return _nvml_handle


def gpu_info() -> dict:
    """Descrizione della GPU, letta una volta sola all'avvio."""
    info = {"name": "CPU", "cuda": False, "vram_total_mb": 0, "driver": ""}
    try:
        import torch

        if torch.cuda.is_available():
            info["cuda"] = True
            info["name"] = torch.cuda.get_device_name(0)
            info["vram_total_mb"] = int(
                torch.cuda.get_device_properties(0).total_memory / 1048576
            )
            info["torch"] = torch.__version__
            info["cuda_version"] = torch.version.cuda or ""
    except Exception as exc:
        log.warning("Torch non interrogabile: %s", exc)

    nv = _nvml()
    if nv:
        pynvml, handle = nv
        try:
            info["driver"] = pynvml.nvmlSystemGetDriverVersion()
            if isinstance(info["driver"], bytes):
                info["driver"] = info["driver"].decode()
        except Exception:
            pass
    return info


def vram_used_mb() -> tuple[int, int]:
    """(usati, totali) in MB. Usa NVML se c'è: conta anche gli altri programmi."""
    nv = _nvml()
    if nv:
        pynvml, handle = nv
        try:
            m = pynvml.nvmlDeviceGetMemoryInfo(handle)
            return int(m.used / 1048576), int(m.total / 1048576)
        except Exception:
            pass
    try:
        import torch

        if torch.cuda.is_available():
            free, total = torch.cuda.mem_get_info()
            return int((total - free) / 1048576), int(total / 1048576)
    except Exception:
        pass
    return 0, 0


def gpu_utilization() -> int:
    nv = _nvml()
    if nv:
        pynvml, handle = nv
        try:
            return int(pynvml.nvmlDeviceGetUtilizationRates(handle).gpu)
        except Exception:
            pass
    return 0


class Metrics:
    """Finestra scorrevole su FPS e tempi per frame."""

    def __init__(self, window: int = 30):
        self._lock = threading.Lock()
        self._times = collections.deque(maxlen=window)
        self._stamps = collections.deque(maxlen=window)
        self.frames_total = 0
        self.dropped = 0
        self._vram_cache = (0, 0)
        self._vram_at = 0.0

    def frame(self, elapsed_ms: float) -> None:
        with self._lock:
            self._times.append(elapsed_ms)
            self._stamps.append(time.perf_counter())
            self.frames_total += 1

    def drop(self) -> None:
        with self._lock:
            self.dropped += 1

    def reset(self) -> None:
        with self._lock:
            self._times.clear()
            self._stamps.clear()
            self.frames_total = 0
            self.dropped = 0

    def snapshot(self) -> dict:
        with self._lock:
            times = list(self._times)
            stamps = list(self._stamps)
            total = self.frames_total
            dropped = self.dropped

        fps = 0.0
        if len(stamps) >= 2:
            span = stamps[-1] - stamps[0]
            if span > 0:
                fps = (len(stamps) - 1) / span
            # Se l'ultimo frame è vecchio, gli FPS mostrati devono scendere.
            idle = time.perf_counter() - stamps[-1]
            if idle > 1.0:
                fps = 0.0

        avg = sum(times) / len(times) if times else 0.0

        now = time.perf_counter()
        if now - self._vram_at > 0.5:
            self._vram_cache = vram_used_mb()
            self._vram_at = now
        used, total_vram = self._vram_cache

        return {
            "fps": round(fps, 1),
            "frame_ms": round(avg, 1),
            "vram_used_mb": used,
            "vram_total_mb": total_vram,
            "gpu_util": gpu_utilization(),
            "frames": total,
            "dropped": dropped,
        }
