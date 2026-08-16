"""Acquisizione della sorgente: webcam, file video, immagine statica, schermo.

Ogni sorgente espone la stessa cosa: read() -> frame BGR (numpy) oppure None.
Il thread di acquisizione tiene sempre e solo l'ultimo frame: se l'inferenza è
lenta i frame vecchi vengono buttati, non accodati.

Sulle webcam Windows non esiste una scelta giusta a priori: lo stesso dispositivo
può dare 10 fps con un backend e 34 con l'altro, e certi indici restituiscono
sempre lo stesso fotogramma. Quindi non si indovina: si prova e si misura.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time

import cv2
import numpy as np

from .config import APPDATA_DIR
from .params import SourceParams

log = logging.getLogger("daproddream.capture")

# 640x480 per primo: il modello lavora al massimo a 768 px, e su molte camere
# il 720p viene negoziato in YUY2 non compresso, che costa 95 ms a lettura
# (10 fps) contro i 29 del 480p. Il 720p si prova solo se il 480 non c'è.
WEBCAM_SIZES = ((640, 480), (1280, 720))
LETTURA_LENTA_MS = 55.0  # oltre questa soglia la risoluzione non regge


class SourceError(RuntimeError):
    """Sorgente non apribile: messaggio già pronto per l'utente."""


class _Source:
    def read(self) -> np.ndarray | None:
        raise NotImplementedError

    def close(self) -> None:
        pass

    @property
    def label(self) -> str:
        return "sorgente"


def _misura(cap, n: int = 8) -> tuple[float, int]:
    """Legge n frame e restituisce (millisecondi medi, quanti erano diversi dal precedente)."""
    ok, prev = cap.read()
    if not ok or prev is None:
        return (9999.0, 0)
    tempi, nuovi = [], 0
    for _ in range(n):
        t = time.perf_counter()
        ok, frame = cap.read()
        tempi.append((time.perf_counter() - t) * 1000)
        if ok and frame is not None:
            if float(np.mean(cv2.absdiff(frame, prev))) >= 0.01:
                nuovi += 1
            prev = frame
    return (sum(tempi) / len(tempi), nuovi)


BACKEND = ((cv2.CAP_DSHOW, "DirectShow"), (cv2.CAP_MSMF, "MediaFoundation"))
_API_PER_NOME = {nome: api for api, nome in BACKEND}

# Cercare la combinazione buona costa fino a 12 secondi (certi backend aprono
# lentissimi): la si paga una volta sola e poi ce la si ricorda.
_MEMORIA = APPDATA_DIR / "webcam.json"


def _combinazione_nota(index: int):
    try:
        dati = json.loads(_MEMORIA.read_text(encoding="utf-8"))
        voce = dati[str(index)]
        api = _API_PER_NOME.get(voce["backend"])
        return (api, voce["backend"], int(voce["w"]), int(voce["h"])) if api else None
    except Exception:
        return None


def _ricorda_combinazione(index: int, nome: str, w: int, h: int) -> None:
    try:
        dati = {}
        if _MEMORIA.exists():
            dati = json.loads(_MEMORIA.read_text(encoding="utf-8"))
        dati[str(index)] = {"backend": nome, "w": w, "h": h}
        _MEMORIA.write_text(json.dumps(dati, indent=2), encoding="utf-8")
    except Exception as exc:
        log.debug("Non riesco a ricordare la webcam %s: %s", index, exc)


def dimentica_webcam() -> None:
    """Butta via le combinazioni ricordate: si torna a cercare da capo."""
    try:
        _MEMORIA.unlink(missing_ok=True)
    except Exception:
        pass


