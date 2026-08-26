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
import { request } from "node:http";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { capture } from "@daprod/runtime";
import { colTurno, turno, type Corsia } from "./turno";

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
 * Quanto si aspetta `lms`, prima di considerarlo piantato.
 *
 * **Non sono numeri di prudenza, sono la toppa a un guasto vero.** `capture`
 * senza `timeoutMs` aspetta per sempre, e queste tre chiamate stanno *dentro* al
 * percorso di «Genera» di DaProdMusica, DaProdFoto e DaProdCinema: se `lms` non
 * risponde — LM Studio chiuso a metà, il suo servizio che non riparte, il
 * comando che aspetta qualcosa in una console che non c'è — il tasto Genera
 * resta premuto e non succede mai niente. Nessun errore, nessun lavoro in coda,
 * nessun modo di accorgersene: «quando mando a generare non va mai avanti».
 *
 * Scaduto il tempo, `run` ammazza il processo e la promessa si rompe: chi
 * chiama prende l'errore, lo ignora e va avanti a generare. Al massimo si genera
 * con la scheda meno libera del previsto, che è molto meglio di non generare.
 *
 * `ps` è una domanda e deve costare poco; `unload` scrive e può prendersi
 * qualche secondo in più; `load` legge dei GB dal disco e ha un tempo suo.
 */
const ATTESA_PS_MS = 8_000;
const ATTESA_UNLOAD_MS = 30_000;
const ATTESA_LOAD_MS = 10 * 60_000;

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
    const uscita = await capture(exe, ["ps"], { timeoutMs: ATTESA_PS_MS });
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
    await capture(
      exe,
      ["load", id, "--context-length", String(contesto), "--gpu", "max", "--yes"],
      { timeoutMs: ATTESA_LOAD_MS },
    );
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
    await capture(exe, ["unload", id], { timeoutMs: ATTESA_UNLOAD_MS });
    if (nostro === id) nostro = null;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/* --------------------------------------------------- spegnerlo da soli ----- */

/** L'ultimo modello a cui abbiamo chiesto qualcosa. Serve solo alla chiusura. */
let nostro: string | null = null;

/**
 * Quante domande stanno aspettando una risposta **adesso**.
 *
 * Serve a una cosa sola, ed è importante: non togliere i pesi da sotto a una
 * risposta che sta ancora arrivando. Due app che chiedono insieme — la Storia
 * che scrive le scene e il Companion che risponde — sono due domande in volo, e
 * la memoria si libera quando è finita l'ultima, non la prima.
 */
let inVolo = 0;

/**
 * Libera la memoria **adesso**, senza aspettare niente.
 *
 * La chiama un'app un attimo prima di far partire una generazione pesante, e la
 * chiama la suite da sé alla fine di ogni risposta. È il punto di tutto il
 * meccanismo: scrivere il testo con Bonsai e poi premere Genera succede nel giro
 * di pochi secondi, e senza questo il modello musicale trovava quattro GB e
 * mezzo già occupati dal modello che aveva appena finito di scrivere. Su una
 * scheda da 8 GB non è un dettaglio, è la differenza fra generare e non generare.
 *
 * **Tutto quello che è in memoria, non solo quello che abbiamo caricato noi.**
 * Chi preme Genera vuole la scheda libera, e non gliene importa — giustamente —
 * di chi ce l'aveva messo: un modello acceso a mano in LM Studio occupa
 * esattamente gli stessi quattro GB.
 */
export async function liberaMemoriaLlm(): Promise<void> {
  const caricati = (await caricatiSecondoLms()) ?? (nostro ? [nostro] : []);
  for (const id of caricati) await scaricaModello(id);
  nostro = null;
}

