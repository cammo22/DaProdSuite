/**
 * Un banco di prova per la console, con un gateway vero e dati finti.
 *
 *     node apps/shell/scripts/banco-console.mjs
 *
 * **A cosa serve, e perché non basta `prova-gateway`.** Quella prova le rotte:
 * chiede, guarda la risposta, dice se è giusta. Questa serve l'altra metà —
 * **la pagina** — che è tremila righe di JavaScript che nessun controllo di
 * tipi guarda. Un id sbagliato in una `$()` non è un errore: è un tasto che non
 * fa niente, e lo si scopre sul telefono di qualcun altro.
 *
 * Qui il gateway è quello vero, la pagina è quella vera, e sotto ci sono dati
 * finti abbastanza da far comparire tutto: una libreria con tre cose, una
 * bacheca, dei pensieri, degli stili, una fila con dei numeri, e un modello con
 * cui si può parlare. Si apre in un browser e si guarda.
 *
 * ⚠ **Non è una prova automatica**: non torna 0 o 1, resta in ascolto finché non
 * lo si chiude. È il banco su cui si guarda con gli occhi, che per
 * un'interfaccia resta l'unico modo di sapere se funziona.
 *
 * Vuole `packages/gateway/dist` compilato, e stampa l'indirizzo con dentro il
 * token: si apre e si è già entrati.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const G = require(join(import.meta.dirname, "..", "..", "..", "packages", "gateway", "dist", "index.js"));

/**
 * Dove il banco tiene le sue cose.
 *
 * Di suo, una cartella nuova a ogni accensione: e' quello che serve a chi lo
 * apre per guardare una schermata, e non lascia in giro niente.
 *
 * Con `BANCO_DATI` si fissa. Serve a chi sta provando **con un telefono
 * collegato**: a ogni riavvio del banco i token cambiano, e il telefono si
 * ritroverebbe scollegato a ogni ricompilazione — cioe' dieci volte in
 * un'ora. Con la cartella ferma, l'accoppiamento resta.
 */
const radice = process.env.BANCO_DATI || mkdtempSync(join(tmpdir(), "daprod-banco-"));
mkdirSync(radice, { recursive: true });
const archivio = new G.Archivio(join(radice, "remoto.json"));
const remoto = new G.Remoto(archivio, radice);

/* ----------------------------------------------------------- roba finta */

const cartella = join(radice, "libreria");
mkdirSync(cartella, { recursive: true });

/**
 * Un PNG vero, piccolissimo.
 *
 * Serve che sia vero: un file di testo con estensione `.png` fa comparire nella
 * galleria un riquadro rotto, e allora non si capisce se il difetto è
 * dell'immagine finta o della pagina.
 */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
writeFileSync(join(cartella, "quadro.png"), PIXEL);
writeFileSync(join(cartella, "clip.mp4"), PIXEL);
writeFileSync(join(cartella, "brano.mp3"), PIXEL);

const voci = [
  {
    id: "foto/quadro.png", nome: "un faro sulla scogliera al tramonto",
    tipo: "immagine", app: "foto", file: "quadro.png", mime: "image/png",
    fatta: {
      "Il prompt": "un faro sulla scogliera al tramonto, luce calda, fotografia",
      "Che forma": "1:1 - quadrato",
      "Quanto grande": "1080p",
      "Quante immagini": "2",
      "Con che modello": "FLUX.2 Klein 9B",
    },
  },
  {
    id: "cinema/clip.mp4", nome: "una barca che entra in porto",
    tipo: "video", app: "cinema", file: "clip.mp4", mime: "video/mp4",
    fatta: {
      "Il prompt": "una barca che entra in porto all'alba, ripresa dall'alto",
      "Quanto dura": "5 secondi",
      "Con che modello": "LTX 2.5",
    },
  },
  {
    id: "musica/brano.mp3", nome: "Ammore mio",
    tipo: "audio", app: "musica", file: "brano.mp3", mime: "audio/mpeg",
    fatta: {
      "Il titolo": "Ammore mio",
      "Che genere": "neapolitan neomelodic pop, melodic trap",
      "Il testo": "Ammore mio, tu staje luntano\ne io t'aspetto cca'",
      "Quanto dura": "60 secondi",
    },
  },
];

const cuori = new Map();
const inBacheca = new Set(["cinema/clip.mp4"]);

