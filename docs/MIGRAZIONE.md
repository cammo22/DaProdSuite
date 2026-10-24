# Da DaProdSuite a DaProdGiochi

## Prima del passaggio

Chiudi DaProdSuite. Copia la sua cartella dati, normalmente
`%LOCALAPPDATA%\DaProdSuite`, su un altro disco. La nuova applicazione non
cancella foto, musica, modelli o vecchi archivi presenti sul PC: elimina quei
moduli dal programma. Non disinstallare l'app Android: aggiornarla preserva le
preferenze; disinstallarla le cancella.

## Importa conti e telefoni

Apri il nuovo hub. In Gestisci la sala scegli Importa dalla Suite e indica la
cartella dati precedente. Sono riconosciuti sia:

- `giochi/giochi.json` e `remoto/remoto.json` nella cartella DaProdSuite;
- i due file `giochi.json` e `remoto.json` messi insieme in una cartella di copia.

È supportato il formato giochi 4 della Suite 1.7.10. L'importazione è unica e
transazionale: se trova dati non validi si ferma, senza importare metà dei conti
o sovrascrivere quelli esistenti. Importa identità, saldi, monete DP e token dei
telefoni. I vecchi ruoli admin diventano giocatori: il proprietario si gestisce
dal PC. I token nel nuovo database sono conservati come hash.

L'intero vecchio archivio giochi rimane nel nuovo database e nei suoi backup.
Le vecchie figurine, lo Studio, la Zecca multimediale, le casse delle partite
aperte e gli incassi sospesi **non vengono convertiti automaticamente** nelle
nuove attività. In Archivio precedente puoi vedere le casse e gli incassi e
registrare gli eventuali accrediti con Correggi un saldo. La correzione resta
nel registro del giocatore. Le monete premio DP importate restano DP e non
diventano automaticamente token DPC: sono due conti diversi.

## Telefoni già collegati

La nuova app legge le stesse preferenze e copie di sicurezza della precedente.
Il vecchio token funziona se è stato importato il relativo archivio sul PC.
Il nuovo indirizzo deve essere quello HTTPS di Tailscale Serve: tieni premuto
il profilo Android per cambiarlo senza cancellare il profilo. Se non hai più
il token, dal PC crea un invito per il conto esistente, senza creare un secondo
giocatore.

I progressi salvati nel browser sotto il vecchio indirizzo HTTP non si spostano
da soli al nuovo indirizzo HTTPS: Android considera le due origini separate.
La versione nuova sincronizza sul PC i progressi delle nuove partite e li
separa per giocatore. I vecchi dati locali non vengono cancellati, ma la loro
conversione non è inclusa nell'importazione dei conti.

## Aggiornamenti APK

Il controllo parte all'apertura, senza bloccare il gioco. Se trova una release
nuova con APK, mostra il pulsante Aggiorna. Dopo il consenso scarica il file,
controlla dimensione, digest GitHub quando presente, package ID, versione e
certificato di firma. Solo dopo presenta il pulsante Installa. Android può
richiedere di autorizzare questa sorgente e confermare l'aggiornamento.

Il certificato è quello pubblico di sideload già usato nella 1.7.10. Garantisce
continuità, non l'esclusività della firma: chi ha quella chiave può produrre
APK con lo stesso certificato. Una nuova chiave privata richiede un piano di
rotazione compatibile; non sostituire il keystore a caso. Non è stata attuata
alcuna rotazione in questo passaggio.

Gli endpoint GitHub conservano per compatibilità il percorso DaProdSuite;
GitHub mantiene il redirect dopo la rinomina del repository.
