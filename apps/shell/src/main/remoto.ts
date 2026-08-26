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
import { randomBytes } from "node:crypto";
import * as QRCode from "qrcode";
import {
  Archivio,
  Gateway,
  Remoto,
  type Dispositivo,
  type Esecutore,
  type FornitoreAi,
  type FornitoreChiacchierata,
  type FornitoreLibreria,
  type FornitoreMacchina,
  type FornitorePannello,
  type FornitorePreset,
  type FornitoreStili,
  type InvitoQr,
  type InvitoVivo,
  type Risultato,
  type StatoPannello,
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
import { PADRONE_DI_CASA, libreria } from "./libreria";
import { aiDisponibile, migliora } from "./migliora";
import { elencoPreset, eliminaPreset, salvaPreset } from "./preset";
import { REMOTO_ARCHIVIO, REMOTO_DIR } from "./paths";
import { indirizziBuoni, ipLocale, reti } from "./reti";
import {
  impostaAccettaDaSola,
  impostaConnessione,
  impostaInternet,
  impostaLimiti,
  impostaPausa,
  impostazioni,
} from "./impostazioni";
import {
  accoda,
  collegaEsecuzione,
  fermaQuelloInCorso,
  filaCompleta,
  filaInCorso,
  togliDallaFila,
} from "./esecuzione";
import { avvisaSulComputer } from "./avvisi";
import { cartelleImportanti, tieniInDaProd } from "./cartelle";
import {
  buttaLaCartella,
  condividiStile,
  salvaStile,
  stiliDi,
  stiliInVetrina,
  togliStile,
} from "./stili";
import { turno } from "./turno";
import { anteprimaDi, puoAvereAnteprima } from "./anteprime";
import {
  accettaIlPiano,
  attesaDi,
  battuta,
  chiudiChiacchierata,
  collegaChiacchierata,
  cominciaChiacchierata,
  esciDallaFila,
  miaChiacchierata,
  modelliPerChiacchierare,
} from "./chiacchierata";
import { accendiTunnel, spegniTunnel, statoTunnel, suTunnelCambiato } from "./tunnel";
import { apriLaPorta, statoFirewall, type StatoFirewall } from "./firewall";

/** Su quale porta ascolta il gateway. */
const PORTA = 8790;

/** Un solo archivio per tutta la vita della suite: i dati non si perdono. */
const archivio = new Archivio(REMOTO_ARCHIVIO);
const remoto = new Remoto(archivio, REMOTO_DIR);

/**
 * Come si comporta la fila su questo computer.
 *
 * Il gateway la chiede, non la tiene: le impostazioni stanno qui e si cambiano
 * solo dal PC. È il modo in cui «il pc è il vero admin» smette di essere una
 * buona intenzione — non esiste una rotta HTTP che arrivi a questi quattro
 * numeri, quindi nemmeno un telefono con i permessi da admin può alzarsi i
 * propri limiti.
 */
remoto.decideLaFila(() => {
  const scelte = impostazioni();
  return {
    chiPassaSubito: scelte.accettaDaSola,
    limiteFila: scelte.limiteFila,
    limitePersona: scelte.limitePersona,
    inPausa: scelte.inPausa,
  };
});

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
  return basi()[0] ?? "";
}

/**
 * **Tutti** gli indirizzi su cui questo PC si fa trovare, dal più promettente.
 *
 * È il cuore di «se chiudo l'app poi non si ricollega». Un indirizzo solo è una
 * fotografia: cambia la rete, riavvia il tunnel, passi dal wifi ai dati, e
 * quella fotografia non vale più. Il telefono li riceve tutti e li prova finché
 * uno risponde — e da quel momento usa quello.
 *
 * L'ordine non è casuale:
 *
 * 1. **Tailscale**, se c'è. È l'unico che funziona sia in casa sia fuori, è
 *    cifrato, e non mette niente su Internet. Chi ce l'ha ha finito qui.
 * 2. **La rete di casa.** Il salto più corto e più veloce, per chi è sul divano.
 * 3. **Il tunnel**, se acceso. Funziona ovunque ma passa da Cloudflare e cambia
 *    nome a ogni riavvio: è il ripiego, non la prima scelta.
 */
