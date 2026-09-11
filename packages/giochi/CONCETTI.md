# DaProdGiochi — il documento dei concetti

> Questo file viene **prima del codice**. Se una regola cambia, cambia qui e poi
> nei file. Se il codice e questo file dicono cose diverse, quello sbagliato e'
> il codice.

## 1. Cos'e', davvero

**DaProdGiochi e' la sala giochi della suite.** Non un gioco: un posto dove ce
ne sta piu' d'uno. Il primo che apre e' **DaProdSlot**, ed e' per la musica.

Sembra un passatempo. Non lo e'. E' **il modo in cui la suite si riempie di
prompt buoni** — e il passatempo e' quello che convince la gente a scriverli.

Il giro completo, in una riga:

> **Uno gioca e monta un prompt. Lo manda. Cammo lo prova, gli da' un prezzo e
> lo tiene — o lo butta. Quello tenuto entra nel programma, e da li' in poi lo
> sbloccano gli altri giocando o comprando pacchetti.**

Chi gioca si diverte e guadagna. Cammo si ritrova un magazzino di prompt
provati, con un prezzo addosso, fatti da persone vere invece che da un modello
che ripete se stesso. Nessuno dei due sta lavorando per l'altro: e' lo stesso
gesto che serve a tutti e due.

## 2. Le persone sono quelle della suite

Non c'e' un registro utenti del gioco. Chi gioca e' un **dispositivo
accoppiato**: ha gia' un id, un nome, una faccia, un motto e un ruolo
(`admin` o `ospite`), gli stessi che si vedono in DaProd.

Conseguenze, tutte volute:

- il conto segue la persona, non il telefono da cui gioca;
- **l'admin del gioco e' l'admin della suite**. Niente password del gioco.
  Chi comanda il computer comanda il banco, e chi non lo comanda non puo'
  diventarlo scrivendo `daprod` in una casella;
- chi viene tolto dalla suite non gioca piu', senza doverlo togliere due volte;
- **quando qualcuno manda una combinazione, gli admin lo vengono a sapere.**
  Non c'e' una posta del gioco: sono le notifiche della suite, quelle che
  arrivano gia' sul telefono quando un lavoro e' pronto.

## 3. Il PC e' il banco

**Tutto quello che conta succede sul PC**: pescare, pagare, segnare, tenere la
fila. La pagina tira la leva, fa il rumore e mostra quello che il PC ha deciso.

Tre motivi, in ordine di importanza:

1. **Il portafoglio e' condiviso.** Un giro pescato dentro il browser e' un
   jackpot regalato a chiunque apra gli strumenti da sviluppatore. Con una
   classifica in casa, quello non e' un dettaglio: e' il gioco che finisce.
2. **Una verita' sola.** Il saldo che vedi sul telefono e quello che vedi sul
   computer sono lo stesso numero perche' e' lo stesso file.
3. **I dati sono grossi.** I generi sono 6.291 e stanno in 380 KB: restano sul
   PC e non passano dal tunnel a ogni apertura.

Il file e' uno: `%LOCALAPPDATA%\DaProdSuite\giochi\giochi.json`, scritto in modo
atomico con la sua copia `.bak` — le stesse regole di `remoto.json`, per lo
stesso motivo: e' l'unico posto dove vive quanto ha vinto la gente.

## 4. La moneta

**Lire italiane.** Numeri interi, separatore delle migliaia all'italiana
(`L. 1.500`). Si possono leggere in euro con un interruttore, al cambio fisso
storico **1 € = 1936,27 £**: e' solo come si legge, il conto e' sempre in lire.

### Due numeri, e non si scambiano

⚠ **Dalla slot non escono lire.** Deciso il 10 settembre 2026: girare **costa**
lire e rende **punti esperienza**. E' il pezzo che tiene in piedi tutto il
resto.

| | Come si guadagna | A che serve |
|---|---|---|
| **Lire** | facendosi prendere una combinazione, riscoprendone una, e dai doppioni nei pacchetti | girare, comprare pacchetti, comprare nello shop |
| **Esperienza** | girando, sempre: anche il giro peggiore da' un punto | salire di livello, e basta |

I gradi sono **dodici**, da Basic a **Ethernal** — quello in cima, aggiunto il
10 settembre 2026, esce tre volte su diecimila caselle. E la scena cresce con il
grado: da Celestial in su non e' piu' la stessa. Vedi § 7.

Chi gioca e basta **sale di livello**. Chi crea, **si arricchisce**. Non c'e'
modo di trasformare l'una nell'altra, ed e' voluto: se girando si guadagnasse,
la slot sarebbe una macchinetta e le combinazioni un passatempo. Cosi' invece
le lire per giocare finiscono, e per averne ancora bisogna inventare qualcosa
che a chi comanda piaccia.

I livelli: il secondo costa 500 punti, il terzo altri mille, il quarto altri
millecinquecento. Ogni volta di piu'.

### Il secondo rubinetto: chi comanda regala

Dal 10 settembre 2026 c'e' una seconda strada per cui arrivano lire, e sta in
mano a una persona sola: **chi comanda le manda a chi vuole**. Otto tasti, o un
numero scritto a mano, e due parole di accompagnamento che si scrivono sempre.

⚠ **I tasti dei regali sono euro, contati in lire**: 2, 5, 10, 20, 50, 100,
200 e 500 euro, cioe' da 3.873 a 968.135 lire.

⚠ **La moneta e' una sola, e sono gli euro.** Prima del 10 settembre 2026 ce
n'erano due che si chiamavano tutte e due «lire» — gli euro dei regali e le lire
piccole del bonus — e il numero accanto a una figurina non si poteva confrontare
con quello di un regalo, mentre in questo gioco il portafoglio e' uno. Parole
sue: «i prezzi ora sono da 1 lira a 500, metti gli stessi tagli che hai messo per
le ricariche».

⚠ **I tasti del bonus hanno un taglio loro**, dall'11 settembre. Sotto ai tre
euro sono piccoli — dieci centesimi, venticinque, cinquanta, un euro, due, tre —
perche' li' si decide di centesimi ed e' li' che finisce quasi tutto; con gli
otto tasti dei regali sette su otto avrebbero voluto dire «massimo» al primo
colpo. Dal 12 settembre, da quando le figurine arrivano a Ethernal (§ 7), sopra
ce ne stanno altri quattro: cinque euro, dieci, venti, e l'ultimo **e'** la
soglia del grado piu' alto. Stessa moneta, tagli diversi.

I tasti si **sommano**: si batte come su una cassa, 100 + 20 + 20. C'e' «azzera»
per tornare indietro, e un tetto a cinque volte il tasto piu' grosso — non e' un
permesso, e' una rete contro il dito rimasto premuto.

**A se stessi si puo'.** Il divieto c'era e l'ha tolto Cammo: chi comanda il
banco puo' gia' cambiare tutti i numeri del gioco da una schermata sola, quindi
il divieto non impediva niente — faceva solo la figura di impedirlo.

⚠ **Un regalo si dice a chi lo riceve.** Senza, il saldo cambierebbe da solo
fra un'apertura e l'altra, e un numero che cambia da solo si legge come un
guasto. Chi lo riceve trova un pannello aperto con dentro quanto e perche'.

Serve a due cose: far entrare qualcuno che non ha ancora niente, e ringraziare
per una cosa che non passa dalla fila. Non e' un bonifico fra conti — non si
toglie a nessuno, paga il banco — e **non conta in classifica**: quella la fa
`prese`, cioe' quante cose ti hanno preso. Uno con mille lire regalate e zero
prese non e' uno che crea, e i due numeri non si devono confondere.

### Lo scarico: chi comanda azzera un portafoglio

Chiesto l'11 settembre 2026: «un admin puo' anche azzerare il portafoglio degli
altri, caso mai problemi: fai un bel tastino per resettare il portafoglio».

Sta nella riga di ogni persona, dentro «Manda lire», sotto ai tasti che danno:
e' la stessa decisione girata al contrario e si prende guardando lo stesso
numero, cioe' quanto ha in tasca. Compare **solo se c'e' qualcosa da svuotare**.

⚠ **Azzera vuol dire azzera.** Non si scrive quanto togliere: un tanto in meno
sarebbe una multa, che e' un'altra cosa e non c'e'. Il perche' si scrive sempre,
come per un regalo, e chi lo riceve lo legge appena apre la sala — un
portafoglio che si svuota da solo si legge come un guasto.

