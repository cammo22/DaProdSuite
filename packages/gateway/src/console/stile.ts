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
    --fondo-alto: 64px;
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
  .marchio { font-weight: 700; font-size: 16px; letter-spacing: .2px; }
  .marchio span { color: var(--accent); }
  .cresci { flex: 1; }
  .tondo {
    width: 34px; height: 34px; border-radius: 99px; padding: 0;
    background: var(--panel2); border: 1px solid var(--line2); color: var(--txt);
    font-size: 15px; display: grid; place-items: center; cursor: pointer;
  }
  .tondo:hover { border-color: var(--accent); }
  .chi {
    font-size: 12.5px; color: var(--txt); background: var(--panel2);
    border: 1px solid var(--line2); border-radius: 99px; padding: 4px 6px 4px 4px;
    cursor: pointer; display: flex; align-items: center; gap: 7px; max-width: 46vw;
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
  .tastoni { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 11px; }
  .tastone {
    position: relative; overflow: hidden;
    text-align: left; padding: 17px 16px 15px; border-radius: 18px; min-height: 116px;
    border: 1px solid var(--line2); color: var(--txt); font: inherit; cursor: pointer;
    background: var(--panel2);
    display: flex; flex-direction: column; gap: 5px; justify-content: flex-end;
  }
  .tastone .segno { font-size: 26px; line-height: 1; margin-bottom: auto; }
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
  .tastone.verde { --tinta: #34d399; }
  .tastone.on { border-color: var(--tinta); }
  .tastone.on::after { opacity: .5; }
  .tastone.piccolo { min-height: 84px; padding: 13px 14px 12px; }
  .tastone.piccolo .segno { font-size: 20px; }
  .tastone.piccolo .nome { font-size: 14px; }

  /* ------------------------------------------------------------- moduli */
  label { display: block; margin: 13px 0 5px; font-size: 12.5px; color: var(--dim); }
  input, textarea, select {
    font: inherit; color: var(--txt); background: #0b0d13;
    border: 1px solid var(--line2); border-radius: 12px; padding: 12px; width: 100%;
  }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--accent); }
  textarea { min-height: 96px; resize: vertical; }

  button {
    font: inherit; font-weight: 600; cursor: pointer; border: 0; color: #fff;
    background: linear-gradient(180deg, #9b6cff, #7c3aed);
    border-radius: 12px; padding: 12px 18px;
  }
  button:active { transform: translateY(1px); }
  button:disabled { opacity: .45; cursor: default; }
  button.piano { background: var(--panel2); border: 1px solid var(--line2); color: var(--txt); font-weight: 500; }
  button.largo { width: 100%; }
  button.mini {
    padding: 7px 12px; font-size: 12.5px; font-weight: 500;
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
  .filtri { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 12px; }
  .filtri button.on { border-color: var(--accent); color: var(--txt); background: #1b1533; }
  .quadri { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 11px; }
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
  .posta .vetro img, .posta .vetro video { width: 100%; display: block; max-height: 66vh; object-fit: cover; }
  .posta .senza { padding: 26px; text-align: center; font-size: 34px; color: #ffffff55; background: linear-gradient(150deg, #1b1533, #0b1a20); }
  .posta .parole { padding: 11px 14px 4px; font-size: 13.5px; overflow-wrap: anywhere; }
  .posta .piedi { display: flex; gap: 8px; padding: 10px 14px 13px; align-items: center; }
  .cuore {
    background: none; border: 0; padding: 4px 6px; color: var(--dim); font-size: 13px;
    display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500;
  }
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

  .piano {
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
  .barra-invio { width: 100%; height: 5px; border-radius: 99px; background: var(--line2); margin-top: 9px; }
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

  /* ------------------------------------------------------------- gli stili */
  /* Una carta per stile: il nome grande, le parole sotto. Si tocca per usarlo,
     si tiene premuto per il resto — quattro tasti su ognuna delle ventiquattro
     carte sarebbero una schermata illeggibile. */
  .stili { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
  .stile {
    border: 1px solid var(--line2); border-radius: 15px; padding: 13px 14px;
    background: var(--panel2); cursor: pointer; user-select: none;
    -webkit-user-select: none; -webkit-touch-callout: none;
  }
  .stile:hover { border-color: var(--accent2); }
  .stile.inVetrina { border-color: #f472b655; }
  .nomeStile { font-weight: 650; font-size: 14px; }
  .testoStile { color: var(--dim); font-size: 12px; margin-top: 4px; line-height: 1.45; }
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
  nav.fondo {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
    display: grid; grid-template-columns: repeat(6, 1fr);
    background: #0a0c11f2; backdrop-filter: blur(10px);
    border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom);
  }
  nav.fondo button {
    background: none; border: 0; border-radius: 0; color: var(--dim);
    font-size: 9.5px; font-weight: 500; padding: 8px 1px 9px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    min-width: 0; overflow: hidden; white-space: nowrap;
  }
  nav.fondo button .segno { font-size: 16px; line-height: 1; }
  /*
    **Mentre si scrive, la barra si toglie di mezzo.**
    Su Android la tastiera alza il fondo della pagina e la barra fissa si
    piazzava sopra alla casella e alle ultime battute: «quando scrivo con il
    modello la barra sotto nasconde la chat». Chi sta scrivendo non sta
    cambiando scheda, quindi la barra in quel momento non serve a niente.
  */
  body.scrivendo nav.fondo { display: none; }
  body.scrivendo { padding-bottom: 14px; }
  nav.fondo button.on { color: var(--txt); }
  nav.fondo button.on .segno { color: var(--accent); }
  nav.fondo .bollo {
    position: absolute; transform: translate(16px, -5px);
    background: var(--accent); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 99px; padding: 0 5px; min-width: 16px; text-align: center;
  }
  @media (min-width: 760px) {
    nav.fondo { grid-template-columns: repeat(6, auto); justify-content: center; gap: 10px; }
    nav.fondo button { flex-direction: row; padding: 13px 18px; font-size: 13px; }
  }

  [hidden] { display: none !important; }`;
