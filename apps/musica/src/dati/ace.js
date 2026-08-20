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
 * Le lingue del canto.
 *
 * Il nodo ne dichiara cinquanta. Qui ce ne sono dodici, e non è una svista: le
 * altre trentotto sono un elenco a scorrimento in cui l'italiano non si trova
 * più. Chi canta in bengalese lo dirà, e allora si allunga la lista — ma
 * scriverla tutta oggi vuol dire peggiorare il menu per tutti e non servire
 * nessuno.
 *
 * L'italiano è il primo perché questa suite parla italiano.
 */
export const LINGUE = [
  ["it", "Italiano"],
  ["en", "Inglese"],
  ["es", "Spagnolo"],
  ["fr", "Francese"],
  ["de", "Tedesco"],
  ["pt", "Portoghese"],
  ["ja", "Giapponese"],
  ["ko", "Coreano"],
  ["zh", "Cinese"],
  ["ru", "Russo"],
  ["ar", "Arabo"],
  ["unknown", "Non lo so / strumentale"],
];

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
