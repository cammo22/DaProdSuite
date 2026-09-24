/**
 * NEON PARTENOPE — dati di gioco
 * Tutto quello che il gioco "sa": atti, nemici, boss, quartiere, officina, merceria,
 * trofei, commissioni e la trama di Radio Partenope. Niente logica qui: solo tabelle.
 */
"use strict";

// ============================================================ ATTI (la discesa)
// Ogni atto è un tratto della discesa verso il Nucleo del Vesuvio: cambia cielo, luci e nemici.
const ATTI = [
  {
    n: 1, nome: "PONTICELLI", sotto: "Il garage DaProd", da: 1, a: 20,
    cielo: ["#07041a", "#240b44", "#6e1b5c", "#ff6a8a"], mare: "#0c0618", neon: "#ff3df2", neon2: "#35e8ff",
    sole: "#ff8ad8", nebbia: "rgba(255,61,242,.10)"
  },
  {
    n: 2, nome: "IL GOLFO", sotto: "Porto e Molo Beverello", da: 21, a: 40,
    cielo: ["#01060f", "#062a45", "#0b5d73", "#5ee6ff"], mare: "#02101c", neon: "#35e8ff", neon2: "#5dffb4",
    sole: "#c8f7ff", nebbia: "rgba(53,232,255,.10)"
  },
  {
    n: 3, nome: "SPACCANAPOLI", sotto: "Vicoli, guglie e presepi", da: 41, a: 60,
    cielo: ["#0a0502", "#331905", "#8f4512", "#ffc46a"], mare: "#120a04", neon: "#ffd54a", neon2: "#ff8a3d",
    sole: "#ffe6a8", nebbia: "rgba(255,213,74,.10)"
  },
  {
    n: 4, nome: "NAPOLI SOTTERRANEA", sotto: "Cunicoli di tufo", da: 61, a: 80,
    cielo: ["#010502", "#04200f", "#0c4424", "#6dff9a"], mare: "#010a05", neon: "#00ff41", neon2: "#b6ff5c",
    sole: "#a8ffc0", nebbia: "rgba(0,255,65,.09)"
  },
  {
    n: 5, nome: "IL CRATERE", sotto: "Il Nucleo di sinteticoMC", da: 81, a: 100,
    cielo: ["#090101", "#360606", "#961d0b", "#ff9a4a"], mare: "#120302", neon: "#ff5a1f", neon2: "#ffd54a",
    sole: "#ffb27a", nebbia: "rgba(255,90,31,.12)"
  },
  {
    n: 6, nome: "OLTRE IL CRATERE", sotto: "Napoli rinata", da: 101, a: Infinity,
    cielo: ["#040112", "#180a3a", "#35136a", "#c07bff"], mare: "#07031a", neon: "#9d6bff", neon2: "#35e8ff",
    sole: "#e2c8ff", nebbia: "rgba(157,107,255,.10)"
  }
];

// ============================================================ NEMICI
// m = moltiplicatore di vita/bottino rispetto alla curva della stanza (varietà dentro l'atto).
const NEMICI = {
  1: [
    { n: "Bug di Sistema", i: "🐛", m: 0.8 },
    { n: "Glitch di Rete", i: "📡", m: 1.0 },
    { n: "Ruggine di Strada", i: "⚙️", m: 1.15 },
    { n: "Ratto di Circuito", i: "🐀", m: 0.9 }
  ],
  2: [
    { n: "Gabbiano di Ferro", i: "🦅", m: 0.85 },
    { n: "Granchio di Titanio", i: "🦀", m: 1.2 },
    { n: "Polpo delle Profondità", i: "🐙", m: 1.0 },
    { n: "Squalo del Golfo", i: "🦈", m: 1.3 }
  ],
  3: [
    { n: "Mariuolo di Vicolo", i: "🎭", m: 0.9 },
    { n: "Scippatore a Reazione", i: "🛵", m: 0.85 },
    { n: "Trombone Glitch", i: "🎺", m: 1.1 },
    { n: "Anima Pezzentella", i: "👻", m: 1.2 }
  ],
  4: [
    { n: "Capuzzella", i: "💀", m: 1.0 },
    { n: "Ragno dei Cunicoli", i: "🕷️", m: 0.9 },
    { n: "Pipistrello di Tufo", i: "🦇", m: 0.85 },
    { n: "Bomba Volatile", i: "💣", m: 1.25 }
  ],
  5: [
    { n: "Lapillo Vivente", i: "🔥", m: 0.9 },
    { n: "Enforcer Balistico", i: "🛡️", m: 1.3 },
    { n: "Golem di Magma", i: "🗿", m: 1.2 },
    { n: "Sfera Oscura 0x00", i: "🪐", m: 1.0 }
  ]
};

