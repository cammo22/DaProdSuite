/**
 * Il catalogo delle azioni: cosa la suite sa fare, detto una volta sola.
 *
 * Regola per chi aggiunge una voce qui: **non si dichiara ciò che l'app non sa
 * già fare**. Un'azione in questo elenco è una promessa fatta a tre clienti
 * insieme (telefono, console web, MCP), e una promessa che il motore non
 * mantiene è peggio di un'azione mancante.
 *
 * Le descrizioni sono in italiano perché è la lingua della suite. Per un
 * modello addestrato in inglese, `descrizione` conta meno di `id` e dei nomi
 * dei campi, che sono corti e regolari apposta.
 */

import type { Azione } from "./tipi";
import {
  BPM_TIPICI,
  DURATE_BRANO,
  DURATE_VIDEO,
  LINGUE_CANTO,
  SEZIONI,
  TEMPI_CANTO,
  TONALITA_CANTO,
} from "./stili";

/** Le app che possono ricevere un lavoro da fuori, oggi. */
export const APP_REMOTE = ["foto", "cinema", "musica", "voce"] as const;

/** Quanto può essere lungo un prompt che arriva da fuori. */
const PROMPT_MAX = 2000;

/**
 * I modelli fra cui si sceglie, scheda per scheda.
 *
 * **Perché stanno qui.** Chiesto il 22 agosto 2026: «l'app android deve poter
 * scegliere i vari modelli della suite». Un elenco dentro l'app Android
 * sarebbe la seconda verità sui modelli, e la prima a divergere il giorno che
 * ne entra uno nuovo; questo file invece lo leggono già tutti e quattro i
 * clienti. Aggiungere un modello a una scheda vuol dire aggiungere una riga
 * qui, e compare da sola sul telefono, nella console e per l'agente.
 *
 * Gli id sono quelli veri delle schede (`MODELLI` in `grafi.js`): se qui ne
 * comparisse uno che la scheda non conosce, la generazione partirebbe con il
 * modello sbagliato senza dirlo a nessuno. Per questo c'è una prova che li
 * confronta uno per uno — `apps/shell/scripts/prova-azioni.mjs`.
 *
 * Lasciare vuoto il campo vuol dire **quello che è scelto adesso sul PC**: chi
 * chiede da fuori non è tenuto a sapere che modelli ci sono.
 */
const MODELLI_FOTO = {
  scelte: ["anima", "anima2", "flux2-4b", "flux2-9b"],
  etichette: {
    anima: "Anima — pronta, veloce",
    anima2: "Anima v2 — anime e illustrazione",
    "flux2-4b": "FLUX.2 Klein 4B — leggero",
    "flux2-9b": "FLUX.2 Klein 9B — il più bravo con le descrizioni lunghe",
  },
} as const;

const MODELLI_CINEMA = {
  scelte: ["ltx25", "h3"],
  etichette: {
    ltx25: "LTX 2.5 — video e suono insieme",
    h3: "MiniMax H3 — parte da immagini di riferimento",
  },
} as const;

const MODELLI_MUSICA = {
  scelte: ["ace-turbo", "ace-xl-turbo", "migliore"],
  etichette: {
    "ace-turbo": "ACE-Step Turbo — otto passi, il più veloce",
    "ace-xl-turbo": "ACE-Step XL — più grande, più lento",
    migliore: "MiniMax Music 3 — il più bello, il più lento",
  },
} as const;

/** Il campo «con cosa lo faccio», uguale in tutte le schede che scelgono. */
function campoModello(quali: {
  readonly scelte: readonly string[];
  readonly etichette: Readonly<Record<string, string>>;
}) {
  return {
    nome: "modello",
    etichetta: "Con che modello",
    descrizione: "Vuoto vuol dire: quello scelto adesso sul computer.",
    tipo: "scelta",
    obbligatorio: false,
    scelte: quali.scelte,
    etichette: quali.etichette,
    vuoto: "\u2014 quello scelto sul computer \u2014",
  } as const;
}

