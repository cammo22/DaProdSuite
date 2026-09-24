/**
 * DaProd Lira — il portafoglio unico dei giochi DaProd.
 *
 * ⚠ Nuovo con la 1.4.0 della suite (CONCETTI.md § 18). **Un file solo, uguale
 * in quattro posti**: la sala giochi della suite (`packages/giochi/sala/`) e i
 * tre giochi sul sito — Coin Dozer, Claw Machine, Neon Partenope. La copia
 * buona e' quella della suite; nei giochi si copia uguale.
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
 * **Due modi, e lo sceglie da se'.**
 *
 * - **Dentro la suite** (in una cornice della sala, con `?suite=1`): il conto,
 *   la partita e la Borsa sono quelli del PC. Il modulo non tocca niente: passa
 *   ogni richiesta alla pagina della sala con `postMessage`, e lei la gira al PC
 *   col token di chi gioca. La barra coi soldi la disegna la sala, sopra.
 * - **Sul sito**: le lire stanno nel browser, in `localStorage`, e i tre giochi
 *   stanno sullo stesso indirizzo (`cammo22.github.io`) — quindi **si dividono
 *   lo stesso portafoglio**. La Borsa e' la stessa formula della suite, con
 *   l'onda uguale per tutti e i movimenti di chi gioca su quel browser. La barra
 *   la disegna il modulo, in basso a sinistra.
 *
 * Niente dipendenze, niente rete: sul sito non chiama niente da fuori.
 */