/**
 * A risposta finita, la memoria torna libera. **Ogni volta.**
 *
 * Vale per tutte le app che passano di qui — Cinema, Musica, Foto, Dream — e
 * **non** per il Companion, che parla a LM Studio per conto suo dal suo Python.
 * Non è una dimenticanza: lui sta conversando, e scaricare il modello dopo ogni
 * battuta vorrebbe dire ricaricare quattro GB fra una frase e l'altra. Il suo
 * modello lo libera comunque `liberaMemoriaLlm()`, che è quello che ogni app
 * chiama un attimo prima di generare: da lì in poi la scheda è sgombra per
 * tutti.
 *
 * Fino alla 0.5.2 qui c'era un timer da quarantacinque secondi, con una ragione
 * scritta: chi lavora fa domande a raffica, e ricaricare quattro GB a ogni giro
 * costa più di quello che fa risparmiare. Sul PC vero quella ragione non ha
 * retto. Il modello che scrive e il modello che genera vivono sulla **stessa**
 * scheda da 8 GB, e quei quarantacinque secondi sono esattamente la finestra in
 * cui uno legge le scene appena scritte e preme Genera: la generazione partiva
 * con quattro GB e mezzo già presi, e falliva a metà nel VAE.
 *
 * Il costo c'è ed è onesto dirlo: due domande di fila ricaricano il modello, e
 * su un 27B sono decine di secondi. Il guadagno è che una generazione non muore
 * mai perché qualcuno aveva scritto qualcosa un minuto prima.
 *
 * Non tocca niente se un'altra domanda è ancora in volo.
 */
async function liberaDopoLaRisposta(): Promise<void> {
  if (inVolo > 0) return;
  try {
    await liberaMemoriaLlm();
  } catch {
    // LM Studio chiuso a metà, `lms` che non risponde: la memoria resta
    // occupata, ma la risposta è già arrivata a chi l'aveva chiesta e non si
    // rovina per un comando che non è andato.
  }
}

/**
 * Alla chiusura della suite: quello che abbiamo caricato noi lo spegniamo noi.
 *
 * Senza, chiudere la suite lasciava quattro GB in memoria a LM Studio, e
 * l'utente si ritrovava la scheda occupata da un programma che credeva chiuso.
 */
export async function spegniSeNostro(): Promise<void> {
  if (nostro) await scaricaModello(nostro);
}

/**
 * Una POST JSON fatta con `node:http`, non con `fetch`.
 *
 * **Misurato il 17 agosto 2026**: la stessa domanda, con il motore delle
 * immagini acceso, ci metteva 254 secondi passando da `fetch` e 148 passando da
 * qui. Non e' la differenza che conta di piu' — quella la fa la macchina
 * occupata, vedi `scripts/prova-llm.mjs` — ma e' un fattore quasi due per una
 * riga di codice, e toglie di mezzo lo stack di rete di Chromium da una
 * chiamata che va a 127.0.0.1 e non ha niente da guadagnarci.
 *
 * Qui il giro non c'e': si parla al socket e basta.
 */
function postJson(url: string, corpo: unknown, timeoutMs: number): Promise<{ status: number; testo: string }> {
  return new Promise((risolvi, rifiuta) => {
    const dati = Buffer.from(JSON.stringify(corpo), "utf8");
    const indirizzo = new URL(url);

    const richiesta = request(
      {
        hostname: indirizzo.hostname,
        port: indirizzo.port,
        path: indirizzo.pathname + indirizzo.search,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": dati.length },
        timeout: timeoutMs,
      },
      (risposta) => {
        const pezzi: Buffer[] = [];
        risposta.on("data", (p: Buffer) => pezzi.push(p));
        risposta.on("end", () =>
          risolvi({ status: risposta.statusCode ?? 0, testo: Buffer.concat(pezzi).toString("utf8") }),
        );
      },
    );

    richiesta.on("timeout", () => {
      richiesta.destroy(new Error("timed out"));
    });
    richiesta.on("error", rifiuta);
    richiesta.end(dati);
  });
}

/** Un pezzo di risposta mentre arriva: o testo vero, o ragionamento. */
export interface PezzoLlm {
  testo?: string;
  pensiero?: string;
}

/**
 * La stessa POST, ma letta **mentre arriva**.
 *
 * LM Studio con `stream: true` risponde in SSE: righe `data: {...}`, una per
 * token o giù di lì, e `data: [DONE]` alla fine. Si legge il socket a pezzi, si
 * spezza sulle righe vuote e si passa fuori quello che c'è dentro.
 *
 * Serve a una cosa che dal PC di Cammo era stata chiesta chiaramente: quando un
 * modello sta pensando **si deve vedere**, e si devono vedere i token uscire.
 * Su un 27B che ragiona per due minuti, una finestra ferma e un cerchietto che
 * gira dicono la stessa identica cosa — cioè niente.
 */