⚠ **La collezione, i livelli e le cose prese non si toccano.** Le figurine sono
quello che uno ha inventato e non sono soldi; `prese` e l'esperienza dicono cosa
ha fatto, e non era sbagliato. Azzerare il portafoglio non e' cancellare la
persona.

Perche' esiste: **la scala e' cambiata tre volte in due giorni** (§ 7). Chi ha
giocato con quella sbagliata ha in tasca centinaia di euro che non avrebbe
dovuto avere, e ricalcolarli non si puo' — quei soldi sono stati spesi, sommati,
mescolati con i regali. Quando i numeri di un portafoglio non vogliono piu' dire
niente, l'unica cosa onesta e' ripartire da zero.

⚠ **Non ci sono soldi veri.** Non si compra niente pagando, e i «pacchetti da
comprare» si comprano in lire di gioco. Se un giorno questa cosa dovesse uscire
di casa e toccare soldi veri, il discorso cambia e va rifatto da capo: un gioco
con un portafoglio, delle rarita' e dei pacchetti e', per come e' fatto, una
slot machine.

## 5. Il prompt e' fatto di dodici pezzi

Un rullo per pezzo, e i rulli sono **dodici** — come nella prima versione di
DaProdSlot. Sei era troppo poco: chiedendo a un modello sei cose si ottiene
sempre lo stesso tipo di risposta, con dodici il prompt comincia ad avere
un'idea dentro.

Un giro riempie tutti i rulli; **si blocca quello che piace e si rigira il
resto** (il blocco e' un clic sul rullo). Si va avanti cosi' finche' la riga
non piace tutta.

⚠ **Si manda solo quello che si e' bloccato**, e basta quello. Deciso il 10
settembre 2026:

> «Le combinazioni, cioe' i prompt inviati quando si preme manda a controllare,
> deve inviare solo quelli bloccati e basta, anche se sono solo 3, solo quelli
> bloccati.»

Fino a quel giorno ne partivano dodici, e i pezzi non bloccati erano roba uscita
a caso all'ultimo giro: chi comanda si ritrovava a giudicare mezza idea di
qualcuno e mezza pescata dal mazzo. Bloccare un rullo e' **il gesto con cui si
dice «questo si'»**, e tre pezzi scelti valgono piu' di dodici mezzi scelti.

Restano due sole regole, e non le decide il giocatore: ogni pezzo viene da una
casella **di questo tavolo**, e due pezzi non possono venire dalla stessa. Se
tre pezzi siano pochi lo decide chi comanda quando la guarda — non tocca al
banco.

⚠ **Mandata la combinazione, la sala riparte.** Chiesto il 10 settembre 2026:
«quando si invia una combinazione gli elementi bloccati vengono inviati e la
slot refreshata, si ricomincia la partita». I blocchi si tolgono tutti e i
rulli tornano puliti. Prima restava tutto com'era, e chi aveva appena mandato
si ritrovava davanti la riga appena mandata: per ricominciare doveva sbloccare
dodici rulli uno per uno.

**Non si tira la leva da soli**, pero'. Un giro costa lire e mandare deve
restare gratis (§ 9): far partire un giro qui vorrebbe dire che mandare costa
dieci lire senza che nessuno l'abbia deciso.

**Musica** — genere · incrociato con · voce · come canta · davanti · e anche ·
che aria · andatura · di quando · com'e' preso · com'e' fatto · la firma

**Immagini** — chi · con · che fa · dove · quando · che luce · che aria ·
come · fatta con · da dove · che colori · e poi

I primi due rulli della musica pescano tutti e due dal mazzo dei generi, e non
e' un doppione: **incrociare due generi e' il gesto che fa uscire le cose
buone**. «indonesian indie pop» e' un genere; «indonesian indie pop incrociato
con dark jazz» e' un'idea.

Ogni pezzo ha due facce: il **nome in italiano**, che e' quello che leggi sul
rullo, e il **testo**, che e' quello che finisce nel prompt vero. E' la stessa
forma degli stili della suite, e infatti il rullo «come» **non e' una lista
nuova**: e' quella di `@daprod/azioni`. Il giorno che ne aggiungi uno la',
compare qui da solo.

I generi sono **veri**: 6.291 voci da Every Noise / Spotify, con il rank di
popolarita' e di modernita' del 2023, e un artista d'esempio accanto — perche'
«shoegaze» a chi non lo sa non dice niente, «shoegaze, tipo My Bloody
Valentine» si'.

## 6. Le epoche

Sette tasti: **∞ sempre**, 70, 80, 90, 00, 10, 20. Scegliere un'epoca fa due
cose insieme, e sono tutte e due grosse:

1. **cambia il colore di tutta la sala** — fondo, luci, bordi. Era cosi' nella
   prima versione, ed e' la cosa che la faceva sembrare un posto invece che un
   elenco;
2. **cambia cosa esce dai rulli.**

⚠ **L'epoca non e' un'etichetta, e' un peso.** Nel dataset i generi con un
decennio scritto sopra sono pochi: filtrare per quelli vorrebbe dire che
scegliendo «anni 80» girerebbero sempre le stesse trenta parole. Si usa invece
la **modernita'** — quanto quel genere suona di adesso — che ce l'hanno tutti.
Chi ha anche il decennio giusto prende una spinta forte, ma nessuno viene mai
escluso: anche negli anni 70 puo' scappare fuori una roba di adesso, e va bene
— e' una slot, non un archivio.

Il peso vale anche sul rullo **«Di quando»**: con gli anni 80 scelti esce «Anni
ottanta» otto volte su dieci. Prima no, e si vedeva: la sala si vestiva da anni
80 e la casella diceva «Adesso».

Cambiare epoca **non sblocca niente**: quello che hai tenuto fermo resta fermo.
Mischiare un genere degli anni 70 con una produzione di adesso e' esattamente
il tipo di riga che nessuno scriverebbe da solo — vedi § 9.

## 7. I dodici gradi

Ogni pezzo ha un **prezzo in lire**, e il prezzo dice il **grado**. Sono dodici,
in quest'ordine — e si', **Epic sta dopo Divine**: e' la scala scelta da Cammo,
e in un gioco la scala e' una decisione, non una deduzione.

| Grado | Da | In euro | Quanto esce | Punti | Fuoco |
|---|---|---|---|---|---|
| Basic | 0 £ | — | 40% | 1 | 0 |
| Grand | 250 £ | 0,13 € | 22% | 3 | 0 |
| Rare | 600 £ | 0,31 € | 14% | 8 | 1 |
| Arcane | 1.200 £ | 0,62 € | 9% | 18 | 1 |
| Heroic | 2.200 £ | 1,14 € | 6% | 35 | 1 |
| **Unique** | **3.600 £** | **1,86 €** | 4% | 70 | 2 |
| Celestial | 5.809 £ | **3,00 €** | 2,4% | 140 | 3 |
| Divine | 9.700 £ | 5,01 € | 1,4% | 280 | 3 |
| Epic | 15.500 £ | 8,01 € | 0,8% | 600 | 4 |
| Legendary | 25.000 £ | 12,91 € | 0,3% | 1.400 | 4 |
| Mythic | 40.000 £ | 20,66 € | 0,1% | 4.000 | 5 |
| **Ethernal** | 68.000 £ | 35,12 € | 0,03% | 12.000 | 5 |

In vetrina costano **venti volte la soglia**: un Rare sta sulle dodicimila, un
Unique — il massimo che si possa mettere in vendita — sulle settantaduemila.

### ⚠ I tre euro, dall'11 settembre 2026 — e dove sono finiti

Detto cosi': «i premi della slot non vanno bene, danno troppe lire. **Fino al
livello unique valgono massimo l'equivalente di 3 euro.** Le combinazioni sono
quelle che possono avere valore, quindi aggiustiamo in modo da stabilizzare i
prezzi».

Il giorno prima la scala era salita **al milione**, per stare nella stessa moneta
dei regali. Quella meta' era giusta e resta: la moneta e' una sola. Sbagliata era
l'**altezza**. Con Unique che partiva da un milione, prendere una combinazione
voleva dire pagarla cinquecento euro: nel giro di una serata chi gioca aveva in
tasca piu' lire di quante ne servissero per comprare tutto, e un portafoglio che
non si svuota piu' spegne il gioco (§ 4).

Adesso il muro e' scritto: **Unique finisce a tre euro**, cioe' dove comincia
Celestial.

⚠ **Il giorno dopo Celestial si e' aperto davvero, e il tetto e' salito da
solo** — fino in cima, perche' i gradi sono arrivati a Ethernal (vedi qui
sotto). E' esattamente quello che questa riga prometteva: il tetto non e' mai
stato un numero a parte da tenere allineato, e infatti non c'e' stato niente da
allineare. Quello che resta dei tre euro e' il confine fra Unique e Celestial,
che e' sempre stato il loro mestiere vero.

