/** Lo stile dello Studio (1.4.5). Vedi `studio-markup.ts`. */
export const STILE_STUDIO = `
/* ============================================================ lo Studio */
.studio-testa{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
.studio-marca{padding:4px 10px; border-radius:999px; font:700 11px/1 "Space Mono", monospace; color:#021;
  background:linear-gradient(180deg, #d8fbff, #3ddbff 50%, #1aa6c9 51%, #3ddbff); box-shadow:0 0 14px rgba(61,219,255,.35)}
.studio-foglio{display:grid; gap:8px; padding:16px; border-radius:22px; margin-bottom:18px;
  background:radial-gradient(120% 80% at 100% 0%, rgba(176,124,255,.14), transparent 60%),
    linear-gradient(165deg, rgba(12,20,24,.95), rgba(4,8,10,.95));
  border:1px solid rgba(176,124,255,.28); box-shadow:0 14px 30px rgba(0,0,0,.4)}
.studio-foglio label{margin:6px 0 0; font:700 11px/1.3 "Space Mono", monospace; letter-spacing:.06em;
  text-transform:uppercase; color:#b9a8ff}
.studio-foglio label small{text-transform:none; letter-spacing:0; color:#86a59c; font-weight:400; margin-left:6px}
.studio-foglio textarea, .studio-foglio input{width:100%; box-sizing:border-box; padding:12px 14px; border-radius:14px;
  font:15px/1.45 inherit; color:#f2fffb; background:rgba(0,0,0,.4); border:1px solid rgba(176,124,255,.3); resize:vertical}
.studio-foglio textarea:focus, .studio-foglio input:focus{outline:none; border-color:#b07cff; box-shadow:0 0 0 3px rgba(176,124,255,.2)}
.studio-riga{display:flex; justify-content:space-between; align-items:center; gap:10px}
.studio-conta{color:#86a59c; font:12px/1 "Space Mono", monospace}
.studio-scelte{display:flex; flex-wrap:wrap; gap:8px}
.studio-scelte button{display:inline-flex; align-items:center; gap:8px; padding:9px 13px; border-radius:14px; cursor:pointer;
  color:#dfe; background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.12); font:600 13px/1.2 inherit}
.studio-scelte button small{color:#86a59c; font-size:11px}
.studio-scelte button.scelto{border-color:#b07cff; color:#fff; background:rgba(176,124,255,.18); box-shadow:0 0 12px rgba(176,124,255,.25)}
.studio-scelte .rett{display:inline-block; border:2px solid currentColor; border-radius:3px}
.studio-nota{margin:0; color:#86a59c; font-size:12.5px; line-height:1.45}
body #studio-vai{--accent:#8b5cf6; margin:8px 0 0}
.studio-quaderno{display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap:12px; align-items:start}
.studio-lavoro{display:grid; gap:8px; padding:10px; border-radius:20px; min-width:0;
  background:rgba(6,14,18,.85); border:1px solid rgba(176,124,255,.2); box-shadow:0 10px 24px rgba(0,0,0,.35)}
.studio-lavoro .quadro{position:relative; border-radius:14px; overflow:hidden; background:#05080a; display:grid; place-items:center;
  aspect-ratio:1/1}
.studio-lavoro .quadro img{width:100%; height:100%; object-fit:cover; display:block; cursor:zoom-in}
.studio-lavoro .quadro .aspetta{padding:16px; text-align:center; color:#b9a8ff; font-size:12.5px; line-height:1.4}
.studio-lavoro .quadro.lavora{background:linear-gradient(110deg, #0a0f14 30%, #16102a 50%, #0a0f14 70%); background-size:200% 100%;
  animation:studio-luccica 1.6s linear infinite}
@keyframes studio-luccica{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){ .studio-lavoro .quadro.lavora{animation:none} }
.studio-lavoro .testo{color:#dfe; font-size:12.5px; line-height:1.4; overflow:hidden; display:-webkit-box;
  -webkit-line-clamp:3; -webkit-box-orient:vertical}
.studio-lavoro .testo b{color:#ffd166}
.studio-lavoro .dati{display:flex; flex-wrap:wrap; gap:4px 10px; color:#86a59c; font:11px/1.3 "Space Mono", monospace}
.studio-lavoro .tasti{display:flex; flex-wrap:wrap; gap:6px}
.studio-lavoro .tasti button{padding:8px 12px; border-radius:999px; cursor:pointer; font:700 12px/1 inherit;
  color:#eafff4; background:rgba(255,255,255,.06); border:1px solid rgba(176,124,255,.35)}
.studio-lavoro .tasti button:disabled{opacity:.45; cursor:default}
.studio-vuoto{padding:22px; text-align:center; color:#86a59c; border:1px dashed rgba(176,124,255,.25); border-radius:18px}
/* 1.4.9: Crea / Modifica una tua foto */
.studio-strade{display:flex; gap:4px; padding:4px; margin:4px 0 12px; border-radius:16px; background:rgba(0,0,0,.35); border:1px solid rgba(176,124,255,.2)}
.studio-strade button{flex:1; min-height:44px; border:0; border-radius:12px; background:transparent; color:#86a59c; font:700 13.5px/1.2 inherit; cursor:pointer}
.studio-strade button.scelto{color:#fff; background:linear-gradient(180deg,#b07cff,#7d4dea); box-shadow:0 6px 18px rgba(176,124,255,.3)}
.studio-foto{display:grid; gap:10px; margin-bottom:10px}
.studio-foto img{width:100%; max-height:320px; object-fit:contain; border-radius:16px; background:#000; border:1px solid rgba(176,124,255,.25)}
`;
