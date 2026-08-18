/**
 * Le icone della suite e delle sue app, generate con Anima dentro la suite.
 *
 * Come le copertine delle schede (`genera-copertine.cjs`), e per la stessa
 * ragione: l'immagine che rappresenta un programma che genera immagini deve
 * averla generata quel programma. Qui però non è una striscia decorativa, è
 * **l'icona** — quella del `.exe`, dell'area di notifica, della barra delle
 * applicazioni e della finestra di ogni app.
 *
 *     node apps/shell/scripts/genera-icone.cjs             tutte
 *     node apps/shell/scripts/genera-icone.cjs suite foto   solo queste
 *
 * Serve il motore acceso: apri una scheda che gira su ComfyUI (Foto o Musica)
 * e lascialo lì.
 *
 * **Un'icona non è un'illustrazione**, ed è la differenza che decide se si
 * capisce a 32 pixel o no:
 *
 * - **quadrata e centrata** (512×512), non 8:3 come le copertine;
 * - **un soggetto solo su fondo scuro**, senza scena intorno: a 32 pixel di una
 *   scena resta una macchia;
 * - **il colore d'accento dell'app scritto nel prompt**, così le sette icone si
 *   distinguono per tinta anche quando la forma non si legge più;
 * - **angoli arrotondati** aggiunti dopo, che è la forma che Windows si aspetta
 *   da un'icona e che nessun modello disegna in modo pulito.
 *
 * L'ultimo passo lo fa Pillow, che è già nell'ambiente Python della suite.
 */

const { mkdirSync, writeFileSync, unlinkSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const MOTORE = "http://127.0.0.1:8188";
const BUILD = join(__dirname, "..", "build");
/** Le icone delle finestre, una per app. Vanno in resources una volta impacchettate. */
const DESTINAZIONE_APP = join(BUILD, "icone");

/** Il punto di lavoro di Anima, come in `apps/foto/src/grafi.js`. */
const PESI = {
  dit: "anima-turbo-v1.0.safetensors",
  txt: "qwen_3_06b_base.safetensors",
  vae: "qwen_image_vae.safetensors",
};

/** Quadrata, lato multiplo di 16. 512 è la misura da cui electron-builder ricava il .ico. */
const LATO = 512;
/** Un'icona è un soggetto solo: qualche passo in più paga più che sulle copertine. */
const PASSI = 16;

/**
 * Lo stile comune. È quello che fa sembrare le icone una famiglia, e soprattutto
 * quello che le tiene leggibili in piccolo: un oggetto, al centro, che si stacca
 * dal fondo per luce e non per dettaglio.
 */
const STILE =
  "app icon, single centered object on a plain very dark background, " +
  "glowing neon rim light, bold simple silhouette, high contrast, " +
  "empty margins around the subject, symmetrical, 3d render, no text";

const NEGATIVO =
  "text, letters, words, watermark, signature, ui, interface, frame, border, " +
  "busy background, scene, landscape, room, multiple objects, clutter, " +
  "worst quality, low quality, blurry, jpeg artifacts, deformed";

const ICONE = {
  /**
   * L'icona della suite: quella del programma, dell'installer e dell'area di
   * notifica. Non è una delle sette app, è quello che le tiene insieme — quindi
   * non un oggetto, ma i sette colori che convergono.
   */
  suite: {
    seme: 512_004_119,
    prompt:
      "a glowing sphere of light at the center, seven colored beams of light " +
      "(violet, pink, amber, purple, cyan, mint, coral) curving into it from all sides, " +
      "iridescent, dark background",
  },
  visualizer: {
    seme: 811_204_331,
    prompt:
      "a glowing violet sound wave orb, concentric rings of light pulsing outward, " +
      "purple and indigo",
  },
  musica: {
    seme: 448_119_027,
    prompt: "a vintage condenser microphone, pink and magenta neon rim light",
  },
  foto: {
    seme: 190_337_845,
    prompt: "a single camera lens seen from the front, warm amber neon rim light",
  },
  cinema: {
    // Il primo tentativo ("a film reel seen from the front") veniva un anello
    // viola e basta: la bobina non si leggeva. Con la pellicola che si srotola
    // la forma ha un verso, e a 32 pixel resta comunque una diagonale di luce.
    seme: 337_640_218,
    prompt:
      "a strip of movie film unspooling diagonally, perforated edges glowing, " +
      "purple and violet neon rim light",
  },
  dream: {
    seme: 305_886_142,
    prompt: "a human head in profile made of flowing cyan liquid light, turquoise glow",
  },
  companion: {
    // "big calm eyes" da solo dava due pallini verdi in un cerchio, che non
    // sembravano un robot ma un paio d'occhi. Con il corpo intero la testa ha
    // un contorno, ed è quello che si riconosce in piccolo.
    seme: 940_117_336,
    prompt:
      "a small friendly robot with a rounded head and antenna, seen from the front, " +
      "mint green glow",
  },
  iodigitale: {
    seme: 118_902_774,
    prompt:
      "a smiling human face seen from the front, warm coral orange rim light, " +
      "a small glowing sound wave arc under the chin",
  },
};

function grafo(prompt, seme) {
  return {
    1: { class_type: "UNETLoader", inputs: { unet_name: PESI.dit, weight_dtype: "default" } },
    2: { class_type: "CLIPLoader", inputs: { clip_name: PESI.txt, type: "stable_diffusion" } },
    3: { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: `${prompt}, ${STILE}` } },
    4: { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: NEGATIVO } },
    5: { class_type: "EmptySD3LatentImage", inputs: { width: LATO, height: LATO, batch_size: 1 } },
    6: {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["4", 0],
        latent_image: ["5", 0],
        seed: seme,
        steps: PASSI,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1,
      },
    },
    7: { class_type: "VAELoader", inputs: { vae_name: PESI.vae } },
    8: { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["7", 0] } },
    // PreviewImage e non SaveImage: le nostre illustrazioni non devono finire
    // nella libreria dei risultati, che è roba dell'utente.
    9: { class_type: "PreviewImage", inputs: { images: ["8", 0] } },
  };
}

