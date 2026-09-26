/**
 * La Banca DaProd di chi comanda (1.5.1): tutti i soldi della sala, e i gesti
 * per rimetterli a posto. I conti stanno in `../gestione.ts`; i dati li mette
 * `banca-copione.ts`. Stesse regole degli altri pezzi: una stringa sola,
 * niente apici inversi e niente barre rovesciate.
 */
export const MARKUP_BANCA = `
  <!-- ============================================================ banca -->
  <!--
    «Una banca DaProd dove poter gestire tutta la sala giochi … si possono
    risolvere tutti i problemi della moneta, per risolvere situazioni strane in
    caso di bug.» In cima i numeri che contano; sotto quattro schede: gli
    incassi da controllare, i conti uno per uno, le regole dei soldi e il
    registro di quello che si e' fatto.
  -->
  <section class="pagina" id="p-banca">
    <div class="bk-testa" id="bk-testa"></div>
    <div class="bk-schede" id="bk-schede">
      <button data-bk="controllo" class="scelto">Da controllare</button><button data-bk="conti">Conti</button><button data-bk="regole">Regole</button><button data-bk="registro">Registro</button>
    </div>
    <div id="bk-dentro"></div>
  </section>
`;
