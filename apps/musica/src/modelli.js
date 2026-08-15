/**
 * I quadratini colorati nella barra in alto: cosa sta occupando la VRAM.
 *
 * Con 8 GB non è un dettaglio tecnico ma una cosa che serve mentre lavori: il
 * modello del testo e quello delle immagini insieme non ci stanno, e quando la
 * generazione rallenta è quasi sempre perché il motore li sta scambiando. Passi
 * sopra un quadratino e vedi quanti MB si prende, ci clicchi e lo scarichi.
 *
 * È il primo pezzo di quello che nella versione 0.3.1 diventerà un pannello
 * della suite, uguale per tutte le app che si contendono la stessa GPU.
 */

import { el, escapeHtml } from "./dom.js";
import * as ponte from "./ponte.js";

const ETICHETTE = {
  MiniMaxMusic3TEModel: { sigla: "T", nome: "Testo canzone", classe: "m-testo" },
  MiniMaxMusic3: { sigla: "M", nome: "Musica", classe: "m-musica" },
  Anima: { sigla: "I", nome: "Immagini", classe: "m-immagini" },
  WanVAE: { sigla: "V", nome: "VAE immagini", classe: "m-vae" },
  MiniMaxMusic3DAV: { sigla: "A", nome: "VAE audio", classe: "m-vae" },
};

export async function aggiornaModelli() {
  const caricati = await ponte.modelliInVram();

  const html = caricati
    .map((m) => {
      const info = ETICHETTE[m.nome] || {
        sigla: (m.nome || "?")[0].toUpperCase(),
        nome: m.nome,
        classe: "m-vae",
      };
      return `<button class="${info.classe}" data-scarica="${escapeHtml(m.nome)}"
        title="${escapeHtml(info.nome)} — ${m.vramMb} MB in VRAM. Clicca per scaricarlo.">${info.sigla}</button>`;
    })
    .join("");

  // Ridisegnare ogni tre secondi un HTML identico spegnerebbe il tooltip
  // proprio mentre lo stai leggendo.
  if (el.mods.dataset.html === html) return;
  el.mods.dataset.html = html;
  el.mods.innerHTML = html;

  el.mods.querySelectorAll("[data-scarica]").forEach((b) => {
    b.onclick = async () => {
      await ponte.scaricaDallaVram(b.dataset.scarica);
      await aggiornaModelli();
    };
  });
}

export function collegaModelli() {
  void aggiornaModelli();
  setInterval(() => void aggiornaModelli(), 3000);
}
