/**
 * La scheda Crea: il modulo, gli stili pronti e i due bottoni che avviano.
 *
 * "Crea" fa un brano nuovo. "Solo nuova resa" tiene ferma la struttura e cambia
 * soltanto il seed dell'audio: il motore riprende dalla cache tutta la parte
 * autoregressiva e ci mette 17 secondi invece di 107.
 */

import { el, escapeHtml, inserisciAlCursore, legaValore, mostraErrore, mostraScheda, rnd } from "./dom.js";
import { DEMO_LYRICS, PRESETS, STILI, TAGS } from "./dati/stili.js";
import { ESTETICHE } from "./dati/estetiche.js";
import { grafoBrano, grafoImmagine, promptCopertina, titoloAuto } from "./grafi.js";
import { aggiungiLavoro } from "./coda.js";
import * as ponte from "./ponte.js";

const CHIAVE_STILI = "daprod.stili";

export function stiliMiei() {
  const attuali = localStorage.getItem(CHIAVE_STILI);
  if (attuali) return JSON.parse(attuali);
  // Gli stili salvati quando l'app si chiamava MinimaxMusica non si buttano via.
  const vecchi = localStorage.getItem("minimaxmusica.styles") || localStorage.getItem("daprod.styles");
  if (vecchi) {
    localStorage.setItem(CHIAVE_STILI, vecchi);
    return JSON.parse(vecchi);
  }
  return {};
}

export function salvaStile(nome, descrizione) {
  const miei = stiliMiei();
  miei[nome] = descrizione;
  localStorage.setItem(CHIAVE_STILI, JSON.stringify(miei));
  disegnaPresets();
}

export function disegnaPresets() {
  el.presets.innerHTML = "";

  const aggiungi = (nome, descrizione, mio) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (mio ? " mine" : "");
    chip.append(document.createTextNode(nome));
    chip.onclick = () => {
      el.caption.value = descrizione;
      el.presets.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
    };
    if (mio) {
      const x = document.createElement("span");
      x.className = "x";
      x.textContent = "×";
      x.title = "elimina lo stile";
      x.onclick = (ev) => {
        ev.stopPropagation();
        if (!confirm(`Eliminare lo stile "${nome}"?`)) return;
        const miei = stiliMiei();
        delete miei[nome];
        localStorage.setItem(CHIAVE_STILI, JSON.stringify(miei));
        disegnaPresets();
      };
      chip.appendChild(x);
    }
    el.presets.appendChild(chip);
  };

  for (const [nome, testo] of Object.entries(STILI)) aggiungi(nome, testo, false);
  for (const [nome, testo] of Object.entries(stiliMiei())) aggiungi(nome, testo, true);
  for (const [nome, testo] of Object.entries(PRESETS)) aggiungi(nome, testo, false);

  const piu = document.createElement("button");
  piu.className = "chip add";
  piu.textContent = "+ nuovo stile";
  piu.onclick = () => mostraScheda("costruttore");
  el.presets.appendChild(piu);
}

/* ------------------------------------------------------------- il modulo */

function leggiModulo() {
  return {
    titolo: (el.titolo.value || "").trim(),
    caption: el.caption.value.trim(),
    lyrics: el.instrumental.checked ? "" : el.lyrics.value,
    duration: parseFloat(el.duration.value),
    steps: parseInt(el.steps.value),
    cfg: parseFloat(el.cfg.value),
    cfg_scale: parseFloat(el.cfg_scale.value),
    top_k: parseInt(el.top_k.value),
    seed_text: parseInt(el.seed_text.value) || 0,
    seed_audio: parseInt(el.seed_audio.value) || 0,
    format: el.format.value,
    tiled: el.tiled.checked,
    tile: parseInt(el.tile.value) || 1536,
  };
}

/** Rimette nel modulo i parametri di un brano già fatto. */
export function applicaMeta(meta) {
  if (!meta) return;
  el.caption.value = meta.caption ?? el.caption.value;
  el.lyrics.value = meta.lyrics ?? el.lyrics.value;
  el.titolo.value = meta.titolo ?? "";
  el.instrumental.checked = !(meta.lyrics || "").trim();
  el.lyrics.disabled = el.instrumental.checked;
  if (meta.duration) el.duration.value = meta.duration;
  if (meta.steps) el.steps.value = meta.steps;
  if (meta.cfg) el.cfg.value = meta.cfg;
  if (meta.cfg_scale != null) el.cfg_scale.value = meta.cfg_scale;
  if (meta.top_k) el.top_k.value = meta.top_k;
  if (meta.seed_text != null) el.seed_text.value = meta.seed_text;
  if (meta.seed_audio != null) el.seed_audio.value = meta.seed_audio;
  if (meta.format) el.format.value = meta.format;
  el.tiled.checked = !!meta.tiled;
  if (meta.tile) el.tile.value = meta.tile;
  el.randomSeed.checked = false;
  // Le etichette dei cursori si aggiornano su "input": senza questo, i numeri
  // resterebbero quelli di prima mentre i cursori si sono già mossi.
  for (const k of ["duration", "steps", "cfg", "cfg_scale", "top_k"]) {
    el[k].dispatchEvent(new Event("input"));
  }
}

