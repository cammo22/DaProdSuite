"""Qwen-Image 2.1 in GGUF: dire a ComfyUI-GGUF che modello e'.

⚠ **Il difetto, come si presentava (1.4.5).** Scelto Qwen-Image 2.1 in
DaProdFoto, il motore rispondeva::

    ValueError: This model is not currently supported - (Unknown model architecture!)

Il file e' giusto e il motore lo sa usare. Quello che manca e' **una riga
dentro il GGUF**: quello di Unsloth non ha nessuna chiave ``general.*``, e
quindi nemmeno ``general.architecture``. Quando manca, ComfyUI-GGUF prova a
indovinare il modello dai nomi dei tensori, con un elenco suo
(``tools/convert.py``) — e in quell'elenco Qwen-Image non c'e', perche' i GGUF
di Qwen-Image 1 l'architettura la scrivevano. E' un difetto noto (unslothai/
unsloth#11827), e ComfyUI-GGUF e' fermo a gennaio 2026: non arriva un
aggiornamento che lo sistemi.

**Perche' si aggiusta qui e non nel loro file**: per la stessa ragione della
strada per LLaDA, qui accanto in ``__init__.py``. Quel file si riscarica da
capo a ogni installazione, e una riga cambiata a mano sparirebbe al primo
aggiornamento. Qui invece si aggiunge Qwen-Image **al loro elenco**, nel
momento in cui il loro modulo si carica, e il resto lo fanno loro: da quel
momento il file si legge come «qwen_image», che e' un'architettura che
ComfyUI-GGUF conosce gia'.

Come si riconosce, preso dall'add-on che fa la stessa cosa
(pottokao-dotcom/ComfyUI-GGUF-Qwen3VL-TE, Apache-2.0): la 2.1 ha
``img_in`` e il lettore del testo diviso in due, ``txt_in.in_layer`` e
``txt_in.text_norm``. La riga di Qwen-Image 1 c'e' anche lei: un GGUF di
quella famiglia senza architettura dentro avrebbe dato lo stesso errore.

Niente torch e niente ComfyUI qui dentro: cosi' si prova da solo
(``services/comfy/prove/gguf_qwen.py``) contro il vero ComfyUI-GGUF.
"""

import importlib.abc
import logging
import sys

#: Per ogni famiglia, le chiavi che ci devono essere tutte. Senza prefisso:
#: il loader di ComfyUI-GGUF toglie ``model.diffusion_model.`` prima di chiedere.
CHIAVI_QWEN = [
    # Qwen-Image 2.1
    ("img_in.weight", "txt_in.in_layer.weight", "txt_in.text_norm.weight"),
    # Qwen-Image 1 e le sue 2511/2512
    ("img_in.weight", "txt_in.weight", "txt_norm.weight"),
]


def _e_il_convert_del_gguf(nome: str) -> bool:
    """Il modulo ``tools.convert`` di un pacchetto GGUF, qualunque nome abbia.

    ComfyUI registra il nodo col nome della sua cartella («ComfyUI-GGUF»), e la
    strada per LLaDA lo registra una seconda volta come «_llada_city96_gguf»:
    vanno bene tutte e due.
    """
    return nome.endswith(".tools.convert") and "gguf" in nome.lower()


def insegna_qwen(convert) -> bool:
    """Aggiunge Qwen-Image in cima all'elenco delle architetture. Vero se l'ha fatto.

    In cima e non in fondo: le chiavi di Qwen sono piu' strette di quelle degli
    altri, e se un giorno una famiglia piu' larga le coprisse per caso, vince
    quella giusta. Una volta sola per modulo.
    """
    if getattr(convert, "_daprod_qwen", False):
        return False
    base = getattr(convert, "ModelTemplate", None)
    elenco = getattr(convert, "arch_list", None)
    if base is None or not isinstance(elenco, list):
        # Il file e' cambiato sotto di noi: meglio l'errore loro che uno nostro.
        logging.warning("[daprod] ComfyUI-GGUF: tools.convert non e' piu' come lo conosco, Qwen-Image resta com'e'")
        return False
    qwen = type(
        "ModelQwenImageDaProd",
        (base,),
        {"arch": "qwen_image", "keys_detect": [tuple(c) for c in CHIAVI_QWEN], "keys_banned": []},
    )
    elenco.insert(0, qwen)
    convert._daprod_qwen = True
    logging.info("[daprod] ComfyUI-GGUF: Qwen-Image si riconosce anche senza architettura nel file")
    return True


class _AspettaIlConvert(importlib.abc.MetaPathFinder):
    """Sta in ascolto sugli import, e quando arriva ``tools.convert`` lo ritocca.

    Il loader di ComfyUI-GGUF importa quel modulo **dentro** la funzione che
    legge il file, cioe' alla prima immagine e non all'avvio: per questo non
    basta guardare una volta sola, serve essere li' quando succede. Non cambia
    niente di come si importa — si fa dare il modulo da chi lo darebbe
    comunque, e ci aggiunge una riga dopo.
    """

    def find_spec(self, nome, percorso, bersaglio=None):
        if not _e_il_convert_del_gguf(nome):
            return None
        for cercatore in sys.meta_path:
            if cercatore is self or not hasattr(cercatore, "find_spec"):
                continue
            spec = cercatore.find_spec(nome, percorso, bersaglio)
            if spec is not None and spec.loader is not None:
                break
        else:
            return None

        caricatore = spec.loader
        esegui = caricatore.exec_module

        def esegui_e_insegna(modulo):
            esegui(modulo)
            insegna_qwen(modulo)

        caricatore.exec_module = esegui_e_insegna
        return spec


def apri() -> None:
    """Da chiamare una volta, all'avvio del motore."""
    # Se qualcuno l'ha gia' caricato (un altro nodo, un avvio a mano), si
    # sistema subito quello che c'e'.
    for nome, modulo in list(sys.modules.items()):
        if modulo is not None and _e_il_convert_del_gguf(nome):
            insegna_qwen(modulo)
    if not any(isinstance(c, _AspettaIlConvert) for c in sys.meta_path):
        sys.meta_path.insert(0, _AspettaIlConvert())
