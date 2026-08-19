/**
 * Quali file di requisiti contano **su questa macchina**.
 *
 * La base, il motore di terzi se è installato, e i servizi delle app che
 * l'utente ha davvero. Rimettere in casa i pacchetti di IoDigitale a chi non ce
 * l'ha sarebbe una riparazione che installa roba nuova, cioè un'altra occasione
 * di rompere qualcosa. Vale uguale per il controllo, che guarda esattamente
 * questi.
 *
 * Sta in un file suo, e non dentro `ipc.ts` dov'è nato, perché adesso lo chiama
 * anche chi si accorge da solo che un motore è morto per colpa dell'ambiente
 * (`app-manager.ts`). Prende gli stati come argomento invece di chiederli
 * all'`appManager`: così questo file non conosce nessuno, e nessuno gira in
 * tondo per importarlo.
 */

import { APP_LIST, type AppState } from "@daprod/ipc";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BASE_REQUIREMENTS, ENGINES_DIR, SERVICES_DIR } from "./paths";

export function requisitiDiQuestaMacchina(stati: AppState[]): string[] {
  const requisiti = [BASE_REQUIREMENTS];

  const motore = join(ENGINES_DIR, "comfy-requisiti.txt");
  if (existsSync(motore)) requisiti.push(motore);

  const installate = new Set(
    stati
      .filter((s) => s.status !== "non-inclusa" && s.status !== "da-installare")
      .map((s) => s.id),
  );
  for (const app of APP_LIST) {
    if (!installate.has(app.id) || !app.service) continue;
    const suo = join(SERVICES_DIR, app.service.id, "requisiti.txt");
    if (existsSync(suo) && !requisiti.includes(suo)) requisiti.push(suo);
  }

  return requisiti;
}