/** I commenti finti: id della voce → elenco. Come nella libreria vera. */
const parole = new Map([
  [
    "cinema/clip.mp4",
    [
      { id: "c1", chi: "altro", chiNome: "Giulia", testo: "Questa barca mi fa venire voglia di partire.", quando: Date.now() - 7200_000 },
      { id: "c2", chi: "pc", chiNome: "il computer", testo: "L'ho rifatta tre volte prima che il porto venisse dritto.", quando: Date.now() - 600_000 },
    ],
  ],
]);

const comeEsce = (v, chi) => ({
  id: v.id,
  nome: v.nome,
  tipo: v.tipo,
  app: v.app,
  creato: Date.now() - 3600_000,
  bytes: 68,
  mime: v.mime,
  chi: "pc",
  chiNome: "il computer",
  // La faccia di chi l'ha fatta, come la manda lo shell vero.
  chiFoto: G.indirizzoDellaFoto({ id: "pc", foto: "finta.jpg" }),
  pubblicato: inBacheca.has(v.id),
  mia: true,
  quantiMiPiace: (cuori.get(v.id) ?? new Set()).size,
  mioMiPiace: (cuori.get(v.id) ?? new Set()).has(chi),
  quantiCommenti: (parole.get(v.id) ?? []).length,
  tenuta: false,
  anteprima: v.tipo === "immagine",
  didascalia: v.nome,
  /**
   * Com'e' stata fatta: quello che era stato chiesto, campo per campo.
   *
   * Serve a guardare il riquadro che si apre col tasto «Com'e' stata fatta» —
   * lo stesso in galleria e nel lettore dalla 1.2.3 — e a controllare che
   * «salvalo come prompt» si porti dietro tutti i campi e non solo il primo.
   */
  comeEStataFatta: v.fatta,
});

const libreria = {
  elenco: ({ chi, tipo, dove }) =>
    voci
      .filter((v) => (!tipo || v.tipo === tipo))
      .filter((v) => (dove === "bacheca" ? inBacheca.has(v.id) : true))
      .map((v) => comeEsce(v, chi)),
  file: (id) => {
    const v = voci.find((x) => x.id === id);
    return v ? { percorso: join(cartella, v.file), nome: v.nome, mime: v.mime, bytes: 68 } : null;
  },
  anteprima: async (id) => {
    const v = voci.find((x) => x.id === id);
    return v && v.tipo === "immagine" ? join(cartella, v.file) : null;
  },
  pubblica: (id, chi, si) => {
    if (si) inBacheca.add(id);
    else inBacheca.delete(id);
    return true;
  },
  elimina: () => true,
  miPiace: (id, chi, mi) => {
    const chi_ = cuori.get(id) ?? new Set();
    if (mi) chi_.add(chi);
    else chi_.delete(chi);
    cuori.set(id, chi_);
    return chi_.size;
  },
  tieni: () => true,
  /**
   * I commenti, nuovi nella 0.8.1.
   *
   * Il banco li tiene in memoria e li perde chiudendolo, e va benissimo: qui
   * si guarda **la pagina**, non la persistenza — quella la prova il codice
   * vero della libreria, che li scrive nel `.json` accanto al file.
   */
  commenti: (id, chi) =>
    (parole.get(id) ?? []).map((c) => ({
      ...c,
      mioDaTogliere: c.chi === chi || c.chi === "pc",
      chiFoto: G.indirizzoDellaFoto({ id: c.chi, foto: c.chi + ".jpg" }),
    })),
  commenta: (id, chi, testo) => {
    const dopo = [
      ...(parole.get(id) ?? []),
      { id: "c" + Date.now(), chi, chiNome: "chi prova", testo, quando: Date.now() },
    ];
    parole.set(id, dopo);
    return dopo.map((c) => ({ ...c, mioDaTogliere: c.chi === chi || c.chi === "pc" }));
  },
  togliCommento: (id, idc, chi) => {
    const dopo = (parole.get(id) ?? []).filter((c) => c.id !== idc);
    parole.set(id, dopo);
    return dopo.map((c) => ({ ...c, mioDaTogliere: c.chi === chi || c.chi === "pc" }));
  },
  aggiungi: (dati) => ({ ...dati, id: "connessione/" + dati.nome, tipo: "immagine", app: "connessione", creato: Date.now(), mia: true }),
};

