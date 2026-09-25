/**
 * La partita e la sala d'arcade, sul conto vero.
 *
 * ⚠ Nuovo nella 1.4.0: vedi CONCETTI.md § 18. Le regole (quotazione, fetta,
 * cambi, tetti) sono funzioni pure in `borsa.ts`; qui c'e' chi le applica al
 * deposito, come fa `banco.ts` per la slot.
 */

import { NienteDaFare, mazzo, pezzoPerId } from "./banco";
import {
  CARTA_OGNI_MS,
  GIOCHI_SALA,
  MANO_MAX,
  daUnaCarta,
  fetta,
  giornoDi,
  listino,
  puntiAmmessi,
  quotazione,
  stacco,
  TETTO_STACCO_GIORNO,
  type IdGiocoSala,
  type Listino,
} from "./borsa";
import { vetrina, type VetrinaBanca } from "./banca";
import type { Deposito } from "./deposito";
import { altezza, livelloDi, pescaPesata, scalino, type Caso } from "./regole";
import { rulliDi } from "./rulli";
import type { CassaGioco, Conto, Grado, Partita, PezzoInGioco, Stacco, Tavolo } from "./tipi";
import { FETTA_DAPROD, LIRE_PER_EURO, RICARICA_MIN, TAGLI_EURO, TAGLI_LIRE, bonusFine, euroDaLire, incasso } from "./euro";

/** Il gioco, se esiste. Un id che non conosciamo e' un errore di chi chiama. */
function giocoDi(id: string) {
  const g = (GIOCHI_SALA as Record<string, (typeof GIOCHI_SALA)[IdGiocoSala]>)[id];
  if (!g) throw new NienteDaFare("Questo gioco non c'e' nella sala.");
  return g;
}

function partitaDi(conto: Conto, adesso: number): Partita {
  if (!conto.partita) conto.partita = { punti: 0, daQuando: adesso, perGioco: {} };
  return conto.partita;
}

/** I punti entrano nella partita, divisi per gioco. */
function aggiungi(conto: Conto, gioco: string, punti: number, adesso: number): Partita {
  const p = partitaDi(conto, adesso);
  if (punti <= 0) return p;
  p.punti += punti;
  p.perGioco[gioco] = (p.perGioco[gioco] ?? 0) + punti;
  return p;
}

function ritmoDi(conto: Conto, gioco: string, adesso: number) {
  if (!conto.ritmo) conto.ritmo = {};
  const minuto = Math.floor(adesso / 60_000);
  const giorno = giornoDi(adesso);
  let r = conto.ritmo[gioco];
  if (!r) r = conto.ritmo[gioco] = { minuto, punti: 0, carta: 0, giorno, puntiOggi: 0 };
  if (r.minuto !== minuto) {
    r.minuto = minuto;
    r.punti = 0;
  }
  if (r.giorno !== giorno) {
    r.giorno = giorno;
    r.puntiOggi = 0;
  }
  return r;
}

/* ------------------------------------------------------------ la sala ---- */

/** Entrare in un gioco d'arcade: si paga il gettone d'ingresso. */
export function entra(deposito: Deposito, chi: string, idGioco: string, adesso = Date.now()) {
  const gioco = giocoDi(idGioco);
  const conto = deposito.conto(chi);
  if (conto.saldo < gioco.ingresso) {
    throw new NienteDaFare("Per entrare servono " + gioco.ingresso + " lire, e non ci sono.");
  }
  if (gioco.ingresso > 0) deposito.muovi(chi, -gioco.ingresso, true, "ingresso a " + gioco.nome);
  partitaDi(conto, adesso);
  deposito.salva();
  return { saldo: conto.saldo, ingresso: gioco.ingresso };
}

/**
 * Ricaricare un gioco con quante lire si vuole (1.4.4).
 *
 * Chiesto da Cammo il 24 settembre 2026: «quando dobbiamo scambiare le lire
 * della suite alle lire nei giochi, clicchiamo sul tasto e si vede bene il
 * portafoglio, con la quantita' selezionabile e alcuni tagli rapidi». Prima la
 * ricarica era un gettone fisso d'ingresso. Il minimo resta il gettone: meno
 * di cosi' non vale il gesto. Quello che si spende brucia lire (Borsa).
 */
