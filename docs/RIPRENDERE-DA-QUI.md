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
| DaProdVisualizer nella suite | fatto, **da provare** |
| Libreria condivisa + scambio fra app | fatto e provato su un brano vero |
| Spazio su disco per scheda, disinstalla, reset | fatto |
| Modelli importati dai vecchi progetti | **30,29 GB spostati** |
| **Supervisore collegato all'apertura delle app** | fatto e provato |
| **DaProdMusica nella suite** | fatto, brano generato dentro la suite, **da provare a lungo** |
| **DaProdFoto nella suite** | fatto, immagine generata dall'app, **ritocco da provare** |
| **Scaricamento automatico di modelli e motore** | fatto e provato, **da provare tu su una scheda intera** |
| Procedura guidata al primo avvio | **da fare** |
| Dream, Companion, IoDigitale | **da migrare** |

Si lavora solo su `main`: i rami `suite-interconnessa` e `musica-nella-suite`
sono stati uniti e cancellati, e con loro le PR #1 e #2.

## Com'è entrata DaProdMusica

Cinque pezzi, e nessuno dei cinque è solo suo — tre valgono per tutte le app che
verranno.

**`services/comfy/`** — `avvio.py` scrive a ogni avvio il file dei percorsi
(modelli condivisi + i nodi nostri) e lancia ComfyUI con i flag misurati in
MinimaxMusica. `nodi/daprod_ponte/` aggiunge a ComfyUI le due rotte che gli
mancavano per rispettare il patto dei motori: `GET /health` e `POST /shutdown`.
In più `/daprod/modelli` e `/daprod/scarica`, che sono l'unica cosa che *deve*
stare dentro al motore, perché la VRAM la conosce solo lui.

**`servizi.ts`** — il supervisore adesso viene chiamato: `app-manager.open()`
accende il motore e aspetta `/health` **prima** di mostrare la finestra, e
`close()` lo spegne solo se non serve a un'altra app. Vale per tutte e sei.

**La libreria condivisa sa anche scrivere** — rinomina, copertina, metadati,
elimina. Sostituisce `library_api.py`, che in MinimaxMusica era un custom node di
ComfyUI: ora le stesse operazioni valgono per tutte le app e funzionano anche a
motore spento.

**`apps/musica/`** — il monolite da 75 KB spezzato in quattordici moduli ES.
Niente impacchettatore: la pagina è caricata da `daprod://musica/`, un secondo
uso dello schema della suite, perché da `file://` i moduli non si importano fra
loro. È la strada per ogni app che non ha bisogno di Vite.

**`apps/shell/src/main/apps/musica/`** — la finestra. Corta, perché quasi tutto
quello che le serve è già comune.

## Quello che Cammo ha chiesto il 15 agosto, provando Foto

In ordine di quanto sono grosse. Le prime tre sono già fatte.

- [x] **Nei metadati di ogni immagine c'è il modello** con cui è nata, e si vede
      nella galleria.
- [x] **Cliccando un'immagine si apre a schermo intero** (Esc o un clic per
      chiudere).
- [x] **Le ultime immagini compaiono nella scheda Crea**, sotto la sessione:
      quello che generi si vede dove l'hai chiesto.

- [ ] **I pulsanti Risultati / Modelli / Log dell'hub devono aprire dei pannelli
      veri, non Esplora risorse.** Oggi chiamano `shell.openPath`, che apre una
      finestra di Windows dietro l'app e sembra non faccia niente. Vanno fatti
      dentro la suite:
      - **Risultati**: la galleria trasversale di *tutte* le app — audio,
        immagini, video insieme. La libreria condivisa la sa già dare
        (`libreria.cerca()` senza filtri): manca solo la pagina.
      - **Modelli**: cosa c'è sul disco, quanto pesa, quali schede lo usano, e
        cosa si può ancora scaricare. `manifest/models.json` ha già tutto.
      - **Log**: le ultime righe di ogni servizio, lette da `logs/`.

- [ ] **"Mostra nella cartella" in Foto dà errore.** Da riprodurre: il percorso
      arriva da `libreria.trova(id)`, quindi il sospetto è un id che non combacia
      più dopo un aggiornamento della libreria.

- [ ] **In Foto si sceglie il modello**, e se non ce l'hai lo scarichi da lì.
      Oggi Anima è cablata in `apps/foto/src/grafi.js`. Vanno aggiunti almeno
      **FLUX.2 Klein** (vuole il nodo GGUF, vedi sotto) e **SD-Turbo**, che è già
      nel catalogo perché lo usa DaProdDream. Dipende dallo scaricamento.

