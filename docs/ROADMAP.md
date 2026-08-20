# Roadmap

Le versioni salgono **solo quando si pubblica** (vedi
[COME-SI-LAVORA.md](COME-SI-LAVORA.md) § 2). Quello che resta sul PC e non viene
pubblicato non consuma un numero.

Ogni app si migra **una alla volta**: si porta dentro, la si prova davvero, si
aggiusta con il tuo giudizio, e solo dopo si passa alla successiva.

---

## 0.0.1 — Le fondamenta ✅

Fatto. Non c'è ancora un'app dentro la suite, ma c'è tutto ciò che serve per
metterle.

- [x] Guscio Electron con l'hub, sette schede, stato per ognuna
- [x] Arbitro della GPU: un solo motore pesante alla volta sugli 8 GB
- [x] Supervisore dei processi: avvio, `/health`, riavvio con backoff, spegnimento
- [x] Catalogo delle app e contratti tipizzati fra shell e interfacce
- [x] Catalogo dei modelli con URL e dimensioni verificate
- [x] Installer NSIS e aggiornamento automatico da GitHub Releases
- [x] **Ambiente Python unico**: da 4 venv e 14,7 GB a uno da 4,05 GB
- [x] Verificato che tutti e quattro i motori girano su torch 2.13
- [x] Dati utente separati dal programma: aggiornare non tocca i modelli

## 0.1.0 — Le prime app dentro ✅

**Pubblicata il 16 agosto 2026.** Le tre app sono dentro e girano: generano,
si passano i risultati e sono state provate una per una aprendo l'app, non solo
leggendo il codice.

- [x] **DaProdVisualizer** — nessun Python, valida lo schema delle finestre.
      *Provato: i brani di DaProdMusica si ascoltano dal pannello "Brani
      generati", con le visualizzazioni che reagiscono.*
- [x] **DaProdMusica** — primo motore su ComfyUI condiviso. *Brani veri con
      copertina; con lei sono entrati il supervisore collegato, la libreria che
      sa scrivere e lo schema `daprod://`. Resta da provare a lungo la libreria
      (rinomina, elimina) e lo scambio con le altre app.*
- [x] **DaProdFoto** — Anima di base, FLUX.2 Klein come extra. *Dentro tutti e
      tre i modelli — Anima, Klein 4B e 9B — con la scelta in cima e lo
      scaricamento dal menu. Provati: generazione e ritocco con maschera.*
- [x] **ComfyUI scaricato quando serve** — la versione è fissata (0.33.1), lo zip
      arriva da GitHub e le sue librerie entrano nell'ambiente condiviso senza
      toccare torch. Era l'ultimo pezzo che mancava a "git clone deve bastare"
- [x] **Il motore si aggiorna quando lo decidiamo noi** — la versione resta
      scritta accanto al motore, così una correzione arriva anche a chi ce l'ha
      già. I nodi custom di ComfyUI si installano allo stesso modo
- [x] Scaricamento dei modelli con ripresa e avanzamento — *(provato: annullato a
      metà, ripreso, arrivato intero; da provare tu su una scheda intera)*
- [x] **Procedura guidata al primo avvio**: scegli le app, ti dice quanti GB, e
      le installa una dopo l'altra. Compare solo se c'è davvero qualcosa da
      installare, e una volta sola. *Con questa la 0.1.0 è chiusa.*

## 0.1.5 — Bonsai: il modello che scrive

Un LLM locale, **uno per tutta la suite**, tenuto acceso da LM Studio. Non è il
cervello del Companion prestato in giro: è il contrario, e ogni app gli chiede
la cosa che sa chiedere.

- [x] **Il ponte comune** (`daprodSuite.llm`): stato e domande con risposta di
      forma imposta, uguale per tutte le app
- [x] **DaProdMusica — "Bonsai: fai tutto"**: da una riga d'idea a titolo,
      stile, testo con i tag di sezione e descrizione della copertina.
      *Funziona; la qualità dell'italiano va guidata a colpi di istruzioni.*
- [x] **DaProdMusica — "Bonsai: finisci"**: completa quello che hai abbozzato
      senza stravolgerlo
