/**
 * La Casa, rifatta (1.5.3): la sala giochi per chi gioca, la postazione per
 * chi decide.
 *
 * Chiesto il 26 settembre 2026: «rivediamo tutto da zero per la UI di questa
 * sezione: per gli utenti deve tenere traccia della sala giochi, per gli admin
 * deve essere postazione di gestione del PC e della sala insieme, più deve
 * poter usare la suite per creare i contenuti».
 *
 * Quindi in Casa, sopra a «Crea» e alle ultime cose:
 *
 * - **chi gioca** trova la sua sala: quanto ha in tasca (in lire e in euro),
 *   il livello col premio da prendere (si prende da qui), le partite aperte
 *   con dentro dei soldi, i premi della Banca che si aprono, e un tasto per
 *   entrare;
 * - **chi decide** trova, sotto allo stato del computer, la sala dall'alto:
 *   quante lire ci sono nei portafogli e dentro i giochi, la riserva, gli
 *   incassi da controllare, e i tasti per la Banca e i giocatori.
 *
 * I numeri li chiede alla sala giochi stessa (`/giochi/…`), con lo stesso
 * token: una cosa sola, uguale ovunque. Stesse regole degli altri copioni (e `sicuroC` è quello di Crea):
 * una stringa sola, niente apici inversi e niente barre rovesciate.
 */