(function () {
  "use strict";
  if (window.DaProdLira) return;

  var CHIAVE = "daprod.lira.v1";
  var ORA = 3600000;
  var GIORNO = 24 * ORA;
  var TETTO_GIORNO = 3000;
  var BENVENUTO = 500;
  var FETTA_LOCALE = 0.15;

  /* Gli stessi numeri di `packages/giochi/src/borsa.ts`: una Borsa sola. */
  var GIOCHI = {
    dozer: { nome: "Coin Dozer", ingresso: 100, punti: function (g) { return Math.floor(Math.max(0, g) / 5); }, bonus: { jackpot: 400, tris: 120, evento: 60 } },
    claw: { nome: "Claw Machine", ingresso: 100, punti: function (g) { return Math.floor(Math.max(0, g) / 4); }, bonus: { shiny: 250, zona: 300, presa: 20 } },
    neon: { nome: "Neon Partenope", ingresso: 100, punti: function (g) { return Math.round(60 * Math.log10(1 + Math.max(0, g))); }, bonus: { eruzione: 500, boss: 150, stanza: 10 } },
  };

  function onda(t) {
    var ore = Math.floor(t / ORA);
    var h = ((ore % 24) + 24) % 24;
    var x = (ore ^ 0x9e3779b9) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return 1 + 0.05 * Math.sin((2 * Math.PI * (h - 9)) / 24) + 0.03 * ((x / 4294967296) * 2 - 1);
  }

  function quotazione(ore, adesso) {
    var b = 0, c = 0, gente = {};
    for (var i = 0; i < ore.length; i++) {
      var o = ore[i];
      if (o.ora + ORA <= adesso - GIORNO || o.ora > adesso) continue;
      b += o.bruciate; c += o.coniate;
      for (var k = 0; k < o.giocatori.length; k++) gente[o.giocatori[k]] = 1;
    }
    var n = Object.keys(gente).length;
    var q = (1 + (0.6 * (b - c)) / (b + c + 2000)) * (1 + 0.15 * Math.log10(1 + n)) * onda(adesso);
    return Math.round(Math.min(4, Math.max(0.25, q)) * 1000) / 1000;
  }

  function giorno(t) {
    try { return new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); }
    catch (e) { return new Date(t).toISOString().slice(0, 10); }
  }

  function lire(n) {
    return "L." + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /* ---------------------------------------------------------- dove sono -- */

  var inSuite = false;
  try {
    inSuite = window.parent !== window && /(^|[?&])suite=1(&|$)/.test(location.search.slice(1));
  } catch (e) { inSuite = false; }

  var ascoltatori = [];
  var ultimo = null;
  function annuncia(stato) {
    ultimo = stato;
    for (var i = 0; i < ascoltatori.length; i++) { try { ascoltatori[i](stato); } catch (e) { /* un gioco rotto non ferma gli altri */ } }
    if (hud) disegnaHud();
  }

  /* -------------------------------------------------- dentro la suite -- */

  var numero = 0;
  var attese = {};
  function allaSala(cosa, dati) {
    return new Promise(function (risolvi, rifiuta) {
      var n = ++numero;
      attese[n] = { risolvi: risolvi, rifiuta: rifiuta };
      window.parent.postMessage({ daprod: "lira", n: n, cosa: cosa, dati: dati || {} }, "*");
      setTimeout(function () { if (attese[n]) { delete attese[n]; rifiuta(new Error("La sala non risponde.")); } }, 15000);
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

  /* ------------------------------------------------------- sul sito -- */

  function leggi() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CHIAVE) || "null"); } catch (e) { d = null; }
    if (!d || typeof d !== "object") d = { saldo: BENVENUTO, partita: { punti: 0, perGioco: {} }, ore: [], oggi: { giorno: "", lire: 0 }, io: "tu-" + Math.random().toString(36).slice(2, 8) };
    if (!Array.isArray(d.ore)) d.ore = [];
    if (!d.partita) d.partita = { punti: 0, perGioco: {} };
    return d;
  }
  function scrivi(d) { try { localStorage.setItem(CHIAVE, JSON.stringify(d)); } catch (e) { /* pieno o bloccato */ } }

  function muovi(d, quanto, adesso) {
    var prima = d.saldo;
    d.saldo = Math.max(0, Math.round(d.saldo + quanto));
    var mosso = d.saldo - prima;
    var inizio = Math.floor(adesso / ORA) * ORA;
    d.ore = d.ore.filter(function (o) { return o.ora > inizio - 168 * ORA; });
    var o = null;
    for (var i = 0; i < d.ore.length; i++) if (d.ore[i].ora === inizio) o = d.ore[i];
    if (!o) {
      var ap = d.ore.length ? d.ore[d.ore.length - 1].chiude : quotazione(d.ore, adesso);
      o = { ora: inizio, coniate: 0, bruciate: 0, giocatori: [], apre: ap, chiude: ap, max: ap, min: ap };
      d.ore.push(o);
    }
    if (mosso > 0) o.coniate += mosso;
    if (mosso < 0) o.bruciate -= mosso;
    if (o.giocatori.indexOf(d.io) < 0) o.giocatori.push(d.io);
    var q = quotazione(d.ore, adesso);
    o.chiude = q; o.max = Math.max(o.max, q); o.min = Math.min(o.min, q);
  }

  function statoLocale() {
    var d = leggi();
    var adesso = Date.now();
    var q = quotazione(d.ore, adesso);
    var gia = d.oggi && d.oggi.giorno === giorno(adesso) ? d.oggi.lire : 0;
    var ieri = null;
    for (var i = 0; i < d.ore.length; i++) if (d.ore[i].ora <= adesso - GIORNO) ieri = d.ore[i];
    var rif = ieri ? ieri.chiude : 1;
    return {
      modo: "locale",
      saldo: d.saldo,
      partita: d.partita.punti,
      quota: q,
      variazione: Math.round(((q - rif) / rif) * 1000) / 10,
      fetta: FETTA_LOCALE,
      tettoRimasto: Math.max(0, TETTO_GIORNO - gia),
      staccando: Math.min(Math.max(0, TETTO_GIORNO - gia), Math.floor(d.partita.punti * q * FETTA_LOCALE)),
    };
  }

  /* ------------------------------------------------------------ l'API -- */

  var ricarica = null;
  var gioco = "";
  var daMandare = {};
  var orologio = null;

  function manda() {
    var chiavi = Object.keys(daMandare);
    for (var i = 0; i < chiavi.length; i++) {
      var g = chiavi[i], grezzo = daMandare[g];
      delete daMandare[g];
      if (!grezzo) continue;
      if (inSuite) {
        allaSala("punti", { gioco: g, grezzo: grezzo }).catch(function () {});
      } else {
        var d = leggi();
        var p = GIOCHI[g] ? GIOCHI[g].punti(grezzo) : 0;
        d.partita.punti += p;
        d.partita.perGioco[g] = (d.partita.perGioco[g] || 0) + p;
        scrivi(d);
        annuncia(statoLocale());
      }
    }
  }

  var Lira = {
    get modo() { return inSuite ? "suite" : "locale"; },
    GIOCHI: GIOCHI,
    lire: lire,

    init: function (opzioni) {
      opzioni = opzioni || {};
      gioco = opzioni.gioco || gioco;
      ricarica = opzioni.ricarica || null;
      if (!orologio) orologio = setInterval(manda, inSuite ? 15000 : 4000);
      document.addEventListener("visibilitychange", function () { if (document.hidden) manda(); });
      window.addEventListener("pagehide", manda);
      if (inSuite) {
        allaSala("ciao", { gioco: gioco, ricarica: ricarica ? ricarica.detto || "" : "" }).then(annuncia, function () {});
      } else {
        annuncia(statoLocale());
        if (opzioni.barra !== false) montaHud(opzioni.posto || "basso-sinistra", opzioni.telefono, opzioni.tondo);
      }
      return Lira;
    },

    /** Il gioco ha vinto dei suoi gettoni: diventano punti della partita. */
    punti: function (g, grezzo) {
      g = g || gioco;
      var n = Number(grezzo) || 0;
      if (n <= 0) return;
      daMandare[g] = (daMandare[g] || 0) + n;
    },

    /** E' successa una cosa grossa. Nella suite il PC puo' dare una carta. */
    evento: function (g, cosa) {
      g = g || gioco;
      if (inSuite) return allaSala("evento", { gioco: g, evento: cosa }).catch(function () { return null; });
      var bonus = (GIOCHI[g] && GIOCHI[g].bonus[cosa]) || 0;
      if (bonus > 0) {
        var d = leggi();
        d.partita.punti += bonus;
        d.partita.perGioco[g] = (d.partita.perGioco[g] || 0) + bonus;
        scrivi(d);
        annuncia(statoLocale());
      }
      return Promise.resolve({ carta: null, bonus: bonus });
    },

    /** Si spende il gettone d'ingresso e il gioco ricarica i suoi. */
    ricarica: function () {
      var g = GIOCHI[gioco];
      if (!g || !ricarica) return Promise.reject(new Error("Questo gioco non si ricarica da qui."));
      if (inSuite) return allaSala("ricarica", { gioco: gioco }).then(function (e) { ricarica.dai(); return e; });
      var d = leggi();
      if (d.saldo < g.ingresso) return Promise.reject(new Error("Servono " + lire(g.ingresso) + ": stacca o gioca un'altra partita."));
      muovi(d, -g.ingresso, Date.now());
      scrivi(d);
      ricarica.dai();
      annuncia(statoLocale());
      return Promise.resolve({ saldo: d.saldo });
    },

    /** Lo stacco: la partita diventa lire, alla quotazione di adesso. */
    stacca: function () {
      manda();
      if (inSuite) return allaSala("stacca", {});
      var d = leggi();
      var adesso = Date.now();
      if (d.partita.punti <= 0) return Promise.reject(new Error("Non c'e' niente da staccare: prima si gioca."));
      var oggi = giorno(adesso);
      if (!d.oggi || d.oggi.giorno !== oggi) d.oggi = { giorno: oggi, lire: 0 };
      var spazio = Math.max(0, TETTO_GIORNO - d.oggi.lire);
      if (spazio <= 0) return Promise.reject(new Error("Oggi hai gia' staccato il massimo: la partita resta per domani."));
      var q = quotazione(d.ore, adesso), perPunto = q * FETTA_LOCALE;
      var pieno = Math.floor(d.partita.punti * perPunto);
      var usati = pieno <= spazio ? d.partita.punti : Math.floor(spazio / perPunto);
      var fatte = Math.floor(usati * perPunto);
      var avanzati = d.partita.punti - usati;
      muovi(d, fatte, adesso);
      d.oggi.lire += fatte;
      d.partita = { punti: avanzati, perGioco: avanzati ? { avanzati: avanzati } : {} };
      scrivi(d);
      annuncia(statoLocale());
      return Promise.resolve({ lire: fatte, quota: q, fetta: FETTA_LOCALE, punti: usati, avanzati: avanzati, saldo: d.saldo });
    },

    stato: function () { return ultimo || (inSuite ? null : statoLocale()); },
    suCambio: function (fn) { ascoltatori.push(fn); if (ultimo) fn(ultimo); },
  };

  /* ------------------------------------------- la barra, sul sito -- */

  var hud = null;
  /**
   * La barra. Sul computer e' una riga coi soldi, dove dice il gioco (`posto`).
   * Sul telefono i comandi del gioco occupano tutti i bordi: li' diventa un
   * bottoncino tondo «₤», messo dove il gioco ha un buco (`telefono`, con le
   * misure CSS: `{ top: "130px", left: "8px" }`), e toccandolo si apre.
   */
  function montaHud(posto, telefono, sempreTondo) {
    if (hud || !document.body) return;
    var st = document.createElement("style");
    st.textContent =
      "#dpLira{position:fixed;left:10px;bottom:10px;z-index:2147483000;font:700 12px/1.2 ui-monospace,Consolas,monospace;color:#cfe3dd;" +
      "background:rgba(4,14,12,.8);border:1px solid rgba(120,255,200,.25);border-radius:16px;box-shadow:0 10px 26px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.12);" +
      "-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);max-width:calc(100vw - 20px);user-select:none}" +
      "#dpLira .dpl-riga{display:flex;align-items:center;gap:9px;padding:7px 8px 7px 11px;cursor:pointer;white-space:nowrap}" +
      "#dpLira b{color:#3dff8a;font-size:13px}#dpLira .dpl-su{color:#3dff8a}#dpLira .dpl-giu{color:#ff5c6c}" +
      "#dpLira button{font:800 12px/1 system-ui,sans-serif;color:#fff;border:1px solid rgba(0,0,0,.5);border-radius:99px;padding:6px 11px;cursor:pointer;" +
      "background:linear-gradient(180deg,#caffc4 0%,#19d64a 50%,#0a8a26 51%,#19d64a 100%);text-shadow:0 1px 1px rgba(0,40,10,.6);box-shadow:0 0 12px rgba(25,214,74,.35)}" +
      "#dpLira button.dpl-cyan{background:linear-gradient(180deg,#b4f4ff 0%,#1fb8ee 50%,#0873c4 51%,#1fb8ee 100%)}" +
      "#dpLira button:disabled{filter:grayscale(1) brightness(.6)}" +
      "#dpLira .dpl-aperta{display:none;padding:2px 12px 11px;font-weight:400;line-height:1.5;max-width:320px;white-space:normal}" +
      "#dpLira.dpl-su .dpl-aperta{display:block}#dpLira .dpl-aperta p{margin:6px 0}#dpLira .dpl-tasti{display:flex;gap:6px;flex-wrap:wrap}" +
      "#dpLira .dpl-tondo{display:none}" +
      "#dpLira.dpl-piccolo:not(.dpl-su){border-radius:50%}#dpLira.dpl-piccolo:not(.dpl-su) .dpl-riga{display:none}" +
      "#dpLira.dpl-piccolo:not(.dpl-su) .dpl-tondo{display:grid;place-items:center;width:40px;height:40px;cursor:pointer;color:#3dff8a;font:800 18px/1 system-ui,sans-serif}" +
      "#dpLira.dpl-piccolo.dpl-su{max-width:min(330px,calc(100vw - 20px))}";
    document.head.appendChild(st);
    hud = document.createElement("div");
    hud.id = "dpLira";
    // Dove non copre i comandi del gioco: lo dice il gioco.
    function sistema() {
      // `tondo: true` e' per i giochi che non hanno un buco nemmeno sul computer.
      var stretto = sempreTondo || window.innerWidth < 700;
      hud.classList.toggle("dpl-piccolo", stretto);
      hud.style.top = hud.style.bottom = hud.style.left = hud.style.right = "auto";
      if (stretto && telefono) {
        for (var k in telefono) hud.style[k] = telefono[k];
        return;
      }
      var p = String(posto).split("-");
      hud.style[p[0] === "alto" ? "top" : "bottom"] = "10px";
      hud.style[p[1] === "destra" ? "right" : "left"] = "10px";
    }
    sistema();
    window.addEventListener("resize", sistema);
    hud.innerHTML = '<div class="dpl-tondo" id="dpLiraTondo" title="Le Lire DaProd">₤</div>' +
      '<div class="dpl-riga" id="dpLiraRiga"></div><div class="dpl-aperta" id="dpLiraAperta"></div>';
    document.body.appendChild(hud);
    hud.querySelector("#dpLiraTondo").addEventListener("click", function () { hud.classList.add("dpl-su"); });
    hud.querySelector("#dpLiraRiga").addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "BUTTON") return;
      hud.classList.toggle("dpl-su");
    });
    hud.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || t.tagName !== "BUTTON") return;
      var fare = t.getAttribute("data-fai") === "ricarica" ? Lira.ricarica() : Lira.stacca();
      t.disabled = true;
      fare.then(function (r) {
        if (r && r.lire !== undefined) avvisa("Staccato: +" + lire(r.lire) + " (quotazione " + r.quota.toFixed(2).replace(".", ",") + ")");
      }, function (err) { avvisa(err.message); }).then(function () { t.disabled = false; disegnaHud(); });
    });
    disegnaHud();
  }

  var detto = "";
  function avvisa(testo) { detto = testo; disegnaHud(); setTimeout(function () { detto = ""; disegnaHud(); }, 5000); }

  function disegnaHud() {
    if (!hud) return;
    var s = inSuite ? ultimo : statoLocale();
    if (!s) return;
    var su = s.variazione >= 0;
    hud.querySelector("#dpLiraRiga").innerHTML =
      "<span>₤</span><b>" + lire(s.saldo) + "</b>" +
      "<span>" + s.partita + " pt</span>" +
      "<span class='" + (su ? "dpl-su" : "dpl-giu") + "'>" + (su ? "▲" : "▼") + " " + s.quota.toFixed(2).replace(".", ",") + "</span>" +
      "<button data-fai='stacca'" + (s.partita > 0 ? "" : " disabled") + ">Stacca</button>";
    var g = GIOCHI[gioco];
    hud.querySelector("#dpLiraAperta").innerHTML =
      "<p><b>Le Lire DaProd</b> sono una moneta sola per tutti i giochi DaProd su questo browser.</p>" +
      "<p>Giocando fai <b>punti</b>. Quando vuoi smettere li <b>stacchi</b>: diventano lire alla quotazione di adesso, " +
      "per la tua fetta (" + Math.round(s.fetta * 100) + "%). Oggi ne puoi staccare ancora " + lire(s.tettoRimasto) + ".</p>" +
      "<p>La quotazione sale quando si spende e scende quando si incassa (" + (su ? "+" : "") + String(s.variazione).replace(".", ",") + "% in 24 ore). " +
      "Staccando adesso prenderesti <b>" + lire(s.staccando) + "</b>.</p>" +
      (detto ? "<p><b>" + detto + "</b></p>" : "") +
      "<div class='dpl-tasti'>" + (g && ricarica ? "<button class='dpl-cyan' data-fai='ricarica'>Ricarica · " + lire(g.ingresso) + "</button>" : "") +
      "<button data-fai='stacca'" + (s.partita > 0 ? "" : " disabled") + ">Stacca " + lire(s.staccando) + "</button></div>";
  }

  window.DaProdLira = Lira;
})();
