/**
 * L'ossatura della pagina, senza un dato dentro.
 *
 * ⚠ **Dalla 1.4.3 le schede stanno in quattro stanze**, coi tasti in fondo:
 *
 * | stanza | dentro |
 * |---|---|
 * | Home | le schermate dei giochi, il tuo conto, la mano, la Borsa |
 * | Gioca | Sala (i giochi d'arcade), Fortuna, Borsa |
 * | Genera | la slot delle combinazioni, le mie |
 * | Collezione | pacchetti, inventario, shop, classifica |
 * | Admin | la fila e i giocatori (solo chi comanda, dalla 1.4.4) |
 *
 * Qui sotto, com'era prima: le schede sono le stesse, e rispondono alle stesse
 * domande.
 *
 * | scheda | a che domanda risponde |
 * |---|---|
 * | Slot | voglio montare un prompt |
 * | Fortuna | voglio tirare e basta *(la macchinetta delle figurine)* |
 * | Mie | che fine hanno fatto quelle che ho mandato |
 * | Pacchetti | cosa c'e' in giro, e comprarne uno *(era «Album»)* |
 * | Inventario | cosa ho, cosa mi manca, a che punto sono |
 * | Shop | voglio comprarne una precisa |
 * | Casa | chi sta davanti |
 * | Fila | cosa devo controllare *(solo admin)* |
 *
 * ⚠ **Le due slot sono due schede, non due modi della stessa.** Davanti a
 * «Slot» si **monta** una cosa: dodici rulli, si blocca, si manda a
 * controllare. Davanti a «Fortuna» non si monta niente: si punta e si tira, e
 * ogni tanto cade una figurina. Metterle insieme voleva dire una schermata che
 * cambia mestiere a seconda di un interruttore.
 *
 * I dati non stanno qui: li mette il copione. Questa e' la stanza vuota.
 */

