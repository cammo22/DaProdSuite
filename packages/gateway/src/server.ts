/**
 * Il gateway HTTP dell'accesso remoto.
 *
 * Un solo ingresso verso la suite: tutto ciò che arriva da fuori passa da qui,
 * e nessun motore è mai esposto. Le rotte:
 *
 *   GET  /                                      →  la console web (pagina sola)
 *   POST /accoppiamento        { codice, nome }  →  { dispositivo, token }
 *   GET  /stato                                 →  StatoSuite (istantanea)
 *   GET  /stato/stream                          →  stato in streaming (SSE)
 *   GET  /azioni                                →  cosa si può chiedere, con gli schemi
 *   POST /azioni/:id           { campi… }        →  in fila, oppure la risposta
 *   GET  /richieste                             → richieste visibili al dispositivo
 *   POST /richieste        { tipo, app, testo, opzioni? }   → crea (ospiti e admin)
 *   GET  /richieste/:id                         → dettaglio
 *   POST /richieste/:id/stato { stato, motivo?, risultato? } → decide (solo admin)
 *   GET  /risultati/:nome                       → scarica un file pronto
 *   GET  /notifiche                             → notifiche non lette
 *   POST /notifiche/:id/letta                   → segna letta
 *
 * Tutte le rotte tranne `/` e `/accoppiamento` vogliono
 * `Authorization: Bearer <token>`. L'unica eccezione è `/stato/stream`, che
 * accetta il token anche in query: `EventSource` non sa mettere header, e senza
 * quello la console web resterebbe senza stato vivo.
 *
 * Nessuna regola CORS, e non è una dimenticanza: la console si serve da qui,
 * quindi è stessa origine e non ne ha bisogno; una pagina di un altro sito, non
 * potendo mettere l'header `Authorization` senza un preflight che qui fallisce,
 * resta fuori.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { createReadStream, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { elencoAzioni, eseguiAzione, type Esecutore } from "./azioni";
import { paginaConsole } from "./console";
import { Remoto } from "./remoto";
import type { Dispositivo, DispositivoPubblico, StatoRichiesta, StatoSuite } from "./types";

/** Chi fornisce lo stato vivo della suite: lo passa lo shell. */
export type StatoProvider = () => StatoSuite;

export interface GatewayOpzioni {
  remoto: Remoto;
  /** Stato vivo della suite, costruito dallo shell. */
  stato: StatoProvider;
  /** Chi esegue le azioni che non passano dalla fila. Lo passa lo shell. */
  esegui: Esecutore;
  /** Versione della suite, per il telefono. */
  versione: string;
  /** Nome del computer, mostrato durante l'accoppiamento. */
  computer: string;
}

/** Ogni quanto il gateway manda un segno di vita a chi è in ascolto. */
const BATTITO_SSE_MS = 20_000;

/** Una connessione SSE aperta: il gateway le tiene d'occhio per spingere. */
interface SseClient {
  res: ServerResponse;
  battito: ReturnType<typeof setInterval>;
}

export class Gateway {
  private server: Server;
  private sse: Set<SseClient> = new Set();
  private remoto: Remoto;
  private fornitoStato: StatoProvider;
  private esecutore: Esecutore;
  private versione: string;
  private computer: string;

  constructor(opzioni: GatewayOpzioni) {
    this.remoto = opzioni.remoto;
    this.fornitoStato = opzioni.stato;
    this.esecutore = opzioni.esegui;
    this.versione = opzioni.versione;
    this.computer = opzioni.computer;
    this.server = createServer((req, res) => {
      void this.maneggia(req, res);
    });
  }

