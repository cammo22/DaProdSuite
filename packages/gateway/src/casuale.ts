/**
 * Cifre e segreti dell'accesso remoto.
 *
 * Il codice di invito è un numero a otto cifre scelto a caso: abbastanza
 * grande da non indovinarlo, abbastanza piccolo da batterlo a mano. Il token
 * di un dispositivo è invece un segreto lungo, che non passa mai da un QR:
 * nel QR c'è solo l'invito, e il token nasce dopo, durante l'accoppiamento.
 */

import { randomBytes, randomInt } from "node:crypto";

/** Un codice a otto cifre, con zeri davanti se serve. */
export function nuovoCodice(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, "0");
}

/** Il token di un dispositivo: 32 byte casuali, esadecimali. */
export function nuovoToken(): string {
  return randomBytes(32).toString("hex");
}

/** Un id unico: data in millisecondi + casualità, leggibile e ordinabile. */
export function nuovoId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}