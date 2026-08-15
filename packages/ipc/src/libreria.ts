/**
 * La libreria condivisa, vista dalle app.
 *
 * Ogni app può leggere quello che hanno prodotto le altre e mandare un elemento
 * a un'altra app. Nessuna conosce le altre per nome: parlano tutte con la
 * libreria, e lo shell si occupa di aprire la destinazione.
 */

import type { AppId } from "./apps";

export type TipoElemento = "audio" | "immagine" | "video";

export interface ElementoLibreria {
  /** Percorso relativo alla cartella dei risultati. Stabile fra installazioni. */
  id: string;
  tipo: TipoElemento;
  /** L'app che l'ha prodotto. */
  app: AppId;
  /** Titolo dai metadati, o il nome del file. */
  nome: string;
  /** URL `daprod://` con cui una pagina può leggerlo davvero. */
  url: string;
  /** Percorso su disco. Serve per "mostra nella cartella". */
  percorso: string;
  bytes: number;
  /** Data dell'ultima modifica, in millisecondi. */
  creato: number;
  /** URL della copertina, se il file ne ha una accanto. */
  copertina?: string;
  /** Contenuto del `.json` che accompagna il file: descrizione, testo, seed… */
  meta?: Record<string, unknown>;
}

export interface FiltroLibreria {
  tipo?: TipoElemento;
  app?: AppId;
}

/**
 * Consegna di un elemento da un'app all'altra.
 *
 * Chi riceve non è tenuto a sapere chi ha mandato: gli arriva un elemento e
 * un'intenzione. `riproduci` per il Visualizer, `usaComeCopertina` per un brano,
 * `usaComeRiferimento` per una generazione che parte da un'immagine.
 */
export type Intenzione = "riproduci" | "usaComeCopertina" | "usaComeRiferimento" | "apri";

export interface Consegna {
  elemento: ElementoLibreria;
  intenzione: Intenzione;
  /** L'app che ha mandato, se la destinazione vuole saperlo. */
  mittente?: AppId;
}
