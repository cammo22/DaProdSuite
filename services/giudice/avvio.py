"""Avvio del giudice: Jev-Omni come motore della suite (1.4.0).

Detto il 24 settembre 2026: «vediamo di inserirci questo come classificatore
dei contenuti o simili: akhilaaa3/Jev-Omni».

**Cos'e' Jev-Omni.** Un classificatore di decisioni: Gemma 4 12B con una testa
di classificazione, addestrato su trentamila domande. Gli si da' uno stato (un
testo, e se serve un'immagine, un audio o un video), una domanda e un elenco di
risposte possibili, e lui **non scrive niente**: da' una probabilita' a ogni
risposta. Licenza Apache-2.0.

**A cosa serve qui.** Alla sala giochi, per prima cosa: chi comanda, davanti a
una combinazione che ha gia' fatto generare, chiede al giudice che grado
merita e se e' slop. Il giudice non decide — decide sempre una persona (§ 10 di
`packages/giochi/CONCETTI.md`) — ma da' un parere col suo numero accanto.

**Quanto pesa, detto chiaro.** I pesi ufficiali sono in FP32: circa 50 GB da
scaricare. Su una scheda da 8 GB si caricano solo in 4 bit (bitsandbytes), e
anche cosi' la parte che vede e sente sta stretta. E' per questo che il giudice
e' un motore **in piu'**: non parte con niente, si accende la prima volta che
qualcuno gli chiede un parere, e si spegne con la suite.

⚠ **Il caricatore e' quello del modello**, `jev_omni.py`, che sta dentro la sua
repo accanto ai pesi. La forma della chiamata (`load_jev_omni()` e
`predict(state=, question=, options=, media=, modality=)`) viene dalla scheda
del modello; la macchina da cui e' stato scritto questo file HuggingFace non lo
raggiungeva, quindi `motore.py` prova le due varianti ragionevoli e, se nessuna
va, lo dice nel log con l'errore vero.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_MODELLI` | cartella unica dei pesi: il modello sta in `jev-omni/` |
| `DAPROD_TEMPORANEI` | i log |
| `DAPROD_PORTA` | porta dichiarata nel catalogo (8790) |
"""

from __future__ import annotations

import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from app.config import HOST, PORT, setup_logging  # noqa: E402


def main() -> int:
    log = setup_logging(False)
    import uvicorn

    from app.api import create_app

    log.info("Il giudice e' in ascolto su http://%s:%s (il modello si carica alla prima domanda)", HOST, PORT)
    uvicorn.run(create_app(), host=HOST, port=PORT, log_level="warning", access_log=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
