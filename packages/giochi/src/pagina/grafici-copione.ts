/**
 * I grafici della sala (1.4.9): la linea del saldo e le barre dei giorni.
 *
 * Chiesto il 25 settembre 2026: «questi quadrati con questi numeri anonimi:
 * dobbiamo mettere linee, grafiche e statistiche per utenti che possono
 * importargli davvero, e statistiche per admin per capire l'andamento della
 * sala giochi». E per la Borsa: «sembrare un vero portafoglio crypto bancario,
 * con selettore 24h, 7g, 1 mese».
 *
 * Sono SVG scritti a mano, niente librerie: la pagina e' servita dal computer
 * di casa e deve aprirsi anche senza rete. La linea si tocca: il dito (o il
 * mouse) mostra il valore e l'ora del punto piu' vicino.
 *
 * Stesse regole degli altri copioni: una stringa sola, niente apici inversi e
 * niente barre rovesciate.
 */
export const COPIONE_GRAFICI = `
  /* ---------------------------------------------------- i grafici (1.4.9) */

  var GRAFICI = {};
  var graficiNati = 0;

  /** «14:05», «ieri 21:10», «12 set»: l'ora di un punto, detta corta. */
  function oraCorta(t) {
    var d = new Date(t), oggi = new Date();
    var hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === oggi.toDateString()) return hh;
    var ieri = new Date(oggi.getTime() - 86400000);
    if (d.toDateString() === ieri.toDateString()) return 'ieri ' + hh;
    return d.getDate() + ' ' + ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'][d.getMonth()];
  }

  /**
   * La linea: punti [{ t, v }] in ordine di tempo. Verde se finisce sopra a
   * dove e' partita, rossa se sotto. «come» scrive i valori (di solito soldi).
   */
  function graficoLinea(punti, opzioni) {
    opzioni = opzioni || {};
    var w = 480, h = opzioni.alto || 180, basso = h - 22;
    if (!punti || punti.length < 2) {
      return '<svg viewBox="0 0 ' + w + ' ' + h + '"><text x="' + (w / 2) + '" y="' + (h / 2) + '" fill="#86a59c" font-size="13" text-anchor="middle">' +
        sicuro(opzioni.vuoto || 'Ancora niente da disegnare: gioca, e la linea parte.') + '</text></svg>';
    }
    var come = opzioni.come || soldi;
    var t0 = punti[0].t, t1 = punti[punti.length - 1].t;
    if (t1 <= t0) t1 = t0 + 1;
    var min = Infinity, max = -Infinity;
    punti.forEach(function (p) { min = Math.min(min, p.v); max = Math.max(max, p.v); });
    if (max - min < 1) { max += 1; min -= 1; }
    var margine = (max - min) * 0.08;
    min -= margine; max += margine;
    var x = function (t) { return ((t - t0) / (t1 - t0)) * w; };
    var y = function (v) { return 10 + (basso - 20) * (1 - (v - min) / (max - min)); };
    var linea = punti.map(function (p, i) { return (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join('');
    var su = punti[punti.length - 1].v >= punti[0].v;
    var col = opzioni.colore || (su ? '#3dff8a' : '#ff5c6c');
    var id = 'gr' + (++graficiNati);
    GRAFICI[id] = { punti: punti, x: x, y: y, come: come, w: w };
    var inizio = y(punti[0].v).toFixed(1);
    return '<svg class="grafico-vivo" data-grafico="' + id + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + id + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".38"/>' +
      '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="0" x2="' + w + '" y1="' + inizio + '" y2="' + inizio + '" stroke="#86a59c" stroke-opacity=".35" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + linea + 'L' + w + ' ' + basso + 'L0 ' + basso + 'Z" fill="url(#' + id + 'a)"/>' +
      '<path d="' + linea + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<text x="4" y="' + (h - 5) + '" fill="#86a59c" font-size="11">' + sicuro(oraCorta(t0)) + '</text>' +
      '<text x="' + (w - 4) + '" y="' + (h - 5) + '" fill="#86a59c" font-size="11" text-anchor="end">' + sicuro(opzioni.fine || 'adesso') + '</text>' +
      '<g class="mirino" hidden><line y1="0" y2="' + basso + '" stroke="#e9fff3" stroke-opacity=".5" vector-effect="non-scaling-stroke"/>' +
      '<circle r="5" fill="' + col + '" stroke="#04110b" stroke-width="2"/></g></svg>' +
      '<div class="grafico-dito" data-dito="' + id + '" hidden></div>';
  }

  /** Il dito sulla linea: il punto piu' vicino, col suo valore e la sua ora. */
  function mostraIlPunto(svg, clientX) {
    var g = GRAFICI[svg.getAttribute('data-grafico')];
    if (!g) return;
    var r = svg.getBoundingClientRect();
    var fx = ((clientX - r.left) / r.width) * g.w;
    var migliore = g.punti[0], dist = Infinity;
    g.punti.forEach(function (p) { var d = Math.abs(g.x(p.t) - fx); if (d < dist) { dist = d; migliore = p; } });
    var mirino = svg.querySelector('.mirino');
    var px = g.x(migliore.t), py = g.y(migliore.v);
    mirino.removeAttribute('hidden');
    mirino.querySelector('line').setAttribute('x1', px);
    mirino.querySelector('line').setAttribute('x2', px);
    mirino.querySelector('circle').setAttribute('cx', px);
    mirino.querySelector('circle').setAttribute('cy', py);
    var dito = svg.parentNode.querySelector('[data-dito="' + svg.getAttribute('data-grafico') + '"]');
    if (dito) {
      dito.hidden = false;
      dito.innerHTML = '<b>' + sicuro(g.come(migliore.v)) + '</b><small>' + sicuro(oraCorta(migliore.t)) + (migliore.detto ? ' · ' + sicuro(migliore.detto) : '') + '</small>';
      var sx = (px / g.w) * r.width;
      dito.style.left = Math.max(4, Math.min(r.width - 150, sx - 70)) + 'px';
    }
  }
  function nascondiIlPunto(svg) {
    var m = svg.querySelector('.mirino');
    if (m) m.setAttribute('hidden', '');
    var dito = svg.parentNode.querySelector('[data-dito="' + svg.getAttribute('data-grafico') + '"]');
    if (dito) dito.hidden = true;
  }
  document.addEventListener('pointermove', function (e) {
    var svg = e.target && e.target.closest ? e.target.closest('.grafico-vivo') : null;
    if (svg) mostraIlPunto(svg, e.clientX);
  });
  document.addEventListener('pointerdown', function (e) {
    var svg = e.target && e.target.closest ? e.target.closest('.grafico-vivo') : null;
    if (svg) mostraIlPunto(svg, e.clientX);
  });
  document.addEventListener('pointerout', function (e) {
    var svg = e.target && e.target.closest ? e.target.closest('.grafico-vivo') : null;
    if (svg && e.pointerType === 'mouse') nascondiIlPunto(svg);
  });

  /**
   * Le barre dei giorni: [{ giorno, ... }] e le serie da mettere una accanto
   * all'altra, ognuna col suo colore. Sotto, il giorno del mese.
   */
  function graficoBarre(giorni, serie, opzioni) {
    opzioni = opzioni || {};
    var w = 480, h = opzioni.alto || 170, basso = h - 20;
    var max = 1;
    giorni.forEach(function (g) { serie.forEach(function (s) { max = Math.max(max, Number(g[s.chiave]) || 0); }); });
    var passo = w / Math.max(1, giorni.length);
    var largo = Math.max(3, (passo * 0.72) / serie.length);
    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">';
    giorni.forEach(function (g, i) {
      serie.forEach(function (s, k) {
        var v = Number(g[s.chiave]) || 0;
        var alto = v > 0 ? Math.max(2, ((basso - 8) * v) / max) : 0;
        var x = i * passo + passo * 0.14 + k * largo;
        out += '<rect x="' + x.toFixed(1) + '" y="' + (basso - alto).toFixed(1) + '" width="' + (largo - 1).toFixed(1) + '" height="' + alto.toFixed(1) + '" rx="2" fill="' + s.colore + '"><title>' +
          sicuro(s.nome + ' ' + g.giorno + ': ' + (s.come ? s.come(v) : v)) + '</title></rect>';
      });
      if (i % Math.ceil(giorni.length / 7) === 0 || i === giorni.length - 1) {
        out += '<text x="' + (i * passo + passo / 2).toFixed(1) + '" y="' + (h - 5) + '" fill="#86a59c" font-size="11" text-anchor="middle">' + sicuro(String(g.giorno).slice(8, 10)) + '</text>';
      }
    });
    return out + '</svg>';
  }

  /** La leggenda delle barre: pallino colorato e nome. */
  function leggenda(serie) {
    return '<div class="leggenda">' + serie.map(function (s) {
      return '<span><i style="background:' + s.colore + '"></i>' + sicuro(s.nome) + '</span>';
    }).join('') + '</div>';
  }

  /** Una barra orizzontale piena per un pezzo: «quanto di questo sta in quello». */
  function barretta(frazione, colore) {
    var f = Math.max(0, Math.min(1, Number(frazione) || 0));
    return '<span class="barretta"><i style="width:' + Math.round(f * 100) + '%;background:' + (colore || '#3dff8a') + '"></i></span>';
  }
`;
