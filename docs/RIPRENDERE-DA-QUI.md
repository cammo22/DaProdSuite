# Riprendere da qui

Documento di passaggio fra una sessione e l'altra. Aggiornato il 15 agosto 2026.

**Se stai leggendo questo all'inizio di una conversazione nuova**: leggi anche
[COME-SI-LAVORA.md](COME-SI-LAVORA.md) e [ROADMAP.md](ROADMAP.md), poi vai al
paragrafo "Il prossimo passo".

---

## Dove siamo

Repo pubblico: **https://github.com/cammo22/DaProdSuite**

| | Stato |
|---|---|
| Guscio Electron, hub, arbitro GPU, supervisore | fatto e provato |
| Installer NSIS + aggiornamento da GitHub Releases | fatto, `.exe` da 95,4 MB costruito |
| Ambiente Python condiviso | fatto: **4,05 GB** invece di 14,7 in quattro venv |
| I quattro motori su torch 2.13 | verificati, IoDigitale compreso |
| **DaProdVisualizer nella suite** | fatto, **da provare** |
| Libreria condivisa + scambio fra app | fatto e provato su un brano vero |
| Spazio su disco per scheda, disinstalla, reset | fatto |
| Modelli importati dai vecchi progetti | **30,29 GB spostati** |
| Scaricamento modelli, procedura guidata | **da fare** |
| Musica, Foto, Dream, Companion, IoDigitale | **da migrare** |

Ramo `suite-interconnessa`, PR **#1** aperta verso `main`. Il ramo esiste solo
perché una PR non può andare da `main` a `main`: va unito e cancellato.

## Il prossimo passo

**DaProdMusica dentro la suite.** È la 0.1.0 della roadmap ed è quella che
riempie la libreria che il Visualizer sa già leggere.

Cosa c'è già di pronto perché parta bene:

- l'ambiente Python funziona e ha già le dipendenze di ComfyUI installate
- ComfyUI è in `%LOCALAPPDATA%\DaProdSuite\engines\ComfyUI` e **parte in 1 secondo**
- i modelli di MiniMax sono già a posto e ComfyUI li vede da `extra_model_paths.yaml`
- lo schema di migrazione è fissato dal Visualizer

Il lavoro:

1. `services/comfy/` — l'avvio di ComfyUI con i flag giusti, presi da
   `MinimaxMusica/start.ps1`: `--disable-dynamic-vram`, `--enable-cors-header`,
   `--output-directory` verso `output/musica`
2. `apps/musica/` — `MinimaxMusica/app/index.html` (75 KB monolite) spezzato
3. `apps/shell/src/main/apps/musica/` — finestra + avvio del servizio
4. aggiungere `"musica"` a `MIGRATED` e a `FINESTRE` in `app-manager.ts`
5. `library_api.py` va sostituito dalla libreria condivisa della suite

⚠ **Il supervisore va collegato**: oggi `app-manager.open()` apre solo la
finestra. Per le app con motore va avviato `ProcessSupervisor` prima, e la
finestra dopo che `/health` risponde. Il codice del supervisore c'è ed è provato,
ma non è ancora richiamato da nessuno.

## Cose da sapere che non si vedono dal codice

**Prima di ogni commit**: `pnpm run build && pnpm run typecheck`.

**Per provare un'app senza passare dall'hub**:
`.\node_modules\.bin\electron.CMD . --apri visualizer` dalla cartella `apps/shell`.

**Per vedere una finestra**: `pwsh apps/shell/scripts/capture-window.ps1 -Titolo
"DaProd Suite" -Out schermata.png`. Usa `PrintWindow`, funziona anche se la
finestra è coperta.

**Per provare un modulo del main fuori da Electron**: si sostituisce il modulo
`electron` con un finto tramite `Module._load`. Esempi funzionanti in
`packages/runtime/scripts/prova-installazione.cjs`.

**Non committare mai senza aver provato.** In questa sessione tre bug sono
usciti solo guardando l'app girare: la CSP che citava ancora `dpv:` (avrebbe
bloccato l'audio), `peso()` che restituiva 0 sui file (Musica e Foto risultavano
non installate), SoulX contato due volte.

## Regole di Cammo

- **Solo `main`**, niente rami di prova. Si parte da 0.0.1 e il numero sale solo
  quando si pubblica.
- **Il codice da testare resta sul PC.** Si pubblica solo dopo il suo ok.
- **Una app alla volta**: si porta dentro, la prova lui, si aggiusta, poi la
  successiva.
- **L'interfaccia è in italiano**, senza termini inglesi dove esiste la parola
  italiana.
- La wiki `HermesGPT\dapwikiGPT` è **in sola lettura**: si consulta, non si tocca.

## Decisioni già prese, da non riaprire

| | |
|---|---|
| Companion | **LM Studio**, non Ollama |
| DaProdFoto | Anima di base, FLUX.2 Klein come extra |
| DaProdCinema | motore nostro; ComfyUI ha già i nodi MiniMax H3 nativi, mancano le sliding window |
| DaProdCinema | due strade: registrare gli effetti del Visualizer (breve) e le clip generate (lunga) |
| Modelli | spostati dai vecchi progetti; MinimaxMusica e AvatarParlante ora sono archivio |
| Mage-VL | **scartato**: non genera immagini, le comprende |
| ComfyUI | scaricato al primo avvio, non nel repo: è GPL-3.0 e la suite è MIT |

## Cosa aspetta un giudizio di Cammo

- **Il Visualizer**: aperto dalla suite, con il pannello "Brani generati". Va
  provato — soprattutto se "Ascolta" fa partire davvero il brano.
- **La PR #1**: da unire e cancellare il ramo.