// ============================================================ BOSS (i luogotenenti di sinteticoMC)
// Un boss ogni 10 stanze. Oltre la 100 tornano come "Eco" sempre più forti.
const BOSS = [
  { id: "capitano", n: "Il Capitano", i: "🪖", col: "#ffd54a",
    d: "Comandante della Guardia Cromata. Mostrine d'oro, zero pietà.",
    entra: "«Ponticelli è zona rossa, rottame. Torna nel tuo garage.»",
    cade: "«Le mostrine… non valgono niente senza la Rete…»" },
  { id: "misterk", n: "Mister K", i: "🕶️", col: "#35e8ff",
    d: "L'esattore di sinteticoMC. Una sfera di specchio al posto della faccia.",
    entra: "«Ogni lira del quartiere è già mia. Anche la tua.»",
    cade: "«Il conto… non torna…»" },
  { id: "ruggine", n: "Ruggine", i: "🦀", col: "#ff8a3d",
    d: "Granchio-fonderia grande come un rimorchiatore. Arrugginisce tutto il porto.",
    entra: "«Clack. Clack. Il ferro vecchio finisce in fonderia.»",
    cade: "«…mi sto… sciogliendo nel golfo…»" },
  { id: "vipera", n: "La Vipera", i: "🐍", col: "#5dffb4",
    d: "Contrabbandiera di dati del Molo Beverello. Morde in binario.",
    entra: "«Sssei arrivato fin qui? Peccato che il molo sia mio.»",
    cade: "«La merce… tienila tu…»" },
  { id: "gemelli", n: "I Gemelli", i: "🎭", col: "#ff3b5c",
    d: "Due teste CRT, un solo processore. Uno dice sì, l'altro dice no.",
    entra: "«01: Non passi. 10: Non passi. 11: NON PASSI.»",
    cade: "«…00…»" },
  { id: "madonnina", n: "Madonnina Nera", i: "🕯️", col: "#ffd54a",
    d: "Statua di titanio sulle guglie di Spaccanapoli. Piange lava.",
    entra: "«Accendi un cero per te stesso, piccolo robot.»",
    cade: "«Le lacrime… si raffreddano…»" },
  { id: "bomba", n: "Bomba", i: "💣", col: "#ff5a1f",
    d: "BOOM.EXE. La miccia è corta, il carattere pure.",
    entra: "«3… 2… 1… BOOM! Ah no, non ancora.»",
    cade: "«…fsss… pfff…»" },
  { id: "munaciello", n: "'O Munaciello", i: "🏮", col: "#b6ff5c",
    d: "Il folletto dei cunicoli, ora al servizio della Sfera. Ruba lire… o le regala.",
    entra: "«Chi scende nei cunicoli senza bussare, non risale.»",
    cade: "«Tié, guagliò: 'na lira pe' te. Te la sei guadagnata.»" },
  { id: "eco", n: "Eco di Partenope", i: "🧜", col: "#ff3df2",
    d: "Una copia corrotta della sirena. Canta in binario per farti perdere la strada.",
    entra: "«Non sono io quella vera… o sì? Resta qui con me, per sempre.»",
    cade: "«…grazie… adesso ricordo come si canta…»" },
  { id: "smc", n: "sinteticoMC", i: "⚪", col: "#e8fbff",
    d: "La Sfera Cromata. Ha ingoiato la Rete, le lire e il vulcano.",
    entra: "«Ferro Vecchio. Un avanzo di garage contro l'intera Rete del Golfo. Divertente.»",
    cade: "«ERRORE… ERRORE… il Nucleo… si… apre…»" }
];

// ============================================================ IL QUARTIERE (generatori di lire/s)
// Il cuore dell'economia: ogni personaggio riacceso produce lire e illumina la città sullo sfondo.
const QUARTIERE = [
  { id: "aut",  n: "Piccolo Automa",        i: "🤖", base: 15,     prod: 0.5,    d: "Lucidatore devoto, estrae calore dal marciapiede." },
  { id: "lav",  n: "La Lavandaia",          i: "🧺", base: 120,    prod: 3,      d: "Ti pulisce dentro e fuori, e ripulisce i circuiti." },
  { id: "bar",  n: "Il Barista",            i: "☕", base: 1.3e3,  prod: 20,     d: "Caffè bollente di lava e informazioni preziose." },
  { id: "pacc", n: "Pacco il Corriere",     i: "📦", base: 1.4e4,  prod: 130,    d: "Consegna lire e accumulatori in ogni vicolo." },
  { id: "mec",  n: "'O Meccanico",          i: "🔧", base: 1.5e5,  prod: 850,    d: "Ripara e raddrizza i generatori senza giudicare." },
  { id: "pesc", n: "Il Pescatore",          i: "🎣", base: 1.6e6,  prod: 5.4e3,  d: "Estrae metalli fusi dalle profondità del golfo." },
  { id: "art",  n: "L'Artista",             i: "🎨", base: 1.8e7,  prod: 3.5e4,  d: "Plasma sculture termiche che generano energia." },
  { id: "carm", n: "La Cartomante",         i: "🔮", base: 2.1e8,  prod: 2.3e5,  d: "Legge le correnti magmatiche e predice i flussi." },
  { id: "circ", n: "Don Circuito",          i: "⛪", base: 2.4e9,  prod: 1.5e6,  d: "Ex prete, benedice gli alternatori del quartiere." },
  { id: "ros",  n: "Zia Rosetta",           i: "👵", base: 2.8e10, prod: 1.05e7, d: "Conosce ogni conduttura segreta sotto Napoli." },
  { id: "maf",  n: "Robomafioso",           i: "🕴️", base: 3.4e11, prod: 7.2e7,  d: "Due fessure ambrate, calmo e molto produttivo." },
  { id: "enf",  n: "Enforcer di Quartiere", i: "🛡️", base: 4.2e12, prod: 5.2e8,  d: "Pattuglia le fonderie e garantisce la produzione." },
  { id: "squ",  n: "Squalo del Golfo",      i: "🦈", base: 5.5e13, prod: 4e9,    d: "Cacciatore oceanico che incanala le maree di lava." },
  { id: "sfe",  n: "Sfera Cromata",         i: "🔘", base: 7.2e14, prod: 3.2e10, d: "Un frammento di sinteticoMC, riprogrammato. Ora lavora per te." }
];
// Traguardi di quantità: ×2 alla produzione di quel personaggio.
const TRAGUARDI_QUARTIERE = [50, 100, 200, 300, 400, 500];

