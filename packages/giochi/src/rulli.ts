/**
 * I rulli e i pezzi: la roba che gira.
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
 * la rarita'. Un gatto lo pensa chiunque; un palombaro in un campo di grano no.
 */

import { STILI_IMMAGINE_DI_PARTENZA } from "@daprod/azioni";
import type { Pezzo, Rullo } from "./tipi";

/**
 * I segni sopra le lettere, per toglierli.
 *
 * ⚠ Scritto con `new RegExp` e non come `/[…]/`, di proposito: in una regex
 * scritta a mano quei due estremi sono **caratteri combinanti veri** dentro il
 * file, invisibili in qualunque editor e i primi a rompersi quando il file
 * passa da una codifica all'altra. Qui il sorgente resta di sole lettere ASCII.
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

/* ================================================================= immagini */

export const RULLI_IMMAGINI: Rullo[] = [
  { id: "soggetto", nome: "Chi", tavolo: "immagini", spiega: "Chi o cosa si vede" },
  { id: "azione", nome: "Che fa", tavolo: "immagini", spiega: "Cosa sta succedendo" },
  { id: "posto", nome: "Dove", tavolo: "immagini", spiega: "Il posto attorno" },
  { id: "luce", nome: "Che luce", tavolo: "immagini", spiega: "Che ora e' e da dove batte" },
  { id: "stile", nome: "Come", tavolo: "immagini", spiega: "Come e' fatta l'immagine" },
  { id: "dettaglio", nome: "E poi", tavolo: "immagini", spiega: "La cosa che la rende sua" },
];

const SOGGETTI = pezzi("soggetto", [
  ["Un gatto", "a cat", 0.95],
  ["Un cane bagnato", "a wet dog", 0.88],
  ["Una vecchia signora", "an old woman", 0.82],
  ["Un bambino", "a small child", 0.85],
  ["Un vecchio pescatore", "an old fisherman", 0.6],
  ["Un astronauta", "an astronaut", 0.72],
  ["Un robot arrugginito", "a rusted robot", 0.5],
  ["Un cavaliere in armatura", "a knight in full armor", 0.66],
  ["Una ballerina", "a ballet dancer", 0.7],
  ["Un pugile a fine incontro", "a boxer after the fight", 0.45],
  ["Un cameriere", "a waiter in a white jacket", 0.44],
  ["Una band di strada", "a street band", 0.4],
  ["Un motociclista", "a motorcyclist", 0.62],
  ["Un palombaro", "a deep sea diver in a brass helmet", 0.16],
  ["Un fantasma educato", "a polite ghost", 0.12],
  ["Un pupazzo di neve storto", "a lopsided snowman", 0.3],
  ["Una statua che respira", "a breathing marble statue", 0.09],
  ["Un lupo bianco", "a white wolf", 0.55],
  ["Un polpo", "an octopus", 0.5],
  ["Uno stormo di storni", "a murmuration of starlings", 0.22],
  ["Un pianista cieco", "a blind pianist", 0.14],
  ["Un venditore di angurie", "a watermelon seller", 0.18],
  ["Un portiere sotto la pioggia", "a goalkeeper in the rain", 0.28],
  ["Una sposa scalza", "a barefoot bride", 0.2],
  ["Un tram vuoto", "an empty tram", 0.26],
  ["Un gigante gentile", "a gentle giant", 0.24],
  ["Una Vespa del cinquanta", "a vintage Vespa scooter", 0.34],
  ["Una nonna con la pistola", "a grandmother holding a revolver", 0.07],
  ["Un coro di bambini", "a children choir", 0.3],
  ["Un uomo con la testa di pesce", "a man with a fish head", 0.05],
]);

