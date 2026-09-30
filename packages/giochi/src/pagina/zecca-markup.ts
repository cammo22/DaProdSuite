/**
 * La Zecca (1.7.9): i pezzi numerati, i pacchetti, le collezioni. I dati li
 * mette `zecca-copione.ts`; le regole stanno in `../zecca.ts`. Una stringa sola,
 * niente apici inversi e niente barre rovesciate.
 *
 * ⚠ La scheda «Chi comanda» porta la classe `solo-admin`: per chi gioca non si
 * vede (`body:not(.admin)`), e il copione i suoi dati non li chiede nemmeno.
 */
export const MARKUP_ZECCA = `
  <!-- ============================================================ zecca -->
  <section class="pagina" id="p-zecca">
    <div class="zc-testa" id="zc-testa"></div>
    <div class="zc-schede" id="zc-schede">
      <button data-zc="pacchetti" class="scelto">Pacchetti</button><button data-zc="miei">I miei pezzi</button><button data-zc="collezioni">Collezioni</button><button data-zc="proponi">Proponi</button><button data-zc="admin" class="solo-admin">Chi comanda<span class="pallino" id="zc-pallino" hidden></span></button>
    </div>
    <div id="zc-dentro"></div>
    <div class="zc-apertura" id="zc-apertura" hidden></div>
  </section>
`;
