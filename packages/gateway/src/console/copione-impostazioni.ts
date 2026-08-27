/**
 * Il copione, sesta parte: **le impostazioni**, e tutto quello che ci è finito.
 *
 * **Il difetto che cura, detto il 26 agosto 2026:**
 *
 * > «non facciamo vedere le persone collegate e altri settaggi, queste cose
 * > spostiamole tutte dove hai messo i pulsanti: Ricarica, come siamo messi,
 * > aggiungi una persona, aggiorna l'app, scollega questa persona; mettiamo lì
 * > il pulsante impostazioni e lì possiamo vedere le cose. **ps: il tasto
 * > ricarica non ricarica.**»
 *
 * Due cose in una. La prima: c'era un menu dell'app Android con cinque voci, e
 * una scheda della pagina web con altre cinque cose — due posti per la stessa
 * famiglia di gesti, e nessuno dei due completo. Adesso c'è un posto solo, e
 * ci si arriva dalla rotella in alto a destra, da qualunque scheda.
 *
 * La seconda, il poscritto: **Ricarica non ricaricava.** Nel menu dell'app quel
 * tasto rifaceva il giro degli indirizzi e riapriva la pagina — cioè faceva
 * la cosa lunga — e se il computer rispondeva subito non si vedeva succedere
 * niente. Adesso ricarica e basta: la pagina, o la WebView se siamo nell'app.
 *
 * ## Cosa c'è dentro, e in che ordine
 *
 * L'ordine è quello di quanto spesso si usa, non quello di quanto è importante:
 *
 * 1. **Ricarica** — il gesto che si fa quando qualcosa sembra fermo;
 * 2. **Come siamo messi** — la connessione, in due righe;
 * 3. **Le persone** — chi è collegato, e cosa può fare (solo per chi decide);
 * 4. **Invita qualcuno** — il codice e il QR (solo per chi decide);
 * 5. **Il computer** — pausa, chi passa subito, i tetti (**solo dal computer**);
 * 6. **Aggiorna l'app** — solo dentro l'app Android, che sa aggiornarsi;
 * 7. **Scollegati** — l'ultima, ed è rossa.
 *
 * ## Perché il punto 5 si vede solo dal computer
 *
 * Chiesto testualmente: «vorrei mettere **solo su pc** la possibilità di
 * accettare le richieste in automatico e limitarle con un pulsante», e «il pc è
 * il vero admin». Un telefono con i permessi da admin decide sulle richieste
 * degli altri — quello sì — ma non può alzarsi i limiti a cui è sottoposto lui:
 * se potesse, non sarebbero limiti. Il controllo vero non è qui: è nel gateway,
 * che rifiuta quelle due rotte a chiunque non sia la casa. Questo è solo il
 * motivo per cui il tasto non compare nemmeno.
 */
