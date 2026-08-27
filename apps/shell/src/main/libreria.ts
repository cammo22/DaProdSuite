/**
 * La libreria condivisa: tutto quello che le app della suite producono.
 *
 * È il punto in cui le app smettono di essere sette programmi separati. Il
 * Visualizer vede i brani generati da DaProdMusica; DaProdCinema prenderà quei
 * brani e le immagini di DaProdFoto; DaProdFoto manderà una copertina a un brano.
 * Nessuna app conosce le altre: conoscono tutte questa.
 *
 * La convenzione dei file viene da DaProdMusica, che l'aveva già:
 *
 *     <nome>.mp3          il risultato
 *     <nome>.json         i metadati (descrizione, testo, parametri, seed)
 *     <nome>.cover.jpg    la copertina, se c'è
 *
 * Generalizzata a tutti i tipi e a tutte le app. Niente database: la cartella
 * **è** la libreria. Se sposti un file a mano, la libreria se ne accorge; se la
 * suite sparisce, i tuoi risultati restano file normali.
 */

import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { copyFileSync, renameSync as spostaFile } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { APP_IDS, type AppId, type ElementoLibreria, type TipoElemento } from "@daprod/ipc";
import { codificaUrl } from "./file-scheme";
import { cuciLaCopertina, quandoCompareUnaCopertina } from "./anteprime";
import { OUTPUT_DIR } from "./paths";

const SUFFISSO_COPERTINA = ".cover.jpg";

/** Una cosa che qualcuno ha scritto sotto a un risultato. */
export interface Commento {
  id: string;
  chi: string;
  chiNome: string;
  testo: string;
  quando: number;
}

/** Quanto può essere lungo un commento. Due righe: è un commento, non un post. */
const COMMENTO_MAX_BATTUTE = 500;

/** Quanti se ne tengono per ogni cosa. Oltre, cade il più vecchio. */
const COMMENTI_MAX = 200;

/**
 * Chi possiede quello che e' stato fatto stando davanti al computer.
 *
 * E' lo stesso id con cui la suite si accoppia con se' stessa in `remoto.ts`:
 * il PC e' un dispositivo come gli altri, e le sue cose sono sue.
 */
export const PADRONE_DI_CASA = "questo-computer";

