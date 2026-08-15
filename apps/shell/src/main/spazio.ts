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
import { APPS, APP_LIST, type AppId, type CategoriaSpazio, type SpazioApp, type StatoSpazio, type VoceSpazio } from "@daprod/ipc";
import { percorsoModello } from "./models";
import { CACHE_DIR, DATA_ROOT, ENGINES_DIR, LOGS_DIR, MODELS_DIR, OUTPUT_DIR, RUNTIME_DIR } from "./paths";

/** Somma ricorsiva. Ritorna 0 se il percorso non c'è: non è un errore. */
export function peso(percorso: string): number {
  if (!existsSync(percorso)) return 0;

  // Vale anche per un singolo file: i modelli di Musica e Foto sono file, non
  // cartelle, e senza questo risultavano di peso zero cioe' non installati.
  try {
    const stat = statSync(percorso);
    if (stat.isFile()) return stat.size;
  } catch {
    return 0;
  }

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

/** Sotto questa soglia un modello non merita una riga a sé: sarebbe rumore. */
const SOGLIA_GRANDI = 1024 ** 3;

/**
 * Lo stato, calcolato una volta e tenuto in cache.
 *
 * Contare 34 GB significa attraversare decine di migliaia di file: farlo a ogni
 * apertura del pannello bloccherebbe la finestra per secondi. Si ricalcola solo
 * dopo che qualcosa è cambiato.
 */
let cache: StatoSpazio | null = null;

export function invalidaSpazio(): void {
  cache = null;
}

export function statoSpazio(): StatoSpazio {
  if (cache) return cache;

  /* Le schede. È così che si ragiona: una scheda è un'esperienza, con i suoi
     modelli. Non interessa sapere che esiste una cartella "text_encoders". */
  const usiPerModello = new Map<string, AppId[]>();
  for (const app of APP_LIST) {
    for (const modello of [...app.models, ...(app.extraModels ?? [])]) {
      usiPerModello.set(modello, [...(usiPerModello.get(modello) ?? []), app.id]);
    }
  }

  const perApp: SpazioApp[] = [];
  for (const app of APP_LIST) {
    let bytes = 0;
    let condivisi = 0;

    // Piu' modelli possono puntare alla stessa cartella: SoulX Lite e Pro stanno
    // nello stesso repo. Senza deduplicare, IoDigitale risultava il doppio.
    const visti = new Set<string>();

    for (const modello of [...app.models, ...(app.extraModels ?? [])]) {
      const percorso = percorsoModello(modello);
      if (!percorso || visti.has(percorso)) continue;
      visti.add(percorso);
      const peso_ = peso(percorso);
      if (peso_ === 0) continue;
      bytes += peso_;
      // Un modello che serve anche a un'altra scheda installata non si porta via
      // disinstallando questa: va detto prima, non dopo.
      if ((usiPerModello.get(modello) ?? []).length > 1) condivisi += peso_;
    }

    perApp.push({
      id: app.id,
      nome: app.name,
      accent: app.accent,
      bytes,
      condivisi,
      installata: bytes > 0,
    });
  }
  perApp.sort((a, b) => b.bytes - a.bytes);

  /* I modelli grossi, per chi vuole guardare più a fondo. */
  const grandi: VoceSpazio[] = [];
  if (existsSync(MODELS_DIR)) {
    for (const voce of readdirSync(MODELS_DIR, { withFileTypes: true })) {
      const percorso = join(MODELS_DIR, voce.name);
      const bytes = voce.isDirectory() ? peso(percorso) : statSync(percorso).size;
      if (bytes < SOGLIA_GRANDI) continue;
      grandi.push({
        id: `modelli/${voce.name}`,
        categoria: "modelli",
        etichetta: voce.name,
        bytes,
        conseguenza: "Va riscaricato prima di usare le schede che lo richiedono.",
        cancellabile: true,
      });
    }
  }
  grandi.sort((a, b) => b.bytes - a.bytes);

  /* Il resto, come totali. */
  const sistema: VoceSpazio[] = [];
  for (const radice of RADICI) {
    if (radice.categoria === "modelli") continue;
    const bytes = peso(radice.percorso);
    if (bytes === 0) continue;
    sistema.push({
      id: radice.categoria,
      categoria: radice.categoria,
      etichetta: radice.etichetta,
      bytes,
      conseguenza: radice.conseguenza,
      cancellabile: radice.categoria !== "ambiente" && radice.categoria !== "risultati",
    });
  }

  cache = {
    app: perApp,
    grandi,
    sistema,
    occupato: peso(DATA_ROOT),
    libero: spazioLibero(),
  };
  return cache;
}

/**
 * Toglie una scheda: cancella i suoi modelli, tranne quelli che servono anche a
 * un'altra scheda ancora installata.
 */
export function disinstallaApp(id: AppId): number {
  const app = APPS[id];
  const altre = APP_LIST.filter((a) => a.id !== id);

  let liberati = 0;
  for (const modello of [...app.models, ...(app.extraModels ?? [])]) {
    const serveAdAltri = altre.some(
      (a) =>
        [...a.models, ...(a.extraModels ?? [])].includes(modello) &&
        [...a.models, ...(a.extraModels ?? [])].some((m) => {
          const p = percorsoModello(m);
          return p !== null && existsSync(p);
        }),
    );
    if (serveAdAltri) continue;

    const percorso = percorsoModello(modello);
    if (!percorso || !existsSync(percorso)) continue;
    liberati += peso(percorso);
    rmSync(percorso, { recursive: true, force: true });
  }

  invalidaSpazio();
  return liberati;
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
  invalidaSpazio();
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

  invalidaSpazio();
  let liberati = 0;
  for (const percorso of daTogliere) {
    if (!existsSync(percorso)) continue;
    liberati += peso(percorso);
    rmSync(percorso, { recursive: true, force: true });
  }
  return liberati;
}
