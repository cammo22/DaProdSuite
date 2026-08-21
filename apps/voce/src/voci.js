/**
 * La scheda Voci: i riferimenti da cui il modello copia il timbro.
 *
 * **Una voce qui dentro è due cose insieme**: un pezzo di audio in cui si sente
 * parlare, e la trascrizione di quello che dice. La seconda non è un'etichetta
 * per ritrovarla: è come il modello capisce il modo in cui quella voce pronuncia
 * quelle parole. Sbagliarla peggiora la copia, lasciarla vuota la rende un'altra
 * voce — ed è il motivo per cui il campo è obbligatorio invece che facoltativo.
 *
 * I file stanno in `output/voce/voci/`, cioè **nei risultati e non fra i
 * temporanei**: una voce registrata non si rigenera da nessuna parte, e i
 * temporanei la suite li cancella quando le pare.
 */

import { el, escapeHtml, libera, mostraErrore, mostraScheda, nascondiErrore, occupa } from "./dom.js";
import { stato } from "./stato.js";
import { disegnaVoci } from "./parla.js";
import * as ponte from "./ponte.js";

/** L'audio scelto ma non ancora salvato. */
let scelto = null;
let indirizzoAnteprima = null;

export async function caricaVoci() {
  try {
    const risposta = await ponte.voci();
    stato.voci = risposta.voci ?? [];
  } catch {
    // Motore spento: l'elenco resta quello di prima invece di svuotarsi sotto
    // gli occhi di chi sta guardando.
  }

  // Gli audio della libreria servono a dare un indirizzo a ogni voce: il motore
  // dice **quale** file è, la suite dice **dove** sta.
  try {
    stato.audio = await ponte.audioDellaSuite();
  } catch {
    stato.audio = stato.audio ?? [];
  }

  el.navVoci.textContent = stato.voci.length;
  el.contoVoci.textContent = stato.voci.length ? `(${stato.voci.length})` : "";
  disegnaElenco();
  disegnaVoci();
}

function disegnaElenco() {
  el.elencoVoci.innerHTML = stato.voci.length
    ? `<div class="voci">${stato.voci.map(scheda).join("")}</div>`
    : `<div class="empty">Nessuna voce salvata. Senza, il modello se ne inventa una a ogni frase.</div>`;

  el.elencoVoci.querySelectorAll("[data-usa]").forEach((b) => {
    b.onclick = () => {
      el.voce.value = b.dataset.usa;
      el.voce.dispatchEvent(new Event("change"));
      mostraScheda("parla");
    };
  });

  el.elencoVoci.querySelectorAll("[data-togli]").forEach((b) => {
    b.onclick = async () => {
      const voce = stato.voci.find((v) => v.id === b.dataset.togli);
      if (!confirm(`Eliminare la voce "${voce?.nome ?? b.dataset.togli}"?`)) return;
      try {
        await ponte.eliminaVoce(b.dataset.togli);
        await caricaVoci();
      } catch (e) {
        mostraErrore(String(e.message || e), "erroreVoci");
      }
    };
  });
}

function scheda(v) {
  return `<div class="vocina">
    <div class="titolo"><b>${escapeHtml(v.nome)}</b><span>${escapeHtml(v.id)}</span></div>
    <div class="detto">${escapeHtml(v.testo) || "<i>senza trascrizione: la copia verrà peggio</i>"}</div>
    <audio src="${escapeHtml(indirizzoVoce(v))}" controls preload="none"></audio>
    <div class="acts">
      <button data-usa="${escapeHtml(v.id)}">usala</button>
      <button class="del" data-togli="${escapeHtml(v.id)}">elimina</button>
    </div>
  </div>`;
}

/**
 * L'indirizzo con cui la pagina può sentire una voce salvata.
 *
 * Passa dalla libreria della suite come tutto il resto: il motore dice **quale**
 * elemento è (`voce/voci/nome.wav`), la suite dice **dove** sta. Se la libreria
 * non l'ha ancora vista — è appena stata salvata — si resta senza indirizzo per
 * un giro, e al successivo c'è.
 */
function indirizzoVoce(v) {
  return stato.audio.find((a) => a.id === v.elemento)?.url ?? "";
}

/* -------------------------------------------------- scegliere un audio */