/** Cosa può stare nel nome di un file rinominato dall'utente. */
const NOME_PULITO = /[^\p{L}\p{N} _.,()[\]&'-]+/gu;

/** Una copertina più grande di così è un errore, non una copertina. */
const COPERTINA_MAX_BYTE = 4_000_000;

/** Estensione -> tipo. Quello che non è qui dentro non entra in libreria. */
const TIPI: Record<string, TipoElemento> = {
  ".mp3": "audio",
  ".wav": "audio",
  ".flac": "audio",
  ".ogg": "audio",
  ".opus": "audio",
  ".m4a": "audio",
  ".png": "immagine",
  ".jpg": "immagine",
  ".jpeg": "immagine",
  ".webp": "immagine",
  ".mp4": "video",
  ".webm": "video",
  ".mkv": "video",
};

class Libreria extends EventEmitter {
  private cache: ElementoLibreria[] = [];
  private ultimaScansione = 0;

  /** Cartella dei risultati di un'app. Creata al volo: serve prima che generi. */
  cartella(app: AppId): string {
    const dir = join(OUTPUT_DIR, app);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Elenco completo, dal più recente. La scansione è rifatta al massimo una
   * volta al secondo: l'hub e le app la chiedono spesso e leggere l'albero a
   * ogni richiesta sarebbe sprecato.
   */
  elenco(force = false): ElementoLibreria[] {
    const adesso = Date.now();
    if (!force && adesso - this.ultimaScansione < 1000) return this.cache;

    const trovati: ElementoLibreria[] = [];
    for (const app of APP_IDS) {
      const radice = join(OUTPUT_DIR, app);
      if (existsSync(radice)) raccogli(radice, radice, app, trovati);
    }
    trovati.sort((a, b) => b.creato - a.creato);

    this.cache = trovati;
    this.ultimaScansione = adesso;
    return trovati;
  }

  /** Filtra per tipo e/o app di origine. */
  cerca(filtro: { tipo?: TipoElemento; app?: AppId } = {}): ElementoLibreria[] {
    return this.elenco().filter(
      (e) => (!filtro.tipo || e.tipo === filtro.tipo) && (!filtro.app || e.app === filtro.app),
    );
  }

  /**
   * Come si chiamava prima, e come si chiama adesso.
   *
   * ⚠ **La causa vera delle anteprime dei video che non arrivavano mai.** Vale
   * la pena scriverla per esteso, perché non si vedeva da nessuna parte.
   *
   * Un video chiesto dal telefono fa questo giro: il motore lo scrive come
   * `clip_00042_.mp4`; DaProdCinema, appena finito, comincia a fargli la
   * copertina — scarica il file, lo decodifica, ne prende un fotogramma:
   * qualche secondo. Nel frattempo la suite gli dà il nome di quello che era
   * stato chiesto (`esecuzione.ts`, che chiama `intitola`), e il file diventa
   * `una barca che entra in porto.mp4`. Poi la copertina arriva, chiede di
   * essere messa accanto a `clip_00042_.mp4`, e **quel file non esiste più**:
   * `trova` rispondeva «non c'è», `impostaCopertina` tornava `false`, e non se
   * ne accorgeva nessuno. Quel video restava senza anteprima per sempre.
   *
   * E non era un caso raro: era **ogni** video chiesto da fuori.
   *
   * La cura è dire come si chiama adesso invece di dire che non c'è. Un
   * elemento rinominato è lo stesso elemento: chi ha in mano il nome di prima
   * ha in mano quella cosa lì, e ha ragione lui.
   */
  private diventato = new Map<string, string>();

  /** Quante rinomine si ricordano: si consultano entro secondi, ne bastano poche. */
  private static readonly RINOMINE_RICORDATE = 200;

  private ricordaRinomina(prima: string, dopo: string): void {
    // Due rinomine di fila sono normali — il nome del motore, poi il titolo —
    // e chi punta al primo dei tre nomi deve arrivare fino all'ultimo.
    for (const [da, a] of this.diventato) {
      if (a === prima) this.diventato.set(da, dopo);
    }
    this.diventato.set(prima, dopo);
    while (this.diventato.size > Libreria.RINOMINE_RICORDATE) {
      const piuVecchia = this.diventato.keys().next().value;
      if (piuVecchia === undefined) break;
      this.diventato.delete(piuVecchia);
    }
  }

  trova(id: string): ElementoLibreria | undefined {
    const daCache = this.elenco().find((e) => e.id === id);
    if (daCache) return daCache;
    // Un file appena scritto può essere più giovane della cache: un'app che
    // rinomina il brano un istante dopo averlo generato lo cercherebbe invano.
    const fresco = this.elenco(true).find((e) => e.id === id);
    if (fresco) return fresco;

    // E se con quel nome non c'è più: forse è solo diventato un altro nome.
    const adesso = this.diventato.get(id);
    return adesso ? this.elenco().find((e) => e.id === adesso) : undefined;
  }

  /** Da chiamare quando un'app scrive un risultato, per aggiornare subito l'indice. */
  segnalaNovita(): void {
    this.emit("cambiata", this.elenco(true));
  }

  /* ------------------------------------------------------------- scrittura */
  //
  // Queste quattro sostituiscono `library_api.py` di MinimaxMusica, che faceva
  // le stesse cose come custom node di ComfyUI. Stando qui valgono per tutte le
  // app invece che per una, e continuano a funzionare anche a motore spento: il
  // Visualizer, che di Python non ne ha, può rinominare un brano lo stesso.

  /**
   * Cambia il nome di un elemento, portandosi dietro metadati e copertina.
   *
   * Rinomina il file vero, non un'etichetta in un database: dopo, il brano si
   * chiama così anche aprendo la cartella. Torna il nuovo elemento, perché
   * l'id — che è il percorso — è cambiato.
   */
  rinomina(id: string, nome: string): ElementoLibreria | null {
    const elemento = this.trova(id);
    if (!elemento) return null;

    const pulito = nome.replace(NOME_PULITO, "").trim().replace(/^\.+|\.+$/g, "").slice(0, 80);
    if (!pulito) return null;

    const cartella = dirname(elemento.percorso);
    const estensione = extname(elemento.percorso);
    let destinazione = join(cartella, pulito + estensione);

    // Due brani con lo stesso titolo capitano spesso (stesso testo, resa
    // diversa): il secondo diventa "titolo (2)" invece di cancellare il primo.
    let n = 2;
    while (
      existsSync(destinazione) &&
      destinazione.toLowerCase() !== elemento.percorso.toLowerCase()
    ) {
      destinazione = join(cartella, `${pulito} (${n})${estensione}`);
      n += 1;
    }

    /**
     * **Prima il file, poi quello che gli sta accanto.**
     *
     * L'ordine era il contrario, e si è visto cosa vuol dire il 23 agosto 2026:
     * su un video che Windows teneva ancora bloccato, i metadati si spostavano
     * al nome nuovo e il video restava al vecchio. Risultato: un `.json`
     * orfano, e un video senza più i suoi parametri accanto.
     *
     * Spostando prima il file, se non si può non si è mosso ancora niente e si
     * può riprovare da capo — che è quello che fa `intitola`.
     */
    renameSync(elemento.percorso, destinazione);
    for (const [prima, dopo] of accompagnatori(elemento.percorso, destinazione)) {
      if (existsSync(prima)) renameSync(prima, dopo);
    }

    const nuovoId = relative(OUTPUT_DIR, destinazione).replace(/\\/g, "/");
    // Chi aveva in mano il nome di prima deve poterci arrivare lo stesso:
    // vedi `diventato`, che e' la cura del difetto delle anteprime.
    if (nuovoId !== elemento.id) this.ricordaRinomina(elemento.id, nuovoId);

    this.segnalaNovita();
    return this.trova(nuovoId) ?? null;
  }

  /**
   * Mette o toglie la copertina di un elemento.
   *
   * L'immagine arriva già ritagliata quadrata come data URL: il ritaglio lo fa
   * la pagina con un canvas, che ce l'ha in casa. Farlo qui vorrebbe dire una
   * libreria di immagini in più nello shell per una cosa che il browser sa fare.
   */
  impostaCopertina(id: string, dataUrl: string | null): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    const copertina = senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA;

    if (!dataUrl) {
      if (existsSync(copertina)) rmSync(copertina);
      this.segnalaNovita();
      return true;
    }

    const virgola = dataUrl.indexOf(",");
    const base64 = virgola >= 0 ? dataUrl.slice(virgola + 1) : dataUrl;
    let dati: Buffer;
    try {
      dati = Buffer.from(base64, "base64");
    } catch {
      return false;
    }
    if (!dati.length || dati.length > COPERTINA_MAX_BYTE) return false;

    writeFileSync(copertina, dati);
    this.segnalaNovita();

    /**
     * **E poi la si cuce dentro il brano.**
     *
     * Chiesto il 26 agosto 2026: «facciamo in modo che nella suite quando una
     * canzone è completa viene unita l'immagine al file». Il `.cover.jpg`
     * accanto è una convenzione della suite, e quando il brano finisce nel
     * telefono di qualcuno quella convenzione non lo segue: un mp3 con la
     * copertina **dentro** la mostra ovunque.
     *
     * Senza `await`, e apposta: chi ha appena generato una copertina la deve
     * vedere comparire subito nella sua scheda, non fra due secondi di FFmpeg.
     * Il file accanto resta comunque — è quello che la galleria usa come
     * anteprima — quindi se la cucitura non riesce non si è perso niente.
     */
    if (elemento.tipo === "audio") {
      void cuciLaCopertina(elemento.percorso)
        .then((fatto) => {
          if (fatto) this.segnalaNovita();
        })
        .catch(() => {
          // FFmpeg assente o file occupato: il brano resta com'era, con la sua
          // copertina di fianco. È esattamente quello che faceva prima.
        });
    }
    return true;
  }

  /**
   * Scrive il `.json` che accompagna un elemento: descrizione, testo, seed,
   * parametri — e, se non gliel'ha già dato nessuno, **un nome leggibile**.
   *
   * **Il difetto che cura**, detto il 22 agosto 2026: «spesso i file vengono
   * salvati con nomi diversi; si devono chiamare e apparire nelle interfacce
   * come il prompt usato». Il motore scrive `daprod_00042_.png`, e quel numero
   * era l'unica cosa che si leggeva in galleria, sul telefono e nella cartella.
   *
   * Qui il nome si prende da quello che è stato chiesto, in quest'ordine: il
   * testo scritto dalla persona, la descrizione, il prompt vero e proprio. Chi
   * un titolo ce l'ha già — DaProdMusica, che chiede come si chiama il brano —
   * non viene toccato: il suo è migliore di qualunque cosa possiamo dedurre.
   */
  scriviMeta(id: string, meta: Record<string, unknown>): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    const conNome = { ...meta };
    if (!daLeggere(conNome["titolo"])) {
      const chiesto =
        daLeggere(conNome["testo"]) ?? daLeggere(conNome["descrizione"]) ?? daLeggere(conNome["prompt"]);
      if (chiesto) conNome["titolo"] = unaRiga(chiesto);
    }

    writeFileSync(
      senzaEstensione(elemento.percorso) + ".json",
      JSON.stringify(conNome, null, 1),
      "utf8",
    );
    this.segnalaNovita();
    return true;
  }

  /**
   * Chi ha chiesto una cosa. Vuoto vuol dire: e' stata fatta stando al PC.
   *
   * **Perche' il PC e' un autore come gli altri.** Dalla 0.7.2 la galleria che
   * si vede da fuori mostra a ognuno le sue cose, e «le sue» ha bisogno di un
   * padrone scritto da qualche parte. Sta nel `.json` accanto al file, insieme
   * al resto dei parametri: cosi' non c'e' un secondo elenco da tenere
   * allineato, e una cosa spostata a mano si porta dietro il suo autore.
   *
   * Quello che c'era prima della 0.7.2 non ha nessun autore scritto, ed e'
   * giusto che risulti del computer: e' li' che e' stato fatto.
   */
  padrone(elemento: ElementoLibreria): string {
    const chi = elemento.meta?.["chi"];
    return typeof chi === "string" && chi ? chi : PADRONE_DI_CASA;
  }

  /** Vero se questa cosa l'ha messa in bacheca chi l'ha fatta. */
  inBacheca(elemento: ElementoLibreria): boolean {
    return elemento.meta?.["pubblicato"] === true;
  }

  /**
   * Da' un nome a una cosa appena prodotta, e dice di chi e'.
   *
   * **Il difetto che cura**, detto il 22 agosto 2026: «facciamo attenzione ai
   * nomi, spesso i file vengono salvati con nomi diversi; si devono chiamare e
   * apparire nelle interfacce come il prompt usato». Ed era vero: il motore
   * scriveva `daprod_00042_.png`, e quel numero era l'unica cosa che si leggeva
   * in galleria, sul telefono e nella cartella.
   *
   * Adesso il file **si chiama** come quello che e' stato chiesto — non
   * un'etichetta in un archivio: aprendo la cartella si legge la stessa cosa —
   * e accanto resta scritto chi l'ha chiesto e con che parole esatte.
   */
  async intitola(
    id: string,
    dati: { titolo: string; chi?: string; chiNome?: string; extra?: Record<string, unknown> },
  ): Promise<ElementoLibreria | null> {
    const elemento = this.trova(id);
    if (!elemento) return null;

    const titolo = unaRiga(dati.titolo);
    const meta: Record<string, unknown> = {
      ...(elemento.meta ?? {}),
      ...(dati.extra ?? {}),
      titolo,
      // Il prompt intero resta scritto: il nome del file lo taglia a ottanta
      // battute, e la descrizione vera puo' essere lunga il triplo.
      testo: dati.titolo.trim() || titolo,
    };
    if (dati.chi) meta["chi"] = dati.chi;
    if (dati.chiNome) meta["chiNome"] = dati.chiNome;

    writeFileSync(
      senzaEstensione(elemento.percorso) + ".json",
      JSON.stringify(meta, null, 1),
      "utf8",
    );
    /**
     * Prima i metadati, poi il nome: `rinomina` si porta dietro il `.json`, e
     * scriverlo dopo vorrebbe dire scriverlo accanto a un file che non c'e'
     * piu'.
     *
     * **E il nome puo' non riuscire, senza che sia un guaio.** Il 23 agosto
     * 2026, sul PC vero: «a volte i video non li manda correttamente». Nel log
     * c'era scritto tutto — `EBUSY: resource busy or locked, rename
     * clip_00020_.mp4` — e la conseguenza era la peggiore possibile: il video
     * c'era, era finito, e la richiesta risultava **fallita** perche' non si
     * era riusciti a cambiargli nome. Windows tiene il file bloccato finche' il
     * motore non lo lascia andare, e su un video da cento MB quel momento
     * arriva dopo.
     *
     * Adesso ci si riprova qualche volta, e se proprio non si puo' **si tiene
     * il nome del motore**: il titolo e' gia' scritto nei metadati, quindi in
     * galleria, sul telefono e nella fila si legge lo stesso il prompt. Cambia
     * solo come si chiama il file dentro la cartella, che e' la meta' meno
     * importante della cosa.
     */
    for (let tentativo = 0; tentativo < 4; tentativo += 1) {
      try {
        return this.rinomina(id, titolo) ?? this.trova(id) ?? null;
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return this.trova(id) ?? null;
  }

  /**
   * Mette una cosa in bacheca, o la toglie. Solo chi l'ha fatta.
   *
   * La bacheca e' l'unico modo in cui una persona vede il lavoro di un'altra:
   * senza, ognuno vede le sue e basta. E' una decisione di chi ha generato, e
   * per questo il controllo sta qui e non nell'interfaccia.
   */
  pubblica(id: string, chi: string, pubblicato: boolean): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;
    if (this.padrone(elemento) !== chi) return false;

    const meta = { ...(elemento.meta ?? {}), pubblicato };
    writeFileSync(
      senzaEstensione(elemento.percorso) + ".json",
      JSON.stringify(meta, null, 1),
      "utf8",
    );
    this.segnalaNovita();
    return true;
  }

  /* ------------------------------------------------------------- DaProd */

  /**
   * Mette o toglie il mi piace di una persona. Torna quanti sono adesso.
   *
   * **Sta nel `.json` accanto al file**, come tutto il resto: niente secondo
   * elenco da tenere allineato, e una cosa spostata a mano si porta dietro i
   * suoi mi piace. È la stessa regola che vale per l'autore e per la bacheca —
   * la cartella *è* la libreria.
   *
   * Si può mettere su qualunque cosa si abbia il diritto di **vedere**: le
   * proprie, e quelle che qualcuno ha messo in bacheca. Il controllo sul
   * diritto di vedere lo fa chi chiama (`remoto.ts`), che è l'unico a sapere
   * chi sta guardando.
   */
  miPiace(id: string, chi: string, mi: boolean): number | null {
    const elemento = this.trova(id);
    if (!elemento) return null;

    const prima = leggiElenco(elemento.meta?.["miPiace"]);
    const dopo = mi ? [...new Set([...prima, chi])] : prima.filter((x) => x !== chi);
    this.aggiornaMeta(elemento, { miPiace: dopo });
    return dopo.length;
  }

  /** Quanti mi piace ha, e se ce l'ha messo questa persona. */
  miPiaceDi(elemento: ElementoLibreria, chi: string): { quanti: number; mio: boolean } {
    const elenco = leggiElenco(elemento.meta?.["miPiace"]);
    return { quanti: elenco.length, mio: elenco.includes(chi) };
  }

  /* ---------------------------------------------------------- i commenti */

  /**
   * Le parole che qualcuno ha scritto sotto a una cosa.
   *
   * **Stanno nel `.json` accanto al file**, come i mi piace e come l'autore:
   * niente secondo elenco da tenere allineato, e una cosa spostata a mano si
   * porta dietro quello che le hanno detto sotto. È la stessa regola di tutto il
   * resto — la cartella *è* la libreria.
   *
   * Chiesto il 27 agosto 2026: «facciamo un modo di poter anche commentare i
   * contenuti». È l'ultimo pezzo che mancava a DaProd per essere un posto dove
   * si sta: un cuore dice *che* qualcuno è passato, un commento dice **cosa ha
   * pensato**.
   *
   * Il nome di chi scrive si salva **insieme** al commento e non si va a
   * cercare dopo. Non è una ripetizione per pigrizia: chi si scollega sparisce
   * dall'elenco dei dispositivi, e senza il nome scritto qui il suo commento
   * diventerebbe di «qualcuno» il giorno dopo.
   */
  commenti(elemento: ElementoLibreria): Commento[] {
    const grezzi = elemento.meta?.["commenti"];
    if (!Array.isArray(grezzi)) return [];
    return grezzi.filter((c): c is Commento => {
      if (typeof c !== "object" || c === null) return false;
      const x = c as Record<string, unknown>;
      return typeof x["id"] === "string" && typeof x["testo"] === "string";
    });
  }

  /**
   * Scrive un commento. Torna l'elenco aggiornato, o null se non si può.
   *
   * Il tetto a [COMMENTI_MAX] non è un limite di prodotto, è una difesa del
   * file: quel `.json` sta accanto a un video e viene riletto a ogni giro di
   * galleria. Oltre il tetto cade il più vecchio.
   */
  commenta(
    id: string,
    chi: string,
    chiNome: string,
    testo: string,
  ): Commento[] | null {
    const elemento = this.trova(id);
    if (!elemento) return null;

    const pulito = testo.replace(/\s+/gu, " ").trim().slice(0, COMMENTO_MAX_BATTUTE);
    if (!pulito) return null;

    const commento: Commento = {
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      chi,
      chiNome,
      testo: pulito,
      quando: Date.now(),
    };
    const dopo = [...this.commenti(elemento), commento].slice(-COMMENTI_MAX);
    this.aggiornaMeta(elemento, { commenti: dopo });
    return dopo;
  }

  /**
   * Toglie un commento. Lo può fare chi l'ha scritto, e chi ha fatto la cosa.
   *
   * Il secondo caso conta quanto il primo: chi mette una cosa in bacheca deve
   * poter togliere quello che gli scrivono sotto, o smette di metterci niente.
   */
  togliCommento(id: string, idCommento: string, chi: string): Commento[] | null {
    const elemento = this.trova(id);
    if (!elemento) return null;

    const tutti = this.commenti(elemento);
    const suo = tutti.find((c) => c.id === idCommento);
    if (!suo) return null;
    if (suo.chi !== chi && this.padrone(elemento) !== chi) return null;

    const dopo = tutti.filter((c) => c.id !== idCommento);
    this.aggiornaMeta(elemento, { commenti: dopo });
    return dopo;
  }

  /**
   * Tiene da parte una cosa di qualcun altro, o smette di tenerla.
   *
   * **Non è una copia.** Il file resta uno e resta di chi l'ha fatto: tenerla
   * vuol dire farla comparire fra le proprie cose, come un segnalibro. Se chi
   * l'ha fatta la toglie dalla bacheca, sparisce anche da qui — ed è giusto:
   * era sua, e ha cambiato idea.
   */
  tieni(id: string, chi: string, tenere: boolean): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    const prima = leggiElenco(elemento.meta?.["tenutaDa"]);
    const dopo = tenere ? [...new Set([...prima, chi])] : prima.filter((x) => x !== chi);
    this.aggiornaMeta(elemento, { tenutaDa: dopo });
    return true;
  }

  /** Vero se questa persona l'ha tenuta da parte. */
  laTiene(elemento: ElementoLibreria, chi: string): boolean {
    return leggiElenco(elemento.meta?.["tenutaDa"]).includes(chi);
  }

  /** Vero se è un file caricato a mano da una persona, non generato dalla suite. */
  eCaricata(elemento: ElementoLibreria): boolean {
    return elemento.meta?.["caricata"] === true;
  }

  /**
   * Una cosa caricata a mano, messa in bacheca.
   *
   * **Perché finisce fra i risultati di DaProdConnessione.** La libreria è la
   * cartella, e la cartella è divisa per scheda: un file caricato da una
   * persona non è di DaProdFoto né di DaProdMusica, è della scheda che *è* la
   * bacheca. Non c'è nessun motore che scriva lì dentro, quindi non si
   * mescola con niente.
   *
   * Nasce **già in bacheca**: chi carica un file per la bacheca non deve poi
   * anche pubblicarlo, sarebbe chiedergli due volte la stessa cosa.
   */
  aggiungi(dati: {
    percorso: string;
    nome: string;
    bytes: number;
    chi: string;
    chiNome: string;
    didascalia?: string;
  }): ElementoLibreria | null {
    const coda = extname(dati.nome).toLowerCase();
    // Solo quello che la libreria sa mostrare: un `.exe` in bacheca non è un
    // contenuto, è un modo di far girare qualcosa sul computer di un altro.
    if (!TIPI[coda]) return null;

    const dove = this.cartella("connessione");
    const titolo = unaRiga(dati.didascalia?.trim() || basename(dati.nome, coda));
    let destinazione = join(dove, `${titolo.slice(0, 70)}${coda}`);
    for (let n = 2; existsSync(destinazione) && n < 200; n += 1) {
      destinazione = join(dove, `${titolo.slice(0, 66)} (${n})${coda}`);
    }

    try {
      // `rename` fra due cartelle dello stesso disco è istantaneo; se sono
      // dischi diversi Windows dice di no, e allora si copia e si butta.
      try {
        spostaFile(dati.percorso, destinazione);
      } catch {
        copyFileSync(dati.percorso, destinazione);
        rmSync(dati.percorso, { force: true });
      }
      writeFileSync(
        senzaEstensione(destinazione) + ".json",
        JSON.stringify(
          {
            titolo,
            testo: dati.didascalia?.trim() || titolo,
            chi: dati.chi,
            chiNome: dati.chiNome,
            pubblicato: true,
            caricata: true,
          },
          null,
          1,
        ),
        "utf8",
      );
    } catch {
      return null;
    }

    this.segnalaNovita();
    return this.elenco(true).find((e) => e.percorso === destinazione) ?? null;
  }

  /**
   * Riscrive il `.json` di un elemento cambiando solo quello che serve.
   *
   * Tre gesti diversi scrivevano gli stessi metadati in tre modi diversi — la
   * bacheca, i mi piace, il «tengo» — e ognuno rischiava di sovrascrivere il
   * lavoro degli altri due leggendo una copia vecchia. Qui si legge quello che
   * c'è **adesso** sul disco e ci si sovrappone.
   */
  private aggiornaMeta(elemento: ElementoLibreria, cambi: Record<string, unknown>): void {
    const dove = senzaEstensione(elemento.percorso) + ".json";
    let attuali: Record<string, unknown> = elemento.meta ?? {};
    try {
      if (existsSync(dove)) {
        attuali = JSON.parse(readFileSync(dove, "utf8")) as Record<string, unknown>;
      }
    } catch {
      // Metadati illeggibili: si riparte da quelli in cache invece di perdere
      // il gesto che l'utente ha appena fatto.
    }
    writeFileSync(dove, JSON.stringify({ ...attuali, ...cambi }, null, 1), "utf8");
    this.segnalaNovita();
  }

  /** Cancella un elemento con i suoi metadati e la sua copertina. */
  elimina(id: string): boolean {
    const elemento = this.trova(id);
    if (!elemento) return false;

    for (const extra of [
      senzaEstensione(elemento.percorso) + ".json",
      senzaEstensione(elemento.percorso) + SUFFISSO_COPERTINA,
    ]) {
      if (existsSync(extra)) rmSync(extra);
    }
    rmSync(elemento.percorso);

    this.segnalaNovita();
    return true;
  }
}

