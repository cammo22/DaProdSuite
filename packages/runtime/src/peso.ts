/**
 * Il peso vero di un file, chiesto a chi lo serve, e la ricevuta che resta sul
 * disco quando e' arrivato intero.
 *
 * **Perche' esiste, dalla 1.4.0.** Il catalogo dice il peso esatto di ogni
 * file, ed e' cosi' che la suite riconosce uno scaricamento finito da uno
 * interrotto (`isModelPresent`). Qwen-Image 2.1, YuE2 e TRELLIS.2 sono entrati
 * nel catalogo il 24 settembre 2026 da una macchina che HuggingFace non lo
 * raggiungeva: i nomi e gli indirizzi vengono dai grafi ufficiali di ComfyUI
 * (il pacchetto `comfyui-workflow-templates`), i pesi no. Scriverli a occhio
 * vorrebbe dire un modello che non risulta mai scaricato, o peggio uno mezzo
 * scaricato che risulta intero.
 *
 * Quindi quei modelli portano `pesoDaConfermare: true` e un `bytes` che e' una
 * stima — serve solo a dire «circa quanti GB» prima di cominciare. Il numero
 * vero si chiede al server appena prima di scaricare, con la stessa richiesta
 * da un byte che `scarica.ts` fa gia' per sapere se sa dare i pezzi, e a file
 * finito si scrive accanto una **ricevuta** (`<file>.peso`) con quel numero.
 * Per quei modelli «presente» vuol dire: c'e' il file, c'e' la ricevuta, e
 * dicono la stessa cosa.
 *
 * `node scripts/conferma-pesi.mjs`, lanciato da una macchina che HuggingFace lo
 * vede, riscrive nel catalogo i numeri veri e toglie la bandierina: da li' in
 * poi quei modelli tornano a essere come tutti gli altri.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";

/**
 * Quanti byte pesa il file a quell'indirizzo, secondo il server.
 *
 * Si chiede un byte solo (`Range: bytes=0-0`) e si legge il totale da
 * `Content-Range`; se il server ignora il `Range` e risponde `200`, il totale e'
 * il `Content-Length`. Dietro un indirizzo di HuggingFace c'e' un redirect
 * verso la CDN, e `fetch` lo segue da solo.
 */
export async function pesoDalServer(url: string, segnale?: AbortSignal): Promise<number> {
  const risposta = await fetch(url, {
    headers: { "user-agent": "DaProdSuite", range: "bytes=0-0" },
    signal: segnale,
    redirect: "follow",
  });
  await risposta.arrayBuffer().catch(() => undefined);
  if (risposta.status === 404) {
    throw new Error(`il file non c'e' piu' a questo indirizzo: ${url}`);
  }
  if (!risposta.ok) {
    throw new Error(`il server risponde ${risposta.status} per ${url}`);
  }
  const intervallo = risposta.headers.get("content-range") ?? "";
  const totale = Number(intervallo.split("/")[1]);
  if (Number.isFinite(totale) && totale > 0) return totale;
  const lungo = Number(risposta.headers.get("content-length"));
  if (risposta.status === 200 && Number.isFinite(lungo) && lungo > 1) return lungo;
  throw new Error(`il server non dice quanto pesa ${url}`);
}

/** Dove sta la ricevuta di un file. */
export function fileRicevuta(destinazione: string): string {
  return `${destinazione}.peso`;
}

/** Scrive la ricevuta: il file e' arrivato intero, e pesa questo. */
export async function scriviRicevuta(destinazione: string, bytes: number): Promise<void> {
  await writeFile(fileRicevuta(destinazione), `${bytes}\n`, "utf8");
}

/**
 * Il file c'e', e pesa quanto dice la sua ricevuta.
 *
 * Senza ricevuta la risposta e' no anche se il file sembra grosso giusto: la
 * ricevuta si scrive **dopo** che il `.parte` ha preso il nome definitivo,
 * quindi un file senza ricevuta e' uno di cui nessuno ha controllato la fine.
 */
export function presenteConRicevuta(destinazione: string): boolean {
  const ricevuta = fileRicevuta(destinazione);
  if (!existsSync(destinazione) || !existsSync(ricevuta)) return false;
  const atteso = Number(readFileSync(ricevuta, "utf8").trim());
  return Number.isFinite(atteso) && atteso > 0 && statSync(destinazione).size === atteso;
}
