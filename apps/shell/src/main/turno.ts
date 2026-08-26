/**
 * Il turno della macchina: **chi ha il computer, adesso**.
 *
 * **Il difetto che questo file cura, detto da chi lo vive:** «voglio poter
 * gestire davvero tutto in tempo reale senza rischiare di caricare modelli
 * mentre si fanno altre cose», e «devo poter usare comunque il computer mentre
 * queste persone sono collegate».
 *
 * Fino alla 0.7.5 c'erano due file separate che non si conoscevano:
 *
 * - la **fila delle generazioni** (`esecuzione.ts`), seria, una per volta;
 * - le **domande al modello che scrive** (`llm.ts`), che non aveva fila
 *   nessuna: partivano tutte insieme, e ognuna prima di rispondere svuotava la
 *   memoria video — anche mentre una generazione la stava usando.
 *
 * Su una scheda da 8 GB questo non è un dettaglio di eleganza: è la ragione per
 * cui un video moriva a metà se qualcuno, nello stesso momento, chiedeva al
 * modello di riscrivere un prompt. Due code che non si parlano sono una coda
 * sola, mal fatta.
 *
 * ## L'idea, in una riga
 *
 * **La scheda video è una, quindi il turno è uno.** Chi vuole lavorare lo
 * chiede qui, aspetta, e quando tocca a lui è solo. Non importa se è una
 * generazione da mezz'ora o una domanda da tre secondi: nell'istante in cui
 * lavora, lavora da solo.
 *
 * ## Le tre cose che questo cambia, e che prima non si potevano fare
 *
 * **1. Il padrone di casa può passare davanti.** Chi sta al computer non deve
 * mettersi in fila dietro a tre telefoni per generare una cosa sua. Ha una
 * corsia — `subito` — e chi arriva da fuori non ce l'ha.
 *
 * **2. Si può mettere in pausa.** «Sto usando il computer»: un interruttore
 * che *non interrompe* quello che sta girando — buttare via mezz'ora di video
 * sarebbe peggio del problema — ma non ne fa cominciare altri. Si finisce
 * quello che c'è e ci si ferma.
 *
 * **3. Una chiacchierata può tenere il turno.** Il modello con cui si parla dal
 * telefono resta caricato per tutta la sessione invece di essere buttato fuori
 * e ricaricato a ogni frase: dieci minuti di conversazione sono **un** turno,
 * non trenta.
 *
 * ## Perché non usa `gpu.ts`
 *
 * `gpu.ts` risponde a un'altra domanda: *quale app tiene la scheda video*, e
 * spegne quella di prima quando ne apri un'altra. È una staffetta fra finestre.
 * Questo è una **fila di lavori**, con un'attesa vera e un ordine: chi chiede
 * il turno non vuole scalzare nessuno, vuole sapere quando tocca a lui.
 */

import { EventEmitter } from "node:events";
import { createLogger } from "./logging";

const log = createLogger("turno");
const annota = (riga: string): void => log.write(`${riga}\n`, false);

/** Che tipo di lavoro chiede il turno. */
export type Mestiere =
  /** Una generazione: immagine, video, brano, voce. Dura tanto. */
  | "generazione"
  /** Una domanda al modello che scrive: riscrivere, tradurre, rispondere. */
  | "modello"
  /** Una chiacchierata: tiene il turno finché dura la sessione. */
  | "chiacchierata";

/** Chi ha chiesto il turno, e con che diritto. */
export type Corsia =
  /** Chi sta al computer: passa davanti a tutti. */
  | "subito"
  /** Tutti gli altri, nell'ordine in cui sono arrivati. */
  | "in-fila";

/** Un posto in fila. Chi lo prende deve rilasciarlo, sempre. */
export interface Biglietto {
  id: string;
  mestiere: Mestiere;
  corsia: Corsia;
  /** Cosa scrivere accanto, per chi guarda il pannello. */
  che: string;
  /** Chi ha chiesto: il nome, non l'id. Vuoto se è la suite stessa. */
  chi: string;
  quando: number;
}

interface InFila extends Biglietto {
  parti: () => void;
  molla: (motivo: Error) => void;
  /** Oltre questo momento, aspettare non ha più senso: si molla. */
  scade: number;
}

/** Com'è messa la macchina adesso: lo mostrano il pannello e il telefono. */
export interface StatoTurno {
  /** Chi sta lavorando adesso, se c'è qualcuno. */
  adesso: Biglietto | null;
  /** Chi aspetta, nell'ordine in cui partirà. */
  fila: Biglietto[];
  /** In pausa: si finisce quello che c'è e non se ne comincia altro. */
  sospesa: boolean;
  /** Perché è in pausa, se qualcuno l'ha detto. */
  motivoSospensione?: string;
}

