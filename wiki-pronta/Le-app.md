# Le app

Ogni scheda dell'hub è un'esperienza completa: il modello, un'interfaccia
fatta apposta per lui, e i suoi trucchi già pronti. La installi, la usi, e se
non ti serve più la disinstalli dal pannello Spazio.

## 🎵 DaProdMusica — *disponibile*

Canzoni complete e cantate, da una descrizione e un testo. Scrivi lo stile in
poche parole vaghe (2-3 generi, non un elenco di strumenti — è quello che dà i
risultati migliori) e il testo con i tag `[Verse]`, `[Chorus]`, `[Bridge]` per
dire dove va cosa.

Non sai da dove cominciare? C'è **«Fai tutto»**: scrivi in una riga di cosa
deve parlare la canzone, e riempie titolo, stile, testo e perfino l'idea per la
copertina al posto tuo. Serve avere [LM Studio](https://lmstudio.ai) aperto:
risponde **il modello che scegli nel menu lì sopra**, qualunque sia. Bonsai 27B
è quello che consigliamo, non quello che ti tocca.

**Il modello si sceglie per primo**, in cima alla scheda: **ACE-Step 1.5 Turbo**
(quello che parte, otto passi), il suo fratello **XL Turbo**, o **MiniMax Music
3**. Sotto il testo c'è la **lingua del canto**, una fila di pastiglie con
l'italiano per primo: ACE-Step la riceve come impostazione e canta in quella
lingua, MiniMax una casella per la lingua non ce l'ha e quindi gliela diciamo
nella descrizione dello stile — aiuta, ma non è un interruttore.

La copertina si genera insieme al brano, prima che parta la musica.

## 🖼️ DaProdFoto — *disponibile*

Immagini da una descrizione, e ritocco: dipingi la zona che vuoi cambiare e
dille cosa metterci al posto. Due modelli fra cui scegliere — uno veloce di
serie, uno più bravo con le descrizioni lunghe che scarichi quando ti serve
di più.

Anche qui, se non sai come descrivere quello che hai in mente, un tasto
allarga due parole in una descrizione vera: soggetto, luce, inquadratura.

## 📷 DaProdVisualizer — *disponibile*

La tua musica diventa visualizzazioni che reagiscono al suono in tempo reale.
Nessun modello: è pura reattività all'audio, pensata per accompagnare quello
che generi in DaProdMusica o un brano tuo.

## 🌀 DaProdDream — *disponibile*

Trasforma quello che vedi in tempo reale: webcam, un video, lo schermo, o
niente — solo un prompt che si trasforma da solo mentre lo guardi, senza
bisogno di una sorgente. Il modo veloce gira a ritmo di webcam; il secondo
modo, più curato, rifà l'immagine un fotogramma alla volta mentre scrivi.

## 🗣️ DaProdIoDigitale — *disponibile*

Il tuo avatar parlante: carichi un ritratto, gli parli o gli scrivi, e ti
risponde a voce con il volto che si muove. Capisce l'italiano, risponde in
italiano, e la voce è generata anche lei in locale.

## 🎬 DaProdCinema — *disponibile*

Video con il suono dentro, da una descrizione o da un'immagine. Scrivi cosa vuoi
vedere, scegli forma e misura come in DaProdFoto, premi. **Il modello si sceglie
per primo**, in cima, perché decide tutto quello che c'è sotto: cosa puoi dargli
in pasto, quanto può durare la clip e quanti passi ci vogliono.

**LTX 2.5** (23,2 GB, quello che parte) genera dal testo. Se vuoi puoi dargli
anche il **primo fotogramma** — e il video parte da lì — e l'**ultimo**: allora
la clip diventa il passaggio da un'immagine all'altra. Sono facoltativi tutti e
due.

**MiniMax H3** (41,6 GB) lavora in un altro modo: prende dei **riferimenti**.
Non «comincia così», ma «questa è la faccia, questo è il posto, questo è il
movimento, questa è la voce» — fino a nove immagini, tre video e tre audio.

> ⚠️ Con H3 i riferimenti vanno **chiamati per nome nel prompt**, altrimenti il
> modello riceve dei file e nessuna istruzione su cosa prendere da quale. Ogni
> riquadro ha la sua etichetta scritta sopra: cliccala e finisce nel prompt dove
> hai il cursore. Si scrive così: *«the woman in `<Picture 1>` walks through
> `<Picture 2>`, camera moves like `<Video 1>`»*.

Il suono lo fanno tutti e due da soli, e anche quello si può chiedere a parole
nel prompt: «rain on umbrellas», «distant waves».

⏱️ **Aspettati minuti a clip, non secondi.** Su una scheda da 8 GB questi modelli
lavorano spostando i pesi fra scheda e RAM. Accanto alla misura c'è scritto
quanto costa: il 720 è circa 2,3 volte il lavoro del 480, il 1080p circa 5,2.
**La prima prova falla a 480, cinque secondi, senza immagini**: così sai quanto
costa prima di impegnare un pomeriggio.

## 🤖 DaProdCompanion — *in arrivo*

Un compagno sul desktop che ti ascolta e si ricorda di te nel tempo, con un
modello a tua scelta tramite LM Studio. Esiste già come progetto funzionante
fuori dalla suite, e sta aspettando il suo turno per entrare.

---

Le app "in arrivo" non aprono niente e lo dicono chiaramente nell'hub — non
promettono un pulsante che poi non funziona.


Questa non è una lista chiusa: continuiamo a testare modelli nuovi e ad aggiungere schede. Quello che vedi qui è dove siamo adesso, non dove ci fermiamo.
