# Riprendere da qui

Documento di passaggio fra una sessione e l'altra. Aggiornato il **18 agosto
2026**, con la 0.2.0 costruita.

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
| **Scelta del modello in Foto + FLUX.2 Klein** | fatto, **da provare tu**: nodo e motore provati, un'immagine FLUX no |
| **Nodi custom del motore installati dalla suite** | fatto e provato (ComfyUI-GGUF) |
| **Motore aggiornabile: ComfyUI 0.33.1** | fatto e provato, corregge il difetto che ammazzava i brani |
| **Procedura guidata al primo avvio** | fatta e provata: **con questa la 0.1.0 è chiusa** |
| **Velocità: normale / spinta** | interruttore fatto, **da misurare** |
| **Pubblicata la 0.1.0 su GitHub** | fatto: installer e `latest.yml` nella Release |
| **DaProdDream nella suite** | fatto; **Anima come secondo modello** fatto e provato |
| **Un'app può chiedere un motore in più** | fatto e provato (Dream chiede ComfyUI per Anima) |
| **Pulsanti veri nelle gallerie + finestre strette** | fatto e provato, Foto e Musica |
| **LTX 2.5 nel piano di Cinema** | scritto, con i nodi verificati sul motore |
| **DaProd IoDigitale nella suite** | fatto il 17 agosto, **interfaccia ancora in inglese** |
| **Icone della suite e delle app, fatte con Anima** | fatte e provate (18 agosto) |
| **Hub in 4:3, e più grande** | fatto e provato: 1266×949 su questo monitor |
| **Il Visualizer si apre da dentro le altre app** | fatto e provato |
| **0.2.0 costruita** | installer sul PC, **non ancora pubblicata** |
| Companion | **da migrare** |

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

- [x] **In Foto si sceglie il modello**, e se non ce l'hai lo scarichi da lì.
      Dentro **Anima** e **FLUX.2 Klein**. SD-Turbo no, e non per dimenticanza:
      nel catalogo è uno snapshot diffusers per DaProdDream, che i nodi di serie
      del motore non caricano — servirebbe il `DiffusersLoader`, che è deprecato,
      o un checkpoint diverso. Si rivede quando tocca a Dream.

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

## Quello che Cammo ha chiesto dopo aver provato a fondo

In ordine di quanto fanno male. Le prime due sono fatte.

- [x] **Il brano moriva con `'RVQDepthDecoder' object has no attribute
      '_v_block'`**, a volte dopo pochi secondi, a volte dopo quattro minuti.
      **Era un difetto di ComfyUI, e ci eravamo sbagliati**: la copertina
      generata per prima lo faceva comparire più spesso, ma la causa era loro —
      la 0.33.0 provava a catturare un CUDA graph su un modulo che con
      `--disable-dynamic-vram` quell'attributo non ce l'ha. La 0.33.1 corregge
      quella riga, e la suite adesso ci sta sopra (vedi
      [VELOCITA-MUSICA.md](VELOCITA-MUSICA.md) § 4). L'ordine invertito resta:
      svuotare la VRAM prima del brano è giusto comunque.
- [x] **Il ritocco non mostrava il risultato nella sua scheda** (compariva in
      Crea e in galleria). Adesso il risultato prende il posto dell'originale
      sulla tela e ci si può dipingere sopra di nuovo.

- [x] **Selettore del modello in DaProdFoto**, con dentro **FLUX.2 Klein**.
      Fatto: il nodo ComfyUI-GGUF se lo installa la suite, i pesi (11,2 GB, non
      12,4: i byte veri sono più bassi) si scaricano dal riquadro sotto il menu, e
      `grafi.js` adesso è un catalogo di modelli con i propri grafi.

