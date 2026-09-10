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
/* ⚠ Su una riga sola: «Cammo · decidi tu» andava a capo quattro volte su un
   telefono stretto e spingeva giu' mezza testata. Se non ci sta, si taglia. */
.chi{color:var(--spento); font-size:13px; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; min-width:0; flex:0 1 auto}
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
/**
 * @ATT **La slot sta in una schermata, e non si scorre.**
 *
 * Chiesto il 10 settembre 2026, con lo screenshot davanti: «fai molto piu'
 * piccoli per telefono, sono troppo grandi; trova un modo originale per far
 * entrare tutto bene sullo schermo piccolo e tablet ad alte risoluzioni, una
 * sola bella pagina intera».
 *
 * Il difetto si vedeva: dodici rulli in due colonne alti centosessanta pixel
 * fanno seicento pixel di roba sotto al bordo. Si vedevano otto pezzi su
 * dodici, e per guardare la riga intera — che e' **la cosa che si sta
 * montando** — bisognava scorrere avanti e indietro.
 *
 * La pancia adesso e' alta quanto lo schermo meno la testata e le schede
 * («dvh» e non «vh»: su un telefono la barra dell'indirizzo entra e esce, e
 * «vh» conta come se non ci fosse mai). Le pagine che sono elenchi scorrono
 * dentro; la slot no: si prende l'altezza e la divide.
 */
main{--sopra:52px; --sotto:calc(56px + env(safe-area-inset-bottom));
  height:calc(100dvh - var(--sopra) - var(--sotto));
  padding:10px 12px; max-width:1400px; margin:0 auto; overflow-y:auto}
.pagina{display:none}
.pagina.viva{display:block; animation:entra .22s ease}
/* La slot e' l'unica che non scorre: e' un pannello, non un elenco. */
#p-slot.viva{display:flex; flex-direction:column; gap:8px; height:100%; overflow:hidden}
#p-slot > h2, #p-slot > .prompt, #p-slot > .riga-tasti{flex:0 0 auto}
/**
 * ⚠ **Il prompt che stai montando: due righe, e si apre toccandolo.**
 *
 * E' la cosa piu' lunga della pagina — dodici pezzi di testo inglese — e per
 * intero si mangiava meta' schermo, spingendo i rulli fuori. Due righe bastano
 * a riconoscerlo; per leggerlo tutto si tocca, e allora si prende lo spazio che
 * gli serve (e quello e' il momento in cui la pagina puo' scorrere).
 */
#p-slot .prompt{max-height:3.2em; overflow:hidden; position:relative; cursor:pointer}
#p-slot .prompt.aperto{max-height:40vh; overflow:auto}
#p-slot .prompt:not(.aperto)::after{content:""; position:absolute; left:0; right:0;
  bottom:0; height:1.4em; background:linear-gradient(180deg,transparent,rgba(18,20,28,.96))}
#p-slot > h2{margin:2px 0 4px}
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
/**
 * @ATT **Dodici pezzi, una schermata, nessuno scorrimento.**
 *
 * Chiesto il 10 settembre 2026: «molto piu' piccoli per telefono, sono troppo
 * grandi... una sola bella pagina intera». Prima erano due colonne di carte
 * alte centosessanta pixel: se ne vedevano otto su dodici.
 *
 * Il conto e' sempre dodici, e cambia **come si dispongono**: tre colonne per
 * quattro righe su un telefono, quattro per tre su un tablet, sei per due su
 * uno schermo largo. Le righe si dividono in parti uguali l'altezza che
 * avanza, quindi la griglia riempie lo spazio e non ne chiede mai di piu'.
 *
 * ## Il pezzo originale: le carte misurano il testo su se stesse
 *
 * Il problema di far stare la stessa cosa su un telefono da cinque pollici e
 * su un tablet 4K non e' la griglia: e' il **testo**. Diciotto pixel sono
 * enormi in una cella da un centimetro e ridicoli in una da otto.
 *
 * Qui ogni carta e' un **contenitore** («container-type: inline-size») e il
 * testo dentro si misura in «cqi» — percentuali della **larghezza della sua
 * carta**, non dello schermo. Cosi' la stessa regola vale dappertutto: la
 * carta si prende lo spazio che c'e', e il testo cresce o si stringe con lei.
 * Niente scaglioni, niente tre misure scritte a mano che sbagliano sempre su
 * qualche schermo.
 *
 * Il «clamp()» mette i due paletti: sotto una certa misura non si legge, sopra
 * diventa un cartellone.
 */
