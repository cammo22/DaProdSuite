/**
 * Il portafoglio di chi gioca (1.4.8).
 *
 * Chiesto da Cammo il 25 settembre 2026: «facciamo un portafoglio anche per i
 * player, per capire bene i loro andamenti: prendiamo esempio dalla repo
 * DaProdFinanza». Da li' vengono le tre cose che contano, nello stesso ordine:
 *
 * 1. **quanto hai**, in lire e in euro, e come e' andato negli ultimi trenta
 *    giorni (la linea del saldo, come il patrimonio di Finanza);
 * 2. **dove sono andate le lire**: entrate e uscite divise per cosa, come le
 *    categorie di spesa;
 * 3. **come ti va gioco per gioco**: messo, tornato, resa in percentuale, come
 *    le posizioni di un portafoglio titoli.
 *
 * Qui solo i conti, puri, su un conto letto: niente scrive.
 */

import { euroDaLire } from "./euro";
import { GIOCHI_SALA } from "./borsa";
import { livelloDi } from "./regole";
import type { Conto } from "./tipi";

export interface VocePortafoglio {
  perche: string;
  lire: number;
}

export interface PosizioneGioco {
  id: string;
  nome: string;
  messo: number;
  tornato: number;
  /** tornato / messo - 1, in percento. null se non ha messo niente. */
  resa: number | null;
  partite: number;
  finite: number;
  record: number | null;
  fettaDaProd: number;
}

export interface Portafoglio {
  saldo: number;
  euro: number;
  livello: number;
  /** Quanto manca al livello dopo, da 0 a 1. */
  versoIlProssimo: number;
  esperienza: number;
  /** Il saldo a fine giornata, gli ultimi trenta giorni che ci sono. */
  andamento: { giorno: string; saldo: number }[];
  /** Com'e' cambiato il saldo dal primo giorno dell'andamento. */
  variazione: number;
  entrate: VocePortafoglio[];
  uscite: VocePortafoglio[];
  giochi: PosizioneGioco[];
  movimenti: Conto["movimenti"];
  /** Tutta la sala: messo e tornato nei giochi d'arcade. */
  sala: { messo: number; tornato: number; resa: number | null };
}

/** Il perche' di un movimento, senza il nome del gioco: «ricarica», «incasso da». */
function categoria(perche: string): string {
  if (perche.startsWith("ricarica")) return "ricariche nei giochi";
  if (perche.startsWith("incasso da") || perche.startsWith("partita finita")) return "incassi dai giochi";
  return perche;
}

export function portafoglio(conto: Conto, perIlLivello: number, giorni = 90): Portafoglio {
  const livello = livelloDi(conto.esperienza, perIlLivello);
  // L'esperienza dentro il livello: la soglia sale di perIlLivello a ogni livello.
  let resto = Math.max(0, conto.esperienza);
  let soglia = perIlLivello;
  for (let l = 1; l < livello; l++) {
    resto -= soglia;
    soglia += perIlLivello;
  }
  const andamento = (conto.storico ?? []).slice(-giorni);
  const primo = andamento[0]?.saldo ?? conto.saldo;
  const somme = (segno: 1 | -1) => {
    const m = new Map<string, number>();
    for (const x of conto.movimenti ?? []) {
      if (Math.sign(x.lire) !== segno) continue;
      const k = categoria(x.perche);
      m.set(k, (m.get(k) ?? 0) + Math.abs(x.lire));
    }
    return [...m.entries()].map(([perche, lire]) => ({ perche, lire })).sort((a, b) => b.lire - a.lire);
  };
  const giochi = Object.values(GIOCHI_SALA).map((g) => {
    const c = conto.giochi?.[g.id];
    const messo = c?.messoTot ?? 0;
    const tornato = c?.presoTot ?? 0;
    return {
      id: g.id,
      nome: g.nome,
      messo,
      tornato,
      resa: messo > 0 ? Math.round((tornato / messo - 1) * 1000) / 10 : null,
      partite: c?.partite ?? 0,
      finite: c?.finite ?? 0,
      record: c?.record ?? null,
      fettaDaProd: c?.fettaTot ?? 0,
    };
  });
  const messo = giochi.reduce((s, g) => s + g.messo, 0);
  const tornato = giochi.reduce((s, g) => s + g.tornato, 0);
  return {
    saldo: conto.saldo,
    euro: euroDaLire(conto.saldo),
    livello,
    versoIlProssimo: soglia > 0 ? Math.max(0, Math.min(1, resto / soglia)) : 0,
    esperienza: conto.esperienza,
    andamento,
    variazione: conto.saldo - primo,
    entrate: somme(1),
    uscite: somme(-1),
    giochi,
    movimenti: (conto.movimenti ?? []).slice(0, 300),
    sala: { messo, tornato, resa: messo > 0 ? Math.round((tornato / messo - 1) * 1000) / 10 : null },
  };
}

