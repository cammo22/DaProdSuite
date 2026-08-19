r"""
Configurazione del Companion dentro la suite.

**Cosa è cambiato rispetto al progetto d'origine.** In `Desktop\DaProdCompanion`
questo file leggeva un `.env` nella radice del repo e, se non trovava
`BOT_NAME`, lo chiedeva da terminale. Nella suite nessuna delle due cose può
succedere: il motore lo avvia il supervisore come processo figlio, senza un
terminale a cui chiedere niente, e le cartelle non se le sceglie l'app — gliele
passa la shell, uguali per tutte.

| Variabile della suite | Cosa dice |
|---|---|
| `DAPROD_MODELLI` | cartella unica dei pesi, condivisa fra le app |
| `DAPROD_RISULTATI` | dove finisce quello che produce (i sogni scritti) |
| `DAPROD_TEMPORANEI` | il database della memoria, i log, l'audio dei turni |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |

**Niente Ollama.** La decisione della suite è LM Studio, che parla l'API di
OpenAI su `127.0.0.1:1234`. Quale modello risponda non lo decide questo file:
lo sceglie chi apre l'app dal selettore comune, ed è la stessa scelta che vale
per DaProdMusica e DaProdFoto. Qui c'è solo dove bussare, e un ripiego per
quando nessuno ha scelto niente.
"""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

QUI = Path(__file__).resolve().parents[2]


def _cartella(nome: str, ripiego: Path) -> Path:
    valore = os.environ.get(nome)
    return Path(valore) if valore else ripiego


class Settings(BaseSettings):
    # `extra="ignore"` resta: nell'ambiente della suite ci sono decine di
    # variabili che non riguardano il Companion, e non deve inciampare su una.
    model_config = SettingsConfigDict(extra="ignore")

    # ------------------------------------------------------------ identità --
    #
    # Il nome non si chiede più da terminale: chi vuole cambiarlo lo fa dalla
    # pagina, e finisce nelle impostazioni della suite. "Compagno" è un ripiego
    # che si legge, non un nome definitivo.
    bot_name: str = "Compagno"

    # -------------------------------------------------------------- modello --
    #
    # LM Studio, l'API compatibile OpenAI. Il modello lo passa la pagina a ogni
    # domanda; questi due valgono quando non l'ha passato.
    llm_base_url: str = "http://127.0.0.1:1234/v1"
    brain_model_tag: str = ""
    brain_model_num_ctx: int = 65536

    # L'embedding è un'altra cosa dal modello che parla: serve un modello che
    # trasformi una frase in numeri, ed è quello che rende cercabile la memoria.
    # Vuoto vuol dire "prova con quello caricato": LM Studio, se ne ha uno solo,
    # risponde lo stesso.
    embedding_model_tag: str = ""

    # -------------------------------------------------------------- sogni ---
    #
    # Il consolidamento: di notte il Companion rilegge quello che vi siete detti
    # e ne ricava i fatti da tenere. Alle 4 perché è l'ora in cui la GPU è
    # libera di sicuro, e perché il modello che scrive e i motori che generano
    # non vanno d'accordo sulla stessa macchina.
    dreaming_interval_cron: str = "0 4 * * *"
    proactive_tick_interval_seconds: int = 300

    log_level: str = "INFO"

    @field_validator("bot_name", mode="before")
    @classmethod
    def _nome_vuoto_e_il_ripiego(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not v.strip()):
            return "Compagno"
        return v

    # ------------------------------------------------------------ cartelle --
    #
    # Tutte dalla suite, con un ripiego accanto al codice per chi avvia questo
    # motore a mano da un terminale — che è come si guarda dentro un servizio
    # che non parte (vedi RIPRENDERE-DA-QUI.md).

    def resolved_sandbox_root(self) -> Path:
        """La cartella dove il Companion può scrivere. Nella suite: i temporanei."""
        return _cartella("DAPROD_TEMPORANEI", QUI / "dati")

    def resolved_db_path(self) -> Path:
        """La memoria: un file solo, che si può copiare, guardare e cancellare."""
        return self.resolved_sandbox_root() / "memoria.db"

    def resolved_log_dir(self) -> Path:
        return _cartella("DAPROD_LOG", self.resolved_sandbox_root() / "logs")

    def resolved_output_dir(self) -> Path:
        """Dove finiscono i sogni scritti: la libreria condivisa della suite."""
        return _cartella("DAPROD_RISULTATI", QUI / "risultati")

    @property
    def brain_http_port(self) -> int:
        return int(os.environ.get("DAPROD_PORTA", "8760"))

    def has_bot_name(self) -> bool:
        return bool(self.bot_name.strip())


def load_settings() -> Settings:
    """Le impostazioni, lette dall'ambiente. Si possono rileggere quando serve."""
    return Settings()
