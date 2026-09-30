"""
Il ponte fra DaProd Suite e WanGP.

**Cos'è.** Un plugin di WanGP che la suite installa da sé. Dentro il processo di
WanGP apre una porticina su 127.0.0.1 dalla quale la suite manda i lavori dei
suoi utenti (un'immagine, un brano) **nella coda vera di WanGP**: la stessa che
vede chi ha aperto l'interfaccia intera, con lo stesso motore, la stessa scheda
video e gli stessi modelli. Un WanGP solo, nessun agente in mezzo.

**Perché un plugin e non un'API da fuori.** WanGP ha un'API (`shared/api.py`) e
un server MCP, ma l'API parla con una sessione dentro al processo e l'MCP è un
altro processo che vorrebbe la stessa scheda video. Qui si fa quello che fa
Deepy per i suoi strumenti — una `WanGPSession` agganciata allo stato vivo —
senza il modello di linguaggio davanti.

**Cosa NON fa.** Non cambia nessuna impostazione dell'utente e non tocca
l'interfaccia: nessuna scheda, nessun pulsante. Senza le variabili
`DAPROD_PONTE_PORTA` e `DAPROD_PONTE_TOKEN` (che mette la suite quando accende
WanGP) resta spento: chi usa WanGP col launcher non se ne accorge.

La porticina risponde solo a chi porta il token e solo da 127.0.0.1.

Rotte (JSON):
    GET  /stato               come sta il ponte e la coda di WanGP
    GET  /modelli             i modelli di immagini e audio che WanGP conosce
    POST /lavori              { settings: {...} }  ->  { id }
    GET  /lavori/<id>         lo stato di un lavoro
    POST /lavori/<id>/annulla lo ferma
"""

from __future__ import annotations

import json
import os
import sys
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from shared.utils.plugins import WAN2GPPlugin

VERSIONE = "1.0.0"

# Quanti lavori si ricordano. Il resto cade: la suite li ha già consegnati.
LAVORI_MAX = 200

# Il ponte si avvia una volta sola per processo, anche se l'interfaccia viene
# ricostruita (WanGP lo fa quando si aggiorna l'elenco dei plugin).
_avviato = False
_lock = threading.Lock()
_lavori: dict[str, "Lavoro"] = {}


class Lavoro:
    """Un lavoro chiesto dalla suite, e a che punto è."""

    def __init__(self, settings: dict) -> None:
        self.id = "l-" + uuid.uuid4().hex[:12]
        self.settings = settings
        self.stato = "attesa"  # attesa | in-corso | finito | errore | annullato
        self.progresso: float | None = None
        self.fase = ""
        self.files: list[str] = []
        self.errore = ""
        self.job = None
        self.creato = time.time()

    def come_dizionario(self) -> dict:
        return {
            "id": self.id,
            "stato": self.stato,
            "progresso": self.progresso,
            "fase": self.fase,
            "files": self.files,
            "errore": self.errore,
        }


class _Richiami:
    """Quello che WanGP ci racconta mentre lavora (vedi docs/API.md)."""

    def __init__(self, lavoro: Lavoro) -> None:
        self._lavoro = lavoro

    def on_status(self, status) -> None:
        testo = str(status or "").strip()
        if testo:
            self._lavoro.fase = testo[:120]

    def on_progress(self, update) -> None:
        try:
            self._lavoro.progresso = max(0.0, min(1.0, float(getattr(update, "progress", 0)) / 100.0))
        except (TypeError, ValueError):
            pass
        fase = str(getattr(update, "status", "") or getattr(update, "phase", "") or "").strip()
        if fase:
            self._lavoro.fase = fase[:120]
        if self._lavoro.stato == "attesa":
            self._lavoro.stato = "in-corso"


def _stato_vivo(plugin: "DaProdPontePlugin"):
    """Lo stato condiviso di WanGP (quello con la coda e la galleria)."""
    componente = getattr(plugin, "state", None)
    stato = getattr(componente, "value", None)
    if not isinstance(stato, dict):
        raise RuntimeError("WanGP non ha ancora costruito la sua interfaccia.")
    if getattr(stato, "service", None) is None:
        raise RuntimeError("Questa versione di WanGP non ha il servizio condiviso che il ponte si aspetta.")
    return stato


