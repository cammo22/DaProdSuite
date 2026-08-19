"""
Consolidamento della memoria: legge gli episodi non ancora processati, chiede
al modello un riassunto piu' entita'/relazioni in formato JSON strutturato
(vincolato via 'format' sull'API di Ollama, non solo per istruzione nel
prompt), scrive la memoria semantica con il suo embedding e aggiorna il grafo
di conoscenza. Deduplica di nodi/archi delegata a graph.writer.
"""

from __future__ import annotations

import logging
import sqlite3
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from companion_shared.sandbox import FilesystemGuard

from ..conversation.lmstudio_client import LmStudioClient
from ..conversation.tts_client import TtsClient
from ..graph.types import EDGE_TYPES, ENTITY_TYPES
from ..graph.writer import find_or_create_edge, find_or_create_node
from ..memory import episodic, semantic
from . import markdown_export

logger = logging.getLogger("brain")

_MIN_EVENTS_TO_DREAM = 3

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "temp_id": {"type": "string"},
                    "type": {"type": "string", "enum": ENTITY_TYPES},
                    "label": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "confidence": {"type": "number"},
                },
                "required": ["temp_id", "type", "label", "tags", "confidence"],
            },
        },
        "relations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source_temp_id": {"type": "string"},
                    "target_temp_id": {"type": "string"},
                    "type": {"type": "string", "enum": EDGE_TYPES},
                },
                "required": ["source_temp_id", "target_temp_id", "type"],
            },
        },
        "self_reflection": {"type": "string"},
    },
    "required": ["summary", "entities", "relations", "self_reflection"],
}


def _build_transcript(events: list[sqlite3.Row]) -> str:
    lines = []
    for event in events:
        if event["event_type"] == "user_message":
            lines.append(f"Utente: {event['content']}")
        elif event["event_type"] == "bot_reply":
            lines.append(f"Bot: {event['content']}")
        else:
            lines.append(f"[{event['event_type']}] {event['content']}")
    return "\n".join(lines)


def _build_prompt(transcript: str, bot_name: str) -> str:
    return (
        "Sei il modulo di consolidamento della memoria di un companion AI. Leggi la "
        "trascrizione qui sotto e produci un JSON con:\n"
        "- 'summary': un riassunto compatto (2-4 frasi) di cosa e' successo o e' stato detto, "
        "utile da ricordare in futuro. Scarta i dettagli poco rilevanti o il rumore. USA SOLO "
        "informazioni presenti nella trascrizione: non inventare mai dettagli, numeri, nomi o "
        "fatti che non ci sono scritti.\n"
        "- 'entities': le entita' nominate nella trascrizione (persone, eventi, concetti, luoghi). "
        "'temp_id' e' SOLO un identificatore interno arbitrario (usa 'e1', 'e2', 'e3', ...): non "
        "deve avere alcun significato, serve solo per collegare le relazioni qui sotto. 'label' e' "
        "invece il nome vero e proprio dell'entita' (es. 'Marco', 'Milano', 'sviluppo software'). Se "
        "l'utente ha detto il proprio nome, usa quel nome come label invece di un termine generico "
        "come 'Utente' o 'utente'. 'tags' sono 1-4 parole chiave brevi che descrivono l'entita' (es. "
        "['amico', 'napoli'] per una persona, ['hobby'] per un concetto) — lista vuota se non ne vengono "
        "in mente di utili. 'confidence' e' un numero da 0 a 1 su quanto e' certa e stabile questa "
        "informazione secondo la trascrizione (1 = detto esplicitamente e chiaro, 0.5 = dedotto/ambiguo).\n"
        "- 'relations': le relazioni tra le entita' sopra, riferendole tramite i loro temp_id.\n"
        f"- 'self_reflection': SOLO se in questa trascrizione emerge qualcosa di genuino sul tuo modo di "
        f"essere come companion (chiamato '{bot_name}') — un tratto del tuo carattere, qualcosa che ti "
        "piace o ti diverte, un aspetto della tua relazione con l'utente — scrivi 2-3 frasi in prima "
        "persona su questo. Se non emerge nulla del genere, lascia una stringa vuota: non inventare "
        "riflessioni su di te se la trascrizione non ne offre lo spunto.\n\n"
        "Se non ci sono entita' o relazioni rilevanti, lascia le liste vuote piuttosto che inventarle.\n\n"
        f"Trascrizione:\n{transcript}"
    )


