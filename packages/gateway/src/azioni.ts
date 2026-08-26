/**
 * Le azioni, eseguite dal gateway.
 *
 * Qui si incontrano due pacchetti che non si conoscono: `@daprod/azioni`, che
 * dice **cosa** si può chiedere, e `Remoto`, che sa **come** si mette in fila.
 * In mezzo c'è una regola sola, e vale per il telefono, per la console web e
 * per il server MCP allo stesso modo:
 *
 * - un'azione che occupa la scheda video non parte mai da sola: diventa una
 *   richiesta in fila, e chi sta al PC dice sì o no;
 * - un'azione che si limita a leggere risponde subito, e la esegue lo shell
 *   (l'unico che vede libreria, app accese e coda).
 *
 * Il controllo dei campi è quello di `@daprod/azioni`: uno solo, per tutti.
 */

import {
  azione as trovaAzione,
  azioniPer,
  opzioni as opzioniDi,
  schemaDi,
  testoPrincipale,
  verifica,
} from "@daprod/azioni";
import type { Remoto } from "./remoto";
import type { Dispositivo, Richiesta } from "./types";

/**
 * Chi esegue le azioni che non passano dalla fila. Lo fornisce lo shell, che è
 * l'unico a poter leggere la libreria e aprire una finestra.
 */
export type Esecutore = (
  id: string,
  valori: Record<string, string | number | boolean>,
  dispositivo: Dispositivo,
) => Promise<unknown>;

/** Cosa torna a chi ha chiesto un'azione. */
export type EsitoAzione =
  | { esito: "in-coda"; richiesta: Richiesta }
  | { esito: "fatto"; risultato: unknown }
  | { esito: "errore"; errore: string; codice: number };

/**
 * L'elenco delle azioni che questo dispositivo può chiedere, con gli schemi.
 *
 * `stiliDi` è facoltativo e serve a una cosa sola: **riempire le scelte che il
 * catalogo non può conoscere**. Il campo «uno stile pronto» del brano nasce con
 * l'elenco vuoto, perché gli stili sono di ogni persona e stanno sul computer;
 * qui si mettono quelli di chi sta chiedendo. Senza, il telefono mostrerebbe un
 * menu vuoto — che è peggio di nessun menu.
 */
export function elencoAzioni(
  dispositivo: Dispositivo,
  stiliDi?: (chi: string) => { nome: string; testo: string }[],
): unknown[] {
  const stili = stiliDi ? stiliDi(dispositivo.id) : [];

  return azioniPer(dispositivo.ruolo).map((a) => {
    const campi = a.campi.map((c) => {
      if (c.nome !== "stile" || !stili.length) return c;
      return {
        ...c,
        scelte: stili.map((x) => x.nome),
        // Il testo dello stile viaggia insieme al nome: chi sceglie «Neomelodico
        // trap» sul telefono deve poter riempire la descrizione **senza** un
        // secondo giro di rete, e il gateway non è il posto dove tenere una
        // tabella di traduzione che qualcuno dovrebbe poi mantenere.
        testi: Object.fromEntries(stili.map((x) => [x.nome, x.testo])),
      };
    });
    return {
      id: a.id,
      app: a.app,
      titolo: a.titolo,
      descrizione: a.descrizione,
      produce: a.produce,
      coda: a.coda,
      campi,
      schema: schemaDi(a),
    };
  });
}

export async function eseguiAzione(
  remoto: Remoto,
  esecutore: Esecutore,
  dispositivo: Dispositivo,
  id: string,
  dati: Record<string, unknown>,
): Promise<EsitoAzione> {
  const azione = trovaAzione(id);
  if (!azione) {
    return { esito: "errore", errore: `Azione "${id}" sconosciuta.`, codice: 404 };
  }
  if (azione.permesso === "admin" && dispositivo.ruolo !== "admin") {
    return {
      esito: "errore",
      errore: `"${azione.titolo}" la può chiedere solo il dispositivo admin.`,
      codice: 403,
    };
  }

  const controllo = verifica(azione, dati);
  if (!controllo.ok) {
    return { esito: "errore", errore: controllo.errore, codice: 400 };
  }

  if (azione.coda) {
    const richiesta = remoto.creaRichiesta({
      // `tipo` è quel che verrà fuori: serve al pannello per scegliere l'icona
      // e all'app per sapere che file aspettarsi.
      tipo: azione.risultato ?? "testo",
      app: azione.app ?? "suite",
      testo: testoPrincipale(azione, controllo.valori),
      // L'id dell'azione viaggia con le opzioni: chi esegue la richiesta deve
      // poter ritrovare **quale** azione era, non solo l'app di destinazione.
      opzioni: { azione: azione.id, ...opzioniDi(azione, controllo.valori) },
      daDispositivo: dispositivo,
    });
    return { esito: "in-coda", richiesta };
  }

  try {
    const risultato = await esecutore(azione.id, controllo.valori, dispositivo);
    return { esito: "fatto", risultato };
  } catch (err) {
    return {
      esito: "errore",
      errore: err instanceof Error ? err.message : "L'azione non è riuscita.",
      codice: 500,
    };
  }
}
