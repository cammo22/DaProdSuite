"""Il modello che parla: caricamento, generazione, salvataggio.

**Un modello per volta in memoria**, e si toglie da solo quando non lo si usa —
vedi `OZIO_MASSIMO`. Sono uno o due GB, cioè il pezzo più piccolo di tutta la
suite, ma su una scheda da 8 GB che deve tenere anche ComfyUI restano due GB che
è meglio restituire.

**Il testo lungo si taglia a pezzi**, e non è un lusso: il modello ha una
finestra di 2048 posizioni fra testo e audio, e una pagina intera non ci sta.
Si taglia dove finiscono le frasi, si generano una per una e si ricuciono con un
respiro in mezzo. Con una voce di riferimento il timbro resta lo stesso, perché
il riferimento si ridà a ogni pezzo.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

from .config import MODELLI_DIR, RISULTATI_DIR, VOCI_DIR

log = logging.getLogger("daprodvoce.motore")


@dataclass(frozen=True)
class Modello:
    id: str
    nome: str
    riga: str
    cartella: str
    """L'id con cui la suite conosce i suoi pesi (manifest/models.json)."""
    catalogo: str


MODELLI: dict[str, Modello] = {
    "0.1b": Modello(
        id="0.1b",
        nome="Audio8 TTS 0.1B",
        riga="1,58 GB. Il piccolo: parte subito ed e' quello installato con l'app.",
        cartella="audio8/tts-0.1b",
        catalogo="audio8-tts-01b",
    ),
    "0.6b": Modello(
        id="0.6b",
        nome="Audio8 TTS 0.6B",
        riga="2,39 GB. Legge l'italiano molto meglio: nella tabella del modello sbaglia tre volte meno.",
        cartella="audio8/tts-0.6b",
        catalogo="audio8-tts-06b",
    ),
}

PREDEFINITO = "0.1b"


def cartella(modello: Modello) -> Path:
    return MODELLI_DIR / modello.cartella


def presente(modello: Modello) -> bool:
    """Vero se i pesi di questo modello sono davvero sul disco."""
    base = cartella(modello)
    return (base / "config.json").is_file() and (base / "model.safetensors").is_file()


# Quanti secondi di silenzio fra un pezzo e l'altro di un testo lungo. Meno di
# così le frasi si accavallano, di più sembra che il lettore si sia distratto.
RESPIRO = 0.18

# Il modello lavora a 21,53 fotogrammi al secondo (44100 / 2048): serve a
# tradurre "al massimo tanti secondi" nel numero di passi da chiedere.
FOTOGRAMMI_AL_SECONDO = 44100 / 2048

# Quanto testo per volta. Duecento caratteri sono una frase lunga, e stanno
# comodi nella finestra del modello anche con un riferimento davanti.
CARATTERI_PER_PEZZO = 200

# Dopo quanti secondi di inattività il modello lascia la scheda video. Cinque
# minuti: chi sta scrivendo la frase dopo non aspetta un ricaricamento, chi ha
# lasciato la finestra aperta non tiene occupata la memoria di un'altra app.
OZIO_MASSIMO = 300


