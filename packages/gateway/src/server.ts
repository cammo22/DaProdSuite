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
 *   POST /richieste/:id/testo { testo }          → riscrivila a mano (chi decide)
 *   POST /richieste/:id/migliora                → falla riscrivere al modello
 *   PATCH  /richieste/:id                       → mettila via (archiviata)
 *   DELETE /richieste/:id                       → buttala
 *   GET  /ai                                    → c'è qualcuno a cui chiedere?
 *   POST /ai/migliora     { testo, app }         → riscrive un testo (chi decide)
 *   GET  /preset?app=                           → i modi di generare messi da parte
 *   POST /preset      { app, nome, testo, campi? } → salvane uno
 *   DELETE /preset/:id                          → toglilo
 *   GET  /invii                                 → i regali arrivati a te
 *   POST /invii?a=&nome=&messaggio=             → mandane uno (il corpo è il file)
 *   GET  /invii/:id/file                        → scaricalo
 *   POST /invii/:id/aperto                      → il pacco è stato aperto
 *   DELETE /invii/:id                           → toglilo, e con lui il file
 *   GET  /risultati/:nome                       → scarica un file pronto
 *   POST /sessione                              → pianta il biscotto per le GET
 *   GET  /pannello                              → la connessione, tutta in un colpo
 *   POST /pannello/invito  { ruolo, quante }     → un invito nuovo (chi decide)
 *   POST /pannello/tunnel  { acceso }            → apre o chiude la strada da Internet
 *   POST /pannello/porta                        → chiede a Windows di lasciar entrare
 *   POST /dispositivi/:id  { nome } | { ruolo }  → rinomina, o cambia cosa può fare
 *   DELETE /dispositivi/:id                     → lo scollega
 *   GET  /io                                    → chi sono, che ruolo ho, che PC è
 *   GET  /libreria?tipo=&app=&quanti=&dove=     → le tue cose, o la bacheca
 *   GET  /libreria/file/:id                     → il file, con supporto a Range
 *   POST /libreria/:id/pubblica { pubblicato }   → mettila in bacheca, o toglila
 *   DELETE /libreria/:id                        → buttala (solo le tue)
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
import { createReadStream, createWriteStream, mkdirSync, rmSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { elencoAzioni, eseguiAzione, type Esecutore } from "./azioni";
import { paginaConsole } from "./console";
import { Remoto } from "./remoto";
import type {
  Dispositivo,
  DispositivoPubblico,
  FornitoreAi,
  FornitoreLibreria,
  FornitorePannello,
  FornitorePreset,
  StatoRichiesta,
  StatoSuite,
} from "./types";

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
  /**
   * Chi sa rispondere sulla libreria dei risultati.
   *
   * Facoltativo: senza, le rotte `/libreria` rispondono che non c'è niente
   * invece di sparire. Un client che le chiama non deve dover indovinare se
   * questa suite le ha o no.
   */
  libreria?: FornitoreLibreria;
  /**
   * Chi sa rispondere sul pannello della connessione.
   *
   * Facoltativo come la libreria: senza, le rotte `/pannello` dicono 501 invece
   * di sparire. Un client che le chiama non deve indovinare se ci sono.
   */
  pannello?: FornitorePannello;
  /**
   * Chi sa far scrivere il modello, se questa suite ce l'ha.
   *
   * Facoltativo come gli altri: senza, le rotte dell'AI rispondono che qui non
   * c'e' nessuno a cui chiedere, invece di sparire.
   */
  ai?: FornitoreAi;
  /** Chi sa rispondere sui modi di generare messi da parte. */
  preset?: FornitorePreset;
}

/** Ogni quanto il gateway manda un segno di vita a chi è in ascolto. */
const BATTITO_SSE_MS = 20_000;

/**
 * Quanto può pesare un file mandato a mano a qualcuno: mezzo giga.
 *
 * Non è un limite tecnico ma una difesa: la rotta scrive sul disco quello
 * che le arriva, e senza un tetto chiunque sia collegato potrebbe riempire il
 * disco del computer con un unico invio che non finisce mai. Mezzo giga è
 * più di qualunque cosa la suite produca.
 */
