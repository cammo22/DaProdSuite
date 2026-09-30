/**
 * La Zecca 🏛️: i contenuti che la suite crea diventano pezzi unici numerati.
 *
 * Fase 2 del Big Update (`docs/ROADMAP-2.0.md`, 1.7.9). Tipo NFT, ma **finti e
 * dentro l'app**: niente blockchain, niente denaro reale. Un pezzo e' una
 * immagine, un brano o un video della libreria della suite che qualcuno ha
 * proposto e chi comanda ha **coniato**.
 *
 * ⚠ **Niente soldi veri, mai.** I pacchetti si aprono con le **monete DaProd**
 * (`moneta.ts`), che a loro volta si guadagnano solo giocando. Non c'e'
 * nessuna strada che porti un pezzo fuori dalla sala, ne' un prezzo in denaro.
 *
 * ## Com'e' fatto un pezzo
 *
 * - un **numero di serie** che non si riusa mai (`#0042`);
 * - una **rarita'**, dal comune al mitico, decisa da chi comanda al conio (o
 *   tirata a sorte);
 * - **chi l'ha creato** (il padrone del file in libreria) e **chi l'ha avuto
 *   prima**: la storia dei passaggi resta scritta, dal conio in poi;
 * - **di chi e'** adesso: di nessuno finche' sta in un pacchetto.
 *
 * ## Come si arriva ad averne uno
 *
 * 1. chi gioca **propone** una cosa sua (`proponi`); chi comanda la guarda e la
 *    **conia** (`coniaPezzo`) o la rifiuta, col perche';
 * 2. chi comanda mette un gruppo di pezzi in un **pacchetto** a prezzo in
 *    monete (`creaPacchettoZecca`): e' scarsita' vera, un pezzo e' in un pacchetto
 *    solo e non se ne fanno altri;
 * 3. chi gioca **apre** il pacchetto (`apriPacchettoZecca`): paga le monete, e i
 *    pezzi che escono — tirati a sorte, col peso della rarita' — sono suoi;
 * 4. un pezzo **passa di mano** col mercato (Fase 3) o con un regalo.
 *
 * Le **collezioni a tema** (`creaCollezione`) sono elenchi di pezzi: chi li ha
 * tutti prende un premio in monete, una volta sola.
 *
 * Funzioni che lavorano sul `Deposito`, come `sala.ts` e `gestione.ts`; il caso
 * si passa da fuori, cosi' si provano.
 */

import { NienteDaFare } from "./banco";
import type { Deposito } from "./deposito";
import type { Caso } from "./regole";

/* ------------------------------------------------------------- la rarita' */

export type RaritaZecca = "comune" | "non-comune" | "raro" | "epico" | "leggendario" | "mitico";

export interface DatiRarita {
  id: RaritaZecca;
  nome: string;
  /** Il peso con cui esce da un pacchetto: piu' e' alto, piu' esce. */
  peso: number;
  /** Quante monete vale, come riferimento (guida per il mercato). */
  valore: number;
  colore: string;
}

export const RARITA: readonly DatiRarita[] = [
  { id: "comune", nome: "Comune", peso: 50, valore: 1, colore: "#9fb3ad" },
  { id: "non-comune", nome: "Non comune", peso: 28, valore: 2, colore: "#3dff8a" },
  { id: "raro", nome: "Raro", peso: 14, valore: 5, colore: "#3ddbff" },
  { id: "epico", nome: "Epico", peso: 6, valore: 12, colore: "#b07cff" },
  { id: "leggendario", nome: "Leggendario", peso: 1.8, valore: 30, colore: "#ffb454" },
  { id: "mitico", nome: "Mitico", peso: 0.2, valore: 75, colore: "#ff5c8a" },
];

export function raritaDi(id: string): DatiRarita {
  return RARITA.find((r) => r.id === id) ?? RARITA[0]!;
}

/* --------------------------------------------------------------- i tipi */

export type TipoZecca = "immagine" | "brano" | "video" | "altro";

/** Un file della libreria della suite, come lo tiene la Zecca (il gioco non tiene file). */
export interface FileZecca {
  id: string;
  mime: string;
  url?: string;
}

