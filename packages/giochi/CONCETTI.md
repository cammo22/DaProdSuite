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
200 e 500 euro, cioe' da 3.873 a 968.135 lire. Sono grossi rispetto al resto —
un giro costa 10 lire — e va saputo: chi regala sta facendo entrare qualcuno,
non pareggiando un conto. **I tasti del bonus sono un'altra scala**, in lire
piccole (§ 10): quelli devono far salire di grado un colpo alla volta, e la
scala dei gradi arriva a 1.400.

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

| Grado | Da | Quanto esce | Punti | Fuoco | In vetrina |
|---|---|---|---|---|---|
| Basic | 0 £ | 40% | 1 | 0 | 50 £ |
| Grand | 5 £ | 22% | 3 | 0 | 100 £ |
| Rare | 12 £ | 14% | 8 | 1 | 240 £ |
| Arcane | 25 £ | 9% | 18 | 1 | 500 £ |
| Heroic | 45 £ | 6% | 35 | 1 | 900 £ |
| Unique | 75 £ | 4% | 70 | 2 | 1.500 £ |
| Celestial | 120 £ | 2,4% | 140 | 3 | 2.400 £ |
| Divine | 200 £ | 1,4% | 280 | 3 | 4.000 £ |
| Epic | 320 £ | 0,8% | 600 | 4 | 6.400 £ |
| Legendary | 520 £ | 0,3% | 1.400 | 4 | 10.400 £ |
| Mythic | 850 £ | 0,1% | 4.000 | 5 | 17.000 £ |
| **Ethernal** | 1.400 £ | 0,03% | 12.000 | 5 | 28.000 £ |

Un Mythic ogni mille caselle: con dodici rulli, **uno ogni ottantatre giri**. Un
**Ethernal** ogni tremilatrecento: uno ogni duecentosettanta giri.

### ⚠ Le figurine, per adesso, arrivano a Unique

Deciso il 10 settembre 2026: «tutti quelli che ci sono fino ad ora mettiamoli
da basic a unique; da celestial a ethernal ci penseremo noi nel tempo, man mano
che abbiamo dati a disposizione».

La tabella qui sopra resta intera e vale per **i pezzi sui rulli**: quella e' la
rarita' dei pezzi, e la dicono i dati. Il grado che una **persona** da' a una
cosa presa — il bonus quando la prende, il grado in vetrina — si ferma a
**Unique**, il sesto.

Il motivo e' che la rarita' e' **un rapporto**. Con dieci figurine in tutto,
chiamarne una Mythic non vuol dire niente: non c'e' niente sotto che la faccia
sembrare rara, e si sarebbe bruciata la parola prima di avere il gioco. I sei
gradi in cima si aprono quando il magazzino e' abbastanza pieno da meritarli.

Sta scritto in un posto solo — `TETTO_FIGURINE` in `regole.ts` — e da li'
passano la figurina che si guarda, quella che cade da un pacchetto, quella che
si regala girando e i tasti con cui si sceglie. Il giorno che si alza, si alza
dappertutto.

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
- **prenderla**. ⚠ Il prezzo **non si scrive a mano**: e' la **somma dei dodici
  pezzi** — che e' un numero vero, viene dalla rarita' di ognuno — piu' un
  **bonus** che e' l'unica cosa che decide una persona. Il bonus dice quanto
  quella riga vale *oltre* i pezzi di cui e' fatta, cioe' quanto e' bella
  l'idea; puo' anche essere zero. Cosi' una combinazione di roba rara parte alta
  anche quando chi comanda ha fretta, e una di roba comune ma geniale la si puo'
  pagare bene lo stesso;
- **attaccarci il contenuto**: le immagini o i brani venuti fuori da quel
  prompt. ⚠ **Sono piu' d'uno dal 10 settembre 2026**, vedi qui sotto. E' quello che la fa diventare una figurina che si guarda, ed e' la
  copertina della sua scheda nello shop — senza, uno comprerebbe una parola.
  ⚠ **Si sceglie dalla galleria della suite, toccandola.** Prima si scriveva
  a mano l'indirizzo del file in una casella: quattro gesti in due finestre,
  ogni volta, e chi ha fretta non li fa.
  ⚠ **E se e' un brano, si attacca anche la sua copertina.** Un brano e' un
  rettangolo con un tasto play: in un album di cento figurine non lo riconosce
  nessuno. Se la libreria della suite ce l'ha gia' — le copertine dei brani e i
  fotogrammi dei video li fa lei — si prende da sola; se no, si sceglie a mano;
- **buttarla**, scrivendo perche'.

Il bonus si batte su otto tasti — 2, 5, 10, 20, 50, 100, 200, 500 **lire** — e
si sommano: piu' li premi, piu' sale. Davanti a otto numeri conosciuti si decide
in un secondo; davanti a una casella vuota ci si mette a pensare quanto vale
un'idea, e finisce che non si decide.

