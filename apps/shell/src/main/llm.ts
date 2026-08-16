/**
 * Il modello che scrive: uno per tutta la suite.
 *
 * Non è "il cervello del Companion" con l'aggiunta di qualche uso in giro: è il
 * contrario. Un LLM serve **a tutte** le app, e ognuna gli chiede la cosa che sa
 * chiedere — a DaProdMusica finire un testo abbozzato, a DaProdFoto trasformare
 * due parole in una descrizione che il modello di immagini capisce, a
 * DaProdCinema spezzare un'idea in scene. Se ognuna se lo tenesse per sé
 * avremmo quattro modelli in memoria per fare la stessa cosa.
 *
 * **Lo tiene acceso LM Studio, non noi.** È la decisione presa per il Companion
 * e vale qui: LM Studio scarica i modelli, li quantizza, li tiene caldi e li
 * offre su un'API compatibile OpenAI a `127.0.0.1:1234`. Rifare quel lavoro
 * dentro la suite vorrebbe dire un secondo runtime da mantenere per sempre.
 *
 * Il modello consigliato è **Bonsai 27B** (`prism-ml/bonsai-27b`): ternario, sta
 * in 4 GB, ha 262K di contesto e ragiona prima di rispondere. Ma qui dentro non
 * c'è niente che lo pretenda: si parla con quello che LM Studio ha caricato.
 */

import type { EsitoLlm, ModelloLlm, StatoLlm } from "@daprod/ipc";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { capture } from "@daprod/runtime";

/** Dove ascolta LM Studio quando accendi il suo server locale. */
const BASE = "http://127.0.0.1:1234/v1";

/** Il modello che consigliamo, e che l'hub dice di scaricare se manca. */
export const MODELLO_CONSIGLIATO = "prism-ml/bonsai-27b";

/**
 * Come va caricato in LM Studio, e perché questi numeri.
 *
 * **64K di contesto, non 262K.** Bonsai arriva a 262K, ma il contesto si paga
 * in memoria: la cache delle chiavi cresce con la lunghezza, e ogni GB che
 * prende è un GB che non sta ai pesi. 64K sono già dieci volte quello che serve
 * per finire il testo di una canzone o descrivere un video, e lasciano posto
 * perché il modello stia **tutto in GPU** — che è la differenza fra una risposta
 * in dieci secondi e una in due minuti.
 *
 * **In GPU quello che conta, in RAM il resto.** Ternario, Bonsai sta in ~4 GB:
 * su una scheda da 8 ci sta intero, e vale la pena spingere l'offload GPU al
 * massimo che regge senza far uscire dalla VRAM il modello di immagini o di
 * musica, se stanno lavorando anche loro. Quando non ci sta tutto, LM Studio
 * tiene in RAM gli strati in fondo: rallenta, non rompe.
 *
 * Sono istruzioni per LM Studio, non impostazioni nostre: il caricamento lo
 * decide lui, e la suite non gli mette le mani in tasca.
 */
export const CONTESTO_CONSIGLIATO = 65_536;

/**
 * Chi risponde e con cosa.
 *
 * Non solleva mai: un LLM spento è la condizione normale di chi non l'ha ancora
 * acceso, e ogni app deve poter mostrare "accendi LM Studio" invece di un
 * errore rosso.
 */
