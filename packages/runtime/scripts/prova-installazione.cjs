/**
 * Prova l'installazione dell'ambiente condiviso senza passare da Electron.
 *
 *   pnpm --filter @daprod/runtime build
 *   node packages/runtime/scripts/prova-installazione.cjs
 *
 * Usa le stesse cartelle della suite, quindi l'ambiente che crea è esattamente
 * quello che userà l'app. Serve per iterare in fretta quando qualcosa non va:
 * riavviare Electron per ogni tentativo costa troppo.
 */

const { join } = require("node:path");
const { installRuntime } = require("../dist/index.js");

const DATA_ROOT = join(process.env.LOCALAPPDATA, "DaProdSuite");

installRuntime({
  runtimeDir: join(DATA_ROOT, "runtime"),
  toolsDir: join(DATA_ROOT, "tools"),
  baseRequirements: join(__dirname, "..", "requirements", "base.txt"),
  onProgress: ({ step, total, label }) => console.log(`\n[${step}/${total}] ${label}`),
  onLine: (line) => console.log("   " + line),
})
  .then(() => console.log("\nOK — ambiente pronto."))
  .catch((err) => {
    console.error("\nFALLITO:", err.message);
    if (err.tail?.length) {
      console.error("\nUltime righe:");
      for (const riga of err.tail) console.error("   " + riga);
    }
    process.exit(1);
  });
