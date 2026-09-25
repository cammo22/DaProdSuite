/**
 * Il copione del Portafoglio e delle Casse DaProd (1.4.8). Vedi
 * `portafoglio-markup.ts`, `../portafoglio.ts` e `../banca.ts`.
 *
 * Sta dopo il copione della sala nella stessa funzione e ne usa gli attrezzi
 * (`chiedi`, `soldi`, `sicuro`, `avviso`, `quando`, `vaiA`, `chiediQualcosa`,
 * `sala`, `caricaSala`, `euroIt`, `puntiIt`, `numeroIt`, `ICONE_SALA`).
 * ⚠ Niente apici inversi e niente barre rovesciate: questo testo finisce
 * dentro una stringa di TypeScript.
 */
export const COPIONE_PORTAFOGLIO = `
  /* ----------------------------------- il portafoglio, rifatto (1.4.9) */

  var pf = null;
  var periodoPf = '7g';
  try { periodoPf = localStorage.getItem('daprod.sala.periodo') || '7g'; } catch (e) {}
  var ORA = 3600000, GIORNO = 86400000;
  var PERIODI = { '24h': GIORNO, '7g': 7 * GIORNO, '1m': 30 * GIORNO, 'tutto': 0 };
  var NOMI_PERIODO = { '24h': 'nelle ultime 24 ore', '7g': 'negli ultimi 7 giorni', '1m': 'nell ultimo mese', 'tutto': 'da sempre' };

  /** Da dove viene o dove va una lira, detto per gruppi. */
  function categoriaDi(perche) {
    var p = String(perche || '');
    if (p.indexOf('ricarica') === 0) return { nome: 'Ricariche nei giochi', ico: '🎮' };
    if (p.indexOf('incasso da') === 0 || p.indexOf('incasso della') === 0) return { nome: 'Incassi dai giochi', ico: '💰' };
    if (p.indexOf('partita finita') === 0) return { nome: 'Premi di fine partita', ico: '🏆' };
    if (p.indexOf('premio della Banca') === 0) return { nome: 'Premi della Banca', ico: '🎁' };
    if (p.indexOf('un regalo') === 0) return { nome: 'Regali ricevuti', ico: '💌' };
    if (p.indexOf('Studio') === 0) return { nome: 'Studio', ico: '🎨' };
    if (p.indexOf('Fortuna') >= 0 || p.indexOf('giro di slot') >= 0) return { nome: 'Slot e Fortuna', ico: '🎰' };
    if (p.indexOf('pacchett') >= 0 || p.indexOf('figurin') >= 0 || p.indexOf('combinazione') >= 0) return { nome: 'Figurine e pacchetti', ico: '🃏' };
    if (p.indexOf('azzerato') >= 0) return { nome: 'Portafoglio azzerato', ico: '🧹' };
    return { nome: p || 'Altro', ico: '•' };
  }

  /**
   * La linea del saldo in un periodo: i saldi di fine giornata (lo storico) e
   * ogni movimento, a scalino — prima e dopo — cosi' un incasso e' un salto e
   * non una rampa. Torna i punti e da quanto si e' partiti.
   */
  function serieDelSaldo(p, periodo) {
    var adesso = Date.now();
    var da = PERIODI[periodo] ? adesso - PERIODI[periodo] : 0;
    var tutti = [];
    (p.andamento || []).forEach(function (x) {
      var t = new Date(x.giorno + 'T23:59:00').getTime();
      if (t < adesso - GIORNO) tutti.push({ t: t, v: x.saldo });
    });
    (p.movimenti || []).forEach(function (m) {
      tutti.push({ t: m.quando - 1, v: m.saldo - m.lire });
      tutti.push({ t: m.quando, v: m.saldo, detto: m.perche });
    });
    tutti.sort(function (a, b) { return a.t - b.t; });
    var prima = null, dentro = [];
    tutti.forEach(function (x) { if (x.t < da) prima = x; else dentro.push(x); });
    var inizio = prima ? prima.v : dentro.length ? dentro[0].v : p.saldo;
    var t0 = da || (dentro.length ? dentro[0].t : adesso - GIORNO);
    var punti = [{ t: t0, v: inizio }].concat(dentro).concat([{ t: adesso, v: p.saldo }]);
    return { punti: punti, inizio: inizio, da: da };
  }

  function variazioneDetta(prima, dopo) {
    var d = dopo - prima;
    var pct = prima > 0 ? (d / prima) * 100 : null;
    var su = d >= 0;
    return '<span class="wl-mossa ' + (su ? 'su' : 'giu') + '">' + (su ? '▲ +' : '▼ −') + soldi(Math.abs(d)) +
      // Oltre il mille per cento la percentuale non dice piu' niente: si tace.
      (pct !== null && Math.abs(pct) < 1000 ? ' (' + (su ? '+' : '−') + numeroIt(Math.abs(pct), Math.abs(pct) < 10 ? 1 : 0) + '%)' : '') + '</span>';
  }

  function disegnaPortafoglioGiocatore() {
    if (!pf) return;
    var serie = serieDelSaldo(pf, periodoPf);
    var altra = inEuro ? 'L. ' + conPuntini(pf.saldo) : euroIt(pf.saldo);
    $('wl-carta').innerHTML =
      '<div class="wl-sopra"><small>Il tuo portafoglio DaProd</small><button class="wl-valuta" id="wl-valuta" title="Lire o euro">' + (inEuro ? '€ ⇄ L' : 'L ⇄ €') + '</button></div>' +
      '<div class="wl-tanto" id="wl-tanto" role="button" title="Tocca per cambiare valuta">' + soldi(pf.saldo) + '</div>' +
      '<div class="wl-sotto">' + variazioneDetta(serie.inizio, pf.saldo) + '<small>' + NOMI_PERIODO[periodoPf] + '</small></div>' +
      '<div class="wl-altra">' + sicuro(altra) + '</div>' +
      '<div class="pf-livello"><span class="liv">liv. ' + pf.livello + '</span><div class="barra"><i style="width:' + Math.round(pf.versoIlProssimo * 100) + '%"></i></div>' +
      '<small>' + Math.round(pf.versoIlProssimo * 100) + '% al ' + (pf.livello + 1) + '</small></div>';
    var bottoni = document.querySelectorAll('[data-periodo]');
    for (var i = 0; i < bottoni.length; i++) bottoni[i].classList.toggle('scelto', bottoni[i].getAttribute('data-periodo') === periodoPf);
    $('wl-grafico').innerHTML = graficoLinea(serie.punti, { vuoto: 'Nessun movimento ' + NOMI_PERIODO[periodoPf] + '.' });

    // Nel periodo: quanto e' entrato, quanto e' uscito, quante partite.
    var dentroMov = (pf.movimenti || []).filter(function (m) { return !serie.da || m.quando >= serie.da; });
    var entrate = 0, uscite = 0, gruppi = {};
    dentroMov.forEach(function (m) {
      if (m.lire > 0) entrate += m.lire; else uscite -= m.lire;
      var c = categoriaDi(m.perche);
      var g = gruppi[c.nome] || (gruppi[c.nome] = { nome: c.nome, ico: c.ico, piu: 0, meno: 0, volte: 0 });
      if (m.lire > 0) g.piu += m.lire; else g.meno -= m.lire;
      g.volte += 1;
    });
    $('wl-riassunto').innerHTML =
      '<div class="wl-pillola su"><small>entrate</small><b>+' + soldi(entrate) + '</b></div>' +
      '<div class="wl-pillola giu"><small>uscite</small><b>−' + soldi(uscite) + '</b></div>' +
      '<div class="wl-pillola"><small>movimenti</small><b>' + dentroMov.length + '</b></div>';

    // Le posizioni: le lire in tasca, e ogni gioco come un titolo.
    var h = '<div class="wl-pos"><span class="ico">💶</span><div class="chi"><b>Lire in tasca</b><small>' + sicuro(altra) + '</small></div>' +
      '<div class="quanto"><b>' + soldi(pf.saldo) + '</b>' + variazioneDetta(serie.inizio, pf.saldo) + '</div></div>';
    pf.giochi.forEach(function (g) {
      var r = g.resa;
      var inSala = giocoDellaSala(g.id);
      var dentro = inSala && inSala.messo ? '<small>nella partita aperta: messe ' + soldi(inSala.messo) + '</small>' : '';
      h += '<div class="wl-pos"><span class="ico">' + (ICONE_SALA[g.id] || '🎮') + '</span>' +
        '<div class="chi"><b>' + sicuro(g.nome) + '</b><small>messe ' + soldi(g.messo) + ' · tornate ' + soldi(g.tornato) + '</small>' + dentro +
        barretta(g.messo > 0 ? g.tornato / Math.max(g.messo, g.tornato) : 0, r !== null && r >= 0 ? '#3dff8a' : '#ffb454') + '</div>' +
        '<div class="quanto"><b>' + (g.partite ? g.partite + (g.partite === 1 ? ' partita' : ' partite') : 'mai giocato') + '</b>' +
        '<span class="wl-mossa ' + (r === null ? '' : r >= 0 ? 'su' : 'giu') + '">' + (r === null ? '—' : (r > 0 ? '+' : '') + numeroIt(r, 1) + '%') + '</span>' +
        (g.finite ? '<small>finite ' + g.finite + (g.record ? ' · record ' + numeroIt(g.record, 0) + ' min' : '') + '</small>' : '') + '</div></div>';
    });
    if (sala && sala.partita && sala.partita.punti > 0) {
      h += '<div class="wl-pos"><span class="ico">🎰</span><div class="chi"><b>Punti di Fortuna</b><small>si incassano alla quota della Lira</small></div>' +
        '<div class="quanto"><b>' + cortoIt(sala.partita.punti) + ' pt</b><small>valgono ' + soldi(sala.staccando) + '</small></div></div>';
    }
    $('wl-posizioni').innerHTML = h;

    var lista = Object.keys(gruppi).map(function (k) { return gruppi[k]; })
      .sort(function (a, b) { return (b.piu + b.meno) - (a.piu + a.meno); });
    var massimo = Math.max(1, entrate, uscite);
    $('wl-flussi').innerHTML = lista.length ? lista.map(function (g) {
      var netto = g.piu - g.meno;
      return '<div class="wl-flusso"><span class="ico">' + g.ico + '</span><div class="chi"><b>' + sicuro(g.nome) + '</b>' +
        '<small>' + g.volte + (g.volte === 1 ? ' volta' : ' volte') + '</small>' +
        (g.piu ? barretta(g.piu / massimo, '#3dff8a') : '') + (g.meno ? barretta(g.meno / massimo, '#ff5c6c') : '') + '</div>' +
        '<b class="' + (netto >= 0 ? 'su' : 'giu') + '">' + (netto >= 0 ? '+' : '−') + soldi(Math.abs(netto)) + '</b></div>';
    }).join('') : '<div class="pf-vuoto">Niente ' + NOMI_PERIODO[periodoPf] + '.</div>';

    $('wl-movimenti').innerHTML = dentroMov.length ? dentroMov.slice(0, 60).map(function (m) {
      var piu = m.lire > 0, c = categoriaDi(m.perche);
      return '<div class="wl-mov"><span class="ico">' + c.ico + '</span><div class="chi"><b>' + sicuro(m.perche || c.nome) + '</b><small>' + sicuro(oraCorta(m.quando)) + ' · saldo ' + soldi(m.saldo) + '</small></div>' +
        '<b class="' + (piu ? 'su' : 'giu') + '">' + (piu ? '+' : '−') + soldi(Math.abs(m.lire)) + '</b></div>';
    }).join('') : '<div class="pf-vuoto">Nessun movimento ' + NOMI_PERIODO[periodoPf] + '.</div>';

    var borsaViva = Boolean(sala && sala.partita && (sala.partita.punti > 0 || (io && io.admin)));
    $('wl-borsa').hidden = !borsaViva;
    if (borsaViva) disegnaBorsa();
  }

  function caricaPortafoglioGiocatore() {
    return chiedi('GET', '/portafoglio').then(function (p) {
      pf = p;
      if (io && typeof p.saldo === 'number' && p.saldo !== io.saldo) { io.saldo = p.saldo; disegnaSaldo(false); }
      if (viva('p-portafoglio')) disegnaPortafoglioGiocatore();
      if (viva('p-sala')) disegnaStatisticheSala();
      return p;
    }).catch(function (e) { avviso(e.message, 'male'); return null; });
  }

  /* --------------------------- le statistiche della sala (1.4.9) */

  /**
   * Sotto ai giochi, al posto dei quadrati: la tua settimana (la linea, e come
   * sono andati i giochi), e per chi comanda l'andamento di tutta la sala.
   */
  var andamento = null;
  function disegnaStatisticheSala() {
    var dove = $('sala-stat');
    if (!dove) return;
    if (!pf) { dove.innerHTML = ''; return; }
    var serie = serieDelSaldo(pf, '7g');
    var settimana = (pf.movimenti || []).filter(function (m) { return m.quando >= Date.now() - 7 * GIORNO; });
    var messe = 0, tornate = 0;
    settimana.forEach(function (m) {
      var c = categoriaDi(m.perche).nome;
      if (c === 'Ricariche nei giochi') messe -= m.lire;
      if (c === 'Incassi dai giochi' || c === 'Premi di fine partita') tornate += m.lire;
    });
    var migliore = pf.giochi.filter(function (g) { return g.messo > 0 || g.tornato > 0; })
      .sort(function (a, b) { return (b.tornato - b.messo) - (a.tornato - a.messo); })[0];
    var h = '<div class="stat-carta"><div class="stat-testa"><div><small>La tua settimana</small><b>' + soldi(pf.saldo) + '</b></div>' +
      variazioneDetta(serie.inizio, pf.saldo) + '</div>' +
      '<div class="stat-grafico">' + graficoLinea(serie.punti, { alto: 130, vuoto: 'Questa settimana non hai ancora giocato.' }) + '</div>' +
      '<div class="stat-riga">' +
      '<span><small>messe nei giochi</small><b>' + soldi(messe) + '</b></span>' +
      '<span><small>tornate</small><b class="' + (tornate >= messe ? 'su' : 'giu') + '">' + soldi(tornate) + '</b></span>' +
      '<span><small>il tuo gioco migliore</small><b>' + (migliore ? (ICONE_SALA[migliore.id] || '') + ' ' + sicuro(migliore.nome) : '—') + '</b></span>' +
      '</div><button class="link" data-va="portafoglio">apri il portafoglio &#8594;</button></div>';
    dove.innerHTML = h;
    var ad = $('sala-admin');
    if (ad) {
      ad.hidden = !(io && io.admin);
      if (io && io.admin) caricaAndamento();
    }
  }

  function caricaAndamento() {
    return chiedi('GET', '/andamento').then(function (a) { andamento = a; disegnaAndamento(); return a; }).catch(function () { return null; });
  }

  function disegnaAndamento() {
    var dove = $('sala-admin');
    if (!dove || !andamento) return;
    var a = andamento, t = a.totale;
    var serie = [
      { chiave: 'ricariche', nome: 'ricariche', colore: '#3ddbff', come: soldi },
      { chiave: 'incassi', nome: 'incassi e premi', colore: '#ffd166', come: soldi },
      { chiave: 'studio', nome: 'Studio', colore: '#b07cff', come: soldi },
    ];
    var guadagno = t.ricariche - t.incassi;
    var h = '<div class="stat-carta admin"><div class="stat-testa"><div><small>L andamento della sala · 14 giorni</small>' +
      '<b class="' + (guadagno >= 0 ? 'su' : 'giu') + '">' + (guadagno >= 0 ? '+' : '−') + soldi(Math.abs(guadagno)) + '</b><small>ricariche meno incassi: quello che resta alla casa</small></div></div>' +
      '<div class="stat-grafico">' + graficoBarre(a.giorni, serie, { alto: 150 }) + '</div>' + leggenda(serie) +
      '<div class="stat-grafico piccolo">' + graficoBarre(a.giorni, [{ chiave: 'giocatori', nome: 'giocatori', colore: '#3dff8a', come: function (v) { return v + ' persone'; } }], { alto: 70 }) + '</div>' +
      '<div class="stat-riga">' +
      '<span><small>giocatori</small><b>' + t.giocatori + '</b></span>' +
      '<span><small>attivi in 7 giorni</small><b>' + t.attivi7 + '</b></span>' +
      '<span><small>lire in tasca a tutti</small><b>' + soldi(t.saldi) + '</b></span>' +
      '<span><small>riserva della Banca</small><b>' + soldi(a.banca.riserva) + '</b></span>' +
      '<span><small>fette DaProd</small><b>' + soldi(t.fette) + '</b></span>' +
      '<span><small>montepremi pagati</small><b>' + soldi(a.banca.premiFine || 0) + '</b></span>' +
      '</div><div class="stat-giochi">' + a.giochi.map(function (g) {
        var casa = g.messo - g.tornato;
        return '<div class="wl-pos"><span class="ico">' + (ICONE_SALA[g.id] || '🎮') + '</span><div class="chi"><b>' + sicuro(g.nome) + '</b>' +
          '<small>' + g.giocatori + (g.giocatori === 1 ? ' giocatore' : ' giocatori') + ' · ' + g.partite + ' partite · ' + g.finite + ' finite' + (g.record ? ' · record ' + numeroIt(g.record, 0) + ' min' : '') + '</small>' +
          barretta(g.messo > 0 ? g.tornato / Math.max(g.messo, g.tornato) : 0, casa >= 0 ? '#3dff8a' : '#ff5c6c') + '</div>' +
          '<div class="quanto"><b class="' + (casa >= 0 ? 'su' : 'giu') + '">' + (casa >= 0 ? '+' : '−') + soldi(Math.abs(casa)) + '</b><small>alla casa</small></div></div>';
      }).join('') + '</div></div>';
    dove.innerHTML = h;
  }

  /* ------------------------------------------- il resoconto (1.4.9) */

  var CHIAVE_VISITA = 'daprod.sala.ultimaVisita';
  var resocontoFatto = false;

  /** Quanto tempo fa, detto come si dice: «3 ore fa», «ieri», «5 giorni fa». */
  function tempoFa(ms) {
    var min = Math.round(ms / 60000);
    if (min < 2) return 'un attimo fa';
    if (min < 60) return min + ' minuti fa';
    var ore = Math.round(min / 60);
    if (ore < 24) return ore === 1 ? 'un ora fa' : ore + ' ore fa';
    var giorni = Math.round(ore / 24);
    return giorni === 1 ? 'ieri' : giorni + ' giorni fa';
  }

  /**
   * All'apertura: cosa e' cambiato dall'ultima volta. Il saldo, e da dove
   * vengono le differenze — regali dalla cassa, premi della Banca, incassi,
   * spese — e il livello. La prima volta, un benvenuto.
   */
  function mostraResoconto() {
    if (resocontoFatto || !io) return;
    resocontoFatto = true;
    var prima = null;
    try { prima = JSON.parse(localStorage.getItem(CHIAVE_VISITA) || 'null'); } catch (e) {}
    var livello = io.conto ? conteggioLivello(io.conto.esperienza).livello : 1;
    // L'ora si prende adesso, insieme al saldo: il prossimo resoconto parte da qui.
    var adesso = Date.now(), saldoAdesso = io.saldo;
    var ricorda = function () {
      try { localStorage.setItem(CHIAVE_VISITA, JSON.stringify({ quando: adesso, saldo: saldoAdesso, livello: livello })); } catch (e) {}
    };
    chiedi('GET', '/portafoglio').then(function (p) {
      pf = p;
      var h;
      if (!prima) {
        h = '<small class="resoconto-su">Benvenuto nella sala DaProd</small><h2 id="resoconto-titolo">Ciao ' + sicuro(io.nome || '') + '!</h2>' +
          '<div class="resoconto-tanto">' + soldi(io.saldo) + '</div><p class="spiega">Le lire sono la moneta della sala: ricarichi i giochi, incassi quello che vinci. ' +
          'Tocca il saldo in alto per vederle in euro.</p>';
      } else {
        var nuovi = (p.movimenti || []).filter(function (m) { return m.quando > prima.quando; });
        var gruppi = {};
        nuovi.forEach(function (m) {
          var c = categoriaDi(m.perche);
          var g = gruppi[c.nome] || (gruppi[c.nome] = { nome: c.nome, ico: c.ico, lire: 0, volte: 0 });
          g.lire += m.lire;
          g.volte += 1;
        });
        var differenza = io.saldo - (typeof prima.saldo === 'number' ? prima.saldo : io.saldo);
        var righe = Object.keys(gruppi).map(function (k) { return gruppi[k]; }).sort(function (a, b) { return Math.abs(b.lire) - Math.abs(a.lire); });
        h = '<small class="resoconto-su">Dall ultima volta · ' + sicuro(tempoFa(Date.now() - prima.quando)) + '</small>' +
          '<h2 id="resoconto-titolo">Bentornato, ' + sicuro(io.nome || '') + '</h2>' +
          '<div class="resoconto-tanto">' + soldi(io.saldo) + '</div>' +
          '<div class="resoconto-mossa">' + variazioneDetta(prima.saldo || 0, io.saldo) + '</div>' +
          (righe.length ? '<div class="resoconto-righe">' + righe.map(function (g) {
            return '<div class="wl-mov"><span class="ico">' + g.ico + '</span><div class="chi"><b>' + sicuro(g.nome) + '</b><small>' + g.volte + (g.volte === 1 ? ' volta' : ' volte') + '</small></div>' +
              '<b class="' + (g.lire >= 0 ? 'su' : 'giu') + '">' + (g.lire >= 0 ? '+' : '−') + soldi(Math.abs(g.lire)) + '</b></div>';
          }).join('') + '</div>' : '<p class="spiega">' + (differenza ? '' : 'Tutto com era: nessun movimento.') + '</p>') +
          (livello > (prima.livello || livello) ? '<div class="resoconto-livello">⭐ Sei salito al livello ' + livello + '</div>' : '');
      }
      // Il regalo della cassa, se e' arrivato da allora: con il suo perche'.
      var r = io.regalo;
      if (r && r.quanto && (!prima || r.quando > prima.quando)) {
        h += '<div class="resoconto-regalo"><span>' + (r.quanto > 0 ? '💌' : '🧹') + '</span><div><b>' +
          (r.quanto > 0 ? 'Dalla cassa DaProd: +' + soldi(r.quanto) : 'Il portafoglio è stato azzerato') + '</b>' +
          (r.perche ? '<small>' + sicuro(r.perche) + '</small>' : '') + '</div></div>';
      }
      $('resoconto-dentro').innerHTML = h;
      $('resoconto').hidden = false;
      if (prima && io.saldo > (prima.saldo || 0) && typeof coriandoli === 'function') coriandoli(40, ['#ffd166', '#3dff8a', '#ffffff']);
      ricorda();
    }).catch(function () { ricorda(); });
  }

  // Ogni volta che si lascia la pagina si tiene il punto: il prossimo resoconto parte da qui.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden || !io) return;
    try { localStorage.setItem(CHIAVE_VISITA, JSON.stringify({ quando: Date.now(), saldo: io.saldo, livello: io.conto ? conteggioLivello(io.conto.esperienza).livello : 1 })); } catch (e) {}
  });

  /* ------------------------------------------------ le casse DaProd (1.4.8) */

  var FORZIERI = { giorno: '🎁', settimana: '🏆', mese: '💎' };
  var STEMMI = ['🐷', '🍺', '🏪', '🏦', '🏛️', '👑'];
  /** Quanto si alza un forziere a un tocco: tagli in euro, come le ricariche. */
  var ALZA_EURO = [5, 20, 50];

  function disegnaCasse() {
    if (!sala || !sala.banca) return;
    var b = sala.banca, g = b.grado;
    $('cs-grado').innerHTML = '<div class="stemma">' + (STEMMI[g.livello - 1] || '🏦') + '</div>' +
      '<b>' + sicuro(g.nome) + '</b>' +
      '<small>grado ' + g.livello + ' della Banca DaProd · ' + soldi(b.entrate) + ' passate di qui</small>' +
      '<div class="barra"><i style="width:' + Math.round(g.verso * 100) + '%"></i></div>' +
      '<small>' + (g.prossimo ? 'al prossimo grado mancano ' + soldi(Math.max(0, g.prossimo - b.entrate)) : 'il grado piu alto: la zecca e tua') + '</small>';
    $('cs-numeri').innerHTML =
      cifra(soldi(b.riserva), 'nella riserva · ' + euroIt(b.riserva)) +
      cifra(soldi(b.entrate), 'entrate da sempre') +
      cifra(soldi(b.pagate), 'tornate ai giocatori') +
      cifra(soldi(b.fette || 0), 'fette DaProd dai giochi');
    $('cs-forzieri').innerHTML = b.cassetti.map(function (c) {
      var ore = Math.floor(c.fraMs / 3600000), min = Math.floor((c.fraMs % 3600000) / 60000);
      return '<div class="cs-forziere"><span class="ico">' + (FORZIERI[c.cassetto] || '🎁') + '</span>' +
        '<small>' + sicuro(c.nome) + '</small><b>' + soldi(c.lire) + '</b>' +
        '<small>si apre fra ' + (ore ? ore + ' h ' : '') + min + ' min · ' + c.quanti + (c.quanti === 1 ? ' persona in gara' : ' persone in gara') + '</small>' +
        '<div class="tasti">' + ALZA_EURO.map(function (e) {
          var l = Math.round(e * sala.euro.lirePerEuro);
          return '<button data-alza="' + c.cassetto + ':' + l + '"' + (l > b.riserva ? ' disabled' : '') + '>+€ ' + e + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    var nomi = {};
    b.cassetti.forEach(function (c) { nomi[c.cassetto] = c.nome; });
    $('cs-premi').innerHTML = (b.ultime || []).length ? b.ultime.map(function (a) {
      var tot = a.montepremi || (a.vincite || []).reduce(function (s, v) { return s + v.lire; }, 0);
      var n = (a.vincite || []).length;
      return '<div class="pf-mov"><span class="cosa">' + sicuro(nomi[a.cassetto] || a.cassetto) + ' · ' + n + (n === 1 ? ' vincitore' : ' vincitori') + '</span>' +
        '<span class="quanto su">' + soldi(tot) + '</span><small>' + quando(a.quando) + '</small><small class="dx">' + sicuro(a.chiave || '') + '</small></div>';
    }).join('') : '<div class="pf-vuoto">Nessun forziere aperto ancora.</div>';
  }

  function alzaForziere(cassetto, lire) {
    chiedi('POST', '/banca/alza', { cassetto: cassetto, lire: lire }).then(function (r) {
      if (sala) sala.banca = r.banca;
      avviso('Il forziere sale di ' + soldi(r.spostate) + '. Chi gioca lo vede subito.', 'bene');
      if (typeof coriandoli === 'function') coriandoli(30, ['#ffd166', '#fff1b8', '#b07cff']);
      disegnaCasse();
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    var alza = qui('[data-alza]');
    if (alza) {
      var parti = alza.getAttribute('data-alza').split(':');
      alzaForziere(parti[0], Number(parti[1]));
      return;
    }
    if (qui('#cs-versa')) { versaNellaRiserva(); return; }
    var per = qui('[data-periodo]');
    if (per) {
      periodoPf = per.getAttribute('data-periodo');
      try { localStorage.setItem('daprod.sala.periodo', periodoPf); } catch (e) {}
      disegnaPortafoglioGiocatore();
      return;
    }
    if (qui('#wl-valuta') || qui('#wl-tanto')) { cambiaValuta(); return; }
    if (qui('#resoconto-ok') || b.id === 'resoconto') { $('resoconto').hidden = true; return; }
  });

  var vaiAPortafoglio = vaiA;
  vaiA = function (dove) {
    vaiAPortafoglio(dove);
    if (dove === 'portafoglio') caricaPortafoglioGiocatore();
    if (dove === 'sala') caricaPortafoglioGiocatore();
    if (dove === 'casse') caricaSala().then(disegnaCasse);
  };

  // Il portafoglio si riguarda da solo (1.4.9: «non sempre e' aggiornato"):
  // ogni venti secondi se lo stai guardando, e quando torni sulla pagina.
  setInterval(function () {
    if (document.hidden) return;
    if (viva('p-portafoglio') || viva('p-sala')) caricaPortafoglioGiocatore();
  }, 20000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && (viva('p-portafoglio') || viva('p-sala'))) caricaPortafoglioGiocatore();
  });
  allaValuta.push(function () {
    if (viva('p-portafoglio')) disegnaPortafoglioGiocatore();
    if (viva('p-sala')) { disegnaStatisticheSala(); disegnaAndamento(); }
    if (viva('p-casse')) disegnaCasse();
    if (viva('p-home')) disegnaHome();
  });
`;
