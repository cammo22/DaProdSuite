/**
 * Controllo dell'ambiente Python condiviso: "e' tutto a posto?", detto in
 * cinque righe che si leggono senza sapere cosa sia un pacchetto.
 *
 * **Perche' serve.** «Ripara» rimette a posto, ma alla cieca: sono minuti di
 * reinstallazione che chi la preme non sa se gli servivano. E soprattutto,
 * quando un'app non si apre, la domanda vera e' un'altra — *e' l'ambiente, o
 * e' quell'app?* Finora si rispondeva leggendo i log. Qui si risponde
 * premendo un tasto.
 *
 * **Cosa si guarda, e perche' proprio questo.** Ogni controllo qui dentro e'
 * un modo in cui l'ambiente si e' rotto davvero, la notte del 19 agosto 2026:
 *
 * - **torch e la GPU**: senza CUDA i motori girano lo stesso, sul processore, e
 *   una canzone da due minuti diventa mezz'ora. Va detto, non scoperto.
 * - **i pacchetti dichiarati ci sono**: una disinstallazione fallita a meta'
 *   (l'errore 4395 dell'antivirus, vedi `uv.ts`) lascia il pacchetto senza i
 *   suoi file.
 * - **le versioni sono coerenti** (`uv pip check`): e' il rimbalzo fra
 *   `transformers` e `huggingface-hub`, quello che ha spento quattro app
 *   insieme.
 * - **le librerie si aprono davvero**: il caso peggiore, e quello vero di
 *   quella notte — numeri di versione tutti giusti e i file di due versioni
 *   mescolati. Da fuori si vedeva solo ComfyUI che moriva parlando di
 *   `BucketNotFoundError`. L'unico modo di accorgersene e' importarle.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { capture, CommandError } from "./exec";
import { nomePacchetto } from "./requisiti";

export type EsitoControllo = "ok" | "attenzione" | "guasto";

/** Una riga del rapporto: cosa si e' guardato, com'e' andata, in italiano. */
export interface VoceControllo {
  id: string;
  titolo: string;
  esito: EsitoControllo;
  /** Detto all'utente, non al programmatore. */
  dettaglio: string;
}

export interface ControllaOptions {
  /** Percorso di uv, da `ensureUv`. */
  uv: string;
  /** Cartella del venv condiviso. */
  runtimeDir: string;
  /** I file di requisiti delle app installate: solo di quelle, come in `ripara`. */
  requisiti: string[];
  onLine?: (riga: string) => void;
  segnale?: AbortSignal;
}

/**
 * Le librerie condivise che vale la pena aprire per davvero.
 *
 * Non tutte quelle installate: importare mezzo ambiente durerebbe minuti. Sono
 * quelle che stanno sotto piu' di un motore, cioe' quelle il cui guasto spegne
 * piu' di un'app — che e' esattamente com'e' andata.
 */
const MODULI_CHIAVE = [
  "huggingface_hub",
  "safetensors",
  "transformers",
  "diffusers",
  "fastapi",
  "numpy",
  "PIL",
];

/** Il probe: sta in Python perche' e' l'unico che puo' rispondere davvero. */
const SCRIPT = `
import importlib, json, sys
import importlib.metadata as md

atteso = json.load(open(sys.argv[1], encoding="utf-8"))
out = {"python": ".".join(map(str, sys.version_info[:3])), "mancanti": [], "rotti": []}

try:
    import torch
    out["torch"] = torch.__version__
    out["cuda"] = torch.cuda.is_available()
    if out["cuda"]:
        out["gpu"] = torch.cuda.get_device_name(0)
except Exception as exc:
    out["torch_errore"] = str(exc)

for nome in atteso["pacchetti"]:
    try:
        md.version(nome)
    except Exception:
        out["mancanti"].append(nome)

for modulo in atteso["moduli"]:
    try:
        importlib.import_module(modulo)
    except ModuleNotFoundError:
        # Non installato: lo dice gia' l'elenco dei pacchetti, e ripeterlo qui
        # farebbe sembrare rotto qualcosa che semplicemente non c'e'.
        pass
    except Exception as exc:
        out["rotti"].append(modulo + ": " + str(exc))

print(json.dumps(out))
`;

