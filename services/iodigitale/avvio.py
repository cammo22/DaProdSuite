r"""Avvio di DaProdIoDigitale come motore della suite.

Viene da `Desktop\AvatarParlante\LeapTalk`, che era un programma intero: un
`.bat` con un menu, un ambiente Python suo, i modelli in una cartella sua e un
file `.env` da modificare a mano per cambiare voce o modello. Dentro la suite
tutte e quattro quelle cose le fa qualcun altro, quindi qui resta solo il
motore — la stessa strada già fatta per DaProdDream.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_MODELLI` | cartella unica dei pesi, condivisa fra le app |
| `DAPROD_RISULTATI` | dove finiscono i video (cioè in libreria) |
| `DAPROD_TEMPORANEI` | ritratti caricati, audio dei turni, log |
| `DAPROD_INTERFACCIA` | la cartella `apps/iodigitale`, servita su `/static` |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |

**L'interfaccia la serve il motore**, non lo schema `daprod://`: la pagina apre
un WebSocket su `location.host` e chiede i propri file con indirizzi relativi,
esattamente come DaProdDream. Servirla da un'altra origine vorrebbe dire
riscriverla.

**Niente `.env`.** Il file di LeapTalk restava fuori dal repo e conteneva anche
le chiavi del servizio cloud cinese, che qui non si usa mai: le impostazioni
arrivano dall'ambiente, e quelle che decidono la qualità sono scritte qui sotto
con accanto il perché.

**`/health` e `/shutdown` li aggiunge questo file**, perché il patto dei motori
della suite li pretende e il server di LeapTalk non li aveva. Stessa cosa fatta
in `services/comfy/nodi/daprod_ponte`.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))


def _cartella(nome: str, ripiego: Path) -> Path:
    valore = os.environ.get(nome)
    return Path(valore) if valore else ripiego


MODELLI = _cartella("DAPROD_MODELLI", QUI / "models")
TEMPORANEI = _cartella("DAPROD_TEMPORANEI", QUI / "temporanei")


def prepara_ambiente() -> None:
    """Traduce le variabili della suite in quelle che il server già leggeva.

    Si scrive `os.environ` **prima** di importare `web_server`, perché lui legge
    le impostazioni al momento dell'import e non le rilegge mai più.
    """
    fissi = {
        # I pesi stanno nella cartella condivisa: un modello scaricato per
        # questa scheda lo vede anche chi verrà dopo.
        "LEAPTALK_CKPT_DIR": str(MODELLI / "SoulX-FlashHead-1_3B"),
        "LEAPTALK_WAV2VEC_DIR": str(MODELLI / "wav2vec2-base-960h"),
        "LEAPTALK_LORA_DIR": str(MODELLI / "leaptalk"),
        "LEAPTALK_AUDIO_PROJ": str(MODELLI / "leaptalk" / "audio_proj_step_10400.pt"),
        "LOCAL_TTS_VOICE": str(MODELLI / "piper" / "it_IT-paola-medium.onnx"),
        # La trascrizione. Si passa la **cartella** e non il nome "small":
        # faster-whisper accetta tutti e due, ma col nome andrebbe a cercarselo
        # nella cache di HuggingFace, che nella suite non esiste — e se lo
        # riscaricherebbe da solo, 486 MB, in silenzio, al primo turno.
        "LOCAL_STT_MODEL": str(MODELLI / "whisper" / "faster-whisper-small"),
        # **384x384 e non di più.** Misurato sulla RTX 4060 da 8 GB: a 384 sono
        # 25 fotogrammi al secondo e 5,95 GB, a 448 scende a 15 fps e 6,94 GB, a
        # 512 la scheda sfora e tutto il PC si impasta. Vedi il LEGGIMI di
        # LeapTalk, che questa misura l'aveva già fatta.
        "LEAPTALK_HEIGHT": "384",
        "LEAPTALK_WIDTH": "384",
        "LEAPTALK_LITE": "1",
        "LEAPTALK_NUM_INFERENCE_STEPS": "1",
        # Il servizio cloud cinese non si usa: la catena è tutta sul PC.
        "DIALOGUE_BACKEND": "local",
        # Il modello che risponde è quello della suite, cioè LM Studio. Quale,
        # lo decide chi apre l'app dal selettore comune: qui c'è solo dove
        # bussare.
        "LOCAL_LLM_BASE_URL": "http://127.0.0.1:1234/v1",
        # Una o due frasi: ogni secondo di parlato costa secondi di video.
        "LOCAL_LLM_MAX_TOKENS": "220",
        "LOCAL_LLM_NO_THINK": "1",
        "LOCAL_STT_LANGUAGE": "it",
    }
    for chiave, valore in fissi.items():
        os.environ.setdefault(chiave, valore)

    # La porta la dichiara il catalogo, come per tutti gli altri motori.
    porta = os.environ.get("DAPROD_PORTA")
    if porta:
        os.environ.setdefault("LEAPTALK_WEB_PORT", porta)
    # Solo da questo computer: la suite è l'unica che ci parla.
    os.environ.setdefault("LEAPTALK_WEB_HOST", "127.0.0.1")

    TEMPORANEI.mkdir(parents=True, exist_ok=True)


def main() -> int:
    prepara_ambiente()

    import logging

    from fastapi import Response

    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(name)-20s  %(message)s",
        datefmt="%H:%M:%S",
    )
    log = logging.getLogger("iodigitale")

    # L'import va dopo `prepara_ambiente`: il server legge le impostazioni una
    # volta sola, al momento dell'import.
    from web_server import app, settings

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    @app.post("/shutdown")
    def shutdown() -> Response:
        """Lo spegnimento chiesto dal supervisore della suite.

        Si risponde **prima** di morire: chiudere il processo dentro il
        gestore lascerebbe il supervisore ad aspettare una risposta che non
        arriva mai, e dopo il suo timeout lo ammazzerebbe comunque — solo
        trenta secondi più tardi.
        """
        import threading

        threading.Timer(0.3, lambda: os._exit(0)).start()
        return Response(status_code=204)

    log.info("Modelli da %s", MODELLI)
    log.info("DaProdIoDigitale in ascolto su http://%s:%s", settings.host, settings.port)
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="warning", access_log=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
