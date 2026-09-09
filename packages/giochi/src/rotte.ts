/**
 * Le rotte della sala giochi: cosa si puo' chiedere al PC, e chi lo puo'
 * chiedere.
 *
 * ⚠ **E' una funzione, non un server.** Non apre porte, non conosce HTTP,
 * non sa cos'e' un token. Prende «chi sei», «cosa chiedi» e «cosa mi porti», e
 * torna un numero e un oggetto. Cosi' la stessa identica funzione la chiama il
 * gateway della suite **e** il serverino delle prove: c'e' una sola idea di
 * cosa si puo' fare, e nessuna delle due puo' divergere dall'altra.
 *
 * Chi sei lo decide chi chiama, non questo file: nella suite lo dice il token
 * del dispositivo, e il ruolo `admin` e' quello della suite. Qui dentro
 * `chi.admin` si legge e basta — se un giorno si potesse mentire su quello, il
 * problema non sarebbe qui.
 */

import {
  apriPacchetto,
  butta,
  classifica,
  manda,
  NienteDaFare,
  prendi,
  serie,
  serieChiuse,
  statoMagazzino,
  tira,
} from "./banco";
import type { Deposito } from "./deposito";
import { GRADI, lire, raritaDiPrezzo } from "./regole";
import { rulliDi } from "./rulli";
import type { Combinazione, Tavolo } from "./tipi";

/** Chi sta chiedendo. Nella suite e' il dispositivo accoppiato. */
export interface Chi {
  id: string;
  nome: string;
  admin: boolean;
}

/**
 * Quello che il gioco non sa e deve chiedere a chi lo ospita.
 *
 * I **nomi** delle persone non stanno nel gioco: stanno nella suite, insieme
 * alle facce e ai permessi. Tenerne una copia qui vorrebbe dire che il giorno
 * che uno cambia nome, in classifica resta quello vecchio.
 */
export interface Contorno {
  nomeDi(id: string): string;
  /** La faccia, se chi ci ospita ne ha una. Serve solo alla classifica. */
  facciaDi?(id: string): string | undefined;
}

export interface Risposta {
  codice: number;
  dati: unknown;
}

const OK = (dati: unknown): Risposta => ({ codice: 200, dati });
const NO = (codice: number, perche: string): Risposta => ({ codice, dati: { errore: perche } });

/** Il tavolo chiesto, o quello di partenza. Musica: e' la prima slot. */
function tavoloDi(corpo: Record<string, unknown>): Tavolo {
  return corpo["tavolo"] === "immagini" ? "immagini" : "musica";
}

function numero(cosa: unknown, seManca: number): number {
  const n = typeof cosa === "number" ? cosa : Number(cosa);
  return Number.isFinite(n) ? n : seManca;
}

/**
 * Una combinazione come la puo' vedere **questa** persona.
 *
 * Chi non ce l'ha in collezione vede il titolo, il prezzo e chi l'ha fatta, ma
 * **non il prompt**: se no non ci sarebbe niente da sbloccare, e l'album
 * sarebbe un elenco invece di una raccolta. L'admin vede tutto, perche' deve
 * poterle controllare.
 */
function vestita(c: Combinazione, contorno: Contorno, scoperta: boolean) {
  return {
    id: c.id,
    titolo: c.titolo,
    prompt: scoperta ? c.prompt : "",
    scoperta,
    numero: c.numero ?? 0,
    prezzo: c.prezzo ?? 0,
    rarita: raritaDiPrezzo(c.prezzo ?? 0),
    stato: c.stato,
    motivo: c.motivo ?? "",
    daChi: c.daChi,
    daNome: contorno.nomeDi(c.daChi),
    quando: c.quando,
    tavolo: c.tavolo,
  };
}

/**
 * Risponde a una richiesta della sala giochi.
 *
 * `percorso` e' senza il pezzo davanti: chi ospita ha gia' tolto `/giochi`.
 */
