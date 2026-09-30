"""
Il ponte alla prova, senza WanGP.

    python services/wangp/prove/prova_ponte.py

Il plugin `daprod_ponte` si carica dentro WanGP, ma la sua logica — la
porticina, il token, i lavori, la coda che si fa partire — non ha bisogno di
WanGP per essere provata: qui si mettono al suo posto due controfigure (la
classe base dei plugin e la sessione con la coda) e si guarda cosa fa il
plugin quando gli si parla come farà la suite.

⚠ **Non prova che WanGP lo carichi**: quello si è provato una volta a mano,
contro un WanGP vero (13.14), e si rifà quando WanGP cambia versione. Questa
prova tiene ferma la parte nostra, e torna 0 solo se passa tutto.
"""

import json
import os
import socket
import sys
import threading
import time
import types
import urllib.error
import urllib.request
from types import SimpleNamespace

# Le frasi sono in italiano: su Windows la console non e' sempre UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(QUI, ".."))


def porta_libera() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# ---------------------------------------------------------------- controfigure

class ClasseBase:
    """Quello che il plugin prende da WanGP: `WAN2GPPlugin`."""

    def __init__(self):
        self.tabs = {}
        self._component_requests = []

    def request_component(self, nome):
        self._component_requests.append(nome)


class Servizio:
    """Lo stato condiviso di WanGP: ha `service`, e ricorda i comandi che riceve."""

    generation_running = False

    def __init__(self):
        self.comandi = []

    def command(self, nome, dati=None):
        self.comandi.append((nome, dati))


class Stato(dict):
    def __init__(self):
        super().__init__()
        self.service = Servizio()


class Lavoro:
    """Un lavoro finto: si comporta come `SessionJob`."""

    def __init__(self, esito, richiami):
        self._esito = esito
        self._richiami = richiami
        self.done = False
        self.cancel_requested = False
        self.webui_load_queue_token = "gettone"
        self._fermo = threading.Event()

    def wait_for_webui_submission_or_completion(self, timeout=None):
        return True

    def cancel(self):
        self.cancel_requested = True
        self._fermo.set()

    def result(self, timeout=None):
        self._richiami.on_status("Loading model")
        self._richiami.on_progress(SimpleNamespace(progress=40, status="Denoising"))
        if self._esito == "lento":
            self._fermo.wait(timeout=10)
            self.done = True
            return SimpleNamespace(success=False, generated_files=[], errors=[], cancelled=True)
        time.sleep(0.2)
        self.done = True
        if self._esito == "errore":
            return SimpleNamespace(success=False, generated_files=[], errors=["memoria finita"], cancelled=False)
        return SimpleNamespace(success=True, generated_files=["C:/out/uno.wav"], errors=[], cancelled=False)


class Sessione:
    ultime = []

    def __init__(self, webui_state=None, console_output=True, console_isatty=True):
        self.stato = webui_state
        self._gradio_webui_context = None
        Sessione.ultime.append(self)

    def submit_task(self, settings, callbacks=None):
        self.settings = settings
        return Lavoro(settings.get("_esito", "ok"), callbacks)

    def list_model_metadata(self, main_output=None, include_availability=False):
        return [{"model_type": "ace_step_v1_5_xl", "name": "ACE-Step XL", "main_output": ["audio"], "family_label": "Music", "availability": {"status": "available"}}]


def installa_le_controfigure():
    shared = types.ModuleType("shared")
    utils = types.ModuleType("shared.utils")
    plugins = types.ModuleType("shared.utils.plugins")
    plugins.WAN2GPPlugin = ClasseBase
    api = types.ModuleType("shared.api")
    api.WanGPSession = Sessione
    sys.modules.update({"shared": shared, "shared.utils": utils, "shared.utils.plugins": plugins, "shared.api": api})


# ------------------------------------------------------------------- la prova

falliti = 0


def dice(nome, condizione, extra=""):
    global falliti
    if condizione:
        print(f"  ok   {nome}")
    else:
        falliti += 1
        print(f"  NO   {nome} {extra}")


