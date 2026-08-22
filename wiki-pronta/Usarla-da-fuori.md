# Usarla da fuori

Dalla **0.5.0** la suite non si usa solo dal computer su cui gira: la comandi dal
browser di un altro computer di casa, dal telefono, e — se ti interessa — da
un'AI.

Dalla **0.6.0** funziona **anche quando non sei in casa**, e il telefono non
mostra più un modulo: mostra le pagine della suite.

---

## DaProdConnessione

Dalla **0.7.0** non c'è più niente da accendere: la suite si apre già collegata.
Nell'hub c'è una scheda, **DaProdConnessione**, e serve a una cosa sola —
**sapere se funziona**.

Dentro trovi:

- un **quadrone** in cima: verde se va tutto, rosso se manca qualcosa, con
  scritto cosa e il tasto per rimediare;
- i **quadrati**: la rete di casa, se ci si arriva da fuori, il firewall, e se i
  lavori partono da soli;
- **chi è collegato**, e da quanto;
- **da dove si arriva**: gli indirizzi, con Tailscale in cima se ce l'hai;
- il tasto **Invita qualcuno**.

È la **stessa pagina** che vedi dal browser di un portatile e dall'app del
telefono: quello che leggi qui è quello che leggono lì.

### Invitare

**Invita qualcuno** ti dà un codice di otto cifre e un QR. Tre scelte:

- **per una persona** — il codice si consuma al primo che lo usa;
- **per dieci persone** — utile quando siete in tanti: lo mostri una volta e lo
  inquadrano tutti;
- **per chi deve anche decidere** — quella persona potrà anche dire sì o no ai
  lavori degli altri.

Il codice **dura pochi minuti** in tutti e tre i casi: è quella la protezione,
non il numero di persone.

### Da fuori casa: Tailscale, o il tunnel

Due strade, e la prima è meglio.

**Tailscale** (consigliata). Se ce l'hai sul computer e lo installi anche sul
telefono, il computer ha un indirizzo **fisso, cifrato e privato** che funziona
in casa e fuori. Non c'è niente da accendere e niente su Internet: lo trovi già
in cima a «Da dove si arriva».

**Il tunnel.** Nel quadrato «Da fuori casa» c'è «apri il tunnel». Acceso, il PC
apre da solo una strada verso Internet e la suite diventa raggiungibile da
qualunque parte, all'indirizzo `https://qualcosa.trycloudflare.com`.

- **Non apre nessuna porta sul router** e non devi sapere l'indirizzo di casa
  tua: è il computer che si collega verso fuori, non il contrario.
- **Da fuori il collegamento è cifrato** (HTTPS). Sulla wifi di casa resta in
  chiaro, come prima.
- **La prima volta scarica un programmino** (`cloudflared`, una quarantina di
  MB). Te lo dice mentre lo fa; le volte dopo parte subito.

Due cose da sapere:

- **quell'indirizzo è pubblico.** Chi lo indovinasse arriverebbe alla schermata
  di collegamento, non alle tue cose: senza codice non si entra, e i tentativi
  sono limitati. Ma è su Internet, ed è giusto saperlo;
- **cambia ogni volta che lo accendi.** È il motivo per cui Tailscale è meglio:
  con il tunnel, se il computer si riavvia mentre sei fuori, l'indirizzo di
  prima non esiste più. (L'app prova comunque tutti quelli che conosce prima di
  arrendersi.)

### Se il telefono non lo raggiunge

Tre cose, in quest'ordine.

**1. Windows sta bloccando.** È la causa più frequente e la più silenziosa: il
PC dice «in ascolto» e dal telefono non arriva niente, senza nessun errore da
nessuna parte. Se è così, nel pannello compare un avviso rosso con il tasto
**Sblocca la porta**: premilo e di' di sì al riquadro di Windows. È una volta
sola.

**2. L'indirizzo sbagliato.** Un computer ha spesso più di un indirizzo — la
rete di casa, le schede virtuali di WSL o di Hyper-V, Tailscale — e **solo uno
arriva al telefono**. La suite sceglie quello di casa, ma se ha sbagliato sotto
c'è un menu con tutti gli altri, ognuno con scritto cos'è.

**3. Accendi «Anche da fuori casa».** Funziona pure stando in casa, e non ha
bisogno né del firewall né dell'indirizzo giusto: il collegamento lo fa il PC
verso l'esterno, e il telefono ci arriva da qualunque rete.

### Chi può fare cosa

Non ci sono ruoli con un nome: c'è quello che uno **può fare**.

| | Chi può chiedere | Chi può anche decidere |
|---|---|---|
| Chiedere lavori | sì | sì |
| Vedere la galleria del computer | sì | sì |
| Vedere le richieste degli altri | no | sì |
| Dire sì o no ai lavori | no | sì |
| Invitare, e togliere collegamenti | no | sì |

Il tuo telefono e il tuo portatile invitali come «chi deve anche decidere». Un
amico che vuole provare, no.

---

## Dal telefono