def _esegui(plugin: "DaProdPontePlugin", lavoro: Lavoro) -> None:
    """Sta in un filo suo: mette il lavoro in coda e ne aspetta la fine."""
    try:
        from shared.api import WanGPSession

        stato = _stato_vivo(plugin)
        # Si costruisce come fa Deepy per i suoi strumenti (shared/deepy/prime_tools.py):
        # sessione sulla coda viva, e la coda la fa partire chi la riempie.
        sessione = WanGPSession(webui_state=stato, console_output=False, console_isatty=False)
        sessione._gradio_webui_context = {"defer_load_queue_trigger": True}

        job = sessione.submit_task(lavoro.settings, callbacks=_Richiami(lavoro))
        lavoro.job = job

        pronto = job.wait_for_webui_submission_or_completion(timeout=120)
        if pronto:
            stato.service.command("load_queue_trigger", {"job_id": lavoro.id, "token": job.webui_load_queue_token})

        risultato = job.result()
        if risultato.success and risultato.generated_files:
            lavoro.files = [str(p) for p in risultato.generated_files]
            lavoro.progresso = 1.0
            lavoro.stato = "finito"
        elif getattr(risultato, "cancelled", False) or job.cancel_requested:
            lavoro.stato = "annullato"
        else:
            errori = list(risultato.errors or [])
            lavoro.errore = str(errori[0] if errori else "WanGP ha finito senza produrre un file.")[:600]
            lavoro.stato = "errore"
    except Exception as errore:  # noqa: BLE001 - qualunque cosa vada storta si racconta alla suite
        traceback.print_exc()
        lavoro.errore = str(errore)[:600] or errore.__class__.__name__
        lavoro.stato = "errore"


def _pulisci() -> None:
    """Tiene la memoria dei lavori corta: cadono i più vecchi già finiti."""
    if len(_lavori) <= LAVORI_MAX:
        return
    finiti = sorted((l for l in _lavori.values() if l.stato in ("finito", "errore", "annullato")), key=lambda l: l.creato)
    for l in finiti[: len(_lavori) - LAVORI_MAX]:
        _lavori.pop(l.id, None)


def _modelli(plugin: "DaProdPontePlugin") -> list[dict]:
    """I modelli di immagini e audio, come li vede WanGP."""
    from shared.api import WanGPSession

    stato = _stato_vivo(plugin)
    sessione = WanGPSession(webui_state=stato, console_output=False, console_isatty=False)
    sessione._gradio_webui_context = {"defer_load_queue_trigger": True}
    trovati = sessione.list_model_metadata(main_output=["image", "audio"], include_availability=True)
    return [
        {
            "model_type": m.get("model_type"),
            "nome": m.get("name"),
            "uscita": m.get("main_output"),
            "famiglia": m.get("family_label"),
            "disponibile": (m.get("availability") or {}).get("status") if isinstance(m.get("availability"), dict) else None,
        }
        for m in trovati
    ]


