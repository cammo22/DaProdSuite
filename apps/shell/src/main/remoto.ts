/**
 * L'accesso remoto, dentro lo shell.
 *
 * Questo modulo possiede il gateway: lo accende e lo spegne, gli fornisce lo
 * stato vivo della suite (per lo streaming verso telefono e console), esegue le
 * azioni che non passano dalla fila, e traduce i suoi tipi in quelli che l'hub
 * conosce (in @daprod/ipc). È l'unico posto dello shell che importa
 * `@daprod/gateway`.
 *
 * Nessuna logica di rete qui: quella sta nel gateway. Qui c'è solo il
 * cablaggio fra tre mondi che imparano a conoscersi — e l'esecutore, che è
 * l'unico pezzo che deve conoscerli tutti e due.
 */

import { app } from "electron";
import * as QRCode from "qrcode";
import {
  Archivio,
  Gateway,
  Remoto,
  type Dispositivo,
  type Esecutore,
  type FornitoreLibreria,
  type InvitoQr,
  type Risultato,
  type StatoSuite,
} from "@daprod/gateway";
import { APPS, APP_IDS, type AppId, type AppStatus, type TipoElemento } from "@daprod/ipc";
import type {
  DispositivoRemoto,
  EsitoDecisione,
  InvitoRemoto,
  RichiestaRemota,
  StatoAccesso,
} from "@daprod/ipc";
import { appManager } from "./app-manager";
import { libreria } from "./libreria";
import { REMOTO_ARCHIVIO, REMOTO_DIR } from "./paths";
import { ipLocale, reti } from "./reti";
import { accendiTunnel, spegniTunnel, statoTunnel, suTunnelCambiato } from "./tunnel";
import { apriLaPorta, statoFirewall, type StatoFirewall } from "./firewall";

/** Su quale porta ascolta il gateway. */
const PORTA = 8790;

/** Un solo archivio per tutta la vita della suite: i dati non si perdono. */
const archivio = new Archivio(REMOTO_ARCHIVIO);
const remoto = new Remoto(archivio, REMOTO_DIR);

let gateway: Gateway | null = null;
let portaReale = 0;

/** I listener che aspettano il prossimo cambiamento (il pannello dell'hub). */
const ascoltatori = new Set<() => void>();

/**
 * Come si legge uno stato di app per chi guarda da fuori.
 *
 * Chi è dall'altra stanza non deve tradurre "in-preparazione": deve leggere una
 * frase. Le app che non compaiono qui non compaiono nemmeno nell'elenco — che
 * un'app sia installata e ferma non è una notizia.
 */
const STATI_LEGGIBILI: Partial<Record<AppStatus, string>> = {
  attiva: "accesa",
  "in-avvio": "si sta accendendo",
  "in-preparazione": "sta scaricando quel che le manca",
  "in-errore": "in errore",
};

/**
 * Lo stato vivo per chi guarda da fuori.
 *
 * Non è il progresso del motore (nessuno oltre al motore lo conosce): è ciò che
 * la suite sa davvero — schede accese, cosa manca, quanta fila c'è. Per una
 * squadra che guarda da un'altra stanza basta, e non promette una barra di
 * avanzamento che nessuno saprebbe riempire.
 */
function statoSuite(): StatoSuite {
  const attivita = appManager
    .list()
    .filter((s) => STATI_LEGGIBILI[s.status] !== undefined)
    .map((s) => ({
      app: s.id,
      nome: APPS[s.id]?.name ?? s.id,
      stato: STATI_LEGGIBILI[s.status] ?? s.status,
      dettaglio: s.progress?.label ?? s.error,
    }));

  const richieste = remoto.archivi.datiCorrenti.richieste;
  return {
    versione: app.getVersion(),
    computer: osNome(),
    attiva: gateway !== null,
    attivita,
    coda: {
      attesa: richieste.filter((r) => r.stato === "in-attesa").length,
      lavoro: richieste.filter((r) => r.stato === "accettata" || r.stato === "in-lavoro").length,
      pronte: richieste.filter((r) => r.stato === "pronta").length,
    },
  };
}

function osNome(): string {
  return process.env.COMPUTERNAME ?? "questo computer";
}

