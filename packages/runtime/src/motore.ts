/**
 * Installazione di ComfyUI, il motore di Musica, Foto e Cinema.
 *
 * ComfyUI non sta nel repo — è GPL-3.0 e la suite è MIT — quindi finché non c'era
 * questo file bisognava mettercelo a mano, ed era l'ultima cosa che impediva a
 * `git clone` di bastare (`docs/COME-SI-LAVORA.md` § 1).
 *
 * Si scarica lo zip di una versione **fissata**, non l'ultimo commit: ComfyUI
 * cambia ogni giorno, e la suite deve installare la stessa cosa che abbiamo
 * provato, non quella di stamattina. L'aggiornamento è una decisione nostra, che
 * si prende cambiando la costante qui sotto e riprovando i motori.
 *
 * Niente `git clone`: chi installa la suite dall'installer non ha per forza git.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { INTOCCABILI, filtraRequisiti } from "./requisiti";
import { ensureUv, installaRequisiti } from "./uv";
import { scaricaEScompatta } from "./zip";

/**
 * Versione provata: 0.33.1, quella su cui girano MiniMax Music 3 e Anima.
 *
 * Il salto dalla 0.33.0 è una riga sola del loro `model_prefetch.py`, e quella
 * riga è la nostra: senza, catturare un CUDA graph su un modulo che non ha
 * `_v_block` fa morire la generazione con `'RVQDepthDecoder' object has no
 * attribute '_v_block'` — l'errore che faceva cadere i brani a metà. Capitava
 * solo a noi perché avviamo il motore con `--disable-dynamic-vram`, che è
 * esattamente il caso che si erano persi.
 */
export const COMFY_VERSION = "0.33.1";

const COMFY_URL = `https://github.com/Comfy-Org/ComfyUI/archive/refs/tags/v${COMFY_VERSION}.zip`;

/**
 * Pacchetti che il `requirements.txt` di ComfyUI chiede e noi togliamo.
 *
 * I due `comfyui-*` sono i modelli di flusso di esempio e la documentazione
 * dell'editor: centinaia di MB per una finestra che l'utente della suite non
 * apre mai, perché l'interfaccia è la nostra. Gli altri sono gli
 * [intoccabili](requisiti.ts), torch in testa.
 */
const DA_TOGLIERE = ["comfyui-workflow-templates", "comfyui-embedded-docs", ...INTOCCABILI];

export interface InstallaMotoreOptions {
  /** `%LOCALAPPDATA%\DaProdSuite\engines` */
  enginesDir: string;
  /** Cartella del venv condiviso. */
  runtimeDir: string;
  toolsDir: string;
  /**
   * `requirements/versioni.txt`. ComfyUI dichiara le sue dipendenze come gli
   * pare — è codice loro — e senza questo file una sua riga può spostare
   * `transformers` sotto i piedi di DaProdDream e del Companion.
   */
  vincoli?: string;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
  /** Cosa sta succedendo, in italiano, mostrabile così com'è. */
  onPasso?: (etichetta: string) => void;
}

/** Vero se ComfyUI è già installato e utilizzabile. */
export function motorePresente(enginesDir: string): boolean {
  return existsSync(join(enginesDir, "ComfyUI", "main.py"));
}

/**
 * La versione installata, o null se il motore c'è ma non l'abbiamo messo noi.
 *
 * Scritta accanto al motore a installazione finita, come per i
 * [nodi custom](nodi.ts). Senza, fissare una versione qui dentro non servirebbe
 * a niente: chi ha già installato quella di prima si terrebbe quella per
 * sempre, e una correzione del motore non arriverebbe mai a chi la aspetta.
 */
export function versioneMotore(enginesDir: string): string | null {
  const segnaposto = join(enginesDir, "ComfyUI", ".daprod-versione");
  if (!existsSync(segnaposto)) return null;
  try {
    return readFileSync(segnaposto, "utf8").trim();
  } catch {
    return null;
  }
}

/** Vero se il motore c'è **ed è la versione che abbiamo provato noi**. */
export function motoreAggiornato(enginesDir: string): boolean {
  return motorePresente(enginesDir) && versioneMotore(enginesDir) === COMFY_VERSION;
}

