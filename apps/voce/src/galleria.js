/**
 * La scheda Galleria: quello che hai fatto dire.
 *
 * Come in DaProdFoto e DaProdCinema: non è un album del programma, è la cartella
 * dei risultati della suite vista da questa app. Le **voci di riferimento** —
 * che stanno nella stessa cartella, sotto `voci/` — qui non compaiono: sono roba
 * che entra, non che esce, e hanno una scheda tutta loro.
 *
 * Il tasto che fa la differenza è **«a Cinema»**: una voce fatta qui è
 * esattamente quello che MiniMax H3 vuole come riferimento audio, e ci arriva
 * senza passare da salva-cerca-ricarica.
 */

import { el, escapeHtml, mostraScheda } from "./dom.js";
import { stato } from "./stato.js";
import * as ponte from "./ponte.js";

/** Come si racconta una voce fatta, in una riga. */
function descrivi(d) {
  const meta = d.meta || {};
  return [
    meta.modello,
    meta.voce ? `voce: ${meta.voce}` : null,
    meta.secondi ? `${Number(meta.secondi).toFixed(1)} s` : null,
    new Date(d.creato).toLocaleString("it-IT"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function aggiornaGalleria() {
  try {
    stato.detti = await ponte.detti();
  } catch {
    // La suite non risponde: si tiene quello che c'era.
  }

  el.navGal.textContent = stato.detti.length;
  el.conteggio.textContent = stato.detti.length ? `(${stato.detti.length})` : "";

  el.galleria.innerHTML = stato.detti.length
    ? stato.detti.map(riga).join("")
    : `<div class="empty">Ancora niente. Vai su <b>Parla</b>, scrivi una frase e premi.</div>`;

  collega();
}

function riga(d) {
  const meta = d.meta || {};
  return `<div class="detta">
    <div class="thumb">&#9835;</div>
    <div class="tmeta">
      <div class="tt" title="${escapeHtml(String(meta.testo || d.nome))}">${escapeHtml(String(meta.testo || d.nome))}</div>
      <div class="tsub">${escapeHtml(descrivi(d))}</div>
      <audio src="${escapeHtml(d.url)}" controls preload="none"></audio>
      <div class="acts">
        <button data-cinema="${escapeHtml(d.id)}" title="usala come riferimento audio in DaProdCinema">a Cinema</button>
        <button data-salva="${escapeHtml(d.id)}">salva</button>
        <button data-cartella="${escapeHtml(d.id)}">cartella</button>
        <button class="del" data-elimina="${escapeHtml(d.id)}">elimina</button>
      </div>
    </div>
  </div>`;
}

/** Due secondi di risposta sul tasto stesso: in galleria non c'è una riga per gli avvisi. */
function dilloSulTasto(bottone, testo) {
  const prima = bottone.textContent;
  bottone.textContent = testo;
  setTimeout(() => (bottone.textContent = prima), 2200);
}

function collega() {
  el.galleria.querySelectorAll("[data-cinema]").forEach((b) => {
    b.onclick = async () => {
      try {
        await ponte.mandaA("cinema", b.dataset.cinema, "usaComeRiferimento");
        dilloSulTasto(b, "mandata");
      } catch {
        dilloSulTasto(b, "non riesco");
      }
    };
  });

  el.galleria.querySelectorAll("[data-cartella]").forEach((b) => {
    b.onclick = async () => {
      if (await ponte.mostraNellaCartella(b.dataset.cartella)) return;
      dilloSulTasto(b, "non c'è più");
    };
  });

  el.galleria.querySelectorAll("[data-salva]").forEach((b) => {
    b.onclick = async () => {
      const prima = b.textContent;
      b.disabled = true;
      b.textContent = "salvo…";
      try {
        const dove = await ponte.salvaCopia(b.dataset.salva);
        b.textContent = prima;
        if (dove) dilloSulTasto(b, "salvata");
      } catch {
        b.textContent = prima;
        dilloSulTasto(b, "non riesco");
      } finally {
        b.disabled = false;
      }
    };
  });

  el.galleria.querySelectorAll("[data-elimina]").forEach((b) => {
    b.onclick = async () => {
      const d = stato.detti.find((x) => x.id === b.dataset.elimina);
      if (!confirm(`Eliminare definitivamente "${d?.nome ?? "questo audio"}"?`)) return;
      await ponte.eliminaElemento(b.dataset.elimina);
      await aggiornaGalleria();
    };
  });
}

export function collegaGalleria() {
  el.aggiorna.onclick = () => void aggiornaGalleria();
  ponte.suLibreriaCambiata(() => void aggiornaGalleria());

  // Un audio mandato qui da un'altra app: si va sulle Voci, perché l'unica cosa
  // che DaProdVoce sa fare con un audio che arriva da fuori è copiarne la voce.
  ponte.suConsegna(() => mostraScheda("voci"));
}
