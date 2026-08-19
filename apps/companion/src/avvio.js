/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta poco, tranne per una cosa: la diagnostica va chiesta **prima**
 * che qualcuno scriva. Se LM Studio è spento o non ha nessun modello, la prima
 * frase fallirebbe con un errore grezzo su una cosa che si poteva sapere
 * subito — ed è il motivo per cui `/diagnostics` esiste.
 */

import { el, mostraScheda, suApertura, testo } from "./dom.js";
import { collegaConversazione, riprendi } from "./conversazione.js";
import { aggiornaMemoria, aggiornaSogni, collegaSogni } from "./memoria.js";
import { collega, diagnostica, storico } from "./ponte.js";
import { collegaSelettoreLlm } from "/comune/selettore-llm.js";

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("memoria", () => void aggiornaMemoria());
suApertura("sogni", () => void aggiornaSogni());

collegaConversazione();
collegaSogni();

// Il selettore del modello è quello condiviso, lo stesso che si vede nell'hub e
// nelle altre app: chi ha già scelto Bonsai per scrivere una canzone se lo
// ritrova scelto anche qui.
collegaSelettoreLlm(el.selettoreLlm);

/* --------------------------------------------------- il motore, e com'è messo */

const staccati = await collega(
  (collegato) => {
    el.spia.classList.toggle("on", collegato);
    el.statoTxt.textContent = collegato ? "collegato" : "il motore non risponde";
  },
  (tipo) => {
    // Gli eventi che nascono da soli. Un sogno comincia perché è arrivata
    // l'ora, non perché qualcuno l'ha chiesto: senza questo canale la pagina lo
    // scoprirebbe solo ricaricando.
    if (tipo === "dreaming-started") el.statoTxt.textContent = "sta sognando…";
    if (tipo === "dreaming-finished") {
      el.statoTxt.textContent = "collegato";
      void aggiornaSogni();
      void aggiornaMemoria();
    }
    if (tipo === "graph-updated") void aggiornaMemoria();
  },
);

window.addEventListener("beforeunload", () => staccati());

// Quello che vi eravate già detti: riaprire l'app non deve sembrare ricominciare
// da zero, soprattutto in una scheda che di mestiere fa il ricordare.
try {
  riprendi((await storico()).turns);
} catch {
  // Se il motore non risponde lo dice già la spia in alto: qui si tira dritto e
  // si lascia la conversazione vuota, che è la verità.
}

/* --------------------------------------------------------- cosa non va, se */

try {
  const esito = await diagnostica();
  if (esito.problems.length) {
    el.avviso.innerHTML = esito.problems.map(testo).join("<br><br>");
    el.avviso.hidden = false;
  }
} catch {
  // Il motore non risponde: la spia lo dice già, e due messaggi per la stessa
  // cosa sono peggio di uno.
}
