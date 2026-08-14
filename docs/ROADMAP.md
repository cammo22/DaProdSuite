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

Nell'ordine, dalla più semplice alla più delicata.

- [ ] **DaProdVisualizer** — nessun Python, valida lo schema delle finestre
- [ ] **DaProdMusica** — primo motore su ComfyUI condiviso
- [ ] **DaProdFoto** — Anima di base, FLUX.2 Klein come extra
- [ ] Scaricamento dei modelli con ripresa e avanzamento
- [ ] Procedura guidata al primo avvio: scegli le app, ti dice quanti GB

## 0.2.0 — Le altre tre

- [ ] **DaProdDream** — trasformazione in tempo reale
- [ ] **DaProdCompanion** — memoria e sogni; va aggiunto `sqlite_vec` al suo pyproject
- [ ] **DaProd IoDigitale** — l'avatar parlante, ex LeapTalk

## 0.3.0 — Una cosa sola, non sette

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

La settima app: da una canzone al suo video musicale.

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
