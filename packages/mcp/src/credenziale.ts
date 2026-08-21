/**
 * Dove il server MCP tiene il suo accesso alla suite.
 *
 * Un agente è un dispositivo come gli altri: si accoppia col codice di otto
 * cifre, riceve un token, e da lì in poi passa dal gateway come il telefono e
 * la console. Non c'è una porta di servizio per i programmi — se ci fosse,
 * sarebbe la porta che qualcuno lascerebbe aperta.
 *
 * Il token sta accanto agli altri dati della suite, in un file suo: revocare
 * l'agente dal pannello «Da fuori» lo chiude fuori come chiunque altro, e
 * cancellare questo file non porta via niente al resto.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Credenziale {
  /** Indirizzo del gateway: "192.168.1.20:8790". */
  host: string;
  token: string;
  /** Il nome del computer su cui gira la suite, per i messaggi. */
  computer?: string;
}

/**
 * Il file della credenziale.
 *
 * Su Windows sta nella cartella dati della suite, la stessa di `remoto.json`;
 * altrove sotto `~/.daprod`. La variabile `DAPROD_MCP_FILE` la sposta, per chi
 * ne vuole due (un agente per il PC di casa, uno per quello dello studio).
 */
export function fileCredenziale(): string {
  if (process.env.DAPROD_MCP_FILE) return process.env.DAPROD_MCP_FILE;
  const dati = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "DaProdSuite", "remoto")
    : join(homedir(), ".daprod");
  return join(dati, "mcp.json");
}

/**
 * Legge la credenziale.
 *
 * Le variabili d'ambiente vincono sul file: chi lancia il server dentro una
 * configurazione MCP può passare tutto da lì senza accoppiare niente.
 */
export function leggiCredenziale(): Credenziale | null {
  const host = process.env.DAPROD_GATEWAY;
  const token = process.env.DAPROD_TOKEN;
  if (host && token) return { host, token };

  const file = fileCredenziale();
  if (!existsSync(file)) return null;
  try {
    const letto = JSON.parse(readFileSync(file, "utf8")) as Partial<Credenziale>;
    if (!letto.host || !letto.token) return null;
    return { host: letto.host, token: letto.token, computer: letto.computer };
  } catch {
    return null;
  }
}

export function salvaCredenziale(credenziale: Credenziale): void {
  const file = fileCredenziale();
  mkdirSync(dirname(file), { recursive: true });
  const temporaneo = `${file}.tmp`;
  writeFileSync(temporaneo, `${JSON.stringify(credenziale, null, 2)}\n`, "utf8");
  renameSync(temporaneo, file);
}