interface Probe {
  python: string;
  torch?: string;
  cuda?: boolean;
  gpu?: string;
  torch_errore?: string;
  mancanti: string[];
  rotti: string[];
}

/**
 * Guarda l'ambiente e torna il rapporto, una voce per controllo.
 *
 * Non ripara e non tocca niente: e' una visita, non una cura. Puo' durare
 * qualche decina di secondi — importare `torch` e `transformers` non e'
 * gratis — e per questo lo fa solo quando qualcuno lo chiede.
 */
export async function controllaAmbiente(options: ControllaOptions): Promise<VoceControllo[]> {
  const { uv, runtimeDir, requisiti, onLine, segnale } = options;
  const python = join(runtimeDir, "Scripts", "python.exe");

  if (!existsSync(python)) {
    return [
      {
        id: "ambiente",
        titolo: "L'ambiente Python",
        esito: "guasto",
        dettaglio: "Non c'e': va installato prima di poter aprire le app.",
      },
    ];
  }

  const voci: VoceControllo[] = [];
  const pacchetti = await pacchettiAttesi(requisiti);

  onLine?.("==> Guardo Python, torch e le librerie condivise");
  const probe = await interroga({ python, pacchetti, segnale });

  voci.push({
    id: "python",
    titolo: "L'ambiente Python",
    esito: "ok",
    dettaglio: `C'e' ed e' la versione ${probe.python}.`,
  });

  if (!probe.torch) {
    voci.push({
      id: "torch",
      titolo: "Torch e la scheda video",
      esito: "guasto",
      dettaglio: `Torch non si apre: ${probe.torch_errore ?? "motivo sconosciuto"}.`,
    });
  } else if (probe.cuda) {
    voci.push({
      id: "torch",
      titolo: "Torch e la scheda video",
      esito: "ok",
      dettaglio: `Torch ${probe.torch} usa ${probe.gpu ?? "la scheda video"}.`,
    });
  } else {
    voci.push({
      id: "torch",
      titolo: "Torch e la scheda video",
      esito: "attenzione",
      dettaglio:
        `Torch ${probe.torch} c'e', ma non vede nessuna scheda video: i motori ` +
        "girerebbero sul processore, cioe' decine di volte piu' lenti.",
    });
  }

  voci.push(
    probe.mancanti.length === 0
      ? {
          id: "pacchetti",
          titolo: "Le librerie delle app installate",
          esito: "ok",
          dettaglio: `Ci sono tutte: ${pacchetti.length} pacchetti al loro posto.`,
        }
      : {
          id: "pacchetti",
          titolo: "Le librerie delle app installate",
          esito: "guasto",
          dettaglio: `Ne mancano ${probe.mancanti.length}: ${elenca(probe.mancanti)}.`,
        },
  );

  voci.push(
    probe.rotti.length === 0
      ? {
          id: "apertura",
          titolo: "Le librerie si aprono davvero",
          esito: "ok",
          dettaglio: "Le librerie condivise dai motori si caricano senza errori.",
        }
      : {
          id: "apertura",
          titolo: "Le librerie si aprono davvero",
          esito: "guasto",
          dettaglio:
            `Non si aprono: ${elenca(probe.rotti.map((r) => r.split(":")[0]!))}. ` +
            "E' il segno dei file rimasti a meta' fra due versioni.",
        },
  );

  onLine?.("==> Controllo che le versioni vadano d'accordo");
  voci.push(await coerenza({ uv, python, segnale, onLine }));

  return voci;
}

