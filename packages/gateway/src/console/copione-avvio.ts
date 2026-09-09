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
    guardaSeSiEAggiornata(s.versione);
  }

  /* ------------------------------------------------------- i coriandoli */

  /**
   * **I coriandoli**, in un posto solo.
   *
   * Chiesto il 7 settembre 2026: «facciamo che quando esce un aggiornamento
   * esce un avviso con tipo gli effetti confetti». E l'easter egg ne vuole
   * degli altri: due feste diverse fatte in due modi diversi sarebbero due
   * cose dove ce n'e' una, e la seconda impara sempre meno della prima.
   *
   * Sono cento rettangolini che cadono e girano su sé stessi, disegnati su una
   * tela che vive tre secondi e poi si toglie di mezzo. Niente librerie: e' una
   * quarantina di righe, e una libreria per i coriandoli e' duecento KB che
   * ogni telefono scarica per due secondi di festa.
   *
   * ⚠ **La tela non prende i tocchi.** Sta sopra a tutto per il tempo che
   * dura, e senza «pointer-events: none» un tocco in quei tre secondi finirebbe
   * su di lei invece che sul tasto sotto — cioe' l'app sembrerebbe bloccata
   * proprio nel momento in cui vuole sembrare allegra.
   */
  function coriandoli(quanti) {
    // Chi ha chiesto meno animazioni non vuole nemmeno questa: e' la stessa
    // regola del filo del caricamento.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var tela = document.createElement("canvas");
    tela.className = "coriandoli";
    document.body.append(tela);
    var pennello = tela.getContext("2d");
    if (!pennello) { tela.remove(); return; }

    /**
     * ⚠ **Le misure si prendono a ogni giro, e i coriandoli nascono solo
     * quando ci sono.**
     *
     * Preso una volta sola, all'inizio, «innerWidth» puo' essere **zero**:
     * questa funzione parte quando arriva lo stato del computer, che a volte e'
     * prima che la pagina sia stata disegnata — su un telefono lento, o su una
     * finestra ancora nascosta. Una tela larga zero non disegna niente e non da'
     * nessun errore: i coriandoli «partono» e lo schermo resta vuoto. Ci sono
     * cascato provandoli.
     *
     * Quindi: si gira lo stesso, e appena la pagina sa quanto e' larga si
     * riempie di pezzi e si comincia. Se non lo sa mai, dopo tre secondi la
     * tela se ne va da sola come farebbe comunque.
     */
    var largo = 0;
    var alto = 0;
    function misura() {
      var l = window.innerWidth || document.documentElement.clientWidth || 0;
      var a = window.innerHeight || document.documentElement.clientHeight || 0;
      if (l === largo && a === alto) return;
      largo = l;
      alto = a;
      tela.width = largo;
      tela.height = alto;
    }

    var COLORI = ["#8b5cf6", "#35d0ff", "#f59e0b", "#ec4899", "#22c55e"];
    var pezzi = [];
    function riempi() {
      var quantiNe = quanti || 110;
      for (var i = 0; i < quantiNe; i++) {
        pezzi.push({
          x: Math.random() * largo,
          // Partono tutti sopra il bordo, sparpagliati: se partissero dalla
          // stessa riga si vedrebbe una tendina che scende, non dei coriandoli.
          y: -20 - Math.random() * alto * 0.6,
          largo: 6 + Math.random() * 6,
          alto: 8 + Math.random() * 8,
          giu: 2 + Math.random() * 3,
          lato: -1 + Math.random() * 2,
          gira: Math.random() * Math.PI,
          quantoGira: -0.12 + Math.random() * 0.24,
          colore: COLORI[Math.floor(Math.random() * COLORI.length)],
        });
      }
    }

    var nato = Date.now();
    var DURA = 3200;

    function unGiro() {
      misura();
      // Ancora niente misure: si aspetta il giro dopo invece di disegnare nel
      // vuoto. (Su una pagina nascosta i giri non arrivano proprio, ed e'
      // giusto cosi': la festa comincia quando qualcuno guarda.)
      if (!largo || !alto) { requestAnimationFrame(unGiro); return; }
      if (!pezzi.length) {
        riempi();
        // Il tempo comincia da quando si vedono davvero, se no i secondi
        // passati ad aspettare la pagina se li mangia la festa. Ed e' per
        // questo che la scadenza si guarda **dopo**: prima che i pezzi
        // esistano non c'e' niente da far scadere.
        nato = Date.now();
      }
      var passato = Date.now() - nato;
      if (passato > DURA) { tela.remove(); return; }
      // L'ultimo mezzo secondo sfuma: sparire di colpo si nota piu' della
      // festa.
      tela.style.opacity = passato > DURA - 600 ? String((DURA - passato) / 600) : "1";
      pennello.clearRect(0, 0, largo, alto);
      for (var p of pezzi) {
        p.y += p.giu;
        p.x += p.lato;
        p.gira += p.quantoGira;
        pennello.save();
        pennello.translate(p.x, p.y);
        pennello.rotate(p.gira);
        pennello.fillStyle = p.colore;
        pennello.fillRect(-p.largo / 2, -p.alto / 2, p.largo, p.alto);
        pennello.restore();
      }
      requestAnimationFrame(unGiro);
    }
    requestAnimationFrame(unGiro);
  }

  /**
   * **La suite si e' aggiornata**: si dice, e si festeggia.
   *
   * Chiesto il 7 settembre 2026: «quando esce un aggiornamento esce un avviso
   * con tipo gli effetti confetti».
   *
   * ⚠ **Si guarda il numero, non si chiede a nessuno.** La versione arriva
   * gia' con lo stato, a ogni apertura: se e' diversa da quella dell'ultima
   * volta, la suite e' stata aggiornata da quando l'hai guardata. Non serve una
   * rotta nuova, non serve che il computer si ricordi chi ha gia' visto cosa —
   * e funziona uguale dal telefono, dalla console e da DaProdConnessione,
   * perche' e' la stessa pagina.
   *
   * La prima volta in assoluto non si festeggia niente: chi apre la console per
   * la prima volta non ha aggiornato nulla, si e' solo collegato.
   */
  function guardaSeSiEAggiornata(versione) {
    if (!versione) return;
    var prima = null;
    try { prima = localStorage.getItem("daprod.versione.vista"); } catch (e) { return; }
    try { localStorage.setItem("daprod.versione.vista", versione); } catch (e) { /* niente */ }
    if (!prima || prima === versione) return;
    avvisa("Aggiornata alla " + versione + ". Buon divertimento.", "bene");
    coriandoli();
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
      // Da qui si sa se questa persona decide: cambia la scheda in fondo e cosa
      // c'e' dentro. Vedi «disegnaLaSchedaFila».
      ioRuolo = io.ruolo || "";
      localStorage.setItem(CHIAVE_NOME, ioNome);
    } catch (e) { /* si riprova al giro dopo */ }

    /**
     * La scheda in fondo si disegna **fuori dal try**, e non e' un dettaglio.
     *
     * ⚠ Se «/io» non risponde — computer spento, token vecchio — il ruolo
     * resta vuoto, e vuoto vuol dire «non decido»: la strada stretta. Lasciando
     * questa riga dentro al try, in quel caso non veniva chiamata affatto e la
     * scheda restava quella scritta nel markup, cioe' «Fila»: a un utente
     * comparivano i comandi per governare la macchina, per il solo fatto che il
     * computer non aveva risposto. Ci sono cascato provandola.
     */
    disegnaLaSchedaFila();

    $("chi").hidden = false;
    disegnaMioProfilo();

    try {
      azioni = await chiama("/azioni");
      disegnaTessere();
      disegnaAzioni();
    } catch (e) { /* senza azioni restano i lavori e la galleria */ }

    disegnaDueTasti();
    disegnaFiltri();
    // Il gesto del tirare vale per tutte le pagine, quindi si monta una volta
    // sola quando si entra. Vedi «montaIlTiro».
    montaIlTiro();
    try { await leggiStili(); } catch (e) { /* offline: restano quelli di prima */ }
    disegnaFiltriDaprod();
    await guardaAi();
    try { await leggiNotifiche(); } catch (e) { /* offline: restano quelle di prima */ }
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
      /**
       * ⚠ **Prima la macchina, e solo lei a ogni spinta.**
       *
       * «/macchina» e' la risposta piccola che dice chi sta girando e a che
       * punto e': va letta sempre, ed e' quella che fa muovere la fase sulla
       * riga del lavoro. Va letta **per prima**, se no le righe si
       * disegnerebbero con lo stato di un giro fa.
       *
       * Tutto il resto e' roba grossa che cambia di rado, e da quando arriva
       * l'avanzamento (1.2.1) le spinte sono decine per lavoro invece di
       * qualcuna al minuto. Un secondo e mezzo di respiro e la Fila torna
       * leggera. Vedi «ogniTanto».
       */
      leggiMacchina().catch(function () {});
      ogniTanto("coda", 1500, function () { leggiCoda().catch(function () {}); });
      ogniTanto("pannello", 1500, function () { leggiPannello().catch(function () {}); });
      ogniTanto("regali", 1500, function () { leggiRegali().catch(function () {}); });
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
  $("apri-stili").addEventListener("click", function () { vaiA("stili"); });
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
  /**
   * ⚠ **L'ingranaggio e la freccia in giu' non ci sono piu'.** Chiesto il 6
   * settembre 2026: «il tasto impostazioni e la freccia verso il basso
   * togliamoli».
   *
   * La freccia faceva quello che fa gia' il trascinamento verso il basso, e
   * l'ingranaggio cambiava effetto — un simbolo che in ogni app del mondo vuol
   * dire «impostazioni». Adesso gli effetti hanno il loro tasto, in basso a
   * sinistra, con il loro menu.
   */
  $("palco-effetti").addEventListener("click", giraGliEffetti);

  /**
   * **L'easter egg.** Chiesto il 6 settembre 2026: «un easter egg se clicchi la
   * scritta DaProdSuite».
   *
   * Sette tocchi, che e' il numero che Android usa per «diventa sviluppatore»:
   * abbastanza da non capitare per sbaglio, abbastanza pochi da arrivarci se
   * uno ci sta provando. Dal terzo in poi lo dice, perche' un easter egg che
   * non da' nessun segno finche' non e' finito e' un easter egg che nessuno
   * trova.
   *
   * Cosa fa: accende il visualizer sullo sfondo **anche senza musica**, e lo
   * lascia li'. E' la cosa piu' bella che questa suite sa fare e l'unica che
   * non si puo' guardare stando fermi.
   */
  var tocchiMarchio = 0;
  var ultimoTocco = 0;
  $("marchio").addEventListener("click", function () {
    var adesso = Date.now();
    // Piu' di un secondo e mezzo fra un tocco e l'altro non e' una sequenza:
    // e' qualcuno che ha toccato il logo due volte in dieci minuti.
    tocchiMarchio = (adesso - ultimoTocco < 1500) ? tocchiMarchio + 1 : 1;
    ultimoTocco = adesso;

    var m = $("marchio");
    m.classList.remove("lampo");
    void m.offsetWidth;
    m.classList.add("lampo");

    if (tocchiMarchio >= 7) {
      tocchiMarchio = 0;
      easterEgg();
      return;
    }
    if (tocchiMarchio >= 3) {
      avvisa("Ancora " + (7 - tocchiMarchio) + "\u2026");
    }
  });

  /**
   * Il visualizer come sfondo, e basta: senza musica, senza palco.
   *
   * Si spegne ritoccando sette volte, o al primo brano che parte — da li' in
   * poi torna a seguire il suono, che e' il suo mestiere.
   */
  function easterEgg() {
    var acceso = document.body.classList.toggle("sognante");
    if (acceso) {
      var tela = $("visual");
      if (tela && Visual.accendi(tela)) {
        var dietro = $("sfondo-visual");
        if (dietro) dietro.style.opacity = "";
        if (!sogno) sogno = requestAnimationFrame(unSogno);
      }
      avvisa("Va da solo. Ritoccalo sette volte per farlo smettere.", "bene");
    } else {
      if (sogno) { cancelAnimationFrame(sogno); sogno = null; }
      if (!palcoAperto) {
        var d = $("sfondo-visual");
        if (d) d.style.opacity = "0";
      }
      avvisa("Buonanotte.");
    }
  }

  var sogno = null;
  function unSogno() {
    sogno = requestAnimationFrame(unSogno);
    // Senza niente che suona il motore disegna comunque: le feature scendono a
    // zero e gli effetti si muovono piano, che e' esattamente quello che serve
    // a uno sfondo.
    Visual.disegna(suonante);
    Visual.copiaSulloSfondo();
  }
  /**
   * ⚠ **Le tre linee cambiano mestiere.** Chiesto il 5 settembre 2026: «il
   * tasto con le tre linee a destra durante la riproduzione DaProd non
   * funziona: rendilo il tasto che, se cliccato, mostra tutte le info della
   * canzone, e se lo riclicchi scompare».
   */
  $("palco-fila").addEventListener("click", giraLeInfo);
  /** E la fila va dove uno la cerca: addosso al «3 di 12». */
  $("palco-sotto").addEventListener("click", apriLaFila);
  /**
   * Un tocco sul visualizer cambia effetto.
   *
   * E' il posto dove finisce il gesto che aveva il tasto asterisco, tolto dalla
   * barra: chi vuole cambiare tocca quello che sta guardando, che e' piu'
   * naturale di cercare un simbolo in un angolo.
   */
  $("visual").addEventListener("click", function () { Visual.cambia(null); });
  // La barra del tempo: mentre il dito e' sopra, il brano non la muove.
  $("palco-barra").addEventListener("input", function () { stoTrascinando = true; });
  $("palco-barra").addEventListener("change", function () { stoTrascinando = false; vaiAlPunto(); });
  aggangiaIlTrascinamento($("palco"));
  /**
   * Il proprio nome apre **le notifiche**.
   *
   * ⚠ Fino alla 1.2.3 portava alla scheda DaProd, che pero' ha gia' il suo
   * tasto in fondo: erano due strade per lo stesso posto, e le notifiche non ne
   * avevano nessuna. Chiesto il 7 settembre 2026: «cliccando sul nostro nome
   * utente si apre una schermata tipo a mezzo schermo dove ci sono queste
   * notifiche».
   */
  $("chi").addEventListener("click", function () { giraIlPannelloNotifiche(); });
  $("notifiche-chiudi").addEventListener("click", function () { chiudiIlPannelloNotifiche(); });
  // Toccare fuori dal pannello lo chiude, come ci si aspetta da una cosa che
  // sale dal basso.
  $("notifiche-fondo").addEventListener("click", function () { chiudiIlPannelloNotifiche(); });
  $("apri-profilo").addEventListener("click", apriIlProfilo);
  $("comincia-chiacchiera").addEventListener("click", cominciaChiacchierata);
  $("chiudi-chiacchiera").addEventListener("click", chiudiLaChiacchierata);
  $("esci-dalla-fila").addEventListener("click", esciDallaFilaDelParlare);
  $("stile-nuovo").addEventListener("click", function () { apriModificaStile(null); });
  $("dillo").addEventListener("click", dilloAlModello);
  $("fai-il-piano").addEventListener("click", function () { void chiediIlPiano(); });
  $("cosa-dico").addEventListener("keydown", function (ev) {
    // Invio manda, invio col maiuscolo va a capo: è quello che fa ogni chat, e
    // aspettarsi il contrario da questa sarebbe una sorpresa gratis.
    if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); dilloAlModello(); }
  });
  $("carica-in-bacheca").addEventListener("click", apriCarica);
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
