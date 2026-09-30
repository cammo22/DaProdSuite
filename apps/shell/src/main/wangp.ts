/**
 * WanGP, il motore di DaProdProduzioni, governato dalla suite.
 *
 * **Non c'è più il launcher in mezzo.** Fino alla 1.7.6 la suite accendeva
 * «Wan2GP Desktop Launcher» e poi parlava con Deepy, l'agente di WanGP. Dalla
 * 1.7.7 la suite accende WanGP da sé — il `wgp.py` che sta nella sua cartella,
 * con il suo ambiente Python — e lo usa come usa ComfyUI: un motore suo, con la
 * sua configurazione, i suoi log e la sua fila.
 *
 * ## Come sono fusi i due programmi
 *
 * - **L'interfaccia intera** (tutti i modelli, tutte le impostazioni) si apre
 *   in una finestra della suite e, per chi decide, dal telefono (il gateway la
 *   porta; vedi `packages/gateway/src/wangp.ts`).
 * - **I lavori degli utenti** — un'immagine, un brano — vanno nella **stessa
 *   coda** che vede chi ha l'interfaccia aperta, attraverso un piccolo plugin
 *   nostro (`services/wangp/daprod_ponte`) che la suite installa dentro WanGP.
 *   Un WanGP solo, una scheda video sola, nessun agente a interpretare.
 *
 * ## Cosa la suite non tocca
 *
 * La licenza di WanGP (Community License 2.0) non permette di incorporarlo in
 * un altro prodotto e chiede di dichiararne l'uso: WanGP resta dov'è
 * installato, non viene copiato né modificato — a parte il plugin, che è
 * l'estensione che WanGP stesso prevede — e la scheda lo dice.
 *
 * La configurazione **non** è quella del launcher: sta in
 * `%LOCALAPPDATA%\DaProdSuite\wangp\config`, così non si pestano i piedi (vedi
 * `assicuraLaConfigurazione`).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createLogger } from "./logging";
import { DATA_ROOT, OUTPUT_DIR, SERVICES_DIR } from "./paths";
import { registra, uccidiAlbero } from "./processi";

const log = createLogger("wangp");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Dove ascolta il WanGP della suite. Fuori da 7860 e 7861, che sono del launcher. */
export const PORTA_WANGP = 7865;
/** La porticina del plugin nostro, dentro WanGP. Solo su 127.0.0.1. */
export const PORTA_PONTE = 7866;

export const PAGINA_WANGP = "https://github.com/deepbeepmeep/Wan2GP";

/** Il nome con cui il plugin sta dentro `plugins/` di WanGP. */
const PLUGIN = "daprod_ponte";

/** Dove la suite tiene le sue cose di WanGP. */
const CARTELLA_CONFIGURAZIONE = join(DATA_ROOT, "wangp", "config");

/** Dove finiscono i file che WanGP produce: la libreria della suite li vede da qui. */
export const CARTELLA_USCITA = join(OUTPUT_DIR, "produzioni");

/** Dopo quanto WanGP si spegne da solo se nessuno lo usa: libera la scheda video. */
const INATTIVO_MS = 20 * 60_000;

/** Quanto si aspetta che WanGP si alzi: il primo avvio scarica ffmpeg e carica tutto. */
const ATTESA_AVVIO_MS = 6 * 60_000;

export interface Installazione {
  /** La cartella con `wgp.py`. */
  radice: string;
  /** Il Python del suo ambiente. */
  python: string;
}

export interface StatoWanGP {
  installato: boolean;
  acceso: boolean;
  inAvvio: boolean;
  /** Il ponte per i lavori degli utenti risponde? */
  ponte: boolean;
  errore?: string;
}

/* --------------------------------------------------------- trovarlo */

/**
 * Dove sta WanGP su questo computer.
 *
 * Si cerca in tre posti: `WANGP_DIR` (per chi lo tiene altrove), la cartella
 * dove lo mette il launcher (`C:\Wan2GP`) e la cartella utente. Quello che
 * conta è che ci sia `wgp.py` **e** un ambiente Python con dentro il suo
 * interprete: senza, WanGP non si può accendere e la scheda lo dice.
 */