export const COPIONE_IMPOSTAZIONI = `
  /* -------------------------------------------------------------- il foglio */

  /**
   * Apre un foglio che sale dal basso e torna la sua carta, da riempire.
   *
   * Un foglio alla volta: aprirne uno mentre ce n'è un altro chiude il primo.
   * Due fogli sovrapposti sono due tasti «chiudi» e nessuno che sa quale.
   */
  function apriFoglio(titolo) {
    chiudiFoglio();
    var fuori = document.createElement("div");
    fuori.className = "foglio";
    fuori.id = "foglio";
    var carta = document.createElement("div");
    carta.className = "carta";
    var maniglia = document.createElement("div");
    maniglia.className = "maniglia";
    var h = document.createElement("h2");
    h.textContent = titolo;
    h.style.margin = "0 0 12px";
    carta.append(maniglia, h);
    fuori.append(carta);
    fuori.addEventListener("click", function (ev) {
      if (ev.target === fuori) chiudiFoglio();
    });
    document.body.append(fuori);
    return carta;
  }

  function chiudiFoglio() {
    var vecchio = document.getElementById("foglio");
    if (vecchio) vecchio.remove();
  }

  /** Una voce del foglio: un segno, una parola, e sotto cosa vuol dire. */
  function voceFoglio(carta, segno, testo, spiegazione, fai, brutta) {
    var b = document.createElement("button");
    b.className = "voceFoglio" + (brutta ? " male" : "");
    var s = document.createElement("span");
    s.className = "segno";
    s.textContent = segno;
    var d = document.createElement("span");
    d.className = "cresce";
    d.textContent = testo;
    if (spiegazione) {
      var piccolo = document.createElement("small");
      piccolo.textContent = spiegazione;
      d.append(piccolo);
    }
    b.append(s, d);
    b.addEventListener("click", fai);
    carta.append(b);
    return b;
  }

  /* -------------------------------------------------- le impostazioni */

  function apriImpostazioni() {
    var carta = apriFoglio("Impostazioni");

    /**
     * **Ricarica, e questa volta ricarica davvero.**
     *
     * Dentro l'app lo fa lei, che ricarica la WebView; fuori, la pagina. Prima
     * questo tasto rifaceva il giro degli indirizzi e poi *forse* riapriva la
     * pagina: quando il computer rispondeva subito non succedeva niente di
     * visibile, ed era esattamente il momento in cui uno lo premeva.
     */
    voceFoglio(carta, "\\u21BB", "Ricarica", "quando qualcosa sembra fermo", function () {
      chiudiFoglio();
      if (window.DaProdApp && window.DaProdApp.ricarica) { window.DaProdApp.ricarica(); return; }
      location.reload();
    });

    voceFoglio(carta, "\\u2609", "Come siamo messi", frasaConnessione(), function () {
      apriComeSiamoMessi();
    });

    if (puoiDecidere) {
      voceFoglio(
        carta,
        "\\u263A",
        "Le persone",
        pannello ? pannello.dispositivi.length + " collegate" : "chi c'\\u00e8, e cosa pu\\u00f2 fare",
        function () { apriLePersone(); },
      );
      voceFoglio(carta, "\\u002B", "Aggiungi una persona", "un codice che dura pochi minuti", function () {
        apriInviti();
      });
    }

    /**
     * Il governo della macchina: **solo dal computer**.
     *
     * Vedi l'intestazione di questo file per il perché. La riga qui sotto è
     * l'unica cosa che decide se il tasto compare; il divieto vero sta nel
     * gateway, che rifiuta quelle rotte a chiunque non sia la casa.
     */
    if (sonoLaCasa) {
      voceFoglio(
        carta,
        "\\u2699",
        "Il computer",
        macchina && macchina.inPausa ? "in pausa \\u00b7 non parte niente di nuovo" : "chi genera subito, e quanto",
        function () { apriIlComputer(); },
      );
    }

    /**
     * Cambiare persona: **solo dentro l'app**, e solo se ce n'è più d'una.
     *
     * Sta qui e non in una barra nativa perché dalla 0.7.6 quella barra, dentro
     * la suite, non c'è più: la pagina ha la sua testata, e due intestazioni una
     * sopra l'altra erano una di troppo. Il gesto però serve — un telefono in
     * casa lo usano in due — quindi è finito dove sono finiti tutti gli altri.
     */
    if (window.DaProdApp && window.DaProdApp.cambiaPersona) {
      voceFoglio(
        carta,
        "⇄",
        "Cambia persona",
        "tieni premuto un nome per toglierlo dal telefono",
        function () {
          chiudiFoglio();
          window.DaProdApp.cambiaPersona();
        },
      );
    }

    if (window.DaProdApp && window.DaProdApp.aggiorna) {
      voceFoglio(carta, "\\u2913", "Aggiorna l'app", "guarda se c'\\u00e8 una versione nuova", function () {
        chiudiFoglio();
        window.DaProdApp.aggiorna();
      });
    }

    // Nel browser è l'unico modo di uscire, quindi c'è. Dentro l'app no: si
    // esce da «Cambia persona», tenendo premuto il nome — un gesto solo per
    // una cosa sola, invece di due tasti di cui uno rotto.
    if (!window.DaProdApp) {
      voceFoglio(carta, "\\u2715", "Scollega questo dispositivo", "per rientrare servir\\u00e0 un codice nuovo", function () {
        if (!confirm("Scollegarti da " + (pannello ? pannello.computer : "questo computer") + "? Per rientrare ti servir\\u00e0 un codice nuovo.")) return;
        chiama("/dispositivi/" + encodeURIComponent(ioId), { method: "DELETE" })
          .catch(function () { /* se il computer non risponde ci si scollega lo stesso */ })
          .then(function () { scollega(false); });
      }, true);
    }

    var versione = document.createElement("p");
    versione.className = "nota";
    versione.textContent =
      "DaProd Suite " + ((suite && suite.versione) || "") +
      " su " + ((suite && suite.computer) || "questo computer") + " \\u00b7 " +
      (suTelefono() ? "versione telefono" : "versione computer");
    carta.append(versione);
  }

  /** Una riga che dice com'è messa la connessione, per la voce del foglio. */
  function frasaConnessione() {
    if (!pannello) return "sto guardando\\u2026";
    var fuori = pannello.indirizzi.some(function (i) { return i.dove === "ovunque"; });
    return pannello.computer + " \\u00b7 " + (fuori ? "raggiungibile da fuori" : "solo in casa");
  }

  /* ------------------------------------------------- come siamo messi */

  function apriComeSiamoMessi() {
    var carta = apriFoglio("Come siamo messi");
    if (!pannello) {
      var vuoto = document.createElement("div");
      vuoto.className = "vuoto";
      vuoto.textContent = "Non riesco a parlare col computer.";
      carta.append(vuoto);
      return;
    }

    var q = document.createElement("div");
    q.className = "quadrati";
    carta.append(q);

    // Due strade diverse per la stessa cosa, e vanno distinte: con Tailscale ci
    // si arriva già da fuori, e il tunnel non serve. Scrivere solo «sì» accanto
    // a un tasto «apri» faceva sembrare che mancasse qualcosa.
    var conTailscale = pannello.indirizzi.some(function (i) {
      return i.dove === "ovunque" && i.base.indexOf("trycloudflare") < 0;
    });
    var conTunnel = pannello.tunnel.fase === "acceso";
    quadratoStato(q, "\\u2302", "Rete di casa", "sempre", "verde", null);
    quadratoStato(
      q,
      "\\u2708",
      "Da fuori casa",
      conTailscale ? "s\\u00ec, con Tailscale" : conTunnel ? "s\\u00ec, dal tunnel" : "no",
      conTailscale || conTunnel ? "verde" : "",
      puoiDecidere
        ? {
            testo: conTunnel ? "chiudi il tunnel" : conTailscale ? "apri anche il tunnel" : "apri il tunnel",
            fai: cambiaTunnel,
          }
        : null,
    );
    var muro = pannello.firewall || { incerto: true };
    quadratoStato(
      q,
      "\\u26E8",
      "Firewall",
      muro.incerto ? "non lo so" : muro.aperta ? "lascia entrare" : "blocca",
      muro.incerto ? "" : muro.aperta ? "verde" : "rosso",
      puoiDecidere && !muro.aperta && !muro.incerto ? { testo: "sblocca", fai: sbloccaLaPorta } : null,
    );
    quadratoStato(
      q,
      "\\u25B8",
      "I lavori partono da soli",
      pannello.codaAutomatica ? "s\\u00ec" : "no",
      pannello.codaAutomatica ? "verde" : "giallo",
      null,
    );

    var titolo = document.createElement("h3");
    titolo.textContent = "Da dove si arriva";
    carta.append(titolo);

    var elenco = document.createElement("ul");
    elenco.className = "voci";
    for (var i of pannello.indirizzi) {
      var li = document.createElement("li");
      var corpo = document.createElement("div");
      corpo.className = "cresce";
      var c = document.createElement("code");
      c.textContent = i.base;
      var d2 = document.createElement("div");
      d2.className = "dettaglio";
      d2.textContent = i.che;
      corpo.append(c, d2);
      var p = document.createElement("span");
      p.className = "pillola" + (i.dove === "ovunque" ? " pronta" : "");
      p.textContent = i.dove === "ovunque" ? "ovunque" : "in casa";
      li.append(corpo, p);
      elenco.append(li);
    }
    carta.append(elenco);

    var nota = document.createElement("p");
    nota.className = "nota";
    nota.textContent =
      "Sulla rete di casa il collegamento \\u00e8 in chiaro: va bene dentro casa. " +
      "Con Tailscale o con la strada da Internet \\u00e8 cifrato.";
    carta.append(nota);
  }

  function quadratoStato(casella, segno, nome, valore, colore, azione) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "quadrato " + (colore || "") + (azione ? "" : " spento");
    var s = document.createElement("span");
    s.className = "segno";
    s.textContent = segno;
    var n = document.createElement("span");
    n.className = "nome";
    n.textContent = nome;
    var v = document.createElement("small");
    v.textContent = valore;
    b.append(s, n, v);
    if (azione) {
      var t = document.createElement("small");
      t.style.color = "var(--accent)";
      t.textContent = azione.testo;
      b.append(t);
      b.addEventListener("click", azione.fai);
    }
    casella.append(b);
  }

  /* ----------------------------------------------------- il computer */

  /**
   * Gli interruttori della macchina. **Solo da DaProdConnessione.**
   *
   * Tre cose, e ognuna risponde a una frase di chi l'ha chiesto:
   *
   * - **la pausa** — «io devo poter usare comunque il computer mentre queste
   *   persone sono collegate». Non ferma quello che sta girando (buttare via
   *   mezz'ora di video sarebbe peggio del problema): non ne fa partire altri.
   * - **chi passa subito** — «un account admin può generare subito senza
   *   aspettare l'ok del pc», e insieme «limitare anche gli admin».
   * - **i due tetti** — «limitarle con un pulsante»: quanti lavori in fila in
   *   tutto, e quanti a testa. Sopra il tetto la richiesta non si perde e non si
   *   rifiuta: resta in attesa, con scritto perché.
   */
  function apriIlComputer() {
    var carta = apriFoglio("Il computer");
    if (!macchina) return;

    var pausa = document.createElement("button");
    pausa.className = "largo" + (macchina.inPausa ? "" : " piano");
    pausa.textContent = macchina.inPausa
      ? "\\u25B6 Riprendi: i lavori possono ripartire"
      : "\\u23F8 Sto usando il computer: metti in pausa";
    pausa.addEventListener("click", async function () {
      pausa.disabled = true;
      try {
        macchina = await chiama("/macchina/pausa", {
          method: "POST",
          body: JSON.stringify({ inPausa: !macchina.inPausa }),
        });
        disegnaPausa();
        apriIlComputer();
      } catch (e) { alert(e.message); pausa.disabled = false; }
    });
    carta.append(pausa);

    var spiega = document.createElement("p");
    spiega.className = "nota";
    spiega.textContent =
      "In pausa quello che sta gi\\u00e0 girando si finisce \\u2014 fermarlo a met\\u00e0 " +
      "vorrebbe dire buttarlo via \\u2014 ma non ne parte altro finch\\u00e9 non riprendi.";
    carta.append(spiega);

    var eChi = document.createElement("label");
    eChi.textContent = "Chi genera senza aspettare il tuo s\\u00ec";
    carta.append(eChi);

    var scelte = [
      { id: "mai", nome: "Nessuno", sotto: "ogni lavoro passa da te" },
      { id: "admin", nome: "Chi \\u00e8 admin", sotto: "gli utenti aspettano il tuo s\\u00ec" },
      { id: "tutti", nome: "Tutti", sotto: "chiunque sia collegato" },
    ];
    var fila = document.createElement("div");
    fila.className = "filtri";
    for (var s of scelte) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (s.id === macchina.regole.chiPassaSubito ? " on" : "");
      b.textContent = s.nome;
      b.title = s.sotto;
      b.addEventListener("click", (function (quale) {
        return function () { void cambiaRegole({ chiPassaSubito: quale }); };
      })(s.id));
      fila.append(b);
    }
    carta.append(fila);

    var eFila = document.createElement("label");
    eFila.textContent = "Quanti lavori possono aspettare in fila, in tutto";
    var campoFila = document.createElement("input");
    campoFila.type = "number";
    campoFila.min = 0;
    campoFila.max = 100;
    campoFila.value = macchina.regole.limiteFila;

    var ePersona = document.createElement("label");
    ePersona.textContent = "Quanti ne pu\\u00f2 avere in fila una persona sola";
    var campoPersona = document.createElement("input");
    campoPersona.type = "number";
    campoPersona.min = 0;
    campoPersona.max = 100;
    campoPersona.value = macchina.regole.limitePersona;

    var salva = document.createElement("div");
    salva.className = "fila";
    var b2 = document.createElement("button");
    b2.textContent = "Salva i tetti";
    b2.addEventListener("click", function () {
      void cambiaRegole({
        limiteFila: Number(campoFila.value) || 0,
        limitePersona: Number(campoPersona.value) || 0,
      });
    });
    salva.append(b2);

    var nota = document.createElement("p");
    nota.className = "nota";
    nota.textContent =
      "Zero vuol dire senza tetto. Sopra il tetto la richiesta non si perde: resta in " +
      "attesa con scritto perch\\u00e9, e parte da sola quando la fila si sgombra.";

    carta.append(eFila, campoFila, ePersona, campoPersona, salva, nota);

    /**
     * **Con quanto contesto caricare il modello che scrive.**
     *
     * Chiesto il 26 agosto 2026: «non c'e' la possibilita' di settare llm a 64k
     * 128 o 256k». Il contesto si paga in memoria — la cache delle chiavi
     * cresce con la lunghezza, e ogni GB che prende e' un GB che non sta ai pesi
     * — quindi il numero giusto dipende dal modello e dalla macchina, e non puo'
     * deciderlo il programma.
     */
    var eContesto = document.createElement("label");
    eContesto.textContent = "Quanto contesto dare al modello che scrive";
    carta.append(eContesto);

    var filaContesto = document.createElement("div");
    filaContesto.className = "filtri";
    var adessoContesto = (macchina.regole && macchina.regole.contestoLlm) || 65536;
    for (var quanto of [32768, 65536, 131072, 262144]) {
      var bc = document.createElement("button");
      bc.type = "button";
      bc.className = "mini" + (quanto === adessoContesto ? " on" : "");
      bc.textContent = Math.round(quanto / 1024) + "K";
      bc.addEventListener("click", (function (quale) {
        return function () { void cambiaContesto(quale); };
      })(quanto));
      filaContesto.append(bc);
    }
    carta.append(filaContesto);

    var notaContesto = document.createElement("p");
    notaContesto.className = "nota";
    notaContesto.textContent =
      "64K e' quello con cui la suite ha lavorato finora, ed e' dieci volte quello che serve a " +
      "finire il testo di una canzone. Piu' contesto vuol dire meno posto per i pesi: su otto GB " +
      "il modello esce dalla scheda video e risponde in minuti invece che in secondi. " +
      "Vale dal prossimo caricamento.";
    carta.append(notaContesto);
  }

  async function cambiaContesto(quanto) {
    var adesso = macchina ? macchina.regole : {};
    try {
      macchina = await chiama("/macchina/regole", {
        method: "POST",
        body: JSON.stringify({
          chiPassaSubito: adesso.chiPassaSubito,
          limiteFila: adesso.limiteFila,
          limitePersona: adesso.limitePersona,
          contestoLlm: quanto,
        }),
      });
      apriIlComputer();
    } catch (e) { alert(e.message); }
  }

  async function cambiaRegole(cambi) {
    var adesso = macchina ? macchina.regole : { chiPassaSubito: "admin", limiteFila: 6, limitePersona: 2 };
    try {
      macchina = await chiama("/macchina/regole", {
        method: "POST",
        body: JSON.stringify({
          chiPassaSubito: cambi.chiPassaSubito || adesso.chiPassaSubito,
          limiteFila: cambi.limiteFila !== undefined ? cambi.limiteFila : adesso.limiteFila,
          limitePersona: cambi.limitePersona !== undefined ? cambi.limitePersona : adesso.limitePersona,
        }),
      });
      apriIlComputer();
    } catch (e) { alert(e.message); }
  }

  /* --------------------------------------------------------- le persone */

  function apriLePersone() {
    var carta = apriFoglio("Le persone");
    var spiega = document.createElement("p");
    spiega.className = "sotto";
    spiega.textContent =
      "Chi è collegato a questo computer. Trascina un file su una persona per mandarglielo, "
      + "o usa il tasto: gli arriva come un pensiero.";
    carta.append(spiega);

    var elenco = document.createElement("ul");
    elenco.className = "voci";
    elenco.id = "dispositivi";
    carta.append(elenco);

    var avviso = document.createElement("div");
    avviso.className = "avviso";
    avviso.id = "avviso-invio";
    carta.append(avviso);

    disegnaDispositivi();
  }

  function disegnaDispositivi() {
    var elenco = document.getElementById("dispositivi");
    if (!elenco || !pannello) return;
    elenco.innerHTML = "";
    for (var d of pannello.dispositivi) elenco.append(rigaDispositivo(d));
    if (!pannello.dispositivi.length) {
      var vuoto = document.createElement("li");
      vuoto.className = "vuoto";
      vuoto.textContent = "Nessuno, per adesso. Usa \\u00abAggiungi una persona\\u00bb.";
      elenco.append(vuoto);
    }
  }

  /**
   * Una persona nell'elenco: **la faccia e il nome sopra, i tasti sotto.**
   *
   * ⚠ Il difetto del 27 agosto 2026, detto dal computer: «nella tab delle
   * persone il pulsante per inviare un pensiero è sotto». Ed era vero, ma non
   * era un tasto scritto nel posto sbagliato: erano **cinque cose messe in
   * fila** dentro una riga che va a capo — la faccia, il nome che cresce, due o
   * tre tastini, e in mezzo a loro la barra dell'invio, larga tutta la riga.
   * Bastava che il nome fosse lungo e i tastini si sparpagliavano su due o tre
   * righe, ognuno a un'altezza diversa, con la barra a spezzarli in mezzo.
   *
   * Adesso sono **due blocchi con un mestiere ciascuno**: chi è (faccia, nome,
   * cosa può fare) e cosa gli si può fare (i tastini, tutti insieme, in fondo).
   * La barra dell'invio sta sotto a tutti e due, che è dove serve: dice a che
   * punto è un file che sta partendo, non è un tasto in mezzo agli altri.
   *
   * Su uno schermo largo i due blocchi stanno affiancati; sotto i 560 px vanno
   * uno sopra l'altro — vedi «ul.voci li .azioni» nel foglio di stile.
   */
  function rigaDispositivo(d) {
    var li = document.createElement("li");
    var faccia = document.createElement("span");
    faccia.className = "faccia-tonda";
    riempiFaccia(faccia, d.nome, "/io/foto/" + encodeURIComponent(d.id));
    var corpo = document.createElement("div");
    corpo.className = "cresce";
    var t = document.createElement("div");
    t.className = "titolo";
    t.textContent = d.nome;
    var s = document.createElement("div");
    s.className = "dettaglio";
    /**
     * **Admin e utente**, e sono queste le due parole.
     *
     * Chiesto il 23 agosto 2026: «cambia il pulsante "fagli solo chiedere" con
     * un "admin" e "utente", questa è la distinzione». Le frasi che spiegavano
     * cosa uno può fare restano — ma sotto, come spiegazione, non al posto del
     * nome della cosa.
     */
    s.textContent =
      (d.ruolo === "admin" ? "Admin \\u2014 fa partire quello che chiede" : "Utente \\u2014 manda richieste") +
      " \\u00b7 visto " + quando(d.ultimoAccesso);
    corpo.append(t, s);

    // Chi è: la faccia e il nome, sempre insieme. Senza questo involucro la
    // faccia e il nome erano due elementi indipendenti della riga, e andavano
    // a capo separatamente — una faccia sola su una riga, il nome sull'altra.
    var chiE = document.createElement("div");
    chiE.className = "chi-e";
    chiE.append(faccia, corpo);
    li.append(chiE);

    // Cosa gli si può fare: i tastini stanno **qui dentro**, tutti, e questo
    // riquadro va a capo intero invece di sfaldarsi un tasto per volta.
    var azioni = document.createElement("div");
    azioni.className = "azioni";
    li.append(azioni);

    if (puoiDecidere) {
      if (d.id !== ioId) {
        var permesso = document.createElement("button");
        permesso.className = "mini";
        permesso.textContent = d.ruolo === "admin" ? "rendilo utente" : "rendilo admin";
        permesso.addEventListener("click", function () {
          var nuovo = d.ruolo === "admin" ? "ospite" : "admin";
          var domanda = nuovo === "admin"
            ? d.nome + " diventa admin: quello che chiede parte da solo, e pu\\u00f2 decidere sulle richieste degli altri. Sicuro?"
            : d.nome + " torna utente: mander\\u00e0 richieste e aspetter\\u00e0 il tuo s\\u00ec. Va bene?";
          if (!confirm(domanda)) return;
          chiama("/dispositivi/" + encodeURIComponent(d.id), {
            method: "POST",
            body: JSON.stringify({ ruolo: nuovo }),
          })
            .then(leggiPannello)
            .then(disegnaDispositivi)
            .catch(function (e) { alert(e.message); });
        });
        azioni.append(permesso);
      }

      var via = document.createElement("button");
      via.className = "mini male";
      via.textContent = "disconnetti";
      via.addEventListener("click", function () {
        if (!confirm("Disconnettere " + d.nome + "? Per rientrare gli servir\\u00e0 un codice nuovo.")) return;
        chiama("/dispositivi/" + encodeURIComponent(d.id), { method: "DELETE" })
          .then(leggiPannello)
          .then(disegnaDispositivi)
          .catch(function (e) { alert(e.message); });
      });
      azioni.append(via);

      // Su un telefono non si trascina niente: con l'input nascosto il gesto
      // c'è su tutti e due, e sul computer restano tutti e due.
      var scegli = document.createElement("input");
      scegli.type = "file";
      scegli.hidden = true;
      scegli.addEventListener("change", function () {
        var file = scegli.files && scegli.files[0];
        if (file) mandaFile(d, file, barra, dentro);
        scegli.value = "";
      });
      var mandaUno = document.createElement("button");
      mandaUno.className = "mini acceso";
      // «Un pensiero», non «un file»: è come si chiama dappertutto — in
      // Galleria, nella notifica che arriva sul telefono, nella bacheca. Una
      // cosa sola non può avere due nomi a seconda della schermata.
      mandaUno.textContent = "mandagli un pensiero";
      mandaUno.addEventListener("click", function () { scegli.click(); });
      azioni.append(mandaUno, scegli);

      // **Trascinaci sopra un file e glielo mandi.** Chiesto così, ed è il
      // gesto più corto che ci sia: niente moduli, niente «scegli file». La
      // barra sta in fondo alla riga, sotto ai tasti: dice a che punto è
      // l'invio, e in mezzo ai tasti li spezzava in due.
      var barra = document.createElement("div");
      barra.className = "barra-invio";
      barra.hidden = true;
      var dentro = document.createElement("i");
      barra.append(dentro);
      li.append(barra);

      li.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        li.classList.add("cade");
      });
      li.addEventListener("dragleave", function () { li.classList.remove("cade"); });
      li.addEventListener("drop", function (ev) {
        ev.preventDefault();
        li.classList.remove("cade");
        var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
        if (file) mandaFile(d, file, barra, dentro);
      });
    }
    return li;
  }

  /**
   * Manda un file a una persona collegata.
   *
   * Con XMLHttpRequest e non con fetch, per una ragione sola: fetch non sa
   * dire a che punto è. Su un video da cento MB, una pagina ferma e nessuna
   * barra dicono la stessa cosa — cioè che si è rotto qualcosa.
   */
  function mandaFile(d, file, barra, dentro) {
    var avviso = document.getElementById("avviso-invio");
    if (!avviso) return;
    avviso.className = "avviso";
    avviso.textContent = "Mando " + file.name + " a " + d.nome + "\\u2026";
    barra.hidden = false;
    dentro.style.width = "0%";

    var messaggio = "";
    var xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      "/invii?a=" + encodeURIComponent(d.id) +
        "&nome=" + encodeURIComponent(file.name) +
        "&messaggio=" + encodeURIComponent(messaggio),
    );
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = function (ev) {
      if (!ev.lengthComputable) return;
      dentro.style.width = Math.round((ev.loaded / ev.total) * 100) + "%";
    };
    xhr.onload = function () {
      barra.hidden = true;
      if (xhr.status >= 200 && xhr.status < 300) {
        avviso.textContent = file.name + " \\u00e8 arrivato a " + d.nome + ".";
        avviso.className = "avviso bene";
      } else {
        var motivo = "";
        try { motivo = JSON.parse(xhr.responseText).errore; } catch (e) { motivo = ""; }
        avviso.textContent = motivo || ("Non ce l'ho fatta (errore " + xhr.status + ").");
        avviso.className = "avviso male";
      }
    };
    xhr.onerror = function () {
      barra.hidden = true;
      avviso.textContent = "La connessione si \\u00e8 interrotta.";
      avviso.className = "avviso male";
    };
    xhr.send(file);
  }

  /* ------------------------------------------------------------ inviti */

  function apriInviti() {
    var carta = apriFoglio("Aggiungi una persona");
    var spiega = document.createElement("p");
    spiega.className = "sotto";
    spiega.textContent = "Il codice dura pochi minuti. Chi lo usa entra con il suo nome, che dev'essere libero.";
    carta.append(spiega);

    var fila = document.createElement("div");
    fila.className = "fila";
    var uno = document.createElement("button");
    uno.className = "mini";
    uno.textContent = "Per una persona";
    uno.addEventListener("click", function () { invita("ospite", 1); });
    var tanti = document.createElement("button");
    tanti.className = "mini";
    tanti.textContent = "Per dieci persone";
    tanti.addEventListener("click", function () { invita("ospite", 10); });
    var decide = document.createElement("button");
    decide.className = "mini";
    decide.textContent = "Per chi deve anche decidere";
    decide.addEventListener("click", function () { invita("admin", 1); });
    fila.append(uno, tanti, decide);
    carta.append(fila);

    var riquadro = document.createElement("div");
    riquadro.className = "qr";
    riquadro.id = "riquadro-qr";
    riquadro.hidden = true;
    var img = document.createElement("img");
    img.id = "qr";
    img.alt = "Codice da inquadrare";
    var lato = document.createElement("div");
    var codice = document.createElement("div");
    codice.className = "codice";
    codice.id = "codice-invito";
    codice.textContent = "\\u2014";
    var scade = document.createElement("div");
    scade.className = "dettaglio";
    scade.id = "scade-invito";
    var comeSi = document.createElement("div");
    comeSi.className = "dettaglio";
    comeSi.style.marginTop = "10px";
    comeSi.textContent = "Se il QR non va, sul telefono si scrivono questi due:";
    var indirizzo = document.createElement("div");
    indirizzo.className = "dettaglio";
    indirizzo.style.marginTop = "4px";
    var codiceIndirizzo = document.createElement("code");
    codiceIndirizzo.id = "indirizzo-invito";
    codiceIndirizzo.textContent = "\\u2014";
    indirizzo.append(codiceIndirizzo);
    lato.append(codice, scade, comeSi, indirizzo);
    riquadro.append(img, lato);
    carta.append(riquadro);

    var avviso = document.createElement("div");
    avviso.className = "avviso";
    avviso.id = "avviso-invito";
    carta.append(avviso);
  }

  async function invita(ruolo, quante) {
    var avviso = document.getElementById("avviso-invito");
    if (avviso) { avviso.className = "avviso"; avviso.textContent = "Preparo l'invito\\u2026"; }
    try {
      var invito = await chiama("/pannello/invito", {
        method: "POST",
        body: JSON.stringify({ ruolo: ruolo, quante: quante }),
      });
      var riquadro = document.getElementById("riquadro-qr");
      if (!riquadro) return;
      riquadro.hidden = false;
      document.getElementById("qr").src = invito.qr;
      document.getElementById("codice-invito").textContent = invito.codice;
      if (avviso) avviso.textContent = "";
      var primo = pannello && pannello.indirizzi[0];
      document.getElementById("indirizzo-invito").textContent = primo ? primo.base : "\\u2014";
      contaAllaRovescia(invito.scade, invito.restano);
    } catch (e) {
      if (avviso) { avviso.textContent = e.message; avviso.className = "avviso male"; }
    }
  }

  function contaAllaRovescia(scade, restano) {
    if (orologioInvito) clearInterval(orologioInvito);
    var battito = function () {
      var box = document.getElementById("scade-invito");
      if (!box) { clearInterval(orologioInvito); orologioInvito = null; return; }
      var mancano = Math.max(0, Math.round((scade - Date.now()) / 1000));
      if (mancano <= 0) {
        clearInterval(orologioInvito);
        orologioInvito = null;
        box.textContent = "scaduto \\u2014 fanne un altro";
        return;
      }
      box.textContent =
        "vale ancora " + Math.floor(mancano / 60) + ":" + ("0" + (mancano % 60)).slice(-2) +
        (restano > 1 ? " \\u00b7 per " + restano + " persone" : "");
    };
    battito();
    orologioInvito = setInterval(battito, 1000);
  }

  /* --------------------------------------------------------- il pannello */

  async function leggiPannello() {
    pannello = await chiama("/pannello");
    puoiDecidere = pannello.puoiDecidere === true;
    disegnaSemaforo();
    disegnaNumeri();
    // Il foglio delle persone, se è aperto, si aggiorna da sé: qualcuno può
    // essersi collegato mentre lo si guardava.
    disegnaDispositivi();
  }

  async function cambiaTunnel() {
    if (!pannello) return;
    var acceso = pannello.tunnel.fase === "acceso";
    try {
      pannello = await chiama("/pannello/tunnel", {
        method: "POST",
        body: JSON.stringify({ acceso: !acceso }),
      });
      disegnaSemaforo();
      if (document.getElementById("foglio")) apriComeSiamoMessi();
    } catch (e) { alert(e.message); }
  }

  async function sbloccaLaPorta() {
    try {
      var esito = await chiama("/pannello/porta", { method: "POST", body: "{}" });
      if (!esito.ok && esito.errore) alert(esito.errore);
      await leggiPannello();
      if (document.getElementById("foglio")) apriComeSiamoMessi();
    } catch (e) { alert(e.message); }
  }
`;