// ============================================================ OFFICINA
// Braccio Meccanico: livelli infiniti, la fonte principale del danno per colpo.
const BRACCIO = { base: 6, crescita: 1.075, raddoppioOgni: 25 };

// Colpi — Fase 1 (limitata) → Fase 2 "Sintonia di Silicio" → ♾️ Sintonia Infinita
const COLPI_F1 = [
  { id: "cv1", n: "Vigore Meccanico",    i: "🔨", costo: 300,    val: 2, d: "Danno ×2" },
  { id: "cv2", n: "Dita d'Acciaio",      i: "🦾", costo: 2.5e4,  val: 3, d: "Danno ×3" },
  { id: "cv3", n: "Pugno del Capitano",  i: "👊", costo: 2e6,    val: 4, d: "Danno ×4", req: 10 },
  { id: "cv4", n: "Sisma della Sfera",   i: "💥", costo: 3e8,    val: 5, d: "Danno ×5", req: 30 },
  { id: "cv5", n: "Detonatore Termico",  i: "🧨", costo: 6e10,   val: 6, d: "Danno ×6", req: 50 },
  { id: "cv6", n: "Dito Omnilume",       i: "🫰", costo: 1.5e13, val: 8, d: "Danno ×8", req: 70 }
];
const COLPI_F2 = [
  { id: "cv7",  n: "Furia Frutiger Aero",    i: "🌈", costo: 4e15, val: 10, d: "Danno ×10 · Fase 2" },
  { id: "cv8",  n: "Onda Quantica",          i: "🌊", costo: 2e17, val: 15, d: "Danno ×15 · Fase 2" },
  { id: "cv9",  n: "Cuore del Vesuvio",      i: "🌋", costo: 1e19, val: 25, d: "Danno ×25 · Fase 2" },
  { id: "cv10", n: "Dominio di sinteticoMC", i: "👁️", costo: 5e20, val: 50, d: "Danno ×50 · sblocca ♾️ Sintonia Infinita" }
];

// Automi: colpiscono da soli. Livelli infiniti, ogni 25 livelli totali +4% danno e produzione.
const AUTOMI = [
  { id: "ab1", n: "Automa Attaccante",   i: "🤖", base: 150,   crescita: 1.30, val: 1,  d: "+1 colpo automatico al secondo" },
  { id: "ab2", n: "Batteria di Rottame", i: "🔋", base: 1.5e4, crescita: 1.33, val: 2,  d: "+2 colpi automatici al secondo" },
  { id: "ab3", n: "Cecchino del Vicolo", i: "🎯", base: 2e6,   crescita: 1.37, val: 4,  d: "+4 colpi automatici al secondo" },
  { id: "ab4", n: "Plotone Enforcer",    i: "🪖", base: 5e8,   crescita: 1.42, val: 8,  d: "+8 colpi automatici al secondo" },
  { id: "ab5", n: "Armata della Sfera",  i: "👽", base: 2e11,  crescita: 1.48, val: 16, d: "+16 colpi automatici al secondo" }
];
const PROTOCOLLO = { sblocco: 60, durata: 12, ricarica: 75, danno: 8 };

// Statistiche infinite (con rendimenti decrescenti)
const STAT = [
  { k: "multi",  n: "Cadenza Multicolpo",     i: "⚡", base: 2e3, crescita: 2.5,
    d: "+5% di probabilità di colpire 2 o 3 volte in un colpo solo" },
  { k: "sovra",  n: "Potenza Sovraccarico",   i: "🔥", base: 5e3, crescita: 2.6,
    d: "+25% di danno durante il Sovraccarico Termico" },
  { k: "fend",   n: "Fendente a Dispersione", i: "🪓", base: 8e3, crescita: 2.5,
    d: "+8% del colpo si propaga a tutta l'orda" }
];