export function trovaInstallazione(): Installazione | null {
  const candidate = [process.env.WANGP_DIR, "C:\\Wan2GP", join(homedir(), "Wan2GP")].filter((c): c is string => !!c);
  for (const radice of candidate) {
    if (!existsSync(join(radice, "wgp.py"))) continue;
    for (const ambiente of ambientiDi(radice)) {
      const python = join(ambiente, "Scripts", "python.exe");
      if (existsSync(python)) return { radice, python };
    }
  }
  return null;
}

/** Gli ambienti Python di un'installazione, quello attivo per primo (`envs.json`). */
function ambientiDi(radice: string): string[] {
  const trovati: string[] = [];
  try {
    const envs = JSON.parse(readFileSync(join(radice, "envs.json"), "utf8")) as {
      active?: string;
      envs?: Record<string, { path?: string }>;
    };
    const attivo = envs.active ? envs.envs?.[envs.active]?.path : undefined;
    if (attivo) trovati.push(join(radice, attivo));
  } catch {
    // Nessun envs.json: si provano i nomi di sempre.
  }
  for (const nome of ["env_uv", "venv", ".venv", "env"]) trovati.push(join(radice, nome));
  return trovati;
}

/* ---------------------------------------------------- configurazione */

/**
 * ⚠ **La configurazione di WanGP è nostra, non del launcher.**
 *
 * WanGP legge `wgp_config.json`. Se gli si dà `--config <cartella>` legge quello
 * di quella cartella — e se non c'è **cade su quello del launcher**, che è una
 * configurazione a metà (poche chiavi, scritte dal launcher) e fa morire WanGP
 * con un `KeyError` appena parte. Trovato provandolo: `attention_mode`, poi
 * `clear_file_list`, una chiave per volta.
 *
 * Quindi la suite scrive la sua — con le chiavi senza le quali WanGP non parte —
 * e ci lascia dentro quello che WanGP vi aggiunge da sé. Ad ogni accensione
 * rimette a posto **solo** quello che serve alla suite: dove escono i file e il
 * plugin del ponte. Il resto (profilo, quantizzazioni, tutto quello che si
 * cambia dalla scheda «Configuration») è di chi usa WanGP e non si tocca.
 *
 * I modelli e le LoRA si prendono da dove li tiene già il launcher, così non si
 * riscarica niente: `checkpoints_paths` e `loras_root` si copiano dalla sua
 * configurazione se ce n'è una.
 */
function assicuraLaConfigurazione(inst: Installazione): void {
  mkdirSync(CARTELLA_CONFIGURAZIONE, { recursive: true });
  mkdirSync(CARTELLA_USCITA, { recursive: true });
  const file = join(CARTELLA_CONFIGURAZIONE, "wgp_config.json");

  let dati: Record<string, unknown> = {};
  if (existsSync(file)) {
    try {
      dati = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      annota("la configurazione di WanGP era illeggibile: la rifaccio");
    }
  }

  // Dove il launcher tiene i modelli, se c'è.
  let prestiti: Record<string, unknown> = {};
  try {
    prestiti = JSON.parse(readFileSync(join(inst.radice, "wgp_config.json"), "utf8")) as Record<string, unknown>;
  } catch {
    // Nessuna configurazione del launcher: WanGP userà le sue cartelle.
  }

  const di_serie: Record<string, unknown> = {
    attention_mode: "auto",
    clear_file_list: 5,
    transformer_quantization: "int8",
    text_encoder_quantization: "int8",
    checkpoints_paths: prestiti.checkpoints_paths ?? ["."],
    ...(prestiti.loras_root ? { loras_root: prestiti.loras_root } : {}),
  };
  for (const [chiave, valore] of Object.entries(di_serie)) {
    if (dati[chiave] === undefined) dati[chiave] = valore;
  }

  // Quello che serve alla suite: si rimette a ogni accensione.
  dati.save_path = CARTELLA_USCITA;
  dati.image_save_path = CARTELLA_USCITA;
  dati.audio_save_path = CARTELLA_USCITA;
  const abilitati = Array.isArray(dati.enabled_plugins) ? (dati.enabled_plugins as unknown[]).map(String) : [];
  if (!abilitati.includes(PLUGIN)) abilitati.push(PLUGIN);
  dati.enabled_plugins = abilitati;

  writeFileSync(file, JSON.stringify(dati, null, 2), "utf8");
}

