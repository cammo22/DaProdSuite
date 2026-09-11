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

  /**
   * ⚠ **Copiare, e funzionare anche sul telefono di casa.**
   *
   * Chiesto il 10 settembre 2026: «copiare i prompt in inglese con un click».
   * C'era gia' un tasto, e sul telefono non copiava niente: la suite si serve
   * in chiaro sulla rete di casa, e in una pagina che non e' «https»
   * «navigator.clipboard» **non esiste**. Il tasto rispondeva «Copiato» e non
   * era vero, che e' peggio di un tasto che manca.
   *
   * Qui si prova la strada buona, e se non c'e' si torna a quella vecchia: una
   * casella nascosta, si seleziona, «execCommand». Brutta e sorpassata, ma su
   * una pagina in chiaro e' l'unica che copia davvero.
   */
  function copiaTesto(testo) {
    if (!testo) return;
    var fatto = function () { avviso("Copiato.", "bene"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(testo).then(fatto, function () { allaVecchia(testo, fatto); });
      return;
    }
    allaVecchia(testo, fatto);
  }

  function allaVecchia(testo, fatto) {
    try {
      var c = document.createElement("textarea");
      c.value = testo;
      c.setAttribute("readonly", "");
      c.style.position = "fixed";
      c.style.top = "-1000px";
      document.body.appendChild(c);
      c.select();
      c.setSelectionRange(0, testo.length);
      var andata = document.execCommand("copy");
      document.body.removeChild(c);
      if (andata) { fatto(); return; }
    } catch (e) {}
    avviso("Non riesco a copiare da qui: tieni premuto sul testo.", "male");
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
    /**
     * ⚠ **Via quello che il telefono avesse gia' selezionato.**
     *
     * La selezione col dito e' spenta nello stile, ma resta il caso di chi ce
     * l'aveva gia' addosso da prima — un doppio tocco andato storto, una
     * casella lasciata a meta'. Aprire il pannello grande sopra a delle
     * maniglie blu vuol dire trovarsele li' sotto quando si chiude.
     */
    try {
      var sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
    } catch (e) {}
  }

  /**
   * ⚠ **Guardare una cosa a tutto schermo**: una foto, o un brano.
   *
   * Chiesto il 10 settembre 2026: «posso vedere le anteprime degli item? Se ci
   * clicco, quelli generati dalla slot me li fa selezionare ma non li posso
   * aprire grandi».
   *
   * Il difetto era che il pannello grande sapeva mostrare **solo parole** — era
   * nato per i prompt — e le anteprime sulla card sono riquadri da centodieci
   * pixel. Su un telefono si vede che c'e' un'immagine e non si vede **cosa
   * c'e' dentro**, e chi comanda deve decidere se quella generazione vale il
   * prezzo di una figurina.
   *
   * Il tocco apre; il tasto «tienila» resta il tasto che sceglie. Sono due
   * gesti diversi su due bersagli diversi, e non si pestano i piedi.
   */
  function grandeCosa(indirizzo, mime, titolo, copertina) {
    if (!indirizzo) return;
    var vecchio = document.querySelector(".grande");
    if (vecchio) vecchio.remove();
    var d = document.createElement("div");
    d.className = "grande guarda";
    var dentro = "<div class=\\"dentro\\">";
    if (String(mime || "").indexOf("audio/") === 0) {
      // Un brano si ascolta guardando la sua copertina, grande: e' la faccia
      // che ha in tutto il resto del gioco (11 settembre 2026).
      if (copertina) {
        dentro += "<img class=\\"copertona\\" src=\\"" + sicuro(copertina) + "\\" alt=\\"\\">";
      }
      dentro += "<audio controls autoplay src=\\"" + sicuro(indirizzo) + "\\"></audio>";
    } else if (String(mime || "").indexOf("video/") === 0) {
      dentro += "<video controls src=\\"" + sicuro(indirizzo) + "\\"></video>";
    } else {
      dentro += "<img src=\\"" + sicuro(indirizzo) + "\\" alt=\\"\\">";
    }
    if (titolo) dentro += "<div class=\\"su\\">" + sicuro(titolo) + "</div>";
    dentro += "<div class=\\"chiudi\\">tocca fuori per chiudere</div></div>";
    d.innerHTML = dentro;
    /**
     * ⚠ Si chiude toccando **fuori**, non dovunque. Il pannello di prima si
     * chiudeva a qualunque tocco e li' andava bene: dentro c'erano parole. Qui
     * dentro c'e' un tasto play, e un pannello che si chiude quando provi a
     * far partire il brano che sei venuto ad ascoltare e' un dispetto.
     */
    d.addEventListener("click", function (e) { if (e.target === d) d.remove(); });
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
  /** Da dove e' partito il dito: serve a capire se sta scorrendo. */
  var partitoDa = null;

  function iniziaPressione(evento) {
    var b = evento.target;
    if (!b || !b.closest) return;
    premutoDa = b;
    partitoDa = { x: evento.clientX || 0, y: evento.clientY || 0 };
    if (orologioPressione) clearTimeout(orologioPressione);
    orologioPressione = setTimeout(function () {
      orologioPressione = null;
      apriGrandeDa(premutoDa);
    }, 480);
  }

  /**
   * ⚠ **Se il dito si sposta, stava scorrendo.**
   *
   * Lo «scroll» da solo non basta e si vede sul telefono: chi appoggia il dito
   * su una carta e trascina per scorrere una lista lunga tiene premuto per piu'
   * di mezzo secondo **prima** che la pagina cominci a muoversi davvero, e nel
   * frattempo gli si spalancava il pannello grande in faccia. Dodici pixel: piu'
   * di un dito che trema, meno di un dito che scorre.
   */
  function forseSiSposta(evento) {
    if (!orologioPressione || !partitoDa) return;
    var dx = (evento.clientX || 0) - partitoDa.x;
    var dy = (evento.clientY || 0) - partitoDa.y;
    if (dx * dx + dy * dy > 144) fermaPressione();
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

    // Un'anteprima: si apre la cosa, non le parole che le stanno intorno.
    var anteprima = nodo.closest("[data-guarda]");
    if (anteprima) {
      grandeCosa(
        anteprima.getAttribute("data-guarda"),
        anteprima.getAttribute("data-guarda-mime"),
        anteprima.getAttribute("data-guarda-nome"),
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
  /**
   * ⚠ **Chiedere una cosa, senza il «prompt» del browser.**
   *
   * Il difetto, detto il 10 settembre 2026: «non mi fa mandare da admin le lire
   * agli altri dalla suite su pc, e quando clicchi manda esce un popup
   * bruttissimo senza grafica, ma funziona».
   *
   * Sono due facce della stessa riga. La pagina usava «window.prompt», e:
   *
   * - **dentro la suite sul PC non esiste.** Electron l'ha tolto: chiamarlo
   *   solleva un errore, il resto della funzione non gira, e da fuori sembra
   *   che il tasto non faccia niente. Toccava anche «buttala»: dal computer non
   *   si poteva nemmeno buttare una combinazione;
   * - **sul telefono e' il riquadro grigio del sistema**, che non e' la pagina
   *   e si vede che non lo e'.
   *
   * Questo e' un pannello della pagina, quindi c'e' dappertutto ed e' vestito
   * come il resto. Torna una promessa: il testo scritto, oppure niente se si
   * chiude.
   */
  function chiediQualcosa(titolo, spiega, opzioni) {
    var o = opzioni || {};
    return new Promise(function (finito) {
      var vecchio = document.querySelector(".chiede");
      if (vecchio) vecchio.remove();

      var fondo = document.createElement("div");
      fondo.className = "chiede";
      var carta = document.createElement("div");
      carta.className = "dentro";

      var h = document.createElement("b");
      h.textContent = titolo;
      carta.append(h);
      if (spiega) {
        var p = document.createElement("small");
        p.textContent = spiega;
        carta.append(p);
      }

      var casella = document.createElement(o.righe ? "textarea" : "input");
      if (!o.righe) casella.type = o.tipo || "text";
      if (o.righe) casella.rows = o.righe;
      casella.value = o.valore || "";
      if (o.suggerimento) casella.placeholder = o.suggerimento;
      carta.append(casella);

      var fila = document.createElement("div");
      fila.className = "riga-tasti";
      var no = document.createElement("button");
      no.className = "btn piano";
      no.textContent = "Lascia stare";
      var si = document.createElement("button");
      si.className = "btn oro";
      si.textContent = o.tastoSi || "Vai";
      fila.append(no, si);
      carta.append(fila);
      fondo.append(carta);
      document.body.appendChild(fondo);

      var chiudi = function (cosa) { fondo.remove(); finito(cosa); };
      no.addEventListener("click", function () { chiudi(null); });
      si.addEventListener("click", function () { chiudi(casella.value); });
      fondo.addEventListener("click", function (e) { if (e.target === fondo) chiudi(null); });
      casella.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !o.righe) { e.preventDefault(); chiudi(casella.value); }
        if (e.key === "Escape") chiudi(null);
      });
      // Il fuoco dopo un giro: su un telefono aprire la tastiera subito e'
      // quello che ci si aspetta, e sul computer si scrive senza toccare.
      setTimeout(function () { try { casella.focus(); casella.select(); } catch (e) {} }, 40);
    });
  }

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

  /**
   * I raggi che girano dietro alla slot: la roba grossa, dall'Epic in su.
   *
   * Un disegno solo con il fondo a spicchi che ruota — non venti nodi — perche'
   * quello che deve succedere e' che la sala **cambi**, non che il telefono si
   * scaldi. Si toglie da solo.
   */
  function raggi(colore, quanto) {
    var d = document.createElement("div");
    d.className = "raggi";
    d.style.setProperty("--g", colore);
    document.body.appendChild(d);
    setTimeout(function () {
      d.classList.add("via");
      setTimeout(function () { d.remove(); }, 500);
    }, quanto);
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
      /**
       * ⚠ **La puntina d'oro e' un nodo vero, non un «::after».**
       *
       * Era un «::after» sulla carta, e dal 10 settembre 2026 anche i gradi
       * piu' alti ne hanno uno — l'anello che gira. Due regole sullo stesso
       * pseudo-elemento non convivono: vinceva l'ultima, e su un Mythic
       * bloccato **la puntina spariva**. Cioe' proprio sulla carta che uno
       * tiene di sicuro.
       *
       * Un nodo vero non se lo contende nessuno.
       */
      dentro += "<div class=\\"puntina\\"></div>";
      dentro += "</div>";
    }
    $("rulli").innerHTML = dentro;

    /**
     * ⚠ **Il tasto «manda» si accende quando c'e' qualcosa di bloccato**, non
     * quando i rulli sono pieni. Cambiato il 10 settembre 2026 insieme alla
     * regola: si manda quello che si e' tenuto.
     *
     * E il prompt qui sotto mostra **quello che si manderebbe**: prima faceva
     * vedere tutti e dodici i pezzi, cioe' una cosa diversa da quella che
     * partiva. Una riga che promette una cosa e ne manda un'altra e' il modo
     * piu' semplice di far mandare a qualcuno una roba che non voleva.
     */
    var scelti = quelliBloccati();
    $("manda").disabled = scelti.length === 0;
    var daMandare = pezzi.filter(function (p, i) { return p && bloccati[i]; });
    $("prompt").innerHTML = daMandare.length
      ? sicuro(daMandare.map(function (p) { return p.testo; }).join(", "))
      : pezzi.length
        ? "<span class=\\"vuoto\\">Blocca i rulli che ti piacciono: si manda quello.</span>"
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
    /**
     * ⚠ **La scena cresce con il grado, e da Celestial in su e' un'altra
     * cosa.**
     *
     * Chiesto il 10 settembre 2026: «facciamo i gradi da celestial in su molto
     * piu' potenti, come gradi e come anteprime, molto piu' articolate». Il
     * difetto era che i cinque gradi piu' alti facevano **la stessa identica
     * scena** — tutti «fuoco 3» — e in un gioco di rarita' la scena e' il
     * premio: chi tirava un Mythic vedeva quello che aveva gia' visto con un
     * Epic.
     *
     * Cinque gradini, e ognuno aggiunge, non sostituisce:
     */
    if (fuoco >= 1) lampo(s.colore);
    if (fuoco >= 2) scuoti();
    if (fuoco >= 3) {
      // Celestial e Divine: coriandoli e il nome del grado detto forte.
      coriandoli(70, [s.colore, "#ffd166", "#ffffff", io.epoche[0].luce]);
      avviso(s.nome + "! " + (giro.punti > 0 ? giro.punti + " punti" : "guarda che roba"), "bene");
    }
    if (fuoco >= 4) {
      // Epic e Legendary: i raggi dietro, e la sala si tinge del suo colore.
      raggi(s.colore, fuoco >= 5 ? 2600 : 1600);
      coriandoli(90, [s.colore, "#ffffff"]);
    }
    if (fuoco >= 5) {
      /**
       * Mythic ed Ethernal: si ferma tutto e si legge il nome grande.
       *
       * ⚠ E' l'unica cosa in tutto il gioco che **interrompe**: si tocca per
       * chiudere. Un premio che passa mentre stai gia' guardando altrove non e'
       * un premio — e questa roba capita una volta su mille caselle.
       */
      grande(s.nome, "e' uscito", giro.pezzi
        .filter(function (p) { return p.grado === giro.meglio; })
        .map(function (p) { return p.nome; }).join(" · "), s.colore);
      coriandoli(160, [s.colore, "#ffd166", "#ffffff", io.epoche[0].luce]);
      setTimeout(function () { coriandoli(120, [s.colore, "#ffffff"]); }, 700);
      scuoti();
    }
    if (giro.regalo) {
      avviso("Ti e' caduta una figurina: " + giro.regalo.titolo, "bene");
    }
  }

  /**
   * Gli id dei rulli tenuti fermi, in ordine di rullo.
   *
   * «bloccati» ha un posto per rullo, con dentro l'id o niente: qui si tolgono
   * i buchi. L'ordine resta quello dei rulli — e conta, perche' e' quello che
   * fa l'impronta di una combinazione.
   */
  function quelliBloccati() {
    var fuori = [];
    for (var i = 0; i < bloccati.length; i++) {
      if (bloccati[i]) fuori.push(bloccati[i]);
    }
    return fuori;
  }

  /**
   * ⚠ **Mandata la combinazione, la sala riparte.**
   *
   * Chiesto il 10 settembre 2026: «quando si invia una combinazione gli
   * elementi bloccati vengono inviati e la slot refreshata, si ricomincia la
   * partita». Prima i rulli restavano identici: chi aveva appena mandato si
   * ritrovava davanti la riga appena mandata, e per ricominciare doveva
   * sbloccare dodici rulli uno per uno.
   *
   * ⚠ **Non si tira la leva da soli**, e non e' una dimenticanza. Un giro
   * costa lire e mandare deve restare gratis (CONCETTI.md § 9): far partire un
   * giro qui vorrebbe dire che mandare costa dieci lire senza che nessuno
   * l'abbia deciso. Si azzera e si aspetta il dito.
   */
  function ripartiDaCapo() {
    bloccati = [];
    pezzi = [];
    ricordaTavolo();
    disegnaRulli();
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
    /**
     * ⚠ **Si mandano i rulli bloccati, e basta quelli.** Chiesto il 10
     * settembre 2026: «deve inviare solo quelli bloccati e basta, anche se sono
     * solo 3».
     *
     * Bloccare un rullo e' il gesto con cui si dice «questo si'». Quello che non
     * e' bloccato e' roba uscita all'ultimo giro, e mandarla vorrebbe dire far
     * giudicare a chi comanda mezza idea tua e mezza pescata dal mazzo.
     */
    var scelti = quelliBloccati();
    if (!scelti.length) return;
    chiedi("POST", "/manda", {
      tavolo: tavolo,
      era: era,
      pezzi: scelti,
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
          ripartiDaCapo();
          return;
        }

        if (r.esito === "gia-tua") {
          numeroVolante(soldi(r.lire), "#ff5c6e");
          avviso(r.detto, "male");
          ripartiDaCapo();
          return;
        }

        avviso(r.detto, "bene");
        io.conto.mandate += 1;
        ripartiDaCapo();
      })
      .catch(function (errore) { avviso(errore.message, "male"); });
  }

  /* ----------------------------------------------------------- le figurine */

  /**
   * ⚠ **Un brano si ascolta, e per ascoltarlo ci vuole spazio.**
   *
   * Il difetto, detto il 12 settembre 2026: «le canzoni non si sentono». Non
   * erano rotte e il file era giusto: il lettore stava in una casella da
   * centodieci pixel, dentro la striscia che scorre di fianco. Sotto ai
   * duecento pixel il browser del telefono taglia via meta' dei comandi — il
   * tasto play finiva **fuori** dalla casella. C'era, e non si poteva premere.
   *
   * Quindi un brano non e' un quadratino: e' una riga larga, con la copertina
   * a sinistra e il lettore a destra. Una funzione sola, usata nei tre posti
   * dove un brano compare — le prove, gli attacchi, la figurina — perche' una
   * canzone che si sente di qua e non di la' e' la solita cosa fatta in due
   * posti.
   *
   * ⚠ **«preload=metadata» e non «auto»**: quattro clip da sessanta secondi in
   * una card vorrebbero dire quattro scaricamenti prima che qualcuno prema
   * play. Cosi' arriva solo la durata, e il resto quando si suona.
   */
  function branoHtml(url, titolo, copertina) {
    var h = "<div class=\\"brano\\">";
    h += copertina
      ? "<img class=\\"copertina\\" src=\\"" + sicuro(copertina) + "\\" alt=\\"\\" loading=\\"lazy\\">"
      : "<span class=\\"senza\\">\u266B</span>";
    h += "<div class=\\"dentro\\">";
    if (titolo) h += "<div class=\\"come\\">" + sicuro(titolo) + "</div>";
    h += "<audio controls preload=\\"metadata\\" src=\\"" + sicuro(url) + "\\"></audio>";
    h += "</div></div>";
    return h;
  }

  /** Vero se quel tipo di file si ascolta invece di guardarsi. */
  function siAscolta(mime) {
    return String(mime || "").indexOf("audio/") === 0;
  }

  /**
   * ⚠ **Ogni figurina ha una faccia**, dall'11 settembre 2026: «nell'inventario
   * non tutti gli item si vede la foto». Nel file vero trentaquattro figurine su
   * quarantacinque erano solo un prompt, senza niente da guardare.
   *
   * Il PC dice se ce n'e' una vera, in «c.faccia»: una foto, o la copertina di
   * un brano. Se no la faccia si **disegna** qui, col colore del grado, il segno
   * del tavolo e il titolo. Il disegno sta sempre sotto: se la foto non arriva —
   * una copertina che la libreria non ha — resta lui, invece di un riquadro
   * rotto. Le figurine della casa hanno il loro disegno, che cambia col grado.
   *
   * Una funzione sola per la macchinetta, l'inventario, la busta e lo shop: una
   * faccia che cambia da una schermata all'altra non si riconosce.
   */
  var disegni = 0;

  /** Il titolo spezzato in righe: i pezzi di un prompt uno per riga, al massimo tre. */
  function righeDelTitolo(titolo) {
    var pezzi = String(titolo || "").split(" \u00b7 ");
    if (pezzi.length < 2) {
      var parole = pezzi[0].split(" ");
      var riga = "";
      pezzi = [];
      for (var i = 0; i < parole.length; i++) {
        var provata = riga ? riga + " " + parole[i] : parole[i];
        if (provata.length > 15 && riga) { pezzi.push(riga); riga = parole[i]; }
        else riga = provata;
      }
      if (riga) pezzi.push(riga);
    }
    return pezzi.slice(0, 3).map(function (p) {
      return p.length > 16 ? p.slice(0, 15) + "\u2026" : p;
    });
  }

  function disegnoFigurina(c) {
    var s = scalinoDi(c.grado);
    var id = "dis" + (disegni += 1);
    var segno = c.tavolo === "musica" || c.tipo === "brano" ? "\u266B"
      : c.tipo === "video" ? "\u25B6"
        : c.tavolo === "immagini" || c.tipo === "immagine" ? "\u25C9" : "\u2726";
    var righe = righeDelTitolo(c.titolo);
    var h = "<svg class=\\"disegno\\" viewBox=\\"0 0 120 160\\" " +
      "preserveAspectRatio=\\"xMidYMid slice\\" xmlns=\\"http://www.w3.org/2000/svg\\">" +
      "<defs><linearGradient id=\\"" + id + "\\" x1=\\"0\\" y1=\\"0\\" x2=\\"1\\" y2=\\"1\\">" +
      "<stop offset=\\"0\\" stop-color=\\"" + s.colore + "\\" stop-opacity=\\".6\\"/>" +
      "<stop offset=\\"1\\" stop-color=\\"#0d0f16\\"/></linearGradient></defs>" +
      "<rect width=\\"120\\" height=\\"160\\" fill=\\"#0d0f16\\"/>" +
      "<rect width=\\"120\\" height=\\"160\\" fill=\\"url(#" + id + ")\\"/>" +
      "<text x=\\"60\\" y=\\"72\\" text-anchor=\\"middle\\" font-size=\\"56\\" fill=\\"#fff\\" " +
      "fill-opacity=\\".2\\">" + segno + "</text>";
    var y = 106 - (righe.length - 1) * 7;
    for (var i = 0; i < righe.length; i++) {
      h += "<text x=\\"60\\" y=\\"" + (y + i * 15) + "\\" text-anchor=\\"middle\\" " +
        "font-size=\\"11.5\\" font-weight=\\"700\\" fill=\\"#f2f3f8\\">" + sicuro(righe[i]) +
        "</text>";
    }
    return h + "</svg>";
  }

  /**
   * Il disegno di una figurina della casa: il suo segno su un fondo della sua
   * tinta, e **si arricchisce crescendo** — i raggi da Rare, l'anello del grado
   * da Unique, le stelle da Epic. Crescere si deve vedere, se no le copie sono
   * un numero e basta.
   */
  function disegnoCasa(c) {
    var k = c.casa;
    var id = "dis" + (disegni += 1);
    var s = c.grado ? scalinoDi(c.grado) : null;
    var alto = 0;
    if (s && io && io.gradi) {
      for (var i = 0; i < io.gradi.length; i++) if (io.gradi[i].id === s.id) alto = i;
    }
    var h = "<svg class=\\"disegno\\" viewBox=\\"0 0 120 160\\" " +
      "preserveAspectRatio=\\"xMidYMid slice\\" xmlns=\\"http://www.w3.org/2000/svg\\">" +
      "<defs><radialGradient id=\\"" + id + "\\" cx=\\".5\\" cy=\\".4\\" r=\\".8\\">" +
      "<stop offset=\\"0\\" stop-color=\\"hsl(" + k.tinta + ",70%,62%)\\"/>" +
      "<stop offset=\\"1\\" stop-color=\\"hsl(" + k.tinta + ",55%,16%)\\"/>" +
      "</radialGradient></defs>" +
      "<rect width=\\"120\\" height=\\"160\\" fill=\\"url(#" + id + ")\\"/>";
    if (alto >= 2) {
      h += "<g stroke=\\"#fff\\" stroke-opacity=\\".2\\" stroke-width=\\"3\\">";
      for (var r = 0; r < 12; r++) {
        var ang = r * Math.PI / 6;
        h += "<line x1=\\"60\\" y1=\\"64\\" x2=\\"" + (60 + Math.cos(ang) * 95).toFixed(1) +
          "\\" y2=\\"" + (64 + Math.sin(ang) * 95).toFixed(1) + "\\"/>";
      }
      h += "</g>";
    }
    if (alto >= 5 && s) {
      h += "<circle cx=\\"60\\" cy=\\"64\\" r=\\"41\\" fill=\\"none\\" stroke=\\"" + s.colore +
        "\\" stroke-width=\\"3\\" stroke-dasharray=\\"5 5\\"/>";
    }
    if (alto >= 8) {
      h += "<text x=\\"12\\" y=\\"24\\" font-size=\\"15\\" fill=\\"#fff\\">\u2726</text>" +
        "<text x=\\"94\\" y=\\"24\\" font-size=\\"15\\" fill=\\"#fff\\">\u2726</text>";
    }
    h += "<text x=\\"60\\" y=\\"84\\" text-anchor=\\"middle\\" font-size=\\"52\\">" +
      sicuro(k.segno) + "</text>" +
      "<g class=\\"nome\\">" +
      "<rect y=\\"124\\" width=\\"120\\" height=\\"36\\" fill=\\"#000\\" fill-opacity=\\".45\\"/>" +
      "<text x=\\"60\\" y=\\"146\\" text-anchor=\\"middle\\" font-size=\\"12\\" " +
      "font-weight=\\"700\\" fill=\\"#fff\\">" + sicuro(c.titolo) + "</text></g>";
    return h + "</svg>";
  }

  /** La faccia: il disegno sotto, e la foto sopra se c'e'. */
  function facciaHtml(c) {
    if (c.casa) return "<span class=\\"faccia-d\\">" + disegnoCasa(c) + "</span>";
    return "<span class=\\"faccia-d\\">" + disegnoFigurina(c) +
      (c.faccia ? "<img src=\\"" + sicuro(c.faccia) + "\\" alt=\\"\\" loading=\\"lazy\\">" : "") +
      "</span>";
  }

  // Una foto che non arriva se ne va, e sotto resta il disegno. L'errore di
  // un'immagine non risale il documento: si ascolta mentre scende.
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.parentNode && t.parentNode.className === "faccia-d") {
      t.parentNode.removeChild(t);
    }
  }, true);

  /**
   * ⚠ **La firma: chi ha inventato quella cosa.**
   *
   * Chiesto il 12 settembre 2026: «evidenziamo meglio il nome di chi ha creato
   * quella combinazione, anche quando poi saranno sbloccabili nei pacchetti o
   * acquistabili nel negozio ci deve essere scritto chi lo ha creato
   * inizialmente».
   *
   * Prima chi l'aveva fatta stava in una riga grigia insieme alla data, della
   * stessa misura di tutto il resto: l'unica cosa che dice **di chi e' il
   * merito** era la piu' facile da saltare. Adesso e' una pastiglia dorata con
   * l'iniziale dentro, ed e' la stessa identica in tutti i posti dove una
   * figurina si vede — la fila, l'album, il pacchetto che si apre, il negozio,
   * i rulli della macchinetta. Una firma che cambia faccia da una schermata
   * all'altra non si riconosce.
   *
   * ⚠ **Non cambia mai, nemmeno quando la figurina passa di mano.** Chi la
   * compra nello shop ce l'ha in collezione, ma inventata non l'ha lui: il
   * nome resta quello di prima, e in classifica il punto resta suo.
   */
  function firmaHtml(nome, che) {
    var chi = String(nome || "qualcuno");
    return "<div class=\\"firma\\" title=\\"L'ha inventata " + sicuro(chi) + "\\">" +
      "<span class=\\"tondo\\">" + sicuro(chi.slice(0, 1).toUpperCase()) + "</span>" +
      "<span class=\\"nome\\">" + sicuro(chi) + "</span>" +
      "<span class=\\"che\\">" + sicuro(che || "l'ha inventata") + "</span></div>";
  }

  function figurinaHtml(c, opzioni) {
    var o = opzioni || {};
    var s = scalinoDi(c.grado);
    // Una buttata non e' una figurina piu' spenta: e' un biglietto perdente, e
    // si vede subito che lo e'. Vedi «.figurina.perdente» nello stile.
    var h = "<div class=\\"figurina f" + s.fuoco + (c.scoperta ? "" : " coperta") +
      (c.stato === "buttata" ? " perdente" : "") +
      "\\" style=\\"--g:" + s.colore + "\\">";
    if (c.stato === "buttata") h += "<div class=\\"timbro\\">perdente</div>";
    /**
     * ⚠ **Il grado si vede prima del titolo, e si vede da lontano.**
     *
     * Chiesto il 10 settembre 2026: «il colore del grado piu' evidente, scritte
     * piu' grandi senza esagerare, ottimizza ulteriormente la schermata».
     *
     * Prima il grado era una scrittina colorata dentro una riga grigia, in fila
     * con il numero, il nome di chi l'aveva mandata, la data e lo stato: cinque
     * cose della stessa misura, e quella che conta in un gioco di rarita' era
     * la meno visibile delle cinque. Adesso e' una pastiglia **piena** del suo
     * colore, in cima, da sola con il prezzo.
     *
     * E la riga sotto si e' alleggerita: il grado e il prezzo sono saliti, lo
     * stato e' diventato un'etichetta accanto al grado, e li' resta solo chi
     * l'ha fatta e quando. Una carta che stava in uno schermo e mezzo adesso ci
     * sta in uno.
     */
    h += "<div class=\\"testa\\">";
    /**
     * ⚠ **Su una che nessuno ha ancora guardato il grado non si scrive.**
     *
     * Il grado viene dal prezzo, e una in attesa il prezzo non ce l'ha: si
     * leggeva «Basic» su ogni cosa appena mandata, che non vuol dire «e'
     * scarsa» ma cosi' si legge. Un numero che non c'e' ancora si lascia
     * vuoto, non si mette a zero.
     */
    if (c.stato !== "in-attesa") {
      h += "<span class=\\"grado\\">" + sicuro(s.nome) + "</span>";
    }
    if (c.prezzo > 0) h += "<span class=\\"quanto\\">" + soldi(c.prezzo) + "</span>";
    if (c.numero > 0) h += "<span class=\\"enne\\">n. " + c.numero + "</span>";
    if (c.stato === "in-attesa") h += "<span class=\\"stato\\">in attesa</span>";
    h += "</div>";
    /**
     * ⚠ **Chi gioca viene qui a sapere com'e' andata.** Chiesto il 10
     * settembre 2026: «in Mie un utente normale vede solo l'esito».
     *
     * Una riga sola, in cima, detta come si direbbe a voce. Il resto della
     * carta — i pezzi, il prompt, quello che ne e' uscito — sta sotto per chi
     * lo vuole rileggere, ma la domanda per cui si apre questa pagina e' una:
     * l'hanno presa o no.
     */
    if (o.esito) {
      if (c.stato === "presa") {
        h += "<div class=\\"esito bene\\">Presa. Ti hanno pagato <b>" + soldi(c.prezzo) +
          "</b></div>";
      } else if (c.stato === "buttata") {
        h += "<div class=\\"esito male\\">Buttata</div>";
      } else {
        h += "<div class=\\"esito\\">Nessuno l'ha ancora guardata</div>";
      }
    }
    h += "<div class=\\"titolo\\">" + sicuro(c.titolo) + "</div>";
    /**
     * ⚠ **La firma sta qui, e non piu' in fila con la data.**
     *
     * Prima era «di Tizio · tre ore fa»: due cose diverse, grigie, della
     * stessa misura, e quella che conta — chi l'ha inventata — si perdeva.
     * Adesso il nome ha la sua pastiglia e la data resta sotto, piccola, dove
     * deve stare. Vedi «firmaHtml».
     */
    h += firmaHtml(c.daNome, c.stato === "presa" ? "l'ha inventata" : "l'ha mandata");
    h += "<div class=\\"sotto\\">" + quando(c.quando) + "</div>";
    if (c.stato === "buttata" && c.motivo) {
      h += "<div class=\\"perche\\">" + sicuro(c.motivo) + "</div>";
    }
    if (c.scoperta && c.prompt) {
      h += "<div class=\\"testo\\">" + sicuro(c.prompt) + "</div>";
      /**
       * Il tasto per copiare **questo** prompt.
       *
       * Il testo viaggia nell'attributo e non in una tabella a parte: la
       * figurina e' una stringa di HTML rifatta a ogni giro, e una tabella di
       * appoggio sarebbe una seconda copia da tenere allineata a mano.
       */
      h += "<button class=\\"btn piano copia-uno\\" data-copia=\\"" +
        sicuro(c.prompt) + "\\">Copia in inglese</button>";
    }
    /**
     * ⚠ **La cosa venuta fuori da quel prompt**, se chi comanda ce l'ha
     * attaccata. Si vede **anche da coperta**, ed e' voluto: nello shop uno
     * deve poter guardare cosa sta comprando. Il prompt no, quello resta
     * nascosto finche' non e' tuo.
     */
    /**
     * ⚠ **Una sola si guarda grande, piu' d'una si guardano in fila.**
     *
     * Una figurina con quattro immagini incolonnate e' lunga quattro schermate,
     * e in un album se ne guardano venti. In fila si vedono tutte insieme, che
     * e' anche il modo in cui si guardano davvero: sono quattro tentativi della
     * stessa cosa. Tenere premuto apre grande, come sempre.
     */
    var attaccate = (c.allegati || []).filter(function (a) { return a && a.url; });
    var guardala = function (x) {
      return " data-guarda=\\"" + sicuro(x.url) + "\\" data-guarda-mime=\\"" +
        sicuro(x.mime) + "\\"";
    };
    if (attaccate.length === 1) {
      var sola = attaccate[0];
      // ⚠ Un brano prende la riga larga col lettore vero: dentro un quadratino
      // il tasto play non si preme (vedi «branoHtml», 12 settembre 2026).
      h += siAscolta(sola.mime)
        ? branoHtml(sola.url, c.titolo, c.copertina)
        : "<img" + guardala(sola) + " src=\\"" + sicuro(sola.url) +
          "\\" alt=\\"\\" loading=\\"lazy\\">";
    } else if (attaccate.length > 1) {
      h += "<div class=\\"nate\\">";
      for (var q = 0; q < attaccate.length; q++) {
        var att = attaccate[q];
        if (siAscolta(att.mime)) {
          h += branoHtml(att.url, "", q === 0 ? c.copertina : "");
          continue;
        }
        h += "<div class=\\"nata\\"" + guardala(att) + ">";
        h += "<img src=\\"" + sicuro(att.url) + "\\" alt=\\"\\" loading=\\"lazy\\">";
        h += "</div>";
      }
      h += "</div>";
    }
    // Le figurine che non sono prompt si guardano o si ascoltano: il file sta
    // nella libreria della suite, qui c'e' solo il suo indirizzo.
    if (c.scoperta && c.dove && c.mime.indexOf("image/") === 0) {
      h += "<img src=\\"" + sicuro(c.dove) + "\\" alt=\\"\\">";
    }
    if (c.scoperta && c.dove && siAscolta(c.mime)) {
      h += branoHtml(c.dove, c.titolo, c.copertina);
    }
    if (o.tasti) h += o.tasti;
    h += "</div>";
    return h;
  }

  /**
   * ⚠ **Come sta andando a te**, in tre numeri e in cima alla pagina.
   *
   * Chiesto il 10 settembre 2026. Prima non c'era da nessuna parte: la
   * classifica dice come stai **rispetto agli altri**, e per sapere quanto
   * avevi guadagnato dovevi contare le carte a mano.
   *
   * Il guadagno non e' il saldo: il saldo e' quello che ti resta dopo aver
   * girato, questo e' quanto ti hanno pagato per le cose che ti hanno preso.
   * Sono due numeri diversi e vanno letti diversi.
   */
  function contaMieHtml(c) {
    var q = c || { guadagno: 0, accettate: 0, perdenti: 0, inAttesa: 0 };
    var pezzo = function (quanto, cosa, classe) {
      return "<div class=\\"pezzo " + classe + "\\"><b>" + quanto + "</b><small>" +
        cosa + "</small></div>";
    };
    return pezzo(soldi(q.guadagno), "guadagnate", "oro") +
      pezzo(String(q.accettate), q.accettate === 1 ? "presa" : "prese", "bene") +
      pezzo(String(q.perdenti), q.perdenti === 1 ? "perdente" : "perdenti", "male") +
      (q.inAttesa ? pezzo(String(q.inAttesa), "in attesa", "") : "");
  }

  function caricaMie() {
    chiedi("GET", "/mie").then(function (dati) {
      $("conta-mie").innerHTML = contaMieHtml(dati.conta);

      $("quante-mandate").textContent = dati.mandate.length ? String(dati.mandate.length) : "";
      $("mie-mandate").innerHTML = dati.mandate.length
        ? dati.mandate.map(function (c) { return figurinaHtml(c, { esito: true }); }).join("")
        : "<div class=\\"niente\\">Non hai ancora mandato niente. Monta una riga e mandala.</div>";
      // I perdenti: il cassetto compare solo se dentro c'e' qualcosa.
      var persi = dati.perdenti || [];
      $("cassetto-perdenti").hidden = persi.length === 0;
      $("quanti-perdenti").textContent = persi.length ? String(persi.length) : "";
      $("mie-perdenti").innerHTML = persi.map(function (c) {
        return figurinaHtml(c, { esito: true });
      }).join("");
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /**
   * ⚠ **Si entra in «Mie» coi cassetti chiusi, ogni volta.** Chiesto l'11
   * settembre 2026: «facciamo di default le schede collassate chiuse». Un
   * cassetto aperto ieri e rimasto aperto oggi rifa' la pagina-rotolo che si
   * voleva togliere: in cima i tre numeri, e il resto si apre se serve.
   */
  function chiudiICassettiDiMie() {
    var cassetti = document.querySelectorAll("#p-mie details.cassetto");
    for (var i = 0; i < cassetti.length; i++) cassetti[i].open = false;
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

  /**
   * ⚠ **Due banchi: la vetrina, e i pacchetti a scelta.** Dall'11 settembre
   * 2026 (#109) dentro ai pacchetti chiusi si compra quella che si vuole, e si
   * paga caro. Un pacchetto per cassetto, e il primo aperto: con cento
   * figurine per pacchetto, tutti aperti vorrebbe dire scorrere dieci
   * schermate per arrivare al secondo.
   */
  function caricaShop() {
    disegnaTipiShop();
    chiedi("GET", "/vetrina").then(function (dati) {
      var delTipo = function (c) { return shopTipo === "tutto" || c.tipo === shopTipo; };
      var schede = function (roba) {
        return "<div class=\\"prodotti\\">" +
          roba.map(function (c) { return prodottoHtml(c); }).join("") + "</div>";
      };
      var h = "";
      var inVetrina = dati.roba.filter(delTipo);
      if (inVetrina.length) h += "<h3 class=\\"sezione\\">In vetrina</h3>" + schede(inVetrina);
      var pacchi = dati.pacchetti || [];
      var primo = true;
      for (var i = 0; i < pacchi.length; i++) {
        var roba = pacchi[i].roba.filter(delTipo);
        if (!roba.length) continue;
        if (primo) h += "<h3 class=\\"sezione\\">Dai pacchetti, a scelta</h3>";
        h += "<details class=\\"cassetto\\"" + (primo ? " open" : "") + "><summary>" +
          sicuro(pacchi[i].nome || ("Pacchetto " + pacchi[i].numero)) +
          " <span class=\\"quanti\\">" + roba.length + "</span></summary>" +
          "<div>" + schede(roba) + "</div></details>";
        primo = false;
      }
      $("shop-roba").innerHTML = h ||
        "<div class=\\"niente\\">Qui non c'e' ancora niente da comprare: arriva quando chi " +
        "comanda mette qualcosa in vetrina, o chiude il primo pacchetto.</div>";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  function prodottoHtml(c) {
    var s = scalinoDi(c.grado);
    var h = "<article class=\\"prodotto\\" style=\\"--g:" + s.colore + "\\">";
    h += "<span class=\\"nastro\\">" + sicuro(s.nome) + "</span>";
    if (c.mia) h += "<span class=\\"mia\\">ce l'hai</span>";
    h += "<div class=\\"copertina\\">";
    /**
     * La copertina si vede **anche se non e' tua**: uno deve poter guardare
     * cosa sta comprando. Il prompt no, quello resta coperto finche' non paghi.
     *
     * ⚠ Da quando gli allegati possono essere piu' d'uno, qui si guarda **la
     * faccia**: una scheda di negozio ne ha una sola, e la sceglie il PC con la
     * stessa regola della macchinetta (vedi «vestita» nelle rotte). Il resto si
     * vede quando la figurina e' tua.
     */
    h += facciaHtml(c);
    h += "</div><div class=\\"corpo\\">";
    h += "<h3>" + sicuro(c.titolo) + "</h3>";
    /**
     * ⚠ **Anche qui c'e' scritto chi l'ha inventata.** Chiesto il 12 settembre
     * 2026: «anche quando poi saranno sbloccabili nei pacchetti o acquistabili
     * nel negozio ci deve essere scritto chi lo ha creato inizialmente».
     *
     * Non e' una gentilezza: e' l'unica cosa che questo gioco paga davvero.
     * Uno compra una figurina, la usa nella suite, e resta scritto di chi era
     * l'idea — ed e' il motivo per cui a qualcuno conviene inventarne un'altra.
     */
    h += firmaHtml(c.daNome, "l'ha inventata");
    if (c.numero > 0) h += "<div class=\\"riga\\">n. " + c.numero + "</div>";
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

  /* ----------------------------------------------------------- pacchetti */

  /**
   * ⚠ **Era l'album, e dall'11 settembre 2026 e' «Pacchetti».** Parole sue:
   * «se clicco su un pack mi mostra il pacchetto: se sono admin lo mostra
   * completo, se sono utente mostra solo gli item sbloccati».
   *
   * Prima era una fila di tasti col nome dei pacchetti e sotto tutte le
   * figurine, coperte, una sotto l'altra. Adesso sono bustine: si tocca e si
   * apre, e dentro chi gioca trova le sue. Quelle che mancano stanno
   * nell'Inventario, che e' il posto fatto per guardare i buchi.
   */
  /** Il pacchetto aperto, o zero se si stanno guardando le bustine. */
  var pacchettoAperto = 0;
  /** Gli ultimi pacchetti arrivati: servono al nome sulla busta da strappare. */
  var ultimiPacchetti = [];

  function nomeDelPacchetto(numero) {
    for (var i = 0; i < ultimiPacchetti.length; i++) {
      var p = ultimiPacchetti[i];
      if (p.numero === numero) return p.nome || ("Pacchetto " + p.numero);
    }
    return "Pacchetto " + numero;
  }

  /**
   * La bustina: la stessa nell'elenco, nel pacchetto aperto e in quella che si
   * strappa. Una bustina che cambia faccia da una schermata all'altra non si
   * riconosce.
   */
  function bustinaHtml(nome, sotto) {
    return "<div class=\\"bustina\\"><span class=\\"riflesso\\"></span>" +
      "<span class=\\"marchio-b\\">DaProd Giochi</span>" +
      "<b>" + sicuro(nome) + "</b>" + (sotto ? "<small>" + sicuro(sotto) + "</small>" : "") +
      "</div>";
  }

  function paccoHtml(p) {
    var pieno = p.quante > 0 && p.tue === p.quante;
    var quanto = p.quante ? Math.round(p.tue * 100 / p.quante) : 0;
    return "<div class=\\"pacco" + (pieno ? " completo" : "") + "\\" data-apri-pacco=\\"" +
      p.numero + "\\">" +
      bustinaHtml(p.nome || ("Pacchetto " + p.numero),
        p.quante + (p.quante === 1 ? " figurina" : " figurine")) +
      "<div class=\\"barretta\\"><span style=\\"width:" + quanto + "%\\"></span></div>" +
      "<div class=\\"quante\\">ne hai <b>" + p.tue + "</b> su " + p.quante + "</div>" +
      "<button class=\\"btn oro\\" data-compra-pacco=\\"" + p.numero + "\\">Compra · " +
      soldi(io.costi.pacchetto) + "</button></div>";
  }

  function caricaPacchetti() {
    chiedi("GET", pacchettoAperto ? "/album/" + pacchettoAperto : "/album")
      .then(disegnaIPacchetti)
      .catch(function (e) {
        // Un pacchetto che non c'e' piu': si torna alle bustine, non si resta
        // davanti a un errore.
        if (pacchettoAperto) { pacchettoAperto = 0; caricaPacchetti(); return; }
        avviso(e.message, "male");
      });
  }

  function disegnaIPacchetti(dati) {
    ultimiPacchetti = dati.pacchetti || [];
    var m = dati.magazzino;
    /**
     * ⚠ **Cento non e' una porta chiusa.** Dal 12 settembre 2026 chi comanda
     * chiude un pacchetto quando vuole, anche con meno dentro: qui si dice
     * quante ne mancano per averne uno **pieno**, non quante ne servono.
     */
    $("pacchetti-stato").innerHTML = dati.chiuse === 0
      ? "<div class=\\"niente\\">Nessun pacchetto ancora. " +
        (m.fuori
          ? "Ce ne sono <b>" + m.fuori + "</b> pronte a entrarci" +
            (m.allaProssimaSerie > 0
              ? ", e ne mancano " + m.allaProssimaSerie + " per farne uno pieno."
              : ".") +
            (io.admin ? " Lo chiudi dalla tendina qui sotto." : "")
          : "Si riempie con le combinazioni che vengono prese.") + "</div>"
      : "<p class=\\"spiegone\\">Un pacchetto costa " + soldi(io.costi.pacchetto) +
        " e dentro ne pesca " + io.costi.perPacchetto + " a caso. Tocca una bustina per " +
        "vedere cosa c'e' dentro.</p>";
    $("pacchetti-stato").hidden = Boolean(pacchettoAperto);
    $("pacchetti-elenco").hidden = Boolean(pacchettoAperto);
    $("pacchetti-elenco").innerHTML = ultimiPacchetti.map(paccoHtml).join("");

    var aperto = $("pacchetto-aperto");
    aperto.hidden = !pacchettoAperto;
    aperto.innerHTML = pacchettoAperto ? pacchettoApertoHtml(dati) : "";

    // La tendina: quello che finisce nel prossimo pacchetto.
    var fuori = dati.fuori || [];
    var altre = dati.fuoriAltre || 0;
    var totale = fuori.length + altre;
    $("cassetto-fuori").hidden = totale === 0;
    $("quante-fuori").textContent = totale ? String(totale) : "";
    $("pacchetti-fuori").innerHTML =
      fuori.map(function (c) { return figurinaHtml(c); }).join("") +
      (altre
        ? "<div class=\\"conto\\">" + (fuori.length ? "E altre " : "Ce ne sono ") + altre +
          (altre === 1 ? " di qualcun altro" : " di altri") +
          ": le vedrai quando chi comanda chiude il pacchetto.</div>"
        : "");
    // Il tasto di chi comanda: dice sempre quante cose ci finirebbero dentro.
    $("riga-crea").hidden = !io.admin;
    if (io.admin) {
      $("crea-pacchetto").disabled = !m.siPuoChiudere;
      $("crea-pacchetto").textContent = m.siPuoChiudere
        ? "Chiudi un pacchetto con queste " + m.fuori
        : "Niente da impacchettare";
    }
  }

  function pacchettoApertoHtml(dati) {
    var p = null;
    for (var i = 0; i < ultimiPacchetti.length; i++) {
      if (ultimiPacchetti[i].numero === dati.serie) p = ultimiPacchetti[i];
    }
    var nome = p ? (p.nome || ("Pacchetto " + p.numero)) : ("Pacchetto " + dati.serie);
    var quante = p ? p.quante : dati.figurine.length;
    var h = "<div class=\\"riga-tasti\\"><button class=\\"btn piano\\" data-torna-pacchi>" +
      "← Tutti i pacchetti</button></div>";
    h += "<div class=\\"aperto-testa\\">" + bustinaHtml(nome, quante + " dentro") +
      "<div class=\\"dice\\"><b>" + sicuro(nome) + "</b>" +
      (io.admin
        ? "Le vedi tutte perche' comandi tu. Chi gioca vede solo quelle che ha."
        : "Ne hai " + dati.figurine.length + " su " + quante + "." +
          (dati.nascoste
            ? " Le altre " + dati.nascoste + " stanno nell'Inventario, come caselle da riempire."
            : "")) +
      "</div></div>";
    h += "<div class=\\"riga-tasti\\"><button class=\\"btn oro\\" data-compra-pacco=\\"" +
      dati.serie + "\\">Compra un pacchetto · " + soldi(io.costi.pacchetto) + "</button></div>";
    h += "<div class=\\"conto\\">In ogni pacchetto, oltre a queste, ci sono le cinquanta " +
      "figurine della casa: escono quasi sempre, e crescono.</div>";
    h += dati.figurine.length
      ? dati.figurine.map(function (c) { return figurinaHtml(c); }).join("")
      : "<div class=\\"niente\\">Di questo pacchetto non ne hai ancora nessuna. " +
        "Comprane uno e strappalo.</div>";
    return h;
  }

  /**
   * ⚠ **Chi comanda chiude un pacchetto, quando vuole.**
   *
   * Chiesto il 12 settembre 2026: «facciamo che un admin puo' creare un
   * pacchetto quando vuole anche con meno di 100 creazioni». Dentro ci va tutto
   * quello che e' rimasto fuori — non si sceglie a mano quali, se no una cosa
   * presa potrebbe non stare in nessuna raccolta e non comprarsi da nessuna
   * parte. Il nome si puo' dare: «le cose di Natale» si ricorda, «serie 3» no.
   */
  function creaIlPacchetto() {
    chiediQualcosa("Come si chiama questo pacchetto?",
      "Lascia vuoto e si chiamera' col suo numero. Dentro ci va tutto quello " +
      "che e' stato preso dopo l'ultimo pacchetto.",
      { suggerimento: "un nome, o niente", tastoSi: "Chiudilo" }).then(function (nome) {
        if (nome === null) return;
        chiedi("POST", "/pacchetto/crea", { nome: nome }).then(function (esito) {
          coriandoli(60, ["#ffd166", "#7fd1a8", "#ffffff"]);
          avviso("Pacchetto " + esito.pacchetto.numero + " chiuso, con dentro " +
            esito.pacchetto.quante + ".", "bene");
          pacchettoAperto = 0;
          caricaPacchetti();
          // ⚠ La macchinetta vive dei pacchetti: uno nuovo vuol dire rulli
          // nuovi, e si aggiorna da sola senza che nessuno ricarichi.
          caricaMacchinetta();
        }).catch(function (e) { avviso(e.message, "male"); });
      });
  }

  function compraPacco(numero, tasto) {
    if (tasto) tasto.disabled = true;
    chiedi("POST", "/pacchetto", { serie: numero }).then(function (a) {
      io.saldo = a.saldo;
      disegnaSaldo(true);
      apriLaBusta(a, nomeDelPacchetto(numero));
    }).catch(function (e) {
      if (tasto) tasto.disabled = false;
      avviso(e.message, "male");
    });
  }

  /**
   * ⚠ **La busta si strappa col dito.** Chiesto l'11 settembre 2026: «manca
   * un'animazione che fa vedere cosa esce: vorrei un pack figurine che si apre,
   * magari fai uno slide con il dito, tipo per tagliare e aprire il pacchetto, e
   * poi si vede cosa esce».
   *
   * Prima si comprava e compariva una scritta — «2 figurine nuove» — e le
   * figurine non si vedevano uscire da nessuna parte.
   *
   * ⚠ **Cosa c'e' dentro e' gia' deciso**: il PC ha pescato nel momento in cui
   * si e' pagato (CONCETTI.md § 3). Strappare e girare le carte e' la scena, e
   * la scena non puo' cambiare niente — se no chiudere la pagina a meta' strappo
   * sarebbe un modo di non pagare un doppione.
   *
   * ⚠ **C'e' anche «aprila e basta»**: chi non ci riesce col dito, chi ha
   * fretta, chi gioca col mouse e non ha voglia. Il gesto e' il bello, non un
   * esame.
   */
  function apriLaBusta(a, nome) {
    var vecchia = document.querySelector(".apertura");
    if (vecchia) vecchia.remove();
    var fondo = document.createElement("div");
    fondo.className = "apertura";
    fondo.innerHTML =
      "<div class=\\"busta\\">" +
        "<div class=\\"lembo\\"><span class=\\"taglio\\"></span>" +
        "<span class=\\"forbici\\">\u2702\uFE0F</span></div>" +
        bustinaHtml(nome, a.figurine.length + " figurine") +
      "</div>" +
      "<div class=\\"dice\\">Passa il dito sulla <b>riga tratteggiata</b>, da una parte " +
        "all'altra.</div>" +
      "<div class=\\"carte\\" hidden></div>" +
      "<div class=\\"riga-tasti\\"><button class=\\"btn piano\\" data-busta=\\"apri\\">" +
        "Aprila e basta</button></div>";
    document.body.appendChild(fondo);

    var busta = fondo.querySelector(".busta");
    var taglio = fondo.querySelector(".taglio");
    var dice = fondo.querySelector(".dice");
    var carte = fondo.querySelector(".carte");
    var tasti = fondo.querySelector(".riga-tasti");
    var partito = null;
    var strappata = false;
    var girate = 0;

    function strappa() {
      if (strappata) return;
      strappata = true;
      busta.classList.add("strappata");
      try { if (navigator.vibrate) navigator.vibrate(35); } catch (e) {}
      dice.textContent = "";
      tasti.innerHTML = "";
      setTimeout(mostraLeCarte, 650);
    }

    /**
     * Il taglio: si parte dalla testa della busta e si trascina di lato. Il
     * rosso segue il dito, e a sette decimi della larghezza si strappa — tutta
     * la larghezza su un telefono vuol dire partire dal bordo dello schermo, e
     * li' c'e' il gesto del sistema che torna indietro.
     */
    busta.addEventListener("pointerdown", function (e) {
      if (strappata) return;
      var r = busta.getBoundingClientRect();
      if (e.clientY - r.top > r.height * 0.4) {
        dice.innerHTML = "Piu' in alto: il dito va sulla <b>riga tratteggiata</b>.";
        return;
      }
      partito = { x: e.clientX, largo: r.width };
      busta.classList.add("tagliando");
      try { busta.setPointerCapture(e.pointerId); } catch (er) {}
    });
    busta.addEventListener("pointermove", function (e) {
      if (!partito || strappata) return;
      var dx = e.clientX - partito.x;
      var fatto = Math.min(1, Math.abs(dx) / (partito.largo * 0.7));
      taglio.classList.toggle("da-destra", dx < 0);
      taglio.style.width = Math.round(fatto * 100) + "%";
      if (fatto >= 1) strappa();
    });
    var lascia = function () {
      if (strappata || !partito) return;
      partito = null;
      busta.classList.remove("tagliando");
      taglio.style.width = "0%";
    };
    busta.addEventListener("pointerup", lascia);
    busta.addEventListener("pointercancel", lascia);

    function mostraLeCarte() {
      busta.remove();
      carte.hidden = false;
      var h = "";
      for (var i = 0; i < a.figurine.length; i++) {
        var f = a.figurine[i];
        var s = scalinoDi(f.grado);
        h += "<div class=\\"carta\\" data-carta=\\"" + i + "\\" style=\\"--g:" + s.colore +
          "; animation-delay:" + (i * 110) + "ms\\"><div class=\\"gira\\">" +
          "<div class=\\"retro\\">?</div>" +
          "<div class=\\"fronte\\">" + fronteDellaCarta(f, s) + "</div></div></div>";
      }
      carte.innerHTML = h;
      dice.innerHTML = "Toccale per girarle.";
      tasti.innerHTML = "<button class=\\"btn piano\\" data-busta=\\"tutte\\">Girale tutte</button>";
    }

    function giraLaCarta(nodo) {
      if (!nodo || nodo.classList.contains("girata")) return;
      nodo.classList.add("girata");
      var f = a.figurine[Number(nodo.getAttribute("data-carta"))];
      var s = scalinoDi(f.grado);
      // La scena cresce col grado, come dappertutto (CONCETTI.md § 7): il
      // cinque e' l'unica cosa che ferma tutto, anche qui. Una della casa che
      // cresce si accende anche lei: e' il suo premio.
      if (s.fuoco >= 1 || (f.casa && f.casa.cresciuta && f.casa.prima)) lampo(s.colore);
      if (s.fuoco >= 2) {
        carte.classList.remove("scossa");
        void carte.offsetWidth;
        carte.classList.add("scossa");
      }
      if (s.fuoco >= 3) coriandoli(70, [s.colore, "#ffd166", "#ffffff"]);
      if (s.fuoco >= 4) coriandoli(90, [s.colore, "#ffffff"]);
      if (s.fuoco >= 5) grande(s.nome, "e' uscito", f.titolo, s.colore);
      girate += 1;
      if (girate === a.figurine.length) finito();
    }

    function finito() {
      var vere = a.figurine.filter(function (f) { return !f.casa; });
      var nuove = vere.filter(function (f) { return !f.doppione; }).length;
      var casa = a.figurine.filter(function (f) { return f.casa; });
      // ⚠ Una della casa alla prima copia «cresce» anche lei — nasce — ma dirlo
      // cosi' faceva leggere «7 della casa, e 7 crescono» quando ne era
      // cresciuta una. Nuove e cresciute si contano a parte.
      var nuoveCasa = casa.filter(function (f) { return !f.casa.prima; }).length;
      var crescono = casa.filter(function (f) { return f.casa.prima && f.casa.cresciuta; }).length;
      var detto = [];
      if (vere.length) {
        detto.push(nuove === 0 ? "nessuna figurina nuova"
          : "<b>" + nuove + (nuove === 1 ? " nuova" : " nuove") + "</b>");
        if (a.vinto > 0) detto.push(soldi(a.vinto) + " dai doppioni");
      }
      if (casa.length) {
        var come = [];
        if (nuoveCasa) come.push(nuoveCasa + (nuoveCasa === 1 ? " nuova" : " nuove"));
        if (crescono) come.push("<b>" + crescono + (crescono === 1 ? " cresce" : " crescono") + "</b>");
        detto.push(casa.length + " della casa" + (come.length ? " (" + come.join(", ") + ")" : ""));
      }
      dice.innerHTML = detto.join(" \u00b7 ") + ". Le trovi nell'Inventario.";
      tasti.innerHTML = "<button class=\\"btn oro\\" data-busta=\\"fatto\\">Fatto</button>";
    }

    fondo.addEventListener("click", function (e) {
      var t = e.target;
      var cosa = t && t.closest ? t.closest("[data-busta], [data-carta]") : null;
      if (!cosa) return;
      e.stopPropagation();
      if (cosa.hasAttribute("data-carta")) { giraLaCarta(cosa); return; }
      var che = cosa.getAttribute("data-busta");
      if (che === "apri") { strappa(); return; }
      if (che === "tutte") {
        var coperte = carte.querySelectorAll(".carta:not(.girata)");
        for (var k = 0; k < coperte.length; k++) {
          (function (n, dopo) { setTimeout(function () { giraLaCarta(n); }, dopo); })(coperte[k], k * 180);
        }
        return;
      }
      if (che === "fatto") {
        fondo.remove();
        caricaPacchetti();
      }
    });
  }

  /**
   * Il davanti di una carta appena uscita: la faccia, il grado, chi l'ha fatta.
   * Una della casa dice invece a che copia e' arrivata, e se e' cresciuta: e'
   * quello il suo premio, al posto delle lire di un doppione.
   */
  function fronteDellaCarta(f, s) {
    var sotto;
    if (f.casa) {
      var k = f.casa;
      sotto = !k.prima
        ? "<div class=\\"nuova\\">nuova, della casa</div>"
        : k.cresciuta
          ? "<div class=\\"nuova\\">cresce a " + sicuro(s.nome) + "!</div>"
          : "<div class=\\"doppia\\">copia " + k.copie +
            (k.prossimo ? " di " + k.prossimo + " per crescere" : "") + "</div>";
    } else {
      sotto = firmaHtml(f.daNome, "") + (f.doppione
        ? "<div class=\\"doppia\\">doppione \u00b7 +" + soldi(f.lire) + "</div>"
        : "<div class=\\"nuova\\">nuova!</div>");
    }
    return "<div class=\\"faccia\\">" + facciaHtml(f) + "</div>" +
      "<div class=\\"sotto\\"><span class=\\"grado\\">" + sicuro(s.nome) + "</span>" +
      "<div class=\\"titolo\\">" + sicuro(f.titolo) + "</div>" + sotto + "</div>";
  }

  /* ----------------------------------------------------------- inventario */

  /**
   * ⚠ **L'inventario: quello che c'e' da avere, con i buchi.** Deciso l'11
   * settembre 2026: «manca un inventario dove vedere tutti i collezionabili
   * nascosti, e quando si sbloccano compaiono... voglio una bella page
   * dedicata».
   *
   * ⚠ **«Quando si sbloccano compaiono»**: quelle arrivate dall'ultima volta
   * che si e' aperta la pagina si accendono. Cosa si e' gia' visto sta nel
   * browser e non sul PC: riguarda uno schermo, non il conto — la stessa
   * regola del regalo gia' mostrato. La prima volta non si accende niente, se
   * no si accenderebbe tutto.
   */
  /** Le figurine piene dell'inventario, per aprirle toccandole. */
  var invCose = {};
  /** E quelle della casa, per numero. */
  var invCasa = {};

  /**
   * Il brano di una figurina, se ne ha uno. ⚠ Chiesto l'11 settembre 2026: «le
   * canzoni facciamole sentire bene». Toccandolo nell'Inventario si apre grande,
   * con la copertina, e parte da solo.
   */
  /**
   * Il primo file uscito dalle prove, dall'ultima, che va bene a «vaBene». ⚠ Una
   * combinazione generata e mai attaccata e' tua lo stesso: da sbloccata si
   * guarda e si ascolta. 11 settembre 2026 sera: «quando la sblocca puo'
   * vederla bene o ascoltarla».
   */
  function uscitoDi(c, vaBene) {
    var prove = c.prove || [];
    for (var j = prove.length - 1; j >= 0; j--) {
      var usciti = prove[j].usciti || [];
      for (var u = 0; u < usciti.length; u++) {
        if (usciti[u] && usciti[u].url && vaBene(usciti[u].mime)) return usciti[u].url;
      }
    }
    return "";
  }

  function branoDi(c) {
    var att = c.allegati || [];
    for (var i = 0; i < att.length; i++) {
      if (att[i] && att[i].url && siAscolta(att[i].mime)) return att[i].url;
    }
    if (c.dove && siAscolta(c.mime)) return c.dove;
    return uscitoDi(c, siAscolta);
  }

  /** La foto intera di una figurina, da guardare grande. */
  function fotoDi(c) {
    var eFoto = function (mime) { return String(mime || "").indexOf("image/") === 0; };
    var att = c.allegati || [];
    for (var i = 0; i < att.length; i++) {
      if (att[i] && att[i].url && eFoto(att[i].mime)) return att[i].url;
    }
    if (c.dove && eFoto(c.mime)) return c.dove;
    return uscitoDi(c, eFoto);
  }

  function casellaInvHtml(k, viste, primaVolta) {
    var s = scalinoDi(k.grado);
    if (!k.cosa) {
      return "<div class=\\"cas buco\\" style=\\"--g:" + s.colore + "\\" title=\\"" +
        sicuro(s.nome) + "\\"><span class=\\"n\\">" + (k.numero || "") + "</span>" +
        "<span class=\\"q\\">?</span></div>";
    }
    var c = k.cosa;
    invCose[c.id] = c;
    var appena = !primaVolta && !viste[c.id];
    return "<div class=\\"cas f" + s.fuoco + (appena ? " appena" : "") + "\\" style=\\"--g:" +
      s.colore + "\\" data-inv=\\"" + sicuro(c.id) + "\\">" + facciaHtml(c) +
      "<span class=\\"n\\">" + (c.numero || "") + "</span>" +
      (branoDi(c) ? "<span class=\\"suona\\">\u25B6</span>" : "") +
      "<span class=\\"t\\">" + sicuro(c.titolo) + "</span></div>";
  }

  /**
   * Una casella della casa: il disegno col suo grado, le copie, e la barretta
   * verso il grado dopo. ⚠ Si accende quando e' nuova **o quando e' cresciuta**
   * dall'ultima volta: per queste, crescere e' sbloccarsi un'altra volta.
   */
  function casellaCasaHtml(f, viste, primaVolta) {
    if (!f.copie) {
      return "<div class=\\"cas buco casa\\" style=\\"--g:#8a8f9e\\"><span class=\\"n\\">" +
        f.numero + "</span><span class=\\"q\\">?</span></div>";
    }
    var s = scalinoDi(f.grado);
    invCasa[f.numero] = f;
    var appena = !primaVolta && viste["casa-" + f.numero] !== f.grado;
    var verso = f.prossimo ? Math.min(100, Math.round(f.copie * 100 / f.prossimo)) : 100;
    return "<div class=\\"cas casa f" + s.fuoco + (appena ? " appena" : "") + "\\" style=\\"--g:" +
      s.colore + "\\" data-casa=\\"" + f.numero + "\\">" +
      facciaHtml({ casa: f, grado: f.grado, titolo: f.nome }) +
      "<span class=\\"n\\">" + f.numero + "</span>" +
      "<span class=\\"copie\\">\u00d7" + f.copie + "</span>" +
      "<span class=\\"verso\\"><span style=\\"width:" + verso + "%\\"></span></span></div>";
  }

  function mostraCasa(f) {
    if (!f) return;
    var s = scalinoDi(f.grado);
    grande(s.nome + " \u00b7 " + f.copie + (f.copie === 1 ? " copia" : " copie"), f.nome,
      f.prossimo
        ? "Con " + f.prossimo + " copie cresce di grado. Escono dai pacchetti e dalla macchinetta."
        : "E' in cima: piu' di cosi' non cresce.",
      s.colore);
  }

  function caricaInventario() {
    chiedi("GET", "/inventario").then(function (d) {
      var chiave = "daprod.giochi.viste." + (io && io.chi ? io.chi : "");
      var viste = null;
      try { viste = JSON.parse(localStorage.getItem(chiave) || "null"); } catch (e) { viste = null; }
      var primaVolta = !viste;
      viste = viste || {};
      invCose = {};
      invCasa = {};

      var pct = d.di ? Math.round(d.hai * 100 / d.di) : 0;
      $("inv-testa").innerHTML =
        "<div class=\\"anello\\" style=\\"--p:" + pct + "\\"><b>" + pct + "%</b></div>" +
        "<div class=\\"dice\\"><b>" + d.hai + " su " + d.di + "</b><small>" +
        (d.di === 0
          ? "L'inventario si apre col primo pacchetto: dentro ci sono tutte le figurine " +
            "che si possono avere."
          : d.hai === d.di
            ? "Le hai tutte, per ora. Al prossimo pacchetto ce ne sono di nuove."
            : "Le figurine dei pacchetti. Quelle che ti mancano sono le caselle vuote: " +
              "il numero e il grado si vedono, il resto no.") +
        "</small></div>";

      $("inv-gradi").innerHTML = (d.gradi || []).map(function (g) {
        var s = scalinoDi(g.id);
        return "<span class=\\"g" + (g.hai === g.di ? " pieno" : "") + "\\" style=\\"--g:" +
          s.colore + "\\"><i></i>" + sicuro(s.nome) + " " + g.hai + "/" + g.di + "</span>";
      }).join("");

      // Gli obiettivi: prima quelli da fare, poi quelli fatti. Si apre il
      // cassetto per sapere cosa manca, non per rileggere i trofei.
      var ob = d.obiettivi || [];
      var fatti = ob.filter(function (o) { return o.fatto; });
      var daFare = ob.filter(function (o) { return !o.fatto; });
      $("cassetto-obiettivi").hidden = ob.length === 0;
      $("quanti-obiettivi").textContent = ob.length ? fatti.length + " su " + ob.length : "";
      $("inv-obiettivi").innerHTML = daFare.concat(fatti).map(function (o) {
        var q = o.di ? Math.round(o.quanto * 100 / o.di) : 0;
        return "<div class=\\"obiettivo" + (o.fatto ? " fatto" : "") + "\\">" +
          "<span class=\\"spunta\\">" + (o.fatto ? "\u2713" : "") + "</span>" +
          "<div class=\\"cosa\\">" + sicuro(o.detto) +
          (o.fatto || o.di <= 1
            ? ""
            : "<div class=\\"barretta\\"><span style=\\"width:" + q + "%\\"></span></div>") +
          "</div><span class=\\"quanto\\">" + o.quanto + "/" + o.di + "</span></div>";
      }).join("");

      var h = "";
      var pacchi = d.pacchetti || [];
      for (var i = 0; i < pacchi.length; i++) {
        var p = pacchi[i];
        var pq = p.di ? Math.round(p.hai * 100 / p.di) : 0;
        h += "<div class=\\"inv-pacco" + (p.di && p.hai === p.di ? " completo" : "") + "\\">" +
          "<div class=\\"testa\\"><b>" + sicuro(p.nome || ("Pacchetto " + p.numero)) + "</b>" +
          "<small>" + p.hai + " su " + p.di + "</small></div>" +
          "<div class=\\"barretta\\"><span style=\\"width:" + pq + "%\\"></span></div>" +
          "<div class=\\"caselle-inv\\">" +
          p.caselle.map(function (k) { return casellaInvHtml(k, viste, primaVolta); }).join("") +
          "</div></div>";
      }

      /**
       * ⚠ **Le cinquanta della casa**, dall'11 settembre 2026: «quegli item fake
       * piu' ne collezioniamo piu' si evolvono, partono da basic fino a
       * ethernal». Stanno dopo i pacchetti veri — quelli sono la raccolta — e
       * si vedono solo quando c'e' un pacchetto da cui possono uscire.
       */
      var casa = d.casa;
      if (casa && pacchi.length) {
        var cq = Math.round(casa.hai * 100 / casa.di);
        h += "<div class=\\"inv-pacco\\"><div class=\\"testa\\"><b>Le figurine della casa</b>" +
          "<small>" + casa.hai + " su " + casa.di + "</small></div>" +
          "<div class=\\"conto\\">Escono in tutti i pacchetti e sulla macchinetta. Ogni copia " +
          "in piu' le fa crescere, da Basic fino a Ethernal.</div>" +
          "<div class=\\"barretta\\"><span style=\\"width:" + cq + "%\\"></span></div>" +
          "<div class=\\"caselle-inv\\">" +
          casa.figurine.map(function (f) { return casellaCasaHtml(f, viste, primaVolta); }).join("") +
          "</div></div>";
      }

      var fuori = d.fuori || [];
      if (fuori.length) {
        h += "<div class=\\"inv-pacco\\"><div class=\\"testa\\"><b>Fuori dai pacchetti</b>" +
          "<small>" + fuori.length + "</small></div>" +
          "<div class=\\"conto\\">Tue, prese prima che entrassero in un pacchetto.</div>" +
          "<div class=\\"caselle-inv\\">" +
          fuori.map(function (c) {
            return casellaInvHtml({ numero: c.numero, grado: c.grado, cosa: c }, viste, primaVolta);
          }).join("") + "</div></div>";
      }
      $("inv-pacchetti").innerHTML = h;

      // Da adesso queste sono viste: la prossima volta si accendono solo le
      // nuove, e quelle della casa che sono cresciute.
      var ora = {};
      for (var id in invCose) if (Object.prototype.hasOwnProperty.call(invCose, id)) ora[id] = 1;
      for (var n in invCasa) {
        if (Object.prototype.hasOwnProperty.call(invCasa, n)) ora["casa-" + n] = invCasa[n].grado;
      }
      try { localStorage.setItem(chiave, JSON.stringify(ora)); } catch (e) {}
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /**
   * Una figurina dell'inventario, aperta intera: col prompt e il tasto per
   * copiarlo. E' la carta di sempre («figurinaHtml»), dentro a un pannello: la
   * collezione stava in Mie con quel tasto, e spostarla qui non doveva
   * farglielo perdere.
   */
  function mostraFigurina(c) {
    var vecchio = document.querySelector(".chiede");
    if (vecchio) vecchio.remove();
    var fondo = document.createElement("div");
    fondo.className = "chiede";
    fondo.innerHTML = "<div class=\\"dentro\\">" + figurinaHtml(c) +
      "<div class=\\"riga-tasti\\"><button class=\\"btn piano\\" data-chiudi-figurina>" +
      "Chiudi</button></div></div>";
    fondo.addEventListener("click", function (e) {
      var t = e.target;
      if (t === fondo || (t && t.closest && t.closest("[data-chiudi-figurina]"))) fondo.remove();
    });
    document.body.appendChild(fondo);
  }

  /* -------------------------------------------------------- la macchinetta */

  /**
   * ⚠ **La seconda slot: tre file da tre.**
   *
   * Chiesta il 12 settembre 2026 con due file, e il giorno dopo: «aggiungiamo
   * un'altra riga, sempre stesso funzionamento: si vince quando o una riga e'
   * completa o quando tutto lo schermo ha la stessa immagine».
   *
   * Qui non si decide niente: si punta, si chiede al PC, e si fa la scena. Le
   * caselle arrivano gia' decise (vedi macchinetta.ts), e questa pagina le
   * scopre una alla volta — che e' tutta la differenza fra guardare una slot e
   * leggere un risultato. Anche **quante** sono lo dice il PC.
   */

  /** Il mazzo, per far scorrere qualcosa mentre gira. Cosa esce lo dice il PC. */
  var simboli = [];
  /** La forma della macchina, come la manda il PC. Tre per tre finche' non risponde. */
  var forma = { file: 3, perFila: 3 };
  function quanteCaselle() { return forma.file * forma.perFila; }
  /** Tante figurine a caso quante sono le caselle: la vetrina ferma, e il giro. */
  function tutteACaso() {
    var fuori = [];
    for (var i = 0; i < quanteCaselle(); i++) fuori.push(unSimboloACaso());
    return fuori;
  }
  var puntata = 0;
  var macchinaGira = false;
  var orologiMacchina = [];
  /** L'ultima puntata scelta resta fra una sera e l'altra. */
  var CHIAVE_PUNTATA = "daprod.giochi.puntata";

  function fermaOrologiMacchina() {
    for (var i = 0; i < orologiMacchina.length; i++) clearTimeout(orologiMacchina[i]);
    orologiMacchina = [];
  }

  /**
   * Una casella: la faccia della figurina, e sotto chi l'ha inventata.
   *
   * ⚠ **La faccia c'e' sempre**, dall'11 settembre 2026: una foto, la copertina
   * di un brano, o una disegnata (vedi «facciaHtml»). Prima sui rulli giravano
   * solo le figurine con una foto — undici su quarantacinque, e tutte degli
   * stessi due dispositivi: «vedo solo immagini di cammo o tabletcammo».
   *
   * ⚠ **Il nome di chi l'ha inventata sta sulla casella** (12 settembre 2026):
   * una figurina che gira su un rullo e' una figurina come le altre. Quelle
   * della casa non le ha inventate nessuno, e non hanno nome.
   */
  function casellaHtml(sim, classe, dove) {
    var s = sim ? scalinoDi(sim.grado) : { colore: "#2a2f3d" };
    var tenuta = Boolean(giro && giro.tenute[dove]);
    var h = "<div class=\\"casella " + (classe || "") + (tenuta ? " tenuta" : "") +
      "\\" data-casella=\\"" + dove + "\\" style=\\"--g:" + s.colore + "\\">";
    if (sim) {
      h += facciaHtml(sim);
      if (sim.daNome && !sim.casa) h += "<span class=\\"chi\\">" + sicuro(sim.daNome) + "</span>";
    }
    if (tenuta) h += "<span class=\\"ferma\\">tenuta</span>";
    h += "</div>";
    return h;
  }

  function disegnaCaselle(quali, classe) {
    var h = "";
    for (var i = 0; i < quanteCaselle(); i++) h += casellaHtml(quali[i], classe, i);
    $("macchina-rulli").innerHTML = h;
  }

  function unSimboloACaso() {
    return simboli.length ? simboli[Math.floor(Math.random() * simboli.length)] : null;
  }

  /**
   * ⚠ **Il giro a meta'**: pagato, tirato una volta, in attesa del secondo tiro.
   * Chiesto l'11 settembre 2026: «l'utente paga, gira 2 volte: la prima si
   * riempie lo schermo e puo' decidere di bloccare alcuni item, quindi rigira;
   * se l'utente non seleziona nulla viene comunque aggiornata la tabella».
   *
   * Le tenute stanno qui finche' non si rigira: sono una scelta a meta', e una
   * spunta non e' un giro di rete. Il giro invece sta sul PC: chiudendo la
   * pagina a meta' si ritrova, e il secondo tiro non si paga di nuovo.
   */
  var giro = null;

  function disegnaPuntate() {
    var quali = (io && io.puntate) || [50, 100, 200];
    var scelta = giro ? giro.puntata : puntata;
    var h = "";
    for (var i = 0; i < quali.length; i++) {
      h += "<button data-puntata=\\"" + quali[i] + "\\"" +
        (quali[i] === scelta ? " class=\\"scelto\\"" : "") + (giro ? " disabled" : "") + ">" +
        soldi(quali[i]) + "</button>";
    }
    $("puntate").innerHTML = h;
    $("tira").textContent = giro ? "Rigira" : "Tira \u00b7 " + soldi(puntata);
    $("macchina-conto").innerHTML = giro
      ? "Tocca le caselle da <b>tenere</b>, poi rigira: cambiano solo le altre. Il secondo " +
        "tiro e' gia' pagato."
      : "Un giro sono due tiri: il primo riempie lo schermo, tieni quelle che ti servono e " +
        "rigira. Una fila paga, due il doppio, <b>tre file</b> il superbonus e sbloccano le " +
        "figurine. <b>Sei uguali</b>, in qualsiasi posto, sbloccano la loro.";
    /**
     * ⚠ **Il secondo tiro si riconosce da lontano.** Chiesto l'11 settembre 2026
     * sera: «indichiamo bene anche quando c'e' il secondo giro». Prima lo diceva
     * solo una riga grigia sotto le caselle, e il tasto cambiava una parola.
     * Adesso i due tiri stanno scritti sopra la macchina, il bordo diventa d'oro
     * e respira, e il tasto dice quale tiro e'.
     */
    $("macchina").classList.toggle("secondo", Boolean(giro));
    $("macchina-tiri").innerHTML = giro
      ? "<span>1&deg; tiro</span><b>2&deg; tiro &middot; gia' pagato</b>"
      : "<b>1&deg; tiro</b><span>2&deg; tiro</span>";
    if (giro) $("tira").textContent = "Rigira: secondo tiro";
  }

  /** La tabellina dei premi: quanto paga ogni grado. La dice il PC, non questa pagina. */
  function disegnaPremi(dati) {
    var premi = dati.premi || [];
    var h = "<div class=\\"premi\\">";
    for (var i = 0; i < premi.length; i++) {
      var g = premi[i];
      h += "<div class=\\"riga\\"><b style=\\"color:" + g.colore + "\\">" + sicuro(g.nome) + "</b>" +
        "<span>fila &times;" + g.fila + "</span><span>tre file &times;" + g.pieno + "</span></div>";
    }
    h += "<div class=\\"nota\\">Due file pagano " + (dati.dueFile || 2) + " volte le due file. " +
      "Tre file pagano il superbonus del grado piu' alto, e le figurine delle file si " +
      "sbloccano; se sono tutte e nove uguali, il superbonus vale " + (dati.tuttoUguale || 2) +
      " volte. " + (dati.seiUguali || 6) + " caselle con la stessa figurina, in qualsiasi " +
      "posto, la sbloccano anche senza file.</div>";
    h += "</div>";
    $("macchina-premi").innerHTML = h;
  }

  function caricaMacchinetta() {
    chiedi("GET", "/macchinetta").then(function (dati) {
      simboli = dati.simboli || [];
      if (dati.file && dati.perFila) forma = { file: dati.file, perFila: dati.perFila };
      $("macchina").hidden = !dati.accesa;
      $("macchina-spenta").hidden = dati.accesa;
      $("cassetto-premi").hidden = !dati.accesa;
      if (!dati.accesa) {
        $("macchina-spenta").textContent = dati.perche;
        return;
      }
      io.puntate = dati.puntate;
      // La puntata di ieri, se e' ancora una di quelle buone.
      if (!puntata) {
        var vecchia = 0;
        try { vecchia = Number(localStorage.getItem(CHIAVE_PUNTATA)) || 0; } catch (e) {}
        puntata = dati.puntate.indexOf(vecchia) >= 0 ? vecchia : dati.puntate[0];
      }
      disegnaPremi(dati);
      // ⚠ Un giro lasciato a meta' si ritrova: le stesse caselle, e il secondo
      // tiro gia' pagato. Le tenute scelte prima di cambiare scheda restano.
      if (dati.aperto) {
        var caselle = dati.aperto.caselle.map(function (c) { return c || unSimboloACaso(); });
        var tenute = giro && giro.caselle.length === caselle.length ? giro.tenute : {};
        giro = { puntata: dati.aperto.puntata, caselle: caselle, tenute: tenute };
        disegnaPuntate();
        disegnaCaselle(caselle, "");
        $("macchina-esito").innerHTML = "<b style=\\"color:var(--oro)\\">Il secondo tiro ti " +
          "aspetta:</b> tieni quelle che ti servono, e rigira.";
        return;
      }
      giro = null;
      disegnaPuntate();
      // A macchina ferma le caselle mostrano figurine a caso: una vetrina
      // spenta non fa venire voglia di tirare.
      disegnaCaselle(tutteACaso(), "");
      $("macchina-esito").textContent = "";
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /** Tenere una casella, o lasciarla: solo fra i due tiri. */
  function tieniLaCasella(dove) {
    if (!giro || macchinaGira || !giro.caselle[dove]) return;
    giro.tenute[dove] = !giro.tenute[dove];
    disegnaCaselle(giro.caselle, "");
  }

  /**
   * ⚠ **Le caselle si fermano a cascata, e in fretta.** Chiesto l'11 settembre
   * 2026: «la slot Fortuna facciamo l'animazione piu' rapida». Settanta
   * millisecondi a casella, meno di un secondo per tutte e nove — prima ne
   * servivano due e mezzo, e adesso i tiri per giro sono due. Quelle tenute non
   * si muovono proprio: se girassero, sembrerebbe che ti ridanno la stessa.
   *
   * Si fermano comunque una dopo l'altra: se si fermassero tutte insieme non ci
   * sarebbe il momento in cui due sono uguali e si aspetta la terza.
   */
  function fermaACascata(finali, ferme, poi) {
    var quante = finali.length;
    var scoperte = [];
    var libere = [];
    for (var i = 0; i < quante; i++) {
      if (ferme[i]) scoperte[i] = finali[i];
      else libere.push(i);
    }
    var disegna = function (classeFinale) {
      var h = "";
      for (var k = 0; k < quante; k++) {
        h += scoperte[k]
          ? casellaHtml(scoperte[k], classeFinale ? classeFinale(k) : "", k)
          : casellaHtml(unSimboloACaso(), "gira", k);
      }
      $("macchina-rulli").innerHTML = h;
    };
    var mescola = setInterval(function () { disegna(null); }, 70);
    if (!libere.length) { clearInterval(mescola); poi(disegna); return; }
    for (var j = 0; j < libere.length; j++) {
      (function (quale, ordine) {
        orologiMacchina.push(setTimeout(function () {
          scoperte[quale] = finali[quale];
          if (ordine === libere.length - 1) { clearInterval(mescola); poi(disegna); }
          else disegna(null);
        }, 160 + ordine * 70));
      })(libere[j], j);
    }
  }

  /** Il tasto grosso: il primo tiro se il giro non c'e', il secondo se c'e'. */
  function tiraLaMacchinetta() {
    if (macchinaGira || !simboli.length) return;
    if (giro) { rigiraLaMacchinetta(); return; }
    macchinaGira = true;
    $("tira").disabled = true;
    $("macchina-esito").textContent = "";
    $("macchina-rulli").classList.remove("pieno");
    fermaOrologiMacchina();
    // Mentre si aspetta il PC le caselle scorrono: qualcosa deve muoversi
    // subito, se no il primo tocco sembra non aver fatto niente.
    var mescola = setInterval(function () { disegnaCaselle(tutteACaso(), "gira"); }, 70);
    chiedi("POST", "/macchinetta", { puntata: puntata }).then(function (primo) {
      clearInterval(mescola);
      io.saldo = primo.saldo;
      disegnaSaldo(false);
      giro = { puntata: primo.puntata, caselle: primo.caselle, tenute: {} };
      fermaACascata(primo.caselle, {}, function (disegna) {
        disegna(null);
        macchinaGira = false;
        $("tira").disabled = false;
        disegnaPuntate();
        $("macchina-esito").innerHTML = "<b style=\\"color:var(--oro)\\">Secondo tiro:</b> " +
          "tocca le caselle da tenere, poi rigira.";
      });
    }).catch(function (e) {
      clearInterval(mescola);
      macchinaGira = false;
      $("tira").disabled = false;
      caricaMacchinetta();
      avviso(e.message, "male");
    });
  }

  /** Il secondo tiro: le tenute restano, le altre cambiano, e il PC decide. */
  function rigiraLaMacchinetta() {
    macchinaGira = true;
    $("tira").disabled = true;
    fermaOrologiMacchina();
    var tenute = [];
    var ferme = {};
    for (var k in giro.tenute) {
      if (giro.tenute[k]) { tenute.push(Number(k)); ferme[k] = true; }
    }
    chiedi("POST", "/macchinetta/rigira", { tenute: tenute }).then(function (esito) {
      io.saldo = esito.saldo;
      var vincenti = {};
      for (var f = 0; f < esito.file.length; f++) {
        var da = esito.file[f].riga * forma.perFila;
        for (var p = 0; p < forma.perFila; p++) vincenti[da + p] = true;
      }
      // Sei uguali: si accendono le loro caselle, dovunque siano.
      if (esito.seiUguali) {
        for (var q = 0; q < esito.caselle.length; q++) {
          if (esito.caselle[q] && esito.caselle[q].id === esito.seiUguali.id) vincenti[q] = true;
        }
      }
      fermaACascata(esito.caselle, ferme, function (disegna) {
        giro = null;
        disegna(function (i) { return vincenti[i] ? "vince" : ""; });
        disegnaSaldo(esito.vinto > 0);
        raccontaLaMacchinetta(esito);
      });
    }).catch(function (e) {
      macchinaGira = false;
      $("tira").disabled = false;
      caricaMacchinetta();
      avviso(e.message, "male");
    });
  }

  /** Come e' andata una figurina sbloccata, detto a voce. */
  function comeESbloccata(x) {
    var come = x.copia
      ? (x.copia.cresciuta && x.copia.prima ? "cresce a " + scalinoDi(x.copia.grado).nome
        : x.copia.prima ? "una copia in piu'" : "nuova, della casa")
      : x.nuova ? "e' tua" : "ce l'avevi: " + soldi(x.lire);
    return x.simbolo.titolo + ": " + come;
  }

  /** Cos'e' successo, detto come si direbbe a voce. E la scena che ci va dietro. */
  function raccontaLaMacchinetta(esito) {
    macchinaGira = false;
    $("tira").disabled = false;
    disegnaPuntate();

    if (esito.pieno) {
      var meglio = esito.file[0].simbolo;
      for (var m = 1; m < esito.file.length; m++) {
        if (scalinoDi(esito.file[m].simbolo.grado).fuoco > scalinoDi(meglio.grado).fuoco) {
          meglio = esito.file[m].simbolo;
        }
      }
      var s = scalinoDi(meglio.grado);
      $("macchina-rulli").classList.add("pieno");
      lampo(s.colore);
      scuoti();
      coriandoli(esito.tuttoUguale ? 160 : 100, [s.colore, "#ffd166", "#ffffff"]);
      numeroVolante("+" + soldi(esito.vinto), "#ffd166");
      var detto = esito.sbloccate.map(function (x) {
        var come = x.copia
          ? (x.copia.cresciuta && x.copia.prima ? "cresce a " + scalinoDi(x.copia.grado).nome
            : x.copia.prima ? "una copia in piu'" : "nuova, della casa")
          : x.nuova ? "e' tua" : "ce l'avevi: " + soldi(x.lire);
        return x.simbolo.titolo + " \u2014 " + come;
      });
      $("macchina-esito").innerHTML = (esito.tuttoUguale ? "TUTTO UGUALE" : "TRE FILE") +
        " \u00b7 " + soldi(esito.vinto);
      grande(esito.tuttoUguale ? "Tutto uguale" : "Tre file", "Sbloccate", detto.join("\\n"),
        s.colore);
      return;
    }

    /**
     * ⚠ **Sei uguali, dovunque**: la figurina si sblocca anche senza file.
     * Chiesto l'11 settembre 2026 sera. Le file che ci sono pagano lo stesso, e
     * sono gia' dentro «vinto».
     */
    if (esito.seiUguali) {
      var s6 = scalinoDi(esito.seiUguali.grado);
      $("macchina-rulli").classList.add("pieno");
      lampo(s6.colore);
      scuoti();
      coriandoli(120, [s6.colore, "#ffd166", "#ffffff"]);
      if (esito.vinto > 0) numeroVolante("+" + soldi(esito.vinto), "#ffd166");
      $("macchina-esito").innerHTML = "SEI UGUALI &middot; " + sicuro(esito.seiUguali.titolo) +
        (esito.vinto > 0 ? " &middot; " + soldi(esito.vinto) : "");
      grande("Sei uguali", "Sbloccata", esito.sbloccate.map(comeESbloccata).join("\\n"),
        s6.colore);
      return;
    }

    if (esito.file.length) {
      var migliore = esito.file[0];
      for (var i = 1; i < esito.file.length; i++) {
        if (esito.file[i].lire > migliore.lire) migliore = esito.file[i];
      }
      var s2 = scalinoDi(migliore.simbolo.grado);
      lampo(s2.colore);
      numeroVolante("+" + soldi(esito.vinto), s2.colore);
      $("macchina-esito").innerHTML =
        (esito.file.length > 1 ? "DUE FILE, IL DOPPIO" : "UNA FILA") + " \u00b7 " +
        soldi(esito.vinto) + " \u00b7 " + sicuro(migliore.simbolo.titolo);
      return;
    }

    $("macchina-esito").innerHTML =
      "<span style=\\"color:var(--spento)\\">Niente, stavolta. Il prossimo giro si paga.</span>";
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
              "<td>" + soldi(r.saldo) + "</td></tr>";
          }).join("")
        : "<tr><td colspan=\\"4\\" class=\\"niente\\">Non ha ancora giocato nessuno.</td></tr>";
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
  /**
   * ⚠ **I tasti si fermano al tetto.** Chiesto il 10 settembre 2026: «tutti
   * quelli che ci sono fino ad ora mettiamoli da basic a unique; da celestial
   * a ethernal ci penseremo noi nel tempo».
   *
   * L'elenco dei gradi resta intero — serve ai rulli, che li usano tutti e
   * dodici — e qui si taglia solo **fin dove si puo' scegliere**. Il tetto lo
   * dice il PC («tettoFigurine»), non questa pagina: la scala e' una regola del
   * gioco, e le regole non stanno in due posti.
   */
  function finDoveSiSceglie() {
    var tetto = io && io.tettoFigurine ? io.tettoFigurine : "";
    if (!tetto) return io.gradi;
    for (var i = 0; i < io.gradi.length; i++) {
      if (io.gradi[i].id === tetto) return io.gradi.slice(0, i + 1);
    }
    return io.gradi;
  }

  function tastiGradi(id, uso) {
    var quale = uso || "prezzo";
    var scelta = finDoveSiSceglie();
    var h = "<div class=\\"gradi-scelta\\" data-gradi=\\"" + id + "\\">";
    for (var i = 0; i < scelta.length; i++) {
      var g = scelta[i];
      var scelto = gradoScelto[id] === g.id;
      h += "<button data-grado=\\"" + g.id + "\\" data-per=\\"" + id + "\\"" +
        " data-uso=\\"" + quale + "\\"" +
        " style=\\"color:" + g.colore + (scelto ? "; background:" + g.colore : "") + "\\"" +
        (scelto ? " class=\\"scelto\\"" : "") + ">" + sicuro(g.nome) + "</button>";
    }
    h += "</div>";
    return h;
  }

  /**
   * ⚠ **I tagli: si sceglie quanto con un tocco, non scrivendo un numero.**
   *
   * Chiesto il 10 settembre 2026: «il bonus in lire devono essere pulsanti da 2
   * a 500, oppure personalizzato». Sono i tagli delle banconote, e non e' un
   * vezzo: davanti a otto numeri conosciuti si decide in un secondo, davanti a
   * una casella vuota ci si mette a pensare quanto vale un'idea — e finisce che
   * non si decide. La casella per il numero preciso resta accanto.
   *
   * «quale» dice a cosa serve la fila: «bonus» in fila, «regalo» per la gente.
   * L'attributo «data-taglio» e' lo stesso, cosi' il tasto e' uno solo.
   */
  function tastiTaglio(quale, id) {
    /**
     * ⚠ **Due scale, e non e' una svista.** I regali sono euro contati in
     * lire (il piu' piccolo e' 3.873); il bonus e' in lire piccole, perche' e'
     * quello che decide il grado e la scala dei gradi arriva a 1.400. Con i
     * tagli dei regali sul bonus ci sarebbe un tasto solo, e vorrebbe dire
     * «massimo». Vedi TAGLI e TAGLI_BONUS nel banco.
     */
    var tagli = (quale === "bonus"
      ? (io && io.tagliBonus)
      : (io && io.tagli)) || [2, 5, 10, 20, 50, 100, 200, 500];
    var h = "<div class=\\"tagli\\" data-tagli=\\"" + quale + ":" + id + "\\">";
    for (var i = 0; i < tagli.length; i++) {
      h += "<button data-taglio=\\"" + tagli[i] + "\\" data-quale=\\"" + quale +
        "\\" data-per=\\"" + id + "\\">" + soldi(tagli[i]) + "</button>";
    }
    h += "</div>";
    return h;
  }

  /** Quello che si sta per dare: quanto si e' fatto salire, o il numero scritto. */
  function quantoScelto(quale, id) {
    var casella = document.querySelector("[data-" + quale + "=\\"" + id + "\\"]");
    var scritto = casella && casella.value ? Math.round(Number(casella.value)) : 0;
    if (scritto > 0) return scritto;
    return tagliScelti[quale + ":" + id] || 0;
  }

  /** Quanto si e' messo insieme, per ogni casella. Si azzera appena si e' deciso. */
  var tagliScelti = {};

  /**
   * @ATT **I tagli si sommano: piu' li premi, piu' sale.**
   *
   * Chiesto il 10 settembre 2026: «i pulsanti delle lire facciamo che si usano
   * che piu' li premi piu' sale il valore, cosi' premo piu' volte le
   * combinazioni e faccio il lavoro».
   *
   * Prima uno escludeva l'altro: per dare centocinquanta euro bisognava
   * scriverlo a mano, cioe' tornare esattamente alla casella vuota che i tasti
   * dovevano togliere di mezzo. Adesso si batte sui tasti come su una cassa: 100
   * + 20 + 20 + 10. Per tornare indietro c'e' «azzera».
   */
  function segnaTaglio(quale, id, quanto) {
    var chiave = quale + ":" + id;
    tagliScelti[chiave] = (tagliScelti[chiave] || 0) + quanto;
    var casella = document.querySelector("[data-" + quale + "=\\"" + id + "\\"]");
    if (casella) casella.value = "";
    mostraQuanto(quale, id);
  }

  function azzeraTaglio(quale, id) {
    tagliScelti[quale + ":" + id] = 0;
    var casella = document.querySelector("[data-" + quale + "=\\"" + id + "\\"]");
    if (casella) casella.value = "";
    mostraQuanto(quale, id);
  }

  /** Scrive dove si vede quanto si e' messo insieme finora. */
  function mostraQuanto(quale, id) {
    var quanto = quantoScelto(quale, id);
    var conto = document.querySelector("[data-conta=\\"" + quale + ":" + id + "\\"]");
    if (conto) conto.textContent = quanto ? soldi(quanto) : "niente";
    if (quale === "bonus") aggiornaTotale(id);
  }

  /**
   * Il totale sotto una riga della fila: i pezzi piu' il bonus messo insieme.
   *
   * @ATT **E accanto il grado che ne viene.** Chiesto il 10 settembre 2026:
   * «decidiamo anche il grado che avra' questo collezionabile». Il grado non e'
   * un campo a parte — si legge dal prezzo (vedi «gradoDiPrezzo» sul PC) — e
   * scriverlo qui vuol dire che si vede **mentre** si preme, non dopo. I tasti
   * dei gradi accanto fanno la strada contraria: scelgo il grado, e il bonus si
   * mette da solo al minimo che ci arriva.
   */
  function aggiornaTotale(id) {
    var totale = document.querySelector("[data-totale=\\"" + id + "\\"]");
    if (!totale) return;
    var base = Number(totale.getAttribute("data-base")) || 0;
    var quanto = base + quantoScelto("bonus", id);
    totale.textContent = soldi(quanto);
    var g = gradoDiPrezzo(quanto);
    var eti = document.querySelector("[data-gradofa=\\"" + id + "\\"]");
    if (eti) {
      eti.textContent = g.nome;
      eti.style.color = g.colore;
    }
    var fila = document.querySelector("[data-gradi=\\"" + id + "\\"]");
    if (fila) {
      var t = fila.querySelectorAll("button");
      for (var i = 0; i < t.length; i++) {
        t[i].classList.toggle("scelto", t[i].getAttribute("data-grado") === g.id);
      }
    }
  }

  /** Il grado che viene da un prezzo. La stessa scala del PC, letta al contrario. */
  /**
   * Il grado che viene da un prezzo — **tenuto sotto al tetto**.
   *
   * Il taglio serve qui e non solo sui tasti: il bonus si puo' anche scrivere
   * a mano in una casella, e senza questo un numero grosso scritto a dito
   * avrebbe fatto leggere «Celestial» accanto a una figurina che poi il PC
   * salva come Unique. Due schermate che dicono due cose e' sempre la stessa
   * malattia: la stessa regola scritta in due posti.
   */
  function gradoDiPrezzo(prezzo) {
    var g = finDoveSiSceglie();
    var trovato = g.length ? g[0] : { id: "basic", nome: "Basic", colore: "#9aa0b5" };
    for (var i = 0; i < g.length; i++) if (prezzo >= g[i].da) trovato = g[i];
    return trovato;
  }

  /** Sceglie il grado: il bonus si mette al minimo che ci arriva. */
  function puntaAlGrado(id, grado) {
    var totale = document.querySelector("[data-totale=\\"" + id + "\\"]");
    var base = totale ? Number(totale.getAttribute("data-base")) || 0 : 0;
    var g = io.gradi.filter(function (x) { return x.id === grado; })[0];
    if (!g) return;
    tagliScelti["bonus:" + id] = Math.max(0, g.da - base);
    var casella = document.querySelector("[data-bonus=\\"" + id + "\\"]");
    if (casella) casella.value = "";
    mostraQuanto("bonus", id);
  }

  /**
   * **Provala davvero**: la generazione parte, e quello che ne esce torna qui.
   *
   * ⚠ Chiesto il 10 settembre 2026: «quando arriva un prompt da controllare
   * agli admin ci vogliono dei pulsanti per mandare quel prompt a generare», e
   * poi, la sera stessa: «quando pronto lo deve vedere gia' allegato alla card
   * in modo da controllarlo; puo' rigenerare, max 4 file, e alla fine puo'
   * selezionare uno o piu' elementi generati da includere nel pacchetto».
   *
   * Prima il tasto partiva **una volta sola** e finiva li': l'avviso diceva
   * «la trovi in galleria», e per guardarla bisognava aprire la galleria,
   * cercarla, tornare qui e riattaccarla a mano. Due finestre per vedere una
   * cosa nata da questo tasto.
   *
   * Con che modelli lo decide il computer, non questa pagina: sessanta secondi
   * strumentali per la musica, un 4:3 per le immagini.
   */
  function proveHtml(c) {
    var musica = c.tavolo !== "immagini";
    var prove = c.prove || [];
    var nate = [];
    var inCorso = 0;
    for (var i = 0; i < prove.length; i++) {
      var u = prove[i].usciti || [];
      if (u.length) { for (var k = 0; k < u.length; k++) nate.push(u[k]); }
      else inCorso += 1;
    }

    var h = "";
    if (nate.length) {
      h += "<div class=\\"nate\\">";
      for (var n = 0; n < nate.length; n++) {
        var v = nate[n];
        var tenuta = tenute[c.id] && tenute[c.id][v.url];
        var suona = siAscolta(v.mime);
        var faccia = v.anteprima || (String(v.mime || "").indexOf("image/") === 0 ? v.url : "");
        h += "<div class=\\"nata" + (tenuta ? " tenuta" : "") + (suona ? " suona" : "") + "\\"" +
          " data-guarda=\\"" + sicuro(v.url) + "\\" data-guarda-mime=\\"" + sicuro(v.mime) +
          "\\" data-guarda-nome=\\"" + sicuro(v.titolo || "") + "\\">";
        /**
         * ⚠ **Una clip appena nata si deve poter sentire.** Detto il 12
         * settembre 2026: «le canzoni non si sentono». Qui il lettore stava
         * schiacciato a centodieci pixel — meta' comandi tagliati, il tasto
         * play fuori dalla casella. Adesso e' la riga larga di «branoHtml», e
         * la copertina che la libreria ha gia' fatto le sta accanto.
         */
        if (suona) h += branoHtml(v.url, v.titolo || "", faccia);
        else if (faccia) h += "<img src=\\"" + sicuro(faccia) + "\\" alt=\\"\\" loading=\\"lazy\\">";
        else h += "<span class=\\"senza\\">" + sicuro(v.mime || "un file") + "</span>";
        h += "<button class=\\"btn piano tienila\\" data-nata=\\"" + c.id + "\\"" +
          " data-url=\\"" + sicuro(v.url) + "\\" data-mime=\\"" + sicuro(v.mime) + "\\"" +
          " data-vid=\\"" + sicuro(v.id) + "\\">" +
          (tenuta ? "la tieni" : "tienila") + "</button>";
        h += "</div>";
      }
      h += "</div>";
    }

    /**
     * ⚠ **«Sto generando» va detto**, e non e' un dettaglio.
     *
     * Una clip di sessanta secondi ci mette minuti. Senza questa riga la card
     * resta identica a com'era prima di premere, e la reazione naturale e'
     * premere di nuovo: si finisce con tre generazioni uguali in coda davanti a
     * chi sta aspettando davvero.
     */
    if (inCorso) {
      h += "<div class=\\"conto attesa\\">Sto generando" +
        (inCorso > 1 ? " (" + inCorso + " in corso)" : "…") +
        " · appena e' pronta compare qui</div>";
    }

    var quante = prove.length;
    var tetto = io && io.maxProve ? io.maxProve : 4;
    var pieno = quante >= tetto;
    h += "<div class=\\"riga-tasti\\">" +
      "<button class=\\"btn piano\\" data-prova=\\"" + c.id + "\\"" + (pieno ? " disabled" : "") + ">" +
      (pieno ? "Gia' provata " + tetto + " volte: scegli fra quelle"
        : quante === 0
          ? (musica ? "Sentila (clip di 60 secondi)" : "Guardala (immagine 4:3)")
          : "Fanne un'altra (" + (quante + 1) + " di " + tetto + ")") +
      "</button></div>";
    return h;
  }

  /**
   * Cosa si attacca **a mano**, dalla galleria della suite: fino a quattro.
   *
   * ⚠ Chiesto il 10 settembre 2026: «lascia comunque la possibilita' di
   * allegare, oltre a quelle 4 generate, ulteriori max 4 file dalla suite —
   * magari da quei prompt nascono cose particolari».
   *
   * E' l'altra strada, e sta accanto a quella delle generate: quattro nate da
   * questo prompt (il tasto «provala») e quattro scelte con il dito. Prima era una
   * sola, e sceglierne un'altra buttava via la prima.
   */
  function attaccoHtml(idCosa) {
    var c = { id: idCosa };
    var scelte = attaccati[c.id] || [];
    var cop = copertine[c.id];
    var tetto = 4;
    var pieno = scelte.length >= tetto;
    var h = "<div class=\\"riga-tasti\\">" +
      "<button class=\\"btn piano\\" data-attacca=\\"" + c.id + "\\"" +
      (pieno ? " disabled" : "") + ">" +
      (pieno ? "Quattro dalla suite, e' il massimo"
        : scelte.length
          ? "Attaccane un'altra (" + (scelte.length + 1) + " di " + tetto + ")"
          : "Attacca dalla suite") + "</button>";
    /**
     * ⚠ **Un brano si vede solo se ha una copertina.** Chiesto il 10
     * settembre 2026: «se si carica una canzone viene caricata anche l'immagine
     * della canzone». Se la libreria ne ha gia' una si prende da sola; se no,
     * questo tasto serve a sceglierne una a mano.
     *
     * Vale per la **prima**: e' quella che si vede nello shop, e le altre
     * stanno dietro alla sua faccia.
     */
    var prima = scelte[0];
    if (prima && String(prima.mime || "").indexOf("image/") !== 0) {
      h += "<button class=\\"btn piano\\" data-copertina=\\"" + c.id + "\\">" +
        (cop ? "Cambia copertina" : "Metti una copertina") + "</button>";
    }
    h += "</div>";
    if (scelte.length) {
      h += "<div class=\\"nate\\">";
      for (var i = 0; i < scelte.length; i++) {
        var a = scelte[i];
        var faccia = (i === 0 && cop) ? (cop.anteprima || cop.url)
          : (a.anteprima || (String(a.mime || "").indexOf("image/") === 0 ? a.url : ""));
        var ascolta = siAscolta(a.mime);
        h += "<div class=\\"nata tenuta" + (ascolta ? " suona" : "") + "\\"" +
          " data-guarda=\\"" + sicuro(a.url) + "\\" data-guarda-mime=\\"" + sicuro(a.mime) +
          "\\" data-guarda-nome=\\"" + sicuro(a.titolo || "") + "\\">" +
          // Anche qui: un brano attaccato a mano si prova ascoltandolo, non
          // guardando la sua copertina in un quadratino.
          (ascolta
            ? branoHtml(a.url, a.titolo || "", faccia)
            : (faccia ? "<img src=\\"" + sicuro(faccia) + "\\" alt=\\"\\" loading=\\"lazy\\">"
                      : "<span class=\\"senza\\">senza copertina</span>") +
              "<small>" + sicuro(a.titolo) + "</small>") +
          "<button class=\\"btn piano tienila\\" data-stacca=\\"" + c.id + "\\"" +
          " data-url=\\"" + sicuro(a.url) + "\\">Togli</button></div>";
      }
      h += "</div>";
    }
    return h;
  }

  function provala(id, tasto) {
    tasto.disabled = true;
    tasto.textContent = "la mando…";
    chiedi("POST", "/prova", { id: id }).then(function () {
      // Non si dice piu' «la trovi in galleria»: torna qui da sola, ed e' il
      // punto di tutta la faccenda.
      avviso("E' in coda. Appena e' pronta compare qui sotto.", "bene");
      // ⚠ Solo il riquadro delle prove, non tutta la card: accanto c'e' un
      // bonus scritto a mano, e rifare la card lo cancellerebbe. Vale qui come
      // nell'attesa — e' lo stesso gesto, fatto una volta subito.
      riguardaLeProve();
    }).catch(function (e) {
      tasto.disabled = false;
      avviso(e.message, "male");
      riguardaLeProve();
    });
  }

  /**
   * ⚠ **Aspettare che sia pronta, senza rifare la schermata.**
   *
   * Una generazione ci mette minuti e nessuno viene ad avvisare questa pagina:
   * si richiede la fila ogni tanto finche' c'e' qualcosa in forno.
   *
   * Si aggiorna **solo il riquadro delle prove**, non tutta la card, e il
   * motivo e' concreto: chi comanda intanto sta scrivendo un bonus a mano in
   * una casella, e ridisegnare la card glielo cancellerebbe sotto le dita.
   * Un aggiornamento che ti fa perdere quello che stavi facendo e' peggio di
   * un tasto «aggiorna».
   */
  var attesaFrutti = null;

  /**
   * Ridisegna **solo** il riquadro degli attacchi di una cosa in fila.
   *
   * Non serve chiedere niente al PC: quello che si e' scelto di attaccare vive
   * qui dentro finche' non si preme «prendila». Un giro di rete per ridisegnare
   * una cosa che sai gia' e' un giro di rete sprecato.
   */
  function riguardaGliAttacchi(id) {
    var dove = document.querySelector("[data-attacchi=\\"" + id + "\\"]");
    if (dove) dove.innerHTML = attaccoHtml(id);
  }

  /** Ridisegna **solo** i riquadri delle prove, e rimette la sveglia. */
  function riguardaLeProve() {
    chiedi("GET", "/fila").then(function (dati) {
      for (var i = 0; i < dati.inAttesa.length; i++) {
        var c = dati.inAttesa[i];
        var dove = document.querySelector("[data-prove=\\"" + c.id + "\\"]");
        if (dove) dove.innerHTML = proveHtml(c);
      }
      forseRiguarda(dati.inAttesa);
    }).catch(function () { /* la rete va e viene: si riprova al giro dopo */ });
  }

  function forseRiguarda(inAttesa) {
    if (attesaFrutti) { clearTimeout(attesaFrutti); attesaFrutti = null; }
    var qualcosaInForno = false;
    for (var i = 0; i < inAttesa.length; i++) {
      var prove = inAttesa[i].prove || [];
      for (var k = 0; k < prove.length; k++) {
        if (!prove[k].usciti || !prove[k].usciti.length) qualcosaInForno = true;
      }
    }
    if (!qualcosaInForno) return;
    attesaFrutti = setTimeout(function () {
      attesaFrutti = null;
      // Se intanto si e' cambiata scheda non si chiede niente: la fila e' di
      // chi comanda, e chi comanda adesso sta guardando altro.
      var fila = $("p-fila");
      if (!fila || !fila.classList.contains("viva")) return;
      riguardaLeProve();
    }, 8000);
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
            var quanto = c.base + quantoScelto("bonus", c.id);
            var g = gradoDiPrezzo(quanto);
            var tasti =
              // Provarla davvero prima di darle un prezzo: parte una
              // generazione coi modelli decisi per quel mestiere. Il riquadro
              // ha la sua targa perche' si aggiorna da solo quando la
              // generazione e' pronta, senza rifare tutta la card.
              "<div class=\\"prove\\" data-prove=\\"" + c.id + "\\">" + proveHtml(c) + "</div>" +
              // Anche gli attacchi hanno la loro targa, per lo stesso motivo:
              // togliere una cosa attaccata non deve cancellare il bonus che
              // si sta scrivendo nella casella qui sotto.
              "<div class=\\"attacchi\\" data-attacchi=\\"" + c.id + "\\">" +
              attaccoHtml(c.id) + "</div>" +
              "<div class=\\"conto\\">I pezzi valgono <b>" + soldi(c.base) + "</b>" +
              " · col bonus fa <b data-totale=\\"" + c.id + "\\" data-base=\\"" +
              c.base + "\\">" + soldi(quanto) + "</b>" +
              " · sara' <b data-gradofa=\\"" + c.id + "\\" style=\\"color:" + g.colore +
              "\\">" + sicuro(g.nome) + "</b></div>" +
              tastiTaglio("bonus", c.id) +
              "<div class=\\"riga-tasti\\">" +
              "<input type=\\"number\\" min=\\"0\\" placeholder=\\"o scrivi quanto\\" " +
              "data-bonus=\\"" + c.id + "\\">" +
              "<button class=\\"btn piano\\" data-azzera=\\"bonus:" + c.id + "\\">Azzera</button>" +
              "</div>" +
              // La strada contraria: scelgo il grado, il bonus ci arriva da se'.
              tastiGradi(c.id, "prezzo") +
              "<div class=\\"riga-tasti\\">" +
              "<button class=\\"btn oro\\" data-prendi=\\"" + c.id + "\\">Prendila</button>" +
              "<button class=\\"btn piano\\" data-butta=\\"" + c.id + "\\">Buttala</button>" +
              "</div>";
            return figurinaHtml(c, { tasti: tasti });
          }).join("")
        : "<div class=\\"niente\\">Niente da controllare. Buon segno o cattivo, dipende.</div>";

      // Se c'e' qualcosa in forno, si torna a guardare fra un po'.
      forseRiguarda(dati.inAttesa);

      // Le prese: tante, e non c'e' niente da decidere finche' non le si mette
      // in vetrina. Un cassetto, come le buttate. Chiesto il 10 settembre 2026:
      // «mettiamo anche quelle prese che le possiamo nascondere, cosi' quando
      // saranno tante non daranno fastidio».
      $("cassetto-prese").hidden = dati.decise.length === 0;
      $("quante-prese").textContent = dati.decise.length ? String(dati.decise.length) : "";
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
              : tastiGradi(c.id, "vetrina") +
                "<div class=\\"riga-tasti\\">" +
                "<input type=\\"number\\" min=\\"1\\" placeholder=\\"prezzo, o lascia stare\\" " +
                "data-vprezzo=\\"" + c.id + "\\">" +
                "<button class=\\"btn oro\\" data-vetrina=\\"" + c.id +
                "\\">Mettila in vetrina</button></div>";
            return figurinaHtml(c, { tasti: tasti });
          }).join("")
        : "<div class=\\"niente\\">Ancora niente.</div>";

      // Le buttate: in un cassetto chiuso, che compare solo se ce n'e'.
      var persi = dati.buttate || [];
      $("cassetto-buttate").hidden = persi.length === 0;
      $("quanti-buttate").textContent = persi.length ? String(persi.length) : "";
      $("fila-buttate").innerHTML = persi.map(function (c) { return figurinaHtml(c); }).join("");
    }).catch(function (e) { avviso(e.message, "male"); });
    caricaGente();
  }

  /* ------------------------------------------------------------- i regali */

  /**
   * ⚠ **Chi c'e', e quanto gli mando.**
   *
   * Chiesto il 10 settembre 2026: «l'admin deve poter inviare lire agli utenti».
   * E' l'unico rubinetto delle lire oltre alle combinazioni prese — girando la
   * slot escono punti, non lire — quindi sta in mano a una persona sola e ha un
   * perche' scritto accanto: un saldo che cambia da solo sembra un guasto.
   */
  /** Tutta la gente, come e' arrivata. Il cerca lavora su questa. */
  var gente = [];
  var cercaGente = "";

  function caricaGente() {
    if (!io.admin) return;
    chiedi("GET", "/gente").then(function (dati) {
      gente = dati.gente || [];
      // Quanti sono, sul cassetto chiuso: si sa se aprirlo prima di aprirlo.
      var quanti = $("quanta-gente");
      if (quanti) quanti.textContent = gente.length ? String(gente.length) : "";
      disegnaGente();
    }).catch(function (e) { avviso(e.message, "male"); });
  }

  /**
   * ⚠ **Il cerca.** Chiesto il 10 settembre 2026 insieme al pannello: «va
   * aggiustato il valore e aggiunto un cerca».
   *
   * In casa ci sono poche persone adesso, ma ognuna si porta dietro otto tasti
   * e una casella: a dieci persone quella scheda e' lunga tre schermate, e
   * trovare la zia vuol dire scorrere. Si filtra qui e non sul PC — sono
   * pochissimi nomi, gia' arrivati, e un giro di rete per ogni lettera scritta
   * sarebbe uno spreco.
   */
  function disegnaGente() {
    var cerca = cercaGente.trim().toLowerCase();
    var quali = cerca
      ? gente.filter(function (g) { return g.nome.toLowerCase().indexOf(cerca) >= 0; })
      : gente;
    $("gente").innerHTML = quali.length
      ? quali.map(function (g) {
          var messe = quantoScelto("regalo", g.chi);
          return "<div class=\\"persona\\">" +
            "<div class=\\"testa\\"><b>" + sicuro(g.nome) + "</b>" +
            "<small>" + (g.io ? "sei tu · " : "") +
            (g.mai ? "non ha mai aperto la sala giochi"
              : "ha " + soldi(g.saldo) +
                (g.regali ? " · regalate " + soldi(g.regali) : "")) + "</small></div>" +
            tastiTaglio("regalo", g.chi) +
            "<div class=\\"riga-tasti\\">" +
            "<span class=\\"conto\\">stai mandando <b data-conta=\\"regalo:" + sicuro(g.chi) +
            "\\">" + (messe ? soldi(messe) : "niente") + "</b></span>" +
            "<button class=\\"btn piano\\" data-azzera=\\"regalo:" + sicuro(g.chi) +
            "\\">Azzera</button></div>" +
            "<div class=\\"riga-tasti\\">" +
            "<input type=\\"number\\" min=\\"1\\" placeholder=\\"o scrivi quanto\\" " +
            "data-regalo=\\"" + sicuro(g.chi) + "\\">" +
            "<button class=\\"btn oro\\" data-manda-lire=\\"" + sicuro(g.chi) +
            "\\">Manda</button></div>" +
            /**
             * ⚠ **E il tasto che svuota**, chiesto l'11 settembre 2026: «un
             * admin puo' anche azzerare il portafoglio degli altri, caso mai
             * problemi: fai un bel tastino per resettare il portafoglio».
             *
             * Compare **solo se c'e' qualcosa da svuotare**: un tasto rosso
             * accanto a un portafoglio gia' vuoto e' un tasto che si preme per
             * scoprire che non fa niente.
             */
            (g.saldo > 0
              ? "<div class=\\"riga-tasti\\">" +
                "<button class=\\"btn brutto\\" data-svuota=\\"" + sicuro(g.chi) +
                "\\">Azzera il portafoglio</button></div>"
              : "") +
            "</div>";
        }).join("")
      : "<div class=\\"niente\\">" +
        (cerca ? "Nessuno si chiama cosi'." : "Non c'e' ancora nessuno.") + "</div>";
  }

  function mandaLire(chi) {
    var quanto = quantoScelto("regalo", chi);
    if (quanto < 1) { avviso("Quanto? Batti sui tagli, o scrivilo.", "male"); return; }
    var nome = "";
    for (var i = 0; i < gente.length; i++) if (gente[i].chi === chi) nome = gente[i].nome;
    chiediQualcosa("Mandi " + soldi(quanto) + " a " + nome,
      "Due parole a chi le riceve: le legge appena apre la sala giochi.",
      { valore: "Bravo.", tastoSi: "Manda" }).then(function (perche) {
        if (perche === null) return;
        chiedi("POST", "/regala", { chi: chi, quanto: quanto, perche: perche })
          .then(function (r) {
            tagliScelti["regalo:" + chi] = 0;
            avviso(soldi(quanto) + " a " + r.nome + ". Adesso ha " + soldi(r.saldo) + ".", "bene");
            coriandoli(40, ["#ffd166", "#ffffff"]);
            caricaGente();
          }).catch(function (e) { avviso(e.message, "male"); });
      });
  }

  /**
   * ⚠ **Svuotare il portafoglio di qualcuno.**
   *
   * Si chiede il perche' **prima**, come per i regali, e per lo stesso motivo:
   * chi lo riceve legge quella frase appena apre la sala giochi, e un
   * portafoglio che si azzera senza spiegazioni si legge come un guasto.
   *
   * ⚠ **Il quanto non si chiede.** Azzera vuol dire azzera: se si potesse
   * scegliere quanto togliere sarebbe una multa, che e' un'altra cosa e non c'e'.
   * Nella domanda c'e' scritto quanto va via, cosi' quello che si sta per fare si
   * legge prima di premere.
   */
  function svuotaPortafoglio(chi) {
    var nome = "";
    var quanto = 0;
    for (var i = 0; i < gente.length; i++) {
      if (gente[i].chi === chi) { nome = gente[i].nome; quanto = gente[i].saldo; }
    }
    chiediQualcosa("Azzeri il portafoglio di " + nome + "?",
      "Via " + soldi(quanto) + ". La collezione, i livelli e le cose prese non si toccano. " +
      "Due parole a chi lo riceve: le legge appena apre la sala giochi.",
      { valore: "Si ricomincia da zero.", tastoSi: "Azzera" }).then(function (perche) {
        if (perche === null) return;
        chiedi("POST", "/azzera", { chi: chi, perche: perche })
          .then(function (r) {
            avviso("Portafoglio di " + r.nome + " azzerato: via " + r.toltoScritto + ".", "bene");
            caricaGente();
          }).catch(function (e) { avviso(e.message, "male"); });
      });
  }

  /* --------------------------------------------------- attaccare dalla suite */

  /**
   * Quello che si e' scelto di attaccare **dalla galleria**, per ogni cosa in
   * fila: un elenco, fino a quattro. Era uno solo fino al 10 settembre 2026.
   */
  var attaccati = {};
  /**
   * Quali delle cose **generate** si tengono, per ogni cosa in fila.
   *
   * ⚠ Chiesto il 10 settembre 2026: «alla fine puo' selezionare uno o piu'
   * elementi generati da includere nel pacchetto». Sta qui e non nel PC perche'
   * e' una scelta a meta': finche' non si preme «prendila» non e' successo
   * niente, e una spunta tolta non deve essere un giro di rete.
   *
   * Dentro, per ogni combinazione, gli indirizzi tenuti, ognuno con il suo tipo.
   * Un oggetto e non una lista perche' la domanda che si fa mille volte
   * disegnando e' «questa e' tenuta?», non «quante sono».
   */
  var tenute = {};
  /** Le copertine scelte a mano, per quelle in fila. */
  var copertine = {};
  /** A chi sta attaccando quello che si tocca nella galleria, e come. */
  var attaccaA = "";
  var attaccaCome = "allegato";

  /**
   * ⚠ **La galleria divisa per che cosa sono.**
   *
   * Chiesto il 12 settembre 2026: «ancora non sono divise bene quando voglio
   * aggiungere dalla suite».
   *
   * Erano sessanta quadratini in ordine di data, foto e brani e video
   * mescolati: per trovare la canzone appena generata bisognava riconoscerne la
   * copertina in mezzo a quaranta immagini, e le copertine dei brani **sono**
   * immagini. Adesso i mucchi sono quattro, si sceglie quale prima, e dentro
   * ogni mucchio c'e' un titoletto che resta appiccicato in cima.
   *
   * ⚠ **Il tipo si legge dal mime, non da un campo.** La libreria della suite
   * manda «audio/mpeg» o «image/png»: la prima parola dice gia' tutto, e un
   * secondo campo «tipo» accanto sarebbe la stessa cosa scritta in due posti.
   */
  var MUCCHI = [
    { id: "tutto", nome: "TUTTO", che: null },
    { id: "image", nome: "IMMAGINI", che: "image/" },
    { id: "audio", nome: "BRANI", che: "audio/" },
    { id: "video", nome: "VIDEO", che: "video/" },
    { id: "altro", nome: "ALTRO", che: "altro" },
  ];
  /** Il mucchio aperto e le parole cercate: restano fra un'apertura e l'altra. */
  var mucchio = "tutto";
  var cercaLibreria = "";
  /** Quello che c'e' in galleria, come e' arrivato. I filtri lavorano su questa. */
  var inLibreria = [];

  function mucchioDi(v) {
    var m = String(v.mime || "");
    if (m.indexOf("image/") === 0) return "image";
    if (m.indexOf("audio/") === 0) return "audio";
    if (m.indexOf("video/") === 0) return "video";
    return "altro";
  }

  function disegnaMucchi() {
    var dentro = "";
    for (var i = 0; i < MUCCHI.length; i++) {
      var m = MUCCHI[i];
      // ⚠ Un mucchio vuoto non si mostra: un tasto che apre il niente e' un
      // tasto che si impara a non premere. «Tutto» c'e' sempre.
      var quanti = m.id === "tutto"
        ? inLibreria.length
        : inLibreria.filter(function (v) { return mucchioDi(v) === m.id; }).length;
      if (!quanti && m.id !== "tutto") continue;
      dentro += "<button data-mucchio=\\"" + m.id + "\\"" +
        (m.id === mucchio ? " class=\\"scelto\\"" : "") + ">" +
        sicuro(m.nome) + " " + quanti + "</button>";
    }
    $("libreria-tipi").innerHTML = dentro;
  }

  function voceHtml(v) {
    var foto = v.anteprima || (String(v.mime || "").indexOf("image/") === 0 ? v.url : "");
    return "<button class=\\"voce\\" data-voce=\\"" + sicuro(v.id) + "\\" " +
      "data-url=\\"" + sicuro(v.url) + "\\" data-mime=\\"" + sicuro(v.mime) + "\\" " +
      "data-titolo=\\"" + sicuro(v.titolo) + "\\" data-anteprima=\\"" + sicuro(foto) + "\\">" +
      (foto ? "<img src=\\"" + sicuro(foto) + "\\" alt=\\"\\" loading=\\"lazy\\">"
            : "<span class=\\"senza\\">" + sicuro(v.mime) + "</span>") +
      "<small>" + sicuro(v.titolo) + "</small></button>";
  }

  function disegnaLibreria() {
    disegnaMucchi();
    var cerca = cercaLibreria.trim().toLowerCase();
    var quali = inLibreria.filter(function (v) {
      if (mucchio !== "tutto" && mucchioDi(v) !== mucchio) return false;
      if (!cerca) return true;
      return String(v.titolo || "").toLowerCase().indexOf(cerca) >= 0;
    });

    if (!quali.length) {
      $("libreria-roba").innerHTML = "<div class=\\"niente\\">" +
        (inLibreria.length
          ? "Niente che corrisponda. Prova un altro mucchio."
          : "Qui non c'e' niente da attaccare. La galleria della suite e' vuota, " +
            "o questa sala giochi gira per conto suo.") + "</div>";
      return;
    }

    // Guardando «tutto» i titoletti dividono i mucchi; dentro a un mucchio solo
    // sarebbero un titolo sopra a se stesso.
    var h = "";
    if (mucchio === "tutto") {
      for (var i = 1; i < MUCCHI.length; i++) {
        var m = MUCCHI[i];
        var dentro = quali.filter(function (v) { return mucchioDi(v) === m.id; });
        if (!dentro.length) continue;
        h += "<div class=\\"gruppo\\">" + sicuro(m.nome) +
          "<em>" + dentro.length + "</em></div>";
        h += dentro.map(voceHtml).join("");
      }
    } else {
      h = quali.map(voceHtml).join("");
    }
    $("libreria-roba").innerHTML = h;
  }

  function apriLibreria(id, come) {
    attaccaA = id;
    attaccaCome = come || "allegato";
    $("libreria").hidden = false;
    /**
     * ⚠ **Cercando una copertina si guardano solo le immagini.** Il tasto
     * «metti una copertina» serve a una cosa sola, e far scegliere un mp3 come
     * copertina di un brano e' un modo di sbagliare che non deve esistere.
     */
    if (attaccaCome === "copertina") mucchio = "image";
    cercaLibreria = "";
    $("libreria-cerca").value = "";
    $("libreria-roba").innerHTML = "<div class=\\"niente\\">Guardo…</div>";
    chiedi("GET", "/libreria").then(function (dati) {
      inLibreria = dati.voci || [];
      disegnaLibreria();
    }).catch(function (e) {
      inLibreria = [];
      $("libreria-tipi").innerHTML = "";
      $("libreria-roba").innerHTML = "<div class=\\"niente\\">" + sicuro(e.message) + "</div>";
    });
  }

  function chiudiLibreria() {
    $("libreria").hidden = true;
    attaccaA = "";
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

  /**
   * ⚠ **Cosa finisce attaccato alla figurina**: le generate che si sono
   * tenute, e dietro quelle scelte a mano dalla galleria.
   *
   * L'ordine conta: la **prima** e' la copertina della scheda nello shop. Le
   * generate vanno davanti perche' sono quelle nate da quel prompt — e' la
   * cosa che la figurina promette di essere.
   */
  function daAttaccare(id) {
    var generate = [];
    var quali = tenute[id] || {};
    for (var url in quali) if (Object.prototype.hasOwnProperty.call(quali, url)) {
      generate.push(quali[url]);
    }
    var aMano = (attaccati[id] || []).map(function (a) {
      return { id: a.id, url: a.url, mime: a.mime };
    });
    var tetto = io && io.maxAllegati ? io.maxAllegati : 8;
    return generate.concat(aMano).slice(0, tetto);
  }

  function prendila(id) {
    var cop = copertine[id];
    chiedi("POST", "/prendi", {
      id: id,
      bonus: quantoScelto("bonus", id),
      allegati: daAttaccare(id),
      copertina: cop ? cop.url : "",
      copertinaMime: "image/*",
    }).then(function (c) {
      tagliScelti["bonus:" + id] = 0;
      delete attaccati[id];
      delete tenute[id];
      delete copertine[id];
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
    /**
     * ⚠ Il motivo si chiede col pannello della pagina, non con «prompt».
     * Dentro la suite sul PC «prompt» non esiste — Electron l'ha tolto — e
     * questo tasto, da li', non buttava niente e non diceva perche'.
     */
    chiediQualcosa("Perche' non va bene?",
      "Lo legge chi l'ha mandata: e' l'unica cosa che gli insegna qualcosa.",
      { righe: 3, suggerimento: "due parole", tastoSi: "Buttala" }).then(function (motivo) {
        if (motivo === null) return;
        chiedi("POST", "/butta", { id: id, motivo: motivo }).then(function () {
          avviso("Buttata.", "bene");
          delete gradoScelto[id];
          caricaFila();
        }).catch(function (e) { avviso(e.message, "male"); });
      });
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
    if (dove === "mie") { chiudiICassettiDiMie(); caricaMie(); }
    // ⚠ Si richiede ogni volta che si entra: il mazzo e' fatto dai pacchetti
    // chiusi, e nel frattempo chi comanda puo' averne chiuso uno.
    if (dove === "fortuna") caricaMacchinetta();
    // Si entra dalle bustine, non dall'ultimo pacchetto aperto ieri.
    if (dove === "pacchetti") { pacchettoAperto = 0; caricaPacchetti(); }
    if (dove === "inventario") caricaInventario();
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
      var perChi = grado.getAttribute("data-per");
      // Due mestieri, stesso tasto: in fila punta a un prezzo, sulle prese
      // sceglie il grado che avra' nello shop.
      if (grado.getAttribute("data-uso") === "prezzo") {
        puntaAlGrado(perChi, grado.getAttribute("data-grado"));
        return;
      }
      gradoScelto[perChi] = grado.getAttribute("data-grado");
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

    // Copiare un prompt: il testo viaggia sull'attributo del tasto.
    var copia = chiudi("[data-copia]");
    if (copia) { copiaTesto(copia.getAttribute("data-copia")); return; }

    // I tagli: bonus in fila, o regalo a qualcuno. Stesso tasto, due mestieri.
    // Quanto si punta alla macchinetta: resta scelto anche domani.
    var quanto = chiudi("[data-puntata]");
    if (quanto) {
      puntata = Number(quanto.getAttribute("data-puntata"));
      try { localStorage.setItem(CHIAVE_PUNTATA, String(puntata)); } catch (e) {}
      disegnaPuntate();
      return;
    }

    // I pacchetti: comprarne uno (il tasto sulla bustina viene prima della
    // bustina, che e' li' intorno), aprirne uno, tornare alle bustine.
    var compraPacchetto = chiudi("[data-compra-pacco]");
    if (compraPacchetto) {
      compraPacco(Number(compraPacchetto.getAttribute("data-compra-pacco")), compraPacchetto);
      return;
    }
    var pacco = chiudi("[data-apri-pacco]");
    if (pacco) {
      pacchettoAperto = Number(pacco.getAttribute("data-apri-pacco"));
      caricaPacchetti();
      return;
    }
    if (chiudi("[data-torna-pacchi]")) { pacchettoAperto = 0; caricaPacchetti(); return; }

    // Una casella piena dell'inventario: un brano suona grande, il resto si
    // apre intero. 11 settembre 2026: «le canzoni facciamole sentire bene».
    var casellaInv = chiudi("[data-inv]");
    if (casellaInv) {
      var cosaInv = invCose[casellaInv.getAttribute("data-inv")];
      if (cosaInv && branoDi(cosaInv)) {
        grandeCosa(branoDi(cosaInv), "audio/*", cosaInv.titolo, cosaInv.faccia);
      } else if (cosaInv && fotoDi(cosaInv)) {
        // Una foto tua si guarda grande, intera: e' il premio di averla sbloccata.
        grandeCosa(fotoDi(cosaInv), "image/*", cosaInv.titolo);
      } else if (cosaInv) mostraFigurina(cosaInv);
      return;
    }
    var casellaCasa = chiudi("[data-casa]");
    if (casellaCasa) { mostraCasa(invCasa[casellaCasa.getAttribute("data-casa")]); return; }
    // Fra i due tiri della macchinetta: tenere una casella, o lasciarla.
    var casellaMacchina = chiudi("[data-casella]");
    if (casellaMacchina) {
      tieniLaCasella(Number(casellaMacchina.getAttribute("data-casella")));
      return;
    }

    var taglio = chiudi("[data-taglio]");
    if (taglio) {
      segnaTaglio(taglio.getAttribute("data-quale"), taglio.getAttribute("data-per"),
        Number(taglio.getAttribute("data-taglio")));
      return;
    }
    var lire = b.getAttribute && b.getAttribute("data-manda-lire");
    if (lire) { mandaLire(lire); return; }
    // ⚠ «svuota» e non «azzera»: l'attributo data-azzera, due righe piu' in
    // basso, azzera il **taglio scelto** e non tocca nessun conto. Due
    // attributi che si chiamano uguale su due tasti che fanno cose molto
    // diverse sono un guaio che si scopre il giorno che si sbaglia a copiare
    // una riga.
    var svuota = b.getAttribute && b.getAttribute("data-svuota");
    if (svuota) { svuotaPortafoglio(svuota); return; }

    var attacca = b.getAttribute && b.getAttribute("data-attacca");
    if (attacca) { apriLibreria(attacca, "allegato"); return; }
    var copertina = b.getAttribute && b.getAttribute("data-copertina");
    if (copertina) { apriLibreria(copertina, "copertina"); return; }
    /**
     * ⚠ Togliere **quella**, non tutte. Da quando se ne possono attaccare
     * quattro, un tasto «togli» che svuota l'elenco intero e' un tasto che fa
     * una cosa diversa da quella scritta sopra.
     */
    var stacca = b.getAttribute && b.getAttribute("data-stacca");
    if (stacca) {
      var quale = b.getAttribute("data-url");
      var restano = (attaccati[stacca] || []).filter(function (a) { return a.url !== quale; });
      if (restano.length) attaccati[stacca] = restano;
      else { delete attaccati[stacca]; delete copertine[stacca]; }
      riguardaGliAttacchi(stacca);
      return;
    }

    /**
     * ⚠ **Tenere una delle cose generate**, o smettere di tenerla.
     *
     * Chiesto il 10 settembre 2026: «alla fine puo' selezionare uno o piu'
     * elementi generati da includere nel pacchetto». E' una spunta, non una
     * scelta secca: quattro tentativi si guardano insieme e se ne tengono due.
     *
     * Si ridisegna solo il riquadro delle prove, per lo stesso motivo per cui
     * lo fa l'attesa: nella card accanto c'e' un bonus scritto a mano.
     */
    /**
     * ⚠ **Il tocco sull'anteprima la apre grande.** Sta **prima** di tutto il
     * resto dei tasti della card e dopo il tasto «tienila», che si prende il
     * suo clic da solo: chi tocca la figura vuole guardarla, chi tocca il tasto
     * vuole tenerla.
     */
    var daGuardare = chiudi("[data-guarda]");
    // ⚠ Non sui tasti, e non sul lettore: chi preme play vuole sentire, non
    // aprire un pannello sopra al tasto che ha appena premuto.
    if (daGuardare && !chiudi("button, audio, video")) {
      grandeCosa(
        daGuardare.getAttribute("data-guarda"),
        daGuardare.getAttribute("data-guarda-mime"),
        daGuardare.getAttribute("data-guarda-nome"),
      );
      return;
    }

    var nata = b.getAttribute && b.getAttribute("data-nata");
    if (nata) {
      var indirizzo = b.getAttribute("data-url");
      if (!tenute[nata]) tenute[nata] = {};
      if (tenute[nata][indirizzo]) delete tenute[nata][indirizzo];
      else {
        tenute[nata][indirizzo] = {
          id: b.getAttribute("data-vid") || indirizzo,
          url: indirizzo,
          mime: b.getAttribute("data-mime") || "image/*",
        };
      }
      b.classList.toggle("acceso");
      b.textContent = tenute[nata][indirizzo] ? "la tieni" : "tienila";
      var carta = b.closest ? b.closest(".nata") : null;
      if (carta) carta.classList.toggle("tenuta", Boolean(tenute[nata][indirizzo]));
      return;
    }

    var azzera = b.getAttribute && b.getAttribute("data-azzera");
    if (azzera) {
      azzeraTaglio(azzera.split(":")[0], azzera.slice(azzera.indexOf(":") + 1));
      return;
    }
    var prova = b.getAttribute && b.getAttribute("data-prova");
    if (prova) { provala(prova, b); return; }

    // Il mucchio della galleria: immagini, brani, video, altro.
    var scegliMucchio = chiudi("[data-mucchio]");
    if (scegliMucchio) {
      mucchio = scegliMucchio.getAttribute("data-mucchio");
      disegnaLibreria();
      return;
    }

    // Una cosa scelta nella galleria: si tiene da parte e si chiude il foglio.
    var voce = chiudi("[data-voce]");
    if (voce && attaccaA) {
      var scelta = {
        id: voce.getAttribute("data-voce"),
        url: voce.getAttribute("data-url"),
        mime: voce.getAttribute("data-mime"),
        titolo: voce.getAttribute("data-titolo"),
        anteprima: voce.getAttribute("data-anteprima"),
      };
      if (attaccaCome === "copertina") copertine[attaccaA] = scelta;
      else {
        // Si accoda: la prima resta la prima, ed e' quella che si vede nello
        // shop. Due volte la stessa non si attacca due volte.
        var gia = attaccati[attaccaA] || [];
        if (!gia.some(function (x) { return x.url === scelta.url; })) gia = gia.concat([scelta]);
        attaccati[attaccaA] = gia.slice(0, 4);
        /**
         * ⚠ **Se la libreria ha gia' la copertina di quel brano, si prende.**
         *
         * Chiesto il 10 settembre 2026: «se si carica una canzone viene
         * caricata anche l'immagine della canzone». La suite le fa gia', le
         * copertine dei brani e i fotogrammi dei video — sono la stessa cosa
         * che si vede in galleria. Chiederle a mano una seconda volta sarebbe
         * far rifare a Cammo un lavoro gia' fatto dal computer.
         */
        if (attaccati[attaccaA][0] === scelta &&
            String(scelta.mime || "").indexOf("image/") !== 0 && scelta.anteprima) {
          copertine[attaccaA] = { id: scelta.id, url: scelta.anteprima, mime: "image/*",
            titolo: scelta.titolo, anteprima: scelta.anteprima };
        }
      }
      var quale = attaccaA;
      chiudiLibreria();
      riguardaGliAttacchi(quale);
      return;
    }
  });

  // Il totale sotto la fila si aggiorna mentre si scrive il bonus: chi decide
  // deve vedere il numero finale prima di premere, non dopo.
  document.addEventListener("input", function (e) {
    var b = e.target;
    if (b.id === "cerca-gente") { cercaGente = b.value; disegnaGente(); return; }
    if (b.id === "libreria-cerca") { cercaLibreria = b.value; disegnaLibreria(); return; }
    for (var quale of ["bonus", "regalo"]) {
      var id = b.getAttribute && b.getAttribute("data-" + quale);
      if (!id) continue;
      // Scrivere un numero vince su quello messo insieme coi tasti: l'ultima
      // cosa che si fa e' quella che vale, se no si batte 50 e ne parte 100
      // senza capire perche'.
      if (b.value) tagliScelti[quale + ":" + id] = 0;
      mostraQuanto(quale, id);
      return;
    }
  });

  $("gira").addEventListener("click", gira);
  $("manda").addEventListener("click", manda);
  $("tira").addEventListener("click", tiraLaMacchinetta);
  $("crea-pacchetto").addEventListener("click", creaIlPacchetto);
  $("saldo").addEventListener("click", function () {
    inEuro = !inEuro;
    disegnaSaldo(false);
    disegnaRulli();
  });
  $("copia").addEventListener("click", function () {
    /**
     * ⚠ **Si copia quello che si vede**, cioe' i rulli bloccati.
     *
     * Prima copiava tutti e dodici i pezzi mentre sotto ne erano scritti tre:
     * il tasto sta sotto quella riga li', e un tasto che copia una cosa diversa
     * da quella che gli sta sopra e' un tasto che mente. Se non c'e' niente di
     * bloccato si copia quello che e' uscito: e' quello che si sta guardando.
     */
    var daMandare = pezzi.filter(function (p, i) { return p && bloccati[i]; });
    var quali = daMandare.length ? daMandare : pezzi;
    copiaTesto(quali.map(function (p) { return p.testo; }).join(", "));
  });
  $("libreria-chiudi").addEventListener("click", chiudiLibreria);
  $("sblocca").addEventListener("click", function () {
    bloccati = [];
    ricordaTavolo();
    disegnaRulli();
  });

  // Tenere premuto apre grande. Vale per il dito e per il mouse, e si annulla
  // appena si stacca o si scorre: uno che scorre la pagina non voleva aprire
  // niente.
  document.addEventListener("pointerdown", iniziaPressione);
  document.addEventListener("pointermove", forseSiSposta);
  document.addEventListener("pointerup", fermaPressione);
  document.addEventListener("pointercancel", fermaPressione);
  document.addEventListener("scroll", fermaPressione, true);
  // Sul telefono, tenendo premuto, il browser proporrebbe di copiare il testo:
  // qui la pressione lunga ha gia' un mestiere suo.
  document.addEventListener("contextmenu", function (e) {
    if (e.target && e.target.closest &&
        e.target.closest("[data-rullo], #prompt, .figurina, .busta, .carta, .cas")) {
      e.preventDefault();
    }
  });
  // La barra spaziatrice tira la leva: chi gioca sul computer non vuole
  // spostare il mouse quaranta volte.
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && e.target === document.body) { e.preventDefault(); gira(); }
  });

  /* -------------------------------------------------------------- entrare */

  /**
   * ⚠ **Un regalo si dice a chi lo riceve.**
   *
   * Chi comanda manda lire; senza questo, al giocatore il saldo cambierebbe da
   * solo fra un'apertura e l'altra — e un numero che cambia da solo si legge
   * come un guasto, non come un regalo. Il «gia' visto» sta nel browser e non
   * sul PC: riguarda uno schermo, non il conto.
   */
  function forseIlRegalo(regalo) {
    if (!regalo || !regalo.quanto) return;
    var chiave = "daprod.giochi.regalo";
    try {
      if (localStorage.getItem(chiave) === String(regalo.quando)) return;
      localStorage.setItem(chiave, String(regalo.quando));
    } catch (e) {}
    /**
     * ⚠ **Puo' anche essere un portafoglio azzerato**, dall'11 settembre 2026:
     * allora il numero e' negativo. Lo stesso pannello, perche' e' la stessa
     * cosa da dire — chi comanda ha messo mano al tuo saldo, ecco quanto ed
     * ecco perche'. Cambiano le parole e il colore, non il meccanismo: un
     * secondo pannello quasi identico sarebbe la solita gemella che il primo
     * giorno fa la stessa cosa e il secondo no.
     */
    if (regalo.quanto < 0) {
      grande("Il portafoglio e' stato azzerato", "dalla cassa", regalo.perche, "#ff6b6b");
      return;
    }
    grande("Ti hanno mandato " + soldi(regalo.quanto), "dalla cassa",
      regalo.perche, "#ffd166");
    coriandoli(60, ["#ffd166", "#ffffff", "#7fd1a8"]);
  }

  /**
   * ⚠ **Il biscotto, se chi ospita ne da' uno.**
   *
   * Serve solo alle immagini: un tag «img» non sa mettere l'intestazione col
   * token, e senza questo le foto attaccate alle figurine restano riquadri
   * rotti. Si chiede una volta e si tira dritto: se non risponde, la pagina
   * funziona uguale.
   */
  if (SESSIONE) {
    var opzioni = { method: "POST", headers: {} };
    if (token) opzioni.headers["Authorization"] = "Bearer " + token;
    try { fetch(SESSIONE, opzioni).catch(function () {}); } catch (e) {}
  }

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
    // La macchinetta si prepara subito: se non c'e' nessun pacchetto lo dice
    // aprendo la scheda, senza far premere un tasto per sentirsi dire di no.
    caricaMacchinetta();
    forseIlRegalo(dati.regalo);
  }).catch(function (errore) {
    document.querySelector("main").innerHTML =
      "<div class=\\"niente\\">" + sicuro(errore.message) + "</div>";
  });
`;
