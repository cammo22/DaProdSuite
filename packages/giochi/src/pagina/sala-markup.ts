/**
 * Le due schede nuove della 1.4.0 (CONCETTI.md § 18): la **Sala**, coi giochi
 * d'arcade in una cornice, e la **Borsa**, col grafico della Lira. Piu' la
 * cornice a tutto schermo dove gira un gioco.
 *
 * Stanno in un file loro per non allungare ancora `markup.ts`; la pagina le
 * mette dentro `main` (vedi `index.ts`). Stesse regole: una stringa sola, e
 * niente apici inversi dentro.
 */
export const MARKUP_SALA = `
  <!-- =============================================================== sala -->
  <section class="pagina" id="p-sala">
    <h2>La sala d'arcade</h2>
    <p class="spiega">I giochi DaProd, dentro la suite. Quello che vinci fa punti della
      <b>partita</b>; le cose grosse ti danno <b>carte</b> per la slot. Si entra con un
      gettone, e quando vuoi smettere <b>incassi</b>: i punti diventano lire al cambio
      della Borsa di quel momento.</p>
    <div class="sala-giochi" id="sala-giochi"></div>
    <div class="sala-partita" id="sala-partita"></div>
  </section>

  <!-- ============================================================== borsa -->
  <section class="pagina" id="p-borsa">
    <h2>La Borsa della Lira</h2>
    <div class="borsa-testa" id="borsa-testa"></div>
    <div class="borsa-grafico" id="borsa-grafico"></div>
    <div class="borsa-numeri" id="borsa-numeri"></div>
    <p class="spiega">Quanto vale un punto in lire lo decide la sala, non una persona:
      <b>sale</b> quando si spende (giri, gettoni, pacchetti, shop) e <b>scende</b>
      quando si incassa (incassi, combinazioni prese, regali). Un po' la tira su anche
      la gente che gioca, e c'e' un'onda lenta, uguale per tutti. Incassare adesso o
      aspettare: e' quello il gioco.</p>
    <div class="riga-tasti"><button class="btn oro" id="stacca-borsa">Incassa</button></div>
  </section>

  <!-- ============================================== la cornice di un gioco -->
  <!--
    ⚠ La barra in alto rifatta nella 1.4.4: una riga coi tasti (indietro, nome,
    Ricarica, Stacca) e sotto le tre pastiglie che contano — le lire in tasca,
    i punti della partita e la Lira — che si accendono quando cambiano. Prima
    era una riga di testo verde che andava a capo in tre righe sul telefono.
  -->
  <div class="cornice" id="cornice" hidden>
    <div class="cornice-barra">
      <button class="tasto-tondo" id="cornice-esci" title="Torna alla sala" aria-label="Torna alla sala">&#8592;</button>
      <div class="cornice-nome" id="cornice-nome"></div>
      <button class="btn cyan" id="cornice-ricarica" hidden>Ricarica</button>
      <button class="btn oro" id="cornice-stacca" title="I punti della partita diventano lire, al cambio della Borsa di adesso">Incassa</button>
      <div class="cornice-conto" id="cornice-conto"></div>
    </div>
    <!--
      I tagli al volo (1.4.5): «mettiamo dei pulsanti di ricarica nei giochi
      come nel pannello admin». Un tocco e la ricarica parte, senza foglio; il
      foglio col cursore resta dietro «Altro…» per le cifre precise.
    -->
    <div class="cornice-tagli" id="cornice-tagli" hidden></div>
    <iframe id="cornice-gioco" title="Gioco" allow="autoplay; fullscreen"></iframe>

    <!--
      Il portafoglio (1.4.4): le lire della suite diventano lire del gioco.
      Chiesto il 24 settembre 2026: «si vede bene il portafoglio con la
      quantita' selezionabile e alcuni tagli rapidi».
    -->
    <div class="portafoglio" id="portafoglio" hidden>
      <div class="portafoglio-foglio" role="dialog" aria-labelledby="portafoglio-titolo">
        <div class="portafoglio-testa">
          <b id="portafoglio-titolo">Ricarica</b>
          <button class="tasto-tondo" id="portafoglio-chiudi" aria-label="Chiudi">&#10005;</button>
        </div>
        <div class="portafoglio-saldo"><small>nel portafoglio della suite</small><b id="portafoglio-saldo">L. 0</b></div>
        <div class="portafoglio-quanto">
          <button class="tasto-tondo" id="portafoglio-meno" aria-label="Meno">&#8722;</button>
          <div><b id="portafoglio-quante">L. 0</b><small id="portafoglio-diventa"></small></div>
          <button class="tasto-tondo" id="portafoglio-piu" aria-label="Piu">+</button>
        </div>
        <input type="range" id="portafoglio-scorri" min="100" max="100" step="50" value="100" aria-label="Quante lire">
        <div class="portafoglio-tagli" id="portafoglio-tagli"></div>
        <button class="btn grosso" id="portafoglio-ok">Ricarica</button>
        <p class="portafoglio-nota" id="portafoglio-nota"></p>
      </div>
    </div>
  </div>
`;