export async function statoLlm(): Promise<StatoLlm> {
  try {
    // `/api/v0` è l'API di LM Studio, non quella compatibile OpenAI: è l'unica
    // che dice **chi è caricato in memoria** e non solo chi è installato. La
    // differenza è tutta lì: un modello installato non occupa niente, uno
    // caricato tiene 4-5 GB di VRAM anche mentre generi immagini.
    const risposta = await fetch("http://127.0.0.1:1234/api/v0/models", {
      signal: AbortSignal.timeout(2500),
    });
    if (!risposta.ok) {
      return { acceso: false, modelli: [], disponibili: [], motivo: `LM Studio ha risposto ${risposta.status}.` };
    }

    const dati = (await risposta.json()) as {
      data?: { id: string; type?: string; state?: string; max_context_length?: number }[];
    };

    const disponibili: ModelloLlm[] = (dati.data ?? [])
      // Gli embedding non scrivono niente: nell'elenco sarebbero solo una voce
      // che se cliccata non fa quello che ci si aspetta.
      .filter((m) => m.type !== "embeddings")
      .map((m) => ({
        id: m.id,
        caricato: m.state === "loaded",
        contestoMax: m.max_context_length ?? 0,
      }));

    /**
     * Chi è **davvero** in memoria, chiesto a `lms ps`.
     *
     * Il campo `state` dell'API non è affidabile: subito dopo uno scarico
     * riuscito diceva ancora "loaded", e un momento dopo il contrario. `lms ps`
     * è la vista di LM Studio su sé stesso, e quando i due si contraddicono ha
     * ragione lui. Se il comando non c'è si ripiega sull'API: meglio un dato
     * incerto che nessun dato.
     */
    const veri = await caricatiSecondoLms();
    if (veri) {
      for (const m of disponibili) m.caricato = veri.includes(m.id);
    }
    const caricati = disponibili.filter((m) => m.caricato).map((m) => m.id);

    return {
      acceso: true,
      // `modelli` resta quello che si può usare adesso: chi chiede una risposta
      // guarda questo, e LM Studio carica da sé quello che gli si chiede.
      modelli: disponibili.map((m) => m.id),
      disponibili,
      caricati,
      motivo: disponibili.length ? undefined : "LM Studio è acceso ma non ha nessun modello installato.",
    };
  } catch {
    return {
      acceso: false,
      modelli: [],
      disponibili: [],
      motivo: "LM Studio non risponde su 127.0.0.1:1234. Aprilo e accendi il server locale.",
    };
  }
}

/* ------------------------------------------------- caricare e scaricare ---- */

/**
 * Il comando `lms`, che LM Studio installa con sé.
 *
 * L'API su 1234 sa dire chi è caricato ma non sa caricarlo o scaricarlo a
 * comando: quello lo fa il suo strumento da riga di comando. Se non c'è, la
 * suite mostra lo stato e basta — meglio meno bottoni che bottoni che mentono.
 */
function lms(): string | null {
  const suo = join(homedir(), ".lmstudio", "bin", "lms.exe");
  if (existsSync(suo)) return suo;
  return null;
}

export const puoiCaricare = (): boolean => lms() !== null;

/**
 * Gli id che `lms ps` elenca come in memoria, o null se il comando non c'è.
 *
 * Si legge l'uscita così com'è invece di analizzarla colonna per colonna: le
 * tabelle da riga di comando cambiano forma fra una versione e l'altra, mentre
 * il nome del modello dentro la riga c'è sempre.
 */
