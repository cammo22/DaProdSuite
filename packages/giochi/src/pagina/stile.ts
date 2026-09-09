/**
 * Come e' vestita la sala giochi.
 *
 * **Il fondo e' quello della suite**, non un tema a parte: stessi grigi, stessa
 * riga di separazione, stessi bottoni. Sopra ci sta il velluto e l'oro, che
 * sono di qui — una sala giochi che sembra un pannello di impostazioni non fa
 * venire voglia di tirare la leva, e un pannello di impostazioni travestito da
 * casino' non lo guarda nessuno due volte.
 *
 * I colori delle rarita' sono gli stessi di `regole.ts` e non si riscrivono a
 * mano: arrivano dal server insieme ai gradi, e la pagina se li piazza addosso.
 * Scriverli anche qui vorrebbe dire avere due gialli per il Leggendario, e un
 * giorno sarebbero diversi.
 */

export const STILE = `
:root{
  --fondo:#08090d; --pannello:#12141c; --pannello2:#171a24; --riga:#242835;
  --testo:#e8eaf2; --spento:#868c9e; --oro:#ffd166; --verde:#1f6f4a;
  --verde-scuro:#123d29; --rosso:#ff5c6e;
}
*{box-sizing:border-box}
/* Il «nascosto» deve vincere su tutto.
   Il pallino delle notifiche ha display:inline-block addosso, e quella riga
   batte il display:none che il browser mette da se' su [hidden]: il pallino
   rosso restava acceso anche a fila vuota. Visto a mano il 9 settembre 2026 —
   la fila era vuota e il tasto diceva ancora che c'era da controllare.
   (E le due righe qui sopra non hanno apici inversi apposta: questa stringa
   e' un apice inverso, e uno solo qui dentro la chiuderebbe.) */
[hidden]{display:none!important}
body{margin:0; background:var(--fondo); color:var(--testo);
  font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  -webkit-text-size-adjust:100%}

/* ------------------------------------------------------------- la testata */
header{position:sticky; top:0; z-index:20; display:flex; align-items:center; gap:10px;
  padding:10px 14px; background:rgba(8,9,13,.94); backdrop-filter:blur(8px);
  border-bottom:1px solid var(--riga)}
.marchio{font-weight:700; letter-spacing:.2px}
.marchio span{color:var(--oro)}
.cresci{flex:1}
.saldo{display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px;
  background:linear-gradient(180deg,#1d1a10,#151209); border:1px solid #3a3115;
  color:var(--oro); font-variant-numeric:tabular-nums; font-weight:700; cursor:pointer}
.saldo small{color:var(--spento); font-weight:500}
.chi{color:var(--spento); font-size:13px}

/* ------------------------------------------------------------- la pancia */
main{padding:14px 14px 92px; max-width:920px; margin:0 auto}
.pagina{display:none}
.pagina.viva{display:block}
h2{margin:22px 0 10px; font-size:14px; letter-spacing:.4px; text-transform:uppercase;
  color:var(--spento)}
h2:first-child{margin-top:4px}

/* -------------------------------------------------------------- i rulli */
.tavolo{display:flex; gap:8px; margin-bottom:12px}
.tavolo button{flex:1; padding:9px; border-radius:10px; border:1px solid var(--riga);
  background:var(--pannello); color:var(--spento); font-weight:600; cursor:pointer}
.tavolo button.scelto{background:var(--verde-scuro); border-color:#2b7c55; color:#eafff3}

.rulli{display:grid; grid-template-columns:repeat(3,1fr); gap:8px}
@media (min-width:700px){ .rulli{grid-template-columns:repeat(6,1fr)} }

.rullo{position:relative; min-height:104px; padding:9px 9px 26px; border-radius:12px;
  background:linear-gradient(180deg,var(--pannello2),var(--pannello));
  border:1px solid var(--riga); cursor:pointer; overflow:hidden;
  transition:transform .12s ease, border-color .12s ease}
.rullo:active{transform:scale(.985)}
.rullo .quale{font-size:10.5px; letter-spacing:.5px; text-transform:uppercase; color:var(--spento)}
.rullo .nome{margin-top:5px; font-weight:700; line-height:1.25; overflow-wrap:anywhere}
.rullo .esempio{margin-top:4px; font-size:11px; color:var(--spento); line-height:1.3;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.rullo .prezzo{position:absolute; left:9px; bottom:7px; font-size:11.5px;
  font-variant-numeric:tabular-nums; color:var(--spento)}
.rullo .fermo{position:absolute; right:8px; bottom:6px; font-size:11px; color:var(--oro);
  opacity:0; transition:opacity .12s ease}
.rullo.bloccato{border-color:var(--oro); box-shadow:inset 0 0 0 1px rgba(255,209,102,.35)}
.rullo.bloccato .fermo{opacity:1}
/* Il colore della rarita' arriva dal server: qui c'e' solo dove si appoggia. */
.rullo .barra{position:absolute; left:0; top:0; right:0; height:3px; background:var(--spento)}
.rullo.gira .nome, .rullo.gira .esempio{opacity:.25; filter:blur(1.5px)}

/* ------------------------------------------------------------- la leva */
.leva{display:flex; gap:8px; margin:12px 0}
.btn{padding:12px 16px; border-radius:12px; border:1px solid var(--riga);
  background:var(--pannello2); color:var(--testo); font-weight:700; cursor:pointer}
.btn:disabled{opacity:.45; cursor:default}
.btn.grosso{flex:2; font-size:16px;
  background:linear-gradient(180deg,#2a8a5c,var(--verde)); border-color:#37a06d; color:#f2fff8}
.btn.oro{flex:1; background:linear-gradient(180deg,#3a3115,#241f0d); border-color:#5a4a1c; color:var(--oro)}
.btn.piano{background:transparent; color:var(--spento)}

/* --------------------------------------------------------- il risultato */
.esito{min-height:22px; margin:6px 0 2px; font-weight:700}
.esito.vinta{color:var(--oro)}
.esito.persa{color:var(--spento); font-weight:500}
.prompt{padding:11px 12px; border-radius:12px; background:#0d0f15;
  border:1px solid var(--riga); color:#cfd4e4; font-size:13.5px; overflow-wrap:anywhere}
.prompt .vuoto{color:var(--spento)}

/* ------------------------------------------------------------ le schede */
.figurina{padding:11px 12px; border-radius:12px; background:var(--pannello);
  border:1px solid var(--riga); margin-bottom:8px}
.figurina .titolo{font-weight:700; overflow-wrap:anywhere}
.figurina .sotto{margin-top:4px; font-size:12px; color:var(--spento)}
.figurina .testo{margin-top:7px; font-size:12.5px; color:#cfd4e4; overflow-wrap:anywhere}
.figurina.coperta{opacity:.62; border-style:dashed}
.pastiglia{display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px;
  font-weight:700; border:1px solid currentColor}
.riga-tasti{display:flex; gap:8px; margin-top:9px; flex-wrap:wrap}
.riga-tasti input{flex:1; min-width:110px; padding:9px 10px; border-radius:10px;
  border:1px solid var(--riga); background:#0d0f15; color:var(--testo)}

table{width:100%; border-collapse:collapse; font-size:13.5px}
th{text-align:left; font-weight:600; color:var(--spento); font-size:11.5px;
  text-transform:uppercase; letter-spacing:.4px; padding:6px 8px}
td{padding:9px 8px; border-top:1px solid var(--riga); font-variant-numeric:tabular-nums}
tr.io td{background:rgba(255,209,102,.06)}

.niente{padding:22px 12px; text-align:center; color:var(--spento)}

/* ---------------------------------------------------------- le linguette */
nav{position:fixed; left:0; right:0; bottom:0; z-index:20; display:flex;
  background:rgba(8,9,13,.96); backdrop-filter:blur(8px); border-top:1px solid var(--riga);
  padding-bottom:env(safe-area-inset-bottom)}
nav button{flex:1; padding:11px 4px 13px; border:0; background:transparent;
  color:var(--spento); font-size:11.5px; font-weight:600; cursor:pointer}
nav button.viva{color:var(--oro)}
nav .pallino{display:inline-block; min-width:16px; padding:0 4px; margin-left:4px;
  border-radius:999px; background:var(--rosso); color:#fff; font-size:10px}

/* ------------------------------------------------------------- l'avviso */
.avviso{position:fixed; left:50%; bottom:76px; transform:translateX(-50%);
  max-width:88%; padding:10px 15px; border-radius:12px; background:#1b1f2b;
  border:1px solid var(--riga); box-shadow:0 12px 34px rgba(0,0,0,.5);
  font-size:13.5px; z-index:40}
.avviso.male{border-color:#5c2530; color:#ffd7dc}
.avviso.bene{border-color:#2b6b49; color:#d8ffe9}
`;
