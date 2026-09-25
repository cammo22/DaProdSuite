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
  /* ------------------------------------------------ il portafoglio (1.4.8) */

  var pf = null;

  /** La linea del saldo, con l area sotto: la stessa idea del patrimonio di DaProdFinanza. */
  function lineaDelSaldo(punti) {
    if (punti.length < 2) {
      return '<svg viewBox="0 0 480 170"><text x="240" y="90" fill="#86a59c" font-size="13" text-anchor="middle">La linea parte da domani: un punto al giorno, col saldo di fine giornata.</text></svg>';
    }
    var min = Infinity, max = -Infinity;
    punti.forEach(function (p) { min = Math.min(min, p.saldo); max = Math.max(max, p.saldo); });
    if (max - min < 1) { max += 1; min = Math.max(0, min - 1); }
    var w = 480, h = 170, passo = w / (punti.length - 1);
    var y = function (v) { return 14 + (h - 34) * (1 - (v - min) / (max - min)); };
    var linea = punti.map(function (p, i) { return (i ? 'L' : 'M') + (i * passo).toFixed(1) + ' ' + y(p.saldo).toFixed(1); }).join('');
    var su = punti[punti.length - 1].saldo >= punti[0].saldo;
    var col = su ? '#3dff8a' : '#ff5c6c';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".35"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + linea + 'L' + w + ' ' + (h - 20) + 'L0 ' + (h - 20) + 'Z" fill="url(#pf-area)"/>' +
      '<path d="' + linea + '" fill="none" stroke="' + col + '" stroke-width="2.2" vector-effect="non-scaling-stroke"/>' +
      '<text x="4" y="12" fill="#86a59c" font-size="11">' + soldi(max) + '</text>' +
      '<text x="4" y="' + (h - 24) + '" fill="#86a59c" font-size="11">' + soldi(min) + '</text>' +
      '<text x="4" y="' + (h - 4) + '" fill="#86a59c" font-size="11">' + sicuro(punti[0].giorno) + '</text>' +
      '<text x="' + (w - 4) + '" y="' + (h - 4) + '" fill="#86a59c" font-size="11" text-anchor="end">oggi</text></svg>';
  }

  function colonnaFlussi(titolo, voci, classe) {
    if (!voci.length) return '<div class="pf-colonna ' + classe + '"><h3>' + titolo + '</h3><div class="pf-vuoto">Ancora niente.</div></div>';
    var max = voci[0].lire || 1;
    return '<div class="pf-colonna ' + classe + '"><h3>' + titolo + '</h3>' + voci.slice(0, 6).map(function (v) {
      return '<div class="pf-voce"><div class="nome"><span>' + sicuro(v.perche) + '</span><b>' + soldi(v.lire) + '</b></div>' +
        '<div class="barra"><i style="width:' + Math.max(4, Math.round(100 * v.lire / max)) + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  function disegnaPortafoglioGiocatore() {
    if (!pf) return;
    var su = pf.variazione >= 0;
    $('pf-testa').innerHTML =
      '<small>Il tuo patrimonio</small>' +
      '<div class="tanto"><b>' + soldi(pf.saldo) + '</b><span>' + euroIt(pf.saldo) + '</span></div>' +
      '<div class="mossa ' + (su ? 'su' : 'giu') + '">' + (su ? '▲ +' : '▼ ') + soldi(pf.variazione) + ' dal ' + sicuro(pf.andamento[0] ? pf.andamento[0].giorno : 'primo giorno') + '</div>' +
      '<div class="pf-livello"><span class="liv">liv. ' + pf.livello + '</span><div class="barra"><i style="width:' + Math.round(pf.versoIlProssimo * 100) + '%"></i></div>' +
      '<small>' + Math.round(pf.versoIlProssimo * 100) + '% al ' + (pf.livello + 1) + '</small></div>' +
      '<small style="text-transform:none;letter-spacing:0">Giocare fa salire di livello: ricariche, incassi e partite finite danno esperienza.</small>';
    $('pf-grafico').innerHTML = lineaDelSaldo(pf.andamento);
    $('pf-flussi').innerHTML = colonnaFlussi('Entrate', pf.entrate, 'dentro') + colonnaFlussi('Uscite', pf.uscite, 'fuori');
    var titoli = pf.giochi.map(function (g) {
      var r = g.resa;
      var classe = r === null ? 'pari' : r > 0 ? 'su' : r < 0 ? 'giu' : 'pari';
      return '<div class="pf-titolo"><span class="ico">' + (ICONE_SALA[g.id] || '🎮') + '</span>' +
        '<div class="chi"><b>' + sicuro(g.nome) + '</b><small>messe ' + soldi(g.messo) + ' · tornate ' + soldi(g.tornato) +
        (g.partite ? ' · ' + g.partite + (g.partite === 1 ? ' partita' : ' partite') : '') +
        (g.finite ? ' · finite ' + g.finite + (g.record ? ', record ' + numeroIt(g.record, 0) + ' min' : '') : '') + '</small></div>' +
        '<div class="resa ' + classe + '">' + (r === null ? '—' : (r > 0 ? '+' : '') + numeroIt(r, 1) + '%') + '<small>resa</small></div></div>';
    }).join('');
    var s = pf.sala;
    titoli += '<div class="pf-titolo"><span class="ico">🏛️</span><div class="chi"><b>Tutta la sala</b><small>messe ' + soldi(s.messo) + ' · tornate ' + soldi(s.tornato) + '</small></div>' +
      '<div class="resa ' + (s.resa === null ? 'pari' : s.resa >= 0 ? 'su' : 'giu') + '">' + (s.resa === null ? '—' : (s.resa > 0 ? '+' : '') + numeroIt(s.resa, 1) + '%') + '<small>resa</small></div></div>';
    $('pf-titoli').innerHTML = titoli;
    $('pf-movimenti').innerHTML = (pf.movimenti || []).length ? pf.movimenti.map(function (m) {
      var piu = m.lire > 0;
      return '<div class="pf-mov"><span class="cosa">' + sicuro(m.perche) + '</span><span class="quanto ' + (piu ? 'su' : 'giu') + '">' +
        (piu ? '+' : '−') + soldi(Math.abs(m.lire)) + '</span><small>' + quando(m.quando) + '</small><small class="dx">saldo ' + soldi(m.saldo) + '</small></div>';
    }).join('') : '<div class="pf-vuoto">I movimenti si scrivono da adesso: ricarica un gioco o fai un giro alla slot.</div>';
  }

  function caricaPortafoglioGiocatore() {
    return chiedi('GET', '/portafoglio').then(function (p) { pf = p; disegnaPortafoglioGiocatore(); return p; })
      .catch(function (e) { avviso(e.message, 'male'); });
  }

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
  });

  var vaiAPortafoglio = vaiA;
  vaiA = function (dove) {
    vaiAPortafoglio(dove);
    if (dove === 'portafoglio') caricaPortafoglioGiocatore();
    if (dove === 'casse') caricaSala().then(disegnaCasse);
  };
`;
