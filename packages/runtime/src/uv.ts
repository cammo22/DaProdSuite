/**
 * Reperimento di `uv`.
 *
 * uv è lo strumento con cui la suite crea l'ambiente Python e installa i
 * pacchetti. Lo usano già i tuoi `setup.ps1`, e fa una cosa che qui vale molto:
 * sa scaricare da solo l'interprete Python 3.12, quindi l'utente non deve
 * installare nulla a mano (il Python di sistema è il 3.14, che non ha ancora le
 * wheel di torch).
 *
 * Se è già nel PATH si usa quello. Altrimenti se ne scarica una copia privata
 * dentro la cartella dati della suite, senza toccare il sistema.
 */

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { capture, run } from "./exec";

/**
 * Versione fissata: un aggiornamento di uv che cambia comportamento non deve
 * poter rompere l'installazione di chi installa la suite domani.
 */
const UV_VERSION = "0.9.5";
const UV_URL = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-x86_64-pc-windows-msvc.zip`;

export interface UvOptions {
  /** Dove mettere la copia privata se serve scaricarla. */
  toolsDir: string;
  onLine?: (line: string) => void;
}

/** Restituisce il percorso di un `uv` utilizzabile, scaricandolo se manca. */
export async function ensureUv({ toolsDir, onLine }: UvOptions): Promise<string> {
  const locale = join(toolsDir, "uv.exe");
  if (existsSync(locale)) return locale;

  // Se l'utente ha già uv (come su questa macchina), non se ne scarica un'altra copia.
  try {
    const versione = await capture("uv", ["--version"]);
    onLine?.(`uv già presente nel sistema: ${versione}`);
    return "uv";
  } catch {
    onLine?.("uv non trovato nel sistema, lo scarico.");
  }

  await mkdir(toolsDir, { recursive: true });
  const zip = join(toolsDir, "uv.zip");

  onLine?.(`Scarico uv ${UV_VERSION}…`);
  const risposta = await fetch(UV_URL);
  if (!risposta.ok) {
    throw new Error(`Scaricamento di uv fallito: HTTP ${risposta.status} da ${UV_URL}`);
  }
  await writeFile(zip, Buffer.from(await risposta.arrayBuffer()));

  onLine?.("Estraggo uv…");
  // Expand-Archive è in Windows di serie: evita di aggiungere una libreria di
  // decompressione solo per questo passaggio.
  await run("powershell", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${toolsDir}' -Force`,
  ]);
  await rm(zip, { force: true });

  if (!existsSync(locale)) {
    throw new Error(`uv.exe non è comparso in ${toolsDir} dopo l'estrazione.`);
  }
  onLine?.(`uv ${UV_VERSION} pronto.`);
  return locale;
}