**Le proporzioni non sono cambiate mai**: ogni gradino vale circa una volta e
mezzo quello sotto. In due giorni e' cambiata tre volte l'altezza e mai il
disegno.

⚠ **Sono scesi anche i prezzi dei pezzi sui rulli**, e non era una scelta: i
gradi si leggono dal prezzo, quindi con le soglie a tre euro e i pezzi fra mille
e diciannove milioni **tutti i dodici rulli sarebbero diventati Ethernal** — lo
stesso guaio del giorno prima, girato dall'altra parte. Un pezzo va adesso da 60
a 68.060 lire, con la stessa curva e la stessa distribuzione sui 6.291 generi
veri.

⚠ **Un pezzo sul rullo puo' valere piu' del tetto di una figurina.** Un Mythic
sta sui quarantamila, venti euro: sopra i tre euro di una cosa presa. Non e' una
contraddizione, sono due mestieri: il prezzo di un pezzo dice **quanto e' raro**
(e da li' il colore sul rullo), il prezzo di una figurina dice **quanto ti
pagano**. Fra i due c'e' la media (§ 10).

⚠ **Quello che era gia' scritto sul disco si converte tenendo il grado**: una
figurina Unique di ieri e' una figurina Unique oggi, e vale tre euro invece di
cinquecento. Chi stava sopra al tetto ci si appoggia — il distintivo diceva
«Unique» gia' da ieri, adesso lo dice anche il numero. **Anche i portafogli
scendono con la scala**, se no chi ha giocato ieri si sveglia con mille volte i
soldi di tutti. Si converte leggendo, una volta sola: il file dice con che metro
e' stato scritto (`versione`), e di metri vecchi ce ne sono due.

Un Mythic ogni mille caselle: con dodici rulli, **uno ogni ottantatre giri**. Un
**Ethernal** ogni tremilatrecento: uno ogni duecentosettanta giri.

### ⚠ Le figurine arrivano fino a Ethernal, dal 12 settembre 2026

Detto cosi': «nella sala giochi gli item ricevuti possono arrivare fino al
grado ethernal».

Per due giorni si erano fermate a **Unique**, il sesto, e il motivo era buono:
la rarita' e' **un rapporto**, e con dieci figurine in tutto chiamarne una
Mythic non vuol dire niente — non c'e' niente sotto che la faccia sembrare rara,
e si brucia la parola prima di avere il gioco. Adesso il magazzino comincia a
riempirsi, e i sei gradi in cima si aprono.

Resta il mestiere di chi comanda **non regalarli**: un Ethernal che si da' a
tutti e' un Basic con un nome piu' lungo. E la scala adesso e' una sola per i
pezzi sui rulli e per le cose prese — un elenco, una verita'.

Sta scritto in un posto solo — `TETTO_FIGURINE` in `regole.ts` — e da li'
passano la figurina che si guarda, quella che cade da un pacchetto, quella che
si regala girando, i tasti con cui si sceglie il grado e i tagli del bonus. Il
giorno che si rimette un muro piu' basso, scende dappertutto.

⚠ **Sopra all'ultimo grado non c'e' niente a cui fermarsi, quindi non c'e' piu'
un tetto in lire.** `tettoDelValore()` risponde infinito, ed era il ramo scritto
apposta per questo giorno. Il muro dei **tre euro** resta dov'e' — e' il punto
dove finisce Unique e comincia Celestial — solo che non e' piu' la cima.

⚠ **E i tasti del bonus ci arrivano.** Con l'ultimo tasto da tre euro, per dare
un Ethernal bisognava batterlo **dodici volte**: un tasto che si preme dodici
volte e' una casella vuota con piu' passaggi. Adesso sotto ai tre euro ci sono i
sei piccoli di prima — li' si decide di centesimi, ed e' li' che finisce quasi
tutto — e sopra ce ne stanno quattro grossi, l'ultimo dei quali **e'** la soglia
del grado piu' alto. La strada piu' corta resta un'altra e c'era gia': si tocca
il grado, e il bonus ci si mette da solo al minimo che ci arriva.

⚠ **Ethernal si scrive con la «h»** perche' cosi' l'ha scritto Cammo il 10
settembre 2026, e i nomi dei gradi sono suoi.

⚠ **Le frequenze sono su diecimila, non su mille.** Erano su mille fino al 10
settembre: si e' cambiato per far entrare Ethernal sotto Mythic senza spostare
nessun altro. Con i millesimi il gradino piu' basso era gia' occupato — Mythic
valeva 1 — e l'unico modo di mettere qualcosa di piu' raro sarebbe stato rendere
Mythic piu' comune, cioe' cambiare una scala per aggiungerci una riga.

Il grado non si scrive da nessuna parte: **si ricava dal prezzo**. Se fosse un
campo scritto accanto, il giorno che si abbassa il prezzo di un pezzo
resterebbe «Mythic» a due lire.

**Quanto spesso esce un grado e' una scelta, non un conto.** Si pesca prima il
grado e poi il pezzo dentro il grado: se si pescasse piatto, il giorno che si
aggiungono trenta pezzi comuni i Mythic diventerebbero il doppio piu' rari
senza che nessuno l'abbia deciso.

### Il fuoco: quanto si accende lo schermo

Chiesto il 10 settembre 2026: «facciamo i gradi da celestial in su molto piu'
potenti, come gradi e come anteprime, molto piu' articolate». Prima i cinque
gradi piu' alti facevano **la stessa identica scena** — erano tutti «fuoco 3» —
e in un gioco di rarita' **la scena e' il premio**: chi tirava un Mythic vedeva
quello che aveva gia' visto con un Epic.

| Fuoco | Chi | Cosa si vede |
|---|---|---|
| 0 | Basic, Grand | niente |
| 1 | Rare, Arcane, Heroic | il bordo si accende, e lo schermo lampeggia |
| 2 | Unique | e la sala si scuote |
| 3 | Celestial, Divine | e cadono i coriandoli, col nome del grado detto forte |
| 4 | Epic, Legendary | e partono i raggi dietro alla sala, la carta si alza |
| 5 | Mythic, Ethernal | **si ferma tutto**: il nome grande sullo schermo, e si tocca per chiudere |

Il cinque e' l'unica cosa in tutto il gioco che **interrompe**. Un premio che
passa mentre stai gia' guardando altrove non e' un premio — e capita una volta
su mille caselle.

## 8. Il giro

Costa. Se esce qualcosa di buono, paga:

| Cosa esce | Punti |
|---|---|
| il grado piu' alto uscito | quello che dice la tabella sopra |
| tre caselle o piu' dello stesso grado, da Rare in su | quel grado **×2**, in piu' |
| **tutte e dodici** da Heroic in su | **schermo pieno, 3.000–5.000 punti** |
| il meglio e' sotto Rare | ogni tanto una consolazione (1–4 punti) |

I punti del grado si contano **una volta sola**, per il piu' alto uscito: se
contassero tutti, un Mythic prenderebbe anche i punti del Basic accanto. Il
tris invece si somma, perche' e' un'altra cosa — non «che ti e' uscito», ma
«quante volte».

**Il giro a mani vuote non esiste**: anche dodici Basic danno un punto. Con
l'esperienza al posto delle lire, ogni giro deve far avanzare di qualcosa.

Le **formazioni** si sommano a parte: combinazioni dichiarate da chi comanda
(«questi tre pezzi insieme»), valide in qualsiasi ordine.

### Come si sta davanti alla slot

Quattro cose che sembrano dettagli e sono il motivo per cui uno ci resta.

- **Si scrive in italiano, ma il prompt e' inglese.** Il nome sul rullo e' in
  italiano perche' e' quello che leggi; sotto, piccolo, c'e' **quello che va
  davvero al modello** — cosi' non devi indovinare cosa stai mandando. E le
  frasi inglesi sono lunghe apposta: «a cat» e' un gatto qualunque, «a cat,
  close on the face, whiskers catching the light» e' una foto.
- **Tenere premuto apre grande.** Un rullo, la riga del prompt o una figurina:
  mezzo secondo di dito e si apre a tutto schermo, scritto grosso. Serve a chi
  ci vede poco e a chiunque debba leggere dodici pezzi su un telefono.
- **L'animazione si salta.** Primo tocco gira, secondo tocco taglia corto e
  mostra subito cos'e' uscito, terzo tocco rigira. Chi ha fretta non aspetta
  mai la scena.
- **Quello che hai bloccato non si perde.** Cambiando tavolo, cambiando epoca o
  chiudendo la pagina, i pezzi tenuti fermi restano dove li hai lasciati — anche
  il giorno dopo. Una combinazione buona si costruisce in piu' sere, e mischiare
  un genere degli anni 70 con una produzione di adesso e' esattamente il tipo di
  riga che nessuno scriverebbe da solo.
  ⚠ **L'unica cosa che azzera i blocchi e' mandare** (§ 5): li' la riga se n'e'
  andata, e tenerla ancora ferma davanti vorrebbe dire ricominciare da una cosa
  che non e' piu' tua da decidere.

## 9. Mandare una cosa a controllare — il cuore di tutto

Quando la riga piace, si manda. **Mandare non costa niente**: se costasse, la
gente manderebbe solo quello di cui e' sicura, e le cose strane — che sono
quelle che servono — non arriverebbero mai.

Chi manda **continua a giocare**. Non aspetta niente e non si blocca niente: la
combinazione se ne va e lui tira di nuovo la leva.

Una combinazione mandata sta in **fila**, e ha tre vite possibili:

| Stato | Cosa vuol dire |
|---|---|
| **in attesa** | e' arrivata, nessuno l'ha ancora guardata |
| **presa** | l'admin le ha dato un prezzo: da adesso e' nel magazzino |
| **buttata** | non andava bene. Chi l'ha mandata lo viene a sapere, col motivo |

Una combinazione **si riconosce dai pezzi, non dalle parole**: gli stessi
dodici pezzi sono la stessa combinazione anche se arrivano da due persone
diverse. Confrontare i prompt scritti non basterebbe — uno spazio in piu' e ne
entrerebbero due uguali.

### Quando due persone trovano la stessa riga

⚠ **E' la regola piu' bella del gioco, e va letta tutta.** Con dodici rulli e
migliaia di pezzi, ritrovare per caso la stessa identica riga che ha trovato
tuo fratello e' difficilissimo. Quindi quando succede **non** si dice «gia'
vista»: dipende da chi sei.

| Chi la manda | Cosa succede |
|---|---|
| e' **nuova** | va in fila. Non costa niente |
| c'e' gia' ed e' **in attesa** | niente, e si dice: nessuno ha ancora detto se vale |
| e' stata **buttata** | niente, e si dice perche' |
| e' **presa**, e tu **ce l'hai gia'** | buco nell'acqua: **due lire di multa** |
| e' **presa**, e tu **non ce l'avevi** | **complimenti**: prendi lo stesso premio in lire di chi l'ha scoperta, **piu' la figurina** |

L'ultima riga e' il cuore: chi ci arriva per conto suo a una combinazione buona
viene pagato come il primo, anche se il primo l'aveva trovata la settimana
scorsa. Non conta chi e' arrivato prima — conta **esserci arrivato**. In
classifica invece resta solo chi l'ha **scoperta**: quella e' la riga di chi
l'ha inventata.

E la penultima e' il freno: due lire, poche ma non zero, contro il rimandare a
raffica sempre la stessa sperando che qualcosa succeda.

## 10. Chi comanda la prova, e decide

Nel pannello dell'admin le combinazioni arrivate stanno una sotto l'altra, con
scritto chi le ha mandate e quando. Per ognuna si puo':

- **provarla davvero** — parte una generazione con quel prompt, per la stessa
  strada da cui passano le richieste del telefono. Il pezzo o l'immagine esce e
  si guarda. **Il costo lo paga il banco, non il giocatore**: e' l'admin che ha
  scelto di provarla;
- **prenderla**. ⚠ Il prezzo **non si scrive a mano**: e' quanto valgono i suoi
  pezzi **in media** — un numero vero, viene dalla rarita' di ognuno — piu' un
  **bonus** che e' l'unica cosa che decide una persona. Il bonus dice quanto
  quella riga vale *oltre* i pezzi di cui e' fatta, cioe' quanto e' bella
  l'idea; puo' anche essere zero. Cosi' una combinazione di roba rara parte alta
  anche quando chi comanda ha fretta, e una di roba comune ma geniale la si puo'
  pagare bene lo stesso.

  ⚠ **La media e non la somma**, dall'11 settembre 2026, e i motivi sono due. Il
  primo: dodici pezzi valgono in media 1.600 lire l'uno, e sommati fanno dieci
  euro — con il tetto a tre, *ogni* combinazione avrebbe pagato il massimo, e una
  scala dove tutti prendono il voto piu' alto non e' una scala. Il secondo e'
  peggiore: da quando si manda solo quello che si e' bloccato (§ 5), una riga puo'
  avere tre pezzi o dodici, e con la somma bloccarne dodici a caso pagava quattro
  volte tre pezzi scelti. Cioe' il contrario esatto di quello per cui si manda
  solo il bloccato. **Quanti sono non e' un merito; cosa sono si'.**

  ⚠ **E sopra c'e' il tetto** (§ 7): finche' i gradi si fermano a Unique, una
  cosa presa non vale piu' di tre euro. Il bonus serve ad arrivarci, non a
  sfondarlo;
- **attaccarci il contenuto**: le immagini o i brani venuti fuori da quel
  prompt. ⚠ **Sono piu' d'uno dal 10 settembre 2026**, vedi qui sotto. E' quello che la fa diventare una figurina che si guarda, ed e' la
  copertina della sua scheda nello shop — senza, uno comprerebbe una parola.
  ⚠ **Si sceglie dalla galleria della suite, toccandola.** Prima si scriveva
  a mano l'indirizzo del file in una casella: quattro gesti in due finestre,
  ogni volta, e chi ha fretta non li fa.
  ⚠ **E la galleria e' divisa per mucchi**, dal 12 settembre 2026: «ancora non
  sono divise bene quando voglio aggiungere dalla suite». Erano sessanta
  quadratini in ordine di data — foto, brani e video mescolati — e per trovare
  la canzone appena generata bisognava riconoscerne la copertina in mezzo a
  quaranta immagini, che e' impossibile perche' **le copertine dei brani sono
  immagini**. Adesso si sceglie prima che cosa si cerca — immagini, brani,
  video, altro — e c'e' un cerca per nome. Cercando una **copertina** si aprono
  direttamente le immagini: far scegliere un mp3 come copertina di un brano e'
  un modo di sbagliare che non deve esistere.
  ⚠ **E se e' un brano, si attacca anche la sua copertina.** Un brano e' un
  rettangolo con un tasto play: in un album di cento figurine non lo riconosce
  nessuno. Se la libreria della suite ce l'ha gia' — le copertine dei brani e i
  fotogrammi dei video li fa lei — si prende da sola; se no, si sceglie a mano;
  ⚠ **e un brano si deve poter sentire.** Detto il 12 settembre 2026: «le
  canzoni non si sentono». Non erano rotte e il file era giusto: il lettore
  stava dentro una casella da **centodieci pixel**, nella striscia che scorre di
  fianco, e sotto ai duecento pixel il browser del telefono taglia via meta' dei
  comandi — il tasto play finiva **fuori** dalla casella. C'era, e non si poteva
  premere. Adesso un brano non e' un quadratino come gli altri: e' una riga
  larga quanto la carta, con la copertina a sinistra e il lettore a destra, ed e'
  la stessa in tutti i posti dove un brano compare — le prove, gli attacchi, la
  figurina. Una canzone che si sente di qua e non di la' e' la solita cosa fatta
  in due posti;
- **buttarla**, scrivendo perche'.

Il bonus si batte su otto tasti e si sommano: piu' li premi, piu' sale. Davanti
a otto numeri conosciuti si decide in un secondo; davanti a una casella vuota ci
si mette a pensare quanto vale un'idea, e finisce che non si decide.

⚠ **Sono euro come i regali** (§ 4), ma **tagliati piccoli**: 0,10 · 0,25 · 0,50
· 1 · 2 · 3. Con il tetto a tre euro, sette degli otto tasti dei regali lo
sfonderebbero al primo colpo — sarebbero sette tasti che si chiamano tutti
«massimo». Cosi' invece a ogni gradino ci si arriva battendo, e l'ultimo tasto
**e'** il tetto. Il muro non lo tengono i tasti: lo tiene il PC quando prende.

Il grado che ne viene si legge **mentre** si preme, accanto al totale. E si puo'
fare la strada contraria: si tocca il grado, e il bonus si mette da solo al
minimo che ci arriva.

### Provarla davvero, prima di darle un prezzo

Su ogni combinazione in fila c'e' un tasto che **la fa generare**. Con che cosa
lo decide il computer, non il gioco: una clip di sessanta secondi strumentale
con ACE-Step Turbo per la musica, un'immagine 4:3 con FLUX.2 9B per le immagini.
Parte per la stessa strada delle richieste del telefono, quindi rispetta la coda
e i tetti.

⚠ **Il costo lo paga il banco, non chi ha mandato.** E' l'admin che ha scelto
di provarla. Se si scalasse a chi la manda, mandare costerebbe — e mandare deve
essere gratis (§ 9).

### Quattro tentativi, e tornano qui da soli

Chiesto il 10 settembre 2026:

> «Quando un admin manda a generare un contenuto, quando pronto lo deve vedere
> gia' allegato alla card in modo da controllarlo. Puo' rigenerare e viene
> generato un secondo file, max 4 file, e alla fine puo' selezionare uno o piu'
> elementi generati da includere nel pacchetto.»

Tre cose, e ognuna toglie di mezzo un giro a vuoto.

**Uno: torna da sola.** Quando la generazione e' pronta, il file compare **sulla
card**. Prima l'avviso diceva «la trovi in galleria», e per guardarla bisognava
aprire la galleria, cercarla, tornare in fila e riattaccarla a mano: due
finestre per vedere una cosa nata da quel tasto.

⚠ **Il gioco non tiene un registro di cosa ha prodotto cosa.** Tiene la targa
della richiesta; quale file ne sia nato lo sa la libreria della suite, che nei
metadati di ogni file scrive da che richiesta viene. Tenerne qui una copia
vorrebbe dire un secondo elenco da riallineare ogni volta che si cancella una
foto.

**Due: si rigenera, fino a quattro volte.** Prima partiva una volta sola e poi
il tasto restava spento per sempre. Il motivo era buono dentro il singolo giro —
una generazione ci mette minuti, e ripremere metterebbe in coda tre lavori
uguali — ma «una volta sola per sempre» e' un'altra cosa: un modello sbaglia, e
giudicare un prompt dal suo primo scatto e' un altro modo di tirare a
indovinare. Quattro e' quello che ci sta in fila su un telefono, e sono
abbastanza per capire se un prompt tiene o se e' stato un colpo di fortuna.

**Tre: si sceglie cosa tenere.** Delle quattro se ne spunta **una o piu'
d'una**, e finiscono tutte attaccate alla figurina. Non e' «l'ultima vince»: il
senso di generare quattro volte e' poterle confrontare.

E oltre a quelle, **fino a quattro cose scelte a mano** dalla galleria della
suite — «magari da quei prompt nascono cose particolari». Otto in tutto: quattro
nate dal prompt e quattro scelte col dito. La **prima** e' la faccia della
scheda nello shop, e le generate stanno davanti, perche' sono quelle che la
figurina promette di essere.

### Le buttate stanno in un mazzo loro

⚠ Deciso il 10 settembre 2026: **una combinazione buttata sparisce dalla
fila** e finisce in un cassetto chiuso, sia per chi comanda sia per chi l'ha
mandata. A chi l'ha mandata si mostra per quello che e': un **biglietto
perdente**, grigio e timbrato, col perche' scritto sotto.

Non si cancella — serve a non far tornare domani la stessa riga, e un no senza
perche' non insegna niente — ma non sta piu' in mezzo alle altre. Sulle prese si
decide la vetrina, e cercare quella da mettere in vendita in mezzo a dieci
scartate e' lavoro inutile fatto ogni volta; e per chi gioca, aprire la propria
pagina non deve voler dire leggere per primi i propri no.

**Chi l'ha mandata viene pagato.** Il prezzo che l'admin le da' finisce anche in
tasca sua, una volta sola, quando viene presa. E' il motivo per cui uno si
prende la briga di montare una riga buona invece di mandare la prima che esce —
e rende il gioco una cosa che si fa in due.

## 11. Il magazzino, le serie e i pacchetti

Le cose prese finiscono nel **magazzino**, in ordine di arrivo.

Quando chi comanda decide che una raccolta e' finita, la chiude in un
**pacchetto** — un album, come le figurine. Cento e' la misura che si consiglia,
non una porta: vedi qui sotto. Il pacchetto chiuso e' quello che si compra:
costa lire e dentro ci sono **nove carte a caso**, pescate fra le figurine di
quel pacchetto e le cinquanta della casa, con le stesse frequenze dei gradi (una
Mythic esce una volta su mille). I doppioni non deludono: una figurina vera
paga il suo prezzo in lire, una della casa cresce.

### ⚠ Il pacchetto lo chiude una persona, quando vuole

Deciso il 10 settembre 2026: «ogni prompt accettato finisce in questo pacchetto;
arrivato a 100, un admin puo' creare il pacchetto». E il 12: «facciamo che un
admin puo' creare un pacchetto quando vuole, anche con meno di 100 creazioni».

Chiudere una raccolta e' l'atto con cui si dice «questa e' finita, si vende», ed
e' una decisione — come dare un prezzo a una combinazione. Le decisioni qui le
prende una persona, e adesso **anche il quando**: cento non e' piu' una porta,
e' un suggerimento scritto accanto al tasto («ne mancano dodici per farne uno
pieno»). Ci sta che una raccolta sia finita a quaranta — le cose di Natale, i
primi cento giorni — e ci sta che a novantotto arrivi qualcosa che deve entrare
per forza in quella li'.

