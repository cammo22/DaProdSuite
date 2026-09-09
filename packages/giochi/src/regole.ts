/**
 * Le regole del gioco: prezzi, rarita', pesca, vincite.
 *
 * **Sono tutte funzioni pure.** Non toccano il disco, non conoscono la rete,
 * non sanno chi sta giocando. Prendono dei numeri e ne tornano altri — e per
 * questo si possono provare davvero, senza accendere niente.
 *
 * ⚠ **Il caso si passa da fuori.** Ogni funzione che pesca prende una `Caso`
 * come ultimo argomento invece di chiamare `Math.random()` da se'. Sembra un
 * giro lungo e serve a una cosa sola: una prova che non puo' fissare il dado
 * non prova niente. Con il dado in mano si verifica che il jackpot paghi
 * davvero quando esce, invece di girare mille volte sperando.
 *
 * Le regole scritte in italiano stanno in `CONCETTI.md`, accanto. Se qui e li'
 * dicono cose diverse, quello sbagliato e' qui.
 */

import type {
  Formazione,
  GradoRarita,
  Impostazioni,
  Pezzo,
  PezzoInGioco,
  Rarita,
  Vincita,
} from "./tipi";

/* ------------------------------------------------------------------ il caso */

/** Un dado. Torna un numero da 0 (compreso) a 1 (escluso), come `Math.random`. */
export type Caso = () => number;

/** Un numero intero da `min` a `max`, tutti e due compresi. */
export function fra(min: number, max: number, caso: Caso): number {
  return min + Math.floor(caso() * (max - min + 1));
}

/* ----------------------------------------------------------------- rarita' */

/**
 * I cinque gradi, con il prezzo da cui cominciano e il loro colore.
 *
 * I colori sono quelli della prima versione di DaProdSlot e non si toccano a
 * cuor leggero: chi ha giocato riconosce il giallo del Leggendario prima di
 * leggere la parola.
 */
export const GRADI: readonly GradoRarita[] = [
  { id: "comune", nome: "Comune", da: 0, colore: "#9aa0b5" },
  { id: "poco", nome: "Poco comune", da: 5, colore: "#5cc8ff" },
  { id: "raro", nome: "Raro", da: 12, colore: "#b07cff" },
  { id: "epico", nome: "Epico", da: 25, colore: "#ff9d5c" },
  { id: "leggendario", nome: "Leggendario", da: 40, colore: "#ffd166" },
];

/** Quanto vale un grado quando si contano le combo: comune 0, leggendario 4. */
const SCALA: Record<Rarita, number> = {
  comune: 0,
  poco: 1,
  raro: 2,
  epico: 3,
  leggendario: 4,
};

/** Il grado di un prezzo. La rarita' non si scrive: si legge dal prezzo. */
export function raritaDiPrezzo(prezzo: number): Rarita {
  let grado: Rarita = "comune";
  for (const g of GRADI) if (prezzo >= g.da) grado = g.id;
  return grado;
}

export function grado(id: Rarita): GradoRarita {
  return GRADI.find((g) => g.id === id) ?? GRADI[0]!;
}

/**
 * Il prezzo di partenza di un pezzo, da quanto e' comune.
 *
 * Da 1 lira (lo pensa chiunque) a 60 (non ci arriva nessuno). La curva non e'
 * dritta — e' `(1 - comune)` elevato a 2,2 — perche' con una retta meta' del
 * mazzo finiva Raro: la roba mediamente nota deve costare poco, e il salto
 * deve arrivare solo verso la coda.
 *
 * Sui generi musicali il numero di partenza e' **vero** (rank di popolarita' di
 * Every Noise); su tutto il resto e' una stima nostra, e infatti l'admin puo'
 * cambiare il prezzo di qualunque pezzo.
 */
export function prezzoDiPartenza(quantoComune: number | undefined): number {
  const q = Math.min(1, Math.max(0, quantoComune ?? 0.5));
  return Math.max(1, Math.round(1 + 59 * Math.pow(1 - q, 2.2)));
}

/** Il pezzo con addosso il prezzo di adesso: quello dell'admin, o il suo. */
export function inGioco(pezzo: Pezzo, prezzi: Record<string, number>): PezzoInGioco {
  const scritto = prezzi[pezzo.id];
  const prezzo = typeof scritto === "number" ? scritto : prezzoDiPartenza(pezzo.quantoComune);
  return { ...pezzo, prezzo, rarita: raritaDiPrezzo(prezzo) };
}

/* ------------------------------------------------------------------- pesca */