function basi(): string[] {
  if (!gateway) return [];
  const elenco = indirizziBuoni(portaReale || PORTA);
  const fuori = statoTunnel();
  if (fuori.fase !== "acceso" || !fuori.indirizzo) return elenco;

  /**
   * **Il tunnel prima della rete di casa**, dalla 0.7.3.
   *
   * Fino a ieri l'ordine era: Tailscale, la wifi di casa, il tunnel. Aveva una
   * sua logica — il salto più corto per primo — ed è sbagliata per come la
   * suite viene usata davvero: «l'app connessione deve funzionare solo su
   * internet, non ci interessa su lan». Un telefono che si ricorda l'indirizzo
   * di casa smette di funzionare appena esce dalla porta; uno che si ricorda
   * l'indirizzo da Internet funziona in tutti e due i posti.
   *
   * Tailscale resta il primo di tutti: fa la stessa cosa del tunnel senza
   * mettere niente su Internet. La rete di casa resta in fondo — non si toglie,
   * perché è quella che funziona quando Internet è giù.
   */
  const porta = portaReale || PORTA;
  const schede = reti().filter((r) => r.dove !== "virtuale");
  const ovunque = schede.filter((r) => r.dove === "ovunque").map((r) => `http://${r.ip}:${porta}`);
  const casa = schede.filter((r) => r.dove !== "ovunque").map((r) => `http://${r.ip}:${porta}`);
  return [...ovunque, fuori.indirizzo, ...casa];
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
  /**
   * **Ognuno vede le sue, e della bacheca quello che gli altri hanno voluto.**
   *
   * Chiesto il 22 agosto 2026: «ogni utente può vedere solo le sue generazioni
   * e non quelle degli altri», e insieme «voglio farlo sembrare tipo un social
   * network dove poi gli utenti possono decidere quale pubblicare». Le due cose
   * stanno insieme in un filtro solo: `mie` sono quelle di chi guarda, `bacheca`
   * quelle che qualcuno ha messo in mostra — quelle sì, con scritto di chi sono.
   *
   * Vale anche per chi decide: «anche gli admin possono vedere ognuno solo le
   * proprie foto». Il permesso di decidere è sulla fila, non sulle cose degli
   * altri.
   */
  elenco(filtro) {
    const cerca: { tipo?: TipoElemento; app?: AppId } = {};
    if (filtro.tipo) cerca.tipo = filtro.tipo as TipoElemento;
    if (filtro.app) cerca.app = filtro.app as AppId;
    const bacheca = filtro.dove === "bacheca";
    /**
     * **Il computer vede tutto.**
     *
     * Chiesto il 23 agosto 2026: «sulla suite devono essere presenti in
     * galleria i file di tutti gli utenti, dalla suite su PC si vede tutto».
     * Ed è giusto così: i file stanno sul suo disco, le schede della suite li
     * mostrano già tutti, e chi sta davanti al computer è quello che deve poter
     * fare ordine. La separazione serve fra le persone collegate da fuori, non
     * a nascondere a chi ospita quello che ospita.
     */
    const eIlComputer = filtro.chi === PADRONE_DI_CASA;
    return libreria
      .cerca(cerca)
      .filter((e) => {
        if (eIlComputer) return true;
        if (bacheca) return libreria.inBacheca(e);
        /**
         * **Le tue, e quelle che hai tenuto da parte.**
         *
         * Tenere una cosa di un altro non ne fa una copia: la fa comparire fra
         * le proprie, come un segnalibro. E smette di comparire nell'istante in
         * cui chi l'ha fatta la toglie dalla bacheca — era sua, ha cambiato
         * idea, e un segnalibro non è un diritto acquisito.
         */
        if (libreria.padrone(e) === filtro.chi) return true;
        return libreria.laTiene(e, filtro.chi) && libreria.inBacheca(e);
      })
      .slice(0, Math.max(1, Math.min(200, filtro.quanti ?? 60)))
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        tipo: e.tipo,
        app: e.app,
        creato: e.creato,
        bytes: e.bytes,
        mime: mimeDi(e.percorso, e.tipo),
        chi: libreria.padrone(e),
        chiNome: typeof e.meta?.["chiNome"] === "string" ? (e.meta["chiNome"] as string) : undefined,
        pubblicato: libreria.inBacheca(e),
        mia: libreria.padrone(e) === filtro.chi,
        quantiMiPiace: libreria.miPiaceDi(e, filtro.chi).quanti,
        mioMiPiace: libreria.miPiaceDi(e, filtro.chi).mio,
        tenuta: libreria.laTiene(e, filtro.chi),
        caricata: libreria.eCaricata(e),
        didascalia:
          typeof e.meta?.["testo"] === "string" ? (e.meta["testo"] as string) : undefined,
        // Se c'è un fotogramma o una copertina, la galleria lo sa **prima** di
        // chiederlo: chiedere un'anteprima che non esiste vuol dire dodici 404
        // a ogni schermata.
        anteprima: puoAvereAnteprima(e),
      }));
  },

  /**
   * Il file, ma **solo se è roba che questo dispositivo può vedere.**
   *
   * Il controllo sta qui e non nella pagina: un indirizzo si scrive a mano, e
   * fino alla 0.7.1 chiunque fosse collegato poteva scaricare qualunque cosa
   * avesse prodotto la suite, se ne indovinava il nome.
   */
  file(id, chi) {
    const elemento = libreria.trova(id);
    if (!elemento) return null;
    // Il computer vede tutto quello che ha sul disco, come sopra.
    const suo = libreria.padrone(elemento) === chi || chi === PADRONE_DI_CASA;
    if (!suo && !libreria.inBacheca(elemento)) return null;
    return {
      percorso: elemento.percorso,
      nome: elemento.nome,
      bytes: elemento.bytes,
      mime: mimeDi(elemento.percorso, elemento.tipo),
    };
  },

  pubblica(id, chi, pubblicato) {
    const fatto = libreria.pubblica(id, chi, pubblicato);
    if (!fatto) return false;
    /**
     * **Una copia in una cartella sua**, dalla 0.7.7.
     *
     * Chiesto così: «tutto quello pubblicato su DaProd finisce in una cartella
     * separata in modo da non perdere quei file». Una **copia** e non uno
     * spostamento: mettere una cosa in bacheca è un gesto in più, non un
     * trasloco, e chi la pubblica non deve vedersela sparire da dove la cerca.
     *
     * Togliere dalla bacheca non toglie la copia, ed è voluto: quella cartella
     * esiste per non perdere niente, non per rispecchiare uno stato.
     */
    if (pubblicato) {
      const elemento = libreria.trova(id);
      if (elemento) {
        tieniInDaProd({
          percorso: elemento.percorso,
          chiNome:
            typeof elemento.meta?.["chiNome"] === "string"
              ? (elemento.meta["chiNome"] as string)
              : undefined,
          titolo: elemento.nome,
        });
      }
    }
    sveglia();
    return true;
  },

  /**
   * Buttare una cosa la può fare chi l'ha fatta — e il computer, che è quello
   * che si ritrova il disco pieno.
   */
  elimina(id, chi) {
    const elemento = libreria.trova(id);
    const suo = elemento && (libreria.padrone(elemento) === chi || chi === PADRONE_DI_CASA);
    if (!elemento || !suo) return false;
    const fatto = libreria.elimina(id);
    if (fatto) sveglia();
    return fatto;
  },

  /**
   * L'anteprima: stesso permesso del file vero.
   *
   * Non è un dettaglio: un fotogramma di un video è **il video**, ridotto a
   * un'immagine. Se si potesse chiedere l'anteprima di una cosa che non si può
   * vedere, la separazione fra le persone sarebbe finta.
   */
  async anteprima(id, chi) {
    const elemento = libreria.trova(id);
    if (!elemento) return null;
    const suo = libreria.padrone(elemento) === chi || chi === PADRONE_DI_CASA;
    const vista = suo || libreria.inBacheca(elemento);
    if (!vista) return null;
    return anteprimaDi(elemento);
  },

  /** Mi piace: su quello che si ha il diritto di vedere, e su niente altro. */
  miPiace(id, chi, mi) {
    const elemento = libreria.trova(id);
    if (!elemento) return null;
    const suo = libreria.padrone(elemento) === chi || chi === PADRONE_DI_CASA;
    if (!suo && !libreria.inBacheca(elemento)) return null;
    const quanti = libreria.miPiace(id, chi, mi);
    if (quanti !== null) sveglia();
    return quanti;
  },

  /** Tenere da parte vale solo su quello che sta in bacheca: le tue le hai già. */
  tieni(id, chi, tenere) {
    const elemento = libreria.trova(id);
    if (!elemento || !libreria.inBacheca(elemento)) return false;
    const fatto = libreria.tieni(id, chi, tenere);
    if (fatto) sveglia();
    return fatto;
  },

  aggiungi(dati) {
    const voce = libreria.aggiungi({
      percorso: dati.percorso,
      nome: dati.nome,
      bytes: dati.bytes,
      chi: dati.chi,
      chiNome: dati.chiNome,
      didascalia: dati.didascalia,
    });
    if (!voce) return null;
    sveglia();
    return {
      id: voce.id,
      nome: voce.nome,
      tipo: voce.tipo,
      app: voce.app,
      creato: voce.creato,
      bytes: voce.bytes,
      mime: mimeDi(voce.percorso, voce.tipo),
      chi: dati.chi,
      chiNome: dati.chiNome,
      pubblicato: true,
      mia: true,
      caricata: true,
      didascalia: dati.didascalia,
      anteprima: puoAvereAnteprima(voce),
    };
  },
};

