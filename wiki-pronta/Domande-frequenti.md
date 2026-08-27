# Domande frequenti

### «Ogni volta che riapro l'app devo riscannerizzare il codice»

**Dalla 0.7.7 non deve più succedere.** Era il difetto più fastidioso della
0.7.6, e aveva due cause che si sommavano.

La prima: l'accoppiamento veniva scritto su disco **mezzo secondo dopo**, e se
la suite moriva male in quella finestra il computer non aveva mai saputo di te.
Adesso quello che decide *chi sei* si scrive subito.

La seconda: bastava **un solo** «non ti riconosco» perché l'app buttasse via la
credenziale — e un «non ti riconosco» capita anche quando la suite si sta ancora
accendendo. Adesso la credenziale vera vive nel profilo del telefono: se il
computer fa storie, l'app la rimette e riprova, e solo dopo tre volte di fila ti
riporta all'ingresso, dicendoti perché.

**Se ti succede ancora**, c'è una terza cosa che non è un difetto: qualcuno ti ha
tolto dal computer. In quel caso adesso l'app te lo dice — «questo collegamento
non vale più» — e ti offre di rifarlo, invece di comportarsi come se fosse
offline.

## I miei dati escono dal computer?

No. Tutto gira in locale: niente account da creare, niente chiave API da
incollare da qualche parte, niente immagine, brano o testo che venga mandato
a un server. L'unico traffico di rete è per scaricare i modelli la prima
volta e per controllare se c'è un aggiornamento della suite.

Vale anche per **[Usarla da fuori](Usarla-da-fuori)**, il pannello che ti fa
comandare il PC dal telefono o da un altro computer. Va acceso a mano, ogni
apparecchio ha la sua chiave, e togliergliela lo chiude fuori all'istante.

Un'eccezione onesta: se accendi **«Anche da fuori casa»**, il collegamento passa
attraverso Cloudflare per arrivare a casa tua da Internet — è cifrato, e da lì
transitano soltanto i comandi e i risultati che chiedi tu. Spento, non esce
niente dalla tua rete. Lo decidi tu, con un interruttore.

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

Dalla 0.4.1 non devi più indovinare: quando scarichi un modello **da dentro
un'app** c'è una barra che dice a che punto è, quanti GB su quanti, a che
velocità e quanto manca — con il tasto per fermarla. La stessa barra è nel
pannello **Modelli** dell'hub. Serve soprattutto a DaProdCinema, dove il modello
più leggero è 23 GB.

### Il modello che scrive è lentissimo, cosa succede?