const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function genera(id, icona, dove) {
  const risposta = await fetch(`${MOTORE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: grafo(icona.prompt, icona.seme) }),
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

    mkdirSync(dove, { recursive: true });
    const grezza = join(dove, `${id}-grezza.png`);
    writeFileSync(grezza, png);
    return grezza;
  }
  throw new Error("il motore ci ha messo troppo");
}

/**
 * Da immagine quadrata a icona: angoli arrotondati e fondo trasparente.
 *
 * Il raggio è il 22% del lato, lo stesso della vecchia icona disegnata a mano —
 * è la curva che Windows usa per le sue, e sotto quella misura l'icona sembra
 * una fotografia incollata invece di un'icona.
 */
function arrotonda(python, sorgente, destinazione) {
  const codice = [
    "from PIL import Image, ImageDraw",
    "import sys",
    "img = Image.open(sys.argv[1]).convert('RGBA')",
    `lato = ${LATO}`,
    "img = img.resize((lato, lato), Image.LANCZOS)",
    // La maschera si disegna a quattro volte la misura e poi si riduce: è
    // l'antialiasing che PIL non fa da solo sulle forme.
    "maschera = Image.new('L', (lato * 4, lato * 4), 0)",
    "ImageDraw.Draw(maschera).rounded_rectangle(",
    "    (0, 0, lato * 4 - 1, lato * 4 - 1), radius=int(lato * 4 * 0.22), fill=255)",
    "maschera = maschera.resize((lato, lato), Image.LANCZOS)",
    "fuori = Image.new('RGBA', (lato, lato), (0, 0, 0, 0))",
    "fuori.paste(img, (0, 0), maschera)",
    "fuori.save(sys.argv[2], 'PNG')",
  ].join("\n");
  const esito = spawnSync(python, ["-c", codice, sorgente, destinazione], { encoding: "utf8" });
  if (esito.status !== 0) throw new Error(esito.stderr || "Pillow non ha arrotondato");
}

async function main() {
  const python = join(
    process.env.LOCALAPPDATA || "",
    "DaProdSuite",
    "runtime",
    "Scripts",
    "python.exe",
  );

  const voluti = process.argv.slice(2);
  const daFare = voluti.length ? voluti : Object.keys(ICONE);

  for (const id of daFare) {
    const icona = ICONE[id];
    if (!icona) {
      console.error(`icona sconosciuta: ${id} (ci sono ${Object.keys(ICONE).join(", ")})`);
      process.exitCode = 1;
      continue;
    }

    // L'icona della suite sta nella radice di build/ perché è lì che
    // electron-builder la cerca (`icon: build/icon.png`); le altre in build/icone.
    const dove = id === "suite" ? BUILD : DESTINAZIONE_APP;
    const finale = join(dove, id === "suite" ? "icon.png" : `${id}.png`);

    process.stdout.write(`${id}… `);
    const grezza = await genera(id, icona, dove);
    arrotonda(python, grezza, finale);
    // La grezza serviva solo a Pillow: nel repo resta l'icona, non lo scarto.
    unlinkSync(grezza);
    console.log(`fatta → ${finale}`);
  }
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
