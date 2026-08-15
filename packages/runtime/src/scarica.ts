/**
 * Scaricamento di un file grosso, ripreso da dove si era fermato.
 *
 * I modelli della suite vanno da 200 MB a 6 GB su una linea di casa: ricominciare
 * da capo dopo venti minuti perché è caduta la rete non è accettabile. Quindi si
 * scrive accanto al file definitivo un `.parte`, e al tentativo successivo si
 * chiede al server solo il pezzo che manca con un'intestazione `Range`.
 *
 * Il file prende il nome definitivo **solo** quando è intero e della dimensione
 * dichiarata nel catalogo. È la stessa regola che applica `isModelPresent` dalla
 * parte dello shell: finché c'è un `.parte`, per la suite quel modello non
 * esiste, e nessun motore proverà a caricarne metà.
 */

import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export interface AvanzamentoFile {
  /** Byte già sul disco, ripresa compresa. */
  fatti: number;
  /** Byte attesi in tutto. */
  totale: number;
}

export interface ScaricaFileOptions {
  url: string;
  /** Percorso finale. Il `.parte` gli sta accanto e sparisce alla fine. */
  destinazione: string;
  /** Dimensione attesa, dal catalogo. Serve a sapere quando è finito davvero. */
  bytes: number;
  /** Per annullare: interrompe la connessione e lascia il `.parte` sul disco. */
  segnale?: AbortSignal;
  onAvanzamento?: (avanzamento: AvanzamentoFile) => void;
  onLine?: (riga: string) => void;
  /** Quante volte riprovare dopo un errore di rete. */
  tentativi?: number;
}

/** Ogni quanto raccontare l'avanzamento: a ogni pezzo sarebbero 100.000 messaggi. */
const INTERVALLO_AVANZAMENTO_MS = 400;

const PAUSA_FRA_TENTATIVI_MS = 3000;

export class ScaricamentoAnnullato extends Error {
  constructor() {
    super("Scaricamento annullato.");
    this.name = "ScaricamentoAnnullato";
  }
}

export async function scaricaFile(options: ScaricaFileOptions): Promise<void> {
  const { url, destinazione, segnale, onAvanzamento, onLine } = options;
  const tentativi = options.tentativi ?? 4;
  const parziale = `${destinazione}.parte`;

  await mkdir(dirname(destinazione), { recursive: true });

  let ultimoErrore: unknown;

  for (let tentativo = 1; tentativo <= tentativi; tentativo++) {
    if (segnale?.aborted) throw new ScaricamentoAnnullato();

    try {
      await unTentativo(parziale, { ...options, tentativi }, onAvanzamento);
      await rename(parziale, destinazione);
      return;
    } catch (err) {
      // Annullare interrompe `fetch`, che lancia un AbortError come un errore di
      // rete qualsiasi: senza questo controllo la suite ci riproverebbe sopra.
      if (err instanceof ScaricamentoAnnullato || segnale?.aborted) {
        throw new ScaricamentoAnnullato();
      }
      ultimoErrore = err;

      const motivo = err instanceof Error ? err.message : String(err);
      if (tentativo === tentativi) break;

      // Il `.parte` resta dov'è: il tentativo dopo riparte da lì, non da zero.
      const ripresa = await dimensione(parziale);
      onLine?.(
        `Tentativo ${tentativo} di ${tentativi} fallito (${motivo}). ` +
          `Riprendo fra 3 secondi da ${(ripresa / 1024 ** 2).toFixed(0)} MB.`,
      );
      await pausa(PAUSA_FRA_TENTATIVI_MS, segnale);
    }
  }

  const motivo = ultimoErrore instanceof Error ? ultimoErrore.message : String(ultimoErrore);
  throw new Error(
    `Non sono riuscito a scaricare ${url} dopo ${tentativi} tentativi: ${motivo}. ` +
      `Quello che era già arrivato resta in ${parziale} e riprende alla prossima installazione.`,
  );
}

async function unTentativo(
  parziale: string,
  { url, bytes, segnale, onLine }: ScaricaFileOptions,
  onAvanzamento?: (a: AvanzamentoFile) => void,
): Promise<void> {
  let gia = await dimensione(parziale);

  // Un `.parte` più grande dell'atteso non è un download a metà: è un file
  // sbagliato, o il catalogo è cambiato. In entrambi i casi va rifatto.
  if (gia > bytes) {
    onLine?.("Il file parziale è più grande dell'atteso: lo ributto e riparto.");
    await rm(parziale, { force: true });
    gia = 0;
  }
  if (gia === bytes) return;

  const intestazioni: Record<string, string> = { "user-agent": "DaProdSuite" };
  if (gia > 0) intestazioni["range"] = `bytes=${gia}-`;

  const risposta = await fetch(url, { headers: intestazioni, signal: segnale, redirect: "follow" });

  if (!risposta.ok) {
    // 416 = "quel Range non esiste": il file sul server è cambiato di dimensione.
    if (risposta.status === 416) {
      await rm(parziale, { force: true });
      throw new Error("il file sul server è cambiato, riparto da zero");
    }
    throw new Error(`HTTP ${risposta.status} ${risposta.statusText}`);
  }
  if (!risposta.body) throw new Error("risposta senza contenuto");

  // Range chiesto ma server che risponde 200: ha ignorato la ripresa e sta
  // mandando tutto dall'inizio. Scrivere in coda produrrebbe un file doppio.
  const riprende = gia > 0 && risposta.status === 206;
  if (gia > 0 && !riprende) {
    onLine?.("Il server non sa riprendere: riparto dall'inizio.");
    gia = 0;
  }

  let fatti = gia;
  let ultimoAvviso = 0;
  const conta = new Transform({
    transform(pezzo: Buffer, _codifica, avanti) {
      fatti += pezzo.length;
      const adesso = Date.now();
      if (adesso - ultimoAvviso >= INTERVALLO_AVANZAMENTO_MS) {
        ultimoAvviso = adesso;
        onAvanzamento?.({ fatti, totale: bytes });
      }
      avanti(null, pezzo);
    },
  });

  await pipeline(
    Readable.fromWeb(risposta.body as Parameters<typeof Readable.fromWeb>[0]),
    conta,
    createWriteStream(parziale, { flags: riprende ? "a" : "w" }),
  );

  onAvanzamento?.({ fatti, totale: bytes });

  const finale = await dimensione(parziale);
  if (finale !== bytes) {
    throw new Error(`scaricati ${finale} byte invece di ${bytes}`);
  }
}

async function dimensione(percorso: string): Promise<number> {
  try {
    return (await stat(percorso)).size;
  } catch {
    return 0;
  }
}

function pausa(ms: number, segnale?: AbortSignal): Promise<void> {
  return new Promise((risolvi, rifiuta) => {
    if (segnale?.aborted) return rifiuta(new ScaricamentoAnnullato());
    const timer = setTimeout(() => {
      segnale?.removeEventListener("abort", interrotto);
      risolvi();
    }, ms);
    function interrotto() {
      clearTimeout(timer);
      rifiuta(new ScaricamentoAnnullato());
    }
    segnale?.addEventListener("abort", interrotto, { once: true });
  });
}