function postJsonStream(
  url: string,
  corpo: unknown,
  timeoutMs: number,
  onPezzo: (pezzo: PezzoLlm) => void,
): Promise<{ status: number; testo: string; pensiero: string; motivoFine: string }> {
  return new Promise((risolvi, rifiuta) => {
    const dati = Buffer.from(JSON.stringify(corpo), "utf8");
    const indirizzo = new URL(url);

    const richiesta = request(
      {
        hostname: indirizzo.hostname,
        port: indirizzo.port,
        path: indirizzo.pathname + indirizzo.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": dati.length,
          Accept: "text/event-stream",
        },
        timeout: timeoutMs,
      },
      (risposta) => {
        const stato = risposta.statusCode ?? 0;

        // Un errore non arriva in streaming: arriva come un JSON solo, e va
        // letto tutto insieme per poterlo raccontare.
        if (stato < 200 || stato >= 300) {
          const pezzi: Buffer[] = [];
          risposta.on("data", (p: Buffer) => pezzi.push(p));
          risposta.on("end", () =>
            risolvi({
              status: stato,
              testo: Buffer.concat(pezzi).toString("utf8"),
              pensiero: "",
              motivoFine: "",
            }),
          );
          return;
        }

        let avanzo = "";
        let testo = "";
        let pensiero = "";
        let motivoFine = "";

        risposta.setEncoding("utf8");
        risposta.on("data", (chunk: string) => {
          avanzo += chunk;
          // Le righe intere si consumano; l'ultima, che può essere a metà,
          // resta nell'avanzo e si completa col pezzo dopo.
          let taglio = avanzo.indexOf("\n");
          while (taglio >= 0) {
            const riga = avanzo.slice(0, taglio).trim();
            avanzo = avanzo.slice(taglio + 1);
            taglio = avanzo.indexOf("\n");
            if (!riga.startsWith("data:")) continue;

            const carico = riga.slice(5).trim();
            if (!carico || carico === "[DONE]") continue;

            try {
              const evento = JSON.parse(carico) as {
                choices?: {
                  finish_reason?: string | null;
                  delta?: { content?: string; reasoning_content?: string };
                }[];
              };
              const delta = evento.choices?.[0]?.delta;
              if (evento.choices?.[0]?.finish_reason) {
                motivoFine = evento.choices[0].finish_reason ?? "";
              }
              if (delta?.content) {
                testo += delta.content;
                onPezzo({ testo: delta.content });
              }
              if (delta?.reasoning_content) {
                pensiero += delta.reasoning_content;
                onPezzo({ pensiero: delta.reasoning_content });
              }
            } catch {
              // Una riga che non è JSON: LM Studio ogni tanto ci mette dei
              // commenti di tenuta. Si salta, non è un errore.
            }
          }
        });
        risposta.on("end", () => risolvi({ status: stato, testo, pensiero, motivoFine }));
      },
    );

    richiesta.on("timeout", () => {
      richiesta.destroy(new Error("timed out"));
    });
    richiesta.on("error", rifiuta);
    richiesta.end(dati);
  });
}

/** Un'immagine o un audio dati in pasto al modello insieme alla domanda. */
export interface AllegatoLlm {
  /** `immagine` o `audio`: decide in che forma il modello se lo aspetta. */
  genere: "immagine" | "audio";
  /** Il contenuto in base64, senza il prefisso `data:`. */
  base64: string;
  /** Il tipo MIME (`image/png`, `audio/wav`…), per costruire il data URL. */
  mime: string;
  /** Come si chiama, per poterne parlare nel testo. */
  nome?: string;
}

