/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta, ed è quello delle altre app: la scheda si costruisce **prima**
 * di parlare col motore. Scegliere il modello, vedere quanto pesa e far partire
 * lo scaricamento sono cose che funzionano anche a motore spento, e sono le
 * prime che si fanno la prima volta che si apre questa scheda.
 */

import { collegaLavoriDaFuori, premi, scrivi } from "/comune/da-fuori.js";
import { el, mostraScheda, suApertura } from "./dom.js";
import { accendiBottoni, collegaParla, motoreCollegato } from "./parla.js";
import { caricaVoci, collegaVoci } from "./voci.js";
import { aggiornaGalleria, collegaGalleria } from "./galleria.js";
import { collegaScelta } from "./scelta-modello.js";
import { collega } from "./ponte.js";

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => mostraScheda(b.dataset.scheda);
});
suApertura("galleria", () => void aggiornaGalleria());
suApertura("voci", () => void caricaVoci());

collegaParla();
collegaVoci();
collegaGalleria();

// Per ultimo fra questi: il menu dei modelli riaccende il tasto «Parla» quando
// i pesi arrivano, e vuole trovare il resto della pagina già in piedi.
await collegaScelta(accendiBottoni);

// I conteggi accanto ai nomi delle schede devono essere giusti **prima** che
// qualcuno ci entri: è metà del motivo per cui quei numeri esistono.
void aggiornaGalleria();
void caricaVoci();

await collega((vivo) => {
  el.dot.classList.toggle("on", vivo);
  el.statusTxt.textContent = vivo ? "pronto" : "motore offline";
  motoreCollegato(vivo);
  // Il motore che torna su può aver finito qualcosa mentre non c'eravamo, e le
  // voci le tiene lui: si rileggono.
  if (vivo) void caricaVoci();
});

/**
 * I lavori chiesti da fuori: dal telefono, dalla console, da un agente.
 *
 * Poche righe, e sono tutte «metti questo lì»: la generazione è quella di
 * sempre, perché si preme lo stesso tasto che premeresti tu. Il perché di
 * questa scelta — invece di costruire il grafo qui — sta in
 * `packages/ui/src/da-fuori.js`.
 */
collegaLavoriDaFuori((richiesta) => {
  mostraScheda("parla");
  scrivi(el.testo, richiesta.testo);
  if (richiesta.opzioni.voce && el.voce) scrivi(el.voce, richiesta.opzioni.voce);
  premi(el.parla, "DaProdVoce non è pronta: apri la scheda sul computer e guarda cosa manca.");
});