/**
 * Quanto può aspettare un lavoro prima di arrendersi.
 *
 * Serve solo a **non lasciare in fila un morto**: chi chiude la pagina o
 * spegne il telefono mentre aspetta lascerebbe altrimenti un posto occupato per
 * sempre. Mezz'ora è più di una generazione lunga; oltre, quel posto non lo
 * vuole più nessuno.
 */
const ATTESA_MASSIMA_MS = 30 * 60_000;

/**
 * Quanto può tenere il turno un lavoro, prima che lo si consideri piantato.
 *
 * **È la rete sotto, e senza non c'è affidabilità nel tempo.** Un turno si
 * rilascia in un `finally`, quindi in teoria non si perde mai; in pratica un
 * processo che muore male, una promessa che non si risolve o un errore in un
 * punto sbagliato lascerebbero la fila bloccata *per sempre*, e da fuori
 * sembrerebbe un programma che ha smesso di funzionare senza dire niente.
 * Scaduto questo tempo il turno si toglie d'ufficio e la fila riparte.
 */
const TURNO_MASSIMO_MS: Record<Mestiere, number> = {
  // Un video lungo sul motore lento ci mette anche quaranta minuti.
  generazione: 60 * 60_000,
  // Una risposta del modello: se ci mette più di cinque minuti è piantata.
  modello: 5 * 60_000,
  // Una chiacchierata dura dieci minuti; un po' di margine e poi basta.
  chiacchierata: 15 * 60_000,
};

/**
 * Chi sa dire se il motore sta già generando **per conto suo**.
 *
 * Serve per un caso che questa fila da sola non vedrebbe: chi sta al computer
 * apre DaProdFoto e preme Genera. Quel lavoro non passa da qui — va dalla
 * finestra dritto al motore — ma occupa la scheda video esattamente come gli
 * altri. Senza questa domanda, il modello che scrive si caricherebbe in mezzo a
 * una generazione fatta a mano e la farebbe morire nel VAE: è il guasto che
 * `faiSpazio` cura dall'altra parte, e questa è la stessa cura vista da qui.
 *
 * Torna vero se il motore ha qualcosa in mano. Nel dubbio dica **vero**: fra
 * aspettare qualche secondo di troppo e ammazzare un video a metà, non c'è
 * partita.
 */
export type Guardia = () => Promise<boolean>;

/** Ogni quanto si torna a chiedere alla guardia, mentre si aspetta. */
const RIPROVA_GUARDIA_MS = 4000;

/**
 * Quanto si sta dietro alla guardia prima di partire lo stesso.
 *
 * Una generazione fatta a mano dura quanto dura, e un modello che non risponde
 * mai «adesso sono libero» bloccherebbe la fila per sempre. Dopo dieci minuti
 * si parte comunque: al massimo si genera più piano, che è meglio di non
 * generare mai.
 */
const PAZIENZA_GUARDIA_MS = 10 * 60_000;

class Turno extends EventEmitter {
  private adesso: InFila | null = null;
  private fila: InFila[] = [];
  private sospesa = false;
  private motivoSospensione: string | undefined;
  private contatore = 0;
  private sveglia: NodeJS.Timeout | null = null;
  private guardia: Guardia | null = null;
  /** Un giro di fila alla volta: `giraLaFila` aspetta, e può essere richiamata. */
  private staGirando = false;
  private daRigirare = false;

  /** Chi sa dire se il motore è occupato da una generazione fatta a mano. */
  metteGuardia(guardia: Guardia | null): void {
    this.guardia = guardia;
  }

  /* ------------------------------------------------------------- lo stato */

  stato(): StatoTurno {
    return {
      adesso: this.adesso ? nudo(this.adesso) : null,
      fila: this.fila.map(nudo),
      sospesa: this.sospesa,
      motivoSospensione: this.motivoSospensione,
    };
  }

  /** Quanti aspettano, di questo mestiere. Serve ai numeri del pannello. */
  quantiInFila(mestiere?: Mestiere): number {
    return mestiere ? this.fila.filter((r) => r.mestiere === mestiere).length : this.fila.length;
  }

  /** Sta lavorando qualcosa di questo tipo adesso? */
  staFacendo(mestiere: Mestiere): boolean {
    return this.adesso?.mestiere === mestiere;
  }

  /* --------------------------------------------------------- la sospensione */

