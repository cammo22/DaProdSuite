# DaProdGiochi Android

Contenitore Kotlin della sala servita dal PC, scanner QR e updater APK.
Richiede Android 8 o superiore e WebView aggiornata. Il client Tailscale
ufficiale va collegato alla rete privata del PC.

L'app accetta solo indirizzi HTTPS e non ignora errori TLS. Mantiene ID
`it.daprod.suite`, firma compatibile, preferenze e profili della Suite 1.7.10.
Tieni premuto un profilo per assegnargli il nuovo indirizzo HTTPS della sala.

```sh
./gradlew testReleaseUnitTest assembleRelease
```

Servono JDK 17 e Android SDK 35. La versione arriva dal package.json radice.
Per una chiave esterna sono disponibili DAPROD_KEYSTORE, DAPROD_STORE_PASSWORD,
DAPROD_KEY_ALIAS e DAPROD_KEY_PASSWORD. Cambiarla senza rotazione impedisce di
aggiornare le installazioni con il vecchio certificato.

Vedi [migrazione e aggiornamenti](../../docs/MIGRAZIONE.md).
