/**
 * Stili pronti, tag di sezione e testo di esempio.
 *
 * I 24 stili sono **solo generi, 3-4 ciascuno**, presi dal vocabolario davvero
 * usato nel corpus DaProd. È la regola di Cammo: nel blocco stile niente
 * strumenti, mood, produzione, BPM o voce, perché una descrizione dettagliata
 * restringe il modello e fa uscire sempre la stessa cosa. Si affinano lavorando
 * sui sottogeneri (`melodic trap`, `italo disco`), non aggiungendo prosa.
 *
 * Le tre descrizioni in fondo seguono invece lo schema ufficiale di MiniMax, per
 * quando serve un risultato preciso invece che variabile.
 */

export const STILI = {
  "Neomelodico trap":    "neapolitan neomelodic pop, melodic trap, autotune ballad",
  "Neomelodico classico":"neapolitan neomelodic pop, classic italian pop, orchestral ballad",
  "Strada UK":           "uk drill, sliding 808 drill, pop rap",
  "Grime russo":         "russian grime, grime, industrial rap",
  "Boom bap partenopeo": "boom bap, italian hip hop, soul sample hip hop",
  "Trap malinconica":    "melodic trap, cloud rap, dream pop",
  "Popcore acceso":      "popcore, dance pop, pop punk",
  "Pop rap radiofonico": "pop rap, dance pop, electropop",
  "Sala da ballo":       "electro swing, swing revival, disco",
  "Nu disco notturno":   "nu disco, french house, disco funk",
  "Golfo house":         "deep house, vocal house, dance pop",
  "Future house":        "future house, electro house, dance pop",
  "Techno fredda":       "techno, dark electro, industrial techno",
  "Trance vocale":       "vocal trance, progressive trance, dance pop",
  "Sintetico anni 80":   "synthwave, synthpop, italo disco",
  "Notte trip hop":      "trip hop, downtempo, lo-fi",
  "Chillwave marino":    "chillwave, dream pop, bedroom pop",
  "Camera pop":          "chamber pop, baroque pop, indie folk",
  "Indie folk acustico": "indie folk, acoustic singer-songwriter, americana",
  "Soul lento":          "soul, neo-soul, contemporary R&B",
  "Ferro pesante":       "metalcore, nu metal, dark electro",
  "Opera quantica":      "symphonic metal, opera, orchestral metal",
  "Rock alternativo":    "alternative rock, gothic rock, post-punk",
  "Bassa frequenza":     "drum and bass, neurofunk, glitch hop"
};
export const PRESETS = {
  "Dettagliato: pop italiano": `Global Metadata: modern italian pop, 104 BPM, D major, warm and nostalgic turning hopeful, late-summer evening drive, polished radio production with wide stereo image.
Vocal Details: female lead, warm mid-range timbre, intimate in the verses and full-voiced in the chorus, stacked octave harmonies on the hook, light plate reverb and slap delay.
Arrangement: primary electric piano and clean electric guitar, secondary analog synth pads and muted trumpet stabs; laid-back groove, round sub-bass, brushed acoustic drums moving to a four-on-the-floor chorus, airy background textures.`,
  "Dettagliato: rock": `Global Metadata: driving alternative rock, 148 BPM, E minor, urgent and defiant, festival main stage, loud punchy mix with analog tape saturation.
Vocal Details: male lead, raspy and forward, shouted phrasing in the chorus, gang backing vocals, short room reverb.
Arrangement: primary distorted rhythm guitars and lead guitar hooks, secondary Hammond organ pad; aggressive eighth-note groove, picked overdriven bass, hard-hitting live drums with open hi-hats, big cymbal crashes at section changes.`,
  "Dettagliato: lo-fi": `Global Metadata: lo-fi hip hop, 82 BPM, F# minor, calm and slightly melancholic, late-night study session, soft dusty production with vinyl noise and gentle tape wow.
Vocal Details: no lead vocals, occasional wordless female humming far back in the mix, heavily filtered.
Arrangement: primary dusty Rhodes chords and jazz guitar samples, secondary muted trumpet; relaxed swung groove, soft upright bass, brushed lo-fi drums with dusty snare, rain and vinyl crackle textures, narrow warm stereo field.`
};
// Solo i tag di sezione documentati per MiniMax Music 3: qualsiasi altro [tag] viene solo
// minuscolizzato e passato come testo (normalize_lyrics in comfy/ldm/minimax_music/prompt.py).
export const TAGS = ["[Intro]","[Verse]","[Pre-Chorus]","[Chorus]","[Post-Chorus]",
              "[Bridge]","[Instrumental]","[Solo]","[Outro]"];
export const DEMO_LYRICS = `[Verse]
Le luci della città si accendono piano
tengo il finestrino aperto sulla mano

[Chorus]
E resto qui, dove finisce l'estate
con le canzoni che non abbiamo cantato

[Outro]
piano, piano...`;
