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

import type { EsitoLlm, StatoLlm } from "@daprod/ipc";

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
    const risposta = await fetch(`${BASE}/models`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!risposta.ok) {
      return { acceso: false, modelli: [], motivo: `LM Studio ha risposto ${risposta.status}.` };
    }

    const dati = (await risposta.json()) as { data?: { id: string }[] };
    const modelli = (dati.data ?? []).map((m) => m.id);
    return {
      acceso: true,
      modelli,
      // "Nessun modello caricato" è diverso da "LM Studio spento", e all'utente
      // servono due frasi diverse per due gesti diversi.
      motivo: modelli.length ? undefined : "LM Studio è acceso ma non ha nessun modello caricato.",
    };
  } catch {
    return {
      acceso: false,
      modelli: [],
      motivo: "LM Studio non risponde su 127.0.0.1:1234. Aprilo e accendi il server locale.",
    };
  }
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
    : stato.modelli[0];

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
