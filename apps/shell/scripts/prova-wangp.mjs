/**
 * WanGP dentro la suite, messo alla prova senza WanGP e senza Electron.
 *
 *     node apps/shell/scripts/prova-wangp.mjs
 *
 * Tre cose, tutte della 1.7.7:
 *
 * 1. **Il gateway porta la pagina intera di WanGP a chi decide, e a nessun
 *    altro.** Un finto WanGP (un server che risponde come Gradio: pagina, SSE,
 *    upload, WebSocket) sta dietro un gateway vero. Si guarda chi entra, cosa
 *    arriva a WanGP — mai i biscotti né il token nostri — e che le richieste
 *    che scrivono passino intere.
 * 2. **Il traduttore**: cosa diventa «un brano» o «una foto da cambiare»
 *    quando lo fa WanGP.
 * 3. **Il ponte in Python**, con controfigure (services/wangp/prove).
 *
 * ⚠ Non prova WanGP vero: quello si prova a mano, e la prova dice cosa è stato
 * provato e quando (CHANGELOG, «Provato»). Vuole `pnpm run build` già fatto.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const radiceRepo = join(import.meta.dirname, "..", "..", "..");
const G = require(join(radiceRepo, "packages", "gateway", "dist", "index.js"));

let falliti = 0;
function dice(nome, condizione, extra = "") {
  if (condizione) console.log(`  ok   ${nome}`);
  else {
    falliti++;
    console.log(`  NO   ${nome} ${extra}`);
  }
}

/* ------------------------------------------------------ il finto WanGP */

const visti = []; // cosa ha ricevuto WanGP: metodo, percorso, intestazioni
const PAGINA = "<!doctype html><html><head><title>WanGP</title></head><body><h1>WanGP finto</h1>" + "x".repeat(200_000) + "</body></html>";

const wangpFinto = createServer((req, res) => {
  const pezzi = [];
  req.on("data", (p) => pezzi.push(p));
  req.on("end", () => {
    const corpo = Buffer.concat(pezzi);
    visti.push({ metodo: req.method, percorso: req.url, testate: req.headers, byte: corpo.length });
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(PAGINA);
    }
    if (url.pathname === "/config") return res.writeHead(200, { "content-type": "application/json" }).end('{"ok":1}');
    if (url.pathname === "/assets/a.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end("console.log('ciao');".repeat(2000));
    }
    if (url.pathname === "/gradio_api/upload") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ byte: corpo.length }));
    }
    if (url.pathname === "/gradio_api/queue/data") {
      // Come Gradio: uno stream che non finisce subito. Il primo pezzo deve
      // arrivare **prima** della fine, o il proxy sta trattenendo tutto.
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write("data: uno\n\n");
      setTimeout(() => res.end("data: due\n\n"), 700);
      return;
    }
    if (url.pathname === "/gradio_api/file=grande") {
      const tutto = Buffer.from("0123456789".repeat(10));
      const r = req.headers.range;
      if (r) {
        res.writeHead(206, { "content-type": "video/mp4", "content-range": "bytes 0-9/100", "content-length": 10 });
        return res.end(tutto.subarray(0, 10));
      }
      res.writeHead(200, { "content-type": "video/mp4", "content-length": 100 });
      return res.end(tutto);
    }
    res.writeHead(404).end("no");
  });
});
// Un WebSocket vero, fatto a mano: la stretta di mano e un messaggio.
wangpFinto.on("upgrade", (req, socket) => {
  visti.push({ metodo: "UPGRADE", percorso: req.url, testate: req.headers, byte: 0 });
  const accetta = createHash("sha1").update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accetta + "\r\n\r\n",
  );
  socket.write(Buffer.from([0x81, 0x04, 0x63, 0x69, 0x61, 0x6f])); // testo «ciao»
});
await new Promise((r) => wangpFinto.listen(0, "127.0.0.1", r));
const portaWanGP = wangpFinto.address().port;

/* --------------------------------------------------------- il gateway */