export function ricarica(deposito: Deposito, chi: string, idGioco: string, quante: number, adesso = Date.now()) {
  const gioco = giocoDi(idGioco);
  const conto = deposito.conto(chi);
  const lire = Math.floor(Number(quante) || 0);
  // 1.4.8: il minimo e' il taglio piu' piccolo, 20 centesimi (`euro.ts`).
  if (lire < RICARICA_MIN) throw new NienteDaFare("Si ricarica almeno con " + RICARICA_MIN + " lire (20 centesimi).");
  if (lire > conto.saldo) throw new NienteDaFare("In tasca ci sono " + conto.saldo + " lire: non bastano.");
  deposito.muovi(chi, -lire, true, "ricarica " + gioco.nome);
  const cassa = cassaDi(conto, gioco.id, adesso);
  if (cassa.messo === 0 && cassa.preso === 0) {
    cassa.inizio = adesso;
    cassa.partite += 1;
  }
  cassa.messo += lire;
  cassa.messoTot += lire;
  // Giocare fa salire di livello (1.4.8): un punto ogni venti lire messe.
  conto.esperienza += Math.floor(lire / XP_OGNI_LIRE_MESSE);
  deposito.salva();
  return { saldo: conto.saldo, lire, cassa };
}

/* ------------------------------------------------- la cassa di un gioco -- */

/** Quante lire messe fanno un punto d'esperienza (1.4.8). */
export const XP_OGNI_LIRE_MESSE = 20;
/** Quante lire incassate fanno un punto d'esperienza (1.4.8). */
export const XP_OGNI_LIRE_PRESE = 40;
/** Quanta esperienza da' una partita finita (Claw, Neon). */
export const XP_FINE = 150;

function cassaDi(conto: Conto, gioco: string, adesso: number): CassaGioco {
  const c = (conto.giochi ??= {});
  return (c[gioco] ??= { messo: 0, preso: 0, inizio: adesso, messoTot: 0, presoTot: 0, fettaTot: 0, partite: 0, finite: 0 });
}

/**
 * L'incasso di un gioco d'arcade (1.4.8): le lire che il gioco ha diventano
 * lire vere nel portafoglio, meno la fetta di DaProd. Vedi `euro.ts`.
 *
 * `grezzo` e' quello che il gioco dice di avere; `fine` vuol dire che la
 * partita e' finita (Claw, Neon): arriva il premio della velocita', la cassa
 * della partita si chiude e il gioco ricomincia da capo. Senza `fine` (il
 * Dozer, o chi smette prima) si incassa e basta.
 *
 * Torna `preso`: quante lire il gioco deve togliersi. Quello sopra il tetto
 * resta nel gioco: non si perde, si porta a casa ricaricando ancora.
 */
export function incassaGioco(
  deposito: Deposito,
  chi: string,
  idGioco: string,
  grezzo: number,
  opzioni: { fine?: boolean; chiudi?: boolean } = {},
  adesso = Date.now(),
) {
  const gioco = giocoDi(idGioco);
  const conto = deposito.conto(chi);
  const cassa = cassaDi(conto, gioco.id, adesso);
  const fine = Boolean(opzioni.fine) && gioco.siFinisce;
  const minuti = Math.max(0, (adesso - cassa.inizio) / 60_000);
  const conti = incasso({
    valore: gioco.valore(Number(grezzo) || 0, cassa.messo),
    messo: cassa.messo,
    giaPreso: cassa.preso,
    moltMax: gioco.moltMax,
    bonus: fine ? bonusFine(cassa.messo, minuti) : 0,
  });
  if (conti.preso + conti.bonus <= 0 && !fine && !opzioni.chiudi) {
    throw new NienteDaFare(
      cassa.messo <= 0
        ? "Prima si ricarica: si porta a casa al massimo " + gioco.moltMax + " volte quello che si mette."
        : "Non c'e' niente da incassare: il tetto di questa partita e' gia' preso.",
    );
  }
  if (conti.netto > 0) deposito.muovi(chi, conti.netto, true, (fine ? "partita finita a " : "incasso da ") + gioco.nome);
  // La fetta di DaProd va nella riserva della Banca: torna alla gente coi premi.
  if (conti.fetta > 0) deposito.versaFetta(conti.fetta);
  cassa.preso += conti.preso + conti.bonus;
  cassa.presoTot += conti.netto;
  cassa.fettaTot += conti.fetta;
  conto.esperienza += Math.floor(conti.netto / XP_OGNI_LIRE_PRESE) + (fine ? XP_FINE : 0);
  deposito.attivita(chi, conti.netto / 20 + (fine ? 50 : 0));
  const m = Math.round(minuti * 10) / 10;
  cassa.ultimo = { quando: adesso, netto: conti.netto, bonus: conti.bonus, fetta: conti.fetta, finita: fine, minuti: m };
  if (fine) {
    cassa.finite += 1;
    if (!cassa.record || m < cassa.record) cassa.record = m;
  }
  // Partita chiusa: la prossima ricarica ne apre una nuova.
  if (fine || opzioni.chiudi) {
    cassa.messo = 0;
    cassa.preso = 0;
    cassa.inizio = adesso;
  }
  deposito.salva();
  return { ...conti, finita: fine, minuti: m, saldo: conto.saldo, euro: euroDaLire(conti.netto), cassa };
}

