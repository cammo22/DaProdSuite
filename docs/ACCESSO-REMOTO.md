# Accesso remoto — DaProdConnessione, QR e app Android

Obiettivo: inquadri un QR con il telefono e usi la suite da lì. Da casa, ma anche
da fuori. Stesso codice per telefono, tablet, un altro computer.

Questo documento era il progetto della funzione. Dalla **0.5.0** c'è anche il
codice, e dalla **0.6.0** c'è pure il tunnel: in fondo, «Cos'è stato fatto
davvero», con le differenze e con quello che ancora non c'è.

---

## Perché non è "basta aprire una porta"

Il PC di casa non ha un indirizzo pubblico: sta dietro il router. E anche se ce
l'avesse, aprire una porta significherebbe mettere su Internet un programma che

- genera contenuti usando la tua GPU,
- legge e scrive nella cartella dei risultati,
- e nel caso del Companion **conosce la tua memoria personale**.

Chi trova l'indirizzo, se non c'è altro, entra. Quindi la funzione si progetta
con l'autenticazione dentro fin dall'inizio, non aggiunta dopo.

---

## Come è fatta

```
telefono  ──▶  tunnel  ──▶  gateway della suite  ──▶  servizi locali
                                (autentica)            (127.0.0.1)
```

### Il gateway

Un solo ingresso HTTP dentro lo shell. I motori continuano ad ascoltare **solo**
su `127.0.0.1` e non sanno nulla dell'esterno: chi arriva da fuori parla con il
gateway, che verifica chi è e poi inoltra.

Vantaggio pratico: l'autenticazione si scrive una volta sola, e nessun motore
può essere raggiunto per sbaglio saltando i controlli.

### I due modi di collegarsi

| | Rete locale | Da Internet |
|---|---|---|
| **Quando** | telefono e PC sulla stessa wifi | ovunque |
| **Come** | il gateway ascolta sull'IP di rete del PC | tunnel in uscita verso un servizio |
| **Serve** | niente | `cloudflared`, che la suite scarica da sé |
| **Cifratura** | nessuna: HTTP in chiaro | HTTPS fino a Cloudflare, poi nel tunnel |

Si parte dalla rete locale: funziona subito, non richiede niente, e copre il
caso "sto sul divano". Il tunnel è un secondo interruttore nel pannello, con
scritto chiaramente cosa comporta — ed è **anche** il modo in cui è stata fatta
la cifratura, visto che il quick tunnel di Cloudflare non chiede un account.

**Il tunnel è in uscita**, cioè è il PC a collegarsi al servizio: non si apre
nessuna porta sul router e non serve toccare la configurazione di rete.

---

## Il QR e l'accoppiamento

Il QR **non contiene una password permanente**. Contiene un invito che scade:

```json
{
  "url": "https://<indirizzo>",
  "pairing": "<codice monouso, valido 5 minuti>",
  "impronta": "<impronta del certificato>"
}
```

Cosa succede quando lo inquadri:

1. il telefono si collega e presenta il codice monouso;
2. il gateway lo verifica, lo **brucia** e restituisce una credenziale solo per
   quel dispositivo;
3. il dispositivo compare nelle impostazioni della suite con nome, data e ultimo
   accesso;
4. da lì lo puoi revocare quando vuoi, e revocarne uno non tocca gli altri.

L'impronta del certificato nel QR serve a una cosa precisa: il telefono sa in
anticipo con chi deve parlare, quindi nessuno può mettersi in mezzo fingendosi il
tuo PC.

### Cosa può fare un dispositivo accoppiato

Non tutto per forza. Ogni dispositivo ha i suoi permessi, scelti da te:

- **Guardare** — libreria dei brani, immagini, video già generati
- **Generare** — mettere in coda nuovi lavori
- **Companion** — parlare con il companion e leggerne la memoria

Il terzo è staccato dagli altri di proposito: la memoria personale del Companion
è la cosa più delicata che la suite contenga, e va concessa una volta per
dispositivo, non ereditata insieme al resto.

---

## L'app Android

Un client sottile: l'interfaccia è quella della suite, servita dal gateway. Sul
telefono serve nativo solo ciò che il browser non fa bene:

- lettore di QR per l'accoppiamento
- custodia della credenziale nel portachiavi di sistema
- **la scelta di chi sei**, quando il telefono lo usa più di una persona
- notifica quando un lavoro lungo finisce
- scaricamento dei risultati nella galleria
- la coda di quello che si scrive mentre il PC non c'è

