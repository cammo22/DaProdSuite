/**
 * La rete di casa: chi c'è, e chi sta bussando.
 *
 * ## Perché questa parte esiste
 *
 * Fino alla 0.8.2 un computer non sapeva niente degli altri, e chi arrivava
 * doveva farsi dettare un codice di otto cifre. Chiesto il 5 settembre 2026:
 * «il pc deve avere una schermata dove tutti quelli che scaricano l'app da
 * github vedono gli altri pc in rete e tutti i pc possono collaborare».
 *
 * Quindi due cose, e stanno insieme perché si guardano insieme:
 *
 * 1. **Chi c'è.** I computer con la suite accesa sulla stessa rete, sentiti
 *    dall'annuncio UDP (`rete.ts`). Serve a sapere dove si potrebbe spostare
 *    un lavoro quando questo computer ha la fila piena.
 * 2. **Chi bussa.** Le persone che hanno scelto questo computer da un elenco
 *    sul telefono e aspettano un sì. È la cosa che sostituisce il codice.
 *
 * ## La riga che compare in cima
 *
 * Una bussata che sta in un foglio delle impostazioni è una bussata che nessuno
 * vede. Quindi quando qualcuno aspetta compare una **fascia in cima alla
 * Casa** — lo stesso posto dove compare «il computer è in pausa» — con il nome
 * e due tasti. Chi ha il computer aperto decide senza cercare niente.
 *
 * Le regole del file valgono anche qui: niente backtick, niente template
 * literal. Questo file *è* un template literal.
 */
