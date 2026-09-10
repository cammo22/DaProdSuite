/**
 * L'ossatura della pagina, senza un dato dentro.
 *
 * Cinque schede in fondo, e l'ultima si vede solo a chi decide:
 *
 * | scheda | a che domanda risponde |
 * |---|---|
 * | Slot | voglio giocare |
 * | Mie | che fine hanno fatto le mie |
 * | Album | cosa c'e' da collezionare, e cosa mi manca |
 * | Casa | chi sta davanti |
 * | Fila | cosa devo controllare *(solo admin)* |
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

  <!-- ================================================================ mie -->
  <section class="pagina" id="p-mie">
    <h2>Quelle che hai mandato</h2>
    <div id="mie-mandate"></div>
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
    <h2>La tua collezione</h2>
    <div id="mie-collezione"></div>
  </section>

  <!-- ============================================================== album -->
  <section class="pagina" id="p-album">
    <h2>L'album</h2>
    <div id="album-stato"></div>
    <div class="riga-tasti">
      <button class="btn oro" id="compra">Compra un pacchetto</button>
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
    -->
    <h2>Manda lire</h2>
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
  <div class="griglia-libreria" id="libreria-roba"></div>
</div>

<nav>
  <button class="viva" data-va="slot">Slot</button>
  <button data-va="mie">Mie</button>
  <button data-va="album">Album</button>
  <button data-va="shop">Shop</button>
  <button data-va="casa">Casa</button>
  <button data-va="fila" id="tasto-fila" hidden>Fila<span class="pallino" id="quante-attesa" hidden></span></button>
</nav>
`;
