/**
 * Il dado delle idee: prompt che non sanno di plastica, per immagini e brani.
 *
 * ⚠ **Nuovo nella 1.4.0.** Chiesto il 24 settembre 2026: «per la musica
 * mettiamo un modo creativo di creare prompt, no slop, e pure con le
 * immagini».
 *
 * **Cos'è lo slop, detto in pratica.** È il prompt che si scrive quando non si
 * ha un'idea: «a beautiful ethereal landscape, cinematic lighting,
 * masterpiece, 8k». Parole che non descrivono niente — dicono solo «fallo
 * bello» — e che i modelli hanno visto su milioni di immagini tutte uguali.
 * Il risultato è quello che ci si aspetta, cioè niente di nuovo. Lo stesso per
 * la musica: «epic emotional cinematic uplifting» è il suono di tutti.
 *
 * **Come si evita, ed è tutto qui dentro.** Si parte dal concreto e dallo
 * specifico, che è quello che un fotografo o un produttore direbbe davvero:
 *
 * 1. **un soggetto che fa una cosa**, non un soggetto in posa;
 * 2. **un posto con un indirizzo** — non «a city» ma «a laundromat in Porto at
 *    closing time»;
 * 3. **una luce fisica**, che viene da qualcosa: un frigo aperto, un
 *    lampione al sodio, un telefono;
 * 4. **un mezzo**: la pellicola, l'obiettivo, lo strumento vero;
 * 5. **un difetto**: la polvere, il nastro consumato, il bordo bruciato. La
 *    perfezione è la firma della plastica;
 * 6. **una cosa che non c'entra**: il dettaglio fuori posto è quello che fa
 *    guardare due volte.
 *
 * E poi **un filtro**: le parole vuote si tolgono, anche da quello che scrive
 * il modello di lingua (vedi `ANTISLOP` e `pulisci`).
 *
 * Il caso si passa da fuori (`caso`, una funzione come `Math.random`), come
 * nei rulli della sala giochi: una prova che non può fissare il dado non è una
 * prova.
 *
 * ⚠ Niente backtick in questo file: è servito com'è alle pagine.
 */

/* ----------------------------------------------------------- il filtro -- */

/**
 * Le parole vuote. In inglese perché è la lingua in cui arrivano ai modelli, e
 * un paio d'italiano per chi scrive a mano. Si tolgono intere, anche dentro una
 * frase, e la virgola che resta appesa se ne va con loro.
 */
export const PAROLE_SLOP = [
  "masterpiece", "best quality", "high quality", "ultra detailed", "ultra-detailed", "highly detailed",
  "hyperrealistic", "hyper-realistic", "hyper realistic", "photorealistic", "8k", "4k", "16k", "uhd", "hdr",
  "award-winning", "award winning", "trending on artstation", "artstation", "unreal engine", "octane render",
  "stunning", "breathtaking", "beautiful", "gorgeous", "amazing", "awesome", "incredible", "epic",
  "ethereal", "otherworldly", "mesmerizing", "captivating", "enchanting", "magical", "dreamlike", "surreal beauty",
  "cinematic lighting", "dramatic lighting", "volumetric lighting", "god rays", "intricate details", "intricate",
  "vibrant colors", "vibrant", "rich colors", "sharp focus", "perfect composition", "perfect",
  "a tapestry of", "tapestry", "a symphony of", "symphony of", "a testament to", "evocative", "timeless",
  "neon-soaked", "neon soaked", "whimsical", "serene", "tranquil",
  "emotional", "uplifting", "powerful", "soaring", "anthemic", "heartfelt", "soulful journey", "sonic journey",
  "sonic landscape", "sonic tapestry", "lush", "atmospheric", "immersive", "cinematic",
  "capolavoro", "bellissimo", "bellissima", "mozzafiato", "stupendo", "epico", "etereo", "iperrealistico",
];

const ESPRESSIONE = new RegExp(
  "(^|[\\s,;.(])(" +
    PAROLE_SLOP.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|") +
    ")(?=$|[\\s,;.)])",
  "gi",
);

/** Le parole vuote trovate in un testo, senza ripetizioni. */
export function slop(testo) {
  const trovate = new Set();
  for (const m of String(testo || "").matchAll(ESPRESSIONE)) trovate.add(m[2].toLowerCase());
  return [...trovate];
}