/**
 * Mette il plugin del ponte dentro WanGP, se non c'è o è vecchio.
 *
 * Torna il motivo se non ci riesce: WanGP parte lo stesso (l'interfaccia intera
 * funziona), ma i lavori degli utenti non passeranno finché il ponte non c'è.
 */
function installaIlPonte(inst: Installazione): string | null {
  const da = join(SERVICES_DIR, "wangp", PLUGIN);
  const a = join(inst.radice, "plugins", PLUGIN);
  try {
    if (!existsSync(da)) return `Manca il plugin della suite (${da}).`;
    mkdirSync(a, { recursive: true });
    for (const nome of readdirSync(da)) {
      if (nome === "__pycache__") continue;
      const sorgente = join(da, nome);
      const destinazione = join(a, nome);
      const nuovo = readFileSync(sorgente);
      if (existsSync(destinazione) && readFileSync(destinazione).equals(nuovo)) continue;
      copyFileSync(sorgente, destinazione);
      annota(`ponte: aggiornato ${nome}`);
    }
    return null;
  } catch (errore) {
    return `Non riesco a installare il ponte dentro WanGP: ${errore instanceof Error ? errore.message : String(errore)}`;
  }
}

/* --------------------------------------------------------- accenderlo */

let figlio: ChildProcess | null = null;
let inAvvio: Promise<string> | null = null;
let ultimoErrore: string | undefined;
let tokenPonte = "";
let ultimoUso = Date.now();
let finestraAperta = false;
let guardia: NodeJS.Timeout | null = null;

/** Le ultime righe di quello che WanGP ha detto: servono a spiegare perché non parte. */
const ultimeRighe: string[] = [];
function ricorda(pezzo: Buffer | string): void {
  for (const riga of pezzo.toString().split(/\r?\n/)) {
    const pulita = riga.trim();
    if (!pulita || pulita.length > 400) continue;
    // Le barre di avanzamento (ffmpeg, download) sono una riga lunghissima: si scartano.
    if (/\d+%\|/.test(pulita)) continue;
    ultimeRighe.push(pulita);
    if (ultimeRighe.length > 40) ultimeRighe.shift();
  }
}

const baseWanGP = (): string => `http://127.0.0.1:${PORTA_WANGP}`;