/** Un passaggio di mano: da dove viene la storia di un pezzo. */
export interface PassaggioZecca {
  chi: string;
  quando: number;
  come: "conio" | "pacchetto" | "mercato" | "regalo" | "premio";
  /** Quante monete e' costato il passaggio, se e' costato. */
  monete?: number;
}

export interface PezzoZecca {
  id: string;
  /** Il numero di serie. Non si riusa mai. */
  numero: number;
  tipo: TipoZecca;
  titolo: string;
  file: FileZecca;
  copertina?: FileZecca;
  rarita: RaritaZecca;
  /** Chi l'ha creato: il padrone del file in libreria. */
  creatore: string;
  /** Chi comanda l'ha coniato. */
  coniatoDa: string;
  quando: number;
  /** Di chi e' adesso. Vuoto finche' sta in un pacchetto. */
  proprietario: string;
  /** Il pacchetto in cui sta, finche' non e' di nessuno. */
  pacchetto?: string;
  /** La collezione a tema a cui appartiene, se ce l'ha. */
  collezione?: string;
  /** Tutti i passaggi, dal conio a adesso. */
  storia: PassaggioZecca[];
}

export interface PropostaZecca {
  id: string;
  chi: string;
  file: FileZecca;
  copertina?: FileZecca;
  titolo: string;
  tipo: TipoZecca;
  quando: number;
  stato: "in-attesa" | "coniata" | "rifiutata";
  /** Il perche', se e' stata rifiutata. */
  motivo?: string;
  /** Il pezzo che ne e' nato. */
  pezzo?: string;
}

export interface PacchettoZecca {
  id: string;
  nome: string;
  /** Quante monete costa aprirlo. */
  prezzo: number;
  /** Quanti pezzi escono a ogni apertura (meno, se ne restano meno). */
  perApertura: number;
  /** Gli id dei pezzi ancora dentro, cioe' di nessuno. */
  pezzi: string[];
  /** Quanti pezzi c'erano all'inizio. */
  totali: number;
  aperture: number;
  quando: number;
  daAdmin: string;
}

export interface CollezioneZecca {
  id: string;
  nome: string;
  pezzi: string[];
  /** Le monete per chi li ha tutti. */
  premio: number;
  quando: number;
  /** Chi l'ha completata, e quando: il premio si prende una volta sola. */
  completata: Record<string, number>;
}

export interface StatoZecca {
  ultimoNumero: number;
  pezzi: PezzoZecca[];
  proposte: PropostaZecca[];
  pacchetti: PacchettoZecca[];
  collezioni: CollezioneZecca[];
}

export function zeccaNuova(): StatoZecca {
  return { ultimoNumero: 0, pezzi: [], proposte: [], pacchetti: [], collezioni: [] };
}

/** Riporta alla forma di adesso uno stato letto da un file (anche vuoto o storto). */
export function zeccaInRiga(letto: unknown): StatoZecca {
  const s = zeccaNuova();
  if (!letto || typeof letto !== "object") return s;
  const l = letto as Partial<StatoZecca>;
  const lista = <T>(x: unknown): T[] => (Array.isArray(x) ? (x.filter((v) => v && typeof v === "object") as T[]) : []);
  s.pezzi = lista<PezzoZecca>(l.pezzi).map((p) => ({ ...p, storia: Array.isArray(p.storia) ? p.storia : [], proprietario: p.proprietario ?? "" }));
  s.proposte = lista<PropostaZecca>(l.proposte);
  s.pacchetti = lista<PacchettoZecca>(l.pacchetti).map((p) => ({ ...p, pezzi: Array.isArray(p.pezzi) ? p.pezzi : [] }));
  s.collezioni = lista<CollezioneZecca>(l.collezioni).map((c) => ({ ...c, pezzi: Array.isArray(c.pezzi) ? c.pezzi : [], completata: c.completata && typeof c.completata === "object" ? c.completata : {} }));
  const max = s.pezzi.reduce((m, p) => Math.max(m, Number.isFinite(p.numero) ? p.numero : 0), 0);
  s.ultimoNumero = Math.max(Number.isFinite(l.ultimoNumero) ? Math.floor(l.ultimoNumero as number) : 0, max);
  return s;
}

