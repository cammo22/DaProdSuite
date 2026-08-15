/**
 * La libreria condivisa: tutto quello che le app della suite producono.
 *
 * È il punto in cui le app smettono di essere sette programmi separati. Il
 * Visualizer vede i brani generati da DaProdMusica; DaProdCinema prenderà quei
 * brani e le immagini di DaProdFoto; DaProdFoto manderà una copertina a un brano.
 * Nessuna app conosce le altre: conoscono tutte questa.
 *
 * La convenzione dei file viene da DaProdMusica, che l'aveva già:
 *
 *     <nome>.mp3          il risultato
 *     <nome>.json         i metadati (descrizione, testo, parametri, seed)
 *     <nome>.cover.jpg    la copertina, se c'è
 *
 * Generalizzata a tutti i tipi e a tutte le app. Niente database: la cartella
 * **è** la libreria. Se sposti un file a mano, la libreria se ne accorge; se la
 * suite sparisce, i tuoi risultati restano file normali.
 */

import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { APP_IDS, type AppId, type ElementoLibreria, type TipoElemento } from "@daprod/ipc";
import { codificaUrl } from "./file-scheme";
import { OUTPUT_DIR } from "./paths";

const SUFFISSO_COPERTINA = ".cover.jpg";

/** Cosa può stare nel nome di un file rinominato dall'utente. */
const NOME_PULITO = /[^\p{L}\p{N} _.,()[\]&'-]+/gu;

/** Una copertina più grande di così è un errore, non una copertina. */
const COPERTINA_MAX_BYTE = 4_000_000;

/** Estensione -> tipo. Quello che non è qui dentro non entra in libreria. */
const TIPI: Record<string, TipoElemento> = {
  ".mp3": "audio",
  ".wav": "audio",
  ".flac": "audio",
  ".ogg": "audio",
  ".opus": "audio",
  ".m4a": "audio",
  ".png": "immagine",
  ".jpg": "immagine",
  ".jpeg": "immagine",
  ".webp": "immagine",
  ".mp4": "video",
  ".webm": "video",
  ".mkv": "video",
};

class Libreria extends EventEmitter {
  private cache: ElementoLibreria[] = [];
  private ultimaScansione = 0;

  /** Cartella dei risultati di un'app. Creata al volo: serve prima che generi. */
  cartella(app: AppId): string {
    const dir = join(OUTPUT_DIR, app);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Elenco completo, dal più recente. La scansione è rifatta al massimo una
   * volta al secondo: l'hub e le app la chiedono spesso e leggere l'albero a
   * ogni richiesta sarebbe sprecato.
   */
  elenco(force = false): ElementoLibreria[] {
    const adesso = Date.now();
    if (!force && adesso - this.ultimaScansione < 1000) return this.cache;

    const trovati: ElementoLibreria[] = [];
    for (const app of APP_IDS) {
      const radice = join(OUTPUT_DIR, app);
      if (existsSync(radice)) raccogli(radice, radice, app, trovati);
    }
    trovati.sort((a, b) => b.creato - a.creato);

    this.cache = trovati;
    this.ultimaScansione = adesso;
    return trovati;
  }

  /** Filtra per tipo e/o app di origine. */
  cerca(filtro: { tipo?: TipoElemento; app?: AppId } = {}): ElementoLibreria[] {
    return this.elenco().filter(
      (e) => (!filtro.tipo || e.tipo === filtro.tipo) && (!filtro.app || e.app === filtro.app),
    );
  }

  trova(id: string): ElementoLibreria | undefined {
    const daCache = this.elenco().find((e) => e.id === id);
    if (daCache) return daCache;
    // Un file appena scritto può essere più giovane della cache: un'app che
    // rinomina il brano un istante dopo averlo generato lo cercherebbe invano.
    return this.elenco(true).find((e) => e.id === id);
  }

  /** Da chiamare quando un'app scrive un risultato, per aggiornare subito l'indice. */
  segnalaNovita(): void {
    this.emit("cambiata", this.elenco(true));
  }

  /* ------------------------------------------------------------- scrittura */
  //
  // Queste quattro sostituiscono `library_api.py` di MinimaxMusica, che faceva
  // le stesse cose come custom node di ComfyUI. Stando qui valgono per tutte le
  // app invece che per una, e continuano a funzionare anche a motore spento: il
  // Visualizer, che di Python non ne ha, può rinominare un brano lo stesso.

  /**
   * Cambia il nome di un elemento, portandosi dietro metadati e copertina.
   *
   * Rinomina il file vero, non un'etichetta in un database: dopo, il brano si
   * chiama così anche aprendo la cartella. Torna il nuovo elemento, perché
   * l'id — che è il percorso — è cambiato.
   */
  rinomina(id: string, nome: string): ElementoLibreria | null {
    const elemento = this.trova(id);
    if (!elemento) return null;

    const pulito = nome.replace(NOME_PULITO, "").trim().replace(/^\.+|\.+$/g, "").slice(0, 80);
    if (!pulito) return null;

    const cartella = dirname(elemento.percorso);
    const estensione = extname(elemento.percorso);
    let destinazione = join(cartella, pulito + estensione);

    // Due brani con lo stesso titolo capitano spesso (stesso testo, resa
    // diversa): il secondo diventa "titolo (2)" invece di cancellare il primo.
    let n = 2;
    while (
      existsSync(destinazione) &&
      destinazione.toLowerCase() !== elemento.percorso.toLowerCase()
    ) {
      destinazione = join(cartella, `${pulito} (${n})${estensione}`);
      n += 1;
    }

    for (const [prima, dopo] of accompagnatori(elemento.percorso, destinazione)) {
      if (existsSync(prima)) renameSync(prima, dopo);
    }
    renameSync(elemento.percorso, destinazione);

    this.segnalaNovita();
    return this.trova(relative(OUTPUT_DIR, destinazione).replace(/\\/g, "/")) ?? null;
  }

  /**
   * Mette o toglie la copertina di un elemento.
   *
   * L'immagine arriva già ritagliata quadrata come data URL: il ritaglio lo fa
   * la pagina con un canvas, che ce l'ha in casa. Farlo qui vorrebbe dire una
   * libreria di immagini in più nello shell per una cosa che il browser sa fare.
   */
  impostaCopertina(id: string, dataUrl: string | null): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    const copertina = senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA;

    if (!dataUrl) {
      if (existsSync(copertina)) rmSync(copertina);
      this.segnalaNovita();
      return true;
    }

    const virgola = dataUrl.indexOf(",");
    const base64 = virgola >= 0 ? dataUrl.slice(virgola + 1) : dataUrl;
    let dati: Buffer;
    try {
      dati = Buffer.from(base64, "base64");
    } catch {
      return false;
    }
    if (!dati.length || dati.length > COPERTINA_MAX_BYTE) return false;

    writeFileSync(copertina, dati);
    this.segnalaNovita();
    return true;
  }

  /** Scrive il `.json` che accompagna un elemento: descrizione, testo, seed, parametri. */
  scriviMeta(id: string, meta: Record<string, unknown>): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    writeFileSync(
      senzaEstensione(elemento.percorso) + ".json",
      JSON.stringify(meta, null, 1),
      "utf8",
    );
    this.segnalaNovita();
    return true;
  }

  /** Cancella un elemento con i suoi metadati e la sua copertina. */
  elimina(id: string): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    for (const extra of [
      senzaEstensione(elemento.percorso) + ".json",
      senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA,
    ]) {
      if (existsSync(extra)) rmSync(extra);
    }
    rmSync(elemento.percorso);

    this.segnalaNovita();
    return true;
  }
}