⚠ **Da quel giorno un pacchetto e' una riga scritta, non un conto.** Prima «le
serie chiuse» erano `magazzino / 100` e «cosa c'e' nella serie 2» era «dalla
centouno alla duecento»: con un pacchetto da quaranta tutti i confini di quelli
dopo si sarebbero spostati, e la figurina numero 41 sarebbe passata da una serie
all'altra da sola, dopo che qualcuno l'aveva gia' comprata. Adesso dentro un
pacchetto ci stanno gli id di quel giorno, e restano quelli per sempre: quello
che arriva dopo aspetta il prossimo.

Un pacchetto puo' avere un **nome** — «le cose di Natale» si ricorda, «serie 3»
no — e i file scritti prima del 12 settembre ritrovano i loro pacchetti leggendo,
una volta sola, esattamente com'erano: i primi cento nel primo, i secondi cento
nel secondo, quelle che avanzano ancora fuori.

### ⚠ Le tre strade per avere una figurina, e sono diverse apposta

Il 10 settembre 2026 si e' aggiunta la terza, e le tre insieme sono l'impianto:

| Strada | Cosa costa | Cosa da' |
|---|---|---|
| **inventarla** | il tempo di montarla, e che a chi comanda piaccia | quella li', piu' le lire |
| **la slot dei pacchetti** | lire, tante volte | una a caso, molto di rado |
| **il negozio** | tante lire in una volta | **esattamente quella che vuoi** |

