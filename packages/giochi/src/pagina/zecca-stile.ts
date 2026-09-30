/** Lo stile della Zecca (1.7.9). Vedi `zecca-copione.ts`. */
export const STILE_ZECCA = `
/* ============================================================== la Zecca */
.zc-testa{display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 12px; flex-wrap:wrap}
.zc-testa h2{margin:0; font:800 22px/1.1 "Space Mono", monospace; color:#ffe7a3}
.zc-testa small{color:#cdbd8e}
.zc-saldo{display:flex; align-items:center; gap:4px; padding:8px 14px; border-radius:999px; border:1px solid rgba(255,209,102,.4); background:rgba(40,28,6,.7); color:#ffe7a3; font:800 16px/1 "Space Mono", monospace}
.zc-schede{display:flex; overflow-x:auto; scrollbar-width:none; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,.1)}
.zc-schede::-webkit-scrollbar{display:none}
.zc-schede button{flex:1 0 auto; padding:11px 14px; border:0; border-bottom:2px solid transparent; background:transparent; color:#9aa7b2; font:700 13px/1 "Space Mono", monospace; cursor:pointer; white-space:nowrap}
.zc-schede button.scelto{color:#ffe7a3; border-bottom-color:#ffd166}
.zc-schede .pallino{position:static; display:inline-block; margin-left:6px; min-width:18px; padding:2px 5px; border-radius:999px; background:#ff5c6c; color:#fff; font-size:11px}
.zc-griglia{display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:12px}
.zc-vuoto{padding:22px; text-align:center; color:#cdbd8e; border:1px dashed rgba(255,209,102,.3); border-radius:16px; font-size:14px}
.zc-titolo{margin:18px 0 8px; font:700 13px/1 "Space Mono", monospace; color:#ffd166; text-transform:uppercase; letter-spacing:.06em}

/* un pezzo */
.pezzo{position:relative; display:grid; gap:0; border-radius:16px; overflow:hidden; background:#10121a; border:2px solid var(--rar, #9fb3ad); box-shadow:0 0 18px -6px var(--rar, #9fb3ad)}
.pezzo .pz-foto{position:relative; aspect-ratio:1 / 1; background:#0a0b10 center / cover no-repeat; display:grid; place-items:center; color:#6b7480; font-size:38px}
.pezzo .pz-foto img, .pezzo .pz-foto video{width:100%; height:100%; object-fit:cover; display:block}
.pezzo .pz-foto audio{position:absolute; left:6px; right:6px; bottom:6px; width:calc(100% - 12px); height:34px}
.pezzo .pz-num{position:absolute; top:8px; left:8px; padding:3px 8px; border-radius:999px; background:rgba(0,0,0,.72); color:#fff; font:800 12px/1 "Space Mono", monospace}
.pezzo .pz-rar{position:absolute; top:8px; right:8px; padding:3px 8px; border-radius:999px; background:var(--rar, #9fb3ad); color:#0a0b10; font:800 11px/1 "Space Mono", monospace; text-transform:uppercase}
.pezzo .pz-corpo{display:grid; gap:3px; padding:10px 12px 12px}
.pezzo b{color:#fff; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.pezzo small{color:#9aa7b2; font-size:11.5px}
.pezzo details summary{cursor:pointer; color:#ffd166; font-size:12px; margin-top:4px}
.pezzo details ul{margin:6px 0 0; padding-left:16px; color:#cdd6dc; font-size:11.5px; display:grid; gap:3px}
.pezzo .pz-tasti{display:flex; gap:6px; margin-top:6px}
.pezzo .pz-tasti .btn{padding:8px 10px; font-size:12px; flex:1}
.pezzo.mitico, .pezzo.leggendario{animation:pezzo-brilla 3.2s ease-in-out infinite}
@keyframes pezzo-brilla{0%,100%{box-shadow:0 0 14px -6px var(--rar)}50%{box-shadow:0 0 28px -2px var(--rar)}}
@media (prefers-reduced-motion: reduce){ .pezzo.mitico, .pezzo.leggendario{animation:none} }

/* un pacchetto */
.zc-pacco{display:grid; gap:10px; padding:14px; border-radius:20px; border:1px solid rgba(255,209,102,.35);
  background:radial-gradient(110% 90% at 0% 0%, rgba(255,209,102,.14), transparent 60%), linear-gradient(170deg, rgba(28,20,6,.95), rgba(8,6,2,.96))}
.zc-pacco h3{margin:0; font:800 17px/1.2 "Space Mono", monospace; color:#ffe7a3}
.zc-pacco .zc-prezzo{display:flex; align-items:center; gap:4px; color:#ffe7a3; font:700 14px/1 "Space Mono", monospace}
.zc-pacco.finito{opacity:.5}
.zc-dentro{display:flex; flex-wrap:wrap; gap:5px}
.zc-dentro span{padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid var(--rar); color:#e9dcae; font:700 11px/1 "Space Mono", monospace}
.zc-barra{height:6px; border-radius:99px; background:rgba(255,255,255,.08); overflow:hidden}
.zc-barra i{display:block; height:100%; background:linear-gradient(90deg,#f2b233,#ffe07a)}

/* una collezione */
.zc-coll{display:grid; gap:10px; padding:14px; border-radius:18px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1)}
.zc-coll.fatta{border-color:#3dff8a}
.zc-coll h3{margin:0; font-size:15px; color:#fff}
.zc-mini{display:flex; gap:6px; flex-wrap:wrap}
.zc-mini span{width:52px; height:52px; border-radius:10px; border:2px solid var(--rar); background:#0a0b10 center / cover no-repeat; display:grid; place-items:center; color:#4b5560; font-size:11px; font-family:"Space Mono", monospace; opacity:.45}
.zc-mini span.mio{opacity:1}

/* chi comanda e chi propone */
.zc-form{display:grid; gap:8px; padding:14px; border-radius:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); margin-bottom:12px}
.zc-form input, .zc-form select{padding:10px; border-radius:12px; border:1px solid rgba(255,209,102,.3); background:rgba(0,0,0,.4); color:#fff; font:inherit; min-width:0}
.zc-scelta{display:grid; grid-template-columns:repeat(auto-fill, minmax(92px,1fr)); gap:8px}
.zc-scelta label{display:grid; gap:4px; cursor:pointer; font-size:11px; color:#cdd6dc}
.zc-scelta label span{display:block; aspect-ratio:1/1; border-radius:10px; background:#0a0b10 center / cover no-repeat; border:2px solid transparent; display:grid; place-items:center; color:#6b7480}
.zc-scelta input{position:absolute; opacity:0; pointer-events:none}
.zc-scelta input:checked + span{border-color:#ffd166; box-shadow:0 0 0 2px rgba(255,209,102,.4)}
.zc-prop{display:grid; grid-template-columns:72px minmax(0,1fr); gap:10px; padding:10px; border-radius:14px; background:rgba(255,255,255,.04); margin-bottom:8px}
.zc-prop .pz-foto{width:72px; height:72px; border-radius:10px; background:#0a0b10 center / cover no-repeat; display:grid; place-items:center; color:#6b7480}
.zc-prop .zc-tasti{grid-column:1 / -1; display:flex; gap:6px; flex-wrap:wrap}
.zc-prop .zc-tasti input, .zc-prop .zc-tasti select{flex:1 1 120px}

/* l'apertura di un pacchetto */
.zc-apertura{position:fixed; inset:0; z-index:60; display:grid; align-content:center; justify-items:center; gap:16px; padding:20px; overflow-y:auto;
  background:radial-gradient(circle at 50% 30%, rgba(255,209,102,.2), rgba(4,4,8,.96) 70%)}
.zc-apertura[hidden]{display:none}
.zc-apertura .zc-griglia{width:min(720px, 100%)}
.zc-apertura .pezzo{animation:pezzo-esce .7s cubic-bezier(.2,1.2,.3,1) both}
.zc-apertura .pezzo:nth-child(2){animation-delay:.25s}
.zc-apertura .pezzo:nth-child(3){animation-delay:.5s}
@keyframes pezzo-esce{0%{transform:translateY(40px) scale(.6) rotateY(90deg); opacity:0}100%{transform:none; opacity:1}}
@media (prefers-reduced-motion: reduce){ .zc-apertura .pezzo{animation:none} }
`;
