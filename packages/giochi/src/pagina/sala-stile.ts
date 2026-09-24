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
  .cornice-barra {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px; flex-wrap: wrap;
    background: rgba(3, 12, 10, .92); border-bottom: 1px solid rgba(120, 255, 200, .16);
  }
  .cornice-nome { font: 700 14px/1 "Space Mono", monospace; color: #f2fffb; }
  .cornice-barra .btn { width: auto; flex: none; min-height: 0; margin: 0; padding: 8px 13px; font-size: 13px; }
  .cornice-conto { flex: 1; text-align: right; font: 700 12px/1.3 "Space Mono", monospace; color: #3dff8a; }
  .cornice iframe { flex: 1; width: 100%; border: 0; background: #000; }
`;