/**
 * L'indirizzo scelto a mano, se ce n'è uno.
 *
 * Vive quanto la sessione: cambiarlo è un gesto raro, e ricordarlo per sempre
 * vorrebbe dire che una scheda staccata mesi fa continua a rompere il pannello.
 * Se non c'è, decide la classifica in `reti.ts`.
 */
let reteScelta: string | undefined;

/** Cos'è il gateway visto dalla rete di casa: ip:porta. */
function indirizzo(): string {
  if (!gateway) return "";
  return `${ipLocale(reteScelta)}:${portaReale || PORTA}`;
}

/**
 * L'indirizzo da mettere nel QR e da dare a chi si collega.
 *
 * Con il tunnel acceso è quello pubblico su Internet, e vince: è l'unico che
 * funziona **anche** da fuori casa, e in casa funziona lo stesso — passa da
 * Cloudflare e torna giù, che costa qualche millisecondo e non si sente.
 * Spento, è l'indirizzo sulla wifi, in chiaro, come è sempre stato.
 */
function base(): string {
  if (!gateway) return "";
  const fuori = statoTunnel();
  if (fuori.fase === "acceso" && fuori.indirizzo) return fuori.indirizzo;
  return `http://${indirizzo()}`;
}

/**
 * Cambia l'indirizzo su cui farsi trovare.
 *
 * Gli inviti già dati **restano validi ma puntano all'indirizzo vecchio**: un
 * QR è una fotografia. Quindi si buttano, e chi guarda il pannello vede che
 * deve rifarne uno invece di inquadrare un codice che non porta più da nessuna
 * parte.
 */
function scegliRete(ip: string): StatoAccesso {
  reteScelta = reti().some((r) => r.ip === ip) ? ip : undefined;
  remoto.buttaInviti();
  sveglia();
  return statoPannello();
}

/* ---------------------------------------------------------- l'esecutore */

/**
 * Chi esegue le azioni che non passano dalla fila.
 *
 * Sono quelle che leggono e basta, più le due che decidono — e stanno qui e non
 * nel gateway per una ragione precisa: il gateway non conosce la libreria, non
 * conosce le finestre, e non deve. Lui verifica chi chiede e cosa chiede; cosa
 * voglia dire davvero "gli ultimi risultati" lo sa solo lo shell.
 *
 * Le azioni che occupano la scheda video **non passano da qui**: diventano una
 * richiesta in fila, e il sì lo dà una persona. Vedi packages/azioni.
 */
const esegui: Esecutore = async (id, valori, dispositivo) => {
  switch (id) {
    case "libreria.ultimi": {
      const quanti = Number(valori.quanti ?? 20);
      const filtro: { tipo?: TipoElemento; app?: AppId } = {};
      if (valori.tipo) filtro.tipo = String(valori.tipo) as TipoElemento;
      if (valori.app) filtro.app = String(valori.app) as AppId;
      return libreria
        .cerca(filtro)
        .slice(0, quanti)
        .map((e) => ({
          nome: e.nome,
          tipo: e.tipo,
          app: e.app,
          quando: new Date(e.creato).toISOString(),
          megabyte: Math.round(e.bytes / 100_000) / 10,
        }));
    }

    case "suite.stato": {
      const stato = statoSuite();
      return {
        computer: stato.computer,
        versione: stato.versione,
        appAccese: stato.attivita.map((a) => `${a.nome}: ${a.stato}`),
        coda: stato.coda,
      };
    }

    case "coda.elenco": {
      const quante = Number(valori.quante ?? 20);
      return remoto
        .richiesteDi(dispositivo)
        .slice(0, quante)
        .map((r) => ({
          id: r.id,
          nome: r.testo,
          tipo: r.tipo,
          app: r.app,
          stato: r.stato,
          da: r.daNome,
          quando: new Date(r.quando).toISOString(),
        }));
    }

    case "coda.decidi": {
      const errore = remoto.cambiaStato(
        String(valori.id),
        dispositivo,
        String(valori.stato) as "accettata" | "in-lavoro" | "scartata",
        { motivo: valori.motivo ? String(valori.motivo) : undefined },
      );
      if (errore) throw new Error(errore);
      sveglia();
      return { fatto: true };
    }

    case "app.apri": {
      const quale = String(valori.app) as AppId;
      if (!APP_IDS.includes(quale)) throw new Error(`Non conosco l'app "${quale}".`);
      await appManager.open(quale);
      return { aperta: APPS[quale].name };
    }

    default:
      // Un'azione dichiarata nel catalogo ma non gestita qui è un errore
      // nostro, non di chi ha chiesto: meglio dirlo che rispondere niente.
      throw new Error(`L'azione "${id}" è dichiarata ma questo computer non sa eseguirla.`);
  }
};