- [x] **Pannello LM Studio nella suite**: quali modelli ci sono, caricarli e
      scaricarli al volo, e il contesto con tre pulsanti — 64K, 128K, 256K.
      *Fatto: sta nell'hub e, in una riga, dentro le app. L'obiettivo resta far
      stare domanda e risposta dentro i 64K, che è dove va veloce.*
- [x] **DaProdFoto**: da due parole a una descrizione che il modello capisce.
      *Fatto il 17 agosto 2026: due tasti sotto la casella, sempre in inglese.
      Resta da capire perché una domanda a LM Studio dalla suite ci mette
      minuti mentre da Node ne prende nove — vedi
      [RIPRENDERE-DA-QUI.md](RIPRENDERE-DA-QUI.md).*
- [ ] **DaProdCinema**: una chat dove butti l'idea e le foto, e ne esce un
      piccolo video da montare

## 0.2.0 — Le altre tre ✅

**Pubblicata il 19 agosto 2026 (costruita il 18) con due su tre.** Dream e
IoDigitale sono entrate e girano; il Companion no. Il numero è salito comunque
perché nel frattempo era maturato molto altro — le icone, l'hub in 4:3, il
terminale in ogni app, i tre pannelli veri, la procedura guidata — e tenerlo
fermo avrebbe voluto dire non pubblicare niente aspettando un'app sola.

**La terza è arrivata poche ore dopo**, ed è dentro la 0.3.1: non è servita una
0.2.1, perché nello stesso giro sono entrate anche le cose che aspettavano lì.

- [x] **DaProdDream** — trasformazione in tempo reale *(dentro: motore avviato
      dal supervisore, SD-Turbo e TAESD dalla cartella condivisa, finestra della
      suite. Provato fino al modello caricato — la webcam la giudichi tu)*
- [x] **DaProdCompanion** — memoria e sogni. *Dentro il 19 agosto 2026: il
      cervello del progetto d'origine portato nella suite, con LM Studio al
      posto di Ollama e le cartelle della suite al posto del `.env`. Provato
      fino al giro completo — parlato, ricordato, sognato, e il grafo scritto
      con le sue entità. **La voce non c'è ancora**: erano due servizi Python in
      più con i loro GB, e la suite ha già Piper e Whisper per IoDigitale.*
- [x] **DaProdIoDigitale** — l'avatar parlante, ex LeapTalk *(dentro il 17
      agosto 2026: motore avviato dal supervisore, modelli dalla cartella
      condivisa, finestra della suite. Provato fino al motore pronto — la
      conversazione la giudichi tu. **Resta l'interfaccia da tradurre in
      italiano**.)*

## 0.3.0 — Le schede diventano vetrina

- [x] **Disinstalla per scheda**: ogni scheda dice quanto occupa e si toglie da
      sola, riprendendosi i GB. I modelli che servono anche a un'altra scheda
      installata restano. *Arrivata in anticipo, col pannello Spazio.*
- [x] **Ogni scheda ha la sua illustrazione**, generata con Anima dentro la
      suite (`apps/shell/scripts/genera-copertine.cjs`): descrizione e seme
      stanno nel file, quindi una che non piace si rifà cambiando una riga.
      *Fatto il 17 agosto 2026.*
- [x] **Ogni app ha la sua icona**, generata con Anima allo stesso modo
      (`apps/shell/scripts/genera-icone.cjs`), quella della suite compresa: è
      l'icona del programma, dell'installer, dell'area di notifica e della barra
      delle applicazioni. *Fatto il 18 agosto 2026.*
- [x] **Anteprima al passaggio del mouse** — *fatta il 19 agosto 2026: una clip
      di quattro secondi al posto del fermo immagine, con un movimento diverso
      per ogni scheda (`apps/shell/scripts/genera-anteprime.cjs`). Nascono dalle
      copertine già generate con Anima.* ⚠ **Non è ancora l'app che si mostra da
      sola**: il video generato da DaProdDream o dal Visualizer arriva col video
      vero (§ 0.7.0), e allora cambia il programma che le fa, non quello che le
      mostra.

## 0.4.1 — Quello che si è visto usandola ✅