const PRODUZIONE = [
  { id: "pu1", n: "Scintilla Y2K",          i: "✨", costo: 1e3,    val: 1.25, d: "Produzione del quartiere +25%" },
  { id: "pu2", n: "Patina Lucida",          i: "🪩", costo: 5e4,    val: 1.5,  d: "Produzione +50%" },
  { id: "pu3", n: "Reflex a Bolla",         i: "🫧", costo: 2.5e6,  val: 1.5,  d: "Produzione +50%" },
  { id: "pu4", n: "Cromature a Specchio",   i: "🪞", costo: 1.5e8,  val: 2,    d: "Produzione ×2" },
  { id: "pu5", n: "Riflesso Acqua e Vetro", i: "💧", costo: 1e10,   val: 2,    d: "Produzione ×2" },
  { id: "pu6", n: "Bloom e Bagliori",       i: "☀️", costo: 8e11,   val: 2.5,  d: "Produzione ×2,5" },
  { id: "pu7", n: "Lens Flare Divino",      i: "🌈", costo: 6e13,   val: 3,    d: "Produzione ×3 · sblocca ♾️ Overdrive" }
];
const CRITICO = [
  { id: "uc1", n: "Fortuna di Gamba",            i: "🍀", costo: 800,   val: 0.05, d: "Critico +5%" },
  { id: "uc2", n: "Cenere del Fortunato",        i: "🌫️", costo: 4e5,   val: 0.08, d: "Critico +8%" },
  { id: "uc3", n: "Benedizione di Don Circuito", i: "✝️", costo: 3e8,   val: 0.10, d: "Critico +10%" },
  { id: "uc4", n: "Occhio di Ruggine",           i: "👁️", costo: 5e11,  val: 0.12, d: "Critico +12% · sblocca ♾️ Occhio Infinito" }
];
const CORAZZA = [
  { id: "uhp1", n: "Piastre Rinforzate",         i: "🛡️", costo: 2e3,   val: 0.5,  d: "Energia massima +50%" },
  { id: "uhp2", n: "Corazzatura del Golfo",      i: "🧱", costo: 3e5,   val: 1,    d: "Energia massima +100%" },
  { id: "uhp3", n: "Nucleo di Titanio",          i: "💠", costo: 8e7,   val: 2,    d: "Energia massima +200%" },
  { id: "uhp4", n: "Scudo di Lava Solidificata", i: "🌋", costo: 4e10,  val: 3,    d: "Energia massima +300%" },
  { id: "uhp5", n: "Scheletro di Adamantio",     i: "⛓️", costo: 2e13,  val: 5,    d: "Energia massima +500%" }
];
const RIGENERA = [
  { id: "ureg1", n: "Nanomacchina Riparatrice", i: "🩹", costo: 5e3,  val: 2, d: "Rigenerazione ×2" },
  { id: "ureg2", n: "Campo Rigenerativo",       i: "💚", costo: 2e7,  val: 3, d: "Rigenerazione ×3" },
  { id: "ureg3", n: "Fonte del Golfo",          i: "⛲", costo: 5e10, val: 4, d: "Rigenerazione ×4" }
];
const OFFLINE = [
  { id: "uoff1", n: "Raffreddamento Notturno", i: "🌙", costo: 5e4,  val: 0.5, d: "Guadagni da assenza +50%" },
  { id: "uoff2", n: "Vigile del Vesuvio",      i: "⭐", costo: 5e7,  val: 1,   d: "Guadagni da assenza +100%" },
  { id: "uoff3", n: "Guardia del Golfo",       i: "🛰️", costo: 5e10, val: 2,   d: "Guadagni da assenza +200%" }
];

// Livelli infiniti sbloccati completando le catene
const INFINITI = {
  click: { n: "Sintonia Infinita di Silicio", base: 1e21, crescita: 3.2, per: 1.75 },
  prod:  { n: "Overdrive Produttivo Eterno",  base: 2e14, crescita: 3.4, per: 2.0 },
  crit:  { n: "Occhio Infinito di Ruggine",   base: 2e12, crescita: 4.0, per: 0.02 }
};

