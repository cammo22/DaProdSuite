"""Avvio di ComfyUI come motore della suite.

ComfyUI non sta nel repo — è GPL-3.0 e la suite è MIT, quindi viene scaricato in
`%LOCALAPPDATA%\\DaProdSuite\\engines\\ComfyUI`. Qui c'è solo il codice nostro che
lo mette nelle condizioni giuste: dove sono i pesi, dove finiscono i risultati,
quali flag servono, e il ponte con cui lo shell gli chiede se è pronto.

Lo shell non passa argomenti: passa variabili d'ambiente, perché la ServiceConfig
del supervisore è uguale per tutti i motori e non deve conoscere i flag di questo.

| Variabile | Cosa dice |
|---|---|
| `DAPROD_MOTORE` | cartella di ComfyUI |
| `DAPROD_MODELLI` | cartella unica dei pesi, condivisa fra le app |
| `DAPROD_RISULTATI` | dove salvare (una sottocartella di output/ per app) |
| `DAPROD_TEMPORANEI` | file rigenerabili: anteprime, copertine prima del ritaglio |
| `DAPROD_PORTA` | porta dichiarata nel catalogo |

I flag sono quelli misurati in MinimaxMusica e non sono opzionali:
`--disable-dynamic-vram` perché i 5,5 GB dell'encoder devono stare *tutti* in
VRAM (con il caricamento dinamico i pesi arrivano dalla CPU durante la cattura
dei CUDA graph, che aborta con `cudaErrorStreamCaptureInvalidated` e porta giù il
motore) e `--enable-cors-header` perché la pagina dell'app non è servita da
ComfyUI ma dallo schema `daprod://`.
"""

import os
import runpy
import subprocess
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent

# Chiavi dei pesi che la suite condivide. Sono i nomi che ComfyUI usa per le sue
# cartelle: elencarli qui significa che tutte le app cercano nello stesso posto.
CARTELLE_MODELLI = [
    "checkpoints",
    "diffusion_models",
    "text_encoders",
    "clip_vision",
    "vae",
    "loras",
    "controlnet",
    "upscale_models",
    "embeddings",
    "audio_encoders",
    # Dalla 1.4.0, per il 3D: BiRefNet stacca il soggetto dallo sfondo prima che
    # TRELLIS.2 lo guardi. ComfyUI 0.37 ha una cartella apposta.
    "background_removal",
]


def _richiesta(nome: str) -> Path:
    valore = os.environ.get(nome)
    if not valore:
        raise SystemExit(
            f"Manca la variabile {nome}: questo motore va avviato dalla suite, non a mano."
        )
    return Path(valore)


def scrivi_percorsi(motore: Path, modelli: Path) -> Path:
    """Genera il file che dice a ComfyUI dove sono i pesi e i nodi.

    Riscritto a ogni avvio invece che una volta all'installazione: se la suite
    viene spostata o i modelli cambiano posto, il file è già giusto al riavvio
    successivo e non resta a puntare a una cartella che non esiste più.
    """
    righe = ["# Generato da services/comfy/avvio.py a ogni avvio: le modifiche a mano si perdono.", "daprod:"]
    righe.append(f"    base_path: {modelli.as_posix()}")
    for cartella in CARTELLE_MODELLI:
        righe.append(f"    {cartella}: {cartella}")
    # I nodi nostri restano nel repo e vengono solo indicati: copiarli dentro
    # ComfyUI vorrebbe dire ricopiarli a ogni aggiornamento della suite, e
    # lasciarne indietro di vecchi quando ne cambia il nome.
    righe.append("")
    righe.append("nodi_daprod:")
    righe.append(f"    custom_nodes: {(QUI / 'nodi').as_posix()}")
    # I nodi di terzi che la suite scarica (ComfyUI-GGUF e quelli che verranno):
    # stanno accanto al motore e non dentro, così sopravvivono a un suo
    # aggiornamento e restano distinguibili da quello che ComfyUI si porta dietro.
    righe.append("")
    righe.append("nodi_terzi:")
    righe.append(f"    custom_nodes: {nodi_di_terzi(motore).as_posix()}")

    percorso = motore.parent / "percorsi-daprod.yaml"
    percorso.write_text("\n".join(righe) + "\n", encoding="utf-8")
    return percorso


