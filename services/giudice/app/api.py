"""L'API del giudice: il patto comune, piu' una domanda.

`POST /api/giudica` risponde quando il modello ha deciso — secondi, o un minuto
la prima volta, perche' deve caricare. Chi chiede e' lo shell, non una pagina:
un POST che aspetta va bene.
"""

from __future__ import annotations

import logging
import os
import signal
import threading

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .motore import motore

log = logging.getLogger("giudice.api")


class Domanda(BaseModel):
    stato: str
    domanda: str
    opzioni: list[str]
    file: str | None = None
    tipo: str | None = None


def create_app() -> FastAPI:
    app = FastAPI(title="DaProd giudice", version="0.1.0", docs_url="/api/docs")

    @app.get("/health")
    def health():
        return {"ok": True, "carico": motore.carico}

    @app.post("/shutdown")
    def shutdown():
        motore.spegni()
        threading.Timer(0.3, lambda: os.kill(os.getpid(), signal.SIGTERM)).start()
        return {"ok": True}

    @app.post("/api/giudica")
    def giudica(d: Domanda):
        if not d.opzioni or len(d.opzioni) > 20:
            raise HTTPException(400, "Servono da una a venti risposte possibili.")
        try:
            prob = motore.giudica(d.stato, d.domanda, d.opzioni, d.file, d.tipo)
        except Exception as errore:  # noqa: BLE001 — si dice com'e' andata, sempre
            log.exception("Il giudice non ha risposto")
            raise HTTPException(500, str(errore)) from errore
        ordinate = sorted(prob.items(), key=lambda kv: kv[1], reverse=True)
        return {"probabilita": prob, "meglio": ordinate[0][0] if ordinate else None}

    return app
