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

// Una finta libreria: un file solo, con dentro venti lettere, che basta per
// provare i pezzi (Range) e l'id che non esiste.
const cartellaLibreria = join(radice, "libreria");
mkdirSync(cartellaLibreria, { recursive: true });
writeFileSync(join(cartellaLibreria, "quadro.png"), "abcdefghijklmnopqrst");
const fintaLibreria = {
  elenco: () => [{
    id: "foto/quadro.png",
    nome: "quadro.png",
    tipo: "immagine",
    app: "foto",
    creato: 1_700_000_000_000,
    bytes: 20,
    mime: "image/png",
  }],
  file: (id) =>
    id === "foto/quadro.png"
      ? { percorso: join(cartellaLibreria, "quadro.png"), nome: "quadro.png", mime: "image/png", bytes: 20 }
      : null,
};

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
  libreria: fintaLibreria,
  pannello: {
    stato: (d) => ({
      computer: "PC-DI-PROVA",
      versione: "0.7.0",
      indirizzi: [{ base: "http://192.168.1.8:8790", che: "la rete di casa", dove: "casa" }],
      tunnel: { fase: "spento", indirizzo: "" },
      firewall: { aperta: true, incerto: false },
      dispositivi: remoto.listaDispositivi().map(({ token, ...resto }) => resto),
      puoiDecidere: d.ruolo === "admin",
      codaAutomatica: true,
    }),
    invita: async ({ ruolo, quante }) => {
      const i = remoto.nuovoInvito(ruolo, quante);
      return { codice: i.codice, ruolo: i.ruolo, scade: i.scade, qr: "", restano: i.restano ?? 1 };
    },
    tunnel: async () => {},
    apriLaPorta: async () => null,
    revoca: (id) => remoto.revoca(id),
    rinomina: (id, nome) => remoto.rinomina(id, nome),
  },
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

console.log("\n— chi sono —");
{
  const r = await chiama("/io", { token: tokenOspite });
  dice("dice come mi chiamo", r.dati?.nome === "telefono", `→ ${r.testo}`);
  dice("e che ruolo ho", r.dati?.ruolo === "ospite");
  dice("e su che computer sono", r.dati?.computer === "PC-DI-PROVA");
}
{
  const r = await chiama("/io");
  dice("senza token non si sa chi sono", r.stato === 401);
}

console.log("\n— la libreria —");
{
  const r = await chiama("/libreria", { token: tokenOspite });
  dice("l'elenco arriva", r.stato === 200 && r.dati.voci.length === 1, `→ ${r.testo}`);
  dice("con il tipo MIME", r.dati.voci[0].mime === "image/png");
}
{
  const r = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"), {
    headers: { Authorization: "Bearer " + tokenOspite },
  });
  const corpo = await r.text();
  dice("il file arriva intero", r.status === 200 && corpo === "abcdefghijklmnopqrst", `→ ${r.status}`);
  dice("col suo tipo", r.headers.get("content-type") === "image/png");
  dice("e dice che accetta i pezzi", r.headers.get("accept-ranges") === "bytes");
}
{
  // Senza i pezzi un <video> non si può scorrere: o si scarica tutto, o niente.
  const r = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"), {
    headers: { Authorization: "Bearer " + tokenOspite, Range: "bytes=5-9" },
  });
  const corpo = await r.text();
  dice("un pezzo si può chiedere", r.status === 206 && corpo === "fghij", `→ ${r.status} ${corpo}`);
  dice("e dice quale pezzo è", r.headers.get("content-range") === "bytes 5-9/20");
}
{
  const r = await chiama("/libreria/file/inventato.png", { token: tokenOspite });
  dice("un id che non esiste dà 404", r.stato === 404, `→ ${r.stato}`);
}
{
  const r = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"));
  dice("senza token il file non esce", r.status === 401, `→ ${r.status}`);
}

console.log("\n— il biscotto di sessione —");
let biscotto;
{
  const r = await fetch(base + "/sessione", {
    method: "POST",
    headers: { Authorization: "Bearer " + tokenOspite, "Content-Type": "application/json" },
    body: "{}",
  });
  const messo = r.headers.get("set-cookie") || "";
  dice("si pianta con il token nell'header", r.status === 200 && messo.includes("daprod_token="), `→ ${r.status} ${messo}`);
  dice("è HttpOnly", /HttpOnly/i.test(messo));
  dice("è SameSite=Strict", /SameSite=Strict/i.test(messo));
  biscotto = messo.split(";")[0];
}
{
  // È tutto il motivo per cui esiste: un <img> non sa mettere un header.
  const r = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"), {
    headers: { Cookie: biscotto },
  });
  dice("col biscotto un <img> vede il file", r.status === 200, `→ ${r.status}`);
}
{
  const r = await fetch(base + "/sessione", { method: "POST", headers: { Cookie: biscotto } });
  dice("ma il biscotto da solo non scrive niente", r.status === 401, `→ ${r.status}`);
}
{
  // Il CSRF, detto in prova: se il biscotto valesse anche sulle POST, la pagina
  // di un altro sito potrebbe far partire una generazione dal browser di chi è
  // collegato. Vale solo in lettura, e questa riga lo tiene fermo.
  const r = await fetch(base + "/azioni/genera.immagine", {
    method: "POST",
    headers: { Cookie: biscotto, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "da un altro sito" }),
  });
  dice("e non fa partire una generazione", r.status === 401, `→ ${r.status}`);
}
{
  const r = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"), {
    headers: { Cookie: "daprod_token=inventato" },
  });
  dice("un biscotto falso non apre niente", r.status === 401, `→ ${r.status}`);
}