- [ ] **La copertina va salvata su disco appena è generata.** Oggi nasce come
      `PreviewImage`, quindi finisce nei temporanei, e sopravvive solo se la
      applichi a un brano. La decisione di allora ("se andassero in output la
      libreria si riempirebbe di copertine sciolte") resta giusta: la strada è
      scriverla subito accanto al brano con `libreria.copertina()`, non
      trasformarla in un risultato sciolto.

- [ ] **Un terminale dentro ogni app.** Una finestrella con le ultime righe del
      motore e auto-follow, così si vede cosa succede e gli errori si leggono
      dove sono capitati invece che in un file. Le righe ci sono già: `logs/` le
      raccoglie tutte, e il ponte della suite può servirle a qualunque finestra —
      è una cosa da fare **una volta per tutte le app**, non sei volte.

- [ ] **MiniMax Music 3 "il top del top".** Il collo di bottiglia è misurato ed è
      la parte autoregressiva: 76% del tempo. Il 16 agosto Cammo ha portato il
      changelog di **WanGP**, che dice di essere tre volte più veloce con un
      "vllm engine". Letto il loro codice e il nostro motore, il quadro è in
      **[VELOCITA-MUSICA.md](VELOCITA-MUSICA.md)**, e le prove da fare sono lì in
      fondo, dalla più economica. Le prime due non costano una riga di codice:
      rimisurare sulla 0.33.1, e riprovare senza `--disable-dynamic-vram`.

## Come la suite installa quello che non è suo

Tre cose non stanno nel repo e arrivano da fuori, e adesso funzionano tutte e tre
allo stesso modo: **zip di una versione fissata**, aperto in una cartella
provvisoria, spostato al suo posto solo se è tutto lì, e la versione scritta
accanto **come ultimo passo**.

| Cosa | Dove | Chi |
|---|---|---|
| ComfyUI | `engines/ComfyUI` | `packages/runtime/src/motore.ts` |
| Nodi custom (ComfyUI-GGUF) | `engines/custom_nodes/<nome>` | `packages/runtime/src/nodi.ts` |
| Pesi | `models/...` | `scarica.ts` e `hf.ts` |

Tre conseguenze che valgono la pena di ricordare:

1. **La versione scritta accanto serve a farla arrivare.** Prima, fissare
   `COMFY_VERSION` valeva solo per chi installava da zero: chi aveva già il
   motore si teneva il suo per sempre. Adesso `.daprod-versione` dice cosa c'è, e
   una scheda con un motore vecchio torna "da installare".
2. **I nodi di terzi stanno fuori dalla cartella di ComfyUI** — sopravvivono a un
   suo aggiornamento, e `services/comfy/avvio.py` li dichiara al motore come già
   faceva coi nostri. La cartella va creata anche vuota: ComfyUI fa `os.listdir`
   su ogni percorso di nodi che gli diamo e su una cartella che non c'è muore in
   avvio.
3. **Un nodo nuovo il motore lo carica solo all'avvio**, quindi se entra mentre
   sta girando `servizi.riavvia()` lo fa ripartire. È la cosa che rende possibile
   scegliere FLUX.2 Klein senza chiudere l'app.

**Il modello dice di quali nodi ha bisogno**, non l'app: in `manifest/models.json`
c'è `"nodi": ["comfyui-gguf"]` accanto ai due file GGUF. Quando FLUX.2 lo vorrà
anche Cinema non ci sarà niente da aggiungere da nessuna parte.

## Com'è entrata la scelta del modello in Foto

Quattro pezzi, e tre valgono per tutte le app.

**`grafi.js` è diventato un catalogo.** Ogni modello si porta i propri grafi
invece di riempire di "se" un grafo solo, perché Anima e FLUX.2 non si somigliano
nemmeno nei nodi: Anima ha `KSampler` e nodi core, FLUX.2 ha `UnetLoaderGGUF` +
`CFGGuider` + `SamplerCustomAdvanced` + `Flux2Scheduler`, e per il ritocco taglia
lo schedule con `SplitSigmasDenoise` invece di passare un `denoise`. Ogni voce
dichiara anche il proprio punto di lavoro (passi, CFG, se il negativo conta), e i
cursori si spostano da soli quando cambi modello.

**`daprodSuite.modelli`, non `daprodFoto.modelli`.** Chiedere "ce l'ho? me lo
scarichi?" è nel ponte comune a tutte le app: Cinema e Dream sceglieranno fra più
modelli anche loro. La pagina non indovina mai da sé quali file ci sono — passa
gli id del catalogo e la suite risponde, altrimenti sarebbe la seconda verità sui
modelli, cioè quella sbagliata.

**`installaModelli` è `installaApp` senza la scheda.** Stessa coda (nodi prima,
pesi poi, uno alla volta, byte non file), ma non tocca lo stato della scheda
nell'hub — l'app è aperta e la stai usando — e l'avanzamento va alla finestra.

**A modello mancante "Genera" è spento.** Meglio un bottone spento che uno che dà
un errore del motore in inglese.

## La copertina che non si vedeva

Cammo, il 16 agosto: «le canzoni funzionano ma la copertina non viene proprio
generata». Non era una questione di gusto: **veniva disegnata davvero** — nel
log ci sono le sue dieci iterazioni da dieci secondi — e poi buttata via.

L'aveva rotta il giro prima, invertendo l'ordine per la VRAM. Con la copertina
*dopo* il brano, quando finisce il brano è già in libreria e il suo lavoro è
stato cancellato: `concludi` cercava `lavoro(l.branoDi)`, non trovava niente, e
`bersaglio` (che è la strada della scheda Libreria) era vuoto. Nessun ramo,
nessun errore, nessuna copertina.

Adesso il brano finito lascia detto in `finiti` con che id è entrato in
libreria, e la copertina lo ritrova. Il brano dichiara `conCopertina` quando ne
ha una in arrivo, così la mappa non cresce per i brani che non ne vogliono.

**Da imparare, più che da correggere**: cambiare l'ordine di due lavori voleva
dire cambiare chi passa cosa a chi, e il passaggio stava in un altro file.

## Com'è entrata DaProdDream

Viene da `Desktop\DaProdDream`, che era un programma intero: si apriva da sé una
finestra di Chrome in modalità `--app`, si sorvegliava con un watchdog e
spegneva il motore quando non vedeva più nessuno collegato. Quelle tre cose qui
le fa la suite, quindi `main.py` è stato sostituito da `avvio.py`, che è quasi
solo `uvicorn.run`.

**La differenza che conta rispetto a Musica e Foto:** la sua pagina **la serve
il motore**, non lo schema `daprod://`. Non è una scorciatoia: l'interfaccia di
Dream chiama il proprio server con indirizzi relativi e apre un WebSocket su
`location.host`, perché i fotogrammi trasformati arrivano da lì trenta volte al
secondo. Servirla da un'altra origine vorrebbe dire riscriverla; la finestra
carica `http://127.0.0.1:8770/` e tutto il resto funziona com'era. Il motore la
trova con `DAPROD_INTERFACCIA`, che `servizi.ts` passa a tutti (gli altri la
ignorano).

**Due cose nuove che valgono per tutte le app che verranno:**

1. **`services/<id>/requisiti.txt`.** I motori nostri hanno bisogno di librerie
   che l'ambiente condiviso non ha — Dream vuole diffusers, la cattura dello
   schermo, il video — e adesso `installaApp` le installa insieme al resto.
   Senza, l'app si installava "bene" e poi moriva con un ImportError dentro un
   log. Lo useranno IoDigitale e il Companion.
2. **`paths.cartellaApp(id)`**: dove sta l'interfaccia di un'app, nel repo o in
   `resources` una volta impacchettata. Era ripetuta in ogni finestra.

**I modelli non li cerca più su HuggingFace.** `params.model` punta alla cartella
della suite (`models/diffusers/sd-turbo`), e la VAE veloce TAESD è entrata nel
catalogo: sono 19 MB, ma sono quelli che fanno la differenza fra vedersi
trasformare in tempo reale o no.

## Come si guarda dentro un'interfaccia che non funziona

Due strumenti nati il 16 agosto, dopo un giro intero passato a indovinare.

**`logs/<app>-pagina.log`.** Ogni finestra manda nel log quello che la sua
pagina scrive in console, errori compresi, con file e riga
([finestre.ts](../apps/shell/src/main/finestre.ts)). Prima un modulo che si
rompeva si vedeva solo come un bottone che non faceva niente.

**`node apps/shell/scripts/pilota.cjs <finestra> "<js>"`.** Si avvia la suite con
`--remote-debugging-port=9333` e da lì si legge e si esegue dentro la pagina:
`document.getElementById("genera").click()`, lo stato di un menu, una `fetch` di
prova. È così che si è capito che `fetch` verso `daprod://file` falliva mentre
una `<img>` sullo stesso indirizzo funzionava — cioè che il problema era lo
schema e non il codice dell'app.

**La regola che ne esce:** quando un difetto è nell'interfaccia, prima si apre
la finestra e le si chiede com'è messa. Leggere il codice serve dopo, per
capire *perché*.

**E una trappola dell'hub, trovata così.** La sua pagina ha una CSP severa —
`style-src 'self'`, senza `unsafe-inline` — quindi **uno `style=` scritto
nell'HTML non ha effetto**: il pallino col colore dell'app restava invisibile
senza che niente segnalasse nulla. Da JavaScript invece si può
(`elemento.style.setProperty(...)`), perché la CSP guarda il marcatore, non il
CSSOM. Nelle app (Foto, Musica) il problema non c'è, la loro CSP ammette gli
stili in riga.

## Le tre cose che si sono viste solo provando (16 agosto, notte)

**FLUX.2 Klein 4B e 9B non dividono il text encoder.** Sembrava ovvio che sì —
stessa famiglia, stesso grafo — e invece il 4B vuole **Qwen3-4B** e il 9B
**Qwen3-8B**. Dando al 4B quello dell'8B il motore muore con `mat1 and mat2
shapes cannot be multiplied (512x12288 and 7680x3072)`: 7680 è 2560×3 (la
dimensione di Qwen3-4B), 12288 è 4096×3 (quella di Qwen3-8B). Il numero dice
esattamente qual è il modello giusto, se lo si legge.

**Allo schema `daprod:` mancava `corsEnabled`, e due difetti erano lo stesso.**
La pagina di un'app sta su `daprod://foto`, i suoi file su `daprod://file`:
origini diverse. Uno schema che non dichiara `corsEnabled` fra i suoi privilegi
si vede rifiutare le richieste incrociate **prima** che qualcuno guardi le
intestazioni — quindi l'`Access-Control-Allow-Origin` che il gestore aggiungeva
non è mai servito a niente. Si vedeva come "Failed to fetch" aprendo un'immagine
nel ritocco di Foto **e** come "formato non supportato" nel Visualizer su un
brano di Musica (il suo `<audio>` è `crossOrigin="anonymous"`), mentre le
miniature comparivano benissimo — una `<img>` senza `crossOrigin` non passa da
quel controllo, ed è per questo che sembravano due difetti diversi.

Provato dentro la pagina, ed è la prova che ha chiuso la questione:

| dalla pagina di Foto verso `daprod://file/...` | prima |
|---|---|
| `fetch(url)` | Failed to fetch |
| `fetch(url, {mode:"no-cors"})` | risposta opaca, inutilizzabile |
| `<img src=url>` | **funziona** |
| `<img crossOrigin="anonymous">` | fallisce |

Con `corsEnabled: true` funzionano tutte. Resta anche l'altra correzione — a
`net.fetch` si inoltra solo la `Range` e non l'`Origin` — che è giusta comunque:
a una `file://` quell'intestazione non serve.

**Il grafo si può provare senza aprire la suite.** `POST /prompt` al motore con
il grafo esatto dell'app, e `/history/<id>` dice se è passato o dove si è rotto:
è così che è saltato fuori il text encoder sbagliato, in due minuti invece che a
tentativi.

## Cosa resta aperto dopo il giro del 16 agosto (sera)

- **Il Visualizer non riproduce i brani di DaProdMusica.** Cercato e **non
  trovato**: il percorso arriva dalla libreria, `trackUrl` lo trasforma nello
  stesso `daprod://file/` che il lettore di Musica usa senza problemi,
  `crossOrigin` è già `anonymous` e lo schema manda `Access-Control-Allow-Origin`.
  Serve vederlo dal vivo: apre il brano e resta muto, o non lo apre proprio?
  È la prima cosa da guardare aprendo la suite.
- **"Spinta" dava errore in generazione.** Era la memoria video dinamica: adesso
  spinta non la tocca più (vedi [VELOCITA-MUSICA.md](VELOCITA-MUSICA.md) § 4-bis).
- **Il text encoder int8 di WanGP non entra in 8 GB.** È nel catalogo per il
  giorno che cambia la scheda.

## Il giro del 16 agosto, sera-notte

Quattro cose chieste, tre fatte e provate dal vivo, una no. In ordine.

**Pulsanti veri nelle gallerie — fatto.** Non erano `<div>`: erano già
`<button>`, ma il foglio di stile li disegnava `background:none; border:0;
padding:0` con una riga tratteggiata sotto, cioè come scritte. Adesso `.acts` è
una fila di pulsanti veri che si dispongono da sé (`flex:1 1 112px`, 76 dentro
una scheda di galleria): in una finestra larga stanno in riga, in una stretta
vanno a capo restando della stessa misura.

E soprattutto: **la finestra si può stringere davvero**. Il limite era
`minWidth: 900` in `apps/shell/src/main/apps/{foto,musica}/index.ts` — con
quello, "responsive" non si poteva nemmeno provare. Adesso è 480, e sotto gli
860 l'intestazione manda le schede a capo su una riga loro.

**Trovato provando, e vale per tutte le app:** un foglio di stile appena
cambiato continuava a tornare quello di prima anche ricaricando la pagina. Una
`file://` non manda né `ETag` né `Last-Modified`, quindi Chromium decide da sé
per quanto tenersi la risposta. Adesso lo schema `daprod:` risponde
`Cache-Control: no-cache`, e lo fa anche l'interfaccia di Dream (`SenzaCache` in
`services/dream/app/api.py`). Senza, ogni aggiornamento della suite rischia di
essere invisibile a chi ce l'ha già aperta.