/** Lo stesso testo senza le parole vuote, e senza le virgole rimaste appese. */
export function pulisci(testo) {
  return String(testo || "")
    .replace(ESPRESSIONE, "$1")
    .replace(/\s+,/g, ",")
    .replace(/,(\s*,)+/g, ",")
    .replace(/\(\s*\)/g, "")
    .replace(/^[\s,;]+|[\s,;]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Da attaccare in fondo alle istruzioni di un modello di lingua che scrive
 * prompt. Il divieto da solo non basta — un modello piccolo le parole vuote le
 * scrive lo stesso — e per questo quello che risponde passa anche da `pulisci`.
 */
export const ANTISLOP =
  "\n\nNIENTE SLOP (vale piu' di tutto il resto):\n" +
  "- Mai parole che dicono solo \"fallo bello\": " + PAROLE_SLOP.slice(0, 40).join(", ") + ".\n" +
  "- Al loro posto una cosa concreta che si vede o si sente: un materiale, una fonte di luce precisa, uno strumento vero, un posto con un nome.\n" +
  "- Metti sempre un difetto (polvere, graffi, nastro consumato, una nota stonata) e un dettaglio che non c'entra.\n" +
  "- Se una frase potrebbe descrivere mille immagini o mille canzoni, riscrivila finche' ne descrive una sola.";

/* ------------------------------------------------------------ i mazzi -- */

const pesca = (lista, caso) => lista[Math.floor(caso() * lista.length) % lista.length];

/** Due diversi dallo stesso mazzo. */
function dueDiversi(lista, caso) {
  const a = pesca(lista, caso);
  let b = pesca(lista, caso);
  for (let i = 0; i < 6 && b === a; i++) b = pesca(lista, caso);
  return [a, b];
}

/*
 * Ogni voce ha due facce, come i pezzi della sala giochi: `it` è quello che si
 * legge, `en` quello che va al modello.
 */

const CHI = [
  { it: "un'anziana che ripara reti da pesca", en: "an old woman mending a fishing net" },
  { it: "un bambino che conta monete su un gradino", en: "a kid counting coins on a doorstep" },
  { it: "un pasticciere che spolvera zucchero a velo", en: "a pastry chef dusting icing sugar" },
  { it: "un tassista addormentato", en: "a taxi driver asleep behind the wheel" },
  { it: "due gemelle che litigano per un ombrello", en: "twin sisters arguing over one umbrella" },
  { it: "un cane che aspetta davanti a una latteria", en: "a dog waiting outside a dairy shop" },
  { it: "un astronauta che fa la spesa", en: "an astronaut in a full suit doing grocery shopping" },
  { it: "un robot da cucina che impara a friggere", en: "a kitchen robot learning to fry zeppole" },
  { it: "un musicista di strada che accorda una chitarra con tre corde", en: "a street musician tuning a guitar with three strings" },
  { it: "un portiere d'albergo che dorme in piedi", en: "a hotel porter dozing upright" },
  { it: "una sarta con gli spilli fra le labbra", en: "a seamstress holding pins between her lips" },
  { it: "un pescatore che fotografa il suo pesce", en: "a fisherman photographing his catch with an old phone" },
  { it: "una tartaruga su un pattino a rotelle", en: "a tortoise riding a roller skate" },
  { it: "un vigile che dirige il traffico di piccioni", en: "a traffic warden directing a crowd of pigeons" },
  { it: "un DJ che mangia un panino fra due dischi", en: "a DJ eating a sandwich between two records" },
  { it: "una nonna che gioca a un cabinato", en: "a grandmother playing an arcade cabinet" },
  { it: "un falegname che misura la luna con un metro", en: "a carpenter measuring the moon with a folding ruler" },
  { it: "un manichino caduto in una fontana", en: "a shop mannequin fallen into a fountain" },
];

const DOVE = [
  { it: "una lavanderia a gettoni di Porto, all'ora di chiusura", en: "a coin laundromat in Porto at closing time" },
  { it: "un vicolo dei Quartieri Spagnoli con i panni stesi", en: "a Quartieri Spagnoli alley under hanging laundry" },
  { it: "una stazione di servizio sulla statale, di notte", en: "a gas station on a two-lane highway at night" },
  { it: "il tetto di un condominio di Tokyo", en: "the rooftop of a Tokyo apartment block" },
  { it: "una sala d'attesa di un ospedale anni '70", en: "a 1970s hospital waiting room" },
  { it: "un mercato del pesce alle cinque del mattino", en: "a fish market at 5 a.m." },
  { it: "una piscina comunale vuota", en: "an empty municipal swimming pool" },
  { it: "una cabina del treno notturno", en: "a sleeper train compartment" },
  { it: "un campo di girasoli dopo la grandine", en: "a sunflower field after a hailstorm" },
  { it: "la cucina di una pizzeria prima dell'apertura", en: "a pizzeria kitchen before opening" },
  { it: "un parcheggio multipiano abbandonato", en: "an abandoned multi-storey car park" },
  { it: "una sala giochi di provincia", en: "a small-town video arcade" },
  { it: "un faro spento sulla scogliera", en: "a dead lighthouse on a cliff" },
  { it: "un ufficio postale di montagna", en: "a mountain village post office" },
  { it: "il ponte di un traghetto per Ischia", en: "the deck of a ferry to Ischia" },
];

const LUCE = [
  { it: "la luce di un frigo aperto", en: "lit only by an open fridge" },
  { it: "un lampione al sodio arancione", en: "under an orange sodium streetlight" },
  { it: "lo schermo di un telefono in faccia", en: "face lit by a phone screen" },
  { it: "sole basso da dietro, controluce", en: "low sun from behind, hard backlight" },
  { it: "neon verde di un'insegna di farmacia", en: "green glow of a pharmacy cross sign" },
  { it: "lampo diretto da compattina", en: "direct on-camera flash, hard shadows on the wall" },
  { it: "nuvole basse, luce piatta di novembre", en: "flat overcast November light" },
  { it: "luce che passa da una tapparella", en: "light slicing through half-closed blinds" },
  { it: "i fari di un motorino", en: "caught in a scooter's headlight" },
  { it: "candela e luce blu della TV", en: "a candle and the blue flicker of a TV" },
  { it: "luce di un'acquario", en: "lit by the glow of an aquarium" },
];

const MEZZO = [
  { it: "pellicola Portra 400, grana visibile", en: "shot on Kodak Portra 400, visible grain" },
  { it: "compattina usa e getta", en: "disposable camera photo" },
  { it: "35 mm grandangolo, dal basso", en: "35mm wide lens, low angle" },
  { it: "teleobiettivo da lontano, schiacciato", en: "long telephoto from across the street, compressed perspective" },
  { it: "Polaroid sbiadita", en: "faded Polaroid" },
  { it: "fotogramma di una VHS", en: "VHS camcorder still, 1994" },
  { it: "stampa risograph a due colori", en: "two-colour risograph print" },
  { it: "gouache su carta ruvida", en: "gouache on rough paper" },
  { it: "linoleografia", en: "linocut print" },
  { it: "plastilina in stop-motion", en: "claymation stop-motion set" },
  { it: "render low-poly da PlayStation 1", en: "PS1-era low-poly render" },
  { it: "vetrata di chiesa", en: "stained glass window" },
];

const DIFETTO = [
  { it: "un'impronta sul vetro", en: "a thumbprint smudge on the lens" },
  { it: "polvere e un capello sulla scansione", en: "dust and a hair on the scan" },
  { it: "il bordo della pellicola bruciato", en: "light leak burning the frame edge" },
  { it: "leggermente mossa", en: "slight motion blur" },
  { it: "orizzonte storto", en: "crooked horizon" },
  { it: "data arancione stampata nell'angolo", en: "orange date stamp in the corner" },
  { it: "sottoesposta di uno stop", en: "one stop underexposed" },
  { it: "piega della carta in mezzo", en: "a paper fold across the middle" },
];

const STRANO = [
  { it: "un palloncino a forma di pesce", en: "a fish-shaped balloon" },
  { it: "una pianta di basilico in un casco", en: "a basil plant growing in a motorbike helmet" },
  { it: "un orologio senza lancette", en: "a clock with no hands" },
  { it: "una scala che non porta da nessuna parte", en: "a ladder leaning on nothing" },
  { it: "un gatto che guarda in camera", en: "a cat staring straight into the lens" },
  { it: "un cartello scritto a mano: \"TORNO SUBITO\"", en: "a handwritten sign that says \"TORNO SUBITO\"" },
  { it: "coriandoli per terra", en: "confetti on the floor" },
  { it: "un pesce rosso in un sacchetto", en: "a goldfish in a plastic bag" },
  { it: "un vecchio Game Boy acceso", en: "a Game Boy left switched on" },
];

/**
 * Un'idea per un'immagine: sei pezzi, e la frase che ne viene.
 *
 * Torna `{ prompt, pezzi }`: il prompt in inglese per il modello, i pezzi con
 * la loro faccia italiana per mostrare cosa è uscito — come sui rulli.
 */
export function ideaImmagine(caso = Math.random) {
  const pezzi = {
    chi: pesca(CHI, caso),
    dove: pesca(DOVE, caso),
    luce: pesca(LUCE, caso),
    mezzo: pesca(MEZZO, caso),
    difetto: pesca(DIFETTO, caso),
    strano: pesca(STRANO, caso),
  };
  const prompt =
    pezzi.chi.en + ", " + pezzi.dove.en + ", " + pezzi.luce.en + ". " +
    "In the frame: " + pezzi.strano.en + ". " +
    pezzi.mezzo.en + ", " + pezzi.difetto.en + ".";
  return { prompt, pezzi };
}

/* ------------------------------------------------------------- brani -- */

/**
 * Generi veri e piccoli, non «pop» e «rock»: il genere largo è il primo slop
 * della musica. Pochi e scelti, perché una pagina non si porta dietro i 6.291
 * della sala giochi; quelli, chi vuole, li gira sui rulli di DaProdSlot.
 */
const GENERI = [
  "neapolitan neo-melodic", "italo disco", "tarantella punk", "city pop", "dub techno", "zouk",
  "rebetiko", "cumbia villera", "baile funk", "amapiano", "shoegaze", "bossa nova", "ethio-jazz",
  "chiptune", "spaghetti western soundtrack", "library music", "cantautorato", "tropicália",
  "dancehall", "UK garage", "vaporwave", "surf rock", "afrobeat", "hyperpop", "sea shanty",
  "mariachi", "krautrock", "trip hop", "gqom", "raï", "fado", "balearic beat", "lo-fi hip hop",
  "sardinian tenore singing", "sega from Réunion", "exotica", "minimal wave", "jersey club",
];

const STRUMENTI = [
  "mandolin through a fuzz pedal", "out-of-tune upright piano", "Casio SK-1 keyboard", "808 cowbell",
  "tammorra frame drum", "nylon-string guitar", "Hammond organ with a broken Leslie", "steel drums",
  "melodica", "accordion", "tape-looped hand claps", "bouzouki", "Rhodes piano", "slap bass",
  "Roland TB-303 acid line", "clarinet", "kalimba", "vibraphone", "tuba", "pedal steel guitar",
  "brass section recorded in a stairwell", "children's toy xylophone", "Game Boy square waves",
  "sitar", "timpani", "harmonica", "ukulele", "a choir of three old men",
];

const PRODUZIONE = [
  "recorded to a worn cassette, wobbly pitch", "dry and close, no reverb at all", "drums in a tiled bathroom",
  "vocals through a telephone line", "one microphone in the middle of the room", "heavy sidechain on everything",
  "vinyl crackle and a skipping groove", "mono, like a 1962 jukebox", "bass way too loud, like a car stereo",
  "field recording of rain under the whole track", "tape saturation on the master",
];

const VOCI = [
  "deep male baritone, half spoken", "raspy female alto", "two voices in unison, slightly out of sync",
  "falsetto male lead", "breathy female voice, very close to the mic", "gruff old man voice",
  "a child-like choir on the chorus", "rapped verses and sung chorus", "call and response with a crowd",
];

const VINCOLO = [
  "no drums until the second chorus", "the whole song over only two chords", "a key change up a tone for the last chorus",
  "the beat drops out for one bar before every chorus", "ends abruptly mid-phrase", "a spoken-word bridge",
  "starts with the chorus", "a false ending, then one more chorus", "the melody is doubled by whistling",
];

const TEMI = [
  { it: "l'ultima corsa del 151 di notte", en: "the last night bus home" },
  { it: "una lavatrice che non centrifuga", en: "a washing machine that won't spin" },
  { it: "il ritorno dopo l'estate, la città vuota", en: "coming back to an empty city after summer" },
  { it: "la nonna che non riconosce più la strada", en: "a grandmother who no longer recognises her street" },
  { it: "un amore nato in una sala giochi", en: "falling in love in an arcade" },
  { it: "il vicino che suona la tromba alle sei", en: "the neighbour who plays trumpet at six a.m." },
  { it: "un messaggio vocale mai ascoltato", en: "a voice message never played" },
  { it: "il motorino rubato e ritrovato", en: "a stolen scooter found again" },
  { it: "la pizzeria che chiude dopo quarant'anni", en: "a pizzeria closing after forty years" },
  { it: "il blackout nel palazzo, tutti sul balcone", en: "a blackout, everyone out on the balconies" },
];

/**
 * Un'idea per un brano: lo stile da dare al modello, e un tema per il testo.
 *
 * Torna `{ stile, tema, bpm, pezzi }`. Lo `stile` va nella casella dei tag (ACE
 * e YuE2 lo leggono uguale); il `tema` è una frase in italiano da cui scrivere
 * le parole, a mano o col modello di lingua.
 */
export function ideaBrano(caso = Math.random) {
  const [g1, g2] = dueDiversi(GENERI, caso);
  const [s1, s2] = dueDiversi(STRUMENTI, caso);
  const pezzi = {
    genere: g1,
    incrociato: g2,
    strumenti: [s1, s2],
    produzione: pesca(PRODUZIONE, caso),
    voce: pesca(VOCI, caso),
    vincolo: pesca(VINCOLO, caso),
    tema: pesca(TEMI, caso),
  };
  const bpm = 70 + Math.floor(caso() * 75);
  const stile =
    pezzi.genere + " crossed with " + pezzi.incrociato + ", " + bpm + " bpm, " +
    pezzi.strumenti[0] + ", " + pezzi.strumenti[1] + ", " + pezzi.voce + ", " +
    pezzi.produzione + ", " + pezzi.vincolo;
  return { stile, tema: pezzi.tema.it, bpm, pezzi };
}
