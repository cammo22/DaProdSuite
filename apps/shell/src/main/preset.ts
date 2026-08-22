/**
 * I modi di generare messi da parte: i preset della suite.
 *
 * **Perché stanno sul computer e non nella pagina.** Chiesto il 22 agosto 2026
 * insieme ai modelli: «l'app android deve poter scegliere i vari modelli della
 * suite con anche la possibilità dei preset». Gli stili salvati esistevano già
 * — DaProdMusica ne ha una casella da sempre — ma vivevano in `localStorage`,
 * cioè dentro il browser della finestra che li aveva salvati. Sul telefono non
 * c'erano, e non potevano esserci: `localStorage` di una pagina è roba di quel
 * telefono, non della suite.
 *
 * Qui invece è un file solo, accanto a `settings.json`, e lo leggono la console,
 * il telefono e le schede. Vale la regola di sempre: quello che la suite sa
 * fare vale per tutte le schede, non per una.
 *
 * Niente database e nessuna cerimonia: sono poche decine di righe di testo, e
 * il file si scrive intero ogni volta che cambia qualcosa.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import type { Preset } from "@daprod/gateway";
import { DATA_ROOT } from "./paths";

/** Dove stanno, accanto alle altre cose che la suite si ricorda. */
const FILE = join(DATA_ROOT, "preset.json");

/**
 * Quanti se ne tengono in tutto.
 *
 * Un tetto e non una pulizia automatica: un preset è una cosa che una persona
 * ha deciso di salvare, e cancellarlo da soli sarebbe buttare via il suo
 * lavoro. Duecento sono più di quanti se ne scrivano a mano in un anno, e
 * bastano a non far crescere il file all'infinito se qualcosa va storto.
 */
const QUANTI_AL_MASSIMO = 200;

interface DatiPreset {
  versione: 1;
  preset: Preset[];
}

let dati: DatiPreset | null = null;

function carica(): DatiPreset {
  if (dati) return dati;
  try {
    const letto = JSON.parse(readFileSync(FILE, "utf8")) as Partial<DatiPreset>;
    dati = { versione: 1, preset: Array.isArray(letto.preset) ? letto.preset : [] };
  } catch {
    // Non c'è ancora, o è illeggibile: si riparte da vuoto invece di rompersi.
    dati = { versione: 1, preset: [] };
  }
  return dati;
}

/** Scrive in modo atomico: il file non resta mai a metà. */
function salvaSuDisco(): void {
  if (!dati) return;
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    const temporaneo = `${FILE}.tmp`;
    writeFileSync(temporaneo, `${JSON.stringify(dati, null, 1)}\n`, "utf8");
    if (existsSync(FILE)) renameSync(temporaneo, FILE);
    else renameSync(temporaneo, FILE);
  } catch {
    // Quello in memoria continua a valere per questa sessione.
  }
}

/** I preset di una scheda, dal più recente. Senza `app`, tutti. */
export function elencoPreset(app?: string): Preset[] {
  return carica()
    .preset.filter((p) => !app || p.app === app)
    .sort((a, b) => b.quando - a.quando);
}

/**
 * Salva un modo di generare.
 *
 * Salvarne uno con un nome che c'è già lo **sostituisce**, invece di
 * aggiungerne un secondo identico: chi risalva è quasi sempre uno che sta
 * correggendo quello di prima, e ritrovarsi due «cinematografico» in menu è il
 * modo più facile di scegliere quello sbagliato.
 */
export function salvaPreset(preset: Omit<Preset, "id" | "quando">): Preset {
  const stato = carica();
  const nuovo: Preset = {
    ...preset,
    id: `p_${randomBytes(6).toString("hex")}`,
    quando: Date.now(),
  };
  const uguale = stato.preset.findIndex(
    (p) => p.app === nuovo.app && p.nome.toLowerCase() === nuovo.nome.toLowerCase(),
  );
  if (uguale >= 0) stato.preset.splice(uguale, 1);
  stato.preset.push(nuovo);
  if (stato.preset.length > QUANTI_AL_MASSIMO) {
    stato.preset = stato.preset.sort((a, b) => b.quando - a.quando).slice(0, QUANTI_AL_MASSIMO);
  }
  salvaSuDisco();
  return nuovo;
}

/**
 * Toglie un preset.
 *
 * Solo chi l'ha salvato, e quelli senza padrone — che sono quelli che c'erano
 * già — li può togliere chiunque: sono di tutti.
 */
export function eliminaPreset(id: string, chi: string): boolean {
  const stato = carica();
  const trovato = stato.preset.find((p) => p.id === id);
  if (!trovato) return false;
  if (trovato.chi && trovato.chi !== chi) return false;
  stato.preset = stato.preset.filter((p) => p.id !== id);
  salvaSuDisco();
  return true;
}
