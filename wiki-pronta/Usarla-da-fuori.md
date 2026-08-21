# Usarla da fuori

Dalla **0.5.0** la suite non si usa solo dal computer su cui gira. La puoi
comandare dal browser di un altro computer di casa, dal telefono, e — se ti
interessa — da un'AI.

Funziona **dentro la tua rete**: il PC e l'altro apparecchio devono essere sulla
stessa wifi. Da Internet non ancora.

---

## Accenderla

Nell'hub, in fondo, c'è il pulsante **Da fuori**. Apri il pannello e premi
**Accendi**.

Compaiono due cose:

- un **indirizzo**, tipo `http://192.168.1.20:8790/` — serve al browser;
- i due tasti **Invita un padrone** e **Invita un ospite**, che danno un QR e un
  codice di otto cifre.

Il codice **vale una volta sola e scade in cinque minuti**: il pannello ti dice
quanto gli resta. Se scade, ne chiedi un altro.

### Padrone o ospite?

| | Padrone | Ospite |
|---|---|---|
| Chiedere lavori | sì | sì |
| Vedere le richieste degli altri | sì | no |
| Accettare o scartare | sì | no |
| Aprire un'app sul PC | sì | no |

Il tuo telefono e il tuo portatile li inviti come padroni. Un amico che vuole
provare, come ospite.

---

## Dal browser di un altro computer

1. Sull'altro computer apri il browser e vai all'indirizzo del pannello.
2. Batti il codice di otto cifre e dai un nome al computer.
3. Fatto.

Da lì chiedi immagini, video, brani e voci, vedi cosa sta facendo la scheda
video, guardi la fila delle richieste e ti scarichi i risultati.

**Perché non installare la suite anche sul portatile?** Perché lì non girerebbe
bene: i modelli vogliono la scheda video del computer fisso, e un portatile che
non ce l'ha ci metterebbe ore per una cosa che di là richiede minuti. Ma non ti
serve che ci giri — ti serve **comandare** quel PC, e per farlo basta un browser.

---

## Dal telefono

C'è un'app Android. **Va compilata**: non c'è ancora un APK pronto da scaricare,
e le istruzioni sono
[nel repository](https://github.com/cammo22/DaProdSuite/tree/main/apps/mobile).

Una volta installata: **Inquadra il QR** sullo schermo del PC, e sei collegato.

Cosa sa fare:

- **chiedere lavori** — e il modulo lo prende dalla suite, quindi quando il PC
  impara a fare una cosa nuova la trovi sul telefono senza aggiornare l'app;
- **tenere quello che scrivi quando il PC non c'è** — resta sul telefono e parte
  da solo appena il computer torna raggiungibile;
- **avvisarti quando un lavoro finisce**, anche ore dopo e con l'app chiusa;
- **portarti il risultato nel telefono** — un'immagine e un video finiscono in
  galleria, un brano fra la musica, sotto «DaProd Suite».

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

Se hai scollegato il telefono dall'app, l'apparecchio **resta nell'elenco** del
PC finché non lo togli anche da lì. Sono due gesti diversi: uno è il telefono
che si scorda il PC, l'altro è il PC che si scorda il telefono.

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

- **Vale dentro casa, non da Internet.** Il collegamento non esce dalla tua
  rete, e **non è cifrato**: chi è già dentro la tua wifi e sa guardare il
  traffico vede quello che passa. Su una wifi di casa con una password è un
  rischio piccolo; su quella di un bar non lo faresti.
- **«Accettata» non vuol dire «sta partendo».** Per adesso significa «l'ho vista
  e va bene»: la generazione la fa partire chi sta al PC, aprendo l'app.
- **La notifica sul telefono può tardare fino a un quarto d'ora.** È il telefono
  che chiede al PC, non il PC che chiama.
- **Se spegni la suite, l'accesso si chiude.** Non resta niente in ascolto.
- **Il Companion non si raggiunge da fuori, in nessun modo.** La sua memoria è
  la cosa più delicata che la suite contenga, e finché non c'è una ragione per
  aprirla resta chiusa.
