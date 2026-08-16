"""DreamEngine: tiene insieme sorgente, inferenza, anteprime, registrazione e metriche.

Regole del gioco:
- un solo modello in memoria alla volta;
- l'acquisizione non aspetta l'inferenza (i frame vecchi si buttano);
- niente operazione lunga dentro le richieste HTTP: caricare un modello è un thread
  a parte che manda avanzamenti alla UI.
"""

from __future__ import annotations

import collections
import logging
import threading
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from . import capture, galleria, presets
from .traduzione import Traduttore, sembra_italiano
from .backends import create_backend
from .backends.base import ModelLoadError
from .config import SCREENSHOTS_DIR
from .monitoring import Metrics, gpu_info
from .params import DreamParams, SourceParams
from .recorder import Recorder

log = logging.getLogger("daproddream.engine")

FERMO = "fermo"
CARICAMENTO = "caricamento"
ESECUZIONE = "esecuzione"
PAUSA = "pausa"
ERRORE = "errore"


class FrameSlot:
    """Ultimo frame disponibile + risveglio di chi lo sta aspettando."""

    def __init__(self):
        self._cond = threading.Condition()
        self._frame: np.ndarray | None = None
        self._seq = 0

    def put(self, frame: np.ndarray) -> None:
        with self._cond:
            self._frame = frame
            self._seq += 1
            self._cond.notify_all()

    def get(self) -> np.ndarray | None:
        with self._cond:
            return self._frame

    def wait(self, last_seq: int, timeout: float = 1.0):
        with self._cond:
            if self._seq == last_seq:
                self._cond.wait(timeout)
            return self._frame, self._seq

    def clear(self) -> None:
        with self._cond:
            self._frame = None
            self._seq += 1
            self._cond.notify_all()