/* ------------------------------------------------------------ la macchina */

/**
 * Com'è messo il computer, e chi può cambiarlo.
 *
 * **La riga che conta è `sonoLaCasa`.** Lo stato lo leggono tutti — chi aspetta
 * ha diritto di sapere perché aspetta — ma gli interruttori li vede e li preme
 * soltanto DaProdConnessione, cioè il computer stesso. È così che «il pc è il
 * vero admin» smette di essere una buona intenzione: un telefono con i permessi
 * da admin decide sulle richieste degli altri, ma non può alzarsi i limiti a
 * cui è sottoposto lui.
 */
const fornitoreMacchina: FornitoreMacchina = {
  stato(dispositivo) {
    const scelte = impostazioni();
    const stato = turno.stato();
    const lavori = filaCompleta();
    const trattenute = remoto.archivi.datiCorrenti.richieste.filter(
      (r) => r.stato === "in-attesa" && r.trattenuta,
    );

    const gira = filaInCorso();
    const eLaCasa = dispositivo.id === ID_DI_CASA;

    /**
     * La fila, con **il numero e il posto**.
     *
     * Sono due cose diverse e servono tutte e due: il numero non cambia mai —
     * è il nome del lavoro, quello che si dice a voce — e il posto scende a
     * ogni lavoro che finisce. Chiesto il 26 agosto 2026: «usiamo un sistema di
     * coda a numeri che si aggiorna», e «ti fa vedere in che posizione sei».
     *
     * Il posto si conta su **tutta** la fila, non su una metà: chi aspetta non
     * gliene importa niente che davanti a lui ci sia una generazione o una
     * domanda al modello, gliene importa quanti sono.
     */
    let posto = 0;
    const inFila = [
      // Prima quello che il turno conosce (le domande al modello), poi la
      // fila delle generazioni: sono due elenchi perché sono due cose, ma
      // chi guarda ne deve vedere uno solo.
      ...stato.fila.map((b) => ({
        id: b.id,
        che: b.che,
        chi: b.chi,
        mestiere: b.mestiere as string,
        tuo: b.chi === dispositivo.nome,
        posto: (posto += 1),
        tuoDaTogliere: eLaCasa,
      })),
      ...lavori
        .filter((l) => l.posto > 0)
        .map((l) => ({
          id: l.id,
          che: `${nomeScheda(l.app)}: ${l.testo.slice(0, 60)}`,
          chi: l.da,
          mestiere: "generazione",
          tuo: l.daId === dispositivo.id,
          numero: l.numero,
          posto: (posto += 1),
          // Il proprio si toglie sempre: chi esce dalla fila la libera, non la
          // occupa. Quello di un altro lo toglie chi decide.
          tuoDaTogliere: l.daId === dispositivo.id || dispositivo.ruolo === "admin",
        })),
    ];

    return {
      adesso: stato.adesso
        ? {
            che: stato.adesso.che,
            chi: stato.adesso.chi,
            mestiere: stato.adesso.mestiere,
            numero: gira?.numero,
            richiesta: gira?.id,
            da: gira?.da || undefined,
          }
        : null,
      fila: inFila,
      inPausa: stato.sospesa,
      motivoPausa: stato.motivoSospensione,
      trattenute: trattenute.map((r) => ({
        id: r.id,
        testo: (r.numero ? `#${r.numero} ` : "") + r.testo.slice(0, 120),
        perche: r.trattenuta ?? "",
        tuo: r.daDispositivo === dispositivo.id,
      })),
      regole: {
        chiPassaSubito: scelte.accettaDaSola,
        limiteFila: scelte.limiteFila,
        limitePersona: scelte.limitePersona,
      },
      sonoLaCasa: dispositivo.id === ID_DI_CASA,
    };
  },

  pausa(inPausa) {
    accessoRemoto.pausa(inPausa);
  },

  regole(opzioni) {
    accessoRemoto.chiPassaSubito(opzioni.chiPassaSubito);
    accessoRemoto.limiti(opzioni.limiteFila, opzioni.limitePersona);
  },

  togli(id) {
    const esito = accessoRemoto.togliDallaFila(id);
    return esito.ok ? null : (esito.errore ?? "Non sono riuscito a toglierlo.");
  },

  fermaAdesso() {
    const gira = filaInCorso();
    if (!gira) return "Non sta girando niente.";
    void fermaQuelloInCorso();
    // Il motivo lo legge chi aveva chiesto: «fallito» e «fermato» sono due
    // cose diverse, e sentirsi dire la prima quando è successa la seconda fa
    // pensare che il programma sia rotto.
    remoto.cambiaStato(gira.id, adminDiCasa(), "scartata", {
      motivo: "Fermato da chi sta al computer.",
    });
    gateway?.aggiorna();
    sveglia();
    return null;
  },

  accettaTutte() {
    const partite = remoto.accettaTutte(adminDiCasa());
    gateway?.aggiorna();
    sveglia();
    return partite.length;
  },
};