const stili = new Map();
const fintiStili = {
  miei: (chi, genere) => {
    if (!stili.has(chi)) {
      stili.set(chi, [
        { id: "s1", nome: "Neomelodico trap", testo: "neapolitan neomelodic pop, melodic trap, autotune ballad", tipo: "musica", da: "partenza", quando: 1 },
        { id: "s2", nome: "Nu disco notturno", testo: "nu disco, french house, disco funk", tipo: "musica", da: "partenza", quando: 2 },
        { id: "s3", nome: "Il mio", testo: "italo disco, synthwave", tipo: "musica", da: "mio", quando: 3, condiviso: true },
        // Un prompt vero, con i campi del modulo dentro: e' quello che serve a
        // guardare la riga «I tuoi prompt» in Produzione, e a controllare che
        // ritrovandolo si riempia tutto il modulo e non la sola casella.
        {
          id: "s4",
          nome: "Robot con la chitarra",
          testo: "Un robot che suona una chitarra in un teatro in fiamme",
          tipo: "immagine",
          genere: "prompt",
          campi: { quante: "2", modello: "flux2-9b" },
          da: "mio",
          quando: 5,
        },
      ]);
    }
    const tutti = stili.get(chi);
    // Come quello vero: senza genere tornano stili e prompt insieme.
    if (!genere) return tutti;
    return tutti.filter((s) => (s.genere || "stile") === genere);
  },
  vetrina: () => [
    { id: "v1", nome: "Boom bap partenopeo", testo: "boom bap, italian hip hop", da: "mio", quando: 4, chi: "altro", chiNome: "Giulia" },
  ],
  salva: (chi, dati) => {
    const miei = fintiStili.miei(chi);
    const gia = miei.find((s) => s.id === dati.id || s.nome === dati.nome);
    if (gia) return Object.assign(gia, { nome: dati.nome, testo: dati.testo });
    const nuovo = { ...dati, id: "s" + (miei.length + 1), quando: Date.now() };
    miei.push(nuovo);
    return nuovo;
  },
  togli: (chi, id) => {
    const miei = fintiStili.miei(chi);
    const dove = miei.findIndex((s) => s.id === id);
    if (dove >= 0) miei.splice(dove, 1);
    return dove >= 0;
  },
  condividi: (chi, id, si) => {
    const s = fintiStili.miei(chi).find((x) => x.id === id);
    if (s) s.condiviso = si;
    return !!s;
  },
};

/** La macchina: una generazione in corso e due in fila, per vedere i numeri. */
const macchina = {
  inPausa: false,
  regole: { chiPassaSubito: "admin", limiteFila: 6, limitePersona: 2, contestoLlm: 65536 },
  stato: (d) => ({
    adesso: {
      che: "DaProdCinema: una barca che entra in porto all'alba",
      chi: "Giulia",
      mestiere: "generazione",
      numero: 46,
      richiesta: "r-finta",
      da: Date.now() - 184_000,
    },
    fila: [
      { id: "f1", che: "DaProdFoto: un faro sulla scogliera", chi: "portatile", mestiere: "generazione", tuo: true, numero: 47, posto: 1, tuoDaTogliere: true },
      { id: "f2", che: "DaProdMusica: Ammore mio", chi: "Marco", mestiere: "generazione", tuo: false, numero: 48, posto: 2, tuoDaTogliere: false },
    ],
    inPausa: macchina.inPausa,
    trattenute: [{ id: "t1", testo: "#49 un tramonto sul golfo", perche: "Hai gia' 2 lavori in fila: questo parte quando ne finisce uno.", tuo: true }],
    regole: macchina.regole,
    // Il banco finge di essere il computer: cosi' si vedono anche gli
    // interruttori, che sono la meta' che non si potrebbe guardare da fuori.
    sonoLaCasa: true,
  }),
  pausa: (v) => { macchina.inPausa = v; },
  regole_: (v) => { macchina.regole = { ...macchina.regole, ...v }; },
  togli: () => null,
  fermaAdesso: () => null,
  accettaTutte: () => 1,
};

