/**
 * Il regista: da una canzone alla lista delle inquadrature.
 *
 * È la parte di DaProdCinema che non ha niente a che fare con i modelli, e
 * infatti si prova senza motore acceso: entra un testo con i suoi tag di
 * sezione, esce l'elenco delle clip da girare — quanto dura ognuna, cosa
 * succede dentro, e come si muove la camera.
 *
 * **Perché questa parte esiste, e perché è scritta a mano.** Dalle prove su
 * Maestro (documentate in `docs/MODELLI-E-STRATEGIA.md` § 5) sono uscite tre
 * lezioni pagate:
 *
 * 1. La pianificazione lasciata libera a un modello **sbaglia il ritmo**: il
 *    climax arriva presto e l'outro resta vuoto.
 * 2. Un modello locale piccolo, sotto più vincoli insieme, **molla per primo il
 *    vincolo più difficile** — nelle prove buttava via il dialogo per tenere
 *    l'azione.
 * 3. I riferimenti concreti battono le descrizioni astratte di stile.
 *
 * Quindi qui non si chiede a nessun modello che film fare. La funzione di ogni
 * sezione e il movimento di camera **sono scritti in una tabella**, e il modello
 * riceve un solo compito per volta: disegnare una scena già decisa.
 *
 * **Il vantaggio che Maestro non poteva avere.** La struttura della canzone non
 * va indovinata analizzando l'audio: è già scritta nel testo, in `[Verse]` e
 * `[Chorus]`, perché l'hai scritta tu in DaProdMusica. Niente analisi del
 * battito che sbaglia — si legge.
 */

/**
 * Cosa fa ogni sezione, e come si muove la camera.
 *
 * Viene da `DaProdStudio/backend/director.py`, che era già la cosa giusta: a
 * ogni sezione una **funzione narrativa** e un **movimento**, non una
 * descrizione generica di atmosfera.
 *
 * Le chiavi sono in minuscolo e senza parentesi: `[Pre-Chorus]` diventa
 * `pre-chorus`. `funzione` e `camera` finiscono nel prompt in inglese, che è la
 * lingua in cui questi modelli sono stati addestrati; `passo` è l'etichetta che
 * legge l'utente nella lista delle inquadrature.
 */
export const SEZIONI = {
  intro: {
    passo: "Apertura",
    funzione: "establish the world and the visual grammar of the video",
    camera: "static wide shot",
    /** Quanto pesa nel tempo rispetto a una strofa. Vedi `dividiIlTempo`. */
    peso: 0.7,
  },
  verse: {
    passo: "Strofa",
    funzione: "show routine and character detail, restrained movement",
    camera: "slow push in",
    peso: 1,
  },
  "pre-chorus": {
    passo: "Salita",
    funzione: "build tension, tighten the framing, promise the release that comes next",
    camera: "handheld drift, slowly rising",
    peso: 0.6,
  },
  chorus: {
    passo: "Ritornello",
    funzione: "deliver the largest kinetic and visual peak of the video",
    camera: "low tracking run",
    peso: 1.2,
  },
  "post-chorus": {
    passo: "Coda del ritornello",
    funzione: "let the peak settle, hold on one image and let it breathe",
    camera: "slow pull back",
    peso: 0.6,
  },
  bridge: {
    passo: "Ponte",
    funzione: "create an intimate pause and reveal a new detail of the world",
    camera: "slow orbit",
    peso: 0.9,
  },
  instrumental: {
    passo: "Strumentale",
    funzione: "carry the video with movement alone, no narrative beat",
    camera: "lateral tracking shot",
    peso: 0.9,
  },
  solo: {
    passo: "Assolo",
    funzione: "focus tight on a single performer or object, energy without a story beat",
    camera: "close orbit, shallow depth of field",
    peso: 0.8,
  },
  outro: {
    passo: "Chiusura",
    funzione: "close the world, return to the opening image changed by what happened",
    camera: "static wide shot, slowly fading movement",
    peso: 0.8,
  },
};

/**
 * Quando il tag non è nella tabella.
 *
 * MiniMax Music 3 accetta qualunque `[tag]`, non solo i nove documentati: chi
 * scrive `[Ritornello]` in italiano, o `[Drop]`, non deve vedersi rifiutare la
 * canzone. Prende la strofa come funzione, che è quella neutra.
 */
const IGNOTA = { ...SEZIONI.verse, passo: "Sezione" };

/** Il tag di una riga, se quella riga è un tag. `[Pre-Chorus]` → `pre-chorus`. */
function tag(riga) {
  const trovato = /^\s*\[([^\]]+)\]\s*$/.exec(riga);
  return trovato ? trovato[1].trim().toLowerCase() : null;
}

/**
 * Il testo diviso in sezioni, nell'ordine in cui si cantano.
 *
 * Le righe **prima** del primo tag non si buttano: diventano una sezione senza
 * nome, che il regista tratta come una strofa. Un testo senza nemmeno un tag è
 * una sezione sola, ed è giusto così: è una canzone che non ha detto dove
 * cambia, non un errore da segnalare.
 */
export function dividiInSezioni(testo) {
  const sezioni = [];
  let corrente = null;

  for (const riga of (testo || "").split("\n")) {
    const nome = tag(riga);
    if (nome) {
      corrente = { nome, righe: [] };
      sezioni.push(corrente);
      continue;
    }
    if (!riga.trim()) continue;
    if (!corrente) {
      corrente = { nome: "verse", righe: [] };
      sezioni.push(corrente);
    }
    corrente.righe.push(riga.trim());
  }

  return sezioni;
}