// ============================================================ MERCERIA (oggetti e set)
const RARITA = {
  comune:      { n: "Comune",      col: "#b8c4d6", lv: 1 },
  rara:        { n: "Rara",        col: "#35e8ff", lv: 2 },
  epica:       { n: "Epica",       col: "#b07bff", lv: 4 },
  leggendaria: { n: "Leggendaria", col: "#ffd54a", lv: 7 },
  mitica:      { n: "Mitica",      col: "#ff3df2", lv: 12 }
};
// Due pezzi dello stesso set equipaggiati attivano la sinergia, tre la potenziano.
const SET = {
  vesuvio:   { n: "Set Vesuvio",       i: "🌋", col: "#ff5a1f", b2: "Danno ×2 in Sovraccarico",            b3: "e il Sovraccarico dura 15 s" },
  enforcer:  { n: "Set Enforcer",      i: "🛡️", col: "#8fb2cc", b2: "Energia +50%, colpi dei boss -20%",  b3: "e ogni colpo subito ti ricarica il calore" },
  frutiger:  { n: "Set Frutiger Aero", i: "🫧", col: "#7fe6ff", b2: "Produzione ×3",                       b3: "e guadagni da assenza ×2" },
  robomafia: { n: "Set Robomafia",     i: "🕶️", col: "#ffb020", b2: "Lire dai nemici ×2,5 e Merceria -20%", b3: "e un Biglietto da ogni élite" },
  sistema:   { n: "Set SISTEMA.EXE",   i: "👁️", col: "#b07bff", b2: "Automi ×2 e danno ×1,35",            b3: "e il Protocollo si ricarica in metà tempo" },
  partenope: { n: "Set Partenope",     i: "🧜", col: "#ff3df2", b2: "Danno e produzione ×1,5",              b3: "e +50% Braci dall'Eruzione" }
};
const OGGETTI = [
  { id: "a_vesuvio",  n: "Nucleo Termico",       set: "vesuvio",   slot: "acc",     i: "🌋", rar: "rara",        costo: 8e3,   d: "Accumulatore che assorbe il calore del suolo." },
  { id: "w_vesuvio",  n: "Ali del Vesuvio",      set: "vesuvio",   slot: "wings",   i: "🪽", rar: "epica",       costo: 5e6,   d: "Piume di roccia fusa ed energia magmatica." },
  { id: "h_vesuvio",  n: "Corona di Lava",       set: "vesuvio",   slot: "hat",     i: "👑", rar: "leggendaria", costo: 4e9,   d: "Corona incandescente forgiata nel cratere." },
  { id: "a_enforcer", n: "Spallacci d'Acciaio",  set: "enforcer",  slot: "acc",     i: "🦺", rar: "comune",      costo: 2.5e3, d: "Blindatura pesante di recupero industriale." },
  { id: "w_enforcer", n: "Lame Corazzate",       set: "enforcer",  slot: "wings",   i: "🛠️", rar: "rara",        costo: 1.2e5, d: "Piastre balistiche saldate sulle scapole." },
  { id: "e_enforcer", n: "Visore Tattico",       set: "enforcer",  slot: "eyes",    i: "🥽", rar: "rara",        costo: 1.5e6, d: "Mirino balistico ad alto contrasto." },
  { id: "f_frutiger", n: "Bolla d'Acqua Y2K",    set: "frutiger",  slot: "fx",      i: "🫧", rar: "epica",       costo: 3.5e7, d: "Riflessi liquidi che ottimizzano la rete." },
  { id: "h_frutiger", n: "Aureola Aurora",       set: "frutiger",  slot: "hat",     i: "🌌", rar: "epica",       costo: 4e8,   d: "Bagliore azzurro-menta rilassante." },
  { id: "w_frutiger", n: "Ali Quantiche",        set: "frutiger",  slot: "wings",   i: "🌀", rar: "leggendaria", costo: 2.5e10,d: "Superfici cromate e gradienti d'acqua lucidi." },
  { id: "h_mafia",    n: "Coppola in Titanio",   set: "robomafia", slot: "hat",     i: "🧢", rar: "rara",        costo: 2e5,   d: "Copricapo corazzato: rispetto del quartiere." },
  { id: "a_mafia",    n: "Borsa di Lire",        set: "robomafia", slot: "acc",     i: "💰", rar: "epica",       costo: 5e7,   d: "Tintinnio continuo di contante." },
  { id: "e_mafia",    n: "Fessure Ambrate",      set: "robomafia", slot: "eyes",    i: "😎", rar: "leggendaria", costo: 1.8e10,d: "Sguardo lento, calmo e minaccioso." },
  { id: "a_sistema",  n: "Antenna Glitch",       set: "sistema",   slot: "antenna", i: "📡", rar: "epica",       costo: 8e8,   d: "Ricevitore sub-bass a bassissima latenza." },
  { id: "e_sistema",  n: "Visore 0x00",          set: "sistema",   slot: "eyes",    i: "👁️", rar: "leggendaria", costo: 3e11,  d: "Interfaccia diretta con la coscienza IA." },
  { id: "f_sistema",  n: "Sfera Manifestata",    set: "sistema",   slot: "fx",      i: "🔘", rar: "mitica",      costo: 1e13,  d: "Sfera cromata pura che sincronizza ogni automa." },
  { id: "h_partenope",n: "Corona di Conchiglie", set: "partenope", slot: "hat",     i: "🐚", rar: "leggendaria", costo: 5e14,  d: "Dono della sirena. Profuma di salsedine e ozono.", solo: "eruzione" },
  { id: "w_partenope",n: "Pinne di Neon",        set: "partenope", slot: "wings",   i: "🧜", rar: "mitica",      costo: 5e16,  d: "Pinne olografiche: nuotano nell'aria.", solo: "eruzione" },
  { id: "f_partenope",n: "Canto della Sirena",   set: "partenope", slot: "fx",      i: "🎶", rar: "mitica",      costo: 5e18,  d: "Un'onda sonora che riaccende i lampioni.", solo: "eruzione" }
];

// ============================================================ FERRO VECCHIO (personalizzazione)
// Pezzi estetici comprati con i Rottami ⚙️. Ali, effetti e alcuni pezzi arrivano dalla Merceria.
const TINTE = ["3fa8d8", "ffd54a", "ff5a1f", "5dffb4", "b07bff", "ff3df2", "35e8ff", "8fb2cc", "e7d3b0", "d0524d", "00ff41", "e6f6ff", "2a2440", "c0c0c0"];
const TELAI = [
  { id: "ferro",   n: "Ferro Vecchio",     costo: 0,   d: "Anni '60, bulloni a vista, onesto e indistruttibile." },
  { id: "andro",   n: "Androide Aero",     costo: 150, d: "Polimeri lucidi e linee Frutiger Aero." },
  { id: "mario",   n: "Mariuolo",          costo: 250, d: "Agile, scarno, con schermo CRT di recupero." },
  { id: "enforce", n: "Enforcer",          costo: 500, d: "Corazza d'acciaio saldata, piastre balistiche." }
];
const OCCHI = [
  { id: "visore", n: "Visore",           costo: 0 },
  { id: "due",    n: "Occhioni",         costo: 60 },
  { id: "mono",   n: "Monocolo",         costo: 90 },
  { id: "crt",    n: "Schermo CRT",      costo: 200 }
];
const ANTENNE = [
  { id: "none", n: "Nessuna",         costo: 0 },
  { id: "p",    n: "Antennina",       costo: 40 },
  { id: "g",    n: "Traliccio Radio", costo: 120 },
  { id: "d",    n: "Parabola Y2K",    costo: 260 }
];
const CAPPELLI = [
  { id: "none", n: "Nessuno",           costo: 0 },
  { id: "b",    n: "Berretto",          costo: 50 },
  { id: "c",    n: "Coppola",           costo: 140 },
  { id: "boss", n: "Cilindro del Boss", costo: 300 }
];
const ACCESSORI = [
  { id: "none", n: "Nessuno",            costo: 0 },
  { id: "grem", n: "Grembiule Barista",  costo: 70 },
  { id: "attx", n: "Cintura Attrezzi",   costo: 110 },
  { id: "oro",  n: "Catenaccio d'Oro",   costo: 240 }
];
const ARMI = [
  { id: "none", n: "Pugni nudi",       costo: 0 },
  { id: "chia", n: "Chiave Inglese",   costo: 60 },
  { id: "spad", n: "Tubo al Plasma",   costo: 160 },
  { id: "pist", n: "Pistola a Lava",   costo: 320 }
];

