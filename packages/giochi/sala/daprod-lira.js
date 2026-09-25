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
 *     DaProdLira.init({
 *       gioco: "claw",
 *       ricarica: { dai: function (lire) { stato.lire += lire; } },
 *       cassa: {
 *         quanto: function () { return stato.lire; },          // cosa si porta a casa
 *         finita: function () { return collezioneCompleta(); },  // Claw e Neon
 *         togli: function (r) { ricominciaDaCapo(); },           // dopo l'incasso
 *         chiudi: true,                                          // ogni incasso chiude la partita
 *       },
 *     });
 *     DaProdLira.evento("dozer", "jackpot");
 *     DaProdLira.incassa();   // dal tasto del gioco; la cornice ha il suo
 *     DaProdLira.soldi(12345); // «L. 12.345» o «€ 6,38», come ha scelto chi gioca
 *
 * **Dalla 1.4.9** il gioco racconta alla sala quante lire ha, ogni tre
 * secondi, e la sala le mostra dal vivo; e la valuta (lire o euro) la sceglie
 * chi gioca, in alto nella sala: `DaProdLira.soldi()` la segue, e
 * `DaProdLira.suValuta(fn)` avvisa il gioco quando cambia.
 *
 * **Dalla 1.4.8 una lira e' una lira** (`packages/giochi/src/euro.ts`): la
 * ricarica arriva al gioco in lire della suite, senza cambio, e l'incasso le
 * riporta indietro, meno il 10% di DaProd. I tagli si ragionano in euro, al
 * cambio del 2002: `DaProdLira.euro(lire)` li scrive.
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
  var perLaValuta = [];
  var ultimo = null;
  var valuta = "lire";
  function annuncia(stato) {
    ultimo = stato;
    for (var i = 0; i < ascoltatori.length; i++) { try { ascoltatori[i](stato); } catch (e) { /* un gioco rotto non ferma gli altri */ } }
    // 1.4.9: la valuta la sceglie chi guarda, nella sala; il gioco la segue.
    var v = stato && stato.valuta === "euro" ? "euro" : "lire";
    if (v !== valuta) {
      valuta = v;
      for (var k = 0; k < perLaValuta.length; k++) { try { perLaValuta[k](valuta); } catch (e) { /* niente */ } }
    }
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
      // La sala ha ricaricato: il gioco cambia quelle lire nei suoi gettoni.
      // Dalla 1.4.4 arriva quante (m.lire): prima era sempre un gettone solo.
      if (m.ricarica && ricarica) { try { ricarica.dai(Number(m.lire) || 0); } catch (e) { /* niente */ } }
      // La cornice chiede di incassare (1.4.8): lo fa il gioco, che sa quanto ha.
      if (m.incassa && cassa) Lira.incassa().catch(function () {});
    });
  }

  var ricarica = null;
  var cassa = null;
  var gioco = "";
  var daMandare = {};
  var orologio = null;

  /**
   * Le lire del gioco, dal vivo (1.4.9): ogni tre secondi, se sono cambiate,
   * la sala le mette nella pastiglia «nel gioco». Prima la barra mostrava i
   * punti, che dalla 1.4.8 nessun gioco mandava piu': restava ferma.
   */
  var dettoNelGioco = -1;
  function raccontaNelGioco() {
    if (spento || !cassa || !cassa.quanto) return;
    var n = 0;
    try { n = Math.max(0, Math.floor(Number(cassa.quanto()) || 0)); } catch (e) { return; }
    if (n === dettoNelGioco) return;
    dettoNelGioco = n;
    allaSala("nelGioco", { gioco: gioco, lire: n }).catch(function () {});
  }

  function manda() {
    raccontaNelGioco();
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
      cassa = opzioni.cassa || null;
      if (spento) return Lira;
      // Ogni tre secondi (1.4.4): la barra della sala mostra la partita quasi dal
      // vivo. Prima erano quindici, e i punti arrivavano a scatti.
      if (!orologio) orologio = setInterval(manda, 3000);
      document.addEventListener("visibilitychange", function () { if (document.hidden) manda(); });
      window.addEventListener("pagehide", manda);
      allaSala("ciao", {
        gioco: gioco,
        ricarica: ricarica ? ricarica.detto || "" : "",
        // Quanto vale una lira della suite nel gioco. Dalla 1.4.8 e' 1 per tutti.
        cambio: ricarica && ricarica.cambio ? Number(ricarica.cambio) : 1,
        // Il gioco sa incassare da solo (1.4.8): la cornice lo chiede a lui.
        cassa: Boolean(cassa),
      }).then(annuncia, function () {});
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

    /**
     * Chiede alla sala di aprire il portafoglio per ricaricare. Solo nella suite:
     * quante lire lo sceglie chi gioca, e le monete arrivano col messaggio della
     * sala (vedi sopra), non da qui.
     */
    ricarica: function () {
      if (!ricarica) return Promise.reject(new Error("Questo gioco non si ricarica da qui."));
      return allaSala("ricarica", { gioco: gioco });
    },

    /**
     * L'incasso (1.4.8): quello che il gioco ha diventa lire vere, meno la
     * fetta di DaProd, fino al tetto della partita. `opzioni.fine` chiude la
     * partita col premio della velocita' (Claw, Neon); `opzioni.chiudi` la
     * chiude senza premio. Risponde con `preso`: quante lire togliersi.
     */
    incassa: function (opzioni) {
      manda();
      opzioni = opzioni || {};
      var grezzo = typeof opzioni.grezzo === "number" ? opzioni.grezzo : (cassa && cassa.quanto ? Number(cassa.quanto()) || 0 : 0);
      var fine = typeof opzioni.fine === "boolean" ? opzioni.fine : Boolean(cassa && cassa.finita && cassa.finita());
      // Claw e Neon ricominciano da capo a ogni incasso: la partita si chiude sempre.
      var chiudi = Boolean(opzioni.chiudi || (cassa && cassa.chiudi));
      return allaSala("incassa", { gioco: gioco, grezzo: grezzo, fine: fine, chiudi: chiudi }).then(function (r) {
        if (cassa && cassa.togli) { try { cassa.togli(r); } catch (e) { /* il gioco si arrangia */ } }
        dettoNelGioco = -1;
        setTimeout(raccontaNelGioco, 300);
        return r;
      });
    },

    /** Lire in euro, scritte all'italiana: «€ 1,00». Il cambio e' quello del 2002. */
    euro: function (lire) {
      var e = (Number(lire) || 0) / 1936.27;
      return "€ " + e.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    /**
     * Un numero corto (1.4.9): «1.234», «38k», «15,5M», «6,1 mld». Sotto i
     * centomila si scrive tutto.
     */
    corto: function (n) {
      var v = Math.round(Number(n) || 0), a = Math.abs(v);
      var it = function (x, d) { return x.toFixed(d).replace(".", ",").replace(/,0+$/, ""); };
      if (a < 100000) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      if (a < 1e6) return it(v / 1000, 0) + "k";
      if (a < 1e9) return it(v / 1e6, a < 1e7 ? 2 : 1) + "M";
      if (a < 1e12) return it(v / 1e9, 1) + " mld";
      return it(v / 1e12, 1) + " bln";
    },

    /** «lire» o «euro»: quella che chi gioca ha scelto nella sala. Fuori dalla suite, lire. */
    valuta: function () { return spento ? "lire" : valuta; },

    /**
     * Soldi scritti nella valuta scelta (1.4.9): «L. 38k» o «€ 20,00». I giochi
     * lo usano per le loro lire, cosi' il cambio in alto nella sala vale anche
     * dentro al gioco.
     */
    soldi: function (lire) {
      var n = Number(lire) || 0;
      if (Lira.valuta() === "euro") {
        var e = n / 1936.27;
        if (Math.abs(e) >= 10000) return "€ " + Lira.corto(e);
        return Lira.euro(n);
      }
      return "L. " + Lira.corto(n);
    },

    /** Chi vuole sapere quando cambia la valuta: il gioco ridisegna i suoi numeri. */
    suValuta: function (fn) { perLaValuta.push(fn); },

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