/** Il verdetto complessivo: il peggiore fra i controlli. */
export function verdetto(voci: VoceControllo[]): EsitoControllo {
  if (voci.some((v) => v.esito === "guasto")) return "guasto";
  if (voci.some((v) => v.esito === "attenzione")) return "attenzione";
  return "ok";
}

/* ------------------------------------------------------------------ dentro */

/**
 * `uv pip check`: le versioni installate soddisfano i vincoli di chi le usa.
 *
 * Esce con codice diverso da zero quando trova qualcosa, e in quel caso le
 * righe utili sono nel `tail` dell'errore — non e' un guasto del comando, e'
 * il comando che sta rispondendo.
 */
async function coerenza(o: {
  uv: string;
  python: string;
  segnale?: AbortSignal;
  onLine?: (riga: string) => void;
}): Promise<VoceControllo> {
  try {
    await capture(o.uv, ["pip", "check", "--python", o.python], {
      segnale: o.segnale,
      onLine: (riga) => o.onLine?.(riga),
      timeoutMs: 5 * 60_000,
    });
    return {
      id: "coerenza",
      titolo: "Le versioni vanno d'accordo",
      esito: "ok",
      dettaglio: "Nessun conflitto fra le librerie installate.",
    };
  } catch (err) {
    if (o.segnale?.aborted) throw err;
    const righe =
      err instanceof CommandError
        ? err.tail.filter((r) => r.trim() && !r.startsWith("Checked"))
        : [String(err)];
    return {
      id: "coerenza",
      titolo: "Le versioni vanno d'accordo",
      esito: "guasto",
      dettaglio: righe.length
        ? righe.slice(0, 4).join(" · ")
        : "Ci sono conflitti fra le librerie.",
    };
  }
}

/** I nomi dei pacchetti dichiarati nei requisiti delle app installate. */
async function pacchettiAttesi(requisiti: string[]): Promise<string[]> {
  const nomi = new Set<string>();
  for (const file of requisiti) {
    let testo: string;
    try {
      testo = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    for (const riga of testo.split(/\r?\n/)) {
      const pulita = riga.trim();
      // Via commenti, righe vuote e opzioni di uv (`--index-url`, `-r altro.txt`).
      if (!pulita || pulita.startsWith("#") || pulita.startsWith("-")) continue;
      const nome = nomePacchetto(pulita);
      if (nome) nomi.add(nome);
    }
  }
  return [...nomi];
}

/**
 * Fa girare il probe e ne legge la risposta.
 *
 * L'elenco dei pacchetti passa da un file e non da riga di comando: sono
 * centinaia di nomi, e su Windows la riga di comando ha un tetto oltre il quale
 * il processo non parte nemmeno.
 */
async function interroga(o: {
  python: string;
  pacchetti: string[];
  segnale?: AbortSignal;
}): Promise<Probe> {
  const cartella = await mkdtemp(join(tmpdir(), "daprod-controllo-"));
  const elenco = join(cartella, "atteso.json");
  try {
    await writeFile(elenco, JSON.stringify({ pacchetti: o.pacchetti, moduli: MODULI_CHIAVE }));
    const stdout = await capture(o.python, ["-c", SCRIPT, elenco], {
      segnale: o.segnale,
      // Importare torch e transformers su un disco lento richiede il suo tempo:
      // un minuto scarso non basterebbe, e il controllo fallirebbe per finta.
      timeoutMs: 10 * 60_000,
    });
    // Le librerie stampano avvisi sul loro conto: la risposta e' l'ultima riga.
    const riga = stdout.trim().split(/\r?\n/).pop() ?? "{}";
    return JSON.parse(riga) as Probe;
  } finally {
    await rm(cartella, { recursive: true, force: true }).catch(() => {});
  }
}

/** Tre nomi e poi "e altri N": un elenco di quaranta non lo legge nessuno. */
function elenca(nomi: string[]): string {
  if (nomi.length <= 3) return nomi.join(", ");
  return `${nomi.slice(0, 3).join(", ")} e altri ${nomi.length - 3}`;
}
