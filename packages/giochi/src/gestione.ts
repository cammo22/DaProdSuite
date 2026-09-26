/**
 * La Banca DaProd dalla parte di chi comanda: vedere tutti i soldi della sala
 * e rimetterli a posto quando qualcosa va storto (1.5.1).
 *
 * Chiesto il 26 settembre 2026: «una banca DaProd dove poter gestire tutta la
 * sala giochi … nel gestire banca DaProd, solo per admin, si possono risolvere
 * tutti i problemi della moneta, per poter risolvere situazioni strane in caso
 * di bug».
 *
 * Prima i gesti erano sparsi: «manda lire» e «azzera» nei Giocatori, la
 * riserva nelle Casse, e per una partita rimasta aperta con dentro dei soldi
 * non c'era niente. Qui ci sono tutti, uno accanto all'altro, e **ognuno resta
 * scritto nel registro** con chi l'ha fatto: sono i gesti piu' grossi del
 * gioco, e non devono passare in silenzio.
 *
 * Le correzioni non sono operazioni di mercato: la Borsa non le vede
 * (`muovi(..., false)`), come l'azzeramento di sempre.
 */

import { NienteDaFare } from "./banco";
import { GIOCHI_SALA } from "./borsa";
import type { Deposito } from "./deposito";
import { euroDaLire, type RegoleSoldi } from "./euro";
import { livelloDi } from "./regole";
import type { Conto, IncassoInControllo, Movimento, VoceRegistro } from "./tipi";

/** Com'e' messa una persona, per chi comanda. */
export interface ContoInBanca {
  chi: string;
  saldo: number;
  livello: number;
  livelloPagato: number;
  /** Le partite aperte, gioco per gioco: quanto c'e' dentro e da quando. */
  aperte: { gioco: string; nome: string; messo: number; inizio: number }[];
  /** Soldi messi e presi dai giochi, da sempre. */
  messoGiochi: number;
  presoGiochi: number;
  inControllo: IncassoInControllo[];
  movimenti: Movimento[];
  /** Qualcosa non torna: numeri storti trovati leggendo. */
  guasti: string[];
}

export interface Gestione {
  /** Tutte le lire nei portafogli. */
  circolante: number;
  /** Tutte le lire dentro partite aperte. */
  neiGiochi: number;
  /** Quanti incassi aspettano, e quanto valgono. */
  daControllare: number;
  daControllareLire: number;
  banca: { riserva: number; fette: number; premiFine: number; entrate: number; cassetti: Record<string, number> };
  conti: ContoInBanca[];
  regole: RegoleSoldi;
  registro: VoceRegistro[];
}

/** I numeri di un conto che non tornano: saldo storto, partite coi numeri rotti. */
function guastiDi(c: Conto): string[] {
  const g: string[] = [];
  if (!Number.isFinite(c.saldo) || c.saldo < 0 || Math.round(c.saldo) !== c.saldo) g.push("saldo storto (" + String(c.saldo) + ")");
  if (!Number.isFinite(c.esperienza) || c.esperienza < 0) g.push("esperienza storta");
  for (const [id, cassa] of Object.entries(c.giochi ?? {})) {
    for (const k of ["messo", "preso", "messoTot", "presoTot", "fettaTot"] as const) {
      const v = cassa[k];
      if (!Number.isFinite(v) || v < 0) g.push(id + ": " + k + " storto");
    }
    if (!Number.isFinite(cassa.inizio)) g.push(id + ": inizio storto");
  }
  return g;
}

function nomeGioco(id: string): string {
  return (GIOCHI_SALA as Record<string, { nome: string }>)[id]?.nome ?? id;
}

