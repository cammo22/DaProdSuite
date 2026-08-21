/**
 * Il server MCP messo alla prova, come lo userebbe un agente.
 *
 *     node apps/shell/scripts/prova-mcp.mjs
 *
 * Accende un gateway vero, accoppia il server MCP col codice di otto cifre come
 * farebbe una persona, poi gli parla in JSON-RPC su stdin/stdout esattamente
 * come fa Claude Code: `initialize`, `tools/list`, `tools/call`.
 *
 * Serve a tenere ferme due cose che si rompono in silenzio:
 * - che gli strumenti **nascano dal catalogo** e non da un elenco scritto a
 *   mano da qualche parte (si aggiunge un'azione, deve comparire qui);
 * - che su stdout non finisca **mai** niente che non sia protocollo — una riga
 *   di log di troppo e il client si stacca senza dire perché.
 *
 * Vuole `packages/gateway/dist` e `packages/mcp/dist` compilati.
 */

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const radiceRepo = join(import.meta.dirname, "..", "..", "..");
const G = require(join(radiceRepo, "packages", "gateway", "dist", "index.js"));
const CLI = join(radiceRepo, "packages", "mcp", "dist", "cli.js");

const cartella = mkdtempSync(join(tmpdir(), "daprod-mcp-"));
const fileCredenziale = join(cartella, "mcp.json");
const archivio = new G.Archivio(join(cartella, "remoto.json"));
const remoto = new G.Remoto(archivio, cartella);

const eseguite = [];
const gateway = new G.Gateway({
  remoto,
  versione: "0.5.0",
  computer: "PC-DI-PROVA",
  stato: () => ({
    versione: "0.5.0",
    computer: "PC-DI-PROVA",
    attiva: true,
    attivita: [],
    coda: { attesa: 0, lavoro: 0, pronte: 0 },
  }),
  esegui: async (id, valori) => {
    eseguite.push({ id, valori });
    if (id === "libreria.ultimi") {
      return [
        { nome: "Notte in citta.mp3", tipo: "audio", app: "musica", megabyte: 4.2 },
        { nome: "faro.png", tipo: "immagine", app: "foto", megabyte: 1.1 },
      ];
    }
    return { fatto: true };
  },
});

const porta = await gateway.ascolta(0);
const host = `127.0.0.1:${porta}`;
let falliti = 0;

function dice(nome, condizione, extra = "") {
  if (condizione) console.log(`  ok   ${nome}`);
  else {
    falliti++;
    console.log(`  NO   ${nome} ${extra}`);
  }
}

/* -------------------------------------------------------- accoppiamento */

console.log("\n— l'accoppiamento dell'agente —");
{
  const invito = remoto.nuovoInvito("admin");
  const esito = await eseguiCli(["--accoppia", host, invito.codice, "agente di prova"]);
  dice("si accoppia col codice", esito.codice === 0, esito.errore);
  dice("lo dice su stderr, non su stdout", esito.uscita.trim() === "", `stdout: ${esito.uscita}`);
  dice("racconta a chi si è collegato", /PC-DI-PROVA/.test(esito.errore), esito.errore);
}
{
  const esito = await eseguiCli(["--accoppia", host, "1234", "x"]);
  dice("rifiuta un codice corto", esito.codice === 2);
}

/* ----------------------------------------------------------- il dialogo */

console.log("\n— il dialogo MCP —");
const server = apriServer();

{
  const r = await server.chiedi("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "prova", version: "1" },
  });
  dice("risponde a initialize", !!r.result, JSON.stringify(r));
  dice("rimanda la versione chiesta", r.result?.protocolVersion === "2025-06-18", r.result?.protocolVersion);
  dice("dichiara gli strumenti", !!r.result?.capabilities?.tools);
  dice("si presenta", r.result?.serverInfo?.name === "daprod-suite");
  dice("avvisa che le generazioni vanno in fila", /fila/i.test(r.result?.instructions ?? ""));
}
{
  const r = await server.chiedi("initialize", { protocolVersion: "2099-01-01", capabilities: {} });
  dice("va bene anche una versione futura", r.result?.protocolVersion === "2099-01-01");
}

server.notifica("notifications/initialized", {});

{
  const r = await server.chiedi("ping", {});
  dice("risponde a ping", !!r.result);
}