/**
 * Chi comanda chiude la partita di qualcuno, senza staccarla (1.4.4).
 *
 * Per i casi storti — un gioco che ha dato punti per un difetto — non per
 * punire. I punti vanno via e basta: non diventano lire.
 */
export function azzeraPartita(deposito: Deposito, chi: string, adesso = Date.now()) {
  const conto = deposito.conto(chi);
  const via = conto.partita?.punti ?? 0;
  conto.partita = { punti: 0, daQuando: adesso, perGioco: {} };
  deposito.salva();
  return { via };
}

/**
 * Il gioco racconta quanto ha vinto coi suoi gettoni; il PC lo cambia in
 * punti, e ne fa entrare quanti ne ammettono i tetti.
 */
export function segnaPunti(deposito: Deposito, chi: string, idGioco: string, grezzo: number, adesso = Date.now()) {
  const gioco = giocoDi(idGioco);
  const conto = deposito.conto(chi);
  const r = ritmoDi(conto, gioco.id, adesso);
  const chiesti = gioco.punti(Number(grezzo) || 0);
  const entrati = puntiAmmessi(gioco, chiesti, r.punti, r.puntiOggi);
  r.punti += entrati;
  r.puntiOggi += entrati;
  const p = aggiungi(conto, gioco.id, entrati, adesso);
  // I punti fatti in sala contano per i premi della Banca (1.4.5): meta'.
  if (entrati > 0) deposito.attivita(chi, entrati / 2);
  deposito.salva();
  return { chiesti, entrati, partita: p.punti, fermati: chiesti - entrati };
}

/**
 * Una carta pescata dal PC, di almeno quel grado, da un rullo a caso di un
 * tavolo a caso. Si pesca pesando per quanto esce ogni grado, come la slot:
 * fra quelli sopra la soglia, i comuni restano piu' comuni.
 */
export function pescaCarta(deposito: Deposito, minimo: Grado, caso: Caso): PezzoInGioco | null {
  const tavoli: Tavolo[] = ["musica", "immagini"];
  for (let tentativo = 0; tentativo < 6; tentativo++) {
    const tavolo = tavoli[Math.floor(caso() * tavoli.length) % tavoli.length]!;
    const rulli = rulliDi(tavolo);
    const rullo = rulli[Math.floor(caso() * rulli.length) % rulli.length];
    if (!rullo) continue;
    const buoni = mazzo(deposito, rullo.id, tavolo).filter((p) => altezza(p.grado) >= altezza(minimo));
    if (buoni.length === 0) continue;
    const presa = pescaPesata(buoni, buoni.map((p) => scalino(p.grado).quantoEsce), caso);
    if (presa) return presa;
  }
  return null;
}

/**
 * E' successa una cosa grossa in un gioco: il PC decide se esce una carta.
 *
 * Una carta al minuto per gioco al massimo. Con la mano piena la carta non si
 * perde: diventa punti della partita, quanto vale il suo grado (§ 18.5).
 */
