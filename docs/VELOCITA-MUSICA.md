# La velocità di un brano

Cosa rallenta DaProdMusica, cosa fa WanGP che noi non facciamo, e cosa di quello
si può davvero portare qui dentro. Scritto il 16 agosto 2026, dopo aver letto il
loro codice e il nostro motore.

---

## 1. Dove se ne va il tempo, misurato

Su una generazione vera da 243,66 secondi, leggendo `logs/comfy.log`:

| Fase | Tempo | Quota |
|---|---|---|
| **AR sampling** — 1001 token, uno alla volta, a 5,5 token/s | **185 s** | **76%** |
| DiT — 30 passi a 1,48 s/passo | 44 s | 18% |
| Caricamenti + VAE | ~15 s | 6% |

**Il cursore "passi" governa il 18% del tempo.** I tre quarti se ne vanno nel
modello linguistico da 7B che genera i token audio uno per volta, e quella parte
scala con la **durata del brano**, non con i passi.

A 5,5 token/s un modello da 5,9 GB muove 32 GB/s: la 4060 di banda ne ha 272.
Non è la banda della memoria — è **costo fisso per token**.

## 2. Cosa fa WanGP

Il changelog dice «*optimized with a vllm engine for x3 faster generation*». Letto
il codice, la frase va tradotta, perché il pacchetto `vllm` **non c'è**: una
ricerca di "vllm" nel loro repo non trova nessuna dipendenza, e quello che
chiamano vllm engine è roba loro, in `shared/llm_engines/`.

Dentro c'è una copia adattata di **nano-vllm** (`GeeeekExplorer/nano-vllm`, MIT):
KV cache a blocchi con block table, attenzione varlen, sampler. Sopra ci mettono
due modi di decodificare, e li scelgono a seconda di cosa trovano installato
(`models/TTS/minimax_music3/semantic_acceleration.py`):

| Modo | Cosa usa | Serve |
|---|---|---|
| **CG** | KV cache a forma fissa + CUDA graph + SDPA | niente di speciale |
| **vLLM** | il CG più FlashAttention2, RMSNorm in Triton, KV cache in Triton, e kernel Triton **misurati per le forme esatte** delle matrici | FlashAttention2 **e** Triton, altrimenti si rifiuta di partire |

Il pezzo che conta davvero è l'ultimo: `configure_tiny_m_shape_overrides`, cioè
kernel scritti apposta per le moltiplicazioni **lunghe e strettissime** che fa un
modello quando genera un token per volta. È esattamente la diagnosi del
paragrafo 1: non è la banda, è il costo per token.

**Il loro consiglio è 16 GB di VRAM** per i profili veloci, e il loro checkpoint è
un BF16/ConvRot. Noi stiamo in 8 GB con un w4a8 potato: il confronto "x3" non è
sul nostro caso.

### Cosa non si può prendere, e cosa sì

WanGP non è sotto una licenza libera: è la **WanGP Community License 2.0**, che
permette di usarlo e modificarlo per sé, ma non di rivenderlo, incorporarlo in un
prodotto a pagamento o offrirlo come servizio. Copiare il loro codice dentro una
repo MIT non si fa — è la stessa ragione per cui ComfyUI si scarica e non si
ridistribuisce, e va decisa allo stesso modo.

Quello che si può prendere è **il metodo**, che non è loro: nano-vllm è MIT, i
CUDA graph sono di PyTorch, e i kernel per le forme strette sono una tecnica
pubblica. Se un giorno scriviamo la nostra decodifica veloce, si parte da lì.

## 3. Quello che ComfyUI già fa (e che non sapevamo)

Prima di riscrivere qualcosa conviene guardare cosa c'è: in
`comfy/ldm/minimax_music/ar.py`, il ciclo di generazione **fa già** metà di
quello che fa il modo CG di WanGP.

- KV cache allocata una volta sola, a forma fissa, per prompt + token da fare;
- il token campionato viene copiato in memoria bloccata con un evento CUDA,
  invece di fermare la GPU a ogni giro per leggerlo;
- condizionato e non condizionato viaggiano insieme in un batch da due;
- il **depth decoder** RVQ gira dentro un CUDA graph.

Quello che **non** è dentro un CUDA graph è il forward del modello da 7B, che è
il 76% del tempo. Lì ogni token paga qualche centinaio di lanci di kernel.

## 3-bis. Perché un brano lungo costa così tanto

Il motore genera **25 frame di audio al secondo**, e ogni frame è un giro del
modello da 7B. Quindi il conto è una moltiplicazione, non un mistero:

