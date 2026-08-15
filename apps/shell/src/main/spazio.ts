/**
 * Quanto occupa la suite, e come liberare spazio.
 *
 * I modelli sono decine di GB e non c'è modo di indovinare quali servano
 * ancora: l'unico che lo sa è chi usa il programma. Quindi si mostra tutto,
 * voce per voce, e si lascia cancellare — spiegando ogni volta cosa comporta.
 *
 * Regola di sicurezza: si cancella **solo** dentro %LOCALAPPDATA%\DaProdSuite.
 * Ogni percorso viene verificato prima di essere toccato, così nemmeno un id
 * malformato può far cancellare qualcosa fuori.
 */

import { existsSync, readdirSync, rmSync, statSync, statfsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { CategoriaSpazio, VoceSpazio } from "@daprod/ipc";
import { CACHE_DIR, DATA_ROOT, ENGINES_DIR, LOGS_DIR, MODELS_DIR, OUTPUT_DIR, RUNTIME_DIR } from "./paths";

/** Somma ricorsiva. Ritorna 0 se il percorso non c'è: non è un errore. */
export function peso(percorso: string): number {
  if (!existsSync(percorso)) return 0;
  let totale = 0;
  let voci;
  try {
    voci = readdirSync(percorso, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const voce of voci) {
    const p = join(percorso, voce.name);
    try {
      if (voce.isDirectory()) totale += peso(p);
      else if (voce.isFile()) totale += statSync(p).size;
    } catch {
      // File sparito o in uso mentre si contava: si salta.
    }
  }
  return totale;
}

interface Radice {
  categoria: CategoriaSpazio;
  percorso: string;
  etichetta: string;
  conseguenza: string;
  /** true = si elencano le sottocartelle una per una, non solo il totale. */
  dettaglia: boolean;
}

const RADICI: Radice[] = [
  {
    categoria: "modelli",
    percorso: MODELS_DIR,
    etichetta: "Modelli",
    conseguenza: "Va riscaricato prima di usare le app che lo richiedono.",
    dettaglia: true,
  },
  {
    categoria: "risultati",
    percorso: OUTPUT_DIR,
    etichetta: "Risultati",
    conseguenza: "Sono i tuoi brani, immagini e video. Cancellati non tornano.",
    dettaglia: true,
  },
  {
    categoria: "ambiente",
    percorso: RUNTIME_DIR,
    etichetta: "Ambiente Python",
    conseguenza: "Va reinstallato: circa 4 GB da scaricare.",
    dettaglia: false,
  },
  {
    categoria: "motori",
    percorso: ENGINES_DIR,
    etichetta: "Motori",
    conseguenza: "ComfyUI e simili: vengono riscaricati al prossimo avvio.",
    dettaglia: false,
  },
  {
    categoria: "cache",
    percorso: CACHE_DIR,
    etichetta: "File temporanei",
    conseguenza: "Si rigenerano da soli. Cancellarli è sempre sicuro.",
    dettaglia: false,
  },
  {
    categoria: "log",
    percorso: LOGS_DIR,
    etichetta: "Log",
    conseguenza: "Servono solo a capire perché qualcosa non è partito.",
    dettaglia: false,
  },
];

export function elencoSpazio(): VoceSpazio[] {
  const voci: VoceSpazio[] = [];

  for (const radice of RADICI) {
    if (!existsSync(radice.percorso)) continue;

    if (!radice.dettaglia) {
      const bytes = peso(radice.percorso);
      if (bytes === 0) continue;
      voci.push({
        id: radice.categoria,
        categoria: radice.categoria,
        etichetta: radice.etichetta,
        bytes,
        conseguenza: radice.conseguenza,
        // L'ambiente non si cancella dal pannello: senza, cinque app su sette
        // smettono di funzionare, ed e' un'operazione da "reset", non da pulizia.
        cancellabile: radice.categoria !== "ambiente",
      });
      continue;
    }

    for (const voce of readdirSync(radice.percorso, { withFileTypes: true })) {
      if (!voce.isDirectory()) continue;
      const percorso = join(radice.percorso, voce.name);
      const bytes = peso(percorso);
      if (bytes === 0) continue;
      voci.push({
        id: `${radice.categoria}/${voce.name}`,
        categoria: radice.categoria,
        etichetta: voce.name,
        bytes,
        conseguenza: radice.conseguenza,
        cancellabile: true,
      });
    }
  }

  return voci.sort((a, b) => b.bytes - a.bytes);
}

/** Spazio libero sul disco dove vive la suite. */
export function spazioLibero(): number {
  try {
    const s = statfsSync(DATA_ROOT);
    return Number(s.bavail) * Number(s.bsize);
  } catch {
    return 0;
  }
}

/**
 * Percorso reale di una voce, verificato.
 *
 * Restituisce null se cadrebbe fuori da %LOCALAPPDATA%\DaProdSuite: l'id arriva
 * dal renderer, e nessun valore inventato deve poter far cancellare altrove.
 */
function percorsoDi(id: string): string | null {
  const [categoria, ...resto] = id.split("/");
  const radice = RADICI.find((r) => r.categoria === categoria);
  if (!radice) return null;

  const percorso = resolve(resto.length > 0 ? join(radice.percorso, ...resto) : radice.percorso);
  const dentro = relative(resolve(DATA_ROOT), percorso);
  if (dentro.startsWith("..") || resolve(percorso) === resolve(DATA_ROOT)) return null;

  return existsSync(percorso) ? percorso : null;
}

/** Cancella una voce. Ritorna i byte liberati. */
export function elimina(id: string): number {
  const percorso = percorsoDi(id);
  if (!percorso) throw new Error(`"${id}" non è una voce cancellabile.`);

  const radice = RADICI.find((r) => r.categoria === id.split("/")[0]);
  if (radice?.categoria === "ambiente") {
    throw new Error("L'ambiente Python si rimuove dal reset, non da qui.");
  }

  const liberati = peso(percorso);
  rmSync(percorso, { recursive: true, force: true });
  return liberati;
}

export type CosaResettare = "impostazioni" | "modelli" | "tutto";

/**
 * Riporta la suite indietro.
 *
 * `impostazioni` e' innocuo: riparti dai valori predefiniti tenendo modelli e
 * risultati. `modelli` libera i GB. `tutto` lascia in piedi **solo i risultati**:
 * quelli sono tuoi e non li cancella nessun reset.
 */
export function reset(cosa: CosaResettare): number {
  const daTogliere: string[] = [];

  if (cosa === "impostazioni" || cosa === "tutto") {
    daTogliere.push(join(DATA_ROOT, "state"), join(DATA_ROOT, "settings.json"));
  }
  if (cosa === "modelli" || cosa === "tutto") {
    daTogliere.push(MODELS_DIR);
  }
  if (cosa === "tutto") {
    daTogliere.push(RUNTIME_DIR, ENGINES_DIR, CACHE_DIR, LOGS_DIR, join(DATA_ROOT, "tools"));
  }

  let liberati = 0;
  for (const percorso of daTogliere) {
    if (!existsSync(percorso)) continue;
    liberati += peso(percorso);
    rmSync(percorso, { recursive: true, force: true });
  }
  return liberati;
}
