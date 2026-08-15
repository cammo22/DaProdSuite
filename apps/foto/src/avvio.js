/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * La galleria si legge prima di parlare col motore, perché è l'unica cosa che
 * funziona anche a motore spento — le immagini di ieri si guardano comunque.
 */

import { el, mostraErrore, mostraScheda, suApertura } from "./dom.js";
import { ascolta } from "./bus.js";
import { collegaComandiCoda, messaggioDalMotore, riallinea } from "./coda.js";
import { collegaCrea } from "./crea.js";
import { collegaRitocco } from "./ritocco.js";
import { aggiornaGalleria, collegaGalleria } from "./galleria.js";
import { collegaModelli } from "./modelli.js";
import { collegaLente } from "./lente.js";
import { collegaTrascinamento, eImmagine } from "./trascina.js";
import { collegaTraduzione } from "./lingua.js";
import { apriImmagine } from "./ritocco.js";
import { collega } from "./ponte.js";

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("galleria", () => void aggiornaGalleria());

collegaLente();
collegaCrea();
collegaRitocco();
collegaGalleria();
collegaComandiCoda();
collegaModelli();
collegaTraduzione();

// Un'immagine trascinata dentro finisce nel ritocco, da qualunque scheda: è
// l'unica cosa che in Foto si può fare con un'immagine che arriva da fuori.
collegaTrascinamento(async (file) => {
  const indirizzo = URL.createObjectURL(file);
  try {
    await apriImmagine(indirizzo);
  } catch (e) {
    mostraErrore(`Non sono riuscito ad aprire "${file.name}": ${e.message || e}`);
  } finally {
    URL.revokeObjectURL(indirizzo);
  }
}, eImmagine);

// Un errore del motore arriva dalla coda, che non sa in quale scheda sei.
ascolta("errore", (testo) => mostraErrore(testo));

await aggiornaGalleria();

await collega(
  (connesso) => {
    el.dot.classList.toggle("on", connesso);
    el.statusTxt.textContent = connesso ? "pronto" : "motore offline";
    if (connesso) void riallinea();
  },
  messaggioDalMotore,
);
