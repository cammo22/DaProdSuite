/**
 * "Installa" premuto su una scheda: da qui in poi non deve servire altro.
 *
 * Fino a ieri la suite dava per scontato che ComfyUI e trenta GB di pesi fossero
 * già sul disco — cioè funzionava su un computer solo, questo. Questo modulo è
 * il pezzo che mancava a "`git clone` deve bastare": mette in fila le cose che
 * servono a un'app per esistere e le fa una dopo l'altra.
 *
 * 1. **L'ambiente Python** condiviso, se non c'è (lo fa [runtime.ts](runtime.ts)).
 * 2. **Il motore**, se l'app ne guida uno di terzi che non è nel repo.
 * 3. **I nodi custom** che i modelli pretendono dal motore.
 * 4. **I modelli** che le mancano, saltando quelli che un'altra app ha già
 *    portato: nel catalogo un peso condiviso ha lo stesso id in tutte e due, ed
 *    è tutto quello che serve perché si scarichi una volta sola.
 *
 * Una alla volta, non in parallelo. Su una linea di casa quattro scaricamenti
 * insieme non vanno più veloci di uno, e a interruzione di rete lasciano quattro
 * file a metà invece di uno.
 *
 * **L'avanzamento si conta in byte, non in file.** Un'app con un modello da 5,9
 * GB e due da 200 MB, contata in file, resterebbe ferma a "1 di 3" per venti
 * minuti e poi finirebbe in trenta secondi.
 *
 * Le stesse quattro cose servono anche **a app aperta**, quando dalla sua
 * finestra si sceglie un modello che non si ha ancora (FLUX.2 Klein in
 * DaProdFoto): è `installaModelli`, che non passa per la scheda dell'hub ma
 * racconta l'avanzamento alla finestra che l'ha chiesto.
 */

import { APPS, modelliRichiesti, type AppId, type AvanzamentoModelli } from "@daprod/ipc";
import {
  ScaricamentoAnnullato,
  installaMotore,
  installaNodo,
  motoreAggiornato,
  motorePresente,
  nodiMancanti,
  pesoCartella,
  scaricaFile,
  scaricaRepo,
} from "@daprod/runtime";
import { EventEmitter } from "node:events";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { appManager } from "./app-manager";
import { createLogger } from "./logging";
import { modelliMancanti, nodiRichiesti, type ModelEntry } from "./models";
import { ENGINES_DIR, MODELS_DIR, PYTHON_EXE, RUNTIME_DIR, TOOLS_DIR } from "./paths";
import { runtime } from "./runtime";
import * as servizi from "./servizi";

/** Un'installazione per app, con il modo di fermarla. */
const inCorso = new Map<AppId, AbortController>();

/**
 * L'avanzamento degli scaricamenti chiesti da dentro un'app.
 *
 * Quelli chiesti dall'hub viaggiano già sullo stato della scheda; questi no,
 * perché la scheda dice "attiva" e deve continuare a dirlo: l'app è aperta e si
 * sta usando mentre il modello arriva.
 */
export const scaricamenti = new EventEmitter();

const dillo = (stato: AvanzamentoModelli) => scaricamenti.emit("avanzamento", stato);

export function installazioneInCorso(id: AppId): boolean {
  return inCorso.has(id);
}

/** Ferma l'installazione: quello che è già arrivato resta e riprende dopo. */
export function annulla(id: AppId): void {
  inCorso.get(id)?.abort();
}

