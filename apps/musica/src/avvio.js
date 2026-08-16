/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta poco — ogni modulo si collega ai propri bottoni e non tocca
 * quelli degli altri — tranne per due cose: la libreria va letta prima di
 * disegnare la sessione (che mostra i brani recenti) e il motore va contattato
 * per ultimo, perché è l'unica cosa che può non esserci.
 */

import { el, mostraScheda, suApertura } from "./dom.js";
import { collegaLettore } from "./lettore.js";
import { collegaComandiCoda, messaggioDalMotore, riallinea } from "./coda.js";
import { collegaCrea } from "./crea.js";
import { collegaCostruttore } from "./costruttore.js";
import { aggiornaLibreria, collegaLibreria } from "./libreria.js";
import { aggiornaImmagini, collegaImmagini } from "./immagini.js";
import { collegaModelli } from "./modelli.js";
import { collegaBonsai } from "./bonsai.js";
import { collega } from "./ponte.js";

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("libreria", () => void aggiornaLibreria());
suApertura("immagini", () => void aggiornaImmagini());

collegaLettore();
collegaCrea();
collegaCostruttore();
collegaLibreria();
collegaImmagini();
collegaComandiCoda();
collegaModelli();
collegaBonsai();

await aggiornaLibreria();

await collega(
  (connesso) => {
    el.dot.classList.toggle("on", connesso);
    el.statusTxt.textContent = connesso ? "pronto" : "motore offline";
    // Riconnessi dopo un riavvio del motore: i lavori che seguivamo potrebbero
    // non esistere più.
    if (connesso) void riallinea();
  },
  messaggioDalMotore,
);
