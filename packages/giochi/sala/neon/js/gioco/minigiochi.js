/**
 * NEON PARTENOPE — la Sala Giochi del Golfo: cinque minigiochi con ricarica di 3 minuti
 * (o un Biglietto per giocare subito). I premi crescono con il quartiere e con la discesa.
 */
"use strict";

const RICARICA_MINI = 180; // secondi
const MINIGIOCHI = [
  { id: "sfera", i: "🔘", n: "La Sfera di sinteticoMC", d: "Timing: ferma lo spillo nella fascia d'oro. Otto tentativi.", avvia: () => giocaSfera() },
  { id: "pesca", i: "🎣", n: "Pesca nel Golfo di Lava", d: "Prendi i pesci nella zona arancione: le prese di fila fanno COMBO.", avvia: () => giocaPesca() },
  { id: "botte", i: "🔨", n: "Botte a Ruggine", d: "Acchiappa-robot: 25 secondi, le bombe valgono triplo.", avvia: () => giocaBotte() },
  { id: "carte", i: "🔮", n: "Le Carte della Cartomante", d: "Memory del quartiere: trova tutte le coppie con meno errori possibili.", avvia: () => giocaCarte() },
  { id: "ruota", i: "🎡", n: "Ruota del Mercante", d: "Gira la ruota di Pacco: jackpot, sconti, furie e biglietti. Costa 1 🎟️ o 30 ⚙️.", avvia: () => giocaRuota() }
];

let mgAttivo = null; // { ferma: fn }

function ricaricaMini(id) { return Math.max(0, Math.ceil(((S.mini[id] || 0) - Date.now()) / 1000)); }
function premioBaseMini() { return Math.max(produzione() * 45, lireStanza(S.maxStanza) * 45, 400); }

function avviaMini(id, conBiglietto) {
  const m = MINIGIOCHI.find(x => x.id === id); if (!m) return;
  if (id !== "ruota" && ricaricaMini(id) > 0) {
    if (!conBiglietto) return;
    if (!paga("biglietti", 1)) { toast("🎟️", "Serve 1 Biglietto", "per giocare subito"); return; }
  }
  Suono.suona("clic");
  m.avvia();
}
function fermaMini() {
  if (mgAttivo) { try { mgAttivo.ferma(); } catch (e) { /* già fermo */ } }
  mgAttivo = null;
}

function risultatoMini(id, titolo, riga, punteggio01) {
  fermaMini();
  const q = limita(punteggio01, 0, 1.6);
  const lire = premioBaseMini() * (0.2 + q);
  const rott = Math.round((10 + 30 * q) * attoDi(S.maxStanza).n);
  const big = q >= 1 ? 1 : 0;
  guadagna(lire); S.rottami += rott; S.biglietti += big;
  S.stats.mini++;
  if (id !== "ruota") S.mini[id] = Date.now() + RICARICA_MINI * 1000;
  Suono.suona("vittoria");
  $("modCorpo").innerHTML = `
    <div class="mg-esito">
      <div class="mg-titolo">${esc(titolo)}</div>
      <div class="mg-riga">${riga}</div>
      <div class="mg-premi">
        <div><b>₤ ${fmt(lire)}</b><small>lire</small></div>
        <div><b>⚙️ ${fmt(rott)}</b><small>rottami</small></div>
        ${big ? "<div><b>🎟️ 1</b><small>biglietto</small></div>" : ""}
      </div>
      <button class="btn oro grande" data-azione="chiudiModale">✓ Riscuoti</button>
    </div>`;
  richiediRender();
}

