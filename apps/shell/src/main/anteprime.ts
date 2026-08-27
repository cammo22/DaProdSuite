/**
 * Le anteprime: **un riquadro nero non è un'anteprima**.
 *
 * **Il difetto, detto da chi lo guardava:** «le musiche al momento non si vede
 * l'immagine» e «i video, la thumbnail — un frame si deve vedere, ora non lo
 * hanno, poi se lo fai partire esce, ma facciamo che ci sia a priori».
 *
 * Ed era vero, per due motivi diversi che sembravano uno solo:
 *
 * - **i video** non hanno un poster. Un tag `<video>` senza `poster` disegna un
 *   rettangolo nero finché non premi play e il primo fotogramma non è
 *   decodificato. Una galleria di dodici rettangoli neri non si guarda: si
 *   tocca a caso.
 * - **i brani** una copertina ce l'hanno — DaProdMusica la genera con Anima —
 *   ma vive **accanto** al file, in un `.cover.jpg`. Chi guarda la galleria dal
 *   telefono chiedeva il brano e riceveva un mp3 nudo: la copertina non gliela
 *   mandava nessuno, perché nessuno gliel'aveva chiesta.
 *
 * ## Come si risolvono, e perché in due modi diversi
 *
 * **Il fotogramma si estrae una volta e si tiene.** Costa un `ffmpeg`, ed è
 * mezzo secondo: farlo a ogni scorrimento della galleria vorrebbe dire venti
 * processi per una schermata. Sta in cache, con una chiave che tiene conto
 * della dimensione e della data — se il file cambia, l'anteprima si rifà.
 *
 * **La copertina si cuce dentro il brano.** Chiesto così: «facciamo in modo che
 * nella suite quando una canzone è completa viene unita l'immagine al file». Ed
 * è la cosa giusta: un `.cover.jpg` accanto al file è una convenzione della
 * suite, e quando il brano finisce nel telefono di qualcuno quella convenzione
 * non lo segue. Un mp3 con la copertina **dentro** la mostra ovunque —
 * nell'app, in galleria, nel lettore del telefono, in macchina.
 *
 * ## Senza FFmpeg
 *
 * Non si fallisce: si fa a meno. Le immagini fanno da anteprima a sé stesse (e
 * non ne hanno bisogno), i brani mostrano il loro `.cover.jpg` di fianco come
 * hanno sempre fatto, e i video restano senza fotogramma con la stessa faccia
 * di prima. FFmpeg non è imbarcato — è GPL, la suite è MIT — e una funzione che
 * pretende un programma che l'utente non ha non è una funzione.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import type { ElementoLibreria } from "@daprod/ipc";
import { CACHE_DIR } from "./paths";
import { findFfmpeg } from "./ffmpeg";
import { createLogger } from "./logging";
import { registra } from "./processi";

const log = createLogger("anteprime");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

const SUFFISSO_COPERTINA = ".cover.jpg";

/**
 * Chi avvisare quando nasce una copertina.
 *
 * **Un gancio e non un `import`**, perché `libreria.ts` importa già questo file
 * (per `cuciLaCopertina`): chiamarla da qui sarebbe un cerchio, e i cerchi in
 * questo progetto hanno già ammazzato l'avvio una volta — vedi
 * `prova-cicli.mjs`. Chi accende la suite li mette in comunicazione.
 */
let avvisaChiGuarda: () => void = () => {};

export function quandoCompareUnaCopertina(fn: () => void): void {
  avvisaChiGuarda = fn;
}

/**
 * A che secondo si prende il fotogramma.
 *
 * Non al secondo zero: quasi tutte le clip cominciano da un nero o da una
 * dissolvenza, e il fotogramma zero di un video generato è, molto spesso,
 * esattamente il rettangolo nero che stiamo cercando di togliere. Un secondo
 * dentro c'è già qualcosa da vedere.
 */
const SECONDO_BUONO = 1;

/** Quanto si aspetta FFmpeg prima di dire che quell'anteprima non si fa. */
const ATTESA_FFMPEG_MS = 30_000;