export async function installaApp(id: AppId): Promise<void> {
  if (inCorso.has(id)) return;

  const controllo = new AbortController();
  inCorso.set(id, controllo);
  const segnale = controllo.signal;

  const logger = createLogger("scaricamenti");
  const scrivi = (riga: string) => logger.write(`[${id}] ${riga}\n`, false);

  /**
   * `totale` a zero vuol dire "non so quanto manca": l'hub disegna una barra
   * che scorre invece di una ferma allo 0%.
   */
  const avanzamento = (done: number, total: number, label: string) =>
    appManager.patch(id, { status: "in-preparazione", progress: { done, total, label } });

  try {
    appManager.patch(id, { status: "in-preparazione", error: undefined });

    /* 1 — ambiente Python -------------------------------------------------- */
    if (!runtime.getState().ready) {
      avanzamento(0, 0, "Preparo l'ambiente Python (circa 4 GB)");
      scrivi("Manca l'ambiente Python: lo installo prima del resto.");
      await runtime.install();
      if (!runtime.getState().ready) {
        throw new Error(
          runtime.getState().error ??
            "L'ambiente Python non si è installato: guarda il pannello dell'ambiente nell'hub.",
        );
      }
    }
    if (segnale.aborted) throw new ScaricamentoAnnullato();

    /* 2 — motore di terzi --------------------------------------------------- */
    // Non basta che ci sia: dev'essere la **versione** che abbiamo provato. È
    // così che una correzione del motore arriva a chi ce l'ha già installato —
    // e la prima volta che serve è adesso, per il difetto di ComfyUI che
    // ammazzava i brani a metà (vedi COMFY_VERSION).
    const motore = APPS[id].service?.engine;
    if (motore === "ComfyUI" && !motoreAggiornato(ENGINES_DIR)) {
      if (servizi.acceso(id)) {
        throw new Error(
          "Il motore sta girando: chiudi le app che lo usano (Musica, Foto) e riprova.",
        );
      }
      avanzamento(0, 0, motorePresente(ENGINES_DIR) ? "Aggiorno il motore" : "Installo il motore");
      await installaMotore({
        enginesDir: ENGINES_DIR,
        runtimeDir: RUNTIME_DIR,
        toolsDir: TOOLS_DIR,
        segnale,
        onLine: scrivi,
        onPasso: (etichetta) => avanzamento(0, 0, etichetta),
      });
    }

    /* 3 e 4 — nodi custom e modelli ----------------------------------------- */
    await portaDentro(modelliRichiesti(id), { segnale, scrivi, avanzamento });

    scrivi("Installazione completata.");
  } catch (err) {
    if (err instanceof ScaricamentoAnnullato) {
      scrivi("Annullato dall'utente. Quello che era già arrivato resta sul disco.");
    } else {
      const motivo = err instanceof Error ? err.message : String(err);
      scrivi(`ERRORE: ${motivo}`);
      appManager.patch(id, { status: "in-errore", progress: undefined, error: motivo });
      inCorso.delete(id);
      logger.close();
      return;
    }
  } finally {
    inCorso.delete(id);
  }

  logger.close();
  // Lo stato non lo decidiamo noi: si rilegge cosa c'è davvero sul disco. Se
  // manca ancora qualcosa la scheda torna "da installare" con i GB aggiornati,
  // ed è la risposta giusta sia dopo un annullamento sia dopo un successo.
  await appManager.refreshApp(id);
}

/**
 * Più schede, una dopo l'altra.
 *
 * La chiede la procedura guidata del primo avvio, dove si sceglie tutto insieme
 * e poi si va a fare altro. **In fila e non in parallelo**: si contenderebbero
 * la linea e l'ambiente Python, che la prima installa e le altre due
 * troverebbero a metà. Chi guarda l'hub vede le schede accendersi una per
 * volta, che è anche il modo in cui è più facile capire a che punto è.
 *
 * Se una fallisce si va avanti con le altre: una scheda in errore lo dice da
 * sé, e fermare tutto vorrebbe dire far ricominciare da capo anche il resto.
 */
export async function installaTutte(ids: AppId[]): Promise<void> {
  for (const id of ids) {
    if (!APPS[id]) continue;
    await installaApp(id);
  }
}

/**
 * Modelli chiesti da dentro un'app già aperta.
 *
 * Differenze da `installaApp`, tutte per la stessa ragione — qui l'app la stai
 * usando: la scheda dell'hub non cambia stato, l'avanzamento va alla finestra, e
 * alla fine il motore viene **riavviato** se è entrato un nodo custom, perché
 * ComfyUI i nodi li carica solo all'avvio e altrimenti il modello nuovo darebbe
 * "nodo sconosciuto" pur essendo tutto al suo posto.
 */
export async function installaModelli(id: AppId, ids: string[]): Promise<void> {
  if (inCorso.has(id)) return;

  const controllo = new AbortController();
  inCorso.set(id, controllo);
  const segnale = controllo.signal;

  const logger = createLogger("scaricamenti");
  const scrivi = (riga: string) => logger.write(`[${id}] ${riga}\n`, false);

  const avanzamento = (done: number, total: number, label: string) =>
    dillo({ attivo: true, done, total, label });

  try {
    if (!runtime.getState().ready) {
      throw new Error("Manca l'ambiente Python della suite: installalo dall'hub.");
    }
    if (APPS[id].service?.engine === "ComfyUI" && !motorePresente(ENGINES_DIR)) {
      throw new Error("Il motore non è installato: premi Installa sulla scheda nell'hub.");
    }

    avanzamento(0, 0, "Controllo cosa manca");
    const nodiEntrati = await portaDentro(ids, { segnale, scrivi, avanzamento });

    if (nodiEntrati && servizi.acceso(id)) {
      avanzamento(0, 0, "Riavvio il motore per caricare il nodo nuovo");
      scrivi("Riavvio il motore: un nodo custom nuovo si carica solo all'avvio.");
      await servizi.riavvia(id);
    }

    scrivi("Scaricamento completato.");
    dillo({ attivo: false, done: 0, total: 0, label: "", finito: true });
  } catch (err) {
    if (err instanceof ScaricamentoAnnullato) {
      scrivi("Annullato dall'utente. Quello che era già arrivato resta sul disco.");
      dillo({ attivo: false, done: 0, total: 0, label: "", annullato: true });
    } else {
      const motivo = err instanceof Error ? err.message : String(err);
      scrivi(`ERRORE: ${motivo}`);
      dillo({ attivo: false, done: 0, total: 0, label: "", errore: motivo });
    }
  } finally {
    inCorso.delete(id);
    logger.close();
  }
}