// ------------------------------------------------ 1. LA SFERA (timing)
function giocaSfera() {
  const st = { prova: 0, punti: 0, pos: 0, dir: 1, vivo: true, vel: 0.9 };
  apriModale("🔘 La Sfera di sinteticoMC", `
    <div class="mg-hud" id="mgHud">Punti 0 / 48 · Tentativo 1 / 8</div>
    <div class="mg-sfera" id="mgZona"><div class="mg-oro"></div><div class="mg-oro2"></div><div class="mg-spillo" id="mgSpillo"></div></div>
    <p class="mg-aiuto">Tocca la barra, premi il pulsante o SPAZIO quando lo spillo è nella fascia d'oro. Il centro vale doppio.</p>
    <button class="btn oro grande" id="mgColpo">✋ ORA!</button>`, fermaMini);
  const zona = $("mgZona"), spillo = $("mgSpillo");
  let ult = performance.now();
  function giro(t) {
    if (!st.vivo) return;
    const dt = Math.min(0.05, (t - ult) / 1000); ult = t;
    st.pos += st.dir * st.vel * dt;
    if (st.pos > 1) { st.pos = 1; st.dir = -1; } if (st.pos < 0) { st.pos = 0; st.dir = 1; }
    spillo.style.left = (st.pos * 100) + "%";
    requestAnimationFrame(giro);
  }
  function prova() {
    if (!st.vivo) return;
    const dist = Math.abs(st.pos - 0.5);
    const p = dist < 0.035 ? 6 : (dist < 0.09 ? 3 : 0);
    st.punti += p; st.prova++; st.vel *= 1.12;
    Suono.suona(p ? (p === 6 ? "critico" : "colpo") : "errore");
    zona.classList.remove("ok", "no"); void zona.offsetWidth; zona.classList.add(p ? "ok" : "no");
    $("mgHud").textContent = `Punti ${st.punti} / 48 · Tentativo ${Math.min(8, st.prova + 1)} / 8`;
    if (st.prova >= 8) { st.vivo = false; setTimeout(() => risultatoMini("sfera", "Sfera sintonizzata!", `Punteggio: <b>${st.punti}</b> / 48`, st.punti / 36), 400); }
  }
  const tasto = e => { if (e.code === "Space") { e.preventDefault(); prova(); } };
  document.addEventListener("keydown", tasto);
  zona.onpointerdown = e => { e.preventDefault(); prova(); };
  $("mgColpo").onclick = prova;
  mgAttivo = { ferma: () => { st.vivo = false; document.removeEventListener("keydown", tasto); } };
  requestAnimationFrame(giro);
}

