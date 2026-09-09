/**
 * Il deposito: il file sul disco del PC dove sta tutto.
 *
 * Un file solo, `giochi.json`, nella cartella dati della suite. Dentro ci sono
 * i conti, i pezzi scritti a mano, i prezzi cambiati, le formazioni e i numeri
 * del banco.
 *
 * ⚠ **Il PC e' il banco, e questo e' il banco.** Il saldo che si vede sul
 * telefono e quello che si vede sul computer sono lo stesso numero perche' sono
 * lo stesso file. Se un giorno qualcuno mettesse una seconda copia da qualche
 * parte «per comodita'», il gioco sarebbe finito il giorno dopo.
 *
 * Le regole di scrittura sono copiate da `remoto.json`, e per lo stesso motivo:
 *
 * - **atomica** (file temporaneo e poi rinomina), perche' un'interruzione a
 *   meta' lascerebbe un JSON troncato, che al riavvio dopo e' indistinguibile
 *   da un file corrotto;
 * - con la **copia di sicurezza** `.bak`, scritta prima di ogni scrittura vera
 *   e solo quando quella di adesso si e' letta bene: contiene sempre l'ultimo
 *   stato **buono**;
 * - **differita di mezzo secondo**, perche' con tre persone che giocano si
 *   riscriverebbe il file dieci volte al secondo. Chi salva dice «salva»; il
 *   quando lo decide questo file. Alla chiusura si scrive comunque, subito.
 *
 * ⚠ **Se il file c'era e non si e' capito, non si scrive piu'.** Quello che
 * sta in memoria e' un elenco vuoto, e salvarlo vorrebbe dire cancellare per
 * sempre quanto ha vinto la gente. Meglio un gioco che non parte di un gioco
 * che azzera i conti.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { IMPOSTAZIONI_DI_PARTENZA } from "./regole";
import type { Combinazione, Conto, DatiGiochi, Formazione, Impostazioni, Pezzo } from "./tipi";

/**
 * Un deposito appena nato, tutto suo.
 *
 * ⚠ **E' una funzione e non una costante, e la differenza e' costata una prova
 * rossa.** Con una costante — `const VUOTO = { conti: [], … }` — ogni deposito
 * nuovo faceva `{ ...VUOTO }`, che copia i campi ma **non** le liste dentro:
 * l'elenco dei conti restava lo stesso identico array per tutti. Nella suite
 * non si sarebbe visto (di deposito ce n'e' uno), ma la prova ne apre uno per
 * volta e ha trovato un conto con dentro i soldi di tutte le prove precedenti.
 * Una lista condivisa senza volerlo e' il tipo di difetto che sta buono per
 * mesi e poi mescola i portafogli di due persone.
 */
function vuoto(): DatiGiochi {
  return {
    versione: 1,
    conti: [],
    combinazioni: [],
    ultimoNumero: 0,
    custom: [],
    prezzi: {},
    formazioni: [],
    impostazioni: { ...IMPOSTAZIONI_DI_PARTENZA },
  };
}

/** Quanto si aspetta prima di scrivere davvero: mezzo secondo. */
const ATTESA_MS = 500;

export class Deposito {
  private dati: DatiGiochi;
  private differita: ReturnType<typeof setTimeout> | null = null;
  private rotto = false;

  constructor(private file: string) {
    this.dati = this.carica();
  }

  /** Vero se il file su disco non si e' capito e non lo si tocca piu'. */
  get eRotto(): boolean {
    return this.rotto;
  }

  private get copia(): string {
    return this.file + ".bak";
  }

  private carica(): DatiGiochi {
    if (!existsSync(this.file)) return vuoto();
    try {
      return this.leggi(this.file);
    } catch (errore) {
      // Il file principale non si capisce: si prova la rete.
      if (existsSync(this.copia)) {
        try {
          const salvato = this.leggi(this.copia);
          console.error("[giochi] giochi.json non si capiva: ripreso dalla copia di sicurezza.");
          return salvato;
        } catch {
          /* rotta pure quella: si cade nel ramo qui sotto */
        }
      }
      this.rotto = true;
      console.error("[giochi] giochi.json non si capisce e non c'e' copia buona. Non si scrive piu'.", errore);
      return vuoto();
    }
  }

