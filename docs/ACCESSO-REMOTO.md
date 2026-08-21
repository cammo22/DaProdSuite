# Accesso remoto — QR e app Android

Obiettivo: inquadri un QR con il telefono e usi la suite da lì. Da casa, ma anche
da fuori. Stesso codice per telefono, tablet, un altro computer.

Questo documento era il progetto della funzione. Dalla **0.5.0** c'è anche il
codice: in fondo, «Cos'è stato fatto davvero», con le differenze e con quello
che ancora non c'è.

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
| **Serve** | niente | un account sul servizio di tunnel |
| **Cifratura** | certificato generato dalla suite | TLS del tunnel |

Si parte dalla rete locale: funziona subito, non richiede account, e copre il
caso "sto sul divano". Il tunnel è una scelta esplicita nelle impostazioni, con
scritto chiaramente cosa comporta.

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
- notifica quando un lavoro lungo finisce
- scaricamento dei risultati nella galleria

Così l'app non va riscritta ogni volta che cambia un'interfaccia, e una app che
non usa Android non richiede un secondo progetto da mantenere.

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
**0.5**: sono usciti insieme nella **0.5.0**, il 21 agosto 2026.
---

## Cos'è stato fatto davvero (0.5.0, 21 agosto 2026)

Questo documento era il **progetto**. Quello che c'è adesso è quasi tutto quel
che dice, e queste sono le differenze — perché un progetto che non racconta dove
si è discostato smette di essere utile.

### Fatto

| | Dove |
|---|---|
| Gateway HTTP con autenticazione davanti a tutto | `packages/gateway` |
| Codice monouso a otto cifre, scade in 5 minuti | `remoto.ts` |
| QR con dentro indirizzo e codice | pannello **Da fuori** dell'hub |
| Una credenziale per dispositivo, revoca singola | `remoto.ts` · pannello |
| I motori restano su `127.0.0.1` | il gateway inoltra, non apre |
| Rete locale | `0.0.0.0:8790` |
| **L'elenco di cosa si può chiedere** | `packages/azioni` |
| **La console web** — la suite dal browser di un altro computer | `console.ts` |
| **L'app Android** | `apps/mobile` |
| **Il server MCP** | `packages/mcp` |

Le ultime quattro righe non erano in questo documento: sono venute fuori
strada facendo, e stanno in [AZIONI-E-MCP.md](AZIONI-E-MCP.md).

### Cambiato rispetto al progetto

**L'interfaccia non è «quella della suite servita dal gateway».** Il progetto
diceva che l'app Android sarebbe stata un client sottile su pagine servite dal
PC. Non è andata così, e per una ragione buona: le pagine delle app della suite
sono fatte per uno schermo grande e per un motore che risponde su `127.0.0.1`,
e servirle a un telefono avrebbe voluto dire riscriverle comunque.

Quello che si serve dal gateway è **l'elenco delle azioni**, non le pagine. Il
telefono e la console si disegnano i moduli da soli, e nessuno dei due va
aggiornato quando la suite impara a fare una cosa nuova. È lo stesso vantaggio
che cercava il progetto, ottenuto un piano più in basso.

**I permessi sono due, non tre.** Il progetto voleva «Guardare / Generare /
Companion» scelti per dispositivo. Adesso ci sono due ruoli — **padrone** e
**ospite** — e il Companion non è raggiungibile da fuori in nessun modo. La
memoria personale del Companion è la cosa più delicata che la suite contenga, e
finché non c'è una ragione per aprirla resta chiusa: è più semplice da
verificare di un permesso che si può concedere.

### Non fatto, e va detto

- **Il tunnel verso Internet.** Il gateway è **solo rete locale**.
- **Il traffico non è cifrato.** HTTP in chiaro sulla wifi di casa: non c'è
  certificato, e quindi non c'è nemmeno l'impronta nel QR che il progetto
  voleva per riconoscere il PC. Chi è dentro la tua rete e sa guardare il
  traffico vede quello che passa. Questa è **la** cosa da sistemare prima del
  tunnel, non dopo: un tunnel sopra un canale in chiaro non aggiusta niente.
- **La coda non è ancora quella vera.** Una richiesta accettata non fa partire
  la generazione da sola: chi sta al PC la accetta e poi apre l'app e la fa.
  Il ponte fra una richiesta accettata e il motore che gira è il prossimo passo,
  e senza quello «accettata» vuol dire soltanto «l'ho vista e va bene».
- **Le notifiche sono un giro ogni quarto d'ora**, non una push vera: il
  telefono chiede, il PC non chiama. Va bene per un lavoro che dura minuti,
  meno bene per uno che finisce in trenta secondi.

### Le prove

```bash
pnpm run prova
```

Accende un gateway vero e un server MCP vero, senza Electron e senza scheda
video, e prova quello che si rompe in silenzio: chi entra senza token, chi
supera i propri permessi, chi prova mille codici, chi chiede un file fuori dalla
cartella dei risultati. Sono in `apps/shell/scripts/prova-gateway.mjs` e
`prova-mcp.mjs`, e girano anche nella CI prima di ogni release.
