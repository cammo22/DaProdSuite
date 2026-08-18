/**
 * Le copertine delle schede dell'hub, generate con Anima dentro la suite.
 *
 * Non sono immagini prese da qualche parte: le fa il motore che la suite
 * installa, con il modello che DaProdFoto e DaProdMusica usano tutti i giorni.
 * È la cosa che la roadmap chiede per la 0.3.0 — «un'anteprima che mostra cosa
 * sa fare quell'app, generata con l'app stessa» — cominciando dal fermo
 * immagine.
 *
 * **Si rilancia quando non piacciono.** Il seme di ogni scheda è scritto qui
 * sotto: cambiarlo (o cambiare la descrizione) e rilanciare rifà solo quella.
 *
 *     node apps/shell/scripts/genera-copertine.cjs            tutte
 *     node apps/shell/scripts/genera-copertine.cjs musica foto  solo queste
 *
 * Serve il motore acceso: apri una scheda che gira su ComfyUI (Foto o Musica)
 * e lascialo lì.
 *
 * **Escono come PreviewImage, non SaveImage**: così finiscono nei temporanei del
 * motore e non nella libreria dei risultati, che è roba dell'utente e non deve
 * riempirsi delle nostre illustrazioni.
 */

const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const MOTORE = "http://127.0.0.1:8188";
const DESTINAZIONE = join(__dirname, "..", "src", "renderer", "media");

/** Il punto di lavoro di Anima, come in `apps/foto/src/grafi.js`. */
const PESI = {
  dit: "anima-turbo-v1.0.safetensors",
  txt: "qwen_3_06b_base.safetensors",
  vae: "qwen_image_vae.safetensors",
};

/** 8:3, che è la forma della striscia in cima a una scheda. Lati multipli di 16. */
const LARGHEZZA = 1024;
const ALTEZZA = 384;
/** Passi di Anima: dieci bastano per una copertina, un po' di più per lo splash. */
const PASSI = 12;

/**
 * Lo stile comune. Tenerlo uguale per tutte è quello che fa sembrare le sette
 * schede una famiglia invece di sette immagini trovate in giro.
 */
const STILE =
  "dark studio background, deep black and midnight blue, volumetric neon rim light, " +
  "haze, minimal composition, centered subject, cinematic wide shot, high detail, " +
  "digital painting, no text";

const NEGATIVO =
  "text, letters, words, watermark, signature, logo, ui, interface, frame, border, " +
  "worst quality, low quality, blurry, jpeg artifacts, deformed, extra limbs";

const SCHEDE = {
  visualizer: {
    seme: 811_204_331,
    prompt:
      "glowing violet sound waves and floating particles rippling across a dark void, " +
      "an audio spectrum made of light, purple and indigo",
  },
  musica: {
    seme: 448_119_027,
    prompt:
      "a vintage condenser microphone standing in a dark recording studio, " +
      "pink and magenta neon rim light, soft haze around it",
  },
  foto: {
    seme: 190_337_845,
    prompt:
      "a photographic camera lens lying on a dark table, a warm amber beam of light " +
      "crossing the frame, dust floating in the air",
  },
  cinema: {
    seme: 627_014_559,
    prompt:
      "an old film reel unspooling into a long strip of glowing frames, " +
      "purple and violet neon, cinema projector light",
  },
  dream: {
    seme: 305_886_142,
    prompt:
      "a human profile dissolving into cyan liquid light and drifting shapes, " +
      "surreal, turquoise glow",
  },
  companion: {
    seme: 733_450_918,
    prompt:
      "a small friendly glowing robot sitting on a desk next to a monitor at night, " +
      "mint green light, cozy",
  },
  iodigitale: {
    // Il primo tentativo ("una figura illuminata dallo schermo, con una forma
    // d'onda davanti") veniva sinistro: un occhio rosso acceso al posto del
    // viso. Qui la persona sorride e l'onda le sta accanto, non addosso.
    seme: 118_902_774,
    prompt:
      "a friendly smiling young man talking to the camera in a dark room, " +
      "warm coral orange light on his face, a soft glowing sound wave line " +
      "floating beside him, warm and welcoming portrait",
  },
  splash: {
    // La schermata di caricamento, non una scheda: più larga e diversa dalle
    // altre di proposito, così non sembra "un'ottava app" ma lo sfondo dietro
    // cui la suite si prepara. Formato 16:9, per stare bene anche a schermo
    // intero su un 4K.
    larghezza: 1600,
    altezza: 900,
    passi: 14,
    seme: 902_331_774,
    prompt:
      "a wide cinematic view of an abstract creative studio control room at night, " +
      "seven glowing colored light beams (violet, pink, amber, purple, cyan, mint, coral) " +
      "converging softly into the center from the edges of the frame, " +
      "floating particles, soft volumetric haze, dark reflective floor, symmetrical composition",
  },
};

