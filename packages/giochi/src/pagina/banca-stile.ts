/** Lo stile della Banca DaProd di chi comanda (1.5.1). Vedi `banca-markup.ts`. */
export const STILE_BANCA = `
/* ======================================================== la banca 1.5.1 */
.bk-testa{display:grid; gap:12px; padding:16px; border-radius:24px; margin-bottom:12px;
  background:radial-gradient(110% 90% at 0% 0%, rgba(255,209,102,.16), transparent 60%), radial-gradient(90% 80% at 100% 100%, rgba(61,219,255,.12), transparent 60%), linear-gradient(165deg, #10160f, #040806);
  border:1px solid rgba(255,209,102,.3); box-shadow:0 16px 36px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)}
.bk-titolo{display:flex; align-items:center; justify-content:space-between; gap:10px}
.bk-titolo b{font:800 21px/1.1 "M PLUS Rounded 1c", "Nunito", sans-serif; color:#ffe7a3}
.bk-titolo small{display:block; color:#9fc4b8; font-size:12px; margin-top:3px}
.bk-numeri{display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px}
@media (min-width:640px){.bk-numeri{grid-template-columns:repeat(4, minmax(0,1fr))}}
.bk-num{padding:10px 12px; border-radius:16px; background:rgba(0,0,0,.28); border:1px solid rgba(255,255,255,.08); min-width:0}
.bk-num small{display:block; color:#86a59c; font:700 10px/1.2 "Space Mono", monospace; letter-spacing:.06em; text-transform:uppercase}
.bk-num b{display:block; margin-top:5px; font:700 17px/1.1 "Space Mono", monospace; color:#f2fffb; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.bk-num.oro b{color:#ffd166} .bk-num.allarme{border-color:rgba(255,92,108,.55); background:rgba(255,92,108,.1)} .bk-num.allarme b{color:#ff8a96}
.bk-schede{display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin-bottom:12px}
.bk-schede::-webkit-scrollbar{display:none}
.bk-schede{border-bottom:1px solid rgba(255,255,255,.1); gap:2px}
.bk-schede button{flex:1 0 auto; padding:11px 14px; border:0; border-bottom:2px solid transparent; background:transparent;
  color:#9fc4b8; font:700 13.5px/1 "Nunito", sans-serif; cursor:pointer}
.bk-schede button.scelto{color:#ffe7a3; border-bottom-color:#ffd166}
.bk-schede button .pallino{position:static; display:inline-block; margin-left:6px; min-width:18px; padding:2px 5px; border-radius:999px; background:#ff5c6c; color:#fff; font-size:11px}
.bk-lista{display:grid; gap:10px}
.bk-carta{display:grid; gap:10px; padding:14px; border-radius:20px; background:rgba(6,14,18,.88); border:1px solid rgba(255,255,255,.09)}
.bk-carta.guasto{border-color:rgba(255,92,108,.5)}
.bk-chi{display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:center}
.bk-chi .faccia{width:38px; height:38px; border-radius:50%; background:#12302a center/cover; display:grid; place-items:center; color:#3dff8a; font-weight:800}
.bk-chi b{display:block; color:#f2fffb; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.bk-chi small{display:block; color:#86a59c; font-size:11.5px; margin-top:2px}
.bk-chi .bk-saldo{font:700 17px/1.1 "Space Mono", monospace; color:#ffd166; text-align:right}
.bk-chi .bk-saldo small{text-align:right}
.bk-chip{display:flex; flex-wrap:wrap; gap:6px}
.bk-chip span{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:rgba(61,219,255,.08);
  border:1px solid rgba(61,219,255,.3); color:#cdefff; font-size:12.5px}
.bk-chip span.rosso{background:rgba(255,92,108,.1); border-color:rgba(255,92,108,.45); color:#ffc2c9}
.bk-tasti{display:flex; flex-wrap:wrap; gap:6px}
/* 1.6.0: tasti normali. «togliamo questi pulsanti frutiger, mettiamo dei pulsanti normali». */
.bk-b{display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px; border-radius:10px;
  border:1px solid rgba(255,255,255,.16); background:#0d1a17; color:#dff5ee; font:700 12.5px/1.1 "Nunito", sans-serif;
  cursor:pointer; box-shadow:none; text-shadow:none; white-space:nowrap}
.bk-b:hover{background:#13241f; border-color:rgba(255,255,255,.28)}
.bk-b:active{transform:translateY(1px)}
.bk-b:disabled{opacity:.4; cursor:default}
.bk-b.oro{border-color:rgba(255,209,102,.6); color:#ffd166}
.bk-b.oro:not(:disabled):hover{background:rgba(255,209,102,.12)}
.bk-b.rosso{border-color:rgba(255,92,108,.45); color:#ff9aa4}
.bk-attrezzi{display:flex; gap:6px}
.bk-rapidi{display:flex; flex-wrap:wrap; align-items:center; gap:6px}
.bk-rapidi small{color:#86a59c; font:700 10px/1 "Space Mono", monospace; text-transform:uppercase; letter-spacing:.06em; margin-right:2px}
.bk-rapidi .bk-b{padding:6px 10px; font:700 12px/1 "Space Mono", monospace}
/* i selettori a segmenti */
.bk-seg{display:inline-flex; padding:3px; gap:2px; border-radius:10px; background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.08); flex-wrap:wrap}
.bk-seg button{padding:6px 10px; border:0; border-radius:7px; background:transparent; color:#9fc4b8; font:700 12px/1 "Nunito", sans-serif; cursor:pointer}
.bk-seg button.scelto{background:#1d3a32; color:#f2fffb}
.bk-seg.piccolo button{padding:6px 9px; font:700 11.5px/1 "Space Mono", monospace}
/* il verdetto (1.7.0): incassa o regala, a colpo d'occhio */
.bk-verdetto{display:grid; gap:10px; padding:14px; border-radius:16px; border:1px solid; margin:2px 0 4px}
.bk-verdetto.incassa{background:linear-gradient(180deg,rgba(61,255,138,.10),rgba(61,255,138,.03)); border-color:rgba(61,255,138,.35)}
.bk-verdetto.regala{background:linear-gradient(180deg,rgba(255,92,110,.12),rgba(255,92,110,.03)); border-color:rgba(255,92,110,.4)}
.bk-verdetto-testa{display:flex; gap:10px; align-items:flex-start}
.bk-verdetto-ico{font-size:26px; line-height:1}
.bk-verdetto-testa b{display:block; font:800 19px/1.15 "Nunito", sans-serif; color:#f2fffb}
.bk-verdetto-testa small{display:block; color:#a9c2ba; font-size:12.5px; margin-top:3px}
.bk-verdetto-cifre{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px}
.bk-verdetto-cifre div{background:rgba(0,0,0,.28); border-radius:10px; padding:8px}
.bk-verdetto-cifre small{display:block; color:#86a59c; font-size:11px}
.bk-verdetto-cifre b{font:700 14px/1.2 "Space Mono", monospace; color:#dfe}
.bk-verdetto-cifre b.su{color:#3dff8a} .bk-verdetto-cifre b.giu{color:#ff8a96}
.bk-verdetto-nota{font-size:12.5px; color:#bcd3cc}
/* la linea della Banca */
.bk-linea{display:grid; gap:8px}
.bk-linea-testa{display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px}
.bk-linea-dice{display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 10px}
.bk-linea-dice b{font:700 20px/1 "Space Mono", monospace; color:#f2fffb}
.bk-linea-dice span{font:700 13px/1 "Space Mono", monospace}
.bk-linea-dice span.su{color:#3dff8a} .bk-linea-dice span.giu{color:#ff8a96}
.bk-linea-dice small{color:#86a59c; font-size:12px}
.bk-linea .stat-grafico{margin-bottom:0}
.bk-mov{display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:8px; align-items:center; padding:7px 10px; border-radius:12px; background:rgba(255,255,255,.03)}
.bk-mov .cosa{font-size:12.5px; color:#dfe; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.bk-mov .cosa small{display:block; color:#86a59c; font-size:10.5px}
.bk-mov .quanto{font:700 12.5px/1 "Space Mono", monospace}
.bk-mov .quanto.su{color:#3dff8a} .bk-mov .quanto.giu{color:#ff8a96}
.bk-mov button{padding:5px 8px; border-radius:10px; border:1px solid rgba(255,255,255,.14); background:transparent; color:#cfe7df; font-size:11px; cursor:pointer}
.bk-mov.annullato{opacity:.45}
.bk-regole{display:grid; gap:10px}
.bk-modi{display:flex; flex-wrap:wrap; gap:6px}
.bk-regola{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px 10px; align-items:center; padding:12px; border-radius:14px;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08)}
.bk-regola.cambiata{border-color:rgba(255,209,102,.55)}
.bk-regola .bk-seg{grid-column:1 / -1; justify-self:start}
.bk-passo{display:flex; align-items:center; gap:6px}
.bk-passo b{min-width:58px; text-align:center; font:700 15px/1 "Space Mono", monospace; color:#f2fffb}
.bk-passo .bk-b{width:34px; height:34px; padding:0; font-size:17px}
.bk-salva{display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:10px 12px; border-radius:14px;
  background:#07110e; border:1px solid rgba(255,255,255,.1)}
.bk-salva span{flex:1 1 200px; color:#9fc4b8; font-size:12.5px}
.bk-salva.acceso{border-color:rgba(255,209,102,.6)}
.bk-salva.acceso span{color:#ffe7a3}
.bk-regola b{display:block; color:#f2fffb; font-size:14px}
.bk-regola small{display:block; color:#86a59c; font-size:12px; margin-top:3px; line-height:1.4}
.bk-regola input{width:100%; padding:10px; border-radius:12px; border:1px solid rgba(120,255,220,.25); background:#020806; color:#f2fffb;
  font:700 15px/1 "Space Mono", monospace; text-align:right}
.bk-prova{padding:12px; border-radius:16px; background:rgba(61,219,255,.06); border:1px solid rgba(61,219,255,.25); color:#cdefff; font-size:13px; line-height:1.5}
.bk-registro{display:grid; gap:6px}
.bk-registro div{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; padding:9px 12px; border-radius:14px; background:rgba(255,255,255,.03)}
.bk-registro span{color:#dfe; font-size:13px}
.bk-registro small{color:#86a59c; font-size:11px}
.bk-registro b{font:700 12.5px/1.2 "Space Mono", monospace; text-align:right}
.bk-registro b.su{color:#3dff8a} .bk-registro b.giu{color:#ff8a96}
`;
