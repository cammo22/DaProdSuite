/**
 * Come la suite trova, accende e usa WanGP.
 *
 * WanGP non sta dentro la suite: la sua licenza (WanGP Community License 2.0)
 * non permette di incorporarlo in un altro prodotto, e chi lo usa deve dirlo.
 * Lo accende Wan2GP Desktop Launcher, il programma Tauri di GKartist75, che
 * avvia l'interfaccia di WanGP su localhost; noi ci parliamo come a LM Studio.
 *
 * Dentro l'interfaccia di WanGP gira anche Deepy, l'agente, con la sua app web
 * su `/deepy/`. Un lavoro chiesto dal telefono diventa un messaggio a Deepy:
 * `POST /deepy/deepy_api/messages`, lo stesso che usa la sua pagina.
 */

import { execFile, spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";

/** Le porte dove il launcher (7861) o un avvio a mano (7860) mettono WanGP. */
const PORTE = [7861, 7860];

export const PAGINA_LAUNCHER = "https://github.com/GKartist75/Wan2GP-Desktop-Tauri/releases";

/** L'indirizzo di WanGP se risponde adesso, altrimenti null. */
export async function trovaWanGP(): Promise<string | null> {
  for (const porta of PORTE) {
    const base = `http://127.0.0.1:${porta}`;
    try {
      const risposta = await fetch(`${base}/deepy/deepy_api/state`, {
        signal: AbortSignal.timeout(1500),
      });
      if (risposta.ok) return base;
    } catch {
      // spento su questa porta: si prova la prossima
    }
  }
  return null;
}

/** Il launcher Tauri installato, se c'è. */
export function trovaLauncher(): string | null {
  const locale = process.env.LOCALAPPDATA;
  if (!locale) return null;
  const cartella = join(locale, "Wan2GP Desktop Launcher Tauri");
  if (!existsSync(cartella)) return null;
  const exe = readdirSync(cartella).find(
    (nome) => nome.toLowerCase().endsWith(".exe") && !nome.toLowerCase().startsWith("uninstall"),
  );
  return exe ? join(cartella, exe) : null;
}

/**
 * Accende WanGP con il launcher e aspetta che risponda.
 *
 * Il primo avvio carica Python e l'interfaccia: può metterci un paio di minuti.
 */
export async function accendiWanGP(attesaMs = 240_000): Promise<string> {
  const gia = await trovaWanGP();
  if (gia) return gia;

  const launcher = trovaLauncher();
  if (!launcher) {
    throw new Error(
      "Non trovo Wan2GP Desktop Launcher su questo computer. Installalo da " + PAGINA_LAUNCHER,
    );
  }
  const figlio = spawn(launcher, [], { detached: true, stdio: "ignore" });
  figlio.unref();

  const fine = Date.now() + attesaMs;
  while (Date.now() < fine) {
    await new Promise((r) => setTimeout(r, 3000));
    const base = await trovaWanGP();
    if (base) return base;
  }
  throw new Error("WanGP non ha risposto in tempo. Controlla la finestra del launcher.");
}

/** Manda un messaggio a Deepy. Torna l'id della richiesta. */
export async function scriviADeepy(testo: string): Promise<string> {
  const base = await accendiWanGP();
  const id = `daprod-${randomUUID()}`;
  const risposta = await fetch(`${base}/deepy/deepy_api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: testo, submission_id: id }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => "");
    throw new Error(`Deepy ha rifiutato la richiesta (${risposta.status}). ${dettaglio}`.trim());
  }
  return id;
}

/** Il pid del launcher acceso, se c'è. */
export function pidLauncher(exe: string): Promise<number | null> {
  return new Promise((risolvi) => {
    execFile(
      "tasklist",
      ["/FI", `IMAGENAME eq ${basename(exe)}`, "/FO", "CSV", "/NH"],
      { windowsHide: true },
      (errore, uscita) => {
        if (errore) return risolvi(null);
        const riga = uscita.split(String.fromCharCode(10)).find((r) => r.toLowerCase().includes(basename(exe).toLowerCase()));
        const pid = riga ? Number(riga.split('","')[1]) : NaN;
        risolvi(Number.isFinite(pid) ? pid : null);
      },
    );
  });
}

/** Porta davanti la finestra di un processo già acceso. */
export function portaDavanti(pid: number): void {
  execFile(
    "powershell",
    ["-NoProfile", "-Command", `(New-Object -ComObject WScript.Shell).AppActivate(${pid}) | Out-Null`],
    { windowsHide: true },
    () => {},
  );
}

/** Apre il launcher completo: lo accende, o lo porta davanti se è già acceso. */
export async function apriLauncher(exe: string): Promise<void> {
  const pid = await pidLauncher(exe);
  if (pid !== null) {
    portaDavanti(pid);
    return;
  }
  const figlio = spawn(exe, [], { detached: true, stdio: "ignore" });
  figlio.unref();
}
