#!/usr/bin/env node
/**
 * Il server MCP della suite.
 *
 * Due modi di usarlo, e il primo si fa una volta sola:
 *
 *     node dist/cli.js --accoppia <ip:porta> <codice> [nome]
 *     node dist/cli.js
 *
 * Il primo prende il codice di otto cifre dal pannello «Da fuori» dell'hub e
 * salva un token; il secondo è quello che lancia il client MCP, e non stampa
 * niente su stdout che non sia protocollo.
 *
 * In `.mcp.json` (o nelle impostazioni di Claude Code) diventa:
 *
 *     {
 *       "mcpServers": {
 *         "daprod": { "command": "node", "args": ["…/packages/mcp/dist/cli.js"] }
 *       }
 *     }
 */

import { accoppia, Cliente, ErroreGateway } from "./cliente";
import { fileCredenziale, leggiCredenziale, salvaCredenziale } from "./credenziale";
import { avvisa, servi } from "./protocollo";
import { servizio } from "./servizio";

const VERSIONE = "0.1.0";

async function principale(): Promise<void> {
  const argomenti = process.argv.slice(2);

  if (argomenti[0] === "--accoppia") {
    await accoppiamento(argomenti.slice(1));
    return;
  }
  if (argomenti[0] === "--aiuto" || argomenti[0] === "-h") {
    aiuto();
    return;
  }

  const credenziale = leggiCredenziale();
  if (!credenziale) {
    // Su stderr, non su stdout: qui potrebbe già esserci un client in ascolto.
    avvisa(
      `Nessun accesso salvato in ${fileCredenziale()}. Accoppia prima con: --accoppia <ip:porta> <codice a 8 cifre>`,
    );
    process.exit(1);
  }

  avvisa(`collegato a ${credenziale.computer ?? credenziale.host}`);
  servi(servizio(new Cliente(credenziale.host, credenziale.token), VERSIONE));
}

async function accoppiamento(argomenti: string[]): Promise<void> {
  const [host, codice, ...resto] = argomenti;
  const nome = resto.join(" ") || "agente";

  if (!host || !codice) {
    console.error("Uso: --accoppia <ip:porta> <codice a 8 cifre> [nome]");
    process.exit(2);
  }
  if (!/^\d{8}$/.test(codice)) {
    console.error("Il codice è di otto cifre, come lo mostra il pannello «Da fuori».");
    process.exit(2);
  }

  try {
    const esito = await accoppia(host, codice, nome);
    salvaCredenziale({ host, token: esito.token, computer: esito.computer });
    console.error(`Accoppiato a ${esito.computer} come ${esito.ruolo}.`);
    console.error(`Accesso salvato in ${fileCredenziale()}.`);
    if (esito.ruolo !== "admin") {
      console.error(
        "Nota: da ospite l'agente può chiedere generazioni e leggere i risultati, ma non decidere sulla fila né aprire le app. Per quello serve un invito da padrone.",
      );
    }
  } catch (err) {
    console.error(
      err instanceof ErroreGateway ? err.message : `Non riesco ad accoppiarmi: ${String(err)}`,
    );
    process.exit(1);
  }
}

function aiuto(): void {
  console.error(
    [
      "Server MCP di DaProd Suite.",
      "",
      "  --accoppia <ip:porta> <codice> [nome]   prende il codice dal pannello «Da fuori»",
      "  (senza argomenti)                       parla MCP su stdin/stdout",
      "",
      "Variabili: DAPROD_GATEWAY e DAPROD_TOKEN scavalcano il file salvato;",
      "DAPROD_MCP_FILE sposta il file dell'accesso.",
    ].join("\n"),
  );
}

void principale();
