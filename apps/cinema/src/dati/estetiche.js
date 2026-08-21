/**
 * Le estetiche e le proposte di partenza di DaProdCinema.
 *
 * Sono la versione video di quelle di DaProdFoto, e funzionano allo stesso modo:
 * il menu **scrive nella casella** invece di attaccare parole dietro le quinte,
 * così le vedi, le correggi e le cancelli.
 *
 * **Perché sono concrete e non aggettivi.** Un video tenuto insieme da
 * «cinematic, beautiful, high quality» non è tenuto insieme da niente: quelle
 * parole non descrivono niente di preciso e ogni generazione se le interpreta a
 * modo suo. Una pellicola nominata, un'ora del giorno, un posto, invece sì.
 *
 * Sono in inglese perché ci vanno dentro al prompt, e questi modelli sono
 * addestrati in inglese.
 */
export const ESTETICHE = {
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
  Cinematografico:
    "cinematic anamorphic framing, volumetric light, shallow depth of field, subtle film grain",
  Documentaristico:
    "observational documentary camera, natural sound, available light, no camera moves",
};

/**
 * Le proposte di partenza: un titolo corto e il prompt intero.
 *
 * **Dicono anche cosa fa la camera**, e non è un vezzo: questi modelli il
 * movimento lo prendono dal testo, e un prompt che descrive solo il soggetto
 * produce quasi sempre una fotografia che trema. «slow push in», «static wide
 * shot», «handheld follow» valgono più di dieci aggettivi.
 */
export const PROPOSTE = [
  {
    titolo: "Strada al tramonto",
    prompt:
      "An old car parked on an empty coastal road at sunset, warm low sunlight raking across " +
      "the dusty windshield, slow push in, distant waves, 35mm film grain",
  },
  {
    titolo: "Cucina di mattina",
    prompt:
      "Morning light through a kitchen window, steam rising from a cup on a wooden table, " +
      "dust in the air, static wide shot, quiet room tone",
  },
  {
    titolo: "Pioggia in città",
    prompt:
      "A woman walking under neon shop signs in the rain, reflections on wet asphalt, " +
      "handheld follow shot from behind, city noise and rain on umbrellas",
  },
  {
    titolo: "Bosco nella nebbia",
    prompt:
      "Fog drifting between tall pine trees at dawn, a bird crossing the frame, " +
      "slow lateral dolly, cold desaturated colours, birdsong",
  },
  {
    titolo: "Concerto piccolo",
    prompt:
      "A singer at a microphone in a small crowded club, red stage light from one side, " +
      "slow push in on her face, warm distorted guitar in the background",
  },
];
