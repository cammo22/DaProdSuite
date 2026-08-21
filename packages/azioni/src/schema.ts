/**
 * Le azioni tradotte in JSON Schema, per chi parla quella lingua.
 *
 * MCP descrive ogni strumento con un JSON Schema, e lo stesso schema serve a un
 * modello vincolato a produrre JSON valido — che è esattamente il mestiere di
 * Needle 2. Invece di scrivere gli schemi a mano accanto al catalogo (due
 * elenchi che divergono al primo cambiamento) si generano da lì.
 *
 * Quello che **non** sta qui è tutto ciò che sa di MCP: i nomi degli strumenti,
 * le descrizioni per un agente. Quelli stanno in `packages/mcp`, che è l'unico
 * pezzo che ha ragione di conoscere quel protocollo. Così questo pacchetto
 * resta senza dipendenze e senza opinioni su chi lo legge.
 */

import type { Azione, Campo } from "./tipi";

/** Un JSON Schema, per quel poco che serve qui. */
export interface Schema {
  type: "object";
  properties: Record<string, Proprieta>;
  required: string[];
  additionalProperties: false;
}

export interface Proprieta {
  type: "string" | "number" | "boolean";
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  default?: string | number | boolean;
  examples?: string[];
}

/** Lo schema dei campi di un'azione. */
export function schemaDi(azione: Azione): Schema {
  const properties: Record<string, Proprieta> = {};
  const required: string[] = [];

  for (const campo of azione.campi) {
    properties[campo.nome] = proprieta(campo);
    if (campo.obbligatorio) required.push(campo.nome);
  }

  return { type: "object", properties, required, additionalProperties: false };
}

function proprieta(campo: Campo): Proprieta {
  const p: Proprieta = {
    type: campo.tipo === "numero" ? "number" : campo.tipo === "booleano" ? "boolean" : "string",
    description: `${campo.etichetta}. ${campo.descrizione}`,
  };
  if (campo.scelte) p.enum = [...campo.scelte];
  if (campo.min !== undefined) p.minimum = campo.min;
  if (campo.max !== undefined) p.maximum = campo.max;
  if (campo.maxLunghezza !== undefined) p.maxLength = campo.maxLunghezza;
  if (campo.predefinito !== undefined) p.default = campo.predefinito;
  if (campo.esempio) p.examples = [campo.esempio];
  return p;
}
