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
import { MODELLI, grafoBrano, grafoImmagine, modello, promptCopertina, titoloAuto, usaCampo } from "./grafi.js";
import { LINGUA_PREDEFINITA, LINGUE, TONALITA, TONALITA_PREDEFINITA } from "./dati/ace.js";
import { aggiungiLavoro } from "./coda.js";
import { controllaAnima } from "./anima.js";
// La barra di quello che sta arrivando: uguale in tutte le app, quindi sta in
// `packages/ui` e la suite la serve sotto `/comune/`.
import { collegaScaricamento } from "/comune/scaricamento.js";
import * as ponte from "./ponte.js";

const CHIAVE_STILI = "daprod.stili";
/**
 * La chiave è ancora `.qualita` e non `.modello`.
 *
 * Il menu adesso sceglie il modello, ma quello che c'è scritto dentro è ancora
 * un id valido. Cambiare nome alla chiave vorrebbe dire che chi aggiorna si
 * ritrova la scelta azzerata, e in cambio di niente: un nome più bello dentro
 * `localStorage`, che non guarda nessuno.
 */
const CHIAVE_QUALITA = "daprod.musica.qualita";
const CHIAVE_LINGUA = "daprod.musica.lingua";

/**
 * Con quale modello si genera.
 *
 * `leggera` era il MiniMax a 4 bit, tolto nella 0.4.1: chi l'aveva scelto
 * finisce sull'int8, che è lo stesso modello meglio quantizzato, e non sul
 * primo della lista — aveva scelto MiniMax, e MiniMax resta.
 */
export function modelloScelto() {
  const salvato = localStorage.getItem(CHIAVE_QUALITA);
  if (salvato === "leggera") return "migliore";
  return MODELLI[salvato] ? salvato : "ace-turbo";
}

/** In che lingua si canta. Vale per tutti e due i modelli, in due modi diversi. */
export function linguaScelta() {
  const salvata = localStorage.getItem(CHIAVE_LINGUA);
  return LINGUE.some((l) => l.id === salvata) ? salvata : LINGUA_PREDEFINITA;
}

/**
 * Il menu dei modelli, e cosa fare se quel modello non c'è.
 *
 * Stessa strada di DaProdFoto: la pagina non indovina cosa c'è sul disco, lo
 * chiede alla suite e, se manca, lo scarica da qui.
 *
 * Cambiare modello cambia anche **cosa si vede negli avanzati**: MiniMax ha il
 * Top-K del suo decoder, ACE-Step ha battito, tonalità, tempo e lingua. Mostrare
 * a ognuno i comandi dell'altro vorrebbe dire cursori che non fanno niente, che
 * è il modo più veloce di far perdere fiducia a chi li muove.
 */
