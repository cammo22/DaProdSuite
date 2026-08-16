/* DaProdDream — interfaccia.
   Regola numero uno: scegli una sorgente e parte, senza premere altro.
   Il prompt agisce mentre lo scrivi; il resto è dettaglio. */

// Un elemento che sparisce dall'HTML non deve fermare l'aggiornamento dello
// stato: si restituisce un oggetto muto invece di null.
const NULLO = { textContent: '', value: '', style: {}, classList: { toggle() {}, add() {}, remove() {}, contains: () => false } };
const $ = (s) => document.querySelector(s) || NULLO;
const $$ = (s) => Array.from(document.querySelectorAll(s));

const S = {
  kind: 'webcam',
  running: false,
  streaming: false,
  compare: false,
  presets: [],
  prompts: [],
  modelloCarico: false,
  modes: {},
  touched: 0,      // ultima modifica locale: il server non deve sovrascrivermi sotto le dita
  comparePos: 0.5,
  galleria: [],
  filtro: 'tutto',
  apertoOra: null,
  tabAttiva: 'sogna',
  semeSogno: 0,
};

/* ────────────────────────────── rete ────────────────────────────── */

async function api(path, body, method) {
  const opt = { method: method || (body !== undefined ? 'POST' : 'GET') };
  if (body !== undefined) {
    opt.headers = { 'Content-Type': 'application/json' };
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(path, opt);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

let toastTimer;
function toast(text, isError) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.toggle('err', !!isError);
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 3000);
}

/* ─────────────────────── parametri dal vivo ─────────────────────── */

let inSospeso = {};
let timerParam;
function invia(patch, subito) {
  Object.assign(inSospeso, patch);
  S.touched = Date.now();
  $$('.live').forEach((d) => d.classList.add('on'));
  clearTimeout(timerParam);
  const spedisci = async () => {
    const body = inSospeso;
    inSospeso = {};
    if (!Object.keys(body).length) return;
    try { mostraStato(await api('/api/parametri', body)); }
    catch (e) { toast(e.message, true); }
    finally { setTimeout(() => $$('.live').forEach((d) => d.classList.remove('on')), 150); }
  };
  // 120 ms: abbastanza per non inviare a ogni tasto, poco per sembrare immediato.
  timerParam = setTimeout(spedisci, subito ? 0 : 120);
}

/* ──────────────────────────── sorgente ──────────────────────────── */

function corpoSorgente() {
  return {
    kind: S.kind,
    device_index: parseInt($('#webcam-select').value || '0', 10),
    path: $('#file-path').value.trim(),
    monitor: parseInt($('#monitor-select').value || '1', 10),
    loop_video: $('#loop').checked,
    mirror: $('#mirror').checked,
  };
}

async function avvia() {
  if ((S.kind === 'video' || S.kind === 'immagine') && !$('#file-path').value.trim()) {
    sfoglia();  // manca il file: lo chiedo subito invece di dare un errore
    return;
  }
  accendiFlussi();
  try { mostraStato(await api('/api/avvia', { source: corpoSorgente() })); }
  catch (e) { toast(e.message, true); }
}

function scegliSorgente(kind) {
  S.kind = kind;
  $$('.source').forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
  $$('[data-for]').forEach((el) => {
    el.classList.toggle('hidden', !el.dataset.for.split(' ').includes(kind));
  });
  avvia();
}

async function sfoglia() {
  try {
    const r = await api('/api/sfoglia', { tipo: S.kind === 'immagine' ? 'immagine' : 'video' });
    if (!r.path) return;
    $('#file-path').value = r.path;
    $('#file-nome').textContent = r.path.split(/[\\/]/).pop();
    $('#file-nome').classList.remove('muted');
    avvia();
  } catch (e) {
    toast('Finestra file non disponibile.', true);
  }
}

async function caricaSorgenti(refresh) {
  try {
    const d = await api('/api/sorgenti' + (refresh ? '?refresh=true' : ''));
    const sel = $('#webcam-select');
    const prima = sel.value;
    sel.innerHTML = d.webcams.length
      ? d.webcams.map((c) =>
          `<option value="${c.index}"${c.virtuale ? ' data-virtuale="1"' : ''}>${c.name}${c.virtuale ? ' (virtuale)' : ''}</option>`
        ).join('')
      : '<option value="0">Nessuna webcam trovata</option>';
    if (prima && sel.querySelector(`option[value="${prima}"]`)) sel.value = prima;
    $('#monitor-select').innerHTML = d.monitors
      .map((m) => `<option value="${m.index}">${m.name}${m.width ? ` · ${m.width}x${m.height}` : ''}</option>`)
      .join('');
  } catch (e) { /* il motore sta ancora partendo */ }
}

