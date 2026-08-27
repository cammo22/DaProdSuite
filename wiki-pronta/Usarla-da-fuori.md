# Usarla da fuori

Dalla **0.5.0** la suite non si usa solo dal computer su cui gira: la comandi dal
browser di un altro computer di casa, dal telefono, e — se ti interessa — da
un'AI.

Dalla **0.6.0** funziona **anche quando non sei in casa**, e il telefono non
mostra più un modulo: mostra le pagine della suite.

Dalla **0.7.2** ognuno vede **le proprie cose**, e quello che vuole far vedere
lo mette in bacheca.

Dalla **0.7.3** quello che conta è **arrivarci da fuori**: la rete di casa da
sola non è più una risposta, e il pannello lo dice.

Dalla **0.7.6** il telefono e il computer **non vedono più la stessa cosa**: dal
telefono si vede quello che serve a fare, dal computer quello che serve a
governare. E col computer spento l'app **non cambia faccia**.

---

## DaProdConnessione

Dalla **0.7.0** non c'è più niente da accendere: la suite si apre già collegata.
Nell'hub c'è una scheda, **DaProdConnessione**, e serve a una cosa sola —
**sapere se funziona**.

Dentro trovi:

- un **quadrone** in cima: verde se va tutto, rosso se manca qualcosa, con
  scritto cosa e il tasto per rimediare;
- i **quadrati**: la rete di casa, se ci si arriva da fuori, il firewall, e se i
  lavori partono da soli;
- **le persone collegate** (è la prima cosa che si vede, dalla 0.7.3): Admin o
  Utente accanto al nome, il tasto per cambiarglielo, **disconnetti**, e il
  posto dove **trascinare un file per mandarglielo** — o il tasto, se stai su un
  telefono e non hai niente da trascinare;
- **da dove si arriva**: gli indirizzi, con Tailscale in cima se ce l'hai;
- il tasto **Invita qualcuno**.

È la **stessa pagina** che vedi dal browser di un portatile e dall'app del
telefono: quello che leggi qui è quello che leggono lì.

### Invitare

**Invita qualcuno** ti dà un codice di otto cifre e un QR. Tre scelte:

- **per una persona** — il codice si consuma al primo che lo usa;
- **per dieci persone** — utile quando siete in tanti: lo mostri una volta e lo
  inquadrano tutti;
- **per chi deve anche decidere** — quella persona potrà anche dire sì o no ai
  lavori degli altri.

Il codice **dura pochi minuti** in tutti e tre i casi: è quella la protezione,
non il numero di persone.

### Da fuori casa: Tailscale, o il tunnel

Due strade, e la prima è meglio.

**Tailscale** (consigliata). Se ce l'hai sul computer e lo installi anche sul
telefono, il computer ha un indirizzo **fisso, cifrato e privato** che funziona
in casa e fuori. Non c'è niente da accendere e niente su Internet: lo trovi già
in cima a «Da dove si arriva».

**Il tunnel.** Dalla 0.7.5 è **già acceso**: parte con la suite, e nel quadrato
«Da fuori casa» trovi «chiudi il tunnel» se non lo vuoi. Acceso, il PC apre da
solo una strada verso Internet e la suite diventa raggiungibile da qualunque
parte, all'indirizzo `https://qualcosa.trycloudflare.com`.

Prima era spento di suo, e il risultato era che restava spento: dal telefono
fuori casa non si arrivava, e sembrava un problema di firewall. Non lo era: la
strada non era mai stata aperta.

- **Non apre nessuna porta sul router** e non devi sapere l'indirizzo di casa
  tua: è il computer che si collega verso fuori, non il contrario.
- **Da fuori il collegamento è cifrato** (HTTPS). Sulla wifi di casa resta in
  chiaro, come prima.
- **La prima volta scarica un programmino** (`cloudflared`, una quarantina di
  MB). Te lo dice mentre lo fa; le volte dopo parte subito.

Due cose da sapere:

- **quell'indirizzo è pubblico.** Chi lo indovinasse arriverebbe alla schermata
  di collegamento, non alle tue cose: senza codice non si entra, e i tentativi
  sono limitati. Ma è su Internet, ed è giusto saperlo;
