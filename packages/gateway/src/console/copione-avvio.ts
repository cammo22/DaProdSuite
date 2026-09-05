/**
 * Il copione, ultima parte: entrare, restare aggiornati, i tasti.
 *
 * **Lo stato è vivo, e non c'è un tasto «aggiorna» da nessuna parte.** Il
 * gateway spinge su una connessione aperta (SSE) a ogni cambiamento — una
 * richiesta nuova, un lavoro che parte, il tunnel che si alza, il firewall che
 * si apre — e a ogni spinta si rilegge quel poco che serve.
 *
 * Il tasto «Ricarica» nelle impostazioni non serve a questo: serve a quando
 * qualcosa *sembra* fermo, che è un'altra cosa e capita lo stesso.
 */
export const COPIONE_AVVIO = `
  /* -------------------------------------------------------------- lo stato */

  function disegnaStato(s) {
    if (!s) return;
    suite = s;
    $("nota-versione").textContent =
      "DaProd Suite " + (s.versione || "") + " su " + (s.computer || "questo computer") +
      " \\u00b7 questa pagina la serve il computer, e i modelli girano l\\u00ec.";
    disegnaNumeri();
  }

  /* ---------------------------------------------------------------- entra */

  async function entra() {
    for (var s of document.querySelectorAll(".pagina")) s.classList.remove("on");
    $("fondo").hidden = false;
    $("apri-impostazioni").hidden = false;
    vaiA("casa");

    await piantaSessione();

    try {
      var io = await chiama("/io");
      ioNome = io.nome || ioNome;
      ioId = io.id || "";
      ioFoto = io.foto || "";
      ioMotto = io.motto || "";
      localStorage.setItem(CHIAVE_NOME, ioNome);
    } catch (e) { /* si riprova al giro dopo */ }

    $("chi").hidden = false;
    disegnaMioProfilo();

    try {
      azioni = await chiama("/azioni");
      disegnaTessere();
      disegnaAzioni();
    } catch (e) { /* senza azioni restano i lavori e la galleria */ }

    disegnaDueTasti();
    disegnaFiltri();
    try { await leggiStili(); } catch (e) { /* offline: restano quelli di prima */ }
    disegnaFiltriDaprod();
    await leggiPreset();
    await guardaAi();
    try { await leggiMacchina(); } catch (e) { /* offline */ }
    try { await leggiCoda(); } catch (e) { /* offline */ }
    try { await leggiRegali(); } catch (e) { /* offline */ }
    try { disegnaStato(await chiama("/stato")); } catch (e) { /* offline */ }
    try { await leggiPannello(); } catch (e) { /* offline */ }
    try { await leggiChiacchierata(); } catch (e) { /* offline */ }
    /**
     * La rete: si guarda subito, e poi ogni dodici secondi.
     *
     * **Perché un giro suo e non il flusso.** Il flusso lo spinge il gateway
     * quando cambia qualcosa che *lui* sa; una bussata lo sveglia (vedi
     * «suBussata»), ma il computer di fianco che si accende no — quello arriva
     * da un datagramma UDP, e non c'è niente che lo faccia diventare un
     * evento. Dodici secondi sono un secondo e mezzo di ritardo medio su un
     * annuncio che parte ogni otto, e una GET corta ogni dodici secondi su una
     * rete di casa non si sente.
     */
    try { await guardaLaRete(); } catch (e) { /* offline */ }
    if (giroRete) clearInterval(giroRete);
    giroRete = setInterval(function () { guardaLaRete().catch(function () {}); }, 12000);
    apriFlusso();
  }

  /**
   * Lo stato dal vivo.
   *
   * A ogni spinta si rileggono quattro cose corte. Non è uno spreco: sono
   * quattro GET su una rete di casa, e in cambio non esiste un momento in cui
   * la pagina racconta una cosa che non è più vera.
   */
  function apriFlusso() {
    if (flusso) flusso.close();
    flusso = new EventSource("/stato/stream?token=" + encodeURIComponent(token));
    flusso.onmessage = function (ev) {
      try { disegnaStato(JSON.parse(ev.data)); } catch (e) { return; }
      leggiCoda().catch(function () {});
      leggiMacchina().catch(function () {});
      leggiPannello().catch(function () {});
      leggiRegali().catch(function () {});
      // Una bussata sveglia il flusso: rileggerla qui vuol dire che la fascia
      // compare **nel momento** in cui qualcuno preme «collegati», non fino a
      // dodici secondi dopo.
      guardaLaRete().catch(function () {});
    };
    flusso.onerror = function () {
      var box = $("semaforo");
      box.className = "semaforo male";
      $("semaforo-faccia").textContent = "\\u2715";
      $("semaforo-titolo").textContent = "Non riesco a parlare col computer";
      $("semaforo-perche").textContent = "Provo a riprendere da solo\\u2026";
    };
  }

  /* ------------------------------------------------------------- aggancio */

  $("collega").addEventListener("click", collega);
  $("codice").addEventListener("keydown", function (ev) { if (ev.key === "Enter") collega(); });
  $("nome").addEventListener("keydown", function (ev) { if (ev.key === "Enter") $("codice").focus(); });
  $("manda").addEventListener("click", manda);
  $("annulla").addEventListener("click", chiudiModulo);
  $("apri-impostazioni").addEventListener("click", apriImpostazioni);
  $("vedi-bussate").addEventListener("click", function () { void apriLaRete(); });

  /* ------------------------------------------------------------ il lettore */

  $("lettore-faccia").addEventListener("click", apriPalco);
  $("lettore-apri").addEventListener("click", apriPalco);
  $("lettore-play").addEventListener("click", pausaOSuona);
  $("lettore-prima").addEventListener("click", precedente);
  $("lettore-poi").addEventListener("click", prossimo);
  $("lettore-chiudi").addEventListener("click", fermaTutto);
  $("palco-chiudi").addEventListener("click", chiudiPalco);
  $("palco-play").addEventListener("click", pausaOSuona);
  $("palco-prima").addEventListener("click", precedente);
  $("palco-poi").addEventListener("click", prossimo);
  $("palco-cambia").addEventListener("click", function () { cambiaEffetto(false); });
  aggangiaIlTrascinamento($("palco"));
  $("chi").addEventListener("click", function () { vaiA("daprod"); });
  $("apri-profilo").addEventListener("click", apriIlProfilo);
  $("comincia-chiacchiera").addEventListener("click", cominciaChiacchierata);
  $("chiudi-chiacchiera").addEventListener("click", chiudiLaChiacchierata);
  $("esci-dalla-fila").addEventListener("click", esciDallaFilaDelParlare);
  $("stile-nuovo").addEventListener("click", function () { apriModificaStile(null); });
  $("dillo").addEventListener("click", dilloAlModello);
  $("cosa-dico").addEventListener("keydown", function (ev) {
    // Invio manda, invio col maiuscolo va a capo: è quello che fa ogni chat, e
    // aspettarsi il contrario da questa sarebbe una sorpresa gratis.
    if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); dilloAlModello(); }
  });
  $("carica-in-bacheca").addEventListener("click", function () { $("file-in-bacheca").click(); });
  $("file-in-bacheca").addEventListener("change", function () {
    var file = $("file-in-bacheca").files && $("file-in-bacheca").files[0];
    $("file-in-bacheca").value = "";
    if (file) void caricaInBacheca(file);
  });

  for (var b of document.querySelectorAll("nav.fondo button")) {
    b.addEventListener("click", (function (quale) {
      return function () { vaiA(quale); };
    })(b.dataset.pagina));
  }

  /**
   * Quello che è aperto **sopra** la pagina, chiuso uno alla volta.
   *
   * ⚠ Il difetto che questo cura, visto sull'app il 5 settembre 2026: con la
   * lente aperta, il tasto «indietro» del telefono **usciva dall'app**. La
   * pagina aveva sempre saputo chiudere le sue cose con Esc, ma il tasto
   * indietro di Android non è Esc: non genera nessun evento nella pagina, e
   * l'app non aveva modo di sapere che c'era qualcosa da chiudere.
   *
   * Adesso lo chiede. L'ordine è quello di quanto stanno in alto — il palco, la
   * lente, il foglio — e la risposta dice se qualcosa è stato chiuso: se no,
   * l'app fa quello che faceva prima.
   */
  window.DaProdPagina = {
    chiudiQualcosa: function () {
      if (palcoAperto) { chiudiPalco(); return true; }
      var lente = document.querySelector(".lente");
      if (lente) { lente.remove(); return true; }
      if (document.getElementById("foglio")) { chiudiFoglio(); return true; }
      return false;
    },
  };

  // Il tasto Esc: la stessa cosa, per chi è davanti a una tastiera.
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    window.DaProdPagina.chiudiQualcosa();
  });

  // Tornare sulla pagina è il momento in cui si vuole sapere com'è andata.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !token) return;
    leggiCoda().catch(function () {});
    leggiMacchina().catch(function () {});
    leggiPannello().catch(function () {});
    leggiRegali().catch(function () {});
    guardaLaRete().catch(function () {});
    // Il flusso, dopo un po' in secondo piano, il telefono lo chiude: si riapre.
    if (!flusso || flusso.readyState === 2) apriFlusso();
  });

  /**
   * Un file lasciato cadere **fuori** da una riga non deve aprirsi.
   *
   * Senza queste due righe, il browser (e la finestra di DaProdConnessione, che
   * è un browser) al posto della pagina mostra il file: il pannello sparisce e
   * bisogna riaprirlo. Con venti file da mandare, capita una volta su tre.
   */
  document.addEventListener("dragover", function (ev) { ev.preventDefault(); });
  document.addEventListener("drop", function (ev) { ev.preventDefault(); });

  /**
   * **Mentre si scrive, la barra in fondo si toglie di mezzo.**
   *
   * Il difetto, detto il 26 agosto 2026: «su Android quando scrivo con il
   * modello la barra sotto nasconde la chat». Su un telefono la tastiera alza
   * il fondo della finestra e una barra fissa finisce sopra alla casella e
   * sopra alle ultime battute — cioè proprio sopra a quello che stai facendo.
   *
   * Chi sta scrivendo non sta cambiando scheda: in quel momento la barra non
   * serve a niente, e toglierla è meglio che restringere la pagina. Torna da
   * sola appena si esce dalla casella.
   *
   * Il rientro nella vista si fa dopo un attimo e non subito: la tastiera si
   * apre con la sua animazione, e chiedere prima «portami qui» vuol dire
   * chiederlo alla finestra di prima.
   */
  document.addEventListener("focusin", function (ev) {
    var chi = ev.target;
    if (!chi || (chi.tagName !== "TEXTAREA" && chi.tagName !== "INPUT")) return;
    document.body.classList.add("scrivendo");
    setTimeout(function () {
      try { chi.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* vecchio browser */ }
    }, 320);
  });
  document.addEventListener("focusout", function (ev) {
    var chi = ev.target;
    if (!chi || (chi.tagName !== "TEXTAREA" && chi.tagName !== "INPUT")) return;
    // Un attimo di attesa: passando da una casella all'altra il fuoco esce e
    // rientra, e senza questa pausa la barra sfarfallerebbe a ogni salto.
    setTimeout(function () {
      var ora = document.activeElement;
      if (ora && (ora.tagName === "TEXTAREA" || ora.tagName === "INPUT")) return;
      document.body.classList.remove("scrivendo");
    }, 120);
  });

  // Dal telefono il QR non lo si inquadra da qui: lo fa l'app, con la camera.
  // Dirlo in una pagina che non può farlo sarebbe una promessa a vuoto.
  if (window.DaProdApp) $("nota-qr").hidden = true;

  $("nome").value = ioNome;
  if (token) entra();
`;