**Costruita il 20 agosto 2026, da provare.** Nessuna funzione nuova grossa: un
giro su quello che è venuto fuori provando la 0.4.0, più il ritorno ai due
modelli video decisi.

- [x] **DaProdMusica: il modello si sceglie per primo** — *stava in fondo, dentro
      «Parametri», ed è la scelta che cambia tutte le altre.*
- [x] **Via il MiniMax a 4 bit** — *700 MB risparmiati in cambio della parte che
      si sente. Resta l'int8, e chi aveva scelto il 4 bit ci finisce sopra da sé.*
- [x] **Il decode a blocchi parte spento** — *resta negli avanzati, per quando un
      brano lungo si ferma per memoria finita.*
- [x] **La lingua del canto a pastiglie, sopra il testo** — *dodici lingue,
      italiano per primo. Con ACE-Step è un'impostazione del nodo; con MiniMax,
      che una casella per la lingua non ce l'ha, finisce nella descrizione dello
      stile insieme alla richiesta di scandire le parole.*
- [x] **DaProdCinema: via Wan, dentro LTX 2.5 e MiniMax H3** — *i due della § 0.7.0.
      LTX 2.5 22B distillato in W4A8 (23,2 GB) è quello che parte e fa il video
      col suono dentro; MiniMax H3 FL2VA col LoRA turbo a quattro passi (42,3 GB)
      è l'altro. I pesi sono i più compressi che ComfyUI 0.33.1 sa caricare da
      sé — la cosa vera presa da WanGP, che è un modo di far entrare i modelli in
      poca memoria e non un modello.* ⚠ **Nessuno dei due è stato provato su una
      clip vera**: i grafi sono verificati contro `/object_info` del motore, non
      su un mp4 uscito dal disco.
- [x] **Una barra per gli scaricamenti, in tutte le app** — *quanti GB su quanti,
      la velocità, quanto manca e il tasto per fermare. Prima c'era scritto
      «l'avanzamento è nell'hub» dappertutto tranne che in DaProdFoto. Il pezzo è
      uno solo, in `packages/ui`, e l'hub ha la stessa barra al posto della riga
      di testo.*

### Cosa **non** è a posto, e va detto

- **I due modelli video non hanno mai girato una clip.** Prima prova consigliata:
  una sola inquadratura, misura Provino, LTX 2.5. Sono 23 GB da scaricare prima
  di sapere se funziona, e su 8 GB di scheda lavorano in offload — minuti a clip.
- **Wan 2.2 resta sul disco a chi l'aveva scaricato**: 18,1 GB in tre file che
  non servono più a niente, da cancellare a mano.
- **Il montaggio finale è ancora quello mai provato** della 0.4.0.

## 0.4.0 — La settima scheda, e un secondo modo di fare musica ✅

**Costruita il 20 agosto 2026, da provare.** DaProdCinema entra nella suite, e
DaProdMusica smette di avere un modello solo.

- [x] **DaProdCinema, la strada lunga** — *fatta il 20 agosto 2026. Da un brano
      della libreria alla scaletta delle inquadrature (funzione e camera per
      sezione, dalla tabella di `regista.js`), una clip per riga girata in fila,
      e il montaggio sopra la canzone. Il regista è provato da solo, senza
      motore: 90 secondi di canzone in 7 sezioni fanno 17 inquadrature, e i conti
      tornano al decimo di secondo.*
- [x] ~~**Il modello video: Wan 2.2 TI2V 5B**~~ — *durata due giorni: nella
      0.4.1 Wan è uscito e sono entrati i due modelli che questa roadmap aveva
      scelto. La ragione tecnica qui sotto resta vera — costano il doppio e il
      quadruplo — ma non era una scelta da fare al posto di chi usa la suite.
      Il testo di allora, per memoria: e non MiniMax H3 o LTX 2.5, che
      questa roadmap aveva scelto. I loro nodi ci sono davvero nel motore, la
      verifica del 16 agosto regge; a non reggere sono i pesi. LTX 2.3 è un 22B
      che in fp8 fa 23 GB più un Gemma 3 12B da 9,4 per leggere il prompt: sugli
      8 GB della 4060 non è lento, è un'altra macchina. Il 5B costa 18,1 GB in
      tutto ed è l'unico che fa testo→video e immagine→video con lo stesso file
      — che è la proprietà su cui sta in piedi la continuità fra le clip.*
