<div align="center">

<img src="docs/media/logo.svg" width="110" alt="DaProd Suite">

# DaProd Suite

**I migliori modelli AI, selezionati per te — pronti in due clic.**

Un programma solo per fare musica, immagini, video e parlare con un avatar.
Ogni app la installi quando ti serve e la disinstalli quando non ti serve più.
Gira sul tuo computer: niente account, niente chiavi API, codice aperto.

[![versione](https://img.shields.io/badge/versione-0.2.0-7c5cff)](https://github.com/cammo22/DaProdSuite/releases)
[![licenza](https://img.shields.io/badge/licenza-MIT-5cff9d)](LICENSE)
[![piattaforma](https://img.shields.io/badge/Windows-x64-3ddbff)](#requisiti)
[![sito](https://img.shields.io/badge/sito-cammo22.github.io-ffa63d)](https://cammo22.github.io/DaProdSuite/)
[![domande](https://img.shields.io/badge/domande-frequenti-ff5c8a)](https://cammo22.github.io/DaProdSuite/#domande)
![locale](https://img.shields.io/badge/100%25-locale-5cff9d)
![discord](https://img.shields.io/badge/discord-presto-lightgrey)

**[⬇ Scarica l'ultima versione](https://github.com/cammo22/DaProdSuite/releases/latest)** ·
**[🌐 Sito](https://cammo22.github.io/DaProdSuite/)** ·
**[❓ Domande frequenti](https://cammo22.github.io/DaProdSuite/#domande)**

</div>

---

<div align="center">
<img src="docs/media/hub.png" width="780" alt="La home di DaProd Suite: le app, una accanto all'altra">
</div>

---

## Chi siamo

Di modelli ne esce uno al giorno. Noi di DaProd li proviamo, scartiamo quelli
che non valgono, e a quelli buoni costruiamo intorno un'app che li renda usabili
senza sapere niente di come funzionano. **DaProd Suite** è dove finiscono. Serve
sia a chi ci lavora sia a chi vuole solo provarli.

Ogni app fa una cosa sola e la fa per intero: la installi quando ti serve, la
disinstalli quando non ti serve più. Non c'è niente da configurare, nessun
ambiente da preparare, nessun comando da lanciare.

E siccome girano tutte nello stesso posto, i risultati sono in comune: il brano
che fai in un'app lo apri nell'altra senza esportarlo.

### Cosa c'è sotto

Perché bastino due clic, la suite fa una volta sola — per tutte le app — le
cose noiose:

| | |
|---|---|
| **Un ambiente solo** | Python e PyTorch installati una volta, 4 GB invece di 14,7 sparsi in quattro copie |
| **Modelli condivisi** | quello che serve a due app si scarica una volta |
| **Una GPU sola** | su 8 GB ci sta un modello per volta: la suite spegne il precedente invece di farti finire in out-of-memory |
| **Aggiornamenti** | la suite si aggiorna da sola, i modelli restano dove sono |
| **I tuoi risultati in comune** | brani, immagini e video in una libreria che tutte le app vedono |

Tutto in locale: nessun account, nessuna API, nessun dato che esce dal computer.

## Le app

| | App | Cosa fa | Modello | |
|---|---|---|---|---|
| 🟣 | **DaProdVisualizer** | Ascolti un file audio e lo vedi: la grafica si muove col suono | — | ✅ disponibile |
| 🩷 | **DaProdMusica** | Crei canzoni intere, cantate e suonate, da un testo e uno stile | MiniMax Music 3 · ACE-Step 1.5 | ✅ disponibile |
| 🟠 | **DaProdFoto** | Crei immagini scrivendo cosa vuoi vedere, poi ne cambi un pezzo | Anima Turbo · FLUX.2 Klein | ✅ disponibile |
| 🩵 | **DaProdDream** | Trasformi un video mentre scorre: webcam, un file, o lo schermo | SD-Turbo · Anima | ✅ disponibile |
| 🟥 | **DaProdIoDigitale** | Carichi la foto di un volto e ci parli: ti risponde a voce | LeapTalk | ✅ disponibile |
| 🟪 | **DaProdCinema** | Da una canzone al suo video musicale, scena per scena | LTX 2.5 · MiniMax H3 | ✅ disponibile |
| 🟢 | **DaProdCompanion** | Un assistente sul desktop che si ricorda delle conversazioni di prima | un modello a scelta via LM Studio | ⏳ in arrivo |

Questa non è una lista chiusa: continuiamo a testare modelli nuovi e ad
aggiungere schede. Quello che vedi qui è dove siamo adesso, non dove ci
fermiamo.

### Se colleghi un LLM

Alcune app possono scrivere al posto tuo: il testo di una canzone, la
descrizione di un'immagine. Per farlo serve un modello LLM caricato in
[LM Studio](https://lmstudio.ai) — **qualunque modello**, la suite usa quello
che trova. Noi lavoriamo con
[Bonsai 27B](https://lmstudio.ai/models/prism-ml/bonsai-27b) perché l'abbiamo
misurato a fondo, ma non è obbligatorio, e senza LLM le app funzionano tutte
lo stesso.

## A che punto siamo

> **0.4.0 pubblicata — tutte e sette le schede sono dentro, e nella 0.4.1 in
> prova DaProdCinema torna ai due modelli decisi.**
>
> **DaProdVisualizer, DaProdMusica, DaProdFoto, DaProdDream,
> DaProdIoDigitale** e **DaProdCinema** sono nella suite e funzionano. Si installano da sole, motore e
> modelli compresi, e riprendono da dove erano se cade la rete. In DaProdFoto e
> DaProdDream scegli tu con quale modello generare. Ogni app ha un terminale con
> le ultime righe del motore, e nell'hub ci sono i pannelli per vedere risultati,
> modelli, log, memoria video e spazio occupato in un posto solo. **Le app si
> aprono tutte insieme**: si ascolta un brano nel Visualizer mentre l'app che
> l'ha fatto continua a lavorare.
>
> **DaProdCompanion** — un compagno che ti risponde e la notte rilegge quello
> che vi siete detti per ricordarsene — è entrato nella suite con la 0.3.1. Con
> la 0.3.2 i modelli si scaricano **tre volte più in fretta**: quattro
> connessioni insieme invece di una.
>
> Con la 0.3.3 **DaProdFoto fa foto migliori**: da 30 a 50 step come dice chi ha
> fatto il modello, formato e risoluzione a pulsanti (16:9, 9:16, 4:3, 1:1 per
> 480, 720 o 1080p), e le proposte sopra la casella te le scrivi tu — un titolo
> corto, il prompt intero dentro. Premendo Genera la memoria video viene
> liberata da sola da quello che non serve.
>
> Con la 0.4.1 (in prova) **il modello si sceglie per primo** in DaProdMusica,
> la **lingua del canto** è una fila di pastiglie sopra il testo, il MiniMax a 4
> bit è stato tolto e **DaProdCinema gira con LTX 2.5 o MiniMax H3** al posto di
> Wan 2.2. E quando scarichi un modello da dentro un'app adesso c'è **una barra
> che dice a che punto è**, con la velocità e quanto manca, invece di rimandarti
> all'hub.
>
> Con la 0.3.4 il **ritocco** di DaProdFoto sa rifare anche tutta la foto —
> senza dipingere niente, o dipingendo quello che vuoi tenere e premendo
> **inverti**.
>
> Nella versione in prova, la 0.4.0, **c'è la settima scheda**: DaProdCinema
> prende una canzone dalla libreria, legge i suoi `[Verse]` e `[Chorus]`, e ne
> ricava la scaletta delle inquadrature — quanto dura ognuna, cosa ci succede
> dentro, come si muove la camera. Poi le gira una per una e le monta sopra il
> brano. **Sono minuti a inquadratura**: un video da un minuto e mezzo è più di
> un'ora di scheda video, ed è una cosa da sapere prima di premere Gira.
>
> Sempre nella 0.4.0, **DaProdMusica ha un secondo modo di fare una canzone** —
> ACE-Step 1.5, in otto passi invece di trenta, accanto a MiniMax Music 3 — e il
> **traduttore** italiano→inglese risponde alla prima: prima la prima traduzione
> di ogni sessione non rispondeva mai, e dopo due minuti l'app mandava
> l'italiano al modello. Adesso traduce anche meglio.

Quello che cambia a ogni giro sta in [CHANGELOG.md](CHANGELOG.md), il percorso
completo in [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Requisiti

Proviamo tutto su schede **NVIDIA serie RTX 4000** con almeno 8 GB di VRAM. Di
più è meglio.

**Senza scheda video la suite parte lo stesso**, e adesso te lo dice in faccia
invece di lasciartelo scoprire: DaProdDream, DaProdIoDigitale e DaProdCinema
non si installano nemmeno (fanno video, e senza scheda non è "più lento", è
un'altra cosa), DaProdMusica avvisa che un brano può richiedere ore, e in
DaProdFoto resta acceso il modello che ce la fa.

| | Minimo | Consigliato |
|---|---|---|
| Sistema | Windows 10 64 bit | Windows 11 |
| GPU | NVIDIA, 8 GB di VRAM | 12 GB o più |
| RAM | 16 GB | 32 GB |
| Disco | 15 GB (una o due app) | 40 GB (tutte) |

La macchina di riferimento su cui tutto viene misurato è una **RTX 4060 da 8 GB**.
Non è un caso: gli 8 GB sono il vincolo che decide quasi ogni scelta tecnica di
questo progetto.

**Serve Python installato?** No. La suite si scarica da sola Python 3.12 e
PyTorch, in una cartella sua, senza toccare quello che hai già.

## Installazione

Scarica `DaProdSuite-Setup-<versione>.exe` dalle
[Release](https://github.com/cammo22/DaProdSuite/releases) e aprilo. Un clic,
nessuna domanda, nessun permesso di amministratore.

Al primo avvio la suite ti chiede quali app vuoi e ti dice **quanti GB servono
prima di scaricarli**. Prendi solo quello che usi.

### Dal codice

```bash
git clone https://github.com/cammo22/DaProdSuite.git
```

```bash
cd DaProdSuite && pnpm install && pnpm run dev
```

Serve [Node.js 22+](https://nodejs.org) e [pnpm](https://pnpm.io). Su Windows
puoi anche fare doppio clic su `AVVIA DaProd Suite.bat`, che fa tutto da sé.

---

## Com'è fatta

```mermaid
graph TD
    HUB["Guscio Electron<br/>hub · aggiornamenti · arbitro GPU"]

    HUB --> V["DaProdVisualizer"]
    HUB --> UI["Interfacce delle altre app"]
    HUB --> SUP["Supervisore dei processi"]

    SUP -->|"/health · /shutdown"| COMFY["ComfyUI<br/>Musica · Foto · Cinema"]
    SUP -->|"/health · /shutdown"| DREAM["motore Dream"]
    SUP -->|"/health · /shutdown"| TALK["motore IoDigitale"]
    SUP -->|"/health · /shutdown"| BRAIN["cervello Companion"]

    COMFY --> PY["Ambiente Python condiviso<br/>3.12 · torch 2.13 · CUDA"]
    DREAM --> PY
    TALK --> PY
    BRAIN --> PY

    COMFY --> MOD["Modelli condivisi"]
    DREAM --> MOD
    TALK --> MOD
```

Tre idee, e tutto il resto discende da queste.

**Un ambiente solo.** Python e PyTorch si installano una volta e li usano tutti i
motori. Prima erano quattro installazioni con quattro versioni diverse di torch.

**Un patto solo.** Ogni motore ascolta su `127.0.0.1`, risponde `200` su
`/health` quando è pronto e si spegne su `/shutdown`. Rispettato questo, lo shell
non ha bisogno di sapere altro — ed è il motivo per cui lo stesso supervisore
gestisce motori scritti in modi molto diversi.

**Un modello alla volta sulla GPU.** Con 8 GB non ce ne stanno due. Chi vuole la
GPU la chiede all'arbitro, che spegne il precedente. Senza questo, aprire Foto
mentre gira Musica finisce in out-of-memory.

### Dove finiscono le cose

```
C:\Program Files\DaProd Suite\        il programma, sostituito a ogni aggiornamento
%LOCALAPPDATA%\DaProdSuite\
  ├─ runtime\      Python 3.12 + PyTorch          ~4 GB
  ├─ engines\      ComfyUI e altri motori
  ├─ models\       i pesi, condivisi fra le app   fino a ~27 GB
  ├─ output\       brani, immagini, video
  └─ logs\         un file per componente
```

Aggiornare la suite tocca solo la prima riga. **I tuoi modelli e i tuoi risultati
non vengono mai riscaricati né cancellati**, nemmeno disinstallando.

### Quanto spazio serve

| App | Primo avvio | Extra a richiesta |
|---|---|---|
| DaProdVisualizer | — | |
| DaProdDream | 2,6 GB | +5,6 GB per sognare con Anima |
| DaProdFoto | 5,6 GB | +6,3 GB FLUX.2 Klein 4B · +12,0 GB il 9B |
| DaProdMusica | 13,7 GB | +8,0 GB MiniMax Music 3 · +9,3 GB ACE-Step XL · +5,6 GB per le copertine con Anima* |
| DaProdIoDigitale | 10,4 GB | +6,0 GB modello Pro |
| DaProdCinema | 23,2 GB | +42,3 GB MiniMax H3 |

<sub>* zero se hai già DaProdFoto o DaProdDream: i pesi di Anima sono gli stessi,
condivisi.</sub>

**DaProdCinema è l'unica che costa così tanto**, e non c'è un modo onesto di
farla costare meno: un modello che genera video *con il suono* è un 22B, e i 23
GB sono già la sua versione più compressa che il motore sappia caricare.

Più ~4 GB di ambiente Python, una volta sola. Gli extra sono qualità migliore in
cambio di spazio: la suite non li scarica se non glielo chiedi, e i byte sono
quelli veri — misurati sul file, non stimati.

---

## Dal telefono

<img src="docs/media/logo.svg" width="46" align="right" alt="">

Inquadri un QR e usi la suite dal telefono o dal tablet — sulla stessa wifi, o da
fuori casa attraverso un tunnel che si accende a mano.

Il QR non contiene una password permanente: contiene un invito che **scade in
cinque minuti** e vale una volta sola. Ogni dispositivo ottiene la sua credenziale,
con i suoi permessi, revocabile da sola. I motori restano su `127.0.0.1` e non
sono mai raggiungibili da fuori: passa tutto da un gateway che autentica.

Progetto completo: [docs/ACCESSO-REMOTO.md](docs/ACCESSO-REMOTO.md) — in arrivo
con la 0.4, l'app Android con la 0.5.

---

## Perché va veloce su 8 GB

Alcune scelte misurate, non ipotizzate:

**W4A8 invece dei GGUF a 4 bit.** Pesano uguale, ma sulla stessa GPU: **5-7
frame/s contro 1**. ComfyUI-GGUF dequantizza i pesi a ogni passo — irrilevante per
la diffusione, disastroso per un decoder autoregressivo che fa 25 passi per
secondo di musica.

**Decode a blocchi.** Su 120 secondi di musica: 15 minuti invece di 20, e la VRAM
non esplode.

**La copertina prima del brano.** L'immagine costa venti secondi, la musica
minuti: si genera prima l'artwork, così mentre la musica lavora hai già qualcosa
davanti.

**Il modello base non è il più grande.** DaProdFoto parte con Anima (5,6 GB,
veloce) invece di FLUX.2 Klein (12,4 GB, al limite della VRAM). FLUX resta a un
clic di distanza per quando la qualità conta.

Il ragionamento completo è in
[docs/MODELLI-E-STRATEGIA.md](docs/MODELLI-E-STRATEGIA.md).

---

## Documentazione

| | |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Cosa è cambiato, dall'ultima volta in giù |
| [COME-SI-LAVORA.md](docs/COME-SI-LAVORA.md) | Regole della repo, versioni, come si aggiunge un'app |
| [MODELLI-E-STRATEGIA.md](docs/MODELLI-E-STRATEGIA.md) | Quali modelli, quanto pesano, cosa si è compattato |
| [VERIFICA-AMBIENTE-UNIFICATO.md](docs/VERIFICA-AMBIENTE-UNIFICATO.md) | La prova che i quattro motori girano su un solo torch |
| [ACCESSO-REMOTO.md](docs/ACCESSO-REMOTO.md) | QR, gateway, app Android |
| [ROADMAP.md](docs/ROADMAP.md) | Dove si sta andando |
| [RIPRENDERE-DA-QUI.md](docs/RIPRENDERE-DA-QUI.md) | Stato del lavoro e prossimo passo, fra una sessione e l'altra |

## Sviluppo

```bash
pnpm install
```

```bash
pnpm run dev
```

```bash
pnpm run typecheck
```

```bash
pnpm run dist
```

`dist` produce l'installer in `installer/`. La struttura:

```
apps/shell/        il guscio: hub, aggiornamenti, supervisore, arbitro GPU
apps/<app>/        un'interfaccia per app
packages/ipc/      catalogo delle app e contratti tipizzati
packages/runtime/  creazione dell'ambiente Python condiviso
packages/ui/       design condiviso
services/<id>/     i motori Python
manifest/          catalogo dei modelli: URL, dimensioni, a chi servono
```

Aggiungere un'app è una procedura di sei passi, scritta in
[COME-SI-LAVORA.md](docs/COME-SI-LAVORA.md) § 4.

---

## Ringraziamenti

La suite non addestra nulla: mette insieme il lavoro di altri e lo rende usabile.

| | |
|---|---|
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | il motore di inferenza di Musica, Foto e Cinema — GPL-3.0, scaricato a parte |
| [MiniMax](https://github.com/MiniMax-AI) · [ACE-Step](https://huggingface.co/ACE-Step) | i due modi di fare una canzone |
| [LTX-2.5](https://huggingface.co/Lightricks/LTX-2.5) · [MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) | il video di DaProdCinema, con il suono dentro |
| [Anima](https://huggingface.co/circlestone-labs/Anima) · [FLUX.2 Klein](https://huggingface.co/unsloth/FLUX.2-klein-9B-GGUF) | le immagini |
| [LeapTalk](https://huggingface.co/z-rx/leaptalk) · [SoulX-FlashHead](https://huggingface.co/Soul-AILab/SoulX-FlashHead-1_3B) | l'avatar parlante: LeapTalk gira sopra SoulX, che è il suo modello di base |
| [SD-Turbo](https://huggingface.co/stabilityai/sd-turbo) | la trasformazione in tempo reale |
| [Whisper](https://github.com/SYSTRAN/faster-whisper) · [Piper](https://github.com/rhasspy/piper) | ascoltano e parlano, in locale |
| [opus-mt](https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-it-en) | traduce le descrizioni in inglese prima di generare |
| [LM Studio](https://lmstudio.ai) | tiene acceso l'LLM che scrive testi e descrizioni |
| [WanGP](https://github.com/deepbeepmeep/Wan2GP) | non è usato dalla suite, ma le sue tecniche di memoria sono state la scuola |

I modelli mantengono ognuno la propria licenza: si scaricano dalle loro fonti, non
sono ridistribuiti qui.

## Community

Apriremo un **Discord**: aggiornamenti, richieste, e un posto dove chiedere
aiuto. Per ora si passa dalle
[segnalazioni](https://github.com/cammo22/DaProdSuite/issues), e le domande più
comuni hanno già una risposta
[sul sito](https://cammo22.github.io/DaProdSuite/#domande).

## Licenza

[MIT](LICENSE) — il codice della suite. I motori e i modelli di terze parti hanno
le loro licenze, elencate qui sopra.

<div align="center">

**DaProdProduzioni**

</div>
