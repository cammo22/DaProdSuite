/**
 * Come e' vestita la sala giochi.
 *
 * **Il fondo e' quello della suite**, non un tema a parte: stessi grigi, stessa
 * riga di separazione, stessi bottoni. Sopra ci sta il velluto, l'oro e la roba
 * che si muove, che sono di qui — una sala giochi che sembra un pannello di
 * impostazioni non fa venire voglia di tirare la leva.
 *
 * ⚠ **I colori dei gradi non stanno qui.** Sono undici e arrivano dal server
 * insieme alla scala (`GRADI` in `regole.ts`): la pagina se li piazza addosso
 * con `style`. Scriverli anche qui vorrebbe dire avere due gialli per il
 * Legendary, e un giorno sarebbero diversi.
 *
 * ⚠ **Niente apici inversi dentro la stringa.** Questa stringa *e'* un apice
 * inverso: uno solo la chiuderebbe, e l'errore punterebbe a una riga a caso.
 * C'e' una guardia che lo controlla, `scripts/niente-apici.mjs`, e c'e' perche'
 * l'errore l'ho fatto io.
 */

export const STILE = `
:root{
  --fondo:#08090d; --pannello:#12141c; --pannello2:#171a24; --riga:#242835;
  --testo:#e8eaf2; --spento:#868c9e; --oro:#ffd166; --verde:#1f6f4a;
  --verde-scuro:#123d29; --rosso:#ff5c6e;
  /* Le tre tinte del fondo e la luce dell'epoca: le cambia il copione. */
  --e1:#0a0a12; --e2:#2a1a3a; --e3:#1a2a3a; --luce:#e0a0ff;
}
*{box-sizing:border-box}
/* Il nascosto deve vincere su tutto: il pallino delle notifiche ha
   display:inline-block addosso, e quella riga batteva il display:none che il
   browser mette da se' su [hidden]. Visto a mano il 9 settembre 2026. */
[hidden]{display:none!important}

body{margin:0; color:var(--testo); min-height:100vh;
  font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  -webkit-text-size-adjust:100%;
  background:
    radial-gradient(120% 80% at 50% -10%, var(--e2) 0%, transparent 60%),
    radial-gradient(100% 70% at 100% 100%, var(--e3) 0%, transparent 55%),
    var(--e1);
  background-attachment:fixed;
  transition:background 700ms ease}

/* ------------------------------------------------------------- la testata */
header{position:sticky; top:0; z-index:30; display:flex; align-items:center; gap:10px;
  padding:10px 14px; background:rgba(8,9,13,.82); backdrop-filter:blur(10px);
  border-bottom:1px solid var(--riga)}
.marchio{font-weight:700; letter-spacing:.2px}
.marchio span{color:var(--luce); transition:color 700ms ease}
.cresci{flex:1}
.chi{color:var(--spento); font-size:13px}
.saldo{display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px;
  background:linear-gradient(180deg,#1d1a10,#151209); border:1px solid #3a3115;
  color:var(--oro); font-variant-numeric:tabular-nums; font-weight:700; cursor:pointer;
  transition:transform .18s ease}
.saldo small{color:var(--spento); font-weight:500}
.saldo.su{animation:soldi-su .55s ease}
@keyframes soldi-su{
  0%{transform:scale(1)} 30%{transform:scale(1.18); box-shadow:0 0 22px rgba(255,209,102,.55)}
  100%{transform:scale(1)}
}

/* ------------------------------------------------------------- la pancia */
main{padding:12px 14px 96px; max-width:1000px; margin:0 auto}
.pagina{display:none}
.pagina.viva{display:block; animation:entra .22s ease}
@keyframes entra{from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none}}
h2{margin:20px 0 9px; font-size:14px; letter-spacing:.4px; text-transform:uppercase;
  color:var(--spento)}
h2:first-child{margin-top:2px}

/* ------------------------------------------------------- tavoli ed epoche */
.fila-scelte{display:flex; gap:6px; margin-bottom:8px; overflow-x:auto;
  scrollbar-width:none}
.fila-scelte::-webkit-scrollbar{display:none}
.fila-scelte button{flex:0 0 auto; padding:8px 14px; border-radius:999px;
  border:1px solid var(--riga); background:rgba(18,20,28,.7); color:var(--spento);
  font-weight:600; cursor:pointer; transition:all .18s ease}
.fila-scelte button.scelto{color:#0b0d12; background:var(--luce); border-color:var(--luce);
  box-shadow:0 0 18px color-mix(in srgb, var(--luce) 45%, transparent)}
.epoche button{min-width:52px; font-variant-numeric:tabular-nums}

/* -------------------------------------------------------------- i rulli */
.rulli{display:grid; grid-template-columns:repeat(2,1fr); gap:7px}
@media (min-width:460px){ .rulli{grid-template-columns:repeat(3,1fr)} }
@media (min-width:760px){ .rulli{grid-template-columns:repeat(4,1fr)} }
@media (min-width:1000px){ .rulli{grid-template-columns:repeat(6,1fr)} }

.rullo{position:relative; min-height:112px; padding:9px 9px 24px; border-radius:13px;
  background:linear-gradient(180deg,rgba(23,26,36,.92),rgba(18,20,28,.92));
  border:1px solid var(--riga); cursor:pointer; overflow:hidden;
  transition:transform .14s ease, border-color .2s ease, box-shadow .3s ease}
.rullo:active{transform:scale(.97)}
.rullo .quale{font-size:10px; letter-spacing:.5px; text-transform:uppercase; color:var(--spento)}
.rullo .nome{margin-top:5px; font-weight:700; line-height:1.22; overflow-wrap:anywhere;
  font-size:14px}
/* Quello che va davvero al modello, sotto al nome italiano. Piccolo e
   spento: si legge se lo cerchi, non ruba il posto al nome. */
.rullo .inglese{margin-top:4px; font-size:10.5px; color:#7f899e; line-height:1.3;
  font-style:italic; display:-webkit-box; -webkit-line-clamp:2;
  -webkit-box-orient:vertical; overflow:hidden}
.rullo .esempio{margin-top:3px; font-size:10.5px; color:var(--spento); line-height:1.3;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.rullo .prezzo{position:absolute; left:9px; bottom:6px; font-size:11px; font-weight:700;
  font-variant-numeric:tabular-nums}
.rullo .fermo{position:absolute; right:8px; bottom:6px; font-size:10px; color:var(--oro);
  opacity:0; transition:opacity .15s ease}
.rullo .barra{position:absolute; left:0; top:0; right:0; height:3px; background:var(--spento)}

/* Bloccato: bordo d'oro e una puntina che pulsa piano. */
.rullo.bloccato{border-color:var(--oro); box-shadow:inset 0 0 0 1px rgba(255,209,102,.4)}
.rullo.bloccato .fermo{opacity:1}
.rullo.bloccato::after{content:""; position:absolute; right:7px; top:7px; width:7px; height:7px;
  border-radius:50%; background:var(--oro); box-shadow:0 0 10px var(--oro);
  animation:puntina 1.8s ease-in-out infinite}
@keyframes puntina{0%,100%{opacity:.55} 50%{opacity:1}}

/* Quanto si accende un rullo, secondo il grado. Il colore arriva da fuori,
   dentro --g: qui c'e' solo quanto forte lo si accende. */
.rullo.f1{border-color:color-mix(in srgb, var(--g) 55%, var(--riga))}
.rullo.f2{border-color:var(--g); box-shadow:0 0 18px color-mix(in srgb, var(--g) 30%, transparent)}
.rullo.f3{border-color:var(--g);
  box-shadow:0 0 26px color-mix(in srgb, var(--g) 55%, transparent),
             inset 0 0 26px color-mix(in srgb, var(--g) 14%, transparent);
  animation:respira 2.4s ease-in-out infinite}
@keyframes respira{
  0%,100%{box-shadow:0 0 20px color-mix(in srgb, var(--g) 40%, transparent),
                     inset 0 0 20px color-mix(in srgb, var(--g) 10%, transparent)}
  50%{box-shadow:0 0 38px color-mix(in srgb, var(--g) 75%, transparent),
                inset 0 0 30px color-mix(in srgb, var(--g) 20%, transparent)}
}
/* Il luccichio che passa sopra alla roba grossa. */
.rullo.f3::before{content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(115deg, transparent 35%,
    color-mix(in srgb, var(--g) 45%, transparent) 50%, transparent 65%);
  transform:translateX(-120%); animation:luccica 3.4s ease-in-out infinite}
@keyframes luccica{0%{transform:translateX(-120%)} 45%,100%{transform:translateX(120%)}}

/* Il giro: le parole scorrono via sfocate, poi la casella rimbalza. */
.rullo.gira .nome, .rullo.gira .esempio, .rullo.gira .prezzo{
  animation:scorre .11s linear infinite; filter:blur(2px); opacity:.55}
@keyframes scorre{
  0%{transform:translateY(0)} 49%{transform:translateY(-14px); opacity:.25}
  50%{transform:translateY(14px)} 100%{transform:translateY(0)}
}
.rullo.arrivato{animation:rimbalza .34s cubic-bezier(.2,1.7,.4,1)}
@keyframes rimbalza{0%{transform:translateY(-9px) scale(1.03)} 100%{transform:none}}

/* ------------------------------------------------------------- la leva */
.leva{display:flex; gap:8px; margin:12px 0 4px}
.btn{padding:12px 16px; border-radius:12px; border:1px solid var(--riga);
  background:var(--pannello2); color:var(--testo); font-weight:700; cursor:pointer;
  transition:transform .12s ease, filter .2s ease}
.btn:active{transform:translateY(1px)}
.btn:disabled{opacity:.4; cursor:default}
.btn.grosso{flex:2; font-size:17px; letter-spacing:.3px;
  background:linear-gradient(180deg,#2fa06b,var(--verde)); border-color:#37a06d; color:#f2fff8;
  box-shadow:0 6px 20px rgba(31,111,74,.35)}
.btn.grosso:not(:disabled):hover{filter:brightness(1.12)}
.btn.oro{flex:1; background:linear-gradient(180deg,#3a3115,#241f0d); border-color:#5a4a1c;
  color:var(--oro)}
.btn.piano{background:transparent; color:var(--spento)}

/* --------------------------------------------------------- il risultato */
.esito{min-height:24px; margin:8px 0 2px; font-weight:700; font-size:15px}
.esito.vinta{animation:esplode .5s ease}
.esito.persa{color:var(--spento); font-weight:500}
@keyframes esplode{0%{transform:scale(.86); opacity:0} 60%{transform:scale(1.06)} 100%{transform:none; opacity:1}}

.prompt{padding:11px 12px; border-radius:12px; background:rgba(9,11,16,.75);
  border:1px solid var(--riga); color:#cfd4e4; font-size:13.5px; overflow-wrap:anywhere}
.prompt .vuoto{color:var(--spento)}

/* Il numero che sale e sfuma quando si vince. */
.volante{position:fixed; left:50%; top:38%; transform:translateX(-50%); z-index:60;
  font-size:34px; font-weight:800; pointer-events:none; text-shadow:0 4px 30px rgba(0,0,0,.6);
  animation:vola 1.5s cubic-bezier(.2,.8,.3,1) forwards}
@keyframes vola{
  0%{opacity:0; transform:translateX(-50%) translateY(18px) scale(.8)}
  18%{opacity:1; transform:translateX(-50%) translateY(0) scale(1.12)}
  100%{opacity:0; transform:translateX(-50%) translateY(-90px) scale(1)}
}

/* Il lampo ai bordi dello schermo, del colore del grado uscito. */
.lampo{position:fixed; inset:0; pointer-events:none; z-index:50;
  box-shadow:inset 0 0 120px 10px var(--g); opacity:0; animation:lampeggia .9s ease}
@keyframes lampeggia{0%{opacity:0} 15%{opacity:.85} 100%{opacity:0}}

/* Quando esce la roba grossa, tutta la sala si scuote un po'. */
.scossa{animation:scuoti .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes scuoti{
  10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)}
  30%,50%,70%{transform:translateX(-7px)} 40%,60%{transform:translateX(7px)}
}

/* I coriandoli: quadratini che cadono girando. */
.coriandolo{position:fixed; top:-14px; width:9px; height:14px; z-index:55; pointer-events:none;
  animation:cade linear forwards}
@keyframes cade{
  0%{transform:translateY(-20px) rotate(0deg); opacity:1}
  100%{transform:translateY(105vh) rotate(720deg); opacity:.15}
}

/* ------------------------------------------------------------ le schede */
.figurina{position:relative; padding:11px 12px; border-radius:13px;
  background:rgba(18,20,28,.85); border:1px solid var(--riga); margin-bottom:8px;
  overflow:hidden}
.figurina.f2{border-color:color-mix(in srgb, var(--g) 60%, var(--riga))}
.figurina.f3{border-color:var(--g);
  box-shadow:0 0 22px color-mix(in srgb, var(--g) 28%, transparent)}
.figurina .titolo{font-weight:700; overflow-wrap:anywhere}
.figurina .sotto{margin-top:5px; font-size:12px; color:var(--spento)}
.figurina .testo{margin-top:7px; font-size:12.5px; color:#cfd4e4; overflow-wrap:anywhere}
.figurina.coperta{opacity:.55; border-style:dashed}
.figurina img{margin-top:8px; border-radius:9px; max-height:220px; display:block}
.figurina audio{margin-top:8px; width:100%}
.figurina.nuova{animation:apparsa .5s cubic-bezier(.2,1.5,.4,1)}
@keyframes apparsa{0%{transform:scale(.9); opacity:0} 100%{transform:none; opacity:1}}

.pastiglia{display:inline-block; padding:2px 9px; border-radius:999px; font-size:11px;
  font-weight:700; border:1px solid currentColor}
.riga-tasti{display:flex; gap:8px; margin-top:9px; flex-wrap:wrap}
.riga-tasti input{flex:1; min-width:110px; padding:9px 10px; border-radius:10px;
  border:1px solid var(--riga); background:rgba(9,11,16,.8); color:var(--testo)}
.gradi-scelta{display:flex; flex-wrap:wrap; gap:5px; margin-top:8px}
.gradi-scelta button{padding:5px 10px; border-radius:999px; font-size:11.5px; font-weight:700;
  border:1px solid currentColor; background:transparent; cursor:pointer}
.gradi-scelta button.scelto{color:#0b0d12!important}

table{width:100%; border-collapse:collapse; font-size:13.5px}
th{text-align:left; font-weight:600; color:var(--spento); font-size:11.5px;
  text-transform:uppercase; letter-spacing:.4px; padding:6px 8px}
td{padding:9px 8px; border-top:1px solid var(--riga); font-variant-numeric:tabular-nums}
tr.io td{background:rgba(255,209,102,.07)}

.niente{padding:22px 12px; text-align:center; color:var(--spento)}

/* ---------------------------------------------------------- le linguette */
nav{position:fixed; left:0; right:0; bottom:0; z-index:30; display:flex;
  background:rgba(8,9,13,.94); backdrop-filter:blur(10px); border-top:1px solid var(--riga);
  padding-bottom:env(safe-area-inset-bottom)}
nav button{flex:1; padding:11px 4px 13px; border:0; background:transparent;
  color:var(--spento); font-size:11.5px; font-weight:600; cursor:pointer;
  transition:color .2s ease}
nav button.viva{color:var(--luce)}
nav .pallino{display:inline-block; min-width:16px; padding:0 4px; margin-left:4px;
  border-radius:999px; background:var(--rosso); color:#fff; font-size:10px;
  animation:batte 1.6s ease-in-out infinite}
@keyframes batte{0%,100%{transform:scale(1)} 50%{transform:scale(1.16)}}

/* --------------------------------------------------------- il pannellone */
/* Tenendo premuto si apre questo: una cosa sola, scritta grossa. Serve a chi
   ci vede poco e a chiunque debba leggere un prompt di dodici pezzi su un
   telefono. La misura cresce con lo schermo (clamp), non e' fissa. */
/* Coprente davvero: con un fondo semitrasparente si leggeva la pagina dietro,
   e un pannello «per chi ci vede poco» attraverso cui si vede altro testo non
   serve a niente. Visto a mano il 9 settembre 2026. */
.grande{position:fixed; inset:0; z-index:70; display:flex; align-items:center;
  justify-content:center; padding:24px; cursor:pointer;
  background:#06070a; animation:apre .18s ease}
@keyframes apre{from{opacity:0} to{opacity:1}}
.grande .dentro{max-width:900px; text-align:center}
.grande .su{font-size:clamp(13px,2.4vw,18px); letter-spacing:.6px;
  text-transform:uppercase; color:var(--spento)}
.grande .nomone{margin-top:10px; font-size:clamp(30px,8vw,72px); font-weight:800;
  line-height:1.08; color:var(--g,var(--testo)); overflow-wrap:anywhere}
.grande .testone{margin-top:20px; font-size:clamp(19px,3.6vw,34px); line-height:1.4;
  color:var(--testo); overflow-wrap:anywhere; white-space:pre-wrap}
.grande .chiudi{margin-top:26px; font-size:clamp(12px,2vw,15px); color:var(--spento)}

/* ------------------------------------------------------------- l'avviso */
.avviso{position:fixed; left:50%; bottom:78px; transform:translateX(-50%);
  max-width:88%; padding:10px 16px; border-radius:12px; background:#1b1f2b;
  border:1px solid var(--riga); box-shadow:0 12px 34px rgba(0,0,0,.55);
  font-size:13.5px; z-index:40; animation:sale .28s ease}
@keyframes sale{from{opacity:0; transform:translateX(-50%) translateY(10px)}
  to{opacity:1; transform:translateX(-50%)}}
.avviso.male{border-color:#5c2530; color:#ffd7dc}
.avviso.bene{border-color:#2b6b49; color:#d8ffe9}

/* Chi non vuole roba che si muove non la vede: il gioco resta lo stesso. */
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.01ms!important; animation-iteration-count:1!important;
    transition-duration:.01ms!important}
}
`;
