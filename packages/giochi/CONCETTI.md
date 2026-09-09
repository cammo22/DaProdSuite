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

⚠ **Non ci sono soldi veri.** Non si compra niente pagando, e i «pacchetti da
comprare» si comprano in lire di gioco. Le lire nascono girando, vincendo, e
soprattutto **facendosi approvare le combinazioni**. Se un giorno questa cosa
dovesse uscire di casa e toccare soldi veri, il discorso cambia e va rifatto da
capo: un gioco con un portafoglio, delle rarita' e dei pacchetti e', per come e'
fatto, una slot machine.

## 5. Il prompt e' fatto di dodici pezzi

Un rullo per pezzo, e i rulli sono **dodici** — come nella prima versione di
DaProdSlot. Sei era troppo poco: chiedendo a un modello sei cose si ottiene
sempre lo stesso tipo di risposta, con dodici il prompt comincia ad avere
un'idea dentro.

Un giro riempie tutti i rulli; **si blocca quello che piace e si rigira il
resto** (il blocco e' un clic sul rullo). Si va avanti cosi' finche' la riga
non piace tutta.

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

Cambiare epoca **sblocca i rulli**: quello che avevi tenuto fermo veniva da un
altro mondo.

## 7. Gli undici gradi

Ogni pezzo ha un **prezzo in lire**, e il prezzo dice il **grado**. Sono undici,
in quest'ordine — e si', **Epic sta dopo Divine**: e' la scala scelta da Cammo,
e in un gioco la scala e' una decisione, non una deduzione.

| Grado | Da | Quanti generi | Quanto esce | Paga |
|---|---|---|---|---|
| Basic | 0 £ | 2.641 | 40% | — |
| Grand | 5 £ | 453 | 22% | — |
| Rare | 12 £ | 380 | 14% | 5 £ |
| Arcane | 25 £ | 322 | 9% | 12 £ |
| Heroic | 45 £ | 297 | 6% | 25 £ |
| Unique | 75 £ | 289 | 4% | 50 £ |
| Celestial | 120 £ | 336 | 2,4% | 100 £ |
| Divine | 200 £ | 332 | 1,4% | 200 £ |
| Epic | 320 £ | 365 | 0,8% | 400 £ |
| Legendary | 520 £ | 397 | 0,3% | 800 £ |
| Mythic | 850 £ | 479 | 0,1% | 2.000 £ |

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

| Cosa esce | Paga |
|---|---|
| il grado piu' alto uscito | quello che dice la tabella sopra |
| tre caselle o piu' dello stesso grado, da Rare in su | quel grado **×2**, in piu' |
| **tutte e dodici** da Heroic in su | **schermo pieno, 1.000–1.500 £** |
| niente | una quasi-vincita ogni tanto (5–15 £) |

Il premio del grado si paga **una volta sola**, per il piu' alto uscito: se
pagassero tutti, un Mythic incasserebbe anche il premio del Basic accanto. Il
tris invece si somma, perche' e' un'altra cosa — non «che ti e' uscito», ma
«quante volte».

Le **formazioni** si sommano a parte: combinazioni dichiarate da chi comanda
(«questi tre pezzi insieme»), valide in qualsiasi ordine.

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

⚠ **Una combinazione uguale a una che c'e' gia' non entra due volte.** Si
riconosce dai pezzi, non dalle parole: gli stessi dodici pezzi sono la stessa
combinazione anche se arrivano da due persone diverse. La prima vale, la
seconda si ferma subito e chi l'ha mandata lo sa subito — invece di aspettare
tre giorni per sentirsi dire che era gia' di un altro.

## 10. Chi comanda la prova, e decide

Nel pannello dell'admin le combinazioni arrivate stanno una sotto l'altra, con
scritto chi le ha mandate e quando. Per ognuna si puo':

- **provarla davvero** — parte una generazione con quel prompt, per la stessa
  strada da cui passano le richieste del telefono. Il pezzo o l'immagine esce e
  si guarda. **Il costo lo paga il banco, non il giocatore**: e' l'admin che ha
  scelto di provarla;
- **prenderla**, dandole un **prezzo in lire**. Da quel momento sta nel
  magazzino, e vale quel prezzo per chi vorra' sbloccarla;
- **buttarla**, scrivendo perche'.

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

## 12. Dove finisce, nella suite

Una combinazione presa **non resta nel gioco**. Entra nel magazzino unico di
prompt e stili della suite, quello del blocco 1 della 1.2.3, e da li' compare
come pastiglia in DaProdMusica e in DaProdFoto — con scritto chi l'ha fatta.

E' il motivo per cui la sala giochi sta dentro la suite invece che in un file
HTML sul desktop: quello che si vince qui, si usa di la'.

## 13. La classifica di casa

Con le facce e i nomi di DaProd. I numeri che si guardano:

- **quante combinazioni gli hanno preso** — e' quella che conta;
- quante ne ha in collezione;
- il colpo piu' grosso (una vincita sola);
- quanto ha in tasca.

Non si ordina per saldo: il saldo lo alza chi gioca di piu', e «chi ha giocato
di piu'» non e' una classifica, e' un contatore.

## 14. Cosa non e'

- Non e' un gioco d'azzardo con soldi veri, e non deve diventarlo.
- Non e' uno strumento di lavoro: per la roba seria ci sono le schede.
- Non e' un'app a se': e' **una pagina servita dal gateway**, come la console.
  Cosi' e' la stessa identica cosa sul computer, sul telefono e nel browser.

## 15. Le regole di questa cartella

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

## 16. Quello che ancora non e' deciso

- **Cento e' il numero giusto per una serie?** Con poche persone che giocano,
  cento combinazioni prese ci mettono un po' ad arrivare, e finche' la serie non
  si chiude non c'e' niente da comprare. Si puo' partire a cinquanta e alzarlo.
- **Quanto vale una combinazione presa**, come ordine di grandezza. Adesso il
  prezzo lo scrive l'admin a mano ogni volta; se salta fuori che sono quasi
  sempre gli stessi tre numeri, si mettono tre bottoni.
- **Il secondo tavolo**, quello delle immagini: c'e' gia' il mazzo, ma i
  minigiochi per le immagini Cammo li ha in testa e non sono ancora scritti qui.