Se due si somigliano, una mangia l'altra. La fortuna deve costare **tempo**, la
certezza deve costare **lire**, e inventare deve restare la sola che paga
invece di far pagare.

**La slot dei pacchetti** e' una seconda macchina, e non si monta niente: si
tira, e molto raramente cade un item di un pacchetto gia' chiuso. Non si sceglie
da quale — il mazzo e' uno solo, fatto di tutti i pacchetti chiusi — e dentro si
pesca con le frequenze dei gradi. «Tutti insieme, tutti random», come e' stato
chiesto. Com'e' fatta sta qui sotto, al § 11-bis.

Si sbloccano anche **giocando**: ogni tanto un giro fortunato ne regala una.

Una combinazione sbloccata e' **tua**: sta nella tua collezione, la vedi intera,
la puoi copiare e la puoi mandare a produrre.

⚠ **Una che non hai, dall'11 settembre 2026, si vede in un posto solo per
volta, e in modo diverso:**

| Dove | Cosa si vede di una che non hai |
|---|---|
| nel pacchetto aperto | **niente**: chi gioca trova solo le sue, e sa quante altre ci sono |
| nell'Inventario | un **buco**, col numero e il grado: si sa cosa si sta cercando, non cos'e' |
| nello shop | la **faccia** e il prezzo: uno deve guardare cosa compra, il prompt no |

