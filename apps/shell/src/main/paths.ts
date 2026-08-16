/**
 * Dove vivono le cose.
 *
 * Regola: il programma sta in Program Files (o dove lo mette NSIS) ed è
 * sostituibile a ogni aggiornamento; runtime, modelli, risultati e log stanno in
 * %LOCALAPPDATA%\DaProdSuite e non vengono toccati mai. Così aggiornare la suite
 * non fa riscaricare 30 GB di modelli, e disinstallarla non cancella il lavoro.
 */

import { app } from "electron";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/** Radice dei dati utente: %LOCALAPPDATA%\DaProdSuite */
export const DATA_ROOT = join(app.getPath("appData"), "..", "Local", "DaProdSuite");

/** Ambiente Python condiviso da tutti i servizi. */
export const RUNTIME_DIR = join(DATA_ROOT, "runtime");

/** Unico posto in cui stanno i pesi dei modelli, condiviso fra le app. */
export const MODELS_DIR = join(DATA_ROOT, "models");

/** Risultati: brani, immagini, video, registrazioni. */
export const OUTPUT_DIR = join(DATA_ROOT, "output");

/** Motori di terze parti scaricati dalla suite (ComfyUI). Fuori dal repo: ComfyUI
 *  è GPL-3.0 e la suite è MIT, quindi si scarica, non si ridistribuisce. */
export const ENGINES_DIR = join(DATA_ROOT, "engines");

/** File rigenerabili: transcodifiche audio, anteprime. Cancellabili sempre. */
export const CACHE_DIR = join(DATA_ROOT, "cache");

/** Log dello shell e di ogni servizio Python. */
export const LOGS_DIR = join(DATA_ROOT, "logs");

/** Impostazioni della suite. */
export const SETTINGS_FILE = join(DATA_ROOT, "settings.json");

/** Interprete dell'ambiente condiviso. */
export const PYTHON_EXE = join(RUNTIME_DIR, "Scripts", "python.exe");

/** Strumenti scaricati dalla suite (uv), tenuti fuori dal venv. */
export const TOOLS_DIR = join(DATA_ROOT, "tools");

/** requirements/base.txt di @daprod/runtime, impacchettato con l'app. */
export const BASE_REQUIREMENTS = app.isPackaged
  ? join(process.resourcesPath, "requirements", "base.txt")
  : join(app.getAppPath(), "..", "..", "packages", "runtime", "requirements", "base.txt");

/**
 * Cartella dei servizi Python. In sviluppo sta nel repo; una volta impacchettata
 * finisce in resources/ accanto all'eseguibile (vedi extraResources nel
 * electron-builder.yml).
 */
export const SERVICES_DIR = app.isPackaged
  ? join(process.resourcesPath, "services")
  : join(app.getAppPath(), "..", "..", "services");

/**
 * La cartella dell'interfaccia di un'app: nel repo in sviluppo, in `resources`
 * una volta impacchettata.
 *
 * Serve a chi la deve servire: lo schema `daprod://` per Musica e Foto, e il
 * motore stesso per Dream, che la sua pagina se la serve da solo.
 */
export function cartellaApp(id: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, "apps", id)
    : join(app.getAppPath(), "..", id);
}

export function ensureDataDirs(): void {
  // RUNTIME_DIR non si crea qui: `uv venv` vuole creare lui la cartella e una
  // cartella vuota preesistente gli fa sospettare un ambiente rotto.
  for (const dir of [DATA_ROOT, MODELS_DIR, OUTPUT_DIR, LOGS_DIR, TOOLS_DIR, ENGINES_DIR, CACHE_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}