/* ------------------------------------------------------------ attrezzi */

function pulisci(testo: unknown, max: number): string {
  return String(testo ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Il tipo di una cosa dalla sua «mime»: immagine, brano, video, o altro. */
export function tipoDaMime(mime: string): TipoZecca {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "immagine";
  if (m.startsWith("audio/")) return "brano";
  if (m.startsWith("video/")) return "video";
  return "altro";
}

function fileSano(f: unknown): FileZecca {
  const x = (f ?? {}) as Partial<FileZecca>;
  const id = pulisci(x.id, 300);
  if (!id) throw new NienteDaFare("Quale cosa? Manca il file.");
  return { id, mime: pulisci(x.mime, 80) || "application/octet-stream", ...(x.url ? { url: pulisci(x.url, 400) } : {}) };
}

function pezzo(s: StatoZecca, id: string): PezzoZecca {
  const p = s.pezzi.find((x) => x.id === id);
  if (!p) throw new NienteDaFare("Questo pezzo non c'e'.");
  return p;
}

const numeroScritto = (n: number): string => "#" + String(n).padStart(4, "0");
export { numeroScritto as numeroZecca };

/**
 * Tira una rarita' col peso di ognuna: serve al conio «a sorte» e basta. Nei
 * pacchetti il peso lo hanno i **pezzi**, secondo la loro rarita'.
 */
export function tiraRarita(caso: Caso): RaritaZecca {
  const totale = RARITA.reduce((t, r) => t + r.peso, 0);
  let x = caso() * totale;
  for (const r of RARITA) {
    x -= r.peso;
    if (x < 0) return r.id;
  }
  return "comune";
}

/* ------------------------------------------------------ proporre e coniare */

/** Chi gioca propone una cosa sua. La stessa cosa non si propone due volte mentre aspetta. */
export function proponi(deposito: Deposito, chi: string, file: unknown, titolo: unknown, copertina?: unknown): PropostaZecca {
  const s = deposito.statoZecca();
  const f = fileSano(file);
  if (s.pezzi.some((p) => p.file.id === f.id)) throw new NienteDaFare("Questa cosa e' gia' un pezzo della Zecca.");
  if (s.proposte.some((p) => p.stato === "in-attesa" && p.file.id === f.id)) {
    throw new NienteDaFare("Questa cosa aspetta gia' il si' di chi comanda.");
  }
  const t = pulisci(titolo, 80);
  if (!t) throw new NienteDaFare("Dai un nome alla cosa che proponi.");
  const proposta: PropostaZecca = {
    id: "q" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    chi,
    file: f,
    ...(copertina ? { copertina: fileSano(copertina) } : {}),
    titolo: t,
    tipo: tipoDaMime(f.mime),
    quando: Date.now(),
    stato: "in-attesa",
  };
  s.proposte.unshift(proposta);
  if (s.proposte.length > 300) s.proposte.length = 300;
  deposito.salva();
  return proposta;
}

export interface OpzioniConio {
  file: unknown;
  titolo: unknown;
  copertina?: unknown;
  /** Se manca, si tira a sorte. */
  rarita?: string;
  /** Il padrone del file, se non e' chi comanda. */
  creatore?: string;
  collezione?: string;
}

/** Chi comanda conia un pezzo: numero nuovo, rarita', e il primo passaggio. */
export function coniaPezzo(deposito: Deposito, admin: string, o: OpzioniConio, caso: Caso, adesso: number = Date.now()): PezzoZecca {
  const s = deposito.statoZecca();
  const f = fileSano(o.file);
  if (s.pezzi.some((p) => p.file.id === f.id)) throw new NienteDaFare("Questa cosa e' gia' un pezzo della Zecca.");
  const titolo = pulisci(o.titolo, 80);
  if (!titolo) throw new NienteDaFare("Dai un nome al pezzo.");
  let rarita: RaritaZecca;
  if (o.rarita && o.rarita !== "caso") {
    const r = RARITA.find((x) => x.id === o.rarita);
    if (!r) throw new NienteDaFare("Che rarita'? " + RARITA.map((x) => x.id).join(", ") + ".");
    rarita = r.id;
  } else {
    rarita = tiraRarita(caso);
  }
  if (o.collezione && !s.collezioni.some((c) => c.id === o.collezione)) throw new NienteDaFare("Questa collezione non c'e'.");
  s.ultimoNumero += 1;
  const nuovo: PezzoZecca = {
    id: "z" + s.ultimoNumero,
    numero: s.ultimoNumero,
    tipo: tipoDaMime(f.mime),
    titolo,
    file: f,
    ...(o.copertina ? { copertina: fileSano(o.copertina) } : {}),
    rarita,
    creatore: pulisci(o.creatore, 80) || admin,
    coniatoDa: admin,
    quando: adesso,
    proprietario: "",
    ...(o.collezione ? { collezione: o.collezione } : {}),
    storia: [{ chi: admin, quando: adesso, come: "conio" }],
  };
  s.pezzi.push(nuovo);
  if (o.collezione) s.collezioni.find((c) => c.id === o.collezione)!.pezzi.push(nuovo.id);
  deposito.salva();
  return nuovo;
}

/** Chi comanda da' il si' a una proposta: diventa un pezzo, con chi l'ha proposta come creatore. */
export function approvaProposta(deposito: Deposito, admin: string, id: string, rarita: string | undefined, caso: Caso, adesso: number = Date.now()): PezzoZecca {
  const s = deposito.statoZecca();
  const pr = s.proposte.find((p) => p.id === id);
  if (!pr) throw new NienteDaFare("Questa proposta non c'e' piu'.");
  if (pr.stato !== "in-attesa") throw new NienteDaFare("Questa proposta e' gia' stata decisa.");
  const p = coniaPezzo(deposito, admin, { file: pr.file, titolo: pr.titolo, copertina: pr.copertina, rarita, creatore: pr.chi }, caso, adesso);
  pr.stato = "coniata";
  pr.pezzo = p.id;
  deposito.salva();
  return p;
}

/** Chi comanda dice di no, e dice perche': chi l'ha proposta lo legge. */
export function rifiutaProposta(deposito: Deposito, id: string, motivo: unknown): PropostaZecca {
  const s = deposito.statoZecca();
  const pr = s.proposte.find((p) => p.id === id);
  if (!pr) throw new NienteDaFare("Questa proposta non c'e' piu'.");
  if (pr.stato !== "in-attesa") throw new NienteDaFare("Questa proposta e' gia' stata decisa.");
  const m = pulisci(motivo, 160);
  if (!m) throw new NienteDaFare("Scrivi il perche': chi l'ha proposta lo legge.");
  pr.stato = "rifiutata";
  pr.motivo = m;
  deposito.salva();
  return pr;
}

/* ------------------------------------------------------------- pacchetti */

/**
 * Chi comanda mette dei pezzi in un pacchetto, a un prezzo in monete.
 *
 * I pezzi devono essere **di nessuno** e **non gia' in un altro pacchetto**: un
 * pezzo sta in un posto solo. E' questa la scarsita' — non se ne fanno altri.
 */
export function creaPacchettoZecca(
  deposito: Deposito,
  admin: string,
  o: { nome: unknown; prezzo: unknown; perApertura: unknown; pezzi: unknown },
  adesso: number = Date.now(),
): PacchettoZecca {
  const s = deposito.statoZecca();
  const nome = pulisci(o.nome, 60);
  if (!nome) throw new NienteDaFare("Dai un nome al pacchetto.");
  const prezzo = Math.floor(Number(o.prezzo));
  if (!Number.isFinite(prezzo) || prezzo < 1 || prezzo > 100_000) throw new NienteDaFare("Quante monete costa? Da 1 a 100.000.");
  const per = Math.floor(Number(o.perApertura));
  if (!Number.isFinite(per) || per < 1 || per > 20) throw new NienteDaFare("Quanti pezzi escono a ogni apertura? Da 1 a 20.");
  const ids = Array.isArray(o.pezzi) ? [...new Set((o.pezzi as unknown[]).map((x) => String(x)))] : [];
  if (ids.length < 1) throw new NienteDaFare("Scegli almeno un pezzo.");
  for (const id of ids) {
    const p = pezzo(s, id);
    if (p.proprietario) throw new NienteDaFare(numeroScritto(p.numero) + " e' gia' di qualcuno.");
    if (p.pacchetto) throw new NienteDaFare(numeroScritto(p.numero) + " sta gia' in un pacchetto.");
  }
  const pacchetto: PacchettoZecca = {
    id: "k" + adesso.toString(36) + s.pacchetti.length,
    nome,
    prezzo,
    perApertura: per,
    pezzi: ids,
    totali: ids.length,
    aperture: 0,
    quando: adesso,
    daAdmin: admin,
  };
  for (const id of ids) pezzo(s, id).pacchetto = pacchetto.id;
  s.pacchetti.push(pacchetto);
  deposito.salva();
  return pacchetto;
}

/**
 * Una persona apre un pacchetto: paga le monete e i pezzi tirati a sorte sono
 * suoi. Il peso di ogni pezzo e' quello della sua rarita'.
 *
 * ⚠ **Si paga prima e si assegna dopo**, come alla slot: in mezzo si pesca. Le
 * monete escono in un colpo solo e i pezzi restano scritti sul pezzo, non sul
 * conto — un errore fra le due cose costa un pacchetto, non ne regala cento.
 */
export function apriPacchettoZecca(deposito: Deposito, chi: string, id: string, caso: Caso, adesso: number = Date.now()) {
  const s = deposito.statoZecca();
  const pk = s.pacchetti.find((p) => p.id === id);
  if (!pk) throw new NienteDaFare("Questo pacchetto non c'e'.");
  if (pk.pezzi.length === 0) throw new NienteDaFare("Questo pacchetto e' finito: non c'e' piu' niente dentro.");
  const monete = deposito.monete(chi);
  if (monete < pk.prezzo) {
    throw new NienteDaFare("Servono " + pk.prezzo + (pk.prezzo === 1 ? " moneta" : " monete") + " DaProd: ne hai " + monete + ".");
  }
  deposito.muoviMonete(chi, -pk.prezzo, "pacchetto Zecca: " + pk.nome, "zecca", false, adesso);

  const usciti: PezzoZecca[] = [];
  const n = Math.min(pk.perApertura, pk.pezzi.length);
  for (let i = 0; i < n; i++) {
    const pesi = pk.pezzi.map((pid) => raritaDi(pezzo(s, pid).rarita).peso);
    const totale = pesi.reduce((t, x) => t + x, 0);
    let x = caso() * totale;
    let dove = pk.pezzi.length - 1;
    for (let k = 0; k < pesi.length; k++) {
      x -= pesi[k]!;
      if (x < 0) {
        dove = k;
        break;
      }
    }
    const p = pezzo(s, pk.pezzi[dove]!);
    pk.pezzi.splice(dove, 1);
    delete p.pacchetto;
    p.proprietario = chi;
    p.storia.push({ chi, quando: adesso, come: "pacchetto", monete: Math.round(pk.prezzo / n) });
    usciti.push(p);
  }
  pk.aperture += 1;
  const collezioni = controllaCollezioni(deposito, chi, adesso);
  deposito.salva();
  return { pezzi: usciti, monete: deposito.monete(chi), restano: pk.pezzi.length, collezioni };
}

/* ------------------------------------------------------ passare di mano */

/**
 * Un pezzo passa da una persona a un'altra. Lo usano il regalo e, dalla Fase 3,
 * il mercato. Non muove monete: chi chiama le ha gia' mosse.
 *
 * Torna le collezioni che il passaggio ha completato a chi lo riceve.
 */
export function trasferisciPezzo(
  deposito: Deposito,
  id: string,
  da: string,
  a: string,
  come: "mercato" | "regalo",
  monete?: number,
  adesso: number = Date.now(),
) {
  const s = deposito.statoZecca();
  const p = pezzo(s, id);
  if (p.proprietario !== da) throw new NienteDaFare("Questo pezzo non e' tuo.");
  if (da === a) throw new NienteDaFare("E' gia' tuo.");
  p.proprietario = a;
  p.storia.push({ chi: a, quando: adesso, come, ...(monete ? { monete } : {}) });
  const collezioni = controllaCollezioni(deposito, a, adesso);
  deposito.salva();
  return { pezzo: p, collezioni };
}

/** Un regalo: il pezzo passa a un'altra persona, senza monete. */
export function regalaPezzo(deposito: Deposito, da: string, a: string, id: string) {
  if (!deposito.conti().some((c) => c.chi === a)) throw new NienteDaFare("Questa persona non ha un conto.");
  return trasferisciPezzo(deposito, id, da, a, "regalo");
}

/* ------------------------------------------------------------ collezioni */

/** Chi comanda mette insieme una collezione a tema, col suo premio in monete. */
export function creaCollezione(
  deposito: Deposito,
  o: { nome: unknown; premio: unknown; pezzi: unknown },
  adesso: number = Date.now(),
): CollezioneZecca {
  const s = deposito.statoZecca();
  const nome = pulisci(o.nome, 60);
  if (!nome) throw new NienteDaFare("Dai un nome alla collezione.");
  const premio = Math.floor(Number(o.premio));
  if (!Number.isFinite(premio) || premio < 0 || premio > 10_000) throw new NienteDaFare("Che premio in monete? Da 0 a 10.000.");
  const ids = Array.isArray(o.pezzi) ? [...new Set((o.pezzi as unknown[]).map((x) => String(x)))] : [];
  if (ids.length < 2) throw new NienteDaFare("Una collezione ha almeno due pezzi.");
  for (const id of ids) {
    const p = pezzo(s, id);
    if (p.collezione) throw new NienteDaFare(numeroScritto(p.numero) + " sta gia' in una collezione.");
  }
  const c: CollezioneZecca = { id: "c" + adesso.toString(36) + s.collezioni.length, nome, pezzi: ids, premio, quando: adesso, completata: {} };
  for (const id of ids) pezzo(s, id).collezione = c.id;
  s.collezioni.push(c);
  deposito.salva();
  return c;
}

/**
 * Guarda se una persona ha completato qualche collezione e, se si', paga il
 * premio **una volta sola**. Torna le collezioni completate adesso.
 *
 * Il premio entra come moneta guadagnata giocando (conta nel trofeo) ma **senza
 * passare dal tetto della settimana**: completare una collezione non si ripete.
 */
export function controllaCollezioni(deposito: Deposito, chi: string, adesso: number = Date.now()) {
  const s = deposito.statoZecca();
  const fatte: { id: string; nome: string; premio: number }[] = [];
  for (const c of s.collezioni) {
    if (c.completata[chi]) continue;
    if (c.pezzi.length < 2) continue;
    const tutti = c.pezzi.every((id) => s.pezzi.find((p) => p.id === id)?.proprietario === chi);
    if (!tutti) continue;
    c.completata[chi] = adesso;
    if (c.premio > 0) deposito.muoviMonete(chi, c.premio, "collezione completata: " + c.nome, "collezione", true, adesso);
    fatte.push({ id: c.id, nome: c.nome, premio: c.premio });
  }
  return fatte;
}

/* --------------------------------------------------------------- vetrine */

/** I pezzi di una persona, dal piu' recente. */
export function pezziDi(deposito: Deposito, chi: string): PezzoZecca[] {
  return deposito
    .statoZecca()
    .pezzi.filter((p) => p.proprietario === chi)
    .sort((a, b) => (b.storia[b.storia.length - 1]?.quando ?? 0) - (a.storia[a.storia.length - 1]?.quando ?? 0));
}

/** Quanti pezzi ci sono in tutto, di chi sono, e quanti aspettano in un pacchetto. */
export function contiZecca(deposito: Deposito) {
  const s = deposito.statoZecca();
  return {
    coniati: s.pezzi.length,
    diNessuno: s.pezzi.filter((p) => !p.proprietario).length,
    assegnati: s.pezzi.filter((p) => p.proprietario).length,
    perRarita: Object.fromEntries(RARITA.map((r) => [r.id, s.pezzi.filter((p) => p.rarita === r.id).length])),
  };
}
