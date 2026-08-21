/**
 * Il controllo dei campi, fatto in un posto solo.
 *
 * Chi chiede un'azione può essere una persona distratta, un modello che si
 * inventa un campo o un programma con un bug: prima che il valore arrivi a un
 * motore passa da qui. Il gateway, la console e l'MCP chiamano tutti questa
 * funzione, così non possono divergere su cosa è ammesso.
 *
 * Non si "aggiusta" mai un valore in silenzio, tranne quando manca e c'è un
 * predefinito: sbagliare in silenzio è come un motore parta a generare una cosa
 * diversa da quella chiesta, e sarebbero minuti buttati senza sapere perché.
 */

import type { Azione, Campo, Verifica } from "./tipi";

export function verifica(azione: Azione, dati: Record<string, unknown>): Verifica {
  const valori: Record<string, string | number | boolean> = {};

  // Un campo che nessuno ha dichiarato non passa: se un modello se lo inventa,
  // è meglio dirglielo che eseguire mezza richiesta.
  const conosciuti = new Set(azione.campi.map((c) => c.nome));
  for (const chiave of Object.keys(dati)) {
    if (!conosciuti.has(chiave)) {
      return { ok: false, errore: `Il campo "${chiave}" non esiste in ${azione.id}.` };
    }
  }

  for (const campo of azione.campi) {
    const grezzo = dati[campo.nome];
    const vuoto = grezzo === undefined || grezzo === null || grezzo === "";

    if (vuoto) {
      if (campo.obbligatorio) {
        return { ok: false, errore: `Manca "${campo.nome}" (${campo.etichetta}).` };
      }
      if (campo.predefinito !== undefined) valori[campo.nome] = campo.predefinito;
      continue;
    }

    const esito = valore(campo, grezzo);
    if ("errore" in esito) return { ok: false, errore: esito.errore };
    valori[campo.nome] = esito.valore;
  }

  return { ok: true, valori };
}

/** Un singolo campo: o il valore pulito, o il perché no. */
function valore(
  campo: Campo,
  grezzo: unknown,
): { valore: string | number | boolean } | { errore: string } {
  switch (campo.tipo) {
    case "testo": {
      const testo = String(grezzo).trim();
      if (campo.maxLunghezza && testo.length > campo.maxLunghezza) {
        return {
          errore: `"${campo.nome}" è troppo lungo: ${testo.length} caratteri, il massimo è ${campo.maxLunghezza}.`,
        };
      }
      return { valore: testo };
    }

    case "numero": {
      // I numeri arrivano spesso come stringa: da un modulo HTML, da un JSON
      // scritto a mano, da un modello. Convertirli è normale; non capirli no.
      const numero = typeof grezzo === "number" ? grezzo : Number(String(grezzo).trim());
      if (!Number.isFinite(numero)) {
        return { errore: `"${campo.nome}" deve essere un numero, non "${String(grezzo)}".` };
      }
      if (campo.min !== undefined && numero < campo.min) {
        return { errore: `"${campo.nome}" non può essere sotto ${campo.min}.` };
      }
      if (campo.max !== undefined && numero > campo.max) {
        return { errore: `"${campo.nome}" non può superare ${campo.max}.` };
      }
      return { valore: numero };
    }

    case "scelta": {
      const scelto = String(grezzo).trim();
      if (campo.scelte && !campo.scelte.includes(scelto)) {
        return {
          errore: `"${campo.nome}" può essere solo: ${campo.scelte.join(", ")}. Arrivato "${scelto}".`,
        };
      }
      return { valore: scelto };
    }

    case "booleano": {
      if (typeof grezzo === "boolean") return { valore: grezzo };
      const testo = String(grezzo).trim().toLowerCase();
      if (["true", "1", "sì", "si", "yes"].includes(testo)) return { valore: true };
      if (["false", "0", "no"].includes(testo)) return { valore: false };
      return { errore: `"${campo.nome}" deve essere sì o no.` };
    }
  }
}

/**
 * Il testo che rappresenta la richiesta: quello del campo `principale`.
 *
 * È il titolo che si legge nella fila del pannello, nella console e nella
 * notifica sul telefono. Se un'azione non ha un campo principale (le azioni che
 * leggono e basta), resta il titolo dell'azione.
 */
export function testoPrincipale(
  azione: Azione,
  valori: Record<string, string | number | boolean>,
): string {
  const principale = azione.campi.find((c) => c.principale);
  if (!principale) return azione.titolo;
  const v = valori[principale.nome];
  return v === undefined ? azione.titolo : String(v);
}

/**
 * Le opzioni da portarsi dietro: tutti i campi tranne il principale, come
 * stringhe. La `Richiesta` del gateway le tiene così, e l'app che la esegue le
 * rilegge da lì.
 */
export function opzioni(
  azione: Azione,
  valori: Record<string, string | number | boolean>,
): Record<string, string> {
  const principale = azione.campi.find((c) => c.principale)?.nome;
  const fuori: Record<string, string> = {};
  for (const [chiave, v] of Object.entries(valori)) {
    if (chiave === principale) continue;
    fuori[chiave] = String(v);
  }
  return fuori;
}
