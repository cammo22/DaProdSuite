# Cosa è cambiato

Le cose come sono andate, dalla più recente. Le versioni salgono **solo quando si
pubblica** ([come si lavora](docs/COME-SI-LAVORA.md) § 2): quello che è stato
fatto e provato ma non ancora pubblicato sta sotto **Non ancora pubblicato**, e
scende sotto un numero il giorno che esce una release.

Ogni voce dice cosa cambia **per chi usa la suite**. I dettagli di come è fatta
stanno in [docs/RIPRENDERE-DA-QUI.md](docs/RIPRENDERE-DA-QUI.md).

---

## Non ancora pubblicato

Niente, per ora: tutto quello che c'era è uscito nella 0.1.0.

---

## 0.1.0 — Tre app dentro, e la suite si installa da sola

*16 agosto 2026 — la prima versione pubblicata.*

### Aggiustato: la copertina che non si vedeva

- **La copertina generata insieme al brano non arrivava mai sul brano.** Veniva
  disegnata davvero — il motore ci metteva dieci secondi — e poi buttata via.
  Era nata mettendo la copertina *dopo* il brano per non contendergli la memoria
  video: quando finiva, il brano era già in libreria e nessuno se la prendeva
  più. Adesso lo ritrova.

### Velocità: normale o spinta

- **In fondo all'hub c'è un interruttore.** "Spinta" accende le tre cose che il
  motore sa fare e non stavamo usando, prima fra tutte la memoria video dinamica:
  è quella che riporta i CUDA graph sulla parte lenta della musica, dove se ne va
  il **76%** del tempo di un brano. Vale dal prossimo avvio di un'app.
- Non è una promessa, è una prova: se un brano muore o va più piano, si rimette
  "normale". Quello che si sa e quello che si è solo misurato sta in
  [docs/VELOCITA-MUSICA.md](docs/VELOCITA-MUSICA.md).

### In DaProdFoto si sceglie il modello

- **Due modelli, non uno.** Sopra "Estetica" c'è un menu: **Anima**, veloce e già
  sul disco, e **FLUX.2 Klein**, che capisce descrizioni lunghe e articolate.
  Vale sia per generare che per il ritocco.
- **Se il modello non ce l'hai, lo scarichi da lì.** Il riquadro dice cosa manca
  e quanto pesa (11,2 GB per FLUX.2), lo scarica con la sua barra e si può
  annullare a metà: quello che è arrivato resta. Fino ad allora **Genera** è
  spento, invece di far partire un lavoro che darebbe solo un errore del motore.
- **I nodi che mancano al motore se li prende la suite.** FLUX.2 in GGUF vuole un
  pezzo di ComfyUI che di suo non c'è: adesso arriva da solo insieme ai pesi, e
  il motore riparte da sé per caricarlo. Prima era l'unica cosa che si doveva
  ancora mettere a mano.
- I cursori si spostano da soli sul punto di lavoro del modello scelto — dieci
  passi per Anima, venti per FLUX.2 — perché non sono lo stesso numero regolato
  diversamente.

### Aggiustato: il brano che moriva a metà

- **Era un difetto del motore, e ora è corretto alla fonte.** L'errore
  `'RVQDepthDecoder' object has no attribute '_v_block'` che ammazzava i brani
  veniva da ComfyUI 0.33.0, e capitava proprio nel modo in cui la suite avvia il
  motore. La versione 0.33.1 lo corregge; la suite adesso **si accorge di avere
  un motore vecchio** e lo aggiorna premendo Installa sulla scheda.
- Da qui in poi una correzione del motore arriva anche a chi ce l'ha già
  installato: prima la versione fissata valeva solo per chi installava da zero.
- **Una scheda non dice più "Pronta" se il motore manca.** Prima si premeva Apri
  e si aspettavano tre minuti perché fallisse da solo.
