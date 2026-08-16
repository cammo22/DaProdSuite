"""API locale: comandi REST, stato via WebSocket, anteprime via MJPEG.

Le anteprime viaggiano come multipart/x-mixed-replace: il browser le mostra dentro
un <img> senza una riga di JavaScript, con latenza bassa e zero librerie.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
from typing import Any

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import dialogs, galleria, presets, prompts
from .capture import list_monitors
from pathlib import Path

from .config import (
    APPDATA_DIR,
    LORAS_DIR,
    RECORDINGS_DIR,
    SCREENSHOTS_DIR,
    UI_DIR,
    UserSettings,
)
from .engine import DreamEngine
from .params import MODES, RESOLUTIONS

log = logging.getLogger("daproddream.api")

BOUNDARY = "dreamframe"


def create_app(engine: DreamEngine) -> FastAPI:
    app = FastAPI(title="DaProdDream", version="0.1.0", docs_url="/api/docs")
    settings = UserSettings.load()
    app.state.engine = engine
    app.state.clients = 0
    app.state.last_client_at = time.time()

    # ------------------------------------------------------------- anteprime

    def mjpeg(slot, to_bgr: bool, quality: int, max_fps: float, width: int | None = None):
        params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        interval = 1.0 / max_fps
        last_seq = -1
        while True:
            frame, seq = slot.wait(last_seq, timeout=1.0)
            if frame is None:
                time.sleep(0.1)
                continue
            if seq == last_seq:
                time.sleep(0.01)
                continue
            last_seq = seq

            img = frame
            if to_bgr:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            if width and img.shape[1] > width:
                h = int(img.shape[0] * width / img.shape[1])
                img = cv2.resize(img, (width, h), interpolation=cv2.INTER_AREA)

            ok, buf = cv2.imencode(".jpg", img, params)
            if not ok:
                continue
            data = buf.tobytes()
            yield (
                f"--{BOUNDARY}\r\nContent-Type: image/jpeg\r\n"
                f"Content-Length: {len(data)}\r\n\r\n".encode()
                + data
                + b"\r\n"
            )
            time.sleep(interval)

    @app.get("/stream/visione")
    def stream_output():
        return StreamingResponse(
            mjpeg(engine.output_slot, to_bgr=True, quality=88, max_fps=60),
            media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
            headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
        )

    @app.get("/stream/sorgente")
    def stream_input():
        return StreamingResponse(
            mjpeg(engine.input_slot, to_bgr=True, quality=70, max_fps=20, width=480),
            media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
            headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
        )

    # ----------------------------------------------------------------- stato

    @app.get("/api/stato")
    def stato():
        return engine.status()

    @app.websocket("/ws")
    async def ws(sock: WebSocket):
        await sock.accept()
        app.state.clients += 1
        app.state.last_client_at = time.time()
        try:
            while True:
                await sock.send_text(json.dumps(engine.status(), default=str))
                await asyncio.sleep(0.3)
        except (WebSocketDisconnect, RuntimeError):
            pass
        except Exception as exc:
            log.debug("WebSocket chiuso: %s", exc)
        finally:
            app.state.clients = max(0, app.state.clients - 1)
            app.state.last_client_at = time.time()

    # -------------------------------------------------------------- comandi

    @app.post("/api/avvia")
    def avvia(body: dict[str, Any] | None = None):
        try:
            engine.start((body or {}).get("source"))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return engine.status()

    @app.post("/api/pausa")
    def pausa():
        engine.pause()
        return engine.status()

    @app.post("/api/ferma")
    def ferma():
        engine.stop()
        return engine.status()

    @app.post("/api/parametri")
    def parametri(body: dict[str, Any]):
        engine.update_params(body or {})
        return engine.status()

    @app.post("/api/modello")
    def modello(body: dict[str, Any]):
        model = (body or {}).get("model")
        if not model:
            raise HTTPException(status_code=400, detail="Manca il modello.")
        engine.params.model = model
        try:
            engine.load_model(model)
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return engine.status()

    @app.post("/api/modello/scarica")
    def scarica_modello():
        try:
            engine.unload_model()
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return engine.status()

    @app.post("/api/modello/carica")
    def carica_modello():
        if engine.backend.ready:
            return engine.status()
        try:
            engine.load_model()
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return engine.status()

    # ------------------------------------------------------------- prompt

    @app.get("/api/prompt")
    def prompt_elenco():
        return {"salvati": prompts.elenco()}

    @app.get("/api/prompt/casuale")
    def prompt_casuale():
        return prompts.casuale()

    @app.post("/api/prompt")
    def prompt_salva(body: dict[str, Any]):
        testo = (body or {}).get("prompt", "")
        try:
            return prompts.salva(
                testo,
                (body or {}).get("negative_prompt", ""),
                (body or {}).get("etichetta", ""),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.delete("/api/prompt/{identificativo}")
    def prompt_elimina(identificativo: str):
        if not prompts.elimina(identificativo):
            raise HTTPException(status_code=404, detail="Prompt non trovato.")
        return {"ok": True}

    @app.post("/api/backend")
    def backend(body: dict[str, Any]):
        name = (body or {}).get("name", "diffusers")
        engine.set_backend(name)
        return engine.status()

    # ---------------------------------------------------------------- output

    @app.post("/api/schermata")
    def schermata():
        path = engine.screenshot()
        if path is None:
            raise HTTPException(status_code=409, detail="Non c'è ancora nessuna visione da salvare.")
        return {"file": str(path), "name": path.name}

    @app.post("/api/registra")
    def registra(body: dict[str, Any] | None = None):
        azione = (body or {}).get("azione", "toggle")
        if engine.recorder.active and azione in ("toggle", "stop"):
            path = engine.stop_recording()
            return {"recording": False, "file": str(path) if path else ""}
        if not engine.recorder.active and azione in ("toggle", "start"):
            try:
                path = engine.start_recording()
            except Exception as exc:
                raise HTTPException(status_code=400, detail=str(exc))
            return {"recording": True, "file": str(path)}
        return {"recording": engine.recorder.active}

    @app.post("/api/apri-cartella")
    def apri_cartella(body: dict[str, Any]):
        quale = (body or {}).get("quale", "recordings")
        target = {
            "recordings": RECORDINGS_DIR,
            "screenshots": SCREENSHOTS_DIR,
            "loras": LORAS_DIR,
        }.get(quale, RECORDINGS_DIR)
        return {"ok": dialogs.open_folder(target), "path": str(target)}

    @app.post("/api/file-trascinato")
    async def file_trascinato(file: UploadFile = File(...)):
        """Riceve un file trascinato nella finestra e restituisce il percorso.

        Il browser non dà mai il percorso vero di un file trascinato, quindi lo
        si fa arrivare qui e si salva accanto agli altri dati dell'app.
        """
        nome = Path(file.filename or "trascinato").name
        cartella = APPDATA_DIR / "importati"
        cartella.mkdir(parents=True, exist_ok=True)
        destinazione = cartella / nome
        try:
            with open(destinazione, "wb") as f:
                while pezzo := await file.read(1 << 20):
                    f.write(pezzo)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Non riesco a salvare il file: {exc}")

        estensione = destinazione.suffix.lower()
        if estensione in {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif"}:
            tipo = "immagine"
        elif estensione in {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}:
            tipo = "video"
        else:
            destinazione.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Formato non gestito: {estensione}")
        return {"path": str(destinazione), "tipo": tipo, "nome": nome}

    @app.post("/api/traduzione")
    def traduzione(body: dict[str, Any]):
        engine.traduci = bool((body or {}).get("attiva", True))
        if engine.traduci:
            threading.Thread(target=engine.traduttore.carica, daemon=True).start()
        engine._aggiorna_traduzione()
        return engine.status()

    # ------------------------------------------------------------- galleria

    @app.get("/api/galleria")
    def galleria_elenco():
        return {"elementi": galleria.elenco()}

    @app.get("/media/{tipo}/{nome}")
    def galleria_file(tipo: str, nome: str):
        f = galleria.percorso(tipo, nome)
        if f is None:
            raise HTTPException(status_code=404, detail="File non trovato.")
        # FileResponse gestisce le richieste Range: i video si possono scorrere.
        return FileResponse(str(f), headers={"Cache-Control": "no-cache"})

    @app.delete("/api/galleria/{tipo}/{nome}")
    def galleria_elimina(tipo: str, nome: str):
        if not galleria.elimina(tipo, nome):
            raise HTTPException(status_code=404, detail="File non trovato.")
        return {"ok": True}

    # ------------------------------------------------------------- risorse

    @app.get("/api/sorgenti")
    def sorgenti(refresh: bool = False):
        if refresh:
            from .capture import dimentica_webcam

            dimentica_webcam()  # ricomincia a cercare backend e risoluzione
        return {
            "webcams": engine.webcams(refresh=refresh),
            "monitors": list_monitors(),
        }

    @app.post("/api/sfoglia")
    def sfoglia(body: dict[str, Any]):
        kind = (body or {}).get("tipo", "video")
        titles = {
            "video": "Scegli un video",
            "immagine": "Scegli un'immagine",
            "modello": "Scegli un checkpoint",
            "lora": "Scegli una LoRA",
        }
        path = dialogs.pick_file(kind, titles.get(kind, "Scegli un file"))
        return {"path": path}

    @app.get("/api/modelli")
    def modelli():
        from .backends.diffusers_backend import available_loras, available_models

        return {
            "models": available_models(),
            "loras": available_loras(),
            "resolutions": list(RESOLUTIONS.keys()),
            "modes": MODES,
        }

    @app.get("/api/sogni")
    def sogni():
        return {"presets": presets.list_presets()}

    @app.post("/api/sogni")
    def salva_sogno(body: dict[str, Any]):
        name = (body or {}).get("name", "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Serve un nome per il sogno.")
        return presets.save_preset(name, engine.params)

    @app.post("/api/sogni/applica")
    def applica_sogno(body: dict[str, Any]):
        name = (body or {}).get("name", "")
        try:
            engine.apply_preset(name)
        except KeyError:
            raise HTTPException(status_code=404, detail="Sogno non trovato.")
        return engine.status()

    @app.delete("/api/sogni/{name}")
    def elimina_sogno(name: str):
        if not presets.delete_preset(name):
            raise HTTPException(status_code=404, detail="Sogno non trovato.")
        return {"ok": True}

    @app.get("/api/impostazioni")
    def leggi_impostazioni():
        return settings.__dict__

    @app.post("/api/impostazioni")
    def scrivi_impostazioni(body: dict[str, Any]):
        for k, v in (body or {}).items():
            if k in settings.__dataclass_fields__:
                setattr(settings, k, v)
        settings.save()
        return settings.__dict__

    @app.post("/api/chiudi")
    def chiudi():
        import os
        import signal
        import threading

        def bye():
            time.sleep(0.4)
            engine.shutdown()
            os.kill(os.getpid(), signal.SIGTERM)

        threading.Thread(target=bye, daemon=True).start()
        return {"ok": True}

    # Il patto dei motori della suite: `POST /shutdown` spegne, `GET /health`
    # dice che sei pronto. Qui `/shutdown` è lo stesso di `/api/chiudi`, con il
    # nome che il supervisore si aspetta da tutti (docs/COME-SI-LAVORA.md § 3).
    @app.post("/shutdown")
    def shutdown():
        return chiudi()

    # -------------------------------------------------------------------- UI

    @app.get("/health")
    def health():
        return {"ok": True, "state": engine.state, "version": app.version}

    if UI_DIR.exists():
        @app.get("/")
        def index():
            return FileResponse(UI_DIR / "index.html")

        app.mount("/ui", StaticFiles(directory=str(UI_DIR)), name="ui")
    else:
        @app.get("/")
        def missing_ui():
            return JSONResponse({"errore": f"Interfaccia non trovata in {UI_DIR}"}, status_code=500)

    return app
