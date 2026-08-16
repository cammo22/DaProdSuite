"""Backend img2img basato su Diffusers, pensato per 8 GB di VRAM.

Scelte che fanno la differenza sul realtime (misurate su RTX 4060 8 GB):
- il modello si carica una volta sola e resta in GPU;
- VAE minuscola TAESD al posto di quella originale: la VAE piena costava 230 ms
  per frame (encode + decode), TAESD ne costa meno di 10;
- i prompt vengono codificati solo quando cambiano, non a ogni frame;
- il frame entra ed esce come tensore GPU, senza giri su PIL;
- si lavora in FP16, batch 1, senza safety checker;
- il numero di step passato alla pipeline è ricalcolato dalla strength, così
  "2 step" sono davvero 2 passaggi di denoise e non 0.
"""

from __future__ import annotations

import gc
import logging
import math
import os
import threading
import time
from pathlib import Path

import numpy as np

from ..config import CHECKPOINTS_DIR, DIFFUSERS_DIR, LORAS_DIR
from ..params import DreamParams
from ..profondita import StimatoreProfondita
from ..segmentazione import Segmentatore
from .base import InferenceBackend, ModelLoadError

log = logging.getLogger("daproddream.diffusers")

# ControlNet che legge la mappa di profondità, uno per famiglia di modelli.
# La famiglia si riconosce dalla dimensione della cross-attention della UNet.
CONTROLNET_PROFONDITA = {
    1024: "thibaud/controlnet-sd21-depth-diffusers",  # SD 2.1, come SD-Turbo
    768: "lllyasviel/control_v11f1p_sd15_depth",  # SD 1.5
}

# Modelli provati su RTX 4060 8 GB.
KNOWN_MODELS: dict[str, dict] = {
    "stabilityai/sd-turbo": {
        "label": "SD-Turbo",
        "family": "turbo",
        # In teoria i modelli turbo vanno usati senza guidance. In pratica fino a
        # 5 obbediscono al prompt molto di più senza rompersi: misurato, la
        # differenza fra due prompt diversi passa da 21 a 49 su 255.
        "guidance_max": 6.0,
        "steps_hint": 1,
        "size_gb": 2.5,
    },
}


def available_models() -> list[dict]:
    """Modelli noti + eventuali .safetensors messi in models/checkpoints."""
    out = [{"id": mid, **meta} for mid, meta in KNOWN_MODELS.items()]
    try:
        for f in sorted(CHECKPOINTS_DIR.glob("*.safetensors")):
            out.append(
                {
                    "id": str(f),
                    "label": f"{f.stem} (locale)",
                    "family": "sd15",
                    "guidance_max": 8.0,
                    "steps_hint": 6,
                    "size_gb": round(f.stat().st_size / 1e9, 1),
                    "local": True,
                }
            )
    except Exception as exc:
        log.warning("Scansione checkpoint locali fallita: %s", exc)
    return out


def available_loras() -> list[dict]:
    try:
        return [
            {"name": f.stem, "path": str(f), "size_mb": round(f.stat().st_size / 1e6)}
            for f in sorted(LORAS_DIR.glob("*.safetensors"))
        ]
    except Exception:
        return []