/** Come si chiama una scheda, per scriverlo accanto a un lavoro in fila. */
function nomeScheda(app: string): string {
  const id = app as AppId;
  return APPS[id]?.name ?? app;
}

/* ------------------------------------------------------------ gli stili */

/**
 * Gli stili, uno per persona. Il mestiere sta in `stili.ts`.
 *
 * Qui c'è solo il collegamento, e una riga che vale la pena leggere: il nome di
 * chi ha messo uno stile in vetrina si prende dall'elenco dei dispositivi. Se
 * quella persona non c'è più — l'hanno scollegata — il suo stile resta in
 * vetrina senza un nome sopra, e va bene così: lo stile è ancora buono.
 */
const fornitoreStili: FornitoreStili = {
  miei: (chi) => stiliDi(chi),
  vetrina: (chi) =>
    stiliInVetrina(
      chi,
      (id) => remoto.listaDispositivi().find((d) => d.id === id)?.nome ?? "qualcuno",
    ),
  salva: (chi, dati) =>
    salvaStile(chi, {
      id: dati.id,
      nome: dati.nome,
      testo: dati.testo,
      da: dati.da === "preso" || dati.da === "partenza" ? dati.da : "mio",
      daNome: dati.daNome,
    }),
  togli: (chi, id) => togliStile(chi, id),
  condividi: (chi, id, condiviso) => condividiStile(chi, id, condiviso),
};

/* ------------------------------------------------------ la chiacchierata */

/**
 * Dieci minuti col modello: qui c'è solo il collegamento.
 *
 * Il mestiere sta in `chiacchierata.ts`, che sa di LM Studio e del turno. Il
 * gateway non deve sapere né l'una né l'altra cosa: sa che c'è qualcuno che
 * regge una conversazione e che sa mettere in fila quello che ne esce.
 */
const fornitoreChiacchierata: FornitoreChiacchierata = {
  modelli: () => modelliPerChiacchierare(),
  comincia: (opzioni) => cominciaChiacchierata(opzioni),
  dico: (opzioni) => battuta(opzioni),
  mia: (dispositivoId) => miaChiacchierata(dispositivoId),
  attesa: (dispositivoId) => attesaDi(dispositivoId),
  esci: (dispositivoId) => esciDallaFila(dispositivoId),
  chiudi: (id, dispositivoId) => chiudiChiacchierata(id, dispositivoId),
  accetta: (opzioni) => accettaIlPiano(opzioni),
};

/**
 * Quello che il modello propone, messo in fila come qualunque altra richiesta.
 *
 * **Nessuna corsia preferenziale**, e ci tengo: una richiesta nata da una
 * chiacchierata passa dagli stessi tetti e dallo stesso ordine di una scritta a
 * mano. Se bastasse chiedere a un modello per scavalcare la fila, i tetti
 * sarebbero una porta con la chiave attaccata.
 */