def _prova_apertura(index: int, api: int, w: int, h: int):
    """Apre una combinazione e la misura. Restituisce (cap, dimensione, ms, nuovi) o None.

    Il chiamante deve chiudere il cap: **due handle aperti sullo stesso dispositivo
    fanno restituire sempre lo stesso fotogramma**, ed è il motivo per cui la
    prima versione vedeva webcam "congelate".
    """
    cap = cv2.VideoCapture(index, api)
    if not cap.isOpened():
        cap.release()
        return None
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    ms, nuovi = _misura(cap)
    reale = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    return cap, reale, ms, nuovi


def _apri_webcam(index: int) -> tuple[cv2.VideoCapture, str, tuple[int, int], float]:
    """Prova backend e risoluzioni, tiene la prima combinazione che dà frame vivi e veloci."""
    nota = _combinazione_nota(index)
    if nota:
        api, nome, w, h = nota
        esito = _prova_apertura(index, api, w, h)
        if esito is not None:
            cap, reale, ms, nuovi = esito
            if nuovi >= 6 and ms <= LETTURA_LENTA_MS:
                log.info(
                    "Webcam %s aperta con la combinazione già nota: %s a %sx%s (%.0f ms)",
                    index, nome, reale[0], reale[1], ms,
                )
                return cap, nome, reale, ms
            cap.release()
            time.sleep(0.2)
            log.info("La combinazione ricordata per la webcam %s non va più: ricerco", index)

    esiti = []
    for api, nome in BACKEND:
        for w, h in WEBCAM_SIZES:
            esito = _prova_apertura(index, api, w, h)
            if esito is None:
                break  # con questo backend l'indice non esiste
            cap, reale, ms, nuovi = esito
            viva = nuovi >= 6
            log.info(
                "Webcam %s con %s a %sx%s: %.0f ms per frame, %s/8 nuovi",
                index, nome, reale[0], reale[1], ms, nuovi,
            )
            if viva and ms <= LETTURA_LENTA_MS:
                _ricorda_combinazione(index, nome, w, h)
                return cap, nome, reale, ms  # va bene così, non cerco oltre

            cap.release()  # libero sempre prima del tentativo dopo
            time.sleep(0.2)  # la camera ha bisogno di un attimo per riprendersi
            esiti.append((viva, -ms, api, nome, w, h))
            if not viva:
                break  # immagine ferma: è il backend, non la risoluzione

    if not esiti:
        raise SourceError(
            f"Webcam {index} non disponibile. È collegata, o la sta usando un altro programma?"
        )

    # Niente di perfetto: riapro la combinazione meno peggio (prima viva, poi veloce).
    esiti.sort(key=lambda e: (e[0], e[1]), reverse=True)
    viva, _, api, nome, w, h = esiti[0]
    esito = _prova_apertura(index, api, w, h)
    if esito is None:
        raise SourceError(f"Webcam {index} non si riapre. Scollegala e riprova.")
    cap, reale, ms, _ = esito
    if viva:
        _ricorda_combinazione(index, nome, w, h)
    else:
        log.warning("Webcam %s: l'immagine resta ferma con tutti i backend", index)
    return cap, nome, reale, ms


class WebcamSource(_Source):
    """Webcam, con la pazienza che serve su Windows.

    Le webcam USB spariscono per un attimo e tornano: un cavo mosso, il driver
    che si riprende, un altro programma che le tocca. Invece di chiudere tutto e
    mostrare un errore, qui si riprova a riaprire un paio di volte.
    """

    RIAPERTURE = 2

    def __init__(self, index: int, target_fps: int = 30):
        self.index = index
        self.cap, self.backend, self.size, self.ms = _apri_webcam(index)
        self._riaperture = 0
        log.info(
            "Webcam %s aperta con %s a %sx%s (%.0f ms per frame)",
            index, self.backend, self.size[0], self.size[1], self.ms,
        )

    def read(self):
        ok, frame = self.cap.read()
        if ok:
            return frame

        # Un buco isolato capita: prima si insiste un attimo.
        for _ in range(4):
            time.sleep(0.03)
            ok, frame = self.cap.read()
            if ok:
                return frame

        if self._riaperture >= self.RIAPERTURE:
            log.error("Webcam %s persa dopo %s riaperture", self.index, self._riaperture)
            return None

        self._riaperture += 1
        log.warning("Webcam %s non risponde: provo a riaprirla (%s)", self.index, self._riaperture)
        try:
            self.cap.release()
        except Exception:
            pass
        time.sleep(0.6)
        try:
            self.cap, self.backend, self.size, self.ms = _apri_webcam(self.index)
        except SourceError as exc:
            log.error("Riapertura fallita: %s", exc)
            return None
        ok, frame = self.cap.read()
        return frame if ok else None

    def close(self):
        try:
            self.cap.release()
        except Exception:
            pass

    @property
    def label(self):
        return f"Webcam {self.index} · {self.size[0]}x{self.size[1]} · {self.backend}"