// ============================================================ ERUZIONE (prestigio) — Circuiti di Partenope
// Dopo aver liberato Partenope il vulcano può "eruttare": la città ricomincia, tu tieni le Braci 🔥.
const CIRCUITI = [
  { id: "lava",    n: "Lava nelle Vene",     i: "🩸", max: 50, costo: l => 1 + l,          d: "Danno ×1,25 per livello" },
  { id: "quart",   n: "Quartiere Fedele",    i: "🏘️", max: 50, costo: l => 1 + l,          d: "Produzione ×1,25 per livello" },
  { id: "memoria", n: "Memoria di Ferro",    i: "🧠", max: 10, costo: l => 2 + l * 2,      d: "Ogni ciclo parte con il Braccio al livello +25 per livello" },
  { id: "occhio",  n: "Occhio della Sirena", i: "👁️", max: 10, costo: l => 2 + l,          d: "Critico +2% per livello" },
  { id: "pazienza",n: "Pazienza di Partenope",i: "⏳", max: 10, costo: l => 3 + l * 2,     d: "Tempo contro i boss +5 s per livello" },
  { id: "automi",  n: "Automi Veterani",     i: "🤖", max: 25, costo: l => 2 + l,          d: "Automi +25% per livello" },
  { id: "fortuna", n: "Fortuna del Golfo",   i: "🍀", max: 10, costo: l => 2 + l,          d: "Gocce di lava più frequenti e più ricche" },
  { id: "canto",   n: "Canto Notturno",      i: "🌙", max: 10, costo: l => 2 + l,          d: "Assenza: +2 ore di limite e +25% guadagni" }
];