def taglia(testo: str) -> list[str]:
    """Il testo a pezzi, dove finiscono le frasi.

    Prima si prova a chiudere sui segni forti (`.` `!` `?` e gli a capo), poi
    sulle virgole, e solo in ultimo si spezza fra due parole: un pezzo tagliato
    a metà parola si sente, uno tagliato dopo una virgola no.
    """
    testo = " ".join(testo.split())
    if not testo:
        return []

    frasi = [p.strip() for p in re.split(r"(?<=[.!?;:…])\s+", testo) if p.strip()]

    pezzi: list[str] = []
    for frase in frasi:
        if len(frase) <= CARATTERI_PER_PEZZO:
            # Si attacca alla precedente finché ci sta: due frasi corte in un
            # pezzo solo suonano meglio di due pezzi con un respiro in mezzo.
            if pezzi and len(pezzi[-1]) + 1 + len(frase) <= CARATTERI_PER_PEZZO:
                pezzi[-1] = f"{pezzi[-1]} {frase}"
            else:
                pezzi.append(frase)
            continue

        resto = frase
        while len(resto) > CARATTERI_PER_PEZZO:
            taglio = resto.rfind(",", 0, CARATTERI_PER_PEZZO)
            if taglio < CARATTERI_PER_PEZZO // 3:
                taglio = resto.rfind(" ", 0, CARATTERI_PER_PEZZO)
            if taglio <= 0:
                taglio = CARATTERI_PER_PEZZO
            pezzi.append(resto[: taglio + 1].strip())
            resto = resto[taglio + 1 :].strip()
        if resto:
            pezzi.append(resto)

    return pezzi


def nome_file(testo: str) -> str:
    """Un nome di file leggibile ricavato dalle prime parole."""
    piatto = unicodedata.normalize("NFKD", testo).encode("ascii", "ignore").decode()
    pulito = re.sub(r"[^A-Za-z0-9]+", "-", piatto).strip("-").lower()
    return (pulito[:48] or "voce").rstrip("-")


