/**
 * Le regole del gioco: gradi, prezzi, pesca, epoche, vincite.
 *
 * **Sono tutte funzioni pure.** Non toccano il disco, non conoscono la rete,
 * non sanno chi sta giocando. Prendono dei numeri e ne tornano altri — e per
 * questo si possono provare davvero, senza accendere niente.
 *
 * ⚠ **Il caso si passa da fuori.** Ogni funzione che pesca prende una `Caso`
 * come ultimo argomento invece di chiamare `Math.random()` da se'. Sembra un
 * giro lungo e serve a una cosa sola: una prova che non puo' fissare il dado
 * non prova niente. Con il dado in mano si verifica che il Mythic paghi
 * davvero quando esce, invece di girare mille volte sperando.
 *
 * Le regole scritte in italiano stanno in `CONCETTI.md`, accanto. Se qui e li'
 * dicono cose diverse, quello sbagliato e' qui.
 */

import type {
  Epoca,
  Era,
  Formazione,
  Grado,
  Impostazioni,
  Pezzo,
  PezzoInGioco,
  Scalino,
  Vincita,
} from "./tipi";
import { GRADI_ID } from "./tipi";

/* ------------------------------------------------------------------ il caso */

/** Un dado. Torna un numero da 0 (compreso) a 1 (escluso), come `Math.random`. */
export type Caso = () => number;

/** Un numero intero da `min` a `max`, tutti e due compresi. */
export function fra(min: number, max: number, caso: Caso): number {
  return min + Math.floor(caso() * (max - min + 1));
}

/* ------------------------------------------------------------------- gradi */

/**
 * Gli undici gradi, con il prezzo da cui cominciano, il colore, quanto si
 * accendono, quanto spesso escono e quanto pagano.
 *
 * Sta tutto in una riga sola per grado, di proposito: prima queste cinque cose
 * stavano in cinque posti diversi, e cambiare la scala voleva dire ricordarsi
 * di cinque file. Il giorno che si aggiunge un grado si aggiunge una riga.
 *
 * **`quantoEsce` e' su mille**, e sono mille di preciso: 400 + 220 + 140 + 90 +
 * 60 + 40 + 24 + 14 + 8 + 3 + 1. Un Mythic ogni mille caselle — con dodici
 * rulli, uno ogni ottantatre giri circa.
 *
 * ⚠ **`quantoEsce` non si ricava dai prezzi**, e non e' una svista. Se si
 * pescasse a caso fra tutti i pezzi, la rarita' dipenderebbe da **quanti** ce
 * ne sono in ogni grado: il giorno che si aggiungono trenta pezzi comuni, i
 * Mythic diventerebbero il doppio piu' rari senza che nessuno l'abbia deciso.
 * Cosi' invece la frequenza e' una scelta, e resta quella anche quando il mazzo
 * cresce.
 */
export const GRADI: readonly Scalino[] = [
  { id: "basic", nome: "Basic", da: 0, colore: "#9aa0b5", fuoco: 0, quantoEsce: 400, paga: 0 },
  { id: "grand", nome: "Grand", da: 5, colore: "#7fd1a8", fuoco: 0, quantoEsce: 220, paga: 0 },
  { id: "rare", nome: "Rare", da: 12, colore: "#5cc8ff", fuoco: 1, quantoEsce: 140, paga: 5 },
  { id: "arcane", nome: "Arcane", da: 25, colore: "#b07cff", fuoco: 1, quantoEsce: 90, paga: 12 },
  { id: "heroic", nome: "Heroic", da: 45, colore: "#ff9d5c", fuoco: 1, quantoEsce: 60, paga: 25 },
  { id: "unique", nome: "Unique", da: 75, colore: "#ff6fb5", fuoco: 2, quantoEsce: 40, paga: 50 },
  { id: "celestial", nome: "Celestial", da: 120, colore: "#6ee7f0", fuoco: 2, quantoEsce: 24, paga: 100 },
  { id: "divine", nome: "Divine", da: 200, colore: "#ffe9a8", fuoco: 2, quantoEsce: 14, paga: 200 },
  { id: "epic", nome: "Epic", da: 320, colore: "#e879f9", fuoco: 3, quantoEsce: 8, paga: 400 },
  { id: "legendary", nome: "Legendary", da: 520, colore: "#ffd166", fuoco: 3, quantoEsce: 3, paga: 800 },
  { id: "mythic", nome: "Mythic", da: 850, colore: "#ff4d6d", fuoco: 3, quantoEsce: 1, paga: 2000 },
];

/** Dov'e' un grado nella scala: 0 e' Basic, 10 e' Mythic. */
export function altezza(grado: Grado): number {
  return GRADI_ID.indexOf(grado);
}

export function scalino(grado: Grado): Scalino {
  return GRADI.find((g) => g.id === grado) ?? GRADI[0]!;
}

