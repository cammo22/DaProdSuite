/**
 * Bonsai: dall'idea alla canzone intera.
 *
 * Due gesti, non uno. **Finisci** prende quello che hai già scritto — due righe
 * di ritornello, uno stile a metà — e lo completa restando dentro il tuo. **Fai
 * tutto** parte da una frase su di cosa deve parlare e riempie ogni campo:
 * titolo, stile, testo con i tag di sezione, e la descrizione della copertina.
 *
 * Perché serve: MiniMax Music 3 vuole un testo con `[Verse]` e `[Chorus]` al
 * posto giusto e uno stile scritto in inglese con parole che riconosce. Sono due
 * mestieri diversi da "avere un'idea per una canzone", ed è esattamente il tipo
 * di lavoro che un modello che scrive fa meglio e più in fretta di chiunque.
 *
 * Il modello lo tiene acceso **LM Studio**, e la suite ci parla attraverso il
 * ponte comune (`daprodSuite.llm`): la stessa strada che useranno Foto e Cinema.
 */

import { el, mostraErrore } from "./dom.js";
import { titoloAuto } from "./grafi.js";
import { linguaScelta } from "./crea.js";
import { LINGUE } from "./dati/ace.js";
// Il selettore del modello e' di tutte le app, non di questa: sta in
// `packages/ui` e la suite lo serve sotto `/comune/`, dalla stessa origine
// della pagina. Fino al 19 agosto 2026 ce n'erano due copie identiche, una
// qui e una nell'altra app.
import { collegaSelettoreLlm, modelloScelto } from "/comune/selettore-llm.js";

const suite = window.daprodSuite;

/**
 * Le istruzioni, scritte come si scrivono a un modello locale da pochi miliardi
 * di parametri: **dettagliate**.
 *
 * La prima prova con Bonsai è tornata in un italiano inventato — "l'ultima
 * bicarella", "il silence è novo", "senza fare ruido": parole spagnole e
 * inesistenti mescolate all'italiano. Non è un modello rotto, è un modello che
 * va guidato. Da qui in poi: la lingua si dice **prima di tutto**, si vieta
 * esplicitamente quello che sbagliava, e i tag di sezione sono elencati uno per
 * uno perché "dividi in sezioni" per lui non vuol dire niente.
 *
 * ⚠ **Due cose cambiate nella 0.8.0**, e nascono dalla stessa frase — «spesso
 * gli LLM scrivono in napoletano, facciamoli scrivere in italiano»:
 *
 * - **la lingua è quella scelta**, non "italiano" scritto qui dentro. Le
 *   pastiglie della lingua stanno due schede più in là e decidono come canta il
 *   modello musicale: era strano che il paroliere non le guardasse.
 * - **il dialetto si vieta per nome, con un esempio.** Gli stili di partenza
 *   sono neomelodici napoletani, e «neapolitan neomelodic pop» nello stile tira
 *   il modello verso il napoletano da solo. Il genere può essere napoletano, la
 *   lingua no: sono due cose diverse, e a un modello piccolo va detto — con la
 *   riga sbagliata accanto a quella giusta, che è l'unica forma che segue.
 */
function sistema() {
  const scelta = LINGUE.find((l) => l.id === linguaScelta());
  // «Non lo so» non è una lingua in cui scrivere: chi non ha scelto scrive in
  // italiano, che è la lingua della suite.
  const nome = scelta && scelta.id !== "unknown" ? scelta.nome : "Italiano";

  return `Sei un paroliere ${nome.toLowerCase()} madrelingua.

REGOLA PIÙ IMPORTANTE — LA LINGUA:
- Il testo va scritto in ${nome.toUpperCase()} CORRENTE, parole che esistono nel vocabolario.
- NIENTE DIALETTO. Né napoletano, né romano, né siciliano: nemmeno una parola,
  nemmeno nel ritornello. Il genere musicale può essere napoletano, la lingua no.
  Si scrive "amore mio, non te ne andare", mai "ammore mio, nun te ne jì".
- Vietate le parole di altre lingue o inventate dentro il testo.
- Se non sei sicuro che una parola esista, usane una più semplice.
- Frasi brevi, parole comuni, quelle che si usano parlando.

COME DEVE ESSERE IL TESTO:
- Diviso in sezioni con questi tag esatti, ognuno su una riga da solo:
  [Intro] [Verse] [Chorus] [Bridge] [Outro]
- Almeno: un [Verse], un [Chorus], un secondo [Verse], di nuovo il [Chorus].
- Il [Chorus] si ripete uguale: è quello che la gente ricorda.
- Immagini concrete (una serranda, un bicchiere, una strada), non concetti astratti.

LO STILE va invece scritto in INGLESE, 3 o 4 generi musicali separati da virgola.
LA COPERTINA va scritta in INGLESE: una scena concreta, senza scritte dentro.`;
}

/**
 * La forma della risposta, imposta al modello.
 *
 * Non è una preghiera dentro il prompt ("rispondi in JSON, per favore"): è uno
 * schema che LM Studio fa rispettare, quindi i quattro campi arrivano sempre e
 * arrivano interi. Senza, la prima prova è tornata con la risposta dentro un
 * discorso, e i campi dell'app sono rimasti vuoti.
 */
