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

import asyncio
import logging
import os
import threading
import time
from pathlib import Path

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
    """Cosa occupa la memoria adesso: uno per modello, con quanti MB si prende.

    Non solo la VRAM. Il traduttore sta nella RAM e non lo carica ComfyUI, quindi
    da qui non si vedeva: in cima all'app comparivano tutti i modelli tranne
    quello che stava facendo aspettare. Adesso c'è anche lui, con `vramMb` a zero
    e i suoi MB veri in `totaleMb` — chi disegna la riga guarda `dispositivo`.
    """
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

    if _traduttore is not None or _stato_trad["fase"] == "carico":
        fuori.append({
            "nome": TRADUTTORE,
            "dispositivo": "cpu",
            "vramMb": 0,
            "totaleMb": TRADUTTORE_MB,
            "stato": _stato_trad["fase"] if _stato_trad["fase"] == "carico" else "pronto",
        })

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

    # Il traduttore non lo conosce `model_management`: è roba nostra, in RAM, e
    # si spegne mettendolo giù. Dopo, la prima traduzione se lo ricarica.
    if nome == TRADUTTORE:
        _scarica_traduttore()
        return web.json_response({"ok": True})

    for caricato, suo_nome in list(_modelli_caricati()):
        if suo_nome != nome:
            continue
        caricato.model_unload()
        if caricato in mm.current_loaded_models:
            mm.current_loaded_models.remove(caricato)
    mm.soft_empty_cache(True)
    return web.json_response({"ok": True})


"""Traduzione italiano → inglese.

I modelli di immagini capiscono l'inglese: una descrizione in italiano dà
un'immagine che non c'entra niente con quello che hai chiesto, e senza dire che
non ha capito. Qui si traduce prima di generare, così si può scrivere in
italiano.

**Non è un LLM, e non passa da LM Studio.** È Marian (`opus-mt-it-en`), 74
milioni di parametri e 330 MB: un modello che sa fare una cosa sola. Gira dentro
al motore, sul computer, e non chiede niente a nessuno — né a internet né al
modello che scrive le descrizioni. Sta qui per la stessa ragione dell'elenco
della memoria: c'è già un Python con torch acceso, e un servizio a parte
vorrebbe dire un secondo processo, una seconda porta e un secondo avvio da
aspettare.

**In CPU, non in GPU.** In VRAM quei 330 MB toglierebbero spazio al modello che
deve fare il lavoro vero, e su una scheda da 8 GB quello spazio è esattamente
ciò che manca. In CPU la traduzione di una frase dura un secondo o due.

**Perché prima restava piantato su «traduco…».** Il modello si caricava *dentro
il loop di aiohttp*, e la prima volta non è questione di un attimo: misurati
quindici secondi buoni fra lo svegliare le librerie e il leggere i 330 MB dal
disco. Per tutto quel tempo il motore non rispondeva più a niente — né alla
traduzione, né a `/health`, né all'interfaccia. E due Genera premuti a distanza di poco mandavano due traduzioni
insieme sullo stesso modello. Adesso il caricamento sta in un thread a parte, ne
passa una alla volta, e a ogni istante c'è una risposta pronta a
`/daprod/traduttore` che dice a che punto è: è quella che disegna la barra
nell'app, invece di tre puntini fermi.
"""

# Il nome con cui il traduttore compare fra i modelli in memoria, ed è anche la
# chiave per scaricarlo.
TRADUTTORE = "Traduttore"
TRADUTTORE_MB = 330

_traduttore = None
_traduttore_rotto = None

# Una traduzione alla volta: il modello è uno, e due richieste insieme lo
# facevano lavorare il doppio per rispondere più tardi a tutte e due.
_turno = threading.Lock()

# A che punto è, adesso. Lo scrive il thread che traduce e lo legge la rotta che
# l'app interroga mentre aspetta: un dizionario, senza lucchetti, perché ogni
# campo lo scrive uno solo e leggerne uno vecchio di mezzo secondo non fa danno.
_stato_trad = {"fase": "fermo", "fatti": 0, "attesi": 0, "da": 0.0}