Così l'app non va riscritta ogni volta che cambia un'interfaccia, e una app che
non usa Android non richiede un secondo progetto da mantenere.

*Questa pagina descriveva il progetto. La 0.5.0 ha fatto il contrario — moduli
disegnati dall'app — e la 0.6.0 è tornata qui. Il perché del giro sta più in
basso, in «Cambiato rispetto al progetto».*

---

## Regole che non si negoziano

1. **Mai raggiungibile senza credenziale.** Nemmeno in rete locale, nemmeno "solo
   per provare". Un'opzione "senza password" finirebbe accesa e dimenticata.
2. **Un dispositivo, una credenziale.** Niente password condivisa fra telefono e
   tablet: revocarne uno deve poter lasciare l'altro al suo posto.
3. **Il tunnel si accende a mano** e la suite mostra sempre, in modo visibile, che
   è acceso e chi si è collegato di recente.
4. **I motori restano su `127.0.0.1`.** Se un giorno il gateway avesse un buco,
   sotto non deve esserci niente di esposto.
5. **La GPU è una sola.** Le richieste da remoto entrano nella stessa coda e
   passano dallo stesso arbitro: nessuna corsia preferenziale, o due lavori
   contemporanei saturano gli 8 GB.

---

## Quando

Dopo la migrazione delle app. Il gateway ha senso quando c'è qualcosa da servire:
prima è un ponte verso il nulla. Nella roadmap stava in **0.4**, l'app Android in
**0.5**: sono usciti insieme nella **0.5.0**, il 21 agosto 2026. Il tunnel verso
Internet, che era il punto rimasto aperto, è arrivato con la **0.6.0** il 22
agosto.

---

## Cos'è stato fatto davvero (0.5.0 e 0.6.0)

Questo documento era il **progetto**. Quello che c'è adesso è quasi tutto quel
che dice, e queste sono le differenze — perché un progetto che non racconta dove
si è discostato smette di essere utile.

### Fatto

| | Dove | Da quando |
|---|---|---|
| Gateway HTTP con autenticazione davanti a tutto | `packages/gateway` | 0.5.0 |
| Codice monouso a otto cifre, scade in 5 minuti | `remoto.ts` | 0.5.0 |
| QR con dentro indirizzo e codice | pannello **Da fuori** | 0.5.0 |
| Una credenziale per dispositivo, revoca singola | `remoto.ts` · pannello | 0.5.0 |
| I motori restano su `127.0.0.1` | il gateway inoltra, non apre | 0.5.0 |
| Rete locale | `0.0.0.0:8790` | 0.5.0 |
| **L'elenco di cosa si può chiedere** | `packages/azioni` | 0.5.0 |
| **La console web** | `console.ts` | 0.5.0, rifatta nella 0.6.0 |
| **L'app Android** | `apps/mobile` | 0.5.0, rifatta nella 0.6.0 |
| **Il server MCP** | `packages/mcp` | 0.5.0 |
| **Tunnel in uscita verso Internet** | `tunnel.ts` | 0.6.0 |
| **Cifratura da fuori (HTTPS)** | il tunnel stesso | 0.6.0 |
| **La libreria vista da fuori**, con i pezzi | `/libreria`, `/libreria/file/:id` | 0.6.0 |
| **Più persone su un telefono** | `data/Profili.kt` | 0.6.0 |

Le righe della console, dell'app e dell'MCP non erano in questo documento: sono
venute fuori strada facendo, e stanno in [AZIONI-E-MCP.md](AZIONI-E-MCP.md).

### Il tunnel, com'è fatto

`cloudflared` in modalità *quick tunnel*: il PC apre una connessione **in
uscita** verso Cloudflare e riceve un indirizzo
`https://qualcosa.trycloudflare.com` che punta al gateway. Nessuna porta sul
router, nessun account, nessun dominio.

Tre cose da sapere, e stanno scritte anche nel pannello:

- **l'indirizzo è pubblico.** Chi lo indovinasse arriverebbe alla pagina di
  accoppiamento, non ai contenuti: senza token il gateway risponde 401 a tutto,
  e il codice a otto cifre vive cinque minuti con un tetto di dieci tentativi al
  minuto. Ma è un indirizzo su Internet, e va detto invece di essere scoperto;
