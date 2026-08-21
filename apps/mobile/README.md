# DaProd Suite — l'app Android

Il telecomando della suite. Inquadri il QR sullo schermo del PC, e da lì chiedi
lavori a DaProdFoto, DaProdCinema, DaProdVoce e DaProdMusica — anche quando il
computer in quel momento non è raggiungibile.

## Cosa fa

- **Si collega col QR** (o col codice di otto cifre, se al PC ci era già stata).
  Il codice è monouso e scade in cinque minuti.
- **Chiede lavori.** Il modulo **non è scritto nell'app**: i campi arrivano
  dalle azioni che dichiara la suite (`GET /azioni`), le stesse che vedono la
  console web sul portatile e il server MCP. Quando sul PC si aggiunge
  un'azione, qui compare da sola — senza una versione nuova dell'app.
- **Tiene la coda quando il PC non c'è.** Scrivi mentre sei fuori, resta sul
  telefono, e parte da sola appena il gateway torna raggiungibile.
- **Avvisa quando un lavoro finisce**, anche ore dopo e con l'app chiusa:
  `SyncWorker` passa ogni quarto d'ora.
- **Porta il risultato dentro il telefono.** Un'immagine finisce in galleria, un
  video in galleria, un brano fra la musica: sotto `DaProd Suite`, dove poi si
  ritrovano senza riaprire l'app.

## Cosa non fa

- **Non decide.** Accettare o scartare una richiesta resta di chi sta al PC, dal
  pannello **Da fuori** o dalla console web. Il telefono chiede.
- **Non esce dalla rete locale.** Il collegamento è HTTP in chiaro sulla wifi di
  casa (`usesCleartextTraffic`): vale dentro casa, non da Internet. Il tunnel in
  uscita è il passo dopo, § 0.5.0 della roadmap.
- **Non mostra il risultato prima di scaricarlo.** Niente anteprime: si preme
  «Scarica nel telefono» e si guarda con l'app di sistema.

## Com'è fatta

```
apps/mobile/app/src/main/java/it/daprod/suite/
  MainActivity.kt        l'unica schermata: collega, chiedi, guarda la fila
  Notifiche.kt           il canale e le notifiche locali
  Scarica.kt             mette un risultato in galleria / musica / download
  SyncWorker.kt          il giro in background che porta le notifiche ore dopo
  data/
    Azione.kt            un'azione della suite e i suoi campi, dal gateway
    Richiesta.kt         una richiesta e il suo stato
    Store.kt             cosa si ricorda fra un avvio e l'altro
    CodaOffline.kt       le richieste scritte senza PC
  net/GatewayClient.kt   le chiamate al gateway
  ui/RichiesteAdapter.kt la lista
```

Niente Compose, niente librerie di rete generate: OkHttp, `org.json` e le view
di sempre. Sono quattro schermate di codice, e una dipendenza in meno è un
aggiornamento in meno che può rompere l'unica app che ci sta sopra.

## Compilare

Serve l'Android SDK (platform 34, build-tools 34) e un JDK 17. Da `apps/mobile/`,
su Windows:

```bash
gradlew.bat assembleDebug
```

L'APK finisce in `app/build/outputs/apk/debug/app-debug.apk`. Se Gradle non
trova l'SDK, `local.properties` deve contenere `sdk.dir=` col percorso — non sta
nel repo perché è diverso su ogni computer.

## Come si collega

1. Sul PC apri DaProd Suite → **Da fuori** (in fondo all'hub) → **Accendi**.
2. Premi **Invita un padrone** (o un ospite): compaiono il QR e il codice.
3. Sul telefono: **Inquadra il QR**.

Il **primo** dispositivo accoppiato diventa padrone: vede tutte le richieste,
anche quelle degli altri. Gli ospiti vedono solo le proprie.

Se non funziona, in ordine: il PC e il telefono sono sulla stessa wifi? Il
gateway è acceso (dice «In ascolto» nel pannello)? Il codice è ancora vivo (il
pannello mostra quanto gli resta)?