- [ ] **Il ritocco con Anima: funziona davvero?** FLUX.2 Klein l'inpainting lo
      fa (era la seconda scheda di Flux Klein Studio). Anima è un modello turbo
      distillato, e i turbo con `denoise` basso spesso rendono male. **Da
      verificare online e provando**, e in base a quello il pennello si accende o
      si spegne a seconda del modello scelto: meglio un pulsante spento che uno
      che dà risultati brutti.

**Su come si racconta il progetto.** Cammo ha chiesto di non fare riferimento a
ComfyUI e WanGP nella vetrina pubblica: la suite non è un guscio sopra quelli, è
un'alternativa grafica per provare i modelli, sotto la nostra direzione. Giusto
come posizionamento, e il README va riscritto così. Due cose però restano:

1. **Nel codice il motore va chiamato col suo nome.** `services/comfy` avvia
   ComfyUI e ne usa l'API: un file che non lo dice è un file che nessuno può
   più mantenere.
2. **ComfyUI è GPL-3.0.** Non lo ridistribuiamo — si scarica al primo avvio — ma
   dire da qualche parte quale motore di terzi si usa è corretto e conviene.

Quindi: fuori dal racconto pubblico, dentro nei file tecnici e in una riga di
crediti. Se preferisci diversamente, dillo.

## Com'è entrato lo scaricamento automatico

Premere "Installa" su una scheda adesso fa tutto: ambiente Python se manca,
motore se l'app ne guida uno, poi i modelli che le mancano, uno alla volta.
Prima di questo la suite dava per scontato che trenta GB di pesi e ComfyUI
fossero già sul disco, cioè funzionava su un computer solo — questo.

Cinque pezzi, e valgono per tutte le app che verranno.

**`packages/runtime/scarica.ts`** — un file grosso, ripreso da dove si era
fermato. Si scrive accanto al definitivo un `.parte`, e al tentativo dopo si
chiede al server solo il pezzo che manca con un'intestazione `Range`. Il nome
definitivo arriva **solo** a file intero e della dimensione dichiarata: finché
c'è un `.parte`, per la suite quel modello non esiste, e nessun motore ne
caricherà mai metà.

**`packages/runtime/hf.ts`** — i repo HuggingFace interi (SD-Turbo, SoulX), con
`snapshot_download` dentro il Python condiviso. L'avanzamento non si legge dal
loro output: si pesa la cartella ogni due secondi, che è lo stesso numero
misurato dove non può mentire.

