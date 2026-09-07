/**
 * L'indirizzo da fuori che **non cambia**, versione che funziona davvero.
 *
 * # Perche' esiste, dopo che c'era gia' Funnel
 *
 * Detto **otto volte** fra il 5 e il 7 settembre 2026: «dopo l'aggiornamento
 * l'app del telefono non si ricollega». La cura scelta nella 1.0.7 era Tailscale
 * Funnel: un indirizzo pubblico costruito sul nome della macchina, che non
 * cambia mai.
 *
 * ⚠ **E per quel telefono non funziona.** Provato il 7 settembre, dal suo
 * browser, tre volte: `https://<nome>.ts.net` non si apre, `:8443` non si apre,
 * e nemmeno l'IP nudo dei nodi di ingresso — «impossibile raggiungere il sito».
 * Dallo stesso telefono, nello stesso minuto, un indirizzo `trycloudflare.com`
 * risponde. Da una sonda esterna il Funnel risponde benissimo: **non e' rotto,
 * e' irraggiungibile da quella rete**, e su questo non possiamo fare niente.
 *
 * Un indirizzo stabile che il telefono **non raggiunge** e' peggio di nessun
 * indirizzo stabile: la suite lo offriva per primo, e chi era fuori casa bussava
 * li' prima di tutto.
 *
 * # Cosa fa questo file
 *
 * La stessa cosa del tunnel Cloudflare — un tunnel in uscita, niente porte
 * aperte sul router — ma con un nome **scelto una volta e per sempre**, che
 * ngrok regala anche col piano gratuito: uno per account.
 *
 * Il resto e' identico a `tunnel.ts`, e apposta: si scarica l'attrezzo da soli,
 * si tiene il processo sotto controllo, si legge l'indirizzo che stampa, e se
 * muore si dice invece di lasciare in giro un QR che non porta da nessuna
 * parte.
 *
 * # Cosa serve a chi lo usa
 *
 * Due cose, dal sito di ngrok, una volta sola:
 *
 * 1. **il token** del proprio account (gratuito);
 * 2. **il dominio statico** che quell'account regala, tipo
 *    `qualcosa-di-suo.ngrok-free.app`.
 *
 * Si incollano nelle impostazioni. Da li' in poi quell'indirizzo e' il computer,
 * oggi e fra un anno.
 *
 * ⚠ **Il token sta in chiaro nelle impostazioni**, come il resto di quel file.
 * E' la chiave del tunnel, non del computer: chi ce l'ha puo' aprire tunnel a
 * nome suo, non entrare qui dentro — per entrare serve comunque il token della
 * suite. Va detto lo stesso.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { TOOLS_DIR } from "./paths";
import { createLogger } from "./logging";
import { registra } from "./processi";

const esegui = promisify(execFile);
const log = createLogger("ngrok");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Dove sta l'eseguibile che la suite si scarica. */
const ESEGUIBILE = join(TOOLS_DIR, "ngrok.exe");

/**
 * Il pacco ufficiale per Windows a 64 bit.
 *
 * E' uno zip e non un exe nudo — a differenza di `cloudflared` — quindi dopo lo
 * scaricamento c'e' un passaggio in piu'. Si scompatta con quello che Windows
 * ha gia' in casa: nessuna libreria in piu' per un gesto che si fa una volta.
 */
const DA_SCARICARE =
  "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip";

/** Sotto questa taglia quello che e' arrivato non e' ngrok: e' una pagina di errore. */
const MINIMO_BYTE = 3_000_000;

/** Quanto si aspetta l'indirizzo prima di dire che non e' partito. */
const ATTESA_INDIRIZZO_MS = 90_000;

export type FaseNgrok = "spento" | "scarico" | "accendo" | "acceso" | "guasto";

export interface StatoNgrok {
  fase: FaseNgrok;
  /** L'indirizzo pubblico, quando c'e'. */
  indirizzo: string;
  /** Perche' non va, in italiano. */
  motivo?: string;
  /** Quanto e' arrivato dello scaricamento, da 0 a 1. Solo durante `scarico`. */
  quanto?: number;
}