/**
 * Un prompt ridotto a un nome di file leggibile.
 *
 * Non e' una ripulitura qualunque: e' quello che si legge in galleria, sul
 * telefono e nella cartella. Si toglie quello che Windows non accetta, si
 * schiacciano gli a capo, e si taglia a ottanta battute su un confine di
 * parola - «un faro sulla scogliera al…» si legge, «un faro sulla scogl» no.
 */
function unaRiga(testo: string): string {
  const pulito = testo.replace(/\s+/gu, " ").replace(NOME_PULITO, "").trim();
  if (!pulito) return "senza nome";
  if (pulito.length <= 80) return pulito;
  const tagliato = pulito.slice(0, 80);
  const spazio = tagliato.lastIndexOf(" ");
  return (spazio > 40 ? tagliato.slice(0, spazio) : tagliato).trim();
}

/**
 * Un elenco di id salvato nei metadati, letto senza fidarsi.
 *
 * Quei `.json` si possono aprire con il blocco note, e una versione futura può
 * scriverci dentro qualcos'altro: quello che non è una lista di stringhe vale
 * come lista vuota, invece di far scoppiare la galleria.
 */
function leggiElenco(valore: unknown): string[] {
  if (!Array.isArray(valore)) return [];
  return valore.filter((x): x is string => typeof x === "string" && x.length > 0);
}

