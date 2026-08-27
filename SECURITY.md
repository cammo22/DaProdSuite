# Sicurezza

## Cosa esce da questo computer

Niente di quello che generi. Non c'è un account, non c'è una chiave API, non
c'è un server nostro: i modelli girano sul tuo computer e i file restano in
`%LOCALAPPDATA%\DaProdSuite\output\`.

Le uniche connessioni in uscita sono tre, e sono tutte visibili:

| Quando | Dove |
|---|---|
| Scarichi un modello | HuggingFace, o la fonte scritta in `manifest/models.json` |
| La suite cerca un aggiornamento | le Release di questo repository |
| Accendi «Anche da fuori casa» | un tunnel Cloudflare, **solo se lo accendi tu** |

## L'accesso da fuori

Il gateway è l'unica cosa della suite raggiungibile dalla rete. I motori — e
tutto quello che gira in Python — stanno su `127.0.0.1` e non escono da lì.

Come è messo insieme, in breve:

- **ogni rotta vuole un token**, tranne la pagina di ingresso e
  l'accoppiamento. Nemmeno da `127.0.0.1` si entra senza credenziale: il
  computer si accoppia con sé stesso come un dispositivo qualunque;
- **il QR non contiene una password.** Contiene un invito che scade in cinque
  minuti e vale una volta sola. Da quello nasce una credenziale per quel
  dispositivo, con i suoi permessi, che si può togliere senza toccare gli altri;
- **due ruoli**: chi può solo chiedere, e chi può anche decidere. I limiti della
  macchina — chi genera senza aspettare un sì, quanti lavori in fila — si
  cambiano **solo dal computer stesso**, nemmeno da un telefono con i permessi
  da admin;
- **i tentativi a forza bruta si fermano**: c'è un tetto agli inviti sbagliati.

Il progetto completo sta in
[docs/ACCESSO-REMOTO.md](docs/ACCESSO-REMOTO.md).

## La chiave con cui è firmata l'app Android

Sta nel repository, con la sua password, e **è voluto**:
`apps/mobile/app/build.gradle.kts` spiega perché per esteso. In breve: Android
rifiuta di aggiornare un'app se la firma non combacia con quella già
installata, e con una chiave generata a caso da ogni computer l'aggiornamento
automatico non potrebbe funzionare. Prima si usava la chiave di debug di
Android, che è pubblica e universale: questo file non aggiunge un rischio, ne
toglie uno.

**Non è la chiave di un negozio**, e il giorno che la suite andasse su Google
Play quella sarà una chiave vera, segreta, custodita da chi pubblica.

## Segnalare un problema di sicurezza

Se hai trovato qualcosa che permette a qualcuno di fare una cosa che non
dovrebbe poter fare — leggere i file di un'altra persona collegata, entrare
senza invito, far eseguire qualcosa al computer da fuori — **non aprire una
segnalazione pubblica.**

Usa
[Report a vulnerability](https://github.com/cammo22/DaProdSuite/security/advisories/new),
che resta privato finché non è chiuso. Scrivi cosa hai fatto e cosa è successo:
il resto lo troviamo noi.

## Le versioni

Si corregge sull'ultima pubblicata. La suite si aggiorna da sola, e l'app
Android pure: la versione buona è sempre quella nelle
[Release](https://github.com/cammo22/DaProdSuite/releases/latest).
