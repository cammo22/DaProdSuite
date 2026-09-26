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
const { QWEN21, grafoQwenImmagine } = await import(pathToFileURL(join(ui, "qwen-image.js")).href);
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

console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
