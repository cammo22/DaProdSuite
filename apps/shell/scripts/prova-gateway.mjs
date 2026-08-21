/**
 * Il gateway messo alla prova, senza Electron e senza scheda video.
 *
 *     node apps/shell/scripts/prova-gateway.mjs
 *
 * Accende un gateway vero su una porta a caso, con un archivio in una cartella
 * temporanea e un esecutore finto, e gli chiede tutto quello che gli chiederanno
 * un telefono, un portatile e un agente MCP: accoppiarsi, sbagliare il codice,
 * chiedere azioni, superare i propri permessi, scaricare un file, uscire dalla
 * cartella dei risultati, farsi revocare.
 *
 * Esiste perché l'accesso remoto è l'unico pezzo della suite che si può
 * sbagliare **in silenzio**: un controllo che non scatta non rompe niente,
 * apre. Il resto della suite quando sbaglia si vede.
 *
 * Vuole `packages/gateway/dist` già compilato (`pnpm run build`), e torna 0
 * solo se passa tutto.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const G = require(join(import.meta.dirname, "..", "..", "..", "packages", "gateway", "dist", "index.js"));

const radice = mkdtempSync(join(tmpdir(), "daprod-prova-"));
const archivio = new G.Archivio(join(radice, "remoto.json"));
const remoto = new G.Remoto(archivio, radice);

// Un finto risultato da scaricare.
mkdirSync(remoto.risultatiDir, { recursive: true });
writeFileSync(join(remoto.risultatiDir, "finto.png"), "non e' davvero un png");

let eseguite = [];
const gateway = new G.Gateway({
  remoto,
  versione: "0.5.0",
  computer: "PC-DI-PROVA",
  stato: () => ({
    versione: "0.5.0",
    computer: "PC-DI-PROVA",
    attiva: true,
    attivita: [{ app: "foto", nome: "DaProdFoto", stato: "accesa" }],
    coda: { attesa: 0, lavoro: 0, pronte: 0 },
  }),
  esegui: async (id, valori, dispositivo) => {
    eseguite.push({ id, valori, chi: dispositivo.nome });
    if (id === "libreria.ultimi") return [{ nome: "brano.mp3", tipo: "audio" }];
    return { fatto: true };
  },
});

const porta = await gateway.ascolta(0);
const base = `http://127.0.0.1:${porta}`;
let falliti = 0;

function dice(nome, condizione, extra = "") {
  if (condizione) console.log(`  ok   ${nome}`);
  else {
    falliti++;
    console.log(`  NO   ${nome} ${extra}`);
  }
}

async function chiama(percorso, { metodo = "GET", token, corpo } = {}) {
  const r = await fetch(base + percorso, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const testo = await r.text();
  let dati = null;
  try { dati = testo ? JSON.parse(testo) : null; } catch { dati = testo; }
  return { stato: r.status, dati, testo, tipo: r.headers.get("content-type") };
}

console.log("\n— la console web —");
{
  const r = await fetch(base + "/");
  const html = await r.text();
  dice("la pagina si serve senza token", r.status === 200);
  dice("è HTML", (r.headers.get("content-type") || "").includes("text/html"));
  dice("non chiama niente da fuori", !/https?:\/\/(?!localhost)/.test(html.replace(/http:\/\/www\.w3\.org/g, "")), "");
  dice("ha una CSP", !!r.headers.get("content-security-policy"));
}

console.log("\n— senza token non si entra —");
for (const rotta of ["/stato", "/azioni", "/richieste", "/notifiche"]) {
  const r = await chiama(rotta);
  dice(`${rotta} risponde 401`, r.stato === 401, `→ ${r.stato}`);
}

console.log("\n— accoppiamento —");
const invitoAdmin = remoto.nuovoInvito("admin");
let tokenAdmin;
{
  const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invitoAdmin.codice, nome: "portatile" } });
  dice("con il codice giusto si entra", r.stato === 201, `→ ${r.stato} ${r.testo}`);
  tokenAdmin = r.dati?.token;
  dice("torna un token", typeof tokenAdmin === "string" && tokenAdmin.length === 64);
  dice("il token non torna dentro dispositivo", r.dati?.dispositivo?.token === undefined);
  dice("il ruolo è admin", r.dati?.dispositivo?.ruolo === "admin");
  dice("dice come si chiama il PC", r.dati?.computer === "PC-DI-PROVA");
}
{
  const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invitoAdmin.codice, nome: "ladro" } });
  dice("lo stesso codice non vale due volte", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: "abc", nome: "x" } });
  dice("un codice non numerico è rifiutato", r.stato === 400);
}

console.log("\n— le azioni —");
{
  const r = await chiama("/azioni", { token: tokenAdmin });
  dice("l'admin le vede tutte", r.stato === 200 && r.dati.length >= 8, `→ ${r.dati?.length}`);
  const immagine = r.dati.find((a) => a.id === "genera.immagine");
  dice("genera.immagine ha lo schema", !!immagine?.schema?.properties?.prompt);
  dice("prompt è obbligatorio", immagine?.schema?.required?.includes("prompt"));
  dice("genera.immagine va in fila", immagine?.coda === true);
}
{
  const r = await chiama("/azioni/genera.immagine", {
    metodo: "POST", token: tokenAdmin,
    corpo: { prompt: "un faro al tramonto", quante: 2 },
  });
  dice("una generazione entra in fila", r.stato === 201 && r.dati.esito === "in-coda", `→ ${r.stato} ${r.testo}`);
  dice("il testo è il prompt", r.dati?.richiesta?.testo === "un faro al tramonto");
  dice("l'azione viaggia nelle opzioni", r.dati?.richiesta?.opzioni?.azione === "genera.immagine");
  dice("il tipo è immagine", r.dati?.richiesta?.tipo === "immagine");
  dice("non è passata dall'esecutore", eseguite.length === 0);
}
{
  const r = await chiama("/azioni/libreria.ultimi", { metodo: "POST", token: tokenAdmin, corpo: { quanti: 5 } });
  dice("una lettura risponde subito", r.stato === 200 && r.dati.esito === "fatto", `→ ${r.stato} ${r.testo}`);
  dice("è passata dall'esecutore", eseguite.some((e) => e.id === "libreria.ultimi"));
  dice("i predefiniti arrivano", eseguite.at(-1)?.valori?.quanti === 5);
}
{
  const r = await chiama("/azioni/genera.immagine", { metodo: "POST", token: tokenAdmin, corpo: { quante: 2 } });
  dice("senza il campo obbligatorio si rifiuta", r.stato === 400 && /prompt/.test(r.dati.errore), `→ ${r.stato} ${r.testo}`);
}
{
  const r = await chiama("/azioni/genera.immagine", { metodo: "POST", token: tokenAdmin, corpo: { prompt: "x", quante: 99 } });
  dice("un numero fuori scala si rifiuta", r.stato === 400, `→ ${r.stato} ${r.testo}`);
}
{
  const r = await chiama("/azioni/genera.immagine", { metodo: "POST", token: tokenAdmin, corpo: { prompt: "x", inventato: "ciao" } });
  dice("un campo inventato si rifiuta", r.stato === 400 && /inventato/.test(r.dati.errore), `→ ${r.testo}`);
}
{
  const r = await chiama("/azioni/non.esiste", { metodo: "POST", token: tokenAdmin, corpo: {} });
  dice("un'azione sconosciuta dà 404", r.stato === 404);
}

console.log("\n— l'ospite —");
const invitoOspite = remoto.nuovoInvito("ospite");
let tokenOspite;
{
  const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invitoOspite.codice, nome: "telefono" } });
  tokenOspite = r.dati?.token;
  dice("l'ospite si accoppia", r.stato === 201 && r.dati.dispositivo.ruolo === "ospite");
}
{
  const r = await chiama("/azioni", { token: tokenOspite });
  dice("l'ospite vede meno azioni", r.dati.every((a) => a.id !== "coda.decidi" && a.id !== "app.apri"));
}
{
  const r = await chiama("/azioni/app.apri", { metodo: "POST", token: tokenOspite, corpo: { app: "foto" } });
  dice("l'ospite non apre le app", r.stato === 403, `→ ${r.stato} ${r.testo}`);
}
{
  const r = await chiama("/richieste", { token: tokenOspite });
  dice("l'ospite non vede le richieste altrui", r.dati.length === 0, `→ ${r.dati.length}`);
}
{
  const r = await chiama("/azioni/genera.brano", { metodo: "POST", token: tokenOspite, corpo: { descrizione: "blues lento" } });
  dice("l'ospite può chiedere", r.stato === 201);
  const suoi = await chiama("/richieste", { token: tokenOspite });
  dice("e poi la vede", suoi.dati.length === 1);
  const tutte = await chiama("/richieste", { token: tokenAdmin });
  dice("l'admin le vede tutte", tutte.dati.length === 2, `→ ${tutte.dati.length}`);
}

console.log("\n— decidere —");
let idRichiesta;
{
  const tutte = await chiama("/richieste", { token: tokenAdmin });
  idRichiesta = tutte.dati.find((r) => r.app === "musica").id;
  const r = await chiama(`/richieste/${idRichiesta}/stato`, {
    metodo: "POST", token: tokenOspite, corpo: { stato: "accettata" },
  });
  dice("l'ospite non decide", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama(`/richieste/${idRichiesta}/stato`, {
    metodo: "POST", token: tokenAdmin, corpo: { stato: "accettata" },
  });
  dice("l'admin decide", r.stato === 200 && r.dati.stato === "accettata", `→ ${r.stato} ${r.testo}`);
}
{
  const r = await chiama(`/richieste/${idRichiesta}/stato`, {
    metodo: "POST", token: tokenAdmin,
    corpo: { stato: "pronta", risultato: { nome: "finto.png", percorso: "finto.png", bytes: 21, tipo: "image/png" } },
  });
  dice("si dichiara pronta col file", r.stato === 200 && r.dati.stato === "pronta");
}
{
  const n = await chiama("/notifiche", { token: tokenOspite });
  dice("chi l'ha chiesta viene avvisato", n.dati.length >= 1, `→ ${n.dati.length}`);
  dice("la notifica dice che è pronta", n.dati.some((x) => /pronto/i.test(x.titolo)));
  const segna = await chiama(`/notifiche/${n.dati[0].id}/letta`, { metodo: "POST", token: tokenOspite });
  dice("si segna letta", segna.stato === 200);
  const dopo = await chiama("/notifiche", { token: tokenOspite });
  dice("e sparisce dalle non lette", dopo.dati.length === n.dati.length - 1);
}
{
  const n = await chiama("/notifiche", { token: tokenAdmin });
  dice("l'admin è stato avvisato della richiesta nuova", n.dati.some((x) => x.titolo === "Nuova richiesta"), `→ ${JSON.stringify(n.dati.map(x=>x.titolo))}`);
}

console.log("\n— scaricare —");
{
  const r = await fetch(base + "/risultati/finto.png", { headers: { Authorization: "Bearer " + tokenOspite } });
  const corpo = await r.text();
  dice("chi l'ha chiesta lo scarica", r.status === 200 && corpo === "non e' davvero un png", `→ ${r.status}`);
}
{
  const r = await fetch(base + "/risultati/" + encodeURIComponent("../../remoto.json"), {
    headers: { Authorization: "Bearer " + tokenOspite },
  });
  dice("non si esce dalla cartella", r.status === 404, `→ ${r.status}`);
}
{
  const r = await fetch(base + "/risultati/finto.png");
  dice("senza token non si scarica", r.status === 401);
}

console.log("\n— revoca —");
{
  const dispositivi = remoto.listaDispositivi();
  const ospite = dispositivi.find((d) => d.ruolo === "ospite");
  remoto.revoca(ospite.id);
  const r = await chiama("/stato", { token: tokenOspite });
  dice("il token revocato non vale più", r.stato === 401, `→ ${r.stato}`);
  const admin = await chiama("/stato", { token: tokenAdmin });
  dice("gli altri restano al loro posto", admin.stato === 200);
}

console.log("\n— lo stato in streaming —");
{
  const controllo = new AbortController();
  const r = await fetch(base + "/stato/stream?token=" + tokenAdmin, { signal: controllo.signal });
  dice("EventSource passa col token in query", r.status === 200);
  const lettore = r.body.getReader();
  const primo = new TextDecoder().decode((await lettore.read()).value);
  dice("il primo messaggio è lo stato", primo.includes("PC-DI-PROVA"), primo.slice(0, 60));
  controllo.abort();
}
{
  const r = await fetch(base + "/stato/stream?token=sbagliato");
  dice("un token falso in query non passa", r.status === 401);
}

console.log("\n— il limite dei tentativi —");
{
  let bloccato = false;
  for (let i = 0; i < 14; i++) {
    const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: "00000001", nome: "forza" } });
    if (r.dati?.errore?.includes("Troppi tentativi")) { bloccato = true; break; }
  }
  dice("la forza bruta si ferma", bloccato);
}

await gateway.chiudi();
archivio.scriviAdesso();
console.log(falliti === 0 ? "\nTutto a posto.\n" : `\n${falliti} prove fallite.\n`);
process.exit(falliti === 0 ? 0 : 1);
