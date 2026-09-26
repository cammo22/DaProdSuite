/**
 * Lo stile di Crea (1.5.2). Vedi `copione-crea.ts`.
 *
 * Tasti grandi da pollice, una domanda per riga, e il colore che dice cosa si
 * sceglie: quello scelto si accende, il resto sta spento. Niente pastiglie
 * da dieci pixel e niente spiegazioni lunghe sotto ogni casella.
 */
export const STILE_CREA = `
  .crea { display: grid; gap: 14px; margin-top: 6px; }
  #pag-produzione.scelto .crea { display: none; }
  .crea-cosa { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .crea-cosa button { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center;
    text-align: left; padding: 14px; border-radius: 20px; border: 1px solid var(--line2); background: var(--panel2); color: var(--txt); cursor: pointer; }
  .crea-cosa button i { grid-row: span 2; font-style: normal; font-size: 28px; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: rgba(255,255,255,.05); }
  .crea-cosa button b { font-size: 17px; }
  .crea-cosa button small { color: var(--dim); font-size: 12.5px; }
  .crea-cosa button.scelto { border-color: transparent; background: linear-gradient(160deg, rgba(139,92,246,.35), rgba(34,211,238,.18));
    box-shadow: 0 0 0 2px var(--accent), 0 10px 30px rgba(139,92,246,.25); }
  .crea-cosa button[data-crea-cosa="canzone"].scelto { background: linear-gradient(160deg, rgba(34,211,238,.32), rgba(52,211,153,.16));
    box-shadow: 0 0 0 2px var(--accent2), 0 10px 30px rgba(34,211,238,.22); }
  .crea-cosa button.scelto i { background: rgba(255,255,255,.14); }
  #crea-dentro { display: grid; gap: 14px; }

  .crea-strade { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 5px; border-radius: 18px; background: rgba(0,0,0,.3); border: 1px solid var(--line); }
  .crea-strade button { display: grid; gap: 1px; padding: 10px; border-radius: 14px; border: 0; background: transparent; color: var(--dim); cursor: pointer; text-align: center; }
  .crea-strade button b { font-size: 15px; color: var(--txt); }
  .crea-strade button small { font-size: 11.5px; }
  .crea-strade button.scelto { background: var(--panel2); box-shadow: 0 0 0 1px var(--line2), 0 6px 16px rgba(0,0,0,.35); }
  .crea-strade button.scelto b { color: #fff; }

  .crea-foto { display: grid; gap: 10px; padding: 16px; border-radius: 20px; border: 2px dashed var(--line2); text-align: center; background: rgba(255,255,255,.02); }
  .crea-foto p { margin: 0; color: var(--dim); }
  .crea-foto-tasti { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
  .crea-foto-tasti button { display: grid; gap: 4px; justify-items: center; padding: 12px 6px; border-radius: 16px; border: 1px solid var(--line2);
    background: var(--panel2); color: var(--txt); font-size: 13px; cursor: pointer; }
  .crea-foto-tasti i { font-style: normal; font-size: 22px; color: var(--accent2); }
  .crea-foto.piena { grid-template-columns: 84px 1fr auto; align-items: center; text-align: left; border-style: solid; border-color: var(--line2); padding: 10px; }
  .crea-foto.piena img { width: 84px; height: 84px; object-fit: cover; border-radius: 14px; background: #000; }
  .crea-foto-dice b { display: block; font-size: 14px; overflow: hidden; text-overflow: ellipsis; }
  .crea-foto-dice small { color: var(--ok); }

  .crea-domanda { display: block; font-weight: 700; font-size: 15px; margin-bottom: -6px; }
  .crea-domanda small { color: var(--dim); font-weight: 400; }
  .crea-scrivi { position: relative; }
  .crea-scrivi textarea, .crea-casella { width: 100%; padding: 14px; border-radius: 18px; border: 1px solid var(--line2); background: #06080c; color: var(--txt);
    font: 16px/1.45 inherit; font-family: inherit; resize: vertical; min-height: 56px; }
  .crea-scrivi textarea:focus, .crea-casella:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(139,92,246,.25); }
  .crea-scrivi textarea { padding-bottom: 50px; }
  .crea-dado { position: absolute; right: 10px; bottom: 10px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line2);
    background: var(--panel2); color: var(--txt); font-size: 13px; cursor: pointer; }

  .crea-riga { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: center; }
  .crea-riga.colonna { grid-template-columns: 1fr; }
  @media (max-width: 420px) { .crea-riga { grid-template-columns: 1fr; gap: 6px; } }
  .crea-etichetta { font-weight: 700; font-size: 14px; color: var(--dim); display: flex; align-items: center; gap: 8px; justify-content: space-between; }
  .crea-scelte { display: flex; gap: 6px; flex-wrap: wrap; }
  .crea-scelte button, .crea-generi button, .crea-sezioni button { padding: 10px 14px; border-radius: 999px; border: 1px solid var(--line2); background: var(--panel2);
    color: var(--txt); font-size: 14px; cursor: pointer; }
  .crea-scelte button.scelto, .crea-generi button.scelto { background: rgba(34,211,238,.16); border-color: var(--accent2); color: #fff;
    box-shadow: 0 0 14px rgba(34,211,238,.2); }
  .crea-scelte.forme button { display: inline-flex; align-items: center; gap: 8px; }
  .creaForma { display: inline-block; border: 2px solid currentColor; border-radius: 3px; opacity: .8; }
  .creaForma.q { width: 14px; height: 14px; } .creaForma.a { width: 10px; height: 16px; } .creaForma.l { width: 18px; height: 10px; } .creaForma.f { width: 16px; height: 12px; }
  .crea-generi { display: flex; flex-wrap: wrap; gap: 6px; }
  .crea-sezioni { display: flex; gap: 6px; flex-wrap: wrap; margin-top: -6px; }
  .crea-sezioni button { padding: 6px 10px; font-size: 12.5px; font-family: "Space Mono", monospace; color: var(--dim); }

  .crea-qualita { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .crea-qualita button { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; align-items: center; text-align: left; padding: 12px;
    border-radius: 16px; border: 1px solid var(--line2); background: var(--panel2); color: var(--txt); cursor: pointer; }
  .crea-qualita button i { font-style: normal; font-size: 22px; grid-row: span 2; }
  .crea-qualita button b { font-size: 15px; }
  .crea-qualita button small { color: var(--dim); font-size: 11.5px; }
  .crea-qualita button.scelto { border-color: var(--attesa); background: rgba(251,191,36,.12); box-shadow: 0 0 16px rgba(251,191,36,.18); }
  .crea-qualita button[data-crea-qualita="fine"].scelto { border-color: var(--accent); background: rgba(139,92,246,.16); box-shadow: 0 0 16px rgba(139,92,246,.25); }

  .crea-quante { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; border: 1px solid var(--line2); background: var(--panel2); width: max-content; }
  .crea-quante button { width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(255,255,255,.06); color: var(--txt); font-size: 20px; cursor: pointer; }
  .crea-quante b { min-width: 32px; text-align: center; font-size: 18px; font-family: "Space Mono", monospace; }

  .crea-mini { padding: 6px 10px; border-radius: 999px; border: 1px solid var(--line2); background: var(--panel2); color: var(--txt); font-size: 12.5px; cursor: pointer; }
  .crea-vai { min-height: 58px; border-radius: 20px; border: 0; font-size: 18px; font-weight: 800; letter-spacing: .2px; color: #fff; cursor: pointer;
    background: linear-gradient(180deg, #a57bff, #7c3aed 55%, #6d28d9); box-shadow: 0 12px 30px rgba(124,58,237,.45), inset 0 1px 0 rgba(255,255,255,.35); }
  .crea-vai.canzone { background: linear-gradient(180deg, #5ee7f7, #0ea5c6 55%, #0891b2); box-shadow: 0 12px 30px rgba(14,165,198,.4), inset 0 1px 0 rgba(255,255,255,.35); }
  .crea-vai:disabled { filter: grayscale(.7) brightness(.7); box-shadow: none; cursor: default; }
  .crea-coda { justify-self: center; margin-top: -6px; padding: 6px 10px; border: 0; background: transparent; color: var(--dim); text-decoration: underline; font-size: 13px; cursor: pointer; }
  .crea-nota { margin: -4px 0 0; text-align: center; color: var(--dim); font-size: 13px; }
  .crea-altro { margin: 22px 0 4px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); }
  body.utente .crea-altro { display: none; }

  /* ------------------------------------------ il visore 3D della galleria */
  .visore3d { position: relative; width: min(92vw, 720px); height: min(70vh, 620px); border-radius: 22px; overflow: hidden;
    background: radial-gradient(80% 70% at 50% 45%, #1b2230, #07090d); touch-action: none; }
  .visore3d canvas { display: block; width: 100%; height: 100%; }
  .visore3d-dice { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 7px 12px; border-radius: 999px;
    background: rgba(0,0,0,.55); color: #e6f0ff; font-size: 13px; pointer-events: none; transition: opacity .6s; white-space: nowrap; }
  .visore3d-dice.via { opacity: 0; }
  .bollino.tred { background: rgba(52,211,153,.9); color: #03140c; font-weight: 800; }

  /* ------------------------------------------------ la sala in Casa (1.5.3) */
  #casa-sala { display: grid; gap: 12px; margin: 4px 0 18px; }
  #casa-sala:empty { display: none; }
  .cs-carta { display: grid; gap: 12px; padding: 16px; border-radius: 22px; border: 1px solid rgba(255,209,102,.35);
    background: radial-gradient(120% 90% at 0% 0%, rgba(255,209,102,.14), transparent 60%), linear-gradient(165deg, #151a14, #07090a);
    box-shadow: 0 14px 30px rgba(0,0,0,.4); }
  .cs-carta.admin { border-color: rgba(34,211,238,.35); background: radial-gradient(120% 90% at 100% 0%, rgba(34,211,238,.12), transparent 60%), linear-gradient(165deg, #0f161a, #06090b); }
  .cs-testa { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .cs-testa small { display: block; color: var(--dim); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
  .cs-testa b { display: block; font-size: 20px; margin-top: 2px; }
  .cs-saldo { font-family: "Space Mono", monospace; font-size: 28px !important; color: #ffd166; }
  .cs-euro { color: var(--dim); font-family: "Space Mono", monospace; font-size: 13px; }
  .cs-entra { padding: 10px 14px; border-radius: 999px; border: 0; font-weight: 800; color: #1a1300; cursor: pointer;
    background: linear-gradient(180deg, #fff1b8, #ffd166); white-space: nowrap; }
  .cs-carta.admin .cs-entra { background: linear-gradient(180deg, #b6f6ff, #22d3ee); color: #03161b; }
  .cs-livello { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
  .cs-liv { padding: 5px 10px; border-radius: 999px; font: 700 12px/1 "Space Mono", monospace; color: #021; background: #3dff8a; }
  .cs-barra { height: 8px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; }
  .cs-barra i { display: block; height: 100%; background: linear-gradient(90deg, #00ff41, #22d3ee); border-radius: 99px; }
  .cs-livello small { color: var(--dim); font-size: 12px; }
  .cs-premio { padding: 7px 11px; border-radius: 999px; border: 1px solid #ffd166; background: rgba(255,209,102,.16); color: #ffe7a3;
    font-weight: 800; font-size: 12.5px; cursor: pointer; animation: csBrilla 1.6s ease-in-out infinite; }
  @keyframes csBrilla { 50% { box-shadow: 0 0 18px rgba(255,209,102,.55); } }
  .cs-aperte { display: grid; gap: 6px; }
  .cs-aperte button { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; text-align: left; align-items: center; padding: 10px 12px;
    border-radius: 14px; border: 1px solid var(--line2); background: rgba(255,255,255,.04); color: var(--txt); cursor: pointer; }
  .cs-aperte i { font-style: normal; font-size: 22px; grid-row: span 2; }
  .cs-aperte small { color: var(--dim); font-size: 12px; }
  .cs-premi { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; }
  .cs-premi span, .cs-numeri span { padding: 8px 10px; border-radius: 12px; background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.07); min-width: 0; }
  .cs-premi small, .cs-numeri small { display: block; color: var(--dim); font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cs-premi b, .cs-numeri b { display: block; font-family: "Space Mono", monospace; font-size: 14px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cs-giochi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .cs-giochi button { padding: 0; border: 0; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 10; background: #000; cursor: pointer; }
  .cs-giochi img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cs-numeri { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
  .cs-numeri span.allarme { border-color: rgba(248,113,113,.6); background: rgba(248,113,113,.12); }
  .cs-numeri span.allarme b { color: #fca5a5; }
  .cs-tasti { display: flex; gap: 6px; flex-wrap: wrap; }
  .cs-tasti button { padding: 9px 12px; border-radius: 999px; border: 1px solid var(--line2); background: var(--panel2); color: var(--txt); cursor: pointer; font-size: 13px; }
`;