Se hai un motore pesante acceso nello stesso momento (per esempio DaProdFoto
che sta generando un'immagine), il modello che scrive si mette in coda per la
stessa scheda video e rallenta parecchio — non è rotto, sta condividendo la
GPU. Aspetta che l'altro lavoro finisca, o scegli un modello più piccolo in
LM Studio per una risposta più rapida.

### Ho chiuso la suite e non riparte: cosa succede?

**Dalla 0.7.6 non dovrebbe più succedere**, e vale la pena sapere cos'era.

I motori della suite sono programmi separati (Python, ComfyUI, il tunnel). Fino
alla 0.7.5, chiudendo la suite, si spegnevano loro ma **non i programmi che
avevano aperto a loro volta**: restavano tre o quattro processi in giro con la
scheda video occupata, e siccome tenevano ancora le porte, la suite riaperta non
riusciva a ripartire. L'unico modo era aprire il Gestione attività e chiuderli a
mano.

Adesso la suite tiene un elenco di tutto quello che apre e, alla chiusura,
spegne l'albero intero. E se la chiusura è andata male — un crash, un «termina
attività», un aggiornamento interrotto — **al prossimo avvio ripulisce lei**,
prima di provare ad aprire le stesse porte.

Se ti capita ancora: chiudi la suite, aspetta una decina di secondi, e riaprila.
Il giro di pulizia è la prima cosa che fa.

### Sono in tanti a usarla e il computer non è più mio

È esattamente la cosa che la **0.7.6** è andata a sistemare. Apri
**DaProdConnessione sul computer** → rotella ⚙ → **Il computer**:

- **«Sto usando il computer»** ferma i lavori nuovi. Quello che sta già girando
  si finisce — fermarlo a metà vorrebbe dire buttarlo via — ma da lì in poi si
  aspetta;
- **chi genera senza aspettare il tuo sì**: nessuno, solo chi è admin, o tutti;
- **quanti lavori in fila** in tutto, e **quanti a testa**.

Sopra il tetto le richieste non si perdono: restano in attesa con scritto
perché, e partono da sole quando la fila si sgombra.

Questi tre interruttori **si vedono solo dal computer**: un telefono con i
permessi da admin decide sulle richieste degli altri, ma non può alzarsi i
limiti a cui è sottoposto lui.

E quello che chiedi tu, stando al computer, **passa davanti** a quello che
arriva dai telefoni.

### Un'app non si apre e parla di librerie: cosa faccio?

In cima all'hub c'è una riga con un pallino: è l'**ambiente Python**, quello che
fa partire sei app su otto. Se il pallino è rosso o giallo, il problema è
lì e non nell'app.

1. Premi **Controlla**: guarda e non tocca niente, ci mette qualche decina di
   secondi e ti dice in cinque righe cosa non torna.
2. Se dice che c'è qualcosa che non va, premi **Ripara**: reinstalla i pacchetti
   dell'ambiente. **Modelli, motori, risultati e impostazioni non si toccano** —
   non è il Reset, non ti fa riscaricare i 35 GB di modelli. Ci vogliono minuti.
3. Riprova ad aprire l'app.

Con **Dettagli** vedi il rapporto per esteso e le righe di quello che sta
succedendo, che sono anche quelle da incollare in una segnalazione.

### Posso usarla dal telefono, o da un altro computer?

Sì. Nell'hub c'è il pannello **Da fuori**: lo accendi, ti dà un indirizzo e un
codice di otto cifre, e da lì comandi il PC dal browser di un portatile o
dall'app Android — con le stesse pagine, la fila e la galleria di quello che il
computer ha fatto.

Dalla **0.6.0** funziona anche **quando non sei in casa**: c'è un secondo
interruttore, «Anche da fuori casa», che apre una strada verso Internet senza
toccare il router. Da fuori il collegamento è cifrato; sulla wifi di casa no.

Quello che chiedi da fuori **non parte da solo**: compare nel pannello e chi sta
al computer dice sì o no. Su otto GB di scheda video ci sta un modello per
volta, e non è una cosa che si vuole far decidere a un telefono in tasca.

Tutti i dettagli in **[Usarla da fuori](Usarla-da-fuori)**.

### Le notifiche dal telefono arrivano tardi, o non arrivano

**Dalla 0.8.0 arrivano quando il lavoro finisce**, e vale la pena sapere cos'era.

Con l'app chiusa, l'unica cosa che guardava se il computer aveva finito era un
lavoro periodico di Android. Il suo intervallo più corto **è un quarto d'ora**,
ed è un limite del sistema, non una nostra scelta — e quel quarto d'ora è il
minimo: col telefono in tasca e lo schermo spento, Android accorpa quei lavori e
li fa girare quando gli conviene. Per un video pronto in tre minuti voleva dire
saperlo mezz'ora dopo.

Adesso, quando chiudi l'app con qualcosa in ballo, resta di guardia una
**sentinella**: chiede al computer ogni venti secondi e si spegne da sola appena
la fila si svuota. La riconosci dall'avviso silenzioso in fondo alle notifiche,
che dice a che punto sei — *«è 2° in fila»* — e sparisce quando ha finito.

**Se arrivano ancora tardi**, è il risparmio batteria di Android: mette a
dormire le app chiuse. Nel menu dei tre puntini dell'app c'è **«Notifiche in
ritardo?»**, che ti porta dove si toglie. La voce compare solo se serve.

### L'anteprima di un video è un rettangolo nero

**Dalla 0.8.1 non deve più succedere** — e stavolta con la causa vera in mano.

Il fotogramma lo tira fuori FFmpeg, e la suite gli faceva scrivere il risultato
su un file di passaggio che finiva in `.part`. FFmpeg però decide in che formato
scrivere **guardando l'estensione**, e `.part` non è un formato: rifiutava ogni
volta, e la spiegazione finiva in un posto che nessuno leggeva. Sul computer su
cui è stato trovato: 1269 esecuzioni, zero file. Adesso il fotogramma esce, e si
scrive accanto al video.

E dalla 0.8.0 il fotogramma se lo prende anche **DaProdCinema** appena il video
è finito, così c'è prima che qualcuno apra la galleria; i video già in cartella
se lo prendono alla prima apertura della Galleria, uno alla volta, senza far
tossire la scheda.

Se ne resta uno nero: è un file che il computer non riesce ad aprire (scaricato
male, o interrotto a metà). Provalo con un lettore video: se non parte nemmeno
lì, il fotogramma non c'è da nessuna parte.

### Come segnalo un problema?

Ci sono due moduli, e ti fanno le domande giuste:

- [**Qualcosa non funziona**](https://github.com/cammo22/DaProdSuite/issues/new?template=difetto.yml)
- [**Un'idea, o una cosa che manca**](https://github.com/cammo22/DaProdSuite/issues/new?template=idea.yml)
  — anche «questa parola non si capisce» è una segnalazione buona.

Ogni app ha un tasto **log** in basso a destra (o `Ctrl+L`) che mostra le ultime
righe del motore: se qualcosa va storto è il primo posto dove guardare, ed è
utile incollarle nella segnalazione.

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
