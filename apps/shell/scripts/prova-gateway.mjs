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
/**
 * Chi possiede il quadro finto, e se sta in bacheca.
 *
 * Dalla 0.7.2 la libreria non è più di tutti: ognuno vede le sue cose, e degli
 * altri vede solo quello che gli altri hanno messo in mostra. Qui si finge
 * esattamente quella regola, perché è quella che va provata — un permesso che
 * non scatta non rompe niente, apre.
 */
let padroneQuadro = "nessuno";
let quadroInBacheca = false;

const voceQuadro = () => ({
  id: "foto/quadro.png",
  nome: "quadro.png",
  tipo: "immagine",
  app: "foto",
  creato: 1_700_000_000_000,
  bytes: 20,
  mime: "image/png",
  chi: padroneQuadro,
  chiNome: "chi l'ha fatto",
  pubblicato: quadroInBacheca,
});

const fintaLibreria = {
  elenco: ({ chi, dove }) => {
    const mio = padroneQuadro === chi;
    const siVede = dove === "bacheca" ? quadroInBacheca : mio;
    return siVede ? [{ ...voceQuadro(), mia: mio }] : [];
  },
  file: (id, chi) =>
    id === "foto/quadro.png" && (padroneQuadro === chi || quadroInBacheca)
      ? { percorso: join(cartellaLibreria, "quadro.png"), nome: "quadro.png", mime: "image/png", bytes: 20 }
      : null,
  pubblica: (id, chi, pubblicato) => {
    if (id !== "foto/quadro.png" || padroneQuadro !== chi) return false;
    quadroInBacheca = pubblicato;
    return true;
  },
  elimina: (id, chi) => id === "foto/quadro.png" && padroneQuadro === chi,
  /**
   * I mi piace e il «tengo», dalla 0.7.6.
   *
   * Il permesso è lo stesso del file: si può mettere mi piace su quello che si
   * ha il diritto di **vedere**, e su niente altro. Provarlo qui serve perché
   * è un permesso che, se salta, non rompe niente: apre.
   */
  miPiace: (id, chi, mi) => {
    if (id !== "foto/quadro.png") return null;
    if (padroneQuadro !== chi && !quadroInBacheca) return null;
    if (mi) cuori.add(chi);
    else cuori.delete(chi);
    return cuori.size;
  },
  tieni: (id, chi, tenere) => {
    if (id !== "foto/quadro.png" || !quadroInBacheca) return false;
    if (tenere) tenute.add(chi);
    else tenute.delete(chi);
    return true;
  },
};

const cuori = new Set();
const tenute = new Set();

/** Un finto modello che scrive: non serve LM Studio per provare le rotte. */
let aiSpenta = false;
const fintaAi = {
  disponibile: async () => (aiSpenta ? "LM Studio non risponde." : null),
  migliora: async ({ testo, app }) => {
    if (aiSpenta) throw new Error("LM Studio non risponde.");
    // Per un brano il modello scrive due cose: come suona, e cosa canta.
    return app === "musica"
      ? { testo: `[${app}] ${testo}, scritto meglio`, parole: "[Verse] due parole cantate" }
      : { testo: `[${app}] ${testo}, scritto meglio` };
  },
  /**
   * La frase che diventa un lavoro.
   *
   * Il vero sta in `needle.ts` e passa da un binario da 14 MB; qui basta che
   * risponda in modo credibile, perche' quello che si prova e' **il contratto
   * della rotta**: chi puo' chiamarla, cosa torna, e cosa succede quando non ha
   * capito.
   */
  capisci: async (frase) =>
    /video/i.test(frase)
      ? { azione: "genera.video", valori: { prompt: frase, secondi: "5" }, fiducia: 0.9, perche: "«video»", da: "needle" }
      : null,
};

/** I preset, tenuti in memoria per la durata della prova. */
const fintiPreset = [];
const fintoPreset = {
  elenco: (app) => fintiPreset.filter((x) => !app || x.app === app),
  salva: (preset) => {
    const nuovo = { ...preset, id: "p" + (fintiPreset.length + 1), quando: Date.now() };
    fintiPreset.push(nuovo);
    return nuovo;
  },
  elimina: (id, chi) => {
    const dentro = fintiPreset.findIndex((x) => x.id === id && (!x.chi || x.chi === chi));
    if (dentro < 0) return false;
    fintiPreset.splice(dentro, 1);
    return true;
  },
};

/**
 * La macchina finta: le regole, la pausa, e chi è la casa.
 *
 * Qui `sonoLaCasa` è **sempre falso**, ed è il punto della prova: tutto quello
 * che arriva da questa porta viene da fuori, anche quando ha i permessi da
 * admin. Le rotte che governano la fila devono dire di no a tutti e due.
 */
const macchinaFinta = {
  regole: { chiPassaSubito: "admin", limiteFila: 6, limitePersona: 2, contestoLlm: 65536 },
  inPausa: false,
  fermate: 0,
  tolti: [],
  stato: () => ({
    adesso: null,
    fila: [],
    inPausa: macchinaFinta.inPausa,
    trattenute: [],
    regole: macchinaFinta.regole,
    sonoLaCasa: false,
  }),
  pausa: (v) => { macchinaFinta.inPausa = v; },
  regoleNuove: (v) => { macchinaFinta.regole = v; },
  togli: (id) => { macchinaFinta.tolti.push(id); return null; },
  fermaAdesso: () => { macchinaFinta.fermate += 1; return null; },
  accettaTutte: () => remoto.accettaTutte({ id: "pc", nome: "PC", ruolo: "admin" }).length,
};

/**
 * Gli stili finti: quelli di una persona, tenuti in memoria.
 *
 * Non serve il disco per provare le rotte: serve qualcuno che risponda, e che
 * tenga separati i miei dai tuoi — che e' la cosa che, se salta, non rompe
 * niente e apre.
 */
