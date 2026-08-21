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
import { networkInterfaces } from "node:os";
import * as QRCode from "qrcode";
import {
  Archivio,
  Gateway,
  Remoto,
  type Dispositivo,
  type Esecutore,
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

/** L'indirizzo LAN del PC: il primo IP privato che troviamo. */
function ipLocale(): string {
  const reti = networkInterfaces();
  for (const nome of Object.keys(reti)) {
    for (const net of reti[nome] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

/** Cos'è il gateway visto dalla rete: ip:porta. */
function indirizzo(): string {
  if (!gateway) return "";
  return `${ipLocale()}:${portaReale || PORTA}`;
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

  return {
    acceso: gateway !== null,
    indirizzo: indirizzo(),
    console: gateway ? `http://${indirizzo()}/` : "",
    computer: osNome(),
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
  const urlo = `daprod://accoppia?host=${host}&codice=${invito.codice}&ruolo=${ruolo}&v=1`;
  const dentroIlQr: InvitoQr = { v: 1, host, codice: invito.codice, ruolo };
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
  });
  portaReale = await nuovo.ascolta(PORTA);
  gateway = nuovo;
  sveglia();
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
  stato: statoPannello,
  nuovoInvito,
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
  if (gateway) await gateway.chiudi();
  gateway = null;
  // L'archivio salva in differita: alla chiusura non c'è un "poco dopo".
  archivio.scriviAdesso();
}