export function gestione(deposito: Deposito): Gestione {
  const imp = deposito.impostazioni();
  const conti = deposito.conti().map((c): ContoInBanca => {
    const giochi = Object.entries(c.giochi ?? {});
    return {
      chi: c.chi,
      saldo: c.saldo,
      livello: livelloDi(c.esperienza, imp.perIlLivello),
      livelloPagato: c.livelloPagato ?? 1,
      aperte: giochi
        .filter(([, g]) => g.messo > 0)
        .map(([id, g]) => ({ gioco: id, nome: nomeGioco(id), messo: g.messo, inizio: g.inizio })),
      messoGiochi: giochi.reduce((t, [, g]) => t + (g.messoTot || 0), 0),
      presoGiochi: giochi.reduce((t, [, g]) => t + (g.presoTot || 0), 0),
      inControllo: c.inControllo ?? [],
      movimenti: (c.movimenti ?? []).slice(0, 25),
      guasti: guastiDi(c),
    };
  });
  const b = deposito.statoBanca();
  const fermi = conti.flatMap((c) => c.inControllo);
  return {
    circolante: conti.reduce((t, c) => t + (Number.isFinite(c.saldo) ? c.saldo : 0), 0),
    neiGiochi: conti.reduce((t, c) => t + c.aperte.reduce((s, a) => s + a.messo, 0), 0),
    daControllare: fermi.length,
    daControllareLire: fermi.reduce((t, f) => t + f.netto, 0),
    banca: {
      riserva: b.riserva,
      fette: b.fette ?? 0,
      premiFine: b.premiFine ?? 0,
      entrate: b.entrate,
      cassetti: Object.fromEntries(Object.entries(b.cassetti).map(([k, v]) => [k, v.lire])),
    },
    conti,
    regole: deposito.regoleSoldi(),
    registro: deposito.registro().slice(0, 60),
  };
}

/* --------------------------------------------------------- i gesti */

function contoEsistente(deposito: Deposito, chi: string): Conto {
  const c = deposito.conti().find((x) => x.chi === chi);
  if (!c) throw new NienteDaFare("Questa persona non ha un conto.");
  return c;
}

function perche(detto: unknown, altrimenti: string): string {
  const s = String(detto ?? "").trim().slice(0, 120);
  return s || altrimenti;
}

/**
 * Il saldo di qualcuno: **metterlo a un numero preciso** o **spostarlo di un
 * tanto**. E' il gesto che ripara quasi tutto: un incasso pagato due volte, un
 * gioco che ha mangiato una ricarica, un saldo diventato un numero storto.
 */
export function correggiSaldo(
  deposito: Deposito,
  admin: string,
  chi: string,
  opzioni: { imposta?: number; muovi?: number; perche?: string },
): Conto {
  const c = contoEsistente(deposito, chi);
  const prima = Number.isFinite(c.saldo) ? Math.max(0, Math.round(c.saldo)) : 0;
  // Un saldo storto (NaN, negativo, con la virgola) si rimette dritto prima di tutto.
  if (prima !== c.saldo) c.saldo = prima;
  let delta: number;
  if (opzioni.imposta !== undefined) {
    const v = Math.round(Number(opzioni.imposta));
    if (!Number.isFinite(v) || v < 0 || v > 1e14) throw new NienteDaFare("A quanto? Da zero in su.");
    delta = v - prima;
  } else {
    delta = Math.round(Number(opzioni.muovi));
    if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1e14) throw new NienteDaFare("Di quanto? Un numero diverso da zero.");
  }
  const detto = perche(opzioni.perche, "correzione della Banca");
  if (delta !== 0) deposito.muovi(chi, delta, false, "Banca DaProd: " + detto);
  deposito.segnaNelRegistro({ quando: Date.now(), da: admin, chi, cosa: (opzioni.imposta !== undefined ? "saldo messo a " + c.saldo : "saldo mosso") + " · " + detto, lire: delta });
  return c;
}

/**
 * Una partita rimasta aperta con dentro dei soldi: **rimborsarla** (le lire
 * messe tornano nel portafoglio) o **chiuderla e basta**. Serve quando un
 * gioco si e' rotto a meta', o quando qualcuno ha chiuso l'app mentre
 * incassava.
 */
