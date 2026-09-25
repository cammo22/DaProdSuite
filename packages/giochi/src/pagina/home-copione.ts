/**
 * La Home e le quattro stanze (1.4.3).
 *
 * Due mestieri: disegnare la Home (`disegnaHome`) e tenere in ordine le
 * stanze — quale tasto in fondo e' acceso, quale fila di tasti si vede in alto.
 * Le schede restano quelle di prima, con i loro nomi: una stanza e' solo un
 * modo di raggrupparle, e `vaiA` continua a funzionare come sempre.
 *
 * Sta dopo `COPIONE` e `COPIONE_SALA` nella stessa funzione: usa i loro
 * attrezzi (`io`, `sala`, `caricaSala`, `soldi`, `sicuro`...). Stesse regole:
 * una stringa sola, e niente apici inversi dentro.
 */
export const COPIONE_HOME = `
  /* ------------------------------------------------ la home e le stanze (1.4.3) */

  var STANZE = {
    home: 'home',
    sala: 'gioca', fortuna: 'gioca', borsa: 'gioca', portafoglio: 'gioca',
    studio: 'genera', slot: 'genera', mie: 'genera',
    fila: 'admin', giocatori: 'admin', casse: 'admin',
    pacchetti: 'collezione', inventario: 'collezione', shop: 'collezione', casa: 'collezione',
  };

  /** La faccia di un gioco d'arcade: la schermata vera, servita dalla sala. */
  function fotoDelGioco(id) { return RADICE + '/sala/img/' + id + '.webp'; }

  (function () {
    var foto = document.querySelectorAll('[data-sala-img]');
    for (var i = 0; i < foto.length; i++) foto[i].src = fotoDelGioco(foto[i].getAttribute('data-sala-img'));
  })();

  /**
   * La carta di un gioco: la sua schermata, il nome, una riga e il tasto.
   *
   * Una sola, per la Home e per la Sala: prima la Sala aveva le sue icone e la
   * Home avrebbe avuto le foto, e lo stesso gioco con due facce non si
   * riconosce.
   */
  function cartaGiocoHtml(g) {
    var fortuna = g.id === 'fortuna';
    var attr = fortuna ? 'data-va="fortuna"' : 'data-apri-gioco="' + g.id + '"';
    var faccia = fortuna
      ? '<span class="faccia faccia-fortuna" aria-hidden="true">' +
        '<i>🍀</i><i>👑</i><i>🔥</i><i>🦁</i><i>👑</i><i>❄️</i><i>🧭</i><i>👑</i><i>🐱</i></span>'
      : '<span class="faccia"><img src="' + fotoDelGioco(g.id) + '" alt="" loading="lazy"></span>';
    return '<button class="carta-gioco gioco-' + g.id + '" ' + attr + '>' + faccia +
      '<span class="testo"><b>' + sicuro(g.nome) + '</b><small>' + sicuro(g.riga) + '</small></span>' +
      '<span class="piede"><span class="costo">' + (fortuna ? 'da ' + soldi(50) + ' a tiro' : (g.ingresso ? 'entri con ' + soldi(g.ingresso) : 'entri gratis · ricarichi da € 0,20')) + '</span>' +
      '<span class="gioca-ora">Gioca</span></span></button>';
  }

  function tuttiIGiochi() {
    var lista = [{ id: 'fortuna', nome: 'Fortuna', riga: 'Tre file da tre: tieni quelle che ti servono e rigira. Sblocca le figurine.' }];
    return lista.concat(sala ? sala.giochi : []);
  }

  /**
   * «L.» sopra e il numero sotto (1.4.5): «nella card Bentornato metti L. e a
   * capo il numero, com'e' ora overlappa». Con sei cifre la casella delle lire
   * usciva dal bordo sul telefono.
   */
  function soldiACapo(v) {
    var s = soldi(v);
    var spazio = s.indexOf(' ');
    return spazio < 0 ? s : '<i>' + s.slice(0, spazio) + '</i>' + s.slice(spazio + 1);
  }

  function disegnaHome() {
    if (!io) return;
    var c = conteggioLivello(io.conto.esperienza);
    var pt = sala ? sala.partita.punti : 0;
    var b = sala ? sala.borsa : null;
    var su = !b || b.variazione >= 0;
    $('home-ciao').innerHTML =
      '<div class="ciao-testo"><small>Bentornato</small><b>' + sicuro(io.nome || 'giocatore') + '</b></div>' +
      '<div class="ciao-numeri">' +
      '<span class="num"><b>' + c.livello + '</b><small>livello</small></span>' +
      '<span class="num lire"><b>' + soldiACapo(io.saldo) + '</b><small>in tasca</small></span>' +
      '<span class="num"><b>' + puntiIt(pt) + '</b><small>punti partita</small></span>' +
      (b ? '<span class="num ' + (su ? 'su' : 'giu') + '"><b>' + (su ? '▲ ' : '▼ ') + numeroIt(b.quota, 2) + '</b><small>la Lira</small></span>' : '') +
      '</div>';

    $('home-giochi').innerHTML = tuttiIGiochi().map(cartaGiocoHtml).join('');

    var m = $('home-mano');
    if (sala && sala.mano.length) {
      m.hidden = false;
      var h = '<div class="home-titolo"><h2>La tua mano</h2><button class="link" data-va="slot">alla slot &#8594;</button></div>' +
        '<p class="spiega">Carte vinte nei giochi: tocca una carta e finisce sul suo rullo, gia' + String.fromCharCode(39) + ' bloccata.</p><div class="mano-carte">';
      sala.mano.slice(0, 8).forEach(function (k) {
        var s = scalinoDi(k.grado);
        h += '<button class="carta" data-carta="' + k.id + '" style="--g:' + (s ? s.colore : '#3dff8a') + '">' +
          '<small>' + sicuro(k.nomeRullo) + '</small><b>' + sicuro(k.nome) + '</b><i>' + sicuro(s ? s.nome : k.grado) + '</i></button>';
      });
      m.innerHTML = h + '</div>';
    } else {
      m.hidden = true;
      m.innerHTML = '';
    }

    disegnaBanca();

    if (b) {
      $('home-borsa').innerHTML =
        '<div class="borsa-mini">' + candele((b.candele || []).slice(-24)) + '</div>' +
        '<div class="borsa-lato">' +
        '<span class="quota">' + numeroIt(b.quota, 3) + '</span><small>lire a punto</small>' + freccia(b.variazione) +
        '<button class="btn oro" id="stacca-home"' + (sala.partita.punti > 0 && sala.tettoRimasto > 0 ? '' : ' disabled') + '>' +
        (sala.partita.punti > 0 ? 'Incassa ' + soldi(sala.staccando) : 'Niente da incassare') + '</button></div>';
    } else {
      $('home-borsa').innerHTML = '<div class="niente">La Borsa si carica…</div>';
    }
  }

  /* ---------------------------------------------------- la Banca (1.4.5) */

  /** «fra 5 h 12 min», «fra 3 giorni»: quanto manca, detto come si dice. */
  function fraQuanto(ms) {
    var min = Math.max(1, Math.round(ms / 60000));
    if (min < 60) return 'fra ' + min + ' min';
    var ore = Math.floor(min / 60);
    if (ore < 48) return 'fra ' + ore + ' h ' + (min % 60) + ' min';
    return 'fra ' + Math.round(ore / 24) + ' giorni';
  }

  /**
   * I tre cassetti, la mia parte, e gli ultimi premi. I soldi vengono dalle
   * lire spese in sala (gettoni, ricariche, giri, pacchetti): la Banca le
   * ridivide, non ne crea. Il perche' e i numeri stanno in banca.ts.
   */
  function disegnaBanca() {
    var dove = $('home-banca');
    if (!dove) return;
    var banca = sala && sala.banca;
    if (!banca) { dove.innerHTML = '<div class="niente">La Banca si carica…</div>'; return; }
    var h = '<div class="banca-cassetti">';
    banca.cassetti.forEach(function (c) {
      var mese = c.cassetto === 'mese';
      var mia;
      if (!c.mieiPunti) {
        mia = '<div class="mia fuori">Gioca per entrare nel premio: ' +
          (mese ? 'ogni punto attivita\\' e\\' un biglietto.' : 'tocca a chi ha giocato.') + '</div>';
      } else if (mese) {
        mia = '<div class="mia">I tuoi biglietti: <b>' + Math.max(1, Math.round(c.miaParte * 100)) + '%</b> di vincerlo</div>';
      } else if (c.miaParte > 0) {
        mia = '<div class="mia">Se si aprisse adesso: <b>' + soldi(c.miaParte) + '</b></div>';
      } else {
        mia = '<div class="mia fuori">Sei fuori dai primi ' + 10 + ': gioca ancora un po\\'.</div>';
      }
      h += '<div class="banca-cassetto ' + c.cassetto + '">' +
        '<span class="nome">' + sicuro(c.nome) + '</span>' +
        '<span class="monte">' + soldiACapo(c.lire) + '</span>' +
        '<span class="fra">&#9203; si apre <b data-fra="' + c.siApre + '">' + fraQuanto(c.fraMs) + '</b></span>' +
        '<small>' + (c.quanti ? c.quanti + (c.quanti === 1 ? ' persona in gara' : ' persone in gara') : 'nessuno in gara, per ora') +
        (mese ? ' · a uno solo, estratto' : c.cassetto === 'settimana' ? ' · fra i 10 piu\\' attivi' : ' · fra tutti quelli che giocano') + '</small>' +
        mia + '</div>';
    });
    h += '</div>';
    h += '<div class="banca-piede"><span>in riserva <b>' + soldi(banca.riserva) + '</b></span>' +
      '<span>entrate da sempre <b>' + soldi(banca.entrate) + '</b></span>' +
      '<span>tornate a voi <b>' + soldi(banca.pagate) + '</b></span></div>';
    if (banca.ultime && banca.ultime.length) {
      h += '<div class="banca-vinti">';
      banca.ultime.slice(0, 4).forEach(function (a) {
        var chi = a.vincite.map(function (v) { return sicuro(v.nome); }).join(', ') + (a.quanti > a.vincite.length ? ' e altri ' + (a.quanti - a.vincite.length) : '');
        h += '<div><span>' + sicuro(a.cassetto === 'mese' ? 'Super jackpot' : a.cassetto === 'settimana' ? 'Settimana' : 'Giorno') + ' · ' + chi + '</span><b>' + soldi(a.montepremi) + '</b></div>';
      });
      h += '</div>';
    }
    dove.innerHTML = h;
  }

  // Il conto alla rovescia si aggiorna da solo, senza ridisegnare niente.
  setInterval(function () {
    if (document.hidden) return;
    var qui = document.querySelectorAll('[data-fra]');
    for (var i = 0; i < qui.length; i++) qui[i].textContent = fraQuanto(Number(qui[i].getAttribute('data-fra')) - Date.now());
  }, 30000);

  /** Un premio vinto si dice una volta, la prima volta che si apre la sala dopo. */
  var premioVisto = (function () { try { return Number(localStorage.getItem('daprod.premio.visto') || 0); } catch (e) { return 0; } })();
  function diIlPremio() {
    var p = sala && sala.premio;
    if (!p || p.quando <= premioVisto) return;
    premioVisto = p.quando;
    try { localStorage.setItem('daprod.premio.visto', String(p.quando)); } catch (e) { /* va bene lo stesso */ }
    avviso('Hai vinto ' + soldi(p.lire) + ' nel ' + p.nome + '! Sono gia\\' nel portafoglio.', 'bene');
    if (typeof coriandoli === 'function') coriandoli(p.cassetto === 'mese' ? 120 : 50, ['#ffd166', '#3dff8a', '#ffffff']);
  }

  /** Accende il tasto della stanza, e mostra la fila di tasti di quella stanza. */
  function segnaLaStanza(dove) {
    var stanza = STANZE[dove] || 'home';
    var giu = document.querySelectorAll('#giu button');
    for (var i = 0; i < giu.length; i++) giu[i].classList.toggle('viva', giu[i].getAttribute('data-gruppo') === stanza);
    var file = document.querySelectorAll('#sotto .sotto-fila');
    for (var j = 0; j < file.length; j++) file[j].hidden = file[j].getAttribute('data-di') !== stanza;
    var tasti = document.querySelectorAll('#sotto button');
    for (var k = 0; k < tasti.length; k++) tasti[k].classList.toggle('viva', tasti[k].getAttribute('data-va') === dove);
    document.querySelector('main').classList.toggle('con-sotto', stanza !== 'home');
  }

  var vaiAStanze = vaiA;
  vaiA = function (dove) {
    vaiAStanze(dove);
    segnaLaStanza(dove);
    if (dove === 'home') { disegnaHome(); caricaSala(); }
    var main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  };

  var caricaSalaHome = caricaSala;
  caricaSala = function () {
    return caricaSalaHome().then(function (s) {
      if (viva('p-home')) disegnaHome();
      diIlPremio();
      return s;
    });
  };

  // Il pallino della fila si vede anche sul tasto Admin: chi comanda deve
  // accorgersene da qualunque stanza, non solo da quella giusta.
  (function () {
    var fonte = $('quante-attesa');
    var copia = $('pallino-admin');
    if (!fonte || !copia || typeof MutationObserver === 'undefined') return;
    new MutationObserver(function () {
      copia.hidden = fonte.hidden;
      copia.textContent = fonte.textContent;
    }).observe(fonte, { attributes: true, childList: true, characterData: true, subtree: true });
  })();

  document.addEventListener('click', function (evento) {
    var b = evento.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    // Una carta giocata dalla Home porta alla slot, dove la si vede sul rullo.
    if (qui('#home-mano [data-carta]')) { setTimeout(function () { vaiA('slot'); }, 0); return; }
    if (qui('#stacca-home')) staccaAdesso().catch(function (e) { avviso(e.message, 'male'); });
    if (qui('#banca-come')) {
      chiediQualcosa('La Banca DaProd',
        'Ogni lira che spendi in sala (gettoni, ricariche, giri, pacchetti) entra qui. ' +
        'Il 40% va nel premio del giorno, diviso a mezzanotte fra tutti quelli che hanno giocato; ' +
        'il 30% nel premio della settimana, diviso la domenica notte fra i 10 piu\\' attivi; ' +
        'il 20% nel super jackpot del mese, estratto a uno solo: ogni punto attivita\\' e\\' un biglietto. ' +
        'Il resto e\\' la riserva di DaProd, che garantisce un minimo ai premi. ' +
        'L\\'attivita\\' e\\' quanto giochi: una ogni 10 lire spese, 5 a giro di slot, meta\\' dei punti fatti nei giochi.',
        { valore: 'ok', tastoSi: 'Ho capito', soloSi: true });
    }
  });

  /* --------------------------------------- uscire, e il tasto indietro (1.4.5) */

  /** La console della suite: la sala sta sotto «/giochi», lei sta sopra. */
  function tornaAllaSuite() {
    // Senza espressioni regolari: in questo file le barre rovesciate vanno
    // raddoppiate, ed e' facile sbagliarne una.
    var casa = RADICE;
    if (casa.slice(-1) === '/') casa = casa.slice(0, -1);
    if (casa.slice(-7) === '/giochi') casa = casa.slice(0, -7);
    casa += '/';
    location.href = casa + (token ? '#t=' + encodeURIComponent(token) : '');
  }

  /**
   * Il tasto indietro del telefono, chiesto dall'app Android (lo stesso patto
   * della console, in copione-avvio.ts): chiude la cosa piu' in alto e dice
   * di si'; se non c'e' niente da chiudere e si e' fuori dalla Home, torna
   * alla Home; solo dalla Home dice di no, e l'app torna alla suite.
   */
  window.DaProdPagina = {
    chiudiQualcosa: function () {
      var chiede = document.querySelector('.chiede');
      if (chiede) { chiede.remove(); return true; }
      var grandi = document.querySelectorAll('.grande');
      if (grandi.length) { grandi[grandi.length - 1].remove(); return true; }
      if (!$('portafoglio').hidden) { chiudiPortafoglio(); return true; }
      if (!$('cornice').hidden) { chiudiGioco(); return true; }
      if (!viva('p-home')) { vaiA('home'); return true; }
      return false;
    },
  };
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !document.querySelector('.chiede')) window.DaProdPagina.chiudiQualcosa();
  });
  document.addEventListener('click', function (ev) {
    if (ev.target && ev.target.closest && ev.target.closest('#esci-sala')) tornaAllaSuite();
  });

  segnaLaStanza('home');
  var primaHome = setInterval(function () {
    if (!io) return;
    clearInterval(primaHome);
    // La stanza Admin c'e' solo per chi comanda.
    $('tasto-admin').hidden = !io.admin;
    disegnaHome();
  }, 150);
`;
