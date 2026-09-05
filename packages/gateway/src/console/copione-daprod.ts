/**
 * Il copione, quinta parte: **DaProd**, il social della suite.
 *
 * Era la scheda «Persone», e mostrava i quadrati della rete: chi cercava «dove
 * gestisco chi è collegato» non la apriva nemmeno, e chi la apriva ci trovava
 * il firewall. Nella 0.7.6 le due cose si sono separate per bene:
 *
 * - **gli interruttori** (chi è collegato, gli inviti, la rete, i limiti della
 *   macchina) sono nelle impostazioni, che è dove uno va a cercare un
 *   interruttore;
 * - **DaProd** è la bacheca: quello che le persone hanno deciso di far vedere,
 *   con la faccia di chi l'ha fatto, il cuore, e il tasto per tenerlo.
 *
 * ## Perché una colonna e non una griglia
 *
 * La Galleria è una griglia perché lì si cerca: sono le proprie cose, si sa
 * cosa si sta cercando, e più ce ne stanno meglio è. Qui si guarda quello che
 * hanno fatto gli altri, e una cosa che si guarda ha bisogno di spazio, di una
 * faccia sopra e di un modo per dire «mi piace». Una griglia di miniature con
 * un nome sotto è una cartella condivisa; questa è un posto dove si sta.
 *
 * ## Il profilo
 *
 * Chiesto il 26 agosto 2026: «si può andare anche nel proprio profilo, che si
 * può modificare tutto — mettiamo la possibilità di aggiungere una foto di
 * profilo e caricare file da condividere nella bacheca». Tutte e tre le cose
 * stanno qui: il nome (che resta unico, e il gateway lo controlla), la riga
 * sotto al nome, la faccia, e il tasto per mettere in bacheca una cosa che non
 * ha generato il computer.
 */
