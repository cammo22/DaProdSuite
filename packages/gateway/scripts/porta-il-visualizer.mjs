/**
 * Porta gli shader di DaProdVisualizer dentro la console.
 *
 * `node packages/gateway/scripts/porta-il-visualizer.mjs`
 *
 * ## Perche' esiste
 *
 * Il visualizer della console **deve essere lo stesso** di quello dell'app, e
 * l'unico modo perche' resti lo stesso e' non riscriverlo. Detto due volte, la
 * seconda con una certa pazienza: «le visual non sono quelle del mio programma
 * DaProdVisualizer, bro, e' gia' la seconda volta: fai un port vero».
 *
 * Un port vero non e' «rifatto uguale»: e' **lo stesso codice**. Questo script
 * legge `apps/visualizer/src/visual-engine` e scrive
 * `packages/gateway/src/console/copione-visual-glsl.ts`. Quando in DaProdVisualizer
 * si corregge uno shader, lo si rilancia e la console ce l'ha.
 *
 * ## Cosa passa e cosa no
 *
 * Passano i **nove preset a schermo intero**: un rettangolo grande quanto lo
 * schermo e sopra un fragment shader. Quelli non hanno bisogno di Three.js —
 * il rettangolo lo disegna WebGL in trenta righe — quindi il GLSL vale tale e
 * quale. Passano anche le quattro passate di post-processing, che sono fatte
 * allo stesso modo, ed e' la ragione per cui il bloom e la grana si vedono
 * come di la'.
 *
 * Non passano **AudioBloom** e **CosmicDust**: quelli Three.js lo usano
 * davvero, sono scene con particelle e mesh. Portarli vuol dire portare un
 * grafo di scena, e a quel punto tanto vale portare Three.
 *
 * ## L'unica modifica ai file
 *
 * I backtick dentro i commenti GLSL diventano apici: il file di destinazione e'
 * un template literal TypeScript, e un backtick lo chiuderebbe a meta'. Il
 * codice GLSL non ne contiene — solo tre commenti — quindi quello che disegna
 * resta identico byte per byte.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = join(QUI, "..", "..", "..");
const MOTORE = join(RADICE, "apps", "visualizer", "src", "visual-engine");
const USCITA = join(QUI, "..", "src", "console", "copione-visual-glsl.ts");

const BT = String.fromCharCode(96);

/** I nove preset a schermo intero, nell'ordine in cui compaiono nell'app. */
const PRESET = [
  ["electric_storm", "ElectricStorm", "storm.frag"],
  ["fractal_pulse", "FractalPulse", "fractal.frag"],
  ["glitch_tape", "GlitchTape", "glitch.frag"],
  ["inchiostro", "Inchiostro", "ink.frag"],
  ["liquid_chrome", "LiquidChrome", "chrome.frag"],
  ["minimal_rings", "MinimalRings", "rings.frag"],
  ["napoli_lava", "NapoliLava", "lava.frag"],
  ["neon_tunnel", "NeonTunnel", "tunnel.frag"],
  ["retro_grid", "RetroGrid", "grid.frag"],
];

/**
 * Legge un file GLSL e lo prepara per un template literal.
 *
 * I controlli non sono decorativi: se un giorno in uno shader comparisse un
 * `${` o una barra rovesciata, il file generato compilerebbe **male e in
 * silenzio** — il template literal interpreterebbe quei caratteri invece di
 * passarli. Meglio fermarsi qui, dove si legge perche'.
 */
function leggi(percorso) {
  const testo = readFileSync(percorso, "utf8");
  if (testo.includes("${")) throw new Error(`${percorso}: contiene \${, che un template literal interpreta.`);
  if (testo.includes("\\")) throw new Error(`${percorso}: contiene una barra rovesciata, che un template literal interpreta.`);
  return `${testo.split(BT).join("'").replace(/\s+$/, "")}\n`;
}

function blocco(chiave, testo) {
  return `  ${chiave}: ${BT}\n${testo}${BT},`;
}

const pezzi = [];

pezzi.push(`/**
 * Gli shader di DaProdVisualizer, **gli stessi**.
 *
 * ⚠ **File generato.** Lo produce \`packages/gateway/scripts/porta-il-visualizer.mjs\`
 * leggendo \`apps/visualizer/src/visual-engine\`. Non si scrive a mano: se lo si
 * scrivesse a mano, alla terza correzione i due visualizer sarebbero due cose
 * diverse con lo stesso nome — ed e' precisamente quello che e' stato chiesto
 * due volte di non fare.
 *
 * ## Cosa vuol dire «port vero», qui
 *
 * L'app DaProdVisualizer e' React piu' Three.js, e dentro la console non ci
 * entra: la console si serve da se' e Three.js da solo pesa piu' di tutta la
 * pagina. Ma **Three.js non e' il visualizer**: nove degli undici preset sono
 * un rettangolo grande quanto lo schermo con sopra **un fragment shader**, e
 * quel rettangolo WebGL lo disegna da solo in trenta righe.
 *
 * Quindi qui non c'e' un'imitazione: ci sono **gli stessi file GLSL**. Stesso
 * prologo condiviso, stessi nove effetti, stesse quattro passate di
 * post-processing. Quello che si vede sul telefono e' quello che si vede sul
 * computer, perche' e' lo stesso codice che disegna.
 *
 * **Due preset restano fuori** — AudioBloom e CosmicDust — perche' sono scene
 * con particelle e mesh, e quelle Three.js lo usano davvero.
 *
 * L'unica differenza rispetto ai file dell'app: i backtick dentro tre commenti
 * GLSL sono diventati apici, perche' questo file e' un template literal. Il
 * codice che disegna e' identico.
 */

/**
 * Le fonti, cosi' come stanno nell'app.
 *
 * Restano in template literal — leggibili, e confrontabili riga per riga con
 * l'originale — e arrivano al browser passate da \`JSON.stringify\`, che e'
 * l'unica scappatura senza casi particolari.
 */
const FONTI: Record<string, string> = {`);

