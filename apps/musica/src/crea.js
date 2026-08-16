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
import { QUALITA, grafoBrano, grafoImmagine, promptCopertina, titoloAuto } from "./grafi.js";
import { aggiungiLavoro } from "./coda.js";
import * as ponte from "./ponte.js";

const CHIAVE_STILI = "daprod.stili";
const CHIAVE_QUALITA = "daprod.musica.qualita";

/** Con quale dei due modelli di diffusione si genera. */
export function qualitaScelta() {
  const salvata = localStorage.getItem(CHIAVE_QUALITA);
  return QUALITA[salvata] ? salvata : "leggera";
}

/**
 * Il menu della qualità, e cosa fare se quel modello non c'è.
 *
 * Stessa strada di DaProdFoto: la pagina non indovina cosa c'è sul disco, lo
 * chiede alla suite e, se manca, lo scarica da qui. Sono 2,5 GB, non 12: la
 * differenza è che qui si cambia **solo** il modello che fa il suono.
 */
async function collegaQualita() {
  el.qualita.innerHTML = Object.values(QUALITA)
    .map((q) => `<option value="${q.id}">${escapeHtml(q.nome)}</option>`)
    .join("");
  el.qualita.value = qualitaScelta();

  const controlla = async () => {
    const scelta = QUALITA[el.qualita.value];
    el.rigaQualita.textContent = scelta.riga;
    const stato = await ponte.statoModelli(scelta.catalogo).catch(() => null);

    if (!stato || stato.pronto) {
      el.mancaQualita.hidden = true;
      return;
    }
    el.mancaQualita.hidden = false;
    el.mancaQualita.innerHTML =
      `<b>${escapeHtml(scelta.nome)} non è ancora sul disco.</b>` +
      ` <button class="mini" id="prendiQualita">Scarica ${(stato.bytesMancanti / 1024 ** 3)
        .toFixed(1)
        .replace(".", ",")} GB</button>`;
    document.getElementById("prendiQualita").onclick = () => {
      el.mancaQualita.textContent = "Scarico… l'avanzamento è nell'hub.";
      void ponte.scaricaModelli(scelta.catalogo);
    };
  };

  el.qualita.onchange = () => {
    localStorage.setItem(CHIAVE_QUALITA, el.qualita.value);
    void controlla();
  };
  ponte.suAvanzamentoModelli((a) => {
    if (!a.attivo) void controlla();
  });
  await controlla();
}

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
    qualita: qualitaScelta(),
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

  // **Prima la copertina, poi il brano.** Venti secondi contro dieci minuti:
  // così l'artwork lo vedi subito, mentre la musica lavora, invece di guardare
  // un rettangolo vuoto per tutto il tempo.
  //
  // L'ordine era stato invertito quando i brani morivano con `'RVQDepthDecoder'
  // object has no attribute '_v_block'`, dando la colpa alla VRAM che Anima
  // lasciava occupata. Non era quello: era un difetto di ComfyUI 0.33.0, che la
  // 0.33.1 corregge. La memoria video si svuota lo stesso fra le due, che è
  // gratis e toglie di mezzo il dubbio.
  await ponte.svuotaVram();

  let idCopertina = null;
  if (el.autoCover.checked) {
    const prompt = promptCopertina(p.titolo, p.lyrics, el.coverStyleNew.value);
    idCopertina = await ponte.invia(grafoImmagine(prompt, rnd()));
  }

  // `conCopertina` dice alla coda che c'è una copertina per questo brano: se
  // arriva prima gli si attacca da sé, se arriva dopo lo ritrova in libreria.
  const idBrano = await ponte.invia(grafoBrano(p));
  aggiungiLavoro(idBrano, p, { conCopertina: el.autoCover.checked });

  if (idCopertina) {
    aggiungiLavoro(idCopertina, { titolo: p.titolo }, { specie: "copertina", branoDi: idBrano });
  }
}

/* ------------------------------------------------------------ collegamenti */

export function collegaCrea() {
  void collegaQualita();
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
  // "nessuno" per primo, ed è quello che parte: uno stile scelto da noi su ogni
  // copertina le fa somigliare tutte, e non è una cosa che si nota subito.
  el.coverStyleNew.innerHTML = [
    `<option value="">nessuno</option>`,
    ...Object.keys(ESTETICHE).map((k) => `<option>${escapeHtml(k)}</option>`),
  ].join("");
  el.coverStyleNew.value = "";

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
