/**
 * Il lettore: una fila di cose da guardare e da ascoltare, e non un file per volta.
 *
 * ## Cosa c'era prima, e perché non bastava
 *
 * Fino alla 0.8.2 toccare una cosa in galleria apriva **la lente**: un
 * riquadro a schermo intero con dentro quella cosa e due tasti. Chiuso il
 * riquadro, finita la musica. Per ascoltare tre brani di fila bisognava
 * aprirne uno, aspettare, chiudere, aprire il prossimo — e uscendo dall'app il
 * suono si fermava.
 *
 * Chiesto il 5 settembre 2026, tutto insieme perché è una cosa sola:
 *
 * > «implementiamo il visualizer sull'app android: quando si riproduce una
 * > canzone lo sfondo del visualizer parte sullo sfondo in random e effetti
 * > shuffle, con anche un tasto per mettere la visual a schermo intero; fare in
 * > modo che trascinando verso il basso o l'alto si chiude il contenuto dallo
 * > schermo intero; fare in modo che la riproduzione continui anche se
 * > minimizzato, con anche la possibilità di aggiungere contenuti in coda così
 * > posso ascoltare più canzoni una dietro l'altra; i video in coda pure devono
 * > far vedere il video bene e le immagini durano una decina di secondi.»
 *
 * ## Le decisioni, e il perché di ognuna
 *
 * **Una fila sola per tutti e tre i tipi.** Brani, video e immagini stanno
 * nella stessa coda. Sembra strano finché non si guarda cosa produce questa
 * suite: una serata di lavoro lascia tre canzoni, due clip e dodici immagini,
 * e volerle rivedere in fila è la cosa normale. Ognuno dura quello che deve:
 * un brano e un video finiscono da soli, **un'immagine dura dieci secondi** —
 * un'immagine non ha una fine, e senza un tempo la fila si ferma lì.
 *
 * **Il visualizer sta sullo sfondo, non in una scheda.** È la differenza fra
 * una funzione e un'atmosfera: mentre si guarda la galleria, o si scrive una
 * richiesta, dietro c'è la musica che si muove. A schermo intero ci va con un
 * tasto, e da lì si esce **trascinando**, su o giù, che è il gesto che ogni
 * app di foto ha insegnato a tutti.
 *
 * **Gli effetti si cambiano da soli.** Uno a caso quando parte un brano, e uno
 * nuovo ogni tanto: un visualizer che fa sempre la stessa cosa lo si guarda
 * due volte. Il tasto per cambiarlo a mano c'è lo stesso.
 *
 * **Niente librerie.** Il disegno è un canvas 2D e l'analisi è Web Audio, tutti
 * e due dentro il browser. La regola di questa cartella non cambia perché
 * arriva una cosa bella: una pagina che chiama fuori è una pagina che non
 * funziona quando la linea è giù.
 *
 * **Il suono che continua** quando si minimizza non si può fare da qui: lo fa
 * l'app, tenendo vivo il processo con un servizio in primo piano e mettendo i
 * comandi sulla schermata di blocco. Questa pagina glielo dice, e basta —
 * vedi `window.DaProdApp.suonando`.
 *
 * Le regole del file valgono anche qui: niente backtick, niente template
 * literal. Questo file *è* un template literal.
 */
