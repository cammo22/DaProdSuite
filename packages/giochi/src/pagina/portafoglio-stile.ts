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
`;
