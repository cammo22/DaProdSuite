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

/* ------------------------------------------------------------------- lire */

/**
 * 1 € in lire: il cambio fisso del 2001, quello vero.
 *
 * ⚠ **Sta in cima e non in fondo perche' la scala dei gradi lo usa.** Dall'11
 * settembre 2026 il tetto delle figurine e' scritto in euro — tre — e le lire
 * si ricavano da qui. Un `const` piu' in basso non si potrebbe leggere da
 * `GRADI`: i moduli si valutano in ordine, e sarebbe un errore all'avvio.
 */
export const CAMBIO_EURO = 1936.27;

/**
 * ⚠ **Quanto vale al massimo una cosa presa, oggi: tre euro.**
 *
 * Parole sue, l'11 settembre 2026: «i premi della slot non vanno bene, danno
 * troppe lire. Fino al livello unique valgono massimo l'equivalente di 3 euro.
 * Le combinazioni sono quelle che possono avere valore».
 *
 * Il numero e' in **euro** e non in lire perche' e' cosi' che l'ha detto, e
 * perche' e' l'unica unita' che in questo gioco vuol dire qualcosa fuori dal
 * gioco: i tasti dei regali sono euro, il saldo si legge in euro con un tocco.
 * Tre euro sono `TETTO_LIRE` lire, e da quel numero scende tutto il resto —
 * dove finisce Unique, quanto vale una combinazione, quanto costa un pacchetto.
 *
 * ⚠ **Va insieme a `TETTO_FIGURINE`**, che dice fin dove arrivano i gradi. Il
 * giorno che si apre Celestial il tetto in lire si sposta da solo (vedi
 * `tettoDelValore`): sono due facce della stessa decisione, e la seconda non si
 * aggiorna a mano.
 */
export const TETTO_EURO = 3;

/** I tre euro del tetto, in lire: 5.809. */
export const TETTO_LIRE = Math.round(TETTO_EURO * CAMBIO_EURO);

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
 * ⚠ **La scala e' scesa l'11 settembre 2026: Unique finisce a tre euro.**
 *
 * Parole sue: «i premi della slot non vanno bene, danno troppe lire. Fino al
 * livello unique valgono massimo l'equivalente di 3 euro. Le combinazioni sono
 * quelle che possono avere valore, quindi aggiustiamo in modo da stabilizzare i
 * prezzi».
 *
 * Il giorno prima la scala era salita **al milione**, per far stare i gradi
 * nella stessa moneta dei regali (euro contati in lire). Quella meta' era
 * giusta e resta: la moneta e' una sola. Sbagliata era l'**altezza**. Con
 * Unique che partiva da un milione, prendere una combinazione voleva dire
 * pagarla centinaia di euro: nel giro di una serata chi gioca aveva in tasca
 * piu' lire di quante ne servissero per comprare tutto, e un portafoglio che
 * non si svuota piu' spegne il gioco (§ 4).
 *
 * Adesso il tetto e' scritto: **`TETTO_LIRE`**, cioe' tre euro, ed e' dove
 * finisce Unique. Celestial parte esattamente da li'.
 *
 * ⚠ **Dal 12 settembre 2026 non e' piu' il tetto delle figurine**, che sono
 * salite fino a Ethernal (`TETTO_FIGURINE`). Resta il posto dove finisce
 * Unique, ed e' l'unica cosa che ha sempre voluto dire: i tre euro sono un
 * gradino della scala, non la sua cima.
 *
 * **Le proporzioni sono le stesse di sempre**: ogni gradino vale circa una
 * volta e mezzo quello sotto. E' cambiata l'altezza tre volte in due giorni e
 * il disegno mai — e' la forma della scala, e non c'era niente da aggiustare.
 *
 * ⚠ **Quello che sta sul disco si converte tenendo il grado**, non lasciato
 * indietro e non moltiplicato a caso: vedi `rimettiIPrezzi` nel deposito. Una
 * figurina Unique di ieri resta Unique, e vale tre euro invece di cinquecento.
 */