function grafo(prompt, seme, larghezza, altezza, passi) {
  return {
    1: { class_type: "UNETLoader", inputs: { unet_name: PESI.dit, weight_dtype: "default" } },
    2: { class_type: "CLIPLoader", inputs: { clip_name: PESI.txt, type: "stable_diffusion" } },
    3: { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: `${prompt}, ${STILE}` } },
    4: { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: NEGATIVO } },
    5: {
      class_type: "EmptySD3LatentImage",
      inputs: { width: larghezza, height: altezza, batch_size: 1 },
    },
    6: {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], positive: ["3", 0], negative: ["4", 0], latent_image: ["5", 0],
        seed: seme, steps: passi, cfg: 1,
        sampler_name: "euler", scheduler: "simple", denoise: 1,
      },
    },
    7: { class_type: "VAELoader", inputs: { vae_name: PESI.vae } },
    8: { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    9: { class_type: "PreviewImage", inputs: { images: ["8", 0] } },
  };
}

const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function genera(id, scheda) {
  const risposta = await fetch(`${MOTORE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: grafo(
        scheda.prompt,
        scheda.seme,
        scheda.larghezza ?? LARGHEZZA,
        scheda.altezza ?? ALTEZZA,
        scheda.passi ?? PASSI,
      ),
    }),
  });
  const esito = await risposta.json();
  if (!risposta.ok) {
    throw new Error(JSON.stringify(esito.node_errors ?? esito.error ?? esito, null, 1));
  }

  const lavoro = esito.prompt_id;
  for (let giro = 0; giro < 240; giro++) {
    await aspetta(500);
    const storia = await (await fetch(`${MOTORE}/history/${lavoro}`)).json();
    const uscite = storia[lavoro]?.outputs;
    if (!uscite) continue;

    const file = Object.values(uscite).flatMap((u) => u.images || [])[0];
    if (!file) throw new Error("il motore ha finito senza rendere un'immagine");

    const q = new URLSearchParams({
      filename: file.filename,
      subfolder: file.subfolder || "",
      type: file.type || "temp",
    });
    const png = Buffer.from(await (await fetch(`${MOTORE}/view?${q}`)).arrayBuffer());

    mkdirSync(DESTINAZIONE, { recursive: true });
    const grezza = join(DESTINAZIONE, `${id}.png`);
    writeFileSync(grezza, png);
    return grezza;
  }
  throw new Error("il motore ci ha messo troppo");
}

/**
 * Da PNG 1024 a WebP 640.
 *
 * Le copertine finiscono nel repo e dentro l'installer: un PNG da un mega per
 * sette schede sono sette mega per una striscia alta centoventi pixel. Il
 * ridimensionamento lo fa Pillow, che è già nell'ambiente Python della suite —
 * non serve aggiungere una libreria a Node per una cosa che si fa una volta.
 */
function rimpicciolisci(python, sorgente, destinazione, larghezza, altezza) {
  const codice = [
    "from PIL import Image",
    "import sys",
    "img = Image.open(sys.argv[1]).convert('RGB')",
    `img = img.resize((${larghezza}, ${altezza}), Image.LANCZOS)`,
    "img.save(sys.argv[2], 'WEBP', quality=82, method=6)",
  ].join("\n");
  const esito = spawnSync(python, ["-c", codice, sorgente, destinazione], { encoding: "utf8" });
  if (esito.status !== 0) throw new Error(esito.stderr || "Pillow non ha convertito");
}

async function main() {
  const python = join(
    process.env.LOCALAPPDATA || "",
    "DaProdSuite", "runtime", "Scripts", "python.exe",
  );

  const voluti = process.argv.slice(2);
  const daFare = voluti.length ? voluti : Object.keys(SCHEDE);

  for (const id of daFare) {
    const scheda = SCHEDE[id];
    if (!scheda) {
      console.error(`scheda sconosciuta: ${id}`);
      continue;
    }
    process.stdout.write(`${id}… `);
    const grezza = await genera(id, scheda);
    const leggera = join(DESTINAZIONE, `${id}.webp`);
    // Lo splash resta a metà misura (800x450): a schermo intero su un 4K è
    // comunque più grande di come lo si vede, e un file più piccolo carica
    // prima nell'unico momento in cui contano i millisecondi.
    const [wOut, hOut] = id === "splash" ? [800, 450] : [640, 240];
    rimpicciolisci(python, grezza, leggera, wOut, hOut);
    require("node:fs").rmSync(grezza);
    console.log("fatta");
  }
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
