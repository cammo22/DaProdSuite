/**
 * La riga di un brano, uguale ovunque compaia.
 *
 * La usano la sessione (i brani appena finiti) e la libreria: sono la stessa
 * cosa vista da due schede, e devono comportarsi allo stesso modo — stessa
 * copertina, stesso clic per ascoltare, stesso puntino quando sta suonando.
 */

import { escapeHtml } from "./dom.js";
import { annuncia } from "./bus.js";
import { inAscolto, inPausa, riproduciId } from "./lettore.js";
import { eliminaElemento } from "./ponte.js";

/** La riga sotto il titolo: la prima riga del testo, e quanto dura. */
function sottotitolo(elemento) {
  const meta = elemento.meta || {};
  const prima = String(meta.caption || "").split("\n")[0].slice(0, 60);
  return `${escapeHtml(prima)}${meta.duration ? ` &middot; ${escapeHtml(String(meta.duration))}s` : ""}`;
}

export function rigaBrano(elemento) {
  const suona = inAscolto()?.id === elemento.id;

  return `<div class="track ${suona ? "playing" : ""}" data-brano="${escapeHtml(elemento.id)}">
    <div class="thumb">
      ${elemento.copertina ? `<img src="${escapeHtml(elemento.copertina)}" alt="">` : ""}
      <button class="pl" title="ascolta">${suona && !inPausa() ? "&#10074;&#10074;" : "&#9654;"}</button>
    </div>
    <div class="tmeta">
      <div class="tt">${escapeHtml(elemento.nome)}</div>
      <div class="tsub">${sottotitolo(elemento)}</div>
    </div>
    <div class="tact">
      <button data-dettaglio="${escapeHtml(elemento.id)}" title="dettagli">&#9432;</button>
      <button class="del" data-elimina="${escapeHtml(elemento.id)}" title="elimina il brano">&#10005;</button>
    </div>
  </div>`;
}

/**
 * Rimette in pari una riga già disegnata, senza rifarla.
 *
 * Serve perché l'elenco si ridisegna spesso — a ogni play, a ogni pausa, a ogni
 * giro della sessione — e rifare il nodo vorrebbe dire ricaricare la copertina
 * ogni volta. Qui si tocca solo quello che è cambiato davvero.
 */
export function aggiornaRiga(nodo, elemento) {
  const suona = inAscolto()?.id === elemento.id;

  nodo.classList.toggle("playing", suona);

  const pulsante = nodo.querySelector(".pl");
  if (pulsante) pulsante.innerHTML = suona && !inPausa() ? "&#10074;&#10074;" : "&#9654;";

  // La copertina arriva dopo il brano: quando c'è, prende il posto del vuoto.
  const thumb = nodo.querySelector(".thumb");
  if (thumb && elemento.copertina && !thumb.querySelector("img")) {
    thumb.insertAdjacentHTML("afterbegin", `<img src="${escapeHtml(elemento.copertina)}" alt="">`);
  }

  const titolo = nodo.querySelector(".tt");
  if (titolo && titolo.textContent !== elemento.nome) titolo.textContent = elemento.nome;

  const sub = nodo.querySelector(".tsub");
  const testo = sottotitolo(elemento);
  if (sub && sub.innerHTML !== testo) sub.innerHTML = testo;
}

export function collegaRighe(radice) {
  radice.querySelectorAll("[data-brano]").forEach((riga) => {
    riga.querySelector(".pl").onclick = (ev) => {
      ev.stopPropagation();
      riproduciId(riga.dataset.brano);
    };
  });

  radice.querySelectorAll("[data-dettaglio]").forEach((bottone) => {
    bottone.onclick = (ev) => {
      ev.stopPropagation();
      annuncia("mostra-dettaglio", bottone.dataset.dettaglio);
    };
  });

  // Buttare via un brano venuto male è la cosa che si fa più spesso mentre si
  // genera: chiederla dal dettaglio vuol dire tre clic per ogni scarto.
  radice.querySelectorAll("[data-elimina]").forEach((bottone) => {
    bottone.onclick = async (ev) => {
      ev.stopPropagation();
      const riga = bottone.closest("[data-brano]");
      const nome = riga?.querySelector(".tt")?.textContent ?? "questo brano";
      if (!confirm(`Eliminare definitivamente "${nome}"?`)) return;
      await eliminaElemento(bottone.dataset.elimina);
      annuncia("libreria-cambiata");
    };
  });
}
