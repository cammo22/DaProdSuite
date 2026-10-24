/**
 * NEON PARTENOPE — suoni e musica, tutto sintetizzato dal vivo (Web Audio API, nessun file)
 * Effetti su scala pentatonica e una colonna sonora synthwave che cambia tonalità ad ogni atto
 * e si fa più cattiva quando c'è un boss.
 */
"use strict";

const Suono = (() => {
  let ctx = null, master = null, busSfx = null, busMus = null, eco = null, rumore = null;
  let schedT = null, passo = 0, prossimo = 0, intensita = 0, trasposta = 0;
  let ultimoSuono = {};

  function ok() { return ctx && ctx.state === "running"; }

  function avvia() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = S.opz.volume;
    busSfx = ctx.createGain(); busSfx.gain.value = S.opz.suoni ? 1 : 0;
    busMus = ctx.createGain(); busMus.gain.value = 0;
    // eco a nastro per l'arpeggio
    eco = ctx.createDelay(1); eco.delayTime.value = 0.375 * 60 / 96 * 2;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const ecoFiltro = ctx.createBiquadFilter(); ecoFiltro.type = "lowpass"; ecoFiltro.frequency.value = 2400;
    eco.connect(ecoFiltro); ecoFiltro.connect(fb); fb.connect(eco); ecoFiltro.connect(busMus);
    busSfx.connect(master); busMus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    // buffer di rumore bianco per percussioni ed esplosioni
    rumore = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = rumore.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    aggiornaMusica();
  }

  function tono(f, dur, tipo, vol, rit, bus, slide) {
    if (!ok()) return;
    const t = ctx.currentTime + (rit || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || "sine";
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || busSfx);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function soffio(dur, vol, freq, tipo, rit, bus) {
    if (!ok()) return;
    const t = ctx.currentTime + (rit || 0);
    const s = ctx.createBufferSource(); s.buffer = rumore;
    const f = ctx.createBiquadFilter(); f.type = tipo || "bandpass"; f.frequency.value = freq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || busSfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  // evita di sovrapporre lo stesso effetto troppe volte al secondo
  function limite(k, ms) {
    const n = performance.now();
    if (ultimoSuono[k] && n - ultimoSuono[k] < ms) return false;
    ultimoSuono[k] = n; return true;
  }

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
  const sfx = {
    clic: () => { if (limite("clic", 40)) tono(scegli(PENTA), 0.08, "triangle", 0.05); },
    colpo: () => { if (limite("colpo", 55)) { tono(scegli(PENTA) / 2, 0.07, "square", 0.025); soffio(0.05, 0.05, 2500); } },
    critico: () => { if (limite("crit", 70)) { tono(1046.5, 0.1, "sine", 0.07); tono(1568, 0.12, "triangle", 0.05, 0.03); } },
    multi: () => { if (limite("multi", 90)) [783.99, 1046.5, 1318.51].forEach((f, i) => tono(f, 0.08, "triangle", 0.045, i * 0.035)); },
    kill: () => { if (limite("kill", 90)) { tono(660, 0.07, "sine", 0.05); tono(990, 0.1, "sine", 0.045, 0.05); } },
    onda: () => [523.25, 659.25, 783.99].forEach((f, i) => tono(f, 0.12, "sine", 0.05, i * 0.05)),
    stanza: () => [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, 0.16, "triangle", 0.055, i * 0.05)),
    compra: () => { if (limite("compra", 50)) { tono(659.25, 0.07, "sine", 0.06); tono(987.77, 0.11, "sine", 0.055, 0.05); } },
    errore: () => { if (limite("err", 120)) { tono(220, 0.14, "sine", 0.05); tono(174.6, 0.2, "sine", 0.05, 0.07); } },
    sovra: () => { [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tono(f, 0.2, "sawtooth", 0.035, i * 0.04)); soffio(0.6, 0.08, 800, "lowpass"); },
    bossArriva: () => { tono(110, 0.9, "sawtooth", 0.07, 0, null, 55); tono(146.8, 0.6, "sawtooth", 0.05, 0.25, null, 73); soffio(1.2, 0.1, 300, "lowpass"); },
    bossColpo: () => { tono(160, 0.25, "sawtooth", 0.07, 0, null, 60); soffio(0.25, 0.14, 400, "lowpass"); },
    bossVinto: () => { [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tono(f, 0.3, "triangle", 0.06, i * 0.07)); soffio(1.4, 0.12, 600, "lowpass"); },
    caduta: () => { tono(330, 0.7, "sawtooth", 0.06, 0, null, 60); },
    vittoria: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, 0.16, "sine", 0.06, i * 0.07)),
    trofeo: () => [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tono(f, 0.2, "triangle", 0.05, i * 0.06)),
    goccia: () => { tono(880, 0.08, "sine", 0.06); tono(1318.5, 0.16, "sine", 0.06, 0.05); tono(1760, 0.2, "sine", 0.04, 0.1); },
    biglietto: () => [783.99, 880, 1046.5, 1318.51].forEach((f, i) => tono(f, 0.14, "sine", 0.05, i * 0.05)),
    moneta: () => { if (limite("moneta", 60)) tono(1975.5, 0.06, "square", 0.02); },
    radio: () => { soffio(0.18, 0.05, 3000, "highpass"); tono(1200, 0.05, "square", 0.02, 0.12); },
    proto: () => { tono(80, 1.2, "sawtooth", 0.08, 0, null, 400); soffio(1.4, 0.12, 900); [523, 784, 1046, 1568].forEach((f, i) => tono(f, 0.3, "square", 0.03, 0.2 + i * 0.08)); },
    eruzione: () => { soffio(3, 0.25, 200, "lowpass"); tono(55, 3, "sawtooth", 0.1, 0, null, 30); [261.6, 329.6, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, 0.8, "triangle", 0.05, 0.8 + i * 0.12)); },
    ruota: () => { if (limite("ruota", 45)) tono(1400, 0.03, "square", 0.025); }
  };

  // ------------------------------------------------ MUSICA
  // Progressione in La minore "napoletana": Am – F – Dm – E (dominante armonica)
  const ACCORDI = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
  const TRASP_ATTO = { 1: 0, 2: 5, 3: -2, 4: 3, 5: -5, 6: 7 };
  const BPM = 96;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function cassa(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(busMus); o.start(t); o.stop(t + 0.3);
  }
  function rumoreA(t, dur, vol, freq, tipo) {
    const s = ctx.createBufferSource(); s.buffer = rumore;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(busMus); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
  }
  function notaA(t, f, dur, tipo, vol, taglio, versoEco) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = tipo; o.frequency.value = f;
    fl.type = "lowpass"; fl.frequency.value = taglio; fl.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(busMus); if (versoEco) g.connect(eco);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function pad(t, accordo, dur) {
    for (const m of accordo) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = hz(m + trasposta); o.detune.value = det;
      fl.type = "lowpass"; fl.frequency.value = 700 + intensita * 600;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(busMus); o.start(t); o.stop(t + dur + 0.05);
    }
  }
  function suonaPasso(p, t) {
    const sedic = 60 / BPM / 4;
    const batt = Math.floor(p / 16) % ACCORDI.length, acc = ACCORDI[batt], dentro = p % 16;
    if (dentro === 0) pad(t, acc, sedic * 16);
    // basso ad ottavi
    if (dentro % 2 === 0) notaA(t, hz(acc[0] - 24 + trasposta + (dentro % 8 === 6 ? 12 : 0)), sedic * 1.8, "sawtooth", 0.09, 380 + intensita * 500);
    // arpeggio a sedicesimi
    const arp = [0, 1, 2, 1, 2, 0, 1, 2];
    if (intensita > 0 || dentro % 2 === 0) {
      const m = acc[arp[dentro % 8]] + 12 + (dentro >= 8 ? 12 : 0) + trasposta;
      notaA(t, hz(m), sedic * 0.9, "square", 0.022, 1800 + intensita * 1500, true);
    }
    // batteria
    if (dentro % 4 === 0) cassa(t);
    if (dentro === 4 || dentro === 12) rumoreA(t, 0.16, 0.14, 1800, "bandpass");
    if (dentro % 2 === 1 || intensita > 0) rumoreA(t, 0.04, 0.05 + intensita * 0.03, 8000, "highpass");
  }
  function pianifica() {
    if (!ok()) return;
    const sedic = 60 / BPM / 4 * (intensita > 0 ? 0.85 : 1);
    if (prossimo < ctx.currentTime) prossimo = ctx.currentTime + 0.05;
    while (prossimo < ctx.currentTime + 0.15) { suonaPasso(passo, prossimo); passo++; prossimo += sedic; }
  }
  function aggiornaMusica() {
    if (!ctx) return;
    const on = S.opz.musica;
    busMus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.4);
    if (on && !schedT) schedT = setInterval(pianifica, 30);
    if (!on && schedT) { clearInterval(schedT); schedT = null; }
  }

  return {
    avvia, sfx,
    suona(k) { if (S.opz.suoni && sfx[k]) try { sfx[k](); } catch (e) { /* audio non disponibile */ } },
    volume(v) { if (master) master.gain.value = v; },
    suoni(on) { if (busSfx) busSfx.gain.value = on ? 1 : 0; },
    musica() { aggiornaMusica(); },
    atto(n) { trasposta = TRASP_ATTO[n] || 0; },
    boss(on) { intensita = on ? 1 : 0; },
    attivo: () => !!ctx
  };
})();
