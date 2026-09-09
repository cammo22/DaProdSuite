/**
 * Il copione della sala giochi: quello che succede quando si tocca qualcosa.
 *
 * ⚠ **Niente apici inversi qui dentro.** Questa stringa *e'* un apice inverso:
 * uno solo, in mezzo al codice, la chiuderebbe — e l'errore non punterebbe
 * nemmeno lontanamente al punto giusto. Le stringhe si attaccano col piu'.
 * E' la stessa regola della console della suite, per la stessa ragione.
 *
 * ⚠ **Qui non si pesca e non si paga.** Tutto quello che tocca i soldi succede
 * sul PC (CONCETTI.md § 3). Questa pagina chiede, riceve, e fa la scena.
 */

export const COPIONE = `
  var $ = function (id) { return document.getElementById(id); };

  /** Chi siamo, cosa c'e' sui rulli adesso, e cosa abbiamo tenuto fermo. */
  var io = null;
  var tavolo = "musica";
  var rulli = [];
  var pezzi = [];          // i pezzi usciti, uno per rullo
  var bloccati = [];       // gli id tenuti fermi, uno per rullo (o null)
  var inEuro = false;
  var girando = false;
  var pagina = "slot";

  /**
   * Il token, se chi ci ha aperti ce l'ha dato.
   *
   * Sta nel **frammento** (dopo il #) come nella console della suite: il
   * frammento non arriva al server, non finisce nei log e non finisce in un
   * Referer. Letto una volta, si cancella dall'indirizzo.
   */
  var token = "";
  (function dallIndirizzo() {
    try {
      var f = new URLSearchParams((location.hash || "").replace(/^#/, ""));
      var t = f.get("t");
      if (t) { token = t; localStorage.setItem("daprod.token", t); }
      else { token = localStorage.getItem("daprod.token") || ""; }
      if (t) history.replaceState(null, "", location.pathname + location.search);
    } catch (e) { token = ""; }
  })();

  /* ------------------------------------------------------- parlare col PC */

  function chiedi(metodo, dove, corpo) {
    var opzioni = { method: metodo, headers: {} };
    if (token) opzioni.headers["Authorization"] = "Bearer " + token;
    if (corpo) {
      opzioni.headers["Content-Type"] = "application/json";
      opzioni.body = JSON.stringify(corpo);
    }
    return fetch(RADICE + dove, opzioni).then(function (r) {
      return r.json().then(function (dati) {
        // Un «non si puo'» arriva con dentro la frase in italiano: si mostra
        // quella, non un numero. Il numero non lo puo' leggere nessuno.
        if (!r.ok) throw new Error((dati && dati.errore) || "Non ha funzionato.");
        return dati;
      });
    });
  }

  /* ------------------------------------------------------------- attrezzi */

  function sicuro(testo) {
    return String(testo == null ? "" : testo)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Le lire all'italiana. La pagina lo rifa' da se' solo per il tasto euro. */
  function soldi(quanto) {
    if (inEuro) return "€ " + (quanto / 1936.27).toFixed(2).replace(".", ",");
    var cifre = String(Math.abs(Math.round(quanto))).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
    return (quanto < 0 ? "-" : "") + "L. " + cifre;
  }

  function coloreDi(rarita) {
    for (var i = 0; i < (io && io.gradi ? io.gradi.length : 0); i++) {
      if (io.gradi[i].id === rarita) return io.gradi[i].colore;
    }
    return "#9aa0b5";
  }

  function nomeGrado(rarita) {
    for (var i = 0; i < (io && io.gradi ? io.gradi.length : 0); i++) {
      if (io.gradi[i].id === rarita) return io.gradi[i].nome;
    }
    return "";
  }

  var orologioAvviso = null;
  function avviso(testo, come) {
    var vecchio = document.querySelector(".avviso");
    if (vecchio) vecchio.remove();
    if (orologioAvviso) clearTimeout(orologioAvviso);
    var d = document.createElement("div");
    d.className = "avviso " + (come || "");
    d.textContent = testo;
    document.body.appendChild(d);
    orologioAvviso = setTimeout(function () { d.remove(); }, 4200);
  }

  function quando(ms) {
    var m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return "adesso";
    if (m < 60) return m + " minuti fa";
    var o = Math.floor(m / 60);
    if (o < 24) return o + (o === 1 ? " ora fa" : " ore fa");
    var g = Math.floor(o / 24);
    return g + (g === 1 ? " giorno fa" : " giorni fa");
  }

  /* ------------------------------------------------------------- i rulli */

  function rulliDelTavolo() {
    for (var i = 0; i < io.tavoli.length; i++) {
      if (io.tavoli[i].id === tavolo) return io.tavoli[i].rulli;
    }
    return [];
  }

  function disegnaTavoli() {
    var dentro = "";
    for (var i = 0; i < io.tavoli.length; i++) {
      var t = io.tavoli[i];
      dentro += "<button data-tavolo=\\"" + t.id + "\\"" +
        (t.id === tavolo ? " class=\\"scelto\\"" : "") + ">" + sicuro(t.nome) + "</button>";
    }
    $("tavoli").innerHTML = dentro;
  }

  function disegnaRulli() {
    var dentro = "";
    for (var i = 0; i < rulli.length; i++) {
      var r = rulli[i];
      var p = pezzi[i];
      var fermo = bloccati[i] ? " bloccato" : "";
      dentro += "<div class=\\"rullo" + fermo + "\\" data-rullo=\\"" + i + "\\">";
      dentro += "<div class=\\"barra\\" style=\\"background:" +
        (p ? coloreDi(p.rarita) : "#2e3340") + "\\"></div>";
      dentro += "<div class=\\"quale\\">" + sicuro(r.nome) + "</div>";
      dentro += "<div class=\\"nome\\">" + (p ? sicuro(p.nome) : "—") + "</div>";
      if (p && p.esempio) dentro += "<div class=\\"esempio\\">tipo " + sicuro(p.esempio) + "</div>";
      if (p) dentro += "<div class=\\"prezzo\\" style=\\"color:" + coloreDi(p.rarita) + "\\">" +
        soldi(p.prezzo) + "</div>";
      dentro += "<div class=\\"fermo\\">fermo</div>";
      dentro += "</div>";
    }
    $("rulli").innerHTML = dentro;

    var completa = pezzi.length === rulli.length && pezzi.length > 0;
    $("manda").disabled = !completa;
    $("prompt").innerHTML = completa
      ? sicuro(pezzi.map(function (p) { return p.testo; }).join(", "))
      : "<span class=\\"vuoto\\">Tira la leva.</span>";
  }

  function disegnaSaldo() {
    $("saldo").innerHTML = soldi(io.saldo) +
      " <small>&nbsp;giro " + soldi(io.costi.giro) + "</small>";
  }

  /* --------------------------------------------------------------- girare */

  function gira() {
    if (girando) return;
    girando = true;
    $("gira").disabled = true;
    var caselle = document.querySelectorAll(".rullo");
    for (var i = 0; i < caselle.length; i++) {
      if (!bloccati[i]) caselle[i].classList.add("gira");
    }

    chiedi("POST", "/gira", { tavolo: tavolo, bloccati: bloccati })
      .then(function (giro) {
        pezzi = giro.pezzi;
        io.saldo = giro.saldo;
        disegnaSaldo();
        // Il mezzo secondo non serve al PC: serve all'occhio. Senza, i rulli
        // cambiano prima che uno abbia finito di premere.
        setTimeout(function () {
          disegnaRulli();
          raccontaGiro(giro);
          girando = false;
          $("gira").disabled = false;
        }, 420);
      })
      .catch(function (errore) {
        girando = false;
        $("gira").disabled = false;
        disegnaRulli();
        avviso(errore.message, "male");
      });
  }

  function raccontaGiro(giro) {
    var e = $("esito");
    if (giro.pagato > 0) {
      var detti = giro.vincite.map(function (v) { return v.detto; }).join(" + ");
      e.className = "esito vinta";
      e.textContent = detti + " — " + soldi(giro.pagato);
    } else {
      e.className = "esito persa";
      e.textContent = "Vale " + soldi(giro.valore) + ". Tieni quello che ti piace e rigira.";
    }
    if (giro.regalo) {
      avviso("Ti e' caduta una figurina: " + giro.regalo.titolo, "bene");
    }
  }

  /* -------------------------------------------------------------- mandare */

  function manda() {
    if (pezzi.length !== rulli.length) return;
    chiedi("POST", "/manda", {
      tavolo: tavolo,
      pezzi: pezzi.map(function (p) { return p.id; }),
    })
      .then(function () {
        avviso("Mandata. Continua pure a giocare: ti diranno com'e' andata.", "bene");
        io.conto.mandate += 1;
      })
      .catch(function (errore) { avviso(errore.message, "male"); });
  }

  /* ----------------------------------------------------------------- mie */

  function figurinaHtml(c, opzioni) {
    var o = opzioni || {};
    var colore = coloreDi(c.rarita);
    var h = "<div class=\\"figurina" + (c.scoperta ? "" : " coperta") + "\\">";
    h += "<div class=\\"titolo\\">" + sicuro(c.titolo) + "</div>";
    h += "<div class=\\"sotto\\">";
    if (c.prezzo > 0) {
      h += "<span class=\\"pastiglia\\" style=\\"color:" + colore + "\\">" +
        sicuro(nomeGrado(c.rarita)) + " · " + soldi(c.prezzo) + "</span> ";
    }
    if (c.numero > 0) h += "n. " + c.numero + " · ";
    h += "di " + sicuro(c.daNome) + " · " + quando(c.quando);
    if (c.stato === "in-attesa") h += " · in attesa";
    if (c.stato === "buttata") h += " · buttata: " + sicuro(c.motivo);
    h += "</div>";
    if (c.scoperta && c.prompt) h += "<div class=\\"testo\\">" + sicuro(c.prompt) + "</div>";
    if (o.tasti) h += o.tasti;
    h += "</div>";
    return h;
  }

  function caricaMie() {
    chiedi("GET", "/mie").then(function (dati) {
      $("mie-mandate").innerHTML = dati.mandate.length
        ? dati.mandate.map(function (c) { return figurinaHtml(c); }).join("")
        : "<div class=\\"niente\\">Non hai ancora mandato niente. Monta una riga e mandala.</div>";
      $("mie-collezione").innerHTML = dati.collezione.length
        ? dati.collezione.map(function (c) { return figurinaHtml(c); }).join("")
        : "<div class=\\"niente\\">La collezione e' vuota. Si riempie giocando o coi pacchetti.</div>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* --------------------------------------------------------------- album */

  var serieAperta = 0;

  function caricaAlbum() {
    chiedi("GET", "/album").then(function (dati) {
      serieAperta = dati.serie;
      var m = dati.magazzino;
      var testo = "";
      if (dati.chiuse === 0) {
        testo = "Nessuna serie chiusa. Ne servono ancora <b>" + m.allaProssimaSerie +
          "</b> combinazioni prese perche' si possa comprare il primo pacchetto.";
        $("compra").disabled = true;
      } else {
        testo = "Serie <b>" + dati.serie + "</b> di " + dati.chiuse + " · " +
          "un pacchetto costa " + soldi(io.costi.pacchetto) + " e contiene " +
          io.costi.perPacchetto + " figurine.";
        $("compra").disabled = false;
      }
      testo += "<br><span style=\\"color:var(--spento)\\">In magazzino: " + m.prese +
        " · in attesa: " + m.inAttesa + "</span>";
      $("album-stato").innerHTML = "<div class=\\"figurina\\">" + testo + "</div>";
      $("album-figurine").innerHTML = dati.figurine.length
        ? dati.figurine.map(function (c) { return figurinaHtml(c); }).join("")
        : "<div class=\\"niente\\">Ancora niente in questa serie.</div>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function compraPacchetto() {
    chiedi("POST", "/pacchetto", { serie: serieAperta }).then(function (a) {
      io.saldo = a.saldo;
      disegnaSaldo();
      var nuove = a.figurine.filter(function (f) { return !f.doppione; }).length;
      avviso(
        nuove === 0
          ? "Tutti doppioni: " + soldi(a.vinto) + " indietro."
          : nuove + (nuove === 1 ? " figurina nuova" : " figurine nuove") +
            (a.vinto > 0 ? ", e " + soldi(a.vinto) + " dai doppioni" : ""),
        "bene",
      );
      caricaAlbum();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* ---------------------------------------------------------------- casa */

  function caricaClassifica() {
    chiedi("GET", "/classifica").then(function (dati) {
      $("classifica").innerHTML = dati.righe.length
        ? dati.righe.map(function (r) {
            return "<tr" + (r.io ? " class=\\"io\\"" : "") + ">" +
              "<td>" + sicuro(r.nome) + "</td>" +
              "<td>" + r.prese + "</td>" +
              "<td>" + r.collezione + "</td>" +
              "<td>" + soldi(r.colpoGrosso) + "</td>" +
              "<td>" + soldi(r.saldo) + "</td></tr>";
          }).join("")
        : "<tr><td colspan=\\"5\\" class=\\"niente\\">Non ha ancora giocato nessuno.</td></tr>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* ---------------------------------------------------------------- fila */

  function caricaFila() {
    if (!io.admin) return;
    chiedi("GET", "/fila").then(function (dati) {
      var quante = dati.inAttesa.length;
      $("quante-attesa").hidden = quante === 0;
      $("quante-attesa").textContent = String(quante);

      $("fila-attesa").innerHTML = quante
        ? dati.inAttesa.map(function (c) {
            var tasti = "<div class=\\"riga-tasti\\">" +
              "<input type=\\"number\\" min=\\"1\\" placeholder=\\"quanto vale, in lire\\" " +
              "data-prezzo=\\"" + c.id + "\\">" +
              "<button class=\\"btn oro\\" data-prendi=\\"" + c.id + "\\">Prendila</button>" +
              "<button class=\\"btn piano\\" data-butta=\\"" + c.id + "\\">Buttala</button>" +
              "</div>";
            return figurinaHtml(c, { tasti: tasti });
          }).join("")
        : "<div class=\\"niente\\">Niente da controllare. Buon segno o cattivo, dipende.</div>";

      $("fila-decise").innerHTML = dati.decise.length
        ? dati.decise.map(function (c) { return figurinaHtml(c); }).join("")
        : "<div class=\\"niente\\">Ancora niente.</div>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function prendila(id) {
    var casella = document.querySelector("[data-prezzo=\\"" + id + "\\"]");
    var prezzo = casella ? Number(casella.value) : 0;
    if (!prezzo || prezzo < 1) { avviso("Scrivi quanto vale, prima.", "male"); return; }
    chiedi("POST", "/prendi", { id: id, prezzo: prezzo }).then(function (c) {
      avviso("Presa: e' la numero " + c.numero + " del magazzino.", "bene");
      caricaFila();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function buttala(id) {
    var motivo = prompt("Perche' non va bene?");
    if (motivo === null) return;
    chiedi("POST", "/butta", { id: id, motivo: motivo }).then(function () {
      avviso("Buttata.", "bene");
      caricaFila();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* ------------------------------------------------------------ navigare */

  function vaiA(dove) {
    pagina = dove;
    var sezioni = document.querySelectorAll(".pagina");
    for (var i = 0; i < sezioni.length; i++) {
      sezioni[i].classList.toggle("viva", sezioni[i].id === "p-" + dove);
    }
    var tasti = document.querySelectorAll("nav button");
    for (var j = 0; j < tasti.length; j++) {
      tasti[j].classList.toggle("viva", tasti[j].getAttribute("data-va") === dove);
    }
    if (dove === "mie") caricaMie();
    if (dove === "album") caricaAlbum();
    if (dove === "casa") caricaClassifica();
    if (dove === "fila") caricaFila();
  }

  /* ------------------------------------------------------------- i tasti */

  document.addEventListener("click", function (evento) {
    var bersaglio = evento.target;

    var rullo = bersaglio.closest ? bersaglio.closest("[data-rullo]") : null;
    if (rullo) {
      var i = Number(rullo.getAttribute("data-rullo"));
      if (!pezzi[i]) return;
      bloccati[i] = bloccati[i] ? null : pezzi[i].id;
      disegnaRulli();
      return;
    }

    var scelta = bersaglio.closest ? bersaglio.closest("[data-tavolo]") : null;
    if (scelta) {
      tavolo = scelta.getAttribute("data-tavolo");
      rulli = rulliDelTavolo();
      pezzi = [];
      bloccati = [];
      $("esito").textContent = "";
      disegnaTavoli();
      disegnaRulli();
      return;
    }

    var va = bersaglio.closest ? bersaglio.closest("[data-va]") : null;
    if (va) { vaiA(va.getAttribute("data-va")); return; }

    var prendi = bersaglio.getAttribute && bersaglio.getAttribute("data-prendi");
    if (prendi) { prendila(prendi); return; }
    var butta = bersaglio.getAttribute && bersaglio.getAttribute("data-butta");
    if (butta) { buttala(butta); return; }
  });

  $("gira").addEventListener("click", gira);
  $("manda").addEventListener("click", manda);
  $("compra").addEventListener("click", compraPacchetto);
  $("saldo").addEventListener("click", function () {
    inEuro = !inEuro;
    disegnaSaldo();
    disegnaRulli();
  });
  $("copia").addEventListener("click", function () {
    var testo = pezzi.map(function (p) { return p.testo; }).join(", ");
    if (!testo) return;
    if (navigator.clipboard) navigator.clipboard.writeText(testo);
    avviso("Copiato.", "bene");
  });
  $("sblocca").addEventListener("click", function () {
    bloccati = [];
    disegnaRulli();
  });

  /* -------------------------------------------------------------- entrare */

  chiedi("GET", "/io").then(function (dati) {
    io = dati;
    $("mio-nome").textContent = dati.nome + (dati.admin ? " · decidi tu" : "");
    $("tasto-fila").hidden = !dati.admin;
    rulli = rulliDelTavolo();
    disegnaTavoli();
    disegnaRulli();
    disegnaSaldo();
    if (dati.admin) caricaFila();
  }).catch(function (errore) {
    document.querySelector("main").innerHTML =
      "<div class=\\"niente\\">" + sicuro(errore.message) + "</div>";
  });
`;
