# Sviluppare DaProdGiochi

Il server e il database sono in `apps/desktop/src`, le pagine condivise in
`web`, i giochi in `games` e il contenitore Android in `apps/mobile`.
Il PC decide saldi, autorizzazioni e accrediti. Una pagina di gioco non è una
fonte attendibile per un premio: finché simula sul client, il risultato deve
passare dall'approvazione del proprietario.

Tieni le operazioni economiche in transazioni SQLite. Ogni mutazione usa un
UUID di richiesta e restituisce la stessa risposta se viene ripetuta, senza
applicare due volte la variazione. Usa interi per lire, monete e millesimi di
token. Non aggiornare un saldo in JavaScript. Non pubblicare database o chiavi
del proprietario.

Prima di proporre modifiche esegui i comandi di verifica nel README. Per
Android: `./gradlew testReleaseUnitTest assembleRelease` in `apps/mobile`.
Per la prova su telefono: aggiornamento sopra l'APK precedente, accesso col
profilo conservato, QR nuovo, tre giochi e revoca. Non considerare il solo
test JVM una verifica della fotocamera o dell'installatore Android.

Le versioni in package.json, Cargo.toml e tauri.conf.json devono coincidere.
La versione Android deriva dal package.json e deve aumentare. Mantieni
`applicationId` e firma compatibile quando distribuisci un aggiornamento.