C'è un'app Android: si scarica dalla
[Release](https://github.com/cammo22/DaProdSuite/releases/latest), il file
`DaProdSuite-telefono-<versione>.apk`.

Il telefono ti avviserà che viene da fuori dal Play Store e ti chiederà di
permetterlo: è normale per un'app che non passa da un negozio. Una volta
installata: scrivi **come ti chiami**, **inquadra il QR** sullo schermo del PC,
e sei dentro.

### Chi sei

Alla prima apertura l'app ti chiede il nome. Non è un vezzo: quel nome compare
sul PC accanto a tutto quello che chiedi, e serve a sapere **chi ha chiesto
cosa** quando in fila ci sono tre lavori di tre persone.

Se il telefono lo usa più di una persona, ognuna ha il suo collegamento: si
sceglie all'avvio, si cambia dal menu **⋮** in alto a destra. Con una persona
sola non ti chiede niente e entri dritto.

Togliere una persona (tienila premuta nell'elenco) butta via il **suo**
collegamento da quel telefono. Sul PC resta nell'elenco finché non la togli
anche da lì: sono due gesti diversi.

### Cosa vedi

Le **pagine della suite**, le stesse che vedrebbe un portatile:

- **Suite** — cosa sta facendo il computer adesso, e le schede da cui chiedere;
- **Chiedi** — il modulo, che la suite si disegna da sola: quando il PC impara a
  fare una cosa nuova, la trovi qui senza aggiornare l'app;
- **Lavori** — le richieste, con lo stato. Se puoi decidere, dici **fallo** o
  **lascia perdere** da qui, e il computer lo fa;
- **Galleria** — quello che il PC ha fatto. Le immagini si guardano, i video
  partono e si scorrono, i brani si ascoltano — **senza scaricarli prima**. Con
  «tieni nel telefono» te li porti dietro: un'immagine e un video finiscono in
  galleria, un brano fra la musica, sotto «DaProd Suite».

### E le altre cose che fa

- **avvisa quando un lavoro finisce**, anche ore dopo e con l'app chiusa. Se sul
  telefono ci sono più persone, la notifica dice di chi è;
- **tiene quello che scrivi quando il PC non c'è** — resta sul telefono e parte
  da solo appena il computer torna raggiungibile;
- **si aggiorna da sola.** Dal menu **⋮**, «Aggiorna l'app». Guarda anche per
  conto suo, una volta al giorno al massimo, e se non c'è niente non ti dice
  niente. È l'unica cosa che l'app manda fuori dalla tua rete: una domanda a
  GitHub su quale sia l'ultima versione, senza niente dentro.

---

## Dal browser di un altro computer

1. Sull'altro computer apri il browser e vai all'indirizzo del pannello.
2. Scrivi come ti chiami e batti il codice di otto cifre.
3. Fatto.

È **la stessa pagina** che vede il telefono, larga invece che stretta. Da lì
chiedi immagini, video, brani e voci, vedi cosa sta facendo la scheda video,
guardi la fila e la galleria, e ti scarichi i risultati.

**Perché non installare la suite anche sul portatile?** Perché lì non girerebbe
bene: i modelli vogliono la scheda video del computer fisso, e un portatile che
non ce l'ha ci metterebbe ore per una cosa che di là richiede minuti. Ma non ti
serve che ci giri — ti serve **comandare** quel PC, e per farlo basta un browser.

---

## Chi decide, e cosa succede quando dice di sì

Una richiesta che arriva da fuori **non parte da sola**: compare nei **Lavori**,
e qualcuno che può decidere le dice **fallo** o **lascia perdere**.

Dalla 0.7.0, quando dici «fallo», **il computer lo fa davvero**: apre la scheda
giusta, la fa generare, e quando il file è pronto lo dice a chi aspettava. Prima
bisognava andare al computer e rifare la cosa a mano.

Non è diffidenza: su otto GB di scheda video ci sta **un modello per volta**, e
una clip video è un quarto d'ora in cui il PC non fa altro. Un telefono in tasca
che può far partire quattro generazioni «per provare» è un computer che non è
più di chi ci sta davanti.

Le cose che non costano niente — guardare la libreria, vedere cosa è acceso,
leggere la fila — rispondono subito, senza chiedere il permesso a nessuno.

---

## Togliere l'accesso a un apparecchio

Nel pannello, sotto **Dispositivi collegati**, ogni riga ha **Togli l'accesso**.
Vale all'istante e solo per quello: gli altri restano dove sono.

---

## Un'AI che usa la suite

C'è anche un **server MCP**: Claude Code, o qualunque programma che parli quel
protocollo, si collega col codice di otto cifre come farebbe un telefono e da lì
può chiedere generazioni, leggere la libreria e guardare la coda.

Vale la stessa regola di tutti: le generazioni passano dalla fila, e il sì lo
dai tu. Le istruzioni sono
[nel repository](https://github.com/cammo22/DaProdSuite/blob/main/docs/AZIONI-E-MCP.md).

---

## Cose da sapere

- **In casa il collegamento non è cifrato.** Chi è già dentro la tua wifi e sa
  guardare il traffico vede quello che passa. Su una wifi di casa con una
  password è un rischio piccolo; su quella di un bar accendi «Anche da fuori
  casa», che è cifrato.
- **Un lavoro per volta.** Su otto GB di scheda video ci sta un modello alla
  volta: se ne accetti tre, si fanno in fila. E se **mentre la fila lavora**
  generi anche tu qualcosa a mano nella stessa scheda, può capitare che il file
  finisca attaccato alla richiesta sbagliata.
- **La notifica sul telefono può tardare fino a un quarto d'ora.** È il telefono
  che chiede al PC, non il PC che chiama.
- **Se spegni la suite, l'accesso si chiude** — tunnel compreso. Non resta
  niente in ascolto e niente aperto.
- **Il Companion non si raggiunge da fuori, in nessun modo.** La sua memoria è
  la cosa più delicata che la suite contenga, e finché non c'è una ragione per
  aprirla resta chiusa.
