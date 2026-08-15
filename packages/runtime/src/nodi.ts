/**
 * I nodi custom di ComfyUI: quelli che il motore non ha di suo.
 *
 * Certi modelli non girano sui nodi di serie. FLUX.2 Klein in GGUF vuole
 * `UnetLoaderGGUF` e `CLIPLoaderGGUF`, che stanno in ComfyUI-GGUF: senza quel
 * nodo il grafo viene rifiutato dal motore, e i 12 GB di pesi non servono a
 * niente. Finché non c'era questo file l'unico modo era metterlo a mano, cioè la
 * stessa cosa che ComfyUI stesso era prima di [motore.ts](motore.ts).
 *
 * Si installano come il motore, e per le stesse ragioni: **zip di un commit
 * fissato**, non `git clone` dell'ultimo (chi installa dall'installer non ha per
 * forza git, e un nodo aggiornato da sé può smettere di funzionare col motore
 * che abbiamo fissato). La versione installata resta scritta accanto al nodo,
 * così quando qui dentro cambiamo il commit il nodo si rifà da capo invece di
 * restare quello vecchio per sempre.
 *
 * **Non finiscono dentro la cartella di ComfyUI**: stanno in
 * `engines/custom_nodes`, che `services/comfy/avvio.py` aggiunge ai percorsi del
 * motore. La cartella di ComfyUI è roba loro — ci si scrive solo quando la si
 * sostituisce tutta — e così un nodo sopravvive all'aggiornamento del motore.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { INTOCCABILI, filtraRequisiti } from "./requisiti";
import { ensureUv, installaRequisiti } from "./uv";
import { scaricaEScompatta } from "./zip";

export interface NodoCustom {
  /** Cartella dentro `engines/custom_nodes`. È anche il nome con cui si legge nei log. */
  nome: string;
  /** `utente/repo` su GitHub. */
  repo: string;
  /** Commit fissato: quello con cui abbiamo provato i modelli che lo usano. */
  commit: string;
  /** Cosa ci fa la suite, in una riga. */
  perche: string;
  licenza: string;
}

/**
 * I nodi che la suite sa installare.
 *
 * Uno solo per ora, ma l'elenco è il punto: quando servirà un nodo per il video
 * o per l'upscaling si aggiunge una voce qui e il resto funziona già.
 */
export const NODI: Record<string, NodoCustom> = {
  "comfyui-gguf": {
    nome: "ComfyUI-GGUF",
    repo: "city96/ComfyUI-GGUF",
    // 12 gennaio 2026: è il commit con cui FLUX.2 Klein girava in Flux Klein
    // Studio, il progetto da cui viene DaProdFoto.
    commit: "6ea2651e7df66d7585f6ffee804b20e92fb38b8a",
    perche: "Carica i modelli quantizzati GGUF (FLUX.2 Klein e il suo text encoder).",
    licenza: "Apache-2.0",
  },
};

export interface InstallaNodoOptions {
  /** `%LOCALAPPDATA%\DaProdSuite\engines` */
  enginesDir: string;
  /** Cartella del venv condiviso. */
  runtimeDir: string;
  toolsDir: string;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
  /** Cosa sta succedendo, in italiano, mostrabile così com'è. */
  onPasso?: (etichetta: string) => void;
}

/** La cartella che il motore legge come sua, oltre alla propria. */
export function cartellaNodi(enginesDir: string): string {
  return join(enginesDir, "custom_nodes");
}

/**
 * Vero se il nodo c'è **ed è la versione che vogliamo noi**.
 *
 * Il confronto col commit non è pedanteria: un nodo di sei mesi fa che sembra
 * installato è esattamente il modo in cui si passa un pomeriggio a capire perché
 * un grafo che funziona qui non funziona lì.
 */
export function nodoPresente(enginesDir: string, id: string): boolean {
  const nodo = NODI[id];
  if (!nodo) return false;

  const cartella = join(cartellaNodi(enginesDir), nodo.nome);
  if (!existsSync(join(cartella, "__init__.py"))) return false;

  try {
    return versioneInstallata(cartella) === nodo.commit;
  } catch {
    return false;
  }
}

