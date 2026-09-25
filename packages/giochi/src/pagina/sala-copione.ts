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
  var cambioDelGioco = 0;
  var dettoDellaRicarica = '';
  var quanteRicarica = 0;
  var ultimaPartita = -1;
  var ICONE_SALA = { dozer: '🪙', claw: '🦾', neon: '🌋' };
  /** Il gioco sa incassare da solo (1.4.8): ha detto «cassa» nel ciao. */
  var cassaDelGioco = false;

  function giocoDellaSala(id) { return (sala && sala.giochi || []).filter(function (x) { return x.id === id; })[0] || null; }
  /** Lire in euro, all'italiana: «€ 1.234,56». Il cambio e' quello del 2002 (euro.ts). */
  function euroIt(lire) {
    var e = Math.max(0, Number(lire) || 0) / (sala && sala.euro ? sala.euro.lirePerEuro : 1936.27);
    var cent = Math.round(e * 100);
    return '€ ' + puntiIt(Math.floor(cent / 100)) + ',' + String(cent % 100 + 100).slice(1);
  }
  /** Un taglio in euro detto corto: «€ 0,20», «€ 5». */
  function taglioIt(e) { return '€ ' + (e < 1 ? numeroIt(e, 2) : puntiIt(e)); }

  function numeroIt(n, dec) { return Number(n || 0).toFixed(dec).replace('.', ','); }
  function puntiIt(n) { return String(Math.round(n || 0)).replace(/(?=(?:[0-9]{3})+$)(?!^)/g, '.'); }
  function viva(id) { var e = $(id); return Boolean(e && e.classList.contains('viva')); }

  function statoPerIlGioco() {
    if (!sala) return null;
    var g = giocoDellaSala(giocoAperto);
    return {
      modo: 'suite', saldo: io ? io.saldo : 0, partita: sala.partita.punti, quota: sala.borsa.quota,
      variazione: sala.borsa.variazione, fetta: sala.fetta, tettoRimasto: sala.tettoRimasto, staccando: sala.staccando,
      // 1.4.8: la cassa del gioco aperto, e il cambio.
      lirePerEuro: sala.euro ? sala.euro.lirePerEuro : 1936.27,
      fettaDaProd: sala.euro ? sala.euro.fettaDaProd : 0.1,
      cassa: g ? { messo: g.messo, preso: g.preso, tetto: g.tettoRimasto, moltMax: g.moltMax, siFinisce: g.siFinisce,
        fine: g.fine || '', bonus: g.bonusSeFinisci, minuti: g.minuti, record: g.record } : null,
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
    h += cifra(soldi(sala.staccando), 'incassando adesso');
    h += cifra(Math.round(sala.fetta * 100) + '%', 'la tua fetta (livello ' + sala.livello + ')');
    h += cifra(soldi(sala.tettoRimasto), 'si possono incassare ancora oggi');
    var per = sala.partita.perGioco || {};
    Object.keys(per).forEach(function (g) {
      h += cifra(puntiIt(per[g]) + ' pt', g === 'slot' ? 'dalla slot' : g === 'avanzati' ? 'rimasti da ieri' : 'da ' + g);
    });
    if (sala.ultimoStacco) {
      h += cifra(soldi(sala.ultimoStacco.lire), 'l ultimo incasso, a ' + numeroIt(sala.ultimoStacco.quota, 2));
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

  /**
   * Il consiglio della Borsa (1.4.8): «facciamo una borsa piu' intuitiva». Chi
   * non e' un finanziere vuole sapere una cosa sola: incasso adesso o aspetto?
   * Si confronta la quota di adesso con la media delle ultime ore.
   */
  function consiglioDellaBorsa(b) {
    var c = b.candele || [];
    if (c.length < 3) return { classe: 'pari', detto: 'Troppo presto per dirlo: la Borsa ha appena aperto.' };
    var media = c.reduce(function (s, x) { return s + x.chiude; }, 0) / c.length;
    if (b.quota >= media * 1.03) return { classe: 'su', detto: 'Conviene incassare: la Lira è sopra la sua media.' };
    if (b.quota <= media * 0.97) return { classe: 'giu', detto: 'Meglio aspettare: la Lira è sotto la sua media.' };
    return { classe: 'pari', detto: 'Nella media: incassare adesso o dopo cambia poco.' };
  }

  function disegnaBorsa() {
    if (!sala) return;
    var b = sala.borsa;
    var k = consiglioDellaBorsa(b);
    var mille = Math.floor(1000 * b.quota * sala.fetta);
    $('borsa-testa').innerHTML = '<span class="quota">' + numeroIt(b.quota, 3) + '</span>' +
      '<span>lire a punto</span>' + freccia(b.variazione) + '<span class="spiega">nelle ultime 24 ore</span>' +
      '<div class="borsa-consiglio ' + k.classe + '">' + k.detto + '</div>' +
      '<div class="borsa-in-parole">Adesso 1.000 punti della tua partita ti danno <b>' + soldi(mille) + '</b> (' + euroIt(mille) + '). ' +
      'La Lira sale quando la gente spende e scende quando incassa.</div>';
    $('borsa-grafico').innerHTML = candele(b.candele || []);
    var h = cifra(soldi(b.bruciate24), 'bruciate in 24 ore') + cifra(soldi(b.coniate24), 'coniate in 24 ore') +
      cifra(String(b.giocatori24), b.giocatori24 === 1 ? 'persona in sala' : 'persone in sala');
    $('borsa-numeri').innerHTML = h + cifreDellaPartita();
    $('stacca-borsa').disabled = !(sala.partita.punti > 0 && sala.tettoRimasto > 0);
    $('stacca-borsa').textContent = sala.partita.punti > 0 ? 'Incassa ' + soldi(sala.staccando) : 'Niente da incassare';
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

  /**
   * La barra in alto della cornice (1.4.4): tre pastiglie, e quella della
   * partita si accende quando i punti salgono. I punti arrivano dal gioco ogni
   * tre secondi (daprod-lira.js), quindi si vede la partita crescere mentre si
   * gioca invece che a scatti ogni quarto d ora.
   */
  function disegnaCornice() {
    if (!giocoAperto || !sala) return;
    var pt = sala.partita.punti;
    var g = giocoDellaSala(giocoAperto);
    /*
     * 1.4.8: il portafoglio si tocca (ha il «+») e apre il foglio coi tagli;
     * accanto, la partita di questo gioco: quanto ci hai messo, quanto puoi
     * ancora portare a casa, e il premio se lo finisci adesso.
     */
    var h = '<span class="pastiglia lire borsellino" id="pastiglia-portafoglio" role="button" tabindex="0" title="Ricarica e incassa"><small>portafoglio</small><b>' + soldi(io ? io.saldo : 0) + '</b></span>';
    if (g && cassaDelGioco) {
      h += '<span class="pastiglia"><small>messe</small><b>' + soldi(g.messo) + '</b></span>' +
        '<span class="pastiglia punti"><small>fino a</small><b>' + soldi(g.tettoRimasto) + '</b></span>' +
        (g.siFinisce
          ? '<span class="pastiglia su"><small>premio fine</small><b>+' + soldi(g.bonusSeFinisci) + '</b></span>'
          : '<span class="pastiglia"><small>in euro</small><b>' + euroIt(io ? io.saldo : 0) + '</b></span>');
    } else {
      h += '<span class="pastiglia punti" id="pastiglia-punti"><small>partita</small><b>' + puntiIt(pt) + ' pt</b></span>' +
        '<span class="pastiglia"><small>incassi</small><b>' + soldi(sala.staccando) + '</b></span>';
    }
    $('cornice-conto').innerHTML = h;
    if (ultimaPartita >= 0 && pt > ultimaPartita) {
      var p = $('pastiglia-punti');
      if (p) { p.classList.add('sale'); p.setAttribute('data-piu', '+' + puntiIt(pt - ultimaPartita)); }
    }
    ultimaPartita = pt;
    disegnaTagliAlVolo();
    if (cassaDelGioco) {
      $('cornice-stacca').disabled = false;
      $('cornice-stacca').textContent = 'Incassa';
    } else {
      $('cornice-stacca').disabled = !(pt > 0);
      $('cornice-stacca').textContent = pt > 0 ? 'Incassa ' + soldi(sala.staccando) : 'Incassa';
    }
    if (!$('portafoglio').hidden) disegnaPortafoglio();
  }

  /* ------------------------------------------------ il portafoglio (1.4.4) */

  /** La ricarica piu' piccola: 20 centesimi (euro.ts). */
  function minimoRicarica() { return sala && sala.euro ? sala.euro.ricaricaMin : 387; }

  function apriPortafoglio() {
    if (!giocoAperto) return;
    var minimo = minimoRicarica();
    var saldo = io ? io.saldo : 0;
    if (!quanteRicarica || quanteRicarica > saldo) quanteRicarica = Math.min(saldo, Math.max(minimo, 1936));
    var g = (sala && sala.giochi || []).filter(function (x) { return x.id === giocoAperto; })[0];
    $('portafoglio-titolo').textContent = 'Portafoglio · ' + (g ? g.nome : giocoAperto);
    $('portafoglio').hidden = false;
    disegnaPortafoglio();
  }

  function chiudiPortafoglio() { $('portafoglio').hidden = true; }

  /**
   * Il foglio del portafoglio (1.4.8): «i tagli di ricarica facciamoli vedere
   * solo se premiamo il portafoglio, con altre info». I tagli sono in euro,
   * gli stessi per tutti i giochi; sotto, la partita di questo gioco e
   * l'incasso.
   */
  function disegnaPortafoglio() {
    var minimo = minimoRicarica();
    var saldo = io ? io.saldo : 0;
    var scorri = $('portafoglio-scorri');
    scorri.min = String(minimo);
    scorri.max = String(Math.max(minimo, saldo));
    scorri.step = saldo > 200000 ? '1000' : saldo > 20000 ? '100' : '10';
    scorri.value = String(quanteRicarica);
    scorri.disabled = saldo < minimo;
    $('portafoglio-saldo').textContent = soldi(saldo) + ' · ' + euroIt(saldo);
    $('portafoglio-quante').textContent = soldi(quanteRicarica);
    $('portafoglio-diventa').textContent = euroIt(quanteRicarica) + (cambioDelGioco && cambioDelGioco !== 1
      ? ' · nel gioco diventano ' + soldi(quanteRicarica * cambioDelGioco)
      : ' · nel gioco sono le stesse lire');
    var tagli = sala && sala.euro ? sala.euro.tagli : [];
    $('portafoglio-tagli').innerHTML = tagli.map(function (t) {
      return '<button data-ricarica="' + t.lire + '"' + (t.lire === quanteRicarica ? ' class="scelto"' : '') + (t.lire > saldo ? ' disabled' : '') +
        '><b>' + taglioIt(t.euro) + '</b><small>' + soldi(t.lire) + '</small></button>';
    }).join('');
    var puo = saldo >= minimo && quanteRicarica >= minimo && quanteRicarica <= saldo;
    $('portafoglio-ok').disabled = !puo || ricaricaInCorso;
    $('portafoglio-ok').textContent = puo ? 'Ricarica ' + soldi(quanteRicarica) + ' (' + euroIt(quanteRicarica) + ')' : 'Non bastano le lire';
    var g = giocoDellaSala(giocoAperto);
    var info = '';
    if (g && cassaDelGioco) {
      info += '<div class="riga"><small>messe in questa partita</small><b>' + soldi(g.messo) + '</b></div>' +
        '<div class="riga verde"><small>puoi portare a casa ancora</small><b>' + soldi(g.tettoRimasto) + '</b></div>';
      if (g.siFinisce) {
        info += '<div class="riga oro"><small>premio se finisci adesso</small><b>+' + soldi(g.bonusSeFinisci) + '</b></div>' +
          '<div class="riga"><small>record, a finirlo</small><b>' + (g.record ? numeroIt(g.record, 0) + ' min' : 'ancora niente') + '</b></div>';
      }
      info += '<p class="spiega">Una lira è una lira: quello che ricarichi lo ritrovi uguale nel gioco, e quando incassi torna qui. ' +
        'Si porta a casa fino a ' + g.moltMax + ' volte quello che hai messo; DaProd tiene il ' + Math.round((sala.euro ? sala.euro.fettaDaProd : 0.1) * 100) +
        '%, che torna a tutti coi premi della Banca.' +
        (g.siFinisce ? ' Per finire: ' + sicuro(g.fine || '') + '. Più in fretta finisci, più è alto il premio; poi il gioco ricomincia da capo.' : '') + '</p>';
    }
    $('portafoglio-info').innerHTML = info;
    $('portafoglio-incassa').hidden = !(g && cassaDelGioco);
    $('portafoglio-incassa').textContent = 'Incassa dal gioco';
    $('portafoglio-nota').textContent = saldo < minimo
      ? 'Servono almeno ' + soldi(minimo) + ' (20 centesimi). Incassa o gioca alla slot per farne.'
      : '1 € = L. 1.936,27, il cambio del 2002. Le lire spese vanno nella Banca DaProd.';
  }

  function segnaQuante(n) {
    var minimo = minimoRicarica();
    var saldo = io ? io.saldo : 0;
    quanteRicarica = Math.max(minimo, Math.min(saldo, Math.round(n)));
    disegnaPortafoglio();
  }

  function confermaRicarica() {
    $('portafoglio-ok').disabled = true;
    ricaricaDi(quanteRicarica).catch(function () { disegnaPortafoglio(); });
  }

  /**
   * Una ricarica, da qualunque tasto venga: il foglio o i tagli al volo. Una
   * sola strada verso il PC e verso il gioco, cosi' le due non si comportano
   * mai diverso.
   */
  var ricaricaInCorso = false;
  function ricaricaDi(lire) {
    if (ricaricaInCorso) return Promise.resolve(null);
    ricaricaInCorso = true;
    disegnaTagliAlVolo();
    return chiedi('POST', '/sala/ricarica', { gioco: giocoAperto, lire: lire }).then(function (r) {
      ricaricaInCorso = false;
      if (io) io.saldo = r.saldo;
      disegnaSaldo(true);
      mandaAlGioco({ ricarica: true, lire: r.lire });
      chiudiPortafoglio();
      avviso('Ricaricato: ' + soldi(r.lire) + ' (' + euroIt(r.lire) + ')' + (cambioDelGioco && cambioDelGioco !== 1 ? ', nel gioco ' + soldi(r.lire * cambioDelGioco) : ''), 'bene');
      disegnaCornice();
      var p = $('pastiglia-portafoglio');
      if (p) { p.classList.remove('cala'); void p.offsetWidth; p.classList.add('cala'); }
      caricaSala();
      return r;
    }).catch(function (e) {
      ricaricaInCorso = false;
      disegnaTagliAlVolo();
      avviso(e.message, 'male');
      throw e;
    });
  }

  /**
   * La riga dei tagli sotto la barra: dalla 1.4.8 non si vede piu'. «I tagli
   * di ricarica facciamoli vedere solo se premiamo il portafoglio»: stanno nel
   * foglio. La funzione resta perche' chi la chiama non deve sapere che c'e'.
   */
  function disegnaTagliAlVolo() {
    var riga = $('cornice-tagli');
    if (!riga) return;
    riga.hidden = true;
    $('cornice').classList.remove('con-tagli');
  }

  /**
   * L'incasso (1.4.8): lo fa il gioco, perche' solo lui sa quante lire ha. La
   * cornice glielo chiede; il gioco risponde passando da daprod-lira.js, e
   * arriva qui come «incassa».
   */
  function chiediIncassoAlGioco() {
    chiudiPortafoglio();
    mandaAlGioco({ incassa: true });
  }

  function dopoLIncasso(r) {
    if (io) io.saldo = r.saldo;
    disegnaSaldo(true);
    var g = giocoDellaSala(giocoAperto);
    avviso((r.finita ? 'Partita finita in ' + numeroIt(r.minuti, 0) + ' min! ' : 'Incassato: ') + soldi(r.netto) + ' (' + euroIt(r.netto) + ')' +
      (r.bonus ? ', premio velocità +' + soldi(r.bonus) : '') + ' · a DaProd ' + soldi(r.fetta) +
      (r.oltre > 0 ? ' · ' + soldi(r.oltre) + ' restano nel gioco (tetto)' : ''), 'bene');
    if (typeof coriandoli === 'function') coriandoli(r.finita ? 90 : 40, ['#00ff41', '#3ddbff', '#ffd166']);
    var p = $('pastiglia-portafoglio');
    if (p) { p.classList.remove('cala'); void p.offsetWidth; p.classList.add('cala'); }
    caricaSala();
  }

  /* ---------------------------------------------------------- i gesti */

  function staccaAdesso() {
    return chiedi('POST', '/stacca').then(function (r) {
      if (io) io.saldo = r.saldo;
      disegnaSaldo(true);
      avviso('Incassato: ' + puntiIt(r.punti) + ' punti a ' + numeroIt(r.quota, 2) + ' × ' + Math.round(r.fetta * 100) +
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
      cassaDelGioco = false;
      ultimaPartita = -1;
      chiudiPortafoglio();
      var g = (sala && sala.giochi || []).filter(function (x) { return x.id === id; })[0];
      $('cornice-nome').textContent = (ICONE_SALA[id] || '') + ' ' + (g ? g.nome : id);
      $('cornice-ricarica').hidden = true;
      $('cornice').hidden = false;
      caricaNellaCornice(RADICE + '/sala/' + id + '/?suite=1');
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
      caricaNellaCornice(RADICE + '/sala/' + id + '/');
    });
  }

  /**
   * Un gioco nella cornice **senza lasciare tracce nella cronologia** (1.4.5).
   *
   * Cambiare la «src» di un iframe gia' in pagina aggiunge un passo alla
   * cronologia: sull'app Android il tasto indietro tornava da un gioco
   * all'altro invece di uscire, ed era uno dei modi in cui «non c'e' un modo
   * per uscire dalla sala giochi». Un iframe nuovo, con l'indirizzo dato
   * prima di metterlo in pagina, carica senza passo in piu'.
   */
  function caricaNellaCornice(indirizzo) {
    var vecchio = $('cornice-gioco');
    var nuovo = document.createElement('iframe');
    nuovo.id = 'cornice-gioco';
    nuovo.title = 'Gioco';
    nuovo.setAttribute('allow', 'autoplay; fullscreen');
    if (indirizzo) nuovo.src = indirizzo;
    vecchio.parentNode.replaceChild(nuovo, vecchio);
  }

  function chiudiGioco() {
    caricaNellaCornice('');
    $('cornice-tagli').hidden = true;
    chiudiPortafoglio();
    $('cornice').hidden = true;
    giocoAperto = null;
    cassaDelGioco = false;
    caricaSala();
  }

  function ricaricaDallaCornice() { apriPortafoglio(); }

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
      dettoDellaRicarica = String(d.ricarica || '');
      cambioDelGioco = Number(d.cambio) || 0;
      cassaDelGioco = Boolean(d.cassa);
      // 1.4.8: si ricarica toccando il portafoglio, non da un tasto a parte.
      $('cornice-ricarica').hidden = true;
      disegnaTagliAlVolo();
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
      // Il gioco chiede di ricaricare: si apre il portafoglio, e quante lire lo
      // sceglie chi gioca. Le monete arrivano al gioco quando conferma.
      apriPortafoglio();
      rispondi({ aperto: true });
    } else if (m.cosa === 'stacca') {
      staccaAdesso().then(rispondi, sbaglio);
    } else if (m.cosa === 'incassa') {
      chiedi('POST', '/sala/incassa', { gioco: d.gioco || giocoAperto, grezzo: d.grezzo, fine: d.fine === true, chiudi: d.chiudi === true })
        .then(function (r) { rispondi(r); dopoLIncasso(r); }, function (e) { avviso(e.message, 'male'); sbaglio(e); });
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
    if (qui('#cornice-ricarica') || qui('#al-volo-altro') || qui('#pastiglia-portafoglio')) { ricaricaDallaCornice(); return; }
    if (qui('#portafoglio-incassa')) { chiediIncassoAlGioco(); return; }
    var alVolo = qui('[data-al-volo]');
    if (alVolo) { ricaricaDi(Number(alVolo.getAttribute('data-al-volo'))).catch(function () {}); return; }
    var taglio = qui('[data-ricarica]');
    if (taglio) { segnaQuante(Number(taglio.getAttribute('data-ricarica'))); return; }
    if (qui('#portafoglio-piu')) { segnaQuante(quanteRicarica + Number($('portafoglio-scorri').step) * 2); return; }
    if (qui('#portafoglio-meno')) { segnaQuante(quanteRicarica - Number($('portafoglio-scorri').step) * 2); return; }
    if (qui('#portafoglio-ok')) { confermaRicarica(); return; }
    if (qui('#portafoglio-chiudi') || b.id === 'portafoglio') { chiudiPortafoglio(); return; }
    if (qui('#cornice-stacca') && cassaDelGioco) { chiediIncassoAlGioco(); return; }
    if (qui('#cornice-stacca') || qui('#stacca-borsa')) {
      staccaAdesso().catch(function (e) { avviso(e.message, 'male'); });
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'portafoglio-scorri') segnaQuante(Number(e.target.value));
  });
  // La pastiglia dei punti smette di brillare da sola.
  document.addEventListener('animationend', function (e) {
    if (e.target && e.target.id === 'pastiglia-punti') e.target.classList.remove('sale');
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
