"""Traduce il prompt dall'italiano all'inglese, perché il modello capisce quello.

Non è un capriccio: gli stessi concetti scritti in italiano arrivano molto più
deboli. Qui si usa un traduttore piccolo (~300 MB, decine di millisecondi) che si
carica solo se serve e tiene in cache le frasi già viste, così scrivere nel
prompt non rallenta il video.
"""

from __future__ import annotations

import logging
import re
import threading

log = logging.getLogger("daproddream.traduzione")

MODELLO = "Helsinki-NLP/opus-mt-it-en"

# Parole che in inglese non esistono o vogliono dire altro: se ce n'è una,
# la frase è italiana. Serve a non tradurre inutilmente i prompt già inglesi.
SPIE = {
    "il", "lo", "la", "gli", "le", "un", "uno", "una", "di", "del", "della",
    "dei", "delle", "che", "con", "per", "sul", "sulla", "nel", "nella", "come",
    "molto", "poco", "colori", "luce", "luci", "notte", "giorno", "cielo",
    "mare", "città", "citta", "casa", "donna", "uomo", "volto", "sogno", "verso",
    "dipinto", "pittura", "quadro", "disegno", "stile", "sfondo", "ombra",
    "ombre", "morbido", "acceso", "scuro", "chiaro", "antico", "vecchio",
}


def sembra_italiano(testo: str) -> bool:
    parole = set(re.findall(r"[a-zàèéìòù]+", (testo or "").lower()))
    return bool(parole & SPIE)


class Traduttore:
    def __init__(self):
        self.modello = None
        self.tokenizer = None
        self.device = "cpu"
        self._lock = threading.Lock()
        self._cache: dict[str, str] = {}
        self.errore = ""

    @property
    def pronto(self) -> bool:
        return self.modello is not None

    def carica(self, device: str = "cuda") -> bool:
        if self.modello is not None:
            return True
        with self._lock:
            if self.modello is not None:
                return True
            try:
                from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

                log.info("Carico il traduttore %s", MODELLO)
                try:
                    tok = AutoTokenizer.from_pretrained(MODELLO, local_files_only=True)
                    mod = AutoModelForSeq2SeqLM.from_pretrained(MODELLO, local_files_only=True)
                except Exception:
                    tok = AutoTokenizer.from_pretrained(MODELLO)
                    mod = AutoModelForSeq2SeqLM.from_pretrained(MODELLO)
                self.tokenizer = tok
                self.modello = mod.to(device).eval()
                self.device = device
                self.errore = ""
                log.info("Traduttore pronto")
                return True
            except Exception as exc:
                self.errore = str(exc)
                log.warning("Traduttore non disponibile: %s", exc)
                return False

    def scarica(self) -> None:
        with self._lock:
            self.modello = None
            self.tokenizer = None
            self._cache.clear()

    def traduci(self, testo: str) -> str:
        testo = (testo or "").strip()
        if not testo:
            return ""
        if testo in self._cache:
            return self._cache[testo]
        if not self.carica(self.device):
            return testo

        import torch

        try:
            with self._lock, torch.no_grad():
                ingresso = self.tokenizer(
                    testo, return_tensors="pt", truncation=True, max_length=128
                ).to(self.device)
                uscita = self.modello.generate(**ingresso, max_new_tokens=96, num_beams=1)
                fuori = self.tokenizer.decode(uscita[0], skip_special_tokens=True).strip()
        except Exception as exc:
            log.warning("Traduzione fallita: %s", exc)
            return testo

        if len(self._cache) > 200:
            self._cache.clear()
        self._cache[testo] = fuori
        log.info("Tradotto: %s -> %s", testo[:40], fuori[:40])
        return fuori