- **cambia a ogni accensione.** I quick tunnel non hanno un nome fisso: per
  questo accendendolo si buttano gli inviti in corso — un QR è la fotografia di
  un indirizzo;
- **serve `cloudflared`**, ~40 MB, che la suite scarica dalle Release ufficiali
  di Cloudflare la prima volta. Se non arriva, il tunnel non si accende e il
  motivo si legge: non si finge che sia acceso.

### Il firewall di Windows

Il guasto più silenzioso che questo pannello potesse avere, e per mesi non è
stato nemmeno nominato: la suite dice «in ascolto», il QR si inquadra, e dal
telefono non arriva niente. Nei log non c'è nulla, perché non è la suite — è
Windows che blocca in entrata, di solito perché al primo ascolto è comparso un
riquadro «Consentire l'accesso?» che ha ricevuto un «Annulla».

Dalla 0.6.0 la suite **guarda** se la regola c'è (leggere non costa permessi) e,
se manca, lo scrive con un tasto per crearla — un riquadro di Windows, una volta
sola. Non la crea mai da sé: la suite si installa **senza UAC** apposta, e
chiedere l'amministratore a tutti per una funzione che molti non useranno mai
sarebbe il prezzo sbagliato.

Con il tunnel acceso l'avviso non compare, perché la porta **non serve**.

### Cambiato rispetto al progetto

**L'interfaccia adesso è davvero «quella della suite servita dal gateway» — e
nella 0.5.0 non lo era.** Il progetto lo diceva; la 0.5.0 aveva scelto il
contrario, con una ragione scritta qui:

> *«le pagine delle app della suite sono fatte per uno schermo grande e per un
> motore che risponde su 127.0.0.1, e servirle a un telefono avrebbe voluto dire
> riscriverle comunque».*

Resta vero per le pagine **delle app** — quelle di DaProdCinema non si servono a
un telefono. Ma era la risposta a una domanda diversa: la 0.6.0 non serve le
pagine delle app, serve **una pagina della suite fatta per il telefono**, che è
la console. E la console la usa anche il portatile, quindi non è una seconda
interfaccia: è la stessa.

Il vantaggio è quello che il progetto cercava: quando la suite impara a fare una
cosa nuova, il telefono ce l'ha senza aggiornare l'app. E in più si è preso quel
che la 0.5.0 non aveva: **la galleria**, cioè poter guardare quello che il PC ha
fatto senza scaricarlo prima.

**I permessi sono due, non tre.** Il progetto voleva «Guardare / Generare /
Companion» scelti per dispositivo. Adesso c'è una differenza sola — chi può
**solo chiedere** e chi può **anche decidere** — e il Companion non è
raggiungibile da fuori in nessun modo.

*(Nella 0.7.0 quei due ruoli hanno perso il nome. Si chiamavano «padrone» e
«ospite», e sono stati tolti perché non dicono niente a chi legge: adesso
l'interfaccia scrive cosa uno può fare. Dentro il codice restano `admin` e
`ospite`, che sono nomi per chi programma, non per chi usa.)* La
memoria personale del Companion è la cosa più delicata che la suite contenga, e
finché non c'è una ragione per aprirla resta chiusa: è più semplice da
verificare di un permesso che si può concedere.

**Non c'è l'impronta del certificato nel QR**, che il progetto voleva per
riconoscere il PC. Con il tunnel il certificato è quello di Cloudflare, valido e
verificato dal telefono come quello di qualunque sito; in casa non c'è
certificato affatto. L'impronta tornerà utile il giorno che la suite servirà un
certificato suo sulla rete locale.

### Il biscotto di sessione, e perché vale solo in lettura

La galleria ha portato un problema che le rotte JSON non avevano: un tag `<img>`
o `<video>` **non sa mettere un header**. Senza rimedio, ogni anteprima andrebbe
scaricata in memoria dal JavaScript — niente caricamento pigro, niente barra di
scorrimento su un video da cento MB.