/* ───────────────────────────── modelli ──────────────────────────── */

async function caricaModelli() {
  const d = await api('/api/modelli');
  S.modes = d.modes;
  $('#model-select').innerHTML = d.models.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
  const risoluzioni = d.resolutions.map((r) => `<option value="${r}">${r}</option>`).join('');
  $('#resolution').innerHTML = risoluzioni;
  $('#resolution-sogno').innerHTML = risoluzioni;

  const box = $('#lora-list');
  if (!d.loras.length) {
    box.innerHTML = '<div class="muted small">Metti i .safetensors in models/loras</div>';
  } else {
    box.innerHTML = d.loras.map((l) => `
      <div class="lora-row">
        <label class="check" style="margin:0"><input type="checkbox" data-lora="${l.name}"> ${l.name}</label>
        <input type="range" data-lora-w="${l.name}" min="0" max="1.5" step="0.05" value="0.8">
      </div>`).join('');
    box.oninput = () => invia({
      loras: $$('[data-lora]').filter((c) => c.checked).map((c) => ({
        name: c.dataset.lora,
        weight: parseFloat($(`[data-lora-w="${c.dataset.lora}"]`).value),
      })),
    }, true);
  }
}

/* ───────────────────────────── sogni ────────────────────────────── */

/* ─────────────────────── prompt: dado e archivio ────────────────────── */

function scriviPrompt(testo, negativo) {
  ['#prompt', '#prompt-sogno'].forEach((sel) => {
    const p = $(sel);
    p.value = testo;
    p.style.height = 'auto';
    p.style.height = Math.min(p.scrollHeight, 110) + 'px';
  });
  const patch = { prompt: testo };
  if (negativo) {
    patch.negative_prompt = negativo;
    ['#negative', '#negative-sogno'].forEach((s2) => { $(s2).value = negativo; });
  }
  invia(patch, true);
}

async function promptCasuale() {
  try {
    const r = await api('/api/prompt/casuale');
    scriviPrompt(r.prompt, r.negative_prompt);
    toast(r.etichetta);
  } catch (e) { toast(e.message, true); }
}


/* ───────────────────────────── modello ──────────────────────────────── */

async function modello(azione) {
  try {
    mostraStato(await api('/api/modello/' + azione, {}));
    toast(azione === 'carica' ? 'Carico il modello…' : 'Modello scaricato.');
  } catch (e) { toast(e.message, true); }
}

async function caricaSogni(attivo) {
  const d = await api('/api/sogni');
  S.presets = d.presets;
  $('#preset-grid').innerHTML = d.presets.map((p) => `
    <button class="preset${p.name === attivo ? ' active' : ''}" data-preset="${p.name}">
      <span class="nome">${p.name}</span><span class="x" data-elimina="${p.name}">✕</span>
    </button>`).join('');
  $('#preset-grid-sogno').innerHTML = d.presets.map((p) => `
    <button class="preset" data-preset="${p.name}"><span class="nome">${p.name}</span></button>`).join('');
}

/* ──────────────────────────── flussi ────────────────────────────── */

// Mai `img.src = ''`: per il browser vuol dire "carica la pagina come immagine",
// e resta l'icona di immagine rotta finché non si ricarica tutto. Va staccato
// l'attributo.
function staccaImmagine(sel) {
  const el = $(sel);
  if (el) el.removeAttribute('src');
}

function attaccaImmagine(sel, percorso) {
  const el = $(sel);
  if (!el) return;
  el.src = `${percorso}?t=${Date.now()}`;
  // Se il flusso cade (motore riavviato, scheda cambiata) ci si riattacca da soli.
  el.onerror = () => {
    el.removeAttribute('src');
    setTimeout(() => {
      if (S.streaming) el.src = `${percorso}?t=${Date.now()}`;
    }, 700);
  };
}

function accendiFlussi() {
  const out = $('#img-output');
  if (S.streaming && out.getAttribute('src')) return;
  attaccaImmagine('#img-output', '/stream/visione');
  attaccaImmagine('#img-compare', '/stream/sorgente');
  attaccaImmagine('#img-input', '/stream/sorgente');
  $('#img-input').classList.add('on');
  $('#input-empty').classList.add('hidden');
  S.streaming = true;
}

function spegniFlussi() {
  ['#img-output', '#img-compare', '#img-input'].forEach((id) => {
    staccaImmagine(id);
    $(id).classList.remove('on');
  });
  $('#input-empty').classList.remove('hidden');
  S.streaming = false;
}

/* ──────────────────────────── comandi ───────────────────────────── */

async function ferma() {
  try { mostraStato(await api('/api/ferma', {})); } catch (e) {}
  spegniFlussi();
}

