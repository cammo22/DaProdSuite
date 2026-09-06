/**
 * L'indirizzo da fuori che **non cambia mai**: Tailscale Funnel.
 *
 * # Il problema che chiude
 *
 * Detto sei volte, l'ultima il 6 settembre 2026: «ho fatto l'aggiornamento e
 * non comunica con il pc, dovrei di nuovo togliere l'account e rimetterlo».
 *
 * Il collegamento non si perdeva mai — quello era un difetto
 * dell'interfaccia, chiuso in `MainActivity`. Ma sotto c'era una cosa vera:
 * **fuori casa l'unica strada era un tunnel Cloudflare gratuito, e il suo nome
 * cambia a ogni accensione della suite.** Nel registro di quel computer se ne
 * contano quarantasei. Aggiornare vuol dire riaccendere; riaccendere vuol dire
 * un nome nuovo; e il telefono, da fuori, non ha nessun modo di impararlo —
 * per impararlo dovrebbe parlare col computer, e per parlare col computer gli
 * serve un indirizzo che funziona.
 *
 * Finora la cura era «torna sulla wifi di casa una volta». Funziona, ed e' una
 * cura che chiede a chi la usa di andare fisicamente da qualche parte.
 *
 * # Cosa fa Funnel
 *
 * Da' alla macchina un indirizzo pubblico costruito sul suo nome dentro il
 * tailnet — per esempio `https://daprodmain.tailcc66b8.ts.net` — con un
 * certificato vero, raggiungibile da chiunque, **senza che sul telefono ci sia
 * niente installato**. E quel nome **non cambia**: non a un riavvio, non a un
 * aggiornamento, non fra un anno.
 *
 * E' esattamente il pezzo che mancava, e usa una cosa che sul computer c'e'
 * gia'.
 *
 * # Perche' non si accende da soli
 *
 * ⚠ Accendere Funnel vuol dire **mettere la suite su Internet** sotto un nome
 * pubblico. Il tunnel Cloudflare fa gia' la stessa cosa, quindi non e'
 * un'esposizione nuova — ma resta una decisione, e le decisioni di questo peso
 * si prendono guardandole. Qui si offre e si spiega; ad accendere e' un tocco
 * suo, in «Da fuori casa».
 *
 * E c'e' un secondo motivo, piu' banale: Funnel va **permesso dal tailnet**.
 * Serve che siano accesi i certificati HTTPS e l'attributo `funnel` nelle
 * regole — due interruttori nella console di Tailscale, che sono di chi possiede
 * l'account e non di questo programma. Quando mancano, `disponibile()` lo dice
 * con le parole giuste invece di lasciare un errore in un log.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { createLogger } from "./logging";

const esegui = promisify(execFile);
const log = createLogger("funnel");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/**
 * Dove sta `tailscale.exe`.
 *
 * Non si cerca nel PATH e basta: su Windows Tailscale si installa in Program
 * Files e **non ci si mette da solo**, quindi cercarlo solo li' vorrebbe dire
 * non trovarlo quasi mai. Si guardano i posti veri, e il PATH resta l'ultima
 * spiaggia per chi se l'e' messo a modo suo.
 */
function dovEIlComando(): string | null {
  const posti = [
    join(process.env["ProgramFiles"] ?? "C:\\Program Files", "Tailscale", "tailscale.exe"),
    join(process.env["ProgramW6432"] ?? "C:\\Program Files", "Tailscale", "tailscale.exe"),
    "/usr/bin/tailscale",
    "/usr/local/bin/tailscale",
  ];
  for (const p of posti) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Com'e' messo Funnel su questa macchina. */
export interface StatoFunnel {
  /** Tailscale c'e' ed e' collegato. */
  ceTailscale: boolean;
  /** Il nome pubblico della macchina, senza il punto finale. Vuoto se non c'e'. */
  nome: string;
  /** Funnel e' acceso adesso su questa porta. */
  acceso: boolean;
  /** Il tailnet lo permette. Falso se mancano i due interruttori. */
  permesso: boolean;
  /** Cosa dire a chi guarda, in italiano. */
  perche: string;
  /** L'indirizzo completo, quando c'e'. */
  indirizzo: string;
}

const SPENTO: StatoFunnel = {
  ceTailscale: false,
  nome: "",
  acceso: false,
  permesso: false,
  perche: "Tailscale non e' installato su questo computer.",
  indirizzo: "",
};

async function tailscale(args: string[]): Promise<{ ok: boolean; testo: string }> {
  const cmd = dovEIlComando();
  if (!cmd) return { ok: false, testo: "" };
  try {
    const { stdout, stderr } = await esegui(cmd, args, { timeout: 15_000 });
    return { ok: true, testo: `${stdout}\n${stderr}`.trim() };
  } catch (err) {
    // Un comando che finisce male ha comunque qualcosa da dire, e quasi sempre
    // e' la cosa che serve: il link per accendere Funnel arriva proprio cosi'.
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, testo: `${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}`.trim() };
  }
}

