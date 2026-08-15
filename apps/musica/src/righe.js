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

export function rigaBrano(elemento) {
  const meta = elemento.meta || {};
  const suona = inAscolto()?.id === elemento.id;
  const sottotitolo = String(meta.caption || "").split("\n")[0].slice(0, 60);

  return `<div class="track ${suona ? "playing" : ""}" data-brano="${escapeHtml(elemento.id)}">
    <div class="thumb">
      ${elemento.copertina ? `<img src="${escapeHtml(elemento.copertina)}" alt="">` : ""}
      <button class="pl" title="ascolta">${suona && !inPausa() ? "&#10074;&#10074;" : "&#9654;"}</button>
    </div>
    <div class="tmeta">
      <div class="tt">${escapeHtml(elemento.nome)}</div>
      <div class="tsub">${escapeHtml(sottotitolo)}${meta.duration ? ` &middot; ${escapeHtml(String(meta.duration))}s` : ""}</div>
    </div>
    <div class="tact">
      <button data-dettaglio="${escapeHtml(elemento.id)}" title="dettagli">&#9432;</button>
      <button class="del" data-elimina="${escapeHtml(elemento.id)}" title="elimina il brano">&#10005;</button>
    </div>
  </div>`;
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