export const MARKUP = `<header>
  <div class="marchio">DaProd<span>Giochi</span></div>
  <div class="cresci"></div>
  <!--
    Il livello, con la barra che si riempie. E' quello che si guadagna girando:
    dalla slot escono punti, non lire (CONCETTI.md § 4).
  -->
  <button class="livello" id="livello" title="Esperienza">
    <span class="numero" id="livello-numero">1</span>
    <span class="barra"><span class="dentro" id="livello-barra"></span></span>
  </button>
  <div class="chi" id="mio-nome"></div>
  <!-- Il saldo si tocca: passa da lire a euro e torna. Il conto resta in lire. -->
  <!--
    La partita (1.4.0, CONCETTI.md § 18): i punti fatti da quando si e'
    staccato, e dove sta la Lira. Si tocca e si va alla Borsa.
  -->
  <button class="partita" id="partita" data-va="borsa" title="La partita e la Borsa della Lira">0 pt</button>
  <button class="saldo" id="saldo" title="Tocca per vedere in euro">L. 0</button>
</header>

<main>

  <!--
    I tasti di una stanza (1.4.3): se ne vede una fila sola, quella della
    stanza in cui sei. La Home non ne ha.
  -->
  <div class="sotto" id="sotto">
    <div class="sotto-fila" data-di="gioca">
      <button data-va="sala">Sala</button><button data-va="fortuna">Fortuna</button><button data-va="borsa">Borsa</button>
    </div>
    <div class="sotto-fila" data-di="genera">
      <button data-va="slot">Combinazioni</button><button data-va="mie">Le mie</button>
    </div>
    <div class="sotto-fila" data-di="admin">
      <button data-va="fila" id="tasto-fila" hidden>Fila<span class="pallino" id="quante-attesa" hidden></span></button>
      <button data-va="giocatori">Giocatori</button>
    </div>
    <div class="sotto-fila" data-di="collezione">
      <button data-va="pacchetti">Pacchetti</button><button data-va="inventario">Inventario</button><button data-va="shop">Shop</button><button data-va="casa">Classifica</button>
    </div>
  </div>

  <!-- =============================================================== slot -->
  <section class="pagina" id="p-slot">
    <div class="fila-scelte tavoli" id="tavoli"></div>
    <!--
      Le epoche. Non sono un filtro fra i tanti: cambiano **il colore di tutta
      la sala** e pesano cosa esce dai rulli. Erano cosi' nella prima versione
      di DaProdSlot, ed e' la cosa che la faceva sembrare un posto.
    -->
    <div class="fila-scelte epoche" id="epoche"></div>

    <div class="rulli" id="rulli"></div>

    <!--
      La mano (1.4.0, CONCETTI.md § 18.5): le carte pescate dal PC nei giochi
      d'arcade. Toccata, una carta va sul suo rullo gia' bloccata.
    -->
    <div class="mano" id="mano" hidden></div>

    <!--
      Il piede della slot (1.4.3): il prompt su una riga, i due tastini e la
      leva, tutti insieme in fondo e sempre in vista. Prima la leva stava a meta'
      e il prompt sotto, con un titolo suo: sul telefono la leva finiva sotto
      al pollice solo scorrendo.
    -->
    <div class="slot-piede">
      <div class="prompt-riga">
        <div class="prompt" id="prompt"><span class="vuoto">Tira la leva.</span></div>
        <button class="btn piano mini-tasto" id="copia" title="Copia il prompt">Copia</button>
        <button class="btn piano mini-tasto" id="sblocca" title="Sblocca tutti i rulli">Sblocca</button>
      </div>
      <div class="esito" id="esito"></div>
      <div class="leva">
        <button class="btn grosso" id="gira">Gira</button>
        <button class="btn oro" id="manda" disabled>Manda a controllare</button>
      </div>
    </div>
  </section>

  <!-- ========================================================= macchinetta -->
  <!--
    ⚠ **La seconda slot: tre file da tre.**

    Chiesta il 12 settembre 2026 con due file, e la terza l'11: «aggiungiamo
    un'altra riga, sempre stesso funzionamento». Sui rulli ci vanno **le
    immagini dei pacchetti**, e basta quelle: una fila completa paga poco, tutto
    lo schermo uguale paga il colpo grosso e la figurina diventa tua.

    Si accende col primo pacchetto chiuso. Finche' non ce n'e' nessuno, qui c'e'
    scritto perche' e' spenta — non un rullo grigio che non fa niente.
  -->
  <section class="pagina" id="p-fortuna">
    <div class="macchina" id="macchina">
      <!-- L'insegna del cabinato (1.4.3): lampadine e neon, come in sala. -->
      <div class="insegna" aria-hidden="true"><span class="lampadine"></span><b>FORTUNA</b><span class="lampadine"></span></div>
      <div class="tiri" id="macchina-tiri"></div>
      <div class="vetrina-macchina" id="macchina-rulli"></div>
      <div class="esito" id="macchina-esito"></div>
      <div class="puntate" id="puntate"></div>
      <div class="leva">
        <button class="btn grosso" id="tira">Tira</button>
      </div>
      <div class="conto" id="macchina-conto"></div>
    </div>
    <div class="niente" id="macchina-spenta" hidden></div>
    <details class="cassetto" id="cassetto-premi">
      <summary>Quanto paga</summary>
      <div id="macchina-premi"></div>
    </details>
  </section>

  <!-- ================================================================ mie -->
  <section class="pagina" id="p-mie">
    <!--
      ⚠ **Il conto della persona, in cima e in tre numeri.** Chiesto il 10
      settembre 2026: «un counter con il totale dell'utente: il guadagno, e
      quanti prompt sono stati accettati e quanti sono stati perdenti».

      Sono i tre numeri che dicono come sta andando a chi gioca, e prima non
      c'erano da nessuna parte: la classifica dice come stai **rispetto agli
      altri**, questo dice come stai. Il guadagno e' quello vero — le lire che
      sono arrivate perche' a chi comanda e' piaciuto qualcosa.
    -->
    <div class="conta-mie" id="conta-mie"></div>

    <!--
      ⚠ **Due cassetti, e sono chiusi.** Chiesto il 10 settembre 2026: «anche
      qui 2 tab collassabili».

      La pagina «Mie» prima era un rotolo: le mandate una sotto l'altra, poi il
      cassetto dei perdenti, poi tutta la collezione. Con venti figurine
      diventava lunga da scorrere per arrivare in fondo, e la prima cosa che si
      apre questa pagina per sapere e' **come e' andata** — non per rileggere
      tutto quello che si e' mandato.
    -->
    <!--
      ⚠ **E adesso lo sono davvero.** Il commento qui sopra lo diceva gia', e
      il cassetto partiva aperto lo stesso. L'11 settembre 2026: «in Mie
      facciamo di default le schede collassate chiuse». Chi apre la pagina vede
      i tre numeri, e sotto i cassetti con quante cose ci sono dentro.
    -->
    <details class="cassetto" id="cassetto-mandate">
      <summary>Quelle che hai mandato <span class="quanti" id="quante-mandate"></span></summary>
      <div id="mie-mandate"></div>
    </details>

    <!--
      ⚠ I biglietti perdenti stanno in un cassetto chiuso.

      Chiesto il 10 settembre 2026: «i prompt buttati devono essere messi in una
      categoria a parte e scomparire, e l'utente lo vede come perdente». Prima
      stavano in fila con le altre: aprire la propria pagina voleva dire leggere
      per primi i propri no. Il perche' c'e' e si legge — aprendo il cassetto.
    -->
    <details class="cassetto" id="cassetto-perdenti" hidden>
      <summary>I biglietti perdenti <span class="quanti" id="quanti-perdenti"></span></summary>
      <div id="mie-perdenti"></div>
    </details>

    <!--
      ⚠ **La collezione non sta piu' qui: sta nell'Inventario**, dall'11
      settembre 2026. Qui c'e' quello che hai **mandato** tu; quello che hai
      **preso** — inventandolo, comprandolo, tirando — sta in una scheda sua,
      con i buchi di quello che manca. Un posto solo, non due.
    -->
  </section>

  <!-- ========================================================== pacchetti -->
  <!--
    ⚠ **Era «Album», e dall'11 settembre 2026 si chiama «Pacchetti».** Parole
    sue: «cambiamo album in Pacchetti, e mettiamo anche li' un menu a tendina per
    nascondere gli elementi a schermo; se clicco su un pack mi mostra il
    pacchetto».

    Tre cose, dall'alto: le bustine, una per pacchetto, con quante ne hai; il
    pacchetto aperto, quando se ne tocca una; e in fondo la tendina con quello
    che non sta ancora in nessun pacchetto — e' li' che chi comanda lo chiude.
    Prima c'era tutto sullo schermo insieme, coperto, una figurina sotto
    l'altra.
  -->
  <section class="pagina" id="p-pacchetti">
    <h2>I pacchetti</h2>
    <div id="pacchetti-stato"></div>
    <div class="pacchi" id="pacchetti-elenco"></div>
    <div id="pacchetto-aperto" hidden></div>
    <details class="cassetto" id="cassetto-fuori">
      <summary>Non ancora in un pacchetto <span class="quanti" id="quante-fuori"></span></summary>
      <div>
        <!--
          ⚠ **Chiudere un pacchetto lo fa chi comanda, quando vuole.** Chiesto il
          12 settembre 2026: «facciamo che un admin puo' creare un pacchetto
          quando vuole anche con meno di 100 creazioni». Sta qui dentro perche'
          quello che ci finisce e' esattamente quello che c'e' in questa tendina.
        -->
        <div class="riga-tasti" id="riga-crea" hidden>
          <button class="btn oro" id="crea-pacchetto"></button>
        </div>
        <div id="pacchetti-fuori"></div>
      </div>
    </details>
  </section>

  <!-- ========================================================== inventario -->
  <!--
    ⚠ **L'inventario: quello che c'e' da avere, con i buchi.** Deciso l'11
    settembre 2026: «manca un inventario dove vedere tutti i collezionabili
    nascosti, e quando si sbloccano compaiono... molto importante l'inventario
    per ogni utente e i progressi, voglio una bella page dedicata».

    In cima quanto ne hai, in percentuale. Sotto i gradi, gli obiettivi, e un
    pacchetto per riga con le sue caselle: quelle piene si guardano, quelle
    vuote dicono il numero e il grado e basta. Qui sta anche «la tua
    collezione», che prima stava in fondo a Mie.
  -->
  <section class="pagina" id="p-inventario">
    <div class="inv-testa" id="inv-testa"></div>
    <div class="inv-gradi" id="inv-gradi"></div>
    <details class="cassetto" id="cassetto-obiettivi">
      <summary>Obiettivi <span class="quanti" id="quanti-obiettivi"></span></summary>
      <div id="inv-obiettivi"></div>
    </details>
    <div id="inv-pacchetti"></div>
  </section>

  <!-- =============================================================== shop -->
  <section class="pagina" id="p-shop">
    <div class="vetrina-testa">
      <h2>Lo shop</h2>
      <div class="fila-scelte" id="shop-tipi"></div>
    </div>
    <!--
      ⚠ **Due banchi: la vetrina e i pacchetti.** Dall'11 settembre 2026 si
      compra anche dentro ai pacchetti chiusi, figurina per figurina, e si paga
      caro: «tipo quelle macchinette col braccio robotico, dove non si vince
      quasi mai». Il pacchetto e' la fortuna che costa poco; qui e' la certezza,
      e costa almeno quanto dieci pacchetti.
    -->
    <p class="spiegone">
      Qui si compra senza fortuna di mezzo: scegli, paghi e ce l'hai. Costa caro
      apposta — con quello che costa una figurina scelta compri dieci pacchetti,
      e dentro magari c'e'.
    </p>
    <div id="shop-roba"></div>
  </section>

  <!-- ================================================================ casa -->
  <section class="pagina" id="p-casa">
    <h2>Chi sta davanti</h2>
    <!--
      ⚠ **Quattro colonne: il «Colpo» se n'e' andato.** Chiesto l'11 settembre
      2026: «togliamo la statistica colpo». Sotto quel titolo, fra l'altro, c'era
      il grado migliore uscito: due nomi per un numero solo. Il dato resta nel
      conto di ognuno; qui non si guarda piu'.
    -->
    <table>
      <thead>
        <tr><th>Chi</th><th>Prese</th><th>Figurine</th><th>In tasca</th></tr>
      </thead>
      <tbody id="classifica"></tbody>
    </table>
  </section>

  <!-- ================================================================ fila -->
  <section class="pagina" id="p-fila">
    <h2>Da controllare</h2>
    <div id="fila-attesa"></div>
    <details class="cassetto" id="cassetto-prese" hidden>
      <summary>Quelle prese <span class="quanti" id="quante-prese"></span></summary>
      <div id="fila-decise"></div>
    </details>
    <details class="cassetto" id="cassetto-buttate" hidden>
      <summary>Buttate <span class="quanti" id="quanti-buttate"></span></summary>
      <div id="fila-buttate"></div>
    </details>

    <!--
      ⚠ **Mandare lire a qualcuno.** Chiesto il 10 settembre 2026: «l'admin
      deve poter inviare lire agli utenti... pulsanti da 2 a 500, oppure
      personalizzato».

      E' l'unico rubinetto oltre alle combinazioni prese: girando escono punti,
      non lire. Sta qui e non nella classifica perche' e' una cosa che fa chi
      decide, e le cose che fa chi decide stanno tutte nella stessa scheda.

      ⚠ **Da qui si azzera anche un portafoglio**, dall'11 settembre 2026:
      «un admin puo' anche azzerare il portafoglio degli altri, caso mai
      problemi». Sta nella stessa riga di ogni persona e non in un pannello suo,
      perche' e' la stessa decisione girata al contrario e si prende guardando lo
      stesso numero: quanto ha in tasca. Il cassetto continua a chiamarsi «Manda
      lire» perche' quello e' il gesto di ogni giorno; azzerare e' quello di mai.
    -->
    <!--
      ⚠ **Anche questo e' un cassetto**, chiesto il 10 settembre 2026:
      «mettiamo il cerca persone e utenti anche quello collassabile come gli
      altri».

      Il motivo e' lo stesso delle prese e delle buttate: ogni persona si porta
      dietro otto tasti e una casella, e a dieci persone questa parte e' lunga
      tre schermate **sotto** a quello per cui si e' aperta la scheda, cioe' le
      combinazioni da controllare. Mandare lire e' una cosa che si fa ogni
      tanto; controllare la fila e' quella che si fa sempre.
    -->
  </section>

  <!-- ========================================================== giocatori -->
  <!--
    ⚠ La gente ha una pagina sua dalla 1.4.4 (era il cassetto «Manda lire» in
    fondo alla fila): chi comanda deve poter gestire i giocatori senza cercarli.
  -->
  <section class="pagina" id="p-giocatori">
    <div class="giocatori-testa"><h2>I giocatori <span class="quanti" id="quanta-gente"></span></h2></div>
    <input class="cerca" id="cerca-gente" type="search" placeholder="cerca una persona">
    <div id="gente"></div>
  </section>

</main>

<!--
  ⚠ **La galleria della suite, per attaccare una cosa a una figurina.**

  Chiesto il 10 settembre 2026: «lincare facilmente, non come ora, l'immagine
  dalla suite». Prima si scriveva a mano l'indirizzo del file in una casella.
  Qui si guarda e si tocca.

  Sta fuori da <main> perche' copre tutto: e' un pannello, non una pagina.
-->
<div class="foglio" id="libreria" hidden>
  <div class="foglio-testa">
    <b>Attacca una cosa della suite</b>
    <button class="btn piano" id="libreria-chiudi">Chiudi</button>
  </div>
  <!--
    ⚠ **Divisa per che cosa sono.** Chiesto il 12 settembre 2026: «ancora non
    sono divise bene quando voglio aggiungere dalla suite».

    Erano sessanta quadratini in tre colonne, in ordine di data, foto e brani e
    video mescolati: per trovare la canzone appena generata bisognava
    riconoscerne la copertina in mezzo a quaranta immagini. Adesso si sceglie
    prima **che cosa** si sta cercando, e dentro si scorre poco.
  -->
  <div class="fila-scelte" id="libreria-tipi"></div>
  <input class="cerca" id="libreria-cerca" type="search" placeholder="cerca per nome">
  <div class="griglia-libreria" id="libreria-roba"></div>
</div>

<!--
  ⚠ **Otto tasti, e la barra scorre.** Con l'Inventario, dall'11 settembre
  2026, le schede sono sette per chi gioca e otto per chi comanda: su un
  telefono stretto non ci stanno tutte, e schiacciarle vorrebbe dire scritte da
  otto pixel. Se non ci stanno, la barra scorre di lato; se ci stanno, si
  allargano come prima.
-->
<!--
  ⚠ **Quattro tasti, non dieci** (1.4.3). Chiesto il 24 settembre 2026: «mettiamo
  una home con gli screen dei vari giochi, una parte gioco e una genera
  dedicate, cosi' da creare meno casino». Erano dieci linguette in fila che
  scorrevano di lato: chi apriva la sala non sapeva da dove cominciare. Adesso
  ci sono quattro stanze, e dentro ognuna i suoi tasti in alto (vedi «.sotto»).
  La classe «tabs» tiene lontano il vestito della console, che le pillole le
  disegna per un altro mestiere.
-->
<nav class="tabs giu" id="giu">
  <button class="viva" data-va="home" data-gruppo="home">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h5v-6h3v6h5V10"/></svg>Home</button>
  <button data-va="sala" data-gruppo="gioca">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="16" cy="11.2" r="1.1"/><circle cx="18" cy="13.8" r="1.1"/></svg>Gioca</button>
  <button data-va="slot" data-gruppo="genera">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l1.9 5.2 5.3.2-4.2 3.3 1.5 5.2L12 14.4l-4.5 3 1.5-5.2-4.2-3.3 5.3-.2z"/></svg>Genera</button>
  <button data-va="pacchetti" data-gruppo="collezione">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="12" height="16" rx="2"/><path d="M8 20.5h10.5a2 2 0 0 0 2-2V7"/></svg>Collezione</button>
  <!-- Solo per chi comanda (1.4.4): la fila e i giocatori, in una stanza sua. -->
  <button data-va="fila" data-gruppo="admin" id="tasto-admin" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/></svg>Admin<span class="pallino" id="pallino-admin" hidden></span></button>
</nav>
`;
