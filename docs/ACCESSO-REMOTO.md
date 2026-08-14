# Accesso remoto — QR e app Android

Obiettivo: inquadri un QR con il telefono e usi la suite da lì. Da casa, ma anche
da fuori. Stesso codice per telefono, tablet, un altro computer.

Questo documento è il progetto della funzione, non ancora il suo codice.

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
prima è un ponte verso il nulla. Nella roadmap sta in **0.4**, l'app Android in
**0.5**.