async function caricatiSecondoLms(): Promise<string[] | null> {
  const exe = lms();
  if (!exe) return null;
  try {
    const uscita = await capture(exe, ["ps"]);
    return uscita
      .split(/\r?\n/)
      .filter((riga) => riga.trim() && !/^IDENTIFIER/i.test(riga.trim()))
      .map((riga) => riga.trim().split(/\s{2,}/)[0]!.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Carica un modello, con il contesto chiesto.
 *
 * `--gpu max` è il punto: quello che ci sta va in GPU, il resto in RAM. Su una
 * scheda da 8 GB Bonsai ternario ci sta intero, ed è la differenza fra una
 * risposta in dieci secondi e una in due minuti.
 */
export async function caricaModello(id: string, contesto: number): Promise<string | null> {
  const exe = lms();
  if (!exe) return "Non trovo il comando di LM Studio: caricalo dalla sua finestra.";
  try {
    await capture(exe, [
      "load",
      id,
      "--context-length",
      String(contesto),
      "--gpu",
      "max",
      "--yes",
    ]);
    nostro = id;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export async function scaricaModello(id: string): Promise<string | null> {
  const exe = lms();
  if (!exe) return "Non trovo il comando di LM Studio: scaricalo dalla sua finestra.";
  try {
    await capture(exe, ["unload", id]);
    if (nostro === id) nostro = null;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/* --------------------------------------------------- spegnerlo da soli ----- */

/** Il modello che abbiamo caricato noi: solo quello ci prendiamo la libertà di spegnere. */
let nostro: string | null = null;
let timerScarico: NodeJS.Timeout | null = null;

/**
 * Quanto aspettare, finita una risposta, prima di liberare la memoria.
 *
 * Non zero: quando si sta lavorando le domande arrivano a raffica — finisci il
 * testo, cambia una strofa, rifallo — e ricaricare quattro GB a ogni giro
 * costerebbe più di quello che fa risparmiare. Due minuti sono abbastanza per
 * non accorgersene e poco per non tenere occupata la scheda mentre si genera
 * un'immagine.
 */
const ATTESA_SCARICO_MS = 45_000;

/**
 * Libera la memoria **adesso**, senza aspettare il timer.
 *
 * La chiama un'app un attimo prima di far partire una generazione pesante, ed è
 * il punto di tutto il meccanismo: scrivere il testo con Bonsai e poi premere
 * Genera succede nel giro di pochi secondi: con la sola attesa, il modello
 * musicale trovava quattro GB e mezzo già occupati dal modello che aveva appena
 * finito di scrivere. Su una scheda da 8 GB non è un dettaglio, è la differenza
 * fra generare e non generare.
 */
export async function liberaMemoriaLlm(): Promise<void> {
  if (timerScarico) clearTimeout(timerScarico);

  // **Tutto quello che è in memoria, non solo quello che abbiamo caricato noi.**
  // Chi preme Genera vuole la scheda libera, e non gliene importa — giustamente —
  // di chi ce l'aveva messo: un modello acceso a mano in LM Studio occupa
  // esattamente gli stessi quattro GB.
  const caricati = (await caricatiSecondoLms()) ?? (nostro ? [nostro] : []);
  for (const id of caricati) await scaricaModello(id);
  nostro = null;
}

function programmaScarico(): void {
  if (timerScarico) clearTimeout(timerScarico);
  if (!nostro) return;
  timerScarico = setTimeout(() => {
    const id = nostro;
    if (id) void scaricaModello(id);
  }, ATTESA_SCARICO_MS);
  // Non deve tenere sveglia la suite alla chiusura.
  timerScarico.unref?.();
}

/**
 * Alla chiusura della suite: quello che abbiamo caricato noi lo spegniamo noi.
 *
 * Senza, chiudere la suite lasciava quattro GB in memoria a LM Studio, e
 * l'utente si ritrovava la scheda occupata da un programma che credeva chiuso.
 */
export async function spegniSeNostro(): Promise<void> {
  if (timerScarico) clearTimeout(timerScarico);
  if (nostro) await scaricaModello(nostro);
}

export interface DomandaLlm {
  /** Chi deve essere il modello mentre risponde. */
  sistema: string;
  /** Cosa gli si chiede. */
  utente: string;
  /**
   * La forma che la risposta deve avere, come JSON Schema.
   *
   * Non è un vezzo: quando la risposta deve riempire dei campi
   * dell'interfaccia, il testo libero va interpretato, e interpretare male vuol
   * dire scrivere il titolo dentro il testo del brano. Con lo schema il modello
   * **non può** rispondere in un altro modo.
   *
   * LM Studio vuole `json_schema` e rifiuta il generico `json_object` con un
   * 400 — che è esattamente l'errore preso la prima volta.
   */
  schema?: Record<string, unknown>;
  /** Come si chiama quella forma. Serve solo a LM Studio per i suoi log. */
  nomeSchema?: string;
  /** Oltre questo, meglio dire che ci sta mettendo troppo. */
  timeoutMs?: number;
}

/**
 * Una domanda sola, una risposta sola.
 *
 * Niente conversazione: le app chiedono cose finite ("finiscimi questo testo"),
 * e una cronologia da mantenere sarebbe stato in più per nessun vantaggio. Il
 * giorno che serve una chat vera — DaProdCinema la vuole — si aggiunge accanto,
 * non al posto di questa.
 */
export async function chiediAllLlm(domanda: DomandaLlm): Promise<EsitoLlm> {
  const stato = await statoLlm();
  if (!stato.acceso || stato.modelli.length === 0) {
    return { ok: false, testo: "", motivo: stato.motivo ?? "LM Studio non è disponibile." };
  }

  // Bonsai se c'è, altrimenti il primo che LM Studio offre. Non è un capriccio:
  // l'elenco arriva in ordine alfabetico o di installazione, e prendere il primo
  // vuol dire farsi scrivere una canzone dal modello di embedding.
  const scelto = stato.modelli.includes(MODELLO_CONSIGLIATO)
    ? MODELLO_CONSIGLIATO
    : (stato.modelli[0] ?? MODELLO_CONSIGLIATO);

  // Se lo carica LM Studio su nostra richiesta, siamo noi a doverlo spegnere.
  if (!stato.caricati?.includes(scelto)) nostro = scelto;
  if (timerScarico) clearTimeout(timerScarico);

  const corpo = {
    model: scelto,
    messages: [
      { role: "system", content: domanda.sistema },
      { role: "user", content: domanda.utente },
    ],
    temperature: 0.8,
    /**
     * **Lo lasciamo pensare.** Bonsai ragiona prima di rispondere, e con 27
     * miliardi di parametri quantizzati a un filo è il ragionamento a fare la
     * differenza fra una canzone e quattro rime a caso. Costa un minuto in più,
     * e va bene così.
     *
     * Il pensiero però **conta nel budget**: spegnendolo la prima volta si era
     * risolto un problema (risposta vuota) creandone un altro (risposta
     * scadente). La strada giusta è tenerlo acceso e dargli spazio — sotto —
     * più il ripiego che legge la risposta dal campo del ragionamento se il
     * modello la lascia lì.
     */
    chat_template_kwargs: { enable_thinking: true },
    // Largo per il ragionamento **e** per la risposta: con 64K di contesto
    // questi sono un sesto del totale, e il resto resta per la domanda.
    max_tokens: 10_000,
    ...(domanda.schema
      ? {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: domanda.nomeSchema ?? "risposta",
              strict: true,
              schema: domanda.schema,
            },
          },
        }
      : {}),
  };

  try {
    const risposta = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      // Un 27B che ragiona su una macchina con 8 GB di VRAM può metterci minuti:
      // il limite è generoso di proposito, e chi chiama mostra che sta lavorando.
      signal: AbortSignal.timeout(domanda.timeoutMs ?? 5 * 60_000),
    });

    if (!risposta.ok) {
      return {
        ok: false,
        testo: "",
        motivo: `LM Studio ha risposto ${risposta.status}: ${(await risposta.text()).slice(0, 200)}`,
      };
    }

    const dati = (await risposta.json()) as {
      choices?: {
        finish_reason?: string;
        message?: { content?: string; reasoning_content?: string };
      }[];
    };
    const scelta = dati.choices?.[0];
    // Se il modello ha pensato lo stesso e la risposta è finita nel pensiero, si
    // guarda lì dentro invece di dire "a vuoto": la risposta c'è, sta solo in un
    // campo che non è il suo.
    const testo = scelta?.message?.content?.trim()
      ? scelta.message.content
      : (scelta?.message?.reasoning_content ?? "");

    if (!testo.trim()) {
      const finito = scelta?.finish_reason;
      return {
        ok: false,
        testo: "",
        motivo:
          finito === "length"
            ? "Il modello ha finito lo spazio prima di rispondere: in LM Studio spegni il ragionamento o carica un modello più piccolo."
            : "Il modello ha risposto, ma a vuoto.",
      };
    }
    // Finito: la memoria si libera da sé fra poco, se nel frattempo non arriva
    // un'altra domanda.
    programmaScarico();
    return { ok: true, testo: ripulisci(testo), modello: scelto };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      testo: "",
      motivo: motivo.includes("timed out")
        ? "Il modello ci sta mettendo troppo: prova con un modello più piccolo in LM Studio."
        : motivo,
    };
  }
}

/**
 * Toglie quello che i modelli che "ragionano" si portano dietro.
 *
 * Bonsai e i suoi parenti scrivono il ragionamento fra `<think>` e `</think>`
 * prima della risposta vera. È roba loro: all'app serve quello che viene dopo,
 * e lasciarglielo dentro vorrebbe dire ritrovarsi il monologo del modello nel
 * testo di una canzone.
 */
function ripulisci(testo: string): string {
  return testo
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*|\s*```$/g, "")
    .trim();
}