// ------------------------------------------------ 2. PESCA (combo)
function giocaPesca() {
  const st = { pesci: 0, combo: 1, maxCombo: 1, lanci: 0, pos: 0.1, dir: 1, vivo: true, vel: 0.55 };
  apriModale("🎣 Pesca nel Golfo di Lava", `
    <div class="mg-hud" id="mgHud">Pesci 0 / 12 · COMBO ×1</div>
    <canvas class="mg-tela" id="mgTela" width="720" height="300"></canvas>
    <p class="mg-aiuto">Tocca l'acqua quando il pesce è nella zona arancione. 20 lanci, le prese di fila alzano la COMBO.</p>`, fermaMini);
  const cv = $("mgTela"), g = cv.getContext("2d");
  let ult = performance.now(), onda = 0;
  const zona = [0.55, 0.72];
  function giro(t) {
    if (!st.vivo) return;
    const dt = Math.min(0.05, (t - ult) / 1000); ult = t; onda += dt;
    st.pos += st.dir * st.vel * dt;
    if (st.pos > 1) { st.pos = 1; st.dir = -1; } if (st.pos < 0) { st.pos = 0; st.dir = 1; }
    const W = cv.width, H = cv.height;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0b2a40"); gr.addColorStop(1, "#050d18");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(53,232,255,.12)"; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, 40 + i * 45 + Math.sin(x / 50 + onda * 2 + i) * 5); g.stroke(); }
    g.fillStyle = "rgba(255,90,31,.22)"; g.fillRect(zona[0] * W, 0, (zona[1] - zona[0]) * W, H);
    g.strokeStyle = "#ff8a3d"; g.setLineDash([10, 8]); g.lineWidth = 3; g.strokeRect(zona[0] * W, 4, (zona[1] - zona[0]) * W, H - 8); g.setLineDash([]);
    const fx = 30 + st.pos * (W - 60), fy = H * 0.6 + Math.sin(onda * 3) * 12, dentro = st.pos >= zona[0] && st.pos <= zona[1];
    g.save(); g.translate(fx, fy); if (st.dir < 0) g.scale(-1, 1);
    g.shadowColor = dentro ? "#ffd54a" : "#5dffb4"; g.shadowBlur = 18;
    g.fillStyle = dentro ? "#ffd54a" : "#5dffb4";
    g.beginPath(); g.moveTo(38, 0); g.quadraticCurveTo(0, -24, -26, 0); g.quadraticCurveTo(0, 24, 38, 0); g.fill();
    g.beginPath(); g.moveTo(-22, 0); g.lineTo(-44, -16); g.lineTo(-44, 16); g.fill();
    g.shadowBlur = 0; g.fillStyle = "#07060d"; g.beginPath(); g.arc(20, -5, 4, 0, 7); g.fill(); g.restore();
    g.font = "800 20px Rajdhani, sans-serif"; g.textAlign = "center"; g.fillStyle = dentro ? "#ffd54a" : "#8fb2cc";
    g.fillText(dentro ? "⚡ ADESSO!" : `lanci rimasti: ${20 - st.lanci}`, W / 2, H - 16);
    requestAnimationFrame(giro);
  }
  cv.onpointerdown = e => {
    e.preventDefault(); if (!st.vivo) return;
    st.lanci++;
    if (st.pos >= zona[0] && st.pos <= zona[1]) { st.pesci++; st.combo += 0.5; st.maxCombo = Math.max(st.maxCombo, st.combo); st.vel *= 1.07; Suono.suona("kill"); }
    else { st.combo = 1; Suono.suona("errore"); }
    $("mgHud").textContent = `Pesci ${st.pesci} / 12 · COMBO ×${String(st.combo).replace(".", ",")}`;
    if (st.pesci >= 12 || st.lanci >= 20) {
      st.vivo = false;
      setTimeout(() => risultatoMini("pesca", "Marea pescata!", `<b>${st.pesci}</b> pesci · combo massima <b>×${String(st.maxCombo).replace(".", ",")}</b>`, st.pesci / 12 * (0.6 + st.maxCombo / 10)), 350);
    }
  };
  mgAttivo = { ferma: () => { st.vivo = false; } };
  requestAnimationFrame(giro);
}

// ------------------------------------------------ 3. BOTTE A RUGGINE (acchiappa-robot)
function giocaBotte() {
  const st = { punti: 0, tempo: 25, vivo: true };
  apriModale("🔨 Botte a Ruggine", `
    <div class="mg-hud" id="mgHud">⏱ 25s · Colpi 0</div>
    <div class="mg-buche" id="mgBuche">${"<div class='buca'></div>".repeat(9)}</div>
    <p class="mg-aiuto">⚙️ = 1 punto · 💣 = 3 punti · 👻 = -2 punti. Non farteli scappare!</p>`, fermaMini);
  const buche = Array.from($("mgBuche").children);
  function spunta() {
    if (!st.vivo) return;
    const libere = buche.filter(b => !b.firstChild);
    if (libere.length) {
      const b = scegli(libere), r = Math.random();
      const tipo = r < 0.6 ? "⚙️" : (r < 0.85 ? "💣" : "👻");
      const e = document.createElement("button"); e.className = "talpa"; e.textContent = tipo;
      b.appendChild(e);
      const vita = Math.max(480, 1150 - (25 - st.tempo) * 26);
      setTimeout(() => e.remove(), vita);
      e.onpointerdown = ev => {
        ev.preventDefault(); if (!st.vivo) return;
        st.punti += tipo === "⚙️" ? 1 : (tipo === "💣" ? 3 : -2);
        Suono.suona(tipo === "👻" ? "errore" : "colpo");
        e.classList.add("presa"); setTimeout(() => e.remove(), 150);
      };
    }
    setTimeout(spunta, Math.max(260, 620 - (25 - st.tempo) * 14));
  }
  const timer = setInterval(() => {
    if (!st.vivo) return;
    st.tempo -= 0.1;
    $("mgHud").textContent = `⏱ ${Math.ceil(st.tempo)}s · Colpi ${st.punti}`;
    if (st.tempo <= 0) { st.vivo = false; clearInterval(timer); risultatoMini("botte", "Tempo scaduto!", `Hai fatto <b>${st.punti}</b> punti`, st.punti / 40); }
  }, 100);
  mgAttivo = { ferma: () => { st.vivo = false; clearInterval(timer); } };
  spunta();
}