/* ------------------------------------------------------- la libreria */

/**
 * Come il gateway vede la libreria della suite.
 *
 * **Attraversa il confine solo un id.** Il gateway riceve richieste da
 * Internet: se accettasse un percorso, prima o poi qualcuno gli passerebbe
 * `..\..\Windows`. Qui invece gli si dà un elenco di voci con un id — che è il
 * percorso *relativo* dentro la cartella dei risultati, come lo conosce già la
 * libreria — e una funzione che da quell'id ricava il file. Un id che la
 * libreria non riconosce non produce nessun percorso, e la rotta risponde 404.
 */
const fornitoreLibreria: FornitoreLibreria = {
  elenco(filtro) {
    const cerca: { tipo?: TipoElemento; app?: AppId } = {};
    if (filtro.tipo) cerca.tipo = filtro.tipo as TipoElemento;
    if (filtro.app) cerca.app = filtro.app as AppId;
    return libreria
      .cerca(cerca)
      .slice(0, Math.max(1, Math.min(200, filtro.quanti ?? 60)))
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        tipo: e.tipo,
        app: e.app,
        creato: e.creato,
        bytes: e.bytes,
        mime: mimeDi(e.percorso, e.tipo),
      }));
  },

  file(id) {
    const elemento = libreria.trova(id);
    if (!elemento) return null;
    return {
      percorso: elemento.percorso,
      nome: elemento.nome,
      bytes: elemento.bytes,
      mime: mimeDi(elemento.percorso, elemento.tipo),
    };
  },
};

/**
 * Il tipo MIME dall'estensione.
 *
 * Serve al browser per sapere che farne: senza, un mp4 arriva come
 * `application/octet-stream` e il `<video>` non lo suona nemmeno provando. Si
 * guarda l'estensione e non il contenuto perché questi file li abbiamo scritti
 * noi, e sappiamo cosa sono.
 */
function mimeDi(percorso: string, tipo: string): string {
  const coda = percorso.slice(percorso.lastIndexOf(".") + 1).toLowerCase();
  const noti: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
  };
  if (noti[coda]) return noti[coda];
  // Non lo conosciamo: si dice almeno di che famiglia è, che basta al browser
  // per scegliere se provare a mostrarlo o offrirlo da scaricare.
  if (tipo === "immagine") return "image/*";
  if (tipo === "video") return "video/*";
  if (tipo === "audio") return "audio/*";
  return "application/octet-stream";
}

/* ------------------------------------------------------------ stato */

/** Lo stato da dare al pannello dell'hub. */
function statoPannello(): StatoAccesso {
  const dispositivi: DispositivoRemoto[] = remoto.listaDispositivi().map((d) => ({
    id: d.id,
    nome: d.nome,
    ruolo: d.ruolo,
    accoppiato: d.accoppiato,
    ultimoAccesso: d.ultimoAccesso,
  }));

  const richieste: RichiestaRemota[] = remoto.archivi.datiCorrenti.richieste
    .map((r) => ({
      id: r.id,
      tipo: r.tipo,
      app: r.app,
      testo: r.testo,
      opzioni: r.opzioni,
      daNome: r.daNome,
      stato: r.stato as RichiestaRemota["stato"],
      quando: r.quando,
      motivoScarto: r.motivoScarto,
      risultato: r.risultato
        ? { nome: r.risultato.nome, bytes: r.risultato.bytes, tipo: r.risultato.tipo }
        : undefined,
    }))
    .sort((a, b) => b.quando - a.quando);

  const elenco = reti();
  const fuori = statoTunnel();
  return {
    acceso: gateway !== null,
    indirizzo: indirizzo(),
    console: gateway ? `${base()}/` : "",
    reti: elenco.map((r) => ({ ip: r.ip, scheda: r.scheda, che: r.che })),
    rete: ipLocale(reteScelta),
    computer: osNome(),
    internet: {
      fase: fuori.fase,
      indirizzo: fuori.indirizzo,
      motivo: fuori.motivo,
      quota: fuori.quota,
    },
    firewall: muroDiWindows,
    dispositivi,
    richieste,
    attesa: richieste.filter((r) => r.stato === "in-attesa").length,
  };
}

