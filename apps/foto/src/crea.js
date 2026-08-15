/** La scheda Crea: dal testo all'immagine. */

import { el, escapeHtml, legaValore, mostraErrore, nascondiErrore, rnd } from "./dom.js";
import { ESTETICHE, NEGATIVO, PROPOSTE } from "./dati/estetiche.js";
import { componiPrompt, grafoImmagine } from "./grafi.js";
import { aggiungiLavoro } from "./coda.js";
import * as ponte from "./ponte.js";

function leggiModulo() {
  const [larghezza, altezza] = el.formato.value.split("x").map(Number);
  return {
    testo: el.prompt.value.trim(),
    estetica: el.estetica.value,
    larghezza,
    altezza,
    passi: parseInt(el.passi.value),
    cfg: parseFloat(el.cfg.value),
    negativo: el.negativo.value.trim() || NEGATIVO,
    seed: parseInt(el.seed.value) || 0,
  };
}

export function collegaCrea() {
  legaValore("passi", "passiVal");
  legaValore("cfg", "cfgVal", (v) => Number(v).toFixed(1));

  el.estetica.innerHTML = Object.keys(ESTETICHE)
    .map((k) => `<option>${escapeHtml(k)}</option>`)
    .join("");
  el.negativo.value = NEGATIVO;
  el.seed.value = rnd();

  el.proposte.innerHTML = "";
  for (const proposta of PROPOSTE) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = proposta.length > 42 ? proposta.slice(0, 40) + "…" : proposta;
    chip.title = proposta;
    chip.onclick = () => (el.prompt.value = proposta);
    el.proposte.appendChild(chip);
  }

  el.dado.onclick = () => (el.seed.value = rnd());

  el.toggleAdv.onclick = () => {
    const aperto = el.avanzati.style.display === "none";
    el.avanzati.style.display = aperto ? "block" : "none";
    el.toggleAdv.classList.toggle("on", aperto);
  };

  el.genera.onclick = async () => {
    nascondiErrore();
    const p = leggiModulo();
    if (!p.testo) return mostraErrore("Scrivi cosa vuoi vedere.");

    const quante = Math.max(1, Math.min(8, parseInt(el.quante.value) || 1));
    for (let i = 0; i < quante; i++) {
      // Dalla seconda in poi il seed cambia comunque: otto copie della stessa
      // immagine non sono otto immagini.
      if (el.seedCasuale.checked || i > 0) el.seed.value = rnd();
      const parametri = { ...leggiModulo(), prompt: componiPrompt(p.testo, p.estetica) };

      try {
        const id = await ponte.invia(grafoImmagine(parametri));
        aggiungiLavoro(id, p.testo, {
          testo: p.testo,
          estetica: p.estetica,
          prompt: parametri.prompt,
          formato: el.formato.value,
          passi: parametri.passi,
          cfg: parametri.cfg,
          seed: parametri.seed,
        });
      } catch (e) {
        return mostraErrore(String(e.message || e));
      }
    }
  };
}
