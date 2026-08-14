/**
 * Lettura del catalogo modelli e verifica di cosa c'è già su disco.
 *
 * Tutti i modelli stanno in un'unica cartella condivisa: prima di questa suite,
 * Musica e Foto tenevano due copie separate degli stessi VAE e text encoder.
 * Qui un modello usato da due app si scarica una volta sola.
 *
 * Lo scaricamento vero arriva con la fase 2; questo modulo risponde già alla
 * domanda che serve all'hub: "quanti GB mancano perché questa app funzioni?".
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { MODELS_DIR } from "./paths";

export interface FileModel {
  label: string;
  kind: "file";
  dir: string;
  file: string;
  url: string;
  bytes: number;
}

export interface HfRepoModel {
  label: string;
  kind: "hf-repo";
  dir: string;
  repo: string;
  /** Pattern per `hf download`: scarica solo questi file. */
  include?: string[];
  /** Pattern per `hf download`: salta questi file. */
  exclude?: string[];
  bytes: number;
}

export interface OllamaModel {
  label: string;
  kind: "ollama";
  tag: string;
  bytes: number;
}

export type ModelEntry = FileModel | HfRepoModel | OllamaModel;

interface Manifest {
  version: number;
  models: Record<string, ModelEntry>;
}

const MANIFEST_PATH = app.isPackaged
  ? join(process.resourcesPath, "manifest", "models.json")
  : join(app.getAppPath(), "..", "..", "manifest", "models.json");

let cache: Manifest | null = null;

export function manifest(): Manifest {
  if (!cache) {
    cache = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  }
  return cache;
}

export function modelEntry(id: string): ModelEntry | undefined {
  return manifest().models[id];
}

/**
 * Un modello è presente se il suo file c'è ed è della dimensione attesa. Il
 * controllo sulla dimensione non è pedanteria: un download interrotto lascia un
 * file parziale che sembra esistere e poi fa fallire il caricamento dei pesi con
 * un errore incomprensibile.
 */
export function isModelPresent(id: string): boolean {
  const entry = modelEntry(id);
  if (!entry) return false;

  switch (entry.kind) {
    case "file": {
      const path = join(MODELS_DIR, entry.dir, entry.file);
      if (!existsSync(path)) return false;
      return statSync(path).size === entry.bytes;
    }
    case "hf-repo": {
      // Uno snapshot ha molti file di dimensione non nota a priori: ci si accerta
      // che la cartella esista e pesi almeno il 95% dell'atteso.
      const dir = join(MODELS_DIR, entry.dir);
      if (!existsSync(dir)) return false;
      return dirSize(dir) >= entry.bytes * 0.95;
    }
    case "ollama":
      // Li gestisce Ollama, che ha il suo archivio: la verifica è la fase 2.
      return false;
  }
}

/** Quanti GB mancano perché l'elenco di modelli sia completo. */
export async function missingModelsGb(ids: string[]): Promise<number> {
  let missing = 0;
  for (const id of ids) {
    const entry = modelEntry(id);
    if (!entry) continue;
    if (!isModelPresent(id)) missing += entry.bytes;
  }
  return Number((missing / 1024 ** 3).toFixed(1));
}

function dirSize(dir: string): number {
  let total = 0;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) total += dirSize(path);
    else if (item.isFile()) total += statSync(path).size;
  }
  return total;
}
