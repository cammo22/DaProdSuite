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

## 0.1.0 — Le prime app dentro

Nell'ordine, dalla più semplice alla più delicata. Le prime due sono dentro e
girano: la spunta arriva quando le hai provate a lungo tu.

- [ ] **DaProdVisualizer** — nessun Python, valida lo schema delle finestre
      *(dentro, da provare)*
- [ ] **DaProdMusica** — primo motore su ComfyUI condiviso *(dentro, un brano
      vero generato; con lei sono entrati il supervisore collegato, la libreria
      che sa scrivere e lo schema `daprod://` per le app senza impacchettatore)*
- [ ] **DaProdFoto** — Anima di base, FLUX.2 Klein come extra *(dentro tutte e
      due: si sceglie il modello dal menu, e FLUX.2 si scarica da lì — 11,2 GB
      più il nodo ComfyUI-GGUF, che adesso la suite sa installare da sola. Da
      provare a lungo, ritocco compreso)*
- [x] **ComfyUI scaricato quando serve** — la versione è fissata (0.33.1), lo zip
      arriva da GitHub e le sue librerie entrano nell'ambiente condiviso senza
      toccare torch. Era l'ultimo pezzo che mancava a "git clone deve bastare"
- [x] **Il motore si aggiorna quando lo decidiamo noi** — la versione resta
      scritta accanto al motore, così una correzione arriva anche a chi ce l'ha
      già. I nodi custom di ComfyUI si installano allo stesso modo
- [x] Scaricamento dei modelli con ripresa e avanzamento — *(provato: annullato a
      metà, ripreso, arrivato intero; da provare tu su una scheda intera)*
- [ ] Procedura guidata al primo avvio: scegli le app, ti dice quanti GB

## 0.2.0 — Le altre tre

- [ ] **DaProdDream** — trasformazione in tempo reale
- [ ] **DaProdCompanion** — memoria e sogni; va aggiunto `sqlite_vec` al suo pyproject
- [ ] **DaProd IoDigitale** — l'avatar parlante, ex LeapTalk

## 0.3.0 — Le schede diventano vetrina

- [ ] **Disinstalla per scheda**: ogni scheda dice quanto occupa e si toglie da
      sola, riprendendosi i GB. I modelli che servono anche a un'altra scheda
      installata restano.
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

- [ ] Sliding window e overlap sopra i nodi MiniMax H3 di ComfyUI
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
