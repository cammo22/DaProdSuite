/** Lo stile del Portafoglio e delle Casse (1.4.8). Vedi `portafoglio-markup.ts`. */
export const STILE_PORTAFOGLIO = `
/* ====================================================== il portafoglio */
.pf-testa{display:grid; gap:10px; padding:16px; border-radius:22px; margin-bottom:12px;
  background:radial-gradient(120% 90% at 0% 0%, rgba(0,255,65,.14), transparent 60%), linear-gradient(165deg, rgba(10,24,18,.95), rgba(3,9,7,.96));
  border:1px solid rgba(0,255,65,.25); box-shadow:0 14px 30px rgba(0,0,0,.4)}
.pf-testa small{color:#86a59c; font:700 11px/1.2 "Space Mono", monospace; letter-spacing:.08em; text-transform:uppercase}
.pf-testa .tanto{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap}
.pf-testa .tanto b{font:700 34px/1 "Space Mono", monospace; color:#ffd166; text-shadow:0 0 18px rgba(255,209,102,.35)}
.pf-testa .tanto span{color:#cfe; font:700 15px/1 "Space Mono", monospace}
.pf-testa .mossa{font:700 13px/1.2 "Space Mono", monospace}
.pf-testa .mossa.su{color:#3dff8a} .pf-testa .mossa.giu{color:#ff5c6c}
.pf-livello{display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:10px}
.pf-livello .liv{padding:5px 10px; border-radius:999px; font:700 12px/1 "Space Mono", monospace; color:#021;
  background:linear-gradient(180deg, #d8ffe4, #3dff8a 50%, #19c254 51%, #3dff8a)}
.pf-livello .barra{height:9px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden}
.pf-livello .barra i{display:block; height:100%; border-radius:999px; background:linear-gradient(90deg, #00ff41, #3ddbff)}
.pf-livello small{text-transform:none; letter-spacing:0}
.pf-grafico{padding:10px; border-radius:20px; background:rgba(4,12,10,.8); border:1px solid rgba(120,255,200,.12); margin-bottom:16px}
.pf-grafico svg{display:block; width:100%; height:170px}
.pf-flussi{display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap:12px; margin-bottom:16px}
.pf-colonna{padding:12px; border-radius:18px; background:rgba(6,14,18,.85); border:1px solid rgba(255,255,255,.08); display:grid; gap:8px}
.pf-colonna h3{margin:0; font:700 13px/1 "Space Mono", monospace; color:#9fc4b8; text-transform:uppercase; letter-spacing:.06em}
.pf-voce{display:grid; gap:4px}
.pf-voce .nome{display:flex; justify-content:space-between; gap:8px; font-size:13px; color:#dfe}
.pf-voce .nome b{font-family:"Space Mono", monospace; white-space:nowrap}
.pf-voce .barra{height:7px; border-radius:999px; background:rgba(255,255,255,.06); overflow:hidden}
.pf-voce .barra i{display:block; height:100%; border-radius:999px}
.pf-colonna.dentro .barra i{background:linear-gradient(90deg, #19c254, #3dff8a)}
.pf-colonna.fuori .barra i{background:linear-gradient(90deg, #c2374a, #ff5c6c)}
.pf-titoli{display:grid; gap:8px; margin-bottom:16px}
.pf-titolo{display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; padding:12px; border-radius:18px;
  background:rgba(6,14,18,.85); border:1px solid rgba(255,255,255,.08)}
.pf-titolo .ico{font-size:24px}
.pf-titolo .chi b{display:block; color:#f2fffb}
.pf-titolo .chi small{display:block; color:#86a59c; font-size:11.5px; margin-top:3px}
.pf-titolo .resa{font:700 17px/1 "Space Mono", monospace; text-align:right}
.pf-titolo .resa small{display:block; font-size:10.5px; color:#86a59c; margin-top:3px}
.pf-titolo .resa.su{color:#3dff8a} .pf-titolo .resa.giu{color:#ff5c6c} .pf-titolo .resa.pari{color:#9fc4b8}
.pf-movimenti{display:grid; gap:6px; margin-bottom:16px}
.pf-mov{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; padding:9px 12px; border-radius:14px; background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06)}
.pf-mov .cosa{color:#dfe; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.pf-mov .quanto{font:700 13px/1.2 "Space Mono", monospace; text-align:right}
.pf-mov .quanto.su{color:#3dff8a} .pf-mov .quanto.giu{color:#ff8a96}
.pf-mov small{color:#86a59c; font-size:11px}
.pf-mov small.dx{text-align:right}
.pf-vuoto{padding:18px; text-align:center; color:#86a59c; border:1px dashed rgba(120,255,200,.2); border-radius:16px}

/* 1.4.8: fra i giocatori chi guarda si vede, in cima e segnato. */
.persona.io{border-color:rgba(0,255,65,.45); box-shadow:0 0 0 1px rgba(0,255,65,.18), 0 10px 24px rgba(0,255,65,.08)}
.sei-tu{font-style:normal; font:700 10px/1 "Space Mono", monospace; padding:3px 7px; border-radius:999px; color:#021; background:#3dff8a; vertical-align:middle}

/* ========================================================== le casse */
.cs-grado{display:grid; gap:10px; padding:18px; border-radius:24px; margin-bottom:12px; text-align:center;
  background:radial-gradient(100% 100% at 50% 0%, rgba(255,209,102,.18), transparent 60%), linear-gradient(170deg, rgba(28,20,6,.95), rgba(8,6,2,.96));
  border:1px solid rgba(255,209,102,.35); box-shadow:0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)}
.cs-grado .stemma{font-size:44px; line-height:1; filter:drop-shadow(0 0 14px rgba(255,209,102,.5))}
.cs-grado b{font:800 22px/1.1 "M PLUS Rounded 1c", "Nunito", sans-serif; color:#ffe7a3}
.cs-grado small{color:#cdbd8e; font-size:12.5px}
.cs-grado .barra{height:12px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden}
.cs-grado .barra i{display:block; height:100%; border-radius:999px; background:linear-gradient(90deg, #ffd166, #ffef9a, #ffb300);
  box-shadow:0 0 12px rgba(255,209,102,.6)}
.cs-numeri{display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:16px}
.cs-forzieri{display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap:12px; margin-bottom:12px}
.cs-forziere{display:grid; gap:8px; padding:14px; border-radius:20px; text-align:center;
  background:linear-gradient(170deg, rgba(20,16,30,.95), rgba(6,5,10,.96)); border:1px solid rgba(176,124,255,.3)}
.cs-forziere .ico{font-size:34px}
.cs-forziere b{font:700 22px/1 "Space Mono", monospace; color:#ffd166}
.cs-forziere small{color:#a9a0c8; font-size:12px}
.cs-forziere .tasti{display:flex; gap:6px; justify-content:center; flex-wrap:wrap}
.cs-forziere .tasti button{padding:8px 11px; border-radius:999px; cursor:pointer; font:700 12px/1 "Space Mono", monospace;
  color:#2a1a00; border:1px solid rgba(0,0,0,.3); background:radial-gradient(circle at 50% 30%, #fff1b8, #ffc933 55%, #d18f00)}
.cs-forziere .tasti button:disabled{filter:grayscale(.9) brightness(.6); cursor:default}

/* ============================================ il portafoglio 1.4.9
   «Sembrare un vero portafoglio crypto bancario»: una carta di vetro scuro col
   saldo grande, i periodi a pastiglia, la linea che si tocca col dito. */
.wl-carta{position:relative; overflow:hidden; display:grid; gap:8px; padding:18px 18px 16px; border-radius:26px; margin-bottom:12px;
  background:radial-gradient(140% 120% at 100% 0%, rgba(61,219,255,.22), transparent 55%),
    radial-gradient(120% 100% at 0% 100%, rgba(0,255,65,.16), transparent 60%),
    linear-gradient(160deg, #0c1c20, #050b0d 70%);
  border:1px solid rgba(120,255,220,.28); box-shadow:0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12)}
.wl-carta::after{content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(115deg, transparent 40%, rgba(255,255,255,.07) 48%, transparent 56%)}
.wl-sopra{display:flex; align-items:center; justify-content:space-between; gap:10px}
.wl-sopra small{color:#9fc4b8; font:700 11px/1.2 "Space Mono", monospace; letter-spacing:.08em; text-transform:uppercase}
.wl-valuta{padding:7px 12px; border-radius:999px; cursor:pointer; font:700 12px/1 "Space Mono", monospace; color:#dffcff;
  background:rgba(61,219,255,.14); border:1px solid rgba(61,219,255,.45)}
.wl-tanto{font:700 clamp(30px, 10vw, 46px)/1.05 "Space Mono", monospace; color:#f4fffb; cursor:pointer;
  text-shadow:0 0 26px rgba(61,219,255,.35); font-variant-numeric:tabular-nums}
.wl-sotto{display:flex; align-items:baseline; gap:8px; flex-wrap:wrap}
.wl-sotto small{color:#86a59c; font-size:12px}
.wl-altra{color:#9fc4b8; font:700 13px/1 "Space Mono", monospace}
.wl-mossa{font:700 13px/1.2 "Space Mono", monospace; white-space:nowrap}
.wl-mossa.su, .su{color:#3dff8a} .wl-mossa.giu, .giu{color:#ff6b7a}
.wl-periodi{display:flex; gap:4px; padding:4px; border-radius:16px; margin-bottom:10px; background:rgba(0,0,0,.35); border:1px solid rgba(120,255,200,.12)}
.wl-periodi button{flex:1; min-height:38px; border:0; border-radius:12px; cursor:pointer; background:transparent; color:#86a59c; font:700 13px/1 "Space Mono", monospace}
.wl-periodi button.scelto{color:#021; background:linear-gradient(180deg, #d8ffe4, #3dff8a 50%, #19c254 51%, #3dff8a); box-shadow:0 4px 14px rgba(0,255,65,.25)}
.wl-grafico, .stat-grafico{position:relative; padding:8px 6px 4px; border-radius:20px; background:rgba(4,12,10,.8); border:1px solid rgba(120,255,200,.12); margin-bottom:12px}
.wl-grafico svg{display:block; width:100%; height:190px; touch-action:pan-y}
.stat-grafico svg{display:block; width:100%; height:130px; touch-action:pan-y}
.stat-grafico.piccolo svg{height:70px}
.grafico-dito{position:absolute; top:6px; min-width:140px; padding:7px 10px; border-radius:12px; pointer-events:none;
  background:rgba(8,20,16,.95); border:1px solid rgba(120,255,200,.3); box-shadow:0 8px 20px rgba(0,0,0,.5)}
.grafico-dito b{display:block; font:700 14px/1.2 "Space Mono", monospace; color:#f4fffb}
.grafico-dito small{display:block; color:#86a59c; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.wl-riassunto{display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:6px}
.wl-pillola{display:grid; gap:4px; padding:10px 12px; border-radius:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08)}
.wl-pillola small{color:#86a59c; font-size:11px}
.wl-pillola b{font:700 14px/1.1 "Space Mono", monospace; color:#e9fff4; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.wl-pillola.su b{color:#3dff8a} .wl-pillola.giu b{color:#ff8a96}
.wl-posizioni, .wl-flussi, .wl-movimenti, .stat-giochi{display:grid; gap:8px; margin-bottom:16px}
.wl-pos, .wl-flusso, .wl-mov{display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; padding:12px;
  border-radius:18px; background:rgba(6,14,18,.85); border:1px solid rgba(255,255,255,.08)}
.wl-mov{padding:10px 12px; border-radius:14px; background:rgba(255,255,255,.03)}
.wl-pos .ico, .wl-flusso .ico, .wl-mov .ico{width:40px; height:40px; display:grid; place-items:center; font-size:21px; border-radius:14px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08)}
.wl-mov .ico{width:34px; height:34px; font-size:17px; border-radius:12px}
.wl-pos .chi, .wl-flusso .chi, .wl-mov .chi{display:grid; gap:3px; min-width:0}
.wl-pos .chi b, .wl-flusso .chi b, .wl-mov .chi b{color:#f2fffb; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.wl-pos .chi small, .wl-flusso .chi small, .wl-mov .chi small{color:#86a59c; font-size:11.5px}
.wl-pos .quanto{display:grid; gap:3px; justify-items:end; text-align:right}
.wl-pos .quanto b{font:700 14px/1.1 "Space Mono", monospace; color:#e9fff4; white-space:nowrap}
.wl-pos .quanto small{color:#86a59c; font-size:11px}
.wl-flusso > b, .wl-mov > b{font:700 14px/1.1 "Space Mono", monospace; white-space:nowrap}
.barretta{display:block; height:6px; border-radius:999px; background:rgba(255,255,255,.07); overflow:hidden; margin-top:4px}
.barretta i{display:block; height:100%; border-radius:999px}
.leggenda{display:flex; gap:14px; flex-wrap:wrap; margin:-4px 2px 12px; color:#9fc4b8; font-size:12px}
.leggenda i{display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:-1px}

/* ====================================== le statistiche della sala 1.4.9 */
.sala-stat, .sala-admin{margin-top:16px}
.stat-carta{display:grid; gap:10px; padding:16px; border-radius:24px;
  background:radial-gradient(120% 90% at 100% 0%, rgba(0,255,65,.12), transparent 60%), linear-gradient(165deg, rgba(10,22,18,.95), rgba(3,9,7,.96));
  border:1px solid rgba(0,255,65,.22); box-shadow:0 14px 30px rgba(0,0,0,.4)}
.stat-carta.admin{background:radial-gradient(120% 90% at 100% 0%, rgba(255,209,102,.14), transparent 60%), linear-gradient(165deg, rgba(24,20,8,.95), rgba(8,6,2,.96));
  border-color:rgba(255,209,102,.3)}
.stat-testa{display:flex; align-items:flex-end; justify-content:space-between; gap:10px; flex-wrap:wrap}
.stat-testa > div{display:grid; gap:4px}
.stat-testa small{color:#9fc4b8; font-size:12px}
.stat-testa b{font:700 24px/1.1 "Space Mono", monospace; color:#f4fffb}
.stat-riga{display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px}
.stat-riga span{display:grid; gap:4px; padding:10px 12px; border-radius:14px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07)}
.stat-riga small{color:#86a59c; font-size:11px}
.stat-riga b{font:700 14px/1.15 "Space Mono", monospace; color:#e9fff4; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.stat-carta .link{justify-self:start}

/* =============================================== il resoconto 1.4.9 */
.resoconto{position:fixed; inset:0; z-index:80; display:grid; place-items:end center; padding:16px;
  background:rgba(0,0,0,.62); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); animation:resocontoSu .25s ease-out}
.resoconto-foglio{width:min(520px, 100%); max-height:86dvh; overflow:auto; display:grid; gap:12px; padding:20px 18px 18px; border-radius:28px;
  background:radial-gradient(130% 90% at 50% 0%, rgba(61,219,255,.18), transparent 60%), linear-gradient(170deg, #0d1c1f, #04090b);
  border:1px solid rgba(120,255,220,.3); box-shadow:0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)}
.resoconto-foglio h2{margin:0; font:800 24px/1.15 "M PLUS Rounded 1c", "Nunito", sans-serif; color:#f4fffb}
.resoconto-su{color:#9fc4b8; font:700 11px/1.2 "Space Mono", monospace; letter-spacing:.08em; text-transform:uppercase}
.resoconto-tanto{font:700 clamp(30px, 10vw, 42px)/1 "Space Mono", monospace; color:#ffd166; text-shadow:0 0 22px rgba(255,209,102,.35)}
.resoconto-righe{display:grid; gap:6px}
.resoconto-livello{padding:10px 12px; border-radius:14px; color:#021; font-weight:800;
  background:linear-gradient(180deg, #fff1b8, #ffd166)}
.resoconto-regalo{display:grid; grid-template-columns:auto 1fr; gap:10px; align-items:center; padding:12px; border-radius:16px;
  background:rgba(255,209,102,.1); border:1px solid rgba(255,209,102,.35)}
.resoconto-regalo span{font-size:26px}
.resoconto-regalo b{display:block; color:#ffe7a3}
.resoconto-regalo small{display:block; color:#cdbd8e; margin-top:3px}
@keyframes resocontoSu{from{opacity:0} to{opacity:1}}

/* =========================================== chi comanda e chi gioca 1.4.9 */
body:not(.admin) .solo-admin{display:none !important}
.cornice-valuta{min-width:0; padding:8px 11px; font:700 12px/1 "Space Mono", monospace}

/* =========================================== le cose che ti aspettano 1.5.1 */
.wl-cose{display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; margin-top:4px}
.wl-cose::-webkit-scrollbar{display:none}
.wl-cosa{flex:0 0 auto; display:grid; gap:2px; text-align:left; padding:9px 12px; border-radius:16px; cursor:pointer;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.14); color:#e9fff6; font:600 13px/1.2 "Nunito", sans-serif}
.wl-cosa b{font-weight:800}
.wl-cosa small{color:#9fc4b8; font-size:11.5px}
.wl-cosa.oro{background:linear-gradient(180deg, rgba(255,209,102,.24), rgba(255,209,102,.08)); border-color:rgba(255,209,102,.6);
  animation:premio-livello 1.6s ease-in-out infinite}
.wl-cosa.oro small{color:#ffe7a3}
.wl-cosa.blu{background:rgba(61,219,255,.08); border-color:rgba(61,219,255,.4); cursor:default}
`;
