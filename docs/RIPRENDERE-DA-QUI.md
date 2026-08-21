# Riprendere da qui

Documento di passaggio fra una sessione e l'altra. Aggiornato il **21 agosto
2026**, con la 0.4.5 pubblicata e la 0.4.6 in lavorazione.

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
| **DaProdIoDigitale nella suite** | fatto il 17 agosto, **interfaccia ancora in inglese** |
| **Icone della suite e delle app, fatte con Anima** | fatte e provate (18 agosto) |
| **Hub in 4:3, e più grande** | fatto e provato: 1266×949 su questo monitor |
| **Il Visualizer si apre da dentro le altre app** | **tolto il 20 agosto**: le app si aprono già tutte insieme, il tasto in finestra era ingombro |
| **0.2.0 pubblicata** | fatto il 19 agosto: tag `v0.2.0`, Release con installer e `latest.yml` |
| **DaProdCompanion nella suite** | fatto il 19 agosto, **la voce non c'è ancora** |
| **Versioni dei pacchetti fissate** | `requirements/versioni.txt`, vincolo su *ogni* installazione |
| **La suite si accorge da sola di un ambiente rotto** | fatto: import veri quando un motore muore |
| **Il PC senza scheda video, detto in faccia** | fatto: tre schede non si installano, due avvisano |
| **Anteprime che si muovono sulle schede** | fatte, dalle copertine |
| **`packages/ui`: tema e selettore condivisi** | fatto: era in due copie, la terza sarebbe stata il Companion |
| **Profilo di memoria + pannello VRAM** | fatti, **da misurare** |
| **0.3.1 pubblicata** | fatto il 19 agosto: tag `v0.3.1` |
| **Scaricamento a 4 connessioni** | fatto e **misurato**: 3,9 → 11,8 MB/s su questo PC |
| **Foto: Genera, cartella, salva** | fatti, **da provare tu** |
| **Il modello scelto arriva davvero a LM Studio** | fatto: il ponte lo buttava via |
| **0.3.2 pubblicata** | fatto il 20 agosto: tag `v0.3.2` |
| **Foto: 30-50 step, formato a pulsanti, proposte tue** | fatto, **da provare tu**: provato in un banco fuori da Electron, non con un'immagine vera |
| **La VRAM si libera premendo Genera** | fatto in Foto; la sequenza è verificata, **l'effetto su una generazione vera no** |
| **0.3.3 pubblicata** | fatto il 20 agosto: tag `v0.3.3` |
| **Ritocco: inverti, e senza maschera si rifà tutto** | fatto, **da provare tu** su un'immagine vera |
| **Il traduttore si vede, ha una barra e non si pianta** | fatto e **misurato** sul motore vero: 267 risposte servite mentre traduceva |
| **0.3.4 costruita** | **da provare**, e poi si pubblica |
| **0.4.0 pubblicata** | fatto il 20 agosto: tag `v0.4.0`, con DaProdCinema e ACE-Step |
| **Musica: modello in cima, 4 bit via, lingua a pastiglie** | fatto, **da provare tu**: la lingua con MiniMax è un suggerimento nel prompt, non un interruttore |
| **Cinema: LTX 2.5 e MiniMax H3 al posto di Wan 2.2** | fatto nella 0.4.1, e **i grafi erano rotti**: vedi la riga qui sotto |
| **Barra di scaricamento in tutte le app** | fatto: `packages/ui/src/scaricamento.js`, più l'hub |
| **0.4.1 pubblicata** | fatto il 21 agosto: tag `v0.4.1`, PR #10 |
| **Cinema rifatto da capo (0.4.2)** | grafi ricostruiti sul flusso ufficiale e sul sorgente dei nodi; interfaccia provata in un browser con i ponti finti. **Nessuna clip vera**: è la prima cosa da fare, e LTX 2.5 è già sul disco |
| **Musica: «Crea» non si pianta più** | fatto: `lms` aveva chiamate senza timeout dentro al percorso di Genera. **Da provare tu**, perché il blocco non si è riprodotto qui |
| **0.4.2 pubblicata** | fatto il 21 agosto: tag `v0.4.2`, PR #11 |
| **DaProdVoce, l'ottava scheda (0.4.3)** | motore **provato davvero** sul PC: modello caricato, voce clonata, testo lungo tagliato e ricucito, wav scritti. **L'app dentro la suite non è mai stata aperta** |
| **Librerie private per un motore solo** | fatto: `requisiti-privati.txt` + `uv pip install --target`. Nasce perché il modello Audio8 vuole transformers 4.57 e la suite ha la 5.15 |
| **Cinema: la Galleria** | fatta, **da provare tu**: mai aperta in Electron |
| **H3 genera anche dal solo testo** | fatto: il divieto era dell'app, non del modello |
| **Anima v2 (2.9B) in Foto** | in catalogo e nel menu, **mai generata un'immagine**: 3,1 GB da scaricare |
| **0.4.3 pubblicata** | fatto il 21 agosto: tag `v0.4.3`, PR #12 |
| **Il pannello Sessione non ricarica più i risultati** | fatto: `packages/ui/src/lista-viva.js`, usato da Cinema, Musica e Foto. **Da provare tu** con un video che suona mentre il prossimo genera |
| **0.4.4 pubblicata** | fatto il 21 agosto: tag `v0.4.4`, PR #13. **Provata da Cammo**: il video non ricarica più |
| **Il video non muore più a metà (0.4.5)** | fatto: `faiSpazio` svuotava la VRAM anche a motore acceso. **Da provare tu**: due clip di fila senza aspettare la prima |
| **Cronometro unico + LTX a 20 s** | fatto, **da provare tu** |
| **0.4.5 pubblicata** | fatto il 21 agosto: tag `v0.4.5`, PR #14 |
| **Scheda Storia (0.4.6)** | fatta: soggetto → scene con LM Studio → una clip per volta → `/daprod/cuci`. **Mai aperta nella suite**; la sola cucitura è provata su tre clip vere |
| **H3: due pulsanti, 20 passi di serie** | fatto, **da provare tu**: è la risposta al «4 step fa schifo» |