// ------------------------------------------------ 4. CARTE DELLA CARTOMANTE (memory)
function giocaCarte() {
  const icone = ["🔘", "🔧", "☕", "📦", "🎣", "🔮", "🧺", "⛪"];
  const mazzo = mescola(icone.concat(icone));
  const st = { aperte: [], trovate: 0, errori: 0, blocco: false, vivo: true };
  apriModale("🔮 Le Carte della Cartomante", `
    <div class="mg-hud" id="mgHud">Coppie 0 / 8 · Errori 0</div>
    <div class="mg-carte" id="mgCarte">${mazzo.map((c, i) => `<button class="carta-mg" data-i="${i}"><span class="dorso">🂠</span><span class="faccia">${c}</span></button>`).join("")}</div>`, fermaMini);
  const carte = Array.from($("mgCarte").children);
  carte.forEach(el => el.onclick = () => {
    if (st.blocco || !st.vivo || el.classList.contains("girata")) return;
    el.classList.add("girata"); st.aperte.push(el); Suono.suona("clic");
    if (st.aperte.length === 2) {
      const [a, b] = st.aperte; st.aperte = [];
      if (mazzo[a.dataset.i] === mazzo[b.dataset.i]) {
        st.trovate++; a.classList.add("presa"); b.classList.add("presa"); Suono.suona("kill");
        if (st.trovate === 8) { st.vivo = false; setTimeout(() => risultatoMini("carte", "Il futuro è chiaro!", `Tutte le coppie con <b>${st.errori}</b> errori`, Math.max(0.2, 1.3 - st.errori * 0.07)), 500); }
      } else {
        st.errori++; st.blocco = true; Suono.suona("errore");
        setTimeout(() => { a.classList.remove("girata"); b.classList.remove("girata"); st.blocco = false; }, 750);
      }
      $("mgHud").textContent = `Coppie ${st.trovate} / 8 · Errori ${st.errori}`;
    }
  });
  mgAttivo = { ferma: () => { st.vivo = false; } };
}