  /** Si mette in ascolto; risolve con la porta reale (utile se 0 = random). */
  ascolta(porta: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(porta, "0.0.0.0", () => {
        const indirizzo = this.server.address() as AddressInfo;
        resolve(indirizzo.port);
      });
    });
  }

  chiudi(): Promise<void> {
    for (const cliente of this.sse) {
      clearInterval(cliente.battito);
      cliente.res.end();
    }
    this.sse.clear();
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  /** Spinge lo stato a tutte le connessioni aperte (dopo un cambiamento). */
  aggiorna(): void {
    const stato = this.statoCorrente();
    for (const cliente of this.sse) {
      if (cliente.res.writableEnded) continue;
      cliente.res.write(`data: ${JSON.stringify(stato)}\n\n`);
    }
  }

  /* ------------------------------------------------------------- rotte */

  private async maneggia(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const percorso = url.pathname;

      // La console web: una pagina sola, senza dati dentro. Il token se lo
      // procura lei accoppiandosi, come fa il telefono.
      if ((percorso === "/" || percorso === "/console") && req.method === "GET") {
        this.pagina(res, paginaConsole());
        return;
      }

      const corpo = await leggiCorpo(req);

      // L'accoppiamento è l'unica rotta senza token: è il momento in cui il
      // dispositivo non ha ancora una credenziale, e gliela si dà.
      if (percorso === "/accoppiamento" && req.method === "POST") {
        this.accoppia(res, corpo);
        return;
      }

      const dispositivo = this.chiE(req, url);
      if (!dispositivo) {
        this.errore(res, 401, "Token mancante o non riconosciuto.");
        return;
      }
      this.remoto.tocca(dispositivo);

      // Stato: istantanea e streaming. Le due rotte gemelle.
      if (percorso === "/stato" && req.method === "GET") {
        this.json(res, 200, this.statoCorrente());
        return;
      }
      if (percorso === "/stato/stream" && req.method === "GET") {
        this.apreSse(res);
        return;
      }

      // Le azioni: cosa si può chiedere, e come si chiede.
      if (percorso === "/azioni" && req.method === "GET") {
        this.json(res, 200, elencoAzioni(dispositivo));
        return;
      }
      const daFare = percorso.match(/^\/azioni\/([^/]+)$/);
      if (daFare && req.method === "POST") {
        const id = decodeURIComponent(daFare[1] ?? "");
        const esito = await eseguiAzione(
          this.remoto,
          this.esecutore,
          dispositivo,
          id,
          (corpo ?? {}) as Record<string, unknown>,
        );
        if (esito.esito === "errore") {
          this.errore(res, esito.codice, esito.errore);
          return;
        }
        this.json(res, esito.esito === "in-coda" ? 201 : 200, esito);
        this.aggiorna();
        return;
      }

      // Richieste: elenco e creazione.
      if (percorso === "/richieste" && req.method === "GET") {
        this.json(res, 200, this.remoto.richiesteDi(dispositivo));
        return;
      }
      if (percorso === "/richieste" && req.method === "POST") {
        const dati = corpo as { tipo?: string; app?: string; testo?: string; opzioni?: Record<string, string> };
        if (!dati.tipo || !dati.app || !dati.testo) {
          this.errore(res, 400, "Servono tipo, app e testo della richiesta.");
          return;
        }
        const richiesta = this.remoto.creaRichiesta({
          tipo: dati.tipo,
          app: dati.app,
          testo: dati.testo,
          opzioni: dati.opzioni,
          daDispositivo: dispositivo,
        });
        this.json(res, 201, richiesta);
        this.aggiorna();
        return;
      }

      // Dettaglio di una richiesta. L'ospite vede solo le proprie.
      const dettaglio = percorso.match(/^\/richieste\/([^/]+)$/);
      if (dettaglio && req.method === "GET") {
        const id = dettaglio[1];
        if (!id) {
          this.errore(res, 404, "Richiesta non trovata.");
          return;
        }
        const r = this.remoto.richiesta(id);
        if (!r || (dispositivo.ruolo !== "admin" && r.daDispositivo !== dispositivo.id)) {
          this.errore(res, 404, "Richiesta non trovata o non tua.");
          return;
        }
        this.json(res, 200, r);
        return;
      }

      // Decisione su una richiesta: solo l'admin.
      const decisione = percorso.match(/^\/richieste\/([^/]+)\/stato$/);
      if (decisione && req.method === "POST") {
        const id = decisione[1];
        if (!id) {
          this.errore(res, 404, "Richiesta non trovata.");
          return;
        }
        const dati = corpo as {
          stato?: StatoRichiesta;
          motivo?: string;
          risultato?: { percorso: string; nome: string; bytes: number; tipo: string };
        };
        if (!dati.stato) {
          this.errore(res, 400, "Manca lo stato.");
          return;
        }
        const errore = this.remoto.cambiaStato(id, dispositivo, dati.stato, {
          motivo: dati.motivo,
          risultato: dati.risultato ? { ...dati.risultato, quando: Date.now() } : undefined,
        });
        if (errore) {
          this.errore(res, 403, errore);
          return;
        }
        this.json(res, 200, this.remoto.richiesta(id));
        this.aggiorna();
        return;
      }

      // Scaricare il file di un risultato.
      const file = percorso.match(/^\/risultati\/(.+)$/);
      if (file && req.method === "GET") {
        const nome = file[1];
        if (!nome) {
          this.errore(res, 404, "File non trovato.");
          return;
        }
        this.scarica(res, dispositivo, decodeURIComponent(nome));
        return;
      }

      // Notifiche: elenco e spunta "letta".
      if (percorso === "/notifiche" && req.method === "GET") {
        this.json(res, 200, this.remoto.notificheDi(dispositivo));
        return;
      }
      const letta = percorso.match(/^\/notifiche\/([^/]+)\/letta$/);
      if (letta && req.method === "POST") {
        const id = letta[1];
        if (!id) {
          this.errore(res, 404, "Notifica non trovata.");
          return;
        }
        const ok = this.remoto.segnaLetta(id, dispositivo.id);
        this.json(res, ok ? 200 : 404, { ok });
        return;
      }

      this.errore(res, 404, "Rotta non trovata.");
    } catch (err) {
      console.error("[gateway]", err);
      this.errore(res, 500, "Errore del gateway.");
    }
  }

  /* ----------------------------------------------------- sotto-rotte */

  private accoppia(res: ServerResponse, corpo: unknown): void {
    const { codice, nome } = (corpo ?? {}) as { codice?: string; nome?: string };
    if (!codice || !/^\d{8}$/.test(codice)) {
      this.errore(res, 400, "Il codice è un numero di otto cifre.");
      return;
    }
    const esito = this.remoto.accoppia(codice, (nome ?? "").trim().slice(0, 40));
    if ("errore" in esito) {
      this.errore(res, 403, esito.errore);
      return;
    }
    this.json(res, 201, {
      dispositivo: senzaToken(esito.dispositivo),
      token: esito.token,
      computer: this.computer,
      versione: this.versione,
    });
    this.aggiorna();
  }

  /**
   * Il dispositivo dietro il token, se c'è.
   *
   * Il token si legge dall'header. In query lo si accetta **solo** per lo
   * streaming dello stato, perché `EventSource` non sa mettere header: è una
   * rotta di sola lettura, e senza quell'eccezione la console web non avrebbe
   * lo stato vivo.
   */
  private chiE(req: IncomingMessage, url: URL): Dispositivo | undefined {
    const testa = req.headers.authorization ?? "";
    let token = testa.startsWith("Bearer ") ? testa.slice(7) : "";
    if (!token && url.pathname === "/stato/stream") {
      token = url.searchParams.get("token") ?? "";
    }
    return token ? this.remoto.daToken(token) : undefined;
  }

  /**
   * Scarica un file della cartella risultati remoti.
   *
   * Il nome arriva dal risultato di una richiesta (mai un percorso a mano):
   * si risolve dentro la cartella e ci si resta. Chiunque può scaricare il
   * file di una propria richiesta pronta.
   */
  private scarica(res: ServerResponse, dispositivo: Dispositivo, nome: string): void {
    const richiesta = this.remoto.richiesteDi(dispositivo).find(
      (r) => r.risultato && r.risultato.nome === nome,
    );
    if (!richiesta?.risultato) {
      this.errore(res, 404, "Nessun risultato con questo nome, e di sicuro non tuo.");
      return;
    }
    const assoluto = normalize(join(this.remoto.risultatiDir, richiesta.risultato.percorso));
    if (!assoluto.startsWith(this.remoto.risultatiDir)) {
      this.errore(res, 403, "Percorso fuori dalla cartella dei risultati.");
      return;
    }
    try {
      const stat = statSync(assoluto);
      res.writeHead(200, {
        "Content-Type": richiesta.risultato.tipo,
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename="${richiesta.risultato.nome.replace(/"/g, "")}"`,
      });
      createReadStream(assoluto).pipe(res);
    } catch {
      this.errore(res, 404, "File non trovato.");
    }
  }

  /* ------------------------------------------------------------ SSE */

  private apreSse(res: ServerResponse): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    // Subito lo stato attuale, poi gli aggiornamenti.
    res.write(`data: ${JSON.stringify(this.statoCorrente())}\n\n`);

    // Un commento ogni venti secondi: tiene aperta la connessione attraverso
    // router e wifi che chiudono quel che tace, senza mandare dati veri. Prima
    // qui c'era un timeout che **chiudeva** lo stream dopo trenta secondi di
    // silenzio: la console si sarebbe scollegata da sola guardando un PC fermo.
    const cliente: SseClient = {
      res,
      battito: setInterval(() => {
        if (res.writableEnded) return;
        res.write(": vivo\n\n");
      }, BATTITO_SSE_MS),
    };
    this.sse.add(cliente);
    res.on("close", () => this.chiudiSse(cliente));
  }

  private chiudiSse(cliente: SseClient): void {
    clearInterval(cliente.battito);
    if (!cliente.res.writableEnded) cliente.res.end();
    this.sse.delete(cliente);
  }

  private statoCorrente(): StatoSuite {
    return this.fornitoStato();
  }

  /* ---------------------------------------------------------- risposte */

  private pagina(res: ServerResponse, html: string): void {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
      // La console non carica niente da fuori: se un giorno qualcuno ce lo
      // mettesse, questa riga lo fermerebbe prima che arrivi in rete.
      "Content-Security-Policy":
        "default-src 'none'; connect-src 'self'; img-src 'self' data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(html);
  }

  private json(res: ServerResponse, codice: number, dati: unknown): void {
    const corpo = JSON.stringify(dati);
    res.writeHead(codice, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(corpo),
      "X-Content-Type-Options": "nosniff",
    });
    res.end(corpo);
  }

  private errore(res: ServerResponse, codice: number, messaggio: string): void {
    this.json(res, codice, { errore: messaggio });
  }
}

/** Il dispositivo senza il token: è quel che si può mostrare in giro. */
function senzaToken(d: Dispositivo): DispositivoPubblico {
  const { token: _token, ...pubblico } = d;
  return pubblico;
}

/** Legge il corpo di una richiesta JSON, con un tetto per la memoria. */
function leggiCorpo(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const pezzi: Buffer[] = [];
    let totale = 0;
    req.on("data", (c: Buffer) => {
      totale += c.length;
      if (totale > 1_000_000) {
        req.destroy();
        resolve({});
        return;
      }
      pezzi.push(c);
    });
    req.on("end", () => {
      if (pezzi.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(pezzi).toString("utf8")));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}
