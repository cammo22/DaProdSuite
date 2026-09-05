/**
 * Una frase in italiano, e diventa un lavoro. **Needle 2 al posto giusto.**
 *
 * ## Il terzo passo, quello che mancava
 *
 * `docs/AZIONI-E-MCP.md` lo aveva scritto un anno fa: il catalogo delle azioni
 * (`@daprod/azioni`) e l'MCP erano i primi due passi, e il terzo — «l'AI che
 * usa il programma da sola» — restava aperto perché mancava **la casella di
 * testo**. Un modello che sa trasformare una frase in una chiamata non serve a
 * niente finché non c'è un posto in cui scrivere la frase.
 *
 * Chiesto il 5 settembre 2026: «attiviamo anche il modello needle». Adesso c'è.
 *
 * ## Cos'è Needle 2, e perché ha senso qui
 *
 * [Cactus-Compute/needle2](https://huggingface.co/Cactus-Compute/needle2): un
 * modello da 45 milioni di parametri che fa **una cosa sola** — legge una frase
 * e la trasforma in una chiamata a una delle funzioni che gli hai dichiarato.
 * Non conversa, non scrive testi, non ragiona: risponde con del JSON, e il JSON
 * non può essere malformato perché ogni token è vincolato da una grammatica
 * costruita dai tuoi schemi.
 *
 * Tre numeri che spiegano perché sta bene in questa suite:
 *
 * - **14 MB**, e il modello è dentro il binario: niente pesi da scaricare a
 *   parte, niente runtime, niente rete;
 * - **28 MB di RAM** in tutta la sessione. Non tocca la scheda video, che qui è
 *   la risorsa che si litiga;
 * - **centinaia di token al secondo** anche su un Raspberry Pi. La risposta
 *   arriva prima che uno stacchi il dito dal tasto.
 *
 * Confrontato con quello che c'era: chiedere la stessa cosa a Spark X2.5 4B
 * funziona, ed è quello che si fa quando Needle non c'è — ma vuol dire
 * accendere due giga di modello sulla scheda video per capire «fammi una foto
 * di un faro».
 *
 * ## Le due strade, e perché ce ne sono due
 *
 * 1. **Needle**, se il binario è sul disco. Veloce, gratis, e la risposta è
 *    vincolata dallo schema: non può inventarsi un campo.
 * 2. **Il modello di LM Studio**, se Needle non c'è. Più lento e più costoso,
 *    ma c'è già.
 *
 * Non è ridondanza: è che questa funzione deve funzionare il giorno stesso che
 * si apre la suite, senza scaricare niente, e diventare istantanea per chi
 * accende l'interruttore. Chi non ha né l'uno né l'altro riceve una frase che
 * dice cosa manca, non un errore.
 *
 * ## Cosa NON fa
 *
 * **Non manda in coda niente.** Torna quale azione e con che campi; il sì lo
 * dà chi ha scritto la frase, guardando il modulo riempito. Una casella di
 * testo che fa partire lavori senza far vedere cosa ha capito è il modo più
 * veloce di far generare a qualcuno una cosa che non aveva chiesto.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { AZIONI, schemaDi, type Azione } from "@daprod/azioni";
import { capture, scaricaFile } from "@daprod/runtime";
import { DATA_ROOT } from "./paths";
import { createLogger } from "./logging";
import { chiediAllLlm } from "./llm";

/** Il registro di Needle: quello che scarica, e quando non capisce. */
const log = createLogger("needle");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Dove sta il binario, una volta scaricato. */
function cartella(): string {
  const dove = join(DATA_ROOT, "needle");
  mkdirSync(dove, { recursive: true });
  return dove;
}

function binario(): string {
  return join(cartella(), process.platform === "win32" ? "needle.exe" : "needle");
}

function fileAttrezzi(): string {
  return join(cartella(), "azioni.json");
}

/**
 * Da dove si scarica.
 *
 * Il file è **il modello**: i pesi sono dentro il binario, quindi non c'è un
 * secondo scaricamento e non c'è niente da tenere allineato. Quattordici mega.
 */
const DA_DOVE =
  "https://huggingface.co/Cactus-Compute/needle2/resolve/main/windows-x86_64/needle.exe";

/** Quanto pesa, più o meno: serve a `scaricaFile` per sapere quando ha finito. */
const QUANTO_PESA = 14 * 1024 * 1024;

/**
 * Quanto si aspetta una risposta.
 *
 * Needle risponde in decine di millisecondi. Tre secondi sono un'eternità, e
 * sono lì per il primo avvio — quando Windows deve ancora leggere il file dal
 * disco — non per il modello.
 */
const ATTESA_MS = 5_000;

export interface StatoNeedle {
  /** Il binario c'è su questo computer. */
  ceLAbbiamo: boolean;
  /** Su questo sistema si può usare. Oggi: solo Windows x64. */
  possibile: boolean;
}

