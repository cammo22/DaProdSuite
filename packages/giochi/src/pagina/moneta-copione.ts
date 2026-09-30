/**
 * Il copione della moneta DaProd (1.7.8). Vedi `../moneta.ts`.
 *
 * Sta dopo il copione del portafoglio nella stessa funzione e ne usa gli
 * attrezzi (`chiedi`, `soldi`, `sicuro`, `avviso`, `viva`, `vaiA`, `graficoLinea`,
 * `numeroIt`, `euroIt`, `oraCorta`, `allaValuta`, `caricaSala`, `coriandoli`).
 * ⚠ Niente apici inversi e niente barre rovesciate: questo testo finisce dentro
 * una stringa di TypeScript.
 *
 * Cosa fa:
 * - **il gettone** accanto al saldo, sempre visibile;
 * - **la carta della moneta** nel Portafoglio: quante ne hai, quanto vale, la
 *   linea (24 ore, 7 giorni, un mese), il libro e come se ne guadagnano;
 * - **l'annuncio**: quando un incasso, un livello o un giro da' una moneta,
 *   una riga lo dice e i coriandoli sono oro;
 * - **per chi comanda**, nelle Casse: quante ce ne sono, chi le ha, da dove
 *   vengono, coniare e bruciare (col perche'), e le regole.
 */