Chi comanda vede tutto dappertutto: le deve poter controllare.

### ⚠ La scheda si chiama «Pacchetti», e un pacchetto si strappa

Fino all'11 settembre 2026 si chiamava «Album» e mostrava tutte le figurine di
un pacchetto, coperte, una sotto l'altra. Parole sue: «cambiamo album in
Pacchetti, e mettiamo anche li' un menu a tendina per nascondere gli elementi a
schermo». Adesso ogni pacchetto e' una **bustina** con la barra di quante ne
hai: si tocca e si apre. In fondo c'e' la tendina con le cose prese che non
stanno ancora in nessun pacchetto — quelle che finiscono nel prossimo — ed e'
li' che chi comanda lo chiude.

⚠ **Nove carte per pacchetto**, dall'11 settembre 2026: «molto belli i pack,
mettiamo che in ogni pack escono 9 carte». E il prezzo e' tornato quello del
codice: nel file vero il pacchetto costava ancora 250 lire, perche' il file si
teneva le impostazioni del giorno in cui era nato (vedi la versione 4 del file).

### ⚠ Le figurine della casa: cinquanta, e crescono

> «Mettiamo un 50 item fake in modo da farli uscire, e quegli item fake piu' ne
> collezioniamo piu' si evolvono: partono da basic fino a ethernal.»

Stanno **in tutti i pacchetti** e sui rulli della macchinetta, con una faccia
disegnata — un segno solo, grande, su un fondo della sua tinta. Pesano come un
Basic, quindi escono quasi sempre: le figurine vere restano quelle rare.

**Crescono con le copie.** La prima copia e' Basic; ogni copia in piu' della
stessa la avvicina al grado dopo — due per Grand, tre per Rare, cinque per
Arcane, e cosi' via fino a **cinquanta per Ethernal**. Crescendo il disegno si
arricchisce: i raggi da Rare, l'anello da Unique, le stelle da Epic.

⚠ **Una copia in piu' non paga lire: fa crescere.** E' la differenza con le
figurine vere, dove il doppione paga il suo prezzo. Ed e' anche il motivo per
cui nove carte a cinquemila lire non sono una stampante di soldi: quasi tutte le
carte sono della casa, e non restituiscono niente.

⚠ **Non stanno nel file del gioco, stanno nel codice** (`casa.ts`): sono le
stesse per tutti e non le inventa nessuno. Nel conto c'e' solo quante copie se
ne hanno. Non si comprano nello shop, non contano in classifica, e non entrano
nei pacchetti da chiudere: sono il catalogo della sala, non combinazioni prese.

E un pacchetto comprato **si strappa col dito**: «magari fai uno slide con il
dito, tipo per tagliare e aprire il pacchetto, e poi si vede cosa esce». La busta
si apre a tutto schermo, si passa il dito sulla riga tratteggiata, e le figurine
escono coperte e si girano una alla volta. Cosa c'e' dentro l'ha gia' deciso il
PC quando si e' pagato (§ 3): la scena non cambia niente.

### Non solo prompt: **tutto** quello che la suite fa puo' diventare una figurina

Chiesto il 9 settembre 2026: «predisponiamolo a ricevere tutti gli item dalla
suite che possono essere potenzialmente nuovi item collezionabili — magari una
immagine, una canzone e' un collezionabile».

Quindi il magazzino **non e'** «l'elenco dei prompt approvati»: e' l'elenco
delle **cose che valgono qualcosa**, e un prompt e' solo la prima specie. Una
foto venuta bene, un brano che gira, un video: se sta nella libreria della suite
e a chi comanda piace, diventa una figurina con un grado addosso e finisce nei
pacchetti come le altre.

Il pezzo che cambia da specie a specie e' solo **come si guarda**: un prompt si
legge, un'immagine si vede, un brano si ascolta. Tutto il resto — il prezzo, il
grado, chi l'ha fatta, i doppioni che pagano — e' identico.

⚠ **Il gioco non tiene file.** Tiene il numero di targa di una cosa che sta
gia' nella galleria, e quando serve mostrarla la chiede a chi ospita. Cosi' una
foto non esiste in due copie, e cancellarla dalla galleria non lascia qui una
figurina che punta al vuoto.

La porta si chiama `manda-dalla-libreria`, ed e' pensata per essere aperta da
**un tasto nella galleria della suite** — «mandala in sala giochi» — non dalla
pagina della slot.

## 11-bis. La macchinetta: tre file da tre

Chiesta il 12 settembre 2026 con due file, ed e' **la slot dei pacchetti** del
paragrafo qui sopra, fatta:

> «Aggiungiamo la slot dove ci saranno 6 rulli, 3 per fila, che funziona come una
> slot classica. Girandola puoi inserire se giocare a 50 lire, 100 lire o 200
> lire, e se si riescono a mettere in fila gli item si vince. Questa slot per
> funzionare deve esserci almeno 1 pacchetto disponibile, e ad ogni pacchetto si
> aggiorna automaticamente. Le possibilita' di vincere sono basse e deve usare
> solo le immagini dei pacchetti: quando quelle immagini formano una fila da 3
> allora si vince un premio in lire leggero, mentre se invece l'utente riesce a
> far uscire 6 immagini totali tutte uguali allora vince un superbonus in lire
> sempre contenuto e in piu' l'immagine viene sbloccata e aggiunta
> nell'inventario.»

⚠ **La terza fila, l'11 settembre 2026**: «aggiungiamo un'altra riga, sempre
stesso funzionamento: si vince quando o una riga e' completa o quando tutto lo
schermo ha la stessa immagine, in quel caso si sblocca pure l'immagine». Quindi
nove caselle: una fila completa paga come prima, piu' file si sommano, e il
colpo grosso e' **tutto lo schermo** uguale. Quanto spesso si vince non si e'
mosso — vedi qui sotto — perche' non viene dal numero di caselle.

⚠ **Non e' l'altra slot con meno rulli: sono due mestieri.** Davanti a
`DaProdSlot` si **monta** una cosa — dodici rulli, si blocca, si manda a
controllare, e paga esperienza. Qui non si monta niente: si punta, si tira, e
ogni tanto cade una figurina. Sono due schede in fondo, non un interruttore
dentro la stessa schermata.

**Cosa gira sui rulli.** ⚠ **Tutte** le figurine dei pacchetti chiusi, e le
cinquanta della casa. Fino all'11 settembre 2026 giravano solo quelle con
un'immagine attaccata, e nel file vero erano undici su quarantacinque — tutte
inventate dagli stessi due dispositivi: «vedo solo immagini di cammo o
tabletcammo». Adesso ogni figurina ha una faccia (§ 13-bis): una foto, la
copertina di un brano, o una disegnata col titolo e il colore del grado.

**Il mazzo non e' scritto da nessuna parte: si conta a ogni giro.** Cosi' «a ogni
pacchetto si aggiorna automaticamente» non e' una cosa da ricordarsi di fare, e'
come e' fatta. E le figurine **fuori** dai pacchetti non girano: se girassero, la
macchinetta regalerebbe roba che non si puo' ancora comprare da nessuna parte, e
il pacchetto non varrebbe piu' niente.

**Quanto si punta.** Cinquanta, cento, duecento lire. Lire piccole e non euro
contati in lire: un giro deve costare **poco**, perche' il punto e' tirare tante
volte. Il premio si conta in volte la puntata, quindi chi punta duecento vince
quattro volte chi punta cinquanta — e rischia quattro volte tanto.

**Cosa paga.**

| Cosa esce | Quanto | Quanto spesso |
|---|---|---|
| una fila | la puntata **×2** (Basic) fino a **×13** (Ethernal) |
| due file | le due file, **il doppio** |
| **tre file** | il superbonus del grado piu' alto — **×40** fino a **×150** — e **le figurine delle file si sbloccano** |
| **tutto lo schermo uguale** | il superbonus **due volte**, e la figurina si sblocca |