const MASSIMO_REGALO = 512 * 1024 * 1024;

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
  private libreria: FornitoreLibreria | undefined;
  private pannello: FornitorePannello | undefined;
  private ai: FornitoreAi | undefined;
  private preset: FornitorePreset | undefined;

  constructor(opzioni: GatewayOpzioni) {
    this.remoto = opzioni.remoto;
    this.fornitoStato = opzioni.stato;
    this.esecutore = opzioni.esegui;
    this.versione = opzioni.versione;
    this.computer = opzioni.computer;
    this.libreria = opzioni.libreria;
    this.pannello = opzioni.pannello;
    this.ai = opzioni.ai;
    this.preset = opzioni.preset;
    this.server = createServer((req, res) => {
      void this.maneggia(req, res);
    });
  }

  /**
   * Si mette in ascolto; risolve con la porta reale (utile se 0 = random).
   *
   * `su` decide **chi può arrivare**: `0.0.0.0` vuol dire tutta la rete,
   * `127.0.0.1` vuol dire soltanto questo computer.
   *
   * È il modo in cui «spegnere la connessione» non spegne anche il pannello che
   * la governa: DaProdConnessione è una pagina servita da qui, e un pannello
   * che sparisce quando premi il suo interruttore è un pannello che non si può
   * più riaccendere. Spenta, la porta resta aperta solo verso l'interno.
   */
  ascolta(porta: number, su = "0.0.0.0"): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(porta, su, () => {
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

      /**
       * Il file di un regalo, letto **prima** di tutto il resto.
       *
       * `leggiCorpo` mette in memoria fino a un mega e poi butta: e' quello che
       * serve a un JSON e sarebbe la fine di un video da duecento. Qui il corpo
       * non e' JSON, e' il file: si controlla chi sta mandando e lo si scrive
       * sul disco mentre arriva, senza tenerlo in memoria.
       */
      if (percorso === "/invii" && req.method === "POST") {
        const chi = this.chiE(req, url);
        if (!chi) {
          this.errore(res, 401, "Token mancante o non riconosciuto.");
          return;
        }
        if (chi.ruolo !== "admin") {
          this.errore(res, 403, "Mandare un file lo puo' fare solo chi ha il permesso di decidere.");
          return;
        }
        await this.ricevi(req, res, chi, url);
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

      /**
       * Riscrivere una richiesta ferma, prima di farla partire.
       *
       * Le due strade del menu chiesto il 22 agosto 2026: `/testo` e' «scrivilo
       * io», `/migliora` e' «fallo riscrivere al modello». Le due si possono
       * anche usare di fila — riscrivo a mano, poi chiedo al modello di aprire
       * quello che ho scritto — e in tutti e due i casi quello che aveva scritto
       * la persona resta da parte.
       */
      const riscrittura = percorso.match(/^\/richieste\/([^/]+)\/(testo|migliora)$/);
      if (riscrittura && req.method === "POST") {
        const id = riscrittura[1] ?? "";
        const come = riscrittura[2];
        if (come === "migliora") {
          if (!this.ai) return this.errore(res, 501, "Questa suite non ha un modello a cui chiedere.");
          const richiesta = this.remoto.richiesta(id);
          if (!richiesta) return this.errore(res, 404, "Richiesta non trovata.");
          if (dispositivo.ruolo !== "admin") {
            return this.errore(res, 403, "Questo lo puo' fare solo chi ha il permesso di decidere.");
          }
          const partenza = ((corpo ?? {}) as { testo?: string }).testo?.trim() || richiesta.testo;
          let scritto: { testo: string; parole?: string };
          try {
            scritto = await this.ai.migliora({ testo: partenza, app: richiesta.app });
          } catch (err) {
            return this.errore(res, 502, err instanceof Error ? err.message : "Il modello non ha risposto.");
          }
          /**
           * Per un brano il modello scrive **anche le parole**, e finiscono
           * nella richiesta insieme alla descrizione: chi ha chiesto «una
           * canzone sul mare» dal telefono non ha nessuna voglia di scriversi
           * tre strofe su una tastiera piccola.
           *
           * Se aveva già scritto un testo suo, quello resta: il modello
           * riempie un vuoto, non sovrascrive una scelta.
           */
          const parole =
            scritto.parole && !richiesta.opzioni?.testo ? { testo: scritto.parole } : undefined;
          const male = this.remoto.riscrivi(id, dispositivo, scritto.testo, "ai", parole);
          if (male) return this.errore(res, 403, male);
        } else {
          const testo = ((corpo ?? {}) as { testo?: string }).testo ?? "";
          const male = this.remoto.riscrivi(id, dispositivo, testo, "mano");
          if (male) return this.errore(res, 403, male);
        }
        this.json(res, 200, this.remoto.richiesta(id));
        this.aggiorna();
        return;
      }

      // Mettere via una richiesta finita, o buttarla del tutto.
      const daTogliere = percorso.match(/^\/richieste\/([^/]+)$/);
      if (daTogliere && (req.method === "DELETE" || req.method === "PATCH")) {
        const id = daTogliere[1] ?? "";
        const male = this.remoto.metti(id, dispositivo, req.method === "DELETE" ? "cancella" : "archivia");
        if (male) return this.errore(res, 403, male);
        this.json(res, 200, { ok: true });
        this.aggiorna();
        return;
      }

      /* ----------------------------------------------------- il modello */

      // C'e' qualcuno a cui chiedere di scrivere? Lo chiede la pagina per
      // decidere se mostrare i tasti dell'AI o dire perche' non ci sono.
      if (percorso === "/ai" && req.method === "GET") {
        if (!this.ai) return this.json(res, 200, { ok: false, motivo: "Questa suite non ha un modello." });
        const motivo = await this.ai.disponibile();
        this.json(res, 200, { ok: motivo === null, motivo: motivo ?? undefined });
        return;
      }

      /**
       * Il tasto **Miglioralo**, quello che sta accanto alle caselle.
       *
       * Solo per chi decide, e non e' prudenza sui contenuti: e' che quattro GB
       * di scheda video occupati per riscrivere una frase sono quattro GB in
       * meno per la generazione che sta girando, e chi non decide non ha modo
       * di sapere cosa sta facendo il computer in quel momento.
       */
      if (percorso === "/ai/migliora" && req.method === "POST") {
        if (!this.ai) return this.errore(res, 501, "Questa suite non ha un modello a cui chiedere.");
        if (dispositivo.ruolo !== "admin") {
          return this.errore(res, 403, "I tasti dell'AI li puo' usare chi ha il permesso di decidere.");
        }
        const dati = (corpo ?? {}) as { testo?: string; app?: string };
        if (!dati.testo?.trim()) return this.errore(res, 400, "Scrivi prima qualcosa, anche due parole.");
        try {
          const scritto = await this.ai.migliora({
            testo: dati.testo.trim().slice(0, 4000),
            app: dati.app ?? "foto",
          });
          // `parole` c'è solo per i brani: è il testo da cantare, e la pagina
          // lo mette nella sua casella se è ancora vuota.
          this.json(res, 200, scritto);
        } catch (err) {
          this.errore(res, 502, err instanceof Error ? err.message : "Il modello non ha risposto.");
        }
        return;
      }

      /* ------------------------------------------------------ i preset */

      if (percorso === "/preset" && req.method === "GET") {
        this.json(res, 200, { preset: this.preset?.elenco(url.searchParams.get("app") || undefined) ?? [] });
        return;
      }
      if (percorso === "/preset" && req.method === "POST") {
        if (!this.preset) return this.errore(res, 501, "Questa suite non tiene i preset.");
        const dati = (corpo ?? {}) as { app?: string; nome?: string; testo?: string; campi?: Record<string, string> };
        if (!dati.app || !dati.nome?.trim() || !dati.testo?.trim()) {
          return this.errore(res, 400, "Un preset vuole la scheda, un nome e cosa deve dire.");
        }
        this.json(res, 201, this.preset.salva({
          app: dati.app,
          nome: dati.nome.trim().slice(0, 40),
          testo: dati.testo.trim().slice(0, 4000),
          campi: dati.campi,
          chi: dispositivo.id,
        }));
        return;
      }
      const preset = percorso.match(/^\/preset\/([^/]+)$/);
      if (preset && req.method === "DELETE") {
        if (!this.preset) return this.errore(res, 501, "Questa suite non tiene i preset.");
        const tolto = this.preset.elimina(preset[1] ?? "", dispositivo.id);
        this.json(res, tolto ? 200 : 403, { ok: tolto });
        return;
      }

      /* ------------------------------------------------------- i regali */

      if (percorso === "/invii" && req.method === "GET") {
        this.json(res, 200, { invii: this.remoto.inviiDi(dispositivo) });
        return;
      }
      const sulRegalo = percorso.match(/^\/invii\/([^/]+)(\/file|\/aperto)?$/);
      if (sulRegalo) {
        const id = sulRegalo[1] ?? "";
        const coda = sulRegalo[2] ?? "";
        if (coda === "/file" && (req.method === "GET" || req.method === "HEAD")) {
          this.mandaRegalo(req, res, dispositivo, id);
          return;
        }
        if (coda === "/aperto" && req.method === "POST") {
          this.json(res, 200, { ok: this.remoto.apri(id, dispositivo) });
          this.aggiorna();
          return;
        }
        if (!coda && req.method === "DELETE") {
          const tolto = this.remoto.scordaInvio(id, dispositivo);
          if (tolto) {
            try {
              rmSync(join(this.remoto.inviiDir, tolto.percorso));
            } catch {
              // Il file poteva gia' non esserci: l'elenco e' comunque a posto.
            }
          }
          this.json(res, tolto ? 200 : 404, { ok: Boolean(tolto) });
          this.aggiorna();
          return;
        }
      }

      // Scaricare il file di un risultato.
      const file = percorso.match(/^\/risultati\/(.+)$/);
      if (file && (req.method === "GET" || req.method === "HEAD")) {
        const nome = file[1];
        if (!nome) {
          this.errore(res, 404, "File non trovato.");
          return;
        }
        this.scarica(req, res, dispositivo, decodeURIComponent(nome));
        return;
      }

      /**
       * Pianta il biscotto di sessione, con il token che è già stato mostrato
       * nell'header.
       *
       * Serve alla galleria: un `<img>` o un `<video>` non sa mettere
       * `Authorization`, e senza biscotto ogni anteprima andrebbe scaricata in
       * memoria dal JavaScript. Il biscotto vale **solo per le GET** (vedi
       * `chiE`) ed è `SameSite=Strict`, quindi nessun altro sito può farlo
       * partire e niente che cambi qualcosa passa da lì.
       */
      if (percorso === "/sessione" && req.method === "POST") {
        res.setHeader(
          "Set-Cookie",
          `daprod_token=${encodeURIComponent(dispositivo.token)}; Path=/; Max-Age=2592000; SameSite=Strict; HttpOnly`,
        );
        this.json(res, 200, { ok: true });
        return;
      }

      // Chi sono io, per la pagina che si è appena aperta.
      //
      // La console mostra il nome accanto a tutto quello che si chiede — «chi è
      // chi» era la domanda di Cammo — e senza questa rotta doveva indovinarlo
      // da quello che aveva scritto al momento dell'accoppiamento, cioè da un
      // ricordo del browser che si perde svuotando la cronologia.
      if (percorso === "/io" && req.method === "GET") {
        /**
         * **Qui dentro ci vanno anche gli indirizzi**, dalla 0.7.5.
         *
         * Il difetto, visto sul telefono: l'indirizzo del tunnel cambia a ogni
         * accensione della suite, ma il telefono si ricorda quelli che gli
         * erano stati dati inquadrando il QR. Da fuori casa provava un
         * indirizzo Cloudflare morto e diceva «non raggiungibile» per sempre,
         * e l'unico modo di rimetterlo a posto era rifare l'accoppiamento.
         *
         * `/io` e' la porta a cui l'app bussa ogni volta che si apre. Farle
         * dire anche «e comunque adesso mi trovi qui» costa niente e chiude il
         * cerchio: basta che il telefono arrivi **una volta** — dalla wifi di
         * casa, di solito — e si porta a casa il tunnel nuovo da solo.
         */
        this.json(res, 200, {
          id: dispositivo.id,
          nome: dispositivo.nome,
          ruolo: dispositivo.ruolo,
          computer: this.computer,
          versione: this.versione,
          basi: this.pannello?.stato(dispositivo).indirizzi.map((i) => i.base) ?? [],
        });
        return;
      }

      // La libreria: cosa ha prodotto la suite, e i file per guardarla.
      if (percorso === "/libreria" && req.method === "GET") {
        this.json(res, 200, {
          voci:
            this.libreria?.elenco({
              tipo: url.searchParams.get("tipo") || undefined,
              app: url.searchParams.get("app") || undefined,
              quanti: Number(url.searchParams.get("quanti")) || 60,
              // Chi guarda decide cosa vede: le sue, o quelle che qualcuno ha
              // messo in bacheca. Non e' un filtro comodo, e' il permesso.
              chi: dispositivo.id,
              dove: url.searchParams.get("dove") === "bacheca" ? "bacheca" : "mie",
            }) ?? [],
        });
        return;
      }
      const dallaLibreria = percorso.match(/^\/libreria\/file\/(.+)$/);
      if (dallaLibreria && (req.method === "GET" || req.method === "HEAD")) {
        this.serviLibreria(req, res, decodeURIComponent(dallaLibreria[1] ?? ""), dispositivo);
        return;
      }

      /**
       * Mettere una cosa in bacheca, o toglierla.
       *
       * E' il gesto che regge tutta la parte «social» chiesta il 22 agosto:
       * ognuno vede le sue, e quello che vede degli altri e' quello che gli
       * altri hanno **deciso** di far vedere.
       */
      const inBacheca = percorso.match(/^\/libreria\/(.+)\/pubblica$/);
      if (inBacheca && req.method === "POST") {
        if (!this.libreria) return this.errore(res, 501, "Questa suite non ha la libreria.");
        const id = decodeURIComponent(inBacheca[1] ?? "");
        const voluto = ((corpo ?? {}) as { pubblicato?: boolean }).pubblicato !== false;
        const fatto = this.libreria.pubblica(id, dispositivo.id, voluto);
        this.json(res, fatto ? 200 : 403, { ok: fatto, pubblicato: voluto });
        this.aggiorna();
        return;
      }
      const daButtare = percorso.match(/^\/libreria\/(.+)$/);
      if (daButtare && req.method === "DELETE") {
        if (!this.libreria) return this.errore(res, 501, "Questa suite non ha la libreria.");
        const fatto = this.libreria.elimina(decodeURIComponent(daButtare[1] ?? ""), dispositivo.id);
        this.json(res, fatto ? 200 : 403, { ok: fatto });
        this.aggiorna();
        return;
      }

      /* ------------------------------------------------ il pannello */

      // Tutto quello che serve a sapere se la connessione funziona, in un
      // colpo: indirizzi, tunnel, firewall, chi è collegato, l'invito vivo.
      // Lo disegna DaProdConnessione, e lo stesso identico stato lo vedono il
      // portatile e il telefono — non tre verità diverse.
      if (percorso === "/pannello" && req.method === "GET") {
        if (!this.pannello) return this.errore(res, 501, "Questa suite non ha il pannello.");
        this.json(res, 200, this.pannello.stato(dispositivo));
        return;
      }

      const azionePannello = percorso.match(/^\/pannello\/(invito|tunnel|porta)$/);
      if (azionePannello && req.method === "POST") {
        if (!this.pannello) return this.errore(res, 501, "Questa suite non ha il pannello.");
        // Invitare qualcuno, accendere un tunnel e aprire una porta nel
        // firewall cambiano **il computer**, non una richiesta: le può fare
        // solo chi ha il permesso di decidere.
        if (dispositivo.ruolo !== "admin") {
          return this.errore(res, 403, "Questo lo può fare solo chi ha il permesso di decidere.");
        }
        const dati = (corpo ?? {}) as { ruolo?: string; quante?: number; acceso?: boolean };

        if (azionePannello[1] === "invito") {
          const invito = await this.pannello.invita({
            ruolo: dati.ruolo === "admin" ? "admin" : "ospite",
            // Un invito per più persone: con venti collegati, uno alla volta
            // vorrebbe dire venti giri al pannello.
            quante: Math.max(1, Math.min(50, Number(dati.quante) || 1)),
          });
          this.json(res, 201, invito);
          this.aggiorna();
          return;
        }
        if (azionePannello[1] === "tunnel") {
          await this.pannello.tunnel(dati.acceso === true);
          this.json(res, 200, this.pannello.stato(dispositivo));
          this.aggiorna();
          return;
        }
        const errore = await this.pannello.apriLaPorta();
        this.json(res, 200, { ok: errore === null, errore: errore ?? undefined });
        this.aggiorna();
        return;
      }

      const suUnDispositivo = percorso.match(/^\/dispositivi\/([^/]+)$/);
      if (suUnDispositivo && (req.method === "DELETE" || req.method === "POST")) {
        if (!this.pannello) return this.errore(res, 501, "Questa suite non ha il pannello.");
        const id = suUnDispositivo[1] ?? "";
        // **Chiunque può togliere sé stesso.** Per gli altri serve il permesso
        // di decidere: se no, con venti collegati, chiunque potrebbe buttare
        // fuori chiunque.
        const suoStesso = id === dispositivo.id;
        if (!suoStesso && dispositivo.ruolo !== "admin") {
          return this.errore(res, 403, "Puoi togliere solo te stesso.");
        }
        const dati = (corpo ?? {}) as { nome?: string; ruolo?: string };
        if (req.method === "POST" && (dati.ruolo === "admin" || dati.ruolo === "ospite")) {
          // Cambiare cosa puo' fare un altro e' un gesto da chi decide, e non
          // lo puo' fare su se' stesso: togliersi il permesso da soli vuol dire
          // restare chiusi fuori dal proprio computer.
          if (dispositivo.ruolo !== "admin" || suoStesso) {
            return this.errore(res, 403, "Il permesso di un altro lo cambia chi decide, e non su di se'.");
          }
          this.remoto.cambiaRuolo(id, dati.ruolo);
        } else if (req.method === "POST" && typeof dati.nome === "string" && dati.nome.trim()) {
          this.pannello.rinomina(id, dati.nome.trim().slice(0, 40));
        } else if (req.method === "DELETE") {
          this.pannello.revoca(id);
        } else {
          return this.errore(res, 400, "Non ho capito cosa cambiare di questa persona.");
        }
        this.json(res, 200, { ok: true });
        this.aggiorna();
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

    /**
     * Il biscotto, e perché **solo in lettura**.
     *
     * Un tag `<img>` o `<video>` non sa mettere un header: senza biscotto la
     * galleria della console non potrebbe mostrare niente senza scaricare ogni
     * file in memoria. Il biscotto lo pianta `/sessione`, che il token ce
     * l'aveva nell'header, ed è `SameSite=Strict`.
     *
     * Accettarlo anche sulle POST vorrebbe dire che una pagina di un altro sito
     * potrebbe far partire una generazione dal browser di chi è collegato — il
     * classico CSRF. Limitandolo a GET e HEAD quella strada non esiste: tutto
     * ciò che cambia qualcosa vuole ancora l'header, che solo il nostro
     * JavaScript sa mettere.
     */
    const soloLettura = req.method === "GET" || req.method === "HEAD";
    if (!token && soloLettura) token = biscotto(req, "daprod_token");

    // `EventSource` non sa mettere header e non sempre porta i biscotti: per la
    // sola rotta dello stato si accetta anche il token in query.
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
  private scarica(
    req: IncomingMessage,
    res: ServerResponse,
    dispositivo: Dispositivo,
    nome: string,
  ): void {
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
    /**
     * **A pezzi, se il client li chiede.** Prima qui si mandava tutto insieme,
     * e per un video voleva dire due cose: che non si poteva spostare la barra
     * di scorrimento, e che un telefono con la linea ballerina ricominciava da
     * capo a ogni intoppo invece di riprendere da dove era. È la stessa
     * gestione della galleria, che adesso è scritta in un posto solo.
     */
    this.mandaConPezzi(
      req,
      res,
      assoluto,
      richiesta.risultato.tipo,
      richiesta.risultato.bytes,
      richiesta.risultato.nome,
    );
  }

  /**
   * Manda un file della libreria, **a pezzi se il client li chiede**.
   *
   * Il supporto a `Range` non è un lusso: senza, un `<video>` in una pagina web
   * può solo scaricare tutto il file prima di partire, e non si può spostare la
   * barra di scorrimento. Su un film di mezz'ora vuol dire aspettare i cento MB
   * e non poter saltare a metà — cioè una galleria che non si guarda.
   *
   * Dal gateway esce **solo** un percorso che la libreria ha riconosciuto da un
   * id suo: quello che arriva da Internet è l'id, mai un percorso.
   */
  private serviLibreria(
    req: IncomingMessage,
    res: ServerResponse,
    id: string,
    chi: Dispositivo,
  ): void {
    const voce = this.libreria?.file(id, chi.id);
    if (!voce) {
      this.errore(res, 404, "Non trovo questo file nella libreria.");
      return;
    }

    this.mandaConPezzi(req, res, voce.percorso, voce.mime, voce.bytes);
  }

  /**
   * Manda un file, **a pezzi se il client li chiede**.
   *
   * Nata dentro la galleria e tirata fuori quando sono arrivati i regali: un
   * video ricevuto da una persona si guarda come uno generato dalla suite, e
   * scrivere due volte la stessa gestione di `Range` voleva dire due modi
   * diversi di sbagliarla.
   */
  private mandaConPezzi(
    req: IncomingMessage,
    res: ServerResponse,
    percorso: string,
    mime: string,
    bytesAttesi: number,
    scaricaCome?: string,
  ): void {
    let dimensione = bytesAttesi;
    try {
      dimensione = statSync(percorso).size;
    } catch {
      this.errore(res, 404, "Il file non è più sul disco.");
      return;
    }

    const comuni: Record<string, string | number> = {
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      // È roba di casa e non cambia mai: farla richiedere di nuovo a ogni
      // scorrimento della galleria costa banda per niente.
      "Cache-Control": "private, max-age=86400",
    };
    if (scaricaCome) {
      comuni["Content-Disposition"] = `attachment; filename="${scaricaCome.replace(/"/g, "")}"`;
    }

    if (req.method === "HEAD") {
      res.writeHead(200, { ...comuni, "Content-Length": dimensione });
      res.end();
      return;
    }

    const chiesto = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
    if (chiesto) {
      const da = chiesto[1] ? Number(chiesto[1]) : 0;
      const a = chiesto[2] ? Math.min(Number(chiesto[2]), dimensione - 1) : dimensione - 1;
      if (!(da >= 0 && a >= da && da < dimensione)) {
        res.writeHead(416, { "Content-Range": `bytes */${dimensione}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...comuni,
        "Content-Length": a - da + 1,
        "Content-Range": `bytes ${da}-${a}/${dimensione}`,
      });
      createReadStream(percorso, { start: da, end: a }).pipe(res);
      return;
    }

    res.writeHead(200, { ...comuni, "Content-Length": dimensione });
    createReadStream(percorso).pipe(res);
  }

  /* ------------------------------------------------------------- i regali */

  /**
   * Riceve il file di un regalo e lo scrive sul disco mentre arriva.
   *
   * **Perché non passa dal JSON.** Il corpo delle altre rotte si legge in
   * memoria con un tetto di un mega: giusto per un modulo, impossibile per un
   * video. Qui il corpo è il file, e va dal socket al disco senza tappe.
   *
   * Il nome arriva da chi manda e non lo si crede: quello che finisce sul disco
   * è un nome fatto qui, senza barre e senza punti in testa. Il nome vero
   * resta nell'archivio, ed è quello che legge chi riceve.
   */
  private async ricevi(
    req: IncomingMessage,
    res: ServerResponse,
    da: Dispositivo,
    url: URL,
  ): Promise<void> {
    const a = url.searchParams.get("a") ?? "";
    const nome = (url.searchParams.get("nome") ?? "file").slice(0, 120);
    const messaggio = (url.searchParams.get("messaggio") ?? "").slice(0, 300) || undefined;
    const mime = String(req.headers["content-type"] ?? "application/octet-stream").split(";")[0]!.trim();

    if (!a) {
      this.errore(res, 400, "Manca a chi mandarlo.");
      req.destroy();
      return;
    }
    const atteso = Number(req.headers["content-length"] ?? 0);
    if (atteso > MASSIMO_REGALO) {
      this.errore(res, 413, `Un file più grande di ${Math.round(MASSIMO_REGALO / 1_000_000)} MB non passa di qui.`);
      req.destroy();
      return;
    }

    mkdirSync(this.remoto.inviiDir, { recursive: true });
    const suDisco = `${Date.now().toString(36)}-${nome.replace(/[^\p{L}\p{N} _.()\[\]-]+/gu, "_")}`.replace(
      /^\.+/,
      "",
    );
    const dove = join(this.remoto.inviiDir, suDisco);

    let scritti = 0;
    try {
      await new Promise<void>((risolvi, rifiuta) => {
        const fuori = createWriteStream(dove);
        req.on("data", (pezzo: Buffer) => {
          scritti += pezzo.length;
          if (scritti > MASSIMO_REGALO) {
            fuori.destroy();
            req.destroy();
            rifiuta(new Error("Il file è troppo grande."));
          }
        });
        req.on("error", rifiuta);
        fuori.on("error", rifiuta);
        fuori.on("finish", () => risolvi());
        req.pipe(fuori);
      });
    } catch (err) {
      try {
        rmSync(dove);
      } catch {
        // Non c'era, o non si lascia togliere: non cambia la risposta.
      }
      this.errore(res, 400, err instanceof Error ? err.message : "Il file non è arrivato intero.");
      return;
    }

    if (scritti === 0) {
      try {
        rmSync(dove);
      } catch {
        // Idem: era vuoto comunque.
      }
      this.errore(res, 400, "Il file era vuoto.");
      return;
    }

    const esito = this.remoto.regala({
      a,
      daNome: da.nome,
      nome,
      mime,
      bytes: scritti,
      percorso: suDisco,
      messaggio,
    });
    if ("errore" in esito) {
      try {
        rmSync(dove);
      } catch {
        // Il regalo non parte: il file non serve a nessuno.
      }
      this.errore(res, 404, esito.errore);
      return;
    }
    this.json(res, 201, esito);
    this.aggiorna();
  }

  /** Il file di un regalo, a chi era destinato e a nessun altro. */
  private mandaRegalo(
    req: IncomingMessage,
    res: ServerResponse,
    dispositivo: Dispositivo,
    id: string,
  ): void {
    const invio = this.remoto.invio(id, dispositivo);
    if (!invio) {
      this.errore(res, 404, "Nessun pacco con questo nome, e di sicuro non tuo.");
      return;
    }
    const assoluto = normalize(join(this.remoto.inviiDir, invio.percorso));
    if (!assoluto.startsWith(this.remoto.inviiDir)) {
      this.errore(res, 403, "Percorso fuori dalla cartella dei regali.");
      return;
    }
    this.mandaConPezzi(req, res, assoluto, invio.mime, invio.bytes, invio.nome);
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
      // `media-src` è arrivato con la galleria: senza, i `<video>` e gli
      // `<audio>` della libreria non partono e non dicono perché. `blob:` serve
      // ai download, che passano da un oggetto in memoria per poter avere il
      // nome giusto del file.
      "Content-Security-Policy":
        "default-src 'none'; connect-src 'self'; img-src 'self' data: blob:; " +
        "media-src 'self' blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
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

/** Il valore di un biscotto nella richiesta, o stringa vuota. */
function biscotto(req: IncomingMessage, nome: string): string {
  const riga = req.headers.cookie;
  if (!riga) return "";
  for (const pezzo of riga.split(";")) {
    const taglio = pezzo.indexOf("=");
    if (taglio < 0) continue;
    if (pezzo.slice(0, taglio).trim() !== nome) continue;
    return decodeURIComponent(pezzo.slice(taglio + 1).trim());
  }
  return "";
}
