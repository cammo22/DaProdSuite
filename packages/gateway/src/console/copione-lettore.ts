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
 * vedi «window.DaProdApp.suonando».
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

  /**
   * ⚠ **Il visualizer si puo' spegnere mentre ci sei dentro.**
   *
   * Chiesto il 7 settembre 2026 insieme all'ottimizzazione: «togliamo il
   * visualizer dallo sfondo... e poterlo spegnere mentre ci sei dentro». E il 9:
   * «su mobile le prestazioni sono bassissime».
   *
   * E' l'ultima difesa, quella che vale su un telefono vecchio dove anche il
   * visualizer alleggerito pesa: si spegne, resta la copertina, e la musica
   * continua. La scelta resta scritta nel telefono di chi la fa — un telefono
   * lento e' lento anche domani.
   */
  var CHIAVE_VISUAL = "daprod.visual.acceso";

  function visualAcceso() {
    try { return localStorage.getItem(CHIAVE_VISUAL) !== "no"; } catch (e) { return true; }
  }

  function accendiOSpegniIlVisual(acceso) {
    try { localStorage.setItem(CHIAVE_VISUAL, acceso ? "si" : "no"); } catch (e) { /* niente */ }
    if (acceso) {
      if (suonante && palcoAperto) avviaIlDisegno();
    } else {
      spegniIlVisualizer();
    }
    disegnaGliEffetti();
  }

  /** Il tempo che tiene su un'immagine prima di passare alla prossima. */
  var orologioImmagine = null;

  /**
   * Quanto dura un'immagine in fila: dieci secondi.
   *
   * ⚠ **Dalla 1.2.5 in fila non ci vanno piu' immagini**, e questo pezzo
   * resta per una ragione sola: una foto puo' ancora arrivarci da una fila
   * fatta prima dell'aggiornamento, aperta e non ancora finita. Senza questo
   * ramo il lettore si fermerebbe li' — un'immagine non finisce da sola, e la
   * fila aspetterebbe una fine che non arriva mai.
   *
   * Il giorno che non esiste piu' una console aperta dalla 1.2.4, si butta.
   */
  var DURATA_IMMAGINE = 10000;

  /** Vero quando il palco a schermo intero è aperto. */
  var palcoAperto = false;

  /* ---------------------------------------------------------- il visualizer */

  /**
   * ⚠ **Il disegno non sta più qui.** Dalla 0.9.2 lo fa «Visual», che è il
   * motore vero di DaProdVisualizer — stessi shader, stesse feature audio,
   * stesso post-processing. Vedi «copione-visual.ts».
   *
   * Qui restano le due cose che sono del lettore e non del motore: il giro di
   * fotogrammi (che vive con il palco aperto) e il collegamento fra l'elemento
   * che suona e l'analizzatore.
   */
  var disegnoVivo = null;

  /** Vero quando il pannello con le info della canzone è aperto. */
  var infoAperte = false;

  /**
   * L'effetto fissato a mano, o vuoto quando cambia da solo.
   *
   * Chiesto il 6 settembre 2026: «se clicchiamo un effetto si fissa su quello;
   * se ci riclicco torna deselezionato e torna in cambio automatico».
   */
  var effettoFisso = "";

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

  /**
   * Fa partire questa, e basta questa.
   *
   * ⚠ **Se sta gia' suonando lei, non ricomincia.** Chiesto il 6 settembre
   * 2026: «se sto riproducendo una canzone e riclicco sulla stessa canzone non
   * ricominci, ma metta a schermo pieno il player continuando la
   * riproduzione».
   *
   * Ha ragione, e il difetto e' di quelli che si sentono invece di vedersi: sei
   * a due minuti e mezzo di un pezzo, torni in galleria per guardare la
   * copertina, la tocchi — e riparte da zero. Il gesto voleva dire «fammi
   * vedere questa», e veniva letto come «rifalla da capo».
   *
   * Quindi: stessa cosa gia' in mano vuol dire **aprire il palco**, che e'
   * l'unica cosa che quel tocco poteva ragionevolmente voler dire.
   */
  function suonaSubito(v) {
    if (staGiaSuonando(v)) { apriPalco(); return; }
    coda = [v];
    suonaIlNumero(0);
  }

  /** Vero se quella cosa e' proprio quella che il lettore ha in mano adesso. */
  function staGiaSuonando(v) {
    return inCoda >= 0 && coda[inCoda] && v && coda[inCoda].id === v.id;
  }

  /**
   * **Mettila in fila, dopo quella che sta suonando.** Nuovo nella 1.0.0.
   *
   * Chiesto il 6 settembre 2026: «se tieni premuta una canzone, sia dalla
   * galleria che da DaProd, puoi metterla in coda».
   *
   * E' la meta' che mancava alla scelta della 0.9.4. Li' avevo tolto la fila
   * che si formava da sola — toccare una foto metteva in coda sessanta cose —
   * e la ragione resta buona: una fila e' una decisione, e non la si prende al
   * posto di nessuno. Ma tolta quella, **non restava nessun modo di farsene
   * una**: il lettore era lungo uno e basta.
   *
   * Adesso la fila **si costruisce**: si tiene premuto quello che si vuole
   * sentire dopo. Torna il posto che ha preso, cosi' chi tocca legge «terza in
   * fila» invece di una frase sempre uguale — un tasto che dice sempre la
   * stessa cosa non fa capire se e' stato premuto.
   */
  function mettiInFila(v) {
    if (staGiaSuonando(v)) return 0;
    for (var i = 0; i < coda.length; i++) {
      if (coda[i].id === v.id) return -1;
    }
    return accoda(v);
  }

  /**
   * ⚠ **Si tocca una cosa, e parte quella. Una sola.**
   *
   * Chiesto il 6 settembre 2026: «il player di default mette in coda tutto,
   * questo non va bene: se clicco un media deve riprodurre solo quello, una
   * volta, e quando finisce si ferma. Se nel frattempo aggiungo qualcosa alla
   * coda, allora si forma la coda».
   *
   * ## Perché prima faceva l'opposto, e perché aveva torto
   *
   * Nella 0.9.0 toccare una cosa in galleria metteva in fila **tutto quello che
   * si stava guardando**, partendo da lì. Era copiato da come funzionano le app
   * di musica, e per una libreria di canzoni è la scelta giusta.
   *
   * Ma questa galleria non è una libreria di canzoni: è **tutto quello che il
   * computer ha prodotto**, mescolato. Toccare una foto per guardarla voleva
   * dire far partire sessanta cose, e la barra in fondo diceva «1 di 60» a chi
   * ne voleva una. Una fila che si forma da sola non è una comodità: è una
   * decisione presa al posto tuo, e su sessanta elementi è una decisione grossa.
   *
   * Adesso la fila **si costruisce**, non si eredita: si tocca «metti in fila»
   * su quello che si vuole sentire dopo, e finché non lo si fa la fila è lunga
   * uno. «elenco» resta nella firma perché chi chiama continua a passarlo — e
   * il giorno che servisse un «suona tutto» ha già quello che gli serve.
   */
  function accodaTutto(elenco, daQui) {
    suonaSubito(daQui);
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

  /** Il segno di una cosa senza anteprima: un tipo, tre disegni. */
  function segnoDi(v) {
    if (v.tipo === "video") return "\\u25B6";
    if (v.tipo === "immagine") return "\\u25A3";
    return "\\u266B";
  }

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
      /**
       * ⚠ **Se l'anteprima non arriva, resta il segno.**
       *
       * Il computer dice «anteprima: true» guardando se il file di fianco c'e',
       * ma fra quel controllo e la richiesta possono succedere cose — un
       * riquadro vuoto e' il risultato peggiore, perche' sembra un guasto. Si
       * chiede l'immagine a parte e, se non arriva, si torna al segno.
       */
      var prova = new Image();
      prova.onerror = (function (quale) {
        return function () {
          if (coda[inCoda] !== quale) return;
          faccia.style.backgroundImage = "";
          faccia.textContent = segnoDi(quale);
        };
      })(v);
      prova.src = anteprimaDi(v);
    } else {
      faccia.style.backgroundImage = "";
      faccia.textContent = segnoDi(v);
    }
    $("lettore-nome").textContent = v.didascalia || v.nome;
    $("lettore-sotto").textContent =
      (inCoda + 1) + " di " + coda.length +
      (v.chiNome ? " \\u00b7 " + v.chiNome : "");
    /**
     * ⚠ **Anche questo si disegna**, e la riga di prima faceva danno: metteva
     * un carattere dentro al tasto con «textContent», e «textContent»
     * **cancella il disegno** che ci sta dentro. Cioe' il primo aggiornamento
     * della barra buttava via l'SVG appena messo nel markup, e da li' in poi
     * quel tasto era un glifo tipografico come prima.
     *
     * Trovato contando gli «svg» nella pagina vera: tre su quattro.
     */
    disegnaUnPlay($("lettore-play-segno"), !!(suonante && !suonante.paused));
    var pl2 = $("lettore-play");
    if (pl2) pl2.classList.toggle("acceso", true);
    /**
     * ⚠ **Il play del palco e' disegnato, non scritto.**
     *
     * Chiesto il 6 settembre 2026: «i pulsanti del play e avanti indietro vanno
     * ridisegnati bene perche' sono bruttissimi». I glifi «⏸» e «▶» hanno pesi
     * e centri decisi da chi ha disegnato il font — su Android uno, su un
     * browser un altro — e a ventisei pixel sopra a un visualizer che lampeggia
     * si leggevano storti. Due rettangoli e un triangolo disegnati da noi hanno
     * lo stesso peso ovunque.
     */
    disegnaIlPlay(!!(suonante && !suonante.paused));
  }

  /**
   * Pausa o play, disegnati.
   *
   * Due forme e **un posto solo** che le decide, per il palco e per la barra:
   * erano due lettori con due alfabeti, e uno dei due si cancellava da solo.
   */
  function disegnaUnPlay(segno, staSuonando) {
    if (!segno) return;
    segno.innerHTML = staSuonando
      ? '<rect x="7" y="5" width="3.6" height="14" rx="1.4"></rect>' +
        '<rect x="13.4" y="5" width="3.6" height="14" rx="1.4"></rect>'
      : '<path d="M8.4 4.9a1 1 0 0 1 1.52-.85l8.1 6.05a1.2 1.2 0 0 1 0 1.92l-8.1 6.05a1 1 0 0 1-1.52-.85V4.9z"></path>';
  }

  function disegnaIlPlay(staSuonando) {
    disegnaUnPlay($("palco-play-segno"), staSuonando);
    var tasto = $("palco-play");
    if (tasto) tasto.title = staSuonando ? "Pausa" : "Riprendi";
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
      /**
       * ⚠ **La copertina si vede attraverso.** Chiesto il 5 settembre 2026:
       * «la copertina 70 percento trasparenza, cosi' da vedere il visualizer
       * bene», e prima, sulla stessa cosa: «l'immagine mettiamola 70 percento
       * trasparenza, cioe' 30 percento trasparente, 70 si vede».
       *
       * Le due frasi dicono due numeri diversi, e ho preso il secondo perche'
       * e' quello in cui si e' corretto da solo: **si vede al 70%**. La
       * copertina resta riconoscibile e il visualizer le passa dietro invece
       * di essere coperto da un quadrato. Il numero sta in un posto solo — la
       * classe «attraverso» nel foglio di stile: se e' troppo, si cambia li'.
       */
      var cop = document.createElement("img");
      cop.className = "copertinona attraverso";
      cop.src = anteprimaDi(v);
      cop.alt = v.nome;
      dentro.append(cop);
    }

    $("palco-nome").textContent = v.didascalia || v.nome;
    /**
     * «3 di 12» **si tocca**, e apre la fila.
     *
     * Il tasto con le tre linee faceva questo, e dalla 0.9.2 fa un altro
     * mestiere (le info). La fila non si perde: va dove uno la cerca, cioe'
     * addosso al numero che dice a che punto e'.
     */
    var sotto = $("palco-sotto");
    sotto.textContent =
      (inCoda + 1) + " di " + coda.length + (v.chiNome ? " \\u00b7 " + v.chiNome : "");
    sotto.title = "Tocca per vedere la fila";
    // La barra del tempo non ha senso su un'immagine: dieci secondi fissi non
    // sono un tempo dentro cui spostarsi.
    $("palco-tempo").hidden = v.tipo === "immagine";
    disegnaIlTempo();
    disegnaLeInfo();
  }

  /**
   * **Com'e' fatta questa cosa**, dentro il palco.
   *
   * ⚠ Chiesto il 5 settembre 2026: «il tasto con le tre linee a destra durante
   * la riproduzione DaProd non funziona: rendilo il tasto che, se cliccato,
   * mostra tutte le info della canzone, e se lo riclicchi scompare».
   *
   * Non funzionava per una ragione precisa, e vale la pena scriverla: apriva
   * un foglio, e un foglio sopra al palco — che sta a schermo intero, con
   * z-index 80 — finiva sotto. Il tasto rispondeva, solo che quello che
   * apriva non si vedeva. Qui invece il pannello e' **dentro** il palco, e si
   * accende e si spegne con lo stesso tasto.
   *
   * I campi sono quelli veri della richiesta, gli stessi che la galleria mostra
   * in «Com'e' stata fatta»: per una canzone titolo, testo, stile e durata; per
   * una foto il prompt.
   */
  /**
   * **Com'e' stata fatta**: le righe, disegnate in un posto solo.
   *
   * ⚠ **Erano due disegni diversi della stessa cosa.** In galleria un foglio
   * che saliva sopra la foto, con righe «.info» e un «indietro» che non
   * c'entrava con niente; nel lettore un riquadro dentro al palco, con righe
   * «.rigaInfo», che si accende e si spegne con lo stesso tasto. Detto il 7
   * settembre 2026:
   *
   * > «Quando clicco "come e' stata fatta" rimane la foto aperta e apre un menu
   * > indietro. Questo sempre perche' abbiamo fatto le cose diverse su mille
   * > cose. In realta' vorrei vederlo stesso come abbiamo fatto nel
   * > visualizer, di vedere com'e' fatta la canzone.»
   *
   * Vince quello del visualizer, e adesso e' questa funzione: la chiamano tutti
   * e due. «dove» e' il riquadro da riempire, «v» la cosa di cui si parla.
   * I campi sono quelli veri della richiesta, gli stessi che manda il computer:
   * per una canzone titolo, testo, stile e durata; per una foto il prompt.
   */
  /**
   * Il tasto per copiarsi una riga.
   *
   * ⚠ Chiesto il 7 settembre 2026: «magari mi voglio copiare il testo.
   * Mettere il pulsante con l'emoji del copia». Il testo di una canzone e' la
   * cosa che si vuole portare via piu' spesso, e fino alla 1.2.4 l'unico modo
   * era selezionarlo col dito su venti righe dentro un riquadro che scorre.
   *
   * **Dice che ha copiato**, e per due secondi: una copia riuscita non si vede
   * da nessuna parte, e senza una risposta uno preme due volte.
   *
   * Due strade perche' «navigator.clipboard» vuole una pagina sicura, e la
   * console dal telefono arriva su http quando si e' in casa: li' si passa dal
   * vecchio «execCommand», che e' brutto e funziona.
   */
  function tastoCopia(testo) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "copia";
    b.title = "Copia";
    b.textContent = "\\u29C9";
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var fatto = function () {
        b.classList.add("fatto");
        b.textContent = "\\u2713";
        setTimeout(function () {
          b.classList.remove("fatto");
          b.textContent = "\\u29C9";
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(testo).then(fatto, function () { allaVecchia(testo, fatto); });
      } else {
        allaVecchia(testo, fatto);
      }
    });
    return b;
  }

  function allaVecchia(testo, fatto) {
    try {
      var casella = document.createElement("textarea");
      casella.value = testo;
      casella.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.append(casella);
      casella.select();
      document.execCommand("copy");
      casella.remove();
      fatto();
    } catch (e) { /* niente da fare: almeno non si rompe */ }
  }

  function disegnaComeEStataFatta(dove, v) {
    dove.innerHTML = "";
    var fatta = (v && v.comeEStataFatta) || {};
    var quante = 0;
    for (var come in fatta) {
      if (!Object.prototype.hasOwnProperty.call(fatta, come)) continue;
      var riga = document.createElement("div");
      riga.className = "rigaInfo";
      var chiave = document.createElement("b");
      chiave.textContent = come;
      var valore = document.createElement("span");
      valore.textContent = fatta[come];
      riga.append(chiave, valore, tastoCopia(fatta[come]));
      dove.append(riga);
      quante++;
    }
    if (!quante) {
      var niente = document.createElement("p");
      niente.className = "nota";
      niente.textContent = "Di questa non so com'e' stata fatta.";
      dove.append(niente);
    }
    return quante;
  }

  function disegnaLeInfo() {
    var scatola = $("palco-info");
    if (!scatola) return;
    scatola.hidden = !infoAperte || inCoda < 0;
    // La copertina si alza ancora quando le info sono aperte: se no se la
    // mangiano. Vedi «.palcoLettore .dentro.su.piuSu» nello stile.
    var dentro = document.getElementById("palco-dentro");
    if (dentro) dentro.classList.toggle("piuSu", !scatola.hidden);
    if (scatola.hidden) return;
    disegnaComeEStataFatta(scatola, coda[inCoda]);
  }

  /** Accende e spegne il pannello. E' tutto quello che fa il tasto. */
  function giraLeInfo() {
    infoAperte = !infoAperte;
    var tasto = $("palco-fila");
    if (tasto) tasto.classList.toggle("acceso", infoAperte);
    disegnaLeInfo();
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
    if (!disegnoVivo) avviaIlDisegno();
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
      /**
       * ⚠ **Tre posti dove il dito non trascina il palco.**
       *
       * La barra del tempo (o spostarsi dentro una canzone lo chiuderebbe), i
       * comandi, e — dalla 0.9.6 — **il pannello delle info**.
       *
       * Chiesto il 6 settembre 2026: «quando clicco il pulsante info devo poter
       * interagire con il quadrato info e scrollare sotto senza che si attivi
       * l'effetto swipe».
       *
       * Nella 0.9.4 avevo messo «touch-action: pan-y» sul pannello, e non
       * bastava: quella riga dice al browser cosa fare **di suo**, ma qui c'e'
       * un ascoltatore non passivo che chiama «preventDefault» sul movimento
       * verticale. Vince l'ascoltatore, sempre. L'unico modo e' non ascoltare:
       * se il dito parte da dentro il pannello, il palco non se ne occupa.
       */
      var sopra = ev.target;
      while (sopra && sopra !== palco) {
        if (sopra.id === "palco-tempo" || sopra.id === "palco-info" ||
            sopra.id === "palco-effetti-menu" ||
            sopra.tagName === "INPUT" || sopra.tagName === "BUTTON") {
          partenza = null;
          return;
        }
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
   * ⚠ **Dalla 0.9.2 il motore è quello vero.** Fino alla 0.9.1 qui c'erano un
   * canvas 2D e cinque effetti fatti a mano, e la risposta è stata: «le visual
   * non sono quelle del mio programma daprodvisualizer bro, è già la seconda
   * volta: fai un port vero». Adesso disegna «Visual», che ha dentro gli stessi
   * nove shader dell'app, gli stessi legami fra suono e immagine, e le stesse
   * quattro passate di post-processing.
   *
   * Restano vere le due cose che erano vere prima: il contesto audio si crea
   * una volta sola, e un elemento si collega una volta e una sola.
   */
  function accendiIlVisualizer(elemento) {
    /**
     * ⚠ **Prima di tutto: la tela torna in vista.**
     *
     * La nasconde «spegniIlVisualizer» quando parte un video (vedi li' il
     * perche'). Rimetterla in vista dentro «avviaIlDisegno» non bastava per due
     * ragioni, e le ho trovate tutte e due provando:
     *
     * 1. quella si chiama **solo a palco aperto**, e passando da un video a un
     *    brano il disegno riparte piu' tardi;
     * 2. stava **dopo** «Visual.collega», che su una pagina senza Web Audio
     *    puo' alzare un'eccezione — e allora la riga non veniva eseguita
     *    affatto, e il brano suonava sul nero.
     *
     * Far esistere una tela non dipende dal motore audio: e' la prima riga.
     */
    var tela = $("visual");
    if (tela) tela.hidden = !visualAcceso();
    Visual.collega(elemento);
    // Un brano nuovo è un pezzo nuovo: il guadagno automatico, il conto dei
    // colpi e la stima del tempo ripartono, o il primo minuto sarebbe tarato
    // sulla canzone di prima.
    Visual.ricomincia();
    // Il disegno gira **solo con il palco aperto**: uno shader a schermo intero
    // dietro a un palco chiuso è batteria buttata.
    if (palcoAperto && !disegnoVivo) avviaIlDisegno();
  }

  /** Accende il giro dei fotogrammi, se il motore c'è. */
  function avviaIlDisegno() {
    // Spento a mano: la copertina resta, la musica pure, e la scheda video no.
    if (!visualAcceso()) return;
    var tela = $("visual");
    if (!tela) return;
    // La rimette in vista: la spegne «spegniIlVisualizer» quando parte un
    // video, e senza questa riga il brano dopo suonerebbe sul nero.
    tela.hidden = false;
    if (!Visual.accendi(tela)) return;
    disegnoVivo = requestAnimationFrame(unGiro);
  }

  /**
   * Un fotogramma del palco.
   *
   * ⚠ **Non c'e' piu' nessuna copia sullo sfondo.** Fino alla 1.2.4 questo
   * giro copiava anche la tela in una seconda, dietro alla pagina, sedici volte
   * al secondo. Tolto il 9 settembre 2026 insieme allo sfondo che serviva —
   * vedi «stile.ts», dove c'era.
   *
   * E chi chiama continua a passare a sessanta: dei sessanta ne disegna trenta,
   * e il tetto sta dentro «Visual.disegna». Vedi «FPS_TETTO».
   */
  function unGiro() {
    disegnoVivo = requestAnimationFrame(unGiro);
    var tela = $("visual");
    if (!tela || tela.hidden || !palcoAperto) return;
    Visual.disegna(suonante);
  }

  /**
   * **Il menu degli effetti.** Nuovo nella 0.9.4.
   *
   * Chiesto il 6 settembre 2026: «si apre un piccolo menu con tutti gli
   * effetti; se ne clicchiamo uno si fissa su quell'effetto, se ci riclicco
   * torna deselezionato e torna in cambio automatico».
   *
   * Non e' un elenco di scelte: e' un elenco **con uno stato acceso**. Nessuno
   * acceso vuol dire «cambia da solo», che e' come parte — e la riga in cima lo
   * dice a parole, perche' uno stato che si riconosce solo dall'assenza di un
   * bordo colorato non lo riconosce nessuno.
   */
  function giraGliEffetti() {
    var menu = $("palco-effetti-menu");
    if (!menu) return;
    var tasto = $("palco-effetti");
    if (!menu.hidden) {
      menu.hidden = true;
      if (tasto) tasto.classList.remove("acceso");
      return;
    }
    disegnaGliEffetti();
    menu.hidden = false;
    if (tasto) tasto.classList.add("acceso");
  }

  function disegnaGliEffetti() {
    var menu = $("palco-effetti-menu");
    if (!menu) return;
    menu.innerHTML = "";
    var quali = Visual.elenco();
    var scelti = quali.filter(function (x) { return x.fisso; });

    /**
     * ⚠ **Se ne possono scegliere piu' d'uno.** Chiesto il 6 settembre 2026:
     * «fai in modo che posso selezionare piu' effetti, e le animazioni loopano
     * solo quelle selezionate; se tutte deselezionate e' normale».
     *
     * Quindi non e' piu' «fisso su uno»: e' **una lista di quelli che ti
     * piacciono**, e il giro automatico gira dentro quella lista invece che fra
     * tutti e nove. Uno solo scelto vuol dire che non cambia mai — cioe' il
     * «fissato» di prima, che resta possibile senza essere l'unica cosa
     * possibile.
     *
     * Nessuno scelto vuol dire tutti e nove, che e' come parte. Lo dice la riga
     * qui sotto, perche' uno stato che si riconosce solo dall'assenza di bordi
     * accesi non lo riconosce nessuno.
     */
    /**
     * ⚠ **In cima: l'interruttore che lo spegne del tutto.**
     *
     * Sta qui e non nelle impostazioni perche' questo e' il posto dove uno si
     * trova quando pensa «e' bello ma scatta»: dentro il palco, col menu degli
     * effetti gia' aperto. Le impostazioni sono due schermate piu' in la'.
     *
     * Spento, sotto non c'e' piu' niente da scegliere: un elenco di effetti
     * sotto a un visualizer spento e' un elenco di cose che non succedono.
     */
    var acceso = visualAcceso();
    var riga = document.createElement("button");
    riga.type = "button";
    riga.className = "voceFoglio conInterruttore";
    var segno = document.createElement("span");
    segno.className = "segno";
    segno.textContent = "\u25C9";
    var dice = document.createElement("span");
    dice.className = "cresce";
    dice.textContent = "Il visualizer";
    var piccolo = document.createElement("small");
    piccolo.textContent = acceso
      ? "spegnilo se il telefono fatica: resta la copertina"
      : "spento: resta la copertina, e il telefono respira";
    dice.append(piccolo);
    var leva = document.createElement("span");
    leva.className = "interruttore" + (acceso ? " acceso" : "");
    leva.innerHTML = "<i></i>";
    riga.append(segno, dice, leva);
    riga.addEventListener("click", function () { accendiOSpegniIlVisual(!visualAcceso()); });
    menu.append(riga);
    if (!acceso) return;

    var quanti = scelti.length;
    var come = document.createElement("div");
    come.className = "comeVa";
    come.textContent =
      quanti === 0 ? "Girano tutti e nove. Toccane qualcuno per tenere solo quelli."
      : quanti === 1 ? "Resta su \u00ab" + scelti[0].nome + "\u00bb. Toccane un altro per farli girare in due."
      : "Girano solo questi " + quanti + ". Toccali di nuovo per toglierli.";
    menu.append(come);

    for (var j = 0; j < quali.length; j++) {
      var e = quali[j];
      var b = document.createElement("button");
      b.type = "button";
      b.className = e.fisso ? "fisso" : "";
      b.textContent = e.nome;
      b.addEventListener("click", (function (quale) {
        return function () {
          Visual.segna(quale);
          disegnaGliEffetti();
        };
      })(e.chiave));
      menu.append(b);
    }
  }

  function spegniIlVisualizer() {
    if (disegnoVivo) { cancelAnimationFrame(disegnoVivo); disegnoVivo = null; }
    /**
     * ⚠ **E la tela del palco si svuota**, che e' il difetto del 7 settembre
     * 2026: «i video non funzionano con il visualizer: il video funziona pero'
     * mostra un'immagine ferma del visualizer».
     *
     * Fermare il giro dei fotogrammi ferma il **disegno**, non cancella quello
     * che c'e' gia' disegnato: la tela sta dietro al video, a schermo intero, e
     * restava li' con l'ultimo fotogramma della canzone di prima. Un video con
     * dietro una macchia ferma sembra una cosa rotta, e in effetti lo era.
     *
     * Si nasconde **e** si pulisce: nasconderla e basta lascerebbe i pixel
     * pronti a ricomparire al primo brano, per un fotogramma, prima che il
     * disegno nuovo li copra.
     */
    var tela = $("visual");
    if (tela) {
      tela.hidden = true;
      var pennello = tela.getContext("2d");
      if (pennello) pennello.clearRect(0, 0, tela.width, tela.height);
    }
  }
`;
