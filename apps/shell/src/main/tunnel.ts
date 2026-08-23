/**
 * La suite raggiungibile da Internet, non solo dalla wifi di casa.
 *
 * **Il problema, detto come si presenta.** Fino alla 0.5.2 il telefono parlava
 * col PC solo stando sulla stessa rete: il QR conteneva `192.168.1.8:8790`, che
 * fuori casa non esiste. Chi usciva vedeva «non raggiungibile» e basta.
 *
 * **Cosa non si è fatto, e perché.** La strada ovvia sarebbe aprire una porta
 * sul router e girarla al PC. Non si fa, per tre ragioni che valgono tutte
 * insieme: vuol dire mettere su Internet un server HTTP in chiaro, vuol dire
 * chiedere a chi usa la suite di configurare un router, e vuol dire che
 * l'indirizzo di casa cambia quando l'operatore decide.
 *
 * **Cosa si è fatto.** Un tunnel in **uscita** con `cloudflared`, quello che
 * Cloudflare chiama *quick tunnel*: il programma apre da solo una connessione
 * verso Cloudflare e riceve un indirizzo `https://qualcosa.trycloudflare.com`
 * che punta al gateway. Niente porte aperte, niente router da toccare, niente
 * account da fare — e la tratta su Internet è **HTTPS**, che è la cifratura che
 * la roadmap chiedeva prima del tunnel: da fuori il traffico è cifrato fino a
 * Cloudflare e da lì scende nel tunnel, che è cifrato anche lui. In casa resta
 * HTTP sulla LAN, come prima.
 *
 * **Cosa bisogna sapere, e sta scritto anche nel pannello.**
 *
 * - **L'indirizzo è pubblico.** Chiunque lo indovinasse arriverebbe alla
 *   pagina di accoppiamento — non ai contenuti: senza token il gateway
 *   risponde 401 a tutto, e il codice a otto cifre vive cinque minuti con un
 *   tetto di dieci tentativi al minuto (vedi `Remoto.accoppia`). Ma è un
 *   indirizzo su Internet, e va detto invece di essere scoperto.
 * - **Cambia a ogni accensione.** I quick tunnel non hanno un nome fisso: si
 *   spegne e si riaccende, e l'indirizzo è un altro. Per questo accendendolo si
 *   buttano gli inviti in corso — un QR è la fotografia di un indirizzo.
 * - **Serve `cloudflared`**, 40 MB circa, che la suite scarica da sé dalle
 *   Release ufficiali di Cloudflare la prima volta. Se non arriva, il tunnel
 *   non si accende e il motivo lo si legge: non si finge che sia acceso.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TOOLS_DIR } from "./paths";
import { createLogger } from "./logging";

/** Un log suo: quando il tunnel non parte, il motivo è nelle righe di cloudflared. */
const log = createLogger("tunnel");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Dove sta l'eseguibile che la suite si scarica. */
const ESEGUIBILE = join(TOOLS_DIR, "cloudflared.exe");

/**
 * Da dove si prende.
 *
 * La Release `latest` di Cloudflare, il binario Windows a 64 bit. È un URL
 * stabile che GitHub gira sempre all'ultima versione: non c'è un numero da
 * aggiornare in questo file ogni volta che ne esce una.
 */
const DA_DOVE =
  "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";

/** Sotto questa taglia il file scaricato non è `cloudflared`: è una pagina di errore. */
const MINIMO_CREDIBILE = 5 * 1024 * 1024;

/** Quanto si aspetta l'indirizzo, prima di dire che non arriva. */
const ATTESA_INDIRIZZO_MS = 90_000;

/** L'indirizzo che Cloudflare stampa quando il tunnel è su. */
const RIGA_INDIRIZZO = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

export type FaseTunnel = "spento" | "scarico" | "accendo" | "acceso" | "guasto";

export interface StatoTunnel {
  fase: FaseTunnel;
  /** L'indirizzo pubblico completo, con `https://`. Vuoto se non c'è. */
  indirizzo: string;
  /** Cosa è andato storto, detto a chi guarda il pannello. */
  motivo?: string;
  /** Quanto è arrivato dello scaricamento, da 0 a 1. Solo durante `scarico`. */
  quota?: number;
}

let processo: ChildProcess | null = null;
let stato: StatoTunnel = { fase: "spento", indirizzo: "" };

