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
- [ ] **Pannello LM Studio nella suite**: quali modelli ci sono, caricarli e
      scaricarli al volo, e il contesto con tre pulsanti — 64K, 128K, 256K.
      L'obiettivo resta far stare domanda e risposta **dentro i 64K**, che è
      dove va veloce
- [ ] **DaProdFoto**: da due parole a una descrizione che il modello capisce
- [ ] **DaProdCinema**: una chat dove butti l'idea e le foto, e ne esce un
      piccolo video da montare

## 0.2.0 — Le altre tre

- [x] **DaProdDream** — trasformazione in tempo reale *(dentro: motore avviato
      dal supervisore, SD-Turbo e TAESD dalla cartella condivisa, finestra della
      suite. Provato fino al modello caricato — la webcam la giudichi tu)*
- [ ] **DaProdCompanion** — memoria e sogni; va aggiunto `sqlite_vec` al suo pyproject
- [ ] **DaProd IoDigitale** — l'avatar parlante, ex LeapTalk

## 0.3.0 — Le schede diventano vetrina

- [x] **Disinstalla per scheda**: ogni scheda dice quanto occupa e si toglie da
      sola, riprendendosi i GB. I modelli che servono anche a un'altra scheda
      installata restano. *Arrivata in anticipo, col pannello Spazio.*
- [ ] **Anteprima al passaggio del mouse**: un video corto che mostra cosa sa
      fare quell'app, generato con l'app stessa.

## 0.3.1 — Una cosa sola, non sette

- [ ] `packages/ui`: colori, tipografia e componenti condivisi
- [ ] Profilo di memoria unico — Leggero / Bilanciato / Qualità, come il
      Lower VRAM / Lower RAM di WanGP
- [ ] Pannello dei modelli in VRAM, promosso da DaProdMusica: uno per modello,
      ci clicchi e lo scarichi
- [ ] Cartella dei risultati unica con galleria trasversale

## 0.4.0 — La suite fuori dal PC

Vedi [ACCESSO-REMOTO.md](ACCESSO-REMOTO.md).

- [ ] Gateway con autenticazione davanti ai motori
- [ ] QR di accoppiamento con codice monouso
- [ ] Rete locale
- [ ] Tunnel in uscita per l'accesso da Internet, acceso a mano
- [ ] Gestione dei dispositivi: permessi separati, revoca singola

## 0.5.0 — Android

- [ ] App Android: lettore QR, credenziale nel portachiavi, notifiche, download
- [ ] Interfacce adattate allo schermo del telefono

## Chiesto e da fare, senza ancora una versione

- ~~**Pulsanti veri nelle gallerie**~~ — fatto il 16 agosto 2026, e con loro il
  limite minimo della finestra sceso da 900 a 480 pixel.
- ~~**Anima anche in DaProdDream**~~ — fatto il 16 agosto 2026: nella scheda
  Sogno libero si sceglie fra SD-Turbo (tempo reale) e Anima (si scrive e si
  rifà). Da provare a lungo.
- **Dalla webcam del telefono**: quando ci sarà l'app Android (§ 0.5.0),
  DaProdDream deve poter prendere il video del telefono come sorgente.

## 0.6.0 — DaProdCinema

La settima app: da una canzone al suo video musicale. **Due strade, non una.**

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
- [ ] LTX 2.5 accanto a H3, con la scelta del modello come in DaProdFoto: un
      menu, ogni modello coi propri grafi e il proprio punto di lavoro
- [ ] I pesi di tutti e due nel catalogo (`manifest/models.json`), con i byte
      veri presi dal `Content-Length` e non stimati
- [ ] Pianificazione per sezione — la struttura arriva dai tag del testo, non da
      un'analisi del BPM che sbaglia
- [ ] DaProdUniverso applicato ai prompt
- [ ] Montaggio finale sul brano

## 1.0.0 — Pubblicabile

- [ ] Tutte le app provate a lungo su una macchina pulita
- [ ] Sito vetrina su GitHub Pages
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
