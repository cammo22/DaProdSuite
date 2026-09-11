/**
 * **Le figurine della casa**: cinquanta, e crescono con le copie.
 *
 * Chieste l'11 settembre 2026:
 *
 * > «Mettiamo un 50 item fake in modo da farli uscire, e quegli item fake piu'
 * > ne collezioniamo piu' si evolvono: partono da basic fino a ethernal.»
 *
 * Il perche' si vedeva nel file vero: nel primo pacchetto c'erano quarantacinque
 * figurine e trentaquattro erano solo un prompt, senza niente da guardare. Un
 * pacchetto da nove carte fatto cosi' e' una busta di biglietti scritti. Le
 * figurine della casa sono quelle che escono sempre, che si riconoscono al
 * volo, e che danno un motivo per aprirne un altro anche quando l'album vero e'
 * finito.
 *
 * ⚠ **Non stanno nel file del gioco: stanno qui.** Sono le stesse per tutti e
 * non le inventa nessuno, quindi non sono combinazioni prese: sono il catalogo
 * della sala. Nel conto di ognuno c'e' solo **quante copie** ne ha
 * (`Conto.copie`). Scriverle nel magazzino vorrebbe dire cinquanta figurine
 * finte mescolate a quelle vere — in classifica, nello shop, nei pacchetti da
 * chiudere — e un giorno qualcuno ne comprerebbe una.
 *
 * ⚠ **Una copia in piu' non paga lire: fa crescere.** E' la differenza con le
 * figurine vere, dove il doppione paga il suo prezzo. Qui il doppione e' il
 * gioco: la stessa figurina che torna diventa un'altra cosa. La faccia la
 * disegna la pagina, e cambia col grado.
 */

import { GRADI } from "./regole";
import type { Deposito } from "./deposito";
import type { Grado } from "./tipi";

export interface FigurinaDellaCasa {
  /** «casa-01» … «casa-50». Il prefisso e' quello che la distingue dalle vere. */
  id: string;
  numero: number;
  nome: string;
  /** Il disegno: un segno solo, grande. */
  segno: string;
  /** La tinta del fondo, in gradi sul cerchio dei colori. */
  tinta: number;
}

const NOMI: readonly [string, string][] = [
  ["Il Gatto", "🐱"], ["La Volpe", "🦊"], ["Il Gufo", "🦉"], ["La Balena", "🐋"],
  ["Il Polpo", "🐙"], ["La Tartaruga", "🐢"], ["Il Riccio", "🦔"], ["L'Ape", "🐝"],
  ["La Farfalla", "🦋"], ["Il Pinguino", "🐧"], ["Il Leone", "🦁"], ["L'Unicorno", "🦄"],
  ["Il Drago", "🐉"], ["La Rana", "🐸"], ["Il Fenicottero", "🦩"], ["La Luna", "🌙"],
  ["Il Sole", "☀️"], ["La Cometa", "☄️"], ["Il Pianeta", "🪐"], ["La Stella", "⭐"],
  ["Il Fulmine", "⚡"], ["L'Arcobaleno", "🌈"], ["Il Fiocco di neve", "❄️"], ["La Fiamma", "🔥"],
  ["L'Onda", "🌊"], ["La Moka", "☕"], ["La Pizza", "🍕"], ["Il Gelato", "🍦"],
  ["La Ciambella", "🍩"], ["L'Anguria", "🍉"], ["La Chitarra", "🎸"], ["Il Vinile", "💿"],
  ["Le Cuffie", "🎧"], ["Il Microfono", "🎤"], ["La Tromba", "🎺"], ["Il Razzo", "🚀"],
  ["Il Robot", "🤖"], ["L'Alieno", "👽"], ["Il Fantasma", "👻"], ["Il Teschio", "💀"],
  ["La Corona", "👑"], ["Il Diamante", "💎"], ["La Chiave", "🗝️"], ["La Bussola", "🧭"],
  ["Il Dado", "🎲"], ["La Maschera", "🎭"], ["La Cinepresa", "🎥"], ["Il Rullino", "🎞️"],
  ["La Tavolozza", "🎨"], ["Il Quadrifoglio", "🍀"],
];

/**
 * Il catalogo. Le tinte girano dell'angolo aureo — centotrentasette gradi —
 * cosi' due figurine vicine non hanno mai lo stesso colore.
 */
export const CASA: readonly FigurinaDellaCasa[] = NOMI.map(([nome, segno], i) => ({
  id: "casa-" + String(i + 1).padStart(2, "0"),
  numero: i + 1,
  nome,
  segno,
  tinta: Math.round((i * 137.5) % 360),
}));

export function eDellaCasa(id: string): boolean {
  return id.startsWith("casa-");
}

export function dellaCasa(id: string): FigurinaDellaCasa | undefined {
  return CASA.find((f) => f.id === id);
}

/**
 * ⚠ **Quante copie servono per ogni grado**: una per Basic, cinquanta per
 * Ethernal. E' una scelta, e si guarda dall'alto: in un pacchetto da nove
 * escono sette o otto figurine della casa, cioe' una precisa ogni sette
 * pacchetti circa, e cinquanta copie della stessa sono qualche centinaio di
 * pacchetti. Ethernal si raggiunge, ma se ne parla.
 *
 * I primi gradini sono vicini apposta: le prime volte che una figurina cresce
 * devono arrivare presto, se no nessuno scopre che cresce.
 */
export const COPIE_PER_GRADO: readonly number[] = [1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50];

/** Il grado che danno queste copie. Zero copie, nessun grado: non ce l'hai. */
export function gradoDelleCopie(copie: number): Grado | null {
  let trovato: Grado | null = null;
  for (let i = 0; i < GRADI.length; i++) {
    if (copie >= (COPIE_PER_GRADO[i] ?? Infinity)) trovato = GRADI[i]!.id;
  }
  return trovato;
}

/** Quante copie servono per il grado dopo, o niente se si e' in cima. */
export function copiePerIlProssimo(copie: number): number | null {
  for (const soglia of COPIE_PER_GRADO) if (copie < soglia) return soglia;
  return null;
}

/** Quante copie ha questa persona di quella figurina. */
export function copieDi(deposito: Deposito, chi: string, id: string): number {
  return deposito.conto(chi).copie?.[id] ?? 0;
}

/** Il grado che ha, per questa persona. Chi non ce l'ha la vede Basic: e' da dove parte. */
export function gradoPer(deposito: Deposito, chi: string, id: string): Grado {
  return gradoDelleCopie(copieDi(deposito, chi, id)) ?? "basic";
}

/** Una copia in piu', arrivata da un pacchetto o dalla macchinetta. */
export interface CopiaDellaCasa {
  figurina: FigurinaDellaCasa;
  copie: number;
  grado: Grado;
  /** Il grado di prima: niente se era la prima copia. */
  prima: Grado | null;
  /** Vero se con questa copia ha cambiato grado. La prima copia conta: e' nata. */
  cresciuta: boolean;
  /** Quante ne servono per il prossimo, o niente se e' in cima. */
  prossimo: number | null;
}

export function unaCopiaInPiu(deposito: Deposito, chi: string, id: string): CopiaDellaCasa {
  const figurina = dellaCasa(id);
  if (!figurina) throw new Error("Non e' una figurina della casa: " + id);
  const prima = gradoDelleCopie(copieDi(deposito, chi, id));
  const copie = deposito.aggiungiCopia(chi, id);
  const grado = gradoDelleCopie(copie) ?? "basic";
  return {
    figurina,
    copie,
    grado,
    prima,
    cresciuta: prima !== grado,
    prossimo: copiePerIlProssimo(copie),
  };
}