async def run_dreaming_cycle(
    *,
    conn: sqlite3.Connection,
    llm_base_url: str,
    brain_model_tag: str,
    embedding_model_tag: str,
    num_ctx: int,
    guard: FilesystemGuard,
    sandbox_root: Path,
    bot_name: str,
    tts: TtsClient | None = None,
    on_event: Callable[[str, dict], None] | None = None,
) -> int:
    """Esegue un ciclo di consolidamento. Restituisce il numero di episodi
    consolidati (0 se non c'era nulla da fare o qualcosa e' andato storto).
    'on_event' (opzionale) viene chiamato con 'dreaming-started' solo se c'e'
    davvero lavoro da fare, e con 'dreaming-finished' alla fine in ogni caso
    (anche in caso di errore, tramite finally) — e' cosi' che Electron sa
    quando mostrare/nascondere la bubble "sognando..." sull'avatar."""
    events = episodic.get_unconsolidated_events(conn)
    if len(events) < _MIN_EVENTS_TO_DREAM:
        logger.info("Dreaming: solo %d episodi non consolidati, salto questo giro", len(events))
        return 0

    if on_event:
        on_event("dreaming-started", {})

    consolidated_count = 0
    try:
        transcript = _build_transcript(events)
        prompt = _build_prompt(transcript, bot_name)

        # Il client della suite invece di una chiamata a mano: e' lui che sa
        # parlare a LM Studio, e la forma dello schema JSON e' scritta in un
        # posto solo. `max_tokens` largo perche' qui si estrae un riassunto piu'
        # entita' e relazioni da una trascrizione lunga: nel progetto d'origine,
        # con 56 episodi, il riassunto si troncava a meta' frase.
        llm = LmStudioClient(llm_base_url)
        try:
            parsed = await llm.chiedi_json(
                model=brain_model_tag,
                prompt=prompt,
                schema=_RESPONSE_SCHEMA,
                nome_schema="consolidamento",
                # Largo: se il modello ragiona prima di rispondere — e non tutti
                # si lasciano dire di no — il ragionamento mangia questo spazio
                # prima del JSON, e quello che resta è un riassunto troncato a
                # metà frase. Successo davvero, con 56 episodi da rileggere.
                max_tokens=4096,
            )
            if not parsed:
                logger.error("Dreaming: il modello non ha risposto con del JSON, salto questo giro")
                return 0

            summary = parsed.get("summary", "").strip()
            if not summary:
                logger.info("Dreaming: nessun riassunto prodotto, salto questo giro")
                return 0

            embedding = await llm.embed(model=embedding_model_tag, text=summary)
        finally:
            await llm.aclose()

        event_ids = [event["id"] for event in events]
        semantic.insert_semantic_memory(conn, summary=summary, source_event_ids=event_ids, embedding=embedding)

        dream_timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        dream_source = f"Sogno del {dream_timestamp}"

        temp_id_to_node_id: dict[str, int] = {}
        for entity in parsed.get("entities", []):
            node_id = find_or_create_node(
                conn,
                node_type=entity["type"],
                label=entity["label"],
                tags=entity.get("tags", []),
                confidence=entity.get("confidence"),
                source=dream_source,
            )
            temp_id_to_node_id[entity["temp_id"]] = node_id

        graph_changed = bool(parsed.get("entities"))
        for relation in parsed.get("relations", []):
            source_id = temp_id_to_node_id.get(relation["source_temp_id"])
            target_id = temp_id_to_node_id.get(relation["target_temp_id"])
            if source_id is None or target_id is None:
                continue  # temp_id sconosciuto: il modello ha citato un'entita' non elencata sopra
            find_or_create_edge(
                conn, source_node_id=source_id, target_node_id=target_id, edge_type=relation["type"]
            )

        episodic.mark_consolidated(conn, event_ids)

        # Export in markdown in aggiunta a SQLite (non al posto): non deve
        # far fallire il ciclo se scrivere su disco va storto, il
        # consolidamento vero e proprio e' gia' andato a buon fine sopra.
        try:
            markdown_export.write_dream_summary(summary, timestamp=dream_timestamp, guard=guard, sandbox_root=sandbox_root)
            if graph_changed:
                markdown_export.write_entity_files(conn, guard=guard, sandbox_root=sandbox_root)
            self_reflection = parsed.get("self_reflection", "").strip()
            if self_reflection:
                markdown_export.append_identity_reflection(
                    self_reflection, bot_name=bot_name, guard=guard, sandbox_root=sandbox_root
                )
        except Exception:
            logger.exception("Dreaming: export in markdown fallito, il consolidamento resta comunque valido")

        if graph_changed and on_event:
            on_event("graph-updated", {})

        # Annuncio del sogno: l'utente vuole "sentirlo" dire cosa ha sognato,
        # non solo vederlo comparire nel grafo. Degradazione controllata come
        # per il resto del TTS: se fallisce, il consolidamento resta valido.
        if on_event:
            announcement = f"Ho sognato questo: {summary}"
            audio_path: str | None = None
            duration_seconds: float | None = None
            if tts is not None:
                try:
                    audio_path, duration_seconds = await tts.speak(announcement)
                except Exception:
                    logger.warning("Sintesi vocale dell'annuncio del sogno fallita, resta solo il testo")
            on_event(
                "dream-announcement",
                {"summary": announcement, "audio_path": audio_path, "duration_seconds": duration_seconds},
            )

        consolidated_count = len(event_ids)
        logger.info(
            "Dreaming: consolidati %d episodi in 1 memoria semantica, %d entita', %d relazioni",
            consolidated_count,
            len(parsed.get("entities", [])),
            len(parsed.get("relations", [])),
        )
        return consolidated_count
    finally:
        if on_event:
            on_event("dreaming-finished", {"consolidated_events": consolidated_count})
