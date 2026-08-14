# Verifica dell'ambiente unificato — 15 agosto 2026

Il piano prevedeva un solo ambiente Python con torch 2.13 al posto di quattro.
Il rischio dichiarato era **DaProd IoDigitale**, pinnato a torch 2.7.1 con codice
di ricerca (SoulX-FlashHead): il salto poteva rompere il lip-sync.

**Esito: l'ambiente unificato regge. Nessun motore è rimasto indietro.**

---

## L'ambiente

```
Python 3.12.13
torch   2.13.0+cu130     CUDA disponibile
GPU     NVIDIA GeForce RTX 4060, 8 GB
```

| | Prima | Dopo |
|---|---|---|
| Ambienti Python | 4 (torch 2.7.1 / 2.11 / 2.12 / 2.13) | **1** |
| Spazio occupato | 14,7 GB | **4,05 GB** |

I 4,05 GB comprendono le dipendenze di **tutti e quattro** i motori: ComfyUI,
diffusers di Dream, lo stack SoulX di IoDigitale e il brain del Companion.

---

## DaProd IoDigitale — il rischio, rientrato

Era pinnato a `torch==2.7.1`, `torchvision==0.22.1`. Su torch 2.13:

**Importazione** — 10 moduli su 10, compreso l'intero stack di generazione:

```
flash_head.src.modules.flash_head_model      flash_head.wan.modules.vae
flash_head.src.pipeline.flash_head_pipeline  flash_head.audio_analysis.wav2vec2
flash_head.ltx_video.ltx_vae                 vibt.wan · vibt.scheduler
inference · leaptalk_stream · web_server
```

**Caricamento dei pesi** — il punto dove le versioni di torch rompono davvero,
perché da torch 2.6 `torch.load` usa `weights_only=True` di default:

| | Esito |
|---|---|
| `torch.load` su `Wan2.1_VAE.pth` | 194 tensori |
| `safetensors` su `Model_Lite` | 843 tensori |
| `wav2vec2-base-960h` via transformers | 94 M parametri |

**Operazioni su GPU** — quelle che le pipeline video usano di continuo:

| | Esito |
|---|---|
| `conv3d` in bf16 | 93 ms |
| `scaled_dot_product_attention` | ok (su Windows niente flash-attn/xformers: si usa SDPA) |
| `autocast` bf16 | ok |

Resta da fare la prova definitiva — **una generazione completa** — che arriva con
la migrazione dell'app. Ma non c'è più il rischio di scoprire a metà strada che
IoDigitale non entra nella suite.

## DaProdDream

16 moduli su 16, compreso `backends/diffusers_backend` (36 KB, il cuore del
motore). `diffusers` risolto a **0.38.0**, che soddisfa sia il `>=0.36` di Dream
sia il `==0.38.0` pinnato da IoDigitale: **nessun conflitto**.

## DaProdCompanion

Importa tutto. Trovata una dipendenza mancante: `sqlite_vec` è usato da
`memory/`, `graph/` e `conversation/` ma **non è dichiarato** in
`services/brain/pyproject.toml`. Oggi funziona solo perché è finito nel venv per
altra via. Va aggiunto quando si migra il servizio.

## DaProdMusica e DaProdFoto — ComfyUI

ComfyUI 0.33.0 clonato nell'ambiente condiviso: **pronto in 1 secondo**.

I modelli stanno **fuori** dalla cartella di ComfyUI, in una directory condivisa
puntata da `extra_model_paths.yaml`, e li vede tutti:

```
CLIPLoader   minimax_music3_qwen2-7B_pruned_w4a8 · qwen_3_06b_base
UNETLoader   anima-turbo-v1.0 · minimax_music3_dit_w4a8
VAELoader    minimax_music3_dav · qwen_image_vae
```

È la prova che l'idea regge: **un solo ComfyUI, una sola copia dei modelli, due
app che li usano.**

## Scoperta non prevista: MiniMax H3 è nativo in ComfyUI

Interrogando `/object_info`:

```
EmptyMiniMaxH3LatentAV   MiniMaxH3ImageToVideo   MiniMaxH3AddGuide
MiniMaxH3ReferenceToVideo   MiniMaxH3SigmaShift
```

Nessun custom node, nessun WanGP. Il modello video che usi oggi a mano **gira già
nel nostro motore**. Manca solo lo strato delle sliding window, che in ComfyUI non
c'è e va scritto — vedi [MODELLI-E-STRATEGIA.md](MODELLI-E-STRATEGIA.md) § 5.

---

## Come rifare questa verifica

```bash
node packages/runtime/scripts/prova-installazione.cjs
```

Crea l'ambiente in `%LOCALAPPDATA%\DaProdSuite\runtime`. È ripetibile: se lo
interrompi e lo rilanci, riprende da dove era.