export const GRADI: readonly Scalino[] = [
  { id: "basic", nome: "Basic", da: 0, colore: "#9aa0b5", fuoco: 0, quantoEsce: 3997, punti: 1 },
  { id: "grand", nome: "Grand", da: 250, colore: "#7fd1a8", fuoco: 0, quantoEsce: 2200, punti: 3 },
  { id: "rare", nome: "Rare", da: 600, colore: "#5cc8ff", fuoco: 1, quantoEsce: 1400, punti: 8 },
  { id: "arcane", nome: "Arcane", da: 1200, colore: "#b07cff", fuoco: 1, quantoEsce: 900, punti: 18 },
  { id: "heroic", nome: "Heroic", da: 2200, colore: "#ff9d5c", fuoco: 1, quantoEsce: 600, punti: 35 },
  { id: "unique", nome: "Unique", da: 3600, colore: "#ff6fb5", fuoco: 2, quantoEsce: 400, punti: 70 },
  /**
   * ⚠ **Celestial parte dal tetto**, e non e' un numero scelto a occhio: e' il
   * confine dei tre euro. Sotto ci sta tutto quello che una persona puo'
   * assegnare oggi; sopra c'e' il magazzino di domani.
   */
  { id: "celestial", nome: "Celestial", da: TETTO_LIRE, colore: "#6ee7f0", fuoco: 3, quantoEsce: 240, punti: 140 },
  { id: "divine", nome: "Divine", da: 9700, colore: "#ffe9a8", fuoco: 3, quantoEsce: 140, punti: 280 },
  { id: "epic", nome: "Epic", da: 15500, colore: "#e879f9", fuoco: 4, quantoEsce: 80, punti: 600 },
  { id: "legendary", nome: "Legendary", da: 25000, colore: "#ffd166", fuoco: 4, quantoEsce: 30, punti: 1400 },
  { id: "mythic", nome: "Mythic", da: 40000, colore: "#ff4d6d", fuoco: 5, quantoEsce: 10, punti: 4000 },
  /**
   * ⚠ **Ethernal**: il gradino sopra a tutto, dal 10 settembre 2026.
   *
   * Il bianco non e' pigrizia: undici gradi avevano gia' undici colori, e il
   * dodicesimo doveva essere **riconoscibile in un colpo d'occhio** senza
   * assomigliare a nessuno. Il bianco che vira all'azzurro e' l'unica cosa che
   * su un fondo scuro non e' un colore fra gli altri — e' luce.
   */
  { id: "ethernal", nome: "Ethernal", da: 68000, colore: "#eaf6ff", fuoco: 5, quantoEsce: 3, punti: 12000 },
];

/**
 * ⚠ **Fin dove arrivano le figurine: Ethernal, cioe' fino in cima.**
 *
 * Chiesto il 12 settembre 2026: «nella sala giochi gli item ricevuti possono
 * arrivare fino al grado ethernal».
 *
 * Il 10 settembre si erano fermate a Unique, e il motivo era buono: **la
 * rarita' e' un rapporto**, e con dieci cose prese in tutto chiamarne una
 * Mythic non vuol dire niente. Adesso il magazzino comincia a riempirsi, e chi
 * comanda vuole i sei gradi di sopra per le cose che se li meritano. Resta il
 * suo mestiere non regalarli: un Ethernal che si da' a tutti e' un Basic con
 * un nome piu' lungo.
 *
 * ⚠ **Alzando questo si alza tutto quello che ci sta sotto**, e non c'e'
 * niente da aggiornare a mano: i tasti dei gradi in fila, il tetto in lire
 * (`tettoDelValore`, che sopra all'ultimo grado dice «non c'e' tetto»), il
 * grado che si legge mentre si preme il bonus, quello che cade da un
 * pacchetto. E' il motivo per cui e' scritto qui e in nessun altro posto.
 *
 * ⚠ **Vale per le figurine e per i rulli insieme, adesso.** Fino a ieri erano
 * due scale — i pezzi arrivavano a Ethernal, le cose prese no — e la seconda
 * era un taglio sulla prima. Il taglio non c'e' piu': `sottoIlTetto` resta
 * perche' il giorno che si rimette un muro sta gia' dove serve.
 */
export const TETTO_FIGURINE: Grado = "ethernal";

/** Il grado, tenuto sotto al tetto delle figurine. Vedi `TETTO_FIGURINE`. */
export function sottoIlTetto(grado: Grado): Grado {
  return altezza(grado) > altezza(TETTO_FIGURINE) ? TETTO_FIGURINE : grado;
}

