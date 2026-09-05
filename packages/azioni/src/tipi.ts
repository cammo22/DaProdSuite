/**
 * La forma di un'azione della suite.
 *
 * Un'azione è una cosa che la suite sa fare, scritta in modo che la capiscano
 * tre lettori diversi senza che nessuno dei tre debba conoscere gli altri:
 *
 * - **una persona**, dalla console web sul portatile o dall'app del telefono;
 * - **un programma**, attraverso il server MCP (Claude Code, un agente locale);
 * - **un modello piccolo**, che deve solo scegliere l'azione e riempirne i campi
 *   (è il posto di Needle 2, vedi `needle.ts`).
 *
 * Il motivo per cui questo file esiste sta in ROADMAP § «Un'AI che usa il
 * programma da sola»: il lavoro vero non era il modello, era che le app non
 * avevano **un elenco di cose che si possono chiedere**. Adesso ce l'hanno, ed
 * è questo. Chi aggiunge un'azione la aggiunge qui e la trova ovunque.
 */

/** Di che tipo è un campo da riempire. Volutamente pochi: devono bastare. */
export type TipoCampo = "testo" | "numero" | "scelta" | "booleano";

/** Un campo di un'azione: un dato che chi chiede deve (o può) fornire. */
export interface Campo {
  /** Nome tecnico, quello che viaggia nel JSON. Senza spazi, minuscolo. */
  nome: string;
  /** Come si chiama per una persona, in italiano. */
  etichetta: string;
  /** A cosa serve, in una riga. La legge chi compila, umano o modello. */
  descrizione: string;
  tipo: TipoCampo;
  obbligatorio: boolean;
  /** Per `tipo: "scelta"`: i valori ammessi, e nessun altro. */
  scelte?: readonly string[];
  /**
   * Come si chiamano quelle scelte per una persona.
   *
   * `scelte` sono gli id che viaggiano nel JSON — `anima2`, `flux2-9b` — e non
   * vogliono dire niente a chi li legge una volta sola. Qui accanto c'è la
   * frase da mettere nel menu: «Anima v2», «FLUX.2 Klein 9B». Una scelta senza
   * etichetta si mostra com'è, che è quello che si faceva prima.
   *
   * Vale la regola di tutta la suite: si scrive cosa una cosa fa, non come si
   * chiama dentro.
   */
  etichette?: Readonly<Record<string, string>>;
  /**
   * Cosa vuol dire **non scegliere niente**, per un campo che si può lasciare
   * vuoto.
   *
   * Non è la stessa cosa per tutti: su un filtro «— tutte —» è giusto, sul
   * modello no — lì vuoto vuol dire «quello scelto adesso sul computer», che è
   * un'altra cosa e va detta. Senza, il menu del modello diceva «— tutte —»,
   * che non vuol dire niente.
   */
  vuoto?: string;
  /** Per `tipo: "numero"`: gli estremi, inclusi. */
  min?: number;
  max?: number;
  /**
   * I valori che si scelgono davvero, per farne dei pulsanti.
   *
   * Chiesto il 26 agosto 2026: «durata canzoni pulsanti da 30, 60, 80, 120 e
   * 220 secondi». Un cursore da trascinare al secondo giusto è un attrezzo da
   * mouse; su un telefono, cinque pulsanti sono cinque scelte che si premono.
   * Gli estremi restano — chi vuole 137 secondi li scrive — ma la strada
   * normale sono questi.
   */
  valoriTipici?: readonly number[];
  /**
   * Frammenti da infilare nel testo con un tocco, dove sta il cursore.
   *
   * Servono alle istruzioni di sezione di un brano — `[Verse]`, `[Chorus]` — che
   * sul computer si mettono con una fila di pastiglie e dal telefono, fino alla
   * 0.7.6, non si mettevano affatto: bisognava sapere che esistevano e
   * scriverle a mano con le parentesi giuste.
   */
  inserti?: readonly string[];
  /** Per `tipo: "testo"`: quanto può essere lungo. Serve a non farsi allagare. */
  maxLunghezza?: number;
  /** Il valore che vale se il campo non arriva. */
  predefinito?: string | number | boolean;
  /**
   * Quale altro campo riempie, quando lo si sceglie.
   *
   * Serve agli stili: sceglierne uno non è una risposta a sé, è un modo di
   * riempire un'altra casella con le parole giuste. Di suo riempie **il campo
   * principale** — il prompt di un'immagine, la descrizione di un brano — e
   * questo campo serve alle eccezioni: dalla 0.9.1 lo stile della copertina di
   * un brano riempie «la copertina», non «che genere».
   */
  riempie?: string;
  /**
   * Cosa vuol dire ognuna delle scelte, per chi non lo sa.
   *
   * Chiesto il 5 settembre 2026: «se si tiene premuto re maggiore mi dice che
   * effetto fa». Una tonalità o un tempo sono parole che chi fa musica capisce
   * e chi vuole una canzone no — e finora quelle pastiglie erano dodici sigle
   * fra cui si sceglieva a caso.
   *
   * Non è una descrizione tecnica: è **che effetto fa**. «La minore» non dice
   * niente, «malinconica, la più usata nel pop» sì. Si legge tenendo premuto,
   * che è il gesto per «e questo cos'è?» su un telefono.
   */
  spiegazioni?: Readonly<Record<string, string>>;
  /** Un esempio vero, che aiuta chi compila più di qualunque descrizione. */
  esempio?: string;
  /**
   * true sul campo che **è** la richiesta: il prompt dell'immagine, il testo da
   * leggere, la descrizione del brano. Ce n'è al massimo uno per azione, ed è
   * quello che compare come titolo nella fila e nella notifica al telefono.
   */
  principale?: boolean;
}

/** Cosa lascia dietro di sé un'azione, quando ha finito. */
export type Produce =
  /** Un file nella libreria: immagine, video, audio. */
  | "file"
  /** Un elenco di cose già esistenti: si legge e basta. */
  | "elenco"
  /** Niente da riportare: ha solo cambiato qualcosa. */
  | "niente";

/** Chi può chiedere quest'azione. */
export type Permesso =
  /** Chiunque sia accoppiato, ospiti compresi. */
  | "tutti"
  /** Solo un dispositivo che può decidere. */
  | "admin";

export interface Azione {
  /** Id stabile, in due parti: `famiglia.cosa`. È il nome dello strumento MCP. */
  id: string;
  /** L'app della suite che la esegue, o `null` se è la suite stessa. */
  app: string | null;
  /** Il nome per una persona. */
  titolo: string;
  /** Cosa fa, in una o due righe. È la descrizione che legge anche il modello. */
  descrizione: string;
  produce: Produce;
  /** Che tipo di file lascia, quando `produce` è "file". */
  risultato?: "immagine" | "video" | "audio";
  permesso: Permesso;
  /**
   * true se occupa la scheda video e va messa in fila invece che eseguita
   * subito. Le azioni in coda passano dal sì o dal no di chi sta al PC; quelle
   * che non ci passano rispondono all'istante.
   */
  coda: boolean;
  campi: readonly Campo[];
}

/** Il risultato della verifica dei campi: o i valori puliti, o il perché no. */
export type Verifica =
  | { ok: true; valori: Record<string, string | number | boolean> }
  | { ok: false; errore: string };