export const COPIONE_CASA = `
  /* ------------------------------------------- la sala in Casa (1.5.3) */

  var casaSala = null;
  var casaIo = null;
  var casaBanca = null;

  function lireIt(n) {
    var v = Math.round(Number(n) || 0), a = Math.abs(v);
    var it = function (x, d) { return x.toFixed(d).replace(".", ",").replace(/,0+$/, ""); };
    var s = a < 100000 ? String(a).replace(/(?=(?:[0-9]{3})+$)(?!^)/g, ".") : a < 1e6 ? it(a / 1000, 0) + "k" : a < 1e9 ? it(a / 1e6, 1) + "M" : it(a / 1e9, 1) + " mld";
    return (v < 0 ? "-" : "") + "L. " + s;
  }
  function euroIt(n) {
    var e = (Number(n) || 0) / 1936.27;
    return "€ " + e.toFixed(2).replace(".", ",").replace(/(?=(?:[0-9]{3})+,)(?!^)/g, ".");
  }

  /** Apre la sala giochi, su una sua pagina se si dice quale. */
  function apriLaSala(pagina) {
    var dove = "/giochi";
    var f = [];
    if (token) f.push("t=" + encodeURIComponent(token));
    if (pagina) f.push("va=" + encodeURIComponent(pagina));
    if (f.length) dove += "#" + f.join("&");
    location.href = dove;
  }

  function leggiCasaSala() {
    var chiesti = [
      chiama("/giochi/sala").then(function (s) { casaSala = s; }, function () { casaSala = null; }),
      chiama("/giochi/io").then(function (i) { casaIo = i; }, function () { casaIo = null; }),
    ];
    if (decido()) chiesti.push(chiama("/giochi/banca/gestione").then(function (b) { casaBanca = b; }, function () { casaBanca = null; }));
    return Promise.all(chiesti).then(disegnaCasaSala);
  }

  function disegnaCasaSala() {
    var dove = $("casa-sala");
    if (!dove) return;
    if (!casaSala || !casaIo) { dove.innerHTML = ""; return; }
    var s = casaSala, io = casaIo, l = s.livelli || { livello: 1, daPrendere: 0 };
    var c = io.conto || {};
    var dentro = c.serve ? Math.round((c.dentro / c.serve) * 100) : 0;
    var aperte = (s.giochi || []).filter(function (g) { return g.messo > 0; });
    var ICONE = { dozer: "🪙", claw: "🦾", neon: "🌋" };
    var h = '<div class="cs-carta">' +
      '<div class="cs-testa"><div><small>' + (decido() ? "Il tuo conto nella sala" : "La tua sala giochi") + '</small>' +
        '<b class="cs-saldo">' + lireIt(io.saldo) + '</b><span class="cs-euro">' + euroIt(io.saldo) + '</span></div>' +
        '<button type="button" class="cs-entra" data-cs-sala="">Gioca →</button></div>' +
      '<div class="cs-livello"><span class="cs-liv">liv. ' + l.livello + '</span><span class="cs-barra"><i style="width:' + dentro + '%"></i></span>' +
        (l.daPrendere > 0
          ? '<button type="button" class="cs-premio" id="cs-premio">⭐ Prendi ' + lireIt(l.daPrendere) + '</button>'
          : '<small>premio al ' + (l.livello + 1) + ': ' + lireIt(l.prossimo || 0) + '</small>') + '</div>';
    if (aperte.length) {
      h += '<div class="cs-aperte">' + aperte.map(function (g) {
        return '<button type="button" data-cs-sala="sala"><i>' + (ICONE[g.id] || "🎮") + '</i><b>' + sicuroC(g.nome) + '</b><small>partita aperta · ' + lireIt(g.messo) + ' messe</small></button>';
      }).join("") + '</div>';
    }
    var cassetti = (s.banca && s.banca.cassetti) || [];
    if (cassetti.length) {
      h += '<div class="cs-premi">' + cassetti.map(function (x) {
        return '<span><small>' + sicuroC(x.nome) + '</small><b>' + lireIt(x.lire) + '</b></span>';
      }).join("") + '</div>';
    }
    h += '<div class="cs-giochi">' + ["dozer", "claw", "neon"].map(function (id) {
      return '<button type="button" data-cs-sala="sala"><img src="/giochi/sala/img/' + id + '.webp" alt="" loading="lazy"></button>';
    }).join("") + '</div></div>';

    if (decido() && casaBanca) {
      var b = casaBanca;
      h += '<div class="cs-carta admin">' +
        '<div class="cs-testa"><div><small>La sala, da qui</small><b>🏦 Banca DaProd</b></div>' +
          '<button type="button" class="cs-entra" data-cs-sala="banca">Apri →</button></div>' +
        '<div class="cs-numeri">' +
          '<span><small>nei portafogli</small><b>' + lireIt(b.circolante) + '</b></span>' +
          '<span><small>dentro i giochi</small><b>' + lireIt(b.neiGiochi) + '</b></span>' +
          '<span><small>riserva</small><b>' + lireIt(b.banca ? b.banca.riserva : 0) + '</b></span>' +
          '<span class="' + (b.daControllare ? "allarme" : "") + '"><small>da controllare</small><b>' + (b.daControllare ? b.daControllare + " · " + lireIt(b.daControllareLire) : "niente") + '</b></span>' +
        '</div>' +
        '<div class="cs-tasti">' +
          '<button type="button" data-cs-sala="banca">🏦 Banca</button>' +
          '<button type="button" data-cs-sala="giocatori">👥 Giocatori (' + (b.conti ? b.conti.length : 0) + ')</button>' +
          '<button type="button" data-cs-sala="fila">🎰 Fila della sala</button>' +
        '</div></div>';
    }
    dove.innerHTML = h;
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("#casa-sala button") : null;
    if (!b) return;
    if (b.id === "cs-premio") {
      b.disabled = true;
      chiama("/giochi/livello/riscuoti", { method: "POST", body: "{}" }).then(function (r) {
        avvisa("Premio del livello: +" + lireIt(r.daPrendere) + " nel portafoglio.", "bene");
        leggiCasaSala();
      }, function (e) { avvisa(e.message, "male"); b.disabled = false; });
      return;
    }
    if (b.hasAttribute("data-cs-sala")) apriLaSala(b.getAttribute("data-cs-sala"));
  });

  // In Casa i numeri della sala si riguardano entrando e ogni mezzo minuto.
  setInterval(function () { if (!document.hidden && pagina === "casa") void leggiCasaSala(); }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && pagina === "casa") void leggiCasaSala(); });
`;
