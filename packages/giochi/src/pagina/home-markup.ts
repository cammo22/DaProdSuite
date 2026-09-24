/**
 * La Home della sala giochi (1.4.3).
 *
 * Chiesta il 24 settembre 2026: «mettiamo una home con gli screen dei vari
 * giochi, una parte gioco e una genera dedicate, cosi' da creare meno casino
 * generale». Prima si entrava dritti nella slot delle combinazioni, con dieci
 * linguette in fondo: la prima cosa che uno vedeva era la schermata piu'
 * complicata di tutte.
 *
 * Adesso si entra qui: chi sei e quanto hai, due porte grandi (Gioca e
 * Genera), i giochi con la loro faccia, la mano e la Borsa. I dati li mette
 * `home-copione.ts`. Stesse regole degli altri: una stringa sola, e niente
 * apici inversi dentro.
 */
export const MARKUP_HOME = `
  <!-- =============================================================== home -->
  <section class="pagina viva" id="p-home">
    <div class="home-ciao" id="home-ciao"></div>

    <div class="home-porte">
      <button class="home-porta porta-gioca" data-va="sala">
        <span class="porta-foto">
          <img src="" data-sala-img="dozer" alt="">
          <img src="" data-sala-img="claw" alt="">
          <img src="" data-sala-img="neon" alt="">
        </span>
        <span class="porta-testo">
          <b>Gioca</b>
          <small>Fortuna, Coin Dozer, Claw Machine, Neon Partenope. Fai punti e staccali in lire.</small>
        </span>
        <span class="porta-freccia" aria-hidden="true">&#8594;</span>
      </button>
      <button class="home-porta porta-genera" data-va="slot">
        <span class="porta-rulli" aria-hidden="true">
          <i style="--g:#5cc8ff">genere</i><i style="--g:#b07cff">voce</i><i style="--g:#ffd166">andatura</i>
          <i style="--g:#ff6fb5">atmosfera</i><i style="--g:#7fd1a8">strumento</i><i style="--g:#6ee7f0">la firma</i>
        </span>
        <span class="porta-testo">
          <b>Genera</b>
          <small>Gira i rulli, blocca i pezzi buoni e manda la combinazione: se la prendono, diventa una figurina.</small>
        </span>
        <span class="porta-freccia" aria-hidden="true">&#8594;</span>
      </button>
    </div>

    <div class="home-titolo"><h2>I giochi</h2><button class="link" data-va="sala">tutti &#8594;</button></div>
    <div class="home-giochi" id="home-giochi"></div>

    <div class="home-mano" id="home-mano" hidden></div>

    <div class="home-titolo"><h2>La Borsa della Lira</h2><button class="link" data-va="borsa">apri &#8594;</button></div>
    <div class="home-borsa" id="home-borsa"></div>
  </section>
`;