**Il tasto "a Musica" è stato tolto.** Cammo: «non possiamo mandare le
immagini». Vero, e il perché è preciso: DaPMusica usa l'immagine come copertina
solo se in Libreria c'è già un brano selezionato (`stato.selezionato`); senza,
la consegna arriva e non fa niente, mentre il tasto rispondeva "mandata". Il
lato che riceve resta in `apps/musica/src/libreria.js` ed è giusto: quello che
manca è **chiedere su quale brano**. Deciso anche come si scrive: quando un'app
ne nomina un'altra si abbrevia **DaP** (DaPMusica, DaPFoto, DaPVisualizer); i
nomi propri — logo, schede dell'hub, titolo della finestra — restano interi.

**LTX 2.5 nel piano di Cinema — fatto**, e ha corretto due cose che erano
scritte sbagliate in tre documenti: vedi
[MODELLI-E-STRATEGIA.md](MODELLI-E-STRATEGIA.md) § 5.

**DaProd IoDigitale — non fatto.** Il piano, con l'inventario vero, è più sotto.

## Com'è entrata Anima in DaProdDream

Il sogno libero non ha una webcam davanti: parte dal rumore e ci mette dentro il
prompt. Lì il tempo reale non è il punto, e SD-Turbo si vede che è piccolo.