# Il criterio che conta i token, costruito alla prima traduzione. `None` vuol
# dire "non ci ho ancora provato", `[]` "questa versione non lo prende".
_criterio = None


def _stato_pulito():
    _stato_trad.update({"fase": "fermo", "fatti": 0, "attesi": 0, "da": 0.0})


def _carica_traduttore():
    """Carica il modello alla prima richiesta, non all'avvio del motore.

    Chi genera solo in inglese non deve aspettare 330 MB che non userà mai, e
    chi non ha scaricato il traduttore deve poter usare l'app lo stesso.

    **Gira in un thread**, mai nel loop di aiohttp: vedi la nota qui sopra.
    """
    global _traduttore, _traduttore_rotto
    if _traduttore is not None or _traduttore_rotto is not None:
        return

    cartella = Path(os.environ.get("DAPROD_MODELLI", "")) / "traduttore" / "opus-mt-it-en"
    if not (cartella / "config.json").exists():
        _traduttore_rotto = (
            "Il traduttore non è installato. Scaricalo dall'hub, oppure scrivi in inglese."
        )
        return

    _stato_trad.update({"fase": "carico", "fatti": 0, "attesi": 0, "da": time.time()})
    try:
        from transformers import MarianMTModel, MarianTokenizer

        tokenizer = MarianTokenizer.from_pretrained(str(cartella))
        modello = MarianMTModel.from_pretrained(str(cartella))
        modello.eval()
        _traduttore = (tokenizer, modello)
        logging.info("[daprod] traduttore italiano→inglese pronto")
    except Exception as exc:  # noqa: BLE001 — qualunque cosa vada storta, l'app deve restare in piedi
        _traduttore_rotto = f"Il traduttore non si è caricato: {exc}"
        logging.exception("[daprod] traduttore non caricato")
    finally:
        _stato_pulito()


def _scarica_traduttore():
    """Lo mette giù e libera i suoi MB. La prossima traduzione se lo ricarica."""
    global _traduttore, _traduttore_rotto
    with _turno:
        _traduttore = None
        # Anche il motivo del guasto: se il traduttore era "rotto" perché
        # mancava e nel frattempo l'hai scaricato dall'hub, deve poter riprovare.
        _traduttore_rotto = None
        _stato_pulito()

    import gc

    gc.collect()


@routes.get("/daprod/traduttore")
async def stato_traduttore(request):
    """A che punto è la traduzione, adesso.

    La chiede l'app mentre aspetta, ed è tutto quello che serve a disegnare una
    barra che si muove. Deve costare niente: legge un dizionario, non tocca il
    modello.
    """
    fase = _stato_trad["fase"]
    attesi = _stato_trad["attesi"]
    fatti = _stato_trad["fatti"]

    if fase == "traduco" and attesi > 0:
        # Mai al 100% prima di aver finito davvero: una barra piena con sotto
        # scritto "traduco" è peggio di una barra a tre quarti.
        quota = min(0.97, fatti / attesi)
    elif fase == "carico":
        # Non si sa quanto manca a leggere 330 MB: la barra lo dice muovendosi
        # senza fondo, invece di inventarsi una percentuale.
        quota = None
    else:
        quota = 0.0

    return web.json_response(
        {
            "fase": fase,
            "quota": quota,
            "fatti": fatti,
            "attesi": attesi,
            "secondi": round(time.time() - _stato_trad["da"], 1) if _stato_trad["da"] else 0,
            "pronto": _traduttore is not None,
            "motivo": _traduttore_rotto,
            "mb": TRADUTTORE_MB,
        },
        headers={"Cache-Control": "no-store"},
    )