/**
 * Quanto spesso esce ogni grado, in parti su cento.
 *
 * ⚠ **Si pesca il grado, poi il pezzo dentro quel grado**, e non e' lo stesso
 * che pescare a caso fra tutti i pezzi. Se si pescasse piatto, la rarita'
 * dipenderebbe da **quanti** pezzi ci sono in ogni grado: il giorno che si
 * aggiungono trenta pezzi comuni, i Leggendari diventerebbero il doppio piu'
 * rari senza che nessuno l'abbia deciso. Cosi' invece la frequenza e' una
 * scelta, e resta quella anche quando il mazzo cresce.
 */
export const QUANTO_ESCE: Record<Rarita, number> = {
  comune: 55,
  poco: 28,
  raro: 12,
  epico: 4,
  leggendario: 1,
};

/** Uno a caso, pesato. `pesi[i]` va con `roba[i]`. */
export function pescaPesata<T>(roba: T[], pesi: number[], caso: Caso): T | null {
  const totale = pesi.reduce((s, p) => s + Math.max(0, p), 0);
  if (roba.length === 0 || totale <= 0) return null;
  let tiro = caso() * totale;
  for (let i = 0; i < roba.length; i++) {
    tiro -= Math.max(0, pesi[i] ?? 0);
    if (tiro <= 0) return roba[i] ?? null;
  }
  return roba[roba.length - 1] ?? null;
}

/**
 * Un pezzo da un mazzo: prima il grado, poi uno dentro il grado.
 *
 * Se il grado uscito e' vuoto (succede: di Leggendari ce ne sono pochi e in un
 * rullo solo possono non essercene) si ripiega sul grado piu' vicino verso il
 * basso, e poi verso l'alto. Meglio un Epico di un rullo che non gira.
 */
export function pescaPezzo(mazzo: PezzoInGioco[], caso: Caso): PezzoInGioco | null {
  if (mazzo.length === 0) return null;
  const gradi = GRADI.map((g) => g.id);
  const scelto = pescaPesata(gradi, gradi.map((g) => QUANTO_ESCE[g]), caso);
  if (!scelto) return null;

  const partenza = gradi.indexOf(scelto);
  const ordine = [partenza];
  for (let d = 1; d < gradi.length; d++) {
    if (partenza - d >= 0) ordine.push(partenza - d);
    if (partenza + d < gradi.length) ordine.push(partenza + d);
  }
  for (const i of ordine) {
    const dentro = mazzo.filter((p) => p.rarita === gradi[i]);
    if (dentro.length > 0) return dentro[Math.floor(caso() * dentro.length)] ?? null;
  }
  return null;
}

/* ---------------------------------------------------------------- i numeri */

/**
 * I numeri di partenza del banco: quelli decisi da Cammo nella prima versione.
 *
 * Stanno tutti qui perche' l'admin li cambia da una schermata sola, e perche'
 * un numero scritto in mezzo al codice e' un numero che nessuno trovera' piu'.
 */
export const IMPOSTAZIONI_DI_PARTENZA: Impostazioni = {
  costoGiro: 10,
  /**
   * Il pacchetto, la serie, e il regalo ogni tanto.
   *
   * Cento per serie e cinque per pacchetto sono i numeri messi il 9 settembre
   * 2026, e sono da guardare: con poche persone che giocano, cento combinazioni
   * prese ci mettono a arrivare, e finche' la serie non si chiude non c'e'
   * niente da comprare. Se succede, si scende a cinquanta — e' una riga.
   */
  costoPacchetto: 250,
  perPacchetto: 5,
  perSerie: 100,
  unaOgniGiri: 40,
  vincitaL1: 20,
  vincitaL3: 100,
  vincitaL5: 250,
  vincitaE4: 30,
  jackpotMin: 1000,
  jackpotMax: 1500,
  quasiPercentuale: 25,
  quasiMin: 5,
  quasiMax: 15,
  regaloIniziale: 500,
  /**
   * Quanto costa far produrre davvero.
   *
   * Non sono numeri a caso: seguono quanto **costa alla macchina**. Un'immagine
   * e' un minuto di scheda video, un video ne sono dieci, un brano sta in mezzo.
   * Chi gioca deve sentire la stessa differenza che sente il computer.
   */
  costoProduzione: { immagine: 50, brano: 150, video: 400, voce: 30 },
};

/* ------------------------------------------------------------------ vincite */