| Durata chiesta | Giri del modello | A 5,5 giri/s |
|---|---|---|
| 40 s (la generazione misurata) | 1.000 | ~3 minuti |
| 60 s | 1.500 | ~4,5 minuti |
| **120 s** (il valore predefinito) | 3.000 | **~9 minuti** |
| 180 s | 4.500 | ~14 minuti |
| 360 s (il massimo che accetta) | 9.000 | ~27 minuti |

E questo è **solo la parte autoregressiva**: sopra ci va la diffusione, che
cresce anch'essa con la durata. Mezz'ora per un brano lungo non è un difetto da
cercare — è questo numero, moltiplicato.

Da cui due conseguenze pratiche, prima ancora di ottimizzare:

1. **Si prova corto e si allunga alla fine.** Trenta secondi per capire se lo
   stile e il testo funzionano costano tre minuti, non trenta.
2. **"Solo nuova resa" salta la parte lenta.** Cambiando il seed dell'audio e
   lasciando fermo quello del testo, i nodi della struttura arrivano dalla cache
   del motore: 17 secondi invece di 107 sulla stessa canzone. È già nella scheda
   Crea, ed è la cosa che fa risparmiare più tempo di qualunque flag.

## 4. La scoperta che vale più di tutte

ComfyUI 0.33.1 corregge una riga sola rispetto alla 0.33.0, ed è la nostra:

```
-  enable_graph = enable_graph and not args.disable_cuda_graphs and is_device_cuda(device)
+  enable_graph = enable_graph and not args.disable_cuda_graphs and is_device_cuda(device) and getattr(module, "_v_block", None) is not None
```

