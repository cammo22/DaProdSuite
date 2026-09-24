/**
 * Il fondo DaProd: la pioggia Matrix, quella del sito. (Le bolle c'erano fino
 * alla 1.4.4: vedi in fondo.)
 *
 * ⚠ Nuovo nella 1.4.0, col vestito (`daprod.css`). Si carica con un tag solo,
 * e si mette da sé la sua tela sotto a tutto:
 *
 *     <script src="/comune/daprod-sfondo.js" data-effetti="leggeri" defer></script>
 *
 * **Quanto si muove lo decide chi lo carica**, perché costa diverso a seconda
 * di dove sta. `data-effetti`:
 *
 * - `pieni`: la pioggia che si muove. È l'hub, la console, la sala
 *   giochi: pagine dove si guarda, non dove si genera;
 * - `leggeri`: la pioggia disegnata una volta e ferma. È per
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

    /*
     * ⚠ **Qui c'erano le bolle, tolte nella 1.4.5.** «Togliamo le bolle dallo
     * sfondo»: sopra la pioggia, dietro le schede della sala e i tesserini,
     * sembravano pezzi dell'interfaccia (una bolla dietro un bottone pare un
     * bottone), e costavano un disegno in piu' a ogni fotogramma su una tela
     * grande quanto lo schermo. Il lucido Y2K resta dove serve: nei bottoni e
     * nel vetro, che stanno fermi.
     */
  }

  if (document.body) parti();
  else document.addEventListener("DOMContentLoaded", parti);
})();