**Anima non gira sul motore di Dream**, gira su ComfyUI — quello di Foto e
Musica, con gli stessi tre file da 5,6 GB già sul disco. Da qui la cosa che
vale per tutte le app che verranno: **un'app può dichiarare un motore in più**.

- `AppDescriptor.motoriInPiu` nel catalogo: motori che quest'app sa usare ma
  **solo quando servono**. Non partono all'apertura come `service`.
- `servizi.avviaInPiu(id, nome)` li accende su richiesta, e `ferma(id)` adesso
  spegne tutti i motori dell'app, non solo il suo.
- `daprodSuite.motoreInPiu(nome)` è la strada dalla pagina. Il nome del motore
  arriva dalla pagina, ma **quali** può chiedere lo dice il catalogo.

Accenderlo sempre costerebbe un minuto d'attesa e qualche GB a chi non lo usa.
Lo userà IoDigitale il giorno che entra.

Il resto sta tutto in **`apps/dream/anima.js`**, fatto come `modelli-suite.js`:
roba della suite e non del motore, e chi apre DaProdDream da solo non ha
`window.daprodSuite` e quel file non fa niente.

**Tre cose che si sono viste solo provando.**

1. **L'avanzamento dei modelli arriva a ogni cambiamento**, anche a scaricamento
   fermo. Il mio ascoltatore leggeva `!attivo && !errore` come "finito", e
   rientrava nella scelta del modello: **un'immagine nuova ogni pochi secondi**,
   all'infinito. Adesso reagisce solo se il riquadro dei mancanti è aperto.
2. **Fermare il lavoro in corso con `/interrupt` e mandarne subito un altro
   ammazza quello nuovo, non quello vecchio.** Il segnale arriva quando il
   secondo è già in coda, e si vedeva come «il motore ha finito ma non ha reso
   nessuna immagine». Adesso si lascia finire e si rifà dopo (`S.daRifare`).
3. **Un `filename_prefix` con sottocartella può non salvare niente.** ComfyUI
   rifiuta di scrivere fuori dalla cartella dei risultati, e il controllo che fa
   (`is_within_directory`) risolve i percorsi **fino in fondo**: una
   sottocartella nata sotto un percorso reindirizzato gli risulta "fuori". Qui
   capitava perché il motore era stato avviato da dentro un contenitore, e la
   cartella finiva in `AppData\Local\Packages\...\LocalCache`. Con Anima si
   salva senza sottocartella (`sogno-anima`), che non può fallire da nessuna
   parte. **Da ricordare quando toccherà a Cinema.**

**La VRAM è una sola**: passando ad Anima il tempo reale si ferma e SD-Turbo
esce dalla memoria; tornando indietro si dice a ComfyUI di liberare la scheda
(`POST /free`) e SD-Turbo si ricarica. Provato: `backend.ready` torna `true`.

## Perche' "Bonsai e' lento": la macchina occupata

**Chiuso il 17 agosto 2026**, dopo tre giri di misure. La stessa identica
domanda a LM Studio — stesso indirizzo, stesso modello, stesso JSON:

| Situazione | Quanto |
|---|---|
| da Node, macchina libera | 9-10 s |
| dalla suite con ComfyUI acceso, via `fetch` | 254 s |
| dalla suite con ComfyUI acceso, via `node:http` | 148 s |
| dalla suite **senza nessun motore acceso** | **5 s** |

Le prime due righe mi avevano portato fuori strada: sembrava che a essere lento
fosse il processo principale di Electron. Lo era, ma per un fattore due su
trenta. **Quello che conta e' chi altro sta usando la macchina**: col motore
delle immagini acceso, LM Studio si contende CPU e scheda e va trenta volte piu'
piano.

Due cose restano, tutte e due giuste:

1. **`postJson` in `llm.ts`**, che parla a LM Studio con `node:http` invece che
   col `fetch` di Electron. Vale il fattore due, e per una chiamata a 127.0.0.1
   lo stack di rete di Chromium non aggiunge niente.
2. **`scripts/prova-llm.mjs`**, che rifa' la misura in dieci secondi. Quando
   qualcuno dice "l'app e' piantata", la prima domanda e' *cosa c'era acceso*.

E la regola che ne esce, da tenere presente quando toccheranno il Companion e
IoDigitale — che l'LLM lo usano di continuo: **il modello che scrive e il motore
che genera non vanno d'accordo sulla stessa macchina**. La suite gia' spegne
l'LLM prima di una generazione pesante; il verso opposto — avvisare che la
risposta sara' lenta perche' il motore e' acceso — non c'e' ancora.

