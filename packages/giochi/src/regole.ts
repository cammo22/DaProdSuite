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
 * **`quantoEsce` e' su diecimila**, e sono diecimila di preciso. Era su mille
 * fino al 10 settembre 2026: si e' passati a diecimila per far entrare
 * **Ethernal** sotto Mythic senza spostare nessun altro. Con i millesimi il
 * gradino piu' basso era gia' occupato — Mythic valeva 1 — e l'unico modo di
 * mettere qualcosa di piu' raro era rendere Mythic piu' comune, cioe' cambiare
 * una scala per aggiungerci una riga.
 *
 * Un Mythic ogni mille caselle (dodici rulli: un giro su ottantatre); un
 * Ethernal ogni tremilatrecento (un giro su duecentosettanta).
 *
 * ⚠ **`quantoEsce` non si ricava dai prezzi**, e non e' una svista. Se si
 * pescasse a caso fra tutti i pezzi, la rarita' dipenderebbe da **quanti** ce
 * ne sono in ogni grado: il giorno che si aggiungono trenta pezzi comuni, i
 * Mythic diventerebbero il doppio piu' rari senza che nessuno l'abbia deciso.
 * Cosi' invece la frequenza e' una scelta, e resta quella anche quando il mazzo
 * cresce.
 */
/**
 * ⚠ **La scala e' cambiata il 10 settembre 2026: Unique parte da un milione.**
 *
 * Parole sue: «i prezzi ora sono da 1 lira a 500, metti gli stessi tagli che
 * hai messo per le ricariche… e aggiorna anche i gradi: da 1 milione di lire
 * sono unique».
 *
 * Prima la scala andava da 0 a 1.400 lire, e i tasti del bonus erano lire
 * piccole (2, 5, 10… 500). Il problema era che **in questo gioco i soldi hanno
 * gia' una scala**, ed e' quella dei regali: euro contati in lire, dove il
 * taglio piu' piccolo e' 3.873. Con due scale, il bonus e i regali parlavano
 * di due monete diverse che si chiamavano tutte e due «lire», e il numero
 * accanto a una figurina non si poteva confrontare con niente.
 *
 * Adesso e' una sola: **i tasti del bonus sono quelli dei regali** (vedi
 * `TAGLI_BONUS` in `banco.ts`) e le soglie stanno nello stesso mondo. Le
 * proporzioni fra un grado e l'altro sono rimaste **identiche** — ogni gradino
 * vale circa una volta e mezzo quello sotto — perche' quella e' la forma della
 * scala e non c'era niente da aggiustare: e' cambiata l'unita', non il disegno.
 *
 * ⚠ **Quello che sta sul disco viene portato su di qui**, non lasciato indietro:
 * vedi `rimettiInRiga` nel deposito. Una figurina Unique di ieri resta Unique.
 */
export const GRADI: readonly Scalino[] = [
  { id: "basic", nome: "Basic", da: 0, colore: "#9aa0b5", fuoco: 0, quantoEsce: 3997, punti: 1 },
  { id: "grand", nome: "Grand", da: 70000, colore: "#7fd1a8", fuoco: 0, quantoEsce: 2200, punti: 3 },
  { id: "rare", nome: "Rare", da: 160000, colore: "#5cc8ff", fuoco: 1, quantoEsce: 1400, punti: 8 },
  { id: "arcane", nome: "Arcane", da: 330000, colore: "#b07cff", fuoco: 1, quantoEsce: 900, punti: 18 },
  { id: "heroic", nome: "Heroic", da: 600000, colore: "#ff9d5c", fuoco: 1, quantoEsce: 600, punti: 35 },
  { id: "unique", nome: "Unique", da: 1000000, colore: "#ff6fb5", fuoco: 2, quantoEsce: 400, punti: 70 },
  { id: "celestial", nome: "Celestial", da: 1600000, colore: "#6ee7f0", fuoco: 3, quantoEsce: 240, punti: 140 },
  { id: "divine", nome: "Divine", da: 2700000, colore: "#ffe9a8", fuoco: 3, quantoEsce: 140, punti: 280 },
  { id: "epic", nome: "Epic", da: 4300000, colore: "#e879f9", fuoco: 4, quantoEsce: 80, punti: 600 },
  { id: "legendary", nome: "Legendary", da: 7000000, colore: "#ffd166", fuoco: 4, quantoEsce: 30, punti: 1400 },
  { id: "mythic", nome: "Mythic", da: 11000000, colore: "#ff4d6d", fuoco: 5, quantoEsce: 10, punti: 4000 },
  /**
   * ⚠ **Ethernal**: il gradino sopra a tutto, dal 10 settembre 2026.
   *
   * Il bianco non e' pigrizia: undici gradi avevano gia' undici colori, e il
   * dodicesimo doveva essere **riconoscibile in un colpo d'occhio** senza
   * assomigliare a nessuno. Il bianco che vira all'azzurro e' l'unica cosa che
   * su un fondo scuro non e' un colore fra gli altri — e' luce.
   */
  { id: "ethernal", nome: "Ethernal", da: 19000000, colore: "#eaf6ff", fuoco: 5, quantoEsce: 3, punti: 12000 },
];