/** Il valore se è una stringa con dentro qualcosa, altrimenti niente. */
function daLeggere(valore: unknown): string | undefined {
  return typeof valore === "string" && valore.trim() ? valore.trim() : undefined;
}

function senzaEstensione(percorso: string): string {
  return percorso.slice(0, -extname(percorso).length);
}

/** I file che vivono accanto a un risultato e devono seguirlo quando si sposta. */
function accompagnatori(prima: string, dopo: string): [string, string][] {
  const a = senzaEstensione(prima);
  const b = senzaEstensione(dopo);
  return [
    [a + ".json", b + ".json"],
    [a + SUFFISSO_COPERTINA, b + SUFFISSO_COPERTINA],
  ];
}

function raccogli(
  radice: string,
  dir: string,
  app: AppId,
  fuori: ElementoLibreria[],
): void {
  let voci;
  try {
    voci = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const voce of voci) {
    const percorso = join(dir, voce.name);

    if (voce.isDirectory()) {
      raccogli(radice, percorso, app, fuori);
      continue;
    }
    if (!voce.isFile()) continue;

    // I .json sono metadati di un altro file e le copertine appartengono al
    // brano che accompagnano: né gli uni né le altre sono elementi a sé.
    if (voce.name.endsWith(".json")) continue;
    if (voce.name.endsWith(SUFFISSO_COPERTINA)) continue;

    const tipo = TIPI[extname(voce.name).toLowerCase()];
    if (!tipo) continue;

    let stat;
    try {
      stat = statSync(percorso);
    } catch {
      continue;
    }

    const radiceNome = percorso.slice(0, -extname(percorso).length);
    const copertina = `${radiceNome}${SUFFISSO_COPERTINA}`;
    const metaFile = `${radiceNome}.json`;

    fuori.push({
      // Percorso relativo alla cartella dei risultati: resta lo stesso anche se
      // la suite viene installata altrove.
      id: relative(OUTPUT_DIR, percorso).replace(/\\/g, "/"),
      tipo,
      app,
      nome: leggiTitolo(metaFile) ?? basename(voce.name, extname(voce.name)),
      url: codificaUrl(percorso),
      percorso,
      bytes: stat.size,
      creato: stat.mtimeMs,
      copertina: existsSync(copertina) ? codificaUrl(copertina) : undefined,
      meta: leggiMeta(metaFile),
    });
  }
}

