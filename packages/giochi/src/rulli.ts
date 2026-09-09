/**
 * I rulli e i pezzi: la roba che gira.
 *
 * **Dodici rulli per tavolo**, come nella prima versione di DaProdSlot — la
 * riga da sei era troppo corta, e chiedendo a un modello sei cose si ottiene
 * sempre lo stesso tipo di risposta. Con dodici il prompt comincia ad avere
 * un'idea dentro.
 *
 * Ogni pezzo ha due facce — `nome` in italiano, che e' quello che leggi sul
 * rullo, e `testo`, che e' quello che finisce nel prompt vero. I modelli sono
 * addestrati in inglese: il testo e' in inglese, e non e' un vezzo.
 *
 * ⚠ **Il rullo degli stili non e' scritto qui.** Arriva da `@daprod/azioni`,
 * che e' il posto unico dove la suite dichiara i suoi stili. Riscriverli qui
 * vorrebbe dire avere due elenchi di stili che il primo giorno sono uguali e il
 * secondo no — che e' esattamente il difetto trovato il 7 settembre 2026, e per
 * cui e' nato il blocco 1 della 1.2.3.
 *
 * **`quantoComune`, da 0 a 1.** Non e' un gusto: e' quanto quella cosa e'
 * ovvia. Da li' nasce il prezzo (`prezzoDiPartenza` in `regole.ts`), e quindi
 * il grado. Un gatto lo pensa chiunque; un palombaro in un campo di grano no.
 */

import { STILI_IMMAGINE_DI_PARTENZA } from "@daprod/azioni";
import type { Pezzo, Rullo } from "./tipi";

/**
 * I segni sopra le lettere, per toglierli.
 *
 * ⚠ Scritto con `new RegExp` e non come una regex a mano, di proposito: in una
 * regex scritta a mano quei due estremi sono **caratteri combinanti veri**
 * dentro il file, invisibili in qualunque editor e i primi a rompersi quando il
 * file passa da una codifica all'altra. Qui il sorgente resta di sole lettere
 * ASCII.
 */
const SEGNI = new RegExp("[\\u0300-\\u036f]", "g");