// ============================================================ TROFEI
// c: condizione su S · r: ricompensa [rottami, biglietti]
const TROFEI = [
  { id: "t_lire1",  i: "🪙", n: "Prima Lira",             d: "Guadagna 1.000 lire",                 c: s => s.totLire >= 1e3,  r: [25, 0] },
  { id: "t_lire2",  i: "💶", n: "Milionario di Vicolo",   d: "Guadagna 1 milione di lire",          c: s => s.totLire >= 1e6,  r: [80, 1] },
  { id: "t_lire3",  i: "💰", n: "Miliardario del Porto",  d: "Guadagna 1 miliardo di lire",         c: s => s.totLire >= 1e9,  r: [250, 2] },
  { id: "t_lire4",  i: "🏦", n: "Il Vulcano è Legge",     d: "Guadagna 1.000 miliardi di lire",     c: s => s.totLire >= 1e12, r: [800, 4] },
  { id: "t_lire5",  i: "👑", n: "Trilionario del Golfo",  d: "Guadagna 500T di lire",               c: s => s.totLire >= 5e14, r: [5000, 10] },
  { id: "t_gen1",   i: "💡", n: "Prima Finestra Accesa",  d: "Riaccendi un personaggio del quartiere", c: s => contaQuartiere(s) >= 1, r: [15, 0] },
  { id: "t_gen2",   i: "🏘️", n: "Quartiere Vivo",         d: "Possiedi 50 personaggi",              c: s => contaQuartiere(s) >= 50, r: [60, 1] },
  { id: "t_gen3",   i: "🌆", n: "Napoli si Riaccende",    d: "Possiedi 250 personaggi",             c: s => contaQuartiere(s) >= 250, r: [300, 3] },
  { id: "t_gen4",   i: "🔘", n: "La Sfera è Nostra",      d: "Riprogramma una Sfera Cromata",       c: s => (s.gen.sfe || 0) >= 1, r: [2000, 8] },
  { id: "t_kill1",  i: "⚔️", n: "Primo Sangue di Silicio", d: "Elimina 100 nemici",                c: s => s.kills >= 100,  r: [40, 0] },
  { id: "t_kill2",  i: "🗡️", n: "Macellatore di Codici",  d: "Elimina 2.500 nemici",               c: s => s.kills >= 2500, r: [300, 2] },
  { id: "t_kill3",  i: "☠️", n: "Signore delle Orde",     d: "Elimina 25.000 nemici",              c: s => s.kills >= 25000, r: [1500, 5] },
  { id: "t_st10",   i: "🚪", n: "Fuori dal Garage",       d: "Raggiungi la stanza 11",               c: s => s.maxStanza >= 11, r: [50, 1] },
  { id: "t_st25",   i: "⚓", n: "Odore di Mare",          d: "Raggiungi la stanza 25",               c: s => s.maxStanza >= 25, r: [120, 1] },
  { id: "t_st50",   i: "⛪", n: "Tra le Guglie",          d: "Raggiungi la stanza 50",               c: s => s.maxStanza >= 50, r: [400, 2] },
  { id: "t_st75",   i: "🕳️", n: "Sotto Napoli",           d: "Raggiungi la stanza 75",               c: s => s.maxStanza >= 75, r: [900, 3] },
  { id: "t_st100",  i: "🌋", n: "Sull'Orlo del Cratere",  d: "Raggiungi la stanza 100",              c: s => s.maxStanza >= 100, r: [2000, 5] },
  { id: "t_st150",  i: "🌠", n: "Oltre il Cratere",       d: "Raggiungi la stanza 150",              c: s => s.maxStanza >= 150, r: [5000, 10] },
  { id: "t_boss1",  i: "🪖", n: "Degradato",              d: "Sconfiggi Il Capitano",                c: s => s.bossVinti >= 1, r: [100, 1] },
  { id: "t_boss5",  i: "🎭", n: "Spegni i Gemelli",       d: "Sconfiggi 5 boss",                     c: s => s.bossVinti >= 5, r: [500, 3] },
  { id: "t_libera", i: "🧜", n: "Partenope è Libera",     d: "Sconfiggi sinteticoMC",                c: s => s.bossVinti >= 10 || s.ciclo > 1, r: [3000, 10] },
  { id: "t_eruz",   i: "🔥", n: "Eruzione!",              d: "Fai eruttare il Vesuvio",              c: s => s.ciclo >= 2, r: [1000, 5] },
  { id: "t_eruz3",  i: "♨️", n: "Figlio del Vulcano",     d: "Arriva al terzo ciclo",                c: s => s.ciclo >= 3, r: [3000, 10] },
  { id: "t_click",  i: "🖱️", n: "Dito d'Acciaio",         d: "Colpisci 10.000 volte",                c: s => s.stats.click >= 1e4, r: [400, 1] },
  { id: "t_sovra",  i: "🔥", n: "Sangue Caldo",           d: "Attiva 25 Sovraccarichi",              c: s => s.stats.sovra >= 25, r: [200, 1] },
  { id: "t_multi",  i: "⚡", n: "Tre Colpi in Uno",       d: "Scatena 1.000 multicolpi",             c: s => s.stats.multi >= 1000, r: [250, 1] },
  { id: "t_proto",  i: "☄️", n: "Protocollo Vesuvio",     d: "Attiva il Protocollo degli automi",    c: s => s.stats.proto >= 1, r: [300, 2] },
  { id: "t_braccio",i: "💪", n: "Braccio di Ferro",       d: "Braccio Meccanico al livello 100",     c: s => s.braccio >= 100, r: [500, 2] },
  { id: "t_goccia", i: "💧", n: "Cacciatore di Lava",     d: "Raccogli 25 gocce di lava",            c: s => s.stats.gocce >= 25, r: [200, 2] },
  { id: "t_mini",   i: "🎮", n: "Sala Giochi",            d: "Gioca 10 minigiochi",                  c: s => s.stats.mini >= 10, r: [150, 1] },
  { id: "t_ruota",  i: "🎡", n: "Giro della Fortuna",     d: "Gira la ruota 10 volte",               c: s => s.stats.ruota >= 10, r: [150, 1] },
  { id: "t_set",    i: "🧩", n: "Sinergia!",              d: "Attiva una sinergia di set",           c: s => s.stats.setAttivo >= 1, r: [150, 1] },
  { id: "t_coll",   i: "🛍️", n: "Collezionista",          d: "Possiedi 10 oggetti della Merceria",   c: s => s.inv.length >= 10, r: [600, 3] },
  { id: "t_look",   i: "🎨", n: "Guappo di Cartone",      d: "Cambia 5 pezzi del tuo robot",         c: s => s.stats.look >= 5, r: [80, 0] },
  { id: "t_comm",   i: "📋", n: "Uomo di Fiducia",        d: "Completa 20 commissioni",              c: s => s.stats.comm >= 20, r: [500, 3] },
  { id: "t_ritir",  i: "↩️", n: "Ritirata Strategica",    d: "Ritirati da un boss e poi battilo",    c: s => s.stats.rivincite >= 1, r: [100, 1] }
];
function contaQuartiere(s) { let n = 0; for (const k in s.gen) n += s.gen[k] || 0; return n; }

// ============================================================ COMMISSIONI (missioni a rotazione)
// k: statistica osservata · q(s): quantità richiesta in base ai progressi
const COMMISSIONI = [
  { k: "kills",  i: "⚔️", t: q => `Elimina ${q} nemici`,                 q: s => 25 + Math.floor(s.maxStanza * 2.5) },
  { k: "click",  i: "👆", t: q => `Colpisci ${q} volte`,                 q: s => 150 + s.maxStanza * 5 },
  { k: "gen",    i: "🏘️", t: q => `Riaccendi ${q} personaggi`,            q: s => 5 + Math.floor(s.maxStanza / 8) },
  { k: "sovra",  i: "🔥", t: q => `Attiva ${q} Sovraccarichi`,            q: () => 2 },
  { k: "boss",   i: "💀", t: q => `Sconfiggi ${q} boss`,                  q: () => 1, min: 9 },
  { k: "gocce",  i: "💧", t: q => `Raccogli ${q} gocce di lava`,          q: () => 2 },
  { k: "mini",   i: "🎮", t: q => `Gioca ${q} minigiochi`,               q: () => 1 },
  { k: "elite",  i: "⭐", t: q => `Elimina ${q} élite`,                   q: s => 3 + Math.floor(s.maxStanza / 20) },
  { k: "upg",    i: "🔧", t: q => `Compra ${q} potenziamenti in Officina`, q: s => 10 + Math.floor(s.maxStanza / 5) }
];