- [x] **Le inquadrature si attaccano** — *l'ultimo fotogramma di una clip
      diventa il primo della successiva, letto dal video con una tela e
      rimandato dentro al motore. Si può spegnere.*
- [x] **Offload dove si può** — *`VAEDecodeTiled` a blocchi di 16 fotogrammi con
      4 di sovrapposizione (la decodifica è il punto in cui la memoria finisce,
      **dopo** che il lavoro sembrava fatto), la VRAM svuotata prima di
      cominciare, e una clip per volta invece che diciassette in coda. Le
      manopole del motore — `--lowvram`, `--reserve-vram` — sono già quelle
      condivise dell'hub.*
- [x] **ACE-Step 1.5 in DaProdMusica** — *fatto il 20 agosto 2026: Turbo e XL
      Turbo accanto ai due MiniMax, con nodi nativi di ComfyUI e niente da
      installare nel motore. Provato: 20 secondi di canzone in 91 s col modello
      da caricare, 28 s a caldo.*
- [x] **Il traduttore risponde alla prima** — *fatto il 20 agosto 2026, ed era
      rotto da quando c'è la barra: la prima traduzione di ogni sessione non
      rispondeva **mai** (misurato: HTTP 000 dopo 180 s la prima volta, HTTP 200
      in 0,15 s la seconda). Una riga di registro con dentro una freccia, che su
      Windows non si sa scrivere. Riparato per tutti i motori con
      `PYTHONIOENCODING`. Ed è passato al modello grande: «luce calda» non è più
      "hot light".*
- [x] **DaProdIoDigitale attaccato** — *era l'unica scheda col nome spezzato.*

### Cosa **non** è a posto, e va detto

- **Il montaggio finale non è mai stato provato su clip vere.** Il grafo è
  verificato contro `object_info` — nodi che esistono, ingressi tutti presenti,
  nessun collegamento nel vuoto — ma da «il grafo è giusto» a «esce un mp4 con
  la canzone sopra» c'è di mezzo una prova che richiede un video intero girato,
  cioè più di un'ora di scheda video. È la prima cosa da guardare.
- **Una clip da 5 secondi a 640×352 costa 256 secondi a 30 passi** (primo
  caricamento compreso) e **115 a 10 passi** (a modello caldo). Diciassette
  inquadrature sono rispettivamente un'ora e dieci, o mezz'ora. Prima di
  decidere il punto di lavoro servono le prove di tempistica, che le fa Cammo.
- **`packages/ui` non ha ancora assorbito il foglio di stile.** In quello di
  DaProdFoto c'era scritto «alla terza copia si smette», e questa è la terza.
  Non si è fatto adesso perché rifare il foglio comune mentre nasce una scheda
  vuol dire spostare tre app in un colpo per far posto alla quarta.

## 0.3.4 — Il ritocco che rifà tutto, e il traduttore che si fa vedere ✅

**Costruita il 20 agosto 2026, da provare.** Il giro dopo la 0.3.3, sullo stesso
pezzo di suite.

- [x] **Ritocco: «inverti» la selezione** — *fatto il 20 agosto 2026. Si inverte
      la trasparenza e non "dipinto sì/no", così i bordi sfumati del pennello
      restano sfumati anche dall'altra parte.*
- [x] **Ritocco: senza niente di dipinto si rifà tutta la foto** — *fatto il 20
      agosto 2026. Era un errore che rimandava indietro a pennellare, ed è
      invece il modo per cambiare luce o stagione a un'immagine intera. Il tasto
      dice quale delle due cose farà.*
- [x] **Il seed si legge** — *fatto il 20 agosto 2026: la casella era larga tre
      cifre su dieci.*
- [x] **Il traduttore compare fra i modelli in memoria** — *fatto il 20 agosto
      2026. Sta nella RAM e non nella VRAM, quindi non lo vedeva nessuno: era
      l'unico che ti faceva aspettare senza farsi vedere. I quadratini in cima
      alle app sono diventati un pezzo comune in `packages/ui` — erano in due
      copie identiche.*
