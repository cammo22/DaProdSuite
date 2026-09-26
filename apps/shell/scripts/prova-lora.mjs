/**
 * La prova di `packages/ui/src/lora-presenti.js` (1.4.7): una LoRA che il
 * motore non ha non deve piu' fermare la foto.
 *
 *     node apps/shell/scripts/prova-lora.mjs
 *
 * Il motore e' finto: risponde a `/object_info/LoraLoaderModelOnly` con la
 * lista che gli si da', come faceva sul computer di Cammo dopo la 1.4.5.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ui = join(import.meta.dirname, "..", "..", "..", "packages", "ui", "src");
const { QWEN21, grafoQwenImmagine, grafoQwenModifica } = await import(pathToFileURL(join(ui, "qwen-image.js")).href);
const { metteLeLoraCheCi, dimenticaLeLora, spiegaIlNo } = await import(pathToFileURL(join(ui, "lora-presenti.js")).href);

let ok = 0;
let ko = 0;
function prova(nome, vero, dettaglio = "") {
  if (vero) ok++;
  else ko++;
  console.log(`  ${vero ? "✔" : "✘"} ${nome}${vero ? "" : " " + dettaglio}`);
}

function motoreCon(lista) {
  dimenticaLeLora();
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () =>
      String(url).endsWith("/object_info/LoraLoaderModelOnly")
        ? { LoraLoaderModelOnly: { input: { required: { lora_name: [lista, {}] } } } }
        : {},
  });
}
const grafo = () => grafoQwenImmagine({ prompt: "una vespa", seed: 1, larghezza: 1024, altezza: 1024, turbo: true });
const T8 = "Qwen-Image-2.1-viggle-turbo-4step-r64-comfyui-T8.safetensors";

console.log("\n== LE LORA CHE CI SONO ==");

motoreCon([QWEN21.turbo, T8]);
{
  const scaricate = [];
  const g = grafo();
  const esito = await metteLeLoraCheCi("http://motore", g, { scarica: (ids) => scaricate.push(...ids) });
  prova("con la v0.2.1 sul disco il grafo resta com'e'", g["20"].inputs.lora_name === QWEN21.turbo && !esito.sostituite.length);
  prova("8 passi sulla curva della v0.2.1", g["43"].inputs.sigmas.split(", ").length === 9 && g["43"].inputs.sigmas.startsWith("1, ") && g["43"].inputs.sigmas.endsWith("0.25, 0"), g["43"].inputs.sigmas);
  prova("e non si scarica niente", scaricate.length === 0);
}

motoreCon(["Qwen-Image-2.1-viggle-turbo-v0.2-5step-lora-r256_comfy.safetensors", T8]);
{
  const g = grafo();
  const esito = await metteLeLoraCheCi("http://motore", g, { scarica: () => {} });
  prova("senza la v0.2.1 si usa prima la v0.2 a 5 passi", /v0\.2-5step/.test(g["20"].inputs.lora_name), JSON.stringify(esito));
  prova("coi sigma della 5 passi", g["43"].inputs.sigmas === "1, 0.875, 0.75, 0.5, 0.25, 0", g["43"].inputs.sigmas);
}

motoreCon([T8]);
{
  const scaricate = [];
  const g = grafo();
  const esito = await metteLeLoraCheCi("http://motore", g, { scarica: (ids) => scaricate.push(...ids) });
  await new Promise((r) => setTimeout(r, 10));
  prova("senza nessuna delle due si usa la 4 passi che c'e' (l'errore della 1.4.5)", g["20"].inputs.lora_name === T8, JSON.stringify(esito));
  prova("coi sigma della 4 passi", g["43"].inputs.sigmas === "1, 0.75, 0.5, 0.25, 0", g["43"].inputs.sigmas);
  prova("e la v0.2.1 si fa scaricare", scaricate.includes(QWEN21.idTurbo), JSON.stringify(scaricate));
}

motoreCon(["un-altra.safetensors"]);
{
  let errore = null;
  try {
    await metteLeLoraCheCi("http://motore", grafo(), { scarica: () => {} });
  } catch (e) {
    errore = e;
  }
  prova("senza nessuna turbo si dice cosa manca, in italiano", errore && /Manca la LoRA/.test(errore.message), String(errore));
}

{
  const g = grafoQwenImmagine({ prompt: "una vespa", seed: 1, larghezza: 1024, altezza: 1024, turbo: false });
  globalThis.fetch = async () => {
    throw new Error("non doveva chiedere");
  };
  const esito = await metteLeLoraCheCi("http://motore", g);
  prova("senza LoRA nel grafo non si chiede niente al motore", !esito.sostituite.length);
}

console.log("\n== GLI ALTRI FILE (1.5.2) ==");
{
  dimenticaLeLora();
  const scaricate = [];
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () =>
      String(url).endsWith("/object_info/UnetLoaderGGUF")
        ? { UnetLoaderGGUF: { input: { required: { unet_name: [["altro.gguf"], {}] } } } }
        : String(url).endsWith("/object_info/CLIPLoader")
          ? { CLIPLoader: { input: { required: { clip_name: ["COMBO", { options: [QWEN21.txt] }] } } } }
          : {},
  });
  let errore = null;
  try {
    await metteLeLoraCheCi("http://motore", grafoQwenImmagine({ prompt: "x", seed: 1, turbo: false }), { scarica: (ids) => scaricate.push(...ids) });
  } catch (e) {
    errore = e;
  }
  await new Promise((r) => setTimeout(r, 10));
  prova("se manca il modello si dice in italiano, prima di mandarlo", errore && /manca Qwen-Image 2\.1/.test(errore.message), String(errore));
  prova("e si fa scaricare", scaricate.includes("qwen21-q4km"), JSON.stringify(scaricate));
  const no = spiegaIlNo({ node_errors: { "1": { errors: [{ type: "value_not_in_list", details: "unet_name: 'x.gguf' not in []" }] } } });
  prova("il no del motore in italiano", /manca un file del modello \(unet_name\)/.test(no.message), no.message);
}

console.log("\n== IL PASSAGGIO DELL'LLM NELLA MODIFICA (1.6.1) ==");

/** Un motore finto che ha questi lettori, e sa (o no) cos'e' TextGenerate. */
function motoreConLettori(lettori, textGenerate = true) {
  dimenticaLeLora();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith("/object_info/CLIPLoader")) return { ok: true, json: async () => ({ CLIPLoader: { input: { required: { clip_name: [lettori, {}] } } } }) };
    if (u.endsWith("/object_info/TextGenerate")) return { ok: true, json: async () => (textGenerate ? { TextGenerate: {} } : {}) };
    return { ok: true, json: async () => ({}) };
  };
}
const modifica = (extra = {}) => grafoQwenModifica({ prompt: "mettigli un cappello rosso", seed: 7, immagine: "foto.png", larghezza: 1024, altezza: 768, ...extra });