export async function installaMotore(options: InstallaMotoreOptions): Promise<void> {
  const { enginesDir, runtimeDir, toolsDir, vincoli, segnale, onLine, onPasso } = options;
  const destinazione = join(enginesDir, "ComfyUI");

  if (motoreAggiornato(enginesDir)) {
    onLine?.(`ComfyUI ${COMFY_VERSION} è già installato: non lo tocco.`);
    return;
  }

  // C'è, ma non è la versione che vogliamo. Si sostituisce tutto invece di
  // scriverci sopra: sovrascrivere lascerebbe in giro i file che nel frattempo
  // sono spariti dal progetto, ed è il modo in cui un motore diventa una
  // versione che non esiste da nessuna parte e non si può più riprovare.
  if (motorePresente(enginesDir)) {
    const vecchia = versioneMotore(enginesDir) ?? "una versione che non abbiamo messo noi";
    onPasso?.(`Aggiorno il motore alla ${COMFY_VERSION}`);
    onLine?.(`ComfyUI: c'era ${vecchia}, la sostituisco con la ${COMFY_VERSION}.`);
    await rm(destinazione, { recursive: true, force: true });
  }

  await mkdir(enginesDir, { recursive: true });

  /* 1 — lo zip, aperto in una cartella provvisoria -------------------------- */
  onPasso?.(`Scarico ComfyUI ${COMFY_VERSION}`);
  const provvisoria = await scaricaEScompatta({
    url: COMFY_URL,
    lavoro: enginesDir,
    nome: `ComfyUI-${COMFY_VERSION}`,
    segnale,
    onLine,
  });

  /* 2 — al suo posto solo se è tutto lì ------------------------------------- */
  onPasso?.("Estraggo il motore");
  const estratta = join(provvisoria, `ComfyUI-${COMFY_VERSION}`);
  if (!existsSync(join(estratta, "main.py"))) {
    throw new Error(`Lo zip di ComfyUI non conteneva ${estratta}\\main.py.`);
  }
  await rename(estratta, destinazione);
  await rm(provvisoria, { recursive: true, force: true });

  /* 3 — dipendenze --------------------------------------------------------- */
  onPasso?.("Installo le librerie di ComfyUI");
  const requisiti = await scriviRequisiti(destinazione, enginesDir);
  const uv = await ensureUv({ toolsDir, onLine });
  await installaRequisiti({
    uv,
    runtimeDir,
    requisiti,
    vincoli,
    segnale,
    onLine,
    timeoutMs: 60 * 60_000,
  });

  /* 4 — la versione, scritta solo adesso ------------------------------------ */
  // Ultima di proposito: se qualcosa è andato storto prima, il motore risulta
  // da rifare e al prossimo tentativo si reinstalla da capo.
  await writeFile(join(destinazione, ".daprod-versione"), `${COMFY_VERSION}\n`, "utf8");
  onLine?.(`ComfyUI ${COMFY_VERSION} pronto.`);
}

/**
 * Il `requirements.txt` di ComfyUI meno quello che non ci serve, riscritto in
 * `engines/`. Sta lì e non dentro ComfyUI perché quella cartella è roba loro:
 * ci si scrive dentro solo quando la si sostituisce tutta.
 */
async function scriviRequisiti(comfyDir: string, enginesDir: string): Promise<string> {
  const originale = await readFile(join(comfyDir, "requirements.txt"), "utf8");
  const tenute = filtraRequisiti(originale, DA_TOGLIERE);

  const percorso = join(enginesDir, "comfy-requisiti.txt");
  await writeFile(
    percorso,
    [
      `# Generato da @daprod/runtime installando ComfyUI ${COMFY_VERSION}.`,
      `# È il loro requirements.txt senza: ${DA_TOGLIERE.join(", ")}.`,
      "# Le modifiche a mano si perdono alla prossima installazione del motore.",
      "",
      ...tenute,
      "",
    ].join("\n"),
    "utf8",
  );
  return percorso;
}