Si lavora su un ramo per release e una PR: `release-0.2.0` è stata unita con le
PR #3 e #4, la 0.3.1 con la #5, la 0.3.2 con la #6, la 0.3.3 con la #7, la
0.3.4 con la #8, la 0.4.0 con la #9, la 0.4.1 con la #10, la 0.4.2 con la #11,
la 0.4.3 con la #12, la 0.4.4 con la #13, la 0.4.5 con la #14, e questo giro sta su `release-0.4.6`.

### Com'è fatto il giro della 0.4.6

Due cose, e nascono tutte e due da Cammo che genera: «a 4 step fa schifo» e
«si può fare mezz'ora?».

**H3 partiva dal modo sbagliato.** Quattro passi erano il valore di serie, e su
questo modello si vedono — nel movimento, non nel dettaglio. La correzione non è
un numero diverso: sono **due modi**, `MODELLI.h3.modi`, e il modo decide anche
il grafo. A venti passi il `LoraLoaderModelOnly` **non viene montato affatto**:
il LoRA turbo non è «un po' meno turbo», è una scala di rumore diversa da quella
su cui il modello è stato addestrato, e tenerlo a venti passi è peggio di
entrambi. Il modo viaggia fino al grafo come `p.lora`, non resta una preferenza
dell'interfaccia.

Cercato su Hugging Face cosa ci fosse di meglio per i quattro passi, e la
risposta è scomoda: **per la variante ref2v il LoRA ufficiale è fermo alla
v0.1**. La fl2v ha la v1.0 e la v1.1 (Comfy-Org e lightx2v, controllati file per
file), ma la fl2v è un altro checkpoint. Quello che si poteva fare — ed era già
fatto — è usarlo come va usato: `MiniMaxH3SigmaShift` installa `ModelSamplingAV`
con gli scarti 12 e 3, che è il supporto nativo per i **due orologi** di H3
(video e audio denoisati insieme su schedule diverse). Senza, l'audio a quattro
passi esce sporco, ed era il difetto per cui esisteva un nodo di terzi fino ad
agosto.

**La Storia** è `apps/cinema/src/storia.js`, e le tre decisioni che contano:

1. **una scena per volta, non cento in coda.** Sembra più lento e non lo è — la
   scheda ne fa una alla volta comunque — ed è l'unica forma recuperabile: la
   coda di ComfyUI non sopravvive a un riavvio, mentre l'elenco delle scene sta
   nel `localStorage` e riprende da dov'era.
2. **la cucitura sta nel motore**, `/daprod/cuci`, e non nello shell: lì c'è già
   un Python che sa dov'è la cartella dei risultati, e ffmpeg — quello del
   sistema o quello che `imageio_ffmpeg` si porta dentro l'ambiente. Si
   ricodifica invece di `-c copy` perché in una storia lunga non è detto che
   tutte le clip abbiano la stessa misura.
3. **il tempo si dice prima.** La riga sotto ai due numeri scrive quante ore ci
   vogliono, e appena c'è una scena vera il conto si rifà sui tempi misurati e
   non sui tre minuti di partenza.

L'elenco delle scene usa `lista-viva.js` della 0.4.4, e lì serve più che
altrove: ogni riga ha una casella di testo, e ridisegnare tutto quando una clip
finisce vorrebbe dire perdere il cursore mentre correggi la scena 34.

**Provato:** la cucitura sul serio, con tre clip vere di Cammo — 3 × 10,04 s →
30,17 s, video e audio a posto — con lo stesso comando che usa la rotta. E i due
grafi di H3 in un banco a parte: a venti passi nessun `LoraLoaderModelOnly` e lo
shift che prende il modello nudo, a quattro il LoRA in mezzo a forza 1,0.

---

### Com'è fatto il giro della 0.4.5

**Il difetto era nostro, non del modello.** Cammo ha visto
`Nel nodo VAEDecode: Input type (torch.cuda.HalfTensor) and weight type
(torch.HalfTensor) should be the same` a metà di una serie di clip. Quel
messaggio vuol dire una cosa sola: i dati sono sulla scheda e i pesi no.

Il colpevole è `apps/cinema/src/memoria.js`. `faiSpazio()` chiama
`/daprod/scarica {tutti:true}`, che dentro al motore è `mm.unload_all_models()`
— e quello **non chiede permesso a nessuno**: toglie i pesi dalla GPU anche al
lavoro che ComfyUI sta eseguendo in quel momento. Il video in corso continua
finché non serve un pezzo che non c'è più, e quel punto è il VAE: l'ultimo
nodo, dopo minuti di lavoro già fatto.