function leggiMeta(file: string): Record<string, unknown> | undefined {
  try {
    const dati = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return typeof dati === "object" && dati !== null
      ? (dati as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Come si chiama una cosa, per chi la guarda.
 *
 * Prima si guardava solo `titolo`, e chi non ce l'aveva restava
 * `daprod_00048_` — che è il nome che dà il motore, e non dice niente. Adesso,
 * se il titolo non c'è, **vale quello che è stato chiesto**: il testo scritto
 * dalla persona, la descrizione, il prompt.
 *
 * Vale anche per quello che c'era prima della 0.7.2: i parametri accanto ai
 * file li scrivevano già le schede, quindi novantaquattro immagini fatte ieri
 * hanno smesso di chiamarsi con un numero senza che nessuno rinominasse niente.
 */
function leggiTitolo(file: string): string | undefined {
  const meta = leggiMeta(file);
  const scritto =
    daLeggere(meta?.["titolo"]) ??
    daLeggere(meta?.["title"]) ??
    daLeggere(meta?.["testo"]) ??
    daLeggere(meta?.["descrizione"]) ??
    daLeggere(meta?.["prompt"]);
  return scritto ? unaRiga(scritto) : undefined;
}

export const libreria = new Libreria();

/**
 * Una copertina appena estratta fa aggiornare la galleria.
 *
 * `anteprime.ts` non conosce la libreria e non deve conoscerla — la importa lei
 * — quindi le si passa il filo da questa parte. Serve al caso nuovo della
 * 0.8.1: il fotogramma di un video adesso si scrive **accanto al file**, e chi
 * sta guardando la galleria in quel momento deve vederlo comparire.
 */
quandoCompareUnaCopertina(() => libreria.segnalaNovita());