async function collegaModelli() {
  el.qualita.innerHTML = Object.values(MODELLI)
    .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`)
    .join("");
  el.qualita.value = modelloScelto();

  el.tonalita.innerHTML = TONALITA.map(
    ([v, etichetta]) => `<option value="${v}">${escapeHtml(etichetta)}</option>`,
  ).join("");
  el.tonalita.value = TONALITA_PREDEFINITA;

  // Il riquadro «manca, e questi sono i GB» con dentro la barra: non lo disegna
  // più questa pagina, lo disegna il pezzo comune. Prima qui c'era scritto
  // «l'avanzamento è nell'hub», che vuol dire chiudere quello che stai facendo
  // per sapere se sta arrivando qualcosa.
  const scaricamento = collegaScaricamento(el.mancaQualita, {
    stato: ponte.statoModelli,
    scarica: ponte.scaricaModelli,
    annulla: ponte.annullaScaricamento,
    onAvanzamento: ponte.suAvanzamentoModelli,
    io: ponte.io,
  });

  const controlla = async () => {
    const scelto = modello(el.qualita.value);
    el.rigaQualita.textContent = scelto.riga;
    mostraCampi(scelto);
    disegnaLingue(scelto);
    await scaricamento.controlla({ ids: scelto.catalogo, nome: scelto.nome });
  };

  el.qualita.onchange = () => {
    localStorage.setItem(CHIAVE_QUALITA, el.qualita.value);
    void controlla();
  };
  await controlla();
}

/**
 * Le pastiglie della lingua, e cosa succede davvero premendole.
 *
 * Stanno sopra il testo e non dentro gli avanzati perché è lì che uno ci pensa:
 * scrivi il testo, e la lingua è una proprietà di quello che hai scritto. Prima
 * erano un menu a tendina in fondo ai parametri avanzati, visibile solo con
 * ACE-Step scelto — cioè invisibile proprio a chi aveva il problema.
 *
 * La riga sotto cambia con il modello e non è pignoleria: con ACE-Step è
 * un'impostazione che il nodo riceve, con MiniMax è una frase che finisce nella
 * descrizione. Sono due cose diverse e chi le usa merita di saperlo.
 */
function disegnaLingue(m) {
  const scelta = linguaScelta();
  el.lingue.innerHTML = "";

  for (const lingua of LINGUE) {
    const chip = document.createElement("button");
    chip.className = "chip" + (lingua.id === scelta ? " on" : "");
    chip.textContent = lingua.nome;
    chip.onclick = () => {
      localStorage.setItem(CHIAVE_LINGUA, lingua.id);
      disegnaLingue(m);
    };
    el.lingue.appendChild(chip);
  }

  el.notaLingua.innerHTML =
    m.lingua === "impostazione"
      ? "<b>ACE-Step</b> la riceve come impostazione: canta nella lingua che scegli qui."
      : "<b>MiniMax Music 3</b> non ha una casella per la lingua: la aggiungo alla descrizione dello " +
        "stile insieme alla richiesta di scandire le parole. Aiuta, ma non è un interruttore.";
}

/**
 * Mostra i comandi che questo modello usa davvero, e sposta i passi sui suoi.
 *
 * I passi non sono un gusto: trenta a un modello turbo da otto passi vogliono
 * dire quattro volte il tempo per la stessa canzone. Quindi cambiando modello il
 * cursore si riposiziona sul valore giusto per lui — a meno che tu non l'abbia
 * spostato a mano restando nel suo intervallo, nel qual caso è una tua scelta e
 * si rispetta.
 */
function mostraCampi(m) {
  for (const riquadro of document.querySelectorAll("#avanzati [data-campo]")) {
    riquadro.hidden = !usaCampo(m, riquadro.dataset.campo);
  }
  const passi = m.passi;
  const ora = parseInt(el.steps.value);
  el.steps.min = passi.min;
  el.steps.max = passi.max;
  if (!(ora >= passi.min && ora <= passi.max)) el.steps.value = passi.valore;
  el.steps.dispatchEvent(new Event("input"));
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
    qualita: modelloScelto(),
    // I quattro di ACE-Step. Si leggono sempre, anche con MiniMax scelto: costa
    // niente, e vuol dire che riaprendo un brano vecchio i suoi valori tornano
    // al loro posto invece di sparire.
    bpm: parseInt(el.bpm.value) || 120,
    tonalita: el.tonalita.value,
    tempo: el.tempo.value,
    // La lingua invece si legge sempre e vale per tutti e due: ACE-Step la
    // riceve come impostazione, MiniMax se la ritrova nella descrizione.
    lingua: linguaScelta(),
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
  if (meta.bpm) el.bpm.value = meta.bpm;
  if (meta.tonalita) el.tonalita.value = meta.tonalita;
  if (meta.tempo) el.tempo.value = meta.tempo;
  if (meta.lingua && LINGUE.some((l) => l.id === meta.lingua)) {
    localStorage.setItem(CHIAVE_LINGUA, meta.lingua);
    disegnaLingue(modello(modelloScelto()));
  }
  el.randomSeed.checked = false;
  // Le etichette dei cursori si aggiornano su "input": senza questo, i numeri
  // resterebbero quelli di prima mentre i cursori si sono già mossi.
  for (const k of ["duration", "steps", "cfg", "cfg_scale", "top_k", "bpm"]) {
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
  // **Prima di tutto, via il modello che scrive.** Fra "Bonsai mi finisce il
  // testo" e "Crea" passano pochi secondi: senza questo, i suoi quattro GB e
  // mezzo sono ancora in memoria quando il modello musicale ne chiede cinque e
  // mezzo, e su una scheda da 8 non ci stanno insieme.
  await ponte.liberaMemoriaLlm();
  await ponte.svuotaVram();

  let idCopertina = null;
  if (el.autoCover.checked) {
    // Se Bonsai (o tu) hai scritto un'idea per la copertina, quella vince: è
    // scritta guardando la canzone intera, mentre i motivi la indovinano da
    // qualche parola del testo.
    const idea = el.ideaCopertina.value.trim();
    const prompt = idea
      ? `album cover artwork, ${idea}, square composition, no text`
      : promptCopertina(p.titolo, p.lyrics, el.coverStyleNew.value);
    idCopertina = await ponte.invia(grafoImmagine(prompt, rnd()));
  }

  // `conCopertina` dice alla coda che c'è una copertina per questo brano: se
  // arriva prima gli si attacca da sé, se arriva dopo lo ritrova in libreria.
  const idBrano = await ponte.invia(grafoBrano(modello(p.qualita), p));
  aggiungiLavoro(idBrano, p, { conCopertina: el.autoCover.checked });

  if (idCopertina) {
    aggiungiLavoro(idCopertina, { titolo: p.titolo }, { specie: "copertina", branoDi: idBrano });
  }
}

/* ------------------------------------------------------------ collegamenti */

/**
 * La copertina si genera con Anima, che non è fra i modelli obbligatori di
 * questa scheda: se non c'è, l'interruttore si spegne e sotto compare come
 * prenderla. Prima spuntava allegramente e il brano usciva senza copertina, con
 * un errore del motore in inglese dentro un log.
 */
async function collegaCopertina() {
  const controlla = async () => {
    const pronta = await controllaAnima(el.mancaAnimaCrea, null);
    el.autoCover.disabled = !pronta;
    if (!pronta) el.autoCover.checked = false;
  };
  await controlla();
  ponte.suAvanzamentoModelli((a) => {
    if (!a.attivo) void controlla();
  });
}

export function collegaCrea() {
  void collegaModelli();
  void collegaCopertina();
  legaValore("duration", "durVal", (v) => `${v} s`);
  legaValore("steps", "stepsVal");
  legaValore("cfg", "cfgVal");
  legaValore("cfg_scale", "cfgsVal");
  legaValore("top_k", "topkVal");
  legaValore("bpm", "bpmVal", (v) => `${v} BPM`);

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
      aggiungiLavoro(await ponte.invia(grafoBrano(modello(p.qualita), p)), p);
    } catch (e) {
      mostraErrore(String(e.message || e));
    }
  };
}