function cartellaAnteprime(): string {
  const dir = join(CACHE_DIR, "anteprime");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Il percorso di un'immagine che rappresenti questo elemento. Null se non c'è.
 *
 * L'ordine è quello di quanto costa: un'immagine è già la sua anteprima, un
 * brano ha la sua copertina lì accanto, e solo un video richiede di accendere
 * un processo.
 */
export async function anteprimaDi(elemento: ElementoLibreria): Promise<string | null> {
  if (elemento.tipo === "immagine") return elemento.percorso;

  const accanto = senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA;
  if (existsSync(accanto)) return accanto;

  if (elemento.tipo === "video") return fotogrammaDi(elemento);
  return null;
}

/** Vero se per questo elemento un'anteprima c'è, o si può fare. */
export function puoAvereAnteprima(elemento: ElementoLibreria): boolean {
  if (elemento.tipo === "immagine") return true;
  if (existsSync(senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA)) return true;
  return elemento.tipo === "video" && findFfmpeg() !== null;
}

/* ------------------------------------------------------- il fotogramma */

/** Chi sta già estraendo cosa: due richieste sullo stesso video sono una. */
const inCorso = new Map<string, Promise<string | null>>();

/**
 * Un fotogramma del video, tenuto in cache.
 *
 * La chiave tiene dentro dimensione e data di modifica: un video rigenerato con
 * lo stesso nome non si porta dietro l'anteprima di quello di prima.
 *
 * Due richieste sullo stesso video, mentre la prima sta ancora lavorando,
 * aspettano la stessa: una galleria che si apre chiede dodici anteprime in
 * mezzo secondo, e senza questo sarebbero dodici `ffmpeg` per dodici file più
 * un secondo giro per gli stessi dodici.
 */
async function fotogrammaDi(elemento: ElementoLibreria): Promise<string | null> {
  const binario = findFfmpeg();
  if (!binario) return null;

  let stat;
  try {
    stat = statSync(elemento.percorso);
  } catch {
    return null;
  }

  /**
   * **Il fotogramma si scrive accanto al video, non in una cache.**
   *
   * Cambiato nella 0.8.1, e non è un dettaglio di implementazione: un
   * `.cover.jpg` accanto al file è la convenzione che **tutta** la suite già
   * legge — la galleria del computer la usa come poster senza chiedere niente
   * a nessuno, lo specchio del telefono se la porta dietro, e `rinomina` e
   * `elimina` la spostano e la cancellano insieme al video.
   *
   * In cache invece era una cosa che sapeva solo questo file, si rifaceva a
   * ogni cambio di data, e non serviva a nessun altro.
   *
   * Se scrivere lì non si può — cartella in sola lettura, file bloccato da
   * Windows — si ripiega sulla cache, che è meglio di niente.
   */
  const accanto = senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA;
  if (existsSync(accanto)) return accanto;

  const chiave = createHash("sha1")
    .update(`${elemento.percorso}|${stat.size}|${stat.mtimeMs}`)
    .digest("hex")
    .slice(0, 16);
  const diScorta = join(cartellaAnteprime(), `${chiave}.jpg`);
  if (existsSync(diScorta)) return diScorta;

  const gia = inCorso.get(accanto);
  if (gia) return gia;

  const lavoro = (async () => {
    const suoPosto = await estrai(binario, elemento.percorso, accanto);
    if (suoPosto) return suoPosto;
    return estrai(binario, elemento.percorso, diScorta);
  })().finally(() => {
    inCorso.delete(accanto);
  });
  inCorso.set(accanto, lavoro);
  return lavoro;
}

async function estrai(
  binario: string,
  sorgente: string,
  destinazione: string,
): Promise<string | null> {
  /**
   * Si scrive su un file di passaggio e si rinomina solo a fine riuscita:
   * un'anteprima troncata è peggio di nessuna anteprima, perché nessuno la rifà.
   *
   * ⚠ **E quel file finisce in `.jpg`, non in `.part`.** È la riga che ha
   * tenuto rotte le anteprime dei video per quattro versioni.
   *
   * Prima era `${destinazione}.part`, che sembra la cosa ovvia e non lo è:
   * **FFmpeg sceglie il formato dall'estensione del file che scrive**, e
   * `.part` non è un formato. Rispondeva
   *
   *     Unable to choose an output format for '…jpg.part';
   *     use a standard extension for the filename or specify the format manually
   *
   * cioè un errore chiarissimo — che però finiva su uno `stderr` che nessuno
   * leggeva. `gira()` guardava solo il codice di uscita, tornava `false`,
   * `estrai` riprovava con lo stesso nome e lo stesso esito, e tornava null.
   * Rettangolo nero, nessuna riga nel log, nessun modo di accorgersene.
   *
   * Quanto è durata, misurato sul PC di casa il 27 agosto 2026: **1269
   * esecuzioni di FFmpeg e zero file prodotti.** La cartella della cache era
   * vuota dal giorno in cui era stata creata.
   *
   * Due cinture invece di una: l'estensione è quella buona **e** il formato si
   * dichiara con `-f mjpeg`, così non dipende più da come si chiama il file.
   *
   * Sta nella cache e non accanto al video, anche quando è lì che finirà: un
   * `.jpg` di passaggio dentro la cartella dei risultati comparirebbe in
   * galleria come un'immagine a sé — per una frazione di secondo, ma
   * comparirebbe.
   */
  const temporaneo = join(
    cartellaAnteprime(),
    `${createHash("sha1").update(destinazione).digest("hex").slice(0, 16)}.inCorso.jpg`,
  );
  const fatto = await gira(binario, [
    "-hide_banner",
    "-loglevel",
    "error",
    // `-ss` **prima** di `-i`: così FFmpeg salta al secondo giusto senza
    // decodificare tutto quello che c'è prima. Su una clip da venti secondi
    // non cambia niente, su un film cambia tutto.
    "-ss",
    String(SECONDO_BUONO),
    "-i",
    sorgente,
    "-frames:v",
    "1",
    // Largo 480: è il doppio del riquadro più grande che la galleria disegna,
    // quindi si vede bene anche su uno schermo denso senza pesare.
    "-vf",
    "scale=480:-2",
    "-q:v",
    "4",
    // Il formato detto a voce, e non dedotto dal nome: vedi sopra.
    "-f",
    "mjpeg",
    "-y",
    temporaneo,
  ]);

  if (!fatto) {
    /**
     * Un video più corto del secondo scelto non ha quel fotogramma, e FFmpeg
     * scrive un file vuoto invece di lamentarsi. Si riprova dal principio: per
     * una clip di mezzo secondo il nero iniziale non c'è nemmeno.
     */
    const dallInizio = await gira(binario, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      sorgente,
      "-frames:v",
      "1",
      "-vf",
      "scale=480:-2",
      "-q:v",
      "4",
      "-f",
      "mjpeg",
      "-y",
      temporaneo,
    ]);
    if (!dallInizio) {
      rmSync(temporaneo, { force: true });
      return null;
    }
  }

  try {
    if (statSync(temporaneo).size === 0) {
      rmSync(temporaneo, { force: true });
      annota(`ffmpeg ha scritto un file vuoto per ${sorgente}`);
      return null;
    }
    try {
      renameSync(temporaneo, destinazione);
    } catch {
      // Fra due dischi diversi non si sposta, si copia. Capita se qualcuno ha
      // messo la cartella dei risultati su un altro disco.
      copyFileSync(temporaneo, destinazione);
      rmSync(temporaneo, { force: true });
    }
  } catch (err) {
    rmSync(temporaneo, { force: true });
    annota(`il fotogramma di ${sorgente} non si è potuto consegnare: ${err instanceof Error ? err.message : err}`);
    return null;
  }
  // Una copertina nuova accanto a un file vuol dire che la galleria adesso ha
  // qualcosa da mostrare che un attimo fa non c'era: chi la sta guardando deve
  // vederla comparire, non trovarla alla prossima apertura.
  if (destinazione.endsWith(SUFFISSO_COPERTINA)) avvisaChiGuarda();
  return destinazione;
}