class DreamEngine:
    def __init__(self, backend_name: str = "diffusers"):
        self.params = DreamParams()
        self.source_params = SourceParams()
        self.backend_name = backend_name
        self.backend = create_backend(backend_name)
        self.metrics = Metrics()
        self.gpu = gpu_info()

        self.state = FERMO
        self.error = ""
        self.status_text = "Pronto."
        self.status_at = time.time()
        self.load_pct = 0
        self.events = collections.deque(maxlen=60)

        self.input_slot = FrameSlot()   # BGR, dimensione sorgente
        self.output_slot = FrameSlot()  # RGB, dimensione AI

        self._capture: capture.CaptureThread | None = None
        self._infer: threading.Thread | None = None
        self._loader: threading.Thread | None = None
        self._stop = threading.Event()
        self._lock = threading.RLock()
        self._oom_streak = 0
        self._avvio_id = 0
        self._source_label = ""
        self._open_signature: tuple | None = None
        self._webcams: list[dict] | None = None

        self.traduttore = Traduttore()
        self.traduci = True  # italiano -> inglese, il modello capisce quello
        self.recorder = Recorder(lambda: self._output_bgr())
        presets.ensure_defaults()

        if not self.gpu["cuda"]:
            self.say(
                "Nessuna GPU CUDA rilevata: puoi usare la modalità senza AI, "
                "ma la diffusione sarà lentissima.",
                "warn",
            )

    # ------------------------------------------------------------------ utility

    def say(self, text: str, level: str = "info") -> None:
        self.status_text = text
        self.status_at = time.time()
        self.events.append({"t": datetime.now().strftime("%H:%M:%S"), "level": level, "text": text})
        (log.warning if level in ("warn", "error") else log.info)(text)

    def _source_signature(self) -> tuple:
        """Cosa distingue una sorgente da un'altra (mirror, movimento e fps no:
        quelli si rileggono a ogni frame senza riaprire niente)."""
        s = self.source_params
        return (s.kind, s.device_index, s.path, s.monitor, s.loop_video)

    def _output_bgr(self) -> np.ndarray | None:
        rgb = self.output_slot.get()
        return None if rgb is None else cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    # --------------------------------------------------------------- modello

    def load_model(self, model: str | None = None) -> None:
        """Carica (o ricarica) il modello in un thread, senza bloccare la UI."""
        with self._lock:
            if self._loader and self._loader.is_alive():
                raise RuntimeError("Sto già caricando un modello.")
            if model:
                self.params.model = model

        def avanzamento(messaggio, pct=None):
            if pct is not None:
                self.load_pct = int(pct)
            self.say(messaggio)

        def work():
            # Se stavamo già sognando, alla fine del caricamento si riparte da soli.
            riprendi = self.state == ESECUZIONE
            self.state = CARICAMENTO
            self.error = ""
            self.load_pct = 0
            try:
                self.backend.load(self.params, progress=avanzamento)
                vivo = self._capture is not None and self._capture.is_alive()
                # "riprendi" copre il caso normale, lo stato attuale quello di chi
                # ha premuto Sogna mentre il modello stava ancora caricando.
                if (riprendi or self.state == ESECUZIONE) and vivo:
                    self.state = ESECUZIONE
                    self.say("Motore pronto: si sogna.")
                else:
                    self.state = PAUSA if vivo else FERMO
                    self.say("Modello pronto: scegli una sorgente.")
            except ModelLoadError as exc:
                self.error = str(exc)
                self.say(str(exc), "error")
                self.state = ERRORE
            except Exception as exc:
                log.exception("Caricamento modello fallito")
                self.error = f"Errore imprevisto nel caricamento: {exc}"
                self.say(self.error, "error")
                self.state = ERRORE

        self._loader = threading.Thread(target=work, daemon=True, name="model-loader")
        self._loader.start()

    @property
    def loading(self) -> bool:
        return self._loader is not None and self._loader.is_alive()

    def unload_model(self) -> None:
        """Libera la GPU senza fermare la sorgente: l'anteprima continua a scorrere."""
        with self._lock:
            if self.loading:
                raise RuntimeError("Sto caricando: aspetta che finisca.")
            self.backend.unload()
            self.output_slot.clear()
            self.metrics.reset()
            self.say("Modello scaricato: GPU libera.")

    def set_backend(self, name: str) -> None:
        if name == self.backend_name:
            return
        self.stop()
        self.backend.unload()
        self.backend = create_backend(name)
        self.backend_name = name
        self.say(f"Backend impostato su {name}.")

    # ---------------------------------------------------------------- avvio

    def start(self, source: dict | None = None) -> None:
        """Avvia (o riprende). Aprire una webcam può volerci qualche secondo:
        si fa in un thread, la UI intanto resta viva e lo racconta."""
        with self._lock:
            if source:
                for k, v in source.items():
                    if k in self.source_params.__dataclass_fields__ and v is not None:
                        setattr(self.source_params, k, v)

            # Se la sorgente è la stessa e sta già girando non si riapre niente:
            # riaprire una webcam costa secondi, e cose come "specchia" cambiano
            # da sole perché il loop rilegge i parametri a ogni frame.
            voluta = self._source_signature()
            if (
                self._capture
                and self._capture.is_alive()
                and voluta == self._open_signature
                and self.state in (ESECUZIONE, PAUSA)
            ):
                if self.state == PAUSA:
                    self.say("Ripreso.")
                self.state = ESECUZIONE
                return

            self._stop_threads()
            self.output_slot.clear()
            self.error = ""
            self.state = CARICAMENTO
            self._avvio_id += 1
            mio = self._avvio_id
            nome = {
                "webcam": f"la webcam {self.source_params.device_index}",
                "video": "il video",
                "immagine": "l'immagine",
                "schermo": f"lo schermo {self.source_params.monitor}",
            }.get(self.source_params.kind, "la sorgente")
            self.say(f"Apro {nome}…")

        threading.Thread(
            target=self._apri_sorgente, args=(mio, voluta), daemon=True, name="apri-sorgente"
        ).start()

    def _apri_sorgente(self, mio: int, voluta: tuple) -> None:
        try:
            src = capture.open_source(self.source_params, ultimo_risultato=self._output_bgr)
        except capture.SourceError as exc:
            with self._lock:
                if mio != self._avvio_id:
                    return  # nel frattempo l'utente ha chiesto altro
                self.error = str(exc)
                self.say(str(exc), "error")
                self.state = ERRORE
            return
        except Exception as exc:
            with self._lock:
                if mio != self._avvio_id:
                    return
                log.exception("Apertura sorgente fallita")
                self.error = f"Sorgente non apribile: {exc}"
                self.say(self.error, "error")
                self.state = ERRORE
            return

        with self._lock:
            if mio != self._avvio_id:
                src.close()
                return
            self._source_label = src.label
            self._open_signature = voluta

            self._capture = capture.CaptureThread(src, on_error=self._on_capture_error)
            self._capture.start()

            self.metrics.reset()
            self.backend.reset_temporal()
            self._oom_streak = 0
            self._stop.clear()
            self._infer = threading.Thread(target=self._loop, daemon=True, name="inference")
            self._infer.start()

            self.state = ESECUZIONE
            self.say(f"Sorgente pronta: {self._source_label}.")

            if not self.backend.ready and not self.loading:
                self.load_model()

    def pause(self) -> None:
        if self.state == ESECUZIONE:
            self.state = PAUSA
            self.say("In pausa.")

    def stop(self) -> None:
        with self._lock:
            self._avvio_id += 1  # annulla un'apertura ancora in corso
            if self.recorder.active:
                self.stop_recording()
            self._stop_threads()
            # Ferma è anche il modo per uscire da un errore: si riparte puliti.
            self.state = FERMO
            self.error = ""
            self.input_slot.clear()
            self.output_slot.clear()
            self.metrics.reset()
            self.backend.reset_temporal()
            self.say("Fermato.")

    def _stop_threads(self) -> None:
        self._stop.set()
        if self._infer and self._infer.is_alive():
            self._infer.join(timeout=5.0)
        self._infer = None
        if self._capture:
            try:
                self._capture.stop()
            except Exception:
                pass
        self._capture = None

    def _on_capture_error(self, message: str) -> None:
        """La sorgente è morta: non si può restare in "esecuzione" a schermo fermo."""
        finito = self._capture is not None and self._capture.ended
        if finito and self.source_params.kind == "video" and not self.source_params.loop_video:
            self.state = PAUSA
            self.say("Video finito.")
            return
        self.error = message
        self.state = ERRORE
        self.say(f"La sorgente si è interrotta: {message}", "error")

    # ------------------------------------------------------------- parametri

    def update_params(self, data: dict) -> DreamParams:
        with self._lock:
            old_model = self.params.model
            old_prompt = self.params.prompt
            old_neg = self.params.negative_prompt
            old_res = self.params.resolution
            old_depth = self.params.depth
            if "mode" in data and data["mode"] in ("prestazioni", "bilanciata", "qualita"):
                self.params.apply_mode(data["mode"])
            self.params.update(data)
            if self.params.resolution != old_res:
                self.backend.reset_temporal()
            self.backend.on_params_changed(self.params)
            if self.params.model != old_model and self.backend.ready:
                self.say("Modello cambiato: ricarico.")
                self.load_model()
            if self.params.prompt != old_prompt or self.params.negative_prompt != old_neg:
                self._aggiorna_traduzione()
            elif self.params.depth != old_depth and self.backend.ready:
                # Accendere la profondità vuol dire scaricare mezzo giga: in un
                # thread, o la finestra resta ferma finché non ha finito.
                self._cambia_profondita(self.params.depth)
        return self.params

    def _aggiorna_traduzione(self) -> None:
        """Traduce il prompt in un thread: scrivere non deve far scattare il video."""
        testo, negativo = self.params.prompt, self.params.negative_prompt
        if not self.traduci:
            self.params.prompt_effettivo = self.params.negativo_effettivo = ""
            return

        def lavoro():
            if sembra_italiano(testo):
                fuori = self.traduttore.traduci(testo)
                if self.params.prompt == testo:
                    self.params.prompt_effettivo = fuori if fuori != testo else ""
            else:
                self.params.prompt_effettivo = ""
            # Anche il negativo va tradotto, o "colore, sfocato" non vuol dire nulla.
            if sembra_italiano(negativo):
                fuori_neg = self.traduttore.traduci(negativo)
                if self.params.negative_prompt == negativo:
                    self.params.negativo_effettivo = fuori_neg if fuori_neg != negativo else ""
            else:
                self.params.negativo_effettivo = ""

        threading.Thread(target=lavoro, daemon=True, name="traduzione").start()

    def _cambia_profondita(self, attiva: bool) -> None:
        def lavoro():
            try:
                self.backend.set_profondita(attiva, lambda m, livello="info": self.say(m, livello))
            except Exception as exc:
                log.exception("Cambio profondità fallito")
                self.say(f"Profondità non attivata: {exc}", "warn")

        threading.Thread(target=lavoro, daemon=True, name="profondita").start()

    def apply_preset(self, name: str) -> DreamParams:
        data = presets.load_preset(name)
        if data is None:
            raise KeyError(name)
        self.say(f"Sogno «{name}» applicato.")
        return self.update_params(data)

    # ---------------------------------------------------------------- output

    def screenshot(self) -> Path | None:
        frame = self._output_bgr()
        if frame is None:
            return None
        path = SCREENSHOTS_DIR / f"DaProdDream_{datetime.now():%Y%m%d_%H%M%S}.png"
        ok, buf = cv2.imencode(".png", frame)
        if not ok:
            return None
        buf.tofile(str(path))  # gestisce percorsi con accenti
        self.say(f"Immagine salvata: {path.name}")
        return path

    def start_recording(self) -> Path:
        frame = self.output_slot.get()
        size = (frame.shape[1], frame.shape[0]) if frame is not None else self.params.size()
        path = self.recorder.start(size)
        self.say(f"Registrazione avviata: {path.name}")
        return path

    def stop_recording(self) -> Path | None:
        path = self.recorder.stop()
        if path:
            galleria.salva_poster(path, self._output_bgr())
            self.say(f"Registrazione salvata: {path.name} ({self.recorder.frames} frame)")
        return path

    # ------------------------------------------------------------------ loop

    def _prepare(self, frame_bgr: np.ndarray) -> np.ndarray:
        """Sorgente -> quadro RGB della dimensione AI, ritagliato al centro."""
        target_w, target_h = self.params.size()
        h, w = frame_bgr.shape[:2]

        if self.source_params.mirror and self.source_params.kind == "webcam":
            frame_bgr = cv2.flip(frame_bgr, 1)

        # Ritaglio centrale per rispettare le proporzioni senza deformare.
        target_ratio = target_w / target_h
        ratio = w / h
        if abs(ratio - target_ratio) > 0.01:
            if ratio > target_ratio:
                new_w = int(h * target_ratio)
                x0 = (w - new_w) // 2
                frame_bgr = frame_bgr[:, x0 : x0 + new_w]
            else:
                new_h = int(w / target_ratio)
                y0 = (h - new_h) // 2
                frame_bgr = frame_bgr[y0 : y0 + new_h, :]

        interp = cv2.INTER_AREA if frame_bgr.shape[1] > target_w else cv2.INTER_LINEAR
        small = cv2.resize(frame_bgr, (target_w, target_h), interpolation=interp)
        return cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

    def _loop(self) -> None:
        last_seq = -1
        idle_notified = False

        while not self._stop.is_set():
            cap = self._capture
            if cap is None or not cap.is_alive():
                break  # sorgente finita o morta: inutile girare a vuoto

            frame, seq = cap.wait_new(last_seq, timeout=0.5)
            if frame is None or seq == last_seq:
                continue
            last_seq = seq

            # L'anteprima sorgente mostra il frame già ritagliato e ridotto:
            # è esattamente quello che vede il modello, e il confronto prima/dopo combacia.
            try:
                prepared = self._prepare(frame)
            except Exception as exc:
                log.warning("Preparazione frame fallita: %s", exc)
                continue
            self.input_slot.put(prepared)

            if self.state != ESECUZIONE:
                time.sleep(0.05)
                continue

            if not self.backend.ready:
                if not idle_notified and not self.loading:
                    idle_notified = True
                    self.say("Aspetto il modello…")
                time.sleep(0.05)
                continue
            idle_notified = False

            started = time.perf_counter()
            try:
                # Nel sogno libero non c'è una scena da rispettare: si genera da
                # zero camminando nello spazio latente, e la profondità non serve.
                sogno = self.source_params.kind == "sogno"
                out = self.backend.process(
                    prepared,
                    self.params,
                    profondita=not sogno,
                    passeggiata=(0.004 + self.source_params.movimento * 0.04) if sogno else 0.0,
                    raggio=self.source_params.raggio,
                )
                self.output_slot.put(out)
                self.metrics.frame((time.perf_counter() - started) * 1000)
                self._oom_streak = 0
            except Exception as exc:
                if not self._handle_inference_error(exc):
                    break

    def _handle_inference_error(self, exc: Exception) -> bool:
        """True se si può continuare, False se il loop deve chiudersi."""
        name = type(exc).__name__
        is_oom = "OutOfMemory" in name or "out of memory" in str(exc).lower()

        if is_oom:
            self._oom_streak += 1
            self.metrics.drop()
            try:
                import torch

                torch.cuda.empty_cache()
            except Exception:
                pass
            order = ["768x768", "768x448", "640x384", "512x512", "512x288", "384x384"]
            current = self.params.resolution
            if self._oom_streak <= 2 and current in order and order.index(current) < len(order) - 1:
                self.params.resolution = order[order.index(current) + 1]
                self.backend.reset_temporal()
                self.say(
                    f"VRAM esaurita: scendo a {self.params.resolution} per restare in piedi.",
                    "warn",
                )
                return True
            self.error = "Memoria GPU insufficiente. Chiudi altri programmi e riprova."
            self.say(self.error, "error")
            self.state = ERRORE
            return False

        log.exception("Errore durante l'inferenza")
        self.error = f"Errore durante l'inferenza: {exc}"
        self.say(self.error, "error")
        self.state = ERRORE
        return False

    # ---------------------------------------------------------------- stato

    def status(self) -> dict:
        cap = self._capture
        m = self.metrics.snapshot()
        return {
            "state": self.state,
            "loading": self.loading,
            "load_pct": self.load_pct,
            "error": self.error,
            "message": self.status_text,
            # da quanti secondi è lì: la UI non deve mostrare per sempre
            # l'ultima cosa successa come se stesse succedendo adesso
            "message_age": round(time.time() - self.status_at, 1),
            "source": {
                **self.source_params.__dict__,
                "label": self._source_label,
                "capture_fps": round(cap.fps, 1) if cap else 0.0,
            },
            "params": self.params.to_dict(),
            "traduzione": {
                "attiva": self.traduci,
                "pronta": self.traduttore.pronto,
                "testo": self.params.prompt_effettivo,
            },
            "metrics": m,
            "backend": self.backend.info(),
            "gpu": self.gpu,
            "recording": self.recorder.status(),
            "events": list(self.events)[-12:],
        }

    def webcams(self, refresh: bool = False) -> list[dict]:
        if self._webcams is None or refresh:
            self._webcams = capture.list_webcams()
        return self._webcams

    def shutdown(self) -> None:
        self.stop()
        self.backend.unload()