async function risponde(base: string, percorso = "/config"): Promise<boolean> {
  try {
    const r = await fetch(base + percorso, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

/** C'è un WanGP acceso da qualcun altro (il launcher, un avvio a mano)? */
async function unAltroWanGP(): Promise<string | null> {
  for (const porta of [7861, 7860]) {
    const base = `http://127.0.0.1:${porta}`;
    if (await risponde(base, "/deepy/deepy_api/state")) return base;
  }
  return null;
}

function figlioVivo(): boolean {
  return !!figlio && figlio.exitCode === null && !figlio.killed;
}

/** L'indirizzo di WanGP se il figlio della suite è vivo, altrimenti null. */
export function base(): string | null {
  return figlioVivo() ? baseWanGP() : null;
}

/** Segna che qualcuno sta usando WanGP: rimanda lo spegnimento per inattività. */
export function segnaUso(): void {
  ultimoUso = Date.now();
}

/** La finestra della suite aperta su WanGP tiene WanGP acceso. */
export function impostaFinestra(aperta: boolean): void {
  finestraAperta = aperta;
  if (aperta) segnaUso();
}

export async function stato(): Promise<StatoWanGP> {
  const inst = trovaInstallazione();
  if (!inst) return { installato: false, acceso: false, inAvvio: false, ponte: false, errore: ultimoErrore };
  const acceso = figlioVivo() && (await risponde(baseWanGP()));
  const ponteOk = acceso ? !!(await ponteStato())?.pronto : false;
  return { installato: true, acceso, inAvvio: inAvvio !== null, ponte: ponteOk, errore: ultimoErrore };
}

/**
 * Accende WanGP e aspetta che risponda. Torna l'indirizzo.
 *
 * Una accensione alla volta: chi arriva mentre si sta alzando aspetta la stessa.
 */
export function accendi(): Promise<string> {
  segnaUso();
  if (figlioVivo()) {
    return risponde(baseWanGP()).then((ok) => (ok ? baseWanGP() : inAvvio ?? partenza()));
  }
  return inAvvio ?? partenza();
}

function partenza(): Promise<string> {
  inAvvio = accendiDavvero().finally(() => {
    inAvvio = null;
  });
  return inAvvio;
}

async function accendiDavvero(): Promise<string> {
  ultimoErrore = undefined;
  const inst = trovaInstallazione();
  if (!inst) {
    ultimoErrore = "WanGP non è installato su questo computer. Installalo da " + PAGINA_WANGP;
    throw new Error(ultimoErrore);
  }
  if (figlioVivo()) return baseWanGP(); // vivo ma non ancora pronto: si aspetta sotto

  const altro = await unAltroWanGP();
  if (altro) {
    ultimoErrore =
      "C'è già un WanGP acceso da un altro programma (di solito il launcher, su " +
      altro +
      "). Chiudilo: la suite accende il suo, e due insieme si contendono la scheda video.";
    throw new Error(ultimoErrore);
  }

  assicuraLaConfigurazione(inst);
  const problemaPonte = installaIlPonte(inst);
  if (problemaPonte) annota(problemaPonte);

  /**
   * ⚠ **Se WanGP è morto mentre partiva, lascia un `startup.lock`** — e alla
   * volta dopo si accende in «safe mode», che **spegne i plugin**: il ponte
   * sparirebbe senza una parola. Siamo gli unici a poterlo aver lasciato (un
   * altro WanGP l'abbiamo appena escluso), quindi si toglie.
   */
  try {
    rmSync(join(inst.radice, "startup.lock"), { force: true });
  } catch {
    // Non c'era, o non si lascia togliere: WanGP lo dirà lui.
  }

  tokenPonte = randomBytes(24).toString("hex");
  ultimeRighe.length = 0;
  annota(`accendo WanGP (${inst.radice}) sulla porta ${PORTA_WANGP}`);
  const nuovo = spawn(
    inst.python,
    ["-u", "wgp.py", "--config", CARTELLA_CONFIGURAZIONE, "--server-name", "127.0.0.1", "--server-port", String(PORTA_WANGP)],
    {
      cwd: inst.radice,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        DAPROD_PONTE_PORTA: String(PORTA_PONTE),
        DAPROD_PONTE_TOKEN: tokenPonte,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    },
  );
  figlio = nuovo;
  registra(nuovo, "WanGP");
  nuovo.stdout?.on("data", (p: Buffer) => {
    ricorda(p);
    log.write(p, false);
  });
  nuovo.stderr?.on("data", (p: Buffer) => {
    ricorda(p);
    log.write(p, true);
  });
  nuovo.once("close", (codice) => {
    annota(`WanGP si è chiuso (codice ${codice})`);
    if (figlio === nuovo) figlio = null;
  });
  avviaLaGuardia();

  const fine = Date.now() + ATTESA_AVVIO_MS;
  while (Date.now() < fine) {
    await new Promise((r) => setTimeout(r, 2500));
    if (figlio !== nuovo || nuovo.exitCode !== null) {
      const coda = ultimeRighe.slice(-6).join(" · ");
      ultimoErrore = "WanGP si è chiuso mentre partiva." + (coda ? " Ha detto: " + coda : "");
      throw new Error(ultimoErrore);
    }
    if (await risponde(baseWanGP())) {
      annota("WanGP risponde");
      return baseWanGP();
    }
  }
  ultimoErrore = "WanGP non ha risposto in tempo. Guarda il log della suite (wangp.log).";
  spegniSubito();
  throw new Error(ultimoErrore);
}

/* ---------------------------------------------------------- spegnerlo */

function spegniSubito(): void {
  const f = figlio;
  figlio = null;
  if (f?.pid) uccidiAlbero(f.pid);
}

export async function spegni(): Promise<void> {
  annota("spengo WanGP");
  spegniSubito();
  if (guardia) clearInterval(guardia);
  guardia = null;
}

/**
 * Lo spegne da sé quando nessuno lo usa: libera la scheda video.
 *
 * «Nessuno lo usa» vuol dire: nessuna finestra della suite aperta su di lui,
 * nessuna richiesta di un admin passata dal gateway negli ultimi venti minuti, e
 * nessuna generazione in corso — né dal ponte né da chi ha l'interfaccia aperta.
 */
function avviaLaGuardia(): void {
  if (guardia) return;
  guardia = setInterval(() => {
    void (async () => {
      if (!figlioVivo()) return;
      if (finestraAperta || Date.now() - ultimoUso < INATTIVO_MS) return;
      const p = await ponteStato();
      if (p && (p.lavoriAttivi > 0 || p.generazione)) return;
      // Se il ponte non risponde non si sa se WanGP sta generando (per chi ha la
      // sua interfaccia aperta): si aspetta il triplo, invece di spegnerlo a meta'.
      if (!p && Date.now() - ultimoUso < INATTIVO_MS * 3) return;
      annota("nessuno usa WanGP da un po': lo spengo");
      await spegni();
    })();
  }, 60_000);
  guardia.unref();
}

/** WanGP sta generando adesso — per la fila o per chi ha la sua interfaccia aperta? */
export async function occupato(): Promise<boolean> {
  const p = await ponteStato();
  return !!p && (p.generazione || p.lavoriAttivi > 0);
}

/* -------------------------------------------------------------- ponte */

export interface StatoPonte {
  ponte: string;
  pronto: boolean;
  lavoriAttivi: number;
  /** WanGP sta generando adesso (anche per chi ha l'interfaccia aperta). */
  generazione: boolean;
}

export interface StatoLavoro {
  id: string;
  stato: "attesa" | "in-corso" | "finito" | "errore" | "annullato";
  progresso: number | null;
  fase: string;
  files: string[];
  errore: string;
}

async function chiamaIlPonte<T>(metodo: "GET" | "POST", percorso: string, corpo?: unknown, attesaMs = 8000): Promise<T> {
  const r = await fetch(`http://127.0.0.1:${PORTA_PONTE}${percorso}`, {
    method: metodo,
    headers: { "X-DaProd-Token": tokenPonte, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(attesaMs),
  });
  const json = (await r.json().catch(() => ({}))) as T & { errore?: string };
  if (!r.ok) throw new Error(json.errore || `Il ponte ha risposto ${r.status}.`);
  return json;
}

async function ponteStato(): Promise<StatoPonte | null> {
  if (!figlioVivo()) return null;
  try {
    return await chiamaIlPonte<StatoPonte>("GET", "/stato", undefined, 2000);
  } catch {
    return null;
  }
}

/** Mette un lavoro nella coda di WanGP. Torna l'id del lavoro. */
export async function mandaLavoro(settings: Record<string, unknown>): Promise<string> {
  await accendi();
  // Il plugin si alza dopo l'interfaccia: si aspetta che risponda.
  const fine = Date.now() + 90_000;
  while (Date.now() < fine) {
    const p = await ponteStato();
    if (p?.pronto) break;
    if (!figlioVivo()) throw new Error("WanGP si è chiuso.");
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (!(await ponteStato())?.pronto) {
    throw new Error(
      "Il ponte fra la suite e WanGP non risponde. " +
        (ultimoErrore ? ultimoErrore + " " : "") +
        "Riavvia la suite; se resta così, guarda il log (wangp.log).",
    );
  }
  segnaUso();
  const { id } = await chiamaIlPonte<{ id: string }>("POST", "/lavori", { settings }, 20_000);
  return id;
}

export const statoLavoro = (id: string): Promise<StatoLavoro> => chiamaIlPonte<StatoLavoro>("GET", `/lavori/${encodeURIComponent(id)}`);

export const annullaLavoro = (id: string): Promise<StatoLavoro> =>
  chiamaIlPonte<StatoLavoro>("POST", `/lavori/${encodeURIComponent(id)}/annulla`, {});

/** I modelli di immagini e audio, come li vede WanGP adesso. */
export const modelliWanGP = (): Promise<{ modelli: { model_type: string; nome: string; disponibile: string | null }[] }> =>
  chiamaIlPonte("GET", "/modelli", undefined, 60_000);
