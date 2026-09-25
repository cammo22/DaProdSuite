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

export function portafoglio(conto: Conto, perIlLivello: number, giorni = 30): Portafoglio {
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
    movimenti: (conto.movimenti ?? []).slice(0, 20),
    sala: { messo, tornato, resa: messo > 0 ? Math.round((tornato / messo - 1) * 1000) / 10 : null },
  };
}
