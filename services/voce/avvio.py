"""Avvio di DaProdVoce come motore della suite.

**La prima cosa che fa questo file non è avviare niente**: mette in `sys.path` le
librerie private di questo motore, se ci sono. È l'unico posto della suite in
cui succede, e va spiegato.

Il modello Audio8 TTS si porta dentro il proprio codice, che transformers esegue
(`trust_remote_code`), e quel codice è scritto per **transformers 4.57**.
L'ambiente condiviso ha la **5.15**, che è la versione con cui girano gli altri
cinque motori. Sul modello Audio8 la 5 non dà un errore: dà una voce che non
smette più di parlare — provato il 21 agosto 2026, con le due versioni una
accanto all'altra. Il racconto per esteso sta in
`services/voce/requisiti-privati.txt`.

Quindi la 4.57 sta in una cartella a parte, che lo shell installa e passa qui
come `DAPROD_LIBRERIE_PRIVATE`. Mettendola davanti a `sys.path` vince lei, ma
**solo dentro a questo processo**: gli altri motori non sanno nemmeno che esista.
Torch, soundfile, fastapi e tutto il resto continuano ad arrivare dall'ambiente
condiviso, che resta uno solo — è il motivo per cui la suite sta in 4 GB invece
che in 14,7.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_MODELLI` | cartella unica dei pesi, condivisa fra le app |
| `DAPROD_RISULTATI` | dove finiscono le voci generate (le vede la libreria) |
| `DAPROD_TEMPORANEI` | i log |
| `DAPROD_LIBRERIE_PRIVATE` | le librerie riservate a questo motore |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))


def _librerie_private() -> str | None:
    """Le librerie riservate a questo motore, davanti a tutte le altre."""
    percorso = os.environ.get("DAPROD_LIBRERIE_PRIVATE")
    if not percorso or not Path(percorso).is_dir():
        return None
    # In testa, prima ancora della cartella del servizio: qui dentro c'è la
    # versione di transformers che questo modello pretende, e deve vincere.
    sys.path.insert(0, percorso)
    return percorso


PRIVATE = _librerie_private()

from app.config import HOST, PORT, setup_logging  # noqa: E402


def main() -> int:
    log = setup_logging(False)

    if PRIVATE:
        log.info("Librerie riservate a questo motore: %s", PRIVATE)
    else:
        log.warning(
            "Nessuna cartella di librerie private (DAPROD_LIBRERIE_PRIVATE). "
            "Se transformers e' la 5, il modello parlera' senza fermarsi mai: "
            "reinstalla DaProdVoce dall'hub."
        )

    import transformers

    log.info("transformers %s", transformers.__version__)
    if not transformers.__version__.startswith("4.57"):
        log.warning(
            "Questo modello vuole transformers 4.57: con la %s la voce non si "
            "ferma piu'. Vedi services/voce/requisiti-privati.txt.",
            transformers.__version__,
        )

    import uvicorn

    from app.api import create_app
    from app.motore import motore

    # **Il modello non si carica adesso.** Sono uno o due GB di scheda video
    # occupati da qualcosa che forse nessuno userà in questa sessione: entra in
    # memoria alla prima frase e se ne va da solo dopo cinque minuti di silenzio.
    log.info(
        "DaProdVoce in ascolto su http://%s:%s (scheda video: %s)",
        HOST, PORT, "sì" if motore.gpu else "no, si va di CPU",
    )
    try:
        uvicorn.run(create_app(), host=HOST, port=PORT, log_level="warning", access_log=False)
    finally:
        motore.spegni()
        log.info("Chiuso.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