export function chiudiPartitaDi(deposito: Deposito, admin: string, chi: string, gioco: string, rimborsa: boolean) {
  const c = contoEsistente(deposito, chi);
  const cassa = c.giochi?.[gioco];
  if (!cassa || !(cassa.messo > 0)) throw new NienteDaFare("In " + nomeGioco(gioco) + " non c'e' una partita aperta.");
  const messo = Math.max(0, Math.round(cassa.messo) || 0);
  if (rimborsa && messo > 0) deposito.muovi(chi, messo, false, "Banca DaProd: rimborso della partita a " + nomeGioco(gioco));
  cassa.messo = 0;
  cassa.preso = 0;
  cassa.inizio = Date.now();
  deposito.segnaNelRegistro({
    quando: Date.now(),
    da: admin,
    chi,
    cosa: (rimborsa ? "rimborsata" : "chiusa") + " la partita a " + nomeGioco(gioco),
    lire: rimborsa ? messo : 0,
  });
  deposito.salva();
  return { messo, rimborsata: rimborsa, saldo: c.saldo };
}

/**
 * Annullare un movimento: si fa il movimento contrario, e il registro lo dice.
 * Si riconosce dal momento in cui e' successo (`quando`) e da quanto era: due
 * numeri insieme, perche' un tocco su una riga vecchia non annulli quella
 * sbagliata.
 */
export function annullaMovimento(deposito: Deposito, admin: string, chi: string, quando: number, lire: number) {
  const c = contoEsistente(deposito, chi);
  const m = (c.movimenti ?? []).find((x) => x.quando === quando && x.lire === lire);
  if (!m) throw new NienteDaFare("Questo movimento non c'e' piu' nel libro.");
  if (/^annullato:/.test(m.perche)) throw new NienteDaFare("E' gia' un annullamento.");
  if ((m as Movimento & { annullato?: boolean }).annullato) throw new NienteDaFare("Questo movimento e' gia' stato annullato.");
  deposito.muovi(chi, -m.lire, false, "annullato: " + m.perche);
  (m as Movimento & { annullato?: boolean }).annullato = true;
  deposito.segnaNelRegistro({ quando: Date.now(), da: admin, chi, cosa: "annullato «" + m.perche + "»", lire: -m.lire });
  deposito.salva();
  return { saldo: c.saldo };
}

/**
 * Un incasso fermo in controllo: **pagarlo** tutto, **rimborsare** solo quello
 * che era stato messo, o **rifiutarlo**.
 */
export function decidiControllo(deposito: Deposito, admin: string, chi: string, id: string, esito: "paga" | "rimborsa" | "rifiuta") {
  const c = contoEsistente(deposito, chi);
  const lista = c.inControllo ?? [];
  const dove = lista.findIndex((x) => x.id === id);
  if (dove < 0) throw new NienteDaFare("Questo incasso non e' piu' in controllo.");
  const f = lista[dove]!;
  lista.splice(dove, 1);
  const nome = nomeGioco(f.gioco);
  let lire = 0;
  if (esito === "paga") {
    lire = f.netto;
    deposito.muovi(chi, f.netto, true, "incasso da " + nome + " (controllato)");
    if (f.fetta > 0) deposito.versaFetta(f.fetta);
    const cassa = c.giochi?.[f.gioco];
    if (cassa) {
      cassa.presoTot += f.netto;
      cassa.fettaTot += f.fetta;
    }
  } else if (esito === "rimborsa") {
    lire = f.messo;
    if (f.messo > 0) deposito.muovi(chi, f.messo, false, "rimborso della partita a " + nome + " (controllata)");
  }
  deposito.segnaNelRegistro({
    quando: Date.now(),
    da: admin,
    chi,
    cosa: (esito === "paga" ? "pagato" : esito === "rimborsa" ? "rimborsato il messo di" : "rifiutato") + " l'incasso da " + nome + " (" + euroDaLire(f.netto) + " €)",
    lire,
  });
  deposito.salva();
  return { esito, lire, saldo: c.saldo };
}

