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
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { APP_IDS, type AppId, type ElementoLibreria, type TipoElemento } from "@daprod/ipc";
import { codificaUrl } from "./file-scheme";
import { OUTPUT_DIR } from "./paths";

const SUFFISSO_COPERTINA = ".cover.jpg";

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
    return this.elenco().find((e) => e.id === id);
  }

  /** Da chiamare quando un'app scrive un risultato, per aggiornare subito l'indice. */
  segnalaNovita(): void {
    this.emit("cambiata", this.elenco(true));
  }
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