let sessione = null;
const chiacchierata = {
  modelli: async () => [
    { id: "qwen3-4b", caricato: false },
    { id: "prism-ml/bonsai-27b", caricato: true },
  ],
  comincia: async ({ dispositivoId, chiNome, modello }) => {
    sessione = { id: "ch-1", dispositivoId, chiNome, modello, scade: Date.now() + 600_000, battute: [] };
    return { sessione };
  },
  dico: async ({ testo }) => {
    sessione.battute.push({ chi: "io", testo, quando: Date.now() });
    sessione.battute.push({ chi: "modello", testo: "Ho messo nel piano una canzone e una foto.", quando: Date.now() });
    sessione.piano = {
      id: "pi-1",
      riassunto: "Ti propongo 2 cose: una canzone d'amore a Napoli, una foto del golfo.",
      lavori: [
        {
          azione: "genera.brano",
          app: "musica",
          che: "una canzone d'amore a Napoli",
          campi: {
            descrizione: "neapolitan neomelodic pop, melodic trap, autotune ballad",
            testo: "[Verse]\nLe luci del porto si accendono piano\n\n[Chorus]\nAmmore mio, nun te ne jiì",
            lingua: "it",
            secondi: "120",
            stile: "Neomelodico trap",
          },
        },
        {
          azione: "genera.immagine",
          app: "foto",
          che: "una foto del golfo al tramonto",
          campi: { prompt: "the gulf of naples at sunset, warm light, film grain", quante: "2" },
        },
      ],
    };
    return { sessione };
  },
  mia: (id) => (sessione && sessione.dispositivoId === id ? sessione : null),
  attesa: () => null,
  esci: () => true,
  chiudi: () => { sessione = null; },
  accetta: async ({ quali }) => {
    sessione = null;
    return { quanti: quali.length || 2 };
  },
};

/* ---------------------------------------------------------- il gateway */