collegaChiacchierata({
  chiedi(opzioni) {
    const chi = remoto
      .listaDispositivi()
      .find((d) => d.id === opzioni.dispositivoId);
    if (!chi) return "Non ti riconosco più.";
    remoto.creaRichiesta({
      tipo: opzioni.app,
      app: opzioni.app,
      testo: opzioni.testo,
      opzioni: { ...opzioni.campi, azione: opzioni.azione },
      daDispositivo: chi,
    });
    gateway?.aggiorna();
    sveglia();
    return null;
  },
});

/* ------------------------------------------------------------ il modello */

/**
 * Chi sa far riscrivere una richiesta al modello.
 *
 * Il mestiere vero sta in `migliora.ts`; qui c'è solo il collegamento, perché
 * il gateway non deve sapere che esiste LM Studio — sa che esiste qualcuno a
 * cui si può chiedere di scrivere.
 */
const fornitoreAi: FornitoreAi = {
  disponibile: () => aiDisponibile(),
  migliora: (opzioni) => migliora(opzioni),
};

/** Chi sa rispondere sui modi di generare messi da parte. */
const fornitorePreset: FornitorePreset = {
  elenco: (app) => elencoPreset(app),
  salva: (preset) => salvaPreset(preset),
  elimina: (id, chi) => eliminaPreset(id, chi),
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
export async function nuovoInvito(
  ruolo: "admin" | "ospite",
  quante = 1,
): Promise<InvitoRemoto> {
  if (!gateway) await accendi();
  const invito = remoto.nuovoInvito(ruolo, quante);
  const host = indirizzo();
  const tutti = basi();
  const dove = tutti[0] ?? `http://${host}`;
  // Nel QR ci vanno **tutti** gli indirizzi: `basi` è quello che conta, `base` e
  // `host` restano compilati perché un'app vecchia continui a funzionare in
  // casa. Vedi `InvitoQr` in @daprod/gateway.
  const urlo = `daprod://accoppia?base=${encodeURIComponent(dove)}&host=${host}&codice=${invito.codice}&ruolo=${ruolo}&v=3`;
  const dentroIlQr: InvitoQr = { v: 3, host, base: dove, basi: tutti, codice: invito.codice, ruolo };
  const qr = await disegnaQr(JSON.stringify(dentroIlQr));
  invitoVivo = {
    codice: invito.codice,
    ruolo: invito.ruolo,
    scade: invito.scade,
    qr,
    restano: invito.restano ?? 1,
  };
  sveglia();
  gateway?.aggiorna();
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
    pannello: fornitorePannello,
    ai: fornitoreAi,
    preset: fornitorePreset,
    macchina: fornitoreMacchina,
    chiacchierata: fornitoreChiacchierata,
    stili: fornitoreStili,
  });
  // Chi può arrivare: tutta la rete se la connessione è accesa, solo questo
  // computer se è spenta. In tutti e due i casi il gateway **c'è**, perché è
  // lui a servire la pagina di DaProdConnessione.
  portaReale = await nuovo.ascolta(PORTA, impostazioni().connessione ? "0.0.0.0" : "127.0.0.1");
  gateway = nuovo;
  sveglia();
  // Si guarda **adesso**, non prima: la porta vera la si conosce solo dopo che
  // il server è in ascolto. Non si aspetta la risposta — `netsh` è un processo
  // e il pannello deve comparire subito — e quando arriva il pannello si
  // ridisegna da sé.
  void rileggiFirewall();
  return statoPannello();
}

/* ------------------------------------------------- accendere e ricordare */

/**
 * L'accensione voluta: accende **e se lo ricorda**.
 *
 * `accendi` da sola serve anche a chi la chiama di passaggio — chiedere un
 * invito accende il gateway se era spento, e non è una scelta dell'utente.
 * Questa invece è il gesto: da qui in poi la connessione si riaccende a ogni
 * avvio, che è quello che era stato chiesto («se si è avviato una volta si
 * avvia sempre in rete e si connette»).
 */
async function accendiEricorda(): Promise<StatoAccesso> {
  impostaConnessione(true);
  await riapri();
  return statoPannello();
}

async function spegniEricorda(): Promise<StatoAccesso> {
  impostaConnessione(false);
  impostaInternet(false);
  await spegniTunnel();
  await riapri();
  return statoPannello();
}

/**
 * Rimette in ascolto sull'interfaccia giusta.
 *
 * Un server già in ascolto non cambia indirizzo: si chiude e si riapre. Dura
 * un istante, e le connessioni aperte (lo stato in streaming) si riaprono da
 * sole — è la stessa cosa che succede quando la wifi salta.
 */
async function riapri(): Promise<void> {
  if (gateway) {
    await gateway.chiudi();
    gateway = null;
  }
  await accendi();
}

/**
 * All'avvio della suite: si riaccende da sé quello che era acceso.
 *
 * Non aspetta niente e non blocca l'apertura dell'hub: se il tunnel ci mette un
 * minuto, la suite è già usabile e il pannello racconta la fase.
 */
export function riprendiAccessoRemoto(): void {
  const scelte = impostazioni();
  chiudiIlavoriRimastiAmezzAria();
  // La pausa si ricorda: chi ha messo in pausa ieri sera non deve ritrovare
  // tre telefoni che generano stamattina senza averlo chiesto.
  if (scelte.inPausa) turno.sospendi(true, "era in pausa dalla volta scorsa");
  void (async () => {
    try {
      // Sempre, anche a connessione spenta: da spenta ascolta solo su
      // 127.0.0.1, e serve comunque la pagina di DaProdConnessione.
      await accendi();
      if (scelte.connessione && scelte.internet) await accendiInternet();
    } catch {
      // Porta occupata, rete assente: il pannello lo dirà. Non è un motivo per
      // non far partire la suite.
    }
  })();
}

