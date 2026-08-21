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

/** Le app che possono ricevere un lavoro da fuori, oggi. */
export const APP_REMOTE = ["foto", "cinema", "musica", "voce"] as const;

/** Quanto può essere lungo un prompt che arriva da fuori. */
const PROMPT_MAX = 2000;

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
      },
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
      },
    ],
  },

  {
    id: "genera.brano",
    app: "musica",
    titolo: "Fai un brano",
    descrizione:
      "Genera una canzone da una descrizione, con DaProdMusica. Se dai anche il testo, lo canta.",
    produce: "file",
    risultato: "audio",
    permesso: "tutti",
    coda: true,
    campi: [
      {
        nome: "descrizione",
        etichetta: "Che genere",
        principale: true,
        descrizione: "Genere, strumenti, atmosfera.",
        tipo: "testo",
        obbligatorio: true,
        maxLunghezza: PROMPT_MAX,
        esempio: "cantautorato italiano, chitarra acustica e archi, malinconico",
      },
      {
        nome: "testo",
        etichetta: "Il testo da cantare",
        descrizione: "Le parole. Vuoto vuol dire strumentale.",
        tipo: "testo",
        obbligatorio: false,
        maxLunghezza: 4000,
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
      },
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
        scelte: ["accettata", "in-lavoro", "scartata"],
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

/** Un'azione dal suo id, se esiste. */
export function azione(id: string): Azione | undefined {
  return AZIONI.find((a) => a.id === id);
}

/** Le azioni che un ruolo può chiedere. */
export function azioniPer(ruolo: "admin" | "ospite"): readonly Azione[] {
  return ruolo === "admin" ? AZIONI : AZIONI.filter((a) => a.permesso === "tutti");
}
