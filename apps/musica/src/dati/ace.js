/**
 * Le due liste lunghe di ACE-Step 1.5: le lingue e le tonalità.
 *
 * Stanno qui e non dentro `grafi.js` per la stessa ragione per cui ci stanno gli
 * stili e le estetiche: sono dati, non ragionamenti, e un file di grafi lungo
 * cinquanta righe in più di elenchi si legge peggio.
 *
 * **I valori sono quelli del nodo**, lettera per lettera: `TextEncodeAceStep
 * Audio1.5` li accetta da un elenco chiuso e rifiuta tutto il resto. Le
 * etichette invece sono in italiano, perché il menu lo legge una persona.
 */

/**
 * Le lingue del canto: le pastiglie sopra il testo.
 *
 * Il nodo di ACE-Step ne dichiara cinquanta. Qui ce ne sono dodici, e non è una
 * svista: le altre trentotto sono un elenco a scorrimento in cui l'italiano non
 * si trova più. Chi canta in bengalese lo dirà, e allora si allunga la lista —
 * ma scriverla tutta oggi vuol dire peggiorare il menu per tutti e non servire
 * nessuno.
 *
 * L'italiano è il primo perché questa suite parla italiano.
 *
 * **Tre campi e non due**, perché i due modelli la lingua la ricevono in due
 * modi diversi:
 *
 * - `id` è il valore che vuole `TextEncodeAceStepAudio1.5`, lettera per lettera:
 *   quel nodo accetta un elenco chiuso e rifiuta tutto il resto.
 * - `nome` è l'italiano che si legge sulla pastiglia.
 * - `inglese` è quello che finisce **nella descrizione dello stile** quando il
 *   modello è MiniMax Music 3, che di casella «lingua» non ne ha: il suo unico
 *   ingresso di testo è la descrizione, quindi è lì che la lingua va detta.
 */
export const LINGUE = [
  { id: "it", nome: "Italiano", inglese: "Italian" },
  { id: "en", nome: "Inglese", inglese: "English" },
  { id: "es", nome: "Spagnolo", inglese: "Spanish" },
  { id: "fr", nome: "Francese", inglese: "French" },
  { id: "de", nome: "Tedesco", inglese: "German" },
  { id: "pt", nome: "Portoghese", inglese: "Portuguese" },
  { id: "ja", nome: "Giapponese", inglese: "Japanese" },
  { id: "ko", nome: "Coreano", inglese: "Korean" },
  { id: "zh", nome: "Cinese", inglese: "Chinese" },
  { id: "ru", nome: "Russo", inglese: "Russian" },
  { id: "ar", nome: "Arabo", inglese: "Arabic" },
  { id: "unknown", nome: "Non lo so", inglese: "" },
];

/** Quella che parte: questa suite parla italiano. */
export const LINGUA_PREDEFINITA = "it";

/**
 * Le tonalità, con i nomi italiani.
 *
 * Il nodo le vuole in inglese (`C major`, `E minor`), e in italiano si dicono
 * diversamente: Do maggiore, Mi minore. Chi suona uno strumento legge la
 * seconda forma, e a chi non lo suona non cambia niente — quindi si scrive
 * quella.
 *
 * Le enarmoniche doppie del nodo (`C# major` e `Db major`, che sono la stessa
 * nota) restano tutte e due: sono la stessa altezza ma non lo stesso modo di
 * scriverla, e il modello è stato addestrato con tutte e due.
 */
const NOTE = [
  ["C", "Do"], ["C#", "Do#"], ["Db", "Reb"], ["D", "Re"], ["D#", "Re#"], ["Eb", "Mib"],
  ["E", "Mi"], ["F", "Fa"], ["F#", "Fa#"], ["Gb", "Solb"], ["G", "Sol"], ["G#", "Sol#"],
  ["Ab", "Lab"], ["A", "La"], ["A#", "La#"], ["Bb", "Sib"], ["B", "Si"],
];

export const TONALITA = [
  ...NOTE.map(([sigla, nome]) => [`${sigla} major`, `${nome} maggiore`]),
  ...NOTE.map(([sigla, nome]) => [`${sigla} minor`, `${nome} minore`]),
];

/** Quella che parte: La minore, la tonalità più comune nella musica pop. */
export const TONALITA_PREDEFINITA = "A minor";
