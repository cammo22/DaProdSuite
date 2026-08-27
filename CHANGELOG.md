# Cosa è cambiato

Le cose come sono andate, dalla più recente. Le versioni salgono **solo quando si
pubblica** ([come si lavora](docs/COME-SI-LAVORA.md) § 2): quello che è stato
fatto e provato ma non ancora pubblicato sta sotto **Non ancora pubblicato**, e
scende sotto un numero il giorno che esce una release.

Ogni voce dice cosa cambia **per chi usa la suite**. I dettagli di come è fatta
stanno in [docs/RIPRENDERE-DA-QUI.md](docs/RIPRENDERE-DA-QUI.md).

---

## Non ancora pubblicato

Niente: la 0.8.2 è appena uscita.

---

## 0.8.2 — La faccia giusta

**27 agosto 2026.** Una cosa sola:

> «Ci sono ancora problemi con le immagini di profilo, non vengono aggiornate
> bene.»

La 0.8.1 aveva chiesto al browser di non tenersi la foto vecchia. Non è bastato,
e il motivo si vede solo guardando **come** la suite disegna una faccia.

### Chiedere per favore non funziona

Le facce non sono immagini: sono uno **sfondo** — una regola di stile che dice
«qui dentro metti quel disegno lì». E un browser, per uno sfondo il cui
indirizzo non è cambiato, riusa quello che ha già in memoria **senza andare a
chiedere se è cambiato**. La cortesia della 0.8.1 valeva per le richieste che
partono; quella non partiva proprio.

Con l'indirizzo fisso `/io/foto/<persona>`, una foto nuova non aveva nessun modo
di farsi notare. Su una schermata funzionava — quella del profilo, che si
aggiungeva un pezzo di indirizzo con l'orologio — e su tutte le altre no: la
bacheca, l'elenco delle persone, il tondino in alto a destra.

**Adesso l'indirizzo dice quale foto è**, non solo di chi. Il nome del file sul
disco cambia a ogni caricamento, e quel nome viaggia dentro l'indirizzo ridotto
a poche lettere: foto diversa, indirizzo diverso, e al browser non resta niente
da riusare. Non è una preghiera, è un fatto.

E siccome adesso l'indirizzo è onesto, chi ce l'ha può anche tenerselo: la
faccia in bacheca torna a comparire senza chiedere niente, e cambiarla la fa
cambiare **dappertutto e subito** — la bacheca, i commenti, le persone, il
tondino, il profilo.

### Due cose che si sono viste per strada

**Chi non ha una foto adesso ha le sue iniziali.** Prima la pagina si costruiva
l'indirizzo della faccia per chiunque avesse un nome, foto o no: quella
richiesta non trovava niente, lo sfondo restava vuoto, e le iniziali erano già
state cancellate per fargli posto. Un tondino colorato e basta. Adesso
l'indirizzo lo manda il computer solo a chi una foto ce l'ha davvero, e se per
qualunque motivo non arriva, le iniziali tornano.

**L'elenco delle persone non riceveva la faccia.** Se la costruiva da sé
partendo dal nome della persona — che è esattamente il modo in cui la versione
si perdeva per strada. Adesso arriva già fatta da chi la conosce.

### ⚠ Cosa è provato, e cosa no

Questa volta il giro è stato fatto per intero, in un browser vero, con foto
vere.

| Cosa | Come sta |
|---|---|
| Cambiare foto dalla pagina | **provato davvero**: scelta una foto blu dal foglio del profilo, e nello stesso momento le facce sono diventate blu — l'indirizzo nuovo e i pixel nuovi, controllati uno per uno |
| La foto che cambia due volte | **provata**: rossa, poi verde, poi blu. Tre indirizzi diversi, tre immagini diverse, nessuna che si trascina dietro la precedente |
| L'elenco delle persone | **provato**: dopo il cambio mostra la faccia nuova, senza ricaricare la pagina |
| Le iniziali quando la foto non c'è | **provate**: una foto rotta apposta lascia le iniziali invece del tondino vuoto |
| Le facce in bacheca e sotto ai commenti | il campo arriva dal computer ed è lo stesso di tutti gli altri; **con due persone vere non è stato provato** |
| Dal telefono | la pagina è la stessa e l'indirizzo pure; **il giro con l'app in mano no** |

---

## 0.8.1 — Il fotogramma, la foto, e le parole sotto

**27 agosto 2026.** Due difetti che la 0.8.0 non aveva chiuso davvero — e stavolta
c'è il numero esatto di quanto è durato il primo — più la cosa che mancava a
DaProd per essere un posto dove si sta.

### Le anteprime dei video: la causa vera, finalmente

> «Continua ad esserci il problema della thumbnail dei video che non funziona.»

Aveva ragione. La 0.8.0 aveva chiuso quattro cause, e i video vecchi in effetti
si erano presi la loro copertina. Ma **quelli nuovi no**, e il motivo era una
quinta causa — quella che stava sotto a tutte le altre.

Il fotogramma lo estrae FFmpeg, e la suite gli faceva scrivere il risultato su
un file di passaggio chiamato `<qualcosa>.jpg.part`, per rinominarlo solo a fine
riuscita. È una cautela giusta e una scelta di nome sbagliata: **FFmpeg decide
in che formato scrivere guardando l'estensione del file**, e `.part` non è un
formato. Rispondeva:

```
Unable to choose an output format for '….jpg.part';
use a standard extension for the filename or specify the format manually
```

cioè un errore chiarissimo — che finiva su uno `stderr` che nessuno leggeva. La
funzione guardava solo il codice di uscita, tornava «non ce l'ho fatta», e sopra
a quel «non ce l'ho fatta» c'era un rettangolo nero senza spiegazioni.

**Quanto è durato**, misurato sul PC di casa prima di toccare niente: il
registro dei processi contava **1269 esecuzioni di FFmpeg per le anteprime**, e
la cartella dove finivano era **vuota dal giorno in cui era stata creata**. Non
una che sia andata a buon fine.

Tre cose cambiano insieme:

- **il nome di passaggio finisce in `.jpg`**, e il formato si dichiara anche a
  voce (`-f mjpeg`): due cinture, così non dipende più da come si chiama il file;
- **il fotogramma si scrive accanto al video**, come un `.cover.jpg` — che è la
  convenzione che tutta la suite già legge: la galleria lo usa come poster senza
  chiedere niente a nessuno, lo specchio del telefono se lo porta dietro, e
  rinominare o cancellare il video se lo porta appresso. Prima finiva in una
  cache che conosceva solo lui;
- **quando FFmpeg si lamenta, adesso lo si scrive.** È la lezione vera di questo
  difetto: un processo che fallisce in silenzio è un difetto che non si trova.

Lo stesso identico sbaglio, con lo stesso `.part`, teneva rotta anche **la
conversione audio del Visualizer**: i formati che il computer non sa leggere da
solo — WMA, AIFF, APE — non si sono mai sentiti, pur avendo FFmpeg installato.
Corretto insieme.

### La foto del profilo che restava quella vecchia

> «Ora carica la foto profilo ma se la provo a cambiare con una nuova rimane
> sempre la vecchia.»

La foto nuova arrivava, si salvava, la vecchia veniva buttata: dal lato del
computer era tutto a posto. A restare indietro era il **browser**.

La foto del profilo è l'unica cosa della suite che vive a un indirizzo fisso —
`/io/foto/<persona>` — e cambia contenuto. Tutto il resto no: un file della
libreria ha il suo nome dentro l'indirizzo, quindi un contenuto diverso è un
indirizzo diverso, e tenerselo in memoria un giorno intero è la cosa giusta. La
foto si portava dietro la stessa regola, e voleva dire **ventiquattr'ore con la
faccia di prima** — su ogni schermata tranne quella in cui l'avevi appena messa.

Adesso quell'indirizzo dice «chiedi se è cambiata» invece di «tienila». Non
costa: la risposta a una foto ferma è un pacchetto da poche decine di byte, e la
faccia in bacheca resta immediata come prima.

Insieme, una seconda cosa che si vedeva solo usandola: la foto veniva dichiarata
`image/*`, che non è un tipo ma una famiglia, e le regole di sicurezza della
pagina vietano al browser di indovinare. Adesso dice se è un JPEG o un PNG.

### Si può commentare

> «Facciamo un modo di poter anche commentare i contenuti.»

Sotto a ogni cosa in **DaProd** c'è un fumetto con quanti commenti ha. Si tocca
e si apre lì sotto — non in un foglio a parte: un commento appartiene a quello
che sta sopra, e portarlo altrove vorrebbe dire perdere di vista la cosa di cui
si sta parlando.

- **si scrive e si manda con Invio.** Maiusc+Invio va a capo, e la casella
  cresce mentre scrivi come quelle della Produzione;
- **si può togliere**, e lo possono fare in due: chi l'ha scritto, e **chi ha
  fatto la cosa**. Il secondo conta quanto il primo — se non puoi togliere
  quello che ti scrivono sotto, in bacheca smetti di metterci roba;
- **chi ha fatto la cosa riceve un avviso** sul telefono. Senza, scopriresti che
  ti hanno scritto solo tornando a guardare, cioè quasi mai;
- **si vede solo quello che si può vedere**: si commenta le proprie cose e
  quelle che qualcuno ha messo in bacheca, e basta. Stessa regola del file e
  dell'anteprima.

Il nome di chi scrive resta scritto **dentro** il commento: chi si scollega
sparisce dall'elenco dei dispositivi, e senza quel nome il suo commento
diventerebbe di «qualcuno» il giorno dopo.

I commenti stanno nel `.json` accanto al file, come i mi piace e come l'autore:
niente secondo elenco da tenere allineato, e una cosa spostata a mano si porta
dietro quello che le hanno detto sotto.

### ⚠ Cosa è provato, e cosa no

| Cosa | Come sta |
|---|---|
| Il fotogramma di un video vero | **provato sul serio**: il codice vero della suite, il video vero che ieri non aveva copertina, un JPEG da 33 KB scritto accanto al file. Un solo FFmpeg, non 1269 |
| La causa (`.part`) | **riprodotta a mano** prima e dopo: con `.part` FFmpeg rifiuta, con `.jpg` e `-f mjpeg` scrive |
| La conversione audio del Visualizer | corretta **per analogia**, stessa riga e stesso sbaglio; **non provata su un WMA vero** |
| La cache della foto del profilo | la vecchia risposta è stata **letta dal gateway acceso** (`max-age=86400`, `image/*`); la nuova compila, **il giro vero col telefono no** |
| I commenti | **provati nel banco della console**: si leggono, se ne scrive uno, il conto sale, se ne toglie uno e il conto scende. A 1280 px e a 375 px |
| I commenti nella libreria vera | il codice che li scrive nel `.json` **non è ancora girato contro file veri** |
| L'avviso di un commento sul telefono | l'APK compila e si firma; **il tocco vero no** |

---

## 0.8.0 — Le cose lasciate indietro

**27 agosto 2026.** Nessuna funzione nuova, e non è una release piccola: sono
**sette cose che non funzionavano** e che erano state rimandate, una dietro
l'altra, mentre si costruiva il resto. Detto così:

> «Facciamo una release che si concentra a fixare tutte le cose trascurate
> durante lo sviluppo.»

Sono tutte cose che si vedono usandola, e nessuna aveva un messaggio d'errore:
un riquadro nero al posto di un fotogramma, un tasto che non fa niente, una
notifica che arriva quaranta minuti dopo. Difetti che non si trovano nel log —
si trovano usando il programma e restando delusi.

### I video hanno la loro anteprima. Per davvero, stavolta

> «Se riesci risolvi il problema dell'immagine di anteprima dei video che non
> funziona.»

È la quarta volta che questa riga compare in un changelog, e le prime tre erano
correzioni vere che curavano cose vere. Il difetto restava perché **le cause
erano quattro**, e ogni volta se ne chiudeva una.

**1. Nella Galleria di DaProdCinema il fotogramma non veniva chiesto a nessuno.**
Il riquadro era un `<video preload="metadata">`, e `metadata` fa esattamente
quello che dice: legge *quanto dura* e *quanto è grande*, e non decodifica
niente. Un video che non ha decodificato niente e non ha un poster è un
rettangolo nero. La copertina intanto c'era, lì accanto, e non la guardava
nessuno.

**2. La copertina si perdeva nella rinomina — e succedeva a ogni video chiesto
dal telefono.** Il motore scrive `clip_00042_.mp4`; la scheda comincia a
fargli la copertina, che sono qualche secondo di scaricamento e decodifica; nel
frattempo la suite dà al file il nome di quello che era stato chiesto. Quando la
copertina è pronta chiede di essere messa accanto a un file che non esiste più,
la libreria risponde «non c'è», e nessuno se ne accorge. Adesso la libreria si
ricorda come si chiamava prima una cosa che ha rinominato.

**3. Una clip senza durata leggibile non arrivava mai.** Il fotogramma si
prende spostandosi a un secondo dentro; se la durata non si legge ci si sposta a
zero, e spostarsi a zero quando si è già a zero **non fa succedere niente** — si
restava ad aspettare un segnale che non sarebbe arrivato. Adesso, se non c'è
dove andare, si disegna il fotogramma che c'è già.

**4. Senza FFmpeg non c'erano anteprime, e non c'era scritto da nessuna parte.**
FFmpeg non è imbarcato nella suite — è GPL, la suite è MIT — e chi non ce
l'aveva installato a mano non aveva né anteprime dei video, né la copertina
cucita dentro i brani, né la conversione audio del Visualizer. Adesso
l'ambiente Python della suite se lo porta dentro da solo: **non lo
distribuiamo, se lo scarica il computer di chi installa**, come già fa con
ComfyUI. Chi ne ha uno suo installato continua a usare quello.

E i video già in cartella, quelli fatti prima di oggi, si prendono la loro
copertina alla prima apertura della Galleria: uno alla volta, senza far tossire
la scheda video.

### Dal telefono la canzone ha un nome

> «Manca anche la possibilità da Android di mettere un nome alla canzone.»

Sul computer la casella del titolo è la prima cosa che si vede aprendo
DaProdMusica. Da fuori non c'era: il brano finiva in galleria chiamato come la
prima riga del ritornello, o — senza testo — come i tre generi in inglese.
Adesso **Produzione Musica** comincia con «Come si chiama», e quel nome è come
si chiamerà il file.

Lasciarlo vuoto fa quello che faceva prima: lo ricava dal testo.

### Le canzoni si scrivono in italiano, non in napoletano

> «Spesso gli LLM scrivono in napoletano, facciamoli scrivere in italiano.»

E la colpa era nostra. Le istruzioni che la suite dà al modello contenevano un
esempio di ritornello, e quell'esempio era *«Ammore mio, nun te ne jì»*. Un
modello piccolo copia l'esempio molto più di quanto segua una regola — è la
ragione per cui gli esempi ci sono — e quello gli stava insegnando, senza
dirlo, che le canzoni di questa suite si scrivono in dialetto.

Adesso l'esempio è in italiano, e sopra c'è scritto per esteso: **il genere può
essere napoletano, la lingua no.** Vale nei tre posti in cui un modello scrive
un testo — la chiacchierata, il tasto «riscrivi», e Bonsai dentro
DaProdMusica — e Bonsai in più **guarda la lingua che hai scelto** invece di
scrivere sempre in italiano: se canti in inglese, scrive in inglese.

### La foto del profilo si carica

> «Il caricamento della foto profilo non funziona.»

Dal telefono, toccare «Metti una foto» non faceva niente. Nessun errore,
nessun messaggio: niente.

Una WebView, da sola, **non sa aprire il selettore dei file**. Quando la pagina
ne chiede uno, Android chiede all'app cosa fare, e se l'app non risponde — e la
nostra non era stata scritta per rispondere — la richiesta viene lasciata cadere
in silenzio. Adesso risponde. Con lo stesso pezzo si è sistemato anche il
caricare una cosa in bacheca dal telefono, che non funzionava per lo stesso
identico motivo.

### Le notifiche arrivano quando il lavoro finisce

> «Le notifiche Android quando chiudo l'app a volte non arrivano o arrivano in
> ritardo.»

Vero, compreso il «a volte». Con l'app chiusa, l'unica cosa che guardava se il
computer aveva finito era un lavoro periodico di Android: il suo intervallo più
corto **è un quarto d'ora** — è un limite del sistema, non una nostra scelta — e
quel quarto d'ora è il minimo. Col telefono in tasca e lo schermo spento,
Android accorpa quei lavori e li fa girare quando gli conviene: mezz'ora,
un'ora, o alla prima volta che riprendi il telefono in mano. Per un video che ci
mette tre minuti, vuol dire saperlo molto dopo essere andati a guardare da soli.

Non si può curare con un servizio di notifiche: qui il «server» è il PC di casa,
e mettere qualcuno in mezzo sarebbe contro tutta la ragione per cui questa suite
esiste. Quello che si può fare è **restare svegli finché c'è un motivo**.

Da adesso, quando chiudi l'app con qualcosa in ballo, resta di guardia una
sentinella: chiede al computer ogni venti secondi, e **si spegne da sola** appena
la fila è vuota — o comunque dopo mezz'ora. La sua notifica silenziosa non dice
«l'app è in esecuzione», dice a che punto sei: *«è 2° in fila»*, leggibile senza
aprire niente.

E tre cose più piccole, sulla stessa strada:

- **toccare una notifica adesso apre l'app.** Prima non apriva niente: la
  notifica si chiudeva e bisognava cercare l'icona a mano.
- **il controllo di fondo non riparte più a vuoto senza linea**, e quando va
  storto riprova dopo un minuto invece che dopo un'ora.
- nel menu c'è **«Notifiche in ritardo?»**, che spiega in due righe il risparmio
  batteria di Android e porta dove si toglie. Compare solo se serve.

### Sul computer, la riga di una persona sta in una riga

> «Su PC nella tab delle persone il pulsante per inviare un pensiero è sotto.
> Rendiamo tutto responsive e ordinato e preciso.»

Era una riga con dentro cinque cose in fila — la faccia, il nome che si allarga,
due o tre tastini, e in mezzo a loro la barra dell'invio larga tutta la riga — e
bastava un nome lungo perché si sfaldasse: i tasti su due o tre altezze diverse,
spezzati a metà dalla barra.

Adesso sono due blocchi con un mestiere ciascuno: **chi è** e **cosa gli si può
fare**. Su uno schermo largo stanno affiancati, con i tasti in fila a destra;
su un telefono vanno uno sopra l'altro, con i tasti allineati sotto al nome.
Nessuna delle due è la versione ridotta dell'altra.

E il tasto adesso dice **«mandagli un pensiero»**, come si chiama dappertutto —
in Galleria, nella notifica che arriva sul telefono, nella bacheca. Una cosa
sola non può avere due nomi a seconda della schermata.

### E gli stili si possono usare

Era già corretto sul ramo principale, ma non era mai uscito in una release: dalla
0.7.7, scegliere uno stile e premere Genera tornava indietro con *«"stile" può
essere solo: . Arrivato "Neomelodico trap"»* — un elenco vuoto e la richiesta
rifiutata. Il controllo confrontava lo stile scelto con l'elenco del catalogo,
che per gli stili è **vuoto apposta**: non li può conoscere, sono di ogni persona
e stanno sul suo computer. Adesso un elenco vuoto vuol dire «le scelte le mette
il computer» e non «nessuna scelta è valida».

Insieme: **i doppioni degli stili musicali se ne vanno da soli.** Chi aveva già i
suoi ventiquattro generi si ritrovava «Neomelodico trap» due volte, perché il
segno di quali set sono già stati consegnati nasce con la 0.7.8 e un file scritto
prima non ce l'aveva.

