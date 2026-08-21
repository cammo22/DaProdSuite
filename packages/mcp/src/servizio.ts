/**
 * Le azioni della suite, viste come strumenti MCP.
 *
 * Il lavoro qui è poco, ed è il segno che il pezzo grosso è al posto giusto:
 * gli strumenti non sono scritti da nessuna parte in questo file, si chiedono
 * al gateway (`GET /azioni`) e arrivano già con lo schema. Aggiungere un'azione
 * al catalogo la fa comparire in Claude Code senza toccare una riga di qui.
 *
 * L'unica traduzione vera è quella dei nomi: MCP vuole nomi senza punti, e le
 * azioni si chiamano `genera.immagine`. Diventano `genera_immagine`.
 */

import { Cliente, ErroreGateway, type AzioneRemota } from "./cliente";
import { idDaMcp, nomeMcp } from "./nomi";
import { avvisa, type Servizio, type Strumento } from "./protocollo";

const ISTRUZIONI = `Questi strumenti comandano DaProd Suite, che gira sul computer di chi ti sta parlando.

Due cose da sapere prima di usarli:

1. Le generazioni (immagini, video, brani, voci) NON partono da sole. Entrano in
   una fila sul PC, e una persona le accetta o le scarta. La risposta che ricevi
   è la conferma che la richiesta è in fila, non il file. Dillo chiaramente
   invece di lasciar credere che il lavoro sia fatto.
2. Una generazione occupa la scheda video per minuti, a volte per ore. Non
   chiederne molte insieme "per provare".

Per sapere cosa sta succedendo: suite_stato e coda_elenco.`;

export function servizio(cliente: Cliente, versione: string): Servizio {
  // Le azioni cambiano solo quando cambia la suite: si chiedono una volta e si
  // tengono. Se il PC era spento al primo giro, si riprova al giro dopo invece
  // di restare per sempre senza strumenti.
  let cache: Strumento[] | null = null;

  return {
    nome: "daprod-suite",
    versione,
    istruzioni: ISTRUZIONI,

    async strumenti(): Promise<Strumento[]> {
      if (cache) return cache;
      const azioni = await cliente.azioni().catch((err) => {
        avvisa(err instanceof Error ? err.message : String(err));
        return [] as AzioneRemota[];
      });
      if (azioni.length === 0) return [];
      cache = azioni.map((a) => ({
        name: nomeMcp(a.id),
        description: descrizione(a),
        inputSchema: a.schema,
      }));
      return cache;
    },

    async chiama(nome: string, argomenti: Record<string, unknown>): Promise<string> {
      const id = idDaMcp(nome);
      try {
        const esito = await cliente.esegui(id, argomenti);
        if (esito.esito === "in-coda") {
          return [
            `In fila sul PC: «${esito.richiesta.testo}» per ${esito.richiesta.app}.`,
            `Id della richiesta: ${esito.richiesta.id}`,
            "",
            "Non è ancora partita: chi sta al computer deve accettarla. Con coda_elenco vedi come va a finire.",
          ].join("\n");
        }
        return descriviRisultato(esito.risultato);
      } catch (err) {
        if (err instanceof ErroreGateway) throw new Error(err.message);
        throw err;
      }
    },
  };
}

/**
 * La descrizione di uno strumento.
 *
 * Il gateway manda già titolo e descrizione dal catalogo; qui si aggiunge la
 * conseguenza pratica, che è la cosa che cambia il comportamento di un agente:
 * sapere che una chiamata mette in fila un lavoro da minuti, e non restituisce
 * un file, è più utile di qualunque altra riga.
 */
function descrizione(a: AzioneRemota): string {
  const coda = a.coda
    ? " Entra nella fila della suite e va approvata da chi sta al PC: la risposta è l'id della richiesta, non il risultato."
    : "";
  return `${a.titolo}. ${a.descrizione}${coda}`;
}

/** Il risultato di un'azione che legge, in testo leggibile. */
function descriviRisultato(risultato: unknown): string {
  if (risultato === null || risultato === undefined) return "Fatto.";
  if (typeof risultato === "string") return risultato;
  if (Array.isArray(risultato)) {
    if (risultato.length === 0) return "Niente da riportare.";
    return risultato.map((r, i) => `${i + 1}. ${unaRiga(r)}`).join("\n");
  }
  return unaRiga(risultato);
}

function unaRiga(valore: unknown): string {
  if (valore === null || typeof valore !== "object") return String(valore);
  return Object.entries(valore as Record<string, unknown>)
    .map(([chiave, v]) => `${chiave}: ${Array.isArray(v) ? v.join(", ") : formatta(v)}`)
    .join(" · ");
}

function formatta(v: unknown): string {
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return String(v);
}