- [x] **Barra di avanzamento della traduzione, e mai più piantata** — *fatto il
      20 agosto 2026. Il caricamento non blocca più il motore (misurato: 267
      risposte servite mentre traduceva, ritardo massimo sotto il millisecondo),
      ne passa una alla volta, e l'app si arrende dopo due minuti mandando
      l'originale.*

## 0.3.3 — DaProdFoto: foto migliori, e la scheda video sgombra ✅

**Pubblicata il 20 agosto 2026.** Tutto dentro DaProdFoto, salvo le
proposte che valgono anche per Musica.

- [x] **Da 30 a 50 step su Anima**, con 30 di partenza — *fatto il 20 agosto
      2026. Girava a dieci perché è un modello turbo; la scheda del modello dice
      30-50, ed è il motivo per cui le immagini venivano molli. E si chiamano
      **step**, non «passi».*
- [x] **Formato e risoluzione a pulsanti**: 16:9 / 9:16 / 4:3 / 1:1 per 480, 720
      o 1080p, con i pixel veri scritti accanto — *fatto il 20 agosto 2026. Il
      1080 diventa 1088 perché i modelli vogliono multipli di 16: prima lo
      cambiava il motore per conto suo, senza dirlo.*
- [x] **Le proposte se le scrive l'utente**: `+` per aggiungerne una, tasto
      destro per modificarla o eliminarla, titolo corto e prompt intero dentro —
      *fatto il 20 agosto 2026 in `packages/ui`, quindi vale anche per la scheda
      Immagini di DaProdMusica.*
- [x] **La memoria video si libera premendo Genera** — *fatto il 20 agosto 2026:
      via il modello di LM Studio e via quello che il motore tiene dentro e qui
      non serve. Quello che serve resta caricato: generare dieci immagini di
      fila non lo ricarica dieci volte.*
- [x] **Genera sopra la resa, e la resa in una riga** — *fatto il 20 agosto
      2026.*

## 0.3.2 — Le cose che non facevano quello che dicevano ✅

**Pubblicata il 20 agosto 2026.** Nessuna funzione nuova grossa: un
giro su quello che si è visto usando la suite davvero.

- [x] Scaricamento su **quattro connessioni insieme** — *fatto il 20 agosto 2026.
      Era il vero motivo per cui i modelli sembravano non arrivare mai: una
      connessione sola verso HuggingFace regge molto meno della linea. Misurato
      su questo PC: 3,9 → 11,8 MB/s, cioè i 7,9 GB di MiniMax da ~35 a ~11
      minuti. La ripresa regge, anche su un `.parte` lasciato dalla versione
      prima.*
- [x] Il modello scelto nell'app **arriva davvero a LM Studio** — *fatto il 20
      agosto 2026. Il ponte fra pagina e suite buttava via il campo `modello`, e
      la suite ripiegava sul consigliato: si caricava Bonsai 27B anche con un
      altro modello già acceso. I tasti non si chiamano più «Bonsai: …».*
- [x] DaProdFoto: «Genera» che dice di stare lavorando, immagini che non si
      perdono se salta il messaggio del motore, «cartella» che apre davvero
      Esplora risorse, e **«salva»** per portarne fuori una copia — *fatto il 20
      agosto 2026; «salva» è anche nei Risultati dell'hub.*
- [x] Tolto il tasto «♪ Visualizer» dalle finestre delle app — *le app si aprono
      già tutte insieme dall'hub.*

## 0.3.1 — Una cosa sola, non sette ✅

**19 agosto 2026, pubblicata.** È la versione in cui la suite
smette di essere sei programmi che si somigliano.

- [x] `packages/ui`: tema e componenti condivisi — *fatto il 19 agosto 2026. Il
      selettore del modello esisteva in due copie identiche e questa sarebbe
      stata la terza. Servito a ogni app sotto `/comune/`, dalla **sua stessa
      origine**: un host tutto suo sarebbe stato più naturale e la CSP delle
      pagine lo avrebbe bloccato.*