/** Il grado di un prezzo. Il grado non si scrive: si legge dal prezzo. */
export function gradoDiPrezzo(prezzo: number): Grado {
  let trovato: Grado = "basic";
  for (const g of GRADI) if (prezzo >= g.da) trovato = g.id;
  return trovato;
}

/**
 * Il prezzo di partenza di un pezzo, da quanto e' comune.
 *
 * Da 1 lira (lo pensa chiunque) a 1.401 (non ci arriva nessuno). La curva e'
 * `(1 - comune)` **elevato a sette**, e l'esponente non e' a caso: con una
 * curva piu' dolce meta' del mazzo finiva in cima, e un grado che vale per tre
 * generi su quattro non vuol dire niente. Contati sui 6.291 generi veri:
 * 2.641 Basic (il 42%), 479 Mythic (il 7,6%), e il resto spalmato in mezzo fra
 * i trecento e i quattrocento per grado.
 *
 * Sui generi musicali il numero di partenza e' **vero** (rank di popolarita' di
 * Every Noise); su tutto il resto e' una stima nostra, e infatti chi comanda
 * puo' cambiare il prezzo di qualunque pezzo.
 */
export function prezzoDiPartenza(quantoComune: number | undefined): number {
  const q = Math.min(1, Math.max(0, quantoComune ?? 0.5));
  return Math.max(1, Math.round(1 + 1400 * Math.pow(1 - q, 7)));
}

/** Il pezzo con addosso il prezzo di adesso: quello dell'admin, o il suo. */
export function inGioco(pezzo: Pezzo, prezzi: Record<string, number>): PezzoInGioco {
  const scritto = prezzi[pezzo.id];
  const prezzo = typeof scritto === "number" ? scritto : prezzoDiPartenza(pezzo.quantoComune);
  return { ...pezzo, prezzo, grado: gradoDiPrezzo(prezzo) };
}

/* ------------------------------------------------------------------ epoche */

/**
 * Le sette epoche, con il vestito che mettono addosso alla sala.
 *
 * Cambiare epoca non e' un filtro fra i tanti: cambia **il colore di tutto**.
 * Era cosi' nella prima versione di DaProdSlot ed e' la cosa che la faceva
 * sembrare un posto invece che un elenco.
 */
export const EPOCHE: readonly Epoca[] = [
  { id: "sempre", segno: "∞", nome: "Sempre", fondo: ["#0a0a12", "#2a1a3a", "#1a2a3a"], luce: "#e0a0ff" },
  { id: "70", segno: "70", nome: "Anni settanta", fondo: ["#1a0f05", "#3a2410", "#2a1a08"], luce: "#ffb35c" },
  { id: "80", segno: "80", nome: "Anni ottanta", fondo: ["#12051a", "#2d0a45", "#1f0630"], luce: "#ff5ce6" },
  { id: "90", segno: "90", nome: "Anni novanta", fondo: ["#040f14", "#0a2d3a", "#071e28"], luce: "#5cd8ff" },
  { id: "00", segno: "00", nome: "Duemila", fondo: ["#0a1420", "#123a52", "#0c2a3d"], luce: "#5cffef" },
  { id: "10", segno: "10", nome: "Anni dieci", fondo: ["#101a06", "#2d4a0e", "#1f3308"], luce: "#a8ff5c" },
  { id: "20", segno: "20", nome: "Anni venti", fondo: ["#140608", "#3d0e1a", "#280d12"], luce: "#ff5c8a" },
];

/**
 * Dove sta ogni epoca sulla scala della modernita': 0 e' oggi, 1 e' il piu'
 * lontano. Sono gli stessi numeri della prima versione di DaProdSlot.
 */
const DOVE_STA: Record<string, number> = {
  "70": 0.78,
  "80": 0.62,
  "90": 0.46,
  "00": 0.3,
  "10": 0.15,
  "20": 0.03,
};

/**
 * Quanto pesa un pezzo quando si e' scelta un'epoca.
 *
 * ⚠ **L'epoca non e' un'etichetta, e' un peso.** Nel dataset i generi con un
 * decennio scritto sopra sono pochi: filtrare per quelli vorrebbe dire che
 * scegliendo «anni 80» girerebbero sempre le stesse trenta parole. Invece si
 * usa la **modernita'** — quanto quel genere suona di adesso — che ce l'hanno
 * tutti: piu' e' vicina all'epoca scelta, piu' quel genere esce.
 *
 * Chi ha anche il decennio giusto scritto sopra prende una spinta forte, ma
 * nessuno viene mai escluso del tutto: anche negli anni 70 puo' scappare fuori
 * una roba di adesso, e va bene cosi' — e' una slot, non un archivio.
 */