export function statoNeedle(): StatoNeedle {
  return {
    ceLAbbiamo: existsSync(binario()),
    // Il binario che scarichiamo è quello di Windows x64. La suite gira lì; il
    // giorno che girasse altrove, qui si aggiunge una riga e un indirizzo.
    possibile: process.platform === "win32" && process.arch === "x64",
  };
}

/**
 * Lo scarica, se non c'è.
 *
 * Torna il motivo se non ci riesce, `null` se è andata. Non solleva: chi
 * chiama è un tasto in un pannello, e un tasto che fa esplodere la suite
 * perché HuggingFace è lento non è un tasto.
 */
export async function scaricaNeedle(): Promise<string | null> {
  if (!statoNeedle().possibile) {
    return "Needle si scarica solo su Windows a 64 bit.";
  }
  if (statoNeedle().ceLAbbiamo) return null;
  try {
    await scaricaFile({ url: DA_DOVE, destinazione: binario(), bytes: QUANTO_PESA });
    // Su Windows non serve, ma non costa niente ed è quello che vuole il giorno
    // che questo file gira altrove.
    try {
      chmodSync(binario(), 0o755);
    } catch {
      // Su Windows i permessi non si toccano così: va bene lo stesso.
    }
    annota("needle: scaricato");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * Gli attrezzi che Needle può chiamare: **le azioni della suite, e nient'altro.**
 *
 * Si riscrive a ogni avvio e non si tiene aggiornato a mano: il catalogo è la
 * verità, e un file che diverge dal catalogo è un modello che propone una cosa
 * che la suite non sa fare.
 *
 * Ci vanno **solo quelle che generano**. Le azioni di servizio — «apri una
 * scheda», «leggi la libreria», «decidi su una richiesta» — sono comandi che
 * uno preme, non cose che uno chiede a parole, e metterle nell'elenco
 * vorrebbe dire che «fammi vedere le foto» diventa una chiamata invece di una
 * scheda che si apre.
 */
function attrezzi(): unknown[] {
  return AZIONI.filter((a: Azione) => a.produce === "file").map((a: Azione) => {
    const schema = schemaDi(a);
    return {
      name: a.id.replace(/\./g, "_"),
      description: a.descrizione,
      parameters: schema,
    };
  });
}

function scriviAttrezzi(): string {
  const dove = fileAttrezzi();
  writeFileSync(dove, `${JSON.stringify(attrezzi(), null, 1)}\n`, "utf8");
  return dove;
}

/** Cosa ha capito: quale azione, con che campi, e quanto ci crede. */
export interface Capito {
  /** L'id dell'azione, con i punti: `genera.immagine`. */
  azione: string;
  valori: Record<string, string>;
  /** Da 0 a 1. Sotto una certa soglia si mostra e non si fa. */
  fiducia: number;
  /** Come ci è arrivato, in una riga. Si mostra: è quello che rende fidabile un no. */
  perche?: string;
}

/**
 * Legge una frase e dice che lavoro sarebbe.
 *
 * Torna `null` quando non ha capito — e «non ho capito» è una risposta buona,
 * non un guasto: Needle rifiuta con una chiamata vuota tutto quello che nessuna
 * azione può servire, ed è esattamente il comportamento che si vuole da una
 * casella in cui la gente scrive quello che le pare.
 */
export async function capisci(frase: string): Promise<Capito | null> {
  const pulita = frase.trim().slice(0, 500);
  if (!pulita) return null;
  if (!statoNeedle().ceLAbbiamo) return null;

  let uscita: string;
  try {
    const risposta = await capture(
      binario(),
      ["--tools", scriviAttrezzi(), "--prompt", pulita],
      { timeoutMs: ATTESA_MS },
    );
    uscita = typeof risposta === "string" ? risposta : String(risposta ?? "");
  } catch (err) {
    annota(`needle: non ha risposto (${err instanceof Error ? err.message : String(err)})`);
    return null;
  }

  return leggiLaRisposta(uscita);
}

/**
 * Tira fuori la chiamata dal JSON che Needle stampa.
 *
 * Sta in una funzione sua, esportata, per una ragione sola: **si può provare
 * senza il binario**. Il formato è quello scritto nella scheda del modello, e
 * una prova che lo verifica costa niente e chiude il buco più probabile — che
 * un giorno cambi il nome di un campo e noi ce ne accorgiamo dal telefono di
 * qualcun altro.
 */
export function leggiLaRisposta(uscita: string): Capito | null {
  let dati: {
    type?: string;
    function_calls?: { name?: string; arguments?: Record<string, unknown> }[];
    confidence?: number;
    reasoning?: string;
  };
  try {
    // Needle stampa un oggetto per riga: si prende l'ultima riga che è JSON.
    const righe = uscita.split(/\r?\n/).filter((r) => r.trim().startsWith("{"));
    const ultima = righe[righe.length - 1];
    if (!ultima) return null;
    dati = JSON.parse(ultima);
  } catch {
    return null;
  }

  const chiamata = dati.function_calls?.[0];
  if (!chiamata?.name) return null;

  // Il nome torna con i trattini bassi, perché nei nomi delle funzioni i punti
  // non ci vanno: si rimettono, e si controlla che l'azione esista davvero.
  const id = chiamata.name.replace(/_/g, ".");
  const azione = AZIONI.find((a: Azione) => a.id === id);
  if (!azione) return null;

  const valori: Record<string, string> = {};
  for (const [chiave, valore] of Object.entries(chiamata.arguments ?? {})) {
    if (valore === null || valore === undefined) continue;
    // Tutto diventa testo: è il formato che il modulo della console e il
    // gateway si aspettano, e convertire in un posto solo evita di scoprire
    // che un numero era una stringa a metà di una generazione.
    valori[chiave] = typeof valore === "string" ? valore : String(valore);
  }

  return {
    azione: id,
    valori,
    fiducia: typeof dati.confidence === "number" ? dati.confidence : 0,
    perche: typeof dati.reasoning === "string" ? dati.reasoning : undefined,
  };
}

/* ------------------------------------------------- l'altra strada: il modello */

/**
 * La stessa domanda, fatta al modello di LM Studio.
 *
 * È il ripiego di [capisci] quando Needle non c'è, e non è una copia svilita:
 * Spark X2.5 4B — il modello che questa suite consiglia dalla 0.9.0 — è
 * addestrato apposta sulle chiamate a strumenti, e con lo schema imposto non
 * può rispondere di fantasia. Costa di più: due giga di modello acceso sulla
 * scheda video per capire una frase di dieci parole.
 *
 * **Perché non si prova a indovinare da soli.** Perché «fammi un video di una
 * barca al tramonto, dieci secondi» richiede di capire che «dieci secondi» è la
 * durata e non parte della scena. Le regole a mano per farlo sono venti, e la
 * ventunesima arriva il giorno che qualcuno scrive una frase che non avevamo
 * previsto.
 */
export async function capisciColModello(frase: string): Promise<Capito | null> {
  const pulita = frase.trim().slice(0, 500);
  if (!pulita) return null;

  const elenco = AZIONI.filter((a: Azione) => a.produce === "file");
  const descrizioni = elenco
    .map((a: Azione) => {
      const campi = a.campi
        .map((c) => `${c.nome}${c.obbligatorio ? "*" : ""}: ${c.etichetta}`)
        .join("; ");
      return `- ${a.id} — ${a.titolo}. Campi: ${campi}`;
    })
    .join("\n");

  const esito = await chiediAllLlm({
    sistema:
      "Sei il centralinista di una suite che genera immagini, video, musica e voce. " +
      "Leggi una frase in italiano e dici QUALE azione serve e con che campi. " +
      "Non inventare campi che non sono nell'elenco. Se nessuna azione serve, " +
      'rispondi con azione vuota. I valori dei campi restano in italiano, come li ha scritti la persona.\n\n' +
      `Le azioni:\n${descrizioni}`,
    utente: pulita,
    nomeSchema: "capito",
    // Lo schema è la parte che conta: senza, un modello piccolo risponde con
    // una frase invece che con dei campi, e la casella non funziona mai.
    schema: {
      type: "object",
      properties: {
        azione: { type: "string", enum: [...elenco.map((a: Azione) => a.id), ""] },
        valori: { type: "object", additionalProperties: { type: "string" } },
        perche: { type: "string" },
      },
      required: ["azione", "valori", "perche"],
      additionalProperties: false,
    },
    // Non deve ragionare: deve smistare. Il ragionamento qui costa secondi e
    // non cambia la risposta.
    pensa: false,
  });

  if (!esito.ok) return null;
  try {
    const letto = JSON.parse(esito.testo) as {
      azione?: string;
      valori?: Record<string, string>;
      perche?: string;
    };
    if (!letto.azione) return null;
    if (!AZIONI.some((a: Azione) => a.id === letto.azione)) return null;
    return {
      azione: letto.azione,
      valori: letto.valori ?? {},
      // Il modello non dà una confidenza calibrata come Needle: si dichiara
      // media, e chi mostra la risposta fa vedere comunque cosa ha capito.
      fiducia: 0.6,
      perche: letto.perche,
    };
  } catch {
    return null;
  }
}

/**
 * Capisce con quello che c'è: prima Needle, poi il modello.
 *
 * È la funzione che il gateway chiama. Torna anche **chi** ha risposto, perché
 * è un'informazione che chi guarda merita: «l'ho capito io in due millisecondi»
 * e «l'ho chiesto al modello, che ci ha messo otto secondi» sono due cose
 * diverse, e la seconda spiega perché l'attesa c'è stata.
 */
export async function capisciComunque(
  frase: string,
): Promise<(Capito & { da: "needle" | "modello" }) | null> {
  const veloce = await capisci(frase);
  if (veloce) return { ...veloce, da: "needle" };
  const lento = await capisciColModello(frase);
  return lento ? { ...lento, da: "modello" } : null;
}
