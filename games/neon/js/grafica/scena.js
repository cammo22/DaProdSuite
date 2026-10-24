/**
 * NEON PARTENOPE — la scena di sfondo: la cartolina di Napoli rifatta al neon.
 * Sole synthwave, Vesuvio col cratere che pulsa, golfo a griglia, Castel dell'Ovo, pino marittimo
 * e palazzi le cui finestre si accendono man mano che riaccendi il quartiere.
 * Lo strato fisso si disegna una volta sola (e quando cambia l'atto), il resto si anima a 30 fps.
 */
"use strict";

const Scena = (() => {
  let cv, g, fisso, gf, W = 0, H = 0, dpr = 1, atto = ATTI[0];
  let t = 0, ultimo = 0, finestre = [], fumo = [], braci = [], droni = [], bombe = [], erutta = 0, luci = 0.08;
  let qualita = "alta";

  function rnd(seme) { return () => { seme |= 0; seme = seme + 0x6D2B79F5 | 0; let x = Math.imul(seme ^ seme >>> 15, 1 | seme); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  const orizz = () => H * (W < 700 ? 0.58 : 0.64);

  function init(canvas) {
    cv = canvas; g = cv.getContext("2d");
    fisso = document.createElement("canvas"); gf = fisso.getContext("2d");
    ridimensiona();
    window.addEventListener("resize", () => { clearTimeout(init._t); init._t = setTimeout(ridimensiona, 150); });
  }
  function impostaQualita(q) { qualita = q; ridimensiona(); }
  function ridimensiona() {
    const mob = innerWidth < 760;
    dpr = qualita === "bassa" ? 0.75 : Math.min(mob ? 1.25 : 1.5, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = fisso.width = Math.round(W * dpr); cv.height = fisso.height = Math.round(H * dpr);
    disegnaFisso();
  }

  // ------------------------------------------------ Vesuvio: Monte Somma a sinistra, Gran Cono col cratere a destra
  function profiloVesuvio(ctx, y0, cx, larg, alt) {
    const p = [
      [-0.62, 0], [-0.46, -0.18], [-0.34, -0.42], [-0.24, -0.62], [-0.16, -0.7], [-0.08, -0.66], [-0.02, -0.58],
      [0.04, -0.62], [0.1, -0.84], [0.14, -0.97], [0.18, -1], [0.24, -1], [0.28, -0.96], [0.34, -0.78], [0.46, -0.44], [0.6, -0.16], [0.74, 0]
    ];
    ctx.beginPath();
    p.forEach(([x, y], i) => { const X = cx + x * larg, Y = y0 + y * alt; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    return { cratere: { x: cx + 0.21 * larg, y: y0 - alt }, larg, alt };
  }
  let V = null;

  function disegnaFisso() {
    const c = gf; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const y0 = orizz(), r = rnd(1996 + atto.n * 7);
    // cielo
    const cielo = c.createLinearGradient(0, 0, 0, y0);
    atto.cielo.forEach((col, i) => cielo.addColorStop(i / (atto.cielo.length - 1), col));
    c.fillStyle = cielo; c.fillRect(0, 0, W, y0 + 2);
    // stelle
    for (let i = 0; i < (W * H) / 5000; i++) {
      c.globalAlpha = 0.2 + r() * 0.6; c.fillStyle = "#e8f4ff";
      const s = r() < 0.1 ? 1.6 : 0.9; c.fillRect(r() * W, r() * y0 * 0.7, s, s);
    }
    c.globalAlpha = 1;
    // sole synthwave con le strisce
    const sx = W * (W < 700 ? 0.7 : 0.74), sy = y0 - H * 0.2, sr = Math.min(W, H) * (W < 700 ? 0.2 : 0.17);
    const alone = c.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 2.6);
    alone.addColorStop(0, atto.sole + "88"); alone.addColorStop(1, atto.sole + "00");
    c.fillStyle = alone; c.fillRect(0, 0, W, y0);
    const sole = c.createLinearGradient(0, sy - sr, 0, sy + sr);
    sole.addColorStop(0, "#fff6d0"); sole.addColorStop(0.45, atto.sole); sole.addColorStop(1, atto.neon);
    c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.clip();
    c.fillStyle = sole; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    c.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 7; i++) { const yy = sy + sr * (0.1 + i * 0.13), hh = 1.5 + i * 1.6; c.fillRect(sx - sr, yy, sr * 2, hh); }
    c.restore();
    // Vesuvio
    const vcx = W * (W < 700 ? 0.36 : 0.4), vl = Math.max(W * 0.5, 420), va = H * (W < 700 ? 0.25 : 0.3);
    const monte = c.createLinearGradient(0, y0 - va, 0, y0);
    monte.addColorStop(0, "#1c1030"); monte.addColorStop(1, "#08050f");
    V = profiloVesuvio(c, y0, vcx, vl, va);
    c.closePath(); c.fillStyle = monte; c.fill();
    c.shadowColor = atto.neon; c.shadowBlur = 14; c.strokeStyle = atto.neon; c.lineWidth = 2; c.globalAlpha = 0.9;
    profiloVesuvio(c, y0, vcx, vl, va); c.stroke(); c.shadowBlur = 0;
    // curve di livello sul vulcano (effetto wireframe)
    c.save(); profiloVesuvio(c, y0, vcx, vl, va); c.closePath(); c.clip();
    c.globalAlpha = 0.14; c.strokeStyle = atto.neon2; c.lineWidth = 1;
    for (let i = 1; i < 9; i++) { c.beginPath(); c.moveTo(0, y0 - va * i / 9); c.lineTo(W, y0 - va * i / 9); c.stroke(); }
    for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(V.cratere.x, V.cratere.y); c.lineTo(V.cratere.x + i * vl * 0.12, y0); c.stroke(); }
    c.restore(); c.globalAlpha = 1;
    // mare
    const mare = c.createLinearGradient(0, y0, 0, H);
    mare.addColorStop(0, atto.mare); mare.addColorStop(1, "#020106");
    c.fillStyle = mare; c.fillRect(0, y0, W, H - y0);
    // riflesso del sole sull'acqua
    c.globalAlpha = 0.35;
    for (let i = 0; i < 16; i++) {
      const yy = y0 + 6 + i * i * 1.6; if (yy > H) break;
      const w2 = sr * (1.1 - i * 0.05) * (0.6 + r() * 0.5);
      c.fillStyle = i % 2 ? atto.sole : atto.neon; c.fillRect(sx - w2 / 2, yy, w2, 1.5 + i * 0.15);
    }
    c.globalAlpha = 1;
    // Castel dell'Ovo sull'acqua
    const cx0 = W * 0.08, cy0 = y0 + H * 0.035, cs = Math.max(26, W * 0.035);
    c.fillStyle = "#06040c"; c.strokeStyle = atto.neon2; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(cx0 - cs * 1.6, cy0); c.lineTo(cx0 - cs * 1.4, cy0 - cs * 0.5); c.lineTo(cx0 - cs * 0.3, cy0 - cs * 0.55);
    c.lineTo(cx0 - cs * 0.3, cy0 - cs); c.lineTo(cx0 + cs * 0.4, cy0 - cs); c.lineTo(cx0 + cs * 0.4, cy0 - cs * 0.6);
    c.lineTo(cx0 + cs * 1.5, cy0 - cs * 0.5); c.lineTo(cx0 + cs * 1.9, cy0); c.closePath(); c.fill(); c.stroke();
    for (let i = 0; i < 6; i++) c.fillRect(cx0 - cs * 0.3 + i * cs * 0.13, cy0 - cs * 1.08, cs * 0.07, cs * 0.1);
    // palazzi sulla linea di costa (a destra del castello e sotto il vulcano)
    finestre = [];
    const rb = rnd(88 + atto.n);
    let x = W * 0.16;
    while (x < W) {
      const bw = 16 + rb() * 34, bh = H * (0.03 + rb() * (W < 700 ? 0.06 : 0.09));
      const by = y0 - bh + 2;
      c.fillStyle = "#07050d"; c.fillRect(x, by, bw, bh);
      c.fillStyle = atto.neon; c.globalAlpha = 0.5; c.fillRect(x, by, bw, 1); c.globalAlpha = 1;
      if (rb() < 0.25) { c.fillStyle = "#07050d"; c.fillRect(x + bw * 0.4, by - 10, 2, 10); }  // antenna
      if (rb() < 0.18) { c.beginPath(); c.arc(x + bw / 2, by, bw * 0.45, Math.PI, 0); c.fill(); }  // cupola
      for (let fy = by + 5; fy < y0 - 4; fy += 7) for (let fx = x + 4; fx < x + bw - 4; fx += 6) {
        finestre.push({ x: fx, y: fy, k: rb(), col: rb() < 0.7 ? "#ffd98a" : (rb() < 0.5 ? atto.neon : atto.neon2) });
      }
      x += bw + 2 + rb() * 10;
    }
    // pino marittimo in primo piano (la cartolina non è completa senza)
    const px = W * (W < 700 ? 0.06 : 0.9), pb = H, ph = H * 0.5, ps = W < 700 ? 0.7 : 1;
    c.strokeStyle = "#040208"; c.lineWidth = 9 * ps; c.lineCap = "round";
    c.beginPath(); c.moveTo(px, pb); c.bezierCurveTo(px - 20 * ps, pb - ph * 0.4, px + 40 * ps, pb - ph * 0.7, px + 10 * ps, pb - ph); c.stroke();
    c.lineWidth = 4 * ps; c.beginPath(); c.moveTo(px + 12 * ps, pb - ph * 0.72); c.lineTo(px + 70 * ps, pb - ph * 0.9); c.stroke();
    c.fillStyle = "#040208";
    const chioma = (cx, cy, rx, ry) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); c.bezierCurveTo(cx + rx, cy + ry * 0.35, cx - rx, cy + ry * 0.35, cx - rx, cy); c.fill(); };
    chioma(px + 10 * ps, pb - ph, 110 * ps, 34 * ps); chioma(px + 70 * ps, pb - ph * 0.9, 70 * ps, 22 * ps);
    c.strokeStyle = atto.neon; c.globalAlpha = 0.4; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(px + 10 * ps, pb - ph, 110 * ps, 34 * ps, 0, Math.PI, 0); c.stroke(); c.globalAlpha = 1;
    // nebbia dell'atto
    c.fillStyle = atto.nebbia; c.fillRect(0, y0 - H * 0.12, W, H * 0.2);
    luciQuartiere(true);
  }

  // quota di finestre accese: cresce con i personaggi del quartiere
  function luciQuartiere(silenzioso) {
    const n = typeof contaQuartiere === "function" ? contaQuartiere(S) : 0;
    luci = 0.06 + 0.9 * (1 - Math.exp(-n / 90));
    if (!silenzioso) {} // le finestre si leggono ad ogni fotogramma
  }

  function eruzione(forza) {
    erutta = Math.max(erutta, forza || 1);
    if (!V) return;
    for (let i = 0; i < 26 * (forza || 1); i++) {
      bombe.push({ x: V.cratere.x, y: V.cratere.y, vx: caso(-140, 140), vy: caso(-340, -160), v: 1, r: caso(1.5, 4) });
    }
  }

  function frame(ora) {
    if (!cv || document.hidden) return;
    const passo = qualita === "bassa" ? 1000 / 15 : 1000 / 30;
    if (ora - ultimo < passo) return;
    const dt = Math.min(0.1, (ora - ultimo) / 1000); ultimo = ora; t += dt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(fisso, 0, 0, W, H);
    const y0 = orizz();
    // cratere che pulsa
    if (V) {
      const p = 0.55 + 0.25 * Math.sin(t * 1.7) + erutta * 0.5;
      const cg = g.createRadialGradient(V.cratere.x, V.cratere.y, 2, V.cratere.x, V.cratere.y, 90 + erutta * 120);
      cg.addColorStop(0, `rgba(255,180,80,${Math.min(1, p)})`); cg.addColorStop(0.3, `rgba(255,90,31,${p * 0.5})`); cg.addColorStop(1, "rgba(255,60,20,0)");
      g.fillStyle = cg; g.fillRect(V.cratere.x - 250, V.cratere.y - 250, 500, 500);
      // colate di lava animate
      g.save(); g.lineCap = "round";
      g.setLineDash([10, 14]); g.lineDashOffset = -t * 18;
      g.strokeStyle = "rgba(255,110,40,.8)"; g.lineWidth = 2.2;
      for (const k of [-1, 0.6, 1.6]) {
        g.beginPath(); g.moveTo(V.cratere.x + k * 8, V.cratere.y + 3);
        g.quadraticCurveTo(V.cratere.x + k * 40, V.cratere.y + V.alt * 0.45, V.cratere.x + k * 70 - 20, y0 - 4); g.stroke();
      }
      g.restore();
      // fumo
      if (qualita !== "bassa" && Math.random() < 0.5) fumo.push({ x: V.cratere.x + caso(-6, 6), y: V.cratere.y - 4, r: caso(6, 12), v: 1 });
      for (let i = fumo.length - 1; i >= 0; i--) {
        const f = fumo[i]; f.y -= 14 * dt; f.x += 10 * dt; f.r += 6 * dt; f.v -= 0.12 * dt;
        if (f.v <= 0) { fumo.splice(i, 1); continue; }
        g.fillStyle = `rgba(60,40,80,${f.v * 0.35})`; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 7); g.fill();
      }
      // lapilli dell'eruzione
      for (let i = bombe.length - 1; i >= 0; i--) {
        const b = bombe[i]; b.vy += 260 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.v -= 0.35 * dt;
        if (b.v <= 0 || b.y > y0) { bombe.splice(i, 1); continue; }
        g.fillStyle = `rgba(255,${120 + (b.v * 100) | 0},40,${b.v})`; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
      }
    }
    // finestre accese secondo il quartiere (poche tremolano)
    for (const f of finestre) {
      if (f.k > luci) continue;
      const trem = f.k > luci - 0.03 && Math.sin(t * 7 + f.x) > 0.6;
      g.globalAlpha = trem ? 0.3 : 0.85; g.fillStyle = f.col; g.fillRect(f.x, f.y, 2.5, 3);
    }
    g.globalAlpha = 1;
    // griglia del golfo che scorre verso di noi
    if (qualita !== "bassa") {
      g.strokeStyle = atto.neon2; g.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const z = ((i + (t * 0.6) % 1) / 12);
        const yy = y0 + (H - y0) * z * z;
        g.globalAlpha = 0.05 + z * 0.22; g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke();
      }
      g.globalAlpha = 0.1;
      for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(W / 2 + i * 30, y0); g.lineTo(W / 2 + i * W * 0.16, H); g.stroke(); }
      g.globalAlpha = 1;
    }
    // droni con luce lampeggiante
    if (Math.random() < 0.004 && droni.length < 3) droni.push({ x: -20, y: caso(H * 0.08, y0 * 0.6), v: caso(30, 70) });
    for (let i = droni.length - 1; i >= 0; i--) {
      const d = droni[i]; d.x += d.v * dt; if (d.x > W + 20) { droni.splice(i, 1); continue; }
      g.fillStyle = "#0a0614"; g.fillRect(d.x - 6, d.y, 12, 2);
      g.fillStyle = Math.sin(t * 10 + i) > 0 ? "#ff3b5c" : atto.neon2; g.fillRect(d.x - 1, d.y - 2, 2, 2);
    }
    // braci che salgono
    if (qualita !== "bassa" && Math.random() < 0.25 + erutta) braci.push({ x: caso(0, W), y: H + 4, v: 1, s: caso(20, 50), r: caso(0.8, 2) });
    for (let i = braci.length - 1; i >= 0; i--) {
      const b = braci[i]; b.y -= b.s * dt; b.x += Math.sin(t * 2 + i) * 8 * dt; b.v -= 0.08 * dt;
      if (b.v <= 0 || b.y < 0) { braci.splice(i, 1); continue; }
      g.fillStyle = `rgba(255,${140 + (i % 80)},60,${b.v * 0.8})`; g.fillRect(b.x, b.y, b.r, b.r);
    }
    // lampo dell'eruzione
    if (erutta > 0) {
      g.fillStyle = `rgba(255,120,40,${Math.min(0.35, erutta * 0.2)})`; g.fillRect(0, 0, W, H);
      erutta = Math.max(0, erutta - dt * 0.5);
    }
  }

  return {
    init, frame, eruzione, impostaQualita,
    atto: a => { atto = a; if (cv) disegnaFisso(); },
    quartiere: () => luciQuartiere()
  };
})();
