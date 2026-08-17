# Cosa è cambiato

Le cose come sono andate, dalla più recente. Le versioni salgono **solo quando si
pubblica** ([come si lavora](docs/COME-SI-LAVORA.md) § 2): quello che è stato
fatto e provato ma non ancora pubblicato sta sotto **Non ancora pubblicato**, e
scende sotto un numero il giorno che esce una release.

Ogni voce dice cosa cambia **per chi usa la suite**. I dettagli di come è fatta
stanno in [docs/RIPRENDERE-DA-QUI.md](docs/RIPRENDERE-DA-QUI.md).

---

## Non ancora pubblicato

### Risultati, Modelli e Log: tre pannelli, non tre finestre di Windows

- I tre pulsanti in fondo all'hub aprivano Esplora risorse **dietro** la suite:
  da davanti sembrava che non facessero niente. Adesso aprono tre pannelli
  dentro la suite. La cartella si apre ancora, ma solo se la chiedi.
- **Risultati** è la galleria di tutte le app insieme — audio, immagini e video
  — con l'anteprima, chi l'ha prodotto, quando e quanto pesa. Si filtra per app
  e per tipo, e da lì si apre la cartella o si elimina.
- **Modelli** dice cosa c'è sul disco, quanto pesa e a quali schede serve.
  Quello che manca ha il suo tasto per scaricarlo, con l'avanzamento lì dentro.
- **Log** mostra le ultime trecento righe di ogni motore e si rilegge da solo
  ogni due secondi: un motore che parte lo si guarda partire, senza uscire
  dalla suite e senza aprire un file.

### Le copertine di DaPMusica non falliscono più in silenzio

- DaPMusica fa le copertine e la scheda Immagini con **Anima**, ma nel catalogo
  Anima risultava roba di DaPFoto e basta: chi installava solo la musica si
  trovava una copertina che moriva con un errore del motore in inglese.
- Adesso, se Anima non c'è, **"Genera" resta spento e ti dice come prenderla** —
  come già faceva la scelta della qualità del suono. Chi ha DaPFoto o DaPDream
  installate non deve scaricare niente: sono gli stessi file.


### Anima anche in DaPDream: si scrive e il sogno si rifà

- Nella scheda **Sogno libero** adesso si sceglie **con che cosa sognare**:
  SD-Turbo com'era, in tempo reale, oppure **Anima** — la stessa che fa le
  immagini in DaPFoto e le copertine in DaPMusica.
- Con Anima non c'è il tempo reale e non serve: **scrivi, e un secondo dopo che
  ti fermi l'immagine si rifà**. Più bella, un'immagine per volta.
- Non c'è niente da scaricare se hai già DaPFoto o DaPMusica: sono gli stessi
  5,6 GB.
- I comandi che valgono solo per il tempo reale spariscono, invece di restare lì
  a promettere cursori che non fanno niente. E l'italiano lo traduce da sé,
  facendoti vedere cosa è arrivato davvero al modello.
- Passando ad Anima la scheda video si libera da sola, e tornando a SD-Turbo si
  ricarica: non devi pensarci tu.

### Nelle gallerie i pulsanti sono pulsanti

- In **DaPFoto** e **DaPMusica** le azioni di ogni scheda — ritocca, nella
  cartella, elimina — erano scritte in grigio e sembravano didascalie. Adesso
  sono pulsanti veri, e chi cancella si riconosce anche da fermo.
- **La finestra si può stringere**: prima non scendeva sotto i 900 pixel, adesso
  arriva a 480 e resta usabile — schede in alto su una riga loro, pulsanti che
  vanno a capo restando della stessa misura. Serve a tenere l'app accostata a
  metà schermo mentre lavori con qualcos'altro.

### Tolto il tasto "a Musica" dalla galleria di DaPFoto

- Diceva "mandata" e non mandava niente: DaPMusica sa usare un'immagine come
  copertina solo se in Libreria hai già scelto un brano, e senza non succedeva
  nulla. Meglio niente che un tasto che mente. Torna quando DaPMusica saprà
  chiedere **su quale brano** metterla.
- E quando un'app ne nomina un'altra adesso si scrive corto: *apri in
  DaPVisualizer*, *quando DaPMusica ne produce uno*.


### Bonsai: il modello che scrive, in DaProdMusica

- **"Bonsai: fai tutto"**: scrivi in una riga di cosa deve parlare la canzone e
  ti riempie titolo, stile, testo con i tag di sezione e la descrizione della
  copertina. Poi premi Crea e basta.
- **"Bonsai: finisci quello che ho scritto"**: parte da quello che hai abbozzato
  e lo completa restando dentro il tuo.
- Il modello lo tiene acceso **LM Studio** (consigliato `prism-ml/bonsai-27b`,
  caricato con 64K di contesto). Se non è acceso, l'app lo dice invece di
  lasciarti premere un bottone che non fa niente.
- È **uno per tutta la suite**: la stessa strada la useranno Foto e Cinema.

### DaProdDream: i modelli si vedono e si scaricano da lì

- Come nelle altre app: se SD-Turbo o la VAE veloce mancano, compare un riquadro
  che lo dice e li scarica. Prima il motore ci provava, falliva, e restava lì.