/**
 * ⚠ **Quante lire, al massimo, puo' valere una cosa presa.**
 *
 * Cioe' l'ultima lira dentro al grado piu' alto che si possa assegnare oggi.
 * Dal 12 settembre 2026 quel grado e' **Ethernal**, che e' l'ultimo: sopra non
 * c'e' niente a cui fermarsi, quindi **non c'e' tetto** e questa funzione
 * risponde infinito. Non e' una svista ed e' il ramo che stava gia' scritto
 * qui sotto: era pensato per questo giorno.
 *
 * ⚠ **Non e' un numero scritto a mano da nessuna parte, e non deve esserlo.**
 * Si ricava da `TETTO_FIGURINE`: il giorno che si apre Celestial, il tetto in
 * lire sale da solo alla fine di Celestial. Un numero scritto due volte — «fin
 * dove arrivano i gradi» qui e «fin dove arrivano le lire» la' — il primo
 * giorno dice la stessa cosa e il secondo no, ed e' il difetto che questo
 * progetto si e' scritto in cima al CLAUDE.md.
 *
 * Se un giorno il tetto fosse l'ultimo grado, sopra non c'e' niente a cui
 * fermarsi: allora non c'e' tetto, e si dice cosi'.
 */
export function tettoDelValore(): number {
  const sopra = GRADI[altezza(TETTO_FIGURINE) + 1];
  return sopra ? sopra.da - 1 : Number.POSITIVE_INFINITY;
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

/**
 * ⚠ **Le soglie del 10 settembre 2026**, quelle salite al milione. Tenute per
 * la stessa unica ragione delle altre: rileggere i file scritti quel giorno.
 *
 * La scala e' cambiata due volte in due giorni — 0..1.400, poi 0..19 milioni,
 * poi 0..68.000 — e ogni fotografia resta com'era. Una fotografia non si
 * ritocca: se si «aggiornasse» questa riga, i file di ieri si riaprirebbero con
 * i prezzi moltiplicati per mille.
 */
export const SOGLIE_DEL_MILIONE: readonly number[] =
  [0, 70000, 160000, 330000, 600000, 1000000, 1600000, 2700000, 4300000, 7000000, 11000000, 19000000];

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
   * ⚠ **Scesi insieme alla scala**, l'11 settembre 2026: da 60 lire a 68.060.
   *
   * La curva e' sempre quella — `(1 - comune)` elevato a sette — e la
   * **distribuzione non si muove**: 40% Basic, 7% Mythic, il resto spalmato in
   * mezzo, contati sui 6.291 generi veri, esattamente come con le soglie al
   * milione e come con quelle a 1.400. Cambia il metro, non il mazzo.
   *
   * ⚠ **Doveva scendere anche questa, non era una scelta.** I gradi si leggono
   * dal prezzo: se le soglie scendono a tre euro e i pezzi restano fra mille e
   * diciannove milioni, **tutti i dodici rulli diventano Ethernal** e la slot
   * smette di avere colori — lo stesso difetto del giorno prima, girato
   * dall'altra parte. Sono due numeri che devono stare nello stesso mondo.
   *
   * ⚠ **Un pezzo raro puo' valere piu' del tetto di una figurina, e va bene.**
   * Un Mythic sul rullo sta sui quarantamila, cioe' venti euro: sopra i tre euro
   * di una cosa presa. Non e' una contraddizione perche' sono due mestieri
   * diversi — il prezzo di un pezzo dice **quanto e' raro** (e da li' il colore
   * sul rullo), il prezzo di una figurina dice **quanto ti pagano**. Quello che
   * fa da ponte fra i due e' la media, vedi `valoreDeiPezzi`.
   */
  return Math.max(60, Math.round(60 + 68_000 * Math.pow(1 - q, 7)));
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
   * ⚠ **Sceso con la scala l'11 settembre 2026, e non era facoltativo.**
   *
   * Un pacchetto si scambia con delle figurine, e **i doppioni pagano il loro
   * prezzo** (§ 11): il conto da far tornare e' quello — cinque figurine
   * pescate, se le hai gia' tutte, ti ridanno la loro somma. Con figurine che
   * valgono fino a 5.808 lire e cinque per pacchetto, un pacchetto pagato meno
   * di cinquemila e' una macchina per stampare soldi, aperta a chiunque abbia
   * finito l'album.
   *
   * Cinquemila lire — due euro e mezzo — e' poco sotto una figurina Unique
   * intera: il rapporto di sempre, un pacchetto costa all'incirca quanto vale
   * una cosa buona, riportato sulla scala di adesso.
   */
  costoPacchetto: 5_000,
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
 * Il valore di base di una combinazione: **quanto valgono i suoi pezzi, in
 * media**.
 *
 * ⚠ **Era la somma, ed e' diventata la media l'11 settembre 2026.** Parole sue:
 * «i premi della slot danno troppe lire… le combinazioni sono quelle che possono
 * avere valore, quindi aggiustiamo in modo da stabilizzare i prezzi».
 *
 * La somma aveva due difetti, e il secondo e' peggiore del primo:
 *
 * 1. **non ci stava nel tetto.** Dodici pezzi valgono in media 1.600 lire
 *    l'uno: sommati fanno diciannovemila, cioe' dieci euro. Con il tetto a tre
 *    euro *ogni* combinazione avrebbe pagato il massimo, e una scala dove tutti
 *    prendono il voto piu' alto non e' una scala;
 * 2. **pagava la quantita' invece dell'idea.** Da quando si manda solo quello
 *    che si e' bloccato (§ 5), una riga puo' avere tre pezzi o dodici: con la
 *    somma, bloccarne dodici a caso pagava quattro volte tre pezzi scelti. Cioe'
 *    il contrario esatto di quello per cui si manda solo il bloccato.
 *
 * Con la media una combinazione vale **quanto vale la roba che c'e' dentro**, e
 * tre pezzi rari valgono come dodici pezzi rari. Quanti sono non e' un merito;
 * cosa sono si'.
 */