## Il giro del 18 agosto 2026

Quattro cose chieste, quattro fatte e provate dal vivo aprendo la suite.

**La prima cosa trovata non era fra quelle**: `apps/shell/src/main/llm.ts` aveva
dentro due volte lo stesso pezzo — l'`import` di `node:http` e tutta `postJson`,
identiche riga per riga, cambiava solo il commento. Un incollaggio doppio
rimasto dalla sessione prima. Con quello la suite **non compilava**: quattro
errori di `tsc`, e chi avesse lanciato il `.bat` avrebbe visto la build vecchia
senza capire perché non cambiava niente. Tolto il duplicato, il file è tornato
identico all'ultimo commit — non c'era niente di nuovo da salvare.

**Da ricordare:** `pnpm run typecheck` prima di chiudere una sessione, non solo
prima di un commit. Un albero di lavoro che non compila è una trappola per chi
riprende dopo.

### L'hub in 4:3

Si apriva 16:9 (1498×846 misurati) perché prendeva **una fetta della larghezza e
una dell'altezza indipendenti fra loro**: su un monitor 16:9 ne usciva per forza
una finestra 16:9. Adesso comanda l'altezza — il 92% dell'area utile — e la
larghezza viene da lì; solo su un monitor stretto si fa il contrario. In nessuno
dei due casi la proporzione cambia.