.rulli{display:grid; grid-template-columns:repeat(3,1fr); gap:6px;
  flex:1 1 auto; min-height:0; grid-auto-rows:1fr}
@media (min-width:620px){ .rulli{grid-template-columns:repeat(4,1fr); gap:8px} }
@media (min-width:1000px){ .rulli{grid-template-columns:repeat(6,1fr); gap:10px} }

/**
 * ⚠ **La carta e' una colonna, e niente ci sta sopra in assoluto.**
 *
 * Il prezzo e il «fermo» stavano incollati in fondo con «position:absolute»:
 * andava bene finche' le carte erano alte centosessanta pixel, e a
 * quarantacinque il nome ci finiva sopra — «soulful house» e «L. 1 - Grand»
 * stampati uno sull'altro. Visto in una schermata, il 10 settembre 2026.
 *
 * Adesso e' una colonna vera: sopra la domanda, in mezzo il nome che si prende
 * lo spazio che avanza, in fondo la riga del prezzo. Niente si sovrappone
 * perche' niente e' fuori dal flusso, a qualunque altezza.
 */
.rullo{position:relative; container-type:inline-size; min-height:0;
  display:flex; flex-direction:column; gap:clamp(1px,1cqi,4px);
  padding:clamp(5px,3.5cqi,13px);
  border-radius:clamp(10px,4cqi,16px); overflow:hidden;
  background:linear-gradient(180deg,rgba(23,26,36,.92),rgba(18,20,28,.92));
  border:1px solid var(--riga); cursor:pointer;
  transition:transform .14s ease, border-color .2s ease, box-shadow .3s ease}