async function pausa() {
  try { mostraStato(await api(S.running ? '/api/pausa' : '/api/avvia', S.running ? {} : { source: corpoSorgente() })); }
  catch (e) { toast(e.message, true); }
}

async function registra() {
  try {
    const r = await api('/api/registra', { azione: 'toggle' });
    if (!r.recording) { toast('Video salvato nella Galleria.'); caricaGalleria(); }
  } catch (e) { toast(e.message, true); }
}

async function foto() {
  try {
    await api('/api/schermata', {});
    toast('Foto salvata nella Galleria.');
    caricaGalleria();
  } catch (e) { toast(e.message, true); }
}

/* ─────────────────────── confronto prima/dopo ───────────────────── */

function confronto(on) {
  S.compare = on;
  $('#btn-confronto').classList.toggle('on', on);
  $('#img-compare').classList.toggle('hidden', !on);
  $('#compare-handle').classList.toggle('hidden', !on);
  if (on) taglia(S.comparePos);
}

function taglia(frac) {
  S.comparePos = Math.min(0.98, Math.max(0.02, frac));
  const out = $('#img-output');
  const r = out.getBoundingClientRect();
  const v = $('#viewer').getBoundingClientRect();
  const c = $('#img-compare');
  c.style.width = r.width + 'px';
  c.style.height = r.height + 'px';
  c.style.clipPath = `inset(0 ${(1 - S.comparePos) * 100}% 0 0)`;
  $('#compare-handle').style.left = (r.left - v.left + r.width * S.comparePos) + 'px';
}

/* ─────────────────────────── sogno libero ───────────────────────── */

function corpoSogno() {
  return {
    kind: 'sogno',
    movimento: +$('#movimento').value,
    raggio: +$('#raggio').value,
    seme_sogno: S.semeSogno || 0,
  };
}

async function sognaLibero() {
  S.tabAttiva = 'sogno';
  attaccaImmagine('#img-sogno', '/stream/visione');
  S.streaming = true;
  try {
    mostraStato(await api('/api/avvia', { source: corpoSogno() }));
  } catch (e) { toast(e.message, true); }
}

async function ricominciaSogno() {
  S.semeSogno = Math.floor(Math.random() * 1e6);
  try {
    // fermare e riavviare ricrea la sorgente: riparte da un'immagine nuova
    await api('/api/ferma', {});
    await api('/api/avvia', { source: corpoSogno() });
    toast('Riparto da capo.');
  } catch (e) { toast(e.message, true); }
}

/* ──────────────────────────── galleria ──────────────────────────── */

async function caricaGalleria() {
  try {
    const d = await api('/api/galleria');
    S.galleria = d.elementi;
    $('#conta-galleria').textContent = d.elementi.length ? d.elementi.length : '';
    disegnaGalleria();
  } catch (e) {}
}

function quando(iso) {
  const d = new Date(iso);
  const oggi = new Date();
  const stessoGiorno = d.toDateString() === oggi.toDateString();
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return stessoGiorno ? `oggi ${ora}` : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) + ' ' + ora;
}

function disegnaGalleria() {
  const items = S.galleria.filter((v) => S.filtro === 'tutto' || v.tipo === S.filtro);
  $('#galleria-vuota').classList.toggle('hidden', items.length > 0);
  $('#griglia').innerHTML = items.map((v, i) => `
    <div class="card" data-apri="${v.tipo}/${v.nome}">
      <div class="miniatura">
        ${v.poster ? `<img src="${v.poster}" loading="lazy" alt="">` : ''}
        ${v.tipo === 'video' ? '<div class="play">▶</div>' : ''}
        ${v.tipo === 'video' && v.secondi ? `<div class="durata">${Math.round(v.secondi)}s</div>` : ''}
      </div>
      <div class="piede"><b>${v.tipo === 'video' ? 'Video' : 'Foto'}</b><span>${quando(v.quando)} · ${v.mb} MB</span></div>
    </div>`).join('');
}

function apriVisore(chiave) {
  const v = S.galleria.find((x) => `${x.tipo}/${x.nome}` === chiave);
  if (!v) return;
  S.apertoOra = v;
  $('#visore-corpo').innerHTML = v.tipo === 'video'
    ? `<video src="${v.url}" controls autoplay loop></video>`
    : `<img src="${v.url}" alt="${v.nome}">`;
  $('#visore-nome').textContent = `${v.nome} · ${quando(v.quando)} · ${v.mb} MB`;
  $('#visore').classList.remove('hidden');
}

function chiudiVisore() {
  $('#visore').classList.add('hidden');
  $('#visore-corpo').innerHTML = '';  // ferma il video
  S.apertoOra = null;
}