**Vale solo per l'hub**, ed è una decisione di Cammo del 18 agosto: le finestre
delle app tengono la loro misura (quella del Visualizer gli va bene com'è), e il
16:9 per le altre si vedrà semmai più avanti. Il 4:3 è la forma della griglia
delle schede, non una regola della suite.

### Le icone, generate con Anima

`apps/shell/scripts/genera-icone.cjs`, fratello di `genera-copertine.cjs` e
fatto sulla stessa strada: stesso motore, stessi tre pesi di Anima,
`PreviewImage` per non sporcare la libreria, seme e descrizione nel file così
una che non piace si rifà da sola.

**Quello che cambia rispetto alle copertine, ed è tutto lì:**

| Copertina | Icona |
|---|---|
| 1024×384 (8:3), è una striscia | 512×512, è un quadrato |
| una scena | **un soggetto solo**, margini vuoti intorno |
| si guarda a 640 px | deve reggere a **32 px** |
| WebP, va nel repo | PNG con angoli arrotondati al 22% |

Gli angoli li fa Pillow dopo, disegnando la maschera a quattro volte la misura e
riducendola: è l'antialiasing che PIL sulle forme non fa da sé.

**Due prompt sono stati rifatti perché non si leggevano**, e il motivo è lo
stesso in tutti e due: descrivere l'oggetto non basta, serve una **forma**.
"a film reel seen from the front" dava un anello viola e basta; con la pellicola
che si srotola in diagonale la sagoma ha un verso. "big calm eyes" dava due
pallini verdi che non sembravano un robot; col corpo intero la testa prende un
contorno.

**Un difetto vecchio trovato per strada:** nella versione installata l'icona
nell'area di notifica era **vuota**. `tray.ts` la cercava in
`resources/icon.png`, ma electron-builder l'icona la incastona nell'eseguibile e
non la lascia come file — quindi quel percorso non è mai esistito. Adesso
`build/icon.png` e `build/icone/` sono in `extraResources`, e i percorsi stanno
in un posto solo (`ICONA_SUITE` e `iconaApp(id)` in `paths.ts`).

### Il Visualizer da dentro le altre app

**Prima di scrivere una riga è stato provato quello che c'era**, e la risposta è
che funzionava già: il Visualizer è `gpuHeavy: false`, non passa dall'arbitro, e
dal vivo si è aperto accanto a DaPFoto e a DaPMusica — anche **mentre** Musica
stava avviando il motore — senza che nessuna delle due si chiudesse.

Quello che mancava era **arrivarci**. Il bottone "Apri" sta nell'hub, e l'hub
mentre lavori è una finestra dietro le altre o l'hai chiusa del tutto. Quindi:

- **`daprodSuite.apriApp(id)`** nel ponte comune, che chiama lo stesso
  `appManager.open` dell'hub — stessi controlli, stesso arbitro, stesso motore
  avviato prima della finestra.
- **`tasto-visualizer.ts`**, iniettato dalla shell in ogni finestra come il
  terminale e per le stesse ragioni: le app non condividono né origine né CSP, un
  file comune fra loro non esiste, e `executeJavaScript` gira nel mondo della
  pagina senza passare dalla sua CSP. **Una implementazione sola per tutte.**
- **La barra in basso a destra adesso è condivisa** (`.daprod-barra`): la crea
  chi arriva per primo fra il tasto del log e quello del Visualizer, e l'altro ci
  si aggiunge. Così l'ordine in cui la shell inietta i pezzi non conta, e il
  terzo tasto che servirà un giorno non dovrà spostare niente.

## Il PC senza scheda video, provato il 18 agosto 2026

Cammo ha installato la suite su un secondo computer **solo CPU** — per provare
anche gli aggiornamenti — e ha portato tre log. Non partiva, e i due difetti
erano indipendenti: correggerne uno solo non sarebbe bastato.

**1. `--torch-backend=auto` sceglie XPU su una Intel integrata.** Nel log:
`torch 2.13.0+xpu`, con dietro `mkl` 172 MB, `triton-xpu` 366 MB,
`intel-opencl-rt` 109 MB e il resto del runtime Intel. E non serviva a niente —
il motore poi scriveva `XPU device count is zero!`, cioè quella build non aveva
nessun dispositivo. Un torch per CPU con un chilo e mezzo di zavorra, su una
riga di log che intanto diceva *«Installo PyTorch con CUDA»*.

Adesso `install.ts` decide prima: `nvidia-smi` risponde → `--torch-backend=auto`
(che su una NVIDIA porta alla build CUDA giusta), non risponde →
`--torch-backend=cpu`, esplicito. `nvidia-smi` è il metro giusto perché lo
installa il driver: c'è se e solo se la scheda è utilizzabile.

**2. ComfyUI dà CUDA per scontato e muore in avvio.**

    comfy/model_management.py, in get_torch_device
        return torch.device(torch.cuda.current_device())
    AssertionError: Torch not compiled with CUDA enabled

Va detto a lui che non c'è, con `--cpu`. Da fuori si vedeva solo una scheda che
non si apriva: il supervisore aspettava `/health` da un processo già morto.
`avvio.py` adesso ha `flag_dispositivo()`, e `flag_velocita()` torna vuota senza
CUDA — `--disable-dynamic-vram`, `--fast` e flash-attention sono tutti percorsi
CUDA, e darli a un motore in CPU rischia di rifare lo stesso danno.

**La cosa imparata, che vale oltre questo caso.** La prima versione di
`con_cuda()` importava torch nel processo dell'avvio, e ComfyUI ha cominciato a
scrivere *«WARNING: Torch already imported, torch should never be imported
before this point»*: prima di importarlo lui prepara delle variabili d'ambiente,
e un import anticipato gliele porta via. **Il difetto l'ha trovato la prova, non
la rilettura**: il codice era giusto, l'effetto collaterale no. Adesso la
domanda si fa in un sottoprocesso — cinque secondi, una volta sola, su un avvio
che ne dura sessanta.

**Come si prova senza il secondo PC.** `CUDA_VISIBLE_DEVICES=-1` e torch dice
che CUDA non c'è, quindi il ramo CPU si esercita su questa macchina:

    CUDA_VISIBLE_DEVICES=-1 DAPROD_MOTORE=... DAPROD_PORTA=8189       python services/comfy/avvio.py

Provato così: `/health` risponde, `Device: cpu`, `Set vram state to: DISABLED`,
e l'avviso di torch non c'è più. Con la scheda visibile la riga di comando è
identica a prima — nessuna regressione sulla macchina buona.

**Quello che resta aperto** sta in [ROADMAP.md](ROADMAP.md) § "Il PC senza
scheda video": dirlo nell'interfaccia e non solo nel log, i modelli fuori
portata segnati come tali, Dream e IoDigitale che la GPU la pretendono, e
l'aggiornamento automatico che su quel PC non è ancora stato visto.

## Quando installare un'app ha rotto le altre (19 agosto 2026)

Cammo, dopo aver installato IoDigitale: «daprod musica e foto non si avviano,
dream si avvia ma non funziona, iodigitale stessa cosa». Quattro app rotte
insieme, e nessuna delle quattro era il problema.

**Come si è trovato, e vale come metodo.** Non guardando il codice delle app —
guardando l'orologio di `logs/`. `scaricamenti.log` era stato scritto un'ora
prima, `comfy.log` no: quindi il motore non era nemmeno arrivato a scrivere, e
il guasto stava *prima*, cioè nell'ambiente. Avviare `avvio.py` a mano su una
porta libera ha dato l'errore vero in trenta secondi:

    ImportError: cannot import name 'BucketNotFoundError'
    from 'huggingface_hub.errors'

Cioè `huggingface_hub` **mezzo installato**: `utils/__init__.py` della 1.28
accanto a `errors.py` della 0.36.

**Perché ci è finito.** Due difetti che da soli non facevano niente:

1. **Il rimbalzo.** `base.txt` diceva `huggingface-hub<1.0`, con accanto scritto
   «lo pretende transformers». Era vero con transformers 4; con la 5 è
   esattamente il contrario, la 5 pretende `>=1.0`. Quindi a ogni installazione
   le due librerie si scambiavano di posto. Nel log di quella sera, tre volte:
   `1.27.0 → 0.36.2`, poi `0.36.2 → 1.28.0`.
2. **L'antivirus.** Ogni rimbalzo è una disinstallazione, e su questa macchina le
   disinstallazioni falliscono con l'errore 4395 sul `__pycache__` — è scritto
   più sotto, ed è per quello che `uv.ts` sgombra e riprova. Con abbastanza
   rimbalzi, prima o poi uno resta a metà.

**La correzione è sul primo**, perché è quello che moltiplica: tolto il tetto,
messo un pavimento (`huggingface-hub>=1.28`). Niente rimbalzo, niente
disinstallazioni, niente occasioni per l'antivirus.

**Come si ripara un ambiente già rotto** (serviva, il suo lo era):

    # le __pycache__ prima, se no uv fallisce di nuovo
    find .../site-packages/transformers .../huggingface_hub       -name __pycache__ -type d -exec rm -rf {} +
    uv pip install --python <py>       --reinstall-package huggingface-hub --reinstall-package transformers       "huggingface-hub>=1.28" "transformers>=5.15"

Dopo: ComfyUI riparte (`Device: cuda:0 NVIDIA GeForce RTX 4060`), e gli import
di Dream (diffusers 0.38) e IoDigitale (peft, faster-whisper, piper) passano.

**Quei comandi adesso sono due tasti**, nella barra dell'ambiente in cima
all'hub: «Ripara» fa la stessa cosa (`packages/runtime/src/riparazione.ts`) e
«Controlla» dice se serviva (`packages/runtime/src/controllo.ts`). Il controllo
**importa davvero** le librerie condivise, perché è l'unico modo di vedere
questo guasto: qui i numeri di versione erano tutti giusti, e a essere mescolati
erano i file.

**La lezione, e va oltre questo caso.** Un ambiente Python solo per sei app è
quello che ci fa stare in 4 GB invece di 14,7, ma è anche **il posto dove un'app
può rompere le altre senza toccarle**. I requisiti dei servizi oggi non sono
fissati (`transformers>=4.50`, `diffusers` senza versione): ogni installazione
tira dentro l'ultima uscita e ne butta fuori un'altra. ComfyUI e i nodi custom
li abbiamo fissati apposta; i requisiti dei servizi no, ed è la prossima cosa da
mettere a posto — sta in [ROADMAP.md](ROADMAP.md).

**E una cosa che l'utente non deve più vedere:** quattro schede che non si
aprono senza dire perché. L'errore vero c'era, in un file, a due passi. Portarlo
sulla scheda è in roadmap insieme al resto.

## Il prossimo passo: DaProdCompanion

È l'unica delle tre della 0.2.0 che non è entrata, e quello che serve è già
scritto: vuole **LM Studio acceso** e `sqlite_vec` nel suo pyproject. Prima però
c'è una cosa più piccola e più visibile: **l'interfaccia di IoDigitale è ancora
tutta in inglese** — `Load Image`, `Hold to Talk`, `Chat History` — e in cima
c'è ancora scritto *LeapTalk Live*, cioè il nome del progetto da cui viene. È
l'unica scheda che non sembra della suite.

## Com'è entrato DaProd IoDigitale

**Viene da `Desktop\AvatarParlante\LeapTalk`.** Letto e inventariato il 16
agosto 2026; il porto non è cominciato. È il gemello di Dream come struttura —
un motore FastAPI che **si serve da solo la propria pagina**, con un WebSocket —
quindi si rifà quella strada: `DAPROD_INTERFACCIA`, niente schema `daprod://`.

**I pesi ci sono già.** Sono nella cartella condivisa e nel catalogo, ed è il
pezzo più lungo che *non* c'è da fare:

| | Sul disco | In `manifest/models.json` |
|---|---|---|
| SoulX-FlashHead Lite | dentro i 14 GB della cartella | sì, 8,3 GB (`exclude` su Pro) |
| SoulX-FlashHead Pro | idem | sì, extra da 6,0 GB |
| Pesi LeapTalk | 368 MB | sì |
| wav2vec2-base-960h | 1,1 GB | sì |
| Voce Piper `it_IT-paola-medium` | 61 MB | **no, da aggiungere** |
| Whisper (faster-whisper small) | 605 MB | **no, da aggiungere** |

*(Nota: gli "8 GB di pesi" scritti più sopra erano bassi. Il Lite da solo è 8,3.)*

**Cosa si porta dentro** (~1 MB di codice): `web_server.py`,
`leaptalk_stream.py`, `local_dialogue.py`, `inference.py`, `audioprocessing.py`,
`spatial_mask_utils.py`, e le cartelle `flash_head/`, `vibt/`, `utils/`.

**Cosa si butta**, e sono i tre quarti:

| Cosa | Perché |
|---|---|
| `.venv/` | l'ambiente è quello condiviso della suite |
| `models/`, `outputs/` | modelli condivisi, risultati in libreria |
| `train.py` (82 KB), `train.sh`, `eval/` | addestramento: non ci serve |
| `runtime/llama` (45 MB) | il modello linguistico lo tiene **LM Studio**, che la suite già governa |
| `runtime/parakeet` (5,4 MB) | la trascrizione la fa Whisper |
| `web/runtime` (21 MB) | file di lavoro |
| i tre `.bat` | avvio, scaricamento e ambiente li fa la suite |

`web/static` (48 KB: `index.html` + `app.css`) diventa `apps/iodigitale/`.

**Le cose che morderanno, in ordine:**

1. **Il `.env` deve sparire.** Oggi tutto passa da lì con percorsi relativi
   (`./models/...`). Nella suite arrivano da `DAPROD_MODELLI` come per gli altri
   motori: è lo stesso lavoro già fatto in `services/dream/app/config.py`.
2. **`/health` e `/shutdown` non ci sono**, e il supervisore li pretende. Come
   per Dream, li aggiunge `avvio.py`.
3. **Dipende da LM Studio acceso**, ed è l'unica app che lo pretende per
   funzionare. La buona notizia: il selettore del modello che scrive esiste già
   ed è comune (`apps/musica/src/selettore-llm.js`, scritto per essere copiato),
   quindi qui si riusa invece di rifarlo.
4. **La VRAM è al limite, misurata da loro**: 7928 MiB su 8188 con tutto acceso,
   circa 260 MB di margine, e la risoluzione decide tutto (384×384 → 25 fps e
   5,95 GB; 512×512 → 5 fps e non ci sta). La scelta della qualità va portata
   dentro com'è, avvisi compresi.
5. **`requirements-windows.txt` è quello giusto**, non `requirements.txt`:
   l'originale ha pacchetti che su Windows non esistono. Diventa
   `services/iodigitale/requisiti.txt`.


## Quello che era il prossimo passo prima di stasera

**DaProdDream va provata da Cammo** — la webcam e il video in tempo reale sono
sue da giudicare — e poi tocca a **DaProd IoDigitale**, che è la più pesante
delle due che restano: 8 GB di pesi (SoulX-FlashHead Lite, LeapTalk, wav2vec2),
un motore a `web_server.py` sulla 7860, e un'interfaccia da portare dentro come
si è fatto qui. Il **Companion** dopo, perché dipende da LM Studio acceso.

**La 0.1.0 è chiusa.** Il pezzo che mancava — la procedura guidata al primo
avvio — è dentro e provato. Da qui la strada è la **0.2.0: le altre tre app**,
nell'ordine della roadmap: **Dream** (il più semplice, un solo modello che è già
nel catalogo), poi **Companion** (vuole LM Studio acceso e `sqlite_vec` nel suo
pyproject), poi **IoDigitale** (il più pesante, 8 GB di pesi).