/* ----------------------------------------- l'andamento della sala (1.4.9) */

/**
 * ⚠ **Come va la sala, per chi comanda.** Nuovo nella 1.4.9.
 *
 * Chiesto il 25 settembre 2026: «statistiche per admin per capire l'andamento
 * della sala giochi». Si legge dai movimenti di tutti i conti — gli ultimi
 * trecento a testa, che per una sala di casa sono settimane — e dalle casse
 * dei giochi, che contano da sempre.
 */
export interface GiornoSala {
  giorno: string;
  ricariche: number;
  incassi: number;
  studio: number;
  giocatori: number;
}

export interface AndamentoSala {
  giorni: GiornoSala[];
  giochi: (PosizioneGioco & { giocatori: number })[];
  totale: { saldi: number; giocatori: number; attivi7: number; ricariche: number; incassi: number; fette: number };
}

function giornoDi(ms: number): string {
  const d = new Date(ms);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function andamentoSala(conti: readonly Conto[], adesso = Date.now(), quantiGiorni = 14): AndamentoSala {
  const giorni: GiornoSala[] = [];
  const indice = new Map<string, { g: GiornoSala; chi: Set<string> }>();
  for (let i = quantiGiorni - 1; i >= 0; i--) {
    const g = { giorno: giornoDi(adesso - i * 86_400_000), ricariche: 0, incassi: 0, studio: 0, giocatori: 0 };
    giorni.push(g);
    indice.set(g.giorno, { g, chi: new Set() });
  }
  const settimana = adesso - 7 * 86_400_000;
  let attivi7 = 0;
  for (const c of conti) {
    let attivo = false;
    for (const m of c.movimenti ?? []) {
      if (m.quando >= settimana) attivo = true;
      const x = indice.get(giornoDi(m.quando));
      if (!x) continue;
      x.chi.add(c.chi);
      const p = m.perche;
      if (p.startsWith("ricarica")) x.g.ricariche += Math.abs(m.lire);
      else if (p.startsWith("incasso da") || p.startsWith("partita finita")) x.g.incassi += Math.abs(m.lire);
      else if (p.startsWith("Studio") && m.lire < 0) x.g.studio += -m.lire;
    }
    if (attivo) attivi7 += 1;
  }
  for (const x of indice.values()) x.g.giocatori = x.chi.size;
  const giochi = Object.values(GIOCHI_SALA).map((g) => {
    let messo = 0, tornato = 0, fetta = 0, partite = 0, finite = 0, giocatori = 0;
    let record: number | null = null;
    for (const c of conti) {
      const k = c.giochi?.[g.id];
      if (!k) continue;
      messo += k.messoTot; tornato += k.presoTot; fetta += k.fettaTot;
      partite += k.partite; finite += k.finite;
      if (k.messoTot > 0 || k.presoTot > 0) giocatori += 1;
      if (k.record && (record === null || k.record < record)) record = k.record;
    }
    return {
      id: g.id, nome: g.nome, messo, tornato,
      resa: messo > 0 ? Math.round((tornato / messo - 1) * 1000) / 10 : null,
      partite, finite, record, fettaDaProd: fetta, giocatori,
    };
  });
  return {
    giorni,
    giochi,
    totale: {
      saldi: conti.reduce((t, c) => t + c.saldo, 0),
      giocatori: conti.length,
      attivi7,
      ricariche: giorni.reduce((t, g) => t + g.ricariche, 0),
      incassi: giorni.reduce((t, g) => t + g.incassi, 0),
      fette: giochi.reduce((t, g) => t + g.fettaDaProd, 0),
    },
  };
}
