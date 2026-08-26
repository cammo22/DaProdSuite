/**
 * Gli stili, uno per persona, sul computer.
 *
 * **Cosa è stato chiesto, il 26 agosto 2026:**
 *
 * > «Aggiungiamo gli stili su Android, una nuova tab Stili dove gestire tutto e
 * > anche volendo condividere uno stile per farlo provare agli altri. Tenendo
 * > premuto sullo stile escono le opzioni: salva per salvarlo sul proprio
 * > profilo, modifica e salva che te lo fa modificare e salvare. Prendiamo
 * > tutti gli stili dalla suite: ogni utente deve avere i suoi, ma partono
 * > tutti con un set preimpostato. Facciamo una cartella per ogni utente in
 * > modo tale da tenere sempre i dati degli utenti sotto controllo.»
 *
 * ## Perché gli stili stanno sul computer e non nel telefono
 *
 * Perché uno stile è una cosa che si costruisce una volta e si usa per mesi.
 * Fino alla 0.7.6 vivevano nel `localStorage` di DaProdMusica: erano di **quel
 * browser**, non di quella persona. Cambiavi dispositivo e non c'erano più;
 * svuotavi la cronologia e non c'erano più. Adesso stanno accanto ai risultati,
 * nella cartella della persona, e si ritrovano da qualunque parte ci si
 * colleghi.
 *
 * ## Una cartella per persona, e perché conta
 *
 * `%LOCALAPPDATA%\\DaProdSuite\\persone\\<id>\\` — dentro ci sono gli stili, e
 * col tempo ci starà il resto. Non è ordine per l'ordine: è la risposta a
 * «tenere sempre i dati degli utenti sotto controllo». Chi ospita la macchina
 * deve poter aprire una cartella e vedere **cosa c'è di chi**, e togliere una
 * persona deve poter voler dire togliere una cartella.
 *
 * ## Il set di partenza si copia, non si condivide
 *
 * Ogni persona nasce con i ventiquattro stili di `@daprod/azioni`. Copiati, non
 * puntati: dal momento in cui uno è tuo, modificarlo non deve cambiarlo agli
 * altri. È la differenza fra «partiamo tutti dallo stesso posto» e «abbiamo
 * tutti la stessa roba», e la prima è quella che è stata chiesta.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type TipoStile, stiliDiPartenzaPer } from "@daprod/azioni";
import { DATA_ROOT } from "./paths";

/** Uno stile: un nome per una persona, e le parole per il modello. */
export interface Stile {
  /** Un id nostro: due persone possono chiamare uguale due stili diversi. */
  id: string;
  nome: string;
  /** Le parole che finiscono nella descrizione del brano. */
  testo: string;
  /**
   * Di che cosa è lo stile: un'immagine, un video, un brano.
   *
   * **Nuovo dalla 0.7.8**, chiesto il 26 agosto 2026: «gli stili devono essere
   * di tre tipi per immagini, video e musica, così li separiamo e ordiniamo per
   * bene». Chi ne ha uno salvato prima di oggi non ha questo campo, ed è
   * musica: era l'unico tipo che esisteva. Vedi `conTipo`.
   */
  tipo: TipoStile;
  /**
   * Da dove viene: `partenza` è uno dei ventiquattro, `mio` l'ha fatto la
   * persona, `preso` l'ha copiato da qualcun altro.
   *
   * Serve a due cose che si vedono: sapere quali si possono buttare senza
   * rimpianti, e scrivere «di Giulia» sotto a uno che ti è arrivato.
   */
  da: "partenza" | "mio" | "preso";
  /** Chi l'ha fatto, se è arrivato da un altro. */
  daNome?: string;
  quando: number;
  /**
   * Messo in mostra: le altre persone lo vedono e possono provarlo.
   *
   * È l'altra metà di «condividere uno stile per farlo provare agli altri»:
   * non si manda a qualcuno, si mette in vetrina e chi vuole se lo prende.
   */
  condiviso?: boolean;
}