/**
 * Il campo «uno stile pronto», uguale nelle tre schede che ne hanno.
 *
 * Dalla 0.7.8 non è più solo della musica: chiesto il 26 agosto 2026 — «gli
 * stili salvati per immagini li ritrovo anche nella produzione immagini,
 * stessa cosa per musica e video». Le scelte non stanno qui dentro: gli stili
 * sono di ogni persona e li tiene il computer, che li mette dentro quando
 * qualcuno chiede le azioni — e ci mette **solo quelli del tipo giusto**.
 */
function campoStile(riempie: string) {
  return {
    nome: "stile",
    etichetta: "Uno stile pronto",
    descrizione:
      `Se lo scegli, riempie «${riempie}» con le parole giuste. I tuoi stili stanno sul ` +
      "computer e li ritrovi da qualunque dispositivo.",
    tipo: "scelta",
    obbligatorio: false,
    vuoto: "— scrivo io —",
    // Riempite dal computer con gli stili di chi sta chiedendo.
    scelte: [],
  } as const;
}

export const AZIONI: readonly Azione[] = [
  /* ------------------------------------------------------------ generare */

  {
    id: "genera.immagine",
    app: "foto",
    titolo: "Fai un'immagine",
    descrizione:
      "Genera un'immagine da una descrizione, con DaProdFoto. Occupa la scheda video, quindi entra in coda.",
    produce: "file",
    risultato: "immagine",
    permesso: "tutti",
    coda: true,
    campi: [
      {
        nome: "prompt",
        etichetta: "Cosa deve esserci",
        principale: true,
        descrizione: "La descrizione dell'immagine. In inglese viene meglio, ma l'italiano funziona.",
        tipo: "testo",
        obbligatorio: true,
        maxLunghezza: PROMPT_MAX,
        esempio: "un faro sulla scogliera al tramonto, luce calda, fotografia",
      },
      campoStile("cosa deve esserci"),
      /**
       * ⚠ **«Cosa non ci deve essere» non c'è più.** Tolto il 5 settembre 2026,
       * chiesto così: «nella produzione immagini togliamo "cosa non ci deve
       * essere"».
       *
       * Ed è la cosa giusta, non solo quella chiesta. I modelli di questa
       * scheda lavorano tutti a CFG 1 — Anima è distillata, FLUX.2 Klein pure —
       * e a CFG 1 **il prompt negativo non fa niente**: non c'è una seconda
       * passata da cui sottrarlo. Era una casella che accettava del testo, lo
       * mandava al motore, e non cambiava un pixel. Peggio: chi la riempiva
       * pensava di aver detto una cosa.
       *
       * La scheda sul PC continua a mandare il suo negativo di serie, che è
       * l'unico posto in cui serve ancora.
       */
      {
        nome: "quante",
        etichetta: "Quante immagini",
        descrizione: "Da 1 a 4. Ognuna è un giro di scheda video: quattro costano quattro volte.",
        tipo: "numero",
        obbligatorio: false,
        min: 1,
        max: 4,
        predefinito: 1,
        valoriTipici: [1, 2, 3, 4],
      },
      campoModello(MODELLI_FOTO),
    ],
  },

  {
    id: "genera.video",
    app: "cinema",
    titolo: "Fai un video",
    descrizione:
      "Genera un video da una descrizione, con DaProdCinema. È la cosa più lenta della suite: " +
      "minuti, non secondi. Fino a 20 secondi è una generazione sola; a 30 e 60 il video si fa " +
      "a pezzi incatenati — l'ultimo fotogramma di uno diventa il primo del prossimo — e ci " +
      "mette il doppio o il triplo.",
    produce: "file",
    risultato: "video",
    permesso: "tutti",
    coda: true,
    campi: [
      {
        nome: "prompt",
        etichetta: "Cosa deve succedere",
        principale: true,
        descrizione: "La scena: soggetto, movimento, luce.",
        tipo: "testo",
        obbligatorio: true,
        maxLunghezza: PROMPT_MAX,
        esempio: "una barca che entra in porto all'alba, la camera la segue da destra",
      },
      campoStile("cosa deve succedere"),
      {
        nome: "secondi",
        etichetta: "Quanto dura",
        descrizione:
          "Durata in secondi. Fino a 20 è una generazione sola. 30 e 60 si fanno a pezzi " +
          "incatenati, per restare coerenti: ci mettono molto di più.",
        tipo: "numero",
        obbligatorio: false,
        min: 2,
        max: 60,
        predefinito: 5,
        valoriTipici: DURATE_VIDEO,
      },
      campoModello(MODELLI_CINEMA),
    ],
  },

  {
    id: "genera.brano",
    app: "musica",
    titolo: "Fai un brano",
    descrizione:
      "Genera una canzone da una descrizione, con DaProdMusica. Se dai anche il testo, lo canta. " +
      "La descrizione vuole SOLO generi (tre o quattro): strumenti, mood e BPM restringono il " +
      "modello e fanno uscire sempre la stessa cosa.",
    produce: "file",
    risultato: "audio",
    permesso: "tutti",
    coda: true,
    campi: [
      {
        /**
         * **Come si chiama la canzone.**
         *
         * Chiesto il 27 agosto 2026: «manca la possibilità da Android di
         * mettere un nome alla canzone». Sul computer la casella c'è da sempre
         * — è quella in cima a DaProdMusica — e da fuori no: chi chiedeva un
         * brano dal telefono si ritrovava un file che si chiamava come la
         * prima riga del ritornello, o come i generi.
         *
         * Vuoto vuol dire: **lo decide la scheda**, dalla prima riga cantata.
         * È quello che faceva prima, e per uno strumentale è ancora l'unica
         * cosa sensata.
         */
        nome: "titolo",
        etichetta: "Come si chiama",
        descrizione:
          "Il nome del brano: è come si chiamerà il file e come lo vedi in galleria. " +
          "Vuoto vuol dire che lo ricavo dal testo.",
        tipo: "testo",
        obbligatorio: false,
        maxLunghezza: 80,
        esempio: "Le luci del porto",
      },
      {
        nome: "descrizione",
        etichetta: "Che genere",
        principale: true,
        descrizione:
          "Tre o quattro generi in inglese, separati da virgola. Niente strumenti, niente " +
          "atmosfera, niente BPM: quelli li decide il modello, e scrivendoli si ottiene sempre " +
          "lo stesso brano.",
        tipo: "testo",
        obbligatorio: true,
        maxLunghezza: PROMPT_MAX,
        esempio: "neapolitan neomelodic pop, melodic trap, autotune ballad",
      },
      campoStile("che genere"),
      {
        nome: "testo",
        etichetta: "Il testo da cantare",
        descrizione:
          "Le parole. Vuoto vuol dire strumentale. Le sezioni si segnano fra parentesi quadre: " +
          "[Verse], [Chorus], [Bridge]. Ogni sezione va su una riga sua.",
        tipo: "testo",
        obbligatorio: false,
        maxLunghezza: 4000,
        inserti: SEZIONI,
        esempio: "[Verse]\nLe luci della citt\u00e0 si accendono piano\n\n[Chorus]\n\u2026",
      },
      {
        nome: "lingua",
        etichetta: "In che lingua canta",
        descrizione:
          "La lingua del canto. ACE-Step la riceve come impostazione, MiniMax se la trova " +
          "aggiunta alla descrizione: da qui non cambia niente, si dice e basta.",
        tipo: "scelta",
        obbligatorio: false,
        vuoto: "\u2014 quella scelta sul computer \u2014",
        scelte: LINGUE_CANTO.map((l) => l.id),
        etichette: Object.fromEntries(LINGUE_CANTO.map((l) => [l.id, l.nome])),
      },
      {
        nome: "secondi",
        etichetta: "Quanto dura",
        descrizione: "Durata in secondi.",
        tipo: "numero",
        obbligatorio: false,
        min: 15,
        max: 240,
        predefinito: 60,
        valoriTipici: DURATE_BRANO,
      },
      /**
       * ⚠ I quattro campi qui sotto **mancavano**, ed erano gli unici comandi
       * della scheda che da fuori non si potevano toccare.
       *
       * Chiesto il 5 settembre 2026: «in produzione musica aggiungiamo tutti i
       * settaggi mancanti tipo bpm». Sul computer stanno sotto «Avanzati» e ci
       * sono da sempre; da telefono si poteva chiedere il genere e la durata, e
       * basta — cioè si poteva chiedere una canzone, non *quella* canzone.
       *
       * **Valgono per MiniMax Music 3.** ACE-Step non ha caselle per BPM,
       * tonalità e tempo: gliele si dà e non succede niente, e la descrizione
       * lo dice invece di far credere il contrario. «Strumentale» invece vale
       * per tutti e due.
       */
      {
        nome: "bpm",
        etichetta: "Quanto va veloce",
        descrizione:
          "Battiti al minuto: 70 è una ballata, 120 un pezzo da ballare, 170 una corsa. " +
          "Lo capisce MiniMax Music 3; ACE-Step decide da sé.",
        tipo: "numero",
        obbligatorio: false,
        min: 40,
        max: 220,
        valoriTipici: BPM_TIPICI,
      },
      {
        nome: "tonalita",
        etichetta: "In che tonalità",
        descrizione:
          "La scala del brano. Le minori suonano malinconiche, le maggiori aperte. " +
          "Vuoto vuol dire quella scelta sul computer. Solo MiniMax Music 3.",
        tipo: "scelta",
        obbligatorio: false,
        vuoto: "\u2014 quella scelta sul computer \u2014",
        scelte: TONALITA_CANTO.map((t) => t.id),
        etichette: Object.fromEntries(TONALITA_CANTO.map((t) => [t.id, t.nome])),
      },
      {
        nome: "tempo",
        etichetta: "Che ritmo",
        descrizione:
          "Quanti movimenti per battuta: 4/4 è quasi tutta la musica moderna, 3/4 è il valzer, " +
          "6/8 la ballata lenta. Solo MiniMax Music 3.",
        tipo: "scelta",
        obbligatorio: false,
        vuoto: "\u2014 quello scelto sul computer \u2014",
        scelte: TEMPI_CANTO.map((t) => t.id),
        etichette: Object.fromEntries(TEMPI_CANTO.map((t) => [t.id, t.nome])),
      },
      {
        nome: "strumentale",
        etichetta: "Senza voce",
        descrizione:
          "Solo la musica, nessuno che canta. È quello che succede anche lasciando vuoto il " +
          "testo, ma dirlo qui è più chiaro — e vale anche se un testo l'hai scritto.",
        tipo: "booleano",
        obbligatorio: false,
      },
      campoModello(MODELLI_MUSICA),
    ],
  },

  {
    id: "genera.voce",
    app: "voce",
    titolo: "Leggi un testo",
    descrizione:
      "Fa leggere un testo a voce alta con DaProdVoce, e salva il file audio.",
    produce: "file",
    risultato: "audio",
    permesso: "tutti",
    coda: true,
    campi: [
      {
        nome: "testo",
        etichetta: "Cosa deve dire",
        principale: true,
        descrizione: "Il testo da leggere.",
        tipo: "testo",
        obbligatorio: true,
        maxLunghezza: 4000,
        esempio: "Buonasera, benvenuti alla nostra trasmissione.",
      },
      {
        nome: "voce",
        etichetta: "Con che voce",
        descrizione: "Il nome della voce da usare. Vuoto vuol dire quella predefinita.",
        tipo: "testo",
        obbligatorio: false,
        maxLunghezza: 60,
      },
    ],
  },

  /* -------------------------------------------------------------- leggere */

  {
    id: "libreria.ultimi",
    app: null,
    titolo: "Gli ultimi risultati",
    descrizione:
      "Elenca le cose prodotte dalla suite, dalla più recente: brani, immagini e video di tutte le app insieme.",
    produce: "elenco",
    permesso: "tutti",
    coda: false,
    campi: [
      {
        nome: "tipo",
        etichetta: "Solo di un tipo",
        descrizione: "Restringe a un tipo solo. Vuoto vuol dire tutti.",
        tipo: "scelta",
        obbligatorio: false,
        scelte: ["audio", "immagine", "video"],
      },
      {
        nome: "app",
        etichetta: "Solo di un'app",
        descrizione: "Restringe all'app che l'ha prodotto. Vuoto vuol dire tutte.",
        tipo: "scelta",
        obbligatorio: false,
        scelte: [...APP_REMOTE],
      },
      {
        nome: "quanti",
        etichetta: "Quanti",
        descrizione: "Quante voci riportare.",
        tipo: "numero",
        obbligatorio: false,
        min: 1,
        max: 100,
        predefinito: 20,
      },
    ],
  },

  {
    id: "suite.stato",
    app: null,
    titolo: "Come sta la suite",
    descrizione:
      "Dice quali app sono accese, cosa sta generando la scheda video e quante richieste ci sono in fila.",
    produce: "elenco",
    permesso: "tutti",
    coda: false,
    campi: [],
  },

  {
    id: "coda.elenco",
    app: null,
    titolo: "La fila delle richieste",
    descrizione:
      "Elenca le richieste arrivate da fuori, con il loro stato: in attesa, accettata, in lavorazione, pronta.",
    produce: "elenco",
    permesso: "tutti",
    coda: false,
    campi: [
      {
        nome: "quante",
        etichetta: "Quante",
        descrizione: "Quante voci riportare, dalla più recente.",
        tipo: "numero",
        obbligatorio: false,
        min: 1,
        max: 100,
        predefinito: 20,
      },
    ],
  },

  /* -------------------------------------------------------------- decidere */

  {
    id: "coda.decidi",
    app: null,
    titolo: "Decidi su una richiesta",
    descrizione:
      "Accetta, manda in lavorazione o scarta una richiesta della fila. Solo il dispositivo admin.",
    produce: "niente",
    permesso: "admin",
    coda: false,
    campi: [
      {
        nome: "id",
        etichetta: "Quale richiesta",
        descrizione: "L'id della richiesta, come lo riporta coda.elenco.",
        tipo: "testo",
        obbligatorio: true,
        maxLunghezza: 60,
      },
      {
        nome: "stato",
        etichetta: "Cosa farne",
        descrizione: "La decisione.",
        tipo: "scelta",
        obbligatorio: true,
        scelte: ["accettata", "in-lavoro", "scartata", "archiviata"],
        etichette: {
          accettata: "Fallo",
          "in-lavoro": "Segnala come in lavorazione",
          scartata: "No",
          archiviata: "Mettila via",
        },
      },
      {
        nome: "motivo",
        etichetta: "Perché",
        descrizione: "La ragione, se la scarti. Arriva a chi l'aveva chiesta.",
        tipo: "testo",
        obbligatorio: false,
        maxLunghezza: 300,
      },
    ],
  },

  {
    id: "app.apri",
    app: null,
    titolo: "Apri un'app sul PC",
    descrizione:
      "Apre la finestra di un'app della suite sul computer. Serve a chi sta davanti al PC, non a chi guarda da fuori.",
    produce: "niente",
    permesso: "admin",
    coda: false,
    campi: [
      {
        nome: "app",
        etichetta: "Quale app",
        descrizione: "L'id dell'app da aprire.",
        tipo: "scelta",
        obbligatorio: true,
        scelte: [
          "visualizer",
          "musica",
          "foto",
          "cinema",
          "voce",
          "dream",
          "companion",
          "iodigitale",
        ],
      },
    ],
  },
] as const;

/**
 * I modelli dichiarati, scheda per scheda: li legge la prova che li confronta
 * con quelli veri delle schede.
 */
export const MODELLI_DICHIARATI: Readonly<Record<string, readonly string[]>> = {
  foto: MODELLI_FOTO.scelte,
  cinema: MODELLI_CINEMA.scelte,
  musica: MODELLI_MUSICA.scelte,
};

/** Un'azione dal suo id, se esiste. */
export function azione(id: string): Azione | undefined {
  return AZIONI.find((a) => a.id === id);
}

/** Le azioni che un ruolo può chiedere. */
export function azioniPer(ruolo: "admin" | "ospite"): readonly Azione[] {
  return ruolo === "admin" ? AZIONI : AZIONI.filter((a) => a.permesso === "tutti");
}