const stiliDiTutti = new Map();
const fintiStili = {
  miei: (chi) => {
    if (!stiliDiTutti.has(chi)) {
      stiliDiTutti.set(chi, [
        { id: "s1", nome: "Neomelodico trap", testo: "neapolitan neomelodic pop", da: "partenza", quando: 1 },
      ]);
    }
    return stiliDiTutti.get(chi);
  },
  vetrina: (chi) => {
    const fuori = [];
    for (const [altro, elenco] of stiliDiTutti) {
      if (altro === chi) continue;
      for (const s of elenco) if (s.condiviso) fuori.push({ ...s, chi: altro, chiNome: "un altro" });
    }
    return fuori;
  },
  salva: (chi, dati) => {
    if (!dati.nome || !dati.testo) return null;
    const miei = fintiStili.miei(chi);
    const gia = miei.find((s) => s.id === dati.id || s.nome === dati.nome);
    if (gia) {
      gia.nome = dati.nome;
      gia.testo = dati.testo;
      return gia;
    }
    const nuovo = { ...dati, id: "s" + (miei.length + 1), quando: Date.now() };
    miei.push(nuovo);
    return nuovo;
  },
  togli: (chi, id) => {
    const miei = fintiStili.miei(chi);
    const dove = miei.findIndex((s) => s.id === id);
    if (dove < 0) return false;
    miei.splice(dove, 1);
    return true;
  },
  condividi: (chi, id, condiviso) => {
    const quale = fintiStili.miei(chi).find((s) => s.id === id);
    if (!quale) return false;
    quale.condiviso = condiviso;
    return true;
  },
};

/**
 * Un finto modello con cui parlare.
 *
 * Non serve LM Studio per provare le rotte: serve qualcuno che risponda e che,
 * quando gli si chiede una foto, proponga un piano. Quello che si prova qui è
 * il **giro** — comincia, dici, propone, accetti, si chiude — non la qualità
 * di quello che scrive.
 */
let sessioneFinta = null;
const fintaChiacchierata = {
  modelli: async () => [{ id: "finto", caricato: false }],
  comincia: async ({ dispositivoId, modello }) => {
    if (sessioneFinta) return { errore: "C'è già qualcuno che parla." };
    sessioneFinta = {
      id: "ch-prova",
      dispositivoId,
      modello,
      scade: Date.now() + 600_000,
      battute: [],
    };
    return { sessione: sessioneFinta };
  },
  dico: async ({ id, testo }) => {
    if (!sessioneFinta || sessioneFinta.id !== id) return { errore: "Finita." };
    sessioneFinta.battute.push({ chi: "io", testo, quando: Date.now() });
    sessioneFinta.battute.push({ chi: "modello", testo: "Ti propongo una foto.", quando: Date.now() });
    sessioneFinta.piano = {
      id: "pi-prova",
      riassunto: "Ti propongo di fare una foto di una macchina.",
      lavori: [{
        azione: "genera.immagine",
        app: "foto",
        che: "una foto di una macchina",
        campi: { prompt: "una macchina rossa su una strada di montagna" },
      }],
    };
    return { sessione: sessioneFinta };
  },
  mia: (dispositivoId) =>
    sessioneFinta && sessioneFinta.dispositivoId === dispositivoId ? sessioneFinta : null,
  attesa: () => null,
  esci: () => true,
  chiudi: () => { sessioneFinta = null; },
  accetta: async ({ quali }) => {
    const quanti = quali.length || 1;
    sessioneFinta = null;
    return { quanti };
  },
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
  ai: fintaAi,
  preset: fintoPreset,
  macchina: {
    stato: macchinaFinta.stato,
    pausa: macchinaFinta.pausa,
    regole: macchinaFinta.regoleNuove,
    togli: macchinaFinta.togli,
    fermaAdesso: macchinaFinta.fermaAdesso,
    accettaTutte: macchinaFinta.accettaTutte,
  },
  chiacchierata: fintaChiacchierata,
  stili: fintiStili,
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

/**
 * **Il nome è di uno solo**, dalla 0.7.6.
 *
 * Non è pignoleria: da questa versione il nome non è più un'etichetta accanto
 * a una richiesta, è l'identità con cui uno compare in DaProd, mette un mi
 * piace e ha un profilo. Due «portatile» sono due profili che si scambiano le
 * cose a vicenda.
 *
 * E il codice **non si deve bruciare**: chi sbaglia nome deve poter riprovare
 * con lo stesso invito, o gli tocca chiederne un altro per un errore di
 * battitura.
 */
{
  const invito = remoto.nuovoInvito("ospite");
  const r = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "portatile" } });
  dice("un nome già preso è rifiutato", r.stato >= 400, `→ ${r.stato}`);
  dice("e si capisce perché", /gi\u00e0 di qualcun altro/.test(r.dati?.errore || ""), r.dati?.errore);

  const ancora = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "PORTATILE" } });
  dice("nemmeno con le maiuscole diverse", ancora.stato >= 400, `→ ${ancora.stato}`);

  const buona = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "un altro nome" } });
  dice("il codice non si è bruciato provando", buona.stato === 201, `→ ${buona.stato} ${buona.testo}`);
  if (buona.dati?.dispositivo?.id) remoto.revoca(buona.dati.dispositivo.id);
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
  // Gli indirizzi qui dentro sono come il telefono impara il tunnel nuovo:
  // senza, da fuori casa resta fermo su quello del giorno del QR.
  dice(
    "e dove trovare il PC adesso",
    Array.isArray(r.dati?.basi) && r.dati.basi[0] === "http://192.168.1.8:8790",
    `→ ${r.testo}`,
  );
}
{
  const r = await chiama("/io");
  dice("senza token non si sa chi sono", r.stato === 401);
}

