/** Lo stile della moneta DaProd (1.7.8). Vedi `moneta-copione.ts`. */
export const STILE_MONETA = `
/* ======================================================= la moneta DaProd */
.gettone{display:inline-grid; place-items:center; width:64px; height:64px; flex:none; border-radius:50%; position:relative;
  font:800 30px/1 "Space Mono", monospace; color:#7a4d06; text-shadow:0 1px 0 rgba(255,255,255,.55);
  background:radial-gradient(circle at 30% 28%, #fffbd0 0%, #ffe07a 28%, #f2b233 62%, #b5720c 100%);
  box-shadow:inset 0 0 0 3px #f7c64a, inset 0 0 0 6px rgba(120,70,0,.35), inset 0 -4px 8px rgba(120,70,0,.4), 0 8px 22px rgba(255,190,50,.35);
  animation:gettone-dondola 4.2s ease-in-out infinite; transform-style:preserve-3d}
.gettone::before{content:""; position:absolute; inset:6px; border-radius:50%; border:1.5px dashed rgba(122,77,6,.55)}
.gettone i{font-style:normal; position:relative}
.gettone.mini{width:20px; height:20px; font-size:11px; box-shadow:inset 0 0 0 1.5px #f7c64a, 0 1px 6px rgba(255,190,50,.4); animation:none; vertical-align:-5px; margin-right:6px}
.gettone.mini::before{display:none}
.gettone.grande{width:92px; height:92px; font-size:44px}
@keyframes gettone-dondola{0%,100%{transform:perspective(380px) rotateY(-38deg)}50%{transform:perspective(380px) rotateY(38deg)}}
@media (prefers-reduced-motion: reduce){ .gettone{animation:none} }

.moneta-chip{white-space:nowrap; padding:6px 12px; border-radius:999px; border:1px solid rgba(255,209,102,.4); cursor:pointer;
  background:rgba(40,28,6,.7); color:#ffe7a3; font:700 14px/1 "Space Mono", monospace}
.moneta-chip:hover{border-color:#ffd166}

.mn-blocco{margin:0 0 16px}
.mn-carta{display:grid; gap:12px; padding:16px; border-radius:24px;
  background:radial-gradient(110% 90% at 0% 0%, rgba(255,209,102,.16), transparent 60%), linear-gradient(170deg, rgba(28,20,6,.95), rgba(8,6,2,.96));
  border:1px solid rgba(255,209,102,.35); box-shadow:0 14px 30px rgba(0,0,0,.4)}
.mn-testa{display:grid; grid-template-columns:auto 1fr; gap:16px; align-items:center}
.mn-testa small{color:#cdbd8e; font:700 11px/1.2 "Space Mono", monospace; letter-spacing:.08em; text-transform:uppercase}
.mn-tanto{display:block; font:800 38px/1 "Space Mono", monospace; color:#ffd166; text-shadow:0 0 18px rgba(255,209,102,.35)}
.mn-vale{color:#e9dcae; font-size:13px}
.mn-mossa{font:700 13px/1.2 "Space Mono", monospace}
.mn-mossa.su{color:#3dff8a} .mn-mossa.giu{color:#ff5c6c}
.mn-periodi{display:flex; gap:6px}
.mn-periodi button{padding:6px 12px; border-radius:999px; border:1px solid rgba(255,209,102,.25); background:rgba(255,255,255,.04); color:#cdbd8e; font:700 12px/1 "Space Mono", monospace; cursor:pointer}
.mn-periodi button.scelto{background:rgba(255,209,102,.18); color:#ffe7a3; border-color:#ffd166}
.mn-grafico svg{display:block; width:100%; height:150px}
.mn-numeri{display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px}
.mn-numeri span{display:grid; gap:2px; padding:8px 10px; border-radius:14px; background:rgba(255,255,255,.04); color:#cdbd8e; font-size:11.5px}
.mn-numeri b{color:#ffe7a3; font:700 15px/1.1 "Space Mono", monospace}
.mn-come summary{cursor:pointer; color:#ffd166; font-weight:700}
.mn-come ul{margin:8px 0 0; padding-left:18px; color:#e9dcae; font-size:13px; display:grid; gap:4px}
.mn-libro{display:grid; gap:6px}
.mn-riga{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 10px; padding:8px 12px; border-radius:12px; background:rgba(255,255,255,.04)}
.mn-riga b{color:#e9dcae; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.mn-riga span{font:700 13px/1.2 "Space Mono", monospace; text-align:right}
.mn-riga span.su{color:#3dff8a} .mn-riga span.giu{color:#ff8a96}
.mn-riga small{grid-column:1 / -1; color:#9d9170; font-size:11px}
.mn-fine{padding:14px; text-align:center; color:#cdbd8e; border:1px dashed rgba(255,209,102,.3); border-radius:14px; font-size:13px}

/* chi comanda */
.mn-admin{display:grid; gap:12px; margin-top:16px}
.mn-admin h3{margin:0; font:700 13px/1 "Space Mono", monospace; color:#ffd166; text-transform:uppercase; letter-spacing:.06em}
.mn-gesti{display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:8px}
.mn-gesti select, .mn-gesti input{padding:10px; border-radius:12px; border:1px solid rgba(255,209,102,.3); background:rgba(0,0,0,.4); color:#fff; font:inherit; min-width:0}
.mn-gesti .btn{grid-column:auto}
.mn-regole{display:grid; grid-template-columns:repeat(auto-fit, minmax(210px,1fr)); gap:8px}
.mn-regole label{display:grid; gap:4px; padding:8px 10px; border-radius:12px; background:rgba(255,255,255,.04); color:#cdbd8e; font-size:12px}
.mn-regole input{padding:8px; border-radius:10px; border:1px solid rgba(255,209,102,.25); background:rgba(0,0,0,.4); color:#fff; font:700 14px "Space Mono", monospace; width:100%; box-sizing:border-box}
`;
