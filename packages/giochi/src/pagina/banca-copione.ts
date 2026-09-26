/**
 * Il copione della Banca DaProd di chi comanda (1.5.1). Gira dentro lo stesso
 * blocco degli altri copioni, dopo quello della sala: usa i loro attrezzi
 * (chiedi, soldi, soldiPieni, sicuro, avviso, quando, chiediQualcosa, domanda,
 * rigaConto, viva) invece di rifarli.
 *
 * Ogni gesto chiede conferma dicendo cosa succede, e il PC lo scrive nel
 * registro con chi l'ha fatto (vedi `gestione.ts`).
 *
 * Stesse regole: una stringa sola, niente apici inversi e niente barre
 * rovesciate.
 */
export const COPIONE_BANCA = `
  /* ------------------------------------------------ la banca (1.5.1) */

  var bk = null;
  var bkScheda = 'controllo';
  var bkCerca = '';
  var bkAperto = '';

  function caricaBanca() {
    return chiedi('GET', '/banca/gestione').then(function (g) {
      bk = g;
      if (viva('p-banca')) disegnaBanca();
      segnaPallinoBanca();
      return g;
    }).catch(function (e) { if (viva('p-banca')) avviso(e.message, 'male'); return null; });
  }

  /** Il pallino rosso sulla scheda Banca: incassi da controllare. */
  function segnaPallinoBanca() {
    var t = document.querySelector('[data-va="banca"]');
    if (!t || !bk) return;
    var p = t.querySelector('.pallino');
    if (!p) { p = document.createElement('span'); p.className = 'pallino'; t.appendChild(p); }
    p.hidden = !(bk.daControllare > 0);
    p.textContent = bk.daControllare > 0 ? String(bk.daControllare) : '';
  }

  /**
   * Da testo a lire. Si scrive nella valuta scelta (euro se la sala e' in
   * euro): «20», «1,5k», «2M», «€ 5», «L. 9.681». Torna NaN se non si capisce.
   */
  function leggiSoldi(testo) {
    var t = String(testo || '').trim().toLowerCase();
    if (!t) return NaN;
    var euro = inEuro;
    if (t.indexOf('€') >= 0 || t.indexOf('eur') >= 0) euro = true;
    if (t.indexOf('l.') === 0 || t.indexOf('lire') >= 0) euro = false;
    var segno = /^[^0-9]*-/.test(t) ? -1 : 1;
    var molt = 1;
    if (/mld|b$/.test(t)) molt = 1e9; else if (/m$/.test(t)) molt = 1e6; else if (/k$/.test(t)) molt = 1e3;
    var num = t.replace(/[^0-9,.]/g, '');
    // «1.234.567» sono puntini delle migliaia; «1,5» e' una virgola.
    if ((num.match(/[.]/g) || []).length > 1 || /[.][0-9]{3}$/.test(num)) num = num.replace(/[.]/g, '');
    num = num.replace(',', '.');
    var v = parseFloat(num);
    if (!isFinite(v)) return NaN;
    v = v * molt * segno;
    return Math.round(euro ? v * 1936.27 : v);
  }

  function valutaDetta() { return inEuro ? 'in euro (per esempio 20 o 1,5k)' : 'in lire (per esempio 38.725 o 2M)'; }

  function disegnaBanca() {
    if (!bk) return;
    var fermi = bk.daControllare;
    var guasti = bk.conti.filter(function (c) { return c.guasti.length; }).length;
    $('bk-testa').innerHTML =
      '<div class="bk-titolo"><div><b>🏦 Banca DaProd</b><small>Tutti i soldi della sala, e i gesti per rimetterli a posto.</small></div>' +
        '<button class="btn piano" id="bk-ripara" title="Rimette dritti i numeri storti">🔧 Ripara tutto</button></div>' +
      '<div class="bk-numeri">' +
        '<div class="bk-num oro"><small>nei portafogli</small><b>' + soldi(bk.circolante) + '</b></div>' +
        '<div class="bk-num"><small>dentro i giochi</small><b>' + soldi(bk.neiGiochi) + '</b></div>' +
        '<div class="bk-num"><small>riserva DaProd</small><b>' + soldi(bk.banca.riserva) + '</b></div>' +
        '<div class="bk-num' + (fermi ? ' allarme' : '') + '"><small>da controllare</small><b>' + (fermi ? fermi + ' · ' + soldi(bk.daControllareLire) : 'niente') + '</b></div>' +
        (guasti ? '<div class="bk-num allarme"><small>conti con numeri storti</small><b>' + guasti + '</b></div>' : '') +
      '</div>';
    var schede = document.querySelectorAll('[data-bk]');
    for (var i = 0; i < schede.length; i++) {
      var s = schede[i].getAttribute('data-bk');
      schede[i].classList.toggle('scelto', s === bkScheda);
      if (s === 'controllo') schede[i].innerHTML = 'Da controllare' + (fermi ? '<span class="pallino">' + fermi + '</span>' : '');
    }
    var h = '';
    if (bkScheda === 'controllo') h = htmlControllo();
    else if (bkScheda === 'conti') h = htmlConti();
    else if (bkScheda === 'regole') h = htmlRegole();
    else h = htmlRegistro();
    $('bk-dentro').innerHTML = h;
  }

  function nomeDiConto(chi) {
    var c = bk.conti.filter(function (x) { return x.chi === chi; })[0];
    return c ? c.nome : chi;
  }

  function htmlControllo() {
    var righe = [];
    bk.conti.forEach(function (c) { c.inControllo.forEach(function (f) { righe.push({ c: c, f: f }); }); });
    if (!righe.length) {
      return '<div class="pf-vuoto">Niente da controllare. Un incasso finisce qui quando è più di ' +
        bk.regole.controllaVolte + ' volte quello messo e sopra € ' + puntiIt(bk.regole.controllaMinEuro) + ': di solito vuol dire un gioco che si è rotto.</div>';
    }
    return '<div class="bk-lista">' + righe.map(function (x) {
      var f = x.f;
      var volte = f.messo > 0 ? ' (' + cortoIt(f.netto / f.messo) + ' volte)' : '';
      return '<div class="bk-carta">' +
        '<div class="bk-chi"><span class="faccia"' + (x.c.faccia ? ' style="background-image:url(' + sicuro(x.c.faccia) + ')"' : '') + '>' + (x.c.faccia ? '' : sicuro((x.c.nome || '?').slice(0, 1))) + '</span>' +
          '<div><b>' + sicuro(x.c.nome) + ' · ' + sicuro(f.gioco) + '</b><small>' + quando(f.quando) + (f.finita ? ' · finito' : '') + '</small></div>' +
          '<div class="bk-saldo">' + soldi(f.netto) + '<small>da pagare</small></div></div>' +
        '<div class="conti-righe">' + rigaConto('aveva messo', soldiPieni(f.messo)) + rigaConto('il gioco diceva', cortoIt(f.grezzo)) +
          rigaConto('incasso', soldiPieni(f.netto) + volte, 'tot') + '</div>' +
        '<div class="bk-tasti">' +
          '<button class="btn oro" data-bk-controllo="paga" data-chi="' + sicuro(x.c.chi) + '" data-id="' + sicuro(f.id) + '">Paga tutto</button>' +
          '<button class="btn cyan" data-bk-controllo="rimborsa" data-chi="' + sicuro(x.c.chi) + '" data-id="' + sicuro(f.id) + '">Rimborsa il messo</button>' +
          '<button class="btn piano" data-bk-controllo="rifiuta" data-chi="' + sicuro(x.c.chi) + '" data-id="' + sicuro(f.id) + '">Rifiuta</button>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  function htmlConti() {
    var q = bkCerca.trim().toLowerCase();
    var lista = bk.conti.filter(function (c) { return !q || String(c.nome).toLowerCase().indexOf(q) >= 0; });
    var h = '<input class="cerca" id="bk-cerca" type="search" placeholder="cerca una persona" value="' + sicuro(bkCerca) + '">';
    if (!lista.length) return h + '<div class="pf-vuoto">Nessuno con questo nome.</div>';
    return h + '<div class="bk-lista">' + lista.map(function (c) {
      var aperto = bkAperto === c.chi;
      var chip = c.aperte.map(function (a) {
        return '<span>🎮 ' + sicuro(a.nome) + ' · ' + soldi(a.messo) + ' da ' + quando(a.inizio).replace(' fa', '') + '</span>';
      }).join('') + c.guasti.map(function (g) { return '<span class="rosso">⚠ ' + sicuro(g) + '</span>'; }).join('') +
        (c.inControllo.length ? '<span class="rosso">⏳ ' + c.inControllo.length + ' in controllo</span>' : '');
      var h2 = '<div class="bk-carta' + (c.guasti.length ? ' guasto' : '') + '">' +
        '<div class="bk-chi"><span class="faccia"' + (c.faccia ? ' style="background-image:url(' + sicuro(c.faccia) + ')"' : '') + '>' + (c.faccia ? '' : sicuro((c.nome || '?').slice(0, 1))) + '</span>' +
          '<div><b>' + sicuro(c.nome) + (c.io ? ' <i class="sei-tu">tu</i>' : '') + '</b><small>livello ' + c.livello + ' · premi presi fino al ' + c.livelloPagato +
            ' · giochi: messe ' + soldi(c.messoGiochi) + ', prese ' + soldi(c.presoGiochi) + '</small></div>' +
          '<div class="bk-saldo">' + soldi(c.saldo) + '<small>' + euroIt(c.saldo) + '</small></div></div>' +
        (chip ? '<div class="bk-chip">' + chip + '</div>' : '') +
        '<div class="bk-tasti">' +
          '<button class="btn oro" data-bk-saldo="imposta" data-chi="' + sicuro(c.chi) + '">Metti il saldo a…</button>' +
          '<button class="btn cyan" data-bk-saldo="muovi" data-chi="' + sicuro(c.chi) + '">Aggiungi o togli</button>' +
          c.aperte.map(function (a) {
            return '<button class="btn" data-bk-partita="rimborsa" data-chi="' + sicuro(c.chi) + '" data-gioco="' + sicuro(a.gioco) + '">Rimborsa ' + sicuro(a.nome) + '</button>' +
              '<button class="btn piano" data-bk-partita="chiudi" data-chi="' + sicuro(c.chi) + '" data-gioco="' + sicuro(a.gioco) + '">Chiudi ' + sicuro(a.nome) + '</button>';
          }).join('') +
          '<button class="btn piano" data-bk-livelli="' + sicuro(c.chi) + '">Premi livelli</button>' +
          '<button class="btn piano" data-bk-apri="' + sicuro(c.chi) + '">' + (aperto ? 'Chiudi i movimenti' : 'Movimenti') + '</button>' +
        '</div>';
      if (aperto) {
        h2 += '<div class="bk-lista">' + (c.movimenti.length ? c.movimenti.map(function (m) {
          var annullabile = !m.annullato && m.perche.indexOf('annullato:') !== 0;
          return '<div class="bk-mov' + (m.annullato ? ' annullato' : '') + '"><span class="cosa">' + sicuro(m.perche) + '<small>' + quando(m.quando) + ' · saldo ' + soldi(m.saldo) + '</small></span>' +
            '<span class="quanto ' + (m.lire >= 0 ? 'su' : 'giu') + '">' + (m.lire >= 0 ? '+' : '') + soldi(m.lire) + '</span>' +
            (annullabile ? '<button data-bk-annulla="' + sicuro(c.chi) + '" data-quando="' + m.quando + '" data-lire="' + m.lire + '">annulla</button>' : '<span></span>') + '</div>';
        }).join('') : '<div class="pf-vuoto">Nessun movimento.</div>') + '</div>';
      }
      return h2 + '</div>';
    }).join('') + '</div>';
  }

  var REGOLE_DETTE = [
    ['resaMin', 'Resa di chi smette subito', 'Claw e Neon: quanto di quello messo si riprende chi incassa appena entrato. 0,5 vuol dire la metà.'],
    ['resaMax', 'Resa a punteggio pieno', 'Quante volte quello messo rende chi va fino in fondo col punteggio.'],
    ['baseEuro', 'Paga di chi gioca e basta (€)', 'Quanto si porta a casa, a punteggio pieno, anche senza aver ricaricato.'],
    ['moltFine', 'Moltiplicatore di chi finisce', 'Finire Claw (tutta la collezione) o Neon (il Vesuvio) moltiplica tutto per questo.'],
    ['controllaVolte', 'Campanello: volte quello messo', 'Un incasso più grande di tante volte quello messo aspetta qui. 0 = mai.'],
    ['controllaMinEuro', 'Campanello: sopra quanti €', 'Sotto questa cifra il campanello non suona mai.'],
    ['premioLivelloEuro', 'Premio dei livelli (€ per livello)', 'Il livello 5 dà 5 volte questo, il 10 dieci volte.'],
  ];

  function htmlRegole() {
    var r = bk.regole;
    var prova = function (messo, prog) { return messo * (r.resaMin + (r.resaMax - r.resaMin) * prog) + r.baseEuro * prog; };
    return '<div class="bk-regole">' + REGOLE_DETTE.map(function (x) {
      return '<label class="bk-regola"><span><b>' + sicuro(x[1]) + '</b><small>' + sicuro(x[2]) + '</small></span>' +
        '<input type="number" step="any" min="0" data-bk-regola="' + x[0] + '" value="' + r[x[0]] + '"></label>';
    }).join('') +
      '<div class="bk-prova">Con queste regole, chi mette <b>€ 100</b> in Neon e incassa: subito ≈ <b>€ ' + puntiIt(prova(100, 0)) + '</b>, a metà ≈ <b>€ ' +
        puntiIt(prova(100, 0.5)) + '</b>, a punteggio pieno ≈ <b>€ ' + puntiIt(prova(100, 1)) + '</b>, finendolo ≈ <b>€ ' + puntiIt(prova(100, 1) * r.moltFine) +
        '</b>. Prima della fetta di DaProd (10%).</div>' +
      '<div class="riga-tasti"><button class="btn oro grosso" id="bk-regole-salva">Salva le regole</button></div></div>';
  }

  function htmlRegistro() {
    if (!bk.registro.length) return '<div class="pf-vuoto">Il registro è vuoto: nessuno ha ancora toccato i soldi a mano.</div>';
    return '<div class="bk-registro">' + bk.registro.map(function (r) {
      return '<div><span>' + sicuro(r.cosa) + '</span><b class="' + ((r.lire || 0) >= 0 ? 'su' : 'giu') + '">' + (r.lire ? ((r.lire > 0 ? '+' : '') + soldi(r.lire)) : '') + '</b>' +
        '<small>' + quando(r.quando) + ' · ' + sicuro(r.nomeDa || r.da) + (r.nomeChi ? ' su ' + sicuro(r.nomeChi) : '') + '</small><small></small></div>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------- i gesti */

  function dopoGesto(detto) {
    if (detto) avviso(detto, 'bene');
    caricaBanca();
    if (typeof caricaSala === 'function') caricaSala();
  }

  function gestoSaldo(chi, come) {
    var nome = nomeDiConto(chi);
    var c = bk.conti.filter(function (x) { return x.chi === chi; })[0];
    var imposta = come === 'imposta';
    chiediQualcosa(imposta ? 'Il saldo di ' + nome : 'Aggiungi o togli a ' + nome,
      (imposta ? 'Adesso ha ' + soldiPieni(c ? c.saldo : 0) + '. A quanto lo metti? ' : 'Adesso ha ' + soldiPieni(c ? c.saldo : 0) + '. Col meno davanti si toglie. ') +
      'Scrivi ' + valutaDetta() + '.', { suggerimento: imposta ? '0' : '-5000', tastoSi: 'Avanti' }).then(function (t) {
      if (t === null) return;
      var lire = leggiSoldi(t);
      if (!isFinite(lire) || (imposta ? lire < 0 : lire === 0)) { avviso('Non ho capito la cifra.', 'male'); return; }
      return chiediQualcosa('Perché?', 'Resta scritto nel registro e nei movimenti di ' + nome + '.', { suggerimento: 'rimborso di un difetto', tastoSi: imposta ? 'Metti ' + soldi(lire) : (lire > 0 ? 'Aggiungi ' : 'Togli ') + soldi(Math.abs(lire)) }).then(function (perche) {
        if (perche === null) return;
        var corpo = { chi: chi, perche: perche };
        if (imposta) corpo.imposta = lire; else corpo.muovi = lire;
        return chiedi('POST', '/banca/saldo', corpo).then(function (r) { dopoGesto('Fatto: ' + nome + ' ha ' + soldiPieni(r.saldo) + '.'); });
      });
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  function gestoPartita(chi, gioco, rimborsa) {
    var nome = nomeDiConto(chi);
    var c = bk.conti.filter(function (x) { return x.chi === chi; })[0];
    var a = c ? c.aperte.filter(function (x) { return x.gioco === gioco; })[0] : null;
    domanda('<div class="chiedi-icona">' + (rimborsa ? '↩️' : '⏹') + '</div><h2 id="chiedi-titolo">' + (rimborsa ? 'Rimborsare' : 'Chiudere') + ' la partita?</h2>' +
      '<div class="conti-righe">' + rigaConto('di', sicuro(nome)) + rigaConto('gioco', sicuro(a ? a.nome : gioco)) + rigaConto('dentro', soldiPieni(a ? a.messo : 0), 'tot') + '</div>' +
      '<p class="chiedi-nota">' + (rimborsa ? 'Le lire messe tornano nel portafoglio e la partita si chiude.' : 'La partita si chiude e le lire messe restano alla Banca.') +
      ' Il gioco, alla prossima apertura, riparte da una partita nuova.</p>', rimborsa ? 'Rimborsa' : 'Chiudi', 'No').then(function (si) {
      if (!si) return;
      chiedi('POST', '/banca/partita', { chi: chi, gioco: gioco, rimborsa: rimborsa })
        .then(function (r) { dopoGesto((rimborsa ? 'Rimborsate ' + soldiPieni(r.messo) : 'Partita chiusa') + ' a ' + nome + '.'); })
        .catch(function (e) { avviso(e.message, 'male'); });
    });
  }

  function gestoControllo(chi, id, esito) {
    var detto = { paga: 'Pagare tutto l incasso?', rimborsa: 'Rimborsare solo quello messo?', rifiuta: 'Rifiutare l incasso?' }[esito];
    domanda('<h2 id="chiedi-titolo">' + detto + '</h2><p class="chiedi-nota">' +
      (esito === 'paga' ? 'Arriva tutto nel portafoglio di ' + sicuro(nomeDiConto(chi)) + ', come un incasso normale.'
        : esito === 'rimborsa' ? 'Torna solo quello che aveva messo nella partita: il resto no.'
        : 'Non arriva niente: la partita resta chiusa.') + '</p>', 'Sì', 'No').then(function (si) {
      if (!si) return;
      chiedi('POST', '/banca/controllo', { chi: chi, id: id, esito: esito })
        .then(function (r) { dopoGesto(esito === 'rifiuta' ? 'Rifiutato.' : 'Fatto: ' + soldiPieni(r.lire) + ' a ' + nomeDiConto(chi) + '.'); })
        .catch(function (e) { avviso(e.message, 'male'); });
    });
  }

  function gestoAnnulla(chi, quandoM, lire) {
    domanda('<h2 id="chiedi-titolo">Annullare il movimento?</h2><p class="chiedi-nota">Si fa il movimento contrario (' +
      (lire >= 0 ? '−' : '+') + soldiPieni(Math.abs(lire)) + ') sul conto di ' + sicuro(nomeDiConto(chi)) + ', e resta scritto.</p>', 'Annulla il movimento', 'No').then(function (si) {
      if (!si) return;
      chiedi('POST', '/banca/annulla', { chi: chi, quando: quandoM, lire: lire })
        .then(function () { dopoGesto('Movimento annullato.'); })
        .catch(function (e) { avviso(e.message, 'male'); });
    });
  }

  function gestoLivelli(chi) {
    var c = bk.conti.filter(function (x) { return x.chi === chi; })[0];
    chiediQualcosa('Premi dei livelli di ' + nomeDiConto(chi),
      'Ha preso i premi fino al livello ' + (c ? c.livelloPagato : 1) + ' (è al ' + (c ? c.livello : 1) + '). Da che livello può riprenderli?',
      { tipo: 'number', valore: String(c ? c.livelloPagato : 1), tastoSi: 'Rimetti' }).then(function (t) {
      if (t === null) return;
      return chiedi('POST', '/banca/livelli', { chi: chi, livello: Number(t) }).then(function () { dopoGesto('Premi dei livelli rimessi.'); });
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  function gestoRipara() {
    domanda('<div class="chiedi-icona">🔧</div><h2 id="chiedi-titolo">Ripara tutto?</h2><p class="chiedi-nota">Passo ogni conto e rimetto dritti i numeri storti: ' +
      'saldi negativi o non numeri, partite coi numeri rotti, incassi in controllo guasti. Quello che torna non lo tocco.</p>', 'Ripara', 'No').then(function (si) {
      if (!si) return;
      chiedi('POST', '/banca/ripara').then(function (r) {
        if (!r.fatti.length) { dopoGesto('Tutto a posto: niente da riparare.'); return; }
        domanda('<h2 id="chiedi-titolo">Riparati ' + r.fatti.length + ' numeri</h2><div class="conti-righe">' +
          r.fatti.slice(0, 20).map(function (f) { return '<div class="riga"><span>' + sicuro(f) + '</span></div>'; }).join('') + '</div>', 'Ok', '', true);
        dopoGesto('');
      }).catch(function (e) { avviso(e.message, 'male'); });
    });
  }

  function salvaRegole() {
    var campi = document.querySelectorAll('[data-bk-regola]');
    var corpo = {};
    for (var i = 0; i < campi.length; i++) corpo[campi[i].getAttribute('data-bk-regola')] = Number(String(campi[i].value).replace(',', '.'));
    chiedi('POST', '/banca/regole', corpo).then(function () { dopoGesto('Regole salvate: valgono dal prossimo incasso.'); })
      .catch(function (e) { avviso(e.message, 'male'); });
  }

  document.addEventListener('click', function (evento) {
    var b = evento.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    var s = qui('[data-bk]');
    if (s) { bkScheda = s.getAttribute('data-bk'); disegnaBanca(); return; }
    if (qui('#bk-ripara')) { gestoRipara(); return; }
    if (qui('#bk-regole-salva')) { salvaRegole(); return; }
    var x = qui('[data-bk-saldo]');
    if (x) { gestoSaldo(x.getAttribute('data-chi'), x.getAttribute('data-bk-saldo')); return; }
    x = qui('[data-bk-partita]');
    if (x) { gestoPartita(x.getAttribute('data-chi'), x.getAttribute('data-gioco'), x.getAttribute('data-bk-partita') === 'rimborsa'); return; }
    x = qui('[data-bk-controllo]');
    if (x) { gestoControllo(x.getAttribute('data-chi'), x.getAttribute('data-id'), x.getAttribute('data-bk-controllo')); return; }
    x = qui('[data-bk-annulla]');
    if (x) { gestoAnnulla(x.getAttribute('data-bk-annulla'), Number(x.getAttribute('data-quando')), Number(x.getAttribute('data-lire'))); return; }
    x = qui('[data-bk-livelli]');
    if (x) { gestoLivelli(x.getAttribute('data-bk-livelli')); return; }
    x = qui('[data-bk-apri]');
    if (x) { var chi = x.getAttribute('data-bk-apri'); bkAperto = bkAperto === chi ? '' : chi; disegnaBanca(); return; }
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'bk-cerca') {
      bkCerca = e.target.value;
      var pos = e.target.selectionStart;
      disegnaBanca();
      var c = $('bk-cerca');
      if (c) { c.focus(); try { c.setSelectionRange(pos, pos); } catch (er) {} }
    }
  });

  var vaiABanca = vaiA;
  vaiA = function (dove) {
    vaiABanca(dove);
    if (dove === 'banca') caricaBanca();
  };
  allaValuta.push(function () { if (viva('p-banca')) disegnaBanca(); });
  // Il pallino degli incassi da controllare, per chi comanda: ogni minuto.
  setInterval(function () { if (!document.hidden && io && io.admin) caricaBanca(); }, 60000);
  setTimeout(function () { if (io && io.admin) caricaBanca(); }, 2500);
`;