console.log("\n— la libreria —");
{
  // Da qui in poi il quadro finto è del telefono: è quello che rende vere le
  // prove dei permessi qui sotto.
  const io = await chiama("/io", { token: tokenOspite });
  padroneQuadro = io.dati.id;
}
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

console.log("\n— ognuno vede le sue —");
{
  const suo = await chiama("/libreria", { token: tokenOspite });
  dice("il padrone la vede", suo.dati.voci.length === 1 && suo.dati.voci[0].mia === true);
  const altro = await chiama("/libreria", { token: tokenAdmin });
  dice("un altro no", altro.dati.voci.length === 0, `→ ${altro.dati.voci.length}`);
}
{
  const r = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"), {
    headers: { Authorization: "Bearer " + tokenAdmin },
  });
  dice("e non ne prende nemmeno il file", r.status === 404, `→ ${r.status}`);
}
{
  const r = await chiama("/libreria/" + encodeURIComponent("foto/quadro.png") + "/pubblica", {
    metodo: "POST", token: tokenAdmin, corpo: { pubblicato: true },
  });
  dice("in bacheca ce la mette solo chi l'ha fatta", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama("/libreria/" + encodeURIComponent("foto/quadro.png") + "/pubblica", {
    metodo: "POST", token: tokenOspite, corpo: { pubblicato: true },
  });
  dice("il padrone la mette in bacheca", r.stato === 200 && quadroInBacheca === true);
  const altro = await chiama("/libreria?dove=bacheca", { token: tokenAdmin });
  dice("e adesso la vedono tutti", altro.dati.voci.length === 1, `→ ${altro.dati.voci.length}`);
  dice("con scritto di chi è", altro.dati.voci[0].chiNome === "chi l'ha fatto");
  dice("ma non è sua", altro.dati.voci[0].mia === false);
  const file = await fetch(base + "/libreria/file/" + encodeURIComponent("foto/quadro.png"), {
    headers: { Authorization: "Bearer " + tokenAdmin },
  });
  dice("e il file adesso esce", file.status === 200, `→ ${file.status}`);
}
{
  const r = await chiama("/libreria/" + encodeURIComponent("foto/quadro.png"), {
    metodo: "DELETE", token: tokenAdmin,
  });
  dice("buttarla la può solo chi l'ha fatta", r.stato === 403, `→ ${r.stato}`);
}

console.log("\n— chi decide genera subito —");
{
  const prima = (await chiama("/richieste", { token: tokenAdmin })).dati.length;
  const r = await chiama("/azioni/genera.immagine", {
    metodo: "POST", token: tokenAdmin, corpo: { prompt: "una barca all'alba" },
  });
  dice("la richiesta di chi decide nasce accettata", r.dati?.richiesta?.stato === "accettata", `→ ${r.dati?.richiesta?.stato}`);
  const dopo = (await chiama("/richieste", { token: tokenAdmin })).dati;
  dice("ed è in elenco", dopo.length === prima + 1);
  const sua = await chiama("/azioni/genera.immagine", {
    metodo: "POST", token: tokenOspite, corpo: { prompt: "un gatto" },
  });
  dice("quella di chi chiede aspetta", sua.dati?.richiesta?.stato === "in-attesa", `→ ${sua.dati?.richiesta?.stato}`);
}

console.log("\n— il modello si sceglie da fuori —");
{
  const r = await chiama("/azioni", { token: tokenOspite });
  const immagine = r.dati.find((a) => a.id === "genera.immagine");
  const modello = immagine.campi.find((c) => c.nome === "modello");
  dice("c'è il campo del modello", !!modello, "");
  dice("con le scelte vere", (modello?.scelte || []).includes("flux2-9b"));
  dice("e come si chiamano per una persona", !!modello?.etichette?.["flux2-9b"]);
}
{
  const r = await chiama("/azioni/genera.immagine", {
    metodo: "POST", token: tokenOspite, corpo: { prompt: "un faro", modello: "flux2-9b" },
  });
  dice("il modello scelto viaggia con la richiesta", r.dati?.richiesta?.opzioni?.modello === "flux2-9b", `→ ${r.testo}`);
}
{
  const r = await chiama("/azioni/genera.immagine", {
    metodo: "POST", token: tokenOspite, corpo: { prompt: "x", modello: "inventato" },
  });
  dice("un modello che non esiste si rifiuta", r.stato === 400, `→ ${r.stato}`);
}

console.log("\n— riscrivere una richiesta —");
let daRiscrivere;
{
  const r = await chiama("/azioni/genera.immagine", {
    metodo: "POST", token: tokenOspite, corpo: { prompt: "un gatto" },
  });
  daRiscrivere = r.dati.richiesta.id;
}
{
  const r = await chiama(`/richieste/${daRiscrivere}/testo`, {
    metodo: "POST", token: tokenOspite, corpo: { testo: "quello che voglio io" },
  });
  dice("chi chiede non riscrive", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama(`/richieste/${daRiscrivere}/testo`, {
    metodo: "POST", token: tokenAdmin, corpo: { testo: "un gatto nero sul cofano" },
  });
  dice("chi decide riscrive a mano", r.stato === 200 && r.dati.testo === "un gatto nero sul cofano", `→ ${r.testo}`);
  dice("e com'era resta scritto", r.dati.testoOriginale === "un gatto", `→ ${r.dati.testoOriginale}`);
  dice("con chi l'ha riscritta", r.dati.riscrittaDa === "mano");
}
{
  const r = await chiama(`/richieste/${daRiscrivere}/migliora`, { metodo: "POST", token: tokenAdmin, corpo: {} });
  dice("il modello la riscrive", r.stato === 200 && /scritto meglio/.test(r.dati.testo), `→ ${r.testo}`);
  dice("e l'originale è ancora il primo", r.dati.testoOriginale === "un gatto");
  dice("adesso è dell'AI", r.dati.riscrittaDa === "ai");
}
{
  const r = await chiama("/ai/migliora", {
    metodo: "POST", token: tokenOspite, corpo: { testo: "due parole", app: "foto" },
  });
  dice("i tasti dell'AI non sono di chi chiede", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama("/ai/migliora", {
    metodo: "POST", token: tokenAdmin, corpo: { testo: "due parole", app: "musica" },
  });
  dice("chi decide li usa", r.stato === 200 && r.dati.testo === "[musica] due parole, scritto meglio", `→ ${r.testo}`);
  dice("e per un brano scrive anche le parole", r.dati.parole === "[Verse] due parole cantate", `→ ${r.testo}`);
}
{
  // Le parole finiscono **dentro la richiesta**, nella casella del testo da
  // cantare: chi ha chiesto una canzone dal telefono non se la scrive a mano.
  const chiesta = await chiama("/azioni/genera.brano", {
    metodo: "POST", token: tokenOspite, corpo: { descrizione: "una canzone sul mare" },
  });
  const idBrano = chiesta.dati.richiesta.id;
  const r = await chiama(`/richieste/${idBrano}/migliora`, { metodo: "POST", token: tokenAdmin, corpo: {} });
  dice("il brano si fa riscrivere", r.stato === 200 && /scritto meglio/.test(r.dati.testo), `→ ${r.testo}`);
  dice("e le parole entrano nella richiesta", r.dati.opzioni?.testo === "[Verse] due parole cantate", `→ ${JSON.stringify(r.dati.opzioni)}`);
  await chiama(`/richieste/${idBrano}`, { metodo: "DELETE", token: tokenAdmin });
}
{
  aiSpenta = true;
  const stato = await chiama("/ai", { token: tokenAdmin });
  dice("e quando il modello non c'è lo si sa prima", stato.dati.ok === false && !!stato.dati.motivo);
  const r = await chiama("/ai/migliora", { metodo: "POST", token: tokenAdmin, corpo: { testo: "x", app: "foto" } });
  dice("con LM Studio spento si spiega, non si esplode", r.stato === 502 && /LM Studio/.test(r.dati.errore), `→ ${r.stato}`);
  aiSpenta = false;
}
{
  // Una richiesta già partita non si riscrive: la scheda sta facendo l'altra.
  await chiama(`/richieste/${daRiscrivere}/stato`, { metodo: "POST", token: tokenAdmin, corpo: { stato: "accettata" } });
  const r = await chiama(`/richieste/${daRiscrivere}/testo`, {
    metodo: "POST", token: tokenAdmin, corpo: { testo: "troppo tardi" },
  });
  dice("una già partita non si riscrive", r.stato === 403, `→ ${r.stato}`);
}

console.log("\n— mettere via e buttare —");
{
  const r = await chiama(`/richieste/${daRiscrivere}`, { metodo: "PATCH", token: tokenAdmin });
  dice("una che lavora non si mette via", r.stato === 403, `→ ${r.stato}`);
  await chiama(`/richieste/${daRiscrivere}/stato`, { metodo: "POST", token: tokenAdmin, corpo: { stato: "scartata" } });
  const dopo = await chiama(`/richieste/${daRiscrivere}`, { metodo: "PATCH", token: tokenAdmin });
  dice("una finita sì", dopo.stato === 200, `→ ${dopo.stato}`);
  const elenco = await chiama("/richieste", { token: tokenAdmin });
  dice("ed è archiviata", elenco.dati.find((x) => x.id === daRiscrivere)?.stato === "archiviata");
}
{
  const r = await chiama(`/richieste/${daRiscrivere}`, { metodo: "DELETE", token: tokenOspite });
  dice("la propria si butta", r.stato === 200, `→ ${r.stato}`);
  const elenco = await chiama("/richieste", { token: tokenAdmin });
  dice("e sparisce davvero", !elenco.dati.some((x) => x.id === daRiscrivere));
}

console.log("\n— i regali —");
let idOspite;
let idRegalo;
{
  idOspite = (await chiama("/io", { token: tokenOspite })).dati.id;
}
{
  const r = await fetch(base + "/invii?a=" + encodeURIComponent(idOspite) + "&nome=foto.png", {
    method: "POST",
    headers: { Authorization: "Bearer " + tokenOspite, "Content-Type": "image/png" },
    body: "un regalo",
  });
  dice("mandare un file non è di chi chiede", r.status === 403, `→ ${r.status}`);
}
{
  const r = await fetch(base + "/invii?a=" + encodeURIComponent(idOspite) + "&nome=" + encodeURIComponent("un regalo.png"), {
    method: "POST",
    headers: { Authorization: "Bearer " + tokenAdmin, "Content-Type": "image/png" },
    body: "questo e' il regalo",
  });
  const dati = await r.json();
  idRegalo = dati.id;
  dice("chi decide lo manda", r.status === 201 && dati.bytes === 19, `→ ${r.status} ${JSON.stringify(dati)}`);
  dice("col nome vero", dati.nome === "un regalo.png");
}
{
  const suoi = await chiama("/invii", { token: tokenOspite });
  dice("arriva a chi doveva", suoi.dati.invii.length === 1 && suoi.dati.invii[0].id === idRegalo);
  dice("e non è ancora aperto", suoi.dati.invii[0].aperto === false);
  const altri = await chiama("/invii", { token: tokenAdmin });
  dice("chi l'ha mandato non se lo ritrova", altri.dati.invii.length === 0);
  const avvisi = await chiama("/notifiche", { token: tokenOspite });
  dice("e chi lo riceve viene avvisato", avvisi.dati.some((n) => /ricevuto/i.test(n.titolo)));
}
{
  const r = await fetch(base + "/invii/" + idRegalo + "/file", {
    headers: { Authorization: "Bearer " + tokenOspite },
  });
  const corpo = await r.text();
  dice("chi l'ha ricevuto lo scarica", r.status === 200 && corpo === "questo e' il regalo", `→ ${r.status}`);
  dice("e arriva col suo nome", /un regalo\.png/.test(r.headers.get("content-disposition") || ""));
}
{
  const r = await fetch(base + "/invii/" + idRegalo + "/file", {
    headers: { Authorization: "Bearer " + tokenAdmin },
  });
  dice("nessun altro lo scarica", r.status === 404, `→ ${r.status}`);
}
{
  const r = await chiama("/invii/" + idRegalo + "/aperto", { metodo: "POST", token: tokenOspite, corpo: {} });
  dice("si segna aperto", r.stato === 200 && r.dati.ok === true);
  const dopo = await chiama("/invii", { token: tokenOspite });
  dice("e resta aperto", dopo.dati.invii[0].aperto === true);
}
{
  const r = await chiama("/invii/" + idRegalo, { metodo: "DELETE", token: tokenAdmin });
  dice("un altro non lo butta", r.stato === 404, `→ ${r.stato}`);
  const suo = await chiama("/invii/" + idRegalo, { metodo: "DELETE", token: tokenOspite });
  dice("chi ce l'ha sì", suo.stato === 200);
  const dopo = await chiama("/invii", { token: tokenOspite });
  dice("e sparisce", dopo.dati.invii.length === 0);
}

console.log("\n— chi può decidere —");
{
  const r = await chiama("/dispositivi/" + idOspite, {
    metodo: "POST", token: tokenOspite, corpo: { ruolo: "admin" },
  });
  dice("nessuno si promuove da solo", r.stato === 403, `→ ${r.stato}`);
}
{
  const r = await chiama("/dispositivi/" + idOspite, {
    metodo: "POST", token: tokenAdmin, corpo: { ruolo: "admin" },
  });
  dice("chi decide promuove", r.stato === 200);
  const io = await chiama("/io", { token: tokenOspite });
  dice("e il ruolo è cambiato davvero", io.dati.ruolo === "admin", `→ ${io.dati.ruolo}`);
  const avvisi = await chiama("/notifiche", { token: tokenOspite });
  dice("e glielo si dice", avvisi.dati.some((n) => /decidere/i.test(n.titolo)));
}
{
  const r = await chiama("/dispositivi/" + idOspite, {
    metodo: "POST", token: tokenAdmin, corpo: { ruolo: "ospite" },
  });
  dice("e ci ripensa", r.stato === 200);
  const io = await chiama("/io", { token: tokenOspite });
  dice("tornando indietro", io.dati.ruolo === "ospite");
}

console.log("\n— i tuoi soliti —");
{
  const r = await chiama("/preset", {
    metodo: "POST", token: tokenOspite,
    corpo: { app: "foto", nome: "il mio stile", testo: "luce calda, pellicola", campi: { quante: "2" } },
  });
  dice("si salva un modo di generare", r.stato === 201 && r.dati.nome === "il mio stile", `→ ${r.testo}`);
  const elenco = await chiama("/preset?app=foto", { token: tokenAdmin });
  dice("e lo vedono anche gli altri dispositivi", elenco.dati.preset.length === 1);
  const altro = await chiama("/preset?app=musica", { token: tokenOspite });
  dice("ma solo per la scheda giusta", altro.dati.preset.length === 0);
}
{
  const r = await chiama("/preset", { metodo: "POST", token: tokenOspite, corpo: { app: "foto", nome: "" } });
  dice("uno senza nome si rifiuta", r.stato === 400, `→ ${r.stato}`);
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

console.log("\n— la macchina —");
{
  const r = await chiama("/macchina", { token: tokenAdmin });
  dice("lo stato della macchina si legge", r.stato === 200, `→ ${r.stato}`);
  dice("dice chi passa subito", typeof r.dati?.regole?.chiPassaSubito === "string");
  dice("dice se è in pausa", typeof r.dati?.inPausa === "boolean");
  /**
   * **Un telefono con i permessi da admin non è la casa.**
   *
   * È la riga che regge tutta la promessa «il pc è il vero admin»: chi decide
   * sulle richieste degli altri non può alzarsi i limiti a cui è sottoposto
   * lui. Se un giorno questo controllo salta, non si rompe niente — si apre.
   */
  dice("ma un telefono non è la casa", r.dati?.sonoLaCasa === false);
}
{
  const r = await chiama("/macchina/pausa", { metodo: "POST", token: tokenAdmin, corpo: { inPausa: true } });
  dice("mettere in pausa da fuori è vietato", r.stato === 403, `→ ${r.stato}`);
  dice("e lo dice in italiano", /solo dal computer/.test(r.dati?.errore || ""), r.dati?.errore);
}
{
  const r = await chiama("/macchina/regole", {
    metodo: "POST", token: tokenAdmin,
    corpo: { chiPassaSubito: "tutti", limiteFila: 0, limitePersona: 0 },
  });
  dice("cambiare i tetti da fuori è vietato", r.stato === 403, `→ ${r.stato}`);
  dice("e i tetti non sono cambiati", macchinaFinta.regole.chiPassaSubito === "admin");
}

console.log("\n— DaProd: i mi piace e il tieni —");
{
  padroneQuadro = "altro";
  quadroInBacheca = true;
  const r = await chiama("/libreria/foto%2Fquadro.png/mipiace", {
    metodo: "POST", token: tokenAdmin, corpo: { mipiace: true },
  });
  dice("si mette mi piace su una cosa in bacheca", r.stato === 200, `→ ${r.stato} ${r.testo}`);
  dice("e torna quanti sono", r.dati?.quanti === 1, `→ ${r.dati?.quanti}`);

  const via = await chiama("/libreria/foto%2Fquadro.png/mipiace", {
    metodo: "POST", token: tokenAdmin, corpo: { mipiace: false },
  });
  dice("e si toglie", via.dati?.quanti === 0);
}
{
  const r = await chiama("/libreria/foto%2Fquadro.png/tengo", {
    metodo: "POST", token: tokenAdmin, corpo: { tengo: true },
  });
  dice("una cosa in bacheca si tiene da parte", r.stato === 200, `→ ${r.stato}`);
}
{
  quadroInBacheca = false;
  const r = await chiama("/libreria/foto%2Fquadro.png/mipiace", {
    metodo: "POST", token: tokenAdmin, corpo: { mipiace: true },
  });
  dice("su una cosa non in bacheca non si mette", r.stato === 404, `→ ${r.stato}`);
  quadroInBacheca = true;
}

console.log("\n— il profilo —");
{
  const r = await chiama("/io/profilo", { metodo: "POST", token: tokenAdmin, corpo: { motto: "faccio cose" } });
  dice("la riga sotto al nome si cambia", r.stato === 200, `→ ${r.stato}`);
  const io = await chiama("/io", { token: tokenAdmin });
  dice("e si rilegge", io.dati?.motto === "faccio cose", `→ ${io.dati?.motto}`);
}
{
  // Un secondo dispositivo, per provare che il nome resta di uno solo anche
  // rinominandosi: sarebbe il modo più semplice di aggirare il controllo.
  const invito = remoto.nuovoInvito("ospite");
  const secondo = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "il secondo" } });
  const suoToken = secondo.dati?.token;
  const r = await chiama("/io/profilo", { metodo: "POST", token: suoToken, corpo: { nome: "portatile" } });
  dice("non ci si può rinominare come un altro", r.stato === 409, `→ ${r.stato}`);
  const buono = await chiama("/io/profilo", { metodo: "POST", token: suoToken, corpo: { nome: "il secondo bis" } });
  dice("ma un nome libero sì", buono.stato === 200, `→ ${buono.stato}`);
  if (secondo.dati?.dispositivo?.id) remoto.revoca(secondo.dati.dispositivo.id);
}

console.log("\n— la chiacchierata —");
{
  const r = await chiama("/modelli", { token: tokenAdmin });
  dice("i modelli si elencano", r.stato === 200 && Array.isArray(r.dati?.modelli), `→ ${r.stato}`);
}
{
  const r = await chiama("/chiacchierata", { token: tokenAdmin });
  dice("senza sessione non c'è sessione", r.stato === 200 && r.dati?.sessione === null, `→ ${r.testo}`);
}
{
  const r = await chiama("/chiacchierata", { metodo: "POST", token: tokenAdmin, corpo: { modello: "finto" } });
  dice("si comincia a parlare", r.stato === 201, `→ ${r.stato} ${r.testo}`);
  const id = r.dati?.sessione?.id;
  const detto = await chiama(`/chiacchierata/${id}/dico`, {
    metodo: "POST", token: tokenAdmin, corpo: { testo: "vorrei una foto di una macchina" },
  });
  dice("il modello risponde", detto.stato === 200, `→ ${detto.stato} ${detto.testo}`);
  dice("e propone un piano", (detto.dati?.sessione?.piano?.lavori || []).length === 1);
  const preso = await chiama(`/chiacchierata/${id}/piano`, {
    metodo: "POST", token: tokenAdmin, corpo: { quali: [0] },
  });
  dice("accettare il piano mette in fila", preso.stato === 201 && preso.dati?.quanti === 1, `→ ${preso.testo}`);
  const dopo = await chiama("/chiacchierata", { token: tokenAdmin });
  dice("e la chiacchierata si chiude da sé", dopo.dati?.sessione === null);
}

console.log("\n— la fila con i numeri —");
{
  const r = await chiama("/richieste", { token: tokenAdmin });
  const conNumero = (r.dati || []).filter((x) => typeof x.numero === "number");
  dice("ogni lavoro ha il suo numero", conNumero.length === (r.dati || []).length, `${conNumero.length}/${(r.dati || []).length}`);
  /**
   * I numeri non si ripetono e non tornano indietro: e' quello che li rende
   * utili per parlarne. Due lavori «numero 3» sono peggio di nessun numero.
   */
  const numeri = conNumero.map((x) => x.numero);
  dice("e non si ripetono", new Set(numeri).size === numeri.length);
}

console.log("\n— rifare un lavoro —");
{
  const prima = await chiama("/richieste", { token: tokenAdmin });
  const finita = (prima.dati || []).find((x) => x.stato === "pronta" || x.stato === "scartata");
  if (!finita) {
    dice("c'e' un lavoro finito da rifare", false, "nessuno");
  } else {
    const r = await chiama(`/richieste/${finita.id}/rifai`, { metodo: "POST", token: tokenAdmin, corpo: {} });
    dice("si rifa'", r.stato === 201, `→ ${r.stato} ${r.testo}`);
    dice("ed e' un lavoro nuovo", r.dati?.richiesta?.id !== finita.id);
    dice("con un numero nuovo", r.dati?.richiesta?.numero > finita.numero, `${finita.numero} → ${r.dati?.richiesta?.numero}`);

    const cambiata = await chiama(`/richieste/${finita.id}/rifai`, {
      metodo: "POST", token: tokenAdmin, corpo: { testo: "un faro, ma di notte" },
    });
    dice("e si puo' cambiare il testo", cambiata.dati?.richiesta?.testo === "un faro, ma di notte", cambiata.dati?.richiesta?.testo);
  }
}

console.log("\n— fermare e accettare tutto —");
{
  const r = await chiama("/macchina/ferma", { metodo: "POST", token: tokenAdmin, corpo: {} });
  dice("fermare da fuori e' vietato", r.stato === 403, `→ ${r.stato}`);
  dice("e non ha fermato niente", macchinaFinta.fermate === 0);
}
{
  const r = await chiama("/macchina/accetta-tutte", { metodo: "POST", token: tokenAdmin, corpo: {} });
  dice("chi decide puo' accettarle tutte", r.stato === 200, `→ ${r.stato} ${r.testo}`);
  dice("e dice quante ne sono partite", typeof r.dati?.quante === "number");
  const dopo = await chiama("/richieste", { token: tokenAdmin });
  const ferme = (dopo.dati || []).filter((x) => x.stato === "in-attesa");
  dice("non ne resta nessuna in attesa", ferme.length === 0, `ne restano ${ferme.length}`);
}

console.log("\n— gli stili —");
{
  const r = await chiama("/stili", { token: tokenAdmin });
  dice("si parte con un set", r.stato === 200 && (r.dati?.stili || []).length > 0, `→ ${r.testo}`);
}
{
  const r = await chiama("/stili", {
    metodo: "POST", token: tokenAdmin,
    corpo: { nome: "Il mio", testo: "italo disco, synthwave" },
  });
  dice("se ne salva uno nuovo", r.stato === 201, `→ ${r.stato} ${r.testo}`);
  const id = r.dati?.stile?.id;

  const senzaNiente = await chiama("/stili", { metodo: "POST", token: tokenAdmin, corpo: { nome: "", testo: "" } });
  dice("uno vuoto no", senzaNiente.stato === 400);

  const inVetrina = await chiama(`/stili/${id}/condividi`, {
    metodo: "POST", token: tokenAdmin, corpo: { condiviso: true },
  });
  dice("si mette in vetrina", inVetrina.stato === 200, `→ ${inVetrina.stato}`);

  /**
   * ⚠ **La vetrina non deve mostrarti i tuoi.** Sono gia' nella tua lista, e
   * vederli due volte farebbe credere di averne il doppio.
   */
  const mia = await chiama("/stili/vetrina", { token: tokenAdmin });
  dice("ma non compare nella propria vetrina", (mia.dati?.stili || []).length === 0, `→ ${mia.testo}`);

  // Un secondo dispositivo: lui lo deve vedere, e prenderlo.
  const invito = remoto.nuovoInvito("ospite");
  const altro = await chiama("/accoppiamento", { metodo: "POST", corpo: { codice: invito.codice, nome: "chi guarda" } });
  const suoToken = altro.dati?.token;
  const suaVetrina = await chiama("/stili/vetrina", { token: suoToken });
  dice("un altro lo vede in vetrina", (suaVetrina.dati?.stili || []).length === 1, `→ ${suaVetrina.testo}`);

  const preso = await chiama("/stili/vetrina/prendi", {
    metodo: "POST", token: suoToken,
    corpo: { nome: "Il mio", testo: "italo disco, synthwave", daNome: "portatile" },
  });
  dice("e se lo prende", preso.stato === 201, `→ ${preso.stato}`);
  dice("e resta scritto di chi era", preso.dati?.stile?.daNome === "portatile");

  /**
   * Prenderlo **ne fa una copia**: chi l'ha fatto puo' cambiarlo o toglierlo
   * dalla vetrina senza che all'altro sparisca da sotto le mani.
   */
  await chiama(`/stili/${id}`, { metodo: "DELETE", token: tokenAdmin });
  const suoi = await chiama("/stili", { token: suoToken });
  dice("e resta suo anche se l'altro lo butta", (suoi.dati?.stili || []).some((x) => x.nome === "Il mio"));
  if (altro.dati?.dispositivo?.id) remoto.revoca(altro.dati.dispositivo.id);
}

console.log("\n— le azioni sanno gli stili di chi chiede —");
{
  const r = await chiama("/azioni", { token: tokenAdmin });
  const brano = (r.dati || []).find((a) => a.id === "genera.brano");
  const stile = brano?.campi?.find((c) => c.nome === "stile");
  dice("il campo «uno stile pronto» c'e'", !!stile);
  dice("ed e' pieno di quelli di chi chiede", (stile?.scelte || []).length > 0, `→ ${(stile?.scelte || []).length}`);
  dice("con dentro anche le parole", !!stile?.testi && Object.keys(stile.testi).length > 0);

  const testo = brano?.campi?.find((c) => c.nome === "testo");
  dice("le sezioni si possono infilare", (testo?.inserti || []).includes("[Chorus]"));
  const durata = brano?.campi?.find((c) => c.nome === "secondi");
  dice("le durate sono pulsanti", (durata?.valoriTipici || []).includes(220));
  const lingua = brano?.campi?.find((c) => c.nome === "lingua");
  dice("e la lingua si sceglie", (lingua?.scelte || []).includes("it"));
}

console.log("\n— la frase che diventa un lavoro —");
{
  const fatto = await chiama("/capisci", {
    metodo: "POST",
    token: tokenAdmin,
    corpo: { frase: "fammi un video di una barca" },
  });
  dice("capisce una frase", fatto.dati?.ok === true);
  dice("e dice quale azione", fatto.dati?.azione === "genera.video");
  dice("con i campi dentro", !!fatto.dati?.valori?.prompt);
  dice("e chi ha risposto", fatto.dati?.da === "needle");

  const boh = await chiama("/capisci", {
    metodo: "POST",
    token: tokenAdmin,
    corpo: { frase: "che ore sono" },
  });
  dice("non capire non e' un errore", boh.stato === 200 && boh.dati?.ok === false);

  const vuota = await chiama("/capisci", { metodo: "POST", token: tokenAdmin, corpo: { frase: "  " } });
  dice("una frase vuota si ferma qui", vuota.stato === 400);

  const senzaToken = await chiama("/capisci", { metodo: "POST", corpo: { frase: "fammi un video" } });
  dice("e senza credenziale non si chiede", senzaToken.stato === 401);
}

console.log("\n— bussare invece di battere un codice —");
{
  // Il giro intero, come lo fa un telefono che ha scelto questo computer da un
  // elenco: bussa, chi decide lo vede, accetta, e il token nuovo funziona.
  const b = await chiama("/bussa", {
    metodo: "POST",
    corpo: { nome: "chi bussa", apparecchio: "SM-A536B" },
  });
  dice("bussare non vuole un token", b.stato === 201, "→ " + b.stato);
  dice("torna un'attesa e un segreto", !!b.dati?.attesa && !!b.dati?.segreto);

  const rete = await chiama("/rete", { token: tokenAdmin });
  dice("chi decide la vede", (rete.dati?.bussate || []).length === 1);
  dice("e non vede il segreto", !(rete.dati?.bussate || [])[0]?.segreto);
  dice("e nemmeno il token", !(rete.dati?.bussate || [])[0]?.token);

  const spiando = await chiama("/bussa/" + b.dati.attesa + "?segreto=sbagliato");
  dice("col segreto sbagliato non si ritira niente", spiando.stato === 404);

  const prima = await chiama("/bussa/" + b.dati.attesa + "?segreto=" + b.dati.segreto);
  dice("prima del si' si aspetta", prima.dati?.stato === "attesa");

  const si = await chiama("/bussate/" + b.dati.attesa, {
    metodo: "POST",
    token: tokenAdmin,
    corpo: { accetta: true, ruolo: "ospite" },
  });
  dice("chi decide dice di si'", si.stato === 200, "→ " + si.stato);

  const dopo = await chiama("/bussa/" + b.dati.attesa + "?segreto=" + b.dati.segreto);
  dice("e il telefono ritira la sua credenziale", dopo.dati?.stato === "accettata" && !!dopo.dati?.token);

  const io = await chiama("/io", { token: dopo.dati?.token });
  dice("che funziona davvero", io.stato === 200 && io.dati?.nome === "chi bussa");

  /**
   * Chi e' appena entrato da ospite **non puo' far entrare altri**.
   *
   * Si prova con la credenziale nata due righe fa e non con quella dell'ospite
   * di prima: quella, a questo punto del copione, e' gia' stata revocata, e un
   * 401 al posto di un 403 racconterebbe che la regola vale quando invece sta
   * solo rispondendo a un token morto.
   */
  const secondo = await chiama("/bussa", {
    metodo: "POST",
    corpo: { nome: "un altro che bussa", apparecchio: "un tablet" },
  });
  const daOspite = await chiama("/bussate/" + secondo.dati.attesa, {
    metodo: "POST",
    token: dopo.dati?.token,
    corpo: { accetta: true },
  });
  dice("un ospite non puo' far entrare nessuno", daOspite.stato === 403, "→ " + daOspite.stato);

  const laReteDaOspite = await chiama("/rete", { token: dopo.dati?.token });
  dice("e non vede nemmeno chi sta bussando", (laReteDaOspite.dati?.bussate || []).length === 0);

  const doppio = await chiama("/bussate/" + b.dati.attesa, {
    metodo: "POST",
    token: tokenAdmin,
    corpo: { accetta: true },
  });
  dice("e non si puo' accettare due volte", doppio.stato === 409, "→ " + doppio.stato);

  const nomePreso = await chiama("/bussa", {
    metodo: "POST",
    corpo: { nome: "chi bussa", apparecchio: "un altro telefono" },
  });
  dice("un nome gia' preso si ferma qui", !!nomePreso.dati?.errore, "→ " + nomePreso.stato);
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

console.log("\n— i computer si sentono fra loro —");
{
  /**
   * L'annuncio UDP, provato davvero: uno parla, uno ascolta.
   *
   * ⚠ Questa prova esiste perché la prima stesura **non funzionava** e sembrava
   * funzionare: chi riceveva un «ehi» rispondeva al gruppo sulla porta 8791,
   * che va benissimo fra due computer e non arriva mai a un telefono, il quale
   * apre una porta qualunque. Senza questo giro non se ne sarebbe accorto
   * nessuno prima di avere due macchine accese.
   */
  const annuncio = new G.Rete(() => ({
    id: "pc_diprova",
    nome: "PC-CHE-SI-ANNUNCIA",
    versione: "0.9.0",
    porta: 8790,
    basi: ["http://127.0.0.1:8790"],
    apre: true,
  }));
  annuncio.accendi();
  const sentiti = await G.ascoltaUnMomento(1500);
  const lui = sentiti.find((p) => p.id === "pc_diprova");
  dice("chi ascolta lo sente", !!lui, "→ " + sentiti.length + " sentiti");
  dice("e sa come si chiama", lui?.nome === "PC-CHE-SI-ANNUNCIA");
  dice("e dove bussargli", (lui?.basi || []).length > 0);
  annuncio.spegni();
}

await gateway.chiudi();
archivio.scriviAdesso();
console.log(falliti === 0 ? "\nTutto a posto.\n" : `\n${falliti} prove fallite.\n`);
process.exit(falliti === 0 ? 0 : 1);