export function valoreDeiPezzi(prezzi: number[]): number {
  if (prezzi.length === 0) return 0;
  return Math.round(prezzi.reduce((s, p) => s + Math.max(0, p), 0) / prezzi.length);
}

/**
 * Quanto vale una combinazione quando chi comanda la prende.
 *
 * ⚠ **Non e' un numero scritto a mano.** Chiesto il 10 settembre 2026: «quando
 * una combinazione viene data per buona da un admin allora assume il valore
 * dei singoli item piu' un bonus dell'admin».
 *
 * Il valore di base viene dai pezzi (`valoreDeiPezzi`), che e' un numero vero:
 * viene dalla rarita' di ognuno, che viene dai dati. Il bonus e' l'unica cosa
 * che decide una persona — quanto quella riga vale **oltre** i suoi pezzi,
 * cioe' quanto e' bella l'idea.
 *
 * Cosi' una combinazione fatta di roba rara parte alta anche se chi comanda ha
 * fretta, e una fatta di roba comune ma geniale la si puo' comunque pagare
 * bene. Il bonus puo' anche essere zero.
 *
 * ⚠ **E sopra c'e' il tetto** (`tettoDelValore`), quando ce n'e' uno. Questa e'
 * l'unica riga che lo fa rispettare — ci passano il prezzo di una figurina e
 * nient'altro — e resta qui anche adesso che i gradi arrivano fino in cima e il
 * tetto e' infinito: il giorno che si rimette un muro, e' gia' al suo posto.
 */
export function valoreDaPrendere(base: number, bonus: number): number {
  const tutto = Math.max(0, base) + Math.max(0, bonus);
  return Math.max(1, Math.min(tettoDelValore(), Math.round(tutto)));
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

/**
 * Quanto vale quello che si vede sui rulli.
 *
 * ⚠ **E' lo stesso numero che pagherebbe se la prendessero**, senza bonus — non
 * un conto a parte. Sotto i rulli c'e' scritto «Vale L. tot», e se quel numero
 * fosse la somma dei pezzi mentre il premio e' la media, la riga davanti agli
 * occhi direbbe dieci euro e in tasca ne arriverebbe uno. Un numero mostrato che
 * non e' quello che ti danno e' una bugia scritta sullo schermo.
 */
export function valore(pezzi: PezzoInGioco[]): number {
  if (pezzi.length === 0) return 0;
  return valoreDaPrendere(valoreDeiPezzi(pezzi.map((p) => p.prezzo)), 0);
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

/* ------------------------------------------------- come si scrivono le lire */

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