- **L'installazione non si ferma più in fondo per colpa dell'antivirus.**
  Aggiornando i pacchetti Python capitava un errore incomprensibile (`uv è uscito
  con codice 2`) causato da file di cache trattenuti: adesso vengono sgombrati e
  l'installazione prosegue.

### Si scarica tutto da solo

- **"Installa" su una scheda adesso installa davvero.** Prende l'ambiente Python
  se manca, il motore se l'app ne guida uno, e i modelli che le servono. Prima
  bisognava avere già trenta GB di pesi sul disco: la suite funzionava su un
  computer solo.
- **Se cade la rete non si ricomincia.** Ogni file riprende da dove si era
  fermato, e lo stesso vale se sei tu ad annullare: il bottone diventa
  **Annulla**, e quello che è già arrivato resta sul disco.
- **La barra conta in byte, non in file.** Un'app con un modello da 5,9 GB e due
  da 200 MB non resta ferma a "1 di 3" per venti minuti.
- Il motore si installa da una versione **fissata** e provata, non dall'ultimo
  commit apparso stanotte.

### Si scrive in italiano

- **Le descrizioni si traducono in inglese prima di generare.** I modelli di
  immagini capiscono l'inglese: una descrizione in italiano non dava un errore,
  dava un'immagine che non c'entrava niente — il difetto che sembrava «genera
  quello che vuole». Adesso sotto la casella si vede **cosa è stato mandato
  davvero**, così quando l'immagine non è quella che avevi in testa si sa a quale
  parola dare la colpa.
- Si può spegnere con un interruttore, per chi scrive già in inglese. Un testo
  inglese passa comunque intatto.
- Il traduttore pesa 332 MB, gira in CPU in un decimo di secondo e **non toglie
  VRAM** al modello che deve fare il lavoro vero.

### Aggiustato

- **DaProdMusica moriva a metà brano**, a volte dopo pochi secondi, a volte dopo
  quattro minuti di lavoro buttato. Adesso il brano parte per primo, con la
  memoria video svuotata prima, e la copertina va in coda dietro — ma la causa
  vera era un difetto del motore, corretto passando alla sua versione 0.33.1
  (vedi qui sopra).
- **Il ritocco di DaProdFoto non mostrava il risultato** dove stavi lavorando:
  compariva nella scheda Crea e in galleria. Adesso prende il posto
  dell'originale sulla tela, e ci si può dipingere sopra un'altra volta.

- **DaProdFoto: il ritocco non riusciva ad aprire nessuna immagine.** Né dal
  disco né dalla galleria, e senza dire perché. Era una regola di sicurezza della
  pagina che impediva di *rileggere* il file dopo averlo scelto.
- **Trascinare un'immagine dentro DaProdFoto** ora la apre nel ritocco, da
  qualunque scheda ti trovi.
- Nel catalogo tre modelli avevano il peso arrotondato. Siccome è confrontando i
  byte che si riconosce uno scaricamento finito da uno interrotto, quei tre
  sarebbero risultati mancanti per sempre anche dopo averli scaricati bene.
- SD-Turbo dichiarava 2,6 GB ma il suo archivio ne pesa 13: conteneva tre volte
  lo stesso modello. Adesso si scarica solo la versione che serve.
- I numeri dell'interfaccia si scrivono con la virgola: `3,40 GB`, non `3.40 GB`.

---

## 0.0.1 — Le fondamenta

*Mai pubblicata: è rimasta sul PC.* Non c'era ancora un'app dentro la suite, ma
c'era tutto quello che serve per metterle.

- Guscio Electron con l'hub, sette schede, lo stato di ognuna
- Arbitro della GPU: un solo motore pesante alla volta sugli 8 GB
- Supervisore dei processi: avvio, controllo di salute, riavvio, spegnimento
- Installer e aggiornamento automatico
- **Ambiente Python unico**: da quattro installazioni e 14,7 GB a una da 4,05
- Dati separati dal programma: aggiornare la suite non tocca i tuoi modelli né i
  tuoi risultati