class GrafoDenoise:
    """UNet (ed eventuale ControlNet) catturate in un CUDA graph, rigiocate con un lancio solo.

    Perché serve: la UNet è fatta di 709 moduli e a 512x512 il tempo se ne va
    tutto in *lancio* dei kernel dalla CPU (misurato: 47 ms di calcolo, 47 ms di
    lancio — la GPU aspetta ferma a 210 MHz). Catturando la sequenza una volta,
    ogni frame diventa una replay sola: la GPU riceve tutto in blocco.

    Le forme devono restare identiche, quindi il grafo si ricattura quando
    cambia risoluzione o si accende/spegne la guidance.
    """

    def __init__(self, unet, forma_latente, forma_testo, dtype, device, controlnet=None, forma_hint=None):
        import torch

        self.lat = torch.zeros(forma_latente, dtype=dtype, device=device)
        self.testo = torch.zeros(forma_testo, dtype=dtype, device=device)
        self.t = torch.zeros((), dtype=torch.float32, device=device)
        self.controlnet = controlnet
        self.hint = (
            torch.zeros(forma_hint, dtype=dtype, device=device) if controlnet is not None else None
        )
        # La forza del ControlNet è un tensore e non un numero: se fosse un float
        # resterebbe cotto dentro il grafo e lo slider non farebbe più niente.
        self.forza = torch.ones((), dtype=dtype, device=device) if controlnet is not None else None

        def passo():
            if self.controlnet is None:
                return unet(self.lat, self.t, encoder_hidden_states=self.testo, return_dict=False)[0]
            giu, mezzo = self.controlnet(
                self.lat,
                self.t,
                encoder_hidden_states=self.testo,
                controlnet_cond=self.hint,
                conditioning_scale=1.0,
                return_dict=False,
            )
            giu = [r * self.forza for r in giu]
            return unet(
                self.lat,
                self.t,
                encoder_hidden_states=self.testo,
                down_block_additional_residuals=giu,
                mid_block_additional_residual=mezzo * self.forza,
                return_dict=False,
            )[0]

        # Riscaldamento su uno stream separato: lo richiede la cattura.
        stream = torch.cuda.Stream()
        stream.wait_stream(torch.cuda.current_stream())
        with torch.cuda.stream(stream), torch.no_grad():
            for _ in range(3):
                passo()
        torch.cuda.current_stream().wait_stream(stream)
        torch.cuda.synchronize()

        self.grafo = torch.cuda.CUDAGraph()
        with torch.no_grad(), torch.cuda.graph(self.grafo):
            self.uscita = passo()

    def __call__(self, latents, timestep, testo, hint=None, forza=1.0):
        self.lat.copy_(latents)
        self.testo.copy_(testo)
        self.t.copy_(timestep)
        if self.hint is not None and hint is not None:
            self.hint.copy_(hint)
            self.forza.fill_(forza)
        self.grafo.replay()
        return self.uscita


def carica_pesi(classe, repo: str, **kwargs):
    """Prima cerca nella cache locale, poi in rete.

    Serve a due cose: l'app parte anche senza connessione (i pesi sono già lì
    dopo il primo avvio), e si risparmia il giro di metadati verso l'Hub a ogni
    caricamento. Se l'Hub è irraggiungibile ma il modello c'è, prima l'app si
    rifiutava di partire.
    """
    try:
        return classe.from_pretrained(repo, local_files_only=True, **kwargs)
    except Exception as exc:
        log.info("%s non in cache (%s): lo scarico", repo, type(exc).__name__)
        return classe.from_pretrained(repo, **kwargs)


def model_meta(model_id: str) -> dict:
    if model_id in KNOWN_MODELS:
        return KNOWN_MODELS[model_id]
    return {"label": Path(model_id).stem, "family": "sd15", "guidance_max": 8.0, "steps_hint": 6}