.rullo:active{transform:scale(.97)}
.rullo .quale{font-size:clamp(7.5px,3.4cqi,11px); letter-spacing:.4px;
  text-transform:uppercase; color:var(--spento); line-height:1.1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rullo .nome{margin:0; font-weight:700; line-height:1.15; flex:1 1 auto; min-height:0;
  overflow-wrap:anywhere; font-size:clamp(10px,6cqi,20px);
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
/**
 * Quello che va davvero al modello, e l'esempio.
 *
 * @ATT **Su una carta stretta spariscono**, e non e' una perdita: in tre
 * colonne su un telefono ci starebbero due parole tagliate a meta', che e'
 * peggio di niente. Il nome in italiano e il grado restano sempre — sono quello
 * che serve a decidere se bloccare il rullo. Il resto si legge nel prompt qui
 * sotto, che c'e' sempre, e toccando la carta.
 */
.rullo .inglese{margin-top:clamp(2px,1.6cqi,6px); font-size:clamp(8px,3.6cqi,11.5px);
  color:#7f899e; line-height:1.25; font-style:italic;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.rullo .esempio{margin-top:clamp(2px,1.4cqi,5px); font-size:clamp(7.5px,3.4cqi,11px);
  color:var(--spento); line-height:1.25;
  display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden}
@container (max-width: 150px){
  .rullo .inglese, .rullo .esempio{display:none}
}
/* L'ultima riga: il prezzo a sinistra, «fermo» a destra. In fondo davvero,
   cioe' spinta li' dal nome che sta in mezzo — non incollata. */
.rullo .prezzo{margin-top:auto; font-size:clamp(7.5px,3.4cqi,12px); font-weight:700;
  font-variant-numeric:tabular-nums; line-height:1.1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rullo .fermo{position:absolute; right:clamp(4px,3cqi,12px); bottom:clamp(3px,2.2cqi,9px);
  font-size:clamp(7px,3.2cqi,11px); color:var(--oro);
  opacity:0; transition:opacity .15s ease}
.rullo .barra{position:absolute; left:0; top:0; right:0; height:2px; background:var(--spento)}

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
/**
 * ⚠ **Bloccato: un anello d'oro attorno, e il pallino grosso.**
 *
 * Detto il 10 settembre 2026: «quando blocchiamo, oltre al pallino giallo
 * magari piu' grande, facciamo anche attorno, che si capisce poco che e'
 * bloccato».
 *
 * Il difetto non era la delicatezza: era che **non si vedeva proprio**. Il
 * bloccato tingeva d'oro il bordo, ma le regole del grado — che stanno qui
 * sopra e hanno la stessa forza — ridipingono lo stesso bordo, e vincono
 * perche' vengono dopo. Su qualunque pezzo da Rare in su restava solo un
 * puntino da sette pixel.
 *
 * Adesso e' un «outline»: e' un'altra proprieta', quindi non se la contende
 * con nessuno, e sta **dentro** la carta cosi' non sposta la griglia di un
 * pixel. Con l'anello ci sono il velo d'oro sopra a tutto e il pallino grosso.
 * Tre segni per la stessa cosa: uno solo lo si perde.
 *
 * Sta dopo le regole dei gradi apposta. Se lo si sposta piu' su, torna il
 * difetto identico.
 */
.rullo.bloccato{outline:clamp(2px,1.4cqi,4px) solid var(--oro); outline-offset:-2px;
  box-shadow:0 0 0 1px rgba(255,209,102,.35), 0 0 18px rgba(255,209,102,.35)}
.rullo.bloccato .fermo{opacity:1; font-weight:700}
/* Il velo: dice «questo l'ho tenuto io» anche con la coda dell'occhio. */
.rullo.bloccato::before{content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(180deg, rgba(255,209,102,.16), rgba(255,209,102,.04));
  animation:none}
.rullo.bloccato::after{content:""; position:absolute;
  right:clamp(4px,2.6cqi,9px); top:clamp(4px,2.6cqi,9px);
  width:clamp(10px,6cqi,16px); height:clamp(10px,6cqi,16px);
  border-radius:50%; background:var(--oro);
  border:2px solid rgba(11,13,18,.75);
  box-shadow:0 0 12px var(--oro); animation:puntina 1.8s ease-in-out infinite}
@keyframes puntina{0%,100%{opacity:.7; transform:scale(.94)} 50%{opacity:1; transform:none}}

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

/**
 * ⚠ **Il biglietto perdente.**
 *
 * Chiesto il 10 settembre 2026: «i prompt buttati... l'utente lo vede come
 * perdente». Non e' una figurina piu' spenta: e' un'altra cosa, e si vede in
 * un colpo d'occhio — grigia, sbarrata di traverso, col timbro sopra. Il
 * perche' resta scritto sotto: un no che non spiega non insegna niente.
 */
.figurina.perdente{opacity:.72; border-style:dashed; border-color:#4a3038;
  background:repeating-linear-gradient(135deg,
    rgba(18,20,28,.9) 0 12px, rgba(30,20,24,.9) 12px 24px)}
.figurina.perdente .titolo, .figurina.perdente .testo{color:#8d8794}
.figurina.perdente .timbro{position:absolute; right:-34px; top:13px;
  transform:rotate(28deg); padding:3px 40px; font-size:11px; font-weight:800;
  letter-spacing:2px; text-transform:uppercase; color:#ff8fa3;
  border-top:1px solid #7a3345; border-bottom:1px solid #7a3345;
  background:rgba(90,20,35,.35)}

/* Un cassetto chiuso: quello che c'e' ma non si deve guardare per primo. */
.cassetto{margin:14px 0; border:1px solid var(--riga); border-radius:12px;
  background:rgba(14,16,22,.6)}
.cassetto summary{padding:11px 13px; cursor:pointer; color:var(--spento);
  font-size:13px; font-weight:600; list-style:none}
.cassetto summary::-webkit-details-marker{display:none}
.cassetto summary::before{content:"+ "; color:var(--oro)}
.cassetto[open] summary::before{content:"- "}
.cassetto .quanti{margin-left:6px; color:var(--oro)}
.cassetto > div{padding:0 11px 11px}

/* Il tasto per copiare un prompt: piccolo, sotto al testo. */
.figurina .copia-uno{margin-top:8px; padding:7px 12px; font-size:12px}

.pastiglia{display:inline-block; padding:2px 9px; border-radius:999px; font-size:11px;
  font-weight:700; border:1px solid currentColor}
.riga-tasti{display:flex; gap:8px; margin-top:9px; flex-wrap:wrap}
.conto{margin-top:8px; font-size:12px; color:var(--spento)}
.conto b{color:var(--oro)}
.riga-tasti input{flex:1; min-width:110px; padding:9px 10px; border-radius:10px;
  border:1px solid var(--riga); background:rgba(9,11,16,.8); color:var(--testo)}
.gradi-scelta{display:flex; flex-wrap:wrap; gap:5px; margin-top:8px}
.gradi-scelta button{padding:5px 10px; border-radius:999px; font-size:11.5px; font-weight:700;
  border:1px solid currentColor; background:transparent; cursor:pointer}
.gradi-scelta button.scelto{color:#0b0d12!important}

/**
 * ⚠ **I tagli.** Chiesto il 10 settembre 2026: «pulsanti da 2 a 500, oppure
 * personalizzato». Sono larghi da toccare col pollice e stanno su due righe su
 * un telefono: otto tasti in fila su uno schermo stretto diventano otto
 * francobolli, e si sbaglia sempre quello accanto.
 */
.tagli{display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:9px}
@media (min-width:560px){ .tagli{grid-template-columns:repeat(8,1fr)} }
.tagli button{padding:10px 4px; border-radius:10px; font-size:12.5px; font-weight:700;
  border:1px solid var(--riga); background:rgba(9,11,16,.7); color:var(--testo);
  cursor:pointer; font-variant-numeric:tabular-nums;
  transition:transform .1s ease, border-color .15s ease}
.tagli button:active{transform:translateY(1px)}
.tagli button.scelto{border-color:var(--oro); color:#0b0d12;
  background:linear-gradient(180deg,#ffe1a0,#e5b64f)}

/* Una persona a cui mandare lire. */
.persona{padding:11px 12px; border-radius:13px; border:1px solid var(--riga);
  background:rgba(18,20,28,.85); margin-bottom:8px}
.persona .testa{display:flex; align-items:baseline; gap:8px; flex-wrap:wrap}
.persona .testa small{color:var(--spento); font-size:12px}

/* Quello che si e' scelto di attaccare, prima di prenderla. */
.attaccata{display:flex; align-items:center; gap:9px; margin-top:9px}
.attaccata img{width:64px; height:64px; object-fit:cover; border-radius:9px;
  border:1px solid var(--riga)}

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

/* ------------------------------------------------------------- il livello */
.livello{display:flex; align-items:center; gap:7px; padding:5px 11px 5px 7px;
  border-radius:999px; border:1px solid var(--riga); background:rgba(18,20,28,.8);
  color:var(--testo); cursor:pointer}
.livello .numero{display:grid; place-items:center; width:23px; height:23px; border-radius:50%;
  background:var(--luce); color:#0b0d12; font-weight:800; font-size:12px;
  transition:background 700ms ease}
.livello .barra{display:block; width:52px; height:6px; border-radius:999px;
  background:rgba(255,255,255,.1); overflow:hidden}
.livello .barra .dentro{display:block; height:100%; width:0%; border-radius:999px;
  background:var(--luce); transition:width .5s ease, background 700ms ease}
.livello.su{animation:soldi-su .6s ease}

/* --------------------------------------------------------------- lo shop */
/* La forma e' quella del DigiPrint che ha passato Cammo il 10 settembre 2026:
   griglia di schede, nastro in alto a sinistra, copertina grande, prezzo in
   basso col tasto. Cambiati i colori, che li' erano di quel sito e qui sono
   quelli del grado. */
.vetrina-testa{display:flex; align-items:center; justify-content:space-between;
  gap:14px; flex-wrap:wrap; margin-top:2px}
.vetrina-testa h2{margin:0}
.spiegone{margin:0 0 14px; color:var(--spento); font-size:13px; max-width:640px}

.prodotti{display:grid; grid-template-columns:repeat(2,1fr); gap:12px}
@media (min-width:700px){ .prodotti{grid-template-columns:repeat(3,1fr)} }
@media (min-width:980px){ .prodotti{grid-template-columns:repeat(4,1fr)} }

.prodotto{position:relative; border-radius:18px; overflow:hidden;
  background:linear-gradient(180deg,rgba(23,26,36,.95),rgba(16,18,25,.95));
  border:1px solid var(--riga); transition:transform .2s ease, box-shadow .3s ease,
  border-color .2s ease}
.prodotto:hover{transform:translateY(-4px); border-color:var(--g);
  box-shadow:0 18px 46px color-mix(in srgb, var(--g) 22%, transparent)}
.prodotto .nastro{position:absolute; top:10px; left:10px; z-index:3; padding:5px 9px;
  border-radius:8px; font-size:10.5px; font-weight:800; text-transform:uppercase;
  letter-spacing:.06em; background:var(--g); color:#12131a}
.prodotto .mia{position:absolute; top:10px; right:10px; z-index:3; padding:5px 9px;
  border-radius:8px; font-size:10.5px; font-weight:800; background:rgba(8,9,13,.8);
  border:1px solid var(--g); color:var(--g)}
.prodotto .copertina{height:150px; display:grid; place-items:center; font-size:46px;
  position:relative; background:
    radial-gradient(120% 100% at 30% 0%, color-mix(in srgb, var(--g) 45%, transparent), transparent 70%),
    linear-gradient(160deg,#1d2130,#12141c)}
.prodotto .copertina img{width:100%; height:100%; object-fit:cover; display:block}
.prodotto .corpo{padding:13px}
.prodotto h3{margin:0 0 5px; font-size:15px; line-height:1.25; overflow-wrap:anywhere}
.prodotto .riga{font-size:11.5px; color:var(--spento)}
.prodotto .fondo{display:flex; align-items:center; justify-content:space-between;
  gap:9px; margin-top:13px}
.prodotto .costa{font-size:18px; font-weight:800; color:var(--oro);
  font-variant-numeric:tabular-nums; white-space:nowrap}
.prodotto .prendi{border:0; padding:9px 12px; border-radius:10px; color:#12131a;
  background:var(--g); font-weight:800; cursor:pointer}
.prodotto .prendi:disabled{opacity:.45; cursor:default}

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

/**
 * ⚠ **La galleria da cui si sceglie cosa attaccare.**
 *
 * Chiesto il 10 settembre 2026: «lincare facilmente, non come ora, l'immagine
 * dalla suite». Copre tutto perche' e' una cosa sola da fare: si guarda, si
 * tocca, si torna indietro. I riquadri sono quadrati e ritagliati — una
 * griglia di foto con proporzioni diverse non si scorre con l'occhio.
 */
.foglio{position:fixed; inset:0; z-index:45; display:flex; flex-direction:column;
  background:rgba(8,9,13,.97); backdrop-filter:blur(6px)}
.foglio-testa{display:flex; align-items:center; gap:10px; padding:12px 14px;
  border-bottom:1px solid var(--riga)}
.foglio-testa b{flex:1}
/* «align-content:start» perche' con tre foto sole le righe si spartivano tutta
   l'altezza del foglio e ne uscivano tre colonne lunghe un metro. */
.griglia-libreria{flex:1; overflow-y:auto; display:grid; gap:8px; padding:12px 14px 28px;
  grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); align-content:start}
.griglia-libreria .voce{padding:0; border:1px solid var(--riga); border-radius:11px;
  background:rgba(18,20,28,.85); color:var(--testo); cursor:pointer; overflow:hidden;
  display:flex; flex-direction:column}
.griglia-libreria .voce:active{transform:scale(.97)}
.griglia-libreria .voce img{width:100%; aspect-ratio:1; object-fit:cover; display:block}
.griglia-libreria .voce .senza{display:flex; align-items:center; justify-content:center;
  aspect-ratio:1; font-size:11px; color:var(--spento)}
.griglia-libreria .voce small{padding:6px 7px; font-size:11px; color:var(--spento);
  text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}

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