⚠ **Non sono i tagli dei regali**, che sono euro (§ 4). Qui servono lire
piccole perche' e' il bonus a decidere **che grado avra' la figurina**, e la
scala dei gradi finisce a 1.400: col taglio piu' piccolo dei regali — 3.873 —
una sola pressione sfonderebbe Ethernal e gli undici gradini sotto non si
potrebbero scegliere.

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

**Ogni cento** che entrano, si chiude una **serie** — un album, come le
figurine. La serie chiusa e' quella che si compra: un **pacchetto** costa lire e
dentro ci sono **cinque figurine a caso di quella serie**, pescate con le stesse
frequenze dei gradi (una Mythic esce una volta su mille). I doppioni non
deludono: pagano il loro prezzo in lire.

### ⚠ Il pacchetto lo chiude una persona, non il contatore

Deciso il 10 settembre 2026: «ogni prompt accettato finisce in questo pacchetto;
arrivato a 100, un admin puo' creare il pacchetto».

A cento la serie e' **pronta**, non chiusa: chi comanda vede «cento dentro» e
preme *crea il pacchetto*. Fino a quel momento non si compra.

Chiudere una serie e' l'atto con cui si dice «questa raccolta e' finita, si
vende», ed e' una decisione — come dare un prezzo a una combinazione. Le
decisioni qui le prende una persona. E ci sta che a novantotto arrivi qualcosa
che deve entrare per forza in quella serie: con la chiusura automatica non
c'era modo di aspettarlo.

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
da quale — il mazzo e' uno solo, fatto di tutte le serie chiuse — e dentro si
pesca con le frequenze dei gradi. «Tutti insieme, tutti random», come e' stato
chiesto.

Si sbloccano anche **giocando**: ogni tanto un giro fortunato ne regala una.

Una combinazione sbloccata e' **tua**: sta nella tua collezione, la vedi intera,
la puoi copiare e la puoi mandare a produrre. Una non sbloccata si vede coperta,
col solo prezzo — cosi' si sa cosa si sta cercando.

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

## 12. Lo shop

Le figurine prese si possono anche **mettere in vendita**. Ce le mette chi
comanda, e decide due cose che sono tutte e due sue:

- **che grado hanno nello shop.** Non e' quello della slot — li' lo dicono i
  dati, qui lo sceglie una persona;
- **quanto costano.** Il grado ne suggerisce uno (venti volte la sua soglia:
  un Rare sta sulle 240 lire, un Mythic sulle diciassettemila), ma il numero
  finale lo scrive chi vuole.

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

⚠ **Quanto piu' alto e' ancora da decidere**, e non e' un dettaglio: se un item
scelto costa piu' di quanto si guadagna inventandone tre, nessuno lo compra e la
funzione non esiste. Il numero si sceglie guardando quanto rende una
combinazione presa, non a occhio.

Lo stesso grado di vetrina dice anche **quanto raramente quella figurina cade
da un pacchetto**: e' un numero solo per due cose, non due numeri che un giorno
divergono.

La scheda nello shop mostra il **contenuto allegato** — l'immagine o il brano
venuti fuori da quel prompt — anche a chi non ce l'ha: uno deve poter guardare
cosa sta comprando. Il prompt no: quello resta coperto finche' non e' tuo.

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

Probabilmente si fanno tutte e due, come due schede: le caselle sono quello che
raccogli **giocando**, le combinazioni quello che raccogli **inventando e
comprando**. Ma la scelta non e' ancora stata fatta — vedi § 17.

## 14. La classifica di casa

Con le facce e i nomi di DaProd. I numeri che si guardano:

- **quante combinazioni gli hanno preso** — e' quella che conta;
- quante ne ha in collezione;
- il colpo piu' grosso (una vincita sola);
- quanto ha in tasca.

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

- ⚠ **L'inventario: le caselle, le combinazioni, o tutte e due?** E' la domanda
  del § 13-bis, ed e' la piu' grossa aperta adesso: la prima strada e' un pezzo
  di lavoro suo e cambia cosa vuol dire girare.
- **Quanto costa un item scelto nel negozio** (§ 12): il moltiplicatore si
  sceglie guardando quanto rende una combinazione presa.
- **La slot dei pacchetti costa lire come l'altra, o ha un suo prezzo?** E rende
  esperienza anche lei?
- **Cento e' il numero giusto per una serie?** Con poche persone che giocano,
  cento combinazioni prese ci mettono un po' ad arrivare, e finche' la serie non
  si chiude non c'e' niente da comprare. Si puo' partire a cinquanta e alzarlo.
- **Quanto vale una combinazione presa**, come ordine di grandezza. Adesso il
  prezzo lo scrive l'admin a mano ogni volta; se salta fuori che sono quasi
  sempre gli stessi tre numeri, si mettono tre bottoni.
- **Il secondo tavolo**, quello delle immagini: c'e' gia' il mazzo, ma i
  minigiochi per le immagini Cammo li ha in testa e non sono ancora scritti qui.
