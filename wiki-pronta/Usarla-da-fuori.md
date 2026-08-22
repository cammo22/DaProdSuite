# Usarla da fuori

Dalla **0.5.0** la suite non si usa solo dal computer su cui gira: la comandi dal
browser di un altro computer di casa, dal telefono, e — se ti interessa — da
un'AI.

Dalla **0.6.0** funziona **anche quando non sei in casa**, e il telefono non
mostra più un modulo: mostra le pagine della suite.

---

## Accenderla

Nell'hub, in fondo, c'è il pulsante **Da fuori**. Apri il pannello e premi
**Accendi**.

Compaiono:

- un **indirizzo**, tipo `http://192.168.1.20:8790/` — serve al browser;
- il **QR** con sotto un codice di otto cifre, già pronto;
- l'interruttore **Anche da fuori casa**, che vedi qui sotto;
- i due tasti **Invita un padrone** e **Invita un ospite**, per quando ti serve
  un secondo invito.

Il codice **vale una volta sola e scade in cinque minuti**: il pannello ti dice
quanto gli resta. Se scade, ne chiedi un altro.

### Anche da fuori casa

È il secondo interruttore. Acceso, il PC apre da solo una strada verso Internet
e la suite diventa raggiungibile da qualunque parte, all'indirizzo
`https://qualcosa.trycloudflare.com` che compare lì accanto.

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
- **cambia ogni volta che lo accendi.** Per questo, accendendolo, gli inviti in
  corso si buttano e ne compare uno nuovo: un QR è la fotografia di un
  indirizzo.

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

### Padrone o ospite?

| | Padrone | Ospite |
|---|---|---|
| Chiedere lavori | sì | sì |
| Vedere la galleria del PC | sì | sì |
| Vedere le richieste degli altri | sì | no |
| Accettare o scartare | sì | no |
| Aprire un'app sul PC | sì | no |

Il tuo telefono e il tuo portatile li inviti come padroni. Un amico che vuole
provare, come ospite.

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
- **Fila** — le richieste, con lo stato. Se sei padrone, accetti e scarti da qui;
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

## Chi decide resta chi sta al PC

Una richiesta che arriva da fuori **non fa partire niente da sola**. Compare nel
pannello **Da fuori**, e chi è davanti al computer la accetta o la scarta.

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
- **«Accettata» non vuol dire «sta partendo».** Per adesso significa «l'ho vista
  e va bene»: la generazione la fa partire chi sta al PC, aprendo l'app.
- **La notifica sul telefono può tardare fino a un quarto d'ora.** È il telefono
  che chiede al PC, non il PC che chiama.
- **Se spegni la suite, l'accesso si chiude** — tunnel compreso. Non resta
  niente in ascolto e niente aperto.
- **Il Companion non si raggiunge da fuori, in nessun modo.** La sua memoria è
  la cosa più delicata che la suite contenga, e finché non c'è una ragione per
  aprirla resta chiusa.