/** Gli id dei nodi dell'elenco che mancano o sono di una versione vecchia. */
export function nodiMancanti(enginesDir: string, ids: string[]): string[] {
  return ids.filter((id) => NODI[id] && !nodoPresente(enginesDir, id));
}

export async function installaNodo(id: string, options: InstallaNodoOptions): Promise<void> {
  const nodo = NODI[id];
  if (!nodo) throw new Error(`Nodo sconosciuto: ${id}.`);

  const { enginesDir, runtimeDir, toolsDir, segnale, onLine, onPasso } = options;
  const destinazione = join(cartellaNodi(enginesDir), nodo.nome);

  if (nodoPresente(enginesDir, id)) {
    onLine?.(`${nodo.nome} è già installato alla versione giusta: non lo tocco.`);
    return;
  }

  onPasso?.(`Installo ${nodo.nome} nel motore`);
  onLine?.(`${nodo.nome} (${nodo.licenza}) — ${nodo.perche}`);

  /* 1 — lo zip del commit fissato ------------------------------------------ */
  const url = `https://github.com/${nodo.repo}/archive/${nodo.commit}.zip`;
  const provvisoria = await scaricaEScompatta({
    url,
    lavoro: enginesDir,
    nome: nodo.nome,
    segnale,
    onLine,
  });

  // Lo zip di GitHub contiene una sola cartella, chiamata repo-commit.
  const estratta = join(provvisoria, `${nodo.repo.split("/")[1]}-${nodo.commit}`);
  if (!existsSync(join(estratta, "__init__.py"))) {
    await rm(provvisoria, { recursive: true, force: true });
    throw new Error(`Lo zip di ${nodo.nome} non conteneva ${estratta}\\__init__.py.`);
  }

  // Una versione vecchia va tolta tutta: sovrascrivere lascerebbe in giro i file
  // che nel frattempo sono stati cancellati dal progetto.
  await rm(destinazione, { recursive: true, force: true });
  await mkdir(cartellaNodi(enginesDir), { recursive: true });
  await rename(estratta, destinazione);
  await rm(provvisoria, { recursive: true, force: true });

  /* 2 — le sue dipendenze nell'ambiente condiviso -------------------------- */
  const requisiti = join(destinazione, "requirements.txt");
  if (existsSync(requisiti)) {
    onPasso?.(`Installo le librerie di ${nodo.nome}`);
    const righe = filtraRequisiti(await readFile(requisiti, "utf8"), INTOCCABILI);
    if (righe.length > 0) {
      const nostro = join(enginesDir, `requisiti-${nodo.nome}.txt`);
      await writeFile(
        nostro,
        [
          `# Generato da @daprod/runtime installando ${nodo.nome} ${nodo.commit.slice(0, 7)}.`,
          `# È il loro requirements.txt senza: ${INTOCCABILI.join(", ")}.`,
          "# Le modifiche a mano si perdono alla prossima installazione del nodo.",
          "",
          ...righe,
          "",
        ].join("\n"),
        "utf8",
      );
      const uv = await ensureUv({ toolsDir, onLine });
      await installaRequisiti({
        uv,
        runtimeDir,
        requisiti: nostro,
        segnale,
        onLine,
        timeoutMs: 30 * 60_000,
      });
    }
  }

  /* 3 — la versione, scritta solo adesso ----------------------------------- */
  // Ultimo passo di proposito: se qualcosa è andato storto prima, il nodo
  // risulta da installare e al prossimo tentativo si rifà da capo.
  await writeFile(
    join(destinazione, ".daprod-versione"),
    `${nodo.commit}\n`,
    "utf8",
  );
  onLine?.(`${nodo.nome} pronto.`);
}

/**
 * Il commit con cui il nodo è stato installato, o null se non lo sappiamo.
 *
 * Letta in modo sincrono di proposito: `nodoPresente` è una domanda che si fa
 * mentre si disegna una scheda, non un'operazione.
 */
function versioneInstallata(cartella: string): string | null {
  const segnaposto = join(cartella, ".daprod-versione");
  if (!existsSync(segnaposto)) return null;
  return readFileSync(segnaposto, "utf8").trim();
}
