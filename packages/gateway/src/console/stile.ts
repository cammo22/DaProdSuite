/**
 * Lo stile della console.
 *
 * I colori sono quelli della suite sul PC: chi apre questa pagina dal telefono
 * deve riconoscere lo stesso programma, non un cugino povero.
 *
 * **Due regole che tornano ovunque qui dentro.**
 *
 * 1. **A quadrati.** Chiesto così: «voglio grafiche a quadrati facili da usare
 *    e schermate varie intuitive per telefono». Elenchi puntati e tabelle non
 *    ce ne sono: ci sono riquadri che si toccano.
 * 2. **Il colore dice cosa fa.** Nella 0.7.6 i quattro tasti della Produzione
 *    hanno quattro colori diversi, e non è decorazione: «galleria va bene ma
 *    vorrei più semplicità, magari diversi pulsanti con diversi colori». Su un
 *    telefono, in mano, il colore si riconosce prima della parola.
 */
export const STILE = `  :root {
    --bg: #08090d;
    --panel: #111319;
    --panel2: #161922;
    --line: #22262f;
    --line2: #2e3340;
    --txt: #eceef4;
    --dim: #868c9e;
    --fioco: #5d6779;
    --accent: #8b5cf6;
    --accent2: #22d3ee;
    --ok: #34d399;
    --attesa: #fbbf24;
    --err: #f87171;
    --rosa: #f472b6;
    --ambra: #fb923c;
    --raggio: 18px;
    /**
     * ⚠ **La barra delle schede e' piu' sottile.** Chiesto il 6 settembre
     * 2026: «la navbar falla piu' sottile».
     *
     * Da 58 a 50. Otto pixel sembrano niente e sono l'altezza di una riga di
     * testo: su un telefono, moltiplicata per la barra che suona che le sta
     * sopra, e' la differenza fra vedere l'ultimo riquadro e no.
     */
    --fondo-alto: 50px;
    /* Quanto e' alta la barra che suona. Vedi il commento su «.barraLettore». */
    --lettore-alto: 58px;
    /**
     * Quanto e' alto un tasto piccolo: «mini», «tondo», «cuore».
     *
     * Un numero solo, perche' erano tre e nessuno l'aveva scelto. Vedi il
     * commento su «button.mini».
     */
    --tasto-alto: 38px;
    /* E quanto e' alto un tasto grande, quello che si preme per fare una cosa. */
    --tastone-alto: 48px;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--txt);
    background:
      radial-gradient(1100px 560px at 85% -12%, #1d1348 0%, transparent 62%),
      radial-gradient(900px 520px at -5% 105%, #052b3d 0%, transparent 58%),
      var(--bg);
    background-attachment: fixed;
    font: 15px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif;
    padding-bottom: calc(var(--fondo-alto) + env(safe-area-inset-bottom));
  }

  /* ------------------------------------------------------------ testata */
  header {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top));
    background: #0a0c11ee; backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
  }
  /* Il marchio adesso e' un tasto (l'easter egg), ma non deve sembrarlo. */
  /* Alto come la pastiglia e l'ingranaggio: e' una riga sola di tre cose, e
     con il marchio a 24 e gli altri a 38 la riga sembrava scivolata. */
  .marchio {
    font-weight: 700; font-size: 16px; letter-spacing: .2px;
    background: none; border: 0; padding: 0; color: var(--txt);
    min-height: var(--tasto-alto); display: inline-flex; align-items: center;
    cursor: pointer; user-select: none; -webkit-user-select: none;
  }
  .marchio span { color: var(--accent); }
  .marchio:active { transform: none; }
  /* Il settimo tocco: un lampo, e poi si vede cosa succede. */
  @keyframes lampoMarchio {
    0% { filter: none; }
    40% { filter: drop-shadow(0 0 14px var(--accent)) brightness(1.5); }
    100% { filter: none; }
  }
  .marchio.lampo { animation: lampoMarchio .6s ease-out; }

  /**
   * ⚠ **L'ingranaggio e la pastiglia del nome sono della stessa famiglia.**
   *
   * Chiesto il 6 settembre 2026: «fai meglio il pulsante impostazioni, che e'
   * diverso dal nome utente affianco». Era vero: la pastiglia aveva un fondo
   * pieno e un bordo netto, il tondo un bordo piu' tenue e dentro un glifo
   * tipografico. Due pesi diversi appaiati sulla stessa riga si vedono anche
   * senza sapere perche'.
   *
   * «pari» vuol dire: stesso fondo, stesso bordo, stessa altezza. Il segno e'
   * disegnato, quindi ha lo stesso peso ottico della faccia accanto.
   */
  .tondo.pari { background: var(--panel2); border-color: var(--line2); }
  .tondo svg { width: 19px; height: 19px; fill: currentColor; display: block; }
  /* I segni «a filo»: disegnati con la linea invece che pieni. A diciannove
     pixel una forma piena diventa una macchia; una linea resta un segno. */
  svg.afilo { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .tondo:active { transform: scale(.93); }
  .cresci { flex: 1; }
  /* ⚠ «min-height: 0» e non e' pedanteria: il tasto grande dichiara
     «min-height: var(--tastone-alto)», e un minimo batte un'altezza. Senza
     questa riga l'ingranaggio veniva alto 48 accanto a una pastiglia di 38 —
     misurato nella pagina vera, che e' l'unico modo di accorgersene. */
  .tondo {
    width: var(--tasto-alto); height: var(--tasto-alto); min-height: 0;
    border-radius: 99px; padding: 0;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt);
    font-size: 15px; display: grid; place-items: center; cursor: pointer;
  }
  .tondo:hover { border-color: var(--accent); }
  /* Alto come l'ingranaggio che gli sta accanto: erano 34 e 38, sulla stessa
     riga, ed e' il genere di differenza che si vede senza saperla nominare. */
  .chi {
    font-size: 12.5px; color: var(--txt); background: var(--panel2);
    min-height: var(--tasto-alto);
    border: 1px solid var(--line2); border-radius: 99px; padding: 0 8px 0 4px;
    cursor: pointer; display: flex; align-items: center; gap: 7px;
    /* 46vw su un telefono sono 170 px; su un monitor da 27 pollici sono metà
       schermo per scriverci un nome. Vince il più stretto dei due. */
    max-width: min(46vw, 260px);
  }
  .chi .faccina {
    width: 24px; height: 24px; border-radius: 99px; object-fit: cover;
    background: var(--accent); display: grid; place-items: center;
    font-size: 11px; font-weight: 700; color: #fff; flex: 0 0 auto;
  }
  .chi .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* -------------------------------------------------------------- pagine */
  main { max-width: 920px; margin: 0 auto; padding: 14px 14px 22px; }
  .pagina { display: none; }
  .pagina.on { display: block; }
  h2 { margin: 0 0 3px; font-size: 15px; }
  h3 {
    margin: 24px 0 10px; font-size: 12px; text-transform: uppercase;
    letter-spacing: .1em; color: var(--dim); font-weight: 650;
  }
  p.sotto { margin: 0 0 12px; color: var(--dim); font-size: 13px; }

  .scheda {
    background: linear-gradient(180deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: var(--raggio);
    padding: 16px; margin-bottom: 12px;
  }

  /* ------------------------------------------------------- l'ingresso */
  /* La prima cosa che si vede aprendo l'app, e per molte persone l'unica cosa
     che vedranno di questo programma prima di decidere se vale la pena. Prima
     era un riquadro grigio con due caselle; adesso ha un nome, un respiro e
     una frase che dice cosa succede dopo. */
  .entrata {
    min-height: calc(100vh - 120px);
    display: flex; flex-direction: column; justify-content: center;
    max-width: 420px; margin: 0 auto; padding: 8px 0 30px;
  }
  .entrata .stemma {
    width: 74px; height: 74px; border-radius: 24px; margin: 0 auto 20px;
    display: grid; place-items: center; font-size: 34px; color: #fff;
    background: linear-gradient(150deg, #9b6cff, #6d28d9 55%, #0e7490);
    box-shadow: 0 14px 40px -14px #8b5cf6cc;
  }
  .entrata h1 { font-size: 25px; margin: 0 0 6px; text-align: center; letter-spacing: -.4px; }
  .entrata h1 span { color: var(--accent); }
  .entrata .claim {
    text-align: center; color: var(--dim); font-size: 13.5px;
    margin: 0 0 24px; line-height: 1.55;
  }
  .entrata .passo {
    display: flex; gap: 9px; align-items: baseline;
    color: var(--fioco); font-size: 12px; margin-bottom: 3px;
  }
  .entrata .passo b {
    color: var(--accent); font-size: 11px; letter-spacing: .1em;
  }
  .entrata .oppure {
    text-align: center; color: var(--fioco); font-size: 12px; margin: 16px 0 0;
  }
  .cifre {
    letter-spacing: .34em; font-size: 21px; text-align: center; font-weight: 600;
  }
  .cifre::placeholder { letter-spacing: .2em; font-size: 16px; }

  /* ------------------------------------------------------- il semaforo */
  .semaforo {
    border-radius: var(--raggio); padding: 18px 18px 16px; margin-bottom: 12px;
    border: 1px solid var(--line2); background: var(--panel);
    display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap;
  }
  .semaforo .faccia { font-size: 30px; line-height: 1; }
  .semaforo .dentro { flex: 1 1 200px; min-width: 0; }
  .semaforo b { display: block; font-size: 17px; margin-bottom: 3px; }
  .semaforo .perche { color: var(--dim); font-size: 13px; }
  .semaforo.bene { border-color: #34d39955; background: linear-gradient(180deg, #0f2019, var(--panel)); }
  .semaforo.male { border-color: #f8717166; background: linear-gradient(180deg, #231214, var(--panel)); }
  .semaforo.aspetta { border-color: #fbbf2455; background: linear-gradient(180deg, #221c0e, var(--panel)); }

  /* --------------------------------------------------------- i quadrati */
  .quadrati { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }
  .quadrato {
    text-align: left; padding: 14px; border-radius: 15px; min-height: 92px;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt);
    display: flex; flex-direction: column; gap: 4px; font: inherit; cursor: pointer;
  }
  .quadrato:hover { border-color: var(--accent); }
  .quadrato .segno { font-size: 21px; line-height: 1; }
  .quadrato .grande { font-size: 25px; font-weight: 700; line-height: 1.1; }
  .quadrato .nome { font-weight: 600; font-size: 14px; }
  .quadrato small { color: var(--fioco); font-size: 11.5px; line-height: 1.35; }
  .quadrato.spento { cursor: default; }
  .quadrato.spento:hover { border-color: var(--line2); }
  .quadrato.verde .grande, .quadrato.verde .segno { color: var(--ok); }
  .quadrato.giallo .grande, .quadrato.giallo .segno { color: var(--attesa); }
  .quadrato.rosso .grande, .quadrato.rosso .segno { color: var(--err); }

  /* ------------------------------------------------------------- tastoni */
  /* I quattro della Produzione, e i due della Galleria. Grandi, colorati, con
     due parole sotto che dicono cosa esce fuori: su un telefono un tasto si
     riconosce dal colore prima ancora di leggere cosa c'è scritto. */
  /**
   * ⚠ **Le righe sono alte uguali.** Chiesto il 6 settembre 2026: «ci sono
   * molte zone dove le cose si sovrappongono, poca simmetria, pulsanti di
   * diverse grandezze».
   *
   * Misurato nella pagina vera, a 375 px: in Casa i cinque tastoni erano alti
   * 148, 148, 148, 148 e **116**. La causa e' «grid-auto-rows: auto», che e' il
   * valore di serie: dentro una riga la griglia allunga tutti alla stessa
   * altezza, **fra** una riga e l'altra no. Le prime due righe avevano un
   * titolo su due righe di testo e si alzavano; l'ultima, con un titolo corto e
   * da sola, restava bassa. Il risultato e' una griglia che sembra scivolata.
   *
   * «1fr» dice: tutte le righe alte come la piu' alta. Costa una parola e
   * toglie l'unica asimmetria vera di questa pagina.
   */
  .tastoni {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    grid-auto-rows: 1fr; gap: 11px;
  }
  .tastone {
    position: relative; overflow: hidden;
    text-align: left; padding: 17px 16px 15px; border-radius: 18px; min-height: 116px;
    border: 1px solid var(--line2); color: var(--txt); font: inherit; cursor: pointer;
    background: var(--panel2);
    display: flex; flex-direction: column; gap: 5px; justify-content: flex-end;
  }
  /**
   * **Il segno sta in un quadrato, e il quadrato e' sempre lo stesso.**
   *
   * Non e' pignoleria: i simboli di questo alfabeto hanno larghezze molto
   * diverse — «▶» riempie il suo spazio, «◉» ne occupa meta' — e senza un
   * riquadro fisso i titoli sotto partivano da altezze diverse riquadro per
   * riquadro. Con una scatola di 28x28 e il contenuto centrato, quello che
   * cambia e' il disegno, non la posizione di tutto il resto.
   */
  .tastone .segno {
    font-size: 24px; line-height: 1; margin-bottom: auto;
    width: 28px; height: 28px; display: grid; place-items: center;
  }
  .tastone .nome { font-weight: 700; font-size: 15.5px; letter-spacing: -.2px; }
  .tastone small { color: var(--dim); font-size: 11.5px; line-height: 1.35; }
  .tastone::after {
    content: ""; position: absolute; inset: auto -30% -60% -30%; height: 130%;
    background: radial-gradient(60% 60% at 50% 100%, var(--tinta) 0%, transparent 72%);
    opacity: .30; pointer-events: none;
  }
  .tastone:hover { border-color: var(--tinta); }
  .tastone:hover::after { opacity: .46; }
  .tastone .segno { color: var(--tinta); }
  .tastone.viola { --tinta: #8b5cf6; }
  .tastone.rosa  { --tinta: #f472b6; }
  .tastone.ciano { --tinta: #22d3ee; }
  .tastone.ambra { --tinta: #fb923c; }
  /* L'archivio: grigio, e non e' pigrizia. E' la sezione di quello che si e'
     gia' guardato e messo via, e un colore acceso la farebbe sembrare una cosa
     da guardare. */
  .tastone.grigio { --tinta: #6b7280; }
  .tastone.verde { --tinta: #34d399; }
  .tastone.on { border-color: var(--tinta); }
  .tastone.on::after { opacity: .5; }
  .tastone.piccolo { min-height: 84px; padding: 13px 14px 12px; }
  .tastone.piccolo .segno { font-size: 19px; width: 22px; height: 22px; }
  .tastone.piccolo .nome { font-size: 14px; }

  /* ------------------------------------------------------------- moduli */
  label { display: block; margin: 13px 0 5px; font-size: 12.5px; color: var(--dim); }
  input, textarea, select {
    font: inherit; color: var(--txt); background: #0b0d13;
    border: 1px solid var(--line2); border-radius: 12px; padding: 12px; width: 100%;
  }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--accent); }
  textarea { min-height: 96px; resize: vertical; }

  /**
   * Il tasto grande, uno solo di altezza.
   *
   * Misurato nella pagina vera: 47px per un tasto normale e 51px per uno con
   * il bordo — perche' «piano» aggiunge un bordo di 1px per lato e il padding
   * era su «content-box». Due tasti che fanno la stessa cosa e sembrano di due
   * misure. «border-box» piu' un'altezza dichiarata li rimette pari, e il
   * bordo smette di essere una differenza.
   */
  button {
    font: inherit; font-weight: 600; cursor: pointer; border: 0; color: #fff;
    background: linear-gradient(180deg, #9b6cff, #7c3aed);
    box-sizing: border-box; min-height: var(--tastone-alto);
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    border-radius: 12px; padding: 0 18px;
  }
  button:active { transform: translateY(1px); }
  button:disabled { opacity: .45; cursor: default; }
  button.piano { background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); font-weight: 500; }
  button.largo { width: 100%; }
  /**
   * ⚠ **Una misura sola per i tasti piccoli**, e non piu' «quella che viene».
   *
   * Misurato nella pagina vera: «.mini» alto 35, «.tondo» 34, «.cuore» fra 25 e
   * 28. Tre altezze per tre tasti che stanno **sulla stessa riga**, e nessuna
   * delle tre decisa: erano il risultato di tre padding scritti in tre momenti.
   *
   * Adesso c'e' un numero, «--tasto-alto», e vale per tutti e tre. E' 38 e non
   * 44 — che sarebbe la misura di riferimento per un dito — perche' questi
   * tasti stanno in file da quattro dentro riquadri stretti, e portarli a 44
   * manderebbe a capo mezza galleria. Trentotto e' il compromesso: **uguali**,
   * che era il problema, e piu' grandi di prima.
   */
  button.mini {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: var(--tasto-alto); padding: 0 12px; font-size: 12.5px; font-weight: 500;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); border-radius: 10px;
  }
  button.mini:hover { border-color: var(--accent); }
  button.mini.male:hover { border-color: var(--err); color: var(--err); }
  button.mini.acceso { border-color: var(--accent); background: #1b1533; }
  .fila { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 14px; }

  /* ------------------------------------------------------------- elenchi */
  ul.voci { list-style: none; margin: 0; padding: 0; }
  ul.voci li {
    border-top: 1px solid var(--line); padding: 13px 0;
    display: flex; gap: 11px; align-items: flex-start; flex-wrap: wrap;
  }
  ul.voci li:first-child { border-top: 0; }
  .cresce { flex: 1 1 200px; min-width: 0; }

  /* ------------------------------------------- una riga con dentro qualcuno
     ⚠ Il difetto del 27 agosto 2026: «nella tab delle persone il pulsante per
     inviare un pensiero è sotto». Una riga era cinque figli in fila dentro un
     flex che va a capo — faccia, nome, due tastini, la barra larga tutta la
     riga, un terzo tastino — e con un nome lungo si sfaldava: i tasti su tre
     righe diverse, con la barra a spezzarli in mezzo.

     Adesso sono due blocchi: **chi è** e **cosa gli si può fare**. Ognuno va a
     capo intero, mai un pezzo per volta.

     Sotto i 560 px stanno uno sopra l'altro e i tasti partono da sinistra,
     allineati con il nome; sopra, i tasti si stringono a destra e la riga è
     una. Nessuno dei due è "la versione ridotta" dell'altro: sono le due forme
     giuste per due larghezze. */
  ul.voci li .chi-e {
    display: flex; gap: 11px; align-items: center;
    flex: 1 1 240px; min-width: 0;
  }
  ul.voci li .azioni {
    display: flex; gap: 7px; flex-wrap: wrap; align-items: center;
    /* Non si allargano per riempire il vuoto (flex 0, non 1):
       vuoto — un tasto largo come mezza riga sembra la cosa principale, e non
       lo è. */
    flex: 0 1 auto;
  }
  ul.voci li .azioni:empty { display: none; }
  @media (min-width: 560px) {
    /* I tasti in mezzo all'altezza (align-self center): la riga è alta quanto il nome, che può essere due
       righe di testo; i tasti stanno in mezzo a quell'altezza invece che
       incollati in cima. */
    ul.voci li .azioni { margin-left: auto; justify-content: flex-end; align-self: center; }
  }
  @media (max-width: 559px) {
    /* Allineati con il nome, non con la faccia: la colonna di lettura è
       quella. 34 px di faccia + 11 di spazio. */
    ul.voci li .azioni { width: 100%; padding-left: 45px; }
  }
  .titolo { font-weight: 600; overflow-wrap: anywhere; }
  .dettaglio { color: var(--dim); font-size: 12.5px; overflow-wrap: anywhere; margin-top: 2px; }
  .pillola {
    font-size: 11.5px; padding: 3px 10px; border-radius: 99px;
    border: 1px solid var(--line2); color: var(--dim); white-space: nowrap;
  }
  .pillola.pronta { color: var(--ok); border-color: #34d39955; }
  .pillola.attesa { color: var(--attesa); border-color: #fbbf2455; }
  .pillola.lavoro { color: var(--accent2); border-color: #22d3ee55; }
  .pillola.brutto { color: var(--err); border-color: #f8717155; }
  .vuoto { color: var(--fioco); font-size: 13px; padding: 14px 0; }
  .avviso { margin-top: 12px; font-size: 13px; min-height: 20px; }
  .avviso.male { color: var(--err); }
  .avviso.bene { color: var(--ok); }
  .nota { color: var(--fioco); font-size: 12px; margin-top: 12px; line-height: 1.5; }
  code {
    font: 12.5px ui-monospace, Consolas, monospace; background: #0b0d13;
    border: 1px solid var(--line); border-radius: 8px; padding: 2px 7px;
    overflow-wrap: anywhere; user-select: all;
  }

  /* -------------------------------------------------- il riepilogo (dash) */
  /* Chiesto così: «la sezione lavori facciamola più compatta possibile, più
     che lavori facciamola diventare la tab che ci fa vedere un riepilogo
     generale tipo dash di stato». Quindi: una striscia di numeri in cima, e
     sotto solo quello che sta succedendo **adesso**. Il resto si apre. */
  .strisce { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .striscia {
    background: var(--panel2); border: 1px solid var(--line2); border-radius: 14px;
    padding: 11px 10px; text-align: center;
  }
  .striscia .n { font-size: 22px; font-weight: 700; line-height: 1.1; }
  .striscia .e { font-size: 10.5px; color: var(--fioco); margin-top: 2px; line-height: 1.25; }
  .striscia.verde .n { color: var(--ok); }
  .striscia.giallo .n { color: var(--attesa); }
  .striscia.rosso .n { color: var(--err); }
  .striscia.ciano .n { color: var(--accent2); }

  .adesso {
    border: 1px solid var(--accent); border-radius: 15px; padding: 13px 14px;
    background: linear-gradient(180deg, #1a1330, var(--panel2)); margin-top: 12px;
  }
  .adesso .che { font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
  .adesso .chi { display: block; color: var(--dim); font-size: 12px; margin-top: 3px; }
  .barra { height: 4px; border-radius: 99px; background: #ffffff18; margin-top: 11px; overflow: hidden; }
  .barra i {
    display: block; height: 100%; width: 40%; border-radius: 99px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    animation: scorre 1.7s linear infinite;
  }
  @keyframes scorre { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

  .compatta li { padding: 9px 0; gap: 8px; }
  .compatta .titolo { font-size: 13.5px; font-weight: 500; }
  .compatta .dettaglio { font-size: 11.5px; }

  /* ------------------------------------------------ il menu di una richiesta */
  .menu {
    width: 100%; margin-top: 10px; padding: 10px;
    border: 1px solid var(--line2); border-radius: 14px; background: #0b0d13;
    display: flex; flex-direction: column; gap: 7px;
  }
  .menu button { text-align: left; }
  .menu textarea { min-height: 84px; }
  .menu .come-era {
    font-size: 12px; color: var(--fioco); border-left: 2px solid var(--line2);
    padding-left: 9px; overflow-wrap: anywhere;
  }

  /* ------------------------------------------------------------ galleria */
  .spilla {
    display: inline-block; font-size: 10.5px; padding: 2px 8px; border-radius: 99px;
    border: 1px solid var(--line2); color: var(--dim); margin-top: 6px;
  }
  .spilla.in-bacheca { color: var(--accent2); border-color: #22d3ee55; }
  .quadro .attrezzi { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
  /**
   * ⚠ **Una riga sola, e scorre.** Chiesto il 6 settembre 2026, con la foto
   * degli Stili: «guarda in alto, Musica va sotto: vorrei tutto su una riga».
   *
   * «flex-wrap: wrap» mandava a capo la terza pastiglia appena la somma delle
   * larghezze superava lo schermo — e con i numeri accanto («Immagini · 16»)
   * la supera sempre su un telefono stretto. Andare a capo, per una fila di
   * filtri, e' la scelta peggiore: la riga sotto sembra un'altra cosa, e su un
   * riquadro come quello degli Stili si perde in mezzo al resto.
   *
   * Una riga che **scorre di lato** invece dice quello che e': ci sono altre
   * scelte, sono di la'. Vale a qualunque larghezza e non invecchia quando se
   * ne aggiunge una quarta.
   *
   * La barra dello scorrimento si nasconde: e' un gesto, non un comando.
   */
  /**
   * ⚠ **A cascata, non a scorrimento.** Rimesso nella 1.0.0.
   *
   * Nella 0.9.6 le avevo messe su **una riga sola che scorre di lato**, per non
   * farle andare a capo. La risposta, provandola: «facciamo tornare i
   * quadratini stile e altro a cascata, non voglio swipare, e' fastidioso:
   * vorrei tutto a schermo ma ordinato».
   *
   * Ha ragione, e il ragionamento di prima era sbagliato in un punto precente:
   * avevo trattato «va a capo» come un difetto. Non lo e' — **e' l'unico modo
   * di vedere tutto insieme**. Quello che era brutto era che andando a capo la
   * riga sotto sembrava un'altra cosa, e quello si risolve con lo spazio, non
   * nascondendo meta' delle scelte dietro a un gesto.
   *
   * Uno scorrimento laterale, per una fila di filtri, ha un difetto che si paga
   * ogni volta: **non si sa che c'e' altro**. Un elenco a cascata lo si legge
   * tutto in un colpo d'occhio, e su un telefono e' esattamente quello che
   * serve.
   */
  .filtri {
    display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 12px;
    align-items: center;
  }
  .filtri button.on { border-color: var(--accent); color: var(--txt); background: #1b1533; }
  .quadri { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 11px; }

  /**
   * ⚠ **Mai guardata.** Nuovo nella 0.9.1.
   *
   * Chiesto il 5 settembre 2026: «la possibilita' di vedere quando un item e'
   * nuovo, mai visualizzato, colorandolo diversamente». Non e' decorazione: una
   * notte di lavoro lascia trenta file, e la mattina dopo non c'e' modo di
   * sapere quali si sono gia' guardati.
   *
   * Il segno e' **il bordo e un pallino**, non lo sfondo: lo sfondo di un
   * riquadro e' l'immagine, e tingerla sarebbe mentire su come e' venuta.
   */
  .quadro.nuova { border-color: var(--accent); box-shadow: 0 0 0 1px #8b5cf644; }
  .quadro.nuova .sotto .nome::after {
    content: "";
    display: inline-block; vertical-align: middle;
    width: 7px; height: 7px; margin-left: 6px; border-radius: 99px;
    background: var(--accent);
  }
  /* Di chi e', quando si guarda la roba di tutti. Piu' visibile di una spilla:
     e' l'unica cosa che distingue due foto uguali fatte da due persone. */
  .quadro .padrone {
    display: inline-flex; align-items: center; gap: 5px;
    background: #8b5cf622; border: 1px solid #8b5cf655; color: var(--txt);
    border-radius: 99px; padding: 2px 8px; font-size: 11px; margin-top: 4px;
  }
  .quadro .padrone .faccia-tonda { width: 16px; height: 16px; font-size: 9px; }
  /* Le cose non pubblicate, nel profilo di qualcun altro visto da chi decide:
     un colore diverso, perche' guardarle e' un permesso e non la normalita'. */
  .quadro.privata { border-color: #fb923c66; }
  .quadro.privata .sotto .riga::before { content: "non pubblicata \u00b7 "; color: var(--ambra); }
  @media (min-width: 620px) { .quadri { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }
  .quadro { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: #0b0d13; }
  .quadro .vetro { position: relative; display: block; width: 100%; cursor: pointer; border: 0; padding: 0; background: #000; }
  .quadro img, .quadro video { width: 100%; display: block; aspect-ratio: 16/10; object-fit: cover; background: #000; }
  .quadro .vetro .bollino {
    position: absolute; right: 8px; bottom: 8px;
    background: #05060ac2; border-radius: 99px; padding: 3px 9px;
    font-size: 11px; color: #fff; pointer-events: none;
  }
  .quadro .vetro .play {
    position: absolute; inset: 0; display: grid; place-items: center;
    font-size: 34px; color: #ffffffdd; text-shadow: 0 2px 14px #000; pointer-events: none;
  }
  .quadro .senza {
    aspect-ratio: 16/10; display: grid; place-items: center;
    background: linear-gradient(150deg, #1b1533, #0b1a20); font-size: 30px; color: #ffffff55;
  }
  .quadro audio { width: 100%; display: block; margin-top: 8px; }
  .quadro .sotto { padding: 9px 11px 11px; }
  .quadro .nome { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .quadro .riga { font-size: 11px; color: var(--fioco); margin-top: 3px; }

  /* --------------------------------------------------------- la lente */
  /* Chiesto il 26 agosto 2026: «le immagini, se le tappo, si devono aprire a
     schermo intero con anche un pulsante per salvarlo sul telefono, poi un
     pulsante condividi sull'app». Vale anche per i video: una clip in un
     riquadro da 160 px non si guarda, si intravede. */
  .lente {
    position: fixed; inset: 0; z-index: 70;
    background: #04050af5; backdrop-filter: blur(4px);
    display: flex; flex-direction: column;
    padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
    animation: entra .18s ease-out;
  }
  .lente .cima {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  }
  .lente .cima .titolo { flex: 1; font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lente .palco {
    flex: 1; min-height: 0; display: grid; place-items: center; padding: 4px 10px;
  }
  .lente .palco img, .lente .palco video {
    max-width: 100%; max-height: 100%; border-radius: 12px; display: block;
    object-fit: contain; background: #000;
  }
  .lente .palco .copertinona {
    width: min(70vw, 320px); aspect-ratio: 1; border-radius: 18px; object-fit: cover;
    box-shadow: 0 20px 60px -20px #000;
  }
  .lente .sotto { padding: 10px 14px 16px; }
  .lente .attrezzi { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  .lente .didascalia { color: var(--dim); font-size: 12.5px; text-align: center; margin-bottom: 10px; overflow-wrap: anywhere; }

  /* -------------------------------------------------------- il foglio */
  /* Le impostazioni non sono una scheda in fondo: sono un foglio che sale.
     Chiesto così — «mettiamo lì il pulsante impostazioni e lì possiamo vedere
     le cose» — e il posto giusto per una cosa che si apre, si guarda e si
     chiude non è una delle cinque schede che si usano ogni giorno. */
/**
   * ⚠ **Il messaggino, al posto di «alert».** Nuovo nella 0.9.4.
   *
   * Chiesto il 6 settembre 2026, con la foto di «rifai la copertina»: «quel
   * messaggio in quello stile non mi piace, l'ho visto anche per altre cose:
   * curiamo tutto bene».
   *
   * Aveva ragione, e il difetto non era solo estetico. «alert()» dentro una
   * WebView disegna la finestra **di Android**, non la nostra: grigia, con il
   * pulsante blu di sistema, e — questa e' la parte che fa male —
   * **con l'indirizzo della pagina in cima**. Nella sua foto si leggeva
   * l'indirizzo del tunnel Cloudflare a caratteri grandi, sopra a una frase di
   * sei parole. Un dettaglio interno della macchina, dato in pasto a chi
   * voleva solo sapere che la copertina era in fila.
   *
   * E poi ferma tutto: «alert» blocca il thread finche' non si preme OK, il
   * che su un telefono vuol dire una musica che salta.
   *
   * Questo invece e' un rettangolo nostro che sale dal basso, sta tre secondi e
   * se ne va. Sopra alla barra che suona, sotto ai fogli, e non ruba il tocco.
   */
  .avvisi {
    position: fixed; left: 12px; right: 12px; z-index: 90;
    bottom: calc(var(--fondo-alto) + 14px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 8px; align-items: center;
    pointer-events: none;
  }
  body.consuono .avvisi {
    bottom: calc(var(--fondo-alto) + var(--lettore-alto) + 14px + env(safe-area-inset-bottom));
  }
  .avviso-su {
    max-width: 460px; width: fit-content;
    padding: 12px 16px; border-radius: 14px;
    background: #161922f5; border: 1px solid var(--line2); color: var(--txt);
    font-size: 13px; line-height: 1.45; text-align: center;
    box-shadow: 0 18px 44px -18px #000; backdrop-filter: blur(14px);
    animation: avvisoEntra .22s cubic-bezier(.2,1.2,.4,1);
  }
  .avviso-su.male { border-color: #f8717166; color: #fecaca; }
  .avviso-su.bene { border-color: #34d39966; }
  .avviso-su.va { animation: avvisoEsce .3s ease-in forwards; }
  @keyframes avvisoEntra { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes avvisoEsce { to { opacity: 0; transform: translateY(8px) scale(.98); } }

  .foglio {
    position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-end;
    background: #05060ad0; backdrop-filter: blur(5px); animation: entra .18s ease-out;
  }
  .foglio .carta {
    width: 100%; max-height: 86vh; overflow-y: auto;
    background: linear-gradient(180deg, var(--panel), var(--bg));
    border-top: 1px solid var(--line2); border-radius: 22px 22px 0 0;
    padding: 8px 16px calc(20px + env(safe-area-inset-bottom));
    animation: sale .22s cubic-bezier(.2,.8,.3,1);
  }
  @media (min-width: 760px) {
    .foglio { align-items: center; justify-content: center; padding: 24px; }
    .foglio .carta { max-width: 560px; border-radius: 20px; border: 1px solid var(--line2); }
  }
  .foglio .maniglia {
    width: 42px; height: 4px; border-radius: 99px; background: var(--line2);
    margin: 6px auto 14px;
  }
  @keyframes sale { from { transform: translateY(22px); opacity: .4; } to { transform: none; opacity: 1; } }
  .voceFoglio {
    width: 100%; text-align: left; background: none; border: 0; color: var(--txt);
    padding: 13px 4px; font: inherit; font-weight: 500; cursor: pointer;
    border-top: 1px solid var(--line); display: flex; gap: 12px; align-items: center;
  }
  .voceFoglio:first-of-type { border-top: 0; }
  .voceFoglio .segno { width: 22px; text-align: center; color: var(--accent); font-size: 16px; }
  .voceFoglio small { display: block; color: var(--fioco); font-size: 11.5px; font-weight: 400; }
  .voceFoglio.male { color: var(--err); }
  .voceFoglio.male .segno { color: var(--err); }

  /* ---------------------------------------------------------- DaProd */
  /* La bacheca: quello che le persone hanno deciso di far vedere. Non è una
     griglia di miniature — quella è la Galleria — è una colonna di cose con
     una faccia sopra e due tasti sotto. La differenza fra una cartella
     condivisa e un posto dove si sta è tutta qui. */
  .posta {
    border: 1px solid var(--line); border-radius: var(--raggio); overflow: hidden;
    background: linear-gradient(180deg, var(--panel), var(--panel2)); margin-bottom: 12px;
  }
  .posta .testa { display: flex; gap: 10px; align-items: center; padding: 12px 14px 10px; }
  .posta .testa .nome { font-weight: 650; font-size: 13.5px; }
  .posta .testa .quando { color: var(--fioco); font-size: 11.5px; }
  .faccia-tonda {
    width: 34px; height: 34px; border-radius: 99px; object-fit: cover; flex: 0 0 auto;
    background: linear-gradient(150deg, #9b6cff, #0e7490); display: grid; place-items: center;
    font-size: 13px; font-weight: 700; color: #fff;
  }
  .faccia-tonda.grande { width: 66px; height: 66px; font-size: 24px; }
  .posta .vetro { display: block; width: 100%; border: 0; padding: 0; background: #000; cursor: pointer; position: relative; }
  /**
   * Quanto e' grande una cosa in bacheca.
   *
   * ⚠ Il difetto del 5 settembre 2026: «la schermata daprod deve essere
   * aggiustata a livello grafico, troppo grandi i contenuti soprattutto su
   * dispositivi ad alta risoluzione».
   *
   * Era «max-height: 66vh», e su un telefono alto quella e' **due terzi di
   * schermo per un riquadro**: si scorreva per venti secondi per vedere tre
   * cose. Adesso il tetto e' il piu' stretto fra i due terzi dello schermo e
   * 340 px, e su uno schermo largo comanda il rapporto della foto invece del
   * ritaglio.
   *
   * «object-fit: contain» invece di «cover»: tagliare la faccia a
   * un'immagine per farla stare in un rettangolo va bene per una miniatura,
   * non per la cosa che uno ha deciso di far vedere agli altri.
   */
  .posta .vetro img, .posta .vetro video {
    width: 100%; display: block;
    max-height: min(52vh, 340px);
    object-fit: contain;
  }
  @media (min-width: 620px) {
    .posta .vetro img, .posta .vetro video { max-height: min(56vh, 420px); }
  }
  .posta .senza { padding: 26px; text-align: center; font-size: 34px; color: #ffffff55; background: linear-gradient(150deg, #1b1533, #0b1a20); }
  .posta .parole { padding: 11px 14px 4px; font-size: 13.5px; overflow-wrap: anywhere; }
  .posta .piedi { display: flex; gap: 8px; padding: 10px 14px 13px; align-items: center; }
  .cuore {
    background: none; border: 0; padding: 0 8px; color: var(--dim); font-size: 13px;
    min-height: var(--tasto-alto);
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500;
  }

  /* ---------------------------------------------------------- i commenti
     Sotto la cosa, dentro lo stesso riquadro: un commento appartiene a
     quello che sta sopra, e in un foglio a parte perderebbe la cosa di vista.
     La riga di sinistra e' quella che dice «questo e' un discorso su quello
     li'», ed e' l'unico ornamento che serve. */
  .posta .commenti {
    border-top: 1px solid var(--line); padding: 4px 14px 12px;
    display: flex; flex-direction: column; gap: 2px;
  }
  .commento {
    display: flex; gap: 9px; align-items: flex-start; padding: 8px 0;
  }
  .commento .faccia-tonda { width: 26px; height: 26px; font-size: 10.5px; }
  .commento .chi { font-size: 11.5px; color: var(--fioco); }
  .commento .cosa { font-size: 13.5px; overflow-wrap: anywhere; margin-top: 1px; }
  .commento .toglilo {
    background: none; border: 0; color: var(--fioco); cursor: pointer;
    font-size: 12px; padding: 4px 6px; line-height: 1; flex: 0 0 auto;
  }
  .commento .toglilo:hover { color: var(--err); }

  /* La casella e il tasto sulla stessa riga, e la casella cresce scrivendo:
     un commento di due righe dentro una fessura da una non si rilegge. */
  .scrivi-commento { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; }
  .scrivi-commento textarea {
    flex: 1 1 auto; min-width: 0; resize: none; overflow: hidden;
    margin: 0; padding: 9px 11px; font-size: 13.5px; line-height: 1.45;
  }
  .scrivi-commento button { flex: 0 0 auto; }
  .cuore.mio { color: var(--rosa); }
  .cuore .simbolo { font-size: 17px; line-height: 1; }

  /* -------------------------------------------------------- il profilo */
  .profilo { display: flex; gap: 14px; align-items: center; }
  .profilo .dati { flex: 1; min-width: 0; }
  .profilo .dati .nome { font-size: 18px; font-weight: 700; }
  .profilo .dati .motto { color: var(--dim); font-size: 13px; margin-top: 2px; overflow-wrap: anywhere; }

  /* ------------------------------------------------------ chiacchierata */
  /* Dieci minuti col modello. Le battute sono bolle e non righe di elenco:
     una conversazione si legge per turni, e il turno si vede dalla forma. */
  .discorso {
    display: flex; flex-direction: column; gap: 9px;
    max-height: 46vh; overflow-y: auto; padding: 4px 2px; margin-top: 6px;
  }
  .bolla {
    max-width: 84%; padding: 10px 13px; border-radius: 16px; font-size: 13.5px;
    line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap;
  }
  .bolla.mia { align-self: flex-end; background: linear-gradient(180deg, #7c3aed, #6d28d9); color: #fff; border-bottom-right-radius: 5px; }
  .bolla.sua { align-self: flex-start; background: var(--panel2); border: 1px solid var(--line2); border-bottom-left-radius: 5px; }
  .bolla.pensa { color: var(--fioco); font-style: italic; }
  .cronometro {
    font-size: 11.5px; color: var(--fioco); border: 1px solid var(--line2);
    border-radius: 99px; padding: 3px 10px; white-space: nowrap;
  }
  .cronometro.poco { color: var(--attesa); border-color: #fbbf2455; }
  .dettatura { display: flex; gap: 8px; align-items: flex-end; margin-top: 10px; }
  .dettatura textarea { min-height: 46px; max-height: 130px; }

  /* Il posto in fila, mentre si aspetta di parlare col modello. */
  .inFila {
    display: flex; gap: 14px; align-items: center;
    border: 1px solid var(--line2); border-radius: 16px; padding: 14px;
    background: linear-gradient(180deg, #221c0e, var(--panel2)); margin-top: 10px;
  }
  .inFila .numerone { font-size: 30px; font-weight: 700; color: var(--attesa); line-height: 1; }
  .inFila b { display: block; font-size: 14px; }
  .inFila small { color: var(--dim); font-size: 12px; }

  /**
   * ⚠ **«piano» sono due cose diverse, e si pestavano i piedi.**
   *
   * «button.piano» (qui sopra) e' un tasto **quieto** — grigio, senza il
   * gradiente viola. Questo «.piano» invece e' il **riquadro del piano di
   * lavoro**, quello che il modello propone con l'elenco dei lavori. Stesso
   * nome, due significati nati in due momenti diversi.
   *
   * Il risultato si vedeva misurando: il tasto «Gestione stili e prompt» ha
   * classe «piano largo», quindi si prendeva il bordo viola, il gradiente e il
   * padding del riquadro — e veniva alto 51 dove tutti gli altri stanno a 48.
   * Un tasto che non e' come gli altri senza che nessuno l'abbia deciso.
   *
   * «:not(button)» toglie di mezzo la collisione senza rinominare niente in
   * quattro file. Il nome resta ambiguo, ed e' segnato qui perche' il giorno
   * che si rinomina si sappia perche'.
   */
  .piano:not(button) {
    border: 1px solid var(--accent); border-radius: 16px; padding: 13px 14px;
    background: linear-gradient(180deg, #1a1330, var(--panel2)); margin-top: 12px;
  }
  .piano .riassunto { font-weight: 600; font-size: 13.5px; margin-bottom: 9px; }
  .piano .lavoro {
    display: flex; gap: 10px; align-items: flex-start; padding: 9px 0;
    border-top: 1px solid var(--line);
  }
  .piano .lavoro:first-of-type { border-top: 0; }
  .piano .lavoro input { width: 18px; height: 18px; flex: 0 0 auto; margin-top: 2px; }
  .piano .lavoro .che { font-size: 13.5px; font-weight: 500; }
  .piano .lavoro .come { color: var(--fioco); font-size: 11.5px; margin-top: 2px; overflow-wrap: anywhere; }

  /* ----------------------------------------------------------- i regali */
  .pacco {
    position: fixed; inset: 0; z-index: 65; display: grid; place-items: center;
    background: #05060af2; backdrop-filter: blur(6px); padding: 22px;
    animation: entra .25s ease-out;
  }
  .pacco .dentro {
    max-width: 420px; width: 100%; text-align: center;
    background: linear-gradient(180deg, var(--panel), var(--panel2));
    border: 1px solid var(--line2); border-radius: 22px; padding: 26px 22px 20px;
  }
  .pacco .fiocco { font-size: 74px; line-height: 1; animation: scuoti 1.1s ease-in-out infinite; }
  .pacco.aperto .fiocco { animation: apri .5s ease-out forwards; }
  .pacco h2 { font-size: 19px; margin: 12px 0 4px; }
  .pacco .da { color: var(--dim); font-size: 13px; margin-bottom: 4px; }
  .pacco .messaggio { color: var(--txt); font-size: 13.5px; margin: 10px 0 0; }
  .pacco .anteprima { margin-top: 14px; }
  .pacco .anteprima img, .pacco .anteprima video { width: 100%; border-radius: 14px; display: block; }
  .pacco .fila { justify-content: center; }
  @keyframes entra { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scuoti {
    0%, 100% { transform: rotate(-6deg) scale(1); }
    50% { transform: rotate(6deg) scale(1.06); }
  }
  @keyframes apri {
    0% { transform: scale(1); }
    45% { transform: scale(1.35) rotate(8deg); }
    100% { transform: scale(1) rotate(0); }
  }

  /* Dove si lascia cadere un file: la riga di una persona collegata. */
  ul.voci li.cade { border-radius: 12px; outline: 2px dashed var(--accent); outline-offset: 3px; }
  /* La barra dell'invio: sotto a tutto, larga quanto la riga. Sta in fondo
     perché dice a che punto è un file che parte — non è un tasto, e in mezzo
     ai tasti li spezzava in due gruppi. */
  .barra-invio { flex: 1 0 100%; height: 5px; border-radius: 99px; background: var(--line2); margin-top: 9px; }
  .barra-invio i { display: block; height: 100%; border-radius: 99px; background: var(--accent); width: 0; }

  /* --------------------------------------------------------- il QR */
  .qr { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
  .qr img { width: 190px; height: 190px; border-radius: 14px; background: #fff; padding: 8px; }
  .qr .codice { font-size: 32px; font-weight: 700; letter-spacing: .12em; user-select: all; }

  /* ------------------------------------------------------- la sospensione */
  /* Quando chi sta al computer lo sta usando, tutti devono saperlo: senza
     questa fascia, dal telefono si vede solo una richiesta che non parte. */
  .pausa {
    border: 1px solid #fbbf2455; background: linear-gradient(180deg, #221c0e, var(--panel));
    border-radius: 14px; padding: 12px 14px; margin-bottom: 12px;
    display: flex; gap: 11px; align-items: center;
  }
  .pausa .segno { font-size: 20px; color: var(--attesa); }
  .pausa .dentro { flex: 1; min-width: 0; }
  .pausa b { display: block; font-size: 13.5px; }
  .pausa small { color: var(--dim); font-size: 12px; }
  /* Quando qualcuno bussa la fascia cambia colore: il giallo dice «aspetta»,
     il viola dice «qualcuno ti sta chiedendo qualcosa». Due cose diverse non
     possono avere lo stesso colore nello stesso posto. */
  .pausa.bussano {
    border-color: #8b5cf655;
    background: linear-gradient(180deg, #1a1230, var(--panel));
  }
  .pausa.bussano .segno { color: var(--accent); }

  /* Com'e' stata fatta una cosa: una riga per campo, dentro al foglio. */
  .info {
    padding: 9px 0; border-bottom: 1px solid var(--line);
  }
  .info b { display: block; font-size: 11.5px; color: var(--dim); font-weight: 600; }
  .info .cosa {
    font-size: 13.5px; margin-top: 3px; white-space: pre-wrap; overflow-wrap: anywhere;
  }

  /* Una riga della rete: chi bussa, o un altro computer. */
  .bussa {
    display: flex; gap: 10px; align-items: center;
    padding: 10px 12px; margin-top: 8px;
    background: var(--panel2); border: 1px solid var(--line2); border-radius: 12px;
  }
  .bussa .cresce { flex: 1; min-width: 0; }
  .bussa b { display: block; font-size: 13.5px; }
  .bussa small { color: var(--dim); font-size: 11.5px; display: block; overflow-wrap: anywhere; }

  /* Un po' di respiro in fondo alle pagine lunghe.
     Chiesto il 5 settembre 2026: «in produci lascia un po' di spazio in fondo,
     cosi' lasciamo un po' di spazio quando si scrolla». Senza, l'ultimo campo
     finisce appiccicato alla barra delle schede e per toccarlo si sbaglia. */
  /**
   * ⚠ **Lo spazio in fondo vale per TUTTE le schede.** E adesso e' scritto
   * cosi': «main > section», non un elenco di quattro id.
   *
   * Chiesto il 6 settembre 2026, con la foto degli Stili: «lo fa con tutte le
   * pagine — come vedi, quando c'e' un contenuto in riproduzione la barra
   * nasconde un po'; spaziamo bene la parte finale di tutte le schede».
   *
   * Aveva ragione due volte. La prima: l'elenco a mano copriva quattro schede
   * su sei, e Stili e Fila erano rimaste fuori — un elenco di id e' una lista
   * che invecchia ogni volta che si aggiunge una scheda. La seconda, piu'
   * importante: quaranta pixel bastavano **senza** la barra che suona, e con
   * quella accesa mancavano.
   *
   * Adesso lo spazio e' calcolato: la barra delle schede, la barra che suona
   * quando c'e', e un pollice di respiro. Il «body.consuono» qui sopra sposta
   * gia' il fondo del corpo; questo e' il respiro **dentro** la scheda, che e'
   * quello che rende leggibile l'ultimo riquadro invece di farlo finire
   * appiccicato al vetro.
   */
  /**
   * ⚠ **Il fondo, per la terza volta.** Chiesto il 6 settembre 2026: «notiamo
   * ancora che la parte sotto clippa, anche nelle altre schermate».
   *
   * Aveva ragione, e la ragione e' che le due spinte non si sommavano. Il corpo
   * scende di «--fondo-alto + --lettore-alto» (la barra delle schede piu'
   * quella che suona), e questo padding **si aggiunge dentro alla sezione** —
   * ma trentaquattro pixel di respiro sono quello che serve **senza** niente
   * sotto. Con due barre sovrapposte, alte insieme centootto, l'ultima riga
   * finiva sotto il vetro. Nella sua foto era la riga «DaProd Suite 0.9.5 su
   * DAPRODMAIN», tagliata a meta'.
   *
   * Adesso il conto e' scritto: **le barre piu' un pollice**. Un pollice
   * (36 px) e' quanto serve perche' l'ultima riga si legga e si possa toccare
   * senza che il dito copra proprio quella.
   */
  main > section { padding-bottom: 36px; }
  body.consuono main > section {
    padding-bottom: calc(var(--lettore-alto) + 36px);
  }

  /* ------------------------------------------------------- il visualizer */
  /* Dietro a tutto, e senza toccare niente: nessun evento del mouse arriva
     qui, quindi la pagina sopra funziona esattamente come prima. */
  /**
   * ⚠ **Il visualizer sta dentro il palco**, non dietro alla pagina.
   *
   * Nella 0.9.0 era lo sfondo del corpo, e la foto del 5 settembre 2026 l'ha
   * chiuso in una riga: «nella foto vedi il rosso, e' dove vorrei vedere il
   * visualizer, non nello sfondo dove lo hai messo». A schermo intero **il
   * visualizer e' il contenuto**: un brano non ha altro da mostrare che la sua
   * copertina e quello che il suono fa vedere, e guardarlo attraverso una
   * lista della spesa non e' guardarlo.
   *
   * Sta in fondo al palco e non tocca niente: nessun evento del mouse arriva
   * qui, quindi i tasti sopra funzionano esattamente come prima.
   */
  /**
   * ⚠ **Il visualizer come atmosfera, dietro alla pagina.** Nuovo nella 0.9.4.
   *
   * Chiesto il 6 settembre 2026: «usiamo le animazioni del visualizer sullo
   * sfondo dell'app in tutte le schede, ma molto molto sfocato e trasparente,
   * direi un 22 percento su 100».
   *
   * **E non e' un ritorno alla 0.9.0**, dove il visualizer era *solo* lo sfondo
   * e a schermo intero si guardava una lista della spesa con le onde dietro.
   * Qui sono due cose con due mestieri: nel palco il visualizer **e' il
   * contenuto**, nitido e a fuoco; qui e' **atmosfera** — sfocato a venti
   * pixel, al ventidue per cento, sotto a tutto.
   *
   * Tre righe che contano piu' di quanto sembri:
   * - «pointer-events: none», o meta' pagina smetterebbe di rispondere;
   * - «z-index: -1» con il corpo trasparente sopra: e' l'unico modo perche'
   *   stia **sotto** senza entrare nell'ordine di impilamento delle schede;
   * - «will-change: opacity», perche' un blur a venti pixel ridipinto sessanta
   *   volte al secondo senza un livello suo fa scattare lo scorrimento.
   */
  #sfondo-visual {
    position: fixed; inset: 0; z-index: -1;
    width: 100%; height: 100%;
    opacity: .22; filter: blur(20px) saturate(130%);
    /* Il blur mangia i bordi: si allarga un po' oltre lo schermo, o si
       vedrebbe una cornice piu' chiara tutt'intorno. */
    transform: scale(1.12);
    pointer-events: none; will-change: opacity;
    transition: opacity .8s ease;
  }
  #sfondo-visual[hidden] { display: block !important; opacity: 0; }

  .palcoLettore #visual {
    position: absolute; inset: 0; z-index: 0;
    width: 100%; height: 100%;
    pointer-events: none;
  }

  /* ----------------------------------------------------- la barra che suona */
  .barraLettore {
    position: fixed; left: 0; right: 0; z-index: 30;
    bottom: calc(var(--fondo-alto) + env(safe-area-inset-bottom));
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px;
    background: #0d0f16f2; backdrop-filter: blur(12px);
    border-top: 1px solid var(--line2);
  }
  /**
   * ⚠ **«min-height: 0», e senza questa riga la copertina non si vedeva.**
   *
   * Chiesto il 6 settembre 2026: «vedi bene che non funziona l'immagine».
   * Era vero e la causa non era l'immagine: il tasto grande dichiara
   * «min-height: var(--tastone-alto)», cioe' 48, e un minimo batte un'altezza.
   * Questo riquadro chiedeva 40 e veniva 48, dentro una barra alta 58 con otto
   * pixel di padding — quarantadue di spazio. Il riquadro sfondava la barra e
   * quello che si vedeva era il pezzo tagliato: un rettangolo vuoto.
   *
   * E' lo stesso difetto dell'ingranaggio della 0.9.4, nello stesso giorno, in
   * un altro punto. Da qui la regola: chi dichiara un'altezza dichiara anche
   * che non ha un minimo.
   */
  .barraLettore .faccia {
    width: 42px; height: 42px; min-height: 0; flex: 0 0 auto; border-radius: 11px;
    background: var(--panel2) center/cover no-repeat;
    border: 1px solid var(--line2); color: var(--txt);
    display: grid; place-items: center; font-size: 17px; cursor: pointer; padding: 0;
    overflow: hidden;
  }
  .barraLettore .dentro {
    flex: 1; min-width: 0; text-align: left; background: none; border: 0;
    color: var(--txt); cursor: pointer; padding: 0;
  }
  .barraLettore .dentro b {
    display: block; font-size: 13px; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .barraLettore .dentro small {
    display: block; color: var(--dim); font-size: 11px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  /**
   * I comandi della barra: gli stessi del palco, piu' piccoli.
   *
   * Niente cerchi col bordo, che su una barra alta cinquantotto pixel sono
   * quattro macchie in fila. Il play si accende del colore della suite, come di
   * la': e' l'unico dei quattro che si preme davvero.
   */
  .barraLettore .cmd {
    width: 36px; height: 36px; min-height: 0; padding: 0; flex: 0 0 auto;
    border-radius: 99px; background: none; border: 0; color: var(--dim);
    display: grid; place-items: center;
    transition: background .16s ease, color .16s ease, transform .12s ease;
  }
  .barraLettore .cmd svg { width: 18px; height: 18px; fill: currentColor; display: block; }
  .barraLettore .cmd:hover { background: #ffffff10; color: var(--txt); }
  .barraLettore .cmd:active { transform: scale(.88); }
  .barraLettore .cmd.acceso {
    background: linear-gradient(180deg, #9b6cff, #7c3aed); color: #fff;
    box-shadow: 0 4px 14px -6px #7c3aed;
  }
  .barraLettore .cmd.acceso svg { width: 20px; height: 20px; }
  /* Su uno schermo stretto i tasti «prima» e «chiudi» stanno di troppo: play e
     prossimo sono quelli che si premono, gli altri stanno nel palco. */
  @media (max-width: 400px) {
    #lettore-prima, #lettore-chiudi { display: none; }
  }
  /* Con la barra accesa il fondo della pagina scende, o le ultime cose
     finirebbero sotto. */
  /**
   * Anche questa e' dichiarata, e per lo stesso motivo: il fondo del corpo
   * scende di «--lettore-alto», e quel numero dev'essere l'altezza vera o le
   * ultime cose finiscono sotto la barra.
   */
  .barraLettore { box-sizing: border-box; height: var(--lettore-alto); }
  body.consuono {
    padding-bottom: calc(var(--fondo-alto) + var(--lettore-alto) + env(safe-area-inset-bottom));
  }

  /* --------------------------------------------------------------- il palco */
  /**
   * ⚠ Si chiama «palcoLettore» e non «palco», e la ragione e' un difetto vero.
   *
   * La lente — il riquadro che si apre toccando una cosa in galleria — ha
   * dentro di se' un elemento con classe «palco», che e' il posto dove sta la
   * foto. Chiamando «palco» anche questo, le regole di qui sono cadute anche
   * su quello: lo sfondo quasi nero e lo z-index 80 di un riquadro a schermo
   * intero, addosso a un pezzo di lente. Risultato: dentro l'app, la lente si
   * apriva **quasi nera**, con il titolo e i tasti dietro a una lastra.
   *
   * Trovato guardando dentro la WebView con dentro-la-pagina.mjs, non
   * leggendo il codice: da fuori sembrava un problema di «backdrop-filter».
   */
  .palcoLettore {
    position: fixed; inset: 0; z-index: 80; overflow: hidden;
    background: #04050afa;
    display: flex; flex-direction: column;
    padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
    animation: entra .18s ease-out;
  }
  /* Tutto quello che sta nel palco va sopra al canvas. */
  .palcoLettore .cima,
  .palcoLettore .dentro,
  .palcoLettore .tempo,
  .palcoLettore .sotto { position: relative; z-index: 1; }
  /**
   * **Le sfumature.** Chiesto il 6 settembre 2026: «il player a schermo intero
   * molto bello, aggiungiamo delle sfumature in alto e in basso».
   *
   * Non sono decorazione: il visualizer dietro cambia colore in continuazione, e
   * un titolo bianco sopra a un lampo bianco sparisce. Due velature — scura in
   * cima e in fondo, trasparente al centro — danno ai comandi un fondo su cui
   * appoggiarsi senza coprire quello che sta in mezzo, che e' la cosa da
   * guardare. Non prendono i tocchi.
   */
  .palcoLettore::before,
  .palcoLettore::after {
    content: ""; position: absolute; left: 0; right: 0; height: 34%;
    pointer-events: none; z-index: 0;
  }
  .palcoLettore::before {
    top: 0;
    background: linear-gradient(180deg, #04050ac2 0%, #04050a70 38%, transparent 100%);
  }
  .palcoLettore::after {
    bottom: 0;
    background: linear-gradient(0deg, #04050ad9 0%, #04050a85 40%, transparent 100%);
  }
  .palcoLettore .cima { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }

  /* La barra del tempo: si legge dove sei e ci si sposta. */
  .palcoLettore .tempo { display: flex; align-items: center; gap: 10px; padding: 0 16px; }
  .palcoLettore .tempo .ora {
    font-size: 11.5px; color: var(--dim); font-variant-numeric: tabular-nums;
    flex: 0 0 auto; min-width: 38px; text-align: center;
  }
  .palcoLettore .tempo input[type="range"] {
    flex: 1; min-width: 0; margin: 0; accent-color: var(--accent);
    height: 26px; background: none; border: 0; padding: 0;
  }
  .palcoLettore .cima .titolo { flex: 1; min-width: 0; }
  .palcoLettore .cima .titolo b {
    display: block; font-size: 14px; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  /* «3 di 12» apre la fila: sottolineato tratteggiato, che e' il modo piu'
     discreto di dire «questo si tocca» senza farlo sembrare un tasto. */
  .palcoLettore .cima .titolo small {
    display: block; color: var(--dim); font-size: 11.5px; cursor: pointer;
    text-decoration: underline dotted var(--line2); text-underline-offset: 3px;
  }
  .palcoLettore .dentro {
    flex: 1; min-height: 0; display: grid; place-items: center; padding: 6px 12px;
    transition: transform .12s linear, opacity .12s linear;
  }
  .palcoLettore .dentro img, .palcoLettore .dentro video {
    max-width: 100%; max-height: 100%; display: block;
    border-radius: 12px; object-fit: contain; background: #000;
  }
  .palcoLettore .dentro .copertinona {
    width: min(72vw, 340px); aspect-ratio: 1; border-radius: 20px; object-fit: cover;
    box-shadow: 0 24px 70px -24px #000;
  }
  /**
   * ⚠ **La copertina si vede attraverso.** Chiesto il 5 settembre 2026: «la
   * copertina 70 percento trasparenza, cosi' da vedere il visualizer bene».
   *
   * Il numero sta **solo qui**: se e' troppo o troppo poco si cambia questa
   * riga e basta. «opacity: .7» vuol dire che si vede al settanta per cento,
   * che e' il verso in cui la frase e' stata corretta mentre veniva detta
   * («cioe' 30 percento trasparente, 70 si vede»).
   *
   * L'ombra sparisce: un'ombra sotto a una cosa trasparente disegna un alone
   * scuro proprio dove il visualizer sta lavorando.
   */
  .palcoLettore .dentro .copertinona.attraverso { opacity: .7; box-shadow: none; }

  /**
   * **Com'e' stata fatta**, dentro il palco.
   *
   * Sta sopra al visualizer e sotto ai comandi, scorre da sola quando i campi
   * sono tanti (un testo cantato e' lungo), e non si prende mai piu' di un
   * terzo dello schermo: e' una cosa da leggere di sfuggita, non una pagina.
   */
  /**
   * ⚠ **Con le info aperte si scorre il riquadro, non si abbassa il media.**
   *
   * Chiesto il 6 settembre 2026: «quando e' attivato, lo swipe non abbassa piu'
   * il media ma posso scrollare il quadrato delle info».
   *
   * Il conflitto era vero e inevitabile: il palco intero ascolta il
   * trascinamento verticale per chiudersi, e un pannello che scorre vuole
   * esattamente lo stesso gesto nello stesso posto. Vince il pannello, perche'
   * e' quello che l'utente sta guardando quando lo apre — e chiudere il palco
   * si puo' fare comunque trascinando **fuori** dal riquadro, o con la X.
   *
   * «touch-action: pan-y» lo dice al browser prima ancora che il copione se ne
   * accorga: quel rettangolo si scorre in verticale e il resto non lo riguarda.
   */
  .palcoLettore .infoPalco {
    position: relative; z-index: 1;
    margin: 0 14px 6px; padding: 12px 14px; max-height: 34vh; overflow-y: auto;
    touch-action: pan-y; overscroll-behavior: contain;
    background: #0d0f16e6; border: 1px solid var(--line2); border-radius: 14px;
    -webkit-overflow-scrolling: touch;
  }
  .palcoLettore .infoPalco .rigaInfo { margin-bottom: 9px; }
  .palcoLettore .infoPalco .rigaInfo:last-child { margin-bottom: 0; }
  .palcoLettore .infoPalco .rigaInfo b {
    display: block; font-size: 11px; color: var(--fioco);
    text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px;
  }
  .palcoLettore .infoPalco .rigaInfo span {
    display: block; font-size: 12.5px; color: var(--txt); line-height: 1.45;
    white-space: pre-wrap; word-break: break-word;
  }
  /* Il tasto acceso dice che il pannello e' aperto: senza, il secondo tocco e'
     un tentativo invece che un gesto. */
  .palcoLettore .tondo.acceso { border-color: var(--accent); color: var(--accent); }
  .palcoLettore .sotto { display: flex; align-items: center; gap: 10px; padding: 8px 16px 20px; }

  /**
   * ⚠ **I comandi, ridisegnati.** Chiesto il 6 settembre 2026: «i pulsanti del
   * play e avanti indietro vanno ridisegnati bene perche' sono bruttissimi».
   *
   * Cosa non andava, e vale la pena scriverlo perche' e' l'errore piu' comune
   * quando si mettono dei tasti sopra a qualcosa che si muove:
   *
   * 1. erano **tre cerchi neri uguali**, e il piu' importante dei tre non si
   *    distingueva dagli altri se non per un colore arancione che in questa
   *    suite non esiste da nessun'altra parte;
   * 2. i segni erano **glifi tipografici** (⏮ ⏸ ⏭), che hanno pesi e
   *    allineamenti decisi da chi ha disegnato il font — su Android uno, su un
   *    browser un altro — e che a 22px su fondo mosso si leggono male;
   * 3. **niente li teneva insieme**: tre tondi staccati su un visualizer che
   *    lampeggia sono tre macchie, non un gruppo.
   *
   * Adesso: un **vetro solo** dietro ai tre, segni **disegnati** (stesso peso,
   * stesso centro), e il play piu' grande degli altri due perche' e' quello che
   * si preme. Il colore acceso e' quello della suite.
   */
  .palcoLettore .comandi {
    display: flex; align-items: center; gap: 6px;
    padding: 5px; border-radius: 99px;
    background: #0c0e15b8; border: 1px solid #ffffff14;
    backdrop-filter: blur(14px) saturate(130%);
    box-shadow: 0 10px 34px -14px #000;
  }
  .palcoLettore .comandi button {
    width: 46px; height: 46px; padding: 0; border-radius: 99px;
    background: none; border: 0; color: var(--txt);
    display: grid; place-items: center; min-height: 0;
    transition: background .16s ease, transform .12s ease;
  }
  .palcoLettore .comandi button svg { width: 22px; height: 22px; fill: currentColor; display: block; }
  .palcoLettore .comandi button:hover { background: #ffffff12; }
  .palcoLettore .comandi button:active { transform: scale(.9); }
  /* Il play: piu' grande, e pieno del colore della suite. Un tasto che si
     preme cento volte a sera merita di essere quello che si trova a occhi
     chiusi. */
  .palcoLettore .comandi button.grosso {
    width: 58px; height: 58px;
    background: linear-gradient(180deg, #9b6cff, #7c3aed);
    box-shadow: 0 8px 22px -8px #7c3aed;
  }
  .palcoLettore .comandi button.grosso svg { width: 26px; height: 26px; }
  .palcoLettore .comandi button.grosso:hover { background: linear-gradient(180deg, #a87dff, #8b4bf0); }

  /* I due tasti ai lati: stesso mestiere, stessa misura, e stanno lontani dal
     play perche' non si premono per sbaglio mentre si cerca la pausa. */
  .palcoLettore .sotto .tondo {
    width: 44px; height: 44px; min-height: 0;
    background: #0c0e15b8; border: 1px solid #ffffff14;
    backdrop-filter: blur(14px);
  }
  .palcoLettore .sotto .tondo svg { width: 20px; height: 20px; fill: currentColor; }
  .palcoLettore .sotto .tondo.acceso { border-color: var(--accent); color: var(--accent); }

  /**
   * **Il menu degli effetti.** Chiesto il 6 settembre 2026: «si apre un piccolo
   * menu con tutti gli effetti; se ne clicchiamo uno si fissa su
   * quell'effetto, se ci riclicco torna deselezionato e torna in cambio
   * automatico».
   *
   * Sta dentro il palco e non in un foglio, per la stessa ragione delle info:
   * un foglio sopra a un riquadro a schermo intero finisce sotto. Sale da
   * sinistra, dove sta il suo tasto.
   */
  .palcoLettore .effetti {
    position: absolute; left: 14px; right: 14px; bottom: 86px; z-index: 3;
    display: flex; flex-wrap: wrap; gap: 7px;
    padding: 12px; border-radius: 16px;
    background: #0c0e15f2; border: 1px solid var(--line2);
    backdrop-filter: blur(16px); box-shadow: 0 18px 50px -20px #000;
    animation: saleSu .18s ease-out;
  }
  @keyframes saleSu { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .palcoLettore .effetti button {
    min-height: 34px; height: 34px; padding: 0 12px; border-radius: 99px;
    font-size: 12px; font-weight: 500;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--dim);
  }
  /* Quello fissato: acceso. Nessuno acceso vuol dire «cambia da solo», che e'
     come parte, e la riga in cima al menu lo dice a parole. */
  .palcoLettore .effetti button.fisso {
    border-color: var(--accent); color: var(--txt); background: #1b1533;
  }
  .palcoLettore .effetti .comeVa {
    flex: 1 0 100%; font-size: 11px; color: var(--fioco); margin-bottom: 2px;
  }

  /**
   * ⚠ **La foto da modificare, con sopra il disegno.** Dalla 1.0.2.
   *
   * Due tele sovrapposte: sotto la foto, sopra quello che dipinge il dito. Non
   * una sola, perche' il disegno si deve poter cancellare senza ricaricare la
   * foto — e perche' la maschera che va al motore e' **solo** quella di sopra.
   */
  .fotoDaModificare { margin: 6px 0 2px; }
  .fotoDaModificare .fila { margin-top: 8px; flex-wrap: wrap; }
  .pilaFoto {
    position: relative; border-radius: 12px; overflow: hidden;
    border: 1px solid var(--line); background: #06070b;
    line-height: 0;
  }
  .pilaFoto canvas { display: block; width: 100%; height: auto; }
  /**
   * La tela del pennello sta esattamente sopra all'altra, ed e' semitrasparente
   * apposta: si deve vedere **cosa c'e' sotto la vernice**, o non si capisce
   * cosa si sta per far rifare al modello.
   */
  .pilaFoto .ilPennello {
    position: absolute; inset: 0; opacity: .55;
    /* Senza questa riga, dipingere su un telefono scorre la pagina. */
    touch-action: none; cursor: crosshair;
  }
  /* I riquadri fra cui si sceglie una foto gia' fatta. */
  .vetro.sceglibile { padding: 0; border-radius: 12px; overflow: hidden; aspect-ratio: 1; }
  .vetro.sceglibile img { width: 100%; height: 100%; object-fit: cover; }

  /**
   * Il QR grande, dentro un foglio.
   *
   * Fondo bianco e non trasparente: un QR su fondo scuro non lo legge nessuna
   * fotocamera, e il bordo bianco intorno fa parte del codice — senza, molti
   * lettori non lo agganciano.
   */
  .qrGrande {
    display: block; width: min(72vw, 300px); aspect-ratio: 1; margin: 14px auto 10px;
    background: #fff; border-radius: 14px; padding: 10px;
    box-shadow: 0 18px 44px -20px #000;
  }
  .nota.indirizzo {
    font-size: 11px; color: var(--fioco); text-align: center;
    overflow-wrap: anywhere; margin-top: 8px;
  }

  /* ------------------------------------------------------------- gli stili */
  /* Una carta per stile: il nome grande, le parole sotto. Si tocca per usarlo,
     si tiene premuto per il resto — quattro tasti su ognuna delle ventiquattro
     carte sarebbero una schermata illeggibile. */
  /**
   * ⚠ **Almeno tre per riga.** Chiesto il 6 settembre 2026: «non mi piacciono
   * su una sola riga, mettiamo almeno 3 box per riga, facciamoli entrare».
   *
   * «minmax(210px, 1fr)» su uno schermo da 375 dava **una colonna**: 210 e' la
   * larghezza minima di una carta com'era pensata sul computer, e su un
   * telefono non ce ne stanno due. Il risultato erano venti carte in colonna,
   * cioe' venti schermate per scegliere uno stile.
   *
   * Tre per riga vuol dire carte da un centoquindici pixel, e con quella
   * larghezza il testo dello stile non ci sta piu' su una riga: **si accorcia a
   * due righe** e il resto si taglia. E' la scelta giusta lo stesso — il nome
   * e' quello che si cerca, il testo e' un promemoria — e tenendo premuto si
   * legge tutto.
   *
   * Da 560 px in su tornano larghe: li' lo spazio c'e'.
   */
  .stili { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  @media (min-width: 560px) {
    .stili { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
  }
  .stile {
    border: 1px solid var(--line2); border-radius: 13px; padding: 10px 11px;
    background: var(--panel2); cursor: pointer; user-select: none;
    -webkit-user-select: none; -webkit-touch-callout: none;
    min-width: 0;
  }
  @media (min-width: 560px) { .stile { border-radius: 15px; padding: 13px 14px; } }
  .stile:hover { border-color: var(--accent2); }
  /**
   * **Scelto per il mix.** Il bordo acceso e la spunta: due segni per la stessa
   * cosa, perche' su una griglia di venti carte un bordo solo si perde.
   */
  .stile.scelto { border-color: var(--accent); background: #1b1533; }
  .stile.scelto::after {
    content: "✓"; position: absolute; top: 10px; right: 12px;
    color: var(--accent); font-weight: 700; font-size: 14px;
  }
  .stile { position: relative; }

  /**
   * La riga del mix, in fondo allo schermo.
   *
   * Sta sopra alla barra delle schede e sopra a quella che suona: e' un
   * comando che si sta usando adesso, e deve stare piu' in alto di quelli che
   * stanno li' sempre.
   */
  .mixStili {
    position: fixed; left: 12px; right: 12px; z-index: 40;
    bottom: calc(var(--fondo-alto) + 12px + env(safe-area-inset-bottom));
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 16px;
    background: #161922f5; border: 1px solid var(--accent);
    box-shadow: 0 18px 44px -18px #000; backdrop-filter: blur(14px);
    animation: avvisoEntra .2s cubic-bezier(.2,1.2,.4,1);
  }
  body.consuono .mixStili {
    bottom: calc(var(--fondo-alto) + var(--lettore-alto) + 12px + env(safe-area-inset-bottom));
  }
  .mixStili .quali { flex: 1; min-width: 0; }
  .mixStili .quali b { display: block; font-size: 13px; }
  .mixStili .quali small {
    display: block; color: var(--dim); font-size: 11px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .stile.inVetrina { border-color: #f472b655; }
  /* Il nome puo' andare a capo ma non sfondare: su una carta da centoquindici
     pixel una parola lunga uscirebbe dal riquadro. */
  .nomeStile { font-weight: 650; font-size: 13px; overflow-wrap: anywhere; }
  /* Due righe e poi basta: il testo e' un promemoria, il nome e' quello che si
     cerca. Chi vuole leggerlo tutto tiene premuto. */
  .testoStile {
    color: var(--dim); font-size: 11px; margin-top: 4px; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; overflow-wrap: anywhere;
  }
  @media (min-width: 560px) {
    .nomeStile { font-size: 14px; }
    .testoStile { font-size: 12px; -webkit-line-clamp: 3; }
  }
  .daChi { color: var(--fioco); font-size: 11px; margin-top: 6px; }

  /* --------------------------------------------------------- barra in fondo */
  /*
    **Sei colonne, non cinque.** Dalla 0.7.7 le schede sono sei, ma la griglia
    ne dichiarava ancora cinque: la sesta finiva a capo, e la barra diventava
    due righe che si mangiavano un pezzo di schermo — «vorrei aggiustare la
    barra sotto e renderla una sola riga», 26 agosto 2026. Le parole sono
    strette apposta e vanno su una riga sola: se un giorno servisse una settima
    scheda, la risposta non è restringere ancora.
  */
  /**
   * ⚠ **L'altezza e' dichiarata, e non e' un dettaglio di stile.**
   *
   * Il difetto della foto del 5 settembre 2026, segnato in rosso: fra la barra
   * che suona e le schede si vedeva una striscia di galleria, larga una
   * quindicina di pixel. «Aggiusta quel gap dove c'e' il segno rosso».
   *
   * La causa: «--fondo-alto» dice 64px ed e' quello che tutto il resto usa per
   * fare spazio — il fondo del corpo, e soprattutto il «bottom» della barra
   * che suona, che si appoggia esattamente li'. Ma questa barra un'altezza non
   * ce l'aveva: la decidevano i suoi tasti, e veniva **48px**. La barra si
   * fermava sedici pixel sopra, e in mezzo si vedeva la pagina.
   *
   * Dichiararla toglie il buco e toglie anche la classe di difetti a cui
   * appartiene: da qui in poi «--fondo-alto» non e' una stima, e' la misura.
   */
  nav.fondo {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
    display: grid; grid-template-columns: repeat(5, 1fr); align-items: center;
    /* «border-box», cosi' l'altezza dichiarata **comprende** il bordo di sopra:
       con «content-box» la barra veniva 59 e il fondo della pagina 58, e
       l'ultimo pixel di contenuto finiva sotto. */
    box-sizing: border-box; height: var(--fondo-alto);
    background: #0a0c11ee; backdrop-filter: blur(18px) saturate(140%);
    border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom);
  }
  nav.fondo button {
    position: relative;
    background: none; border: 0; border-radius: 0; color: var(--fioco);
    font-size: 9px; font-weight: 500; padding: 0 1px;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    min-width: 0; overflow: hidden; white-space: nowrap; min-height: 0;
    transition: color .18s ease;
  }
  nav.fondo button .segno { font-size: 15px; line-height: 1; transition: transform .22s cubic-bezier(.2,1.4,.4,1); }

  /**
   * **Gli effetti della barra.** Chiesto il 6 settembre 2026: «la navbar falla
   * piu' sottile, aggiungici degli effetti».
   *
   * Due, e nessuno dei due e' una decorazione fine a se' stessa:
   *
   * - **la lampada sopra alla scheda accesa.** Dice dove sei prima che tu legga
   *   la parola, ed e' l'unica cosa che una barra di schede deve fare bene;
   * - **il segno che si alza** quando la scheda si accende. Un movimento di due
   *   pixel: serve a far capire che il tocco e' arrivato, che su un telefono
   *   lento e' l'unica differenza fra «ha risposto» e «ripremo».
   *
   * La lampada e' un pseudo-elemento e non un div: non aggiunge nodi, non si
   * puo' toccare, e sparisce da sola quando la scheda si spegne.
   */
  /**
   * ⚠ **La lineetta se n'e' andata.** Chiesto il 6 settembre 2026: «i pulsanti
   * ora hanno quella linea brutta, tutti, quando selezionati».
   *
   * L'avevo messa nella 0.9.4 perche' «dice dove sei prima che tu legga la
   * parola», e la ragione resta buona — solo che quel lavoro lo facevano gia'
   * il colore e l'alone. La lineetta era una **terza** cosa che diceva la
   * stessa cosa, attaccata al bordo di sopra, e su cinque schede in fila
   * l'occhio la legge come un difetto di allineamento invece che come un segno.
   *
   * Restano i due che bastano: il segno si accende e si alza, e sotto c'e'
   * l'alone. Tre segni per un'informazione sono due di troppo.
   */
  nav.fondo button::after {
    content: ""; position: absolute; top: -14px; left: 50%; width: 54px; height: 30px;
    transform: translateX(-50%); pointer-events: none; opacity: 0;
    background: radial-gradient(50% 60% at 50% 0%, var(--accent) 0%, transparent 70%);
    transition: opacity .28s ease;
  }
  nav.fondo button.on::after { opacity: .30; }
  nav.fondo button.on .segno { transform: translateY(-2px); }
  nav.fondo button:active .segno { transform: scale(.86); }
  nav.fondo button.on { color: var(--txt); }
  nav.fondo button.on .segno { color: var(--accent); }
  nav.fondo .bollo {
    position: absolute; transform: translate(16px, -5px);
    background: var(--accent); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 99px; padding: 0 5px; min-width: 16px; text-align: center;
  }
  @media (min-width: 760px) {
    nav.fondo { grid-template-columns: repeat(5, auto); justify-content: center; gap: 10px; }
    nav.fondo button { flex-direction: row; padding: 13px 18px; font-size: 13px; }
  }

  [hidden] { display: none !important; }`;
