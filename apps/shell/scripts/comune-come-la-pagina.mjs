/**
 * Fa leggere a Node `/comune/qualcosa.js` come lo legge la pagina.
 *
 * Le schede importano i pezzi comuni da `/comune/`, che la suite serve dalla
 * cartella `packages/ui/src` sotto l'origine di ogni app (`file-scheme.ts`).
 * Node invece lo prende per la radice del disco. Le prove che importano i
 * `grafi.js` delle schede — dalla 1.4.0 anche quelli che usano i grafi comuni
 * di Qwen-Image — registrano questo gancio prima di cominciare:
 *
 *     import { register } from "node:module";
 *     register("./comune-come-la-pagina.mjs", import.meta.url);
 */

const UI = new URL("../../../packages/ui/src/", import.meta.url);

export async function resolve(specificatore, contesto, prossimo) {
  if (specificatore.startsWith("/comune/")) {
    return prossimo(new URL(specificatore.slice("/comune/".length), UI).href, contesto);
  }
  return prossimo(specificatore, contesto);
}