/**
 * Quanto dura ogni sezione, in secondi.
 *
 * Non in parti uguali. Una sezione dura in proporzione a **quanto si canta**
 * dentro — le righe — corretta dal `peso` della tabella, che è il modo di dire
 * «un ritornello vale più di una strofa anche a parità di righe» e «un'apertura
 * strumentale è corta anche se non ha righe».
 *
 * Il minimo è un desiderio, non una legge: sotto una certa durata una clip non
 * è un'inquadratura, è uno sfarfallio. Ma se le sezioni sono tante e la canzone
 * corta — sette sezioni in venti secondi — non c'è aritmetica che le faccia
 * stare tutte sopra il minimo, e allora si riscala tutto invece di tagliare
 * l'ultima sezione: un video che finisce prima della canzone si nota molto più
 * di uno con le inquadrature corte.
 */
export function dividiIlTempo(sezioni, secondiTotali, minimoClip) {
  const quote = sezioni.map((s) => {
    const tabella = SEZIONI[s.nome] ?? IGNOTA;
    // Le righe più il peso: una sezione senza righe (uno strumentale) non pesa
    // zero, pesa il suo peso.
    return Math.max(0.5, s.righe.length) * tabella.peso;
  });

  const somma = quote.reduce((a, b) => a + b, 0) || 1;
  const grezzi = quote.map((q) => (q / somma) * secondiTotali);

  // Nessuna sotto il minimo, e poi tutte riscalate perché la somma torni.
  const alzati = grezzi.map((s) => Math.max(minimoClip, s));
  const eccesso = alzati.reduce((a, b) => a + b, 0) / secondiTotali;
  return alzati.map((s) => (eccesso > 1 ? s / eccesso : s));
}

/**
 * Le inquadrature del video, pronte da girare.
 *
 * `look` è l'identità visiva, scritta una volta e ripetuta in ogni clip: è la
 * lezione numero tre — un riferimento concreto, uguale in tutte le scene, tiene
 * insieme il video molto più di un aggettivo di stile diverso ogni volta.
 *
 * Il testo cantato nella sezione entra nel prompt **come contenuto della
 * scena**, non come parole da mostrare: i modelli video le parole le scrivono
 * male, e nessuno vuole i sottotitoli disegnati a mano dentro il fotogramma.
 * Per questo `no text, no subtitles, no captions` è in coda a ogni prompt.
 */
export function inquadrature({ testo, look, secondi, minimoClip = 4, massimoClip = 6 }) {
  const sezioni = dividiInSezioni(testo);
  if (!sezioni.length) return [];

  const durate = dividiIlTempo(sezioni, secondi, minimoClip);
  const clip = [];

  sezioni.forEach((s, i) => {
    const tabella = SEZIONI[s.nome] ?? IGNOTA;
    /**
     * **Una sezione lunga non è una clip lunga: sono più inquadrature.**
     *
     * Una strofa da trenta secondi in un colpo solo non è nemmeno chiedibile a
     * questi modelli — LTX lavora su finestre da centoquarantacinque
     * fotogrammi, che a ventiquattro al secondo sono sei secondi — ma
     * soprattutto non è come è fatto un video musicale: una strofa da trenta
     * secondi girata in un'inquadratura sola è un piano fisso che annoia.
     *
     * Quindi si taglia. Tutte le inquadrature della stessa sezione tengono la
     * sua funzione — è quella che il regista ha deciso e non si tocca — e
     * cambiano il verso della camera, così il taglio si vede come un taglio di
     * montaggio invece che come un errore.
     */
    const quante = Math.max(1, Math.ceil(durate[i] / massimoClip));
    const ognuna = durate[i] / quante;

    for (let n = 0; n < quante; n++) {
      // Le righe si distribuiscono fra le inquadrature della sezione: la prima
      // metà della strofa nella prima clip, la seconda nella seconda.
      const da = Math.floor((s.righe.length * n) / quante);
      const a = Math.floor((s.righe.length * (n + 1)) / quante);
      const righe = s.righe.slice(da, a);
      const cantato = (righe.length ? righe : s.righe).slice(0, 2).join(" / ");
      const camera = quante > 1 ? `${tabella.camera}, ${VARIAZIONI[n % VARIAZIONI.length]}` : tabella.camera;

      clip.push({
        indice: clip.length,
        nome: s.nome,
        sezione: i,
        passo: quante > 1 ? `${tabella.passo} ${n + 1}/${quante}` : tabella.passo,
        righe,
        secondi: Math.round(ognuna * 10) / 10,
        camera,
        prompt: [
          look,
          tabella.funzione,
          camera,
          cantato && `the scene evokes: ${cantato}`,
          "cinematic lighting, no text, no subtitles, no captions",
        ]
          .filter(Boolean)
          .join(", "),
      });
    }
  });

  return clip;
}

/**
 * Come cambia la camera fra due inquadrature della stessa sezione.
 *
 * Sono varianti dell'inquadratura, non movimenti nuovi: la sezione ha già il
 * suo movimento dalla tabella, e questo dice solo da dove lo si guarda. Girano
 * in cerchio, così una strofa lunga alterna invece di ripetere.
 */
const VARIAZIONI = [
  "wide framing",
  "medium shot, closer on the subject",
  "close-up detail",
  "reverse angle",
];

/**
 * Da dove comincia ogni clip dentro il brano, in secondi.
 *
 * Serve al montaggio: la clip di una sezione va messa sull'audio nel punto in
 * cui quella sezione si canta. Si ricava sommando le durate, che è esatto
 * perché le clip si succedono senza buchi.
 */
export function attacchi(inquadrature) {
  let da = 0;
  return inquadrature.map((q) => {
    const inizio = da;
    da += q.secondi;
    return inizio;
  });
}