  /**
   * «Sto usando il computer»: non partono lavori nuovi.
   *
   * **Non interrompe quello che sta girando**, e non è indecisione: fermare a
   * metà una generazione da mezz'ora vuol dire buttarla via, e chi preme questo
   * tasto vuole il computer *adesso*, non vuole distruggere il lavoro di
   * qualcuno. Si finisce quello che c'è, e da lì in poi si aspetta.
   */
  sospendi(sospesa: boolean, motivo?: string): void {
    if (this.sospesa === sospesa) return;
    this.sospesa = sospesa;
    this.motivoSospensione = sospesa ? motivo : undefined;
    annota(sospesa ? `in pausa: ${motivo ?? "chiesto dal computer"}` : "ripartita");
    this.cambiato();
    if (!sospesa) void this.giraLaFila();
  }

  eSospesa(): boolean {
    return this.sospesa;
  }

  /* ---------------------------------------------------------- prendere il turno */

  /**
   * Si mette in fila e aspetta che tocchi a lui.
   *
   * Torna il biglietto quando è il momento di lavorare. **Chi lo prende deve
   * chiamare `rilascia`**, e deve farlo in un `finally`: un turno non rilasciato
   * è una fila ferma.
   */
  async prendi(richiesta: {
    mestiere: Mestiere;
    corsia?: Corsia;
    che: string;
    chi?: string;
    /** Si arrende dopo questo tempo invece di aspettare il massimo. */
    attesaMassimaMs?: number;
  }): Promise<Biglietto> {
    this.contatore += 1;
    const attesa = richiesta.attesaMassimaMs ?? ATTESA_MASSIMA_MS;

    return new Promise<Biglietto>((parti, molla) => {
      const posto: InFila = {
        id: `t${this.contatore}`,
        mestiere: richiesta.mestiere,
        corsia: richiesta.corsia ?? "in-fila",
        che: richiesta.che,
        chi: richiesta.chi ?? "",
        quando: Date.now(),
        scade: Date.now() + attesa,
        parti: () => parti(nudo(posto)),
        molla,
      };

      /**
       * La corsia `subito` entra **davanti a chi aspetta**, non davanti a chi
       * sta lavorando: scalzare un lavoro a metà lo butterebbe via. Si mette
       * dopo gli altri `subito` già in fila, che è l'unico ordine onesto fra
       * due lavori dello stesso padrone.
       */
      if (posto.corsia === "subito") {
        const ultimoDeiSuoi = this.fila.findLastIndex((r) => r.corsia === "subito");
        this.fila.splice(ultimoDeiSuoi + 1, 0, posto);
      } else {
        this.fila.push(posto);
      }

      annota(
        `in fila ${posto.id}: ${posto.mestiere} — ${posto.che}` +
          (posto.chi ? ` (${posto.chi})` : "") +
          (posto.corsia === "subito" ? " [passa davanti]" : ""),
      );
      this.cambiato();
      void this.giraLaFila();
    });
  }

  /**
   * Ha finito: il prossimo può partire.
   *
   * Accetta anche un biglietto già rilasciato o scaduto senza lamentarsi: chi
   * chiama sta quasi sempre in un `finally`, e un `finally` non deve dover
   * sapere se il turno è ancora suo.
   */
  rilascia(biglietto: Biglietto | null | undefined): void {
    if (!biglietto) return;
    if (this.adesso?.id !== biglietto.id) return;
    annota(`finito ${biglietto.id}: ${biglietto.che}`);
    this.adesso = null;
    this.fermaSveglia();
    this.cambiato();
    void this.giraLaFila();
  }

  /**
   * Toglie dalla fila un lavoro che non serve più.
   *
   * Chi ha annullato una richiesta non deve vedere il computer accendersi fra
   * un quarto d'ora per un lavoro di cui non gliene importa più niente.
   */
  annulla(id: string, motivo = "annullato"): boolean {
    const dove = this.fila.findIndex((r) => r.id === id);
    if (dove < 0) return false;
    const [via] = this.fila.splice(dove, 1);
    via?.molla(new Error(motivo));
    this.cambiato();
    return true;
  }

  /* --------------------------------------------------------- il meccanismo */

  private async giraLaFila(): Promise<void> {
    // Un giro alla volta. Dentro si aspetta la guardia, cioè si cede il
    // controllo: senza questo, due chiamate ravvicinate darebbero il turno a
    // due lavori insieme — che è esattamente la cosa che questo file esiste per
    // impedire.
    if (this.staGirando) {
      this.daRigirare = true;
      return;
    }
    this.staGirando = true;
    try {
      do {
        this.daRigirare = false;
        await this.unGiro();
      } while (this.daRigirare);
    } finally {
      this.staGirando = false;
    }
  }

