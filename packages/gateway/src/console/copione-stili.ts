/**
 * Il copione, settima parte: **gli Stili**.
 *
 * **Cosa è stato chiesto, il 26 agosto 2026:**
 *
 * > «Aggiungiamo gli stili su Android, una nuova tab Stili dove gestire tutto e
 * > anche volendo condividere uno stile per farlo provare agli altri. Tenendo
 * > premuto sullo stile escono le opzioni: salva per salvarlo sul proprio
 * > profilo, modifica e salva che te lo fa modificare e salvare. Prendiamo
 * > tutti gli stili dalla suite: ogni utente deve avere i suoi, ma partono
 * > tutti con un set preimpostato.»
 *
 * ## Perché uno stile è una cosa e non un preset
 *
 * Un **preset** è un modulo compilato: quello che avevi scritto ieri, tutto
 * insieme. Uno **stile** è più piccolo e più duraturo: sono le tre o quattro
 * parole che dicono al modello musicale che tipo di musica fare, e non
 * cambiano da un brano all'altro. Uno lo si riempie, l'altro lo si costruisce
 * una volta e lo si usa per mesi — e per questo merita un posto suo.
 *
 * ## Tre tipi, dalla 0.7.8
 *
 * > «Gli stili vanno bene ma devono essere di tre tipi per immagini, video e
 * > musica; gli stili salvati per immagini li ritrovo anche nella produzione
 * > immagini, stessa cosa per musica e video, così li separiamo e ordiniamo
 * > per bene.»
 *
 * Perché uno stile **non è la stessa cosa nei tre posti**: per un brano sono
 * tre generi musicali, per un'immagine un modo di fotografare, per un video un
 * modo di riprendere. In cima ci sono tre tasti e se ne guarda uno per volta —
 * non tre elenchi in colonna: su un telefono ottanta stili di fila sono una
 * lista che si scorre e non si legge.
 *
 * Il numero accanto a ogni tipo non è decorazione: dice se l'elenco vuoto che
 * stai guardando è perché non hai stili, o perché stai guardando dalla parte
 * sbagliata.
 *
 * ## Due elenchi, e la differenza conta
 *
 * - **I miei**: quelli di partenza, quelli che ho fatto io, quelli che ho preso
 *   da qualcuno. Si toccano per usarli, si tengono premuti per il resto.
 * - **In vetrina**: quelli che gli altri hanno deciso di far provare. Prenderne
 *   uno **ne fa una copia**: dal momento in cui è tuo, chi l'ha fatto può
 *   cambiarlo o toglierlo dalla vetrina senza che a te sparisca da sotto le
 *   mani. Resta scritto di chi era, che è l'unica cosa che vale la pena
 *   ricordare.
 */