class Motore:
    """Il modello caricato, e tutto quello che ci si fa."""

    def __init__(self) -> None:
        self._id: str | None = None
        self._modello = None
        self._processore = None
        self._lucchetto = threading.Lock()
        self._ultimo_uso = 0.0
        self._guardiano: threading.Thread | None = None
        self._fermati = threading.Event()

    # ------------------------------------------------------------- lo stato

    @property
    def gpu(self) -> bool:
        return torch.cuda.is_available()

    def stato(self) -> dict:
        return {
            "gpu": self.gpu,
            "caricato": self._id,
            "modelli": [
                {
                    "id": m.id,
                    "nome": m.nome,
                    "riga": m.riga,
                    "catalogo": m.catalogo,
                    "presente": presente(m),
                }
                for m in MODELLI.values()
            ],
        }

    # -------------------------------------------------------- il caricamento

    def carica(self, id_modello: str) -> None:
        """Mette in memoria il modello chiesto, se non c'è già quello."""
        modello = MODELLI.get(id_modello) or MODELLI[PREDEFINITO]
        if self._id == modello.id and self._modello is not None:
            return

        if not presente(modello):
            raise FileNotFoundError(
                f"{modello.nome} non e' sul disco. Scaricalo dal menu dei modelli "
                "dentro l'app: sono i pesi, non un'impostazione."
            )

        self.scarica()

        base = cartella(modello)
        log.info("Carico %s da %s", modello.nome, base)
        da = time.time()

        # Import qui e non in cima: `avvio.py` deve poter mettere in `sys.path`
        # le librerie private **prima** che transformers venga importato.
        from transformers import AutoModel, AutoProcessor

        dispositivo = "cuda" if self.gpu else "cpu"
        tipo = torch.bfloat16 if self.gpu else torch.float32

        self._processore = AutoProcessor.from_pretrained(str(base), trust_remote_code=True)
        self._modello = (
            AutoModel.from_pretrained(str(base), trust_remote_code=True, dtype=tipo)
            .eval()
            .to(dispositivo)
        )
        self._id = modello.id
        self._ultimo_uso = time.time()
        self._avvia_guardiano()
        log.info("%s pronto in %.1fs su %s", modello.nome, time.time() - da, dispositivo)

    def scarica(self) -> None:
        """Toglie il modello dalla memoria: quella della scheda serve anche ad altri."""
        if self._modello is None:
            return
        log.info("Tolgo %s dalla memoria", self._id)
        self._modello = None
        self._processore = None
        self._id = None
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass

    def _avvia_guardiano(self) -> None:
        if self._guardiano and self._guardiano.is_alive():
            return

        def guarda() -> None:
            while not self._fermati.wait(30):
                if self._modello is None:
                    continue
                if time.time() - self._ultimo_uso < OZIO_MASSIMO:
                    continue
                # Il lucchetto è quello della generazione: non si scarica un
                # modello mentre sta parlando.
                if self._lucchetto.acquire(blocking=False):
                    try:
                        log.info("Cinque minuti senza lavoro: libero la memoria.")
                        self.scarica()
                    finally:
                        self._lucchetto.release()

        self._guardiano = threading.Thread(target=guarda, name="voce-guardiano", daemon=True)
        self._guardiano.start()

    def spegni(self) -> None:
        self._fermati.set()
        self.scarica()

    # ------------------------------------------------------- la generazione

    def parla(
        self,
        testo: str,
        *,
        id_modello: str = PREDEFINITO,
        riferimento: Path | None = None,
        testo_riferimento: str | None = None,
        temperatura: float = 0.7,
        seme: int | None = None,
        secondi_massimi: float = 30.0,
        nome_voce: str | None = None,
        racconta=lambda fatti, totali, cosa: None,
    ) -> dict:
        """Legge il testo e scrive un wav nella libreria. Torna i suoi dati."""
        pezzi = taglia(testo)
        if not pezzi:
            raise ValueError("Non c'e' niente da leggere.")

        with self._lucchetto:
            racconta(0, len(pezzi), "carico il modello")
            self.carica(id_modello)
            modello = MODELLI.get(id_modello) or MODELLI[PREDEFINITO]

            if seme is not None:
                torch.manual_seed(int(seme))

            dispositivo = "cuda" if self.gpu else "cpu"
            frequenza = int(self._modello.config.codec_sample_rate)
            respiro = np.zeros(int(RESPIRO * frequenza), dtype=np.float32)
            passi = int(secondi_massimi * FOTOGRAMMI_AL_SECONDO) + 8

            onde: list[np.ndarray] = []
            da = time.time()
            for i, pezzo in enumerate(pezzi):
                racconta(i, len(pezzi), "parlo")
                onde.append(self._un_pezzo(pezzo, riferimento, testo_riferimento,
                                           temperatura, passi, dispositivo))
                if i < len(pezzi) - 1:
                    onde.append(respiro)

            audio = np.concatenate(onde) if len(onde) > 1 else onde[0]
            # Una passata di volume sull'intero, non pezzo per pezzo: normalizzare
            # ogni frase per conto suo farebbe salire e scendere il volume dentro
            # allo stesso discorso.
            picco = float(np.abs(audio).max())
            if picco > 0:
                audio = audio * (0.94 / picco)

            durata = len(audio) / frequenza
            racconta(len(pezzi), len(pezzi), "salvo")

            file = self._salva(audio, frequenza, testo, {
                "titolo": testo.strip()[:80],
                "testo": testo.strip(),
                "modello": modello.nome,
                "voce": nome_voce or "di serie",
                "secondi": round(durata, 2),
                "secs": round(time.time() - da),
                "ts": int(time.time() * 1000),
            })

            self._ultimo_uso = time.time()
            return {
                "file": file.name,
                "id": f"voce/{file.name}",
                "secondi": round(durata, 2),
                "pezzi": len(pezzi),
                "impiegati": round(time.time() - da, 1),
            }

    def _un_pezzo(self, testo, riferimento, testo_riferimento, temperatura, passi, dispositivo):
        """Un pezzo di testo, generato e riportato a numeri normali."""
        argomenti: dict = {"text": [testo], "return_tensors": "pt"}
        if riferimento is not None:
            if not testo_riferimento:
                raise ValueError(
                    "Una voce di riferimento vuole anche la sua trascrizione: il modello "
                    "deve sapere cosa dice quell'audio per capire come lo dice."
                )
            argomenti["reference_audio"] = [str(riferimento)]
            argomenti["reference_text"] = [testo_riferimento]

        ingressi = self._processore(**argomenti)
        ingressi = {chiave: valore.to(dispositivo) for chiave, valore in ingressi.items()}

        with torch.inference_mode():
            uscita = self._modello.generate(
                **ingressi,
                max_new_tokens=passi,
                temperature=float(temperatura),
                top_p=0.9,
                top_k=50,
                do_sample=True,
                return_dict_in_generate=True,
            )
            onde, lunghezze = self._modello.decode_audio(uscita.codes)

        return onde[0, : int(lunghezze[0])].float().cpu().numpy()

    def _salva(self, audio: np.ndarray, frequenza: int, testo: str, meta: dict) -> Path:
        marca = time.strftime("%Y%m%d-%H%M%S")
        file = RISULTATI_DIR / f"{marca}-{nome_file(testo)}.wav"
        sf.write(str(file), audio, frequenza)
        # Il `.json` accanto è la convenzione della libreria della suite: da lì
        # ogni app legge titolo e parametri senza sapere chi ha scritto il file.
        file.with_suffix(".json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return file


# ----------------------------------------------------------------- le voci

def voci() -> list[dict]:
    """Le voci salvate: un audio di riferimento più la sua trascrizione."""
    fuori = []
    for file in sorted(VOCI_DIR.glob("*.wav")):
        meta = {}
        accanto = file.with_suffix(".json")
        if accanto.is_file():
            try:
                meta = json.loads(accanto.read_text(encoding="utf-8"))
            except Exception:
                meta = {}
        fuori.append({
            "id": file.stem,
            "nome": str(meta.get("titolo") or file.stem),
            "testo": str(meta.get("testo") or ""),
            "elemento": f"voce/voci/{file.name}",
        })
    return fuori


def percorso_voce(id_voce: str) -> Path:
    """Il wav di una voce salvata, controllando che sia davvero lì dentro."""
    file = (VOCI_DIR / f"{id_voce}.wav").resolve()
    if VOCI_DIR.resolve() not in file.parents:
        raise ValueError("Nome di voce non valido.")
    if not file.is_file():
        raise FileNotFoundError(f'La voce "{id_voce}" non c\'e\' piu\'.')
    return file


def salva_voce(nome: str, dati: bytes, estensione: str, testo: str) -> dict:
    """Mette da parte una voce: l'audio così com'è e la trascrizione accanto."""
    pulito = nome_file(nome)
    if not pulito:
        raise ValueError("Dalle un nome.")

    grezzo = VOCI_DIR / f"{pulito}{estensione}"
    grezzo.write_bytes(dati)

    # Riscritto in wav a 44,1 kHz: il modello legge il riferimento con
    # soundfile, e un formato che soundfile non conosce diventerebbe un errore
    # al momento di parlare invece che adesso, mentre lo si sta salvando.
    try:
        onda, frequenza = sf.read(str(grezzo), dtype="float32", always_2d=True)
    except Exception as exc:
        grezzo.unlink(missing_ok=True)
        raise ValueError(
            f"Non riesco a leggere questo audio ({exc}). Prova con un wav, un mp3, un flac o un ogg."
        ) from exc

    file = VOCI_DIR / f"{pulito}.wav"
    if grezzo != file:
        sf.write(str(file), onda, frequenza)
        grezzo.unlink(missing_ok=True)

    durata = len(onda) / max(1, frequenza)
    file.with_suffix(".json").write_text(
        json.dumps(
            {"titolo": nome.strip(), "testo": testo.strip(), "voce": True,
             "secondi": round(durata, 2), "ts": int(time.time() * 1000)},
            ensure_ascii=False, indent=2,
        ),
        encoding="utf-8",
    )
    return {"id": file.stem, "nome": nome.strip(), "testo": testo.strip(), "secondi": round(durata, 2)}


def elimina_voce(id_voce: str) -> None:
    file = percorso_voce(id_voce)
    file.unlink(missing_ok=True)
    file.with_suffix(".json").unlink(missing_ok=True)


motore = Motore()