export const COPIONE_DAPROD = `
  /**
   * ⚠ **In DaProd non ci sono filtri**, dalla 0.9.1.
   *
   * C'erano — «tutto», «immagini», «video», «musica» — e sono stati tolti il 5
   * settembre 2026: «nella sezione daprod togli i pulsanti per tutto immagini
   * video e musica, viene sempre visualizzato tutto».
   *
   * Ed e' la cosa giusta. Quei filtri sono nati copiando la Galleria, dove
   * servono: li' cerchi **una cosa tua** in mezzo a trecento. Qui non si cerca
   * niente — si scorre quello che gli altri hanno messo, in ordine di tempo, e
   * un filtro per tipo su una bacheca vuol dire nascondere due terzi di quello
   * che le persone hanno fatto perche' oggi ti va la musica.
   *
   * La funzione resta e non disegna niente: la chiamano tre posti, e toglierla
   * da tutti e tre per una riga vuota non vale la confusione.
   */
  function disegnaFiltriDaprod() {
    var casella = $("filtri-daprod");
    if (casella) casella.innerHTML = "";
    filtroBacheca = "";
  }

  async function leggiBacheca() {
    disegnaMioProfilo();
    disegnaFiltriDaprod();
    void disegnaDaProvare();
    var casella = $("bacheca");
    try {
      var risposta = await chiama(
        "/libreria?quanti=40&dove=bacheca" + (filtroBacheca ? "&tipo=" + filtroBacheca : ""),
      );
      inBacheca = (risposta && risposta.voci) || [];
      casella.innerHTML = "";
      $("bacheca-vuota").hidden = inBacheca.length > 0;
      for (var v of inBacheca) casella.append(postaDi(v));
    } catch (e) {
      casella.innerHTML = "";
      $("bacheca-vuota").hidden = false;
      $("bacheca-vuota").textContent = e.message;
    }
  }

  /**
   * Gli stili e i prompt che gli altri fanno provare, in cima a DaProd.
   *
   * Chiesto il 5 settembre 2026: «tenendo premuto lo stile e condividendolo in
   * daprod, cosi' chi va in daprod puo' importare lo stile per usarlo — lo
   * stesso anche con i prompt».
   *
   * **Perche' in cima e non in mezzo alla bacheca.** Perche' non sono la stessa
   * cosa: la bacheca e' quello che le persone hanno **fatto**, questa e' la
   * cassetta degli attrezzi con cui l'hanno fatto. Mischiarle vorrebbe dire
   * scorrere venti foto per trovare uno stile.
   *
   * Se non c'e' niente in vetrina la riga non compare: uno spazio vuoto con
   * scritto «ancora niente» in cima a ogni schermata e' un promemoria che si
   * impara a saltare.
   */
  async function disegnaDaProvare() {
    var dove = $("da-provare");
    if (!dove) return;
    dove.innerHTML = "";
    var quali = await leggiVetrina();
    if (!quali.length) { dove.hidden = true; return; }
    dove.hidden = false;

    var titolo = document.createElement("h3");
    titolo.textContent = "Da provare";
    dove.append(titolo);

    var sotto = document.createElement("p");
    sotto.className = "sotto";
    sotto.textContent =
      "Stili e prompt che gli altri hanno messo qui. Prendine uno e diventa tuo: " +
      "lo cambi come vuoi, e resta scritto di chi era.";
    dove.append(sotto);

    var riga = document.createElement("div");
    riga.className = "stili";
    for (var s of quali) riga.append(cartaDaProvare(s));
    dove.append(riga);
  }

  /** Uno stile o un prompt in vetrina: cos'e', di chi e', e il tasto per prenderlo. */
  function cartaDaProvare(s) {
    var box = document.createElement("div");
    box.className = "stile";

    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = s.nome;

    var che = document.createElement("div");
    che.className = "sotto";
    var etichetta = genereDi(s) === "prompt" ? "prompt" : "stile";
    che.textContent =
      etichetta + " per " + infoTipo(tipoDi(s)).nome.toLowerCase() +
      (s.chiNome ? " \u00b7 di " + s.chiNome : "");

    var parole = document.createElement("div");
    parole.className = "parole";
    parole.textContent = s.testo;

    var fila = document.createElement("div");
    fila.className = "fila";

    var usa = document.createElement("button");
    usa.className = "mini";
    usa.textContent = "\u25B6 Provalo";
    usa.addEventListener("click", (function (uno) {
      return function () { usaLoStile(uno); };
    })(s));

    var prendi = document.createElement("button");
    prendi.className = "mini";
    prendi.textContent = "\u2913 Prendilo";
    prendi.addEventListener("click", (function (uno, tasto) {
      return function () { void prendiLoStile(uno, tasto); };
    })(s, prendi));

    fila.append(usa, prendi);
    box.append(nome, che, parole, fila);
    return box;
  }

  /**
   * Il profilo di qualcun altro: chi e', e cosa ha fatto.
   *
   * **Solo le sue cose pubblicate**, tranne per chi decide, che le vede tutte —
   * e quelle non pubblicate hanno un colore diverso, perche' guardarle e' un
   * permesso e non la normalita'. Il filtro vero sta nel gateway: qui si
   * sceglie solo cosa chiedere.
   */
  async function apriIlProfiloDi(v) {
    var carta = apriFoglio(v.chiNome || "Questa persona");

    var testa = document.createElement("div");
    testa.className = "profilo";
    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda grande";
    riempiFaccia(faccia, v.chiNome || "?", v.chiFoto || "");
    var dati = document.createElement("div");
    dati.className = "dati";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = v.chiNome || "qualcuno";
    var sotto = document.createElement("div");
    sotto.className = "motto";
    sotto.textContent = "Guardo cosa ha fatto\u2026";
    dati.append(nome, sotto);
    testa.append(faccia, dati);
    carta.append(testa);

    var quadri = document.createElement("div");
    quadri.className = "quadri";
    carta.append(quadri);

    var voci = [];
    try {
      // Chi decide chiede «tutte» e riceve tutto; chi non decide chiede lo
      // stesso «bacheca», che e' l'unica cosa che il gateway gli darebbe.
      var risposta = await chiama(
        "/libreria?quanti=60&di=" + encodeURIComponent(v.chi) +
          "&dove=" + (puoiDecidere ? "tutte" : "bacheca"),
      );
      voci = (risposta && risposta.voci) || [];
    } catch (e) {
      sotto.textContent = e.message;
      return;
    }

    var pubbliche = voci.filter(function (x) { return x.pubblicato; }).length;
    sotto.textContent = voci.length
      ? pubbliche + " in bacheca" + (voci.length > pubbliche ? " \u00b7 " + (voci.length - pubbliche) + " no" : "")
      : "Non ha ancora messo niente in bacheca.";

    for (var x of voci) quadri.append(quadroDelProfilo(x));
  }

  /** Un riquadro nel profilo di qualcun altro. */
  function quadroDelProfilo(v) {
    var box = document.createElement("div");
    // Le non pubblicate hanno un colore diverso: si vedono solo da chi decide,
    // e va detto che si sta guardando una cosa che non e' in bacheca.
    box.className = "quadro" + (v.pubblicato ? "" : " privata");

    var vetro = document.createElement("button");
    vetro.type = "button";
    vetro.className = "vetro";
    if (v.tipo === "immagine" || v.anteprima) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = v.tipo === "immagine"
        ? "/libreria/file/" + encodeURIComponent(v.id)
        : "/libreria/anteprima/" + encodeURIComponent(v.id);
      vetro.append(img);
    } else {
      var senza = document.createElement("div");
      senza.className = "senza";
      senza.textContent = v.tipo === "audio" ? "\u266B" : "\u25B6";
      vetro.append(senza);
    }
    vetro.addEventListener("click", function () {
      chiudiFoglio();
      if (v.tipo === "audio" || v.tipo === "video") { accodaTutto([v], v); apriPalco(); }
      else apriLaLente(v);
    });

    var sotto = document.createElement("div");
    sotto.className = "sotto";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = v.didascalia || v.nome;
    var riga = document.createElement("div");
    riga.className = "riga";
    riga.textContent = quando(v.creato);
    sotto.append(nome, riga);

    box.append(vetro, sotto);
    return box;
  }

  /** Una cosa in bacheca: la faccia sopra, la roba in mezzo, i tasti sotto. */
  function postaDi(v) {
    var box = document.createElement("div");
    box.className = "posta";

    var testa = document.createElement("div");
    testa.className = "testa";
    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda";
    // L'indirizzo arriva gia' fatto dal computer, con dentro **quale** foto e':
    // costruirlo qui vorrebbe dire perdere la versione, ed e' esattamente il
    // motivo per cui una foto nuova continuava a comparire vecchia.
    riempiFaccia(faccia, v.chiNome || "?", v.chiFoto || "");
    var chi = document.createElement("div");
    chi.className = "cresce";
    var nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = v.mia ? (ioNome + " \\u00b7 tu") : (v.chiNome || "qualcuno");
    var q = document.createElement("div");
    q.className = "quando";
    q.textContent = [quando(v.creato), v.caricata ? "caricata" : nomeScheda(v.app)]
      .filter(Boolean).join(" \\u00b7 ");
    chi.append(nome, q);
    testa.append(faccia, chi);
    box.append(testa);

    /**
     * **Toccare il nome apre il profilo di quella persona.**
     *
     * Chiesto il 5 settembre 2026: «facciamo anche che se clicchi su un utente
     * puoi vedere il suo profilo e le sue creazioni, solo quelle pubblicate
     * pero' — un admin puo' vedere anche quelle non pubbliche».
     *
     * Il permesso non sta qui: sta nel gateway, che con «dove=bacheca» torna le
     * pubblicate e con «dove=tutte» — che accetta solo da chi decide — torna
     * tutto. Questa riga sceglie quale delle due chiedere, e il computer decide
     * se puo'.
     */
    if (!v.mia && v.chi) {
      testa.style.cursor = "pointer";
      testa.addEventListener("click", (function (uno) {
        return function () { void apriIlProfiloDi(uno); };
      })(v));
    }

    var vetro = document.createElement("button");
    vetro.type = "button";
    vetro.className = "vetro";
    if (v.tipo === "immagine") {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = "/libreria/file/" + encodeURIComponent(v.id);
      img.alt = v.nome;
      vetro.append(img);
    } else if (v.anteprima) {
      var ant = document.createElement("img");
      ant.loading = "lazy";
      ant.src = "/libreria/anteprima/" + encodeURIComponent(v.id);
      ant.alt = v.nome;
      vetro.append(ant);
      var segno = document.createElement("span");
      segno.className = "play";
      segno.textContent = v.tipo === "video" ? "\\u25B6" : "\\u266B";
      vetro.append(segno);
    } else {
      var senza = document.createElement("div");
      senza.className = "senza";
      senza.textContent = (SCHEDE[v.app] || SCHEDE.suite).segno;
      vetro.append(senza);
    }
    /**
     * ⚠ **Anche da qui si suona, non si apre la lente.**
     *
     * Il difetto del 5 settembre 2026: «nella sezione daprod, se ascolto una
     * canzone, sullo sfondo non appare il visualizer». La causa era questa
     * riga: in DaProd un tocco apriva la lente — un file, i controlli del
     * browser, nessuna fila e nessun visualizer — mentre in Galleria apriva il
     * lettore. Due gesti uguali che facevano due cose diverse.
     *
     * Adesso in tutte e due i posti un brano o un video mettono in fila quello
     * che si sta guardando e aprono il palco. Una foto resta una foto.
     */
    vetro.addEventListener("click", function () {
      if (v.tipo === "audio" || v.tipo === "video") {
        accodaTutto(inBacheca, v);
        apriPalco();
      } else {
        apriLaLente(v);
      }
    });

    /**
     * **Due tocchi: mi piace.** Chiesto il 5 settembre 2026: «facciamo doppio
     * click su qualcosa, mette il like».
     *
     * E' il gesto che ogni social ha insegnato, e costa meno di cercare il
     * cuore in fondo al riquadro. Il cuore resta: uno serve a chi sa, l'altro a
     * chi guarda.
     */
    vetro.addEventListener("dblclick", function (ev) {
      ev.preventDefault();
      var cuore = box.querySelector(".cuore.miPiace");
      if (cuore) cuore.click();
    });
    box.append(vetro);

    var parole = document.createElement("div");
    parole.className = "parole";
    parole.textContent = v.didascalia || v.nome;
    box.append(parole);

    var piedi = document.createElement("div");
    piedi.className = "piedi";

    /**
     * Il cuore.
     *
     * Si accende subito, prima che il computer risponda: un cuore che ci mette
     * mezzo secondo a colorarsi fa premere due volte, e la seconda volta lo
     * spegne. Se poi la chiamata va male si rimette com'era.
     */
    var cuore = document.createElement("button");
    // «miPiace» lo distingue dagli altri tasti che usano la stessa forma —
    // «tienila», «togli», il conto dei commenti — e serve al doppio tocco sul
    // contenuto, che deve trovare **questo** e non il primo che capita.
    cuore.className = "cuore miPiace" + (v.mioMiPiace ? " mio" : "");
    var simbolo = document.createElement("span");
    simbolo.className = "simbolo";
    simbolo.textContent = v.mioMiPiace ? "\\u2665" : "\\u2661";
    var conto = document.createElement("span");
    conto.textContent = v.quantiMiPiace ? String(v.quantiMiPiace) : "";
    cuore.append(simbolo, conto);
    cuore.addEventListener("click", async function () {
      var prima = v.mioMiPiace;
      v.mioMiPiace = !prima;
      v.quantiMiPiace = Math.max(0, (v.quantiMiPiace || 0) + (prima ? -1 : 1));
      cuore.className = "cuore miPiace" + (v.mioMiPiace ? " mio" : "");
      simbolo.textContent = v.mioMiPiace ? "\\u2665" : "\\u2661";
      conto.textContent = v.quantiMiPiace ? String(v.quantiMiPiace) : "";
      try {
        var esito = await chiama("/libreria/" + encodeURIComponent(v.id) + "/mipiace", {
          method: "POST",
          body: JSON.stringify({ mipiace: v.mioMiPiace }),
        });
        v.quantiMiPiace = esito.quanti;
        conto.textContent = v.quantiMiPiace ? String(v.quantiMiPiace) : "";
      } catch (e) {
        v.mioMiPiace = prima;
        cuore.className = "cuore miPiace" + (prima ? " mio" : "");
        simbolo.textContent = prima ? "\\u2665" : "\\u2661";
      }
    });
    piedi.append(cuore);

    /**
     * «Tienila»: **non è una copia**.
     *
     * La fa comparire fra le proprie cose, come un segnalibro. Il file resta di
     * chi l'ha fatto, e se lui la toglie dalla bacheca sparisce anche da qui —
     * era sua, ha cambiato idea, e un segnalibro non è un diritto acquisito.
     */
    if (!v.mia) {
      var tieni = document.createElement("button");
      tieni.className = "cuore" + (v.tenuta ? " mio" : "");
      var segnalibro = document.createElement("span");
      segnalibro.className = "simbolo";
      segnalibro.textContent = v.tenuta ? "\\u2605" : "\\u2606";
      var parola = document.createElement("span");
      parola.textContent = v.tenuta ? "tenuta" : "tieni";
      tieni.append(segnalibro, parola);
      tieni.addEventListener("click", async function () {
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id) + "/tengo", {
            method: "POST",
            body: JSON.stringify({ tengo: !v.tenuta }),
          });
          v.tenuta = !v.tenuta;
          tieni.className = "cuore" + (v.tenuta ? " mio" : "");
          segnalibro.textContent = v.tenuta ? "\\u2605" : "\\u2606";
          parola.textContent = v.tenuta ? "tenuta" : "tieni";
        } catch (e) { alert(e.message); }
      });
      piedi.append(tieni);
    } else {
      var togli = document.createElement("button");
      togli.className = "cuore";
      togli.textContent = "togli dalla bacheca";
      togli.addEventListener("click", async function () {
        try {
          await chiama("/libreria/" + encodeURIComponent(v.id) + "/pubblica", {
            method: "POST",
            body: JSON.stringify({ pubblicato: false }),
          });
          await leggiBacheca();
        } catch (e) { alert(e.message); }
      });
      piedi.append(togli);
    }

    /**
     * I commenti. **Sotto la cosa, non in un foglio a parte.**
     *
     * Chiesto il 27 agosto 2026: «facciamo un modo di poter anche commentare i
     * contenuti». Un cuore dice *che* qualcuno e' passato; un commento dice
     * **cosa ha pensato**, ed e' l'ultimo pezzo che mancava a questa bacheca
     * per essere un posto dove si sta invece di una vetrina.
     *
     * Il conto si vede subito perche' viaggia con l'elenco; le parole si
     * chiedono solo aprendole. Duecento commenti dentro l'elenco della
     * galleria vorrebbero dire scaricarli tutti per mostrarne il numero.
     */
    var conta = document.createElement("button");
    conta.className = "cuore";
    var fumetto = document.createElement("span");
    fumetto.className = "simbolo";
    // Il fumetto sta fuori dal BMP: dentro una stringa JS va scritto come
    // coppia di surrogati, se no il primo pezzo si mangia il secondo.
    fumetto.textContent = "\\uD83D\\uDCAC";
    var quantiCom = document.createElement("span");
    piedi.append(conta);
    conta.append(fumetto, quantiCom);

    var filo = document.createElement("div");
    filo.className = "commenti";
    filo.hidden = true;

    var aggiornaConto = function (quanti) {
      v.quantiCommenti = quanti;
      quantiCom.textContent = quanti ? String(quanti) : "commenta";
    };
    aggiornaConto(v.quantiCommenti || 0);

    var caricati = false;
    conta.addEventListener("click", function () {
      filo.hidden = !filo.hidden;
      if (filo.hidden || caricati) return;
      caricati = true;
      leggiCommenti(v, filo, aggiornaConto);
    });

    box.append(piedi, filo);
    return box;
  }

  /* --------------------------------------------------------- i commenti */

  /** Chiede le parole e le disegna. Una volta sola, aprendo. */
  async function leggiCommenti(v, filo, aggiornaConto) {
    filo.innerHTML = "";
    var attesa = document.createElement("div");
    attesa.className = "vuoto";
    attesa.textContent = "…";
    filo.append(attesa);
    try {
      var esito = await chiama("/libreria/" + encodeURIComponent(v.id) + "/commenti");
      disegnaCommenti(v, filo, esito.commenti || [], aggiornaConto);
    } catch (e) {
      filo.innerHTML = "";
      var male = document.createElement("div");
      male.className = "avviso male";
      male.textContent = e.message;
      filo.append(male);
    }
  }

  function disegnaCommenti(v, filo, elenco, aggiornaConto) {
    filo.innerHTML = "";
    aggiornaConto(elenco.length);

    if (!elenco.length) {
      var vuoto = document.createElement("div");
      vuoto.className = "vuoto";
      vuoto.textContent = "Ancora niente. Scrivi tu la prima cosa.";
      filo.append(vuoto);
    }

    for (var c of elenco) filo.append(unCommento(v, filo, c, aggiornaConto));

    /**
     * La casella per scrivere.
     *
     * **Invio manda**, perche' e' quello che fa la mano da sola. Maiusc+Invio
     * va a capo: un commento di due righe capita, e perderlo perche' hai
     * premuto Invio per andare a capo e' il modo piu' rapido di non commentare
     * mai piu'.
     */
    var scrivi = document.createElement("div");
    scrivi.className = "scrivi-commento";
    var casella = document.createElement("textarea");
    casella.rows = 1;
    casella.maxLength = 500;
    casella.placeholder = "Scrivi qualcosa…";
    var manda = document.createElement("button");
    manda.className = "mini";
    manda.textContent = "Manda";

    var spedisci = async function () {
      var testo = casella.value.trim();
      if (!testo) return;
      manda.disabled = true;
      casella.disabled = true;
      try {
        var esito = await chiama("/libreria/" + encodeURIComponent(v.id) + "/commenti", {
          method: "POST",
          body: JSON.stringify({ testo: testo }),
        });
        casella.value = "";
        disegnaCommenti(v, filo, esito.commenti || [], aggiornaConto);
      } catch (e) {
        alert(e.message);
      }
      manda.disabled = false;
      casella.disabled = false;
    };

    manda.addEventListener("click", spedisci);
    casella.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); spedisci(); }
    });
    // Cresce mentre scrivi, come le caselle della Produzione: un commento
    // dentro una fessura da una riga non si rilegge.
    casella.addEventListener("input", function () {
      casella.style.height = "auto";
      casella.style.height = Math.min(casella.scrollHeight + 2, 160) + "px";
    });

    scrivi.append(casella, manda);
    filo.append(scrivi);
  }

  function unCommento(v, filo, c, aggiornaConto) {
    var riga = document.createElement("div");
    riga.className = "commento";

    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda";
    riempiFaccia(faccia, c.chiNome || "?", c.chiFoto || "");

    var corpo = document.createElement("div");
    corpo.className = "cresce";
    var testa = document.createElement("div");
    testa.className = "chi";
    testa.textContent = (c.chiNome || "qualcuno") + " · " + quando(c.quando);
    var parole = document.createElement("div");
    parole.className = "cosa";
    parole.textContent = c.testo;
    corpo.append(testa, parole);
    riga.append(faccia, corpo);

    // La X c'e' solo se il computer ha detto che si puo': chi l'ha scritto, e
    // chi ha fatto la cosa. La pagina non lo indovina.
    if (c.mioDaTogliere) {
      var via = document.createElement("button");
      via.className = "toglilo";
      via.title = "togli questo commento";
      via.textContent = "✕";
      via.addEventListener("click", async function () {
        try {
          var esito = await chiama(
            "/libreria/" + encodeURIComponent(v.id) + "/commenti/" + encodeURIComponent(c.id),
            { method: "DELETE" },
          );
          disegnaCommenti(v, filo, esito.commenti || [], aggiornaConto);
        } catch (e) { alert(e.message); }
      });
      riga.append(via);
    }
    return riga;
  }

  /* ---------------------------------------------------------- il profilo */

  function disegnaMioProfilo() {
    riempiFaccia($("mia-faccia"), ioNome, ioFoto);
    riempiFaccia($("mia-faccina"), ioNome, ioFoto);
    $("mio-nome").textContent = ioNome;
    $("profilo-nome").textContent = ioNome || "\\u2014";
    $("profilo-motto").textContent = ioMotto || "Nessuna riga sotto al nome.";
  }

  /**
   * Il foglio del profilo: nome, riga, faccia.
   *
   * Il nome si può cambiare, e **resta unico**: se quello scelto è di qualcun
   * altro il computer dice di no e la frase arriva qui. È lo stesso controllo
   * dell'ingresso, e sta nello stesso posto (il gateway): un controllo scritto
   * due volte è un controllo che prima o poi dice due cose diverse.
   */
  function apriIlProfilo() {
    var carta = apriFoglio("Il tuo profilo");

    var testa = document.createElement("div");
    testa.className = "profilo";
    testa.style.marginBottom = "8px";
    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda grande";
    riempiFaccia(faccia, ioNome, ioFoto);
    var scegli = document.createElement("input");
    scegli.type = "file";
    scegli.accept = "image/*";
    scegli.hidden = true;
    var cambia = document.createElement("button");
    cambia.className = "mini";
    cambia.textContent = ioFoto ? "Cambia foto" : "Metti una foto";
    cambia.addEventListener("click", function () { scegli.click(); });
    var dati = document.createElement("div");
    dati.className = "dati";
    var quale = document.createElement("div");
    quale.className = "nome";
    quale.textContent = ioNome;
    dati.append(quale);
    testa.append(faccia, dati, cambia, scegli);
    carta.append(testa);

    var avviso = document.createElement("div");
    avviso.className = "avviso";

    scegli.addEventListener("change", async function () {
      var file = scegli.files && scegli.files[0];
      scegli.value = "";
      if (!file) return;
      cambia.disabled = true;
      cambia.textContent = "carico\\u2026";
      try {
        var esito = await mandaIlFile(
          "/io/foto?nome=" + encodeURIComponent(file.name),
          file,
        );
        /**
         * L'indirizzo che risponde il computer ha gia' dentro la versione
         * nuova. Prima ce la si appiccicava qui con l'orologio, e funzionava —
         * ma **solo su questa schermata**: tutte le altre facce continuavano a
         * chiedere l'indirizzo senza versione, e si tenevano quella di prima.
         */
        ioFoto = esito.foto || ioFoto;
        riempiFaccia(faccia, ioNome, ioFoto);
        disegnaMioProfilo();
        leggiBacheca();
        avviso.textContent = "";
      } catch (e) {
        avviso.textContent = e.message;
        avviso.className = "avviso male";
      }
      cambia.disabled = false;
      cambia.textContent = "Cambia foto";
    });

    var eNome = document.createElement("label");
    eNome.textContent = "Come ti chiami";
    var campoNome = document.createElement("input");
    campoNome.type = "text";
    campoNome.maxLength = 40;
    campoNome.value = ioNome;

    var eMotto = document.createElement("label");
    eMotto.textContent = "La riga sotto al nome";
    var campoMotto = document.createElement("input");
    campoMotto.type = "text";
    campoMotto.maxLength = 120;
    campoMotto.value = ioMotto;
    campoMotto.placeholder = "due parole su di te, se ti va";

    var fila = document.createElement("div");
    fila.className = "fila";
    var salva = document.createElement("button");
    salva.textContent = "Salva";
    salva.addEventListener("click", async function () {
      salva.disabled = true;
      avviso.className = "avviso";
      avviso.textContent = "";
      try {
        await chiama("/io/profilo", {
          method: "POST",
          body: JSON.stringify({ nome: campoNome.value.trim(), motto: campoMotto.value.trim() }),
        });
        ioNome = campoNome.value.trim() || ioNome;
        ioMotto = campoMotto.value.trim();
        localStorage.setItem(CHIAVE_NOME, ioNome);
        disegnaMioProfilo();
        chiudiFoglio();
        leggiBacheca();
      } catch (e) {
        avviso.textContent = e.message;
        avviso.className = "avviso male";
        campoNome.focus();
        campoNome.select();
      }
      salva.disabled = false;
    });
    fila.append(salva);

    carta.append(eNome, campoNome, eMotto, campoMotto, fila, avviso);
  }

  /**
   * Mette in bacheca una cosa che non ha generato il computer.
   *
   * È l'altra metà di DaProd: una bacheca dove si può solo mostrare quello che
   * la suite ha prodotto è una vetrina, non un posto dove si sta.
   */
  /**
   * **Carica un contenuto: da dove?** Nuovo nella 0.9.1.
   *
   * Chiesto il 5 settembre 2026: «il pulsante metti una cosa tua cambiamolo in
   * "carica un contenuto"; una volta cliccato chiedera' dal tuo telefono
   * oppure dalla suite — dal telefono vede i file, dalla suite fa vedere solo
   * i contenuti creati».
   *
   * Sono due gesti diversi e per questo si chiede prima: dal telefono si sceglie
   * un file e **si carica**, dalla suite si sceglie una cosa che c'e' gia' e
   * **si pubblica** (nessun byte si muove). Prima c'era solo il primo, e le
   * proprie generazioni si mettevano in bacheca dalla Galleria — cioe' da
   * un'altra scheda, che e' il motivo per cui quasi nessuno lo faceva.
   */
  function apriCarica() {
    var carta = apriFoglio("Carica un contenuto");

    voceFoglio(
      carta,
      "\u1F4F1".length > 1 ? "\u2913" : "\u2913",
      "Dal telefono",
      "una foto, un video o un brano che hai gi\u00e0 qui",
      function () { chiudiFoglio(); $("file-in-bacheca").click(); },
    );

    voceFoglio(
      carta,
      "\u25A6",
      "Dalla suite",
      "una cosa che hai fatto fare al computer",
      function () { chiudiFoglio(); void apriScegliDallaSuite(); },
    );
  }

  /**
   * Le proprie cose, per sceglierne una da mettere in bacheca.
   *
   * Nessun byte si muove: la cosa e' gia' sul computer, e pubblicarla e' un
   * segno che si mette accanto. E' la stessa rotta che usa la Galleria.
   */
  async function apriScegliDallaSuite() {
    var carta = apriFoglio("Dalla suite");
    var attesa = document.createElement("p");
    attesa.className = "nota";
    attesa.textContent = "Guardo cosa hai fatto\u2026";
    carta.append(attesa);

    var voci = [];
    try {
      var risposta = await chiama("/libreria?quanti=60&dove=mie");
      voci = (risposta && risposta.voci) || [];
    } catch (e) {
      attesa.className = "avviso male";
      attesa.textContent = e.message;
      return;
    }
    attesa.remove();

    var daFare = voci.filter(function (v) { return !v.pubblicato; });
    if (!daFare.length) {
      var niente = document.createElement("p");
      niente.className = "nota";
      niente.textContent = "Hai gi\u00e0 messo in bacheca tutto quello che hai fatto.";
      carta.append(niente);
      return;
    }

    for (var v of daFare) {
      voceFoglio(
        carta,
        v.tipo === "audio" ? "\u266B" : v.tipo === "video" ? "\u25B6" : "\u25C9",
        v.didascalia || v.nome,
        quando(v.creato),
        (function (quale) {
          return function () { chiudiFoglio(); void pubblicaDallaSuite(quale); };
        })(v),
      );
    }
  }

  /** La mette in bacheca, con due parole sotto se se ne vogliono scrivere. */
  async function pubblicaDallaSuite(v) {
    var avviso = $("avviso-bacheca");
    try {
      var didascalia = window.prompt("Vuoi scriverci qualcosa sotto?", v.didascalia || "");
      if (didascalia === null) return;
      await chiama("/libreria/" + encodeURIComponent(v.id) + "/pubblica", {
        method: "POST",
        body: JSON.stringify({ pubblicato: true, didascalia: didascalia }),
      });
      avviso.textContent = "";
      await leggiBacheca();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    }
  }

  async function caricaInBacheca(file) {
    var avviso = $("avviso-bacheca");
    avviso.className = "avviso";
    avviso.textContent = "Carico " + file.name + "\\u2026";
    try {
      // «Mettiamo anche la possibilita' di poter scrivere qualcosa di
      // personalizzato»: due parole sotto, e si possono lasciare vuote.
      var didascalia = window.prompt("Vuoi scriverci qualcosa sotto?", "") || "";
      await mandaIlFile(
        "/bacheca?nome=" + encodeURIComponent(file.name) +
          "&didascalia=" + encodeURIComponent(didascalia),
        file,
      );
      avviso.textContent = "";
      await leggiBacheca();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    }
  }

  /**
   * Manda un file al gateway, col suo tipo e senza involucri.
   *
   * Il corpo **è** il file: niente multipart, niente base64. Un video da cento
   * MA in base64 diventano centotrentatré, e il gateway lo scrive sul disco
   * mentre arriva invece di tenerselo in memoria.
   */
  async function mandaIlFile(percorso, file) {
    var risposta = await fetch(percorso, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    var testo = await risposta.text();
    var corpo = null;
    try { corpo = testo ? JSON.parse(testo) : null; } catch (e) { corpo = null; }
    if (!risposta.ok) throw new Error((corpo && corpo.errore) || ("Errore " + risposta.status));
    return corpo;
  }
`;
