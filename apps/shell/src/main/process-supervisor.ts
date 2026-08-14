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

    this.child.stdout?.on("data", (chunk) => this.config.logger.write(chunk, false));
    this.child.stderr?.on("data", (chunk) => this.config.logger.write(chunk, true));

    this.child.on("exit", (code) => {
      if (this.stoppedIntentionally) return;

      this.config.logger.write(`processo terminato inaspettatamente (code=${code})\n`, true);

      if (this.restartAttempts >= this.maxRestartAttempts) {
        const reason = `${this.config.name} è morto ${this.restartAttempts} volte di fila, mi fermo. Controlla il log.`;
        this.config.logger.write(`${reason}\n`, true);
        this.config.onFatal?.(reason);
        return;
      }
      this.restartAttempts += 1;
      const delayMs = Math.min(1000 * 2 ** this.restartAttempts, 30_000);
      setTimeout(() => this.spawnProcess(), delayMs);
    });
  }

  private async waitForHealth(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      // Se il processo è già morto in avvio, aspettare il timeout è tempo buttato.
      if (this.child && this.child.exitCode !== null) {
        throw new Error(
          `${this.config.name} si è chiuso durante l'avvio (code=${this.child.exitCode}). Controlla il log.`,
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
