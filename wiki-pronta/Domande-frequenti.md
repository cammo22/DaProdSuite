# Domande frequenti

### I miei dati escono dal computer?

No. Tutto gira in locale: niente account da creare, niente chiave API da
incollare da qualche parte, niente immagine, brano o testo che venga mandato
a un server. L'unico traffico di rete è per scaricare i modelli la prima
volta e per controllare se c'è un aggiornamento della suite.

### Ho meno di 8 GB di VRAM, posso usarla?

Alcune app funzionano lo stesso ma più lentamente, altre hanno bisogno degli
8 GB per stare in memoria senza sconfinare nella RAM di sistema — che le
rallenta di molto, non di poco. 8 GB è la misura di riferimento su cui tutto
viene provato; sotto quella soglia il risultato dipende dall'app.

### Perché solo Windows?

È la piattaforma su cui il progetto è nato e viene misurato. Non è escluso
che arrivi altrove, ma oggi non è la priorità.

### Posso disinstallare una sola app senza toccare le altre?

Sì. Il pannello **Spazio** nell'hub disinstalla una scheda alla volta. Se un
modello serve anche a un'altra app che tieni installata, quel modello resta
sul disco — non lo riscarichi la volta dopo.

### Uso già LM Studio con un modello mio: la suite lo obbliga a usarne uno suo?

No. Le app che scrivono (DaProdMusica, DaProdFoto, DaProdCompanion) parlano
con LM Studio e usano **quello che vedi nel menu in cima all'app** — che di suo
è il modello che hai caricato tu. Consigliamo Bonsai 27B perché lo abbiamo
misurato a fondo, ma non è un obbligo.

> Fino alla 0.3.1 c'era un difetto che smentiva questa risposta: la scelta del
> menu si perdeva per strada e la suite finiva per far caricare Bonsai a LM
> Studio. Corretto nella 0.3.2.

### Quanto ci mette a scaricare i modelli?

Dipende dalla linea, ma dalla 0.3.2 la suite scarica su **quattro connessioni
insieme** invece di una: sullo stesso computer siamo passati da 3,9 a 11,8 MB/s,
cioè da ~35 a ~11 minuti per gli 8 GB di DaProdMusica. Se chiudi tutto a metà
strada non perdi niente: riprende da dov'era.

### Il modello che scrive è lentissimo, cosa succede?

Se hai un motore pesante acceso nello stesso momento (per esempio DaProdFoto
che sta generando un'immagine), il modello che scrive si mette in coda per la
stessa scheda video e rallenta parecchio — non è rotto, sta condividendo la
GPU. Aspetta che l'altro lavoro finisca, o scegli un modello più piccolo in
LM Studio per una risposta più rapida.

### Un'app non si apre e parla di librerie: cosa faccio?

In cima all'hub c'è una riga con un pallino: è l'**ambiente Python**, quello che
fa partire cinque app su sette. Se il pallino è rosso o giallo, il problema è
lì e non nell'app.

1. Premi **Controlla**: guarda e non tocca niente, ci mette qualche decina di
   secondi e ti dice in cinque righe cosa non torna.
2. Se dice che c'è qualcosa che non va, premi **Ripara**: reinstalla i pacchetti
   dell'ambiente. **Modelli, motori, risultati e impostazioni non si toccano** —
   non è il Reset, non ti fa riscaricare i 35 GB di modelli. Ci vogliono minuti.
3. Riprova ad aprire l'app.

Con **Dettagli** vedi il rapporto per esteso e le righe di quello che sta
succedendo, che sono anche quelle da incollare in una segnalazione.

### Come segnalo un problema?

Apri una
[Issue](https://github.com/cammo22/DaProdSuite/issues) sul repository,
descrivendo cosa è successo. Ogni app ha un tasto **log** in basso a destra
(o `Ctrl+L`) che mostra le ultime righe del motore: se qualcosa va storto, è
il primo posto dove guardare, ed è utile incollarle nella segnalazione.

### Serve sapere come funziona l'intelligenza artificiale per usarla?

No. Ogni scheda nasconde le parti tecniche dietro un'interfaccia pensata per
quello che deve fare: scrivere una canzone, generare un'immagine, parlare con
un avatar. Non c'è riga di comando da usare né file di configurazione da
capire.

### Il codice è aperto?

Sì, sotto licenza [MIT](https://github.com/cammo22/DaProdSuite/blob/main/LICENSE).
I motori e i modelli di terze parti che la suite usa hanno le loro licenze:
sono elencati nel [README](https://github.com/cammo22/DaProdSuite#ringraziamenti).

### Dove vedo cosa cambia a ogni versione?

Nel [CHANGELOG](https://github.com/cammo22/DaProdSuite/blob/main/CHANGELOG.md),
scritto pensando a chi usa la suite — non un diario tecnico.