/**
 * Il tunnel si rialza da solo.
 *
 * **Il difetto che questo pezzo cura.** `cloudflared` puo' morire: la linea
 * cade per un minuto, Cloudflare chiude la connessione, il portatile va in
 * sospensione. Fino alla 0.7.4 il processo usciva, lo stato diventava «guasto»
 * e restava li' — il PC acceso, la suite aperta, e da fuori niente finche'
 * qualcuno non tornava davanti allo schermo a premere l'interruttore. Ma da
 * fuori casa quel qualcuno non c'e' per definizione: e' tutto il punto.
 *
 * Adesso, se il tunnel era acceso e cade, si riaccende da se'. Con un'attesa
 * che cresce, perche' se la linea e' giu' riprovare cinque volte al secondo
 * non la rimette su, e senza mai smettere: il momento in cui serve e' proprio
 * quello in cui nessuno puo' premere niente.
 */
let vogliamoAcceso = false;
/** La porta davanti a cui rialzarlo. */
let portaUltima = 0;
/** Quante volte e' caduto di fila: decide quanto si aspetta prima di ritentare. */
let cadute = 0;
let risveglio: NodeJS.Timeout | null = null;

/** Le attese fra un tentativo e l'altro, in secondi. Poi si resta sull'ultima. */
const RIPROVE_S = [3, 5, 10, 20, 30, 60];

function programmaRisveglio(): void {
  if (!vogliamoAcceso || risveglio) return;
  const attesa = RIPROVE_S[Math.min(cadute, RIPROVE_S.length - 1)] ?? 60;
  annota(`il tunnel e' caduto: riprovo fra ${attesa}s`);
  risveglio = setTimeout(() => {
    risveglio = null;
    if (!vogliamoAcceso) return;
    void accendiTunnel(portaUltima, true);
  }, attesa * 1000);
  risveglio.unref?.();
}

function fermaRisveglio(): void {
  if (risveglio) clearTimeout(risveglio);
  risveglio = null;
}
const ascoltatori = new Set<(s: StatoTunnel) => void>();

export const statoTunnel = (): StatoTunnel => ({ ...stato });

