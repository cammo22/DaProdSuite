# DaProd Suite — l'app Android

La suite in tasca. Inquadri il QR sullo schermo del PC e da lì usi DaProdFoto,
DaProdCinema, DaProdVoce e DaProdMusica — sulla wifi di casa o, con il tunnel
acceso, da qualunque parte.

## L'idea, in una riga

**Il telefono non calcola niente: fa tutto il PC.** Quindi anche l'interfaccia
sta sul PC.

Dalla 0.6.0 l'app non disegna più moduli suoi: apre **la console che il gateway
serve** — la stessa pagina che vede il browser di un portatile — dentro una
WebView. Le conseguenze sono tutte buone:

- una sola interfaccia da scrivere e da tenere allineata alle azioni;
- quando sul PC compare una scheda nuova, sul telefono c'è **al collegamento
  dopo**, senza pubblicare un APK;
- si vede quello che il PC ha fatto: le immagini si guardano, i video partono e
  si scorrono, i brani si ascoltano. Prima l'app diceva «pronta» e per sapere
  com'era venuta bisognava salvarla e aprire un'altra app.

## Cosa resta nativo, e perché

Solo quello che una pagina web dentro una WebView non sa fare:

| | Perché |
|---|---|
| **Scegliere chi sei**, all'avvio | Più persone sullo stesso telefono, ognuna col suo collegamento. Vedi `data/Profili.kt` |
| **Il QR** | Serve la camera |
| **Le notifiche** quando un lavoro finisce | Anche ore dopo, con l'app chiusa (`SyncWorker`) |
| **Portare un file nel telefono** | Un `<a download>` su un blob, in una WebView, non scarica niente — e comunque finirebbe in una cartella dell'app invece che in galleria |
| **Aggiornarsi da sola** | Dalla Release di GitHub |
| **La coda quando il PC non c'è** | Una pagina web, con il computer spento, non si carica nemmeno |

Il ponte fra la pagina e l'app è **due sole funzioni** (`DaProdApp`), tutte e due
per portare un file nel telefono: il file lo tira giù l'app, che ha già il token,
e lo mette dove uno se lo aspetta.

## Chi sei

All'avvio compare l'elenco delle persone di questo telefono. Con una sola si
entra dritti; con più di una si sceglie.

Un profilo **non è un'etichetta, è una credenziale**: ha il suo token, il suo
ruolo e il suo PC. Chi è ospite resta ospite anche se il telefono è di chi è
padrone, e togliere una persona toglie davvero il suo accesso da quel telefono
(non dal PC: là si toglie dal pannello «Da fuori» — sono due gesti diversi).

Prima della 0.6.0 il telefono aveva un accoppiamento solo e si presentava al PC
col nome del modello Android: in una casa con tre persone la fila diceva tre
volte «SM-A536B».

## Da fuori casa

L'indirizzo del gateway arriva dal QR **completo, con lo schema**: `http://…`
sulla wifi di casa, `https://…` quando sul PC è acceso «Anche da fuori casa».
Fino alla 0.5.2 il QR portava solo `ip:porta` e l'app ci metteva davanti
`http://` da sé — che con un tunnel HTTPS non poteva funzionare.

I QR vecchi (v1) si leggono lo stesso e continuano a valere in casa.

## Senza PC

Quando il computer non risponde l'app non mostra la pagina di errore del
browser: mostra una schermata in italiano che dice cosa controllare, e un modulo
per scrivere lo stesso. Quello che scrivi resta sul telefono e **parte da solo**
appena il PC torna raggiungibile.

Il modulo nasce dalle azioni che la suite dichiara, e offline si usano quelle
**ricordate** dall'ultima volta che il PC ha risposto: senza, non ci sarebbe
niente da cui costruirlo.

## La firma

L'APK di release è firmato con `firma-sideload.jks`, che **sta nel repository
con la password scritta in `app/build.gradle.kts`**. Non è una dimenticanza.

Android rifiuta di aggiornare un'app se la firma non combacia con quella
installata. Con la chiave di debug — che ogni computer, e ogni runner della CI,
si genera per conto suo — ogni Release avrebbe una firma diversa e
l'aggiornamento automatico non potrebbe funzionare.

Quella chiave non protegge da niente: chiunque l'abbia può firmare un finto
«DaProd Suite». Ma poteva già farlo con la chiave di debug di Android, che è
pubblica e universale. Non aggiunge un rischio, toglie un fastidio. Il giorno
che questa app andasse su un negozio, servirà una chiave vera e segreta — non
questa.

## Cosa non fa

- **Non decide.** Accettare o scartare una richiesta resta di chi è padrone —
  dal PC, dalla console o da qui, ma con il ruolo giusto.
- **Non calcola niente.** Nessun modello gira sul telefono, e non è previsto che
  giri: i pesi vogliono la scheda video del fisso.
- **Non ha notifiche push vere.** È il telefono a chiedere ogni quarto d'ora, non
  il PC a chiamare. Va bene per un lavoro da minuti, meno per uno da trenta
  secondi.
- **Non apre pagine che non siano la suite.** La WebView ha un token dentro e un
  ponte verso l'app: tutto ciò che non è il nostro gateway non si carica.

## Com'è fatta

```
apps/mobile/app/src/main/java/it/daprod/suite/
  MainActivity.kt        chi sei → collega → la suite (WebView) → senza PC
  Aggiornamenti.kt       cerca, scarica e installa una versione nuova
  Notifiche.kt           il canale e le notifiche locali
  Scarica.kt             mette un risultato in galleria / musica / download
  SyncWorker.kt          il giro in background, per tutte le persone del telefono
  data/
    Profili.kt           chi usa questo telefono, e con quale PC
    Azione.kt            un'azione della suite e i suoi campi, dal gateway
    Richiesta.kt         una richiesta e il suo stato
    Store.kt             l'ultimo indirizzo, le azioni ricordate, i controlli
    CodaOffline.kt       le richieste scritte senza PC
  net/GatewayClient.kt   le chiamate al gateway
  ui/RichiesteAdapter.kt la lista della coda offline
```

Niente Compose, niente librerie di rete generate: OkHttp, `org.json` e le view
di sempre. Una dipendenza in meno è un aggiornamento in meno che può rompere
l'unica app che ci sta sopra.

## Compilare

Serve l'Android SDK (platform 34, build-tools 34) e un JDK 17. Da `apps/mobile/`,
su Windows:

```bash
gradlew.bat assembleDebug
```