function senzaEstensione(percorso: string): string {
  return percorso.slice(0, -extname(percorso).length);
}

/** I file che vivono accanto a un risultato e devono seguirlo quando si sposta. */
function accompagnatori(prima: string, dopo: string): [string, string][] {
  const a = senzaEstensione(prima);
  const b = senzaEstensione(dopo);
  return [
    [a + ".json", b + ".json"],
    [a + SUFFISSO_COPERTINA, b + SUFFISSO_COPERTINA],
  ];
}

function raccogli(
  radice: string,
  dir: string,
  app: AppId,
  fuori: ElementoLibreria[],
): void {
  let voci;
  try {
    voci = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const voce of voci) {
    const percorso = join(dir, voce.name);

    if (voce.isDirectory()) {
      raccogli(radice, percorso, app, fuori);
      continue;
    }
    if (!voce.isFile()) continue;

    // I .json sono metadati di un altro file e le copertine appartengono al
    // brano che accompagnano: né gli uni né le altre sono elementi a sé.
    if (voce.name.endsWith(".json")) continue;
    if (voce.name.endsWith(SUFFISSO_COPERTINA)) continue;

    const tipo = TIPI[extname(voce.name).toLowerCase()];
    if (!tipo) continue;

    let stat;
    try {
      stat = statSync(percorso);
    } catch {
      continue;
    }

    const radiceNome = percorso.slice(0, -extname(percorso).length);
    const copertina = `${radiceNome}${SUFFISSO_COPERTINA}`;
    const metaFile = `${radiceNome}.json`;

    fuori.push({
      // Percorso relativo alla cartella dei risultati: resta lo stesso anche se
      // la suite viene installata altrove.
      id: relative(OUTPUT_DIR, percorso).replace(/\\/g, "/"),
      tipo,
      app,
      nome: leggiTitolo(metaFile) ?? basename(voce.name, extname(voce.name)),
      url: codificaUrl(percorso),
      percorso,
      bytes: stat.size,
      creato: stat.mtimeMs,
      copertina: existsSync(copertina) ? codificaUrl(copertina) : undefined,
      meta: leggiMeta(metaFile),
    });
  }
}

function leggiMeta(file: string): Record<string, unknown> | undefined {
  try {
    const dati = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return typeof dati === "object" && dati !== null
      ? (dati as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Titolo scritto nei metadati, se c'è: è meglio del nome del file. */
function leggiTitolo(file: string): string | undefined {
  const meta = leggiMeta(file);
  const titolo = meta?.["titolo"] ?? meta?.["title"];
  return typeof titolo === "string" && titolo.trim() ? titolo.trim() : undefined;
}

export const libreria = new Libreria();