export function evento(deposito: Deposito, chi: string, idGioco: string, cosa: string, caso: Caso, adesso = Date.now()) {
  const gioco = giocoDi(idGioco);
  const conto = deposito.conto(chi);
  const r = ritmoDi(conto, gioco.id, adesso);
  const detto = gioco.eventi[cosa]?.detto ?? cosa;
  if (adesso - r.carta < CARTA_OGNI_MS) return { carta: null, detto, perche: "presto" as const };
  const minimo = daUnaCarta(gioco, cosa, caso);
  if (!minimo) return { carta: null, detto, perche: "niente" as const };
  const carta = pescaCarta(deposito, minimo, caso);
  if (!carta) return { carta: null, detto, perche: "niente" as const };
  r.carta = adesso;
  const mano = (conto.mano ??= []);
  if (mano.length >= MANO_MAX) {
    const invece = scalino(carta.grado).punti;
    aggiungi(conto, gioco.id, invece, adesso);
    deposito.salva();
    return { carta, detto, perche: "mano-piena" as const, puntiInvece: invece };
  }
  mano.push(carta.id);
  deposito.salva();
  return { carta, detto, perche: "presa" as const };
}

/** La carta si gioca: esce dalla mano e va sul suo rullo, gia' bloccata. */
export function giocaCarta(deposito: Deposito, chi: string, id: string): PezzoInGioco {
  const conto = deposito.conto(chi);
  const mano = conto.mano ?? [];
  const dove = mano.indexOf(id);
  if (dove < 0) throw new NienteDaFare("Questa carta non e' nella tua mano.");
  const pezzo = pezzoPerId(deposito, id);
  if (!pezzo) {
    // Un pezzo che non esiste piu' (chi comanda l'ha tolto dai rulli) si butta.
    mano.splice(dove, 1);
    deposito.salva();
    throw new NienteDaFare("Questo pezzo non c'e' piu' nei rulli: la carta e' andata.");
  }
  mano.splice(dove, 1);
  deposito.salva();
  return pezzo;
}

/* -------------------------------------------------------------- lo stacco */

/** Staccare: il punteggio diventa lire, alla quotazione di adesso. */
export function stacca(deposito: Deposito, chi: string, adesso = Date.now()): Stacco & { saldo: number } {
  const conto = deposito.conto(chi);
  const p = partitaDi(conto, adesso);
  if (p.punti <= 0) throw new NienteDaFare("Non c'e' niente da staccare: prima si gioca.");
  const oggi = giornoDi(adesso);
  if (!conto.staccatoOggi || conto.staccatoOggi.giorno !== oggi) conto.staccatoOggi = { giorno: oggi, lire: 0 };
  if (conto.staccatoOggi.lire >= TETTO_STACCO_GIORNO) {
    throw new NienteDaFare("Oggi hai gia' staccato il massimo: la partita resta aperta per domani.");
  }
  const imp = deposito.impostazioni();
  const livello = livelloDi(conto.esperienza, imp.perIlLivello);
  const quota = quotazione(deposito.borsa(), adesso);
  const mia = fetta(livello);
  const conto2 = stacco(p.punti, quota, mia, conto.staccatoOggi.lire);
  if (conto2.lire > 0) deposito.muovi(chi, conto2.lire);
  conto.staccatoOggi.lire += conto2.lire;
  const fatto: Stacco = {
    quando: adesso,
    punti: conto2.puntiUsati,
    quota,
    fetta: mia,
    lire: conto2.lire,
    avanzati: conto2.avanzati,
  };
  conto.ultimoStacco = fatto;
  conto.partita = { punti: conto2.avanzati, daQuando: adesso, perGioco: conto2.avanzati > 0 ? { avanzati: conto2.avanzati } : {} };
  deposito.salva();
  return { ...fatto, saldo: conto.saldo };
}

/* -------------------------------------------------------- cosa si guarda */

