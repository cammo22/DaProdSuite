"""Il ponte fra ComfyUI e lo shell della suite.

ComfyUI non rispetta il patto dei motori (`docs/COME-SI-LAVORA.md` § 3): sa dire
`/system_stats` ma non `GET /health`, e non sa spegnersi da solo. Questo nodo
aggiunge le due rotte che mancano, così il supervisore lo tratta esattamente come
tratterà il motore di Dream o quello di IoDigitale, senza casi speciali.

In più espone quali modelli stanno occupando la VRAM: è l'unica cosa che *deve*
stare qui dentro, perché la sa solo ComfyUI. Il resto di quello che faceva
`library_api.py` in MinimaxMusica (elenco, rinomina, copertine, cancellazione)
non c'è più: quello è lavoro della libreria condivisa della suite.

Non è un nodo nel senso del grafo — non aggiunge nessun blocco all'editor — ma
questo è l'unico modo che ComfyUI offre per far girare del codice proprio dentro
al suo processo.
"""

import logging
import os
import threading

from aiohttp import web

from server import PromptServer

routes = PromptServer.instance.routes


@routes.get("/health")
async def salute(request):
    """Il segnale che lo shell aspetta prima di mostrare la finestra.

    Risponde solo quando ComfyUI ha finito di caricarsi: le rotte partono con il
    server, e il server parte dopo l'importazione dei nodi.
    """
    return web.json_response({"ok": True, "motore": "comfy"}, headers={"Cache-Control": "no-store"})


@routes.post("/shutdown")
async def spegni(request):
    """Spegnimento pulito, richiesto quando l'app si chiude o cede la GPU.

    Si risponde *prima* di morire, altrimenti chi ha chiesto lo spegnimento vede
    una connessione caduta e non sa se è andata bene. L'uscita vera arriva un
    attimo dopo, da un altro thread, quando la risposta è già partita.
    """
    logging.info("[daprod] spegnimento richiesto dalla suite")

    def esci():
        # os._exit e non sys.exit: siamo dentro il loop di aiohttp, e un'uscita
        # ordinata resterebbe appesa ad aspettare le connessioni WebSocket
        # ancora aperte dall'interfaccia.
        os._exit(0)

    threading.Timer(0.25, esci).start()
    return web.json_response({"ok": True})


def _modelli_caricati():
    import comfy.model_management as mm

    for caricato in list(mm.current_loaded_models):
        patcher = caricato.model
        if patcher is None:
            continue
        interno = getattr(patcher, "model", None)
        yield caricato, type(interno if interno is not None else patcher).__name__


@routes.get("/daprod/modelli")
async def modelli(request):
    """Cosa occupa la VRAM adesso: uno per modello, con quanti MB si prende."""
    fuori = []
    for caricato, nome in _modelli_caricati():
        try:
            fuori.append({
                "nome": nome,
                "dispositivo": str(caricato.device),
                "vramMb": round(caricato.model_loaded_memory() / 1048576),
                "totaleMb": round(caricato.model_memory() / 1048576),
            })
        except Exception:
            continue
    return web.json_response(fuori, headers={"Cache-Control": "no-store"})


@routes.post("/daprod/scarica")
async def scarica(request):
    """Toglie dalla VRAM un modello per nome, o tutti.

    Con 8 GB capita di dover fare spazio senza spegnere il motore: il modello
    musicale e quello delle immagini insieme non ci stanno.
    """
    import comfy.model_management as mm

    dati = await request.json()
    if dati.get("tutti"):
        mm.unload_all_models()
        mm.soft_empty_cache(True)
        return web.json_response({"ok": True})

    nome = dati.get("nome")
    for caricato, suo_nome in list(_modelli_caricati()):
        if suo_nome != nome:
            continue
        caricato.model_unload()
        if caricato in mm.current_loaded_models:
            mm.current_loaded_models.remove(caricato)
    mm.soft_empty_cache(True)
    return web.json_response({"ok": True})


# ComfyUI cerca queste due in ogni nodo: senza, si lamenta di un pacchetto rotto.
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
