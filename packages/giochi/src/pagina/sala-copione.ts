/**
 * Il copione delle schede Sala e Borsa, della mano e della cornice (1.4.0,
 * CONCETTI.md § 18). Gira **dentro** lo stesso blocco del copione della
 * pagina, dopo di lui: usa i suoi attrezzi — chiedi, soldi, sicuro, avviso,
 * vaiA, disegnaSaldo — invece di rifarli.
 *
 * Il ponte coi giochi: ogni gioco d'arcade gira in una cornice e ha dentro
 * `daprod-lira.js`, che per i soldi chiede a questa pagina con `postMessage`.
 * La pagina gira la domanda al PC col token di chi gioca, e risponde. Il gioco
 * il token non lo vede mai.
 *
 * Stesse regole degli altri: una stringa sola, niente apici inversi, e niente
 * barre rovesciate (dentro una stringa TypeScript si mangiano).
 */
export const COPIONE_SALA = `
  /* ---------------------------------------------- la sala e la borsa (1.4.0) */

  var sala = null;
  var giocoAperto = null;
  var ricaricaDelGioco = false;
  var ICONE_SALA = { dozer: '🪙', claw: '🦾', neon: '🌋' };

  function numeroIt(n, dec) { return Number(n || 0).toFixed(dec).replace('.', ','); }
  function puntiIt(n) { return String(Math.round(n || 0)).replace(/(?=(?:[0-9]{3})+$)(?!^)/g, '.'); }
  function viva(id) { var e = $(id); return Boolean(e && e.classList.contains('viva')); }

  function statoPerIlGioco() {
    if (!sala) return null;
    return {
      modo: 'suite', saldo: io ? io.saldo : 0, partita: sala.partita.punti, quota: sala.borsa.quota,
      variazione: sala.borsa.variazione, fetta: sala.fetta, tettoRimasto: sala.tettoRimasto, staccando: sala.staccando,
    };
  }

  function mandaAlGioco(messaggio) {
    var f = $('cornice-gioco');
    if (!giocoAperto || !f || !f.contentWindow) return;
    var m = messaggio || {};
    m.daprod = 'lira';
    if (!m.stato) m.stato = statoPerIlGioco();
    f.contentWindow.postMessage(m, '*');
  }

  function caricaSala() {
    return chiedi('GET', '/sala').then(function (s) {
      sala = s;
      disegnaPartita();
      disegnaMano();
      if (viva('p-sala')) disegnaSala();
      if (viva('p-borsa')) disegnaBorsa();
      disegnaCornice();
      mandaAlGioco();
      return s;
    }).catch(function () { return null; });
  }

  var prossimoCarico = null;
  function caricaFraPoco() {
    if (prossimoCarico) return;
    prossimoCarico = setTimeout(function () { prossimoCarico = null; caricaSala(); }, 1200);
  }

  function freccia(v) {
    return v >= 0 ? '<span class="su">▲ ' + numeroIt(v, 1) + '%</span>' : '<span class="giu">▼ ' + numeroIt(-v, 1) + '%</span>';
  }

  function disegnaPartita() {
    var b = $('partita');
    if (!b || !sala) return;
    var su = sala.borsa.variazione >= 0;
    b.innerHTML = puntiIt(sala.partita.punti) + ' pt<span class="q"> · <span class="' + (su ? 'su' : 'giu') + '">' +
      (su ? '▲' : '▼') + ' ' + numeroIt(sala.borsa.quota, 2) + '</span></span>';
  }

  function cifra(numero, cosa) {
    return '<div class="cifra"><b>' + numero + '</b><small>' + sicuro(cosa) + '</small></div>';
  }

  function cifreDellaPartita() {
    var h = cifra(puntiIt(sala.partita.punti) + ' pt', 'la partita aperta');
    h += cifra(soldi(sala.staccando), 'staccando adesso');
    h += cifra(Math.round(sala.fetta * 100) + '%', 'la tua fetta (livello ' + sala.livello + ')');
    h += cifra(soldi(sala.tettoRimasto), 'si possono staccare ancora oggi');
    var per = sala.partita.perGioco || {};
    Object.keys(per).forEach(function (g) {
      h += cifra(puntiIt(per[g]) + ' pt', g === 'slot' ? 'dalla slot' : g === 'avanzati' ? 'rimasti da ieri' : 'da ' + g);
    });
    if (sala.ultimoStacco) {
      h += cifra(soldi(sala.ultimoStacco.lire), 'l ultimo stacco, a ' + numeroIt(sala.ultimoStacco.quota, 2));
    }
    return h;
  }

  function disegnaSala() {
    if (!sala) return;
    // La stessa carta della Home (home-copione.ts): la schermata vera del gioco.
    $('sala-giochi').innerHTML = tuttiIGiochi().map(cartaGiocoHtml).join('');
    $('sala-partita').innerHTML = cifreDellaPartita();
  }

  /** Le candele dell'ultima giornata e mezza, in un disegno solo. */
  function candele(lista) {
    if (!lista.length) return '<svg viewBox="0 0 480 200"><text x="240" y="104" fill="#86a59c" font-size="13" text-anchor="middle">La Borsa si muove col primo movimento: gioca, spendi o stacca.</text></svg>';
    var min = Infinity, max = -Infinity;
    lista.forEach(function (c) { min = Math.min(min, c.min); max = Math.max(max, c.max); });
    if (max - min < 0.02) { max += 0.01; min -= 0.01; }
    var w = 480, h = 200, passo = w / Math.max(lista.length, 12), largo = Math.max(3, passo * 0.6);
    var y = function (v) { return 12 + (h - 24) * (1 - (v - min) / (max - min)); };
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">';
    var linea = '';
    lista.forEach(function (c, i) {
      var x = w - (lista.length - i) * passo + passo / 2;
      var su = c.chiude >= c.apre, col = su ? '#3dff8a' : '#ff5c6c';
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + y(c.max) + '" y2="' + y(c.min) + '" stroke="' + col + '" stroke-width="1.2"/>';
      var alto = y(Math.max(c.apre, c.chiude)), basso = y(Math.min(c.apre, c.chiude));
      s += '<rect x="' + (x - largo / 2) + '" y="' + alto + '" width="' + largo + '" height="' + Math.max(1.5, basso - alto) + '" fill="' + col + '" rx="1"/>';
      linea += (i ? 'L' : 'M') + x + ' ' + y(c.chiude);
    });
    s += '<path d="' + linea + '" fill="none" stroke="#3ddbff" stroke-opacity=".5" stroke-width="1.5"/>';
    s += '<text x="6" y="16" fill="#86a59c" font-size="11">' + numeroIt(max, 2) + '</text>';
    s += '<text x="6" y="' + (h - 6) + '" fill="#86a59c" font-size="11">' + numeroIt(min, 2) + '</text>';
    return s + '</svg>';
  }

  function disegnaBorsa() {
    if (!sala) return;
    var b = sala.borsa;
    $('borsa-testa').innerHTML = '<span class="quota">' + numeroIt(b.quota, 3) + '</span>' +
      '<span>lire a punto</span>' + freccia(b.variazione) + '<span class="spiega">nelle ultime 24 ore</span>';
    $('borsa-grafico').innerHTML = candele(b.candele || []);
    var h = cifra(soldi(b.bruciate24), 'bruciate in 24 ore') + cifra(soldi(b.coniate24), 'coniate in 24 ore') +
      cifra(String(b.giocatori24), b.giocatori24 === 1 ? 'persona in sala' : 'persone in sala');
    $('borsa-numeri').innerHTML = h + cifreDellaPartita();
    $('stacca-borsa').disabled = !(sala.partita.punti > 0 && sala.tettoRimasto > 0);
    $('stacca-borsa').textContent = sala.partita.punti > 0 ? 'Stacca ' + soldi(sala.staccando) : 'Niente da staccare';
  }

  function disegnaMano() {
    var m = $('mano');
    if (!m || !sala) return;
    if (!sala.mano.length) { m.hidden = true; m.innerHTML = ''; return; }
    m.hidden = false;
    var h = '<div class="titolo">La tua mano: tocca una carta per giocarla</div>';
    sala.mano.forEach(function (c) {
      var s = scalinoDi(c.grado);
      h += '<button class="carta" data-carta="' + c.id + '" style="--g:' + (s ? s.colore : '#3dff8a') + '">' +
        '<small>' + sicuro(c.tavolo === 'immagini' ? 'immagini' : 'musica') + ' · ' + sicuro(c.nomeRullo) + '</small>' +
        '<b>' + sicuro(c.nome) + '</b><i>' + sicuro(s ? s.nome : c.grado) + '</i></button>';
    });
    m.innerHTML = h;
  }

  function disegnaCornice() {
    if (!giocoAperto || !sala) return;
    $('cornice-conto').innerHTML = soldi(io ? io.saldo : 0) + ' · ' + puntiIt(sala.partita.punti) + ' pt · ' +
      numeroIt(sala.borsa.quota, 2);
    $('cornice-stacca').disabled = !(sala.partita.punti > 0);
  }

  /* ---------------------------------------------------------- i gesti */

  function staccaAdesso() {
    return chiedi('POST', '/stacca').then(function (r) {
      if (io) io.saldo = r.saldo;
      disegnaSaldo(true);
      avviso('Staccato: ' + puntiIt(r.punti) + ' punti a ' + numeroIt(r.quota, 2) + ' × ' + Math.round(r.fetta * 100) +
        '% = ' + soldi(r.lire) + (r.avanzati ? ' (' + puntiIt(r.avanzati) + ' punti restano per domani)' : ''), 'bene');
      if (typeof coriandoli === 'function') coriandoli(40, ['#00ff41', '#3ddbff', '#ffffff']);
      caricaSala();
      return r;
    });
  }

  function giocaLaCarta(id) {
    chiedi('POST', '/mano/gioca', { id: id }).then(function (c) {
      if (c.tavolo && c.tavolo !== tavolo) {
        ricordaTavolo();
        tavolo = c.tavolo;
        rulli = rulliDelTavolo();
        riprendiTavolo();
        disegnaTavoli();
        disegnaEpoche();
        vestiLaSala();
      }
      for (var i = 0; i < rulli.length; i++) {
        if (rulli[i].id !== c.rullo) continue;
        pezzi[i] = { id: c.id, nome: c.nome, testo: c.testo, grado: c.grado, prezzo: c.prezzo };
        bloccati[i] = c.id;
      }
      ricordaTavolo();
      disegnaRulli();
      avviso('Giocata: ' + c.nome + ' è sul rullo «' + c.nomeRullo + '», già bloccata.', 'bene');
      caricaSala();
    }).catch(function (e) { avviso(e.message, 'male'); caricaSala(); });
  }

  function apriGioco(id) {
    chiedi('POST', '/sala/entra', { gioco: id }).then(function (r) {
      if (io) io.saldo = r.saldo;
      disegnaSaldo(true);
      giocoAperto = id;
      ricaricaDelGioco = false;
      var g = (sala && sala.giochi || []).filter(function (x) { return x.id === id; })[0];
      $('cornice-nome').textContent = (ICONE_SALA[id] || '') + ' ' + (g ? g.nome : id);
      $('cornice-ricarica').hidden = true;
      $('cornice').hidden = false;
      $('cornice-gioco').src = RADICE + '/sala/' + id + '/?suite=1';
      disegnaCornice();
    }).catch(function (e) {
      /*
       * Il PC non risponde (e non ha detto di no): il gioco si apre lo
       * stesso, come demo. Chiesto da Cammo il 24 settembre 2026: i giochi
       * devono essere giocabili anche se il computer DaProd non e' collegato.
       * Senza ?suite=1 daprod-lira.js non fa niente: niente lire, niente carte.
       */
      if (!(e instanceof TypeError)) { avviso(e.message, 'male'); return; }
      giocoAperto = id;
      ricaricaDelGioco = false;
      $('cornice-nome').textContent = (ICONE_SALA[id] || '') + ' demo, senza lire';
      $('cornice-ricarica').hidden = true;
      $('cornice').hidden = false;
      $('cornice-gioco').src = RADICE + '/sala/' + id + '/';
    });
  }

  function chiudiGioco() {
    $('cornice-gioco').src = 'about:blank';
    $('cornice').hidden = true;
    giocoAperto = null;
    caricaSala();
  }

  function ricaricaDallaCornice() {
    if (!giocoAperto) return;
    chiedi('POST', '/sala/entra', { gioco: giocoAperto }).then(function (r) {
      if (io) io.saldo = r.saldo;
      disegnaSaldo(true);
      mandaAlGioco({ ricarica: true });
      caricaSala();
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  /** Le domande che arrivano dai giochi, via daprod-lira.js. */
  window.addEventListener('message', function (ev) {
    var f = $('cornice-gioco');
    var m = ev.data;
    if (!f || ev.source !== f.contentWindow || !m || m.daprod !== 'lira' || !m.n) return;
    var rispondi = function (esito) { f.contentWindow.postMessage({ daprod: 'lira', n: m.n, esito: esito, stato: statoPerIlGioco() }, '*'); };
    var sbaglio = function (e) { f.contentWindow.postMessage({ daprod: 'lira', n: m.n, errore: e.message }, '*'); };
    var d = m.dati || {};
    if (m.cosa === 'ciao') {
      ricaricaDelGioco = Boolean(d.ricarica);
      $('cornice-ricarica').hidden = !ricaricaDelGioco;
      if (ricaricaDelGioco) {
        $('cornice-ricarica').textContent = 'Ricarica';
        $('cornice-ricarica').title = d.ricarica + ', per un gettone d ingresso';
      }
      caricaSala().then(function () { rispondi(statoPerIlGioco()); });
    } else if (m.cosa === 'punti') {
      chiedi('POST', '/sala/punti', { gioco: d.gioco, grezzo: d.grezzo }).then(function (r) { rispondi(r); caricaFraPoco(); }, sbaglio);
    } else if (m.cosa === 'evento') {
      chiedi('POST', '/sala/evento', { gioco: d.gioco, evento: d.evento }).then(function (r) {
        if (r.carta) {
          var s = scalinoDi(r.carta.grado);
          avviso(r.perche === 'mano-piena'
            ? 'Mano piena: ' + r.carta.nome + ' diventa ' + r.puntiInvece + ' punti'
            : 'Carta! ' + r.carta.nome + ' (' + (s ? s.nome : r.carta.grado) + ') per ' + r.detto + ': giocala nella slot', 'bene');
        }
        rispondi(r);
        caricaFraPoco();
      }, sbaglio);
    } else if (m.cosa === 'ricarica') {
      chiedi('POST', '/sala/entra', { gioco: d.gioco || giocoAperto }).then(function (r) {
        if (io) io.saldo = r.saldo;
        disegnaSaldo(true);
        rispondi(r);
        caricaFraPoco();
      }, sbaglio);
    } else if (m.cosa === 'stacca') {
      staccaAdesso().then(rispondi, sbaglio);
    }
  });

  document.addEventListener('click', function (evento) {
    var b = evento.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    var gioco = qui('[data-apri-gioco]');
    if (gioco) { apriGioco(gioco.getAttribute('data-apri-gioco')); return; }
    var carta = qui('[data-carta]');
    if (carta) { giocaLaCarta(carta.getAttribute('data-carta')); return; }
    if (qui('#cornice-esci')) { chiudiGioco(); return; }
    if (qui('#cornice-ricarica')) { ricaricaDallaCornice(); return; }
    if (qui('#cornice-stacca') || qui('#stacca-borsa')) {
      staccaAdesso().catch(function (e) { avviso(e.message, 'male'); });
    }
  });

  // Le due schede nuove si caricano entrando, come le altre; e un giro della
  // slot cambia la partita, quindi dopo un giro si riguarda.
  var vaiAPrima = vaiA;
  vaiA = function (dove) {
    vaiAPrima(dove);
    if (dove === 'sala' || dove === 'borsa') caricaSala();
  };
  var giraPrima = gira;
  gira = function () {
    giraPrima();
    caricaFraPoco();
  };
  // La Borsa si muove anche per gli altri: ogni mezzo minuto si riguarda.
  setInterval(function () { if (!document.hidden) caricaSala(); }, 30000);
  caricaSala();
`;