/**
 * La cartella di una persona.
 *
 * L'id del dispositivo, ripulito: arriva dal gateway ed è nostro, ma un id che
 * finisce in un percorso senza controlli è il modo classico di uscire da una
 * cartella. Meglio due righe qui che fidarsi.
 */
export function cartellaPersona(chi: string): string {
  const pulito = chi.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "senza-nome";
  const dove = join(DATA_ROOT, "persone", pulito);
  mkdirSync(dove, { recursive: true });
  return dove;
}

function fileStili(chi: string): string {
  return join(cartellaPersona(chi), "stili.json");
}

/**
 * Quali set di partenza sono già stati consegnati a questa persona.
 *
 * Serve a una cosa sola, ma indispensabile: il giorno che si aggiunge un tipo
 * nuovo — come immagini e video nella 0.7.8 — chi c'era già deve riceverne il
 * set **una volta**. Senza questo segno, chi ne butta uno se lo ritroverebbe al
 * riavvio dopo; e senza dare il set a chi c'era, gli stili immagine sarebbero
 * solo di chi si collega da domani.
 */
function fileSetDati(chi: string): string {
  return join(cartellaPersona(chi), "stili-consegnati.json");
}

function setGiaDati(chi: string): TipoStile[] {
  try {
    const dentro = JSON.parse(readFileSync(fileSetDati(chi), "utf8")) as unknown;
    if (Array.isArray(dentro)) return dentro.filter((x): x is TipoStile => typeof x === "string");
  } catch {
    // Non c'è, o è illeggibile: vale come «niente è stato consegnato».
  }
  return [];
}

function segnaSetDato(chi: string, tipi: TipoStile[]): void {
  try {
    writeFileSync(fileSetDati(chi), `${JSON.stringify(tipi)}
`, "utf8");
  } catch {
    // Disco non scrivibile: al giro dopo si riproverà, e nel frattempo gli
    // stili ci sono lo stesso.
  }
}

/** Uno stile vecchio, senza tipo, è musica: era l'unico che esistesse. */
function conTipo(s: Stile): Stile {
  if (s.tipo === "immagine" || s.tipo === "video" || s.tipo === "musica") return s;
  return { ...s, tipo: "musica" };
}

/**
 * Gli stili di una persona. Alla prima volta, quelli di partenza.
 *
 * La copia iniziale si scrive **subito**: se restasse in memoria, il primo
 * riavvio della suite la rifarebbe da capo e chi ne avesse buttato uno se lo
 * ritroverebbe.
 */
export function stiliDi(chi: string, tipo?: TipoStile): Stile[] {
  const tutti = leggiTutti(chi);
  return tipo ? tutti.filter((s) => s.tipo === tipo) : tutti;
}

function leggiTutti(chi: string): Stile[] {
  const file = fileStili(chi);
  let dentro: Stile[] = [];
  let cera = false;
  if (existsSync(file)) {
    try {
      const letto = JSON.parse(readFileSync(file, "utf8")) as unknown;
      if (Array.isArray(letto)) {
        dentro = letto.filter(eUnoStile).map(conTipo);
        cera = true;
      }
    } catch {
      // File illeggibile: si riparte da quelli di partenza invece di lasciare
      // una persona senza niente.
    }
  }

  /**
   * Quali set questa persona ha già ricevuto.
   *
   * ⚠ **La riga che conta è quella su `musica`**, ed è il difetto della prima
   * 0.7.8: chi aveva un `stili.json` scritto dalla 0.7.7 aveva già i
   * ventiquattro generi, ma il segno di consegna nasce con la 0.7.8 e quel file
   * non ce l'aveva. Il risultato era che glieli riconsegnavamo tutti — e in
   * Musica comparivano **due volte**, «Neomelodico trap», «Neomelodico trap».
   *
   * Un file che c'era già vuol dire, da solo, che la musica è stata consegnata:
   * era l'unico tipo che esistesse prima di oggi.
   */
  const segnati = cera ? setGiaDati(chi) : [];
  const gia = cera && !segnati.length ? (["musica"] as TipoStile[]) : segnati;
  const daDare = (["immagine", "video", "musica"] as TipoStile[]).filter((t) => !gia.includes(t));

  // E si toglie di mezzo quello che è già arrivato doppio a chi ha aperto la
  // prima 0.7.8: senza, l'elenco resta sporco anche dopo la correzione.
  const puliti = senzaDoppioni(dentro);
  if (!daDare.length) {
    if (puliti.length !== dentro.length) scrivi(chi, puliti);
    if (!segnati.length) segnaSetDato(chi, gia);
    return puliti;
  }

  const arrivati = puliti.concat(daDare.flatMap((t) => quelliDiPartenza(t)));
  scrivi(chi, arrivati);
  segnaSetDato(chi, gia.concat(daDare));
  return arrivati;
}

