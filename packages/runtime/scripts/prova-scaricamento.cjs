/**
 * Prova lo scaricamento dei modelli senza passare da Electron.
 *
 *   pnpm --filter @daprod/runtime build
 *   node packages/runtime/scripts/prova-scaricamento.cjs
 *
 * Scarica per davvero, da HuggingFace, in una cartella temporanea che cancella
 * alla fine: non tocca i modelli della suite.
 *
 * Le tre cose che prova sono le tre che possono rompersi in silenzio:
 *
 * 1. **La ripresa.** Interrompe a metà, controlla che resti un `.parte`, e
 *    riparte: se il server ignorasse il `Range` o noi scrivessimo in coda senza
 *    accorgercene, verrebbe fuori un file lungo il doppio — e la prova lo vede,
 *    perché confronta i byte finali con quelli del catalogo.
 * 2. **L'annullamento.** Deve fermarsi subito e lasciare il pezzo sul disco.
 * 3. **I repo HuggingFace**, con i pattern `include`: quelli passano da
 *    `snapshot_download` dentro il Python condiviso, che è un altro programma
 *    con altre regole.
 */

const { mkdtempSync, rmSync, statSync, existsSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { scaricaFile, scaricaRepo, ScaricamentoAnnullato } = require("../dist/index.js");

const CATALOGO = require("../../../manifest/models.json").models;

/** Il più piccolo dei modelli veri: 253 MB, abbastanza per riprendersi a metà. */
const PROVINO = CATALOGO["qwen-image-vae"];

const PYTHON_EXE = join(
  process.env.LOCALAPPDATA,
  "DaProdSuite",
  "runtime",
  "Scripts",
  "python.exe",
);

const cartella = mkdtempSync(join(tmpdir(), "daprod-scaricamento-"));
let falliti = 0;

function esito(ok, cosa, dettaglio = "") {
  console.log(`${ok ? "  OK  " : " ROTTO"} ${cosa}${dettaglio ? " — " + dettaglio : ""}`);
  if (!ok) falliti++;
}

function mb(bytes) {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function provaRipresa() {
  console.log(`\n1. Ripresa — ${PROVINO.label} (${mb(PROVINO.bytes)})`);
  const destinazione = join(cartella, PROVINO.file);
  const parziale = `${destinazione}.parte`;

  // Primo pezzo: si annulla appena passati 20 MB.
  const controllo = new AbortController();
  let visti = 0;
  try {
    await scaricaFile({
      url: PROVINO.url,
      destinazione,
      bytes: PROVINO.bytes,
      segnale: controllo.signal,
      onAvanzamento: ({ fatti }) => {
        visti = fatti;
        if (fatti > 20 * 1024 ** 2) controllo.abort();
      },
    });
    esito(false, "l'annullamento", "è arrivato in fondo invece di fermarsi");
  } catch (err) {
    esito(
      err instanceof ScaricamentoAnnullato,
      "l'annullamento si riconosce",
      err instanceof ScaricamentoAnnullato ? `fermato a ${mb(visti)}` : err.message,
    );
  }

  esito(!existsSync(destinazione), "niente file definitivo da un download a metà");
  const avanzo = existsSync(parziale) ? statSync(parziale).size : 0;
  esito(avanzo > 0, "il pezzo scaricato resta sul disco", mb(avanzo));

  // Secondo pezzo: riprende da dove era, senza ricominciare.
  let primoAvviso = null;
  await scaricaFile({
    url: PROVINO.url,
    destinazione,
    bytes: PROVINO.bytes,
    onAvanzamento: ({ fatti }) => {
      if (primoAvviso === null) primoAvviso = fatti;
    },
    onLine: (riga) => console.log("       " + riga),
  });

  esito(
    primoAvviso !== null && primoAvviso >= avanzo,
    "riparte da dove si era fermato",
    `primo avviso a ${mb(primoAvviso ?? 0)} dei ${mb(avanzo)} già presenti`,
  );
  esito(existsSync(destinazione), "il file prende il nome definitivo");
  esito(!existsSync(parziale), "il .parte sparisce");

  const finale = statSync(destinazione).size;
  esito(
    finale === PROVINO.bytes,
    "la dimensione è quella del catalogo",
    `${finale} byte contro ${PROVINO.bytes}`,
  );
}

async function provaRepo() {
  console.log("\n2. Repo HuggingFace con include");
  if (!existsSync(PYTHON_EXE)) {
    console.log("       saltata: manca l'ambiente Python della suite.");
    return;
  }

  // Le sole configurazioni di SD-Turbo: un megabyte, ma passa dalla stessa
  // strada dei 2,58 GB veri.
  const destinazione = join(cartella, "sd-turbo-config");
  const attesi = 1065700;
  await scaricaRepo({
    pythonExe: PYTHON_EXE,
    repo: "stabilityai/sd-turbo",
    destinazione,
    bytes: attesi,
    include: ["*.json"],
    onLine: (riga) => console.log("       " + riga),
  });

  esito(existsSync(join(destinazione, "model_index.json")), "i file richiesti ci sono");
  esito(
    !existsSync(join(destinazione, "sd_turbo.safetensors")),
    "quelli fuori da include non sono stati scaricati",
  );
}

(async () => {
  console.log(`Cartella di prova: ${cartella}`);
  try {
    await provaRipresa();
    await provaRepo();
  } catch (err) {
    esito(false, "prova interrotta", err.message);
  } finally {
    rmSync(cartella, { recursive: true, force: true });
  }

  console.log(falliti === 0 ? "\nTutto a posto." : `\n${falliti} controlli falliti.`);
  process.exit(falliti === 0 ? 0 : 1);
})();
