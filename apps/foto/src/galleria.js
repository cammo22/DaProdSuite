/**
 * La scheda Galleria: le immagini fatte qui.
 *
 * Non è un album del programma, è la cartella dei risultati della suite vista da
 * questa app. Per questo un'immagine può andarsene altrove con un clic — a
 * DaProdMusica diventa la copertina di un brano — senza salvarla, ritrovarla e
 * ricaricarla da qualche parte.
 */

import { el, escapeHtml, mostraScheda } from "./dom.js";
import { annuncia, ascolta } from "./bus.js";
import { mostraLente } from "./lente.js";
import { stato } from "./stato.js";
import { disegnaSessione, scordaDisegno } from "./coda.js";
import * as ponte from "./ponte.js";

let immagini = [];

/** Come si racconta un'immagine in una riga: modello, estetica, quando. */
export function descrivi(immagine) {
  const meta = immagine.meta || {};
  return [
    meta.modello,
    meta.ritocco ? "ritocco" : meta.estetica,
    new Date(immagine.creato).toLocaleString("it-IT"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function aggiornaGalleria() {
  immagini = await ponte.immagini();
  stato.immagini = immagini;

  el.navGal.textContent = immagini.length;
  el.conteggio.textContent = immagini.length ? `(${immagini.length})` : "";

  el.galleria.innerHTML = immagini.length
    ? immagini.map(scheda).join("")
    : `<div class="empty">Ancora nessuna immagine. Vai su <b>Crea</b> e falla.</div>`;

  collega();

  // La sessione mostra le stesse immagini: se non lo si dice, la striscia sotto
  // i lavori resta a quelle di prima finché non cambia qualcos'altro.
  scordaDisegno();
  disegnaSessione();
}

function scheda(immagine) {
  const meta = immagine.meta || {};

  return `<div class="card">
    <img class="art" src="${escapeHtml(immagine.url)}" alt="" loading="lazy" data-lente="${escapeHtml(immagine.id)}">
    <div class="nm">${escapeHtml(meta.testo || immagine.nome)}</div>
    <div class="sub">${escapeHtml(descrivi(immagine))}</div>
    <div class="acts">
      <button data-ritocca="${escapeHtml(immagine.id)}">ritocca</button>
      <button data-copertina="${escapeHtml(immagine.id)}">a Musica</button>
      <button data-mostra="${escapeHtml(immagine.id)}">nella cartella</button>
      <button class="del" data-elimina="${escapeHtml(immagine.id)}">elimina</button>
    </div>
  </div>`;
}

function trova(id) {
  return immagini.find((i) => i.id === id);
}

function collega() {
  el.galleria.querySelectorAll("[data-lente]").forEach((img) => {
    img.onclick = () => {
      const immagine = trova(img.dataset.lente);
      if (immagine) mostraLente(immagine.url, `${immagine.meta?.testo ?? immagine.nome} — ${descrivi(immagine)}`);
    };
  });

  el.galleria.querySelectorAll("[data-ritocca]").forEach((b) => {
    b.onclick = () => {
      const immagine = trova(b.dataset.ritocca);
      if (immagine) annuncia("ritocca", immagine.url);
    };
  });

  // L'intenzione la capisce Musica: le arriva un'immagine e la mette come
  // copertina del brano che ha aperto.
  el.galleria.querySelectorAll("[data-copertina]").forEach((b) => {
    b.onclick = async () => {
      b.textContent = "mandata";
      await ponte.mandaA("musica", b.dataset.copertina, "usaComeCopertina");
      setTimeout(() => (b.textContent = "a Musica"), 1800);
    };
  });

  el.galleria.querySelectorAll("[data-mostra]").forEach((b) => {
    b.onclick = () => ponte.mostraNellaCartella(b.dataset.mostra);
  });

  el.galleria.querySelectorAll("[data-elimina]").forEach((b) => {
    b.onclick = async () => {
      const immagine = trova(b.dataset.elimina);
      if (!confirm(`Eliminare definitivamente "${immagine?.nome ?? "questa immagine"}"?`)) return;
      await ponte.eliminaElemento(b.dataset.elimina);
      await aggiornaGalleria();
    };
  });
}

export function collegaGalleria() {
  el.aggiorna.onclick = () => aggiornaGalleria();

  ascolta("galleria-cambiata", () => void aggiornaGalleria());
  ponte.suLibreriaCambiata(() => void aggiornaGalleria());

  // Un'immagine mandata qui da un'altra app finisce dritta nel ritocco: è quello
  // che si vuole fare quando si passa una foto a un programma che la modifica.
  ponte.suConsegna((consegna) => {
    if (consegna.elemento.tipo !== "immagine") {
      mostraScheda("galleria");
      return;
    }
    annuncia("ritocca", consegna.elemento.url);
  });
}
