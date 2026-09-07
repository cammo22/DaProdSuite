/**
 * Le pagine della console: l'ossatura HTML, senza un dato dentro.
 *
 * **Cinque schede in fondo, e nessuna in più.** Sono cambiate di nome nella
 * 0.7.6 e non è un ritocco di parole: ognuna adesso risponde a una domanda
 * diversa, e prima due di loro rispondevano alla stessa.
 *
 * | prima      | adesso       | a che domanda risponde                        |
 * |------------|--------------|-----------------------------------------------|
 * | Casa       | Casa         | com'è messa la baracca, e cosa ho fatto ieri  |
 * | Chiedi     | Produzione   | voglio fare una cosa nuova                    |
 * | Lavori     | Riepilogo    | la mia roba a che punto è                     |
 * | Galleria   | Galleria     | fammi vedere quello che è venuto fuori        |
 * | Persone    | DaProd       | cosa hanno fatto gli altri                    |
 *
 * «Lavori» e «Persone» erano i due nomi sbagliati. Il primo prometteva un
 * elenco di lavori e serviva a sapere *a che punto siamo*: adesso è un
 * riepilogo, compatto, con i numeri in cima. Il secondo prometteva delle
 * persone e mostrava dei quadrati di rete: le persone e i quadrati sono andati
 * nelle impostazioni — che è dove si va quando si cerca un interruttore — e al
 * loro posto c'è la bacheca, che è la cosa per cui uno apre quella scheda.
 *
 * Le impostazioni **non sono una sesta scheda**: sono un foglio che sale dal
 * basso. Una scheda in fondo è un posto dove si passa ogni giorno; le
 * impostazioni si aprono, si guardano e si chiudono.
 */