export function suTunnelCambiato(fn: (s: StatoTunnel) => void): () => void {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

function cambia(nuovo: Partial<StatoTunnel>): void {
  stato = { ...stato, ...nuovo };
  for (const fn of ascoltatori) fn({ ...stato });
}

/* --------------------------------------------------------- l'eseguibile */

/**
 * Si assicura che `cloudflared.exe` ci sia, scaricandolo se manca.
 *
 * Si scarica accanto e si rinomina alla fine: un file a metà con il nome
 * giusto sarebbe peggio di un file assente, perché al giro dopo sembrerebbe a
 * posto e fallirebbe all'avvio con un errore che non dice niente.
 */
async function assicuraEseguibile(): Promise<void> {
  if (existsSync(ESEGUIBILE) && statSync(ESEGUIBILE).size >= MINIMO_CREDIBILE) return;

  mkdirSync(TOOLS_DIR, { recursive: true });
  cambia({ fase: "scarico", quota: 0, motivo: undefined });
  annota("scarico cloudflared");

  const risposta = await fetch(DA_DOVE, { redirect: "follow" });
  if (!risposta.ok || !risposta.body) {
    throw new Error(`Non riesco a scaricare cloudflared (${risposta.status}).`);
  }

  const totale = Number(risposta.headers.get("content-length") ?? 0);
  const pezzi: Uint8Array[] = [];
  let fatti = 0;
  for await (const pezzo of risposta.body as unknown as AsyncIterable<Uint8Array>) {
    pezzi.push(pezzo);
    fatti += pezzo.length;
    if (totale) cambia({ quota: fatti / totale });
  }

  const tutto = Buffer.concat(pezzi);
  if (tutto.length < MINIMO_CREDIBILE) {
    throw new Error("Quello che è arrivato non è cloudflared: riprova più tardi.");
  }

  const provvisorio = `${ESEGUIBILE}.parte`;
  await writeFile(provvisorio, tutto);
  if (existsSync(ESEGUIBILE)) unlinkSync(ESEGUIBILE);
  renameSync(provvisorio, ESEGUIBILE);
  // Su Windows non serve, su un domani che non è Windows sì. Costa una riga.
  try {
    chmodSync(ESEGUIBILE, 0o755);
  } catch {
    // File system che non conosce i permessi: non è un problema.
  }
  annota(`cloudflared pronto (${Math.round(tutto.length / 1024 / 1024)} MB)`);
}

/* ------------------------------------------------------------- accendere */

/**
 * Accende il tunnel davanti alla porta del gateway e torna l'indirizzo pubblico.
 *
 * Non solleva mai: un tunnel che non parte è una cosa che può succedere — la
 * linea è giù, GitHub non risponde, Cloudflare rifiuta — e chi guarda il
 * pannello deve leggerne il motivo, non vedere la suite andare in errore.
 */
export async function accendiTunnel(porta: number, rialzo = false): Promise<StatoTunnel> {
  if (stato.fase === "acceso" && processo) return statoTunnel();
  await spegniTunnel(true);
  vogliamoAcceso = true;
  portaUltima = porta;
  if (!rialzo) cadute = 0;

  try {
    await assicuraEseguibile();
  } catch (err) {
    cambia({
      fase: "guasto",
      indirizzo: "",
      quota: undefined,
      motivo: err instanceof Error ? err.message : String(err),
    });
    cadute += 1;
    programmaRisveglio();
    return statoTunnel();
  }

  cambia({ fase: "accendo", indirizzo: "", quota: undefined, motivo: undefined });

  return new Promise<StatoTunnel>((risolvi) => {
    const figlio = spawn(
      ESEGUIBILE,
      [
        "tunnel",
        // `--no-autoupdate`: un aggiornamento automatico che riavvia il processo
        // mentre il telefono ci sta parlando è un guasto che nessuno capirebbe.
        "--no-autoupdate",
        "--url",
        `http://127.0.0.1:${porta}`,
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    processo = figlio;

    let deciso = false;
    const scadenza = setTimeout(() => {
      if (deciso) return;
      deciso = true;
      cambia({
        fase: "guasto",
        motivo: "Cloudflare non ha dato un indirizzo entro un minuto e mezzo. Riprova.",
      });
      void spegniTunnel();
      risolvi(statoTunnel());
    }, ATTESA_INDIRIZZO_MS);

    /**
     * L'indirizzo arriva **su stderr**, non su stdout.
     *
     * `cloudflared` scrive i suoi log su stderr e l'indirizzo è una riga di
     * log come le altre, dentro un riquadro di trattini. Si guardano tutte e
     * due le uscite invece di indovinare quale: costa niente ed è la differenza
     * fra funzionare e restare in attesa per sempre.
     */
    const guarda = (grezzo: Buffer): void => {
      const testo = grezzo.toString("utf8");
      for (const riga of testo.split(/\r?\n/)) {
        if (riga.trim()) annota(riga.trim().slice(0, 300));
      }
      const trovato = testo.match(RIGA_INDIRIZZO);
      if (!trovato || deciso) return;
      deciso = true;
      clearTimeout(scadenza);
      cadute = 0;
      cambia({ fase: "acceso", indirizzo: trovato[0], motivo: undefined });
      risolvi(statoTunnel());
    };

    figlio.stdout?.on("data", guarda);
    figlio.stderr?.on("data", guarda);

    figlio.on("error", (err) => {
      if (deciso) return;
      deciso = true;
      clearTimeout(scadenza);
      cambia({ fase: "guasto", indirizzo: "", motivo: err.message });
      processo = null;
      cadute += 1;
      programmaRisveglio();
      risolvi(statoTunnel());
    });

    figlio.on("exit", (codice) => {
      if (processo !== figlio) return;
      processo = null;
      clearTimeout(scadenza);
      // Se muore dopo essere partito, l'indirizzo non vale più niente: dirlo è
      // meglio che lasciare in giro un QR verso un tunnel che non c'è.
      cadute += 1;
      if (deciso) {
        cambia({
          fase: "guasto",
          indirizzo: "",
          motivo: `Il tunnel si è chiuso (codice ${codice ?? "?"}). Lo sto riaprendo.`,
        });
        programmaRisveglio();
        return;
      }
      deciso = true;
      cambia({
        fase: "guasto",
        indirizzo: "",
        motivo: `cloudflared è uscito subito (codice ${codice ?? "?"}).`,
      });
      programmaRisveglio();
      risolvi(statoTunnel());
    });
  });
}

export async function spegniTunnel(perRiaccendere = false): Promise<void> {
  // Spegnere per davvero vuol dire anche smettere di rialzarlo: l'interruttore
  // del pannello deve vincere sul rialzo automatico, se no non e' un
  // interruttore.
  if (!perRiaccendere) {
    vogliamoAcceso = false;
    cadute = 0;
  }
  fermaRisveglio();
  const figlio = processo;
  processo = null;
  if (figlio && !figlio.killed) {
    figlio.kill();
    // Un attimo per lasciargli chiudere la connessione con garbo. Se non basta
    // pazienza: è un processo suo, e non tiene niente di nostro aperto.
    await new Promise((r) => setTimeout(r, 200));
  }
  if (stato.fase !== "spento") cambia({ fase: "spento", indirizzo: "", quota: undefined });
}
