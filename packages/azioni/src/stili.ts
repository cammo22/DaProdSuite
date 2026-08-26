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