def nodi_di_terzi(motore: Path) -> Path:
    """`engines/custom_nodes`, la stessa che riempie packages/runtime/nodi.ts."""
    return motore.parent / "custom_nodes"


# La risposta di `con_cuda()`, calcolata una volta sola.
_cuda: "bool | None" = None
# La memoria video della scheda, in GB (0 se non si sa), con la stessa domanda.
_vram: float = 0.0


def con_cuda() -> bool:
    """C'è una scheda NVIDIA utilizzabile da torch su questa macchina?

    **Il difetto che questa funzione risolve.** Su un PC senza NVIDIA il motore
    moriva in avvio, prima ancora di aprire la porta::

        comfy/model_management.py, in get_torch_device
            return torch.device(torch.cuda.current_device())
        AssertionError: Torch not compiled with CUDA enabled

    ComfyUI dà per scontato CUDA e va detto **lui** che non c'è, con `--cpu`.
    Da fuori si vedeva solo una scheda che non si apriva: il supervisore
    aspettava `/health` da un processo già morto.

    Si chiede a torch e non a `nvidia-smi`: quello che conta non è che la scheda
    esista, è che *questa* build di torch la sappia usare. Una macchina con una
    NVIDIA e un torch per CPU installato sopra deve andare in CPU, non fingere.

    **La domanda si fa in un processo a parte, e non è un vezzo.** La prima
    versione importava torch qui, e ComfyUI in avvio ha cominciato a scrivere
    *«WARNING: Torch already imported, torch should never be imported before
    this point»*: prima di importarlo lui prepara delle variabili d'ambiente, e
    un import anticipato gliele porta via. Un sottoprocesso risponde alla stessa
    domanda senza che in questo processo torch entri mai.

    La risposta si tiene da parte: il sottoprocesso costa qualche secondo e la
    domanda arriva tre volte.
    """
    global _cuda, _vram
    if _cuda is not None:
        return _cuda

    try:
        # 1.5.2: nella stessa domanda anche quanta memoria ha la scheda, per
        # scegliere da soli come spingere il motore (vedi `flag_nvidia`).
        esito = subprocess.run(
            [
                sys.executable,
                "-c",
                "import torch; ok = torch.cuda.is_available(); "
                "print(round(torch.cuda.get_device_properties(0).total_memory / 2**30, 1) if ok else 0); print(int(ok))",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        righe = esito.stdout.strip().splitlines()
        _cuda = bool(righe) and righe[-1].strip() == "1"
        try:
            _vram = float(righe[-2]) if len(righe) >= 2 else 0.0
        except ValueError:
            _vram = 0.0
    except Exception:
        # Senza torch il motore non parte comunque: qui si sceglie solo la
        # strada meno rumorosa, l'errore vero lo darà ComfyUI un attimo dopo.
        _cuda = False
    return _cuda


def flag_dispositivo() -> list[str]:
    """`--cpu` quando non c'è CUDA, niente quando c'è.

    Su CPU tutto funziona ma **va molto più piano**: un'immagine con Anima passa
    da secondi a minuti, e i modelli grossi (Qwen-Image 2.1, YuE2, TRELLIS.2) sono
    fuori portata per pazienza prima ancora che per memoria. È comunque meglio
    di un motore che non si accende.
    """
    return [] if con_cuda() else ["--cpu"]


def flag_velocita(scelta: str) -> list[str]:
    """I flag che cambiano a seconda di quanto si vuole spingere il motore.

    **Tutte e due tengono `--disable-dynamic-vram`.** Il primo giro di questo
    interruttore lo toglieva, perché è quel flag a spegnere i CUDA graph sulla
    parte lenta della musica: il motore parte lo stesso e dice "DynamicVRAM
    support detected and enabled", ma **le generazioni danno errore** — con 8 GB
    e questi modelli il caricamento dinamico non regge, come già l'anno scorso.
    Resta scritto in docs/VELOCITA-MUSICA.md: provato, non funziona, non si
    riprova finché non cambia qualcosa a monte.

    Quindi **spinta** è quello che si può davvero accendere oggi:

    - `--fast`: accumulazione in fp16, cublas_ops, autotune. Tocca soprattutto la
      diffusione, che è il 18% del tempo di un brano e quasi tutto in un'immagine.
    - `--use-flash-attention`, ma **solo se `flash_attn` è installata**: il flag
      su un ambiente che non ce l'ha farebbe uscire il motore in avvio invece di
      ripiegare da solo.

    **normale** resta la configurazione con cui abbiamo generato finora, e va
    tenuta come metro di paragone: se spinta dà problemi si torna lì.
    """
    # Senza CUDA non c'è niente da regolare: `--disable-dynamic-vram` parla di
    # memoria video, `--fast` e flash-attention sono percorsi CUDA. Passarli a un
    # motore in CPU nel migliore dei casi non fa niente, nel peggiore lo fa
    # uscire in avvio — che è esattamente il difetto da cui nasce `--cpu`.
    if not con_cuda():
        return []

    flag = ["--disable-dynamic-vram"]
    if scelta != "spinta":
        return flag

    flag.append("--fast")
    # L'attenzione veloce (sage o flash) la mette `flag_nvidia`, sempre: qui
    # resta solo quello che cambia davvero fra normale e spinta.
    return flag


def ram_gb() -> float:
    """La memoria del computer, in GB. Zero se non si riesce a leggerla."""
    try:
        if sys.platform == "win32":
            import ctypes

            class Stato(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            st = Stato()
            st.dwLength = ctypes.sizeof(Stato)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st))
            return st.ullTotalPhys / 2**30
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2**30
    except Exception:
        return 0.0


def conosce(motore: Path, flag: str) -> bool:
    """Questo ComfyUI conosce il flag? Si guarda nel suo `cli_args.py`.

    ⚠ **Un flag che ComfyUI non conosce lo fa uscire in avvio** (argparse), e il
    motore non si accende piu'. I flag nuovi — l'offload asincrono, la sage
    attention — cambiano da una versione all'altra: prima di passarli si
    controlla che ci siano, cosi' un ComfyUI vecchio parte lo stesso.
    """
    try:
        testo = (motore / "comfy" / "cli_args.py").read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False
    return ('"' + flag + '"') in testo or ("'" + flag + "'") in testo


def c_e_il_modulo(nome: str) -> bool:
    """Il modulo Python c'e', senza importarlo (niente torch prima di ComfyUI)."""
    try:
        import importlib.util

        return importlib.util.find_spec(nome) is not None
    except Exception:
        return False


def flag_nvidia(motore: Path) -> list[str]:
    """⚠ **Le ottimizzazioni NVIDIA, dalla 1.5.2, sempre accese quando si puo'.**

    Chiesto il 26 settembre 2026: «pensa al codice robusto e ottimizzato per
    NVIDIA e tanta RAM di offload». Qwen-Image 2.1 in Q4 sono 12 GB di pesi piu'
    5,6 del lettore, YuE2 e TRELLIS.2 altrettanti: sulle schede di casa non ci
    stanno tutti insieme, e il tempo lo decide **come si spostano fra scheda e
    RAM**, non la scheda.

    - **L'attenzione piu' veloce che c'e'**: SageAttention se e' installata
      (su Qwen-Image e' la differenza piu' grossa), se no FlashAttention.
    - **L'offload asincrono** (`--async-offload`), quando la RAM e' tanta (dai
      24 GB in su): i pesi che non stanno in scheda si caricano mentre la
      scheda lavora, invece che uno dopo l'altro. Con la RAM corta si lascia
      stare: la memoria bloccata che serve per farlo toglierebbe spazio al
      resto del computer.
    - **Un margine piccolo in scheda** (`--reserve-vram`) se nessun profilo ne
      ha gia' scelto uno: il desktop di Windows e il browser usano la scheda
      anche loro, e senza margine l'ultimo passo del VAE va fuori memoria.

    Ogni flag passa solo se questo ComfyUI lo conosce (`conosce`), e i moduli
    si cercano senza importarli: un motore vecchio parte comunque.
    """
    if not con_cuda():
        return []
    flag: list[str] = []
    if c_e_il_modulo("sageattention") and conosce(motore, "--use-sage-attention"):
        flag.append("--use-sage-attention")
    elif c_e_il_modulo("flash_attn") and conosce(motore, "--use-flash-attention"):
        flag.append("--use-flash-attention")
    if ram_gb() >= 24 and conosce(motore, "--async-offload"):
        flag.append("--async-offload")
    return flag


def flag_memoria(scelta: str) -> list[str]:
    """Quanta memoria video lasciar prendere al motore.

    E' l'altra manopola accanto alla velocita', e risponde a una domanda
    diversa: non *quanto in fretta* ma *quanto spazio*. Su una scheda da 8 GB e'
    la scelta che decide se una cosa entra o non entra, ed e' l'unica manovra
    che salva una generazione che va in errore di memoria.

    | | Cosa fa ComfyUI | Quando serve |
    |---|---|---|
    | leggero | `--lowvram`, e un giro e mezzo di GB tenuti da parte | scheda piccola, o altro aperto mentre generi |
    | bilanciato | quello che sceglie da se' | come abbiamo generato finora |
    | qualita' | `--highvram`, e quasi niente da parte | niente altro aperto, e la seconda immagine non ricarica nulla |

    **`--reserve-vram` e' il pezzo che conta davvero in leggero.** Dice al
    motore di lasciare liberi tot GB invece di prendersi tutto quello che vede:
    e' quello spazio che permette a LM Studio di restare acceso mentre generi,
    o al desktop di non impastarsi. Senza, "lowvram" sposta i pesi ma poi si
    riprende comunque tutto il resto.

    Come per la velocita', senza CUDA non c'e' niente da regolare: sono tutti
    flag che parlano di memoria video, e a un motore in CPU nel migliore dei
    casi non dicono niente.
    """
    if not con_cuda():
        return []

    if scelta == "leggero":
        return ["--lowvram", "--reserve-vram", "1.5"]
    if scelta == "qualita":
        return ["--highvram", "--reserve-vram", "0.3"]
    # 1.5.2: bilanciato lascia comunque mezzo GB al desktop, se la scheda e'
    # piccola: con 8-12 GB e' quello che salva il VAE dell'ultimo passo.
    if 0 < _vram <= 16:
        return ["--reserve-vram", "0.6"]
    return []


def main() -> None:
    motore = _richiesta("DAPROD_MOTORE")
    modelli = _richiesta("DAPROD_MODELLI")
    risultati = _richiesta("DAPROD_RISULTATI")
    temporanei = _richiesta("DAPROD_TEMPORANEI")
    porta = os.environ.get("DAPROD_PORTA", "8188")

    principale = motore / "main.py"
    if not principale.exists():
        raise SystemExit(
            f"ComfyUI non è in {motore}. Va scaricato prima di aprire l'app: "
            "è il motore di Musica, Foto e Cinema."
        )

    # La cartella dei nodi di terzi va creata anche se è vuota: ComfyUI fa
    # os.listdir su ogni percorso di custom_nodes che gli diciamo, e su una
    # cartella che non c'è muore in avvio prima ancora di aprire la porta.
    for cartella in (modelli, risultati, temporanei, nodi_di_terzi(motore)):
        cartella.mkdir(parents=True, exist_ok=True)

    percorsi = scrivi_percorsi(motore, modelli)

    sys.argv = [
        str(principale),
        "--port", str(porta),
        "--listen", "127.0.0.1",
        "--disable-auto-launch",
        "--enable-cors-header", "*",
        "--extra-model-paths-config", str(percorsi),
        "--output-directory", str(risultati),
        "--temp-directory", str(temporanei),
        *flag_dispositivo(),
        *flag_velocita(os.environ.get("DAPROD_VELOCITA", "normale")),
        *flag_nvidia(motore),
        *flag_memoria(os.environ.get("DAPROD_PROFILO", "bilanciato")),
    ]

    if con_cuda():
        print(
            f"[daprod] NVIDIA con {_vram:g} GB, RAM {ram_gb():.0f} GB. Flag: "
            + " ".join(x for x in sys.argv[1:] if x.startswith("--use") or x in ("--fast", "--async-offload", "--lowvram", "--highvram")),
            flush=True,
        )

    if not con_cuda():
        print(
            "[daprod] Nessuna GPU NVIDIA utilizzabile da torch: il motore parte "
            "in CPU. Funziona, ma va molto piu' piano.",
            flush=True,
        )

    # ComfyUI si aspetta di girare dalla propria cartella: legge percorsi
    # relativi e importa i suoi moduli senza pacchetto.
    os.chdir(motore)
    sys.path.insert(0, str(motore))
    runpy.run_path(str(principale), run_name="__main__")


if __name__ == "__main__":
    main()
