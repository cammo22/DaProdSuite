"""
Se c'è qualcuno che risponde, e cosa dire quando non c'è.

**Il problema che risolve.** Questo motore risponde `/health` con 200 anche se
LM Studio è spento: la memoria funziona, il database c'è, il servizio è vivo —
è solo la prima frase a fallire, con un errore grezzo che non dice cosa fare.
Qui si guarda prima, e si risponde in italiano con l'azione concreta.

**Cosa è cambiato dal progetto d'origine.** Prima si chiedeva a Ollama
(`/api/tags`) e i modelli erano fissati nel `.env`, quindi la diagnosi poteva
dire *«esegui ollama pull gemma4»*. Nella suite il modello lo sceglie l'utente
dal selettore comune dell'hub, ed è lo stesso per tutte le app: qui non si
pretende più un nome preciso, si guarda **se c'è qualcuno caricato**. Un
Companion che parla col modello che l'utente ha scelto è tutto quello che
serve; imporgli il nostro sarebbe la seconda verità sui modelli, e prima o poi
quella sbagliata.

`_modello_presente` resta puro e senza rete apposta: si prova con dati finti.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger("brain")


@dataclass
class DiagnosticsResult:
    """Com'è messo il modello che scrive, visto da qui."""

    llm_raggiungibile: bool
    brain_model_present: bool
    embedding_model_present: bool
    brain_model_tag: str
    embedding_model_tag: str
    installed_models: list[str] = field(default_factory=list)

    @property
    def all_ok(self) -> bool:
        # L'embedding non entra nel conto: senza, la conversazione funziona lo
        # stesso e perde solo la memoria a lungo termine — un degrado, non un
        # guasto. `problems()` lo dice comunque, ma non spegne l'app.
        return self.llm_raggiungibile and self.brain_model_present

    def problems(self) -> list[str]:
        """Cosa non va, in italiano, con l'azione da fare. Vuota se è a posto."""
        if not self.llm_raggiungibile:
            return [
                "LM Studio non risponde. È il programma che tiene acceso il modello "
                "che scrive, ed è lo stesso che usano DaProdMusica e DaProdFoto: "
                "aprilo, carica un modello e riprova. Dalla suite lo trovi nel "
                "pannello «Il modello che scrive»."
            ]

        guai: list[str] = []
        if not self.brain_model_present:
            guai.append(
                "LM Studio è acceso ma non ha nessun modello: senza, non c'è "
                "nessuno che risponda. Scaricane uno da LM Studio — noi "
                "lavoriamo soprattutto con Bonsai 27B — e comparirà da solo nel "
                "pannello «Il modello che scrive» dell'hub."
            )
        if not self.embedding_model_present:
            guai.append(
                "Non c'è nessun modello per gli embedding: la conversazione "
                "funziona lo stesso, ma il Companion non potrà cercare fra i "
                "ricordi vecchi — solo ricordare gli ultimi scambi. Serve un "
                "modello di tipo «embedding» installato in LM Studio."
            )
        return guai


def _modello_presente(tag: str, installati: list[str]) -> bool:
    """
    Se il modello richiesto c'è fra quelli caricati.

    Tag vuoto vuol dire «uno qualsiasi va bene», ed è il caso normale nella
    suite: il modello lo sceglie l'utente e questo motore non ne pretende uno.
    Il confronto è tollerante sul suffisso perché LM Studio a volte riporta un
    nome più lungo di quello che si vede nel menu.
    """
    installati = [nome.strip() for nome in installati if nome and nome.strip()]
    if not tag.strip():
        return bool(installati)

    tag = tag.strip()
    if tag in installati:
        return True
    return any(nome.startswith(tag) or tag.startswith(nome) for nome in installati)


async def modelli_disponibili(base_url: str, *, timeout: float = 5.0) -> list[str] | None:
    """
    I modelli che LM Studio ha **installati**, o `None` se non risponde.

    `None` e lista vuota sono due cose diverse, ed è tutta la diagnosi: la prima
    vuol dire «LM Studio non è acceso», la seconda «è acceso ma non ha nessun
    modello». Sono due messaggi diversi per chi legge.

    **Installato non vuol dire caricato in memoria**, e la differenza qui non
    serve: LM Studio carica da sé il modello che gli si chiede alla prima
    domanda. Chi vuole *vedere* cosa occupa memoria adesso guarda il pannello
    dell'hub, che per quello usa l'altra API (`/api/v0/models`, vedi
    `llm.ts`). Qui basta sapere che qualcuno c'è.
    """
    try:
        async with httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout) as client:
            risposta = await client.get("/models")
            risposta.raise_for_status()
            dati = risposta.json()
            return [voce.get("id", "") for voce in dati.get("data", []) if voce.get("id")]
    except Exception as exc:
        logger.warning("LM Studio non risponde su %s: %s", base_url, exc)
        return None


async def primo_modello(base_url: str) -> str:
    """
    Un modello da usare quando nessuno ne ha scelto uno.

    Serve perché **LM Studio rifiuta una richiesta senza nome di modello** se
    non ne ha già uno in memoria: risponde `400 No models loaded`, che è un
    errore giusto ma inutile da mostrare a qualcuno. Con un nome preciso invece
    lo carica da sé e risponde.

    Il caso normale è che il nome arrivi dalla pagina — è il selettore comune
    della suite. Questo è il ripiego per la prima volta, quando non si è ancora
    scelto niente.
    """
    installati = await modelli_disponibili(base_url)
    return installati[0] if installati else ""


async def run_diagnostics(
    *, llm_base_url: str, brain_model_tag: str, embedding_model_tag: str
) -> DiagnosticsResult:
    installati = await modelli_disponibili(llm_base_url)
    if installati is None:
        return DiagnosticsResult(
            llm_raggiungibile=False,
            brain_model_present=False,
            embedding_model_present=False,
            brain_model_tag=brain_model_tag,
            embedding_model_tag=embedding_model_tag,
        )
    return DiagnosticsResult(
        llm_raggiungibile=True,
        brain_model_present=_modello_presente(brain_model_tag, installati),
        embedding_model_present=_modello_presente(embedding_model_tag, installati),
        brain_model_tag=brain_model_tag,
        embedding_model_tag=embedding_model_tag,
        installed_models=installati,
    )