/**
 * Via i doppioni: stesso tipo e stesso nome, resta il primo.
 *
 * Il primo e non l'ultimo, apposta: se una persona aveva modificato «Ora
 * dorata» e poi ne è arrivata una copia di partenza, quella che vale è la sua.
 */
function senzaDoppioni(stili: Stile[]): Stile[] {
  const visti = new Set<string>();
  const buoni: Stile[] = [];
  for (const s of stili) {
    const chiave = `${s.tipo}|${s.nome.toLocaleLowerCase("it")}`;
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    buoni.push(s);
  }
  return buoni;
}

function quelliDiPartenza(tipo: TipoStile): Stile[] {
  const adesso = Date.now();
  return Object.entries(stiliDiPartenzaPer(tipo)).map(([nome, testo], i) => ({
    id: `${tipo.slice(0, 3)}${i + 1}`,
    nome,
    testo,
    tipo,
    da: "partenza" as const,
    quando: adesso,
  }));
}

function eUnoStile(x: unknown): x is Stile {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Stile;
  return typeof s.id === "string" && typeof s.nome === "string" && typeof s.testo === "string";
}

function scrivi(chi: string, stili: Stile[]): void {
  try {
    writeFileSync(fileStili(chi), `${JSON.stringify(stili, null, 1)}\n`, "utf8");
  } catch {
    // Disco pieno o cartella non scrivibile: la sessione continua con quello
    // che c'è in memoria, e chi ha appena salvato lo scoprirà riaprendo.
  }
}

/**
 * Salva uno stile: nuovo, o al posto di uno che c'era.
 *
 * Il nome è quello che si legge, quindi **due stili con lo stesso nome non
 * hanno senso**: il secondo sostituisce il primo. È anche quello che ci si
 * aspetta premendo «modifica e salva» senza cambiare il nome.
 */
export function salvaStile(
  chi: string,
  dati: {
    id?: string;
    nome: string;
    testo: string;
    tipo?: TipoStile;
    da?: Stile["da"];
    daNome?: string;
  },
): Stile | null {
  const nome = dati.nome.trim().slice(0, 60);
  const testo = dati.testo.trim().slice(0, 2000);
  if (!nome || !testo) return null;

  const miei = leggiTutti(chi);
  // Modificando uno che c'è già, il tipo è il suo: non lo si cambia per sbaglio
  // perché chi ha chiamato non l'ha detto.
  const tipo: TipoStile =
    dati.tipo ?? (dati.id ? miei.find((s) => s.id === dati.id)?.tipo : undefined) ?? "musica";
  // Due stili con lo stesso nome ma di tipo diverso sono due cose diverse:
  // «Ora dorata» ha senso per una foto e per un video, e non si sovrascrivono.
  const stessoNome = miei.find(
    (s) =>
      s.id !== dati.id &&
      s.tipo === tipo &&
      s.nome.toLocaleLowerCase("it") === nome.toLocaleLowerCase("it"),
  );
  const daCambiare = miei.find((s) => s.id === dati.id) ?? stessoNome;

  if (daCambiare) {
    daCambiare.nome = nome;
    daCambiare.testo = testo;
    // Uno di partenza che viene modificato smette di essere di partenza: è
    // tuo, e il giorno che aggiungiamo stili nuovi non deve tornare com'era.
    if (daCambiare.da === "partenza") daCambiare.da = "mio";
    if (dati.daNome) daCambiare.daNome = dati.daNome;
    daCambiare.quando = Date.now();
    scrivi(chi, miei);
    return daCambiare;
  }

  const nuovo: Stile = {
    id: `s${Date.now().toString(36)}`,
    nome,
    testo,
    tipo,
    da: dati.da ?? "mio",
    daNome: dati.daNome,
    quando: Date.now(),
  };
  miei.push(nuovo);
  scrivi(chi, miei);
  return nuovo;
}

