/**
 * Gli stili musicali, e le istruzioni di sezione. **L'elenco di partenza.**
 *
 * **Perché stanno qui, dalla 0.7.7.** Fino alla 0.7.6 vivevano dentro
 * DaProdMusica (`apps/musica/src/dati/stili.js`) e li vedeva solo chi stava al
 * computer: dal telefono la casella «che genere» era una casella vuota, e chi
 * non sa che «neapolitan neomelodic pop, melodic trap, autotune ballad» è la
 * frase giusta ci scriveva «canzone d'amore» — e il modello musicale gliela
 * dava, nel senso peggiore.
 *
 * Chiesto il 26 agosto 2026: «nella parte musica mancano stili, lingua e tutte
 * le istruzioni tra le quadre come intro, verse ecc: devono funzionare anche su
 * Android», e «prendiamo tutti gli stili dalla suite; ogni utente deve avere i
 * suoi, ma partono tutti con un set preimpostato».
 *
 * Questo file è **il set preimpostato**: da qui parte ogni persona che si
 * collega, e da lì in poi i suoi stili sono suoi (vedi `stili.ts` nello shell).
 *
 * ## La regola degli stili, che non è ovvia
 *
 * **Nel blocco stile niente strumenti, mood, produzione, BPM o voce.** Solo
 * generi, tre o quattro. È la regola di Cammo, ed è controintuitiva: una
 * descrizione dettagliata sembra più precisa e invece **restringe il modello**,
 * che comincia a produrre sempre la stessa cosa. Si affina lavorando sui
 * sottogeneri (`melodic trap`, `italo disco`), non aggiungendo prosa.
 *
 * Le tre descrizioni lunghe in fondo seguono lo schema ufficiale di MiniMax, e
 * servono al caso opposto: quando si vuole un risultato preciso invece che
 * variabile.
 *
 * ⚠ **Questo elenco esiste in due copie**, e la seconda è quella di
 * DaProdMusica, che è una pagina web e non può importare un pacchetto Node.
 * Non è una svista ed è tenuta onesta da una prova: `prova-azioni.mjs`
 * controlla che le due dicano la stessa cosa, e fallisce il giorno che
 * divergono. Meglio una copia sorvegliata che una terza strada per la stessa
 * verità.
 */

/** Gli stili di partenza: nome per una persona, e le parole per il modello. */
export const STILI_DI_PARTENZA: Readonly<Record<string, string>> = {
  "Neomelodico trap": "neapolitan neomelodic pop, melodic trap, autotune ballad",
  "Neomelodico classico": "neapolitan neomelodic pop, classic italian pop, orchestral ballad",
  "Strada UK": "uk drill, sliding 808 drill, pop rap",
  "Grime russo": "russian grime, grime, industrial rap",
  "Boom bap partenopeo": "boom bap, italian hip hop, soul sample hip hop",
  "Trap malinconica": "melodic trap, cloud rap, dream pop",
  "Popcore acceso": "popcore, dance pop, pop punk",
  "Pop rap radiofonico": "pop rap, dance pop, electropop",
  "Sala da ballo": "electro swing, swing revival, disco",
  "Nu disco notturno": "nu disco, french house, disco funk",
  "Golfo house": "deep house, vocal house, dance pop",
  "Future house": "future house, electro house, dance pop",
  "Techno fredda": "techno, dark electro, industrial techno",
  "Trance vocale": "vocal trance, progressive trance, dance pop",
  "Sintetico anni 80": "synthwave, synthpop, italo disco",
  "Notte trip hop": "trip hop, downtempo, lo-fi",
  "Chillwave marino": "chillwave, dream pop, bedroom pop",
  "Camera pop": "chamber pop, baroque pop, indie folk",
  "Indie folk acustico": "indie folk, acoustic singer-songwriter, americana",
  "Soul lento": "soul, neo-soul, contemporary R&B",
  "Ferro pesante": "metalcore, nu metal, dark electro",
  "Opera quantica": "symphonic metal, opera, orchestral metal",
  "Rock alternativo": "alternative rock, gothic rock, post-punk",
  "Bassa frequenza": "drum and bass, neurofunk, glitch hop",
};

/**
 * Le istruzioni di sezione, fra parentesi quadre.
 *
 * Sono **solo quelle documentate per MiniMax Music 3**: qualunque altro `[tag]`
 * viene minuscolizzato e passato come testo (vedi `normalize_lyrics` nel
 * sorgente del nodo). Metterne di inventati non fa niente di male, ma nemmeno
 * niente di buono — e chi le legge in un elenco crede che funzionino tutte.
 */
export const SEZIONI: readonly string[] = [
  "[Intro]",
  "[Verse]",
  "[Pre-Chorus]",
  "[Chorus]",
  "[Post-Chorus]",
  "[Bridge]",
  "[Instrumental]",
  "[Solo]",
  "[Outro]",
];

/**
 * Le lingue in cui si può cantare.
 *
 * ACE-Step la riceve come impostazione vera; MiniMax non ha una casella per la
 * lingua e se la trova aggiunta alla descrizione dello stile. Chi chiede da
 * fuori non deve sapere quale dei due sta usando: dice la lingua e basta.
 */
export const LINGUE_CANTO: readonly { id: string; nome: string }[] = [
  { id: "it", nome: "Italiano" },
  { id: "en", nome: "Inglese" },
  { id: "es", nome: "Spagnolo" },
  { id: "fr", nome: "Francese" },
  { id: "de", nome: "Tedesco" },
  { id: "pt", nome: "Portoghese" },
  { id: "ja", nome: "Giapponese" },
  { id: "ko", nome: "Coreano" },
  { id: "zh", nome: "Cinese" },
  { id: "ru", nome: "Russo" },
  { id: "ar", nome: "Arabo" },
];

