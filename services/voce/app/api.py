"""L'API locale di DaProdVoce.

Il patto con lo shell è quello di tutti i motori: `/health` quando è pronto,
`/shutdown` per spegnersi. Il resto è quello che serve alla pagina.

**Parlare è un lavoro, non una risposta.** Una frase di cinque secondi ne prende
venti sulla scheda video, e un `POST` che resta appeso per venti secondi è un
tasto che sembra rotto: la pagina non può dire a che punto è, e chi aspetta
ripreme. Quindi si mette in coda — `POST /api/parla` torna subito un numero — e
la pagina chiede come va con `GET /api/lavoro/<id>`.
"""

from __future__ import annotations

import itertools
import logging
import threading
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import motore as mot
from .motore import motore

log = logging.getLogger("daprodvoce.api")

_numeri = itertools.count(1)
_lavori: dict[int, dict] = {}
_lucchetto = threading.Lock()


class Richiesta(BaseModel):
    testo: str
    modello: str = mot.PREDEFINITO
    voce: str | None = None
    temperatura: float = 0.7
    seme: int | None = None
    secondiMassimi: float = 30.0


def create_app() -> FastAPI:
    app = FastAPI(title="DaProdVoce", version="0.1.0", docs_url="/api/docs")

    # ------------------------------------------------------ il patto comune

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.post("/shutdown")
    def shutdown():
        motore.spegni()

        # Si risponde **prima** di morire: lo shell aspetta il 200 e senza
        # quello resta a guardare un processo che se n'è già andato.
        def poi():
            import os
            import signal
            import time

            time.sleep(0.2)
            os.kill(os.getpid(), signal.SIGTERM)

        threading.Thread(target=poi, daemon=True).start()
        return {"ok": True}

    # ------------------------------------------------------------- lo stato

    @app.get("/api/stato")
    def stato():
        return motore.stato()

    @app.post("/api/libera")
    def libera():
        """Toglie il modello dalla memoria adesso, senza aspettare i cinque minuti."""
        motore.scarica()
        return motore.stato()

    # -------------------------------------------------------------- le voci

    @app.get("/api/voci")
    def elenco_voci():
        return {"voci": mot.voci()}

    @app.post("/api/voci")
    async def aggiungi_voce(
        nome: str = Form(...),
        testo: str = Form(...),
        audio: UploadFile = File(...),
    ):
        """Salva una voce: l'audio di riferimento e cosa ci si sente dire.

        **La trascrizione non è un'etichetta.** Il modello la usa per capire
        come quella voce pronuncia quelle parole: sbagliarla peggiora la copia,
        lasciarla vuota la rende un'altra voce.
        """
        estensione = Path(audio.filename or "voce.wav").suffix.lower() or ".wav"
        try:
            return mot.salva_voce(nome, await audio.read(), estensione, testo)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.delete("/api/voci/{id_voce}")
    def togli_voce(id_voce: str):
        try:
            mot.elimina_voce(id_voce)
        except (FileNotFoundError, ValueError) as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return {"ok": True}

    # ------------------------------------------------------------- parlare

    @app.post("/api/parla")
    def parla(richiesta: Richiesta):
        if not richiesta.testo.strip():
            raise HTTPException(status_code=400, detail="Non c'e' niente da leggere.")

        numero = next(_numeri)
        pezzi = len(mot.taglia(richiesta.testo))
        with _lucchetto:
            _lavori[numero] = {
                "id": numero, "stato": "in-attesa", "fatti": 0, "totali": pezzi,
                "cosa": "in coda", "errore": None, "risultato": None,
            }

        threading.Thread(target=_lavora, args=(numero, richiesta), daemon=True).start()
        return {"id": numero, "pezzi": pezzi}

    @app.get("/api/lavoro/{numero}")
    def lavoro(numero: int):
        with _lucchetto:
            voce = _lavori.get(numero)
        if not voce:
            raise HTTPException(status_code=404, detail="Lavoro sconosciuto.")
        return JSONResponse(voce)

    return app


def _lavora(numero: int, richiesta: Richiesta) -> None:
    """Il lavoro vero, fuori dal filo che risponde alle richieste."""

    def racconta(fatti: int, totali: int, cosa: str) -> None:
        with _lucchetto:
            _lavori[numero].update(stato="in-corso", fatti=fatti, totali=totali, cosa=cosa)

    riferimento = None
    testo_riferimento = None
    nome_voce = None
    try:
        if richiesta.voce:
            riferimento = mot.percorso_voce(richiesta.voce)
            for voce in mot.voci():
                if voce["id"] == richiesta.voce:
                    testo_riferimento = voce["testo"]
                    nome_voce = voce["nome"]
                    break

        risultato = motore.parla(
            richiesta.testo,
            id_modello=richiesta.modello,
            riferimento=riferimento,
            testo_riferimento=testo_riferimento,
            temperatura=richiesta.temperatura,
            seme=richiesta.seme,
            secondi_massimi=richiesta.secondiMassimi,
            nome_voce=nome_voce,
            racconta=racconta,
        )
        with _lucchetto:
            _lavori[numero].update(stato="fatto", risultato=risultato, cosa="fatto")
    except Exception as exc:  # va detto alla pagina, non solo scritto nel log
        log.exception("Il lavoro %s non e' riuscito", numero)
        with _lucchetto:
            _lavori[numero].update(stato="errore", errore=str(exc), cosa="errore")
