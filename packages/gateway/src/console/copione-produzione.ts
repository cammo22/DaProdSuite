/**
 * Il copione, seconda parte: la Produzione, il Riepilogo, la chiacchierata.
 *
 * **La Produzione è la scheda che è cambiata di più nella 0.7.6.** Prima si
 * chiamava «Chiedi» e mostrava tutte e nove le azioni del catalogo in fila,
 * una uguale all'altra: «Fai un'immagine» accanto a «Gli ultimi risultati» e a
 * «Decidi su una richiesta». Nove voci con lo stesso peso visivo, di cui
 * quattro sono quello per cui uno apre l'app e cinque sono roba di servizio.
 *
 * Adesso, da telefono: **quattro tastoni colorati** e basta. Le azioni di
 * servizio non spariscono — sul computer servono davvero, ed è lì che si usano
 * — ma stanno in una riga di tastini sotto, e da telefono non ci sono proprio.
 *
 * Le parole sono quelle chieste: «Produzione Immagini», «Produzione Video»,
 * «Produzione Musica», «Produzione Audio». Non sono i titoli del catalogo, e
 * non è una svista: nel catalogo un'azione si chiama «Fai un'immagine» perché
 * la legge anche un agente MCP, qui si chiama «Produzione Immagini» perché la
 * legge una persona che sta scegliendo. Il catalogo resta l'unica fonte di cosa
 * si può fare; questa tabella dice solo come si chiama sullo schermo.
 */