const AZIONI = pezzi("azione", [
  ["Guarda in camera", "looking straight into the camera", 0.9],
  ["Corre", "running", 0.88],
  ["Dorme", "sleeping", 0.84],
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
  ["Fa il saluto militare", "saluting", 0.26],
  ["Attraversa a nuoto", "swimming across", 0.22],
  ["Prende fuoco piano piano", "slowly catching fire", 0.06],
  ["Vola a un metro da terra", "floating one meter above the ground", 0.08],
  ["Legge una lettera vecchia", "reading an old letter", 0.32],
  ["Si specchia in una pozzanghera", "looking at their reflection in a puddle", 0.18],
]);

const POSTI = pezzi("posto", [
  ["In cucina", "in a kitchen", 0.9],
  ["Per strada", "on a street", 0.92],
  ["In riva al mare", "on the seashore", 0.8],
  ["In un bosco", "in a forest", 0.78],
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
  ["Sott'acqua", "underwater", 0.46],
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
  ["Alba di nebbia", "foggy dawn, diffused light", 0.3],
  ["Luce da acquario", "aquarium light, blue caustics", 0.14],
  ["Fari di macchina", "car headlights cutting through", 0.26],
  ["Neve che riflette", "snow bounce light, cold and even", 0.22],
  ["Proiettore da cinema", "projector beam through dust", 0.12],
  ["Luna piena", "full moon light, blue and quiet", 0.42],
  ["Fuoco", "firelight, orange and moving", 0.38],
  ["Luce da ospedale", "flat fluorescent hospital light", 0.24],
]);

const DETTAGLI = pezzi("dettaglio", [
  ["Ha piovuto da poco", "wet ground, fresh rain", 0.5],
  ["Polvere nell'aria", "dust floating in the air", 0.34],
  ["Uno specchio rotto", "a broken mirror in frame", 0.2],
  ["Palloncini rossi", "red balloons", 0.24],
  ["Un'ombra che non torna", "a shadow that does not match", 0.08],
  ["Tutto storto di un grado", "everything tilted one degree", 0.1],
  ["Il colore quasi tutto via", "almost desaturated, one color left", 0.22],
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
]);

/**
 * Gli stili, presi da dove stanno: `@daprod/azioni`.
 *
 * Il prezzo lo fa `quantoComune`, e qui e' 0,5 fisso per tutti — non perche'
 * sia vero, ma perche' e' onesto: non sappiamo quale stile sia piu' raro, e
 * inventarsi un numero per fare colore vorrebbe dire dare un Leggendario a
 * caso. L'admin puo' cambiare il prezzo di ognuno, e quello si' che e' un dato.
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
  ...AZIONI,
  ...POSTI,
  ...LUCI,
  ...STILI,
  ...DETTAGLI,
];

/* =================================================================== musica */

/**
 * I rulli della musica.
 *
 * Il rullo dei generi non sta qui: sono 6.291 voci vere (Every Noise / Spotify,
 * rank di popolarita' dal Wayback 2023) e stanno in `dati/generi.ts`, che e' un
 * file di soli dati. Le liste corte invece stanno qui, con le altre.
 */
export const RULLI_MUSICA: Rullo[] = [
  { id: "genere", nome: "Genere", tavolo: "musica", spiega: "Da che parte sta il pezzo" },
  { id: "voce", nome: "Voce", tavolo: "musica", spiega: "Chi canta, e come" },
  { id: "strumenti", nome: "Suonato con", tavolo: "musica", spiega: "Cosa si sente davanti" },
  { id: "atmosfera", nome: "Che aria", tavolo: "musica", spiega: "Come deve far sentire" },
  { id: "epoca", nome: "Di quando", tavolo: "musica", spiega: "Di che anni sa" },
  { id: "andatura", nome: "Andatura", tavolo: "musica", spiega: "Quanto corre" },
];

