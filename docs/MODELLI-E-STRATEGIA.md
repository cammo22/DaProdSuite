# Modelli e strategia della suite

Ricapitolo di cosa gira, quanto costa, cosa si può compattare e cosa manca.
Scritto dopo aver letto la wiki `dapwikiGPT`, l'abbozzo `DaProdStudio` e i sei
progetti sul Desktop.

---

## 1. Il conto di oggi

Se installassimo tutto così com'è, con il manifest attuale:

| App | Modelli | Su disco |
|---|---|---|
| DaProdVisualizer | nessuno | — |
| DaProdDream | SD-Turbo | 2,4 GB |
| DaProdCompanion | un modello a scelta, via LM Studio | 0 (li gestisce LM Studio) |
| DaProdMusica | MiniMax Music 3 (DiT + encoder + VAE, tutti W4A8) | 7,4 GB |
| DaProdFoto | FLUX.2 Klein Q4_K_S + Qwen3-8B + VAE **+** Anima + Qwen3 0.6B + VAE | 16,8 GB |
| DaProdIoDigitale | SoulX-FlashHead + LeapTalk + wav2vec2 | 14,8 GB |
| | **totale** | **~46 GB** |

Più ~4 GB di ambiente Python. **Si può fare molto meglio.**

---

## 2. Tre compattazioni concrete

### 2.1 SoulX scarica il doppio del necessario — **−5,6 GB**

Il repo `Soul-AILab/SoulX-FlashHead-1_3B` contiene **due** modelli completi:

```
Model_Lite/diffusion_pytorch_model.safetensors    5,7 GB
Model_Pro/diffusion_pytorch_model.safetensors     5,6 GB
```

Ne serve **uno**. Oggi `hf download` prende l'intero repo perché nessuno gli ha
detto il contrario. Con `allow_patterns` si scarica solo Lite di default e Pro
resta un extra a richiesta.

### 2.2 FLUX.2 Klein come extra, non come base — **−12,1 GB dal primo avvio**

DaProdFoto oggi chiede **due** motori immagine completi:

| Motore | Peso | Qualità | Velocità su 8 GB |
|---|---|---|---|
| Anima Turbo 2B | 5,6 GB | buona | veloce (~20 s) |
| FLUX.2 Klein 9B Q4_K_S | 12,4 GB | superiore | lento, al limite della VRAM |