pezzi.push(blocco("comune", leggi(join(MOTORE, "shaders", "common.glsl"))));
for (const nome of ["bright", "blur", "composite", "transition"]) {
  pezzi.push(blocco(`post_${nome}`, leggi(join(MOTORE, "shaders", `${nome}.frag`))));
}
for (const [chiave, cartella, file] of PRESET) {
  pezzi.push(blocco(`p_${chiave}`, leggi(join(MOTORE, "presets", cartella, "shaders", file))));
}

/**
 * I manifest, ridotti a quello che serve a disegnare.
 *
 * ⚠ **Il preset.json non e' decorativo**, ed e' il pezzo che distingue un port
 * da una somiglianza. Dentro ci sono due cose che finiscono negli uniform:
 *
 * - i **parametri** con il loro valore di serie (`speed`, `glow`, `bolts`…),
 *   che diventano `uSpeed`, `uGlow`, `uBolts`;
 * - gli **audioMappings**, cioe' quale feature del suono muove quale uniform,
 *   di quanto e con che inerzia. E' la riga `{bass -> tunnelScale, 0.8, 0.15}`
 *   a decidere che il tunnel respira sui bassi e non sugli acuti.
 *
 * Senza questi, gli shader compilerebbero e disegnerebbero **fermi**.
 */
const manifesti = PRESET.map(([chiave, cartella]) => {
  const m = JSON.parse(readFileSync(join(MOTORE, "presets", cartella, "preset.json"), "utf8"));
  const parametri = {};
  for (const [nome, spec] of Object.entries(m.parameters ?? {})) {
    parametri[nome] = typeof spec.default === "boolean" ? (spec.default ? 1 : 0) : spec.default;
  }
  return {
    chiave: `p_${chiave}`,
    id: m.id,
    nome: m.name,
    categoria: m.category,
    parametri,
    legami: (m.audioMappings ?? []).map((a) => ({
      da: a.source,
      a: a.target,
      quanto: a.amount,
      inerzia: a.smoothing,
    })),
  };
});

pezzi.push(`};

/**
 * I manifest dei nove preset, ridotti a quello che il disegno usa davvero.
 *
 * Parametri con il loro valore di serie, e i legami fra una feature del suono e
 * un uniform. Sono la meta' del carattere di un effetto: senza, gli shader
 * compilano e restano fermi.
 */
const MANIFESTI = ${JSON.stringify(manifesti, null, 2).replace(/\n/g, "\n")};

/**
 * Gli shader come li vede il browser: senza commenti.
 *
 * ⚠ **Non e' solo peso, ed e' costato una prova rossa.** Questi shader
 * arrivano alla pagina dentro **una riga sola** — sono una stringa JSON — e un
 * \`//\` dentro quella riga si mangia tutto quello che gli sta dopo, per
 * chiunque legga il copione a occhio invece che con un parser. Il controllo
 * automatico che cerca le variabili nate per sbaglio ci e' cascato subito:
 * segnalava \`vUv\` e \`gl_Position\` come globali mai dichiarate. Non erano
 * globali, era GLSL che l'analisi credeva JavaScript.
 *
 * I commenti restano dove servono — in \`FONTI\` qui sopra, che si confronta
 * riga per riga con i file dell'app — e al browser va solo quello che la
 * scheda video deve compilare. Sono novemila caratteri in meno a ogni
 * apertura della pagina.
 */
function perIlBrowser(glsl: string): string {
  return glsl
    .replace(/\\/\\*[\\s\\S]*?\\*\\//g, "")
    .split("\\n")
    .map((r) => r.replace(/\\/\\/.*$/, "").trimEnd())
    .filter((r) => r.length > 0)
    .join("\\n");
}

/**
 * Il pezzo di copione che porta gli shader dentro la pagina.
 *
 * Due righe, e non e' pigrizia: \`JSON.stringify\` scappa tutto quello che va
 * scappato, e il browser rilegge esattamente quello che c'era nei file.
 */
export const COPIONE_VISUAL_GLSL =
  "var GLSL = " +
  JSON.stringify(Object.fromEntries(Object.entries(FONTI).map(([k, v]) => [k, perIlBrowser(v)]))) +
  ";\\n" +
  "var PRESET_VISUAL = " + JSON.stringify(MANIFESTI) + ";";
`);

writeFileSync(USCITA, `${pezzi.join("\n")}`, "utf8");
console.log(`portati ${PRESET.length} preset + 4 passate in ${USCITA}`);