const VOCI = pezzi("voce", [
  ["Voce d'uomo bassa", "deep male vocals", 0.7],
  ["Voce di donna alta", "high female vocals", 0.7],
  ["Coro", "choir vocals", 0.4],
  ["Sussurrata", "whispered vocals", 0.3],
  ["Urlata", "shouted vocals", 0.34],
  ["Strumentale", "instrumental, no vocals", 0.6],
  ["Due voci insieme", "male and female duet", 0.36],
  ["Voce rotta", "raspy worn out voice", 0.26],
  ["Voce di bambino", "child vocals", 0.16],
  ["Parlata", "spoken word", 0.22],
  ["Vocoder", "vocoder vocals", 0.18],
  ["Napoletana", "neapolitan vocals, italian lyrics", 0.12],
]);

const STRUMENTI = pezzi("strumenti", [
  ["Chitarra elettrica", "electric guitar", 0.85],
  ["Pianoforte", "grand piano", 0.8],
  ["Basso grosso", "fat bass line", 0.66],
  ["Batteria vera", "live acoustic drums", 0.62],
  ["Drum machine", "808 drum machine", 0.5],
  ["Archi", "string section", 0.44],
  ["Fiati", "brass section", 0.36],
  ["Sintetizzatore analogico", "analog synth", 0.46],
  ["Organo", "hammond organ", 0.3],
  ["Mandolino", "mandolin", 0.14],
  ["Fisarmonica", "accordion", 0.18],
  ["Campionamento sporco", "dusty vinyl sample", 0.28],
  ["Solo voce e chitarra", "just voice and acoustic guitar", 0.4],
  ["Theremin", "theremin", 0.06],
]);

const ATMOSFERE = pezzi("atmosfera", [
  ["Allegra", "upbeat and happy", 0.86],
  ["Triste", "melancholic", 0.8],
  ["Arrabbiata", "angry and loud", 0.6],
  ["Notturna", "late night mood", 0.5],
  ["Da ballare", "danceable, club ready", 0.66],
  ["Da film", "cinematic and wide", 0.44],
  ["Malinconica ma che balla", "melancholic but danceable", 0.24],
  ["Sporca", "lo-fi and dirty", 0.34],
  ["Solenne", "solemn and grand", 0.26],
  ["Da festa di paese", "village festival, joyful mess", 0.14],
  ["Inquieta", "uneasy, something is wrong", 0.2],
  ["Dolce", "tender and warm", 0.5],
]);

const EPOCHE = pezzi("epoca", [
  ["Anni sessanta", "60s recording, mono warmth", 0.4],
  ["Anni settanta", "70s analog production", 0.5],
  ["Anni ottanta", "80s production, gated reverb", 0.62],
  ["Anni novanta", "90s production", 0.6],
  ["Anni duemila", "2000s production", 0.56],
  ["Anni dieci", "2010s production", 0.58],
  ["Adesso", "modern production, loud and clean", 0.7],
  ["Fuori dal tempo", "timeless, no era", 0.2],
]);

const ANDATURE = pezzi("andatura", [
  ["Lentissima", "60 bpm, very slow", 0.3],
  ["Lenta", "80 bpm", 0.5],
  ["Camminata", "100 bpm", 0.6],
  ["Media", "120 bpm", 0.8],
  ["Svelta", "140 bpm", 0.6],
  ["Corsa", "170 bpm", 0.34],
  ["A rotta di collo", "190 bpm, breakneck", 0.12],
]);

/** I pezzi della musica che non sono i generi. I generi si aggiungono a parte. */
export const PEZZI_MUSICA_CORTI: Pezzo[] = [
  ...VOCI,
  ...STRUMENTI,
  ...ATMOSFERE,
  ...EPOCHE,
  ...ANDATURE,
];

/* ==================================================================== tutto */

export const RULLI: Rullo[] = [...RULLI_IMMAGINI, ...RULLI_MUSICA];

/** I rulli di un tavolo, nell'ordine in cui si incollano nel prompt. */
export function rulliDi(tavolo: string): Rullo[] {
  return RULLI.filter((r) => r.tavolo === tavolo);
}