export function pesoEra(pezzo: { modernita?: number; decennio?: string }, era: Era): number {
  if (era === "sempre") return 1;
  const dove = DOVE_STA[era];
  if (dove === undefined) return 1;
  if (typeof pezzo.modernita !== "number") return 1;

  const lontano = Math.abs(pezzo.modernita - dove);
  const peso = 1 / (1 + lontano * 10);
  return pezzo.decennio === era ? peso * 5 : Math.max(0.02, peso);
}

/* ------------------------------------------------------------------- pesca */

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
 * Dentro il grado la pesca **non e' piatta**: si tiene conto dell'epoca
 * scelta, cosi' scegliendo gli anni 80 escono cose che suonano di allora anche
 * fra i Mythic.
 *
 * Se il grado uscito e' vuoto (succede: di Mythic ce ne sono pochi e in un
 * rullo solo possono non essercene) si ripiega sul grado piu' vicino verso il
 * basso, e poi verso l'alto. Meglio un Legendary di un rullo che non gira.
 */
export function pescaPezzo(mazzo: PezzoInGioco[], era: Era, caso: Caso): PezzoInGioco | null {
  if (mazzo.length === 0) return null;

  /**
   * ⚠ **L'epoca pesa anche sulla scelta del grado, non solo dentro.**
   *
   * Trovato con una prova, il 9 settembre 2026: scegliendo gli anni 80, il
   * rullo «Di quando» diceva «Anni ottanta» solo 23 volte su 60. Il motivo non
   * era il peso — quello funzionava — era che si pescava **prima il grado**, e
   * «Anni ottanta» sta in un grado solo: piu' del 40% non poteva fare, per
   * quanto pesasse dentro.
   *
   * Adesso ogni grado vale quanto **il meglio che ha da offrire** per
   * quell'epoca. Sui generi non cambia niente — ogni grado ne ha centinaia, e
   * qualcosa di adatto ce l'hanno tutti — ma su un rullo corto sposta la
   * scelta dove deve stare. Con gli anni 80 «Anni ottanta» sale sopra l'80%.
   *
   * A epoca «sempre» questo giro non si fa nemmeno: i pesi sarebbero tutti uno,
   * e passare seimila generi per moltiplicarli per uno e' tempo buttato dodici
   * volte a giro.
   */
  const pesi = GRADI.map((g) => {
    if (era === "sempre") return g.quantoEsce;
    let meglio = 0;
    for (const p of mazzo) {
      if (p.grado !== g.id) continue;
      const peso = pesoEra(p as { modernita?: number; decennio?: string }, era);
      if (peso > meglio) meglio = peso;
    }
    return g.quantoEsce * meglio;
  });

  const scelto = pescaPesata(
    GRADI.map((g) => g.id),
    pesi,
    caso,
  );
  if (!scelto) return null;

  const partenza = altezza(scelto);
  const ordine = [partenza];
  for (let d = 1; d < GRADI.length; d++) {
    if (partenza - d >= 0) ordine.push(partenza - d);
    if (partenza + d < GRADI.length) ordine.push(partenza + d);
  }
  for (const i of ordine) {
    const dentro = mazzo.filter((p) => p.grado === GRADI_ID[i]);
    if (dentro.length === 0) continue;
    const pescato = pescaPesata(
      dentro,
      dentro.map((p) => pesoEra(p as { modernita?: number; decennio?: string }, era)),
      caso,
    );
    if (pescato) return pescato;
  }
  return null;
}

/* ---------------------------------------------------------------- i numeri */

/** I numeri di partenza del banco. Chi comanda li cambia da una schermata sola. */
export const IMPOSTAZIONI_DI_PARTENZA: Impostazioni = {
  costoGiro: 10,
  /**
   * Il pacchetto, la serie, e il regalo ogni tanto.
   *
   * Cento per serie e cinque per pacchetto sono i numeri del 9 settembre 2026,
   * e sono da guardare: con poche persone che giocano, cento cose prese ci
   * mettono ad arrivare, e finche' la serie non si chiude non c'e' niente da
   * comprare. Se succede, si scende a cinquanta — e' una riga.
   */
  costoPacchetto: 250,
  perPacchetto: 5,
  perSerie: 100,
  unaOgniGiri: 40,
  pagaPerGrado: Object.fromEntries(GRADI.map((g) => [g.id, g.paga])) as Partial<
    Record<Grado, number>
  >,
  trisMoltiplicatore: 2,
  pienoDa: "heroic",
  pienoMin: 1000,
  pienoMax: 1500,
  quasiPercentuale: 25,
  quasiMin: 5,
  quasiMax: 15,
  regaloIniziale: 500,
  penalitaDoppione: 2,
};

/* ------------------------------------------------------------------ vincite */

