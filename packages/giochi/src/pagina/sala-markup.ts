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
      gettone, e quando vuoi smettere <b>stacchi</b>.</p>
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
      quando si incassa (stacchi, combinazioni prese, regali). Un po' la tira su anche
      la gente che gioca, e c'e' un'onda lenta, uguale per tutti. Staccare adesso o
      aspettare: e' quello il gioco.</p>
    <div class="riga-tasti"><button class="btn oro" id="stacca-borsa">Stacca</button></div>
  </section>

  <!-- ============================================== la cornice di un gioco -->
  <div class="cornice" id="cornice" hidden>
    <div class="cornice-barra">
      <button class="btn piano" id="cornice-esci">&#8592; Sala</button>
      <div class="cornice-nome" id="cornice-nome"></div>
      <div class="cornice-conto" id="cornice-conto"></div>
      <button class="btn piano" id="cornice-ricarica" hidden>Ricarica</button>
      <button class="btn oro" id="cornice-stacca">Stacca</button>
    </div>
    <iframe id="cornice-gioco" title="Gioco" allow="autoplay; fullscreen"></iframe>
  </div>
`;
