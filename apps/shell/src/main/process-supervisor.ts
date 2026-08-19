/**
 * Sorveglia un servizio Python figlio: avvio, attesa che risponda, riavvio con
 * backoff se muore da solo, spegnimento pulito.
 *
 * Viene da DaProdCompanion, dove faceva già esattamente questo per brain/stt/tts.
 * Qui diventa il modo unico in cui la suite parla con i suoi motori: ogni
 * servizio espone /health e /shutdown, e questo codice non ha bisogno di sapere
 * altro. Cambia solo la ServiceConfig.
 */

import { spawn, type ChildProcess } from "node:child_process";
import type { ServiceLogger } from "./logging";

/**
 * Quante righe di stderr tenere da parte per raccontare una morte in avvio.
 * Un traceback di Python sta in molto meno: quello che serve è la sua ultima riga.
 */
const RIGHE_RICORDATE = 40;

/**
 * Vero se questa morte parla di **librerie**, non del motore.
 *
 * Un `ImportError` in un motore vuol dire quasi sempre una cosa sola:
 * l'ambiente Python condiviso è rimasto a metà fra due versioni, di solito dopo
 * un'installazione andata storta. È la firma della notte del 19 agosto 2026,
 * quando quattro app hanno smesso di aprirsi insieme e nessuna delle quattro
 * era il problema.
 *
 * Lo usano in due: qui, per aggiungere alla frase cosa si può fare, e
 * `app-manager.ts`, per andare a **guardare l'ambiente da solo** invece di
 * aspettare che sia l'utente a premere «Controlla». Una regola sola, in un
 * posto solo: se un giorno impariamo a riconoscere un'altra firma si aggiunge
 * qui, e la sanno tutti e due.
 */
export function sembraProblemaDiAmbiente(motivo: string): boolean {
  return /ImportError|ModuleNotFoundError|cannot import name|DLL load failed|undefined symbol/i.test(
    motivo,
  );
}

export interface ServiceConfig {
  name: string;
  pythonExecutable: string;
  args: string[];
  cwd: string;
  healthUrl: string;
  shutdownUrl: string;
  env: NodeJS.ProcessEnv;
  logger: ServiceLogger;
  /**
   * Quanto aspettare che /health risponda. Va alzato per i motori che caricano
   * pesi pesanti al primo avvio: MiniMax Music 3 e SoulX-FlashHead ci mettono
   * minuti, non secondi.
   */
  healthTimeoutMs?: number;
  /** Notificato quando il processo muore e non si riesce più a riavviarlo. */
  onFatal?: (reason: string) => void;
}

export class ProcessSupervisor {
  private child: ChildProcess | null = null;
  private restartAttempts = 0;
  private readonly maxRestartAttempts = 3;
  private stoppedIntentionally = false;

  constructor(private readonly config: ServiceConfig) {}

  private ultimeRighe: string[] = [];
  /** Si risolve quando il processo e' finito **e** i suoi stream sono chiusi. */
  private chiuso: Promise<void> = Promise.resolve();

  get running(): boolean {
    return this.child !== null && this.child.exitCode === null;
  }

  async start(): Promise<void> {
    this.stoppedIntentionally = false;
    this.spawnProcess();
    await this.waitForHealth(this.config.healthTimeoutMs ?? 30_000);
    this.restartAttempts = 0;
  }