class VideoSource(_Source):
    def __init__(self, path: str, loop: bool = True):
        self.path = path
        self.loop = loop
        self.cap = cv2.VideoCapture(path)
        if not self.cap.isOpened():
            raise SourceError(f"Non riesco ad aprire il video: {os.path.basename(path)}")
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        if not (1 <= self.fps <= 240):
            self.fps = 30.0
        self._next_at = 0.0
        log.info("Video aperto: %s (%.1f fps)", path, self.fps)

    def read(self):
        # Rispetta il ritmo naturale del file, altrimenti scorre a velocità folle.
        now = time.perf_counter()
        if now < self._next_at:
            time.sleep(min(self._next_at - now, 0.05))
        self._next_at = time.perf_counter() + 1.0 / self.fps

        ok, frame = self.cap.read()
        if not ok:
            if not self.loop:
                return None
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = self.cap.read()
        return frame if ok else None

    def close(self):
        self.cap.release()

    @property
    def label(self):
        return f"Video {os.path.basename(self.path)}"


class ImageSource(_Source):
    def __init__(self, path: str):
        self.path = path
        frame = cv2.imread(path, cv2.IMREAD_COLOR)
        if frame is None:
            # Percorsi con caratteri non ASCII: cv2.imread non li digerisce.
            try:
                frame = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
            except Exception:
                frame = None
        if frame is None:
            raise SourceError(f"Non riesco ad aprire l'immagine: {os.path.basename(path)}")
        self.frame = frame
        log.info("Immagine aperta: %s", path)

    def read(self):
        time.sleep(1 / 30)
        return self.frame

    @property
    def label(self):
        return f"Immagine {os.path.basename(self.path)}"


