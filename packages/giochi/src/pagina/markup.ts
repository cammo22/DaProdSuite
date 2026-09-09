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
  <div class="chi" id="mio-nome"></div>
  <!-- Il saldo si tocca: passa da lire a euro e torna. Il conto resta in lire. -->
  <button class="saldo" id="saldo" title="Tocca per vedere in euro">L. 0</button>
</header>

<main>

  <!-- =============================================================== slot -->
  <section class="pagina viva" id="p-slot">
    <div class="tavolo" id="tavoli"></div>

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
    <h2>Gia' decise</h2>
    <div id="fila-decise"></div>
  </section>

</main>

<nav>
  <button class="viva" data-va="slot">Slot</button>
  <button data-va="mie">Mie</button>
  <button data-va="album">Album</button>
  <button data-va="casa">Casa</button>
  <button data-va="fila" id="tasto-fila" hidden>Fila<span class="pallino" id="quante-attesa" hidden></span></button>
</nav>
`;