Il rimedio è un biscotto, piantato da `POST /sessione` (che il token ce l'ha
nell'header), `HttpOnly` e `SameSite=Strict`. E vale **solo su GET e HEAD**: se
valesse anche sulle POST, la pagina di un altro sito potrebbe far partire una
generazione dal browser di chi è collegato — il classico CSRF. Limitandolo alla
lettura quella strada non esiste, e c'è una prova che lo tiene fermo.

### DaProdConnessione (0.7.0)

La nona scheda della suite, e **non ha pagine sue**: apre questa stessa console
in una finestra, con il token che il computer si dà da solo (`tokenDiCasa()`).

Nasce per togliere un doppione. Prima la stessa roba stava nel pannello «Da
fuori» dell'hub *e* in questa pagina, e i due non dicevano mai la stessa cosa:
uno sapeva del firewall e l'altro no, uno si aggiornava da solo e l'altro andava
riaperto. Una verità sola non si ottiene scrivendone una terza: si ottiene
togliendone una. Il pannello dell'hub è sparito — 739 righe — e la scheda nuova
ne ha aggiunte 120.

Le azioni del pannello (invitare, accendere il tunnel, sbloccare la porta,
togliere un collegamento) sono diventate **rotte del gateway** invece che canali
IPC dell'hub. Conseguenza voluta: adesso si possono fare anche dal telefono e
dal portatile, non solo stando davanti al computer.

**Il gateway è sempre in ascolto**, e l'interruttore decide su cosa: acceso
`0.0.0.0`, spento `127.0.0.1`. Se lo spegnesse del tutto, spegnerebbe anche la
pagina che contiene l'interruttore.

### La fila che parte davvero (0.7.0)

Era il punto rimasto aperto dalla 0.5.0, e il difetto che si sentiva di più:
«accettata» voleva dire «l'ho vista». Adesso accettare apre la scheda giusta, le
passa il lavoro e ne riconosce il file — vedi `apps/shell/src/main/esecuzione.ts`.

Tre scelte, e stanno scritte per esteso lì dentro:

1. **genera la scheda, non lo shell** — altrimenti sarebbero due strade per fare
   la stessa cosa, e la seconda divergerebbe alla prima novità;
2. **una per volta** — su otto GB ci sta un modello alla volta;
3. **il file si riconosce dalla libreria**, che è già l'elenco di tutto quello
   che esce. Funziona *perché* si lavora una per volta.

⚠ Il caso che resta aperto: se mentre la fila lavora generi anche tu a mano
nella stessa scheda, il primo file che esce può finire attaccato alla richiesta
di un altro.

### Tailscale, e perché è la strada consigliata (0.7.0)

Il tunnel funziona ma ha un difetto strutturale: **l'indirizzo cambia a ogni
riavvio**, quindi il telefono lo perde. Tailscale no — è un indirizzo fisso,
cifrato, privato, che funziona in casa e fuori senza mettere niente su Internet.

Da qui due cose: negli indirizzi Tailscale sta **davanti a tutti**
(`reti.ts`), e il QR li porta **tutti** invece di uno solo (`InvitoQr` v3), così
l'app li prova finché uno risponde e si ricorda quale ha funzionato.

### Non fatto, e va detto

- **In casa il traffico resta in chiaro.** HTTP sulla wifi: chi è già dentro la
  tua rete e sa guardare il traffico vede quello che passa. Da fuori no — quello
  passa dal tunnel ed è HTTPS. Un certificato sulla rete locale è il passo che
  manca.
- ~~**La coda non è ancora quella vera.**~~ — fatta nella **0.7.0**. Resta il
  caso di due generazioni insieme, scritto qui sopra.
- **Venti persone insieme non le ha provate nessuno.** Il gateway manda i file a
  pezzi e non li tiene in memoria, quindi in teoria regge; ma «in teoria» in
  questo file non è mai bastato.
- **Le notifiche sono un giro ogni quarto d'ora**, non una push vera: il
  telefono chiede, il PC non chiama. Va bene per un lavoro che dura minuti,
  meno bene per uno che finisce in trenta secondi.
- **Il tunnel non è mai stato acceso su una linea vera.** Il codice c'è e
  compila; l'indirizzo pubblico non l'ha ancora visto nessuno.

### Le prove

```bash
pnpm run prova
```

Accende un gateway vero e un server MCP vero, senza Electron e senza scheda
video, e prova quello che si rompe in silenzio: chi entra senza token, chi
supera i propri permessi, chi prova mille codici, chi chiede un file fuori dalla
cartella dei risultati, chi prova a usare il biscotto per scrivere. Sono in
`apps/shell/scripts/prova-gateway.mjs` e `prova-mcp.mjs`, girano in una decina
di secondi, e passano nella CI prima di ogni release.