- **cambia ogni volta che si riaccende la suite.** Da questa versione non è
  più un problema: ogni volta che l'app del telefono arriva al computer si fa
  dire anche «adesso mi trovi qui» e se lo scrive. Basta aprirla **una volta
  stando in casa** dopo un aggiornamento, e l'indirizzo di stasera è già in
  tasca — anche ad app chiusa, dal controllo che gira per conto suo.

  Resta un caso scoperto, ed è il motivo per cui Tailscale resta meglio: se il
  computer si riavvia **mentre sei già fuori**, quel giro non l'hai fatto e
  l'indirizzo nuovo non lo sa nessuno.
- **se cade, si riapre da solo.** Linea che salta, computer che si sveglia dalla
  sospensione: prima il tunnel restava giù finché qualcuno non tornava a
  premere l'interruttore. Adesso riprova da sé, sempre.

### Se il telefono non lo raggiunge

Tre cose, in quest'ordine.

**1. Windows sta bloccando.** È la causa più frequente e la più silenziosa: il
PC dice «in ascolto» e dal telefono non arriva niente, senza nessun errore da
nessuna parte. Se è così, nel pannello compare un avviso rosso con il tasto
**Sblocca la porta**: premilo e di' di sì al riquadro di Windows. È una volta
sola.

**2. L'indirizzo sbagliato.** Un computer ha spesso più di un indirizzo — la
rete di casa, le schede virtuali di WSL o di Hyper-V, Tailscale — e **solo uno
arriva al telefono**. La suite sceglie quello di casa, ma se ha sbagliato sotto
c'è un menu con tutti gli altri, ognuno con scritto cos'è.

**3. Guarda che «Anche da fuori casa» sia acceso.** Dalla 0.7.5 lo è di suo.
Funziona pure stando in casa, e non ha bisogno né del firewall né dell'indirizzo
giusto: il collegamento lo fa il PC verso l'esterno, e il telefono ci arriva da
qualunque rete.

**4. Sei fuori e non risale?** Vuol dire che il telefono ha in tasca un
indirizzo vecchio: apri l'app **una volta quando torni in casa** — basta quello
per imparare quello nuovo. Se è un accoppiamento di prima della 0.7.5, rifai il
QR una volta sola.

### Chi può fare cosa

Non ci sono ruoli con un nome: c'è quello che uno **può fare**.

| | Utente | Admin |
|---|---|---|
| Chiedere lavori | sì | sì |
| **Farli partire senza aspettare un sì** | no | sì |
| Vedere le proprie cose | sì | sì |
| Vedere le cose degli altri | solo quelle in bacheca | solo quelle in bacheca |
| Vedere le richieste degli altri | no | sì |
| Dire sì o no ai lavori | no | sì |
| **Riscrivere una richiesta, o farla riscrivere all'AI** | no | sì |
| **Usare i tasti dell'AI mentre scrivi** | no | sì |
| **Mandare un file a qualcuno** | no | sì |
| Invitare, e togliere collegamenti | no | sì |
| **Cambiare cosa può fare un altro** | no | sì |

Il tuo telefono e il tuo portatile invitali come «chi deve anche decidere». Un
amico che vuole provare, no.

**Ci si ripensa senza rifare niente.** Sulla riga di chi è collegato c'è un
tasto: *rendilo admin*, oppure *rendilo utente*. Prima si sceglieva una volta
sola, inquadrando il QR.

**La differenza vera è una sola.** Chi decide fa partire quello che chiede senza
aspettare; chi chiede manda una richiesta e aspetta un sì. Tutto il resto —
vedere le proprie cose, la bacheca, la galleria — funziona uguale per tutti e
due.

---

## Dal telefono

C'è un'app Android: si scarica dalla
[Release](https://github.com/cammo22/DaProdSuite/releases/latest), il file
`DaProdSuite-telefono-<versione>.apk`.

Il telefono ti avviserà che viene da fuori dal Play Store e ti chiederà di
permetterlo: è normale per un'app che non passa da un negozio.

Una volta installata, la prima schermata è **la registrazione**, e sono due
caselle:

1. **come vuoi farti chiamare** — dev'essere un nome libero: se è già di
   qualcun altro te lo dice lì, e ne scegli un altro. Serve perché quel nome è
   chi sei in **DaProd**, non solo un'etichetta accanto a una richiesta;
2. **il codice di otto cifre** che compare sul computer premendo *Invita*, e
   sotto **l'indirizzo** (la prima volta si copia da lì; le volte dopo è già
   scritto).

**Il QR resta**, ma è la seconda strada: il tasto sta sotto, e serve a chi non
ha voglia di battere otto cifre. Dalla 0.7.6 il codice basta e avanza.