Anima **è già sul tuo disco** (l'ha scaricato Musica per le copertine) e in Musica
funziona bene. FLUX è meglio, ma pesa più del doppio e vale la pena solo quando
la qualità conta davvero.

**Proposta:** Anima è il motore base di DaProdFoto, FLUX si scarica dalla scheda
"Qualità massima" quando lo vuoi. È esattamente il ragionamento che fa già il tuo
`Flux/fluxapp/config.py` con le quattro quantizzazioni: dare la scelta invece di
imporre il massimo.

### 2.3 Un solo ambiente, un solo ComfyUI — **−10,7 GB**

Già nel piano: da quattro venv (14,7 GB) a uno (~4 GB), e da due copie di ComfyUI
a una.

### Risultato

| | Oggi | Dopo |
|---|---|---|
| Primo avvio con tutte le app | ~46 GB | **~28 GB** |
| Ambiente Python | 14,7 GB | ~4 GB |
| **Totale** | **~61 GB** | **~32 GB** |

Quasi la metà. E chi installa solo Musica e Foto si ferma a ~13 GB.

---

## 3. Cosa copiare da WanGP

La tua wiki documenta WanGP meglio di quanto facciano molti README. Queste sono
le tecniche che rendono possibile far girare modelli grossi su 8 GB, e che la
suite deve avere come **impostazioni condivise**, non riscoperte app per app:

| Tecnica | Cosa fa | Dove sei già arrivato |
|---|---|---|
| **Checkpoint pruned** | 20B invece di 33B, stessa grammatica di prompt | usi già i pruned H3 |
| **W4A8 INT8** | 4 bit con kernel nativi, niente dequantizzazione | Musica: **5-7 frame/s contro 1** dei GGUF Q4 |
| **Text encoder quantizzato** | l'encoder scende da 5,5 GB a molto meno | già nel W4A8 di Musica |
| **VAE in FP8** | il VAE smette di essere un problema | da fare |
| **Decode a blocchi** | non tiene tutto il latente in VRAM | Musica: 15 min contro 20 su 120 s |
| **Sliding window** | video lunghi da finestre corte, con overlap | il metodo H3 della wiki |
| **First Block Cache / Spectrum** | salta step senza rovinare il risultato | da valutare |
| **Genera basso, ingrandisci dopo** | 480p poi SeedVR2/FlashVSR | il tuo metodo per i test lunghi |
| **Lower VRAM / Lower RAM** | scegli quale collo di bottiglia hai | **da portare nella suite** |

### La cosa da rubare per prima: il selettore di profilo

WanGP ti fa scegliere `Lower VRAM` o `Lower RAM` e cambia tutto di conseguenza.
La suite dovrebbe avere lo stesso, una volta sola nelle impostazioni generali:

- **Leggero** — quantizzazioni più aggressive, decode a blocchi piccoli, risoluzioni
  basse. Va su tutto, lentamente.
- **Bilanciato** — quello che usi oggi su 8 GB. Predefinito.
- **Qualità** — pesi più grandi, meno compressione. Per chi ha più VRAM di te.

Una scelta sola che ogni motore legge, invece di sei pannelli avanzati diversi.

### E il pannello dei modelli in VRAM

In `MinimaxMusica/app/index.html` hai già i **quadratini colorati**: uno per ogni
modello caricato, ci passi sopra e vedi i MB, ci clicchi e lo scarichi. È la cosa
più utile che ho visto nei tuoi progetti e nessun altro ce l'ha.

Va promossa a componente della suite, accanto alla riga GPU che l'hub mostra già.
Con l'arbitro della GPU diventa: vedi chi occupa la VRAM, e puoi liberarla tu.

---

## 4. Quale modello per cosa — la decisione da prendere

**Wiki e codice non dicono la stessa cosa.** La wiki descrive il flusso manuale in
WanGP, i progetti sul Desktop sono più recenti:

| Divisione | Wiki (`dapwikiGPT`) | Codice sul Desktop | Più recente |
|---|---|---|---|
| Musica | ACE-Step v1.5 XL Turbo 4B / Suno | **MiniMax Music 3** | il codice (13 ago 2026) |
| Foto | Krea 2 Turbo (in WanGP) | **Anima** (in Musica) + FLUX.2 Klein | il codice |
| Cinema | **MiniMax H3** (in WanGP) | **LTX 2.5** e **MiniMax H3** (0.4.1) | il codice: adesso ci sono tutti e due, vedi § 5.1 |

Per Musica e Foto il codice ha superato la wiki e la suite segue il codice.
Per il **video** invece esiste solo il metodo manuale in WanGP: è l'unico pezzo
del tuo flusso che la suite non copre ancora.

**Deciso:** ACE-Step è superato, per la musica vale MiniMax Music 3.

### 4.1 «Togliamo il 4 bit e usiamo i GGUF originali» — guardato il 20 agosto 2026

Chiesto da Cammo perché il text encoder da 5,9 GB ci metteva troppo a scaricare.
Guardato prima di toccare il manifest, e la risposta è **no** su tutti e tre i
punti:

| | Cosa c'è davvero |
|---|---|
| `MiniMaxAI/MiniMax-Music3` (l'ufficiale) | **nessun GGUF**: sono i pesi originali in `diffusers`, 47 file, **67,2 GB** in tutto |
| I GGUF che esistono (`scragnog`, `audio-cpp`, …) | sono tagliati per l'altra pipeline — `mm3-lm`, `mm3-depth`, `mm3-synth`, `mm3-voc` — e i nodi ComfyUI che usiamo (`CLIPLoader type: minimax`, `UNETLoader`, `VAELoader`) non li caricano |
| Il peso | il set GGUF equivalente (lm Q4_K_M 5,5 GB + dit 1,5 + depth + synth + cond + voc) fa **~9,7 GB**: più dei 7,9 di adesso, non meno |

Quindi il modello non era il problema: **lo era lo scaricamento**, una
connessione sola contro le quattro di adesso (§ CHANGELOG 0.3.2). Il manifest
resta com'è: W4A8 per il text encoder, e la scelta fra 4 bit e int8 per il DiT.

Da rivedere solo se cambia una di queste tre cose: esce un repack ComfyUI più
leggero del W4A8, oppure la scheda video diventa più grande (allora conta il
text encoder int8 da 9,2 GB, non i GGUF), oppure ComfyUI impara a caricare
quella famiglia di GGUF.

**Seguito del 20 agosto 2026 (0.4.1): il DiT a 4 bit è stato tolto.** Non per
qualità misurata — nessuno ha fatto un confronto in cieco — ma perché la scelta
fra 1,8 e 2,5 GB su uno scaricamento da otto non è una scelta: sono 700 MB in
cambio della parte che si sente. Nel menu restano tre voci (ACE Turbo, ACE XL
Turbo, MiniMax int8) invece di quattro, e chi aveva scelto il 4 bit finisce
sull'int8 da sé (`crea.js`, `modelloScelto`). **Il text encoder W4A8 resta**, ed
è l'unico pezzo a 4 bit della suite: la sua alternativa int8 pesa 9,2 GB e su
8 GB di VRAM non ci sta.

**E dal 18 agosto 2026 la wiki si aggiorna anche.** Non era così — era in sola
lettura — poi Cammo ha chiesto di curarla. La divergenza qui sopra è stata
chiusa nella wiki stessa: i tre hub di divisione (Musica, Foto, Cinema) dicono
adesso quali modelli usa la suite, e le vecchie guide restano segnate come
storico invece che come istruzioni. La regola per quando torneranno a divergere
è semplice: **vale il codice**, e si corregge la wiki.

---

## 5. La card che manca: DaProdCinema

### Cosa esiste già

`HermesGPT\DaProdStudio` non è un'idea, è un MVP che gira: FastAPI, adattatore
WanGP reale (`wangp_adapter.py`), client MCP, e soprattutto
[`director.py`](../../HermesGPT/DaProdStudio/backend/director.py) — 43 righe che
contengono il seme giusto:

```python
SECTIONS = {
    "intro":  ("establish the world and visual grammar", "static_wide"),
    "verse":  ("show routine, character detail, restrained movement", "slow_push_in"),
    "chorus": ("deliver the largest kinetic and visual peak", "low_tracking_run"),
    "bridge": ("create an intimate pause and reveal a new detail", "slow_orbit"),
    ...
}
```

A ogni sezione della canzone corrisponde **una funzione narrativa e un movimento
di camera**. È esattamente la cosa che, secondo i tuoi stessi test, Maestro
sbagliava.

### Le lezioni già pagate

Dalla wiki, dai tuoi test su Maestro — vale la pena rileggerle perché sono il
motivo per cui questa card può venire meglio:

1. **Maestro «fa cacare»** (tuo verdetto, 14 lug): pacing rotto, climax bruciato
   in anticipo, outro vuoto. La pianificazione automatica lasciata libera fallisce.
2. **Un modello locale piccolo, sotto vincoli multipli, molla per prima
   l'istruzione più difficile.** Nel test ha buttato via il dialogo per tenere
   l'azione visiva.
3. **Riferimenti concreti battono le descrizioni astratte** di stile.
4. **WanGP non ha un Director Mode** e Deepy nemmeno: zero riferimenti a
   `beat`/`bpm` in tutto il repo. Questo strato va scritto, non riusato.

Tradotto in requisiti: la funzione di ogni sezione va **vincolata esplicitamente**,
non dedotta dal modello. Che è già quello che fa `director.py`.

### Cosa farebbe la card

**DaProdCinema — da una canzone, un video musicale.**

```
1. prendi un brano dalla libreria di DaProdMusica (o un file tuo)
2. la struttura arriva dai tag del testo: [Intro] [Verse] [Chorus] [Bridge] [Outro]
   — non serve analizzare l'audio, ce l'hai già scritta
3. una clip per sezione, con funzione e camera fissate dalla tabella
4. DaProdUniverso applicato automaticamente ai prompt
5. le clip si concatenano con sliding window e overlap
6. montaggio finale sul brano
```

Il punto 2 è il vantaggio che Maestro non poteva avere: **tu la struttura della
canzone la conosci già**, perché l'hai scritta tu nei tag. Niente analisi BPM che
sbaglia.

### Il nodo tecnico è sciolto: H3 è già in ComfyUI

**Verificato il 15 agosto 2026.** Avviato ComfyUI 0.33.0 nell'ambiente condiviso e
interrogato `/object_info`: i nodi MiniMax H3 ci sono, **nativi, senza custom node**:

```
EmptyMiniMaxH3LatentAV      MiniMaxH3ImageToVideo
MiniMaxH3AddGuide           MiniMaxH3ReferenceToVideo
MiniMaxH3SigmaShift
```

`MiniMaxH3ReferenceToVideo` è il Ref2VA della tua guida. `MiniMaxH3ImageToVideo`
più `MiniMaxH3AddGuide` coprono FL2VA. **Il workflow video che oggi fai a mano in
WanGP può girare nel nostro motore**, lo stesso che serve Musica e Foto.

**Deciso: il motore lo facciamo noi.** Da WanGP si prende esempio — le tecniche di
memoria, le sliding window, il modo di far stare modelli grossi in poca VRAM — ma
il codice è nostro, con l'obiettivo di far girare i modelli *meglio* di come
girano ora. Nessuna dipendenza esterna, nessun vincolo di licenza ereditato.

**Ma non adesso.** La card resta disattivata finché le altre sei non funzionano
davvero dentro la suite. Prima si fa funzionare quello che c'è.

### Il secondo modello: LTX 2.5, e due cose che cambiano il piano

**Verificato il 16 agosto 2026**, interrogando `/object_info` del ComfyUI 0.33.1
che stava girando per DaProdDream. Due sorprese, tutte e due a nostro favore.

**Uno: LTX 2.5 è nativo anche lui, e non di poco.** Trenta nodi, e non sono
quattro scatole per fare una clip muta:

```
EmptyLTXVLatentVideo     LTXVImgToVideo          LTXVAddGuide
LTXVConditioning         LTXVScheduler           LTXVDualCFGGuider
LTXVContextWindows       LTXVLatentUpsampler     LTXVDurationPredictor
LTXVAudioVAELoader       LTXVAudioVAEEncode      LTXVAudioVAEDecode
LTXVConcatAVLatent       LTXVSeparateAVLatent    LTXVReferenceAudio
LTXVSpatioTemporalGuidance   LTXVModalityGuidance   LTXAVTextEncoderLoader
```

I nodi `Audio` non sono un dettaglio: **LTX 2.5 genera il video insieme al
suono**, e `LTXVReferenceAudio` prende un audio come riferimento — che per un
video musicale è esattamente il verso giusto: si parte dal brano.
(I nodi `LtxApi25*` e `MinimaxHailuo*` che compaiono nello stesso elenco sono
chiamate a servizi in rete: non ci interessano, la suite gira in locale.)

**Due: le sliding window non sono più da scrivere.** Qui sopra c'era scritto che
erano il pezzo di WanGP da rifare da zero perché in ComfyUI non c'erano. Nella
0.33.1 ci sono, e in tre forme:

```
ContextWindowsManual     LTXVContextWindows     WanContextWindowsManual
```

`LTXVContextWindows` chiede la lunghezza della finestra in fotogrammi veri
(`8n+1`, di serie 145) e l'overlap (di serie 40), e si applica al modello come
una patch. `ContextWindowsManual` è quello generico, quindi la stessa strada
vale anche per MiniMax H3. **Il lavoro cambia natura**: non più scrivere il
meccanismo, ma scegliere finestra e overlap e misurare cosa regge in 8 GB.

**Perché due modelli e non uno.** Stessa logica di DaProdFoto con Anima e
FLUX.2 Klein: uno che si porta la scelta e uno che si porta il peso. H3 è quello
della guida, con Ref2VA e FL2VA già collaudati a mano; LTX 2.5 è la strada
veloce per le clip lunghe e l'unico dei due che il suono lo fa da sé. La scelta
del modello si fa come in Foto — un menu, ogni voce coi propri grafi e il
proprio punto di lavoro (`apps/foto/src/grafi.js` è già scritto così).

### 5.1 Come è finita: i pesi veri, scelti il 20 agosto 2026 (0.4.1)

Nella 0.4.0 DaProdCinema era nata con **Wan 2.2 TI2V 5B**, 18,1 GB, perché i due
modelli decisi costavano il doppio e il quadruplo. Cammo ha chiesto di tornare
ai due decisi: «io volevo solo ltx 2.5 e minimax h3, ti avevo detto di ispirarti
a Wan**GP**, non al modello». Ed è la lettura giusta di questo documento: da
WanGP si prende il **metodo** (§ 3), non il catalogo.

Cosa c'è nel catalogo adesso, e perché proprio quei file:

| | File | Peso | Perché questo |
|---|---|---|---|
| LTX 2.5 DiT | `ltx-2.5-22b-distilled-transformer-w4a8_convrot` | 11,7 GB | distillato (8 passi) e W4A8: la int8 ufficiale è 20 GB |
| LTX 2.5 encoder | `gemma4-12b-with-proj-ltx-2.5-w4a8_convrot` | 9,9 GB | si porta dentro le proiezioni, quindi basta `CLIPLoader` tipo `ltxv` |
| LTX 2.5 VAE video | `ltx-2.5-video-vae-conv-bf16` | 1,35 GB | il decoder «conv», quello veloce, che è anche il predefinito di WanGP |
| LTX 2.5 VAE audio | `ltx-2.5-audio-vae-bf16` | 0,34 GB | **va in `checkpoints`**: contiene autoencoder *e* vocoder, e `LTXVAudioVAELoader` legge da lì |
| H3 DiT | `minimax_h3_fl2va_pruned_w4a8_mixed` | 11,7 GB | la variante FL2VA, che è quella che attacca le inquadrature |
| H3 encoder | `qwen3vl_32b_minimax_h3_int8_convrot` | 25,3 GB | il pezzo che decide tutto: più piccolo non si può, vedi sotto |
| H3 VAE video | `minimax_h3_video_vae_int8_convrot` | 2,95 GB | si taglia i blocchi da solo, quindi `VAEDecode` e non la versione a blocchi |
| H3 VAE audio | `minimax_h3_audio_vae_fp32` | 0,56 GB | |
| H3 LoRA turbo | `minimax_h3_fl2v_turbo_4step_v1.0_768p` | 1,82 GB | quattro passi invece di decine: senza, diciassette clip sono una notte |

**Tre cose imparate scegliendoli**, che valgono per la prossima volta:

1. **Il repo ufficiale di LTX 2.5 è dietro un cancello** (`gated: auto`): serve
   un account HuggingFace e un token, e la suite non ne ha uno. Gli stessi pesi
   esistono rispecchiati senza cancello, e le due VAE sono byte per byte i file
   ufficiali (verificato sul `Content-Length`).
2. **Il text encoder di H3 è il collo di bottiglia, non il DiT.** Qwen3-VL 32B in
   int8 è 25,3 GB. La versione NVFP4 da 14,6 GB vuole una scheda **Blackwell**
   (serie 50) e la 4060 è Ada; i GGUF vorrebbero ComfyUI-GGUF, che questa
   famiglia non la carica. Finché non cambia una delle due cose, H3 costa 42 GB.
3. **W4A8 ConvRot si carica da sé.** `comfy-kitchen` (`AsymW4A8Int8Layout`) è già
   nell'ambiente condiviso e ComfyUI 0.33.1 lo registra in `quant_ops.py`: è la
   stessa strada di MiniMax Music 3, e vale la pena cercarla per prima quando
   arriva un modello nuovo troppo grosso.

**Come sono stati verificati i grafi.** Motore avviato su una porta a parte
(`--cpu --port 8199`) e `/object_info` interrogato: per ogni nodo dei due grafi
si è controllato che il `class_type` esista, che ogni ingresso sia previsto, che
non manchi nessun obbligatorio e che nessun collegamento punti a un nodo che non
c'è. Passano tutti e due, con le due varianti (con e senza primo fotogramma).
**Non è la stessa cosa di una clip uscita davvero**: quella richiede 23 GB
scaricati e minuti di scheda video, e resta la prima cosa da fare.

---

## 6. Solo CPU Intel, in futuro

Richiesta reale, ma va guardata in faccia: **non tutte le sei app possono girare
su CPU nello stesso modo.**

| App | Su CPU Intel | Perché |
|---|---|---|
| Visualizer | **sì, già oggi** | non tocca la GPU |
| Companion | **sì** | LM Studio gira su CPU; con un modello piccolo è usabile |
| IoDigitale (parte parlata) | **sì** | ASR e LLM sono già GGUF, cioè llama.cpp, cioè CPU |
| Musica | lentissimo | il decoder autoregressivo fa 25 passi per secondo di musica |
| Foto | lento ma fattibile | un'immagine passa da secondi a minuti |
| Dream | **no** | "tempo reale" e CPU non stanno nella stessa frase |
| IoDigitale (video) | **no** | stessa ragione |

**La strada, quando ci arriveremo:** OpenVINO, che è di Intel ed è fatto apposta
per le sue CPU e iGPU. Per la parte LLM non serve niente: llama.cpp gira già.

**Cosa faccio adesso:** il campo `device` esiste già come idea nel runtime
condiviso. Lo tengo esplicito in ogni motore (`cuda` / `cpu`) invece di dare CUDA
per scontato, così quando vorrai la versione Intel non si riscrive tutto. Costa
poco ora, costerebbe caro dopo.

Non lo implemento adesso: prima la suite deve funzionare bene sulla 4060.

---

## 7. Come cambia la suite

Da sei card a **sette**:

*(Stato al 19 agosto 2026: questa tabella era il piano, e adesso è quasi tutta
fatta. Sei schede su sette sono dentro; resta Cinema, che è anche l'unica che
non esisteva da nessuna parte prima.)*

| # | App | Stato |
|---|---|---|
| 1 | DaProdVisualizer | dentro (0.1.0) |
| 2 | DaProdMusica | dentro (0.1.0) |
| 3 | DaProdFoto | dentro (0.1.0) — Anima base, FLUX.2 Klein extra |
| 4 | DaProdDream | dentro (0.2.0) |
| 5 | DaProdCompanion | dentro (0.3.1) — senza voce, per adesso |
| 6 | DaProdIoDigitale | dentro (0.2.0) |
| 7 | **DaProdCinema** | **da fare** — da canzone a video musicale |

E le divisioni della suite tornano a coincidere con quelle della wiki: Musica,
Foto, Cinema. Che è come dovrebbe essere.
