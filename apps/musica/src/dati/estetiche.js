/**
 * Le estetiche delle immagini e i motivi che le fanno nascere dal testo.
 *
 * I MOTIVI sono la scorciatoia che rende le copertine coerenti col brano senza
 * chiedere niente all'utente: cercano una parola nel titolo e nel testo e la
 * traducono in una scena. Non è intelligenza, è un elenco — ma vedere il mare
 * sulla copertina di una canzone che parla del mare vale più di un prompt vuoto.
 */

export const COVER_NEG = "worst quality, low quality, blurry, jpeg artifacts, watermark, signature, text, letters";
export const ESTETICHE = {
  "Illustrazione":  "detailed illustration, clean linework, rich colors, soft cinematic lighting",
  "Anime":          "anime style, expressive composition, vibrant colors, dramatic lighting",
  "Pittorico":      "painterly artwork, visible brush strokes, warm palette, depth of field",
  "Poster grafico": "graphic poster design, bold shapes, flat saturated colors, strong silhouette",
  "Notturno":       "moody night scene, neon and street lights, wet reflections, deep shadows",
  "Retro anni 80":  "retro 1980s artwork, grain, warm analog colors, sunset gradients",
  "Minimal":        "minimalist artwork, few elements, large empty space, limited palette"
};
export const MOTIVI = [
  [/cuor|amor|bacio/i,          "a heart-shaped object at the centre of the frame"],
  [/mare|onde|golfo|acqua|spiagg/i, "the sea at night, waves and reflections"],
  [/luna|notte|stell|buio/i,    "a full moon over a quiet dark landscape"],
  [/sole|estat|calor/i,         "warm summer light, long shadows at sunset"],
  [/fior|ros[ae]|petal|giardin/i, "flowers growing in the foreground"],
  [/treno|binari|viagg|stazion/i, "an old train on empty tracks"],
  [/auto|macchina|motor|ruot|guid/i, "a vintage car parked on an empty road"],
  [/giostr|luna ?park|circo|fest/i, "a lit carousel at night in an empty fairground"],
  [/caff|bar |dolc|cornett|pasticc/i, "a small lit cafe window in an empty street"],
  [/piogg|bagnat|temporal|nebbi/i, "rain on wet asphalt, reflections of coloured lights"],
  [/fuoco|fiamm|brucia|cener/i, "sparks and embers floating in the dark"],
  [/caten|gabbia|prigion|chius/i, "chains and a rusted cage"],
  [/occhi|guard|vede|spia/i,    "a single eye reflected in a mirror"],
  [/vento|aria|volo|cielo/i,    "wind moving through an open sky"],
  [/chitarr|music|canzon|voce|palco/i, "a guitar leaning against an amplifier on an empty stage"],
  [/citt|strad|vicol|palazz|quartier/i, "a narrow city street at night, shutters and old signs"],
  [/specchio|metall|ferro|acciai|robot/i, "polished metal surfaces and machinery"],
  [/neve|freddo|invern|ghiacc/i, "cold winter light, snow and bare branches"],
  [/deserto|sabbia|polver/i,    "a dusty open landscape under a wide sky"],
  [/casa|stanza|letto|finestr/i, "an empty room with light coming through a window"]
];
/**
 * Le proposte di partenza della scheda Immagini: titolo corto e prompt intero.
 *
 * Come in DaProdFoto, e con la stessa meccanica: il "+" ne aggiunge una, il
 * tasto destro la modifica o la cancella. Vedi `packages/ui/src/proposte.js`.
 */
export const IMG_PRESETS = [
  { titolo: "Automobile al tramonto", prompt: "una vecchia automobile ferma su una strada vuota al tramonto" },
  { titolo: "Mare di notte", prompt: "il mare di notte con la luna piena" },
  { titolo: "Vicolo sotto la pioggia", prompt: "un vicolo di città sotto la pioggia, insegne accese" },
  { titolo: "Chitarra sul palco", prompt: "una chitarra appoggiata a un amplificatore su un palco vuoto" },
  { titolo: "Fiori nel cemento", prompt: "fiori che crescono da una crepa nel cemento" },
  { titolo: "Giostra abbandonata", prompt: "una giostra abbandonata in un luna park spento" },
  { titolo: "Stanza e finestra", prompt: "una stanza vuota con la luce che entra dalla finestra" },
  { titolo: "Treno all'alba", prompt: "un treno fermo su binari deserti all'alba" },
];

