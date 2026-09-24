/**
 * Il fondo DaProd: la pioggia Matrix e le bolle, quelle del sito.
 *
 * ⚠ Nuovo nella 1.4.0, col vestito (`daprod.css`). Si carica con un tag solo,
 * e si mette da sé le sue due tele sotto a tutto:
 *
 *     <script src="/comune/daprod-sfondo.js" data-effetti="leggeri" defer></script>
 *
 * **Quanto si muove lo decide chi lo carica**, perché costa diverso a seconda
 * di dove sta. `data-effetti`:
 *
 * - `pieni`: pioggia e bolle che si muovono. È l'hub, la console, la sala
 *   giochi: pagine dove si guarda, non dove si genera;
 * - `leggeri`: la pioggia disegnata una volta e ferma, e niente bolle. È per
 *   le schede che generano: il vetro sfoca quello che ha sotto, e uno sfondo
 *   che si muove costringe la scheda video a rifare lo sfocato a ogni
 *   fotogramma — mentre la stessa scheda sta disegnando un'immagine;
 * - `spenti`: niente.
 *
 * E vince sempre chi usa il programma: `localStorage["daprod.effetti"]`, se
 * c'è, conta più dell'attributo. E chi ha chiesto al sistema meno movimento non
 * vede niente che si muova.
 *
 * Quando la finestra non si guarda (`document.hidden`) si ferma tutto.
 */
(function () {
  "use strict";
  if (window.__daprodSfondo) return;
  window.__daprodSfondo = true;

  var tag = document.currentScript;
  var scelto = (tag && tag.getAttribute("data-effetti")) || "pieni";
  try {
    scelto = localStorage.getItem("daprod.effetti") || scelto;
  } catch (e) {
    /* storage bloccato: vale l'attributo */
  }
  var poco = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (scelto === "spenti") return;
  var muovi = scelto === "pieni" && !poco;

  function tela(id) {
    var c = document.createElement("canvas");
    c.id = id;
    c.setAttribute("aria-hidden", "true");
    document.body.insertBefore(c, document.body.firstChild);
    return c;
  }

  function parti() {
    /* ── la pioggia ── */
    var mx = tela("daprod-pioggia");
    var x = mx.getContext("2d");
    var segni = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789@#$%₤";
    var fs = 14;
    var gocce = [];
    function misura() {
      mx.width = innerWidth;
      mx.height = innerHeight;
      gocce = [];
      for (var i = 0; i < Math.ceil(mx.width / fs); i++) gocce.push((Math.random() * mx.height) / fs);
      if (!muovi) for (var k = 0; k < 60; k++) goccia();
    }
    function goccia() {
      x.fillStyle = "rgba(2,8,6,.08)";
      x.fillRect(0, 0, mx.width, mx.height);
      x.font = fs + "px monospace";
      for (var i = 0; i < gocce.length; i++) {
        var v = gocce[i];
        x.fillStyle = Math.random() > 0.97 ? "#b8ffd0" : i % 7 === 0 ? "#3ddbff" : "#00ff41";
        x.fillText(segni[Math.floor(Math.random() * segni.length)], i * fs, v * fs);
        if (v * fs > mx.height && Math.random() > 0.975) gocce[i] = 0;
        gocce[i]++;
      }
    }
    misura();
    addEventListener("resize", misura);
    if (muovi) {
      setInterval(function () {
        if (!document.hidden) goccia();
      }, 60);
    }

    if (!muovi) return;

    /* ── le bolle ── */
    var cb = tela("daprod-bolle");
    var b = cb.getContext("2d");
    var W = 0;
    var H = 0;
    var bolle = [];
    function nuova(dalFondo) {
      var r = 5 + Math.random() * Math.random() * 24;
      return {
        x: Math.random() * W,
        y: dalFondo ? H + r + Math.random() * H * 0.3 : Math.random() * H,
        r: r,
        v: 0.15 + Math.random() * 0.4 + r / 140,
        w: Math.random() * Math.PI * 2,
        ws: 0.004 + Math.random() * 0.01,
      };
    }
    function misuraBolle() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth;
      H = innerHeight;
      cb.width = W * dpr;
      cb.height = H * dpr;
      cb.style.width = W + "px";
      cb.style.height = H + "px";
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      bolle = [];
      for (var i = 0; i < Math.round(Math.min(9, W / 150)); i++) bolle.push(nuova(false));
    }
    function disegna(o) {
      var g = b.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.4, o.r * 0.05, o.x, o.y, o.r);
      g.addColorStop(0, "rgba(255,255,255,.26)");
      g.addColorStop(0.55, "rgba(61,219,255,.03)");
      g.addColorStop(0.9, "rgba(61,255,160,.13)");
      g.addColorStop(1, "rgba(180,255,230,.38)");
      b.fillStyle = g;
      b.beginPath();
      b.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      b.fill();
      b.fillStyle = "rgba(255,255,255,.55)";
      b.beginPath();
      b.ellipse(o.x - o.r * 0.38, o.y - o.r * 0.45, o.r * 0.26, o.r * 0.14, -0.6, 0, Math.PI * 2);
      b.fill();
    }
    function fotogramma() {
      b.clearRect(0, 0, W, H);
      for (var i = 0; i < bolle.length; i++) {
        var o = bolle[i];
        o.y -= o.v;
        o.w += o.ws;
        o.x += Math.sin(o.w) * 0.35;
        if (o.y < -o.r * 2) bolle[i] = nuova(true);
        disegna(bolle[i]);
      }
      if (!document.hidden) requestAnimationFrame(fotogramma);
    }
    misuraBolle();
    addEventListener("resize", misuraBolle);
    requestAnimationFrame(fotogramma);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) requestAnimationFrame(fotogramma);
    });
  }

  if (document.body) parti();
  else document.addEventListener("DOMContentLoaded", parti);
})();