/** Il nome pubblico di questa macchina dentro il tailnet, senza punto finale. */
async function nomeDellaMacchina(): Promise<string> {
  const r = await tailscale(["status", "--json"]);
  if (!r.ok || !r.testo) return "";
  try {
    const dati = JSON.parse(r.testo.slice(r.testo.indexOf("{"))) as {
      Self?: { DNSName?: string };
    };
    return (dati.Self?.DNSName ?? "").replace(/\.$/, "");
  } catch {
    return "";
  }
}

/**
 * Guarda com'e' messo, senza accendere niente.
 *
 * ⚠ **Non accende**, ed e' il punto: questa funzione la chiama l'avvio, e
 * l'avvio non deve prendere decisioni che mettono roba su Internet.
 */
export async function comeStaFunnel(porta: number): Promise<StatoFunnel> {
  if (!dovEIlComando()) return SPENTO;

  const nome = await nomeDellaMacchina();
  if (!nome) {
    return {
      ...SPENTO,
      ceTailscale: true,
      perche: "Tailscale c'e' ma non e' collegato: apri l'app e fai l'accesso.",
    };
  }

  const stato = await tailscale(["funnel", "status"]);
  const acceso = stato.ok && stato.testo.includes(String(porta));

  return {
    ceTailscale: true,
    nome,
    acceso,
    // Se e' gia' acceso, e' per forza permesso. Se non lo e', non si sa finche'
    // non si prova: la capability non si legge in modo affidabile da qui.
    permesso: acceso,
    perche: acceso
      ? "Acceso: questo indirizzo non cambia mai."
      : "Non ancora acceso.",
    indirizzo: acceso ? `https://${nome}` : "",
  };
}

/**
 * Accende Funnel su quella porta, e torna com'e' andata.
 *
 * ⚠ Da chiamare **solo** su un gesto di chi usa la suite. Vedi il commento in
 * cima al file.
 *
 * Se il tailnet non lo permette, Tailscale risponde con un indirizzo da aprire
 * per accendere la funzione. Quell'indirizzo si tiene e si fa vedere: e' la
 * differenza fra «non si puo'» e «ecco dove si accende».
 */
export async function accendiFunnel(porta: number): Promise<StatoFunnel> {
  const prima = await comeStaFunnel(porta);
  if (!prima.ceTailscale || !prima.nome) return prima;
  if (prima.acceso) return prima;

  annota(`accendo Funnel sulla porta ${porta}`);
  const r = await tailscale(["funnel", "--bg", String(porta)]);

  if (r.ok) {
    const dopo = await comeStaFunnel(porta);
    annota(dopo.acceso ? `acceso su ${dopo.indirizzo}` : `non risulta acceso: ${r.testo.slice(0, 300)}`);
    return dopo;
  }

  /*
   * Il caso piu' comune: il tailnet non ha Funnel abilitato. Tailscale in quel
   * caso stampa un indirizzo della console da aprire. Portarlo fuori vuol dire
   * trasformare un errore in un'istruzione.
   */
  const link = r.testo.match(/https:\/\/login\.tailscale\.com\/\S+/)?.[0] ?? "";
  annota(`Funnel non accettato: ${r.testo.slice(0, 400)}`);
  return {
    ...prima,
    permesso: false,
    perche: link
      ? "Il tuo Tailscale non ha ancora Funnel acceso. Si accende una volta sola da qui: " + link
      : "Il tuo Tailscale non ha ancora Funnel acceso. Va acceso dalla console di Tailscale, " +
        "in Access Controls: servono i certificati HTTPS e l'attributo «funnel».",
  };
}

/** Spegne Funnel. Torna sempre, anche se non era acceso. */
export async function spegniFunnel(porta: number): Promise<void> {
  if (!dovEIlComando()) return;
  await tailscale(["funnel", "--bg", String(porta), "off"]);
  annota("spento");
}