/** Da «Ora dorata» a «ora-dorata»: l'id di un pezzo si legge, e non cambia. */
export function chiocciola(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(SEGNI, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pezzi(rullo: string, righe: [string, string, number][]): Pezzo[] {
  return righe.map(([nome, testo, quantoComune]) => ({
    id: rullo + "/" + chiocciola(nome),
    rullo,
    nome,
    testo,
    quantoComune,
  }));
}

/* ================================================================== musica */

/**
 * I dodici rulli della musica.
 *
 * I primi due pescano tutti e due dal mazzo dei generi — 6.291 voci vere — e
 * non e' un doppione: **incrociare due generi e' il gesto che fa uscire le cose
 * buone**. «indonesian indie pop» da solo e' un genere; «indonesian indie pop
 * incrociato con dark jazz» e' un'idea.
 *
 * Il mazzo del secondo rullo lo prepara `banco.ts`, che prende i generi e li
 * rimette sotto il rullo «incrocio»: i dati stanno scritti una volta sola.
 */
export const RULLI_MUSICA: Rullo[] = [
  { id: "genere", nome: "Genere", tavolo: "musica", spiega: "Da che parte sta il pezzo" },
  { id: "incrocio", nome: "Incrociato con", tavolo: "musica", spiega: "L'altra meta', quella che stona" },
  { id: "voce", nome: "Voce", tavolo: "musica", spiega: "Chi canta" },
  { id: "canto", nome: "Come canta", tavolo: "musica", spiega: "In che modo la tira fuori" },
  { id: "strumento", nome: "Davanti", tavolo: "musica", spiega: "Lo strumento che si sente di piu'" },
  { id: "eanche", nome: "E anche", tavolo: "musica", spiega: "Quello che gli sta sotto" },
  { id: "atmosfera", nome: "Che aria", tavolo: "musica", spiega: "Come deve far sentire" },
  { id: "andatura", nome: "Andatura", tavolo: "musica", spiega: "Quanto corre" },
  { id: "epoca", nome: "Di quando", tavolo: "musica", spiega: "Di che anni sa" },
  { id: "presa", nome: "Com'e' preso", tavolo: "musica", spiega: "Come suona la registrazione" },
  { id: "struttura", nome: "Com'e' fatto", tavolo: "musica", spiega: "Come e' messo insieme" },
  { id: "firma", nome: "La firma", tavolo: "musica", spiega: "La cosa che lo rende suo" },
];

const VOCI = pezzi("voce", [
  ["Voce d'uomo bassa", "deep male vocals, chest voice, close mic, breath audible", 0.7],
  ["Voce di donna alta", "high female vocals, clear top end, effortless", 0.7],
  ["Coro", "layered choir vocals, wide harmonies, church-like", 0.4],
  ["Strumentale", "fully instrumental, no vocals at all", 0.6],
  ["Due voci insieme", "male and female duet", 0.36],
  ["Voce rotta", "raspy worn out voice", 0.26],
  ["Voce di bambino", "child vocals", 0.16],
  ["Voce di vecchio", "old man voice, weathered", 0.14],
  ["Vocoder", "vocoder vocals", 0.18],
  ["Napoletana", "neapolitan vocals, italian lyrics", 0.12],
  ["Voce campionata", "chopped vocal sample", 0.22],
  ["Falsetto", "falsetto vocals", 0.3],
  ["Voce doppiata", "double tracked vocals", 0.24],
  ["Un coro di bambini", "children choir", 0.1],
]);

const CANTO = pezzi("canto", [
  ["Sussurrando", "whispered delivery, right against the microphone", 0.34],
  ["Urlando", "shouted delivery, voice tearing at the top", 0.36],
  ["Parlando", "spoken word delivery, no melody, conversational", 0.24],
  ["Come una preghiera", "chanted like a prayer", 0.12],
  ["A denti stretti", "gritted teeth, restrained", 0.14],
  ["Con leggerezza", "light and easy delivery", 0.5],
  ["Con rabbia", "angry delivery", 0.44],
  ["Piangendo", "voice breaking, close to tears", 0.16],
  ["Ridendo", "laughing between lines", 0.08],
  ["Ripetendo la stessa riga", "one line repeated over and over", 0.2],
  ["A cappella all'inizio", "starts a cappella", 0.18],
  ["Come una filastrocca", "nursery rhyme cadence", 0.1],
]);

const STRUMENTI = pezzi("strumento", [
  ["Chitarra elettrica", "electric guitar up front, amp grit, pick attack", 0.85],
  ["Pianoforte", "grand piano, pedal ring, close mics on the hammers", 0.8],
  ["Basso grosso", "fat bass line, round and forward in the mix", 0.66],
  ["Batteria vera", "live acoustic drums in a real room, cymbals breathing", 0.62],
  ["Drum machine", "808 drum machine, long sub kick, snappy claps", 0.5],
  ["Archi", "string section, real players, some bow noise left in", 0.44],
  ["Fiati", "brass section, tight and punchy, stabs", 0.36],
  ["Sintetizzatore analogico", "warm analog synth, slight tuning drift", 0.46],
  ["Organo", "hammond organ through a rotary speaker, drawbars out", 0.3],
  ["Chitarra acustica", "acoustic guitar, steel strings, finger noise on the frets", 0.72],
  ["Mandolino", "mandolin, fast tremolo picking", 0.14],
  ["Fisarmonica", "accordion, bellows breathing between phrases", 0.18],
  ["Theremin", "theremin, wavering pitch, no frets to hold on to", 0.06],
  ["Arpa", "harp, wide glissandi across the strings", 0.12],
  ["Sassofono", "saxophone, breathy and loud, honking on the low notes", 0.34],
  ["Banjo", "banjo, rolling fingerpicks, relentless", 0.16],
  ["Marimba", "marimba, soft mallets, woody and round", 0.1],
  ["Tamburi a mano", "hand drums leading, congas and shakers, no kit", 0.28],
]);

const EANCHE = pezzi("eanche", [
  ["Un tappeto di archi", "string pad underneath", 0.4],
  ["Un basso che cammina", "walking bass", 0.3],
  ["Campionamento sporco", "dusty vinyl sample", 0.28],
  ["Rumore di fondo", "field recording noise bed", 0.14],
  ["Un coro lontano", "distant choir", 0.2],
  ["Una chitarra che gratta", "scratchy rhythm guitar", 0.44],
  ["Un arpeggiatore", "arpeggiator", 0.26],
  ["Battito di mani", "hand claps", 0.5],
  ["Un pianoforte scordato", "detuned upright piano", 0.12],
  ["Sub che spinge", "heavy sub bass", 0.42],
  ["Niente sotto", "nothing else, sparse arrangement", 0.34],
  ["Un carillon", "music box", 0.08],
  ["Grancassa a quattro", "four on the floor kick", 0.46],
  ["Un organo da chiesa", "church organ", 0.1],
]);

const ATMOSFERE = pezzi("atmosfera", [
  ["Allegra", "upbeat and happy, wants you moving", 0.86],
  ["Triste", "melancholic, heavy in the chest, resigned", 0.8],
  ["Arrabbiata", "angry and loud, no room left to breathe", 0.6],
  ["Notturna", "late night mood, three in the morning, empty streets", 0.5],
  ["Da ballare", "danceable, club ready, relentless forward pulse", 0.66],
  ["Da film", "cinematic and wide, like a title sequence", 0.44],
  ["Malinconica ma che balla", "melancholic but danceable", 0.24],
  ["Sporca", "lo-fi and dirty, tape hiss and clipped peaks", 0.34],
  ["Solenne", "solemn and grand, ceremonial, unhurried", 0.26],
  ["Da festa di paese", "village festival, joyful mess", 0.14],
  ["Inquieta", "uneasy, something is wrong and nobody says it", 0.2],
  ["Dolce", "tender and warm, close and safe", 0.5],
  ["Da ultimo giorno", "end of the world calm", 0.1],
  ["Innamorata", "in love, blushing", 0.4],
]);

const ANDATURE = pezzi("andatura", [
  ["Lentissima", "60 bpm, very slow, heavy drag on every beat", 0.3],
  ["Lenta", "80 bpm, slow and swaying", 0.5],
  ["Camminata", "100 bpm, walking pace", 0.6],
  ["Media", "120 bpm, steady and even", 0.8],
  ["Svelta", "140 bpm, driving", 0.6],
  ["Corsa", "170 bpm, running", 0.34],
  ["A rotta di collo", "190 bpm, breakneck, barely holding together", 0.12],
  ["A tempo dispari", "odd time signature, 7/8", 0.08],
  ["Che rallenta", "gradually slowing down", 0.1],
  ["Che accelera", "gradually speeding up", 0.11],
  ["A tempo libero", "rubato, no fixed tempo", 0.07],
]);

/**
 * Il rullo «Di quando», legato alle epoche.
 *
 * ⚠ **Ogni voce sa di che decennio e', e quanto suona di adesso.** Serve a una
 * cosa che si vede: il 9 settembre 2026, scegliendo gli anni 80, la sala si
 * vestiva di magenta, i generi diventavano ottantiani — e poi questa casella
 * diceva «Adesso». Due cose che si contraddicono nella stessa schermata.
 *
 * Adesso il peso delle epoche vale anche qui: negli anni 80 esce «Anni
 * ottanta» quasi sempre, ma non sempre — se scappa fuori una produzione di
 * adesso su un genere di allora, va bene: e' esattamente il tipo di prompt che
 * uno non avrebbe scritto da solo.
 */
const EPOCHE_SUONO: Pezzo[] = [
  ["Anni sessanta", "60s recording, mono warmth", 0.4, "", 0.9],
  ["Anni settanta", "70s analog production", 0.5, "70", 0.78],
  ["Anni ottanta", "80s production, gated reverb", 0.62, "80", 0.62],
  ["Anni novanta", "90s production", 0.6, "90", 0.46],
  ["Anni duemila", "2000s production", 0.56, "00", 0.3],
  ["Anni dieci", "2010s production", 0.58, "10", 0.15],
  ["Adesso", "modern production, loud and clean", 0.7, "20", 0.03],
  ["Fuori dal tempo", "timeless, no era", 0.2, "", 0.5],
  ["Da grammofono", "1920s gramophone, crackle", 0.06, "", 1],
  ["Dal futuro", "futuristic production, unfamiliar", 0.1, "", 0],
].map(([nome, testo, quantoComune, decennio, modernita]) => ({
  id: "epoca/" + chiocciola(String(nome)),
  rullo: "epoca",
  nome: String(nome),
  testo: String(testo),
  quantoComune: Number(quantoComune),
  decennio: String(decennio),
  modernita: Number(modernita),
}));

const PRESA = pezzi("presa", [
  ["Registrato bene", "clean studio recording", 0.72],
  ["Su nastro", "recorded to tape, saturated", 0.34],
  ["In una stanza", "roomy, one microphone", 0.24],
  ["Dal vivo", "live recording, crowd noise", 0.3],
  ["Al telefono", "telephone filter, thin", 0.1],
  ["In cantina", "basement demo quality", 0.16],
  ["In una chiesa", "recorded in a church, long reverb", 0.12],
  ["Compresso a morte", "heavily compressed, loud", 0.4],
  ["Con la radio accanto", "radio bleed in the background", 0.06],
  ["Pulito e vuoto", "dry, no reverb at all", 0.26],
  ["Tutto in riverbero", "drenched in reverb", 0.32],
  ["Da cassetta rovinata", "warped cassette, wow and flutter", 0.14],
]);

const STRUTTURA = pezzi("struttura", [
  ["Strofa e ritornello", "verse chorus structure", 0.85],
  ["Cresce e basta", "one long build, no chorus", 0.24],
  ["Comincia dal finale", "starts at the climax", 0.12],
  ["Con uno stacco a meta'", "beat switch halfway", 0.2],
  ["Un giro solo", "one loop all the way through", 0.3],
  ["Con un assolo", "instrumental solo section", 0.42],
  ["Con un finale lungo", "long outro, fading", 0.28],
  ["Due canzoni attaccate", "two songs stitched together", 0.08],
  ["Corta e via", "under two minutes", 0.22],
  ["Che si sfascia alla fine", "falls apart at the end", 0.09],
  ["Con un ponte che cambia tutto", "bridge that changes the key", 0.18],
]);

const FIRMA = pezzi("firma", [
  ["Un fischio", "whistling hook", 0.2],
  ["Una voce che parla sotto", "spoken sample underneath", 0.18],
  ["Una nota che stona", "one deliberately wrong note", 0.1],
  ["Un silenzio in mezzo", "sudden silence in the middle", 0.14],
  ["Una risata", "a laugh left in the take", 0.08],
  ["Il rumore della sedia", "chair creak left in", 0.05],
  ["Un conteggio all'inizio", "count in at the start", 0.22],
  ["Il ritornello cantato male apposta", "deliberately sloppy chorus", 0.07],
  ["Una campana", "a bell", 0.16],
  ["Un cane che abbaia", "a dog barking", 0.04],
  ["Niente di strano", "nothing unusual", 0.5],
  ["Un applauso finto", "canned applause", 0.06],
  ["Una radio che si sintonizza", "radio tuning between stations", 0.09],
]);

/** I pezzi della musica che non sono generi. I generi si aggiungono a parte. */
export const PEZZI_MUSICA_CORTI: Pezzo[] = [
  ...VOCI,
  ...CANTO,
  ...STRUMENTI,
  ...EANCHE,
  ...ATMOSFERE,
  ...ANDATURE,
  ...EPOCHE_SUONO,
  ...PRESA,
  ...STRUTTURA,
  ...FIRMA,
];

/* ================================================================= immagini */

export const RULLI_IMMAGINI: Rullo[] = [
  { id: "soggetto", nome: "Chi", tavolo: "immagini", spiega: "Chi o cosa si vede" },
  { id: "insieme", nome: "Con", tavolo: "immagini", spiega: "Chi altro c'e' nell'inquadratura" },
  { id: "azione", nome: "Che fa", tavolo: "immagini", spiega: "Cosa sta succedendo" },
  { id: "posto", nome: "Dove", tavolo: "immagini", spiega: "Il posto attorno" },
  { id: "quando", nome: "Quando", tavolo: "immagini", spiega: "Che ora e che stagione" },
  { id: "luce", nome: "Che luce", tavolo: "immagini", spiega: "Da dove batte" },
  { id: "aria", nome: "Che aria", tavolo: "immagini", spiega: "Cosa deve far sentire" },
  { id: "stile", nome: "Come", tavolo: "immagini", spiega: "Lo stile dell'immagine" },
  { id: "tecnica", nome: "Fatta con", tavolo: "immagini", spiega: "Con che mezzo e' fatta" },
  { id: "inquadratura", nome: "Da dove", tavolo: "immagini", spiega: "Dove sta la macchina" },
  { id: "colore", nome: "Che colori", tavolo: "immagini", spiega: "La tavolozza" },
  { id: "dettaglio", nome: "E poi", tavolo: "immagini", spiega: "La cosa che la rende sua" },
];

const SOGGETTI = pezzi("soggetto", [
  ["Un gatto", "a cat, close on the face, whiskers catching the light", 0.95],
  ["Un cane bagnato", "a soaking wet dog, fur stuck flat, shaking off water", 0.88],
  ["Una vecchia signora", "an old woman, deep lines on her face, steady eyes", 0.82],
  ["Un bambino", "a small child, maybe five years old, looking up", 0.85],
  ["Un vecchio pescatore", "an old fisherman", 0.6],
  ["Un astronauta", "an astronaut in a worn white suit, visor reflecting the scene", 0.72],
  ["Un robot arrugginito", "a rusted humanoid robot, exposed cables, one arm hanging", 0.5],
  ["Un cavaliere in armatura", "a knight in full armor", 0.66],
  ["Una ballerina", "a ballet dancer mid pose, muscles taut, chalk on the shoes", 0.7],
  ["Un pugile a fine incontro", "a boxer after the fight", 0.45],
  ["Un cameriere", "a waiter in a white jacket", 0.44],
  ["Una band di strada", "a street band", 0.4],
  ["Un motociclista", "a motorcyclist in worn leathers, helmet under one arm", 0.62],
  ["Un palombaro", "a deep sea diver in a brass helmet", 0.16],
  ["Un fantasma educato", "a polite ghost", 0.12],
  ["Un pupazzo di neve storto", "a lopsided snowman", 0.3],
  ["Una statua che respira", "a breathing marble statue", 0.09],
  ["Un lupo bianco", "a lone white wolf, thick winter coat, breath in the cold", 0.55],
  ["Un polpo", "an octopus, suckers and shifting skin, one eye watching", 0.5],
  ["Uno stormo di storni", "a murmuration of starlings", 0.22],
  ["Un pianista cieco", "a blind pianist", 0.14],
  ["Un venditore di angurie", "a watermelon seller", 0.18],
  ["Un portiere sotto la pioggia", "a goalkeeper in the rain", 0.28],
  ["Una sposa scalza", "a barefoot bride", 0.2],
  ["Un tram vuoto", "an empty tram", 0.26],
  ["Un gigante gentile", "a gentle giant", 0.24],
  ["Una Vespa del cinquanta", "a vintage Vespa scooter", 0.34],
  ["Una nonna con la pistola", "a grandmother holding a revolver", 0.07],
  ["Un uomo con la testa di pesce", "a man with a fish head", 0.05],
  ["Un vigile fermo", "a traffic officer standing still", 0.3],
]);

const INSIEME = pezzi("insieme", [
  ["Da solo", "alone in frame", 0.8],
  ["Con un cane", "with a dog", 0.6],
  ["Con la sua ombra", "with an oversized shadow", 0.2],
  ["Con una folla dietro", "with a crowd behind", 0.44],
  ["Con un bambino", "with a child", 0.5],
  ["Con uno sconosciuto", "with a stranger", 0.3],
  ["Con un cavallo", "with a horse", 0.34],
  ["Con qualcuno che se ne va", "with someone walking away", 0.24],
  ["Con un uccello sulla spalla", "with a bird on the shoulder", 0.16],
  ["Con la stessa persona due volte", "with a duplicate of themselves", 0.06],
  ["Con una macchina rotta", "with a broken down car", 0.28],
  ["Con centinaia di candele", "with hundreds of candles", 0.12],
]);

const AZIONI = pezzi("azione", [
  ["Guarda in camera", "looking straight into the camera", 0.9],
  ["Corre", "running at full speed, mid stride, one foot off the ground", 0.88],
  ["Dorme", "asleep, breathing slow, completely still", 0.84],
  ["Ride forte", "laughing out loud", 0.72],
  ["Piange senza fare rumore", "crying silently", 0.4],
  ["Aspetta qualcuno", "waiting for someone", 0.5],
  ["Fuma l'ultima sigaretta", "smoking the last cigarette", 0.34],
  ["Balla da solo", "dancing alone", 0.42],
  ["Cade all'indietro", "falling backwards", 0.3],
  ["Regge un ombrello rotto", "holding a broken umbrella", 0.24],
  ["Conta i soldi", "counting money", 0.44],
  ["Suona qualcosa", "playing an instrument", 0.6],
  ["Si toglie la maschera", "taking off a mask", 0.2],
  ["Guarda fuori dal finestrino", "staring out of a window", 0.66],
  ["Scappa", "running for their life", 0.38],
  ["Tiene per mano qualcuno", "holding someone hand", 0.62],
  ["Grida senza voce", "screaming with no sound", 0.16],
  ["Ripara qualcosa", "fixing something with their hands", 0.4],
  ["Mangia mentre pensa", "eating while lost in thought", 0.3],
  ["Sta per andarsene", "about to leave", 0.28],
  ["Attraversa a nuoto", "swimming across", 0.22],
  ["Prende fuoco piano piano", "slowly catching fire", 0.06],
  ["Vola a un metro da terra", "floating one meter above the ground", 0.08],
  ["Legge una lettera vecchia", "reading an old letter", 0.32],
  ["Si specchia in una pozzanghera", "looking at their reflection in a puddle", 0.18],
]);

const POSTI = pezzi("posto", [
  ["In cucina", "in a lived-in home kitchen, worn counters and tiles", 0.9],
  ["Per strada", "on a city street, parked cars and shop signs", 0.92],
  ["In riva al mare", "on the seashore", 0.8],
  ["In un bosco", "deep in a forest, tall trunks, light through leaves", 0.78],
  ["In un vicolo di Napoli", "in a narrow Naples alley, laundry hanging above", 0.3],
  ["Sotto il Vesuvio", "with Mount Vesuvius in the background", 0.18],
  ["In una stazione di notte", "in a train station at night", 0.4],
  ["In un bar vuoto", "in an empty bar", 0.44],
  ["Su un tetto", "on a rooftop", 0.5],
  ["In un campo di grano", "in a wheat field", 0.42],
  ["In una cabina telefonica", "inside a phone booth", 0.22],
  ["In un cinema vuoto", "in an empty cinema", 0.26],
  ["In una lavanderia a gettoni", "in a laundromat", 0.24],
  ["In una miniera", "deep in a mine", 0.16],
  ["Su una scala antincendio", "on a fire escape", 0.3],
  ["In mezzo al traffico", "in the middle of traffic", 0.6],
  ["In una serra abbandonata", "in an abandoned greenhouse", 0.14],
  ["Su un ponte di ferro", "on an iron bridge", 0.34],
  ["In una piscina vuota", "in an empty swimming pool", 0.2],
  ["Dentro un armadio", "inside a wardrobe", 0.12],
  ["In un mercato del pesce", "in a fish market", 0.28],
  ["Sulla luna", "on the surface of the moon", 0.36],
  ["In una chiesa vuota", "in an empty church", 0.3],
  ["Dietro le quinte", "backstage", 0.32],
  ["In un parcheggio sotterraneo", "in an underground car park", 0.26],
  ["Sott'acqua", "underwater, light shafts from above, particles drifting", 0.46],
]);

const QUANDO = pezzi("quando", [
  ["All'alba", "at dawn", 0.6],
  ["A mezzogiorno", "at noon", 0.7],
  ["Al tramonto", "at sunset", 0.75],
  ["Di notte fonda", "in the dead of night", 0.55],
  ["Sotto la neve", "in falling snow", 0.4],
  ["Sotto la pioggia", "in heavy rain", 0.66],
  ["Nella nebbia", "in thick fog", 0.34],
  ["In pieno agosto", "in high summer heat", 0.44],
  ["A novembre", "in a grey november", 0.24],
  ["Durante un'eclissi", "during an eclipse", 0.08],
  ["Il giorno di Natale", "on christmas day", 0.3],
  ["Cinque minuti prima del temporale", "five minutes before the storm", 0.16],
]);

const LUCI = pezzi("luce", [
  ["Sole delle due", "harsh midday sun, hard shadows", 0.6],
  ["Ora dorata", "golden hour, warm backlight", 0.7],
  ["Neon", "neon lights, magenta and cyan", 0.5],
  ["Candela", "candlelight, warm flicker", 0.44],
  ["Temporale", "storm light, grey and heavy", 0.4],
  ["Luce da finestra", "soft window light from the side", 0.66],
  ["Controluce", "strong backlight, subject in silhouette", 0.36],
  ["Torcia in faccia", "harsh flashlight from below", 0.2],
  ["Insegna che lampeggia", "flickering sign light", 0.18],
  ["Un lampione solo", "single street lamp in the dark", 0.34],
  ["Luce da acquario", "aquarium light, blue caustics", 0.14],
  ["Fari di macchina", "car headlights cutting through", 0.26],
  ["Neve che riflette", "snow bounce light, cold and even", 0.22],
  ["Proiettore da cinema", "projector beam through dust", 0.12],
  ["Luna piena", "full moon light, blue and quiet", 0.42],
  ["Fuoco", "firelight, orange and moving", 0.38],
  ["Luce da ospedale", "flat fluorescent hospital light", 0.24],
  ["Un solo faretto", "single hard spotlight", 0.28],
]);

const ARIA = pezzi("aria", [
  ["Tranquilla", "calm and still", 0.7],
  ["Che fa paura", "unsettling, dread", 0.4],
  ["Nostalgica", "nostalgic", 0.5],
  ["Solenne", "solemn", 0.3],
  ["Buffa", "funny, slightly absurd", 0.36],
  ["Sospesa", "suspended, time stopped", 0.24],
  ["Affollata e caotica", "busy and chaotic", 0.44],
  ["Intima", "intimate and close", 0.46],
  ["Epica", "epic and vast", 0.55],
  ["Come un sogno", "dreamlike", 0.42],
  ["Come un ricordo sbiadito", "like a faded memory", 0.2],
  ["Come una scena del delitto", "like a crime scene", 0.14],
]);

const TECNICA = pezzi("tecnica", [
  ["Fotografia", "photography, real lens, natural imperfections", 0.9],
  ["Pellicola 35mm", "35mm film photograph, grain", 0.6],
  ["Polaroid", "polaroid photo, faded borders", 0.4],
  ["Olio su tela", "oil painting on canvas", 0.5],
  ["Acquerello", "watercolor, soft washes bleeding into paper", 0.48],
  ["Disegno a matita", "pencil sketch, visible construction lines", 0.52],
  ["Inchiostro", "ink drawing, dense cross hatching, no grey", 0.36],
  ["Collage", "paper collage", 0.2],
  ["Tre dimensioni", "3d render, clean geometry, soft global illumination", 0.55],
  ["Pixel", "pixel art, chunky pixels, limited palette", 0.3],
  ["Stampa serigrafica", "screen print, limited inks", 0.16],
  ["Vetrata", "stained glass", 0.1],
  ["Mosaico", "mosaic, small hand-set tiles with visible grout", 0.09],
  ["Ricamo", "embroidered on fabric", 0.06],
  ["Affresco", "fresco on a wall", 0.08],
]);

const INQUADRATURA = pezzi("inquadratura", [
  ["Primo piano", "close up, face filling the frame", 0.8],
  ["Piano americano", "medium shot, waist up", 0.7],
  ["Campo lungo", "wide shot, subject small in a big space", 0.72],
  ["Dall'alto", "from above, high angle", 0.5],
  ["Dal basso", "from below, low angle", 0.46],
  ["Da dietro", "from behind", 0.4],
  ["Dal buco della serratura", "through a keyhole", 0.08],
  ["Di riflesso", "seen in a reflection", 0.18],
  ["Attraverso una finestra", "shot through a window", 0.26],
  ["Fra la folla", "from within the crowd", 0.22],
  ["A filo di terra", "camera on the ground", 0.14],
  ["Storta", "dutch angle", 0.12],
  ["A volo d'uccello", "bird eye view", 0.3],
  ["Dettaglio delle mani", "extreme close up on hands", 0.2],
]);

const COLORE = pezzi("colore", [
  ["Colori veri", "natural colors, nothing pushed", 0.85],
  ["Bianco e nero", "black and white, full tonal range, deep blacks", 0.7],
  ["Due colori soli", "duotone, two colors only", 0.3],
  ["Tutto rosso", "monochrome red", 0.16],
  ["Tutto blu", "monochrome blue", 0.18],
  ["Pastello", "soft pastel palette, low contrast", 0.44],
  ["Colori accesi", "saturated vivid colors", 0.6],
  ["Scoloriti", "washed out, desaturated", 0.4],
  ["Seppia", "sepia toned, like an old print", 0.34],
  ["Verde e magenta", "green and magenta", 0.14],
  ["Oro e nero", "gold and black", 0.2],
  ["Solo un colore acceso", "grayscale with one color left", 0.22],
  ["Colori sbagliati", "wrong colors, false color", 0.1],
]);

const DETTAGLI = pezzi("dettaglio", [
  ["Ha piovuto da poco", "wet ground, fresh rain", 0.5],
  ["Polvere nell'aria", "dust floating in the air", 0.34],
  ["Uno specchio rotto", "a broken mirror in frame", 0.2],
  ["Palloncini rossi", "red balloons", 0.24],
  ["Un'ombra che non torna", "a shadow that does not match", 0.08],
  ["Tutto storto di un grado", "everything tilted one degree", 0.1],
  ["Un cartello scritto a mano", "a handwritten sign", 0.3],
  ["Fumo basso", "low drifting smoke", 0.36],
  ["Una finestra accesa lontano", "one lit window far away", 0.26],
  ["Carta che vola", "papers flying in the wind", 0.28],
  ["Vetri appannati", "fogged glass", 0.32],
  ["Un dettaglio d'oro", "one golden detail", 0.18],
  ["Insetti attorno alla luce", "insects circling the light", 0.14],
  ["Un cane che guarda", "a dog watching from the corner", 0.16],
  ["Niente in piu'", "nothing else, empty frame", 0.4],
  ["Tutto bagnato", "everything soaked", 0.3],
  ["Una crepa nel muro", "a crack running down the wall", 0.24],
  ["Un uccello morto", "a dead bird on the ground", 0.07],
  ["Una porta socchiusa", "a door left ajar", 0.22],
]);

/**
 * Gli stili, presi da dove stanno: `@daprod/azioni`.
 *
 * Il prezzo lo fa `quantoComune`, e qui e' 0,5 fisso per tutti — non perche'
 * sia vero, ma perche' e' onesto: non sappiamo quale stile sia piu' raro, e
 * inventarsi un numero per fare colore vorrebbe dire dare un Mythic a caso.
 * Chi comanda puo' cambiare il prezzo di ognuno, e quello si' che e' un dato.
 */
const STILI: Pezzo[] = Object.entries(STILI_IMMAGINE_DI_PARTENZA).map(([nome, testo]) => ({
  id: "stile/" + chiocciola(nome),
  rullo: "stile",
  nome,
  testo,
  quantoComune: 0.5,
}));

export const PEZZI_IMMAGINI: Pezzo[] = [
  ...SOGGETTI,
  ...INSIEME,
  ...AZIONI,
  ...POSTI,
  ...QUANDO,
  ...LUCI,
  ...ARIA,
  ...STILI,
  ...TECNICA,
  ...INQUADRATURA,
  ...COLORE,
  ...DETTAGLI,
];

/* ==================================================================== tutto */

export const RULLI: Rullo[] = [...RULLI_MUSICA, ...RULLI_IMMAGINI];

/** I rulli di un tavolo, nell'ordine in cui si incollano nel prompt. */
export function rulliDi(tavolo: string): Rullo[] {
  return RULLI.filter((r) => r.tavolo === tavolo);
}
