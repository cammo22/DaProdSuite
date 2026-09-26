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
.bk-schede button{flex:1 0 auto; padding:10px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04);
  color:#cfe7df; font:700 13px/1 "Nunito", sans-serif; cursor:pointer}
.bk-schede button.scelto{background:linear-gradient(180deg, #fff1b8, #ffd166); color:#1a1300; border-color:transparent}
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
.bk-tasti .btn{padding:8px 12px; font-size:12.5px}
.bk-mov{display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:8px; align-items:center; padding:7px 10px; border-radius:12px; background:rgba(255,255,255,.03)}
.bk-mov .cosa{font-size:12.5px; color:#dfe; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.bk-mov .cosa small{display:block; color:#86a59c; font-size:10.5px}
.bk-mov .quanto{font:700 12.5px/1 "Space Mono", monospace}
.bk-mov .quanto.su{color:#3dff8a} .bk-mov .quanto.giu{color:#ff8a96}
.bk-mov button{padding:5px 8px; border-radius:10px; border:1px solid rgba(255,255,255,.14); background:transparent; color:#cfe7df; font-size:11px; cursor:pointer}
.bk-mov.annullato{opacity:.45}
.bk-regole{display:grid; gap:10px}
.bk-regola{display:grid; grid-template-columns:minmax(0,1fr) 120px; gap:10px; align-items:center; padding:12px; border-radius:16px;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08)}
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
