/**
 * Le cartelle importanti, e come arrivarci in un tocco.
 *
 * **Cosa è stato chiesto, il 26 agosto 2026:**
 *
 * > «Tutto quello pubblicato su DaProd finisce in una cartella separata in modo
 * > da non perdere quei file. Facciamo un collegamento rapido a queste cartelle
 * > nella suite.» E prima: «facciamo una cartella per ogni utente in modo tale
 * > da tenere sempre i dati degli utenti sotto controllo».
 *
 * ## Perché una copia e non uno spostamento
 *
 * Mettere una cosa in bacheca **non deve toglierla dalla tua galleria**: è un
 * gesto in più, non un trasloco. Se il file si spostasse, chi lo pubblica se lo
 * vedrebbe sparire da dove lo cerca — e chi lo toglie dalla bacheca dovrebbe
 * ritrovarselo indietro, cioè un secondo trasloco all'indietro che prima o poi
 * andrebbe storto.
 *
 * Quindi si **copia**. Costa dello spazio, ed è il prezzo di una promessa
 * mantenuta: «in modo da non perdere quei file» vuol dire che quella cartella
 * sopravvive a una cancellazione fatta per sbaglio dall'altra parte.
 *
 * ## E il nome dice di chi è
 *
 * `Cammo — un faro sulla scogliera.png`. Aprendo quella cartella con Esplora
 * risorse si legge chi ha fatto cosa, senza aprire niente. È lo stesso motivo
 * per cui i file prendono il nome del prompt invece di `daprod_00042_.png`.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { DATA_ROOT, OUTPUT_DIR } from "./paths";
import { createLogger } from "./logging";

const log = createLogger("cartelle");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Dove finisce quello che le persone mettono in bacheca. */
export const CARTELLA_DAPROD = join(DATA_ROOT, "daprod");

/** Dove stanno le cartelle delle persone: una per chi si è collegato. */
export const CARTELLA_PERSONE = join(DATA_ROOT, "persone");

/**
 * Le cartelle che vale la pena poter aprire con un tocco.
 *
 * Sono quattro e sono quelle che si cercano davvero: quello che la suite ha
 * prodotto, quello che è stato messo in mostra, la roba delle persone, e i
 * registri quando qualcosa non va. I modelli no: sono trenta giga che non si
 * aprono per curiosità, e chi ha bisogno di quel percorso lo sa già.
 */
export interface CartellaImportante {
  id: string;
  nome: string;
  /** Cosa ci si trova dentro, in una riga. */
  che: string;
  percorso: string;
  /** Quanti file ci sono dentro. `-1` se non si è potuto contare. */
  quanti: number;
}

export function cartelleImportanti(): CartellaImportante[] {
  return [
    {
      id: "output",
      nome: "Quello che hai fatto",
      che: "brani, immagini e video, divisi per scheda",
      percorso: OUTPUT_DIR,
      quanti: quantiDentro(OUTPUT_DIR),
    },
    {
      id: "daprod",
      nome: "Messo in DaProd",
      che: "una copia di tutto quello che è stato messo in bacheca",
      percorso: CARTELLA_DAPROD,
      quanti: quantiDentro(CARTELLA_DAPROD),
    },
    {
      id: "persone",
      nome: "Le persone",
      che: "una cartella a testa: stili e preferenze di chi si è collegato",
      percorso: CARTELLA_PERSONE,
      quanti: quantiDentro(CARTELLA_PERSONE),
    },
    {
      id: "logs",
      nome: "I registri",
      che: "cosa ha fatto la suite, quando qualcosa non torna",
      percorso: join(DATA_ROOT, "logs"),
      quanti: quantiDentro(join(DATA_ROOT, "logs")),
    },
  ];
}

/**
 * Quanti file ci sono, contando anche le sottocartelle.
 *
 * Si ferma a due livelli e a mille file: serve un numero da mostrare accanto a
 * un tasto, non un censimento — e su una libreria di trentamila immagini un
 * censimento sarebbe mezzo secondo speso per una cifra che nessuno legge fino
 * in fondo.
 */
function quantiDentro(dove: string, profondita = 2): number {
  if (!existsSync(dove)) return 0;
  try {
    let conto = 0;
    for (const voce of readdirSync(dove, { withFileTypes: true })) {
      if (conto > 1000) return conto;
      if (voce.isDirectory()) {
        if (profondita > 0) conto += quantiDentro(join(dove, voce.name), profondita - 1);
        continue;
      }
      // I metadati e le copertine accompagnano un file: contarli vorrebbe dire
      // dire «300» dove ce ne sono cento.
      if (voce.name.endsWith(".json") || voce.name.endsWith(".cover.jpg")) continue;
      conto += 1;
    }
    return conto;
  } catch {
    return -1;
  }
}

/**
 * Mette una copia di una cosa nella cartella di DaProd.
 *
 * Si chiama quando qualcuno la pubblica. Se la copia c'è già non si rifà: la
 * stessa cosa messa e tolta dalla bacheca tre volte non deve lasciare tre file.
 *
 * Torna il percorso della copia, o null se non si è potuto fare — e in quel
 * caso **non è un guaio**: la pubblicazione è avvenuta lo stesso, e la copia è
 * una comodità in più, non la cosa vera.
 */
export function tieniInDaProd(dati: {
  percorso: string;
  chiNome?: string;
  titolo?: string;
}): string | null {
  try {
    if (!existsSync(dati.percorso)) return null;
    mkdirSync(CARTELLA_DAPROD, { recursive: true });

    const coda = extname(dati.percorso) || ".bin";
    const titolo = (dati.titolo || basename(dati.percorso, coda)).trim();
    const chi = (dati.chiNome || "").trim();
    const nome = `${chi ? chi + " — " : ""}${titolo}`
      .replace(/[/\\:*?"<>|]/g, "-")
      .slice(0, 90);

    let dove = join(CARTELLA_DAPROD, `${nome}${coda}`);
    // Stesso nome e stessa dimensione: è già lui, non se ne fa un secondo.
    if (esisteUguale(dove, dati.percorso)) return dove;
    for (let n = 2; existsSync(dove) && n < 100; n += 1) {
      dove = join(CARTELLA_DAPROD, `${nome} (${n})${coda}`);
      if (esisteUguale(dove, dati.percorso)) return dove;
    }

    copyFileSync(dati.percorso, dove);
    annota(`in DaProd: ${basename(dove)}`);
    return dove;
  } catch (err) {
    annota(`non sono riuscito a copiare in DaProd: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

function esisteUguale(copia: string, originale: string): boolean {
  try {
    if (!existsSync(copia)) return false;
    return statSync(copia).size === statSync(originale).size;
  } catch {
    return false;
  }
}