function mostraScelto(file, indirizzo) {
  scelto = file;
  if (indirizzoAnteprima) URL.revokeObjectURL(indirizzoAnteprima);
  indirizzoAnteprima = indirizzo.startsWith("blob:") ? indirizzo : null;

  el.fileScelto.textContent = `Scelto: ${file.name}`;
  el.ascoltaScelto.hidden = false;
  el.ascoltaScelto.src = indirizzo;
}

/**
 * Un audio già in libreria, da qualunque app.
 *
 * È il giro che rende utile avere le app nello stesso posto: una battuta detta
 * da un avatar in DaProdIoDigitale, o una voce dentro un video di DaProdCinema,
 * diventano il riferimento senza passare da «salva, cerca, riapri».
 */
async function dallaLibreria() {
  const audio = await ponte.audioDellaSuite();
  stato.audio = audio;

  const suoi = audio.filter((a) => !a.id.startsWith("voce/voci/"));
  if (!suoi.length) {
    el.fileScelto.textContent = "In libreria non c'è ancora nessun audio.";
    return;
  }

  el.fileScelto.innerHTML = `
    <label for="daLibreria">Prendi da qui</label>
    <div class="inline">
      <select id="daLibreria">${suoi
        .slice(0, 40)
        .map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.nome)} — ${escapeHtml(a.app)}</option>`)
        .join("")}</select>
      <button class="mini" id="prendiDaLibreria">prendi</button>
    </div>`;

  document.getElementById("prendiDaLibreria").onclick = async () => {
    const id = document.getElementById("daLibreria").value;
    const elemento = suoi.find((a) => a.id === id);
    if (!elemento) return;
    try {
      const risposta = await fetch(elemento.url);
      const blob = await risposta.blob();
      const nome = elemento.percorso?.split(/[\\/]/).pop() ?? `${elemento.nome}.wav`;
      mostraScelto(new File([blob], nome, { type: blob.type || "audio/wav" }), elemento.url);
      if (!el.nomeVoce.value.trim()) el.nomeVoce.value = elemento.nome;
      // Se quell'audio l'ha fatto DaProdVoce, il testo lo sappiamo già.
      if (!el.testoVoce.value.trim() && typeof elemento.meta?.testo === "string") {
        el.testoVoce.value = elemento.meta.testo;
      }
    } catch (e) {
      mostraErrore(`Non riesco a leggere quel file: ${e.message || e}`, "erroreVoci");
    }
  };
}

export function collegaVoci() {
  el.scegliAudio.onclick = () => el.sceltaFile.click();
  el.sceltaFile.onchange = () => {
    const file = el.sceltaFile.files?.[0];
    if (file) mostraScelto(file, URL.createObjectURL(file));
    el.sceltaFile.value = "";
  };

  el.dallaLibreria.onclick = () => void dallaLibreria();

  el.salvaVoce.onclick = async () => {
    nascondiErrore("erroreVoci");
    const nome = el.nomeVoce.value.trim();
    const testo = el.testoVoce.value.trim();

    if (!nome) return mostraErrore("Dalle un nome: serve a ritrovarla nel menu.", "erroreVoci");
    if (!scelto) return mostraErrore("Scegli l'audio in cui si sente questa voce.", "erroreVoci");
    if (!testo) {
      return mostraErrore(
        "Scrivi cosa dice l'audio, parola per parola. Non è un'etichetta: è come il modello capisce il modo di pronunciare, e senza la copia viene un'altra voce.",
        "erroreVoci",
      );
    }

    occupa(el.salvaVoce, "salvo…");
    try {
      await ponte.salvaVoce(nome, testo, scelto);
      el.nomeVoce.value = "";
      el.testoVoce.value = "";
      scelto = null;
      el.ascoltaScelto.hidden = true;
      el.ascoltaScelto.removeAttribute("src");
      el.fileScelto.textContent = "Nessun audio scelto. Vanno bene wav, mp3, flac e ogg.";
      // La libreria ha un file in più: senza rileggerla, la voce appena salvata
      // resterebbe senza lettore fino al prossimo giro.
      stato.audio = await ponte.audioDellaSuite();
      await caricaVoci();
    } catch (e) {
      mostraErrore(String(e.message || e), "erroreVoci");
    } finally {
      libera(el.salvaVoce);
    }
  };
}