def chiama(porta, metodo, percorso, corpo=None, token="segreto"):
    richiesta = urllib.request.Request(
        f"http://127.0.0.1:{porta}{percorso}",
        method=metodo,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={**({"X-DaProd-Token": token} if token else {}), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(richiesta, timeout=10) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def aspetta(porta, id_lavoro, stati, secondi=10):
    fine = time.time() + secondi
    while time.time() < fine:
        codice, dati = chiama(porta, "GET", f"/lavori/{id_lavoro}")
        if dati.get("stato") in stati:
            return dati
        time.sleep(0.1)
    return dati


def main() -> int:
    installa_le_controfigure()
    porta = porta_libera()
    os.environ["DAPROD_PONTE_PORTA"] = str(porta)
    os.environ["DAPROD_PONTE_TOKEN"] = "segreto"

    from daprod_ponte import plugin as ponte

    print("\n— il ponte si accende solo se la suite glielo chiede —")
    senza = ponte.DaProdPontePlugin()
    senza.state = SimpleNamespace(value=Stato())
    for nome in ("DAPROD_PONTE_PORTA", "DAPROD_PONTE_TOKEN"):
        valore = os.environ.pop(nome)
        senza.post_ui_setup({})
        dice(f"senza {nome} resta spento", not ponte._avviato)
        os.environ[nome] = valore

    print("\n— acceso —")
    p = ponte.DaProdPontePlugin()
    stato = Stato()
    p.state = SimpleNamespace(value=stato)
    p.setup_ui()
    dice("chiede a WanGP lo stato condiviso", p._component_requests == ["state"])
    p.post_ui_setup({})
    dice("si accende", ponte._avviato)
    time.sleep(0.3)

    print("\n— il token —")
    codice, _ = chiama(porta, "GET", "/stato", token=None)
    dice("senza token: 401", codice == 401, f"→ {codice}")
    codice, _ = chiama(porta, "GET", "/stato", token="sbagliato")
    dice("col token sbagliato: 401", codice == 401, f"→ {codice}")
    codice, dati = chiama(porta, "GET", "/stato")
    dice("col token giusto risponde", codice == 200 and dati["pronto"] is True, f"→ {codice} {dati}")
    dice("dice se WanGP sta generando", dati["generazione"] is False)
    codice, _ = chiama(porta, "POST", "/lavori", {"settings": {"model_type": "x"}}, token="sbagliato")
    dice("neanche un lavoro si manda senza token", codice == 401)

    print("\n— WanGP non è pronto —")
    p.state = SimpleNamespace(value={})  # un dizionario qualunque: senza servizio
    codice, dati = chiama(porta, "GET", "/stato")
    dice("lo stato dice che non è pronto", codice == 200 and dati["pronto"] is False, f"→ {dati}")
    codice, dati = chiama(porta, "POST", "/lavori", {"settings": {"model_type": "ace_step_v1_5_xl"}})
    dice("un lavoro viene rifiutato subito, con un motivo", codice == 503 and "servizio" in dati["errore"].lower(), f"→ {codice} {dati}")
    p.state = SimpleNamespace(value=stato)

    print("\n— un lavoro —")
    codice, dati = chiama(porta, "POST", "/lavori", {"settings": {}})
    dice("senza modello si rifiuta", codice == 400)
    codice, dati = chiama(porta, "POST", "/lavori", {"settings": {"model_type": "ace_step_v1_5_xl", "prompt": "ciao"}})
    dice("un lavoro buono parte (202)", codice == 202 and dati["id"].startswith("l-"), f"→ {codice} {dati}")
    id_lavoro = dati["id"]
    finito = aspetta(porta, id_lavoro, {"finito", "errore", "annullato"})
    dice("finisce, coi suoi file", finito["stato"] == "finito" and finito["files"] == ["C:/out/uno.wav"], f"→ {finito}")
    dice("il progresso arriva al massimo", finito["progresso"] == 1.0)
    dice("la coda di WanGP è stata fatta partire", any(c[0] == "load_queue_trigger" for c in stato.service.comandi), f"→ {stato.service.comandi}")
    dice("la sessione ha detto di non far partire la coda da sola", Sessione.ultime[-1]._gradio_webui_context == {"defer_load_queue_trigger": True})
    codice, _ = chiama(porta, "GET", "/lavori/l-non-esiste")
    dice("un lavoro che non c'è: 404", codice == 404)

    print("\n— quando WanGP sbaglia —")
    codice, dati = chiama(porta, "POST", "/lavori", {"settings": {"model_type": "m", "_esito": "errore"}})
    finito = aspetta(porta, dati["id"], {"finito", "errore", "annullato"})
    dice("l'errore di WanGP arriva com'è", finito["stato"] == "errore" and "memoria finita" in finito["errore"], f"→ {finito}")

    print("\n— annullare —")
    codice, dati = chiama(porta, "POST", "/lavori", {"settings": {"model_type": "m", "_esito": "lento"}})
    time.sleep(0.5)
    codice, _ = chiama(porta, "POST", f"/lavori/{dati['id']}/annulla", {})
    dice("si annulla", codice == 200)
    finito = aspetta(porta, dati["id"], {"finito", "errore", "annullato"})
    dice("e risulta annullato", finito["stato"] == "annullato", f"→ {finito}")

    print("\n— i modelli —")
    codice, dati = chiama(porta, "GET", "/modelli")
    dice("elenca i modelli con la disponibilità", codice == 200 and dati["modelli"][0]["disponibile"] == "available", f"→ {dati}")

    print(f"\n{'Tutto a posto.' if falliti == 0 else str(falliti) + ' prove fallite.'}\n")
    return 0 if falliti == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
