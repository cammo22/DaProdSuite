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
/* ⚠ Il saldo su una riga. Su un telefono stretto «L. 495 giro L. 10» andava a
   capo in tre righe e la testata diventava alta il doppio: il numero e' la cosa
   piu' guardata della pagina e non deve mai essere una colonna. */
.saldo{white-space:nowrap;
  display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px;
  background:linear-gradient(180deg,#1d1a10,#151209); border:1px solid #3a3115;
  color:var(--oro); font-variant-numeric:tabular-nums; font-weight:700; cursor:pointer;
  transition:transform .18s ease}
.saldo small{color:var(--spento); font-weight:500}
/* Sotto ai quattrocento pixel quanto costa un giro si legge sulla slot: qui
   sta il saldo, e basta. */
@media (max-width:400px){ .saldo small{display:none} }
.saldo.su{animation:soldi-su .55s ease}
@keyframes soldi-su{
  0%{transform:scale(1)} 30%{transform:scale(1.18); box-shadow:0 0 22px rgba(255,209,102,.55)}
  100%{transform:scale(1)}
}

/* ------------------------------------------------------------- la pancia */
/**
 * ⚠ **La slot sta in una schermata, e non si scorre.**
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
 * ⚠ **Dodici pezzi, una schermata, nessuno scorrimento.**
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
 * ⚠ **Su una carta stretta spariscono**, e non e' una perdita: in tre
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
/* La puntina e' un nodo vero: vedi «disegnaRulli» nel copione, e il perche'. */
.rullo .puntina{position:absolute; z-index:3;
  right:clamp(4px,2.6cqi,9px); top:clamp(4px,2.6cqi,9px);
  width:clamp(10px,6cqi,16px); height:clamp(10px,6cqi,16px);
  border-radius:50%; background:var(--oro);
  border:2px solid rgba(11,13,18,.75);
  box-shadow:0 0 12px var(--oro); opacity:0; transform:scale(.4);
  transition:opacity .15s ease, transform .15s ease}
.rullo.bloccato .puntina{opacity:1; transform:none;
  animation:puntina 1.8s ease-in-out infinite}
@keyframes puntina{0%,100%{opacity:.7; transform:scale(.94)} 50%{opacity:1; transform:none}}

/**
 * ⚠ **Fuoco 4 e 5**: Epic e Legendary, poi Mythic ed Ethernal.
 *
 * Chiesto il 10 settembre 2026: «facciamo i gradi da celestial in su molto piu'
 * potenti, come gradi e come anteprime, molto piu' articolate». Prima i cinque
 * gradi piu' alti erano tutti «fuoco 3» e facevano la stessa scena: in un gioco
 * di rarita' la scena **e'** il premio, e uno che tira un Mythic non deve
 * vedere quello che ha gia' visto con un Epic.
 *
 * Ognuno aggiunge a quello sotto: il quattro respira piu' forte e si alza dalla
 * griglia, il cinque ha un anello che gira attorno e non sta mai fermo.
 */
.rullo.f4{border-color:var(--g); transform:translateY(-2px);
  box-shadow:0 0 34px color-mix(in srgb, var(--g) 65%, transparent),
             0 8px 22px rgba(0,0,0,.5),
             inset 0 0 30px color-mix(in srgb, var(--g) 18%, transparent);
  animation:respira 1.8s ease-in-out infinite}
.rullo.f5{border-color:#fff; transform:translateY(-3px) scale(1.015);
  box-shadow:0 0 46px color-mix(in srgb, var(--g) 85%, transparent),
             0 0 90px color-mix(in srgb, var(--g) 45%, transparent),
             inset 0 0 34px color-mix(in srgb, var(--g) 26%, transparent);
  animation:respira 1.3s ease-in-out infinite}
/**
 * L'anello che gira: solo sul cinque, e solo uno per carta.
 *
 * Sfocato e tenuto basso apposta. La prima versione era un ventaglio netto e ci
 * si perdeva dentro il nome del pezzo — che e' l'unica cosa che serve a decidere
 * se bloccarlo. Una carta che luccica e non si legge e' una carta rotta, anche
 * se e' un Mythic. Sfocato resta un raggio di luce che passa, e sotto si legge.
 */
.rullo.f5::after{content:""; position:absolute; inset:-30%; pointer-events:none; z-index:-1;
  opacity:.32; filter:blur(9px);
  background:conic-gradient(from 0deg, transparent 0 72%,
    color-mix(in srgb, var(--g) 65%, transparent) 82%, transparent 90% 100%);
  animation:gira 3.2s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}

/* Il luccichio che passa sopra alla roba grossa. */
/**
 * ⚠ **Il luccichio passa SOTTO alle scritte, non sopra.**
 *
 * Con lo z-index sopra, la banda di luce attraversava il nome del pezzo e per
 * mezzo secondo non si leggeva piu' niente. Su una carta che uno sta guardando
 * per decidere se tenerla, e' esattamente il momento sbagliato. Visto il 10
 * settembre 2026 sui gradi nuovi.
 *
 * ⚠ **Si abbassa il luccichio, non si alza il testo.** Il primo tentativo
 * era «position:relative; z-index:1» su tutti i figli della carta, e ha rotto
 * il disegno: la barretta del grado e la scritta «fermo» sono in
 * «position:absolute», e quella riga gliela ribaltava — tornavano nel flusso,
 * la barretta tagliava il nome a meta' e «fermo» si prendeva una riga sua.
 *
 * Uno «z-index» negativo fa la stessa cosa senza toccare nessun figlio: un
 * pseudo-elemento negativo si disegna **sopra allo sfondo della carta e sotto
 * al suo contenuto**, che e' esattamente dove deve stare un riflesso.
 */
.rullo.f3::before, .rullo.f4::before, .rullo.f5::before{content:""; position:absolute; inset:0;
  pointer-events:none; z-index:-1;
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
/**
 * ⚠ **Il tasto che svuota un portafoglio si vede che e' quello.**
 *
 * Rosso spento, non rosso acceso: sta in un pannello dove tutti gli altri tasti
 * danno, e questo toglie. Se fosse grigio come «azzera il taglio» — che sta due
 * righe sopra e fa una cosa innocua — si premerebbe per sbaglio; se fosse rosso
 * pieno sembrerebbe il tasto principale della scheda, che non e'.
 */
.btn.brutto{background:transparent; border-color:#5c2530; color:#ff8d9c}
.btn.brutto:not(:disabled):hover{background:#2a1116}

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

/**
 * ⚠ **Tenere premuto apre grande, e basta quello.**
 *
 * Chiesto il 10 settembre 2026: «quando da mobile tengo premuto per zoommare
 * la card mi triggera il copia che seleziona il testo, evitiamo».
 *
 * Sul telefono mezzo secondo di dito e' **due gesti in uno**: il nostro, che
 * apre la carta grande, e quello del sistema, che seleziona il testo e tira su
 * le maniglie blu col fumetto «Copia». Partivano tutti e due, e quello che non
 * volevi restava li' anche dopo.
 *
 * Il menu del tasto destro era gia' spento da un po' (il «contextmenu» nel
 * copione), ma la selezione col dito e' un'altra strada e non passa di li':
 * si spegne con questa, ed e' l'unica che la spegne davvero.
 *
 * ⚠ **Il testo non diventa irraggiungibile**: il tasto «copia in inglese» sta
 * sotto a ogni prompt, e prende tutta la riga invece del pezzo che ti riesce
 * di selezionare con un dito su uno schermo da sei pollici.
 */
.rullo, .prompt, .figurina{
  -webkit-touch-callout:none; -webkit-user-select:none; user-select:none}
/* La casella dove si scrive resta una casella: li' si seleziona come sempre. */
.figurina input, .figurina textarea{-webkit-user-select:text; user-select:text}

/* ------------------------------------------------------------ le schede */
.figurina{position:relative; padding:11px 12px; border-radius:13px;
  background:rgba(18,20,28,.85); border:1px solid var(--riga); margin-bottom:8px;
  overflow:hidden}
.figurina.f2{border-color:color-mix(in srgb, var(--g) 60%, var(--riga))}
.figurina.f3{border-color:var(--g);
  box-shadow:0 0 22px color-mix(in srgb, var(--g) 28%, transparent)}
.figurina.f4{border-color:var(--g);
  box-shadow:0 0 30px color-mix(in srgb, var(--g) 45%, transparent),
             inset 0 0 24px color-mix(in srgb, var(--g) 10%, transparent)}
/* Il cinque ha il bordo bianco e l'alone del suo colore: da lontano si vede
   che quella scheda non e' come le altre, che e' tutto il punto. */
.figurina.f5{border-color:#fff;
  box-shadow:0 0 40px color-mix(in srgb, var(--g) 70%, transparent),
             0 0 80px color-mix(in srgb, var(--g) 30%, transparent),
             inset 0 0 28px color-mix(in srgb, var(--g) 14%, transparent)}
/**
 * ⚠ **La testa della carta: il grado, e si vede da un metro.**
 *
 * Chiesto il 10 settembre 2026: «il colore del grado piu' evidente, scritte
 * piu' grandi senza esagerare, ottimizza ulteriormente la schermata».
 *
 * La pastiglia e' **piena** del colore del grado con la scritta scura sopra,
 * non testo colorato su fondo scuro: i dodici colori sono tutti chiari — dal
 * grigio del Basic al bianco azzurrato dell'Ethernal — e su nero un testo
 * colorato di dodici pixel si legge, ma non si **riconosce**. Pieno si',
 * anche di sguincio e senza leggere.
 *
 * «Senza esagerare» e' una misura, e vale la pena scriverla: il titolo passa
 * da 15 a 16 pixel e la pastiglia sta a 12,5 in grassetto. Quello che fa la
 * differenza non e' la dimensione, e' aver tolto le altre quattro cose che
 * stavano sulla stessa riga con la stessa importanza.
 */
.figurina .testa{display:flex; flex-wrap:wrap; align-items:center; gap:6px;
  margin-bottom:6px}
/**
 * ⚠ La pastiglia del grado sta qui e **non** dentro «.figurina», perche' lo
 * stesso grado si legge anche in classifica: due regole diverse per la stessa
 * cosa sono due cose che un giorno divergono.
 */
.grado{display:inline-block; background:var(--g); color:#0b0d12; font-weight:800;
  font-size:12.5px; letter-spacing:.3px; padding:3px 10px; border-radius:999px;
  line-height:1.35; white-space:nowrap;
  box-shadow:0 0 14px color-mix(in srgb, var(--g) 35%, transparent)}
.figurina .quanto{font-weight:700; font-size:13px; color:#e7eaf3}
.figurina .enne{font-size:11.5px; color:var(--spento)}
.figurina .stato{font-size:11px; color:var(--spento); border:1px solid var(--riga);
  padding:2px 8px; border-radius:999px; margin-left:auto}
.figurina .titolo{font-weight:700; font-size:16px; line-height:1.28;
  overflow-wrap:anywhere}
.figurina .sotto{margin-top:4px; font-size:12px; color:var(--spento)}
/**
 * ⚠ **L'esito, detto in una riga.** Chiesto il 10 settembre 2026: «in Mie un
 * utente normale vede solo l'esito». Sta sopra al titolo perche' e' la
 * domanda per cui si apre quella pagina — non «cosa avevo scritto», ma
 * «l'hanno presa».
 */
.figurina .esito{margin:2px 0 6px; font-size:13.5px; color:var(--spento)}
.figurina .esito b{color:var(--oro)}
.figurina .esito.bene{color:#7fd1a8}
.figurina .esito.male{color:#ff8d9c}

/**
 * ⚠ **I tre numeri di chi gioca**, in cima alla propria pagina.
 *
 * In fila e non in colonna: sono tre cose piccole che si leggono insieme —
 * «quanto ho guadagnato, quante me ne hanno prese, quante buttate» — e in
 * colonna diventerebbero mezza schermata prima di arrivare alle carte.
 */
.conta-mie{display:flex; gap:8px; margin:12px 0 4px; flex-wrap:wrap}
.conta-mie .pezzo{flex:1 1 84px; padding:9px 11px; border-radius:12px;
  background:rgba(14,16,22,.7); border:1px solid var(--riga);
  display:flex; flex-direction:column; gap:2px}
.conta-mie .pezzo b{font-size:17px; font-variant-numeric:tabular-nums}
.conta-mie .pezzo small{font-size:11px; color:var(--spento)}
.conta-mie .oro b{color:var(--oro)}
.conta-mie .bene b{color:#7fd1a8}
.conta-mie .male b{color:#ff8d9c}

/* Il perche' di un no: su una riga sua, che e' quello che si e' venuti a leggere. */
.figurina .perche{margin-top:6px; font-size:12.5px; color:#c8bfcb;
  border-left:2px solid #4a3038; padding-left:8px; overflow-wrap:anywhere}
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
/* Su un biglietto perdente il grado non e' un premio: si spegne come il resto. */
.figurina.perdente .grado{background:#4a3038; color:#c4b8c0; box-shadow:none}
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
/* La casella del cerca sta dentro al cassetto della gente: si allinea al resto. */
.cassetto > input.cerca{width:calc(100% - 22px); margin:0 11px 9px}

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

/**
 * ⚠ **Le cose nate dal prompt, una accanto all'altra.**
 *
 * Chiesto il 10 settembre 2026: «puo' rigenerare, max 4 file, e alla fine puo'
 * selezionare uno o piu' elementi generati da includere nel pacchetto».
 *
 * **In fila e non incolonnate**, ed e' il punto di tutto: il senso di generare
 * quattro volte e' poterle **confrontare**, e due immagini una sotto l'altra a
 * uno schermo di distanza non si confrontano. Quattro da centoventi pixel ci
 * stanno su un telefono, e a quella misura si capisce gia' quale tiene.
 *
 * La cornice accesa dice quale si tiene: e' l'unica cosa che si deve leggere
 * senza avvicinarsi.
 */
.prove{margin-top:9px}
.nate{display:flex; gap:8px; margin-top:9px; overflow-x:auto;
  padding-bottom:4px; scrollbar-width:thin}
.nata{flex:0 0 auto; width:124px; display:flex; flex-direction:column; gap:6px;
  padding:6px; border-radius:11px; background:rgba(9,11,16,.6);
  border:1px solid var(--riga); transition:border-color .18s ease}
.nata img{width:110px; height:110px; object-fit:cover; border-radius:8px;
  display:block}
/* ⚠ Un brano non sta piu' qui dentro: vedi «.brano». Centodieci pixel di
   lettore sono un tasto play che non si preme (12 settembre 2026). */
.nata .senza{display:flex; align-items:center; justify-content:center;
  width:110px; height:110px; border-radius:8px; border:1px dashed var(--riga);
  font-size:10px; color:var(--spento); text-align:center; padding:4px}
.nata small{color:var(--spento); font-size:11px; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis}
.nata .tienila{padding:6px 8px; font-size:11.5px; width:100%}
.nata.tenuta{border-color:var(--oro);
  box-shadow:0 0 16px color-mix(in srgb, var(--oro) 26%, transparent)}
.nata.tenuta .tienila{background:var(--oro); color:#141414; font-weight:700}

/* «Sto generando»: una riga che respira, per dire che non e' bloccato. */
.conto.attesa{color:var(--oro); animation:respira 1.8s ease-in-out infinite}
@keyframes respira{0%,100%{opacity:.55} 50%{opacity:1}}

table{width:100%; border-collapse:collapse; font-size:13.5px}
th{text-align:left; font-weight:600; color:var(--spento); font-size:11.5px;
  text-transform:uppercase; letter-spacing:.4px; padding:6px 8px}
td{padding:9px 8px; border-top:1px solid var(--riga); font-variant-numeric:tabular-nums}
tr.io td{background:rgba(255,209,102,.07)}

.niente{padding:22px 12px; text-align:center; color:var(--spento)}

/* ---------------------------------------------------------- le linguette */
/* ⚠ Otto tasti non ci stanno su un telefono stretto: la barra scorre di lato
   invece di schiacciarli (11 settembre 2026, vedi il markup). */
nav{position:fixed; left:0; right:0; bottom:0; z-index:30; display:flex;
  background:rgba(8,9,13,.94); backdrop-filter:blur(10px); border-top:1px solid var(--riga);
  padding-bottom:env(safe-area-inset-bottom); overflow-x:auto; scrollbar-width:none}
nav::-webkit-scrollbar{display:none}
nav button{flex:1 0 auto; padding:11px 10px 13px; border:0; background:transparent;
  color:var(--spento); font-size:11.5px; font-weight:600; cursor:pointer;
  white-space:nowrap; transition:color .2s ease}
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
 * ⚠ **Il pannello grande quando dentro c'e' una cosa, non delle parole.**
 *
 * Chiesto il 10 settembre 2026: «le anteprime, se ci clicco me le fa
 * selezionare ma non le posso aprire grandi». Il pannello era nato per i
 * prompt e sapeva mostrare solo testo.
 *
 * L'immagine si prende tutto lo schermo **senza essere tagliata**
 * («contain», non «cover»): qui non si sta facendo una griglia bella, si sta
 * guardando se quella generazione vale il prezzo di una figurina, e una foto
 * ritagliata per stare in un quadrato e' proprio quello che non serve.
 */
.grande.guarda .dentro{max-width:min(96vw,1200px); width:100%}
.grande.guarda img, .grande.guarda video{display:block; margin:0 auto;
  max-width:100%; max-height:78vh; object-fit:contain; border-radius:12px}
.grande.guarda audio{width:min(92vw,520px)}
.grande.guarda .su{margin-top:14px}
.grande.guarda .chiudi{margin-top:14px}

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
/**
 * ⚠ **E una riga e' alta quanto quello che ha dentro, sempre.** Detto l'11
 * settembre 2026: «le immagini sono sempre una sopra l'altra, anche in Tutto;
 * solo in Brani e' come me l'aspetto».
 *
 * Il difetto era il contrario di quello qui sopra. Il foglio e' alto quanto lo
 * schermo, e le caselle hanno «overflow:hidden» per gli angoli tondi: per il
 * browser una casella cosi' si puo' stringere **fino a zero**. Con sessanta foto
 * le righe si schiacciavano per starci tutte — ottantadue pixel per caselle da
 * centoventi — e le caselle, rimaste alte uguale, finivano una sopra l'altra.
 * Coi brani non si vedeva perche' sono tre, e ci stanno. Nel banco di prova
 * nemmeno, finche' c'erano sei quadrati: ci stavano anche loro.
 *
 * «max-content» dice che una riga non si stringe mai sotto al suo contenuto:
 * se non ci sta, il foglio scorre, che e' quello che deve fare.
 */
.griglia-libreria{flex:1; overflow-y:auto; display:grid; gap:8px; padding:12px 14px 28px;
  grid-template-columns:repeat(auto-fill, minmax(112px, 1fr));
  grid-auto-rows:max-content; align-content:start; align-items:start}
/**
 * ⚠ **I titoletti dentro la griglia: «Immagini», «Brani», «Video».**
 *
 * Chiesto il 12 settembre 2026: «ancora non sono divise bene quando voglio
 * aggiungere dalla suite». Prendono tutta la riga — se no finiscono in una
 * colonna come fossero una foto — e restano appiccicati in cima mentre si
 * scorre, cosi' si sa sempre in che mucchio si sta guardando.
 */
.griglia-libreria .gruppo{grid-column:1 / -1; position:sticky; top:-12px;
  z-index:2; margin:6px 0 -2px; padding:7px 2px; font-size:11px; font-weight:800;
  letter-spacing:1px; text-transform:uppercase; color:var(--spento);
  background:rgba(8,9,13,.97)}
.griglia-libreria .gruppo:first-child{margin-top:0}
.griglia-libreria .gruppo em{font-style:normal; color:var(--riga2, #4a4f63);
  font-weight:600; letter-spacing:0; text-transform:none; margin-left:6px}
/* I tasti che scelgono il mucchio, e il cerca: fermi in cima, non scorrono. */
.foglio > .fila-scelte{margin:10px 14px 6px; flex:0 0 auto}
.foglio > .cerca{margin:0 14px 8px; width:calc(100% - 28px); flex:0 0 auto}
.griglia-libreria .voce{padding:0; border:1px solid var(--riga); border-radius:11px;
  background:rgba(18,20,28,.85); color:var(--testo); cursor:pointer; overflow:hidden;
  display:flex; flex-direction:column}
.griglia-libreria .voce:active{transform:scale(.97)}
/**
 * ⚠ **L'anteprima non si lascia schiacciare.** Visto dentro la suite sul
 * telefono il 10 settembre 2026: «le anteprime dei contenuti sono troppo
 * sottili» — erano strisce alte cinquanta pixel, e di una foto si vedeva una
 * fetta orizzontale in mezzo. Da li' non si riconosce niente, e questa
 * schermata serve a una cosa sola: riconoscere.
 *
 * Il difetto era che l'altezza veniva solo da «aspect-ratio», e l'immagine sta
 * dentro una colonna flex: se la casella e' piu' bassa del contenuto, un
 * elemento flex **si stringe** e l'aspect-ratio non lo difende. Adesso ci sono
 * tutte e tre le cose che servono:
 *
 * - «flex:0 0 auto», cosi' non si stringe;
 * - «min-height», che e' il pavimento sotto cui non si scende comunque;
 * - «aspect-ratio», che da' la proporzione quando c'e' spazio.
 *
 * E i riquadri partono da centododici pixel invece che da novantasei: su un
 * telefono vuol dire tre colonne larghe invece di quattro strette.
 */
.griglia-libreria .voce img,
.griglia-libreria .voce .senza{width:100%; flex:0 0 auto; display:block;
  aspect-ratio:4/3; min-height:96px; object-fit:cover}
.griglia-libreria .voce .senza{display:flex; align-items:center;
  justify-content:center; font-size:11px; color:var(--spento); text-align:center}
.griglia-libreria .voce small{padding:6px 7px; font-size:11px; color:var(--spento);
  text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}

/**
 * ⚠ **I raggi dietro alla sala**, dall'Epic in su.
 *
 * Un disegno solo — un ventaglio a spicchi che gira — e non venti nodi: quello
 * che deve succedere e' che la sala **cambi**, non che il telefono si scaldi.
 * Sta dietro a tutto («z-index» basso) e non si puo' toccare.
 */
.raggi{position:fixed; inset:-50%; z-index:1; pointer-events:none; opacity:.55;
  background:repeating-conic-gradient(from 0deg,
    color-mix(in srgb, var(--g) 55%, transparent) 0deg 6deg, transparent 6deg 18deg);
  animation:giraRaggi 9s linear infinite, entraRaggi .5s ease;
  transition:opacity .5s ease}
.raggi.via{opacity:0}
@keyframes giraRaggi{to{transform:rotate(360deg)}}
@keyframes entraRaggi{from{opacity:0} to{opacity:.55}}

/**
 * Il pannello che chiede una cosa. Sostituisce «prompt» del browser, che
 * dentro la suite sul PC non esiste e sul telefono e' il riquadro grigio del
 * sistema — vedi «chiediQualcosa» nel copione.
 */
.chiede{position:fixed; inset:0; z-index:60; display:flex; align-items:center;
  justify-content:center; padding:18px; background:rgba(4,5,8,.72);
  backdrop-filter:blur(4px); animation:entra .18s ease}
.chiede .dentro{width:100%; max-width:440px; padding:18px; border-radius:16px;
  background:#141821; border:1px solid var(--riga); box-shadow:0 24px 60px rgba(0,0,0,.6);
  display:flex; flex-direction:column; gap:9px}
.chiede small{color:var(--spento); font-size:12.5px; line-height:1.35}
/* Una figurina dell'inventario aperta dentro al pannello: se e' lunga, scorre
   dentro, e il tasto «chiudi» resta raggiungibile. */
.chiede .dentro{max-height:88vh; overflow-y:auto}
.chiede .dentro .figurina{margin-bottom:0}
.chiede input, .chiede textarea{width:100%; padding:11px 12px; border-radius:11px;
  border:1px solid var(--riga); background:rgba(9,11,16,.8); color:var(--testo);
  font:inherit; font-size:15px; resize:vertical}

/* Il cerca fra la gente: una riga, larga quanto la scheda. */
.cerca{width:100%; margin:2px 0 10px; padding:11px 13px; border-radius:12px;
  border:1px solid var(--riga); background:rgba(9,11,16,.8); color:var(--testo);
  font:inherit; font-size:14px}

/* Senza copertina: si dice, invece di lasciare un buco. */
.attaccata .senzafaccia{display:flex; align-items:center; justify-content:center;
  width:64px; height:64px; border-radius:9px; border:1px dashed var(--riga);
  font-size:10px; color:var(--spento); text-align:center; padding:4px}
.attaccata small{flex:1; min-width:0; color:var(--spento); font-size:12px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}

/* ------------------------------------------------------------- l'avviso */
.avviso{position:fixed; left:50%; bottom:78px; transform:translateX(-50%);
  max-width:88%; padding:10px 16px; border-radius:12px; background:#1b1f2b;
  border:1px solid var(--riga); box-shadow:0 12px 34px rgba(0,0,0,.55);
  font-size:13.5px; z-index:40; animation:sale .28s ease}
@keyframes sale{from{opacity:0; transform:translateX(-50%) translateY(10px)}
  to{opacity:1; transform:translateX(-50%)}}
.avviso.male{border-color:#5c2530; color:#ffd7dc}
.avviso.bene{border-color:#2b6b49; color:#d8ffe9}

/* --------------------------------------------------------- la macchinetta */

/**
 * ⚠ **La seconda slot: nove caselle, tre file da tre.**
 *
 * Chiesta il 12 settembre 2026 con due file, la terza l'11. La griglia e'
 * **sempre tre per riga**, su ogni schermo: e' la forma della macchina, non un
 * impaginato che si adatta. Quattro per riga vorrebbe dire che «la fila» non
 * e' piu' una fila, e la regola del gioco si legge guardando lo schermo.
 *
 * ⚠ **Larga al massimo come un telefono.** Le caselle sono quadrate, e su un
 * computer tre colonne a tutta pagina fanno caselle da quattrocento pixel: tre
 * file erano un metro e mezzo di macchina da scorrere.
 */
.macchina{max-width:520px; margin:0 auto}
/* ⚠ Il secondo tiro si riconosce da lontano (11 settembre 2026 sera: «indichiamo
   bene anche quando c'e' il secondo giro»): i due tiri scritti sopra, il bordo
   d'oro che respira, e il tasto d'oro. */
.tiri{display:flex; justify-content:center; gap:8px; margin:0 0 8px; font-size:12px;
  letter-spacing:.03em}
.tiri span,.tiri b{padding:4px 12px; border-radius:999px; border:1px solid var(--riga);
  color:var(--spento); font-weight:600}
.tiri b{border-color:var(--oro); background:var(--oro); color:#141414; font-weight:800}
.macchina.secondo .vetrina-macchina{border-color:var(--oro);
  animation:secondoTiro 1.6s ease-in-out infinite}
@keyframes secondoTiro{0%,100%{box-shadow:0 0 0 rgba(255,209,102,0)}
  50%{box-shadow:0 0 24px rgba(255,209,102,.5)}}
.macchina.secondo #tira{background:var(--oro); color:#141414}
.vetrina-macchina{display:grid; grid-template-columns:repeat(3,1fr); gap:7px;
  padding:10px; border-radius:16px; border:1px solid var(--riga);
  background:linear-gradient(180deg, rgba(10,12,18,.9), rgba(16,10,22,.9));
  box-shadow:inset 0 0 40px rgba(0,0,0,.6)}
.casella{position:relative; aspect-ratio:1; border-radius:12px; overflow:hidden;
  border:1px solid var(--riga); background:rgba(6,7,11,.9);
  display:flex; align-items:center; justify-content:center}
.casella img{width:100%; height:100%; object-fit:cover; display:block}
/* Il nome di chi l'ha inventata, sulla casella: vedi «.firma». */
.casella .chi{position:absolute; left:0; right:0; bottom:0; padding:3px 6px;
  font-size:9.5px; font-weight:700; letter-spacing:.2px; color:#fff;
  background:linear-gradient(180deg, transparent, rgba(0,0,0,.82));
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center}
/* Mentre gira: le figure scorrono e non si distinguono, come su un rullo vero. */
.casella.gira img{animation:scorre .28s linear infinite}
@keyframes scorre{0%{transform:translateY(-6%) scale(1.08)}
  100%{transform:translateY(6%) scale(1.08)}}
.casella.gira .chi{opacity:0}
/* La casella che ha fatto la fila: accesa del colore del suo grado. */
.casella.vince{border-color:var(--g); box-shadow:0 0 0 2px var(--g),
  0 0 22px color-mix(in srgb, var(--g) 55%, transparent); z-index:1}
.casella.vince::after{content:""; position:absolute; inset:0;
  background:color-mix(in srgb, var(--g) 16%, transparent)}
/* Sei uguali: si accende tutta la vetrina, non le singole caselle. */
.vetrina-macchina.pieno{border-color:var(--oro);
  box-shadow:0 0 0 2px var(--oro), 0 0 60px rgba(255,209,102,.45);
  animation:respira 1.2s ease-in-out 3}

/**
 * ⚠ **Le puntate sono tre tasti grossi, non un menu a tendina.**
 *
 * Cinquanta, cento, duecento: si sceglie col pollice senza guardare, e quello
 * scelto resta acceso. Un menu vorrebbe dire due gesti per cambiare puntata, e
 * la puntata si cambia in continuazione — e' meta' del gioco.
 */
.puntate{display:flex; gap:8px; margin:10px 0 2px}
.puntate button{flex:1; padding:12px 6px; border-radius:12px;
  border:1px solid var(--riga); background:rgba(18,20,28,.85); color:var(--testo);
  font:inherit; font-weight:700; font-size:14px; cursor:pointer;
  font-variant-numeric:tabular-nums}
.puntate button.scelto{border-color:var(--oro); background:var(--oro); color:#141414}

/* La tabellina dei premi: un grado per riga, col suo colore. */
.premi{display:grid; gap:4px; padding:4px 11px 12px}
.premi .riga{display:grid; grid-template-columns:1fr auto auto; gap:10px;
  align-items:center; font-size:12.5px; font-variant-numeric:tabular-nums}
.premi .riga b{font-weight:700}
.premi .riga span{color:var(--spento)}

/**
 * ⚠ **La firma: chi ha inventato quella cosa.**
 *
 * Chiesto il 12 settembre 2026: «evidenziamo meglio il nome di chi ha creato
 * quella combinazione, anche quando poi saranno sbloccabili nei pacchetti o
 * acquistabili nel negozio ci deve essere scritto chi lo ha creato
 * inizialmente».
 *
 * Prima era «di Tizio · tre ore fa», grigio, in fila con la data, della stessa
 * misura di tutto il resto: cioe' l'unica cosa che dice **di chi e' il
 * merito** era la piu' facile da saltare. Adesso e' una pastiglia con la
 * faccia dentro, e resta la stessa in tutti e quattro i posti dove una
 * figurina si vede — la fila, l'album, il pacchetto che si apre, il negozio.
 * Una firma che cambia faccia da una schermata all'altra non si riconosce.
 */
.firma{display:inline-flex; align-items:center; gap:6px; margin-top:5px;
  padding:4px 10px 4px 5px; border-radius:999px; max-width:100%;
  background:rgba(255,209,102,.13); border:1px solid rgba(255,209,102,.3)}
.firma .tondo{display:grid; place-items:center; width:19px; height:19px;
  border-radius:50%; background:var(--oro); color:#141414;
  font-size:10px; font-weight:800; flex:0 0 auto}
.firma .nome{font-size:12.5px; font-weight:700; color:var(--oro);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.firma .che{font-size:11px; color:var(--spento); flex:0 0 auto}

/**
 * ⚠ **Il lettore di un brano, e perche' ce n'e' uno.**
 *
 * Il difetto, detto il 12 settembre 2026: «le canzoni non si sentono». Non
 * erano rotte: il lettore stava dentro una casella da **centodieci pixel**,
 * in una striscia che scorre di fianco. Sotto ai duecento pixel il browser del
 * telefono butta via meta' dei comandi e il tasto play finisce fuori dalla
 * casella — c'era, ma non si poteva premere.
 *
 * Adesso un brano non e' un quadratino come gli altri: e' una riga larga
 * quanto la carta, con la copertina a sinistra e il lettore a destra, largo
 * abbastanza da avere i suoi comandi. Vale dappertutto — le prove, gli
 * attacchi, la figurina — perche' e' sempre lo stesso mestiere.
 */
.brano{display:flex; align-items:center; gap:10px; margin-top:8px; padding:8px;
  border-radius:12px; border:1px solid var(--riga); background:rgba(9,11,16,.6)}
.brano .copertina{width:54px; height:54px; border-radius:9px; object-fit:cover;
  flex:0 0 auto; display:block}
.brano .senza{display:grid; place-items:center; width:54px; height:54px;
  border-radius:9px; border:1px dashed var(--riga); flex:0 0 auto;
  font-size:19px; color:var(--spento)}
.brano .dentro{flex:1; min-width:0; display:flex; flex-direction:column; gap:5px}
.brano .come{font-size:12px; color:var(--spento); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis}
/* ⚠ Larghezza piena e mai sotto: e' tutto il punto di questo riquadro. */
.brano audio{width:100%; min-width:0; height:34px; display:block}
/* Dentro la striscia delle prove una riga-brano occupa il posto di due caselle. */
.nate .brano{flex:0 0 auto; width:min(260px, 74vw); margin-top:0}
/**
 * ⚠ **La casella che contiene un brano si allarga.** Senza questa riga il
 * lettore resta chiuso dentro i centoventiquattro pixel di «.nata», che e'
 * esattamente il difetto del 12 settembre 2026: il tasto play c'e' e non si
 * puo' premere.
 */
.nata.suona{width:min(292px, 80vw)}
.nata.suona .brano{width:100%; border:0; background:transparent; padding:0}

/* ------------------------------------------------------------ i pacchetti */
/**
 * ⚠ **Un pacchetto e' una bustina, non un tasto.** Dall'11 settembre 2026, con
 * «Album» che diventa «Pacchetti»: si tocca la bustina e si apre, e sotto c'e'
 * la barra di quante ne hai. La stagnola e il bordo seghettato sono quelli
 * delle figurine vere — la stessa bustina che poi si strappa col dito.
 */
.pacchi{display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px;
  margin-top:6px}
.pacco{position:relative; padding:10px; border-radius:16px; border:1px solid var(--riga);
  background:rgba(18,20,28,.85); display:flex; flex-direction:column; gap:8px;
  cursor:pointer; transition:transform .15s ease, border-color .2s ease}
.pacco:active{transform:scale(.98)}
.pacco.completo{border-color:var(--oro); box-shadow:0 0 18px rgba(255,209,102,.25)}
.pacco .quante{font-size:12px; color:var(--spento)}
.pacco .quante b{color:var(--testo)}
.pacco .btn{padding:9px 10px; font-size:13px}
.bustina{position:relative; aspect-ratio:3/4; border-radius:6px; overflow:hidden;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  padding:14px 8px; text-align:center; color:#191307;
  background:linear-gradient(135deg,#ffe29a 0%,#f6b73c 30%,#fff1c1 48%,#e39b2d 70%,#ffd66e 100%);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.35), 0 8px 22px rgba(0,0,0,.45)}
/* Il bordo seghettato, sopra e sotto: e' quello che dice «bustina» da lontano. */
.bustina::before, .bustina::after{content:""; position:absolute; left:0; right:0; height:8px;
  background:repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 4px, transparent 4px 8px)}
.bustina::before{top:0}
.bustina::after{bottom:0}
.bustina .marchio-b{font-size:9.5px; font-weight:800; letter-spacing:1.5px;
  text-transform:uppercase; opacity:.65}
.bustina b{font-size:15px; line-height:1.15; overflow-wrap:anywhere}
.bustina small{font-size:11px; font-weight:700; opacity:.7}
/* Il luccichio della stagnola che passa ogni tanto: la stessa banda dei rulli. */
.bustina .riflesso{position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(115deg, transparent 35%, rgba(255,255,255,.55) 50%, transparent 65%);
  transform:translateX(-120%); animation:luccica 4.2s ease-in-out infinite}
.barretta{height:6px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden}
.barretta span{display:block; height:100%; border-radius:999px;
  background:linear-gradient(90deg,#7fd1a8,var(--oro))}
.aperto-testa{display:flex; gap:12px; align-items:center; margin:4px 0 10px}
.aperto-testa .bustina{width:84px; flex:0 0 auto; padding:10px 4px}
.aperto-testa .bustina b{font-size:12px}
.aperto-testa .dice{flex:1; min-width:0; font-size:13px; color:var(--spento)}
.aperto-testa .dice b{display:block; color:var(--testo); font-size:16px; margin-bottom:3px}

/* ------------------------------------------------- aprire un pacchetto */
/**
 * ⚠ **Il pacchetto si apre col dito.** Chiesto l'11 settembre 2026: «vorrei un
 * pack figurine che si apre, magari fai uno slide con il dito, tipo per
 * tagliare e aprire il pacchetto, e poi si vede cosa esce».
 *
 * Tre tempi: la bustina che galleggia, la riga tratteggiata da tagliare — il
 * rosso dice fin dove e' arrivato il dito — e le carte che escono coperte e si
 * girano toccandole. Sta sotto ai coriandoli e al lampo («z-index» 48): la
 * scena del grado si vede sopra alla carta che l'ha fatta partire.
 *
 * ⚠ «touch-action:none» sulla bustina e basta: e' l'unico posto dove il dito
 * che scorre deve tagliare invece di scorrere la pagina.
 */
.apertura{position:fixed; inset:0; z-index:48; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:16px; overflow-y:auto;
  padding:20px 16px calc(20px + env(safe-area-inset-bottom));
  background:radial-gradient(90% 60% at 50% 30%, rgba(60,40,90,.6), rgba(4,5,8,.97) 72%);
  animation:apre .2s ease}
.apertura .busta{position:relative; width:min(62vw, 250px); aspect-ratio:3/4;
  touch-action:none; -webkit-user-select:none; user-select:none; cursor:grab;
  animation:galleggia 3s ease-in-out infinite}
@keyframes galleggia{0%,100%{transform:translateY(0) rotate(-1.5deg)}
  50%{transform:translateY(-8px) rotate(1.5deg)}}
.apertura .busta .bustina{position:absolute; inset:0; aspect-ratio:auto; padding-top:32%}
.apertura .busta .bustina b{font-size:19px}
/* Il lembo: la striscia sopra alla riga tratteggiata, quella che si strappa. */
.apertura .lembo{position:absolute; left:0; right:0; top:0; height:22%; z-index:2;
  border-radius:6px 6px 0 0;
  background:linear-gradient(135deg,#fff1c1,#f6b73c 60%,#ffd66e);
  border-bottom:2px dashed rgba(20,20,20,.6)}
.apertura .lembo::before{content:""; position:absolute; left:0; right:0; top:0; height:8px;
  background:repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 4px, transparent 4px 8px)}
.apertura .taglio{position:absolute; bottom:-3px; left:0; height:4px; width:0%;
  border-radius:2px; background:linear-gradient(90deg,#fff,#ff5c6e); box-shadow:0 0 12px #ff5c6e}
.apertura .taglio.da-destra{left:auto; right:0; background:linear-gradient(270deg,#fff,#ff5c6e)}
.apertura .forbici{position:absolute; bottom:-16px; left:-4px; font-size:22px;
  animation:forbici 1.6s ease-in-out infinite; pointer-events:none}
@keyframes forbici{0%,100%{transform:translateX(0)} 50%{transform:translateX(18px)}}
.apertura .busta.tagliando .forbici{display:none}
.apertura .busta.strappata{animation:none; cursor:default}
.apertura .busta.strappata .lembo{animation:vialembo .55s cubic-bezier(.3,.7,.4,1) forwards}
@keyframes vialembo{to{transform:translate(45%, -150%) rotate(28deg); opacity:0}}
.apertura .busta.strappata .bustina{animation:giubusta .55s .18s ease-in forwards}
@keyframes giubusta{to{transform:translateY(35%) scale(.88); opacity:0}}
.apertura .dice{color:#d8dbea; font-size:14px; text-align:center; max-width:330px}
.apertura .dice b{color:var(--oro)}
.apertura .riga-tasti{justify-content:center}
/* Le carte: escono coperte, e si girano toccandole. */
.carte{display:grid; grid-template-columns:repeat(auto-fit, minmax(98px, 1fr)); gap:10px;
  width:min(100%, 560px)}
.carta{perspective:900px; aspect-ratio:3/4.3; cursor:pointer;
  animation:escono .45s cubic-bezier(.2,1.4,.4,1) both}
@keyframes escono{from{transform:translateY(70px) scale(.6); opacity:0} to{transform:none; opacity:1}}
.carta .gira{position:relative; width:100%; height:100%; transform-style:preserve-3d;
  transition:transform .55s cubic-bezier(.3,1.3,.5,1)}
.carta.girata .gira{transform:rotateY(180deg)}
.carta .retro, .carta .fronte{position:absolute; inset:0; border-radius:12px; overflow:hidden;
  backface-visibility:hidden; -webkit-backface-visibility:hidden}
.carta .retro{display:grid; place-items:center; font-size:30px; font-weight:800;
  color:rgba(30,20,5,.55); border:2px solid #fff3cf;
  background:repeating-linear-gradient(45deg,#f6b73c 0 10px,#ffd66e 10px 20px)}
.carta .fronte{transform:rotateY(180deg); display:flex; flex-direction:column;
  background:#12141c; border:2px solid var(--g);
  box-shadow:0 0 22px color-mix(in srgb, var(--g) 45%, transparent)}
.carta .faccia{flex:1 1 auto; min-height:0; display:grid; place-items:center; font-size:30px;
  background:radial-gradient(100% 80% at 50% 0%, color-mix(in srgb, var(--g) 35%, transparent), transparent 70%)}
.carta .faccia img{width:100%; height:100%; object-fit:cover; display:block}
.carta .sotto{padding:6px 7px 7px; display:flex; flex-direction:column; gap:3px}
.carta .grado{font-size:10px; padding:2px 7px; align-self:flex-start}
.carta .titolo{font-size:11.5px; font-weight:700; line-height:1.2;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.carta .nuova{font-size:10.5px; font-weight:800; color:#7fd1a8}
.carta .doppia{font-size:10.5px; color:var(--spento)}
.carte.scossa{animation:scuoti .5s cubic-bezier(.36,.07,.19,.97)}
/* La firma anche sulla carta, ma in piccolo: e' la stessa pastiglia, ristretta. */
.carta .firma{margin-top:1px; padding:2px 7px 2px 3px; gap:4px}
.carta .firma .tondo{width:14px; height:14px; font-size:8px}
.carta .firma .nome{font-size:10px}
.carta .firma .che{display:none}

/* ------------------------------------------------------ lo shop, a sezioni */
.sezione{margin:18px 0 10px; font-size:13px; letter-spacing:.4px; text-transform:uppercase;
  color:var(--spento)}
.sezione:first-child{margin-top:4px}
#shop-roba .cassetto .prodotti{margin-top:2px}

/* ------------------------------------------------------------ l'inventario */
/**
 * ⚠ **Una pagina fatta per guardarsi**, chiesto l'11 settembre 2026: «voglio
 * una bella page dedicata». In cima l'anello di quanto ne hai, sotto i gradi
 * come pastiglie, gli obiettivi, e un pacchetto per riga con le sue caselle.
 *
 * Le caselle piene hanno il bordo del loro grado; quelle vuote sono tratteggiate
 * e sbiadite dello stesso colore, col numero sopra — che ti manca un Mythic
 * lo devi vedere, cosa sia no.
 */
.inv-testa{display:flex; align-items:center; gap:16px; padding:14px; margin:6px 0 10px;
  border-radius:18px; border:1px solid var(--riga);
  background:radial-gradient(120% 120% at 0% 0%, rgba(255,209,102,.13), transparent 60%),
    rgba(14,16,22,.8)}
.anello{--p:0; flex:0 0 auto; width:92px; height:92px; border-radius:50%;
  display:grid; place-items:center;
  background:conic-gradient(var(--oro) calc(var(--p) * 1%), rgba(255,255,255,.08) 0)}
.anello b{display:grid; place-items:center; width:74px; height:74px; border-radius:50%;
  background:#0d0f15; font-size:22px; font-variant-numeric:tabular-nums}
.inv-testa .dice{min-width:0}
.inv-testa .dice b{font-size:18px}
.inv-testa .dice small{display:block; color:var(--spento); font-size:12.5px; margin-top:3px;
  line-height:1.35}
.inv-gradi{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px}
.inv-gradi .g{display:inline-flex; align-items:center; gap:6px; padding:4px 10px 4px 6px;
  border-radius:999px; font-size:12px; font-variant-numeric:tabular-nums;
  border:1px solid color-mix(in srgb, var(--g) 55%, var(--riga))}
.inv-gradi .g i{width:10px; height:10px; border-radius:50%; background:var(--g)}
.inv-gradi .g.pieno{background:color-mix(in srgb, var(--g) 22%, transparent)}
.obiettivo{display:flex; align-items:center; gap:10px; padding:9px 2px;
  border-top:1px solid var(--riga)}
.obiettivo:first-child{border-top:0}
.obiettivo .spunta{width:22px; height:22px; border-radius:50%; flex:0 0 auto;
  display:grid; place-items:center; border:1px solid var(--riga); font-size:12px;
  color:var(--spento)}
.obiettivo.fatto .spunta{background:#1f6f4a; border-color:#37a06d; color:#fff}
.obiettivo .cosa{flex:1; min-width:0; font-size:13.5px}
.obiettivo.fatto .cosa{color:var(--spento)}
.obiettivo .cosa .barretta{height:4px; margin-top:5px}
.obiettivo .quanto{font-size:12px; color:var(--spento); font-variant-numeric:tabular-nums}
.inv-pacco{margin:18px 0}
.inv-pacco .testa{display:flex; align-items:baseline; gap:8px; margin-bottom:7px}
.inv-pacco .testa b{flex:1; min-width:0; font-size:15px; overflow-wrap:anywhere}
.inv-pacco .testa small{color:var(--spento); font-variant-numeric:tabular-nums}
.inv-pacco.completo .testa b::after{content:" ✓"; color:var(--oro)}
.caselle-inv{display:grid; grid-template-columns:repeat(auto-fill, minmax(72px, 1fr));
  gap:7px; margin-top:9px}
.cas{position:relative; aspect-ratio:3/4; border-radius:10px; overflow:hidden;
  border:2px solid var(--g); background:#0f1117; display:grid; place-items:center;
  cursor:pointer}
.cas img{width:100%; height:100%; object-fit:cover; display:block}
.cas .icona{font-size:24px}
.cas .n{position:absolute; left:5px; top:3px; font-size:9.5px; font-weight:800; color:#fff;
  text-shadow:0 1px 3px #000}
.cas .t{position:absolute; left:0; right:0; bottom:0; padding:12px 4px 4px; font-size:9.5px;
  font-weight:700; text-align:center; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; background:linear-gradient(180deg,transparent,rgba(0,0,0,.85))}
.cas.f3, .cas.f4, .cas.f5{box-shadow:0 0 16px color-mix(in srgb, var(--g) 55%, transparent)}
.cas.buco{cursor:default; border:2px dashed color-mix(in srgb, var(--g) 45%, transparent);
  background:repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0 6px, transparent 6px 12px),
    #0b0c11}
.cas.buco .q{font-size:22px; font-weight:800; color:color-mix(in srgb, var(--g) 50%, #2a2d38)}
.cas.buco .n{color:var(--spento); text-shadow:none}
/* Appena sbloccata dall'ultima volta: si accende, cosi' si vede cosa e' cambiato. */
.cas.appena{animation:appena 1.1s ease 2;
  box-shadow:0 0 0 2px var(--g), 0 0 24px var(--g)}
@keyframes appena{0%{transform:scale(.8); filter:brightness(2)} 60%{transform:scale(1.07)}
  100%{transform:none; filter:none}}

/* ------------------------------------------------------------- le facce */
/**
 * ⚠ **La faccia: il disegno sotto, la foto sopra se c'e'.** Dall'11 settembre
 * 2026 ogni figurina ne ha una (vedi «facciaHtml» nel copione). Riempie il suo
 * riquadro qualunque sia — una casella della macchinetta, una dell'inventario,
 * una carta, una scheda del negozio — e se la foto non arriva resta il disegno.
 */
.faccia-d{position:absolute; inset:0; display:block; overflow:hidden}
.faccia-d > svg, .faccia-d > img{position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; display:block}
.carta .faccia{position:relative}
/* Sulla macchinetta le caselle sono quadrate e il disegno e' fatto per una
   carta, piu' alta: il nome in fondo finiva tagliato a meta'. Li' basta il
   segno; il nome si legge nella carta e nell'inventario. */
.casella .disegno .nome{display:none}
.casella.gira .faccia-d{animation:scorre .2s linear infinite}
.casella.gira .faccia-d > img{animation:none}
/**
 * ⚠ **Tenuta, fra i due tiri**: lo stesso anello d'oro dei rulli bloccati della
 * prima slot. Due segni diversi per «questa la tengo» sarebbero due cose da
 * imparare.
 */
.casella{cursor:pointer}
.casella.tenuta{outline:3px solid var(--oro); outline-offset:-3px;
  box-shadow:0 0 18px rgba(255,209,102,.45)}
.casella .ferma{position:absolute; top:4px; right:4px; z-index:2; padding:1px 6px;
  border-radius:999px; background:var(--oro); color:#141414; font-size:9px; font-weight:800;
  text-transform:uppercase; letter-spacing:.3px}
.casella .chi{z-index:1}
.premi .nota{font-size:12px; color:var(--spento); margin-top:6px; line-height:1.4}
/* Un brano nell'inventario: si vede che si ascolta, prima di toccarlo. */
.cas .suona{position:absolute; right:5px; top:4px; z-index:2; width:22px; height:22px;
  border-radius:50%; display:grid; place-items:center; background:rgba(0,0,0,.62);
  color:#fff; font-size:10px}
.cas .n, .cas .t{z-index:2}
.cas .copie{position:absolute; right:5px; top:3px; z-index:2; font-size:10.5px;
  font-weight:800; color:#fff; text-shadow:0 1px 3px #000}
.cas .verso{position:absolute; left:6px; right:6px; bottom:5px; height:4px; z-index:2;
  border-radius:999px; background:rgba(0,0,0,.55); overflow:hidden}
.cas .verso span{display:block; height:100%; background:var(--g)}
.grande.guarda .copertona{width:min(70vw, 340px); max-height:none; aspect-ratio:1;
  object-fit:cover; margin-bottom:16px}
.apertura .dice::first-letter{text-transform:uppercase}

/* Chi non vuole roba che si muove non la vede: il gioco resta lo stesso. */
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.01ms!important; animation-iteration-count:1!important;
    transition-duration:.01ms!important}
}
`;
