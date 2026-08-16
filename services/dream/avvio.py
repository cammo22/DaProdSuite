"""Avvio di DaProdDream come motore della suite.

Il progetto di partenza era un programma intero: si apriva da sé una finestra di
Chrome, si sorvegliava da solo con un watchdog e spegneva il motore quando non
vedeva più nessuno collegato. Dentro la suite tutte e tre quelle cose le fa
qualcun altro — la finestra è di Electron, l'accensione e lo spegnimento sono
del [supervisore](../../apps/shell/src/main/process-supervisor.ts) — quindi qui
resta solo il motore.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_MODELLI` | cartella unica dei pesi, condivisa fra le app |
| `DAPROD_RISULTATI` | dove salvare schermate e registrazioni (finiscono in libreria) |
| `DAPROD_TEMPORANEI` | log e impostazioni: roba rigenerabile |
| `DAPROD_INTERFACCIA` | la cartella `apps/dream`, che il motore serve su `/` |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |

**L'interfaccia la serve il motore**, non lo schema `daprod://` come per Musica
e Foto: la pagina di Dream chiama il proprio server con indirizzi relativi e
apre un WebSocket su `location.host`. Servirla da un'altra origine vorrebbe dire
riscriverla; servirla da qui non costa niente ed è quello che già faceva.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from app.config import HOST, PORT, DIFFUSERS_DIR, setup_logging  # noqa: E402

# Il modello che la suite scarica, come cartella sul disco: `manifest/models.json`
# lo mette in `models/diffusers/sd-turbo`. Passare il percorso invece del nome
# del repo evita che diffusers vada a cercarlo nella cache di HuggingFace, che
# nella suite non esiste — e soprattutto evita che se lo riscarichi da solo.
MODELLO_LOCALE = DIFFUSERS_DIR / "sd-turbo"


def main() -> int:
    log = setup_logging(False)

    import uvicorn

    from app.api import create_app
    from app.engine import DreamEngine

    engine = DreamEngine("diffusers")
    if MODELLO_LOCALE.exists():
        engine.params.model = str(MODELLO_LOCALE)
        log.info("Modello dalla cartella della suite: %s", MODELLO_LOCALE)
    else:
        log.warning(
            "SD-Turbo non è in %s: lo cerco su HuggingFace. "
            "Installa DaProdDream dall'hub perché la suite se lo scarichi da sé.",
            MODELLO_LOCALE,
        )

    app = create_app(engine)

    # Il modello si carica subito: quando l'utente sceglie la sorgente è già
    # pronto, e la prima visione arriva senza attese. Se la GPU non c'è si lascia
    # perdere — il motore parte lo stesso e lo dice l'interfaccia.
    if engine.gpu.get("cuda"):
        log.info("Precarico il modello…")
        try:
            engine.load_model()
        except Exception as exc:  # il motore deve rispondere a /health comunque
            log.error("Il modello non si è caricato: %s", exc)

    log.info("DaProdDream in ascolto su http://%s:%s", HOST, PORT)
    try:
        uvicorn.run(app, host=HOST, port=PORT, log_level="warning", access_log=False)
    finally:
        engine.shutdown()
        log.info("Chiuso.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
