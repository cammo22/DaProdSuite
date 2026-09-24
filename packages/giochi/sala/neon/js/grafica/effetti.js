/**
 * NEON PARTENOPE — effetti dell'arena: numeri del danno, scintille, monete, laser degli automi
 * Tutto su un solo canvas sopra i nemici, con un tetto al numero di particelle.
 */
"use strict";

const Fx = (() => {
  let cv, g, W = 0, H = 0, dpr = 1;
  const parti = [], numeri = [], laser = [];
  let t = 0;
  const MAX_P = 260, MAX_N = 40;

  function init() { cv = $("fx"); g = cv.getContext("2d"); ridimensiona(); }
  function ridimensiona() {
    if (!cv) return;
    const p = cv.parentNode.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = p.width; H = p.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  function basso() { return S.opz.qualita === "bassa"; }

  function numero(x, y, testo, tipo) {
    if (numeri.length >= MAX_N) numeri.shift();
    const grande = tipo === "crit" ? 1.6 : (tipo === "multi" ? 1.3 : (tipo === "auto" ? 0.8 : 1));
    numeri.push({ x, y, testo: (tipo === "crit" ? "💥" : tipo === "multi" ? "⚡" : "") + testo, tipo, v: 1, vy: -70 - Math.random() * 30, s: grande });
  }
  function testo(x, y, testo, tipo) {
    if (numeri.length >= MAX_N) numeri.shift();
    numeri.push({ x, y, testo, tipo: tipo || "lire", v: 1.4, vy: -45, s: 0.85 });
  }
  function scintille(x, y, col, n) {
    if (basso()) n = Math.ceil(n / 3);
    for (let i = 0; i < n && parti.length < MAX_P; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
      parti.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v: 1, col, r: 1.5 + Math.random() * 2.2, tipo: "s" });
    }
  }
  function monete(x, y, n) {
    if (basso()) n = Math.ceil(n / 3);
    for (let i = 0; i < n && parti.length < MAX_P; i++) {
      parti.push({ x, y, vx: (Math.random() - 0.5) * 180, vy: -160 - Math.random() * 120, v: 0.9, col: "#ffd54a", r: 3.5 + Math.random() * 2, tipo: "m", rot: Math.random() * 6 });
    }
  }
  function laserA(x, y) {
    if (basso() || laser.length > 10) return;
    const da = { x: W * 0.12 + Math.cos(t * 2 + laser.length) * 30, y: H * 0.78 + Math.sin(t * 3 + laser.length) * 18 };
    laser.push({ x1: da.x, y1: da.y, x2: x + (Math.random() - 0.5) * 20, y2: y + (Math.random() - 0.5) * 20, v: 1 });
  }
  function lampo(col) {
    const el = $("lampo"); if (!el || basso()) return;
    el.style.background = col;
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  }
  function colpoSubito(txt) {
    const p = $("palco"); p.classList.remove("ferito"); void p.offsetWidth; p.classList.add("ferito");
    const b = $("energiaTxt"); if (!b) return;
    const r = b.getBoundingClientRect();
    testoSchermo(r.left + r.width / 2, r.top, "-" + txt + " ❤️", "rosso");
  }
  // testo che vola in un punto qualsiasi dello schermo (DOM)
  function testoSchermo(x, y, testo, tipo) {
    const el = document.createElement("div");
    el.className = "vola " + (tipo || "");
    el.textContent = testo;
    el.style.left = x + "px"; el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  function disegna(dt) {
    if (!g) return;
    t += dt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // droni degli automi che orbitano vicino a Ferro Vecchio
    const na = Math.min(6, Math.ceil(Math.sqrt(colpiAutomi())));
    if (S.automiOn && na > 0) {
      for (let i = 0; i < na; i++) {
        const a = t * (1.2 + i * 0.1) + i * 2.1;
        const x = W * 0.12 + Math.cos(a) * (26 + i * 5), y = H * 0.74 + Math.sin(a * 1.3) * (14 + i * 3);
        g.fillStyle = protoAttivo() ? "#35e8ff" : "#ffd54a"; g.globalAlpha = 0.9;
        g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
        g.globalAlpha = 0.25; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
    // laser
    for (let i = laser.length - 1; i >= 0; i--) {
      const l = laser[i]; l.v -= dt * 5;
      if (l.v <= 0) { laser.splice(i, 1); continue; }
      g.strokeStyle = protoAttivo() ? `rgba(53,232,255,${l.v})` : `rgba(255,213,74,${l.v * 0.8})`;
      g.lineWidth = 2 * l.v; g.beginPath(); g.moveTo(l.x1, l.y1); g.lineTo(l.x2, l.y2); g.stroke();
    }
    // particelle
    for (let i = parti.length - 1; i >= 0; i--) {
      const p = parti[i];
      p.v -= dt * (p.tipo === "m" ? 1.1 : 2.2);
      if (p.v <= 0) { parti.splice(i, 1); continue; }
      p.vy += (p.tipo === "m" ? 60 : 260) * dt; p.vx *= 0.96;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.tipo === "m") {
        p.rot += dt * 8;
        g.globalAlpha = Math.min(1, p.v);
        g.fillStyle = "#ffd54a"; g.beginPath(); g.ellipse(p.x, p.y, p.r * Math.abs(Math.cos(p.rot)) + 0.8, p.r, 0, 0, 7); g.fill();
        g.strokeStyle = "#ff9d00"; g.lineWidth = 1; g.stroke();
      } else {
        g.globalAlpha = p.v; g.fillStyle = p.col; g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }
    }
    g.globalAlpha = 1;
    // numeri
    g.textAlign = "center"; g.lineJoin = "round";
    for (let i = numeri.length - 1; i >= 0; i--) {
      const n = numeri[i];
      n.v -= dt * 1.1; n.y += n.vy * dt; n.vy *= 0.95;
      if (n.v <= 0) { numeri.splice(i, 1); continue; }
      const col = { crit: "#ffd54a", multi: "#35e8ff", auto: "#d9d2ff", lire: "#5dffb4", rosso: "#ff3b5c" }[n.tipo] || "#ffffff";
      const sz = Math.round((n.tipo === "lire" ? 13 : 18) * n.s * (W < 500 ? 0.8 : 1) * (n.v > 0.85 ? 1 + (n.v - 0.85) * 2 : 1));
      g.font = `900 ${sz}px Orbitron, "Arial Black", sans-serif`;
      g.globalAlpha = Math.min(1, n.v * 1.5);
      g.lineWidth = 4; g.strokeStyle = "rgba(7,6,13,.85)"; g.strokeText(n.testo, n.x, n.y);
      g.fillStyle = col; g.fillText(n.testo, n.x, n.y);
    }
    g.globalAlpha = 1;
  }

  return { init, ridimensiona, numero, testo, scintille, monete, laser: laserA, lampo, colpoSubito, testoSchermo, disegna };
})();
