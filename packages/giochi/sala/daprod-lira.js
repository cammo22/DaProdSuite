/**
 * DaProd Lira — il ponte fra i giochi DaProd e la sala giochi della suite.
 *
 * ⚠ Nuovo con la 1.4.0 della suite (CONCETTI.md § 18). **Un file solo, uguale
 * in quattro posti**: la sala giochi della suite (`packages/giochi/sala/`) e i
 * tre giochi — Coin Dozer, Claw Machine, Neon Partenope. La copia buona e'
 * quella della suite; nei giochi si copia uguale.
 *
 * Si carica con un tag, prima del gioco:
 *
 *     <script src="daprod-lira.js"></script>
 *
 * e il gioco dice chi e' e come si ricarica:
 *
 *     DaProdLira.init({
 *       gioco: "dozer",
 *       ricarica: { detto: "+L.2.000 di monete", dai: function () { stato.saldo += 2000; } },
 *     });
 *     DaProdLira.punti("dozer", 350);     // ha vinto 350 dei suoi gettoni
 *     DaProdLira.evento("dozer", "jackpot");
 *
 * **Le Lire DaProd esistono solo dentro la suite.** Chiarito da Cammo il 24
 * settembre 2026, dopo una prima versione che le teneva anche sul sito, nel
 * browser: «le pagine GitHub dei giochi devono rimanere demo giocabili
 * normalmente: solo gli utenti collegati alla DaProd Suite hanno questo
 * sistema di lire, e i giochi devono essere giocabili anche se un computer
 * DaProd non e' collegato».
 *
 * Quindi:
 *
 * - **Dentro la suite** (in una cornice della sala, con `?suite=1`): il conto,
 *   la partita e la Borsa sono quelli del PC. Il modulo passa ogni richiesta
 *   alla pagina della sala con `postMessage`, e lei la gira al PC col token di
 *   chi gioca. La barra coi soldi la disegna la sala, sopra.
 * - **Dappertutto il resto** — il sito, le app, un file aperto a mano — il
 *   modulo **non fa niente**: nessuna barra, niente salvato, nessuna rete. Il
 *   gioco e' la sua demo, come prima.
 * - **E se la sala non risponde** (il PC non e' collegato, la pagina e' rimasta
 *   aperta da ieri) il modulo si spegne da solo dopo il primo silenzio: il
 *   gioco continua, e i punti di quella partita semplicemente non contano.
 *
 * Ogni funzione e' sicura da chiamare in ogni caso: il gioco non deve sapere
 * dove sta.
 */
(function () {
  "use strict";
  if (window.DaProdLira) return;

  /* ---------------------------------------------------------- dove sono -- */

  var inSuite = false;
  try {
    inSuite = window.parent !== window && /(^|[?&])suite=1(&|$)/.test(location.search.slice(1));
  } catch (e) { inSuite = false; }

  /** Diventa vero al primo silenzio della sala: da li' in poi il modulo tace. */
  var spento = !inSuite;

  var ascoltatori = [];
  var ultimo = null;
  function annuncia(stato) {
    ultimo = stato;
    for (var i = 0; i < ascoltatori.length; i++) { try { ascoltatori[i](stato); } catch (e) { /* un gioco rotto non ferma gli altri */ } }
  }

  /* -------------------------------------------------- dentro la suite -- */

  var numero = 0;
  var attese = {};
  function allaSala(cosa, dati) {
    if (spento) return Promise.reject(new Error("Fuori dalla sala giochi della DaProd Suite le lire non ci sono."));
    return new Promise(function (risolvi, rifiuta) {
      var n = ++numero;
      attese[n] = { risolvi: risolvi, rifiuta: rifiuta };
      try { window.parent.postMessage({ daprod: "lira", n: n, cosa: cosa, dati: dati || {} }, "*"); }
      catch (e) { delete attese[n]; spento = true; rifiuta(e); return; }
      setTimeout(function () {
        if (!attese[n]) return;
        delete attese[n];
        spento = true;
        rifiuta(new Error("La sala non risponde: si gioca lo stesso, ma senza lire."));
      }, 15000);
    });
  }
  if (inSuite) {
    window.addEventListener("message", function (ev) {
      var m = ev.data;
      if (!m || m.daprod !== "lira" || ev.source !== window.parent) return;
      if (m.stato) annuncia(m.stato);
      if (m.n && attese[m.n]) {
        var a = attese[m.n]; delete attese[m.n];
        if (m.errore) a.rifiuta(new Error(m.errore)); else a.risolvi(m.esito);
      }
      // La sala chiede di ricaricare: il gioco da' i suoi gettoni.
      if (m.ricarica && ricarica) { try { ricarica.dai(); } catch (e) { /* niente */ } }
    });
  }

  var ricarica = null;
  var gioco = "";
  var daMandare = {};
  var orologio = null;

  function manda() {
    if (spento) { daMandare = {}; return; }
    var chiavi = Object.keys(daMandare);
    for (var i = 0; i < chiavi.length; i++) {
      var g = chiavi[i], grezzo = daMandare[g];
      delete daMandare[g];
      if (grezzo) allaSala("punti", { gioco: g, grezzo: grezzo }).catch(function () {});
    }
  }

  var Lira = {
    /** "suite" dentro la sala giochi, "demo" dappertutto il resto. */
    get modo() { return spento ? "demo" : "suite"; },

    init: function (opzioni) {
      opzioni = opzioni || {};
      gioco = opzioni.gioco || gioco;
      ricarica = opzioni.ricarica || null;
      if (spento) return Lira;
      if (!orologio) orologio = setInterval(manda, 15000);
      document.addEventListener("visibilitychange", function () { if (document.hidden) manda(); });
      window.addEventListener("pagehide", manda);
      allaSala("ciao", { gioco: gioco, ricarica: ricarica ? ricarica.detto || "" : "" }).then(annuncia, function () {});
      return Lira;
    },

    /** Il gioco ha vinto dei suoi gettoni: nella suite diventano punti della partita. */
    punti: function (g, grezzo) {
      if (spento) return;
      g = g || gioco;
      var n = Number(grezzo) || 0;
      if (n <= 0) return;
      daMandare[g] = (daMandare[g] || 0) + n;
    },

    /** E' successa una cosa grossa. Nella suite il PC puo' dare una carta. */
    evento: function (g, cosa) {
      if (spento) return Promise.resolve(null);
      return allaSala("evento", { gioco: g || gioco, evento: cosa }).catch(function () { return null; });
    },

    /** Si spende il gettone d'ingresso e il gioco ricarica i suoi. Solo nella suite. */
    ricarica: function () {
      if (!ricarica) return Promise.reject(new Error("Questo gioco non si ricarica da qui."));
      return allaSala("ricarica", { gioco: gioco }).then(function (e) { ricarica.dai(); return e; });
    },

    /** Lo stacco: la partita diventa lire, alla quotazione di adesso. Solo nella suite. */
    stacca: function () {
      manda();
      return allaSala("stacca", {});
    },

    stato: function () { return spento ? null : ultimo; },
    suCambio: function (fn) { ascoltatori.push(fn); if (ultimo) fn(ultimo); },
  };

  window.DaProdLira = Lira;
})();
