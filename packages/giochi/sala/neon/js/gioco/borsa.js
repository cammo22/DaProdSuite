/**
 * NEON PARTENOPE — Borsa del Golfo: telemetria in tempo reale del tuo impero
 * Tre scale (5 minuti, 12 ore, 30 giorni), cinque serie, indice di Fiducia del Quartiere
 * che crolla quando cadi contro un boss. Più un mini-widget trascinabile.
 */
"use strict";

const Borsa = (() => {
  const SERIE = [
    { k: "prod", n: "Lire/s",      col: "#ffd54a", on: true },
    { k: "dps",  n: "Danno/s",     col: "#35e8ff", on: true },
    { k: "kps",  n: "Nemici/s",    col: "#ff3b5c", on: false },
    { k: "pat",  n: "Patrimonio",  col: "#5dffb4", on: true },
    { k: "fid",  n: "Fiducia",     col: "#ff3df2", on: true }
  ];
  const SCALE = { "5m": { k: "sec", n: "5 MIN" }, "12h": { k: "min", n: "12 ORE" }, "30g": { k: "ore", n: "30 GIORNI" } };
  let D = { sec: [], min: [], ore: [], tMin: 0, tOre: 0 };
  let scala = "5m", fiducia = 100, panicoFino = 0, ultKills = 0, ultT = 0;

  function carica() {
    try {
      const r = JSON.parse(localStorage.getItem(CHIAVE_BORSA) || "null");
      if (r && Array.isArray(r.sec)) D = Object.assign(D, r);
    } catch (e) { /* si riparte da zero */ }
    ultKills = S.kills; ultT = Date.now();
    setInterval(salvaB, 30000);
  }
  function salvaB() { try { localStorage.setItem(CHIAVE_BORSA, JSON.stringify(D)); } catch (e) { /* pieno */ } }

  function campiona() {
    const t = Date.now();
    if (t - ultT < 1000) return;
    const dt = (t - ultT) / 1000; ultT = t;
    const kps = Math.max(0, S.kills - ultKills) / dt; ultKills = S.kills;
    if (t > panicoFino && fiducia < 100) fiducia = Math.min(100, fiducia + 0.4);
    const c = { t, prod: produzione(), dps: dpsStimato(2), kps: Math.round(kps * 10) / 10, pat: S.lire, fid: fiducia };
    D.sec.push(c); if (D.sec.length > 300) D.sec.shift();
    if (t - D.tMin >= 60000) { D.tMin = t; D.min.push(c); if (D.min.length > 720) D.min.shift(); }
    if (t - D.tOre >= 3600000) { D.tOre = t; D.ore.push(c); if (D.ore.length > 720) D.ore.shift(); }
  }

  function panico() {
    fiducia = Math.max(10, fiducia - 40); panicoFino = Date.now() + 15000;
    toast("📉", "PANICO A PONTICELLI!", "Sei caduto: la Fiducia del Quartiere crolla in Borsa.", { tipo: "rosso", chiave: "panico" });
  }

  // grafico: ogni serie normalizzata sul suo massimo (le scale sono troppo diverse fra loro)
  function disegna(cv, dati, serie, piccolo) {
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const pad = piccolo ? 2 : 14;
    if (!piccolo) {
      g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = 1;
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, H * i / 5); g.lineTo(W, H * i / 5); g.stroke(); }
    }
    if (dati.length < 2) {
      if (!piccolo) { g.fillStyle = "#8f86b0"; g.font = "600 14px Rajdhani, sans-serif"; g.textAlign = "center"; g.fillText("Raccolta dati in corso…", W / 2, H / 2); }
      return;
    }
    for (const s of serie) {
      if (!s.on) continue;
      let max = 0, min = Infinity;
      for (const c of dati) { max = Math.max(max, c[s.k] || 0); min = Math.min(min, c[s.k] || 0); }
      if (s.k === "fid") { min = 0; max = 100; }
      if (max <= min) { max = min + 1; }
      g.beginPath();
      dati.forEach((c, i) => {
        const x = pad + (W - pad * 2) * i / (dati.length - 1);
        const y = H - pad - (H - pad * 2) * (((c[s.k] || 0) - min) / (max - min));
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.strokeStyle = s.col; g.lineWidth = piccolo ? 1.5 : 2.2; g.shadowColor = s.col; g.shadowBlur = piccolo ? 0 : 8;
      g.stroke(); g.shadowBlur = 0;
      if (!piccolo && s.k !== "fid") {
        g.lineTo(W - pad, H - pad); g.lineTo(pad, H - pad); g.closePath();
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, s.col + "33"); gr.addColorStop(1, s.col + "00");
        g.fillStyle = gr; g.fill();
      }
    }
  }

  function htmlPannello() {
    return `
      <div class="borsa-scale">${Object.keys(SCALE).map(k => `<button class="chip ${k === scala ? "on" : ""}" data-azione="borsaScala" data-v="${k}">${SCALE[k].n}</button>`).join("")}</div>
      <div class="borsa-ticker" id="borsaTicker"></div>
      <div class="borsa-tela"><canvas id="borsaTela"></canvas></div>
      <div class="borsa-legenda">${SERIE.map(s => `<button class="chip ${s.on ? "on" : ""}" data-azione="borsaSerie" data-v="${s.k}" style="--c:${s.col}"><i></i>${s.n}</button>`).join("")}</div>`;
  }
  function ticker() {
    const el = $("borsaTicker"); if (!el) return;
    const d = D[SCALE[scala].k], u = d[d.length - 1] || {}, p = d[Math.max(0, d.length - 11)] || u;
    const var_ = (a, b) => { if (!b) return ""; const v = (a - b) / b * 100, t = Math.abs(v) >= 1000 ? "×" + fmt(a / b) : Math.abs(v).toFixed(1).replace(".", ",") + "%"; return `<em class="${v >= 0 ? "su" : "giu"}">${v >= 0 ? "▲" : "▼"} ${t}</em>`; };
    el.innerHTML = SERIE.map(s => `<div style="--c:${s.col}"><small>${s.n}</small><b>${s.k === "fid" ? Math.round(u[s.k] || 0) + "%" : fmt(u[s.k] || 0)}</b>${var_(u[s.k], p[s.k])}</div>`).join("");
  }
  function aggiornaPannello() { disegna($("borsaTela"), D[SCALE[scala].k], SERIE, false); ticker(); }

  // --- mini widget trascinabile
  function initHud() {
    const h = $("borsaHud");
    // Patrimonio e danni in cima (2.1.3): «la mini borsa mobile deve mostrare
    // patrimonio e danni». Sul telefono restano solo loro; sul computer anche
    // la produzione, la fiducia e il grafico.
    h.innerHTML = `<canvas id="hudTela"></canvas><div class="bh-dati"><b id="hudPat">₤ 0</b><small id="hudDps">💥 0/s</small><small id="hudProd">+₤ 0/s</small><small id="hudFid">Fiducia 100%</small></div>`;
    let drag = null;
    h.addEventListener("pointerdown", e => { drag = { x: e.clientX - h.offsetLeft, y: e.clientY - h.offsetTop, mosso: false }; h.setPointerCapture(e.pointerId); });
    h.addEventListener("pointermove", e => {
      if (!drag) return; drag.mosso = true;
      h.style.left = limita(e.clientX - drag.x, 0, innerWidth - h.offsetWidth) + "px";
      h.style.top = limita(e.clientY - drag.y, 0, innerHeight - h.offsetHeight) + "px";
      h.style.right = "auto"; h.style.bottom = "auto";
    });
    h.addEventListener("pointerup", () => {
      if (drag && !drag.mosso) { apriScheda("borsa"); if (typeof vista === "function" && telefono()) vista("pannello"); }
      drag = null;
    });
  }
  function aggiornaHud() {
    const h = $("borsaHud");
    // Sul telefono si vede quando c'e' l'arena a tutto schermo: sopra una scheda
    // coprirebbe quello che si sta leggendo, e c'e' gia' il riquadro dell'arena.
    const vis = S.opz.borsaHud && $("intro").classList.contains("via") &&
      (innerWidth > 979 || document.body.classList.contains("vista-arena"));
    h.classList.toggle("on", vis);
    if (!vis) return;
    disegna($("hudTela"), D.sec.slice(-90), SERIE.filter(s => s.k === "prod" || s.k === "fid").map(s => Object.assign({}, s, { on: true })), true);
    const u = D.sec[D.sec.length - 1] || { prod: 0, dps: 0, fid: 100 };
    $("hudPat").textContent = fmtLire(u.pat || S.lire);
    $("hudDps").textContent = "💥 " + fmt(u.dps) + "/s";
    $("hudProd").textContent = "+" + fmtLire(u.prod) + "/s";
    $("hudFid").textContent = "Fiducia " + Math.round(u.fid) + "%";
  }

  return {
    carica, campiona, panico, htmlPannello, aggiornaPannello, initHud, aggiornaHud, salva: salvaB,
    scala: k => { if (SCALE[k]) scala = k; },
    serie: k => { const s = SERIE.find(x => x.k === k); if (s) s.on = !s.on; },
    fiducia: () => fiducia
  };
})();