def _conta_token():
    """L'argomento che fa muovere la barra, se questa versione lo accetta.

    Il conteggio dei token generati arriva da un `StoppingCriteria` che non ferma
    mai niente: viene chiamato a ogni passo e scrive quanti ne sono usciti. È
    l'unico modo di sapere a che punto è una `generate`, ma è anche un pezzo di
    `transformers` che negli anni ha cambiato firma più volte — e una barra non
    vale una traduzione che smette di funzionare. Se qualcosa non torna si torna
    a mani vuote: la traduzione parte lo stesso, e la barra si muove senza
    sapere quanto manca.
    """
    global _criterio
    if _criterio is None:
        try:
            from transformers import StoppingCriteria

            class Conta(StoppingCriteria):
                def __call__(self, input_ids, punteggi=None, **_):
                    # Con due fasci le righe sono due ma lunghe uguale, e la
                    # lunghezza è quello che ci serve.
                    _stato_trad["fatti"] = max(0, int(input_ids.shape[-1]))
                    return False

            _criterio = [Conta()]
        except Exception:  # noqa: BLE001
            logging.warning("[daprod] traduzione senza conteggio dei token")
            _criterio = []

    return {"stopping_criteria": _criterio} if _criterio else {}


@routes.post("/daprod/traduci")
async def traduci(request):
    """Da italiano a inglese. Torna sempre qualcosa di usabile.

    Se il traduttore manca o si rompe, si risponde con il testo originale e il
    motivo: meglio un'immagine generata da un prompt italiano che un errore che
    blocca il lavoro.
    """
    dati = await request.json()
    testo = (dati.get("testo") or "").strip()
    if not testo:
        return web.json_response({"tradotto": "", "originale": "", "tradotta": False})

    def lavora():
        # Il turno comprende il caricamento: chi arriva secondo aspetta che il
        # primo abbia finito di tirare su il modello, invece di caricarlo due
        # volte in parallelo.
        with _turno:
            _carica_traduttore()
            if _traduttore is None:
                return None

            import torch

            tokenizer, modello = _traduttore
            # Le descrizioni possono essere lunghe: 512 token sono circa 2000
            # caratteri, ben oltre quello che un prompt di immagine usa davvero.
            ingresso = tokenizer([testo], return_tensors="pt", truncation=True, max_length=512)
            quanti = int(ingresso["input_ids"].shape[-1])

            # Quanto verrà fuori, all'incirca: l'inglese è più corto
            # dell'italiano, ma serve un margine perché la barra non finisca il
            # suo corso a metà lavoro. È una stima, e come stima viene raccontata.
            _stato_trad.update({
                "fase": "traduco",
                "fatti": 0,
                "attesi": max(12, int(quanti * 1.15) + 6),
                "da": time.time(),
            })

            try:
                with torch.no_grad():
                    uscita = modello.generate(
                        **ingresso,
                        # Un tetto legato all'ingresso invece dei 512 fissi: su una
                        # frase corta non c'è motivo di lasciargli spazio per
                        # duemila caratteri di divagazione.
                        max_new_tokens=min(512, quanti * 2 + 32),
                        num_beams=2,
                        **_conta_token(),
                    )
                return tokenizer.decode(uscita[0], skip_special_tokens=True)
            finally:
                _stato_pulito()

    # Fuori dal loop di aiohttp: mentre carica e mentre traduce, il motore deve
    # continuare a rispondere a /health, all'interfaccia, e a chi chiede a che
    # punto è la traduzione.
    tradotto = await asyncio.get_running_loop().run_in_executor(None, lavora)

    if tradotto is None:
        return web.json_response(
            {"tradotto": testo, "originale": testo, "tradotta": False, "motivo": _traduttore_rotto},
            headers={"Cache-Control": "no-store"},
        )

    return web.json_response(
        {"tradotto": tradotto, "originale": testo, "tradotta": True},
        headers={"Cache-Control": "no-store"},
    )


# ComfyUI cerca queste due in ogni nodo: senza, si lamenta di un pacchetto rotto.
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