Restano da fare, quando capita: misurare "spinta" contro "normale" su un brano
vero, e continuare la pulizia un pezzo per volta.

### Quello che era il prossimo passo prima

**Prima di tutto: provare FLUX.2 Klein davvero.** Il codice c'è e i pezzi sono
provati uno per uno — il nodo si installa, il motore lo carica, il grafo è quello
che funzionava in Flux Klein Studio — ma **un'immagine con FLUX in questa suite
non l'ha ancora fatta nessuno**. Sono 11,2 GB da scaricare e una generazione da
provare, e con 8 GB di VRAM il modello è al limite: è lì che si vede se regge.

Subito dopo, **la misura della velocità**: adesso non serve toccare il codice,
c'è l'interruttore in fondo all'hub. Stesso brano, stesso seed, stessa durata,
una volta su "normale" e una su "spinta", leggendo i token/s che il log scrive da
solo ([VELOCITA-MUSICA.md](VELOCITA-MUSICA.md) § 4-bis e § 5). Se "spinta" fa
morire un brano come una volta, si torna indietro e lo si scrive lì.

Restano aperte le altre cose chieste il 15: i pannelli veri per Risultati /
Modelli / Log, "Mostra nella cartella" che dà errore, la copertina salvata subito
su disco, e il terminale dentro ogni app.

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
- `node packages/runtime/scripts/prova-nodo.cjs` — installa ComfyUI-GGUF in una
  cartella temporanea: controlla che lo zip del commit fissato esista ancora, che
  il nodo finisca dove il motore lo cerca, e che premere due volte non rifaccia
  niente.
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

