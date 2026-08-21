/**
 * L'accensione: monta i pezzi e li mette in comunicazione.
 *
 * L'ordine conta, ed è quello delle altre app: la scheda si costruisce **prima**
 * di parlare col motore. Scegliere il modello, vedere quanto pesa e far partire
 * lo scaricamento sono cose che funzionano anche a motore spento, e sono le
 * prime che si fanno la prima volta che si apre questa scheda.
 */

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
