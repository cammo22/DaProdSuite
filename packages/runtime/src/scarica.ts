/**
 * Scaricamento di un file grosso: ripreso da dove si era fermato, e su più
 * connessioni insieme.
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
 *
 * ---
 *
 * **A pezzi, dal 20 agosto 2026.** Fino a ieri si scaricava con una connessione
 * sola, e il text encoder di DaProdMusica — 5,9 GB — ci metteva così tanto che la
 * prima idea per rimediare è stata cambiare modello. Il modello non c'entrava: il
 * collo di bottiglia è che una connessione singola verso HuggingFace resta molto
 * sotto quello che la linea di casa saprebbe reggere, e a fare la differenza non
 * è il peso del file ma quante connessioni apri insieme. È la stessa cosa che fa
 * `hf_transfer`, ed è la ragione per cui esiste.
 *
 * Come sta in piedi la ripresa adesso che i pezzi arrivano fuori ordine: accanto
 * al `.parte` c'è un `.parte.json` che dice **quanto** di ogni pezzo è arrivato.
 * Senza quel file il `.parte` è per forza pieno dall'inizio alla fine (l'ha
 * scritto una connessione sola, in ordine), e si riprende come si è sempre fatto
 * — così un'installazione lasciata a metà dalla versione di ieri riparte da dove
 * era, invece di ributtare via quello che aveva già preso.
 *
 * **La dimensione del `.parte` non dice più se è finito.** Scrivendo a salti, il
 * file arriva alla misura definitiva quando *comincia* l'ultimo pezzo, non quando
 * finisce l'ultimo byte: chi vuole sapere se manca qualcosa guarda il
 * `.parte.json`, che è l'unico che lo sa.
 */

import { createWriteStream } from "node:fs";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
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

/**
 * Quante connessioni insieme sullo stesso file.
 *
 * Quattro e non sedici: oltre un certo numero non si guadagna più niente — la
 * linea è quella — e ci si fa rallentare da HuggingFace, che le connessioni per
 * client le conta. Quattro è anche quello che usa di suo `snapshot_download` per
 * i repo, quindi la suite si comporta allo stesso modo che scarichi un file
 * singolo o una cartella intera.
 */
const CONNESSIONI = 4;

/**
 * Quanto è grande un pezzo.
 *
 * Non è "quanto si rifà se cade la rete": un pezzo interrotto riparte dal suo
 * ultimo byte scritto, non da capo. È solo il taglio con cui il lavoro viene
 * diviso fra le connessioni. Più piccoli vorrebbe dire più richieste per niente,
 * più grandi vorrebbe dire tre connessioni ferme ad aspettare la quarta.
 */
const PEZZO_BYTE = 64 * 1024 * 1024;

/**
 * Sotto questa taglia si scarica con una connessione sola.
 *
 * Su un VAE da 200 MB il giro in più — la richiesta di prova, il file di stato,
 * quattro connessioni da aprire — costa più di quello che fa risparmiare.
 */
const SOGLIA_PEZZI = 128 * 1024 * 1024;

/** Ogni quanto scrivere sul disco a che punto sono i pezzi. */
const INTERVALLO_STATO_MS = 2000;

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
      await rm(fileStato(parziale), { force: true });
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
      const ripresa = await quantoCene(parziale, options.bytes);
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

/**
 * Un tentativo: a pezzi se il file è grosso e il server sa darli, con una
 * connessione sola in tutti gli altri casi.
 */
async function unTentativo(
  parziale: string,
  opzioni: ScaricaFileOptions,
  onAvanzamento?: (a: AvanzamentoFile) => void,
): Promise<void> {
  const { bytes, onLine } = opzioni;

  const stato = await leggiStato(parziale, bytes);

  // Già finito: capita fra due tentativi, o riaprendo l'installazione un attimo
  // dopo che l'ultimo pezzo era arrivato.
  if (stato && somma(stato) === bytes) return;
  if (!stato && (await dimensione(parziale)) === bytes) return;

  if (bytes >= SOGLIA_PEZZI && (await sannoDareIPezzi(opzioni))) {
    return aPezzi(parziale, opzioni, stato, onAvanzamento);
  }

  // Ripiego su una connessione sola. Se però il `.parte` era stato scritto a
  // pezzi ha dei buchi dentro, e scrivergli in coda darebbe un file che sembra
  // giusto e non lo è: in quel caso si ributta e si riparte.
  if (stato) {
    onLine?.("Il server non dà più i pezzi separati: riparto con una connessione sola.");
    await rm(parziale, { force: true });
    await rm(fileStato(parziale), { force: true });
  }
  return unFlusso(parziale, opzioni, onAvanzamento);
}