export const PAGINE = `<header>
  <!--
    **Il marchio si tocca.** Chiesto il 6 settembre 2026: «un easter egg se
    clicchi la scritta DaProdSuite». Sette tocchi, e succede qualcosa —
    vedi «easterEgg()» nel copione. Sette perche' e' il numero che Android usa
    per «numero di build», ed e' abbastanza da non capitare per sbaglio.
  -->
  <button class="marchio" id="marchio" title="DaProd Suite">DaProd<span>Suite</span></button>
  <div class="cresci"></div>
  <button class="chi" id="chi" hidden>
    <span class="faccina" id="mia-faccina"></span>
    <span class="nome" id="mio-nome"></span>
  </button>
  <!--
    **L'ingranaggio, disegnato.** Chiesto il 6 settembre 2026: «fai meglio il
    pulsante impostazioni, che e' diverso dal nome utente affianco».

    Era vero e si vedeva: la pastiglia del nome ha un bordo tondo e un fondo
    pieno, l'ingranaggio era un glifo tipografico dentro un cerchio con un bordo
    piu' tenue — due pesi diversi appaiati. Adesso e' un segno disegnato, dello
    stesso peso del resto, in un tondo che ha lo **stesso fondo e lo stesso
    bordo** della pastiglia accanto. Sono due tasti della stessa famiglia,
    perche' fanno parte della stessa riga.
  -->
  <!--
    ⚠ **L'ingranaggio, ridisegnato leggero.** Chiesto il 6 settembre 2026:
    «anche il pulsante impostazioni e' strano».

    Era vero: il primo disegno era una ruota **piena**, con i denti ricavati dal
    contorno. A diciannove pixel una forma piena con otto denti diventa una
    macchia tonda con dei bozzi, e accanto a una pastiglia leggera pesava il
    doppio di tutto il resto.

    Adesso e' **a filo**: un cerchio, un anello, e otto denti dritti dello
    stesso spessore. Lo stesso peso della «i» delle info e delle frecce del
    lettore, che e' il punto — sono tutti segni della stessa mano.
  -->
  <button class="tondo pari" id="apri-impostazioni" title="Impostazioni" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true" class="afilo">
      <circle cx="12" cy="12" r="3.1"/>
      <path d="M12 4.4v2.2M12 17.4v2.2M4.4 12h2.2M17.4 12h2.2M6.6 6.6l1.6 1.6M15.8 15.8l1.6 1.6M17.4 6.6l-1.6 1.6M8.2 15.8l-1.6 1.6"/>
      <circle cx="12" cy="12" r="7.6"/>
    </svg>
  </button>
  <!--
    **Il filo del caricamento.** Chiesto il 7 settembre 2026: «sul telefono
    mostrare il caricamento, gli aggiornamenti delle pagine; l'utente finale
    deve avere tempistiche approssimative, ma l'importante e' che vede lo
    stato; togli i dettagli di troppo, minimal e futuristica».

    Un filo di due pixel sotto alla testata, e nient'altro: niente percentuali,
    niente «sto caricando 3 di 7», niente rotella in mezzo allo schermo. Non
    dice quanto manca perche' non lo sa — quello che deve dire e' che la suite
    sta facendo qualcosa, e per quello basta una cosa che si muove.

    Sta qui dentro apposta: la testata e' appiccicata in cima, quindi il filo
    resta visibile anche a meta' pagina, dove uno sta guardando.
  -->
  <div class="filo" id="filo" aria-hidden="true"><i></i></div>
</header>

<main>

  <!-- ============================== ENTRARE ==============================
    La registrazione, e non più «collega questo dispositivo».

    Chiesto il 26 agosto 2026: «all'avvio dell'app voglio una specie di
    registrazione molto semplice, nickname e codice o qr, ma farlo in una bella
    pagina di login». Due caselle sono rimaste due caselle — semplice era la
    richiesta — ma adesso hanno intorno un nome, una promessa e due passi
    numerati che dicono cosa fare, invece di un riquadro grigio che dice cosa
    scrivere.

    Il **nickname è unico**: chi ne sceglie uno già preso lo scopre qui, con una
    frase che dice cosa fare, e non dopo — quando quel nome sarebbe già sotto a
    tutto quello che ha chiesto. Il controllo vero sta nel gateway, dentro «accoppia»:
    questa è solo la faccia che ha.
  -->
  <section class="pagina on" id="pag-entra">
    <div class="entrata">
      <div class="stemma">&#9673;</div>
      <h1>DaProd<span>Suite</span></h1>
      <p class="claim">
        Il computer di casa genera immagini, video, musica e voce.<br>
        Tu, da qui, gli dici cosa fare.
      </p>

      <div class="scheda">
        <div class="passo"><b>1</b> Scegli come farti chiamare</div>
        <input id="nome" maxlength="40" autocomplete="off" placeholder="Il tuo nome">
        <p class="nota" style="margin-top:6px">
          È il nome con cui comparirai in DaProd, accanto a quello che fai.
          Dev'essere libero: se è già di qualcuno te lo dico e ne scegli un altro.
        </p>

        <div class="passo" style="margin-top:20px"><b>2</b> Batti il codice del computer</div>
        <input id="codice" class="cifre" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="00000000">
        <p class="nota" style="margin-top:6px">
          Sul computer apri <b>DaProdConnessione</b> e premi <b>Invita</b>:
          compare un codice di otto cifre. Vale pochi minuti.
        </p>

        <div class="fila"><button id="collega" class="largo">Entra</button></div>
        <div class="avviso" id="avviso-entra"></div>
      </div>

      <p class="oppure" id="nota-qr">
        Puoi anche inquadrare il QR, se preferisci: il codice basta e avanza.
      </p>
    </div>
  </section>

  <!-- =============================== CASA ================================
    Quello che serve appena si apre: **funziona?** e **cos'ho fatto**.

    Dal telefono, e da utente, i quadrati con «quanti sono collegati» e «quante
    richieste aspettano il sì» non ci sono: sono numeri che riguardano chi
    governa la macchina, non chi la usa. Al loro posto, scorrendo, ci sono le
    ultime cose venute fuori e i tasti per farne un'altra — chiesto così:
    «scorrendo sotto si possono vedere gli ultimi lavori creati con anche dei
    tasti rapidi per interagire con l'app».
  -->
  <section class="pagina" id="pag-casa">
    <!--
      Qualcuno ha scelto questo computer e aspetta un sì.

      Sta **sopra** alla pausa e sopra al semaforo perché è l'unica cosa in
      questa pagina che riguarda una persona che sta aspettando adesso: tutto il
      resto racconta una macchina, e una macchina può aspettare.
    -->
    <div class="pausa bussano" id="fascia-bussate" hidden>
      <span class="segno">&#9993;</span>
      <div class="dentro">
        <b id="bussate-chi">Qualcuno vuole collegarsi</b>
        <small id="bussate-dove"></small>
      </div>
      <button class="mini" id="vedi-bussate">Guarda</button>
    </div>

    <div class="pausa" id="fascia-pausa" hidden>
      <span class="segno">&#9208;</span>
      <div class="dentro">
        <b>Il computer è in pausa</b>
        <small id="pausa-perche">Chi ci sta davanti lo sta usando: i lavori nuovi aspettano.</small>
      </div>
    </div>

    <div class="semaforo" id="semaforo">
      <span class="faccia" id="semaforo-faccia">&#9679;</span>
      <div class="dentro">
        <b id="semaforo-titolo">Guardo com'è messa…</b>
        <div class="perche" id="semaforo-perche"></div>
      </div>
      <button class="mini" id="semaforo-tasto" hidden></button>
    </div>

    <div class="quadrati" id="numeri"></div>

    <h3 id="titolo-tessere">Cosa vuoi fare</h3>
    <div class="tastoni" id="tessere"></div>

    <h3 id="titolo-ultimi">Le ultime cose venute fuori</h3>
    <div class="quadri" id="ultimi"></div>
    <div class="vuoto" id="ultimi-vuoti" hidden>
      Ancora niente. Quello che chiedi finisce qui.
    </div>

    <p class="nota" id="nota-versione"></p>
  </section>

  <!-- ============================ PRODUZIONE =============================
    Era «Chiedi». Adesso è quello che è: il posto dove si produce.

    Da utente si vedono **quattro tasti** — immagini, video, musica, audio — e
    nient'altro: le azioni che leggono la libreria, raccontano lo stato della
    suite o decidono sulla fila sono roba di chi governa, e in un menu del
    telefono vorrebbero dire scegliere fra nove voci per arrivare a due.

    Sotto, la chiacchierata: dieci minuti con un modello che può proporre di
    far fare le cose al computer. Vedi chiacchierata.ts nello shell per il
    perché di ognuno dei suoi vincoli.
  -->
  <section class="pagina" id="pag-produzione">
    <div class="scheda">
      <h2>Produzione</h2>
      <p class="sotto">Lo fa il computer. Tu scegli cosa, e lui lo mette in lavorazione.</p>

      <!--
        ⚠ **Qui c'era «dillo e basta», ed e' durata una versione.**

        Era una casella in cui scrivere una frase e vedere il modulo riempirsi.
        Tolta il 5 settembre 2026, chiesto cosi': «in produzione hai messo una
        nuova chat per llm in alto, toglila, gia' abbiamo la sezione parla con
        un modello».

        Aveva ragione, ed e' una lezione che vale la pena scrivere: erano **due
        caselle nella stessa schermata che fanno la stessa cosa** — dire a
        parole quello che vuoi — e la seconda non aggiungeva niente alla prima
        se non il dubbio su quale usare. Quello che serviva davvero alla
        chiacchierata non era una gemella piu' corta: era **un tasto che fa il
        piano quando dico io**, ed e' quello che c'e' adesso li' sotto.

        Il codice che capisce le frasi non e' stato buttato: «capisci» nel
        gateway e «needle.ts» nello shell ci sono ancora, e li usa la
        chiacchierata.
      -->
      <div class="tastoni" id="elenco-azioni"></div>
      <div class="filtri" id="altre-azioni" style="margin-top:12px"></div>

      <!--
        **Gli stili si gestiscono da qui**, dalla 0.9.1.

        Erano una scheda in fondo, una delle sei. Chiesto il 5 settembre 2026:
        «togli dalla barra sotto la tab stili e mettiamo un bel pulsante
        gestione stili in produci». Ed e' il posto giusto: uno stile lo si
        cerca **mentre si produce**, non come cosa a se'. In fondo restano
        cinque schede, e cinque su un telefono si leggono meglio di sei.
      -->
      <div class="fila" style="margin-top:6px">
        <button class="piano largo" id="apri-stili">&#9776; Gestione stili e prompt</button>
      </div>
      <form id="modulo" hidden onsubmit="return false"></form>
      <div class="fila" id="fila-manda" hidden>
        <button id="manda">Mandalo al computer</button>
        <button class="piano" id="annulla" type="button">Lascia stare</button>
      </div>
      <div class="avviso" id="avviso-azione"></div>
    </div>

    <div class="scheda" id="scheda-chiacchiera">
      <h2>Parla con un modello</h2>
      <p class="sotto" id="sotto-chiacchiera">
        Dieci minuti col modello che gira sul computer. Gli dici cosa vorresti,
        lui prepara un piano, e parte solo se lo accetti tu.
      </p>

      <div id="prima-di-parlare">
        <label for="quale-modello">Con chi vuoi parlare</label>
        <select id="quale-modello"></select>
        <div class="fila">
          <button id="comincia-chiacchiera">Comincia a parlare</button>
        </div>
        <div class="avviso" id="avviso-chiacchiera"></div>
      </div>

      <!--
        Il posto in fila, mentre si aspetta il computer.

        Chiesto il 26 agosto 2026: «se sta generando, aspetto il turno, ti mette
        in coda e ti fa vedere in che posizione sei e volendo puoi anche
        abbandonare la coda». Tre informazioni e un tasto — dove sei, quanti
        siete, cosa sta succedendo, come uscire — e nella 0.7.6 non ce n'era
        nessuna: si restava un minuto con una rotella e poi ci si sentiva dire
        di riprovare.
      -->
      <div id="in-fila-per-parlare" hidden>
        <div class="inFila">
          <div class="numerone" id="posto-in-fila">&#8230;</div>
          <div class="cresce">
            <b>Sei in coda per parlare</b>
            <small id="sotto-la-fila">Il computer sta lavorando.</small>
          </div>
        </div>
        <div class="fila">
          <button class="piano" id="esci-dalla-fila">Lascia perdere, esco dalla coda</button>
        </div>
      </div>

      <div id="mentre-si-parla" hidden>
        <div class="fila" style="margin-top:0">
          <span class="cronometro" id="cronometro-chiacchiera">10:00</span>
          <div class="cresci"></div>
          <button class="mini male" id="chiudi-chiacchiera">Basta così</button>
        </div>
        <div class="discorso" id="discorso"></div>
        <div id="dove-va-il-piano"></div>
        <div class="dettatura">
          <textarea id="cosa-dico" placeholder="Scrivi cosa vorresti…"></textarea>
          <button id="dillo">Invia</button>
        </div>

        <!--
          **Il piano si chiede, non si aspetta.** Nuovo nella 0.9.1.

          Prima, a ogni battuta, il modello doveva fare due cose insieme: capire
          se stavi chiacchierando o chiedendo, e nel secondo caso riempire otto
          campi. Un modello piccolo quella decisione la sbaglia spesso, e quando
          la sbaglia lascia il piano vuoto senza dirlo — «i modelli falliscono a
          creare il piano».

          Con questo tasto la decisione la prendi tu: chiacchieri finché sei
          soddisfatto, poi glielo chiedi, e al modello resta un lavoro solo.
        -->
        <div class="fila">
          <button class="piano largo" id="fai-il-piano">&#9733; Crea il piano</button>
        </div>
      </div>
    </div>
  </section>

  <!-- ============================= RIEPILOGO =============================
    Era «Lavori», ed era un elenco lungo di righe.

    Chiesto il 26 agosto 2026: «la sezione lavori facciamola più compatta
    possibile, più che lavori facciamola diventare la tab che ci fa vedere un
    riepilogo generale tipo dash di stato». Quindi: quattro numeri in cima, poi
    cosa sta girando **adesso**, poi quello che aspetta. Le righe ci sono
    ancora ma sono strette, e i lavori vecchi si vanno a cercare.
  -->
  <section class="pagina" id="pag-riepilogo">
    <div class="scheda">
      <h2>Come siamo messi</h2>
      <p class="sotto" id="sotto-riepilogo">Cosa sta facendo il computer, adesso.</p>
      <div class="strisce" id="strisce"></div>
      <div id="dove-adesso"></div>
    </div>

    <div class="scheda">
      <div class="filtri" id="filtri-lavori"></div>
      <!--
        La riga che dice perche' la fila non si muove: compare **solo** a chi
        non puo' decidere, e solo se ha qualcosa in attesa. Vedi
        «diCosaAspetta» nel copione.
      -->
      <p class="avviso" id="coda-avviso" hidden></p>
      <ul class="voci compatta" id="coda"></ul>
    </div>
  </section>

  <!-- ============================= GALLERIA ==============================
    Due tasti grossi in cima, e sotto i filtri.

    Chiesto così: «due tasti "Le mie Produzioni" e "Pensieri" — i pensieri sono
    i regali, li chiameremo così — e poi si può fare come ora che puoi scegliere
    tutto o immagini o video». La bacheca da qui è sparita: sta in DaProd, che è
    la scheda che parla degli altri.
  -->
  <section class="pagina" id="pag-galleria">
    <div class="tastoni" id="due-tasti"></div>

    <div class="scheda" style="margin-top:12px">
      <p class="sotto" id="sotto-galleria"></p>
      <div class="filtri" id="filtri"></div>
      <div class="quadri" id="quadri"></div>
      <div class="vuoto" id="galleria-vuota" hidden>Ancora niente qui dentro.</div>
    </div>
  </section>

  <!-- =============================== STILI ================================
    La scheda nuova della 0.7.7.

    Chiesto così: «aggiungiamo gli stili su Android, una nuova tab Stili dove
    gestire tutto e anche volendo condividere uno stile per farlo provare agli
    altri». Uno stile è la cosa che uno costruisce una volta e usa per mesi — e
    fino alla 0.7.6 viveva nella memoria del browser di DaProdMusica, cioè era di
    *quel browser*: cambiavi dispositivo e non c'era più.

    Adesso sta sul computer, nella cartella della persona, e si ritrova da
    qualunque parte ci si colleghi.
  -->
  <section class="pagina" id="pag-stili">
    <!--
      Tre tipi, dalla 0.7.8: immagini, video, musica. Chiesto il 26 agosto 2026
      — «gli stili devono essere di tre tipi, così li separiamo e ordiniamo per
      bene» — perché uno stile non è la stessa cosa nei tre posti: per un brano
      sono generi, per una foto un modo di fotografare, per un video un modo di
      riprendere.
    -->
    <div class="filtri" id="tipi-stili"></div>
    <div class="tastoni" id="due-tasti-stili"></div>

    <div class="fila" style="margin-top:12px">
      <button id="stile-nuovo">&#10010; Uno stile nuovo</button>
    </div>

    <p class="sotto" style="margin-top:12px">
      Toccane uno per usarlo. <b>Tienilo premuto</b> per modificarlo, metterlo in
      vetrina o buttarlo.
    </p>

    <div class="stili" id="elenco-stili"></div>
    <div class="vuoto" id="stili-vuoti" hidden></div>
  </section>

  <!-- ============================== DAPROD ===============================
    Era «Persone», e mostrava i quadrati della rete.

    Adesso è il social della suite: quello che le persone hanno deciso di far
    vedere, con la faccia di chi l'ha fatto, il cuore e il tasto per tenerlo.
    Chi è collegato, gli inviti e i quadrati della rete sono nelle impostazioni:
    sono cose che si toccano una volta, non ogni giorno.
  -->
  <section class="pagina" id="pag-daprod">
    <div class="scheda">
      <div class="profilo">
        <span class="faccia-tonda grande" id="mia-faccia"></span>
        <div class="dati">
          <div class="nome" id="profilo-nome">—</div>
          <div class="motto" id="profilo-motto">Nessuna riga sotto al nome.</div>
        </div>
        <button class="mini" id="apri-profilo">Modifica</button>
      </div>
      <div class="fila">
        <button class="mini" id="carica-in-bacheca">&#10514; Carica un contenuto</button>
        <input type="file" id="file-in-bacheca" hidden>
      </div>
      <div class="avviso" id="avviso-bacheca"></div>
    </div>

    <!--
      Gli stili e i prompt che gli altri fanno provare.

      Stanno in cima e fuori dalla bacheca perche' non sono la stessa cosa: la
      bacheca e' quello che le persone hanno **fatto**, questa e' la cassetta
      degli attrezzi con cui l'hanno fatto.
    -->
    <div id="da-provare" hidden></div>

    <div class="filtri" id="filtri-daprod"></div>
    <div id="bacheca"></div>
    <div class="vuoto" id="bacheca-vuota" hidden>
      In bacheca non c'è ancora niente. Mettici qualcosa tu: dalla Galleria,
      su una cosa tua, c'è «mettila in bacheca».
    </div>
  </section>

</main>

<!--
  Sei schede, dalla 0.7.7: gli Stili si sono presi la loro.

  Sei e' il massimo che ci sta in una barra su un telefono da 375 px, e ci sta
  solo perche' le parole sono corte. Se un giorno ne servisse una settima, la
  risposta non e' restringere ancora: e' che due di queste dicono la stessa cosa.
-->
<!--
  La riga che dice cosa sta suonando.

  Sta **sopra** alle schede e non al posto loro: mentre si ascolta si continua
  a girare per l'app, ed e' tutto il punto di avere una fila. Toccarla apre il
  palco; i tre tasti fanno quello che dicono.
-->
<!--
  **Il visualizer, anche dietro alla pagina.** Chiesto il 6 settembre 2026:
  «usiamo le animazioni del visualizer sullo sfondo dell'app in tutte le schede,
  ma molto molto sfocato e trasparente, direi un 22 percento su 100».

  ⚠ **E non e' un ritorno alla 0.9.0.** Li' il visualizer era *solo* lo sfondo,
  e a schermo intero si guardava una lista della spesa con le onde dietro —
  giustamente bocciato. Qui sono due cose diverse con due mestieri diversi: nel
  palco il visualizer **e' il contenuto**, nitido; qui e' **atmosfera**, sfocato
  a venti pixel e al ventidue per cento, sotto a tutto, e nessun evento lo
  raggiunge.

  Vive solo mentre suona qualcosa: a musica ferma sparisce, e con lui il costo.
-->
<!--
  Dove finiscono i messaggini. Vuoto quasi sempre: e' un posto, non una cosa.
-->
<div class="avvisi" id="avvisi" aria-live="polite"></div>

<!--
  **Gli stili scelti per il mix.** Vuoto quasi sempre: compare quando ce n'e'
  almeno uno. Una barra sempre presente che dice «0 scelti» e' rumore.
-->
<div class="mixStili" id="mix-stili" hidden></div>

<canvas id="sfondo-visual" aria-hidden="true"></canvas>

<div class="barraLettore" id="barra-lettore" hidden>
  <button class="faccia" id="lettore-faccia" title="A schermo intero"></button>
  <button class="dentro" id="lettore-apri">
    <b id="lettore-nome"></b>
    <small id="lettore-sotto"></small>
  </button>
  <!--
    ⚠ **Anche questi sono disegnati.** Chiesto il 6 settembre 2026: «il player
    minimizzato ha ancora i vecchi pulsanti».

    Vero, e la dimenticanza si vedeva peggio di prima: nel palco i comandi erano
    diventati segni disegnati, qui erano rimasti i glifi tipografici. Due
    lettori nella stessa app con due alfabeti diversi — e sono lo stesso
    lettore, uno grande e uno piccolo.

    Stessi disegni del palco, piu' piccoli. E niente cerchi: qui i tasti stanno
    su una barra alta cinquantotto pixel, e quattro cerchi con il bordo in fila
    sono quattro macchie. Il play si accende del colore della suite, come di la'.
  -->
  <button class="cmd" id="lettore-prima" title="Precedente">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 5.5v13a1 1 0 0 1-1.55.83L7.5 13.5v5a1 1 0 0 1-2 0v-13a1 1 0 0 1 2 0v5l8.95-5.83A1 1 0 0 1 18 5.5z"/>
    </svg>
  </button>
  <button class="cmd acceso" id="lettore-play" title="Pausa">
    <svg viewBox="0 0 24 24" aria-hidden="true" id="lettore-play-segno">
      <rect x="7" y="5" width="3.6" height="14" rx="1.4"/>
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.4"/>
    </svg>
  </button>
  <button class="cmd" id="lettore-poi" title="Prossimo">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5.5v13a1 1 0 0 0 1.55.83L16.5 13.5v5a1 1 0 0 0 2 0v-13a1 1 0 0 0-2 0v5L7.55 4.67A1 1 0 0 0 6 5.5z"/>
    </svg>
  </button>
  <button class="cmd" id="lettore-chiudi" title="Chiudi">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.4 5a1 1 0 0 0-.7 1.7L11 12l-5.3 5.3a1 1 0 1 0 1.4 1.4L12 13.4l5.3 5.3a1 1 0 0 0 1.4-1.4L13.4 12l5.3-5.3a1 1 0 0 0-1.4-1.4L12 10.6 6.7 5.3a1 1 0 0 0-.3-.3z"/>
    </svg>
  </button>
</div>

<!--
  Il palco: quello che suona, grande quanto lo schermo.

  Non e' la lente con un nome nuovo. La lente apriva **un file** e chiudendola
  finiva tutto; il palco e' una finestra su una fila che va avanti lo stesso —
  si apre, si chiude, e la musica non se ne accorge.

  Si esce trascinando su o giu', che e' il gesto che ogni app di foto ha
  insegnato a tutti. Il tasto con la X c'e' lo stesso, per chi e' col mouse.
-->
<div class="palcoLettore" id="palco" hidden>
  <!--
    ⚠ **Il visualizer sta qui, dentro il palco.** Cambiato il 5 settembre 2026.

    Nella 0.9.0 era lo sfondo della pagina, e la foto che me l'ha fatto notare
    era eloquente: le onde rosse dietro a tutto, e in mezzo un riquadro nero con
    la copertina. «Nella foto vedi il rosso: e' dove vorrei vedere il
    visualizer, non nello sfondo dove lo hai messo».

    Ha ragione, e la ragione e' semplice: a schermo intero **il visualizer e' il
    contenuto**. Un brano non ha niente da mostrare tranne la sua copertina e
    quello che il suono fa vedere; metterlo dietro alla pagina vuol dire
    guardarlo attraverso una lista della spesa.
  -->
  <canvas id="visual"></canvas>

  <!--
    **In alto resta una X.** Chiesto il 6 settembre 2026: «il tasto impostazioni
    e la freccia verso il basso togliamoli».

    Aveva ragione, e per due ragioni diverse. La **freccia in giu'** faceva
    esattamente quello che fa il trascinamento verso il basso, che e' il gesto
    che tutti usano gia': due modi per la stessa cosa, uno dei due e' ingombro.
    L'**ingranaggio** cambiava effetto, e un ingranaggio vuol dire
    «impostazioni» in ogni app del mondo — era il simbolo sbagliato nel posto
    sbagliato. Adesso gli effetti stanno sotto, con il loro menu.
  -->
  <div class="cima">
    <div class="titolo">
      <b id="palco-nome"></b>
      <small id="palco-sotto"></small>
    </div>
    <button class="tondo" id="palco-chiudi" title="Chiudi">&#10005;</button>
  </div>

  <div class="dentro" id="palco-dentro"></div>

  <!--
    **Com'e' stata fatta**, dentro il palco e non in un foglio.

    ⚠ Chiesto il 5 settembre 2026: «il tasto con le tre linee a destra durante
    la riproduzione DaProd non funziona: rendilo il tasto che, se cliccato,
    mostra tutte le info della canzone, e se lo riclicchi scompare».

    Non funzionava per una ragione precisa: apriva un foglio, e un foglio sopra
    al palco — che sta a schermo intero con z-index 80 — finiva sotto. Il tasto
    rispondeva; quello che apriva stava dietro. Qui il pannello e' dentro al
    palco, quindi il problema non si ripresenta.
  -->
  <div class="infoPalco" id="palco-info" hidden></div>

  <!--
    **Il tempo, e ci si sposta dentro.** Chiesto il 5 settembre 2026: «lo swipe
    funziona in galleria, ma non e' possibile andare avanti e indietro nel tempo
    della canzone».

    Una barra vera, non i controlli del browser: quelli, dentro una WebView, si
    disegnano come vuole Android e non stanno in un palco a schermo intero.
  -->
  <div class="tempo" id="palco-tempo">
    <span class="ora" id="palco-ora">0:00</span>
    <input type="range" id="palco-barra" min="0" max="1000" value="0" step="1">
    <span class="ora" id="palco-durata">0:00</span>
  </div>

  <!--
    **I comandi, ridisegnati.** Chiesto il 6 settembre 2026: «i pulsanti del
    play e avanti indietro vanno ridisegnati bene perche' sono bruttissimi».

    Cosa non andava, guardando la foto: erano tre cerchi neri uguali su uno
    sfondo che si muove, con dentro tre glifi di un alfabeto tipografico —
    «⏮ ⏸ ⏭» — che hanno pesi e allineamenti diversi fra loro e che su fondo
    scuro si leggono male. Il tondo del play era acceso di arancione, che non e'
    un colore di questa suite, e gli altri due sparivano.

    Adesso i segni sono **disegnati** (SVG), quindi hanno tutti lo stesso peso e
    lo stesso centro; il play e' piu' grande degli altri due perche' e' quello
    che si preme; e i tre stanno su un vetro solo invece che su tre cerchi
    staccati, cosi' si leggono anche sopra a un visualizer che lampeggia.

    Ai lati, due tasti con lo stesso mestiere: a sinistra gli **effetti**, a
    destra le **info**. Sono simmetrici perche' fanno la stessa cosa —
    aprire un pannello — e stanno lontani dal play perche' non si premono per
    sbaglio mentre si cerca la pausa.
  -->
  <div class="sotto">
    <button class="tondo" id="palco-effetti" title="Effetti">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2"/>
        <circle cx="12" cy="4.4" r="1.9"/>
        <circle cx="12" cy="19.6" r="1.9"/>
        <circle cx="4.4" cy="12" r="1.9"/>
        <circle cx="19.6" cy="12" r="1.9"/>
      </svg>
    </button>

    <div class="cresci"></div>

    <div class="comandi">
      <button id="palco-prima" title="Precedente">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 5.5v13a1 1 0 0 1-1.55.83L7.5 13.5v5a1 1 0 0 1-2 0v-13a1 1 0 0 1 2 0v5l8.95-5.83A1 1 0 0 1 18 5.5z"/>
        </svg>
      </button>
      <button id="palco-play" class="grosso" title="Pausa">
        <svg viewBox="0 0 24 24" aria-hidden="true" id="palco-play-segno">
          <rect x="7" y="5" width="3.6" height="14" rx="1.4"/>
          <rect x="13.4" y="5" width="3.6" height="14" rx="1.4"/>
        </svg>
      </button>
      <button id="palco-poi" title="Prossimo">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5.5v13a1 1 0 0 0 1.55.83L16.5 13.5v5a1 1 0 0 0 2 0v-13a1 1 0 0 0-2 0v5L7.55 4.67A1 1 0 0 0 6 5.5z"/>
        </svg>
      </button>
    </div>

    <div class="cresci"></div>

    <!--
      **«Mostra info», e adesso si chiama cosi'.** Chiesto il 6 settembre 2026:
      «se si clicca il pulsante in basso a destra mostra le info, lo chiamiamo
      "mostra info"». Il nome sta nel titolo e sotto al segno: tre linee da sole
      volevano dire «menu» a chiunque, ed era la ragione per cui il tasto non
      sembrava fare niente.
    -->
    <button class="tondo" id="palco-fila" title="Mostra info">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="6.4" r="1.5"/>
        <rect x="10.7" y="10" width="2.6" height="8.4" rx="1.3"/>
      </svg>
    </button>
  </div>

  <!--
    **Il menu degli effetti.** Chiesto il 6 settembre 2026: «se lo clicchiamo si
    apre un piccolo menu con tutti gli effetti; se ne clicchiamo uno si fissa su
    quell'effetto, se ci riclicco torna deselezionato e torna in cambio
    automatico».

    Quindi non e' un elenco di scelte: e' un elenco con **uno stato acceso**, e
    quello acceso vuol dire «resta qui». Nessuno acceso vuol dire «cambia da
    solo», che e' come parte.
  -->
  <div class="effetti" id="palco-effetti-menu" hidden></div>
</div>

<nav class="fondo" id="fondo" hidden>
  <button data-pagina="casa" class="on"><span class="segno">&#9673;</span>Casa</button>
  <button data-pagina="produzione"><span class="segno">&#10010;</span>Produci</button>
  <button data-pagina="riepilogo"><span class="segno">&#9776;</span>Fila<span class="bollo" id="bollo" hidden></span></button>
  <button data-pagina="galleria"><span class="segno">&#9635;</span>Galleria</button>
  <button data-pagina="daprod"><span class="segno">&#9788;</span>DaProd</button>
</nav>`;