/* ──────────────────────────── stato ─────────────────────────────── */

function mostraStato(st) {
  if (!st) return;
  const running = st.state === 'esecuzione';
  const paused = st.state === 'pausa';
  const carica = st.state === 'caricamento';
  S.running = running;

  $('#state-dot').className = 'dot ' + ({ esecuzione: 'run', caricamento: 'load', errore: 'err', pausa: 'pause' }[st.state] || '');
  // il messaggio racconta l'ultima cosa successa: dopo qualche secondo
  // non è più notizia e lascia il posto allo stato attuale
  const fresco = (st.message_age ?? 99) < 6 || st.state === 'errore' || st.state === 'caricamento';
  const riassunto = {
    esecuzione: 'In sogno · ' + (st.source.label || ''),
    pausa: 'In pausa',
    fermo: 'Fermo',
  }[st.state] || '';
  $('#message').textContent = (fresco ? st.message : riassunto) || '';

  $('#btn-pausa').disabled = !running && !paused;
  $('#btn-pausa').textContent = paused ? 'Riprendi' : 'Pausa';
  $('#btn-ferma').disabled = st.state === 'fermo';

  const m = st.metrics;
  $('#m-fps').textContent = m.fps.toFixed(1) + ' fps';
  $('#m-ms').textContent = Math.round(m.frame_ms) + ' ms';
  $('#m-util').textContent = m.gpu_util + '%';
  $('#m-frames').textContent = m.frames;
  $('#hud-fps').textContent = m.fps.toFixed(1);
  $('#hud-ms').textContent = Math.round(m.frame_ms);
  $('#hud').classList.toggle('on', running && m.frames > 0);
  $('#capture-fps').textContent = (st.source.capture_fps || 0).toFixed(0) + ' fps';
  $('#source-label').textContent = st.source.label || '—';
  if (m.vram_total_mb) {
    const gb = (v) => (v / 1024).toFixed(1);
    $('#m-vram').textContent = `${gb(m.vram_used_mb)} / ${gb(m.vram_total_mb)} GB`;
    const pct = Math.min(100, (m.vram_used_mb / m.vram_total_mb) * 100);
    $('#vram-bar').style.width = pct + '%';
    $('#vram-bar').classList.toggle('hot', pct > 85);
  }
  $('#m-model').textContent = st.backend.model_label || '—';
  $('#gpu-name').textContent = st.gpu.name + (st.gpu.cuda ? '' : ' (senza CUDA)');

  // stato del modello: caricato, in caricamento o assente
  S.modelloCarico = !!st.backend.ready;
  const stato = $('#modello-stato');
  stato.textContent = st.loading ? 'caricamento in corso…'
    : (st.backend.ready
        ? 'modello pronto' + (st.backend.profondita ? ' + profondità' : '')
        : 'modello non caricato');
  stato.classList.toggle('carico', !!st.backend.ready && !st.loading);
  $('#btn-modello').textContent = st.backend.ready ? 'Scarica' : 'Carica';
  $('#btn-modello').disabled = !!st.loading;

  $('#imp-modello-nome').textContent = st.backend.model_label || 'SD-Turbo';
  $('#imp-modello-stato').textContent = st.loading
    ? `caricamento ${st.load_pct || 0}%`
    : (st.backend.ready ? 'caricato in GPU' + (st.backend.profondita ? ' · con profondità' : '') : 'non caricato');
  $('#imp-barra').style.width = (st.loading ? (st.load_pct || 0) : (st.backend.ready ? 100 : 0)) + '%';
  $('#imp-carica').disabled = !!st.loading || !!st.backend.ready;
  $('#imp-scarica').disabled = !!st.loading || !st.backend.ready;
  $('#imp-vram').textContent = m.vram_total_mb
    ? `VRAM ${(m.vram_used_mb / 1024).toFixed(1)} di ${(m.vram_total_mb / 1024).toFixed(1)} GB`
    : '—';
  if (st.traduzione) {
    $('#imp-traduci').checked = st.traduzione.attiva;
    $('#imp-tradotto').textContent = st.traduzione.testo
      || (st.traduzione.attiva ? 'il prompt è già in inglese' : 'traduzione spenta');
  }

  const rec = st.recording;
  $('#rec-badge').classList.toggle('hidden', !rec.active);
  $('#rec-time').textContent = Math.round(rec.seconds) + 's';
  $('#btn-rec').classList.toggle('rec-on', rec.active);
  $('#btn-rec').textContent = rec.active ? '■ Stop' : '● Registra';

  // profondità e avanzamento del caricamento
  $('#prof-badge').classList.toggle('hidden', !st.backend.profondita);
  const barra = $('#barra-carico');
  barra.classList.toggle('hidden', !st.loading);
  barra.firstElementChild.style.width = (st.load_pct || 0) + '%';

  // scheda Sogno libero
  const inSogno = st.source.kind === 'sogno';
  $('#state-dot-sogno').className = $('#state-dot').className;
  $('#message-sogno').textContent = $('#message').textContent;
  $('#m-fps-sogno').textContent = m.fps.toFixed(1) + ' fps';
  $('#m-vram-sogno').textContent = $('#m-vram').textContent;
  $('#hud-fps-sogno').textContent = m.fps.toFixed(1);
  $('#hud-sogno').classList.toggle('on', running && m.frames > 0 && inSogno);
  $('#rec-badge-sogno').classList.toggle('hidden', !rec.active);
  $('#rec-time-sogno').textContent = Math.round(rec.seconds) + 's';
  $('#btn-rec-sogno').classList.toggle('on', rec.active);
  $('#btn-rec-sogno').textContent = rec.active ? '■ Stop' : '● Registra';
  $('#btn-ferma-sogno').disabled = st.state === 'fermo';
  $('#btn-sogna-libero').textContent = inSogno && running ? 'Sto sognando' : 'Comincia a sognare';
  const visioneSogno = inSogno && m.frames > 0 && S.tabAttiva === 'sogno';
  $('#sogno-empty').classList.toggle('hidden', visioneSogno);
  $('#img-sogno').classList.toggle('on', visioneSogno);
  $('#sogno-spinner').classList.toggle('on', inSogno && !!st.loading);

  if (running || paused || carica) accendiFlussi();
  const visione = S.streaming && m.frames > 0;
  $('#viewer-empty').classList.toggle('hidden', visione);
  $('#img-output').classList.toggle('on', visione);
  $('#spinner').classList.toggle('on', (carica || st.loading) && !visione);
  if (!visione) {
    if (st.state === 'errore') {
      $('#viewer-title').textContent = 'Qualcosa non va';
      $('#viewer-hint').textContent = st.error || st.message;
    } else if (carica || st.loading) {
      $('#viewer-title').textContent = st.loading ? 'Preparo il modello' : 'Apro la sorgente';
      $('#viewer-hint').textContent = st.message;
    } else if (st.state === 'fermo') {
      $('#viewer-title').textContent = 'Scegli una sorgente qui a sinistra';
      $('#viewer-hint').textContent = 'Parte da sola: non devi premere niente.';
    }
  }
  if (S.compare && visione) taglia(S.comparePos);

  // i controlli non si toccano se l'utente ci ha messo mano da poco
  if (Date.now() - S.touched < 1500) return;
  const p = st.params;
  valore('#prompt', p.prompt);
  valore('#negative', p.negative_prompt);
  valore('#negative-sogno', p.negative_prompt);
  valore('#strength', p.strength); $('#strength-val').textContent = (+p.strength).toFixed(2);
  valore('#steps', p.steps); $('#steps-val').textContent = p.steps;
  if (S.tabAttiva !== 'sogno') {
    valore('#guidance', p.guidance);
    $('#guidance-val').textContent = (+p.guidance).toFixed(1);
  }
  valore('#blend', p.temporal_blend); $('#blend-val').textContent = (+p.temporal_blend).toFixed(2);
  valore('#prompt-sogno', p.prompt);
  valore('#steps-sogno', p.steps);
  $('#steps-sogno-val').textContent = p.steps;
  // ogni scheda tiene la sua forza dello stile: sincronizzo solo quella aperta
  if (S.tabAttiva === 'sogno') {
    valore('#guidance-sogno', p.guidance);
    $('#guidance-sogno-val').textContent = (+p.guidance).toFixed(1);
  }
  valore('#resolution-sogno', p.resolution);
  valore('#movimento', st.source.movimento);
  $('#movimento-val').textContent = (+(st.source.movimento ?? 0.35)).toFixed(2);
  valore('#seed', p.seed);
  valore('#resolution', p.resolution);
  valore('#model-select', p.model);
  $('#soggetto').checked = p.soggetto;
  $('#soggetto-field').classList.toggle('hidden', !p.soggetto);
  valore('#protezione', p.protezione);
  $('#protezione-val').textContent = (+p.protezione).toFixed(2);
  $('#depth').checked = p.depth;
  $('#depth-field').classList.toggle('hidden', !p.depth);
  valore('#depth-scale', p.depth_scale);
  $('#depth-val').textContent = (+p.depth_scale).toFixed(1);
  $('#fast-vae').checked = p.fast_vae;
  $$('#mode-seg button').forEach((b) => b.classList.toggle('active', b.dataset.mode === p.mode));
  const mode = S.modes[p.mode];
  $('#mode-hint').textContent = `${p.resolution} · ${p.steps} step${mode ? ' · ' + mode.fps : ''}`;
}