### ⚠ Un giro sono due tiri, dall'11 settembre 2026

> «Facciamo che giri una volta e poi puoi bloccare degli item per poi girare di
> nuovo: l'utente paga, gira 2 volte, la prima si riempie lo schermo e puo'
> decidere di bloccare alcuni item, quindi rigira. Se l'utente non seleziona
> nulla viene comunque aggiornata la tabella: un giro in realta' sono due
> click.»

Si paga e si tira: lo schermo si riempie, e **il primo tiro non paga mai**, non
fa mai una fila intera. Si toccano le caselle da tenere — l'anello d'oro, lo
stesso dei rulli bloccati — e si rigira: cambiano le altre, ed e' li' che si
decide. Anche tenendo niente: allora cambiano tutte. Fra i due tiri il giro sta
scritto nel conto, quindi chiudere la pagina a meta' non lo perde e non lo fa
pagare due volte.

⚠ **Tenere aiuta, ma non regala.** Il principio di sempre resta: prima si decide
cosa deve succedere, poi si riempiono le caselle. Il primo tiro mette una coppia
in una fila **tre volte su dieci**; al secondo una fila si completa **quindici
volte su cento** se ne manca una sola, tre se ne mancano due, una se non si e'
tenuto niente. Tenendo le coppie, un giro paga qualcosa poco meno di una volta
su cinque, e la macchinetta rende poco piu' di un terzo di quello che incassa.
I numeri stanno in `PRIMO_TIRO` e `SECONDO_TIRO`, e la prova tira duemila volte
giocando bene e guarda il conto scendere.

⚠ **Tre file sbloccano, e sono rarissime**: una volta ogni qualche migliaio di
giri. E' la stessa strada di sempre per avere una figurina senza inventarla ne'
comprarla (§ 11): la fortuna costa tempo.

⚠ **Piu' rapida**, lo stesso giorno: «la slot Fortuna facciamo l'animazione piu'
rapida». Le caselle si fermano a cascata in meno di un secondo, e quelle tenute
non si muovono proprio.

⚠ **Quanto spesso si vince e' una scelta, non un conto** — la stessa regola dei
gradi sui rulli (§ 7). Se si pescassero sei simboli a caso e si guardasse cosa
esce, con cento figurine nel mazzo tre uguali in fila capiterebbero una volta su
diecimila e con dieci una volta su cento: la macchina cambierebbe mestiere da
sola ogni volta che chi comanda chiude un pacchetto. Quindi **prima si decide
cosa deve succedere, poi si riempiono le caselle** — e un giro che non paga non
deve mettere per caso tre figurine uguali, se no lo schermo dice una cosa e il
conto un'altra.

⚠ **Col pieno la figurina entra in collezione, ed e' quello il premio.** Le lire
sono il contorno, e restano contenute apposta: duecento lire su una figurina Rare
fanno quattro euro. E' la terza strada per avere una figurina (§ 11), quella in
cui la fortuna costa **tempo**. Il doppione paga il suo prezzo in lire, come nei
pacchetti: una cosa che avevi gia' e che non ti da' niente e' la cosa che fa
smettere di giocare.

⚠ **Si accende col primo pacchetto, e finche' non c'e' lo dice.** Un tasto che si
preme e risponde «non si puo'» e' un tasto che non doveva essere premibile: al
posto dei rulli c'e' scritto perche' e' spenta.

⚠ **Porta via piu' di quanto da', ed e' voluto.** Se rendesse, in una serata
sparirebbe il motivo di inventare combinazioni — che e' l'unica cosa che questo
gioco paga davvero. La fortuna costa tempo, la certezza costa lire, inventare
resta la sola strada che paga invece di far pagare.

## 12. Lo shop

Le figurine prese si possono anche **mettere in vendita**. Ce le mette chi
comanda, e decide due cose che sono tutte e due sue:

- **che grado hanno nello shop.** Non e' quello della slot — li' lo dicono i
  dati, qui lo sceglie una persona;
- **quanto costano.** Il grado ne suggerisce uno (venti volte la sua soglia — un
  Unique sulle settantaduemila, cioe' trentasette euro: si', **piu' del tetto di
  tre euro**, perche' comprare non deve essere la strada comoda. La stessa
  figurina cade da un pacchetto, se sei fortunato; chi compra paga di non
  aspettare la fortuna), ma il numero finale lo scrive chi vuole.

⚠ **Nello shop si paga caro, ed e' voluto.** La stessa figurina cade anche da
un pacchetto, se sei fortunato. Chi compra sta pagando **di non aspettare la
fortuna**, e quello si paga. Con la slot che rende solo esperienza, quelle lire
arrivano da una parte sola: inventando roba che a chi comanda piace.

### ⚠ Nel negozio ci vanno anche i pacchetti interi

Deciso il 10 settembre 2026: «i pacchetti finiscono anche nello shop, dove a un
prezzo molto piu' alto possono essere comprati item a piacimento».

Quindi due cose in vendita, non una:

- le **figurine in vetrina**, messe li' una a una da chi comanda;
- i **pacchetti chiusi**, e dentro a un pacchetto si compra **l'item che si
  vuole** — si sceglie, non si pesca — a un prezzo molto piu' alto.

E' la faccia opposta della slot dei pacchetti, e le due si tengono in piedi a
vicenda: li' spendi poco e speri, qui spendi tanto e sei sicuro.

⚠ **Quanto piu' alto, deciso l'11 settembre 2026**: «nello shop i prezzi sono
molto piu' alti. I pacchetti costano poco, ma la possibilita' di trovare
quell'item e' molto bassa, tipo quelle macchinette col braccio robotico dove non
si vince quasi mai».

La regola in una riga: **il doppio della vetrina, e mai meno di dieci
pacchetti.** Con la stessa cifra compri cinquanta figurine a caso, oppure quella.

| Grado | In vetrina | Scelta da un pacchetto |
|---|---|---|
| da Basic ad Arcane | da 250 a 24.000 £ | **50.000 £** |
| Unique | 72.000 £ | 144.000 £ |
| Mythic | 800.000 £ | 1.600.000 £ |
| Ethernal | 1.360.000 £ | **2.720.000 £** (1.405 €) |

La cima e' guardata: un Ethernal scelto di fatto non si compra, ed e' giusto — e'
la figurina che deve cadere, non comparire in tasca. I due numeri stanno in
`VOLTE_LA_VETRINA` e `PACCHETTI_DI_PAVIMENTO`, nel banco.

⚠ **Se una figurina e' anche in vetrina, vale il prezzo della vetrina**: e' la
decisione di una persona, e batte la regola. Il cartellino e la cassa leggono lo
stesso numero, da una funzione sola (`prezzoNelloShop`).

Lo stesso grado di vetrina dice anche **quanto raramente quella figurina cade
da un pacchetto**: e' un numero solo per due cose, non due numeri che un giorno
divergono.

La scheda nello shop mostra il **contenuto allegato** — l'immagine o il brano
venuti fuori da quel prompt — anche a chi non ce l'ha: uno deve poter guardare
cosa sta comprando. Il prompt no: quello resta coperto finche' non e' tuo.

### ⚠ Chi l'ha inventata c'e' scritto sempre, e si vede

Chiesto il 12 settembre 2026: «evidenziamo meglio il nome di chi ha creato quella
combinazione, anche quando poi saranno sbloccabili nei pacchetti o acquistabili
nel negozio ci deve essere scritto chi lo ha creato inizialmente».

Il nome c'era gia', ed era il difetto: stava in una riga grigia insieme alla
data, della stessa misura di tutto il resto. Cioe' l'unica cosa che dice **di
chi e' il merito** era la piu' facile da saltare. Adesso e' una pastiglia dorata
con l'iniziale dentro, ed e' **la stessa identica** in tutti i posti dove una
figurina si vede: la fila di chi controlla, l'album, il pacchetto che si apre, la
scheda del negozio, e le caselle della macchinetta. Una firma che cambia faccia
da una schermata all'altra non si riconosce.