### DaProdDream è entrato nella suite

- **La quarta app è dentro**: webcam, schermo, video o una foto trasformati in
  tempo reale, con SD-Turbo. Si apre dall'hub come le altre, e il motore lo
  accende e lo spegne la suite.
- **Niente più installazione a parte**: i suoi 2,6 GB di modelli si scaricano
  come quelli di tutte, nella cartella condivisa, e le sue librerie Python
  entrano nell'ambiente comune.
- Le schermate e le registrazioni finiscono **in libreria**, quindi si possono
  mandare a DaProdFoto per il ritocco senza salvare, cercare e riaprire.

### La prima volta, la suite ti prende per mano

- **Al primo avvio compare una schermata che chiede cosa vuoi**: le app
  disponibili, quanto pesa ognuna, e il conto in fondo. Scegli, premi installa, e
  le scarica **una dopo l'altra** mentre tu fai altro.
- **Compare solo se c'è davvero qualcosa da installare**, e una volta sola: chi
  la salta ha deciso. Per rivederla c'è `#guida` nell'indirizzo, oppure si
  azzerano le impostazioni dal pannello Spazio.
- I numeri sono quelli veri: i 5 GB di Python e motore si contano solo se
  mancano davvero, e un'app già a posto dice "già installata" invece di un peso
  inventato.

### DaProdFoto: tre modelli, e il ritocco che si usa davvero

- **Il modello si sceglie in alto**, fuori dalle schede: vale per Crea *e* per
  Ritocco, e si vede sempre con cosa stai lavorando.
- **FLUX.2 Klein adesso sono due**: il **4B** (5,9 GB in tutto, comodo su 8 GB di
  VRAM) e il **9B** (11,2 GB, più bravo con le descrizioni lunghe). Ognuno si
  porta il proprio text encoder — scambiarli non fa un'immagine brutta, fa
  fallire la generazione.
- **Nel Ritocco ci sono le ultime cinque immagini**: un clic e sono sulla tela,
  senza passare dalla Galleria.
- **"Ritocca questa" dentro l'immagine a schermo intero.** Prima, dopo aver
  guardato una foto grande, il clic su "ritocca" chiudeva soltanto la lente e
  sembrava che il ritocco fosse rotto.
- **Se un'immagine non si apre nel ritocco adesso lo dice**, invece di non fare
  niente.
- **L'estetica non si attacca più di nascosto al prompt.** Si parte da
  "nessuna", e se ne scegli una il menu **te la scrive nella casella**: la vedi,
  la cambi, la togli. Prima ogni immagine partiva con le stesse dieci parole
  incollate in fondo, e si somigliavano tutte senza che si capisse perché.

### DaProdMusica

- **La copertina torna a farsi per prima.** Venti secondi contro dieci minuti:
  la vedi subito, mentre la canzone lavora.
- **Cliccando un brano parte quel brano.** Capitava di sentirne uno vecchio
  finché non se ne cliccava un altro: il lettore riconosceva la posizione
  nell'elenco, e l'elenco si riordina ogni volta che nasce una canzone.
- **Qualità del suono, con due scelte**: quella di prima (4 bit) e **quella
  consigliata da WanGP** (int8 ConvRot, 2,5 GB). È il modello che trasforma la
  struttura in suono, ed è l'unico dei tre che su 8 GB si può migliorare — il
  text encoder in int8 pesa 8,6 GB e non ci sta.

### Con FLUX non si traduce più, e la casella è una sola

- **Scegliendo un FLUX la traduzione sparisce.** Il suo lettore di descrizioni è
  un Qwen3 e l'italiano lo capisce da sé: tradurre prima era un passaggio in più
  che poteva solo andare storto — ed è quello che faceva restare fermo il
  ritocco. Con Anima resta, perché lei l'inglese lo pretende davvero.
- **Una casella "traduci" invece di due**, in cima accanto al modello, valida
  per Crea e Ritocco. Erano due da tenere allineate a mano.

### Aggiustato, e stavolta provato aprendo l'app

- **Il Visualizer riproduce i brani di DaProdMusica.** Diceva "formato non
  supportato" su file che erano perfetti.
- **Nel ritocco le immagini si aprono.** Dava "Failed to fetch" e restava lì.
- Erano **lo stesso difetto**: alla strada con cui le app leggono i file del
  disco mancava il permesso di essere usata da una pagina di un'altra parte
  della suite. Le miniature si vedevano lo stesso, ed è per questo che
  sembravano due cose diverse.
- **FLUX.2 Klein 4B genera.** Gli mancava il suo text encoder — voleva Qwen3-4B,
  non quello del 9B.
- **Gli errori dell'interfaccia adesso finiscono in un log** (`logs/foto-pagina.log`
  e compagni): prima un pezzo che si rompeva si vedeva solo come un bottone che
  non faceva niente.

### Più veloce

- **Flash Attention 2 e Triton sono installati** e il motore li usa: nel log ora
  c'è "Using Flash Attention" al posto dell'attenzione di serie.
- **"Spinta" non tocca più la memoria video dinamica**, che era la cosa che
  faceva fallire le generazioni. Adesso accende accumulazione fp16, cublas e
  Flash Attention: tutta roba che si può tenere.

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
