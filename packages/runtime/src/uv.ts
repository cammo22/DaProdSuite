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
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
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

export interface InstallaRequisitiOptions {
  /** Percorso di uv, da `ensureUv`. */
  uv: string;
  /** Cartella del venv condiviso. */
  runtimeDir: string;
  /** File dei requisiti già scritto da noi. */
  requisiti: string;
  /**
   * `requirements/versioni.txt`: le versioni che abbiamo provato.
   *
   * Passato a **ogni** installazione, comprese quelle dei requisiti di ComfyUI
   * e dei nodi custom, che non abbiamo scritto noi. È l'unica cosa che impedisce
   * al codice di terzi di spostare una libreria condivisa sotto i piedi degli
   * altri cinque motori — vedi l'intestazione di quel file, che racconta la
   * notte in cui è successo.
   *
   * Facoltativo perché chi installa un nodo in una prova a mano non deve
   * per forza averlo; nella suite c'è sempre.
   */
  vincoli?: string;
  timeoutMs?: number;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
}

/**
 * `uv pip install -r`, con un secondo tentativo a `__pycache__` sgombre.
 *
 * Aggiornare un pacchetto vuol dire prima togliere quello vecchio, e su Windows
 * togliere le sue `__pycache__` a volte fallisce con "reparse point" (errore
 * 4395): sono file appena scritti da Python che il filtro dell'antivirus sta
 * ancora guardando. Le stesse cartelle si cancellano benissimo un attimo dopo,
 * e infatti sgombrarle noi e riprovare fa passare l'installazione.
 *
 * Sembra un dettaglio e non lo è: senza, l'installazione del motore si ferma in
 * fondo — dopo aver scaricato tutto — per un motivo che con i pacchetti non
 * c'entra niente, e all'utente resta un "uv è uscito con codice 2".
 *
 * I `.pyc` non sono un danno da riparare: Python li riscrive da solo la prima
 * volta che quel modulo serve.
 */
export async function installaRequisiti(options: InstallaRequisitiOptions): Promise<void> {
  const { uv, runtimeDir, requisiti, vincoli, timeoutMs, segnale, onLine } = options;
  const argomenti = [
    "pip",
    "install",
    "--python",
    join(runtimeDir, "Scripts", "python.exe"),
    "-r",
    requisiti,
    ...(vincoli && existsSync(vincoli) ? ["--constraint", vincoli] : []),
  ];

  // Le ultime righe di uv, tenute da parte per poter riconoscere *quale*
  // fallimento è stato: quello dell'antivirus si riprova, quello dei vincoli no.
  const ultime: string[] = [];
  const ascolta = (riga: string) => {
    ultime.push(riga);
    if (ultime.length > 40) ultime.shift();
    onLine?.(riga);
  };

  try {
    await run(uv, argomenti, { segnale, onLine: ascolta, timeoutMs });
  } catch (err) {
    if (segnale?.aborted) throw err;
    if (vincoliInsoddisfacibili(ultime)) throw new VincoliInConflitto(ultime, err);

    onLine?.(
      `Installazione non riuscita al primo colpo (${
        err instanceof Error ? err.message : String(err)
      }): sgombro le cache di Python e riprovo.`,
    );
    const tolte = await svuotaPycache(join(runtimeDir, "Lib", "site-packages"));
    onLine?.(`Tolte ${tolte} cartelle __pycache__.`);
    ultime.length = 0;
    try {
      await run(uv, argomenti, { segnale, onLine: ascolta, timeoutMs });
    } catch (err2) {
      if (!segnale?.aborted && vincoliInsoddisfacibili(ultime)) {
        throw new VincoliInConflitto(ultime, err2);
      }
      throw err2;
    }
  }
}

export interface LibreriePrivateOptions {
  /** Percorso di uv, da `ensureUv`. */
  uv: string;
  /** Cartella del venv condiviso: serve solo a dire a uv per quale Python. */
  runtimeDir: string;
  /** File dei requisiti privati del motore. */
  requisiti: string;
  /** Cartella dove finiscono, fuori dall'ambiente condiviso. */
  destinazione: string;
  timeoutMs?: number;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
}