/**
 * ⚠ **Fin dove arrivano le figurine, per adesso: Unique.**
 *
 * Chiesto il 10 settembre 2026: «tutti quelli che ci sono fino ad ora
 * mettiamoli da basic a unique; da celestial a ethernal ci penseremo noi nel
 * tempo, man mano che abbiamo dati a disposizione».
 *
 * Il motivo e' che **la rarita' e' un rapporto**. Con dieci cose prese in
 * tutto, chiamarne una Mythic non vuol dire niente: non c'e' niente sotto che
 * la faccia sembrare rara. I sei gradi in cima restano dichiarati e non si
 * assegnano — si aprono quando il magazzino e' abbastanza pieno da meritarli.
 *
 * ⚠ **Vale per le figurine, non per i rulli.** I dodici gradi dei pezzi che
 * girano nella slot restano tutti e dodici, Ethernal compreso: quella e' la
 * rarita' dei pezzi, e la decidono i dati. Questo e' il grado che **una
 * persona** da' a una cosa presa, ed e' un'altra faccenda.
 */
export const TETTO_FIGURINE: Grado = "unique";

/** Il grado, tenuto sotto al tetto delle figurine. Vedi `TETTO_FIGURINE`. */
export function sottoIlTetto(grado: Grado): Grado {
  return altezza(grado) > altezza(TETTO_FIGURINE) ? TETTO_FIGURINE : grado;
}

/**
 * ⚠ **Le soglie di prima del 10 settembre 2026**, tenute per una cosa sola:
 * rileggere i file scritti allora. Vedi `rimettiInRiga` nel deposito.
 *
 * Non si usano per niente altro e non vanno aggiornate: sono una fotografia di
 * com'era la scala, e una fotografia non si ritocca.
 */
export const SOGLIE_DI_PRIMA: readonly number[] =
  [0, 5, 12, 25, 45, 75, 120, 200, 320, 520, 850, 1400];

/** Dov'e' un grado nella scala: 0 e' Basic, 11 e' Ethernal. */
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
  /**
   * ⚠ **Cresciuti insieme alla scala**, il 10 settembre 2026.
   *
   * La curva e' quella di prima — `(1 - comune)` elevato a sette, e la
   * distribuzione sui 6.291 generi veri e' la stessa — moltiplicata per mille,
   * cioe' tanto quanto e' cresciuta la scala dei gradi.
   *
   * ⚠ **Doveva crescere anche questa, non era una scelta.** I gradi si leggono
   * dal prezzo: se le soglie salgono al milione e i pezzi restano fra 1 e
   * 1.401 lire, **tutti i dodici rulli diventano Basic**, e la slot smette di
   * avere colori. Sono due numeri che devono stare nello stesso mondo, ed e'
   * proprio la ragione per cui il mondo e' uno solo adesso.
   */
  return Math.max(1000, Math.round(1000 + 19_000_000 * Math.pow(1 - q, 7)));
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
  /**
   * ⚠ **Salito con la scala il 10 settembre 2026, e non era facoltativo.**
   *
   * Un pacchetto si scambia con delle figurine, e **i doppioni pagano il loro
   * prezzo** (§ 11): con le figurine passate ai milioni e il pacchetto rimasto
   * a 250 lire, un solo doppione ne ripagava quattromila. Cioe' una macchina
   * per stampare soldi, aperta a chiunque avesse 250 lire in tasca.
   *
   * E' lo stesso rapporto di prima — un pacchetto costa all'incirca quanto vale
   * una figurina buona — riportato sulla scala di adesso.
   */
  costoPacchetto: 3_300_000,
  perPacchetto: 5,
  perSerie: 100,
  unaOgniGiri: 40,
  puntiPerGrado: Object.fromEntries(GRADI.map((g) => [g.id, g.punti])) as Partial<
    Record<Grado, number>
  >,
  trisMoltiplicatore: 2,
  pienoDa: "heroic",
  pienoMin: 3000,
  pienoMax: 5000,
  perIlLivello: 500,
  quasiPercentuale: 25,
  quasiMin: 1,
  quasiMax: 4,
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
 * Quanta esperienza ha dato questo giro.
 *
 * ⚠ **Punti, non lire.** Dalla slot non escono soldi (CONCETTI.md § 4): girare
 * costa e fa salire di livello, le lire arrivano solo da chi comanda quando
 * gli piace una combinazione.
 *
 * Tre cose, e si sommano solo quelle che hanno senso sommare:
 *
 * 1. **il grado piu' alto uscito**, una volta sola. Non tutti quelli usciti: se
 *    contassero tutti, un Mythic prenderebbe anche i punti del Basic accanto;
 * 2. **il tris**, quando tre caselle o piu' hanno lo stesso grado da Rare in
 *    su. Quello si somma, perche' e' un'altra cosa: non «che ti e' uscito», ma
 *    «quante volte»;
 * 3. **lo schermo pieno**, quando tutte le caselle sono da Heroic in su. E'
 *    il colpo grosso, ed e' l'unico che paga a caso dentro un intervallo.
 *
 * Le **formazioni** si sommano a parte: sono premi dichiarati da chi comanda e
 * valgono per conto loro, in qualunque ordine escano i pezzi.
 */