/** Rimettere a zero i premi dei livelli presi: si possono riprendere. */
export function rimettiPremiLivelli(deposito: Deposito, admin: string, chi: string, livello: number) {
  const c = contoEsistente(deposito, chi);
  const n = Math.max(1, Math.floor(Number(livello) || 1));
  c.livelloPagato = n;
  deposito.segnaNelRegistro({ quando: Date.now(), da: admin, chi, cosa: "premi dei livelli rimessi da " + n });
  deposito.salva();
  return { livelloPagato: n };
}

/**
 * **Ripara tutto**: passa ogni conto e rimette dritti i numeri storti — saldi
 * negativi o non numeri, casse coi numeri rotti, incassi in controllo senza
 * gioco. Non tocca niente che torni: e' la chiave inglese, non il martello.
 */
export function riparaTutto(deposito: Deposito, admin: string) {
  const fatti: string[] = [];
  for (const c of deposito.conti()) {
    if (!Number.isFinite(c.saldo) || c.saldo < 0 || Math.round(c.saldo) !== c.saldo) {
      const prima = c.saldo;
      c.saldo = Number.isFinite(c.saldo) ? Math.max(0, Math.round(c.saldo)) : 0;
      fatti.push(c.chi + ": saldo " + String(prima) + " → " + c.saldo);
    }
    if (!Number.isFinite(c.esperienza) || c.esperienza < 0) {
      c.esperienza = 0;
      fatti.push(c.chi + ": esperienza rimessa a zero");
    }
    for (const [id, cassa] of Object.entries(c.giochi ?? {})) {
      for (const k of ["messo", "preso", "messoTot", "presoTot", "fettaTot", "partite", "finite"] as const) {
        const v = cassa[k];
        if (!Number.isFinite(v) || v < 0) {
          cassa[k] = 0;
          fatti.push(c.chi + ": " + id + "." + k + " rimesso a zero");
        }
      }
      if (!Number.isFinite(cassa.inizio)) {
        cassa.inizio = Date.now();
        fatti.push(c.chi + ": " + id + ".inizio rimesso");
      }
    }
    if (c.inControllo) {
      const prima = c.inControllo.length;
      c.inControllo = c.inControllo.filter((f) => f && typeof f.id === "string" && Number.isFinite(f.netto) && f.netto >= 0);
      if (c.inControllo.length !== prima) fatti.push(c.chi + ": " + (prima - c.inControllo.length) + " incassi in controllo rotti tolti");
    }
  }
  const b = deposito.statoBanca();
  if (!Number.isFinite(b.riserva) || b.riserva < 0) {
    b.riserva = 0;
    fatti.push("Banca: riserva rimessa a zero");
  }
  deposito.segnaNelRegistro({ quando: Date.now(), da: admin, cosa: fatti.length ? "riparati " + fatti.length + " numeri" : "controllo: tutto a posto" });
  deposito.salva();
  return { fatti };
}

/** Le regole dei soldi, cambiate da chi comanda. */
export function cambiaRegole(deposito: Deposito, admin: string, cambi: Partial<RegoleSoldi>) {
  const prima = deposito.regoleSoldi();
  const dopo = deposito.cambiaRegoleSoldi(cambi);
  const diversi = (Object.keys(dopo) as (keyof RegoleSoldi)[]).filter((k) => dopo[k] !== prima[k]);
  if (diversi.length) {
    deposito.segnaNelRegistro({ quando: Date.now(), da: admin, cosa: "regole: " + diversi.map((k) => k + " " + prima[k] + " → " + dopo[k]).join(", ") });
  }
  return dopo;
}