export interface StatoSala {
  partita: Partita;
  mano: PezzoInGioco[];
  fetta: number;
  livello: number;
  tettoRimasto: number;
  /** Quante lire darebbe la partita se si staccasse adesso. */
  staccando: number;
  borsa: Listino;
  ultimoStacco: Stacco | null;
  giochi: GiocoInSala[];
  /** Lire ed euro (1.4.8): il cambio, i tagli di ricarica, la fetta di DaProd. */
  euro: { lirePerEuro: number; tagli: { euro: number; lire: number }[]; ricaricaMin: number; fettaDaProd: number };
  /** La Banca DaProd (1.4.5): i tre cassetti, la mia parte, gli ultimi premi. */
  banca: VetrinaBanca;
  /** L'ultimo premio della Banca vinto: la pagina lo dice una volta. */
  premio: Conto["ultimoPremio"] | null;
}

export function statoSala(deposito: Deposito, chi: string, adesso = Date.now()): StatoSala {
  const conto = deposito.conto(chi);
  const imp = deposito.impostazioni();
  const livello = livelloDi(conto.esperienza, imp.perIlLivello);
  const oggi = giornoDi(adesso);
  const gia = conto.staccatoOggi && conto.staccatoOggi.giorno === oggi ? conto.staccatoOggi.lire : 0;
  const b = listino(deposito.borsa(), adesso);
  const p = conto.partita ?? { punti: 0, daQuando: adesso, perGioco: {} };
  const mia = fetta(livello);
  return {
    partita: p,
    mano: (conto.mano ?? []).map((id) => pezzoPerId(deposito, id)).filter((x): x is PezzoInGioco => Boolean(x)),
    fetta: mia,
    livello,
    tettoRimasto: Math.max(0, TETTO_STACCO_GIORNO - gia),
    staccando: stacco(p.punti, b.quota, mia, gia).lire,
    borsa: b,
    ultimoStacco: conto.ultimoStacco ?? null,
    giochi: Object.values(GIOCHI_SALA).map((g) => giocoInSala(conto, g, adesso)),
    euro: {
      lirePerEuro: LIRE_PER_EURO,
      tagli: TAGLI_EURO.map((e, i) => ({ euro: e, lire: TAGLI_LIRE[i]! })),
      ricaricaMin: RICARICA_MIN,
      fettaDaProd: FETTA_DAPROD,
    },
    banca: vetrina(deposito.statoBanca(), chi, adesso),
    premio: conto.ultimoPremio ?? null,
  };
}

/** Un gioco com'e' messo per chi guarda (1.4.8): le regole e la sua cassa. */
export interface GiocoInSala {
  id: string;
  nome: string;
  riga: string;
  ingresso: number;
  moltMax: number;
  siFinisce: boolean;
  fine?: string;
  /** La partita di adesso in quel gioco. */
  messo: number;
  preso: number;
  /** Quanto si puo' ancora portare a casa in questa partita. */
  tettoRimasto: number;
  /** Da quanti minuti e' cominciata. */
  minuti: number;
  /** Il premio della velocita' se si finisse adesso. */
  bonusSeFinisci: number;
  /** Da sempre. */
  messoTot: number;
  presoTot: number;
  partite: number;
  finite: number;
  record: number | null;
}

function giocoInSala(conto: Conto, g: (typeof GIOCHI_SALA)[IdGiocoSala], adesso: number): GiocoInSala {
  const c = conto.giochi?.[g.id];
  const messo = c?.messo ?? 0;
  const preso = c?.preso ?? 0;
  const minuti = c && messo > 0 ? Math.max(0, (adesso - c.inizio) / 60_000) : 0;
  return {
    id: g.id,
    nome: g.nome,
    riga: g.riga,
    ingresso: g.ingresso,
    moltMax: g.moltMax,
    siFinisce: g.siFinisce,
    fine: g.fine,
    messo,
    preso,
    tettoRimasto: Math.max(0, Math.floor(messo * g.moltMax) - preso),
    minuti: Math.round(minuti * 10) / 10,
    bonusSeFinisci: g.siFinisce ? bonusFine(messo, minuti) : 0,
    messoTot: c?.messoTot ?? 0,
    presoTot: c?.presoTot ?? 0,
    partite: c?.partite ?? 0,
    finite: c?.finite ?? 0,
    record: c?.record ?? null,
  };
}