/** Butta uno stile. Torna vero se c'era. */
export function togliStile(chi: string, id: string): boolean {
  const miei = leggiTutti(chi);
  const restano = miei.filter((s) => s.id !== id);
  if (restano.length === miei.length) return false;
  scrivi(chi, restano);
  return true;
}

/** Mette uno stile in vetrina, o lo toglie. */
export function condividiStile(chi: string, id: string, condiviso: boolean): boolean {
  const miei = leggiTutti(chi);
  const quale = miei.find((s) => s.id === id);
  if (!quale) return false;
  quale.condiviso = condiviso || undefined;
  scrivi(chi, miei);
  return true;
}

/**
 * Gli stili che gli altri hanno messo in vetrina.
 *
 * Si guardano tutte le cartelle delle persone: sono poche — una per chi si è
 * collegato — e leggere qualche file JSON costa meno di tenere un secondo
 * elenco allineato. I propri non compaiono: sono già nella propria lista.
 */
export function stiliInVetrina(
  tranne: string,
  nomiDi: (id: string) => string,
): (Stile & { chi: string; chiNome: string })[] {
  const radice = join(DATA_ROOT, "persone");
  if (!existsSync(radice)) return [];

  const fuori: (Stile & { chi: string; chiNome: string })[] = [];
  let cartelle: string[];
  try {
    cartelle = readdirSync(radice, { withFileTypes: true })
      .filter((v) => v.isDirectory())
      .map((v) => v.name);
  } catch {
    return [];
  }

  for (const cartella of cartelle) {
    if (cartella === tranne) continue;
    try {
      const file = join(radice, cartella, "stili.json");
      if (!existsSync(file)) continue;
      const dentro = JSON.parse(readFileSync(file, "utf8")) as unknown;
      if (!Array.isArray(dentro)) continue;
      for (const s of dentro.filter(eUnoStile).map(conTipo)) {
        if (!s.condiviso) continue;
        fuori.push({ ...s, chi: cartella, chiNome: nomiDi(cartella) });
      }
    } catch {
      // Una cartella illeggibile non deve nascondere le altre.
    }
  }
  return fuori.sort((a, b) => b.quando - a.quando);
}

/**
 * Butta la cartella di una persona.
 *
 * La chiama chi revoca un collegamento: «tenere sempre i dati degli utenti
 * sotto controllo» vuol dire anche poterli togliere davvero, e non lasciare in
 * giro le cartelle di chi non c'è più.
 *
 * ⚠ **Non tocca i risultati**: quelli stanno in `output`, sono file veri e
 * qualcuno potrebbe volerli ancora. Qui se ne vanno gli stili e le preferenze.
 */
export function buttaLaCartella(chi: string): void {
  try {
    rmSync(cartellaPersona(chi), { recursive: true, force: true });
  } catch {
    // Cartella aperta da qualcun altro: resterà lì, e non è un guaio.
  }
}