let stato: StatoNgrok = { fase: "spento", indirizzo: "" };
let processo: ChildProcess | null = null;
let vogliamoAcceso = false;

const ascoltatori = new Set<(s: StatoNgrok) => void>();

export const statoNgrok = (): StatoNgrok => ({ ...stato });

export function suNgrokCambiato(fn: (s: StatoNgrok) => void): () => void {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

function cambia(pezzo: Partial<StatoNgrok>): void {
  stato = { ...stato, ...pezzo };
  for (const fn of ascoltatori) fn(statoNgrok());
}

/**
 * Si assicura che `ngrok.exe` ci sia, scaricandolo se manca.
 *
 * Come per `cloudflared`: si scarica accanto e si rinomina alla fine, cosi' un
 * file a meta' non prende mai il nome buono. Qui in mezzo c'e' lo zip, che si
 * scompatta e si butta.
 */
async function assicuraEseguibile(): Promise<void> {
  if (existsSync(ESEGUIBILE)) return;

  annota("scarico ngrok");
  cambia({ fase: "scarico", quanto: 0 });
  await mkdir(TOOLS_DIR, { recursive: true });

  const risposta = await fetch(DA_SCARICARE, { redirect: "follow" });
  if (!risposta.ok) {
    throw new Error(`Non riesco a scaricare ngrok (${risposta.status}).`);
  }
  const tutto = Buffer.from(await risposta.arrayBuffer());
  if (tutto.length < MINIMO_BYTE) {
    throw new Error("Quello che e' arrivato non e' ngrok: riprova piu' tardi.");
  }

  const zip = join(TOOLS_DIR, "ngrok-scarico.zip");
  await writeFile(zip, tutto);
  cambia({ quanto: 0.8 });

  /*
   * Si scompatta con PowerShell: Windows ce l'ha, e aggiungere una libreria
   * per gli zip a tutta la suite per un file che si prende una volta sarebbe
   * sproporzionato. `-Force` perche' un tentativo precedente puo' aver lasciato
   * in giro la cartella.
   */
  const dove = join(TOOLS_DIR, "ngrok-scompattato");
  await rm(dove, { recursive: true, force: true });
  await esegui("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dove}' -Force`,
  ]);

  const dentro = join(dove, "ngrok.exe");
  if (!existsSync(dentro)) {
    /**
     * ⚠ **Il caso vero, visto il 7 settembre 2026: l'antivirus se l'e' preso.**
     *
     * Windows Defender segna `ngrok.exe` come `Trojan:Win32/Kepavll!rfn` e lo
     * cancella appena estratto — un riconoscimento a naso, di quelli che
     * colpiscono gli attrezzi per i tunnel perche' li usano anche i ladri. Il
     * file arriva dal sito ufficiale di ngrok, ma **noi non possiamo
     * verificarlo**: Defender blocca perfino la lettura della firma.
     *
     * Quindi qui non si insiste e non si consiglia nessuna eccezione: si dice
     * cos'e' successo e si indica la strada che sul computer funziona gia'.
     */
    throw new Error(
      "L'antivirus ha cancellato ngrok appena scaricato (Windows Defender lo segna " +
        "come sospetto: capita agli attrezzi per i tunnel). Senza un'eccezione fatta " +
        "da te non puo' partire — e non te la consiglio a scatola chiusa. " +
        "In compenso il tunnel di Cloudflare, dalla 1.1.4, non cambia piu' indirizzo " +
        "quando aggiorni la suite.",
    );
  }
  await rename(dentro, ESEGUIBILE);
  await rm(zip, { force: true });
  await rm(dove, { recursive: true, force: true });
  annota(`ngrok pronto (${Math.round(tutto.length / 1024 / 1024)} MB)`);
  cambia({ quanto: 1 });
}

/** L'indirizzo dentro una riga di log di ngrok, che scrive in JSON. */
const RIGA_INDIRIZZO = /"url":"(https:\/\/[^"]+)"/;

/**
 * Accende il tunnel e torna quando c'e' un indirizzo (o quando non c'e').
 *
 * `dominio` e' quello statico dell'account: senza, ngrok ne da' uno nuovo a ogni
 * accensione e allora tanto vale il tunnel di Cloudflare, che almeno non chiede
 * un account. Con, quell'indirizzo e' sempre lo stesso — ed e' tutto il punto.
 */
