/**
 * Il copione, terza parte: la lista dei lavori e cosa farne.
 *
 * Sta sotto le strisce del Riepilogo, ed è la parte che **non** è cambiata di
 * mestiere nella 0.7.6: le righe sono le stesse, il menu di una richiesta ferma
 * è lo stesso. Quello che è cambiato è quanto spazio si prende — le righe sono
 * strette (`.compatta`), e sopra ci sono quattro numeri che rispondono prima di
 * loro. Chiesto così: «più compatta possibile».
 */
export const COPIONE_LAVORI = `
  async function leggiCoda() {
    richieste = await chiama("/richieste");
    var elenco = $("coda");
    elenco.innerHTML = "";

    var attesa = 0;
    var quali = pila(filtroLavori).stati;
    var mostrate = 0;
    for (var r of richieste) {
      if (r.stato === "in-attesa") attesa += 1;
      if (quali.indexOf(r.stato) < 0) continue;
      mostrate += 1;
      elenco.append(rigaRichiesta(r));
    }
    if (!mostrate) {
      var vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent =
        filtroLavori === "vivi"
          ? "Niente in lavorazione. Quello che chiedi compare qui."
          : filtroLavori === "fatti"
            ? "Ancora niente di finito."
            : "Niente messo via.";
      elenco.append(vuoto);
    }
    disegnaFiltriLavori();

    $("bollo").hidden = attesa === 0;
    $("bollo").textContent = attesa;
    disegnaNumeri();
    disegnaStrisce();
    disegnaUltimi();
  }

  function disegnaFiltriLavori() {
    var casella = $("filtri-lavori");
    casella.innerHTML = "";
    for (var p of PILE) {
      var quante = richieste.filter(function (r) { return p.stati.indexOf(r.stato) >= 0; }).length;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (p.id === filtroLavori ? " on" : "");
      b.textContent = p.nome + (quante ? " (" + quante + ")" : "");
      b.addEventListener("click", (function (quale) {
        return function () { filtroLavori = quale; leggiCoda().catch(function () {}); };
      })(p.id));
      casella.append(b);
    }
  }

  function rigaRichiesta(r) {
    var li = document.createElement("li");

    var corpo = document.createElement("div");
    corpo.className = "cresce";
    var t = document.createElement("div");
    t.className = "titolo";
    t.textContent = r.testo;
    var d = document.createElement("div");
    d.className = "dettaglio";
    d.textContent = [nomeScheda(r.app), r.daNome, quando(r.quando), r.motivoScarto || r.trattenuta]
      .filter(Boolean).join(" \\u00b7 ");
    corpo.append(t, d);

    // Se qualcuno l'ha riscritta, com'era arrivata resta scritto: chi ha
    // chiesto una cosa e ne riceve un'altra deve poter vedere cos'è successo.
    if (r.testoOriginale) {
      var era = document.createElement("div");
      era.className = "come-era";
      era.style.marginTop = "6px";
      era.textContent =
        (r.riscrittaDa === "ai" ? "riscritta dal modello \\u00b7 " : "riscritta a mano \\u00b7 ") +
        "era: " + r.testoOriginale;
      corpo.append(era);
    }
    li.append(corpo);

    var stato = NOMI_STATO[r.stato] || ["", r.stato];
    var pillola = document.createElement("span");
    pillola.className = "pillola " + stato[0];
    pillola.textContent = stato[1];
    li.append(pillola);

    if (r.stato === "pronta" && r.risultato) {
      var giu = document.createElement("button");
      giu.className = "mini";
      giu.textContent = "tieni";
      giu.addEventListener("click", function () { scarica(r.risultato.nome); });
      li.append(giu);
    }

    // **Il menu**, chiesto il 22 agosto 2026. Un tasto solo che si apre in
    // quattro: falla, falla riscrivere, riscrivila tu, dille di no. Su un
    // telefono quattro tasti in fila sono quattro tasti sbagliati.
    if (puoiDecidere && r.stato === "in-attesa") {
      var menu = costruisciMenu(r);
      var apri = document.createElement("button");
      apri.className = "mini";
      apri.textContent = "che ne faccio?";
      apri.addEventListener("click", function () {
        menu.hidden = !menu.hidden;
        apri.textContent = menu.hidden ? "che ne faccio?" : "chiudi";
      });
      li.append(apri, menu);
    }

    // Finito vuol dire che si può mettere via. Chi decide può farlo con tutte,
    // ognuno con le sue: la lista lunga è di chi guarda.
    if (["pronta", "scartata", "scaduta"].indexOf(r.stato) >= 0) {
      var via = document.createElement("button");
      via.className = "mini";
      via.textContent = "metti via";
      via.addEventListener("click", function () { void togliRichiesta(r, "archivia"); });
      li.append(via);
    }
    // Buttare si puo' sempre, anche una che dice di star lavorando: se la suite
    // e' stata chiusa mentre generava, quella riga resta li' per sempre.
    {
      var butta = document.createElement("button");
      butta.className = "mini male";
      butta.textContent = "butta";
      butta.addEventListener("click", function () { void togliRichiesta(r, "cancella"); });
      li.append(butta);
    }
    return li;
  }

  /**
   * Il menu di una richiesta ferma.
   *
   * Le quattro voci, nell'ordine in cui si usano davvero: la prima è quella
   * che si preme nove volte su dieci.
   */
  function costruisciMenu(r) {
    var menu = document.createElement("div");
    menu.className = "menu";
    menu.hidden = true;

    var avviso = document.createElement("div");
    avviso.className = "nota";

    var subito = document.createElement("button");
    subito.className = "mini";
    subito.textContent = "\\u25B6 fallo cos\\u00ec com'\\u00e8";
    subito.addEventListener("click", function () { void decidi(r.id, "accettata"); });

    var conAi = document.createElement("button");
    conAi.className = "mini";
    conAi.textContent = "\\u2728 usa l'AI, poi fallo";
    if (aiMotivo) {
      conAi.disabled = true;
      conAi.title = aiMotivo;
    }
    conAi.addEventListener("click", async function () {
      conAi.disabled = true;
      var prima = conAi.textContent;
      conAi.textContent = "sto scrivendo\\u2026";
      avviso.textContent = "";
      try {
        await chiama("/richieste/" + encodeURIComponent(r.id) + "/migliora", {
          method: "POST",
          body: "{}",
        });
        await decidi(r.id, "accettata");
      } catch (e) {
        avviso.textContent = e.message;
        conAi.disabled = false;
        conAi.textContent = prima;
      }
    });

    // Scrivila tu: la casella compare qui sotto, già piena di quello che aveva
    // scritto chi ha chiesto.
    var aMano = document.createElement("button");
    aMano.className = "mini";
    aMano.textContent = "\\u270E scrivila io";

    var casella = document.createElement("textarea");
    casella.hidden = true;
    casella.value = r.testo;

    var filaMano = document.createElement("div");
    filaMano.className = "fila";
    filaMano.hidden = true;
    filaMano.style.marginTop = "0";

    var mandaCosi = document.createElement("button");
    mandaCosi.className = "mini";
    mandaCosi.textContent = "manda cos\\u00ec";
    mandaCosi.addEventListener("click", function () { void mandaRiscritta(r, casella, false, avviso); });

    var mandaConAi = document.createElement("button");
    mandaConAi.className = "mini";
    mandaConAi.textContent = "\\u2728 usa l'AI e manda";
    mandaConAi.addEventListener("click", function () { void mandaRiscritta(r, casella, true, avviso); });

    filaMano.append(mandaCosi, mandaConAi);
    aMano.addEventListener("click", function () {
      casella.hidden = !casella.hidden;
      filaMano.hidden = casella.hidden;
      if (!casella.hidden) casella.focus();
    });

    // Il no, con la ragione: quella riga arriva sul telefono di chi aveva
    // chiesto, ed è l'unica cosa che gli dice perché.
    var perche = document.createElement("input");
    perche.type = "text";
    perche.maxLength = 200;
    perche.placeholder = "perch\\u00e9 no (glielo scrivo)";

    var no = document.createElement("button");
    no.className = "mini male";
    no.textContent = "\\u2715 no";
    no.addEventListener("click", function () {
      void decidi(r.id, "scartata", perche.value.trim());
    });

    menu.append(subito, conAi, aMano, casella, filaMano, perche, no, avviso);
    return menu;
  }

  /** Salva quello che è stato riscritto a mano, poi manda (con o senza AI). */
  async function mandaRiscritta(r, casella, conAi, avviso) {
    var testo = casella.value.trim();
    if (!testo) { avviso.textContent = "Il testo non pu\\u00f2 restare vuoto."; return; }
    avviso.textContent = "un attimo\\u2026";
    try {
      await chiama("/richieste/" + encodeURIComponent(r.id) + "/testo", {
        method: "POST",
        body: JSON.stringify({ testo: testo }),
      });
      if (conAi) {
        await chiama("/richieste/" + encodeURIComponent(r.id) + "/migliora", {
          method: "POST",
          body: "{}",
        });
      }
      await decidi(r.id, "accettata");
    } catch (e) {
      avviso.textContent = e.message;
    }
  }

  async function togliRichiesta(r, come) {
    if (come === "cancella" && !confirm("Buttare via questo lavoro dall'elenco?")) return;
    try {
      await chiama("/richieste/" + encodeURIComponent(r.id), {
        method: come === "cancella" ? "DELETE" : "PATCH",
      });
      await leggiCoda();
    } catch (e) { alert(e.message); }
  }

  async function decidi(id, stato, motivo) {
    try {
      await chiama("/richieste/" + encodeURIComponent(id) + "/stato", {
        method: "POST",
        body: JSON.stringify({ stato: stato, motivo: motivo || undefined }),
      });
      await leggiCoda();
    } catch (e) {
      alert(e.message);
    }
  }

  /**
   * Porta un file nel dispositivo.
   *
   * Dentro l'app Android lo tira giù **lei**: ha già la credenziale, e sa
   * mettere un video in galleria e un brano fra la musica invece che in una
   * cartella dell'app.
   */
  async function scarica(nome) {
    if (window.DaProdApp && window.DaProdApp.scaricaRisultato) {
      window.DaProdApp.scaricaRisultato(nome);
      return;
    }
    var risposta = await fetch("/risultati/" + encodeURIComponent(nome), {
      headers: { Authorization: "Bearer " + token },
    });
    if (!risposta.ok) { alert("Non riesco a scaricarlo."); return; }
    var blob = await risposta.blob();
    portaViaIlFile(blob, nome);
  }

  /**
   * Il salvataggio nel browser: un link finto che si clicca da solo.
   *
   * Serve solo fuori dall'app: dentro l'app ci pensa lei, che sa dove va un
   * video e dove va un brano. Qui finisce nei Download, che è quello che ci si
   * aspetta da una pagina web.
   */
  function portaViaIlFile(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
  }
`;
