/**
 * Gli attrezzi delle prove: contare, confrontare, e il dado truccato.
 *
 * Stanno qui e non dentro un file di prove perche' i file di prove sono due —
 * il banco e la fila — e la stessa funzione scritta due volte e' la prima cosa
 * a divergere. Quando `uguale()` cambia, cambia per tutti.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stato = { passate: 0, cadute: [] };

export function prova(cosa, fn) {
  try {
    fn();
    stato.passate++;
  } catch (errore) {
    stato.cadute.push(cosa + " — " + errore.message);
  }
}

export function uguale(avuto, atteso, dettaglio) {
  const a = JSON.stringify(avuto);
  const b = JSON.stringify(atteso);
  if (a !== b) throw new Error((dettaglio ? dettaglio + ": " : "") + "avuto " + a + ", atteso " + b);
}

export function vero(condizione, dettaglio) {
  if (!condizione) throw new Error(dettaglio ?? "doveva essere vero");
}

/**
 * Un dado truccato: tira i numeri che gli diamo, poi ricomincia dal primo.
 *
 * E' il pezzo per cui tutte le funzioni che pescano prendono il caso da fuori.
 * Con questo in mano si verifica che il jackpot paghi **quando esce**, invece
 * di girare diecimila volte sperando che esca.
 */
export function dado(...numeri) {
  let i = 0;
  return () => {
    const n = numeri[i % numeri.length];
    i++;
    return n;
  };
}

/** Una cartella che esiste per il tempo di una prova e poi sparisce. */
export function cartellaFinta() {
  return mkdtempSync(join(tmpdir(), "daprod-giochi-"));
}

/** La cartella si butta sempre, anche quando la prova cade. */
export function conCartella(fn) {
  const dove = cartellaFinta();
  try {
    return fn(join(dove, "giochi.json"));
  } finally {
    rmSync(dove, { recursive: true, force: true });
  }
}

/** Il conto finale. Torna il numero da dare al sistema operativo. */
export function tirandoLeSomme(titolo) {
  console.log("");
  console.log("  " + titolo);
  console.log("  prove passate: " + stato.passate);
  if (stato.cadute.length > 0) {
    console.log("  prove cadute:  " + stato.cadute.length);
    console.log("");
    for (const c of stato.cadute) console.log("  x " + c);
    console.log("");
    return 1;
  }
  console.log("  tutte verdi.");
  console.log("");
  return 0;
}
