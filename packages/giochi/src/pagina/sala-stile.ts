/**
 * Lo stile delle schede Sala e Borsa, della mano e della cornice (1.4.0).
 * Una stringa sola, niente apici inversi dentro.
 */
export const STILE_SALA = `
  header .partita {
    border: 1px solid rgba(0, 255, 65, .35); background: rgba(0, 255, 65, .07); color: #3dff8a;
    border-radius: 999px; padding: 5px 10px; font: 700 12px/1 "Space Mono", ui-monospace, monospace;
    cursor: pointer; white-space: nowrap;
  }
  header .partita .giu { color: #ff5c6c; }
  @media (max-width: 520px) { header .partita .q { display: none; } header .chi { display: none; } }
  @media (max-width: 440px) { header .livello .barra { display: none; } header .saldo small { display: none; } }
  header .partita .su { color: #3dff8a; }

  .spiega { color: var(--dim); font-size: 13.5px; line-height: 1.55; max-width: 760px; }

  .sala-giochi { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; margin: 14px 0; }
  .gioco-sala {
    position: relative; text-align: left; padding: 16px; border-radius: 20px; cursor: pointer; color: inherit;
    border: 1px solid rgba(120, 255, 200, .16); background: rgba(8, 22, 20, .62);
    box-shadow: 0 14px 30px rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255, 255, 255, .1);
    display: grid; gap: 8px; font: inherit; transition: transform .15s, border-color .15s;
  }
  .gioco-sala:hover { transform: translateY(-2px); border-color: rgba(0, 255, 65, .5); }
  .gioco-sala .icona {
    width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; font-size: 28px;
    box-shadow: 0 0 20px rgba(0, 0, 0, .4), inset 0 -4px 8px rgba(0, 0, 0, .2), inset 0 0 0 1px rgba(255, 255, 255, .3);
  }
  .gioco-sala .icona.dozer { background: linear-gradient(160deg, #fff08a, #e59a00); }
  .gioco-sala .icona.claw { background: linear-gradient(160deg, #ffc2e6, #e8408f); }
  .gioco-sala .icona.neon { background: linear-gradient(150deg, #ffd54a, #ff3df2 50%, #5b1fd6); }
  .gioco-sala b { font: 700 16px/1.2 "Space Mono", ui-monospace, monospace; color: #f2fffb; }
  .gioco-sala small { color: var(--dim); line-height: 1.4; }
  .gioco-sala .entra { color: #3dff8a; font: 700 12px/1 "Space Mono", ui-monospace, monospace; }

  .sala-partita, .borsa-numeri { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .cifra {
    padding: 12px 14px; border-radius: 16px; border: 1px solid rgba(120, 255, 200, .14);
    background: rgba(4, 16, 13, .6);
  }
  .cifra b { display: block; font: 700 20px/1.2 "Space Mono", ui-monospace, monospace; color: #f2fffb; }
  .cifra small { color: var(--dim); }

  .borsa-testa { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 6px 0 10px; }
  .borsa-testa .quota { font: 700 38px/1 "Space Mono", ui-monospace, monospace; color: #f2fffb; text-shadow: 0 0 22px rgba(61, 219, 255, .35); }
  .borsa-testa .su { color: #3dff8a; font: 700 16px/1 "Space Mono", monospace; }
  .borsa-testa .giu { color: #ff5c6c; font: 700 16px/1 "Space Mono", monospace; }
  .borsa-grafico {
    height: 220px; border-radius: 18px; border: 1px solid rgba(120, 255, 200, .14); overflow: hidden; margin-bottom: 12px;
    background: repeating-linear-gradient(0deg, rgba(0, 255, 65, .05) 0 1px, transparent 1px 44px), rgba(1, 8, 6, .7);
  }
  .borsa-grafico svg { width: 100%; height: 100%; display: block; }

  .mano { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 10px; margin-top: 8px; }
  .carta {
    flex: none; width: 138px; text-align: left; padding: 9px 10px; border-radius: 14px; cursor: pointer; color: inherit; font: inherit;
    border: 1px solid var(--g, #3dff8a); background: linear-gradient(170deg, rgba(255, 255, 255, .08), rgba(0, 0, 0, .25)), rgba(8, 22, 20, .8);
    box-shadow: 0 0 14px color-mix(in srgb, var(--g, #3dff8a) 30%, transparent);
  }
  .carta small { display: block; color: var(--dim); font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; }
  .carta b { display: block; font-size: 13px; margin: 3px 0; }
  .carta i { font-style: normal; font-size: 11px; color: var(--g, #3dff8a); }
  .mano .titolo { flex: none; align-self: center; color: var(--dim); font: 700 11px/1.3 "Space Mono", monospace; max-width: 90px; }

  .cornice { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; background: #020806; }
  .cornice[hidden] { display: none; }
  /* La barra della cornice (1.4.4): tasti in una riga, pastiglie sotto. */
  .cornice-barra {
    display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    background: linear-gradient(180deg, rgba(4,16,13,.97), rgba(3,10,8,.94));
    border-bottom: 1px solid rgba(120, 255, 200, .16); box-shadow: 0 8px 24px rgba(0,0,0,.45);
  }
  .cornice-nome { font: 700 15px/1.1 "Space Mono", monospace; color: #f2fffb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  body .cornice-barra .btn { width: auto; flex: none; min-height: 0; margin: 0; padding: 9px 14px; font-size: 13px; white-space: nowrap; }
  body .cornice-barra .btn.oro { --accent: #e0a100; }
  body .cornice-barra .btn.cyan { --accent: #1fb8ee; }
  .tasto-tondo { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; flex: none; cursor: pointer;
    font: 700 18px/1 system-ui, sans-serif; color: #eafff4; border: 1px solid rgba(120,255,200,.25);
    background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02) 50%, rgba(0,0,0,.2) 51%, rgba(255,255,255,.04));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 4px 10px rgba(0,0,0,.4); }
  .cornice-conto { grid-column: 1 / -1; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .cornice-conto::-webkit-scrollbar { display: none; }
  .pastiglia { position: relative; flex: 1 0 auto; display: flex; flex-direction: column; gap: 2px; padding: 6px 12px; border-radius: 12px;
    background: rgba(1, 8, 6, .6); border: 1px solid rgba(120, 255, 200, .14); }
  .pastiglia small { font: 700 9.5px/1 "Space Mono", monospace; letter-spacing: .08em; text-transform: uppercase; color: #86a59c; }
  .pastiglia b { font: 700 14px/1.1 "Space Mono", monospace; color: #f2fffb; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pastiglia.lire b { color: #ffd166; }
  .pastiglia.punti b { color: #3dff8a; }
  .pastiglia.su b { color: #3dff8a; }
  .pastiglia.giu b { color: #ff5c6c; }
  .pastiglia.sale { animation: sale-punti .9s ease-out; }
  .pastiglia.sale::after { content: attr(data-piu); position: absolute; right: 8px; top: -2px; font: 700 11px/1 "Space Mono", monospace;
    color: #3dff8a; text-shadow: 0 0 8px rgba(0,255,65,.8); animation: vola-su .9s ease-out forwards; }
  @keyframes sale-punti { 0% { box-shadow: 0 0 0 0 rgba(0,255,65,.7); border-color: #3dff8a; } 100% { box-shadow: 0 0 0 10px rgba(0,255,65,0); } }
  @keyframes vola-su { to { transform: translateY(-14px); opacity: 0; } }
  @media (min-width: 760px) {
    .cornice-barra { grid-template-columns: auto auto 1fr auto auto; }
    .cornice-conto { grid-column: 3; grid-row: 1; justify-content: flex-end; }
    .pastiglia { flex: 0 0 auto; }
  }
  .cornice iframe { flex: 1; width: 100%; border: 0; background: #000; }

  /* Il portafoglio della ricarica (1.4.4): un foglio che sale dal basso. */
  .portafoglio { position: absolute; inset: 0; z-index: 5; display: flex; align-items: flex-end; justify-content: center;
    background: rgba(0, 0, 0, .55); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  .portafoglio[hidden] { display: none; }
  .portafoglio-foglio { width: min(520px, 100%); display: grid; gap: 12px; padding: 16px 16px calc(18px + env(safe-area-inset-bottom));
    border-radius: 26px 26px 0 0; border: 1px solid rgba(120, 255, 200, .22); border-bottom: 0;
    background: radial-gradient(120% 90% at 50% 0%, rgba(0,255,65,.12), transparent 60%), linear-gradient(180deg, #071915, #030a08);
    box-shadow: 0 -20px 50px rgba(0,0,0,.6); animation: foglio-su .22s ease-out; }
  @keyframes foglio-su { from { transform: translateY(40px); opacity: 0; } }
  .portafoglio-testa { display: flex; align-items: center; justify-content: space-between; }
  .portafoglio-testa b { font: 800 19px/1.1 "M PLUS Rounded 1c", "Nunito", sans-serif; color: #f2fffb; }
  .portafoglio-saldo { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: 16px;
    background: rgba(255, 209, 102, .07); border: 1px solid rgba(255, 209, 102, .3); }
  .portafoglio-saldo small { color: #cdbd8e; font-size: 12.5px; }
  .portafoglio-saldo b { font: 700 22px/1 "Space Mono", monospace; color: #ffd166; }
  .portafoglio-quanto { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; text-align: center; }
  .portafoglio-quanto b { display: block; font: 700 32px/1.05 "Space Mono", monospace; color: #f2fffb; text-shadow: 0 0 20px rgba(61,219,255,.3); }
  .portafoglio-quanto small { display: block; margin-top: 4px; color: #3ddbff; font-size: 13px; }
  .portafoglio-quanto .tasto-tondo { width: 46px; height: 46px; font-size: 22px; }
  #portafoglio-scorri { width: 100%; accent-color: #19d64a; height: 28px; }
  .portafoglio-tagli { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
  .portafoglio-tagli button { padding: 10px 6px; border-radius: 999px; cursor: pointer; font: 700 13px/1 "Space Mono", monospace; color: #ffe7a3;
    background: radial-gradient(circle at 50% 30%, #3a2c10, #1a1307); border: 1px solid #6b5220; }
  .portafoglio-tagli button.scelto { color: #2a1a00; border-color: #ffe08a; background: radial-gradient(circle at 50% 30%, #fff1b8, #ffc933 55%, #d18f00);
    box-shadow: 0 0 14px rgba(255,201,51,.5); }
  body .portafoglio-foglio #portafoglio-ok { width: 100%; padding: 15px; font-size: 17px; }
  .portafoglio-nota { margin: 0; color: #86a59c; font-size: 12.5px; text-align: center; }
`;