/**
 * Librerie che un motore vuole **in una versione diversa** da quella comune.
 *
 * Nasce il 21 agosto 2026 con DaProdVoce, e la ragione va scritta perché è
 * l'eccezione a una regola che vale ancora:
 *
 * Il modello di sintesi vocale Audio8 si porta il proprio codice, e quel codice
 * è scritto per `transformers` 4.57. L'ambiente della suite ha la 5.15, che è la
 * versione con cui girano gli altri cinque motori. Le due non sono compatibili
 * su questo punto — la 5 ha unificato le cache dei modelli ibridi, e sul modello
 * Audio8 il risultato non è un errore ma **una voce che non smette più di
 * parlare**, il che è peggio: sembra un difetto del modello. Provato il 21
 * agosto 2026, con le due versioni una accanto all'altra.
 *
 * Le due strade sbagliate erano: **abbassare la versione comune** (cioè rompere
 * gli altri cinque motori per farne funzionare uno) e **un secondo ambiente
 * intero** (cioè altri 2,5 GB di torch). Questa è la terza: `uv pip install
 * --target`, che scrive in una **cartella normale** invece che nel venv, e il
 * motore se la mette davanti a `sys.path` all'avvio. Centoquindici MB, e
 * l'ambiente condiviso resta identico a prima — gli altri motori non vedono mai
 * quella cartella, perché è il processo di DaProdVoce a metterla nel proprio
 * percorso, nessun altro.
 *
 * **Niente file dei vincoli qui, ed è il punto.** `versioni.txt` è la legge
 * dell'ambiente condiviso; questa cartella non è l'ambiente condiviso, e
 * applicare la legge di là vorrebbe dire ottenere di nuovo la 5.15 — cioè
 * niente. Quello che entra qui sta scritto per esteso in
 * `services/<id>/requisiti-privati.txt`, con i numeri fissi.
 */
export async function installaLibreriePrivate(options: LibreriePrivateOptions): Promise<void> {
  const { uv, runtimeDir, requisiti, destinazione, timeoutMs, segnale, onLine } = options;

  await run(
    uv,
    [
      "pip",
      "install",
      "--python",
      join(runtimeDir, "Scripts", "python.exe"),
      "--target",
      destinazione,
      "-r",
      requisiti,
    ],
    { segnale, onLine, timeoutMs },
  );
}

/**
 * Qualcosa pretende una versione diversa da quella che abbiamo provato.
 *
 * Non è un guasto: è il file dei vincoli che fa il suo mestiere. Ha una classe
 * sua perché va detto in un altro modo — riprovare non serve a niente, e
 * sgombrare le `__pycache__` men che meno.
 */
export class VincoliInConflitto extends Error {
  constructor(
    readonly righe: string[],
    readonly causa: unknown,
  ) {
    super(
      "Una libreria pretende una versione diversa da quella che abbiamo provato, " +
        "quindi non ho installato niente — l'ambiente resta com'era.\n\n" +
        spiegazione(righe) +
        "\n\nLa scelta è nostra e sta in `requirements/versioni.txt`: o si alza " +
        "il numero lì dentro e si riprovano i motori, o quel pacchetto resta " +
        "fuori. Non è una cosa da decidere in mezzo a un'installazione, ed è " +
        "esattamente perché il file esiste.",
    );
    this.name = "VincoliInConflitto";
  }
}

/** Le righe di uv che raccontano il conflitto, se ci sono. */
function spiegazione(righe: string[]): string {
  const utili = righe.filter((r) => /depends on|no solution|only .* is available|resolution/i.test(r));
  return (utili.length > 0 ? utili : righe.slice(-6)).join("\n").trim();
}

/**
 * Vero se uv si è fermato perché non esiste una combinazione possibile.
 *
 * Si riconosce dal testo perché uv non ha un codice d'uscita diverso per questo
 * caso: esce 1 o 2 come per qualunque altro intoppo, e l'unica differenza è
 * quello che ha scritto.
 */
function vincoliInsoddisfacibili(righe: string[]): boolean {
  return righe.some((riga) => /no solution found|resolution-impossible/i.test(riga));
}

/** Cancella tutte le `__pycache__` sotto una cartella. Torna quante ne ha tolte. */
async function svuotaPycache(radice: string): Promise<number> {
  let tolte = 0;
  let voci;
  try {
    voci = await readdir(radice, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const voce of voci) {
    if (!voce.isDirectory()) continue;
    const percorso = join(radice, voce.name);
    if (voce.name === "__pycache__") {
      // Se anche a noi resiste, pazienza: l'importante è averci provato prima
      // di rilanciare uv, non fare pulizia perfetta.
      await rm(percorso, { recursive: true, force: true }).then(
        () => tolte++,
        () => {},
      );
    } else {
      tolte += await svuotaPycache(percorso);
    }
  }
  return tolte;
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