/* ---------------------------------------------------------------- a pezzi -- */

/**
 * Chiede un byte solo per vedere se il server risponde `206`.
 *
 * Costa una richiesta e toglie ogni dubbio: dietro un URL di HuggingFace c'è un
 * redirect verso una CDN, e non è detto che chi risponde davvero sappia fare le
 * stesse cose. Un `200` qui vuol dire "ti mando tutto il file comunque", cioè
 * quattro connessioni che scaricano quattro volte la stessa roba.
 */
async function sannoDareIPezzi({ url, segnale }: ScaricaFileOptions): Promise<boolean> {
  try {
    const risposta = await fetch(url, {
      headers: { "user-agent": "DaProdSuite", range: "bytes=0-0" },
      signal: segnale,
      redirect: "follow",
    });
    // Il corpo va consumato, o la connessione resta appesa.
    await risposta.arrayBuffer().catch(() => undefined);
    return risposta.status === 206;
  } catch (errore) {
    if (segnale?.aborted) throw new ScaricamentoAnnullato();
    throw errore;
  }
}

async function aPezzi(
  parziale: string,
  { url, bytes, segnale, onLine }: ScaricaFileOptions,
  statoIniziale: number[] | null,
  onAvanzamento?: (a: AvanzamentoFile) => void,
): Promise<void> {
  const quanti = Math.ceil(bytes / PEZZO_BYTE);
  const stato = statoIniziale ?? (await statoDaFileContiguo(parziale, bytes, quanti));

  let fatti = somma(stato);
  if (fatti > 0) onLine?.(`Riprendo da ${(fatti / 1024 ** 2).toFixed(0)} MB.`);
  onLine?.(`Scarico su ${CONNESSIONI} connessioni insieme.`);

  // Il file deve esistere prima di poterci scrivere dentro a salti.
  await (await open(parziale, "a")).close();
  const file: FileHandle = await open(parziale, "r+");

  // Una caduta su una connessione ferma anche le altre: continuare a scaricare
  // pezzi quando il tentativo è già perso è banda buttata.
  const fermaTutto = new AbortController();
  const annullaFuori = () => fermaTutto.abort();
  segnale?.addEventListener("abort", annullaFuori, { once: true });

  const racconta = setInterval(
    () => onAvanzamento?.({ fatti, totale: bytes }),
    INTERVALLO_AVANZAMENTO_MS,
  );
  const salva = setInterval(() => void scriviStato(parziale, bytes, stato), INTERVALLO_STATO_MS);

  let prossimo = 0;

  const unPezzo = async (indice: number): Promise<void> => {
    const inizio = indice * PEZZO_BYTE;
    const fine = Math.min(inizio + PEZZO_BYTE, bytes) - 1;
    const lungo = fine - inizio + 1;
    let arrivato = stato[indice] ?? 0;
    if (arrivato >= lungo) return;

    const risposta = await fetch(url, {
      headers: { "user-agent": "DaProdSuite", range: `bytes=${inizio + arrivato}-${fine}` },
      signal: fermaTutto.signal,
      redirect: "follow",
    });

    if (risposta.status !== 206) throw new Error(`HTTP ${risposta.status} ${risposta.statusText}`);
    if (!risposta.body) throw new Error("risposta senza contenuto");

    const flusso = Readable.fromWeb(
      risposta.body as Parameters<typeof Readable.fromWeb>[0],
    ) as AsyncIterable<Buffer>;

    for await (const dati of flusso) {
      // Un server che manda più di quello che gli è stato chiesto scriverebbe
      // sopra il pezzo dopo: si taglia a quello che ci sta.
      const resta = lungo - arrivato;
      const pezzo = dati.length > resta ? dati.subarray(0, resta) : dati;
      if (!pezzo.length) break;

      await file.write(pezzo, 0, pezzo.length, inizio + arrivato);
      arrivato += pezzo.length;
      stato[indice] = arrivato;
      fatti += pezzo.length;
    }

    if (arrivato !== lungo) {
      throw new Error(`il pezzo ${indice + 1} di ${quanti} si è interrotto a metà`);
    }
  };

  const operaio = async (): Promise<void> => {
    for (;;) {
      if (fermaTutto.signal.aborted) throw new ScaricamentoAnnullato();
      const indice = prossimo++;
      if (indice >= quanti) return;
      await unPezzo(indice);
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(CONNESSIONI, quanti) }, operaio));
  } catch (errore) {
    // Le altre connessioni si fermano qui, non alla fine del pezzo che stanno
    // scaricando.
    fermaTutto.abort();
    throw segnale?.aborted ? new ScaricamentoAnnullato() : errore;
  } finally {
    clearInterval(racconta);
    clearInterval(salva);
    segnale?.removeEventListener("abort", annullaFuori);
    await file.close();
    // Quello che è arrivato si scrive **sempre**, anche uscendo per un errore: è
    // tutto quello che serve al tentativo dopo per non ricominciare da capo.
    await scriviStato(parziale, bytes, stato);
  }

  onAvanzamento?.({ fatti, totale: bytes });

  const finale = await dimensione(parziale);
  if (fatti !== bytes || finale !== bytes) {
    throw new Error(`scaricati ${fatti} byte invece di ${bytes}`);
  }
}