  private spawnProcess(): void {
    this.child = spawn(this.config.pythonExecutable, this.config.args, {
      cwd: this.config.cwd,
      env: this.config.env,
      windowsHide: true,
    });

    // `exit` arriva **prima** che le ultime righe di stderr siano state lette:
    // sono due code diverse, e un processo che muore in avvio le scrive proprio
    // nell'istante in cui esce. Senza aspettare `close` — che è l'evento che
    // garantisce gli stream finiti — il messaggio all'utente uscirebbe vuoto
    // proprio nel caso in cui serve. Provato: senza questa attesa la scheda
    // diceva ancora "Controlla il log".
    this.chiuso = new Promise((risolvi) => this.child?.once("close", () => risolvi()));

    this.child.stdout?.on("data", (chunk) => this.config.logger.write(chunk, false));
    this.child.stderr?.on("data", (chunk) => {
      this.config.logger.write(chunk, true);
      this.ricorda(String(chunk));
    });

    this.child.on("exit", (code) => {
      if (this.stoppedIntentionally) return;

      this.config.logger.write(`processo terminato inaspettatamente (code=${code})\n`, true);

      if (this.restartAttempts >= this.maxRestartAttempts) {
        const reason = `${this.config.name} è morto ${this.restartAttempts} volte di fila. ${this.spiegazione()}`;
        this.config.logger.write(`${reason}\n`, true);
        this.config.onFatal?.(reason);
        return;
      }
      this.restartAttempts += 1;
      const delayMs = Math.min(1000 * 2 ** this.restartAttempts, 30_000);
      setTimeout(() => this.spawnProcess(), delayMs);
    });
  }

  /**
   * Tiene da parte le ultime righe che il motore ha scritto su stderr.
   *
   * Ne bastano poche: quello che serve è l'ultima riga di un traceback, che è
   * dove Python scrive **cosa** è andato storto. Tutto il resto sta nel log.
   */
  private ricorda(testo: string): void {
    for (const riga of testo.split("\n")) {
      const pulita = riga.trim();
      if (pulita) this.ultimeRighe.push(pulita);
    }
    if (this.ultimeRighe.length > RIGHE_RICORDATE) {
      this.ultimeRighe.splice(0, this.ultimeRighe.length - RIGHE_RICORDATE);
    }
  }

  /**
   * Cosa dire all'utente quando il motore muore in avvio.
   *
   * **Prima diceva «Controlla il log».** La sera del 19 agosto 2026 quattro app
   * hanno smesso di funzionare insieme e sulla scheda si leggeva solo quello,
   * mentre a due passi — nel file — c'era scritto per esteso: `ImportError:
   * cannot import name 'BucketNotFoundError'`. Il perché esisteva già, mancava
   * solo qualcuno che lo portasse dove l'utente stava guardando.
   *
   * Un `ImportError` in un motore vuol dire quasi sempre una cosa sola:
   * l'ambiente Python condiviso è rimasto a metà fra due versioni, di solito
   * dopo un'installazione andata storta. Lì la frase dice anche cosa fare.
   */
  private spiegazione(): string {
    const errore = [...this.ultimeRighe]
      .reverse()
      .find((riga) => /^[A-Za-z_.]*(Error|Exception)\b/.test(riga));

    if (!errore) return "Controlla il log.";

    if (sembraProblemaDiAmbiente(errore)) {
      return (
        `${errore} — l'ambiente Python della suite è incoerente, di solito dopo ` +
        "un'installazione interrotta. Sto guardando cosa non torna; " +
        "«Ripara l'ambiente» rimette a posto i pacchetti e non tocca i modelli."
      );
    }
    return errore;
  }

  private async waitForHealth(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      // Se il processo è già morto in avvio, aspettare il timeout è tempo buttato.
      if (this.child && this.child.exitCode !== null) {
        // ...ma le sue ultime righe vanno lette prima di raccontare com'è
        // andata, se no si finisce a dire "Controlla il log" avendo l'errore
        // vero in mano un millisecondo dopo.
        await this.chiuso;
        throw new Error(
          `${this.config.name} si è chiuso durante l'avvio. ${this.spiegazione()}`,
        );
      }
      try {
        const res = await fetch(this.config.healthUrl);
        if (res.ok) return;
      } catch {
        // non ancora pronto, si ritenta
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(
      `${this.config.name} non ha risposto a ${this.config.healthUrl} entro ${Math.round(timeoutMs / 1000)}s.`,
    );
  }

  async stop(): Promise<void> {
    this.stoppedIntentionally = true;
    if (!this.child) return;

    try {
      await fetch(this.config.shutdownUrl, { method: "POST" });
    } catch {
      // può essere già morto o non ancora pronto: si passa al kill
    }
    await this.waitForExit(5000);
    if (this.child && this.child.exitCode === null) {
      this.child.kill();
    }
    this.child = null;
    this.config.logger.close();
  }

  private async waitForExit(timeoutMs: number): Promise<void> {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