/**
 * I lavori rimasti a mezz'aria dalla volta scorsa.
 *
 * **La fila vive in memoria**, in `esecuzione.ts`: chiudere la suite la svuota.
 * Le richieste invece stanno su disco, e una che era «accettata» o «in
 * lavorazione» quando la suite si e' chiusa resta li' a dire che sta lavorando
 * per sempre — nessuno la fara' mai, e chi aspetta non lo sa.
 *
 * Visto sul PC vero il 22 agosto 2026: due lavori fermi in «ci sta lavorando»
 * da ore. All'avvio si chiudono, dicendo la verita' a chi le aveva chieste.
 */
function chiudiIlavoriRimastiAmezzAria(): void {
  const rimaste = remoto.archivi.datiCorrenti.richieste.filter(
    (r) => r.stato === "accettata" || r.stato === "in-lavoro",
  );
  if (!rimaste.length) return;
  for (const r of rimaste) {
    remoto.cambiaStato(r.id, adminDiCasa(), "scartata", {
      motivo: "Il computer si e' spento mentre ci lavorava. Richiedilo, se ti serve ancora.",
    });
  }
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

/**
 * Ogni quanto si torna a guardare il firewall.
 *
 * **Serviva.** Prima si guardava una volta sola, all'accensione: chi apriva la
 * porta da fuori la suite — o rispondeva al riquadro di Windows comparso da
 * solo — continuava a leggere «Windows sta bloccando» per sempre. Un avviso che
 * non sa più di cosa parla è peggio di nessun avviso.
 */
const OGNI_TANTO_MS = 20_000;
let guardia: NodeJS.Timeout | null = null;

async function rileggiFirewall(): Promise<void> {
  const prima = muroDiWindows;
  muroDiWindows = await statoFirewall();
  if (prima.aperta !== muroDiWindows.aperta || prima.incerto !== muroDiWindows.incerto) {
    sveglia();
    gateway?.aggiorna();
  }
  if (!guardia && gateway) {
    guardia = setInterval(() => void rileggiFirewall(), OGNI_TANTO_MS);
    guardia.unref?.();
  }
}

/** Alla chiusura della suite: la guardia non deve tenerla sveglia. */
function fermaGuardiaFirewall(): void {
  if (guardia) clearInterval(guardia);
  guardia = null;
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
  /**
   * Con la persona se ne va anche la sua cartella.
   *
   * «Facciamo una cartella per ogni utente in modo tale da tenere sempre i dati
   * degli utenti sotto controllo»: tenerli sotto controllo vuol dire anche
   * poterli togliere davvero, invece di lasciare in giro le cartelle di chi non
   * c'è più.
   *
   * ⚠ **I risultati non si toccano.** Quelli stanno in `output`, sono file veri
   * e qualcuno potrebbe volerli ancora — anche solo per riguardarli. Qui se ne
   * vanno gli stili e le preferenze, che senza quella persona non servono a
   * nessuno.
   */
  buttaLaCartella(id);
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

/**
 * Dove sta la console, per chi la deve aprire in una finestra.
 *
 * Sempre `127.0.0.1`, mai l'indirizzo di rete: DaProdConnessione gira **su
 * questo computer**, e farla passare dalla scheda di rete vorrebbe dire che il
 * pannello smette di aprirsi quando la connessione è spenta — che è esattamente
 * il momento in cui uno lo apre.
 */
export function indirizzoConsole(): string {
  return `http://127.0.0.1:${portaReale || PORTA}/`;
}

/* ----------------------------------------------- il token di questo PC */

/**
 * Come si chiama il dispositivo che è il computer stesso.
 *
 * Lo stesso id con cui la libreria firma quello che viene fatto stando davanti
 * al PC: se i due divergessero, le proprie cose smetterebbero di essere le
 * proprie. Per questo si legge da lì e non si riscrive qui.
 */
const ID_DI_CASA = PADRONE_DI_CASA;

/**
 * La credenziale del PC su sé stesso.
 *
 * DaProdConnessione è una finestra che apre la pagina del gateway, e il gateway
 * non risponde a nessuno senza token — nemmeno a chi gira sulla stessa
 * macchina. Fare un'eccezione per `127.0.0.1` sarebbe stata la strada corta e
 * sbagliata: qualunque programma sul PC avrebbe potuto chiedere una
 * generazione o leggere la libreria senza che nessuno l'avesse invitato.
 *
 * Invece il computer si accoppia con sé stesso, una volta sola, e da lì è un
 * dispositivo come gli altri — con la differenza che non compare nell'elenco
 * dei collegati: non è «uno che si è collegato», è la casa.
 */
export function tokenDiCasa(): string {
  const dati = remoto.archivi.datiCorrenti;
  const gia = dati.dispositivi.find((d) => d.id === ID_DI_CASA);
  if (gia) return gia.token;

  dati.dispositivi.push({
    id: ID_DI_CASA,
    nome: osNome(),
    ruolo: "admin",
    token: nuovoTokenDiCasa(),
    accoppiato: Date.now(),
    ultimoAccesso: Date.now(),
  });
  remoto.archivi.salva();
  return dati.dispositivi.find((d) => d.id === ID_DI_CASA)!.token;
}

/** Sessantaquattro cifre esadecimali, come quelli che il gateway dà ai telefoni. */
function nuovoTokenDiCasa(): string {
  return randomBytes(32).toString("hex");
}

/* ---------------------------------------------------------- il pannello */

/**
 * Il pannello, come lo vede chi guarda — da qualunque parte guardi.
 *
 * Le stesse quattro azioni valgono per DaProdConnessione sul PC, per il browser
 * di un portatile e per il telefono: sono scritte qui una volta, e il gateway le
 * espone su `/pannello`. Prima stavano solo nell'hub, in IPC, e il telefono non
 * poteva né invitare nessuno né sapere perché non lo raggiungeva.
 */
const fornitorePannello: FornitorePannello = {
  stato(dispositivo) {
    const fuori = statoTunnel();
    /**
     * **In cima quello che funziona anche fuori casa.**
     *
     * Lo stesso ordine di `basi()`, e per la stessa ragione: quello che conta è
     * arrivarci da fuori. Il primo di questo elenco è quello che la pagina
     * scrive sotto al QR, per chi lo deve copiare a mano sul telefono — e
     * scrivere l'indirizzo della wifi di casa vorrebbe dire dare a qualcuno un
     * indirizzo che smette di funzionare appena esce dalla porta.
     */
    const schede = reti().filter((r) => r.dove !== "virtuale");
    const daScheda = (r: { ip: string; che: string; dove: string }) => ({
      base: `http://${r.ip}:${portaReale || PORTA}`,
      che: r.che,
      dove: (r.dove === "ovunque" ? "ovunque" : "casa") as "ovunque" | "casa",
    });
    const elenco: StatoPannello["indirizzi"] = schede
      .filter((r) => r.dove === "ovunque")
      .map(daScheda);
    if (fuori.fase === "acceso" && fuori.indirizzo) {
      elenco.push({ base: fuori.indirizzo, che: "da Internet, cifrato", dove: "ovunque" });
    }
    elenco.push(...schede.filter((r) => r.dove !== "ovunque").map(daScheda));

    return {
      computer: osNome(),
      versione: app.getVersion(),
      indirizzi: elenco,
      tunnel: {
        fase: fuori.fase,
        indirizzo: fuori.indirizzo,
        motivo: fuori.motivo,
        quota: fuori.quota,
      },
      firewall: muroDiWindows,
      dispositivi: remoto
        .listaDispositivi()
        .filter((d) => d.id !== ID_DI_CASA)
        .map(({ token: _t, ...resto }) => resto),
      invito: invitoVivo,
      puoiDecidere: dispositivo.ruolo === "admin",
      codaAutomatica: true,
    };
  },

  async invita({ ruolo, quante }) {
    await nuovoInvito(ruolo, quante);
    // `nuovoInvito` lo mette da parte con il QR già disegnato: qui si torna
    // quello, che è la stessa cosa senza ridisegnare l'immagine.
    if (!invitoVivo) throw new Error("L'invito non è stato creato.");
    return invitoVivo;
  },

  async tunnel(acceso) {
    if (acceso) await accendiInternet();
    else await spegniInternet();
  },

  apriLaPorta: () => sbloccaLaPorta(),

  revoca(id) {
    revoca(id);
  },

  rinomina(id, nome) {
    remoto.rinomina(id, nome);
    sveglia();
    gateway?.aggiorna();
  },
};

/**
 * L'ultimo invito creato, finché vive.
 *
 * Si tiene qui e non nell'archivio perché contiene il **QR disegnato**, che è
 * un'immagine da 20 KB: salvarla su disco a ogni invito vorrebbe dire far
 * crescere un file che non ha nessun motivo di crescere.
 */
let invitoVivo: InvitoVivo | undefined;

/* ------------------------------------------------------- la fila che parte */

/**
 * Il cablaggio fra la fila e l'archivio delle richieste.
 *
 * `esecuzione.ts` sa aprire una scheda e riconoscere il file che esce; non sa
 * cosa sia una richiesta né dove vada scritto che è pronta. Questi quattro
 * metodi sono tutto quello che gli serve sapere.
 */
collegaEsecuzione({
  cartellaRisultati: remoto.risultatiDir,
  inLavoro(id) {
    remoto.cambiaStato(id, adminDiCasa(), "in-lavoro");
    gateway?.aggiorna();
    sveglia();
  },
  consegna(id, file) {
    const chi = remoto.archivi.datiCorrenti.richieste.find((r) => r.id === id);
    consegna(id, file);
    /**
     * **E lo dice anche a chi sta al computer**, dalla 0.7.7.
     *
     * Chiesto così: «mettiamo le notifiche anche su pc che non le sento». Fino
     * a ieri l'avviso arrivava solo sul telefono di chi aveva chiesto: chi
     * ospita la macchina — che è quello che aspetta di più, perché è lì —
     * doveva guardare la finestra.
     */
    avvisaSulComputer(
      chi?.numero ? `Pronto il numero ${chi.numero}` : "Un lavoro è pronto",
      `${chi?.daNome ?? "qualcuno"}: ${(chi?.testo ?? file.nome).slice(0, 90)}`,
    );
    // La fila si è accorciata: qualcuno che aspettava per via di un tetto può
    // partire adesso. Senza questa riga i tetti sarebbero una porta che non si
    // riapre — vedi `rivediTrattenute`.
    liberaLaFila();
  },
  fallita(id, motivo) {
    remoto.cambiaStato(id, adminDiCasa(), "scartata", { motivo });
    gateway?.aggiorna();
    sveglia();
    liberaLaFila();
  },
});

/** Un posto si è liberato: chi era trattenuto da un tetto può passare. */
function liberaLaFila(): void {
  const partite = remoto.rivediTrattenute();
  if (!partite.length) return;
  gateway?.aggiorna();
  sveglia();
}

/**
 * Accettata vuol dire **falla**.
 *
 * Da qualunque parte arrivi la decisione — il pannello, la console, il telefono
 * — finisce qui, e da qui la scheda giusta si apre e genera. È il pezzo che
 * mancava perché «da fuori» volesse dire davvero da fuori.
 */
remoto.suAccettata((richiesta) => {
  accoda({
    id: richiesta.id,
    app: richiesta.app,
    azione: richiesta.opzioni?.azione ?? "",
    testo: richiesta.testo,
    opzioni: richiesta.opzioni ?? {},
    da: richiesta.daNome,
    // Chi l'ha chiesta resta attaccato al file che ne esce: è quello che fa
    // sì che nella galleria ognuno veda le sue cose.
    daId: richiesta.daDispositivo,
    /**
     * **Chi sta al computer passa davanti.**
     *
     * Chiesto il 26 agosto 2026: «se sono in modalità che sto ricevendo devo
     * poter mandare in coda anche i miei prompt». Poterli mandare non basta:
     * se finissero dietro a tre telefoni, chi ospita aspetterebbe un'ora per
     * una cosa sua sul proprio computer. Non scavalca un lavoro **già
     * partito** — quello si finisce — ma non si mette nemmeno in fondo.
     */
    corsia: richiesta.daDispositivo === ID_DI_CASA ? "subito" : "in-fila",
    numero: richiesta.numero,
  });
});

/* ------------------------------------------------------------- il ponte */

/** Il ponte fra main e renderer: l'ipc.ts registra i canali su questo. */
export const accessoRemoto = {
  accendi: accendiEricorda,
  spegni: spegniEricorda,
  accendiInternet,
  spegniInternet,
  sbloccaLaPorta,
  stato: statoPannello,
  nuovoInvito,
  scegliRete,
  revoca,
  decidi,
  consegna,
  /* ------------------------------------------------- il governo della fila */
  /**
   * «Sto usando il computer».
   *
   * Due cose insieme, e devono restare insieme: il turno smette di far partire
   * lavori nuovi *e* le richieste che arrivano non si accettano più da sole.
   * Farne una sola vorrebbe dire una pausa che si scavalca da fuori.
   */
  pausa(inPausa: boolean): { ok: true } {
    impostaPausa(inPausa);
    turno.sospendi(inPausa, "chi sta al computer lo sta usando");
    if (!inPausa) liberaLaFila();
    gateway?.aggiorna();
    sveglia();
    return { ok: true };
  },
  /** Chi genera senza aspettare un sì: mai, solo chi decide, o tutti. */
  chiPassaSubito(chi: "mai" | "admin" | "tutti"): { ok: true } {
    impostaAccettaDaSola(chi);
    liberaLaFila();
    gateway?.aggiorna();
    sveglia();
    return { ok: true };
  },
  /** I due tetti: quanti lavori in fila in tutto, e quanti a testa. */
  limiti(fila: number, persona: number): { ok: true } {
    impostaLimiti(fila, persona);
    liberaLaFila();
    gateway?.aggiorna();
    sveglia();
    return { ok: true };
  },
  /** Toglie dalla fila un lavoro non ancora partito, e lo dice a chi aspettava. */
  togliDallaFila(id: string): EsitoDecisione {
    togliDallaFila(id);
    const errore = remoto.cambiaStato(id, adminDiCasa(), "scartata", {
      motivo: "Tolto dalla fila da chi sta al computer.",
    });
    gateway?.aggiorna();
    sveglia();
    liberaLaFila();
    return errore ? { ok: false, errore } : { ok: true };
  },
  /**
   * Le cartelle importanti, per i collegamenti rapidi dell'hub.
   *
   * «Facciamo un collegamento rapido a queste cartelle nella suite»: quattro
   * tasti che aprono Esplora risorse dove serve, invece di un percorso da
   * copiare a mano da un file di documentazione.
   */
  cartelle() {
    return cartelleImportanti();
  },
  /** Com'è messa la macchina adesso: chi lavora, chi aspetta, se è in pausa. */
  comeVaLaMacchina() {
    return { turno: turno.stato(), fila: filaCompleta(), scelte: impostazioni() };
  },
  onChanged(fn: () => void): () => void {
    ascoltatori.add(fn);
    return () => ascoltatori.delete(fn);
  },
};

/** Alla chiusura della suite il gateway si spegne con tutto il resto. */
export async function spegniAccessoRemoto(): Promise<void> {
  fermaGuardiaFirewall();
  // Prima il tunnel: è un processo figlio, e lasciarlo vivo vorrebbe dire un
  // indirizzo su Internet che punta a una porta che sta per chiudersi.
  await spegniTunnel();
  if (gateway) await gateway.chiudi();
  gateway = null;
  // L'archivio salva in differita: alla chiusura non c'è un "poco dopo".
  archivio.scriviAdesso();
}