export const COPIONE_LETTORE = `
  /* ------------------------------------------------------------- la fila */

  /** Quello che c'è in fila, in ordine. */
  var coda = [];

  /** Quale sta suonando adesso. -1 vuol dire nessuno. */
  var inCoda = -1;

  /** L'elemento che sta suonando: un audio o un video. */
  var suonante = null;

  /** Il tempo che tiene su un'immagine prima di passare alla prossima. */
  var orologioImmagine = null;

  /** Quanto dura un'immagine in fila: dieci secondi, come chiesto. */
  var DURATA_IMMAGINE = 10000;

  /** Vero quando il palco a schermo intero è aperto. */
  var palcoAperto = false;

  /* ---------------------------------------------------------- il visualizer */

  var contestoAudio = null;
  var analizzatore = null;
  var datiSpettro = null;
  /** L'elemento già collegato al contesto audio: collegarlo due volte solleva. */
  var giaCollegato = null;
  var disegnoVivo = null;
  var effettoOra = 0;
  var orologioEffetti = null;
  var partitoIl = 0;

  /**
   * Gli effetti. Cinque, e ognuno guarda il suono in un modo diverso.
   *
   * Non sono cinque temi di colore: uno segue le frequenze basse, uno le alte,
   * uno il volume complessivo. Cambiando effetto cambia **cosa si vede della
   * stessa canzone**, ed è il motivo per cui vale la pena averne più di uno.
   */
  var EFFETTI = ["onde", "barre", "cerchio", "polvere", "nebbia"];

  /* ------------------------------------------------------------ metterci roba */

  /**
   * Mette una cosa in fila. Se non sta suonando niente, parte.
   *
   * Torna il posto che ha preso, così chi chiama può dire «terza in fila»
   * invece di «aggiunta»: un tasto che dice sempre la stessa cosa non fa capire
   * se è stato premuto.
   */
  function accoda(v) {
    coda.push(v);
    disegnaBarra();
    if (inCoda < 0) suonaIlNumero(coda.length - 1);
    return coda.length;
  }

  /** Butta la fila e parte da questa. */
  function suonaSubito(v) {
    coda = [v];
    suonaIlNumero(0);
  }

  /**
   * Mette in fila tutto quello che si sta guardando, partendo da una.
   *
   * È il gesto che rende la galleria un lettore: si tocca una cosa e da lì in
   * poi vanno tutte, come in qualunque app di musica. Le cose che non si
   * possono suonare — un file di testo, un progetto — restano fuori.
   */
  function accodaTutto(elenco, daQui) {
    var buoni = elenco.filter(function (x) {
      return x.tipo === "audio" || x.tipo === "video" || x.tipo === "immagine";
    });
    var partenza = 0;
    for (var i = 0; i < buoni.length; i++) {
      if (buoni[i].id === daQui.id) { partenza = i; break; }
    }
    coda = buoni;
    suonaIlNumero(partenza);
  }

  /* ------------------------------------------------------------- suonare */

  function suonaIlNumero(i) {
    if (i < 0 || i >= coda.length) { fermaTutto(); return; }
    inCoda = i;
    var v = coda[i];

    fermaLElementoDiPrima();

    if (v.tipo === "immagine") {
      // Un'immagine non finisce da sola: la si tiene dieci secondi e si passa.
      orologioImmagine = setTimeout(prossimo, DURATA_IMMAGINE);
      spegniIlVisualizer();
    } else {
      var elemento = document.createElement(v.tipo === "video" ? "video" : "audio");
      elemento.src = indirizzoDi(v);
      elemento.autoplay = true;
      elemento.playsInline = true;
      // **Senza crossOrigin**, e non è una dimenticanza: la pagina e i file
      // vengono dallo stesso posto, e chiedere il CORS a sé stessi vuol dire
      // che Web Audio rifiuta di analizzare il suono («tainted»).
      elemento.addEventListener("ended", prossimo);
      elemento.addEventListener("error", prossimo);
      elemento.addEventListener("play", function () { disegnaBarra(); diAllApp(true); });
      elemento.addEventListener("timeupdate", disegnaIlTempo);
      elemento.addEventListener("loadedmetadata", disegnaIlTempo);
      elemento.addEventListener("pause", function () { disegnaBarra(); diAllApp(false); });
      // Un video sta nel palco e si guarda; un audio non ha niente da mostrare
      // e resta attaccato al documento, dove nessuno lo vede.
      elemento.style.display = v.tipo === "video" ? "block" : "none";
      document.body.append(elemento);
      suonante = elemento;

      if (v.tipo === "audio") accendiIlVisualizer(elemento);
      else spegniIlVisualizer();
    }

    disegnaBarra();
    disegnaPalco();
    diAllApp(true);
  }

  function fermaLElementoDiPrima() {
    if (orologioImmagine) { clearTimeout(orologioImmagine); orologioImmagine = null; }
    if (!suonante) return;
    try { suonante.pause(); } catch (e) { /* già ferma */ }
    suonante.removeAttribute("src");
    if (suonante.parentNode) suonante.remove();
    suonante = null;
  }

  function prossimo() {
    if (inCoda + 1 >= coda.length) { finitaLaFila(); return; }
    suonaIlNumero(inCoda + 1);
  }

  /**
   * La fila e' finita, ma non e' sparita.
   *
   * ⚠ La prima stesura qui chiamava «fermaTutto», che svuota la coda: ascoltate
   * tre canzoni, alla fine dell'ultima non restava niente — nessuna barra,
   * niente da premere per risentirle. Sbagliato, e per un motivo che vale la
   * pena scrivere: **finire non e' chiudere.** Un lettore che arriva in fondo
   * resta li' con il dito sul play, e chi vuole andarsene chiude lui.
   */
  function finitaLaFila() {
    fermaLElementoDiPrima();
    spegniIlVisualizer();
    disegnaBarra();
    diAllApp(false);
  }

  function precedente() {
    /**
     * Indietro **due volte** vuol dire il brano prima.
     *
     * La prima volta torna all'inizio di questo, che è quello che fa ogni
     * lettore da trent'anni: si preme indietro quando si è persa una strofa,
     * non quando si vuole cambiare canzone. Dopo tre secondi la regola cambia.
     */
    if (suonante && suonante.currentTime > 3) { suonante.currentTime = 0; return; }
    if (inCoda > 0) suonaIlNumero(inCoda - 1);
    else if (suonante) suonante.currentTime = 0;
  }

  function fermaTutto() {
    fermaLElementoDiPrima();
    spegniIlVisualizer();
    inCoda = -1;
    coda = [];
    palcoAperto = false;
    disegnaBarra();
    disegnaPalco();
    diAllApp(false);
  }

  function pausaOSuona() {
    // Niente elemento vuol dire due cose, e tutte e due si curano rifacendo
    // partire questa: o la fila e' finita, o quello che c'e' e' un'immagine.
    if (!suonante) {
      if (inCoda >= 0) suonaIlNumero(inCoda);
      return;
    }
    if (suonante.paused) { void suonante.play(); } else { suonante.pause(); }
  }

  /**
   * Dice all'app che sta suonando qualcosa (o che ha smesso).
   *
   * Serve a una cosa che una pagina non può fare da sé: **tenere vivo il suono
   * quando l'app va in secondo piano**. L'app accende un servizio in primo
   * piano e mette i comandi sulla schermata di blocco; senza, Android è libero
   * di spegnere il processo dopo un minuto e la musica si ferma a metà.
   *
   * Nel browser non c'è nessuno ad ascoltare, e va bene così: un browser
   * minimizzato la musica la tiene da solo.
   */
  function diAllApp(sta) {
    if (!window.DaProdApp || !window.DaProdApp.suonando) return;
    var v = inCoda >= 0 ? coda[inCoda] : null;
    try {
      window.DaProdApp.suonando(
        sta && !!v,
        v ? (v.didascalia || v.nome || "") : "",
        v ? (v.chiNome || "") : "",
      );
    } catch (e) { /* un'app vecchia non ce l'ha: non è un motivo per fermarsi */ }
  }

  /**
   * I comandi che arrivano da fuori: la schermata di blocco, le cuffie.
   *
   * L'app chiama queste, non tocca gli elementi: è l'unico modo perché il tasto
   * sulle cuffie e il tasto sulla barra facciano **la stessa** cosa.
   */
  window.DaProdLettore = {
    pausaOSuona: pausaOSuona,
    prossimo: prossimo,
    precedente: precedente,
    ferma: fermaTutto,
  };

  /* ------------------------------------------------------------- la barra */

  /**
   * La riga in fondo che dice cosa sta suonando.
   *
   * Sta **sopra** alle schede e non al posto loro: mentre si ascolta si
   * continua a girare per l'app, ed è tutto il punto di avere una fila.
   */
  function disegnaBarra() {
    var barra = $("barra-lettore");
    if (!barra) return;
    if (inCoda < 0) { barra.hidden = true; document.body.classList.remove("consuono"); return; }
    var v = coda[inCoda];
    barra.hidden = false;
    document.body.classList.add("consuono");

    var faccia = $("lettore-faccia");
    if (v.anteprima) {
      faccia.style.backgroundImage = "url(" + anteprimaDi(v) + ")";
      faccia.textContent = "";
    } else {
      faccia.style.backgroundImage = "";
      faccia.textContent = v.tipo === "video" ? "\\u25B6" : (v.tipo === "immagine" ? "\\u25A3" : "\\u266B");
    }
    $("lettore-nome").textContent = v.didascalia || v.nome;
    $("lettore-sotto").textContent =
      (inCoda + 1) + " di " + coda.length +
      (v.chiNome ? " \\u00b7 " + v.chiNome : "");
    $("lettore-play").textContent = (suonante && !suonante.paused) ? "\\u23F8" : "\\u25B6";
    var pl = $("palco-play");
    if (pl) pl.textContent = (suonante && !suonante.paused) ? "\\u23F8" : "\\u25B6";
  }

  /* -------------------------------------------------------------- il palco */

  /**
   * Il palco: la cosa che suona, grande quanto lo schermo.
   *
   * Non è la lente di prima con un nome nuovo. La lente apriva **un file** e
   * chiudendola finiva tutto; il palco è una finestra su una fila che va avanti
   * lo stesso — si apre, si chiude, e la musica non se ne accorge.
   */
  function disegnaPalco() {
    var palco = $("palco");
    if (!palco) return;
    palco.hidden = !palcoAperto || inCoda < 0;
    if (palco.hidden) return;

    var v = coda[inCoda];
    var dentro = $("palco-dentro");
    dentro.innerHTML = "";

    if (v.tipo === "video" && suonante) {
      suonante.controls = true;
      dentro.append(suonante);
    } else if (v.tipo === "immagine") {
      var img = document.createElement("img");
      img.src = indirizzoDi(v);
      img.alt = v.nome;
      dentro.append(img);
    } else if (v.anteprima) {
      var cop = document.createElement("img");
      cop.className = "copertinona";
      cop.src = anteprimaDi(v);
      cop.alt = v.nome;
      dentro.append(cop);
    }

    $("palco-nome").textContent = v.didascalia || v.nome;
    $("palco-sotto").textContent =
      (inCoda + 1) + " di " + coda.length + (v.chiNome ? " \\u00b7 " + v.chiNome : "");
    $("palco-effetto").textContent = "\\u2732";
    $("palco-effetto").title = "Effetto: " + EFFETTI[effettoOra];
    // La barra del tempo non ha senso su un'immagine: dieci secondi fissi non
    // sono un tempo dentro cui spostarsi.
    $("palco-tempo").hidden = v.tipo === "immagine";
    disegnaIlTempo();
  }

  /**
   * Dove siamo nel brano, e quanto dura.
   *
   * ⚠ Chiesto il 5 settembre 2026: «lo swipe funziona in galleria, ma non e'
   * possibile andare avanti e indietro nel tempo della canzone». Non c'era
   * proprio: il palco aveva tre tasti e nessuna barra, perche' la 0.9.0 si
   * appoggiava ai controlli del browser — e a schermo intero quelli non ci sono.
   *
   * La barra si muove **solo quando non la stai trascinando**: senza quella
   * riga il dito la sposta e il brano la rimette indietro trenta volte al
   * secondo, e prendere un punto diventa impossibile.
   */
  function disegnaIlTempo() {
    var barra = $("palco-barra");
    if (!barra || !suonante || !isFinite(suonante.duration)) return;
    if (!stoTrascinando) {
      barra.value = String(Math.round((suonante.currentTime / suonante.duration) * 1000));
    }
    $("palco-ora").textContent = comeOrologio(suonante.currentTime);
    $("palco-durata").textContent = comeOrologio(suonante.duration);
  }

  /** Vero mentre il dito sta sulla barra del tempo. */
  var stoTrascinando = false;

  function comeOrologio(secondi) {
    if (!isFinite(secondi)) return "0:00";
    var m = Math.floor(secondi / 60);
    var s = Math.floor(secondi % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /** Porta il brano dove dice la barra. */
  function vaiAlPunto() {
    var barra = $("palco-barra");
    if (!suonante || !isFinite(suonante.duration)) return;
    suonante.currentTime = (Number(barra.value) / 1000) * suonante.duration;
  }

  /** La fila, come elenco: si tocca una riga e si salta li'. */
  function apriLaFila() {
    var carta = apriFoglio("In fila \\u00b7 " + coda.length);
    coda.forEach(function (v, i) {
      voceFoglio(
        carta,
        i === inCoda ? "\\u25B6" : String(i + 1),
        v.didascalia || v.nome,
        (v.tipo === "audio" ? "brano" : v.tipo === "video" ? "video" : "immagine") +
          (v.chiNome ? " \\u00b7 " + v.chiNome : ""),
        (function (quale) {
          return function () { chiudiFoglio(); suonaIlNumero(quale); };
        })(i),
      );
    });
  }

  function apriPalco() {
    if (inCoda < 0) return;
    palcoAperto = true;
    disegnaPalco();
    // Il disegno vive con il palco: si accende qui e si spegne chiudendolo.
    if (analizzatore && !disegnoVivo) disegnoVivo = requestAnimationFrame(disegna);
  }

  /**
   * **Abbassa, non ferma.** Chiesto il 5 settembre 2026: «se swipo continua la
   * riproduzione da abbassato e posso continuare a usare l'app».
   *
   * E' quello che questa funzione ha sempre fatto — il palco e' una finestra su
   * una fila che va avanti lo stesso — ma non si vedeva: chiudendolo restava
   * solo la barra in fondo, e sembrava che si fosse spento tutto. Adesso c'e'
   * anche il tasto con la freccia in giu', che dice cosa succede.
   */
  function chiudiPalco() {
    palcoAperto = false;
    if (disegnoVivo) { cancelAnimationFrame(disegnoVivo); disegnoVivo = null; }
    // Un video torna nel documento, nascosto: se restasse dentro al palco
    // sparirebbe con lui, e con lui sparirebbe il suono.
    if (suonante && suonante.tagName === "VIDEO") {
      suonante.controls = false;
      suonante.style.display = "none";
      document.body.append(suonante);
    }
    disegnaPalco();
  }

  /**
   * Trascinare su o giù chiude, come in ogni app di foto.
   *
   * Novanta pixel è la soglia: sotto, è uno scorrimento involontario mentre si
   * cerca un tasto; sopra, è una persona che sta chiudendo. Mentre si trascina
   * il palco segue il dito — senza, il gesto non si sa se sta funzionando.
   */
  function aggangiaIlTrascinamento(palco) {
    var partenza = null;
    var dentro = $("palco-dentro");

    palco.addEventListener("touchstart", function (ev) {
      if (ev.touches.length !== 1) { partenza = null; return; }
      /**
       * Il dito sulla barra del tempo **non trascina il palco**.
       *
       * Senza questa riga, spostarsi dentro una canzone chiudeva il palco: il
       * movimento del dito e' orizzontale, ma basta un pixel in verticale
       * perche' il palco creda che lo si stia buttando giu'.
       */
      var sopra = ev.target;
      while (sopra && sopra !== palco) {
        if (sopra.id === "palco-tempo" || sopra.tagName === "INPUT") { partenza = null; return; }
        sopra = sopra.parentElement;
      }
      partenza = ev.touches[0].clientY;
    }, { passive: true });

    /**
     * ⚠ **Non passivo, e non e' un dettaglio.**
     *
     * Il difetto del 5 settembre 2026: «quando mi trovo in daprod e clicco su
     * un contenuto, se swipo con il dito in alto e in basso mentre ho un
     * contenuto a schermo intero, muove la pagina dietro — mentre invece vorrei
     * trascinasse il contenuto in basso».
     *
     * La causa era qui: con «passive: true» il browser **non lascia**
     * chiamare «preventDefault», e il gesto scorre la pagina sotto mentre il
     * contenuto si muove per conto suo. Sono due movimenti insieme, e quello
     * che si vede e' la pagina.
     *
     * Passivo a falso costa qualche microsecondo per evento e in cambio il
     * gesto e' uno solo. Si ferma **solo il movimento verticale**: se uno sta
     * scorrendo di lato dentro al contenuto, quello deve continuare a
     * funzionare.
     */
    palco.addEventListener("touchmove", function (ev) {
      if (partenza === null || ev.touches.length !== 1) return;
      var quanto = ev.touches[0].clientY - partenza;
      if (Math.abs(quanto) > 6 && ev.cancelable) ev.preventDefault();
      dentro.style.transform = "translateY(" + quanto + "px)";
      dentro.style.opacity = String(Math.max(0.25, 1 - Math.abs(quanto) / 400));
    }, { passive: false });

    var finito = function (ev) {
      if (partenza === null) return;
      var finale = ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0].clientY : partenza;
      var quanto = finale - partenza;
      partenza = null;
      dentro.style.transform = "";
      dentro.style.opacity = "";
      if (Math.abs(quanto) > 90) chiudiPalco();
    };
    palco.addEventListener("touchend", finito, { passive: true });
    palco.addEventListener("touchcancel", function () {
      partenza = null;
      dentro.style.transform = "";
      dentro.style.opacity = "";
    }, { passive: true });
  }

  /* -------------------------------------------------------- il visualizer */

  /**
   * Accende l'analisi e il disegno.
   *
   * Il contesto audio si crea **una volta sola** e si riusa: un browser ne
   * concede pochi, e crearne uno per canzone finisce con il silenzio dopo la
   * sesta. Ogni elemento invece va collegato una volta e una sola — collegarlo
   * due volte solleva, ed è il motivo della variabile «giaCollegato».
   */
  function accendiIlVisualizer(elemento) {
    try {
      var Contesto = window.AudioContext || window.webkitAudioContext;
      if (!Contesto) return;
      if (!contestoAudio) contestoAudio = new Contesto();
      // I browser tengono il contesto sospeso finché non c'è un tocco: qui il
      // tocco c'è appena stato (si è premuto per far partire), quindi riprende.
      if (contestoAudio.state === "suspended") void contestoAudio.resume();
      if (!analizzatore) {
        analizzatore = contestoAudio.createAnalyser();
        analizzatore.fftSize = 512;
        analizzatore.smoothingTimeConstant = 0.75;
        analizzatore.connect(contestoAudio.destination);
        datiSpettro = new Uint8Array(analizzatore.frequencyBinCount);
      }
      if (giaCollegato !== elemento) {
        contestoAudio.createMediaElementSource(elemento).connect(analizzatore);
        giaCollegato = elemento;
      }
    } catch (e) {
      // Niente Web Audio su questo browser: il visualizer si disegna lo stesso,
      // muovendosi da solo. Meglio di uno sfondo nero.
      analizzatore = null;
    }

    cambiaEffetto(true);
    if (orologioEffetti) clearInterval(orologioEffetti);
    /**
     * Un effetto nuovo ogni venticinque secondi.
     *
     * Chiesto «effetti shuffle». Venticinque secondi è più o meno una strofa:
     * cambiare più spesso stanca, cambiare più di rado non si nota.
     */
    orologioEffetti = setInterval(function () { cambiaEffetto(true); }, 25000);

    partitoIl = performance.now();
    // Il disegno gira **solo con il palco aperto**: un canvas che ridisegna
    // sessanta volte al secondo dietro a un palco chiuso e' batteria buttata,
    // e dalla 0.9.1 il visualizer si vede solo li'.
    if (palcoAperto && !disegnoVivo) disegnoVivo = requestAnimationFrame(disegna);
  }

  function spegniIlVisualizer() {
    if (orologioEffetti) { clearInterval(orologioEffetti); orologioEffetti = null; }
    if (disegnoVivo) { cancelAnimationFrame(disegnoVivo); disegnoVivo = null; }
  }

  /** Un effetto a caso, diverso da quello di adesso. */
  function cambiaEffetto(aCaso) {
    if (aCaso) {
      var scelto = effettoOra;
      // Un «a caso» che può ridare lo stesso non sembra a caso: sembra rotto.
      for (var giri = 0; giri < 8 && scelto === effettoOra; giri++) {
        scelto = Math.floor(Math.random() * EFFETTI.length);
      }
      effettoOra = scelto;
    } else {
      effettoOra = (effettoOra + 1) % EFFETTI.length;
    }
    var nome = $("palco-effetto");
    if (nome) nome.textContent = EFFETTI[effettoOra];
  }

  /**
   * Un fotogramma.
   *
   * Il canvas si ridimensiona **qui** e non su resize: su un telefono la
   * finestra cambia altezza ogni volta che compare la tastiera o la barra
   * dell'indirizzo, e un ascoltatore di resize su un canvas a schermo intero è
   * il modo più semplice di far scattare tutto.
   */
  function disegna() {
    disegnoVivo = requestAnimationFrame(disegna);
    var tela = $("visual");
    if (!tela || tela.hidden) return;
    var ctx = tela.getContext("2d");
    if (!ctx) return;

    /**
     * Si disegna a metà risoluzione, apposta.
     *
     * Su un telefono con schermo ad alta densità un canvas a piena risoluzione
     * vuol dire quattro volte i pixel da riempire sessanta volte al secondo, e
     * il risultato è una pagina che scatta mentre si scorre. Metà risoluzione,
     * su una cosa fatta di sfumature e di macchie, non si distingue.
     */
    var larga = Math.floor(tela.clientWidth * 0.5);
    var alta = Math.floor(tela.clientHeight * 0.5);
    if (larga < 2 || alta < 2) return;
    if (tela.width !== larga || tela.height !== alta) {
      tela.width = larga;
      tela.height = alta;
    }

    if (analizzatore && datiSpettro) analizzatore.getByteFrequencyData(datiSpettro);
    var t = (performance.now() - partitoIl) / 1000;

    ctx.clearRect(0, 0, larga, alta);
    var quale = EFFETTI[effettoOra];
    if (quale === "onde") onde(ctx, larga, alta, t);
    else if (quale === "barre") barre(ctx, larga, alta, t);
    else if (quale === "cerchio") cerchio(ctx, larga, alta, t);
    else if (quale === "polvere") polvere(ctx, larga, alta, t);
    else nebbia(ctx, larga, alta, t);
  }

  /**
   * Quanto forte va, da 0 a 1, in una banda.
   *
   * Senza analizzatore si finge: una sinusoide lenta. Uno sfondo che si muove
   * senza seguire la musica è meglio di uno sfondo fermo, e capita su qualche
   * browser vecchio dove Web Audio non c'è.
   */
  function forza(da, a, t, sfasa) {
    if (!datiSpettro) return 0.35 + 0.25 * Math.sin(t * 1.7 + (sfasa || 0));
    var somma = 0;
    var quanti = 0;
    var primo = Math.floor(datiSpettro.length * da);
    var ultimo = Math.floor(datiSpettro.length * a);
    for (var i = primo; i < ultimo; i++) { somma += datiSpettro[i]; quanti++; }
    return quanti ? (somma / quanti) / 255 : 0;
  }

  /** Onde che salgono e scendendo si sovrappongono. Segue i bassi. */
  function onde(ctx, w, h, t) {
    var bassi = forza(0, 0.12, t);
    var medi = forza(0.12, 0.4, t, 1);
    for (var riga = 0; riga < 3; riga++) {
      ctx.beginPath();
      var ampiezza = h * (0.06 + bassi * 0.22) * (1 - riga * 0.22);
      var centro = h * (0.45 + riga * 0.12);
      for (var x = 0; x <= w; x += 6) {
        var y = centro +
          Math.sin(x / (60 + riga * 24) + t * (1.1 + riga * 0.35)) * ampiezza +
          Math.sin(x / 23 - t * 2.2) * ampiezza * 0.25 * medi;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = ["#8b5cf633", "#22d3ee2a", "#f472b622"][riga];
      ctx.fill();
    }
  }

  /** Le barre dello spettro, dal basso. Il più letterale dei cinque. */
  function barre(ctx, w, h, t) {
    var quante = 40;
    var largaUna = w / quante;
    for (var i = 0; i < quante; i++) {
      var v = forza(i / quante * 0.7, (i + 1) / quante * 0.7, t, i);
      var altezza = Math.pow(v, 1.4) * h * 0.75;
      var tinta = 260 + (i / quante) * 90;
      ctx.fillStyle = "hsla(" + tinta + ", 85%, 62%, .30)";
      ctx.fillRect(i * largaUna + 1, h - altezza, largaUna - 2, altezza);
    }
  }

  /** Un anello che respira col volume, con i raggi sullo spettro. */
  function cerchio(ctx, w, h, t) {
    var cx = w / 2;
    var cy = h / 2;
    var tutto = forza(0, 0.6, t);
    var raggio = Math.min(w, h) * (0.16 + tutto * 0.10);
    var quanti = 72;
    ctx.lineWidth = Math.max(1, Math.min(w, h) / 220);
    for (var i = 0; i < quanti; i++) {
      var ang = (i / quanti) * Math.PI * 2 + t * 0.18;
      var v = forza(i / quanti * 0.65, (i + 1) / quanti * 0.65, t, i);
      var lungo = raggio + v * Math.min(w, h) * 0.24;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * raggio, cy + Math.sin(ang) * raggio);
      ctx.lineTo(cx + Math.cos(ang) * lungo, cy + Math.sin(ang) * lungo);
      ctx.strokeStyle = "hsla(" + (250 + i * 1.6) + ", 90%, 66%, .32)";
      ctx.stroke();
    }
  }

  /** Puntini che vanno per conto loro e scattano sui colpi. */
  function polvere(ctx, w, h, t) {
    var colpo = forza(0, 0.08, t);
    var quanti = 90;
    for (var i = 0; i < quanti; i++) {
      var s = i * 12.9898;
      var rx = (Math.sin(s) * 43758.5453) % 1;
      var ry = (Math.sin(s * 1.7) * 21374.1234) % 1;
      var x = ((Math.abs(rx) + t * (0.02 + Math.abs(ry) * 0.05)) % 1) * w;
      var y = ((Math.abs(ry) + t * 0.012) % 1) * h;
      var r = 1 + Math.abs(rx) * 2.4 + colpo * 4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "hsla(" + (200 + Math.abs(ry) * 140) + ", 90%, 70%, " + (0.10 + colpo * 0.30) + ")";
      ctx.fill();
    }
  }

  /** Macchie grosse che si allargano e si stringono. La più calma. */
  function nebbia(ctx, w, h, t) {
    var bassi = forza(0, 0.1, t);
    var alti = forza(0.5, 0.95, t, 2);
    var macchie = [
      [0.28, 0.34, 0.34 + bassi * 0.3, "#7c3aed"],
      [0.72, 0.28, 0.28 + alti * 0.3, "#06b6d4"],
      [0.52, 0.76, 0.30 + bassi * 0.22, "#db2777"],
    ];
    for (var i = 0; i < macchie.length; i++) {
      var m = macchie[i];
      var x = (m[0] + Math.sin(t * 0.3 + i) * 0.06) * w;
      var y = (m[1] + Math.cos(t * 0.24 + i * 1.7) * 0.06) * h;
      var r = Math.min(w, h) * m[2];
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, m[3] + "55");
      g.addColorStop(1, m[3] + "00");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
`;