**`packages/runtime/motore.ts`** — ComfyUI, dallo zip di una versione **fissata**
(0.33.0), non dall'ultimo commit: la suite deve installare quello che abbiamo
provato, non quello di stamattina. Niente `git clone`, perché chi installa
dall'installer non ha per forza git. Poi le sue librerie entrano nell'ambiente
condiviso, tolti i due pacchetti di esempi e documentazione dell'editor (che non
apriamo mai) e torch (che c'è già, con la build CUDA giusta).

**`apps/shell/src/main/scaricamenti.ts`** — l'orchestratore, che mette in fila le
tre cose e le racconta all'hub. **L'avanzamento si conta in byte, non in file**:
un'app con un modello da 5,9 GB e due da 200 MB, contata in file, resterebbe
ferma a "1 di 3" per venti minuti e poi finirebbe in trenta secondi.

**La scheda nell'hub** ha una barra col colore dell'app e il bottone diventa
"Annulla". Quando non si sa quanto manca — l'ambiente Python, le librerie del
motore — la barra scorre invece di restare ferma a zero.

### Le due cose che si sono viste solo provando

**Il comando `hf` non può esistere in questo ambiente.** `transformers`, che
ComfyUI si porta dietro, pretende `huggingface-hub<1.0`; il comando `hf` nasce
dalla 1.0 in poi. Erano compatibili solo perché l'ambiente era rimasto in uno
stato incoerente, e la prima installazione automatica del motore lo ha rimesso a
posto lasciando in giro un `hf.exe` che puntava a un modulo sparito. Adesso
`base.txt` dichiara il tetto `<1.0` e si usa la libreria, che c'è in tutte e due
le versioni. **Se un giorno l'ambiente si ricrea da zero, è normale che `hf` non
ci sia: non serve più a nessuno.**

**Tre modelli nel catalogo avevano dimensioni stimate.** I due FLUX e il VAE
erano arrotondati, e `isModelPresent` confronta i byte *esatti*: scaricati bene,
sarebbero risultati mancanti per sempre. Adesso i byte vengono tutti dal
`Content-Length` vero o dall'API di HuggingFace. Stessa storia per SD-Turbo, che
dichiarava 2,6 GB mentre il repo intero ne pesa 13: ora ha gli `include` che
prendono solo la pipeline fp16, che è quello che serviva a Dream.

## Il prossimo passo

Adesso che i modelli si scaricano da soli, **FLUX.2 Klein in Foto si può fare**:
era bloccato solo da questo. Servono il nodo ComfyUI-GGUF (che il motore non ha,
e va installato come si installa ComfyUI) e la scelta del modello nell'interfaccia
di Foto, con SD-Turbo che è già nel catalogo.

Restano aperte anche le altre cose che avevi chiesto il 15: i pannelli veri per
Risultati / Modelli / Log, "Mostra nella cartella" che dà errore, e il ritocco
con Anima da verificare.

Poi la procedura guidata al primo avvio, e tre app da migrare: **Dream**,
**Companion**, **IoDigitale**.

### Com'è entrata DaProdFoto

Viene da **`Desktop\Flux`** (Flux Klein Studio), e tre quarti di quel progetto
erano roba che la suite fa già:

| Cosa c'è in Flux | Che fine fa |
|---|---|
| `fluxapp/setup_manager.py`, `downloader.py`, `comfy_server.py`, `comfy_client.py` | **si buttano**: ambiente, scaricamento e avvio di ComfyUI sono della suite |
| `engine/ComfyUI` | si butta: è lo stesso motore che accende Musica |
| `fluxapp/workflows.py` (143 righe) | diventa `apps/foto/src/grafi.js` |
| `web/` (già tre file: `index.html`, `app.js`, `style.css`) | diventa `apps/foto/` |

**Attenzione a una cosa che si vede solo leggendo `workflows.py`:** la strada
FLUX.2 Klein usa `UnetLoaderGGUF` e `CLIPLoaderGGUF`, cioè il custom node
**ComfyUI-GGUF**, che nel nostro motore non c'è. Anima invece gira su nodi core,
e i suoi pesi sono già su disco perché li usa Musica per le copertine. Quindi:

1. **Anima come base** — è quella che è entrata: testo→immagine e ritocco con
   maschera, tutto con nodi core, senza scaricare niente.
2. **FLUX.2 Klein come extra** — servono ComfyUI-GGUF e 12,4 GB di pesi, e senza
   lo scaricamento automatico non si può comunque installare. Si fa quando c'è
   quello.

**Sui grafi condivisi**: `apps/musica/src/grafi.js` ha già un grafo Anima, ma è
quello delle copertine (10 passi, cfg 1.0, `PreviewImage`). Quello di Foto ha
passi, cfg, formato, negativo e maschera. Sono parenti, non uguali: per ora ognuna
ha il suo, e si promuovono a pacchetto condiviso quando li vorrà anche una terza
app. Quello che *è* già condiviso, ed è la cosa che rischiava di divergere, sono i
nomi dei file dei modelli: stanno in `manifest/models.json`.

**Il ritocco è l'unica cosa davvero nuova.** Si dipinge la zona in rosso,
`SetLatentNoiseMask` dice al campionatore dove può mettere le mani e `denoise`
decide quanto tenere di quello che c'era. L'immagine di partenza viene
ridisegnata a lati multipli di 16 ed entro 1536 **prima ancora di mostrarla**,
perché il VAE lavora a blocchi di 8: se ritagliasse lui, la maschera resterebbe
disallineata rispetto all'immagine e si rifarebbe la zona sbagliata.

**Lo schema `daprod:` adesso risponde con `Access-Control-Allow-Origin`.** La
pagina di un'app sta su `daprod://foto`, i suoi file su `daprod://file`: origini
diverse, quindi leggerli con `fetch` è una richiesta incrociata. Senza quella
intestazione fallivano il ritaglio di una copertina in Musica e l'apertura di una
foto nel ritocco.

## Cose da sapere che non si vedono dal codice

**Prima di ogni commit**: `pnpm run build && pnpm run typecheck`.

**Per provare un'app senza passare dall'hub**:
`.\node_modules\.bin\electron.CMD . --apri musica` dalla cartella `apps/shell`.

**Per vedere una finestra**: `pwsh apps/shell/scripts/capture-window.ps1 -Titolo
"DaProdMusica" -Out schermata.png`. Usa `PrintWindow`, funziona anche se la
finestra è coperta.

**I moduli di `apps/musica` non hanno un compilatore che li controlli.** Per non
scoprire un errore di sintassi solo aprendo la finestra:
`.\apps\visualizer\node_modules\.bin\oxlint apps\musica`.

**Per provare lo scaricamento senza aspettare 8 GB**, due comandi:

- `node packages/runtime/scripts/prova-scaricamento.cjs` — scarica per davvero il
  VAE di Anima in una cartella temporanea, lo interrompe a 20 MB e lo riprende.
- `node apps/shell/scripts/prova-scaricamento-app.cjs` — preme "Installa" su
  DaProdMusica per finta: annulla a metà, ripreme, e controlla stati, byte e
  file. Fa scaricare solo i 216 MB del VAE di MiniMax, perché il resto entra
  nella radice di prova come giunzione.

Il secondo usa un trucco che vale anche per altro: il finto `electron` decide
`app.getPath("appData")`, e siccome `paths.ts` costruisce tutto da lì, l'intera
suite scrive in una cartella di prova invece che nella tua.

**Non si possono aprire due suite insieme.** C'è il lock a istanza singola: se ne
lanci una seconda, quella nuova esce subito e mette in primo piano la vecchia. Se
stai provando del codice appena compilato e non cambia niente, è perché stai
guardando l'istanza di prima.

**Un ComfyUI acceso a mano blocca tutto.** La porta 8188 è fissa nel catalogo:
se è occupata, `servizi.ts` lo dice subito invece di far aspettare tre minuti.
Capita davvero — due motori di MinimaxMusica erano rimasti accesi dalla notte.

**Per provare un modulo del main fuori da Electron**: si sostituisce il modulo
`electron` con un finto tramite `Module._load`. Esempi funzionanti in
`packages/runtime/scripts/prova-installazione.cjs`.

**Non committare mai senza aver provato.** In questa sessione i difetti veri sono
usciti solo guardando Cammo usare l'app: la copertina che compariva come secondo
lavoro in coda e sembrava un doppione, il pannello del dettaglio appiccicato in
alto che nascondeva i propri pulsanti sotto il bordo dello schermo, e il lettore
che passava da solo al brano dopo.

## Regole di Cammo

- **Solo `main`**, niente rami di prova, **niente pull request**. Si parte da
  0.0.1 e il numero sale solo quando si pubblica.
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
| ComfyUI | scaricato dalla suite, non nel repo: è GPL-3.0 e la suite è MIT |
| ComfyUI | versione **fissata** (0.33.0) in `packages/runtime/src/motore.ts`: si aggiorna quando lo decidiamo noi e riproviamo i motori, non da sé |
| huggingface-hub | tetto a `<1.0`, perché lo pretende `transformers`. Niente comando `hf`: si usa `snapshot_download` |
| Copertine | generate con `PreviewImage`, quindi nei temporanei: se andassero in output la libreria si riempirebbe di copertine sciolte |
| Lettore di Musica | a fine brano si ferma, non passa al successivo |

## Cosa aspetta un giudizio di Cammo

- **DaProdMusica**: un brano vero l'ha già fatto, con copertina, dentro la suite.
  Restano da provare a lungo la libreria (rinomina, copertina da file, elimina),
  la scheda Immagini e "apri nel Visualizer".
- **DaProdFoto**: un'immagine l'ha già fatta. Resta da provare il **ritocco** —
  è il pezzo nuovo e non l'ha ancora visto nessuno girare — e il giro completo
  "genero un'immagine qui, la mando a Musica come copertina di un brano".
- **Il Visualizer**: aperto dalla suite, con il pannello "Brani generati". Va
  provato — soprattutto se "Ascolta" fa partire davvero il brano.
- **Lo scaricamento**: provato a fondo sui 216 MB del VAE di MiniMax, annullato e
  ripreso. Quello che non ha ancora visto nessuno è **una scheda intera da zero**
  — cancella i modelli di una scheda dal pannello Spazio e ripremi Installa: sono
  7,9 GB per Musica, 5,6 per Foto. È lì che si vede se la barra racconta la
  verità per mezz'ora di fila.