function valore(sel, v) {
  const el = $(sel);
  if (el && document.activeElement !== el && String(el.value) !== String(v)) el.value = v;
}

function connetti() {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (ev) => mostraStato(JSON.parse(ev.data));
  ws.onclose = () => setTimeout(connetti, 1200);
  ws.onerror = () => ws.close();
}

/* ──────────────────────────── eventi ────────────────────────────── */

function collega() {
  // schede
  $$('.tab').forEach((t) => t.onclick = () => {
    $$('.tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    const dove = t.dataset.tab;
    S.tabAttiva = dove;
    $('#pagina-sogna').classList.toggle('hidden', dove !== 'sogna');
    $('#pagina-sogno').classList.toggle('hidden', dove !== 'sogno');
    $('#pagina-galleria').classList.toggle('hidden', dove !== 'galleria');
    $('#pagina-impostazioni').classList.toggle('hidden', dove !== 'impostazioni');
    if (dove === 'galleria') caricaGalleria();
    // Le due schede vogliono forze di stile diverse: nel sogno basta 1, nella
    // trasformazione serve alta. Ogni scheda rimette la sua quando la apri.
    if (dove === 'sogno') invia({ guidance: +$('#guidance-sogno').value }, true);
    else if (dove === 'sogna') invia({ guidance: +$('#guidance').value }, true);
    // un flusso MJPEG per volta: quello nascosto si stacca
    if (dove === 'sogno') {
      staccaImmagine('#img-output');
      staccaImmagine('#img-compare');
      if (S.running) attaccaImmagine('#img-sogno', '/stream/visione');
    } else {
      staccaImmagine('#img-sogno');
      if (dove === 'sogna' && S.streaming) { S.streaming = false; accendiFlussi(); }
    }
  });

  // sogno libero
  $('#btn-sogna-libero').onclick = sognaLibero;
  $('#btn-ferma-sogno').onclick = ferma;
  $('#btn-ricomincia').onclick = ricominciaSogno;
  $('#btn-foto-sogno').onclick = foto;
  $('#btn-rec-sogno').onclick = registra;
  $('#btn-dado-sogno').onclick = promptCasuale;
  $('#btn-salva-prompt-sogno').onclick = () => $('#btn-salva-prompt').onclick();
  $('#prompt-sogno').oninput = (e) => {
    invia({ prompt: e.target.value });
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
  };
  $('#raggio').oninput = (e) => {
    $('#raggio-val').textContent = (+e.target.value).toFixed(2);
    if (S.running) api('/api/avvia', { source: corpoSogno() }).catch(() => {});
  };
  $('#movimento').oninput = (e) => {
    $('#movimento-val').textContent = (+e.target.value).toFixed(2);
    // il movimento si rilegge a ogni frame: basta rimandare la sorgente
    if (S.running) api('/api/avvia', { source: corpoSogno() }).catch(() => {});
  };
  $('#steps-sogno').oninput = (e) => {
    $('#steps-sogno-val').textContent = e.target.value;
    invia({ steps: +e.target.value });
  };
  $('#guidance-sogno').oninput = (e) => {
    $('#guidance-sogno-val').textContent = (+e.target.value).toFixed(1);
    invia({ guidance: +e.target.value });
  };
  $('#resolution-sogno').onchange = (e) => invia({ resolution: e.target.value }, true);
  $('#preset-grid-sogno').onclick = (e) => {
    const card = e.target.closest('[data-preset]');
    const gemello = card && document.querySelector(`#preset-grid [data-preset="${card.dataset.preset}"]`);
    if (gemello) gemello.click();
  };


  // sorgenti: scegliere è già avviare
  $$('.source').forEach((b) => b.onclick = () => scegliSorgente(b.dataset.kind));
  $('#webcam-select').onchange = avvia;
  $('#monitor-select').onchange = avvia;
  $('#btn-sfoglia').onclick = sfoglia;
  // specchia non riapre la webcam: il motore rilegge il parametro a ogni frame
  $('#mirror').onchange = () => api('/api/avvia', { source: corpoSorgente() }).then(mostraStato).catch(() => {});
  $('#loop').onchange = () => S.running && avvia();
  $('#btn-scan').onclick = async () => {
    toast('Rileggo i dispositivi…');
    await caricaSorgenti(true);
    toast('Elenco aggiornato.');
  };

  // prompt dal vivo
  $('#prompt').oninput = (e) => {
    invia({ prompt: e.target.value });
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
  };
  const negativi = ['#negative', '#negative-sogno'];
  negativi.forEach((sel) => {
    $(sel).oninput = (e) => {
      negativi.filter((s2) => s2 !== sel).forEach((s2) => { $(s2).value = e.target.value; });
      invia({ negative_prompt: e.target.value });
    };
  });

  $('#strength').oninput = (e) => {
    $('#strength-val').textContent = (+e.target.value).toFixed(2);
    invia({ strength: +e.target.value });
  };
  $('#steps').oninput = (e) => { $('#steps-val').textContent = e.target.value; invia({ steps: +e.target.value }); };
  $('#guidance').oninput = (e) => {
    $('#guidance-val').textContent = (+e.target.value).toFixed(1);
    invia({ guidance: +e.target.value });
  };
  $('#blend').oninput = (e) => { $('#blend-val').textContent = (+e.target.value).toFixed(2); invia({ temporal_blend: +e.target.value }); };
  $('#seed').onchange = (e) => invia({ seed: parseInt(e.target.value || '0', 10) }, true);
  $('#btn-seed-dado').onclick = () => {
    const s = Math.floor(Math.random() * 1000000);
    $('#seed').value = s; invia({ seed: s }, true); toast('Seed ' + s + ' (fisso).');
  };
  $('#btn-seed-vivo').onclick = () => { $('#seed').value = -1; invia({ seed: -1 }, true); toast('Seed diverso a ogni frame.'); };
  $('#resolution').onchange = (e) => invia({ resolution: e.target.value }, true);
  $('#fast-vae').onchange = (e) => invia({ fast_vae: e.target.checked }, true);
  $('#soggetto').onchange = (e) => {
    $('#soggetto-field').classList.toggle('hidden', !e.target.checked);
    invia({ soggetto: e.target.checked }, true);
  };
  $('#protezione').oninput = (e) => {
    $('#protezione-val').textContent = (+e.target.value).toFixed(2);
    invia({ protezione: +e.target.value });
  };
  $('#depth').onchange = (e) => {
    $('#depth-field').classList.toggle('hidden', !e.target.checked);
    invia({ depth: e.target.checked }, true);
    if (e.target.checked) toast('Carico la profondità: il primo frame tarda un po\'.');
  };
  $('#depth-scale').oninput = (e) => { $('#depth-val').textContent = (+e.target.value).toFixed(1); invia({ depth_scale: +e.target.value }); };

  // prompt: dado, salvataggio, archivio
  $('#btn-dado').onclick = promptCasuale;
  $('#btn-salva-prompt').onclick = async () => {
    const testo = $('#prompt').value.trim();
    if (!testo) { $('#prompt').focus(); return; }
    const nome = ($('#preset-nome').value.trim() || testo).slice(0, 40);
    try {
      const p = await api('/api/sogni', { name: nome });
      $('#preset-nome').value = '';
      await caricaSogni(p.name);
      toast(`Salvato fra i sogni: ${p.name}`);
    } catch (e) { toast(e.message, true); }
  };

  $('#btn-modello').onclick = () => modello(S.modelloCarico ? 'scarica' : 'carica');
  $('#imp-carica').onclick = () => modello('carica');
  $('#imp-scarica').onclick = () => modello('scarica');
  $('#imp-traduci').onchange = async (e) => {
    try { mostraStato(await api('/api/traduzione', { attiva: e.target.checked })); }
    catch (err) { toast(err.message, true); }
  };
  $('#imp-precarica').onchange = (e) => api('/api/impostazioni', { auto_open_browser: true, extra: { precarica: e.target.checked } }).catch(() => {});
  $('#model-select').onchange = async (e) => {
    try { mostraStato(await api('/api/modello', { model: e.target.value })); }
    catch (err) { toast(err.message, true); }
  };

  $$('#mode-seg button').forEach((b) => b.onclick = () => {
    $$('#mode-seg button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    invia({ mode: b.dataset.mode }, true);
  });

  // sogni
  $('#preset-grid').onclick = async (e) => {
    const elimina = e.target.dataset.elimina;
    if (elimina) {
      e.stopPropagation();
      if (!confirm(`Eliminare il sogno «${elimina}»?`)) return;
      await api(`/api/sogni/${encodeURIComponent(elimina)}`, undefined, 'DELETE');
      caricaSogni();
      return;
    }
    const card = e.target.closest('[data-preset]');
    if (!card) return;
    try {
      // Il sogno porta solo il prompt: i cursori restano dove li hai messi.
      mostraStato(await api('/api/sogni/applica', { name: card.dataset.preset }));
      S.touched = 0;
      $('#preset-nome').value = '';
      $$('.preset').forEach((p) => p.classList.toggle('active', p === card));
    } catch (err) { toast(err.message, true); }
  };
  $('#btn-preset-save').onclick = async () => {
    const name = $('#preset-nome').value.trim();
    if (!name) { $('#preset-nome').focus(); return; }
    try {
      const p = await api('/api/sogni', { name });
      $('#preset-nome').value = '';
      await caricaSogni(p.name);
      toast('Sogno salvato.');
    } catch (e) { toast(e.message, true); }
  };

  // comandi
  $('#btn-pausa').onclick = pausa;
  $('#btn-ferma').onclick = ferma;
  $('#btn-foto').onclick = foto;
  $('#btn-rec').onclick = registra;
  $('#btn-confronto').onclick = () => confronto(!S.compare);
  $('#btn-chiudi').onclick = async () => {
    if (!confirm('Chiudere DaProdDream?')) return;
    try { await api('/api/chiudi', {}); } catch (e) {}
    document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;color:#8b93a7">Motore spento. Puoi chiudere la finestra.</div>';
    setTimeout(() => window.close(), 400);
  };

  // galleria
  $('#griglia').onclick = (e) => {
    const card = e.target.closest('[data-apri]');
    if (card) apriVisore(card.dataset.apri);
  };
  $$('#filtri .chip').forEach((c) => c.onclick = () => {
    $$('#filtri .chip').forEach((x) => x.classList.remove('active'));
    c.classList.add('active');
    S.filtro = c.dataset.filtro;
    disegnaGalleria();
  });
  $$('[data-open]').forEach((b) => b.onclick = () => api('/api/apri-cartella', { quale: b.dataset.open }));
  $('#visore-chiudi').onclick = chiudiVisore;
  $('#visore').onclick = (e) => { if (e.target.id === 'visore') chiudiVisore(); };
  $('#visore-elimina').onclick = async () => {
    const v = S.apertoOra;
    if (!v || !confirm(`Eliminare ${v.nome}?`)) return;
    try {
      await api(`/api/galleria/${v.tipo}/${encodeURIComponent(v.nome)}`, undefined, 'DELETE');
      chiudiVisore();
      caricaGalleria();
      toast('Eliminato.');
    } catch (e) { toast(e.message, true); }
  };

  // confronto trascinabile
  let trascino = false;
  $('#compare-handle').addEventListener('pointerdown', (e) => { trascino = true; e.preventDefault(); });
  window.addEventListener('pointermove', (e) => {
    if (!trascino) return;
    const r = $('#img-output').getBoundingClientRect();
    taglia((e.clientX - r.left) / r.width);
  });
  window.addEventListener('pointerup', () => { trascino = false; });
  window.addEventListener('resize', () => S.compare && taglia(S.comparePos));

  // trascinare immagini e video dentro la finestra
  let dragCont = 0;
  window.addEventListener('dragenter', (e) => { e.preventDefault(); if (++dragCont === 1) $('#drop-overlay').classList.remove('hidden'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', (e) => { e.preventDefault(); if (--dragCont <= 0) { dragCont = 0; $('#drop-overlay').classList.add('hidden'); } });
  window.addEventListener('drop', async (e) => {
    e.preventDefault(); dragCont = 0; $('#drop-overlay').classList.add('hidden');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    toast(`Carico ${file.name}…`);
    try {
      const modulo = new FormData(); modulo.append('file', file);
      const res = await fetch('/api/file-trascinato', { method: 'POST', body: modulo });
      if (!res.ok) throw new Error((await res.json()).detail || 'non riuscito');
      const r = await res.json();
      $('#file-path').value = r.path;
      $('#file-nome').textContent = r.nome;
      $('#file-nome').classList.remove('muted');
      $$('.tab').forEach((t) => { if (t.dataset.tab === 'sogna') t.click(); });
      scegliSorgente(r.tipo);
      toast(`${r.nome} in riproduzione.`);
    } catch (err) { toast('File non caricato: ' + err.message, true); }
  });

  // scorciatoie
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#visore').classList.contains('hidden')) return chiudiVisore();
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); pausa(); }
    else if (e.key === 'g' || e.key === 'G') promptCasuale();
    else if (e.key === 's' || e.key === 'S') foto();
    else if (e.key === 'r' || e.key === 'R') registra();
    else if (e.key === 'c' || e.key === 'C') confronto(!S.compare);
    else if (e.key === 'Escape') ferma();
  });
}

/* ──────────────────────────── avvio ─────────────────────────────── */

(async function init() {
  collega();
  connetti();
  try { await caricaModelli(); } catch (e) {}
  await caricaSogni();
  await caricaSorgenti();
  caricaGalleria();

})();
