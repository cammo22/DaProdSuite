/**
 * Impostazioni e sessione di ogni app, su disco.
 *
 * Un file per chiave, sotto %LOCALAPPDATA%\DaProdSuite\state\<app>\: un
 * salvataggio corrotto non si porta dietro gli altri, e disinstallare la suite
 * non cancella quello che l'utente aveva impostato.
 *
 * Viene da DaProdVisualizer, dove serviva solo a lui. Qui è generico perché
 * ogni app che si migra ha lo stesso bisogno.
 */

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppId } from "@daprod/ipc";
import { DATA_ROOT } from "./paths";
import { siVedeDaQualcheParte } from "./finestre";

function stateDir(appId: AppId): string {
  const dir = join(DATA_ROOT, "state", appId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Il nome della chiave arriva dal renderer: va ripulito prima di toccare il disco. */
function stateFile(appId: AppId, key: string): string {
  const safe = key.replace(/[^a-z0-9._-]/gi, "_");
  return join(stateDir(appId), `${safe}.json`);
}

export function readState(appId: AppId, key: string): unknown {
  try {
    return JSON.parse(readFileSync(stateFile(appId, key), "utf8"));
  } catch {
    return null;
  }
}

export function writeState(appId: AppId, key: string, value: unknown): void {
  try {
    // Scrittura atomica: un'interruzione a metà lascerebbe un JSON troncato, che
    // all'avvio dopo è indistinguibile da impostazioni corrotte.
    const target = stateFile(appId, key);
    const temp = `${target}.tmp`;
    writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
    renameSync(temp, target);
  } catch (error) {
    console.error(`[stato:${appId}] scrittura di "${key}" fallita`, error);
    rmSync(`${stateFile(appId, key)}.tmp`, { force: true });
  }
}

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

/**
 * Posizione e dimensione dell'ultima sessione, con i valori riportati entro
 * limiti sensati: un file scritto male non deve produrre una finestra alta zero
 * pixel o fuori da ogni schermo.
 *
 * ⚠ **Il pezzo sugli schermi mancava, e questa riga di commento lo prometteva
 * da mesi.** Il 9 settembre 2026 Cammo ha staccato il secondo monitor e
 * DaProdConnessione e' diventata irraggiungibile: la suite diceva «aperta», la
 * barra la mostrava, e la finestra stava a coordinate che nessuno schermo
 * copriva piu'. Adesso la posizione salvata si usa **solo se si vede ancora**;
 * se no si buttano x e y, e senza quelle Electron mette la finestra al centro.
 *
 * Si buttano **solo x e y**: la dimensione che uno si era scelto resta, che e'
 * mezza preferenza recuperata invece di zero. Il perche' per intero, e la
 * ragione per cui non si azzera tutto a ogni avvio, stanno in
 * `finestre.ts`.
 */
export function readBounds(appId: AppId, fallback: WindowBounds): WindowBounds {
  const raw = readState(appId, "window");
  if (typeof raw !== "object" || raw === null) return { ...fallback };

  const b = raw as Partial<WindowBounds>;
  const num = (v: unknown, predefinito: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : predefinito;

  const width = Math.max(360, num(b.width, fallback.width));
  const height = Math.max(280, num(b.height, fallback.height));
  const x = typeof b.x === "number" && Number.isFinite(b.x) ? Math.round(b.x) : undefined;
  const y = typeof b.y === "number" && Number.isFinite(b.y) ? Math.round(b.y) : undefined;

  // Una posizione a meta' (solo x, o solo y) non e' una posizione: si tratta
  // come se non ci fosse.
  const dovEra = x !== undefined && y !== undefined ? { x, y, width, height } : null;
  const ciSiVede = dovEra ? siVedeDaQualcheParte(dovEra) : false;

  return {
    x: ciSiVede ? x : undefined,
    y: ciSiVede ? y : undefined,
    width,
    height,
    maximized: b.maximized === true,
  };
}