/**
 * Le durate che si scelgono davvero, in secondi.
 *
 * Chiesto il 26 agosto 2026: «durata canzoni pulsanti da 30, 60, 80, 120 e 220
 * secondi». Non è un cursore da trascinare al pixel: sono cinque lunghezze di
 * canzone — un ritornello, un pezzo corto, uno normale, uno lungo, un pezzo
 * intero — e su un telefono cinque pulsanti si premono, un cursore no.
 */
export const DURATE_BRANO: readonly number[] = [30, 60, 80, 120, 220];

/** Le durate di una clip video, con la stessa logica. */
export const DURATE_VIDEO: readonly number[] = [3, 5, 8, 10];

/* ==========================================================================
   Gli stili delle altre due schede: immagini e video.
   ========================================================================== */

/**
 * **Perché tre elenchi e non uno, dalla 0.7.8.**
 *
 * Chiesto il 26 agosto 2026: «gli stili vanno bene ma devono essere di tre tipi
 * per immagini, video e musica; gli stili salvati per immagini li ritrovo anche
 * nella produzione immagini, stessa cosa per musica e video, così li separiamo
 * e ordiniamo per bene».
 *
 * Ed è la cosa giusta, perché uno stile **non è la stessa cosa nei tre posti**:
 * per un brano sono tre generi musicali, per un'immagine è un modo di
 * fotografare o di disegnare, per un video è un modo di riprendere. Metterli
 * tutti in un elenco solo vorrebbe dire offrire «boom bap partenopeo» a chi sta
 * facendo una foto — cioè un menu che non si guarda più.
 *
 * La regola invece resta identica in tutti e tre: **poche parole, e nessuna
 * prosa**. Una descrizione dettagliata restringe il modello e fa uscire sempre
 * la stessa cosa; si affina cambiando le parole, non aggiungendone.
 */
export type TipoStile = "immagine" | "video" | "musica";

/** I tre tipi, nell'ordine in cui si mostrano. */
export const TIPI_STILE: readonly { id: TipoStile; nome: string; segno: string }[] = [
  { id: "immagine", nome: "Immagini", segno: "◉" },
  { id: "video", nome: "Video", segno: "▶" },
  { id: "musica", nome: "Musica", segno: "♫" },
];

/**
 * Da che scheda arriva una richiesta, a che stili le servono.
 *
 * Sta qui e non nel gateway perché è la stessa domanda che si fanno il
 * telefono, la console e l'agente: la scheda foto vuole gli stili immagine, e
 * non c'è un secondo modo di rispondere.
 */
export const STILE_PER_APP: Readonly<Record<string, TipoStile>> = {
  foto: "immagine",
  cinema: "video",
  musica: "musica",
};

/** Gli stili immagine di partenza: modi di fotografare, o di disegnare. */
export const STILI_IMMAGINE_DI_PARTENZA: Readonly<Record<string, string>> = {
  "Fotografia vera": "photorealistic, 35mm photography, natural light, sharp focus",
  "Ritratto da studio": "studio portrait, softbox lighting, shallow depth of field, 85mm",
  "Ora dorata": "golden hour, warm backlight, lens flare, cinematic photography",
  "Notte al neon": "neon noir, night city, wet asphalt reflections, cyberpunk lighting",
  "Cinema anni 70": "70s film still, kodak portra, grain, muted colors",
  "Bianco e nero": "black and white photography, high contrast, film grain",
  "Anime": "anime illustration, cel shading, clean lineart, vibrant colors",
  "Fumetto": "comic book art, bold ink lines, halftone shading",
  "Acquerello": "watercolor painting, soft washes, paper texture",
  "Olio su tela": "oil painting, visible brush strokes, classical composition",
  "Tre dimensioni": "3d render, octane render, soft global illumination, high detail",
  "Pixel": "pixel art, 16-bit, limited palette",
  "Minimale": "minimalist design, flat colors, negative space, clean shapes",
  "Manifesto": "poster design, bold typography space, graphic shapes, high contrast",
  "Sogno": "dreamy, soft focus, pastel colors, ethereal light",
  "Epico": "epic fantasy illustration, dramatic lighting, wide vista",
};

/** Gli stili video di partenza: modi di riprendere, non di colorare. */
export const STILI_VIDEO_DI_PARTENZA: Readonly<Record<string, string>> = {
  "Cinematografico": "cinematic shot, shallow depth of field, film grain, steady camera",
  "Camera a mano": "handheld camera, subtle shake, documentary feel",
  "Carrellata lenta": "slow dolly in, smooth camera movement, steady pace",
  "Drone": "aerial drone shot, wide landscape, slow orbit",
  "Primo piano": "close up shot, face detail, soft light, slow push in",
  "Rallentatore": "slow motion, 120fps look, fluid movement",
  "Notte neon": "night scene, neon lights, reflections, moody atmosphere",
  "Ora dorata": "golden hour, warm backlight, lens flare",
  "Anime in movimento": "anime animation, cel shading, dynamic motion",
  "Cartone": "cartoon animation, bold outlines, bouncy motion",
  "Stop motion": "stop motion animation, handmade textures, slight jitter",
  "Vecchia pellicola": "vintage film look, 16mm grain, faded colors",
  "Timelapse": "timelapse, fast moving clouds, static camera",
  "Sott'acqua": "underwater shot, caustic light, floating particles",
};

/** L'elenco di partenza di un tipo. */
export function stiliDiPartenzaPer(tipo: TipoStile): Readonly<Record<string, string>> {
  if (tipo === "immagine") return STILI_IMMAGINE_DI_PARTENZA;
  if (tipo === "video") return STILI_VIDEO_DI_PARTENZA;
  return STILI_DI_PARTENZA;
}
