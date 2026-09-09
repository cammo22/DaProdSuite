/**
 * Il copione della sala giochi: quello che succede quando si tocca qualcosa.
 *
 * ⚠ **Niente apici inversi qui dentro.** Questa stringa *e'* un apice inverso:
 * uno solo, in mezzo al codice, la chiuderebbe — e l'errore non punterebbe
 * nemmeno lontanamente al punto giusto. Le stringhe si attaccano col piu'.
 * E' la stessa regola della console della suite, per la stessa ragione, e c'e'
 * una guardia che la controlla: `scripts/niente-apici.mjs`.
 *
 * ⚠ **Qui non si pesca e non si paga.** Tutto quello che tocca i soldi succede
 * sul PC (CONCETTI.md § 3). Questa pagina chiede, riceve, e fa la scena.
 *
 * **La scena conta.** I rulli si fermano uno dopo l'altro invece che tutti
 * insieme, il numero vinto vola via, lo schermo lampeggia del colore del grado
 * e sulla roba grossa cadono i coriandoli. Non e' decorazione: e' la
 * differenza fra premere un tasto e giocare.
 */

export const COPIONE = `
  var $ = function (id) { return document.getElementById(id); };

  /** Chi siamo, cosa c'e' sui rulli adesso, e cosa abbiamo tenuto fermo. */
  var io = null;
  var tavolo = "musica";
  var era = "sempre";
  var rulli = [];
  var pezzi = [];          // i pezzi usciti, uno per rullo
  var bloccati = [];       // gli id tenuti fermi, uno per rullo (o null)
  var inEuro = false;
  var serieAperta = 0;
  /** Il grado scelto per la cosa che si sta prendendo, in fila. */
  var gradoScelto = {};

  /**
   * Quello che c'e' sui rulli, **tavolo per tavolo**, e tenuto da parte.
   *
   * ⚠ Chiesto il 9 settembre 2026: «se ho loccato dei prompt e cambio scheda me
   * li salva comunque, in modo da poter mischiare e rendere davvero particolari
   * i prompt nel tempo». Prima cambiare tavolo buttava tutto, e una riga montata
   * in dieci giri se ne andava per un tocco sbagliato.
   *
   * Sta nel deposito del browser, quindi resta anche chiudendo la pagina: una
   * combinazione buona si costruisce in piu' sere.
   */
  var tavoli = {};
  var CHIAVE_TAVOLI = "daprod.giochi.tavoli";

  function ricordaTavolo() {
    tavoli[tavolo] = { pezzi: pezzi, bloccati: bloccati, era: era };
    try { localStorage.setItem(CHIAVE_TAVOLI, JSON.stringify(tavoli)); } catch (e) {}
  }

  function riprendiTavolo() {
    var t = tavoli[tavolo];
    pezzi = t && t.pezzi ? t.pezzi : [];
    bloccati = t && t.bloccati ? t.bloccati : [];
    if (t && t.era) era = t.era;
  }

  (function riprendiDaPrima() {
    try {
      var scritto = localStorage.getItem(CHIAVE_TAVOLI);
      if (scritto) tavoli = JSON.parse(scritto) || {};
    } catch (e) { tavoli = {}; }
  })();

  /**
   * Il giro in corso, e come si salta la scena.
   *
   * ⚠ Chiesto il 9 settembre 2026: «rendiamola skippabile — se premo gira gira,
   * se ripremo gira salta l'animazione, in modo che la gente clicca super
   * veloce». Quindi: primo tocco gira, secondo tocco **taglia corto** e mostra
   * subito cos'e' uscito, terzo tocco rigira. Chi ha fretta non aspetta mai.
   *
   * Se il secondo tocco arriva **prima** che risponda il PC, si segna e basta:
   * quando la risposta arriva si va dritti al risultato senza scena.
   */
  var girando = false;
  var saltare = false;
  var orologiGiro = [];

  function pulisciOrologi() {
    for (var i = 0; i < orologiGiro.length; i++) clearTimeout(orologiGiro[i]);
    orologiGiro = [];
  }

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

  function scalinoDi(grado) {
    var g = io && io.gradi ? io.gradi : [];
    for (var i = 0; i < g.length; i++) if (g[i].id === grado) return g[i];
    return { id: "basic", nome: "Basic", colore: "#9aa0b5", fuoco: 0 };
  }

  /**
   * Il pannello grande: una cosa sola, scritta grossa.
   *
   * ⚠ Chiesto il 9 settembre 2026: «se teniamo premuto un prompt si apre
   * grande, scritto tutto grande che si vede bene anche per cecati». Si apre
   * **tenendo premuto** un rullo o la riga del prompt, e si chiude toccando
   * qualunque punto.
   *
   * Non e' solo per chi ci vede poco: un prompt di dodici pezzi, letto in una
   * casella larga tre centimetri, non lo legge nessuno.
   */
  function grande(titolo, sottotitolo, testo, colore) {
    var vecchio = document.querySelector(".grande");
    if (vecchio) vecchio.remove();
    var d = document.createElement("div");
    d.className = "grande";
    if (colore) d.style.setProperty("--g", colore);
    var h = "<div class=\\"dentro\\">";
    if (titolo) h += "<div class=\\"su\\">" + sicuro(titolo) + "</div>";
    if (sottotitolo) h += "<div class=\\"nomone\\">" + sicuro(sottotitolo) + "</div>";
    if (testo) h += "<div class=\\"testone\\">" + sicuro(testo) + "</div>";
    h += "<div class=\\"chiudi\\">tocca per chiudere</div></div>";
    d.innerHTML = h;
    d.addEventListener("click", function () { d.remove(); });
    document.body.appendChild(d);
  }

  /**
   * Tenere premuto: mezzo secondo, e si apre grande.
   *
   * Si aggancia una volta sola a tutto il documento e si guarda **cosa** si sta
   * tenendo premuto: un rullo apre quel pezzo, la riga del prompt apre il
   * prompt intero, una figurina apre la figurina. Un solo posto da cui parte
   * l'ingrandimento, invece di tre che si comportano diverso.
   */
  var orologioPressione = null;
  var premutoDa = null;

  function iniziaPressione(evento) {
    var b = evento.target;
    if (!b || !b.closest) return;
    premutoDa = b;
    if (orologioPressione) clearTimeout(orologioPressione);
    orologioPressione = setTimeout(function () {
      orologioPressione = null;
      apriGrandeDa(premutoDa);
    }, 480);
  }

  function fermaPressione() {
    if (orologioPressione) clearTimeout(orologioPressione);
    orologioPressione = null;
  }

  function apriGrandeDa(nodo) {
    if (!nodo || !nodo.closest) return;

    var rullo = nodo.closest("[data-rullo]");
    if (rullo) {
      var p = pezzi[Number(rullo.getAttribute("data-rullo"))];
      if (!p) return;
      var s = scalinoDi(p.grado);
      grande(
        rulli[Number(rullo.getAttribute("data-rullo"))].nome,
        p.nome,
        p.testo + (p.esempio ? "\\n\\ntipo " + p.esempio : "") + "\\n\\n" +
          s.nome + " · " + soldi(p.prezzo),
        s.colore,
      );
      return;
    }

    if (nodo.closest("#prompt") && pezzi.length) {
      grande(
        "Il prompt intero",
        pezzi.map(function (p) { return p.nome; }).join(" · "),
        pezzi.map(function (p) { return p.testo; }).join(", "),
        "",
      );
      return;
    }

    var fig = nodo.closest(".figurina");
    if (fig) {
      var titolo = fig.querySelector(".titolo");
      var testo = fig.querySelector(".testo");
      if (titolo) {
        grande("Figurina", titolo.textContent, testo ? testo.textContent : "", "");
      }
    }
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

  /* --------------------------------------------------------- gli effetti */

  /** Il numero che vola via quando si vince. */
  function numeroVolante(testo, colore) {
    var d = document.createElement("div");
    d.className = "volante";
    d.style.color = colore;
    d.textContent = testo;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1600);
  }

  /** Il lampo ai bordi dello schermo, del colore del grado. */
  function lampo(colore) {
    var d = document.createElement("div");
    d.className = "lampo";
    d.style.setProperty("--g", colore);
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1000);
  }

  /**
   * I coriandoli.
   *
   * Sono quadratini veri nel documento, non un disegno su tela: sono pochi
   * (sessanta) e durano due secondi, e cosi' non serve tenere acceso niente.
   */
  function coriandoli(quanti, colori) {
    for (var i = 0; i < quanti; i++) {
      var c = document.createElement("div");
      c.className = "coriandolo";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colori[Math.floor(Math.random() * colori.length)];
      c.style.animationDuration = (1.6 + Math.random() * 1.6) + "s";
      c.style.animationDelay = (Math.random() * 0.35) + "s";
      document.body.appendChild(c);
      (function (nodo) { setTimeout(function () { nodo.remove(); }, 3600); })(c);
    }
  }

  function scuoti() {
    var m = document.querySelector("main");
    m.classList.remove("scossa");
    // Il reflow serve: senza, togliere e rimettere la classe nello stesso
    // giro non fa ripartire l'animazione, e la seconda vincita di fila non
    // scuote niente.
    void m.offsetWidth;
    m.classList.add("scossa");
    setTimeout(function () { m.classList.remove("scossa"); }, 600);
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

  function disegnaEpoche() {
    var dentro = "";
    for (var i = 0; i < io.epoche.length; i++) {
      var e = io.epoche[i];
      dentro += "<button data-epoca=\\"" + e.id + "\\" title=\\"" + sicuro(e.nome) + "\\"" +
        (e.id === era ? " class=\\"scelto\\"" : "") + ">" + sicuro(e.segno) + "</button>";
    }
    $("epoche").innerHTML = dentro;
    // Le epoche si vedono solo dove hanno senso: nel tavolo delle immagini un
    // decennio non pesa niente, e un tasto che non fa niente e' peggio che non
    // averlo.
    $("epoche").hidden = tavolo !== "musica";
  }

  /** Il vestito della sala: i tre fondi e la luce dell'epoca scelta. */
  function vestiLaSala() {
    var e = null;
    for (var i = 0; i < io.epoche.length; i++) if (io.epoche[i].id === era) e = io.epoche[i];
    if (!e) return;
    var r = document.documentElement.style;
    r.setProperty("--e1", e.fondo[0]);
    r.setProperty("--e2", e.fondo[1]);
    r.setProperty("--e3", e.fondo[2]);
    r.setProperty("--luce", e.luce);
  }

  function disegnaRulli() {
    var dentro = "";
    for (var i = 0; i < rulli.length; i++) {
      var r = rulli[i];
      var p = pezzi[i];
      var s = p ? scalinoDi(p.grado) : null;
      var classi = "rullo" + (bloccati[i] ? " bloccato" : "") + (s ? " f" + s.fuoco : "");
      dentro += "<div class=\\"" + classi + "\\" data-rullo=\\"" + i + "\\"" +
        (s ? " style=\\"--g:" + s.colore + "\\"" : "") + ">";
      dentro += "<div class=\\"barra\\" style=\\"background:" +
        (s ? s.colore : "#2e3340") + "\\"></div>";
      dentro += "<div class=\\"quale\\">" + sicuro(r.nome) + "</div>";
      dentro += "<div class=\\"nome\\">" + (p ? sicuro(p.nome) : "—") + "</div>";
      // Sotto al nome italiano c'e' **quello che va davvero al modello**.
      // Chiesto il 9 settembre 2026: si scrive in italiano, ma il prompt e'
      // inglese, e uno deve poter vedere cosa sta mandando senza indovinare.
      if (p && p.testo !== p.nome) {
        dentro += "<div class=\\"inglese\\">" + sicuro(p.testo) + "</div>";
      }
      if (p && p.esempio) dentro += "<div class=\\"esempio\\">tipo " + sicuro(p.esempio) + "</div>";
      if (p) dentro += "<div class=\\"prezzo\\" style=\\"color:" + s.colore + "\\">" +
        soldi(p.prezzo) + " · " + sicuro(s.nome) + "</div>";
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

  function disegnaSaldo(saliti) {
    $("saldo").innerHTML = soldi(io.saldo) +
      " <small>&nbsp;giro " + soldi(io.costi.giro) + "</small>";
    if (saliti) {
      $("saldo").classList.remove("su");
      void $("saldo").offsetWidth;
      $("saldo").classList.add("su");
    }
  }

  /* --------------------------------------------------------------- girare */

  function gira() {
    // Secondo tocco mentre gira: si taglia corto. Non e' un errore, e' la
    // fretta di chi gioca — e va assecondata.
    if (girando) { saltare = true; pulisciOrologi(); if (giroPronto) concludi(); return; }

    girando = true;
    saltare = false;
    giroPronto = null;
    $("esito").textContent = "";

    var caselle = document.querySelectorAll(".rullo");
    for (var i = 0; i < caselle.length; i++) {
      caselle[i].classList.remove("arrivato");
      if (!bloccati[i]) caselle[i].classList.add("gira");
    }

    chiedi("POST", "/gira", { tavolo: tavolo, era: era, bloccati: bloccati })
      .then(function (giro) {
        saldoPrima = io.saldo;
        pezzi = giro.pezzi;
        io.saldo = giro.saldo;
        giroPronto = giro;
        ricordaTavolo();
        // I rulli si fermano **uno dopo l'altro**, non tutti insieme: e' la
        // differenza fra una slot e una tabella che si aggiorna. A meno che
        // qualcuno non abbia gia' ripremuto.
        if (saltare) concludi();
        else fermaUnoAllaVolta();
      })
      .catch(function (errore) {
        girando = false;
        pulisciOrologi();
        disegnaRulli();
        avviso(errore.message, "male");
      });
  }

  var giroPronto = null;
  var saldoPrima = 0;

  function fermaUnoAllaVolta() {
    var quanti = rulli.length;
    var passo = 70;
    // Prima si ridisegna tutto (i pezzi nuovi sono gia' dentro), poi si toglie
    // il giro a una casella per volta.
    disegnaRulli();
    var caselle = document.querySelectorAll(".rullo");
    // ⚠ Quello che hai tenuto fermo **non si muove**, chiesto il 10 settembre
    // 2026. Prima si animava anche lui e poi tornava uguale: sembrava che
    // girasse e che ti ridesse lo stesso pezzo, invece di stare fermo.
    for (var i = 0; i < quanti; i++) {
      if (!bloccati[i]) caselle[i].classList.add("gira");
    }

    for (var j = 0; j < quanti; j++) {
      (function (k) {
        orologiGiro.push(setTimeout(function () {
          var c = document.querySelectorAll(".rullo")[k];
          if (!c || bloccati[k]) return;
          c.classList.remove("gira");
          c.classList.add("arrivato");
        }, 220 + k * passo));
      })(j);
    }

    orologiGiro.push(setTimeout(concludi, 260 + quanti * passo));
  }

  /**
   * La fine del giro: i rulli fermi, il saldo aggiornato, la scena raccontata.
   *
   * La chiamano tutte e due le strade — quella con l'animazione e quella di chi
   * ha ripremuto per saltarla — cosi' non ci sono due modi di finire un giro,
   * che sarebbe il modo piu' facile per farne divergere uno.
   */
  function concludi() {
    if (!giroPronto) return;
    var giro = giroPronto;
    giroPronto = null;
    pulisciOrologi();
    disegnaRulli();
    disegnaSaldo(giro.saldo > saldoPrima);
    raccontaGiro(giro);
    girando = false;
  }

  function raccontaGiro(giro) {
    var e = $("esito");
    var s = scalinoDi(giro.meglio);

    if (giro.punti > 0) {
      var detti = giro.vincite.map(function (v) { return v.detto; }).join(" + ");
      e.className = "esito vinta";
      e.style.color = s.colore;
      e.textContent = detti + " — " + giro.punti + " punti";
      numeroVolante("+" + giro.punti + " xp", s.colore);
    } else {
      e.className = "esito persa";
      e.style.color = "";
      e.textContent = "Vale " + soldi(giro.valore) + ". Tieni quello che ti piace e rigira.";
    }
    disegnaLivello(giro.esperienza, giro.salito);
    if (giro.salito) {
      avviso("Livello " + giro.livello + "!", "bene");
      coriandoli(50, [io.epoche[0].luce, "#ffd166", "#ffffff"]);
    }

    // Quanto si accende lo schermo lo decide la vincita piu' grossa, o il grado
    // piu' alto uscito se non ha pagato niente.
    var fuoco = s.fuoco;
    for (var i = 0; i < giro.vincite.length; i++) {
      if (giro.vincite[i].fuoco > fuoco) fuoco = giro.vincite[i].fuoco;
    }
    if (fuoco >= 1) lampo(s.colore);
    if (fuoco >= 2) scuoti();
    if (fuoco >= 3) {
      coriandoli(70, [s.colore, "#ffd166", "#ffffff", io.epoche[0].luce]);
      avviso(s.nome + "! " + (giro.punti > 0 ? giro.punti + " punti" : "guarda che roba"), "bene");
    }
    if (giro.regalo) {
      avviso("Ti e' caduta una figurina: " + giro.regalo.titolo, "bene");
    }
  }

  /* -------------------------------------------------------------- mandare */

  /**
   * Manda la riga a controllare, e racconta cosa e' successo.
   *
   * Tre finali possibili, e sono tre scene diverse:
   *
   * - **mandata**: sta in fila, si continua a giocare;
   * - **riscoperta**: ci sei arrivato anche tu a una che qualcun altro aveva
   *   gia' trovato. Coriandoli, premio pieno e la figurina;
   * - **gia' tua**: ce l'avevi gia'. Due lire di multa e nient'altro.
   */
  function manda() {
    if (pezzi.length !== rulli.length) return;
    chiedi("POST", "/manda", {
      tavolo: tavolo,
      era: era,
      pezzi: pezzi.map(function (p) { return p.id; }),
    })
      .then(function (r) {
        io.saldo = r.saldo;
        disegnaSaldo(r.lire > 0);

        if (r.esito === "riscoperta") {
          var s = scalinoDi(r.cosa.grado);
          lampo(s.colore);
          scuoti();
          coriandoli(90, [s.colore, "#ffd166", "#ffffff"]);
          numeroVolante("+" + soldi(r.lire), s.colore);
          grande(
            "Ci sei arrivato anche tu",
            r.cosa.titolo,
            r.detto + " Premio: " + soldi(r.lire) + ".",
            s.colore,
          );
          io.conto.collezione += 1;
          return;
        }

        if (r.esito === "gia-tua") {
          numeroVolante(soldi(r.lire), "#ff5c6e");
          avviso(r.detto, "male");
          return;
        }

        avviso(r.detto, "bene");
        io.conto.mandate += 1;
      })
      .catch(function (errore) { avviso(errore.message, "male"); });
  }

  /* ----------------------------------------------------------- le figurine */

  function figurinaHtml(c, opzioni) {
    var o = opzioni || {};
    var s = scalinoDi(c.grado);
    var h = "<div class=\\"figurina f" + s.fuoco + (c.scoperta ? "" : " coperta") +
      "\\" style=\\"--g:" + s.colore + "\\">";
    h += "<div class=\\"titolo\\">" + sicuro(c.titolo) + "</div>";
    h += "<div class=\\"sotto\\">";
    if (c.prezzo > 0) {
      h += "<span class=\\"pastiglia\\" style=\\"color:" + s.colore + "\\">" +
        sicuro(s.nome) + " · " + soldi(c.prezzo) + "</span> ";
    }
    if (c.numero > 0) h += "n. " + c.numero + " · ";
    h += "di " + sicuro(c.daNome) + " · " + quando(c.quando);
    if (c.stato === "in-attesa") h += " · in attesa";
    if (c.stato === "buttata") h += " · buttata: " + sicuro(c.motivo);
    h += "</div>";
    if (c.scoperta && c.prompt) h += "<div class=\\"testo\\">" + sicuro(c.prompt) + "</div>";
    // Le figurine che non sono prompt si guardano o si ascoltano: il file sta
    // nella libreria della suite, qui c'e' solo il suo indirizzo.
    if (c.scoperta && c.dove && c.mime.indexOf("image/") === 0) {
      h += "<img src=\\"" + sicuro(c.dove) + "\\" alt=\\"\\">";
    }
    if (c.scoperta && c.dove && c.mime.indexOf("audio/") === 0) {
      h += "<audio controls src=\\"" + sicuro(c.dove) + "\\"></audio>";
    }
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

  /* ------------------------------------------------------------ il livello */

  /**
   * Il livello e la barra che si riempie.
   *
   * ⚠ Girando si prendono **punti**, non lire (CONCETTI.md § 4). Il numero e la
   * barra sono l'unica cosa che si muove quando si gioca senza mandare niente:
   * senza, un giro che non paga sembrerebbe non aver fatto niente.
   */
  /**
   * ⚠ Il conto dei livelli si rifa' **con la stessa regola del PC**, non a
   * stima: ogni livello costa perIlLivello piu' del precedente. Una barra che
   * si muove «piu' o meno» e' peggio di una barra ferma — la prima volta che
   * uno la vede indietreggiare non si fida piu' di nessun numero.
   */
  function conteggioLivello(esperienza) {
    var perIl = io.costi.perIlLivello || 500;
    var livello = 1;
    var soglia = perIl;
    var restante = Math.max(0, esperienza || 0);
    while (restante >= soglia) {
      restante -= soglia;
      livello += 1;
      soglia += perIl;
    }
    return { livello: livello, dentro: restante, serve: soglia };
  }

  function disegnaLivello(esperienza, salito) {
    var c = conteggioLivello(esperienza);
    io.conto.esperienza = esperienza;
    $("livello-numero").textContent = String(c.livello);
    $("livello").title = "Livello " + c.livello + " · " + c.dentro + " di " + c.serve + " punti";
    $("livello-barra").style.width = Math.min(100, (c.dentro / c.serve) * 100) + "%";
    if (salito) {
      $("livello").classList.remove("su");
      void $("livello").offsetWidth;
      $("livello").classList.add("su");
    }
  }

  /* ---------------------------------------------------------------- shop */

  /** Un'icona per specie, quando una figurina non ha una copertina sua. */
  function faccinaDi(tipo) {
    if (tipo === "immagine") return "🖼️";
    if (tipo === "brano") return "🎵";
    if (tipo === "video") return "🎬";
    if (tipo === "voce") return "🗣️";
    return "🎰";
  }

  var shopTipo = "tutto";

  function disegnaTipiShop() {
    var tipi = [
      ["tutto", "TUTTO"], ["prompt", "PROMPT"], ["immagine", "FOTO"],
      ["brano", "MUSICA"], ["video", "VIDEO"],
    ];
    var dentro = "";
    for (var i = 0; i < tipi.length; i++) {
      dentro += "<button data-shoptipo=\\"" + tipi[i][0] + "\\"" +
        (tipi[i][0] === shopTipo ? " class=\\"scelto\\"" : "") + ">" + tipi[i][1] + "</button>";
    }
    $("shop-tipi").innerHTML = dentro;
  }

  function caricaShop() {
    disegnaTipiShop();
    chiedi("GET", "/vetrina").then(function (dati) {
      var roba = dati.roba.filter(function (c) {
        return shopTipo === "tutto" || c.tipo === shopTipo;
      });
      $("shop-roba").innerHTML = roba.length
        ? roba.map(function (c) { return prodottoHtml(c); }).join("")
        : "<div class=\\"niente\\">In vetrina non c'e' ancora niente. " +
          "Ce la mette chi comanda, dalla Fila.</div>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function prodottoHtml(c) {
    var s = scalinoDi(c.grado);
    var h = "<article class=\\"prodotto\\" style=\\"--g:" + s.colore + "\\">";
    h += "<span class=\\"nastro\\">" + sicuro(s.nome) + "</span>";
    if (c.mia) h += "<span class=\\"mia\\">ce l'hai</span>";
    h += "<div class=\\"copertina\\">";
    // La copertina si vede **anche se non e' tua**: uno deve poter guardare
    // cosa sta comprando. Il prompt no, quello resta coperto finche' non paghi.
    h += c.allegato
      ? "<img src=\\"" + sicuro(c.allegato) + "\\" alt=\\"\\">"
      : faccinaDi(c.tipo);
    h += "</div><div class=\\"corpo\\">";
    h += "<h3>" + sicuro(c.titolo) + "</h3>";
    h += "<div class=\\"riga\\">di " + sicuro(c.daNome) +
      (c.numero > 0 ? " · n. " + c.numero : "") + "</div>";
    h += "<div class=\\"fondo\\"><span class=\\"costa\\">" + soldi(c.costo) + "</span>";
    h += "<button class=\\"prendi\\" data-compra=\\"" + c.id + "\\"" +
      (c.mia ? " disabled" : "") + ">" + (c.mia ? "TUA" : "COMPRA") + "</button>";
    h += "</div></div></article>";
    return h;
  }

  function comprala(id) {
    chiedi("POST", "/compra", { id: id }).then(function (a) {
      io.saldo = a.saldo;
      disegnaSaldo(false);
      var s = scalinoDi(a.cosa.grado);
      avviso("Comprata: " + a.cosa.titolo + " — " + soldi(a.costo), "bene");
      lampo(s.colore);
      if (s.fuoco >= 2) coriandoli(60, [s.colore, "#ffd166", "#ffffff"]);
      caricaShop();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* --------------------------------------------------------------- album */

  function caricaAlbum() {
    chiedi("GET", "/album").then(function (dati) {
      serieAperta = dati.serie;
      var m = dati.magazzino;
      var testo = "";
      if (dati.chiuse === 0) {
        testo = "Nessuna serie chiusa. Ne servono ancora <b>" + m.allaProssimaSerie +
          "</b> cose prese perche' si possa comprare il primo pacchetto.";
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
    $("compra").disabled = true;
    chiedi("POST", "/pacchetto", { serie: serieAperta }).then(function (a) {
      io.saldo = a.saldo;
      disegnaSaldo(true);
      var nuove = a.figurine.filter(function (f) { return !f.doppione; });
      var meglio = "basic";
      var alto = -1;
      for (var i = 0; i < a.figurine.length; i++) {
        var s = scalinoDi(a.figurine[i].grado);
        if (s.fuoco > alto) { alto = s.fuoco; meglio = a.figurine[i].grado; }
      }
      var s2 = scalinoDi(meglio);
      if (alto >= 2) lampo(s2.colore);
      if (alto >= 3) { scuoti(); coriandoli(70, [s2.colore, "#ffd166", "#ffffff"]); }
      avviso(
        nuove.length === 0
          ? "Tutti doppioni: " + soldi(a.vinto) + " indietro."
          : nuove.length + (nuove.length === 1 ? " figurina nuova" : " figurine nuove") +
            (a.vinto > 0 ? ", e " + soldi(a.vinto) + " dai doppioni" : ""),
        "bene",
      );
      caricaAlbum();
    }).catch(function (e) {
      $("compra").disabled = false;
      avviso(e.message, "male");
    });
  }

  /* ---------------------------------------------------------------- casa */

  function caricaClassifica() {
    chiedi("GET", "/classifica").then(function (dati) {
      $("classifica").innerHTML = dati.righe.length
        ? dati.righe.map(function (r) {
            var s = r.migliorGrado ? scalinoDi(r.migliorGrado) : null;
            return "<tr" + (r.io ? " class=\\"io\\"" : "") + ">" +
              "<td>" + sicuro(r.nome) + "</td>" +
              "<td>" + r.prese + "</td>" +
              "<td>" + r.collezione + "</td>" +
              "<td>" + (s
                ? "<span class=\\"pastiglia\\" style=\\"color:" + s.colore + "\\">" +
                  sicuro(s.nome) + "</span>"
                : "—") + "</td>" +
              "<td>" + soldi(r.saldo) + "</td></tr>";
          }).join("")
        : "<tr><td colspan=\\"5\\" class=\\"niente\\">Non ha ancora giocato nessuno.</td></tr>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* ---------------------------------------------------------------- fila */

  /**
   * I tasti dei gradi, per dare un prezzo con un tocco solo.
   *
   * Scrivere «quanto vale in lire» ogni volta e' la strada per non decidere
   * mai: undici tasti col nome del grado sono una decisione sola, e il prezzo
   * lo mette il gioco al fondo di quel grado. Chi vuole un numero preciso ce
   * l'ha lo stesso, nella casella accanto.
   */
  function tastiGradi(id) {
    var h = "<div class=\\"gradi-scelta\\" data-gradi=\\"" + id + "\\">";
    for (var i = 0; i < io.gradi.length; i++) {
      var g = io.gradi[i];
      var scelto = gradoScelto[id] === g.id;
      h += "<button data-grado=\\"" + g.id + "\\" data-per=\\"" + id + "\\"" +
        " style=\\"color:" + g.colore + (scelto ? "; background:" + g.colore : "") + "\\"" +
        (scelto ? " class=\\"scelto\\"" : "") + ">" + sicuro(g.nome) + "</button>";
    }
    h += "</div>";
    return h;
  }

  function caricaFila() {
    if (!io.admin) return;
    chiedi("GET", "/fila").then(function (dati) {
      var quante = dati.inAttesa.length;
      $("quante-attesa").hidden = quante === 0;
      $("quante-attesa").textContent = String(quante);

      $("fila-attesa").innerHTML = quante
        ? dati.inAttesa.map(function (c) {
            // Il valore di base e' la somma dei dodici pezzi, e arriva dal
            // PC. Chi comanda aggiunge solo il **bonus**: quanto vale l'idea
            // oltre ai pezzi di cui e' fatta.
            var tasti =
              "<div class=\\"conto\\">I pezzi valgono <b>" + soldi(c.base) + "</b>" +
              " · con il bonus fa <b data-totale=\\"" + c.id + "\\">" + soldi(c.base) + "</b></div>" +
              "<div class=\\"riga-tasti\\">" +
              "<input type=\\"number\\" min=\\"0\\" placeholder=\\"bonus in lire\\" " +
              "data-bonus=\\"" + c.id + "\\" data-base=\\"" + c.base + "\\">" +
              "<input type=\\"text\\" placeholder=\\"indirizzo del contenuto (facoltativo)\\" " +
              "data-allegato=\\"" + c.id + "\\">" +
              "</div>" +
              "<div class=\\"riga-tasti\\">" +
              "<button class=\\"btn oro\\" data-prendi=\\"" + c.id + "\\">Prendila</button>" +
              "<button class=\\"btn piano\\" data-butta=\\"" + c.id + "\\">Buttala</button>" +
              "</div>";
            return figurinaHtml(c, { tasti: tasti });
          }).join("")
        : "<div class=\\"niente\\">Niente da controllare. Buon segno o cattivo, dipende.</div>";

      $("fila-decise").innerHTML = dati.decise.length
        ? dati.decise.map(function (c) {
            if (c.stato !== "presa") return figurinaHtml(c);
            // Su quelle prese si decide la vetrina: che grado ha nello shop e
            // quanto costa. Il grado non e' quello della slot — li' lo dicono
            // i dati, qui lo sceglie chi comanda.
            var tasti = c.inVetrina
              ? "<div class=\\"riga-tasti\\"><span class=\\"conto\\">In vetrina a " +
                soldi(c.prezzoVetrina) + "</span>" +
                "<button class=\\"btn piano\\" data-svetrina=\\"" + c.id +
                "\\">Togli dalla vetrina</button></div>"
              : tastiGradi(c.id) +
                "<div class=\\"riga-tasti\\">" +
                "<input type=\\"number\\" min=\\"1\\" placeholder=\\"prezzo, o lascia stare\\" " +
                "data-vprezzo=\\"" + c.id + "\\">" +
                "<button class=\\"btn oro\\" data-vetrina=\\"" + c.id +
                "\\">Mettila in vetrina</button></div>";
            return figurinaHtml(c, { tasti: tasti });
          }).join("")
        : "<div class=\\"niente\\">Ancora niente.</div>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /** Il prezzo che si sta per dare: quello scritto, o il fondo del grado scelto. */
  function prezzoPer(id) {
    var casella = document.querySelector("[data-prezzo=\\"" + id + "\\"]");
    var scritto = casella ? Number(casella.value) : 0;
    if (scritto && scritto >= 1) return Math.round(scritto);
    var g = gradoScelto[id];
    if (!g) return 0;
    for (var i = 0; i < io.gradi.length; i++) {
      if (io.gradi[i].id === g) return Math.max(1, io.gradi[i].da);
    }
    return 0;
  }

  function prendila(id) {
    var casella = document.querySelector("[data-bonus=\\"" + id + "\\"]");
    var allegato = document.querySelector("[data-allegato=\\"" + id + "\\"]");
    var bonus = casella ? Number(casella.value) || 0 : 0;
    chiedi("POST", "/prendi", {
      id: id,
      bonus: bonus,
      allegato: allegato && allegato.value ? allegato.value.trim() : "",
      allegatoMime: "image/*",
    }).then(function (c) {
      var s = scalinoDi(c.grado);
      avviso("Presa: " + s.nome + ", numero " + c.numero + " del magazzino.", "bene");
      if (s.fuoco >= 2) lampo(s.colore);
      if (s.fuoco >= 3) coriandoli(60, [s.colore, "#ffd166", "#ffffff"]);
      delete gradoScelto[id];
      caricaFila();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function inVetrina(id) {
    var grado = gradoScelto[id];
    if (!grado) { avviso("Scegli che grado ha nello shop.", "male"); return; }
    var casella = document.querySelector("[data-vprezzo=\\"" + id + "\\"]");
    chiedi("POST", "/vetrina/metti", {
      id: id,
      grado: grado,
      prezzo: casella && casella.value ? Number(casella.value) : 0,
    }).then(function (c) {
      avviso("In vetrina a " + soldi(c.prezzoVetrina) + ".", "bene");
      delete gradoScelto[id];
      caricaFila();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function fuoriVetrina(id) {
    chiedi("POST", "/vetrina/togli", { id: id }).then(function () {
      avviso("Tolta dalla vetrina.", "bene");
      caricaFila();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function buttala(id) {
    var motivo = prompt("Perche' non va bene?");
    if (motivo === null) return;
    chiedi("POST", "/butta", { id: id, motivo: motivo }).then(function () {
      avviso("Buttata.", "bene");
      delete gradoScelto[id];
      caricaFila();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /* ------------------------------------------------------------ navigare */

  function vaiA(dove) {
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
    if (dove === "shop") caricaShop();
    if (dove === "casa") caricaClassifica();
    if (dove === "fila") caricaFila();
  }

  /* ------------------------------------------------------------- i tasti */

  document.addEventListener("click", function (evento) {
    var b = evento.target;
    var chiudi = function (che) { return b.closest ? b.closest(che) : null; };

    var grado = chiudi("[data-grado]");
    if (grado) {
      gradoScelto[grado.getAttribute("data-per")] = grado.getAttribute("data-grado");
      caricaFila();
      return;
    }

    var rullo = chiudi("[data-rullo]");
    if (rullo) {
      var i = Number(rullo.getAttribute("data-rullo"));
      if (!pezzi[i] || girando) return;
      bloccati[i] = bloccati[i] ? null : pezzi[i].id;
      ricordaTavolo();
      disegnaRulli();
      return;
    }

    var scelta = chiudi("[data-tavolo]");
    if (scelta) {
      // Si mette da parte quello che c'era, e si riprende quello dell'altro
      // tavolo: cambiare scheda non butta piu' niente.
      ricordaTavolo();
      tavolo = scelta.getAttribute("data-tavolo");
      rulli = rulliDelTavolo();
      riprendiTavolo();
      $("esito").textContent = "";
      disegnaTavoli();
      disegnaEpoche();
      vestiLaSala();
      disegnaRulli();
      return;
    }

    var epoca = chiudi("[data-epoca]");
    if (epoca) {
      era = epoca.getAttribute("data-epoca");
      /**
       * ⚠ **Cambiare epoca non sblocca piu' niente**, e prima si'.
       *
       * La prima versione sbloccava tutto: «quel pezzo veniva da un altro
       * mondo». Ma e' proprio quello il punto — chiesto il 9 settembre 2026:
       * «in modo da poter mischiare e rendere davvero particolari i prompt nel
       * tempo». Un genere degli anni 70 con una produzione di adesso e' una
       * riga che nessuno scriverebbe, ed e' quella che serve.
       */
      ricordaTavolo();
      disegnaEpoche();
      vestiLaSala();
      disegnaRulli();
      return;
    }

    var va = chiudi("[data-va]");
    if (va) { vaiA(va.getAttribute("data-va")); return; }

    var tipoShop = chiudi("[data-shoptipo]");
    if (tipoShop) {
      shopTipo = tipoShop.getAttribute("data-shoptipo");
      caricaShop();
      return;
    }

    var compra = b.getAttribute && b.getAttribute("data-compra");
    if (compra) { comprala(compra); return; }
    var vetrina = b.getAttribute && b.getAttribute("data-vetrina");
    if (vetrina) { inVetrina(vetrina); return; }
    var svetrina = b.getAttribute && b.getAttribute("data-svetrina");
    if (svetrina) { fuoriVetrina(svetrina); return; }

    var prendi = b.getAttribute && b.getAttribute("data-prendi");
    if (prendi) { prendila(prendi); return; }
    var butta = b.getAttribute && b.getAttribute("data-butta");
    if (butta) { buttala(butta); return; }
  });

  // Il totale sotto la fila si aggiorna mentre si scrive il bonus: chi decide
  // deve vedere il numero finale prima di premere, non dopo.
  document.addEventListener("input", function (e) {
    var b = e.target;
    var id = b.getAttribute && b.getAttribute("data-bonus");
    if (!id) return;
    var totale = document.querySelector("[data-totale=\\"" + id + "\\"]");
    if (!totale) return;
    var base = Number(b.getAttribute("data-base")) || 0;
    totale.textContent = soldi(base + (Number(b.value) || 0));
  });

  $("gira").addEventListener("click", gira);
  $("manda").addEventListener("click", manda);
  $("compra").addEventListener("click", compraPacchetto);
  $("saldo").addEventListener("click", function () {
    inEuro = !inEuro;
    disegnaSaldo(false);
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
    ricordaTavolo();
    disegnaRulli();
  });

  // Tenere premuto apre grande. Vale per il dito e per il mouse, e si annulla
  // appena si stacca o si scorre: uno che scorre la pagina non voleva aprire
  // niente.
  document.addEventListener("pointerdown", iniziaPressione);
  document.addEventListener("pointerup", fermaPressione);
  document.addEventListener("pointercancel", fermaPressione);
  document.addEventListener("scroll", fermaPressione, true);
  // Sul telefono, tenendo premuto, il browser proporrebbe di copiare il testo:
  // qui la pressione lunga ha gia' un mestiere suo.
  document.addEventListener("contextmenu", function (e) {
    if (e.target && e.target.closest && e.target.closest("[data-rullo], #prompt, .figurina")) {
      e.preventDefault();
    }
  });
  // La barra spaziatrice tira la leva: chi gioca sul computer non vuole
  // spostare il mouse quaranta volte.
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && e.target === document.body) { e.preventDefault(); gira(); }
  });

  /* -------------------------------------------------------------- entrare */

  chiedi("GET", "/io").then(function (dati) {
    io = dati;
    $("mio-nome").textContent = dati.nome + (dati.admin ? " · decidi tu" : "");
    $("tasto-fila").hidden = !dati.admin;
    rulli = rulliDelTavolo();
    // Quello che c'era sui rulli l'ultima volta: i pezzi tenuti fermi si
    // ritrovano dove li avevi lasciati, anche il giorno dopo.
    riprendiTavolo();
    disegnaTavoli();
    disegnaEpoche();
    vestiLaSala();
    disegnaRulli();
    disegnaSaldo(false);
    disegnaLivello(dati.conto.esperienza, false);
    if (dati.admin) caricaFila();
  }).catch(function (errore) {
    document.querySelector("main").innerHTML =
      "<div class=\\"niente\\">" + sicuro(errore.message) + "</div>";
  });
`;