  private async unGiro(): Promise<void> {
    this.scartaGliScaduti();
    if (this.adesso) return;
    if (this.sospesa) return;

    const prossimo = this.fila[0];
    if (!prossimo) return;

    /**
     * **Il motore sta già lavorando per chi sta al computer?** Allora si
     * aspetta, e non si toglie niente dalla fila: se nel frattempo arriva un
     * lavoro della corsia `subito` deve poter passare davanti a questo.
     */
    if (await this.aspettaLaGuardia(prossimo)) return;

    // Rileggere la testa della fila: mentre si aspettava può essere cambiata.
    const tocca = this.fila.shift();
    if (!tocca) return;
    if (this.sospesa || this.adesso) {
      this.fila.unshift(tocca);
      return;
    }

    this.adesso = tocca;
    this.armaSveglia(tocca);
    annota(`tocca a ${tocca.id}: ${tocca.che}`);
    this.cambiato();
    tocca.parti();
  }

  /**
   * Aspetta che il motore sia libero. Torna vero se conviene rifare il giro.
   *
   * Solo per chi deve **caricare un modello**: una generazione della fila apre
   * la sua scheda e ci pensa lei, e farla aspettare dietro a un lavoro fatto a
   * mano nella stessa scheda vorrebbe dire non partire mai.
   */
  private async aspettaLaGuardia(posto: InFila): Promise<boolean> {
    if (!this.guardia) return false;
    if (posto.mestiere === "generazione") return false;

    const finoA = Date.now() + PAZIENZA_GUARDIA_MS;
    let detto = false;
    while (Date.now() < finoA) {
      let occupato: boolean;
      try {
        occupato = await this.guardia();
      } catch {
        // La guardia non sa rispondere: meglio partire che restare fermi.
        return false;
      }
      if (!occupato) return false;
      if (!detto) {
        annota(`${posto.id} aspetta: il motore sta generando per chi è al computer`);
        detto = true;
      }
      await new Promise((r) => setTimeout(r, RIPROVA_GUARDIA_MS));
      // La fila può essere cambiata mentre aspettavamo: si rifà il giro da capo.
      if (this.fila[0]?.id !== posto.id) return true;
      if (this.sospesa) return true;
    }
    annota(`${posto.id} ha aspettato abbastanza il motore: parte lo stesso`);
    return false;
  }

  /** Chi aspetta da troppo se ne va da solo, invece di occupare un posto morto. */
  private scartaGliScaduti(): void {
    const adesso = Date.now();
    const scaduti = this.fila.filter((r) => r.scade < adesso);
    if (!scaduti.length) return;
    this.fila = this.fila.filter((r) => r.scade >= adesso);
    for (const r of scaduti) {
      annota(`scaduto in fila ${r.id}: ${r.che}`);
      r.molla(new Error("Ha aspettato troppo il suo turno e si è annullato."));
    }
  }

  /**
   * La sveglia sul turno in corso: se non si rilascia da solo, lo si toglie.
   *
   * È la sola difesa contro un turno perso, e un turno perso è una fila ferma
   * per sempre. Meglio una generazione dichiarata piantata a torto — capita, e
   * il file che ne esce resta in libreria comunque — che un programma che smette
   * di rispondere e non lo dice a nessuno.
   */
  private armaSveglia(posto: InFila): void {
    this.fermaSveglia();
    this.sveglia = setTimeout(() => {
      if (this.adesso?.id !== posto.id) return;
      annota(`turno ${posto.id} scaduto (${posto.che}): lo tolgo e faccio ripartire la fila`);
      this.adesso = null;
      this.cambiato();
      void this.giraLaFila();
    }, TURNO_MASSIMO_MS[posto.mestiere]);
    // Un timer da un'ora non deve tenere in vita il processo da solo.
    this.sveglia.unref?.();
  }

  private fermaSveglia(): void {
    if (this.sveglia) clearTimeout(this.sveglia);
    this.sveglia = null;
  }

  private cambiato(): void {
    this.emit("cambiato", this.stato());
  }
}

const nudo = (r: InFila | Biglietto): Biglietto => ({
  id: r.id,
  mestiere: r.mestiere,
  corsia: r.corsia,
  che: r.che,
  chi: r.chi,
  quando: r.quando,
});

export const turno = new Turno();

/**
 * Prende il turno, fa il lavoro, e lo rilascia **sempre**.
 *
 * Il modo giusto di usare questo file: chi scrive `turno.prendi()` a mano prima
 * o poi dimentica un `finally`, e quel giorno la suite si ferma. Qui il
 * `finally` c'è già.
 */
export async function colTurno<T>(
  richiesta: Parameters<Turno["prendi"]>[0],
  lavoro: (biglietto: Biglietto) => Promise<T>,
): Promise<T> {
  const biglietto = await turno.prendi(richiesta);
  try {
    return await lavoro(biglietto);
  } finally {
    turno.rilascia(biglietto);
  }
}