### Chi sei

Alla prima apertura l'app ti chiede il nome. Non è un vezzo: quel nome compare
sul PC accanto a tutto quello che chiedi, e serve a sapere **chi ha chiesto
cosa** quando in fila ci sono tre lavori di tre persone.

Se il telefono lo usa più di una persona, ognuna ha il suo collegamento: si
sceglie all'avvio, e si cambia dalla **rotella ⚙** in alto a destra → *Cambia
persona*. Con una persona sola non ti chiede niente e entri dritto.

Togliere una persona (tienila premuta nell'elenco) butta via il **suo**
collegamento da quel telefono. Sul PC resta nell'elenco finché non la togli
anche da lì: sono due gesti diversi.

### Cosa vedi

**Sei** schede in fondo, su **una riga sola** (dalla 0.7.8: prima la sesta
andava a capo, e mentre scrivevi la barra copriva la casella — adesso si toglie
di mezzo da sola finché non hai finito). Dalla **0.7.6** tre hanno cambiato nome — il nome
vecchio prometteva un'altra cosa — e dalla **0.7.7** ce n'è una in più, gli
**Stili**:

- **Casa** — in cima un quadrone che dice se funziona; scorrendo, **le ultime
  cose venute fuori** e i tasti per farne un'altra;
- **Produzione** (era «Chiedi») — quattro tasti grossi e colorati: **Produzione
  Immagini**, **Video**, **Musica**, **Audio**. Tocchi e si apre il modulo, che
  la suite disegna da sola: quando il PC impara a fare una cosa nuova, la trovi
  qui senza aggiornare l'app. Sotto c'è **parla con un modello** (vedi più
  giù);
- **Stili** (dalla 0.7.7) — dalla **0.7.8** sono di **tre tipi**, e in cima ci
  sono tre tasti per passare dall'uno all'altro: **Immagini**, **Video**,
  **Musica**, col numero di quanti ce n'è dentro. Non è un capriccio d'ordine:
  uno stile non è la stessa cosa nei tre posti — per un brano sono tre generi,
  per una foto un modo di fotografare, per un video un modo di riprendere.
  Ognuno parte col suo set preimpostato (sedici modi di fotografare, quattordici
  di riprendere, i ventiquattro generi musicali) più quelli che ti fai tu.
  **Toccane uno per usarlo**: ti porta nella Produzione giusta — una foto in
  Immagini, una clip in Video, un brano in Musica — con la descrizione già
  riempita. **Tienilo premuto** e escono le opzioni: modifica e salva, fanne una
  copia, mettilo in vetrina, buttalo. La **vetrina** è quello che gli altri hanno
  deciso di far provare: prenderne uno ne fa una copia tua, e resta scritto di
  chi era. Sono tuoi e stanno sul computer, quindi li ritrovi da qualunque
  telefono. E li ritrovi anche **dentro il modulo**: il campo «uno stile pronto»
  c'è in Immagini, Video e Musica, e mostra solo quelli del suo tipo;
- **Fila** (era «Lavori», poi «Riepilogo») — quattro numeri in cima — in
  lavorazione, in fila, pronti, aspettano il sì — e sotto **cosa sta girando
  adesso**, da quanto, per chi. Dalla 0.7.7 **ogni lavoro ha il suo numero**
  (`#47`) e tu vedi **a che posto sei**: se cambi idea, «togli» ti fa uscire
  dalla fila. Su un lavoro finito ci sono **rifallo** e **cambia e rifallo**. Le
  richieste stanno in tre pile: *adesso*, *finiti*, *messi via*;
- **Galleria** — due tasti in cima: **Le mie Produzioni** e **Pensieri** (quello
  che ti hanno mandato). Poi i filtri: tutto, immagini, video, musica e voce.
  **I video hanno il loro fotogramma** e **i brani la loro copertina**: si vede
  cosa c'è senza premere play. *(Dalla **0.8.0** ce l'hanno davvero tutti,
  compresi quelli fatti prima.)* Tocchi una cosa e si apre **a schermo intero**,
  con due tasti: *salva nel telefono* e *condividi*;
- **DaProd** — la bacheca, e il tuo profilo. Vedi sotto.

### Quando chiedi una canzone

Dalla **0.7.7** dal telefono c'è tutto quello che c'è sul computer, e sono
**pulsanti**, non menu a tendina:

- **come si chiama** — il nome della canzone, dalla **0.8.0**. È il primo campo,
  ed è come si chiamerà il file: lasciandolo vuoto lo ricava dalla prima riga del
  ritornello, come faceva prima;
- **uno stile pronto** — toccane uno e la descrizione si riempie da sola con le
  parole giuste. Se non sai cosa scrivere in «che genere», parti da lì;
- **le sezioni del testo** — `[Intro]`, `[Verse]`, `[Chorus]`… si toccano e
  finiscono dove sta il cursore, con l'a capo giusto intorno;
- **in che lingua canta** — italiano, inglese, e altre nove;
- **quanto dura** — 30, 60, 80, 2:00, 3:40. La casella resta, se ne vuoi 137;
- **con che modello** — anche quello a pulsanti.

E **le caselle di testo si allungano mentre scrivi**: il testo di una canzone
sono venti righe, e dentro una finestrella da tre non si rilegge mai niente.

**Se fai scrivere il testo a un modello**, dalla 0.8.0 scrive in **italiano**.
Prima capitava che scrivesse in napoletano, e la colpa era delle istruzioni che
gli davamo: l'esempio di ritornello era in dialetto, e un modello piccolo copia
l'esempio più di quanto segua una regola. Il genere può restare napoletano — è
quello degli stili di partenza — ma la lingua è quella che scegli tu.

### DaProd, e il tuo profilo

È la scheda che prima si chiamava «Persone» e mostrava i quadrati della rete.
Adesso mostra **quello che le persone hanno voluto far vedere**: la faccia di
chi l'ha fatto, la cosa, e sotto due tasti.

- **♥ mi piace** — su qualunque cosa in bacheca;
- **☆ tieni** — la fa comparire fra le tue cose. Non è una copia: il file resta
  di chi l'ha fatto, e se lui la toglie dalla bacheca sparisce anche da te;
- **il tuo profilo**, in cima: nome, **foto** e una riga sotto al nome. Si cambia
  tutto con *Modifica*. *(Dalla **0.8.0** la foto si carica davvero anche dal
  telefono: prima toccare «Metti una foto» non apriva niente — e per lo stesso
  motivo non funzionava nemmeno «Metti una cosa tua».)*
- **Metti una cosa tua** — carichi un file dal telefono e finisce in bacheca,
  anche se non l'ha generato il computer.

Per mettere in bacheca una cosa che hai generato: aprila a schermo intero dalla
Galleria e premi **Metti in DaProd**.

### Le impostazioni

La **rotella ⚙** in alto a destra, da qualunque scheda. Dentro c'è tutto quello
che prima stava sparso fra il menu a tre puntini e la scheda «Persone»:

- **Ricarica** — quando qualcosa sembra fermo. *(E dalla 0.7.6 ricarica davvero:
  prima, se il computer rispondeva subito, non succedeva niente di visibile.)*
- **Come siamo messi** — la rete di casa, se ci si arriva da fuori, il firewall,
  e gli indirizzi;
- **Le persone** — chi è collegato, cosa può fare, e il tasto **mandagli un
  pensiero** *(solo se puoi decidere)*. Dal computer ci puoi anche trascinare
  sopra un file. *(Dalla **0.8.0** la riga di una persona sta in una riga: prima,
  con un nome lungo, i tasti si sparpagliavano su due o tre altezze.)*
- **Aggiungi una persona** — il codice e il QR *(solo se puoi decidere)*;
- **Il computer** — la pausa e i limiti della fila. **Compare solo aprendo la
  pagina dal computer**: vedi «Chi decide, e cosa succede quando dice di sì»;
- **Cambia persona** e **Aggiorna l'app** — solo dentro l'app del telefono;
- **Scollega questo dispositivo**, in fondo e in rosso.

### Parla con un modello (dieci minuti)

In fondo alla scheda **Produzione**. Scegli con chi parlare fra i modelli
installati sul computer e premi *Comincia a parlare*: da lì hai **dieci minuti**.

Gli dici cosa vorresti — «vorrei una foto di una macchina, e anche un video» — e
lui prepara **un piano**: uno o più lavori, con le descrizioni già scritte per
bene. Tu **spunti quelli che vuoi** e premi *Sì, fallo*.

Tre cose da sapere:

