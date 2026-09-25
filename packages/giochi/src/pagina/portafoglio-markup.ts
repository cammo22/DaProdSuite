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
  <section class="pagina" id="p-portafoglio">
    <div class="pf-testa" id="pf-testa"></div>
    <div class="pf-grafico" id="pf-grafico"></div>
    <div class="home-titolo"><h2>Dove vanno le lire</h2></div>
    <div class="pf-flussi" id="pf-flussi"></div>
    <div class="home-titolo"><h2>I giochi, come titoli</h2></div>
    <div class="pf-titoli" id="pf-titoli"></div>
    <div class="home-titolo"><h2>Ultimi movimenti</h2></div>
    <div class="pf-movimenti" id="pf-movimenti"></div>
  </section>

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