export const COPIONE_MONETA = `
  /* --------------------------------------- la moneta DaProd (1.7.8) */

  var mn = null;
  var mnAdmin = null;
  var periodoMn = '7g';
  try { periodoMn = localStorage.getItem('daprod.moneta.periodo') || '7g'; } catch (e) {}

  /** Come si chiama e cosa fa ogni regola, per chi comanda. */
  var REGOLE_MONETA_TESTO = [
    ['moneteFine', 'Monete per una partita finita (Claw, Neon)'],
    ['sogliaEuro', 'Guadagno minimo in euro per un incasso grosso'],
    ['euroPerMoneta', 'Una moneta in piu ogni tanti euro sopra la soglia'],
    ['moneteIncassoMax', 'Il massimo di monete per un solo incasso'],
    ['moneteEthernal', 'Monete per un Ethernal in slot'],
    ['livelloOgni', 'Un premio ogni tanti livelli'],
    ['moneteLivello', 'Monete per ogni traguardo di livello'],
    ['moneteSettimana', 'Monete al primo della settimana'],
    ['moneteMese', 'Monete al jackpot del mese'],
    ['tettoSettimana', 'Tetto: monete a settimana per persona'],
    ['prezzoBase', 'Quotazione di base (lire per moneta)'],
    ['rifCircolanti', 'Monete in giro che dimezzano la scarsita'],
    ['rifGiocatori', 'Giocatori al giorno per il rialzo pieno']
  ];

  function disegnaChipMoneta() {
    var c = $('mn-chip');
    if (!c) return;
    var n = mn ? mn.monete : (io && typeof io.monete === 'number' ? io.monete : 0);
    c.innerHTML = '<i class="gettone mini"><i>D</i></i>' + numeroIt(n, 0);
    c.hidden = !io;
  }

  function caricaMoneta() {
    return chiedi('GET', '/moneta').then(function (m) {
      mn = m;
      if (io) io.monete = m.monete;
      disegnaChipMoneta();
      if (viva('p-portafoglio')) disegnaMoneta();
      return m;
    }).catch(function () { return null; });
  }

  function disegnaMoneta() {
    var dove = $('mn-blocco');
    if (!dove) return;
    if (!mn) { dove.innerHTML = ''; return; }
    var punti = mn.serie[periodoMn] || [];
    var su = mn.variazione24h >= 0;
    var c = mn.come;
    var h = '<div class="mn-carta">' +
      '<div class="mn-testa"><div class="gettone"><i>D</i></div><div><small>Moneta DaProd</small>' +
      '<b class="mn-tanto">' + numeroIt(mn.monete, 0) + '</b>' +
      '<span class="mn-vale">ogni moneta vale ' + soldi(mn.quota) + '</span> ' +
      '<span class="mn-mossa ' + (su ? 'su' : 'giu') + '">' + (su ? '▲ +' : '▼ −') + numeroIt(Math.abs(mn.variazione24h), 1) + '% in 24 ore</span></div></div>' +
      '<div class="mn-periodi">' + ['24h', '7g', '1m'].map(function (p) {
        return '<button data-mn-periodo="' + p + '"' + (p === periodoMn ? ' class="scelto"' : '') + '>' + (p === '1m' ? '1 mese' : p) + '</button>';
      }).join('') + '</div>' +
      '<div class="mn-grafico">' + graficoLinea(punti, { alto: 150, colore: '#ffd166', vuoto: 'La linea comincia da adesso.' }) + '</div>' +
      '<div class="mn-numeri">' +
      '<span><small>ne hai</small><b>' + numeroIt(mn.monete, 0) + '</b></span>' +
      '<span><small>guadagnate da sempre</small><b>' + numeroIt(mn.guadagnate, 0) + '</b></span>' +
      '<span><small>questa settimana ne puoi ancora prendere</small><b>' + numeroIt(mn.settimana.resta, 0) + ' su ' + numeroIt(mn.settimana.tetto, 0) + '</b></span>' +
      '<span><small>in giro, di tutti</small><b>' + numeroIt(mn.circolanti, 0) + '</b></span>' +
      '</div>' +
      '<details class="mn-come"><summary>Come si guadagnano</summary><ul>' +
      '<li>Finendo una partita a Claw o a Neon: ' + c.moneteFine + (c.moneteFine === 1 ? ' moneta' : ' monete') + '.</li>' +
      '<li>Con un incasso grosso: da ' + numeroIt(c.sogliaEuro, 0) + ' euro di guadagno in su, una moneta, e una in piu ogni ' + numeroIt(c.euroPerMoneta, 0) + ' euro (al massimo ' + c.moneteIncassoMax + ' per volta).</li>' +
      '<li>Ogni ' + c.livelloOgni + ' livelli, toccando il premio del livello: ' + c.moneteLivello + '.</li>' +
      '<li>Un Ethernal in slot: ' + c.moneteEthernal + '.</li>' +
      '<li>Primo della settimana della Banca: ' + c.moneteSettimana + '. Jackpot del mese: ' + c.moneteMese + '.</li>' +
      '<li>Non si comprano, non si cambiano in lire e non escono dalla sala: si guadagnano giocando, e basta. Il tetto e ' + c.tettoSettimana + ' a settimana.</li>' +
      '</ul></details>';
    var libro = mn.libro || [];
    h += '<div class="mn-libro">' + (libro.length ? libro.slice(0, 6).map(function (r) {
      return '<div class="mn-riga"><b>' + sicuro(r.perche) + '</b><span class="' + (r.monete >= 0 ? 'su' : 'giu') + '">' + (r.monete >= 0 ? '+' : '−') + numeroIt(Math.abs(r.monete), 0) + '</span>' +
        '<small>' + sicuro(oraCorta(r.quando)) + ' · ne avevi ' + numeroIt(r.saldo, 0) + '</small></div>';
    }).join('') : '<div class="mn-fine">Ancora nessuna moneta: si guadagnano con le cose che fanno fatica, non con quelle che si ripetono.</div>') + '</div>';
    dove.innerHTML = h + '</div>';
  }

  /** Una riga quando arriva una moneta: lo dice, e i coriandoli sono oro. */
  function annunciaMonete(n) {
    avviso('+' + n + (n === 1 ? ' moneta' : ' monete') + ' DaProd 🪙', 'bene');
    if (typeof coriandoli === 'function') coriandoli(26, ['#ffd166', '#fff1b8', '#f2b233']);
    caricaMoneta();
  }

  // Ogni risposta che porta con se delle monete guadagnate le annuncia: incassi,
  // premi dei livelli e giri. Un posto solo, e nessun gioco se ne dimentica.
  var chiediSenzaMoneta = chiedi;
  chiedi = function (metodo, dove, corpo) {
    return chiediSenzaMoneta(metodo, dove, corpo).then(function (r) {
      if (r && typeof r.monete === 'number' && r.monete > 0 &&
          (dove === '/sala/incassa' || dove === '/livello/riscuoti' || dove === '/gira')) annunciaMonete(r.monete);
      return r;
    });
  };

  /* ---------------------------------------------- per chi comanda */

  function caricaMonetaAdmin() {
    if (!(io && io.admin)) return Promise.resolve(null);
    return chiedi('GET', '/moneta/admin').then(function (m) { mnAdmin = m; disegnaMonetaAdmin(); return m; }).catch(function () { return null; });
  }

  function disegnaMonetaAdmin() {
    var dove = $('mn-admin');
    if (!dove) return;
    dove.hidden = !(io && io.admin && mnAdmin);
    if (!mnAdmin) return;
    var m = mnAdmin;
    var origini = Object.keys(m.origini || {});
    var h = '<h3>La moneta DaProd</h3>' +
      '<div class="cs-numeri">' +
      cifra(numeroIt(m.circolanti, 0), 'monete in giro') +
      cifra(numeroIt(m.coniate, 0), 'nate da sempre') +
      cifra(numeroIt(m.bruciate, 0), 'bruciate') +
      cifra(soldi(m.quota), 'quotazione di una moneta') + '</div>' +
      (origini.length ? '<div class="mn-libro">' + origini.map(function (k) {
        return '<div class="mn-riga"><b>da: ' + sicuro(k) + '</b><span>' + numeroIt(m.origini[k], 0) + '</span></div>';
      }).join('') + '</div>' : '') +
      '<h3>Chi le ha</h3><div class="mn-libro">' + (m.titolari.length ? m.titolari.map(function (t) {
        return '<div class="mn-riga"><b>' + sicuro(t.nome) + '</b><span>' + numeroIt(t.monete, 0) + '</span><small>guadagnate giocando: ' + numeroIt(t.guadagnate, 0) + ' · questa settimana ' + numeroIt(t.settimana, 0) + '</small></div>';
      }).join('') : '<div class="mn-fine">Nessuno ha ancora monete.</div>') + '</div>' +
      '<h3>Conia o brucia</h3>' +
      '<div class="mn-gesti"><select id="mn-chi">' + m.conti.map(function (c) { return '<option value="' + sicuro(c.chi) + '">' + sicuro(c.nome) + '</option>'; }).join('') + '</select>' +
      '<input id="mn-quante" type="number" min="1" max="1000" placeholder="quante" inputmode="numeric">' +
      '<input id="mn-perche" type="text" maxlength="120" placeholder="perche (si scrive sempre)">' +
      '<button class="btn oro" id="mn-conia">Conia</button><button class="btn" id="mn-brucia">Brucia</button></div>' +
      '<h3>Le regole</h3><div class="mn-regole">' + REGOLE_MONETA_TESTO.map(function (r) {
        return '<label>' + sicuro(r[1]) + '<input data-mn-regola="' + r[0] + '" type="number" min="0" value="' + m.regole[r[0]] + '"></label>';
      }).join('') + '</div><div class="riga-tasti"><button class="btn oro" id="mn-salva-regole">Salva le regole</button></div>';
    if ((m.registro || []).length) {
      h += '<h3>Gli ultimi gesti</h3><div class="mn-libro">' + m.registro.slice(0, 10).map(function (r) {
        return '<div class="mn-riga"><b>' + sicuro(r.cosa) + '</b><small>' + sicuro(r.nomeDa) + (r.nomeChi ? ' → ' + sicuro(r.nomeChi) : '') + ' · ' + sicuro(oraCorta(r.quando)) + '</small></div>';
      }).join('') + '</div>';
    }
    dove.innerHTML = h;
  }

  function gestoMoneta(come) {
    var chi = $('mn-chi') ? $('mn-chi').value : '';
    var quante = Number($('mn-quante') ? $('mn-quante').value : 0);
    var perche = $('mn-perche') ? $('mn-perche').value : '';
    chiedi('POST', '/moneta/' + come, { chi: chi, quante: quante, perche: perche }).then(function (r) {
      avviso(come === 'conia' ? 'Coniate: ora ne ha ' + r.monete + '.' : 'Bruciate: ora ne ha ' + r.monete + '.', 'bene');
      return caricaMonetaAdmin();
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  function salvaRegoleMoneta() {
    var corpo = {};
    var campi = document.querySelectorAll('[data-mn-regola]');
    for (var i = 0; i < campi.length; i++) corpo[campi[i].getAttribute('data-mn-regola')] = Number(campi[i].value);
    chiedi('POST', '/moneta/regole', corpo).then(function () {
      avviso('Regole della moneta salvate.', 'bene');
      return caricaMonetaAdmin();
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    var per = qui('[data-mn-periodo]');
    if (per) {
      periodoMn = per.getAttribute('data-mn-periodo');
      try { localStorage.setItem('daprod.moneta.periodo', periodoMn); } catch (e) {}
      disegnaMoneta();
      return;
    }
    if (qui('#mn-chip')) { vaiA('portafoglio'); return; }
    if (qui('#mn-conia')) { gestoMoneta('conia'); return; }
    if (qui('#mn-brucia')) { gestoMoneta('brucia'); return; }
    if (qui('#mn-salva-regole')) { salvaRegoleMoneta(); return; }
  });

  var vaiAMoneta = vaiA;
  vaiA = function (dove) {
    vaiAMoneta(dove);
    if (dove === 'portafoglio' || dove === 'sala' || dove === 'home') caricaMoneta();
    if (dove === 'casse') caricaMonetaAdmin();
  };
  setInterval(function () {
    if (document.hidden || !io) return;
    if (viva('p-portafoglio')) caricaMoneta();
  }, 30000);
  allaValuta.push(function () { if (viva('p-portafoglio')) disegnaMoneta(); });
  // Alla prima apertura il gettone si riempie appena si sa chi sei.
  var provaChip = setInterval(function () {
    if (io) { clearInterval(provaChip); caricaMoneta(); }
  }, 500);
`;
