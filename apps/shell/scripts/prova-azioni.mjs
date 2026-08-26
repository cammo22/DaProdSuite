/**
 * Le azioni messe a confronto con le schede che le eseguono.
 *
 *     node apps/shell/scripts/prova-azioni.mjs
 *
 * **Il guasto che questa prova esiste per non far uscire.** Dalla 0.7.2 chi
 * chiede da fuori può dire con che modello vuole che si faccia: «un'immagine
 * con FLUX.2 Klein 9B». L'elenco delle scelte sta in `packages/azioni`, dove
 * stanno tutte le cose che la suite sa fare; i modelli veri stanno in
 * `grafi.js` di ogni scheda. Sono due file, e possono divergere.
 *
 * Se divergono non si rompe niente — ed è il punto. La scheda riceve un id che
 * non conosce, lo ignora, e genera con il modello scelto adesso sul PC: chi
 * aveva chiesto FLUX riceve un'immagine fatta con Anima e non lo sa. È
 * esattamente il tipo di errore che nessun compilatore vede e nessuno nota
 * finché non conta.
 *
 * Qui i due elenchi si guardano in faccia. Insieme si controllano altre due
 * cose che si possono sbagliare in silenzio:
 *
 * - **la pagina della console**: è una stringa dentro un file TypeScript, e un
 *   solo apice inverso dentro un commento la spezza a metà. Il compilatore
 *   dice di sì, e la pagina arriva rotta al telefono;
 * - **le azioni che vanno in fila**: se dichiarano un'app che la fila non sa
 *   far partire, chi ha chiesto aspetta un lavoro che nessuno farà mai.
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const radice = join(import.meta.dirname, "..", "..", "..");
const A = require(join(radice, "packages", "azioni", "dist", "index.js"));
const G = require(join(radice, "packages", "gateway", "dist", "index.js"));

let falliti = 0;
function dice(nome, condizione, extra = "") {
  if (condizione) console.log(`  ok   ${nome}`);
  else {
    falliti++;
    console.log(`  NO   ${nome} ${extra}`);
  }
}

console.log("\n— i modelli che si possono chiedere esistono davvero —");
for (const [app, dichiarati] of Object.entries(A.MODELLI_DICHIARATI)) {
  const grafi = await import(
    new URL(`../../../apps/${app}/src/grafi.js`, import.meta.url).href
  );
  const veri = Object.keys(grafi.MODELLI ?? {});
  dice(`${app}: la scheda ne ha`, veri.length > 0, `→ ${veri.length}`);

  for (const id of dichiarati) {
    dice(`${app}: "${id}" è un modello vero`, veri.includes(id), `→ la scheda ha ${veri.join(", ")}`);
  }
  // Il contrario non è un errore: un modello può esistere sulla scheda e non
  // essere ancora offerto da fuori. Si dice, perché di solito è una svista.
  const mancanti = veri.filter((id) => !dichiarati.includes(id));
  if (mancanti.length) console.log(`       (da fuori non si può chiedere: ${mancanti.join(", ")})`);
}

console.log("\n— i campi del modello sono scritti per chi legge —");
for (const azione of A.AZIONI) {
  const campo = azione.campi.find((c) => c.nome === "modello");
  if (!campo) continue;
  dice(`${azione.id}: ha le scelte`, (campo.scelte ?? []).length > 0);
  const senzaNome = (campo.scelte ?? []).filter((s) => !campo.etichette?.[s]);
  dice(`${azione.id}: ognuna ha il suo nome`, senzaNome.length === 0, `→ senza: ${senzaNome.join(", ")}`);
}

console.log("\n— quello che va in fila lo sa fare qualcuno —");
{
  // Le stesse quattro di `esecuzione.ts`. Scritte qui a mano di proposito: se
  // un giorno cambiano, questa riga deve far notare che è cambiato qualcosa.
  const sannoFarlo = ["foto", "cinema", "musica", "voce"];
  for (const azione of A.AZIONI.filter((a) => a.coda)) {
    dice(`${azione.id} va a una scheda che sa eseguire`, sannoFarlo.includes(azione.app), `→ ${azione.app}`);
  }
  for (const azione of A.AZIONI.filter((a) => a.coda)) {
    const principale = azione.campi.filter((c) => c.principale);
    dice(`${azione.id} ha un campo principale solo`, principale.length === 1, `→ ${principale.length}`);
  }
}

console.log("\n— la pagina della console —");
{
  const html = G.paginaConsole();
  const dentro = html.match(/<script>([\s\S]*?)<\/script>/);
  dice("c'è il suo JavaScript", !!dentro);
  if (dentro) {
    let male = "";
    try {
      // Non lo esegue: lo fa leggere a chi lo eseguirebbe. Un apice inverso
      // finito in un commento si vede qui e non sul telefono di chi la apre.
      new Function(dentro[1]);
    } catch (err) {
      male = err.message;
    }
    dice("e si legge senza errori", male === "", `→ ${male}`);
    dice("non è rimasto a metà", html.trim().endsWith("</html>"));
  }
  /**
   * Le pagine che la barra in fondo promette devono esistere davvero.
   *
   * I nomi sono cambiati nella 0.7.6 — «Chiedi» è diventata «Produzione»,
   * «Lavori» è diventata «Riepilogo», «Persone» è diventata «DaProd» — e
   * questa riga è il posto che se ne accorge se un giorno la barra e le
   * sezioni si disallineano: sarebbe un tasto che non porta da nessuna parte.
   */
  for (const quale of ["entra", "casa", "produzione", "riepilogo", "galleria", "daprod"]) {
    dice(`la pagina "${quale}" c'è`, html.includes(`id="pag-${quale}"`));
  }
  for (const quale of ["casa", "produzione", "riepilogo", "galleria", "daprod"]) {
    dice(`e la barra in fondo ci porta`, html.includes(`data-pagina="${quale}"`));
  }

  /**
   * I pezzi della 0.7.6 che una svista farebbe sparire in silenzio.
   *
   * Non si prova che funzionino — per quello ci vuole un gateway vero, ed è
   * `prova-gateway.mjs` — si prova che **ci siano**: un id sbagliato in una
   * `$()` è un tasto morto che non dà nessun errore, e questa pagina la si
   * guarda sul telefono di qualcun altro.
   */
  for (const pezzo of [
    'id="apri-impostazioni"',
    'id="quale-modello"',
    'id="due-tasti"',
    'id="bacheca"',
    'id="apri-profilo"',
    'id="carica-in-bacheca"',
    'id="strisce"',
  ]) {
    dice(`c'è ${pezzo}`, html.includes(pezzo));
  }
  dice("il modo telefono si legge dall'indirizzo", html.includes('pezzi.get("m")'));
  dice("le anteprime si chiedono al computer", html.includes("/libreria/anteprima/"));
  dice("gli interruttori della macchina sono dietro sonoLaCasa", html.includes("if (sonoLaCasa)"));
}

