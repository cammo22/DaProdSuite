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
import { DURATE_BRANO, DURATE_VIDEO, LINGUE_CANTO, SEZIONI } from "./stili";

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
      {
        nome: "negativo",
        etichetta: "Cosa non ci deve essere",
        descrizione: "Quello da evitare. Si può lasciare vuoto.",
        tipo: "testo",
        obbligatorio: false,
        maxLunghezza: 500,
      },
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
      "Genera una clip video da una descrizione, con DaProdCinema. È la cosa più lenta della suite: minuti, non secondi.",
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
      {
        nome: "secondi",
        etichetta: "Quanto dura",
        descrizione: "Durata della clip in secondi. Più dura, più ci mette.",
        tipo: "numero",
        obbligatorio: false,
        min: 2,
        max: 10,
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
      /**
       * Lo stile pronto: riempie la descrizione al posto tuo.
       *
       * Chiesto il 26 agosto 2026 — «nella parte musica mancano stili» — ed è
       * la cosa che rende usabile la casella qui sopra da chi non sa che
       * «neapolitan neomelodic pop» è la frase giusta. Le scelte non stanno
       * qui dentro: le tiene il computer, una per persona, e le manda quando
       * qualcuno chiede le azioni. Vedi `stili.ts` nello shell.
       */
      {
        nome: "stile",
        etichetta: "Uno stile pronto",
        descrizione:
          "Se lo scegli, riempie «che genere» con le parole giuste. I tuoi stili stanno sul " +
          "computer e li ritrovi da qualunque dispositivo.",
        tipo: "scelta",
        obbligatorio: false,
        vuoto: "\u2014 scrivo io \u2014",
        // Riempite dal computer con gli stili di chi sta chiedendo.
        scelte: [],
      },
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
