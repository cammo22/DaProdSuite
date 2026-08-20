/**
 * I «look»: l'identità visiva del video, scritta una volta per tutte le clip.
 *
 * **È la lezione numero tre delle prove su Maestro**, quella che dice che i
 * riferimenti concreti battono le descrizioni astratte di stile. Un video tenuto
 * insieme da «cinematic, beautiful, high quality» non è tenuto insieme da
 * niente: quelle parole non descrivono niente di preciso, e ogni clip se le
 * interpreta a modo suo. Una pellicola nominata, un'ora del giorno, un posto,
 * invece sì.
 *
 * Sono in inglese perché ci vanno dentro al prompt, e i modelli video sono
 * addestrati in inglese. Sono un **punto di partenza da modificare**, come le
 * estetiche di DaProdFoto: la casella resta scrivibile, e la cosa migliore che
 * puoi fare è cambiarli finché non somigliano al video che hai in testa.
 */
export const LOOK = {
  "": "",
  "Super-8 anni ottanta":
    "1980s super-8 film look, warm faded colours, soft grain, handheld imperfections",
  "Notte al neon":
    "neon-lit night city, wet asphalt reflections, deep blues and magentas, anamorphic flares",
  "Documentario 16mm":
    "16mm documentary film, natural available light, muted earth tones, slight gate weave",
  "Estate mediterranea":
    "sun-bleached mediterranean coast, hard midday light, white walls and deep blue sea",
  "Bianco e nero contrastato":
    "high contrast black and white, hard directional light, deep shadows, film grain",
  "Sogno pastello":
    "soft pastel palette, diffused hazy light, gentle bloom, dreamlike shallow focus",
  "Nebbia del nord":
    "cold northern light, fog over a grey landscape, desaturated palette, still water",
  "Interni caldi":
    "warm domestic interior, tungsten lamps, cluttered lived-in rooms, cosy shallow depth",
};

/**
 * Quanto dura al massimo un'inquadratura, in secondi.
 *
 * Sei secondi non è un gusto: è centoquarantacinque fotogrammi a ventiquattro
 * al secondo, cioè la finestra su cui questi modelli lavorano. Chiedere di più
 * in un colpo solo vuol dire farlo fare al motore a pezzi comunque, ma senza
 * poter scegliere dove tagliare.
 */
export const MASSIMO_CLIP = 6;

/** E il minimo: sotto, non è un'inquadratura, è uno sfarfallio. */
export const MINIMO_CLIP = 3;
