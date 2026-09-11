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
import { deflateSync } from "node:zlib";
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

/**
 * Due secondi di silenzio, in un WAV fatto qui.
 *
 * Serve a una cosa sola: avere un **lettore vero** davanti quando si guarda
 * una card. Non si sente niente ed e' giusto cosi' — quello che si controlla
 * e' che il tasto play ci sia, che ci si arrivi col dito e che la barra si
 * muova. Non si scarica niente da fuori: il banco di prova non chiama la rete.
 */
let silenzio = "";
function silenzioFinto() {
  if (silenzio) return silenzio;
  const secondi = 2;
  const frequenza = 8000;
  const campioni = secondi * frequenza;
  const testa = Buffer.alloc(44);
  testa.write("RIFF", 0);
  testa.writeUInt32LE(36 + campioni, 4);
  testa.write("WAVE", 8);
  testa.write("fmt ", 12);
  testa.writeUInt32LE(16, 16);
  testa.writeUInt16LE(1, 20);   // PCM
  testa.writeUInt16LE(1, 22);   // mono
  testa.writeUInt32LE(frequenza, 24);
  testa.writeUInt32LE(frequenza, 28);
  testa.writeUInt16LE(1, 32);
  testa.writeUInt16LE(8, 34);   // otto bit
  testa.write("data", 36);
  testa.writeUInt32LE(campioni, 40);
  // A otto bit il silenzio e' 128, non zero: zero sarebbe il fondo scala.
  const corpo = Buffer.alloc(campioni, 128);
  silenzio = "data:audio/wav;base64," + Buffer.concat([testa, corpo]).toString("base64");
  return silenzio;
}

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

/**
 * ⚠ **Una foto vera, grande come quelle della galleria.**
 *
 * Detto l'11 settembre 2026: «in attacca una cosa dalla suite le immagini sono
 * sempre una sopra l'altra». Qui non si vedeva, e il motivo e' il solito: il
 * banco aveva solo quadrati SVG da trecento pixel con la misura scritta sopra,
 * mentre nella galleria vera una foto e' un PNG da mille e passa, e il suo
 * francobollo **e' la foto stessa**. Un banco di prova che non sa produrre la
 * cosa che si rompe non e' un banco di prova.
 *
 * Il PNG si fa qui a mano — righe di pixel, zlib, e il CRC di ogni pezzo —
 * perche' il banco non scarica niente e non si porta dietro librerie.
 */
const TABELLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(dati) {
  let c = 0xffffffff;
  for (const b of dati) c = TABELLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pezzoPng(tipo, dati) {
  const lunga = Buffer.alloc(4);
  lunga.writeUInt32BE(dati.length);
  const dentro = Buffer.concat([Buffer.from(tipo, "ascii"), dati]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(dentro));
  return Buffer.concat([lunga, dentro, crc]);
}

const fotoFatte = new Map();
function fotoFinta(n, larga, alta) {
  const chiave = n + "-" + larga + "x" + alta;
  if (fotoFatte.has(chiave)) return fotoFatte.get(chiave);
  const colori = [[92, 200, 255], [255, 111, 181], [255, 209, 102], [127, 209, 168]];
  const [r, g, b] = colori[n % colori.length];
  const righe = [];
  for (let y = 0; y < alta; y++) {
    // Il primo byte di ogni riga e' il filtro: zero, cioe' nessuno.
    const riga = Buffer.alloc(1 + larga * 3);
    // Strisce larghe, cosi' si vede se la foto e' tagliata o schiacciata.
    const f = Math.floor(y / 96) % 2 === 0 ? 1 : 0.62;
    for (let x = 0; x < larga; x++) {
      const o = 1 + x * 3;
      riga[o] = r * f;
      riga[o + 1] = g * f;
      riga[o + 2] = b * f;
    }
    righe.push(riga);
  }
  const testa = Buffer.alloc(13);
  testa.writeUInt32BE(larga, 0);
  testa.writeUInt32BE(alta, 4);
  testa[8] = 8; // otto bit per canale
  testa[9] = 2; // rosso, verde, blu
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pezzoPng("IHDR", testa),
    pezzoPng("IDAT", deflateSync(Buffer.concat(righe))),
    pezzoPng("IEND", Buffer.alloc(0)),
  ]);
  fotoFatte.set(chiave, png);
  return png;
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
   *
   * Nella suite la da' il gateway. Qui dentro ci sono le tre specie che quel
   * foglio deve tenere divise — immagini, brani, video — e non piu' solo
   * quadrati: dal 12 settembre 2026 la galleria si divide per mucchi, e un
   * banco di prova fatto di sole immagini non fa vedere l'unica cosa nuova.
   *
   * Le proporzioni restano sbilenche apposta: e' il caso che quel foglio
   * sbagliava prima, e continua a doverlo reggere.
   */
  elencoLibreria: () => {
    const misure = [[320, 180], [180, 320], [400, 400], [512, 288], [240, 360], [640, 200]];
    const voci = misure.map((m, i) => ({
      id: "lib" + i,
      titolo: "roba della suite " + (i + 1),
      mime: "image/svg+xml",
      url: quadratoFinto(i + 1, m[0], m[1]),
    }));
    // Le foto come arrivano dalla galleria vera: PNG grandi, e il francobollo
    // e' la foto stessa (vedi «/libreria/anteprima» nel gateway).
    const grandi = [[1024, 1024], [1536, 1024], [1024, 1536], [2048, 1152]];
    grandi.forEach((m, i) => {
      const dove = "/finta/foto/" + (i + 1) + "-" + m[0] + "x" + m[1] + ".png";
      voci.push({
        id: "foto" + i,
        titolo: "foto vera " + (i + 1) + " (" + m[0] + "×" + m[1] + ")",
        mime: "image/png",
        url: dove,
        anteprima: dove,
      });
    });
    for (let i = 0; i < 3; i++) {
      voci.push({
        id: "brano" + i,
        titolo: "una canzone " + (i + 1),
        mime: "audio/wav",
        url: silenzioFinto(),
        // La copertina, come la fa la suite: senza, un brano in galleria e' un
        // rettangolo grigio uguale agli altri due.
        anteprima: quadratoFinto(i + 1, 300, 300),
      });
    }
    voci.push({
      id: "video0",
      titolo: "un video",
      mime: "video/mp4",
      url: "",
      anteprima: quadratoFinto(4, 320, 180),
    });
    return voci;
  },
  fruttiDi: (richiesta) => {
    const cosa = inForno.get(richiesta);
    if (!cosa || Date.now() < cosa.pronta) return [];
    /**
     * ⚠ **Da un prompt di musica esce un brano, non un quadrato.**
     *
     * Fino all'11 settembre 2026 questo banco tornava un'immagine anche per la
     * musica, e si vede perche' era comodo: un quadrato colorato si fa in una
     * riga. Il prezzo l'ha pagato il 12, quando Cammo ha detto «le canzoni non
     * si sentono»: il lettore schiacciato dentro una casella da centodieci
     * pixel non si poteva provare qui, perche' qui un lettore non compariva
     * mai. Un banco di prova che non sa produrre la cosa che si rompe non e'
     * un banco di prova.
     */
    if (cosa.tavolo !== "immagini") {
      return [
        {
          id: richiesta,
          titolo: "prova numero " + cosa.numero,
          mime: "audio/wav",
          url: silenzioFinto(),
          anteprima: quadratoFinto(cosa.numero, 300, 300),
        },
      ];
    }
    return [
      {
        id: richiesta,
        titolo: "prova numero " + cosa.numero,
        mime: "image/svg+xml",
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

  const foto = percorso.match(/^\/finta\/foto\/(\d+)-(\d+)x(\d+)\.png$/);
  if (foto) {
    const png = fotoFinta(Number(foto[1]), Math.min(4096, Number(foto[2])), Math.min(4096, Number(foto[3])));
    res.writeHead(200, { "content-type": "image/png", "cache-control": "max-age=3600" });
    res.end(png);
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
