r"""Avvio di DaProdCompanion come motore della suite.

Viene da `Desktop\DaProdCompanion`, che era un programma intero: un workspace
`uv` con quattro pacchetti Python, un ambiente suo, un `.env` da compilare a
mano, Ollama a parte, e tre servizi — `brain`, `stt`, `tts` — accesi da un
Electron tutto suo. Dentro la suite quasi tutte quelle cose le fa qualcun
altro, quindi qui resta il **cervello**: la conversazione, la memoria e i sogni.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_TEMPORANEI` | dove vive `memoria.db`, cioè quello che si ricorda |
| `DAPROD_RISULTATI` | dove finiscono i sogni scritti (la libreria) |
| `DAPROD_MODELLI` | la cartella dei pesi, condivisa con le altre app |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |

**Cosa è rimasto fuori, e perché.**

- **`tts_service`** (voce Kokoro) e **`stt_service`** (ascolto Whisper) erano
  due processi Python a parte, con i loro modelli e i loro GB. La suite ha già
  Piper e faster-whisper per DaProd IoDigitale: rifarli qui vorrebbe dire
  scaricarli due volte. Il codice che li chiamava è rimasto dov'era, con `None`
  al posto del client — degrada da sé, e quando la voce arriverà si accenderà
  senza riscrivere niente.
- **Ollama**: risponde LM Studio, che è il modello che scrive di tutta la
  suite. Quale modello lo sceglie chi apre l'app dal selettore comune.

**Niente `.env`, e niente domande da terminale.** Il progetto d'origine, la
prima volta, chiedeva il nome del companion con un `input()`. Qui il motore lo
avvia il supervisore come processo figlio, senza console: un `input()` sarebbe
un processo fermo per sempre su una domanda che nessuno vede.

`/health` e `/shutdown` ci sono già dentro `brain_service` — quel progetto
aveva lo stesso patto con il suo Electron, ed è il motivo per cui il
supervisore della suite viene proprio da lì.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
# I due pacchetti stanno qui accanto e non sono installati nell'ambiente: la
# suite ha un venv solo per sei motori, e installarci dentro dei pacchetti
# nostri vorrebbe dire un'altra cosa che può rompersi. Sul percorso e via.
sys.path.insert(0, str(QUI))


def prepara_ambiente() -> None:
    """Traduce le variabili della suite in quelle che il Companion già leggeva."""
    fissi = {
        # Il modello che scrive è quello della suite. Qui c'è solo dove bussare:
        # quale modello risponde lo decide il selettore comune, e cambiarlo non
        # deve voler dire riavviare questo motore.
        "LLM_BASE_URL": "http://127.0.0.1:1234/v1",
        # Il consolidamento notturno. Alle 4 perché è l'ora in cui la GPU è
        # libera di sicuro: il modello che scrive e i motori che generano non
        # vanno d'accordo sulla stessa macchina — misurato, e sta scritto in
        # RIPRENDERE-DA-QUI.md.
        "DREAMING_INTERVAL_CRON": "0 4 * * *",
    }
    for chiave, valore in fissi.items():
        os.environ.setdefault(chiave, valore)


def main() -> int:
    prepara_ambiente()

    import asyncio
    import logging

    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(name)-20s  %(message)s",
        datefmt="%H:%M:%S",
    )
    log = logging.getLogger("companion")

    from companion_shared.config import load_settings

    impostazioni = load_settings()

    # L'import va dopo `prepara_ambiente`: la lifespan legge le impostazioni
    # all'avvio, e da lì apre il database e si collega a LM Studio.
    from brain_service.api.http import app

    # La pagina del Companion è servita dalla suite come `daprod://companion`,
    # quindi ogni sua richiesta qui è di un'altra origine e senza questo il
    # browser la ferma prima ancora di mandarla. È la stessa ragione per cui
    # ComfyUI parte con `--enable-cors-header *`: il server ascolta solo su
    # 127.0.0.1, e l'unica cosa che può parlarci è la suite stessa.
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_methods=["*"],
        allow_headers=["*"],
        # Niente cookie e niente credenziali: non c'è nessuna sessione da
        # rubare, e con `allow_credentials` un'origine qualunque non deve
        # comunque poter fare richieste autenticate.
        allow_credentials=False,
    )

    configurazione = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=impostazioni.brain_http_port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(configurazione)
    # Letto da `/shutdown`: su Windows i segnali POSIX non funzionano allo
    # stesso modo, e questo è il modo che regge sempre.
    app.state.uvicorn_server = server

    log.info("Memoria in %s", impostazioni.resolved_db_path())
    log.info("DaProdCompanion in ascolto su http://127.0.0.1:%s", impostazioni.brain_http_port)
    asyncio.run(server.serve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