/**
 * Cosa ha pagato questo giro.
 *
 * Una sola vincita di combinazione — la migliore, non la somma: se pagassero
 * tutte, cinque Leggendari incasserebbero anche il premio da uno e da tre, e i
 * numeri smetterebbero di voler dire quello che dicono. Le **formazioni** si
 * sommano a parte, perche' quelle sono un premio dichiarato dall'admin e
 * valgono per conto loro.
 */
export function valuta(
  pezzi: PezzoInGioco[],
  imp: Impostazioni,
  formazioni: Formazione[],
  caso: Caso,
): Vincita[] {
  const vincite: Vincita[] = [];
  const leggendari = pezzi.filter((p) => p.rarita === "leggendario").length;
  const epiciOMeglio = pezzi.filter((p) => SCALA[p.rarita] >= SCALA.epico).length;
  const epici = pezzi.filter((p) => p.rarita === "epico").length;

  if (pezzi.length > 0 && epiciOMeglio === pezzi.length) {
    vincite.push({
      motivo: "jackpot",
      detto: "JACKPOT — tutto lo schermo di roba grossa",
      lire: fra(imp.jackpotMin, imp.jackpotMax, caso),
    });
  } else if (leggendari >= 5) {
    vincite.push({ motivo: "l5", detto: "cinque Leggendari", lire: imp.vincitaL5 });
  } else if (leggendari >= 3) {
    vincite.push({ motivo: "l3", detto: "tre Leggendari", lire: imp.vincitaL3 });
  } else if (leggendari >= 1) {
    vincite.push({ motivo: "l1", detto: "un Leggendario", lire: imp.vincitaL1 });
  } else if (epici >= 4) {
    vincite.push({ motivo: "e4", detto: "quattro Epici", lire: imp.vincitaE4 });
  } else if (caso() * 100 < imp.quasiPercentuale) {
    vincite.push({
      motivo: "quasi",
      detto: "c'eri quasi",
      lire: fra(imp.quasiMin, imp.quasiMax, caso),
    });
  }

  // Le formazioni: in qualsiasi ordine, confronto a insieme. Deciso cosi' nella
  // prima versione, e resta — una combinazione che paga solo se i pezzi escono
  // in fila non la vede mai nessuno.
  const usciti = new Set(pezzi.map((p) => p.id));
  for (const f of formazioni) {
    if (f.pezzi.length > 0 && f.pezzi.every((id) => usciti.has(id))) {
      vincite.push({ motivo: "formazione:" + f.id, detto: f.nome, lire: f.premio });
    }
  }
  return vincite;
}

/**
 * L'impronta di una combinazione: chi e', a prescindere da come e' scritta.
 *
 * Gli id dei pezzi **in ordine di rullo**, attaccati con un più. Serve a non far
 * entrare due volte la stessa combinazione (CONCETTI.md § 8) — e si confrontano
 * i pezzi, non il prompt: due prompt identici con uno spazio di differenza
 * sarebbero due stringhe diverse, e passerebbero tutti e due.
 *
 * L'ordine **non** si riordina: nella slot i rulli sono in un ordine fisso, e
 * lo stesso pezzo in due caselle diverse fa due prompt diversi.
 */
export function impronta(idPezzi: string[]): string {
  return idPezzi.join("+");
}

/** Quanto vale quello che si vede: la somma dei pezzi usciti. */
export function valore(pezzi: PezzoInGioco[]): number {
  return pezzi.reduce((s, p) => s + p.prezzo, 0);
}

/**
 * Il prompt montato, nell'ordine dei rulli.
 *
 * Virgole e basta: e' la grammatica che capiscono sia i modelli di immagini sia
 * quelli di musica, ed e' la stessa con cui la suite scrive i suoi stili.
 */
export function montaPrompt(pezzi: PezzoInGioco[]): string {
  return pezzi
    .map((p) => p.testo.trim())
    .filter((t) => t.length > 0)
    .join(", ");
}

/* ------------------------------------------------------------------- lire */

/** 1 € in lire: il cambio fisso del 2001, quello vero. */
export const CAMBIO_EURO = 1936.27;

/** `1500` diventa `L. 1.500`. Il punto delle migliaia, come si scrive qui. */
export function lire(quanto: number): string {
  const segno = quanto < 0 ? "-" : "";
  const cifre = String(Math.abs(Math.round(quanto))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return segno + "L. " + cifre;
}

/** Le stesse lire lette in euro, per chi non se le ricorda. */
export function euro(quanto: number): string {
  return "€ " + (quanto / CAMBIO_EURO).toFixed(2).replace(".", ",");
}