/* ------------------------------------------------------------- i livelli */

/**
 * A che livello si e' con questa esperienza.
 *
 * Ogni livello costa **piu' del precedente**: il primo 500 punti, il secondo
 * mille, il terzo millecinquecento. La somma fa `perIlLivello × n × (n-1) / 2`
 * — cioe' il livello 5 arriva a 5.000 punti, il 10 a 22.500.
 *
 * Si conta con un giro invece che con una formula chiusa perche' cosi' si
 * legge: chi apre questo file deve poter dire «ah, e' questo» senza risolvere
 * un'equazione di secondo grado.
 */
export function livelloDi(esperienza: number, perIlLivello: number): number {
  let livello = 1;
  let soglia = perIlLivello;
  let restante = Math.max(0, esperienza);
  while (restante >= soglia) {
    restante -= soglia;
    livello += 1;
    soglia += perIlLivello;
  }
  return livello;
}

/** Quanta esperienza manca al livello dopo, e quanta ne serviva in tutto. */
export function versoIlProssimo(
  esperienza: number,
  perIlLivello: number,
): { livello: number; dentro: number; serve: number } {
  let livello = 1;
  let soglia = perIlLivello;
  let restante = Math.max(0, esperienza);
  while (restante >= soglia) {
    restante -= soglia;
    livello += 1;
    soglia += perIlLivello;
  }
  return { livello, dentro: restante, serve: soglia };
}

/**
 * Quanto vale una combinazione quando chi comanda la prende.
 *
 * ⚠ **Non e' un numero scritto a mano.** Chiesto il 10 settembre 2026: «quando
 * una combinazione viene data per buona da un admin allora assume il valore
 * dei singoli item piu' un bonus dell'admin».
 *
 * Il valore di base e' la **somma dei dodici pezzi**, che e' un numero vero:
 * viene dalla rarita' di ognuno, che viene dai dati. Il bonus e' l'unica cosa
 * che decide una persona — quanto quella riga vale **oltre** i suoi pezzi,
 * cioe' quanto e' bella l'idea.
 *
 * Cosi' due combinazioni fatte di roba rara partono alte anche se chi comanda
 * ha fretta, e una fatta di roba comune ma geniale la si puo' comunque pagare
 * bene. Il bonus puo' anche essere zero.
 */
export function valoreDaPrendere(sommaPezzi: number, bonus: number): number {
  return Math.max(1, Math.round(Math.max(0, sommaPezzi) + Math.max(0, bonus)));
}

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
      punti: fra(imp.pienoMin, imp.pienoMax, caso),
      // La cosa piu' grossa che puo' capitare: si accende tutto, al massimo.
      fuoco: 5,
    });
  }

  const meglio = meglioDi(pezzi);
  const puntiMeglio = imp.puntiPerGrado[meglio] ?? 0;
  if (puntiMeglio > 0) {
    const quanti = pezzi.filter((p) => p.grado === meglio).length;
    vincite.push({
      motivo: "grado:" + meglio,
      detto: (quanti > 1 ? quanti + " " : "un ") + scalino(meglio).nome,
      punti: puntiMeglio,
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
    const punti = (imp.puntiPerGrado[g.id] ?? 0) * imp.trisMoltiplicatore;
    if (punti <= 0) continue;
    vincite.push({
      motivo: "tris:" + g.id,
      detto: quanti + " " + g.nome + " insieme",
      punti,
      fuoco: Math.min(5, g.fuoco + 1) as 0 | 1 | 2 | 3 | 4 | 5,
    });
  }

  /**
   * La consolazione, quando il giro e' andato male.
   *
   * ⚠ **Prima si accendeva solo se non era uscito niente, e da quando i punti
   * hanno sostituito le lire quel «niente» non capita piu'**: anche un Basic
   * da' un punto, quindi la riga era diventata codice morto. Trovato da una
   * prova rossa il 10 settembre 2026.
   *
   * Adesso si accende quando **il meglio che e' uscito e' sotto Rare**, cioe'
   * quando lo schermo e' grigio: qualche punto in piu' per non mandare via a
   * mani vuote chi ha appena speso un giro.
   */
  if (altezza(meglio) < sogliaTris && caso() * 100 < imp.quasiPercentuale) {
    vincite.push({
      motivo: "quasi",
      detto: "c'eri quasi",
      punti: fra(imp.quasiMin, imp.quasiMax, caso),
      fuoco: 0,
    });
  }

  // Le formazioni: in qualsiasi ordine, confronto a insieme. Una combinazione
  // che paga solo se i pezzi escono in fila non la vede mai nessuno.
  const usciti = new Set(pezzi.map((p) => p.id));
  for (const f of formazioni) {
    if (f.pezzi.length > 0 && f.pezzi.every((id) => usciti.has(id))) {
      vincite.push({ motivo: "formazione:" + f.id, detto: f.nome, punti: f.premio, fuoco: 4 });
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
