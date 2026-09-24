/**
 * Il copione dello Studio (1.4.5). Vedi `studio-markup.ts` e `../studio.ts`.
 *
 * Sta dopo gli altri copioni nella stessa funzione e ne usa gli attrezzi
 * (`chiedi`, `avviso`, `soldi`, `sicuro`, `io`, `vaiA`, `chiediQualcosa`,
 * `grandeCosa`, `disegnaSaldo`). ⚠ Niente apici inversi e niente barre
 * rovesciate: questo testo finisce dentro una stringa di TypeScript, e una
 * barra rovesciata qui ne vorrebbe due. Gli apostrofi nei testi sono
 * «&#39;» nell'HTML e APO nel resto.
 */
export const COPIONE_STUDIO = `
  /* ------------------------------------------------------ lo Studio (1.4.5) */

  var APO = String.fromCharCode(39);
  var studio = null;
  var formaStudio = '1:1';
  var veloceStudio = true;
  var orologioStudio = null;

  var FORME_DISEGNO = { '1:1': [16, 16], '4:3': [20, 15], '16:9': [22, 12], '9:16': [12, 22] };

  function costoStudio() {
    if (!studio) return 0;
    return veloceStudio ? studio.costi.veloce : studio.costi.fine;
  }

  function disegnaScelteStudio() {
    if (!studio) return;
    $('studio-forme').innerHTML = studio.forme.map(function (f) {
      var d = FORME_DISEGNO[f] || [16, 16];
      return '<button type="button" data-forma-studio="' + f + '"' + (f === formaStudio ? ' class="scelto"' : '') + '>' +
        '<span class="rett" style="width:' + d[0] + 'px;height:' + d[1] + 'px"></span>' + f + '</button>';
    }).join('');
    $('studio-modi').innerHTML =
      '<button type="button" data-modo-studio="veloce"' + (veloceStudio ? ' class="scelto"' : '') + '>&#9889; Veloce <small>5 passi · ' + soldi(studio.costi.veloce) + '</small></button>' +
      '<button type="button" data-modo-studio="fine"' + (!veloceStudio ? ' class="scelto"' : '') + '>&#10024; Fine <small>40 passi · ' + soldi(studio.costi.fine) + '</small></button>';
    aggiornaVaiStudio();
  }

  function aggiornaVaiStudio() {
    var testo = $('studio-testo').value.trim();
    var costo = costoStudio();
    var saldo = io ? io.saldo : 0;
    $('studio-conta').textContent = testo.length + ' / 800';
    var b = $('studio-vai');
    if (!studio || !studio.puoi) {
      b.disabled = true;
      b.textContent = 'Qui non si genera';
      $('studio-nota').textContent = 'Lo Studio usa la scheda video del computer DaProd: da qui non c' + APO + 'e' + APO + '.';
      return;
    }
    b.disabled = testo.length < 3 || saldo < costo;
    b.textContent = saldo < costo ? 'Servono ' + soldi(costo) : 'Crea · ' + soldi(costo);
    $('studio-nota').textContent = veloceStudio
      ? 'Veloce: Qwen-Image 2.1 turbo, pronta in pochi secondi quando tocca a te.'
      : 'Fine: il modello di serie a 40 passi, piu' + APO + ' lento e piu' + APO + ' curato.';
  }

  function statoDetto(l) {
    if (l.rimborsato) return 'scartata da chi comanda: ti sono tornate ' + soldi(l.costo);
    if (l.stato === 'in-attesa') return 'aspetta il si' + APO + ' di chi comanda';
    if (l.stato === 'accettata') return 'in fila';
    if (l.stato === 'in-lavoro') return 'la sto disegnando…';
    if (l.stato === 'pronta') return 'pronta, la sto portando qui…';
    return 'la sto preparando…';
  }

  function disegnaQuaderno() {
    var q = $('studio-quaderno');
    if (!studio) { q.innerHTML = ''; return; }
    if (!studio.lavori.length) {
      q.innerHTML = '<div class="studio-vuoto">Qui finiscono le cose che crei e ritocchi. La prima e' + APO + ' a un tocco da qui sopra.</div>';
      return;
    }
    q.innerHTML = studio.lavori.map(function (l, i) {
      var frutto = l.frutti && l.frutti[0];
      // Il riquadro ha la forma chiesta, anche prima che l'immagine arrivi.
      var d = FORME_DISEGNO[l.forma] || [16, 16];
      var forma = ' style="aspect-ratio:' + d[0] + ' / ' + d[1] + '"';
      var quadro = frutto
        ? '<div class="quadro"' + forma + '><img src="' + sicuro(frutto.url) + '" alt="" loading="lazy" data-studio-guarda="' + i + '"></div>'
        : '<div class="quadro' + (l.rimborsato ? '' : ' lavora') + '"' + forma + '><span class="aspetta">' + sicuro(statoDetto(l)) + '</span></div>';
      var tasti = frutto
        ? '<div class="tasti">' +
          (studio.puoiRitoccare ? '<button type="button" data-studio-ritocca="' + i + '">&#9998; Ritocca · ' + soldi(studio.costi.ritocco) + '</button>' : '') +
          '<button type="button" data-studio-figurina="' + i + '">&#127183; Falla figurina</button></div>'
        : '';
      return '<div class="studio-lavoro">' + quadro +
        '<div class="testo">' + (l.che === 'ritocco' ? '<b>ritocco:</b> ' : '') + sicuro(l.testo) +
        (l.scritta ? ' · <b>«' + sicuro(l.scritta) + '»</b>' : '') + '</div>' +
        '<div class="dati"><span>' + sicuro(l.forma) + '</span><span>' + (l.veloce ? 'veloce' : 'fine') + '</span><span>' + soldi(l.costo) + '</span><span>' + quando(l.quando) + '</span></div>' +
        tasti + '</div>';
    }).join('');
  }

  function caricaStudio() {
    return chiedi('GET', '/studio').then(function (d) {
      studio = d;
      if (io && typeof d.saldo === 'number') { io.saldo = d.saldo; disegnaSaldo(false); }
      if (d.rimborsate) avviso('Chi comanda ha scartato una tua richiesta: ti sono tornate ' + soldi(d.rimborsate) + '.', 'bene');
      disegnaScelteStudio();
      disegnaQuaderno();
      // Finche' qualcosa sta ancora arrivando, si riguarda da soli.
      var inArrivo = d.lavori.some(function (l) { return !(l.frutti && l.frutti.length) && !l.rimborsato; });
      if (orologioStudio) { clearTimeout(orologioStudio); orologioStudio = null; }
      if (inArrivo) orologioStudio = setTimeout(function () { if (viva('p-studio') && !document.hidden) caricaStudio(); }, 5000);
      return d;
    }).catch(function (e) { avviso(e.message, 'male'); });
  }

  function creaNelloStudio() {
    var b = $('studio-vai');
    b.disabled = true;
    chiedi('POST', '/studio/crea', {
      testo: $('studio-testo').value.trim(),
      scritta: $('studio-scritta').value.trim(),
      forma: formaStudio,
      veloce: veloceStudio,
    }).then(function (r) {
      if (io) io.saldo = r.saldo;
      disegnaSaldo(true);
      avviso('Mandata: ' + soldi(r.lavoro.costo) + '. La trovi qui sotto quando e' + APO + ' pronta.', 'bene');
      caricaStudio();
    }).catch(function (e) { avviso(e.message, 'male'); aggiornaVaiStudio(); });
  }

  function ritoccaNelloStudio(l) {
    var frutto = l.frutti && l.frutti[0];
    if (!frutto) return;
    chiediQualcosa('Cosa deve cambiare?',
      'Qwen la ridisegna cambiando solo quello che dici. Costa ' + soldi(studio.costi.ritocco) + '.',
      { righe: 2, suggerimento: 'fallo di notte, con la luna piena', tastoSi: 'Ritocca' }).then(function (istruzione) {
        if (istruzione === null || !istruzione.trim()) return;
        chiedi('POST', '/studio/ritocca', { libreria: frutto.id, istruzione: istruzione.trim() }).then(function (r) {
          if (io) io.saldo = r.saldo;
          disegnaSaldo(true);
          avviso('Ritocco mandato. Arriva qui sotto.', 'bene');
          caricaStudio();
        }).catch(function (e) { avviso(e.message, 'male'); });
      });
  }

  function figurinaDalloStudio(l) {
    var frutto = l.frutti && l.frutti[0];
    if (!frutto) return;
    chiediQualcosa('Come si chiama?',
      'Diventa una figurina e va in fila: se chi comanda la prende, entra nella collezione e ti paga.',
      { valore: l.testo.slice(0, 40), tastoSi: 'Mandala in fila' }).then(function (titolo) {
        if (titolo === null) return;
        chiedi('POST', '/manda-dalla-libreria', {
          tipo: 'immagine', titolo: titolo.trim() || l.testo.slice(0, 40), idLibreria: frutto.id,
          mime: frutto.mime, comeEraFatta: l.testo + (l.scritta ? ' · «' + l.scritta + '»' : ''),
        }).then(function () {
          avviso('In fila come figurina. La segui in «Le mie».', 'bene');
          if (typeof coriandoli === 'function') coriandoli(30, ['#b07cff', '#3ddbff', '#ffffff']);
        }).catch(function (e) { avviso(e.message, 'male'); });
      });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    var f = qui('[data-forma-studio]');
    if (f) { formaStudio = f.getAttribute('data-forma-studio'); disegnaScelteStudio(); return; }
    var m = qui('[data-modo-studio]');
    if (m) { veloceStudio = m.getAttribute('data-modo-studio') === 'veloce'; disegnaScelteStudio(); return; }
    if (qui('#studio-vai')) { creaNelloStudio(); return; }
    if (qui('#studio-aggiorna')) { caricaStudio(); return; }
    if (qui('#studio-dado')) {
      chiedi('GET', '/studio/dado').then(function (d) {
        $('studio-testo').value = d.testo;
        aggiornaVaiStudio();
        avviso('Dal dado: ' + d.nomi.join(' · '), '');
      }).catch(function (e) { avviso(e.message, 'male'); });
      return;
    }
    var r = qui('[data-studio-ritocca]');
    if (r && studio) { ritoccaNelloStudio(studio.lavori[Number(r.getAttribute('data-studio-ritocca'))]); return; }
    var fi = qui('[data-studio-figurina]');
    if (fi && studio) { figurinaDalloStudio(studio.lavori[Number(fi.getAttribute('data-studio-figurina'))]); return; }
    var g = qui('[data-studio-guarda]');
    if (g && studio) {
      var l = studio.lavori[Number(g.getAttribute('data-studio-guarda'))];
      var fr = l && l.frutti && l.frutti[0];
      if (fr && typeof grandeCosa === 'function') grandeCosa(fr.url, fr.mime, l.testo, '');
    }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target && ev.target.id === 'studio-testo') aggiornaVaiStudio();
  });

  var vaiAStudio = vaiA;
  vaiA = function (dove) {
    vaiAStudio(dove);
    if (dove === 'studio') caricaStudio();
  };
`;