Si innesca solo premendo Genera con qualcosa già in coda — che è il modo
normale di usare l'app. La guardia è una riga: `if (await
ponte.motoreOccupato()) return`. E non si perde niente, perché il lavoro nuovo
userà **gli stessi pesi** di quello in corso: non c'era spazio da fare.

Lo stesso schema c'era in Musica (`crea.js`) e in Foto (`memoria.js`):
`motoreOccupato()` sta nei tre `ponte.js`, e se il motore non risponde torna
**`true`** — fra non liberare la memoria e ammazzare un video a metà, il
secondo è peggio.

**I due orologi.** Il cronometro partiva da `execution_start`, cioè da quando
il motore prende in mano il lavoro: con due clip in coda si azzerava fra l'una
e l'altra. Adesso ogni lavoro ha `chiesto` (quando hai premuto, mai riscritto)
e `inizio` (quando il motore ha cominciato). Si mostra `chiesto`, si stima su
`inizio` — mescolarli darebbe una stima che conta anche l'attesa in coda, cioè
il triplo del vero. `execution_start` adesso fa `l.inizio = l.inizio ||
Date.now()`, perché arriva anche quando un lavoro riprende.

**I limiti veri dei due modelli**, letti dal sorgente dei nodi e non dedotti:
LTX 2.5 arriva a **20 s** (`max_seconds` di `LTXVDurationPredictor`), H3 a
**15 s** (addestrato fra 124 e 362 fotogrammi, dice il tooltip di
`nodes_minimax_h3.py`). Il cursore di LTX era fermo a 10 per prudenza nostra.

Sulla **modalità storia** e sui video da mezz'ora: la ricerca sta in
[ROADMAP.md](ROADMAP.md), col riassunto onesto — in una ripresa sola non si fa
su questa scheda, come **storia di inquadrature** sì, ma è una notte di lavoro.

---

### Com'è fatto il giro della 0.4.4

**Il pannello Sessione si rifaceva da capo una volta al secondo.** Serviva a
far scorrere il tempo trascorso e la barra di avanzamento, e il modo era un
`innerHTML` su tutto il contenitore, con una memoria della stringa disegnata
per saltare i giri identici. Ma la stringa **cambia** ogni secondo, perché ci
sono dentro i secondi: il salto non scattava mai, e ogni secondo sparivano e
tornavano anche i risultati già finiti. A Cinema quello voleva dire un `<video>`
nuovo ogni secondo — dare play mentre qualcosa generava era impossibile — a
Musica e Foto le copertine e le miniature che ricaricavano.

La soluzione era già in casa: **DaProdVoce** faceva un riquadro per lavoro fin
dal primo giorno, proprio perché ogni riga finita contiene un lettore audio.
Quella idea è diventata `packages/ui/src/lista-viva.js`, servito a tutte le app
sotto `/comune/`:

- ogni voce ha una **chiave** (l'id del lavoro, l'id del brano) e un nodo suo;
- voce identica al giro prima → il nodo non si tocca, e il video continua;
- voce che sa aggiornarsi (`aggiorna(nodo)`) → si cambiano solo il testo e la
  larghezza della barra, così nemmeno l'animazione della miniatura riparte;
- voce nuova o cambiata davvero → si rifà **solo quel nodo**;
- voce sparita → via quel nodo.

Spostare un nodo con `insertBefore` non lo distrugge: un video che scende di
posto perché ne è arrivato uno più recente continua a suonare.

Con questo è sparito `scordaDisegno()` da tutte e tre le app: serviva solo a
ingannare quella memoria della stringa, e senza quella memoria non ha più
niente da fare.

L'algoritmo è stato provato a parte, con un DOM finto: dodici casi — ordine,
inserimento in cima, rimozione, inversione, aggiornamento in casa — e in tutti
i nodi riusati sono rimasti **lo stesso oggetto**, che è la cosa che tiene vivo
il video.

---

### Com'è fatto il giro della 0.4.3

**DaProdVoce è l'ottava scheda**, e la cosa che vale la pena raccontare non è
l'app: è **come ci gira dentro il modello**.

Il modello (Audio8 TTS, 0.1B e 0.6B) si porta il proprio codice, che transformers
esegue con `trust_remote_code`. Quel codice è scritto per **transformers 4.57**;
l'ambiente della suite ha la **5.15**, che è la versione con cui girano gli altri
sei motori e che sta scritta in `versioni.txt`. Le due non vanno d'accordo su un
punto solo — `FalconHybridMambaAttentionDynamicCache`, la cache dei modelli
ibridi attenzione+Mamba, che nella 5 non esiste più perché le cache sono state
unificate in `DynamicCache`.

**Provato, non dedotto** (21 agosto 2026, stesso testo, stesso PC):

| | Risultato |
|---|---|
| transformers 4.57.5 | 35 fotogrammi, si ferma da sé, i codici sono tutti diversi |
| transformers 5.15.0 + toppa sulla cache | 512 fotogrammi, non si ferma mai, `1539, 1875, 1539, 1875…` |

La toppa che rimappa la vecchia classe sulla nuova **fa passare l'importazione e
non fa funzionare il modello**: è il caso peggiore, perché non è un errore ma una
voce che non smette più di parlare, e sembra un difetto del modello.

Da lì la scelta, che è la novità di struttura di questo giro:
**`services/<id>/requisiti-privati.txt`**. Si installa con `uv pip install
--target` in `runtime/.daprod-privato/<servizio>` — **senza** il file dei
vincoli, che è tutto il punto — e a metterselo in `sys.path` è soltanto
`services/voce/avvio.py`. Centoventisette MB, e l'ambiente condiviso non cambia
di una riga: gli altri motori non sanno nemmeno che quella cartella esista.

Le due strade scartate, scritte perché non vengano riprese per sbaglio:
abbassare `transformers` per tutti (cioè la notte del 19 agosto di nuovo) e un
secondo ambiente Python intero (altri 2,5 GB di torch).

**Il resto del giro è roba vista usando la 0.4.2**: la Galleria che a Cinema
mancava, il divieto di generare senza riferimenti tolto da H3 (era dell'app, non
del modello), e Anima v2 fra i modelli di Foto — che costa 3,1 GB perché divide
text encoder e VAE con Anima Turbo.

**Cosa è stato provato davvero, e cosa no.** Il motore di DaProdVoce sì, fuori
da Electron ma con l'ambiente vero della suite: `/health`, `/api/stato`, un
lavoro in coda con l'avanzamento, un wav da 9,47 s scritto sul disco, una voce
salvata e riusata per clonare, il testo lungo tagliato in tre pezzi. **Tutto il
resto no**: la finestra, il menu dei modelli, lo scaricamento dall'hub, la
Galleria di Cinema, Anima v2. Sono scritti e compilano, e non sono mai stati
aperti.

### Com'è fatto il giro della 0.4.2

**DaProdCinema è stato rifatto da capo**, e la ragione è una sola: la
generazione base non aveva mai funzionato, e sopra ci era stato costruito il
video musicale automatico. Il difetto vero, in una riga: il latente audio-video
di LTX 2.5 è una **coppia annidata** e va aperto con `LTXVSeparateAVLatent`
prima di decodificarlo — quel nodo non c'era, e `VAEDecodeTiled` un tensore
annidato lo rifiuta. Nessuna clip poteva uscire, e la verifica contro
`/object_info` non poteva accorgersene: dice che gli ingressi esistono, non cosa
ci scorre dentro. **La lezione, scritta in MODELLI-E-STRATEGIA § 5.2: si legge
il sorgente del nodo, non solo la sua firma.**

- **`apps/cinema/src/grafi.js`** — riscritto. Due grafi, numerazione condivisa
  come prima (1 testo, 2 il prompt, 4 modello video, 6 la parte lunga, 8 i
  fotogrammi, 12 il file), così `FASI` vale per tutti e due. Cose da sapere:
  - **LTX 2.5 distillato vuole `euler_ancestral` e `ManualSigmas`** con gli otto
    valori del flusso ufficiale di Lightricks. `LTXVScheduler` con `euler` — che
    è quello che c'era — genera qualcosa, ma non quello che il modello sa fare.
    Per questo il cursore dei passi con LTX è **spento**: cambiarne il numero
    senza cambiare la scala peggiora e basta.
  - **Primo e ultimo fotogramma: `LTXVAddGuide`** con `frame_idx` 0 e -1,
    incatenati (positivo, negativo e latente si spostano a ogni guida), e
    `LTXVCropGuides` dopo il campionamento. `LTXVImgToVideoInplace` sa scrivere
    solo l'inizio.
  - **Le immagini di guida passano da `LTXVPreprocess`** (`img_compression: 18`):
    ricomprimerle è voluto, il modello è addestrato su fotogrammi compressi.
  - **H3 è passato alla variante ref2va**, con `MiniMaxH3ReferenceToVideo`. Gli
    ingressi dei riferimenti sono una famiglia `Autogrow`: nel grafo API si
    chiamano `ref_image_0`…`ref_image_8`, `ref_video_0`, `ref_video_audio_0`,
    `ref_audio_0`, **contati da zero**, mentre le etichette del prompt partono da
    uno. E `LTXVSeparateAVLatent` serve anche a lui: la sua descrizione dice
    «any AV model», H3 compreso.
  - **Le lunghezze**: `8n+1` per LTX, `17k+5` per H3, tutte e due a **24 fps**
    (prima LTX era segnato a 25).
- **`apps/cinema/src/riferimenti.js`** — i riquadri in cui entrano i file, e il
  conto delle etichette. Il conto è la parte che vale: la colonna sonora di un
  video di riferimento prende un numero d'`Audio` **prima** degli audio sciolti,
  ed è una regola che a mente non si tiene. Cliccando l'etichetta finisce nel
  prompt dove sta il cursore. I file restano `File` del browser finché non si
  preme Genera: caricare 30 MB per poi cambiare idea è tempo buttato.
- **`apps/cinema/src/formato.js`** — gemello di quello di DaProdFoto, con misure
  multiple di 32 e la riga che dice quanto costa una misura rispetto al 480.
- **`apps/cinema/src/scelta-modello.js`**, **`memoria.js`**, **`coda.js`** —
  copiati nello spirito da DaProdFoto: il modello in cima con la barra di
  scaricamento sotto, la VRAM svuotata prima di generare, e `riallinea` che
  guarda la cronologia prima di buttare via un lavoro.
- **Tolti**: `regista.js` (la tabella sezione → funzione e camera) e
  `dati/look.js`. Il ragionamento del regista era buono e resta nella storia di
  `git`, fino alla 0.4.1: si riprende **dopo** che la generazione base ha
  prodotto un mp4.
- **Come è stata provata l'interfaccia.** Un server statico che serve
  `apps/cinema` e `packages/ui/src` sotto `/comune/`, più uno script che finge
  `window.daprodSuite` e `window.daprodCinema`, e la pagina aperta in un browser:
  cambio modello, riquadri che si ridisegnano, file trascinati dentro, etichette
  che si rinumerano, i due messaggi di «non posso partire». Zero errori in
  console. **Non è una clip**, ma è tutto quello che si può provare senza scheda.

**DaProdMusica: «Crea» non va mai avanti.** Il sintomo riferito da Cammo — con
tutti e tre i modelli — e la causa più probabile, trovata leggendo il percorso:
`liberaMemoriaLlm()` chiama `lms ps` e `lms unload` attraverso `capture()`, e
`capture()` **senza `timeoutMs` aspetta per sempre**. Quelle chiamate stanno
dentro al percorso di Genera di *tre* app. Se `lms` non risponde, il tasto resta
premuto: nessun errore, niente in coda, niente da nessuna parte.

- **`apps/shell/src/main/llm.ts`** — timeout su tutte e tre le chiamate a `lms`
  (8s per `ps`, 30s per `unload`, 10 min per `load`). Scaduto il tempo `run`
  ammazza il processo e la promessa si rompe, e chi chiama l'errore lo ignora.
- **`apps/musica/src/crea.js`** — `occupa`/`libera` sul tasto, con i passaggi
  raccontati («libero la memoria…», «disegno la copertina…», «mando al
  motore…»), e il `try` che comincia **prima** di tutto quello che può metterci.
  `liberaMemoriaLlm()` adesso ha il suo `.catch()`.
- **`apps/musica/src/coda.js`** — `riallinea` guarda la cronologia prima di
  buttare via un lavoro sparito dalla coda, come faceva già DaProdFoto: «sparito»
  vuol dire anche «finito» quando il WebSocket si riapre.

⚠ **Il blocco non si è riprodotto su questo PC**: `lms ps` risponde in un
secondo e LM Studio era acceso. Quindi la causa è la più probabile, non una
misurata. Se dopo questo giro «Crea» si pianta ancora, la cosa da guardare è
**dove** si ferma: adesso il tasto lo scrive.

### Com'è fatto il giro della 0.3.3

- **`packages/ui/src/proposte.js`** — le pastiglie con le proposte, per tutte le
  app. Elenco nel `localStorage` sotto la chiave che passa l'app, `+` per
  aggiungere, menu col tasto destro per modificare/eliminare, e una finestrella
  `<dialog>` per titolo e prompt. Due avvertenze imparate provandolo su
  Chromium: **l'evento `close` di un `<dialog>` non arriva** — né con
  `onclose`, né con `addEventListener` — quindi chi chiude toglie la finestrella
  da sé; e lo stile se lo inietta da solo, perché i fogli delle app non lo
  conoscono.
- **`apps/foto/src/formato.js`** — forma e risoluzione a pulsanti, con la tabella
  delle misure scritta a mano (tutte multiple di 16) invece che calcolata: un
  16:9 arrotondato darebbe 1936×1088, e nessuno riconosce quel numero.
- **`apps/foto/src/memoria.js`** — `faiSpazio(modello, racconta)`: spegne il
  modello di LM Studio e, se serve, svuota la VRAM del motore. Chiamata da Crea
  e da Ritocco appena prima di `ponte.invia`. Il modello usato l'ultima volta
  sta nel `localStorage`: è così che si sa se è cambiato.
- **`passi` è diventato `step`** dappertutto in Foto — id nella pagina, campo dei
  modelli in `grafi.js`, metadati delle immagini nuove.

Il banco di prova usato per guardare le pagine fuori da Electron (un
`window.daprodSuite` finto e un server statico) è stato buttato: si rifà in
cinque minuti se serve.

### Com'è fatto il giro della 0.3.4

- **`services/comfy/nodi/daprod_ponte/__init__.py`** — il traduttore. Tre
  cambiamenti che vanno insieme: `_carica_traduttore()` gira **in un thread**
  (prima bloccava il loop di aiohttp per una quindicina di secondi, ed è la
  ragione vera del «bloccato su traduco…»), un `threading.Lock` fa passare una
  traduzione alla volta, e `_stato_trad` racconta a che punto è. La rotta nuova
  è `GET /daprod/traduttore`. Il conteggio dei token arriva da un
  `StoppingCriteria` che non ferma mai niente, costruito con una via di fuga:
  se una versione di transformers non lo accetta, la traduzione parte lo stesso
  e la barra si muove senza fondo.
- **`/daprod/modelli` non è più solo la VRAM**: c'è dentro anche il traduttore,
  con `dispositivo: "cpu"` e i suoi MB in `totaleMb`. Chi disegna la riga guarda
  `dispositivo` per non sommare RAM e memoria video.
- **`packages/ui/src/modelli-in-memoria.js`** — i quadratini in cima alle app,
  che erano in due copie identiche in Foto e Musica. Promosso adesso perché
  aggiungere il traduttore avrebbe voluto dire scriverlo due volte. Le due copie
  in `apps/*/src/modelli.js` non ci sono più.
- **`apps/foto/src/lingua.js`** — la barra. Guarda `/daprod/traduttore` quattro
  volte al secondo e disegna: `quota` a `null` (caricamento) diventa una barra
  che scorre, un numero diventa una barra piena a percentuale. Attenzione al
  colpo d'occhio che torna **dopo** la fine: senza la sua guardia riscriveva il
  riquadro sopra il risultato, e restava lì "aspetto il traduttore" per sempre.
- **`apps/foto/src/ritocco.js`** — `inverti()` scambia la trasparenza (non
  "dipinto sì/no": i bordi del pennello sono sfumati), `mascheraPiena()` torna
  tutta rossa quando non hai dipinto niente, e `raccontaIlTasto()` tiene
  aggiornata anche `dataset.prima`, che è quello che `libera()` rimette sul
  tasto quando ha finito di lavorare.

### Com'è fatto il giro della 0.4.1

- **`packages/ui/src/scaricamento.js`** — il riquadro «manca, ecco i GB» con
  dentro la barra, per tutte le app. Nato copiando quello che DaProdFoto aveva
  già in `scelta-modello.js`, che adesso lo usa al posto del suo. Chi lo collega
  gli passa le quattro funzioni del proprio ponte (`stato`, `scarica`,
  `annulla`, `onAvanzamento`) e `io`, l'id dell'app. Due cose imparate
  scrivendolo: la velocità va misurata **sugli ultimi dieci secondi** (una media
  dall'inizio, su uno scaricamento ripreso a metà, non è mai stata vera), e
  «Annulla» si mostra **solo se lo scaricamento è nostro** — per questo
  `AvanzamentoModelli` adesso porta anche `app`.
- **`AvanzamentoModelli.app`** (`packages/ipc`) — chi ha chiesto lo
  scaricamento. Serviva all'hub, che prima non poteva annullare uno
  scaricamento partito da dentro un'app: `annulla(id)` vuole l'id della scheda,
  e l'hub non lo sapeva. Adesso `api.modelli.annulla` c'è anche nel suo preload.
- **`apps/cinema/src/grafi.js`** — riscritto: `grafoLtx` e `grafoH3` al posto di
  quello di Wan, con la stessa numerazione dei nodi (1 testo, 2 inquadratura, 4
  modello video, 6 la parte lunga, 8 i fotogrammi, 12 il file), così `FASI` e la
  barra funzionano per tutti e due. Cose da sapere:
  - **LTX vuole `SamplerCustomAdvanced`**, non `KSampler`: i suoi sigma li fa
    `LTXVScheduler`, e nessuno degli scheduler del KSampler gli somiglia.
  - **`LTXVScheduler` va nutrito col latente *video*, non con quello unito**: il
    latente AV è una coppia annidata, e lui ci calcola sopra `math.prod(shape)`.
  - **Il VAE audio di LTX si carica da `checkpoints`** (`LTXVAudioVAELoader`
    legge da lì), non da `vae`: dentro c'è anche il vocoder.
  - **H3 restituisce conditioning e latente insieme** da
    `MiniMaxH3ImageToVideo`, e il suo VAE video si taglia i blocchi da solo —
    quindi `VAEDecode` e non `VAEDecodeTiled`.
  - **Le lunghezze sono su due griglie diverse**: `8n+1` a 25 fps per LTX,
    `17k+5` a 24 fps per H3. Il montaggio adesso riceve gli fps del modello che
    ha girato le clip, altrimenti il video scivola via dalla canzone.
- **La verifica dei grafi**, che si può rifare in due minuti: motore avviato a
  parte (`python main.py --cpu --port 8199 --extra-model-paths-config
  engines/percorsi-daprod.yaml`), i grafi generati con `node` e passati a uno
  script che controlla contro `/object_info` che ogni `class_type` esista, che
  ogni ingresso sia previsto, che non manchi nessun obbligatorio e che nessun
  collegamento punti nel vuoto. Passano tutti — cinema e musica — e l'unica cosa
  che segnala è `LoadImage.image`, che è un elenco di file già dentro al motore.
- **`apps/musica/src/dati/ace.js`** — `LINGUE` ha tre campi adesso: `id` (il
  valore che vuole il nodo di ACE-Step, lettera per lettera), `nome` (l'italiano
  della pastiglia) e `inglese` (quello che finisce nella descrizione per
  MiniMax, in `grafi.js` → `descrizione()`).

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

**DaProdIoDigitale — non fatto.** Il piano, con l'inventario vero, è più sotto.

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

### Il Visualizer da dentro le altre app — tolto il 20 agosto 2026

> **Non c'è più.** Il tasto «♪ Visualizer» in basso a destra di ogni app è stato
> tolto su richiesta di Cammo: «io intendevo che posso aprire tutte le app
> contemporaneamente, non voglio questi pulsanti nelle app». `apriApp` resta nel
> ponte comune, e la barra condivisa `.daprod-barra` resta con dentro il solo
> tasto del log. Quello che segue è la storia di com'era, e resta perché la
> prima metà — la prova che il Visualizer sta acceso insieme alle altre app — è
> ancora vera ed è la ragione per cui il tasto non serve.

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

## Com'è entrato DaProdCompanion (19 agosto 2026)

**Viene da `Desktop\DaProdCompanion`**, che era un programma intero: un
workspace `uv` con quattro pacchetti Python, un `.env` da compilare a mano,
Ollama a parte, e **tre** servizi — `brain`, `stt`, `tts` — accesi da un
Electron tutto suo. Dentro la suite è entrato il cervello e basta.

**Cosa è cambiato, e perché.**

| Nel progetto d'origine | Nella suite | Perché |
|---|---|---|
| Ollama su `/api/chat` | LM Studio su `/v1/chat/completions` | è il modello che scrive di tutta la suite: un secondo sarebbe la stessa cosa due volte nella stessa memoria |
| `.env` nella radice | le variabili che passa la shell | come Dream e IoDigitale |
| `input()` per il nome al primo avvio | «Compagno», e si cambia dalla pagina | il motore lo avvia il supervisore, senza console: un `input()` è un processo fermo per sempre |
| `tts_service` + `stt_service` | `None`, e il codice degrada da sé | erano due processi con i loro GB, e la suite ha già Piper e Whisper |
| `models: [lmstudio-cervello, ...]` nel catalogo | `models: []` | quei pesi li tiene LM Studio: contarli fra i GB da scaricare avrebbe lasciato la scheda «da installare» per sempre |

**Le tre differenze che si sono sentite davvero nel codice**, passando da Ollama
all'API di OpenAI:

1. **Gli argomenti di un `tool_call`** arrivano come stringa JSON e non come
   oggetto già pronto.
2. **Il risultato di uno strumento vuole `tool_call_id`**: senza, LM Studio
   rifiuta tutto il turno.
3. **Il contesto non si passa più a ogni domanda** (`num_ctx`): in LM Studio è
   una proprietà del modello caricato, ed è quello che decidono i tre pulsanti
   dell'hub.

**Due cose trovate solo provandolo**, e che valgono come metodo:

- **`/v1/models` elenca i modelli installati, non quelli caricati**, e il primo
  dell'elenco su questa macchina era `text-embedding-nomic-embed-text-v1.5`.
  Chiedendo una conversazione a un modello di embedding, LM Studio risponde
  *«No models loaded»* — un messaggio che manda a cercare nel posto sbagliato.
  Adesso il ripiego salta i modelli il cui nome dice `embed`, e per gli
  embedding fa il contrario.
- **`enable_thinking: False` non lo onorano tutti.** Con `lfm2.5-2.6b` il
  consolidamento tornava `content` **vuoto** e tutto il ragionamento nel campo
  di fianco: da fuori sembrava un modello che non sa rispondere, e invece aveva
  risposto nella casella sbagliata. Il ripiego legge anche lì — è lo stesso che
  `llm.ts` fa già per DaProdMusica.

**Provato fino in fondo** il 19 agosto: due turni di conversazione con memoria
fra l'uno e l'altro, un consolidamento forzato che ha prodotto quattro episodi
consolidati, e il grafo scritto con `Cammo (Persona) → conosce → Compagno`, più
i due appunti in markdown con il frontmatter di Obsidian. Zero errori nel log.

**Cosa resta**: la voce, e il giudizio di Cammo sulla qualità della
conversazione — che dipende dal modello che sceglie lui, non da noi.

## Il prossimo passo

**Prima di tutto: aprire il programma e provare le due cose nuove.** La 0.4.3
aggiunge una scheda intera e un modo nuovo di installare librerie, e nessuna
delle due è mai passata da Electron.

1. **DaProdVoce dall'hub.** L'installazione deve fare tre cose di fila: i pesi
   (1,58 GB), le librerie del motore, e — la parte nuova — le librerie private in
   `runtime/.daprod-privato/voce`. Se quella cartella non compare, il motore
   parte lo stesso e lo scrive nel log: *«Nessuna cartella di librerie private»*,
   e la voce non si fermerà più. È il primo posto da guardare.
2. **Una frase corta, poi una lunga.** Corta per vedere che esce; lunga per
   vedere il taglio in pezzi e il respiro fra l'uno e l'altro.
3. **Una voce clonata.** Serve un audio con la sua trascrizione: il tasto
   «prendilo dalla libreria» pesca un brano già fatto, e per quelli fatti da
   DaProdVoce la trascrizione si riempie da sé.

**E poi resta il debito della 0.4.1, che è ancora aperto: far uscire una clip da
DaProdCinema.** Sono stati scritti un video musicale automatico, una scaletta, un
montaggio e due grafi sopra a una generazione che non aveva mai prodotto un file.
LTX 2.5 è già sul disco (23,2 GB): 480, cinque secondi, niente immagini. Finché
non esce quel mp4, **niente di nuovo su Cinema**.

Poi, in ordine di quello che resta aperto:

1. **La stessa cosa con un primo fotogramma**, e poi con primo e ultimo. È il
   pezzo dove il grafo fa la cosa più delicata (`LTXVAddGuide` +
   `LTXVCropGuides`): se i fotogrammi di guida restassero nel video si vedrebbe
   subito, in testa alla clip.
2. **MiniMax H3**, che sono 41,6 GB e non ne è stato scaricato nessuno. Ha senso
   solo dopo che LTX ha funzionato: se qualcosa non va, con LTX già provato si sa
   dove guardare.
3. **L'aggiornamento automatico sul secondo PC.** Adesso si può davvero: da una
   0.1.0 installata l'aggiornamento ha finalmente qualcosa da vedere. È la cosa
   per cui quel computer è stato installato.
4. **La voce del Companion**, con Piper e faster-whisper che la suite ha già in
   casa per IoDigitale.
5. **L'accesso da fuori e Android** (§ 0.5.0 e § 0.6.0), che è un progetto a sé.
6. **Il video musicale di Cinema, di nuovo** (§ 0.7.0): dopo, non prima.
7. **La copertina e l'icona di DaProdVoce**, che vanno generate con Anima a
   motore acceso (`node apps/shell/scripts/genera-copertine.cjs voce` e
   `pnpm --filter @daprod/shell icone`). Vanno fatte **da qui**: dentro una
   sandbox i file finiscono in una cartella finta.
8. **Un modo di comandare la suite da fuori** — l'MCP che ha chiesto Cammo il 21
   agosto, con Needle 2 come traduttore fra una frase e una chiamata. Il piano è
   in roadmap, § «Un'AI che usa il programma da sola»: il lavoro vero non è il
   modello, è dichiarare una volta sola le azioni che le app già sanno fare.

## Com'è entrato DaProdIoDigitale

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
sue da giudicare — e poi tocca a **DaProdIoDigitale**, che è la più pesante
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

- **Un ramo per release e una pull request**, e si va **fino alla Release**
  (regola cambiata due volte: il 18 agosto 2026 da «niente rami, niente PR» a
  «il Merge lo preme lui», e il 19 agosto ancora, perché fermarsi lì gli
  lasciava tre passaggi meccanici da fare per arrivare a quello che voleva —
  aggiornare e provare). Quindi: ramo `release-<versione>`, PR con dentro cosa
  cambia **e cosa non è a posto**, merge, tag, Release. Niente rami di prova
  oltre a quello. Si parte da 0.0.1 e il numero sale solo quando si pubblica.
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
| huggingface-hub | **pavimento a `>=1.28`**, non un tetto: la decisione del 18 (tetto a `<1.0` «perché lo pretende transformers») era vera con transformers 4 ed è diventata il contrario con la 5. È quella che ha rotto quattro app il 19 agosto. Niente comando `hf`: si usa `snapshot_download` |
| Versioni dei pacchetti | fissate in `packages/runtime/requirements/versioni.txt` e passate come **vincolo** a ogni installazione, ComfyUI e nodi custom compresi. Non `==` nei requisiti: quello obbligherebbe a reinstallare pacchetti che altri motori stanno usando, ed è il difetto per cui i `==` erano stati tolti |
| Companion | **niente voce, per adesso**: `tts_service` e `stt_service` erano due processi Python in più con i loro GB, e la suite ha già Piper e faster-whisper per IoDigitale. Il codice che li chiamava è intatto, con `None` al posto del client |
| Pezzi di interfaccia condivisi | `packages/ui`, serviti sotto `/comune/` **dalla stessa origine** della pagina che li usa: un host tutto loro sarebbe stato bloccato dalla CSP delle app (`script-src 'self'`) |
| Copertine | generate con `PreviewImage`, quindi nei temporanei: se andassero in output la libreria si riempirebbe di copertine sciolte |
| Lettore di Musica | a fine brano si ferma, non passa al successivo |

## Cosa aspetta un giudizio di Cammo

**Della 0.4.1, costruita il 20 agosto e da provare:**

- **DaProdCinema con LTX 2.5** — è la cosa grossa, ed è quella che nessuno ha
  mai visto girare. 23,2 GB da scaricare (la barra adesso te lo dice mentre
  arriva), poi **una sola inquadratura, misura Provino**: prima di impegnare un
  pomeriggio si guarda quanto costa una clip. Se esce un mp4 con dentro un
  movimento, il resto della scheda è già collaudato dalla 0.4.0.
- **MiniMax H3** — 42,3 GB, e su 8 GB di scheda è una prova, non un modo di
  lavorare. Vale la pena solo dopo che LTX ha funzionato.
- **DaProdMusica, la lingua** — cantare in italiano con ACE-Step (dove è
  un'impostazione vera) e con MiniMax (dove è una frase nel prompt): serve
  sapere se la seconda cambia qualcosa davvero o se tanto vale dirlo a mano.
- **Il decode a blocchi spento** — se un brano lungo adesso si ferma per memoria
  finita, va riacceso dagli avanzati: è esattamente la cosa da segnalare.
- **La barra dello scaricamento** — annullare a metà e riprendere, e guardare se
  velocità e «quanto manca» raccontano la verità su decine di GB.

**Della 0.3.2, costruita il 20 agosto e da provare:**

- **Lo scaricamento a quattro connessioni** — la prova vera è una scheda intera
  da installare: dovrebbe metterci un terzo del tempo. Misurato qui su un file
  da 207 MB (3,9 → 11,8 MB/s) e provato interrompendolo a metà, ma **su 7,9 GB
  di MiniMax non l'ha ancora provato nessuno**.
- **DaProdFoto** — premere «Genera» e vedere se capita ancora che non parta;
  «cartella» su un'immagine della galleria (deve aprirsi Esplora risorse con
  l'immagine selezionata); «salva» per portarne fuori una copia.
- **I due tasti che allargano la descrizione** — con un modello *piccolo* già
  caricato in LM Studio: non deve più partire il caricamento di Bonsai 27B.

**Della 0.3.1, pubblicata il 19 agosto:**

- **DaProdCompanion** — parlarci, guardare la scheda *Memoria* dopo qualche
  scambio, premere «Sogna adesso» e vedere se quello che ha capito ha senso. La
  qualità della conversazione dipende dal modello scelto nel selettore: con un
  2,6B è quello che è, con Bonsai 27B è un'altra cosa.
- **Il profilo di memoria** — è **da misurare**, come la velocità: generare la
  stessa cosa in *bilanciato* e in *leggero* e guardare i minuti. In *leggero*
  la promessa è che LM Studio possa restare acceso mentre generi.
- **Il pannello della memoria video** — aprirlo mentre Musica o Foto stanno
  lavorando: dovrebbe elencare quello che c'è dentro e lasciarlo togliere.
- **Le anteprime delle schede** — passare il mouse sulle sette schede dell'hub.

**Da prima, e ancora aperto:**

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
