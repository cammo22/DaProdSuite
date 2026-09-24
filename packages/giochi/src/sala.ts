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
import type { Deposito } from "./deposito";
import { altezza, livelloDi, pescaPesata, scalino, type Caso } from "./regole";
import { rulliDi } from "./rulli";
import type { Conto, Grado, Partita, PezzoInGioco, Stacco, Tavolo } from "./tipi";

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
  deposito.muovi(chi, -gioco.ingresso);
  partitaDi(conto, adesso);
  deposito.salva();
  return { saldo: conto.saldo, ingresso: gioco.ingresso };
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
  giochi: { id: string; nome: string; riga: string; ingresso: number }[];
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
    giochi: Object.values(GIOCHI_SALA).map((g) => ({ id: g.id, nome: g.nome, riga: g.riga, ingresso: g.ingresso })),
  };
}
