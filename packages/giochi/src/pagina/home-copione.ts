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
    sala: 'gioca', fortuna: 'gioca', borsa: 'gioca',
    slot: 'genera', mie: 'genera', fila: 'genera',
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
      '<span class="piede"><span class="costo">' + (fortuna ? 'da ' + soldi(50) + ' a tiro' : 'entri con ' + soldi(g.ingresso)) + '</span>' +
      '<span class="gioca-ora">Gioca</span></span></button>';
  }

  function tuttiIGiochi() {
    var lista = [{ id: 'fortuna', nome: 'Fortuna', riga: 'Tre file da tre: tieni quelle che ti servono e rigira. Sblocca le figurine.' }];
    return lista.concat(sala ? sala.giochi : []);
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
      '<span class="num lire"><b>' + soldi(io.saldo) + '</b><small>in tasca</small></span>' +
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

    if (b) {
      $('home-borsa').innerHTML =
        '<div class="borsa-mini">' + candele((b.candele || []).slice(-24)) + '</div>' +
        '<div class="borsa-lato">' +
        '<span class="quota">' + numeroIt(b.quota, 3) + '</span><small>lire a punto</small>' + freccia(b.variazione) +
        '<button class="btn oro" id="stacca-home"' + (sala.partita.punti > 0 && sala.tettoRimasto > 0 ? '' : ' disabled') + '>' +
        (sala.partita.punti > 0 ? 'Stacca ' + soldi(sala.staccando) : 'Niente da staccare') + '</button></div>';
    } else {
      $('home-borsa').innerHTML = '<div class="niente">La Borsa si carica…</div>';
    }
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
      return s;
    });
  };

  // Il pallino della fila si vede anche sul tasto Genera: chi comanda deve
  // accorgersene da qualunque stanza, non solo da quella giusta.
  (function () {
    var fonte = $('quante-attesa');
    var copia = $('pallino-genera');
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
  });

  segnaLaStanza('home');
  var primaHome = setInterval(function () {
    if (!io) return;
    clearInterval(primaHome);
    disegnaHome();
  }, 150);
`;