console.log("\n— il pannello —");
{
  const r = await chiama("/pannello", { token: tokenAdmin });
  dice("chi decide lo vede", r.stato === 200 && r.dati.computer === "PC-DI-PROVA", `→ ${r.stato}`);
  dice("dice se puoi decidere", r.dati.puoiDecidere === true);
  dice("elenca gli indirizzi", Array.isArray(r.dati.indirizzi) && r.dati.indirizzi.length > 0);
}
{
  const r = await chiama("/pannello", { token: tokenOspite });
  dice("lo vede anche chi non decide", r.stato === 200);
  dice("ma sa che non decide", r.dati.puoiDecidere === false);
}
{
  const r = await chiama("/pannello/invito", {
    metodo: "POST", token: tokenOspite, corpo: { ruolo: "ospite", quante: 1 },
  });
  dice("chi non decide non invita", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama("/pannello/tunnel", {
    metodo: "POST", token: tokenOspite, corpo: { acceso: true },
  });
  dice("e non tocca il tunnel", r.stato === 403, `→ ${r.stato}`);
}

console.log("\n— un invito per più persone —");
{
  // Venti persone di picco, e un codice a testa vorrebbe dire venti giri al
  // pannello con cinque minuti di scadenza ognuno.
  const invito = remoto.nuovoInvito("ospite", 3);
  dice("nasce con i suoi posti", invito.restano === 3, `→ ${invito.restano}`);

  const nomi = ["uno", "due", "tre"];
  let entrati = 0;
  for (const nome of nomi) {
    const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome } });
    if (r.stato === 201) entrati += 1;
  }
  dice("entrano in tre con lo stesso codice", entrati === 3, `→ ${entrati}`);

  const quarto = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "quattro" } });
  dice("il quarto no: i posti sono finiti", quarto.stato === 403, `→ ${quarto.stato}`);
}
{
  // Gli inviti vecchi non hanno `restano`: per loro vale uno, che è quello che
  // facevano prima che esistesse il campo.
  const invito = remoto.nuovoInvito("ospite");
  dice("un invito normale vale per uno", invito.restano === 1);
  const primo = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "solo" } });
  const secondo = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "ladro" } });
  dice("e non due", primo.stato === 201 && secondo.stato === 403, `→ ${primo.stato}/${secondo.stato}`);
}

console.log("\n— chi si può togliere —");
{
  const tutti = remoto.listaDispositivi();
  const altrui = tutti.find((d) => d.nome === "uno");
  const r = await chiama(`/dispositivi/${altrui.id}`, { metodo: "DELETE", token: tokenOspite });
  dice("chi non decide non toglie gli altri", r.stato === 403, `→ ${r.stato}`);
}
{
  // Ma togliere sé stessi si può sempre: è il proprio collegamento.
  const io = remoto.listaDispositivi().find((d) => d.nome === "due");
  const suo = remoto.nuovoInvito("ospite");
  const entrato = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: suo.codice, nome: "se-stesso" } });
  const chi = remoto.listaDispositivi().find((d) => d.nome === "se-stesso");
  const r = await chiama(`/dispositivi/${chi.id}`, { metodo: "DELETE", token: entrato.dati.token });
  dice("ma sé stesso sì", r.stato === 200, `→ ${r.stato}`);
  const dopo = await chiama("/stato", { token: entrato.dati.token });
  dice("e da lì non entra più", dopo.stato === 401, `→ ${dopo.stato}`);
  dice("gli altri restano", remoto.listaDispositivi().some((d) => d.id === io.id));
}
{
  const chi = remoto.listaDispositivi().find((d) => d.nome === "uno");
  const r = await chiama(`/dispositivi/${chi.id}`, {
    metodo: "POST", token: tokenAdmin, corpo: { nome: "Telefono di Anna" },
  });
  dice("chi decide può rinominare", r.stato === 200, `→ ${r.stato}`);
  dice("e il nome cambia davvero",
    remoto.listaDispositivi().some((d) => d.nome === "Telefono di Anna"));
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