- **il modello non fa partire niente da solo.** Propone; decidi tu.
- **accettare il piano chiude la chiacchierata**, ed è voluto: quel modello
  occupa metà della scheda video, che è la stessa che serve a generare. Appena i
  lavori partono, se ne va.
- **se il computer sta generando**, la chiacchierata aspetta il suo turno e te lo
  dice. Non si mette a caricare un modello sopra a un video a metà.

### Che ne faccio? — il menu di una richiesta

Quando arriva una richiesta e tu puoi decidere, non ci sono solo «sì» e «no».
Sotto la richiesta c'è **che ne faccio?**, e dentro quattro cose:

- **fallo così com'è** — parte subito;
- **usa l'AI, poi fallo** — il modello riapre quello che è stato chiesto in una
  descrizione fatta come si deve, e poi parte. Per un brano scrive **anche il
  testo da cantare**, se non c'era. Serve [LM Studio](https://lmstudio.ai)
  acceso: se non c'è, il tasto è spento e dice perché. Ci mette un minuto o due:
  carica un modello da 27 miliardi di parametri e lo lascia ragionare;
- **scrivila io** — la casella si apre già piena, la sistemi tu, e poi scegli se
  mandarla così o passarla comunque all'AI;
- **no** — con la ragione, che arriva a chi aveva chiesto.

Se una richiesta è stata riscritta, sotto resta scritto **com'era arrivata**.

Lo stesso tasto — **Usa l'AI** — sta anche sotto la casella quando sei tu a
chiedere qualcosa.

### I tuoi soliti, e con che modello

Nel modulo si sceglie **con che modello** deve essere fatta la cosa: per le
immagini Anima, Anima v2 o FLUX.2 Klein; per i video LTX 2.5 o MiniMax H3; per i
brani i tre di DaProdMusica. Lasciarlo vuoto vuol dire «quello scelto adesso sul
computer», ed è il caso normale.

Un modo di generare che ti piace si salva con un nome — **i tuoi soliti** — e lo
ritrovi in cima al modulo, anche da un altro dispositivo: stanno sul computer,
non nel telefono.

### Quando ti arriva un regalo

Chi sta al computer può mandarti un file quando vuole: lo trascina sul tuo nome
in **impostazioni → Le persone**, o lo sceglie col tasto. Ricevi la notifica, e
il **pacco si apre in mezzo allo schermo** la prima volta che apri l'app: dentro
c'è l'anteprima, se è roba che si può guardare, e il tasto per tenerlo nel
telefono.

Da lì in poi lo ritrovi in **Galleria → Pensieri**. *(Dalla 0.7.6 si chiamano
così: «regalo» dice che c'è un'occasione, «pensiero» dice solo che qualcuno si è
ricordato di te.)*

### E le altre cose che fa

- **avvisa quando un lavoro finisce**, anche ore dopo e con l'app chiusa. Se sul
  telefono ci sono più persone, la notifica dice di chi è;
- **funziona col computer spento, e non cambia faccia.** Dalla 0.7.6 non c'è
  più una schermata di ripiego: è la stessa app, con quello che si è tenuta
  mentre la linea c'era — le anteprime di tutto, i file che ci stanno, i
  pensieri arrivati. In cima una riga dice che il computer adesso non risponde.
  Quello che chiedi si mette in coda e parte da solo appena torna, **anche con
  l'app chiusa**. E quello che è già nel telefono si salva in galleria anche
  senza linea;
- **si aggiorna da sola.** Dalla rotella **⚙**, «Aggiorna l'app». Guarda anche per
  conto suo, una volta al giorno al massimo, e se non c'è niente non ti dice
  niente. È l'unica cosa che l'app manda fuori dalla tua rete: una domanda a
  GitHub su quale sia l'ultima versione, senza niente dentro.

---

## Dal browser di un altro computer

1. Sull'altro computer apri il browser e vai all'indirizzo del pannello.
2. Scrivi come ti chiami e batti il codice di otto cifre.
3. Fatto.

È **la stessa pagina** che vede il telefono, larga invece che stretta. Da lì
chiedi immagini, video, brani e voci, vedi cosa sta facendo la scheda video,
guardi la fila e la galleria, e ti scarichi i risultati.

**Perché non installare la suite anche sul portatile?** Perché lì non girerebbe
bene: i modelli vogliono la scheda video del computer fisso, e un portatile che
non ce l'ha ci metterebbe ore per una cosa che di là richiede minuti. Ma non ti
serve che ci giri — ti serve **comandare** quel PC, e per farlo basta un browser.

