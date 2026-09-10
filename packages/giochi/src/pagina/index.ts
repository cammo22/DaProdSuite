/**
 * La pagina della sala giochi, messa insieme.
 *
 * **Una pagina sola per tre posti**, come la console della suite: la aprono la
 * scheda DaProdGiochi sul computer, il browser di un portatile e l'app del
 * telefono. Non e' pigrizia: e' che tre pagine che fanno la stessa cosa
 * diventano tre pagine che dicono cose diverse, e non c'e' modo di accorgersene
 * finche' qualcuno non se ne lamenta.
 *
 * `radice` e' dove la pagina e' appesa: nella suite sara' `/giochi`, nelle
 * prove e' quello che decide il serverino. La pagina non lo indovina — se lo
 * fa dire, che indovinarlo dal proprio indirizzo funziona finche' qualcuno non
 * la mette dietro a un altro pezzo di percorso.
 */

import { COPIONE } from "./copione";
import { MARKUP } from "./markup";
import { STILE } from "./stile";

/**
 * ⚠ **`sessione` e' la strada per far vedere le immagini.**
 *
 * La pagina si presenta con un token nell'intestazione, e va bene per tutto
 * quello che chiede col JavaScript. Ma un tag «img» non sa mettere
 * un'intestazione: una foto della libreria attaccata a una figurina tornava
 * «401» e restava un riquadro rotto. Visto il 10 settembre 2026, provando il
 * pannello per attaccare le immagini.
 *
 * Chi ospita puo' dire qui a che indirizzo si chiede un biscotto valido per le
 * sole letture: la pagina ce lo chiede appena si apre, e da li' in poi le
 * immagini si caricano da sole. Senza, la pagina funziona lo stesso — solo che
 * le figurine restano scritte.
 */
export function paginaGiochi(radice: string = "/giochi", sessione: string = ""): string {
  const pulita = radice.replace(/\/+$/, "");
  return (
    `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08090d">
<title>DaProdGiochi</title>
<style>
` +
    STILE +
    `
</style>
</head>
<body>
` +
    MARKUP +
    `
<script>
(() => {
  "use strict";
  var RADICE = ` +
    JSON.stringify(pulita) +
    `;
  var SESSIONE = ` +
    JSON.stringify(sessione) +
    `;
` +
    COPIONE +
    `
})();
</script>
</body>
</html>`
  );
}