/** Rifà la resa audio di un brano già in libreria, con i suoi stessi parametri. */
export function nuovaResa() {
  el.goAudio.click();
}

async function creaBrano(p) {
  p.titolo = p.titolo || titoloAuto(p.lyrics, p.caption);

  // **Prima il brano, poi la copertina**, e l'ordine non è un dettaglio di
  // presentazione. La copertina carica Anima, che sono 4 GB di VRAM; se resta
  // lì dentro, i 5,5 GB del text encoder musicale non ci stanno più e vengono
  // caricati solo *in parte*. Il motore non lo dice: va avanti e muore più tardi
  // con `'RVQDepthDecoder' object has no attribute '_v_block'`, a volte dopo
  // quattro minuti di lavoro buttato. Mettendo la copertina dopo, quando tocca a
  // lei il modello musicale ha già finito e le lascia il posto.
  await ponte.svuotaVram();

  const idBrano = await ponte.invia(grafoBrano(p));
  aggiungiLavoro(idBrano, p);

  if (el.autoCover.checked) {
    const prompt = promptCopertina(p.titolo, p.lyrics, el.coverStyleNew.value);
    const idCopertina = await ponte.invia(grafoImmagine(prompt, rnd()));
    aggiungiLavoro(idCopertina, { titolo: p.titolo }, { specie: "copertina", branoDi: idBrano });
  }
}

/* ------------------------------------------------------------ collegamenti */

export function collegaCrea() {
  legaValore("duration", "durVal", (v) => `${v} s`);
  legaValore("steps", "stepsVal");
  legaValore("cfg", "cfgVal");
  legaValore("cfg_scale", "cfgsVal");
  legaValore("top_k", "topkVal");

  el.dice1.onclick = () => (el.seed_text.value = rnd());
  el.dice2.onclick = () => (el.seed_audio.value = rnd());
  el.instrumental.onchange = () => (el.lyrics.disabled = el.instrumental.checked);

  el.caption.value = STILI["Neomelodico trap"];
  el.lyrics.value = DEMO_LYRICS;
  el.seed_text.value = rnd();
  el.seed_audio.value = rnd();
  el.coverStyleNew.innerHTML = Object.keys(ESTETICHE)
    .map((k) => `<option>${escapeHtml(k)}</option>`)
    .join("");

  el.toggleAdv.onclick = () => {
    const aperto = el.avanzati.style.display === "none";
    el.avanzati.style.display = aperto ? "block" : "none";
    el.toggleAdv.classList.toggle("on", aperto);
  };

  for (const tag of TAGS) {
    const chip = document.createElement("button");
    chip.className = "chip tag";
    chip.textContent = tag;
    chip.onclick = () => {
      const aCapo = el.lyrics.value && !el.lyrics.value.endsWith("\n") ? "\n" : "";
      inserisciAlCursore(el.lyrics, aCapo + tag + "\n");
    };
    el.tags.appendChild(chip);
  }

  disegnaPresets();

  el.go.onclick = async () => {
    el.error.style.display = "none";
    const quanti = Math.max(1, Math.min(10, parseInt(el.batch.value) || 1));
    for (let i = 0; i < quanti; i++) {
      // Dal secondo in poi i seed cambiano comunque: dieci brani identici non
      // sono dieci brani.
      if (el.randomSeed.checked || i > 0) {
        el.seed_text.value = rnd();
        el.seed_audio.value = rnd();
      }
      const p = leggiModulo();
      if (!p.caption) return mostraErrore("Scrivi almeno uno stile.");
      try {
        await creaBrano(p);
      } catch (e) {
        return mostraErrore(String(e.message || e));
      }
    }
  };

  el.goAudio.onclick = async () => {
    el.error.style.display = "none";
    el.seed_audio.value = rnd();
    const p = leggiModulo();
    if (!p.caption) return mostraErrore("Scrivi almeno uno stile.");
    p.titolo = p.titolo || titoloAuto(p.lyrics, p.caption);
    try {
      aggiungiLavoro(await ponte.invia(grafoBrano(p)), p);
    } catch (e) {
      mostraErrore(String(e.message || e));
    }
  };
}