---

## Chi decide, e cosa succede quando dice di sì

Una richiesta che arriva da fuori **non parte da sola**: compare nei **Lavori**,
e qualcuno che può decidere le dice **fallo** o **lascia perdere**.

Dalla 0.7.0, quando dici «fallo», **il computer lo fa davvero**: apre la scheda
giusta, la fa generare, e quando il file è pronto lo dice a chi aspettava. Prima
bisognava andare al computer e rifare la cosa a mano.

Non è diffidenza: su otto GB di scheda video ci sta **un modello per volta**, e
una clip video è un quarto d'ora in cui il PC non fa altro. Un telefono in tasca
che può far partire quattro generazioni «per provare» è un computer che non è
più di chi ci sta davanti.

Le cose che non costano niente — guardare la libreria, vedere cosa è acceso,
leggere la fila — rispondono subito, senza chiedere il permesso a nessuno.

### Il computer resta tuo (0.7.6)

Fin qui la regola era una sola: chi è **admin** genera subito, gli altri
aspettano. Con quattro persone collegate quella regola da sola vuol dire venti
generazioni accodate in due minuti, e un computer che per due ore non è più di
chi ci sta davanti.

Dalla 0.7.6, aprendo **DaProdConnessione sul computer** → rotella ⚙ → **Il
computer**, ci sono tre interruttori:

- **«Sto usando il computer»** — non parte più niente di nuovo. Quello che sta
  già girando **si finisce**, ed è voluto: fermare a metà una generazione da
  mezz'ora vuol dire buttarla via. Si ricorda anche dopo aver chiuso la suite, e
  dal telefono si legge una riga che dice perché la propria roba aspetta;
- **chi genera senza aspettare il tuo sì** — *nessuno*, *chi è admin*, oppure
  *tutti*;
- **i due tetti** — quanti lavori possono stare in fila in tutto, e quanti a
  testa. Zero vuol dire senza tetto.

Sopra il tetto **una richiesta non si perde e non si rifiuta**: resta in attesa
con scritto perché, e **parte da sola** quando la fila si sgombra.

> ⚠ **Questi tre interruttori si vedono solo aprendo la pagina dal computer.**
> Non è una dimenticanza: un telefono con i permessi da admin decide sulle
> richieste degli altri — quello sì — ma non può alzarsi i limiti a cui è
> sottoposto lui. Se potesse, non sarebbero limiti.

E una cosa che si sente e non si vede: **quello che chiedi tu, stando al
computer, passa davanti**. Non scavalca un lavoro già partito, ma non si mette
in fila dietro a tre telefoni.

---

## Togliere l'accesso a un apparecchio

Impostazioni ⚙ → **Le persone**: ogni riga ha **disconnetti**. Vale all'istante e
solo per quello: gli altri restano dove sono.

---

## Un'AI che usa la suite

C'è anche un **server MCP**: Claude Code, o qualunque programma che parli quel
protocollo, si collega col codice di otto cifre come farebbe un telefono e da lì
può chiedere generazioni, leggere la libreria e guardare la coda.

Vale la stessa regola di tutti: le generazioni passano dalla fila, e il sì lo
dai tu. Le istruzioni sono
[nel repository](https://github.com/cammo22/DaProdSuite/blob/main/docs/AZIONI-E-MCP.md).

---

## Cose da sapere

- **In casa il collegamento non è cifrato.** Chi è già dentro la tua wifi e sa
  guardare il traffico vede quello che passa. Su una wifi di casa con una
  password è un rischio piccolo; su quella di un bar accendi «Anche da fuori
  casa», che è cifrato.
- **Un lavoro per volta.** Su otto GB di scheda video ci sta un modello alla
  volta: se ne accetti tre, si fanno in fila. E se **mentre la fila lavora**
  generi anche tu qualcosa a mano nella stessa scheda, può capitare che il file
  finisca attaccato alla richiesta sbagliata.
- **La notifica sul telefono può tardare fino a un quarto d'ora.** È il telefono
  che chiede al PC, non il PC che chiama.
- **Se spegni la suite, l'accesso si chiude** — tunnel compreso. Non resta
  niente in ascolto e niente aperto.
- **Il Companion non si raggiunge da fuori, in nessun modo.** La sua memoria è
  la cosa più delicata che la suite contenga, e finché non c'è una ragione per
  aprirla resta chiusa.