export interface DomandaLlm {
  /** Il modello scelto dall'app, se ne ha uno. Ignorato se LM Studio non ce l'ha. */
  modello?: string;
  /** Chi deve essere il modello mentre risponde. */
  sistema: string;
  /** Cosa gli si chiede. */
  utente: string;
  /**
   * Le immagini e gli audio da fargli **vedere** e **sentire**.
   *
   * Vanno nel messaggio come parti separate, che è la forma che i modelli
   * multimodali si aspettano (`image_url` per le immagini, `input_audio` per
   * l'audio). Un modello che non è multimodale non li capisce: LM Studio
   * risponde con un errore, e quell'errore arriva scritto a chi ha premuto,
   * invece di una risposta che parla di un'immagine mai vista.
   */
  allegati?: AllegatoLlm[];
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
  /**
   * Se lasciarlo ragionare prima di rispondere. Acceso di suo.
   *
   * Per una canzone il ragionamento è metà del risultato e vale il minuto che
   * costa; per allargare la descrizione di un'immagine è un minuto buttato.
   *
   * **Attenzione a cosa promette.** Misurato il 17 agosto 2026 con lfm2.5:
   * spegnendolo il modello ha ragionato lo stesso (743 token di pensiero), e
   * quello che cambia davvero è il tetto — 900 token invece di 10.000 — cioè il
   * caso peggiore, non il caso normale. Chi lo spegne guadagna una rete, non
   * per forza velocità: dipende da quanto il modello rispetta il suo template.
   */
  pensa?: boolean;
  /** Oltre questo, meglio dire che ci sta mettendo troppo. */
  timeoutMs?: number;
  /**
   * In che corsia mettersi, mentre si aspetta la macchina.
   *
   * Chi sta al computer passa davanti: se apre DaProdCinema e chiede al modello
   * di scrivergli tre scene, non deve aspettare che finisca il video che sta
   * generando per un telefono. Chi arriva da fuori si mette in fila.
   */
  corsia?: Corsia;
  /** Chi ha chiesto, per il pannello. Vuoto vuol dire: la suite stessa. */
  chi?: string;
  /**
   * Il turno ce l'ha già chi chiama: non se ne prende un altro.
   *
   * Serve alla chiacchierata dal telefono, che tiene la macchina per tutta la
   * sessione: se ogni frase si rimettesse in fila da capo, il modello verrebbe
   * scaricato e ricaricato fra una battuta e l'altra — quattro GB per volta.
   */
  turnoGiaPreso?: boolean;
}

/**
 * Chi risponde, e con quale corpo di richiesta.
 *
 * Lo stesso conto serve alla domanda normale e a quella in diretta, ed era
 * l'unico pezzo che avrebbe potuto divergere fra le due: la regola di chi
 * risponde è una sola e sta qui.
 */
