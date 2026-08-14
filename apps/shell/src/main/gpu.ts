/**
 * Arbitro della GPU.
 *
 * La macchina di riferimento ha una RTX 4060 da 8 GB: ci sta un modello pesante
 * alla volta e basta. Se apri DaProdFoto mentre DaProdMusica tiene MiniMax Music 3
 * in VRAM, la seconda generazione muore per out-of-memory.
 *
 * Quindi: chi vuole la GPU la chiede qui, e chi la teneva prima viene spento.
 * Un solo detentore per volta fra le app marcate `gpuHeavy`.
 */

import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppId, GpuState } from "@daprod/ipc";

const execFileAsync = promisify(execFile);

class GpuArbiter extends EventEmitter {
  private holder: AppId | null = null;
  private usedMb: number | undefined;
  private totalMb: number | undefined;
  private timer: NodeJS.Timeout | null = null;

  getState(): GpuState {
    return { holder: this.holder, usedMb: this.usedMb, totalMb: this.totalMb };
  }

  /**
   * Concede la GPU a `id`. Se la teneva un'altra app, `release` viene invocata
   * per spegnerla prima di restituire il controllo.
   */
  async acquire(id: AppId, release: (previous: AppId) => Promise<void>): Promise<void> {
    if (this.holder === id) return;
    if (this.holder !== null) {
      await release(this.holder);
    }
    this.holder = id;
    this.emitState();
  }

  release(id: AppId): void {
    if (this.holder !== id) return;
    this.holder = null;
    this.emitState();
  }

  /** Legge memoria usata e totale da nvidia-smi. Assente su macchine senza NVIDIA. */
  async probe(): Promise<void> {
    try {
      const { stdout } = await execFileAsync("nvidia-smi", [
        "--query-gpu=memory.used,memory.total",
        "--format=csv,noheader,nounits",
      ]);
      const [used, total] = stdout.trim().split("\n")[0]!.split(",").map((v) => Number(v.trim()));
      this.usedMb = used;
      this.totalMb = total;
      this.emitState();
    } catch {
      // Nessuna GPU NVIDIA o driver assenti: si resta senza numeri, non è fatale.
      this.usedMb = undefined;
      this.totalMb = undefined;
    }
  }

  startPolling(intervalMs = 4000): void {
    if (this.timer) return;
    void this.probe();
    this.timer = setInterval(() => void this.probe(), intervalMs);
  }

  stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private emitState(): void {
    this.emit("changed", this.getState());
  }
}

export const gpu = new GpuArbiter();