export const COPIONE_PRODUZIONE = `
  /* ------------------------------------------------------------- le azioni */

  /**
   * Come si chiamano le quattro produzioni, sullo schermo.
   *
   * La chiave è l'id dell'azione nel catalogo: se un giorno il catalogo ne
   * aggiunge una, quella compare lo stesso — con il suo titolo e il suo colore
   * di ripiego — perché l'elenco vero resta \`/azioni\`, non questo.
   */
  var PRODUZIONI = {
    "genera.immagine": { nome: "Produzione Immagini", sotto: "una foto da una descrizione", tinta: "viola", segno: "\\u25C9" },
    "genera.video": { nome: "Produzione Video", sotto: "una clip, col suono", tinta: "rosa", segno: "\\u25B6" },
    "genera.brano": { nome: "Produzione Musica", sotto: "una canzone, anche cantata", tinta: "ciano", segno: "\\u266B" },
    "genera.voce": { nome: "Produzione Audio", sotto: "un testo letto ad alta voce", tinta: "ambra", segno: "\\u275E" },
  };

  /** I quattro tastoni, in Casa e in Produzione: gli stessi, disegnati due volte. */
  function disegnaTessere() {
    var casella = $("tessere");
    casella.innerHTML = "";
    for (var a of azioni.filter(function (x) { return x.coda; })) {
      casella.append(tastoneAzione(a));
    }
  }

  /**
   * L'elenco della Produzione.
   *
   * In cima i quattro che generano, sempre. Sotto — **e solo sul computer** —
   * le azioni di servizio, come tastini: leggere la libreria, guardare lo stato
   * della suite, decidere sulla fila, aprire una scheda. Da telefono quella
   * riga non c'è: chiesto così, «nascondiamo ultimi risultati, come sta la
   * suite e la fila delle richieste».
   */
  function disegnaAzioni() {
    var casella = $("elenco-azioni");
    casella.innerHTML = "";
    for (var a of azioni.filter(function (x) { return x.coda; })) {
      casella.append(tastoneAzione(a));
    }

    var altre = $("altre-azioni");
    altre.innerHTML = "";
    var diServizio = azioni.filter(function (x) { return !x.coda; });
    if (suTelefono() || !diServizio.length) { altre.hidden = true; return; }
    altre.hidden = false;
    for (var s of diServizio) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini";
      b.textContent = s.titolo;
      b.title = s.descrizione;
      b.addEventListener("click", (function (quale) {
        return function () { scegli(quale); };
      })(s));
      altre.append(b);
    }
  }

  function tastoneAzione(a) {
    var come = PRODUZIONI[a.id] || {};
    var scheda = SCHEDE[a.app] || SCHEDE.suite;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tastone " + (come.tinta || scheda.tinta || "viola");
    var s = document.createElement("span");
    s.className = "segno";
    s.textContent = come.segno || scheda.segno;
    var n = document.createElement("span");
    n.className = "nome";
    n.textContent = come.nome || a.titolo;
    var p = document.createElement("small");
    p.textContent = come.sotto || scheda.che;
    b.append(s, n, p);
    b.addEventListener("click", function () { vaiA("produzione"); scegli(a); });
    return b;
  }

  /** Costruisce il modulo dai campi dichiarati: qui non si sa cosa siano. */
  function scegli(a) {
    scelta = a;
    var modulo = $("modulo");
    modulo.innerHTML = "";

    var spiega = document.createElement("p");
    spiega.className = "sotto";
    spiega.style.marginTop = "16px";
    spiega.textContent = a.descrizione;
    modulo.append(spiega);

    // I modi di generare messi da parte per questa scheda: si toccano e il
    // modulo si riempie. Stanno sul computer, quindi ci sono anche qui.
    modulo.append(rigaPreset(a));

    for (var campo of a.campi) {
      var etichetta = document.createElement("label");
      etichetta.htmlFor = "campo-" + campo.nome;
      etichetta.textContent = campo.etichetta + (campo.obbligatorio ? " *" : "");
      modulo.append(etichetta);

      var controllo;
      if (campo.tipo === "scelta") {
        controllo = document.createElement("select");
        if (!campo.obbligatorio) {
          var vuoto = document.createElement("option");
          vuoto.value = "";
          // Cosa vuol dire lasciarlo vuoto lo dice il campo: su un filtro
          // «tutte», sul modello «quello scelto sul computer».
          vuoto.textContent = campo.vuoto || "\\u2014 tutte \\u2014";
          controllo.append(vuoto);
        }
        for (var opt of (campo.scelte || [])) {
          var o = document.createElement("option");
          o.value = opt;
          // Il nome per una persona se il catalogo ce l'ha: «anima2» non vuol
          // dire niente a chi lo legge una volta sola, «Anima v2» sì.
          o.textContent = (campo.etichette && campo.etichette[opt]) || opt;
          controllo.append(o);
        }
      } else if (campo.tipo === "numero") {
        controllo = document.createElement("input");
        controllo.type = "number";
        controllo.inputMode = "numeric";
        if (campo.min !== undefined) controllo.min = campo.min;
        if (campo.max !== undefined) controllo.max = campo.max;
        if (campo.predefinito !== undefined) controllo.value = campo.predefinito;
      } else if ((campo.maxLunghezza || 0) > 200) {
        controllo = document.createElement("textarea");
        if (campo.esempio) controllo.placeholder = campo.esempio;
      } else {
        controllo = document.createElement("input");
        controllo.type = "text";
        if (campo.esempio) controllo.placeholder = campo.esempio;
      }
      controllo.id = "campo-" + campo.nome;
      controllo.dataset.campo = campo.nome;
      if (campo.principale) controllo.dataset.principale = "1";
      modulo.append(controllo);

      // Il tasto dell'AI sta **sotto la casella che è la richiesta**, non in
      // cima alla pagina: è quello che riscrive, e si deve vedere cosa
      // riscrive. Solo per chi decide, perché accende il modello sulla stessa
      // scheda video che sta generando.
      if (campo.principale && puoiDecidere) modulo.append(rigaAi(a, controllo));

      if (campo.descrizione) {
        var nota = document.createElement("div");
        nota.className = "nota";
        nota.style.marginTop = "5px";
        nota.textContent = campo.descrizione;
        modulo.append(nota);
      }
    }

    // Salvare quello che si è appena scritto, per ritrovarlo domani.
    if (a.coda) modulo.append(rigaSalvaPreset(a));

    modulo.hidden = false;
    $("fila-manda").hidden = false;
    $("manda").textContent = a.coda ? "Mandalo al computer" : a.titolo;
    $("avviso-azione").textContent = "";
    $("avviso-azione").className = "avviso";
    modulo.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * La riga dei preset di una scheda.
   *
   * Vuota se non ce ne sono: un titolo «I tuoi soliti» sopra a niente è una
   * promessa non mantenuta.
   */
  function rigaPreset(a) {
    var box = document.createElement("div");
    var miei = preset.filter(function (x) { return x.app === a.app; });
    if (!a.app || !miei.length) return box;

    var titolo = document.createElement("label");
    titolo.textContent = "I tuoi soliti";
    box.append(titolo);

    var fila = document.createElement("div");
    fila.className = "filtri";
    for (var x of miei) fila.append(bottonePreset(x));
    box.append(fila);
    return box;
  }

  function bottonePreset(x) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = x.nome;
    b.title = x.testo;
    b.addEventListener("click", function (ev) {
      // Col tasto destro, o tenendo premuto shift, lo si toglie: un preset
      // sbagliato salvato per sempre è peggio di nessun preset.
      if (ev.shiftKey) { void togliPreset(x); return; }
      riempiCon(x);
    });
    b.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
      void togliPreset(x);
    });
    return b;
  }

  function riempiCon(x) {
    for (var c of $("modulo").querySelectorAll("[data-campo]")) {
      if (c.dataset.principale) { c.value = x.testo; continue; }
      var da = (x.campi || {})[c.dataset.campo];
      if (da !== undefined) c.value = da;
    }
  }

  async function togliPreset(x) {
    if (!confirm("Togliere \\u00ab" + x.nome + "\\u00bb dai tuoi soliti?")) return;
    try {
      await chiama("/preset/" + encodeURIComponent(x.id), { method: "DELETE" });
      await leggiPreset();
      if (scelta) scegli(scelta);
    } catch (e) { alert(e.message); }
  }

  /** Il tasto che fa riscrivere al modello quello che c'è nella casella. */
  function rigaAi(a, casella) {
    var fila = document.createElement("div");
    fila.className = "fila";
    fila.style.marginTop = "8px";

    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = "\\u2728 Usa l'AI";
    var nota = document.createElement("small");
    nota.style.color = "var(--fioco)";
    // Se non c'e' nessuno a cui chiedere si dice **perche'**, invece di
    // lasciare un tasto che risponde male solo dopo che l'hai premuto.
    if (aiMotivo) {
      b.disabled = true;
      nota.textContent = aiMotivo;
    }

    b.addEventListener("click", async function () {
      var testo = casella.value.trim();
      if (!testo) { nota.textContent = "Scrivi prima qualcosa, anche due parole."; return; }
      b.disabled = true;
      var prima = b.textContent;
      b.textContent = "sto scrivendo\\u2026";
      nota.textContent = "";
      try {
        var esito = await chiama("/ai/migliora", {
          method: "POST",
          body: JSON.stringify({ testo: testo, app: a.app || "foto" }),
        });
        casella.value = esito.testo;
        nota.textContent = "riscritto: se non ti piace, rimettici mano";

        /**
         * Per un brano l'AI scrive **anche le parole**.
         *
         * Chiesto il 23 agosto 2026: «da telefono, quando fai un brano, l'AI
         * dovrebbe scrivere anche il testo». Finiscono nella loro casella, e
         * solo se è vuota: se ci avevi già scritto qualcosa resta la tua.
         */
        if (esito.parole) {
          var canta = document.querySelector('#modulo [data-campo="testo"]');
          if (canta && !canta.value.trim()) {
            canta.value = esito.parole;
            nota.textContent = "riscritto, e ti ha scritto anche il testo da cantare";
          }
        }
      } catch (e) {
        nota.textContent = e.message;
      } finally {
        b.disabled = false;
        b.textContent = prima;
      }
    });

    fila.append(b, nota);
    return fila;
  }

  /** «Salvalo fra i tuoi soliti»: un nome e via. */
  function rigaSalvaPreset(a) {
    var fila = document.createElement("div");
    fila.className = "fila";

    var nome = document.createElement("input");
    nome.type = "text";
    nome.maxLength = 40;
    nome.placeholder = "salvalo coi tuoi soliti, con che nome?";
    nome.style.flex = "1 1 200px";

    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = "salva";
    b.addEventListener("click", async function () {
      var comeSiChiama = nome.value.trim();
      if (!comeSiChiama) { nome.focus(); return; }
      var campi = {};
      var testo = "";
      for (var c of $("modulo").querySelectorAll("[data-campo]")) {
        if (c.dataset.principale) { testo = c.value.trim(); continue; }
        if (c.value.trim()) campi[c.dataset.campo] = c.value.trim();
      }
      if (!testo) { alert("Scrivi prima cosa vuoi: \\u00e8 quello che si salva."); return; }
      try {
        await chiama("/preset", {
          method: "POST",
          body: JSON.stringify({ app: a.app, nome: comeSiChiama, testo: testo, campi: campi }),
        });
        nome.value = "";
        await leggiPreset();
        if (scelta) scegli(scelta);
      } catch (e) { alert(e.message); }
    });

    fila.append(nome, b);
    return fila;
  }

  async function leggiPreset() {
    try {
      var risposta = await chiama("/preset");
      preset = (risposta && risposta.preset) || [];
    } catch (e) { preset = []; }
  }

  function chiudiModulo() {
    scelta = null;
    $("modulo").hidden = true;
    $("modulo").innerHTML = "";
    $("fila-manda").hidden = true;
  }

  async function manda() {
    if (!scelta) return;
    var valori = {};
    for (var c of $("modulo").querySelectorAll("[data-campo]")) {
      var v = c.value.trim();
      if (v) valori[c.dataset.campo] = v;
    }
    var avviso = $("avviso-azione");
    avviso.className = "avviso";
    $("manda").disabled = true;
    try {
      var esito = await chiama(
        "/azioni/" + encodeURIComponent(scelta.id) + anchePerIndirizzo(valori),
        { method: "POST", body: JSON.stringify(valori) },
      );
      if (esito.esito === "in-coda") {
        chiudiModulo();
        await leggiCoda();
        vaiA("riepilogo");
      } else {
        mostraRisposta(esito.risultato);
      }
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("manda").disabled = false;
    }
  }

  /**
   * I valori anche nell'indirizzo, ma **solo dentro l'app**.
   *
   * ⚠ Sembra un doppione e non lo è: è l'unica strada che c'è. Quando il
   * computer non risponde, chi esaudisce questa POST è l'app stessa
   * (ServitoreOffline), e Android **non le fa leggere il corpo** di una
   * richiesta intercettata: WebResourceRequest espone metodo, indirizzo e
   * intestazioni, e basta. È una limitazione della WebView vecchia quanto lei.
   *
   * Quindi: dentro l'app i campi viaggiano anche in coda all'indirizzo, dove
   * l'app li può leggere. Il gateway vero li ignora — legge il corpo, come ha
   * sempre fatto — quindi online non cambia niente. Fuori dall'app la coda non
   * si aggiunge nemmeno: sarebbe un prompt da duemila caratteri nei log di un
   * server per nessuna ragione.
   */
  function anchePerIndirizzo(valori) {
    if (!window.DaProdApp) return "";
    var pezzi = new URLSearchParams();
    for (var chiave of Object.keys(valori)) pezzi.set(chiave, valori[chiave]);
    var coda = pezzi.toString();
    return coda ? "?" + coda : "";
  }

  function mostraRisposta(risultato) {
    var box = document.createElement("pre");
    box.style.cssText =
      "margin-top:16px;padding:12px;border:1px solid var(--line);border-radius:12px;" +
      "background:#0b0d13;font-size:12px;overflow:auto;max-height:340px;white-space:pre-wrap";
    box.textContent = typeof risultato === "string" ? risultato : JSON.stringify(risultato, null, 2);
    $("modulo").append(box);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ------------------------------------------------------- la chiacchierata */

  /**
   * Dieci minuti col modello che gira sul computer.
   *
   * Il meccanismo sta nello shell (\`chiacchierata.ts\`), e lì c'è scritto il
   * perché di ogni vincolo. Qui c'è la faccia che ha: un menu per scegliere con
   * chi parlare, un cronometro che dice quanto resta, delle bolle, e — quando
   * il modello propone qualcosa — un riquadro con le caselle da spuntare.
   *
   * **Il piano non parte da solo.** È la cosa più importante di questa
   * schermata: un modello che accende la scheda video mentre chiacchiera
   * sarebbe una sorpresa, e questo programma non ne fa.
   */
  async function leggiModelli() {
    var menu = $("quale-modello");
    if (menu.options.length) return;
    try {
      var risposta = await chiama("/modelli");
      var elenco = (risposta && risposta.modelli) || [];
      menu.innerHTML = "";
      if (!elenco.length) {
        $("scheda-chiacchiera").hidden = true;
        return;
      }
      $("scheda-chiacchiera").hidden = false;
      for (var m of elenco) {
        var o = document.createElement("option");
        o.value = m.id;
        o.textContent = m.id + (m.caricato ? " \\u00b7 gi\\u00e0 in memoria" : "");
        menu.append(o);
      }
    } catch (e) {
      $("scheda-chiacchiera").hidden = true;
    }
  }

  async function leggiChiacchierata() {
    try {
      var risposta = await chiama("/chiacchierata");
      sessione = (risposta && risposta.sessione) || null;
    } catch (e) { sessione = null; }
    disegnaChiacchierata();
  }

  async function cominciaChiacchierata() {
    var avviso = $("avviso-chiacchiera");
    avviso.className = "avviso";
    avviso.textContent = "Chiedo il computer\\u2026 se sta generando, aspetto il turno.";
    $("comincia-chiacchiera").disabled = true;
    try {
      var risposta = await chiama("/chiacchierata", {
        method: "POST",
        body: JSON.stringify({ modello: $("quale-modello").value }),
      });
      sessione = risposta.sessione;
      avviso.textContent = "";
      disegnaChiacchierata();
      $("cosa-dico").focus();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("comincia-chiacchiera").disabled = false;
    }
  }

  async function dilloAlModello() {
    if (!sessione) return;
    var casella = $("cosa-dico");
    var testo = casella.value.trim();
    if (!testo) return;

    casella.value = "";
    // La propria battuta compare **subito**, prima della risposta: aspettare
    // trenta secondi vedendo la casella vuotarsi e nient'altro fa credere che
    // il messaggio sia andato perso.
    sessione.battute.push({ chi: "io", testo: testo, quando: Date.now() });
    disegnaChiacchierata();
    aspettaIlModello(true);

    try {
      var risposta = await chiama(
        "/chiacchierata/" + encodeURIComponent(sessione.id) + "/dico",
        { method: "POST", body: JSON.stringify({ testo: testo }) },
      );
      sessione = risposta.sessione;
    } catch (e) {
      sessione.battute.push({ chi: "modello", testo: e.message, quando: Date.now() });
    }
    aspettaIlModello(false);
    disegnaChiacchierata();
  }

  /** I puntini mentre il modello pensa: senza, sembra che non stia succedendo niente. */
  function aspettaIlModello(sta) {
    $("dillo").disabled = sta;
    var vecchia = document.getElementById("sta-pensando");
    if (vecchia) vecchia.remove();
    if (!sta) return;
    var b = document.createElement("div");
    b.className = "bolla sua pensa";
    b.id = "sta-pensando";
    b.textContent = "sta pensando\\u2026";
    $("discorso").append(b);
    $("discorso").scrollTop = $("discorso").scrollHeight;
  }

  function disegnaChiacchierata() {
    var viva = sessione && sessione.scade > Date.now();
    $("prima-di-parlare").hidden = viva;
    $("mentre-si-parla").hidden = !viva;
    if (orologioChiacchiera) { clearInterval(orologioChiacchiera); orologioChiacchiera = null; }
    if (!viva) { sessione = null; return; }

    var discorso = $("discorso");
    discorso.innerHTML = "";
    for (var b of sessione.battute) {
      var bolla = document.createElement("div");
      bolla.className = "bolla " + (b.chi === "io" ? "mia" : "sua");
      bolla.textContent = b.testo;
      discorso.append(bolla);
    }
    discorso.scrollTop = discorso.scrollHeight;

    disegnaPiano();

    var battito = function () {
      if (!sessione) return;
      var restano = Math.max(0, sessione.scade - Date.now());
      var minuti = Math.floor(restano / 60000);
      var secondi = Math.floor((restano % 60000) / 1000);
      var q = $("cronometro-chiacchiera");
      q.textContent = minuti + ":" + (secondi < 10 ? "0" : "") + secondi;
      q.className = "cronometro" + (restano < 90000 ? " poco" : "");
      if (restano <= 0) { sessione = null; disegnaChiacchierata(); }
    };
    battito();
    orologioChiacchiera = setInterval(battito, 1000);
  }

  /**
   * Il piano: quello che il modello propone, con le caselle da spuntare.
   *
   * Si spunta quello che si vuole — «anche un video e una foto insieme, lo puoi
   * scegliere in chat» — e accettare fa due cose insieme: mette in fila i
   * lavori scelti **e chiude la chiacchierata**, che è il momento in cui i
   * quattro GB del modello tornano liberi per generarli.
   */
  function disegnaPiano() {
    var dove = $("dove-va-il-piano");
    dove.innerHTML = "";
    if (!sessione || !sessione.piano || !sessione.piano.lavori.length) return;

    var box = document.createElement("div");
    box.className = "piano";
    var riassunto = document.createElement("div");
    riassunto.className = "riassunto";
    riassunto.textContent = sessione.piano.riassunto;
    box.append(riassunto);

    var caselle = [];
    sessione.piano.lavori.forEach(function (l, i) {
      var riga = document.createElement("label");
      riga.className = "lavoro";
      var spunta = document.createElement("input");
      spunta.type = "checkbox";
      spunta.checked = true;
      spunta.dataset.indice = String(i);
      caselle.push(spunta);
      var testi = document.createElement("div");
      testi.className = "cresce";
      var che = document.createElement("div");
      che.className = "che";
      che.textContent = (PRODUZIONI[l.azione] || {}).nome
        ? (PRODUZIONI[l.azione].nome + " \\u00b7 " + l.che)
        : l.che;
      var come = document.createElement("div");
      come.className = "come";
      come.textContent = l.campi[Object.keys(l.campi)[0]] || "";
      testi.append(che, come);
      riga.append(spunta, testi);
      box.append(riga);
    });

    var fila = document.createElement("div");
    fila.className = "fila";
    var si = document.createElement("button");
    si.textContent = "S\\u00ec, fallo";
    si.addEventListener("click", async function () {
      var quali = caselle.filter(function (c) { return c.checked; }).map(function (c) { return Number(c.dataset.indice); });
      if (!quali.length) { alert("Spunta almeno una cosa."); return; }
      si.disabled = true;
      si.textContent = "metto in fila\\u2026";
      try {
        var esito = await chiama(
          "/chiacchierata/" + encodeURIComponent(sessione.id) + "/piano",
          { method: "POST", body: JSON.stringify({ quali: quali }) },
        );
        sessione = null;
        disegnaChiacchierata();
        await leggiCoda();
        vaiA("riepilogo");
        var quanti = esito.quanti || quali.length;
        $("sotto-riepilogo").textContent =
          quanti === 1 ? "Una cosa \\u00e8 andata in fila." : quanti + " cose sono andate in fila.";
      } catch (e) {
        alert(e.message);
        si.disabled = false;
        si.textContent = "S\\u00ec, fallo";
      }
    });
    var no = document.createElement("button");
    no.className = "piano";
    no.textContent = "No, continuiamo a parlare";
    no.addEventListener("click", function () {
      if (sessione) sessione.piano = null;
      disegnaPiano();
    });
    fila.append(si, no);
    box.append(fila);
    dove.append(box);
  }

  async function chiudiLaChiacchierata() {
    if (!sessione) return;
    var id = sessione.id;
    sessione = null;
    disegnaChiacchierata();
    try {
      await chiama("/chiacchierata/" + encodeURIComponent(id), { method: "DELETE" });
    } catch (e) { /* era già finita: va bene lo stesso */ }
  }

  /* --------------------------------------------------------------- riepilogo */

  var NOMI_STATO = {
    "in-attesa": ["attesa", "aspetta il s\\u00ec"],
    accettata: ["lavoro", "in partenza"],
    "in-lavoro": ["lavoro", "ci sta lavorando"],
    pronta: ["pronta", "pronto"],
    scartata: ["brutto", "non fatto"],
    scaduta: ["brutto", "scaduto"],
    archiviata: ["", "messo via"],
  };

  /**
   * Le tre pile in cui si guardano i lavori.
   *
   * Non è un filtro per pignoli: dopo una settimana la lista è lunga cinquanta
   * righe, e quello che serve sapere è sempre e solo «cosa sta succedendo
   * adesso». Il resto si va a cercare.
   */
  var PILE = [
    { id: "vivi", nome: "adesso", stati: ["in-attesa", "accettata", "in-lavoro"] },
    { id: "fatti", nome: "finiti", stati: ["pronta", "scartata", "scaduta"] },
    { id: "vecchi", nome: "messi via", stati: ["archiviata"] },
  ];

  function pila(id) {
    for (var p of PILE) if (p.id === id) return p;
    return PILE[0];
  }

  /**
   * Le quattro strisce in cima al Riepilogo.
   *
   * Sono la risposta compatta a «come siamo messi»: quattro numeri che si
   * leggono in un colpo d'occhio, al posto di venti righe da scorrere.
   */
  function disegnaStrisce() {
    var casella = $("strisce");
    if (!casella) return;
    var inAttesa = richieste.filter(function (r) { return r.stato === "in-attesa"; }).length;
    var inLavoro = richieste.filter(function (r) {
      return r.stato === "accettata" || r.stato === "in-lavoro";
    }).length;
    var pronte = richieste.filter(function (r) { return r.stato === "pronta"; }).length;
    var inFila = macchina && macchina.fila ? macchina.fila.length : 0;

    casella.innerHTML = "";
    striscia(casella, inLavoro, "in lavorazione", inLavoro ? "ciano" : "");
    striscia(casella, inFila, "in fila", inFila ? "giallo" : "");
    striscia(casella, pronte, "pronti", pronte ? "verde" : "");
    striscia(casella, inAttesa, "aspettano il s\\u00ec", inAttesa ? "rosso" : "");

    disegnaAdesso();
  }

  function striscia(casella, numero, etichetta, colore) {
    var box = document.createElement("div");
    box.className = "striscia " + (colore || "");
    var n = document.createElement("div");
    n.className = "n";
    n.textContent = String(numero);
    var e = document.createElement("div");
    e.className = "e";
    e.textContent = etichetta;
    box.append(n, e);
    casella.append(box);
  }

  /** Cosa sta girando adesso, con la barra che scorre. */
  function disegnaAdesso() {
    var dove = $("dove-adesso");
    if (!dove) return;
    dove.innerHTML = "";
    if (!macchina) return;

    if (!macchina.adesso) {
      var libero = document.createElement("div");
      libero.className = "vuoto";
      libero.textContent = macchina.inPausa
        ? "In pausa: non parte niente di nuovo finch\\u00e9 chi sta al computer non la toglie."
        : "Il computer non sta facendo niente. Quello che chiedi parte subito.";
      dove.append(libero);
      return;
    }

    var box = document.createElement("div");
    box.className = "adesso";
    var che = document.createElement("div");
    che.className = "che";
    che.textContent = macchina.adesso.che;
    var chi = document.createElement("span");
    chi.className = "chi";
    chi.textContent = macchina.adesso.chi
      ? "per " + macchina.adesso.chi
      : "dal computer";
    var barra = document.createElement("div");
    barra.className = "barra";
    barra.append(document.createElement("i"));
    box.append(che, chi, barra);
    dove.append(box);

    // Chi aspetta, e a che posto. È la domanda vera di chi guarda da fuori:
    // non «quanti sono in fila», ma «la mia quando parte».
    if (macchina.fila.length) {
      var elenco = document.createElement("ul");
      elenco.className = "voci compatta";
      elenco.style.marginTop = "10px";
      macchina.fila.slice(0, 6).forEach(function (f, i) {
        var li = document.createElement("li");
        var corpo = document.createElement("div");
        corpo.className = "cresce";
        var t = document.createElement("div");
        t.className = "titolo";
        t.textContent = f.che;
        var d = document.createElement("div");
        d.className = "dettaglio";
        d.textContent = (f.chi ? f.chi + " \\u00b7 " : "") + (i + 1) + "\\u00ba in fila";
        corpo.append(t, d);
        li.append(corpo);
        if (f.tuo) {
          var mio = document.createElement("span");
          mio.className = "pillola lavoro";
          mio.textContent = "tuo";
          li.append(mio);
        }
        elenco.append(li);
      });
      dove.append(elenco);
    }

    // Le trattenute: quelle che il computer *potrebbe* fare e non fa, con il
    // perché. Senza questa riga, un tetto è un programma che non risponde.
    if (macchina.trattenute && macchina.trattenute.length) {
      var avvisi = document.createElement("ul");
      avvisi.className = "voci compatta";
      avvisi.style.marginTop = "10px";
      for (var t2 of macchina.trattenute.filter(function (x) { return x.tuo || sonoLaCasa; })) {
        var li2 = document.createElement("li");
        var c2 = document.createElement("div");
        c2.className = "cresce";
        var tt = document.createElement("div");
        tt.className = "titolo";
        tt.textContent = t2.testo;
        var dd = document.createElement("div");
        dd.className = "dettaglio";
        dd.textContent = t2.perche;
        c2.append(tt, dd);
        var p2 = document.createElement("span");
        p2.className = "pillola attesa";
        p2.textContent = "trattenuta";
        li2.append(c2, p2);
        avvisi.append(li2);
      }
      if (avvisi.children.length) dove.append(avvisi);
    }
  }
`;