⚠ **Non cambia mai, nemmeno quando la figurina passa di mano.** Chi la compra ce
l'ha in collezione, ma inventata non l'ha lui: il nome resta quello di prima, e in
classifica il punto resta suo. E' la stessa regola di § 9 — «non conta chi e'
arrivato prima, conta esserci arrivato», ma **scoperta** resta di uno solo — ed e'
il motivo per cui a qualcuno conviene inventarne un'altra.

## 13. Dove finisce, nella suite

Una combinazione presa **non resta nel gioco**. Entra nel magazzino unico di
prompt e stili della suite, quello del blocco 1 della 1.2.3, e da li' compare
come pastiglia in DaProdMusica e in DaProdFoto — con scritto chi l'ha fatta.

E' il motivo per cui la sala giochi sta dentro la suite invece che in un file
HTML sul desktop: quello che si vince qui, si usa di la'.

## 13-bis. L'inventario: quello che c'e' da avere

Chiesto il 10 settembre 2026:

> «Gli utenti devono avere un inventario da riempire con obbiettivi, man mano,
> che dovrebbe comprendere tutte le combinazioni possibili in questo gioco. Per
> il momento l'obbiettivo e' creare tutte le combinazioni possibili, e gli
> utenti le devono creare e collezionare tutte.»

L'inventario non e' l'elenco di quello che hai: e' **l'elenco di quello che c'e'
da avere, con i buchi in mezzo**. E' tutta li' la differenza fra una cartella e
un album di figurine — i buchi sono quello che fa continuare.

E il gioco cresce: man mano che la gente inventa, sui rulli si aggiungono parole
nuove, cosi' l'inventario non si finisce mai davvero.

### ⚠ «Tutte le combinazioni possibili» non e' un numero

Va detto perche' e' la trappola di questa idea: con dodici rulli e 6.291 generi
solo sul primo, le combinazioni possibili sono piu' dei granelli di sabbia. Un
inventario che le contenga tutte non si puo' costruire e nemmeno mostrare.

Le letture che funzionano sono due, e sono **due giochi diversi**:

- **le caselle** — si collezionano i *pezzi*: tutti i generi, tutte le voci,
  tutte le andature. Tanti ma **finiti**, si contano, e un pezzo si prende la
  prima volta che ti esce girando. E' quello che rende ogni giro una speranza
  anche quando non paga;
- **le combinazioni prese** — si collezionano le cose che chi comanda ha
  accettato. Finite per definizione — sono quelle che esistono — e crescono man
  mano che la gente inventa. E' quello che l'album fa gia' oggi.

### ⚠ Deciso l'11 settembre 2026: le combinazioni prese

> «Manca un inventario dove vedere tutti i collezionabili nascosti, e quando si
> sbloccano compaiono. Molto importante l'inventario per ogni utente e i
> progressi: voglio una bella page dedicata.»

Quindi la seconda lettura, e in una scheda sua: **Inventario**. Dentro ci sono
tutte le figurine dei pacchetti chiusi. Quelle che hai si guardano e si aprono
intere; quelle che mancano sono **buchi**, col numero e il grado — che ti manca
un Mythic lo devi sapere, cosa sia no. Quelle arrivate dall'ultima volta si
accendono.

Sopra, i progressi: quante ne hai su quante, in percentuale, per grado e per
pacchetto. E gli **obiettivi**, che non li scrive nessuno: vengono dai pacchetti
— completarne uno, il primo di ogni grado, dieci figurine, cinquanta. Una lista
scritta a mano il giorno che si chiude un pacchetto nuovo non lo sa.

⚠ **Contano solo le figurine dei pacchetti chiusi.** Quelle prese e non ancora
impacchettate non sono buchi: non si possono avere da nessuna parte, e un buco
che non si puo' riempire fa smettere di giocare. Se una e' gia' tua — l'hai
inventata, o riscoperta — si vede a parte, «fuori dai pacchetti».

La collezione che stava in fondo a Mie adesso sta qui: un posto solo, non due.

⚠ **Ogni figurina ha una faccia**, dall'11 settembre 2026: «nell'inventario non
tutti gli item si vede la foto». Nel file vero trentaquattro figurine su
quarantacinque erano solo un prompt. Adesso: una foto se c'e'; per un brano la
copertina che la libreria della suite gli ha gia' fatto, anche se nessuno
l'aveva attaccata; se no una faccia **disegnata** dalla pagina, col colore del
grado, il segno del tavolo e il titolo. La stessa in Inventario, sulla
macchinetta, nella busta e nello shop. E un brano, toccato, si apre grande con
la copertina e suona subito: «facciamole sentire bene».

Sotto ai pacchetti ci sono **le cinquanta della casa** (§ 11), ognuna col suo
grado, le copie, e la barretta verso il grado dopo. Si accendono quando sono
nuove e quando sono cresciute dall'ultima volta.

Le **caselle dei pezzi** — la prima lettura — restano un'idea per dopo.

## 14. La classifica di casa

Con le facce e i nomi di DaProd. I numeri che si guardano:

- **quante combinazioni gli hanno preso** — e' quella che conta;
- quante figurine ha;
- quanto ha in tasca.

⚠ **Il «Colpo» se n'e' andato l'11 settembre 2026**: «togliamo la statistica
colpo». Sotto quel titolo c'era il grado migliore uscito, cioe' due nomi per un
numero solo, e non decide piu' nemmeno i pari merito. Resta scritto nel conto.

Non si ordina per saldo: il saldo lo alza chi gioca di piu', e «chi ha giocato
di piu'» non e' una classifica, e' un contatore.

## 15. Cosa non e'

- Non e' un gioco d'azzardo con soldi veri, e non deve diventarlo.
- Non e' uno strumento di lavoro: per la roba seria ci sono le schede.
- Non e' un'app a se': e' **una pagina servita dal gateway**, come la console.
  Cosi' e' la stessa identica cosa sul computer, sul telefono e nel browser.

## 16. Le regole di questa cartella

- **Un pacchetto solo**, `@daprod/giochi`, e dentro ci sta tutto: le regole, i
  dati, il deposito, la pagina, le rotte. Fuori di qui, il giorno che si unisce,
  restano poche righe in tre file della suite.
- **Le regole sono funzioni pure**, senza disco e senza rete: cosi' si provano.
- **Il caso si passa da fuori.** Chi pesca prende una funzione random come
  argomento: una prova che non puo' fissare il dado non e' una prova.
- **Niente backtick nel codice della pagina.** La pagina e' una stringa dentro
  TypeScript: un backtick la chiuderebbe. Si concatena con `+`, come nella
  console.
- **Niente roba da fuori**: nessun CDN, nessun font esterno, nessuna immagine
  presa dalla rete. Una pagina che chiama fuori e' una pagina che non funziona
  quando la linea e' giu'.

## 17. Quello che ancora non e' deciso

- ⚠ **Il costo del giro, adesso che il tetto e' tre euro.** Dall'11 settembre
  2026 una cosa presa vale al massimo 5.808 lire, un giro costa **10 lire** e il
  regalo di benvenuto e' 500. Vuol dire che una combinazione presa al massimo
  paga **cinquecentottanta giri**, ed e' un numero che sta in piedi: si gioca una
  serata e finiscono. Prima del tetto ne pagava centocinquantamila, e la frase
  del § 4 — «le lire per giocare finiscono» — non era piu' vera; adesso lo e' di
  nuovo. Quello che resta da guardare e' l'altro capo: **il regalo di benvenuto**
  sono cinquanta giri, e per un pacchetto (5.000) servono dieci combinazioni
  buone o un regalo. Se all'inizio sembra troppo stretto si alza — e' una riga.

- **La slot dei pacchetti costa lire come l'altra, o ha un suo prezzo?** E rende
  esperienza anche lei?
- **Cento e' il numero giusto per una serie?** Con poche persone che giocano,
  cento combinazioni prese ci mettono un po' ad arrivare, e finche' la serie non
  si chiude non c'e' niente da comprare. Si puo' partire a cinquanta e alzarlo.
- **Quando aprire Celestial** (§ 7). Il tetto delle figurine e il tetto in lire
  sono la stessa decisione: il giorno che il magazzino e' abbastanza pieno da
  meritare un settimo grado, il muro dei tre euro si sposta da solo a cinque. Si
  fa quando ci sono i dati, non quando viene in mente.
- **Il secondo tavolo**, quello delle immagini: c'e' gia' il mazzo, ma i
  minigiochi per le immagini Cammo li ha in testa e non sono ancora scritti qui.
