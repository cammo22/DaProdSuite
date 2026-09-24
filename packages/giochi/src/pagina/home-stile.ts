/**
 * Lo stile della 1.4.3: la Home, le quattro stanze, e la slot delle
 * combinazioni e la macchinetta rifatte.
 *
 * Chiesto il 24 settembre 2026 con due schermate del telefono in mano: «un bel
 * redesign di queste due schermate fatte bene». Viene per ultimo, dopo
 * `stile.ts` e `sala-stile.ts`, e ridisegna sopra: per questo molte regole
 * cominciano con «body», che batte il vestito della console (`daprod.css`)
 * senza bisogno di «!important».
 *
 * Una stringa sola, e niente apici inversi dentro.
 */
export const STILE_HOME = `
/* ============================================================ le stanze */

body nav.giu{position:fixed; left:0; right:0; bottom:0; z-index:30; display:grid;
  grid-template-columns:repeat(4,1fr); gap:4px; padding:6px 8px calc(6px + env(safe-area-inset-bottom));
  background:linear-gradient(180deg, rgba(4,14,12,.86), rgba(2,8,6,.97));
  -webkit-backdrop-filter:blur(14px) saturate(1.4); backdrop-filter:blur(14px) saturate(1.4);
  border-top:1px solid rgba(120,255,200,.16); overflow:visible}
body nav.giu button{position:relative; display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:6px 4px 5px; border:0; border-radius:14px; background:transparent; cursor:pointer;
  color:#86a59c; font:700 11px/1 "Space Mono", ui-monospace, monospace; letter-spacing:.02em;
  transition:color .2s, background .2s}
body nav.giu svg{width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.7;
  stroke-linecap:round; stroke-linejoin:round}
body nav.giu button.viva{color:#eafff4; background:rgba(0,255,65,.09);
  box-shadow:inset 0 0 0 1px rgba(0,255,65,.28), 0 0 18px rgba(0,255,65,.12)}
body nav.giu button.viva svg{stroke:#3dff8a; filter:drop-shadow(0 0 6px rgba(0,255,65,.6))}
@media (min-width:760px){ body nav.giu{padding-left:calc(50% - 330px); padding-right:calc(50% - 330px)} }
body nav.giu .pallino{position:absolute; top:3px; right:calc(50% - 22px); margin:0}
main{--sotto:calc(64px + env(safe-area-inset-bottom))}

/* La fila di tasti della stanza: una pillola sola, in alto. */
.sotto{display:none; position:sticky; top:-10px; z-index:5; margin:-10px -12px 10px; padding:8px 12px;
  background:linear-gradient(180deg, rgba(3,10,8,.94), rgba(3,10,8,.78) 80%, transparent)}
main.con-sotto .sotto{display:block}
.sotto-fila{display:flex; gap:4px; padding:4px; border-radius:999px; overflow-x:auto; scrollbar-width:none;
  background:rgba(4,16,13,.72); border:1px solid rgba(120,255,200,.14); width:max-content; max-width:100%}
.sotto-fila::-webkit-scrollbar{display:none}
.sotto-fila button{flex:none; padding:8px 14px; border:0; border-radius:999px; background:transparent;
  color:#86a59c; font:700 12.5px/1 "Space Mono", ui-monospace, monospace; cursor:pointer; white-space:nowrap}
.sotto-fila button.viva{color:#fff; text-shadow:0 1px 1px rgba(0,40,10,.6);
  background:linear-gradient(180deg,#caffc4 0%,#19d64a 50%,#0a8a26 51%,#19d64a 100%);
  box-shadow:0 0 14px rgba(25,214,74,.35), inset 0 1px 0 rgba(255,255,255,.8)}
main.con-sotto #p-slot.viva{height:calc(100% - 52px)}

/* ============================================================== la home */

#p-home.viva{display:flex; flex-direction:column; gap:14px; padding-bottom:8px}
.home-ciao{display:flex; flex-wrap:wrap; align-items:center; gap:12px 18px; padding:16px 18px;
  border-radius:22px; position:relative; overflow:hidden;
  background:radial-gradient(120% 140% at 0% 0%, rgba(0,255,65,.16), transparent 55%),
    radial-gradient(90% 120% at 100% 100%, rgba(61,219,255,.14), transparent 60%), rgba(6,20,17,.8);
  border:1px solid rgba(120,255,200,.2); box-shadow:0 16px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.1)}
.ciao-testo small{display:block; color:#86a59c; font:700 11px/1 "Space Mono", monospace; text-transform:uppercase; letter-spacing:.12em}
.ciao-testo b{display:block; margin-top:4px; font:800 24px/1.1 "M PLUS Rounded 1c", "Nunito", system-ui, sans-serif; color:#f2fffb}
.ciao-numeri{display:flex; flex-wrap:wrap; gap:8px; margin-left:auto}
@media (max-width:640px){ .ciao-numeri{display:grid; grid-template-columns:repeat(4,1fr); gap:6px; width:100%; margin:0}
  .ciao-numeri .num{min-width:0; padding:8px 8px}
  .ciao-numeri .num b{font-size:13.5px} .ciao-numeri .num small{font-size:10.5px} }
.ciao-numeri .num{display:flex; flex-direction:column; gap:3px; min-width:78px; padding:8px 12px; border-radius:14px;
  background:rgba(2,8,6,.55); border:1px solid rgba(120,255,200,.12)}
.ciao-numeri .num b{font:700 16px/1 "Space Mono", monospace; color:#f2fffb; white-space:nowrap}
.ciao-numeri .num small{color:#86a59c; font-size:11px}
.ciao-numeri .lire b{color:#ffd166}
.ciao-numeri .su b{color:#3dff8a}
.ciao-numeri .giu b{color:#ff5c6c}

.home-porte{display:grid; grid-template-columns:1fr 1fr; gap:12px}
@media (max-width:640px){ .home-porte{grid-template-columns:1fr} }
.home-porta{position:relative; display:grid; grid-template-columns:1fr; text-align:left; padding:0; cursor:pointer;
  border-radius:22px; overflow:hidden; color:inherit; font:inherit; isolation:isolate;
  border:1px solid rgba(120,255,200,.2); background:rgba(6,20,17,.85);
  box-shadow:0 16px 36px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08); transition:transform .18s, border-color .18s}
.home-porta:hover{transform:translateY(-2px); border-color:rgba(0,255,65,.55)}
.home-porta:active{transform:scale(.985)}
.porta-foto{display:grid; grid-template-columns:1.4fr 1fr; grid-template-rows:1fr 1fr; gap:3px; height:140px}
.porta-foto img{width:100%; height:100%; object-fit:cover; display:block}
.porta-foto img:first-child{grid-row:span 2}
.porta-rulli{display:grid; grid-template-columns:repeat(3,1fr); gap:6px; height:140px; padding:12px;
  background:radial-gradient(100% 120% at 50% 0%, rgba(176,124,255,.25), transparent 65%), #0a0d14}
.porta-rulli i{display:flex; align-items:flex-end; padding:8px; border-radius:12px; font-style:normal;
  font:700 11px/1.1 "Space Mono", monospace; color:#e8eaf2; text-transform:uppercase; letter-spacing:.05em;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25)), #121620;
  border:1px solid color-mix(in srgb, var(--g) 55%, transparent);
  box-shadow:inset 3px 0 0 var(--g), 0 0 14px color-mix(in srgb, var(--g) 18%, transparent)}
.porta-testo{display:grid; gap:4px; padding:14px 48px 16px 16px;
  background:linear-gradient(180deg, rgba(6,20,17,.3), rgba(6,20,17,.95) 30%)}
.porta-testo b{font:800 22px/1 "M PLUS Rounded 1c", "Nunito", sans-serif; color:#f2fffb}
.porta-gioca .porta-testo b{color:#3dff8a; text-shadow:0 0 18px rgba(0,255,65,.45)}
.porta-genera .porta-testo b{color:#d6a8ff; text-shadow:0 0 18px rgba(176,124,255,.5)}
.porta-testo small{color:#9fbab2; font-size:13px; line-height:1.4}
.porta-freccia{position:absolute; right:14px; bottom:18px; width:30px; height:30px; border-radius:50%;
  display:grid; place-items:center; font-weight:800; color:#021; background:#3dff8a;
  box-shadow:0 0 16px rgba(0,255,65,.5), inset 0 1px 0 rgba(255,255,255,.7)}
.porta-genera .porta-freccia{background:#c49bff; box-shadow:0 0 16px rgba(176,124,255,.55), inset 0 1px 0 rgba(255,255,255,.7)}

.home-titolo{display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-top:4px}
.home-titolo h2{margin:0 !important}
body .link{border:0; background:none; color:#3ddbff; font:700 12.5px/1 "Space Mono", monospace; cursor:pointer; padding:4px}

.home-giochi, #sala-giochi{display:grid; grid-auto-flow:column; grid-auto-columns:minmax(210px, 1fr); gap:12px;
  overflow-x:auto; scroll-snap-type:x mandatory; padding:2px 2px 8px; scrollbar-width:none}
.home-giochi::-webkit-scrollbar, #sala-giochi::-webkit-scrollbar{display:none}
#sala-giochi{grid-auto-flow:row; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); overflow:visible}
@media (max-width:520px){ #sala-giochi{grid-template-columns:1fr 1fr; gap:10px}
  #sala-giochi .carta-gioco .testo small{display:none}
  #sala-giochi .carta-gioco .piede{flex-direction:column; align-items:stretch; gap:6px}
  #sala-giochi .carta-gioco .gioca-ora{text-align:center}
  #sala-giochi .faccia-fortuna i{font-size:18px} }
.carta-gioco{scroll-snap-align:start; display:flex; flex-direction:column; padding:0; text-align:left; cursor:pointer;
  border-radius:20px; overflow:hidden; color:inherit; font:inherit; background:rgba(6,20,17,.85);
  border:1px solid rgba(120,255,200,.16); box-shadow:0 12px 28px rgba(0,0,0,.45); transition:transform .16s, border-color .16s}
.carta-gioco:hover{transform:translateY(-2px); border-color:rgba(0,255,65,.5)}
.carta-gioco .faccia{display:block; aspect-ratio:16/10; overflow:hidden; background:#000}
.carta-gioco .faccia img{width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s}
.carta-gioco:hover .faccia img{transform:scale(1.05)}
.faccia-fortuna{display:grid !important; grid-template-columns:repeat(3,1fr); gap:5px; padding:10px;
  background:radial-gradient(100% 100% at 50% 0%, rgba(255,209,102,.3), transparent 65%), #120d05}
.faccia-fortuna i{display:grid; place-items:center; font-style:normal; font-size:24px; border-radius:10px;
  background:radial-gradient(circle at 50% 40%, rgba(255,255,255,.2), transparent 60%), #1d2a1d; border:1px solid rgba(255,209,102,.25)}
.faccia-fortuna i:nth-child(2), .faccia-fortuna i:nth-child(5), .faccia-fortuna i:nth-child(8){
  background:radial-gradient(circle at 50% 40%, rgba(255,255,255,.28), transparent 60%), #3a2a07; border-color:#ffd166;
  box-shadow:0 0 12px rgba(255,209,102,.45)}
.carta-gioco .testo{display:grid; gap:4px; padding:12px 14px 6px}
.carta-gioco .testo b{font:700 16px/1.2 "Space Mono", monospace; color:#f2fffb}
.carta-gioco .testo small{color:#86a59c; font-size:12.5px; line-height:1.4}
.carta-gioco .piede{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 14px 14px; margin-top:auto}
.carta-gioco .costo{color:#ffd166; font:700 11.5px/1 "Space Mono", monospace}
.carta-gioco .gioca-ora{padding:7px 14px; border-radius:999px; color:#fff; font:800 12.5px/1 "M PLUS Rounded 1c", "Nunito", sans-serif;
  text-shadow:0 1px 1px rgba(0,40,10,.6); background:linear-gradient(180deg,#caffc4 0%,#19d64a 50%,#0a8a26 51%,#19d64a 100%);
  box-shadow:0 0 14px rgba(25,214,74,.4), inset 0 1px 0 rgba(255,255,255,.8)}

.home-mano .mano-carte{display:flex; gap:8px; overflow-x:auto; padding:4px 2px 10px; scrollbar-width:none}
.home-mano .spiega{margin:4px 0 8px}

.home-borsa{display:grid; grid-template-columns:1fr auto; gap:12px; align-items:stretch; padding:12px;
  border-radius:20px; border:1px solid rgba(120,255,200,.14); background:rgba(4,16,13,.7)}
@media (max-width:520px){ .home-borsa{grid-template-columns:1fr} }
.borsa-mini{height:110px; border-radius:14px; overflow:hidden;
  background:repeating-linear-gradient(0deg, rgba(0,255,65,.05) 0 1px, transparent 1px 28px), rgba(1,8,6,.7)}
.borsa-mini svg{width:100%; height:100%; display:block}
.borsa-lato{display:flex; flex-direction:column; justify-content:center; gap:6px; min-width:170px}
.borsa-lato .quota{font:700 30px/1 "Space Mono", monospace; color:#f2fffb; text-shadow:0 0 20px rgba(61,219,255,.35)}
.borsa-lato small{color:#86a59c}
.borsa-lato .su{color:#3dff8a; font:700 14px/1 "Space Mono", monospace}
.borsa-lato .giu{color:#ff5c6c; font:700 14px/1 "Space Mono", monospace}
.borsa-lato .btn{margin-top:4px}

/* ================================================ la slot delle combinazioni */

/* Musica / Immagini: un interruttore solo, non due bottoni sparsi. */
#p-slot .tavoli{display:inline-flex; align-self:flex-start; gap:0; padding:4px; margin:0; border-radius:999px;
  background:rgba(4,16,13,.8); border:1px solid rgba(120,255,200,.16)}
#p-slot .tavoli button{border:0; background:transparent; padding:8px 18px; color:#86a59c;
  font:700 13px/1 "Space Mono", monospace; box-shadow:none}
#p-slot .tavoli button.scelto{color:#0b0d12; background:var(--luce);
  box-shadow:0 0 18px color-mix(in srgb, var(--luce) 50%, transparent), inset 0 1px 0 rgba(255,255,255,.6)}
#p-slot .epoche{margin:0}
#p-slot .epoche button{min-width:46px; padding:6px 10px; font:700 12.5px/1 "Space Mono", monospace}

/* Le carte dei rulli: vetro scuro, il colore del grado come una striscia a
   sinistra e una pastiglia in fondo. Il bordo resta per il fuoco dei gradi. */
body #p-slot .rullo{border-radius:14px; padding:9px 10px 8px 13px;
  background:linear-gradient(170deg, rgba(255,255,255,.05), rgba(255,255,255,0) 40%), rgba(10,16,18,.9);
  border:1px solid rgba(120,255,200,.12); box-shadow:0 6px 16px rgba(0,0,0,.35)}
body #p-slot .rullo .barra{left:0; top:0; bottom:0; right:auto; width:3px; height:auto;
  box-shadow:0 0 10px currentColor}
body #p-slot .rullo .quale{font-family:"Space Mono", ui-monospace, monospace; color:#86a59c; text-transform:uppercase}
body #p-slot .rullo .nome{font-family:"M PLUS Rounded 1c", "Nunito", system-ui, sans-serif; color:#f2fffb}
body #p-slot .rullo .prezzo{align-self:flex-start; padding:2px 7px; border-radius:999px; font-family:"Space Mono", monospace;
  background:color-mix(in srgb, var(--g, #86a59c) 14%, transparent);
  border:1px solid color-mix(in srgb, var(--g, #86a59c) 45%, transparent)}
body #p-slot .rullo.bloccato{outline:2px solid #ffd166; outline-offset:-2px;
  background:linear-gradient(170deg, rgba(255,209,102,.14), rgba(255,209,102,0) 50%), rgba(20,17,8,.92);
  box-shadow:0 0 18px rgba(255,209,102,.28)}
/* «fermo» si legge gia' dal bordo d'oro e dalla puntina: la scritta finiva
   sopra la pastiglia del prezzo. Resta per chi legge con lo schermo vocale. */
body #p-slot .rullo .fermo{position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0)}

/* Il piede: prompt su una riga, i tastini, e la leva. Sempre in vista. */
.slot-piede{flex:0 0 auto; display:grid; gap:8px; padding:10px; margin:0 -2px; border-radius:18px;
  background:linear-gradient(180deg, rgba(6,20,17,.9), rgba(3,10,8,.96)); border:1px solid rgba(120,255,200,.14);
  box-shadow:0 -10px 30px rgba(0,0,0,.35)}
.prompt-riga{display:flex; align-items:center; gap:6px; min-width:0}
body #p-slot .prompt-riga .prompt{flex:1 1 auto; min-width:0; max-height:2.4em; margin:0; padding:8px 11px 8px 64px;
  position:relative; font-size:13px; line-height:1.2; border-radius:12px; background:rgba(1,6,5,.8);
  border:1px solid rgba(120,255,200,.12)}
body #p-slot .prompt-riga .prompt::before{content:"PROMPT"; position:absolute; left:10px; top:50%; transform:translateY(-50%);
  font:700 10px/1 "Space Mono", monospace; letter-spacing:.1em; color:#3dff8a}
body #p-slot .prompt-riga .prompt.aperto{max-height:34vh; overflow:auto; padding-left:11px; padding-top:22px}
body #p-slot .prompt-riga .prompt.aperto::before{top:12px}
body .btn.mini-tasto{flex:none; padding:8px 11px; font-size:12px; min-height:0}
.slot-piede .esito{margin:0; min-height:0}
.slot-piede .esito:empty{display:none}
.slot-piede .leva{margin:0; gap:8px}
body #p-slot #gira{flex:1.6; padding:15px 12px; font-size:19px; letter-spacing:.04em}
body #p-slot #manda{flex:1; padding:12px 10px; font-size:14px; --accent:#e0a100}
body #p-slot #manda:disabled{filter:grayscale(.9) brightness(.55)}

/* ========================================================= la macchinetta */

body #p-fortuna .macchina{max-width:500px; margin:4px auto 0; padding:14px 14px 16px; border-radius:28px; position:relative;
  background:linear-gradient(180deg, #1b1230 0%, #0e0a1a 40%, #07060d 100%);
  border:1px solid rgba(255,209,102,.35);
  box-shadow:0 0 0 4px rgba(20,14,34,.9), 0 0 0 5px rgba(255,209,102,.25), 0 24px 60px rgba(0,0,0,.6),
    inset 0 1px 0 rgba(255,255,255,.12)}
.insegna{display:flex; align-items:center; justify-content:center; gap:10px; margin:-2px 0 12px}
.insegna b{font:700 26px/1 "Space Mono", ui-monospace, monospace; letter-spacing:.3em; padding-left:.3em;
  color:#fff6d6; text-shadow:0 0 6px #ffd166, 0 0 18px #ff9d00, 0 0 36px rgba(255,120,0,.6)}
.insegna .lampadine{flex:1; max-width:90px; height:8px;
  background:radial-gradient(circle, #ffe7a3 0 2.5px, transparent 3px) 0 50% / 12px 8px repeat-x;
  filter:drop-shadow(0 0 4px #ffb300); animation:lampadine 1.2s steps(2) infinite}
@keyframes lampadine{50%{opacity:.45}}
body #p-fortuna .tiri{margin:0 0 10px}
body #p-fortuna .tiri span, body #p-fortuna .tiri b{font:700 12px/1 "Space Mono", monospace; padding:6px 14px}
body #p-fortuna .vetrina-macchina{gap:8px; padding:10px; border-radius:20px; position:relative;
  background:linear-gradient(180deg, rgba(0,0,0,.65), rgba(20,10,30,.8));
  border:2px solid #3a2b12;
  box-shadow:inset 0 0 0 2px rgba(255,209,102,.18), inset 0 12px 30px rgba(0,0,0,.7), 0 0 30px rgba(255,160,0,.12)}
body #p-fortuna .vetrina-macchina::after{content:""; position:absolute; inset:0; border-radius:18px; pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,0) 30%),
    repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 1px, transparent 1px 3px)}
body #p-fortuna .casella{border-radius:14px; border:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.4), 0 4px 10px rgba(0,0,0,.45)}
body #p-fortuna .puntate{gap:10px; margin:14px 0 10px}
body #p-fortuna .puntate button{border-radius:999px; padding:11px 6px; font:700 14px/1 "Space Mono", monospace;
  color:#ffe7a3; background:radial-gradient(circle at 50% 30%, #3a2c10, #1a1307); border:2px solid #6b5220;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.15), 0 4px 10px rgba(0,0,0,.4)}
body #p-fortuna .puntate button.scelto{color:#2a1a00; border-color:#ffe08a;
  background:radial-gradient(circle at 50% 30%, #fff1b8, #ffc933 55%, #d18f00);
  box-shadow:0 0 18px rgba(255,201,51,.55), inset 0 1px 0 #fff}
body #p-fortuna #tira{display:block; width:100%; padding:16px; font-size:20px; letter-spacing:.06em; --accent:#19d64a}
body #p-fortuna .macchina.secondo #tira{--accent:#e0a100; color:#2a1a00; text-shadow:0 1px 0 rgba(255,255,255,.45)}
body #p-fortuna .conto{margin-top:12px; color:#9d93b8; font-size:12.5px; line-height:1.5; text-align:center}
body #p-fortuna .cassetto{max-width:500px; margin:12px auto 0}
`;
