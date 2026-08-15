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
 */
export function readBounds(appId: AppId, fallback: WindowBounds): WindowBounds {
  const raw = readState(appId, "window");
  if (typeof raw !== "object" || raw === null) return { ...fallback };

  const b = raw as Partial<WindowBounds>;
  const num = (v: unknown, predefinito: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : predefinito;

  return {
    x: typeof b.x === "number" && Number.isFinite(b.x) ? Math.round(b.x) : undefined,
    y: typeof b.y === "number" && Number.isFinite(b.y) ? Math.round(b.y) : undefined,
    width: Math.max(360, num(b.width, fallback.width)),
    height: Math.max(280, num(b.height, fallback.height)),
    maximized: b.maximized === true,
  };
}
