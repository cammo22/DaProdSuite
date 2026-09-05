/**
 * Il copione, quarta parte: la Galleria, la lente, i Pensieri.
 *
 * **Tre difetti chiusi qui dentro**, tutti e tre detti il 26 agosto 2026 da chi
 * la usava, e tutti e tre della stessa famiglia: *non si vede quello che c'è*.
 *
 * **1. «le musiche al momento non si vede l'immagine».** Un brano compariva
 * come una barra di riproduzione grigia, in mezzo ad altre barre grigie
 * identiche. La copertina c'era — DaProdMusica la genera — ma viveva accanto al
 * file e nessuno la chiedeva. Adesso c'è una rotta che la serve
 * (`/libreria/anteprima/:id`) e il riquadro la mostra.
 *
 * **2. «i video, la thumbnail: un frame si deve vedere, ora non lo hanno».** Un
 * `<video>` senza `poster` è un rettangolo nero: dodici rettangoli neri non
 * sono una galleria, sono un indovinello. Adesso il fotogramma lo estrae il
 * computer e arriva dalla stessa rotta.
 *
 * **3. «le immagini, se le tappo, si devono aprire a schermo intero, con anche
 * un pulsante per salvarlo sul telefono, poi un pulsante condividi».** Una foto
 * dentro un riquadro da 160 px non si guarda, si intravede. Adesso si tocca e
 * si apre: la **lente**.
 *
 * E una parola che è cambiata: i regali si chiamano **Pensieri**. Chiesto così,
 * e ha ragione — «regalo» dice che c'è un'occasione, «pensiero» dice solo che
 * qualcuno si è ricordato di te.
 */