/** Il grado piu' alto uscito. E' quello che decide quanto si accende lo schermo. */
export function meglioDi(pezzi: PezzoInGioco[]): Grado {
  let meglio: Grado = "basic";
  for (const p of pezzi) if (altezza(p.grado) > altezza(meglio)) meglio = p.grado;
  return meglio;
}

/**
 * Cosa ha pagato questo giro.
 *
 * Tre cose, e si sommano solo quelle che hanno senso sommare:
 *
 * 1. **il grado piu' alto uscito**, una volta sola. Non tutti quelli usciti: se
 *    pagassero tutti, un Mythic incasserebbe anche il premio del Basic accanto;
 * 2. **il tris**, quando tre caselle o piu' hanno lo stesso grado da Rare in
 *    su. Quello si somma, perche' e' un'altra cosa: non «che ti e' uscito», ma
 *    «quante volte»;
 * 3. **lo schermo pieno**, quando tutte le caselle sono da Heroic in su. E'
 *    il colpo grosso, ed e' l'unico che paga a caso dentro un intervallo.
 *
 * Le **formazioni** si sommano a parte: sono premi dichiarati da chi comanda e
 * valgono per conto loro, in qualunque ordine escano i pezzi.
 */
export function valuta(
  pezzi: PezzoInGioco[],
  imp: Impostazioni,
  formazioni: Formazione[],
  caso: Caso,
): Vincita[] {
  const vincite: Vincita[] = [];
  if (pezzi.length === 0) return vincite;

  const sogliaPieno = altezza(imp.pienoDa);
  const pieno = pezzi.every((p) => altezza(p.grado) >= sogliaPieno);

  if (pieno) {
    vincite.push({
      motivo: "pieno",
      detto: "SCHERMO PIENO — tutto da " + scalino(imp.pienoDa).nome + " in su",
      lire: fra(imp.pienoMin, imp.pienoMax, caso),
      fuoco: 3,
    });
  }

  const meglio = meglioDi(pezzi);
  const pagaMeglio = imp.pagaPerGrado[meglio] ?? 0;
  if (pagaMeglio > 0) {
    const quanti = pezzi.filter((p) => p.grado === meglio).length;
    vincite.push({
      motivo: "grado:" + meglio,
      detto: (quanti > 1 ? quanti + " " : "un ") + scalino(meglio).nome,
      lire: pagaMeglio,
      fuoco: scalino(meglio).fuoco,
    });
  }

  // Il tris: tre caselle dello stesso grado, da Rare in su. Vale anche per il
  // grado migliore — sono due cose diverse, e si sommano apposta.
  const sogliaTris = altezza("rare");
  for (const g of GRADI) {
    if (altezza(g.id) < sogliaTris) continue;
    const quanti = pezzi.filter((p) => p.grado === g.id).length;
    if (quanti < 3) continue;
    const paga = (imp.pagaPerGrado[g.id] ?? 0) * imp.trisMoltiplicatore;
    if (paga <= 0) continue;
    vincite.push({
      motivo: "tris:" + g.id,
      detto: quanti + " " + g.nome + " insieme",
      lire: paga,
      fuoco: Math.min(3, g.fuoco + 1) as 0 | 1 | 2 | 3,
    });
  }

  if (vincite.length === 0 && caso() * 100 < imp.quasiPercentuale) {
    vincite.push({
      motivo: "quasi",
      detto: "c'eri quasi",
      lire: fra(imp.quasiMin, imp.quasiMax, caso),
      fuoco: 0,
    });
  }

  // Le formazioni: in qualsiasi ordine, confronto a insieme. Una combinazione
  // che paga solo se i pezzi escono in fila non la vede mai nessuno.
  const usciti = new Set(pezzi.map((p) => p.id));
  for (const f of formazioni) {
    if (f.pezzi.length > 0 && f.pezzi.every((id) => usciti.has(id))) {
      vincite.push({ motivo: "formazione:" + f.id, detto: f.nome, lire: f.premio, fuoco: 3 });
    }
  }
  return vincite;
}

/** Quanto vale quello che si vede: la somma dei pezzi usciti. */
export function valore(pezzi: PezzoInGioco[]): number {
  return pezzi.reduce((s, p) => s + p.prezzo, 0);
}

/**
 * L'impronta di una combinazione: chi e', a prescindere da come e' scritta.
 *
 * Gli id dei pezzi **in ordine di rullo**, attaccati con un piu'. Serve a non
 * far entrare due volte la stessa cosa — e si confrontano i pezzi, non il
 * prompt: due prompt identici con uno spazio di differenza sarebbero due
 * stringhe diverse, e passerebbero tutti e due.
 *
 * L'ordine **non** si riordina: nella slot i rulli sono in un ordine fisso, e
 * lo stesso pezzo in due caselle diverse fa due prompt diversi.
 */
export function impronta(idPezzi: string[]): string {
  return idPezzi.join("+");
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