console.log("\n— gli schemi per un agente —");
for (const azione of A.AZIONI) {
  const schema = A.schemaDi(azione);
  const obbligatori = azione.campi.filter((c) => c.obbligatorio).map((c) => c.nome);
  dice(`${azione.id}: lo schema elenca gli obbligatori`, obbligatori.every((n) => schema.required.includes(n)));
  dice(`${azione.id}: e non accetta campi inventati`, schema.additionalProperties === false);
}

console.log("\n— il catalogo dei modelli è quello vero —");
{
  // `catalogo` sono gli id di manifest/models.json: se una scheda ne nomina uno
  // che non c'è, il controllo «ce l'hai già?» risponde sempre di no e il
  // modello non si può scaricare da nessuna parte.
  const manifest = JSON.parse(readFileSync(join(radice, "manifest", "models.json"), "utf8"));
  const noti = Object.keys(manifest.models);
  for (const app of Object.keys(A.MODELLI_DICHIARATI)) {
    const grafi = await import(
      new URL(`../../../apps/${app}/src/grafi.js`, import.meta.url).href
    );
    for (const [id, m] of Object.entries(grafi.MODELLI ?? {})) {
      const suoi = m.catalogo ?? [];
      const fuori = suoi.filter((x) => !noti.includes(x));
      dice(`${app}/${id}: i pesi che chiede esistono nel catalogo`, fuori.length === 0, `→ ${fuori.join(", ")}`);
    }
  }
}

console.log(falliti === 0 ? "\nTutto a posto.\n" : `\n${falliti} prove fallite.\n`);
process.exit(falliti === 0 ? 0 : 1);