export const COPIONE_GALLERIA = `
  var TIPI = [
    { id: "", nome: "tutto", tinta: "" },
    { id: "immagine", nome: "immagini", tinta: "viola" },
    { id: "video", nome: "video", tinta: "rosa" },
    { id: "audio", nome: "musica e voce", tinta: "ciano" },
  ];

  /**
   * I due tastoni in cima alla Galleria.
   *
   * Chiesto così: «due tasti "Le mie Produzioni" e "Pensieri"». La bacheca da
   * qui è sparita e sta in DaProd — che è la scheda che parla degli altri — e
   * questa scheda adesso risponde a una domanda sola: *dove sta la mia roba*.
   */
  function disegnaDueTasti() {
    var casella = $("due-tasti");
    casella.innerHTML = "";

    var quanti = regali.filter(function (x) { return !x.aperto; }).length;
    var pezzi = [
      {
        id: "mie",
        nome: "Le mie Produzioni",
        sotto: "quello che hai fatto fare al computer",
        tinta: "viola",
        segno: "\\u25A6",
      },
      {
        id: "arrivati",
        nome: "Pensieri",
        sotto: quanti ? quanti + " da aprire" : "quello che ti hanno mandato",
        tinta: "rosa",
        segno: "\\u2726",
      },
    ];

    for (var x of pezzi) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tastone " + x.tinta + (x.id === dove ? " on" : "");
      var s = document.createElement("span");
      s.className = "segno";
      s.textContent = x.segno;
      var n = document.createElement("span");
      n.className = "nome";
      n.textContent = x.nome;
      var p = document.createElement("small");
      p.textContent = x.sotto;
      b.append(s, n, p);
      b.addEventListener("click", (function (quale) {
        return function () { dove = quale; disegnaDueTasti(); leggiGalleria(); };
      })(x.id));
      casella.append(b);
    }

    $("sotto-galleria").textContent =
      dove === "mie"
        ? "Tocca una cosa per vederla grande, tenerla nel telefono o condividerla."
        : "Quello che ti hanno mandato dal computer.";
    // I filtri per tipo hanno senso solo sulle proprie cose: i pensieri sono
    // quattro in croce, e filtrarne quattro è un tasto in più per niente.
    $("filtri").hidden = dove !== "mie";
  }

  function disegnaFiltri() {
    var casella = $("filtri");
    casella.innerHTML = "";
    for (var t of TIPI) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (t.id === filtro ? " on" : "");
      b.textContent = t.nome;
      b.addEventListener("click", (function (quale) {
        return function () { filtro = quale; disegnaFiltri(); leggiGalleria(); };
      })(t.id));
      casella.append(b);
    }
  }

  async function leggiGalleria() {
    var casella = $("quadri");

    if (dove === "arrivati") {
      await leggiRegali();
      casella.innerHTML = "";
      $("galleria-vuota").hidden = regali.length > 0;
      $("galleria-vuota").textContent = "Non ti ha ancora mandato niente nessuno.";
      for (var r of regali) casella.append(quadroRegalo(r));
      return;
    }

    try {
      var risposta = await chiama(
        "/libreria?quanti=60&dove=mie" + (filtro ? "&tipo=" + filtro : ""),
      );
      var voci = (risposta && risposta.voci) || [];
      // Quello che si sta guardando adesso: serve al lettore, che quando si
      // tocca un brano mette in fila **tutto quello che c'e' sotto** invece di
      // quel brano solo. E' quello che fa qualunque app di musica, ed e' la
      // differenza fra un lettore e un tasto play.
      vociMostrate = voci;
      casella.innerHTML = "";
      $("galleria-vuota").hidden = voci.length > 0;
      $("galleria-vuota").textContent = "Ancora niente di tuo. Quello che chiedi finisce qui.";
      for (var v of voci) casella.append(quadro(v));
    } catch (e) {
      casella.innerHTML = "";
      $("galleria-vuota").hidden = false;
      $("galleria-vuota").textContent = e.message;
    }
  }

  /** Le voci che la galleria sta mostrando adesso: la fila che nasce da un tocco. */
  var vociMostrate = [];

  /** L'indirizzo del file vero, e quello dell'anteprima. */
  function indirizzoDi(v) { return "/libreria/file/" + encodeURIComponent(v.id); }
  function anteprimaDi(v) { return "/libreria/anteprima/" + encodeURIComponent(v.id); }

  /**
   * Un riquadro della galleria.
   *
   * **Sempre con qualcosa da guardare.** Un'immagine è già sé stessa; un video
   * mostra il suo fotogramma; un brano mostra la sua copertina. Quando
   * l'anteprima non c'è — perché sul computer manca FFmpeg, o perché quel brano
   * la copertina non ce l'ha — al posto del nero c'è un riquadro col segno
   * della scheda: dice comunque cos'è.
   */
  function quadro(v) {
    var box = document.createElement("div");
    box.className = "quadro";

    var vetro = document.createElement("button");
    vetro.type = "button";
    vetro.className = "vetro";

    /**
     * **Sempre qualcosa da guardare**, e da tre strade invece di una.
     *
     * ⚠ Il difetto del 26 agosto 2026 — «i video su android non mostrano bene
     * la thumbnail» — aveva una causa che non si vedeva: il fotogramma lo
     * estrae FFmpeg, e **FFmpeg non è imbarcato nella suite** (è GPL, la suite
     * è MIT). Chi non ce l'ha installato non aveva anteprime, punto.
     *
     * Adesso, in ordine di quanto costano:
     *
     * 1. un'immagine è già sé stessa;
     * 2. il computer ha il fotogramma o la copertina: si prende da lì;
     * 3. **il telefono se lo fa da solo**, se quel video ce l'ha in casa —
     *    Android sa estrarre un fotogramma senza bisogno di niente, e funziona
     *    anche senza linea.
     */
    var fatta = false;
    if (v.anteprima) {
      var img = document.createElement("img");
      img.loading = "lazy";
      // L'anteprima e non il file: per un video vuol dire 40 KB invece di 100
      // MB, e per una galleria di dodici riquadri è la differenza fra scorrere
      // e aspettare.
      img.src = v.tipo === "immagine" ? indirizzoDi(v) : anteprimaDi(v);
      img.alt = v.nome;
      vetro.append(img);
      fatta = true;
    } else if (v.tipo === "video" && window.DaProdApp && window.DaProdApp.anteprimaVideo) {
      var daQui = window.DaProdApp.anteprimaVideo(v.id);
      if (daQui) {
        var suo = document.createElement("img");
        suo.src = daQui;
        suo.alt = v.nome;
        vetro.append(suo);
        fatta = true;
      }
    }
    if (!fatta) {
      var senza = document.createElement("div");
      senza.className = "senza";
      senza.textContent = (SCHEDE[v.app] || SCHEDE.suite).segno;
      vetro.append(senza);
    }

    if (v.tipo === "video") {
      var play = document.createElement("span");
      play.className = "play";
      play.textContent = "\\u25B6";
      vetro.append(play);
    } else if (v.tipo === "audio") {
      var nota = document.createElement("span");
      nota.className = "bollino";
      nota.textContent = "\\u266B ascolta";
      vetro.append(nota);
    }

    /**
     * Toccare **fa partire la fila**, se e' roba che suona.
     *
     * Un brano e un video si ascoltano e si guardano uno dietro l'altro; una
     * foto si guarda e basta, e per quella la lente resta quello che era. La
     * fila nasce da quello che c'e' sullo schermo in quel momento — i filtri
     * valgono anche per lei, e cosi' «solo musica» diventa una scaletta.
     */
    vetro.addEventListener("click", function () {
      if (v.tipo === "audio" || v.tipo === "video") {
        accodaTutto(vociMostrate, v);
        apriPalco();
      } else {
        apriLaLente(v);
      }
    });
    box.append(vetro);

    var sotto = document.createElement("div");
    sotto.className = "sotto";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = v.nome;
    nome.title = v.nome;
    var riga = document.createElement("div");
    riga.className = "riga";
    riga.textContent = [nomeScheda(v.app), quando(v.creato), pesa(v.bytes)].filter(Boolean).join(" \\u00b7 ");
    sotto.append(nome, riga);

    if (v.mia && v.pubblicato) {
      var mostra = document.createElement("span");
      mostra.className = "spilla in-bacheca";
      mostra.textContent = "in bacheca";
      sotto.append(mostra);
    } else if (!v.mia && v.chiNome) {
      var chi = document.createElement("span");
      chi.className = "spilla";
      chi.textContent = "di " + v.chiNome;
      sotto.append(chi);
    }

    box.append(sotto);
    return box;
  }

  /* ---------------------------------------------------------------- la lente */

  /**
   * A schermo intero, con i due tasti che servono davvero.
   *
   * **Salva** porta il file nel telefono: dentro l'app lo fa lei, che sa
   * mettere un video in galleria e un brano fra la musica; nel browser finisce
   * nei Download.
   *
   * **Condividi** lo passa alle altre app del telefono — WhatsApp, la posta,
   * quello che c'è. È l'unico modo di far uscire una cosa da qui senza doverla
   * prima cercare in una cartella.
   */
  function apriLaLente(v) {
    var vecchia = document.querySelector(".lente");
    if (vecchia) vecchia.remove();

    var fuori = document.createElement("div");
    fuori.className = "lente";

    var cima = document.createElement("div");
    cima.className = "cima";
    var titolo = document.createElement("div");
    titolo.className = "titolo";
    titolo.textContent = v.nome;
    var chiudi = document.createElement("button");
    chiudi.className = "tondo";
    chiudi.textContent = "\\u2715";
    chiudi.addEventListener("click", function () { fuori.remove(); });
    cima.append(titolo, chiudi);

    var palco = document.createElement("div");
    palco.className = "palco";

    if (v.tipo === "immagine") {
      var img = document.createElement("img");
      img.src = indirizzoDi(v);
      img.alt = v.nome;
      palco.append(img);
    } else if (v.tipo === "video") {
      var vid = document.createElement("video");
      vid.src = indirizzoDi(v);
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      // Il fotogramma finché non parte: anche a schermo intero, mezzo secondo
      // di nero prima del primo frame sembra un video che non parte.
      if (v.anteprima) vid.poster = anteprimaDi(v);
      palco.append(vid);
    } else {
      // Un brano non si guarda: si ascolta. Ma la copertina grande è quello che
      // lo rende riconoscibile, ed è la ragione per cui la cuciamo nel file.
      var colonna = document.createElement("div");
      colonna.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:16px;width:100%";
      if (v.anteprima) {
        var cop = document.createElement("img");
        cop.className = "copertinona";
        cop.src = anteprimaDi(v);
        cop.alt = v.nome;
        colonna.append(cop);
      }
      var au = document.createElement("audio");
      au.src = indirizzoDi(v);
      au.controls = true;
      au.autoplay = true;
      au.style.width = "min(90vw, 420px)";
      colonna.append(au);
      palco.append(colonna);
    }

    var sotto = document.createElement("div");
    sotto.className = "sotto";
    if (v.didascalia && v.didascalia !== v.nome) {
      var dida = document.createElement("div");
      dida.className = "didascalia";
      dida.textContent = v.didascalia;
      sotto.append(dida);
    }

    var attrezzi = document.createElement("div");
    attrezzi.className = "attrezzi";

    /**
     * Metterla in fila, dalla lente.
     *
     * La lente resta quello che era — una cosa sola, guardata da vicino, con i
     * tasti per salvarla e condividerla — e da qui si passa al lettore, che e'
     * l'altra cosa: una fila che va avanti da sola. Chiesto il 5 settembre
     * 2026: «con anche la possibilita' di aggiungere contenuti in coda cosi'
     * posso ascoltare piu' canzoni una dietro l'altra».
     */
    if (v.tipo === "audio" || v.tipo === "video" || v.tipo === "immagine") {
      var inFila = document.createElement("button");
      inFila.className = "mini";
      inFila.textContent = "\\u2630 Mettila in fila";
      inFila.addEventListener("click", function () {
        var quante = accoda(v);
        inFila.textContent = "\\u2713 " + quante + " in fila";
      });
      attrezzi.append(inFila);
    }

    var salva = document.createElement("button");
    salva.className = "mini";
    salva.textContent = "\\u2913 Salva nel telefono";
    salva.addEventListener("click", function () { void tieniNelTelefono(v, salva); });
    attrezzi.append(salva);

    if (sipuoCondividere()) {
      var condividi = document.createElement("button");
      condividi.className = "mini";
      condividi.textContent = "\\u21AA Condividi";
      condividi.addEventListener("click", function () { void condividiFuori(v, condividi); });
      attrezzi.append(condividi);
    }

    if (v.mia) {
      var pubblica = document.createElement("button");
      pubblica.className = "mini" + (v.pubblicato ? " acceso" : "");
      pubblica.textContent = v.pubblicato ? "\\u2713 in bacheca" : "\\u263C Metti in DaProd";
      pubblica.addEventListener("click", async function () {
        pubblica.disabled = true;
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id) + "/pubblica", {
            method: "POST",
            body: JSON.stringify({ pubblicato: !v.pubblicato }),
          });
          v.pubblicato = !v.pubblicato;
          pubblica.className = "mini" + (v.pubblicato ? " acceso" : "");
          pubblica.textContent = v.pubblicato ? "\\u2713 in bacheca" : "\\u263C Metti in DaProd";
          await leggiGalleria();
        } catch (e) { alert(e.message); }
        pubblica.disabled = false;
      });

      var butta = document.createElement("button");
      butta.className = "mini male";
      butta.textContent = "Butta";
      butta.addEventListener("click", async function () {
        if (!confirm("Cancellare \\u00ab" + v.nome + "\\u00bb dal computer? Non si torna indietro.")) return;
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id), { method: "DELETE" });
          fuori.remove();
          await leggiGalleria();
        } catch (e) { alert(e.message); }
      });
      attrezzi.append(pubblica, butta);
    }

    sotto.append(attrezzi);
    fuori.append(cima, palco, sotto);

    // Toccare il fondo scuro chiude, come ci si aspetta. Toccare la roba
    // dentro no: altrimenti si chiuderebbe premendo play.
    fuori.addEventListener("click", function (ev) {
      if (ev.target === fuori || ev.target === palco) fuori.remove();
    });
    document.body.append(fuori);
  }

  /** Porta questa cosa nel telefono, con l'app se c'è, con un link se no. */
  async function tieniNelTelefono(v, tasto) {
    if (window.DaProdApp && window.DaProdApp.scaricaLibreria) {
      window.DaProdApp.scaricaLibreria(v.id, v.nome);
      tasto.textContent = "\\u2713 nel telefono";
      return;
    }
    var prima = tasto.textContent;
    tasto.disabled = true;
    tasto.textContent = "un attimo\\u2026";
    try {
      var risposta = await fetch(indirizzoDi(v), { headers: { Authorization: "Bearer " + token } });
      if (!risposta.ok) throw new Error("Non riesco a scaricarlo.");
      portaViaIlFile(await risposta.blob(), v.nome);
      tasto.textContent = "\\u2713 salvato";
    } catch (e) {
      tasto.textContent = prima;
      alert(e.message);
    }
    tasto.disabled = false;
  }

  /**
   * Si può condividere?
   *
   * Dentro l'app sì, sempre: lo fa lei con il menu di Android. Nel browser solo
   * se c'è \`navigator.share\` **con i file**: su un desktop non c'è, e mostrare
   * un tasto che apre una finestra di errore è peggio di non mostrarlo.
   */
  function sipuoCondividere() {
    if (window.DaProdApp && window.DaProdApp.condividi) return true;
    return typeof navigator.canShare === "function";
  }

  async function condividiFuori(v, tasto) {
    if (window.DaProdApp && window.DaProdApp.condividi) {
      window.DaProdApp.condividi(v.id, v.nome);
      return;
    }
    var prima = tasto.textContent;
    tasto.disabled = true;
    tasto.textContent = "preparo\\u2026";
    try {
      var risposta = await fetch(indirizzoDi(v), { headers: { Authorization: "Bearer " + token } });
      var blob = await risposta.blob();
      var file = new File([blob], v.nome, { type: blob.type || "application/octet-stream" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: v.nome });
      } else {
        portaViaIlFile(blob, v.nome);
      }
    } catch (e) {
      // Chi annulla la condivisione fa scattare un errore: non è un guasto e
      // non merita un avviso.
    }
    tasto.disabled = false;
    tasto.textContent = prima;
  }

  /* ------------------------------------------------------ le ultime cose */

  /**
   * Le ultime cose venute fuori, in fondo alla Casa.
   *
   * Chiesto il 26 agosto 2026: «scorrendo sotto si possono vedere gli ultimi
   * lavori creati». Sono sei, non sessanta: questa non è la galleria, è la
   * risposta a «cos'è successo mentre non guardavo».
   */
  async function disegnaUltimi() {
    var casella = $("ultimi");
    if (!casella) return;
    try {
      var risposta = await chiama("/libreria?quanti=6&dove=mie");
      var voci = (risposta && risposta.voci) || [];
      casella.innerHTML = "";
      $("ultimi-vuoti").hidden = voci.length > 0;
      for (var v of voci) casella.append(quadro(v));
    } catch (e) { /* offline: resta quello che c'era */ }
  }

  /* ---------------------------------------------------------- i pensieri */

  /**
   * La roba che ti ha mandato una persona.
   *
   * Chiesto il 22 agosto 2026: «l'utente riceverà la notifica che ha ricevuto
   * qualcosa, tipo poi appare con una bella animazione tipo regalo». Quindi non
   * è una riga in un elenco: la prima volta che arriva **si apre in mezzo allo
   * schermo**, e da lì in poi resta in Galleria, sotto «Pensieri».
   */
  async function leggiRegali() {
    try {
      var risposta = await chiama("/invii");
      regali = (risposta && risposta.invii) || [];
    } catch (e) { return; }

    if (pagina === "galleria") disegnaDueTasti();

    // Il pacco si apre da solo una volta sola: quello arrivato e mai aperto.
    var nuovo = regali.filter(function (x) { return !x.aperto; })[0];
    if (nuovo && (!paccoAperto || paccoAperto !== nuovo.id)) mostraPacco(nuovo);
  }

  /** Il pacco in mezzo allo schermo, che si scuote finché non lo apri. */
  function mostraPacco(i) {
    if (document.querySelector(".pacco")) return;
    paccoAperto = i.id;

    var fuori = document.createElement("div");
    fuori.className = "pacco";
    var dentro = document.createElement("div");
    dentro.className = "dentro";

    var fiocco = document.createElement("div");
    fiocco.className = "fiocco";
    fiocco.textContent = "\\uD83C\\uDF81";

    var titolo = document.createElement("h2");
    titolo.textContent = i.aperto ? i.nome : "Un pensiero per te";
    var da = document.createElement("div");
    da.className = "da";
    da.textContent = "da " + i.daNome + " \\u00b7 " + pesa(i.bytes);

    dentro.append(fiocco, titolo, da);

    if (i.messaggio) {
      var m = document.createElement("p");
      m.className = "messaggio";
      m.textContent = i.messaggio;
      dentro.append(m);
    }

    var anteprima = document.createElement("div");
    anteprima.className = "anteprima";
    anteprima.hidden = true;
    dentro.append(anteprima);

    var fila = document.createElement("div");
    fila.className = "fila";

    var apri = document.createElement("button");
    apri.textContent = "Apri";
    apri.addEventListener("click", async function () {
      fuori.classList.add("aperto");
      apri.hidden = true;
      titolo.textContent = i.nome;
      mostraDentro(anteprima, i);
      try {
        await chiama("/invii/" + encodeURIComponent(i.id) + "/aperto", { method: "POST", body: "{}" });
      } catch (e) { /* si segnerà al giro dopo */ }
      tieni.hidden = false;
    });

    var tieni = document.createElement("button");
    tieni.className = "piano";
    tieni.textContent = "Tienilo";
    tieni.hidden = !i.aperto;
    tieni.addEventListener("click", function () { scaricaRegalo(i); });

    var dopo = document.createElement("button");
    dopo.className = "piano";
    dopo.textContent = "Chiudi";
    dopo.addEventListener("click", function () { fuori.remove(); });

    if (i.aperto) { apri.hidden = true; mostraDentro(anteprima, i); }
    fila.append(apri, tieni, dopo);
    dentro.append(fila);
    fuori.append(dentro);
    document.body.append(fuori);
  }

  /** Cosa c'era dentro il pacco: si vede subito, se è una cosa da vedere. */
  function mostraDentro(box, i) {
    box.innerHTML = "";
    box.hidden = false;
    var indirizzo = "/invii/" + encodeURIComponent(i.id) + "/file";
    if ((i.mime || "").indexOf("image/") === 0) {
      var img = document.createElement("img");
      img.src = indirizzo;
      box.append(img);
    } else if ((i.mime || "").indexOf("video/") === 0) {
      var vid = document.createElement("video");
      vid.src = indirizzo;
      vid.controls = true;
      vid.playsInline = true;
      box.append(vid);
    } else if ((i.mime || "").indexOf("audio/") === 0) {
      var au = document.createElement("audio");
      au.src = indirizzo;
      au.controls = true;
      au.style.width = "100%";
      box.append(au);
    } else {
      box.hidden = true;
    }
  }

  async function scaricaRegalo(i) {
    if (window.DaProdApp && window.DaProdApp.scaricaRegalo) {
      window.DaProdApp.scaricaRegalo(i.id, i.nome);
      return;
    }
    var risposta = await fetch("/invii/" + encodeURIComponent(i.id) + "/file", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!risposta.ok) { alert("Non riesco a scaricarlo."); return; }
    portaViaIlFile(await risposta.blob(), i.nome);
  }

  /** Il riquadro di un pensiero, in Galleria. */
  function quadroRegalo(i) {
    var box = document.createElement("div");
    box.className = "quadro";
    var indirizzo = "/invii/" + encodeURIComponent(i.id) + "/file";

    var vetro = document.createElement("button");
    vetro.type = "button";
    vetro.className = "vetro";
    if ((i.mime || "").indexOf("image/") === 0) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = indirizzo;
      vetro.append(img);
    } else if ((i.mime || "").indexOf("video/") === 0) {
      var vid = document.createElement("video");
      vid.src = indirizzo;
      vid.preload = "metadata";
      vid.playsInline = true;
      vetro.append(vid);
    } else {
      var senza = document.createElement("div");
      senza.className = "senza";
      senza.textContent = "\\u2726";
      vetro.append(senza);
    }
    vetro.addEventListener("click", function () { mostraPacco(i); });
    box.append(vetro);

    var sotto = document.createElement("div");
    sotto.className = "sotto";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = i.nome;
    var riga = document.createElement("div");
    riga.className = "riga";
    riga.textContent = "da " + i.daNome + " \\u00b7 " + quando(i.quando) + " \\u00b7 " + pesa(i.bytes);
    sotto.append(nome, riga);

    var attrezzi = document.createElement("div");
    attrezzi.className = "attrezzi";
    var tieni = document.createElement("button");
    tieni.className = "mini";
    tieni.textContent = "tieni nel telefono";
    tieni.addEventListener("click", function () { scaricaRegalo(i); });
    var butta = document.createElement("button");
    butta.className = "mini male";
    butta.textContent = "butta";
    butta.addEventListener("click", async function () {
      if (!confirm("Buttare via \\u00ab" + i.nome + "\\u00bb?")) return;
      try {
        await chiama("/invii/" + encodeURIComponent(i.id), { method: "DELETE" });
        await leggiGalleria();
      } catch (e) { alert(e.message); }
    });
    attrezzi.append(tieni, butta);
    sotto.append(attrezzi);

    box.append(sotto);
    return box;
  }
`;