**L'antivirus fa fallire `uv pip install`.** Su questa macchina capita che uv non
riesca a togliere una `__pycache__` appena scritta e si fermi con "reparse point"
(errore 4395) — succede aggiornando pacchetti, cioè proprio quando si installa il
motore. Non è un caso isolato: è capitato tre volte su tre, su pacchetti diversi.
`installaRequisiti` in `uv.ts` sgombra le `__pycache__` e riprova, e con quello
passa. Se un giorno ricompare, il primo sospetto è sempre lo stesso.

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

- **Un ramo per release e una pull request** (regola cambiata il 18 agosto
  2026: prima era «niente rami, niente PR»). Si lavora, si commetta su un ramo
  `release-<versione>`, si apre la PR — e **il Merge lo preme lui su GitHub**:
  è lì che dà l'ok. Niente rami di prova oltre a quello. Si parte da 0.0.1 e il
  numero sale solo quando si pubblica.
- **I commit sono a nome di `cammo22`**, con la noreply del suo account. Fino
  alla 0.1.0 sono andati su *daprodproduzioni*, cioè sul profilo sbagliato.
- **Il codice da testare resta sul PC.** Si pubblica solo dopo il suo ok.
- **Una app alla volta**: si porta dentro, la prova lui, si aggiusta, poi la
  successiva.
- **L'interfaccia è in italiano**, senza termini inglesi dove esiste la parola
  italiana.
- **La wiki `HermesGPT\dapwikiGPT` si aggiorna** (regola cambiata il 18 agosto
  2026: prima era in sola lettura). È un vault Obsidian con le sue convenzioni —
  frontmatter col campo `aggiornato:`, wikilink, e chi ci scrive firma come
  *Babbasone*: leggere il suo `CLAUDE.md` prima di toccarla. La scheda della
  suite è `DaProd-Software/Progetti/DaProd-Suite.md`.
  **Il codice resta la verità sui modelli**: quando una guida di divisione dice
  un modello diverso da quello che la suite usa davvero, si corregge la guida.

## Decisioni già prese, da non riaprire

| | |
|---|---|
| Companion | **LM Studio**, non Ollama |
| DaProdFoto | Anima di base, FLUX.2 Klein come extra |
| DaProdCinema | motore nostro; ComfyUI ha già i nodi nativi di **MiniMax H3 e LTX 2.5**, e dalla 0.33.1 anche le sliding window (`ContextWindowsManual`) |
| DaProdCinema | **due modelli come in Foto**: H3 è quello della guida, LTX 2.5 fa il video **col suono** e parte da un audio di riferimento |
| DaProdCinema | due strade: registrare gli effetti del Visualizer (breve) e le clip generate (lunga) |
| Modelli | spostati dai vecchi progetti; MinimaxMusica e AvatarParlante ora sono archivio |
| Mage-VL | **scartato**: non genera immagini, le comprende |
| ComfyUI | scaricato dalla suite, non nel repo: è GPL-3.0 e la suite è MIT |
| ComfyUI | versione **fissata** (0.33.1) in `packages/runtime/src/motore.ts`: si aggiorna quando lo decidiamo noi e riproviamo i motori, non da sé |
| Nodi custom | stessa regola e stesso posto (`nodi.ts`), commit fissato, fuori dalla cartella del motore |
| WanGP | **non si copia il loro codice**: licenza propria, non libera. Si prende il metodo, che è pubblico. Vedi [VELOCITA-MUSICA.md](VELOCITA-MUSICA.md) § 2 |
| huggingface-hub | tetto a `<1.0`, perché lo pretende `transformers`. Niente comando `hf`: si usa `snapshot_download` |
| Copertine | generate con `PreviewImage`, quindi nei temporanei: se andassero in output la libreria si riempirebbe di copertine sciolte |
| Lettore di Musica | a fine brano si ferma, non passa al successivo |

## Cosa aspetta un giudizio di Cammo

- **DaProdMusica**: un brano vero l'ha già fatto, con copertina, dentro la suite.
  Restano da provare a lungo la libreria (rinomina, copertina da file, elimina),
  la scheda Immagini e "apri nel Visualizer".
- **DaProdFoto**: un'immagine con Anima l'ha già fatta. Restano da provare il
  **ritocco**, il giro completo "genero un'immagine qui, la mando a Musica come
  copertina di un brano", e soprattutto **FLUX.2 Klein**: scaricarlo dal menu
  (11,2 GB, il motore riparte da solo per prendersi il nodo) e generare. Il grafo
  è quello collaudato in Flux Klein Studio, ma in questa suite non è mai stato
  eseguito.
- **Il Visualizer**: aperto dalla suite, con il pannello "Brani generati". Va
  provato — soprattutto se "Ascolta" fa partire davvero il brano.
- **Lo scaricamento**: provato a fondo sui 216 MB del VAE di MiniMax, annullato e
  ripreso. Quello che non ha ancora visto nessuno è **una scheda intera da zero**
  — cancella i modelli di una scheda dal pannello Spazio e ripremi Installa: sono
  7,9 GB per Musica, 5,6 per Foto. È lì che si vede se la barra racconta la
  verità per mezz'ora di fila.