let strumenti = [];
{
  const r = await server.chiedi("tools/list", {});
  strumenti = r.result?.tools ?? [];
  dice("elenca gli strumenti", strumenti.length >= 8, `→ ${strumenti.length}`);
  const immagine = strumenti.find((s) => s.name === "genera_immagine");
  dice("i punti diventano trattini bassi", !!immagine, strumenti.map((s) => s.name).join(", "));
  dice("ha lo schema del catalogo", !!immagine?.inputSchema?.properties?.prompt);
  dice("prompt è obbligatorio", immagine?.inputSchema?.required?.includes("prompt"));
  dice("nessun campo di troppo", immagine?.inputSchema?.additionalProperties === false);
  dice(
    "la descrizione avvisa della fila",
    /fila|approvata/i.test(immagine?.description ?? ""),
    immagine?.description,
  );
  dice(
    "l'azione che legge non parla di fila",
    !/fila/i.test(strumenti.find((s) => s.name === "libreria_ultimi")?.description ?? ""),
  );
}
{
  const r = await server.chiedi("tools/call", {
    name: "genera_immagine",
    arguments: { prompt: "un faro sulla scogliera", quante: 2 },
  });
  const testo = r.result?.content?.[0]?.text ?? "";
  dice("una generazione entra in fila", /in fila/i.test(testo), testo);
  dice("torna l'id della richiesta", /Id della richiesta: r_/.test(testo), testo);
  dice("non è marcata come errore", !r.result?.isError);
  dice("non è passata dall'esecutore", eseguite.length === 0);
  const inFila = remoto.archivi.datiCorrenti.richieste;
  dice("la richiesta esiste davvero", inFila.length === 1 && inFila[0].testo === "un faro sulla scogliera");
  dice("porta con sé l'azione", inFila[0]?.opzioni?.azione === "genera.immagine");
}
{
  const r = await server.chiedi("tools/call", { name: "libreria_ultimi", arguments: { quanti: 2 } });
  const testo = r.result?.content?.[0]?.text ?? "";
  dice("una lettura risponde subito", /Notte in citta\.mp3/.test(testo), testo);
  dice("è leggibile, non JSON", !testo.trimStart().startsWith("["), testo.slice(0, 40));
  dice("è passata dall'esecutore", eseguite.some((e) => e.id === "libreria.ultimi"));
}
{
  const r = await server.chiedi("tools/call", { name: "genera_immagine", arguments: { quante: 2 } });
  dice("un campo mancante torna come errore dell'attrezzo", r.result?.isError === true, JSON.stringify(r));
  dice("e spiega quale", /prompt/.test(r.result?.content?.[0]?.text ?? ""));
  dice("ma non rompe il protocollo", !r.error);
}
{
  const r = await server.chiedi("tools/call", { name: "non_esiste", arguments: {} });
  dice("uno strumento inventato torna come errore dell'attrezzo", r.result?.isError === true);
}
{
  const r = await server.chiedi("metodo/inventato", {});
  dice("un metodo sconosciuto torna un errore JSON-RPC", r.error?.code === -32601, JSON.stringify(r));
}

/* --------------------------------------------------- il PC che non c'è */

console.log("\n— quando il PC è spento —");
await gateway.chiudi();
{
  const r = await server.chiedi("tools/call", {
    name: "genera_immagine",
    arguments: { prompt: "qualcosa" },
  });
  const testo = r.result?.content?.[0]?.text ?? "";
  dice("lo dice in italiano, non con un errore di rete", /acceso/i.test(testo), testo);
  dice("resta un errore dell'attrezzo", r.result?.isError === true);
}

dice("su stdout non è finito niente di sporco", server.sporco === "", server.sporco.slice(0, 120));

server.chiudi();
archivio.scriviAdesso();
console.log(falliti === 0 ? "\nTutto a posto.\n" : `\n${falliti} prove fallite.\n`);
process.exit(falliti === 0 ? 0 : 1);

/* ------------------------------------------------------------ attrezzi */

function eseguiCli(argomenti) {
  return new Promise((risolvi) => {
    const p = spawn(process.execPath, [CLI, ...argomenti], {
      env: { ...process.env, DAPROD_MCP_FILE: fileCredenziale },
    });
    let uscita = "";
    let errore = "";
    p.stdout.on("data", (d) => (uscita += d));
    p.stderr.on("data", (d) => (errore += d));
    p.on("close", (codice) => risolvi({ codice, uscita, errore }));
  });
}

/** Il server MCP acceso, e un modo di fargli domande una per volta. */
function apriServer() {
  const p = spawn(process.execPath, [CLI], {
    env: { ...process.env, DAPROD_MCP_FILE: fileCredenziale },
  });
  let resto = "";
  const attese = new Map();
  const stato = { sporco: "" };
  let prossimo = 1;

  p.stdout.on("data", (pezzo) => {
    resto += pezzo;
    let taglio;
    while ((taglio = resto.indexOf("\n")) >= 0) {
      const riga = resto.slice(0, taglio).trim();
      resto = resto.slice(taglio + 1);
      if (!riga) continue;
      try {
        const messaggio = JSON.parse(riga);
        const aspetta = attese.get(messaggio.id);
        if (aspetta) {
          attese.delete(messaggio.id);
          aspetta(messaggio);
        }
      } catch {
        // Qualunque riga su stdout che non sia JSON è un difetto: la si tiene
        // da parte e la si mostra alla fine.
        stato.sporco += `${riga}\n`;
      }
    }
  });

  return {
    get sporco() {
      return stato.sporco;
    },
    chiedi(method, params) {
      const id = prossimo++;
      return new Promise((risolvi, rifiuta) => {
        const scadenza = setTimeout(() => rifiuta(new Error(`nessuna risposta a ${method}`)), 10000);
        attese.set(id, (m) => {
          clearTimeout(scadenza);
          risolvi(m);
        });
        p.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });
    },
    notifica(method, params) {
      p.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
    },
    chiudi() {
      p.stdin.end();
      p.kill();
    },
  };
}