  /**
   * Legge un file e lo riporta alla forma di adesso.
   *
   * I campi mancanti si riempiono con i valori di partenza: un file scritto da
   * una versione di ieri deve aprirsi lo stesso, non dare errore. Ed e' anche
   * la ragione per cui le impostazioni si fondono invece di sostituirsi — il
   * giorno che se ne aggiunge una, chi gioca da prima non se la trova a zero.
   */
  private leggi(dove: string): DatiGiochi {
    const lette = JSON.parse(readFileSync(dove, "utf8")) as Partial<DatiGiochi>;
    if (typeof lette !== "object" || lette === null) throw new Error("non e' un oggetto");
    return {
      versione: 1,
      conti: Array.isArray(lette.conti) ? lette.conti : [],
      combinazioni: Array.isArray(lette.combinazioni) ? lette.combinazioni : [],
      ultimoNumero: typeof lette.ultimoNumero === "number" ? lette.ultimoNumero : 0,
      custom: Array.isArray(lette.custom) ? lette.custom : [],
      prezzi: typeof lette.prezzi === "object" && lette.prezzi !== null ? lette.prezzi : {},
      formazioni: Array.isArray(lette.formazioni) ? lette.formazioni : [],
      impostazioni: { ...IMPOSTAZIONI_DI_PARTENZA, ...(lette.impostazioni ?? {}) },
    };
  }

  /** Segna che qualcosa e' cambiato. Scrive fra mezzo secondo. */
  salva(): void {
    if (this.rotto || this.differita) return;
    this.differita = setTimeout(() => {
      this.differita = null;
      this.scriviOra();
    }, ATTESA_MS);
    // Un timer che tiene sveglio il processo per mezzo secondo alla chiusura
    // non serve a nessuno: se l'ambiente sa staccarlo, lo stacca.
    this.differita.unref?.();
  }