export const COPIONE_STILI = `
  /** I miei stili, e quelli che gli altri hanno messo in vetrina. */
  var mieiStili = [];
  var stiliDegliAltri = [];
  /** Da che parte si sta guardando: \`miei\` o \`vetrina\`. */
  var doveStili = "miei";
  /**
   * Di che tipo si stanno guardando: \`immagine\`, \`video\` o \`musica\`.
   *
   * Uno solo per volta, e non tre elenchi uno sotto l'altro: su un telefono
   * ottanta stili in colonna sono una lista che si scorre e non si legge.
   */
  var tipoStili = "immagine";

  /**
   * Stili, o prompt interi. Nuovo nella 0.9.0.
   *
   * Chiesto il 5 settembre 2026: «lo stesso anche con i prompt — canzoni,
   * immagini e video si possono condividere, in modo da usarli e modificarli a
   * piacere». Sono la stessa cosa salvata nello stesso posto: cambia dove
   * finiscono le parole. **Uno stile si aggiunge** a quello che scrivi, **un
   * prompt lo sostituisce** — ed e' tutta li' la differenza.
   */
  var genereStili = "stile";

  function genereDi(s) { return s && s.genere === "prompt" ? "prompt" : "stile"; }
  function eUnPrompt() { return genereStili === "prompt"; }
  function comeSiChiama(uno) {
    return eUnPrompt() ? (uno ? "un prompt" : "prompt") : (uno ? "uno stile" : "stili");
  }

  /** I tre tipi, con la scheda che li usa e un esempio di come si scrivono. */
  var TIPI_STILE = [
    { id: "immagine", nome: "Immagini", segno: "\u25c9", azione: "genera.immagine", esempio: "photorealistic, 35mm photography, natural light" },
    { id: "video", nome: "Video", segno: "\u25b6", azione: "genera.video", esempio: "cinematic shot, shallow depth of field, steady camera" },
    { id: "musica", nome: "Musica", segno: "\u266b", azione: "genera.brano", esempio: "neapolitan neomelodic pop, melodic trap, autotune ballad" },
  ];

  function infoTipo(quale) {
    for (var i = 0; i < TIPI_STILE.length; i++) if (TIPI_STILE[i].id === quale) return TIPI_STILE[i];
    return TIPI_STILE[0];
  }
  function tipoOra() { return infoTipo(tipoStili); }

  /** Uno stile senza tipo viene da prima della 0.7.8: era musica. */
  function tipoDi(s) { return s && s.tipo ? s.tipo : "musica"; }

  async function leggiStili() {
    try {
      var risposta = await chiama("/stili");
      mieiStili = (risposta && risposta.stili) || [];
    } catch (e) { mieiStili = []; }
    if (doveStili === "vetrina") {
      try {
        var altri = await chiama("/stili/vetrina");
        stiliDegliAltri = (altri && altri.stili) || [];
      } catch (e) { stiliDegliAltri = []; }
    }
    disegnaStili();
  }

  /**
   * La vetrina, chiesta da sola.
   *
   * «leggiStili» la chiede solo quando si sta guardando da quella parte, ed e'
   * giusto: e' un giro di rete in piu' che a chi sta guardando i suoi non
   * serve. Ma dalla 0.9.0 la vetrina compare **anche in DaProd** — «cosi' chi
   * va in daprod puo' importare lo stile per usarlo» — e quella scheda non
   * passa da li'.
   */
  async function leggiVetrina() {
    try {
      // «miei=1»: in DaProd si vede anche quello che hai messo tu. E' l'unico
      // modo di sapere che la condivisione e' andata — ed e' il difetto detto
      // il 5 settembre 2026: «ho condiviso uno stile ma non e' uscito in daprod».
      var altri = await chiama("/stili/vetrina?miei=1");
      stiliDegliAltri = (altri && altri.stili) || [];
    } catch (e) {
      stiliDegliAltri = [];
    }
    return stiliDegliAltri;
  }

  function disegnaStili() {
    disegnaTipiStili();
    disegnaDueTastiStili();

    var casella = $("elenco-stili");
    casella.innerHTML = "";
    var quali = (doveStili === "vetrina" ? stiliDegliAltri : mieiStili)
      .filter(function (s) { return tipoDi(s) === tipoStili && genereDi(s) === genereStili; });

    $("stili-vuoti").hidden = quali.length > 0;
    $("stili-vuoti").textContent = doveStili === "vetrina"
      ? "Nessuno ha ancora messo in DaProd " + comeSiChiama(true) + " per " + tipoOra().nome.toLowerCase() + ". Mettici il tuo: tieni premuto e scegli «condividi»."
      : "Non hai ancora " + (eUnPrompt() ? "nessun prompt" : "nessuno stile") + " per " + tipoOra().nome.toLowerCase() + ".";

    for (var s of quali) casella.append(cartaStile(s));
  }

  /**
   * I tre tipi in fila, col numero di quanti ce n'è dentro.
   *
   * Il numero non è decorazione: dice se l'elenco vuoto che stai guardando è
   * perché non hai stili, o perché stai guardando dalla parte sbagliata.
   */
  function disegnaTipiStili() {
    var casella = $("tipi-stili");
    if (!casella) return;
    casella.innerHTML = "";
    var dentro = (doveStili === "vetrina" ? stiliDegliAltri : mieiStili)
      .filter(function (s) { return genereDi(s) === genereStili; });

    /**
     * Prima la domanda grossa — stili o prompt — poi i tre tipi.
     *
     * Sono due scelte diverse e vanno su due righe: mettere sei pastiglie in
     * fila vorrebbe dire far scegliere insieme cose che non stanno insieme.
     */
    var riga = document.createElement("div");
    riga.className = "filtri";
    riga.style.marginBottom = "8px";
    for (var g of [
      { id: "stile", nome: "Stili", sotto: "si aggiungono a quello che scrivi" },
      { id: "prompt", nome: "Prompt", sotto: "sostituiscono quello che scrivi" },
    ]) {
      var bg = document.createElement("button");
      bg.type = "button";
      bg.className = "mini" + (g.id === genereStili ? " on" : "");
      bg.textContent = g.nome;
      bg.title = g.sotto;
      bg.addEventListener("click", (function (quale) {
        return function () { genereStili = quale; disegnaStili(); };
      })(g.id));
      riga.append(bg);
    }
    casella.append(riga);

    for (var t of TIPI_STILE) {
      var quanti = dentro.filter((function (quale) {
        return function (s) { return tipoDi(s) === quale; };
      })(t.id)).length;
      // I tre tipi vanno nella riga sotto a quella del genere.
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (t.id === tipoStili ? " on" : "");
      b.textContent = t.segno + " " + t.nome + " \\u00b7 " + quanti;
      b.addEventListener("click", (function (quale) {
        return function () { tipoStili = quale; disegnaStili(); };
      })(t.id));
      casella.append(b);
    }
  }

  function disegnaDueTastiStili() {
    var casella = $("due-tasti-stili");
    casella.innerHTML = "";
    var quantiMiei = mieiStili.filter(function (s) {
      return tipoDi(s) === tipoStili && genereDi(s) === genereStili;
    }).length;
    var pezzi = [
      { id: "miei", nome: eUnPrompt() ? "I miei prompt" : "I miei stili", sotto: quantiMiei + " per " + tipoOra().nome.toLowerCase(), tinta: "ciano", segno: tipoOra().segno },
      { id: "vetrina", nome: "In DaProd", sotto: "quelli che gli altri fanno provare", tinta: "rosa", segno: "\\u2726" },
    ];
    for (var x of pezzi) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tastone piccolo " + x.tinta + (x.id === doveStili ? " on" : "");
      var seg = document.createElement("span");
      seg.className = "segno";
      seg.textContent = x.segno;
      var n = document.createElement("span");
      n.className = "nome";
      n.textContent = x.nome;
      var p = document.createElement("small");
      p.textContent = x.sotto;
      b.append(seg, n, p);
      b.addEventListener("click", (function (quale) {
        return function () { doveStili = quale; leggiStili(); };
      })(x.id));
      casella.append(b);
    }
  }

  /**
   * La carta di uno stile.
   *
   * **Si tocca per usarlo, si tiene premuto per il resto.** È il gesto che è
   * stato chiesto, ed è quello giusto: nove volte su dieci uno stile lo si
   * vuole *usare*, e mettere quattro tasti su ognuna delle ventiquattro carte
   * vorrebbe dire una schermata illeggibile.
   */
  function cartaStile(s) {
    var box = document.createElement("div");
    box.className = "stile" + (s.condiviso ? " inVetrina" : "");

    var nome = document.createElement("div");
    nome.className = "nomeStile";
    nome.textContent = s.nome;

    var testo = document.createElement("div");
    testo.className = "testoStile";
    testo.textContent = s.testo;

    box.append(nome, testo);

    var sotto = [];
    if (s.da === "preso" && s.daNome) sotto.push("preso da " + s.daNome);
    if (doveStili === "vetrina" && s.chiNome) sotto.push("di " + s.chiNome);
    if (s.condiviso && doveStili === "miei") sotto.push("in vetrina");
    if (sotto.length) {
      var riga = document.createElement("div");
      riga.className = "daChi";
      riga.textContent = sotto.join(" \\u00b7 ");
      box.append(riga);
    }

    if (doveStili === "vetrina") {
      var prendi = document.createElement("button");
      prendi.className = "mini";
      prendi.style.marginTop = "9px";
      prendi.textContent = "\\u2913 Prendilo";
      prendi.addEventListener("click", function () { void prendiLoStile(s, prendi); });
      box.append(prendi);
      return box;
    }

    box.addEventListener("click", function () { usaLoStile(s); });
    // Tenere premuto: sul telefono è il gesto per «cosa posso farci», e sul
    // computer il tasto destro fa la stessa cosa.
    var premuto = null;
    box.addEventListener("pointerdown", function () {
      premuto = setTimeout(function () { premuto = null; apriMenuStile(s); }, 500);
    });
    var lascia = function () { if (premuto) { clearTimeout(premuto); premuto = null; } };
    box.addEventListener("pointerup", lascia);
    box.addEventListener("pointerleave", lascia);
    box.addEventListener("pointercancel", lascia);
    box.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
      lascia();
      apriMenuStile(s);
    });
    return box;
  }

  /**
   * Usare uno stile: si va in Produzione, con la descrizione già riempita.
   *
   * È la cosa per cui uno stile esiste, quindi è il gesto più corto: un tocco.
   */
  /**
   * Mette in Produzione quello che si e' toccato.
   *
   * Vale sia per uno stile sia per un prompt, e fa la stessa cosa: apre la
   * scheda giusta e scrive il testo nella casella principale. La differenza fra
   * i due sta in **cosa ci si mette dentro** — poche parole di modo, o una
   * richiesta intera — e da li' in poi si cambia a mano, che e' il punto.
   */
  function usaLoStile(s) {
    var info = infoTipo(tipoDi(s));
    var azione = azioni.filter(function (a) { return a.id === info.azione; })[0];
    if (!azione) { alert("Su questo computer non si pu\u00f2 fare questo."); return; }
    vaiA("produzione");
    scegli(azione);
    var principale = document.querySelector("#modulo [data-principale]");
    if (principale) {
      principale.value = s.testo;
      principale.dispatchEvent(new Event("input"));
    }
    var pastiglia = document.querySelector('#modulo [data-campo="stile"]');
    if (pastiglia) pastiglia.value = s.nome;

    /**
     * ⚠ **Un prompt riempie il modulo, non una casella.**
     *
     * E' la differenza detta il 5 settembre 2026: «ci sono gli stili che sono
     * solo una parte e i prompt che contengono tutto; come ora non vanno bene —
     * nel caso di una canzone ci devono essere tutte le info».
     *
     * I campi arrivano con le etichette che si leggono («Il titolo», «Il
     * testo»), perche' e' cosi' che vengono salvati e cosi' si capiscono
     * aprendo il file. Qui si rimappano sui nomi veri dei campi: la tabella e'
     * corta e sta in un posto solo.
     */
    if (genereDi(s) === "prompt" && s.campi) {
      var DOVE_VA = {
        "Il prompt": "prompt",
        "Che genere": "descrizione",
        "Il testo": "testo",
        "Lo stile": "stile",
        "Il titolo": "titolo",
        "La lingua": "lingua",
        "Quanto dura": "secondi",
        "I battiti": "bpm",
        "La tonalit\u00e0": "tonalita",
        "La copertina": "copertina",
        "Con che modello": "modello",
      };
      for (var etichetta in s.campi) {
        if (!Object.prototype.hasOwnProperty.call(s.campi, etichetta)) continue;
        var nome = DOVE_VA[etichetta];
        if (!nome) continue;
        var campo = document.querySelector('#modulo [data-campo="' + nome + '"]');
        if (!campo) continue;
        campo.value = s.campi[etichetta];
        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.dispatchEvent(new Event("change", { bubbles: true }));
      }
      // Le pastiglie leggono il campo nascosto solo quando lo si tocca: senza
      // questo giro resterebbero accese su quelle di prima.
      for (var p of document.querySelectorAll("#modulo .filtri button[data-valore]")) {
        var nascosto = p.parentElement && p.parentElement.previousElementSibling;
        if (!nascosto || !nascosto.dataset) continue;
        p.classList.toggle("on", p.dataset.valore === nascosto.value);
      }
    }
  }

  /** Il foglio di uno stile: le quattro cose che ci si può fare. */
  function apriMenuStile(s) {
    var carta = apriFoglio(s.nome);

    var testo = document.createElement("p");
    testo.className = "sotto";
    testo.textContent = s.testo;
    carta.append(testo);

    voceFoglio(carta, infoTipo(tipoDi(s)).segno, "Usalo adesso", "va in Produzione, gi\\u00e0 riempito", function () {
      chiudiFoglio();
      usaLoStile(s);
    });

    voceFoglio(carta, "\\u270E", "Modifica e salva", "cambia le parole, o il nome", function () {
      apriModificaStile(s);
    });

    voceFoglio(
      carta,
      "\\u2726",
      s.condiviso ? "Togli dalla vetrina" : "Mettilo in vetrina",
      s.condiviso ? "smette di farlo provare agli altri" : "gli altri potranno provarlo",
      function () { void condividiLoStile(s, !s.condiviso); },
    );

    voceFoglio(carta, "\\u2295", "Fanne una copia", "per partire da qui e cambiarlo", function () {
      apriModificaStile({ nome: s.nome + " (mio)", testo: s.testo });
    });

    voceFoglio(carta, "\\u2715", "Buttalo", "non si torna indietro", function () {
      if (!confirm("Buttare lo stile \\u00ab" + s.nome + "\\u00bb?")) return;
      void buttaLoStile(s);
    }, true);
  }

  /**
   * Il foglio per scrivere uno stile.
   *
   * Senza un id è uno nuovo; con l'id si cambia quello che c'era. La nota sotto
   * la casella non è decorazione: è **la regola degli stili**, quella che non è
   * ovvia e che si sbaglia sempre — niente strumenti, niente atmosfera, niente
   * BPM. Metterla qui, dove si scrive, vale più che scriverla nella
   * documentazione.
   */
  function apriModificaStile(s) {
    var suo = s && s.tipo ? s.tipo : tipoStili;
    var ilGenere = s ? genereDi(s) : genereStili;
    var prompt = ilGenere === "prompt";
    var info = infoTipo(suo);
    var carta = apriFoglio(
      (s && s.id
        ? (prompt ? "Modifica il prompt" : "Modifica lo stile")
        : (prompt ? "Un prompt nuovo" : "Uno stile nuovo")) +
        " \u00b7 " + info.nome.toLowerCase(),
    );

    var eNome = document.createElement("label");
    eNome.textContent = "Come si chiama";
    var campoNome = document.createElement("input");
    campoNome.type = "text";
    campoNome.maxLength = 60;
    campoNome.value = (s && s.nome) || "";
    campoNome.placeholder = suo === "musica" ? "Neomelodico trap" : (suo === "video" ? "Carrellata lenta" : "Fotografia vera");

    var eTesto = document.createElement("label");
    eTesto.textContent = prompt ? "Il prompt, per intero" : "Le parole per il modello";
    var campoTesto = document.createElement("textarea");
    campoTesto.value = (s && s.testo) || "";
    campoTesto.placeholder = info.esempio;
    faCrescere(campoTesto);

    var nota = document.createElement("p");
    nota.className = "nota";
    nota.textContent = prompt
      ? "Un prompt intero, quello che vorresti chiedere. Ritrovandolo, prende il posto di " +
        "quello che hai scritto — e da li' lo cambi come vuoi. Tenendolo premuto lo metti " +
        "in DaProd, e chi lo trova puo' prenderselo."
      : suo === "musica"
      ? "Tre o quattro generi in inglese, separati da virgola. Niente strumenti, niente " +
        "atmosfera, niente BPM: una descrizione dettagliata restringe il modello e fa uscire " +
        "sempre la stessa cosa. Si affina sui sottogeneri, non aggiungendo parole."
      : suo === "video"
        ? "Poche parole in inglese: come si riprende, non cosa si riprende. La scena la " +
          "scrivi ogni volta nella descrizione; qui ci va solo il modo."
        : "Poche parole in inglese: il modo, non il soggetto. Il soggetto lo scrivi ogni " +
          "volta nella descrizione; qui ci va come deve venire.";

    var avviso = document.createElement("div");
    avviso.className = "avviso";

    var fila = document.createElement("div");
    fila.className = "fila";
    var salva = document.createElement("button");
    salva.textContent = "Salva";
    salva.addEventListener("click", async function () {
      salva.disabled = true;
      try {
        await chiama("/stili", {
          method: "POST",
          body: JSON.stringify({
            id: s && s.id,
            nome: campoNome.value.trim(),
            testo: campoTesto.value.trim(),
            tipo: suo,
            genere: ilGenere,
          }),
        });
        chiudiFoglio();
        await leggiStili();
      } catch (e) {
        avviso.textContent = e.message;
        avviso.className = "avviso male";
        salva.disabled = false;
      }
    });
    fila.append(salva);

    carta.append(eNome, campoNome, eTesto, campoTesto, nota, fila, avviso);
    campoNome.focus();
  }

  async function condividiLoStile(s, condiviso) {
    try {
      await chiama("/stili/" + encodeURIComponent(s.id) + "/condividi", {
        method: "POST",
        body: JSON.stringify({ condiviso: condiviso }),
      });
      chiudiFoglio();
      await leggiStili();
    } catch (e) { alert(e.message); }
  }

  async function buttaLoStile(s) {
    try {
      await chiama("/stili/" + encodeURIComponent(s.id), { method: "DELETE" });
      chiudiFoglio();
      await leggiStili();
    } catch (e) { alert(e.message); }
  }

  async function prendiLoStile(s, tasto) {
    tasto.disabled = true;
    tasto.textContent = "lo prendo\\u2026";
    try {
      await chiama("/stili/vetrina/prendi", {
        method: "POST",
        body: JSON.stringify({
          nome: s.nome,
          testo: s.testo,
          tipo: tipoDi(s),
          // Un prompt preso resta un prompt: senza questa riga finirebbe fra
          // gli stili, e la volta dopo si aggiungerebbe invece di sostituire.
          genere: genereDi(s),
          daNome: s.chiNome,
        }),
      });
      tasto.textContent = "\\u2713 \\u00e8 tuo";
      // Gli stili dell'azione cambiano: si rileggono, se no la Produzione
      // continua a offrire quelli di prima finché non si riapre l'app.
      try { azioni = await chiama("/azioni"); } catch (e) { /* al giro dopo */ }
    } catch (e) {
      alert(e.message);
      tasto.disabled = false;
      tasto.textContent = "\\u2913 Prendilo";
    }
  }
`;