// ------------------------------------------------ 5. RUOTA DEL MERCANTE
const SPICCHI = [
  { i: "₤", n: "Jackpot di lire", col: "#ffd54a", fai: () => { const l = premioBaseMini() * 2.5; guadagna(l); return "+" + fmtLire(l); } },
  { i: "⚡", n: "Furia del Mercante", col: "#ff3df2", fai: () => { aggiungiBuff("dan", 5, 45, "Furia del Mercante"); return "Danno ×5 per 45 s"; } },
  { i: "⚙️", n: "Cassa di rottami", col: "#8fb2cc", fai: () => { const r = 40 * attoDi(S.maxStanza).n; S.rottami += r; return "+" + r + " ⚙️"; } },
  { i: "💰", n: "Borsa in festa", col: "#5dffb4", fai: () => { aggiungiBuff("prod", 4, 60, "Borsa in festa"); return "Produzione ×4 per 60 s"; } },
  { i: "🎟️", n: "Tre biglietti", col: "#35e8ff", fai: () => { S.biglietti += 3; return "+3 🎟️"; } },
  { i: "🏷️", n: "Sconto Merceria", col: "#ff8a3d", fai: () => { S.sconto = Math.min(0.5, (S.sconto || 0) + 0.1); sporca(); return "Merceria -10% (fino al 50%)"; } },
  { i: "🎯", n: "Occhio fino", col: "#b07bff", fai: () => { aggiungiBuff("crit", 0.25, 60, "Occhio fino"); return "Critico +25% per 60 s"; } },
  { i: "🎁", n: "Pacco regalo", col: "#ff5a1f", fai: () => { S.biglietti += 3; apriPacco(); return "Un oggetto dalla Merceria!"; } }
];
function giocaRuota() {
  let gira = false, ang = 0;
  apriModale("🎡 Ruota del Mercante", `
    <div class="mg-ruota"><canvas id="mgRuota" width="420" height="420"></canvas><div class="mg-freccia">▼</div></div>
    <div class="mg-hud" id="mgHud">Hai ${fmt(S.biglietti)} 🎟️ e ${fmt(S.rottami)} ⚙️</div>
    <button class="btn oro grande" id="mgGira">🎡 GIRA (${S.biglietti >= 1 ? "1 🎟️" : "30 ⚙️"})</button>`, fermaMini);
  const cv = $("mgRuota"), g = cv.getContext("2d"), N = SPICCHI.length;
  function disegna() {
    const R = 200; g.clearRect(0, 0, 420, 420); g.save(); g.translate(210, 210); g.rotate(ang);
    for (let i = 0; i < N; i++) {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, i / N * 6.2832, (i + 1) / N * 6.2832); g.closePath();
      g.fillStyle = i % 2 ? "#150e24" : "#241640"; g.fill(); g.strokeStyle = SPICCHI[i].col; g.lineWidth = 2; g.stroke();
      g.save(); g.rotate((i + 0.5) / N * 6.2832); g.textAlign = "center"; g.font = "34px sans-serif"; g.fillStyle = SPICCHI[i].col; g.fillText(SPICCHI[i].i, R * 0.68, 12); g.restore();
    }
    g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fillStyle = "#07060d"; g.fill(); g.strokeStyle = "#ffd54a"; g.lineWidth = 4; g.stroke();
    g.fillStyle = "#ffd54a"; g.font = "900 22px Orbitron, sans-serif"; g.textAlign = "center"; g.fillText("D", 0, 8);
    g.restore();
  }
  disegna();
  $("mgGira").onclick = () => {
    if (gira) return;
    if (S.biglietti >= 1) S.biglietti--; else if (!paga("rottami", 30)) { toast("🎡", "Serve 1 🎟️ o 30 ⚙️", ""); return; }
    gira = true; S.stats.ruota++;
    const esito = Math.floor(Math.random() * N);
    // la freccia è in alto (angolo -90°): porta il centro dello spicchio lì
    const fine = -Math.PI / 2 - (esito + 0.5) / N * 2 * Math.PI + 2 * Math.PI * 6;
    const da = ang % (2 * Math.PI), t0 = performance.now(), dur = 3800;
    let ultimoSpicchio = -1;
    (function anima(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      ang = da + (fine - da) * e;
      const sp = Math.floor(((-ang - Math.PI / 2) / (2 * Math.PI) * N % N + N) % N);
      if (sp !== ultimoSpicchio) { ultimoSpicchio = sp; Suono.suona("ruota"); }
      disegna();
      if (p < 1) return requestAnimationFrame(anima);
      const x = SPICCHI[esito], txt = x.fai();
      S.stats.mini++;
      Suono.suona("vittoria");
      $("mgHud").innerHTML = `<b style="color:${x.col}">${x.i} ${x.n}</b> — ${esc(txt)}`;
      gira = false;
      $("mgGira").innerHTML = `🎡 GIRA ANCORA (${S.biglietti >= 1 ? "1 🎟️" : "30 ⚙️"})`;
      richiediRender();
    })(t0);
  };
  mgAttivo = { ferma: () => {} };
}