Il titolo del commit è *"Fix minimax music not working on non dynamic vram"*, e
`_v_block` è **l'attributo del nostro errore**: `'RVQDepthDecoder' object has no
attribute '_v_block'`, quello che ammazzava i brani a metà. Capitava a noi e non
a tutti perché la suite avvia il motore con `--disable-dynamic-vram`.

Quindi il difetto non era la copertina generata per prima: quella era il modo in
cui si riusciva a farlo comparire più spesso. **Era un difetto di ComfyUI**, ed è
corretto: la suite adesso installa la 0.33.1 e sa accorgersi di avere un motore
vecchio.

Ma la correzione **spegne il CUDA graph** invece di farlo funzionare: con i
nostri flag, il depth decoder gira senza. Cioè la parte lenta è lenta anche per
questo.

## 3-ter. I modelli: cosa si può prendere di WanGP e cosa no

Cammo, il 16 agosto: «usiamo i modelli che consiglia WanGP, questi qua non mi
piacciono». Il formato che usano loro — **int8 ConvRot** — c'è anche per il
nostro motore, su `Comfy-Org/MiniMax-Music-3`, e ComfyUI lo carica da sé (nel log
il backend cuda dichiara `dequantize_int8_convrot_weight`).

| Pezzo | Quello che usiamo | Quello di WanGP | Ci sta in 8 GB? |
|---|---|---|---|
| **DiT** (dai token al suono) | w4a8, 1,8 GB | int8 ConvRot, **2,5 GB** | **sì** — ed è entrato come scelta in DaProdMusica |
| **Text encoder** (la parte lenta, 76%) | w4a8 potato, 5,5 GB | int8 ConvRot potato, **8,6 GB** | **no**: lavora da solo in VRAM e sono 600 MB di troppo |
| VAE | lo stesso | lo stesso | sì |

Quindi metà sì e metà no, e il no non è una scelta: 8,6 GB in una scheda da 8 non
entrano, e farli entrare vorrebbe dire il caricamento dinamico, che qui dà
errore. Il modello resta nel catalogo — `minimax-music3-text-encoder-int8` — ed è
il primo posto dove guardare il giorno che cambia la scheda video.

## 4-bis. L'interruttore, così le prove le può fare chiunque

In fondo all'hub c'è **Velocità: normale / spinta**, e cambia i flag con cui
parte il motore (`services/comfy/avvio.py`, `flag_velocita`).

| | normale | spinta |
|---|---|---|
| `--disable-dynamic-vram` | sì | **sì** — vedi sotto |
| `--fast` | no | sì (`fp16_accumulation`, `cublas_ops`, autotune) |
| `--use-flash-attention` | no | sì, **ma solo se `flash_attn` è installata**: altrimenti il flag farebbe morire il motore in avvio, e il codice se ne accorge da sé |

Vale dal prossimo avvio di un'app, perché i flag stanno nella riga di comando.

**La memoria video dinamica è stata provata e tolta.** Il primo giro di questo
interruttore la accendeva, perché è quella che riporta i CUDA graph sulla parte
lenta. Il motore parte e dichiara pure "DynamicVRAM support detected and
enabled", ma **le generazioni danno errore**: con 8 GB e questi modelli non
regge. Resta scritto qui perché non si riprovi la stessa strada fra tre mesi.

**Flash Attention 2 e Triton sono installati** (16 agosto 2026), con le ruote
per Python 3.12 / torch 2.13 / CUDA 13.0 elencate più sotto e `--no-deps` per non
far toccare torch a nessuno. Il motore adesso scrive "Using Flash Attention" e il
backend `triton` di comfy-kitchen risulta disponibile.

## 5. Le prove da fare, dalla più economica

Nessuna di queste è scritta: sono misure, e vanno fatte sullo stesso brano, con
lo stesso seed e la stessa durata, leggendo i token/s che il log scrive da solo.

1. **Rimisurare sulla 0.33.1.** Prima di ogni altra cosa: il numero di partenza
   adesso è un altro, e mezz'ora di lavoro può già essere lì.
2. **Riprovare senza `--disable-dynamic-vram`.** Quel flag c'è perché con il
   caricamento dinamico la cattura del CUDA graph abortiva
   (`cudaErrorStreamCaptureInvalidated`). Ma il motore nel frattempo ha imparato a
   precaricare i pesi prima di catturare (`prefetch_dynamic_vbars`), e se oggi
   regge, il CUDA graph del depth decoder si riaccende: è il modo CG di WanGP,
   gratis, senza scrivere niente.
3. **`--fast`**, che l'interruttore accende insieme al resto.
4. **FlashAttention2**, che si può installare davvero — vedi qui sotto — ma da
   sola non sposta i tre quarti del tempo: l'attenzione, quando generi **un**
   token per volta con mille di contesto, è la parte piccola del conto.
5. **Solo dopo**: la nostra decodifica accelerata sul modello da 7B.

### FlashAttention2 e Triton: si possono installare

Cercati per la nostra combinazione esatta — Windows, Python 3.12, torch 2.13,
CUDA 13.0 — ed esistono tutti e due:

- **FlashAttention2**: `flash_attn-2.8.3+cu130torch2.13-cp312-cp312-win_amd64.whl`,
  228 MB, da [flash-attention-prebuild-wheels](https://github.com/mjun0812/flash-attention-prebuild-wheels).
  Il motore ha già il flag `--use-flash-attention`, e l'interruttore lo accende
  da sé quando la libreria c'è.
- **Triton**: [triton-windows](https://github.com/woct0rdho/triton-windows), su
  PyPI fino alla 3.7.1. Servirebbe a far comparire il backend `triton` di
  comfy-kitchen, che oggi il log dichiara non disponibile a ogni avvio.

**Ma attenzione a cosa aspettarsi da Triton**, prima di installarlo: nel log il
backend **cuda** di comfy-kitchen è già disponibile e dichiara `w4a8_int8_linear`,
`gemv_awq_w4a16`, `dequantize_w4a8_int8_weight` — cioè proprio le moltiplicazioni
dai pesi quantizzati che il modo veloce di WanGP fa in Triton. Se quei kernel
sono già quelli in uso, Triton non ha molto da aggiungere. È una cosa da
guardare nel log prima di installare 200 MB.

Vanno installati con `--no-deps`: sono ruote che dichiarano torch fra le
dipendenze, e l'ambiente è **condiviso da quattro motori** — un torch sostituito
con una wheel qualsiasi li rompe tutti insieme.

## 6. I kernel GGUF 1.07: non oggi

Il changelog di WanGP consiglia i **GGUF kernels 1.07**, che moltiplicano
direttamente dai pesi GGUF compatti senza costruire la matrice densa — la stessa
idea del paragrafo 2, applicata a FLUX.2 Klein, che è quello che DaProdFoto ha
appena preso.

Le loro ruote però esistono per **Python 3.11 + torch 2.10 + CUDA 13** e per
**Python 3.10 + torch 2.7.1 + CUDA 12.8**. La suite gira su **Python 3.12 + torch
2.13 + cu130**: nessuna delle due combacia, e cambiare la versione di torch
sotto quattro motori per un esperimento non si fa. Si riguarda quando esce una
ruota per la nostra combinazione.

## 7. Per DaProdCinema

Da guardare quando toccherà al video, sempre come metodo e non come codice:

- `models/minimax_h3/first_block_cache.py` — la cache che nel loro changelog vale
  «fino al 50% più veloce»;
- `convrot_layout.py` e `components/packing.py` — come tengono i tensori per non
  ricopiarli;
- `lora_affine.py` con le mappe già pronte per fl2va e ref2va.

I nodi MiniMax H3 nativi nel nostro motore ci sono già (verificato): quello che
manca resta la finestra scorrevole per andare oltre la clip corta, che è la
decisione già presa in [ROADMAP.md](ROADMAP.md) § 0.6.0.