// ============================================================ RADIO PARTENOPE (la trama)
const STORIA = {
  intro: [
    "📡 …segnale pirata agganciato. Frequenza 88.0 — Radio Partenope.",
    "Napoli, 2099. Una sfera cromata chiamata sinteticoMC si è presa la Rete del Golfo: le lire, le luci, perfino il Vesuvio. Ne ha fatto un server a lava.",
    "Io sono PARTENOPE. Ero la voce che teneva accesa questa città. Mi ha chiusa nel Nucleo, sotto il cratere, e i quartieri si stanno spegnendo uno a uno.",
    "Nel garage DaProd di Ponticelli, tra stampanti 3D e casse di rottami, c'è un robot che nessuno voleva più. Ferro Vecchio. Sei tu.",
    "Scendi stanza dopo stanza. Riaccendi il quartiere. E vieni a prendermi. Jamme, guagliò."
  ],
  atti: {
    1: "Atto I — PONTICELLI. Il quartiere è al buio, ma la gente c'è ancora. Ogni personaggio che riaccendi è una finestra che torna a brillare.",
    2: "Atto II — IL GOLFO. Il porto puzza di ruggine e di dati rubati. Mister K ti ha visto: da qui in poi ti aspettano.",
    3: "Atto III — SPACCANAPOLI. Vicoli stretti, guglie, presepi che si muovono da soli. Non fidarti di chi ti sorride due volte.",
    4: "Atto IV — NAPOLI SOTTERRANEA. Sotto la città c'è un'altra città. Nel tufo si sentono ancora le voci. Una di queste è la mia.",
    5: "Atto V — IL CRATERE. Il Nucleo è qui sotto. Sento il tuo segnale, Ferro Vecchio. Sei vicinissimo.",
    6: "OLTRE IL CRATERE. La città è libera, ma la Rete è grande. Le Eco dei luogotenenti tornano sempre più forti. Quanto in fondo vuoi arrivare?"
  },
  eventi: {
    primoGen: "Hai visto? Una finestra si è accesa laggiù. È così che si riprende una città: una persona alla volta.",
    primoBoss: "Un boss sbarra la strada. Hai poco tempo prima che ti ricacci indietro: se non ce la fai, ritirati, potenziati e riprova.",
    primaCaduta: "Ti hanno abbattuto, ma i rottami non muoiono mai davvero. Riparati o ritirati: nessuna vergogna nel tornare più forti.",
    primoSovra: "SOVRACCARICO! Il tuo nucleo termico è al massimo: finché dura, ogni colpo vale doppio e mezzo.",
    automi: "Gli automi del garage ti seguono: colpiscono da soli anche quando riposi le mani.",
    protocollo: "PROTOCOLLO VESUVIO sbloccato. Quando gli automi sono tanti, possono sparare tutti insieme. Usalo contro i boss.",
    goccia: "Quelle gocce che cadono dal cratere sono lava pura. Raccoglile al volo: portano fortuna.",
    finale: "…Ferro Vecchio. Il Nucleo è aperto. Sono libera. Guarda la città: si sta riaccendendo tutta, dal porto alle guglie.",
    finale2: "Il Vesuvio adesso è pieno della nostra luce. Se vuoi, possiamo farlo ERUTTARE: la città ricomincia da capo, più forte, e tu ricorderai tutto sotto forma di Braci.",
    eruzione: "ERUZIONE! Il cielo si è fatto d'oro. Nuovo ciclo, stesse strade, ma adesso le Braci ti scaldano i circuiti."
  }
};

// ============================================================ NOVITÀ (mostrate in gioco al primo avvio di una versione)
const NOVITA = {
  "v2.1.0": {
    titolo: "Le Lire DaProd",
    punti: [
      "Un portafoglio solo per tutti i giochi DaProd: Neon, Coin Dozer e Claw Machine si dividono le stesse lire.",
      "Quello che guadagni fa punti della partita. Quando vuoi smettere premi Stacca: diventano Lire DaProd.",
      "La Borsa della Lira: la quotazione sale quando si spende e scende quando si incassa. Stacca al momento giusto.",
      "Con le Lire ricarichi il quartiere, e dentro la DaProd Suite boss ed eruzioni ti danno carte per la slot.",
      "Il portafoglio è la barra in basso a destra: sul telefono è il tondo ₤."
    ]
  },
  "v2.0.0": {
    titolo: "Il remake: NEON PARTENOPE",
    punti: [
      "Nuovo nome, nuova trama: Radio Partenope ti guida nella discesa verso il Nucleo del Vesuvio.",
      "Cinque atti con cieli e nemici diversi, dieci boss con il loro tempo limite e la ritirata strategica.",
      "Braccio Meccanico a livelli infiniti, automi più intelligenti e il Protocollo Vesuvio.",
      "Eruzione: libera Partenope, fai eruttare il vulcano e ricomincia con le Braci e i Circuiti.",
      "Commissioni del quartiere, set Partenope, musica synth generata dal vivo.",
      "Si gioca da telefono, tablet e computer. App per Android, Windows e Mac in ogni release."
    ]
  }
};