- [x] Profilo di memoria unico — Leggero / Bilanciato / Qualità, come il
      Lower VRAM / Lower RAM di WanGP. *Fatto il 19 agosto 2026, accanto a
      «Velocità» in fondo all'hub: `--lowvram` con un giro e mezzo di GB tenuti
      da parte, oppure `--highvram`. **Da misurare**, come la velocità.*
- [x] Pannello dei modelli in VRAM, promosso da DaProdMusica: uno per modello,
      ci clicchi e lo scarichi. *Fatto il 19 agosto 2026.*
- [x] Cartella dei risultati unica con galleria trasversale — *fatto il 16
      agosto 2026 col pannello **Risultati** dell'hub: audio, immagini e video di
      tutte le app insieme, con i filtri per app e per tipo.*

## 0.5.0 — La suite fuori dal PC

Vedi [ACCESSO-REMOTO.md](ACCESSO-REMOTO.md).

- [ ] Gateway con autenticazione davanti ai motori
- [ ] QR di accoppiamento con codice monouso
- [ ] Rete locale
- [ ] Tunnel in uscita per l'accesso da Internet, acceso a mano
- [ ] Gestione dei dispositivi: permessi separati, revoca singola

## 0.6.0 — Android

- [ ] App Android: lettore QR, credenziale nel portachiavi, notifiche, download
- [ ] Interfacce adattate allo schermo del telefono

## Chiesto e da fare, senza ancora una versione

### Il PC senza scheda video

Provata il 18 agosto 2026 su un secondo computer, solo CPU. Due cose erano
rotte e sono state corrette (vedi il changelog della 0.2.0); queste restano.

- ~~**Dire all'utente che è in CPU**~~ — fatto il 19 agosto 2026: la barra in
      alto lo dice in italiano e con le conseguenze, non con «torch non vede la
      scheda video».
- ~~**DaPMusica e FLUX.2 Klein in CPU non sono realistici**~~ — fatto il 19
      agosto 2026: Musica avvisa in cima che un brano può richiedere ore (e ti
      lascia provare), FLUX.2 Klein resta spento nel menu di Foto con scritto
      perché.
- ~~**DaPDream e DaProdIoDigitale pretendono la GPU**~~ — fatto il 19 agosto
      2026: su un computer senza scheda video non si installano nemmeno, e il
      pulsante spento dice il motivo **prima** degli otto GB.
- [ ] **Provare l'aggiornamento automatico da una versione all'altra** su quel
      PC: è la cosa per cui è stato installato ed è ancora da vedere. **Adesso
      si può**: la 0.2.0 è pubblicata, quindi da una 0.1.0 installata
      l'aggiornamento ha finalmente qualcosa da vedere.
- ~~**Il tetto `huggingface-hub<1.0` in `base.txt`**~~ — tolto il 19 agosto
      2026, e non era un dettaglio: faceva rimbalzare due librerie a ogni
      installazione finché una disinstallazione non è fallita a metà, lasciando
      l'ambiente incoerente e Musica e Foto che non si aprivano.

### L'ambiente condiviso, che è la cosa più fragile che abbiamo

- ~~**I requisiti dei servizi non sono fissati**~~ — fatto il 19 agosto 2026, e
      in un modo che copre anche quello che non avevamo scritto noi:
      `packages/runtime/requirements/versioni.txt` è un file di **vincoli**
      passato a *ogni* installazione, ComfyUI e nodi custom compresi. Erano
      proprio loro a poter portare via una libreria alle altre cinque app, cosa
      che scrivere `==` nei nostri requisiti non avrebbe impedito. E un vincolo
      non fa reinstallare niente a chi è già a posto, che era il difetto per cui
      i `==` erano stati tolti il 18.
- [x] **Un tasto "ripara"** che reinstalla i pacchetti senza cancellare niente
      — fatto il 19 agosto 2026. Nato nel pannello Spazio, spostato lo stesso
      giorno nella barra dell'ambiente in alto, che è dove uno lo cerca.
- [x] **Un tasto "controlla"** che guarda e non tocca: import veri delle
      librerie condivise, pacchetti dichiarati dalle app installate, coerenza
      delle versioni (`uv pip check`). Fatto il 19 agosto 2026, accanto a
      «Ripara».
