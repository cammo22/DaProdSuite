/**
 * Il Portafoglio di chi gioca e le Casse DaProd di chi comanda (1.4.8).
 *
 * Chiesto da Cammo il 25 settembre 2026: «facciamo un portafoglio anche per i
 * player per capire bene i loro andamenti, prendiamo esempio dalla repo
 * DaProdFinanza, e poi gli admin possono anche gestire le casse della DaProd
 * in maniera molto gamificata». I conti stanno in `../portafoglio.ts` e in
 * `../banca.ts`; i dati li mette `portafoglio-copione.ts`. Stesse regole degli
 * altri pezzi: una stringa sola, niente apici inversi e niente barre rovesciate.
 */
export const MARKUP_PORTAFOGLIO = `
  <!-- ======================================================== portafoglio -->
  <!--
    1.4.9: il Portafoglio e la Borsa diventano una cosa sola. «Continuo a non
    capire il sistema della borsa e portafoglio … la borsa dovrebbe sembrare un
    vero portafoglio crypto bancario, con selettore 24h, 7g, 1 mese». In cima la
    carta col saldo (si tocca e cambia valuta), sotto la linea del periodo,
    poi le posizioni nei giochi, dove sono andate le lire e i movimenti.
  -->
  <section class="pagina" id="p-portafoglio">
    <div class="wl-carta" id="wl-carta"></div>
    <div class="wl-periodi" id="wl-periodi">
      <button data-periodo="24h">24h</button><button data-periodo="7g" class="scelto">7g</button><button data-periodo="1m">1 mese</button><button data-periodo="tutto">Tutto</button>
    </div>
    <div class="wl-grafico" id="wl-grafico"></div>
    <div class="wl-riassunto" id="wl-riassunto"></div>
    <div class="home-titolo"><h2>Le tue posizioni</h2></div>
    <div class="wl-posizioni" id="wl-posizioni"></div>
    <div class="home-titolo"><h2>Entrate e uscite</h2></div>
    <div class="wl-flussi" id="wl-flussi"></div>
    <div class="home-titolo"><h2>Movimenti</h2></div>
    <div class="wl-movimenti" id="wl-movimenti"></div>
    <!-- La Borsa della Lira resta per chi ha punti da incassare (Fortuna). -->
    <div id="wl-borsa" hidden>
      <div class="home-titolo"><h2>La Lira DaProd</h2></div>
      <div class="borsa-testa" id="borsa-testa"></div>
      <div class="borsa-grafico" id="borsa-grafico"></div>
      <div class="riga-tasti"><button class="btn oro" id="stacca-borsa">Incassa</button></div>
    </div>
  </section>

  <!--
    Il resoconto (1.4.9) al posto del pannello «Ti hanno mandato … dalla
    cassa»: «mostriamo sempre un resoconto rispetto all'ultima volta che si e'
    aperta la sala giochi».
  -->
  <div class="resoconto" id="resoconto" hidden>
    <div class="resoconto-foglio" role="dialog" aria-labelledby="resoconto-titolo">
      <div id="resoconto-dentro"></div>
      <button class="btn grosso" id="resoconto-ok">Andiamo</button>
    </div>
  </div>

  <!-- ============================================================= casse -->
  <section class="pagina" id="p-casse">
    <div class="cs-grado" id="cs-grado"></div>
    <div class="cs-numeri" id="cs-numeri"></div>
    <div class="home-titolo"><h2>I forzieri dei premi</h2></div>
    <p class="spiega">Ogni lira spesa nella sala finisce qui e torna alla gente coi premi.
      Dalla riserva puoi alzare un forziere: il premio di stasera lo decidi tu.</p>
    <div class="cs-forzieri" id="cs-forzieri"></div>
    <div class="riga-tasti"><button class="btn oro" id="cs-versa">Versa nella riserva</button></div>
    <div class="home-titolo"><h2>Gli ultimi premi</h2></div>
    <div class="pf-movimenti" id="cs-premi"></div>
  </section>
`;
