/**
 * Prova l'installazione di un nodo custom del motore, senza passare da Electron.
 *
 *   pnpm --filter @daprod/runtime build
 *   node packages/runtime/scripts/prova-nodo.cjs
 *
 * Installa per davvero ComfyUI-GGUF — il nodo che serve a FLUX.2 Klein — in una
 * cartella temporanea che cancella alla fine. Le librerie Python invece
 * finiscono nell'**ambiente condiviso vero**, perché è lì che devono stare: sono
 * quelle che il motore userà quando aprirà un GGUF, e sono una decina di MB.
 *
 * Le quattro cose che prova sono quelle che possono rompersi in silenzio:
 *
 * 1. **Lo zip del commit fissato** esiste ancora e contiene quello che diciamo.
 * 2. **Il nodo finisce dove il motore lo cerca**, cioè in `custom_nodes/<nome>`.
 * 3. **La versione resta scritta**: è così che si riconosce un nodo vecchio da
 *    rifare quando qui dentro cambiamo il commit.
 * 4. **La seconda installazione non fa niente**: premere due volte non deve
 *    ripagare lo scaricamento né rifare le pip install.
 */

const { existsSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { NODI, cartellaNodi, installaNodo, nodoPresente } = require("../dist/index.js");

const ID = "comfyui-gguf";
const NODO = NODI[ID];

const RADICE = join(process.env.LOCALAPPDATA, "DaProdSuite");
const RUNTIME_DIR = join(RADICE, "runtime");
const TOOLS_DIR = join(RADICE, "tools");

const engines = mkdtempSync(join(tmpdir(), "daprod-nodi-"));
let falliti = 0;

function esito(ok, cosa, dettaglio = "") {
  console.log(`${ok ? "  OK  " : " ROTTO"} ${cosa}${dettaglio ? " — " + dettaglio : ""}`);
  if (!ok) falliti++;
}

(async () => {
  console.log(`Cartella di prova: ${engines}`);
  console.log(`${NODO.nome} @ ${NODO.commit.slice(0, 7)} (${NODO.licenza})`);

  try {
    esito(!nodoPresente(engines, ID), "prima non c'è");

    const passi = [];
    await installaNodo(ID, {
      enginesDir: engines,
      runtimeDir: RUNTIME_DIR,
      toolsDir: TOOLS_DIR,
      onLine: (riga) => console.log("       " + riga),
      onPasso: (etichetta) => passi.push(etichetta),
    });

    const cartella = join(cartellaNodi(engines), NODO.nome);
    esito(existsSync(join(cartella, "__init__.py")), "il nodo è al suo posto", cartella);
    esito(existsSync(join(cartella, "nodes.py")), "ci sono i suoi file, non solo la cartella");
    esito(
      readFileSync(join(cartella, ".daprod-versione"), "utf8").trim() === NODO.commit,
      "la versione installata resta scritta accanto al nodo",
    );
    esito(nodoPresente(engines, ID), "adesso risulta presente");
    esito(passi.length > 0, "ha raccontato cosa stava facendo", passi.join(" · "));

    // Seconda volta: deve accorgersene e fermarsi subito.
    const inizio = Date.now();
    await installaNodo(ID, {
      enginesDir: engines,
      runtimeDir: RUNTIME_DIR,
      toolsDir: TOOLS_DIR,
      onLine: (riga) => console.log("       " + riga),
    });
    const durata = Date.now() - inizio;
    esito(durata < 2000, "la seconda volta non rifà niente", `${durata} ms`);

    // Una versione diversa da quella fissata deve farlo risultare da rifare:
    // è il caso di chi ha installato il nodo prima che noi cambiassimo commit.
    require("node:fs").writeFileSync(join(cartella, ".daprod-versione"), "vecchio\n");
    esito(!nodoPresente(engines, ID), "un nodo di un'altra versione risulta da rifare");
  } catch (err) {
    esito(false, "prova interrotta", err.message);
  } finally {
    rmSync(engines, { recursive: true, force: true });
  }

  console.log(falliti === 0 ? "\nTutto a posto." : `\n${falliti} controlli falliti.`);
  process.exit(falliti === 0 ? 0 : 1);
})();
