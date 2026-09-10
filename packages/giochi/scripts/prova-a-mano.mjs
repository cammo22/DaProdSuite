/**
 * Il serverino per provarla a mano, **prima** di unirla alla suite.
 *
 *     node packages/giochi/scripts/prova-a-mano.mjs
 *
 * Poi si apre nel browser:
 *
 *     http://localhost:8791/giochi#t=cammo    ← tu, che decidi
 *     http://localhost:8791/giochi#t=pino     ← uno che gioca e basta
 *
 * Due schede aperte insieme e si vede il giro intero: pino monta una riga e la
 * manda, cammo se la trova nella Fila, le da' un prezzo, e a pino arrivano le
 * lire.
 *
 * ⚠ **Questo file non entra nella suite.** E' un ponte per le mani, e sotto ci
 * sono **le stesse identiche funzioni** che chiamera' il gateway: `rispondi()`
 * per le rotte e `paginaGiochi()` per la pagina. E' l'unico modo di provarla
 * adesso senza scrivere una seconda versione — che sarebbe quella che poi
 * diverge.
 *
 * Il file di gioco sta in `packages/giochi/.prova/giochi.json`, che non entra
 * nel repo: si puo' cancellare quando si vuole per ricominciare da zero.
 */

import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Deposito, paginaGiochi, rispondi } from "../dist/index.js";

const QUI = dirname(fileURLToPath(import.meta.url));
const CARTELLA = join(QUI, "..", ".prova");
mkdirSync(CARTELLA, { recursive: true });

const deposito = new Deposito(join(CARTELLA, "giochi.json"));
const PORTA = Number(process.env.PORTA || 8791);

/**
 * Chi sei, qui dentro.
 *
 * Nella suite lo dice il token del dispositivo e il ruolo lo decide la suite.
 * Qui il token **e'** il nome, cosi' si aprono due schede e si e' due persone
 * diverse senza accoppiare niente. Chi si chiama «cammo» decide.
 */
function chiSei(req) {
  const testa = String(req.headers["authorization"] || "");
  const nome = (testa.startsWith("Bearer ") ? testa.slice(7) : "").trim() || "ospite";
  return { id: nome, nome: nome.charAt(0).toUpperCase() + nome.slice(1), admin: nome === "cammo" };
}

/**
 * ⚠ **Un motore finto, per poter provare a mano il giro delle generate.**
 *
 * Nella suite «provala» fa partire una generazione vera con ACE-Step o FLUX, e
 * quando e' pronta la libreria dice cosa ne e' uscito. Qui non c'e' ne' l'una
 * ne' l'altra, e senza qualcosa al loro posto il pezzo piu' nuovo della fila —
 * quattro tentativi che tornano sulla card e si spuntano — **non si puo'
 * guardare** se non accendendo tutta la suite col motore dietro.
 *
 * Quindi: si finge, e si finge anche il tempo. Sei secondi di forno, perche' e'
 * li' che si vede se la card dice «sto generando» e se si aggiorna da sola
 * senza far perdere il bonus scritto a mano nella casella accanto.
 *
 * I quadrati colorati sono immagini vere fatte qui, non prese da fuori: la
 * pagina non chiama la rete nemmeno per provare.
 */
const FORNO_MS = 6000;
const inForno = new Map();
let quanteFatte = 0;

function quadratoFinto(n, larga = 320, alta = 240) {
  const colori = ["#5cc8ff", "#ff6fb5", "#ffd166", "#7fd1a8"];
  const c = colori[n % colori.length];
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + larga + "' height='" + alta + "'>" +
    "<rect width='" + larga + "' height='" + alta + "' fill='" + c + "'/>" +
    "<text x='" + larga / 2 + "' y='" + (alta / 2 + 24) +
    "' font-size='72' text-anchor='middle' fill='#101218'>" + n + "</text>" +
    "</svg>";
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/** I nomi degli altri: nella suite li sa il gateway, qui sono gli id stessi. */
const contorno = {
  nomeDi: (id) => (id ? id.charAt(0).toUpperCase() + id.slice(1) : "qualcuno"),
  genera: (_chi, tavolo) => {
    quanteFatte += 1;
    const id = "finta-" + quanteFatte;
    inForno.set(id, { pronta: Date.now() + FORNO_MS, numero: quanteFatte, tavolo });
    return { id };
  },
  /**
   * Una galleria finta, per poter guardare il foglio «attacca dalla suite».
   * Nella suite la da' il gateway; qui sono sei quadrati con proporzioni
   * diverse, che e' proprio il caso che quel foglio deve reggere.
   */
  elencoLibreria: () => {
    const misure = [[320, 180], [180, 320], [400, 400], [512, 288], [240, 360], [640, 200]];
    return misure.map((m, i) => ({
      id: "lib" + i,
      titolo: "roba della suite " + (i + 1),
      mime: "image/svg+xml",
      url: quadratoFinto(i + 1, m[0], m[1]),
    }));
  },
  fruttiDi: (richiesta) => {
    const cosa = inForno.get(richiesta);
    if (!cosa || Date.now() < cosa.pronta) return [];
    return [
      {
        id: richiesta,
        titolo: "prova numero " + cosa.numero,
        mime: cosa.tavolo === "immagini" ? "image/svg+xml" : "image/svg+xml",
        url: quadratoFinto(cosa.numero),
      },
    ];
  },
};

function leggiCorpo(req) {
  return new Promise((risolvi) => {
    let pezzi = "";
    req.on("data", (c) => {
      pezzi += c;
      // Un megabyte e' molto piu' di quello che serve a un JSON di questa
      // pagina: oltre, si smette invece di riempire la memoria.
      if (pezzi.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        risolvi(pezzi ? JSON.parse(pezzi) : {});
      } catch {
        risolvi({});
      }
    });
    req.on("error", () => risolvi({}));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const percorso = url.pathname;

  if (percorso === "/" || percorso === "/giochi") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(paginaGiochi("/giochi"));
    return;
  }

  if (percorso.startsWith("/giochi/")) {
    const corpo = req.method === "POST" ? await leggiCorpo(req) : {};
    const risposta = rispondi(
      deposito,
      chiSei(req),
      contorno,
      req.method ?? "GET",
      percorso.slice("/giochi".length),
      corpo,
    );
    res.writeHead(risposta.codice, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(risposta.dati));
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Qui non c'e' niente.");
});

// Si scrive comunque alla chiusura: il deposito rimanda le scritture di mezzo
// secondo, e un Ctrl+C nel mezzo si porterebbe via l'ultimo giro.
for (const segnale of ["SIGINT", "SIGTERM"]) {
  process.on(segnale, () => {
    deposito.scriviOra();
    process.exit(0);
  });
}

server.listen(PORTA, () => {
  console.log("");
  console.log("  DaProdGiochi gira qui:");
  console.log("");
  console.log("    http://localhost:" + PORTA + "/giochi#t=cammo   <- tu, che decidi");
  console.log("    http://localhost:" + PORTA + "/giochi#t=pino    <- uno che gioca");
  console.log("");
  console.log("  Il file di gioco: " + join(CARTELLA, "giochi.json"));
  console.log("  Ctrl+C per fermarlo.");
  console.log("");
});