class ScreenSource(_Source):
    """Cattura schermo.

    mss usa risorse GDI legate al thread: se l'istanza nasce in un thread e legge
    in un altro, BitBlt fallisce. Qui si apre soltanto per leggere le dimensioni,
    poi ogni thread che legge si crea la sua.
    """

    def __init__(self, monitor: int = 1, target_fps: int = 30):
        import mss

        with mss.mss() as sonda:
            mons = sonda.monitors
            if monitor >= len(mons):
                monitor = 1 if len(mons) > 1 else 0
            self.monitor = dict(mons[monitor])
        self.index = monitor
        self.interval = 1.0 / max(target_fps, 1)
        self._last = 0.0
        self._locale = threading.local()
        log.info("Cattura schermo %s: %sx%s", monitor, self.monitor["width"], self.monitor["height"])

    def _sct(self):
        sct = getattr(self._locale, "sct", None)
        if sct is None:
            import mss

            sct = mss.mss()
            self._locale.sct = sct
        return sct

    def read(self):
        wait = self.interval - (time.perf_counter() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.perf_counter()
        shot = self._sct().grab(self.monitor)
        return np.ascontiguousarray(np.asarray(shot)[:, :, :3])  # BGRA -> BGR

    def close(self):
        sct = getattr(self._locale, "sct", None)
        if sct is not None:
            try:
                sct.close()
            except Exception:
                pass
            self._locale.sct = None

    @property
    def label(self):
        return f"Schermo {self.index} · {self.monitor['width']}x{self.monitor['height']}"


class SorgenteSogno(_Source):
    """Sogno puro: nessun ingresso, l'immagine nasce e si evolve da sé.

    Il frame di partenza è rumore morbido colorato; da lì in poi la sorgente
    restituisce l'ultimo risultato del modello, spostato di pochissimo (zoom e
    deriva). Il modello lo rilavora, e quel filo di movimento a ogni giro è ciò
    che trasforma un'immagine ferma in un sogno che scorre.
    """

    def __init__(self, ultimo_risultato, movimento: float = 0.35, seme: int = 0, fps: int = 30):
        self.ultimo = ultimo_risultato
        self.movimento = movimento
        self.interval = 1.0 / max(fps, 1)
        self._last = 0.0
        self._rng = np.random.default_rng(seme or None)
        self._avvio = None
        self._giro = 0.0

    def _semenza(self, w: int, h: int) -> np.ndarray:
        """Rumore morbido: macchie di colore invece di puntini, così il modello
        ci trova già qualcosa da interpretare."""
        piccolo = self._rng.integers(0, 255, (max(h // 32, 3), max(w // 32, 3), 3), dtype=np.uint8)
        grande = cv2.resize(piccolo, (w, h), interpolation=cv2.INTER_CUBIC)
        return cv2.GaussianBlur(grande, (0, 0), max(w / 90.0, 1.0))

    def read(self):
        wait = self.interval - (time.perf_counter() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.perf_counter()

        frame = self.ultimo()  # BGR, oppure None se non si è ancora generato niente
        if frame is None:
            if self._avvio is None:
                self._avvio = self._semenza(640, 384)
            return self._avvio
        self._avvio = None

        # Da qui in poi i pixel non contano: il modello genera da zero e questa
        # sorgente serve solo a dare il ritmo e a mostrare l'anteprima. Il
        # movimento comanda la velocità della passeggiata latente, nel backend.
        return frame

    @property
    def label(self):
        return "Sogno libero"


def open_source(p: SourceParams, ultimo_risultato=None) -> _Source:
    kind = (p.kind or "webcam").lower()
    if kind == "webcam":
        return WebcamSource(p.device_index, p.target_fps)
    if kind == "video":
        if not p.path:
            raise SourceError("Nessun file video selezionato.")
        return VideoSource(p.path, p.loop_video)
    if kind == "immagine":
        if not p.path:
            raise SourceError("Nessuna immagine selezionata.")
        return ImageSource(p.path)
    if kind == "schermo":
        return ScreenSource(p.monitor, p.target_fps)
    if kind == "sogno":
        if ultimo_risultato is None:
            raise SourceError("Il sogno libero ha bisogno del motore acceso.")
        return SorgenteSogno(ultimo_risultato, p.movimento, p.seme_sogno, p.target_fps)
    raise SourceError(f"Sorgente sconosciuta: {kind}")


# Nomi che tradiscono una camera virtuale: quasi sempre non mandano immagine
# finché non accendi il programma che le pilota.
_INDIZI_VIRTUALI = ("virtual", "virtuale", "quest", "obs", "broadcast", "droidcam", "iriun")


def _nomi_dispositivi() -> list[str]:
    """Chiede a ffmpeg i nomi veri delle camere DirectShow, nello stesso ordine di OpenCV."""
    import re
    import subprocess

    try:
        import imageio_ffmpeg

        exe = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return []

    try:
        out = subprocess.run(
            [exe, "-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
            capture_output=True,
            text=True,
            timeout=25,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        ).stderr
    except Exception as exc:
        log.warning("Elenco dispositivi non disponibile: %s", exc)
        return []

    nomi = []
    for riga in out.splitlines():
        trovato = re.search(r'^\[dshow[^\]]*\]\s+"(.+)"\s+\(video\)\s*$', riga.strip())
        if trovato:
            nomi.append(trovato.group(1))
    return nomi


def list_webcams(max_index: int = 8) -> list[dict]:
    """Elenca le camere con il loro nome vero, senza aprirle.

    Aprirle per sondarle costava fino a 15 secondi e su questa macchina ci sono
    sette dispositivi DirectShow (uno solo è una webcam vera): molto meglio
    leggere i nomi e lasciare scegliere.
    """
    nomi = _nomi_dispositivi()
    if nomi:
        return [
            {
                "index": i,
                "name": nome,
                "virtuale": any(s in nome.lower() for s in _INDIZI_VIRTUALI),
                "nota": _combinazione_nota(i)[1] if _combinazione_nota(i) else "",
            }
            for i, nome in enumerate(nomi[:max_index])
        ]

    # Senza ffmpeg resta la sonda vecchia maniera, ma corta.
    trovate = []
    for i in range(3):
        esito = _prova_apertura(i, cv2.CAP_DSHOW, *WEBCAM_SIZES[1])
        if esito is None:
            continue
        cap, size, ms, nuovi = esito
        cap.release()
        time.sleep(0.2)
        trovate.append(
            {"index": i, "name": f"Webcam {i}", "virtuale": False, "nota": "", "viva": nuovi >= 4}
        )
    return trovate


def list_monitors() -> list[dict]:
    try:
        import mss

        with mss.mss() as sct:
            out = [
                {"index": i, "name": f"Schermo {i}", "width": m["width"], "height": m["height"]}
                for i, m in enumerate(sct.monitors)
                if i > 0  # 0 = tutti gli schermi insieme
            ]
            if len(sct.monitors) > 2:
                out.append({"index": 0, "name": "Tutti gli schermi", "width": 0, "height": 0})
            return out
    except Exception as exc:  # pragma: no cover
        log.warning("Enumerazione schermi fallita: %s", exc)
        return [{"index": 1, "name": "Schermo 1", "width": 0, "height": 0}]


class CaptureThread(threading.Thread):
    """Legge la sorgente in continuo e conserva soltanto l'ultimo frame."""

    def __init__(self, source: _Source, on_error=None):
        super().__init__(daemon=True, name="capture")
        self.source = source
        self.on_error = on_error
        self._frame: np.ndarray | None = None
        self._seq = 0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._new = threading.Condition(self._lock)
        self.fps = 0.0
        self.ended = False

    def latest(self) -> tuple[np.ndarray | None, int]:
        with self._lock:
            return (self._frame, self._seq)

    def wait_new(self, last_seq: int, timeout: float = 1.0):
        with self._new:
            if self._seq == last_seq:
                self._new.wait(timeout)
            return (self._frame, self._seq)

    def run(self):
        smoothed = 0.0
        prev = time.perf_counter()
        while not self._stop.is_set():
            try:
                frame = self.source.read()
            except Exception as exc:
                log.exception("Errore di acquisizione")
                if self.on_error:
                    self.on_error(str(exc))
                break
            if frame is None:
                self.ended = True
                if self.on_error:
                    self.on_error("La sorgente è terminata.")
                break

            now = time.perf_counter()
            dt = now - prev
            prev = now
            if dt > 0:
                inst = 1.0 / dt
                smoothed = inst if smoothed == 0 else smoothed * 0.9 + inst * 0.1
                self.fps = smoothed

            with self._new:
                self._frame = frame
                self._seq += 1
                self._new.notify_all()

    def stop(self):
        self._stop.set()
        with self._new:
            self._new.notify_all()
        self.join(timeout=3.0)
        try:
            self.source.close()
        except Exception as exc:
            # Chiudere una sorgente già morta può lamentarsi: non deve bloccare
            # chi sta cercando di ripartire con un'altra.
            log.warning("Chiusura sorgente non pulita: %s", exc)