const SCHEMA = {
  type: "object",
  properties: {
    titolo: { type: "string", description: "titolo breve in italiano, senza virgolette" },
    stile: {
      type: "string",
      description: "in inglese: genere, strumenti, tipo di voce, bpm, umore",
    },
    testo: {
      type: "string",
      description: "il testo completo, con i tag di sezione fra parentesi quadre",
    },
    copertina: {
      type: "string",
      description: "in inglese: una scena concreta per la copertina, senza scritte",
    },
  },
  required: ["titolo", "stile", "testo", "copertina"],
};

/** Vero se c'è qualcuno che risponde: senza, i bottoni restano spenti. */
async function disponibile() {
  const stato = await suite.llm.stato();
  return stato.acceso && stato.modelli.length > 0 ? null : stato.motivo;
}

function lavora(bottone, testo) {
  bottone.disabled = true;
  bottone.dataset.prima = bottone.dataset.prima || bottone.textContent;
  bottone.textContent = testo;
}

function finito(bottone) {
  bottone.disabled = false;
  bottone.textContent = bottone.dataset.prima;
}

/**
 * Il JSON del modello, o null.
 *
 * Un modello che ragiona a volte infila la risposta dentro altro testo: si
 * cerca la prima graffa e l'ultima invece di arrendersi al primo `JSON.parse`
 * fallito.
 */
function leggiJson(testo) {
  try {
    return JSON.parse(testo);
  } catch {
    const inizio = testo.indexOf("{");
    const fine = testo.lastIndexOf("}");
    if (inizio < 0 || fine <= inizio) return null;
    try {
      return JSON.parse(testo.slice(inizio, fine + 1));
    } catch {
      return null;
    }
  }
}

function riempi(dati) {
  if (dati.stile) el.caption.value = String(dati.stile).trim();
  if (dati.testo) {
    el.lyrics.value = String(dati.testo).trim();
    el.instrumental.checked = false;
    el.lyrics.disabled = false;
  }
  el.titolo.value = String(dati.titolo || "").trim() || titoloAuto(el.lyrics.value, el.caption.value);
  // La copertina è un prompt in inglese: lo mettiamo dove la scheda Crea lo
  // cerca, così premendo Crea arriva anche l'artwork senza altri passaggi.
  if (dati.copertina) el.ideaCopertina.value = String(dati.copertina).trim();
}

async function chiedi(bottone, utente, attesa) {
  const motivo = await disponibile();
  if (motivo) return mostraErrore(motivo);

  lavora(bottone, attesa);
  try {
    const esito = await suite.llm.chiedi({
      // Quello scelto nel selettore qui sopra: se ne hai messo uno piccolo per
      // avere una risposta subito, deve rispondere quello.
      modello: modelloScelto(),
      sistema: sistema(),
      utente,
      schema: SCHEMA,
      nomeSchema: "canzone",
    });
    if (!esito.ok) return mostraErrore(esito.motivo || "Il modello non ha risposto.");

    const dati = leggiJson(esito.testo);
    if (!dati) return mostraErrore("Il modello ha risposto in un modo che non riesco a leggere.");
    riempi(dati);
  } catch (e) {
    mostraErrore(String(e.message || e));
  } finally {
    finito(bottone);
  }
}

export function collegaBonsai() {
  collegaSelettoreLlm(el.selettoreLlm);
  el.bonsaiTutto.onclick = () => {
    const idea = el.ideaCanzone.value.trim();
    if (!idea) return mostraErrore("Scrivi in una riga di cosa deve parlare la canzone.");
    void chiedi(
      el.bonsaiTutto,
      `Scrivi una canzone su questa idea: "${idea}".\n`,
      "sto scrivendo…",
    );
  };

  el.bonsaiFinisci.onclick = () => {
    const idea = el.ideaCanzone.value.trim();
    void chiedi(
      el.bonsaiFinisci,
      `Completa questa canzone senza stravolgerla: tieni le parole e il tono che ci sono già.\n\n` +
        `Stile scritto finora: ${el.caption.value.trim() || "(vuoto)"}\n` +
        `Titolo: ${el.titolo.value.trim() || "(non ancora)"}\n` +
        `Idea: ${idea || "(nessuna, vai dietro al testo)"}\n\n` +
        `Testo abbozzato:\n${el.lyrics.value.trim() || "(vuoto)"}\n\n`,
      "sto finendo…",
    );
  };

  // Se LM Studio non c'è i bottoni restano, ma dicono perché: nasconderli
  // vorrebbe dire lasciare l'utente a chiedersi dove sia finita quella cosa.
  void disponibile().then((motivo) => {
    el.bonsaiStato.textContent = motivo
      ? motivo
      : "Pronto. Consigliato Bonsai 27B con 64K di contesto, ma va bene qualunque modello di LM Studio.";
    el.bonsaiStato.classList.toggle("guasto", Boolean(motivo));
  });
}