const radice = mkdtempSync(join(tmpdir(), "daprod-prova-wangp-"));
const remoto = new G.Remoto(new G.Archivio(join(radice, "remoto.json")), radice);
const admin = remoto.accoppia(remoto.nuovoInvito("admin").codice, "admin");
const ospite = remoto.accoppia(remoto.nuovoInvito("ospite").codice, "ospite");
const tokenAdmin = admin.token;
const tokenOspite = ospite.token;

let acceso = true;
let accensioni = 0;
const fornitore = {
  base: () => (acceso ? `http://127.0.0.1:${portaWanGP}` : null),
  stato: async () => ({ installato: true, acceso, inAvvio: false, ponte: acceso }),
  accendi: async () => {
    accensioni++;
    acceso = true;
    return `http://127.0.0.1:${portaWanGP}`;
  },
  spegni: async () => {
    acceso = false;
  },
};

const gateway = new G.Gateway({
  remoto,
  versione: "prova",
  computer: "PC-DI-PROVA",
  stato: () => ({ attivita: [] }),
  esegui: async () => ({}),
  wangp: fornitore,
});
const porta = await gateway.ascolta(0, "127.0.0.1");
const base = `http://127.0.0.1:${porta}`;
const host = `127.0.0.1:${porta}`;

const bearer = (t) => ({ Authorization: "Bearer " + t });

async function biscottoDi(token) {
  const r = await fetch(base + "/wangp/sessione", { method: "POST", headers: bearer(token) });
  return { stato: r.status, biscotto: (r.headers.get("set-cookie") ?? "").split(";")[0], intero: r.headers.get("set-cookie") ?? "" };
}

console.log("\n— chi non decide non vede niente —");
{
  const r = await fetch(base + "/wangp/");
  dice("senza credenziali: 404", r.status === 404, `→ ${r.status}`);
  const s = await biscottoDi(tokenOspite);
  dice("un ospite non ottiene il biscotto", s.stato === 404 && !s.biscotto, `→ ${s.stato}`);
  const io = await (await fetch(base + "/io", { headers: bearer(tokenOspite) })).json();
  dice("e /io non gli dice che WanGP c'è", io.wangp === false, `→ ${io.wangp}`);
  const ioAdmin = await (await fetch(base + "/io", { headers: bearer(tokenAdmin) })).json();
  dice("all'admin sì", ioAdmin.wangp === true, `→ ${ioAdmin.wangp}`);
  const st = await fetch(base + "/wangp/stato", { headers: bearer(tokenOspite) });
  dice("lo stato di WanGP non è dell'ospite", st.status === 404, `→ ${st.status}`);
  // Il biscotto con dentro il token di un ospite non vale.
  const r2 = await fetch(base + "/wangp/", { headers: { Cookie: "daprod_wangp=" + tokenOspite } });
  dice("un biscotto col token di un ospite non vale", r2.status === 404, `→ ${r2.status}`);
  const prima = visti.length;
  const r3 = await fetch(base + "/gradio_api/queue/data?session_hash=x");
  dice("i percorsi di Gradio alla radice, senza biscotto, restano del gateway", r3.status === 401 || r3.status === 404, `→ ${r3.status}`);
  dice("e a WanGP non arriva niente", visti.length === prima);
}