/* ---------------------------------------------------- la copertina cucita */

/**
 * Cuce la copertina dentro il file audio.
 *
 * **Il gesto che è stato chiesto**, e il motivo per cui vale la pena: un brano
 * che esce dalla suite e finisce nel telefono di qualcuno smette di avere il
 * suo `.cover.jpg` accanto — quella cartella non lo segue. Con l'immagine
 * dentro, la copertina si vede nel lettore del telefono, in macchina, ovunque.
 *
 * Torna vero se ci è riuscito. Se non c'è FFmpeg, o se il formato non regge
 * un'immagine dentro (il WAV non la regge), si risponde di no **senza toccare
 * niente**: il brano resta quello che era, con la sua copertina di fianco.
 * Rovinare un file per aggiungergli una figura sarebbe uno scambio pessimo.
 */
export async function cuciLaCopertina(percorsoAudio: string): Promise<boolean> {
  const binario = findFfmpeg();
  if (!binario) return false;

  const coda = extname(percorsoAudio).toLowerCase();
  // MP3 e FLAC sanno tenersi un'immagine dentro; WAV e OGG no, o non in un modo
  // che i lettori leggano davvero. Meglio non provarci che riscrivere il file
  // per niente.
  if (coda !== ".mp3" && coda !== ".flac" && coda !== ".m4a") return false;

  const copertina = senzaEstensione(percorsoAudio) + SUFFISSO_COPERTINA;
  if (!existsSync(copertina)) return false;

  const temporaneo = `${senzaEstensione(percorsoAudio)}.conimmagine${coda}`;
  const argomenti =
    coda === ".flac"
      ? [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          percorsoAudio,
          "-i",
          copertina,
          "-map",
          "0:a",
          "-map",
          "1:v",
          "-c",
          "copy",
          "-disposition:v",
          "attached_pic",
          "-metadata:s:v",
          "title=Copertina",
          "-y",
          temporaneo,
        ]
      : [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          percorsoAudio,
          "-i",
          copertina,
          "-map",
          "0:a",
          "-map",
          "1:v",
          // `-c copy` su tutti e due: il suono non si ritocca. Ricodificare un
          // brano per attaccargli una figura vorrebbe dire peggiorarlo.
          "-c",
          "copy",
          "-id3v2_version",
          "3",
          "-metadata:s:v",
          "title=Copertina",
          "-metadata:s:v",
          "comment=Cover (front)",
          "-y",
          temporaneo,
        ];

  const fatto = await gira(binario, argomenti);
  if (!fatto) {
    rmSync(temporaneo, { force: true });
    annota(`copertina non cucita in ${percorsoAudio}: ffmpeg ha detto di no`);
    return false;
  }

  try {
    if (statSync(temporaneo).size === 0) {
      rmSync(temporaneo, { force: true });
      return false;
    }
    /**
     * Si sostituisce il file solo **adesso**, quando quello nuovo è finito e
     * non è vuoto. Fino a un istante fa il brano era intatto: se qualcosa fosse
     * andato storto, sarebbe rimasto intatto.
     */
    rmSync(percorsoAudio, { force: true });
    renameSync(temporaneo, percorsoAudio);
  } catch (err) {
    rmSync(temporaneo, { force: true });
    annota(`copertina non cucita in ${percorsoAudio}: ${err instanceof Error ? err.message : err}`);
    return false;
  }
  annota(`copertina cucita dentro ${percorsoAudio}`);
  return true;
}