interface Corsa {
  segnale: AbortSignal;
  scrivi: (riga: string) => void;
  avanzamento: (done: number, total: number, label: string) => void;
}

/**
 * Nodi custom e pesi di questi modelli, quelli che mancano e nell'ordine giusto.
 *
 * I nodi prima: durano secondi, e se il motore non riesce ad averli è meglio
 * scoprirlo adesso che dopo venti minuti di scaricamento. Torna vero se ne è
 * entrato almeno uno, perché in quel caso il motore acceso va riavviato.
 */
async function portaDentro(ids: string[], corsa: Corsa): Promise<boolean> {
  const { segnale, scrivi, avanzamento } = corsa;

  /* nodi custom ------------------------------------------------------------ */
  const nodi = nodiMancanti(ENGINES_DIR, nodiRichiesti(ids));
  for (const nodo of nodi) {
    if (segnale.aborted) throw new ScaricamentoAnnullato();
    await installaNodo(nodo, {
      enginesDir: ENGINES_DIR,
      runtimeDir: RUNTIME_DIR,
      toolsDir: TOOLS_DIR,
      segnale,
      onLine: scrivi,
      onPasso: (etichetta) => avanzamento(0, 0, etichetta),
    });
  }

  /* pesi ------------------------------------------------------------------- */
  const mancanti = modelliMancanti(ids);
  const totale = mancanti.reduce((somma, m) => somma + m.entry.bytes, 0);
  let finiti = 0;

  if (mancanti.length > 0) {
    scrivi(`Da scaricare: ${mancanti.length} modelli, ${(totale / 1024 ** 3).toFixed(2)} GB.`);
  }

  for (const { entry } of mancanti) {
    if (segnale.aborted) throw new ScaricamentoAnnullato();

    const dice = (fatti: number) => avanzamento(finiti + fatti, totale, entry.label);
    // Si parte da quello che c'è già, non da zero: un modello ripreso a metà
    // deve mostrare la barra dov'era, altrimenti sembra che ricominci tutto.
    const gia = await giaSulDisco(entry);
    dice(gia);
    scrivi(gia > 0 ? `→ ${entry.label} (riprendo)` : `→ ${entry.label}`);

    if (entry.kind === "file") {
      await scaricaFile({
        url: entry.url,
        destinazione: join(MODELS_DIR, entry.dir, entry.file),
        bytes: entry.bytes,
        segnale,
        onAvanzamento: ({ fatti }) => dice(fatti),
        onLine: scrivi,
      });
    } else if (entry.kind === "hf-repo") {
      await scaricaRepo({
        pythonExe: PYTHON_EXE,
        repo: entry.repo,
        destinazione: join(MODELS_DIR, entry.dir),
        bytes: entry.bytes,
        include: entry.include,
        exclude: entry.exclude,
        segnale,
        onAvanzamento: ({ fatti }) => dice(fatti),
        onLine: scrivi,
      });
    }

    finiti += entry.bytes;
    avanzamento(finiti, totale, entry.label);
    scrivi(`✓ ${entry.label}`);
  }

  return nodi.length > 0;
}

/**
 * Quanto di questo modello è già sul disco da un tentativo interrotto.
 *
 * Per un file è il `.parte` che gli sta accanto; per un repo HuggingFace è
 * quanto pesa la sua cartella, perché lì i file finiti restano al loro posto e
 * al giro dopo si scaricano solo quelli che mancano.
 */
async function giaSulDisco(entry: ModelEntry): Promise<number> {
  if (entry.kind === "file") {
    try {
      return (await stat(join(MODELS_DIR, entry.dir, `${entry.file}.parte`))).size;
    } catch {
      return 0;
    }
  }
  if (entry.kind === "hf-repo") {
    return pesoCartella(join(MODELS_DIR, entry.dir, entry.verifica ?? ""));
  }
  return 0;
}
