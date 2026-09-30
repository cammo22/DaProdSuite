/**
 * Il copione della Zecca (1.7.9). Vedi `../zecca.ts` e `../zecca-rotte.ts`.
 *
 * Sta dopo il copione della moneta nella stessa funzione e ne usa gli attrezzi
 * (`chiedi`, `sicuro`, `avviso`, `viva`, `vaiA`, `numeroIt`, `oraCorta`,
 * `coriandoli`, `caricaMoneta`, `io`). ⚠ Niente apici inversi, niente barre
 * rovesciate e niente apostrofi nei testi: questo testo finisce dentro una
 * stringa di TypeScript.
 *
 * Schede: Pacchetti (si aprono con le monete), I miei pezzi (col regalo),
 * Collezioni, Proponi (una cosa tua alla Zecca). Per chi comanda, in piu',
 * «Chi comanda»: proposte da decidere, conio diretto, pacchetti e collezioni.
 * Chi non comanda la scheda non la vede, e i suoi dati non li chiede nemmeno.
 */
export const COPIONE_ZECCA = `
  /* ---------------------------------------------- la Zecca (1.7.9) */

  var zc = null;
  var zcAdmin = null;
  var schedaZc = 'pacchetti';

  function raritaZc(id) {
    var r = zc ? zc.rarita : [];
    for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i];
    return { id: id, nome: id, colore: '#9fb3ad', valore: 1 };
  }

  function emojiTipoZc(t) { return t === 'brano' ? '&#127925;' : t === 'video' ? '&#127916;' : '&#128444;'; }

  function gettoneZc() { return '<i class="gettone mini"><i>D</i></i>'; }

  /** Un pezzo: numero, rarita, il file (intero solo se e tuo), e la sua storia. */
  function pezzoZc(p, tasti) {
    var r = p.rarita;
    var media;
    if (p.url && p.tipo === 'immagine') media = '<img src="' + sicuro(p.url) + '" alt="" loading="lazy">';
    else if (p.url && p.tipo === 'video') media = '<video src="' + sicuro(p.url) + '" poster="' + sicuro(p.anteprima || '') + '" controls playsinline preload="none"></video>';
    else if (p.anteprima) media = '<img src="' + sicuro(p.anteprima) + '" alt="" loading="lazy">';
    else media = emojiTipoZc(p.tipo);
    if (p.url && p.tipo === 'brano') media += '<audio src="' + sicuro(p.url) + '" controls preload="none"></audio>';
    var storia = (p.storia || []).map(function (x) {
      var come = x.come === 'conio' ? 'coniato da' : x.come === 'pacchetto' ? 'aperto da' : x.come === 'mercato' ? 'comprato da' : x.come === 'regalo' ? 'regalato a' : 'passato a';
      return '<li>' + come + ' ' + sicuro(x.nome || x.chi) + ' · ' + sicuro(oraCorta(x.quando)) + (x.monete ? ' · ' + numeroIt(x.monete, 0) + ' monete' : '') + '</li>';
    }).join('');
    return '<div class="pezzo ' + sicuro(r.id) + '" style="--rar:' + sicuro(r.colore) + '">' +
      '<div class="pz-foto">' + media + '<span class="pz-num">' + sicuro(p.numeroScritto) + '</span><span class="pz-rar">' + sicuro(r.nome) + '</span></div>' +
      '<div class="pz-corpo"><b>' + sicuro(p.titolo) + '</b>' +
      '<small>di ' + sicuro(p.nomeCreatore) + (p.nomeProprietario ? ' · ora di ' + sicuro(p.nomeProprietario) : '') + '</small>' +
      '<details><summary>La sua storia</summary><ul>' + storia + '</ul></details>' + (tasti || '') + '</div></div>';
  }

  function caricaZecca() {
    return chiedi('GET', '/zecca').then(function (z) {
      zc = z;
      if (io) io.monete = z.monete;
      if (typeof disegnaChipMoneta === 'function') { try { disegnaChipMoneta(); } catch (e) { /* va bene lo stesso */ } }
      if (viva('p-zecca')) disegnaZecca();
      return z;
    }).catch(function (e) { avviso(e.message, 'male'); return null; });
  }

  function caricaZeccaAdmin() {
    if (!(io && io.admin)) return Promise.resolve(null);
    return chiedi('GET', '/zecca/admin').then(function (a) {
      zcAdmin = a;
      var n = a.proposte.length;
      var pal = $('zc-pallino');
      if (pal) { pal.textContent = String(n); pal.hidden = n === 0; }
      if (viva('p-zecca') && schedaZc === 'admin') disegnaZecca();
      return a;
    }).catch(function () { return null; });
  }

  function disegnaZecca() {
    var testa = $('zc-testa');
    var dentro = $('zc-dentro');
    if (!testa || !dentro) return;
    if (!zc) { dentro.innerHTML = '<div class="zc-vuoto">Apro la Zecca...</div>'; return; }
    var c = zc.conti;
    testa.innerHTML = '<div><h2>La Zecca</h2><small>' + numeroIt(c.coniati, 0) + ' pezzi numerati · ' + numeroIt(c.diNessuno, 0) + ' ancora nei pacchetti · ' + numeroIt(c.assegnati, 0) + ' nelle mani di qualcuno</small></div>' +
      '<div class="zc-saldo">' + gettoneZc() + numeroIt(zc.monete, 0) + '</div>';
    var tasti = document.querySelectorAll('#zc-schede button');
    for (var i = 0; i < tasti.length; i++) tasti[i].classList.toggle('scelto', tasti[i].getAttribute('data-zc') === schedaZc);
    if (schedaZc === 'pacchetti') dentro.innerHTML = schedaPacchettiZc();
    else if (schedaZc === 'miei') dentro.innerHTML = schedaMieiZc();
    else if (schedaZc === 'collezioni') dentro.innerHTML = schedaCollezioniZc();
    else if (schedaZc === 'proponi') dentro.innerHTML = schedaProponiZc();
    else if (schedaZc === 'admin') dentro.innerHTML = schedaAdminZc();
  }

  function schedaPacchettiZc() {
    if (!zc.pacchetti.length) return '<div class="zc-vuoto">Nessun pacchetto in vetrina. Quando chi comanda ne prepara uno, compare qui.</div>';
    return '<div class="zc-griglia" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">' + zc.pacchetti.map(function (k) {
      var dentro = zc.rarita.filter(function (r) { return k.dentro[r.id] > 0; }).map(function (r) {
        return '<span style="--rar:' + sicuro(r.colore) + '">' + k.dentro[r.id] + ' ' + sicuro(r.nome) + '</span>';
      }).join('');
      var pochi = zc.monete < k.prezzo;
      return '<div class="zc-pacco' + (k.finito ? ' finito' : '') + '"><h3>' + sicuro(k.nome) + '</h3>' +
        '<div class="zc-prezzo">' + gettoneZc() + numeroIt(k.prezzo, 0) + ' · ' + k.perApertura + (k.perApertura === 1 ? ' pezzo' : ' pezzi') + ' per pacchetto</div>' +
        '<div class="zc-barra"><i style="width:' + Math.round(100 * k.restano / Math.max(1, k.totali)) + '%"></i></div>' +
        '<small>' + (k.finito ? 'Finito: non ce ne sono altri.' : 'Restano ' + k.restano + ' pezzi su ' + k.totali + '. Non se ne fanno altri.') + '</small>' +
        '<div class="zc-dentro">' + dentro + '</div>' +
        '<button class="btn oro" data-zc-apri="' + sicuro(k.id) + '"' + (k.finito || pochi ? ' disabled' : '') + '>' +
        (k.finito ? 'Finito' : pochi ? 'Ti servono ' + numeroIt(k.prezzo, 0) + ' monete' : 'Apri il pacchetto') + '</button></div>';
    }).join('') + '</div>';
  }

  function schedaMieiZc() {
    if (!zc.miei.length) return '<div class="zc-vuoto">Non hai ancora nessun pezzo. Si guadagnano monete giocando, e con le monete si aprono i pacchetti.</div>';
    return '<div class="zc-griglia">' + zc.miei.map(function (p) {
      var dove = '<select data-zc-a="' + sicuro(p.id) + '"><option value="">regala a...</option>' + zc.gente.map(function (g) {
        return '<option value="' + sicuro(g.id) + '">' + sicuro(g.nome) + '</option>';
      }).join('') + '</select>';
      return pezzoZc(p, zc.gente.length ? '<div class="pz-tasti">' + dove + '<button class="btn" data-zc-regala="' + sicuro(p.id) + '">Regala</button></div>' : '');
    }).join('') + '</div>';
  }

  function schedaCollezioniZc() {
    if (!zc.collezioni.length) return '<div class="zc-vuoto">Nessuna collezione per ora. Chi comanda le mette insieme: chi le completa prende monete.</div>';
    return '<div class="zc-griglia" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + zc.collezioni.map(function (c) {
      var mini = c.pezzi.map(function (p) {
        var r = raritaZc(p.rarita);
        return '<span class="' + (p.mio ? 'mio' : '') + '" style="--rar:' + sicuro(r.colore) + (p.anteprima && p.mio ? ';background-image:url(' + sicuro(p.anteprima) + ')' : '') + '">' + (p.mio && p.anteprima ? '' : sicuro(p.numeroScritto)) + '</span>';
      }).join('');
      return '<div class="zc-coll' + (c.completata ? ' fatta' : '') + '"><h3>' + sicuro(c.nome) + '</h3>' +
        '<div class="zc-mini">' + mini + '</div>' +
        '<small>' + c.hai + ' su ' + c.totali + ' · premio ' + numeroIt(c.premio, 0) + ' monete · completata da ' + c.chiHaCompletato + (c.chiHaCompletato === 1 ? ' persona' : ' persone') + '</small>' +
        (c.completata ? '<small style="color:#3dff8a">Completata: il premio lo hai gia preso.</small>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function sceltaFileZc(lista, nome) {
    if (!lista.length) return '<div class="zc-vuoto">Non hai cose da proporre: crea qualcosa nello Studio e torna qui.</div>';
    return '<div class="zc-scelta">' + lista.map(function (v) {
      var u = v.anteprima || (String(v.mime).indexOf('image/') === 0 ? v.url : '');
      return '<label><input type="radio" name="' + nome + '" value="' + sicuro(v.id) + '"><span' + (u ? ' style="background-image:url(' + sicuro(u) + ')"' : '') + '>' + (u ? '' : emojiTipoZc(String(v.mime).indexOf('audio/') === 0 ? 'brano' : String(v.mime).indexOf('video/') === 0 ? 'video' : 'immagine')) + '</span>' + sicuro(v.titolo) + '</label>';
    }).join('') + '</div>';
  }

  function schedaProponiZc() {
    var h = '<div class="zc-form"><b>Proponi una cosa tua alla Zecca</b>' +
      '<small>Scegli una cosa che hai creato e dalle un nome. Se chi comanda la conia diventa un pezzo numerato, col tuo nome come creatore.</small>' +
      sceltaFileZc(zc.propongo, 'zc-file') +
      '<input id="zc-titolo" type="text" maxlength="80" placeholder="come si chiama">' +
      '<button class="btn oro" data-zc-proponi="1">Proponi</button></div>';
    if (zc.proposte.length) {
      h += '<div class="zc-titolo">Le tue proposte</div>' + zc.proposte.map(function (q) {
        var stato = q.stato === 'coniata' ? 'coniata: e un pezzo' : q.stato === 'rifiutata' ? 'rifiutata: ' + (q.motivo || '') : 'aspetta chi comanda';
        return '<div class="zc-prop"><div class="pz-foto">' + emojiTipoZc(q.tipo) + '</div><div><b>' + sicuro(q.titolo) + '</b><br><small>' + sicuro(stato) + '</small></div></div>';
      }).join('');
    }
    return h;
  }

  /* ---------------------------------------------- per chi comanda */

  function opzioniRaritaZc() {
    return '<option value="caso">rarita a sorte</option>' + zc.rarita.map(function (r) {
      return '<option value="' + sicuro(r.id) + '">' + sicuro(r.nome) + '</option>';
    }).join('');
  }

  function schedaAdminZc() {
    if (!(io && io.admin)) return '';
    if (!zcAdmin) { caricaZeccaAdmin(); return '<div class="zc-vuoto">Apro...</div>'; }
    var a = zcAdmin;
    var h = '<div class="zc-titolo">Proposte da decidere (' + a.proposte.length + ')</div>';
    if (!a.proposte.length) h += '<div class="zc-vuoto">Nessuna proposta in attesa.</div>';
    h += a.proposte.map(function (q) {
      return '<div class="zc-prop"><div class="pz-foto"' + (q.anteprima ? ' style="background-image:url(' + sicuro(q.anteprima) + ')"' : '') + '>' + (q.anteprima ? '' : emojiTipoZc(q.tipo)) + '</div>' +
        '<div><b>' + sicuro(q.titolo) + '</b><br><small>di ' + sicuro(q.nome) + ' · ' + sicuro(oraCorta(q.quando)) + '</small></div>' +
        '<div class="zc-tasti"><select data-zc-rar="' + sicuro(q.id) + '">' + opzioniRaritaZc() + '</select>' +
        '<button class="btn oro" data-zc-approva="' + sicuro(q.id) + '">Conia</button></div>' +
        '<div class="zc-tasti"><input data-zc-motivo="' + sicuro(q.id) + '" type="text" maxlength="160" placeholder="se dici di no, scrivi perche">' +
        '<button class="btn brutto" data-zc-rifiuta="' + sicuro(q.id) + '">Rifiuta</button></div></div>';
    }).join('');

    h += '<div class="zc-titolo">Conia una cosa della libreria</div><div class="zc-form">' +
      sceltaFileZc(a.libreria, 'zc-lib') +
      '<input id="zc-conia-titolo" type="text" maxlength="80" placeholder="come si chiama">' +
      '<select id="zc-conia-rar">' + opzioniRaritaZc() + '</select>' +
      '<button class="btn oro" data-zc-conia="1">Conia</button></div>';

    h += '<div class="zc-titolo">Nuovo pacchetto</div><div class="zc-form">' +
      (a.liberi.length ? '<small>Scegli i pezzi da mettere dentro (solo quelli di nessuno).</small><div class="zc-scelta">' + a.liberi.map(function (p) {
        var u = p.anteprima || (p.tipo === 'immagine' ? p.url : '');
        return '<label><input type="checkbox" name="zc-pz" value="' + sicuro(p.id) + '"><span' + (u ? ' style="background-image:url(' + sicuro(u) + ');border-color:' + sicuro(p.rarita.colore) + '"' : '') + '>' + (u ? '' : emojiTipoZc(p.tipo)) + '</span>' + sicuro(p.numeroScritto) + ' ' + sicuro(p.titolo) + '</label>';
      }).join('') + '</div>' : '<div class="zc-vuoto">Non ci sono pezzi liberi: conia qualcosa prima.</div>') +
      '<input id="zc-pk-nome" type="text" maxlength="60" placeholder="nome del pacchetto">' +
      '<input id="zc-pk-prezzo" type="number" min="1" placeholder="prezzo in monete" inputmode="numeric">' +
      '<input id="zc-pk-per" type="number" min="1" max="20" placeholder="pezzi per apertura" value="1" inputmode="numeric">' +
      '<button class="btn oro" data-zc-pacchetto="1">Prepara il pacchetto</button></div>';

    h += '<div class="zc-titolo">Nuova collezione</div><div class="zc-form">' +
      (a.senzaCollezione.length > 1 ? '<div class="zc-scelta">' + a.senzaCollezione.map(function (p) {
        return '<label><input type="checkbox" name="zc-cz" value="' + sicuro(p.id) + '"><span style="border-color:' + sicuro(raritaZc(p.rarita).colore) + '">' + sicuro(p.numeroScritto) + '</span>' + sicuro(p.titolo) + '</label>';
      }).join('') + '</div>' : '<div class="zc-vuoto">Servono almeno due pezzi senza collezione.</div>') +
      '<input id="zc-cz-nome" type="text" maxlength="60" placeholder="nome della collezione">' +
      '<input id="zc-cz-premio" type="number" min="0" placeholder="premio in monete" inputmode="numeric">' +
      '<button class="btn oro" data-zc-collezione="1">Metti insieme la collezione</button></div>';

    h += '<div class="zc-titolo">Quanti pezzi</div><div class="zc-form"><small>' + a.rarita.map(function (r) {
      return sicuro(r.nome) + ': ' + (a.conti.perRarita[r.id] || 0);
    }).join(' · ') + '</small></div>';
    return h;
  }

  /* ---------------------------------------------- i gesti */

  function scelti(nome) {
    var v = [];
    var c = document.querySelectorAll('input[name="' + nome + '"]:checked');
    for (var i = 0; i < c.length; i++) v.push(c[i].value);
    return v;
  }
  function valoreZc(id) { var e = $(id); return e ? e.value : ''; }
  function fileScelto(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return { id: lista[i].id, mime: lista[i].mime };
    return null;
  }
  function chiediZc(come, dove, corpo, fatto) {
    chiedi(come, dove, corpo).then(function (r) { if (fatto) fatto(r); }).catch(function (e) { avviso(e.message, 'male'); });
  }
  function ricaricaZc() { return caricaZecca().then(function () { return caricaZeccaAdmin(); }); }

  function mostraAperturaZc(r) {
    var dove = $('zc-apertura');
    if (!dove) return;
    var pezzi = r.pezzi.map(function (p) { return pezzoZc(p, ''); }).join('');
    var coll = (r.collezioni || []).map(function (c) {
      return '<div class="zc-saldo">Collezione completata: ' + sicuro(c.nome) + ' +' + numeroIt(c.premio, 0) + ' monete</div>';
    }).join('');
    dove.innerHTML = '<h2 style="margin:0;color:#ffe7a3;font:800 22px Space Mono, monospace">' + (r.pezzi.length === 1 ? 'Ti e uscito' : 'Ti sono usciti') + '</h2>' +
      '<div class="zc-griglia">' + pezzi + '</div>' + coll +
      '<button class="btn oro" data-zc-chiudi="1">Bene</button>';
    dove.hidden = false;
    if (typeof coriandoli === 'function') {
      var colori = r.pezzi.map(function (p) { return p.rarita.colore; });
      coriandoli(30 + 20 * r.pezzi.length, colori.length ? colori : ['#ffd166']);
    }
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target;
    var qui = function (che) { return b.closest ? b.closest(che) : null; };
    var x;
    if ((x = qui('[data-zc]'))) { schedaZc = x.getAttribute('data-zc'); if (schedaZc === 'admin') caricaZeccaAdmin(); disegnaZecca(); return; }
    if ((x = qui('[data-zc-chiudi]'))) { $('zc-apertura').hidden = true; return; }
    if ((x = qui('[data-zc-apri]'))) {
      chiediZc('POST', '/zecca/apri', { pacchetto: x.getAttribute('data-zc-apri') }, function (r) {
        mostraAperturaZc(r);
        ricaricaZc();
        if (typeof caricaMoneta === 'function') caricaMoneta();
      });
      return;
    }
    if ((x = qui('[data-zc-regala]'))) {
      var id = x.getAttribute('data-zc-regala');
      var sel = document.querySelector('[data-zc-a="' + id + '"]');
      if (!sel || !sel.value) { avviso('A chi lo regali?', 'male'); return; }
      chiediZc('POST', '/zecca/regala', { pezzo: id, a: sel.value }, function (r) {
        avviso('Regalato. La sua storia adesso lo dice.', 'bene');
        if (r.collezioni && r.collezioni.length) avviso('Per chi lo riceve si e chiusa una collezione.', 'bene');
        ricaricaZc();
      });
      return;
    }
    if (qui('[data-zc-proponi]')) {
      var scelto = scelti('zc-file')[0];
      var f = scelto ? fileScelto(zc.propongo, scelto) : null;
      if (!f) { avviso('Scegli una cosa da proporre.', 'male'); return; }
      chiediZc('POST', '/zecca/proponi', { file: f, titolo: valoreZc('zc-titolo') }, function () {
        avviso('Proposta mandata: ora la guarda chi comanda.', 'bene');
        ricaricaZc();
      });
      return;
    }
    // Da qui in giu: solo chi comanda. Il server risponde comunque 403 agli altri.
    if ((x = qui('[data-zc-approva]'))) {
      var qa = x.getAttribute('data-zc-approva');
      var rar = document.querySelector('[data-zc-rar="' + qa + '"]');
      chiediZc('POST', '/zecca/approva', { id: qa, rarita: rar ? rar.value : 'caso' }, function (r) {
        avviso('Coniato ' + r.pezzo.numeroScritto + ' (' + r.pezzo.rarita.nome + ').', 'bene');
        ricaricaZc();
      });
      return;
    }
    if ((x = qui('[data-zc-rifiuta]'))) {
      var qr = x.getAttribute('data-zc-rifiuta');
      var mot = document.querySelector('[data-zc-motivo="' + qr + '"]');
      chiediZc('POST', '/zecca/rifiuta', { id: qr, motivo: mot ? mot.value : '' }, function () {
        avviso('Rifiutata. Chi l ha proposta legge il perche.', 'bene');
        ricaricaZc();
      });
      return;
    }
    if (qui('[data-zc-conia]')) {
      var l = scelti('zc-lib')[0];
      var fl = l ? fileScelto(zcAdmin.libreria, l) : null;
      if (!fl) { avviso('Scegli una cosa della libreria.', 'male'); return; }
      chiediZc('POST', '/zecca/conia', { file: fl, titolo: valoreZc('zc-conia-titolo'), rarita: valoreZc('zc-conia-rar') }, function (r) {
        avviso('Coniato ' + r.pezzo.numeroScritto + ' (' + r.pezzo.rarita.nome + ').', 'bene');
        ricaricaZc();
      });
      return;
    }
    if (qui('[data-zc-pacchetto]')) {
      chiediZc('POST', '/zecca/pacchetto', { nome: valoreZc('zc-pk-nome'), prezzo: Number(valoreZc('zc-pk-prezzo')), perApertura: Number(valoreZc('zc-pk-per')), pezzi: scelti('zc-pz') }, function () {
        avviso('Pacchetto in vetrina.', 'bene');
        ricaricaZc();
      });
      return;
    }
    if (qui('[data-zc-collezione]')) {
      chiediZc('POST', '/zecca/collezione', { nome: valoreZc('zc-cz-nome'), premio: Number(valoreZc('zc-cz-premio')), pezzi: scelti('zc-cz') }, function (r) {
        avviso('Collezione messa insieme.' + (r.completataDa.length ? ' Qualcuno l aveva gia completa: ha preso il premio.' : ''), 'bene');
        ricaricaZc();
      });
      return;
    }
  });

  var vaiAZecca = vaiA;
  vaiA = function (dove) {
    vaiAZecca(dove);
    if (dove === 'zecca') {
      if (!(io && io.admin) && schedaZc === 'admin') schedaZc = 'pacchetti';
      disegnaZecca();
      caricaZecca();
      caricaZeccaAdmin();
    }
  };
  allaValuta.push(function () { if (viva('p-zecca')) disegnaZecca(); });
`;