{
  const g = modifica();
  prova("la modifica passa dal riscrittore: la frase va all'LLM, e l'LLM al lettore",
    g["51"]?.class_type === "TextGenerate" && g["51"].inputs.prompt === "mettigli un cappello rosso" && JSON.stringify(g["3"].inputs.prompt) === '["51",0]');
  prova("l'LLM guarda la foto, col ragionamento acceso e i numeri del grafo ufficiale",
    JSON.stringify(g["52"].inputs["images.image0"]) === '["11",0]' && g["51"].inputs.thinking === true && g["51"].inputs["sampling_mode.top_k"] === 20 && g["51"].inputs["sampling_mode.seed"] === 7);
  prova("il riscrittore si carica come lettore qwen_image", g["50"].inputs.clip_name === QWEN21.riscrittore && g["50"].inputs.type === "qwen_image");
  const z = modifica({ zona: true, maschera: "zona.png" });
  prova("con la zona l'LLM vede anche la foto col velo rosso", JSON.stringify(z["52"].inputs["images.image1"]) === '["16",0]');
  prova("senza riscrivi: false il grafo e' quello di prima", !modifica({ riscrivi: false })["51"]);
}

motoreConLettori([QWEN21.txt, QWEN21.riscrittore]);
{
  const scaricate = [];
  const g = modifica();
  const esito = await metteLeLoraCheCi("http://motore", g, { scarica: (ids) => scaricate.push(...ids) });
  prova("col riscrittore sul disco resta tutto", g["51"] && !esito.senzaRiscrittore && scaricate.length === 0);
}

motoreConLettori([QWEN21.txt]);
{
  const scaricate = [];
  const g = modifica();
  const esito = await metteLeLoraCheCi("http://motore", g, { scarica: (ids) => scaricate.push(...ids) });
  await new Promise((r) => setTimeout(r, 10));
  prova("senza il riscrittore la modifica parte lo stesso con la frase com'era",
    !g["50"] && !g["51"] && !g["52"] && g["3"].inputs.prompt === "mettigli un cappello rosso" && esito.senzaRiscrittore);
  prova("e il riscrittore si fa scaricare", scaricate.includes(QWEN21.idRiscrittore), JSON.stringify(scaricate));
}

console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
