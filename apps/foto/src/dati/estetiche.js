/**
 * Le estetiche e le proposte di partenza.
 *
 * Le estetiche sono le stesse di DaProdMusica — è lo stesso modello e la stessa
 * mano, e due elenchi diversi vorrebbero dire che la copertina di un brano e
 * un'immagine fatta qui non si somigliano pur avendo scelto "Notturno" in
 * entrambe. Qui ce ne sono alcune in più, di quelle che a una copertina non
 * servono ma a una foto sì.
 */

export const ESTETICHE = {
  Illustrazione: "detailed illustration, clean linework, rich colors, soft cinematic lighting",
  Fotografico: "photorealistic photograph, natural light, shallow depth of field, 50mm lens",
  Anime: "anime style, expressive composition, vibrant colors, dramatic lighting",
  Pittorico: "painterly artwork, visible brush strokes, warm palette, depth of field",
  "Poster grafico": "graphic poster design, bold shapes, flat saturated colors, strong silhouette",
  Notturno: "moody night scene, neon and street lights, wet reflections, deep shadows",
  "Retro anni 80": "retro 1980s artwork, grain, warm analog colors, sunset gradients",
  Minimal: "minimalist artwork, few elements, large empty space, limited palette",
  Cinematografico: "cinematic still, anamorphic framing, volumetric light, film grain",
  Acquerello: "watercolour painting, soft bleeding edges, paper texture, muted colours",
};

/** Quello che non si vuole vedere, quando il CFG è abbastanza alto da ascoltarlo. */
export const NEGATIVO =
  "worst quality, low quality, blurry, jpeg artifacts, watermark, signature, text, letters";

/**
 * Le proposte di partenza: un titolo corto e il prompt intero.
 *
 * Sono un punto di partenza, non un elenco chiuso: dall'app si aggiungono le
 * proprie col "+" e si modificano col tasto destro — le tue finiscono nel
 * `localStorage`, queste restano quelle del primo avvio. Vedi
 * `packages/ui/src/proposte.js`.
 */
export const PROPOSTE = [
  { titolo: "Automobile al tramonto", prompt: "una vecchia automobile ferma su una strada vuota al tramonto" },
  { titolo: "Mare di notte", prompt: "il mare di notte con la luna piena" },
  { titolo: "Vicolo sotto la pioggia", prompt: "un vicolo di città sotto la pioggia, insegne accese" },
  { titolo: "Chitarra sul palco", prompt: "una chitarra appoggiata a un amplificatore su un palco vuoto" },
  { titolo: "Fiori nel cemento", prompt: "fiori che crescono da una crepa nel cemento" },
  { titolo: "Giostra abbandonata", prompt: "una giostra abbandonata in un luna park spento" },
  { titolo: "Stanza e finestra", prompt: "una stanza vuota con la luce che entra dalla finestra" },
  { titolo: "Treno all'alba", prompt: "un treno fermo su binari deserti all'alba" },
  { titolo: "Ritratto controluce", prompt: "un ritratto di profilo controluce davanti a una finestra" },
  { titolo: "Tavola dopo cena", prompt: "una tavola apparecchiata dopo la cena, luci basse" },
];