const gateway = new G.Gateway({
  remoto,
  versione: "0.7.7-banco",
  computer: "BANCO-DI-PROVA",
  stato: () => ({
    versione: "0.7.7-banco",
    computer: "BANCO-DI-PROVA",
    attiva: true,
    attivita: [{ app: "cinema", nome: "DaProdCinema", stato: "accesa" }],
    coda: { attesa: 1, lavoro: 1, pronte: 3 },
  }),
  libreria,
  stili: fintiStili,
  macchina: {
    stato: macchina.stato,
    pausa: macchina.pausa,
    regole: macchina.regole_,
    togli: macchina.togli,
    fermaAdesso: macchina.fermaAdesso,
    accettaTutte: macchina.accettaTutte,
  },
  chiacchierata,
  ai: {
    disponibile: async () => null,
    migliora: async ({ testo, app }) => ({
      testo: `[${app}] ${testo}, scritto meglio`,
      parole: "[Verse] due parole cantate",
    }),
    /**
     * Un finto Needle: guarda tre parole e decide.
     *
     * Non deve essere bravo — deve far comparire il modulo riempito, che e' la
     * cosa che si guarda con gli occhi. Il vero sta in `needle.ts`.
     */
    capisci: async (frase) => {
      const f = frase.toLowerCase();
      if (/video|clip|filmat/.test(f)) {
        return { azione: "genera.video", valori: { prompt: frase, secondi: "5" }, fiducia: 0.9, perche: "«video» → una clip", da: "needle" };
      }
      if (/canzon|brano|music/.test(f)) {
        return { azione: "genera.brano", valori: { descrizione: frase, secondi: "60" }, fiducia: 0.9, perche: "«canzone» → un brano", da: "needle" };
      }
      if (/foto|immagin|quadro|disegn/.test(f)) {
        return { azione: "genera.immagine", valori: { prompt: frase, quante: "1" }, fiducia: 0.9, perche: "«foto» → un'immagine", da: "needle" };
      }
      return null;
    },
  },
  pannello: {
    /**
     * Il QR per scaricare l'app.
     *
     * Qui non si disegna davvero — il banco non ha `qrcode` — ma la forma della
     * risposta e' quella vera, e l'indirizzo pure: e' quello che conta per
     * guardare come viene il foglio.
     */
    qrApp: async () => ({
      url: "https://github.com/cammo22/DaProdSuite/releases/latest",
      qr:
        "data:image/svg+xml;base64," +
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">' +
            '<rect width="8" height="8" fill="#fff"/>' +
            '<path fill="#000" d="M0 0h3v3H0zM5 0h3v3H5zM0 5h3v3H0zM4 4h1v1H4zM6 5h1v1H6zM4 6h1v1H4z"/>' +
            "</svg>",
        ).toString("base64"),
    }),

    stato: (d) => ({
      computer: "BANCO-DI-PROVA",
      versione: "0.7.7-banco",
      indirizzi: [
        { base: "http://192.168.1.8:8790", che: "la rete di casa", dove: "casa" },
        { base: "https://finto.trycloudflare.com", che: "da Internet", dove: "ovunque" },
      ],
      tunnel: { fase: "acceso", indirizzo: "https://finto.trycloudflare.com" },
      firewall: { aperta: true, incerto: false },
      // Come fa lo shell vero: la faccia esce come **indirizzo** con dentro la
      // versione, non come nome del file. La formula e' quella vera, presa dal
      // gateway: una seconda copia qui sarebbe un banco che prova se' stesso.
      dispositivi: remoto.listaDispositivi().map(({ token, ...resto }) => ({
        ...resto,
        foto: G.indirizzoDellaFoto(resto),
      })),
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
  esegui: async (id, valori) => ({ fatto: true, id, valori }),
});

/* --------------------------------------------------------- si accende */

/**
 * Chi prova: si accoppia una volta, e le volte dopo si ritrova.
 *
 * Con la cartella dei dati fissa (`BANCO_DATI`) l'archivio sopravvive al
 * riavvio, e riaccoppiarsi con lo stesso nome fallisce — il nome e' gia' preso,
 * da se stessi. Prima questa riga faceva morire il banco all'avvio con un
 * errore che non diceva niente.
 */
/**
 * Con che ruolo si entra: admin di suo, `BANCO_RUOLO=ospite` per l'altro.
 *
 * Serve a guardare le due mezze suite che esistono dalla 1.2.4: chi decide vede
 * la **Fila**, chi non decide vede le **Notifiche** al posto suo. E' una
 * differenza che non si vede leggendo il codice — si vede aprendo le due
 * schermate una accanto all'altra.
 */
const RUOLO = process.env.BANCO_RUOLO === "ospite" ? "ospite" : "admin";
const gia = remoto.archivi.datiCorrenti.dispositivi.find((d) => d.nome === "chi prova");
const esito = gia
  ? { dispositivo: gia, token: gia.token }
  : remoto.accoppia(remoto.nuovoInvito(RUOLO).codice, "chi prova");
// La cartella dei dati puo' sopravvivere al riavvio: se il ruolo chiesto e'
// cambiato, si cambia anche a chi c'era gia'.
if (!("errore" in esito) && esito.dispositivo.ruolo !== RUOLO) {
  esito.dispositivo.ruolo = RUOLO;
}
if ("errore" in esito) throw new Error(esito.errore);

// Qualche richiesta finta, per riempire il Riepilogo e vedere i numeri.
for (const [testo, stato] of [
  ["un faro sulla scogliera al tramonto", "pronta"],
  ["una barca che entra in porto", "in-lavoro"],
  ["un tramonto sul golfo", "in-attesa"],
  ["una canzone d'amore a Napoli", "scartata"],
]) {
  const r = remoto.creaRichiesta({
    tipo: "foto",
    app: "foto",
    testo,
    opzioni: { azione: "genera.immagine" },
    daDispositivo: esito.dispositivo,
  });
  r.stato = stato;
  if (stato === "pronta") r.risultato = { nome: "quadro.png", percorso: "quadro.png", tipo: "image/png", bytes: 68, quando: Date.now() };
  if (stato === "scartata") r.motivoScarto = "Fermato da chi sta al computer.";
}
/**
 * Qualche notifica finta, per guardare il pannello che si apre dal proprio nome
 * e la scheda che per chi non decide diventa «Notifiche».
 *
 * Sono le tre famiglie che passano il filtro sul telefono: una cosa pronta, una
 * persona che ti scrive, un lavoro andato storto. La terza serve piu' delle
 * altre — e' quella con il tasto «Rimanda».
 */
for (const [titolo, corpo] of [
  ["Il computer", "La tua foto e' pronta: «un faro sulla scogliera al tramonto»"],
  ["Giulia", "ha commentato la tua barca che entra in porto"],
  ["Il computer", "«un tramonto sul golfo»: non fatto, la scheda video era occupata"],
]) {
  remoto.avvisaPersona(esito.dispositivo.id, titolo, corpo);
}

archivio.scriviAdesso();

/**
 * La porta: casuale di suo, fissa se qualcuno la chiede.
 *
 * Casuale va bene per chi apre il banco a mano e copia l'indirizzo. Serve
 * poterla fissare (`BANCO_PORTA=8799`) a chi guida il banco da fuori — un
 * browser pilotato, una prova che confronta due schermate — e non ha modo di
 * leggere un numero che cambia ogni volta.
 */
const porta = await gateway.ascolta(Number(process.env.BANCO_PORTA) || 0, "127.0.0.1");
const base = `http://127.0.0.1:${porta}`;

console.log("\n  Il banco è acceso.\n");
console.log(`  Come computer:  ${base}/#t=${esito.token}&u=chi%20prova&m=computer`);
console.log(`  Come telefono:  ${base}/#t=${esito.token}&u=chi%20prova&m=telefono`);
console.log("\n  Ctrl+C per chiudere.\n");