export async function accendiNgrok(
  porta: number,
  token: string,
  dominio: string,
): Promise<StatoNgrok> {
  if (!token.trim()) {
    cambia({ fase: "guasto", indirizzo: "", motivo: "Manca il token di ngrok." });
    return statoNgrok();
  }
  await spegniNgrok(true);
  vogliamoAcceso = true;

  try {
    await assicuraEseguibile();
  } catch (err) {
    cambia({
      fase: "guasto",
      indirizzo: "",
      motivo: err instanceof Error ? err.message : String(err),
    });
    return statoNgrok();
  }

  cambia({ fase: "accendo", indirizzo: "", motivo: undefined });

  const pulito = dominio.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return new Promise<StatoNgrok>((risolvi) => {
    const figlio = spawn(
      ESEGUIBILE,
      [
        "http",
        String(porta),
        // In JSON su stdout: l'indirizzo si legge senza indovinare dove sta
        // dentro un riquadro disegnato coi trattini.
        "--log=stdout",
        "--log-format=json",
        ...(pulito ? ["--url", `https://${pulito}`] : []),
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        /*
         * Il token per **ambiente** e non come argomento: la riga di comando di
         * un processo la legge chiunque guardi l'elenco dei processi, e questa
         * e' una chiave.
         */
        env: { ...process.env, NGROK_AUTHTOKEN: token.trim() },
      },
    );
    processo = figlio;
    registra(figlio, "ngrok (indirizzo fisso da Internet)");

    let deciso = false;
    const scadenza = setTimeout(() => {
      if (deciso) return;
      deciso = true;
      cambia({
        fase: "guasto",
        motivo: "ngrok non ha dato un indirizzo entro un minuto e mezzo. Riprova.",
      });
      void spegniNgrok();
      risolvi(statoNgrok());
    }, ATTESA_INDIRIZZO_MS);

    const guarda = (grezzo: Buffer): void => {
      const testo = grezzo.toString("utf8");
      for (const riga of testo.split(/\r?\n/)) {
        if (riga.trim()) annota(riga.trim().slice(0, 300));
      }
      if (deciso) return;
      const trovato = testo.match(RIGA_INDIRIZZO);
      if (!trovato) return;
      deciso = true;
      clearTimeout(scadenza);
      cambia({ fase: "acceso", indirizzo: trovato[1] ?? "", motivo: undefined });
      risolvi(statoNgrok());
    };

    figlio.stdout?.on("data", guarda);
    figlio.stderr?.on("data", guarda);

    figlio.on("error", (err) => {
      if (deciso) return;
      deciso = true;
      clearTimeout(scadenza);
      cambia({ fase: "guasto", indirizzo: "", motivo: err.message });
      processo = null;
      risolvi(statoNgrok());
    });

    figlio.on("exit", (codice) => {
      if (processo !== figlio) return;
      processo = null;
      clearTimeout(scadenza);
      const perche =
        `ngrok si e' chiuso (codice ${codice ?? "?"}). ` +
        "Se il token o il dominio sono sbagliati, il motivo sta nel suo registro.";
      if (deciso) {
        cambia({ fase: "guasto", indirizzo: "", motivo: perche });
        return;
      }
      deciso = true;
      cambia({ fase: "guasto", indirizzo: "", motivo: perche });
      risolvi(statoNgrok());
    });
  });
}

export async function spegniNgrok(perRiaccendere = false): Promise<void> {
  if (!perRiaccendere) vogliamoAcceso = false;
  const figlio = processo;
  processo = null;
  if (figlio && !figlio.killed) {
    figlio.kill();
    await new Promise((r) => setTimeout(r, 300));
    if (!figlio.killed) figlio.kill("SIGKILL");
  }
  if (!perRiaccendere) cambia({ fase: "spento", indirizzo: "", motivo: undefined });
}

/** Vero se qualcuno l'ha acceso e lo vuole acceso. */
export const ngrokVoluto = (): boolean => vogliamoAcceso;
