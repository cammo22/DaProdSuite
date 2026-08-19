/**
 * Se le librerie Python di un motore sono già state installate, e quelle giuste.
 *
 * **Il buco che chiude.** Fino al 19 agosto 2026 una scheda era «pronta» quando
 * c'erano l'ambiente Python, il motore e i suoi modelli. Delle librerie che il
 * motore dichiara in `services/<id>/requisiti.txt` non chiedeva conto nessuno:
 * andava bene lo stesso perché ogni app aveva dei modelli da scaricare, quindi
 * si passava comunque da «Installa», e l'installazione le metteva.
 *
 * **DaProdCompanion ha rotto quel presupposto**: i suoi pesi li tiene LM Studio,
 * quindi non ha modelli suoi, quindi la scheda diceva «pronta» appena
 * l'ambiente era a posto — e premendo Apri il motore moriva su un `ImportError`
 * di `sqlite_vec`, che nessuno aveva mai installato.
 *
 * **Come si sa.** Con un segnaposto accanto all'ambiente, come già si fa per la
 * versione di ComfyUI e per il commit dei nodi custom. Dentro non c'è una data
 * ma **l'impronta del file dei requisiti**: così aggiungere una riga a
 * `requisiti.txt` fa tornare la scheda «da installare» da sé, e quella riga
 * arriva anche a chi l'app ce l'ha già da prima. Una data non l'avrebbe fatto.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APPS, type AppId } from "@daprod/ipc";
import { RUNTIME_DIR, SERVICES_DIR, VINCOLI_REQUIREMENTS } from "./paths";

/** I segnaposti stanno accanto all'ambiente: se lo si cancella, spariscono con lui. */
const CARTELLA = join(RUNTIME_DIR, ".daprod-servizi");

/** Il file dei requisiti di questo motore, o null se non ne dichiara. */
export function fileRequisiti(id: AppId): string | null {
  const servizio = APPS[id].service;
  if (!servizio) return null;
  const percorso = join(SERVICES_DIR, servizio.id, "requisiti.txt");
  return existsSync(percorso) ? percorso : null;
}

/**
 * Vero se le librerie di quest'app sono a posto — o se non ne vuole.
 *
 * L'impronta comprende anche `versioni.txt`: cambiare le versioni che abbiamo
 * provato vuol dire che quello che c'è installato non è più quello che
 * vogliamo, e la scheda deve tornare a chiedere un giro di installazione invece
 * di far finta di niente.
 */
export function librerieServizioPronte(id: AppId): boolean {
  const requisiti = fileRequisiti(id);
  if (!requisiti) return true;

  const segnaposto = percorsoSegnaposto(id);
  if (!segnaposto || !existsSync(segnaposto)) return false;

  try {
    return readFileSync(segnaposto, "utf8").trim() === impronta(requisiti);
  } catch {
    return false;
  }
}

/** Da chiamare a installazione riuscita: da qui in poi la scheda è pronta. */
export function segnaLibrerieServizio(id: AppId): void {
  const requisiti = fileRequisiti(id);
  const segnaposto = percorsoSegnaposto(id);
  if (!requisiti || !segnaposto) return;

  try {
    mkdirSync(CARTELLA, { recursive: true });
    writeFileSync(segnaposto, `${impronta(requisiti)}\n`, "utf8");
  } catch {
    // Non riuscire a scrivere il segnaposto non deve far fallire
    // un'installazione andata bene: al massimo si rifà, e uv in un secondo
    // vede che c'è già tutto.
  }
}

function percorsoSegnaposto(id: AppId): string | null {
  const servizio = APPS[id].service;
  return servizio ? join(CARTELLA, `${servizio.id}.txt`) : null;
}

/**
 * L'impronta di quello che verrebbe installato: i requisiti del motore più i
 * vincoli comuni.
 *
 * Un hash e non il contenuto perché il segnaposto si legge a occhio quando si
 * va a capire perché una scheda dice quello che dice, e sedici caratteri si
 * confrontano; duecento righe no.
 */
function impronta(requisiti: string): string {
  const hash = createHash("sha256");
  hash.update(readFileSync(requisiti));
  if (existsSync(VINCOLI_REQUIREMENTS)) hash.update(readFileSync(VINCOLI_REQUIREMENTS));
  return hash.digest("hex").slice(0, 16);
}
