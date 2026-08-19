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
| DaProd IoDigitale | SoulX-FlashHead + LeapTalk + wav2vec2 | 14,8 GB |
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
| Cinema | **MiniMax H3** (in WanGP) | — | solo wiki, ma vedi § 5 |

Per Musica e Foto il codice ha superato la wiki e la suite segue il codice.
Per il **video** invece esiste solo il metodo manuale in WanGP: è l'unico pezzo
del tuo flusso che la suite non copre ancora.

**Deciso:** ACE-Step è superato, per la musica vale MiniMax Music 3.

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
| 6 | DaProd IoDigitale | dentro (0.2.0) |
| 7 | **DaProdCinema** | **da fare** — da canzone a video musicale |

E le divisioni della suite tornano a coincidere con quelle della wiki: Musica,
Foto, Cinema. Che è come dovrebbe essere.