/* --------------------------------------------------------------- FFmpeg */

/**
 * Lancia FFmpeg e dice se è finito bene. Mai più di mezzo minuto.
 *
 * ⚠ **E quando va male, scrive perché.** È la lezione della 0.8.1: FFmpeg si
 * lamentava a voce alta — «Unable to choose an output format» — e quella riga
 * andava a finire su uno `stderr` che nessuno leggeva. Il risultato era un
 * `false` senza motivo, e sopra a quel `false` un `null` senza motivo, e in
 * galleria un rettangolo nero senza motivo. Milleduecento volte.
 *
 * Un processo che fallisce in silenzio è un difetto che non si trova.
 */
function gira(binario: string, argomenti: string[]): Promise<boolean> {
  return new Promise((risolvi) => {
    const figlio = spawn(binario, argomenti, { windowsHide: true });
    registra(figlio, "ffmpeg (anteprime)");

    // Solo le ultime righe: a FFmpeg che non trova un codec ne bastano due, e
    // un log che si mangia il disco non lo guarda nessuno.
    let lamentele = "";
    figlio.stderr?.on("data", (pezzo: Buffer) => {
      lamentele = (lamentele + pezzo.toString()).slice(-600);
    });

    const scadenza = setTimeout(() => {
      figlio.kill();
      annota(`ffmpeg ci ha messo troppo: ${argomenti[argomenti.length - 1]}`);
      risolvi(false);
    }, ATTESA_FFMPEG_MS);
    figlio.on("error", (err) => {
      clearTimeout(scadenza);
      annota(`ffmpeg non è partito: ${err.message}`);
      risolvi(false);
    });
    figlio.on("close", (codice) => {
      clearTimeout(scadenza);
      if (codice !== 0) {
        annota(`ffmpeg ha detto di no (codice ${codice}): ${lamentele.trim() || "senza spiegazioni"}`);
      }
      risolvi(codice === 0);
    });
  });
}

function senzaEstensione(percorso: string): string {
  const coda = extname(percorso);
  return coda ? percorso.slice(0, -coda.length) : percorso;
}
