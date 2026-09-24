"""Prova: con il ponte acceso, ComfyUI-GGUF riconosce Qwen-Image 2.1 senza architettura.

Si fa girare contro il ComfyUI-GGUF vero, quello del commit fissato in
``packages/runtime/src/nodi.ts``, senza torch e senza scheda:

    git clone https://github.com/city96/ComfyUI-GGUF <cartella>
    python services/comfy/prove/gguf_qwen.py <cartella>

Il pacco si carica come lo carica ComfyUI (un modulo col nome della cartella),
torch e gguf sono finti: a ``tools.convert`` servono solo per esistere.
"""

import importlib.util
import sys
import types
from pathlib import Path

QUI = Path(__file__).resolve().parent
PONTE = QUI.parent / "nodi" / "daprod_ponte" / "gguf_qwen.py"

esiti = []


def dice(cosa, vero, dettaglio=""):
    esiti.append(bool(vero))
    print(("  ✔ " if vero else "  ✘ ") + cosa + (f"  {dettaglio}" if dettaglio else ""))


def finto(nome, **attributi):
    modulo = types.ModuleType(nome)
    modulo.__dict__.update(attributi)
    sys.modules[nome] = modulo
    return modulo


def main(cartella: Path) -> int:
    # Quello che tools/convert.py importa in cima, e che qui non serve.
    finto("torch")
    finto("gguf")
    finto("tqdm", tqdm=lambda x, **k: x)
    finto("safetensors")
    finto("safetensors.torch", load_file=None, save_file=None)

    # Il ponte si accende prima, come nel motore vero.
    spec = importlib.util.spec_from_file_location("daprod_gguf_qwen", PONTE)
    ponte = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ponte)
    ponte.apri()

    # Il pacco come lo registra ComfyUI: il nome e' quello della cartella. Solo
    # il pacchetto, senza eseguire il suo __init__ (vorrebbe ComfyUI).
    nome = cartella.name
    pacco = types.ModuleType(nome)
    pacco.__path__ = [str(cartella)]
    sys.modules[nome] = pacco

    convert = importlib.import_module(nome + ".tools.convert")
    dice("il ponte ha ritoccato tools.convert mentre si caricava", getattr(convert, "_daprod_qwen", False))

    qwen21 = {
        "img_in.weight", "txt_in.in_layer.weight", "txt_in.text_norm.weight",
        "transformer_blocks.0.img_mod.1.weight", "transformer_blocks.0.attn.to_q.weight",
        "norm_out.linear.weight", "proj_out.weight",
    }
    dice("Qwen-Image 2.1 senza architettura: qwen_image", convert.detect_arch(qwen21).arch == "qwen_image")

    qwen1 = {"img_in.weight", "txt_in.weight", "txt_norm.weight", "transformer_blocks.0.img_mod.1.weight"}
    dice("Qwen-Image 1 senza architettura: qwen_image", convert.detect_arch(qwen1).arch == "qwen_image")

    flux = {"double_blocks.0.img_attn.proj.weight", "double_blocks.0.txt_attn.proj.weight", "single_blocks.0.linear1.weight"}
    try:
        arco = convert.detect_arch(flux).arch
    except AssertionError as e:
        arco = f"errore: {e}"
    dice("gli altri modelli non cambiano (FLUX resta flux)", arco == "flux", arco)

    try:
        convert.detect_arch({"qualcosa.weight"})
        dice("un modello sconosciuto resta sconosciuto", False)
    except AssertionError as e:
        dice("un modello sconosciuto resta sconosciuto", "Unknown model architecture" in str(e))

    prima = len(convert.arch_list)
    ponte.insegna_qwen(convert)
    ponte.apri()
    dice("una volta sola, anche se si riaccende", len(convert.arch_list) == prima)

    ok = all(esiti)
    print(f"\n{sum(esiti)} OK, {len(esiti) - sum(esiti)} KO")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1]).resolve()))