export const COPIONE_RETE = `
  /* ------------------------------------------------------------- la rete */

  /** L'ultima fotografia della rete: chi c'è, e chi bussa. */
  var laRete = null;

  /** Il giro che tiene aggiornata la fascia delle bussate. */
  var giroRete = null;

  /**
   * Chiede al computer com'è messa la rete.
   *
   * **Non solleva mai.** Un gateway di una versione precedente non ha questa
   * rotta, e una pagina che si rompe perché il computer è vecchio è una pagina
   * che non si può aggiornare. Chi non risponde vale come «rete vuota».
   */
  async function guardaLaRete() {
    try {
      laRete = await chiama("/rete");
    } catch (e) {
      laRete = null;
    }
    disegnaFasciaBussate();
    return laRete;
  }

  /**
   * La fascia in cima alla Casa quando qualcuno aspetta di entrare.
   *
   * Compare solo a chi può decidere: a un ospite direbbe una cosa su cui non
   * può fare niente.
   */
  function disegnaFasciaBussate() {
    var fascia = $("fascia-bussate");
    if (!fascia) return;
    var quante = laRete && laRete.bussate ? laRete.bussate.length : 0;
    if (!puoiDecidere || quante === 0) {
      fascia.hidden = true;
      return;
    }
    fascia.hidden = false;
    var primo = laRete.bussate[0];
    $("bussate-chi").textContent =
      quante === 1
        ? primo.nome + " vuole collegarsi"
        : quante + " persone vogliono collegarsi";
    $("bussate-dove").textContent =
      quante === 1
        ? "da " + primo.apparecchio + " \\u00b7 " + primo.da
        : "la prima \\u00e8 " + primo.nome + ", da " + primo.apparecchio;
  }

  /**
   * Il foglio della rete.
   *
   * Prima chi bussa — è la cosa su cui si deve decidere — poi i computer.
   */
  async function apriLaRete() {
    var carta = apriFoglio("La rete di casa");

    var attesa = document.createElement("p");
    attesa.className = "nota";
    attesa.textContent = "Sto guardando chi c\\u0027\\u00e8\\u2026";
    carta.append(attesa);

    await guardaLaRete();
    attesa.remove();

    if (!laRete) {
      var male = document.createElement("p");
      male.className = "avviso male";
      male.textContent =
        "Questo computer non sa ancora parlare della rete: aggiorna la suite sul PC.";
      carta.append(male);
      return;
    }

    /* ------------------------------------------------------ chi bussa */

    if (puoiDecidere) {
      var titoloB = document.createElement("h3");
      titoloB.textContent = "Chi chiede di entrare";
      carta.append(titoloB);

      if (!laRete.bussate.length) {
        var nessuno = document.createElement("p");
        nessuno.className = "nota";
        nessuno.textContent =
          "Nessuno, adesso. Chi apre l\\u0027app sulla stessa rete vede questo computer " +
          "nell\\u0027elenco e pu\\u00f2 chiedere di entrare: la richiesta compare qui.";
        carta.append(nessuno);
      } else {
        for (var b of laRete.bussate) carta.append(rigaBussata(b));
      }
    }

    /* -------------------------------------------------- gli altri computer */

    var titoloP = document.createElement("h3");
    titoloP.textContent = "Gli altri computer";
    carta.append(titoloP);

    if (!laRete.annuncia) {
      var spento = document.createElement("p");
      spento.className = "nota";
      spento.textContent =
        "Questo computer non si sta annunciando: accendi la connessione dall\\u0027hub.";
      carta.append(spento);
    }

    if (!laRete.pari.length) {
      var soli = document.createElement("p");
      soli.className = "nota";
      soli.textContent =
        "Nessun altro computer con la suite accesa, su questa rete. " +
        "Se ce n\\u0027\\u00e8 uno, controlla che abbia la connessione accesa e che il " +
        "firewall lasci passare la porta 8791.";
      carta.append(soli);
    } else {
      for (var p of laRete.pari) carta.append(rigaPari(p));
    }

    var io = document.createElement("p");
    io.className = "nota";
    io.textContent =
      "Questo computer si presenta come \\u00ab" + laRete.io.nome + "\\u00bb" +
      (laRete.io.basi.length ? " su " + laRete.io.basi[0] : "") + ".";
    carta.append(io);
  }

  /** Una persona che aspetta: chi è, da dove, e i due tasti. */
  function rigaBussata(b) {
    var riga = document.createElement("div");
    riga.className = "bussa";

    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda";
    faccia.textContent = (b.nome || "?").slice(0, 1).toUpperCase();

    var dati = document.createElement("div");
    dati.className = "cresce";
    var nome = document.createElement("b");
    nome.textContent = b.nome;
    var dove = document.createElement("small");
    dove.textContent = b.apparecchio + " \\u00b7 " + b.da;
    dati.append(nome, dove);

    /**
     * ⚠ **Si sceglie con che permessi, e si sceglie guardando.**
     *
     * Qui c'era un tasto solo, «Fallo entrare», che faceva entrare come
     * **utente**; per farlo entrare come admin bisognava **tenerlo premuto**.
     * La ragione scritta allora era buona — «un gesto grosso non pu\\u00f2 stare
     * accanto a uno piccolo con la stessa forma» — e la soluzione era
     * sbagliata: un gesto che non si vede non e'' un gesto, e'' una funzione che
     * non esiste per chi non l\\u2019ha letta nel codice.
     *
     * Cosa e'' costato, il 6 settembre 2026: ri-accoppiando il proprio telefono
     * si toccava «Fallo entrare» e si diventava **utente**. Le richieste di un
     * utente **aspettano un s\\u00ec**: vanno in fila e restano l\\u00ec. Da fuori,
     * «non funziona un cazzo, va in coda e non genera» — e la causa era un
     * permesso, scelto senza saperlo, con un tocco.
     *
     * Adesso il tasto apre due righe che dicono **cosa cambia**, non come si
     * chiamano. Resta un tocco in pi\\u00f9, e quel tocco e'' il punto: e'' il
     * momento in cui la decisione si vede.
     */
    var si = document.createElement("button");
    si.className = "mini";
    si.textContent = "Fallo entrare";
    si.addEventListener("click", function () { chiediConCheRuolo(b, riga); });

    var no = document.createElement("button");
    no.className = "mini male";
    no.textContent = "No";
    no.addEventListener("click", function () {
      void rispondiBussata(b.id, false, false, riga);
    });

    riga.append(faccia, dati, si, no);
    return riga;
  }

  /**
   * Con che permessi lo faccio entrare?
   *
   * Le due righe dicono **cosa succede**, non come si chiama il ruolo: chi sta
   * scegliendo non deve sapere cosa vuol dire «admin», deve sapere che uno fa
   * partire i lavori e l\\u2019altro li mette in fila ad aspettare.
   *
   * «Chi decide» sta sotto e ha il colore dell\\u2019avviso, perch\\u00e9 e'' il gesto
   * grosso: da quel momento quella persona pu\\u00f2 far entrare altri.
   */
  function chiediConCheRuolo(b, riga) {
    var carta = apriFoglio("Far entrare " + b.nome);

    var dice = document.createElement("p");
    dice.className = "nota";
    dice.textContent = b.apparecchio + " \u00b7 " + b.da;
    carta.append(dice);

    voceFoglio(
      carta,
      "\u263C",
      "Come utente",
      "manda richieste, e tu decidi quali far partire",
      function () { chiudiFoglio(); void rispondiBussata(b.id, true, false, riga); },
    );

    voceFoglio(
      carta,
      "\u2605",
      "Come chi decide",
      "fa partire quello che chiede, vede tutto, e pu\u00f2 far entrare altri",
      function () {
        chiudiFoglio();
        void rispondiBussata(b.id, true, true, riga);
      },
      true,
    );
  }

  async function rispondiBussata(id, accetta, comeAdmin, riga) {
    try {
      await chiama("/bussate/" + encodeURIComponent(id), {
        method: "POST",
        body: JSON.stringify({ accetta: accetta, ruolo: comeAdmin ? "admin" : "ospite" }),
      });
      if (riga) riga.remove();
      await guardaLaRete();
      await leggiPannello();
      disegnaDispositivi();
    } catch (e) {
      avvisaDelMale(e);
    }
  }

  /** Un altro computer sulla rete. */
  function rigaPari(p) {
    var riga = document.createElement("div");
    riga.className = "bussa";

    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda";
    faccia.textContent = "\\u2318";

    var dati = document.createElement("div");
    dati.className = "cresce";
    var nome = document.createElement("b");
    nome.textContent = p.nome;
    var dove = document.createElement("small");
    dove.textContent =
      "DaProd Suite " + (p.versione || "?") + " \\u00b7 " + p.visto_da +
      (p.apre ? "" : " \\u00b7 non accetta collegamenti");
    dati.append(nome, dove);

    var apri = document.createElement("button");
    apri.className = "mini";
    apri.textContent = "Aprilo";
    /**
     * L'indirizzo lo dà il gateway, non lo costruisce questa pagina.
     *
     * Non è pignoleria: la console **non contiene indirizzi**, e c'è una prova
     * che lo verifica leggendo l'HTML servito (vedi prova-gateway.mjs, «non
     * chiama niente da fuori»). Un computer senza indirizzo non compare col
     * tasto: è il gateway a riempirlo con quello da cui è arrivato l'annuncio.
     */
    apri.addEventListener("click", function () {
      if (!p.basi || !p.basi.length) return;
      window.open(p.basi[0], "_blank", "noopener");
    });
    if (!p.basi || !p.basi.length) apri.disabled = true;

    riga.append(faccia, dati, apri);
    return riga;
  }
`;
