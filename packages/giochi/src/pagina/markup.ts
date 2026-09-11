/**
 * L'ossatura della pagina, senza un dato dentro.
 *
 * Sei schede in fondo, e la settima si vede solo a chi decide:
 *
 * | scheda | a che domanda risponde |
 * |---|---|
 * | Slot | voglio montare un prompt |
 * | Fortuna | voglio tirare e basta *(la macchinetta delle figurine)* |
 * | Mie | che fine hanno fatto le mie |
 * | Album | cosa c'e' da collezionare, e cosa mi manca |
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
  <button class="saldo" id="saldo" title="Tocca per vedere in euro">L. 0</button>
</header>

<main>

  <!-- =============================================================== slot -->
  <section class="pagina viva" id="p-slot">
    <div class="fila-scelte" id="tavoli"></div>
    <!--
      Le epoche. Non sono un filtro fra i tanti: cambiano **il colore di tutta
      la sala** e pesano cosa esce dai rulli. Erano cosi' nella prima versione
      di DaProdSlot, ed e' la cosa che la faceva sembrare un posto.
    -->
    <div class="fila-scelte epoche" id="epoche"></div>

    <div class="rulli" id="rulli"></div>

    <div class="esito" id="esito"></div>

    <div class="leva">
      <button class="btn grosso" id="gira">Gira</button>
      <button class="btn oro" id="manda" disabled>Manda a controllare</button>
    </div>

    <h2>Il prompt che stai montando</h2>
    <div class="prompt" id="prompt"><span class="vuoto">Tira la leva.</span></div>
    <div class="riga-tasti">
      <button class="btn piano" id="copia">Copia</button>
      <button class="btn piano" id="sblocca">Sblocca tutti</button>
    </div>
  </section>

  <!-- ========================================================= macchinetta -->
  <!--
    ⚠ **La seconda slot: sei rulli, due file da tre.**

    Chiesta il 12 settembre 2026: «aggiungiamo la slot dove ci saranno 6 rulli,
    3 per fila, che funziona come una slot classica». Sui rulli ci vanno **le
    immagini dei pacchetti**, e basta quelle: tre in fila pagano poco, sei
    uguali pagano il colpo grosso e la figurina diventa tua.

    Si accende col primo pacchetto chiuso. Finche' non ce n'e' nessuno, qui c'e'
    scritto perche' e' spenta — non un rullo grigio che non fa niente.
  -->
  <section class="pagina" id="p-fortuna">
    <div class="macchina" id="macchina">
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
    <details class="cassetto" id="cassetto-mandate" open>
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

    <details class="cassetto" id="cassetto-collezione" open>
      <summary>La tua collezione <span class="quanti" id="quante-collezione"></span></summary>
      <div id="mie-collezione"></div>
    </details>
  </section>

  <!-- ============================================================== album -->
  <section class="pagina" id="p-album">
    <h2>L'album</h2>
    <div id="album-stato"></div>
    <!--
      Quale pacchetto si sta guardando. Da quando li chiude una persona quando
      vuole, «serie 3» non e' piu' «dalla 201 alla 300»: ognuno ha un nome e
      quante ce ne stanno dentro, e si sceglie col dito.
    -->
    <div class="fila-scelte" id="album-pacchetti"></div>
    <div class="riga-tasti">
      <button class="btn oro" id="compra">Compra un pacchetto</button>
      <!--
        ⚠ **Chiudere un pacchetto lo fa chi comanda, quando vuole.** Chiesto il
        12 settembre 2026: «facciamo che un admin puo' creare un pacchetto
        quando vuole anche con meno di 100 creazioni». Il tasto lo vede solo
        l'admin, e dice sempre quante cose ci finirebbero dentro.
      -->
      <button class="btn piano" id="crea-pacchetto" hidden></button>
    </div>
    <div id="album-figurine"></div>
  </section>

  <!-- =============================================================== shop -->
  <section class="pagina" id="p-shop">
    <div class="vetrina-testa">
      <h2>Lo shop</h2>
      <div class="fila-scelte" id="shop-tipi"></div>
    </div>
    <p class="spiegone">
      Qui si compra senza fortuna di mezzo: paghi e ce l'hai. Costa caro apposta —
      la stessa roba cade anche dai pacchetti, se sei fortunato.
    </p>
    <div class="prodotti" id="shop-roba"></div>
  </section>

  <!-- ================================================================ casa -->
  <section class="pagina" id="p-casa">
    <h2>Chi sta davanti</h2>
    <table>
      <thead>
        <tr><th>Chi</th><th>Prese</th><th>Album</th><th>Colpo</th><th>In tasca</th></tr>
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
    <details class="cassetto" id="cassetto-gente">
      <summary>Manda lire <span class="quanti" id="quanta-gente"></span></summary>
      <input class="cerca" id="cerca-gente" type="search" placeholder="cerca una persona">
      <div id="gente"></div>
    </details>
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

<nav>
  <button class="viva" data-va="slot">Slot</button>
  <button data-va="fortuna">Fortuna</button>
  <button data-va="mie">Mie</button>
  <button data-va="album">Album</button>
  <button data-va="shop">Shop</button>
  <button data-va="casa">Casa</button>
  <button data-va="fila" id="tasto-fila" hidden>Fila<span class="pallino" id="quante-attesa" hidden></span></button>
</nav>
`;