console.log("\n— l'admin apre la pagina —");
let cookie = "";
{
  const s = await biscottoDi(tokenAdmin);
  cookie = s.biscotto;
  dice("il biscotto si pianta", s.stato === 200 && cookie.startsWith("daprod_wangp="), `→ ${s.stato} ${cookie}`);
  dice("è HttpOnly e SameSite=Strict", /HttpOnly/.test(s.intero) && /SameSite=Strict/.test(s.intero), s.intero);

  const r = await fetch(base + "/wangp/", { headers: { Cookie: cookie, "Accept-Encoding": "gzip" } });
  dice("la pagina arriva", r.status === 200, `→ ${r.status}`);
  dice("compressa", r.headers.get("content-encoding") === "gzip");
  // `fetch` scompatta il gzip da sé: quello che si legge qui è la pagina.
  const testo = await r.text();
  dice("con dentro la pagina di WanGP", testo.includes("WanGP finto"));
  dice("e il tasto per tornare alla suite", testo.includes('id="daprod-torna"') && testo.includes('href="/"'));
  const ultimo = visti.at(-1);
  dice("a WanGP la pagina è stata chiesta come «/»", ultimo.percorso === "/", `→ ${ultimo.percorso}`);
  dice("con l'Host di chi ha chiesto (è così che WanGP ricostruisce i suoi indirizzi)", ultimo.testate.host === host, `→ ${ultimo.testate.host}`);
  dice("senza il nostro biscotto", !("cookie" in ultimo.testate));
  dice("e senza il nostro token", !("authorization" in ultimo.testate));

  const bearerAdmin = await fetch(base + "/wangp/", { headers: bearer(tokenAdmin) });
  dice("anche col token nell'intestazione", bearerAdmin.status === 200);

  const senzaBarra = await fetch(base + "/wangp", { headers: { Cookie: cookie }, redirect: "manual" });
  dice("senza la barra finale si rimanda a /wangp/", senzaBarra.status === 308 && senzaBarra.headers.get("location") === "/wangp/", `→ ${senzaBarra.status}`);

  const nonGz = await fetch(base + "/wangp/assets/a.js", { headers: { Cookie: cookie, "Accept-Encoding": "identity" } });
  dice("chi non sa il gzip riceve il file così com'è", !nonGz.headers.get("content-encoding") && (await nonGz.text()).startsWith("console.log"));
  const gz = await fetch(base + "/wangp/assets/a.js", { headers: { Cookie: cookie, "Accept-Encoding": "gzip" } });
  dice("i file di testo si comprimono", gz.headers.get("content-encoding") === "gzip");
}

console.log("\n— quello che la pagina chiede alla radice —");
{
  const r = await fetch(base + "/gradio_api/file=grande", { headers: { Cookie: cookie, Range: "bytes=0-9" } });
  dice("un pezzo di un video (Range) passa com'è", r.status === 206 && (await r.text()) === "0123456789", `→ ${r.status}`);

  const t0 = Date.now();
  const sse = await fetch(base + "/gradio_api/queue/data?session_hash=x", { headers: { Cookie: cookie } });
  const lettore = sse.body.getReader();
  const primo = await lettore.read();
  const dopoPrimo = Date.now() - t0;
  dice("uno stream di eventi (SSE) parte subito, non alla fine", sse.headers.get("content-type").startsWith("text/event-stream") && dopoPrimo < 500, `→ ${dopoPrimo} ms`);
  dice("e il primo pezzo è quello vero", Buffer.from(primo.value).toString().includes("uno"));
  while (!(await lettore.read()).done);

  const grosso = Buffer.alloc(30 * 1024 * 1024, 7);
  const su = await fetch(base + "/gradio_api/upload", {
    method: "POST",
    headers: { Cookie: cookie, Origin: base, "Content-Type": "application/octet-stream" },
    body: grosso,
  });
  const esito = await su.json();
  dice("un upload da 30 MB arriva intero (senza tenerlo in memoria)", su.status === 200 && esito.byte === grosso.length, `→ ${su.status} ${JSON.stringify(esito)}`);

  const estraneo = await fetch(base + "/gradio_api/upload", {
    method: "POST",
    headers: { Cookie: cookie, Origin: "http://sito-estraneo.example", "Content-Type": "application/octet-stream" },
    body: "x",
  });
  dice("una POST che arriva da un altro sito, col biscotto, non passa", estraneo.status !== 200, `→ ${estraneo.status}`);
}

console.log("\n— WebSocket —");
{
  function prova(nome, opzioni) {
    return new Promise((ok) => {
      const ws = new WebSocket(`ws://${host}/deepy/deepy_api/events`, opzioni);
      const t = setTimeout(() => { try { ws.close(); } catch { /* già chiuso */ } ok("nessuna risposta"); }, 2500);
      ws.onmessage = (m) => { clearTimeout(t); ws.close(); ok("messaggio:" + m.data); };
      ws.onerror = () => { clearTimeout(t); ok("rifiutato"); };
    });
  }
  dice("l'admin col biscotto apre il WebSocket", (await prova("admin", { headers: { Cookie: cookie, Origin: base } })) === "messaggio:ciao");
  dice("senza biscotto no", (await prova("senza", { headers: { Origin: base } })) === "rifiutato");
  dice("da un altro sito no", (await prova("estraneo", { headers: { Cookie: cookie, Origin: "http://sito-estraneo.example" } })) === "rifiutato");
}