async function preparaDomanda(
  domanda: DomandaLlm,
  inDiretta: boolean,
): Promise<{ errore: string } | { scelto: string; corpo: Record<string, unknown> }> {
  const stato = await statoLlm();
  if (!stato.acceso || stato.modelli.length === 0) {
    return { errore: stato.motivo ?? "LM Studio non è disponibile." };
  }

  /**
   * Chi risponde, in ordine di chi ha più diritto di decidere.
   *
   * 1. **Quello scelto nel menu dell'app.** Le app mostrano il selettore in
   *    cima: se ci metti un modello, deve rispondere quello. Punto.
   * 2. **Quello che in questo momento è in memoria.** È la regola che mancava,
   *    e costava caro: la suite chiedeva sempre a Bonsai 27B anche quando in
   *    LM Studio ne avevi caricato un altro. Bonsai non era caricato, quindi
   *    LM Studio se lo caricava sul momento — un 27B, minuti — e nel frattempo
   *    l'app sembrava piantata. Chiedere a chi è già acceso è più veloce **e**
   *    è quello che l'utente si aspetta: ha caricato quello per usarlo.
   * 3. Bonsai, se installato: è il consigliato e sa fare questo mestiere.
   * 4. Il primo della lista, che è meglio di niente.
   *
   * Un id che LM Studio non ha si ignora invece di far fallire la domanda.
   */
  const caricati = (stato.caricati ?? []).filter((m) => stato.modelli.includes(m));
  const scelto =
    (domanda.modello && stato.modelli.includes(domanda.modello) ? domanda.modello : null) ??
    caricati[0] ??
    (stato.modelli.includes(MODELLO_CONSIGLIATO) ? MODELLO_CONSIGLIATO : null) ??
    stato.modelli[0] ??
    MODELLO_CONSIGLIATO;

  nostro = scelto;

  /**
   * Il messaggio dell'utente: testo solo, o testo più quello che gli si mostra.
   *
   * Senza allegati resta una stringa, che è la forma che capiscono **tutti** i
   * modelli, anche i più vecchi. Con gli allegati diventa un elenco di parti,
   * che è la forma dei modelli multimodali. Mandare sempre l'elenco sarebbe
   * stato più regolare e avrebbe rotto i modelli di testo.
   */
  const contenuto: unknown = domanda.allegati?.length
    ? [
        { type: "text", text: domanda.utente },
        ...domanda.allegati.map((a) =>
          a.genere === "immagine"
            ? { type: "image_url", image_url: { url: `data:${a.mime};base64,${a.base64}` } }
            : {
                type: "input_audio",
                input_audio: { data: a.base64, format: formatoAudio(a.mime) },
              },
        ),
      ]
    : domanda.utente;

  const corpo: Record<string, unknown> = {
    model: scelto,
    messages: [
      { role: "system", content: domanda.sistema },
      { role: "user", content: contenuto },
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
    chat_template_kwargs: { enable_thinking: domanda.pensa !== false },
    max_tokens: domanda.pensa === false ? 900 : 10_000,
    ...(inDiretta ? { stream: true } : {}),
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

  return { scelto, corpo };
}

/** `audio/wav` diventa `wav`: è così che l'API vuole il formato. */
function formatoAudio(mime: string): string {
  const coda = mime.split("/")[1] ?? "wav";
  return coda === "mpeg" ? "mp3" : coda.replace(/[^a-z0-9]/gi, "");
}

/**
 * Una domanda sola, una risposta sola.
 *
 * Niente conversazione: le app chiedono cose finite ("finiscimi questo testo"),
 * e una cronologia da mantenere sarebbe stato in più per nessun vantaggio.
 */
export async function chiediAllLlm(domanda: DomandaLlm): Promise<EsitoLlm> {
  if (!domanda.turnoGiaPreso) {
    return colTurno(
      { mestiere: "modello", corsia: domanda.corsia ?? "in-fila", che: cheDomanda(domanda), chi: domanda.chi },
      () => chiediAllLlm({ ...domanda, turnoGiaPreso: true }),
    ).catch((err) => ({ ok: false as const, testo: "", motivo: spiegaAttesa(err) }));
  }
  const preparata = await preparaDomanda(domanda, false);
  if ("errore" in preparata) return { ok: false, testo: "", motivo: preparata.errore };

  inVolo += 1;
  try {
    // Un 27B che ragiona su una macchina con 8 GB di VRAM può metterci minuti:
    // il limite è generoso di proposito, e chi chiama mostra che sta lavorando.
    const risposta = await postJson(
      `${BASE}/chat/completions`,
      preparata.corpo,
      domanda.timeoutMs ?? 5 * 60_000,
    );

    if (risposta.status < 200 || risposta.status >= 300) {
      return {
        ok: false,
        testo: "",
        motivo: spiegaErrore(risposta.status, risposta.testo, Boolean(domanda.allegati?.length)),
      };
    }

    const dati = JSON.parse(risposta.testo) as {
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

    if (!testo.trim()) return { ok: false, testo: "", motivo: aVuoto(scelta?.finish_reason) };
    return { ok: true, testo: ripulisci(testo), modello: preparata.scelto };
  } catch (err) {
    return { ok: false, testo: "", motivo: spiegaEccezione(err) };
  } finally {
    inVolo -= 1;
    void liberaDopoLaRisposta();
  }
}

/**
 * La stessa domanda, ma i token si vedono arrivare.
 *
 * `onPezzo` viene chiamata a ogni frammento, sia del ragionamento sia della
 * risposta. Alla fine torna lo stesso `EsitoLlm` della versione muta, così chi
 * chiama tratta le due allo stesso modo e la differenza è solo quello che si
 * vede mentre aspetta.
 */
export async function chiediInDirettaAllLlm(
  domanda: DomandaLlm,
  onPezzo: (pezzo: PezzoLlm) => void,
): Promise<EsitoLlm> {
  if (!domanda.turnoGiaPreso) {
    return colTurno(
      { mestiere: "modello", corsia: domanda.corsia ?? "in-fila", che: cheDomanda(domanda), chi: domanda.chi },
      () => chiediInDirettaAllLlm({ ...domanda, turnoGiaPreso: true }, onPezzo),
    ).catch((err) => ({ ok: false as const, testo: "", motivo: spiegaAttesa(err) }));
  }
  const preparata = await preparaDomanda(domanda, true);
  if ("errore" in preparata) return { ok: false, testo: "", motivo: preparata.errore };

  inVolo += 1;
  try {
    const risposta = await postJsonStream(
      `${BASE}/chat/completions`,
      preparata.corpo,
      domanda.timeoutMs ?? 5 * 60_000,
      onPezzo,
    );

    if (risposta.status < 200 || risposta.status >= 300) {
      return {
        ok: false,
        testo: "",
        motivo: spiegaErrore(risposta.status, risposta.testo, Boolean(domanda.allegati?.length)),
      };
    }

    const testo = risposta.testo.trim() ? risposta.testo : risposta.pensiero;
    if (!testo.trim()) return { ok: false, testo: "", motivo: aVuoto(risposta.motivoFine) };
    return { ok: true, testo: ripulisci(testo), modello: preparata.scelto };
  } catch (err) {
    return { ok: false, testo: "", motivo: spiegaEccezione(err) };
  } finally {
    inVolo -= 1;
    void liberaDopoLaRisposta();
  }
}

/**
 * Una riga che dica cosa sta chiedendo, per chi guarda la fila.
 *
 * Non il prompt intero: in un pannello serve riconoscere il proprio lavoro fra
 * gli altri, non rileggerlo.
 */
function cheDomanda(domanda: DomandaLlm): string {
  const prima = domanda.utente.trim().split(/\r?\n/)[0] ?? "";
  return prima ? `Chiedo al modello: ${prima.slice(0, 50)}` : "Chiedo al modello";
}

/**
 * Non è arrivato il turno: si dice quello, non un errore di rete.
 *
 * Il turno si può perdere in due modi soli — la fila era ferma da mezz'ora,
 * oppure qualcuno ha annullato — e in tutti e due i casi chi ha premuto merita
 * una frase che spieghi, non un «errore imprevisto».
 */
function spiegaAttesa(err: unknown): string {
  const detto = err instanceof Error ? err.message : String(err);
  return turno.eSospesa()
    ? "Il computer è in pausa: chi ci sta davanti ha fermato i lavori nuovi. Riprova fra poco."
    : `Non è arrivato il turno sulla scheda video: ${detto}`;
}

/**
 * Perché LM Studio ha detto di no, in italiano.
 *
 * Il caso che vale la pena riconoscere è **il modello che non sa vedere**: chi
 * ha appena allegato tre foto e riceve un 400 pieno di inglese non ha modo di
 * capire che il problema è il modello caricato, non le foto.
 */
function spiegaErrore(stato: number, corpo: string, conAllegati: boolean): string {
  const dentro = corpo.slice(0, 300);
  if (conAllegati && /image|vision|multimodal|content.*array|input_audio/i.test(dentro)) {
    return (
      "Il modello caricato in LM Studio non sa guardare immagini o sentire audio. " +
      "Caricane uno che lo sappia fare (in LM Studio hanno l'occhio accanto al nome), " +
      `oppure togli gli allegati. LM Studio ha risposto ${stato}: ${dentro}`
    );
  }
  return `LM Studio ha risposto ${stato}: ${dentro}`;
}

function aVuoto(motivoFine?: string | null): string {
  return motivoFine === "length"
    ? "Il modello ha finito lo spazio prima di rispondere: in LM Studio spegni il ragionamento o carica un modello più piccolo."
    : "Il modello ha risposto, ma a vuoto.";
}

function spiegaEccezione(err: unknown): string {
  const motivo = err instanceof Error ? err.message : String(err);
  return motivo.includes("timed out")
    ? "Il modello ci sta mettendo troppo: prova con un modello più piccolo in LM Studio."
    : motivo;
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
