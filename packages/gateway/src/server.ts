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
 *   GET  /macchina                              → chi lavora, chi aspetta, le regole
 *   POST /macchina/pausa  { inPausa }            → «sto usando il computer» (solo il PC)
 *   POST /macchina/regole { … }                  → chi passa subito e i tetti (solo il PC)
 *   DELETE /macchina/fila/:id                   → toglie un lavoro non ancora partito
 *   POST /macchina/ferma                        → ferma quello che gira adesso (solo il PC)
 *   POST /macchina/accetta-tutte                → dà il sì a tutto quello che aspetta
 *   POST /richieste/:id/rifai  { testo? }        → rifallo, uguale o modificato
 *   GET  /stili                                 → i tuoi stili (immagine, video, musica)
 *   POST /stili   { id?, nome, testo, tipo }     → salvane uno, o cambialo
 *   DELETE /stili/:id                           → buttalo
 *   POST /stili/:id/condividi { condiviso }      → mettilo in vetrina, o toglilo
 *   GET  /stili/vetrina                         → quelli che gli altri hanno messo in mostra
 *   POST /stili/vetrina/prendi { nome, testo, daNome } → copialo fra i tuoi
 *   GET  /modelli                               → i modelli con cui si può parlare
 *   GET  /chiacchierata                         → la tua sessione viva, se c'è
 *   POST /chiacchierata   { modello }            → cominciane una (dieci minuti)
 *   POST /chiacchierata/:id/dico  { testo }      → una battuta, e la risposta
 *   POST /chiacchierata/:id/piano { quali }      → accetta il piano: i lavori partono
 *   DELETE /chiacchierata/:id                   → chiudila e libera la memoria
 *   DELETE /chiacchierata/attesa                → esci dalla coda per parlare
 *   POST /io/profilo      { motto }              → cambia la riga sotto al nome
 *   POST /io/foto                               → la foto del profilo (il corpo è il file)
 *   POST /bacheca?nome=&didascalia=             → carica una cosa tua in bacheca
 *   GET  /libreria/anteprima/:id                → il fotogramma o la copertina
 *   POST /libreria/:id/mipiace { mipiace }       → mi piace, o non più
 *   POST /libreria/:id/tengo   { tengo }         → tienila fra le tue cose
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
  FornitoreChiacchierata,
  FornitoreLibreria,
  FornitoreMacchina,
  FornitorePannello,
  FornitorePreset,
  FornitoreStili,
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
  /**
   * Chi sa dire com'è messo il computer, e governarne la fila.
   *
   * Facoltativo come gli altri: senza, `/macchina` dice 501 invece di sparire.
   */
  macchina?: FornitoreMacchina;
  /** Chi sa reggere una chiacchierata con un modello, se questa suite ce l'ha. */
  chiacchierata?: FornitoreChiacchierata;
  /** Chi tiene gli stili musicali di ogni persona. */
  stili?: FornitoreStili;
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

/**
 * Quanto può pesare una foto del profilo: quattro mega.
 *
 * È un quadratino da 200 px: quattro mega sono già una foto scattata col
 * telefono senza pensarci. Oltre, non è una foto del profilo — è un errore.
 */
const MASSIMO_FOTO = 4 * 1024 * 1024;

/**
 * Quanto può pesare una cosa caricata a mano in bacheca: cento mega.
 *
 * Meno di un regalo, e apposta: un regalo va a **una** persona che lo ha
 * chiesto, una cosa in bacheca la vedono tutti e resta lì. Cento mega sono un
 * video di qualche minuto, che è quello che ha senso mostrare in una bacheca.
 */
