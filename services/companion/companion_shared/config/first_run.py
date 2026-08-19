"""
Il nome del Companion, quando non ce n'è ancora uno.

**Cosa faceva prima.** Nel progetto d'origine questo file, se non trovava
`BOT_NAME` nel `.env`, lo chiedeva **da terminale** con un `input()` e lo
scriveva lì dentro. Dentro la suite non può: il motore lo avvia il supervisore
come processo figlio, senza console, e un `input()` lì significa un processo
fermo per sempre su una domanda che nessuno vedrà mai — cioè un'app che non si
apre e un log che non dice niente.

Adesso il nome è una preferenza come le altre: c'è un ripiego che si legge
(«Compagno»), e chi vuole cambiarlo lo fa dalla pagina. Questa funzione resta
perché la chiamano in due punti, e perché il contratto — *dopo di me le
impostazioni hanno un nome* — è ancora vero.
"""

from __future__ import annotations

from .settings import Settings, load_settings


def ensure_bot_name(settings: Settings | None = None) -> Settings:
    """Le impostazioni, con la garanzia che un nome c'è. Non chiede niente."""
    return settings or load_settings()
