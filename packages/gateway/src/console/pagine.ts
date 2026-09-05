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
  <div class="marchio">DaProd<span>Suite</span></div>
  <div class="cresci"></div>
  <button class="chi" id="chi" hidden>
    <span class="faccina" id="mia-faccina"></span>
    <span class="nome" id="mio-nome"></span>
  </button>
  <button class="tondo" id="apri-impostazioni" title="Impostazioni" hidden>&#9881;</button>
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
        <button class="mini" id="carica-in-bacheca">&#10514; Metti una cosa tua</button>
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
<div class="barraLettore" id="barra-lettore" hidden>
  <button class="faccia" id="lettore-faccia" title="A schermo intero"></button>
  <button class="dentro" id="lettore-apri">
    <b id="lettore-nome"></b>
    <small id="lettore-sotto"></small>
  </button>
  <button class="tondo" id="lettore-prima" title="Precedente">&#9198;</button>
  <button class="tondo" id="lettore-play" title="Pausa">&#9208;</button>
  <button class="tondo" id="lettore-poi" title="Prossimo">&#9197;</button>
  <button class="tondo" id="lettore-chiudi" title="Chiudi">&#10005;</button>
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

  <div class="cima">
    <div class="titolo">
      <b id="palco-nome"></b>
      <small id="palco-sotto"></small>
    </div>
    <button class="tondo" id="palco-cambia" title="Cambia effetto">&#9881;</button>
    <button class="tondo" id="palco-giu" title="Abbassa e continua">&#8595;</button>
    <button class="tondo" id="palco-chiudi" title="Chiudi">&#10005;</button>
  </div>

  <div class="dentro" id="palco-dentro"></div>

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

  <div class="sotto">
    <button class="tondo" id="palco-effetto" title="Cambia effetto"></button>
    <div class="cresci"></div>
    <button class="tondo" id="palco-prima" title="Precedente">&#9198;</button>
    <button class="tondo grosso" id="palco-play" title="Pausa">&#9208;</button>
    <button class="tondo" id="palco-poi" title="Prossimo">&#9197;</button>
    <div class="cresci"></div>
    <button class="tondo" id="palco-fila" title="La fila">&#9776;</button>
  </div>
</div>

<nav class="fondo" id="fondo" hidden>
  <button data-pagina="casa" class="on"><span class="segno">&#9673;</span>Casa</button>
  <button data-pagina="produzione"><span class="segno">&#10010;</span>Produci</button>
  <button data-pagina="riepilogo"><span class="segno">&#9776;</span>Fila<span class="bollo" id="bollo" hidden></span></button>
  <button data-pagina="galleria"><span class="segno">&#9635;</span>Galleria</button>
  <button data-pagina="daprod"><span class="segno">&#9788;</span>DaProd</button>
</nav>`;