const MASSIMO_IN_BACHECA = 100 * 1024 * 1024;

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
  private macchina: FornitoreMacchina | undefined;
  private chiacchierata: FornitoreChiacchierata | undefined;
  private stili: FornitoreStili | undefined;

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
    this.macchina = opzioni.macchina;
    this.chiacchierata = opzioni.chiacchierata;
    this.stili = opzioni.stili;
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

      /**
       * La foto del profilo, e le cose caricate a mano in bacheca.
       *
       * Stanno **qui**, insieme ai regali e prima di `leggiCorpo`, per la stessa
       * ragione: il corpo è il file, non un JSON. Leggerlo in memoria per poi
       * riscriverlo sul disco vorrebbe dire tenere cento mega in RAM per niente.
       */
      if (percorso === "/io/foto" && req.method === "POST") {
        const chi = this.chiE(req, url);
        if (!chi) {
          this.errore(res, 401, "Token mancante o non riconosciuto.");
          return;
        }
        await this.riceviFotoProfilo(req, res, chi, url);
        return;
      }
      if (percorso === "/bacheca" && req.method === "POST") {
        const chi = this.chiE(req, url);
        if (!chi) {
          this.errore(res, 401, "Token mancante o non riconosciuto.");
          return;
        }
        await this.riceviInBacheca(req, res, chi, url);
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
        // Gli stili di chi sta chiedendo finiscono dentro il campo «uno stile
        // pronto»: il catalogo non può conoscerli, sono di ogni persona.
        this.json(
          res,
          200,
          elencoAzioni(dispositivo, this.stili ? (chi) => this.stili!.miei(chi) : undefined),
        );
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
      /**
       * Rifallo: uguale, o con il testo cambiato.
       *
       * Chiesto il 26 agosto 2026: «la possibilità di riutilizzare quel prompt,
       * rifarlo oppure rifarlo ma prima modificarlo». Nasce una richiesta
       * **nuova**, col suo numero: un lavoro finito è un fatto, e riscriverlo
       * vorrebbe dire non capire più cosa è successo quando.
       */
      const daRifare = percorso.match(/^\/richieste\/([^/]+)\/rifai$/);
      if (daRifare && req.method === "POST") {
        const dati = (corpo ?? {}) as { testo?: string };
        const esito = this.remoto.rifai(
          decodeURIComponent(daRifare[1] ?? ""),
          dispositivo,
          typeof dati.testo === "string" ? dati.testo.slice(0, 4000) : undefined,
        );
        if ("errore" in esito) return this.errore(res, 403, esito.errore);
        this.json(res, 201, { ok: true, richiesta: esito });
        this.aggiorna();
        return;
      }

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
          // Il profilo, dalla 0.7.6: la faccia e la riga sotto al nome. Senza,
          // in DaProd uno è una stringa di testo fra altre stringhe di testo.
          foto: dispositivo.foto ? `/io/foto/${encodeURIComponent(dispositivo.id)}` : undefined,
          motto: dispositivo.motto,
        });
        return;
      }

      /** La riga sotto al nome. La cambia solo chi sta dietro a quel nome. */
      if (percorso === "/io/profilo" && req.method === "POST") {
        const dati = (corpo ?? {}) as { motto?: string; nome?: string };
        if (typeof dati.nome === "string" && dati.nome.trim()) {
          // Il nome resta unico, anche cambiandolo: vedi `rinomina`. Un no qui
          // vuol dire «quel nome è di un altro», ed è l'unica ragione possibile.
          if (!this.remoto.rinomina(dispositivo.id, dati.nome)) {
            return this.errore(res, 409, `«${dati.nome.trim()}» è già di qualcun altro. Scegline un altro.`);
          }
        }
        if (typeof dati.motto === "string") {
          this.remoto.cambiaProfilo(dispositivo.id, { motto: dati.motto });
        }
        this.json(res, 200, { ok: true, nome: dispositivo.nome, motto: dispositivo.motto });
        this.aggiorna();
        return;
      }

      /**
       * La foto di qualcuno, per mostrarla accanto alle sue cose in bacheca.
       *
       * La vedono tutti quelli collegati, e non è una svista: una bacheca in
       * cui le facce si vedono solo a sé stessi non è una bacheca. Quello che
       * non si vede da qui è tutto il resto di quella persona.
       */
      const laFotoDi = percorso.match(/^\/io\/foto\/([^/]+)$/);
      if (laFotoDi && (req.method === "GET" || req.method === "HEAD")) {
        const chi = this.remoto
          .listaDispositivi()
          .find((d) => d.id === decodeURIComponent(laFotoDi[1] ?? ""));
        if (!chi?.foto) return this.errore(res, 404, "Questa persona non ha una foto.");
        const assoluto = normalize(join(this.remoto.inviiDir, chi.foto));
        if (!assoluto.startsWith(this.remoto.inviiDir)) {
          return this.errore(res, 403, "Percorso fuori dalla cartella.");
        }
        this.mandaConPezzi(req, res, assoluto, "image/*", 0);
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
      /**
       * L'anteprima: il fotogramma di un video, la copertina di un brano.
       *
       * **Il difetto che chiude, detto da chi lo vedeva:** «i video, la
       * thumbnail — un frame si deve vedere, ora non lo hanno, poi se lo fai
       * partire esce». Un `<video>` senza poster è un rettangolo nero finché
       * non premi play: in una galleria di dodici riquadri neri non si
       * riconosce niente.
       *
       * Chi non ha anteprima riceve un 404, non un errore: la pagina lo sa
       * già dal campo `anteprima` dell'elenco e non la chiede nemmeno.
       */
      const anteprimaDi = percorso.match(/^\/libreria\/anteprima\/(.+)$/);
      if (anteprimaDi && (req.method === "GET" || req.method === "HEAD")) {
        if (!this.libreria?.anteprima) return this.errore(res, 404, "Niente anteprime qui.");
        const percorsoFile = await this.libreria.anteprima(
          decodeURIComponent(anteprimaDi[1] ?? ""),
          dispositivo.id,
        );
        if (!percorsoFile) return this.errore(res, 404, "Per questa non c'è un'anteprima.");
        /**
         * **Il tipo si legge dal file, non si decide qui.**
         *
         * Prima era scritto `image/jpeg` fisso, e sembrava ragionevole: le
         * anteprime dei video le scrive FFmpeg in JPEG, e le copertine dei
         * brani sono `.cover.jpg`. Ma l'anteprima di **un'immagine è
         * l'immagine stessa** — un PNG, quasi sempre — e queste risposte
         * escono con `X-Content-Type-Options: nosniff`, che vieta al browser di
         * indovinare. Risultato: un PNG dichiarato JPEG veniva rifiutato, e in
         * galleria le immagini restavano dei riquadri vuoti.
         *
         * Visto in un browser vero il 26 agosto 2026, non leggendo il codice.
         */
        this.mandaConPezzi(req, res, percorsoFile, mimeDiUnImmagine(percorsoFile), 0);
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
      /**
       * Mi piace. **Su qualunque cosa si veda in bacheca, non solo sulle proprie.**
       *
       * È il gesto più piccolo di DaProd ed è quello che lo fa esistere: senza,
       * chi mette una cosa in bacheca non sa se l'ha guardata qualcuno, e la
       * volta dopo non ce la mette.
       */
      const ilMiPiace = percorso.match(/^\/libreria\/(.+)\/mipiace$/);
      if (ilMiPiace && req.method === "POST") {
        if (!this.libreria?.miPiace) return this.errore(res, 501, "Qui non si mette mi piace.");
        const quanti = this.libreria.miPiace(
          decodeURIComponent(ilMiPiace[1] ?? ""),
          dispositivo.id,
          ((corpo ?? {}) as { mipiace?: boolean }).mipiace !== false,
        );
        if (quanti === null) return this.errore(res, 404, "Questa non la trovo, o non la puoi vedere.");
        this.json(res, 200, { ok: true, quanti });
        this.aggiorna();
        return;
      }

      /** Tenere da parte una cosa di un altro: compare fra le proprie. */
      const daTenere = percorso.match(/^\/libreria\/(.+)\/tengo$/);
      if (daTenere && req.method === "POST") {
        if (!this.libreria?.tieni) return this.errore(res, 501, "Qui non si tiene niente da parte.");
        const fatto = this.libreria.tieni(
          decodeURIComponent(daTenere[1] ?? ""),
          dispositivo.id,
          ((corpo ?? {}) as { tengo?: boolean }).tengo !== false,
        );
        this.json(res, fatto ? 200 : 404, { ok: fatto });
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

      /* ------------------------------------------------ la macchina */

      /**
       * Com'è messo il computer: chi lavora, chi aspetta, quali sono le regole.
       *
       * La leggono tutti — chi aspetta ha diritto di sapere **perché** aspetta
       * — ma gli interruttori li vede e li preme solo il computer stesso.
       */
      if (percorso === "/macchina" && req.method === "GET") {
        if (!this.macchina) return this.errore(res, 501, "Questa suite non governa la fila.");
        this.json(res, 200, this.macchina.stato(dispositivo));
        return;
      }

      const governo = percorso.match(/^\/macchina\/(pausa|regole)$/);
      if (governo && req.method === "POST") {
        if (!this.macchina) return this.errore(res, 501, "Questa suite non governa la fila.");
        /**
         * **Solo dal computer, e questa riga è tutto il punto.**
         *
         * Chiesto così: «vorrei mettere solo su pc la possibilità di accettare
         * le richieste in automatico e limitarle con un pulsante», e «il pc è
         * il vero admin». Un telefono con i permessi da admin decide sulle
         * richieste degli altri — quello sì — ma non può alzarsi i limiti a cui
         * è sottoposto: se potesse, non sarebbero limiti.
         */
        if (!this.macchina.stato(dispositivo).sonoLaCasa) {
          return this.errore(
            res,
            403,
            "Questo si cambia solo dal computer, da DaProdConnessione.",
          );
        }
        const dati = (corpo ?? {}) as {
          inPausa?: boolean;
          chiPassaSubito?: string;
          limiteFila?: number;
          limitePersona?: number;
        };
        if (governo[1] === "pausa") {
          this.macchina.pausa(dati.inPausa === true);
        } else {
          this.macchina.regole({
            chiPassaSubito:
              dati.chiPassaSubito === "mai" || dati.chiPassaSubito === "tutti"
                ? dati.chiPassaSubito
                : "admin",
            limiteFila: Math.max(0, Math.min(100, Number(dati.limiteFila) || 0)),
            limitePersona: Math.max(0, Math.min(100, Number(dati.limitePersona) || 0)),
          });
        }
        this.json(res, 200, this.macchina.stato(dispositivo));
        this.aggiorna();
        return;
      }

      const dallaFila = percorso.match(/^\/macchina\/fila\/([^/]+)$/);
      if (dallaFila && req.method === "DELETE") {
        if (!this.macchina) return this.errore(res, 501, "Questa suite non governa la fila.");
        const quale = decodeURIComponent(dallaFila[1] ?? "");
        /**
         * **Uscire dalla propria fila è un diritto, non un permesso.**
         *
         * Chiesto il 26 agosto 2026: «ti mette in coda e ti fa vedere in che
         * posizione sei, e volendo puoi anche abbandonare la coda». Chi ha
         * chiesto una cosa e ha cambiato idea non deve chiedere il permesso a
         * nessuno per toglierla: sta liberando la macchina, non occupandola.
         *
         * Il lavoro di un altro invece lo toglie chi decide.
         */
        const sua = this.remoto.richiesta(quale)?.daDispositivo === dispositivo.id;
        if (!sua && dispositivo.ruolo !== "admin") {
          return this.errore(res, 403, "Puoi togliere dalla fila solo i tuoi lavori.");
        }
        const errore = this.macchina.togli(quale);
        this.json(res, errore ? 409 : 200, { ok: !errore, errore: errore ?? undefined });
        this.aggiorna();
        return;
      }

      /**
       * Ferma quello che gira adesso. **Solo dal computer.**
       *
       * Non è «togli dalla fila»: quello non è ancora partito, questo sì, e il
       * tempo di scheda video già speso si butta. Un telefono che potesse
       * fermare la generazione di un altro sarebbe un telecomando per rovinare
       * il pomeriggio a qualcuno.
       */
      if (percorso === "/macchina/ferma" && req.method === "POST") {
        if (!this.macchina) return this.errore(res, 501, "Questa suite non governa la fila.");
        if (!this.macchina.stato(dispositivo).sonoLaCasa) {
          return this.errore(res, 403, "Fermare una generazione si fa solo dal computer.");
        }
        const errore = this.macchina.fermaAdesso();
        this.json(res, errore ? 409 : 200, { ok: !errore, errore: errore ?? undefined });
        this.aggiorna();
        return;
      }

      /**
       * Il sì a tutto quello che aspetta, in un colpo.
       *
       * Lo può fare chi decide — è la stessa cosa che farebbe premendo venti
       * volte «fallo così com'è», e i tetti della fila valgono lo stesso.
       */
      if (percorso === "/macchina/accetta-tutte" && req.method === "POST") {
        if (!this.macchina) return this.errore(res, 501, "Questa suite non governa la fila.");
        if (dispositivo.ruolo !== "admin") {
          return this.errore(res, 403, "Questo lo può fare solo chi ha il permesso di decidere.");
        }
        const quante = this.macchina.accettaTutte();
        this.json(res, 200, { ok: true, quante });
        this.aggiorna();
        return;
      }

      /* ------------------------------------------- la chiacchierata */

      /** Con chi si può parlare: i modelli installati su quel computer. */
      if (percorso === "/modelli" && req.method === "GET") {
        if (!this.chiacchierata) return this.json(res, 200, { modelli: [] });
        this.json(res, 200, { modelli: await this.chiacchierata.modelli() });
        return;
      }

      /**
       * La mia chiacchierata: la sessione, oppure il posto in fila.
       *
       * Tutte e due nella stessa risposta, e non è pigrizia: chi guarda deve
       * poter passare da «sei terzo» a «stai parlando» senza che nessuno gli
       * dica di cambiare rotta.
       */
      if (percorso === "/chiacchierata" && req.method === "GET") {
        if (!this.chiacchierata) return this.json(res, 200, { sessione: null, attesa: null });
        this.json(res, 200, {
          sessione: this.chiacchierata.mia(dispositivo.id),
          attesa: this.chiacchierata.attesa(dispositivo.id),
        });
        return;
      }

      if (percorso === "/chiacchierata" && req.method === "POST") {
        if (!this.chiacchierata) {
          return this.errore(res, 501, "Su questo computer non c'è nessuno con cui parlare.");
        }
        const dati = (corpo ?? {}) as { modello?: string };
        const esito = await this.chiacchierata.comincia({
          dispositivoId: dispositivo.id,
          chiNome: dispositivo.nome,
          modello: String(dati.modello ?? ""),
        });
        if ("errore" in esito) return this.errore(res, 409, esito.errore);
        // 201 se si parla già, 202 se si è in fila: sono due cose diverse, e
        // chi legge il codice della risposta non deve indovinare quale.
        this.json(res, "sessione" in esito ? 201 : 202, esito);
        this.aggiorna();
        return;
      }

      /**
       * Esco dalla coda. **Un diritto, non un permesso.**
       *
       * Chi si è messo in fila e ha cambiato idea sta liberando la macchina:
       * non deve chiedere niente a nessuno.
       */
      if (percorso === "/chiacchierata/attesa" && req.method === "DELETE") {
        if (!this.chiacchierata) return this.json(res, 200, { ok: true });
        const uscito = this.chiacchierata.esci(dispositivo.id);
        this.json(res, 200, { ok: uscito });
        this.aggiorna();
        return;
      }

      const inChiacchierata = percorso.match(/^\/chiacchierata\/([^/]+)(\/dico|\/piano)?$/);
      if (inChiacchierata) {
        if (!this.chiacchierata) {
          return this.errore(res, 501, "Su questo computer non c'è nessuno con cui parlare.");
        }
        const id = decodeURIComponent(inChiacchierata[1] ?? "");
        const coda = inChiacchierata[2];

        if (coda === "/dico" && req.method === "POST") {
          const testo = String(((corpo ?? {}) as { testo?: string }).testo ?? "").trim();
          if (!testo) return this.errore(res, 400, "Non hai scritto niente.");
          const esito = await this.chiacchierata.dico({
            id,
            dispositivoId: dispositivo.id,
            testo: testo.slice(0, 4000),
          });
          if ("errore" in esito) return this.errore(res, 409, esito.errore);
          this.json(res, 200, esito);
          return;
        }
        if (coda === "/piano" && req.method === "POST") {
          const dati = (corpo ?? {}) as { quali?: number[]; modelli?: Record<string, string> };
          /**
           * Con quale modello generare, scelto **adesso**.
           *
           * Chiesto il 26 agosto 2026: «quando parlo con llm devo poter
           * scegliere poi che modello usare una volta che il piano è pronto».
           * Ha ragione: il modello che *genera* non è quello che *scrive*, e la
           * scelta ha senso farla guardando il piano — non prima, quando ancora
           * non si sa cosa si farà.
           */
          const modelli: Record<string, string> = {};
          for (const [azione, quale] of Object.entries(dati.modelli ?? {})) {
            if (typeof quale === "string" && quale.trim()) {
              modelli[String(azione).slice(0, 40)] = quale.trim().slice(0, 80);
            }
          }
          const esito = await this.chiacchierata.accetta({
            id,
            dispositivoId: dispositivo.id,
            quali: Array.isArray(dati.quali) ? dati.quali.map(Number).filter(Number.isFinite) : [],
            modelli,
          });
          if ("errore" in esito) return this.errore(res, 409, esito.errore);
          this.json(res, 201, esito);
          this.aggiorna();
          return;
        }
        if (!coda && req.method === "DELETE") {
          this.chiacchierata.chiudi(id, dispositivo.id);
          this.json(res, 200, { ok: true });
          this.aggiorna();
          return;
        }
      }

      /* --------------------------------------------------- gli stili */

      /**
       * Gli stili musicali, uno per persona.
       *
       * **Perché una scheda tutta sua**, chiesta il 26 agosto 2026: uno stile
       * è la cosa che uno costruisce una volta e usa per mesi, e fino alla
       * 0.7.6 viveva nel `localStorage` di DaProdMusica — cioè era di *quel
       * browser*, non di quella persona. Cambiavi dispositivo e non c'era più.
       */
      if (percorso === "/stili" && req.method === "GET") {
        if (!this.stili) return this.json(res, 200, { stili: [] });
        this.json(res, 200, { stili: this.stili.miei(dispositivo.id) });
        return;
      }

      if (percorso === "/stili" && req.method === "POST") {
        if (!this.stili) return this.errore(res, 501, "Questa suite non tiene gli stili.");
        const dati = (corpo ?? {}) as {
          id?: string;
          nome?: string;
          testo?: string;
          tipo?: string;
        };
        const salvato = this.stili.salva(dispositivo.id, {
          id: dati.id,
          nome: String(dati.nome ?? ""),
          testo: String(dati.testo ?? ""),
          tipo: dati.tipo ? String(dati.tipo) : undefined,
        });
        if (!salvato) return this.errore(res, 400, "Servono un nome e delle parole.");
        this.json(res, 201, { ok: true, stile: salvato });
        return;
      }

      if (percorso === "/stili/vetrina" && req.method === "GET") {
        if (!this.stili) return this.json(res, 200, { stili: [] });
        this.json(res, 200, { stili: this.stili.vetrina(dispositivo.id) });
        return;
      }

      /**
       * Prendere uno stile di un altro: **se ne fa una copia.**
       *
       * Non un riferimento, e non è un dettaglio: dal momento in cui è tuo, chi
       * l'ha fatto può cambiarlo o toglierlo dalla vetrina senza che a te
       * sparisca da sotto le mani. Resta scritto di chi era, che è l'unica cosa
       * che vale la pena ricordare.
       */
      if (percorso === "/stili/vetrina/prendi" && req.method === "POST") {
        if (!this.stili) return this.errore(res, 501, "Questa suite non tiene gli stili.");
        const dati = (corpo ?? {}) as {
          nome?: string;
          testo?: string;
          tipo?: string;
          daNome?: string;
        };
        const preso = this.stili.salva(dispositivo.id, {
          nome: String(dati.nome ?? ""),
          testo: String(dati.testo ?? ""),
          tipo: dati.tipo ? String(dati.tipo) : undefined,
          da: "preso",
          daNome: dati.daNome ? String(dati.daNome).slice(0, 40) : undefined,
        });
        if (!preso) return this.errore(res, 400, "Questo stile non si può copiare.");
        this.json(res, 201, { ok: true, stile: preso });
        return;
      }

      const inVetrina = percorso.match(/^\/stili\/([^/]+)\/condividi$/);
      if (inVetrina && req.method === "POST") {
        if (!this.stili) return this.errore(res, 501, "Questa suite non tiene gli stili.");
        const voluto = ((corpo ?? {}) as { condiviso?: boolean }).condiviso !== false;
        const fatto = this.stili.condividi(
          dispositivo.id,
          decodeURIComponent(inVetrina[1] ?? ""),
          voluto,
        );
        this.json(res, fatto ? 200 : 404, { ok: fatto, condiviso: voluto });
        return;
      }

      const daButtareStile = percorso.match(/^\/stili\/([^/]+)$/);
      if (daButtareStile && req.method === "DELETE") {
        if (!this.stili) return this.errore(res, 501, "Questa suite non tiene gli stili.");
        const fatto = this.stili.togli(dispositivo.id, decodeURIComponent(daButtareStile[1] ?? ""));
        this.json(res, fatto ? 200 : 404, { ok: fatto });
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

  /**
   * Scrive il corpo della richiesta sul disco mentre arriva, e dice quanto pesa.
   *
   * Tirata fuori quando i file da ricevere sono diventati tre — un regalo, una
   * foto del profilo, una cosa da mettere in bacheca — e tutti e tre facevano
   * la stessa identica cosa. Tre copie di questo ciclo sarebbero state tre modi
   * diversi di dimenticarsi di cancellare il file quando qualcosa va storto.
   *
   * Torna il nome del file sul disco e i byte scritti, oppure il motivo.
   */
  private async scriviIlCorpo(
    req: IncomingMessage,
    nomeChiesto: string,
    massimo: number,
  ): Promise<{ suDisco: string; bytes: number } | { errore: string; codice: number }> {
    const atteso = Number(req.headers["content-length"] ?? 0);
    if (atteso > massimo) {
      req.destroy();
      return {
        errore: `Un file più grande di ${Math.round(massimo / 1_000_000)} MB non passa di qui.`,
        codice: 413,
      };
    }

    mkdirSync(this.remoto.inviiDir, { recursive: true });
    // Il nome arriva da fuori e non si crede: quello che finisce sul disco è un
    // nome fatto qui, senza barre e senza punti in testa.
    const suDisco = `${Date.now().toString(36)}-${nomeChiesto
      .slice(0, 120)
      .replace(/[^\p{L}\p{N} _.()\[\]-]+/gu, "_")}`.replace(/^\.+/, "");
    const dove = join(this.remoto.inviiDir, suDisco);

    let scritti = 0;
    try {
      await new Promise<void>((risolvi, rifiuta) => {
        const fuori = createWriteStream(dove);
        req.on("data", (pezzo: Buffer) => {
          scritti += pezzo.length;
          if (scritti > massimo) {
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
      buttaIlFile(dove);
      return {
        errore: err instanceof Error ? err.message : "Il file non è arrivato intero.",
        codice: 400,
      };
    }

    if (scritti === 0) {
      buttaIlFile(dove);
      return { errore: "Il file era vuoto.", codice: 400 };
    }
    return { suDisco, bytes: scritti };
  }

  /**
   * La foto del profilo.
   *
   * Sta nella cartella dei regali come un file qualunque: non serve un posto
   * nuovo per un quadratino da 200 px, e quella cartella ha già le regole
   * giuste — dentro ci si arriva solo per id, mai per percorso.
   *
   * La foto di prima si butta: chi ne mette una nuova non vuole tenere le
   * vecchie, e senza questa riga la cartella crescerebbe a ogni ripensamento.
   */
  private async riceviFotoProfilo(
    req: IncomingMessage,
    res: ServerResponse,
    chi: Dispositivo,
    url: URL,
  ): Promise<void> {
    const mime = String(req.headers["content-type"] ?? "").split(";")[0]!.trim();
    if (!mime.startsWith("image/")) {
      this.errore(res, 415, "La foto del profilo dev'essere un'immagine.");
      req.destroy();
      return;
    }
    const esito = await this.scriviIlCorpo(
      req,
      url.searchParams.get("nome") ?? "profilo.jpg",
      MASSIMO_FOTO,
    );
    if ("errore" in esito) {
      this.errore(res, esito.codice, esito.errore);
      return;
    }
    const prima = chi.foto;
    this.remoto.cambiaProfilo(chi.id, { foto: esito.suDisco });
    if (prima && prima !== esito.suDisco) buttaIlFile(join(this.remoto.inviiDir, prima));
    this.json(res, 201, { ok: true, foto: `/io/foto/${encodeURIComponent(chi.id)}` });
    this.aggiorna();
  }

  /**
   * Una cosa caricata a mano, da mettere in bacheca.
   *
   * **Perché non è un regalo.** Un regalo va a una persona, si apre una volta e
   * poi è suo. Questo entra in libreria, ha un autore e una didascalia, e lo
   * vedono tutti: è un pezzo di DaProd, non un pacco.
   *
   * Nasce già pubblicata — chi carica un file *per la bacheca* non vuole poi
   * doverlo anche pubblicare — e resta cancellabile solo da chi l'ha messa.
   */
  private async riceviInBacheca(
    req: IncomingMessage,
    res: ServerResponse,
    chi: Dispositivo,
    url: URL,
  ): Promise<void> {
    if (!this.libreria?.aggiungi) {
      this.errore(res, 501, "Questa suite non ha la bacheca.");
      req.destroy();
      return;
    }
    const nome = (url.searchParams.get("nome") ?? "file").slice(0, 120);
    const didascalia = (url.searchParams.get("didascalia") ?? "").slice(0, 300) || undefined;
    const mime = String(req.headers["content-type"] ?? "application/octet-stream")
      .split(";")[0]!
      .trim();

    const esito = await this.scriviIlCorpo(req, nome, MASSIMO_IN_BACHECA);
    if ("errore" in esito) {
      this.errore(res, esito.codice, esito.errore);
      return;
    }

    const voce = this.libreria.aggiungi({
      percorso: join(this.remoto.inviiDir, esito.suDisco),
      nome,
      mime,
      bytes: esito.bytes,
      chi: chi.id,
      chiNome: chi.nome,
      didascalia,
    });
    if (!voce) {
      buttaIlFile(join(this.remoto.inviiDir, esito.suDisco));
      this.errore(res, 400, "Non sono riuscito a metterla in bacheca.");
      return;
    }
    this.json(res, 201, { ok: true, voce });
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

/**
 * Butta un file senza far storie se non c'era.
 *
 * Si chiama sempre nei rami in cui qualcosa è andato storto, dove sollevare un
 * altro errore vorrebbe dire nascondere il primo.
 */
function buttaIlFile(percorso: string): void {
  try {
    rmSync(percorso);
  } catch {
    // Non c'era, o non si lascia togliere: non cambia la risposta a chi ha mandato.
  }
}

/**
 * Il tipo di un'immagine dall'estensione del file.
 *
 * Serve alle anteprime, che possono essere un JPEG (il fotogramma di un video,
 * la copertina di un brano) o qualunque cosa sia l'immagine originale. Il
 * fallback è `image/jpeg` e non `image/*`: un tipo con l'asterisco, con
 * `nosniff` attivo, non è un tipo che il browser accetta.
 */
function mimeDiUnImmagine(percorso: string): string {
  const coda = percorso.slice(percorso.lastIndexOf(".") + 1).toLowerCase();
  const noti: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  };
  return noti[coda] ?? "image/jpeg";
}