/* ------------------------------------------------------------ inviti */

/**
 * Crea un invito e subito il QR.
 *
 * Il gateway si accende da sé se era spento: un invito con dentro un indirizzo
 * vuoto è un QR che non porta da nessuna parte, ed era il modo più facile di
 * far fallire l'accoppiamento senza capire perché.
 */
export async function nuovoInvito(ruolo: "admin" | "ospite"): Promise<InvitoRemoto> {
  if (!gateway) await accendi();
  const invito = remoto.nuovoInvito(ruolo);
  const host = indirizzo();
  const dove = base();
  // `base` è l'indirizzo che vale davvero — con il tunnel acceso è quello su
  // Internet — e `host` resta l'indirizzo di casa: un'app vecchia legge quello
  // e continua a funzionare sulla wifi. Vedi `InvitoQr` in @daprod/gateway.
  const urlo = `daprod://accoppia?base=${encodeURIComponent(dove)}&host=${host}&codice=${invito.codice}&ruolo=${ruolo}&v=2`;
  const dentroIlQr: InvitoQr = { v: 2, host, base: dove, codice: invito.codice, ruolo };
  const qr = await disegnaQr(JSON.stringify(dentroIlQr));
  sveglia();
  return { codice: invito.codice, ruolo: invito.ruolo, scade: invito.scade, url: urlo, qr };
}

function disegnaQr(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(payload, { margin: 1, width: 420, errorCorrectionLevel: "M" }, (err, url) => {
      if (err) reject(err);
      else resolve(url);
    });
  });
}

/* ------------------------------------------------------------ gateway */

async function accendi(): Promise<StatoAccesso> {
  if (gateway) return statoPannello();
  const nuovo = new Gateway({
    remoto,
    versione: app.getVersion(),
    computer: osNome(),
    stato: statoSuite,
    esegui,
    libreria: fornitoreLibreria,
  });
  portaReale = await nuovo.ascolta(PORTA);
  gateway = nuovo;
  sveglia();
  // Si guarda **adesso**, non prima: la porta vera la si conosce solo dopo che
  // il server è in ascolto. Non si aspetta la risposta — `netsh` è un processo
  // e il pannello deve comparire subito — e quando arriva il pannello si
  // ridisegna da sé.
  void rileggiFirewall();
  return statoPannello();
}

async function spegni(): Promise<StatoAccesso> {
  if (gateway) {
    await gateway.chiudi();
    gateway = null;
  }
  sveglia();
  return statoPannello();
}

/* ----------------------------------------------------------- firewall */

/**
 * L'ultima cosa che sappiamo del firewall.
 *
 * Si tiene da parte invece di chiederlo a ogni disegno del pannello: `netsh` è
 * un processo, e il pannello si ridisegna a ogni cambiamento — a ogni battito
 * del tunnel, a ogni richiesta che arriva. Si guarda quando si accende il
 * gateway e quando si prova ad aprire la porta, che sono i due momenti in cui
 * la risposta può essere cambiata.
 */
let muroDiWindows: StatoFirewall = { aperta: false, incerto: true };

async function rileggiFirewall(): Promise<void> {
  muroDiWindows = await statoFirewall();
  sveglia();
}

async function sbloccaLaPorta(): Promise<string | null> {
  const errore = await apriLaPorta(portaReale || PORTA);
  await rileggiFirewall();
  return errore;
}

/* ----------------------------------------------------------- internet */

