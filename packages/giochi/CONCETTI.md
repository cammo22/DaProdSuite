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

Chi gioca e basta **sale di livello**. Chi crea, **si arricchisce**. Non c'e'
modo di trasformare l'una nell'altra, ed e' voluto: se girando si guadagnasse,
la slot sarebbe una macchinetta e le combinazioni un passatempo. Cosi' invece
le lire per giocare finiscono, e per averne ancora bisogna inventare qualcosa
che a chi comanda piaccia.

I livelli: il secondo costa 500 punti, il terzo altri mille, il quarto altri
millecinquecento. Ogni volta di piu'.

### Il secondo rubinetto: chi comanda regala

Dal 10 settembre 2026 c'e' una seconda strada per cui arrivano lire, e sta in
mano a una persona sola: **chi comanda le manda a chi vuole**. Tagli da 2 a 500
— quelli delle banconote — o un numero scritto a mano, e due parole di
accompagnamento che si scrivono sempre.

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

## 7. Gli undici gradi

Ogni pezzo ha un **prezzo in lire**, e il prezzo dice il **grado**. Sono undici,
in quest'ordine — e si', **Epic sta dopo Divine**: e' la scala scelta da Cammo,
e in un gioco la scala e' una decisione, non una deduzione.

| Grado | Da | Quanti generi | Quanto esce | Punti | In vetrina |
|---|---|---|---|---|---|
| Basic | 0 £ | 2.641 | 40% | 1 | 50 £ |
| Grand | 5 £ | 453 | 22% | 3 | 100 £ |
| Rare | 12 £ | 380 | 14% | 8 | 240 £ |
| Arcane | 25 £ | 322 | 9% | 18 | 500 £ |
| Heroic | 45 £ | 297 | 6% | 35 | 900 £ |
| Unique | 75 £ | 289 | 4% | 70 | 1.500 £ |
| Celestial | 120 £ | 336 | 2,4% | 140 | 2.400 £ |
| Divine | 200 £ | 332 | 1,4% | 280 | 4.000 £ |
| Epic | 320 £ | 365 | 0,8% | 600 | 6.400 £ |
| Legendary | 520 £ | 397 | 0,3% | 1.400 | 10.400 £ |
| Mythic | 850 £ | 479 | 0,1% | 4.000 | 17.000 £ |

Un Mythic ogni mille caselle: con dodici rulli, **uno ogni ottantatre giri**.

Il grado non si scrive da nessuna parte: **si ricava dal prezzo**. Se fosse un
campo scritto accanto, il giorno che si abbassa il prezzo di un pezzo
resterebbe «Mythic» a due lire.

**Quanto spesso esce un grado e' una scelta, non un conto.** Si pesca prima il
grado e poi il pezzo dentro il grado: se si pescasse piatto, il giorno che si
aggiungono trenta pezzi comuni i Mythic diventerebbero il doppio piu' rari
senza che nessuno l'abbia deciso.

**Dal grado si vede quanto si accende lo schermo**: da Rare in su lampeggia il
bordo, da Unique in su la sala si scuote, da Epic in su cadono i coriandoli.

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
- **attaccarci il contenuto**: l'immagine o il brano venuti fuori da quel
  prompt. E' quello che la fa diventare una figurina che si guarda, ed e' la
  copertina della sua scheda nello shop — senza, uno comprerebbe una parola.
  ⚠ **Si sceglie dalla galleria della suite, toccandola.** Prima si scriveva
  a mano l'indirizzo del file in una casella: quattro gesti in due finestre,
  ogni volta, e chi ha fretta non li fa;
- **buttarla**, scrivendo perche'.

Il bonus si sceglie con gli **stessi tagli dei regali**, da 2 a 500. Davanti a
otto numeri conosciuti si decide in un secondo; davanti a una casella vuota ci
si mette a pensare quanto vale un'idea, e finisce che non si decide.

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

- **Cento e' il numero giusto per una serie?** Con poche persone che giocano,
  cento combinazioni prese ci mettono un po' ad arrivare, e finche' la serie non
  si chiude non c'e' niente da comprare. Si puo' partire a cinquanta e alzarlo.
- **Quanto vale una combinazione presa**, come ordine di grandezza. Adesso il
  prezzo lo scrive l'admin a mano ogni volta; se salta fuori che sono quasi
  sempre gli stessi tre numeri, si mettono tre bottoni.
- **Il secondo tavolo**, quello delle immagini: c'e' gia' il mazzo, ma i
  minigiochi per le immagini Cammo li ha in testa e non sono ancora scritti qui.
