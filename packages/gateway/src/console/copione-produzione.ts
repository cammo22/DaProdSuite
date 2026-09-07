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
   * di ripiego — perché l'elenco vero resta \«/azioni\», non questo.
   */
  var PRODUZIONI = {
    "genera.immagine": { dentroTitolo: "Da una descrizione", dentroSotto: " \u2014 la scrivi e nasce dal niente", nome: "Produzione Immagini", sotto: "una foto da una descrizione", tinta: "viola", segno: "\\u25C9" },
    "genera.video": { dentroTitolo: "Una clip", dentroSotto: " \u2014 qualche minuto", nome: "Produzione Video", sotto: "una clip, col suono", tinta: "rosa", segno: "\\u25B6" },
    /**
     * ⚠ **La storia non ha piu' una tessera sua.** Cambiato nella 1.0.0.
     *
     * Chiesto il 6 settembre 2026: «facciamo che la modalita' storia e' dentro
     * la produzione video».
     *
     * Ha ragione, ed e' una correzione a una scelta mia della 0.9.1: li' avevo
     * separato la storia dalla clip perche' «una clip e' **una** generazione e
     * dura minuti, una storia sono da quattro a sedici generazioni incatenate e
     * dura mezz'ora», e nascondere quel salto dentro un cursore era sbagliato.
     *
     * Quel ragionamento resta vero, e la conclusione era troppo larga: **la
     * differenza va detta, non messa in un altro posto.** Chi vuole un video
     * cerca «Produzione Video» — se quello che vuole e' lungo, lo scopre li'
     * dentro, con scritto quanto costa. Cercarlo in una tessera che si chiama
     * «Storia», accanto a quella dei video, e' un indovinello.
     *
     * L'azione resta nel catalogo e resta separata: e' un'altra cosa per il
     * computer, l'agente MCP la vede come sempre. Cambia solo dove si trova.
     */
    "genera.storia": { dentroTitolo: "Una storia", dentroSotto: "30 secondi, un minuto, due \u2014 pezzi incatenati, e ci mette mezz\u0027ora", nome: "Storia", sotto: "30 secondi, un minuto, due", tinta: "rosa", segno: "\\u29C9", dentroA: "genera.video" },
    /**
     * ⚠ **La modifica sta dentro la produzione immagini.** Nuova nella 1.0.2.
     *
     * Chiesto il 6 settembre 2026: «l'utente clicca su produzione foto e puo'
     * scegliere tra generazione da testo e modifica da foto».
     *
     * E' il meccanismo della 1.0.0 per le storie dentro ai video, e qui vale
     * per la stessa ragione: chi vuole cambiare una foto cerca «Produzione
     * Immagini», non una tessera che si chiama «Modifica». Le due strade si
     * scelgono **dopo**, con scritto accanto in cosa sono diverse.
     */
    /**
     * \u26A0 **Si chiama \u00ABModifica\u00BB e basta.** Cambiato il 6 settembre 2026:
     * \u00ABda una foto e' sbagliato, chiamalo modifica\u00BB.
     *
     * Prima diceva \u00ABDa una foto che hai\u00BB, per stare in rima con \u00ABDa una
     * descrizione\u00BB sopra. La rima costava piu' di quanto valeva: le due voci
     * dicevano **da dove parti**, e quello che uno sta scegliendo li' e'
     * **cosa fa** \u2014 una foto nuova, o una che c'e' gia' e va cambiata. La
     * riga sotto continua a dire da dove parte.
     */
    "modifica.immagine": { dentroTitolo: "Modifica", dentroSotto: "parti da una foto che hai gia' e dici cosa cambiare", nome: "Modifica", sotto: "parti da una foto", tinta: "verde", segno: "\u270E", dentroA: "genera.immagine" },
    "genera.brano": { nome: "Produzione Musica", sotto: "una canzone, anche cantata", tinta: "ciano", segno: "\\u266B" },
    "genera.voce": { nome: "Produzione Audio", sotto: "un testo letto ad alta voce", tinta: "ambra", segno: "\\u275E" },
  };

  /** I quattro tastoni, in Casa e in Produzione: gli stessi, disegnati due volte. */
  function disegnaTessere() {
    var casella = $("tessere");
    casella.innerHTML = "";
    // Quelle che stanno **dentro** a un'altra non hanno una tessera loro: le
    // si raggiunge da li'. Vedi «dentroA» in PRODUZIONI.
    for (var a of azioni.filter(function (x) { return x.coda && !(PRODUZIONI[x.id] || {}).dentroA; })) {
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
    /**
     * ⚠ **Anche qui niente tessera per chi sta dentro a un'altra.**
     *
     * Fino alla 1.0.3 questo elenco non lo filtrava, e la Casa si': in
     * Produzione comparivano sei tastoni — «Modifica» e «Storia» in mezzo agli
     * altri — mentre in Casa erano quattro. Le stesse cose in due posti
     * dicevano due cose diverse, e «Modifica» sembrava una scheda a se'.
     *
     * Segnalato il 6 settembre 2026: «hai messo un pulsante modifica». Il
     * filtro e' identico a quello di «disegnaTessere», e le due schermate
     * tornano a essere gli stessi quattro tastoni disegnati due volte.
     */
    for (var a of azioni.filter(function (x) { return x.coda && !(PRODUZIONI[x.id] || {}).dentroA; })) {
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
    /**
     * Se qualcosa sta **dentro** a questa, prima si sceglie quale delle due.
     *
     * Una riga sola dice cosa cambia — una clip corta, o una lunga fatta di
     * pezzi incatenati — e accanto c'e' scritto **quanto costa**, che e' la
     * cosa che uno vuole sapere prima di premere e non dopo mezz'ora.
     */
    var dentro = azioni.filter(function (x) {
      return (PRODUZIONI[x.id] || {}).dentroA === a.id;
    });
    b.addEventListener("click", function () {
      if (!dentro.length) { vaiA("produzione"); scegli(a); return; }
      var carta = apriFoglio(come.nome || a.titolo);
      voceFoglio(
        carta,
        come.segno || scheda.segno,
        come.dentroTitolo || "Una clip",
        (come.sotto || scheda.che) + (come.dentroSotto || " \u2014 qualche minuto"),
        function () { chiudiFoglio(); vaiA("produzione"); scegli(a); },
      );
      for (var i = 0; i < dentro.length; i++) {
        var altra = dentro[i];
        var suo = PRODUZIONI[altra.id] || {};
        voceFoglio(
          carta,
          suo.segno || "\u29C9",
          suo.dentroTitolo || suo.nome || "L\u0027altra strada",
          suo.dentroSotto || suo.sotto || "",
          (function (quale) {
            return function () { chiudiFoglio(); vaiA("produzione"); scegli(quale); };
          })(altra),
        );
      }
    });
    return b;
  }

  /** Costruisce il modulo dai campi dichiarati: qui non si sa cosa siano. */
  /**
   * I prompt salvati per questa scheda, e il tasto per salvarne uno nuovo.
   *
   * Nasce nella 0.9.0, chiesta cosi': «lo stesso anche con i prompt — canzoni,
   * immagini e video si possono condividere, in modo da usarli e modificarli a
   * piacere».
   *
   * **Perche' qui e non solo nella scheda Stili.** Perche' il momento in cui
   * uno vuole salvare un prompt e' un secondo dopo averlo scritto, non mezz'ora
   * dopo in un'altra schermata — e il momento in cui vuole riusarlo e' un
   * secondo prima di scriverne un altro. Toccarne uno **sostituisce** quello
   * che c'e' scritto: e' un punto di partenza da cambiare, non una gabbia.
   */
  /* --------------------------------------------------- riempire dal capito */

  /**
   * Apre l'azione capita e ci mette dentro i campi.
   *
   * ⚠ La casella «dillo e basta» che chiamava questa funzione e' durata una
   * versione: erano due caselle nella stessa schermata che facevano la stessa
   * cosa (vedi il commento in pagine.ts). La funzione resta perche' la usa
   * **la chiacchierata**, che e' il posto giusto: li' si parla, e quando si e'
   * soddisfatti si preme «crea il piano».
   *
   * I campi si scrivono **uno per uno e solo se esistono**: un modello che si
   * inventa un campo non deve poter far comparire una casella che l'azione non
   * ha, e uno che ne dimentica uno non deve svuotare quelli che c'erano.
   */
  function riempiDaCapito(esito) {
    var azione = null;
    for (var a of azioni) if (a.id === esito.azione) azione = a;
    if (!azione) return;
    scegli(azione);

    for (var nome in esito.valori) {
      if (!Object.prototype.hasOwnProperty.call(esito.valori, nome)) continue;
      var campo = document.querySelector('#modulo [data-campo="' + nome + '"]');
      if (!campo) continue;
      var valore = esito.valori[nome];
      if (campo.type === "checkbox") {
        campo.checked = valore === "true" || valore === "1" || valore === "si";
      } else {
        campo.value = valore;
      }
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Le pastiglie non guardano il campo nascosto: si ridisegnano da sole
    // quando cambia, e senza questo giro resterebbero accese su quella di prima.
    for (var p of document.querySelectorAll("#modulo .filtri button[data-valore]")) {
      var nascosto = p.parentElement && p.parentElement.previousElementSibling;
      if (!nascosto || !nascosto.dataset) continue;
      p.classList.toggle("on", p.dataset.valore === nascosto.value);
    }
  }

  /** Una riga d'avviso sotto al modulo: la stessa che usa «manda». */
  function avvisaAzione(testo, male) {
    var dove = $("avviso-azione");
    if (!dove) return;
    dove.textContent = testo;
    dove.className = "avviso" + (male ? " male" : " bene");
  }

  /**
   * Di che tipo sono i prompt di questa azione.
   *
   * ⚠ **E se l'azione non e' una delle tre, si guarda la scheda.** Dalla
   * 1.0.6: «Modifica una foto» e «Una storia» sono nate dopo questa tabella
   * e non ci sono dentro, quindi la riga dei prompt spariva del tutto — in
   * quei due moduli non si poteva ne' usarne uno ne' salvarne uno, senza che
   * niente lo dicesse. Un prompt pero' e' del **tipo della scheda**, non
   * dell'azione: quello che vale per una foto vale per una foto modificata.
   */
  function tipoDellaScheda(a) {
    for (var t of TIPI_STILE) if (t.azione === a.id) return t.id;
    return { foto: "immagine", cinema: "video", musica: "musica" }[a.app] || null;
  }

  /**
   * La riga dei prompt: quelli che hai, e il tasto per salvarne uno.
   *
   * ⚠ **Fino alla 1.2.2 questa riga era due righe, e in due magazzini.**
   * Sopra c'era «I tuoi prompt» che leggeva i preset da <preset.json>, sotto le
   * pastiglie che leggevano gli stili con genere prompt. Nella stessa
   * schermata, con lo stesso nome, e nessuna delle due vedeva quello che
   * l'altra salvava: si salvava di qua e si guardava di la'. Detto il 7
   * settembre 2026: «i prompt continuano a non vederli».
   *
   * Adesso il magazzino e' uno solo — gli stili, <genere: "prompt"> — e questa
   * e' l'unica riga. Il perche' della scelta sta in
   * <apps/shell/src/main/travaso-preset.ts>.
   */
  function rigaPrompt(a) {
    var box = document.createElement("div");
    box.style.marginTop = "10px";

    var quale = tipoDellaScheda(a);
    if (!quale) return box;

    var miei = mieiStili.filter(function (s) {
      return genereDi(s) === "prompt" && tipoDi(s) === quale;
    });

    /**
     * Il titolo c'e' solo se c'e' qualcosa sotto.
     *
     * «I tuoi prompt» sopra al vuoto e' una promessa non mantenuta: chi legge
     * pensa di averne e di non trovarli, che e' esattamente il guaio da cui
     * nasce tutta questa storia.
     */
    if (miei.length) {
      var titolo = document.createElement("label");
      titolo.textContent = "I tuoi prompt";
      box.append(titolo);
    }

    var riga = document.createElement("div");
    riga.className = "filtri";

    for (var pr of miei) riga.append(bottonePrompt(pr));

    var salva = document.createElement("button");
    salva.type = "button";
    salva.className = "mini";
    salva.textContent = miei.length ? "+ salva questo" : "+ salva come prompt";
    salva.addEventListener("click", (function (tipo) {
      return function () { void salvaComePrompt(tipo); };
    })(quale));
    riga.append(salva);

    box.append(riga);
    return box;
  }

  /**
   * Una pastiglia di prompt: toccala e il modulo si riempie.
   *
   * **Tutto il modulo, non solo la casella grande.** E' la differenza fra un
   * prompt e uno stile, ed e' quella che si era persa: un prompt salvato si
   * porta dietro titolo, durata, modello — tutto quello che c'era scritto — e
   * ritrovandolo devi ritrovare il modulo com'era, non una frase.
   *
   * Col tasto destro, o tenendo premuto shift, si butta: un prompt sbagliato
   * salvato per sempre e' peggio di nessun prompt.
   */
  function bottonePrompt(x) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = "✎ " + x.nome;
    b.title = x.testo;
    b.addEventListener("click", function (ev) {
      if (ev.shiftKey) { void togliPrompt(x); return; }
      riempiCon(x);
    });
    b.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
      void togliPrompt(x);
    });
    return b;
  }

  /** Rimette nel modulo quello che era stato salvato: campo per campo. */
  function riempiCon(x) {
    for (var c of $("modulo").querySelectorAll("[data-campo]")) {
      if (c.dataset.principale) {
        c.value = x.testo;
        c.dispatchEvent(new Event("input"));
        continue;
      }
      var da = (x.campi || {})[c.dataset.campo];
      if (da !== undefined) {
        c.value = da;
        c.dispatchEvent(new Event("input", { bubbles: true }));
        c.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  async function togliPrompt(x) {
    if (!confirm("Togliere \u00ab" + x.nome + "\u00bb dai tuoi prompt?")) return;
    try {
      await chiama("/stili/" + encodeURIComponent(x.id), { method: "DELETE" });
      await leggiStili();
      if (scelta) scegli(scelta);
    } catch (e) { avvisaDelMale(e); }
  }

  /**
   * Salva quello che c'e' scritto adesso, con un nome.
   *
   * Il nome lo si chiede con la finestrella del browser e non con un foglio, ed e'
   * l'unico posto della console in cui succede: qui la domanda e' una parola
   * sola, e un foglio che sale per una parola sola sarebbe piu' lento del gesto
   * che deve rendere veloce.
   *
   * **Si salva tutto il modulo.** Prima la casella grande finiva nel prompt e
   * il resto si perdeva: ritrovandolo, durata e modello tornavano quelli di
   * serie senza dire niente.
   */
  async function salvaComePrompt(tipo) {
    var testo = "";
    var campi = {};
    for (var c of $("modulo").querySelectorAll("[data-campo]")) {
      if (c.dataset.principale) { testo = c.value.trim(); continue; }
      var v = c.type === "checkbox" ? (c.checked ? "si" : "") : String(c.value || "").trim();
      if (v) campi[c.dataset.campo] = v;
    }
    if (!testo) {
      avvisaAzione("Scrivi prima cosa vuoi: e' quello che verrebbe salvato.", true);
      return;
    }
    var nome = window.prompt("Come lo chiami?", testo.slice(0, 40));
    if (!nome) return;
    try {
      await chiama("/stili", {
        method: "POST",
        body: JSON.stringify({
          nome: nome.trim(),
          testo: testo,
          tipo: tipo,
          genere: "prompt",
          campi: campi,
        }),
      });
      await leggiStili();
      // Il modulo si ridisegna perche' la riga dei prompt e' dentro di lui: senza,
      // quello appena salvato comparirebbe solo cambiando scheda e tornando.
      scegli(scelta);
      avvisaAzione("Salvato. Lo ritrovi qui e nella scheda Stili.", false);
    } catch (e) {
      avvisaAzione(e.message, true);
    }
  }

  function scegli(a) {
    scelta = a;
    var modulo = $("modulo");
    modulo.innerHTML = "";
    /**
     * ⚠ **Il modulo di prima si porta via anche quello che aveva da preparare.**
     *
     * «primaDiMandare» e «quandoCambiaUnCampo» sono elenchi di funzioni che i
     * campi ci lasciano dentro mentre si disegnano. Svuotare il modulo toglie
     * le caselle ma non loro: senza queste due righe, aprire la modifica,
     * tornare indietro e riaprirla lasciava in giro il pennello di prima —
     * che al momento di mandare caricava sul computer una maschera vecchia,
     * disegnata su una foto che non c'e' piu'.
     */
    primaDiMandare = [];
    quandoCambiaUnCampo = [];

    var spiega = document.createElement("p");
    spiega.className = "sotto";
    spiega.style.marginTop = "16px";
    spiega.textContent = a.descrizione;
    modulo.append(spiega);

    // I prompt salvati per questa scheda: si toccano e il modulo si riempie.
    // Stanno sul computer, quindi ci sono anche qui — ed e' l'unica riga: fino
    // alla 1.2.2 ce n'erano due, che leggevano due magazzini diversi.
    modulo.append(rigaPrompt(a));

    for (var campo of a.campi) {
      var etichetta = document.createElement("label");
      etichetta.htmlFor = "campo-" + campo.nome;
      etichetta.textContent = campo.etichetta + (campo.obbligatorio ? " *" : "");
      modulo.append(etichetta);

      var controllo;
      var accanto = null;

      if (campo.tipo === "immagine") {
        /**
         * ⚠ **La maschera non ha un controllo suo.**
         *
         * E' un campo dell'azione — ci viaggia dentro un id come per la foto —
         * ma nessuno la sceglie: la dipinge il dito sopra alla foto. Quindi qui
         * si mette solo la casellina nascosta che porta il valore, e a
         * riempirla ci pensa il pennello.
         *
         * L'etichetta appena scritta sopra va tolta: una riga che dice «La zona
         * dipinta» sopra al niente fa cercare un controllo che non c'e'.
         */
        if (campo.nome === "maschera") {
          etichetta.remove();
          controllo = document.createElement("input");
          controllo.type = "hidden";
          controllo.id = "campo-" + campo.nome;
          controllo.dataset.campo = campo.nome;
          modulo.append(controllo);
          continue;
        }
        controllo = riquadroDellaFoto(campo, modulo);
      } else if (campo.tipo === "scelta") {
        /**
         * **Pastiglie, non un menu a tendina.**
         *
         * Chiesto il 26 agosto 2026: «anche i modelli voglio pulsanti». Un menu
         * a tendina su un telefono e' due tocchi e una schermata di sistema che
         * copre tutto; le pastiglie sono un tocco, e soprattutto **si vedono
         * tutte insieme** — quello che si puo' scegliere e' li', senza doverlo
         * andare a cercare.
         *
         * Il valore vero resta in un campo nascosto: e' quello che viaggia, ed
         * e' quello che il resto del codice si aspetta di trovare.
         */
        controllo = document.createElement("input");
        controllo.type = "hidden";
        /**
         * Il valore di partenza, in tre gradi.
         *
         * 1. **il predefinito del catalogo**, se c'e'. Dalla 0.9.1 i modelli ce
         *    l'hanno tutti, e con lui sparisce la pastiglia «quello scelto sul
         *    computer»: chi chiede da fuori non sa cosa c'e' selezionato di la',
         *    e quello che c'e' selezionato cambia sotto ai suoi piedi.
         * 2. **la prima scelta**, se il campo e' obbligatorio;
         * 3. **niente**, e allora compare la pastiglia del vuoto.
         */
        controllo.value = campo.predefinito !== undefined && campo.predefinito !== null
          ? String(campo.predefinito)
          : campo.obbligatorio ? (campo.scelte || [])[0] || "" : "";
        accanto = pastiglieDiScelta(campo, controllo);
      } else if (campo.tipo === "numero") {
        controllo = document.createElement("input");
        controllo.type = "number";
        controllo.inputMode = "numeric";
        if (campo.min !== undefined) controllo.min = campo.min;
        if (campo.max !== undefined) controllo.max = campo.max;
        if (campo.predefinito !== undefined) controllo.value = campo.predefinito;
        // Le durate che si scelgono davvero, come pulsanti: «30, 60, 80, 120 e
        // 220 secondi». La casella resta, per chi ne vuole 137.
        if ((campo.valoriTipici || []).length) accanto = pastiglieDiNumero(campo, controllo);
      } else if ((campo.maxLunghezza || 0) > 200) {
        controllo = document.createElement("textarea");
        if (campo.esempio) controllo.placeholder = campo.esempio;
        /**
         * **La casella cresce mentre scrivi.**
         *
         * Chiesto cosi': «le finestre mentre scrivi devono allungarsi, non
         * voglio piccole finestre di testo, voglio vedere bene». Il testo di una
         * canzone sono venti righe: scriverle dentro una finestrella da tre, su
         * un telefono, vuol dire non rileggere mai quello che si e' scritto.
         */
        faCrescere(controllo);
        // Le sezioni di un brano, da mettere dove sta il cursore.
        if ((campo.inserti || []).length) accanto = pastiglieDaInfilare(campo, controllo);
      } else {
        controllo = document.createElement("input");
        controllo.type = "text";
        if (campo.esempio) controllo.placeholder = campo.esempio;
      }
      controllo.id = "campo-" + campo.nome;
      controllo.dataset.campo = campo.nome;
      if (campo.principale) controllo.dataset.principale = "1";
      modulo.append(controllo);
      if (accanto) modulo.append(accanto);

      /**
       * ⚠ **Il tasto «Usa l'AI» non c'e' piu'.** Tolto nella 1.2.2.
       *
       * Chiesto il 7 settembre 2026: «il tasto usa le AI ha ancora quel
       * problema che avevo detto di togliere, e alla fine magari l'hai tolto
       * solo per una schermata». Aveva ragione su tutte e due le cose: c'era
       * ancora, ed era sopravvissuto in due punti diversi — qui e nel menu di
       * una richiesta ferma — proprio perche' era stato tolto **da uno solo**.
       *
       * Era un'eventualita', non una funzione decisa: si toglie adesso e si
       * rifa' piu' avanti, nel redesign di tutta la parte AI. Le rotte del
       * gateway restano dove sono — «/ai/migliora» e «/richieste/:id/migliora»
       * rispondono ancora — quindi rimetterlo vorra' dire riattaccare un
       * bottone, non riscrivere un meccanismo.
       */

      if (campo.descrizione) {
        var nota = document.createElement("div");
        nota.className = "nota";
        nota.style.marginTop = "5px";
        nota.textContent = campo.descrizione;
        modulo.append(nota);
      }
    }

    modulo.hidden = false;
    $("fila-manda").hidden = false;
    $("manda").textContent = a.coda ? "Mandalo al computer" : a.titolo;
    $("avviso-azione").textContent = "";
    $("avviso-azione").className = "avviso";
    modulo.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * Le pastiglie di una scelta: modelli, stili, lingue.
   *
   * Una sola accesa alla volta. Quella accesa si puo' **spegnere** ritoccando
   * «— tutte —», se il campo si puo' lasciare vuoto: senza, chi tocca per
   * sbaglio «Inglese» non ha piu' modo di tornare a «quella scelta sul
   * computer».
   */
  function pastiglieDiScelta(campo, nascosto) {
    var fila = document.createElement("div");
    fila.className = "filtri";
    fila.style.marginTop = "6px";

    var tutte = [];
    var accendi = function (quale) {
      nascosto.value = quale;
      for (var b of tutte) b.classList.toggle("on", b.dataset.valore === quale);
      /**
       * ⚠ **Chi cambia una pastiglia lo dice al modulo.**
       *
       * La casella nascosta cambia da sola, e chi guarda un campo che non e' il
       * suo non ha modo di accorgersene: la domanda sulla zona dipinta, per
       * esempio, si spegne quando si sceglie LLaDA — vedi «senzaZona» nel
       * catalogo — e senza questo avviso resterebbe accesa a offrire un
       * pennello che quel modello non sa tenere in mano.
       *
       * L'evento sale (\«bubbles\»), cosi' basta un ascoltatore sul modulo
       * invece di uno per ogni campo che vuole saperlo.
       */
      nascosto.dispatchEvent(new Event("change", { bubbles: true }));
      /**
       * Uno stile riempie la casella che **e'** la richiesta.
       *
       * E' il motivo per cui gli stili esistono: chi non sa che «neapolitan
       * neomelodic pop, melodic trap» e' la frase giusta non deve impararla,
       * deve poterla toccare. Il testo arriva insieme al nome (vedi
       * elencoAzioni nel gateway), quindi non serve un secondo giro di rete.
       */
      if ((campo.nome === "stile" || campo.nome === "stileCopertina") &&
          campo.testi && (campo.testi[quale] || !quale)) {
        // Di suo lo stile riempie il campo principale; «riempie» dice quale
        // altro, e dalla 0.9.1 lo usa lo stile della copertina di un brano.
        var principale = campo.riempie
          ? document.querySelector('#modulo [data-campo="' + campo.riempie + '"]')
          : document.querySelector("#modulo [data-principale]");
        // Tornando a «scrivo io» c'e' solo da togliere: la casella del brano
        // invece si lascia com'e', perche' li' lo stile **e'** la richiesta e
        // svuotarla vorrebbe dire cancellare quello che si sta per chiedere.
        if (principale && !quale && principale.dataset.campo === "descrizione") principale = null;
        if (principale) {
          /**
           * **Nel brano lo stile sostituisce, nelle altre due si aggiunge.**
           *
           * Dalla 0.7.8 gli stili sono tre — immagini, video, musica — e il
           * gesto non puo' essere lo stesso, perche' la casella principale non
           * dice la stessa cosa: «che genere» di un brano **e'** lo stile, e
           * riscriverla e' quello che si vuole; «cosa deve esserci» di una foto
           * e' il soggetto, e riscriverlo con «photorealistic, 35mm» vorrebbe
           * dire buttare via quello che hai appena scritto.
           */
          var testo = campo.testi[quale] || "";
          if (principale.dataset.campo === "descrizione") {
            principale.value = testo;
          } else {
            // Si toglie lo stile di prima, se ce n'era uno: cambiare idea due
            // volte non deve lasciare due code appiccicate al soggetto.
            var pulito = principale.value;
            for (var altro in campo.testi) {
              if (!campo.testi[altro]) continue;
              pulito = pulito.split(", " + campo.testi[altro]).join("");
              pulito = pulito.split(campo.testi[altro]).join("");
            }
            pulito = pulito.replace(/^[\\s,]+|[\\s,]+$/g, "");
            principale.value = pulito ? pulito + ", " + testo : testo;
          }
          principale.dispatchEvent(new Event("input"));
        }
      }
    };

    /**
     * La pastiglia del vuoto c'e' **solo se non c'e' un predefinito**.
     *
     * Un campo con un predefinito ha gia' una risposta: aggiungerci «— quello
     * scelto sul computer —» vorrebbe dire offrire una seconda risposta che
     * dice «non lo so», e su un telefono e' la scelta sbagliata a una domanda
     * che ne ha una giusta.
     */
    var haUnPredefinito = campo.predefinito !== undefined && campo.predefinito !== null && campo.predefinito !== "";
    if (!campo.obbligatorio && !haUnPredefinito) {
      var niente = document.createElement("button");
      niente.type = "button";
      niente.className = "mini" + (nascosto.value === "" ? " on" : "");
      niente.dataset.valore = "";
      niente.textContent = campo.vuoto || "\\u2014 tutte \\u2014";
      niente.addEventListener("click", function () { accendi(""); });
      tutte.push(niente);
      fila.append(niente);
    }

    for (var opt of (campo.scelte || [])) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (nascosto.value === opt ? " on" : "");
      b.dataset.valore = opt;
      // Il nome per una persona se il catalogo ce l'ha: «anima2» non vuol dire
      // niente a chi lo legge una volta sola, «Anima v2» si'.
      b.textContent = (campo.etichette && campo.etichette[opt]) || opt;
      /**
       * **Tenendo premuto, dice che effetto fa.**
       *
       * Chiesto il 5 settembre 2026: «se tengo premuto re maggiore mi dice che
       * effetto fa». Una tonalita' o un tempo sono parole che chi fa musica
       * capisce e chi vuole una canzone no: ventiquattro pastiglie di sigle
       * sono ventiquattro scelte fatte a caso.
       *
       * Il gesto e' lo stesso su tutte e due le strade: tenere premuto col dito,
       * e il tasto destro col mouse. Il posto in cui si legge e' la riga sotto
       * al modulo, che e' dove questa pagina parla a chi la usa.
       */
      if (campo.spiegazioni && campo.spiegazioni[opt]) {
        var dice = (function (quale) {
          return function (ev) {
            if (ev) ev.preventDefault();
            avvisaAzione(
              (campo.etichette && campo.etichette[quale] ? campo.etichette[quale] + ": " : "") +
                campo.spiegazioni[quale],
              false,
            );
          };
        })(opt);
        b.addEventListener("contextmenu", dice);
        var timer = null;
        b.addEventListener("touchstart", function () {
          timer = setTimeout(function () { dice(null); timer = null; }, 450);
        }, { passive: true });
        var basta = function () { if (timer) { clearTimeout(timer); timer = null; } };
        b.addEventListener("touchend", basta, { passive: true });
        b.addEventListener("touchmove", basta, { passive: true });
        b.addEventListener("touchcancel", basta, { passive: true });
      }
      b.addEventListener("click", (function (quale) {
        return function () { accendi(quale); };
      })(opt));
      tutte.push(b);
      fila.append(b);
    }
    return fila;
  }

  /** I numeri che si scelgono davvero: 30, 60, 80, 120, 220 secondi. */
  function pastiglieDiNumero(campo, casella) {
    var fila = document.createElement("div");
    fila.className = "filtri";
    fila.style.marginTop = "6px";

    var tutte = [];
    var accendi = function () {
      for (var b of tutte) b.classList.toggle("on", b.dataset.valore === String(casella.value));
    };

    for (var n of campo.valoriTipici) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini";
      b.dataset.valore = String(n);
      b.textContent = campo.nome === "secondi" ? etichettaSecondi(n) : String(n);
      b.addEventListener("click", (function (quale) {
        return function () { casella.value = quale; accendi(); };
      })(n));
      tutte.push(b);
      fila.append(b);
    }
    casella.addEventListener("input", accendi);
    accendi();
    return fila;
  }

  /** «80 s» sotto il minuto e mezzo, «2:00» sopra: si legge meglio. */
  function etichettaSecondi(n) {
    if (n < 90) return n + " s";
    var m = Math.floor(n / 60);
    var r = n % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  /**
   * Le istruzioni di sezione, da infilare dove sta il cursore.
   *
   * Chiesto il 26 agosto 2026: «tutte le istruzioni tra le quadre come intro,
   * verse ecc devono funzionare anche su Android». Sul computer c'era una fila
   * di pastiglie; dal telefono bisognava sapere che esistevano e scriverle a
   * mano con le parentesi giuste — cioe' non le usava nessuno.
   */
  function pastiglieDaInfilare(campo, casella) {
    var fila = document.createElement("div");
    fila.className = "filtri";
    fila.style.marginTop = "6px";

    for (var t of campo.inserti) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini";
      b.textContent = t;
      b.addEventListener("click", (function (quale) {
        return function () { infilaAlCursore(casella, quale); };
      })(t));
      fila.append(b);
    }
    return fila;
  }

  /**
   * Mette un pezzo di testo dove sta il cursore, e ci va a capo intorno.
   *
   * Una sezione va su una riga sua: infilarla in mezzo a una frase darebbe
   * «sotto le [Chorus] stelle», che il modello musicale legge come testo e non
   * come sezione.
   */
  function infilaAlCursore(casella, pezzo) {
    var da = casella.selectionStart || 0;
    var a = casella.selectionEnd || 0;
    var prima = casella.value.slice(0, da);
    var dopo = casella.value.slice(a);
    var aCapoPrima = prima && !prima.endsWith("\\n") ? "\\n" : "";
    var aCapoDopo = dopo && !dopo.startsWith("\\n") ? "\\n" : "\\n";
    casella.value = prima + aCapoPrima + pezzo + aCapoDopo + dopo;
    var dove = (prima + aCapoPrima + pezzo + aCapoDopo).length;
    casella.focus();
    casella.setSelectionRange(dove, dove);
    casella.dispatchEvent(new Event("input"));
  }

  /**
   * Una casella di testo che si allunga mentre scrivi.
   *
   * Si azzera l'altezza e la si rimette a scrollHeight: e' l'unico modo che
   * funziona anche quando si **cancella** testo — senza l'azzeramento la casella
   * cresce e non torna piu' indietro.
   */
  function faCrescere(casella) {
    var adatta = function () {
      casella.style.height = "auto";
      // Un tetto c'e', e serve: una casella alta quanto tre schermi non si
      // scorre piu', e il tasto «manda» finisce in un altro fuso orario.
      casella.style.height = Math.min(casella.scrollHeight + 2, 460) + "px";
    };
    casella.addEventListener("input", adatta);
    // Anche adesso: il modulo puo' nascere con dentro qualcosa (un prompt, una
    // richiesta da riscrivere), e in quel caso deve nascere gia' alto.
    setTimeout(adatta, 0);
  }

  /*
   * ⚠ **Qui sotto c'erano <rigaPreset>, <rigaSalvaPreset> e <leggiPreset>.**
   *
   * Erano la gemella vecchia della riga dei prompt: stesso titolo «I tuoi
   * prompt», stessa schermata, altro magazzino — <preset.json> invece degli
   * stili. Chi salvava col tasto di sotto non si ritrovava niente nell'elenco
   * di sopra, e viceversa. Tolte nella 1.2.3 insieme alle rotte di prima:
   * quello che facevano lo fa <rigaPrompt>, che sta piu' su, e il travaso di
   * quello che c'era dentro sta in <apps/shell/src/main/travaso-preset.ts>.
   */

  function chiudiModulo() {
    scelta = null;
    $("modulo").hidden = true;
    $("modulo").innerHTML = "";
    // Il modulo se n'e' andato: quello che aveva da preparare non esiste piu'.
    // Senza questa riga, il pennello di un modulo chiuso resterebbe iscritto e
    // il prossimo invio andrebbe a cercare una tela che non c'e'.
    primaDiMandare = [];
    quandoCambiaUnCampo = [];
    $("fila-manda").hidden = true;
  }

  /* --------------------------------------------- la foto da modificare */

  /**
   * ⚠ **Le cose da fare prima di mandare la richiesta.**
   *
   * Ce n'e' una sola per ora — caricare la maschera dipinta — e sta in un
   * elenco invece che dentro «manda» per una ragione: «manda» non deve sapere
   * che esiste un pennello. Un campo che ha bisogno di preparare qualcosa si
   * iscrive qui, e chi manda aspetta tutti senza chiedersi chi sono.
   */
  var primaDiMandare = [];

  /**
   * Chi vuole sapere che **un altro campo** e' cambiato.
   *
   * Stessa idea di «primaDiMandare», per l'altra meta' del problema: la
   * domanda sulla zona dipinta deve reagire al modello scelto, e i due campi
   * non si conoscono — quando il riquadro della foto si disegna, le pastiglie
   * dei modelli non esistono ancora. Chi ha bisogno di guardare si iscrive
   * qui, e un solo ascoltatore sul modulo li chiama tutti.
   */
  var quandoCambiaUnCampo = [];

  /**
   * L'ascoltatore, montato una volta sola sul modulo.
   *
   * Il modulo si svuota a ogni azione scelta ma **resta lo stesso elemento**:
   * montarlo dentro chi disegna un campo vorrebbe dire un ascoltatore in piu'
   * a ogni apertura, e dopo dieci giri lo stesso cambio verrebbe raccontato
   * dieci volte.
   */
  function ascoltaIlModulo() {
    var modulo = $("modulo");
    if (modulo.dataset.ascolta) return;
    modulo.dataset.ascolta = "1";
    modulo.addEventListener("change", function (ev) {
      var quale = ev.target && ev.target.dataset ? ev.target.dataset.campo : null;
      if (!quale) return;
      for (var f of quandoCambiaUnCampo) f(quale);
    });
  }

  /**
   * ⚠ **Quanto grande arriva al motore.** Chiesto il 6 settembre 2026:
   * «facciamo attenzione alle risoluzioni massime di input e output; in caso di
   * input troppo grande in app facciamo un rapido aggiusto e possiamo
   * procedere».
   *
   * Mille e ventiquattro sul lato lungo, e non e' un numero tondo a caso: e' la
   * misura su cui questi modelli sono stati addestrati e quella che entra in
   * una scheda da 8 GB. Una foto fatta col telefono ne fa quattromila: mandarla
   * intera vorrebbe dire aspettare il caricamento di dodici mega **e poi**
   * vedersela rimpicciolire dal motore.
   *
   * E si arrotonda a multipli di 32 perche' e' quello che vogliono tutti: FLUX
   * e Anima lavorano a multipli di 8 o 16, e LLaDA, modificando, pretende 32.
   * Prendere il piu' esigente vuol dire non doversene ricordare mai piu'.
   */
  var LATO_MASSIMO = 1024;
  var PASSO = 32;

  function misuraGiusta(l, a) {
    var scala = Math.min(1, LATO_MASSIMO / Math.max(l, a));
    var largo = Math.max(PASSO, Math.round((l * scala) / PASSO) * PASSO);
    var alto = Math.max(PASSO, Math.round((a * scala) / PASSO) * PASSO);
    return { largo: largo, alto: alto };
  }

  /**
   * Rimpicciolisce se serve, e torna la tela con dentro la foto.
   *
   * Torna **sempre** una tela, anche quando la foto era gia' piccola: cosi' chi
   * la usa non ha due strade da tenere in piedi, e il pennello disegna sempre
   * sulle stesse coordinate.
   */
  function suUnaTela(immagine) {
    var m = misuraGiusta(immagine.naturalWidth, immagine.naturalHeight);
    var tela = document.createElement("canvas");
    tela.width = m.largo;
    tela.height = m.alto;
    tela.getContext("2d").drawImage(immagine, 0, 0, m.largo, m.alto);
    return tela;
  }

  function caricaImmagine(sorgente) {
    return new Promise(function (risolvi, rifiuta) {
      var im = new Image();
      im.onload = function () { risolvi(im); };
      im.onerror = function () { rifiuta(new Error("Non riesco ad aprire questa immagine.")); };
      im.src = sorgente;
    });
  }

  function telaInBlob(tela) {
    return new Promise(function (risolvi) {
      tela.toBlob(function (b) { risolvi(b); }, "image/png");
    });
  }

  /** Manda un PNG al computer e torna l'id con cui lo ritrovera'. */
  async function caricaSulComputer(blob, che) {
    var esito = await chiama("/sorgente?che=" + che, {
      method: "POST",
      body: blob,
      tipo: "image/png",
    });
    return esito.id;
  }

  /**
   * Il riquadro della foto: sceglila, guardala, dipingici sopra.
   *
   * Torna la casellina nascosta che porta l'id, perche' e' quello che «manda»
   * si aspetta di trovare. Tutto il resto — l'anteprima, i tasti, la tela del
   * pennello — sta nel riquadro sopra.
   */
  function riquadroDellaFoto(campo, modulo) {
    var valore = document.createElement("input");
    valore.type = "hidden";

    var scatola = document.createElement("div");
    scatola.className = "fotoDaModificare";

    var vuoto = document.createElement("p");
    vuoto.className = "nota";
    /**
     * ⚠ **Le due strade si dicono prima, non dopo.** Chiesto il 6 settembre
     * 2026: «devi poter scegliere — o una foto tra quelle generate, o caricare
     * un file dalla galleria del telefono».
     *
     * C'erano gia' tutte e due, ed e' proprio il punto: erano due tastini
     * sotto a una riga che diceva «scegli una foto», e chi apriva la modifica
     * leggeva quella riga come un'istruzione senza vedere **dove** si sceglie.
     * Adesso la riga dice che le strade sono due e i due tasti le ripetono con
     * le stesse parole.
     */
    vuoto.textContent = "Da dove parti? Una foto che hai gia' fatto, una dalla galleria, o scattala adesso.";
    scatola.append(vuoto);

    // La foto sotto e il disegno sopra, sovrapposti. Due tele e non una perche'
    // il disegno si deve poter cancellare senza ricaricare la foto.
    var pila = document.createElement("div");
    pila.className = "pilaFoto";
    pila.hidden = true;
    var sotto = document.createElement("canvas");
    var sopra = document.createElement("canvas");
    sopra.className = "ilPennello";
    pila.append(sotto, sopra);
    scatola.append(pila);

    var tasti = document.createElement("div");
    tasti.className = "fila";
    var dalleMie = document.createElement("button");
    dalleMie.type = "button";
    dalleMie.className = "mini";
    dalleMie.textContent = "▦ Una foto che hai fatto";
    var dalTelefono = document.createElement("button");
    dalTelefono.type = "button";
    dalTelefono.className = "mini";
    dalTelefono.textContent = "↑ Dalla galleria del telefono";
    var pulisci = document.createElement("button");
    pulisci.type = "button";
    pulisci.className = "mini";
    pulisci.textContent = "↺ Cancella il disegno";
    pulisci.hidden = true;
    /**
     * ⚠ **La terza strada: scattarla adesso.** Nuova nella 1.0.6.
     *
     * Chiesto il 7 settembre 2026: «oltre a caricare un'immagine dalla galleria
     * del telefono, facciamo che posso anche scattare una foto al volo dalla
     * camera».
     *
     * E' un secondo «<input type="file">» e non un tasto diverso, ed e' il
     * punto: cambia solo «capture», e da li' in poi la foto fa la stessa strada
     * delle altre due — rimpicciolita a 1024, allineata a 32, caricata sul
     * computer. Una strada sola per arrivare al motore, tre modi di imboccarla.
     *
     * «capture» lo capiscono il telefono e l'app (vedi «onShowFileChooser» in
     * MainActivity.kt, dove l'intento della fotocamera lo costruiamo noi
     * perche' Android non lo mette). Su un computer il tasto non compare: non
     * c'e' niente da inquadrare.
     */
    var scattaOra = document.createElement("button");
    scattaOra.type = "button";
    scattaOra.className = "mini";
    scattaOra.textContent = "◉ Scattala adesso";
    var scattaFile = document.createElement("input");
    scattaFile.type = "file";
    scattaFile.accept = "image/" + "*";
    /*
     * ⚠ **«setAttribute», non «scattaFile.capture = ...».** La proprieta' non
     * la riflettono tutti i motori: dove non la conoscono si scrive un campo
     * qualunque sull'oggetto e l'attributo non compare — provato nel banco,
     * dove «input[capture]» non trovava niente. Ad Android arriva l'attributo,
     * non la proprieta': senza, «isCaptureEnabled» e' falso e la fotocamera non
     * si apre mai.
     */
    scattaFile.setAttribute("capture", "environment");
    scattaFile.hidden = true;
    if (!suTelefono()) scattaOra.hidden = true;

    var scegliFile = document.createElement("input");
    scegliFile.type = "file";
    /*
     * ⚠ **Spezzato in due, e non e' un vezzo.**
     *
     * Scritto tutto attaccato, dentro questa stringa ci sono i due caratteri
     * che **aprono un commento**. Il file lo compila lo stesso — per
     * JavaScript e' una stringa e basta — ma qualunque cosa legga il copione
     * da fuori senza eseguirlo si convince che da qui comincia un commento, e
     * da li' in poi legge tutto sfasato.
     *
     * Non e' teoria: le prove della console fanno esattamente quello, e la
     * prima volta hanno accusato una riga a quarantamila caratteri di distanza.
     */
    scegliFile.accept = "image/" + "*";
    scegliFile.hidden = true;
    tasti.append(dalleMie, dalTelefono, scattaOra, scegliFile, scattaFile);
    scatola.append(tasti);

    var dice = document.createElement("div");
    dice.className = "nota";
    scatola.append(dice);

    /* ------------------------------------------- la domanda sulla zona */

    /**
     * ⚠ **«Tutta la foto» o «una zona»: si sceglie, non si indovina.**
     * Chiesto il 6 settembre 2026: «poi c'e' la questione se vuoi selezionare
     * una zona o no».
     *
     * Prima la risposta era **quello che facevi col dito**: se dipingevi
     * qualcosa era una zona, se non dipingevi niente era tutta la foto. Regola
     * giusta e invisibile — chi non sapeva di poter dipingere non lo scopriva,
     * e chi sfiorava la foto scorrendo la pagina si trovava una zona che non
     * aveva chiesto.
     *
     * Adesso la domanda si vede e ha due risposte. Il pennello compare solo
     * dopo la seconda, e la prima resta quella di partenza: cambiare tutta la
     * foto e' quello che fa la maggior parte delle volte chi tocca «Modifica».
     */
    var domandaZona = document.createElement("p");
    domandaZona.className = "nota";
    domandaZona.style.marginTop = "10px";
    domandaZona.textContent = "Cosa cambio?";

    var sceltaZona = document.createElement("div");
    sceltaZona.className = "filtri";

    var tuttaLaFoto = document.createElement("button");
    tuttaLaFoto.type = "button";
    tuttaLaFoto.className = "mini on";
    tuttaLaFoto.textContent = "Tutta la foto";

    var unaZona = document.createElement("button");
    unaZona.type = "button";
    unaZona.className = "mini";
    unaZona.textContent = "Solo una zona, la dipingo io";

    sceltaZona.append(tuttaLaFoto, unaZona, pulisci);

    var perche = document.createElement("div");
    perche.className = "nota";

    var laZona = document.createElement("div");
    laZona.hidden = true;
    laZona.append(domandaZona, sceltaZona, perche);
    scatola.append(laZona);

    modulo.append(scatola);

    var telaFoto = null;
    var comeZona = "tutta";

    /** Il modello scelto adesso sa usare una zona dipinta? Vedi «senzaZona». */
    function laZonaSiPuo() {
      var casella = modulo.querySelector('[data-campo="modello"]');
      if (!casella) return true;
      var suo = null;
      for (var c of ((scelta || {}).campi || [])) if (c.nome === "modello") suo = c;
      var mai = (suo && suo.senzaZona) || [];
      return mai.indexOf(casella.value) < 0;
    }

    function mettiZona(quale) {
      comeZona = quale;
      tuttaLaFoto.classList.toggle("on", quale === "tutta");
      unaZona.classList.toggle("on", quale === "zona");
      // Il pennello non si nasconde e basta: si toglie di mezzo. Una tela
      // trasparente sopra alla foto si prende i tocchi anche quando non deve.
      sopra.style.pointerEvents = quale === "zona" ? "auto" : "none";
      sopra.style.opacity = quale === "zona" ? "1" : "0";
      pulisci.hidden = quale !== "zona";
      if (quale === "tutta") {
        sopra.getContext("2d").clearRect(0, 0, sopra.width, sopra.height);
        haDipinto = false;
      }
    }

    /**
     * Guarda il modello e, se non sa tenere il pennello, chiude la domanda.
     *
     * Non la nasconde: la **spiega**. Chi ha appena dipinto una zona e sceglie
     * LLaDA deve vedere perche' il suo disegno e' sparito, altrimenti la
     * prossima volta lo rifa'.
     */
    function guardaIlModello() {
      var si = laZonaSiPuo();
      unaZona.disabled = !si;
      if (!si && comeZona === "zona") {
        mettiZona("tutta");
        avvisa("Questo modello guarda tutta la foto: la zona l\\u0027ho tolta.");
      }
      perche.textContent = si
        ? ""
        : "Questo modello non dipinge una zona: guarda tutta la foto e fa quello che gli dici.";
    }

    ascoltaIlModulo();
    quandoCambiaUnCampo.push(function (quale) {
      if (quale === "modello") guardaIlModello();
    });

    tuttaLaFoto.addEventListener("click", function () { mettiZona("tutta"); });
    unaZona.addEventListener("click", function () {
      mettiZona("zona");
      avvisa("Dipingi col dito la zona da cambiare.");
    });

    /* ------------------------------------------------ mettere la foto */

    /**
     * ⚠ **La foto in arrivo, finche' non e' arrivata.** Nuovo nella 1.2.1.
     *
     * Il difetto, detto il 7 settembre 2026: «in produzione foto se scatto la
     * foto funziona, ma se carico dalla galleria dice che manca l'immagine; a
     * volte va, a volte no».
     *
     * «A volte» era la firma di una corsa. Mettere una foto sono due tempi —
     * disegnarla sulla tela, poi mandarla al computer — e la casellina che
     * porta l'id si riempie **alla fine del secondo**. In mezzo la foto si
     * vede, quindi sembra tutto pronto: chi tocca «Fai» in quel momento manda
     * un modulo con la casella vuota, e il computer risponde l'unica cosa che
     * puo' rispondere, cioe' che l'immagine manca.
     *
     * Dalla galleria capitava e dalla fotocamera no per una ragione banale: una
     * foto della galleria e' gia' li' e compare subito, una appena scattata
     * arriva dopo che si e' inquadrato, messo a fuoco e premuto — e in quei
     * secondi il caricamento era gia' finito.
     *
     * La cura sono due righe qui e una in «primaDiMandare»: si tiene la
     * promessa del caricamento, e prima di mandare la si aspetta.
     */
    var stoCaricando = null;

    async function metti(sorgente, comeSiChiama) {
      dice.textContent = "La preparo…";
      // La foto di prima non vale piu' da adesso: se questa non arriva in
      // fondo, mandare quella vecchia sarebbe peggio che non mandare niente.
      valore.value = "";
      try {
        var im = await caricaImmagine(sorgente);
        var quantera = im.naturalWidth + "×" + im.naturalHeight;
        telaFoto = suUnaTela(im);

        sotto.width = telaFoto.width;
        sotto.height = telaFoto.height;
        sotto.getContext("2d").drawImage(telaFoto, 0, 0);
        sopra.width = telaFoto.width;
        sopra.height = telaFoto.height;
        sopra.getContext("2d").clearRect(0, 0, sopra.width, sopra.height);

        pila.hidden = false;
        vuoto.hidden = true;
        // La foto c'e': adesso ha senso chiedere cosa cambiarne, e la risposta
        // riparte da «tutta» anche se sulla foto di prima si era dipinto.
        laZona.hidden = false;
        mettiZona("tutta");
        guardaIlModello();

        dice.textContent = "La carico… (aspetta un attimo prima di mandare)";
        stoCaricando = caricaSulComputer(await telaInBlob(telaFoto), "sorgente");
        var id = await stoCaricando;
        stoCaricando = null;
        valore.value = id;

        var adesso = telaFoto.width + "×" + telaFoto.height;
        dice.textContent =
          comeSiChiama +
          (quantera === adesso
            ? " · " + adesso
            : " · era " + quantera + ", l'ho portata a " + adesso);
      } catch (e) {
        stoCaricando = null;
        valore.value = "";
        /**
         * ⚠ **Il motivo resta scritto, non passa.** Un avviso che se ne va da
         * solo dopo cinque secondi e una foto che si vede lo stesso sulla tela
         * sono, messi insieme, un modo di far credere che sia andata bene. Qui
         * la riga sotto ai tasti dice cos'e' successo e resta li' finche' non
         * si riprova.
         */
        dice.textContent = "Non ce l'ho fatta: " + (e.message || e) + " — riprova a sceglierla.";
        avvisa(e.message, "male");
      }
    }

    /**
     * Le due caselle dei file si comportano uguale: cambia solo chi le apre.
     *
     * ⚠ **Un indirizzo temporaneo, non un data-URL.** Cambiato nella 1.2.1
     * insieme alla corsa qui sopra, ed e' l'altra meta' di «a volte va, a volte
     * no». «readAsDataURL» trasforma il file in una stringa **un terzo piu'
     * grande del file**, e una foto di un telefono moderno ne fa una da quindici
     * milioni di caratteri: dentro una WebView, che ha la memoria che ha, quella
     * stringa a volte non si alloca — e «onload» non arriva mai, senza un
     * errore, senza niente. «createObjectURL» non copia niente: e' un indirizzo
     * che punta al file dov'e' gia'.
     */
    function daUnaCasella(casella, comeSiChiama) {
      var f = casella.files && casella.files[0];
      if (!f) return;
      var indirizzo = URL.createObjectURL(f);
      // Si libera **dopo** che l'ha usata: revocarlo subito vorrebbe dire
      // togliere il file da sotto i piedi a chi lo sta ancora disegnando.
      void metti(indirizzo, comeSiChiama || f.name).then(function () {
        URL.revokeObjectURL(indirizzo);
      });
      casella.value = "";
    }

    dalTelefono.addEventListener("click", function () { scegliFile.click(); });
    scegliFile.addEventListener("change", function () { daUnaCasella(scegliFile); });

    scattaOra.addEventListener("click", function () { scattaFile.click(); });
    // Il nome di un file appena scattato e' una data con dentro dei numeri:
    // «appena scattata» dice quello che c'e' da sapere.
    scattaFile.addEventListener("change", function () { daUnaCasella(scattaFile, "appena scattata"); });

    dalleMie.addEventListener("click", function () { void apriLeMieFoto(metti); });

    /* --------------------------------------------------- il pennello */

    /**
     * ⚠ **Si dipinge di rosso**, e non e' una scelta di gusto: i grafi leggono
     * la maschera col nodo «LoadImageMask» sul **canale rosso**. Quello che e'
     * rosso si rifa'. Vedi «ritoccoAnima» in apps/foto/src/grafi.js.
     */
    var disegnando = false;
    var haDipinto = false;

    function dove(ev) {
      var r = sopra.getBoundingClientRect();
      return {
        x: ((ev.clientX - r.left) / r.width) * sopra.width,
        y: ((ev.clientY - r.top) / r.height) * sopra.height,
      };
    }

    function segna(ev) {
      var c = sopra.getContext("2d");
      var q = dove(ev);
      c.fillStyle = "#ff2d2d";
      c.beginPath();
      // Il pennello grosso come un dito, non come un cursore: un raggio in
      // pixel fissi su una foto piccola dipinge mezza immagine, su una grande
      // non si vede. Si tiene proporzionato al lato lungo.
      c.arc(q.x, q.y, Math.max(10, sopra.width / 22), 0, Math.PI * 2);
      c.fill();
      haDipinto = true;
    }

    sopra.addEventListener("pointerdown", function (ev) {
      disegnando = true;
      /*
       * ⚠ **Prendere il dito puo' fallire, e non deve portarsi via la
       * pennellata.**
       *
       * «setPointerCapture» serve a non perdere il dito quando esce dal bordo
       * della tela, ed e' un di piu': se il dito non c'e' piu' — o e' un tocco
       * che il browser non riconosce come attivo — solleva. Stando prima di
       * «segna», una sollevata li' vuol dire **niente dipinto**, e chi dipinge
       * vede il dito passare e non succedere niente.
       *
       * Trovato nel banco, dove i tocchi sono finti e la cattura fallisce
       * sempre: la prima pennellata contava zero pixel rossi.
       */
      try { sopra.setPointerCapture(ev.pointerId); } catch (e) { /* si dipinge lo stesso */ }
      segna(ev);
      ev.preventDefault();
    });
    sopra.addEventListener("pointermove", function (ev) {
      if (disegnando) { segna(ev); ev.preventDefault(); }
    });
    sopra.addEventListener("pointerup", function () { disegnando = false; });
    sopra.addEventListener("pointercancel", function () { disegnando = false; });

    pulisci.addEventListener("click", function () {
      sopra.getContext("2d").clearRect(0, 0, sopra.width, sopra.height);
      haDipinto = false;
      avvisa("Disegno cancellato: ridipingi la zona, o scegli «Tutta la foto».");
    });

    /* ------------------------------- la maschera, appena prima di mandare */

    /**
     * ⚠ **Niente dipinto vuol dire tutta la foto**, ed e' la richiesta:
     * «se non si seleziona la zona allora prende tutta l'immagine».
     *
     * Qui si traduce in **non mandare nessuna maschera**. Il grafo, senza,
     * salta i nodi che la userebbero e lavora sull'immagine intera. Mandare una
     * maschera tutta bianca darebbe lo stesso risultato e costerebbe un
     * caricamento in piu' e un nodo in piu' da sbagliare.
     */
    /**
     * ⚠ **Prima di mandare si aspetta la foto**, se sta ancora salendo.
     *
     * E' la seconda meta' della cura a «dice che manca l'immagine»: chi tocca
     * «Fai» mentre il caricamento e' a meta' non deve vedersi rispondere che
     * non c'e' niente — deve aspettare due secondi e partire. Se il
     * caricamento fallisce, l'errore esce **qui**, prima che la richiesta
     * nasca, ed e' il posto giusto per dirlo.
     */
    primaDiMandare.push(async function () {
      if (!stoCaricando) return;
      try {
        valore.value = await stoCaricando;
      } catch (e) {
        valore.value = "";
        throw new Error("La foto non e' arrivata al computer: " + (e.message || e));
      } finally {
        stoCaricando = null;
      }
    });

    primaDiMandare.push(async function () {
      // Nel modulo, non per id: gli id qui li costruisce un pezzo di codice
      // («campo-» piu' il nome), e cercarne uno scritto a mano vuol dire avere
      // due posti che devono restare d'accordo. Il campo lo si riconosce da
      // quello che e', non da come si chiama.
      var casella = modulo.querySelector('[data-campo="maschera"]');
      if (!casella) return;
      // «Tutta la foto» vuol dire nessuna maschera, e lo vuol dire anche quando
      // sotto c'e' un disegno vecchio: comanda la risposta data, non la tela.
      if (comeZona !== "zona" || !haDipinto || !telaFoto) { casella.value = ""; return; }

      // Il nodo del motore guarda il canale rosso su fondo nero: quello che qui
      // e' trasparente li' deve essere nero, non trasparente.
      var m = document.createElement("canvas");
      m.width = sopra.width;
      m.height = sopra.height;
      var c = m.getContext("2d");
      c.fillStyle = "#000000";
      c.fillRect(0, 0, m.width, m.height);
      c.drawImage(sopra, 0, 0);
      casella.value = await caricaSulComputer(await telaInBlob(m), "maschera");
    });

    return valore;
  }

  /**
   * Le foto che hai gia' fatto, per sceglierne una da modificare.
   *
   * ⚠ **Si riscarica e si ricarica**, anche se il file sta gia' sul computer
   * che poi la modifichera'. Sembra uno spreco ed e' la strada giusta: la foto
   * va comunque rimpicciolita a 1024 e allineata a 32 prima di andare al
   * motore, e quel lavoro lo fa la pagina. Facendo passare tutte e due le
   * strade — dalla galleria e dal telefono — per lo stesso punto, esiste **un**
   * modo in cui una foto arriva al motore invece di due.
   */
  async function apriLeMieFoto(metti) {
    var carta = apriFoglio("Le tue foto");
    var attesa = document.createElement("p");
    attesa.className = "nota";
    attesa.textContent = "Le cerco…";
    carta.append(attesa);
    try {
      var risposta = await chiama("/libreria?quanti=60&dove=mie&tipo=immagine");
      var voci = (risposta && risposta.voci) || [];
      attesa.remove();
      if (!voci.length) {
        var niente = document.createElement("p");
        niente.className = "nota";
        niente.textContent = "Non hai ancora nessuna foto. Prendine una dal telefono.";
        carta.append(niente);
        return;
      }
      var griglia = document.createElement("div");
      griglia.className = "quadri";
      for (var i = 0; i < voci.length; i++) {
        griglia.append(riquadroDaScegliere(voci[i], metti));
      }
      carta.append(griglia);
    } catch (e) {
      attesa.className = "avviso male";
      attesa.textContent = e.message;
    }
  }

  function riquadroDaScegliere(v, metti) {
    var q = document.createElement("button");
    q.type = "button";
    q.className = "vetro sceglibile";
    var im = document.createElement("img");
    im.loading = "lazy";
    im.src = "/libreria/anteprima/" + encodeURIComponent(v.id);
    im.alt = v.nome || "";
    q.append(im);
    q.addEventListener("click", function () {
      chiudiFoglio();
      void metti("/libreria/file/" + encodeURIComponent(v.id), v.nome || "questa");
    });
    return q;
  }

  async function manda() {
    if (!scelta) return;
    // Chi ha qualcosa da preparare lo prepara adesso: la maschera dipinta si
    // carica qui, non a ogni pennellata. Vedi «primaDiMandare».
    try {
      for (var quello of primaDiMandare) await quello();
    } catch (e) {
      $("avviso-azione").textContent = e.message;
      $("avviso-azione").className = "avviso male";
      return;
    }
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
        /**
         * ⚠ **Se ne sono nate piu' d'una, si dice.** Dalla 0.9.4 chiedere
         * quattro canzoni vuol dire **quattro richieste**, non una che ne
         * consegna quattro — vedi «eseguiAzione». Chi ha premuto una volta si
         * ritrova quattro righe in fila, e senza una parola sembra un errore.
         */
        if (esito.quante > 1) {
          avvisa(esito.quante + " lavori in fila: uno per ognuna.", "bene");
        }
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
   * Il meccanismo sta nello shell (\«chiacchierata.ts\»), e lì c'è scritto il
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
      attesaChiacchiera = (risposta && risposta.attesa) || null;
    } catch (e) { sessione = null; attesaChiacchiera = null; }
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
      sessione = risposta.sessione || null;
      attesaChiacchiera = risposta.attesa || null;
      avviso.textContent = "";
      disegnaChiacchierata();
      if (sessione) $("cosa-dico").focus();
      else guardaLaFilaDelParlare();
    } catch (e) {
      avviso.textContent = e.message;
      avviso.className = "avviso male";
    } finally {
      $("comincia-chiacchiera").disabled = false;
    }
  }

  /**
   * Mentre si aspetta il turno, si guarda ogni tre secondi.
   *
   * Non passa dallo stato vivo: quello racconta la suite, non la propria
   * posizione in una coda. Tre secondi sono abbastanza per vedere il numero
   * scendere, e abbastanza pochi da non far pensare che si sia piantato.
   */
  function guardaLaFilaDelParlare() {
    if (orologioFila) clearInterval(orologioFila);
    orologioFila = setInterval(function () {
      if (sessione || !attesaChiacchiera) {
        clearInterval(orologioFila);
        orologioFila = null;
        return;
      }
      leggiChiacchierata().catch(function () {});
    }, 3000);
  }

  /**
   * Esco dalla coda. **Chi esce libera la macchina**, non la occupa: non c'e'
   * niente da chiedere a nessuno, e infatti non si chiede.
   */
  async function esciDallaFilaDelParlare() {
    if (orologioFila) { clearInterval(orologioFila); orologioFila = null; }
    if (!attesaChiacchiera) return;
    attesaChiacchiera = null;
    disegnaChiacchierata();
    try {
      await chiama("/chiacchierata/attesa", { method: "DELETE" });
    } catch (e) { /* era gia' uscito: va bene lo stesso */ }
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

  /**
   * «Adesso fammi il piano».
   *
   * Il modello non risponde a niente: legge quello che vi siete detti e ne fa
   * dei lavori. Se non ci riesce lo dice, e si puo' ripremere dopo avergli
   * scritto una riga piu' chiara.
   */
  async function chiediIlPiano() {
    if (!sessione) return;
    var tasto = $("fai-il-piano");
    var avviso = $("avviso-chiacchiera");
    tasto.disabled = true;
    var prima = tasto.textContent;
    tasto.textContent = "ci sto pensando\u2026";
    avviso.className = "avviso";
    avviso.textContent = "";
    aspettaIlModello(true);
    try {
      var risposta = await chiama(
        "/chiacchierata/" + encodeURIComponent(sessione.id) + "/fai-piano",
        { method: "POST", body: JSON.stringify({}) },
      );
      sessione = risposta.sessione;
    } catch (e) {
      avviso.className = "avviso male";
      avviso.textContent = e.message;
    }
    aspettaIlModello(false);
    tasto.disabled = false;
    tasto.textContent = prima;
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
    var inFila = !viva && attesaChiacchiera;
    $("prima-di-parlare").hidden = Boolean(viva || inFila);
    $("mentre-si-parla").hidden = !viva;
    $("in-fila-per-parlare").hidden = !inFila;
    if (orologioChiacchiera) { clearInterval(orologioChiacchiera); orologioChiacchiera = null; }

    if (inFila) { disegnaLaFilaDelParlare(); return; }
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
   * Il posto in fila, mentre si aspetta di parlare.
   *
   * Tre informazioni e un tasto: dove sei, quanti siete, cosa sta succedendo, e
   * come uscire. Chi aspetta ha diritto a tutte e quattro — la 0.7.6 non gliene
   * dava nessuna, e da fuori sembrava che il tasto non avesse fatto niente.
   */
  function disegnaLaFilaDelParlare() {
    var a = attesaChiacchiera || {};
    if (a.errore) {
      // L'attesa e' finita male: si torna al tasto, con scritto perche'.
      attesaChiacchiera = null;
      $("prima-di-parlare").hidden = false;
      $("in-fila-per-parlare").hidden = true;
      $("avviso-chiacchiera").textContent = a.errore;
      $("avviso-chiacchiera").className = "avviso male";
      if (orologioFila) { clearInterval(orologioFila); orologioFila = null; }
      return;
    }
    var quale = $("posto-in-fila");
    var sotto = $("sotto-la-fila");
    if (a.sicarica || !a.posto) {
      quale.textContent = "\u2026";
      sotto.textContent = "Tocca a te: sto caricando il modello, ci vogliono dei secondi.";
    } else {
      quale.textContent = a.posto + "\u00ba";
      sotto.textContent = a.quanti > 1
        ? "in fila su " + a.quanti + ". Appena il computer si libera, tocca a te."
        : "in fila. Il computer sta finendo una cosa: appena ha finito, tocca a te.";
    }
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
    var modelliDelPiano = {};
    sessione.piano.lavori.forEach(function (l, i) {
      // Un div, non una label: dentro ci sono le pastiglie del modello, e
      // dentro una label ogni tocco su una pastiglia spegnerebbe la spunta.
      var riga = document.createElement("div");
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
      come.textContent = riassuntoDelLavoro(l);
      testi.append(che, come);
      /**
       * **Con che modello generarlo, deciso adesso.**
       *
       * Chiesto il 26 agosto 2026: «quando parlo con llm devo poter scegliere
       * poi che modello usare una volta che il piano e' pronto». Ha ragione: il
       * modello che *genera* non e' quello che *scrive*, e la scelta ha senso
       * farla guardando il piano — non prima, quando ancora non si sa cosa si
       * fara'.
       */
      var quali = modelliPer(l.azione);
      if (quali.length) testi.append(pastiglieDelModello(l.azione, quali, modelliDelPiano));
      riga.append(spunta, testi);
      box.append(riga);
    });

    var fila = document.createElement("div");
    fila.className = "fila";
    var si = document.createElement("button");
    si.textContent = "S\\u00ec, fallo";
    si.addEventListener("click", async function () {
      var quali = caselle.filter(function (c) { return c.checked; }).map(function (c) { return Number(c.dataset.indice); });
      if (!quali.length) { avvisa("Spunta almeno una cosa."); return; }
      si.disabled = true;
      si.textContent = "metto in fila\\u2026";
      try {
        var esito = await chiama(
          "/chiacchierata/" + encodeURIComponent(sessione.id) + "/piano",
          { method: "POST", body: JSON.stringify({ quali: quali, modelli: modelliDelPiano }) },
        );
        sessione = null;
        disegnaChiacchierata();
        await leggiCoda();
        vaiA("riepilogo");
        var quanti = esito.quanti || quali.length;
        $("sotto-riepilogo").textContent =
          quanti === 1 ? "Una cosa \\u00e8 andata in fila." : quanti + " cose sono andate in fila.";
      } catch (e) {
        avvisaDelMale(e);
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

  /** Cosa c'e' dentro un lavoro del piano, in una riga leggibile. */
  function riassuntoDelLavoro(l) {
    var pezzi = [];
    var principale = l.campi.prompt || l.campi.descrizione || l.campi.testo || "";
    if (principale) pezzi.push(principale.slice(0, 140));
    if (l.campi.stile) pezzi.push("stile: " + l.campi.stile);
    if (l.campi.lingua) pezzi.push("in " + l.campi.lingua);
    if (l.campi.secondi) pezzi.push(l.campi.secondi + " s");
    if (l.campi.quante && l.campi.quante !== "1") pezzi.push(l.campi.quante + " immagini");
    // Il testo da cantare non si mette per intero: sono venti righe, e qui serve
    // sapere **che c'e'**, non rileggerlo.
    if (l.campi.testo && l.campi.descrizione) pezzi.push("col testo");
    return pezzi.join(" \u00b7 ");
  }

  /** I modelli fra cui si puo' scegliere per un'azione, dal catalogo. */
  function modelliPer(idAzione) {
    var a = azioni.filter(function (x) { return x.id === idAzione; })[0];
    if (!a) return [];
    var campo = a.campi.filter(function (c) { return c.nome === "modello"; })[0];
    if (!campo) return [];
    return (campo.scelte || []).map(function (id) {
      return { id: id, nome: (campo.etichette && campo.etichette[id]) || id };
    });
  }

  function pastiglieDelModello(idAzione, quali, dove) {
    var fila = document.createElement("div");
    fila.className = "filtri";
    fila.style.marginTop = "7px";
    var tutte = [];
    var accendi = function (quale) {
      if (quale) dove[idAzione] = quale;
      else delete dove[idAzione];
      for (var b of tutte) b.classList.toggle("on", (b.dataset.valore || "") === (quale || ""));
    };
    var suo = document.createElement("button");
    suo.type = "button";
    suo.className = "mini on";
    suo.dataset.valore = "";
    suo.textContent = "quello del computer";
    suo.addEventListener("click", function () { accendi(""); });
    tutte.push(suo);
    fila.append(suo);
    for (var m of quali) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini";
      b.dataset.valore = m.id;
      b.textContent = m.nome;
      b.addEventListener("click", (function (quale) {
        return function () { accendi(quale); };
      })(m.id));
      tutte.push(b);
      fila.append(b);
    }
    return fila;
  }

  async function chiudiLaChiacchierata() {
    esciDallaFilaDelParlare();
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
    che.textContent = (macchina.adesso.numero ? "#" + macchina.adesso.numero + " \\u00b7 " : "") +
      macchina.adesso.che;
    var chi = document.createElement("span");
    chi.className = "chi";
    var scriviChi = function () {
      chi.textContent =
        (macchina.adesso && macchina.adesso.chi ? "per " + macchina.adesso.chi : "dal computer") +
        (macchina.adesso && macchina.adesso.da ? " \\u00b7 da " + daQuanto(macchina.adesso.da) : "");
    };
    scriviChi();
    /**
     * ⚠ **Cosa sta facendo, e quanto ne manca.** Nuovo nella 1.2.1.
     *
     * Il difetto, detto il 7 settembre 2026: «mentre e' in lavorazione con
     * LLaDA non si vede il progresso nella fila sull'app mobile, solo con
     * LLaDA — con gli altri funziona».
     *
     * Qui c'era una barra sola, che scorreva avanti e indietro per finta: non
     * diceva **quanto**, e non diceva nemmeno **cosa**. Con un modello normale
     * bastava — dura un minuto, e la si guarda — ma LLaDA passa dei minuti a
     * caricare sedici GB prima di disegnare il primo pixel, e una barra che
     * scorre per finta davanti a una cosa ferma e' peggio di niente: sembra
     * rotta.
     *
     * Adesso sono due righe. Sotto, la barra: **piena a percentuale** quando il
     * motore conta i passi, e che scorre come prima quando non li conta. Sopra,
     * una frase con quello che il motore ha in mano adesso — «carico il
     * modello», «disegno», «salvo» — che c'e' sempre, anche per LLaDA. Vedi
     * «avanzamento» in ipc/contracts.ts per il perche' sono due cose e non una.
     */
    var faseRiga = document.createElement("div");
    faseRiga.className = "chi";
    var quanto = macchina.adesso.quanto;
    var haQuanto = typeof quanto === "number" && quanto >= 0;
    faseRiga.textContent =
      (macchina.adesso.fase || "ci sta lavorando") +
      (haQuanto ? " \\u00b7 " + Math.round(quanto * 100) + "%" : "");

    var barra = document.createElement("div");
    barra.className = "barra" + (haQuanto ? " quanta" : "");
    var dentro = document.createElement("i");
    // Con la percentuale la barra si riempie da sinistra e resta ferma dov'e';
    // senza, torna a essere quella che scorre. Le due cose non si mescolano:
    // una barra che scorre **e** si riempie non si sa piu' cosa dice.
    if (haQuanto) dentro.style.width = (quanto * 100).toFixed(1) + "%";
    barra.append(dentro);
    box.append(che, chi, faseRiga, barra);

    /**
     * **Fermalo.** Solo dal computer, e solo perche' costa.
     *
     * Chiesto il 26 agosto 2026: «mettiamo la possibilita' da pc di annullare
     * una generazione». Non e' come togliere dalla fila — quello non e' ancora
     * partito, questo si' — e il tempo di scheda video gia' speso si butta. Per
     * questo il tasto lo vede solo chi sta al computer.
     */
    if (sonoLaCasa) {
      var ferma = document.createElement("button");
      ferma.className = "mini male";
      ferma.style.marginTop = "10px";
      ferma.textContent = "\\u25A0 Ferma questa generazione";
      ferma.addEventListener("click", async function () {
        if (!confirm("Fermare quello che sta girando? Il tempo gi\\u00e0 speso si perde.")) return;
        ferma.disabled = true;
        try {
          await chiama("/macchina/ferma", { method: "POST", body: "{}" });
          await leggiMacchina();
          await leggiCoda();
        } catch (e) { avvisaDelMale(e); ferma.disabled = false; }
      });
      box.append(ferma);
    }

    /**
     * Il cronometro che scorre, ogni secondo.
     *
     * Chiesto cosi': «mettiamo i caricamenti anche sull'app android in modo da
     * far vedere delle barre di caricamento per le tempistiche». **Quanto
     * manca** non si puo' dire — non lo sa nemmeno il motore — ma da quanto sta
     * andando si', e quello basta a capire se e' partito adesso o se e' li' da
     * un quarto d'ora.
     */
    if (orologioAdesso) clearInterval(orologioAdesso);
    if (macchina.adesso.da) {
      orologioAdesso = setInterval(function () {
        if (!document.body.contains(chi)) {
          clearInterval(orologioAdesso);
          orologioAdesso = null;
          return;
        }
        scriviChi();
      }, 1000);
    }
    dove.append(box);

    // Chi aspetta, e a che posto. È la domanda vera di chi guarda da fuori:
    // non «quanti sono in fila», ma «la mia quando parte».
    if (macchina.fila.length) {
      var elenco = document.createElement("ul");
      elenco.className = "voci compatta";
      elenco.style.marginTop = "10px";
      macchina.fila.slice(0, 8).forEach(function (f) {
        var li = document.createElement("li");
        var corpo = document.createElement("div");
        corpo.className = "cresce";
        var titolo = document.createElement("div");
        titolo.className = "titolo";
        titolo.textContent = (f.numero ? "#" + f.numero + " \\u00b7 " : "") + f.che;
        var d = document.createElement("div");
        d.className = "dettaglio";
        d.textContent = (f.chi ? f.chi + " \\u00b7 " : "") + f.posto + "\\u00ba in fila";
        corpo.append(titolo, d);
        li.append(corpo);
        if (f.tuo) {
          var mio = document.createElement("span");
          mio.className = "pillola lavoro";
          mio.textContent = "tuo";
          li.append(mio);
        }
        /**
         * **Uscire dalla fila e' un diritto**, non un permesso: chi esce libera
         * la macchina. Il proprio si toglie sempre; quello di un altro lo toglie
         * chi decide, ed e' il computer a dirci quale dei due siamo.
         */
        if (f.tuoDaTogliere) {
          var via = document.createElement("button");
          via.className = "mini male";
          via.textContent = "togli";
          via.addEventListener("click", (function (quale, tasto) {
            return async function () {
              tasto.disabled = true;
              try {
                await chiama("/macchina/fila/" + encodeURIComponent(quale), { method: "DELETE" });
                await leggiMacchina();
                await leggiCoda();
              } catch (e) { avvisaDelMale(e); tasto.disabled = false; }
            };
          })(f.id, via));
          li.append(via);
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

    /**
     * **Falle partire tutte.**
     *
     * Chiesto il 26 agosto 2026: «sul pc deve essere un tasto che se premuto
     * accetta tutte le richieste mettendole correttamente in coda». Non fa
     * partire venti generazioni insieme — non si potrebbe — ne mette venti in
     * ordine, ognuna col suo numero.
     */
    var ferme = richieste.filter(function (r) { return r.stato === "in-attesa"; });
    if (puoiDecidere && ferme.length > 1) {
      var tuttePerTutte = document.createElement("div");
      tuttePerTutte.className = "fila";
      var b = document.createElement("button");
      b.textContent = "\\u25B6 Falle partire tutte (" + ferme.length + ")";
      b.addEventListener("click", async function () {
        b.disabled = true;
        b.textContent = "le metto in fila\\u2026";
        try {
          var esito = await chiama("/macchina/accetta-tutte", { method: "POST", body: "{}" });
          await leggiCoda();
          await leggiMacchina();
          $("sotto-riepilogo").textContent =
            (esito.quante || ferme.length) + " lavori sono andati in fila, in ordine di arrivo.";
        } catch (e) { avvisaDelMale(e); }
        b.disabled = false;
        b.textContent = "\\u25B6 Falle partire tutte";
      });
      tuttePerTutte.append(b);
      dove.append(tuttePerTutte);
    }
  }
`;
