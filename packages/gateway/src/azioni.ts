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
  STILE_PER_APP,
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
  /**
   * In fila. `richiesta` e' la prima.
   *
   * ⚠ **`quante` e `tutte` ci sono solo quando i lavori sono piu' d'uno.**
   * Dalla 0.9.4 una richiesta con `quante: 3` diventa **tre richieste** — vedi
   * il commento in `eseguiAzione` — e chi ha chiesto merita di saperlo:
   * altrimenti vede aprirsi un lavoro e ne trova tre in fila.
   */
  | { esito: "in-coda"; richiesta: Richiesta; quante?: number; tutte?: string[] }
  | { esito: "fatto"; risultato: unknown }
  | { esito: "errore"; errore: string; codice: number };

/**
 * L'elenco delle azioni che questo dispositivo può chiedere, con gli schemi.
 *
 * `stiliDi` è facoltativo e serve a una cosa sola: **riempire le scelte che il
 * catalogo non può conoscere**. Il campo «uno stile pronto» nasce con l'elenco
 * vuoto, perché gli stili sono di ogni persona e stanno sul computer; qui si
 * mettono quelli di chi sta chiedendo. Senza, il telefono mostrerebbe un menu
 * vuoto — che è peggio di nessun menu.
 *
 * **E si mettono quelli del tipo giusto**, dalla 0.7.8: la scheda foto riceve
 * gli stili immagine, il cinema quelli video, la musica i suoi. Offrire «boom
 * bap partenopeo» a chi sta facendo una foto è un menu che non si guarda più.
 */
export function elencoAzioni(
  dispositivo: Dispositivo,
  stiliDi?: (chi: string) => { nome: string; testo: string; tipo?: string }[],
): unknown[] {
  const tutti = stiliDi ? stiliDi(dispositivo.id) : [];

  return azioniPer(dispositivo.ruolo).map((a) => {
    const voluto = STILE_PER_APP[a.app ?? ""] ?? "musica";
    // Chi ha stili salvati prima della 0.7.8 non ha il tipo: sono musica.
    const stili = tutti.filter((x) => (x.tipo ?? "musica") === voluto);
    /**
     * Gli stili immagine, che servono anche **dentro un'altra scheda**.
     *
     * Dalla 0.9.1 la produzione musica ha la copertina, e una copertina è
     * un'immagine: i suoi stili sono quelli delle immagini, non quelli della
     * musica. È il primo campo che chiede stili di un tipo diverso da quello
     * della scheda in cui sta, ed è il motivo per cui questo elenco esiste
     * accanto a `stili`.
     */
    const stiliImmagine = tutti.filter((x) => (x.tipo ?? "musica") === "immagine");

    const campi = a.campi.map((c) => {
      const quali =
        c.nome === "stile" ? stili : c.nome === "stileCopertina" ? stiliImmagine : null;
      if (!quali || !quali.length) return c;
      return {
        ...c,
        scelte: quali.map((x) => x.nome),
        // Il testo dello stile viaggia insieme al nome: chi sceglie «Neomelodico
        // trap» sul telefono deve poter riempire la descrizione **senza** un
        // secondo giro di rete, e il gateway non è il posto dove tenere una
        // tabella di traduzione che qualcuno dovrebbe poi mantenere.
        testi: Object.fromEntries(quali.map((x) => [x.nome, x.testo])),
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

/**
 * Quante generazioni vuole questa richiesta.
 *
 * Il tetto a quattro è quello del catalogo: qui non ci si fida di quello che
 * arriva da fuori, si rilegge. Un `quante` assente vale uno, che è il caso di
 * ogni azione che quel campo non ce l'ha.
 */
function quanteNeVuole(detto: string | undefined): number {
  const n = Number(detto);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
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
    const opzioni: Record<string, string> = { azione: azione.id, ...opzioniDi(azione, controllo.valori) };

    /**
     * ⚠ **Ogni generazione è una richiesta.** Cambiato nella 0.9.4.
     *
     * Chiesto il 6 settembre 2026: «continua a dare problemi il fatto di
     * mandare due o più canzoni, che vengono viste come una richiesta. Ogni
     * generazione deve essere una richiesta, non uniamoli: genera due canzoni,
     * quindi funziona, ma ogni canzone è una richiesta».
     *
     * ## Perché la 0.9.3 non bastava
     *
     * Nella 0.9.3 la fila aveva imparato ad **aspettare più file** per una
     * richiesta sola: `quante: 2` voleva dire un lavoro che consegna due
     * canzoni. Tecnicamente funzionava, e resta il difetto di fondo: una
     * richiesta è l'unità con cui questa suite conta tutto. Chi decide accetta
     * *una richiesta*; i tetti della fila contano *richieste*; la notifica
     * dice «il tuo lavoro è pronto», al singolare; e fermarne una ferma
     * tutte e quattro le canzoni.
     *
     * Quindi «due canzoni» non erano un lavoro che produce due cose: erano
     * **due lavori**. Farne uno solo era comodo per la fila e sbagliato per
     * chiunque la guardasse.
     *
     * ## Cosa fa adesso
     *
     * `quante: 3` diventa tre richieste da una, in fila una dietro l'altra.
     * Ognuna ha il suo numero, il suo sì, la sua notifica, e si può fermare da
     * sola. La scheda non se ne accorge — riceve tre volte lo stesso modulo con
     * `quante: 1` — e chi guarda la fila vede tre righe, che è quello che sta
     * per succedere davvero.
     *
     * Si torna la **prima**: è quella che chi ha chiesto vede aprirsi, e le
     * altre le trova sotto.
     */
    const quante = quanteNeVuole(opzioni["quante"]);
    if (quante > 1) delete opzioni["quante"];

    const nate = [];
    for (let i = 0; i < quante; i++) {
      nate.push(
        remoto.creaRichiesta({
          // `tipo` è quel che verrà fuori: serve al pannello per scegliere
          // l'icona e all'app per sapere che file aspettarsi.
          tipo: azione.risultato ?? "testo",
          app: azione.app ?? "suite",
          testo: testoPrincipale(azione, controllo.valori),
          // L'id dell'azione viaggia con le opzioni: chi esegue la richiesta
          // deve poter ritrovare **quale** azione era, non solo l'app.
          opzioni: { ...opzioni },
          daDispositivo: dispositivo,
        }),
      );
    }
    return quante > 1
      ? { esito: "in-coda", richiesta: nate[0]!, quante, tutte: nate.map((r) => r.id) }
      : { esito: "in-coda", richiesta: nate[0]! };
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