export function rispondi(
  deposito: Deposito,
  chi: Chi,
  contorno: Contorno,
  metodo: string,
  percorso: string,
  corpo: Record<string, unknown>,
): Risposta {
  try {
    /* ------------------------------------------------------------- chi sono */

    if (metodo === "GET" && (percorso === "/io" || percorso === "/")) {
      const conto = deposito.conto(chi.id);
      const imp = deposito.impostazioni();
      return OK({
        chi: chi.id,
        nome: chi.nome,
        admin: chi.admin,
        saldo: conto.saldo,
        saldoScritto: lire(conto.saldo),
        conto: {
          giri: conto.giri,
          mandate: conto.mandate,
          prese: conto.prese,
          collezione: conto.collezione.length,
          colpoGrosso: conto.colpoGrosso,
        },
        // I numeri che si vedono: quanto costa una cosa, non come si pesca.
        costi: {
          giro: imp.costoGiro,
          pacchetto: imp.costoPacchetto,
          perPacchetto: imp.perPacchetto,
          perSerie: imp.perSerie,
        },
        gradi: GRADI,
        tavoli: [
          { id: "musica", nome: "Musica", rulli: rulliDi("musica") },
          { id: "immagini", nome: "Immagini", rulli: rulliDi("immagini") },
        ],
        magazzino: statoMagazzino(deposito),
      });
    }

    /* ---------------------------------------------------------------- girare */

    if (metodo === "POST" && percorso === "/gira") {
      const bloccati = Array.isArray(corpo["bloccati"])
        ? (corpo["bloccati"] as unknown[]).map((x) => (typeof x === "string" && x ? x : null))
        : [];
      const giro = tira(deposito, chi.id, tavoloDi(corpo), bloccati, Math.random);
      return OK({
        ...giro,
        saldoScritto: lire(giro.saldo),
        regalo: giro.regalo ? vestita(giro.regalo, contorno, true) : null,
      });
    }

    /* --------------------------------------------------------------- mandare */

    if (metodo === "POST" && percorso === "/manda") {
      const pezzi = Array.isArray(corpo["pezzi"]) ? (corpo["pezzi"] as string[]) : [];
      const c = manda(deposito, chi.id, tavoloDi(corpo), pezzi);
      return OK(vestita(c, contorno, true));
    }

    if (metodo === "GET" && percorso === "/mie") {
      const conto = deposito.conto(chi.id);
      const mandate = deposito
        .combinazioni()
        .filter((c) => c.daChi === chi.id)
        .sort((a, b) => b.quando - a.quando)
        .map((c) => vestita(c, contorno, true));
      const collezione = deposito
        .magazzino()
        .filter((c) => conto.collezione.includes(c.id))
        .map((c) => vestita(c, contorno, true));
      return OK({ mandate, collezione });
    }

    /* ------------------------------------------------------------- l'album */

    if (metodo === "GET" && percorso === "/album") {
      const conto = deposito.conto(chi.id);
      const chiuse = serieChiuse(deposito);
      const quale = Math.max(1, Math.min(chiuse || 1, numero(corpo["serie"], chiuse || 1)));
      const dentro = serie(deposito, quale).map((c) =>
        vestita(c, contorno, conto.collezione.includes(c.id) || chi.admin),
      );
      return OK({ serie: quale, chiuse, figurine: dentro, magazzino: statoMagazzino(deposito) });
    }

    if (metodo === "POST" && percorso === "/pacchetto") {
      const apertura = apriPacchetto(deposito, chi.id, numero(corpo["serie"], 1), Math.random);
      return OK({
        ...apertura,
        saldoScritto: lire(apertura.saldo),
        figurine: apertura.figurine.map((f) => ({
          ...vestita(f.combinazione, contorno, true),
          doppione: f.doppione,
          lire: f.lire,
        })),
      });
    }

    /* ---------------------------------------------------------- la classifica */

    if (metodo === "GET" && percorso === "/classifica") {
      return OK({
        righe: classifica(deposito).map((r) => ({
          ...r,
          nome: contorno.nomeDi(r.chi),
          faccia: contorno.facciaDi ? contorno.facciaDi(r.chi) : undefined,
          io: r.chi === chi.id,
        })),
      });
    }

    /* ------------------------------------------------------ la fila dell'admin */

    if (percorso.startsWith("/fila") || percorso === "/prendi" || percorso === "/butta") {
      if (!chi.admin) return NO(403, "Questa parte e' di chi decide.");
    }

    if (metodo === "GET" && percorso === "/fila") {
      const inAttesa = deposito
        .combinazioni()
        .filter((c) => c.stato === "in-attesa")
        .sort((a, b) => a.quando - b.quando)
        .map((c) => vestita(c, contorno, true));
      const decise = deposito
        .combinazioni()
        .filter((c) => c.stato !== "in-attesa")
        .sort((a, b) => (b.decisa ?? 0) - (a.decisa ?? 0))
        .slice(0, 30)
        .map((c) => vestita(c, contorno, true));
      return OK({ inAttesa, decise, magazzino: statoMagazzino(deposito) });
    }

    if (metodo === "POST" && percorso === "/prendi") {
      const c = prendi(deposito, chi.id, String(corpo["id"] ?? ""), numero(corpo["prezzo"], 0));
      return OK(vestita(c, contorno, true));
    }

    if (metodo === "POST" && percorso === "/butta") {
      const c = butta(deposito, chi.id, String(corpo["id"] ?? ""), String(corpo["motivo"] ?? ""));
      return OK(vestita(c, contorno, true));
    }

    return NO(404, "Qui non c'e' niente.");
  } catch (errore) {
    // Un «non si puo'» detto in italiano e' una risposta, non un guasto: si
    // manda come tale, con dentro la frase, che la pagina mostra cosi' com'e'.
    if (errore instanceof NienteDaFare) return NO(409, errore.message);
    console.error("[giochi] rotta " + percorso + " caduta", errore);
    return NO(500, "Qualcosa e' andato storto qui dentro.");
  }
}
