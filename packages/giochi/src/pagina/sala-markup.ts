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
    <p class="spiega">Ricarichi quando vuoi, incassi quando vuoi. Il <b>Dozer</b> si mangia le
      lire; <b>Claw</b> e <b>Neon</b> si finiscono, e chi finisce vince da 20 a 30 euro piu' i bonus.</p>
    <div class="sala-giochi" id="sala-giochi"></div>
    <!-- 1.4.9: al posto dei quadrati coi numeri, le statistiche che contano. -->
    <div class="sala-stat" id="sala-stat"></div>
    <div class="sala-admin" id="sala-admin" hidden></div>
  </section>

  <!-- La Borsa della Lira sta dentro al Portafoglio dalla 1.4.9: vedi portafoglio-markup.ts. -->

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
      <!-- 1.4.9: «il pulsante di cambia valuta vicino a incassa», anche per il gioco. -->
      <button class="btn piano cornice-valuta" id="cornice-valuta" title="Lire o euro, anche nel gioco">L ⇄ €</button>
      <button class="btn oro" id="cornice-stacca" title="Le lire del gioco tornano nel portafoglio">Incassa</button>
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
        <!-- 1.4.8: i tagli sono in euro, gli stessi per tutti i giochi, e stanno solo qui. -->
        <div class="portafoglio-tagli" id="portafoglio-tagli"></div>
        <input type="range" id="portafoglio-scorri" min="387" max="387" step="50" value="387" aria-label="Quante lire">
        <button class="btn grosso" id="portafoglio-ok">Ricarica</button>
        <!-- 1.4.8: com'e' messa la partita in questo gioco, e l'incasso. -->
        <div class="portafoglio-info" id="portafoglio-info"></div>
        <button class="btn oro" id="portafoglio-incassa" hidden>Incassa</button>
        <p class="portafoglio-nota" id="portafoglio-nota"></p>
      </div>
    </div>
  </div>
`;
