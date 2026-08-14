/**
 * Stato dell'ambiente Python condiviso.
 *
 * Una sola installazione di Python + torch per tutta la suite, in
 * %LOCALAPPDATA%\DaProdSuite\runtime. Prima di questa suite le sei app avevano
 * quattro venv separati con quattro versioni diverse di torch, per 14,7 GB di
 * roba quasi identica.
 *
 * La creazione vera dell'ambiente sta in @daprod/runtime; qui si tiene lo stato
 * e lo si racconta all'interfaccia mentre succede.
 */

import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { installRuntime } from "@daprod/runtime";
import type { RuntimeState } from "@daprod/ipc";
import { createLogger } from "./logging";
import { BASE_REQUIREMENTS, PYTHON_EXE, RUNTIME_DIR, TOOLS_DIR } from "./paths";

const execFileAsync = promisify(execFile);

/** Interrogazione unica: versione di Python, di torch e disponibilità CUDA. */
const PROBE_SCRIPT = `
import json, sys
out = {"python": ".".join(map(str, sys.version_info[:3]))}
try:
    import torch
    out["torch"] = torch.__version__
    out["cuda"] = torch.cuda.is_available()
    if out["cuda"]:
        out["gpu"] = torch.cuda.get_device_name(0)
        out["gpu_mb"] = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
except Exception as exc:
    out["torch_error"] = str(exc)
print(json.dumps(out))
`;

class Runtime extends EventEmitter {
  private state: RuntimeState = { ready: false };
  private installazione: Promise<void> | null = null;

  getState(): RuntimeState {
    return this.state;
  }

  /**
   * Crea l'ambiente condiviso. Dura minuti e scarica ~3 GB, quindi non blocca
   * nulla: emette avanzamento e chi ha chiamato può andarsene.
   *
   * Due chiamate insieme condividono la stessa installazione: due `uv pip
   * install` sullo stesso venv si pesterebbero i piedi.
   */
  async install(): Promise<void> {
    if (this.installazione) return this.installazione;

    const logger = createLogger("runtime");
    const righe: string[] = [];

    const aggiungiRiga = (line: string) => {
      logger.write(line + "\n", false);
      righe.push(line);
      // All'interfaccia bastano le ultime: il log completo è su file.
      if (righe.length > 12) righe.shift();
      this.patch({ log: [...righe] });
    };

    this.installazione = (async () => {
      try {
        this.patch({ error: undefined, installing: { step: 0, total: 4, label: "Preparo…" } });

        await installRuntime({
          runtimeDir: RUNTIME_DIR,
          toolsDir: TOOLS_DIR,
          baseRequirements: BASE_REQUIREMENTS,
          onProgress: (installing) => this.patch({ installing }),
          onLine: aggiungiRiga,
        });

        this.patch({ installing: undefined });
        await this.refresh();
      } catch (err) {
        const messaggio = err instanceof Error ? err.message : String(err);
        aggiungiRiga(`ERRORE: ${messaggio}`);
        this.patch({ installing: undefined, ready: false, error: messaggio });
      } finally {
        logger.close();
        this.installazione = null;
      }
    })();

    return this.installazione;
  }

  /** Controlla se l'ambiente esiste e se torch vede la GPU. */
  async refresh(): Promise<RuntimeState> {
    if (!existsSync(PYTHON_EXE)) {
      return this.patch({ ready: false });
    }

    try {
      const { stdout } = await execFileAsync(PYTHON_EXE, ["-c", PROBE_SCRIPT], {
        timeout: 60_000,
      });
      const probe = JSON.parse(stdout) as {
        python: string;
        torch?: string;
        cuda?: boolean;
        gpu?: string;
        gpu_mb?: number;
      };

      return this.patch({
        // Senza torch l'ambiente c'è ma non serve a niente: non è pronto.
        ready: Boolean(probe.torch),
        pythonVersion: probe.python,
        torchVersion: probe.torch,
        cudaAvailable: probe.cuda,
        gpuName: probe.gpu,
        gpuTotalMb: probe.gpu_mb,
      });
    } catch {
      return this.patch({ ready: false });
    }
  }

  /**
   * Aggiorna solo i campi passati. Sostituire lo stato intero cancellerebbe il
   * log dell'installazione al primo `refresh`, proprio quando serve leggerlo.
   */
  private patch(partial: Partial<RuntimeState>): RuntimeState {
    this.state = { ...this.state, ...partial };
    this.emit("changed", this.state);
    return this.state;
  }
}

export const runtime = new Runtime();