def _fabbrica_gestore(plugin: "DaProdPontePlugin", token: str):
    class Gestore(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *_args) -> None:  # niente rumore nel terminale di WanGP
            pass

        def _rispondi(self, codice: int, corpo: dict) -> None:
            dati = json.dumps(corpo).encode("utf-8")
            self.send_response(codice)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(dati)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(dati)

        def _autorizzato(self) -> bool:
            return self.headers.get("X-DaProd-Token", "") == token

        def _leggi(self) -> dict:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > 2_000_000:
                return {}
            try:
                return json.loads(self.rfile.read(n).decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return {}

        def do_GET(self) -> None:  # noqa: N802
            if not self._autorizzato():
                return self._rispondi(401, {"errore": "token"})
            try:
                if self.path == "/stato":
                    with _lock:
                        attivi = sum(1 for l in _lavori.values() if l.stato in ("attesa", "in-corso"))
                    try:
                        vivo = _stato_vivo(plugin)
                        pronto = True
                        # Anche chi ha l'interfaccia aperta genera: la suite non deve spegnere WanGP a metà.
                        generazione = bool(getattr(vivo.service, "generation_running", False))
                    except RuntimeError:
                        pronto = False
                        generazione = False
                    return self._rispondi(200, {"ponte": VERSIONE, "pronto": pronto, "lavoriAttivi": attivi, "generazione": generazione})
                if self.path == "/modelli":
                    return self._rispondi(200, {"modelli": _modelli(plugin)})
                if self.path.startswith("/lavori/"):
                    with _lock:
                        lavoro = _lavori.get(self.path.split("/")[2])
                    if not lavoro:
                        return self._rispondi(404, {"errore": "Non conosco questo lavoro."})
                    return self._rispondi(200, lavoro.come_dizionario())
                return self._rispondi(404, {"errore": "Rotta sconosciuta."})
            except RuntimeError as errore:  # WanGP non e' pronto: succede, non e' un guasto
                return self._rispondi(503, {"errore": str(errore)[:300]})
            except Exception as errore:  # noqa: BLE001
                traceback.print_exc()
                return self._rispondi(500, {"errore": str(errore)[:300]})

        def do_POST(self) -> None:  # noqa: N802
            if not self._autorizzato():
                return self._rispondi(401, {"errore": "token"})
            try:
                if self.path == "/lavori":
                    settings = self._leggi().get("settings")
                    if not isinstance(settings, dict) or not settings.get("model_type"):
                        return self._rispondi(400, {"errore": "Mancano le impostazioni o il modello."})
                    _stato_vivo(plugin)  # se WanGP non è pronto, si dice subito
                    lavoro = Lavoro(settings)
                    with _lock:
                        _lavori[lavoro.id] = lavoro
                        _pulisci()
                    threading.Thread(target=_esegui, args=(plugin, lavoro), name="DaProd ponte: " + lavoro.id, daemon=True).start()
                    return self._rispondi(202, {"id": lavoro.id})
                if self.path.startswith("/lavori/") and self.path.endswith("/annulla"):
                    with _lock:
                        lavoro = _lavori.get(self.path.split("/")[2])
                    if not lavoro:
                        return self._rispondi(404, {"errore": "Non conosco questo lavoro."})
                    if lavoro.job is not None and not lavoro.job.done:
                        lavoro.job.cancel()
                    return self._rispondi(200, lavoro.come_dizionario())
                return self._rispondi(404, {"errore": "Rotta sconosciuta."})
            except RuntimeError as errore:  # WanGP non e' pronto: succede, non e' un guasto
                return self._rispondi(503, {"errore": str(errore)[:300]})
            except Exception as errore:  # noqa: BLE001
                traceback.print_exc()
                return self._rispondi(500, {"errore": str(errore)[:300]})

    return Gestore


class DaProdPontePlugin(WAN2GPPlugin):
    def __init__(self) -> None:
        super().__init__()
        self.name = "DaProd Ponte"
        self.version = VERSIONE
        self.description = "Riceve i lavori di DaProd Suite e li mette nella coda di WanGP."

    def setup_ui(self) -> None:
        # Serve lo stato condiviso, che WanGP crea con l'interfaccia.
        self.request_component("state")

    def post_ui_setup(self, components):
        global _avviato
        porta = os.environ.get("DAPROD_PONTE_PORTA", "").strip()
        token = os.environ.get("DAPROD_PONTE_TOKEN", "").strip()
        if not porta.isdigit() or not token:
            return {}
        with _lock:
            if _avviato:
                return {}
            _avviato = True
        try:
            server = ThreadingHTTPServer(("127.0.0.1", int(porta)), _fabbrica_gestore(self, token))
        except OSError as errore:
            print(f"[DaProd Ponte] non riesco ad aprire la porta {porta}: {errore}", file=sys.stderr)
            _avviato = False
            return {}
        threading.Thread(target=server.serve_forever, name="DaProd ponte", daemon=True).start()
        print(f"[DaProd Ponte] pronto su 127.0.0.1:{porta}")
        return {}