/**
 * Accende il tunnel e rifà i conti.
 *
 * Il gateway si accende da sé se era spento: un tunnel davanti a una porta
 * chiusa è una pagina di errore su Internet, che è peggio di niente.
 *
 * **Gli inviti in corso si buttano.** L'indirizzo cambia — da `192.168.1.8:8790`
 * a `https://qualcosa.trycloudflare.com` — e un QR è la fotografia di un
 * indirizzo: quello vecchio continuerebbe a funzionare in casa e a non
 * funzionare fuori, che è il modo più sicuro di far sbagliare chi lo inquadra.
 */
async function accendiInternet(): Promise<StatoAccesso> {
  if (!gateway) await accendi();
  await accendiTunnel(portaReale || PORTA);
  remoto.buttaInviti();
  sveglia();
  return statoPannello();
}

async function spegniInternet(): Promise<StatoAccesso> {
  await spegniTunnel();
  remoto.buttaInviti();
  sveglia();
  return statoPannello();
}

// Il tunnel racconta da sé come sta andando — scarico, accendo, acceso, guasto
// — e il pannello deve vederlo scorrere invece di restare fermo su «accendo»
// per un minuto e mezzo.
suTunnelCambiato(() => sveglia());

/* ------------------------------------------------------- decisioni */

function decidi(
  id: string,
  stato: "accettata" | "scartata" | "in-lavoro",
  motivo?: string,
): EsitoDecisione {
  const admin = adminDiCasa();
  const errore = remoto.cambiaStato(id, admin, stato, { motivo });
  gateway?.aggiorna();
  sveglia();
  return errore ? { ok: false, errore } : { ok: true };
}

/** Marca una richiesta come pronta, col file già copiato dai risultati. */
function consegna(
  id: string,
  esito: { nome: string; percorso: string; tipo: string; bytes: number },
): EsitoDecisione {
  const risultato: Risultato = { ...esito, quando: Date.now() };
  const errore = remoto.cambiaStato(id, adminDiCasa(), "pronta", { risultato });
  gateway?.aggiorna();
  sveglia();
  return errore ? { ok: false, errore } : { ok: true };
}

/**
 * Chi decide quando a decidere è il PC stesso.
 *
 * Prima qui si cercava un dispositivo admin fra quelli accoppiati, e senza
 * telefoni collegati il pannello dell'hub non poteva accettare niente: il
 * computer su cui gira la suite non riusciva a decidere sulle proprie richieste.
 * Il PC **è** l'admin, per definizione: non è un dispositivo accoppiato e non
 * sta nell'archivio, ma quando è lui a premere il bottone vale quel ruolo.
 */
function adminDiCasa(): Dispositivo {
  return {
    id: "pc",
    nome: osNome(),
    ruolo: "admin",
    token: "",
    accoppiato: 0,
    ultimoAccesso: Date.now(),
  };
}

function revoca(id: string): DispositivoRemoto[] {
  remoto.revoca(id);
  gateway?.aggiorna();
  sveglia();
  return statoPannello().dispositivi;
}

/** Dice ai pannelli che qualcosa è cambiato. */
function sveglia(): void {
  for (const fn of ascoltatori) fn();
}

// Quando un'app cambia stato, chi guarda da fuori deve vederlo: è l'unica cosa
// che dal telefono racconta che il PC sta lavorando.
appManager.on("changed", () => {
  gateway?.aggiorna();
});

/* ------------------------------------------------------------- il ponte */

/** Il ponte fra main e renderer: l'ipc.ts registra i canali su questo. */
export const accessoRemoto = {
  accendi,
  spegni,
  accendiInternet,
  spegniInternet,
  sbloccaLaPorta,
  stato: statoPannello,
  nuovoInvito,
  scegliRete,
  revoca,
  decidi,
  consegna,
  onChanged(fn: () => void): () => void {
    ascoltatori.add(fn);
    return () => ascoltatori.delete(fn);
  },
};

/** Alla chiusura della suite il gateway si spegne con tutto il resto. */
export async function spegniAccessoRemoto(): Promise<void> {
  // Prima il tunnel: è un processo figlio, e lasciarlo vivo vorrebbe dire un
  // indirizzo su Internet che punta a una porta che sta per chiudersi.
  await spegniTunnel();
  if (gateway) await gateway.chiudi();
  gateway = null;
  // L'archivio salva in differita: alla chiusura non c'è un "poco dopo".
  archivio.scriviAdesso();
}