console.log("\n— WanGP spento —");
{
  await (await fetch(base + "/wangp/spegni", { method: "POST", headers: { Cookie: cookie, Origin: base } })).text();
  dice("spegnerlo dal telefono si può", acceso === false);
  const r = await fetch(base + "/wangp/", { headers: { Cookie: cookie } });
  const testo = await r.text();
  dice("la pagina dice che è spento e offre di accenderlo", r.status === 200 && testo.includes("Accendi WanGP"), `→ ${r.status}`);
  const a = await (await fetch(base + "/wangp/accendi", { method: "POST", headers: { Cookie: cookie, Origin: base } })).json();
  dice("accenderlo si può, e lo dice", a.ok === true && accensioni === 1 && acceso === true, JSON.stringify(a));
  const estranea = await fetch(base + "/wangp/accendi", { method: "POST", headers: { Cookie: cookie, Origin: "http://sito-estraneo.example" } });
  dice("un altro sito non lo accende", estranea.status === 404 || estranea.status === 401, `→ ${estranea.status}`);
}

/* ------------------------------------------------------- il traduttore */

console.log("\n— il traduttore: cosa diventa un lavoro per WanGP —");
{
  const L = require(join(radiceRepo, "apps", "shell", "out", "main", "wangp-lavori.js"));
  const invii = mkdtempSync(join(tmpdir(), "daprod-invii-"));

  const fine = L.traduci({ azione: "genera.immagine", testo: "un faro", opzioni: { forma: "16:9", risoluzione: "1080", modello: "qwen21" } }, "un faro", invii);
  dice("immagine Fine: Qwen-Image 2.1, 40 passi, 1920x1088", fine.settings.model_type === "qwen_image_21_7B" && fine.settings.num_inference_steps === 40 && fine.settings.resolution === "1920x1088", JSON.stringify(fine.settings));
  dice("e la guida a 4", fine.settings.guidance_scale === 4);

  const veloce = L.traduci({ azione: "genera.immagine", testo: "un faro", opzioni: { forma: "9:16", risoluzione: "720", modello: "qwen21-turbo", quante: "3" } }, "un faro", invii);
  dice("immagine Veloce: 6 passi col profilo Viggle", veloce.settings.num_inference_steps === 6 && veloce.settings.sample_solver === "viggle_v02" && veloce.settings.guidance_scale === 1);
  dice("con la sua LoRA, per indirizzo", /viggle-turbo-v0\.2\.1-6step/.test(veloce.settings.activated_loras[0]));
  dice("verticale a 720: 720x1280", veloce.settings.resolution === "720x1280");
  dice("tre immagini = tre giri, uno dopo l'altro", veloce.quanti === 3 && veloce.settings.repeat_generation === 3);

  dice("un modello inventato torna al Fine (non si sceglie da fuori)", L.traduci({ azione: "genera.immagine", testo: "x", opzioni: { modello: "flux-9000" } }, "x", invii).settings.num_inference_steps === 40);

  // Una foto vera (un PNG 200x100) da modificare.
  mkdirSync(invii, { recursive: true });
  const png = Buffer.alloc(64);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.writeUInt32BE(200, 16);
  png.writeUInt32BE(100, 20);
  writeFileSync(join(invii, "foto.png"), png);
  const mod = L.traduci({ azione: "modifica.immagine", testo: "cielo arancione", opzioni: { immagine: "foto.png", modello: "qwen21" } }, "cielo arancione", invii);
  dice("modifica senza zona: la foto è il soggetto principale", mod.settings.video_prompt_type === "KI" && mod.settings.image_refs[0].endsWith("foto.png"), JSON.stringify(mod.settings));
  dice("e l'immagine ha la forma della foto (2:1)", mod.settings.resolution === "1088x544", `→ ${mod.settings.resolution}`);
  writeFileSync(join(invii, "zona.png"), "x");
  const zona = L.traduci({ azione: "modifica.immagine", testo: "cielo", opzioni: { immagine: "foto.png", maschera: "zona.png" } }, "cielo", invii);
  dice("modifica con zona dipinta: inpainting con la maschera", zona.settings.image_mode === 2 && zona.settings.image_mask.endsWith("zona.png") && zona.settings.video_prompt_type === "VAG");
  let errore = "";
  try { L.traduci({ azione: "modifica.immagine", testo: "x", opzioni: { immagine: "../../Windows/x.png" } }, "x", invii); } catch (e) { errore = e.message; }
  dice("un id di foto che esce dalla cartella dei caricamenti si rifiuta", /Non trovo la foto/.test(errore), errore);

  const brano = L.traduci({
    azione: "genera.brano",
    testo: "neapolitan pop, melodic trap",
    opzioni: { testo: "[Verse]\nLe luci del porto", voce: "si", secondi: "60", bpm: "96", tonalita: "A minor", tempo: "4", lingua: "it" },
  }, "neapolitan pop, melodic trap", invii);
  dice("brano: ACE-Step XL, i generi sono la caption e il testo è il testo", brano.settings.model_type === "ace_step_v1_5_xl" && brano.settings.alt_prompt === "neapolitan pop, melodic trap" && brano.settings.prompt.startsWith("[Verse]"));
  dice("bpm, tonalità, tempo e lingua sono le caselle di ACE-Step", JSON.stringify(brano.settings.custom_settings) === JSON.stringify({ bpm: 96, keyscale: "A minor", timesignature: 4, language: "it" }), JSON.stringify(brano.settings.custom_settings));
  dice("60 secondi", brano.settings.duration_seconds === 60);
  const caso = L.traduci({ azione: "genera.brano", testo: "blues", opzioni: { voce: "si", tonalita: "caso", tempo: "caso" } }, "blues", invii);
  dice("«a caso» non manda niente (lo decide il modello)", caso.settings.custom_settings === undefined);
  const strumentale = L.traduci({ azione: "genera.brano", testo: "blues", opzioni: { voce: "no", testo: "parole che non si cantano" } }, "blues", invii);
  dice("strumentale: [Instrumental], le parole si ignorano", strumentale.settings.prompt === "[Instrumental]");
  dice("senza parole è strumentale lo stesso", L.traduci({ azione: "genera.brano", testo: "blues", opzioni: { voce: "si" } }, "blues", invii).settings.prompt === "[Instrumental]");
  dice("la durata sta fra 15 e 240", L.traduci({ azione: "genera.brano", testo: "b", opzioni: { secondi: "9999" } }, "b", invii).settings.duration_seconds === 240);

  errore = "";
  try { L.traduci({ azione: "genera.voce", testo: "x", opzioni: {} }, "x", invii); } catch (e) { errore = e.message; }
  dice("quello che WanGP non sa fare da fuori lo dice, e manda all'interfaccia intera", /interfaccia intera/.test(errore), errore);
}

/* ------------------------------------------------------- il ponte Python */

console.log("\n— il ponte in Python (con controfigure) —");
{
  const py = spawnSync("python", ["--version"], { encoding: "utf8" });
  const script = join(radiceRepo, "services", "wangp", "prove", "prova_ponte.py");
  if (py.error || !existsSync(script)) {
    console.log("  --   Python non c'è su questo computer: il ponte non si prova qui");
  } else {
    const r = spawnSync("python", [script], { encoding: "utf8" });
    const righe = (r.stdout ?? "").split("\n").filter((l) => /^\s+(ok|NO)\s/.test(l));
    const no = righe.filter((l) => /\bNO\b/.test(l));
    dice(`il ponte passa le sue ${righe.length} prove`, r.status === 0 && righe.length > 10 && no.length === 0, (r.stdout ?? "").slice(-600) + (r.stderr ?? "").slice(-300));
  }
}

// Si esce senza aspettare i collegamenti rimasti aperti (keep-alive): non sono quello che si prova.
void gateway.chiudi();
wangpFinto.closeAllConnections();
wangpFinto.close();
console.log(falliti === 0 ? "\nTutto a posto.\n" : `\n${falliti} prove fallite.\n`);
process.exit(falliti === 0 ? 0 : 1);