### Il progetto, riordinato

Fuori dal programma:

- **il README** dice a che punto siamo davvero — la targhetta della versione era
  ferma alla 0.7.1 — e non è più una copia del changelog: le release vecchie
  stanno in una tabella, e la storia intera in un posto solo;
- **il sito** ([cammo22.github.io/DaProdSuite](https://cammo22.github.io/DaProdSuite/))
  diceva «0.2.0 pubblicata» e non nominava il telefono. Adesso ha la versione
  giusta, l'app Android da scaricare, e la sezione su cosa si fa da fuori casa;
- **la wiki** è allineata, e il repository ha i moduli per segnalare un difetto e
  per proporre una modifica.

### ⚠ Cosa è provato, e cosa no

Il patto di sempre: quello che non è passato per le mani di chi la usa è scritto
qui, non nascosto.

| Cosa | Come sta |
|---|---|
| Le anteprime dei video: le quattro cause | **le prime tre lette nel codice e corrette**; il giro vero — genero un video, guardo la galleria — è da fare sul PC con la scheda |
| FFmpeg dentro l'ambiente Python | il percorso è quello che `imageio-ffmpeg` usa da anni; **su questa macchina non è stato installato da zero** |
| Il titolo del brano da Android | **provato nella console vera**: il campo c'è, è il primo, e viaggia con la richiesta |
| L'italiano invece del napoletano | **istruzioni corrette e lette**; quanto ubbidisce un modello da 4B si vede solo usandolo |
| La riga delle persone | **provata in un browser vero**, a 1280 px e a 375 px: i tasti stanno in fila, su tutte e due |
| La foto del profilo da Android | **l'APK compila**; il tocco vero sul telefono no |
| La sentinella delle notifiche | **l'APK compila**; quanto arriva prima si misura solo chiudendo l'app con un video in corso |
| Gli stili | corretti sul ramo principale il 26 agosto, **mai usciti in una release fino a oggi** |

Le prove automatiche — cicli, avvio, azioni, gateway, MCP — passano tutte, e
l'app Android compila e si firma.

---

## 0.7.8 — Gli stili diventano tre, e la barra torna una riga

**26 agosto 2026.** Cinque cose viste usandola dal telefono, e nessuna è
un'idea nuova: sono cinque punti in cui la suite faceva perdere tempo.

### La barra in fondo era diventata due righe

> «Vorrei aggiustare la barra sotto e renderla una sola riga.»

Nella 0.7.7 le schede sono diventate sei — gli Stili si sono presi la loro — ma
la barra ne dichiarava ancora cinque. La sesta finiva a capo, e sotto a ogni
schermata c'era una doppia fascia che si mangiava un pezzo di telefono. Adesso
le sei stanno in fila, con le parole un filo più strette.

### Scrivendo al modello, la barra copriva quello che scrivevi

> «Su Android quando scrivo con il modello la barra sotto nasconde la chat.»

La tastiera del telefono alza il fondo della finestra, e una barra fissa finisce
sopra alla casella e sopra alle ultime battute — cioè proprio sopra a quello che
stai facendo. Adesso **mentre si scrive la barra si toglie di mezzo** e torna
appena esci dalla casella: chi sta scrivendo non sta cambiando scheda.

### I video hanno la loro immagine, e ce l'hanno subito

> «I video continua a non funzionare la thumbnail: facciamo che a fine video il
> software la crea.»

Prima il fotogramma lo cavava FFmpeg, dalla parte della suite, la prima volta
che qualcuno apriva la galleria. Due difetti che insieme facevano un buco:
**FFmpeg non c'è per forza** — non è imbarcato, è GPL e la suite è MIT — e su un
computer senza, i video restavano rettangoli neri per sempre; e anche dove
c'era, l'anteprima nasceva mentre stavi già guardando lo schermo nero.

Adesso il fotogramma se lo prende **DaProdCinema, appena il video è finito**, con
quello che ha già in mano. Nessun programma esterno da installare, e la
copertina esiste prima che qualcuno apra la galleria — sul computer e sul
telefono insieme. Vale per le clip di Crea e per quelle di una Storia.

### Gli stili sono di tre tipi: immagini, video, musica

> «Gli stili vanno bene ma devono essere di tre tipi per immagini, video e
> musica. Gli stili salvati per immagini li ritrovo anche nella produzione
> immagini, stessa cosa per musica e video, così li separiamo e ordiniamo per
> bene.»

Uno stile **non è la stessa cosa nei tre posti**: per un brano sono tre generi
musicali, per un'immagine è un modo di fotografare o di disegnare, per un video
è un modo di riprendere. Tenerli in un elenco solo voleva dire offrire «boom bap
partenopeo» a chi stava facendo una foto.

Nella scheda Stili adesso ci sono tre file — **Immagini**, **Video**,
**Musica** — col numero di quanti ce n'è dentro, così un elenco vuoto si spiega
da sé. Ognuno parte con un set preimpostato: sedici modi di fotografare,
quattordici modi di riprendere, i ventiquattro generi che c'erano già. Chi aveva
già i suoi stili musicali se li ritrova dov'erano, e riceve gli altri due set
una volta sola.

### E si ritrovano dentro la Produzione giusta

Il campo «uno stile pronto» non è più solo del brano: c'è anche in **Fai
un'immagine** e in **Fai un video**, e ognuno mostra **solo gli stili del suo
tipo**. Toccare uno stile nella scheda Stili porta nella produzione giusta, già
riempita — una foto in DaProdFoto, una clip in DaProdCinema, un brano in
DaProdMusica.

---

## 0.7.7 — Provata a lungo, e sono venute fuori venti cose

**26 agosto 2026.** La 0.7.6 è stata usata davvero, per ore, e questa versione è
la risposta a quello che ne è uscito. Non c'è un'idea nuova: ci sono venti
difetti veri, e il più grave era quello che si diceva per ultimo.

### Il collegamento non si perde più

> «Quando chiudo e apro l'app spesso devo cancellare l'account e riscannerizzare
> il codice. Facciamo una cosa stabile e testabile, non voglio problemi di
> questo tipo.»

Aveva due cause, e si sommavano.

**L'accoppiamento poteva non essere mai scritto.** L'archivio del gateway scrive
in differita, mezzo secondo dopo — giusto per l'ultimo accesso di un telefono
che bussa ogni venti secondi, **sbagliato** per il momento in cui nasce una
credenziale. Bastava che la suite morisse male in quella mezza finestra — e
moriva male spesso, per via dei processi che restavano — perché il telefono si
ritrovasse un token che il computer non aveva mai visto. Adesso quello che
decide *chi sei* si scrive **subito**: accoppiamento, revoca, cambio di ruolo,
cambio di nome. Tutto il resto resta differito.

**E un 401 buttava via la credenziale.** Uno solo, e non è detto che avesse
ragione: la suite può essersi appena accesa, il gateway può essere ripartito in
mezzo a una chiamata. Buttato il token, dentro l'app non c'era più modo di
rientrare — la pagina servita dalla copia non ha il frammento con la credenziale
— e l'unica strada sembrava rifare il codice. Adesso la credenziale vera vive
**nel profilo del telefono**, che è il posto durevole: al primo 401 l'app la
rimette e riapre, e solo dopo tre di fila si torna all'ingresso, con scritto
perché.

**E «non risponde» non è più «non ti conosce».** Erano trattati uguale — si
mostrava la copia offline — quindi chi era stato tolto dal computer vedeva
un'app che sembrava funzionare e non faceva niente. Adesso si distingue, e nel
secondo caso si dice cos'è successo e si offre di rifare il collegamento.

### La fila, con i numeri

> «Usiamo un sistema di coda a numeri che si aggiorna.»

Ogni lavoro ha un **numero** che non riparte mai: `#47`. Si legge al telefono, si
dice a voce, si ritrova in un elenco — cose che `r-8f3a2c` non permetteva. E
accanto c'è il **posto**, che invece scende a ogni lavoro che finisce.

Da lì vengono cinque cose che prima non c'erano:

- **si esce dalla fila**, e non serve il permesso di nessuno: chi esce libera la
  macchina, non la occupa;
- **si ferma quello che gira**, ma solo dal computer — il tempo di scheda video
  già speso si butta, e non è un gesto da telecomando;
- **«falle partire tutte»**, un tasto solo per dare il sì a tutto quello che
  aspetta, in ordine di arrivo;
- **«rifallo»** e **«cambia e rifallo»** su un lavoro finito. Ne nasce uno nuovo,
  col suo numero: un lavoro finito è un fatto, e riscriverlo vorrebbe dire non
  capire più cosa è successo quando;
- **da quanto sta andando**, che scorre ogni secondo. *Quanto manca* non lo sa
  nemmeno il motore; da quanto è partito sì, e basta a capire se è cominciato
  adesso o se è lì da un quarto d'ora.

### «Chiedo al computer» adesso chiede davvero

> «Quando dice chiedo al computer in realtà non chiede.»

Era vero: se la macchina stava generando, si restava un minuto con una rotella e
poi ci si sentiva dire di riprovare. Adesso **ci si mette in fila per davvero**:
il computer risponde subito con il tuo posto, quel numero scende sotto i tuoi
occhi, e se cambi idea esci dalla coda con un tasto.

### Il modello sa cosa sta facendo

> «Il fatto che non scrive bene il prompt è perché questi modelli locali sono
> piccoli: magari diamogli un preset a tutti i modelli che spiegano cosa possono
> e come fare.»

Le istruzioni sono diventate un **manuale**: per ognuna delle quattro cose che la
macchina sa fare c'è scritto quali campi riempire, cosa ci va dentro e **un
esempio vero** — che a un modello da 4 miliardi di parametri serve più di
qualunque spiegazione. Dentro ci sono anche gli stili di chi sta parlando.

E il piano non arriva più mezzo vuoto. Per un brano il modello riempiva la
descrizione e nient'altro: niente testo da cantare, niente stile, niente lingua,
niente durata — e una canzone senza parole è uno strumentale, che non è quello
che aveva chiesto chi ha scritto «una canzone d'amore a Napoli». Adesso lo schema
ha **un campo per ogni cosa che serve**.

**E il modello con cui generare si sceglie quando il piano è pronto**, non prima:
il modello che *scrive* non è quello che *genera*, e la scelta ha senso farla
guardando cosa si sta per fare.

**Quanto contesto dargli si sceglie**: 32K, 64K, 128K, 256K. Si paga in memoria —
ogni GB di cache è un GB che non sta ai pesi — quindi il numero giusto dipende
dal modello e dalla macchina, e non può deciderlo il programma.

### Pulsanti, non menu a tendina

> «Nell'interfaccia android voglio pulsanti, non menu a tendine. Durata canzoni
> pulsanti da 30, 60, 80, 120 e 220 secondi, anche i modelli voglio pulsanti. Le
> finestre mentre scrivi devono allungarsi: non voglio piccole finestre di testo,
> voglio vedere bene.»

Nei moduli non c'è più un solo `<select>`. Modelli, stili, lingue: pastiglie, che
si vedono tutte insieme e si premono una volta. Le durate sono cinque pulsanti; la
casella resta, per chi ne vuole 137.

Le caselle di testo **crescono mentre scrivi**. Il testo di una canzone sono venti
righe: scriverle dentro una finestrella da tre, su un telefono, vuol dire non
rileggere mai quello che si è scritto.

E nella musica c'è quello che mancava: **gli stili**, **la lingua**, e **le
istruzioni fra parentesi quadre** — `[Intro]`, `[Verse]`, `[Chorus]` — che si
infilano dove sta il cursore, con l'a capo giusto intorno. Sul computer c'erano
da sempre; dal telefono bisognava sapere che esistevano e scriverle a mano.

### Gli Stili, una scheda tutta loro

> «Aggiungiamo gli stili su Android, una nuova tab Stili dove gestire tutto e
> anche volendo condividere uno stile per farlo provare agli altri. Ogni utente
> deve avere i suoi, ma partono tutti con un set preimpostato.»

Sei schede invece di cinque. Dentro: i ventiquattro stili di partenza, quelli che
hai fatto tu, e quelli che hai preso da qualcuno. Si tocca uno stile per usarlo —
va in Produzione già riempito — e **si tiene premuto** per il resto: modifica e
salva, fanne una copia, mettilo in vetrina, buttalo.

La **vetrina** è quello che gli altri hanno deciso di far provare. Prenderne uno
ne fa una **copia**: da quel momento è tuo, e chi l'ha fatto può cambiarlo o
toglierlo senza che a te sparisca da sotto le mani. Resta scritto di chi era.

Gli stili vivono sul computer, nella cartella della persona — non nella memoria
di un browser, com'era fino a ieri: cambiavi dispositivo e non c'erano più.

### Una cartella per ognuno, e una per DaProd

> «Facciamo una cartella per ogni utente in modo tale da tenere sempre i dati
> degli utenti sotto controllo. Tutto quello pubblicato su DaProd finisce in una
> cartella separata in modo da non perdere quei file, e facciamo un collegamento
> rapido a queste cartelle nella suite.»

`persone\<id>\` per ognuno, e `daprod\` per quello che viene messo in bacheca —
una **copia**, non uno spostamento: pubblicare è un gesto in più, non un trasloco,
e chi pubblica non deve vedersi sparire il file da dove lo cerca. Il nome della
copia dice di chi è: `Cammo — un faro sulla scogliera.png`.

Togliere una persona adesso toglie anche la sua cartella. I risultati no: quelli
sono file veri, e qualcuno potrebbe volerli ancora.

### Il telefono, le cose piccole che si notavano

- **Le notifiche sono due**, non sei: un lavoro pronto e un pensiero arrivato. Un
  programma che avvisa a ogni cosa smette di essere ascoltato.
- **Il marchio nuovo** sull'icona dell'app e dentro le notifiche. La piccola resta
  una sagoma, e non è una scelta: Android riempie di bianco qualunque cosa ci si
  metta, e un logo a colori ci diventa una macchia.
- **I video hanno la loro anteprima**, anche senza FFmpeg sul computer: il
  fotogramma se lo estrae il telefono, dal video che ha già in casa. Funziona
  anche senza linea.
- **Via «Scollega questo dispositivo»** dall'app: non funzionava bene — revocava
  il token e lasciava il profilo — e faceva la stessa cosa di «Cambia persona»,
  che funziona. Un gesto solo, invece di due di cui uno rotto.

### E sul computer

- **Le notifiche arrivano anche lì**: «mettiamo le notifiche anche su pc che non
  le sento». Due sole, come sul telefono.
- **Si ferma una generazione** dal pannello.
- **Si accettano tutte le richieste** con un tasto.

### Il banco di prova, e i tre difetti che ha trovato

Questa versione ha un attrezzo nuovo che non si vede: `banco-console.mjs` accende
un gateway vero con dentro dati finti e serve la pagina vera, per guardarla in un
browser. Le prove automatiche controllano le rotte; la pagina è tremila righe di
JavaScript che nessun controllo di tipi guarda.

Ha trovato tre cose, tutte e tre invisibili altrimenti:

1. **tre variabili usate e mai dichiarate.** In JavaScript non è un errore che si
   vede: parte un'eccezione, risale fino a un `catch` vuoto e sparisce. Sullo
   schermo restava «le ultime cose venute fuori» sempre vuota, e in console non
   c'era una riga;
2. **un tasto agganciato a un id che non esisteva**, che rompeva tutti gli agganci
   venuti dopo;
3. **la scheda Stili che non si leggeva aprendosi**, e restava vuota.

Da oggi le tre cose sono controllate a ogni prova: una variabile assegnata e mai
dichiarata, un id cercato a vuoto e una scheda che non si va a prendere la sua
roba fanno fallire le prove. Sono 404 controlli, contro i 300 della 0.7.6.

---

## 0.7.6 — Due programmi invece di uno, e la macchina che resta tua

**26 agosto 2026.** Il giro più grosso dalla 0.7.0, e nasce da una frase sola:
«ho visto che è identica all'app che si apre su pc, ma io vorrei una versione
android e una pc». Aveva ragione, e non per una questione di gusto: chi apre
questa roba **dal computer** la apre per governare — chi è collegato, chi passa
davanti, quanti lavori accettare, il firewall. Chi la apre **dal telefono** la
apre per fare una cosa. Mostrare gli stessi diciotto comandi a tutti e due vuol
dire dare a uno metà dei suoi e all'altro il doppio di quello che gli serve.

---

### Il telefono adesso ha la sua faccia

**Cinque schede, e tre hanno cambiato nome perché il nome era sbagliato.**

| prima | adesso | a che domanda risponde |
|---|---|---|
| Casa | **Casa** | funziona? e cos'ho fatto |
| Chiedi | **Produzione** | voglio fare una cosa nuova |
| Lavori | **Riepilogo** | la mia roba a che punto è |
| Galleria | **Galleria** | fammi vedere quello che è venuto fuori |
| Persone | **DaProd** | cosa hanno fatto gli altri |

**Produzione** ha quattro tasti grossi e colorati — Immagini, Video, Musica,
Audio — e basta. Le azioni di servizio (gli ultimi risultati, com'è messa la
suite, la fila delle richieste) dal telefono non ci sono più: erano cinque voci
su nove, con lo stesso peso delle quattro per cui uno apre l'app.

**Riepilogo** era un elenco lungo di righe e adesso è quattro numeri in cima —
in lavorazione, in fila, pronti, aspettano il sì — e sotto **cosa sta girando
adesso**, con chi c'è dietro e a che posto sei.

**Galleria** ha due tasti: *Le mie Produzioni* e *Pensieri*. I regali si
chiamano così adesso, ed è meglio: «regalo» dice che c'è un'occasione,
«pensiero» dice solo che qualcuno si è ricordato di te.

**Casa**, da utente, non mostra più quanti sono collegati né quante richieste
aspettano il tuo sì: sono numeri di chi governa la fila, non di chi ci sta
dentro. Al loro posto, scorrendo, ci sono le ultime cose venute fuori.

**Le impostazioni sono un posto solo.** C'era un menu a tre puntini nell'app con
cinque voci e una scheda nella pagina con altre cinque cose: due posti per la
stessa famiglia di gesti, e nessuno dei due completo. Adesso c'è la rotella in
alto a destra, da qualunque scheda: ricarica, come siamo messi, le persone,
aggiungi una persona, il computer, aggiorna l'app, scollegati.

**E il tasto Ricarica adesso ricarica.** Prima rifaceva il giro degli indirizzi
e poi *forse* riapriva la pagina: quando il computer rispondeva subito non
succedeva niente di visibile, ed era esattamente il momento in cui uno lo
premeva.

---

### Col computer spento non cambia più niente

Questa è la cosa che si sente di più usandola.

Prima, se il computer non rispondeva, l'app mostrava **un'altra schermata**: un
menu a tendina, un modulo e una lista. Uscivi di casa, aprivi, e al posto della
tua galleria trovavi uno spinner. Era, letteralmente, un altro programma.

Adesso **è la stessa pagina**. La Casa, la Produzione, il Riepilogo, la
Galleria, i Pensieri: tutto al suo posto, con quello che è arrivato fin lì. In
cima una riga dice che il computer adesso non risponde, e quello che chiedi si
mette in coda e parte da solo appena torna.

Funziona così: mentre la linea c'è, il telefono **si tiene** quello che riceve —
la pagina stessa, le risposte del computer, le anteprime di tutto e i file che
ci stanno (fino a 40 MB l'uno). Quando il computer sparisce, a rispondere alla
pagina è il telefono. Quello che non si può fare senza computer lo dice con una
frase invece che con un errore di rete.

E da lì si può **salvare in galleria** anche senza linea, se il file è già in
casa.

---

### La registrazione, e il nome che è tuo

All'avvio c'è una **pagina d'ingresso**: un nome, un codice, un tasto. Il QR è
sceso alla riga sotto — «il login è obbligatorio il QR, ma lo vorrei opzionale,
il codice va benissimo».

**Il nome adesso è unico.** Se ne scegli uno già preso te lo dico lì, con il
cursore già nella casella giusta, e non dopo — quando quel nome sarebbe già
sotto a tutto quello che hai chiesto. Serviva perché da questa versione il nome
non è più un'etichetta accanto a una richiesta: è chi sei in DaProd.

---

### DaProd: la bacheca diventa un posto

La scheda che si chiamava «Persone» mostrava i quadrati della rete. Adesso
mostra **quello che le persone hanno deciso di far vedere**, con la faccia di
chi l'ha fatto, il cuore e il tasto per tenerlo da parte.

- **Mi piace** su qualunque cosa in bacheca. Senza, chi ci mette una cosa non sa
  se l'ha guardata qualcuno, e la volta dopo non ce la mette.
- **Tieni** una cosa di un altro: compare fra le tue, come un segnalibro. Non è
  una copia — se chi l'ha fatta la toglie dalla bacheca, sparisce anche da te.
- **Il tuo profilo**: nome, foto, e una riga sotto al nome. Si cambia tutto.
- **Carica una cosa tua** in bacheca, anche se non l'ha generata il computer.

---

### Si vede quello che c'è

Tre riquadri neri in meno.

- **I video hanno il loro fotogramma.** Un `<video>` senza poster è un
  rettangolo nero finché non premi play: dodici rettangoli neri non sono una
  galleria, sono un indovinello. Adesso il computer estrae un fotogramma e lo
  tiene da parte.
- **I brani hanno la loro copertina**, e non solo in galleria: quando una
  canzone è completa **l'immagine viene cucita dentro il file**. Un mp3 che
  finisce nel tuo telefono la mostra nel lettore, in macchina, ovunque.
- **Toccando una cosa si apre a schermo intero**, con il tasto per salvarla nel
  telefono e quello per condividerla con le altre app.

Il fotogramma e la cucitura vogliono FFmpeg installato sul computer. Se non c'è,
non si rompe niente: si torna a com'era.

---

### Dieci minuti con un modello, che può usare la suite

Dalla Produzione, in fondo: **parla con un modello** fra quelli installati sul
computer. Gli dici cosa vorresti — «vorrei una foto di una macchina, e anche un
video» — e lui prepara **un piano**: uno o più lavori, scritti per bene, con le
descrizioni già fatte. Tu spunti quelli che vuoi e dici di sì.

Tre cose lo rendono possibile su una scheda da 8 GB, e sono le stesse tre che
lo rendono onesto:

1. **Dura dieci minuti.** Quei quattro GB e mezzo sono gli stessi che servono a
   generare: un modello caricato «per ogni evenienza» è una generazione che non
   parte.
2. **Tiene la macchina per sé** mentre parla, quindi non c'è modo che una
   generazione parta a metà frase e gli porti via i pesi da sotto.
3. **Accettare il piano chiude la chiacchierata.** Nell'istante in cui i lavori
   partono, il modello non serve più e la sua memoria sì. Non è un effetto
   collaterale: è il punto.

E il modello non fa partire niente da solo. Propone; decidi tu.

---

### Il computer resta tuo

«Io devo poter usare comunque il computer mentre queste persone sono
collegate.» Adesso si può, e in tre modi.

**Il turno.** Fino alla 0.7.5 c'erano due file che non si conoscevano: le
generazioni, serie, una per volta; e le domande al modello che scrive, che non
avevano nessuna fila e prima di rispondere svuotavano la memoria video — anche
mentre una generazione la stava usando. Su otto GB non è un dettaglio di
eleganza: è la ragione per cui un video moriva a metà se qualcuno, nello stesso
momento, chiedeva al modello di riscrivere un prompt. Adesso il turno è **uno**,
e chi lavora lavora da solo.

**Chi sta al computer passa davanti.** Quello che chiedi tu non si mette in fila
dietro a tre telefoni. Non scavalca un lavoro già partito — fermarlo a metà
vorrebbe dire buttarlo via — ma non aspetta il suo turno per cortesia.

**«Sto usando il computer».** Un interruttore che non interrompe niente: finisce
quello che c'è e non ne fa partire altro. Si ricorda fra un avvio e l'altro, e
dal telefono si vede una riga che dice perché la propria roba aspetta.

**E i limiti li mette solo il PC.** Chi genera senza aspettare il tuo sì
(nessuno / chi è admin / tutti), quanti lavori possono stare in fila in tutto, e
quanti a testa. Un telefono con i permessi da admin decide sulle richieste degli
altri — quello sì — ma non può alzarsi i limiti a cui è sottoposto lui: se
potesse, non sarebbero limiti. Le due rotte che li cambiano rispondono «questo
si cambia solo dal computer» a chiunque non sia questa macchina.

Sopra il tetto una richiesta **non si perde e non si rifiuta**: resta in attesa
con scritto perché, e parte da sola quando la fila si sgombra.

---

### La suite si chiude davvero

«A volte quando si apre e chiude rimangono circa 4 processi in background, e
ogni volta per farla ripartire devo andare nel terminale e terminarli.»

Erano due cose che si sommavano.

**Uccidere un processo non uccideva la sua famiglia.** Windows fa così: si
ammazzava `python.exe`, e ComfyUI moriva davvero — ma i lavoratori che aveva
aperto lui, e il compilatore che apriva `uv`, restavano orfani con la scheda
video in mano. Adesso si scende per tutto l'albero.

**E se la suite moriva male, non spegneva niente.** Un crash, un «termina
attività», un aggiornamento andato storto: il codice di chiusura non girava, e
quei processi restavano lì fino al riavvio del computer. Ecco perché serviva il
terminale.

Adesso la suite **tiene un libro di chi apre**, e al prossimo avvio spegne quello
che è rimasto — prima di provare ad aprire le stesse porte. Con un controllo che
non è un dettaglio: un numero di processo si ricicla, quindi accanto si scrive
anche di chi dovrebbe essere, e prima di ammazzare si chiede a Windows chi è
quel numero adesso. Se non torna, si lascia stare.

E la chiusura ha un tetto: dodici secondi per spegnersi con garbo, poi le
maniere forti, poi si esce comunque. Prima, se un motore non rispondeva, la
finestra spariva e la chiusura non finiva mai.

---

### Sotto il cofano

- La pagina della console era un file da 2300 righe e stava per diventarne
  4000: adesso sono sei pezzi con un mestiere ciascuno, sotto
  `packages/gateway/src/console/`.
- La compilazione del gateway **pulisce prima di ricompilare**. Serviva: dopo
  aver spostato la console in una cartella, il vecchio file compilato restava in
  `dist` e vinceva su quello nuovo — la suite serviva la pagina di ieri e le
  prove passavano lo stesso. Trovato così.
- Le anteprime uscivano tutte dichiarate `image/jpeg`, ma l'anteprima di
  un'immagine **è** l'immagine — quasi sempre un PNG — e con `nosniff` il
  browser la rifiutava. Adesso il tipo si legge dal file. Trovato guardando la
  galleria in un browser vero, non leggendo il codice.
- 349 prove automatiche, 44 in più della 0.7.5: il nome unico che non brucia il
  codice, le rotte della macchina che dicono di no a chi non è il PC, i mi
  piace, il profilo, il giro intero della chiacchierata.

---

### Cosa devi fare tu

Aggiorna la suite e l'app del telefono. La prima volta apri l'app **stando in
casa**: è il giro in cui il telefono si porta a casa la pagina nuova e le
anteprime. Da lì in poi funziona anche col computer spento.

⚠ **Da provare tu**, perché qui non si è potuto: la chiacchierata contro LM
Studio vero, la copertina cucita dentro un brano vero (vuole FFmpeg), il
fotogramma di un video vero, e l'app su un telefono. Il resto è stato guidato in
un browser vero contro un gateway vero.

---

## 0.7.5 — Da fuori casa, davvero

**23 agosto 2026.** «Funziona bene, ma solo in rete locale.» Detto così sembra
un problema di firewall o di permessi. Non lo era: la strada da Internet
c'era, ed era **spenta**.

**Il tunnel adesso è acceso di suo.** Era nato spento — «lo si accende sapendo
cosa si sta facendo» — e il risultato è che non lo accendeva nessuno: il QR
conteneva solo `192.168.1.8:8790`, che fuori dalla porta di casa non esiste, e
dal telefono in giro non si arrivava. Da questa versione parte con la suite. Si
spegne da DaProdConnessione, e la scelta resta.

**E si rialza da solo.** Se la linea cade per un minuto, o Cloudflare chiude, o
il computer si sveglia dalla sospensione, `cloudflared` muore. Prima restava
morto: il pannello diceva «guasto» e qualcuno doveva tornare davanti allo
schermo a premere l'interruttore — ma quando serve la strada da fuori, davanti
allo schermo non c'è nessuno per definizione. Adesso si riapre da sé, con
un'attesa che cresce e senza mai smettere.

**Il telefono impara l'indirizzo nuovo.** Questo era il difetto vero, quello che
restava anche col tunnel acceso: l'indirizzo su Internet **cambia a ogni
accensione della suite**, e il telefono si ricordava quello letto nel QR il
giorno dell'accoppiamento. Fuori casa bussava a un indirizzo che non esisteva
più e diceva «non raggiungibile» per sempre; l'unica cura era rifare il QR,
cioè tornare davanti al computer — proprio quello che non si può fare quando si
è fuori. Adesso il computer, ogni volta che gli si bussa, risponde anche «e
comunque adesso mi trovi qui»: basta arrivarci **una volta**, dalla wifi di
casa, e l'indirizzo di stasera è già in tasca. Vale anche ad app chiusa, dal
lavoro in background.

**Cosa devi fare tu.** Aggiorna la suite e l'app del telefono (menu ›
Aggiorna), poi apri l'app **una volta stando in casa**: è il giro in cui si
prende l'indirizzo nuovo. Da lì in poi funziona anche fuori, senza rifare
niente. Se l'accoppiamento è vecchio e non risale, rifai il QR una volta sola.

**Ricordati che l'indirizzo è pubblico.** È sempre stato scritto nel pannello e
vale adesso più di prima: chi lo indovinasse arriverebbe alla pagina di
accoppiamento, non ai tuoi contenuti — senza token il gateway risponde 401 a
tutto, e il codice a otto cifre vive cinque minuti.

---

## 0.7.4 — Il file si sposta prima dei suoi metadati

**23 agosto 2026.** Una riga sola, vista pulendo dopo la 0.7.3.

Quando una cosa prodotta prende il nome del prompt, accanto al file si sposta
anche il foglietto con i parametri — modello, seed, passi. Lo spostamento era
nell'ordine sbagliato: **prima il foglietto, poi il file.** Su un video che
Windows teneva ancora bloccato il foglietto partiva e il video restava indietro,
e alla fine c'erano un `.json` orfano col nome giusto e un video col nome del
motore, senza più i suoi parametri.

Adesso si sposta prima il file. Se non si può, non si è mosso ancora niente e si
riprova da capo — che è quello che la 0.7.3 aveva già imparato a fare.

**Se ti è capitato:** un video che in galleria si chiama ancora `clip_00020_` è
quello. Il file c'è ed è intero, gli manca solo il nome.

---

## 0.7.3 — I video arrivano, e la scheda video torna libera

**23 agosto 2026.** Tutto quello che è venuto fuori usando la 0.7.2 per un
pomeriggio. Una di queste cose era rotta per colpa mia, ed è la prima.

---

### I video non arrivavano

«A volte i video non li manda correttamente.» Era vero, e il motivo stava
scritto nel registro della suite:

> `EBUSY: resource busy or locked, rename 'clip_00020_.mp4' → 'Una ragazza corre in bagno.mp4'`

L'ho messo io nella 0.7.2, insieme ai nomi presi dal prompt. Windows tiene un
file bloccato finché il programma che lo scrive non lo lascia andare, e su un
video da cento MB quel momento arriva dopo: **cambiargli nome falliva, e il
lavoro risultava fallito con il video già pronto sul disco.** Su un'immagine non
capitava quasi mai — è piccola, il motore la molla subito. Sui video sì.

Adesso il file si prende quando ha **smesso di crescere**, si riprova quattro
volte a dargli il nome, e se proprio non si può si tiene quello del motore: il
prompt è già scritto accanto, quindi in galleria e sul telefono si legge lo
stesso. Un nome non può far fallire un lavoro finito.

Nella stessa passata: i risultati si scaricano **a pezzi**, come la galleria. Un
video si può scorrere senza aspettare che arrivi tutto, e una linea che cade
riprende da dove era invece di ricominciare.

### Le schede si chiudono quando hanno finito

Era la cosa detta «importantissima», e ha ragione: finché la scheda resta aperta
il suo motore resta acceso, e i pesi restano nella scheda video. Su otto GB vuol
dire che la generazione dopo non trova posto.

Adesso, **quando la fila finisce, quello che ha aperto lei lo richiude** — e con
la finestra si spegne il motore. Quello che hai aperto tu resta dov'è: se stai
lavorando in DaProdFoto non te la chiude in faccia. E se in coda c'è un altro
lavoro per la stessa scheda, non la chiude e riapre per niente.

### Quello che conta è arrivarci da fuori

«L'app connessione deve funzionare solo su internet, non ci interessa la LAN.»

Quindi la rete di casa non è più una risposta: se da fuori non ci si arriva, il
quadrone in cima **non è verde** — dice che da fuori casa non ci si arriva, con
il tasto per aprire la strada lì accanto. Anche il QR e l'app adesso preferiscono
l'indirizzo che funziona ovunque: prima Tailscale, poi il tunnel, e la wifi di
casa per ultima. Un telefono che si ricorda l'indirizzo di casa smette di
funzionare appena esce dalla porta.

### Sul telefono basta il codice

Il codice dice *chi sei*, non *a chi bussare*: quello lo portava il QR, ed era il
motivo per cui senza inquadrare non si entrava. Adesso nella schermata di
collegamento c'è anche la casella dell'indirizzo — già piena con quello
dell'ultima volta — e sul computer, sotto al QR, c'è scritto **cosa copiare**:
l'indirizzo e le otto cifre.

### Quello che scrivi col computer spento parte da solo

Prima la coda partiva solo riaprendo l'app e aspettando la schermata: se il
telefono restava in tasca, quello che avevi scritto restava lì. Adesso ci pensa
il lavoro in background — ogni quarto d'ora guarda **quale indirizzo risponde
adesso** e manda le richieste di ognuno con il suo collegamento. Quando partono,
te lo dice con una notifica.

E se il computer non l'hai mai raggiunto, quella schermata non mostra più un menu
vuoto e un tasto che non fa niente: dice cosa manca.

### Le persone hanno la loro pagina

In fondo c'era «Collegamento», e cominciava dai quadrati della rete: chi cercava
*dove gestisco chi è collegato* non la apriva nemmeno. Adesso si chiama
**Persone** e comincia da chi c'è, con:

- **Admin** o **Utente** scritto accanto al nome — sono queste le due parole, e
  il tasto adesso dice «rendilo admin» o «rendilo utente»;
- **disconnetti** al posto di «togli»;
- **mandagli un file**: si trascina sul nome, o si sceglie col tasto — perché su
  un telefono non si trascina niente.

La roba della rete è rimasta, sotto, che è quanto conta una volta che funziona.

### I file che ti mandano stanno in galleria

Non più in un riquadro loro nella prima pagina: in **galleria**, terza linguetta
«arrivati per me», accanto alle tue cose e alla bacheca. Il pacco che si apre con
l'animazione resta, la prima volta che arriva.

### Dal computer si vede tutto

La galleria di chi sta al PC mostra le cose di tutti: sono sul suo disco, e le
schede della suite già le mostrano tutte. La separazione serve fra le persone
collegate da fuori, non per nascondere a chi ospita quello che ospita.

### L'AI scrive anche la canzone

Chiedendo un brano dal telefono, **Usa l'AI** adesso scrive due cose: com'è
fatta la canzone e **cosa dice** — con i tag `[Verse]`, `[Chorus]`, `[Bridge]`,
come li vuole DaProdMusica. Le parole finiscono nella loro casella solo se è
vuota: se ci avevi già scritto qualcosa, resta la tua.

Il tasto, dovunque sia, adesso si chiama **Usa l'AI**.

---

### Provato sul PC vero

Il giro del video, dall'inizio alla fine, con il motore acceso: un telefono
chiede «una barca entra in porto all'alba», chi sta al PC accetta, DaProdCinema
si apre e genera. **Centocinquanta secondi dopo** il file c'è, si chiama come il
prompt, si scarica intero e a pezzi, è un mp4 vero e lungo quanto dice, sta nella
galleria di chi l'ha chiesto — e **DaProdCinema si è chiusa da sola**, con il suo
motore. Nel registro della fila si legge la riga che lo dice.

Prima di questa release, lo stesso giro finiva con «fallita».

### Cosa **non** è a posto, e va detto

- **Il tasto dell'AI ci mette un minuto o due**: Bonsai si carica a 64K e
  ragiona. È il prezzo di un 27B su una scheda da 8 GB.
- **Due telefoni veri accesi insieme non li ha ancora visti nessuno.**
- **La coda che parte con l'app chiusa** dipende da quando Android decide di far
  girare il lavoro in background: il quarto d'ora è il minimo che il sistema
  accetta, non una promessa.
- Se generi a mano in una scheda **mentre la fila lavora**, il primo file che
  esce può finire attaccato alla richiesta di un altro. È scritto nel codice da
  sempre e non è ancora chiuso.

---

## 0.7.2 — Ognuno le sue cose, e il menu quando arriva una richiesta

**22 agosto 2026.** La 0.7.1 funziona: il telefono chiede, il computer fa, il
file torna indietro. Questa release è tutta rifinitura di quel giro — quello che
si vede solo dopo averlo usato per davvero, con più di una persona collegata.

---

### Ognuno vede le sue cose

Fino a ieri la galleria era di tutti: chiunque fosse collegato vedeva quello che
avevano fatto gli altri, e poteva scaricarselo. Adesso no.

**Ogni cosa prodotta sa chi l'ha chiesta.** In galleria ci sono due tasti in
cima: **le mie cose** e **in bacheca**. Le tue le vedi solo tu. Quello che vuoi
far vedere lo metti in bacheca, e lì compare **con scritto chi l'ha fatto** —
che era la ragione di tutto: vedere chi ha fatto quale immagine, ordinati.

Vale anche per chi può decidere: il permesso è sulla fila dei lavori, non sulle
cose degli altri.

Non è solo l'elenco: **anche il file** adesso esce solo per chi ne ha diritto.
Prima bastava indovinare il nome.

Quello che c'era prima di questa versione risulta del computer, ed è giusto: è
lì che è stato fatto.

### Chi decide e chi chiede, ed è l'unica differenza

**Chi decide genera subito**: quello che chiede parte da solo, senza aspettare
il proprio sì. **Chi chiede** manda una richiesta e aspetta.

Il permesso adesso si cambia da DaProdConnessione, con un tasto sulla riga della
persona: prima si sceglieva una volta sola inquadrando il QR, e per promuovere
qualcuno bisognava scollegarlo e rifargli tutto l'accoppiamento.

La fila resta una sola e resta seria: accettata non vuol dire «adesso», vuol
dire «quando tocca a te». Su otto GB di scheda video ci sta un modello per
volta, e questo non cambia con il ruolo di chi ha chiesto.

### Il menu quando arriva una richiesta

Sotto una richiesta ferma non ci sono più «sì» e «no». C'è **che ne faccio?**, e
dentro quattro cose:

- **fallo così com'è**;
- **fallo scrivere meglio, poi fallo** — il modello riapre la richiesta in una
  descrizione fatta come si deve, e poi parte;
- **scrivila io** — la casella si apre già piena di quello che aveva scritto
  l'altro, e poi scegli: mandala così, o mandala con l'AI;
- **no**, con la ragione, che arriva a chi aveva chiesto.

Se una richiesta è stata riscritta, sotto resta scritto **com'era arrivata**: chi
chiede una cosa e ne riceve un'altra deve poter vedere cos'è successo.

**L'AI non parte mai da sola**, ed è voluto. Il modello che scrive e il modello
che genera vivono sulla stessa scheda: quattro GB e mezzo occupati per riscrivere
una frase sono quattro GB e mezzo in meno per la generazione. Si accende quando
premi, con i suoi 64K di contesto, e LM Studio lo lascia andare appena ha
finito.

Lo stesso tasto — **fallo scrivere meglio** — sta anche sotto la casella quando
sei tu a chiedere qualcosa, e vale su tutte le schede: alla foto scrive da
direttore della fotografia, al brano da produttore, alla voce sistema il testo
perché si legga bene ad alta voce.

### I file si chiamano come quello che hai chiesto

«Spesso i file vengono salvati con nomi diversi.» Era vero: il motore scriveva
`daprod_00042_.png`, e quel numero era l'unica cosa che si leggeva in galleria,
sul telefono e nella cartella.

Adesso quello che esce da una richiesta **si chiama come il prompt**, e non è
un'etichetta in un archivio: aprendo la cartella si legge la stessa cosa. Anche
quello che scarichi dal telefono arriva con quel nome.

Quello che generi tu, stando al computer, in galleria si legge come quello che
hai scritto; il file sul disco tiene il nome del motore. È una scelta prudente e
va detta: rinominarlo mentre la scheda ce l'ha ancora in mano vuol dire
anteprime che si rompono.

### Dal telefono si sceglie il modello, e ci sono i tuoi soliti

Chiedere un'immagine dal telefono adesso vuol dire poter dire **con che
modello**: Anima, Anima v2, FLUX.2 Klein 4B o 9B. Lo stesso per i video (LTX 2.5
o MiniMax H3) e per i brani. Vuoto vuol dire «quello scelto adesso sul
computer», che resta il caso normale.

Nel menu si legge come si chiama il modello, non il suo id.

E ci sono **i tuoi soliti**: un modo di generare si salva con un nome e si
ritrova nel modulo, anche dal telefono. Stanno sul computer e non nel browser,
che è la ragione per cui prima gli stili salvati in una scheda non li vedeva
nessun altro.

### Mandare un file a una persona

Da DaProdConnessione, **trascina un file sul nome di chi è collegato e glielo
mandi**. Con la barra che dice a che punto è, perché su un video da cento MB una
pagina ferma sembra rotta.

A chi lo riceve arriva la notifica sul telefono, e il pacco **si apre in mezzo
allo schermo**, una volta sola. Dentro c'è l'anteprima, se è roba che si può
guardare, e il tasto per tenerlo.

### I lavori si mettono via

Tre pile in cima ai lavori: **adesso**, **finiti**, **messi via**. Quelli finiti
si archiviano con un tasto, o si buttano. Anche le cose in galleria si buttano,
ma solo le proprie.

---

### Cosa è stato provato davvero

Sul PC di casa, con la suite vera accesa e un secondo dispositivo collegato per
finta (un programma che si accoppia come farebbe un telefono):

- **il giro intero**: un dispositivo chiede un'immagine **con FLUX.2 Klein 4B**,
  chi sta al PC accetta, DaProdFoto si apre, sceglie quel modello e genera. Cento
  secondi dopo il file c'è, **si chiama «un faro sulla scogliera al tramonto,
  luce calda»**, ed è di chi l'aveva chiesto — che nella sua galleria lo vede, e
  in quella di chi sta al PC no;
- **il pacco**: mandato, arrivato, notificato, aperto con la sua animazione,
  scaricato e buttato;
- i permessi della libreria, la bacheca, il cambio di permesso, i preset, la
  riscrittura a mano e quella del modello.

**Il tasto dell'AI ci mette un minuto o due.** Provato: Bonsai si carica a 64K,
ragiona, e risponde in circa cento secondi la prima volta. Non è un difetto ed è
il prezzo di un 27B su una scheda da 8 GB — ma è bene saperlo prima di premere.
Mentre lavora il tasto lo dice.

### Cosa **non** è a posto, e va detto

- **Due telefoni veri accesi insieme non li ha ancora visti nessuno.** Il
  secondo dispositivo delle prove era un programma, non una persona: quello che
  non è passato per mani vere è l'animazione del pacco su Android e il
  trascinamento di un file da una cartella di Windows.
- **Il tasto dell'AI vuole LM Studio acceso.** Se non c'è, il tasto è spento e
  dice perché, ma il modello non si accende da solo.
- **La bacheca non ha niente di social oltre a questo**: non ci sono cuori, non
  ci sono commenti, e non è previsto che ci siano. Serve a vedere chi ha fatto
  cosa, ordinati.
- Un file mandato a una persona non può superare i **512 MB**.
- **DaProdVoce non sceglie il modello da fuori**: sceglie la voce, che è la cosa
  che ha.

### Due cose viste guardando, e sistemate

- **I lavori rimasti a mezz'aria.** Sul PC c'erano due richieste ferme su «ci sta
  lavorando» da ore: la suite era stata chiusa mentre generava, e la fila vive in
  memoria. Adesso all'avvio si chiudono da sole, dicendolo a chi le aspettava. E
  **buttare una richiesta si può sempre**, anche una che dice di star lavorando:
  se no quella riga non se ne andava più.
- **I nomi delle cose fatte prima.** Le novantaquattro immagini già in libreria
  si chiamavano `daprod_00048_`. Adesso si leggono col prompt che le ha fatte,
  senza che nessuno abbia rinominato niente: i parametri accanto ai file
  c'erano già, bastava guardarli.

---

## 0.7.1 — Il tasto del firewall funziona

**22 agosto 2026.** Tre cose viste subito dopo aver pubblicato la 0.7.0.

### «Windows non ha aperto la porta: powershell.exe è uscito con codice 1»

Il tasto **Sblocca** non ha mai funzionato, e il messaggio non diceva niente.

La regola si chiamava **«DaProd Suite (da fuori)»**, con gli spazi. Il comando
di Windows che la crea riceveva quel nome **spezzato in quattro parole**, perché
il modo in cui PowerShell lancia un programma come amministratore non protegge
gli spazi dentro un argomento. Per Windows era una frase senza senso, e
rispondeva «1».

Adesso la regola si chiama `DaProdSuite`, senza spazi, e quel tipo di errore non
può più capitare. E se qualcosa va storto lo stesso, **si legge cosa ha detto
Windows** invece di un numero.

Una cosa in più che è venuta fuori guardando: il tasto poteva anche dire di aver
funzionato quando non aveva fatto niente. Adesso non si fida di quello che
risponde il comando — **va a guardare se la regola c'è.**

### DaProdConnessione non si apre più bianca

Se la porta 8790 è occupata — di solito da un ComfyUI rimasto acceso — la scheda
mostrava la pagina di errore del browser, in inglese e con un codice. Adesso
riprova qualche volta e poi scrive cosa guardare.

### Due prove che avrebbero fermato il guasto di ieri

La 0.7.0 è stata pubblicata e ritirata nel giro di pochi minuti: conteneva un
giro fra i moduli che avrebbe **ammazzato la suite all'avvio**. Compilava e
passava tutte le prove.

Adesso ce ne sono due che partono prima delle altre: una carica davvero tutti i
pezzi del programma, l'altra cerca i giri viziosi. Messe alla prova rimettendo il
guasto: la seconda **non funzionava**, e adesso funziona.

---

## 0.7.0 — DaProdConnessione, e i lavori che partono davvero

**22 agosto 2026.** Tutto quello che è venuto fuori provando la 0.6.0 sul
telefono. La frase che tiene insieme il giro è una: **«quando accetto un lavoro
non funziona»** — ed era vero, e non era l'unica cosa.

---

### La nona scheda: DaProdConnessione

C'è un riquadro nuovo nell'hub. Lo apri e vedi **se tutto funziona**: un
quadrone verde o rosso in cima, e sotto i quadrati con chi è collegato, da dove
si arriva, e cosa manca. Se qualcosa non va, il tasto per rimediare è lì
accanto.

Sostituisce il pannello **«Da fuori»** in fondo all'hub, che è sparito — nome
compreso, che non voleva dire niente. E non è una terza interfaccia: è **la
stessa pagina** che vedono il browser di un portatile e l'app del telefono.
Prima erano due, e non dicevano mai la stessa cosa: una sapeva del firewall e
l'altra no, una si aggiornava da sola e l'altra andava riaperta.

Il conto delle righe, che è la cosa che era stata chiesta: la scheda nuova ne
ha aggiunte **120**, e ne ha tolte **739** all'hub.

### La connessione è accesa, e resta accesa

Niente più interruttore da premere a ogni avvio. La suite si accende con la
connessione già aperta, e se la spegni resta spenta — se lo ricorda.

Da spenta il pannello continua a funzionare: il gateway resta in ascolto **solo
su questo computer**, così l'interruttore non fa sparire la pagina che lo
contiene.

### Quando accetti, il lavoro parte

Il pezzo che mancava da sempre. Fino alla 0.6.0 «accettata» voleva dire «l'ho
vista»: chi stava al PC doveva aprire la scheda, ricopiare quello che era stato
chiesto e premere Genera.

Adesso accettare vuol dire **fallo**: la suite apre la scheda giusta, le passa
il lavoro, e quando il file esce lo dichiara pronto a chi aspettava. Vale per
DaProdFoto, DaProdCinema, DaProdMusica e DaProdVoce.

Una per volta, e non è prudenza: su otto GB di scheda video ci sta un modello
alla volta, e due generazioni insieme non sono più veloci — sono due
generazioni che falliscono.

> ⚠ Se **mentre la fila lavora** generi anche tu qualcosa a mano nella stessa
> scheda, il primo file che esce potrebbe finire attaccato alla richiesta di un
> altro. Non si perde niente, ma chi aspettava riceve la cosa sbagliata. È
> scritto anche nel codice, e si chiuderà quando le schede sapranno dire «questo
> l'ho fatto per quella richiesta».

### Il telefono non perde più il computer

«Se chiudo l'app poi non si ricollega.» La causa era una sola: il telefono si
ricordava **un** indirizzo, e un indirizzo è una fotografia. Cambia la rete,
passi dal wifi ai dati, il computer riavvia il tunnel — e da lì «non
raggiungibile» per sempre.

Adesso il QR ne porta **tutti** — Tailscale, la rete di casa, il tunnel — e
l'app li prova finché uno risponde: prima quello che funzionava, poi gli altri
tutti insieme. Quando ne trova un altro, se lo ricorda.

**Tailscale è il primo della fila**, ed è la strada consigliata: funziona in
casa e fuori, è cifrato, e non mette niente su Internet. Basta averlo anche sul
telefono.

### Le parole

- **«Padrone» e «ospite» non ci sono più.** Si dice cosa uno **può fare** —
  «può chiedere», «può anche decidere» — non cosa è.
- **«Da fuori»** è diventato **Collegamento**.
- **«Come siamo messi»** è diventato **Stato della connessione**.
- «La fila» sono **I lavori**; «accetta» e «scarta» sono **fallo** e **lascia
  perdere**.

### Un invito per più persone

Chiesto: «più di venti persone collegate, di picco». Con un codice a testa
servivano venti giri al pannello, e ogni codice vive cinque minuti. Adesso un
invito può valere **per dieci persone**: si mostra una volta e lo inquadrano
tutti. Resta a tempo, che è la protezione vera.

### Windows che blocca, detto quando succede

Il messaggio del firewall prima si scriveva una volta all'accensione e non
cambiava più: chi sbloccava la porta continuava a leggere «Windows sta
bloccando» per sempre. Adesso la suite ricontrolla da sola ogni venti secondi, e
l'avviso sparisce quando sparisce il problema.

Corretto anche un errore di ragionamento: l'avviso non compariva se c'era
Tailscale. Sbagliato — una regola del firewall vale per **la porta**, non per la
scheda di rete, quindi blocca anche Tailscale. L'unico che lo scavalca è il
tunnel, perché quella connessione esce invece di entrare.

### Il motore si scalda da solo

Aprire DaProdFoto voleva dire aspettare che partisse Python, che si importasse
torch e che ComfyUI leggesse i suoi nodi: quaranta secondi in cui la finestra
c'era e non rispondeva. Adesso quei quaranta secondi il computer li spende
**mentre guardi l'hub**, e quando apri la scheda è già pronta.

Non carica pesi in memoria video: scalda il processo, non la scheda. Quelli
restano a chi genera davvero, uno alla volta.

---

### Cosa è provato e cosa no

**Provato davvero**: la console nuova, guidata in un browser vero contro un
gateway vero — accoppiamento, il semaforo che diventa rosso quando il firewall
blocca e verde quando no, i quadrati, l'invito per dieci persone, l'elenco di
chi è collegato, gli indirizzi con Tailscale davanti. Le prove del gateway sono
passate da 79 a **97**: il pannello, chi può fare cosa, l'invito multiplo,
togliere sé stessi. Compilano suite, pacchetti e APK.

Un difetto trovato e corretto proprio lì: il semaforo nascondeva l'avviso del
firewall quando c'era Tailscale.

**Da provare tu, e sono le cose che contano**:

- **accettare un lavoro dal telefono e vederlo partire** sul computer: è la
  ragione di tutto il giro, e non è mai girata contro un motore acceso;
- DaProdConnessione aperta davvero, dall'hub;
- il telefono che si ricollega dopo un cambio di rete;
- Tailscale sul telefono;
- il motore che si scalda da solo, e quanto fa risparmiare davvero.

---

## 0.6.0 — Il telefono è la suite, e la Storia si vede lavorare

**22 agosto 2026.** Nasce da una sessione di prove vere sulla 0.5.1, e da un
elenco di cose che non andavano detto tutto d'un fiato. Sono state prese una per
una. Le due grosse sono il telefono e la scheda Storia.

---

### Il telefono adesso mostra la suite, non un modulo

«Deve mostrare le pagine in stile della suite per pc», e «niente funziona sul
device a livello di risorse ma fa tutto il pc».

Le due frasi insieme decidono tutto. Se il telefono non calcola niente e il PC
calcola tutto, allora anche **l'interfaccia** deve stare sul PC. Quindi l'app
non disegna più moduli suoi: apre le pagine che il computer serve — le stesse
che vede il portatile — con le schede, la fila, e **la galleria**.

Cosa vuol dire in pratica:

- **si vede quello che il PC ha fatto**, senza scaricarlo prima. Le immagini si
  guardano, i video partono e si possono far scorrere avanti e indietro, i brani
  si ascoltano. Prima l'app diceva «pronta» e basta: per sapere com'era venuta
  bisognava salvarla nel telefono e aprire un'altra app;
- **c'è la fila, e chi è padrone accetta o scarta da lì**;
- **quando sul PC compare una scheda nuova, sul telefono c'è al collegamento
  dopo**, senza pubblicare un'app aggiornata.

Il tasto **tieni nel telefono** è rimasto dov'era: un'immagine finisce in
galleria, un brano fra la musica.

### All'avvio si sceglie chi sei

«All'avvio dell'app devo poter scegliere un user così da capire chi è chi.»

Prima il telefono aveva **un** collegamento solo, e il nome che arrivava al PC
era quello del modello Android: in una casa con tre persone la fila diceva tre
volte «SM-A536B». Adesso il telefono tiene un **elenco di persone**, ognuna col
suo collegamento: la si sceglie all'avvio, si cambia in due tocchi, e sul PC
ognuna compare col proprio nome.

Non è un'etichetta: **è una credenziale**. Chi è ospite resta ospite anche se il
telefono è di chi è padrone, e togliere una persona toglie davvero il suo
accesso da quel telefono. Con una persona sola non si chiede niente e si entra
dritti.

### E funziona anche da fuori casa

Nel pannello **Da fuori** c'è un secondo interruttore: **Anche da fuori casa**.
Acceso, la suite apre un tunnel in **uscita** verso Cloudflare e riceve un
indirizzo `https://…` che punta al gateway.

- **Niente porte da aprire sul router**, niente indirizzo di casa da sapere,
  niente account da fare.
- **Da fuori il traffico è cifrato** (HTTPS). Era la cosa che la roadmap chiedeva
  di fare *prima* del tunnel, e il tunnel è il modo in cui è stata fatta: in casa
  resta HTTP sulla wifi, come prima.
- La prima volta la suite scarica `cloudflared` (circa 40 MB) e lo dice mentre
  lo fa.

Due cose da sapere, e stanno scritte anche nel pannello: **l'indirizzo è
pubblico** — chi lo indovinasse arriverebbe alla pagina di accoppiamento, non ai
contenuti: senza token il gateway risponde di no a tutto, e il codice a otto
cifre vive cinque minuti con un tetto di dieci tentativi al minuto — e **cambia a
ogni accensione**, quindi gli inviti in corso si rifanno.

### Quando è Windows a bloccare, adesso te lo dice

Il guasto più silenzioso che questo pannello potesse avere: la suite dice «in
ascolto», il QR si inquadra, e dal telefono non arriva niente. Nei log non c'è
niente perché non è la suite — è il firewall di Windows, che blocca in entrata
senza dire niente a nessuno (di solito perché al primo avvio è comparso un
riquadro «Consentire l'accesso?» e ha ricevuto un «Annulla»).

Adesso la suite **guarda** se la regola c'è, e se manca lo scrive con un tasto
per rimediare: un riquadro di Windows, una volta sola. E se non vuoi toccare il
firewall, con «Anche da fuori casa» acceso non serve: la connessione la fa il
PC verso l'esterno.

---

### DaProdCinema, la Storia: adesso si vede lavorare

La scheda funzionava e non si vedeva niente. Quattro cose, tutte trovate
usandola davvero.

**La barra c'è.** Una clip sono minuti, e per tutti quei minuti l'elenco diceva
«in attesa» senza muoversi; il tempo compariva solo a scena finita. Adesso ogni
inquadratura ha la sua barra e dice cosa sta facendo — «genero il movimento»,
«rendo il suono» — e sopra l'elenco c'è la barra **del film**: a che scena siamo,
a che percentuale, e quanto manca. Sono due cose diverse e servono tutte e due:
la prima dice se il motore si è piantato adesso, la seconda se andare a dormire.

**Il video si vede appena esce.** Compare nella riga della sua scena, con i
comandi del lettore. Prima finiva sul disco e per sapere com'era venuta bisognava
andare in Galleria — che su novanta inquadrature vuol dire non guardarle.

**Il film si cuce da solo.** Quando l'ultima scena è pronta, la cucitura parte
senza premere niente: chi lascia lavorare il PC tutta la notte non è lì alle
quattro del mattino per premere un bottone. Il tasto resta, per rifarlo, e c'è
un interruttore per spegnere la cosa.

**Modello, formato e misura si scelgono qui.** Prima erano quelli della scheda
Crea, con scritto nell'interfaccia che era un pregio. Non lo era: in Crea si
prova, e provare vuol dire 480p — poi il film intero usciva in 480. Adesso la
Storia ha la sua resa, ricordata a parte, con il conto delle ore che cambia
insieme.

### Immagini e audio da dare alla storia

Nella Storia c'è un pannello dove trascinare una faccia, un posto, una voce. Ci
fanno due cose diverse, e sono scritte perché non si confondano:

- **il modello che scrive le scene le guarda**, se quello caricato in LM Studio
  sa vedere. Da lì scrive prompt che descrivono il personaggio che gli hai
  mostrato invece di inventarselo;
- **MiniMax H3 le usa dentro ogni inquadratura**, come riferimento vero. LTX 2.5
  no — non ha quegli ingressi — e la riga sotto al pannello lo dice invece di
  lasciar credere che finiscano nel video.

Se il modello caricato non sa guardare, la suite lo scrive in italiano invece di
far finta di niente.

### Si vede quando il modello sta pensando, e i token che escono

Un modello locale che ragiona su una scheda da 8 GB ci mette da venti secondi a
due minuti. In quei due minuti si vedeva un tasto spento: e un modello che pensa
e un modello piantato, da fuori, sono la stessa identica cosa.

Adesso compare una finestrella con un pallino che batte, il cronometro, **i
token che arrivano uno a uno** e quanti al secondo ne sta facendo. Quel numero
non è un vezzo: è il solo modo di capire che il modello caricato è troppo lento
per questa macchina.

Nasce nella Storia ma sta fra i pezzi comuni: le altre schede la agganciano con
due righe.

### La memoria del modello che scrive si libera a ogni risposta

Prima si liberava dopo quarantacinque secondi, con una ragione scritta: chi
lavora fa domande a raffica, e ricaricare quattro GB a ogni giro costa più di
quello che fa risparmiare.

Sul PC vero quella ragione non ha retto. Il modello che scrive e il modello che
genera vivono sulla **stessa** scheda da 8 GB, e quei quarantacinque secondi
sono esattamente la finestra in cui uno rilegge le scene appena scritte e preme
Genera: la generazione partiva con quattro GB e mezzo già presi.

Adesso appena il modello ha finito di scrivere, i suoi GB tornano liberi. Vale
in tutte le schede che chiedono alla suite: Cinema, Musica, Foto, Dream. Il
prezzo c'è ed è onesto dirlo: due domande di fila lo fanno ricaricare. È molto
meno di una generazione che muore a metà.

**Il Companion fa eccezione, e deve farla.** Lui parla a LM Studio per conto
suo, e sta *conversando*: liberare la memoria dopo ogni battuta vorrebbe dire
ricaricare quattro GB fra una frase e l'altra, cioè rendere impossibile la cosa
per cui esiste. Il suo modello resta caricato finché ci stai parlando — e viene
liberato lo stesso, senza che tu faccia niente, **nel momento in cui premi
Genera in un'altra scheda**: quel tasto svuota la scheda video di tutto quello
che c'è sopra, da sempre.

---

### Sotto il cofano

- **La console web è stata rifatta**, ed è la stessa pagina che apre il telefono:
  quattro sezioni — la suite, chiedi, la fila, la galleria — con i colori e la
  faccia dell'hub sul PC. Si serve da sé, senza chiamare niente da fuori.
- **Due rotte nuove nel gateway**: `/libreria` e `/libreria/file/:id`, con il
  supporto ai **pezzi** (`Range`). Senza quello un video in una pagina si può
  solo scaricare tutto prima di partire, e non si può spostare la barra di
  scorrimento.
- **Un biscotto di sessione** per le anteprime, perché un `<img>` non sa mettere
  un header. Vale **solo in lettura** ed è `SameSite=Strict`: tutto ciò che
  cambia qualcosa vuole ancora la credenziale nell'header, quindi la pagina di
  un altro sito non può far partire una generazione dal browser di chi è
  collegato. C'è una prova che lo tiene fermo.
- **Il QR porta un indirizzo completo**, schema compreso, e non più `ip:porta`:
  è quello che permette al telefono di parlare in HTTPS attraverso il tunnel. I
  vecchi QR continuano a funzionare in casa.
- **Le prove del gateway** sono passate da 57 a 79: chi sono, la libreria, i
  pezzi di un file, il biscotto e il CSRF che non passa.

---

### Cosa è provato e cosa no

Onestà, come sempre in questo file.

**Provato davvero**: la console, accoppiandosi da un browser vero contro un
gateway vero — la fila, i moduli costruiti dalle azioni, la galleria che carica
un'immagine attraverso il biscotto, il video chiesto a pezzi. Le 79 prove del
gateway e quelle dell'MCP. La compilazione di tutto, l'APK di debug e quello di
release.

**Da provare tu, e sono le cose che contano**:

- il **tunnel** che si accende davvero e un telefono che entra da fuori casa: qui
  non c'è una linea con cui provarlo;
- l'**app sul telefono**, che compila ma non è mai stata aperta su un apparecchio;
- la **Storia** contro il motore acceso: la barra, il video nella riga, la
  cucitura automatica;
- lo **scarico della memoria a ogni risposta** con LM Studio vero;
- le **immagini date al modello che scrive**, con un modello che sa vedere
  caricato in LM Studio;
- il tasto del **firewall**, che chiede l'amministratore a Windows.

---

## 0.5.2 — L'app del telefono si aggiorna da sola

**22 agosto 2026.** Chiesto da Cammo: «fai in modo che anche l'app abbia un menu
per aggiornarsi da sola».

In fondo all'app c'è un terzo tasto, **Aggiorna**. Lo premi, lei guarda se su
GitHub c'è una versione nuova, ti fa vedere cosa cambia, e se dici di sì la
scarica e la installa. Come fa già la suite sul PC, che si aggiorna da sé dalla
0.1.0.

Guarda anche da sola, ma **una volta al giorno al massimo e in silenzio**: se
non c'è niente non dice niente, se c'è compare una riga in cima che puoi
premere. Non è un'app che ti tira per la manica.

⚠ **È l'unica cosa che l'app manda fuori dalla tua rete**, ed è una domanda
senza niente dentro: «qual è l'ultima versione?». Tutto il resto — richieste,
risultati, notifiche — resta fra il telefono e il tuo computer, come prima.

### Perché serviva anche una chiave

Android rifiuta di aggiornare un'app se la **firma** non combacia con quella già
installata. Finora l'APK era firmato con la chiave di *debug*, che ogni computer
si genera per conto suo — e il computer che costruisce le Release pure. Ogni
versione aveva una firma diversa, quindi un aggiornamento automatico non avrebbe
potuto funzionare: avrebbe dato un generico «App non installata», e basta.

Adesso c'è una chiave stabile nel repository (`apps/mobile/firma-sideload.jks`),
con la sua password scritta lì accanto. **Non è un segreto e non deve esserlo**:
serve solo a far combaciare le firme fra una versione e l'altra. Non protegge da
niente — chiunque potrebbe firmare un finto «DaProd Suite» — ma poteva già farlo
prima con la chiave di debug, che è pubblica e uguale per tutti. Non aggiunge un
rischio, toglie un fastidio.

> ⚠ **Un'ultima volta bisogna disinstallare.** L'APK della 0.5.1 era firmato con
> la vecchia chiave, questo con quella nuova: Android non le fa combaciare.
> Disinstalla l'app e reinstalla la 0.5.2 dalla Release. **Da qui in poi gli
> aggiornamenti si fanno da soli** e questo non succede più.

Se il telefono non ti lascia installare, l'app ti porta lei nella schermata
giusta: è un permesso che su Android si concede una volta sola.

---

## 0.5.1 — L'indirizzo giusto, e il QR al primo click

**22 agosto 2026.** La 0.5.0 non funzionava, e per due motivi che si sommavano.
Trovati provando la suite vera sul PC di Cammo.

### Ti dava un indirizzo che il telefono non poteva raggiungere

Il tuo computer ha **quattro** indirizzi di rete:

```
100.88.254.19    Tailscale
172.18.32.1      scheda virtuale (Hyper-V)
192.168.1.8      Ethernet          ← l'unico che il telefono può usare
172.28.176.1     scheda virtuale (WSL)
```

La suite prendeva **il primo** che trovava, cioè Tailscale. Il QR conteneva
`100.88.254.19`, che dalla wifi di casa non esiste: l'accoppiamento non poteva
riuscire in nessun modo, e non c'era niente da fare di diverso.

Adesso li mette in ordine e sceglie quello di casa. E se sbaglia lo puoi
cambiare: sotto l'indirizzo c'è un menu con tutti quelli disponibili, ognuno con
scritto cos'è — «rete di casa», «scheda virtuale — il telefono non ci arriva»,
«rete virtuale tipo Tailscale — solo da chi ne fa parte». Cambiandolo il QR si
rifà, perché un QR è la fotografia di un indirizzo.

### «Accendi» non dava il QR

Premevi Accendi, comparivano un indirizzo e tre bottoni, e il QR — che è la
ragione per cui quel pannello esiste — voleva un secondo click che nessuno ti
diceva di fare.

Adesso **Accendi basta**: accende e ti mette lì il QR con il codice e il conto
alla rovescia. Se non c'è ancora nessun dispositivo collegato l'invito è da
padrone; dal secondo in poi è da ospite.

### L'app del telefono si scarica

Nella Release c'è **`DaProdSuite-telefono-0.5.1.apk`**, 5,6 MB. Prima bisognava
compilarsela, e non l'avevo detto abbastanza chiaramente.

È firmata con la chiave di **debug** di Android — non è la chiave di nessuno, è
quella che Android genera uguale su ogni computer. Serve solo a rendere l'APK
installabile; il telefono ti avviserà che viene da fuori dal Play Store, ed è
normale. Una chiave vera è roba tua: la password non può stare in un repository
pubblico.

⚠ Resta vero il resto: vale **dentro casa** e **non è cifrato**, e «accettata»
vuol dire «l'ho vista e va bene», non «sta partendo».

---

## 0.5.0 — La suite non è più solo quel computer

**Costruita il 21 agosto 2026.** Il PC dove gira la suite smette di essere
l'unico posto da cui la si usa: adesso la comandi dal telefono, dal browser di
un altro computer, e da un programma.

### Dal browser di un altro computer

C'è un pannello nuovo in fondo all'hub, **Da fuori**. Premi **Accendi** e ti dà
un indirizzo tipo `http://192.168.1.20:8790/`. Lo scrivi nel browser del
portatile, batti il codice di otto cifre che ti mostra, e da lì usi la suite del
PC fisso: chiedi un'immagine, un video, un brano, guardi cosa sta facendo la
scheda video, e ti scarichi i risultati.

**Serve proprio a quello.** Su un portatile la suite non gira bene — i modelli
vogliono la scheda video del fisso, e non c'è verso. Ma non ti serve che ci
giri: ti serve **comandare** quel PC, e per farlo basta un browser. Niente da
installare sul portatile, niente da configurare, e funziona anche da un tablet.

### L'app per il telefono

C'è un'app Android in `apps/mobile`. Inquadri il QR sullo schermo del PC e da lì
chiedi lavori mentre sei in giro.

- Se il PC in quel momento non c'è, **quello che scrivi resta sul telefono** e
  parte da solo quando torna raggiungibile.
- Quando un lavoro finisce, **arriva una notifica** — anche ore dopo, anche con
  l'app chiusa.
- Il risultato **te lo porti nel telefono**: un'immagine finisce in galleria, un
  brano fra la musica, un video in galleria. Non in una cartella dell'app da cui
  poi non lo ritrovi.

⚠ **L'app va compilata**, non c'è un APK da scaricare: serve Android Studio o
l'SDK, e le istruzioni sono in [apps/mobile/README.md](apps/mobile/README.md).

### Chi comanda resta chi sta al PC

Una richiesta che arriva da fuori **non fa partire niente da sola**. Compare nel
pannello **Da fuori**, e tu la accetti o la scarti. È voluto: su otto GB di
scheda video ci sta un modello per volta, e un telefono in tasca che può far
partire quattro generazioni «per provare» è un computer che non è più tuo.

Il primo dispositivo che colleghi diventa **padrone** e vede tutto; gli altri
sono **ospiti** e vedono solo le proprie richieste. Ognuno ha la sua chiave, e
toglierla a uno non tocca gli altri.

### Un'AI che usa il programma

Quello che avevi chiesto guardando Needle 2 — «vorrei che un'AI possa usare il
programma a suo piacimento, tipo MCP o altro» — adesso si può, tranne il modello.

C'è un **server MCP**: Claude Code (o qualunque agente che parli MCP) si collega
alla suite col codice di otto cifre come farebbe un telefono, e da lì può
chiedere immagini, video, brani, leggere la libreria e guardare la coda. Le
generazioni passano dalla stessa fila di tutti: anche a un'AI, il sì lo dai tu.

**Il pezzo grosso, però, è un altro**: adesso la suite ha **un elenco scritto
una volta sola di cosa sa fare**. Telefono, browser e agente leggono tutti
quello. Vuol dire che il giorno che la suite impara a fare una cosa nuova, il
telefono e il browser se la trovano da soli — senza aggiornare l'app.

⚠ **Needle 2 non c'è ancora**, e non è una dimenticanza: il modello va provato
sulle nostre azioni prima di prometterlo, perché è addestrato in inglese e le
nostre si chiamano in italiano. Nel frattempo si è scoperto che gira anche in
Node — quindi non toccherebbe l'ambiente Python, che era la preoccupazione.
Tutto scritto in [docs/AZIONI-E-MCP.md](docs/AZIONI-E-MCP.md).

### Cosa non è a posto, e va detto

- **Vale dentro casa, non da Internet.** Il collegamento è in rete locale e
  **non è cifrato**: chi è dentro la tua wifi e sa guardare il traffico vede
  quello che passa. Prima del tunnel verso Internet va cifrato, non dopo.
- **«Accettata» vuol dire «l'ho vista e va bene», non «sta partendo».** La
  richiesta cambia stato, ma non apre l'app e non fa girare il motore: quello lo
  fai tu. Il ponte fra una richiesta accettata e la generazione vera è il pezzo
  che manca perché «da fuori» voglia dire davvero da fuori.
- **Le notifiche sul telefono arrivano con un quarto d'ora di ritardo al
  massimo**: è il telefono che chiede, non il PC che chiama.
- **Niente di tutto questo l'hai ancora provato tu.** Da qui: le prove
  automatiche girano (`pnpm run prova`, novanta controlli fra gateway e MCP), la
  console web è stata guidata in un browser vero — accoppiamento, richiesta in
  fila, download — e l'app Android compila. Quello che non è mai successo è il
  giro completo dentro la suite: un telefono vero che inquadra un QR vero, e il
  gateway acceso da Electron invece che da un banco di prova.

### Cose che erano rotte

- Il pannello nuovo **spaccava l'hub**: un import senza `.js` e la pagina non si
  caricava più. Corretto prima che uscisse.
- Il pannello non si aggiornava da solo: una richiesta arrivata dal telefono
  compariva solo riaprendo la scheda.
- Il PC **non poteva decidere sulle proprie richieste** se non c'era un telefono
  collegato: cercava un padrone fra i dispositivi accoppiati e non ne trovava.
- L'invito si poteva creare a gateway spento, e il QR conteneva un indirizzo
  vuoto: adesso accendere è compreso nel gesto.
- Il codice di invito non diceva quanto gli restava da vivere. Adesso c'è il
  conto alla rovescia, e quando scade sparisce.

---

## 0.4.6 — La Storia, e H3 che parte come si deve

**Costruita il 21 agosto 2026.** La scheda che mancava per fare un film invece
di una clip, e MiniMax H3 che smette di presentarsi male.

### La Storia: mezz'ora di video, un'inquadratura per volta

C'è una scheda nuova, **Storia**. Ci scrivi in italiano cosa deve raccontare —
come lo diresti a una persona — dici quanti minuti deve durare, e il modello di
LM Studio lo spezza in inquadrature: una per una, con il prompt in inglese, il
movimento di camera e la luce. Le rileggi, cambi quelle che non ti piacciono, e
premi Genera. Alla fine **«cuci il film»** le mette in fila in un mp4 solo.

**Perché non è mezz'ora in una ripresa sola.** Perché non si può, non su una
scheda da 8 GB e non con i modelli che ci sono oggi — la ricerca sta in
[ROADMAP.md](docs/ROADMAP.md). Ma un film non è mai stato una ripresa sola: sono
cento inquadrature con gli stacchi in mezzo, e cento inquadrature sono cento
clip, cioè quello che DaProdCinema già sapeva fare.

⚠ **Il tempo c'è scritto prima che tu prema.** Sotto ai due numeri compare
quante inquadrature vengono fuori e quante ore ci vogliono — e non è una stima
inventata: appena c'è una scena vera, il conto si rifà sui tempi tuoi. Mezz'ora
di film è una notte di lavoro. Si preme la sera e si guarda la mattina.

Si genera **una scena per volta**, e serve: se chiudi l'app, se manca la
corrente, se premi «ferma», quello che è fatto resta. Ripremi Genera e riprende
da dov'era, invece di ricominciare.

### MiniMax H3: due pulsanti, e adesso parte da quello giusto

Fino a ieri H3 generava a **quattro passi**, sempre. È il modo veloce, e su
questo modello si vede — soprattutto nel movimento: scie, sfarfallio, cose che
si rimpastano fra un fotogramma e l'altro. Chi apriva l'app giudicava H3 da
quello, e giudicava male.

Adesso sopra al formato ci sono **due pulsanti**:

| | Cosa fa |
|---|---|
| **20 passi** | come il modello è stato addestrato, senza LoRA. È quello di partenza. In avanzati si può portare da 12 a 40 |
| **4 passi** | cinque volte più veloce, con il LoRA turbo. Per provare un'idea, non per il video buono |

**E i quattro passi sono fatti come vanno fatti**, che è la parte che era
giusta anche prima e vale la pena scrivere: H3 genera video e audio *insieme ma
su due orologi diversi* (scarti di rumore 12 e 3), e con un orologio solo
l'audio viene sovra-campionato ed esce sporco. Il grafo usa `ModelSamplingAV`,
che è il supporto nativo arrivato in ComfyUI ad agosto — prima ci voleva un
nodo di terzi — con `euler`, `simple` e il LoRA a forza 1,0.

⚠ **Quello che non si può aggiustare, e va detto.** Il LoRA turbo per la
variante *ref2v* — la nostra — è fermo alla **v0.1**, mentre la variante *fl2v*
ha già la v1.0 e la v1.1. Non è che non abbiamo trovato il file giusto: per
ref2v, oggi, un file migliore non esiste. Per questo i quattro passi restano il
pulsante veloce e non il modo di partenza, e il cursore adesso arriva a **otto**
— da sei in su il movimento tiene molto meglio.

Il modello, invece, resta quello: la versione potata che usiamo (11,0 GB) è
**già la più piccola** che esista per questa variante. Cercato il 21 agosto: la
fl2va dello stesso repo pesa 12,5 GB, la W4A8 di AX1Y2JP 12,5.

---

## 0.4.5 — Il video non muore più a metà, e il cronometro dice la verità

**Costruita il 21 agosto 2026.** Tre cose viste generando con la 0.4.4.

### Chiedere il secondo video non ammazza più il primo

**Il difetto.** Premere *Genera* svuota la scheda video: su 8 GB è quello che
permette a LTX di far entrare 23 GB di pesi passando dalla RAM. Solo che
svuotava **sempre**, anche quando il motore stava ancora lavorando — e i pesi
venivano tolti da sotto ai piedi del video in corso. Quel video non moriva
subito: andava avanti fino all'ultimo passaggio e poi si spaccava lì, con
`Nel nodo VAEDecode: Input type (torch.cuda.HalfTensor) and weight type
(torch.HalfTensor) should be the same` — che tradotto vuol dire: i dati sono
sulla scheda, i pesi no.

Succedeva in un caso solo, ed è quello normale: **chiedere la clip successiva
mentre la prima sta ancora andando.**

**Adesso** se il motore ha qualcosa in mano non si tocca niente, e il lavoro
nuovo si mette in fila: userà comunque gli stessi pesi di quello in corso, per
cui non c'era niente da liberare. Vale per **DaProdCinema, DaProdMusica e
DaProdFoto**, che facevano tutte e tre la stessa cosa.

### Un tempo solo, da quando premi a quando il file è pronto

Il cronometro partiva quando il **motore** prendeva in mano il lavoro, non
quando lo chiedevi tu. Con due clip in coda voleva dire vederlo azzerarsi fra
una e l'altra, e leggere «12 s» dopo tre minuti di attesa.

Adesso ce ne sono due, e si vede quello giusto:

- **quello che scorre** parte quando premi Genera e non si azzera mai — in coda
  scorre già («in coda · 1:20»), e quando il motore parte continua da lì;
- **«~2:10 alla fine»** invece guarda solo il tempo di lavoro vero, se no la
  stima avrebbe contato anche l'attesa e avrebbe detto il triplo.

Il «fatto in» scritto sotto al video è il tempo intero, dalla pressione del
tasto al file sul disco. È il numero che serve per farsi un'idea di quanto
costa davvero una clip.

### LTX arriva a 20 secondi

Il cursore si fermava a dieci per prudenza. Venti è il limite vero del modello
— è quello che Lightricks dichiara per la 2.5, ed è dove si ferma di serie la
testa che indovina la durata — e il distillato a otto passi è abbastanza veloce
da renderli sensati. Sopra i dieci secondi compare la riga che dice di stare a
720p: raddoppiando i secondi raddoppiano i fotogrammi, e con loro la memoria.

MiniMax H3 resta a 15, e non è prudenza: è stato addestrato fra 124 e 362
fotogrammi, cioè fra 5 e 15 secondi. Sopra, nessuno sa cosa fa.

---

## 0.4.4 — Quello che hai già fatto resta dov'è

**Costruita il 21 agosto 2026.** Un difetto solo, visto usando la 0.4.3, ma si
vedeva su tre schede.

### Il video non si ferma più mentre qualcosa sta generando

**Il bug.** Mentre un lavoro era in corso, il pannello *Sessione* si rifaceva
da capo una volta al secondo — serviva a far scorrere il tempo trascorso e la
barra di avanzamento. Solo che rifarlo da capo voleva dire buttare via e
ricostruire **anche tutto quello che ci stava dentro**: i video già fatti, le
copertine, i lettori. Il risultato era che a DaProdCinema un video ripartiva da
zero ogni secondo, e provare a guardarlo mentre il prossimo generava era
impossibile. A DaProdMusica e DaProdFoto succedeva la stessa cosa alle
copertine e alle ultime immagini, che ricaricavano di continuo.

**Adesso ogni riga è cosa sua.** Il pannello confronta quello che c'è con
quello che ci deve essere, riga per riga: il lavoro in corso si aggiorna dove
sta — cambiano il tempo e la barra, il resto non si tocca — e i risultati già
usciti restano esattamente dov'erano. Un video che stai guardando continua a
suonare anche quando ne arriva uno nuovo sopra di lui.

Vale per **DaProdCinema, DaProdMusica e DaProdFoto**. DaProdVoce lo faceva già
così dal primo giorno, ed è da lì che è venuta la soluzione.

---

## 0.4.3 — DaProdVoce, e la Galleria di DaProdCinema

**Costruita il 21 agosto 2026.** Una scheda nuova — **DaProdVoce**, che legge
quello che scrivi con la voce che scegli tu — e tre cose viste usando la 0.4.2:
la Galleria che a DaProdCinema mancava, MiniMax H3 che adesso genera anche dal
solo testo, e **Anima v2** fra i modelli di DaProdFoto.

### DaProdVoce: l'ottava scheda

**Scrivi una frase e te la legge.** Anche un testo lungo: viene tagliato dove
finiscono le frasi, letto un pezzo per volta e ricucito con un respiro in mezzo,
senza che tu debba fare niente.

**E può farlo con la voce che gli dai tu.** Nella scheda **Voci** metti un pezzo
di audio in cui si sente parlare qualcuno — dai cinque ai quindici secondi
bastano — e **la trascrizione di quello che dice**. Da quel momento quella voce
sta nel menu. Non c'è niente da addestrare: il modello la copia al volo, ogni
volta.

⚠ **La trascrizione non è un'etichetta**, ed è la cosa da sapere di questa
scheda: è il modo in cui il modello capisce come quella voce pronuncia le parole.
Scriverla sbagliata peggiora la copia; lasciarla vuota dà un'altra voce. Per
questo il campo è obbligatorio.

| Modello | Da scaricare | Come legge l'italiano |
|---|---|---|
| **Audio8 TTS 0.1B** | 1,58 GB, installato con l'app | ogni tanto storpia una parola |
| **Audio8 TTS 0.6B** | 2,39 GB, dal menu dentro l'app | **tre volte meglio** |

I due modelli sono gli stessi con due taglie diverse. Il piccolo è quello che
parte; il grande, in italiano, sbaglia tre volte meno (4,8 contro 14,5 nella
tabella di chi l'ha fatto) e non è più lento. Se l'italiano ti serve davvero,
scarica quello.

**Un audio già in libreria può diventare una voce**: il tasto «prendilo dalla
libreria» pesca fra tutto quello che hanno fatto le altre app. E dalla Galleria
di DaProdVoce il tasto **«a Cinema»** manda una voce dentro DaProdCinema, dove
diventa un riferimento audio di MiniMax H3 senza passare da salva-cerca-ricarica.

**È l'unica app della suite che non pretende la scheda video per sé.** Sono uno o
due GB di pesi, il pezzo più piccolo di tutta la suite, quindi si apre accanto
alle altre invece di spegnerle. E dopo cinque minuti che non la usi, il modello
lascia la memoria da solo — c'è anche un tasto in alto per farlo subito.

Sui tempi va detto com'è: **una frase di cinque secondi ne prende venti o
trenta** sulla scheda video. Non è un modello lento, è un modello piccolo che
lavora senza i nuclei compilati che lo farebbero volare.

### DaProdCinema: c'è la Galleria

Mancava, e si sentiva: sotto la sessione c'erano gli ultimi sei video, e quello
di ieri l'altro esisteva solo dentro Esplora risorse. Adesso c'è una scheda
**Galleria** con tutti i video fatti, il conteggio accanto al nome, e per
ognuno: guardalo a schermo intero, salvane una copia dove vuoi, aprilo nella
cartella, buttalo via.

**E c'è il tasto «riferimento».** Un video fatto qui è esattamente quello che
MiniMax H3 vuole in pasto — un movimento di camera da copiare, un ambiente, una
voce — e con un clic torna dentro fra i riferimenti, senza salvarlo e
ricaricarlo a mano.

### MiniMax H3 genera anche dal solo testo

Era l'app a impedirlo, non il modello. Il ragionamento era: quaranta GB di
modello per fare quello che LTX 2.5 fa con ventitré è tempo buttato. Vero a
metà, e comunque **una decisione presa al posto di chi la suite la usa**: H3
legge il prompt con un Qwen3-VL da 32 miliardi di parametri, e c'è chi lo vuole
proprio per quello.

Adesso il tasto Genera funziona, e il consiglio resta scritto sotto ai riquadri
— dove si legge, senza spegnere niente.

### DaProdFoto: c'è Anima v2

Anima cresciuta: da 28 a 40 blocchi, 2,9 miliardi di parametri invece di 2, e un
milione e settecentomila immagini di addestramento in più, con conoscenza
aggiornata a luglio 2026. Disegna meglio, soprattutto anime e illustrazione.

**Costa 3,1 GB e basta**, perché divide con Anima Turbo il text encoder e il VAE:
chi ha DaProdFoto o DaProdMusica installate scarica solo il modello. Si prende
dal menu dentro l'app, come FLUX.2.

Non sostituisce niente: Anima Turbo resta quella che parte, perché è distillata e
fa un'immagine in pochi passi. Anima v2 ne vuole da 28 a 50 e lavora a CFG 4 —
cioè **il negativo torna a contare davvero**, e la riga sotto la casella adesso
lo dice per il modello che hai scelto.

### Cosa c'è sotto, per chi tiene il conto

**Una libreria in versione diversa, solo per DaProdVoce.** Il modello Audio8 si
porta dentro il proprio codice, scritto per `transformers` 4.57; l'ambiente della
suite ha la 5.15, che è la versione con cui girano gli altri sei motori. Le due
non vanno d'accordo, e il modo in cui non vanno d'accordo è il peggiore: non un
errore, ma **una voce che non smette più di parlare**.

Le strade sbagliate erano due — abbassare la versione per tutti (cioè rompere sei
motori per farne funzionare uno, la notte del 19 agosto raccontata in
`versioni.txt`) o un secondo ambiente Python intero (altri 2,5 GB di torch).
Quella presa è la terza: **127 MB di librerie in una cartella a parte**, che se
le mette nel percorso soltanto il processo di DaProdVoce. L'ambiente condiviso
resta identico a prima, e gli altri motori non sanno nemmeno che esista.

⚠ **Cosa non è stato provato.** Il motore di DaProdVoce sì: modello caricato,
voce clonata, file scritti, testo lungo tagliato e ricucito, tutto sul PC di
Cammo. **L'app dentro la suite no** — la finestra, il menu dei modelli, lo
scaricamento dei pesi dall'hub e le due schede Voci e Galleria sono da provare
aprendo il programma. Stessa cosa per la Galleria di DaProdCinema e per Anima v2,
che sono state scritte e compilate ma non aperte.

⚠ **DaProdVoce non ha ancora la sua illustrazione né la sua icona**: nell'hub la
scheda mostra il colore dell'app al posto del disegno, e la finestra usa l'icona
della suite. Si generano con Anima a motore acceso
(`node apps/shell/scripts/genera-copertine.cjs voce` e
`pnpm --filter @daprod/shell icone`), e vanno fatte da qui.

---

## 0.4.2 — DaProdCinema da capo, e un tasto che non si pianta

**Costruita il 21 agosto 2026.** Due cose, e tutte e due nascono da quello che
hai visto usandola: DaProdCinema rifatto da capo, e il tasto **Crea** di
DaProdMusica che non resta più premuto a vuoto.

### DaProdCinema: rifatto da capo, e adesso fa una cosa sola

**Il video musicale automatico non c'è più.** La scheda prendeva una canzone
dalla libreria, ne leggeva i `[Verse]` e i `[Chorus]`, scriveva una scaletta di
diciassette inquadrature e le girava una dopo l'altra. Era una bella idea
costruita **sopra a una generazione base che non aveva mai funzionato**: nel
grafo di LTX 2.5 il latente che tiene insieme video e audio non veniva separato
prima di decodificarlo, e quello non è un video brutto, è un errore del motore.
Diciassette inquadrature di un pezzo che non gira sono diciassette errori.

Adesso la scheda fa **la generazione base, e solo quella**: scrivi cosa vuoi
vedere, scegli forma e misura, premi. Il video musicale torna quando ci sarà
sotto qualcosa che ha girato davvero.

**Il modello si sceglie per primo**, in cima e fuori da tutto il resto — come in
DaProdMusica e in DaProdFoto. Non è una preferenza fra le altre: decide cosa
puoi dargli in pasto, quanto può durare la clip e quanti passi ci vogliono.

| Modello | Da scaricare | Da cosa parte |
|---|---|---|
| **LTX 2.5 22B distillato** | 23,2 GB | testo, e se vuoi **il primo e l'ultimo fotogramma** |
| **MiniMax H3 (riferimenti)** | 41,6 GB | testo più **immagini, video e audio di riferimento** |

**LTX 2.5: da testo, o da due immagini.** Metti solo la prima e il video parte
da lì; mettile tutte e due e diventa il passaggio da una all'altra; non mettere
niente e se lo inventa dal testo. Sono facoltative tutte e due.

**MiniMax H3: i riferimenti.** Qui cambia il modo di ragionare — non «comincia
così», ma «questa è la faccia, questo è il posto, questo è il movimento, questa è
la voce». Fino a **nove immagini, tre video e tre audio**, e i video possono
portarsi dietro la loro colonna sonora.

E c'è una cosa da sapere, perché senza non funziona: **i riferimenti vanno
chiamati per nome nel prompt**. Il modello riceve dei file e nessuna istruzione
su cosa prendere da quale, a meno che tu non scriva «the woman in `<Picture 1>`
walks through `<Picture 2>`, camera moves like `<Video 1>`». Ogni riquadro ha la
sua etichetta scritta sopra: **cliccala e te la scrivo nel prompt** dove hai il
cursore. La regola con cui si numerano è di quelle che a mente non si tengono —
la colonna sonora di un video prende un numero d'audio *prima* degli audio
sciolti — e infatti il conto lo fa l'app.

**Formato e risoluzione come in DaProdFoto**: due file di pulsanti, 16:9 · 9:16 ·
4:3 · 1:1 per la forma, 480 · 720 · 1080p per la misura. Accanto ci sono i pixel
veri e **quanto costa**: il 720 è circa 2,3 volte il lavoro del 480, il 1080p
circa 5,2. Su una scheda da 8 GB quel numero è la differenza fra una pausa caffè
e un pomeriggio.

**Il video finito resta lì sotto**, con i comandi del lettore — metà del
risultato è il suono, e senza comandi non si sente. Riaprendo la scheda ci sono
ancora gli ultimi che hai fatto.

**Di MiniMax H3 cambia il file da scaricare**, e va detto perché sono GB: la
suite adesso prende la variante **ref2va** (11,0 GB) invece della fl2va (11,7).
Sono due rifiniture diverse dello stesso modello — una fa primo e ultimo
fotogramma, l'altra fa i riferimenti — e primo e ultimo fotogramma li fa già LTX
con metà del peso. Se avevi scaricato la fl2va nella 0.4.1 puoi cancellare due
file: `minimax_h3_fl2va_pruned_w4a8_mixed.safetensors` da `diffusion_models` e
`minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors` da `loras`.

⚠ **Non è ancora uscita una clip vera.** I due grafi sono stati rifatti sui nodi
del motore che hai installato e ricalcati sul flusso ufficiale di Lightricks per
la 2.5 distillata — scala di rumore compresa, che è il pezzo che il grafo
precedente sbagliava insieme al latente — e l'interfaccia l'ho provata pezzo per
pezzo in un browser. Ma da lì a «esce un mp4» c'è di mezzo la tua scheda video, e
LTX 2.5 lo hai già sul disco: **è la prima cosa da provare.** Comincia con
480, cinque secondi, senza immagini.

### DaProdMusica: «Crea» non resta più premuto a vuoto

**Il difetto**: premevi Crea e non andava mai avanti. Nessun errore, niente in
coda, niente da nessuna parte — con tutti e tre i modelli.

Prima di mandare il brano al motore la scheda fa due cose che non si vedono:
spegne il modello che scrive in LM Studio e svuota la scheda video. La prima
passa dal comando `lms`, e quel comando **non aveva una scadenza**: se non
rispondeva — LM Studio chiuso a metà, il suo servizio che non riparte — si
restava lì per sempre. Un tasto lento e un tasto rotto, da fuori, sono la stessa
cosa.

Adesso: `lms` ha una scadenza (otto secondi per la domanda, trenta per lo
spegnimento), scaduta la quale si tira dritto e si genera lo stesso — al massimo
con la scheda meno libera del previsto, che è molto meglio che non generare. E
**il tasto racconta cosa sta facendo** mentre lo fa: «libero la memoria…»,
«disegno la copertina…», «mando al motore…». Vale anche per «Solo nuova resa».

Stessa scadenza in DaProdFoto e in DaProdCinema, che passano di lì uguale.

**E un brano finito non si perde più.** Se il messaggio di «ho finito» si perdeva
per strada — succede quando la connessione col motore si riapre — il brano era
stato generato davvero ma spariva dalla sessione senza mai comparire in libreria.
Adesso, prima di buttare via un lavoro, si guarda cosa ha prodotto: se c'è un
file, si conclude come se il messaggio fosse arrivato. Era già così in
DaProdFoto, adesso è così anche qui.

---

## 0.4.1 — Il modello si sceglie per primo

**Pubblicata il 21 agosto 2026.** Il giro dopo la 0.4.0, e quasi
tutto viene da quello che hai visto usandola: il modello in cima invece che in
fondo, il 4 bit che se ne va, la lingua del canto a pastiglie, DaProdCinema che
torna ai modelli decisi, e una barra che dice cosa sta arrivando mentre arriva.

### DaProdMusica: la scelta del modello in cima, e il 4 bit via

**Il modello si sceglie per primo.** Prima stava in fondo, dentro «Parametri»,
cioè dopo che avevi già scritto stile e testo — ed è la scelta che cambia tutte
le altre. Adesso è il primo riquadro della scheda Crea, con sotto la sua riga di
spiegazione e, se manca dal disco, il tasto per scaricarlo.

**Il MiniMax a 4 bit non c'è più.** Era la voce «leggera»: 700 MB risparmiati su
uno scaricamento da otto GB, in cambio della parte che si sente — il modello di
diffusione è quello che trasforma i token in suono. Resta l'int8, che è lo
stesso modello quantizzato meglio. Se avevi scelto il 4 bit ti ritrovi
sull'int8 senza fare niente, e `minimax_music3_dit_w4a8.safetensors` lo puoi
cancellare dalla cartella dei modelli: sono 1,8 GB che non serviranno più.

**Parte ACE-Step 1.5 Turbo.** Chi apre l'app per la prima volta trova lui, e non
MiniMax: otto passi invece di trenta, e sulle parole cantate si capisce meglio.
Chi aveva già scelto a mano tiene la sua scelta.

**Il decode a blocchi parte spento.** Era acceso, e nei punti di attacco fra un
blocco e l'altro si poteva sentire. Resta negli avanzati: accendilo se un brano
lungo si ferma per memoria finita, che è la cosa per cui esiste.

### La lingua del canto, a pastiglie sopra il testo

Le lingue principali sono dodici pastiglie sopra la casella del testo, con
l'italiano per primo. Prima era un menu a tendina in fondo agli avanzati, che
compariva **solo con ACE-Step scelto** — cioè era invisibile proprio a chi aveva
il problema.

I due modelli la ricevono in due modi diversi, e sotto le pastiglie c'è scritto
quale dei due:

- **ACE-Step** ha una casella sua: canta nella lingua che scegli.
- **MiniMax Music 3** no, non ce l'ha proprio. Quindi la lingua finisce nella
  descrizione dello stile, insieme alla richiesta di **scandire le parole** —
  che è il difetto per cui questa cosa è stata fatta. Aiuta, non è un
  interruttore: se dopo qualche prova la voce continua a impastarsi, ACE-Step su
  quello va meglio.

### DaProdCinema: via Wan, dentro LTX 2.5 e MiniMax H3

**Wan 2.2 è uscito dalla suite.** Era entrato nella 0.4.0 al posto dei due
modelli che erano stati decisi, perché costa 18 GB invece di 23 e 42 e su una
scheda da 8 GB gira meglio. Ragione vera, scelta non nostra: adesso nel menu ci
sono i due di prima.

| Modello | Da scaricare | Com'è |
|---|---|---|
| **LTX 2.5 22B distillato** | 23,2 GB | quello che parte: otto passi, e fa il video **col suono dentro** |
| **MiniMax H3 (FL2VA + turbo)** | 42,3 GB | quattro passi grazie al LoRA turbo, ma 25 GB sono il solo text encoder |

I pesi sono i più compressi che il motore sa caricare da sé — W4A8 ConvRot, lo
stesso formato con cui gira già MiniMax Music 3 — ed è la cosa vera presa da
**WanGP**: non un modello, ma il modo di far entrare modelli enormi in poca
memoria.

⚠ **Nessuno dei due è stato provato su una clip vera**, e va detto chiaro: i
grafi sono verificati contro quello che il motore dichiara (nodi che esistono,
ingressi tutti a posto, niente collegamenti nel vuoto), ma da lì a «esce un mp4»
c'è di mezzo uno scaricamento da 23 GB e una clip girata. Sulla 4060 da 8 GB
tutti e due lavorano spostando i pesi fra scheda e RAM: aspettati minuti a clip,
non secondi. **Prima prova: una sola inquadratura, misura Provino.**

Se avevi già scaricato Wan, i suoi tre file (18,1 GB) restano sul disco e non
servono più a niente: `wan2.2_ti2v_5B_fp16.safetensors`,
`umt5_xxl_fp8_e4m3fn_scaled.safetensors` e `wan2.2_vae.safetensors`.

### Una barra per quello che sta arrivando, in tutte le app

Quando scarichi un modello **da dentro un'app** adesso vedi una barra vera: a
che punto è, quanti GB su quanti, a che velocità, quanto manca e un tasto per
fermarla. Prima, tranne che in DaProdFoto, c'era scritto «Scarico… l'avanzamento
è nell'hub»: cioè per sapere se stavano arrivando dodici GB dovevi lasciare
quello che stavi facendo e andare a guardare da un'altra parte.

- **DaProdMusica**: sia per il modello musicale sia per Anima (le copertine).
- **DaProdCinema**: qui sono decine di GB, ed è dove serviva di più.
- **DaProdFoto**: la barra c'era già; adesso è la stessa delle altre.
- **Nell'hub**, nel pannello Modelli, al posto della riga di testo.
- **DaProdDream** la aveva già per conto suo.

Il riquadro è **uno solo** scritto una volta in `packages/ui`: la stessa cosa in
tutte le app, e la prossima app che scarica qualcosa ce l'ha senza scriverla.

---

## 0.4.0 — DaProdCinema, e un secondo modo di fare musica

**Pubblicata il 20 agosto 2026.** La settima scheda, un secondo
modello musicale, e il traduttore che finalmente risponde.

### DaProdCinema: da una canzone al suo video

**C'è la settima scheda**, ed è la prima che non viene da un programma già
esistente: le altre sei sono porti — Flux Klein Studio, MinimaxMusica, LeapTalk —
questa nasce qui.

Come funziona: scegli un brano dalla libreria, di solito uno fatto in
DaProdMusica. La scheda legge i suoi `[Verse]` e `[Chorus]` e scrive **la
scaletta**: una riga per inquadratura, con quanto dura, cosa deve succederci
dentro e come si muove la camera. Poi gira una clip per riga, una per volta, e
alla fine monta tutto sopra la canzone.

**La struttura della canzone non viene indovinata: viene letta.** È il vantaggio
che i tentativi precedenti non potevano avere — l'hai scritta tu nei tag, e
quindi non serve nessuna analisi del battito che poi sbaglia.

**Cosa decide il programma e cosa decidi tu.** La funzione di ogni sezione e il
movimento di camera stanno in una tabella scritta a mano: l'apertura stabilisce
il mondo con un campo lungo fermo, la strofa mostra il dettaglio con una lenta
spinta in avanti, il ritornello è il picco con una corsa bassa. Non lo decide un
modello, perché quando lo decideva un modello il ritmo veniva sbagliato — il
climax bruciato all'inizio e la chiusura vuota. Tu decidi il **look**: una riga
in inglese, uguale in tutte le clip, ed è quella che tiene insieme il video.

**Le sezioni lunghe diventano più inquadrature.** Una strofa da trenta secondi
non è una clip da trenta secondi: sono cinque tagli che cambiano il verso della
camera, come in un video musicale vero.

**Le inquadrature si attaccano.** L'ultimo fotogramma di una diventa il primo
della successiva, e si può spegnere. È la differenza fra un video e diciassette
cartoline.

Il modello è **Wan 2.2 TI2V 5B** (18,1 GB). La roadmap aveva scelto MiniMax H3 e
LTX 2.5, e i loro nodi ci sono davvero nel motore — ma LTX 2.3 è un modello da 22
miliardi di parametri che pesa 23 GB, più un Gemma da 12B per leggere il prompt,
e sulla tua scheda da 8 GB non è «lento», è un'altra categoria di macchina. Il 5B
è l'unico che qui gira, ed è anche l'unico che fa testo→video **e**
immagine→video con lo stesso file, che è quello che serve per attaccare le clip.

**Quanto ci mette, misurato sulla tua 4060.** Una clip da 5 secondi a 640×352:

| Passi | Una clip | Un video da 90 s (17 inquadrature) |
|---|---|---|
| 30 | 256 s (col modello da caricare) | ~1 ora e 10 |
| 10 | 115 s | ~33 minuti |

**Questa è la cosa da provare**: i numeri veri li fai tu, e poi si decide se
conviene alzare la misura o scendere di passi.

⚠ **Il montaggio finale non è mai stato provato su clip vere.** Il grafo è
verificato contro quello che il motore dichiara — nodi che esistono, ingressi
tutti a posto — ma da lì a «esce un mp4 con la canzone sopra» c'è di mezzo un
video intero girato, cioè più di mezz'ora di scheda video. È la prima cosa da
guardare quando provi.

### DaProdMusica: ACE-Step 1.5, accanto a MiniMax

Il menu che diceva «Qualità del suono» adesso dice **Modello**, e ha quattro voci
invece di due: le due di MiniMax Music 3 che c'erano già, più **ACE-Step 1.5
Turbo** e **XL Turbo**. Non sono una versione più fine dello stesso — sono un
altro modo di fare una canzone, in otto passi invece di trenta.

- **Turbo** pesa 4,8 GB e sta tutto nella scheda video.
- **XL Turbo** pesa 10 GB: gira lo stesso, spostando i pesi fra scheda e RAM.
- Tutti e due dividono gli stessi due text encoder e lo stesso VAE, quindi il
  secondo costa molto meno del primo.

Si scaricano dal menu stesso, senza tornare nell'hub, come già fa DaProdFoto con
FLUX.

**Negli avanzati adesso vedi quello che il modello scelto usa davvero**: il Top-K
con MiniMax, e **battito, tonalità, tempo e lingua del canto** con ACE-Step. E i
passi si spostano da soli sul valore giusto: trenta a un modello turbo da otto
passi vuol dire aspettare quattro volte tanto per la stessa canzone.

**Provato**: un brano da 20 secondi con ACE-Step Turbo, 91 secondi col modello da
caricare e 28 a modello caldo.

### Il traduttore di DaProdFoto risponde alla prima

Era rotto, e in un modo che non si vedeva: **la prima traduzione di ogni sessione
non rispondeva mai**. L'app aspettava due minuti e poi mandava l'italiano al
modello, che è come non tradurre.

Il modello si caricava benissimo. Era la riga di registro che diceva «pronto» e
la freccia dentro quella riga: su Windows quel registro non sa scrivere `→`, e
l'errore veniva scambiato per un caricamento fallito. Adesso è a posto, e la
stessa riparazione vale per **tutti i motori** — fino a oggi ogni parola
accentata nei registri arrivava anche storta.

**E traduce meglio.** Il traduttore è passato da 330 MB a 576 MB, stesso tipo di
modello ma la versione grande. Quello piccolo traduceva «luce calda» con *hot
light*, che a un modello di immagini dice un'altra cosa; il grande dice *warm
light*, e *windowsill* invece di *sill*. Se hai ancora solo il piccolo continui a
usare quello finché non scarichi l'altro.

*Prima traduzione: 5,4 secondi. Le successive: mezzo secondo.*

### DaProdIoDigitale, attaccato

Era l'unica scheda con uno spazio nel nome. Adesso si scrive come tutte le altre.

---

## 0.3.4 — DaProdFoto: il ritocco che rifà tutto, e il traduttore che si vede

**Pubblicata il 20 agosto 2026.** Il giro dopo la 0.3.3, sempre in
DaProdFoto: il ritocco che sa rifare anche tutta la foto, e il traduttore che
smette di essere un mistero.

### Il ritocco: **inverti**, e senza pennellate si rifà tutta

- **«inverti»** scambia dipinto e non dipinto. Dipingi il soggetto, premi
  inverti, e si rifà tutto lo sfondo — invece di passare il pennello su tutto il
  resto lasciando buchi lungo i bordi. I bordi sfumati restano sfumati.
- **Senza niente di dipinto viene rifatta tutta la foto**, tenendone la forma:
  è il modo per cambiare la luce, la stagione o lo stile di un'immagine senza
  ridisegnarla da capo. Prima era un errore («Dipingi la zona da rifare, poi
  riprova»), cioè l'unica risposta era pennellare a mano tutta l'immagine.
- Il tasto dice quale delle due sta per fare: **«Rigenera la zona»** o
  **«Rigenera tutta la foto»**.

### Il seed si legge

Nel menu avanzati la casella del seed era larga tre cifre su dieci: c'era il
numero, ma non si vedeva. Adesso è larga il doppio e le cifre stanno in colonna.

### Il traduttore: si vede, dice a che punto è, e non si pianta più

Chi traduce l'italiano in inglese prima di generare **non è un modello di
linguaggio e non passa da LM Studio**: è un traduttore vero e proprio — Marian
`opus-mt-it-en`, 74 milioni di parametri, 330 MB — che gira dentro al motore,
sul tuo computer, e non chiede niente a nessuno. Era già così, ma da fuori non
si vedeva. Adesso:

- **C'è il suo quadratino in alto a destra**, accanto agli altri modelli, con
  scritto quanti MB si prende. Non compariva perché sta nella RAM e non nella
  memoria video: era l'unico che ti faceva aspettare senza farsi vedere. Ci
  clicchi sopra e lo scarichi, come gli altri. Si vede anche nel pannello
  **Memoria** dell'hub, dove i suoi MB restano contati a parte da quelli della
  scheda video.
- **C'è una barra di avanzamento.** Mentre carica dice che sta caricando, e
  mentre traduce la barra si muove parola per parola. Prima c'erano tre puntini
  fermi, uguali sia che stesse lavorando sia che fosse morto.
- **Non resta più bloccato su «traduco…».** Erano due cose insieme: il modello
  si caricava dentro al filo che risponde alle domande, e per una quindicina di
  secondi il motore non rispondeva più *a niente*; e due «Genera» premuti a
  distanza di poco mandavano due traduzioni insieme sullo stesso modello.
  Adesso il caricamento sta per conto suo, ne passa una alla volta, e se il
  motore non risponde entro due minuti l'app manda la descrizione originale
  invece di restare lì ad aspettare.

---

## 0.3.3 — DaProdFoto: foto migliori, e la scheda video sgombra

**Pubblicata il 20 agosto 2026.** Un giro tutto dentro DaProdFoto,
su come si scrive quello che si vuole vedere e su come si arriva all'immagine.

### Le foto vengono meglio: da 30 a 50 step

Anima girava a **dieci step**, perché è un modello turbo e i turbo si vendono
così. Ma chi l'ha addestrata scrive un'altra cosa: **da 30 a 50**. È il motivo
per cui le immagini venivano molli, e non c'era nessun modo di scoprirlo
dall'app, perché il cursore si fermava a 30 e partiva da 10.

- Adesso parte da **30**, e si può arrivare a **50**.
- Non si chiamano più «passi»: si chiamano **step**, come nella scheda del
  modello e come li chiama chiunque.
- Il minimo resta basso per chi vuole solo vedere in fretta com'è inquadrata.

### Il formato è una fila di pulsanti

Era un menu con cinque voci scritte a parole («Verticale 2:3», «Veloce 768»):
due clic per cambiare, e per sapere quanto ci avrebbe messo bisognava sapere a
memoria cosa voleva dire ogni voce. Adesso sono due file di pulsanti:

- la **forma** — 16:9, 9:16, 4:3, 1:1;
- la **risoluzione** — 480, 720, 1080p;
- e accanto, i pixel veri: `1920 × 1088 px`, che è il numero che decide l'attesa.

Quello che scegli resta scelto anche alla riapertura. *(1080 diventa 1088 perché
i modelli lavorano a multipli di 16: chiedendo 1080 sarebbe stato il motore a
cambiare la misura per conto suo, senza dirlo.)*

### Le proposte sono tue

Le pastiglie sopra «Cosa vuoi vedere» erano dieci frasi scritte nel programma,
sempre quelle. Adesso:

- **`+`** ne aggiunge una — e parte da quello che hai appena scritto, che è
  quasi sempre quella che vale la pena tenere;
- **tasto destro** su una pastiglia: **modifica** o **elimina**;
- ognuna ha un **titolo corto** — «Vicolo sotto la pioggia» — e dentro il prompt
  intero, che si legge passandoci sopra. Il titolo è facoltativo.

Se le cancelli tutte compare la pastiglia per riportare quelle di partenza.
**Vale anche per DaProdMusica**, nella scheda Immagini: è lo stesso pezzo, non
una seconda copia.

### La scheda video non se la contendono più

Fra lo scrivere la descrizione con Bonsai e il premere Genera passano pochi
secondi, e in quei secondi il modello che scrive occupa ancora la memoria video.
Su una scheda da 8 GB era la differenza fra un'immagine che parte e mezzo minuto
di rimescolamento — o un errore che la VRAM non la nominava nemmeno.

Adesso, premendo **Genera** (e **Rigenera la zona**), un attimo prima di mandare
il lavoro al motore:

1. si spegne il modello che scrive, quello di LM Studio;
2. si toglie di mezzo quello che il motore tiene dentro e qui non serve — il
   modello musicale lasciato lì da DaProdMusica, o il modello di immagini di
   prima se nel frattempo ne hai scelto un altro.

**Quello che serve resta dov'è**: dieci immagini di fila con lo stesso modello
non lo scaricano e ricaricano dieci volte. Il tasto lo racconta mentre lo fa —
«libero la memoria…», «carico il modello…» — invece di stare zitto.

### Genera sta sopra la resa, e la resa sta in poco

Il tasto era in fondo alla colonna, sotto tutte le manopole: per premerlo
bisognava scorrere oltre roba che si tocca una volta ogni tanto. Adesso sta
**subito sotto la descrizione**, e il pannello «Resa» è sotto di lui — con
estetica, quante, formato e risoluzione su **una riga sola** invece che in una
griglia di campi alti.

---

## 0.3.2 — I tasti fanno quello che dicono

**Pubblicata il 20 agosto 2026.** Un giro di correzioni su quello che
si era visto usando la suite davvero: tasti che non facevano quello che dicevano,
e trentacinque GB di modelli che ci mettevano tre volte il tempo che serve.

### I modelli arrivano tre volte più in fretta

La suite scaricava con **una connessione sola**. Misurato oggi su questo computer,
con lo stesso file di 207 MB:

| | velocità | i 7,9 GB di DaProdMusica |
|---|---|---|
| prima | 3,9 MB/s | circa 35 minuti |
| adesso | 11,8 MB/s | circa 11 minuti |

Non è cambiato nessun modello: è cambiato **quante connessioni si aprono insieme**
(quattro), che è il vero collo di bottiglia con HuggingFace. È la stessa cosa che
fa `hf_transfer`, ed è il motivo per cui esiste.

- Vale per **tutti** i modelli di tutte le schede, non solo per Musica.
- **La ripresa continua a funzionare**, e continua a funzionare anche su uno
  scaricamento lasciato a metà dalla versione di prima: quello che era già
  arrivato non si riscarica. Provato interrompendo a metà e ripartendo.
- Sotto i 128 MB si scarica come sempre: su un file piccolo il giro in più
  costerebbe più di quello che fa risparmiare.

### DaProdFoto: i tasti fanno quello che dicono

- **«Genera» non sembra più morto.** Ogni tanto premerlo non faceva niente e
  bisognava ripremere: la prima traduzione della sessione carica il suo modello
  nel motore e ci mette una decina di secondi, in silenzio. Adesso il tasto si
  spegne e scrive cosa sta facendo — e non accetta un secondo clic, che prima
  metteva in coda una seconda immagine. Stessa cosa per «Rigenera la zona».
- **Un'immagine generata non si perde più per strada.** Se il messaggio con cui
  il motore dice «fatto» andava perso — capita quando la connessione interna si
  riapre — l'immagine c'era sul disco ma spariva dalla sessione e non compariva
  in galleria. Adesso, prima di buttare via un lavoro, la suite chiede al motore
  se per caso l'aveva finito.
- **«cartella» apre davvero la cartella.** Si chiamava «nella cartella» e spesso
  non apriva niente: sotto c'era una chiamata che su Windows 11 ogni tanto non
  fa comparire nessuna finestra. Adesso Esplora risorse si apre come lo aprirebbe
  Windows, con l'immagine già selezionata. Se il file non c'è più, lo dice.
- **C'è «salva».** Ne mette una copia dove vuoi tu — Desktop, chiavetta, cartella
  del lavoro — scegliendo nome e posto con la finestra di Windows. L'originale
  resta in galleria. Lo stesso tasto è nei **Risultati dell'hub**, per tutto
  quello che producono le altre app.

### Il modello che scrive è quello che hai scelto tu

I due tasti che allargano la descrizione si chiamavano **«Bonsai: …»** e si
comportavano come se Bonsai servisse per forza: LM Studio se lo caricava sul
momento — 27 miliardi di parametri, minuti di attesa — anche con un altro modello
già acceso e mostrato nel menu lì sopra.

Era un difetto vero, in mezzo al ponte fra l'app e la suite: il modello scelto
partiva dall'app e **veniva buttato via per strada**. Adesso arriva a
destinazione, e i tasti si chiamano per quello che fanno — «Allarga quello che ho
scritto», «Proponi tu una scena». Bonsai resta il consigliato, non l'obbligatorio.
Stessa correzione in DaProdMusica.

### Via il tasto «♪ Visualizer» dalle app

Era comparso in basso a destra in ogni finestra per aprire il Visualizer senza
tornare all'hub. Le app si aprono già tutte insieme dall'hub: un tasto che ne
apre un'altra dentro la finestra in cui stai lavorando è solo ingombro. Il tasto
**log**, accanto, resta dov'è.

## 0.3.1 — La sesta app, e le manopole della memoria video

**19 agosto 2026.** Dalla 0.2.0 è entrata la sesta app
— DaProdCompanion — e sono arrivate le due manopole che mancavano su una scheda
da 8 GB: quanta memoria video lasciar prendere, e chi la sta occupando adesso.

### DaProdCompanion: un compagno che si ricorda di te

La sesta scheda. Gli scrivi, ti risponde, e **la notte rilegge quello che vi
siete detti** e ne tiene quello che conta: le persone che hai nominato, i
luoghi, come stanno fra loro. Il giorno dopo se ne ricorda.

- **Risponde il modello che hai scelto tu**, dal solito selettore in cima —
  quello di DaProdMusica e DaProdFoto. Non ne carica uno suo: sarebbero due
  copie dello stesso modello nella stessa memoria.
- **Tre schede.** *Parla* è la conversazione. *Memoria* mostra cosa ha capito
  di te, in chiaro: un elenco di persone e cose con i loro legami, che si può
  guardare e da cui si può accorgersi se ha capito male. *Sogni* dice quando ha
  consolidato l'ultima volta, e ha il tasto per farlo adesso.
- **Riaprire l'app non è ricominciare da zero**: la conversazione è dov'era.
- **Ogni sogno lascia dei file scritti** — un appunto per il sogno e uno per
  ogni persona o cosa — con il frontmatter e i collegamenti di Obsidian, così
  si leggono anche fuori dalla suite. Il tasto per aprire quella cartella sta
  nella scheda Sogni.
- **La memoria è un file solo**, `memoria.db`, che si può copiare o cancellare.
- ⚠ **Non ha ancora la voce.** Nel progetto da cui viene c'erano due programmi
  in più solo per parlare e ascoltare, con i loro GB di modelli; la suite ha
  già le voci di DaProdIoDigitale, e rifarli qui vorrebbe dire scaricare due
  volte le stesse cose. Per adesso si scrive.
- ⚠ **Vuole LM Studio acceso**, come tutto quello che scrive nella suite. Se è
  spento o non ha modelli, la scheda lo dice appena si apre invece di far
  fallire la prima frase.

### Quanta memoria video lasciar prendere ai motori

Accanto a «Velocità», in fondo all'hub, c'è **«Memoria»** con tre scelte. Non è
la stessa domanda: la velocità dice *quanto in fretta*, questa dice *quanto
spazio*. Su una scheda da 8 GB è quella che decide se una cosa entra.

- **leggero** — il motore tiene da parte un giro e mezzo di GB. Va più piano,
  ma ci sta dentro anche con LM Studio acceso o con un'altra cosa aperta.
- **bilanciato** — come abbiamo generato finora, ed è il metro di paragone.
- **qualità** — il motore si tiene tutto quello che può: la seconda immagine non
  ricarica niente, ed è il primo profilo a finire lo spazio.

È la prima cosa da toccare quando una generazione muore per memoria esaurita.
Vale dalla prossima apertura di un'app.

### Chi occupa la memoria video, e come toglierlo

Un pannello nuovo nell'hub, accanto a Risultati e Modelli: **cosa c'è in memoria
video adesso**, quanto si prende ognuno, e un tasto per toglierlo.

- Togliere un modello **non spegne il motore**: la prossima generazione ricarica
  quello che le serve. È la manovra da fare quando una cosa non ci sta, invece
  di riavviare tutto.
- Era una fila di quadratini colorati nella barra di DaProdMusica, ed era
  scritto lì che sarebbe diventata roba di tutti: **la GPU è una sola**, e un
  modello lasciato in memoria da DaProdFoto è memoria che manca a Musica.

### Le versioni dei pacchetti adesso le decidiamo noi

È la correzione della notte del 19 agosto, quella in cui installare un'app ne ha
rotte quattro. Allora si era tolto il vincolo che faceva rimbalzare due
librerie; adesso c'è **il pavimento sotto tutto**.

- Un file solo, `versioni.txt`, con le versioni **che abbiamo provato**, passato
  a ogni installazione della suite — comprese quelle di ComfyUI e dei nodi
  custom, che non abbiamo scritto noi. Erano proprio loro a potersi portare via
  una libreria che serviva alle altre cinque app.
- Non obbliga a reinstallare niente: se quello che c'è va già bene, non si tocca
  nulla. Toglie solo la possibilità che una libreria si sposti da sola.
- Se un giorno qualcosa pretendesse una versione diversa, l'installazione si
  ferma **senza toccare l'ambiente** e lo dice in italiano, invece di fare il
  cambio e lasciare la scoperta al primo motore che non parte.

### Quando un motore muore per le librerie, la suite se ne accorge da sola

- Prima bisognava premere «Controlla». Adesso, se un motore muore parlando di
  librerie, la suite **va a guardare l'ambiente da sé**: apre davvero le
  librerie condivise e il rapporto compare nella barra in alto.
- E sulla scheda, accanto a «Riprova», compare **«Ripara l'ambiente»**: la via
  d'uscita dove sta il problema, non tre pannelli più in là.

### Su un computer senza scheda video, adesso lo dice prima

La suite ci partiva già dalla 0.2.0, ma non lo diceva a nessuno: si vedeva solo
un'app lentissima, o una barra che non finiva mai.

- **La barra in alto lo dice in italiano** e con le conseguenze: quali schede
  non partiranno e quanto vanno piano le altre.
- **DaProdDream, DaProdIoDigitale e DaProdCinema non si installano nemmeno**:
  fanno video, e senza scheda video non è "più lento", è un'altra cosa. Il
  pulsante è spento con scritto perché — prima degli otto GB di scaricamento,
  non dopo.
- **DaProdMusica avvisa in cima** che un brano può richiedere ore. Puoi provare
  lo stesso: è una tua scelta, non un divieto.
- **In DaProdFoto, FLUX.2 Klein resta spento** nel menu dei modelli, con scritto
  perché. Anima invece funziona: più lenta, ma ci arriva.

### Le schede dell'hub si muovono, se ci passi sopra

Al posto del fermo immagine parte una clip di quattro secondi, in silenzio e in
ciclo, diversa per ogni scheda. Nascono dalle copertine che Anima aveva già
generato, con un movimento lento di macchina: 226 KB in tutto.

⚠ **Non sono ancora l'app che si mostra da sola** — il video generato da
DaProdDream o dal Visualizer arriva col video vero (0.6.0). Quando arriverà
cambierà il programma che le fa, non quello che le mostra.

### DaProdIoDigitale parla italiano

Era l'unica scheda che non sembrava della suite: in cima diceva ancora *LeapTalk
Live*, i tasti dicevano `Load Image` e `Hold to Talk`, e quando qualcosa andava
storto rispondeva in inglese. Adesso è tradotta tutta, comprese le frasi che
arrivano dal motore.

### Le schede chiedono conto anche delle librerie del motore

Una scheda era «pronta» quando c'erano l'ambiente, il motore e i modelli. Delle
librerie Python che ogni motore dichiara non chiedeva conto nessuno, e andava
bene **per caso**: ogni app aveva dei modelli da scaricare, quindi si passava
comunque da «Installa» e l'installazione le metteva.

DaProdCompanion ha rotto quel presupposto — i suoi pesi li tiene LM Studio,
quindi non ha modelli suoi — e la sua scheda avrebbe detto «pronta» premendo la
quale il motore moriva su un errore di librerie.

⚠ **La prima volta che apri questa versione, le schede che hai già installato
chiedono un giro di «Prepara».** Non scarica niente: rimette a posto le librerie
dei motori e dura pochi secondi per scheda. Da lì in poi, aggiungere una riga ai
requisiti di un motore fa tornare la sua scheda da sé — cosa che prima non
succedeva a chi l'app ce l'aveva già.

### Una cosa sola, non sei copie

Il selettore del modello che scrive esisteva **due volte**, identico, in
DaProdMusica e in DaProdFoto, con scritto in tutti e due che alla terza copia
si sarebbe dovuto fare qualcosa. La terza era il Companion.

Adesso c'è `packages/ui`: un solo selettore e un solo tema, serviti a tutte le
app. Per chi usa la suite non cambia niente oggi — e cambia tutto il giorno che
si corregge un difetto lì dentro, perché si corregge una volta sola.

## 0.2.0 — Cinque app, e ognuna ha la sua faccia

**18 agosto 2026, pubblicata il 19.** Dalla 0.1.0 sono entrate due app —
DaProdDream e DaProdIoDigitale — e la suite ha smesso di essere sette schede
con la stessa icona.

> **Perché la data è doppia.** La 0.2.0 era costruita dal 18 e stava sul
> computer, ma la Release su GitHub non c'era: chi aveva installato la 0.1.0 non
> vedeva nessun aggiornamento, e il badge del README prometteva una versione che
> non si poteva scaricare. È uscita il 19, con il suo installer e il suo
> `latest.yml`.

### La suite si apre in 4:3, e le due barre sono sottili

- La finestra dell'hub si apriva **16:9** su un monitor 16:9: 1498×846, cioè una
  striscia bassa e larga, con le schede stirate. La griglia delle sette schede è
  fatta per una finestra alta.
- Adesso è **4:3 sempre**, su qualunque schermo: si parte dall'altezza e la
  larghezza viene da lì. Su un monitor stretto comanda la larghezza, ma la
  proporzione non cambia. Ridimensionarla a mano resta libero.
- **Vale solo per l'hub**: le finestre delle app tengono la misura che avevano,
  che è quella giusta per quello che ci sta dentro.
- **La barra in alto e quella in basso sono più sottili**: erano venti pixel
  sopra e sotto per una riga di scritte che si guarda una volta. Quello spazio
  adesso ce l'hanno le schede — con la finestra più grande e le barre magre,
  tutte e sette si vedono senza dover scorrere fino in fondo.

### Installare un'app non rompe più le altre

Dopo aver installato DaProdIoDigitale, **DaPMusica e DaPFoto non si aprivano
più**, e DaPDream e IoDigitale si aprivano ma non funzionavano. Non era una
delle quattro: era l'ambiente Python condiviso.

- Due librerie continuavano a **rimbalzare avanti e indietro** a ogni
  installazione — una le voleva nuove, un vincolo scritto mesi fa le voleva
  vecchie. Nel log si vede il rimbalzo tre volte.
- A un certo giro l'antivirus ha fatto fallire una disinstallazione a metà, e
  l'ambiente è rimasto **mezzo vecchio e mezzo nuovo**: il motore delle immagini
  moriva in avvio con un errore che con le immagini non c'entrava niente.
- Il vincolo vecchio è stato tolto — diceva il contrario di quello che serve
  oggi — quindi non c'è più niente che rimbalzi e niente da disinstallare a ogni
  giro.

**L'ambiente su questo PC è stato riparato**: Musica, Foto, Dream e IoDigitale
ripartono. Chi installa da zero non incontra più il problema.

### L'ambiente Python è in alto, sempre in vista, e si controlla da lì

L'ambiente Python è quello che fa partire cinque app su sette, ed è la cosa che
si rompe. Fino a ieri lo si guardava in due posti, e nessuno dei due era quello
giusto: una scrittina in fondo alla pagina, che diceva com'era andata e basta, e
il tasto «Ripara» in fondo al pannello **Spazio** — cioè dentro la schermata che
si apre per liberare il disco. Chi ha un'app che non parte lì non ci va.

- **Adesso è una riga sottile sotto il titolo, sempre visibile**, con un pallino
  che dice tutto a colpo d'occhio: verde a posto, giallo funziona-ma, rosso c'è
  un guaio (e in quel caso il pallino pulsa). Accanto, cosa c'è davvero
  installato: Python, torch e il nome della tua scheda video.
- **«Ripara» si è spostato lì**, dal pannello Spazio. Fa esattamente quello che
  faceva: reinstalla i pacchetti, e non tocca modelli, motori né risultati.
- **«Controlla» è nuovo, e serve a sapere prima di riparare.** Guarda l'ambiente
  e non tocca niente, poi risponde in cinque righe: c'è Python, torch vede la
  scheda video, le librerie delle app che hai ci sono tutte, le versioni vanno
  d'accordo, e — la più importante — **le librerie si aprono davvero**. È il
  guasto della notte del 19 agosto: numeri di versione tutti giusti e i file di
  due versioni mescolati. L'unico modo di accorgersene è aprirle, e questo lo fa.
  Ci mette qualche decina di secondi, e alla fine dice se «Ripara» serve o no.
- **«Dettagli» apre quello che c'è sotto**: il rapporto dell'ultimo controllo e
  le righe dell'installazione mentre sta lavorando. A suite sana non c'è niente
  da aprire e il tasto sparisce.
- L'installazione dell'ambiente, quando manca, si fa **da questa stessa riga**:
  il pannellone di prima non c'è più, e la pagina parte dalle schede delle app.

### «Ripara l'ambiente», nel pannello Spazio

- Quando un'app non si apre e parla di librerie, l'ambiente Python è rimasto a
  metà fra due versioni. Finora le strade erano due: chiedere aiuto a qualcuno
  che sapesse usare i comandi, o **Reset · Tutto**, che porta via anche i 35 GB
  di modelli e mezza giornata di scaricamenti.
- Adesso c'è un pulsante che **reinstalla solo i pacchetti**. Modelli, motori,
  risultati e impostazioni restano dove sono. Ci vogliono minuti, non ore.
- Reinstalla solo quello che serve a questa macchina: la base, il motore se ce
  l'hai, e le app che hai davvero installato.
- **Nato nel pannello Spazio, vive in alto**: nello stesso giro è salito nella
  barra dell'ambiente qui sopra, che è dove uno lo cerca.

### Quando un motore non parte, adesso dice perché

- Sulla scheda si leggeva **«Controlla il log»**, e basta. Il motivo vero c'era
  già, scritto per esteso in un file a due passi: nessuno lo portava dove stavi
  guardando.
- Adesso la scheda mostra **l'ultima riga dell'errore del motore**, quella che
  dice davvero cosa è successo. E se è un problema di librerie, aggiunge anche
  cosa fare per rimetterlo a posto.

### Su un PC senza scheda NVIDIA la suite adesso parte

Provata su un secondo computer, solo CPU. Non partiva, e per due motivi diversi.

- **L'ambiente Python si installava sbagliato.** Su una macchina senza NVIDIA ma
  con la grafica integrata Intel, la suite scaricava la versione **Intel** di
  PyTorch — un giro e mezzo di GB di roba che poi non serviva a niente, perché
  quella grafica non era comunque utilizzabile. Adesso: se c'è una NVIDIA
  installa la versione CUDA, se non c'è installa quella per CPU e basta.
  **Circa 400 MB invece di 3 GB**, e il messaggio dice quale delle due sta
  facendo invece di dire sempre "con CUDA".
- **Il motore delle immagini moriva in avvio** con `Torch not compiled with CUDA
  enabled`, e da fuori si vedeva solo una scheda che non si apriva. Adesso, se
  non c'è una scheda utilizzabile, parte in **CPU** e lo scrive nel log.

⚠ **In CPU funziona ma va molto più piano** — un'immagine passa da secondi a
minuti — e i modelli grossi (le canzoni di DaPMusica, FLUX.2 Klein) restano
fuori portata per pazienza prima ancora che per memoria. DaPDream e DaProd
IoDigitale la scheda video la vogliono per definizione.

### Le icone, disegnate dalla suite stessa

- **L'icona del programma l'ha fatta Anima**, cioè il modello che la suite
  installa e che usi in DaPFoto: sette raggi di luce colorati che convergono su
  un centro scuro. Non è un disegno preso in giro per il web né un logo
  disegnato a mano — è il software che si è fatto il ritratto.
- **Ogni app ha adesso la sua icona**, sempre generata con Anima: il microfono
  rosa di Musica, l'obiettivo ambra di Foto, la testa di luce azzurra di Dream,
  il volto corallo di IoDigitale, gli anelli viola del Visualizer. Si vedono
  nella barra del titolo e in quella delle applicazioni: **con cinque finestre
  aperte si riconoscono senza leggerne il nome.**
- Ci sono anche quelle di Cinema e Companion, pronte per quando entreranno.
- Sono rigenerabili: seme e descrizione stanno in
  `apps/shell/scripts/genera-icone.cjs`, quindi una che non piace si rifà
  cambiando una riga.
- **L'icona nell'area di notifica della versione installata era vuota**, e
  nessuno se n'era accorto: il file non veniva copiato nel pacchetto. Adesso sì.

### Il Visualizer si apre da dentro le altre app

- In basso a destra di ogni app, accanto al tasto **log**, c'è **♪ Visualizer**:
  lo apre senza chiudere quello che stai facendo e senza tornare all'hub.
- Il Visualizer non è un motore pesante, quindi **sta acceso insieme a
  chiunque**: si ascolta un brano guardandolo mentre DaPMusica ne genera un
  altro. Fra due app pesanti invece resta l'arbitro della scheda video, che ne
  tiene accesa una sola — su otto GB è giusto così.
- Prima si poteva già fare, ma solo dall'hub, che mentre lavori sta dietro alle
  altre finestre o l'hai chiusa del tutto.

### La prima volta la suite ti prende per mano

- Non si vede più il lampo di "Ambiente: da installare" e le schede spente che
  poi si correggono da sole: la finestra aspetta di avere davvero i dati prima
  di mostrarli.
- Al posto del silenzio, una **schermata di caricamento** con un'illustrazione
  generata dalla suite stessa e una riga che dice cosa sta controllando.
  Sparisce con una dissolvenza quando è tutto pronto.
- La finestra dell'hub è **più grande**, e cresce con lo schermo: su un 2K o un
  4K non resta più piccola in mezzo al monitor.


### DaProdIoDigitale è entrato: la quinta scheda

- **L'avatar parlante è dentro la suite.** Premi Installa, si scarica quello che
  manca, e la scheda si apre come tutte le altre: niente più `.bat` con il menu,
  niente file da modificare a mano per cambiare voce o modello.
- I suoi modelli stanno nella cartella condivisa insieme a tutti gli altri, e la
  voce italiana e Whisper adesso si scaricano dalla suite invece di comparire da
  soli al primo turno di conversazione.
- ⚠ **L'interfaccia è ancora in inglese**: funziona, ma i pulsanti dicono LOAD
  IMAGE e HOLD TO TALK. La traduzione è la prossima cosa.

### Il modello che scrive: risponde quello che hai caricato

- Prima la suite chiedeva sempre a **Bonsai 27B** anche quando in LM Studio ne
  avevi caricato un altro — e siccome Bonsai non era in memoria, LM Studio se lo
  caricava sul momento: minuti, con l'app che sembrava piantata.
- Adesso risponde **quello che hai scelto nel menu**, e se non hai scelto niente
  **quello che è già in memoria**. Il menu si apre da solo su quello caricato.
- E una cosa da sapere: **col motore delle immagini acceso il modello che scrive
  va molto più piano** — misurato, 5 secondi contro 148. Non è rotto, è la
  scheda che sta facendo due lavori insieme.


### DaPFoto: due parole diventano una descrizione

- Sotto la casella di **Cosa vuoi vedere** ci sono due tasti: **allarga quello
  che ho scritto** — resta dentro la tua idea e ci aggiunge luce, inquadratura e
  materiali — e **proponi tu una scena**, che tiene conto dell'estetica scelta.
- Scrive sempre in inglese, che è quello che Anima capisce: così la traduzione
  non ha più niente da fare.
- **Il menu del modello adesso conta**: prima la suite usava sempre il
  consigliato anche se ne avevi scelto un altro. Se metti un modello piccolo per
  avere una risposta subito, adesso risponde quello.


### Le schede dell'hub hanno una copertina, fatta dalla suite stessa

- Sette illustrazioni, una per scheda, **generate con Anima** dal motore che la
  suite installa. Non sono immagini prese in giro per il web: le ha fatte il
  software di cui parlano.
- Una scheda non ancora dentro la suite ha la copertina spenta, così "in arrivo"
  si vede da lontano.
- Pesano 65 KB in tutto, e lo script che le rifà resta nel repo: se una non
  piace, si cambia una riga e si rigenera solo quella.

### Un terminale dentro ogni app

- In basso a destra di ogni app c'è il tasto **log**: si apre un pannello con le
  ultime trecento righe del motore, che si aggiorna da solo mentre lavora.
  **Ctrl+L** lo apre e lo chiude, **Esc** lo chiude.
- Si apre già sul motore di quell'app — quando qualcosa non va, nove volte su
  dieci l'ha scritto lui — e dal menu si passa a qualunque altro.
- I codici colore che ComfyUI mette nel proprio output non si vedono più come
  spazzatura in mezzo al testo, né qui né nel pannello Log dell'hub.


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
