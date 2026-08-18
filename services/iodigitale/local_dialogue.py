"""Pipeline di dialogo interamente locale, in sostituzione di Doubao.

Tre pezzi, tutti sul PC dell'utente:

* STT  -> faster-whisper su CPU (la GPU e' interamente occupata da LeapTalk)
* LLM  -> un modello caricato in LM Studio, via la sua API OpenAI-compatibile
* TTS  -> Piper (ONNX, CPU), voce italiana

L'interfaccia esposta e' identica a quella di ``run_doubao_turn`` in web_server.py:
consuma uno stream di ``InputEvent`` e restituisce ``(user_text, assistant_text, pcm)``,
inviando l'audio al ``audio_sink`` man mano che le frasi vengono sintetizzate, cosi'
LeapTalk inizia ad animare il ritratto prima che la risposta sia completa.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Awaitable, Callable

import numpy as np

logger = logging.getLogger("leaptalk.local")

# Fine frase: sintetizziamo un pezzo alla volta per non far aspettare l'utente
# fino alla fine della generazione dell'LLM.
_SENTENCE_END = ".!?…\n:;"
_MIN_SENTENCE_CHARS = 12

# I modelli "reasoning" possono emettere il monologo interno dentro il testo.
_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_THINK_OPEN = re.compile(r"<think>.*", re.DOTALL | re.IGNORECASE)

# Ripulitura per la sintesi vocale: markdown ed emoji letti ad alta voce sono rumore.
_MARKDOWN = re.compile(r"[*_`#>|]+")
_EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF←-⇿⬀-⯿]"
)


@dataclass
class LocalDialogueConfig:
    llm_base_url: str = "http://127.0.0.1:1234/v1"
    llm_model: str = "lfm2.5-2.6b"
    llm_api_key: str = "lm-studio"
    llm_max_tokens: int = 220
    llm_temperature: float = 0.7
    llm_timeout: float = 600.0
    # Quasi tutti i modelli recenti "ragionano" prima di rispondere: per un avatar
    # che parla e' tempo sprecato (misurato su lfm2.5: 11.3s con ragionamento,
    # 2.2s senza). Vedi _stream_llm per come viene soppresso.
    llm_no_think: bool = True
    system_prompt: str = (
        "Sei un avatar digitale che parla a voce. Rispondi sempre in italiano, "
        "in modo naturale e discorsivo, al massimo tre frasi brevi. "
        "Non usare elenchi puntati, formattazione markdown, emoji o parentesi: "
        "il tuo testo viene letto ad alta voce."
    )
    history_max_messages: int = 12

    stt_model: str = "small"
    stt_language: str = "it"
    stt_device: str = "cuda"  # ricade automaticamente su CPU se la GPU non ce la fa
    stt_compute_type: str = ""  # vuoto = float16 su GPU, int8 su CPU
    stt_download_root: str = "./models/whisper"
    stt_cpu_threads: int = 8

    tts_voice: str = "./models/piper/it_IT-paola-medium.onnx"
    tts_length_scale: float = 1.0

    input_sample_rate: int = 16000
    output_sample_rate: int = 24000

    _histories: dict[str, list[dict[str, str]]] = field(default_factory=dict, repr=False)


def _resample_pcm16(pcm: bytes, src_rate: int, dst_rate: int) -> bytes:
    if not pcm or src_rate == dst_rate:
        return pcm
    audio = np.frombuffer(pcm[: len(pcm) - (len(pcm) % 2)], dtype="<i2").astype(np.float32)
    try:
        import soxr

        resampled = soxr.resample(audio, src_rate, dst_rate)
    except Exception:  # pragma: no cover - fallback lineare, qualita' leggermente inferiore
        target_len = int(round(audio.size * dst_rate / src_rate))
        resampled = np.interp(
            np.linspace(0.0, audio.size - 1, target_len, dtype=np.float64),
            np.arange(audio.size, dtype=np.float64),
            audio,
        )
    return np.clip(resampled, -32768, 32767).astype("<i2").tobytes()


def _clean_for_tts(text: str) -> str:
    text = _MARKDOWN.sub(" ", text)
    text = _EMOJI.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def _strip_thinking(text: str) -> str:
    return _THINK_OPEN.sub("", _THINK_BLOCK.sub("", text)).strip()


class LocalDialogue:
    """Tiene in vita i modelli locali e gestisce un turno di conversazione."""

    def __init__(self, config: LocalDialogueConfig) -> None:
        self.config = config
        self._stt: Any = None
        self._tts: Any = None
        self._stt_lock = asyncio.Lock()
        self._tts_lock = asyncio.Lock()

    # ---------------------------------------------------------------- modelli

    async def ensure_loaded(self) -> None:
        """Carica STT e TTS in anticipo, cosi' il primo turno non paga l'attesa."""
        await asyncio.gather(self._ensure_stt(), self._ensure_tts())

    async def _ensure_stt(self) -> Any:
        async with self._stt_lock:
            if self._stt is None:
                cfg = self.config
                wanted = (cfg.stt_device or "cuda").lower()
                attempts = [wanted, "cpu"] if wanted != "cpu" else ["cpu"]
                errors: list[str] = []
                for device in attempts:
                    compute = cfg.stt_compute_type or ("float16" if device == "cuda" else "int8")
                    try:
                        self._stt = await asyncio.to_thread(self._load_stt, device, compute)
                        logger.info("Whisper '%s' caricato su %s (%s)", cfg.stt_model, device, compute)
                        break
                    except Exception as exc:
                        errors.append(f"{device}: {exc}")
                        logger.warning("Whisper su %s non disponibile (%s)", device, exc)
                if self._stt is None:
                    raise RuntimeError("Impossibile caricare Whisper. " + " | ".join(errors))
            return self._stt

    def _load_stt(self, device: str, compute_type: str) -> Any:
        if device == "cuda":
            # ctranslate2 cerca cuDNN e cuBLAS nel PATH; su Windows non sono installati
            # a livello di sistema, ma le stesse DLL arrivano con le wheel di PyTorch.
            import torch

            torch_lib = os.path.join(os.path.dirname(torch.__file__), "lib")
            if os.path.isdir(torch_lib):
                os.add_dll_directory(torch_lib)

        from faster_whisper import WhisperModel

        cfg = self.config
        return WhisperModel(
            cfg.stt_model,
            device=device,
            compute_type=compute_type,
            download_root=cfg.stt_download_root,
            cpu_threads=cfg.stt_cpu_threads,
        )

    async def _ensure_tts(self) -> Any:
        async with self._tts_lock:
            if self._tts is None:
                from piper import PiperVoice

                logger.info("Caricamento voce Piper: %s", self.config.tts_voice)
                self._tts = await asyncio.to_thread(PiperVoice.load, self.config.tts_voice)
            return self._tts

    # -------------------------------------------------------------------- STT

    async def transcribe(self, pcm: bytes) -> str:
        if len(pcm) < self.config.input_sample_rate:  # meno di mezzo secondo
            return ""
        model = await self._ensure_stt()
        audio = np.frombuffer(pcm[: len(pcm) - (len(pcm) % 2)], dtype="<i2").astype(np.float32) / 32768.0

        def _run() -> str:
            segments, _info = model.transcribe(
                audio,
                language=self.config.stt_language or None,
                beam_size=1,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            return "".join(segment.text for segment in segments).strip()

        return await asyncio.to_thread(_run)

    # -------------------------------------------------------------------- LLM

    def _history(self, conversation_id: str) -> list[dict[str, str]]:
        return self.config._histories.setdefault(conversation_id, [])

    def _messages(self, conversation_id: str, user_text: str) -> list[dict[str, str]]:
        history = self._history(conversation_id)[-self.config.history_max_messages :]
        return [{"role": "system", "content": self.config.system_prompt}, *history, {"role": "user", "content": user_text}]

    async def _stream_llm(self, messages: list[dict[str, str]], meta: dict[str, Any]) -> AsyncIterator[str]:
        import httpx

        cfg = self.config
        if cfg.llm_no_think:
            # I flag sono suggerimenti che molti modelli ignorano; il blocco <think>
            # gia' chiuso, prefillato come inizio della risposta, e' l'unico metodo
            # che si e' rivelato efficace al 100% nei test su LM Studio.
            messages = [*messages, {"role": "assistant", "content": "<think>\n\n</think>\n\n"}]
        payload = {
            "model": cfg.llm_model,
            "messages": messages,
            "max_tokens": cfg.llm_max_tokens,
            "temperature": cfg.llm_temperature,
            "stream": True,
        }
        if cfg.llm_no_think:
            payload["reasoning_effort"] = "none"
            payload["chat_template_kwargs"] = {"enable_thinking": False}
        headers = {"Authorization": f"Bearer {cfg.llm_api_key}", "Content-Type": "application/json"}
        url = cfg.llm_base_url.rstrip("/") + "/chat/completions"

        async with httpx.AsyncClient(timeout=httpx.Timeout(cfg.llm_timeout, connect=10.0)) as client:
            try:
                stream = client.stream("POST", url, json=payload, headers=headers)
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"Impossibile contattare LM Studio su {cfg.llm_base_url}: {exc}") from exc
            async with stream as response:
                if response.status_code != 200:
                    detail = (await response.aread()).decode("utf-8", errors="ignore")[:400]
                    raise RuntimeError(
                        f"LM Studio ha risposto {response.status_code}. "
                        f"Modello richiesto: {cfg.llm_model}. Dettaglio: {detail}"
                    )
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        event = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choices = event.get("choices") or []
                    if not choices:
                        continue
                    if choices[0].get("finish_reason"):
                        # "length" = il modello e' stato tagliato dal tetto di token:
                        # l'ultima frase e' monca e va scartata, non pronunciata.
                        meta["finish_reason"] = choices[0]["finish_reason"]
                    delta = choices[0].get("delta") or {}
                    # `reasoning_content` viene volutamente scartato: e' il monologo
                    # interno dei modelli reasoning, non va ne' mostrato ne' letto.
                    token = delta.get("content") or ""
                    if token:
                        yield token

    # -------------------------------------------------------------------- TTS

    async def synthesize(self, text: str) -> bytes:
        clean = _clean_for_tts(text)
        if not clean:
            return b""
        voice = await self._ensure_tts()

        def _run() -> bytes:
            chunks = list(voice.synthesize(clean))
            if not chunks:
                return b""
            pcm = b"".join(chunk.audio_int16_bytes for chunk in chunks)
            return _resample_pcm16(pcm, chunks[0].sample_rate, self.config.output_sample_rate)

        return await asyncio.to_thread(_run)

    def silence(self, seconds: float) -> bytes:
        return b"\x00" * (int(self.config.output_sample_rate * seconds) * 2)

    # ------------------------------------------------------------------ turno

    async def run_turn(
        self,
        input_stream: AsyncIterator[Any],
        *,
        text_mode: bool,
        send_client: Callable[[dict], Awaitable[None]],
        conversation_id: str,
        audio_sink: Callable[[bytes], Awaitable[None]] | None = None,
        input_mod: str | None = None,
    ) -> tuple[str, str, bytes]:
        text_parts: list[str] = []
        pcm_in = bytearray()
        async for event in input_stream:
            if getattr(event, "text", ""):
                text_parts.append(event.text)
            elif getattr(event, "audio", b""):
                pcm_in.extend(event.audio)

        if text_mode:
            user_text = " ".join(part.strip() for part in text_parts if part.strip()).strip()
        else:
            user_text = await self.transcribe(bytes(pcm_in))

        if not user_text:
            raise RuntimeError(
                "Non ho capito l'audio: prova a parlare piu' vicino al microfono o piu' a lungo."
            )
        if not text_mode:
            # Solo per il microfono: quando l'utente scrive, il testo e' gia'
            # comparso in chat e rimandarlo lo duplicherebbe.
            await send_client({"type": "user_transcript", "text": user_text})

        pcm_out: list[bytes] = []

        async def speak(sentence: str) -> None:
            pcm = await self.synthesize(sentence)
            if not pcm:
                return
            pcm_out.append(pcm)
            if audio_sink is not None:
                await audio_sink(pcm)

        assistant_text = ""
        buffer = ""
        meta: dict[str, Any] = {}
        async for token in self._stream_llm(self._messages(conversation_id, user_text), meta):
            assistant_text += token
            await send_client({"type": "assistant_delta", "text": token})
            buffer += token
            # Sintetizziamo appena una frase e' completa, senza aspettare tutta la risposta.
            while True:
                cut = -1
                for index, char in enumerate(buffer):
                    if char in _SENTENCE_END and index + 1 >= _MIN_SENTENCE_CHARS:
                        cut = index
                        break
                if cut < 0:
                    break
                sentence, buffer = buffer[: cut + 1], buffer[cut + 1 :]
                await speak(_strip_thinking(sentence))

        # Il residuo nel buffer e' l'ultima frase non ancora chiusa da punteggiatura.
        # Se il modello e' stato tagliato dal tetto di token quel residuo e' un
        # frammento a meta' parola: va buttato, non fatto pronunciare all'avatar.
        truncated = meta.get("finish_reason") == "length"
        leftover = buffer.strip()
        if leftover and not truncated:
            await speak(_strip_thinking(leftover))
        elif leftover:
            logger.warning("Risposta troncata dal tetto di token, scarto: %r", leftover[-60:])
            assistant_text = assistant_text[: len(assistant_text) - len(buffer)]
            if not pcm_out:
                # Nessuna frase completa in tutta la risposta: invece di fallire,
                # si taglia all'ultima parola intera e si pronuncia quella.
                salvaged = leftover.rsplit(" ", 1)[0].strip() if " " in leftover else ""
                if salvaged:
                    assistant_text = f"{assistant_text}{salvaged}"
                    await speak(_strip_thinking(salvaged))

        assistant_text = _strip_thinking(assistant_text).rstrip()
        if not pcm_out:
            raise RuntimeError(
                f"Il modello '{self.config.llm_model}' non ha prodotto testo pronunciabile. "
                "Se e' un modello 'reasoning', ha consumato tutti i token nel ragionamento: "
                "aumenta LOCAL_LLM_MAX_TOKENS oppure scegli un modello piu' diretto."
            )

        # Piccola coda di silenzio: evita che l'ultima sillaba venga tagliata dal video.
        tail = self.silence(0.25)
        pcm_out.append(tail)
        if audio_sink is not None:
            await audio_sink(tail)

        history = self._history(conversation_id)
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": assistant_text})
        del history[: max(0, len(history) - self.config.history_max_messages)]

        return user_text, assistant_text, b"".join(pcm_out)
