/**
 * La scheda Immagini.
 *
 * Scheda a sé, non un accessorio delle copertine: si scrive cosa si vuole vedere
 * — anche in italiano, ci pensano i motivi a tradurlo in scena — si sceglie
 * l'estetica e il formato, e si generano. Il modello è Anima, che non impone un
 * mondo suo: l'estetica la sceglie l'utente dal menu.
 *
 * Queste immagini restano in libreria come risultati a sé, e da lì possono
 * andare a un'altra app della suite.
 */

import { el, escapeHtml, rnd } from "./dom.js";
import { ascolta } from "./bus.js";
import { stato } from "./stato.js";
import { ESTETICHE, IMG_PRESETS } from "./dati/estetiche.js";
import { grafoImmagine, promptLibero } from "./grafi.js";
import { aggiungiLavoro } from "./coda.js";
import { controllaAnima } from "./anima.js";
import * as ponte from "./ponte.js";
// Le pastiglie con le proposte: di tutte le app, non di questa. Stanno in
// `packages/ui`, servite sotto `/comune/` dalla stessa origine della pagina.
import { collegaProposte } from "/comune/proposte.js";

export async function aggiornaImmagini() {
  stato.immagini = await ponte.immaginiSalvate();
  el.imgCountLbl.textContent = stato.immagini.length ? `(${stato.immagini.length})` : "";

  el.imgCards.innerHTML = stato.immagini.length
    ? stato.immagini
        .map(
          (im) => `<div class="card">
            <img class="art" src="${escapeHtml(im.url)}" alt="">
            <div class="sub">${new Date(im.creato).toLocaleString("it-IT")}</div>
            <div class="acts">
              <button data-mostra="${escapeHtml(im.id)}">mostra nella cartella</button>
              <button class="del" data-elimina="${escapeHtml(im.id)}">elimina</button>
            </div>
          </div>`,
        )
        .join("")
    : `<div class="empty">Nessuna immagine per ora.</div>`;

  el.imgCards.querySelectorAll("[data-mostra]").forEach((b) => {
    b.onclick = () => ponte.mostraNellaCartella(b.dataset.mostra);
  });
  el.imgCards.querySelectorAll("[data-elimina]").forEach((b) => {
    b.onclick = async () => {
      await ponte.eliminaElemento(b.dataset.elimina);
      await aggiornaImmagini();
    };
  });
}

export function collegaImmagini() {
  el.imgStyle.innerHTML = Object.keys(ESTETICHE).map((k) => `<option>${escapeHtml(k)}</option>`).join("");

  // Le stesse pastiglie di DaProdFoto, con la stessa meccanica: il "+" ne
  // aggiunge una tua, il tasto destro la modifica o la cancella. Le disegna il
  // pezzo comune in `packages/ui`.
  collegaProposte(el.imgPresets, {
    chiave: "daprod.musica.proposte-immagini",
    difetto: IMG_PRESETS,
    applica: (prompt) => (el.imgPrompt.value = prompt),
    testoCorrente: () => el.imgPrompt.value.trim(),
  });

  el.imgGo.onclick = async () => {
    el.imgError.style.display = "none";
    const testo = el.imgPrompt.value.trim();
    if (!testo) return fallisci("Scrivi cosa vuoi vedere.");

    const [larghezza, altezza] = el.imgSize.value.split("x").map(Number);
    const quante = Math.max(1, Math.min(8, parseInt(el.imgCount.value) || 1));
    const prompt = promptLibero(testo, el.imgStyle.value);

    for (let i = 0; i < quante; i++) {
      try {
        const id = await ponte.invia(grafoImmagine(prompt, rnd(), { larghezza, altezza, salva: true }));
        aggiungiLavoro(id, { titolo: testo.slice(0, 60) }, { specie: "immagine" });
      } catch (e) {
        return fallisci(String(e.message || e));
      }
    }
  };

  el.imgRefresh.onclick = () => aggiornaImmagini();
  ascolta("immagini-cambiate", () => void aggiornaImmagini());

  // Anima c'e' o non c'e': se non c'e', "Genera" resta spento e sopra compare
  // come prenderla. Meglio un bottone spento che un errore del motore.
  void controllaAnima(el.mancaAnima, el.imgGo);
  ponte.suAvanzamentoModelli((a) => {
    if (!a.attivo) void controllaAnima(el.mancaAnima, el.imgGo);
  });
}

function fallisci(testo) {
  el.imgError.style.display = "block";
  el.imgError.textContent = testo;
}