  /** Scrive adesso, senza aspettare. Si chiama quando la suite si chiude. */
  scriviOra(): void {
    if (this.rotto) return;
    if (this.differita) {
      clearTimeout(this.differita);
      this.differita = null;
    }
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      if (existsSync(this.file)) {
        try {
          copyFileSync(this.file, this.copia);
        } catch {
          /* la copia e' una rete, non un obbligo: se non si puo' fare si va avanti */
        }
      }
      const temporaneo = this.file + ".tmp";
      writeFileSync(temporaneo, JSON.stringify(this.dati, null, 2), "utf8");
      renameSync(temporaneo, this.file);
    } catch (errore) {
      console.error("[giochi] scrittura di giochi.json fallita", errore);
    }
  }

  /* ------------------------------------------------------------- da leggere */

  tutto(): DatiGiochi {
    return this.dati;
  }

  impostazioni(): Impostazioni {
    return this.dati.impostazioni;
  }

  custom(): Pezzo[] {
    return this.dati.custom;
  }

  prezzi(): Record<string, number> {
    return this.dati.prezzi;
  }

  formazioni(): Formazione[] {
    return this.dati.formazioni;
  }

  /**
   * Il conto di una persona. Se non c'e', nasce adesso col regalo iniziale.
   *
   * Nasce **leggendo**, non solo giocando: chi apre la sala giochi deve trovare
   * il gettone gia' in tasca, non una schermata che gli chiede di iscriversi.
   * Iscritto lo e' gia': ha il telefono accoppiato.
   */
  conto(chi: string): Conto {
    const gia = this.dati.conti.find((c) => c.chi === chi);
    if (gia) return gia;
    const nuovo: Conto = {
      chi,
      saldo: this.dati.impostazioni.regaloIniziale,
      giri: 0,
      vinteTot: 0,
      colpoGrosso: 0,
      mandate: 0,
      prese: 0,
      collezione: [],
      nato: Date.now(),
      ultimoGiro: 0,
    };
    this.dati.conti.push(nuovo);
    this.salva();
    return nuovo;
  }

  conti(): Conto[] {
    return this.dati.conti;
  }

  /* ------------------------------------------------------------ da cambiare */

  /**
   * Muove il saldo di una persona. Torna il conto aggiornato.
   *
   * ⚠ **Il saldo non va sotto zero.** Non e' una gentilezza: e' l'unico punto
   * in cui passano tutti i movimenti, e un debito in un gioco senza soldi veri
   * non vuol dire niente — vorrebbe solo dire che qualcuno, da qualche parte,
   * ha scalato due volte lo stesso giro.
   */
  muovi(chi: string, quanto: number): Conto {
    const conto = this.conto(chi);
    conto.saldo = Math.max(0, Math.round(conto.saldo + quanto));
    this.salva();
    return conto;
  }

  /** Segna un giro fatto, e quanto ha pagato. */
  segnaGiro(chi: string, vinto: number): Conto {
    const conto = this.conto(chi);
    conto.giri += 1;
    conto.ultimoGiro = Date.now();
    if (vinto > 0) {
      conto.vinteTot += vinto;
      if (vinto > conto.colpoGrosso) conto.colpoGrosso = vinto;
    }
    this.salva();
    return conto;
  }

  /** Mette una combinazione in collezione. Torna falso se ce l'aveva gia'. */
  colleziona(chi: string, idPezzo: string): boolean {
    const conto = this.conto(chi);
    if (conto.collezione.includes(idPezzo)) return false;
    conto.collezione.push(idPezzo);
    this.salva();
    return true;
  }

  /* --------------------------------------------------------- le combinazioni */

  combinazioni(): Combinazione[] {
    return this.dati.combinazioni;
  }

  /** Una combinazione per impronta: serve a non farne entrare due uguali. */
  perImpronta(impronta: string): Combinazione | undefined {
    return this.dati.combinazioni.find((c) => c.impronta === impronta);
  }

  perId(id: string): Combinazione | undefined {
    return this.dati.combinazioni.find((c) => c.id === id);
  }

  aggiungiCombinazione(c: Combinazione): Combinazione {
    this.dati.combinazioni.push(c);
    const conto = this.conto(c.daChi);
    conto.mandate += 1;
    this.salva();
    return c;
  }

  /**
   * Le combinazioni prese, in ordine di magazzino.
   *
   * E' il catalogo: quello che si sblocca giocando, quello che sta nei
   * pacchetti, quello che finisce nella suite.
   */
  magazzino(): Combinazione[] {
    return this.dati.combinazioni
      .filter((c) => c.stato === "presa")
      .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  }

  /** Il prossimo posto nel magazzino. Non riparte mai da capo. */
  prossimoNumero(): number {
    this.dati.ultimoNumero += 1;
    this.salva();
    return this.dati.ultimoNumero;
  }

  /* ------------------------------------------------------------ roba d'admin */

  cambiaPrezzo(idPezzo: string, lire: number | null): void {
    if (lire === null) delete this.dati.prezzi[idPezzo];
    else this.dati.prezzi[idPezzo] = Math.max(0, Math.round(lire));
    this.salva();
  }

  aggiungiCustom(pezzo: Pezzo): void {
    const gia = this.dati.custom.findIndex((p) => p.id === pezzo.id);
    if (gia >= 0) this.dati.custom[gia] = pezzo;
    else this.dati.custom.push(pezzo);
    this.salva();
  }

  togliCustom(idPezzo: string): void {
    this.dati.custom = this.dati.custom.filter((p) => p.id !== idPezzo);
    this.salva();
  }

  aggiungiFormazione(f: Formazione): void {
    const gia = this.dati.formazioni.findIndex((x) => x.id === f.id);
    if (gia >= 0) this.dati.formazioni[gia] = f;
    else this.dati.formazioni.push(f);
    this.salva();
  }

  togliFormazione(id: string): void {
    this.dati.formazioni = this.dati.formazioni.filter((f) => f.id !== id);
    this.salva();
  }

  cambiaImpostazioni(cambi: Partial<Impostazioni>): Impostazioni {
    this.dati.impostazioni = { ...this.dati.impostazioni, ...cambi };
    this.salva();
    return this.dati.impostazioni;
  }
}
