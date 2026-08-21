/**
 * Il pezzo di MCP che serve a noi, scritto a mano.
 *
 * MCP su stdio è JSON-RPC 2.0 con un messaggio per riga: si legge da stdin, si
 * risponde su stdout, e **tutto ciò che non è un messaggio va su stderr** — una
 * riga di log finita su stdout rompe il client, ed è il modo più facile di
 * passare un pomeriggio a capire perché «non si collega».
 *
 * È scritto a mano invece di prendere l'SDK ufficiale per la stessa ragione per
 * cui la suite fa tante cose a mano: sono duecento righe contro una dipendenza
 * in più nell'installer, e questa è la parte del protocollo che non cambia —
 * `initialize`, `tools/list`, `tools/call`, `ping`.
 *
 * Sulla versione del protocollo: si **rimanda indietro quella che chiede il
 * client**. Un server che implementa solo il nucleo stabile va bene con tutte,
 * e inseguire il numero dell'ultima specifica sarebbe un modo di rompersi da
 * soli il giorno che ne esce un'altra.
 */

import { createInterface } from "node:readline";

/** La versione che diciamo se il client non ne chiede una. */
const VERSIONE_PREDEFINITA = "2025-06-18";

interface Messaggio {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** Uno strumento, nella forma che MCP si aspetta. */
export interface Strumento {
  name: string;
  description: string;
  inputSchema: unknown;
}

/** Cosa deve saper fare chi usa questo trasporto. */
export interface Servizio {
  nome: string;
  versione: string;
  /** Una riga per il client su cosa sia questo server. */
  istruzioni?: string;
  strumenti(): Promise<Strumento[]>;
  /** Il testo da restituire, o un errore da mostrare come tale. */
  chiama(nome: string, argomenti: Record<string, unknown>): Promise<string>;
}

/** Codici JSON-RPC che usiamo. */
const METODO_SCONOSCIUTO = -32601;
const ERRORE_INTERNO = -32603;

export function servi(servizio: Servizio): void {
  const righe = createInterface({ input: process.stdin });

  righe.on("line", (riga) => {
    const pulita = riga.trim();
    if (!pulita) return;
    let messaggio: Messaggio;
    try {
      messaggio = JSON.parse(pulita) as Messaggio;
    } catch {
      // Una riga illeggibile non ha un id: non c'è nessuno a cui rispondere.
      avvisa("riga non leggibile, la salto");
      return;
    }
    void rispondi(servizio, messaggio);
  });

  righe.on("close", () => process.exit(0));
}

async function rispondi(servizio: Servizio, messaggio: Messaggio): Promise<void> {
  const { id, method, params } = messaggio;

  // Una notifica non ha id e non vuole risposta. `notifications/initialized`
  // arriva sempre e non c'è niente da fare: sapere che il client è pronto non
  // cambia niente per un server che non manda niente per primo.
  if (id === undefined || id === null) return;

  try {
    switch (method) {
      case "initialize": {
        const chiesta = typeof params?.protocolVersion === "string" ? params.protocolVersion : null;
        manda({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: chiesta ?? VERSIONE_PREDEFINITA,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: servizio.nome, version: servizio.versione },
            ...(servizio.istruzioni ? { instructions: servizio.istruzioni } : {}),
          },
        });
        return;
      }

      case "ping": {
        manda({ jsonrpc: "2.0", id, result: {} });
        return;
      }

      case "tools/list": {
        manda({ jsonrpc: "2.0", id, result: { tools: await servizio.strumenti() } });
        return;
      }

      case "tools/call": {
        const nome = String(params?.name ?? "");
        const argomenti = (params?.arguments ?? {}) as Record<string, unknown>;
        try {
          const testo = await servizio.chiama(nome, argomenti);
          manda({
            jsonrpc: "2.0",
            id,
            result: { content: [{ type: "text", text: testo }] },
          });
        } catch (err) {
          // Un attrezzo che fallisce **non** è un errore di protocollo: si
          // risponde bene, con isError, così l'agente legge il perché e può
          // riprovare invece di vedersi cadere la connessione.
          manda({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
              isError: true,
            },
          });
        }
        return;
      }

      default:
        manda({
          jsonrpc: "2.0",
          id,
          error: { code: METODO_SCONOSCIUTO, message: `Metodo "${method}" non gestito.` },
        });
    }
  } catch (err) {
    manda({
      jsonrpc: "2.0",
      id,
      error: {
        code: ERRORE_INTERNO,
        message: err instanceof Error ? err.message : "Errore interno del server MCP.",
      },
    });
  }
}

/** Un messaggio, su una riga sola. Solo qui si scrive su stdout. */
function manda(messaggio: Messaggio): void {
  process.stdout.write(`${JSON.stringify(messaggio)}\n`);
}

/** Tutto il resto va su stderr, dove non dà fastidio a nessuno. */
export function avvisa(testo: string): void {
  process.stderr.write(`[daprod-mcp] ${testo}\n`);
}