class DiffusersBackend(InferenceBackend):
    name = "diffusers"

    # VAE leggera compatibile con SD 1.x / 2.x (sd-turbo è basato su SD 2.1).
    #
    # Dentro la suite è una cartella sul disco, scaricata insieme al modello
    # (`manifest/models.json`, id `taesd`): il nome del repo resta come ripiego
    # per chi avvia il motore fuori dalla suite, dove quella cartella non c'è.
    TINY_VAE = (
        str(DIFFUSERS_DIR / "taesd")
        if (DIFFUSERS_DIR / "taesd").exists()
        else "madebyollin/taesd"
    )

    def __init__(self):
        self.pipe = None
        self.model_id = ""
        self.meta: dict = {}
        self.device = "cpu"
        self.dtype = None
        self._lock = threading.Lock()
        self._embed_cache: dict = {}
        self._cached_key = None
        self._loaded_loras: list[str] = []
        self._prev_out = None  # ultimo output, per la stabilità temporale
        self._full_vae = None
        self._tiny_vae = None
        self._fast_vae = True
        self._veloce = True  # ciclo di denoise scritto a mano invece della pipeline
        self._usa_grafi = True
        self._pronto = False
        self._ultimi_passi = 1
        self._grafi: dict = {}
        self.controlnet = None
        self.profondita = StimatoreProfondita()
        self.segmentatore = Segmentatore()
        self._pa = self._pb = self._pbase = None  # passeggiata del sogno libero
        self._pt = 0.0
        self.load_seconds = 0.0

    # ------------------------------------------------------------------ load

    def load(self, params: DreamParams, progress=None) -> None:
        import torch

        def say(msg, pct=None):
            log.info(msg)
            if progress:
                progress(msg, pct)

        self.unload()
        started = time.perf_counter()

        if torch.cuda.is_available():
            self.device, self.dtype = "cuda", torch.float16
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            # benchmark=True rifà l'autotune a ogni nuova risoluzione e blocca il video
            # per secondi: sulle nostre dimensioni non guadagna niente, quindi resta spento.
            torch.backends.cudnn.benchmark = False
            free = torch.cuda.mem_get_info()[0] / 1e9
            if free < 3.0:
                say(
                    f"Attenzione: solo {free:.1f} GB di VRAM liberi. "
                    "Chiudi giochi o browser pesanti se il caricamento fallisce."
                )
        else:
            self.device, self.dtype = "cpu", torch.float32
            say("CUDA non disponibile: il motore girerà su CPU, molto lentamente.")

        model_id = params.model or "stabilityai/sd-turbo"
        self.meta = model_meta(model_id)
        is_local_file = model_id.lower().endswith(".safetensors")

        say(f"Preparo {self.meta.get('label', model_id)}…", 5)

        from diffusers import AutoPipelineForImage2Image, StableDiffusionImg2ImgPipeline

        say("Leggo il modello dal disco…", 20)

        common = dict(
            torch_dtype=self.dtype,
            safety_checker=None,
            requires_safety_checker=False,
        )
        try:
            if is_local_file:
                if not Path(model_id).exists():
                    raise ModelLoadError(f"File modello non trovato: {model_id}")
                pipe = StableDiffusionImg2ImgPipeline.from_single_file(model_id, **common)
            else:
                try:
                    pipe = carica_pesi(
                        AutoPipelineForImage2Image, model_id, variant="fp16", **common
                    )
                except Exception:
                    # Non tutti i repo pubblicano la variante fp16.
                    pipe = carica_pesi(AutoPipelineForImage2Image, model_id, **common)
        except ModelLoadError:
            raise
        except OSError as exc:
            raise ModelLoadError(
                f"Modello non scaricabile ({model_id}). Serve la rete al primo avvio, "
                f"oppure metti un .safetensors in models/checkpoints. Dettaglio: {exc}"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Caricamento fallito ({model_id}): {exc}") from exc

        pipe.set_progress_bar_config(disable=True)

        family = self.meta.get("family", "sd15")
        if family == "lcm" and self.meta.get("lcm_lora"):
            from diffusers import LCMScheduler

            say("Applico LCM per scendere a pochi step…")
            try:
                pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
                pipe.load_lora_weights(self.meta["lcm_lora"], adapter_name="lcm")
                pipe.fuse_lora(adapter_names=["lcm"], lora_scale=1.0)
                pipe.unload_lora_weights()
            except Exception as exc:
                log.warning("LCM non applicato: %s", exc)
                say("LCM non disponibile: uso lo scheduler normale (servono più step).")

        say("Porto il modello sulla GPU…", 45)
        try:
            pipe.to(self.device)
        except Exception as exc:
            self.pipe = None
            self._free_cuda()
            raise ModelLoadError(
                "Memoria GPU insufficiente per caricare il modello. "
                f"Chiudi altri programmi che usano la GPU. Dettaglio: {exc}"
            ) from exc

        if self.device == "cuda":
            try:
                pipe.unet.to(memory_format=torch.channels_last)
                pipe.vae.to(memory_format=torch.channels_last)
            except Exception:
                pass

        self.pipe = pipe
        self._pronto = False
        self.model_id = model_id
        self._full_vae = pipe.vae
        self._tiny_vae = None
        self._embed_cache.clear()
        self._cached_key = None
        self._loaded_loras = []
        self._prev_out = None
        self._apply_loras(params, say)
        say("Riconoscimento dei soggetti…", 55)
        try:
            self.segmentatore.carica(self.device, self.dtype)
        except Exception as exc:
            log.warning("Riconoscitore non disponibile: %s", exc)
        say("VAE veloce…", 60)
        self.set_fast_vae(bool(getattr(params, "fast_vae", True)), say)
        # La profondità si carica qui, insieme al modello: accenderla a metà
        # sessione vorrebbe dire aspettare mezzo giga di download col video fermo.
        if bool(getattr(params, "depth", False)):
            say("Comprensione della profondità…", 70)
            self.set_profondita(True, say)

        self.load_seconds = time.perf_counter() - started
        log.info("Modello caricato in %.1f s", self.load_seconds)

        # Un giro a vuoto: la primissima inferenza costruisce i kernel CUDA ed è
        # lentissima. Meglio pagarla qui che sul primo frame dell'utente.
        say("Riscaldo la GPU…", 85)
        try:
            warm = np.zeros((*params.size()[::-1], 3), dtype=np.uint8)
            self.process(warm, params)
            self._prev_out = None
        except Exception as exc:
            log.warning("Warm-up non riuscito: %s", exc)
        self._pronto = True
        say(f"Modello pronto in {time.perf_counter() - started:.1f} s.", 100)

    def set_profondita(self, attiva: bool, say=None) -> None:
        """Accende o spegne la comprensione della profondità (ControlNet + stimatore).

        Attenzione all'ordine: catturare un CUDA graph **mentre un altro thread usa
        la GPU** rompe la cattura e fa fallire anche l'inferenza in corso
        ("operation not permitted when stream is capturing"). Perciò il download e
        la costruzione su CPU stanno fuori dal lock, mentre tutto ciò che tocca la
        GPU sta dentro, dove il ciclo di inferenza non può intromettersi.
        """
        if self.pipe is None:
            return

        if not attiva:
            if self.controlnet is not None or self.profondita.pronto:
                with self._lock:
                    self.controlnet = None
                    self.profondita.scarica()
                    self._grafi.clear()
                self._free_cuda()
                log.info("Profondità spenta")
            return

        if self.controlnet is not None and self.profondita.pronto:
            return

        dim = self.pipe.unet.config.cross_attention_dim
        repo = CONTROLNET_PROFONDITA.get(dim)
        if repo is None:
            if say:
                say(f"Nessun ControlNet di profondità per questo modello (dim {dim}).")
            return

        try:
            from diffusers import ControlNetModel

            if say:
                say("Scarico la comprensione della profondità…")
            # Fuori dal lock: qui si va su disco e in rete, non sulla GPU.
            rete = carica_pesi(ControlNetModel, repo, torch_dtype=self.dtype)
        except Exception as exc:
            log.warning("ControlNet di profondità non disponibile: %s", exc)
            if say:
                say(f"Profondità non scaricabile: {exc}")
            return

        try:
            with self._lock:
                self.controlnet = rete.to(self.device)
                self.profondita.carica(self.device, self.dtype)
                self._grafi.clear()
            if say:
                say("Profondità attiva: il modello vede i volumi della scena.")
        except Exception as exc:
            log.warning("Profondità non attivabile: %s", exc)
            with self._lock:
                self.controlnet = None
                self.profondita.scarica()
                self._grafi.clear()
            self._free_cuda()
            if say:
                say(f"Profondità non attivata: {exc}")

    def set_fast_vae(self, enabled: bool, say=None) -> None:
        """Sostituisce la VAE con TAESD: è la differenza tra 2 e 10 fps."""
        if self.pipe is None:
            self._fast_vae = enabled
            return
        if enabled == self._fast_vae and self.pipe.vae is not None:
            if enabled and self._tiny_vae is not None and self.pipe.vae is self._tiny_vae:
                return
            if not enabled and self.pipe.vae is self._full_vae:
                return

        if enabled:
            if self._tiny_vae is None:
                try:
                    from diffusers import AutoencoderTiny

                    if say:
                        say("Carico la VAE veloce (TAESD)…")
                    piccola = carica_pesi(
                        AutoencoderTiny, self.TINY_VAE, torch_dtype=self.dtype
                    )
                except Exception as exc:
                    log.warning("TAESD non disponibile: %s", exc)
                    if say:
                        say("VAE veloce non scaricabile: uso quella originale (più lenta).")
                    self._fast_vae = False
                    with self._lock:
                        self.pipe.vae = self._full_vae
                    return
                with self._lock:
                    self._tiny_vae = piccola.to(self.device)

        # Lo scambio tocca la pipeline mentre l'inferenza potrebbe girare: sotto lock.
        with self._lock:
            self.pipe.vae = self._tiny_vae if enabled else self._full_vae
            self._fast_vae = enabled
            self._prev_out = None

    def _apply_loras(self, params: DreamParams, say=None) -> None:
        if not self.pipe:
            return
        wanted = [l for l in (params.loras or []) if l.get("name")]
        signature = [f"{l['name']}:{l.get('weight', 1.0)}" for l in wanted]
        if signature == self._loaded_loras:
            return  # niente da fare: nessun lock, così scrivere nel prompt non frena il video
        with self._lock:
            self._carica_loras(wanted, signature, say)

    def _carica_loras(self, wanted: list, signature: list, say=None) -> None:
        try:
            self.pipe.unload_lora_weights()
        except Exception:
            pass
        self._loaded_loras = []
        # I grafi hanno catturato i pesi di prima: con altre LoRA non valgono più.
        self._grafi.clear()
        if not wanted:
            self._embed_cache.clear()
            return

        names, weights = [], []
        for lora in wanted:
            path = LORAS_DIR / f"{lora['name']}.safetensors"
            if not path.exists():
                log.warning("LoRA non trovata: %s", path)
                continue
            adapter = lora["name"].replace(".", "_").replace(" ", "_")
            try:
                self.pipe.load_lora_weights(str(path), adapter_name=adapter)
                names.append(adapter)
                weights.append(float(lora.get("weight", 1.0)))
            except Exception as exc:
                log.warning("LoRA %s non caricata: %s", lora["name"], exc)
                if say:
                    say(f"LoRA {lora['name']} non compatibile con questo modello.")
        if names:
            try:
                self.pipe.set_adapters(names, adapter_weights=weights)
                self._loaded_loras = signature
            except Exception as exc:
                log.warning("set_adapters fallito: %s", exc)
        self._embed_cache.clear()

    # ---------------------------------------------------------------- unload

    def unload(self) -> None:
        with self._lock:
            if self.pipe is not None:
                log.info("Scarico il modello %s", self.model_id)
            self.pipe = None
            self._pronto = False
            self.model_id = ""
            self._embed_cache.clear()
            self._cached_key = None
            self._loaded_loras = []
            self._prev_out = None
            self._full_vae = None
            self._tiny_vae = None
            self._grafi.clear()
            self.controlnet = None
            self.profondita.scarica()
            self.segmentatore.scarica()
        self._free_cuda()

    @staticmethod
    def _free_cuda() -> None:
        gc.collect()
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
        except Exception:
            pass

    @property
    def ready(self) -> bool:
        # Non basta avere la pipeline in mano: finché non è passata dal
        # riscaldamento l'interfaccia non deve dire che è pronta.
        return self.pipe is not None and self._pronto

    def on_params_changed(self, params: DreamParams) -> None:
        # La profondità non si tocca da qui: la accende il motore in un thread suo,
        # perché scarica dei pesi e cattura un grafo (vedi set_profondita).
        if self.pipe is not None:
            self._apply_loras(params)
            self.set_fast_vae(bool(getattr(params, "fast_vae", True)))

    def reset_temporal(self) -> None:
        """Dimentica il frame precedente e ricomincia la passeggiata."""
        self._prev_out = None
        self._pa = self._pb = self._pbase = None
        self._pt = 0.0

    # --------------------------------------------------------------- inferenza

    def _embeds(self, params: DreamParams, cfg: bool):
        testo = params.prompt_effettivo or params.prompt
        contro = params.negativo_effettivo or params.negative_prompt
        key = (testo, contro, cfg, tuple(self._loaded_loras))
        if key == self._cached_key:
            return self._embed_cache["pos"], self._embed_cache["neg"]

        import torch

        with torch.no_grad():
            pos, neg = self.pipe.encode_prompt(
                prompt=testo or "",
                device=self.pipe._execution_device,
                num_images_per_prompt=1,
                do_classifier_free_guidance=cfg,
                negative_prompt=(contro or "") if cfg else None,
            )
        self._embed_cache = {"pos": pos, "neg": neg}
        self._cached_key = key
        return pos, neg

    def _grafo_unet(self, forma_latente, forma_testo, forma_hint=None):
        """Restituisce il grafo per queste forme, catturandolo la prima volta."""
        if not self._usa_grafi or self.device != "cuda":
            return None
        chiave = (tuple(forma_latente), tuple(forma_testo), tuple(forma_hint or ()))
        if chiave in self._grafi:
            return self._grafi[chiave]

        import torch

        try:
            inizio = time.perf_counter()
            grafo = GrafoDenoise(
                self.pipe.unet,
                forma_latente,
                forma_testo,
                self.dtype,
                self.device,
                controlnet=self.controlnet if forma_hint else None,
                forma_hint=forma_hint,
            )
            log.info(
                "Denoise catturato in un CUDA graph per %s%s in %.1f s",
                tuple(forma_latente),
                " con profondità" if forma_hint else "",
                time.perf_counter() - inizio,
            )
        except Exception as exc:
            log.warning("CUDA graph non disponibile (%s): resto sul percorso normale", exc)
            self._usa_grafi = False
            self._grafi.clear()
            torch.cuda.empty_cache()
            return None

        # Ogni grafo si porta dietro un pezzo di VRAM, ma tenerne solo due voleva
        # dire ricatturarli in continuazione passando fra Trasforma e Sogno
        # libero (forme diverse), con mezzo secondo di blocco ogni volta.
        while len(self._grafi) >= 4:
            self._grafi.pop(next(iter(self._grafi)))
            torch.cuda.empty_cache()
        self._grafi[chiave] = grafo
        return grafo

    def _passeggiata(self, forma, velocita: float, raggio: float = 1.0):
        """Rumore che cammina piano dentro lo spazio latente.

        È il motore del sogno libero. La strada ovvia — rimettere dentro al modello
        la propria uscita — dopo un minuto degenera sempre: l'immagine converge a
        un attrattore di forme piatte e colori accesi. Qui ogni frame è generato
        da zero, e a scorrere è il punto di partenza.

        Il `raggio` decide che tipo di sogno viene: piccolo, si resta attorno a
        un'immagine di base e il soggetto *si anima* restando riconoscibile;
        grande, si vaga e il soggetto cambia di continuo.
        """
        import torch

        def nuovo_punto():
            casuale = torch.randn(forma, device=self.device, dtype=self.dtype)
            if raggio >= 0.99 or self._pbase is None:
                return casuale
            # Un passo corto a partire dall'immagine base, non un salto altrove.
            return self._sfera(self._pbase, casuale, raggio)

        if self._pbase is None or tuple(self._pbase.shape) != tuple(forma):
            self._pbase = torch.randn(forma, device=self.device, dtype=self.dtype)
            self._pa = self._pbase
            self._pb = nuovo_punto()
            self._pt = 0.0

        self._pt += max(velocita, 0.001)
        if self._pt >= 1.0:
            self._pa = self._pb
            self._pb = nuovo_punto()
            self._pt = 0.0

        return self._sfera(self._pa, self._pb, self._pt)

    def _sfera(self, a, b, t: float):
        """Interpolazione sulla sfera: in linea retta il rumore perderebbe
        ampiezza a metà strada e l'immagine sbiadirebbe."""
        import torch

        af, bf = a.flatten().float(), b.flatten().float()
        omega = torch.acos((af @ bf / (af.norm() * bf.norm())).clamp(-1, 1))
        seno = torch.sin(omega)
        if float(seno.abs()) < 1e-4:
            return (1 - t) * a + t * b
        return (
            (torch.sin((1 - t) * omega) / seno) * a.float()
            + (torch.sin(t * omega) / seno) * b.float()
        ).to(self.dtype)

    def _tempi(self, strength: float, passi: int) -> list[int]:
        """I livelli di rumore da attraversare, scelti a mano.

        Prima li derivavo da `num_inference_steps`, ma quel numero è intero e la
        strength ci finiva dentro arrotondata: 0.35 e 0.45 producevano lo stesso
        identico fotogramma e lo slider sembrava rotto. Qui la strength diventa
        direttamente il punto di partenza sulla scala 0-999, quindi è continua.
        """
        massimo = self.pipe.scheduler.config.num_train_timesteps - 1
        partenza = max(1, min(int(round(strength * massimo)), massimo))
        tempi: list[int] = []
        for i in range(passi):
            t = int(round(partenza * (passi - i) / passi))
            if tempi and t >= tempi[-1]:
                t = tempi[-1] - 1
            if t >= 1:
                tempi.append(t)
        return tempi or [1]

    def _denoise(
        self, image, pos, neg, cfg, guidance, strength, passi, generator, hint, forza_hint,
        passeggiata=0.0,
        raggio=1.0,
        maschera=None,
    ):
        """Ciclo img2img scritto a mano: fa quello che fa la pipeline, senza il contorno.

        La pipeline di Diffusers ricontrolla gli argomenti, ricostruisce il
        processore di immagini e rialloca a ogni chiamata: sono ~20 ms per frame,
        un quinto del tempo totale. Qui restano solo VAE, scheduler e UNet.
        """
        import torch
        from diffusers.pipelines.stable_diffusion.pipeline_stable_diffusion_img2img import (
            retrieve_latents,
        )

        pipe = self.pipe
        sched = pipe.scheduler
        vae_scale = pipe.vae.config.scaling_factor
        testo = torch.cat([neg, pos]) if cfg else pos

        partenza = None
        if passeggiata > 0:
            # Sogno libero: si parte dal rumore, l'immagine in ingresso non serve.
            forma = (1, pipe.unet.config.in_channels, image.shape[2] // 8, image.shape[3] // 8)
            sched.set_timesteps(timesteps=self._tempi(1.0, passi), device=image.device)
            if hasattr(sched, "set_begin_index"):
                sched.set_begin_index(0)
            timesteps = sched.timesteps
            latents = self._passeggiata(forma, passeggiata, raggio) * sched.init_noise_sigma
        else:
            # immagine [0,1] -> [-1,1] -> latenti
            latents = retrieve_latents(pipe.vae.encode(image * 2.0 - 1.0), generator=generator)
            latents = latents * vae_scale
            partenza = latents

            sched.set_timesteps(timesteps=self._tempi(strength, passi), device=latents.device)
            timesteps = sched.timesteps
            if hasattr(sched, "set_begin_index"):
                sched.set_begin_index(0)

            rumore = torch.randn(
                latents.shape, generator=generator, device=latents.device, dtype=latents.dtype
            )
            latents = sched.add_noise(latents, rumore, timesteps[:1])

        usa_hint = hint is not None and self.controlnet is not None
        hint_batch = torch.cat([hint] * 2) if (usa_hint and cfg) else hint
        forma = (testo.shape[0], *latents.shape[1:])
        unet = self._grafo_unet(
            forma, testo.shape, tuple(hint_batch.shape) if usa_hint else None
        ) or pipe.unet

        for t in timesteps:
            ingresso = torch.cat([latents] * 2) if cfg else latents
            ingresso = sched.scale_model_input(ingresso, t)
            if isinstance(unet, GrafoDenoise):
                previsto = unet(ingresso, t, testo, hint_batch, forza_hint)
            elif usa_hint:
                giu, mezzo = self.controlnet(
                    ingresso,
                    t,
                    encoder_hidden_states=testo,
                    controlnet_cond=hint_batch,
                    conditioning_scale=forza_hint,
                    return_dict=False,
                )
                previsto = pipe.unet(
                    ingresso,
                    t,
                    encoder_hidden_states=testo,
                    down_block_additional_residuals=giu,
                    mid_block_additional_residual=mezzo,
                    return_dict=False,
                )[0]
            else:
                previsto = unet(ingresso, t, encoder_hidden_states=testo, return_dict=False)[0]
            if cfg:
                senza, con = previsto.chunk(2)
                spinto = senza + guidance * (con - senza)
                # Rescale della guidance. Senza, sopra 1.5 l'immagine "brucia":
                # la CFG allarga la deviazione standard della previsione e il
                # risultato diventa saturo e pieno di artefatti. Qui si riporta
                # la previsione alla scala di quella condizionata (Lin et al.,
                # "Common Diffusion Noise Schedules and Sample Steps are Flawed").
                if guidance > 1.5:
                    sigma_con = con.std(dim=list(range(1, con.ndim)), keepdim=True)
                    sigma_spinto = spinto.std(dim=list(range(1, spinto.ndim)), keepdim=True)
                    corretto = spinto * (sigma_con / (sigma_spinto + 1e-6))
                    previsto = 0.7 * corretto + 0.3 * spinto
                else:
                    previsto = spinto
            latents = sched.step(previsto, t, latents, generator=generator, return_dict=False)[0]

        # Dove c'è una persona si torna verso i latenti di partenza: la figura
        # resta com'è stata ripresa, lo sfondo se lo prende il modello. Costa una
        # sola interpolazione, e si fa qui perché a metà denoise lascerebbe aloni.
        if maschera is not None and partenza is not None:
            latents = latents * (1 - maschera) + partenza * maschera

        uscita = pipe.vae.decode(latents / vae_scale, return_dict=False)[0]
        return (uscita / 2 + 0.5).clamp(0, 1)

    def process(
        self,
        frame_rgb: np.ndarray,
        params: DreamParams,
        profondita: bool = True,
        passeggiata: float = 0.0,
        raggio: float = 1.0,
    ) -> np.ndarray:
        if self.pipe is None:
            raise RuntimeError("Modello non caricato.")

        import torch

        guidance = min(float(params.guidance), float(self.meta.get("guidance_max", 8.0)))
        cfg = guidance > 1.0
        strength = float(params.strength)
        # Un passo solo non basta a rimettere insieme un'immagine molto rumorosa:
        # è questo che sfigurava i volti sopra 0.35. I passi diventano il minimo
        # che quella strength richiede, e lo slider può solo alzarli.
        # Soglie alte di proposito: un passo in più raddoppia il lavoro, e a
        # 0.36 uno solo regge ancora bene. Il numero vero si vede in interfaccia.
        minimo = 1 if strength <= 0.45 else (2 if strength <= 0.58 else 3)
        passi = max(minimo, int(params.steps))
        self._ultimi_passi = passi

        seed = int(params.seed)
        if seed < 0:
            seed = int.from_bytes(os.urandom(4), "little")
        device = self.pipe._execution_device
        generator = torch.Generator(device=device).manual_seed(seed)
        pos, neg = self._embeds(params, cfg)

        # no_grad e non inference_mode: i tensori "inference" non si possono
        # catturare in un CUDA graph, e la differenza di velocità è nulla.
        with self._lock, torch.no_grad():
            image = (
                torch.from_numpy(np.ascontiguousarray(frame_rgb))
                .to(device, non_blocking=True)
                .permute(2, 0, 1)
                .unsqueeze(0)
                .to(self.dtype)
                .div_(255.0)
            )

            # Stabilità temporale: rimescolo un po' dell'ultimo risultato nell'ingresso,
            # così i frame consecutivi non ripartono da zero e il flicker cala.
            blend = float(params.temporal_blend)
            prev = self._prev_out
            if passeggiata <= 0 and blend > 0.01 and prev is not None and prev.shape == image.shape:
                image.mul_(1.0 - blend).add_(prev, alpha=blend)

            # La profondità si stima sul frame vero, non sulla miscela col passato.
            hint = None
            if profondita and params.depth and self.controlnet is not None and self.profondita.pronto:
                hint = self.profondita.mappa(image, image.shape[3], image.shape[2])

            # Chi c'è nell'inquadratura: la maschera serve in scala latente.
            maschera = None
            if (
                passeggiata <= 0
                and params.soggetto
                and params.protezione > 0.02
                and self.segmentatore.pronto
            ):
                maschera = self.segmentatore.maschera(
                    image, image.shape[3] // 8, image.shape[2] // 8
                ) * float(params.protezione)

            if self._veloce:
                try:
                    uscita = self._denoise(
                        image, pos, neg, cfg, guidance, strength, passi, generator,
                        hint, float(params.depth_scale), passeggiata, raggio, maschera,
                    )
                except Exception as exc:
                    log.warning("Ciclo veloce fallito (%s): torno alla pipeline completa", exc)
                    self._veloce = False
                    uscita = None
            else:
                uscita = None

            if uscita is None:
                uscita = self.pipe(
                    prompt_embeds=pos,
                    negative_prompt_embeds=neg if cfg else None,
                    image=image,
                    strength=strength,
                    num_inference_steps=min(int(math.ceil(passi / max(strength, 0.05))), 60),
                    guidance_scale=guidance if cfg else 0.0,
                    generator=generator,
                    output_type="pt",
                ).images

            out = uscita[0].clamp(0.0, 1.0)
            self._prev_out = out.unsqueeze(0).to(self.dtype)
            return out.mul(255.0).byte().permute(1, 2, 0).cpu().numpy()

    def info(self) -> dict:
        return {
            "backend": self.name,
            "ready": self.ready,
            "model": self.model_id,
            "model_label": self.meta.get("label", self.model_id),
            "device": self.device,
            "load_seconds": round(self.load_seconds, 1),
            "loras": self._loaded_loras,
            "fast_vae": self._fast_vae,
            "guidance_max": self.meta.get("guidance_max", 8.0),
            "profondita": self.controlnet is not None and self.profondita.pronto,
            "soggetto": self.segmentatore.pronto,
            "passi_effettivi": self._ultimi_passi,
        }
