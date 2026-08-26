/**
 * @daprod/azioni — l'elenco di cosa la suite sa fare.
 *
 * Un pacchetto di dati e di controlli, senza dipendenze e senza rete: lo
 * importano il gateway (che le esegue), la console web (che le disegna) e il
 * server MCP (che le espone a un agente). Nessuno dei tre conosce gli altri.
 */

export { APP_REMOTE, AZIONI, MODELLI_DICHIARATI, azione, azioniPer } from "./catalogo";
export {
  DURATE_BRANO,
  DURATE_VIDEO,
  LINGUE_CANTO,
  SEZIONI,
  STILE_PER_APP,
  STILI_DI_PARTENZA,
  STILI_IMMAGINE_DI_PARTENZA,
  STILI_VIDEO_DI_PARTENZA,
  TIPI_STILE,
  stiliDiPartenzaPer,
} from "./stili";
export type { TipoStile } from "./stili";
export { schemaDi } from "./schema";
export type { Proprieta, Schema } from "./schema";
export { opzioni, testoPrincipale, verifica } from "./verifica";
export type { Azione, Campo, Permesso, Produce, TipoCampo, Verifica } from "./tipi";