- ~~**La suite deve accorgersene da sola**~~ — fatto il 19 agosto 2026: quando
      un motore muore parlando di librerie, la suite fa da sé gli import veri e
      il rapporto compare nella barra in alto, mentre sulla scheda spunta
      «Ripara l'ambiente» accanto a «Riprova».
- ~~**L'errore vero deve arrivare sulla scheda**~~ — fatto il 19 agosto 2026:
      il supervisore tiene da parte le ultime righe di stderr e mostra quella
      che spiega la morte, con il consiglio giusto se è un problema di librerie.


- ~~**L'hub deve aprirsi in 4:3**~~ — fatto il 18 agosto 2026: prima prendeva
  una fetta della larghezza e una dell'altezza indipendenti, quindi su un 16:9
  usciva una finestra 16:9.
- ~~**Il Visualizer apribile mentre gira un'altra app**~~ — fatto il 18 agosto
  2026. La suite lo sapeva già fare (non è un motore pesante, non passa
  dall'arbitro); quello che mancava era arrivarci senza tornare all'hub, ed è il
  tasto in basso a destra di ogni app.
- ~~**L'interfaccia di DaProdIoDigitale è in inglese**~~ — fatta il 19 agosto
  2026: la pagina, i tasti e le frasi che arrivano dal motore.

- ~~**Pulsanti veri nelle gallerie**~~ — fatto il 16 agosto 2026, e con loro il
  limite minimo della finestra sceso da 900 a 480 pixel.
- ~~**Anima anche in DaProdDream**~~ — fatto il 16 agosto 2026: nella scheda
  Sogno libero si sceglie fra SD-Turbo (tempo reale) e Anima (si scrive e si
  rifà). Da provare a lungo.
- ~~**I pulsanti Risultati / Modelli / Log devono aprire pannelli veri**~~ —
  fatto il 16 agosto 2026: tre pannelli dentro l'hub, e la cartella si apre solo
  se la chiedi.
- **Dalla webcam del telefono**: quando ci sarà l'app Android (§ 0.6.0),
  DaProdDream deve poter prendere il video del telefono come sorgente.
- ~~**Un terminale dentro ogni app**~~ — fatto il 17 agosto 2026: tasto in
  basso a destra e Ctrl+L, iniettato dalla shell, quindi una implementazione
  sola per tutte e quattro.
- **La copertina salvata su disco appena è generata**: oggi nasce come
  `PreviewImage` e vive nei temporanei, quindi sopravvive solo se la applichi a
  un brano.
- **"Mostra nella cartella" in DaProdFoto**: era segnato come guasto, ma il 16
  agosto 2026 non si è riprodotto — cinque immagini della galleria, tutte
  aperte. Da riprovare quando ricapita, con il nome del file che l'ha fatto.

## 0.7.0 — DaProdCinema: le due strade che restano

**La scheda è nata nella 0.4.0** e nella 0.4.1 ha preso i suoi modelli: LTX 2.5
e MiniMax H3, quelli decisi qui sotto. Questa sezione è quello che resta da
fare, e le prime voci sono quelle che non sono mai state provate.

- [ ] **Il montaggio finale su clip vere.** Il grafo c'è ed è verificato contro
      `object_info`, ma da «il grafo è giusto» a «esce un mp4 con la canzone
      sopra» c'è di mezzo un video intero girato — più di un'ora di scheda video.
- [ ] **Le prove di tempistica**, che le fa Cammo: quanto costa una clip a ogni
      misura e a ogni numero di passi, e da lì si decide il punto di lavoro.
- [ ] **Una clip vera, con l'uno e con l'altro.** I grafi sono verificati contro
      `/object_info`, i pesi sono nel catalogo con i byte veri, ma da lì a un mp4
      ci sono 23 GB di scaricamento e minuti di scheda video.
- [ ] **Le finestre di contesto** (`LTXVContextWindows` per LTX 2.5,
      `ContextWindowsManual` per H3) per le inquadrature lunghe: oggi una sezione
      lunga si taglia in più clip, che è anche più giusto di montaggio, ma le
      finestre servono il giorno che si vuole un piano sequenza vero.
- [ ] **Il suono che i modelli generano da soli**: tutti e due fanno video *e*
      audio, e oggi la traccia generata si butta via perché sopra ci va la
      canzone. Un giorno può servire — un'inquadratura con un rumore d'ambiente
      sotto il brano non è la stessa cosa di un'inquadratura muta.

Sotto restano le due strade come erano state pensate. **Due strade, non una.**

### Strada breve: gli effetti del Visualizer diventano video

Il Visualizer ha già undici preset WebGL che reagiscono all'audio in tempo reale.
Registrarli su un brano e salvarne un video è la via più veloce a un video
musicale: nessun modello, nessuna VRAM contesa, tempi di resa vicini al tempo
reale, e il risultato è già coerente con il brano perché *nasce* dal suo suono.

- [ ] Resa fuori schermo su un brano della libreria, a risoluzione e fps scelti
- [ ] Cambio di preset sui punti di sezione del testo (`[Verse]`, `[Chorus]`…)
- [ ] Esportazione con l'audio dentro, dritta in libreria

### Strada lunga: le clip generate

**I due modelli decisi**: **MiniMax H3** e **LTX 2.5**. Verificato il 16 agosto
2026 sul ComfyUI 0.33.1 della suite: **i nodi ci sono già nel motore per tutti e
due**, nativi e senza custom node — cinque per H3, trenta per LTX 2.5, fra cui
quelli audio (`LTXVAudioVAEDecode`, `LTXVConcatAVLatent`, `LTXVReferenceAudio`).
LTX 2.5 quindi **fa il video col suono e sa partire da un audio di
riferimento**, che per un video musicale è il verso giusto. Dettagli e nomi dei
nodi in [MODELLI-E-STRATEGIA.md](MODELLI-E-STRATEGIA.md) § 5.

Nella stessa verifica è caduto un pezzo di lavoro che era in questa lista: le
**sliding window non sono più da scrivere**, la 0.33.1 le ha
(`ContextWindowsManual`, `LTXVContextWindows`, `WanContextWindowsManual`).
Resta da scegliere finestra e overlap e da misurare cosa regge in 8 GB.

- [ ] Finestra e overlap misurati su 8 GB, con `LTXVContextWindows` per LTX 2.5
      e `ContextWindowsManual` per H3
- [x] LTX 2.5 accanto a H3, con la scelta del modello come in DaProdFoto: un
      menu, ogni modello coi propri grafi e il proprio punto di lavoro — *fatto
      nella 0.4.1*
- [x] I pesi di tutti e due nel catalogo (`manifest/models.json`), con i byte
      veri presi dal `Content-Length` e non stimati — *fatto nella 0.4.1: W4A8
      ConvRot dove esiste, e per LTX 2.5 da uno specchio senza cancello, perché
      il repo di Lightricks chiede un account e un token che la suite non ha*
- [ ] Pianificazione per sezione — la struttura arriva dai tag del testo, non da
      un'analisi del BPM che sbaglia
- [ ] DaProdUniverso applicato ai prompt
- [ ] Montaggio finale sul brano

## 1.0.0 — Pubblicabile

- [ ] Tutte le app provate a lungo su una macchina pulita
- [x] Sito vetrina su GitHub Pages — *vivo su
      [cammo22.github.io/DaProdSuite](https://cammo22.github.io/DaProdSuite/)
      dal 18 agosto 2026; la casella era rimasta vuota per distrazione.*
- [ ] Video di ogni app

---

## Più in là

**Solo CPU Intel.** Non tutte le app possono: Dream e la parte video di
IoDigitale hanno bisogno della GPU per definizione. Le altre sì, passando da
OpenVINO. Intanto ogni motore dichiara il suo `device` invece di dare CUDA per
scontato, così la strada resta aperta.

**Far girare i modelli meglio.** È il filo che tiene insieme tutto: pesi pruned,
W4A8 invece dei GGUF dove conta, VAE in FP8, decode a blocchi, generare basso e
ingrandire dopo. Su una 4060 da 8 GB non è ottimizzazione, è la differenza fra
funzionare e non funzionare.