/* -------------------------------------------------------- una connessione -- */

async function unFlusso(
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

/* -------------------------------------------------------- lo stato a pezzi -- */

const fileStato = (parziale: string) => `${parziale}.json`;

const somma = (pezzi: number[]) => pezzi.reduce((a, b) => a + b, 0);

/**
 * A che punto erano i pezzi, se qualcuno l'ha scritto.
 *
 * Torna `null` quando quel file non c'è o non parla di questo scaricamento: il
 * `.parte`, allora, o non esiste o è pieno dall'inizio senza buchi.
 */
async function leggiStato(parziale: string, bytes: number): Promise<number[] | null> {
  try {
    const dati = JSON.parse(await readFile(fileStato(parziale), "utf8")) as {
      bytes?: number;
      pezzi?: number[];
    };
    if (dati?.bytes !== bytes || !Array.isArray(dati.pezzi)) return null;
    if (dati.pezzi.length !== Math.ceil(bytes / PEZZO_BYTE)) return null;
    if (dati.pezzi.some((n) => typeof n !== "number" || n < 0)) return null;
    return dati.pezzi;
  } catch {
    return null;
  }
}

async function scriviStato(parziale: string, bytes: number, pezzi: number[]): Promise<void> {
  try {
    await writeFile(fileStato(parziale), JSON.stringify({ bytes, pezzi }), "utf8");
  } catch {
    // Non riuscire a scriverlo non è una ragione per fermare uno scaricamento da
    // 6 GB: al massimo il tentativo dopo riparte da più indietro.
  }
}

/**
 * I pezzi di un `.parte` scritto da una connessione sola.
 *
 * È il caso di chi aveva lasciato a metà un'installazione con la versione di
 * prima: quel file è pieno dal primo byte fino alla sua misura, quindi i pezzi si
 * ricavano dividendolo, e non si riscarica niente di quello che c'è già.
 */
async function statoDaFileContiguo(
  parziale: string,
  bytes: number,
  quanti: number,
): Promise<number[]> {
  const pezzi = new Array<number>(quanti).fill(0);
  let gia = await dimensione(parziale);
  if (gia > bytes) gia = 0;

  for (let i = 0; i < quanti && gia > 0; i++) {
    const lungo = Math.min((i + 1) * PEZZO_BYTE, bytes) - i * PEZZO_BYTE;
    const suo = Math.min(gia, lungo);
    pezzi[i] = suo;
    gia -= suo;
  }
  return pezzi;
}

/**
 * Quanto di un file è già arrivato da un tentativo interrotto.
 *
 * Lo chiede lo shell per dire «riprendo da 3,2 GB» prima ancora di aprire una
 * connessione. Da fuori guardare quanto pesa il `.parte` non basta più: scritto
 * a pezzi, quel file è grande quanto il totale molto prima di essere completo.
 */
export function giaScaricato(destinazione: string, bytes: number): Promise<number> {
  return quantoCene(`${destinazione}.parte`, bytes);
}

/** Quanto di questo file è già sul disco davvero, comunque sia stato scritto. */
async function quantoCene(parziale: string, bytes: number): Promise<number> {
  const stato = await leggiStato(parziale, bytes);
  return stato ? somma(stato) : dimensione(parziale);
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
